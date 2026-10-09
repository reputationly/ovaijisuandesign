// diff-review-highlight.js
import { Extension, Plugin, DecorationSet, Decoration$1 } from "../vendor.js";
import {
  DIFF_ADD_CLASS,
  DIFF_CONTROLS_CLASS,
  DIFF_DEL_CLASS,
  DIFF_DEL_INLINE_CLASS,
  buildControls,
  diffReviewPluginKey,
} from "./code-mirror-source-editor.jsx";
function buildDeletedBlock(hunk, config2) {
  const block = document.createElement("div");
  block.className = DIFF_DEL_CLASS;
  block.setAttribute("data-diff-del-for", hunk.id);
  block.contentEditable = "false";
  const rendered = config2.renderMarkdown(hunk.deletedMarkdown, hunk.deletedContext);
  if (rendered) {
    rendered.classList.add(`${DIFF_DEL_CLASS}-content`);
    block.appendChild(rendered);
  } else {
    const fallback = document.createElement("div");
    fallback.className = `${DIFF_DEL_CLASS}-content ${DIFF_DEL_CLASS}-plain`;
    fallback.textContent = hunk.deletedMarkdown;
    block.appendChild(fallback);
  }
  return block;
}
function buildDeletedInline(hunk, config2) {
  const inline2 = document.createElement("span");
  inline2.className = DIFF_DEL_INLINE_CLASS;
  inline2.setAttribute("data-diff-del-for", hunk.id);
  inline2.contentEditable = "false";
  const rendered = config2.renderMarkdown(hunk.deletedMarkdown, hunk.deletedContext);
  const onlyBlock = rendered?.childElementCount === 1 ? rendered.firstElementChild : null;
  if (onlyBlock?.matches("p,h1,h2,h3,h4,h5,h6")) {
    while (onlyBlock.firstChild) inline2.appendChild(onlyBlock.firstChild);
  } else {
    inline2.textContent = rendered?.textContent || hunk.deletedMarkdown;
  }
  return inline2;
}
function topLevelBlockAt(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    if ($pos.depth === 0) return null;
    return {
      from: $pos.before(1),
      to: $pos.after(1),
      node: $pos.node(1),
    };
  } catch {
    return null;
  }
}
function isInlineTextReplacement(doc2, hunk) {
  if (hunk.zeroWidth || !hunk.deletedMarkdown || hunk.deletedMarkdown.includes("\n")) return false;
  try {
    const $from = doc2.resolve(hunk.from);
    const $to = doc2.resolve(hunk.to);
    if (!$from.sameParent($to) || !$from.parent.isTextblock) return false;
    const parent = $from.parent;
    const fromOffset = $from.parentOffset;
    const toOffset = $to.parentOffset;
    const charBefore2 =
      fromOffset > 0 ? parent.textBetween(fromOffset - 1, fromOffset, void 0, "") : "";
    const charAfter2 =
      toOffset < parent.content.size ? parent.textBetween(toOffset, toOffset + 1, void 0, "") : "";
    const startsLine = fromOffset === 0 || charBefore2 === "\n";
    const endsLine = toOffset === parent.content.size || charAfter2 === "\n";
    return !(startsLine && endsLine);
  } catch {
    return false;
  }
}
function paragraphLinePlacement(doc2, hunk) {
  try {
    const $from = doc2.resolve(hunk.from);
    const $to = doc2.resolve(hunk.to);
    if (!$from.sameParent($to) || $from.parent.type.name !== "paragraph") return null;
    const parent = $from.parent;
    const fromOffset = $from.parentOffset;
    const toOffset = $to.parentOffset;
    if (hunk.zeroWidth && fromOffset === 0 && $from.depth > 0) {
      const boundary = $from.before(1);
      return {
        delPos: boundary,
        ctlPos: boundary,
      };
    }
    if (hunk.zeroWidth && fromOffset === parent.content.size && $from.depth > 0) {
      const boundary = $from.after(1);
      return {
        delPos: boundary,
        ctlPos: boundary,
      };
    }
    if (!parent.textContent.includes("\n")) return null;
    const charBefore2 =
      fromOffset > 0 ? parent.textBetween(fromOffset - 1, fromOffset, void 0, "") : "";
    const charAfter2 =
      toOffset < parent.content.size ? parent.textBetween(toOffset, toOffset + 1, void 0, "") : "";
    const startsLine = fromOffset === 0 || charBefore2 === "\n";
    const endsLine = toOffset === parent.content.size || charAfter2 === "\n";
    const deletionAtLineBoundary =
      hunk.zeroWidth &&
      (fromOffset === 0 ||
        fromOffset === parent.content.size ||
        charBefore2 === "\n" ||
        charAfter2 === "\n");
    const additionEndingLine = !hunk.zeroWidth && hunk.deletedMarkdown === "" && endsLine;
    return (hunk.zeroWidth && deletionAtLineBoundary) ||
      (!hunk.zeroWidth && startsLine && endsLine) ||
      additionEndingLine
      ? {
          delPos: hunk.from,
          ctlPos: hunk.to,
        }
      : null;
  } catch {
    return null;
  }
}
function buildControlsRow(ids2, config2) {
  const row = document.createElement("div");
  row.className = `${DIFF_CONTROLS_CLASS}-row`;
  row.contentEditable = "false";
  row.appendChild(buildControls(ids2, config2));
  return row;
}
export const DiffReviewHighlight = Extension.create({
  name: "canvasDiffReview",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: diffReviewPluginKey,
        state: {
          init() {
            return {
              hunks: [],
              config: null,
            };
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(diffReviewPluginKey);
            let next2 = prev;
            if (meta2) {
              next2 =
                meta2.kind === "clear"
                  ? {
                      hunks: [],
                      config: null,
                    }
                  : {
                      hunks: meta2.hunks,
                      config: meta2.config,
                    };
            }
            if (tr2.docChanged && next2.hunks.length > 0) {
              next2 = {
                ...next2,
                hunks: next2.hunks.map((hunk) => ({
                  ...hunk,
                  from: tr2.mapping.map(hunk.from, -1),
                  to: tr2.mapping.map(hunk.to, 1),
                })),
              };
            }
            return next2;
          },
        },
        props: {
          decorations(state2) {
            const pluginState = diffReviewPluginKey.getState(state2);
            if (!pluginState || pluginState.hunks.length === 0 || !pluginState.config) {
              return DecorationSet.empty;
            }
            const config2 = pluginState.config;
            const docSize = state2.doc.content.size;
            const decorations2 = [];
            const tableGroups = new Map();
            const controlIdOf = (hunk) => hunk.controlId ?? hunk.id;
            for (const hunk of pluginState.hunks) {
              if (hunk.from > docSize || hunk.to > docSize || hunk.from > hunk.to) continue;
              if (!hunk.zeroWidth && hunk.from === hunk.to) continue;
              if (hunk.from < hunk.to) {
                decorations2.push(
                  Decoration$1.inline(hunk.from, hunk.to, {
                    class: DIFF_ADD_CLASS,
                    "data-diff-hunk-id": hunk.id,
                  }),
                );
              }
              const topLevel = topLevelBlockAt(state2.doc, hunk.from);
              const belongsToTable =
                topLevel?.node.type.name === "table" &&
                hunk.from >= topLevel.from &&
                hunk.to <= topLevel.to;
              if (topLevel && belongsToTable) {
                const groupKey = `${topLevel.from}:${topLevel.to}`;
                const group = tableGroups.get(groupKey) ?? {
                  to: topLevel.to,
                  controlIds: [],
                };
                const controlId = controlIdOf(hunk);
                if (!group.controlIds.includes(controlId)) group.controlIds.push(controlId);
                tableGroups.set(groupKey, group);
                if (hunk.deletedMarkdown) {
                  decorations2.push(
                    Decoration$1.widget(hunk.from, () => buildDeletedInline(hunk, config2), {
                      side: -1,
                      key: `diff-del-inline-${hunk.id}`,
                      stopEvent: () => true,
                    }),
                  );
                }
                continue;
              }
              const inlineDeleted = isInlineTextReplacement(state2.doc, hunk);
              if (inlineDeleted) {
                decorations2.push(
                  Decoration$1.widget(hunk.from, () => buildDeletedInline(hunk, config2), {
                    side: -1,
                    key: `diff-del-inline-${hunk.id}`,
                    stopEvent: () => true,
                  }),
                );
              }
              let delPos = hunk.from;
              let ctlPos = hunk.to;
              const linePlacement = paragraphLinePlacement(state2.doc, hunk);
              if (linePlacement) {
                delPos = linePlacement.delPos;
                ctlPos = linePlacement.ctlPos;
              } else {
                try {
                  const $from = state2.doc.resolve(hunk.from);
                  if ($from.depth > 0) delPos = $from.before(1);
                  const $to = state2.doc.resolve(hunk.to);
                  if ($to.depth > 0) ctlPos = $to.after(1);
                } catch {
                  continue;
                }
              }
              if (hunk.deletedMarkdown && !inlineDeleted) {
                decorations2.push(
                  Decoration$1.widget(delPos, () => buildDeletedBlock(hunk, config2), {
                    side: -1,
                    key: `diff-del-${hunk.id}`,
                    stopEvent: () => true,
                  }),
                );
              }
              decorations2.push(
                Decoration$1.widget(ctlPos, () => buildControlsRow([controlIdOf(hunk)], config2), {
                  // Adjacent line edits can share one PM position: the prior
                  // replacement ends exactly where the next deletion starts.
                  // Keep the prior control before that deletion (-2 < -1),
                  // while a zero-width deletion keeps its own control after
                  // its red widget (-1 < 1).
                  side: !hunk.zeroWidth ? -2 : 1,
                  key: `diff-ctl-${hunk.id}-${config2.disabled ? "off" : "on"}`,
                  stopEvent: () => true,
                }),
              );
            }
            for (const group of tableGroups.values()) {
              const ids2 = group.controlIds;
              decorations2.push(
                Decoration$1.widget(group.to, () => buildControlsRow(ids2, config2), {
                  side: 1,
                  key: `diff-table-ctl-${ids2.join("-")}-${config2.disabled ? "off" : "on"}`,
                  stopEvent: () => true,
                }),
              );
            }
            return DecorationSet.create(state2.doc, decorations2);
          },
        },
      }),
    ];
  },
});
export function setDiffReviewHunks(editor, hunks, config2) {
  editor.view.dispatch(
    editor.state.tr.setMeta(diffReviewPluginKey, {
      kind: "set",
      hunks,
      config: config2,
    }),
  );
}
export function clearDiffReviewHunks(editor) {
  const state2 = diffReviewPluginKey.getState(editor.state);
  if (!state2 || (state2.hunks.length === 0 && !state2.config)) return;
  editor.view.dispatch(
    editor.state.tr.setMeta(diffReviewPluginKey, {
      kind: "clear",
    }),
  );
}
function getDiffReviewHunks(editor) {
  return diffReviewPluginKey.getState(editor.state)?.hunks ?? [];
}
export function scrollToDiffHunk(editor, hunkId) {
  const hunk = getDiffReviewHunks(editor).find((candidate) => candidate.id === hunkId);
  if (!hunk) return;
  const dom = editor.view.dom.querySelector(
    `[data-diff-del-for="${CSS.escape(hunkId)}"], [data-diff-hunk-id="${CSS.escape(hunkId)}"]`,
  );
  if (dom) {
    dom.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    return;
  }
  try {
    const coords = editor.view.coordsAtPos(Math.min(hunk.from, editor.state.doc.content.size));
    const scroller =
      editor.view.dom.closest("[data-diff-scroll-root]") ?? editor.view.dom.parentElement;
    if (scroller instanceof HTMLElement) {
      scroller.scrollTo({
        top:
          coords.top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop -
          scroller.clientHeight / 2,
        behavior: "smooth",
      });
    }
  } catch {}
}
export const MAX_FIND_MATCHES = 1e4;
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;
export function compileFindPattern(query, options) {
  if (!query) return null;
  const source = options.regex ? query : query.replace(REGEX_ESCAPE, "\\$&");
  const flags = options.matchCase ? "g" : "gi";
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}
const WORD_CHAR = /[\p{L}\p{N}_]/u;
function isWordChar(ch) {
  return ch != null && WORD_CHAR.test(ch);
}
function isWholeWordMatch(text2, from2, to) {
  const before = text2[from2 - 1];
  const after = text2[to];
  const first2 = text2[from2];
  const last2 = text2[to - 1];
  if (isWordChar(before) && isWordChar(first2)) return false;
  if (isWordChar(after) && isWordChar(last2)) return false;
  return true;
}
export function findMatchesInText(text2, query, options, opts) {
  const pattern = opts?.pattern ?? compileFindPattern(query, options);
  if (!pattern)
    return {
      matches: [],
      limited: false,
    };
  pattern.lastIndex = 0;
  const maxMatches = opts?.maxMatches ?? MAX_FIND_MATCHES;
  const baseOffset = opts?.baseOffset ?? 0;
  const matches2 = [];
  let limited = false;
  let m3 = pattern.exec(text2);
  while (m3 != null) {
    if (m3[0].length === 0) {
      pattern.lastIndex += 1;
    } else {
      const from2 = m3.index;
      const to = m3.index + m3[0].length;
      if (!options.wholeWord || isWholeWordMatch(text2, from2, to)) {
        matches2.push({
          from: from2 + baseOffset,
          to: to + baseOffset,
        });
        if (matches2.length >= maxMatches) {
          limited = true;
          break;
        }
      }
    }
    m3 = pattern.exec(text2);
  }
  return {
    matches: matches2,
    limited,
  };
}
export function pickInitialMatchIndex(matches2, caretPos) {
  if (matches2.length === 0) return -1;
  for (let i2 = 0; i2 < matches2.length; i2++) {
    if (matches2[i2].from >= caretPos) return i2;
  }
  return 0;
}
export function stepMatchIndex(current2, total, dir) {
  if (total <= 0) return -1;
  if (current2 < 0) return dir === 1 ? 0 : total - 1;
  return (current2 + dir + total) % total;
}
function expandReplacement(m3, replacement) {
  return replacement.replace(/\$(\$|&|\d{1,2})/g, (full, token2) => {
    if (token2 === "$") return "$";
    if (token2 === "&") return m3[0];
    const n2 = Number(token2);
    if (m3[n2] !== void 0) return m3[n2];
    if (token2.length === 2) {
      const first2 = Number(token2[0]);
      if (m3[first2] !== void 0) return m3[first2] + token2[1];
    }
    return full;
  });
}
function computeReplacementWith(pattern, matchedText, replacement) {
  if (!pattern) return replacement;
  pattern.lastIndex = 0;
  const m3 = pattern.exec(matchedText);
  if (!m3 || m3.index !== 0 || m3[0].length !== matchedText.length) return replacement;
  return expandReplacement(m3, replacement);
}
export function computeReplacement(matchedText, query, options, replacement) {
  if (!options.regex) return replacement;
  return computeReplacementWith(compileFindPattern(query, options), matchedText, replacement);
}
export function replaceAllInText(text2, query, options, replacement, maxMatches) {
  const pattern = compileFindPattern(query, options);
  if (!pattern)
    return {
      text: text2,
      count: 0,
    };
  const { matches: matches2 } = findMatchesInText(text2, query, options, {
    maxMatches: Number.POSITIVE_INFINITY,
    pattern,
  });
  if (matches2.length === 0)
    return {
      text: text2,
      count: 0,
    };
  let out = "";
  let last2 = 0;
  for (const m3 of matches2) {
    const matched = text2.slice(m3.from, m3.to);
    out +=
      text2.slice(last2, m3.from) +
      (options.regex ? computeReplacementWith(pattern, matched, replacement) : replacement);
    last2 = m3.to;
  }
  out += text2.slice(last2);
  return {
    text: out,
    count: matches2.length,
  };
}
