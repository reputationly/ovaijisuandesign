import { createHash } from "node:crypto";
import { createReadStream, lstatSync, realpathSync } from "node:fs";
import { mkdtemp, open, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";

import { Inject, Injectable } from "@nestjs/common";
import { fileTypeFromStream } from "file-type";
import sharp from "sharp";

import { extractPdfImages, extractText, PdfImagePageOutOfRangeError } from "../asset-preview/document-read.service.js";
import { FfmpegService } from "../edit/ffmpeg.service.js";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { ProjectCompositionService } from "./composition.service.js";
import { projectId } from "./composition.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";

const OPERATIONS: Record<string, string[]> = {
  resource_search: ["text", "kinds", "lifecycle", "createdFrom", "createdTo", "order", "limit", "cursor"],
  resource_get: ["resourceId", "versionId"],
  resource_get_batch: ["resourceIds", "versionIds"],
  resource_versions: ["resourceId", "limit", "cursor"],
  resource_relations: ["relation", "resourceId", "versionId", "limit", "cursor"],
  resource_preview: ["versionId", "mode", "maxEdge", "frames", "range"],
  document_read: ["versionId", "contentRevision", "startLine", "lineCount", "imagePage"],
  composition_search: ["text", "type", "attributes", "lifecycle", "order", "limit", "cursor"],
  composition_type_list: ["text"],
  composition_get: ["compositionId", "compositionIds", "view", "memberId", "role", "resolveResources", "limit", "cursor"],
};
const BATCH_LIMIT = 20;

@Injectable()
export class ProjectQueryService {
  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectCompositionService) private readonly compositions: ProjectCompositionService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  writeComposition(body: unknown, toolUseId?: string) {
    this.ready();
    const input = compositionCommand(body);
    const commandId = `composition_${createHash("sha256").update(`${toolUseId ?? stable(input)}\0${input.action}`).digest("hex").slice(0, 32)}`;
    if (input.action === "ensure") {
      const members = input.operations ? memberOperations(commandId, input.operations) : undefined;
      try {
        const receipt = this.compositions.ensureAgent(commandId, {
          ...(input.typeId ? { typeId: input.typeId } : {}),
          ...(input.label ? { label: input.label } : {}),
          ...(input.description ? { description: input.description } : {}),
          name: input.name ?? "",
          ...(input.attributes ? { attributes: input.attributes } : {}),
          ...(members ? { operations: members.operations } : {}),
          ...(input.position !== undefined ? { position: input.position } : {}),
          ...(input.placement ? { placement: input.placement } : {}),
        }) as { typeId: string; compositionId: string; revision: number; created: boolean; position?: number };
        return { ...receipt, ...(members && Object.keys(members.memberIds).length ? { memberIds: members.memberIds } : {}) };
      } catch (error) {
        if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") throw new ProjectQueryError("PROJECT_COMMAND_ID_REUSED", "Command ID was already used with a different request", 409);
        throw error;
      }
    }
    const envelope = agentEnvelope(commandId, input);
    const receipt = this.compositions.execute(envelope) as { committed?: boolean; compositionId?: string; revision?: number; position?: number; conflict?: { compositionId: string; expectedRevision: number; actualRevision: number }; members?: { sourceMemberId: string; memberId: string }[] };
    if (!receipt.committed) {
      const conflict = receipt.conflict;
      throw new ProjectQueryError("COMPOSITION_REVISION_CONFLICT", `Composition ${conflict?.compositionId} is at revision ${conflict?.actualRevision}, not ${conflict?.expectedRevision}. Read it again and decide; do not retry blindly.`, 409);
    }
    return {
      compositionId: receipt.compositionId,
      revision: receipt.revision,
      ...(receipt.position === undefined ? {} : { position: receipt.position }),
      ...(receipt.members?.length ? { memberIds: Object.fromEntries(receipt.members.map((member) => [member.sourceMemberId, member.memberId])) } : {}),
    };
  }

  query(operation: string, value: unknown) {
    this.ready();
    if (!OPERATIONS[operation]) throw new ProjectQueryError("UNSUPPORTED_QUERY", "Unknown project query", 422);
    const input = record(value, OPERATIONS[operation] ?? []);
    if (operation === "resource_get") return this.resources.queryResource(oneSelector(input));
    if (operation === "resource_get_batch") return this.resources.queryResources(batchSelectors(input));
    if (operation === "resource_search") return this.resources.querySearch(searchQuery(input));
    if (operation === "resource_relations") return this.relations(input);
    if (operation === "resource_versions") {
      requireIdentifier(input.resourceId, "resourceId");
      return this.resources.queryVersions({ resourceId: input.resourceId as string, ...page(input) });
    }
    if (operation === "composition_search") return this.compositions.querySearch(compositionSearch(input));
    if (operation === "document_read") return this.documentRead(documentQuery(input));
    if (operation === "resource_preview") return this.preview(previewQuery(input));
    if (operation === "composition_type_list") return { items: this.typeItems(input.text) };
    if (operation === "composition_get") return input.compositionIds !== undefined ? this.compositionBatch(input) : this.composition(input);
    throw new ProjectQueryError("UNSUPPORTED_QUERY", `Project query ${operation} is not available`, 422);
  }

  private async documentRead(query: { versionId: string; contentRevision?: number; startLine?: number; lineCount?: number; imagePage?: number }) {
    const detail = this.resources.queryResource({ versionId: query.versionId });
    const version = detail.version;
    if (!version || version.status !== "ready" || !version.relativePath) throw new ProjectQueryError("NOT_FOUND", "Resource content is unavailable", 404);
    const revision = version.contentRevision ?? 1;
    if (query.contentRevision !== undefined && query.contentRevision !== revision) {
      throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "The document changed while paging. Read again from the first page.", 409);
    }
    const binary = binaryFormat(version.relativePath, detail.resource.name);
    if (detail.resource.kind !== "text" && !binary) throw new ProjectQueryError("UNSUPPORTED_MEDIA", "document_read reads text and Word/PDF Resources only; inspect media with resource_preview", 422);
    if (query.imagePage !== undefined && binary !== "pdf") throw new ProjectQueryError("UNSUPPORTED_QUERY", "imagePage reads embedded images of PDF Resources only", 422);
    const workspace = realpathSync(process.env.WORKSPACE_DIR ?? "");
    assertStored(workspace, version.relativePath);
    const file = path.join(workspace, version.relativePath);
    const sizeBytes = (await stat(file)).size;
    const startLine = query.startLine ?? 1;
    const limit = query.lineCount ?? 500;
    const parsed = binary ? await extractText(file, binary === "pdf" ? ".pdf" : ".docx") : undefined;
    const extracted = parsed === undefined ? undefined : parsed.length === 0 ? [] : parsed.split(/\r?\n/);
    const selected: string[] = [];
    let totalLines = 0;
    let characters = 0;
    let truncated = false;
    const stream = extracted ? undefined : createReadStream(file, { encoding: "utf8" });
    const reader = stream ? createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY }) : undefined;
    try {
      for await (const line of reader ?? extracted ?? []) {
        totalLines += 1;
        if (totalLines < startLine || truncated || selected.length >= limit) continue;
        const cost = line.length + (selected.length > 0 ? 1 : 0);
        if (characters + cost <= 64_000) {
          selected.push(line);
          characters += cost;
          continue;
        }
        truncated = true;
        if (selected.length === 0) {
          const cut = line.length > 2000 ? `${line.slice(0, 2000)}... (line truncated to 2000 chars)` : line;
          selected.push(cut);
          characters += cut.length;
        }
      }
    } finally {
      reader?.close();
      stream?.destroy();
    }
    if (totalLines > 0 && startLine > totalLines) throw new ProjectQueryError("INVALID_ARGUMENT", `startLine ${startLine} is past the end of this document (${totalLines} lines)`);
    const images = query.imagePage === undefined ? undefined : await extractPdfImages(file, query.imagePage).catch((error: unknown) => {
      if (error instanceof PdfImagePageOutOfRangeError) throw new ProjectQueryError("INVALID_ARGUMENT", error.message);
      throw new ProjectQueryError("UNSUPPORTED_MEDIA", "PDF image extraction failed", 422);
    });
    return {
      versionId: version.id,
      ...(version.contentRevision === undefined ? {} : { contentRevision: version.contentRevision }),
      resourceId: detail.resource.id,
      name: detail.resource.name,
      media: { mimeType: path.extname(version.relativePath).toLowerCase() === ".md" ? "text/markdown" : "text/plain", sizeBytes },
      text: selected.join("\n"),
      startLine,
      lineCount: selected.length,
      totalLines,
      more: startLine - 1 + selected.length < totalLines,
      truncated,
      ...(images ?? {}),
    };
  }

  private async preview(query: PreviewQuery) {
    const detail = this.resources.queryResource({ versionId: query.versionId });
    const version = detail.version;
    if (!version || version.status !== "ready" || !version.relativePath) throw new ProjectQueryError("NOT_FOUND", "Resource content is unavailable", 404);
    const workspace = realpathSync(process.env.WORKSPACE_DIR ?? "");
    assertStored(workspace, version.relativePath);
    const file = path.join(workspace, version.relativePath);
    const sizeBytes = (await stat(file)).size;
    const kind = detail.resource.kind;
    const document = kind === "file" ? binaryFormat(version.relativePath, detail.resource.name) : undefined;
    if (document) {
      const media = { mimeType: document === "pdf" ? "application/pdf" : document === "doc" ? "application/msword" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes };
      if (query.mode !== "content") return { versionId: version.id, kind, media, range: null, truncated: false, reason: null };
      if (query.frames !== undefined || query.maxEdge !== undefined || query.range?.startSeconds !== undefined || query.range?.endSeconds !== undefined) {
        throw new ProjectQueryError("UNSUPPORTED_QUERY", "Document previews use line ranges", 422);
      }
      const read = await this.documentRead({ versionId: version.id, startLine: query.range?.startLine ?? 1, lineCount: query.range?.lineCount ?? 200 });
      const truncated = read.more || read.truncated || read.text.length > 16_000;
      return { versionId: version.id, kind, media, content: [{ type: "text", text: read.text.slice(0, 16_000) }], range: { startLine: read.startLine, lineCount: read.lineCount }, truncated, reason: truncated ? "text_budget" : null };
    }
    if (kind === "file") return { versionId: version.id, kind, media: { mimeType: "application/octet-stream", sizeBytes }, range: null, truncated: false, reason: query.mode === "content" ? "unsupported_preview" : null };
    const detected = kind === "text" ? { mime: "text/plain" } : await sniffFile(file);
    if (!detected || (kind !== "text" && !detected.mime.startsWith(`${kind}/`))) throw new ProjectQueryError("UNSUPPORTED_MEDIA", "Unsupported or invalid media content", 422);
    const media: { mimeType: string; sizeBytes: number; width?: number; height?: number; durationSeconds?: number } = { mimeType: detected.mime, sizeBytes };
    const result: PreviewResult = { versionId: version.id, kind, media, range: null, truncated: false, reason: null };
    if (kind === "image") {
      const metadata = await sharp(file, { limitInputPixels: 100_000_000 }).metadata();
      if (metadata.width) media.width = metadata.width;
      if (metadata.height) media.height = metadata.height;
    } else if (kind === "video" || kind === "audio") {
      const probed = await this.ffmpeg.probeMedia(file);
      if (probed.width > 0) media.width = probed.width;
      if (probed.height > 0) media.height = probed.height;
      if (probed.duration > 0) media.durationSeconds = probed.duration;
    }
    if (query.mode !== "content") return result;
    if (kind === "text") {
      if (query.frames !== undefined || query.maxEdge !== undefined || query.range?.startSeconds !== undefined || query.range?.endSeconds !== undefined) throw new ProjectQueryError("UNSUPPORTED_QUERY", "Text previews use line ranges", 422);
      const handle = await open(file, "r");
      const buffer = Buffer.alloc(Math.min(sizeBytes, 2 * 1024 * 1024));
      let bytesRead = 0;
      try {
        ({ bytesRead } = await handle.read(buffer, 0, buffer.length, 0));
      } finally {
        await handle.close();
      }
      const lines = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/);
      const startLine = query.range?.startLine ?? 1;
      const lineCount = query.range?.lineCount ?? 200;
      const selected = lines.slice(startLine - 1, startLine - 1 + lineCount).join("\n");
      result.content = [{ type: "text", text: selected.slice(0, 16_000) }];
      result.range = { startLine, lineCount: Math.min(lineCount, Math.max(0, lines.length - startLine + 1)) };
      result.truncated = sizeBytes > bytesRead || selected.length > 16_000 || lines.length >= startLine + lineCount;
      result.reason = result.truncated ? "text_budget" : null;
      return result;
    }
    if (kind === "image") {
      if (query.range !== undefined || query.frames !== undefined) throw new ProjectQueryError("UNSUPPORTED_QUERY", "Image previews do not accept time or line ranges", 422);
      const edge = query.maxEdge ?? 1024;
      const buffer = await sharp(file, { limitInputPixels: 100_000_000 }).rotate().resize(edge, edge, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      if (buffer.length > 4 * 1024 * 1024) throw new ProjectQueryError("UNSUPPORTED_MEDIA", "Image preview exceeds its byte budget", 422);
      result.content = [{ type: "image", mimeType: "image/jpeg", data: buffer.toString("base64") }];
      result.truncated = (media.width ?? 0) > edge || (media.height ?? 0) > edge;
      result.reason = result.truncated ? "image_resized" : null;
      return result;
    }
    const startSeconds = query.range?.startSeconds ?? 0;
    const requestedEnd = query.range?.endSeconds ?? startSeconds + 30;
    const endSeconds = Math.min(requestedEnd, startSeconds + 60, media.durationSeconds ?? Number.POSITIVE_INFINITY);
    if (endSeconds <= startSeconds) throw new ProjectQueryError("INVALID_ARGUMENT", "Preview range is outside the media");
    if (query.range?.startLine !== undefined || query.range?.lineCount !== undefined || (kind === "audio" && (query.frames !== undefined || query.maxEdge !== undefined))) {
      throw new ProjectQueryError("UNSUPPORTED_QUERY", "Incompatible media preview options", 422);
    }
    const temporary = await mkdtemp(path.join(tmpdir(), "project-preview-"));
    try {
      const content: { type: string; mimeType: string; data: string; atSeconds?: number }[] = [];
      if (kind === "audio") {
        const output = path.join(temporary, "preview.mp3");
        await this.ffmpeg.exec(["-v", "error", "-ss", String(startSeconds), "-i", file, "-t", String(endSeconds - startSeconds), "-vn", "-ac", "1", "-ar", "24000", "-b:a", "64k", "-y", output], { timeoutMs: 20_000 });
        const data = await readFile(output);
        if (data.length >= 4 * 1024 * 1024) throw new ProjectQueryError("UNSUPPORTED_MEDIA", "Audio preview exceeds its byte budget", 422);
        content.push({ type: "audio", mimeType: "audio/mpeg", data: data.toString("base64") });
      } else {
        const frames = query.frames ?? 4;
        const edge = query.maxEdge ?? 1024;
        let totalBytes = 0;
        for (let index = 0; index < frames; index += 1) {
          const atSeconds = startSeconds + ((endSeconds - startSeconds) * index) / frames;
          const output = path.join(temporary, `${index}.jpg`);
          await this.ffmpeg.exec(["-v", "error", "-ss", String(atSeconds), "-i", file, "-frames:v", "1", "-vf", `scale=${edge}:${edge}:force_original_aspect_ratio=decrease`, "-q:v", "3", "-y", output], { timeoutMs: 20_000 });
          const buffer = await readFile(output);
          totalBytes += buffer.length;
          if (totalBytes > 4 * 1024 * 1024) throw new ProjectQueryError("UNSUPPORTED_MEDIA", "Video preview exceeds its byte budget", 422);
          content.push({ type: "image", mimeType: "image/jpeg", data: buffer.toString("base64"), atSeconds });
        }
      }
      return { ...result, content, range: { startSeconds, endSeconds }, truncated: kind === "video" || startSeconds > 0 || media.durationSeconds === undefined || endSeconds < media.durationSeconds, reason: kind === "video" ? "sampled_frames" : null };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }

  private relations(input: Record<string, unknown>) {
    const relation = input.relation;
    if (relation !== "inputs" && relation !== "derivatives" && relation !== "compositions") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid relation");
    const idName = relation === "compositions" ? "resourceId" : "versionId";
    requireIdentifier(input[idName], idName);
    if (input[relation === "compositions" ? "versionId" : "resourceId"] !== undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "Relation has an incompatible identifier");
    const paging = page(input);
    if (relation === "compositions") {
      this.resources.queryResource({ resourceId: input.resourceId as string });
      const limit = paging.limit ?? 100;
      return this.compositions.queryMemberships({ resourceId: input.resourceId as string, limit, ...(paging.cursor ? { cursor: paging.cursor } : {}) });
    }
    return this.resources.queryRelations({ relation, versionId: input.versionId as string, ...paging });
  }

  private ready(): void {
    try {
      this.architecture.assertV3();
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") throw new ProjectQueryError("PROJECT_V3_DISABLED", "Project V3 is not enabled for this workspace", 403);
      throw new ProjectQueryError("PROJECT_ARCHITECTURE_UNSUPPORTED", "Workspace project architecture does not support composition operations", 503);
    }
  }

  private typeItems(text: unknown) {
    if (text !== undefined && typeof text !== "string") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid text");
    const rows = this.compositions.listTypes(text === undefined ? {} : { text }) as { typeId: string; label: string; description?: string | null }[];
    return rows.map(({ typeId, label, description }) => ({ id: typeId, label, ...(description ? { description } : {}) }));
  }

  private composition(input: Record<string, unknown>) {
    requireIdentifier(input.compositionId, "compositionId");
    const view = input.view ?? "summary";
    if (view !== "summary" && view !== "members") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid view");
    let detail: ReturnType<ProjectCompositionService["get"]>;
    try {
      detail = this.compositions.get(input.compositionId as string);
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMPOSITION_NOT_FOUND") throw new ProjectQueryError("NOT_FOUND", "Composition not found", 404);
      throw error;
    }
    const base = compositionSnapshot(detail);
    if (view === "summary") return base;
    const limit = page(input).limit ?? 20;
    const members = (detail.members as { memberId: string; role: string; resource: string | null }[]).filter((member) => (!input.memberId || member.memberId === input.memberId) && (!input.role || member.role === input.role));
    return {
      ...base,
      items: members.slice(0, limit).map((member) => ({
        id: member.memberId,
        role: member.role,
        resource: member.resource === null ? null : input.resolveResources ? this.resolved(member.resource) : { resourceId: member.resource },
      })),
      nextCursor: members.length > limit ? memberCursor(detail.compositionId, limit) : null,
      coverage: { status: "complete", reasons: [] },
    };
  }

  private compositionBatch(input: Record<string, unknown>) {
    if (!Array.isArray(input.compositionIds) || !input.compositionIds.length || input.compositionIds.length > BATCH_LIMIT) throw new ProjectQueryError("INVALID_ARGUMENT", `Provide 1 to ${BATCH_LIMIT} compositionIds`);
    return {
      items: input.compositionIds.map((id) => {
        try {
          requireIdentifier(id, "compositionId");
          return this.composition({ compositionId: id, view: input.view ?? "summary" });
        } catch (error) {
          if (!(error instanceof ProjectQueryError) || error.code !== "NOT_FOUND") throw error;
          return { compositionId: id, error: { code: error.code, message: error.message } };
        }
      }),
    };
  }

  private resolved(resourceId: string) {
    try {
      const detail = this.resources.queryResource({ resourceId });
      const available = detail.resource.lifecycle === "active" && detail.version?.status === "ready";
      return { resourceId, resource: detail.resource, availability: available ? "available" : "unavailable" };
    } catch (error) {
      if (!(error instanceof ProjectQueryError) || error.code !== "NOT_FOUND") throw error;
      return { resourceId, availability: "missing" };
    }
  }
}

