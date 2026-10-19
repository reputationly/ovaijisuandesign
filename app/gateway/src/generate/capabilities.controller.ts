import { BadRequestException, Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";

import { MediaConfigService } from "./media-config.service.js";
import { buildCatalog, type CatalogModel } from "./model-catalog.js";

const OPERATIONS = ["generate_image", "generate_video", "generate_speech", "generate_music", "edit_media"] as const;

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
    return catalogEntries(this.media.load());
  }
}

export function catalogEntries(config: ReturnType<MediaConfigService["load"]>) {
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
        paramSchema: { type: "object", properties },
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
