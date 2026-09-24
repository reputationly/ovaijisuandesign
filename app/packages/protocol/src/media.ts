/**
 * 扩展名 → 媒体类型。
 *
 * 注意和旧 Rust 版的差别：`.csv` 是 file 不是 text、没有 `.srt` / `.vtt`、
 * 多了 `.heif` / `.pdf` / `.docx` / `.xlsx` / `.pptx` / `.htable`。
 */
export type MediaType = "image" | "video" | "audio" | "text" | "file";

export const MEDIA_EXTENSIONS: Readonly<Record<string, MediaType>> = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".bmp": "image",
  ".svg": "image",
  ".heic": "image",
  ".heif": "image",
  ".mp4": "video",
  ".mov": "video",
  ".avi": "video",
  ".mkv": "video",
  ".webm": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".aac": "audio",
  ".flac": "audio",
  ".ogg": "audio",
  ".m4a": "audio",
  ".txt": "text",
  ".md": "text",
  ".json": "text",
  ".pdf": "file",
  ".docx": "file",
  ".csv": "file",
  ".xlsx": "file",
  ".pptx": "file",
  // 画布表格节点的内部文档格式。当作普通文件，别被当成 JSON 文本渲染。
  ".htable": "file",
};

/** 按最后一个点之后的扩展名，大小写不敏感。 */
export function detectFileType(filename: string): MediaType {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "file";
  return MEDIA_EXTENSIONS[filename.slice(dot).toLowerCase()] ?? "file";
}

/** 先看 mime，认不出再退回扩展名。 */
export function fileTypeFromMime(mime: string | null | undefined, pathHint?: string): MediaType {
  const fallback = pathHint ? detectFileType(pathHint) : "file";
  if (!mime) return fallback;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "text/markdown" || mime === "text/plain" || mime === "application/json") return "text";
  return fallback;
}

/** 媒体类型 → 工作区里的落盘子目录（`images/` `videos/` …）。 */
export const MEDIA_SUBDIRS: Readonly<Record<MediaType, string>> = {
  image: "images",
  video: "videos",
  audio: "audios",
  text: "texts",
  file: "files",
};

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
};

/** 按扩展名猜 mime。资产库的 `mime_type` 列用它。认不出回 null。 */
export function mimeFromPath(p: string): string | null {
  const dot = p.lastIndexOf(".");
  if (dot < 0) return null;
  return MIME_BY_EXT[p.slice(dot).toLowerCase()] ?? null;
}