type AgentCommand = {
  action: "ensure" | "update" | "rename" | "set_attributes" | "move" | "duplicate";
  typeId?: string;
  label?: string;
  name?: string;
  description?: string;
  attributes?: Record<string, string>;
  unset?: string[];
  operations?: { action: string; memberId?: string; role?: string; resourceId?: string | null; clientMemberKey?: string }[];
  compositionId?: string;
  expectedRevision?: number;
  position?: number;
  placement?: { after: string } | { before: string };
};

function compositionCommand(body: unknown): AgentCommand {
  const input = record(body, ["action", "typeId", "label", "name", "description", "attributes", "operations", "position", "placement", "compositionId", "expectedRevision", "unset"]);
  const action = input.action;
  if (action !== "ensure" && action !== "update" && action !== "rename" && action !== "set_attributes" && action !== "move" && action !== "duplicate") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid action");
  const allowed = action === "ensure" ? ["action", "typeId", "label", "name", "description", "attributes", "operations", "position", "placement"] : action === "move" ? ["action", "compositionId", "position", "placement"] : action === "duplicate" ? ["action", "compositionId", "expectedRevision", "position", "placement"] : action === "rename" ? ["action", "compositionId", "expectedRevision", "name"] : action === "set_attributes" ? ["action", "compositionId", "expectedRevision", "attributes", "unset"] : ["action", "compositionId", "expectedRevision", "operations"];
  record(body, allowed);
  if (action === "ensure") {
    if (input.typeId !== undefined) requireIdentifier(input.typeId, "typeId");
    else requireIdentifier(input.label, "label");
    requireIdentifier(input.name, "name");
  } else requireIdentifier(input.compositionId, "compositionId");
  if (action === "move" && ((input.position === undefined) === (input.placement === undefined))) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid order");
  if ((action === "rename" || action === "set_attributes" || action === "update") && (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0)) throw new ProjectQueryError("INVALID_ARGUMENT", "expectedRevision must be an integer from 0 to " + Number.MAX_SAFE_INTEGER);
  if (action === "rename") requireIdentifier(input.name, "name");
  return input as AgentCommand;
}

