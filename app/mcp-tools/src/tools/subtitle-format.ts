import { existsSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, resolve } from "node:path";

import { BUNDLED_CJK_FONT_ENV } from "../env.js";

/**
 * SRT → ASS / SRT / VTT 的纯本地排版。规则按画幅分桶（竖 / 横 / 方）：
 * 每行字数上限、字号、安全边距都由输出尺寸推出来，保证烧进视频后不出画、不压 UI。
 */

export type SubtitleFormat = "ass" | "srt" | "vtt";
export type SubtitleStylePreset = "social_safe" | "minimal" | "large" | "top_caption" | "custom";
export type SubtitleSafeArea = "auto" | "social" | "none";
export type SubtitlePosition = "bottom" | "top" | "middle";
export type FrameClass = "portrait" | "landscape" | "square";

const ASS_BREAK = "\\N";

// ── 字体 ──

/** 各平台必带的 CJK 字体，按优先级探测。按需下载的系统字体故意不列 —— 未下载时渲染成豆腐块。 */
type FontCandidate = readonly [family: string, ...files: string[]];
const MAC_FONTS = "/System/Library/Fonts";
const WIN_FONTS = "C:/Windows/Fonts";
const LINUX_FONTS = "/usr/share/fonts";
const FONT_CANDIDATES: Record<string, readonly FontCandidate[]> = {
  darwin: [
    ["Heiti SC", `${MAC_FONTS}/STHeiti Medium.ttc`],
    ["Hiragino Sans GB", `${MAC_FONTS}/Hiragino Sans GB.ttc`],
    ["Songti SC", `${MAC_FONTS}/Supplemental/Songti.ttc`],
    ["Arial Unicode MS", "/Library/Fonts/Arial Unicode.ttf"],
  ],
  win32: [
    ["Microsoft YaHei", `${WIN_FONTS}/msyh.ttc`, `${WIN_FONTS}/msyh.ttf`],
    ["SimHei", `${WIN_FONTS}/simhei.ttf`],
    ["SimSun", `${WIN_FONTS}/simsun.ttc`, `${WIN_FONTS}/simsun.ttf`],
  ],
  linux: [
    [
      "Noto Sans CJK SC",
      `${LINUX_FONTS}/opentype/noto/NotoSansCJK-Regular.ttc`,
      `${LINUX_FONTS}/opentype/noto/NotoSansCJKsc-Regular.otf`,
      `${LINUX_FONTS}/noto-cjk/NotoSansCJK-Regular.ttc`,
    ],
    [
      "Source Han Sans SC",
      `${LINUX_FONTS}/opentype/source-han-sans/SourceHanSansSC-Regular.otf`,
      `${LINUX_FONTS}/adobe-source-han-sans/SourceHanSansSC-Regular.otf`,
    ],
    [
      "WenQuanYi Zen Hei",
      `${LINUX_FONTS}/truetype/wqy/wqy-zenhei.ttc`,
      `${LINUX_FONTS}/wenquanyi/wqy-zenhei/wqy-zenhei.ttc`,
    ],
  ],
};

/** 随包字体（存在才算）。 */
export function existingBundledCjkFontPath(): string | undefined {
  const p = process.env[BUNDLED_CJK_FONT_ENV]?.trim();
  return p && existsSync(p) ? p : undefined;
}

/** ASS 烧录时 libass 要从 fontsdir 找随包字体。 */
export function bundledCjkFontDir(): string | undefined {
  const p = existingBundledCjkFontPath();
  return p ? dirname(p) : undefined;
}

export function resolveSubtitleFontName(requested?: string): string {
  const trimmed = requested?.trim();
  if (trimmed) return trimmed;
  if (existingBundledCjkFontPath()) return "Noto Sans CJK SC";
  const hit = (FONT_CANDIDATES[platform()] ?? []).find(([, ...files]) => files.some((f) => existsSync(f)));
  return hit ? hit[0] : "sans-serif";
}

