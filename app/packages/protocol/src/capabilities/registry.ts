/**
 * 全部工具能力的汇总。
 *
 * 把几类工具拼成一张总表，供「当前有哪些能力」的地方统一取用。
 * **这个文件是「部分还原」**：v3 的 preload 只用到它的一部分，其余声明在打包时被
 * tree-shaking 去掉了，产物里没有。这里只放得回产物里还留着的那部分 ——
 * 不要把它当成完整文件来对照；要补全需要别的证据（dist 快照、source map 或上游仓库）。
 */
import { AUDIO_TOOLS } from "./tools/audio.js";
import { IMAGE_DAGS, IMAGE_TOOLS } from "./tools/image.js";
import { MEDIA_EDITS } from "./tools/media-edit.js";
import { VIDEO_TOOLS } from "./tools/video.js";

export const TOOL_CAPABILITIES = [
  ...IMAGE_TOOLS,
  ...VIDEO_TOOLS,
  ...AUDIO_TOOLS,
  ...IMAGE_DAGS,
  ...MEDIA_EDITS
];

