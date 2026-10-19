import { createHash } from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";

import { Body, Controller, HttpCode, HttpException, Inject, Injectable, Post } from "@nestjs/common";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { getCaller } from "../common/request-context.js";
import { projectId, ProjectCompositionService } from "./composition.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";

const PRIMARY = "primary";
const KINDS: Record<string, number> = { txt: 1, md: 1, srt: 1, ass: 1, vtt: 1, png: 2, jpg: 2, jpeg: 2, webp: 2, gif: 2, mp4: 3, webm: 3, mov: 3, mp3: 4, m4a: 4, wav: 4 };

type Source = { key: string; path?: string; versionId?: string };
type Target = { key: string; mode: "create" | "new_version" | "reuse"; name?: string; resourceId?: string; baseVersionId?: string; disposition?: "adopted" | "candidate" };
type Placement = { key: string; role?: string; memberId?: string };
type DeliveryRequest = {
  requestId: string;
  sources: Source[];
  output: { resources: Target[]; composition?: { compositionId?: string; name?: string; type?: { label?: string; description?: string }; placements: Placement[] } };
};

@Injectable()
export class ProjectDeliveryService {
  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectCompositionService) private readonly compositions: ProjectCompositionService,
  ) {}

  deliver(value: unknown) {
    const workspace = this.scope();
    const request = parseDelivery(value);
    const actor = getCaller() === "agent" ? "agent" : "human";
    if (actor === "agent") {
      const placed = new Set(request.output.composition?.placements.map((item) => item.key));
      const missing = request.output.resources.filter((target) => target.mode !== "new_version" && !placed.has(target.key)).map((target) => target.key);
      if (missing.length) throw new ProjectQueryError("INVALID_ARGUMENT", `${missing.join(", ")} would be created without a place in a Composition, and the canvas shows only Composition members.`);
    }
    const id = createHash("sha256").update(JSON.stringify([workspace, request.requestId])).digest("hex");
    const intent = { actor, ...request };
    const previous = this.resources.readDeliveryReceipt(`${id}:result`, intent);
    if (previous) return previous;
    const resources = request.sources.map((source) => this.materialize(workspace, id, actor, source, request.output.resources.find((target) => target.key === source.key) as Target));
    let compositionId: string | undefined;
    const memberIds = new Map<string, string>();
    if (request.output.composition) {
      const target = request.output.composition;
      const ensured = target.compositionId
        ? { compositionId: target.compositionId }
        : this.compositions.ensureAgent(`delivery:${id}:composition`, {
            label: target.type?.label ?? "Delivery",
            description: target.type?.description,
            name: target.name ?? "",
          }) as { compositionId: string };
      compositionId = ensured.compositionId;
      const current = this.compositions.get(compositionId);
      const operations = [];
      for (const placement of target.placements) {
        const resource = resources.find((item) => item.key === placement.key);
        if (!resource) continue;
        const memberId = placement.memberId ?? projectId("member", [id, placement.key, resource.resourceId]);
        memberIds.set(placement.key, memberId);
        if (!current.members.some((member) => (member as { memberId?: string }).memberId === memberId)) {
          operations.push({ type: "member.add", member: { memberId, role: placement.role ?? resource.kind, resource: resource.resourceId } });
        }
      }
      if (operations.length) {
        this.compositions.execute({
          commandId: `delivery:${id}:members`,
          actor,
          expectedRevision: current.revision,
          command: { type: "composition.apply", compositionId, operations },
        });
      }
    }
    return this.resources.saveDeliveryReceipt(`${id}:result`, intent, {
      requestId: request.requestId,
      status: "completed",
      resources,
      placements: [...memberIds.entries()].map(([key, memberId]) => ({ key, compositionId, memberId, role: request.output.composition?.placements.find((item) => item.key === key)?.role })),
    });
  }

  private materialize(workspace: string, id: string, actor: "human" | "agent", source: Source, target: Target) {
    if (target.mode === "reuse") {
      if (!source.versionId) throw new ProjectQueryError("INVALID_ARGUMENT", "reuse requires an existing version source");
      const [found] = this.resources.getResources([{ versionId: source.versionId }]) as { ok?: boolean; detail?: { resource: { resourceId: string; name: string; kind: number }; version: { versionId: string } } }[];
      if (!found?.ok || !found.detail) throw new ProjectQueryError("NOT_FOUND", "Delivery source version is not available", 404);
      return { key: source.key, name: found.detail.resource.name, kind: kindName(found.detail.resource.kind), resourceId: found.detail.resource.resourceId, versionId: found.detail.version.versionId, disposition: "adopted", availability: "available" };
    }
    if (!source.path) throw new ProjectQueryError("INVALID_ARGUMENT", "Delivery source needs a workspace file path");
    const absolute = workspaceFile(workspace, source.path);
    const extension = path.posix.extname(source.path).slice(1).toLowerCase() || "bin";
    const versionId = projectId("version", ["delivery", id, source.key]);
    const resourceId = target.mode === "new_version" ? target.resourceId ?? "" : projectId("resource", ["delivery", id, source.key]);
    const relativePath = `store/${versionId}.${extension}`;
    mkdirSync(path.dirname(path.join(workspace, relativePath)), { recursive: true });
    copyFileSync(absolute, path.join(workspace, relativePath));
    const name = target.name ?? path.posix.basename(source.path);
    const kind = KINDS[extension] ?? 5;
    if (target.mode === "create") {
      const created = this.resources.execute({
        commandId: `delivery:${id}:${source.key}:create`,
        actor,
        command: { type: "resource.create", resourceId, payload: { name, kind } },
      }) as { committed?: boolean; result?: { name?: string } };
      if (!created.committed) throw new ProjectQueryError("INVALID_ARGUMENT", "Delivery resource was not created");
    }
    const updated = this.resources.execute({
      commandId: `delivery:${id}:${source.key}:version`,
      actor,
      command: {
        type: "resource.update",
        resourceId,
        payload: { kind: "new_version", versionId, relativePath, source: "import", dependencies: [], baseVersionId: target.mode === "new_version" ? target.baseVersionId ?? null : null, disposition: target.disposition ?? "adopted" },
      },
    }) as { committed?: boolean };
    if (!updated.committed) throw new ProjectQueryError("DOCUMENT_REVISION_CONFLICT", "Delivery version did not match the current resource version", 409);
    return { key: source.key, name, kind: kindName(kind), resourceId, versionId, disposition: target.disposition ?? "adopted", availability: "available" };
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
}

