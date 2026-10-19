export const MEDIA_EXTENSIONS = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".bmp": "image",
  ".svg": "image",
  ".heic": "image",
  ".heif": "image",
  ".avif": "image",
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
  // Hub-internal table document — produced by the canvas table node and
  // attached via "add to chat". Treated as a generic file so the chat shows
  // a file-icon chip instead of trying to render the JSON as an image.
  ".htable": "file",
};

export function inferMediaKind(mime, ext) {
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime === "text/markdown" || mime === "text/plain") return "text";
  if (
    mime === "application/pdf" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime === "text/csv"
  )
    return "file";
  if (!ext) return "file";
  const key2 = (ext.startsWith(".") ? ext : `.${ext}`).toLowerCase();
  return MEDIA_EXTENSIONS[key2] ?? "file";
}
