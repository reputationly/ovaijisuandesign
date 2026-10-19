// compile-chip-prompt-for-model.js
import {
  findAllMentions,
  isCanvasSubjectReference,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
const KIND_LABEL = {
  image: "图片",
  video: "视频",
  audio: "音频",
};
function basename$b(path) {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
function findIndex(paths, ref) {
  if (paths.length === 0) return -1;
  const exact = paths.indexOf(ref);
  if (exact >= 0) return exact;
  const refBase = basename$b(ref);
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    if (basename$b(paths[pathIndex]) === refBase) return pathIndex;
  }
  return -1;
}
function resolveAcrossArrays(ref, inputs) {
  const order = [
    ["image", inputs.imagePaths],
    ["video", inputs.videoPaths],
    ["audio", inputs.audioPaths],
  ];
  for (const [kind, arr] of order) {
    const idx = findIndex(arr, ref);
    if (idx >= 0)
      return {
        kind,
        index: idx,
      };
  }
  return null;
}
export function compileChipPromptForModel(rawText, inputs, options = {}) {
  if (
    !options.forCharacterCount &&
    [...inputs.imagePaths, ...inputs.videoPaths, ...inputs.audioPaths].some(
      isCanvasSubjectReference,
    )
  )
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  if (!rawText)
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  const mentions = findAllMentions(rawText);
  if (
    !options.forCharacterCount &&
    mentions.some((mention) => isCanvasSubjectReference(mention.path))
  )
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  if (mentions.length === 0) {
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  }
  let out = "";
  let cursor = 0;
  let replacedCount = 0;
  const unresolved = [];
  for (const mention of mentions) {
    out += rawText.slice(cursor, mention.start);
    const reference = options.forCharacterCount
      ? parseCanvasReference(mention.path)
      : void 0;
    const resolved = resolveAcrossArrays(mention.path, inputs);
    if (reference?.target === "entity") {
      out += reference.name;
      replacedCount++;
    } else if (resolved) {
      out += `${KIND_LABEL[resolved.kind]}${resolved.index + 1}`;
      replacedCount++;
    } else if (reference) {
      out += reference.name;
      replacedCount++;
    } else {
      out += rawText.slice(mention.start, mention.end);
      unresolved.push({
        path: mention.path,
      });
    }
    cursor = mention.end;
  }
  out += rawText.slice(cursor);
  return {
    text: out,
    replacedCount,
    unresolved,
  };
}
