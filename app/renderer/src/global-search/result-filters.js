// 搜索结果的分组与按类型筛选，纯函数。
import {
  AUDIO_EXTENSIONS,
  CATEGORY_LABEL_FALLBACKS,
  CATEGORY_LABEL_KEYS,
  CATEGORY_ORDER,
  IMAGE_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "./constants.js";
export function groupResults(results) {
  const map = new Map();
  for (const result of results) {
    const list = map.get(result.category) ?? [];
    list.push(result);
    map.set(result.category, list);
  }
  return CATEGORY_ORDER.filter((category) => map.has(category)).map((category) => ({
    id: category,
    labelKey: CATEGORY_LABEL_KEYS[category],
    label: CATEGORY_LABEL_FALLBACKS[category],
    items: map.get(category) ?? [],
  }));
}
export function actionType(result) {
  return result.action?.type ?? result.category;
}
export function isMediaFilter(filter) {
  return filter === "image" || filter === "video" || filter === "text" || filter === "audio";
}
export function resultMatchesPrimaryFilter(result, filter) {
  switch (filter) {
    case "all":
      return true;
    case "project":
    case "hubProject":
    case "session":
    case "file":
      return result.category === filter;
    case "quickAction":
      return (
        result.category === "command" ||
        result.category === "skill" ||
        result.category === "plugin" ||
        result.category === "help"
      );
    case "image":
    case "video":
    case "text":
    case "audio":
      return (
        (result.category === "canvas" || result.category === "file") &&
        inferResultMediaFilter(result) === filter
      );
  }
}
function readStringField(value, key) {
  if (!value || typeof value !== "object") return "";
  const row = value;
  return typeof row[key] === "string" ? row[key] : "";
}
function extensionFromPath(path) {
  const clean = path.split("?")[0] ?? path;
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
}
export function inferResultMediaFilter(result) {
  const data = result.data;
  const rawType = [
    readStringField(data, "type"),
    readStringField(data, "nodeType"),
    readStringField(data, "kind"),
    readStringField(data, "fileType"),
    readStringField(data, "mime"),
  ]
    .join(" ")
    .toLowerCase();
  if (rawType.includes("image") || rawType.includes("img")) return "image";
  if (rawType.includes("video")) return "video";
  if (rawType.includes("audio") || rawType.includes("music")) return "audio";
  if (rawType.includes("text") || rawType.includes("markdown") || rawType.includes("document")) {
    return "text";
  }
  const path = readStringField(data, "path") || result.subtitle || result.title;
  const extension = extensionFromPath(path);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  return null;
}
