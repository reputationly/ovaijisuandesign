/**
 * 按扩展名判断素材类别，拦住“把视频塞进图片槽”这类错位 ——
 * 错位的提交在上游要么报错要么被静默忽略，都白扣一次费。无扩展名的（URL 等）放行。
 */

export type MediaSlot = "image" | "video" | "audio";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic", ".heif"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v", ".flv", ".wmv"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".opus", ".aiff"]);

const SLOT_EXTS: Record<MediaSlot, Set<string>> = { image: IMAGE_EXTS, video: VIDEO_EXTS, audio: AUDIO_EXTS };
export const SLOT_PARAM_NAME: Record<MediaSlot, string> = {
  image: "reference_image_paths",
  video: "reference_video_urls",
  audio: "reference_audio_urls",
};

export function extOf(input: string): string | null {
  const cleaned = input.split("?")[0]?.split("#")[0] ?? "";
  const dot = cleaned.lastIndexOf(".");
  const sep = Math.max(cleaned.lastIndexOf("/"), cleaned.lastIndexOf("\\"));
  return dot < 0 || dot < sep ? null : cleaned.slice(dot).toLowerCase();
}

export function classifyExt(input: string): MediaSlot | null {
  const ext = extOf(input);
  if (!ext) return null;
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (IMAGE_EXTS.has(ext)) return "image";
  return null;
}

export function detectSlotMismatch(inputs: readonly string[] | undefined, slot: MediaSlot): { offender: string; detected: MediaSlot } | null {
  for (const item of inputs ?? []) {
    const detected = typeof item === "string" ? classifyExt(item) : null;
    if (detected && detected !== slot) return { offender: item, detected };
  }
  return null;
}

/** 三个 reference_* 槽各自只收本类文件；返回错误文本或 undefined。 */
export function referenceMediaTypeError(args: {
  reference_image_paths?: readonly string[];
  reference_video_urls?: readonly string[];
  reference_audio_urls?: readonly string[];
}): string | undefined {
  const checks: [MediaSlot, readonly string[] | undefined][] = [
    ["audio", args.reference_audio_urls],
    ["video", args.reference_video_urls],
    ["image", args.reference_image_paths],
  ];
  for (const [slot, values] of checks) {
    const m = detectSlotMismatch(values, slot);
    if (!m) continue;
    return `${SLOT_PARAM_NAME[slot]} expects ${slot} files (${[...SLOT_EXTS[slot]].join(", ")}), but received "${m.offender}" which looks like a ${m.detected} file. Move it to ${SLOT_PARAM_NAME[m.detected]}.`;
  }
  return undefined;
}

const SCALAR_SLOTS: { field: "first_frame_image" | "last_frame_image" | "video_url"; slot: MediaSlot }[] = [
  { field: "first_frame_image", slot: "image" },
  { field: "last_frame_image", slot: "image" },
  { field: "video_url", slot: "video" },
];

export function scalarSlotMismatch(args: Partial<Record<"first_frame_image" | "last_frame_image" | "video_url", string>>) {
  for (const { field, slot } of SCALAR_SLOTS) {
    const v = args[field];
    if (typeof v !== "string" || !v) continue;
    const m = detectSlotMismatch([v], slot);
    if (m) return { field, offender: m.offender, expected: slot, detected: m.detected };
  }
  return null;
}
