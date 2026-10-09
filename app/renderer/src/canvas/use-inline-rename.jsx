// use-inline-rename.jsx
import { jsxRuntimeExports, reactExports, useStore$3, CompositedSvg, useTranslation, X$7, useStoreApi, Position, Handle, useNodeId } from "../vendor.js";
import { useRegisterZoomCounter, CanvasTagColorsContext, renameRequestStore, useRenameRequest, CanvasModalGuardContext, RecentlyAddedStoreContext } from "../infra/create-recently-added-store.jsx";
import { useCanvasBridge, useCanvasActions, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, useAssetMeta } from "../media-editing/parse-item.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1, createTracker, trackers$1 } from "../generation/create-tracker.jsx";
import { useCanvasNodeIsDragging } from "./generating-media-area.jsx";
import { MAX_VISIBLE_CANVAS_TAG_COLORS } from "../infra/normalize-tag-registry.js";
function registerHandleProximity(element2) {
  const root2 = element2.closest(".react-flow");
  const node2 = element2.closest(".react-flow__node");
  if (!root2 || !node2) return null;
  const tracker2 = trackers$1.get(root2) ?? createTracker(root2);
  trackers$1.set(root2, tracker2);
  return tracker2.register(element2, node2);
}
const HANDLE_BASE = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: 0,
  overflow: "visible",
  zIndex: 20,
};
const HANDLE_TARGET = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  background: "transparent",
  border: "none",
  borderRadius: 0,
  overflow: "visible",
  zIndex: 20,
  pointerEvents: "none",
};
function HandleIcon() {
  return (
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="node-handle-icon"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="8.25" />
      <path d="M9 5.5v7M5.5 9h7" strokeLinecap="round" />
    </CompositedSvg>
  );
}
function ProximityHandleInner({ nodeId, handlePosition, selected: selected2 }) {
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(nodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const { openAddNodeMenu } = useCanvasActions();
  const flowStore = useStoreApi();
  const forceHidden = isMultiSelect || isDragging || isBoxSelecting;
  const side = handlePosition === Position.Left ? "left" : "right";
  const entryRef = reactExports.useRef(null);
  const proximityRef = reactExports.useRef(null);
  useRegisterZoomCounter(entryRef);
  reactExports.useEffect(() => {
    const element2 = entryRef.current;
    if (!element2 || forceHidden) return;
    const registration = registerHandleProximity(element2);
    proximityRef.current = registration;
    return () => {
      registration?.dispose();
      proximityRef.current = null;
    };
  }, [forceHidden]);
  const handleMouseDown2 = reactExports.useCallback(
    (event) => {
      const isConnectionSource = !!event.currentTarget.closest(".react-flow__handle.source");
      proximityRef.current?.beginGesture(
        event.nativeEvent,
        isConnectionSource ? flowStore.getState().connectionDragThreshold : 5,
      );
    },
    [flowStore],
  );
  const handleClick2 = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (forceHidden || proximityRef.current?.didDrag()) return;
      const element2 = entryRef.current;
      if (!element2) return;
      const rect = element2.getBoundingClientRect();
      openAddNodeMenu({
        sourceNodeId: nodeId,
        handlePosition,
        screenX: rect.left + rect.width / 2,
        screenY: rect.top + rect.height / 2,
      });
      proximityRef.current?.retainForMenu();
    },
    [forceHidden, nodeId, handlePosition, openAddNodeMenu],
  );
  return (
    // Pointer-only affordance over the existing ReactFlow Handle. The
    // passive proximity tracker does not add a separate DOM hit surface.
    // biome-ignore lint/a11y/noStaticElementInteractions: connection drag surface
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer affordance over ReactFlow Handle
    <div
      ref={entryRef}
      data-action-ui-id="canvas.node-handle-plus"
      data-selected={selected2 || void 0}
      data-hidden={forceHidden || void 0}
      data-side={side}
      className="node-handle-plus nodrag nopan"
      onMouseDown={handleMouseDown2}
      onClick={handleClick2}
    >
      <span className="node-handle-hit-area" aria-hidden="true" />
      <HandleIcon />
    </div>
  );
}
const ProximityHandle = reactExports.memo(ProximityHandleInner);
function NodeHandlesInner({
  nodeId,
  selected: selected2,
  showSourceAffordance = true,
  sourcePosition = Position.Right,
}) {
  const connectable = useStore$3((s2) => s2.nodesConnectable);
  const targetPosition = sourcePosition === Position.Left ? Position.Right : Position.Left;
  if (!nodeId) {
    return <Handle type="target" position={targetPosition} style={HANDLE_TARGET} />;
  }
  return (
    <>
      <Handle type="target" position={targetPosition} style={HANDLE_TARGET} />
      <Handle type="source" position={sourcePosition} style={HANDLE_BASE}>
        {connectable && showSourceAffordance ? (
          <ProximityHandle nodeId={nodeId} handlePosition={sourcePosition} selected={!!selected2} />
        ) : null}
      </Handle>
    </>
  );
}
export const NodeHandles = reactExports.memo(NodeHandlesInner);
export function useNodeTagColors(tagIds) {
  const resolve = reactExports.useContext(CanvasTagColorsContext);
  return resolve(tagIds);
}
export function requestNodeRename(nodeId) {
  renameRequestStore.getState().requestRename(nodeId);
}
export const CanvasLabelIcon = reactExports.forwardRef(function CanvasLabelIcon2(
  { size: size2 = 20, strokeWidth = 1.25, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      xmlns="http://www.w3.org/2000/svg"
      data-canvas-label-icon=""
      {...props}
    >
      <path d="M10.043 4.02257C10.828 3.68622 11.6926 3.5 12.6007 3.5C16.1906 3.5 19.1007 6.41015 19.1007 10C19.1007 13.5899 16.1906 16.5 12.6007 16.5C11.6654 16.5 10.7762 16.3025 9.97266 15.9468M13.8008 10C13.8008 13.5899 10.8906 16.5 7.30078 16.5C3.71093 16.5 0.800781 13.5899 0.800781 10C0.800781 6.41015 3.71093 3.5 7.30078 3.5C10.8906 3.5 13.8008 6.41015 13.8008 10Z" />
    </CompositedSvg>
  );
});
CanvasLabelIcon.displayName = "CanvasLabelIcon";
const NODE_QUICK_TAG_SCALE = "scale(clamp(1, calc(1 / var(--canvas-zoom, 1)), calc(1 / 0.7)))";
const NODE_QUICK_TAG_BORDER_WIDTH =
  "min(calc(1px / var(--canvas-zoom, 1)), max(1px, calc(0.7px / var(--canvas-zoom, 1))))";
