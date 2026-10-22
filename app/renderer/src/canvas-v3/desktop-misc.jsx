/**
 * 桌面端两个零散件 —— 从产物主包取回（第 87 轮）。
 *
 * - `canvasV3ImageLuts(fetch)`：LUT 的列取/导入接口（失败时抛带状态码的错误）
 * - `CanvasTagAssetPreview`：标签资源预览，实为 `AssetPreviewPopup` 的薄包装（`side="left"`）
 */
import instance from "i18next";
import { AssetPreviewPopup } from "../assets/preview-media.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { checkTextSafety } from "../workspace/asset-lineage-query-key.js";
import {
  ProjectResourceLifecycle,
  ProjectResourceVersionStatus,
} from "../../../packages/protocol/src/project-v3/resource.ts";

function canvasV3ImageLuts(fetch2) {
  const request = async (path2, options2) => {
    const response = await fetch2(path2, options2);
    if (!response.ok) throw new Error(`CANVAS_V3_LUT_HTTP_${response.status}`);
    return response;
  };
  return {
    async listLuts() {
      const data2 = await (await request("/api/luts")).json();
      if (!Array.isArray(data2.luts)) throw new Error("CANVAS_V3_LUT_INVALID");
      return data2.luts;
    },
    async importLut(file) {
      const body2 = new FormData();
      body2.append("file", file, file.name);
      const data2 = await (await request("/api/luts/import", { method: "POST", body: body2 })).json();
      if (typeof data2.name !== "string" || !data2.name) throw new Error("CANVAS_V3_LUT_INVALID");
      return { name: data2.name };
    },
    async loadLutContent(name2) {
      const data2 = await (await request(`/api/luts/content?name=${encodeURIComponent(name2)}`)).json();
      if (typeof data2.content !== "string") throw new Error("CANVAS_V3_LUT_INVALID");
      return data2.content;
    },
    async deleteLut(name2) {
      await request(`/api/luts/${encodeURIComponent(name2)}`, { method: "DELETE" });
    }
  };
}

export function CanvasTagAssetPreview({ resource }) {
  return <AssetPreviewPopup resource={resource} side="left" />;
}

async function guardUserNameText(name2) {
  const safety = await checkTextSafety(name2);
  if (safety.pass) return true;
  dedupedToast.error(instance.t("rename.safetyBlocked"));
  return false;
}

async function resolveAttachment(resources, ref, signal) {
  const [result] = await resources.getResources(
    [{ resourceId: ref.resourceId, versionId: ref.versionId }],
    { signal }
  );
  if (!result?.ok) throw new Error("CHAT_RESOURCE_UNAVAILABLE");
  const { resource: resource2, version: version2 } = result.detail;
  if (resource2.resourceId !== ref.resourceId || resource2.lifecycle !== ProjectResourceLifecycle.ACTIVE || !version2 || version2.versionId !== ref.versionId || version2.resourceId !== ref.resourceId || version2.status !== ProjectResourceVersionStatus.READY || rejectRelativePath(version2.relativePath)) {
    throw new Error("CHAT_RESOURCE_UNAVAILABLE");
  }
  const basename2 = version2.relativePath.split("/").pop() ?? "";
  return {
    relativePath: version2.relativePath,
    // 4.0.3（验收增量）：优先用 ref 上的名字（调用方传进来的），没有再回退到资源名。
    filename: attachmentFilename(ref.name?.trim() || resource2.name, basename2),
    kind: resource2.kind,
    mimeType: result.detail.metadata?.media?.mimeType ?? "application/octet-stream"
  };
}

function rejectRelativePath(relativePath) {
  return !relativePath || /[\\:]/.test(relativePath) || [...relativePath].some((character) => {
    const code2 = character.charCodeAt(0);
    return code2 < 32 || code2 === 127;
  }) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0].toLowerCase() === ".hilo" || /%[0-9a-f]{2}/i.test(relativePath);
}
function attachmentFilename(resourceName, basename2) {
  const name2 = resourceName.trim();
  if (!name2) return basename2;
  if (/\.[^./]+$/.test(name2)) return name2;
  const extension2 = /\.[^./]+$/.exec(basename2)?.[0];
  return extension2 ? `${name2}${extension2}` : name2;
}

export { canvasV3ImageLuts, guardUserNameText, resolveAttachment };