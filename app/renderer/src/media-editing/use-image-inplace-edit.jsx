// use-image-inplace-edit.jsx
import { reactExports, useNodeId } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { StoryboardGridEditor } from "./storyboard-grid-editor.jsx";
import {
  getNodeFlowRect,
  useEmitDerivedFromBlob,
} from "../canvas/use-start-crop-from-node.js";
import { useCropViewportZoom } from "../canvas/use-crop-viewport-zoom.js";
import {
  abandonToolInteractionSession,
  beginToolInteractionSession,
  completeToolInteractionSession,
  createToolInteractionSession,
  setToolInteractionSessionProgress,
} from "./node-tool-interaction.js";

const INPLACE_EDIT_TOOLBAR_RESERVE_PX = 116;

export function StoryboardGridPopover({
  onClose,
  replaceNodeId,
  imageUrl,
  imagePath,
  defaultPrompt,
  defaultParams,
  defaultReferencePaths,
  resolveFileUrl,
  isGenerating,
}) {
  const nodeId = useNodeId() ?? "";
  return (
    <StoryboardGridEditor
      nodeId={nodeId}
      replaceNodeId={replaceNodeId}
      imageUrl={imageUrl}
      imagePath={imagePath}
      defaultPrompt={defaultPrompt}
      defaultParams={defaultParams}
      defaultReferencePaths={defaultReferencePaths}
      resolveFileUrl={resolveFileUrl}
      isGenerating={isGenerating}
      onClose={onClose}
    />
  );
}

export function useDirectImageActions({
  id: id2,
  meta: meta2,
  submitSuperResolution,
  submitRemoveBg,
}) {
  const handleSuperResolution = reactExports.useCallback(() => {
    if (!submitSuperResolution || !meta2?.path) return;
    void submitSuperResolution(id2, meta2.path);
  }, [id2, meta2?.path, submitSuperResolution]);
  const handleRemoveBg = reactExports.useCallback(() => {
    if (!submitRemoveBg || !meta2?.path) return;
    void submitRemoveBg(id2, meta2.path);
  }, [id2, meta2?.path, submitRemoveBg]);
  return {
    handleSuperResolution,
    handleRemoveBg,
  };
}

export function useImageColorAdjust({
  id: id2,
  meta: meta2,
  nodeWidth,
  reactFlow,
  cropImage,
  lut,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const openDialog = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    setOpen(true);
  }, [meta2?.url]);
  const onConfirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "color",
        ext: "png",
      });
    },
    [emitDerived],
  );
  return {
    open,
    openDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
      onConfirm,
      lut,
    },
  };
}

export function useImageInplaceEdit({
  id: id2,
  meta: meta2,
  selected: selected2,
  nodeWidth,
  nodeHeight,
  reactFlow,
  cropImage,
  onApply,
  onAbandon,
}) {
  const [editingTarget, setEditingTarget] = reactExports.useState(null);
  const editing = editingTarget !== null;
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const interactionSessionRef = reactExports.useRef(
    createToolInteractionSession(),
  );
  useCropViewportZoom(editingTarget, 0, 0, INPLACE_EDIT_TOOLBAR_RESERVE_PX);
  const enter2 = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
    if (!rect) return;
    beginToolInteractionSession(interactionSessionRef.current);
    setEditingTarget({
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
    });
  }, [meta2?.url, id2, reactFlow, nodeWidth, nodeHeight]);
  const setHadProgress = reactExports.useCallback((hadProgress) => {
    setToolInteractionSessionProgress(
      interactionSessionRef.current,
      hadProgress,
    );
  }, []);
  const cancel = reactExports.useCallback(
    (hadProgress) => {
      const abandonedWithProgress = abandonToolInteractionSession(
        interactionSessionRef.current,
        hadProgress,
      );
      if (abandonedWithProgress == null) return;
      onAbandon?.(abandonedWithProgress);
      setEditingTarget(null);
    },
    [onAbandon],
  );
  reactExports.useEffect(() => {
    if (editing && !selected2) cancel();
  }, [editing, selected2, cancel]);
  const confirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "edited",
        ext: "png",
      });
      completeToolInteractionSession(interactionSessionRef.current);
      onApply?.(blob);
      setEditingTarget(null);
    },
    [emitDerived, onApply],
  );
  return {
    editing,
    enter: enter2,
    cancel,
    confirm,
    setHadProgress,
  };
}

function clampIndex(value, length2) {
  if (length2 <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), length2 - 1);
}

export function useImageLightbox({ items, initialIndex = 0 }) {
  const [open, setOpen] = reactExports.useState(false);
  const [index2, setIndex] = reactExports.useState(() =>
    clampIndex(initialIndex, items.length),
  );
  const close2 = reactExports.useCallback(() => setOpen(false), []);
  const openLightbox = reactExports.useCallback(
    (nextIndex) => {
      if (items.length === 0) return;
      const desired =
        typeof nextIndex === "number" && Number.isFinite(nextIndex)
          ? nextIndex
          : initialIndex;
      setIndex(clampIndex(desired, items.length));
      setOpen(true);
    },
    [items.length, initialIndex],
  );
  reactExports.useEffect(() => {
    if (!open) setIndex(clampIndex(initialIndex, items.length));
  }, [initialIndex, open, items.length]);
  reactExports.useEffect(() => {
    if (items.length === 0) {
      if (open) setOpen(false);
      return;
    }
    setIndex((cur) => clampIndex(cur, items.length));
  }, [items.length, open]);
  return {
    open,
    openLightbox,
    lightboxProps:
      open && items.length > 0
        ? {
            items,
            index: index2,
            onIndexChange: setIndex,
            onClose: close2,
          }
        : null,
  };
}
