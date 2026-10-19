export const HAILUO_23_MODEL_NAMES = new Set([
  "MiniMax-Hailuo-2.3",
  "MiniMax-Hailuo-2.3-Fast",
  "Hailuo 2.3",
  "Hailuo 2.3 Fast",
]);

export const KLING_AVATAR_MODEL_NAMES = new Set(["kling-avatar", "Kling Avatar"]);

export const KLING_MOTION_CONTROL_MODEL_NAMES = new Set(["kling-motion-control", "Kling Motion Control"]);

export const REQUIRED_REFERENCE_IMAGE_MODEL_NAMES = new Set([
  ...HAILUO_23_MODEL_NAMES,
  ...KLING_AVATAR_MODEL_NAMES,
  ...KLING_MOTION_CONTROL_MODEL_NAMES,
]);
