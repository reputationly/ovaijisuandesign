import { createHash } from "node:crypto";
import { mkdirSync, realpathSync } from "node:fs";
import path from "node:path";

import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import Database from "better-sqlite3";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";

const SCHEMA_VERSION = 7;
const COMPOSITION_POSITION_MAX = 1_000_000_000;
const COMPOSITION_POSITION_STEP = 10;
const DUPLICATE_ATTEMPTS = 3;
const PAGE_LIMIT = 100;
const ID_PREFIX = { composition: "cmp", compositionType: "cty", resource: "res", version: "ver", member: "mem", task: "tsk" } as const;
const ID_SUFFIX_LENGTH = 12;

function canonicalJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      return JSON.stringify(value);
    case "object": {
      if (ancestors.has(value)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const next = new Set(ancestors).add(value);
      if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, next)).join(",")}]`;
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key], next)}`).join(",")}}`;
    }
    default:
      throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
  }
}

function canonicalCommand(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalCommand).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalCommand(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function projectId(kind: keyof typeof ID_PREFIX, seed: unknown): string {
  const suffix = createHash("sha256").update(canonicalJson([kind, seed])).digest("hex");
  return `${ID_PREFIX[kind]}_${suffix.slice(0, ID_SUFFIX_LENGTH)}`;
}

function planPlacement(group: (number | null)[], insertAt: number): { position: number; values: number[] } {
  const values = [...group];
  const touchesUnordered = (insertAt > 0 && values[insertAt - 1] === null) || (insertAt < values.length && values[insertAt] === null);
  if (touchesUnordered) {
    const numbered = values.filter((value): value is number => value !== null);
    let next = Math.max(0, ...numbered) + COMPOSITION_POSITION_STEP;
    const unordered = values.filter((value) => value === null).length;
    const restart = next + (unordered - 1) * COMPOSITION_POSITION_STEP > COMPOSITION_POSITION_MAX;
    if (restart) next = COMPOSITION_POSITION_STEP;
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] !== null && !restart) continue;
      values[index] = next;
      next += COMPOSITION_POSITION_STEP;
    }
  }
  const ordered = values as number[];
  const lowBound = insertAt > 0 ? ordered[insertAt - 1] ?? -1 : -1;
  const highBound = insertAt < ordered.length ? ordered[insertAt] ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
  if (highBound === Number.POSITIVE_INFINITY && lowBound + COMPOSITION_POSITION_STEP <= COMPOSITION_POSITION_MAX) return { position: lowBound + COMPOSITION_POSITION_STEP, values: ordered };
  if (highBound !== Number.POSITIVE_INFINITY && highBound - lowBound >= 2) return { position: lowBound + Math.floor((highBound - lowBound) / 2), values: ordered };
  const sequence: (number | null)[] = [...ordered.slice(0, insertAt), null, ...ordered.slice(insertAt)];
  const bounds = (start: number, end: number) => ({
    low: start < 0 ? -1 : sequence[start] ?? -1,
    high: end >= sequence.length ? Number.POSITIVE_INFINITY : sequence[end] ?? Number.POSITIVE_INFINITY,
  });
  for (let inside = 1; inside <= sequence.length; inside += 1) {
    let best: { start: number; end: number; room: number } | undefined;
    for (let start = Math.max(-1, insertAt - inside); start < insertAt; start += 1) {
      const end = start + inside + 1;
      if (end > sequence.length) break;
      const { low, high } = bounds(start, end);
      const fits = high === Number.POSITIVE_INFINITY ? Math.max(low, 0) + inside * COMPOSITION_POSITION_STEP <= COMPOSITION_POSITION_MAX : high - low >= COMPOSITION_POSITION_STEP * (inside + 1);
      const room = (high - low) / (inside + 1);
      if (fits && (!best || room > best.room)) best = { start, end, room };
    }
    if (!best) continue;
    const { low, high } = bounds(best.start, best.end);
    for (let step = 1; step <= inside; step += 1) {
      sequence[best.start + step] = high === Number.POSITIVE_INFINITY ? Math.max(low, 0) + step * COMPOSITION_POSITION_STEP : low + Math.floor((step * (high - low)) / (inside + 1));
    }
    const position = sequence[insertAt];
    sequence.splice(insertAt, 1);
    if (typeof position !== "number") break;
    return { position, values: sequence as number[] };
  }
  throw new ProjectQueryError("COMPOSITION_POSITION_EXHAUSTED", "No positions left in this type", 409);
}

function internalClipCompositionSql(compositionId: string): string {
  return `EXISTS (SELECT 1 FROM project_editor_compositions ec
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
}

const NAME_INDEXES = `
  CREATE UNIQUE INDEX uq_compositions_active_name ON compositions(type_id,name)
    WHERE lifecycle='active' AND name<>'';
  CREATE UNIQUE INDEX uq_compositions_unclassified_name ON compositions(name)
    WHERE lifecycle='active' AND type_id IS NULL AND name<>'';
`;

const CREATE_SCHEMA = `
  CREATE TABLE composition_types (
    type_id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX uq_composition_types_label ON composition_types(label);
  CREATE TABLE compositions (
    composition_id TEXT PRIMARY KEY NOT NULL,
    type_id TEXT,
    name TEXT NOT NULL,
    lifecycle TEXT NOT NULL CHECK(lifecycle IN ('active','deleted')),
    revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(type_id) REFERENCES composition_types(type_id) ON DELETE RESTRICT
  );
  CREATE INDEX idx_compositions_type ON compositions(type_id,lifecycle);
  CREATE INDEX idx_compositions_updated ON compositions(updated_at,composition_id);
  CREATE INDEX idx_compositions_created ON compositions(created_at,composition_id);
  ${NAME_INDEXES}
  CREATE TABLE composition_members (
    composition_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    role TEXT NOT NULL,
    resource_id TEXT,
    position INTEGER NOT NULL CHECK(typeof(position)='integer' AND position >= 0),
    PRIMARY KEY(composition_id,member_id),
    UNIQUE(composition_id,position),
    FOREIGN KEY(composition_id) REFERENCES compositions(composition_id) ON DELETE CASCADE
  );
  CREATE INDEX idx_composition_members_role ON composition_members(composition_id,role);
  CREATE INDEX idx_composition_members_resource ON composition_members(resource_id);
  CREATE TABLE composition_attributes (
    composition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(typeof(position)='integer' AND position >= 0),
    PRIMARY KEY(composition_id,key),
    FOREIGN KEY(composition_id) REFERENCES compositions(composition_id) ON DELETE CASCADE
  );
  CREATE INDEX idx_composition_attributes_kv ON composition_attributes(key,value);
  CREATE INDEX idx_composition_attributes_order ON composition_attributes(composition_id,position);
  CREATE TABLE project_composition_commands (
    command_id TEXT PRIMARY KEY NOT NULL,
    request_json TEXT NOT NULL,
    receipt_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  INSERT INTO project_composition_schema(version) VALUES(${SCHEMA_VERSION});
`;

