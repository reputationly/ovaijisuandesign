/**
 * `design_execute` 的玩法表：工具条目归类（`categorizeToolAction`）与卡片图标共用。
 *
 * 4.0.4 的 `categorizeToolAction(toolName, toolArgs)` 对 design_execute 是按**入参里的
 * 能力 id** 归类的（`DESIGN_KINDS[kind].category`），不是按工具名 —— 否则一次生成图片和
 * 一次生成音乐在活动流里都显示成同一个"执行"。表照参照逐条抄，`category` 就是那段用的。
 */
export const DESIGN_KINDS = {
  generate_image: { category: "imageGen", label: "generate_image", media: "image" },
  generate_video: { category: "videoGen", label: "generate_video", media: "video" },
  generate_speech: { category: "audioGen", label: "generate_speech", media: "audio" },
  generate_music: { category: "musicGen", label: "generate_music", media: "audio" },
  "edit_media:ffmpeg": { category: "videoEdit", label: "ffmpeg", media: "video" },
  "edit_media:merge_videos": { category: "videoEdit", label: "merge_videos", media: "video" },
  "edit_media:transcribe": { category: "audioGen", label: "transcribe", media: "text" },
  "edit_media:subtitle_format": { category: "videoEdit", label: "subtitle_format", media: "text" },
  // 本产品新增的本地能力（官方表里没有）。**新增能力必须在这里登记**，
  // 否则 `categorizeToolAction` 会读 `undefined.category` 直接崩掉整页（真机 EB-6B1A7AD7）。
  "edit_media:cover_frame": { category: "videoEdit", label: "cover_frame", media: "image" },
  "edit_media:mux_audio": { category: "videoEdit", label: "mux_audio", media: "video" },
};

export const isDesignExecute = (name) => name === "design_execute";
