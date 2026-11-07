import { Controller, Get, Inject, Query } from "@nestjs/common";

import { MediaConfigService } from "./media-config.service.js";
import { capabilityEntries } from "./capabilities.controller.js";

/**
 * `capability_search` 工具的检索端（`GET /api/connectors/search?q=…`）。
 *
 * 官方语义是「搜连接器市场 + 已配置的 MCP server」。我们这套产品没有第三方连接器
 * 市场，但**能力目录本身**就是模型最需要搜的东西：之前这条路由不存在，工具每次 404，
 * 模型就以为"没有现成能力可用"，转而自己拼命令或开子代理。
 *
 * 本地实现，不依赖云端：在平台能力目录（new-api 的 /v1/ov/capabilities）+ 本机
 * 同步编辑能力上做关键字检索；市场部分如实报"不可用"。
 */
@Controller()
export class ConnectorsController {
  constructor(@Inject(MediaConfigService) private readonly media: MediaConfigService) {}

  @Get("api/connectors/search")
  search(@Query("q") q?: string) {
    const raw = String(q ?? "").trim();
    const terms = raw
      .split(",")
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
    const entries = capabilityEntries(this.media);
    const hits = terms.length
      ? entries.filter((entry) => {
          const haystack = `${entry.id} ${entry.operation} ${entry.displayName ?? ""} ${entry.description ?? ""}`.toLowerCase();
          return terms.some((term) => haystack.includes(term));
        })
      : entries;
    return {
      results: hits.slice(0, 40).map((entry) => ({
        connectorId: entry.id,
        name: entry.displayName ?? entry.id,
        kind: "capability" as const,
        source: "configured" as const,
        runtimeName: entry.model?.id ?? entry.id,
        available: true,
        description: entry.description ?? "",
      })),
      market: {
        available: false,
        reason:
          "This build has no third-party connector market. Everything the assistant can do locally is listed under results (generation capabilities and edit_media tools).",
      },
    };
  }
}