// ── CJK 折行 ──

const CJK_BREAK_PUNCT = new Set([
  "，", "。", "、", "！", "？", "；", "：", "…", "—", "·", "）", "】", "」", "』", "〉", "》",
  ",", ".", "!", "?", ";", ":",
]);

function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x3040 && cp <= 0x30ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff66 && cp <= 0xff9f) ||
    (cp >= 0xac00 && cp <= 0xd7af)
  );
}

export function containsCjk(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && isCjkCodePoint(cp)) return true;
  }
  return false;
}

interface Token {
  text: string;
  length: number;
  isBreakPunct: boolean;
  isCjkWord: boolean;
  isWhitespace: boolean;
}

function makeToken(text: string, wordLike: boolean): Token {
  const ws = /^\s+$/.test(text);
  const normalized = ws ? " " : text;
  const chars = Array.from(normalized);
  return {
    text: normalized,
    length: chars.length,
    isBreakPunct: chars.some((c) => CJK_BREAK_PUNCT.has(c)),
    isCjkWord: wordLike && containsCjk(normalized),
    isWhitespace: ws,
  };
}

/** 用 Intl.Segmenter 分词，避免把“字幕”这类多字词拆到两行；没有 Segmenter 退化成逐字。 */
function tokenize(seg: string): Token[] {
  const perChar = () => Array.from(seg).map((c) => makeToken(c, false));
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Segmenter) return perChar();
  const tokens: Token[] = [];
  for (const item of new Segmenter("zh-Hans", { granularity: "word" }).segment(seg)) {
    if (item.segment) tokens.push(makeToken(item.segment, item.isWordLike === true));
  }
  return tokens.length > 0 ? tokens : perChar();
}

const span = (t: Token[], a: number, b: number) =>
  t
    .slice(a, b)
    .map((x) => x.text)
    .join("")
    .trim();

function spanLength(t: Token[], a: number, b: number): number {
  let n = 0;
  for (let i = a; i < b; i++) n += t[i]?.length ?? 0;
  return n;
}

function visibleBefore(t: Token[], end: number): Token | null {
  for (let i = end - 1; i >= 0; i--) if (t[i] && !t[i]!.isWhitespace) return t[i]!;
  return null;
}

function visibleFrom(t: Token[], start: number): Token | null {
  for (let i = start; i < t.length; i++) if (t[i] && !t[i]!.isWhitespace) return t[i]!;
  return null;
}

/** 断点两侧都是多字 CJK 词（且都不是标点）时不宜在此断。 */
function splitsWords(t: Token[], at: number): boolean {
  const prev = visibleBefore(t, at);
  const next = visibleFrom(t, at);
  if (!prev || !next || prev.isBreakPunct || next.isBreakPunct) return false;
  return prev.isCjkWord && next.isCjkWord && prev.length > 1 && next.length > 1;
}

function wordSafeBreak(t: Token[], start: number, proposed: number, minLength: number): number {
  let at = proposed;
  while (at > start + 1 && splitsWords(t, at)) {
    if (spanLength(t, start, at - 1) < minLength) break;
    at -= 1;
  }
  return at;
}

/** 一段 CJK 按每行 max 字折开：优先在后半行的标点处断，其次避开词中间。 */
export function foldCjkSegment(seg: string, max: number): string[] {
  const safeMax = Math.max(1, max);
  const minBreak = Math.ceil(safeMax / 2);
  const t = tokenize(seg);
  const lines: string[] = [];
  let i = 0;
  while (i < t.length) {
    while (t[i]?.isWhitespace) i++;
    if (i >= t.length) break;
    let len = 0;
    let end = i;
    let punctEnd = -1;
    let punctLen = 0;
    while (end < t.length) {
      const tok = t[end]!;
      const next = len + tok.length;
      if (len > 0 && next > safeMax) break;
      len = next;
      end++;
      if (tok.isBreakPunct) {
        punctEnd = end;
        punctLen = len;
      }
      if (len >= safeMax) break;
    }
    let at = punctEnd > i && punctLen >= minBreak ? punctEnd : wordSafeBreak(t, i, end, minBreak);
    if (at <= i) at = end > i ? end : i + 1;
    const line = span(t, i, at);
    if (line) lines.push(line);
    i = at;
  }
  return lines.length > 0 ? lines : [seg];
}

