// restore-canvas-reference-paths.js
import {
  existingCanvasReferencePath,
  findAllMentions,
  parseCanvasReference,
} from "./table-document-to-llm-content.js";

export function restoreCanvasReferencePaths(prompt, paths) {
  const restored = {
    ...paths,
  };
  for (const { path: uri } of findAllMentions(prompt)) {
    const reference = parseCanvasReference(uri);
    if (!reference) continue;
    const kinds =
      reference.target === "entity"
        ? (reference.attachmentKinds ?? [reference.kind])
        : [reference.kind];
    for (const kind of kinds) {
      const bucket = kind === "other" ? "text" : kind;
      if (!existingCanvasReferencePath(reference, restored[bucket]))
        restored[bucket] = [...restored[bucket], uri];
    }
  }
  return restored;
}