export function NodeQuickTagTrigger({ visible, className, counterScaleOrigin = "center" }) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId();
  const assetMeta = useAssetMeta(nodeId ?? "");
  const { onNodeTagRequest } = useCanvasBridge();
  const isMultiSelect = useCanvasIsMultiSelect();
  const buttonRef = reactExports.useRef(null);
  const canRender = Boolean(
    visible &&
    !isMultiSelect &&
    nodeId &&
    assetMeta?.path &&
    !assetMeta.tagIds?.length &&
    onNodeTagRequest,
  );
  useRegisterZoomCounter(buttonRef, canRender);
  if (
    !visible ||
    isMultiSelect ||
    !nodeId ||
    !assetMeta?.path ||
    assetMeta.tagIds?.length ||
    !onNodeTagRequest
  ) {
    return null;
  }
  return (
    <Tooltip$1 content={t2("canvasTags.entry")}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t2("canvasTags.entry")}
        data-action-ui-id="canvas.node-tag-trigger"
        className={`nodrag nopan nowheel flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-popover text-popover-foreground outline-hidden transition-colors [--node-quick-tag-border-color:var(--brutalist-border-subtle)] hover:[--node-quick-tag-border-color:var(--brutalist-border)] focus-visible:[--node-quick-tag-border-color:var(--brutalist-border)] focus-visible:ring-0${className ? ` ${className}` : ""}`}
        style={{
          transform: NODE_QUICK_TAG_SCALE,
          transformOrigin: counterScaleOrigin,
          boxShadow: `inset 0 0 0 ${NODE_QUICK_TAG_BORDER_WIDTH} var(--node-quick-tag-border-color)`,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onNodeTagRequest(nodeId, event.currentTarget);
        }}
      >
        <CanvasLabelIcon className="size-5 scale-80" strokeWidth={1.25} aria-hidden={true} />
      </button>
    </Tooltip$1>
  );
}
const NODE_TAG_MAX_VISIBLE_COLORS = MAX_VISIBLE_CANVAS_TAG_COLORS;
const NODE_TAG_HEADER_HEIGHT = 24;
const NODE_TAG_MIN_COUNTER_SCALE = 1;
const NODE_TAG_MAX_COUNTER_SCALE = 4.35;
const NODE_TAG_SURFACE_COLOR =
  "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-surface-strength, 35%), var(--canvas-node-tag-surface-base, #ffffff))";
