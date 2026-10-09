// group-node-inner.jsx
import { MEDIA_NODE_RADIUS } from "./package.jsx";
import { GROUP_NODE_PADDING } from "../canvas/compute-group-bounds-from-children.js";
import { GROUP_COLOR_PRESETS } from "./group-color-presets.jsx";
import {
  ChevronDown$2,
  reactExports,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import {
  useCanvasTagFilterActive,
  useRegisterZoomCounter,
  useRenameRequest,
} from "../infra/create-recently-added-store.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import {
  GROUP_DERIVED_CHILD_COUNT_KEY,
  GROUP_DERIVED_COLLAPSED_KEY,
} from "../canvas/use-start-crop-from-node.js";
import { NodeFrameStroke } from "../canvas/node-shell-inner.jsx";
import { useInlineRename } from "../canvas/use-inline-rename.jsx";
import { areNodePropsEqual } from "../canvas/fullscreen-icon.jsx";

function getGroupColorPreset(key2) {
  if (!key2) return null;
  return GROUP_COLOR_PRESETS[key2] ?? null;
}

const GROUP_RESIZE_MIN_WIDTH = GROUP_NODE_PADDING.x * 2;

const GROUP_RESIZE_MIN_HEIGHT =
  GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom;

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

function GroupNodeInner({
  id: id2,
  selected: selected2,
  data: data2,
  width: nodeWidth,
}) {
  const { t: t2 } = useTranslation();
  const { resizeGroupNode, mergeNodeData, setGroupCollapsed } =
    useCanvasActions();
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
  const labelMaxWidthLocal = collapsed
    ? 200
    : Math.max(0, (nodeWidth ?? 0) * zoom2);
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
        <div
          className="border border-[var(--canvas-node-frame-color)]"
          style={labelInnerStyle}
        >
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
            aria-label={
              collapsed
                ? t2("canvas.group.expand")
                : t2("canvas.group.collapse")
            }
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
