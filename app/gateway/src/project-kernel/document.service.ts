import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { getCaller } from "../common/request-context.js";
import { applyDocumentPatch, DOCUMENT_LIMITS, type DocumentEdit } from "./document-patch.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { projectId } from "./composition.service.js";
import { ProjectResourceService } from "./resource.service.js";

const FORMATS = ["md", "txt", "htable", "srt", "ass"];
const FIELDS = ["requestId", "draft", "mode", "content", "allowEmpty", "format", "name", "description", "resourceId", "baseVersionId", "baseRevision", "disposition", "edits"];
const TEXT_KIND = 1;

type WriteRequest = {
  requestId: string;
  draft?: boolean;
  mode: "create" | "replace" | "patch";
  content?: string;
  allowEmpty?: boolean;
  format?: string;
  name?: string;
  description?: string;
  resourceId?: string;
  baseVersionId?: string;
  baseRevision?: number;
  disposition?: "adopted" | "candidate";
  edits?: DocumentEdit[];
};

type ResourceRead = {
  ok?: boolean;
  detail?: {
    resource: { name: string; kind: number; metadataRevision: number; lifecycle: string };
    version: { versionId: string; relativePath: string; status: string } | null;
  };
};

/**
 * 本地工作区没有云端登录用户。文档命令按工作区隔离，代理和人仍用调用方身份区分。
 */
