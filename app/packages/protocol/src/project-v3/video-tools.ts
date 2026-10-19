/** 由 v3 preload 产物还原：../packages/protocol/dist/project-v3/video-tools.js */
export const PROJECT_VIDEO_ENHANCE_RESOLUTIONS = ["720p", "1080p", "2k", "4k"];
export const PROJECT_VIDEO_ENHANCE_FPS = [30, 60];
export const PROJECT_VIDEO_ERASE_SUBTITLE_MODES = ["Subtitle", "Text"];
export function normalizeVideoEraseSubtitleParams(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Erase subtitle params must be an object");
  const params = value as Record<string, unknown>;
  const mode = params.mode === undefined ? "Subtitle" : params.mode;
  if (mode !== "Subtitle" && mode !== "Text")
    throw new Error("Erase subtitle mode must be Subtitle or Text");
  const regions = params.regions === undefined ? [] : params.regions;
  if (!Array.isArray(regions))
    throw new Error("Erase subtitle regions must be an array");
  if (mode === "Subtitle" && regions.length)
    throw new Error("Subtitle mode must not carry regions");
  if (mode === "Text" && !regions.length)
    throw new Error("Text mode requires at least one region");
  const fields = ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y"];
  const normalized = Array.from(regions, (region, index) => {
    const invalid2 = () => new Error(`regions[${index}] must contain four finite numbers satisfying 0 <= tl < br <= 1`);
    if (!region || typeof region !== "object" || Array.isArray(region))
      throw invalid2();
    const box = region;
    if (fields.some((key) => typeof box[key] !== "number" || !Number.isFinite(box[key])))
      throw invalid2();
    const { top_left_x, top_left_y, bottom_right_x, bottom_right_y } = box;
    if (!(0 <= top_left_x && top_left_x < bottom_right_x && bottom_right_x <= 1 && 0 <= top_left_y && top_left_y < bottom_right_y && bottom_right_y <= 1))
      throw invalid2();
    return { top_left_x, top_left_y, bottom_right_x, bottom_right_y };
  });
  return { mode, regions: normalized };
}

