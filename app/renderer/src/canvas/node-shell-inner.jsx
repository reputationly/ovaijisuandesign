// node-shell-inner.jsx
import { cva } from "class-variance-authority";
import { Button as BaseButton } from "@base-ui/react/button";
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { Loader2Icon, X$7 as XIcon } from "../media-editing/lucide-icon-wraps.js";
import { useStore } from "zustand";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import {
  defaultRecentlyAddedStore,
  getDerivedNodePosition,
  useCanvasTagFilterActive,
  useIsCanvasModalOpen,
  useRecentlyAddedApi,
} from "../infra/create-recently-added-store.js";
import { useNodeTagColors } from "./use-inline-rename.jsx";
import { RetryIcon } from "./fullscreen-icon.jsx";
const useRecentlyAddedStore = (selector) =>
  useStore(useRecentlyAddedApi(), selector);
useRecentlyAddedStore.getState = defaultRecentlyAddedStore.getState;
useRecentlyAddedStore.setState = defaultRecentlyAddedStore.setState;
useRecentlyAddedStore.subscribe = defaultRecentlyAddedStore.subscribe;
function useIsRecentlyAdded(nodeId) {
  return useRecentlyAddedStore((storeState) => Boolean(nodeId && storeState.ids.has(nodeId)));
}
function UploadIcon({ size = 16 }) {
  return (
    <CompositedSvg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 10.5V2M8 2L4.5 5.5M8 2L11.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 10.5V12.5C2.5 13.0523 2.94772 13.5 3.5 13.5H12.5C13.0523 13.5 13.5 13.0523 13.5 12.5V10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function NodeShellInner({
  id,
  tagIds,
  width,
  children,
  className,
  generating,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  dataActionUiId,
  dataState,
  dataAspectRatio,
}) {
  const isModalOpen = useIsCanvasModalOpen();
  const tagFilterActive = useCanvasTagFilterActive();
  const matchesTagFilter = useNodeTagColors(tagIds).some((tag) => tag.active);
  const dimmedByTagFilter = tagFilterActive && !matchesTagFilter;
  const isNewlyAdded = useIsRecentlyAdded(id);
  const recentlyAddedApi = useRecentlyAddedApi();
  const handleDoubleClick = reactExports.useCallback(
    (doubleClickEvent) => {
      if (isModalOpen) return;
      onDoubleClick?.(doubleClickEvent);
    },
    [isModalOpen, onDoubleClick],
  );
  const handleClick = reactExports.useCallback(
    (clickEvent) => {
      if (id && isNewlyAdded) recentlyAddedApi.getState().remove(id);
      onClick?.(clickEvent);
    },
    [id, isNewlyAdded, recentlyAddedApi, onClick],
  );
  const mergedClassName = `canvas-node-shell group cursor-default [contain:layout_style] relative overflow-visible${isNewlyAdded ? " is-newly-added" : ""}${generating ? " is-generating" : ""}${dimmedByTagFilter ? " opacity-25 transition-opacity duration-150" : ""}${className ? ` ${className}` : ""}`;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ReactFlow node
    // biome-ignore lint/a11y/useKeyWithClickEvents: canvas node click selection — keyboard nav handled by ReactFlow at node level
    <div
      className={mergedClassName}
      style={{
        width,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick || isNewlyAdded ? handleClick : void 0}
      onDoubleClick={onDoubleClick ? handleDoubleClick : void 0}
      data-action-ui-id={dataActionUiId}
      data-state={dataState}
      data-aspect-ratio={dataAspectRatio}
      data-tag-filter-match={
        tagFilterActive ? String(matchesTagFilter) : void 0
      }
    >
      {children}
    </div>
  );
}
export const NodeShell = reactExports.memo(NodeShellInner);
export function NodeFrameStroke() {
  return <span className="canvas-node-stroke" aria-hidden="true" />;
}
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    compoundVariants: [
      {
        size: ["default", "xs", "sm", "lg"],
        className: "active:not-aria-[haspopup]:translate-y-px",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
export function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <BaseButton
      data-slot="button"
      disabled={disabled || loading}
      className={cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    >
      {loading && <Loader2Icon className="animate-spin" />}
      {children}
    </BaseButton>
  );
}
export function NodeEmptyState({
  icon,
  guidance,
  suggestions = [],
  actionUiId,
}) {
  return (
    <div
      data-action-ui-id={actionUiId}
      className="canvas-node-empty-state flex h-full min-h-0 w-full flex-col gap-2"
    >
      <div
        data-role="empty-placeholder"
        className="flex min-h-0 flex-1 items-center justify-center text-[var(--canvas-empty-placeholder-fg)]"
      >
        {icon}
      </div>
      {suggestions.length > 0 && (
        <div data-role="empty-suggestions" className="min-w-0 shrink-0">
          {guidance && (
            <p className="mb-2 select-none text-left text-[14px] font-light leading-5 text-[var(--canvas-empty-guidance-fg)]">
              {guidance}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                type="button"
                variant="ghost"
                data-action-ui-id={suggestion.id}
                onClick={suggestion.onSelect}
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                disabled={suggestion.disabled}
                className="canvas-node-suggestion nodrag h-8 w-full min-w-0 cursor-pointer justify-start gap-2 rounded-[8px] border-0 bg-[var(--canvas-empty-action-bg)] px-3 text-left text-[14px] font-light leading-none text-[var(--canvas-empty-action-fg)] transition-colors duration-100 hover:bg-[var(--canvas-empty-action-bg-hover)] active:not-aria-[haspopup]:translate-y-0 disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className="canvas-node-suggestion-icon flex size-4 shrink-0 items-center justify-center text-[var(--canvas-empty-action-icon-fg)]"
                >
                  {suggestion.icon}
                </span>
                <span className="min-w-0 truncate">{suggestion.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function PlaceholderUploadButton({
  icon,
  children,
  label,
  onUpload,
}) {
  const { t: translate } = useTranslation();
  const [nodeShell, setNodeShell] = reactExports.useState(null);
  const handlePlaceholderRef = reactExports.useCallback((element) => {
    setNodeShell(element?.closest(".canvas-node-shell") ?? null);
  }, []);
  const handleClick = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      onUpload(clickEvent.currentTarget);
    },
    [onUpload],
  );
  const button = (
    <button
      type="button"
      data-action-ui-id="canvas.placeholder-upload"
      onClick={handleClick}
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onDoubleClick={(doubleClickEvent) => doubleClickEvent.stopPropagation()}
      className="nodrag nopan nowheel absolute bottom-[calc(100%+1.5rem)] left-1/2 z-20 inline-flex h-8 -translate-x-1/2 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--canvas-controls-border)_60%,transparent)] bg-[var(--canvas-controls-bg)] px-3 text-[13px] font-normal text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
      title={translate("canvas.upload")}
    >
      <UploadIcon size={16} />
      <span>{label}</span>
    </button>
  );
  return (
    <>
      <div
        ref={handlePlaceholderRef}
        className="flex h-full w-full items-center justify-center"
      >
        {children ?? <NodeEmptyState icon={icon} />}
      </div>
      {nodeShell ? reactDomExports.createPortal(button, nodeShell) : null}
    </>
  );
}
function stopEvent(event) {
  event.stopPropagation();
}
const QUEUE_ACTION_BUTTON_CLASS =
  "nodrag nopan inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/10 bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";
const QUEUE_ACTION_ICON_CLASS = "size-3.5 shrink-0";
export function normalizeEstimatedWaitSeconds(seconds, legacyMinutes) {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }
  if (
    typeof legacyMinutes === "number" &&
    Number.isFinite(legacyMinutes) &&
    legacyMinutes > 0
  ) {
    return Math.ceil(legacyMinutes * 60);
  }
  return void 0;
}
function resolveGenerationWaitEstimate(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0)
    return void 0;
  const displaySeconds = Math.ceil(seconds);
  return displaySeconds < 60
    ? {
        unit: "seconds",
        count: displaySeconds,
      }
    : {
        unit: "minutes",
        count: Math.ceil(displaySeconds / 60),
      };
}
export function GenerationWaitEstimate({ seconds, actionUiId }) {
  const { t: translate } = useTranslation();
  const estimate = resolveGenerationWaitEstimate(seconds);
  if (!estimate) return null;
  const label =
    estimate.unit === "seconds"
      ? translate("canvas.estimatedRemainingWaitSeconds", {
          count: estimate.count,
        })
      : translate("canvas.estimatedRemainingWaitMinutes", {
          count: estimate.count,
        });
  return (
    <span
      className="nodrag nopan max-w-full whitespace-normal break-words px-2 text-center text-xs font-medium leading-5 text-muted-foreground"
      data-action-ui-id={`${actionUiId}.wait-estimate`}
      onPointerDown={stopEvent}
    >
      {label}
    </span>
  );
}
export function QueueGenerationControl({
  state,
  onCancel,
  onResume,
  cancelling = false,
  resuming = false,
  canResume = true,
  actionUiId,
}) {
  const { t: translate } = useTranslation();
  const isQueued = state === "queued";
  const disabled = isQueued ? cancelling : resuming || !canResume;
  const handleClick = (event) => {
    event.stopPropagation();
    if (disabled) return;
    if (isQueued) onCancel?.();
    else onResume?.();
  };
  return (
    <div
      className="nodrag nopan inline-flex max-w-full flex-col items-center gap-2 text-center"
      role="status"
      aria-live="polite"
      data-action-ui-id={`${actionUiId}.status`}
      onPointerDown={stopEvent}
    >
      <span className="max-w-full truncate text-xs font-medium leading-5 text-muted-foreground">
        {isQueued ? translate("canvas.pending") : translate("canvas.queuePaused")}
      </span>
      {(isQueued ? onCancel : onResume) ? (
        <button
          type="button"
          className={QUEUE_ACTION_BUTTON_CLASS}
          disabled={disabled}
          aria-busy={!isQueued && resuming ? true : void 0}
          onClick={handleClick}
          data-action-ui-id={`${actionUiId}.${isQueued ? "cancel" : "resume"}`}
        >
          {isQueued ? (
            <XIcon
              size={14}
              strokeWidth={1.5}
              className={QUEUE_ACTION_ICON_CLASS}
            />
          ) : (
            <RetryIcon
              size={14}
              strokeWidth={1.5}
              className={`${QUEUE_ACTION_ICON_CLASS}${resuming ? " animate-spin" : ""}`}
            />
          )}
          <span>
            {isQueued ? translate("canvas.queueCancel") : translate("canvas.queueResume")}
          </span>
        </button>
      ) : null}
    </div>
  );
}
export function useMediaFallbackRetry(options) {
  const retries = 2;
  const delayMs = 2e3;
  const [failed, setFailed] = reactExports.useState(false);
  const [attempt, setAttempt] = reactExports.useState(0);
  const timerRef = reactExports.useRef(null);
  const clearTimer = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearTimer, [clearTimer]);
  const onError = reactExports.useCallback(() => {
    if (attempt >= retries) {
      setFailed(true);
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(
      () => {
        timerRef.current = null;
        setAttempt(attempt + 1);
      },
      delayMs * (0.5 + Math.random()),
    );
  }, [attempt, retries, delayMs, clearTimer]);
  const reset = reactExports.useCallback(() => {
    clearTimer();
    setFailed(false);
    setAttempt(0);
  }, [clearTimer]);
  return {
    failed,
    attempt,
    onError,
    reset,
  };
}
export function getAdjacentNodePosition(reactFlow, nodeId, fallbackSize) {
  return getDerivedNodePosition(
    reactFlow,
    nodeId,
    reactFlow.getEdges(),
    fallbackSize,
  );
}
function resolveAddToChatPath(metaPath, fallbackPath) {
  return metaPath || fallbackPath;
}
export function useAddToChat(nodeId, meta, onAddToChat, fallbackPath) {
  return reactExports.useCallback(() => {
    const filePath = resolveAddToChatPath(meta?.path, fallbackPath);
    if (!filePath || !onAddToChat) return;
    const filename = filePath.split("/").pop() ?? filePath;
    onAddToChat(filePath, filename, nodeId);
  }, [meta?.path, onAddToChat, nodeId, fallbackPath]);
}