@Injectable()
export class ProjectDocumentService {
  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
  ) {}

  write(value: unknown) {
    const workspace = this.scope();
    const request = parseWrite(value);
    const actor = getCaller() === "agent" ? "agent" : "human";
    if (request.draft && actor !== "human") throw new ProjectQueryError("FORBIDDEN", "Draft autosave is human-only", 403);
    const id = createHash("sha256").update(JSON.stringify([workspace, "workspace", request.requestId])).digest("hex");
    const intent = { actor, ...request };
    const previous = this.resources.readDeliveryReceipt(`${id}:result`, intent);
    if (previous) return previous;
    const base = request.mode === "create" ? undefined : this.readVersion(request.resourceId, request.baseVersionId);
    if (request.mode !== "create") {
      const stored = this.resources.documentContentRevision(base?.version.versionId ?? "");
      const revision = stored ?? 1;
      if (stored !== undefined && request.baseRevision === undefined) {
        throw new ProjectQueryError("DOCUMENT_REVISION_REQUIRED", "Read the document and provide its contentRevision as baseRevision before editing.", 409);
      }
      if (request.baseRevision !== undefined && request.baseRevision !== revision) {
        throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "The document changed. Read the latest content and reapply your edits with its contentRevision as baseRevision.", 409, { actualRevision: revision });
      }
    }
    const extension = request.format ?? "md";
    let content = request.content ?? "";
    if (request.mode === "patch") {
      const current = this.readText(base?.version.relativePath ?? "");
      const patched = applyDocumentPatch(current, request.edits ?? []);
      if (!patched.ok) {
        throw new ProjectQueryError("DOCUMENT_PATCH_CONFLICT", "Anchored edits did not apply to the baseVersionId source. Nothing was written; fix the listed edits (nearest shows candidate locations) and send the patch again.", 409, { conflicts: patched.conflicts });
      }
      if (!patched.content.trim()) throw new ProjectQueryError("INVALID_ARGUMENT", 'The patched document would be empty; use mode="replace" with allowEmpty for intentional emptying.');
      const bytes = Buffer.byteLength(patched.content, "utf8");
      if (bytes > DOCUMENT_LIMITS.maxBytes) throw new ProjectQueryError("INVALID_ARGUMENT", `The patched document is ${bytes} UTF-8 bytes; the limit is ${DOCUMENT_LIMITS.maxBytes}`);
      content = patched.content;
    }
    const resourceId = request.mode === "create" ? projectId("resource", ["document", id]) : request.resourceId ?? "";
    const versionId = projectId("version", ["document", id]);
    const relativePath = `store/${versionId}.${extension}`;
    const nextRevision = request.mode === "create" ? 1 : (this.resources.documentContentRevision(base?.version.versionId ?? "") ?? 1) + 1;
    publish(workspace, relativePath, content);
    let name = request.name ?? base?.resource.name ?? "document";
    try {
      if (request.mode === "create") {
        const created = this.resources.execute({
          commandId: `document:${id}:resource`,
          actor,
          command: { type: "resource.create", resourceId, payload: { name, kind: TEXT_KIND, ...(request.description === undefined ? {} : { description: request.description }) } },
        }) as { committed?: boolean; result?: { name?: string } };
        if (!created.committed || !created.result?.name) throw new ProjectQueryError("INVALID_ARGUMENT", "Document resource was not created");
        name = created.result.name;
      }
      const updated = this.resources.execute({
        commandId: `document:${id}:version`,
        actor,
        command: {
          type: "resource.update",
          resourceId,
          payload: {
            kind: "new_version",
            versionId,
            relativePath,
            source: "generate",
            dependencies: [],
            baseVersionId: request.mode === "create" ? null : request.baseVersionId,
            disposition: request.disposition ?? "adopted",
          },
        },
      }) as { committed?: boolean };
      if (!updated.committed) throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "The document changed. Read the latest content and reapply your edits with its contentRevision as baseRevision.", 409);
      this.resources.setDocumentContentRevision(versionId, nextRevision);
      if (request.mode !== "create" && request.name && base) {
        const renamed = this.resources.execute({
          commandId: `document:${id}:rename`,
          actor,
          command: { type: "resource.update", resourceId, payload: { kind: "metadata", expectedMetadataRevision: base.resource.metadataRevision, changes: { name: request.name } } },
        }) as { committed?: boolean; result?: { resource?: { name?: string } } };
        if (!renamed.committed) throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "The document name changed. Read it again before renaming.", 409);
        name = renamed.result?.resource?.name ?? request.name;
      }
    } catch (error) {
      if (!(error instanceof ProjectKernelError) || error.code !== "PROJECT_COMMAND_ID_REUSED") remove(workspace, relativePath);
      throw error;
    }
    const lines = content.replace(/\r?\n$/, "").split(/\r?\n/).length;
    return this.resources.saveDeliveryReceipt(`${id}:result`, intent, {
      requestId: request.requestId,
      resource: { resourceId, versionId, name: request.mode === "create" || request.name ? name : base?.resource.name, kind: "text", lines, contentRevision: nextRevision },
    });
  }

  private scope(): string {
    try {
      this.architecture.assertV3();
    } catch {
      throw new ProjectKernelError("PROJECT_V3_DISABLED");
    }
    if (process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) throw new ProjectKernelError("PROJECT_V3_DISABLED");
    return realpathSync(process.env.WORKSPACE_DIR);
  }

  private readVersion(resourceId: string | undefined, versionId: string | undefined) {
    const [entry] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    if (!entry?.ok || !entry.detail?.version || entry.detail.version.status !== "ready" || entry.detail.resource.kind !== TEXT_KIND || entry.detail.resource.lifecycle === "deleted") {
      throw new ProjectQueryError("NOT_FOUND", "Document Resource is not available", 404);
    }
    return { resource: entry.detail.resource, version: entry.detail.version };
  }

  private readText(relativePath: string): string {
    const workspace = this.scope();
    return readFileSync(path.join(workspace, relativePath), "utf8");
  }
}

