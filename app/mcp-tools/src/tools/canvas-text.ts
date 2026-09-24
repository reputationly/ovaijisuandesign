/**
 * 画布文本节点的纯函数：大纲、行窗口、grep（含渲染文本回退）、锚点编辑预演、分块。
 * 全部在 MCP 内对 `nodes/detail` 取回的 markdown 源文执行，gateway 只提供全文。
 */

// ── 通用小工具 ──

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(v)));
const ellipsize = (s: string, cap: number) => (s.length > cap ? `${s.slice(0, cap)}…` : s);
const isWs = (ch: string | undefined) => ch !== undefined && /\s/.test(ch);

/** 从 `from` 起所有（可重叠的）出现位置，最多 `limit` 个。 */
function* indicesOf(hay: string, needle: string, from = 0, until = Infinity): Generator<number> {
  if (!needle) return;
  for (let at = hay.indexOf(needle, from); at >= 0 && at < until; at = hay.indexOf(needle, at + 1)) yield at;
}

// ── 大纲 / 行数 ──

export interface OutlineEntry {
  line: number;
  text: string;
}

const OUTLINE_LIMIT = 40;
const OUTLINE_WIDTH = 96;

/** 标题大纲（1 起行号）；代码围栏里的 `#` 不算标题。 */
export function buildMarkdownOutline(content: string, maxEntries = OUTLINE_LIMIT): OutlineEntry[] {
  const outline: OutlineEntry[] = [];
  let fenced = false;
  const rows = content.split("\n");
  for (const [idx, row] of rows.entries()) {
    const body = row.trimStart();
    if (body.startsWith("```") || body.startsWith("~~~")) {
      fenced = !fenced;
    } else if (!fenced && /^#{1,6}\s/.test(body)) {
      outline.push({ line: idx + 1, text: ellipsize(body, OUTLINE_WIDTH) });
      if (outline.length >= maxEntries) break;
    }
  }
  return outline;
}

/** 偏移所在的行号（1 起）。 */
export function lineOfOffset(content: string, offset: number): number {
  const head = content.slice(0, Math.max(0, offset));
  return head.split("\n").length;
}

export function countLines(content: string): number {
  return content ? content.split("\n").length : 0;
}

/** `offset` 处的文本是 `needle` 的第几次出现（零基，可重叠计数）。 */
export function occurrenceIndexAt(haystack: string, needle: string, offset: number): number {
  let n = 0;
  for (const _ of indicesOf(haystack, needle, 0, offset)) n += 1;
  return n;
}

// ── 渲染文本视图 ──
// 编辑器显示的是去掉 markdown 标记后的文字。agent 按显示文字搜索时，
// 先把源文“渲染”成一串字形，每个字形记住它来自源文哪个偏移；
// 在渲染串里找到后再映射回源文，得到能直接做锚点的精确子串。
// 合成字形（换行、表格竖线、图片占位等变成的空格）不对应真实源文。

interface Glyph {
  ch: string;
  src: number;
  synthetic: boolean;
}

class RenderedView {
  readonly glyphs: Glyph[] = [];

  /** 空白折叠：紧跟空格的空格丢弃；开头只保留真实空格。 */
  put(ch: string, src: number, synthetic: boolean): void {
    if (ch === " ") {
      const prev = this.glyphs.at(-1);
      if (prev ? prev.ch === " " : synthetic) return;
    }
    this.glyphs.push({ ch, src, synthetic });
  }

  gap(src: number): void {
    this.put(" ", src, true);
  }

  finish(): { text: string; glyphs: Glyph[] } {
    while (this.glyphs.length > 0) {
      const tail = this.glyphs.at(-1) as Glyph;
      if (!(tail.synthetic && tail.ch === " ")) break;
      this.glyphs.pop();
    }
    return { text: this.glyphs.map((g) => g.ch).join(""), glyphs: this.glyphs };
  }
}

const EMPHASIS_CHARS = new Set(["*", "_", "~", "`"]);
const ESCAPABLE = new Set([..."!#()*+-.>[\\]_`{|}~"]);

/** 行首的块级前缀（缩进、引用、列表 / 任务框、标题井号）有多长；这部分不参与渲染。 */
function blockPrefixLength(line: string): number {
  let i = 0;
  while (isWs(line[i])) i++;
  while (line[i] === ">") {
    i++;
    while (isWs(line[i])) i++;
  }
  return i + (listMarkerLength(line, i) || headingMarkerLength(line, i));
}

