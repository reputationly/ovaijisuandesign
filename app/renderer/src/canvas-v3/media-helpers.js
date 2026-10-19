/**
 * v3 画布依赖的媒体 URL / 键值小工具 —— 从产物主包逐条取回（第 76 轮）。
 */
import { PROJECT_QUERY_HTTP_ROUTES } from "./canvas-v3-constants.js";
function videoPosterUrl(src, force = false) {
  const match = src.match(
    /^(.*\/api\/v3\/canvas\/)(?:videos|audios|local-files|previews)(\/[^/?#]+\/[^/?#]+)(\?[^#]*)?$/,
  );
  if (!match) return void 0;
  const query = new URLSearchParams(match[3]);
  query.delete("download");
  query.set("w", "512");
  if (force) query.set("force", "1");
  else query.delete("force");
  return `${match[1]}videos${match[2]}/thumbnail?${query}`;
}

const pickerMediaKey = (ref) => JSON.stringify([ref.resourceId, ref.versionId]);

async function probeMedia(fetchImpl, ref, signal) {
  const response = await fetchImpl(PROJECT_QUERY_HTTP_ROUTES.resource_preview, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionId: ref.versionId, mode: "metadata" }),
    signal,
  });
  if (!response.ok) return void 0;
  const preview = await response.json();
  const duration = preview.media?.durationSeconds;
  return preview.versionId === ref.versionId &&
    preview.media &&
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0
    ? preview
    : void 0;
}

export { videoPosterUrl, pickerMediaKey, probeMedia };
