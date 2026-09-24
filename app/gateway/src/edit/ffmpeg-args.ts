/**
 * `POST /api/edit/ffmpeg` 的参数检查与改写。纯函数，便于单测。
 *
 * agent 手写的 ffmpeg 参数有几类常见错误要在跑之前拦下：用滤镜 / concat 协议拼视频（音轨
 * 不齐时后半段会无声或错位，应改用 merge_videos）、把滤镜写在脚本文件里（内容无法检查）、
 * 音频编码和容器不匹配（跑完才报错，白等一次转码）。
 */

export type OutputType = "video" | "audio" | "image";

const FILTER_OPTIONS = new Set(["filter_complex", "lavfi", "vf", "af", "filter"]);
const FILTER_SCRIPT_OPTIONS = new Set(["filter_complex_script", "filter_script"]);

const MERGE_ERROR =
  "Generic video concatenation is not allowed in ffmpeg. Use merge_videos with the ordered video_paths instead; it pads every clip's audio to its video timeline. The concat: protocol is not a valid MP4 concatenation strategy.";

export type CheckResult = { ok: true } | { ok: false; error: string };

/** 拦下视频拼接、滤镜脚本文件和 `-filter_complex=...` 这种单 argv 写法。`-f null` 探测不受限。 */
export function checkFfmpegCommand(args: string[], outputType: OutputType = "video"): CheckResult {
  const graphs: string[] = [];
  let dryRun = false;
  let concatInput = false;
  let pendingConcatFormat = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("-")) continue;
    const eq = arg.indexOf("=");
    const opt = eq < 0 ? arg : arg.slice(0, eq);
    // `-/filter` 是 ffmpeg 7 的"从文件读取选项值"写法；`-vf:0` 这类流限定去掉后缀再比。
    const base = opt.replace(/^-\/?/, "").split(":")[0]!;
    const isFilter = FILTER_OPTIONS.has(base);
    if (FILTER_SCRIPT_OPTIONS.has(base) || (opt.startsWith("-/") && isFilter)) {
      return {
        ok: false,
        error:
          "File-based FFmpeg filter graphs are not supported because their contents cannot be validated. Pass filters inline as separate argv entries; use merge_videos for video merging.",
      };
    }
    if (isFilter) {
      if (eq >= 0) {
        return { ok: false, error: `Invalid FFmpeg option syntax: pass "${opt}" and its filter expression as two separate argv entries, not "${opt}=...".` };
      }
      const graph = args[++i];
      if (!graph || graph.startsWith("-")) return { ok: false, error: `Missing filter expression after "${opt}".` };
      graphs.push(graph);
    } else if (arg === "-i") {
      concatInput ||= pendingConcatFormat || (args[i + 1] ?? "").startsWith("concat:");
      pendingConcatFormat = false;
      i++;
    } else if (arg === "-f") {
      const fmt = args[++i];
      if (fmt === "null") dryRun = true;
      pendingConcatFormat = fmt === "concat";
    }
  }
  if (!dryRun && (graphs.some(hasVideoConcat) || (outputType === "video" && concatInput))) return { ok: false, error: MERGE_ERROR };
  return { ok: true };
}

/**
 * 按滤镜图语法切分：引号 `'…'` 内、反斜杠转义后的分隔符都不算。`decode` 为真时顺便去掉引号和转义符。
 */
function splitGraph(value: string, seps: string, decode = false): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (quoted) {
      if (ch === "'") quoted = false;
      if (ch !== "'" || !decode) cur += ch;
    } else if (ch === "\\" && i + 1 < value.length) {
      cur += decode ? value[++i] : ch + value[++i];
    } else if (ch === "'") {
      quoted = true;
      if (!decode) cur += ch;
    } else if (seps.includes(ch)) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** 滤镜图里有没有输出视频的 `concat`（`v=0` 的纯音频拼接放行）。 */
export function hasVideoConcat(graph: string): boolean {
  return splitGraph(graph, ",;").some((filter) => {
    const body = filter.trim().replace(/^(?:\[[^\]]*\]\s*)+/, "");
    const [rawName = "", ...rest] = splitGraph(body, "=");
    const name = splitGraph(rawName, "[", true)[0]!.trim().split("@")[0];
    if (name !== "concat") return false;
    // 参数后面可能紧跟输出 pad：`concat=n=2:v=1[out]`。
    const expr = splitGraph(rest.join("="), "[", true)[0]!;
    const opts = splitGraph(expr, ":", true).map((s) => s.trim());
    const named = [...opts].reverse().find((o) => /^v\s*=/.test(o));
    // 位置参数顺序是 n:v:a；没写 v 时默认 1。
    const v = named?.replace(/^v\s*=\s*/, "") ?? (opts[1] && !opts[1].includes("=") ? opts[1] : "1");
    return v === "" || Number(v) !== 0;
  });
}

