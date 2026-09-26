/**
 * 按行的文本 diff：Myers 算法出最短编辑，再按上下文行数拼成 hunk。
 *
 * 版本对比在 gateway 这边算完只回 hunk：文档可能十几 MB，两份原文都塞给渲染层既慢又占内存。
 * 编辑距离超过上限（超大改动）就退回"首尾公共部分以外整块算改动"的粗粒度结果，不让一次对比卡死。
 */

const MYERS_MAX_D = 2000;
/** 纯删除识别要把整段拼成字符串比较，超过这个字数就不做了：大块改动退回普通的删 / 增。 */
const DELETE_ONLY_CLASSIFY_MAX_CHARS = 256 * 1024;
/** 两段改动之间只隔着不超过这么多空行时，并成一段（markdown 改一节会留着段间空行，不并会被切成一堆碎块）。 */
const BLANK_GAP_COALESCE_MAX_LINES = 2;

interface RawHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

export type DiffLine =
  | { kind: "context"; oldLine: number; newLine: number; text: string }
  | { kind: "del"; oldLine: number; text: string }
  | { kind: "add"; newLine: number; text: string }
  | { kind: "retained"; newLine: number; text: string };

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface LineDiffResult {
  hunks: DiffHunk[];
  total: number;
  truncated: boolean;
  coarse: boolean;
  addedLines: number;
  removedLines: number;
}

export interface LineDiffOptions {
  contextLines: number;
  maxHunks: number;
  hunkOffset?: number;
  ignoreWhitespace?: boolean;
  coalesceBlankGaps?: boolean;
}

