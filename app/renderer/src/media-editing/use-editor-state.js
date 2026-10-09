// use-editor-state.js
import { DEFAULT_STYLE } from "./history-manager.js";
import { reactExports } from "../vendor.js";

const EMPTY_STATE = {
  shapes: [],
  selectedId: null,
  tool: "rectangle",
  style: DEFAULT_STYLE,
  canUndo: false,
  canRedo: false,
};

export function useEditorState(handleRef) {
  const [state2, setState] = reactExports.useState(EMPTY_STATE);
  reactExports.useEffect(() => {
    let off = null;
    let rafId2 = null;
    let cancelled = false;
    const attach = (retry) => {
      if (cancelled) return;
      const editor = handleRef.current?.getEditor();
      if (!editor) {
        if (retry) {
          rafId2 = requestAnimationFrame(() => attach(false));
        }
        return;
      }
      setState(editor.getState());
      off = editor.on("change", (s2) => {
        if (!cancelled) setState(s2);
      });
    };
    attach(true);
    return () => {
      cancelled = true;
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
      off?.();
    };
  }, [handleRef]);
  return state2;
}

export const STROKE_WIDTHS$1 = [
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

export function strengthPercentToPx(percent2, mode2) {
  const range2 = mode2 === "blur" ? BLUR_RADIUS_RANGE : MOSAIC_BLOCK_RANGE;
  const pct = Math.min(100, Math.max(0, percent2));
  return Math.round(range2.min + ((range2.max - range2.min) * pct) / 100);
}

export const ROTATE_STEP_DEG = 90;

export const ROTATE_ANGLE_MIN = -180;

export const ROTATE_ANGLE_MAX = 180;

export function clamp$5(value, min2, max2) {
  return Math.max(min2, Math.min(max2, value));
}

export function normalizeAngle(deg) {
  let a2 = deg % 360;
  if (a2 > 180) a2 -= 360;
  if (a2 < -180) a2 += 360;
  return a2;
}
