// use-move-dnd.js
import { reactExports } from "../vendor.js";

const ASSET_MOVE_MIME = "application/x-hilo-asset-move";

export function useMoveDnd(options) {
  const { keyOf, canDrop, onDrop } = options;
  const [dragging, setDragging] = reactExports.useState(null);
  const [overKey, setOverKey] = reactExports.useState(null);
  const startDrag = reactExports.useCallback((event, item, previewLabel) => {
    event.dataTransfer.setData(ASSET_MOVE_MIME, "1");
    event.dataTransfer.effectAllowed = "copyMove";
    if (previewLabel && typeof event.dataTransfer.setDragImage === "function") {
      const preview = document.createElement("div");
      preview.className =
        "pointer-events-none fixed -left-full top-0 rounded-md border border-border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-sm";
      preview.textContent = previewLabel;
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 16, 16);
      window.requestAnimationFrame(() => preview.remove());
    }
    setDragging(item);
  }, []);
  const endDrag = reactExports.useCallback(() => {
    setDragging(null);
    setOverKey(null);
  }, []);
  const targetProps = reactExports.useCallback(
    (target) => {
      const key2 = keyOf(target);
      return {
        onDragOver: (event) => {
          if (dragging === null) return;
          event.stopPropagation();
          if (!canDrop(dragging, target)) {
            setOverKey((previous2) => (previous2 === key2 ? null : previous2));
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOverKey(key2);
        },
        onDragLeave: (event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setOverKey((previous2) => (previous2 === key2 ? null : previous2));
        },
        onDrop: (event) => {
          if (dragging === null) return;
          event.stopPropagation();
          setOverKey(null);
          if (!canDrop(dragging, target)) return;
          event.preventDefault();
          const item = dragging;
          setDragging(null);
          onDrop(item, target);
        },
      };
    },
    [canDrop, dragging, keyOf, onDrop],
  );
  const blockerProps = reactExports.useCallback(
    () => ({
      onDragOver: (event) => {
        if (dragging === null) return;
        event.stopPropagation();
        setOverKey(null);
      },
      onDrop: (event) => {
        if (dragging !== null) event.stopPropagation();
      },
    }),
    [dragging],
  );
  return reactExports.useMemo(
    () => ({
      dragging,
      overKey,
      startDrag,
      endDrag,
      targetProps,
      blockerProps,
    }),
    [blockerProps, dragging, endDrag, overKey, startDrag, targetProps],
  );
}
