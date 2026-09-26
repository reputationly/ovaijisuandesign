import { Body, Controller, Logger, Module, Post } from "@nestjs/common";

interface SearchQuery {
  query?: unknown;
}

/**
 * 参考图搜索（MCP 的搜图工具调它）。图库检索靠厂商云端的搜索服务，这个版本不连任何云：
 * 请求照常校验，每个查询都回"成功但没找到图"——和云端搜索不可达时的结果一样，工具会如实告诉
 * agent 没搜到，agent 再换别的办法（让用户提供参考图、直接生成）。
 */
@Controller()
export class SearchController {
  private readonly log = new Logger("Search");

  @Post("api/search/images")
  searchImages(@Body() body: { queries?: unknown }) {
    const queries = Array.isArray(body?.queries) ? (body.queries as SearchQuery[]) : [];
    if (queries.length === 0) return { ok: false, results: [], error: "No queries provided" };
    if (queries.length > 4) return { ok: false, results: [], error: "Maximum 4 queries per request" };
    this.log.log(`[search] image search is not available offline; ${queries.length} query(ies) answered empty`);
    return {
      ok: true,
      results: queries.map((q) => ({ query: typeof q?.query === "string" ? q.query : "", success: true, images: [], error: "No images found" })),
    };
  }
}

@Module({ controllers: [SearchController] })
export class SearchModule {}
