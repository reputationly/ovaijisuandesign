// highlight-decoration.js
import { mentionRefLeafText } from "../text-editor/get-wire-content-text.jsx";
import {
  Decoration$1 as Decoration,
  DecorationSet,
  Extension,
  Plugin,
} from "../vendor.js";
import { highlightPluginKey } from "./use-composer-placeholder-actions.jsx";
function textOffsetToPmPos(doc2, textOffset) {
  if (textOffset <= 0) return 1;
  let lowerBound = 1;
  let upperBound = doc2.content.size;
  while (lowerBound < upperBound) {
    const middlePosition = Math.floor((lowerBound + upperBound) / 2);
    const textLength = doc2.textBetween(0, middlePosition, "\n", mentionRefLeafText).length;
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
function buildDecorations(doc2, ranges) {
  if (ranges.length === 0) return DecorationSet.empty;
  const decorations2 = [];
  for (const { start: start2, end: end2, kind, attrs } of ranges) {
    const from2 = textOffsetToPmPos(doc2, start2);
    const endPosition = textOffsetToPmPos(doc2, end2);
    if (from2 >= endPosition || endPosition > doc2.content.size + 1) continue;
    decorations2.push(
      Decoration.inline(
        from2,
        endPosition,
        {
          ...attrs,
          class: [HIGHLIGHT_CLASS[kind], attrs?.class]
            .filter(Boolean)
            .join(" "),
        },
        {
          kind,
        },
      ),
    );
  }
  return DecorationSet.create(doc2, decorations2);
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
            const meta2 = transaction.getMeta(highlightPluginKey);
            if (meta2) {
              return {
                decorations: buildDecorations(transaction.doc, meta2),
                ranges: meta2,
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
          decorations(state2) {
            return (
              highlightPluginKey.getState(state2)?.decorations ??
              DecorationSet.empty
            );
          },
        },
      }),
    ];
  },
});
