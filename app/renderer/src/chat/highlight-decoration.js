// ==== 逐文件收敛 ====
import { kind } from "../canvas-v3/canvas-v3-model.js";
// highlight-decoration.js
import { mentionRefLeafText } from "../text-editor/get-wire-content-text.jsx";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { highlightPluginKey } from "./use-composer-placeholder-actions.jsx";
function textOffsetToPmPos(doc, textOffset) {
  if (textOffset <= 0) return 1;
  let lowerBound = 1;
  let upperBound = doc.content.size;
  while (lowerBound < upperBound) {
    const middlePosition = Math.floor((lowerBound + upperBound) / 2);
    const textLength = doc.textBetween(0, middlePosition, "\n", mentionRefLeafText).length;
    if (textLength < textOffset) {
      lowerBound = middlePosition + 1;
    } else {
      upperBound = middlePosition;
    }
  }
  return lowerBound;
}
const HIGHLIGHT_CLASS = {
  skill: "hl-skill",
};
function buildDecorations(doc, ranges) {
  if (ranges.length === 0) return DecorationSet.empty;
  const decorations = [];
  for (const { start, end, kind: kind2, attrs } of ranges) {
    const from = textOffsetToPmPos(doc, start);
    const endPosition = textOffsetToPmPos(doc, end);
    if (from >= endPosition || endPosition > doc.content.size + 1) continue;
    decorations.push(
      Decoration.inline(
        from,
        endPosition,
        {
          ...attrs,
          class: [HIGHLIGHT_CLASS[kind], attrs?.class]
            .filter(Boolean)
            .join(" "),
        },
        {
          kind:kind,
        },
      ),
    );
  }
  return DecorationSet.create(doc, decorations);
}
export const HighlightDecoration = Extension.create({
  name: "chatHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: highlightPluginKey,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              ranges: [],
            };
          },
          apply(transaction, prev) {
            const meta = transaction.getMeta(highlightPluginKey);
            if (meta) {
              return {
                decorations: buildDecorations(transaction.doc, meta),
                ranges: meta,
              };
            }
            if (transaction.docChanged) {
              return {
                decorations: buildDecorations(transaction.doc, prev.ranges),
                ranges: prev.ranges,
              };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            return (
              highlightPluginKey.getState(state)?.decorations ??
              DecorationSet.empty
            );
          },
        },
      }),
    ];
  },
});
