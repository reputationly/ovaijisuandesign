/**
 * 文本节点的按片段修改：每条修改用 `prefix + exact + suffix` 定位（三者必须紧挨着），
 * 任意一条定位失败整批都不应用 —— 改了一半的文本比没改更难收拾，而且下一次按
 * 片段定位会基于一个谁都没预料到的中间状态。
 */
export interface TextEdit {
  annotationId: string;
  targetIndex?: number;
  exact: string;
  prefix?: string;
  suffix?: string;
  occurrence?: number;
  replacement: string;
}

export type EditConflictReason = "not_found" | "ambiguous" | "overlap" | "duplicate_id" | "version_changed";

export interface EditResult {
  annotationId: string;
  targetIndex?: number;
  status: "applied" | "conflict";
  reason?: EditConflictReason;
  nearest?: { line: number; snippet: string }[];
}

export interface AppliedEdit {
  annotationId: string;
  targetIndex?: number;
  originalText: string;
  replacement: string;
  newStart: number;
  newEnd: number;
  /** 从 1 开始。 */
  startLine: number;
  reversePrefix: string;
  reverseSuffix: string;
  reverseOccurrence?: number;
}

export interface ApplyOutcome {
  ok: boolean;
  content: string;
  results: EditResult[];
  applied: AppliedEdit[];
}

const REVERSE_CONTEXT = 32;

function allIndexes(hay: string, needle: string): number[] {
  if (!needle) return [];
  const out: number[] = [];
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) out.push(i);
  return out;
}

/** 定位失败时给几条最接近的行，让 agent 能直接改正而不是盲目重试。 */
function nearest(content: string, exact: string): { line: number; snippet: string }[] {
  const lines = content.split("\n").map((text, i) => ({ line: i + 1, snippet: text.trim().slice(0, 120) }));
  // 从 exact 的前 12 个字符开始，逐步缩短，直到有行包含它（最短到 2 个字符）。
  const head = Array.from(exact.trim()).slice(0, 12);
  for (let n = head.length; n >= 2; n--) {
    const probe = head.slice(0, n).join("").toLowerCase();
    const hits = lines.filter((l) => l.snippet.toLowerCase().includes(probe));
    if (hits.length) return hits.slice(0, 5);
  }
  return [];
}

