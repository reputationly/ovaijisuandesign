import { createHash } from "node:crypto";
import path from "node:path";

import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";

import { getCaller, getToolUseId } from "../common/request-context.js";
import { ProjectKernelError, ProjectQueryError } from "../project-kernel/errors.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { capabilityEntries } from "./capabilities.controller.js";
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
        // **契约适配**：`execute` 的入参是平铺的 `{capabilityId, params, references, output}`，
        // 而 `MediaEditService.edit()` 要 `{capabilityId, input:{params,references}, output}`。
        // 不转这一步，每次 edit_media 都会被判 `media edit.params is not supported`（422）——
        // 这就是"拼接/裁剪一直失败、模型只好开 code-agent"的真正原因。
        const flat = raw as Record<string, unknown>;
        // 已经是媒体编辑契约（`input`）时原样透传，别二次包裹。
        if (flat.input && typeof flat.input === "object") return await this.edits.edit(value);
        const adapted = {
          capabilityId: flat.capabilityId,
          input: { params: flat.params ?? {}, references: flat.references ?? [] },
          output: flat.output,
        };
        return await this.edits.edit(adapted);
      }
      const body = object(value, caller === "agent" ? ["capabilityId", "prompt", "params", "references", "count", "output"] : ["requestId", "capabilityId", "prompt", "params", "references", "count", "output", "origin"], "submit");
      const capabilityId = identifier(body.capabilityId, "capabilityId");
      // **按玩法改投到正确的能力**：`image_mode=reference` 只有参考族 checkpoint 能跑。
      // 真机：模型先选了 `generate_video:minimax-h3-2k`（帧族 fl2va），带 reference 的请求
      // 被上游拒三次（`task_type 'r2va' needs the Ref2VA checkpoint`），它才换对。
      // 目录里存在 `-ref-2k` 兄弟能力时，这里直接改投，别让用户等三次失败。
      const requestedMode = (() => {
        const params = (body as Record<string, unknown>).params;
        if (params && typeof params === "object" && !Array.isArray(params)) {
          const mode = (params as Record<string, unknown>).image_mode;
          if (typeof mode === "string") return mode.trim();
        }
        return "";
      })();
      const capabilityId2 =
        requestedMode === "reference" && !capabilityId.includes("-ref")
          ? (() => {
              const sibling = capabilityId.replace(/-2k$/, "-ref-2k");
              if (sibling === capabilityId) return capabilityId;
              return capabilityEntries(this.media).some((entry) => entry.id === sibling) ? sibling : capabilityId;
            })()
          : capabilityId;
      const parsed = parseModelCapability(capabilityId2);
      // 校验与下发用**同一个来源**：平台目录优先。用槽位目录校验的话，目录里
      // 多出来的模型（哪怕它就在 /v1/ov/capabilities 里）会被这里判成不认识。
      const offered = capabilityEntries(this.media).some((entry) => entry.id === capabilityId2);
      if (!offered) throw new ProjectQueryError("UNSUPPORTED_OPERATION", "This capability is not offered here; pick one from the capability list", 422);
      // `params` 允许写成 JSON 字符串（模型经常这么干）；解析不了才判非法。
      let rawParams = body.params;
      if (typeof rawParams === "string") {
        try {
          rawParams = JSON.parse(rawParams);
        } catch {
          throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid params");
        }
      }
      if (rawParams !== undefined && (!rawParams || typeof rawParams !== "object" || Array.isArray(rawParams))) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid params");
      // 音乐（尤其 `*-enhanced` 聚合模型）要求**风格描述**。模型有时把风格写进
      // `params.prompt` 而顶层 `prompt` 留空，平台就报
      // 「音乐生成缺少风格描述：需要给出流派 / 配器 / 速度 / 情绪」。
      // 这里把它提升到顶层，并从 params 里去掉，避免下游两处都发。
      const paramBag = (rawParams ?? {}) as Record<string, unknown>;
      const { prompt } = promoteMusicStylePrompt(parsed.operation, optionalText(body.prompt, "prompt", 64_000), paramBag);
      if (body.count !== undefined) {
        if (!Number.isSafeInteger(body.count) || (body.count as number) < 1 || (body.count as number) > 9) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid count");
      }
      const output = parseOutput(body.output, caller);
      const requestId = identifier(caller === "agent" ? getToolUseId() : body.requestId, "requestId");
      const references = parseReferences(body.references);
      const paths = references.map((versionId) => this.resources.relativePathOfVersion(versionId));
      const operation = parsed.operation;
      const key = createHash("sha256").update(JSON.stringify(["workspace", caller === "agent" ? "agent" : "frontend", operation, requestId])).digest("hex");
      const id = `tsk_${key.slice(0, 32)}`;
      const request: GenerationRequest = {
        model_id: parsed.modelId,
        ...(prompt ? { prompt } : {}),
        ...(Object.keys(paramBag).length ? { params: paramBag } : {}),
        source_tool: capabilityId2,
        filename: resourceName(output),
        ...referencePaths(operation, paths),
      };
      const origin = { source: caller === "agent" ? "agent" : "frontend", ...(caller === "agent" && getToolUseId() ? { toolUseId: getToolUseId() } : {}) };
      // **多输出扇出**：`count>1` 时提交 N 个任务，回 `{task, serverTaskIds}`（参照契约）。
      // 之前 `count` 只校验不使用，`n` 又写死 1，所以 `count:4` 实际只出 1 张。
      const count = typeof body.count === "number" ? body.count : 1;
      if (count > 1 && operation === "generate_image") {
        const ids: string[] = [];
        let first: unknown;
        for (let index2 = 1; index2 <= count; index2 += 1) {
          const perRequestId = `${requestId}#${index2}`;
          const perKey = createHash("sha256").update(JSON.stringify(["workspace", caller === "agent" ? "agent" : "frontend", operation, perRequestId])).digest("hex");
          const perId = `tsk_${perKey.slice(0, 32)}`;
          const perOutput = withOutputIndex(output, index2);
          const perRequest: GenerationRequest = { ...request, filename: resourceName(perOutput) };
          const perBegun = this.tasks.begin({ id: perId, operation, idempotencyKey: perKey, capabilityId, prompt, mediaType: MEDIA[operation], output: perOutput, requestId: perRequestId, origin, generation: perRequest });
          first ??= perBegun.task;
          ids.push(perId);
          if (perBegun.reused) continue;
          try {
            await this.runner.submit(MEDIA[operation], perRequest, caller === "agent" ? "agent" : "canvas", perId);
          } catch (error) {
            this.tasks.discard(perId);
            throw error;
          }
        }
        response.status(202);
        return { task: first, serverTaskIds: ids, reused: false };
      }
      const begun = this.tasks.begin({ id, operation, idempotencyKey: key, capabilityId, prompt, mediaType: MEDIA[operation], output, requestId, origin, generation: request });
      if (begun.reused) {
        response.status(200);
        return { task: begun.task, reused: true };
      }
      try {
        await this.runner.submit(MEDIA[operation], request, caller === "agent" ? "agent" : "canvas", id);
      } catch (error) {
        this.tasks.discard(id);
        throw error;
      }
      response.status(202);
      return { task: this.tasks.begin({ id, operation, idempotencyKey: key, capabilityId, prompt, mediaType: MEDIA[operation], output, requestId, origin, generation: request }).task, reused: false };
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
    const reference = object(item, ["versionId", "compositionId", "resourceId", "memberId", "role", "name", "kind"], "reference");
    // 只认 `versionId`；其它字段（role/name/resourceId…）是模型顺手带的提示，忽略即可。
    // 以前要求"带 versionId 时必须是唯一键"，于是 `{versionId, role}` 被判 Invalid reference，
    // 模型只好反复猜格式（真机上视频段连续 5 次失败就是这个）。
    return identifier(reference.versionId, "versionId");
  });
}