function memberOperations(commandId: string, operations: AgentCommand["operations"]) {
  const memberIds: Record<string, string> = {};
  const translated = (operations ?? []).map((operation) => {
    if (operation.action === "remove_member") return { type: "member.remove", memberId: operation.memberId };
    if (operation.action === "update_member") return { type: "member.update", memberId: operation.memberId, ...(operation.role !== undefined ? { role: operation.role } : {}), ...(operation.resourceId !== undefined ? { resource: operation.resourceId } : {}) };
    const memberId = projectId("member", [commandId, operation.clientMemberKey]);
    memberIds[operation.clientMemberKey ?? ""] = memberId;
    return { type: "member.add", member: { memberId, role: operation.role, resource: operation.resourceId ?? null } };
  });
  return { memberIds, operations: translated };
}

function agentEnvelope(commandId: string, input: AgentCommand) {
  if (input.action === "move") {
    return { commandId, actor: "agent" as const, command: { type: "composition.move", compositionId: input.compositionId, ...(input.position !== undefined ? { position: input.position } : { placement: input.placement }) } };
  }
  if (input.action === "duplicate") {
    return { commandId, actor: "agent" as const, command: { type: "composition.duplicate", sourceCompositionId: input.compositionId, ...(input.expectedRevision !== undefined ? { sourceRevision: input.expectedRevision } : {}), ...(input.position !== undefined ? { position: input.position } : {}), ...(input.placement ? { placement: input.placement } : {}) } };
  }
  if (input.action === "rename") return { commandId, actor: "agent" as const, expectedRevision: input.expectedRevision, command: { type: "composition.rename", compositionId: input.compositionId, name: input.name } };
  if (input.action === "set_attributes") {
    return { commandId, actor: "agent" as const, expectedRevision: input.expectedRevision, command: { type: "composition.set_attributes", compositionId: input.compositionId, ...(input.attributes ? { set: Object.entries(input.attributes).map(([key, value]) => ({ key, value })) } : {}), ...(input.unset ? { unset: input.unset } : {}) } };
  }
  const members = memberOperations(commandId, input.operations);
  return { commandId, actor: "agent" as const, expectedRevision: input.expectedRevision, command: { type: "composition.apply", compositionId: input.compositionId, operations: members.operations } };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function record(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectQueryError("INVALID_ARGUMENT", "Expected an object");
  const data = value as Record<string, unknown>;
  const unsupported = Object.keys(data).find((key) => !allowed.includes(key));
  if (unsupported) throw new ProjectQueryError("UNSUPPORTED_FIELD", `Unsupported field: ${unsupported}`, 422);
  return data;
}

function oneSelector(input: Record<string, unknown>): { resourceId?: string; versionId?: string } {
  if (Number(input.resourceId !== undefined) + Number(input.versionId !== undefined) !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Provide exactly one of resourceId and versionId");
  if (input.resourceId !== undefined) requireIdentifier(input.resourceId, "resourceId");
  if (input.versionId !== undefined) requireIdentifier(input.versionId, "versionId");
  return { ...(typeof input.resourceId === "string" ? { resourceId: input.resourceId } : {}), ...(typeof input.versionId === "string" ? { versionId: input.versionId } : {}) };
}

function batchSelectors(input: Record<string, unknown>): { resourceIds?: string[]; versionIds?: string[] } {
  if (Number(input.resourceIds !== undefined) + Number(input.versionIds !== undefined) !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Provide exactly one of resourceIds and versionIds");
  const key = input.resourceIds !== undefined ? "resourceId" : "versionId";
  const ids = input[`${key}s`];
  if (!Array.isArray(ids) || !ids.length || ids.length > BATCH_LIMIT) throw new ProjectQueryError("INVALID_ARGUMENT", `Provide 1 to ${BATCH_LIMIT} ${key}s`);
  for (const id of ids) requireIdentifier(id, key);
  if (new Set(ids).size !== ids.length) throw new ProjectQueryError("INVALID_ARGUMENT", `Duplicate ${key}`);
  return key === "resourceId" ? { resourceIds: ids as string[] } : { versionIds: ids as string[] };
}

function page(input: Record<string, unknown>): { limit?: number; cursor?: string } {
  if (input.limit !== undefined && (!Number.isSafeInteger(input.limit) || (input.limit as number) < 1 || (input.limit as number) > 50)) throw new ProjectQueryError("INVALID_ARGUMENT", "limit must be 1–50");
  if (input.cursor !== undefined && (typeof input.cursor !== "string" || !input.cursor.length || input.cursor.length > 4096)) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid cursor");
  return { ...(typeof input.limit === "number" ? { limit: input.limit } : {}), ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}) };
}

function requireIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 512) {
    throw new ProjectQueryError("INVALID_ARGUMENT", `${label} must be a non-empty identifier of at most 512 characters`);
  }
}

