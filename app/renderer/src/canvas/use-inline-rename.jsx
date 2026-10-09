// use-inline-rename.jsx
import {
  CompositedSvg,
  reactExports,
  useNodeId,
  useStoreApi,
  useTranslation,
} from "../vendor.js";
import {
  CanvasModalGuardContext,
  CanvasTagColorsContext,
  RecentlyAddedStoreContext,
  renameRequestStore,
  useRegisterZoomCounter,
} from "../infra/create-recently-added-store.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";

export function useNodeTagColors(tagIds) {
  const resolve = reactExports.useContext(CanvasTagColorsContext);
  return resolve(tagIds);
}

export function requestNodeRename(nodeId) {
  renameRequestStore.getState().requestRename(nodeId);
}

export const CanvasLabelIcon = reactExports.forwardRef(
  function CanvasLabelIcon2(
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
  },
);

CanvasLabelIcon.displayName = "CanvasLabelIcon";

const NODE_QUICK_TAG_SCALE =
  "scale(clamp(1, calc(1 / var(--canvas-zoom, 1)), calc(1 / 0.7)))";

const NODE_QUICK_TAG_BORDER_WIDTH =
  "min(calc(1px / var(--canvas-zoom, 1)), max(1px, calc(0.7px / var(--canvas-zoom, 1))))";

export function NodeQuickTagTrigger({
  visible,
  className,
  counterScaleOrigin = "center",
}) {
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
        <CanvasLabelIcon
          className="size-5 scale-80"
          strokeWidth={1.25}
          aria-hidden={true}
        />
      </button>
    </Tooltip$1>
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

export function CanvasModalGuardProvider({ children: children2 }) {
  const [count2, setCount] = reactExports.useState(0);
  const push2 = reactExports.useCallback(() => setCount((c3) => c3 + 1), []);
  const pop = reactExports.useCallback(
    () => setCount((c3) => Math.max(0, c3 - 1)),
    [],
  );
  const value = reactExports.useMemo(
    () => ({
      count: count2,
      push: push2,
      pop,
    }),
    [count2, push2, pop],
  );
  return (
    <CanvasModalGuardContext.Provider value={value}>
      {children2}
    </CanvasModalGuardContext.Provider>
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
