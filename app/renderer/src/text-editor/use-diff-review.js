// use-diff-review.js
import {
  hashDiffReviewMarkdown,
  reconstructDiffReviewBaseline,
} from "./build-decorations.js";
import { diffReviewPluginKey } from "./build-controls.js";
import {
  closeDiffReviewHistoryGroup,
  DIFF_REVIEW_SYNC_META,
  DiffReviewHistoryStep,
  getDiffReviewHistorySnapshot,
  LEAF_PLACEHOLDER,
  recordFinalizedBoundary,
  replaceEditorMarkdown,
  restoreEditorSelection,
  rewindReviewHistory,
  selectionFromSnapshot,
  selectionNearPosition,
} from "./scrollable-markdown-table-view.js";
import { closeHistory } from "prosemirror-history";
import { DOMSerializer, Node } from "prosemirror-model";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { recordProvisionalDiffReviewHistory } from "./record-provisional-diff-review-history.js";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { selectPendingHunksForNode } from "./annotation-gutter.jsx";
const FENCE_RE = /^(\s*)(```|~~~)/;
const TABLE_DELIM_RE = /^\s*\|?[\s:|-]+\|?\s*$/;
const BLOCK_PREFIX_RE =
  /^(\s*)((?:>\s*)*)((?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?|#{1,6}\s+)?/;
function pushChar(normalizeMap, ch, rawOffset, isSynthetic) {
  if (ch === " ") {
    const last = normalizeMap.normalized.length - 1;
    if (last < 0 || normalizeMap.normalized[last] === " ") {
      if (last >= 0 || isSynthetic) return;
    }
  }
  normalizeMap.normalized.push(ch);
  normalizeMap.normToRaw.push(rawOffset);
  normalizeMap.synthetic.push(isSynthetic);
}
function findStrippableDelimiters(line) {
  const strip = new Array(line.length).fill(false);
  const openByToken = new Map();
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch !== "*" && ch !== "_" && ch !== "~" && ch !== "`") continue;
    const two = line.slice(i, i + 2);
    let token;
    if (two === "**" || two === "__" || two === "~~") {
      token = two;
    } else if (ch === "*" || ch === "`") {
      token = ch;
    } else {
      continue;
    }
    const open = openByToken.get(token);
    if (open === void 0) {
      openByToken.set(token, i);
    } else {
      for (let charIndex = 0; charIndex < token.length; charIndex++) {
        strip[open + charIndex] = true;
        strip[i + charIndex] = true;
      }
      openByToken.delete(token);
    }
    i += token.length - 1;
  }
  return strip;
}
function findBracketClose(line, open) {
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === "[") depth += 1;
    else if (line[i] === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function matchParen(line, openIndex) {
  if (line[openIndex] !== "(") return -1;
  let depth = 0;
  for (let i = openIndex; i < line.length; i++) {
    if (line[i] === "(") depth += 1;
    else if (line[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function pushInline(normalizeMap, line, lineStart, from, strippable) {
  const strip = strippable ?? findStrippableDelimiters(line);
  let i = from;
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];
    if ((ch === "*" || ch === "_" || ch === "~" || ch === "`") && strip[i]) {
      i += 1;
      continue;
    }
    if (ch === "!" && next === "[") {
      const closeIndex = findBracketClose(line, i + 1);
      if (closeIndex >= 0) {
        const paren = matchParen(line, closeIndex + 1);
        if (paren >= 0) {
          pushChar(normalizeMap, " ", lineStart + i, true);
          i = paren + 1;
          continue;
        }
      }
    }
    if (ch === "[") {
      const closeIndex = findBracketClose(line, i);
      if (closeIndex >= 0) {
        const paren = matchParen(line, closeIndex + 1);
        if (paren >= 0) {
          pushInline(normalizeMap, line.slice(0, closeIndex), lineStart, i + 1, strip);
          i = paren + 1;
          continue;
        }
      }
    }
    if (ch === "<") {
      const brMatch = /^<br\s*\/?>/i.exec(line.slice(i));
      if (brMatch) {
        pushChar(normalizeMap, " ", lineStart + i, true);
        i += brMatch[0].length;
        continue;
      }
    }
    if (ch === "|") {
      pushChar(normalizeMap, " ", lineStart + i, true);
      i += 1;
      continue;
    }
    if (ch === "\\" && next && "\\`*_{}[]()#+-.!|~>".includes(next)) {
      pushChar(normalizeMap, next, lineStart + i + 1, false);
      i += 2;
      continue;
    }
    pushChar(normalizeMap, ch === "	" ? " " : ch, lineStart + i, ch === "	");
    i += 1;
  }
}
function buildMarkdownNormalizeMap(raw) {
  const normalizeMap = {
    normalized: [],
    normToRaw: [],
    synthetic: [],
  };
  const lines = raw.split("\n");
  let inFence = false;
  let offset = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineStart = offset;
    offset += line.length + 1;
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      pushChar(normalizeMap, " ", lineStart, true);
      continue;
    }
    if (inFence) {
      for (let i = 0; i < line.length; i++)
        pushChar(normalizeMap, line[i], lineStart + i, false);
      pushChar(normalizeMap, " ", lineStart + line.length, true);
      continue;
    }
    if (line.includes("|") && line.includes("-") && TABLE_DELIM_RE.test(line)) {
      pushChar(normalizeMap, " ", lineStart, true);
      continue;
    }
    if (/^\s*(?:[-*_]\s*){3,}$/.test(line) && line.trim().length >= 3) {
      pushChar(normalizeMap, " ", lineStart, true);
      continue;
    }
    const prefix = BLOCK_PREFIX_RE.exec(line);
    const contentFrom = prefix ? prefix[0].length : 0;
    pushInline(normalizeMap, line, lineStart, contentFrom);
    pushChar(normalizeMap, " ", lineStart + line.length, true);
  }
  while (
    normalizeMap.normalized.length > 0 &&
    normalizeMap.normalized[normalizeMap.normalized.length - 1] === " " &&
    normalizeMap.synthetic[normalizeMap.synthetic.length - 1]
  ) {
    normalizeMap.normalized.pop();
    normalizeMap.normToRaw.pop();
    normalizeMap.synthetic.pop();
  }
  return {
    normalized: normalizeMap.normalized.join(""),
    normToRaw: normalizeMap.normToRaw,
    synthetic: normalizeMap.synthetic,
  };
}
function collapseRenderedText(text) {
  return text.replace(/\s+/g, " ");
}
const INLINE_MARK_CHARS = new Set(["*", "~", "`"]);
function stripInlineMarkChars(text) {
  let out = "";
  for (const ch of text) {
    if (!INLINE_MARK_CHARS.has(ch)) out += ch;
  }
  return out;
}
function stripInlineMarkCharsWithMap(text) {
  const chars = [];
  const map = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (INLINE_MARK_CHARS.has(ch)) continue;
    chars.push(ch);
    map.push(i);
  }
  return {
    stripped: chars.join(""),
    map,
  };
}
const DIFF_CONTEXT_START = "";
const DIFF_CONTEXT_END = "";
const EXPLICIT_BLOCK_PREFIX_RE = /^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~)/;
function parseMarkdownDocument(editor, markdown) {
  try {
    const manager = editor.storage.markdown?.manager;
    if (!manager) return null;
    const json = manager.parse(markdown);
    if (!json || typeof json !== "object") return null;
    return Node.fromJSON(editor.schema, json);
  } catch {
    return null;
  }
}
function serializeMarkdownDocument(editor, doc) {
  try {
    const container = document.createElement("div");
    container.appendChild(
      DOMSerializer.fromSchema(editor.schema).serializeFragment(doc.content),
    );
    return container;
  } catch {
    return null;
  }
}
function serializeMarkdownNode(editor, node) {
  try {
    const container = document.createElement("div");
    container.appendChild(
      DOMSerializer.fromSchema(editor.schema).serializeNode(node),
    );
    return container;
  } catch {
    return null;
  }
}
function findMarkerPosition(doc, marker) {
  let found = null;
  doc.descendants((node, pos) => {
    if (found !== null || !node.isText) return;
    const index = node.text?.indexOf(marker) ?? -1;
    if (index >= 0) found = pos + index;
  });
  return found;
}
function extractContextualTextblock(editor, context) {
  if (EXPLICIT_BLOCK_PREFIX_RE.test(context.sourceMarkdown.trimStart()))
    return null;
  const source = `${context.prefix}${context.sourceMarkdown}${context.suffix}`;
  if (source.includes(DIFF_CONTEXT_START) || source.includes(DIFF_CONTEXT_END))
    return null;
  const contextualDoc = parseMarkdownDocument(
    editor,
    `${context.prefix}${DIFF_CONTEXT_START}${context.sourceMarkdown}${DIFF_CONTEXT_END}${context.suffix}`,
  );
  if (!contextualDoc) return null;
  const start = findMarkerPosition(contextualDoc, DIFF_CONTEXT_START);
  const end = findMarkerPosition(contextualDoc, DIFF_CONTEXT_END);
  if (
    start === null ||
    end === null ||
    end < start + DIFF_CONTEXT_START.length
  )
    return null;
  const from = start + DIFF_CONTEXT_START.length;
  const $from = contextualDoc.resolve(from);
  const $to = contextualDoc.resolve(end);
  if (!$from.sameParent($to) || !$from.parent.isTextblock) return null;
  return {
    block: $from.parent,
    content: contextualDoc.slice(from, end).content,
  };
}
function rebuildSoleTextblock(node, content) {
  try {
    if (node.isTextblock)
      return node.type.create(node.attrs, content, node.marks);
    if (node.childCount !== 1) return null;
    const child = rebuildSoleTextblock(node.child(0), content);
    return child ? node.type.create(node.attrs, child, node.marks) : null;
  } catch {
    return null;
  }
}
function renderDeletedMarkdown(editor, markdown, context) {
  if (editor.isDestroyed) return null;
  const standaloneDoc = parseMarkdownDocument(editor, markdown);
  if (context) {
    const contextual = extractContextualTextblock(editor, context);
    if (contextual) {
      const standaloneTop =
        standaloneDoc?.childCount === 1 ? standaloneDoc.firstChild : null;
      const template =
        standaloneTop?.type.name === "paragraph" &&
        contextual.block.type.name !== "paragraph"
          ? contextual.block
          : (standaloneTop ?? contextual.block);
      const contextualNode =
        rebuildSoleTextblock(template, contextual.content) ??
        rebuildSoleTextblock(contextual.block, contextual.content);
      if (contextualNode) {
        const rendered = serializeMarkdownNode(editor, contextualNode);
        if (rendered) return rendered;
      }
    }
  }
  return standaloneDoc
    ? serializeMarkdownDocument(editor, standaloneDoc)
    : null;
}
function isInsideTableCell(doc, pos) {
  try {
    const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
    for (let depth = $pos.depth; depth > 0; depth--) {
      const nodeTypeName = $pos.node(depth).type.name;
      if (nodeTypeName === "tableCell" || nodeTypeName === "tableHeader") return true;
    }
  } catch {}
  return false;
}
function buildDocTextIndex(doc) {
  const segments = [];
  const parts = [];
  let textStart = 0;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(
      0,
      node.content.size,
      void 0,
      LEAF_PLACEHOLDER,
    );
    segments.push({
      textStart,
      pmStart: pos + 1,
      length: text.length,
      isTableCell: isInsideTableCell(doc, pos + 1),
    });
    parts.push(text);
    textStart += text.length + 1;
    return false;
  });
  return {
    text: parts.join("\n"),
    segments,
  };
}
function toPmPos(index, offset, bias) {
  const { segments } = index;
  if (segments.length === 0) return null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segEnd = seg.textStart + seg.length;
    if (offset < seg.textStart) {
      if (bias === "start") return seg.pmStart;
      const prev = segments[i - 1];
      return prev ? prev.pmStart + prev.length : seg.pmStart;
    }
    if (offset <= segEnd) {
      return seg.pmStart + (offset - seg.textStart);
    }
  }
  const last = segments[segments.length - 1];
  return last.pmStart + last.length;
}
function collapseWithMap(text) {
  const chars = [];
  const map = [];
  let pendingSpace = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (
      ch === " " ||
      ch === "\n" ||
      ch === "	" ||
      ch === "\r" ||
      ch === LEAF_PLACEHOLDER
    ) {
      if (pendingSpace < 0) pendingSpace = i;
      continue;
    }
    if (pendingSpace >= 0 && chars.length > 0) {
      chars.push(" ");
      map.push(pendingSpace);
    }
    pendingSpace = -1;
    chars.push(ch);
    map.push(i);
  }
  return {
    collapsed: chars.join(""),
    map,
  };
}
function normalizeMarkdownSnippet(markdown) {
  if (!markdown) return "";
  return collapseRenderedText(
    buildMarkdownNormalizeMap(markdown).normalized,
  ).trim();
}
const TABLE_DELIM_LINE = /^[|\s:-]+$/;
function parseTableRowCells(markdown) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;
  const cells = [];
  for (const line of lines) {
    if (!line.includes("|")) return null;
    if (TABLE_DELIM_LINE.test(line) && line.includes("-")) continue;
    let parts = line.split("|");
    if (parts.length > 0 && parts[0]?.trim() === "") parts = parts.slice(1);
    if (parts.length > 0 && parts[parts.length - 1]?.trim() === "")
      parts = parts.slice(0, -1);
    for (const part of parts) cells.push(part.trim());
  }
  return cells.length > 0 ? cells : null;
}
function splitTableHunkCells(index, hunk, textFrom, textTo) {
  const overlaps = (seg) =>
    Math.max(seg.textStart, textFrom) <
    Math.min(seg.textStart + seg.length, textTo);
  const covered = index.segments.filter(
    (seg) => seg.isTableCell && overlaps(seg),
  );
  if (covered.length < 2) return null;
  if (index.segments.some((seg) => !seg.isTableCell && overlaps(seg)))
    return null;
  const oldCells = parseTableRowCells(hunk.originalText);
  const newCells = parseTableRowCells(hunk.replacement);
  if (!oldCells || !newCells) return null;
  if (oldCells.length !== covered.length || newCells.length !== covered.length)
    return null;
  const cells = [];
  for (let i = 0; i < covered.length; i++) {
    const seg = covered[i];
    const oldCell = oldCells[i];
    const newCell = newCells[i];
    const docCellText = index.text.slice(
      seg.textStart,
      seg.textStart + seg.length,
    );
    if (
      normalizeMarkdownSnippet(docCellText) !==
      normalizeMarkdownSnippet(newCell)
    )
      return null;
    if (normalizeMarkdownSnippet(oldCell) === normalizeMarkdownSnippet(newCell))
      continue;
    const cellFrom = toPmPos(
      index,
      Math.max(seg.textStart, textFrom),
      "start",
    );
    const cellTo = toPmPos(
      index,
      Math.min(seg.textStart + seg.length, textTo),
      "end",
    );
    if (cellFrom === null || cellTo === null || cellTo <= cellFrom) return null;
    cells.push({
      from: cellFrom,
      to: cellTo,
      deletedMarkdown: oldCell,
    });
  }
  return cells.length > 0 ? cells : null;
}
function collectOccurrences(haystack, needle, cap = 50) {
  const out = [];
  let cursor = 0;
  while (out.length < cap) {
    const idx = haystack.indexOf(needle, cursor);
    if (idx < 0) break;
    out.push(idx);
    cursor = idx + 1;
  }
  return out;
}
const CONTEXT_PROBE_CHARS = 14;
function locateDeletionPoint(
  index,
  collapsed,
  map,
  prefixProbe,
  suffixProbe,
) {
  if (prefixProbe) {
    const candidates = collectOccurrences(collapsed, prefixProbe);
    for (const idx of candidates) {
      const end = idx + prefixProbe.length;
      const suffixIndex = suffixProbe
        ? collapsed.indexOf(suffixProbe, end)
        : -1;
      if (suffixProbe && (suffixIndex < end || suffixIndex > end + 1))
        continue;
      const sourceOffset =
        suffixIndex >= 0
          ? map[suffixIndex]
          : map[end - 1] !== void 0
            ? map[end - 1] + 1
            : void 0;
      if (sourceOffset === void 0) continue;
      const pm = toPmPos(
        index,
        sourceOffset,
        suffixIndex >= 0 ? "start" : "end",
      );
      return pm !== null
        ? {
            from: pm,
            to: pm,
          }
        : null;
    }
    return null;
  }
  if (suffixProbe) {
    const idx = collapsed.indexOf(suffixProbe);
    if (idx < 0) return null;
    const first = map[idx];
    if (first === void 0) return null;
    const pm = toPmPos(index, first, "start");
    return pm !== null
      ? {
          from: pm,
          to: pm,
        }
      : null;
  }
  return null;
}
function locateHunksInDoc(doc, hunks) {
  const result = new Map();
  if (hunks.length === 0) return result;
  const index = buildDocTextIndex(doc);
  const { collapsed, map } = collapseWithMap(index.text);
  const usedRanges = [];
  const overlapsUsed = (from, to) =>
    usedRanges.some((usedRange) => Math.max(usedRange.from, from) < Math.min(usedRange.to, to));
  for (const hunk of hunks) {
    const needle = normalizeMarkdownSnippet(hunk.replacement);
    const prefixProbe = normalizeMarkdownSnippet(hunk.reversePrefix).slice(
      -CONTEXT_PROBE_CHARS,
    );
    const suffixProbe = normalizeMarkdownSnippet(hunk.reverseSuffix).slice(
      0,
      CONTEXT_PROBE_CHARS,
    );
    if (!needle) {
      result.set(
        hunk.id,
        locateDeletionPoint(index, collapsed, map, prefixProbe, suffixProbe),
      );
      continue;
    }
    let candidates = collectOccurrences(collapsed, needle);
    let candidateLength = needle.length;
    let candidateMap = null;
    if (candidates.length === 0) {
      const strippedHay = stripInlineMarkCharsWithMap(collapsed);
      const strippedNeedle = stripInlineMarkChars(needle).trim();
      if (strippedNeedle) {
        candidates = collectOccurrences(strippedHay.stripped, strippedNeedle);
        candidateLength = strippedNeedle.length;
        candidateMap = strippedHay.map;
      }
    }
    const toCollapsedRange = (idx) => {
      if (!candidateMap)
        return {
          start: idx,
          endChar: idx + candidateLength - 1,
        };
      const start = candidateMap[idx];
      const endChar = candidateMap[idx + candidateLength - 1];
      return start === void 0 || endChar === void 0
        ? null
        : {
            start,
            endChar,
          };
    };
    if (candidates.length > 1 && prefixProbe) {
      const byPrefix = candidates.filter((idx) => {
        const range = toCollapsedRange(idx);
        if (!range) return false;
        return collapsed
          .slice(
            Math.max(0, range.start - prefixProbe.length - 1),
            range.start,
          )
          .includes(prefixProbe);
      });
      if (byPrefix.length > 0) candidates = byPrefix;
    }
    if (candidates.length > 1 && suffixProbe) {
      const bySuffix = candidates.filter((idx) => {
        const range = toCollapsedRange(idx);
        if (!range) return false;
        return collapsed
          .slice(
            range.endChar + 1,
            range.endChar + 1 + suffixProbe.length + 1,
          )
          .includes(suffixProbe);
      });
      if (bySuffix.length > 0) candidates = bySuffix;
    }
    const chosen = candidates.find((idx) => {
      const range = toCollapsedRange(idx);
      if (!range) return false;
      const from = map[range.start];
      const to = map[range.endChar] + 1;
      return from !== void 0 && to !== void 0 && !overlapsUsed(from, to);
    });
    const chosenRange = chosen === void 0 ? null : toCollapsedRange(chosen);
    if (!chosenRange) {
      result.set(hunk.id, null);
      continue;
    }
    const textFrom = map[chosenRange.start];
    const textTo = map[chosenRange.endChar] + 1;
    usedRanges.push({
      from: textFrom,
      to: textTo,
    });
    const from = toPmPos(index, textFrom, "start");
    const to = toPmPos(index, textTo, "end");
    if (from === null || to === null || to <= from) {
      result.set(hunk.id, null);
      continue;
    }
    const cells = splitTableHunkCells(index, hunk, textFrom, textTo);
    result.set(
      hunk.id,
      cells
        ? {
            from,
            to,
            cells,
          }
        : {
            from,
            to,
          },
    );
  }
  return result;
}
function locateHunkPosition(doc, hunk) {
  const range = locateHunksInDoc(doc, [hunk]).get(hunk.id);
  return range ? (range.cells?.[0]?.from ?? range.from) : null;
}
function locateTransitionAnchor(editor, transition) {
  if (transition.kind !== "revert" || !transition.focusHunkId) return null;
  const hunk = transition.before.hunks.find(
    (candidate) => candidate.id === transition.focusHunkId,
  );
  const afterHunk = transition.after.hunks.find(
    (candidate) => candidate.id === transition.focusHunkId,
  );
  if (!hunk || !afterHunk || hunk.status === afterHunk.status) return null;
  const position = locateHunkPosition(editor.state.doc, hunk);
  return position === null
    ? null
    : {
        hunk,
        position,
      };
}
function recordDiffReviewTransition(editor, transition) {
  if (
    editor.isDestroyed ||
    (transition.kind === "revert" && transition.content === void 0)
  )
    return false;
  const selectionBefore = editor.state.selection.toJSON();
  const selectionPositionBefore = editor.state.selection.from;
  const transitionAnchor = locateTransitionAnchor(editor, transition);
  if (transitionAnchor !== null) {
    const selectionTransaction = editor.state.tr.setSelection(
      selectionNearPosition(editor.state.doc, transitionAnchor.position),
    );
    selectionTransaction.setMeta("addToHistory", false);
    selectionTransaction.setMeta(DIFF_REVIEW_SYNC_META, true);
    editor.view.dispatch(selectionTransaction);
  }
  let chain = editor.chain().command(({ tr }) => {
    closeHistory(tr);
    tr.step(new DiffReviewHistoryStep(transition.before, transition.after));
    if (transition.kind === "revert") tr.setMeta(DIFF_REVIEW_SYNC_META, true);
    return true;
  });
  if (transition.kind === "revert") {
    chain = chain.setContent(transition.content ?? "", {
      contentType: "markdown",
    });
    chain = chain.command(({ tr }) => {
      if (transitionAnchor === null) {
        tr.setSelection(
          selectionFromSnapshot(
            tr.doc,
            selectionBefore,
            selectionPositionBefore,
          ),
        );
        return true;
      }
      const revertedHunk = {
        ...transitionAnchor.hunk,
        originalText: transitionAnchor.hunk.replacement,
        replacement: transitionAnchor.hunk.originalText,
      };
      const revertedPosition =
        locateHunkPosition(tr.doc, revertedHunk) ?? transitionAnchor.position;
      tr.setSelection(selectionNearPosition(tr.doc, revertedPosition));
      return true;
    });
  }
  const recorded = chain.run();
  if (recorded) closeDiffReviewHistoryGroup(editor);
  return recorded;
}
function diffReviewScroller(editor) {
  if (editor.isDestroyed) return null;
  const dom = editor.view.dom;
  const scroller = dom.closest("[data-diff-scroll-root]") ?? dom.parentElement;
  return scroller instanceof HTMLElement ? scroller : null;
}
function captureScrollTop(editor) {
  const el = diffReviewScroller(editor);
  return el
    ? {
        el,
        top: el.scrollTop,
      }
    : null;
}
function restoreScrollTop(snapshot) {
  if (!snapshot) return;
  const { el, top: snapshotTop } = snapshot;
  el.scrollTop = snapshotTop;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      el.scrollTop = snapshotTop;
    });
  }
}
function collapseDiffReviewHistory(
  editor,
  baselineMarkdown,
  finalMarkdown,
  historyDepthAtStart = 0,
) {
  if (editor.isDestroyed) return;
  const selection = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  const scrollSnapshot = captureScrollTop(editor);
  rewindReviewHistory(editor, historyDepthAtStart);
  if (editor.getMarkdown() !== baselineMarkdown) {
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  }
  restoreEditorSelection(editor, selection, selectionPosition);
  if (baselineMarkdown !== finalMarkdown) {
    replaceEditorMarkdown(
      editor,
      finalMarkdown,
      true,
      selection,
      selectionPosition,
    );
  } else {
    recordFinalizedBoundary(editor);
  }
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection, selectionPosition);
  restoreScrollTop(scrollSnapshot);
}
function setDiffReviewHunks(editor, hunks, config) {
  editor.view.dispatch(
    editor.state.tr.setMeta(diffReviewPluginKey, {
      kind: "set",
      hunks,
      config,
    }),
  );
}
function clearDiffReviewHunks(editor) {
  const state = diffReviewPluginKey.getState(editor.state);
  if (!state || (state.hunks.length === 0 && !state.config)) return;
  editor.view.dispatch(
    editor.state.tr.setMeta(diffReviewPluginKey, {
      kind: "clear",
    }),
  );
}
function getDiffReviewHunks(editor) {
  return diffReviewPluginKey.getState(editor.state)?.hunks ?? [];
}
function scrollToDiffHunk(editor, hunkId) {
  const hunk = getDiffReviewHunks(editor).find(
    (candidate) => candidate.id === hunkId,
  );
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
    const coords = editor.view.coordsAtPos(
      Math.min(hunk.from, editor.state.doc.content.size),
    );
    const scroller =
      editor.view.dom.closest("[data-diff-scroll-root]") ??
      editor.view.dom.parentElement;
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
async function reconstructVerifiedDiffReviewBaseline(
  postApplyMarkdown,
  session,
) {
  const contentHash = await hashDiffReviewMarkdown(postApplyMarkdown);
  if (contentHash !== session.contentHash) return null;
  return reconstructDiffReviewBaseline(postApplyMarkdown, session);
}
function containsMarkdownTableRow(markdown) {
  return markdown.split("\n").some((line) => /^\s*\|.*\|\s*$/.test(line));
}
function countNewlines(text) {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}
const MARKDOWN_DELIMITER_POINTS = new Set([
  "#",
  "*",
  "_",
  "~",
  "`",
  "-",
  "+",
  ">",
  "|",
]);
const MARKDOWN_BLOCK_PREFIX =
  /^(?: {0,3})(?:#{1,6}(?:[ \t]+|$)|[-+*>][ \t]+|\d{1,9}[.)][ \t]+|`{3,}|~{3,})/;
function locatableRenderedText(markdown) {
  const normalized = collapseRenderedText(
    buildMarkdownNormalizeMap(markdown).normalized,
  ).trim();
  return stripInlineMarkChars(
    normalized.replace(MARKDOWN_BLOCK_PREFIX, ""),
  ).trim();
}
function commonPrefixLength(a2, b3) {
  const max = Math.min(a2.length, b3.length);
  let i = 0;
  while (i < max && a2.charCodeAt(i) === b3.charCodeAt(i)) i++;
  return i;
}
function commonSuffixLength(left, right, prefixLength) {
  let suffixLength = 0;
  while (
    suffixLength < left.length - prefixLength &&
    suffixLength < right.length - prefixLength &&
    left[left.length - suffixLength - 1] === right[right.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }
  return suffixLength;
}
function containsNewline(points, from, to) {
  for (let index = from; index < to; index += 1) {
    if (points[index] === "\n") return true;
  }
  return false;
}
function alignMultilineBoundaries(left, right, prefixLength, suffixLength) {
  const changeHasNewline =
    containsNewline(left, prefixLength, left.length - suffixLength) ||
    containsNewline(right, prefixLength, right.length - suffixLength);
  if (!changeHasNewline)
    return {
      prefixLength,
      suffixLength,
    };
  let alignedPrefix = prefixLength;
  if (
    alignedPrefix > 0 &&
    alignedPrefix < left.length &&
    alignedPrefix < right.length
  ) {
    const previousNewline = left.lastIndexOf("\n", alignedPrefix - 1);
    alignedPrefix = previousNewline + 1;
  }
  let alignedSuffix = commonSuffixLength(left, right, alignedPrefix);
  if (alignedSuffix === 0)
    return {
      prefixLength: alignedPrefix,
      suffixLength: 0,
    };
  const leftStart = left.length - alignedSuffix;
  const rightStart = right.length - alignedSuffix;
  const leftAtLineBoundary =
    leftStart === alignedPrefix || left[leftStart - 1] === "\n";
  const rightAtLineBoundary =
    rightStart === alignedPrefix || right[rightStart - 1] === "\n";
  if (leftAtLineBoundary && rightAtLineBoundary) {
    return {
      prefixLength: alignedPrefix,
      suffixLength: alignedSuffix,
    };
  }
  const firstNewline = left.indexOf("\n", leftStart);
  if (firstNewline < 0 || firstNewline >= left.length - 1) alignedSuffix = 0;
  else alignedSuffix = left.length - firstNewline - 1;
  return {
    prefixLength: alignedPrefix,
    suffixLength: alignedSuffix,
  };
}
function markerRunStart(points, boundary) {
  const previousNewline = points.lastIndexOf("\n", boundary - 1);
  const lineStart = previousNewline + 1;
  const nextNewline = points.indexOf("\n", lineStart);
  const lineEnd = nextNewline < 0 ? points.length : nextNewline;
  const blockPrefix = MARKDOWN_BLOCK_PREFIX.exec(
    points.slice(lineStart, lineEnd).join(""),
  );
  if (blockPrefix) {
    const blockPrefixEnd = lineStart + Array.from(blockPrefix[0]).length;
    if (boundary > lineStart && boundary < blockPrefixEnd) return lineStart;
  }
  if (
    boundary <= 0 ||
    boundary >= points.length ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary - 1]) ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary])
  ) {
    return boundary;
  }
  let start = boundary - 1;
  while (start > 0 && MARKDOWN_DELIMITER_POINTS.has(points[start - 1]))
    start -= 1;
  return start;
}
function markerRunEnd(points, boundary) {
  if (
    boundary <= 0 ||
    boundary >= points.length ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary - 1]) ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary])
  ) {
    return boundary;
  }
  let end = boundary;
  while (end < points.length && MARKDOWN_DELIMITER_POINTS.has(points[end]))
    end += 1;
  return end;
}
function alignMarkdownDelimiterBoundaries(
  left,
  right,
  prefixLength,
  suffixLength,
) {
  const alignedPrefix = Math.min(
    markerRunStart(left, prefixLength),
    markerRunStart(right, prefixLength),
  );
  let alignedSuffix =
    alignedPrefix === prefixLength
      ? suffixLength
      : commonSuffixLength(left, right, alignedPrefix);
  const leftStart = left.length - alignedSuffix;
  const rightStart = right.length - alignedSuffix;
  const leftRunEnd = markerRunEnd(left, leftStart);
  const rightRunEnd = markerRunEnd(right, rightStart);
  const droppedPoints = Math.max(
    leftRunEnd - leftStart,
    rightRunEnd - rightStart,
  );
  alignedSuffix = Math.max(0, alignedSuffix - droppedPoints);
  return {
    prefixLength: alignedPrefix,
    suffixLength: alignedSuffix,
  };
}
function minimizeDiffReviewHunk(hunk) {
  const { originalText, replacement } = hunk;
  if (
    originalText === replacement ||
    (containsMarkdownTableRow(originalText) &&
      containsMarkdownTableRow(replacement))
  ) {
    return hunk;
  }
  const originalPoints = Array.from(originalText);
  const replacementPoints = Array.from(replacement);
  let prefixPoints = commonPrefixLength(originalPoints, replacementPoints);
  let suffixPoints = commonSuffixLength(
    originalPoints,
    replacementPoints,
    prefixPoints,
  );
  ({ prefixLength: prefixPoints, suffixLength: suffixPoints } =
    alignMultilineBoundaries(
      originalPoints,
      replacementPoints,
      prefixPoints,
      suffixPoints,
    ));
  ({ prefixLength: prefixPoints, suffixLength: suffixPoints } =
    alignMarkdownDelimiterBoundaries(
      originalPoints,
      replacementPoints,
      prefixPoints,
      suffixPoints,
    ));
  if (prefixPoints === 0 && suffixPoints === 0) return hunk;
  const commonPrefix = originalPoints.slice(0, prefixPoints).join("");
  const commonSuffix =
    suffixPoints > 0
      ? originalPoints.slice(originalPoints.length - suffixPoints).join("")
      : "";
  const minimizedOriginal = originalPoints
    .slice(prefixPoints, originalPoints.length - suffixPoints)
    .join("");
  const minimizedReplacement = replacementPoints
    .slice(prefixPoints, replacementPoints.length - suffixPoints)
    .join("");
  const fullVisibleOriginal = locatableRenderedText(originalText);
  const fullVisibleReplacement = locatableRenderedText(replacement);
  if (
    fullVisibleReplacement &&
    fullVisibleOriginal === fullVisibleReplacement &&
    locatableRenderedText(minimizedReplacement) !== fullVisibleReplacement
  ) {
    return {
      ...hunk,
      replacement: fullVisibleReplacement,
    };
  }
  return {
    ...hunk,
    originalText: minimizedOriginal,
    replacement: minimizedReplacement,
    newStart: hunk.newStart + commonPrefix.length,
    newEnd: hunk.newEnd - commonSuffix.length,
    reversePrefix: `${hunk.reversePrefix}${commonPrefix}`,
    reverseSuffix: `${commonSuffix}${hunk.reverseSuffix}`,
    startLine: hunk.startLine + countNewlines(commonPrefix),
  };
}
function enclosingTableKey(doc, pos) {
  try {
    const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
    if ($pos.depth === 0) return null;
    return $pos.node(1).type.name === "table"
      ? `${$pos.before(1)}:${$pos.after(1)}`
      : null;
  } catch {
    return null;
  }
}
function enclosingHeadingLevel(doc, pos) {
  try {
    const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
    const node = $pos.depth > 0 ? $pos.node(1) : null;
    if (node?.type.name === "heading") {
      const level = node.attrs.level;
      return typeof level === "number" ? level : 1;
    }
  } catch {}
  return null;
}
function withEnclosingBlockPrefix(markdown, doc, pos) {
  if (markdown.includes("\n")) return markdown;
  const trimmed = markdown.trimStart();
  if (trimmed === "" || /^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```)/.test(trimmed))
    return markdown;
  const level = enclosingHeadingLevel(doc, pos);
  return level ? `${"#".repeat(level)} ${markdown}` : markdown;
}
export function useDiffReview(editor, nodeId, contentRevision, options = {}) {
  const { sourceMarkdown, onReviewDocumentApplied } = options;
  const { t } = useTranslation();
  const session = useDiffReviewStore((state) => state.session);
  const reverting = useDiffReviewStore((state) => state.reverting);
  const acceptHunk = useDiffReviewStore((state) => state.acceptHunk);
  const acceptHunks = useDiffReviewStore((state) => state.acceptHunks);
  const requestUndo = useDiffReviewStore((state) => state.requestUndo);
  const pendingHunks = reactExports.useMemo(
    () =>
      selectPendingHunksForNode(
        {
          session,
        },
        nodeId,
      ),
    [session, nodeId],
  );
  const presentationHunks = reactExports.useMemo(
    () => pendingHunks.map(minimizeDiffReviewHunk),
    [pendingHunks],
  );
  const reviewBlocked =
    reverting ||
    (!!session &&
      session.nodeId === nodeId &&
      session.baselineMarkdown === void 0);
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const [modificationCount, setModificationCount] = reactExports.useState(0);
  const locatedIdsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const syncEditable = (state) => {
      if (editor.isDestroyed) return;
      const ownsReview = state.session?.nodeId === nodeId;
      const reviewReady = state.session?.baselineMarkdown !== void 0;
      editor.setEditable(
        !(ownsReview && (state.reverting || !reviewReady)),
        false,
      );
    };
    syncEditable(useDiffReviewStore.getState());
    const unsubscribe = useDiffReviewStore.subscribe(syncEditable);
    return () => {
      unsubscribe();
      if (!editor.isDestroyed) editor.setEditable(true, false);
    };
  }, [editor, nodeId]);
  reactExports.useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      !session ||
      session.nodeId !== nodeId ||
      session.baselineMarkdown !== void 0
    )
      return;
    let cancelled = false;
    const appliedMarkdown = sourceMarkdown ?? editor.getMarkdown();
    void reconstructVerifiedDiffReviewBaseline(appliedMarkdown, session)
      .then((baseline) => {
        if (cancelled || editor.isDestroyed || baseline === null) return;
        const current = useDiffReviewStore.getState().session;
        if (
          !current ||
          current.requestId !== session.requestId ||
          current.baselineMarkdown !== void 0
        )
          return;
        const historyDepthAtStart = recordProvisionalDiffReviewHistory(
          editor,
          baseline,
          appliedMarkdown,
          false,
        );
        useDiffReviewStore
          .getState()
          .setBaselineMarkdown(
            current.requestId,
            baseline,
            historyDepthAtStart,
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [editor, session, nodeId, sourceMarkdown]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const handleTransaction = ({ transaction }) => {
      const restored = getDiffReviewHistorySnapshot(transaction);
      if (!restored || restored.nodeId !== nodeId) return;
      useDiffReviewStore.getState().restoreHistorySession(restored);
    };
    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, nodeId]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const handler = (transition) => {
      if (
        editor.isDestroyed ||
        transition.before.nodeId !== nodeId ||
        transition.after.nodeId !== nodeId
      )
        return false;
      if (
        transition.before.baselineMarkdown === void 0 ||
        (transition.kind === "revert" && transition.content === void 0)
      )
        return false;
      if (!recordDiffReviewTransition(editor, transition)) return false;
      useDiffReviewStore.getState().restoreHistorySession(transition.after);
      if (transition.kind === "revert" && transition.content !== void 0) {
        onReviewDocumentApplied?.(transition.content);
      }
      if (!transition.after.hunks.some((hunk) => hunk.status === "pending")) {
        const baseline = transition.after.baselineMarkdown;
        if (baseline === void 0) return false;
        collapseDiffReviewHistory(
          editor,
          baseline,
          editor.getMarkdown(),
          transition.after.historyDepthAtStart,
        );
        useDiffReviewStore
          .getState()
          .finishHistorySession(transition.after.requestId);
      }
      return true;
    };
    useDiffReviewStore.getState().setHistoryHandler(handler);
    return () => {
      if (useDiffReviewStore.getState().historyHandler === handler) {
        useDiffReviewStore.getState().setHistoryHandler(null);
      }
    };
  }, [editor, nodeId, onReviewDocumentApplied]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    useDiffReviewStore.getState().setActiveEditorNodeId(nodeId);
    return () => {
      if (useDiffReviewStore.getState().activeEditorNodeId === nodeId) {
        useDiffReviewStore.getState().setActiveEditorNodeId(null);
      }
    };
  }, [editor, nodeId]);
  const handleUndo = reactExports.useCallback(
    (hunkId) => {
      void requestUndo([hunkId]);
    },
    [requestUndo],
  );
  const handleAccept = reactExports.useCallback(
    (hunkId) => {
      acceptHunk(hunkId);
    },
    [acceptHunk],
  );
  const handleUndoGroup = reactExports.useCallback(
    (hunkIds) => {
      void requestUndo(hunkIds);
    },
    [requestUndo],
  );
  const handleAcceptGroup = reactExports.useCallback(
    (hunkIds) => {
      acceptHunks(hunkIds);
    },
    [acceptHunks],
  );
  const renderMarkdown = reactExports.useCallback(
    (markdown, context) => {
      if (!editor) return null;
      return renderDeletedMarkdown(editor, markdown, context);
    },
    [editor],
  );
  reactExports.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (presentationHunks.length === 0) {
      locatedIdsRef.current = [];
      clearDiffReviewHunks(editor);
      return;
    }
    const doc = editor.state.doc;
    const ranges = locateHunksInDoc(doc, presentationHunks);
    const views = [];
    const navIds = [];
    const seenTableKeys = new Set();
    let modifications = 0;
    for (const hunk of presentationHunks) {
      const range = ranges.get(hunk.id);
      if (!range) {
        modifications++;
        continue;
      }
      let repId;
      if (range.cells && range.cells.length > 0) {
        range.cells.forEach((cell, index) => {
          views.push({
            id: `${hunk.id}::c${index}`,
            controlId: hunk.id,
            from: cell.from,
            to: cell.to,
            deletedMarkdown: cell.deletedMarkdown,
            deletedContext: {
              sourceMarkdown: cell.deletedMarkdown,
              prefix: hunk.reversePrefix,
              suffix: hunk.reverseSuffix,
            },
            zeroWidth: false,
          });
        });
        repId = `${hunk.id}::c0`;
      } else {
        views.push({
          id: hunk.id,
          controlId: hunk.id,
          from: range.from,
          to: range.to,
          deletedMarkdown: withEnclosingBlockPrefix(
            hunk.originalText,
            doc,
            range.from,
          ),
          deletedContext: {
            sourceMarkdown: hunk.originalText,
            prefix: hunk.reversePrefix,
            suffix: hunk.reverseSuffix,
          },
          zeroWidth: range.from === range.to,
        });
        repId = hunk.id;
      }
      const tableKey = enclosingTableKey(
        doc,
        range.cells?.[0]?.from ?? range.from,
      );
      if (tableKey) {
        if (seenTableKeys.has(tableKey)) continue;
        seenTableKeys.add(tableKey);
      }
      modifications++;
      navIds.push(repId);
    }
    locatedIdsRef.current = navIds;
    setModificationCount(modifications);
    setDiffReviewHunks(editor, views, {
      undoLabel: t("canvas.diffReview.undo", "撤销"),
      acceptLabel: t("canvas.diffReview.accept", "接受"),
      disabled: reviewBlocked,
      onUndo: handleUndo,
      onAccept: handleAccept,
      onUndoGroup: handleUndoGroup,
      onAcceptGroup: handleAcceptGroup,
      renderMarkdown,
    });
    const firstNavId = navIds[0];
    if (
      nodeId &&
      firstNavId &&
      useDiffReviewStore.getState().consumeScrollToFirstHunk(nodeId)
    ) {
      setActiveIndex(0);
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) scrollToDiffHunk(editor, firstNavId);
      });
    }
    return () => {
      if (!editor.isDestroyed) clearDiffReviewHunks(editor);
    };
  }, [
    editor,
    nodeId,
    presentationHunks,
    reviewBlocked,
    contentRevision,
    handleUndo,
    handleAccept,
    handleUndoGroup,
    handleAcceptGroup,
    renderMarkdown,
    t,
  ]);
  reactExports.useEffect(() => {
    setActiveIndex((index) =>
      Math.min(index, Math.max(0, modificationCount - 1)),
    );
  }, [modificationCount]);
  const step = reactExports.useCallback(
    (dir) => {
      if (!editor || pendingHunks.length === 0) return;
      const located = locatedIdsRef.current;
      if (located.length === 0) return;
      setActiveIndex((prev) => {
        const next = (prev + dir + located.length) % located.length;
        const id = located[next];
        if (id) scrollToDiffHunk(editor, id);
        return next;
      });
    },
    [editor, pendingHunks.length],
  );
  reactExports.useEffect(() => {
    const setNavigation = useDiffReviewStore.getState().setNavigation;
    if (pendingHunks.length === 0) {
      setNavigation(null);
      return;
    }
    const total = Math.max(modificationCount, 1);
    setNavigation({
      current: Math.min(activeIndex + 1, total),
      total,
      step,
    });
    return () => {
      setNavigation(null);
    };
  }, [pendingHunks.length, modificationCount, activeIndex, step]);
}
