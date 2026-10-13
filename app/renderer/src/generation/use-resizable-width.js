// use-resizable-width.js
import { reactDomExports, reactExports } from "../vendor.js";
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
export function useResizableWidth({
  defaultWidth,
  minWidth,
  maxWidth,
  storage,
  externalValue,
  invertDelta = false,
}) {
  const [width, setWidth] = reactExports.useState(() => {
    const seed = externalValue ?? storage?.read();
    return typeof seed === "number" && Number.isFinite(seed)
      ? clamp(seed, minWidth, maxWidth)
      : defaultWidth;
  });
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const draggingRef = reactExports.useRef(false);
  const startX = reactExports.useRef(0);
  const startW = reactExports.useRef(0);
  const latestW = reactExports.useRef(width);
  const storageRef = reactExports.useRef(storage);
  storageRef.current = storage;
  const activeDragRef = reactExports.useRef(null);
  const releaseActiveDrag = reactExports.useCallback(
    (persist, updateState = true) => {
      const activeDrag = activeDragRef.current;
      if (!activeDrag) return;
      document.removeEventListener("mousemove", activeDrag.onMove);
      document.removeEventListener("mouseup", activeDrag.onUp);
      window.removeEventListener("blur", activeDrag.onBlur);
      document.body.style.cursor = activeDrag.previousCursor;
      document.body.style.userSelect = activeDrag.previousUserSelect;
      if (activeDrag.previousColumnResizeActive === void 0) {
        delete document.documentElement.dataset.columnResizeActive;
      } else {
        document.documentElement.dataset.columnResizeActive =
          activeDrag.previousColumnResizeActive;
      }
      activeDragRef.current = null;
      draggingRef.current = false;
      if (updateState) setIsDragging(false);
      if (persist) storageRef.current?.write(Math.round(latestW.current));
    },
    [],
  );
  reactExports.useEffect(
    () => () => {
      releaseActiveDrag(false, false);
    },
    [releaseActiveDrag],
  );
  reactExports.useEffect(() => {
    if (
      draggingRef.current ||
      typeof externalValue !== "number" ||
      !Number.isFinite(externalValue)
    ) {
      return;
    }
    const next = clamp(externalValue, minWidth, maxWidth);
    latestW.current = next;
    setWidth((previous) => (previous === next ? previous : next));
  }, [externalValue, maxWidth, minWidth]);
  const onValueChange = reactExports.useCallback(
    (value) => {
      const next = clamp(value, minWidth, maxWidth);
      latestW.current = next;
      setWidth(next);
      storage?.write(Math.round(next));
    },
    [maxWidth, minWidth, storage],
  );
  const onMouseDown = reactExports.useCallback(
    (pointerEvent) => {
      pointerEvent.preventDefault();
      releaseActiveDrag(false);
      draggingRef.current = true;
      setIsDragging(true);
      startX.current = pointerEvent.clientX;
      startW.current = width;
      latestW.current = width;
      const onMove = (pointerEvent) => {
        if (!draggingRef.current) return;
        const delta = invertDelta
          ? startX.current - pointerEvent.clientX
          : pointerEvent.clientX - startX.current;
        const next = clamp(startW.current + delta, minWidth, maxWidth);
        latestW.current = next;
        reactDomExports.flushSync(() => setWidth(next));
      };
      const onUp = () => releaseActiveDrag(true);
      const onBlur = () => releaseActiveDrag(true);
      activeDragRef.current = {
        onMove,
        onUp,
        onBlur,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
        previousColumnResizeActive:
          document.documentElement.dataset.columnResizeActive,
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      window.addEventListener("blur", onBlur);
      document.documentElement.dataset.columnResizeActive = "true";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, minWidth, maxWidth, invertDelta, releaseActiveDrag],
  );
  const reset = reactExports.useCallback(() => {
    latestW.current = defaultWidth;
    setWidth(defaultWidth);
    storage?.write(defaultWidth);
  }, [defaultWidth, storage]);
  return {
    width,
    isDragging,
    onMouseDown,
    onValueChange,
    reset,
  };
}