@Controller("api/v3/deliveries")
export class ProjectDeliveryController {
  constructor(@Inject(ProjectDeliveryService) private readonly delivery: ProjectDeliveryService) {}

  @Post()
  @HttpCode(200)
  deliver(@Body() body: unknown) {
    try {
      return { delivery: this.delivery.deliver(body) };
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") {
        throw new HttpException({ error: { code: error.code, message: "requestId is already bound to a different delivery request", retryable: false } }, 409);
      }
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") {
        throw new HttpException({ error: { code: error.code, message: "Project v3 is not enabled", retryable: false } }, 403);
      }
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: false } }, error.status);
      }
      throw error;
    }
  }
}

function parseDelivery(value: unknown): DeliveryRequest {
  const raw = object(value, ["requestId", "sources", "output"], "delivery");
  identifier(raw.requestId, "requestId");
  if (!Array.isArray(raw.sources) || raw.sources.length < 1 || raw.sources.length > 100) throw new ProjectQueryError("INVALID_ARGUMENT", "Delivery requires 1–100 sources");
  const several = raw.sources.length > 1;
  const sources = raw.sources.map((item, index) => {
    const source = object(item, ["key", "versionId", "artifactId", "path"], `sources[${index}]`);
    if (source.artifactId !== undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "Artifact delivery is not available");
    if (source.key === undefined && several) throw new ProjectQueryError("INVALID_ARGUMENT", "Several sources each need a key.");
    const key = typeof source.key === "string" ? source.key : PRIMARY;
    identifier(key, "source.key");
    const identities = ["versionId", "path"].filter((field) => source[field] !== undefined);
    if (identities.length !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Sources require exactly one identity");
    if (source.path !== undefined && (typeof source.path !== "string" || !source.path.trim() || source.path.length > 4096)) throw new ProjectQueryError("INVALID_ARGUMENT", "source.path must be a workspace file path");
    if (source.versionId !== undefined) identifier(source.versionId, "source identity");
    return { key, ...(typeof source.path === "string" ? { path: source.path } : {}), ...(typeof source.versionId === "string" ? { versionId: source.versionId } : {}) };
  });
  if (new Set(sources.map((source) => source.key)).size !== sources.length) throw new ProjectQueryError("INVALID_ARGUMENT", "Sources require unique keys");
  const output = object(raw.output, ["resources", "composition", "nameSource"], "output");
  if (!Array.isArray(output.resources) || !output.resources.length) throw new ProjectQueryError("INVALID_ARGUMENT", "No Resource receives the result.");
  const resources = output.resources.map((item, index) => {
    const target = object(item, ["key", "mode", "name", "description", "resourceId", "baseVersionId", "disposition"], `output.resources[${index}]`);
    if (target.key === undefined && several) throw new ProjectQueryError("INVALID_ARGUMENT", "Several sources each need their own target.");
    const key = typeof target.key === "string" ? target.key : PRIMARY;
    if (target.mode !== "create" && target.mode !== "new_version" && target.mode !== "reuse") throw new ProjectQueryError("INVALID_ARGUMENT", "Resource mode must be create, new_version or reuse");
    if (target.mode === "reuse" && !sources.some((source) => source.key === key && source.versionId)) throw new ProjectQueryError("INVALID_ARGUMENT", "reuse requires an existing version source");
    if (target.mode === "create" && (typeof target.name !== "string" || !target.name.trim())) throw new ProjectQueryError("INVALID_ARGUMENT", "create requires a name");
    if (target.mode === "new_version") identifier(target.resourceId, "resourceId");
    return { key, mode: target.mode, ...(typeof target.name === "string" ? { name: target.name } : {}), ...(typeof target.resourceId === "string" ? { resourceId: target.resourceId } : {}), ...(target.disposition === "candidate" || target.disposition === "adopted" ? { disposition: target.disposition } : {}) } as Target;
  });
  for (const source of sources) if (!resources.some((target) => target.key === source.key)) throw new ProjectQueryError("INVALID_ARGUMENT", `No target for source ${source.key}.`);
  let composition: DeliveryRequest["output"]["composition"];
  if (output.composition !== undefined) {
    const item = object(output.composition, ["compositionId", "type", "name", "attributes", "placements"], "output.composition");
    if (!Array.isArray(item.placements) || !item.placements.length) throw new ProjectQueryError("INVALID_ARGUMENT", "The result has no place in the Composition.");
    const placements = item.placements.map((placement, index) => {
      const parsed = object(placement, ["key", "role", "memberId", "replaceResourceId"], `output.composition.placements[${index}]`);
      const key = typeof parsed.key === "string" ? parsed.key : PRIMARY;
      if ((parsed.role === undefined) === (parsed.memberId === undefined)) throw new ProjectQueryError("INVALID_ARGUMENT", "role adds a new member and memberId fills an existing one; give exactly one.");
      return { key, ...(typeof parsed.role === "string" ? { role: parsed.role } : {}), ...(typeof parsed.memberId === "string" ? { memberId: parsed.memberId } : {}) };
    });
    const type = item.type === undefined ? undefined : object(item.type, ["id", "label", "description"], "composition.type");
    composition = {
      ...(typeof item.compositionId === "string" ? { compositionId: item.compositionId } : {}),
      ...(typeof item.name === "string" ? { name: item.name } : {}),
      ...(type && typeof type.label === "string" ? { type: { label: type.label, ...(typeof type.description === "string" ? { description: type.description } : {}) } } : {}),
      placements,
    };
  }
  return { requestId: raw.requestId as string, sources, output: { resources, ...(composition ? { composition } : {}) } };
}

function workspaceFile(workspace: string, relativePath: string): string {
  if (relativePath.includes("\0") || relativePath.includes("\\") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "source.path must be a workspace file path");
  }
  const absolute = path.join(workspace, relativePath);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new ProjectQueryError("INVALID_ARGUMENT", "source.path must be a workspace file path");
  return absolute;
}

function kindName(kind: number): string {
  return { 1: "text", 2: "image", 3: "video", 4: "audio", 5: "file" }[kind] ?? "file";
}

function object(value: unknown, fields: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectQueryError("INVALID_ARGUMENT", label);
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) if (!fields.includes(field)) throw new ProjectQueryError("UNSUPPORTED_FIELD", `${label}.${field} is not supported`, 422);
  return record;
}

function identifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 512) throw new ProjectQueryError("INVALID_ARGUMENT", `${label} must be a non-empty identifier of at most 512 characters`);
}
