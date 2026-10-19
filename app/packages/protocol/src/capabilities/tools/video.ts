/** 由 v3 preload 产物还原：../packages/protocol/dist/capabilities/tools/video.js */
import { reject } from "../request.js";
import { fixed } from "./fixed.js";
import { resolution } from "./image.js";
import { id, operation } from "../../project-v3/task-mappers.js";
import { PROJECT_VIDEO_ENHANCE_FPS, PROJECT_VIDEO_ENHANCE_RESOLUTIONS, PROJECT_VIDEO_ERASE_SUBTITLE_MODES, normalizeVideoEraseSubtitleParams } from "../../project-v3/video-tools.js";

const unit = { type: "number", minimum: 0, maximum: 1 };
const videoTool = {
  operation: "generate_video",
  prompt: { use: "none" },
  references: { min: 1, max: 1, kinds: { video: 1 } },
  surfaces: ["agent", "canvas"]
};
const enhance = {
  ...videoTool,
  id: "generate_video:enhance",
  displayName: "Enhance",
  description: "Upscale one video to a target resolution and interpolate it to a target frame rate (MediaKit); content is unchanged. Use it when only resolution or smoothness should improve; a generation model would re-create the content.",
  paramSchema: {
    type: "object",
    properties: {
      resolution: { type: "string", enum: PROJECT_VIDEO_ENHANCE_RESOLUTIONS },
      fps: { type: "number", enum: PROJECT_VIDEO_ENHANCE_FPS }
    },
    required: ["resolution", "fps"]
  },
  execution: fixed({
    backend: "mediakit_enhance_video",
    model: "mediakit-enhance-video",
    pricing: "mediakit-enhance-video",
    quote: (params: Record<string, unknown>) => ({ resolution: params.resolution, fps: Number(params.fps) })
  }, ({ params }) => ({
    params: {
      tool_version: "standard",
      scene: "common",
      resolution: params.resolution,
      fps: params.fps
    }
  }))
};
const h3SuperResolution = {
  ...videoTool,
  id: "generate_video:h3_super_resolution",
  displayName: "H3 Super Resolution",
  description: "Upscale one MiniMax-H3 768P generated video to native 2K using its original provider task. MiniMax-H3 generates 2K by default, so this serves its 768P results such as video-extension. Imported videos and other models are not supported.",
  paramSchema: { type: "object", properties: {} },
  execution: fixed({
    backend: "minimax_v3",
    model: "h3_video_super_resolution",
    pricing: "h3_video_super_resolution",
    quote: () => ({ resolution: "2K" })
  }, () => ({ params: { resolution: "2K" } }))
};
const eraseSubtitle = {
  ...videoTool,
  id: "generate_video:erase_subtitle",
  displayName: "Erase subtitles",
  description: "Remove burned-in subtitles from one video automatically (mode Subtitle), or any text inside given regions (mode Text).",
  paramSchema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: PROJECT_VIDEO_ERASE_SUBTITLE_MODES,
        default: "Subtitle",
        description: "Subtitle erases automatically and takes no regions; Text needs regions."
      },
      regions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            top_left_x: unit,
            top_left_y: unit,
            bottom_right_x: unit,
            bottom_right_y: unit
          },
          required: ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y"]
        },
        description: "Normalized boxes, 0 <= top_left < bottom_right <= 1."
      }
    }
  },
  execution: fixed({
    backend: "mediakit_erase_subtitle",
    model: "mediakit-erase-subtitle",
    pricing: "mediakit-erase-subtitle"
  }, ({ params }) => {
    try {
      const { mode, regions } = normalizeVideoEraseSubtitleParams(params);
      return { params: { mode, regions } };
    } catch (error) {
      reject((error as Error).message);
    }
  })
};
export const VIDEO_TOOLS = [enhance, h3SuperResolution, eraseSubtitle];

