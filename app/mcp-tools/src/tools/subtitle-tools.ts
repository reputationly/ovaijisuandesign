import { readFile, writeFile } from "node:fs/promises";

import { z } from "zod";

import { structuredReply, textReply } from "../replies.js";
import { escapeFfmpegFilterValue } from "./ffmpeg-guards.js";
import { bundledCjkFontDir, formatSubtitleContent, type FormattedSubtitle } from "./subtitle-format.js";
import type { RegisterTools } from "./types.js";

const FormatSchema = z.enum(["ass", "srt", "vtt"]);
const PresetSchema = z.enum(["social_safe", "minimal", "large", "top_caption", "custom"]);
const SafeAreaSchema = z.enum(["auto", "social", "none"]);
const PositionSchema = z.enum(["bottom", "top", "middle"]);
const MaxLinesSchema = z.union([z.literal(1), z.literal(2)]);

const DESCRIPTION =
  "Format an existing SRT subtitle/timed-text file into ASS/SRT/VTT using the v2 subtitle style system. " +
  "Default style_preset=\"social_safe\" applies product defaults: automatic portrait/landscape/square classification from output_size, line limits per rend" +
  "ered line (portrait CJK<=10 / English<=7 words, landscape CJK<=12 / English<=14 words, square CJK<=13 / English<=8 words), CJK/English word-safe foldi" +
  "ng, text-weighted timing only when one source cue must split beyond the two-line default, bottom MarginV=H*10% for portrait, landscape, and square, to" +
  "p MarginV=H*12.5%, font size rounded from H/24 for portrait, H/19 for landscape, and H/26 for square, a 2-unit black outline, and ASS center anchoring" +
  " so subtitle blocks keep a stable visual center. Use this after media_transcribe, or directly when the user provides an SRT/subtitle_path. " +
  "Pass only user-explicit style overrides; do not disable safe_area unless the user explicitly asks for unsafe placement.";

