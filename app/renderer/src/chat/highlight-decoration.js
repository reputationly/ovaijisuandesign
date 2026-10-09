// highlight-decoration.js
import { mentionRefLeafText } from "../text-editor/get-wire-content-text.jsx";
import { Decoration$1, DecorationSet, Extension, Plugin } from "../vendor.js";
import { highlightPluginKey } from "./use-composer-placeholder-actions.jsx";

function textOffsetToPmPos(doc2, textOffset) {
  if (textOffset <= 0) return 1;
  let lo = 1;
  let hi = doc2.content.size;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const len = doc2.textBetween(0, mid, "\n", mentionRefLeafText).length;
    if (len < textOffset) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

const HIGHLIGHT_CLASS = {
  skill: "hl-skill",
};

function buildDecorations(doc2, ranges) {
  if (ranges.length === 0) return DecorationSet.empty;
  const decorations2 = [];
  for (const { start: start2, end: end2, kind, attrs } of ranges) {
    const from2 = textOffsetToPmPos(doc2, start2);
    const to = textOffsetToPmPos(doc2, end2);
    if (from2 >= to || to > doc2.content.size + 1) continue;
    decorations2.push(
      Decoration$1.inline(
        from2,
        to,
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
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(highlightPluginKey);
            if (meta2) {
              return {
                decorations: buildDecorations(tr2.doc, meta2),
                ranges: meta2,
              };
            }
            if (tr2.docChanged) {
              return {
                decorations: buildDecorations(tr2.doc, prev.ranges),
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
