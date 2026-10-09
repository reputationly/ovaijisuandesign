// use-image-rotate-edit.js
import { reactExports } from "../vendor.js";
import {
  abandonToolInteractionSession,
  beginToolInteractionSession,
  completeToolInteractionSession,
  createToolInteractionSession,
  setToolInteractionSessionProgress,
} from "./node-tool-interaction.js";
import { getAdjacentNodePosition } from "../canvas/node-shell-inner.jsx";
import {
  clamp,
  normalizeAngle,
  ROTATE_ANGLE_MAX,
  ROTATE_ANGLE_MIN,
  ROTATE_STEP_DEG,
} from "./use-editor-state.js";
const DEFAULT_ROTATE_STATE = {
  angle: 0,
  flipH: false,
  flipV: false,
};
function rotatedAabb(w3, h2, angleDeg) {
  const rad = (Math.abs(angleDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: w3 * cos + h2 * sin,
    height: w3 * sin + h2 * cos,
  };
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e2) => reject(e2);
    img.src = src;
  });
}
async function renderRotatedBlob(src, state2, originalWidth, originalHeight) {
  const img = await loadImage(src);
  const sw = originalWidth || img.naturalWidth;
  const sh = originalHeight || img.naturalHeight;
  const { width, height } = rotatedAabb(sw, sh, state2.angle);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rotate-utils: 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((state2.angle * Math.PI) / 180);
  ctx.scale(state2.flipH ? -1 : 1, state2.flipV ? -1 : 1);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("rotate-utils: toBlob returned null"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
function isIdentityRotate(state2) {
  return state2.angle === 0 && !state2.flipH && !state2.flipV;
}
export function useImageRotateEdit({
  nodeId,
  selected: selected2,
  meta: meta2,
  nodeWidth,
  sourceBodyHeight,
  cropImage,
  reactFlow,
  onSaved,
  onAbandon,
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const [state2, setState] = reactExports.useState(DEFAULT_ROTATE_STATE);
  const [saving, setSaving] = reactExports.useState(false);
  const interactionSessionRef = reactExports.useRef(
    createToolInteractionSession(),
  );
  const hasChanges = !isIdentityRotate(state2);
  const enter2 = reactExports.useCallback(() => {
    if (!meta2?.url || !meta2.width || !meta2.height) return;
    beginToolInteractionSession(interactionSessionRef.current);
    setState(DEFAULT_ROTATE_STATE);
    setEditing(true);
  }, [meta2?.url, meta2?.width, meta2?.height]);
  const reset2 = reactExports.useCallback(() => {
    setEditing(false);
    setState(DEFAULT_ROTATE_STATE);
    setSaving(false);
  }, []);
  const cancel = reactExports.useCallback(() => {
    const abandonedWithProgress = abandonToolInteractionSession(
      interactionSessionRef.current,
    );
    if (abandonedWithProgress == null) return;
    onAbandon?.(abandonedWithProgress);
    reset2();
  }, [onAbandon, reset2]);
  const { displayWidth, displayHeight } = reactExports.useMemo(() => {
    if (!editing || !hasChanges) {
      return {
        displayWidth: nodeWidth,
        displayHeight: sourceBodyHeight,
      };
    }
    const aabb = rotatedAabb(nodeWidth, sourceBodyHeight, state2.angle);
    return {
      displayWidth: aabb.width,
      displayHeight: aabb.height,
    };
  }, [editing, hasChanges, state2.angle, nodeWidth, sourceBodyHeight]);
  const save = reactExports.useCallback(async () => {
    if (saving) return;
    if (!cropImage || !meta2?.url || !meta2.width || !meta2.height) return;
    if (!hasChanges) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const blob = await renderRotatedBlob(
        meta2.url,
        state2,
        meta2.width,
        meta2.height,
      );
      const baseName = meta2.name?.replace(/\.[^.]+$/, "") ?? "image";
      const position2 = getAdjacentNodePosition(
        reactFlow,
        nodeId,
        displayWidth,
      );
      const uuid = crypto.randomUUID().slice(0, 4);
      const newNodeId = await cropImage(
        nodeId,
        blob,
        `${baseName}-rotate-${uuid}.png`,
        position2,
      );
      completeToolInteractionSession(interactionSessionRef.current);
      onSaved?.(newNodeId);
      reset2();
    } catch {
      setSaving(false);
    }
  }, [
    saving,
    cropImage,
    meta2,
    state2,
    hasChanges,
    reactFlow,
    nodeId,
    displayWidth,
    cancel,
    onSaved,
    reset2,
  ]);
  reactExports.useEffect(() => {
    setToolInteractionSessionProgress(
      interactionSessionRef.current,
      hasChanges,
    );
  }, [hasChanges]);
  const setAngle = reactExports.useCallback((next2) => {
    setState((prev) => ({
      ...prev,
      angle: clamp(next2, ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX),
    }));
  }, []);
  const step90 = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      angle: normalizeAngle(prev.angle + ROTATE_STEP_DEG),
    }));
  }, []);
  const toggleFlipH = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      flipH: !prev.flipH,
    }));
  }, []);
  const toggleFlipV = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      flipV: !prev.flipV,
    }));
  }, []);
  reactExports.useEffect(() => {
    if (!editing) return;
    if (saving) return;
    if (!selected2) cancel();
  }, [editing, saving, selected2, cancel]);
  const imageTransform = reactExports.useMemo(() => {
    if (!editing || !hasChanges) return void 0;
    return `rotate(${state2.angle}deg) scale(${state2.flipH ? -1 : 1}, ${state2.flipV ? -1 : 1})`;
  }, [editing, hasChanges, state2]);
  return {
    editing,
    state: state2,
    saving,
    hasChanges,
    imageTransform,
    displayWidth,
    displayHeight,
    enter: enter2,
    cancel,
    save,
    setAngle,
    step90,
    toggleFlipH,
    toggleFlipV,
  };
}
