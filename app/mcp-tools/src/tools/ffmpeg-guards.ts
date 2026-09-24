import { existsSync } from "node:fs";

import { bundledCjkFontPath } from "../env.js";

/**
 * ffmpeg 参数的改写与检查。ffmpeg 本身在 gateway 里跑，这里只在提交前
 * 拦下已知会出坏结果的写法（字体缺失出豆腐块、concat 丢音频、重采样带底噪），
 * 并给出 agent 能直接照做的修正提示。全部是纯函数，便于单测。
 */

export type GuardResult = { ok: true } | { ok: false; error: string };
export type RewriteResult = { ok: true; args: string[] } | { ok: false; error: string };

// ── 命令形状：禁止用 hub_ffmpeg 做视频拼接 ──

const FILTER_OPTIONS = new Set(["filter_complex", "lavfi", "vf", "af", "filter"]);
const FILTER_SCRIPT_OPTIONS = new Set(["filter_complex_script", "filter_script"]);

const MERGE_REQUIRED =
  "hub_ffmpeg refuses to join videos. Pass the ordered clip list to hub_merge_videos, which also verifies that " +
  "every clip has audio spanning its full picture length. Note that the concat: protocol is not a sound way to " +
  "combine MP4s.";

/** 按分隔符切 filtergraph，尊重单引号与反斜杠转义；decode=true 时去掉引号/转义符。 */
function splitGraph(value: string, separators: string, decode = false): string[] {
  const parts: string[] = [];
  let token = "";
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    if (quoted) {
      if (ch === "'") quoted = false;
      if (ch !== "'" || !decode) token += ch;
    } else if (ch === "\\" && i + 1 < value.length) {
      if (!decode) token += ch;
      token += value[++i];
    } else if (ch === "'") {
      quoted = true;
      if (!decode) token += ch;
    } else if (separators.includes(ch)) {
      parts.push(token);
      token = "";
    } else {
      token += ch;
    }
  }
  parts.push(token);
  return parts;
}

/** 去掉滤镜前面的输入 pad 标签 `[0:v][1:v]`，剩下 `name=opts`。 */
function stripPadLabels(filter: string): string {
  let rest = filter.trim();
  while (rest.startsWith("[")) {
    const close = rest.indexOf("]");
    if (close < 0) break;
    rest = rest.slice(close + 1).trimStart();
  }
  return rest;
}

/** 图里有输出视频流的 concat 滤镜（v=0 的纯音频 concat 放行）。 */
function hasVideoConcat(graph: string): boolean {
  return splitGraph(graph, ",;").some((filter) => {
    const body = stripPadLabels(filter);
    const [rawName = "", ...rawOptions] = splitGraph(body, "=");
    const name = (splitGraph(rawName, "[", true)[0] ?? "").trim().split("@")[0];
    if (name !== "concat") return false;
    const expr = splitGraph(rawOptions.join("="), "[", true)[0] ?? "";
    const opts = splitGraph(expr, ":", true).map((p) => p.trim());
    const named = [...opts].reverse().find((p) => /^v\s*=/.test(p));
    // 位置参数第二个是 v；都没写时 concat 默认 v=1
    const v = named?.replace(/^v\s*=\s*/, "") ?? (opts[1] && !opts[1].includes("=") ? opts[1] : "1");
    return v === "" || Number(v) !== 0;
  });
}