/**
 * 把参考素材落到 `GenerationRequest` 的**对应槽位**。
 *
 * **按素材本身的类型分，不按任务操作分。** 以前这里写的是"视频任务 → `video_paths`"，
 * 于是给视频任务传两张**参考图**（png/jpg）时，它们被当成参考视频发给平台，报：
 *
 *     输入 video 不是有效的媒体文件(文件头校验未通过,请勿改后缀上传)
 *
 * 图片/视频/音频各自走 `reference_image_paths` / `video_paths` / `audio_paths`，
 * 与 `videoReferences()` 读取的字段保持一致。
 */
function referencePaths(operation: (typeof TASK_OPERATIONS)[number], paths: string[]): Partial<GenerationRequest> {
  if (!paths.length) return {};
  const images: string[] = [];
  const videos: string[] = [];
  const audios: string[] = [];
  for (const item of paths) {
    const ext = path.extname(item).toLowerCase();
    if (IMAGE_EXT.has(ext)) images.push(item);
    else if (VIDEO_EXT.has(ext)) videos.push(item);
    else if (AUDIO_EXT.has(ext)) audios.push(item);
    else if (operation === "generate_image") images.push(item);
    else if (operation === "generate_video") videos.push(item);
    else audios.push(item);
  }
  return {
    ...(images.length ? { reference_image_paths: images } : {}),
    ...(videos.length ? { video_paths: videos } : {}),
    ...(audios.length ? { audio_paths: audios } : {}),
  };
}

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"]);

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