function myersLineHunks(oldLines: string[], newLines: string[]): RawHunk[] | null {
  let start = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (start < oldLen && start < newLen && oldLines[start] === newLines[start]) start += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const a = oldLines.slice(start, oldEnd);
  const b = newLines.slice(start, newEnd);
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];
  if (n === 0) return [{ oldStart: start, oldCount: 0, newStart: start, newCount: m }];
  if (m === 0) return [{ oldStart: start, oldCount: n, newStart: start, newCount: 0 }];
  const max = Math.min(n + m, MYERS_MAX_D);
  const offset = max;
  let v = new Int32Array(2 * max + 2);
  const trace: Int32Array[] = [];
  let foundD = -1;
  for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice());
    const next = v.slice();
    for (let k = -d; k <= d; k += 2) {
      if (k < -max || k > max) continue;
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + offset]! < v[k + 1 + offset]!)) x = v[k + 1 + offset]!;
      else x = v[k - 1 + offset]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      next[k + offset] = x;
      if (x >= n && y >= m) {
        foundD = d;
        break;
      }
    }
    v = next;
    if (foundD >= 0) break;
  }
  if (foundD < 0) return null;
  const ops: ("equal" | "insert" | "delete")[] = [];
  let x = n;
  let y = m;
  for (let d = foundD; d > 0; d -= 1) {
    const prev = trace[d];
    if (!prev) return null;
    const k = x - y;
    const prevK = k === -d || (k !== d && prev[k - 1 + offset]! < prev[k + 1 + offset]!) ? k + 1 : k - 1;
    const prevX = prev[prevK + offset]!;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push("equal");
      x -= 1;
      y -= 1;
    }
    if (x === prevX) {
      ops.push("insert");
      y -= 1;
    } else {
      ops.push("delete");
      x -= 1;
    }
  }
  while (x > 0 && y > 0) {
    ops.push("equal");
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    ops.push("delete");
    x -= 1;
  }
  while (y > 0) {
    ops.push("insert");
    y -= 1;
  }
  ops.reverse();
  const hunks: RawHunk[] = [];
  let oldLine = start;
  let newLine = start;
  let current: RawHunk | null = null;
  for (const op of ops) {
    if (op === "equal") {
      if (current) {
        hunks.push(current);
        current = null;
      }
      oldLine += 1;
      newLine += 1;
      continue;
    }
    current ??= { oldStart: oldLine, oldCount: 0, newStart: newLine, newCount: 0 };
    if (op === "delete") {
      current.oldCount += 1;
      oldLine += 1;
    } else {
      current.newCount += 1;
      newLine += 1;
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

function coarseLineHunk(oldLines: string[], newLines: string[]): RawHunk | null {
  let start = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (start < oldLen && start < newLen && oldLines[start] === newLines[start]) start += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  if (oldEnd === start && newEnd === start) return null;
  return { oldStart: start, oldCount: oldEnd - start, newStart: start, newCount: newEnd - start };
}

/**
 * 忽略空白时用的比较键：去行尾空白、正文里的连续空格压成一个；markdown 表格分隔行（`|---|:--|`）
 * 去掉全部空白并把连续横线压成一条 —— 编辑器每次保存都会重排表格对齐，这些不算用户的改动。
 */
function whitespaceInsensitiveKey(line: string): string {
  const withoutTrailing = line.replace(/[ \t]+$/, "");
  const indent = /^[ \t]*/.exec(withoutTrailing)?.[0] ?? "";
  const body = withoutTrailing.slice(indent.length);
  if (body.length > 0 && /^[\s|:-]+$/.test(body)) return indent + body.replace(/\s+/g, "").replace(/-{2,}/g, "-");
  return indent + body.replace(/[ \t]{2,}/g, " ");
}

function hunkHasContent(h: RawHunk, oldLines: string[], newLines: string[]): boolean {
  for (let i = 0; i < h.oldCount; i += 1) if ((oldLines[h.oldStart + i] ?? "").trim() !== "") return true;
  for (let i = 0; i < h.newCount; i += 1) if ((newLines[h.newStart + i] ?? "").trim() !== "") return true;
  return false;
}

function coalesceBlankGapHunks(hunks: RawHunk[], oldLines: string[], newLines: string[]): RawHunk[] {
  const out: RawHunk[] = [];
  for (const hunk of hunks) {
    const prev = out[out.length - 1];
    if (prev) {
      const gapStart = prev.oldStart + prev.oldCount;
      const gap = hunk.oldStart - gapStart;
      let bridge = gap <= BLANK_GAP_COALESCE_MAX_LINES;
      for (let i = 0; bridge && i < gap; i += 1) if ((oldLines[gapStart + i] ?? "").trim() !== "") bridge = false;
      if (bridge && hunkHasContent(prev, oldLines, newLines) && hunkHasContent(hunk, oldLines, newLines)) {
        prev.oldCount = hunk.oldStart + hunk.oldCount - prev.oldStart;
        prev.newCount = hunk.newStart + hunk.newCount - prev.newStart;
        continue;
      }
    }
    out.push({ ...hunk });
  }
  return out;
}

function groupAdjacentHunks(hunks: RawHunk[], contextLines: number): RawHunk[][] {
  const groups: RawHunk[][] = [];
  for (const hunk of hunks) {
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    const gap = previous ? hunk.oldStart - (previous.oldStart + previous.oldCount) : Number.NaN;
    if (current && previous && gap <= contextLines * 2) current.push(hunk);
    else groups.push([hunk]);
  }
  return groups;
}

function canonicalBlankShape(lines: string[], start: number, end: number, trimTail: boolean): string[] {
  const out: string[] = [];
  for (let i = Math.max(0, start); i < Math.min(lines.length, end); i += 1) {
    const line = lines[i]!;
    if (line.trim() === "") {
      if (out[out.length - 1] === "") continue;
      out.push("");
      continue;
    }
    out.push(whitespaceInsensitiveKey(line));
  }
  if (trimTail) while (out[out.length - 1] === "") out.pop();
  return out;
}

/** 只动了空行、渲染出来一模一样的改动（多一个 / 少一个空行）：忽略空白时整组丢掉。 */
function isRenderingEquivalentChange(group: RawHunk[], oldLines: string[], newLines: string[]): boolean {
  for (const hunk of group) {
    for (let i = 0; i < hunk.oldCount; i += 1) if ((oldLines[hunk.oldStart + i] ?? "").trim() !== "") return false;
    for (let i = 0; i < hunk.newCount; i += 1) if ((newLines[hunk.newStart + i] ?? "").trim() !== "") return false;
  }
  const first = group[0]!;
  const last = group[group.length - 1]!;
  const oldEnd = last.oldStart + last.oldCount;
  const newEnd = last.newStart + last.newCount;
  const trimTail = oldEnd + 1 >= oldLines.length && newEnd + 1 >= newLines.length;
  const before = canonicalBlankShape(oldLines, first.oldStart - 1, oldEnd + 1, trimTail);
  const after = canonicalBlankShape(newLines, first.newStart - 1, newEnd + 1, trimTail);
  return before.length === after.length && before.every((line, i) => line === after[i]);
}

function joinLineRangeWithinBudget(lines: string[], start: number, count: number, maxChars: number): string | null {
  if (count <= 0) return "";
  let chars = count - 1;
  for (let i = 0; i < count; i += 1) {
    chars += lines[start + i]!.length;
    if (chars > maxChars) return null;
  }
  if (count === 1) return lines[start]!;
  return lines.slice(start, start + count).join("\n");
}

/**
 * 一段"改"其实只是删掉了中间一截（新文本是旧文本去掉某个子串）：显示成删掉的那几行 + 保留的行，
 * 而不是整段删了再整段加回来。
 */
function classifyDeletionOnlyChange(
  hunk: RawHunk,
  oldLines: string[],
  newLines: string[],
): { deletedLines: DiffLine[]; retainedLines: DiffLine[] } | null {
  if (hunk.oldCount === 0 || hunk.newCount === 0) return null;
  const oldChunk = joinLineRangeWithinBudget(oldLines, hunk.oldStart, hunk.oldCount, DELETE_ONLY_CLASSIFY_MAX_CHARS);
  if (oldChunk === null) return null;
  const newChunk = joinLineRangeWithinBudget(newLines, hunk.newStart, hunk.newCount, DELETE_ONLY_CLASSIFY_MAX_CHARS - oldChunk.length);
  if (newChunk === null || oldChunk.length <= newChunk.length) return null;
  let prefixLength = 0;
  while (prefixLength < newChunk.length && oldChunk[prefixLength] === newChunk[prefixLength]) prefixLength += 1;
  let suffixLength = 0;
  const maxSuffix = newChunk.length - prefixLength;
  while (suffixLength < maxSuffix && oldChunk[oldChunk.length - suffixLength - 1] === newChunk[newChunk.length - suffixLength - 1]) {
    suffixLength += 1;
  }
  if (prefixLength + suffixLength !== newChunk.length) return null;
  let deletedStartLine = hunk.oldStart;
  for (let i = 0; i < prefixLength; i += 1) if (oldChunk[i] === "\n") deletedStartLine += 1;
  const deletedText = oldChunk.slice(prefixLength, oldChunk.length - suffixLength);
  const deletedLines: DiffLine[] = deletedText.split("\n").map((text, index) => ({ kind: "del", oldLine: deletedStartLine + index + 1, text }));
  const retainedLines: DiffLine[] = Array.from({ length: hunk.newCount }, (_, index) => ({
    kind: "retained",
    newLine: hunk.newStart + index + 1,
    text: newLines[hunk.newStart + index]!,
  }));
  return { deletedLines, retainedLines };
}

export function computeLineDiffHunks(oldText: string, newText: string, options: LineDiffOptions): LineDiffResult {
  const oldLines = oldText.length === 0 ? [] : oldText.split("\n");
  const newLines = newText.length === 0 ? [] : newText.split("\n");
  const oldKeys = options.ignoreWhitespace ? oldLines.map(whitespaceInsensitiveKey) : oldLines;
  const newKeys = options.ignoreWhitespace ? newLines.map(whitespaceInsensitiveKey) : newLines;
  let coarse = false;
  let rawHunks = myersLineHunks(oldKeys, newKeys);
  if (rawHunks === null) {
    coarse = true;
    const fallback = coarseLineHunk(oldKeys, newKeys);
    rawHunks = fallback ? [fallback] : [];
  }
  if (!coarse && options.coalesceBlankGaps && rawHunks.length > 1) rawHunks = coalesceBlankGapHunks(rawHunks, oldLines, newLines);
  const context = Math.max(0, options.contextLines);
  type Entry = { hunk: RawHunk; deletionOnly: ReturnType<typeof classifyDeletionOnlyChange> };
  const groups: Entry[][] = groupAdjacentHunks(rawHunks, context)
    .filter((group) => !options.ignoreWhitespace || !isRenderingEquivalentChange(group, oldLines, newLines))
    .map((group) => {
      const first = group[0]!;
      const last = group[group.length - 1]!;
      const combined: RawHunk = {
        oldStart: first.oldStart,
        oldCount: last.oldStart + last.oldCount - first.oldStart,
        newStart: first.newStart,
        newCount: last.newStart + last.newCount - first.newStart,
      };
      const groupDeletionOnly = coarse ? null : classifyDeletionOnlyChange(combined, oldLines, newLines);
      if (groupDeletionOnly) return [{ hunk: combined, deletionOnly: groupDeletionOnly }];
      // 粗粒度的那一块可能横跨整篇文档，拼起来比较会绕过大文件预算。
      return group.map((hunk) => ({ hunk, deletionOnly: coarse ? null : classifyDeletionOnlyChange(hunk, oldLines, newLines) }));
    });
  let addedLines = 0;
  let removedLines = 0;
  for (const group of groups) {
    for (const { hunk, deletionOnly } of group) {
      if (deletionOnly) {
        removedLines += deletionOnly.deletedLines.length;
        continue;
      }
      addedLines += hunk.newCount;
      removedLines += hunk.oldCount;
    }
  }
  const total = groups.length;
  const offset = Math.max(0, options.hunkOffset ?? 0);
  const page = groups.slice(offset, offset + Math.max(0, options.maxHunks));
  const hunks: DiffHunk[] = page.map((group) => {
    const first = group[0]!.hunk;
    const last = group[group.length - 1]!.hunk;
    const lines: DiffLine[] = [];
    const leading = Math.min(context, first.oldStart, first.newStart);
    for (let i = first.oldStart - leading; i < first.oldStart; i += 1) {
      lines.push({ kind: "context", oldLine: i + 1, newLine: first.newStart - (first.oldStart - i) + 1, text: oldLines[i]! });
    }
    group.forEach(({ hunk, deletionOnly }, index) => {
      if (deletionOnly) lines.push(...deletionOnly.deletedLines, ...deletionOnly.retainedLines);
      else {
        for (let i = 0; i < hunk.oldCount; i += 1) lines.push({ kind: "del", oldLine: hunk.oldStart + i + 1, text: oldLines[hunk.oldStart + i]! });
        for (let i = 0; i < hunk.newCount; i += 1) lines.push({ kind: "add", newLine: hunk.newStart + i + 1, text: newLines[hunk.newStart + i]! });
      }
      const next = group[index + 1]?.hunk;
      if (!next) return;
      const gapOld = hunk.oldStart + hunk.oldCount;
      const gapNew = hunk.newStart + hunk.newCount;
      for (let i = 0; i < next.oldStart - gapOld; i += 1) {
        lines.push({ kind: "context", oldLine: gapOld + i + 1, newLine: gapNew + i + 1, text: oldLines[gapOld + i]! });
      }
    });
    const tailStartOld = last.oldStart + last.oldCount;
    const tailStartNew = last.newStart + last.newCount;
    const trailing = Math.min(context, Math.max(0, oldLines.length - tailStartOld), Math.max(0, newLines.length - tailStartNew));
    for (let i = 0; i < trailing; i += 1) {
      lines.push({ kind: "context", oldLine: tailStartOld + i + 1, newLine: tailStartNew + i + 1, text: oldLines[tailStartOld + i]! });
    }
    return {
      oldStart: first.oldStart - leading + 1,
      oldCount: tailStartOld + trailing - (first.oldStart - leading),
      newStart: first.newStart - leading + 1,
      newCount: tailStartNew + trailing - (first.newStart - leading),
      lines,
    };
  });
  return { hunks, total, truncated: offset + hunks.length < total, coarse, addedLines, removedLines };
}

/** 给摘要模型看的 diff 文本：只留增删行，超出字数预算的块省略并注明还剩几块。 */
export function renderDiffForSummary(hunks: DiffHunk[], totalHunks: number, budgetChars: number): string {
  const parts: string[] = [];
  let used = 0;
  let rendered = 0;
  for (const hunk of hunks) {
    const header = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
    const body = hunk.lines
      .filter((l) => l.kind === "add" || l.kind === "del")
      .map((l) => `${l.kind === "add" ? "+" : "-"}${l.text}`)
      .join("\n");
    const block = `${header}\n${body}`;
    if (used + block.length > budgetChars) break;
    parts.push(block);
    used += block.length + 1;
    rendered += 1;
  }
  if (rendered < totalHunks) parts.push(`... ${totalHunks - rendered} more change block(s) omitted`);
  return parts.join("\n");
}