function compositionSnapshot(value: { compositionId: string; name: string; lifecycle: string; position: number | null; revision: number; updatedAt: string; type: { typeId?: string } | null; attributes: unknown }) {
  const attributes = Array.isArray(value.attributes) ? Object.fromEntries((value.attributes as { key: string; value: string }[]).map((item) => [item.key, item.value])) : {};
  return {
    id: value.compositionId,
    name: value.name,
    type: value.type?.typeId ?? null,
    lifecycle: value.lifecycle,
    ...(value.position === null ? {} : { position: value.position }),
    updatedAt: Date.parse(value.updatedAt),
    revision: value.revision,
    attributes,
  };
}

type PreviewQuery = { versionId: string; mode?: "metadata" | "content"; maxEdge?: number; frames?: number; range?: { startSeconds?: number; endSeconds?: number; startLine?: number; lineCount?: number } };
type PreviewResult = { versionId: string; kind: string; media: { mimeType: string; sizeBytes: number; width?: number; height?: number; durationSeconds?: number }; range: unknown; truncated: boolean; reason: string | null; content?: unknown[] };

function previewQuery(input: Record<string, unknown>): PreviewQuery {
  requireIdentifier(input.versionId, "versionId");
  if (input.mode !== undefined && input.mode !== "metadata" && input.mode !== "content") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid mode");
  if (input.maxEdge !== undefined && (typeof input.maxEdge !== "number" || !Number.isInteger(input.maxEdge) || input.maxEdge < 256 || input.maxEdge > 2048)) throw new ProjectQueryError("INVALID_ARGUMENT", "maxEdge must be an integer from 256 to 2048");
  if (input.frames !== undefined && (typeof input.frames !== "number" || !Number.isInteger(input.frames) || input.frames < 1 || input.frames > 8)) throw new ProjectQueryError("INVALID_ARGUMENT", "frames must be an integer from 1 to 8");
  let range: PreviewQuery["range"];
  if (input.range !== undefined) {
    const raw = record(input.range, ["startSeconds", "endSeconds", "startLine", "lineCount"]);
    for (const key of ["startSeconds", "endSeconds"] as const) {
      const value = raw[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${key}`);
    }
    if (raw.startLine !== undefined && (typeof raw.startLine !== "number" || !Number.isInteger(raw.startLine) || raw.startLine < 1)) throw new ProjectQueryError("INVALID_ARGUMENT", "startLine must be an integer from 1 to " + Number.MAX_SAFE_INTEGER);
    if (raw.lineCount !== undefined && (typeof raw.lineCount !== "number" || !Number.isInteger(raw.lineCount) || raw.lineCount < 1 || raw.lineCount > 200)) throw new ProjectQueryError("INVALID_ARGUMENT", "lineCount must be an integer from 1 to 200");
    if ((raw.startLine !== undefined || raw.lineCount !== undefined) && (raw.startSeconds !== undefined || raw.endSeconds !== undefined)) throw new ProjectQueryError("INVALID_ARGUMENT", "Cannot mix text and temporal ranges");
    range = {
      ...(typeof raw.startSeconds === "number" ? { startSeconds: raw.startSeconds } : {}),
      ...(typeof raw.endSeconds === "number" ? { endSeconds: raw.endSeconds } : {}),
      ...(typeof raw.startLine === "number" ? { startLine: raw.startLine } : {}),
      ...(typeof raw.lineCount === "number" ? { lineCount: raw.lineCount } : {}),
    };
  }
  return {
    versionId: input.versionId as string,
    ...(input.mode === "metadata" || input.mode === "content" ? { mode: input.mode } : {}),
    ...(typeof input.maxEdge === "number" ? { maxEdge: input.maxEdge } : {}),
    ...(typeof input.frames === "number" ? { frames: input.frames } : {}),
    ...(range ? { range } : {}),
  };
}

async function sniffFile(file: string): Promise<{ mime: string } | undefined> {
  const handle = await open(file, "r");
  try {
    if (!(await handle.stat()).isFile()) return undefined;
    const found = await fileTypeFromStream(Readable.toWeb(handle.createReadStream({ autoClose: false })));
    return found ? { mime: found.mime } : undefined;
  } finally {
    await handle.close();
  }
}

function documentQuery(input: Record<string, unknown>): { versionId: string; contentRevision?: number; startLine?: number; lineCount?: number; imagePage?: number } {
  requireIdentifier(input.versionId, "versionId");
  for (const [key, min, max] of [["contentRevision", 1, Number.MAX_SAFE_INTEGER], ["startLine", 1, Number.MAX_SAFE_INTEGER], ["lineCount", 1, 2000], ["imagePage", 1, Number.MAX_SAFE_INTEGER]] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new ProjectQueryError("INVALID_ARGUMENT", `${key} must be an integer from ${min} to ${max}`);
  }
  return {
    versionId: input.versionId as string,
    ...(typeof input.contentRevision === "number" ? { contentRevision: input.contentRevision } : {}),
    ...(typeof input.startLine === "number" ? { startLine: input.startLine } : {}),
    ...(typeof input.lineCount === "number" ? { lineCount: input.lineCount } : {}),
    ...(typeof input.imagePage === "number" ? { imagePage: input.imagePage } : {}),
  };
}

function binaryFormat(relativePath: string, name: string): "doc" | "docx" | "pdf" | undefined {
  const source = relativePath.split("/").pop() || name;
  const extension = /\.(docx?|pdf)$/i.exec(source)?.[1]?.toLowerCase();
  return extension === "doc" || extension === "docx" || extension === "pdf" ? extension : undefined;
}

function assertStored(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") throw new ProjectQueryError("NOT_FOUND", "Resource file is not available", 404);
  let current = workspace;
  try {
    for (const part of relativePath.split("/")) {
      current = path.join(current, part);
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error("link");
    }
  } catch {
    throw new ProjectQueryError("NOT_FOUND", "Resource file is not available", 404);
  }
}

const COMPOSITION_LIFECYCLE = ["active", "deleted"];
const COMPOSITION_ORDER = ["createdAt", "updatedAt", "position"];

function compositionSearch(input: Record<string, unknown>) {
  if (input.text !== undefined && (typeof input.text !== "string" || input.text.length > 2000)) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid text");
  if (input.type !== undefined && input.type !== null) requireIdentifier(input.type, "type");
  if (input.lifecycle !== undefined) stringSet(input.lifecycle, COMPOSITION_LIFECYCLE, "lifecycle");
  if (input.attributes !== undefined) {
    const attributes = record(input.attributes, Object.keys(input.attributes as object));
    if (Object.keys(attributes).length > 50) throw new ProjectQueryError("INVALID_ARGUMENT", "Maximum 50 attributes");
    for (const [key, value] of Object.entries(attributes)) {
      requireIdentifier(key, "attribute name");
      if (typeof value !== "string" || value.length > 2000) throw new ProjectQueryError("INVALID_ARGUMENT", "Attribute values must be strings up to 2000 characters");
    }
  }
  let order: { by: "createdAt" | "updatedAt" | "position"; direction: "asc" | "desc" } | undefined;
  if (input.order !== undefined) {
    const raw = record(input.order, ["by", "direction"]);
    if (!COMPOSITION_ORDER.includes(String(raw.by))) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid order.by");
    if (raw.direction !== "asc" && raw.direction !== "desc") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid order.direction");
    order = { by: raw.by as "createdAt" | "updatedAt" | "position", direction: raw.direction };
  }
  return {
    ...(typeof input.text === "string" ? { text: input.text } : {}),
    ...(input.type === null || typeof input.type === "string" ? { type: input.type as string | null } : {}),
    ...(input.attributes && typeof input.attributes === "object" ? { attributes: input.attributes as Record<string, string> } : {}),
    ...(Array.isArray(input.lifecycle) ? { lifecycle: input.lifecycle as string[] } : {}),
    ...(order ? { order } : {}),
    ...page(input),
  };
}

const SEARCH_KINDS = ["text", "image", "video", "audio", "file"];
const SEARCH_LIFECYCLE = ["active", "missing", "deleted"];

function searchQuery(input: Record<string, unknown>): { text?: string; kinds?: string[]; lifecycle?: string[]; createdFrom?: number; createdTo?: number; order?: { by: "createdAt" | "updatedAt"; direction: "asc" | "desc" }; limit?: number; cursor?: string } {
  if (input.text !== undefined && (typeof input.text !== "string" || input.text.length > 2000)) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid text");
  if (input.kinds !== undefined) stringSet(input.kinds, SEARCH_KINDS, "kinds");
  if (input.lifecycle !== undefined) stringSet(input.lifecycle, SEARCH_LIFECYCLE, "lifecycle");
  for (const key of ["createdFrom", "createdTo"] as const) {
    const value = input[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || (value as number) < 0)) throw new ProjectQueryError("INVALID_ARGUMENT", `${key} must be an integer from 0 to ${Number.MAX_SAFE_INTEGER}`);
  }
  if (typeof input.createdFrom === "number" && typeof input.createdTo === "number" && input.createdTo <= input.createdFrom) throw new ProjectQueryError("INVALID_ARGUMENT", "createdTo must be after createdFrom");
  let order: { by: "createdAt" | "updatedAt"; direction: "asc" | "desc" } | undefined;
  if (input.order !== undefined) {
    const raw = record(input.order, ["by", "direction"]);
    if (raw.by !== "createdAt" && raw.by !== "updatedAt") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid order.by");
    if (raw.direction !== "asc" && raw.direction !== "desc") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid order.direction");
    order = { by: raw.by, direction: raw.direction };
  }
  return {
    ...(typeof input.text === "string" ? { text: input.text } : {}),
    ...(Array.isArray(input.kinds) ? { kinds: input.kinds as string[] } : {}),
    ...(Array.isArray(input.lifecycle) ? { lifecycle: input.lifecycle as string[] } : {}),
    ...(typeof input.createdFrom === "number" ? { createdFrom: input.createdFrom } : {}),
    ...(typeof input.createdTo === "number" ? { createdTo: input.createdTo } : {}),
    ...(order ? { order } : {}),
    ...page(input),
  };
}

function stringSet(value: unknown, options: string[], name: string): void {
  if (!Array.isArray(value) || !value.length || value.length > options.length) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${name}`);
  for (const item of value) {
    if (typeof item !== "string" || !options.includes(item)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${name}`);
  }
  if (new Set(value).size !== value.length) throw new ProjectQueryError("INVALID_ARGUMENT", `Duplicate ${name}`);
}

function memberCursor(compositionId: string, offset: number): string {
  const scope = { compositionId, view: "members" };
  return Buffer.from(JSON.stringify({ scope: createHash("sha256").update(JSON.stringify(scope)).digest("hex").slice(0, 15), position: [offset] })).toString("base64url");
}
