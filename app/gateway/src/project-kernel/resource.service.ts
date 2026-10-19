import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import Database from "better-sqlite3";

import { CanvasV3Store } from "../canvas-v3/store.js";
import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceTags } from "./resource-tags.js";

const KINDS = new Set([1, 2, 3, 4, 5]);
const BATCH_LIMIT = 20;
const DEPENDENCY_ROLES = new Set(["source", "init_image", "style", "subject", "mask", "pose", "depth", "audio_track", "subtitle", "frame", "reference"]);

function canonicalCommand(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalCommand).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalCommand(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

class ResourceBatchConflict extends Error {
  constructor(
    readonly index: number,
    readonly conflict: unknown,
  ) {
    super("resource batch conflict");
  }
}

@Injectable()
export class ProjectResourceService implements OnModuleDestroy {
  private db?: Database.Database;
  private tags?: ProjectResourceTags;
  private workspace?: string;
  private closed = false;

  constructor(private readonly architecture: WorkspaceProjectArchitectureService) {}

  onModuleDestroy(): void {
    this.closed = true;
    this.db?.close();
  }

  findVersion(versionId: string): { resourceId: string } | undefined {
    this.ready();
    if (!versionId.trim()) return undefined;
    return this.database().prepare("SELECT resource_id AS resourceId FROM resource_versions WHERE version_id=?").get(versionId) as { resourceId: string } | undefined;
  }

  /** 查询接口用的资源快照：编号叫 id，时间是毫秒，种类是名字。 */
  queryResource(selector: { resourceId?: string; versionId?: string }) {
    this.ready();
    this.ensureDocumentVersions();
    const version = selector.versionId ? this.queryVersion(selector.versionId) : undefined;
    const resourceId = version?.resourceId ?? selector.resourceId;
    if (!resourceId) throw new ProjectQueryError("NOT_FOUND", "Resource is not readable", 404);
    const resource = this.queryResourceRow(resourceId);
    const selected = version ?? (resource.currentVersionId ? this.queryVersion(resource.currentVersionId) : undefined);
    return { resource: resourceSummary(resource), version: selected ? versionSummary(selected) : null, dependencies: selected ? this.queryDependencies(selected.id) : [] };
  }

  queryResources(query: { resourceIds?: string[]; versionIds?: string[] }) {
    this.ready();
    const key = query.resourceIds ? "resourceId" : "versionId";
    const ids = query.resourceIds ?? query.versionIds ?? [];
    return {
      items: ids.map((id) => {
        const selector = key === "resourceId" ? { resourceId: id } : { versionId: id };
        try {
          return this.queryResource(selector);
        } catch (error) {
          if (!(error instanceof ProjectQueryError) || error.code !== "NOT_FOUND") throw error;
          return { ...selector, error: { code: error.code, message: error.message } };
        }
      }),
    };
  }

  queryVersions(query: { resourceId: string; limit?: number; cursor?: string }) {
    this.ready();
    this.ensureDocumentVersions();
    const resource = this.queryResourceRow(query.resourceId);
    const limit = query.limit ?? 20;
    const scope = { workspace: this.workspace ?? "", operation: "versions", filters: { resourceId: query.resourceId } };
    const position = decodeCursor(query.cursor, scope, 2);
    const rows = this.database().prepare(`SELECT version_id AS id, created_at AS createdAt, parent_version_id AS parentVersionId, status
      FROM resource_versions WHERE resource_id=? ${position ? "AND (created_at,version_id)<(?,?)" : ""} ORDER BY created_at DESC, version_id DESC LIMIT ?`).all(query.resourceId, ...(position ?? []), limit + 1) as { id: string; createdAt: string; parentVersionId: string | null; status: string }[];
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((version) => ({
        id: version.id,
        parentVersionId: version.parentVersionId,
        status: version.status,
        createdAt: Date.parse(version.createdAt),
        isCurrent: resource.currentVersionId === version.id,
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(scope, [last.createdAt, last.id]) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  /** 默认只列还在用的资源。翻页光标绑在筛选条件上，换了条件就不能沿用上一页。 */
  querySearch(query: { text?: string; kinds?: string[]; lifecycle?: string[]; createdFrom?: number; createdTo?: number; order?: { by: "createdAt" | "updatedAt"; direction: "asc" | "desc" }; limit?: number; cursor?: string }) {
    this.ready();
    const { cursor, limit: rawLimit, ...filters } = query;
    const lifecycle = query.lifecycle ?? ["active"];
    const column = query.order?.by === "createdAt" ? "created_at" : "updated_at";
    const ascending = query.order?.direction === "asc";
    const limit = rawLimit ?? 20;
    const scope = { workspace: this.workspace ?? "", operation: "public-search-v1", filters };
    const position = decodeCursor(cursor, scope, 2);
    const where = [publicResourceVisibility(this.database()), `lifecycle IN (${lifecycle.map(() => "?").join(",")})`];
    const args: unknown[] = [...lifecycle];
    if (query.kinds) {
      where.push(`kind IN (${query.kinds.map(() => "?").join(",")})`);
      args.push(...query.kinds.map((kind) => QUERY_KINDS.indexOf(kind) + 1));
    }
    if (query.text) {
      where.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
      const pattern = `%${query.text.replace(/[\\%_]/g, (value) => `\\${value}`)}%`;
      args.push(pattern, pattern);
    }
    if (query.createdFrom !== undefined) {
      where.push("created_at>=?");
      args.push(new Date(query.createdFrom).toISOString());
    }
    if (query.createdTo !== undefined) {
      where.push("created_at<?");
      args.push(new Date(query.createdTo).toISOString());
    }
    if (position) {
      where.push(`(${column},resource_id) ${ascending ? ">" : "<"} (?,?)`);
      args.push(...position);
    }
    const direction = ascending ? "ASC" : "DESC";
    const rows = this.database().prepare(`SELECT resource_id AS id, name, description, kind, lifecycle, current_version_id AS currentVersionId, metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt
      FROM resources WHERE ${where.join(" AND ")} ORDER BY ${column} ${direction}, resource_id ${direction} LIMIT ?`).all(...args, limit + 1) as QueryResourceRow[];
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(resourceSummary),
      nextCursor: rows.length > limit && last ? encodeCursor(scope, [column === "created_at" ? last.createdAt : last.updatedAt, last.id]) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  /** inputs 是这一版用到的上游，derivatives 是用到这一版的下游。 */
  queryRelations(query: { relation: "inputs" | "derivatives"; versionId: string; limit?: number; cursor?: string }) {
    this.ready();
    this.queryVersion(query.versionId);
    const incoming = query.relation === "inputs";
    const target = incoming ? "parent_version_id" : "child_version_id";
    const source = incoming ? "child_version_id" : "parent_version_id";
    const { cursor, limit: rawLimit, ...filters } = query;
    const scope = { workspace: this.workspace ?? "", operation: "relations", filters };
    const position = decodeCursor(cursor, scope, 1, true);
    const limit = rawLimit ?? 20;
    const rows = this.database().prepare(`SELECT d.id AS id, v.resource_id AS resourceId, v.version_id AS versionId, d.role AS role, d.input_index AS inputIndex
      FROM resource_version_dependencies d JOIN resource_versions v ON v.version_id=d.${target}
      WHERE d.${source}=? ${position ? "AND d.id>?" : ""} ORDER BY d.id LIMIT ?`).all(query.versionId, ...(position ?? []), limit + 1) as { id: number; resourceId: string; versionId: string; role: string; inputIndex: number | null }[];
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(({ inputIndex, resourceId, versionId, role }) => ({ resourceId, versionId, role, ...(inputIndex === null ? {} : { inputIndex }) })),
      nextCursor: rows.length > limit && last ? encodeCursor(scope, [last.id]) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  documentContentRevision(versionId: string): number | undefined {
    this.ready();
    this.ensureDocumentVersions();
    const row = this.database().prepare("SELECT content_revision AS contentRevision FROM resource_document_versions WHERE version_id=?").get(versionId) as { contentRevision: number } | undefined;
    return row?.contentRevision;
  }

  setDocumentContentRevision(versionId: string, revision: number): void {
    this.ready();
    if (!versionId.trim() || !Number.isSafeInteger(revision) || revision < 1) throw new ProjectKernelError("PROJECT_INVALID_VERSION");
    this.ensureDocumentVersions();
    this.database().prepare("INSERT INTO resource_document_versions(version_id, content_revision) VALUES(?,?) ON CONFLICT(version_id) DO UPDATE SET content_revision=excluded.content_revision").run(versionId, revision);
  }

  private ensureDocumentVersions(): void {
    this.database().exec("CREATE TABLE IF NOT EXISTS resource_document_versions (version_id TEXT PRIMARY KEY, content_revision INTEGER)");
  }

  private queryResourceRow(resourceId: string): QueryResourceRow {
    const row = this.database().prepare(`SELECT resource_id AS id, name, description, kind, lifecycle, current_version_id AS currentVersionId, metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt FROM resources WHERE resource_id=?`).get(resourceId) as QueryResourceRow | undefined;
    if (!row) throw new ProjectQueryError("NOT_FOUND", "Resource is not readable", 404);
    return row;
  }

  /** 生成和媒体编辑只需要版本文件，不读文档修订。文档表是另一条路径懒创建的。 */
  relativePathOfVersion(versionId: string): string {
    this.ready();
    const row = this.database().prepare("SELECT relative_path AS relativePath FROM resource_versions WHERE version_id=?").get(versionId) as { relativePath: string } | undefined;
    if (!row?.relativePath) throw new ProjectQueryError("NOT_FOUND", "Resource version is not readable", 404);
    return row.relativePath;
  }

  private queryVersion(versionId: string): QueryVersionRow {
    const row = this.database().prepare(`SELECT version_id AS id, resource_id AS resourceId, parent_version_id AS parentVersionId, task_id AS taskId, status, relative_path AS relativePath, created_at AS createdAt,
      (SELECT content_revision FROM resource_document_versions d WHERE d.version_id=resource_versions.version_id) AS contentRevision
      FROM resource_versions WHERE version_id=?`).get(versionId) as QueryVersionRow | undefined;
    if (!row) throw new ProjectQueryError("NOT_FOUND", "Resource version is not readable", 404);
    if (row.contentRevision == null) delete row.contentRevision;
    return row;
  }

  private queryDependencies(versionId: string): { versionId: string; role: string; inputIndex?: number }[] {
    const rows = this.database().prepare("SELECT parent_version_id AS versionId, role, input_index AS inputIndex FROM resource_version_dependencies WHERE child_version_id=? ORDER BY id").all(versionId) as { versionId: string; role: string; inputIndex: number | null }[];
    return rows.map((item) => ({ versionId: item.versionId, role: item.role, ...(item.inputIndex == null ? {} : { inputIndex: item.inputIndex }) }));
  }

  getResources(selectors: unknown) {
    this.ready();
    if (!Array.isArray(selectors)) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    if (!selectors.length) return [];
    return selectors.map((selector) => this.readOne(selector));
  }

  search(body: unknown) {
    this.ready();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    const text = (body as { text?: unknown }).text;
    const pattern = typeof text === "string" && text !== "" ? `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%` : "%";
    const rows = this.database().prepare(`SELECT resource_id AS resourceId, name, description, kind, current_version_id AS currentVersionId, lifecycle,
      metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt
      FROM resources WHERE lifecycle<>'deleted' AND name LIKE ? ESCAPE '\\' ORDER BY created_at DESC, resource_id DESC LIMIT 100`).all(pattern) as ResourceRow[];
    return { items: rows.map(resourceFromRow) };
  }

  listVersions(body: unknown) {
    this.ready();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    const resourceId = (body as { resourceId?: unknown }).resourceId;
    if (typeof resourceId !== "string" || !resourceId.trim()) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return {
      items: this.database().prepare(`SELECT version_id AS versionId, resource_id AS resourceId, parent_version_id AS parentVersionId, relative_path AS relativePath,
        source, status, created_at AS createdAt, updated_at AS updatedAt FROM resource_versions WHERE resource_id=? ORDER BY created_at DESC, version_id DESC`).all(resourceId),
    };
  }

  execute(body: unknown) {
    this.ready();
    const envelope = this.envelope(body);
    if (envelope.command.type === "resource.copy") return this.copyResource(envelope);
    const db = this.database();
    return db.transaction(() => {
      const request = canonicalCommand({ actor: envelope.actor, command: envelope.command });
      const previous = db.prepare("SELECT request_json, receipt_json FROM project_resource_commands WHERE command_id=?").get(envelope.commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return JSON.parse(previous.receipt_json) as unknown;
      }
      const now = new Date().toISOString();
      const receipt = this.apply(envelope, now);
      db.prepare("INSERT INTO project_resource_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(receipt), now);
      if (isCommitted(receipt)) this.recordChange(envelope.command.resourceId, envelope.actor, now);
      return receipt;
    }).immediate();
  }

  /**
   * 一批里只允许改资料或切换当前版本。任何一条没写上，整批回滚，
   * 冲突记在批命令自己的回执上，重放时直接交回同一张回执。
   */
  executeBatch(body: unknown) {
    this.ready();
    const batch = this.batchEnvelope(body);
    const db = this.database();
    return db.transaction(() => {
      const request = canonicalCommand({ kind: "batch", actor: batch.actor, commands: batch.commands });
      const previous = db.prepare("SELECT request_json, receipt_json FROM project_resource_commands WHERE command_id=?").get(batch.commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return JSON.parse(previous.receipt_json) as unknown;
      }
      let receipt: unknown;
      try {
        receipt = db.transaction(() => ({
          commandId: batch.commandId,
          committed: true,
          results: batch.commands.map((command, index) => {
            const entry = this.execute({ commandId: `${batch.commandId}_${index}`, actor: batch.actor, command }) as { committed?: boolean; result?: unknown; conflict?: unknown };
            if (!entry.committed) throw new ResourceBatchConflict(index, entry.conflict);
            return entry.result;
          }),
        }))();
      } catch (error) {
        if (!(error instanceof ResourceBatchConflict)) throw error;
        receipt = { commandId: batch.commandId, committed: false, index: error.index, conflict: error.conflict };
      }
      db.prepare("INSERT INTO project_resource_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(batch.commandId, request, JSON.stringify(receipt), new Date().toISOString());
      return receipt;
    }).immediate();
  }

  getResourceTags() {
    this.ready();
    return this.tagStore().read();
  }

  executeResourceTags(body: unknown) {
    this.ready();
    return this.tagStore().execute(body);
  }

  private apply(envelope: { commandId: string; command: { type: string; resourceId: string; payload: Record<string, unknown> } }, now: string) {
    const { command } = envelope;
    const db = this.database();
    if (command.type === "resource.create") {
      if (db.prepare("SELECT 1 FROM resources WHERE resource_id=?").get(command.resourceId)) throw new ProjectKernelError("PROJECT_RESOURCE_ALREADY_EXISTS");
      const payload = command.payload;
      if (typeof payload.name !== "string") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (payload.description !== undefined && (typeof payload.description !== "string" || payload.description.length > 2000)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (!KINDS.has(payload.kind as number)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const name = this.allocateName(payload.name);
      db.prepare("INSERT INTO resources(resource_id,name,description,kind,lifecycle,metadata_revision,created_at,updated_at) VALUES(?,?,?,?,'missing',1,?,?)").run(
        command.resourceId,
        name,
        payload.description ?? null,
        payload.kind,
        now,
        now,
      );
      return { commandId: envelope.commandId, committed: true, result: this.resource(command.resourceId) };
    }
    if (command.type === "resource.delete") return this.applyDelete(envelope.commandId, command.resourceId, command.payload, now);
    if (command.type !== "resource.update") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const update = command.payload;
    if (update.kind === "metadata" || update.kind === "lifecycle") return this.applyMetadata(envelope.commandId, command.resourceId, update, now);
    if (update.kind === "current_version") return this.applyCurrentVersion(envelope.commandId, command.resourceId, update, now);
    return this.addVersion(envelope.commandId, command.resourceId, update, now);
  }

  /**
   * 先把文件复制到旁边的空文件名，再在同一条命令里登记新资源。
   * 命令失败就把新文件删掉；同一条命令重放则直接交回原来的回执。
   */
  private copyResource(envelope: { commandId: string; actor: "human" | "agent"; command: { type: string; resourceId: string; payload: Record<string, unknown> } }) {
    const db = this.database();
    const request = canonicalCommand({ actor: envelope.actor, command: envelope.command });
    const previous = db.prepare("SELECT request_json, receipt_json FROM project_resource_commands WHERE command_id=?").get(envelope.commandId) as { request_json: string; receipt_json: string } | undefined;
    if (previous) {
      if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
      return JSON.parse(previous.receipt_json) as unknown;
    }
    const payload = this.copyPayload(envelope.command.payload);
    const source = this.copySource(envelope.command.resourceId, payload);
    const content = this.copyBytes(source.relativePath);
    try {
      const now = new Date().toISOString();
      const receipt = db.transaction(() => {
        const again = db.prepare("SELECT request_json, receipt_json FROM project_resource_commands WHERE command_id=?").get(envelope.commandId) as { request_json: string; receipt_json: string } | undefined;
        if (again) {
          if (again.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
          return JSON.parse(again.receipt_json) as { committed?: boolean; result?: { version?: { relativePath?: string } } };
        }
        if (db.prepare("SELECT 1 FROM resources WHERE resource_id=?").get(envelope.command.resourceId)) throw new ProjectKernelError("PROJECT_RESOURCE_ALREADY_EXISTS");
        if (db.prepare("SELECT 1 FROM resource_versions WHERE version_id=?").get(payload.versionId)) throw new ProjectKernelError("PROJECT_VERSION_ALREADY_EXISTS");
        const fresh = this.ownedVersion(source.resourceId, payload.sourceVersionId);
        if (fresh.relativePath !== source.relativePath || fresh.status !== "ready") throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
        this.assertContent(content.relativePath);
        const name = this.allocateName(payload.name);
        db.prepare("INSERT INTO resources(resource_id,name,description,kind,current_version_id,lifecycle,metadata_revision,created_at,updated_at) VALUES(?,?,NULL,?,?,'active',1,?,?)").run(envelope.command.resourceId, name, source.kind, payload.versionId, now, now);
        db.prepare(`INSERT INTO resource_versions(version_id,resource_id,parent_version_id,relative_path,source,status,root_runtime_session_id,task_id,created_at,updated_at)
          VALUES(?,?,NULL,?,'copy','ready',?,?,?,?)`).run(payload.versionId, envelope.command.resourceId, content.relativePath, payload.rootRuntimeSessionId, payload.taskId, now, now);
        db.prepare("INSERT INTO resource_version_dependencies(child_version_id,parent_version_id,role,input_index,created_at) VALUES(?,?,?,NULL,?)").run(payload.versionId, fresh.versionId, "source", now);
        if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='resource_version_import'").get()) {
          db.prepare(`INSERT INTO resource_version_import(version_id,media_json,provenance_json,created_at,updated_at)
            SELECT ?,media_json,provenance_json,?,? FROM resource_version_import WHERE version_id=?`).run(payload.versionId, now, now, fresh.versionId);
        }
        const result = { resource: this.resource(envelope.command.resourceId), version: this.ownedVersion(envelope.command.resourceId, payload.versionId), dependencies: this.dependenciesOf(payload.versionId) };
        const stored = { commandId: envelope.commandId, committed: true, result };
        db.prepare("INSERT INTO project_resource_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(stored), now);
        this.recordChange(envelope.command.resourceId, envelope.actor, now);
        return stored;
      }).immediate();
      const copiedPath = receipt && typeof receipt === "object" && (receipt as { result?: { version?: { relativePath?: string } } }).result?.version?.relativePath;
      if (!(receipt as { committed?: boolean }).committed || copiedPath !== content.relativePath) content.cleanup();
      return receipt;
    } catch (error) {
      content.cleanup();
      throw error;
    }
  }

  private copyPayload(payload: Record<string, unknown>): { sourceResourceId: string; sourceVersionId: string; versionId: string; name: string; rootRuntimeSessionId: string | null; taskId: string | null } {
    allowedKeys(payload, ["sourceResourceId", "sourceVersionId", "versionId", "name", "rootRuntimeSessionId", "taskId"]);
    const text = (value: unknown) => {
      if (typeof value !== "string" || !value.trim() || value.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      return value;
    };
    if (typeof payload.name !== "string") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (payload.rootRuntimeSessionId !== undefined) text(payload.rootRuntimeSessionId);
    if (payload.taskId !== undefined) text(payload.taskId);
    return {
      sourceResourceId: text(payload.sourceResourceId),
      sourceVersionId: text(payload.sourceVersionId),
      versionId: text(payload.versionId),
      name: payload.name,
      rootRuntimeSessionId: typeof payload.rootRuntimeSessionId === "string" ? payload.rootRuntimeSessionId : null,
      taskId: typeof payload.taskId === "string" ? payload.taskId : null,
    };
  }

  private copySource(resourceId: string, payload: { sourceResourceId: string; sourceVersionId: string }): { resourceId: string; kind: number; relativePath: string } {
    if (this.database().prepare("SELECT 1 FROM resources WHERE resource_id=?").get(resourceId)) throw new ProjectKernelError("PROJECT_RESOURCE_ALREADY_EXISTS");
    const resource = this.resourceRow(payload.sourceResourceId);
    if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    const version = this.ownedVersion(resource.resourceId, payload.sourceVersionId);
    if (version.status !== "ready") throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
    this.assertContent(version.relativePath);
    return { resourceId: resource.resourceId, kind: resource.kind, relativePath: version.relativePath };
  }

  private copyBytes(sourceRelative: string): { relativePath: string; cleanup: () => void } {
    const workspace = this.workspace ?? "";
    this.assertContent(sourceRelative);
    const source = path.join(workspace, sourceRelative);
    const before = lstatSync(source);
    const bytes = readFileSync(source);
    const after = lstatSync(source);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || realpathSync(source) !== source) throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
    for (let copyNumber = 1; copyNumber <= 10_000; copyNumber += 1) {
      const relativePath = copiedRelativePath(sourceRelative, copyNumber);
      if (this.database().prepare("SELECT 1 FROM resource_versions WHERE relative_path=?").get(relativePath)) continue;
      const destination = path.join(workspace, relativePath);
      try {
        writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
      return {
        relativePath,
        cleanup: () => {
          try {
            unlinkSync(destination);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        },
      };
    }
    throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
  }

  /** 删整个资源要同时对上资料修订和当前版本。删单个版本不能删掉当前版本，也不能删画布还指着的版本。 */
  private applyDelete(commandId: string, resourceId: string, payload: Record<string, unknown>, now: string) {
    if (this.activeTaskUses(resourceId)) throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    const resource = this.resourceRow(resourceId);
    if (payload.target === "resource") {
      allowedKeys(payload, ["target", "expectedMetadataRevision", "expectedCurrentVersionId"]);
      if (typeof payload.expectedMetadataRevision !== "number" || !Number.isSafeInteger(payload.expectedMetadataRevision) || payload.expectedMetadataRevision < 1) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (payload.expectedCurrentVersionId !== null && (typeof payload.expectedCurrentVersionId !== "string" || !payload.expectedCurrentVersionId.trim() || payload.expectedCurrentVersionId.includes("\0"))) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (resource.metadataRevision !== payload.expectedMetadataRevision) {
        return { commandId, committed: false, conflict: { kind: "resource_metadata_revision", resourceId, expectedRevision: payload.expectedMetadataRevision, actualRevision: resource.metadataRevision } };
      }
      if ((resource.currentVersionId ?? null) !== payload.expectedCurrentVersionId) {
        return { commandId, committed: false, conflict: { kind: "resource_version", resourceId, expectedVersionId: payload.expectedCurrentVersionId, actualVersionId: resource.currentVersionId ?? null } };
      }
      if (resource.lifecycle !== "deleted") {
        this.database().prepare("UPDATE resources SET lifecycle='deleted', metadata_revision=metadata_revision+1, updated_at=? WHERE resource_id=?").run(now, resourceId);
      }
      return { commandId, committed: true };
    }
    if (payload.target !== "version") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    allowedKeys(payload, ["target", "versionId"]);
    if (typeof payload.versionId !== "string" || !payload.versionId.trim() || payload.versionId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    const version = this.ownedVersion(resourceId, payload.versionId);
    if (version.status !== "deleted") {
      const other = this.database().prepare("SELECT 1 FROM resource_versions WHERE resource_id=? AND version_id<>? AND status<>'deleted' LIMIT 1").get(resourceId, version.versionId);
      if (resource.currentVersionId === version.versionId || !other) throw new ProjectKernelError("PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN");
      this.assertCanvasVersionUnused(resourceId, version.versionId);
      this.database().prepare("UPDATE resource_versions SET status='deleted', updated_at=? WHERE version_id=?").run(now, version.versionId);
    }
    return { commandId, committed: true };
  }

  private activeTaskUses(resourceId: string): boolean {
    const db = this.database();
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='tasks'").get()) return false;
    return !!db.prepare(`SELECT 1 FROM tasks t WHERE t.status NOT IN ('completed','failed','cancelled') AND (
      EXISTS(SELECT 1 FROM json_each(t.state_json,'$.outputs') o WHERE o.value ->> '$.resourceId'=?)
      OR EXISTS(SELECT 1 FROM json_each(t.input_json,'$.references') i WHERE i.value ->> '$.resourceId'=?)
    ) LIMIT 1`).get(resourceId, resourceId);
  }

  private assertCanvasVersionUnused(resourceId: string, versionId: string): void {
    const db = this.database();
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='canvas_command_journal'").get() && db.prepare("SELECT 1 FROM canvas_command_journal WHERE phase IN ('running','ready','cleaning') LIMIT 1").get()) {
      throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    }
    const workspace = this.workspace;
    if (!workspace) return;
    const canvas = new CanvasV3Store();
    try {
      if (!canvas.hasDocument(workspace)) return;
      const document = canvas.read(workspace);
      const selected = (value: unknown) => {
        if (!value || typeof value !== "object") return false;
        const item = value as { type?: unknown; resourceId?: unknown; versionId?: unknown };
        return item.type === "version" && item.resourceId === resourceId && item.versionId === versionId;
      };
      for (const node of Object.values(document.nodes)) {
        if (node.kind !== "composition") continue;
        const selections = node.memberSelections;
        if (selected(node.activeItem) || (selections && typeof selections === "object" && Object.values(selections as Record<string, unknown>).some(selected))) {
          throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
        }
      }
    } catch (error) {
      if (error instanceof ProjectKernelError) throw error;
      throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    } finally {
      canvas.onModuleDestroy();
    }
  }

  private applyMetadata(commandId: string, resourceId: string, update: Record<string, unknown>, now: string) {
    allowedKeys(update, update.kind === "metadata" ? ["kind", "expectedMetadataRevision", "changes"] : ["kind", "expectedMetadataRevision", "lifecycle"]);
    if (typeof update.expectedMetadataRevision !== "number" || !Number.isSafeInteger(update.expectedMetadataRevision) || update.expectedMetadataRevision < 1) {
      throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    }
    const resource = this.resourceRow(resourceId);
    if (resource.metadataRevision !== update.expectedMetadataRevision) {
      return {
        commandId,
        committed: false,
        conflict: { kind: "resource_metadata_revision", resourceId, expectedRevision: update.expectedMetadataRevision, actualRevision: resource.metadataRevision },
      };
    }
    if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    const db = this.database();
    if (update.kind === "metadata") {
      const changes = plainObject(update.changes);
      allowedKeys(changes, ["name", "description"]);
      if (changes.name === undefined && changes.description === undefined) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (changes.name !== undefined && typeof changes.name !== "string") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (changes.description !== undefined && (typeof changes.description !== "string" || changes.description.length > 2000)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      db.prepare("UPDATE resources SET name=?,description=?,metadata_revision=metadata_revision+1,updated_at=? WHERE resource_id=?").run(
        typeof changes.name === "string" ? changes.name : resource.name,
        typeof changes.description === "string" ? changes.description : resource.description,
        now,
        resourceId,
      );
      return { commandId, committed: true, result: this.resource(resourceId) };
    }
    if (update.lifecycle !== "active" && update.lifecycle !== "missing") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (update.lifecycle === "active" && !this.contentAvailable(resource)) throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
    if (update.lifecycle === "missing" && this.contentAvailable(resource)) throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    db.prepare("UPDATE resources SET lifecycle=?,metadata_revision=metadata_revision+1,updated_at=? WHERE resource_id=?").run(update.lifecycle, now, resourceId);
    return { commandId, committed: true, result: this.resource(resourceId) };
  }

  private applyCurrentVersion(commandId: string, resourceId: string, update: Record<string, unknown>, now: string) {
    allowedKeys(update, ["kind", "versionId", "expectedCurrentVersionId"]);
    if (typeof update.versionId !== "string" || !update.versionId.trim() || update.versionId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (typeof update.expectedCurrentVersionId !== "string" || !update.expectedCurrentVersionId.trim() || update.expectedCurrentVersionId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const resource = this.resourceRow(resourceId);
    if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    const version = this.ownedVersion(resourceId, update.versionId);
    if ((resource.currentVersionId ?? null) !== update.expectedCurrentVersionId) {
      return { commandId, committed: false, conflict: { kind: "resource_version", resourceId, expectedVersionId: update.expectedCurrentVersionId, actualVersionId: resource.currentVersionId ?? null } };
    }
    if (version.status !== "ready") throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
    this.assertContent(version.relativePath);
    const revisionBump = resource.lifecycle === "missing" ? 1 : 0;
    this.database().prepare("UPDATE resources SET current_version_id=?,lifecycle='active',metadata_revision=metadata_revision+?,updated_at=? WHERE resource_id=?").run(version.versionId, revisionBump, now, resourceId);
    return { commandId, committed: true, result: { resource: this.resource(resourceId), version, dependencies: this.dependenciesOf(version.versionId) } };
  }

  /** 第一条版本要求资源还是 missing；之后的版本必须以当前版本为基准，否则只记冲突、不改数据。 */
  private addVersion(commandId: string, resourceId: string, update: Record<string, unknown>, now: string) {
    if (update.kind !== "new_version" || update.append === true) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (update.disposition !== "adopted" && update.disposition !== "candidate") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (update.baseVersionId !== null && typeof update.baseVersionId !== "string") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (!update.append && update.baseVersionId === null && update.disposition !== "adopted") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (typeof update.versionId !== "string" || !update.versionId.trim() || typeof update.relativePath !== "string" || !update.relativePath.trim()) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (update.source !== "import" && update.source !== "generate" && update.source !== "copy") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (!Array.isArray(update.dependencies)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const db = this.database();
    const resource = db.prepare("SELECT lifecycle, current_version_id AS currentVersionId, metadata_revision AS metadataRevision FROM resources WHERE resource_id=?").get(resourceId) as { lifecycle: string; currentVersionId: string | null; metadataRevision: number } | undefined;
    if (!resource) throw new ProjectKernelError("PROJECT_INVALID_VERSION");
    if (resource.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    if (update.disposition === "adopted" && (resource.currentVersionId ?? null) !== update.baseVersionId) {
      return { commandId, committed: false, conflict: { kind: "resource_version", resourceId, expectedVersionId: update.baseVersionId, actualVersionId: resource.currentVersionId ?? null } };
    }
    if (update.baseVersionId === null) {
      if (resource.lifecycle !== "missing" || db.prepare("SELECT 1 FROM resource_versions WHERE resource_id=? AND status<>'deleted' LIMIT 1").get(resourceId)) {
        throw new ProjectKernelError("PROJECT_INVALID_VERSION");
      }
    } else if (!resource.currentVersionId) throw new ProjectKernelError("PROJECT_CURRENT_VERSION_UNAVAILABLE");
    else {
      const base = db.prepare("SELECT status FROM resource_versions WHERE version_id=? AND resource_id=?").get(update.baseVersionId, resourceId) as { status: string } | undefined;
      if (!base || base.status !== "ready") throw new ProjectKernelError("PROJECT_INVALID_VERSION");
    }
    if (db.prepare("SELECT 1 FROM resource_versions WHERE version_id=? OR relative_path=?").get(update.versionId, update.relativePath)) {
      throw new ProjectKernelError("PROJECT_VERSION_ALREADY_EXISTS");
    }
    this.assertContent(update.relativePath);
    const dependencies = this.dependencyRows(update.versionId, update.dependencies);
    db.prepare(`INSERT INTO resource_versions(version_id,resource_id,parent_version_id,relative_path,source,status,root_runtime_session_id,task_id,created_at,updated_at)
      VALUES(?,?,?,?,?,'ready',?,?,?,?)`).run(update.versionId, resourceId, update.baseVersionId, update.relativePath, update.source, update.rootRuntimeSessionId ?? null, update.taskId ?? null, now, now);
    const insertDependency = db.prepare("INSERT INTO resource_version_dependencies(child_version_id,parent_version_id,role,input_index,created_at) VALUES(?,?,?,?,?)");
    for (const dependency of dependencies) insertDependency.run(update.versionId, dependency.versionId, dependency.role, dependency.inputIndex ?? null, now);
    if (update.disposition === "adopted") {
      const revisionBump = resource.lifecycle === "missing" ? 1 : 0;
      db.prepare("UPDATE resources SET current_version_id=?, lifecycle='active', metadata_revision=metadata_revision+?, updated_at=? WHERE resource_id=?").run(update.versionId, revisionBump, now, resourceId);
    }
    const version = db.prepare(`SELECT version_id AS versionId, resource_id AS resourceId, parent_version_id AS parentVersionId, relative_path AS relativePath, source, status
      FROM resource_versions WHERE version_id=?`).get(update.versionId);
    return { commandId, committed: true, result: { resource: this.resource(resourceId), version, dependencies: this.dependenciesOf(update.versionId) } };
  }

  private dependencyRows(childVersionId: string, dependencies: unknown[]): { resourceId: string; versionId: string; role: string; inputIndex: number | null }[] {
    const seen = new Set<string>();
    const rows = [];
    for (const dependency of dependencies) {
      if (!dependency || typeof dependency !== "object" || Array.isArray(dependency)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const item = dependency as { resourceId?: unknown; versionId?: unknown; role?: unknown; inputIndex?: unknown };
      if (typeof item.resourceId !== "string" || !item.resourceId.trim() || typeof item.versionId !== "string" || !item.versionId.trim()) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (typeof item.role !== "string" || !DEPENDENCY_ROLES.has(item.role)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (item.inputIndex !== undefined && item.inputIndex !== null && (typeof item.inputIndex !== "number" || !Number.isSafeInteger(item.inputIndex) || item.inputIndex < 0)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const key = JSON.stringify([item.versionId, item.role, item.inputIndex ?? null]);
      if (item.versionId === childVersionId || seen.has(key)) throw new ProjectKernelError("PROJECT_INVALID_DEPENDENCY");
      const parent = this.database().prepare(`SELECT v.status AS status, r.lifecycle AS lifecycle FROM resource_versions v
        JOIN resources r ON r.resource_id=v.resource_id WHERE v.version_id=? AND v.resource_id=?`).get(item.versionId, item.resourceId) as { status: string; lifecycle: string } | undefined;
      if (!parent || parent.status !== "ready" || parent.lifecycle === "deleted") throw new ProjectKernelError("PROJECT_INVALID_DEPENDENCY");
      seen.add(key);
      rows.push({ resourceId: item.resourceId, versionId: item.versionId, role: item.role, inputIndex: typeof item.inputIndex === "number" ? item.inputIndex : null });
    }
    return rows;
  }

  private dependenciesOf(versionId: string) {
    const rows = this.database().prepare(`SELECT v.resource_id AS resourceId, d.parent_version_id AS versionId, d.role, d.input_index AS inputIndex
      FROM resource_version_dependencies d JOIN resource_versions v ON v.version_id=d.parent_version_id
      WHERE d.child_version_id=? ORDER BY d.id`).all(versionId) as { resourceId: string; versionId: string; role: string; inputIndex: number | null }[];
    return rows.map(({ inputIndex, ...dependency }) => (inputIndex === null ? dependency : { ...dependency, inputIndex }));
  }

  private assertContent(relativePath: string): void {
    if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
      throw new ProjectKernelError("PROJECT_INVALID_PATH");
    }
    let current = this.workspace ?? "";
    try {
      const parts = relativePath.split("/");
      for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index] ?? "");
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) throw new ProjectKernelError("PROJECT_INVALID_PATH");
        if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
      }
    } catch (error) {
      if (error instanceof ProjectKernelError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
      throw error;
    }
  }

  private readOne(selector: unknown) {
    if (!selector || typeof selector !== "object" || Array.isArray(selector)) return { ok: false, error: { code: "RESOURCE_NOT_FOUND", message: "RESOURCE_NOT_FOUND" } };
    const raw = selector as { resourceId?: unknown; versionId?: unknown };
    const resourceId = typeof raw.resourceId === "string" ? raw.resourceId : undefined;
    const row = resourceId ? (this.database().prepare(`SELECT resource_id AS resourceId, name, description, kind, current_version_id AS currentVersionId, lifecycle,
      metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt FROM resources WHERE resource_id=?`).get(resourceId) as ResourceRow | undefined) : undefined;
    if (!row) return { ok: false, error: { code: "RESOURCE_NOT_FOUND", message: "RESOURCE_NOT_FOUND" } };
    const resource = resourceFromRow(row);
    const versionId = typeof raw.versionId === "string" ? raw.versionId : resource.currentVersionId;
    if (!versionId) return { ok: true, detail: { resource, version: null, dependencies: [] } };
    const version = this.database().prepare(`SELECT version_id AS versionId, resource_id AS resourceId, parent_version_id AS parentVersionId, relative_path AS relativePath, source, status
      FROM resource_versions WHERE version_id=? AND resource_id=?`).get(versionId, resource.resourceId);
    if (!version) return { ok: false, error: { code: "VERSION_NOT_FOUND", message: "VERSION_NOT_FOUND" } };
    const stored = version as { versionId: string; source: string };
    const metadata = this.importMetadata(stored.versionId, stored.source);
    return { ok: true, detail: { resource, version, dependencies: this.dependenciesOf(stored.versionId), ...(metadata ? { metadata } : {}) } };
  }

  /** 只给导入来的版本补采集说明。复制件自己没有时，沿唯一的源版本往上找。 */
  recordImportedVersion(entry: { versionId: string; media?: Record<string, unknown>; provenance?: Record<string, unknown>; createdAt: string; updatedAt: string }): void {
    this.ready();
    if (!entry.versionId.trim() || !entry.createdAt.trim() || !entry.updatedAt.trim()) throw new ProjectKernelError("PROJECT_INVALID_VERSION");
    const db = this.database();
    db.transaction(() => {
      const version = db.prepare("SELECT source FROM resource_versions WHERE version_id=?").get(entry.versionId) as { source: string } | undefined;
      if (!version) throw new ProjectKernelError("PROJECT_VERSION_NOT_FOUND");
      if (version.source !== "import") throw new ProjectKernelError("PROJECT_INVALID_VERSION");
      db.prepare(`INSERT INTO resource_version_import(version_id,media_json,provenance_json,created_at,updated_at)
        VALUES(?,?,?,?,?)
        ON CONFLICT(version_id) DO UPDATE SET media_json=excluded.media_json, provenance_json=excluded.provenance_json, updated_at=excluded.updated_at`).run(
        entry.versionId,
        entry.media ? JSON.stringify(entry.media) : null,
        entry.provenance ? JSON.stringify(entry.provenance) : null,
        entry.createdAt,
        entry.updatedAt,
      );
    }).immediate();
  }

  /** 长任务的中间回执。同一编号配上不同请求时拒绝，避免后一次覆盖前一次的分离结果。 */
  readDeliveryReceipt(id: string, request: unknown): unknown | undefined {
    this.ready();
    return this.deliveryReceipt(id, request);
  }

  saveDeliveryReceipt(id: string, request: unknown, receipt: unknown): unknown {
    this.ready();
    const db = this.database();
    return db.transaction(() => {
      const existing = this.deliveryReceipt(id, request);
      if (existing !== undefined) return existing;
      db.prepare("INSERT INTO project_resource_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(`delivery:${id}`, canonicalCommand(request), JSON.stringify(receipt), new Date().toISOString());
      return receipt;
    }).immediate();
  }

  private deliveryReceipt(id: string, request: unknown): unknown | undefined {
    const row = this.database().prepare("SELECT request_json, receipt_json FROM project_resource_commands WHERE command_id=?").get(`delivery:${id}`) as { request_json: string; receipt_json: string } | undefined;
    if (!row) return undefined;
    if (row.request_json !== canonicalCommand(request)) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
    return JSON.parse(row.receipt_json) as unknown;
  }

  private importMetadata(versionId: string, source: string): { media?: unknown; provenance?: unknown } | undefined {
    let currentId = versionId;
    let currentSource = source;
    const seen = new Set<string>();
    for (;;) {
      const row = this.importRow(currentId);
      if (row || currentSource !== "copy") return metadataFrom(row);
      if (seen.has(currentId)) return undefined;
      seen.add(currentId);
      const parents = this.database().prepare("SELECT parent_version_id AS versionId FROM resource_version_dependencies WHERE child_version_id=? AND role='source'").all(currentId) as { versionId: string }[];
      const parentId = parents.length === 1 ? parents[0]?.versionId : undefined;
      const parent = parentId ? (this.database().prepare("SELECT version_id AS versionId, source FROM resource_versions WHERE version_id=?").get(parentId) as { versionId: string; source: string } | undefined) : undefined;
      if (!parent) return undefined;
      currentId = parent.versionId;
      currentSource = parent.source;
    }
  }

  private importRow(versionId: string): { media_json: string | null; provenance_json: string | null } | undefined {
    return this.database().prepare("SELECT media_json, provenance_json FROM resource_version_import WHERE version_id=?").get(versionId) as { media_json: string | null; provenance_json: string | null } | undefined;
  }

  private resource(resourceId: string) {
    const row = this.database().prepare(`SELECT resource_id AS resourceId, name, description, kind, current_version_id AS currentVersionId, lifecycle,
      metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt FROM resources WHERE resource_id=?`).get(resourceId) as ResourceRow;
    return resourceFromRow(row);
  }

  private allocateName(requested: string): string {
    const occupied = this.database().prepare("SELECT 1 FROM resources WHERE name=? AND lifecycle<>'deleted' LIMIT 1");
    const taken = (name: string) => occupied.get(name) !== undefined;
    if (!taken(requested)) return requested;
    const extension = path.posix.extname(requested);
    const stem = requested.slice(0, requested.length - extension.length);
    const numbered = /\((\d+)\)$/.exec(stem);
    const base = numbered ? stem.slice(0, numbered.index) : stem;
    let ordinal = numbered ? BigInt(numbered[1] ?? "0") + 1n : 1n;
    let candidate = `${base}(${ordinal})${extension}`;
    while (taken(candidate)) {
      ordinal += 1n;
      candidate = `${base}(${ordinal})${extension}`;
    }
    return candidate;
  }

  private recordChange(resourceId: string, actor: string, now: string): void {
    const row = this.database().prepare("SELECT name, current_version_id AS currentVersionId, lifecycle, metadata_revision AS metadataRevision FROM resources WHERE resource_id=?").get(resourceId) as { name: string; currentVersionId: string | null; lifecycle: string; metadataRevision: number } | undefined;
    if (!row) return;
    this.database().prepare("INSERT INTO project_changelog(entity_kind,entity_id,detail,display_name,actor,created_at,summary) VALUES('resource',?,?,?,?,?,NULL)").run(
      resourceId,
      JSON.stringify({ v: row.currentVersionId, l: row.lifecycle, r: row.metadataRevision }),
      row.name,
      actor,
      now,
    );
  }

  private envelope(body: unknown): { commandId: string; actor: "human" | "agent"; command: { type: string; resourceId: string; payload: Record<string, unknown> } } {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const raw = body as Record<string, unknown>;
    if (typeof raw.commandId !== "string" || !raw.commandId.trim() || raw.commandId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (raw.actor !== "human" && raw.actor !== "agent") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const command = raw.command;
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const item = command as Record<string, unknown>;
    if (typeof item.resourceId !== "string" || !item.resourceId.trim()) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (!item.payload || typeof item.payload !== "object" || Array.isArray(item.payload)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    return { commandId: raw.commandId, actor: raw.actor, command: { type: String(item.type), resourceId: item.resourceId, payload: item.payload as Record<string, unknown> } };
  }

  private ready(): void {
    try {
      this.architecture.assertV3();
    } catch (error) {
      if (error instanceof ProjectKernelError) throw error;
      throw new ProjectKernelError("PROJECT_ARCHITECTURE_UNSUPPORTED");
    }
    if (this.closed) throw new ProjectKernelError("PROJECT_STORE_CLOSED");
  }

  private database(): Database.Database {
    const workspace = realpathSync(process.env.WORKSPACE_DIR ?? "");
    if (this.workspace && this.workspace !== workspace) throw new ProjectKernelError("PROJECT_WORKSPACE_SCOPE_MISMATCH");
    if (this.db) return this.db;
    const filename = path.join(workspace, ".hilo", "index.sqlite");
    mkdirSync(path.dirname(filename), { recursive: true });
    const db = new Database(filename);
    db.pragma("foreign_keys = ON");
    this.migrate(db);
    this.tags = new ProjectResourceTags(db);
    this.db = db;
    this.workspace = workspace;
    return db;
  }

  private tagStore(): ProjectResourceTags {
    const tags = this.tags;
    if (!tags) throw new ProjectKernelError("PROJECT_STORE_CLOSED");
    return tags;
  }

  private batchEnvelope(body: unknown): { commandId: string; actor: "human" | "agent"; commands: Record<string, unknown>[] } {
    const raw = plainObject(body);
    allowedKeys(raw, ["commandId", "actor", "commands"]);
    if (typeof raw.commandId !== "string" || !raw.commandId.trim() || raw.commandId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (raw.actor !== "human" && raw.actor !== "agent") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (!Array.isArray(raw.commands) || !raw.commands.length || raw.commands.length > BATCH_LIMIT) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const commands = raw.commands.map((command) => {
      const item = plainObject(command);
      allowedKeys(item, ["type", "resourceId", "payload"]);
      if (item.type !== "resource.update") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (typeof item.resourceId !== "string" || !item.resourceId.trim() || item.resourceId.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const payload = plainObject(item.payload);
      if (payload.kind !== "metadata" && payload.kind !== "current_version") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      return item;
    });
    return { commandId: raw.commandId, actor: raw.actor, commands };
  }

  private resourceRow(resourceId: string): ResourceRow {
    const row = this.database().prepare(`SELECT resource_id AS resourceId, name, description, kind, current_version_id AS currentVersionId, lifecycle,
      metadata_revision AS metadataRevision, created_at AS createdAt, updated_at AS updatedAt FROM resources WHERE resource_id=?`).get(resourceId) as ResourceRow | undefined;
    if (!row) throw new ProjectKernelError("PROJECT_RESOURCE_NOT_FOUND");
    return row;
  }

  private ownedVersion(resourceId: string, versionId: string): { versionId: string; resourceId: string; parentVersionId: string | null; relativePath: string; source: string; status: string } {
    const version = this.database().prepare(`SELECT version_id AS versionId, resource_id AS resourceId, parent_version_id AS parentVersionId, relative_path AS relativePath, source, status
      FROM resource_versions WHERE version_id=?`).get(versionId) as { versionId: string; resourceId: string; parentVersionId: string | null; relativePath: string; source: string; status: string } | undefined;
    if (!version) throw new ProjectKernelError("PROJECT_VERSION_NOT_FOUND");
    if (version.resourceId !== resourceId) throw new ProjectKernelError("PROJECT_VERSION_RESOURCE_MISMATCH");
    return version;
  }

  private contentAvailable(resource: ResourceRow): boolean {
    if (!resource.currentVersionId) return false;
    const version = this.ownedVersion(resource.resourceId, resource.currentVersionId);
    if (version.status !== "ready") return false;
    try {
      this.assertContent(version.relativePath);
      return true;
    } catch (error) {
      if (error instanceof ProjectKernelError && (error.code === "PROJECT_CONTENT_UNAVAILABLE" || error.code === "PROJECT_INVALID_PATH")) return false;
      throw error;
    }
  }

  private migrate(db: Database.Database): void {
    db.exec(`CREATE TABLE IF NOT EXISTS project_resource_schema (version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS resources (
        resource_id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        kind INTEGER NOT NULL CHECK(kind IN (1,2,3,4,5)),
        current_version_id TEXT,
        lifecycle TEXT NOT NULL CHECK(lifecycle IN ('active','missing','deleted')),
        metadata_revision INTEGER NOT NULL DEFAULT 1 CHECK(metadata_revision >= 1),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_versions (
        version_id TEXT PRIMARY KEY NOT NULL,
        resource_id TEXT NOT NULL,
        parent_version_id TEXT,
        relative_path TEXT NOT NULL UNIQUE CHECK(length(trim(relative_path)) > 0),
        source TEXT NOT NULL CHECK(source IN ('import','generate','copy')),
        root_runtime_session_id TEXT,
        task_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('ready','deleted')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(resource_id,version_id)
      );
      CREATE TABLE IF NOT EXISTS resource_version_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        child_version_id TEXT NOT NULL,
        parent_version_id TEXT NOT NULL,
        role TEXT NOT NULL,
        input_index INTEGER CHECK(input_index IS NULL OR (typeof(input_index)='integer' AND input_index >= 0)),
        created_at TEXT NOT NULL,
        CHECK(child_version_id <> parent_version_id)
      );
      CREATE TABLE IF NOT EXISTS resource_version_import (
        version_id TEXT PRIMARY KEY NOT NULL REFERENCES resource_versions(version_id) ON DELETE RESTRICT,
        media_json TEXT CHECK(media_json IS NULL OR (json_valid(media_json) AND json_type(media_json)='object')),
        provenance_json TEXT CHECK(provenance_json IS NULL OR (json_valid(provenance_json) AND json_type(provenance_json)='object')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_resource_commands (
        command_id TEXT PRIMARY KEY NOT NULL,
        request_json TEXT NOT NULL,
        receipt_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_changelog (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_kind TEXT NOT NULL CHECK(entity_kind IN ('resource','composition')),
        entity_id TEXT NOT NULL,
        detail TEXT NOT NULL,
        display_name TEXT,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        summary TEXT
      );`);
    const rows = db.prepare("SELECT version FROM project_resource_schema").all() as { version: number }[];
    if (!rows.length) db.prepare("INSERT INTO project_resource_schema(version) VALUES(3)").run();
    else if (rows.some((row) => row.version !== 3)) throw new ProjectKernelError("PROJECT_STORE_SCHEMA_UNSUPPORTED");
  }
}

function copiedRelativePath(sourceRelative: string, copyNumber: number): string {
  const parsed = path.posix.parse(sourceRelative);
  const suffix = copyNumber === 1 ? "_copy" : `_copy_${copyNumber}`;
  return path.posix.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
}

function metadataFrom(row: { media_json: string | null; provenance_json: string | null } | undefined): { media?: unknown; provenance?: unknown } | undefined {
  if (!row) return undefined;
  const media = jsonObject(row.media_json);
  const provenance = jsonObject(row.provenance_json);
  if (!media && !provenance) return undefined;
  return { ...(media ? { media } : {}), ...(provenance ? { provenance } : {}) };
}

function jsonObject(value: string | null): unknown {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isCommitted(receipt: unknown): boolean {
  return !!receipt && typeof receipt === "object" && (receipt as { committed?: boolean }).committed === true;
}

function plainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
  return value as Record<string, unknown>;
}

function allowedKeys(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
}

type QueryResourceRow = {
  id: string;
  name: string;
  description: string | null;
  kind: number;
  lifecycle: string;
  currentVersionId: string | null;
  metadataRevision: number;
  createdAt: string;
  updatedAt: string;
};

type QueryVersionRow = {
  id: string;
  resourceId: string;
  parentVersionId: string | null;
  taskId: string | null;
  status: string;
  relativePath: string;
  createdAt: string;
  contentRevision?: number | null;
};

const QUERY_KINDS = ["text", "image", "video", "audio", "file"];

function publicResourceVisibility(db: Database.Database): string {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='project_editor_compositions'").get()) return "1";
  const internal = (compositionId: string) => `EXISTS (SELECT 1 FROM project_editor_compositions ec
    WHERE ec.composition_id=${compositionId}
    AND NOT EXISTS (
      SELECT 1 FROM composition_members em WHERE em.composition_id=ec.composition_id
      AND NOT EXISTS (SELECT 1 FROM project_editor_composition_members known
        WHERE known.composition_id=em.composition_id AND known.member_id=em.member_id
          AND known.resource_id=em.resource_id AND known.role=em.role))
    AND NOT EXISTS (
      SELECT 1 FROM composition_members output WHERE output.composition_id=ec.composition_id
        AND output.resource_id<>ec.source_resource_id AND NOT EXISTS (
          SELECT 1 FROM composition_members visible JOIN compositions vc
            ON vc.composition_id=visible.composition_id
          WHERE visible.resource_id=output.resource_id AND vc.lifecycle='active'
            AND vc.composition_id<>ec.composition_id
            AND NOT EXISTS (SELECT 1 FROM project_editor_compositions other
              WHERE other.composition_id=vc.composition_id))))`;
  return `NOT EXISTS (SELECT 1 FROM project_editor_compositions private
    WHERE private.source_resource_id=resources.resource_id
      AND ${internal("private.composition_id")}
      AND NOT EXISTS (SELECT 1 FROM composition_members public_member JOIN compositions public_comp
        ON public_comp.composition_id=public_member.composition_id
        WHERE public_member.resource_id=resources.resource_id AND public_comp.lifecycle='active'
          AND NOT ${internal("public_comp.composition_id")}))`;
}

function resourceSummary(row: QueryResourceRow) {
  const kind = QUERY_KINDS[row.kind - 1];
  if (!kind) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid persisted Resource kind");
  return {
    id: row.id,
    name: row.name,
    ...(row.description == null ? {} : { description: row.description }),
    kind,
    lifecycle: row.lifecycle,
    currentVersionId: row.currentVersionId,
    metadataRevision: row.metadataRevision,
    createdAt: Date.parse(row.createdAt),
    updatedAt: Date.parse(row.updatedAt),
  };
}

function versionSummary(row: QueryVersionRow) {
  return { ...row, createdAt: Date.parse(row.createdAt) };
}

function encodeCursor(scope: unknown, position: unknown[]): string {
  return Buffer.from(stableJson({ scope: createHash("sha256").update(stableJson(scope)).digest("hex").slice(0, 15), position })).toString("base64url");
}

function decodeCursor(cursor: string | undefined, scope: unknown, length: number, numeric = false): (string | number)[] | undefined {
  if (cursor === undefined) return undefined;
  try {
    if (!cursor || cursor.length > 4096 || !/^[\w-]+$/.test(cursor)) throw new Error("encoding");
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { scope?: string; position?: unknown };
    const fingerprint = createHash("sha256").update(stableJson(scope)).digest("hex").slice(0, 15);
    if (value.scope !== fingerprint || !Array.isArray(value.position)) throw new Error("scope");
    const positions = numeric
      ? value.position.length === 1 && typeof value.position[0] === "number" && Number.isSafeInteger(value.position[0])
      : value.position.length === length && value.position.every((item) => typeof item === "string");
    if (!positions) throw new ProjectQueryError("CURSOR_STALE", "Invalid Resource cursor position", 409);
    return value.position as (string | number)[];
  } catch (error) {
    if (error instanceof ProjectQueryError) throw error;
    throw new ProjectQueryError("CURSOR_STALE", "Cursor is invalid or belongs to a different query", 409);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

type ResourceRow = {
  resourceId: string;
  name: string;
  description: string | null;
  kind: number;
  currentVersionId: string | null;
  lifecycle: string;
  metadataRevision: number;
  createdAt: string;
  updatedAt: string;
};

function resourceFromRow(row: ResourceRow) {
  const { currentVersionId, description, ...resource } = row;
  return {
    ...resource,
    ...(description === null ? {} : { description }),
    ...(currentVersionId === null ? {} : { currentVersionId }),
  };
}