function parseWrite(value: unknown): WriteRequest {
  const request = object(value, FIELDS, "document");
  identifier(request.requestId, "requestId");
  if (request.baseRevision !== undefined && (typeof request.baseRevision !== "number" || !Number.isSafeInteger(request.baseRevision) || request.baseRevision < 1)) invalid("baseRevision must be a positive safe integer");
  if (request.mode === "patch") {
    const parsed = object(request, ["requestId", "mode", "edits", "resourceId", "baseVersionId", "baseRevision", "disposition", "name"], "document");
    validateEdits(parsed.edits);
    if (parsed.name !== undefined) identifier(parsed.name, "name");
    identifier(parsed.resourceId, "resourceId");
    identifier(parsed.baseVersionId, "baseVersionId");
    return { ...parsed, mode: "patch", edits: parsed.edits as DocumentEdit[], disposition: disposition(parsed.disposition) } as WriteRequest;
  }
  if (request.allowEmpty !== undefined && typeof request.allowEmpty !== "boolean") invalid("allowEmpty must be a boolean");
  if (typeof request.content !== "string" || (request.allowEmpty !== true && !request.content.trim())) invalid("content must be non-empty text");
  if (request.content.includes("\0")) invalid("content cannot contain NUL");
  const bytes = Buffer.byteLength(request.content, "utf8");
  if (bytes > DOCUMENT_LIMITS.maxBytes) invalid(`content is ${bytes} UTF-8 bytes; the limit is ${DOCUMENT_LIMITS.maxBytes}`);
  if (request.format !== undefined && (typeof request.format !== "string" || !FORMATS.includes(request.format))) invalid(`format must be one of ${FORMATS.join(", ")}`);
  if (request.draft !== undefined && typeof request.draft !== "boolean") invalid("draft must be a boolean");
  if (request.mode === "create") {
    const parsed = object(request, ["requestId", "draft", "mode", "content", "format", "allowEmpty", "name", "description"], "document");
    identifier(parsed.name, "name");
    if (parsed.description !== undefined && (typeof parsed.description !== "string" || parsed.description.length > 2000)) invalid("description is too long");
    return { ...(parsed as WriteRequest), mode: "create" };
  }
  if (request.mode === "replace") {
    const parsed = object(request, ["requestId", "draft", "mode", "content", "format", "allowEmpty", "resourceId", "baseVersionId", "baseRevision", "disposition", "name"], "document");
    if (parsed.name !== undefined) identifier(parsed.name, "name");
    identifier(parsed.resourceId, "resourceId");
    identifier(parsed.baseVersionId, "baseVersionId");
    return { ...(parsed as WriteRequest), mode: "replace", disposition: disposition(parsed.disposition) };
  }
  invalid("mode must be create, replace or patch");
}

function validateEdits(value: unknown): void {
  if (!Array.isArray(value) || !value.length) invalid("edits must be a non-empty array of anchored edits");
  if (value.length > DOCUMENT_LIMITS.maxEdits) invalid(`edits has ${value.length} entries; the limit is ${DOCUMENT_LIMITS.maxEdits}`);
  value.forEach((edit, index) => {
    if (!edit || typeof edit !== "object" || Array.isArray(edit)) invalid(`edits[${index}] must be an object`);
    for (const key of Object.keys(edit)) {
      if (!["exact", "occurrence", "replacement"].includes(key)) throw new ProjectQueryError("UNSUPPORTED_FIELD", `edits[${index}].${key} is not a patch edit field`, 422);
    }
    const item = edit as DocumentEdit;
    if (typeof item.exact !== "string" || !item.exact.length) invalid(`edits[${index}].exact must be non-empty source text`);
    if (item.exact.length > DOCUMENT_LIMITS.maxExact) invalid(`edits[${index}].exact is ${item.exact.length} characters; the limit is ${DOCUMENT_LIMITS.maxExact}`);
    if (item.occurrence !== undefined && (typeof item.occurrence !== "number" || !Number.isInteger(item.occurrence) || item.occurrence < 0)) invalid(`edits[${index}].occurrence must be a non-negative integer`);
    if (typeof item.replacement !== "string") invalid(`edits[${index}].replacement must be a string (empty deletes the anchored text)`);
    if (item.replacement.includes("\0")) invalid(`edits[${index}].replacement cannot contain NUL`);
  });
}

function object(value: unknown, fields: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(label);
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) {
    if (!fields.includes(field)) throw new ProjectQueryError("UNSUPPORTED_FIELD", `${label}.${field} is not supported`, 422);
  }
  return record;
}

function identifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 512) invalid(`${label} must be a non-empty identifier of at most 512 characters`);
}

function disposition(value: unknown): "adopted" | "candidate" | undefined {
  if (value === undefined) return undefined;
  if (value !== "adopted" && value !== "candidate") invalid("disposition");
  return value;
}

function invalid(message: string): never {
  throw new ProjectQueryError("INVALID_ARGUMENT", message);
}

function publish(workspace: string, relativePath: string, content: string): void {
  const absolute = path.join(workspace, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, { flag: "wx", mode: 0o600 });
}

function remove(workspace: string, relativePath: string): void {
  try {
    unlinkSync(path.join(workspace, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
