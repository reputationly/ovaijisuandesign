import { BadRequestException, Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";

import { params as mediaParams } from "@ov/maas-media";

import { MediaConfigService } from "./media-config.service.js";
import { MAAS_BACKEND, buildCatalog, type CatalogModel } from "./model-catalog.js";
import { TOOL_CAPABILITIES } from "@ov/protocol";

import type { PlatformCatalog, PlatformCapability } from "./platform-catalog.js";

const OPERATIONS = ["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media", "transcribe", "upscale"] as const;

/** 一条能力。形状与渲染层的 `catalogEntries` 消费方一致，另带 transport/limits（L-2、L-4 用）。 */
export interface CapabilityEntry {
  id: string;
  operation: string;
  displayName: string;
  description: string;
  paramSchema: { type: "object"; properties: Record<string, unknown> };
  model: { id: string; vendor: string; presentation: { displayName: string; description: string } };
  /** 走哪条协议：images / videos_task / audio_speech / audio_transcriptions / chat。 */
  transport?: string;
  /** 平台给的上限。0 或缺失 = 不额外限制。 */
  limits?: { maxReferenceImages?: number; maxDurationSeconds?: number; maxInputBytes?: number };
  /** tasks 类传输支持的 task_type。 */
  taskTypes?: string[];
  default?: boolean;
}

/** 把已配置的模型列成能力。工具能力不在这套目录里，source=tool 时列表为空。 */
@Controller("api/v3/capabilities")
export class CapabilitiesController {
  constructor(@Inject(MediaConfigService) private readonly media: MediaConfigService) {}

  @Get()
  list(@Query("operation") operation?: string | string[], @Query("source") source?: string | string[]) {
    const operations = listOf(operation, OPERATIONS, "operation");
    const [chosen, extra] = many(source, ["model", "tool"], "source");
    if (extra !== undefined) throw new BadRequestException("Unsupported capability source");
    const capabilities = chosen === "tool" ? [] : this.entries().filter((entry) => !operations.length || operations.includes(entry.operation));
    return { capabilities };
  }

  @Get(":id")
  get(@Param("id") id: string) {
    const capability = this.entries().find((entry) => entry.id === id);
    if (!capability) throw new NotFoundException("Capability unavailable");
    return { capability };
  }

  private entries() {
    return capabilityEntries(this.media);
  }
}

/**
 * 当前应该对外报的能力。
 *
 * **平台目录优先**：目录里带着真实参数表、上限和传输协议，而且已经按这个 key 的
 * 权限过滤过（见 new-api 的 `service/ovcaps`）。拿不到目录时退回按配置槽位拼出来的
 * 那几条 —— 离线也要能打开界面，只是模型少。
 */
export function capabilityEntries(media: MediaConfigService): CapabilityEntry[] {
  const catalog = media.currentCatalog();
  const base = catalog ? platformEntries(catalog) : catalogEntries(media.load());
  // 本机同步编辑能力与目录无关，始终可用。
  return [...base, ...toolCapabilityEntries()];
}

/** 平台目录 → 能力条目。 */
/**
 * 本机工具能力（`@ov/protocol` 的 `TOOL_CAPABILITIES`）。
 *
 * **必须报出来**：官方把 `edit_media:*` 作为一等能力挂在协议注册表里
 * （`packages/protocol/dist/capabilities/tools/media-edit.js`），agent 通过
 * `design_capability_list` 看得到 `merge_videos`，拼片时直接 `design_execute`。
 * 我们之前只报平台目录，这些本机能力一条都不出现 —— agent 以为没有现成能力，
 * 于是把"拼接两段视频"交给 code-agent 写 ffmpeg 脚本（真机就是这么走的）。
 *
 * 这里直接映射注册表，schema/描述与官方逐字一致，不再手写一份。
 */
export function toolCapabilityEntries(): CapabilityEntry[] {
  return TOOL_CAPABILITIES.filter((capability) => capability.operation === "edit_media")
    .map((capability) => ({
      id: capability.id,
      operation: capability.operation,
      displayName: capability.displayName,
      description: capability.description,
      paramSchema: capability.paramSchema as CapabilityEntry["paramSchema"],
      model: { id: capability.id, vendor: "local", presentation: { displayName: capability.displayName, description: capability.description } },
      transport: "local",
    }));
}

export function platformEntries(catalog: PlatformCatalog): CapabilityEntry[] {
  return catalog.capabilities.flatMap((capability) => {
    const operation = capability.operation;
    // 没有模型名的是坏条目（平台上加字段时可能漏）；不在白名单里的是对话/市场这类
    // 不走生成任务的能力 —— 两类都不进这份媒体能力目录。
    if (typeof capability.model !== "string" || !capability.model) return [];
    if (!(OPERATIONS as readonly string[]).includes(operation)) return [];
    const displayName = localized(capability.displayName) ?? capability.model;
    const description = localized(capability.description) ?? "";
    return [{
      id: capability.id || `${operation}:${capability.model}`,
      operation,
      displayName,
      description,
      paramSchema: { type: "object" as const, properties: schemaProperties(capability) },
      model: { id: capability.model, vendor: MAAS_BACKEND, presentation: { displayName, description } },
      ...(capability.transport?.kind ? { transport: capability.transport.kind } : {}),
      ...(capability.limits ? { limits: capability.limits } : {}),
      ...(capability.taskTypes?.length ? { taskTypes: capability.taskTypes } : {}),
      ...(capability.default ? { default: true } : {}),
    }];
  });
}

function schemaProperties(capability: PlatformCapability): Record<string, unknown> {
  const properties = capability.paramSchema?.properties ?? {};
  const mapped = Object.fromEntries(Object.entries(properties).map(([name, param]) => [name, {
    type: "string",
    ...(param.enum?.length ? { enum: param.enum } : {}),
    ...(param.default === undefined ? {} : { default: param.default }),
    ...(param.title ? { title: param.title } : {}),
  }]));
  if (Object.keys(mapped).length) return mapped;
  // **平台没给参数表时回退到本机模态参数表。** 平台的图片能力目前一条参数都不报，
  // 于是画布上的图片生成面板连「比例 / 分辨率」都没有 —— 而这两项后端是真认的
  // （`generation-request.ts` 读 `params.aspect_ratio` / `params.resolution` 去算 size）。
  // 视频一直有参数表，所以只有图片缺；这里按操作补上，平台一旦自报参数就仍以平台为准。
  const fallback = modalityParams(capability.operation, capability.model);
  return fallback.length
    ? Object.fromEntries(fallback.map((param) => [param.name, { type: "string", enum: param.options, default: param.default, title: param.label }]))
    : mapped;
}

/** 本机的模态参数表（图片/视频各一套，见 `@ov/maas-media` 的 params.ts）。 */
function modalityParams(operation: string, model: string): { name: string; label: string; options: string[]; default: string }[] {
  // 图生图的比例由输入图决定，参数表按 `image` 取就够了。
  if (operation === "generate_image") return mediaParams.forModality("image", model);
  if (operation === "generate_video") return mediaParams.forModality("video", model);
  return [];
}

function localized(value: { zh?: string; en?: string } | undefined): string | undefined {
  const text = value?.zh?.trim() || value?.en?.trim();
  return text === "" ? undefined : text;
}

/** 按配置槽位拼能力（没有平台目录时的兜底）。 */
export function catalogEntries(config: ReturnType<MediaConfigService["load"]>): CapabilityEntry[] {
  const catalog = buildCatalog(config);
  return [...catalog.imageModels, ...catalog.videoModels, ...catalog.audioModels].filter((model) => !model.hideInModelPicker).flatMap((model) => {
      const operation = operationOf(model);
      if (!operation) return [];
      const properties = Object.fromEntries(Object.entries(model.params).map(([key, param]) => [key, { type: "string", enum: param.options, default: param.default, title: param.label }]));
      return [{
        id: `${operation}:${model.id}`,
        operation,
        displayName: model.display_name,
        description: model.description,
        paramSchema: { type: "object" as const, properties },
        model: { id: model.id, vendor: model.backend, presentation: { displayName: model.display_name, description: model.description } },
      }];
    });
}

function operationOf(model: CatalogModel): string | undefined {
  if (model.tool_names.includes("hub_generate_image")) return "generate_image";
  if (model.tool_names.includes("hub_generate_video")) return "generate_video";
  if (model.tool_names.includes("hub_generate_audio_speech")) return "generate_speech";
  if (model.tool_names.includes("hub_generate_audio_music")) return "generate_music";
  return undefined;
}

function listOf(value: string | string[] | undefined, allowed: readonly string[], name: string): string[] {
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
  for (const item of list) {
    if (!allowed.includes(item)) throw new BadRequestException(`Invalid ${name}`);
  }
  return list;
}

function many(value: string | string[] | undefined, allowed: readonly string[], name: string): [string | undefined, string | undefined] {
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
  for (const item of list) {
    if (!allowed.includes(item)) throw new BadRequestException(`Invalid ${name}`);
  }
  return [list[0], list[1]];
}