/** 有 `-f null` 就是探测：null 封装器不写数据，再追加输出路径只会留下一个 0 字节文件。 */
export function isDryRun(args: string[]): boolean {
  for (let i = 0; i < args.length - 1; i++) if (args[i] === "-f" && args[i + 1] === "null") return true;
  return false;
}

/** `-i` 后面那个值的下标。 */
export function inputIndices(args: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < args.length - 1; i++) if (args[i] === "-i") out.push(i + 1);
  return out;
}

const MEDIA_EXT = /\.(png|jpe?g|gif|webp|bmp|mp3|wav|aac|flac|ogg|m4a|opus|mp4|mov|avi|mkv|webm)$/i;

/** 输出路径由 gateway 分配。agent 还是经常在末尾自己写一个，去掉它（它不是某个 `-i` 的值才算）。 */
export function stripTrailingOutput(args: string[]): string[] {
  if (args.length === 0) return args;
  const last = args.length - 1;
  if (inputIndices(args).includes(last)) return args;
  const v = args[last]!;
  return !v.startsWith("-") && MEDIA_EXT.test(v) ? args.slice(0, -1) : args;
}

// ---------------------------------------------------------------------------
// 输出扩展名
// ---------------------------------------------------------------------------

const DEFAULT_EXT: Record<OutputType, string> = { video: ".mp4", audio: ".mp3", image: ".png" };

/** 音频编码 → 纯音频输出时的扩展名，以及能装下它的容器。 */
const AUDIO_CODECS: Record<string, { ext: string; containers: string[] }> = {};
function codecs(names: string[], ext: string, containers: string[]): void {
  for (const n of names) AUDIO_CODECS[n] = { ext, containers };
}
codecs(["aac", "libfdk_aac"], ".m4a", [".m4a", ".mp4", ".mov", ".mkv", ".aac"]);
codecs(["alac"], ".m4a", [".m4a", ".mov", ".mkv"]);
codecs(["flac"], ".flac", [".flac", ".mkv", ".ogg"]);
codecs(["opus", "libopus"], ".opus", [".opus", ".ogg", ".mkv", ".webm"]);
codecs(["vorbis", "libvorbis"], ".ogg", [".ogg", ".mkv", ".webm"]);
codecs(["mp3", "libmp3lame", "libshine"], ".mp3", [".mp3", ".mp4", ".mov", ".mkv", ".avi"]);
codecs(["pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "pcm_u8", "pcm_s16be", "pcm_s24be"], ".wav", [".wav", ".mov", ".mkv", ".avi"]);

export function parseCodecs(args: string[]): { audio?: string; video?: string } {
  const out: { audio?: string; video?: string } = {};
  for (let i = 0; i < args.length - 1; i++) {
    const f = args[i];
    if (f === "-c:a" || f === "-codec:a" || f === "-acodec") out.audio = args[i + 1]!.toLowerCase();
    else if (f === "-c:v" || f === "-codec:v" || f === "-vcodec") out.video = args[i + 1]!.toLowerCase();
  }
  return out;
}

/**
 * 输出扩展名：按 output_type 取默认容器；纯音频输出跟着 `-c:a` 走（aac → .m4a、pcm → .wav …）。
 * 容器装不下指定的音频编码（例如 .mp4 配 pcm_s16le）就提前报错，不白跑一次转码。
 */
export function resolveOutputExt(outputType: OutputType, args: string[]): { ext: string } | { error: string } {
  const codec = parseCodecs(args).audio;
  const info = codec ? AUDIO_CODECS[codec] : undefined;
  const ext = outputType === "audio" && info ? info.ext : DEFAULT_EXT[outputType];
  if (info && !info.containers.includes(ext)) {
    return {
      error: `Incompatible ffmpeg codec/container: ${ext} cannot hold audio codec "${codec}". Use output_type=audio (auto-resolves to ${info.ext}) or re-encode the audio track (e.g. -c:a aac for an ${ext} container).`,
    };
  }
  return { ext };
}
