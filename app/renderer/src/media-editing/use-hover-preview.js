// use-hover-preview.js
import { reactExports } from "../vendor.js";
const ANCHOR_GAP = 8;
const VIEWPORT_PADDING = 8;
function isPointInPreviewBridge(x, y, anchor, preview) {
  const contains = (rect) =>
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.bottom;
  if (contains(anchor) || contains(preview)) return true;
  const above = preview.bottom <= anchor.top;
  const below = anchor.bottom <= preview.top;
  if (!above && !below) return false;
  const start = above
    ? {
        y: preview.bottom,
        left: preview.left,
        right: preview.left + preview.width,
      }
    : {
        y: anchor.top,
        left: anchor.left,
        right: anchor.left + anchor.width,
      };
  const end = above
    ? {
        y: anchor.bottom,
        left: anchor.left,
        right: anchor.left + anchor.width,
      }
    : {
        y: preview.top,
        left: preview.left,
        right: preview.left + preview.width,
      };
  if (y < start.y || y > end.y || end.y === start.y) return false;
  const progress = (y - start.y) / (end.y - start.y);
  return (
    x >= start.left + (end.left - start.left) * progress &&
    x <= start.right + (end.right - start.right) * progress
  );
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function getMediaPreviewPosition(anchorRect, previewSize, viewport) {
  const preferredTop = anchorRect.top - previewSize.height - ANCHOR_GAP;
  const fallbackTop = anchorRect.bottom + ANCHOR_GAP;
  const fitsAbove = preferredTop >= VIEWPORT_PADDING;
  const fitsBelow =
    fallbackTop + previewSize.height <= viewport.height - VIEWPORT_PADDING;
  const moreSpaceAbove = anchorRect.top > viewport.height - anchorRect.bottom;
  const previewTop = clamp(
    fitsAbove || (!fitsBelow && moreSpaceAbove) ? preferredTop : fallbackTop,
    VIEWPORT_PADDING,
    Math.max(
      VIEWPORT_PADDING,
      viewport.height - previewSize.height - VIEWPORT_PADDING,
    ),
  );
  const left = clamp(
    anchorRect.left + anchorRect.width / 2 - previewSize.width / 2,
    VIEWPORT_PADDING,
    Math.max(
      VIEWPORT_PADDING,
      viewport.width - previewSize.width - VIEWPORT_PADDING,
    ),
  );
  return {
    top: previewTop,
    left,
  };
}
function getMediaPreviewLayout(
  anchorRect,
  previewSize,
  viewport,
  boundary,
  fit = "contain",
) {
  boundary ??= {
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
  };
  const left = Math.max(0, boundary.left);
  const boundaryTop = Math.max(0, boundary.top);
  const width = Math.max(0, Math.min(viewport.width, boundary.right) - left);
  const height = Math.max(0, Math.min(viewport.height, boundary.bottom) - boundaryTop);
  const scale = Math.min(
    1,
    Math.max(1, width - VIEWPORT_PADDING * 2) / previewSize.width,
    Math.max(1, height - VIEWPORT_PADDING * 2) / previewSize.height,
  );
  const size =
    fit === "contain"
      ? {
          width: previewSize.width * scale,
          height: previewSize.height * scale,
        }
      : {
          width: Math.min(
            previewSize.width,
            Math.max(1, width - VIEWPORT_PADDING * 2),
          ),
          height: Math.min(
            previewSize.height,
            Math.max(1, height - VIEWPORT_PADDING * 2),
          ),
        };
  const position = getMediaPreviewPosition(
    {
      width: anchorRect.width,
      height: anchorRect.height,
      left: anchorRect.left - left,
      top: anchorRect.top - boundaryTop,
      bottom: anchorRect.bottom - boundaryTop,
    },
    size,
    {
      width,
      height,
    },
  );
  return {
    ...size,
    left: position.left + left,
    top: position.top + boundaryTop,
  };
}
function getBoundary(anchor) {
  return (
    anchor?.closest("[data-media-preview-boundary]") ??
    anchor?.closest("[data-workspace-pane]") ??
    null
  );
}
export function useHoverPreview({
  anchorElement,
  anchorRect,
  size,
  fit = "contain",
  interactive = false,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  const previewRef = reactExports.useRef(null);
  const callbacks = reactExports.useRef({
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  });
  callbacks.current = {
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  };
  const { top: anchorTop, bottom, left, width, height } = anchorRect;
  const measure = reactExports.useCallback(() => {
    const boundary = getBoundary(anchorElement);
    const boundaryRect =
      boundary?.dataset.mediaPreviewBoundary !== "false"
        ? boundary?.getBoundingClientRect()
        : void 0;
    return getMediaPreviewLayout(
      anchorElement?.getBoundingClientRect() ?? {
        top: anchorTop,
        bottom,
        left,
        width,
        height,
      },
      {
        width: size.width,
        height: size.height,
      },
      {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight,
      },
      boundaryRect && boundaryRect.width > 0 && boundaryRect.height > 0
        ? boundaryRect
        : null,
      fit,
    );
  }, [
    anchorElement,
    anchorTop,
    bottom,
    left,
    width,
    height,
    size.width,
    size.height,
    fit,
  ]);
  const [layout, setLayout] = reactExports.useState(measure);
  reactExports.useLayoutEffect(() => {
    const update = () => {
      const next = measure();
      setLayout((previous) =>
        previous.left === next.left &&
        previous.top === next.top &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      );
    };
    update();
    const boundary = getBoundary(anchorElement);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(update);
    if (anchorElement) resizeObserver?.observe(anchorElement);
    if (boundary) resizeObserver?.observe(boundary);
    const mutationObserver = new MutationObserver(update);
    if (boundary) {
      mutationObserver.observe(boundary, {
        attributes: true,
        attributeFilter: ["data-media-preview-boundary"],
      });
    }
    let frame;
    const follow = () => {
      update();
      frame = requestAnimationFrame(follow);
    };
    if (anchorElement && typeof requestAnimationFrame !== "undefined") {
      frame = requestAnimationFrame(follow);
    }
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      if (frame !== void 0) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [anchorElement, measure]);
  reactExports.useEffect(() => {
    if (!interactive) return;
    let inside = true;
    let pointerInside = Boolean(
      anchorElement?.matches(":hover") || previewRef.current?.matches(":hover"),
    );
    const focusAnchor =
      anchorElement?.closest("[data-attachment-id]") ?? anchorElement;
    const containsFocus = () =>
      previewRef.current?.contains(document.activeElement) ||
      focusAnchor?.contains(document.activeElement);
    const handleMove = (event) => {
      const preview = previewRef.current;
      if (!preview) return;
      const anchor = anchorElement?.getBoundingClientRect() ?? anchorRect;
      pointerInside = isPointInPreviewBridge(
        event.clientX,
        event.clientY,
        anchor,
        preview.getBoundingClientRect(),
      );
      const staysOpen = containsFocus() || pointerInside;
      if (staysOpen) callbacks.current.onPreviewMouseEnter?.();
      else if (inside) callbacks.current.onPreviewMouseLeave?.();
      inside = Boolean(staysOpen);
    };
    const handleFocus = () => {
      if (containsFocus() || pointerInside)
        callbacks.current.onPreviewMouseEnter?.();
      else callbacks.current.onPreviewMouseLeave?.();
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [anchorElement, anchorRect, interactive]);
  const handlePreviewMouseLeave = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      const focusAnchor =
        anchorElement?.closest("[data-attachment-id]") ?? anchorElement;
      if (
        previewRef.current?.contains(document.activeElement) ||
        focusAnchor?.contains(document.activeElement)
      ) {
        callbacks.current.onPreviewMouseEnter?.();
      } else {
        callbacks.current.onPreviewMouseLeave?.();
      }
    },
    [anchorElement],
  );
  return {
    layout,
    previewRef,
    handlePreviewMouseLeave,
  };
}
