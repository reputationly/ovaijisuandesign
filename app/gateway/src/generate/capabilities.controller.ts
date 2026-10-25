import { BadRequestException, Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";

import { MediaConfigService } from "./media-config.service.js";
import { MAAS_BACKEND, buildCatalog, type CatalogModel } from "./model-catalog.js";
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
  if (catalog) return platformEntries(catalog);
  return catalogEntries(media.load());
}

/** 平台目录 → 能力条目。 */
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
  return Object.fromEntries(Object.entries(properties).map(([name, param]) => [name, {
    type: "string",
    ...(param.enum?.length ? { enum: param.enum } : {}),
    ...(param.default === undefined ? {} : { default: param.default }),
    ...(param.title ? { title: param.title } : {}),
  }]));
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