function foldLatin(seg: string, maxWords: number): string[] {
  const words = seg.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [seg];
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) lines.push(words.slice(i, i + maxWords).join(" "));
  return lines;
}

interface FoldLimits {
  maxCharsCJK: number;
  maxWordsEN: number;
  maxLines: number;
}

/** 已有的换行（\N）保留为硬断点，每段再按语言折。 */
function foldCueLines(text: string, limits: FoldLimits): string[] {
  if (!text) return [text];
  const out: string[] = [];
  for (const raw of text.split(ASS_BREAK)) {
    const s = raw.trim();
    if (s === "") {
      out.push("");
      continue;
    }
    out.push(...(containsCjk(s) ? foldCjkSegment(s, limits.maxCharsCJK) : foldLatin(s, limits.maxWordsEN)));
  }
  return out;
}

// ── 时间码 ──

export interface Cue {
  start: string;
  end: string;
  text: string;
}

function srtTimeToMs(t: string): number | null {
  const m = /^(\d{2}):(\d{2}):(\d{2}),(\d{1,3})$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 3_600_000 + Number(m[2]) * 60_000 + Number(m[3]) * 1_000 + Number((m[4] ?? "0").padEnd(3, "0"));
}

function msToSrtTime(ms: number): string {
  const v = Math.max(0, Math.round(ms));
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(v / 3_600_000))}:${pad(Math.floor((v % 3_600_000) / 60_000))}:${pad(Math.floor((v % 60_000) / 1_000))},${pad(v % 1_000, 3)}`;
}

/** 拆分时长的权重：CJK 每字 1、拉丁每词 1、其他可见符号 0.25 —— 近似朗读时长。 */
function timingWeight(text: string): number {
  let w = 0;
  let inWord = false;
  for (const ch of text.replaceAll(ASS_BREAK, " ")) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && isCjkCodePoint(cp)) {
      w += 1;
      inWord = false;
    } else if (/[A-Za-z0-9]/.test(ch)) {
      if (!inWord) w += 1;
      inWord = true;
    } else {
      if (!/\s/.test(ch)) w += 0.25;
      inWord = false;
    }
  }
  return Math.max(1, w);
}

/** 折完超过 maxLines 行时拆成多条 cue，时长按文本权重分配；时间码解析不了就只拆文本。 */
function foldCueToCues(cue: Cue, limits: FoldLimits): Cue[] {
  const folded = foldCueLines(cue.text, limits);
  const groups = chunk(folded, limits.maxLines);
  if (groups.length <= 1) return [{ ...cue, text: folded.join(ASS_BREAK) }];
  const startMs = srtTimeToMs(cue.start);
  const endMs = srtTimeToMs(cue.end);
  const timed = startMs !== null && endMs !== null && endMs > startMs;
  if (!timed) return groups.map((g) => ({ ...cue, text: g.join(ASS_BREAK) }));
  const duration = endMs - startMs;
  const weights = groups.map((c) => timingWeight(c.join(ASS_BREAK)));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return groups.map((c, idx) => {
    const s = idx === 0 ? startMs : startMs + Math.round((duration * acc) / total);
    acc += weights[idx] ?? 1;
    const e = idx === groups.length - 1 ? endMs : startMs + Math.round((duration * acc) / total);
    return { start: msToSrtTime(s), end: msToSrtTime(Math.max(s + 1, e)), text: c.join(ASS_BREAK) };
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  items.forEach((item, idx) => {
    if (idx % size === 0) out.push([]);
    out[out.length - 1]!.push(item);
  });
  return out;
}

/** 容错解析：块间空行分隔，找含 `-->` 的行当时间码，编号行可有可无；多行文本用 \N 连起来。 */
export function parseSrt(text: string): Cue[] {
  const blocks = text.split(/\r\n?|\n/).join("\n").trim().split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const rows = block.split("\n").filter((row) => row.trim() !== "");
    const timeRow = rows.findIndex((row) => row.includes("-->"));
    if (timeRow < 0) continue;
    const [start = "", end = ""] = rows[timeRow]!.split("-->").map((part) => part.trim());
    if (start && end) cues.push({ start, end, text: rows.slice(timeRow + 1).join(ASS_BREAK) });
  }
  return cues;
}

function srtTimeToAss(t: string): string {
  const [hms, msRaw = "0"] = t.split(",");
  if (!hms) return "0:00:00.00";
  const [h = "0", m = "00", s = "00"] = hms.split(":");
  const cs = String(Math.round((Number(msRaw) || 0) / 10)).padStart(2, "0");
  return `${Number(h)}:${m}:${s}.${cs}`;
}

const plainLines = (text: string) => text.split(ASS_BREAK).join("\n");

function buildSrt(cues: Cue[]): string {
  return cues.map((c, i) => `${i + 1}\n${c.start} --> ${c.end}\n${plainLines(c.text)}`).join("\n\n");
}

function buildVtt(cues: Cue[]): string {
  const body = cues
    .map((c) => `${c.start.replace(",", ".")} --> ${c.end.replace(",", ".")}\n${plainLines(c.text)}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}

