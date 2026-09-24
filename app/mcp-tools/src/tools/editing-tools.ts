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

const CJK_DRAWTEXT_NOTE =
  "Text overlays in Chinese, Japanese or Korean: do not set `font` or `fontfile` on `drawtext`; a CJK-capable font " +
  "shipped with the app (Noto Sans CJK SC) is added for you. Never invent system font paths. Name a font only when " +
  "the user requests one and you know the file is present on the machine doing the render.";

const FFMPEG_DESCRIPTION =
  "Executes ffmpeg in the Gateway against media files on this machine. " +
  CJK_DRAWTEXT_NOTE +
  " Never include an output path in args: the Gateway chooses it and adds it at the end. Every `-i` needs an absolute " +
  "path on disk; a name seen in a summary or timeline is not enough. There are two ways to run it. Normal: the " +
  "result file becomes a workspace asset and shows up on the canvas by itself, so skip canvas_write_node. Probe: " +
  'add `-f null` (for instance ["-i","/abs/clip.mp4","-f","null"], optionally with a showinfo or silencedetect filter) ' +
  "to examine streams and write nothing; ffmpeg's stderr, which holds stream details and showinfo output, comes back " +
  "in `probe`. The trailing `-` target that the null muxer expects is added automatically. " +
  "Joining videos is refused here; call merge_videos. If this step finishes an interim silent video generated just " +
  "before, set replace_node_id to the id returned by that generation, which swaps the interim clip for the result " +
  "instead of leaving both on the canvas. Commands " +
  "that do nothing but swap in a new audio track are refused unless replace_node_id is set, or the user asked for " +
  "both copies (preserve_source_canvas_node=true). Custom audio concat or resampling may put hiss on generated clip " +
  "sound, so ordered joins that should keep clip audio belong to merge_videos. Reach for ffmpeg only when no " +
  "purpose-built tool does the job.";

const FILENAME_DESCRIPTION =
  'Name for the output file, no extension. Keep it short (two or three hyphenated words) and about the content, ' +
  'e.g. "harbor-sunset" or "chef-closeup"; do not mention episode, scene or project.';

const SOURCE_NODE_ID_DESCRIPTION =
  "Canvas node this output derives from (ids come from canvas_list_nodes etc.). Optional; when set, the new asset " +
  "gets a derivation edge back to that node.";

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
            "Argument vector for ffmpeg, leaving out any output path (the Gateway adds it). Put every flag and its value " +
              'in its own element, e.g. ["-i", "/Users/me/clip.mp4", "-c", "copy"]; a joined form like `-filter_complex=...` ' +
              "is refused. Each `-i` must be followed by an absolute local path. Joining videos belongs to merge_videos. " +
              "Include `-f null` to probe instead of producing a file.",
          ),
        output_type: z
          .enum(["video", "audio", "image"])
          .default("video")
          .describe(
            "Kind of file a normal run produces; it sets the default extension: video .mp4, audio .mp3, image .png. " +
              "Audio output instead takes its extension from a `-c:a` codec if you pass one: aac or alac gives .m4a, " +
              "any pcm_* gives .wav, and flac, opus, vorbis, mp3 give .flac, .opus, .ogg, .mp3. Codec/container pairs " +
              "that cannot work together (pcm_s16le audio inside an .mp4 video, say) are refused before running, with a " +
              "suggested fix. Has no effect when probing.",
          ),
        replace_node_id: z
          .string()
          .optional()
          .describe(
            "Canvas nodeId to replace in place with this final output. REQUIRED when the command only replaces or " +
              "muxes audio onto a temporary video from hub_generate_video: pass that result's node_id so the canvas " +
              "does not show both the intermediate and the final video.",
          ),
        preserve_source_canvas_node: z
          .boolean()
          .default(false)
          .describe(
            "Keep the original canvas video alongside the new one with added audio. Enable this only if the user has " +
              "asked to see both; when finishing a generation normally, leave it off and use replace_node_id.",
          ),
        metadata: MetadataSchema.optional().describe(
          "Optional provenance for the output asset (prompt / model / description), e.g. when cropping a grid produced " +
            "by an image model. Ignored in DRY-RUN mode.",
        ),
        filename: z.string().describe(`${FILENAME_DESCRIPTION} Ignored in DRY-RUN mode (any placeholder works).`),
      },
      outputSchema: {
        path: z.string().optional().describe("Gateway-managed output path; only in NORMAL mode."),
        probe: z.string().optional().describe("ffmpeg stderr+stdout; only in DRY-RUN mode (`-f null` in args)."),
      },
      attachmentInputPaths: (input) => inputPaths((input.args as string[]) ?? []),
      attachmentOutputPaths: (output) => (typeof output.path === "string" ? [output.path] : []),
    },
    async ({ args, output_type, replace_node_id, preserve_source_canvas_node, metadata, filename }) => {
      const font = injectBundledCjkFont(args);
      if (!font.ok) return errorReply(font.error);
      const drawtext = checkFfmpegDrawtext(font.args);
      if (!drawtext.ok) return errorReply(drawtext.error);
      const audio = checkFfmpegAudioPreserve(args, metadata, output_type);
      if (!audio.ok) return errorReply(audio.error);
      if (isPureAudioReplacementMux(font.args, output_type ?? "video") && !replace_node_id && !preserve_source_canvas_node) {
        return errorReply(
          "this command only swaps the audio track of a video, so it has to overwrite the interim canvas video rather " +
            "than add a second one. Call again passing replace_node_id = the node_id you got from hub_generate_video. " +
            "Setting preserve_source_canvas_node=true is the alternative, reserved for a user who asked to keep the pair.",
        );
      }
      const inputs = inputPaths(font.args);
      const r = await gw.post(
        "/api/edit/ffmpeg",
        {
          args: font.args,
          output_type,
          replace_node_id,
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
      return structuredReply({ path: r.path });
    },
  );

  registrar.registerTool(
    "merge_videos",
    {
      description:
        "Stitches two or more videos end to end, in list order, into a single file, and returns its path. This is " +
        "the tool for any request to merge, combine, join or concatenate clips; hub_ffmpeg will not do it. Each input " +
        "is inspected first, and clips whose audio is absent or shorter than the picture get silence added, so the " +
        "sound of subsequent clips stays in sync. When the inputs have different dimensions, the user (or the " +
        "orchestrator's instructions) must settle scale_mode before you call.",
      inputSchema: {
        video_paths: z.array(z.string()).min(2).describe("Clips to join, listed first to last as they should appear."),
        filename: z.string().describe(FILENAME_DESCRIPTION),
        source_node_id: z.string().optional().describe(SOURCE_NODE_ID_DESCRIPTION),
        scale_mode: z
          .enum(["first", "max", "min", "custom"])
          .default("first")
          .describe(
            "Frame size policy for inputs of unequal size. first: adopt the first clip's size. max: widest width and " +
              "tallest height found among clips. min: narrowest width and shortest height. custom: use target_width and " +
              "target_height. first is assumed if omitted, but for mismatched clips the choice has to come from the " +
              "user or orchestrator.",
          ),
        target_width: z.number().int().positive().optional().describe('Output width (px). Must be given together with scale_mode "custom".'),
        target_height: z.number().int().positive().optional().describe('Output height (px). Must be given together with scale_mode "custom".'),
      },
      outputSchema: {
        path: z.string().describe("Path of the merged video."),
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