export function checkFfmpegCommand(args: string[], outputType = "video"): GuardResult {
  const graphs: string[] = [];
  let dryRun = false;
  let concatInput = false;
  let concatFormat = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (!arg.startsWith("-")) continue;
    const eq = arg.indexOf("=");
    const option = eq < 0 ? arg : arg.slice(0, eq);
    const base = option.replace(/^-[/]?/, "").split(":")[0] ?? "";
    const isFilter = FILTER_OPTIONS.has(base);
    // 从文件读 filtergraph 的写法内容没法检查，一律拒绝
    if (FILTER_SCRIPT_OPTIONS.has(base) || (option.startsWith("-/") && isFilter)) {
      return {
        ok: false,
        error:
          "hub_ffmpeg does not accept filter graphs loaded from files, because their contents cannot be checked. " +
          "Pass the filter expression inline as its own argv entry; use hub_merge_videos to merge videos.",
      };
    }
    if (isFilter) {
      if (eq >= 0) {
        return {
          ok: false,
          error: `Write "${option}" as its own array element followed by the filter graph as the next element; the combined form "${option}=..." is not accepted. (Merging videos is done with hub_merge_videos.)`,
        };
      }
      const graph = args[++i];
      if (!graph || graph.startsWith("-")) return { ok: false, error: `No filter expression follows "${option}".` };
      graphs.push(graph);
    } else if (arg === "-i") {
      const source = args[i + 1] ?? "";
      // `-f concat` 修饰的是紧随其后的这个输入
      if (concatFormat || source.startsWith("concat:")) concatInput = true;
      concatFormat = false;
      i++;
    } else if (arg === "-f") {
      const format = args[++i];
      dryRun ||= format === "null";
      concatFormat = format === "concat";
    }
  }
  if (!dryRun && (graphs.some(hasVideoConcat) || (outputType === "video" && concatInput))) {
    return { ok: false, error: MERGE_REQUIRED };
  }
  return { ok: true };
}

// ── 保留片段原声：concat 时解码重采样会给干净的生成音频加底噪 ──

const INTENTIONAL_AUDIO_FILTERS = ["amix", "sidechaincompress", "loudnorm", "volume", "afade", "atrim", "adelay", "compand", "afftdn"];

export interface FfmpegMetadata {
  prompt?: string;
  model?: string;
  description?: string;
}

function hasOptionPair(args: string[], option: string, value: string): boolean {
  return args.some((a, i) => a === option && args[i + 1] === value);
}

function optionValues(args: string[], option: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length - 1; i++) if (args[i] === option) out.push(args[i + 1] as string);
  return out;
}

export function isDryRun(args: string[]): boolean {
  return hasOptionPair(args, "-f", "null");
}

// “保留原声”的说法：英文 动词 + 可选修饰词 + audio；中文在同一分句（不跨标点）内出现保留…音频
const EN_VERBS = ["preserve", "copy"];
const EN_QUALIFIERS = ["clip", "original", "native", "source"];
const ZH_QUALIFIERS = ["clip", "片段", "视频", "原生", "原始"];
const SAME_CLAUSE = "[^。；;，,]{0,16}";
const PRESERVE_AUDIO_PATTERNS: RegExp[] = [
  ...EN_VERBS.map((verb) => new RegExp(`${verb}(?:\\s+(?:${EN_QUALIFIERS.join("|")}))?\\s+audio`, "i")),
  new RegExp(`保留${SAME_CLAUSE}(?:${ZH_QUALIFIERS.join("|")})${SAME_CLAUSE}音频`),
  new RegExp(`原样保留${SAME_CLAUSE}音频`),
];

/** metadata 里明说了“保留片段原声”（中英文说法都认）。 */
function declaresPreserveClipAudio(metadata: FfmpegMetadata | undefined): boolean {
  const text = [metadata?.description, metadata?.prompt, metadata?.model].filter(Boolean).join("\n");
  if (!text) return false;
  return PRESERVE_AUDIO_PATTERNS.some((re) => re.test(text));
}

