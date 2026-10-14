// merge-direct-reference-metadata.js
import { SEEDANCE_REFERENCE_AUDIO_EXTS } from "../text-editor/build-asr-gateway-request.js";
import { parseCanvasReference } from "../text-editor/table-document-to-llm-content.js";

export function hasUnsupportedReferenceAudioFormat(path) {
  const reference = parseCanvasReference(path);
  if (reference?.target === "entity") return false;
  const filename = reference?.name ?? path.split("?")[0]?.split("#")[0] ?? "";
  const dot = filename.lastIndexOf(".");
  if (
    dot < 0 ||
    dot < Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"))
  )
    return false;
  return !SEEDANCE_REFERENCE_AUDIO_EXTS.includes(
    filename.slice(dot).toLowerCase(),
  );
}

export function getReferenceVideoDurationsMs(paths, assets, resolutions) {
  return paths.flatMap((path) => {
    if (parseCanvasReference(path)?.target === "entity") {
      const resolution = resolutions.get(path);
      if (resolution?.status !== "available") return [];
      return (resolution.metadata?.attachments ?? [])
        .filter((item) => item.kind === "video")
        .map((item) => Math.round((item.metadata?.duration_sec ?? 0) * 1e3));
    }
    for (const meta of assets.values()) {
      if (
        meta.path === path &&
        meta.type === "video" &&
        meta.durationSec != null &&
        meta.durationSec > 0
      )
        return [Math.round(meta.durationSec * 1e3)];
    }
    return [];
  });
}

export function mergeDirectReferenceMetadata(assets, resolutions) {
  const merged = new Map(assets);
  for (const [path, resolution] of resolutions) {
    if (resolution.status !== "available" || !resolution.metadata) continue;
    const { reference, metadata } = resolution;
    const groups =
      reference.target === "entity"
        ? [...new Set(metadata.attachments.map((item) => item.kind))].map(
            (kind) => ({
              kind,
              media: metadata.attachments
                .filter((item) => item.kind === kind)
                .map((item) => item.metadata),
            }),
          )
        : [
            {
              kind: reference.kind,
              media: [metadata.media],
            },
          ];
    for (const { kind, media } of groups) {
      if (
        kind !== "image" &&
        kind !== "video" &&
        kind !== "audio" &&
        kind !== "text"
      )
        continue;
      const only = media.length === 1 ? media[0] : void 0;
      const durationSec =
        media.length && media.every((item) => item?.duration_sec != null)
          ? media.reduce((total, item) => total + (item?.duration_sec ?? 0), 0)
          : void 0;
      merged.set(`${path}:${kind}`, {
        path,
        name: resolution.name ?? reference.name,
        type: kind,
        url: "",
        durationSec,
        width: only?.width,
        height: only?.height,
        fileSize: only?.file_size,
      });
    }
  }
  return merged;
}
