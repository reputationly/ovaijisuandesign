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

function basename$b(p3) {
  const idx = p3.lastIndexOf("/");
  return idx < 0 ? p3 : p3.slice(idx + 1);
}

function findIndex$1(paths, ref) {
  if (paths.length === 0) return -1;
  const exact = paths.indexOf(ref);
  if (exact >= 0) return exact;
  const refBase = basename$b(ref);
  for (let i2 = 0; i2 < paths.length; i2++) {
    if (basename$b(paths[i2]) === refBase) return i2;
  }
  return -1;
}

function resolveAcrossArrays(ref, inputs) {
  const order2 = [
    ["image", inputs.imagePaths],
    ["video", inputs.videoPaths],
    ["audio", inputs.audioPaths],
  ];
  for (const [kind, arr] of order2) {
    const idx = findIndex$1(arr, ref);
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
  for (const m3 of mentions) {
    out += rawText.slice(cursor, m3.start);
    const reference = options.forCharacterCount
      ? parseCanvasReference(m3.path)
      : void 0;
    const resolved = resolveAcrossArrays(m3.path, inputs);
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
      out += rawText.slice(m3.start, m3.end);
      unresolved.push({
        path: m3.path,
      });
    }
    cursor = m3.end;
  }
  out += rawText.slice(cursor);
  return {
    text: out,
    replacedCount,
    unresolved,
  };
}