function listMarkerLength(line: string, at: number): number {
  let end = at;
  if ("-*+".includes(line[at] ?? "\0")) {
    end = at + 1;
  } else {
    while (end < line.length && end - at < 10 && /[0-9]/.test(line[end] as string)) end++;
    const digits = end - at;
    if (digits < 1 || digits > 9 || !".)".includes(line[end] ?? "\0")) return 0;
    end += 1;
  }
  let k = end;
  while (isWs(line[k])) k++;
  if (k === end) return 0;
  // 任务框 `[ ]` / `[x]` 后必须还有空白才算前缀的一部分
  if (line[k] === "[" && " xX".includes(line[k + 1] ?? "\0") && line[k + 2] === "]") {
    let m = k + 3;
    while (isWs(line[m])) m++;
    if (m > k + 3) k = m;
  }
  return k - at;
}

function headingMarkerLength(line: string, at: number): number {
  let end = at;
  while (line[end] === "#") end++;
  const hashes = end - at;
  if (hashes < 1 || hashes > 6 || !isWs(line[end])) return 0;
  while (isWs(line[end])) end++;
  return end - at;
}

/** 本行里成对出现的强调 / 删除线 / 行内代码标记位置；落单的标记保留原样显示。 */
function pairedMarkerMask(line: string): boolean[] {
  const mask = new Array<boolean>(line.length).fill(false);
  const pending = new Map<string, number>();
  for (const m of line.matchAll(/\\[\s\S]|\*\*|__|~~|[*`]/g)) {
    const tok = m[0];
    if (tok.startsWith("\\")) continue;
    const opened = pending.get(tok);
    if (opened === undefined) {
      pending.set(tok, m.index);
      continue;
    }
    pending.delete(tok);
    for (let k = 0; k < tok.length; k++) mask[opened + k] = mask[m.index + k] = true;
  }
  return mask;
}

/** `[`…`]` 或 `(`…`)` 的配对位置（限定在 `limit` 之前），找不到返回 -1。 */
function closingOf(line: string, at: number, open: string, close: string, limit: number): number {
  if (line[at] !== open) return -1;
  let depth = 0;
  for (let i = at; i < limit; i++) {
    if (line[i] === open) depth++;
    else if (line[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** 渲染行内 [from, to)：去掉成对标记、图片变空位、链接只留文字、`<br>` 与竖线变空格、反斜杠转义取字面。 */
function renderSpan(view: RenderedView, line: string, base: number, from: number, to: number, mask: boolean[]): void {
  let i = from;
  while (i < to) {
    const ch = line[i] as string;
    if (mask[i] && EMPHASIS_CHARS.has(ch)) {
      i++;
      continue;
    }
    const isImage = ch === "!" && i + 1 < to && line[i + 1] === "[";
    if (isImage || ch === "[") {
      const labelEnd = closingOf(line, isImage ? i + 1 : i, "[", "]", to);
      const urlEnd = labelEnd >= 0 ? closingOf(line, labelEnd + 1, "(", ")", to) : -1;
      if (urlEnd >= 0) {
        if (isImage) view.gap(base + i);
        else renderSpan(view, line, base, i + 1, labelEnd, mask);
        i = urlEnd + 1;
        continue;
      }
    }
    const br = ch === "<" ? /^<br\s*\/?>/i.exec(line.slice(i, to)) : null;
    if (br) {
      view.gap(base + i);
      i += br[0].length;
      continue;
    }
    if (ch === "|") {
      view.gap(base + i);
      i++;
      continue;
    }
    const escaped = line[i + 1];
    if (ch === "\\" && i + 1 < to && escaped !== undefined && ESCAPABLE.has(escaped)) {
      view.put(escaped, base + i + 1, false);
      i += 2;
      continue;
    }
    if (ch === "\t") view.put(" ", base + i, true);
    else view.put(ch, base + i, false);
    i++;
  }
}

const isFenceLine = (line: string) => /^\s*(```|~~~)/.test(line);
/** 表格分隔行：只有空白、冒号、竖线、横线，且竖线横线都有。 */
const isTableRule = (line: string) => line.includes("|") && line.includes("-") && /^[\s:|-]+$/.test(line);
/** 分割线：去掉空白后是三个以上的 - * _。 */
const isThematicBreak = (line: string) => /^[-*_]{3,}$/.test(line.replace(/\s/g, ""));

function renderMarkdown(raw: string): { text: string; glyphs: Glyph[] } {
  const view = new RenderedView();
  let insideFence = false;
  let base = 0;
  for (const line of raw.split("\n")) {
    const lineBase = base;
    base += line.length + 1;
    if (isFenceLine(line)) {
      insideFence = !insideFence;
      view.gap(lineBase);
      continue;
    }
    if (insideFence) {
      // 代码块内容逐字保留
      for (let k = 0; k < line.length; k++) view.put(line[k] as string, lineBase + k, false);
    } else if (isTableRule(line) || isThematicBreak(line)) {
      view.gap(lineBase);
      continue;
    } else {
      renderSpan(view, line, lineBase, blockPrefixLength(line), line.length, pairedMarkerMask(line));
    }
    view.gap(lineBase + line.length);
  }
  return view.finish();
}

interface SourceHit {
  start: number;
  end: number;
  sourceExact: string;
  occurrence: number;
}

/** 渲染串上 [first, last] 这段字形 → 源文区间（两端的合成字形不算）。 */
function glyphRangeToSource(raw: string, glyphs: Glyph[], first: number, last: number): SourceHit | null {
  let a = first;
  let b = last;
  while (a <= b && glyphs[a]?.synthetic) a++;
  while (b >= a && glyphs[b]?.synthetic) b--;
  const lo = glyphs[a];
  const hi = glyphs[b];
  if (a > b || !lo || !hi || hi.src + 1 <= lo.src) return null;
  const sourceExact = raw.slice(lo.src, hi.src + 1);
  if (sourceExact.trim() === "") return null;
  return { start: lo.src, end: hi.src + 1, sourceExact, occurrence: occurrenceIndexAt(raw, sourceExact, lo.src) };
}

/**
 * 按显示文字在源文里找。先在渲染串里直接找；找不到再把残留的 * ~ ` 也忽略掉找一遍
 * （渲染串里落单的标记同样不显示在编辑器里）。
 */
function locateRenderedText(raw: string, query: string, limit: number): SourceHit[] {
  const wanted = query.replace(/\s+/g, " ").trim();
  if (!wanted) return [];
  const { text, glyphs } = renderMarkdown(raw);
  const identity = (k: number) => k;

  const scan = (hay: string, needle: string, toGlyph: (k: number) => number | undefined): SourceHit[] => {
    const hits: SourceHit[] = [];
    for (const at of indicesOf(hay, needle)) {
      if (hits.length >= limit) break;
      const g0 = toGlyph(at);
      const g1 = toGlyph(at + needle.length - 1);
      if (g0 === undefined || g1 === undefined) continue;
      const hit = glyphRangeToSource(raw, glyphs, g0, g1);
      if (hit && !hits.some((h) => h.start === hit.start && h.end === hit.end)) hits.push(hit);
    }
    return hits;
  };

  const direct = scan(text, wanted, identity);
  if (direct.length > 0) return direct;
  const kept: number[] = [];
  for (let k = 0; k < text.length; k++) if (!"*~`".includes(text[k] as string)) kept.push(k);
  const loose = kept.map((k) => text[k]).join("");
  const looseNeedle = [...wanted].filter((c) => !"*~`".includes(c)).join("").trim();
  return looseNeedle ? scan(loose, looseNeedle, (k) => kept[k]) : [];
}

// ── grep ──

const GREP_CONTEXT = 2;
const GREP_MAX = 20;
const GREP_CEILING = 100;
const GREP_LINE_WIDTH = 240;

export interface GrepMatch {
  line: number;
  matchedText: string;
  occurrence: number;
  snippet: string;
}

export interface GrepResult {
  totalMatches: number;
  matches: GrepMatch[];
  truncated: boolean;
  matchedVia?: "source" | "rendered";
  invalidPattern?: boolean;
}

export interface GrepOptions {
  regex?: boolean;
  contextBefore?: number;
  contextAfter?: number;
  maxMatches?: number;
  caseSensitive?: boolean;
}

const escapeRegExp = (s: string) => s.replace(/[\\^$.*+?()[\]{}|]/g, (c) => `\\${c}`);

function numbered(rows: string[], firstLine: number, lastLine: number): string {
  const out: string[] = [];
  for (let n = firstLine; n <= lastLine; n++) out.push(`${n}: ${ellipsize(rows[n - 1] ?? "", GREP_LINE_WIDTH)}`);
  return out.join("\n");
}

/**
 * 按行 grep 源文。默认字面量 + smart-case（查询里有 ASCII 大写才区分大小写）。
 * 字面量搜不到时回退到渲染文本匹配，`matchedText` 给出精确源文子串。
 */
export function grepTextContent(content: string, query: string, options: GrepOptions = {}): GrepResult {
  const cap = Math.min(options.maxMatches ?? GREP_MAX, GREP_CEILING);
  const above = Math.max(0, options.contextBefore ?? GREP_CONTEXT);
  const below = Math.max(0, options.contextAfter ?? GREP_CONTEXT);
  const none: GrepResult = { totalMatches: 0, matches: [], truncated: false };
  if (query === "") return none;

  const hasUpper = /[A-Z]/.test(query);
  let re: RegExp;
  try {
    re = new RegExp(options.regex ? query : escapeRegExp(query), (options.caseSensitive ?? hasUpper) ? "g" : "gi");
  } catch {
    return { ...none, invalidPattern: true };
  }

  const rows = content.split("\n");
  const last = rows.length;
  const window = (fromLine: number, toLine: number) => numbered(rows, Math.max(1, fromLine - above), Math.min(last, toLine + below));
  const found: GrepMatch[] = [];
  let total = 0;
  let rowStart = 0;
  for (const [idx, row] of rows.entries()) {
    for (const m of row.matchAll(re)) {
      if (m[0] === "") continue;
      total++;
      if (found.length >= cap) continue;
      found.push({
        line: idx + 1,
        matchedText: m[0],
        occurrence: occurrenceIndexAt(content, m[0], rowStart + m.index),
        snippet: window(idx + 1, idx + 1),
      });
    }
    rowStart += row.length + 1;
  }
  if (total > 0 || options.regex) return { totalMatches: total, matches: found, truncated: total > found.length, matchedVia: "source" };

  const hits = locateRenderedText(content, query, cap);
  if (hits.length === 0) return { ...none, matchedVia: "source" };
  const matches = hits.map((h) => ({
    line: lineOfOffset(content, h.start),
    matchedText: h.sourceExact,
    occurrence: h.occurrence,
    snippet: window(lineOfOffset(content, h.start), lineOfOffset(content, Math.max(h.start, h.end - 1))),
  }));
  return { totalMatches: matches.length, matches, truncated: matches.length >= cap, matchedVia: "rendered" };
}

// ── 行窗口 ──

export const READ_TEXT_DEFAULT_LIMIT = 120;
export const READ_TEXT_MAX_LIMIT = 400;
const WINDOW_CHAR_BUDGET = 24_000;
const WINDOW_LINE_WIDTH = 500;

export interface TextWindow {
  startLine: number;
  endLine: number;
  totalLines: number;
  text: string;
  truncated: boolean;
}

/** 编号行窗口；超过总字符预算就停并标 truncated，避免一次塞爆上下文。 */
export function readTextWindow(content: string, offsetLine = 1, limitLines = READ_TEXT_DEFAULT_LIMIT): TextWindow {
  const rows = content.split("\n");
  const first = clampInt(offsetLine, 1, Math.max(1, rows.length));
  const want = clampInt(limitLines, 1, READ_TEXT_MAX_LIMIT);
  const lastWanted = Math.min(rows.length, first + want - 1);
  const picked: string[] = [];
  let budget = WINDOW_CHAR_BUDGET;
  let cut = false;
  for (let n = first; n <= lastWanted; n++) {
    const entry = `${n}: ${ellipsize(rows[n - 1] ?? "", WINDOW_LINE_WIDTH)}`;
    if (entry.length + 1 > budget) {
      cut = true;
      break;
    }
    budget -= entry.length + 1;
    picked.push(entry);
  }
  const reached = first + picked.length - 1;
  return { startLine: first, endLine: Math.max(first, reached), totalLines: rows.length, text: picked.join("\n"), truncated: cut };
}

// ── 锚点编辑预演 ──

export interface AnchoredEdit {
  annotationId: string;
  targetIndex?: number;
  exact: string;
  prefix?: string;
  suffix?: string;
  occurrence?: number;
  replacement: string;
}

export type EditConflictReason = "not_found" | "ambiguous" | "overlap" | "duplicate_id";

export interface EditResult {
  annotationId: string;
  targetIndex?: number;
  status: "applied" | "conflict";
  reason?: EditConflictReason;
}

type Span = { from: number; to: number };
type Located = Span | "not_found" | "ambiguous";

/**
 * 从候选位置里按 occurrence 选一个。没给 occurrence 时必须唯一；
 * 给了但越界、而候选只有一个时容忍（模型常把“第一个”写成 1）。
 */
function pick(candidates: number[], occurrence: number | undefined): number | "not_found" | "ambiguous" {
  if (candidates.length === 0) return "not_found";
  if (occurrence === undefined) return candidates.length === 1 ? (candidates[0] as number) : "ambiguous";
  return candidates[occurrence] ?? (candidates.length === 1 ? (candidates[0] as number) : "not_found");
}

/** 替换型锚点：exact 出现处且前后文吻合；只收集到判定所需的数量为止。 */
function locateReplacement(doc: string, e: AnchoredEdit): Located {
  const enough = e.occurrence === undefined ? 2 : e.occurrence + 2;
  const candidates: number[] = [];
  for (const at of indicesOf(doc, e.exact)) {
    const before = e.prefix ? at >= e.prefix.length && doc.startsWith(e.prefix, at - e.prefix.length) : true;
    const after = e.suffix ? doc.startsWith(e.suffix, at + e.exact.length) : true;
    if (!before || !after) continue;
    candidates.push(at);
    if (candidates.length >= enough) break;
  }
  const chosen = pick(candidates, e.occurrence);
  return typeof chosen === "number" ? { from: chosen, to: chosen + e.exact.length } : chosen;
}

/** 插入型锚点（exact 为空）：落点由 prefix 结尾 / suffix 开头确定。 */
function locateInsertion(doc: string, e: AnchoredEdit): Located {
  const pre = e.prefix ?? "";
  const post = e.suffix ?? "";
  if (pre === "" && post === "") return "not_found";
  const candidates = pre
    ? [...indicesOf(doc, pre)].map((at) => at + pre.length).filter((p) => post === "" || doc.startsWith(post, p))
    : [...indicesOf(doc, post)];
  const chosen = pick(candidates, e.occurrence);
  return typeof chosen === "number" ? { from: chosen, to: chosen } : chosen;
}

export type ApplyPreview =
  | { ok: true; content: string; results: EditResult[] }
  | { ok: false; content: string; results: EditResult[] };

/**
 * 本地按 gateway 同样的规则预演整批编辑：任一条冲突（找不到 / 有歧义 / 重叠 / 重复 id）
 * 整批不生效。预演结果只用于先做安全检查；是否冲突最终以 gateway 为准。
 */
export function applyAnchoredEdits(doc: string, edits: AnchoredEdit[]): ApplyPreview {
  const idOf = (e: { annotationId: string; targetIndex?: number }) => `${e.annotationId}#${e.targetIndex ?? 0}`;
  const tally = new Map<string, number>();
  for (const e of edits) tally.set(idOf(e), (tally.get(idOf(e)) ?? 0) + 1);

  const results: EditResult[] = [];
  const placed: { edit: AnchoredEdit; span: Span; result: EditResult }[] = [];
  for (const e of edits) {
    const result: EditResult = { annotationId: e.annotationId, ...(e.targetIndex !== undefined ? { targetIndex: e.targetIndex } : {}), status: "applied" };
    results.push(result);
    if ((tally.get(idOf(e)) ?? 0) > 1) {
      Object.assign(result, { status: "conflict", reason: "duplicate_id" });
      continue;
    }
    const where: Located = e.exact ? locateReplacement(doc, e) : locateInsertion(doc, e);
    if (typeof where === "string") Object.assign(result, { status: "conflict", reason: where });
    else placed.push({ edit: e, span: where, result });
  }

  // 相邻区间相交即判重叠；与“当前最远结束”的区间比较，嵌套也能抓到
  placed.sort((x, y) => x.span.from - y.span.from || x.span.to - y.span.to);
  let reach: (typeof placed)[number] | undefined;
  for (const cur of placed) {
    if (reach && reach.span.to > cur.span.from) {
      // 结果按 id 回找：同 id 的第一条（与 gateway 一致）
      for (const who of [reach, cur]) {
        const r = results.find((x) => idOf(x) === idOf(who.edit));
        if (r) Object.assign(r, { status: "conflict", reason: "overlap" });
      }
    }
    if (!reach || cur.span.to > reach.span.to) reach = cur;
  }

  if (results.some((r) => r.status === "conflict")) return { ok: false, content: doc, results };
  let out = "";
  let pos = 0;
  for (const { edit, span } of placed) {
    out += doc.slice(pos, span.from) + edit.replacement;
    pos = span.to;
  }
  return { ok: true, content: out + doc.slice(pos), results };
}

// ── 写入分块 / 计划内容识别 ──

/** gateway 单次写入体积有限，超长文本拆成定长块顺序写。 */
export const TEXT_NODE_CHUNK_SIZE = 2800;

export function splitTextForChunkedWrites(content: string, chunkSize = TEXT_NODE_CHUNK_SIZE): string[] {
  if (chunkSize < 1) throw new Error("chunk size has to be at least 1");
  const count = Math.max(1, Math.ceil(content.length / chunkSize));
  return Array.from({ length: count }, (_, k) => content.slice(k * chunkSize, (k + 1) * chunkSize));
}

/** Stage Plan 的标志是 `### stage_id:` 标题行；这类内容必须走 plan_* 工具。 */
export function looksLikeStagePlan(markdown: string): boolean {
  return /^###\s+stage_id:/m.test(markdown);
}
