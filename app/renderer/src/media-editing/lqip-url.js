// lqip-url.js
//
// `MediaReveal` 用到的「原图地址 -> 低清占位图地址」推导。
//
// 单独成模块的原因：它是整套 LQIP 里唯一**不含 React、可直接在 node 里跑**的部分，
// 抽出来才能写单元测试（渲染层目前没有测试运行器）。
// 逻辑与参照 index-B3Ss5vz1.js 的 deriveLqipUrl 完全一致，只是把两个正则/集合常量也放这里。

export const LQIP_PIXEL_WIDTH = 64;
export const LQIP_MAX_BYTES = 48 * 1024;
export const LQIP_MAX_CONCURRENCY = 6;
export const MEDIA_REVEAL_CACHE_LIMIT = 300;
export const LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
export const NON_IMAGE_MEDIA_EXTENSION = /\.(mp4|m4v|mov|webm|mkv|avi|flv|wmv|mpg|mpeg|3gp|ts|mp3|wav|m4a|aac|flac|ogg|oga|opus|wma|aiff?)$/i;
export function deriveLqipUrl(src) {
  if (!src) return void 0;
  let url2;
  try {
    url2 = new URL(src);
  } catch {
    return void 0;
  }
  if (url2.protocol !== "http:" && url2.protocol !== "https:") return void 0;
  if (!LOOPBACK_HOSTS.has(url2.hostname)) return void 0;
  const width = Number.parseInt(url2.searchParams.get("w") ?? "", 10);
  if (!Number.isFinite(width) || width <= LQIP_PIXEL_WIDTH) return void 0;
  if (url2.pathname.startsWith("/api/thumbnail/")) return void 0;
  const filePath = safeDecode(url2.searchParams.get("path") ?? url2.pathname);
  if (NON_IMAGE_MEDIA_EXTENSION.test(filePath)) return void 0;
  url2.searchParams.set("w", String(LQIP_PIXEL_WIDTH));
  url2.searchParams.set("thumbnail_fallback", "error");
  return url2.toString();
}
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