const NODE_TAG_INK_COLOR =
  "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-ink-strength, 30%), var(--canvas-node-tag-ink-base, #141414))";
const NODE_TAG_BORDER_COLOR =
  "color-mix(in srgb, var(--node-tag-color) var(--canvas-node-tag-border-strength, 100%), var(--node-tag-surface))";
const NODE_TAG_THEME_TOKEN_BY_PRESET = {
  "#0A84FF": "--canvas-node-tag-blue",
  "#BF5AF2": "--canvas-node-tag-purple",
  "#FF9F0A": "--canvas-node-tag-orange",
  "#5E3DF5": "--canvas-node-tag-deep-purple",
  "#FF5F57": "--canvas-node-tag-red",
  "#30D158": "--canvas-node-tag-green",
  "#FFD60A": "--canvas-node-tag-yellow",
};
function resolveNodeTagPresentationColor(color2) {
  const token2 = NODE_TAG_THEME_TOKEN_BY_PRESET[color2.toUpperCase()];
  return token2 ? `var(${token2}, ${color2.toUpperCase()})` : color2;
}
export function resolveNodeTagHighlight(selected2, tags2) {
  const activeTagColor = tags2.find((tag) => tag.active)?.color;
  return {
    activeTagColor,
    outlineColor: selected2 ? "var(--canvas-node-border-selected)" : "transparent",
  };
}
function NodeTagLabels({ tags: tags2, onTagClick, onTagRemove }) {
  const { t: t2 } = useTranslation();
  const labelsRef = reactExports.useRef(null);
  const visibleTags = tags2.slice(0, NODE_TAG_MAX_VISIBLE_COLORS);
  useRegisterZoomCounter(labelsRef);
  return (
    <div
      ref={labelsRef}
      className="group/tags isolate flex h-5 w-max items-center overflow-visible"
      style={{
        transform:
          "scale(min(max(var(--node-tag-min-counter-scale), calc(1 / var(--canvas-zoom, 1))), var(--node-tag-max-counter-scale)))",
        transformOrigin: "right bottom",
        translate: "0 calc(-2px / var(--canvas-zoom, 1))",
        "--node-tag-min-counter-scale": NODE_TAG_MIN_COUNTER_SCALE,
        "--node-tag-max-counter-scale": NODE_TAG_MAX_COUNTER_SCALE,
      }}
      data-action-ui-id="canvas.node-tag-labels"
    >
      {visibleTags.map((tag, index2) => {
        const isPrimary = index2 === 0;
        const canRemove = Boolean(tag.id && onTagRemove);
        return (
          <span
            key={tag.id ?? `${tag.name}:${tag.color}`}
            className="group/tag relative flex h-5 min-w-8 w-max shrink-0 items-center overflow-hidden rounded-[100px] border border-[var(--node-tag-border)] bg-[var(--node-tag-surface)] text-xs font-normal leading-none transition-[margin,background-color] duration-150 ease-out"
            style={{
              "--node-tag-color": resolveNodeTagPresentationColor(tag.color),
              "--node-tag-surface": NODE_TAG_SURFACE_COLOR,
              "--node-tag-ink": NODE_TAG_INK_COLOR,
              "--node-tag-border": NODE_TAG_BORDER_COLOR,
              color: "var(--node-tag-ink)",
              zIndex: visibleTags.length - index2,
            }}
            data-action-ui-id="canvas.node-tag-label"
            data-tag-name={tag.name}
            data-tag-active={tag.active ? "true" : void 0}
            data-tag-primary={isPrimary ? "true" : void 0}
          >
            <button
              type="button"
              className="nodrag nopan nowheel flex h-full min-w-0 items-center px-2 text-inherit opacity-100 outline-hidden transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-current/50"
              data-action-ui-id="canvas.node-tag-switch"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onTagClick?.(tag, event.currentTarget);
              }}
            >
              <span className="whitespace-nowrap leading-4">{tag.name}</span>
            </button>
            {canRemove ? (
              <button
                type="button"
                aria-label={t2("canvasTags.removeFromAsset")}
                data-action-ui-id="canvas.node-tag-remove"
                className="nodrag nopan nowheel pointer-events-none absolute right-0.5 flex size-4 scale-75 items-center justify-center rounded-full opacity-0 outline-hidden transition-opacity group-hover/tag:pointer-events-auto group-hover/tag:opacity-100 group-focus-within/tag:pointer-events-auto group-focus-within/tag:opacity-100 focus-visible:ring-2 focus-visible:ring-current/50"
                style={{
                  backgroundColor: "var(--node-tag-ink)",
                  color: "var(--node-tag-surface)",
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onTagRemove?.(tag);
                }}
              >
                <X$7 className="size-3" strokeWidth={3} aria-hidden="true" />
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
export function useInlineRename({
  currentValue,
  onCommit,
  preserveExtension: preserveExtension2 = false,
}) {
  const storeApi = useStoreApi();
  const [editing, setEditing] = reactExports.useState(false);
  const [editValue, setEditValue] = reactExports.useState("");
  const [optimisticValue, setOptimisticValue] = reactExports.useState(null);
  const inputRef = reactExports.useRef(null);
  const committedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (optimisticValue == null) return;
    if (currentValue === optimisticValue) {
      setOptimisticValue(null);
      return;
    }
    const timer2 = setTimeout(() => setOptimisticValue(null), 300);
    return () => clearTimeout(timer2);
  }, [currentValue, optimisticValue]);
  const displayValue = optimisticValue ?? currentValue;
  const beginEdit = reactExports.useCallback(() => {
    storeApi.getState().unselectNodesAndEdges();
    const dotIdx = preserveExtension2 ? displayValue.lastIndexOf(".") : -1;
    setEditValue(dotIdx > 0 ? displayValue.slice(0, dotIdx) : displayValue);
    committedRef.current = false;
    setEditing(true);
  }, [displayValue, storeApi, preserveExtension2]);
  const commit = reactExports.useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    const trimmed = editValue.trim();
    if (!trimmed || !onCommit) return;
    const dotIdx = preserveExtension2 ? currentValue.lastIndexOf(".") : -1;
    const ext = dotIdx > 0 ? currentValue.slice(dotIdx) : "";
    const newValue = trimmed + ext;
    if (newValue === currentValue) return;
    setOptimisticValue(newValue);
    onCommit(newValue);
  }, [editValue, currentValue, preserveExtension2, onCommit]);
  const cancel = reactExports.useCallback(() => {
    committedRef.current = true;
    setEditing(false);
  }, []);
  const onKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Enter") {
        e2.preventDefault();
        commit();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );
  reactExports.useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [editing]);
  return {
    editing,
    editValue,
    displayValue,
    inputRef,
    setEditValue,
    beginEdit,
    commit,
    cancel,
    onKeyDown,
  };
}
function ImageIcon$2() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.4248 7.70801C8.23163 7.38605 7.76543 7.38392 7.56934 7.7041L2.3418 16.2393C2.13811 16.5724 2.378 17 2.76855 17H17.3525C17.7602 17 17.996 16.5386 17.7578 16.208L14.4053 11.5625C14.2057 11.286 13.7943 11.286 13.5947 11.5625L12.0342 13.7236L8.4248 7.70801ZM14.5 4C13.6716 4 13 4.67157 13 5.5C13 6.32843 13.6716 7 14.5 7C15.3284 7 16 6.32843 16 5.5C16 4.67157 15.3284 4 14.5 4Z" />
    </CompositedSvg>
  );
}
function VideoIcon$2() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.53125 5.96094C7.86529 5.5432 7.00008 6.02151 7 6.80762V13.1992C7 13.9839 7.86223 14.4625 8.52832 14.0479L13.6416 10.8643C14.2689 10.4736 14.2706 9.56066 13.6445 9.16797L8.53125 5.96094Z" />
    </CompositedSvg>
  );
}
function AudioIcon$1() {
  return (
    <CompositedSvg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.3335 3.9999C1.33355 2.89537 2.22897 2 3.3335 2H12.6663C13.7709 2 14.6663 2.89543 14.6663 4V12C14.6663 13.1046 13.7709 14 12.6663 14H3.3331C2.2285 14 1.33305 13.1045 1.33311 11.9999L1.3335 3.9999ZM7.99967 8.114C7.59942 7.97249 7.16451 7.96201 6.75791 8.08409C6.3513 8.20616 5.99409 8.45446 5.73797 8.79303C5.48185 9.13161 5.34011 9.5429 5.33327 9.96738C5.32642 10.3919 5.45483 10.8075 5.6999 11.1542C5.94498 11.5008 6.294 11.7605 6.69646 11.8956C7.09892 12.0307 7.53394 12.0343 7.93855 11.9057C8.34316 11.7772 8.69637 11.5233 8.94706 11.1806C9.19776 10.838 9.33293 10.4245 9.33301 10V5.33267H11.333V4H7.99967V8.114Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function TextIcon$1() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM4 16.2646H12V14.4648H4V16.2646ZM4 12.6885H16V10.8887H4V12.6885ZM4 9.1123H16V7.31152H4V9.1123ZM4 5.53613H16V3.73535H4V5.53613Z" />
    </CompositedSvg>
  );
}
function TableIcon$1() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.4 0H2.6C1.164 0 0 1.164 0 2.6v14.8C0 18.836 1.164 20 2.6 20h14.8c1.436 0 2.6-1.164 2.6-2.6V2.6C20 1.164 18.836 0 17.4 0zM2 7h5v3H2V7zm0 5h5v3H2v-3zm7 3v-3h9v3H9zm9-5H9V7h9v3zM2 5V2h16v3H2z" />
    </CompositedSvg>
  );
}
function FileIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 12v4" />
      <path d="M16 6a2 2 0 0 1 1.414.586l4 4A2 2 0 0 1 22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 .586-1.414l4-4A2 2 0 0 1 8 6z" />
      <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 14h20" />
      <path d="M8 12v4" />
    </CompositedSvg>
  );
}
const ICON_MAP = {
  image: ImageIcon$2,
  video: VideoIcon$2,
  audio: AudioIcon$1,
  text: TextIcon$1,
  table: TableIcon$1,
  file: FileIcon,
};
function NodeHeaderInner({
  nodeType,
  name: name2,
  icon,
  tagIds,
  maxWidth,
  selected: selected2,
  onRename,
  preserveExtension: preserveExtension2 = true,
}) {
  const IconComponent = ICON_MAP[nodeType] ?? TextIcon$1;
  const tagColors = useNodeTagColors(tagIds);
  const hasColorTag = tagColors.length > 0;
  const hasAssignedTag = (tagIds?.length ?? 0) > 0;
  const rename = useInlineRename({
    currentValue: name2,
    onCommit: onRename,
    preserveExtension: preserveExtension2,
  });
  const nodeId = useNodeId();
  const { onNodeTagRequest, onNodeTagRemoveRequest } = useCanvasBridge();
  useRenameRequest(nodeId, rename.beginEdit, !!onRename);
  const handleTagClick = reactExports.useCallback(
    (_tag, anchor) => {
      if (!nodeId || !onNodeTagRequest) return;
      onNodeTagRequest(nodeId, anchor);
    },
    [nodeId, onNodeTagRequest],
  );
  const handleTagRemove = reactExports.useCallback(
    (tag) => {
      if (!nodeId || !tag.id || !onNodeTagRemoveRequest) return;
      void onNodeTagRemoveRequest(nodeId, tag.id);
    },
    [nodeId, onNodeTagRemoveRequest],
  );
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      if (!onRename) return;
      e2.stopPropagation();
      rename.beginEdit();
    },
    [onRename, rename.beginEdit],
  );
  const nameColor = selected2 ? "text-[var(--fg-default)]" : "text-[var(--fg-muted)]";
  const iconColor = selected2 ? "text-[var(--fg-default)]" : "text-[var(--fg-muted)]";
  return (
    <div
      className="node-floating-ui absolute left-0 origin-bottom-left"
      style={{
        top: -28,
        zIndex: 10,
      }}
      data-action-ui-id="canvas.node-header"
      data-node-type={nodeType}
      data-has-color-tag={hasColorTag ? "true" : void 0}
    >
      <div
        className="relative min-w-0"
        style={{
          width: maxWidth,
          height: NODE_TAG_HEADER_HEIGHT,
        }}
      >
        <div
          className="flex min-w-0 items-center gap-1"
          style={{
            boxSizing: "border-box",
            height: NODE_TAG_HEADER_HEIGHT,
            maxWidth,
            paddingRight: selected2 && !hasAssignedTag ? 36 : 0,
          }}
        >
          <span className={`flex shrink-0 items-center ${iconColor}`} data-node-header-title="">
            {icon ?? <IconComponent />}
          </span>
          {rename.editing ? (
            <input
              ref={rename.inputRef}
              data-node-header-title=""
              className="nodrag min-w-0 flex-1 border-[var(--canvas-node-border,#e3e3e3)] bg-transparent text-sm text-[var(--fg-default,#141414)] outline-none [border-bottom-width:var(--control-border-width)] focus:border-[var(--canvas-node-border-selected,#141414)]"
              style={{
                width: "100%",
              }}
              value={rename.editValue}
              onChange={(e2) => rename.setEditValue(e2.target.value)}
              onBlur={rename.commit}
              onKeyDown={rename.onKeyDown}
              onMouseDown={(e2) => e2.stopPropagation()}
              onClick={(e2) => e2.stopPropagation()}
              onDoubleClick={(e2) => e2.stopPropagation()}
            />
          ) : (
            // biome-ignore lint/a11y/noStaticElementInteractions: double-click rename trigger
            <span
              className={`min-w-0 flex-1 text-sm ${nameColor}`}
              data-node-header-title=""
              title={rename.displayValue}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onDoubleClick={handleDoubleClick2}
            >
              {rename.displayValue}
            </span>
          )}
          {hasColorTag ? (
            <div
              className="ml-auto w-max shrink-0 pl-2"
              data-action-ui-id="canvas.node-tag-label-row"
            >
              <NodeTagLabels
                tags={tagColors}
                onTagClick={onNodeTagRequest ? handleTagClick : void 0}
                onTagRemove={onNodeTagRemoveRequest ? handleTagRemove : void 0}
              />
            </div>
          ) : null}
        </div>
        <NodeQuickTagTrigger
          visible={selected2 && !hasAssignedTag}
          className="absolute -top-1 right-0"
          counterScaleOrigin="right bottom"
        />
      </div>
    </div>
  );
}
export const NodeHeader = reactExports.memo(NodeHeaderInner);
export function CanvasModalGuardProvider({ children: children2 }) {
  const [count2, setCount] = reactExports.useState(0);
  const push2 = reactExports.useCallback(() => setCount((c3) => c3 + 1), []);
  const pop = reactExports.useCallback(() => setCount((c3) => Math.max(0, c3 - 1)), []);
  const value = reactExports.useMemo(
    () => ({
      count: count2,
      push: push2,
      pop,
    }),
    [count2, push2, pop],
  );
  return (
    <CanvasModalGuardContext.Provider value={value}>{children2}</CanvasModalGuardContext.Provider>
  );
}
export function useSuspendCanvasInteractions(active2) {
  const ctx = reactExports.useContext(CanvasModalGuardContext);
  const push2 = ctx?.push;
  const pop = ctx?.pop;
  reactExports.useEffect(() => {
    if (!active2 || !push2 || !pop) return;
    push2();
    return () => pop();
  }, [active2, push2, pop]);
}
export function RecentlyAddedStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    RecentlyAddedStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
