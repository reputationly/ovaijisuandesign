// paragraph-line-placement.js

const DIFF_DEL_CLASS = "canvas-diff-del";

const DIFF_DEL_INLINE_CLASS = "canvas-diff-del-inline";

export function buildDeletedBlock(hunk, config2) {
  const block = document.createElement("div");
  block.className = DIFF_DEL_CLASS;
  block.setAttribute("data-diff-del-for", hunk.id);
  block.contentEditable = "false";
  const rendered = config2.renderMarkdown(
    hunk.deletedMarkdown,
    hunk.deletedContext,
  );
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

export function buildDeletedInline(hunk, config2) {
  const inline = document.createElement("span");
  inline.className = DIFF_DEL_INLINE_CLASS;
  inline.setAttribute("data-diff-del-for", hunk.id);
  inline.contentEditable = "false";
  const rendered = config2.renderMarkdown(
    hunk.deletedMarkdown,
    hunk.deletedContext,
  );
  const onlyBlock =
    rendered?.childElementCount === 1 ? rendered.firstElementChild : null;
  if (onlyBlock?.matches("p,h1,h2,h3,h4,h5,h6")) {
    while (onlyBlock.firstChild) inline.appendChild(onlyBlock.firstChild);
  } else {
    inline.textContent = rendered?.textContent || hunk.deletedMarkdown;
  }
  return inline;
}

export function topLevelBlockAt(doc2, pos) {
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

export function isInlineTextReplacement(doc2, hunk) {
  if (
    hunk.zeroWidth ||
    !hunk.deletedMarkdown ||
    hunk.deletedMarkdown.includes("\n")
  )
    return false;
  try {
    const $from = doc2.resolve(hunk.from);
    const $to = doc2.resolve(hunk.to);
    if (!$from.sameParent($to) || !$from.parent.isTextblock) return false;
    const parent = $from.parent;
    const fromOffset = $from.parentOffset;
    const toOffset = $to.parentOffset;
    const charBefore =
      fromOffset > 0
        ? parent.textBetween(fromOffset - 1, fromOffset, void 0, "")
        : "";
    const charAfter =
      toOffset < parent.content.size
        ? parent.textBetween(toOffset, toOffset + 1, void 0, "")
        : "";
    const startsLine = fromOffset === 0 || charBefore === "\n";
    const endsLine = toOffset === parent.content.size || charAfter === "\n";
    return !(startsLine && endsLine);
  } catch {
    return false;
  }
}

export function paragraphLinePlacement(doc2, hunk) {
  try {
    const $from = doc2.resolve(hunk.from);
    const $to = doc2.resolve(hunk.to);
    if (!$from.sameParent($to) || $from.parent.type.name !== "paragraph")
      return null;
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
    if (
      hunk.zeroWidth &&
      fromOffset === parent.content.size &&
      $from.depth > 0
    ) {
      const boundary = $from.after(1);
      return {
        delPos: boundary,
        ctlPos: boundary,
      };
    }
    if (!parent.textContent.includes("\n")) return null;
    const charBefore =
      fromOffset > 0
        ? parent.textBetween(fromOffset - 1, fromOffset, void 0, "")
        : "";
    const charAfter =
      toOffset < parent.content.size
        ? parent.textBetween(toOffset, toOffset + 1, void 0, "")
        : "";
    const startsLine = fromOffset === 0 || charBefore === "\n";
    const endsLine = toOffset === parent.content.size || charAfter === "\n";
    const deletionAtLineBoundary =
      hunk.zeroWidth &&
      (fromOffset === 0 ||
        fromOffset === parent.content.size ||
        charBefore === "\n" ||
        charAfter === "\n");
    const additionEndingLine =
      !hunk.zeroWidth && hunk.deletedMarkdown === "" && endsLine;
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

function isWholeWordMatch(text, from, to) {
  const before = text[from - 1];
  const after = text[to];
  const first = text[from];
  const last = text[to - 1];
  if (isWordChar(before) && isWordChar(first)) return false;
  if (isWordChar(after) && isWordChar(last)) return false;
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
  const matches = [];
  let limited = false;
  let match = pattern.exec(text2);
  while (match != null) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    } else {
      const from = match.index;
      const to = match.index + match[0].length;
      if (!options.wholeWord || isWholeWordMatch(text2, from, to)) {
        matches.push({
          from: from + baseOffset,
          to: to + baseOffset,
        });
        if (matches.length >= maxMatches) {
          limited = true;
          break;
        }
      }
    }
    match = pattern.exec(text2);
  }
  return {
    matches,
    limited,
  };
}

function expandReplacement(match, replacement) {
  return replacement.replace(/\$(\$|&|\d{1,2})/g, (full, token) => {
    if (token === "$") return "$";
    if (token === "&") return match[0];
    const groupIndex = Number(token);
    if (match[groupIndex] !== void 0) return match[groupIndex];
    if (token.length === 2) {
      const first = Number(token[0]);
      if (match[first] !== void 0) return match[first] + token[1];
    }
    return full;
  });
}

export function computeReplacementWith(pattern, matchedText, replacement) {
  if (!pattern) return replacement;
  pattern.lastIndex = 0;
  const match = pattern.exec(matchedText);
  if (!match || match.index !== 0 || match[0].length !== matchedText.length)
    return replacement;
  return expandReplacement(match, replacement);
}

export function computeReplacement(matchedText, query, options, replacement) {
  if (!options.regex) return replacement;
  return computeReplacementWith(
    compileFindPattern(query, options),
    matchedText,
    replacement,
  );
}
