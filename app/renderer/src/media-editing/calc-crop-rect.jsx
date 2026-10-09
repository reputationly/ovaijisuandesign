// calc-crop-rect.jsx
import { useTranslation, reactExports, useStore$3, ChevronDown$2 } from "../vendor.js";
import { NodeResizeFrame } from "../infra/create-html-iframe-pool-store.jsx";
import { useCanvasTagFilterActive, useRegisterZoomCounter, useRenameRequest } from "../infra/create-recently-added-store.jsx";
import { GROUP_NODE_PADDING } from "../canvas/group-nodes-in-canvas.js";
import { useCanvasBridge, useCanvasActions, MEDIA_NODE_RADIUS } from "./parse-item.jsx";
import { GROUP_DERIVED_CHILD_COUNT_KEY, GROUP_DERIVED_COLLAPSED_KEY, CanvasOverlayStoreContext, clamp$6 } from "../canvas/use-file-bytes.js";
import { areNodePropsEqual } from "../canvas/generating-media-area.jsx";
import { NodeFrameStroke } from "../canvas/use-media-node-actions.jsx";
import { useInlineRename } from "../canvas/use-inline-rename.jsx";
import { calcImageCost } from "../generation/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { GROUP_COLOR_PRESETS } from "./pdf-viewer.jsx";
function getGroupColorPreset(key2) {
  if (!key2) return null;
  return GROUP_COLOR_PRESETS[key2] ?? null;
}
const GROUP_RESIZE_MIN_WIDTH = GROUP_NODE_PADDING.x * 2;
const GROUP_RESIZE_MIN_HEIGHT = GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom;
const GROUP_FRAME_BASE_STYLE = {
  position: "absolute",
  inset: 0,
  boxSizing: "border-box",
  borderRadius: MEDIA_NODE_RADIUS,
  // Localize internal layout / style changes so they don't invalidate
  // siblings in the viewport's compositor layer.
  //   - `layout`: localizes changes when resize chrome mounts/unmounts.
  //   - `style`: blocks counter/quote inheritance escaping out of the group.
  // Intentionally NOT adding `paint`: the floating chip lives at
  // `bottom: 100%` (outside the frame's padding box), and `contain: paint`
  // clips overflow to the contain box — it would invisibly trim the chip.
  contain: "layout style",
};
const LABEL_HEIGHT_PX = 24;
const LABEL_PADDING_RIGHT_PX = 8;
const LABEL_PADDING_LEFT_PX = 4;
const LABEL_CHEVRON_SIZE_PX = 14;
const LABEL_GAP_PX = 4;
const LABEL_INPUT_MIN_WIDTH_PX = 140;
const zoomSelector$6 = (s2) => s2.transform[2];
const GROUP_LABEL_INNER_BASE_STYLE = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: LABEL_GAP_PX,
  height: LABEL_HEIGHT_PX,
  paddingLeft: LABEL_PADDING_LEFT_PX,
  paddingRight: LABEL_PADDING_RIGHT_PX,
  // Chip has no fill — sits as a translucent label over the group frame.
  // Border lives on the className so `:focus-within` can swap to the
  // selected token while editing without conflicting with this inline
  // style. Small rounded corners (matches design system `rounded-sm`).
  background: "transparent",
  borderRadius: MEDIA_NODE_RADIUS,
  // Enable pointer events on the label itself; the wrapper is non-interactive
  // so the gap area above the node doesn't intercept clicks.
  pointerEvents: "auto",
  userSelect: "none",
  boxSizing: "border-box",
};
const stopMouseEvent = (e2) => e2.stopPropagation();
function GroupNodeInner({ id: id2, selected: selected2, data: data2, width: nodeWidth }) {
  const { t: t2 } = useTranslation();
  const { resizeGroupNode, mergeNodeData, setGroupCollapsed } = useCanvasActions();
  const tagFilterActive = useCanvasTagFilterActive();
  const zoom2 = useStore$3(zoomSelector$6);
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const groupData = data2;
  const childCount = groupData?.[GROUP_DERIVED_CHILD_COUNT_KEY] ?? 0;
  const customLabel = groupData?.label?.trim();
  const collapsed = !!groupData?.[GROUP_DERIVED_COLLAPSED_KEY];
  const dynamicTitle = reactExports.useMemo(
    () =>
      t2("canvas.groupCount", {
        count: childCount,
      }),
    [t2, childCount],
  );
  const handleLabelCommit = reactExports.useCallback(
    (next2) =>
      mergeNodeData(id2, {
        label: next2,
      }),
    [id2, mergeNodeData],
  );
  const rename = useInlineRename({
    currentValue: customLabel ?? "",
    onCommit: handleLabelCommit,
  });
  useRenameRequest(id2, rename.beginEdit);
  const handleToggleCollapsed = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      setGroupCollapsed(id2, !collapsed);
    },
    [id2, setGroupCollapsed, collapsed],
  );
  const handleLabelDoubleClick = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      rename.beginEdit();
    },
    [rename.beginEdit],
  );
  const handleRenameInputChange = reactExports.useCallback(
    (e2) => rename.setEditValue(e2.target.value),
    [rename.setEditValue],
  );
  const renderedTitle = rename.displayValue || dynamicTitle;
  const frameStyle = reactExports.useMemo(() => {
    if (collapsed) {
      return {
        ...GROUP_FRAME_BASE_STYLE,
        background: "transparent",
        outline: "none",
        // Don't intercept pan / drag events when the group is collapsed —
        // there's nothing to hit visually so users expect to interact with
        // whatever's behind the (invisible) frame area.
        pointerEvents: "none",
      };
    }
    const colorPreset = getGroupColorPreset(groupData?.backgroundColor);
    return {
      ...GROUP_FRAME_BASE_STYLE,
      background: colorPreset ? colorPreset.bg : "var(--canvas-group-bg)",
      outline: "none",
    };
  }, [collapsed, groupData?.backgroundColor]);
  const labelMaxWidthLocal = collapsed ? 200 : Math.max(0, (nodeWidth ?? 0) * zoom2);
  const labelWrapperStyle = reactExports.useMemo(
    () => ({
      position: "absolute",
      bottom: "100%",
      left: 0,
      transform: `scale(${1 / zoom2})`,
      transformOrigin: "bottom left",
      // Padding-bottom inside the counter-scaled wrapper resolves to a
      // constant physical-pixel gap above the node body.
      paddingBottom: LABEL_GAP_PX,
      // Wrapper itself is non-interactive; the inner label re-enables
      // pointer events. This keeps the gap area above the node from
      // intercepting pan/click on the canvas.
      pointerEvents: "none",
    }),
    [zoom2],
  );
  const labelInnerStyle = reactExports.useMemo(
    () => ({
      ...GROUP_LABEL_INNER_BASE_STYLE,
      maxWidth: labelMaxWidthLocal,
    }),
    [labelMaxWidthLocal],
  );
  const renameInputStyle = reactExports.useMemo(
    () => ({
      pointerEvents: "auto",
      // Inside a flex chip — the input only needs to fit between the
      // chevron and the right padding. Cap to the remaining horizontal
      // budget so long titles trigger the chip's overall maxWidth instead
      // of overflowing past the chip frame.
      flex: "1 1 auto",
      minWidth: Math.min(LABEL_INPUT_MIN_WIDTH_PX, labelMaxWidthLocal),
      maxWidth: labelMaxWidthLocal,
      height: LABEL_HEIGHT_PX - 2,
      lineHeight: `${LABEL_HEIGHT_PX - 2}px`,
      boxSizing: "border-box",
    }),
    [labelMaxWidthLocal],
  );
  return (
    <div
      ref={frameRef}
      style={frameStyle}
      className={`canvas-node-frame${tagFilterActive ? " opacity-25 transition-opacity duration-150" : ""}`}
      data-node-frame-hidden={collapsed ? "true" : void 0}
      data-node-selected={selected2 ? "true" : "false"}
      data-action-ui-id="canvas.group-node"
      data-tag-filter-match={tagFilterActive ? "false" : void 0}
    >
      <NodeFrameStroke />
      <div style={labelWrapperStyle}>
        <div className="border border-[var(--canvas-node-frame-color)]" style={labelInnerStyle}>
          <button
            type="button"
            onClick={handleToggleCollapsed}
            onMouseDown={stopMouseEvent}
            onDoubleClick={stopMouseEvent}
            className="nodrag shrink-0 inline-flex items-center justify-center cursor-pointer text-[var(--fg-default,#141414)] hover:opacity-70 bg-transparent border-0 p-0"
            style={{
              width: LABEL_CHEVRON_SIZE_PX + 2,
              height: LABEL_CHEVRON_SIZE_PX + 2,
              // Rotate 180° when collapsed so the down-chevron flips
              // to an up-chevron (mirrors the request "点击后变成上拉").
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms",
            }}
            aria-label={collapsed ? t2("canvas.group.expand") : t2("canvas.group.collapse")}
            aria-expanded={!collapsed}
            data-action-ui-id="canvas.group-collapse-toggle"
          >
            <ChevronDown$2 size={LABEL_CHEVRON_SIZE_PX} />
          </button>
          {rename.editing ? (
            <input
              ref={rename.inputRef}
              className="nodrag text-[13px] text-[var(--fg-default,#141414)] bg-transparent outline-none border-0 p-0"
              style={renameInputStyle}
              value={rename.editValue}
              placeholder={dynamicTitle}
              onChange={handleRenameInputChange}
              onBlur={rename.commit}
              onKeyDown={rename.onKeyDown}
              onMouseDown={stopMouseEvent}
              onClick={stopMouseEvent}
              onDoubleClick={stopMouseEvent}
              data-action-ui-id="canvas.group-rename-input"
            />
          ) : (
            // biome-ignore lint/a11y/noStaticElementInteractions: double-click rename trigger on a floating label
            <div
              className="canvas-group-collapsed-drag-handle flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-[13px] text-[var(--fg-default,#141414)]"
              style={{
                lineHeight: `${LABEL_HEIGHT_PX - 2}px`,
              }}
              title={renderedTitle}
              onDoubleClick={handleLabelDoubleClick}
              data-action-ui-id="canvas.group-label"
            >
              {renderedTitle}
            </div>
          )}
        </div>
      </div>
      {selected2 && !collapsed && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={GROUP_RESIZE_MIN_WIDTH}
          minHeight={GROUP_RESIZE_MIN_HEIGHT}
          onCommit={resizeGroupNode}
        />
      )}
    </div>
  );
}
export const GroupNode = reactExports.memo(GroupNodeInner, areNodePropsEqual);
const NANO_BANANA_EDIT_PRICING_MODEL_ID = "nano_banana_2";
export const SEEDREAM_REDRAW_PRICING_MODEL_ID = "doubao-seedream-5-0-pro-260628";
const REMOVE_BG_PRICING_MODEL_ID = "jimeng_remove_background";
const ENHANCE_IMAGE_PRICING_MODEL_ID = "mediakit_enhance";
const IMAGE_EDIT_PRICING = {
  redraw: {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  outpaint: {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  erase: {
    modelId: SEEDREAM_REDRAW_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  "move-object": {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  "super-resolution": {
    modelId: ENHANCE_IMAGE_PRICING_MODEL_ID,
    resolution: {
      kind: "none",
    },
  },
  "remove-bg": {
    modelId: REMOVE_BG_PRICING_MODEL_ID,
    resolution: {
      kind: "none",
    },
  },
};
function resolveImageEditCost(
  pricing,
  tool2,
  selectedResolution,
  pricingModelIdOverride,
  refCount,
) {
  const spec = IMAGE_EDIT_PRICING[tool2];
  if (!spec) return void 0;
  const resolution =
    spec.resolution.kind === "dynamic"
      ? selectedResolution
      : spec.resolution.kind === "fixed"
        ? spec.resolution.resolution
        : void 0;
  return calcImageCost(
    pricing,
    pricingModelIdOverride ?? spec.modelId,
    resolution,
    void 0,
    refCount ?? 0,
  );
}
export function useImageEditCost(tool2, selectedResolution, pricingModelIdOverride, refCount) {
  const { pricingConfig } = useCanvasBridge();
  return resolveImageEditCost(
    pricingConfig,
    tool2,
    selectedResolution,
    pricingModelIdOverride,
    refCount,
  );
}
export function CanvasOverlayStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    CanvasOverlayStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
export const ASPECT_RATIOS = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};
const MIN_CROP_RATIO$1 = 0.05;
const HANDLE_SIZE_PX = 24;
const MIN_CROP_PX = HANDLE_SIZE_PX * 2;
export const DEFAULT_CROP = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};
function minCropFraction$1(containerPx) {
  if (containerPx && containerPx > 0) {
    return Math.max(MIN_CROP_RATIO$1, MIN_CROP_PX / containerPx);
  }
  return MIN_CROP_RATIO$1;
}
function clampCropRect$1(r2, containerWidth, containerHeight) {
  const minW = minCropFraction$1(containerWidth);
  const minH = minCropFraction$1(containerHeight);
  const w3 = clamp$6(r2.width, minW, 1);
  const h2 = clamp$6(r2.height, minH, 1);
  const x2 = clamp$6(r2.x, 0, 1 - w3);
  const y4 = clamp$6(r2.y, 0, 1 - h2);
  return {
    x: x2,
    y: y4,
    width: w3,
    height: h2,
  };
}
function fitAspectRectToBounds({ rect, handle: handle2, normRatio, minW, minH }) {
  let { x: x2, y: y4, width, height } = rect;
  if (handle2 === "l" || handle2 === "r") {
    const centerY = y4 + height / 2;
    const right = x2 + width;
    const maxHeightFromCenter = 2 * Math.min(centerY, 1 - centerY);
    const maxWidthFromCenter = maxHeightFromCenter * normRatio;
    const maxWidthFromEdge = handle2 === "r" ? 1 - x2 : right;
    const maxWidth = Math.max(Math.min(maxWidthFromEdge, maxWidthFromCenter), minW);
    width = clamp$6(width, minW, maxWidth);
    height = width / normRatio;
    y4 = centerY - height / 2;
    if (handle2 === "l") x2 = right - width;
  } else if (handle2 === "t" || handle2 === "b") {
    const centerX = x2 + width / 2;
    const bottom = y4 + height;
    const maxWidthFromCenter = 2 * Math.min(centerX, 1 - centerX);
    const maxHeightFromCenter = maxWidthFromCenter / normRatio;
    const maxHeightFromEdge = handle2 === "b" ? 1 - y4 : bottom;
    const maxHeight = Math.max(Math.min(maxHeightFromEdge, maxHeightFromCenter), minH);
    height = clamp$6(height, minH, maxHeight);
    width = height * normRatio;
    x2 = centerX - width / 2;
    if (handle2 === "t") y4 = bottom - height;
  } else {
    const right = x2 + width;
    const bottom = y4 + height;
    const anchorX = handle2 === "tl" || handle2 === "bl" ? right : x2;
    const anchorY = handle2 === "tl" || handle2 === "tr" ? bottom : y4;
    const maxWidthFromEdge = handle2 === "tl" || handle2 === "bl" ? anchorX : 1 - anchorX;
    const maxHeightFromEdge = handle2 === "tl" || handle2 === "tr" ? anchorY : 1 - anchorY;
    const maxWidth = Math.max(Math.min(maxWidthFromEdge, maxHeightFromEdge * normRatio), minW);
    width = clamp$6(width, minW, maxWidth);
    height = width / normRatio;
    if (handle2 === "tl" || handle2 === "bl") x2 = anchorX - width;
    else x2 = anchorX;
    if (handle2 === "tl" || handle2 === "tr") y4 = anchorY - height;
    else y4 = anchorY;
  }
  return clampCropRect$1({
    x: x2,
    y: y4,
    width,
    height,
  });
}
export function calcCropRect({
  initialRect,
  deltaX,
  deltaY,
  handle: handle2,
  aspectRatio,
  containerWidth,
  containerHeight,
}) {
  let minW = minCropFraction$1(containerWidth);
  let minH = minCropFraction$1(containerHeight);
  if (aspectRatio != null && aspectRatio > 0 && containerWidth && containerHeight) {
    const minWFromH = (HANDLE_SIZE_PX * 2 * aspectRatio) / containerWidth;
    const minHFromW = (HANDLE_SIZE_PX * 2) / (aspectRatio * containerHeight);
    minW = Math.max(minW, minWFromH);
    minH = Math.max(minH, minHFromW);
  }
  if (handle2 === null) {
    return clampCropRect$1(
      {
        ...initialRect,
        x: initialRect.x + deltaX,
        y: initialRect.y + deltaY,
      },
      containerWidth,
      containerHeight,
    );
  }
  const { x: ix, y: iy, width: iw, height: ih } = initialRect;
  let left = ix;
  let top2 = iy;
  let right = ix + iw;
  let bottom = iy + ih;
  const movesLeft = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesRight = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesTop = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesBottom = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  const isCorner = movesLeft !== movesRight && movesTop !== movesBottom;
  if (movesLeft) left += deltaX;
  if (movesRight) right += deltaX;
  if (movesTop) top2 += deltaY;
  if (movesBottom) bottom += deltaY;
  if (isCorner) {
    const rawW = right - left;
    const rawH = bottom - top2;
    if (rawW < minW || rawH < minH) {
      let fX = 1;
      let fY = 1;
      const dw = rawW - iw;
      const dh = rawH - ih;
      if (rawW < minW && Math.abs(dw) > 1e-6) {
        fX = (iw - minW) / -dw;
      }
      if (rawH < minH && Math.abs(dh) > 1e-6) {
        fY = (ih - minH) / -dh;
      }
      const f2 = clamp$6(Math.min(fX, fY), 0, 1);
      left = movesLeft ? ix + deltaX * f2 : ix;
      top2 = movesTop ? iy + deltaY * f2 : iy;
      right = movesRight ? ix + iw + deltaX * f2 : ix + iw;
      bottom = movesBottom ? iy + ih + deltaY * f2 : iy + ih;
    }
  }
  if (movesLeft) left = clamp$6(left, 0, right - minW);
  if (movesRight) right = clamp$6(right, left + minW, 1);
  if (movesTop) top2 = clamp$6(top2, 0, bottom - minH);
  if (movesBottom) bottom = clamp$6(bottom, top2 + minH, 1);
  let width = right - left;
  let height = bottom - top2;
  let x2 = left;
  let y4 = top2;
  if (aspectRatio != null && aspectRatio > 0) {
    const imageAspect = containerWidth && containerHeight ? containerWidth / containerHeight : 1;
    const normRatio = aspectRatio / imageAspect;
    const desiredH = width / normRatio;
    if (handle2 === "l" || handle2 === "r") {
      const cy = y4 + height / 2;
      height = desiredH;
      y4 = cy - height / 2;
    } else if (handle2 === "t" || handle2 === "b") {
      const cx2 = x2 + width / 2;
      width = height * normRatio;
      x2 = cx2 - width / 2;
    } else {
      const anchorBottom = y4 + height;
      height = desiredH;
      if (handle2 === "tl" || handle2 === "tr") y4 = anchorBottom - height;
    }
    ({
      x: x2,
      y: y4,
      width,
      height,
    } = fitAspectRectToBounds({
      rect: {
        x: x2,
        y: y4,
        width,
        height,
      },
      handle: handle2,
      normRatio,
      minW,
      minH,
    }));
  }
  x2 = clamp$6(x2, 0, 1 - width);
  y4 = clamp$6(y4, 0, 1 - height);
  return {
    x: x2,
    y: y4,
    width,
    height,
  };
}