// ── 样式 ──

const SIDE_SAFE_MARGIN_RATIO = 0.07;
const TOP_MARGIN_RATIO = 0.125;
const BOTTOM_MARGIN_RATIO: Record<FrameClass, number> = { portrait: 0.1, landscape: 0.1, square: 0.1 };
const FONT_SIZE_HEIGHT_DIVISOR: Record<FrameClass, number> = { portrait: 24, landscape: 19, square: 26 };
const LINE_LIMITS: Record<FrameClass, { maxCharsCJK: number; maxWordsEN: number }> = {
  portrait: { maxCharsCJK: 10, maxWordsEN: 7 },
  landscape: { maxCharsCJK: 12, maxWordsEN: 14 },
  square: { maxCharsCJK: 13, maxWordsEN: 8 },
};

export function classifyFrame(W: number, H: number): FrameClass {
  const r = W / Math.max(1, H);
  if (r < 0.9) return "portrait";
  if (r > 1.2) return "landscape";
  return "square";
}

function deriveStyle(W: number, H: number, position: SubtitlePosition) {
  const frameClass = classifyFrame(W, H);
  return {
    frameClass,
    fontSize: Math.max(1, Math.round(H / FONT_SIZE_HEIGHT_DIVISOR[frameClass])),
    marginL: Math.round(W * SIDE_SAFE_MARGIN_RATIO),
    marginR: Math.round(W * SIDE_SAFE_MARGIN_RATIO),
    marginV: Math.round(H * (position === "top" ? TOP_MARGIN_RATIO : BOTTOM_MARGIN_RATIO[frameClass])),
    ...LINE_LIMITS[frameClass],
  };
}