// 测试用：暴露槽位分类函数（生产代码只在本文件内调用）。
export const referencePathsForTest = referencePaths;

/**
 * 提示词提升（抽成函数便于用例覆盖）：顶层 prompt 为空时用 `params.prompt` 顶上，
 * 并把该键从 params 里删掉（避免下游两处都发）。原先只对音乐生效。
 */
export function promoteMusicStylePrompt(
  operation: string,
  topPrompt: string | undefined,
  params: Record<string, unknown>,
): { prompt: string | undefined } {
  const style = typeof params.prompt === "string" ? params.prompt : "";
  // 空串/全空白也当作"没有"：`body.prompt: ""` 同样会被平台判缺提示词。
  if (topPrompt !== undefined && topPrompt.trim() !== "") return { prompt: topPrompt };
  // **所有生成操作都适用**：模型经常把提示词写在 `params.prompt` 里（图片/视频尤其常见），
  // 顶层空着就被平台判 `prompt is required`。以前只救了音乐，于是生图/生视频反复白拒。
  if (!style.trim()) return { prompt: undefined };
  delete params.prompt;
  return { prompt: style };
}

export const promoteMusicStylePromptForTest = promoteMusicStylePrompt;

/**
 * 多输出时给每个任务一份**互不撞名**的输出目标：资源名 / placement 角色都追加 ` 1`、` 2`…，
 * 否则 N 个任务会往同一个资源上写版本，画布上只看到一张。
 */
export function withOutputIndex(output: ReturnType<typeof parseOutput>, index: number): ReturnType<typeof parseOutput> {
  return {
    ...output,
    resources: output.resources.map((target) => ({
      ...target,
      ...(typeof target.name === "string" && target.name.trim() ? { name: `${target.name} ${index}` } : {}),
    })),
    ...(output.composition
      ? {
          composition: {
            ...output.composition,
            ...(typeof output.composition.name === "string" && output.composition.name.trim() ? { name: `${output.composition.name} ${index}` } : {}),
            placements: output.composition.placements.map((placement) => ({
              ...placement,
              ...(typeof placement.role === "string" && placement.role ? { role: `${placement.role} ${index}` } : {}),
            })),
          },
        }
      : {}),
  };
}
