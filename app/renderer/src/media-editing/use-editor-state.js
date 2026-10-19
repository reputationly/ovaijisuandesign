// use-editor-state.js
import { DEFAULT_STYLE } from "./history-manager.js";
import reactExports from "react";
const EMPTY_STATE = {
  clips: [],
  totalDuration: 0,
  currentTime: 0,
  isPlaying: false,
  scale: 100,
  scrollX: 0,
  selectedClipIds: new Set(),
  hoverClipId: null,
  cropRange: null,
  segmentRanges: [],
  previewFrame: null,
};
export function useEditorState(handleRef) {
  const [state, setState] = reactExports.useState(EMPTY_STATE);
  reactExports.useEffect(() => {
    let unsubscribe = null;
    let rafId = null;
    let cancelled = false;
    const attach = (retry) => {
      if (cancelled) return;
      const editor = handleRef.current?.getEditor();
      if (!editor) {
        if (retry) {
          rafId = requestAnimationFrame(() => attach(false));
        }
        return;
      }
      setState(editor.getState());
      unsubscribe = editor.on("change", (editorState) => {
        if (!cancelled) setState(editorState);
      });
    };
    attach(true);
    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribe?.();
    };
  }, [handleRef]);
  return state;
}
export const STROKE_WIDTHS = [
  {
    value: 2,
    dotPx: 4,
  },
  {
    value: 4,
    dotPx: 7,
  },
  {
    value: 8,
    dotPx: 11,
  },
];
export const MOSAIC_BRUSH_SIZES = [
  {
    value: 6,
    dotPx: 4,
  },
  {
    value: 12,
    dotPx: 7,
  },
  {
    value: 18,
    dotPx: 11,
  },
];
const MOSAIC_BLOCK_RANGE = {
  min: 0,
  max: 10,
};
const BLUR_RADIUS_RANGE = {
  min: 0,
  max: 10,
};
export function strengthPercentToPx(percent, mode) {
  const range = mode === "blur" ? BLUR_RADIUS_RANGE : MOSAIC_BLOCK_RANGE;
  const percentage = Math.min(100, Math.max(0, percent));
  return Math.round(range.min + ((range.max - range.min) * percentage) / 100);
}
export const ROTATE_STEP_DEG = 90;
export const ROTATE_ANGLE_MIN = -180;
export const ROTATE_ANGLE_MAX = 180;
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function normalizeAngle(degrees) {
  let normalizedAngle = degrees % 360;
  if (normalizedAngle > 180) normalizedAngle -= 360;
  if (normalizedAngle < -180) normalizedAngle += 360;
  return normalizedAngle;
}