export function checkFfmpegAudioPreserve(args: string[], metadata?: FfmpegMetadata, outputType = "video"): GuardResult {
  const command = checkFfmpegCommand(args, outputType);
  if (!command.ok) return command;
  if (isDryRun(args)) return { ok: true };
  const multiInput = optionValues(args, "-i").length >= 2;
  if (!multiInput || !declaresPreserveClipAudio(metadata)) return { ok: true };
  const graphs = [...optionValues(args, "-filter_complex"), ...optionValues(args, "-vf"), ...optionValues(args, "-af")];
  const risky = graphs.find(
    (g) =>
      /concat\s*=\s*n\s*=\s*\d+[^;]*:a\s*=\s*1/.test(g) &&
      /\[\d+:a\][^;]*(?:aresample|aformat=)/.test(g) &&
      !INTENTIONAL_AUDIO_FILTERS.some((t) => g.includes(t)),
  );
  const mapsFilteredAudio = optionValues(args, "-map").some((v) => /^\[[^\]]*a[^\]]*\]$/.test(v));
  if (!risky || !mapsFilteredAudio) return { ok: true };
  return {
    ok: false,
    error:
      "Conflict: the metadata promises the clips keep their own sound, yet the filter graph runs the inputs' audio " +
      "through resampling inside a concat and outputs that processed stream. Re-encoding like this tends to introduce " +
      "background hiss into otherwise clean generated audio. To simply join clips in sequence, use `hub_merge_videos`; " +
      "it stream-copies where it can and leaves the audio untouched. Need black frames at the end? Let that tail play " +
      "silent next to the copied audio, or first add a silent segment with the same sample rate and then mux by stream " +
      "copy. Reach for audio filters in `hub_ffmpeg` only when the goal really is to replace, mix, normalize or denoise " +
      "the sound, and say so in the metadata.",
  };
}

/** 纯换音轨：两路输入、视频 copy、映射 0:v + 1:a（或第二路就是音频文件）。 */
export function isPureAudioReplacementMux(args: string[], outputType: string): boolean {
  const inputs = optionValues(args, "-i");
  const maps = optionValues(args, "-map");
  const videoThenAudio = maps.some((v) => /^0:v(?::0)?\??$/.test(v)) && maps.some((v) => /^1:a(?::0)?\??$/.test(v));
  const secondIsAudio = /\.(?:aac|flac|m4a|mp3|ogg|opus|wav)$/i.test(inputs[1] ?? "");
  const copiesVideo =
    hasOptionPair(args, "-c:v", "copy") || hasOptionPair(args, "-codec:v", "copy") || hasOptionPair(args, "-vcodec", "copy");
  return outputType === "video" && inputs.length === 2 && copiesVideo && (videoThenAudio || secondIsAudio);
}

// ── drawtext：CJK 字体注入与检查 ──

const CJK_TEXT = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/;