export const registerSubtitleTools: RegisterTools = (registrar) => {
  registrar.registerTool(
    "subtitle_format",
    {
      description: DESCRIPTION,
      inputSchema: {
        source_srt_path: z
          .string()
          .describe("Existing SRT file path to format. Use media_transcribe first only when no trusted timed text exists."),
        output_size: z
          .string()
          .regex(/^\d{2,5}x\d{2,5}$/)
          .describe('Final target video dimensions as "WxH". Required for aspect classification, safe-area margins, and line budgets.'),
        format: FormatSchema.default("ass").optional().describe("Output subtitle format. ASS is recommended for burn-in."),
        style_preset: PresetSchema.default("social_safe")
          .optional()
          .describe("Default preset is social_safe. Use custom only when the user gives explicit style instructions."),
        position: PositionSchema.default("bottom")
          .optional()
          .describe("Subtitle placement. User-explicit top overrides preset placement."),
        font_name: z
          .string()
          .optional()
          .describe("Optional ASS font family. Leave unset to auto-pick an installed CJK-capable font."),
        font_size: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Explicit ASS font size in pixels. Prefer font_scale for relative user requests like "bigger".'),
        font_scale: z.number().positive().optional().describe('Relative font size multiplier, e.g. 1.2 for "larger".'),
        margin_v: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Explicit vertical margin in pixels. Clamped by safe_area unless unsafe_override=true."),
        margin_l: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Explicit left margin in pixels. Clamped to 7% safe area unless unsafe_override=true."),
        margin_r: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Explicit right margin in pixels. Clamped to 7% safe area unless unsafe_override=true."),
        cjk_chars_per_line: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override CJK chars per line. Default comes from aspect bucket."),
        english_words_per_line: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override English words per line. Default comes from aspect bucket."),
        max_lines: MaxLinesSchema.default(2)
          .optional()
          .describe(
            "Maximum rendered lines per cue before splitting into the next cue. Default 2 preserves source timing better; set 1 only when the user explicitly wants single-line cues.",
          ),
        safe_area: SafeAreaSchema.default("social")
          .optional()
          .describe("Keep auto/social unless the user explicitly asks to ignore safe areas."),
        unsafe_override: z
          .boolean()
          .default(false)
          .optional()
          .describe("Allow unsafe margins/placement only when the user explicitly asks for it."),
        filename: z
          .string()
          .optional()
          .describe("Optional output filename without extension. Defaults to replacing .srt with the output extension."),
      },
      outputSchema: {
        path: z.string().describe("Generated subtitle file path, preserving the caller/workspace style."),
        absolute_path: z.string().describe("Absolute generated subtitle file path. Use this for ffmpeg subtitles= filters."),
        burn_hint: z
          .string()
          .describe(
            "Ready-to-use ffmpeg burn-in filter for this subtitle. " +
            "Pass this to hub_ffmpeg; do NOT hand-roll a drawtext filter (it renders CJK as tofu and breaks line breaks/timing).",
          ),
        source_srt_path: z.string().describe("Input SRT file path."),
        format: FormatSchema,
        cue_count: z.number().describe("Final cue count after line folding/splitting."),
        play_res: z.string().describe("Output size used for ASS PlayResX/Y and style derivation."),
        style_resolved: z.object({
          preset: PresetSchema,
          frame_class: z.enum(["portrait", "landscape", "square"]),
          position: PositionSchema,
          font_name: z.string(),
          font_size: z.number(),
          margin_l: z.number(),
          margin_r: z.number(),
          margin_v: z.number(),
          cjk_chars_per_line: z.number(),
          english_words_per_line: z.number(),
          max_lines: MaxLinesSchema,
          safe_area: SafeAreaSchema,
        }),
        warnings: z.array(z.string()).describe("Style overrides that were clamped or may need agent/user attention."),
      },
    },
    async (args) => {
      let srt: string;
      try {
        srt = await readFile(args.source_srt_path, "utf-8");
      } catch (err) {
        return errorText(`Error reading SRT at ${args.source_srt_path}: ${msg(err)}`);
      }
      let f: FormattedSubtitle;
      try {
        // schema 上的 default 被 optional 包住不会生效，缺省值在这里补
        f = formatSubtitleContent(srt, {
          sourceSrtPath: args.source_srt_path,
          outputSize: args.output_size,
          format: args.format ?? "ass",
          stylePreset: args.style_preset ?? "social_safe",
          position: args.position ?? "bottom",
          fontName: args.font_name,
          fontSize: args.font_size,
          fontScale: args.font_scale,
          marginV: args.margin_v,
          marginL: args.margin_l,
          marginR: args.margin_r,
          cjkCharsPerLine: args.cjk_chars_per_line,
          englishWordsPerLine: args.english_words_per_line,
          maxLines: args.max_lines ?? 2,
          safeArea: args.safe_area ?? "social",
          unsafeOverride: args.unsafe_override ?? false,
          filename: args.filename,
        });
      } catch (err) {
        return errorText(`Error formatting subtitle: ${msg(err)}`);
      }
      try {
        await writeFile(f.path, f.content, "utf-8");
      } catch (err) {
        return errorText(`Error writing subtitle to ${f.path}: ${msg(err)}`);
      }
      return structuredReply({
        path: f.path,
        absolute_path: f.absolutePath,
        burn_hint: burnHint(f),
        source_srt_path: f.sourceSrtPath,
        format: f.format,
        cue_count: f.cueCount,
        play_res: f.playRes,
        style_resolved: {
          preset: f.style.preset,
          frame_class: f.style.frameClass,
          position: f.style.position,
          font_name: f.style.fontName,
          font_size: f.style.fontSize,
          margin_l: f.style.marginL,
          margin_r: f.style.marginR,
          margin_v: f.style.marginV,
          cjk_chars_per_line: f.style.cjkCharsPerLine,
          english_words_per_line: f.style.englishWordsPerLine,
          max_lines: f.style.maxLines,
          safe_area: f.style.safeArea,
        },
        warnings: f.warnings,
      });
    },
  );
};

/** ASS 用 `ass=` 并带随包字体目录（libass 才找得到字体）；其他格式用 `subtitles=`。 */
function burnHint(f: FormattedSubtitle): string {
  const file = escapeFfmpegFilterValue(f.absolutePath);
  if (f.format !== "ass") return `subtitles='${file}'`;
  const fontsDir = bundledCjkFontDir();
  return `ass='${file}'${fontsDir ? `:fontsdir='${escapeFfmpegFilterValue(fontsDir)}'` : ""}`;
}

function errorText(text: string) {
  return { ...textReply(text), isError: true };
}

const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));
