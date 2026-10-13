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
function rotatedAabb(width, height, angleDeg) {
  const radians = (Math.abs(angleDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (errorEvent) => reject(errorEvent);
    image.src = src;
  });
}
async function renderRotatedBlob(src, state, originalWidth, originalHeight) {
  const image = await loadImage(src);
  const sourceWidth = originalWidth || image.naturalWidth;
  const sourceHeight = originalHeight || image.naturalHeight;
  const { width, height } = rotatedAabb(sourceWidth, sourceHeight, state.angle);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rotate-utils: 2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((state.angle * Math.PI) / 180);
  ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
  ctx.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
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
function isIdentityRotate(state) {
  return state.angle === 0 && !state.flipH && !state.flipV;
}
export function useImageRotateEdit({
  nodeId,
  selected,
  meta,
  nodeWidth,
  sourceBodyHeight,
  cropImage,
  reactFlow,
  onSaved,
  onAbandon,
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const [state, setState] = reactExports.useState(DEFAULT_ROTATE_STATE);
  const [saving, setSaving] = reactExports.useState(false);
  const interactionSessionRef = reactExports.useRef(
    createToolInteractionSession(),
  );
  const hasChanges = !isIdentityRotate(state);
  const enter = reactExports.useCallback(() => {
    if (!meta?.url || !meta.width || !meta.height) return;
    beginToolInteractionSession(interactionSessionRef.current);
    setState(DEFAULT_ROTATE_STATE);
    setEditing(true);
  }, [meta?.url, meta?.width, meta?.height]);
  const reset = reactExports.useCallback(() => {
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
    reset();
  }, [onAbandon, reset]);
  const { displayWidth, displayHeight } = reactExports.useMemo(() => {
    if (!editing || !hasChanges) {
      return {
        displayWidth: nodeWidth,
        displayHeight: sourceBodyHeight,
      };
    }
    const aabb = rotatedAabb(nodeWidth, sourceBodyHeight, state.angle);
    return {
      displayWidth: aabb.width,
      displayHeight: aabb.height,
    };
  }, [editing, hasChanges, state.angle, nodeWidth, sourceBodyHeight]);
  const save = reactExports.useCallback(async () => {
    if (saving) return;
    if (!cropImage || !meta?.url || !meta.width || !meta.height) return;
    if (!hasChanges) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const blob = await renderRotatedBlob(
        meta.url,
        state,
        meta.width,
        meta.height,
      );
      const baseName = meta.name?.replace(/\.[^.]+$/, "") ?? "image";
      const position = getAdjacentNodePosition(
        reactFlow,
        nodeId,
        displayWidth,
      );
      const uuid = crypto.randomUUID().slice(0, 4);
      const newNodeId = await cropImage(
        nodeId,
        blob,
        `${baseName}-rotate-${uuid}.png`,
        position,
      );
      completeToolInteractionSession(interactionSessionRef.current);
      onSaved?.(newNodeId);
      reset();
    } catch {
      setSaving(false);
    }
  }, [
    saving,
    cropImage,
    meta,
    state,
    hasChanges,
    reactFlow,
    nodeId,
    displayWidth,
    cancel,
    onSaved,
    reset,
  ]);
  reactExports.useEffect(() => {
    setToolInteractionSessionProgress(
      interactionSessionRef.current,
      hasChanges,
    );
  }, [hasChanges]);
  const setAngle = reactExports.useCallback((next) => {
    setState((prev) => ({
      ...prev,
      angle: clamp(next, ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX),
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
    if (!selected) cancel();
  }, [editing, saving, selected, cancel]);
  const imageTransform = reactExports.useMemo(() => {
    if (!editing || !hasChanges) return void 0;
    return `rotate(${state.angle}deg) scale(${state.flipH ? -1 : 1}, ${state.flipV ? -1 : 1})`;
  }, [editing, hasChanges, state]);
  return {
    editing,
    state,
    saving,
    hasChanges,
    imageTransform,
    displayWidth,
    displayHeight,
    enter,
    cancel,
    save,
    setAngle,
    step90,
    toggleFlipH,
    toggleFlipV,
  };
}