export function applyTextEdits(content: string, edits: TextEdit[]): ApplyOutcome {
  const results: EditResult[] = [];
  const spans: { i: number; start: number; end: number }[] = [];
  const seen = new Set<string>();

  edits.forEach((e, i) => {
    const base: EditResult = { annotationId: e.annotationId, ...(e.targetIndex !== undefined ? { targetIndex: e.targetIndex } : {}), status: "applied" };
    const key = `${e.annotationId}:${e.targetIndex ?? ""}`;
    if (seen.has(key)) {
      results.push({ ...base, status: "conflict", reason: "duplicate_id" });
      return;
    }
    seen.add(key);
    const prefix = e.prefix ?? "";
    const matches = allIndexes(content, prefix + e.exact + (e.suffix ?? "")).map((idx) => idx + prefix.length);
    let start: number | undefined;
    if (matches.length === 0) {
      results.push({ ...base, status: "conflict", reason: "not_found", nearest: nearest(content, e.exact) });
      return;
    }
    if (e.occurrence !== undefined) {
      start = matches[e.occurrence] ?? (matches.length === 1 ? matches[0] : undefined);
      if (start === undefined) {
        results.push({ ...base, status: "conflict", reason: "not_found", nearest: nearest(content, e.exact) });
        return;
      }
    } else if (matches.length > 1) {
      results.push({ ...base, status: "conflict", reason: "ambiguous", nearest: nearest(content, e.exact) });
      return;
    } else {
      start = matches[0]!;
    }
    const span = { i, start, end: start + e.exact.length };
    if (spans.some((s) => span.start < s.end && s.start < span.end)) {
      results.push({ ...base, status: "conflict", reason: "overlap" });
      return;
    }
    spans.push(span);
    results.push(base);
  });

  if (results.some((r) => r.status === "conflict")) {
    return {
      ok: false,
      content,
      results: results.map((r) => (r.status === "applied" ? { ...r, status: "conflict" as const, reason: undefined } : r)),
      applied: [],
    };
  }

  // 从后往前替换，前面的偏移不受影响；之后再按新文本算每条的新位置。
  let next = content;
  for (const s of [...spans].sort((a, b) => b.start - a.start)) {
    next = next.slice(0, s.start) + edits[s.i]!.replacement + next.slice(s.end);
  }
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  let shift = 0;
  const applied: AppliedEdit[] = [];
  for (const s of ordered) {
    const e = edits[s.i]!;
    const newStart = s.start + shift;
    const newEnd = newStart + e.replacement.length;
    shift += e.replacement.length - (s.end - s.start);
    const reversePrefix = next.slice(Math.max(0, newStart - REVERSE_CONTEXT), newStart);
    const reverseSuffix = next.slice(newEnd, newEnd + REVERSE_CONTEXT);
    const occ = allIndexes(next, reversePrefix + e.replacement + reverseSuffix);
    applied.push({
      annotationId: e.annotationId,
      ...(e.targetIndex !== undefined ? { targetIndex: e.targetIndex } : {}),
      originalText: content.slice(s.start, s.end),
      replacement: e.replacement,
      newStart,
      newEnd,
      startLine: next.slice(0, newStart).split("\n").length,
      reversePrefix,
      reverseSuffix,
      ...(occ.length > 1 ? { reverseOccurrence: occ.indexOf(newStart - reversePrefix.length) } : {}),
    });
  }
  return { ok: true, content: next, results, applied };
}

/**
 * 撤回之前的修改：每条的 `exact` 是改后的文字（插入被删掉的内容时为空），`replacement` 是要换回去的原文。
 *
 * 和应用不同，撤回**逐条独立**：用户撤回一批批注时，其中几条附近的文字后来又被改过，其余的照样该撤掉，
 * 不能因为一条找不到就全部作废。定位逐级放宽 —— 上下文全对 → 只对前文 → 只对后文 → 只看 exact 本身；
 * 每一级都要求唯一（或给了 occurrence），宁可报冲突也不猜着改错地方。
 */
export function revertTextEdits(content: string, edits: TextEdit[]): { content: string; results: EditResult[]; appliedCount: number } {
  let next = content;
  let appliedCount = 0;
  const results: EditResult[] = [];
  for (const e of edits) {
    const base: EditResult = { annotationId: e.annotationId, ...(e.targetIndex !== undefined ? { targetIndex: e.targetIndex } : {}), status: "applied" };
    const prefix = e.prefix ?? "";
    const suffix = e.suffix ?? "";
    const attempts: [string, string][] = [[prefix, suffix]];
    if (suffix) attempts.push([prefix, ""]);
    if (prefix) attempts.push(["", suffix]);
    if (e.exact && (prefix || suffix)) attempts.push(["", ""]);
    let start: number | undefined;
    let reason: EditConflictReason = "not_found";
    for (const [pre, suf] of attempts) {
      if (!pre && !e.exact && !suf) continue;
      const hits = allIndexes(next, pre + e.exact + suf).map((i) => i + pre.length);
      if (hits.length === 0) continue;
      if (e.occurrence !== undefined) start = hits[e.occurrence] ?? (hits.length === 1 ? hits[0] : undefined);
      else if (hits.length === 1) start = hits[0];
      if (start !== undefined) break;
      reason = "ambiguous";
    }
    if (start === undefined) {
      results.push({ ...base, status: "conflict", reason });
      continue;
    }
    next = next.slice(0, start) + e.replacement + next.slice(start + e.exact.length);
    appliedCount++;
    results.push(base);
  }
  return { content: next, results, appliedCount };
}
