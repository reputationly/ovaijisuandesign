// merge-direct-reference-metadata.js
import { SEEDANCE_REFERENCE_AUDIO_EXTS } from "../text-editor/build-asr-gateway-request.js";
import { parseCanvasReference } from "../text-editor/table-document-to-llm-content.js";

export function hasUnsupportedReferenceAudioFormat(path2) {
  const reference = parseCanvasReference(path2);
  if (reference?.target === "entity") return false;
  const filename = reference?.name ?? path2.split("?")[0]?.split("#")[0] ?? "";
  const dot2 = filename.lastIndexOf(".");
  if (
    dot2 < 0 ||
    dot2 < Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"))
  )
    return false;
  return !SEEDANCE_REFERENCE_AUDIO_EXTS.includes(
    filename.slice(dot2).toLowerCase(),
  );
}

export function getReferenceVideoDurationsMs(paths, assets, resolutions) {
  return paths.flatMap((path2) => {
    if (parseCanvasReference(path2)?.target === "entity") {
      const row = resolutions.get(path2);
      if (row?.status !== "available") return [];
      return (row.metadata?.attachments ?? [])
        .filter((item) => item.kind === "video")
        .map((item) => Math.round((item.metadata?.duration_sec ?? 0) * 1e3));
    }
    for (const meta2 of assets.values()) {
      if (
        meta2.path === path2 &&
        meta2.type === "video" &&
        meta2.durationSec != null &&
        meta2.durationSec > 0
      )
        return [Math.round(meta2.durationSec * 1e3)];
    }
    return [];
  });
}

export function mergeDirectReferenceMetadata(assets, resolutions) {
  const merged = new Map(assets);
  for (const [path2, row] of resolutions) {
    if (row.status !== "available" || !row.metadata) continue;
    const { reference, metadata } = row;
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
      merged.set(`${path2}:${kind}`, {
        path: path2,
        name: row.name ?? reference.name,
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
