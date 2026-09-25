import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * 渲染层给每个请求都挂一串公共参数（设备、版本、语言……），本来是给云端统计和路由用的。
 * 本地路由不认它们，而全局 ValidationPipe 开了 forbidNonWhitelisted —— 不先剥掉，
 * 所有用 DTO 收 query 的路由（比如 `GET /api/canvas/nodes`）都会 400。
 *
 * 只有 `device_platform=desktop` 时才剥：没带这个标记的请求（MCP、脚本）里同名参数可能是真参数。
 */
export const RENDERER_COMMON_PARAM_KEYS: ReadonlySet<string> = new Set([
  "app_id",
  "biz_id",
  "browser_language",
  "browser_name",
  "browser_platform",
  "cpu_core_num",
  "device_id",
  "device_memory",
  "device_platform",
  "lang",
  "os_name",
  "screen_height",
  "screen_width",
  "unix",
  "uuid",
  "version_code",
]);

/** 从 URL 里删掉指定的 query 键；没有 query 或一个都没删掉时原样返回。 */
export function dropQueryKeys(url: string, keys: Iterable<string>): string {
  const q = url.indexOf("?");
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  let changed = false;
  for (const key of keys) {
    if (!params.has(key)) continue;
    params.delete(key);
    changed = true;
  }
  if (!changed) return url;
  const rest = params.toString();
  return rest ? `${url.slice(0, q)}?${rest}` : url.slice(0, q);
}

type ExpressLikeRequest = IncomingMessage & { originalUrl?: string; _parsedUrl?: unknown; _parsedOriginalUrl?: unknown };

/**
 * 改写 req.url / originalUrl。Express 按 url 懒解析 query 并缓存在 `_parsedUrl` 上，
 * 两个缓存一起清掉，后面的 `req.query` 才会按新 url 重算。
 */
export function rewriteRequestUrl(req: IncomingMessage, rewrite: (url: string) => string): void {
  const r = req as ExpressLikeRequest;
  if (typeof r.url === "string") r.url = rewrite(r.url);
  if (typeof r.originalUrl === "string") r.originalUrl = rewrite(r.originalUrl);
  delete r._parsedUrl;
  delete r._parsedOriginalUrl;
}

/** 挂在最前面：身份校验、路由、DTO 校验看到的都是剥过的 query。 */
export function rendererCommonParamsMiddleware() {
  return (req: IncomingMessage, _res: ServerResponse, next: () => void): void => {
    const url = req.url ?? "";
    const q = url.indexOf("?");
    if (q !== -1 && new URLSearchParams(url.slice(q + 1)).get("device_platform") === "desktop") {
      rewriteRequestUrl(req, (u) => dropQueryKeys(u, RENDERER_COMMON_PARAM_KEYS));
    }
    next();
  };
}