/** 取 filter 串里 `key=` 的所有值（引号内原样，未加引号的到 `:` `,` `]` 为止），保留转义符。 */
export function extractOptionValues(filter: string, key: string): string[] {
  const out: string[] = [];
  const needle = `${key}=`;
  let i = filter.indexOf(needle);
  while (i !== -1) {
    let j = i + needle.length;
    const quote = filter[j];
    let value = "";
    if (quote === "'" || quote === '"') {
      j += 1;
      while (j < filter.length && filter[j] !== quote) {
        if (filter[j] === "\\" && j + 1 < filter.length) {
          value += filter.slice(j, j + 2);
          j += 2;
          continue;
        }
        value += filter[j];
        j += 1;
      }
    } else {
      while (j < filter.length) {
        const c = filter[j] as string;
        if (c === "\\" && j + 1 < filter.length) {
          value += filter.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (c === ":" || c === "," || c === "]") break;
        value += c;
        j += 1;
      }
    }
    out.push(value);
    i = filter.indexOf(needle, j);
  }
  return out;
}

/** filtergraph 值的转义：反斜杠、冒号、单引号。 */
export function escapeFfmpegFilterValue(value: string): string {
  // 反斜杠、冒号、单引号前各加一个反斜杠（一次替换，不会二次转义）
  return value.replace(/[\\:']/g, (ch) => `\\${ch}`);
}

/** 每个 drawtext 滤镜在参数串里的 [start, end) —— 到引号外的 `,` `;` `[` 为止。 */
function drawtextRanges(filter: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let start = filter.indexOf("drawtext=");
  while (start !== -1) {
    let end = start;
    let quote: string | undefined;
    while (end < filter.length) {
      const ch = filter[end];
      if (ch === "\\") {
        end += 2;
        continue;
      }
      if (quote) {
        if (ch === quote) quote = undefined;
      } else if (ch === "'" || ch === '"') {
        quote = ch;
      } else if (ch === "," || ch === ";" || ch === "[") {
        break;
      }
      end += 1;
    }
    ranges.push({ start, end });
    start = filter.indexOf("drawtext=", end);
  }
  return ranges;
}

/**
 * 含 CJK 文本但没指定字体的 drawtext，注入随包字体 `fontfile=`。
 * 系统字体不可靠（比如按需下载的字体未下载时全是豆腐块），所以宁可用随包的。
 * 环境变量没配就不动；配了但文件不在，说明安装损坏，直接报错而不是渲染出豆腐块。
 */
export function injectBundledCjkFont(
  args: string[],
  fontPath: string | undefined = bundledCjkFontPath(),
  fileExists: (p: string) => boolean = existsSync,
): RewriteResult {
  const out = [...args];
  for (let idx = 0; idx < out.length; idx++) {
    const arg = out[idx] as string;
    if (!arg.includes("drawtext")) continue;
    let rewritten = arg;
    // 从后往前替换，前面区间的下标不受影响
    for (const range of drawtextRanges(arg).reverse()) {
      const drawtext = arg.slice(range.start, range.end);
      const hasCjk = extractOptionValues(drawtext, "text").some((t) => CJK_TEXT.test(t));
      const hasFont = ["fontfile", "font"].some((k) => extractOptionValues(drawtext, k).some((v) => v.trim().length > 0));
      if (!hasCjk || hasFont || !fontPath) continue;
      if (!fileExists(fontPath)) {
        return {
          ok: false,
          error:
            "This `drawtext` contains Chinese/Japanese/Korean characters, and the font file the app ships for them " +
            "(Noto Sans CJK SC) cannot be found. The installation's resources are damaged; fix them, then render.",
        };
      }
      const injected = drawtext.replace("drawtext=", `drawtext=fontfile='${escapeFfmpegFilterValue(fontPath)}':`);
      rewritten = [rewritten.slice(0, range.start), injected, rewritten.slice(range.end)].join("");
    }
    out[idx] = rewritten;
  }
  return { ok: true, args: out };
}

/** drawtext 的 `\n` 不会换行；fontfile 指向不存在的文件会渲染成豆腐块。 */
export function checkFfmpegDrawtext(args: string[], fileExists: (p: string) => boolean = existsSync): GuardResult {
  for (const arg of args) {
    if (typeof arg !== "string" || arg.length === 0) continue;
    if (arg.includes("drawtext") && extractOptionValues(arg, "text").some((t) => /\\+n/.test(t))) {
      return {
        ok: false,
        error:
          "Line breaks written as a backslash-n inside `drawtext` text do not survive: JSON, shell and filtergraph " +
          'unescaping strip the backslash and ffmpeg prints a plain "n". To overlay several lines, point `textfile=` at a ' +
          "file containing real newlines, or chain one `drawtext` per line. Captions that follow a timeline should be " +
          "produced by `hub_subtitle_format`; burn the file it returns (its `absolute_path`) using a `subtitles=` or " +
          "`ass=` video filter.",
      };
    }
    for (const raw of extractOptionValues(arg, "fontfile")) {
      const fontPath = raw.replace(/\\(.)/g, "$1").trim();
      if (fontPath.length === 0) continue;
      if (!fileExists(fontPath)) {
        return {
          ok: false,
          error:
            `No file exists at the \`fontfile\` path '${fontPath}'. Fonts that are absent or only downloaded on ` +
            "demand make ffmpeg draw empty boxes (□) instead of glyphs. If the text is Chinese, Japanese or Korean, " +
            "remove `font` and `fontfile` and run again: the app's own CJK font gets inserted for you. Otherwise use a " +
            "font file you have confirmed exists on this machine.",
        };
      }
    }
  }
  return { ok: true };
}
