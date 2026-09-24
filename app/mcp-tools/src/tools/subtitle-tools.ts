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
  "Turn an existing SRT subtitle / timed-text file into ASS, SRT or VTT with the house subtitle style. " +
  'The default style_preset="social_safe" derives everything from output_size: it classifies the frame as portrait, ' +
  "landscape or square; caps each rendered line (portrait: 10 CJK chars / 7 English words, landscape: 12 / 14, " +
  "square: 13 / 8); folds CJK and English text without splitting words; splits a cue into timed parts (weighted by text) " +
  "only when it exceeds the two-line default; puts bottom subtitles at MarginV = 10% of H and top subtitles at 12.5% of H; " +
  "sets font size to round(H/24) portrait, round(H/19) landscape, round(H/26) square; draws a 2px black outline; and " +
  "anchors ASS events at a fixed centre so the block does not jump between one- and two-line cues. " +
  "Typical input is the SRT produced by media_transcribe, or any SRT / subtitle_path the user hands over. The " +
  "reply gives `absolute_path` plus `burn_hint`, a filter string ready for hub_ffmpeg. Set style parameters only when " +
  "the user asked for that specific change, and keep safe_area on unless they deliberately want text near the edges.";

export const registerSubtitleTools: RegisterTools = (registrar) => {
  registrar.registerTool(
    "subtitle_format",
    {
      description: DESCRIPTION,
      inputSchema: {
        source_srt_path: z
          .string()
          .describe("Path of the SRT file to format. Only run media_transcribe first if no trustworthy timed text exists."),
        output_size: z
          .string()
          .regex(/^\d{2,5}x\d{2,5}$/)
          .describe('Final video size as "WxH" (e.g. "1080x1920"). Drives frame classification, safe margins and line limits.'),
        format: FormatSchema.default("ass").optional().describe("Output subtitle format; ASS is the one to use for burn-in."),
        style_preset: PresetSchema.default("social_safe")
          .optional()
          .describe("Named look; defaults to social_safe. Pick custom only if the user spelled out their own styling."),
        position: PositionSchema.default("bottom")
          .optional()
          .describe("Where the subtitles sit. An explicit user request for top overrides the preset placement."),
        font_name: z
          .string()
          .optional()
          .describe("ASS font family. Leave empty to pick an installed / bundled font that can render CJK."),
        font_size: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Absolute ASS font size in pixels. For relative requests like "bigger" use font_scale instead.'),
        font_scale: z.number().positive().optional().describe('Multiplier on the derived font size, e.g. 1.2 for "larger".'),
        margin_v: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Vertical margin in pixels. Raised to the safe-area minimum unless unsafe_override=true."),
        margin_l: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Space on the left, px. Values under 7% of the width are bumped up to it, except with unsafe_override=true."),
        margin_r: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Space on the right, px. Values under 7% of the width are bumped up to it, except with unsafe_override=true."),
        cjk_chars_per_line: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the CJK characters-per-line limit (default depends on the frame class)."),
        english_words_per_line: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Override the English words-per-line limit (default depends on the frame class)."),
        max_lines: MaxLinesSchema.default(2)
          .optional()
          .describe(
            "Most lines a cue may render before the rest moves into a following cue. 2 (default) keeps source timing best; use 1 only if the user explicitly wants single-line cues.",
          ),
        safe_area: SafeAreaSchema.default("social")
          .optional()
          .describe("How strictly to keep text away from frame edges. Stay on auto or social; none only on an explicit user request."),
        unsafe_override: z
          .boolean()
          .default(false)
          .optional()
          .describe("Skip the safe-area clamping of margins. Enable only on an explicit user request."),
        filename: z
          .string()
          .optional()
          .describe("Output filename without extension, written next to the source. Default: the source name with the new extension."),
      },
      outputSchema: {
        path: z.string().describe("Written subtitle file path, in the same style (relative/absolute) as the input."),
        absolute_path: z.string().describe("Absolute path of the written subtitle; use it in ffmpeg subtitles= / ass= filters."),
        burn_hint: z
          .string()
          .describe(
            "Ready-made ffmpeg filter that burns this subtitle in. Pass it to hub_ffmpeg rather than hand-writing drawtext (which shows CJK as tofu and loses line breaks and timing).",
          ),
        source_srt_path: z.string().describe("The input SRT path."),
        format: FormatSchema,
        cue_count: z.number().describe("Number of cues after folding and splitting."),
        play_res: z.string().describe("Size used for ASS PlayResX/PlayResY and style derivation."),
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
        warnings: z.array(z.string()).describe("Notes about requested values that were adjusted, for relaying to the user if relevant."),
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