type CompositionRow = {
  compositionId: string;
  type: string | null;
  name: string;
  lifecycle: string;
  position: number | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

type Member = { memberId: string; role: string; resource: string | null };

type DuplicateMemberPlan = { sourceMemberId: string; sourceResource: string | null; role: string; resource: string | null; version: string | null };

class CompositionDuplicateStale extends Error {
  constructor() {
    super("COMPOSITION_DUPLICATE_STALE");
    this.name = "CompositionDuplicateStale";
  }
}

function mergeAttributes(current: { key: string; value: string }[], set: unknown, unset: unknown): { key: string; value: string }[] {
  const removed = new Set(Array.isArray(unset) ? unset.filter((item): item is string => typeof item === "string") : []);
  const next = current.filter((attribute) => !removed.has(attribute.key)).map((attribute) => ({ ...attribute }));
  for (const attribute of Array.isArray(set) ? set : []) {
    if (!attribute || typeof attribute !== "object") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const item = attribute as { key?: unknown; value?: unknown };
    if (typeof item.key !== "string" || typeof item.value !== "string") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const existing = next.find((entry) => entry.key === item.key);
    if (existing) existing.value = item.value;
    else next.push({ key: item.key, value: item.value });
  }
  return next;
}

type CommandEnvelope = {
  commandId: string;
  actor: "human" | "agent";
  expectedRevision?: number;
  command: Record<string, unknown>;
};

@Injectable()
export class ProjectCompositionService implements OnModuleDestroy {
  private db?: Database.Database;
  private workspace?: string;
  private closed = false;

  constructor(
    private readonly architecture: WorkspaceProjectArchitectureService,
    private readonly resources: ProjectResourceService,
  ) {}

  onModuleDestroy(): void {
    this.closed = true;
    this.db?.close();
    this.db = undefined;
  }

  get(compositionId: string) {
    this.ready();
    if (typeof compositionId !== "string" || !compositionId.trim()) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return this.database().transaction(() => {
      const row = this.row(compositionId);
      return { ...row, type: this.typeDef(row.type), attributes: this.readAttributes(compositionId), members: this.readMembers(compositionId) };
    })();
  }

  list(body: unknown) {
    this.ready();
    const query = this.listQuery(body, false);
    return this.page(query);
  }

  /**
   * 名字、属性值和成员资源名都能命中。光标绑在筛选和排序上，换条件就不能接着翻。
   */
  querySearch(query: { text?: string; type?: string | null; attributes?: Record<string, string>; lifecycle?: string[]; order?: { by: "createdAt" | "updatedAt" | "position"; direction: "asc" | "desc" }; limit?: number; cursor?: string }) {
    this.ready();
    const { cursor: outer, ...input } = query;
    const order = query.order ?? { by: "updatedAt" as const, direction: "desc" as const };
    const lifecycle = [...new Set(query.lifecycle ?? ["active"])].sort();
    const scope = stableJson({ operation: "search", visibility: "public-v1", text: query.text ?? "", type: query.type, lifecycle, attributes: query.attributes ?? {} });
    const outerScope = { workspace: process.env.WORKSPACE_DIR ?? "", operation: "composition_search", input };
    const decoded = decodeOuterCursor(outer, outerScope);
    const inner = typeof decoded?.[0] === "string" ? decoded[0] : undefined;
    if (decoded && inner === undefined) throw new ProjectQueryError("CURSOR_STALE", "Invalid search cursor", 409);
    const filters = [`NOT ${internalClipCompositionSql("compositions.composition_id")}`];
    const params: unknown[] = [];
    if (query.text) {
      const pattern = `%${query.text.replace(/[\\%_]/g, (value) => `\\${value}`)}%`;
      const matches = ["name LIKE ? ESCAPE '\\'", "EXISTS(SELECT 1 FROM composition_attributes a WHERE a.composition_id=compositions.composition_id AND a.value LIKE ? ESCAPE '\\')"];
      params.push(pattern, pattern);
      if (this.database().prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='resources'").get()) {
        matches.push(`EXISTS(SELECT 1 FROM composition_members m JOIN resources r ON r.resource_id=m.resource_id
          WHERE m.composition_id=compositions.composition_id AND r.lifecycle<>'deleted' AND (r.name LIKE ? ESCAPE '\\' OR r.description LIKE ? ESCAPE '\\'))`);
        params.push(pattern, pattern);
      }
      filters.push(`(${matches.join(" OR ")})`);
    }
    if (query.type === null) filters.push("type_id IS NULL");
    else if (query.type !== undefined) {
      filters.push("type_id=?");
      params.push(query.type);
    }
    filters.push(`lifecycle IN (${lifecycle.map(() => "?").join(",")})`);
    params.push(...lifecycle);
    for (const [key, value] of Object.entries(query.attributes ?? {})) {
      filters.push("EXISTS(SELECT 1 FROM composition_attributes a WHERE a.composition_id=compositions.composition_id AND a.key=? AND a.value=?)");
      params.push(key, value);
    }
    const limit = Math.min(query.limit ?? 20, 100);
    let orderBy: string;
    if (order.by === "position") {
      orderBy = "(position IS NULL) ASC, position ASC, created_at ASC, composition_id ASC";
      if (inner) {
        const key = decodeInnerCursor(inner as string, order, scope);
        const [unordered, position, createdAt, id] = key;
        const afterCreation = "(created_at > ? OR (created_at = ? AND composition_id > ?))";
        if (unordered) {
          filters.push(`(position IS NULL AND ${afterCreation})`);
          params.push(String(createdAt), String(createdAt), String(id));
        } else {
          filters.push(`(position IS NULL OR position > ? OR (position = ? AND ${afterCreation}))`);
          params.push(position, position, String(createdAt), String(createdAt), String(id));
        }
      }
    } else {
      const column = order.by === "createdAt" ? "created_at" : "updated_at";
      const comparison = order.direction === "asc" ? ">" : "<";
      const direction = order.direction === "asc" ? "ASC" : "DESC";
      if (inner) {
        const [value, id] = decodeInnerCursor(inner as string, order, scope);
        filters.push(`(${column} ${comparison} ? OR (${column}=? AND composition_id ${comparison} ?))`);
        params.push(String(value), String(value), String(id));
      }
      orderBy = `${column} ${direction}, composition_id ${direction}`;
    }
    const rows = this.database().prepare(`SELECT composition_id AS compositionId, type_id AS type, name, lifecycle, position, revision, created_at AS createdAt, updated_at AS updatedAt
      FROM compositions WHERE ${filters.join(" AND ")} ORDER BY ${orderBy} LIMIT ?`).all(...params, limit + 1) as CompositionRow[];
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => compositionSnapshot(row, this.readAttributes(row.compositionId) as { key: string; value: string }[])),
      nextCursor: rows.length > limit && last ? encodeOuterCursor(outerScope, [encodeInnerCursor(order, last, scope)]) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  /**
   * 按类型和名字找到还在用的组合；没有就建一个。同一命令号再来只交回第一次的回执。
   */
  ensureAgent(commandId: string, input: { typeId?: string; label?: string; description?: string; name: string; attributes?: Record<string, string>; operations?: unknown[]; position?: number; placement?: { after: string } | { before: string } }) {
    this.ready();
    const request = canonicalCommand({ kind: "ensure_target", commandId, ...input });
    const db = this.database();
    return db.transaction(() => {
      const previous = db.prepare("SELECT request_json, receipt_json FROM project_composition_commands WHERE command_id=?").get(commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return JSON.parse(previous.receipt_json) as unknown;
      }
      const now = new Date().toISOString();
      let typeId = input.typeId ?? null;
      if (input.typeId) this.requireType(input.typeId);
      else {
        const existing = db.prepare("SELECT type_id AS typeId FROM composition_types WHERE label=?").get(input.label ?? "") as { typeId: string } | undefined;
        if (existing) typeId = existing.typeId;
        else {
          typeId = projectId("compositionType", commandId);
          db.prepare("INSERT INTO composition_types(type_id,label,description,created_at,updated_at) VALUES(?,?,?,?,?)").run(typeId, input.label, input.description ?? null, now, now);
        }
      }
      const name = input.name.trim();
      const matches = db.prepare("SELECT composition_id AS compositionId, revision, position FROM compositions WHERE type_id IS ? AND name=? AND lifecycle='active'").all(typeId, name) as { compositionId: string; revision: number; position: number | null }[];
      if (matches.length > 1) throw new ProjectQueryError("COMPOSITION_TARGET_AMBIGUOUS", "Multiple active Compositions match the target", 409);
      const created = matches.length === 0;
      let compositionId = matches[0]?.compositionId;
      let revision = matches[0]?.revision ?? 1;
      let position = matches[0]?.position ?? null;
      if (!compositionId) {
        compositionId = projectId("composition", commandId);
        db.prepare("INSERT INTO compositions(composition_id,type_id,name,lifecycle,position,revision,created_at,updated_at) VALUES(?,?,?,'active',NULL,1,?,?)").run(compositionId, typeId, name, now, now);
        this.writeAttributes(compositionId, Object.entries(input.attributes ?? {}).map(([key, value]) => ({ key, value })));
        if (typeof input.position === "number") {
          this.assertPositionFree(typeId, input.position, compositionId);
          db.prepare("UPDATE compositions SET position=? WHERE composition_id=?").run(input.position, compositionId);
          position = input.position;
        } else if (input.placement) {
          const placed = this.place(typeId, input.placement, "agent", now, compositionId);
          this.writePositions([{ compositionId, to: placed.position }]);
          position = placed.position;
        }
      }
      if (input.operations?.length) {
        this.applyMemberOperations(compositionId, input.operations);
        db.prepare("UPDATE compositions SET revision=revision+1, updated_at=? WHERE composition_id=?").run(now, compositionId);
        revision += 1;
      }
      if (created || input.operations?.length) this.recordChange(compositionId, revision, "agent", now);
      const receipt = { typeId, compositionId, revision, created, ...(position === null ? {} : { position }) };
      db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(commandId, request, JSON.stringify(receipt), now);
      return receipt;
    }).immediate();
  }

  /**
   * 编辑器第一次打开时要有一个稳定的组合。名字被占用就加序号，
   * 剪辑器的组合不进入公开列表，所以名字留空并登记来源。
   */
  createEditorComposition(commandId: string, name: string, internalClip: boolean) {
    this.ready();
    if (internalClip && !commandId.endsWith(":composition")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const requested = internalClip ? "" : name.trim();
    const request = canonicalCommand({ kind: "editor_composition", commandId, name: requested, internalClip });
    const db = this.database();
    return db.transaction(() => {
      const previous = db.prepare("SELECT request_json, receipt_json FROM project_composition_commands WHERE command_id=?").get(commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return JSON.parse(previous.receipt_json) as { commandId: string; committed: boolean; compositionId: string; revision: number };
      }
      const compositionId = projectId("composition", commandId);
      if (db.prepare("SELECT 1 FROM compositions WHERE composition_id=?").get(compositionId)) throw new ProjectKernelError("PROJECT_COMPOSITION_ALREADY_EXISTS");
      const finalName = !internalClip && this.nameTaken(null, requested) ? this.duplicateName(null, requested) : requested;
      this.assertNameAvailable(null, finalName);
      const now = new Date().toISOString();
      db.prepare("INSERT INTO compositions(composition_id,type_id,name,lifecycle,position,revision,created_at,updated_at) VALUES(?,NULL,?,'active',NULL,1,?,?)").run(compositionId, finalName, now, now);
      if (internalClip) {
        const seed = commandId.slice(0, -":composition".length);
        const sourceResourceId = projectId("resource", [seed, "editor-source"]);
        const memberId = projectId("member", [compositionId, sourceResourceId]);
        db.prepare("INSERT INTO project_editor_compositions(composition_id,source_resource_id,seed) VALUES(?,?,?)").run(compositionId, sourceResourceId, seed);
        db.prepare("INSERT INTO project_editor_composition_members(composition_id,member_id,resource_id,role) VALUES(?,?,?,?)").run(compositionId, memberId, sourceResourceId, "clip-source");
      }
      this.recordChange(compositionId, 1, "human", now);
      const receipt = { commandId, committed: true, compositionId, revision: 1 };
      db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(commandId, request, JSON.stringify(receipt), now);
      return receipt;
    }).immediate();
  }

  /** 一个资源出现在哪些还在用的组合里，按组合编号和成员编号往后翻。 */
  queryMemberships(query: { resourceId: string; limit?: number; cursor?: string }) {
    this.ready();
    const scope = { workspace: this.workspace ?? "", resourceId: query.resourceId, query: "composition-memberships", visibility: "public-v1" };
    const position = decodeOuterCursor(query.cursor, scope, 2);
    if (position && position.some((item) => typeof item !== "string")) throw new ProjectQueryError("CURSOR_STALE", "Invalid membership cursor", 409);
    const limit = query.limit ?? 100;
    const rows = this.database().prepare(`SELECT c.composition_id AS compositionId, c.revision AS revision, m.member_id AS memberId, m.role AS role
      FROM composition_members m JOIN compositions c ON c.composition_id=m.composition_id
      WHERE m.resource_id=? AND c.lifecycle='active' AND NOT ${internalClipCompositionSql("c.composition_id")}
      ${position ? "AND (c.composition_id,m.member_id)>(?,?)" : ""}
      ORDER BY c.composition_id, m.member_id LIMIT ?`).all(query.resourceId, ...(position ?? []), limit + 1) as { compositionId: string; revision: number; memberId: string; role: string }[];
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => ({ compositionId: row.compositionId, revision: row.revision, memberId: row.memberId, role: row.role })),
      nextCursor: rows.length > limit && last ? encodeOuterCursor(scope, [last.compositionId, last.memberId]) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  search(body: unknown) {
    this.ready();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    const { text, ...rest } = body as { text?: unknown };
    const page = this.page(this.listQuery(rest, false));
    if (typeof text !== "string" || text === "") return page;
    return { items: page.items.filter((item) => item.name.includes(text)) };
  }

  listByResource(body: unknown) {
    this.ready();
    const query = this.listQuery(body, true);
    return this.page(query);
  }

  /**
   * 按变更序号往前扫。没有成员资源的组合跳过，但序号仍然前进，
   * 这样下一页不会把同一段又读一遍。
   */
  listAgentPlacements(query: { since: number; limit: number; includeChatUploads: boolean }) {
    this.ready();
    if (!Number.isSafeInteger(query.since) || query.since < 0 || !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 1000) {
      throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    }
    const db = this.database();
    return db.transaction(() => {
      const rows = db.prepare(`SELECT seq, entity_id AS compositionId FROM project_changelog
        WHERE entity_kind='composition' AND (actor='agent' ${query.includeChatUploads ? `OR (
          actor='human' AND entity_id IN (
            SELECT json_extract(receipt_json, '$.compositionId') FROM project_composition_commands
            WHERE command_id GLOB 'chat-upload:*:composition'
              AND json_extract(receipt_json, '$.committed')=1
          )
        )` : ""}) AND seq>? ORDER BY seq ASC LIMIT ?`).all(query.since, query.limit) as { seq: number; compositionId: string }[];
      const firstResource = db.prepare(`SELECT m.resource_id AS resourceId FROM compositions c
        JOIN composition_members m ON m.composition_id=c.composition_id
        WHERE c.composition_id=? AND c.lifecycle='active' AND m.resource_id IS NOT NULL
          AND NOT ${internalClipCompositionSql("c.composition_id")}
        ORDER BY m.position LIMIT 1`);
      const seen = new Set<string>();
      const items: { seq: number; compositionId: string; firstResourceId: string }[] = [];
      for (const row of rows) {
        if (seen.has(row.compositionId)) continue;
        seen.add(row.compositionId);
        const resource = firstResource.get(row.compositionId) as { resourceId: string } | undefined;
        if (!resource) continue;
        items.push({ seq: row.seq, compositionId: row.compositionId, firstResourceId: resource.resourceId });
      }
      const last = rows[rows.length - 1];
      return { items, nextSeq: last ? last.seq : query.since, complete: rows.length < query.limit };
    })();
  }

  listTypes(body: unknown) {
    this.ready();
    const text = body && typeof body === "object" && !Array.isArray(body) ? (body as { text?: unknown }).text : undefined;
    if (text !== undefined && typeof text !== "string") throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    if (text === undefined || text === "") {
      return this.database().prepare("SELECT type_id AS typeId, label, description, created_at AS createdAt, updated_at AS updatedAt FROM composition_types ORDER BY created_at, type_id").all();
    }
    const pattern = `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    return this.database().prepare(`SELECT type_id AS typeId, label, description, created_at AS createdAt, updated_at AS updatedAt FROM composition_types
      WHERE label LIKE ? ESCAPE '\\' OR (description IS NOT NULL AND description LIKE ? ESCAPE '\\') ORDER BY created_at, type_id`).all(pattern, pattern);
  }

  execute(body: unknown) {
    this.ready();
    const envelope = this.envelope(body);
    if (envelope.command.type === "composition.duplicate") return this.duplicate(envelope);
    const db = this.database();
    return db.transaction(() => {
      const request = canonicalCommand({
        actor: envelope.actor,
        command: envelope.command,
        ...(envelope.expectedRevision !== undefined ? { expectedRevision: envelope.expectedRevision } : {}),
      });
      const previous = db.prepare("SELECT request_json, receipt_json FROM project_composition_commands WHERE command_id=?").get(envelope.commandId) as { request_json: string; receipt_json: string } | undefined;
      if (previous) {
        if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
        return JSON.parse(previous.receipt_json) as unknown;
      }
      const now = new Date().toISOString();
      const receipt = this.apply(envelope, now);
      db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(receipt), now);
      if (envelope.command.type !== "composition.move" && receipt.committed && receipt.compositionId && receipt.revision !== undefined) this.recordChange(receipt.compositionId, receipt.revision, envelope.actor, now);
      return receipt;
    }).immediate();
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
    this.db = db;
    this.workspace = workspace;
    return db;
  }

  private migrate(db: Database.Database): void {
    db.transaction(() => {
      db.exec("CREATE TABLE IF NOT EXISTS project_composition_schema (version INTEGER PRIMARY KEY);");
      const rows = db.prepare("SELECT version FROM project_composition_schema").all() as { version: number }[];
      if (!rows.length) db.exec(CREATE_SCHEMA);
      else if (rows.some((row) => row.version !== SCHEMA_VERSION)) throw new ProjectKernelError("PROJECT_STORE_SCHEMA_UNSUPPORTED");
      const columns = db.prepare("PRAGMA table_info(compositions)").all() as { name: string }[];
      if (!columns.some((column) => column.name === "position")) {
        db.exec("ALTER TABLE compositions ADD COLUMN position INTEGER CHECK(position IS NULL OR typeof(position)='integer')");
      }
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_compositions_type_position ON compositions(type_id,position)
          WHERE lifecycle='active' AND position IS NOT NULL AND type_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uq_compositions_unclassified_position ON compositions(position)
          WHERE lifecycle='active' AND position IS NOT NULL AND type_id IS NULL;
        CREATE TABLE IF NOT EXISTS project_editor_compositions (
          composition_id TEXT PRIMARY KEY REFERENCES compositions(composition_id) ON DELETE CASCADE,
          source_resource_id TEXT NOT NULL UNIQUE,
          seed TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS project_editor_composition_members (
          composition_id TEXT NOT NULL REFERENCES project_editor_compositions(composition_id) ON DELETE CASCADE,
          member_id TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          role TEXT NOT NULL,
          PRIMARY KEY(composition_id,member_id)
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
        );
      `);
    }).immediate();
  }

  private apply(envelope: CommandEnvelope, now: string): { commandId: string; committed: boolean; compositionId?: string; typeId?: string; revision?: number; conflict?: unknown; position?: number; renumbered?: { compositionId: string; position: number }[] } {
    const command = envelope.command;
    const type = command.type;
    if (type === "composition_type.register" || type === "composition_type.rename") return this.applyType(envelope.commandId, command, now);
    if (type === "composition.create") {
      const compositionId = projectId("composition", envelope.commandId);
      const db = this.database();
      if (db.prepare("SELECT 1 FROM compositions WHERE composition_id=?").get(compositionId)) throw new ProjectKernelError("PROJECT_COMPOSITION_ALREADY_EXISTS");
      const compositionType = command.compositionType === null ? null : this.text(command.compositionType, "PROJECT_INVALID_COMMAND");
      this.requireType(compositionType);
      const name = this.text(command.name, "PROJECT_INVALID_COMMAND").trim();
      this.assertNameAvailable(compositionType, name);
      db.prepare(`INSERT INTO compositions(composition_id,type_id,name,lifecycle,position,revision,created_at,updated_at) VALUES(?,?,?,'active',NULL,1,?,?)`).run(compositionId, compositionType, name, now, now);
      this.writeAttributes(compositionId, Array.isArray(command.attributes) ? command.attributes : []);
      return { commandId: envelope.commandId, committed: true, compositionId, revision: 1 };
    }
    if (type === "composition.move") return this.applyMove(envelope, now);
    if (envelope.expectedRevision === undefined) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const compositionId = this.text(command.compositionId, "PROJECT_INVALID_COMMAND");
    const current = this.row(compositionId);
    if (current.revision !== envelope.expectedRevision) {
      return {
        commandId: envelope.commandId,
        committed: false,
        conflict: { kind: "composition_revision", compositionId, expectedRevision: envelope.expectedRevision, actualRevision: current.revision, resolution: "retry" },
      };
    }
    const restoring = type === "composition.restore";
    if (restoring !== (current.lifecycle === "deleted")) throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    if (type === "composition.rename") {
      const name = this.text(command.name, "PROJECT_INVALID_COMMAND").trim();
      this.assertNameAvailable(current.type, name, compositionId);
      this.database().prepare("UPDATE compositions SET name=? WHERE composition_id=?").run(name, compositionId);
    } else if (type === "composition.set_lifecycle") {
      const lifecycle = command.lifecycle === "active" || command.lifecycle === "deleted" ? command.lifecycle : null;
      if (!lifecycle) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      if (lifecycle === "active") this.assertNameAvailable(current.type, current.name, compositionId);
      this.database().prepare("UPDATE compositions SET lifecycle=? WHERE composition_id=?").run(lifecycle, compositionId);
    } else if (type === "composition.restore") {
      this.assertNameAvailable(current.type, current.name, compositionId);
      const position = current.position !== null && this.positionHolder(current.type, current.position, compositionId) ? this.nextFreePosition(current.type, current.position, compositionId) : current.position;
      this.database().prepare("UPDATE compositions SET lifecycle='active', position=? WHERE composition_id=?").run(position, compositionId);
    } else if (type === "composition.apply") {
      this.applyMemberOperations(compositionId, command.operations);
    } else if (type === "composition.set_attributes") {
      const currentAttributes = this.readAttributes(compositionId) as { key: string; value: string }[];
      this.writeAttributes(compositionId, mergeAttributes(currentAttributes, command.set, command.unset));
    } else if (type === "composition.set_type") {
      if (Object.keys(command).some((key) => !["type", "compositionId", "compositionType"].includes(key)) || !("compositionType" in command)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const nextType = command.compositionType === null ? null : this.text(command.compositionType, "PROJECT_INVALID_COMMAND");
      this.requireType(nextType);
      this.assertNameAvailable(nextType, current.name, compositionId);
      const changing = nextType !== current.type;
      let position = current.position;
      if (changing && nextType === null) position = null;
      else if (changing && current.position !== null && this.positionHolder(nextType, current.position, compositionId)) position = this.nextFreePosition(nextType, current.position, compositionId);
      this.database().prepare("UPDATE compositions SET type_id=?, position=? WHERE composition_id=?").run(nextType, position, compositionId);
    } else throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    this.database().prepare("UPDATE compositions SET revision=revision+1, updated_at=? WHERE composition_id=?").run(now, compositionId);
    return { commandId: envelope.commandId, committed: true, compositionId, revision: envelope.expectedRevision + 1 };
  }

  private applyType(commandId: string, command: Record<string, unknown>, now: string) {
    const typeId = command.type === "composition_type.register" ? projectId("compositionType", commandId) : this.text(command.typeId, "PROJECT_INVALID_COMMAND");
    const label = this.text(command.label, "PROJECT_INVALID_COMMAND");
    const db = this.database();
    const taken = db.prepare("SELECT type_id FROM composition_types WHERE label=? AND type_id<>?").get(label, typeId);
    if (taken) throw new ProjectKernelError("PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS");
    if (command.type === "composition_type.register") {
      if (db.prepare("SELECT 1 FROM composition_types WHERE type_id=?").get(typeId)) throw new ProjectKernelError("PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS");
      const description = command.description === undefined ? null : this.text(command.description, "PROJECT_INVALID_COMMAND");
      db.prepare("INSERT INTO composition_types(type_id,label,description,created_at,updated_at) VALUES(?,?,?,?,?)").run(typeId, label, description, now, now);
      return { commandId, committed: true, typeId };
    }
    this.requireType(typeId);
    db.prepare("UPDATE composition_types SET label=?, updated_at=? WHERE type_id=?").run(label, now, typeId);
    return { commandId, committed: true, typeId };
  }

  private page(query: { type?: string; lifecycle: string[]; resourceId?: string; limit?: number }) {
    const filters = ["NOT EXISTS (SELECT 1 FROM project_editor_compositions ec WHERE ec.composition_id=compositions.composition_id)", `lifecycle IN (${query.lifecycle.map(() => "?").join(",")})`];
    const params: unknown[] = [...query.lifecycle];
    if (query.resourceId) {
      filters.push("EXISTS(SELECT 1 FROM composition_members m WHERE m.composition_id=compositions.composition_id AND m.resource_id=?)");
      params.push(query.resourceId);
    }
    if (query.type) {
      filters.push("type_id=?");
      params.push(query.type);
    }
    const size = Math.min(query.limit ?? PAGE_LIMIT, PAGE_LIMIT);
    const rows = this.database().prepare(`SELECT composition_id AS compositionId, type_id AS type, name, lifecycle, position, revision, created_at AS createdAt, updated_at AS updatedAt FROM compositions
      WHERE ${filters.join(" AND ")} ORDER BY updated_at DESC, composition_id DESC LIMIT ?`).all(...params, size) as CompositionRow[];
    return { items: rows.map((row) => ({ compositionId: row.compositionId, type: this.typeDef(row.type), name: row.name, lifecycle: row.lifecycle, position: row.position, updatedAt: row.updatedAt })) };
  }

  private listQuery(body: unknown, byResource: boolean): { type?: string; lifecycle: string[]; resourceId?: string; limit?: number } {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    const raw = body as Record<string, unknown>;
    const allowed = ["type", "lifecycle", "order", "limit", "cursor", ...(byResource ? ["resourceId"] : [])];
    if (Object.keys(raw).some((key) => !allowed.includes(key))) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    const lifecycle = raw.lifecycle === undefined ? ["active"] : Array.isArray(raw.lifecycle) ? raw.lifecycle : null;
    if (!lifecycle || lifecycle.some((item) => item !== "active" && item !== "deleted")) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return {
      ...(typeof raw.type === "string" ? { type: raw.type } : {}),
      lifecycle,
      ...(typeof raw.resourceId === "string" ? { resourceId: raw.resourceId } : {}),
      ...(typeof raw.limit === "number" ? { limit: raw.limit } : {}),
    };
  }

  private envelope(body: unknown): CommandEnvelope {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const raw = body as Record<string, unknown>;
    if (typeof raw.commandId !== "string" || !raw.commandId.trim()) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (raw.actor !== "human" && raw.actor !== "agent") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (!raw.command || typeof raw.command !== "object" || Array.isArray(raw.command)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    return {
      commandId: raw.commandId,
      actor: raw.actor,
      ...(typeof raw.expectedRevision === "number" ? { expectedRevision: raw.expectedRevision } : {}),
      command: raw.command as Record<string, unknown>,
    };
  }

  private row(compositionId: string): CompositionRow {
    const row = this.database().prepare("SELECT composition_id AS compositionId, type_id AS type, name, lifecycle, position, revision, created_at AS createdAt, updated_at AS updatedAt FROM compositions WHERE composition_id=?").get(compositionId) as CompositionRow | undefined;
    if (!row) throw new ProjectKernelError("PROJECT_COMPOSITION_NOT_FOUND");
    return row;
  }

  private typeDef(typeId: string | null) {
    if (typeId === null) return null;
    const row = this.database().prepare("SELECT type_id AS typeId, label, description, created_at AS createdAt, updated_at AS updatedAt FROM composition_types WHERE type_id=?").get(typeId) as { description: string | null } | undefined;
    if (!row) throw new ProjectKernelError("PROJECT_COMPOSITION_TYPE_NOT_FOUND");
    const { description, ...rest } = row as { description: string | null; typeId: string; label: string; createdAt: string; updatedAt: string };
    return description === null ? rest : { ...rest, description };
  }

  private readMembers(compositionId: string) {
    return this.database().prepare("SELECT member_id AS memberId, role, resource_id AS resource FROM composition_members WHERE composition_id=? ORDER BY position").all(compositionId);
  }

  private readAttributes(compositionId: string) {
    return this.database().prepare("SELECT key, value FROM composition_attributes WHERE composition_id=? ORDER BY position").all(compositionId);
  }

  private writeAttributes(compositionId: string, attributes: unknown[]): void {
    const db = this.database();
    db.prepare("DELETE FROM composition_attributes WHERE composition_id=?").run(compositionId);
    const insert = db.prepare("INSERT INTO composition_attributes(composition_id,key,value,position) VALUES(?,?,?,?)");
    attributes.forEach((attribute, position) => {
      if (!attribute || typeof attribute !== "object") throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const item = attribute as { key?: unknown; value?: unknown };
      insert.run(compositionId, this.text(item.key, "PROJECT_INVALID_COMMAND"), this.text(item.value, "PROJECT_INVALID_COMMAND"), position);
    });
  }

  private requireType(typeId: string | null): void {
    if (typeId === null) return;
    if (!this.database().prepare("SELECT 1 FROM composition_types WHERE type_id=?").get(typeId)) throw new ProjectKernelError("PROJECT_COMPOSITION_TYPE_NOT_FOUND");
  }

  private nameTaken(typeId: string | null, name: string): boolean {
    if (name === "") return false;
    return !!this.database().prepare("SELECT 1 FROM compositions WHERE type_id IS ? AND name=? AND lifecycle='active'").get(typeId, name);
  }

  private assertNameAvailable(typeId: string | null, name: string, exceptId = ""): void {
    if (name === "") return;
    const existing = this.database().prepare("SELECT 1 FROM compositions WHERE type_id IS ? AND name=? AND lifecycle='active' AND composition_id<>?").get(typeId, name, exceptId);
    if (existing) throw new ProjectQueryError("COMPOSITION_NAME_CONFLICT", "An active Composition already has this type and name", 409);
  }

  private recordChange(compositionId: string, revision: number, actor: string, now: string, summary?: Record<string, unknown>): void {
    const row = this.database().prepare("SELECT name, position FROM compositions WHERE composition_id=?").get(compositionId) as { name: string; position: number | null } | undefined;
    this.database().prepare("INSERT INTO project_changelog(entity_kind,entity_id,detail,display_name,actor,created_at,summary) VALUES('composition',?,?,?,?,?,?)").run(
      compositionId,
      JSON.stringify(row?.position == null ? { r: revision } : { r: revision, p: row.position }),
      row?.name ?? null,
      actor,
      now,
      summary && Object.keys(summary).length ? JSON.stringify(summary) : null,
    );
  }

  private text(value: unknown, code: string): string {
    if (typeof value !== "string") throw new ProjectKernelError(code);
    return value;
  }

  /**
   * 成员文件先落盘，组合行、属性和回执再一起提交。
   * 源在复制期间变了就整次作废重试，避免新组合指到半截成员。
   */
  private duplicate(envelope: CommandEnvelope) {
    if (envelope.expectedRevision !== undefined) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const command = envelope.command;
    const allowed = ["type", "sourceCompositionId", "sourceRevision", "versions", "position", "placement"];
    if (Object.keys(command).some((key) => !allowed.includes(key))) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const sourceCompositionId = this.id(command.sourceCompositionId);
    const sourceRevision = command.sourceRevision;
    if (sourceRevision !== undefined && (typeof sourceRevision !== "number" || !Number.isSafeInteger(sourceRevision) || sourceRevision < 1)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const versions = this.duplicateVersions(command.versions);
    if (command.position !== undefined && command.placement !== undefined) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    if (command.position !== undefined && (typeof command.position !== "number" || !Number.isSafeInteger(command.position) || command.position < 0 || command.position > COMPOSITION_POSITION_MAX)) {
      throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    }
    if (command.placement !== undefined) this.placement(command.placement);
    const request = canonicalCommand({ actor: envelope.actor, command: envelope.command });
    const replay = this.readDuplicate(envelope.commandId, request);
    if (replay) return replay;
    for (let attempt = 0; attempt < DUPLICATE_ATTEMPTS; attempt += 1) {
      const source = this.row(sourceCompositionId);
      if (typeof sourceRevision === "number" && source.revision !== sourceRevision) {
        return this.journalDuplicate(envelope, request, {
          commandId: envelope.commandId,
          committed: false,
          conflict: { kind: "composition_revision", compositionId: source.compositionId, expectedRevision: sourceRevision, actualRevision: source.revision, resolution: "retry" },
        });
      }
      if (source.lifecycle !== "active") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
      const plan = {
        sourceRevision: source.revision,
        members: this.copyCompositionMembers(envelope, this.readMembers(source.compositionId) as Member[], versions),
      };
      try {
        return this.insertDuplicate(envelope, plan, request);
      } catch (error) {
        if (!(error instanceof CompositionDuplicateStale)) throw error;
        if (sourceRevision !== undefined) break;
      }
    }
    throw new ProjectQueryError("COMPOSITION_DUPLICATE_SOURCE_CHANGED", "The source Composition changed while it was being copied. Read it again and retry.", 409);
  }

  private copyCompositionMembers(envelope: CommandEnvelope, members: Member[], versions: Record<string, string>): DuplicateMemberPlan[] {
    const planned: DuplicateMemberPlan[] = [];
    for (const member of members) {
      const slot = (resource: string | null, version: string | null): DuplicateMemberPlan => ({
        sourceMemberId: member.memberId,
        sourceResource: member.resource,
        role: member.role,
        resource,
        version,
      });
      if (!member.resource) {
        planned.push(slot(null, null));
        continue;
      }
      const current = this.liveResource(member.resource);
      if (!current?.version) {
        planned.push(slot(null, null));
        continue;
      }
      let version = current.version;
      const pin = Object.hasOwn(versions, current.resource.resourceId) ? versions[current.resource.resourceId] : undefined;
      if (pin !== undefined && pin !== version.versionId) {
        const pinned = this.liveResource(current.resource.resourceId, pin);
        if (!pinned?.version) throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
        version = pinned.version;
      }
      const seed = [envelope.commandId, member.memberId, current.resource.resourceId, version.versionId];
      const resourceId = projectId("resource", seed);
      const versionId = projectId("version", seed);
      const [existing] = this.resources.getResources([{ resourceId, versionId }]) as { ok?: boolean }[];
      if (!existing?.ok) {
        const receipt = this.resources.execute({
          commandId: `${envelope.commandId}:copy:${resourceId}`,
          actor: envelope.actor,
          command: {
            type: "resource.copy",
            resourceId,
            payload: { sourceResourceId: current.resource.resourceId, sourceVersionId: version.versionId, versionId, name: current.resource.name },
          },
        }) as { committed?: boolean };
        if (!receipt.committed) throw new ProjectKernelError("PROJECT_CONTENT_UNAVAILABLE");
      }
      planned.push(slot(resourceId, versionId));
    }
    return planned;
  }

  private liveResource(resourceId: string, versionId?: string): { resource: { resourceId: string; name: string; lifecycle: string }; version: { versionId: string; status: string } } | undefined {
    const [read] = this.resources.getResources([{ resourceId, ...(versionId ? { versionId } : {}) }]) as {
      ok?: boolean;
      detail?: { resource: { resourceId: string; name: string; lifecycle: string }; version: { versionId: string; status: string } | null };
    }[];
    const detail = read?.ok ? read.detail : undefined;
    if (!detail?.version || detail.resource.lifecycle !== "active" || detail.version.status !== "ready") return undefined;
    return { resource: detail.resource, version: detail.version };
  }

  private insertDuplicate(envelope: CommandEnvelope, plan: { sourceRevision: number; members: DuplicateMemberPlan[] }, request: string) {
    const db = this.database();
    return db.transaction(() => {
      const replay = this.readDuplicate(envelope.commandId, request);
      if (replay) return replay;
      const { command } = envelope;
      const now = new Date().toISOString();
      const source = this.row(this.id(command.sourceCompositionId));
      const sourceRevision = command.sourceRevision;
      if (typeof sourceRevision === "number" && source.revision !== sourceRevision) {
        const receipt = {
          commandId: envelope.commandId,
          committed: false,
          conflict: { kind: "composition_revision", compositionId: source.compositionId, expectedRevision: sourceRevision, actualRevision: source.revision, resolution: "retry" },
        };
        db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(receipt), now);
        return receipt;
      }
      if (source.lifecycle !== "active") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
      if (source.revision !== plan.sourceRevision) throw new CompositionDuplicateStale();
      const sourceMembers = this.readMembers(source.compositionId) as Member[];
      if (sourceMembers.length !== plan.members.length || sourceMembers.some((member, index) => {
        const planned = plan.members[index];
        return !planned || planned.sourceMemberId !== member.memberId || planned.sourceResource !== member.resource || planned.role !== member.role;
      })) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const compositionId = projectId("composition", envelope.commandId);
      if (db.prepare("SELECT 1 FROM compositions WHERE composition_id=?").get(compositionId)) throw new ProjectKernelError("PROJECT_COMPOSITION_ALREADY_EXISTS");
      const name = this.duplicateName(source.type, source.name);
      let placed: { position: number; renumbered: { compositionId: string; from: number | null; to: number }[] } | undefined;
      if (typeof command.position === "number") {
        this.assertPositionFree(source.type, command.position);
        placed = { position: command.position, renumbered: [] };
      } else if (command.placement !== undefined) {
        placed = this.place(source.type, this.placement(command.placement), envelope.actor, now, "");
      } else if (source.position !== null) {
        placed = this.place(source.type, { after: source.compositionId }, envelope.actor, now, "");
      }
      db.prepare(`INSERT INTO compositions(composition_id,type_id,name,lifecycle,position,revision,created_at,updated_at) VALUES(?,?,?,'active',?,1,?,?)`).run(compositionId, source.type, name, placed?.position ?? null, now, now);
      this.writeAttributes(compositionId, this.readAttributes(source.compositionId));
      const mapped = plan.members.map((member) => ({
        sourceMemberId: member.sourceMemberId,
        sourceResource: member.sourceResource,
        memberId: projectId("member", [envelope.commandId, member.sourceMemberId]),
        resource: member.resource,
        version: member.version,
      }));
      this.writeMembers(compositionId, mapped.map((member, index) => ({ memberId: member.memberId, role: plan.members[index]?.role ?? "", resource: member.resource })));
      const added = mapped.map((member, index) => ({ memberId: member.memberId, role: plan.members[index]?.role ?? "", op: "added" }));
      const summary: Record<string, unknown> = { created: true, ...(added.length ? { members: added } : {}) };
      const receipt = {
        commandId: envelope.commandId,
        committed: true,
        compositionId,
        revision: 1,
        ...(placed ? { position: placed.position, ...(placed.renumbered.length ? { renumbered: placed.renumbered.map((change) => ({ compositionId: change.compositionId, position: change.to })) } : {}) } : {}),
        members: mapped,
      };
      db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(receipt), now);
      this.recordChange(compositionId, 1, envelope.actor, now, summary);
      return receipt;
    }).immediate();
  }

  private journalDuplicate(envelope: CommandEnvelope, request: string, receipt: unknown) {
    const db = this.database();
    return db.transaction(() => {
      const replay = this.readDuplicate(envelope.commandId, request);
      if (replay) return replay;
      db.prepare("INSERT INTO project_composition_commands(command_id,request_json,receipt_json,created_at) VALUES(?,?,?,?)").run(envelope.commandId, request, JSON.stringify(receipt), new Date().toISOString());
      return receipt;
    }).immediate();
  }

  private readDuplicate(commandId: string, request: string) {
    const previous = this.database().prepare("SELECT request_json, receipt_json FROM project_composition_commands WHERE command_id=?").get(commandId) as { request_json: string; receipt_json: string } | undefined;
    if (!previous) return undefined;
    if (previous.request_json !== request) throw new ProjectKernelError("PROJECT_COMMAND_ID_REUSED");
    return JSON.parse(previous.receipt_json) as unknown;
  }

  private duplicateName(typeId: string | null, sourceName: string): string {
    const base = sourceName.trim();
    if (base === "") return "";
    const taken = this.database().prepare("SELECT 1 FROM compositions WHERE type_id IS ? AND name=? AND lifecycle='active'");
    for (let index = 1; index <= 10000; index += 1) {
      const name = `${base}_${index}`;
      if (!taken.get(typeId, name)) return name;
    }
    throw new ProjectQueryError("COMPOSITION_NAME_CONFLICT", "An active Composition already has this type and name", 409);
  }

  private duplicateVersions(value: unknown): Record<string, string> {
    if (value === undefined) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const versions: Record<string, string> = {};
    for (const [resourceId, versionId] of Object.entries(value as Record<string, unknown>)) {
      versions[this.id(resourceId)] = this.id(versionId);
    }
    return versions;
  }

  private id(value: unknown): string {
    if (typeof value !== "string" || !value.trim() || value.includes("\0")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    return value;
  }

  /** 移动只改排序，不抬修订号。显式位置不能挤掉别人；相对安放才会给旁边的项重编号。 */
  private applyMove(envelope: CommandEnvelope, now: string): { commandId: string; committed: boolean; compositionId: string; revision: number; position: number; renumbered?: { compositionId: string; position: number }[] } {
    if (envelope.expectedRevision !== undefined) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const command = envelope.command;
    const allowed = ["type", "compositionId", "position", "placement"];
    if (Object.keys(command).some((key) => !allowed.includes(key))) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const hasPosition = command.position !== undefined;
    const hasPlacement = command.placement !== undefined;
    if (hasPosition === hasPlacement) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const compositionId = this.text(command.compositionId, "PROJECT_INVALID_COMMAND");
    const current = this.row(compositionId);
    if (current.lifecycle !== "active") throw new ProjectKernelError("PROJECT_INVALID_LIFECYCLE");
    let placed: { position: number; renumbered: { compositionId: string; from: number | null; to: number }[] };
    if (hasPosition) {
      const position = command.position;
      if (typeof position !== "number" || !Number.isSafeInteger(position) || position < 0 || position > COMPOSITION_POSITION_MAX) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      this.assertPositionFree(current.type, position, compositionId);
      placed = { position, renumbered: [] };
    } else {
      const placement = this.placement(command.placement);
      this.database().prepare("UPDATE compositions SET position=NULL WHERE composition_id=?").run(compositionId);
      placed = this.place(current.type, placement, envelope.actor, now, compositionId);
    }
    this.writePositions([{ compositionId, to: placed.position }]);
    if (placed.position !== current.position) this.recordChange(compositionId, current.revision, envelope.actor, now);
    return {
      commandId: envelope.commandId,
      committed: true,
      compositionId,
      revision: current.revision,
      position: placed.position,
      ...(placed.renumbered.length ? { renumbered: placed.renumbered.map((change) => ({ compositionId: change.compositionId, position: change.to })) } : {}),
    };
  }

  private placement(value: unknown): { after: string } | { before: string } {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const raw = value as Record<string, unknown>;
    const keys = Object.keys(raw);
    if (keys.length !== 1 || (keys[0] !== "after" && keys[0] !== "before")) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const anchor = raw[keys[0] ?? ""];
    if (typeof anchor !== "string" || !anchor.trim()) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    return keys[0] === "after" ? { after: anchor } : { before: anchor };
  }

  private positionHolder(typeId: string | null, position: number, exceptId = ""): { compositionId: string; name: string } | undefined {
    return this.database().prepare("SELECT composition_id AS compositionId, name FROM compositions WHERE type_id IS ? AND lifecycle='active' AND position=? AND composition_id<>?").get(typeId, position, exceptId) as { compositionId: string; name: string } | undefined;
  }

  private nextFreePosition(typeId: string | null, from: number, exceptId: string): number {
    const taken = new Set((this.database().prepare("SELECT position FROM compositions WHERE type_id IS ? AND lifecycle='active' AND position>=? AND composition_id<>?").all(typeId, from, exceptId) as { position: number }[]).map((row) => row.position));
    let position = from;
    while (taken.has(position)) position += 1;
    if (position > COMPOSITION_POSITION_MAX) throw new ProjectQueryError("COMPOSITION_POSITION_EXHAUSTED", "No positions left in this type", 409);
    return position;
  }

  private assertPositionFree(typeId: string | null, position: number, exceptId = ""): void {
    const holder = this.positionHolder(typeId, position, exceptId);
    if (holder) throw new ProjectQueryError("COMPOSITION_POSITION_CONFLICT", `Position ${position} is already used by ${JSON.stringify(holder.name)} (${holder.compositionId}) in this type. Read the current order and choose a free position, or use placement.`, 409);
  }

  private place(typeId: string | null, placement: { after: string } | { before: string }, actor: string, now: string, movingId: string): { position: number; renumbered: { compositionId: string; from: number | null; to: number }[] } {
    const anchorId = "after" in placement ? placement.after : placement.before;
    const group = this.orderGroup(typeId).filter((item) => item.compositionId !== movingId);
    const anchor = group.findIndex((item) => item.compositionId === anchorId);
    if (anchorId === movingId || anchor === -1) throw new ProjectQueryError("COMPOSITION_PLACEMENT_INVALID", `Placement anchor ${anchorId} is not another active Composition of the same type. Read the current order and choose an anchor of that type.`, 409);
    const insertAt = "after" in placement ? anchor + 1 : anchor;
    const plan = planPlacement(group.map((item) => item.position), insertAt);
    const renumbered = group.flatMap((item, index) => {
      const to = plan.values[index];
      return item.position === to || to === undefined ? [] : [{ compositionId: item.compositionId, from: item.position, to }];
    });
    this.writePositions(renumbered);
    for (const change of renumbered) this.recordChange(change.compositionId, this.row(change.compositionId).revision, actor, now);
    return { position: plan.position, renumbered };
  }

  private orderGroup(typeId: string | null): { compositionId: string; position: number | null }[] {
    return this.database().prepare(`SELECT composition_id AS compositionId, position FROM compositions
      WHERE type_id IS ? AND lifecycle='active'
      ORDER BY (position IS NULL), position, created_at, composition_id`).all(typeId) as { compositionId: string; position: number | null }[];
  }

  private writePositions(changes: { compositionId: string; to: number }[]): void {
    const update = this.database().prepare("UPDATE compositions SET position=? WHERE composition_id=?");
    changes.forEach((change, index) => update.run(-(index + 1), change.compositionId));
    for (const change of changes) update.run(change.to, change.compositionId);
  }

  private applyMemberOperations(compositionId: string, operations: unknown): void {
    if (!Array.isArray(operations)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    const members = this.readMembers(compositionId) as Member[];
    for (const operation of operations) {
      if (!operation || typeof operation !== "object" || Array.isArray(operation)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const op = operation as Record<string, unknown>;
      if ("compositions" in op || "compositionIds" in op) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const member = op.type === "member.add" ? (op.member as Record<string, unknown> | undefined) : op;
      if (member && ("compositions" in member || "compositionIds" in member)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
      const memberId = this.text(op.type === "member.add" ? (op.member as { memberId?: unknown } | undefined)?.memberId : op.memberId, "PROJECT_INVALID_COMMAND");
      const index = members.findIndex((item) => item.memberId === memberId);
      if (op.type === "member.add") {
        if (index !== -1) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_ALREADY_EXISTS");
        const added = op.member as { role?: unknown; resource?: unknown };
        const resource = added.resource === null ? null : this.text(added.resource, "PROJECT_INVALID_COMMAND");
        members.push({ memberId, role: this.text(added.role, "PROJECT_INVALID_COMMAND"), resource });
      } else if (op.type === "member.remove") {
        if (index === -1) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_NOT_FOUND");
        members.splice(index, 1);
      } else if (op.type === "member.update") {
        const target = members[index];
        if (!target) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_NOT_FOUND");
        if (op.resource !== undefined) target.resource = op.resource === null ? null : this.text(op.resource, "PROJECT_INVALID_COMMAND");
        if (op.role !== undefined) target.role = this.text(op.role, "PROJECT_INVALID_COMMAND");
      } else if (op.type === "member.move") {
        if (index === -1) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_NOT_FOUND");
        const [moved] = members.splice(index, 1);
        if (!moved) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_NOT_FOUND");
        if (op.beforeMemberId === null) members.push(moved);
        else {
          const before = members.findIndex((item) => item.memberId === op.beforeMemberId);
          if (before === -1) throw new ProjectKernelError("PROJECT_COMPOSITION_MEMBER_NOT_FOUND");
          members.splice(before, 0, moved);
        }
      } else throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    }
    this.writeMembers(compositionId, members);
  }

  private writeMembers(compositionId: string, members: Member[]): void {
    const db = this.database();
    const isComposition = db.prepare("SELECT 1 FROM compositions WHERE composition_id=?");
    for (const member of members) {
      if (member.resource !== null && isComposition.get(member.resource)) throw new ProjectKernelError("PROJECT_INVALID_COMMAND");
    }
    db.prepare("DELETE FROM composition_members WHERE composition_id=?").run(compositionId);
    const insert = db.prepare("INSERT INTO composition_members(composition_id,member_id,role,resource_id,position) VALUES(?,?,?,?,?)");
    members.forEach((member, position) => insert.run(compositionId, member.memberId, member.role, member.resource, position));
  }
}

function compositionSnapshot(row: CompositionRow, attributes: { key: string; value: string }[]) {
  return {
    id: row.compositionId,
    name: row.name,
    type: row.type,
    lifecycle: row.lifecycle,
    ...(row.position === null ? {} : { position: row.position }),
    updatedAt: Date.parse(row.updatedAt),
    revision: row.revision,
    attributes: Object.fromEntries(attributes.map((item) => [item.key, item.value])),
  };
}

function encodeInnerCursor(order: { by: string; direction: string }, row: CompositionRow, scope: string): string {
  const key = order.by === "position" ? [row.position === null ? 1 : 0, row.position, row.createdAt, row.compositionId] : [order.by === "createdAt" ? row.createdAt : row.updatedAt, row.compositionId];
  return Buffer.from(JSON.stringify([order.by, order.direction, ...key, scope])).toString("base64url");
}

function decodeInnerCursor(cursor: string, order: { by: string; direction: string }, scope: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ProjectQueryError("CURSOR_STALE", "Invalid search cursor", 409);
  }
  const byPosition = order.by === "position";
  if (!Array.isArray(parsed) || parsed.length !== (byPosition ? 7 : 5) || parsed[0] !== order.by || parsed[1] !== order.direction || parsed.at(-1) !== scope) {
    throw new ProjectQueryError("CURSOR_STALE", "Invalid search cursor", 409);
  }
  return parsed.slice(2, -1);
}

function encodeOuterCursor(scope: unknown, position: unknown[]): string {
  return Buffer.from(stableJson({ scope: createHash("sha256").update(stableJson(scope)).digest("hex").slice(0, 15), position })).toString("base64url");
}

function decodeOuterCursor(cursor: string | undefined, scope: unknown, length = 1): unknown[] | undefined {
  if (cursor === undefined) return undefined;
  try {
    if (!cursor || cursor.length > 4096 || !/^[\w-]+$/.test(cursor)) throw new Error("encoding");
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { scope?: string; position?: unknown };
    const fingerprint = createHash("sha256").update(stableJson(scope)).digest("hex").slice(0, 15);
    if (value.scope !== fingerprint || !Array.isArray(value.position) || value.position.length !== length) throw new Error("scope");
    return value.position;
  } catch (error) {
    if (error instanceof ProjectQueryError) throw error;
    throw new ProjectQueryError("CURSOR_STALE", "Invalid search cursor", 409);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
