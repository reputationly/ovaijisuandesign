// use-hover-preview.js
import { reactExports } from "../vendor.js";

const ANCHOR_GAP$3 = 8;

const VIEWPORT_PADDING = 8;

function isPointInPreviewBridge(x2, y4, anchor, preview) {
  const contains2 = (rect) =>
    x2 >= rect.left &&
    x2 <= rect.left + rect.width &&
    y4 >= rect.top &&
    y4 <= rect.bottom;
  if (contains2(anchor) || contains2(preview)) return true;
  const above = preview.bottom <= anchor.top;
  const below = anchor.bottom <= preview.top;
  if (!above && !below) return false;
  const start2 = above
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
  const end2 = above
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
  if (y4 < start2.y || y4 > end2.y || end2.y === start2.y) return false;
  const progress = (y4 - start2.y) / (end2.y - start2.y);
  return (
    x2 >= start2.left + (end2.left - start2.left) * progress &&
    x2 <= start2.right + (end2.right - start2.right) * progress
  );
}

function clamp$8(value, min2, max2) {
  return Math.min(Math.max(value, min2), max2);
}

function getMediaPreviewPosition(anchorRect, previewSize, viewport) {
  const preferredTop = anchorRect.top - previewSize.height - ANCHOR_GAP$3;
  const fallbackTop = anchorRect.bottom + ANCHOR_GAP$3;
  const fitsAbove = preferredTop >= VIEWPORT_PADDING;
  const fitsBelow =
    fallbackTop + previewSize.height <= viewport.height - VIEWPORT_PADDING;
  const moreSpaceAbove = anchorRect.top > viewport.height - anchorRect.bottom;
  const top2 = clamp$8(
    fitsAbove || (!fitsBelow && moreSpaceAbove) ? preferredTop : fallbackTop,
    VIEWPORT_PADDING,
    Math.max(
      VIEWPORT_PADDING,
      viewport.height - previewSize.height - VIEWPORT_PADDING,
    ),
  );
  const left = clamp$8(
    anchorRect.left + anchorRect.width / 2 - previewSize.width / 2,
    VIEWPORT_PADDING,
    Math.max(
      VIEWPORT_PADDING,
      viewport.width - previewSize.width - VIEWPORT_PADDING,
    ),
  );
  return {
    top: top2,
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
  const top2 = Math.max(0, boundary.top);
  const width = Math.max(0, Math.min(viewport.width, boundary.right) - left);
  const height = Math.max(0, Math.min(viewport.height, boundary.bottom) - top2);
  const scale2 = Math.min(
    1,
    Math.max(1, width - VIEWPORT_PADDING * 2) / previewSize.width,
    Math.max(1, height - VIEWPORT_PADDING * 2) / previewSize.height,
  );
  const size2 =
    fit === "contain"
      ? {
          width: previewSize.width * scale2,
          height: previewSize.height * scale2,
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
  const position2 = getMediaPreviewPosition(
    {
      width: anchorRect.width,
      height: anchorRect.height,
      left: anchorRect.left - left,
      top: anchorRect.top - top2,
      bottom: anchorRect.bottom - top2,
    },
    size2,
    {
      width,
      height,
    },
  );
  return {
    ...size2,
    left: position2.left + left,
    top: position2.top + top2,
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
  size: size2,
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
  const { top: top2, bottom, left, width, height } = anchorRect;
  const measure = reactExports.useCallback(() => {
    const boundary = getBoundary(anchorElement);
    const boundaryRect =
      boundary?.dataset.mediaPreviewBoundary !== "false"
        ? boundary?.getBoundingClientRect()
        : void 0;
    return getMediaPreviewLayout(
      anchorElement?.getBoundingClientRect() ?? {
        top: top2,
        bottom,
        left,
        width,
        height,
      },
      {
        width: size2.width,
        height: size2.height,
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
    top2,
    bottom,
    left,
    width,
    height,
    size2.width,
    size2.height,
    fit,
  ]);
  const [layout, setLayout] = reactExports.useState(measure);
  reactExports.useLayoutEffect(() => {
    const update2 = () => {
      const next2 = measure();
      setLayout((previous2) =>
        previous2.left === next2.left &&
        previous2.top === next2.top &&
        previous2.width === next2.width &&
        previous2.height === next2.height
          ? previous2
          : next2,
      );
    };
    update2();
    const boundary = getBoundary(anchorElement);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(update2);
    if (anchorElement) resizeObserver?.observe(anchorElement);
    if (boundary) resizeObserver?.observe(boundary);
    const mutationObserver = new MutationObserver(update2);
    if (boundary) {
      mutationObserver.observe(boundary, {
        attributes: true,
        attributeFilter: ["data-media-preview-boundary"],
      });
    }
    let frame2;
    const follow = () => {
      update2();
      frame2 = requestAnimationFrame(follow);
    };
    if (anchorElement && typeof requestAnimationFrame !== "undefined") {
      frame2 = requestAnimationFrame(follow);
    }
    window.addEventListener("resize", update2);
    document.addEventListener("scroll", update2, true);
    return () => {
      if (frame2 !== void 0) cancelAnimationFrame(frame2);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update2);
      document.removeEventListener("scroll", update2, true);
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
