import { inferMediaKind } from "./media-extensions.jsx";
import { extensions } from "@tiptap/core";
export const exactMime = {
  "application/pdf": "pdf",
  "image/vnd.adobe.photoshop": "psd",
  "application/vnd.adobe.photoshop": "psd",
  "image/svg+xml": "svg",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/json": "json",
  "application/zip": "zip"
};
export function extensionOf(filename) {
  const leaf = filename?.split(/[\\/]/).pop() ?? "";
  if (leaf.includes("://") || filename?.includes("://")) return "";
  const dot2 = leaf.lastIndexOf(".");
  const extension2 = dot2 > 0 ? leaf.slice(dot2 + 1).toLowerCase() : "";
  return /^[a-z0-9][a-z0-9_-]*$/.test(extension2) ? extension2 : "";
}
export function broadCategory(kind2) {
  if (kind2 === "image" || kind2 === "video" || kind2 === "audio") return kind2;
  if (kind2 === "text" || kind2 === "subtitle") return "code";
  return void 0;
}
export function classifyFileType({
  filename,
  mime,
  mediaKind: mediaKind2
}) {
  const extension2 = extensionOf(filename);
  const normalizedMime = mime?.split(";", 1)[0]?.trim().toLowerCase();
  const mimeExtension = normalizedMime ? exactMime[normalizedMime] : void 0;
  if (mimeExtension && !(normalizedMime === "text/plain" && extensions.get(extension2) === "code")) {
    return {
      category: extensions.get(mimeExtension) ?? "neutral",
      recognition: "known",
      typeLabel: mimeExtension.toUpperCase()
    };
  }
  const extensionCategory = extensions.get(extension2);
  const inferred = inferMediaKind(normalizedMime, extension2);
  const mimeCategory = normalizedMime && /^(image|video|audio)\//.test(normalizedMime) ? broadCategory(inferred) : void 0;
  const compatible = mimeCategory === extensionCategory || mimeCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector");
  if (mimeCategory && !compatible) {
    return {
      category: mimeCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const hostCategory = broadCategory(mediaKind2);
  const hostCompatible = hostCategory === extensionCategory || hostCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector") || hostCategory === "code" && (extensionCategory === "document" || extensionCategory === "spreadsheet");
  if (!mimeCategory && hostCategory && extensionCategory && !hostCompatible) {
    return {
      category: hostCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const category = extensionCategory ?? hostCategory ?? broadCategory(inferred);
  return {
    category: category ?? "neutral",
    recognition: category ? "known" : extension2 ? "unknown" : "missing",
    typeLabel: extension2.toUpperCase() || "FILE"
  };
}