import { z } from "zod";

import { errorReply, structuredReply } from "../replies.js";
import { EditResponseSchema } from "../schemas.js";
import {
  checkFfmpegAudioPreserve,
  checkFfmpegDrawtext,
  injectBundledCjkFont,
  isPureAudioReplacementMux,
} from "./ffmpeg-guards.js";
import type { RegisterTools } from "./types.js";

/**
 * ffmpeg / merge_videos：MCP 只做参数改写与检查，真正执行在 gateway
 * （它负责输出路径、入库和画布落位）。
 */

const FFMPEG_TIMEOUT_MS = 5 * 60_000;
const CONCAT_TIMEOUT_MS = 10 * 60_000;

const CJK_DRAWTEXT_GUIDANCE =
  "For Chinese/Japanese/Korean or pure English `drawtext`, omit `font` and `fontfile` by default: the Desktop runtime automatically injects the " +
  "app-bundled Noto Sans CJK SC font. Never guess an OS font path (for example PingFang); set an explicit font only when the user " +
  "requests it and the font is known to exist on the rendering host.";

const CANVAS_TARGET_GUIDANCE =
  "CANVAS PLACEMENT is controlled by `canvas_target` (default `new_round`): a derivative of a canvas asset lands as a NEW ROUND on the node that " +
  "currently shows the first `-i` input, so the user can switch between the previous and new version and the old one is never lost. Use `new_node` " +
  "when the output is a different work rather than a new version (extract audio, grab a frame, split clips, first-time compose of several sources). " +
  "Gateway enforces: audio outputs and outputs whose type differs from the target node always become a new node; a node that is already filled is " +
  "never overwritten.";

const FFMPEG_DESCRIPTION =
  "Run ffmpeg command on local media files via Gateway. " +
  "When source nodeIds are already available in attachment context or tool results, include input_node_ids even if the input paths are correct. " +
  "To produce a concatenated video file, you MUST use merge_videos. Do NOT use ffmpeg to produce concatenated video. Use ffmpeg for other editing " +
  "operations, such as trimming, scaling, and audio mixing. " +
  CJK_DRAWTEXT_GUIDANCE +
  " Output path is managed automatically -- do NOT include one in args. Input paths after `-i` must be absolute local paths; do not " +
  "pass display filenames copied from summaries or timeline text. QUALITY: when a video filter forces re-encoding and you pass no rate control, " +
  "Gateway injects `-c:v libx264 -crf 18` to preserve source quality -- do not hand-pick `-crf` / `-b:v` unless the user explicitly asks to compress. " +
  "Two modes are supported: (1) NORMAL — produces an output file enrolled into the workspace asset vault and placed on canvas automatically -- the " +
  "returned `node_id` is the completion proof; do NOT call canvas_write_node afterwards; (2) DRY-RUN " +
  "/ PROBE — pass `-f null` in args (e.g. `[\"-i\",\"/absolute/path/clip.mp4\",\"-f\",\"null\"]` or with a `showinfo`/`silencedetect`/etc. " +
  "filter) to inspect input streams without producing any file; the tool returns ffmpeg stderr (where stream metadata and `showinfo` " +
  "lines live) as `probe`. The trailing `-` stdout placeholder that ffmpeg requires for the null muxer is auto-appended for you. " +
  CANVAS_TARGET_GUIDANCE +
  " When postprocess finalizes an immediately preceding temporary visual-only generation (e.g. muxing the original audio back), keep the default " +
  "`new_round` and pass that generation result node_id as target_node_id. For video concatenation that preserves clip audio, use merge_videos " +
  "instead of hand-written audio concat filters; generic ffmpeg audio resample/re-encode can add hiss to generated clip audio. Use ffmpeg only for " +
  "operations without a dedicated tool.";

const FILENAME_DESCRIPTION =
  "Output filename without extension. 2-3 words, kebab-case, e.g. \"guo-portrait\", \"rain-scene\". " +
  "Describe the asset itself; skip episode / scene / project context.";

const SOURCE_NODE_ID_DESCRIPTION =
  "Optional source canvas nodeId (e.g. from canvas_list_nodes) when editing/regenerating a node. Links output to source via derivation edge.";

const MetadataSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
});

export const registerEditingTools: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "ffmpeg",
    {
      description: FFMPEG_DESCRIPTION,
      inputSchema: {
        args: z
          .array(z.string())
          .describe(
            "CLI arguments WITHOUT output path. Option names and values must be separate array entries; never use `-filter_complex=...`. " +
            "Video concat must use merge_videos. (e.g. [\"-i\", \"/absolute/path/input.mp4\", \"-c\", \"copy\"]). " +
            "`-i` inputs must be absolute local paths, not display filenames. The output path is appended automatically by Gateway. " +
            "For dry-run / probe (no output file), include `-f null` in args.",
          ),
        input_node_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Optional source canvas nodeIds in the exact order of ALL -i inputs: [\"video-node\"] for one input, [\"video-node\", \"audio-node\"] for two. " +
              "When any source nodeId is known, include the array and use \"\" for every unknown input, including special inputs; never omit its slot. " +
              "Omit the array when no source nodeIds are known; no extra lookup is required just to populate this optional parameter. Copy ids from canvas " +
              "attachments, generation results or hub_canvas_get_node results; do not guess. Gateway checks each path first (relative paths use the current " +
              "workspace); only a missing ordinary local file may fall back to its corresponding node in the same project. Existing paths, special inputs " +
              "(URLs, pipes, devices, sequences, explicit input demuxers) and failed lookups stay unchanged. A length mismatch disables node fallback. " +
              "Identifies INPUTS; target_node_id controls OUTPUT placement.",
          ),
        output_type: z
          .enum(["video", "audio", "image"])
          .default("video")
          .describe(
            "Media category of the output in NORMAL mode. Sets the default container (.mp4 / .mp3 / .png). " +
            "For audio, the container is auto-derived from the `-c:a` encoder in args when present (aac/alac -> .m4a, pcm_* -> .wav, flac -> .flac, opus -> .opus, " +
            "vorbis -> .ogg, mp3 -> .mp3) — so just pass the encoder you want and the extension follows. An encoder that the chosen container cannot hold (e.g. " +
            "video output with `-c:a pcm_s16le` in an .mp4) is rejected up front with a fix hint, not run. Ignored in DRY-RUN mode (no file produced).",
          ),
        canvas_target: z
          .enum(["new_round", "new_node"])
          .default("new_round")
          .describe(
            "Where the NORMAL-mode output goes on canvas. `new_round` (default): append as a new switchable version on the node showing the first `-i` input " +
              "(or `target_node_id`) — use for any derivative of the same work: subtitles, watermark, BGM / audio mux, color grade, trim, resize, format convert. " +
              "`new_node`: create a separate node — use when the output is a different work: extract audio, grab a frame, split into clips, first-time compose of " +
              "several inputs. Ignored in DRY-RUN mode. If the input is not on canvas, `new_round` silently behaves like `new_node`.",
          ),
        target_node_id: z
          .string()
          .optional()
          .describe(
            "Optional explicit canvas nodeId that the `new_round` output should be appended to. Only needed when the first `-i` input does not identify the " +
              "intended node (e.g. finalizing a temporary generation result: pass the node_id returned by hub_generate_video). Must be a node of the same media " +
              "type as output_type.",
          ),
        replace_node_id: z.string().optional().describe("DEPRECATED alias of target_node_id; prefer target_node_id."),
        metadata: MetadataSchema.optional().describe(
          "Optional metadata for the output asset. Pass prompt/model/description to preserve provenance when the ffmpeg output derives from a generated image (e." +
          "g. cropping a Midjourney grid). Ignored in DRY-RUN mode.",
        ),
        filename: z.string().describe(`${FILENAME_DESCRIPTION} In DRY-RUN mode this is ignored \u2014 pass any placeholder.`),
      },
      outputSchema: {
        path: z.string().optional().describe("Output file path managed by Gateway. Present only in NORMAL mode; absent in DRY-RUN / PROBE mode."),
        probe: z.string().optional().describe("ffmpeg probe output (stderr+stdout merged). Present only in DRY-RUN mode (when `-f null` is in args)."),
        node_id: z.string().optional().describe("Canvas node id when placement landed."),
      },
      attachmentInputPaths: (input) => inputPaths((input.args as string[]) ?? []),
      attachmentOutputPaths: (output) => (typeof output.path === "string" ? [output.path] : []),
    },
    async ({ args, input_node_ids, output_type, canvas_target, target_node_id, replace_node_id, metadata, filename }) => {
      const font = injectBundledCjkFont(args);
      if (!font.ok) return errorReply(font.error);
      const drawtext = checkFfmpegDrawtext(font.args);
      if (!drawtext.ok) return errorReply(drawtext.error);
      const audio = checkFfmpegAudioPreserve(args, metadata, output_type);
      if (!audio.ok) return errorReply(audio.error);
      const inputs = inputPaths(font.args);
      const r = await gw.post(
        "/api/edit/ffmpeg",
        {
          args: font.args,
          ...(input_node_ids ? { input_node_ids } : {}),
          output_type,
          canvas_target,
          target_node_id: target_node_id ?? replace_node_id,
          input_paths: inputs.length > 0 ? inputs : undefined,
          metadata,
          filename,
        },
        FFMPEG_TIMEOUT_MS,
        EditResponseSchema,
      );
      if (!r.ok) return errorReply(r.error);
      if (!r.path && r._probe) {
        const merged = [r._probe.stderr, r._probe.stdout].filter(Boolean).join("\n");
        const text = merged.length > 0 ? merged : "(ffmpeg produced no probe output)";
        // 预演输出原样给文本，不包 JSON —— stderr 里的换行要保持可读
        return { structuredContent: { probe: text }, content: [{ type: "text", text }] };
      }
      return structuredReply({ path: r.path, ...(r.node_id ? { node_id: r.node_id } : {}) });
    },
  );

  registrar.registerTool(
    "merge_videos",
    {
      description:
        "Merge multiple video files into a single video by concatenating them in the given order. " +
        "Use this when the user asks to \"merge\", \"combine\", \"join\", or \"concatenate\" videos; generic hub_ffmpeg concat is rejected. " +
        "Probes every clip and pads incomplete or missing audio to its video timeline so later clip audio is not lost. Returns the output file path. " +
        "When input resolutions differ, the user (or orchestrator task_description) must choose scale_mode before calling — see editing agent rules.",
      inputSchema: {
        video_paths: z.array(z.string()).min(2).describe("Video file paths in the order they should appear in the merged output"),
        filename: z.string().describe(FILENAME_DESCRIPTION),
        source_node_id: z.string().optional().describe(SOURCE_NODE_ID_DESCRIPTION),
        scale_mode: z
          .enum(["first", "max", "min", "custom"])
          .default("first")
          .describe(
            "Required when clips differ in size (after user/strategy is known). " +
            "first=match first listed video, max=largest W and H per-axis, min=smallest W and H per-axis, custom=target_width+target_height. " +
            "API default is first; the editing agent must obtain user or orchestrator choice when resolutions mismatch.",
          ),
        target_width: z.number().int().positive().optional().describe('Target width in pixels. Required when scale_mode is "custom".'),
        target_height: z.number().int().positive().optional().describe('Target height in pixels. Required when scale_mode is "custom".'),
      },
      outputSchema: {
        path: z.string().describe("Merged output video file path"),
      },
      attachmentInputPaths: (input) => (input.video_paths as string[]) ?? [],
      attachmentOutputPaths: (output) => [output.path],
    },
    async (args) => {
      const r = await gw.post(
        "/api/edit/concatenate-videos",
        {
          video_paths: args.video_paths,
          filename: args.filename,
          source_node_id: args.source_node_id,
          scale_mode: args.scale_mode,
          target_width: args.target_width,
          target_height: args.target_height,
        },
        CONCAT_TIMEOUT_MS,
        EditResponseSchema,
      );
      if (!r.ok) return errorReply(r.error);
      return structuredReply({ path: r.path });
    },
  );
};

function inputPaths(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length - 1; i++) if (args[i] === "-i") out.push(args[i + 1] as string);
  return out;
}
