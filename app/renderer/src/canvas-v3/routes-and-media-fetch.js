/**
 * v3 画布的路由表与媒体抓取 —— 从产物主包取回（第 81 轮）。
 *
 * - `CANVAS_V3_ROUTES`：v3 画布所有后端路由的单一来源
 * - `fetchPoster`：海报抓取，对 429/502/503/504 最多重试 2 次（每次等 2s，可被 abort）
 * - `fetchGatewayPoster`：校验 content-type 是 image/*，并读 `X-Video-Duration`
 * - `fetchResourceMediaBlob`：优先走宿主 `media.readImage`，否则走 `canvas.request`
 */
// ==== P3 严格归并 ====
import { CANVAS_V3_ROUTES } from "./canvas-v3-model.js";


async function fetchPoster(url2, signal) {
  for (let retry = 0; ; retry++) {
    const response = await fetch(url2, { signal });
    if (![429, 502, 503, 504].includes(response.status) || retry >= 2) return response;
    await response.body?.cancel();
    await new Promise((resolve, reject2) => {
      const abort = () => {
        clearTimeout(timer2);
        reject2(signal.reason);
      };
      const timer2 = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, 2e3);
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    });
  }
}

async function fetchGatewayPoster(url2, signal) {
  const response = await fetchPoster(url2, signal);
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/"))
    throw new Error("Poster unavailable");
  const blob = await response.blob();
  const seconds2 = Number(response.headers.get("X-Video-Duration"));
  return { blob, durationSeconds: Number.isFinite(seconds2) && seconds2 > 0 ? seconds2 : 0 };
}

async function fetchResourceMediaBlob(services2, resourceId2, versionId, kind2, signal) {
  if (kind2 === "image" && services2.media?.readImage)
    return services2.media.readImage(resourceId2, versionId, { signal });
  if (!services2.canvas?.request) throw new Error("CANVAS_REQUEST_UNAVAILABLE");
  const route = kind2 === "video" ? CANVAS_V3_ROUTES.videos : CANVAS_V3_ROUTES.audios;
  const response = await services2.canvas.request(
    `${route}/${encodeURIComponent(resourceId2)}/${encodeURIComponent(versionId)}`,
    { signal }
  );
  if (!response.ok) throw new Error(`MEDIA_FETCH_FAILED:${response.status}`);
  return response.blob();
}

export { CANVAS_V3_ROUTES, fetchPoster, fetchGatewayPoster, fetchResourceMediaBlob };
