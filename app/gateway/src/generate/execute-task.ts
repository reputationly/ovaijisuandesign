import { createHash } from "node:crypto";
import path from "node:path";

import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";

import { getCaller, getToolUseId } from "../common/request-context.js";
import { ProjectKernelError, ProjectQueryError } from "../project-kernel/errors.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { catalogEntries } from "./capabilities.controller.js";
import { type GenerationRequest, type MediaType } from "./generation-request.js";
import { GenerationRunner } from "./generation-runner.service.js";
import { MediaConfigService } from "./media-config.service.js";
import { MediaEditService } from "./media-edit.js";
import { ProjectTaskService } from "./tasks.js";

const TASK_OPERATIONS = ["generate_image", "generate_video", "generate_speech", "generate_music"] as const;
const MEDIA: Record<(typeof TASK_OPERATIONS)[number], MediaType> = {
  generate_image: "image",
  generate_video: "video",
  generate_speech: "speech",
  generate_music: "music",
};

/**
 * 非插件能力走生成任务：先按调用方校验输出落点，再交给正在用的生成器。
 * 同一请求号再提交一次交回原来的任务，避免代理重试又开一单。
 */
@Injectable()
export class CapabilityExecutionService {
  constructor(
    @Inject(ProjectTaskService) private readonly tasks: ProjectTaskService,
    @Inject(GenerationRunner) private readonly runner: GenerationRunner,
    @Inject(MediaConfigService) private readonly media: MediaConfigService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(MediaEditService) private readonly edits: MediaEditService,
  ) {}

