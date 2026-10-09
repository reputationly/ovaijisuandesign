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
import {
  closeHistory,
  DOMSerializer,
  Node$4 as Node,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { recordProvisionalDiffReviewHistory } from "./record-provisional-diff-review-history.js";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { selectPendingHunksForNode } from "./annotation-gutter.jsx";
const FENCE_RE = /^(\s*)(```|~~~)/;
const TABLE_DELIM_RE = /^\s*\|?[\s:|-]+\|?\s*$/;
const BLOCK_PREFIX_RE =
  /^(\s*)((?:>\s*)*)((?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?|#{1,6}\s+)?/;
function pushChar(b3, ch, rawOffset, isSynthetic) {
  if (ch === " ") {
    const last2 = b3.normalized.length - 1;
    if (last2 < 0 || b3.normalized[last2] === " ") {
      if (last2 >= 0 || isSynthetic) return;
    }
  }
  b3.normalized.push(ch);
  b3.normToRaw.push(rawOffset);
  b3.synthetic.push(isSynthetic);
}
function findStrippableDelimiters(line) {
  const strip = new Array(line.length).fill(false);
  const openByToken = new Map();
  for (let i2 = 0; i2 < line.length; i2++) {
    const ch = line[i2];
    if (ch === "\\") {
      i2 += 1;
      continue;
    }
    if (ch !== "*" && ch !== "_" && ch !== "~" && ch !== "`") continue;
    const two = line.slice(i2, i2 + 2);
    let token2;
    if (two === "**" || two === "__" || two === "~~") {
      token2 = two;
    } else if (ch === "*" || ch === "`") {
      token2 = ch;
    } else {
      continue;
    }
    const open = openByToken.get(token2);
    if (open === void 0) {
      openByToken.set(token2, i2);
    } else {
      for (let k2 = 0; k2 < token2.length; k2++) {
        strip[open + k2] = true;
        strip[i2 + k2] = true;
      }
      openByToken.delete(token2);
    }
    i2 += token2.length - 1;
  }
  return strip;
}
function findBracketClose(line, open) {
  let depth2 = 0;
  for (let i2 = open; i2 < line.length; i2++) {
    if (line[i2] === "[") depth2 += 1;
    else if (line[i2] === "]") {
      depth2 -= 1;
      if (depth2 === 0) return i2;
    }
  }
  return -1;
}
function matchParen(line, at2) {
  if (line[at2] !== "(") return -1;
  let depth2 = 0;
  for (let i2 = at2; i2 < line.length; i2++) {
    if (line[i2] === "(") depth2 += 1;
    else if (line[i2] === ")") {
      depth2 -= 1;
      if (depth2 === 0) return i2;
    }
  }
  return -1;
}
function pushInline(b3, line, lineStart, from2, strippable) {
  const strip = strippable ?? findStrippableDelimiters(line);
  let i2 = from2;
  while (i2 < line.length) {
    const ch = line[i2];
    const next2 = line[i2 + 1];
    if ((ch === "*" || ch === "_" || ch === "~" || ch === "`") && strip[i2]) {
      i2 += 1;
      continue;
    }
    if (ch === "!" && next2 === "[") {
      const close2 = findBracketClose(line, i2 + 1);
      if (close2 >= 0) {
        const paren = matchParen(line, close2 + 1);
        if (paren >= 0) {
          pushChar(b3, " ", lineStart + i2, true);
          i2 = paren + 1;
          continue;
        }
      }
    }
    if (ch === "[") {
      const close2 = findBracketClose(line, i2);
      if (close2 >= 0) {
        const paren = matchParen(line, close2 + 1);
        if (paren >= 0) {
          pushInline(b3, line.slice(0, close2), lineStart, i2 + 1, strip);
          i2 = paren + 1;
          continue;
        }
      }
    }
    if (ch === "<") {
      const m3 = /^<br\s*\/?>/i.exec(line.slice(i2));
      if (m3) {
        pushChar(b3, " ", lineStart + i2, true);
        i2 += m3[0].length;
        continue;
      }
    }
    if (ch === "|") {
      pushChar(b3, " ", lineStart + i2, true);
      i2 += 1;
      continue;
    }
    if (ch === "\\" && next2 && "\\`*_{}[]()#+-.!|~>".includes(next2)) {
      pushChar(b3, next2, lineStart + i2 + 1, false);
      i2 += 2;
      continue;
    }
    pushChar(b3, ch === "	" ? " " : ch, lineStart + i2, ch === "	");
    i2 += 1;
  }
}
function buildMarkdownNormalizeMap(raw2) {
  const b3 = {
    normalized: [],
    normToRaw: [],
    synthetic: [],
  };
  const lines = raw2.split("\n");
  let inFence = false;
  let offset2 = 0;
  for (let li2 = 0; li2 < lines.length; li2++) {
    const line = lines[li2];
    const lineStart = offset2;
    offset2 += line.length + 1;
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    if (inFence) {
      for (let i2 = 0; i2 < line.length; i2++)
        pushChar(b3, line[i2], lineStart + i2, false);
      pushChar(b3, " ", lineStart + line.length, true);
      continue;
    }
    if (line.includes("|") && line.includes("-") && TABLE_DELIM_RE.test(line)) {
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    if (/^\s*(?:[-*_]\s*){3,}$/.test(line) && line.trim().length >= 3) {
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    const prefix = BLOCK_PREFIX_RE.exec(line);
    const contentFrom = prefix ? prefix[0].length : 0;
    pushInline(b3, line, lineStart, contentFrom);
    pushChar(b3, " ", lineStart + line.length, true);
  }
  while (
    b3.normalized.length > 0 &&
    b3.normalized[b3.normalized.length - 1] === " " &&
    b3.synthetic[b3.synthetic.length - 1]
  ) {
    b3.normalized.pop();
    b3.normToRaw.pop();
    b3.synthetic.pop();
  }
  return {
    normalized: b3.normalized.join(""),
    normToRaw: b3.normToRaw,
    synthetic: b3.synthetic,
  };
}
function collapseRenderedText(text2) {
  return text2.replace(/\s+/g, " ");
}
const INLINE_MARK_CHARS = new Set(["*", "~", "`"]);
function stripInlineMarkChars(text2) {
  let out = "";
  for (const ch of text2) {
    if (!INLINE_MARK_CHARS.has(ch)) out += ch;
  }
  return out;
}
function stripInlineMarkCharsWithMap(text2) {
  const chars2 = [];
  const map3 = [];
  for (let i2 = 0; i2 < text2.length; i2++) {
    const ch = text2[i2];
    if (INLINE_MARK_CHARS.has(ch)) continue;
    chars2.push(ch);
    map3.push(i2);
  }
  return {
    stripped: chars2.join(""),
    map: map3,
  };
}
const DIFF_CONTEXT_START = "";
const DIFF_CONTEXT_END = "";
const EXPLICIT_BLOCK_PREFIX_RE = /^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~)/;
function parseMarkdownDocument(editor, markdown2) {
  try {
    const manager = editor.storage.markdown?.manager;
    if (!manager) return null;
    const json2 = manager.parse(markdown2);
    if (!json2 || typeof json2 !== "object") return null;
    return Node.fromJSON(editor.schema, json2);
  } catch {
    return null;
  }
}
function serializeMarkdownDocument(editor, doc2) {
  try {
    const container = document.createElement("div");
    container.appendChild(
      DOMSerializer.fromSchema(editor.schema).serializeFragment(doc2.content),
    );
    return container;
  } catch {
    return null;
  }
}
function serializeMarkdownNode(editor, node2) {
  try {
    const container = document.createElement("div");
    container.appendChild(
      DOMSerializer.fromSchema(editor.schema).serializeNode(node2),
    );
    return container;
  } catch {
    return null;
  }
}
function findMarkerPosition(doc2, marker) {
  let found2 = null;
  doc2.descendants((node2, pos) => {
    if (found2 !== null || !node2.isText) return;
    const index2 = node2.text?.indexOf(marker) ?? -1;
    if (index2 >= 0) found2 = pos + index2;
  });
  return found2;
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
  const start2 = findMarkerPosition(contextualDoc, DIFF_CONTEXT_START);
  const end2 = findMarkerPosition(contextualDoc, DIFF_CONTEXT_END);
  if (
    start2 === null ||
    end2 === null ||
    end2 < start2 + DIFF_CONTEXT_START.length
  )
    return null;
  const from2 = start2 + DIFF_CONTEXT_START.length;
  const $from = contextualDoc.resolve(from2);
  const $to = contextualDoc.resolve(end2);
  if (!$from.sameParent($to) || !$from.parent.isTextblock) return null;
  return {
    block: $from.parent,
    content: contextualDoc.slice(from2, end2).content,
  };
}
function rebuildSoleTextblock(node2, content2) {
  try {
    if (node2.isTextblock)
      return node2.type.create(node2.attrs, content2, node2.marks);
    if (node2.childCount !== 1) return null;
    const child = rebuildSoleTextblock(node2.child(0), content2);
    return child ? node2.type.create(node2.attrs, child, node2.marks) : null;
  } catch {
    return null;
  }
}
function renderDeletedMarkdown(editor, markdown2, context) {
  if (editor.isDestroyed) return null;
  const standaloneDoc = parseMarkdownDocument(editor, markdown2);
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
function isInsideTableCell(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    for (let depth2 = $pos.depth; depth2 > 0; depth2--) {
      const name2 = $pos.node(depth2).type.name;
      if (name2 === "tableCell" || name2 === "tableHeader") return true;
    }
  } catch {}
  return false;
}
function buildDocTextIndex(doc2) {
  const segments = [];
  const parts = [];
  let textStart = 0;
  doc2.descendants((node2, pos) => {
    if (!node2.isTextblock) return true;
    const text2 = node2.textBetween(
      0,
      node2.content.size,
      void 0,
      LEAF_PLACEHOLDER,
    );
    segments.push({
      textStart,
      pmStart: pos + 1,
      length: text2.length,
      isTableCell: isInsideTableCell(doc2, pos + 1),
    });
    parts.push(text2);
    textStart += text2.length + 1;
    return false;
  });
  return {
    text: parts.join("\n"),
    segments,
  };
}
function toPmPos(index2, offset2, bias) {
  const { segments } = index2;
  if (segments.length === 0) return null;
  for (let i2 = 0; i2 < segments.length; i2++) {
    const seg = segments[i2];
    const segEnd = seg.textStart + seg.length;
    if (offset2 < seg.textStart) {
      if (bias === "start") return seg.pmStart;
      const prev = segments[i2 - 1];
      return prev ? prev.pmStart + prev.length : seg.pmStart;
    }
    if (offset2 <= segEnd) {
      return seg.pmStart + (offset2 - seg.textStart);
    }
  }
  const last2 = segments[segments.length - 1];
  return last2.pmStart + last2.length;
}
function collapseWithMap(text2) {
  const chars2 = [];
  const map3 = [];
  let pendingSpace = -1;
  for (let i2 = 0; i2 < text2.length; i2++) {
    const ch = text2[i2];
    if (
      ch === " " ||
      ch === "\n" ||
      ch === "	" ||
      ch === "\r" ||
      ch === LEAF_PLACEHOLDER
    ) {
      if (pendingSpace < 0) pendingSpace = i2;
      continue;
    }
    if (pendingSpace >= 0 && chars2.length > 0) {
      chars2.push(" ");
      map3.push(pendingSpace);
    }
    pendingSpace = -1;
    chars2.push(ch);
    map3.push(i2);
  }
  return {
    collapsed: chars2.join(""),
    map: map3,
  };
}
function normalizeMarkdownSnippet(markdown2) {
  if (!markdown2) return "";
  return collapseRenderedText(
    buildMarkdownNormalizeMap(markdown2).normalized,
  ).trim();
}
const TABLE_DELIM_LINE = /^[|\s:-]+$/;
function parseTableRowCells(markdown2) {
  const lines = markdown2
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;
  const cells2 = [];
  for (const line of lines) {
    if (!line.includes("|")) return null;
    if (TABLE_DELIM_LINE.test(line) && line.includes("-")) continue;
    let parts = line.split("|");
    if (parts.length > 0 && parts[0]?.trim() === "") parts = parts.slice(1);
    if (parts.length > 0 && parts[parts.length - 1]?.trim() === "")
      parts = parts.slice(0, -1);
    for (const part of parts) cells2.push(part.trim());
  }
  return cells2.length > 0 ? cells2 : null;
}
function splitTableHunkCells(index2, hunk, textFrom, textTo) {
  const overlaps = (seg) =>
    Math.max(seg.textStart, textFrom) <
    Math.min(seg.textStart + seg.length, textTo);
  const covered = index2.segments.filter(
    (seg) => seg.isTableCell && overlaps(seg),
  );
  if (covered.length < 2) return null;
  if (index2.segments.some((seg) => !seg.isTableCell && overlaps(seg)))
    return null;
  const oldCells = parseTableRowCells(hunk.originalText);
  const newCells = parseTableRowCells(hunk.replacement);
  if (!oldCells || !newCells) return null;
  if (oldCells.length !== covered.length || newCells.length !== covered.length)
    return null;
  const cells2 = [];
  for (let i2 = 0; i2 < covered.length; i2++) {
    const seg = covered[i2];
    const oldCell = oldCells[i2];
    const newCell = newCells[i2];
    const docCellText = index2.text.slice(
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
      index2,
      Math.max(seg.textStart, textFrom),
      "start",
    );
    const cellTo = toPmPos(
      index2,
      Math.min(seg.textStart + seg.length, textTo),
      "end",
    );
    if (cellFrom === null || cellTo === null || cellTo <= cellFrom) return null;
    cells2.push({
      from: cellFrom,
      to: cellTo,
      deletedMarkdown: oldCell,
    });
  }
  return cells2.length > 0 ? cells2 : null;
}
function collectOccurrences(haystack, needle, cap2 = 50) {
  const out = [];
  let cursor = 0;
  while (out.length < cap2) {
    const idx = haystack.indexOf(needle, cursor);
    if (idx < 0) break;
    out.push(idx);
    cursor = idx + 1;
  }
  return out;
}
const CONTEXT_PROBE_CHARS = 14;
function locateDeletionPoint(
  index2,
  collapsed,
  map3,
  prefixProbe,
  suffixProbe,
) {
  if (prefixProbe) {
    const candidates2 = collectOccurrences(collapsed, prefixProbe);
    for (const idx of candidates2) {
      const end2 = idx + prefixProbe.length;
      const suffixIndex = suffixProbe
        ? collapsed.indexOf(suffixProbe, end2)
        : -1;
      if (suffixProbe && (suffixIndex < end2 || suffixIndex > end2 + 1))
        continue;
      const sourceOffset =
        suffixIndex >= 0
          ? map3[suffixIndex]
          : map3[end2 - 1] !== void 0
            ? map3[end2 - 1] + 1
            : void 0;
      if (sourceOffset === void 0) continue;
      const pm = toPmPos(
        index2,
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
    const first2 = map3[idx];
    if (first2 === void 0) return null;
    const pm = toPmPos(index2, first2, "start");
    return pm !== null
      ? {
          from: pm,
          to: pm,
        }
      : null;
  }
  return null;
}
function locateHunksInDoc(doc2, hunks) {
  const result = new Map();
  if (hunks.length === 0) return result;
  const index2 = buildDocTextIndex(doc2);
  const { collapsed, map: map3 } = collapseWithMap(index2.text);
  const usedRanges = [];
  const overlapsUsed = (from2, to) =>
    usedRanges.some((r2) => Math.max(r2.from, from2) < Math.min(r2.to, to));
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
        locateDeletionPoint(index2, collapsed, map3, prefixProbe, suffixProbe),
      );
      continue;
    }
    let candidates2 = collectOccurrences(collapsed, needle);
    let candidateLength = needle.length;
    let candidateMap = null;
    if (candidates2.length === 0) {
      const strippedHay = stripInlineMarkCharsWithMap(collapsed);
      const strippedNeedle = stripInlineMarkChars(needle).trim();
      if (strippedNeedle) {
        candidates2 = collectOccurrences(strippedHay.stripped, strippedNeedle);
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
      const start2 = candidateMap[idx];
      const endChar = candidateMap[idx + candidateLength - 1];
      return start2 === void 0 || endChar === void 0
        ? null
        : {
            start: start2,
            endChar,
          };
    };
    if (candidates2.length > 1 && prefixProbe) {
      const byPrefix = candidates2.filter((idx) => {
        const range2 = toCollapsedRange(idx);
        if (!range2) return false;
        return collapsed
          .slice(
            Math.max(0, range2.start - prefixProbe.length - 1),
            range2.start,
          )
          .includes(prefixProbe);
      });
      if (byPrefix.length > 0) candidates2 = byPrefix;
    }
    if (candidates2.length > 1 && suffixProbe) {
      const bySuffix = candidates2.filter((idx) => {
        const range2 = toCollapsedRange(idx);
        if (!range2) return false;
        return collapsed
          .slice(
            range2.endChar + 1,
            range2.endChar + 1 + suffixProbe.length + 1,
          )
          .includes(suffixProbe);
      });
      if (bySuffix.length > 0) candidates2 = bySuffix;
    }
    const chosen = candidates2.find((idx) => {
      const range2 = toCollapsedRange(idx);
      if (!range2) return false;
      const from22 = map3[range2.start];
      const to2 = map3[range2.endChar] + 1;
      return from22 !== void 0 && to2 !== void 0 && !overlapsUsed(from22, to2);
    });
    const chosenRange = chosen === void 0 ? null : toCollapsedRange(chosen);
    if (!chosenRange) {
      result.set(hunk.id, null);
      continue;
    }
    const textFrom = map3[chosenRange.start];
    const textTo = map3[chosenRange.endChar] + 1;
    usedRanges.push({
      from: textFrom,
      to: textTo,
    });
    const from2 = toPmPos(index2, textFrom, "start");
    const to = toPmPos(index2, textTo, "end");
    if (from2 === null || to === null || to <= from2) {
      result.set(hunk.id, null);
      continue;
    }
    const cells2 = splitTableHunkCells(index2, hunk, textFrom, textTo);
    result.set(
      hunk.id,
      cells2
        ? {
            from: from2,
            to,
            cells: cells2,
          }
        : {
            from: from2,
            to,
          },
    );
  }
  return result;
}
function locateHunkPosition(doc2, hunk) {
  const range2 = locateHunksInDoc(doc2, [hunk]).get(hunk.id);
  return range2 ? (range2.cells?.[0]?.from ?? range2.from) : null;
}
function locateTransitionAnchor(editor, transition2) {
  if (transition2.kind !== "revert" || !transition2.focusHunkId) return null;
  const hunk = transition2.before.hunks.find(
    (candidate) => candidate.id === transition2.focusHunkId,
  );
  const afterHunk = transition2.after.hunks.find(
    (candidate) => candidate.id === transition2.focusHunkId,
  );
  if (!hunk || !afterHunk || hunk.status === afterHunk.status) return null;
  const position2 = locateHunkPosition(editor.state.doc, hunk);
  return position2 === null
    ? null
    : {
        hunk,
        position: position2,
      };
}
function recordDiffReviewTransition(editor, transition2) {
  if (
    editor.isDestroyed ||
    (transition2.kind === "revert" && transition2.content === void 0)
  )
    return false;
  const selectionBefore = editor.state.selection.toJSON();
  const selectionPositionBefore = editor.state.selection.from;
  const transitionAnchor = locateTransitionAnchor(editor, transition2);
  if (transitionAnchor !== null) {
    const selectionTransaction = editor.state.tr.setSelection(
      selectionNearPosition(editor.state.doc, transitionAnchor.position),
    );
    selectionTransaction.setMeta("addToHistory", false);
    selectionTransaction.setMeta(DIFF_REVIEW_SYNC_META, true);
    editor.view.dispatch(selectionTransaction);
  }
  let chain = editor.chain().command(({ tr: tr2 }) => {
    closeHistory(tr2);
    tr2.step(new DiffReviewHistoryStep(transition2.before, transition2.after));
    if (transition2.kind === "revert") tr2.setMeta(DIFF_REVIEW_SYNC_META, true);
    return true;
  });
  if (transition2.kind === "revert") {
    chain = chain.setContent(transition2.content ?? "", {
      contentType: "markdown",
    });
    chain = chain.command(({ tr: tr2 }) => {
      if (transitionAnchor === null) {
        tr2.setSelection(
          selectionFromSnapshot(
            tr2.doc,
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
        locateHunkPosition(tr2.doc, revertedHunk) ?? transitionAnchor.position;
      tr2.setSelection(selectionNearPosition(tr2.doc, revertedPosition));
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
function restoreScrollTop(snapshot2) {
  if (!snapshot2) return;
  const { el, top: top2 } = snapshot2;
  el.scrollTop = top2;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      el.scrollTop = top2;
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
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  const scrollSnapshot = captureScrollTop(editor);
  rewindReviewHistory(editor, historyDepthAtStart);
  if (editor.getMarkdown() !== baselineMarkdown) {
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  }
  restoreEditorSelection(editor, selection2, selectionPosition);
  if (baselineMarkdown !== finalMarkdown) {
    replaceEditorMarkdown(
      editor,
      finalMarkdown,
      true,
      selection2,
      selectionPosition,
    );
  } else {
    recordFinalizedBoundary(editor);
  }
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection2, selectionPosition);
  restoreScrollTop(scrollSnapshot);
}
function setDiffReviewHunks(editor, hunks, config2) {
  editor.view.dispatch(
    editor.state.tr.setMeta(diffReviewPluginKey, {
      kind: "set",
      hunks,
      config: config2,
    }),
  );
}
function clearDiffReviewHunks(editor) {
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
function containsMarkdownTableRow(markdown2) {
  return markdown2.split("\n").some((line) => /^\s*\|.*\|\s*$/.test(line));
}
function countNewlines(text2) {
  let count2 = 0;
  for (let index2 = 0; index2 < text2.length; index2 += 1) {
    if (text2.charCodeAt(index2) === 10) count2 += 1;
  }
  return count2;
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
function locatableRenderedText(markdown2) {
  const normalized = collapseRenderedText(
    buildMarkdownNormalizeMap(markdown2).normalized,
  ).trim();
  return stripInlineMarkChars(
    normalized.replace(MARKDOWN_BLOCK_PREFIX, ""),
  ).trim();
}
function commonPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let length2 = 0;
  while (length2 < limit && left[length2] === right[length2]) length2 += 1;
  return length2;
}
function commonSuffixLength(left, right, prefixLength) {
  let length2 = 0;
  while (
    length2 < left.length - prefixLength &&
    length2 < right.length - prefixLength &&
    left[left.length - length2 - 1] === right[right.length - length2 - 1]
  ) {
    length2 += 1;
  }
  return length2;
}
function containsNewline(points, from2, to) {
  for (let index2 = from2; index2 < to; index2 += 1) {
    if (points[index2] === "\n") return true;
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
  const lineEnd2 = nextNewline < 0 ? points.length : nextNewline;
  const blockPrefix = MARKDOWN_BLOCK_PREFIX.exec(
    points.slice(lineStart, lineEnd2).join(""),
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
  let start2 = boundary - 1;
  while (start2 > 0 && MARKDOWN_DELIMITER_POINTS.has(points[start2 - 1]))
    start2 -= 1;
  return start2;
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
  let end2 = boundary;
  while (end2 < points.length && MARKDOWN_DELIMITER_POINTS.has(points[end2]))
    end2 += 1;
  return end2;
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
function enclosingTableKey(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    if ($pos.depth === 0) return null;
    return $pos.node(1).type.name === "table"
      ? `${$pos.before(1)}:${$pos.after(1)}`
      : null;
  } catch {
    return null;
  }
}
function enclosingHeadingLevel(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    const node2 = $pos.depth > 0 ? $pos.node(1) : null;
    if (node2?.type.name === "heading") {
      const level = node2.attrs.level;
      return typeof level === "number" ? level : 1;
    }
  } catch {}
  return null;
}
function withEnclosingBlockPrefix(markdown2, doc2, pos) {
  if (markdown2.includes("\n")) return markdown2;
  const trimmed = markdown2.trimStart();
  if (trimmed === "" || /^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```)/.test(trimmed))
    return markdown2;
  const level = enclosingHeadingLevel(doc2, pos);
  return level ? `${"#".repeat(level)} ${markdown2}` : markdown2;
}
export function useDiffReview(editor, nodeId, contentRevision, options = {}) {
  const { sourceMarkdown, onReviewDocumentApplied } = options;
  const { t: t2 } = useTranslation();
  const session = useDiffReviewStore((state2) => state2.session);
  const reverting = useDiffReviewStore((state2) => state2.reverting);
  const acceptHunk = useDiffReviewStore((state2) => state2.acceptHunk);
  const acceptHunks = useDiffReviewStore((state2) => state2.acceptHunks);
  const requestUndo = useDiffReviewStore((state2) => state2.requestUndo);
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
    const syncEditable = (state2) => {
      if (editor.isDestroyed) return;
      const ownsReview = state2.session?.nodeId === nodeId;
      const reviewReady = state2.session?.baselineMarkdown !== void 0;
      editor.setEditable(
        !(ownsReview && (state2.reverting || !reviewReady)),
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
        const current2 = useDiffReviewStore.getState().session;
        if (
          !current2 ||
          current2.requestId !== session.requestId ||
          current2.baselineMarkdown !== void 0
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
            current2.requestId,
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
    const handler = (transition2) => {
      if (
        editor.isDestroyed ||
        transition2.before.nodeId !== nodeId ||
        transition2.after.nodeId !== nodeId
      )
        return false;
      if (
        transition2.before.baselineMarkdown === void 0 ||
        (transition2.kind === "revert" && transition2.content === void 0)
      )
        return false;
      if (!recordDiffReviewTransition(editor, transition2)) return false;
      useDiffReviewStore.getState().restoreHistorySession(transition2.after);
      if (transition2.kind === "revert" && transition2.content !== void 0) {
        onReviewDocumentApplied?.(transition2.content);
      }
      if (!transition2.after.hunks.some((hunk) => hunk.status === "pending")) {
        const baseline = transition2.after.baselineMarkdown;
        if (baseline === void 0) return false;
        collapseDiffReviewHistory(
          editor,
          baseline,
          editor.getMarkdown(),
          transition2.after.historyDepthAtStart,
        );
        useDiffReviewStore
          .getState()
          .finishHistorySession(transition2.after.requestId);
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
    (markdown2, context) => {
      if (!editor) return null;
      return renderDeletedMarkdown(editor, markdown2, context);
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
    const doc2 = editor.state.doc;
    const ranges = locateHunksInDoc(doc2, presentationHunks);
    const views = [];
    const navIds = [];
    const seenTableKeys = new Set();
    let modifications = 0;
    for (const hunk of presentationHunks) {
      const range2 = ranges.get(hunk.id);
      if (!range2) {
        modifications++;
        continue;
      }
      let repId;
      if (range2.cells && range2.cells.length > 0) {
        range2.cells.forEach((cell, index2) => {
          views.push({
            id: `${hunk.id}::c${index2}`,
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
          from: range2.from,
          to: range2.to,
          deletedMarkdown: withEnclosingBlockPrefix(
            hunk.originalText,
            doc2,
            range2.from,
          ),
          deletedContext: {
            sourceMarkdown: hunk.originalText,
            prefix: hunk.reversePrefix,
            suffix: hunk.reverseSuffix,
          },
          zeroWidth: range2.from === range2.to,
        });
        repId = hunk.id;
      }
      const tableKey = enclosingTableKey(
        doc2,
        range2.cells?.[0]?.from ?? range2.from,
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
      undoLabel: t2("canvas.diffReview.undo", "撤销"),
      acceptLabel: t2("canvas.diffReview.accept", "接受"),
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
    t2,
  ]);
  reactExports.useEffect(() => {
    setActiveIndex((index2) =>
      Math.min(index2, Math.max(0, modificationCount - 1)),
    );
  }, [modificationCount]);
  const step = reactExports.useCallback(
    (dir) => {
      if (!editor || pendingHunks.length === 0) return;
      const located = locatedIdsRef.current;
      if (located.length === 0) return;
      setActiveIndex((prev) => {
        const next2 = (prev + dir + located.length) % located.length;
        const id2 = located[next2];
        if (id2) scrollToDiffHunk(editor, id2);
        return next2;
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