/** #RRGGBB[AA] → ASS 的 &HAABBGGRR（ASS 的 alpha 是透明度，要反过来）。 */
export function hexToAssColor(hex: string): string {
  const n = hex.trim().replace(/^#/, "");
  const rgb = /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(n) ? n.slice(0, 6) : "FFFFFF";
  const alpha = n.length === 8 ? Number.parseInt(n.slice(6, 8), 16) : 255;
  const a = (255 - alpha).toString(16).padStart(2, "0").toUpperCase();
  return `&H${a}${rgb.slice(4, 6).toUpperCase()}${rgb.slice(2, 4).toUpperCase()}${rgb.slice(0, 2).toUpperCase()}`;
}

const DEFAULT_COLORS = {
  primary: hexToAssColor("#FFFFFF"),
  outline: hexToAssColor("#000000"),
  back: hexToAssColor("#00000080"),
  outlineWidth: 2,
  shadowSize: 1,
};

export interface ResolvedStyle {
  preset: SubtitleStylePreset;
  frameClass: FrameClass;
  position: SubtitlePosition;
  fontName: string;
  fontSize: number;
  marginL: number;
  marginR: number;
  marginV: number;
  cjkCharsPerLine: number;
  englishWordsPerLine: number;
  maxLines: 1 | 2;
  safeArea: SubtitleSafeArea;
}

const ALIGNMENT: Record<SubtitlePosition, number> = { top: 8, middle: 5, bottom: 2 };

function centerAnchorY(H: number, s: ResolvedStyle): number {
  if (s.position === "top") return Math.round(s.marginV + s.fontSize / 2);
  if (s.position === "middle") return Math.round(H / 2);
  return Math.round(H - s.marginV - s.fontSize / 2);
}

/**
 * 每条 Dialogue 都带 `\an5\pos(...)` 中心锚点：一行和两行的字幕块视觉中心不跳。
 * Style 行的 Alignment / Margin 保留，供不认覆盖标签的播放器退化使用。
 */
function buildAss(W: number, H: number, s: ResolvedStyle, cues: Cue[]): string {
  const c = DEFAULT_COLORS;
  const anchor = `{\\an5\\pos(${Math.round(W / 2)},${centerAnchorY(H, s)})}`;
  const header =
    `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n` +
    `[V4+ Styles]\n` +
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Default,${s.fontName},${s.fontSize},${c.primary},${c.primary},${c.outline},${c.back},0,0,0,0,100,100,0,0,1,${c.outlineWidth},${c.shadowSize},${ALIGNMENT[s.position]},${s.marginL},${s.marginR},${s.marginV},1\n\n` +
    `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const events = cues
    .map((cue) => `Dialogue: 0,${srtTimeToAss(cue.start)},${srtTimeToAss(cue.end)},Default,,0,0,0,,${anchor}${cue.text}`)
    .join("\n");
  return events.length > 0 ? `${header}${events}\n` : header;
}

export interface SubtitleFormatOptions {
  sourceSrtPath: string;
  outputSize: string;
  format?: SubtitleFormat;
  stylePreset?: SubtitleStylePreset;
  position?: SubtitlePosition;
  fontName?: string;
  fontSize?: number;
  fontScale?: number;
  marginV?: number;
  marginL?: number;
  marginR?: number;
  cjkCharsPerLine?: number;
  englishWordsPerLine?: number;
  maxLines?: 1 | 2;
  safeArea?: SubtitleSafeArea;
  unsafeOverride?: boolean;
  filename?: string;
}

function parseOutputSize(v: string): { W: number; H: number } | null {
  const m = /^(\d{2,5})x(\d{2,5})$/.exec(v);
  return m ? { W: Number(m[1]), H: Number(m[2]) } : null;
}

/** 输出与源 SRT 同目录：给了 filename 用它（去掉扩展名），否则把 .srt 换成目标扩展名。 */
function outputPathFor(source: string, format: SubtitleFormat, filename?: string): string {
  const ext = `.${format}`;
  if (filename?.trim()) return join(dirname(source), `${filename.trim().replace(/\.[^.]+$/, "")}${ext}`);
  const replaced = source.replace(/\.srt$/i, ext);
  // 源文件不是 .srt 扩展名时替换不生效，追加扩展名，免得覆盖源文件
  return replaced === source ? `${source}${ext}` : replaced;
}

/**
 * 显式覆盖优先于预设；安全区开着时，左右边距至少 7% 宽、上下边距不小于推导值，
 * 被夹回的覆盖写进 warnings 让 agent 知道。
 */
export function resolveStyle(W: number, H: number, o: SubtitleFormatOptions): { style: ResolvedStyle; warnings: string[] } {
  const preset = o.stylePreset ?? "social_safe";
  const position = o.position ?? (preset === "top_caption" ? "top" : "bottom");
  const base = deriveStyle(W, H, position);
  const warnings: string[] = [];
  const safeArea = o.safeArea ?? (preset === "custom" ? "auto" : "social");
  const unsafe = o.unsafeOverride === true;

  let fontSize = o.fontSize ?? base.fontSize;
  if (o.fontScale !== undefined) fontSize = Math.max(1, Math.round(fontSize * o.fontScale));
  const noSizeOverride = o.fontSize === undefined && o.fontScale === undefined;
  if (preset === "minimal" && noSizeOverride) fontSize = Math.max(1, Math.round(fontSize * 0.9));
  else if (preset === "large" && noSizeOverride) fontSize = Math.max(1, Math.round(fontSize * 1.2));

  let marginL = o.marginL ?? base.marginL;
  let marginR = o.marginR ?? base.marginR;
  let marginV = o.marginV ?? base.marginV;
  const minSide = Math.round(W * SIDE_SAFE_MARGIN_RATIO);
  if (safeArea !== "none" && !unsafe) {
    if (marginL < minSide) {
      warnings.push(`margin_l=${marginL} would put text within 7% of the left edge; raised to ${minSide}.`);
      marginL = minSide;
    }
    if (marginR < minSide) {
      warnings.push(`margin_r=${marginR} would put text within 7% of the right edge; raised to ${minSide}.`);
      marginR = minSide;
    }
    if (o.marginV !== undefined && position !== "middle" && marginV < base.marginV) {
      warnings.push(`margin_v=${marginV} is below the safe vertical offset; raised to ${base.marginV}.`);
      marginV = base.marginV;
    }
  }
  return {
    style: {
      preset,
      frameClass: base.frameClass,
      position,
      fontName: resolveSubtitleFontName(o.fontName),
      fontSize,
      marginL,
      marginR,
      marginV,
      cjkCharsPerLine: o.cjkCharsPerLine ?? base.maxCharsCJK,
      englishWordsPerLine: o.englishWordsPerLine ?? base.maxWordsEN,
      maxLines: o.maxLines ?? 2,
      safeArea,
    },
    warnings,
  };
}

export interface FormattedSubtitle {
  path: string;
  absolutePath: string;
  sourceSrtPath: string;
  format: SubtitleFormat;
  cueCount: number;
  playRes: string;
  style: ResolvedStyle;
  warnings: string[];
  content: string;
}

export function formatSubtitleContent(srt: string, o: SubtitleFormatOptions): FormattedSubtitle {
  const size = parseOutputSize(o.outputSize);
  if (!size) throw new Error(`invalid output_size "${o.outputSize}" — expected "WxH"`);
  const { W, H } = size;
  const format = o.format ?? "ass";
  const { style, warnings } = resolveStyle(W, H, o);
  const limits = { maxCharsCJK: style.cjkCharsPerLine, maxWordsEN: style.englishWordsPerLine, maxLines: style.maxLines };
  const cues = parseSrt(srt).flatMap((cue) => foldCueToCues(cue, limits));
  const content =
    format === "ass" ? buildAss(W, H, style, cues) : format === "vtt" ? `${buildVtt(cues)}\n` : `${buildSrt(cues)}\n`;
  const path = outputPathFor(o.sourceSrtPath, format, o.filename);
  return {
    path,
    absolutePath: resolve(path),
    sourceSrtPath: o.sourceSrtPath,
    format,
    cueCount: cues.length,
    playRes: `${W}x${H}`,
    style,
    warnings,
    content,
  };
}