  async execute(value: unknown, response: Response) {
    try {
      const caller = getCaller();
      const raw = value && typeof value === "object" && !Array.isArray(value) ? value as { plugin?: unknown; capabilityId?: unknown } : {};
      if (raw.plugin !== undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "Plugin envelope requires a registered plugin capability");
      if (typeof raw.capabilityId === "string" && raw.capabilityId.startsWith("edit_media:")) {
        response.status(200);
        return await this.edits.edit(value);
      }
      const body = object(value, caller === "agent" ? ["capabilityId", "prompt", "params", "references", "count", "output"] : ["requestId", "capabilityId", "prompt", "params", "references", "count", "output", "origin"], "submit");
      const capabilityId = identifier(body.capabilityId, "capabilityId");
      const parsed = parseModelCapability(capabilityId);
      const offered = catalogEntries(this.media.load()).some((entry) => entry.id === capabilityId);
      if (!offered) throw new ProjectQueryError("UNSUPPORTED_OPERATION", "This capability is not offered here; pick one from the capability list", 422);
      const prompt = optionalText(body.prompt, "prompt", 64_000);
      if (body.count !== undefined) {
        if (!Number.isSafeInteger(body.count) || (body.count as number) < 1 || (body.count as number) > 9) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid count");
      }
      if (body.params !== undefined && (!body.params || typeof body.params !== "object" || Array.isArray(body.params))) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid params");
      const output = parseOutput(body.output, caller);
      const requestId = identifier(caller === "agent" ? getToolUseId() : body.requestId, "requestId");
      const references = parseReferences(body.references);
      const paths = references.map((versionId) => this.resources.relativePathOfVersion(versionId));
      const operation = parsed.operation;
      const key = createHash("sha256").update(JSON.stringify(["workspace", caller === "agent" ? "agent" : "frontend", operation, requestId])).digest("hex");
      const id = `tsk_${key.slice(0, 32)}`;
      const begun = this.tasks.begin({ id, operation, idempotencyKey: key, capabilityId, prompt, mediaType: MEDIA[operation], output, requestId });
      if (begun.reused) {
        response.status(200);
        return { task: begun.task, reused: true };
      }
      const request: GenerationRequest = {
        model_id: parsed.modelId,
        ...(prompt ? { prompt } : {}),
        ...(body.params ? { params: body.params as Record<string, unknown> } : {}),
        source_tool: capabilityId,
        filename: resourceName(output),
        ...referencePaths(operation, paths),
      };
      try {
        await this.runner.submit(MEDIA[operation], request, caller === "agent" ? "agent" : "canvas", id);
      } catch (error) {
        this.tasks.discard(id);
        throw error;
      }
      response.status(202);
      return { task: this.tasks.begin({ id, operation, idempotencyKey: key, capabilityId, prompt, mediaType: MEDIA[operation], output, requestId }).task, reused: false };
    } catch (error) {
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

function parseModelCapability(id: string): { operation: (typeof TASK_OPERATIONS)[number]; modelId: string } {
  const separator = id.indexOf(":");
  const operation = id.slice(0, separator);
  const modelId = id.slice(separator + 1);
  if (separator < 1 || !modelId || !TASK_OPERATIONS.includes(operation as (typeof TASK_OPERATIONS)[number])) {
    throw new ProjectQueryError("UNSUPPORTED_OPERATION", "Unknown capability ID", 422);
  }
  return { operation: operation as (typeof TASK_OPERATIONS)[number], modelId };
}

export function parseOutput(value: unknown, caller: "agent" | "canvas") {
  const output = object(value, ["resources", "composition", "nameSource"], "output");
  if (output.nameSource !== undefined && output.nameSource !== "provider") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid nameSource");
  if (!Array.isArray(output.resources) || output.resources.length === 0) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "output.resources: No Resource receives the result. Nothing was submitted. Add output.resources: mode=create with a name, or mode=new_version with resourceId.");
  }
  const resources = output.resources.map((item) => {
    const target = object(item, ["key", "mode", "name", "description", "resourceId", "baseVersionId", "disposition"], "output.resource");
    const key = typeof target.key === "string" ? target.key : "primary";
    identifier(key, "output.resource.key");
    if (target.mode === "create") {
      if (typeof target.name !== "string" || !target.name.trim() || target.name.length > 512) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid name");
    } else if (target.mode === "new_version") {
      identifier(target.resourceId, "resourceId");
      if (target.disposition !== undefined && target.disposition !== "adopted" && target.disposition !== "candidate") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid disposition");
    } else throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid output.resource");
    return { key, mode: target.mode, name: target.name, description: target.description, resourceId: target.resourceId, baseVersionId: target.baseVersionId, disposition: target.disposition };
  });
  if (!resources.some((target) => target.key === "primary")) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "output.resources: The result is saved under the primary output, and no target is primary. Nothing was submitted. Omit key on the main target (no key means primary); name other keys only for additional outputs.");
  }
  let composition: { compositionId?: string; name?: string; type?: { label?: string; description?: string }; placements: { key: string; role?: string; memberId?: string }[] } | undefined;
  if (output.composition !== undefined) {
    const item = object(output.composition, ["compositionId", "type", "name", "attributes", "position", "placement", "placements"], "output.composition");
    if (!Array.isArray(item.placements) || item.placements.length === 0) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "output.composition: The result has no place in the Composition. Nothing was submitted. Add placements.");
    }
    const placements = item.placements.map((placement) => {
      const parsed = object(placement, ["key", "role", "memberId"], "output.composition.placements");
      const key = typeof parsed.key === "string" ? parsed.key : "primary";
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
  if (caller === "agent") {
    const placed = new Set(composition?.placements.map((item) => item.key));
    const missing = resources.filter((target) => target.mode !== "new_version" && !placed.has(target.key as string)).map((target) => target.key);
    if (missing.length) {
      throw new ProjectQueryError("INVALID_ARGUMENT", `output.composition: ${missing.join(", ")} would be created without a place in a Composition, and the canvas shows only Composition members. Nothing was submitted. Add output.composition with compositionId (existing) or type and name (new), plus placements: [{ key, role }] for each of them.`);
    }
  }
  return { resources, ...(composition ? { composition } : {}) };
}

function parseReferences(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid references");
  return value.map((item) => {
    if (item === null) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid reference");
    const reference = object(item, ["versionId", "compositionId", "resourceId", "memberId"], "reference");
    if (reference.versionId !== undefined && Object.keys(reference).length !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid reference");
    return identifier(reference.versionId, "versionId");
  });
}

function referencePaths(operation: (typeof TASK_OPERATIONS)[number], paths: string[]): Partial<GenerationRequest> {
  if (!paths.length) return {};
  if (operation === "generate_image") return { image_paths: paths };
  if (operation === "generate_video") return { video_paths: paths };
  return { audio_paths: paths };
}

function resourceName(output: { resources: Record<string, unknown>[] }): string | undefined {
  const primary = output.resources.find((item) => item.key === "primary") ?? output.resources[0];
  return typeof primary?.name === "string" ? path.posix.basename(primary.name) : undefined;
}

function object(value: unknown, fields: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${label}`);
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) if (!fields.includes(field)) throw new ProjectQueryError("UNSUPPORTED_FIELD", `${label}.${field} is not supported`, 422);
  return record;
}

function identifier(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 512) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${field}`);
  return value;
}

function optionalText(value: unknown, field: string, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximum) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${field}`);
  return value;
}
