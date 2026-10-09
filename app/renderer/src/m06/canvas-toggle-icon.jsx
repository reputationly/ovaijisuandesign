// canvas-toggle-icon.jsx
import { jsxRuntimeExports, useTranslation, reactExports, reactDomExports, CompositedSvg, EyeOff, Eye, ChevronUp, ChevronDown, MonochromeIcon, ActionListItem, ActionListPanel, ActionListSeparator } from "../vendor.js";
import { Dialog$1 } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { CANVAS_COMMAND_IDS, readCanvasPreference, writeCanvasPreference } from "../m15/node-tag-rings-canvas.jsx";
import { Trash2, CloudOff, CircleHelp } from "../m15/parse-item.jsx";
import { getClipboard } from "../m15/remap-clipboard.js";
import {
  resolveCanvasPlatform,
  resolveCanvasShortcut$1,
  DropdownMenuItem$1,
  DropdownMenuSeparator$1,
} from "../m01/use-lightbox-media-actions.jsx";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogDescription$1,
  DialogFooter$1,
} from "../m02/thumb-chip.jsx";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import { RetryIcon$1 } from "../m01/generating-media-area.jsx";
import {
  CANVAS_STICKER_PICKER_ASSETS,
  CANVAS_EMOJI_STICKERS,
} from "../m04/ready-sub-video-card.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { useClampedMenuPosition } from "../m05/table-context-menu.jsx";
import { SegmentedSwitch$1 } from "../m01/params-popup.jsx";
import { Checkbox } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function CanvasCommandPanelContent({
  activeCommand,
  stickerCount,
  allStickersHidden,
  emojiPickerOpen,
  stickerAssetId,
  stickerEmoji,
  onToggleStickerVisibility,
  onClearStickers,
  onEmojiPickerOpenChange,
  onStickerAssetChange,
  onStickerEmojiChange,
}) {
  const { t: t2 } = useTranslation();
  if (!activeCommand) return null;
  if (activeCommand === CANVAS_COMMAND_IDS.comments) {
    return (
      <p className="text-[11px] leading-5 text-[var(--canvas-controls-text-muted)]">
        {t2("canvas.toolbar.commentsHint")}
      </p>
    );
  }
  if (activeCommand === CANVAS_COMMAND_IDS.sticker) {
    const stickerOptionClass = (active2) =>
      `flex h-10 min-w-0 items-center justify-center rounded-md border p-1 transition-colors [border-width:var(--divider-width)] ${active2 ? "border-[var(--canvas-controls-text)] bg-transparent text-[var(--canvas-controls-text)]" : "border-transparent text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`;
    const stickerSummaryRow = (
      <div className="flex items-center gap-1 text-[10px] text-[var(--canvas-controls-text-muted)]">
        <span className="shrink-0 px-1">
          {t2("canvas.toolbar.stickerCount", {
            count: stickerCount,
          })}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--canvas-controls-border)] px-2 text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors [border-width:var(--divider-width)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40"
            onClick={onToggleStickerVisibility}
            disabled={stickerCount === 0}
            aria-label={
              allStickersHidden
                ? t2("canvas.toolbar.showStickers")
                : t2("canvas.toolbar.hideStickers")
            }
          >
            {allStickersHidden ? (
              <EyeOff size={12} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Eye size={12} strokeWidth={1.5} aria-hidden="true" />
            )}
            {allStickersHidden
              ? t2("canvas.toolbar.showStickers")
              : t2("canvas.toolbar.hideStickers")}
          </button>
          <button
            type="button"
            className="flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--canvas-controls-border)] px-2 text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors [border-width:var(--divider-width)] hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-default disabled:opacity-40"
            onClick={onClearStickers}
            disabled={stickerCount === 0}
            aria-label={t2("canvas.toolbar.clearStickers", "Clear")}
          >
            <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
            {t2("canvas.toolbar.clearStickers", "Clear")}
          </button>
        </div>
      </div>
    );
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 pt-2">
          {CANVAS_STICKER_PICKER_ASSETS.map((asset) => (
            <button
              key={asset.id}
              type="button"
              data-action-ui-id={`canvas.sticker-picker-${asset.id}`}
              className={`${stickerOptionClass(stickerAssetId === asset.id)} flex-1`}
              aria-label={t2(asset.labelKey)}
              aria-pressed={stickerAssetId === asset.id}
              title={t2(asset.labelKey)}
              onClick={() => {
                onStickerAssetChange(asset.id);
              }}
            >
              <img src={asset.src} alt="" draggable={false} className="size-6 object-contain" />
            </button>
          ))}
          <button
            type="button"
            data-action-ui-id="canvas.sticker-picker-more"
            className={`${stickerOptionClass(false)} flex-1`}
            aria-expanded={emojiPickerOpen}
            aria-label={
              emojiPickerOpen
                ? t2("canvas.sticker.collapse", "收起贴纸")
                : t2("canvas.sticker.expand", "展开更多贴纸")
            }
            title={
              emojiPickerOpen
                ? t2("canvas.sticker.collapse", "收起贴纸")
                : t2("canvas.sticker.expand", "展开更多贴纸")
            }
            onClick={() => onEmojiPickerOpenChange(!emojiPickerOpen)}
          >
            {emojiPickerOpen ? (
              <ChevronUp size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
        {emojiPickerOpen && (
          <div className="flex items-center gap-1 pt-2 opacity-100">
            {CANVAS_EMOJI_STICKERS.map((emoji2, index2) => (
              <button
                key={emoji2}
                type="button"
                data-action-ui-id={`canvas.sticker-picker-emoji-${index2}`}
                className={`${stickerOptionClass(!stickerAssetId && stickerEmoji === emoji2)} flex-1 opacity-100`}
                aria-label={emoji2}
                aria-pressed={!stickerAssetId && stickerEmoji === emoji2}
                onClick={() => {
                  onStickerAssetChange("");
                  onStickerEmojiChange(emoji2);
                }}
              >
                <span
                  className="text-xl leading-none text-[var(--canvas-controls-text)]"
                  aria-hidden="true"
                >
                  {emoji2}
                </span>
              </button>
            ))}
          </div>
        )}
        {stickerSummaryRow}
      </div>
    );
  }
  if (activeCommand === CANVAS_COMMAND_IDS.assets) {
    return (
      <p className="text-[11px] leading-5 text-[var(--canvas-controls-text-muted)]">
        {t2("canvas.toolbar.assetsHint")}
      </p>
    );
  }
  return null;
}
export function CanvasConfirmationDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog$1 open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent$1
        className="gap-4 sm:max-w-[420px]"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader$1>
          <DialogTitle$1>{title}</DialogTitle$1>
          <DialogDescription$1>{description}</DialogDescription$1>
        </DialogHeader$1>
        <DialogFooter$1>
          <Button$2 variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button$2>
          <Button$2 variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
export function CanvasHighBlastDeleteDialog({ instance: instance2 }) {
  const { t: t2 } = useTranslation();
  const [pendingRequest, setPendingRequest] = reactExports.useState(null);
  const pendingRequestRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    instance2.setHighBlastDeleteConfirmer((request) => {
      pendingRequestRef.current?.cancel();
      pendingRequestRef.current = request;
      setPendingRequest(request);
    });
    return () => {
      instance2.setHighBlastDeleteConfirmer(void 0);
      pendingRequestRef.current?.cancel();
      pendingRequestRef.current = null;
    };
  }, [instance2]);
  const handleCancel = reactExports.useCallback(() => {
    const request = pendingRequestRef.current;
    pendingRequestRef.current = null;
    setPendingRequest(null);
    request?.cancel();
  }, []);
  const handleConfirm = reactExports.useCallback(() => {
    const request = pendingRequestRef.current;
    pendingRequestRef.current = null;
    setPendingRequest(null);
    request?.confirm();
  }, []);
  return (
    <CanvasConfirmationDialog
      open={pendingRequest !== null}
      title={t2("canvas.persistence.highBlastDeleteTitle", "确认删除大量画布内容")}
      description={t2("canvas.persistence.highBlastDeleteConfirm", {
        defaultValue:
          "此操作将从画布移除 {{nodeCount}} 个节点和 {{edgeCount}} 条连线。为防止误清空，请确认是否继续。",
        nodeCount: pendingRequest?.removedNodeCount ?? 0,
        edgeCount: pendingRequest?.removedEdgeCount ?? 0,
      })}
      cancelLabel={t2("common.cancel", "取消")}
      confirmLabel={t2("canvas.persistence.highBlastDeleteAction", "确认删除")}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  );
}
const INITIAL_DESCRIPTION_KEYS = {
  unavailable: "canvas.loadError.unavailableDescription",
  access: "canvas.loadError.accessDescription",
  "invalid-response": "canvas.loadError.invalidResponseDescription",
  unknown: "canvas.loadError.unknownDescription",
};
export function CanvasLoadError({ failure, retrying, onRetry }) {
  const { t: t2 } = useTranslation();
  const retryButton = (
    <Button$2
      type="button"
      size="sm"
      variant={failure.phase === "initial" ? "default" : "outline"}
      loading={retrying}
      disabled={retrying}
      onClick={onRetry}
      data-action-ui-id="canvas.load-error-retry"
      className="rounded-md"
    >
      {!retrying && <RetryIcon$1 size={16} />}
      {retrying ? t2("canvas.loadError.retrying") : t2("canvas.loadError.retry")}
    </Button$2>
  );
  if (failure.phase === "refresh") {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center">
        <div
          data-action-ui-id="canvas.load-error-banner"
          role="status"
          aria-live="polite"
          aria-busy={retrying}
          className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-lg border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-sm backdrop-blur-sm"
        >
          <MonochromeIcon tone="muted">
            <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          </MonochromeIcon>
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {retrying
                ? t2("canvas.loadError.refreshRetryingTitle")
                : t2("canvas.loadError.refreshTitle")}
            </span>{" "}
            {t2("canvas.loadError.refreshDescription")}
          </p>
          {retryButton}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <section
        data-action-ui-id="canvas.load-error-card"
        role="alert"
        aria-busy={retrying}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MonochromeIcon tone="muted">
              <CloudOff className="size-4" aria-hidden="true" />
            </MonochromeIcon>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-foreground">
              {retrying
                ? t2("canvas.loadError.initialRetryingTitle")
                : t2("canvas.loadError.initialTitle")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {retrying
                ? t2("canvas.loadError.retryingDescription")
                : t2(INITIAL_DESCRIPTION_KEYS[failure.kind])}
            </p>
            <div className="mt-4">{retryButton}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
export function useDismissMenu(menuRef, onClose, onEscape, trigger, enabled = true) {
  const escapeHandlerRef = reactExports.useRef(onEscape);
  escapeHandlerRef.current = onEscape;
  const captureEscape = !!onEscape;
  reactExports.useEffect(() => {
    if (!enabled) return;
    const handleMouseDown2 = (e2) => {
      if (trigger?.contains(e2.target)) return;
      if (menuRef.current && !menuRef.current.contains(e2.target)) {
        onClose();
      }
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key !== "Escape") return;
      if (escapeHandlerRef.current?.()) {
        e2.preventDefault();
        e2.stopImmediatePropagation();
        return;
      }
      onClose();
    };
    const timer2 = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown2);
      document.addEventListener("keydown", handleKeyDown2, captureEscape);
    }, 0);
    return () => {
      clearTimeout(timer2);
      document.removeEventListener("mousedown", handleMouseDown2);
      document.removeEventListener("keydown", handleKeyDown2, captureEscape);
    };
  }, [menuRef, onClose, captureEscape, trigger, enabled]);
}
function PaneMenuItem({ label, shortcut, disabled: disabled2, testId, dataActionUiId, onClick }) {
  const isMac2 = resolveCanvasPlatform() === "mac";
  return (
    <ActionListItem
      data-testid={testId}
      data-action-ui-id={dataActionUiId}
      disabled={disabled2}
      className="justify-between"
      data-disabled={disabled2 || void 0}
      onClick={() => {
        if (!disabled2) onClick();
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          className="flex items-center gap-0.5"
          style={{
            color: "var(--canvas-controls-text)",
            opacity: 0.5,
          }}
        >
          {shortcut.map((token2, tokenIndex) => (
            <span key={token2} className="inline-flex items-center">
              {!isMac2 && tokenIndex > 0 && (
                <span aria-hidden="true" className="mr-0.5 text-[10px] leading-none">
                  +
                </span>
              )}
              <span
                className={
                  token2 === "⌘"
                    ? "text-[16px] leading-none font-normal"
                    : token2 === "⇧" || token2 === "Shift"
                      ? "text-[15px] leading-none font-medium"
                      : token2 === "Ctrl" || token2 === "Alt"
                        ? "text-[14px] leading-none font-normal"
                        : "text-[11px] leading-none font-medium"
                }
              >
                {token2}
              </span>
            </span>
          ))}
        </span>
      )}
    </ActionListItem>
  );
}
export function CanvasPaneContextMenu({
  motionProps,
  position: position2,
  canUndo,
  canRedo,
  onClose,
  onUpload,
  onAddNode,
  onUndo,
  onRedo,
  onPaste,
}) {
  const { t: t2 } = useTranslation();
  const hasClipboard = getClipboard() !== null;
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position: position2,
    estimatedWidth: 240,
    estimatedHeight: 300,
  });
  useDismissMenu(menuRef, onClose, void 0, void 0, !motionProps?.inert);
  const handleAction = reactExports.useCallback(
    (action) => {
      action();
      onClose();
    },
    [onClose],
  );
  const menu = (
    <ActionListPanel
      {...motionProps}
      ref={(element2) => {
        menuRef.current = element2;
        if (motionProps) motionProps.ref.current = element2;
      }}
      data-testid="canvas-pane-context-menu-container"
      className="dp-motion-quick-zoom fixed w-[240px]"
      style={{
        left: clampedPosition.x,
        top: clampedPosition.y,
        zIndex: 50,
        transformOrigin: `${position2.x - clampedPosition.x}px ${position2.y - clampedPosition.y}px`,
      }}
    >
      <PaneMenuItem
        label={t2("canvas.upload")}
        testId="canvas-handle-menu-upload-item"
        dataActionUiId="canvas.pane-menu-upload"
        onClick={() => handleAction(onUpload)}
      />
      <PaneMenuItem
        label={t2("canvas.addNode")}
        testId="canvas-pane-context-menu-new-block-item"
        dataActionUiId="canvas.pane-menu-add-block"
        onClick={() => handleAction(onAddNode)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={t2("canvas.undo")}
        shortcut={resolveCanvasShortcut$1("undo")}
        disabled={!canUndo}
        dataActionUiId="canvas.pane-menu-undo"
        onClick={() => handleAction(onUndo)}
      />
      <PaneMenuItem
        label={t2("canvas.redo")}
        shortcut={resolveCanvasShortcut$1("redo")}
        disabled={!canRedo}
        dataActionUiId="canvas.pane-menu-redo"
        onClick={() => handleAction(onRedo)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={t2("canvas.paste")}
        shortcut={resolveCanvasShortcut$1("paste")}
        disabled={!hasClipboard}
        testId="canvas-pane-context-menu-paste-item"
        dataActionUiId="canvas.pane-menu-paste"
        onClick={() => handleAction(onPaste)}
      />
    </ActionListPanel>
  );
  return typeof document === "undefined" ? menu : reactDomExports.createPortal(menu, document.body);
}
export function QuickZoomPresence({ value, elementRef, children: children2 }) {
  const [retained, setRetained] = reactExports.useState(value);
  const internalRef = reactExports.useRef(null);
  const ref = elementRef ?? internalRef;
  const open = value !== null;
  if (open && retained !== value) setRetained(value);
  reactExports.useLayoutEffect(() => {
    if (open || retained === null) return;
    let cancelled = false;
    const animations = ref.current?.getAnimations?.() ?? [];
    if (animations.length === 0) {
      setRetained(null);
      return;
    }
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!cancelled) setRetained(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, retained, ref]);
  const content2 = value ?? retained;
  return content2 === null
    ? null
    : children2(content2, {
        ref,
        "data-ending-style": open ? void 0 : "",
        inert: !open,
      });
}
const ANIMATION_MS = 250;
export function CanvasToggleIcon({ enabled, kind }) {
  const stackRef = reactExports.useRef(null);
  const cleanupTimerRef = reactExports.useRef(void 0);
  const previousRef = reactExports.useRef(enabled);
  const instanceId = `canvas-toggle-${reactExports.useId().replace(/:/g, "")}`;
  reactExports.useEffect(() => {
    const element2 = stackRef.current;
    if (!element2 || previousRef.current === enabled) return;
    previousRef.current = enabled;
    window.clearTimeout(cleanupTimerRef.current);
    element2.classList.remove("is-opening", "is-closing");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    void element2.offsetWidth;
    element2.classList.add(enabled ? "is-opening" : "is-closing");
    cleanupTimerRef.current = window.setTimeout(() => {
      element2.classList.remove("is-opening", "is-closing");
    }, ANIMATION_MS);
  }, [enabled]);
  reactExports.useEffect(() => {
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const clearAnimation = () => {
      if (!motion?.matches) return;
      window.clearTimeout(cleanupTimerRef.current);
      stackRef.current?.classList.remove("is-opening", "is-closing");
    };
    motion?.addEventListener("change", clearAnimation);
    return () => {
      window.clearTimeout(cleanupTimerRef.current);
      motion?.removeEventListener("change", clearAnimation);
    };
  }, []);
  return (
    <span
      ref={stackRef}
      className={`canvas-toggle-stack canvas-toggle-${kind}`}
      data-icon-state={enabled ? "on" : "off"}
      aria-hidden="true"
    >
      {kind === "edges" ? (
        <>
          <MonochromeIcon tone="control">
            <CompositedSvg
              viewBox="0 0 24 24"
              fill="none"
              className="canvas-toggle-icon-off"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M7.05664 15.25C8.78129 15.25 10.2332 16.4145 10.6709 18H14.8457L16.8457 20H10.6709C10.2332 21.5855 8.78129 22.75 7.05664 22.75C4.98557 22.75 3.30664 21.0711 3.30664 19C3.30664 16.9289 4.98557 15.25 7.05664 15.25ZM7.05664 17.25C6.09014 17.25 5.30664 18.0335 5.30664 19C5.30664 19.9665 6.09014 20.75 7.05664 20.75C8.0231 20.75 8.80664 19.9665 8.80664 19C8.80664 18.0335 8.0231 17.25 7.05664 17.25ZM17.5 11C20.0441 11.0001 22.0002 12.8981 22 15.5C21.9999 16.4518 21.7369 17.3087 21.2803 18.0137L19.8037 16.5371C19.9301 16.2278 20 15.8794 20 15.5C20.0001 14.0188 18.9557 13.0001 17.5 13H16.2666L14.2666 11H17.5ZM4.23047 7.38477C4.08266 7.7131 3.99996 8.08823 4 8.5C4.00019 9.9815 5.04453 10.9999 6.5 11H7.84473L9.84473 13H6.5C3.95566 12.9999 2.00025 11.1016 2 8.5C1.99992 7.51757 2.27863 6.63542 2.7627 5.91797L4.23047 7.38477ZM17.4844 1.38281C19.5552 1.38299 21.2343 3.06194 21.2344 5.13281C21.2344 7.20377 19.5553 8.88263 17.4844 8.88281C15.7118 8.88281 14.2273 7.65292 13.8359 6H9.2666L7.2666 4H13.9082C14.3885 2.48271 15.8082 1.38281 17.4844 1.38281ZM17.4844 3.38281C16.5179 3.38281 15.7345 4.1664 15.7344 5.13281C15.7344 6.09931 16.5179 6.88281 17.4844 6.88281C18.4507 6.88263 19.2344 6.0992 19.2344 5.13281C19.2343 4.16651 18.4507 3.38299 17.4844 3.38281Z"
                fill="currentColor"
                mask={`url(#${instanceId}-unline-thin-0)`}
              />
              <path
                d="M1.70639 3.59454L20.5242 22.4124"
                stroke="currentColor"
                strokeWidth="1.575"
                strokeLinecap="round"
                className="canvas-toggle-slash"
                pathLength="1"
              />
              <defs>
                <mask
                  id={`${instanceId}-unline-thin-0`}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24"
                  style={{
                    maskType: "luminance",
                  }}
                >
                  <path
                    d="M7.05664 15.25C8.78129 15.25 10.2332 16.4145 10.6709 18H14.8457L16.8457 20H10.6709C10.2332 21.5855 8.78129 22.75 7.05664 22.75C4.98557 22.75 3.30664 21.0711 3.30664 19C3.30664 16.9289 4.98557 15.25 7.05664 15.25ZM7.05664 17.25C6.09014 17.25 5.30664 18.0335 5.30664 19C5.30664 19.9665 6.09014 20.75 7.05664 20.75C8.0231 20.75 8.80664 19.9665 8.80664 19C8.80664 18.0335 8.0231 17.25 7.05664 17.25ZM17.5 11C20.0441 11.0001 22.0002 12.8981 22 15.5C21.9999 16.4518 21.7369 17.3087 21.2803 18.0137L19.8037 16.5371C19.9301 16.2278 20 15.8794 20 15.5C20.0001 14.0188 18.9557 13.0001 17.5 13H16.2666L14.2666 11H17.5ZM4.23047 7.38477C4.08266 7.7131 3.99996 8.08823 4 8.5C4.00019 9.9815 5.04453 10.9999 6.5 11H7.84473L9.84473 13H6.5C3.95566 12.9999 2.00025 11.1016 2 8.5C1.99992 7.51757 2.27863 6.63542 2.7627 5.91797L4.23047 7.38477ZM17.4844 1.38281C19.5552 1.38299 21.2343 3.06194 21.2344 5.13281C21.2344 7.20377 19.5553 8.88263 17.4844 8.88281C15.7118 8.88281 14.2273 7.65292 13.8359 6H9.2666L7.2666 4H13.9082C14.3885 2.48271 15.8082 1.38281 17.4844 1.38281ZM17.4844 3.38281C16.5179 3.38281 15.7345 4.1664 15.7344 5.13281C15.7344 6.09931 16.5179 6.88281 17.4844 6.88281C18.4507 6.88263 19.2344 6.0992 19.2344 5.13281C19.2343 4.16651 18.4507 3.38299 17.4844 3.38281Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="0.425"
                    strokeLinejoin="round"
                  />
                </mask>
              </defs>
            </CompositedSvg>
          </MonochromeIcon>
          <MonochromeIcon tone="control">
            <CompositedSvg
              viewBox="0 0 24 24"
              fill="none"
              className="canvas-toggle-icon-on"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M17.4844 1.38281C19.5552 1.38299 21.2343 3.06194 21.2344 5.13281C21.2344 7.20377 19.5553 8.88263 17.4844 8.88281C15.7118 8.88281 14.2273 7.65292 13.8359 6H6.5C5.04431 6.00007 3.99986 7.01878 4 8.5C4.00019 9.9815 5.04453 10.9999 6.5 11H17.5C20.0441 11.0001 22.0002 12.8981 22 15.5C21.9998 18.1017 20.0443 19.9999 17.5 20H10.6709C10.2332 21.5855 8.78129 22.75 7.05664 22.75C4.98557 22.75 3.30664 21.0711 3.30664 19C3.30664 16.9289 4.98557 15.25 7.05664 15.25C8.78129 15.25 10.2332 16.4145 10.6709 18H17.5C18.9555 17.9999 19.9998 16.9815 20 15.5C20.0001 14.0188 18.9557 13.0001 17.5 13H6.5C3.95566 12.9999 2.00025 11.1016 2 8.5C1.99979 5.89807 3.95587 4.00007 6.5 4H13.9082C14.3885 2.48271 15.8082 1.38281 17.4844 1.38281ZM7.05664 17.25C6.09014 17.25 5.30664 18.0335 5.30664 19C5.30664 19.9665 6.09014 20.75 7.05664 20.75C8.0231 20.75 8.80664 19.9665 8.80664 19C8.80664 18.0335 8.0231 17.25 7.05664 17.25ZM17.4844 3.38281C16.5179 3.38281 15.7345 4.1664 15.7344 5.13281C15.7344 6.09931 16.5179 6.88281 17.4844 6.88281C18.4507 6.88263 19.2344 6.0992 19.2344 5.13281C19.2343 4.16651 18.4507 3.38299 17.4844 3.38281Z"
                fill="currentColor"
                mask={`url(#${instanceId}-line-thin-0)`}
              />
              <defs>
                <mask
                  id={`${instanceId}-line-thin-0`}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24"
                  style={{
                    maskType: "luminance",
                  }}
                >
                  <path
                    d="M17.4844 1.38281C19.5552 1.38299 21.2343 3.06194 21.2344 5.13281C21.2344 7.20377 19.5553 8.88263 17.4844 8.88281C15.7118 8.88281 14.2273 7.65292 13.8359 6H6.5C5.04431 6.00007 3.99986 7.01878 4 8.5C4.00019 9.9815 5.04453 10.9999 6.5 11H17.5C20.0441 11.0001 22.0002 12.8981 22 15.5C21.9998 18.1017 20.0443 19.9999 17.5 20H10.6709C10.2332 21.5855 8.78129 22.75 7.05664 22.75C4.98557 22.75 3.30664 21.0711 3.30664 19C3.30664 16.9289 4.98557 15.25 7.05664 15.25C8.78129 15.25 10.2332 16.4145 10.6709 18H17.5C18.9555 17.9999 19.9998 16.9815 20 15.5C20.0001 14.0188 18.9557 13.0001 17.5 13H6.5C3.95566 12.9999 2.00025 11.1016 2 8.5C1.99979 5.89807 3.95587 4.00007 6.5 4H13.9082C14.3885 2.48271 15.8082 1.38281 17.4844 1.38281ZM7.05664 17.25C6.09014 17.25 5.30664 18.0335 5.30664 19C5.30664 19.9665 6.09014 20.75 7.05664 20.75C8.0231 20.75 8.80664 19.9665 8.80664 19C8.80664 18.0335 8.0231 17.25 7.05664 17.25ZM17.4844 3.38281C16.5179 3.38281 15.7345 4.1664 15.7344 5.13281C15.7344 6.09931 16.5179 6.88281 17.4844 6.88281C18.4507 6.88263 19.2344 6.0992 19.2344 5.13281C19.2343 4.16651 18.4507 3.38299 17.4844 3.38281Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="0.425"
                    strokeLinejoin="round"
                  />
                </mask>
              </defs>
            </CompositedSvg>
          </MonochromeIcon>
        </>
      ) : (
        <>
          <MonochromeIcon tone="control">
            <CompositedSvg
              viewBox="0 0 24 24"
              fill="none"
              className="canvas-toggle-icon-off"
              aria-hidden="true"
              focusable="false"
            >
              <g clipPath={`url(#${instanceId}-unsnap-clip0_59_510)`}>
                <path
                  d="M16.7822 19.6279L16.7168 19.6943C16.7131 19.6981 16.7108 19.7033 16.707 19.707C16.7033 19.7108 16.6981 19.7131 16.6943 19.7168L14.0596 22.3545H14.0586C13.6451 22.7679 13.0847 23 12.5 23C11.9153 23 11.3539 22.7679 10.9404 22.3545L8.64453 20.0586C8.23141 19.6452 7.99913 19.0844 7.99902 18.5C7.99912 17.9154 8.2312 17.3538 8.64453 16.9404L11.3691 14.2148L16.7822 19.6279ZM10.0586 18.3545C10.0203 18.3928 9.99912 18.4458 9.99902 18.5C9.99913 18.554 10.0205 18.6062 10.0586 18.6445L12.3555 20.9404H12.3545C12.3929 20.9788 12.4457 21 12.5 21C12.5543 21 12.6061 20.9788 12.6445 20.9404L14.585 18.999L11.999 16.4131L10.0586 18.3545ZM14.2158 1.00293C15.3684 1.00285 16.5103 1.22994 17.5752 1.6709C18.64 2.11188 19.6078 2.75843 20.4229 3.57324C22.0691 5.21923 22.9938 7.4523 22.9941 9.78027C22.9944 12.1083 22.0698 14.3409 20.4238 15.9873L19.9932 16.418L18.5781 15.0029L19.0098 14.5732C20.2806 13.302 20.9943 11.5778 20.9941 9.78027C20.9938 7.9828 20.2799 6.25821 19.0088 4.9873C18.3794 4.35819 17.6317 3.85902 16.8096 3.51855C15.9873 3.1781 15.1058 3.00285 14.2158 3.00293C12.4183 3.00312 10.6938 3.71716 9.42285 4.98828L8.99316 5.41797L7.5791 4.00391L8.00879 3.57422C9.65481 1.92808 11.8879 1.00317 14.2158 1.00293ZM9.78223 12.6289L9.71094 12.7012C9.70932 12.7028 9.70866 12.7054 9.70703 12.707C9.7054 12.7087 9.70281 12.7093 9.70117 12.7109L7.05859 15.3545C6.64511 15.7679 6.08469 16 5.5 16C4.91529 16 4.35391 15.7679 3.94043 15.3545L1.64453 13.0586C1.23141 12.6452 0.999128 12.0844 0.999023 11.5C0.99912 10.9154 1.2312 10.3538 1.64453 9.94043L4.36816 7.21484L9.78223 12.6289ZM3.05957 11.3545H3.05859C3.02033 11.3928 2.99912 11.4458 2.99902 11.5C2.99913 11.554 3.02055 11.6062 3.05859 11.6445L5.35547 13.9404H5.35449C5.39291 13.9788 5.44567 14 5.5 14C5.55426 14 5.60613 13.9788 5.64453 13.9404L7.58496 11.999L4.99902 9.41309L3.05957 11.3545ZM13.8809 6.99707C14.2907 6.99707 14.6966 7.07855 15.0752 7.23535C15.4537 7.39213 15.7982 7.62152 16.0879 7.91113C16.3776 8.20082 16.6078 8.54537 16.7646 8.92383C16.9214 9.30227 17.0018 9.70854 17.002 10.1182C17.002 10.528 16.9214 10.9349 16.7646 11.3135C16.6078 11.692 16.3776 12.0364 16.0879 12.3262L15.9941 12.4189L14.5801 11.0049L14.6738 10.9111C14.7778 10.8071 14.8607 10.6837 14.917 10.5479C14.9733 10.4119 15.002 10.2653 15.002 10.1182C15.0018 9.97119 14.9732 9.82525 14.917 9.68945C14.8607 9.55366 14.7777 9.43015 14.6738 9.32617C14.5698 9.22216 14.4455 9.13932 14.3096 9.08301C14.1737 9.02678 14.0279 8.99707 13.8809 8.99707C13.7337 8.99709 13.5881 9.02673 13.4521 9.08301C13.3162 9.13934 13.192 9.22211 13.0879 9.32617L12.9941 9.41895L11.5791 8.00391L11.6738 7.91113C11.9636 7.62147 12.308 7.39215 12.6865 7.23535C13.0652 7.07852 13.471 6.99709 13.8809 6.99707Z"
                  fill="currentColor"
                  mask={`url(#${instanceId}-unsnap-thin-0)`}
                />
                <path
                  d="M2.01508 3.59454L20.8329 22.4124"
                  stroke="currentColor"
                  strokeWidth="1.575"
                  strokeLinecap="round"
                  className="canvas-toggle-slash"
                  pathLength="1"
                />
              </g>
              <defs>
                <clipPath id={`${instanceId}-unsnap-clip0_59_510`}>
                  <rect width="24" height="24" fill="white" />
                </clipPath>
              </defs>
              <defs>
                <mask
                  id={`${instanceId}-unsnap-thin-0`}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24"
                  style={{
                    maskType: "luminance",
                  }}
                >
                  <path
                    d="M16.7822 19.6279L16.7168 19.6943C16.7131 19.6981 16.7108 19.7033 16.707 19.707C16.7033 19.7108 16.6981 19.7131 16.6943 19.7168L14.0596 22.3545H14.0586C13.6451 22.7679 13.0847 23 12.5 23C11.9153 23 11.3539 22.7679 10.9404 22.3545L8.64453 20.0586C8.23141 19.6452 7.99913 19.0844 7.99902 18.5C7.99912 17.9154 8.2312 17.3538 8.64453 16.9404L11.3691 14.2148L16.7822 19.6279ZM10.0586 18.3545C10.0203 18.3928 9.99912 18.4458 9.99902 18.5C9.99913 18.554 10.0205 18.6062 10.0586 18.6445L12.3555 20.9404H12.3545C12.3929 20.9788 12.4457 21 12.5 21C12.5543 21 12.6061 20.9788 12.6445 20.9404L14.585 18.999L11.999 16.4131L10.0586 18.3545ZM14.2158 1.00293C15.3684 1.00285 16.5103 1.22994 17.5752 1.6709C18.64 2.11188 19.6078 2.75843 20.4229 3.57324C22.0691 5.21923 22.9938 7.4523 22.9941 9.78027C22.9944 12.1083 22.0698 14.3409 20.4238 15.9873L19.9932 16.418L18.5781 15.0029L19.0098 14.5732C20.2806 13.302 20.9943 11.5778 20.9941 9.78027C20.9938 7.9828 20.2799 6.25821 19.0088 4.9873C18.3794 4.35819 17.6317 3.85902 16.8096 3.51855C15.9873 3.1781 15.1058 3.00285 14.2158 3.00293C12.4183 3.00312 10.6938 3.71716 9.42285 4.98828L8.99316 5.41797L7.5791 4.00391L8.00879 3.57422C9.65481 1.92808 11.8879 1.00317 14.2158 1.00293ZM9.78223 12.6289L9.71094 12.7012C9.70932 12.7028 9.70866 12.7054 9.70703 12.707C9.7054 12.7087 9.70281 12.7093 9.70117 12.7109L7.05859 15.3545C6.64511 15.7679 6.08469 16 5.5 16C4.91529 16 4.35391 15.7679 3.94043 15.3545L1.64453 13.0586C1.23141 12.6452 0.999128 12.0844 0.999023 11.5C0.99912 10.9154 1.2312 10.3538 1.64453 9.94043L4.36816 7.21484L9.78223 12.6289ZM3.05957 11.3545H3.05859C3.02033 11.3928 2.99912 11.4458 2.99902 11.5C2.99913 11.554 3.02055 11.6062 3.05859 11.6445L5.35547 13.9404H5.35449C5.39291 13.9788 5.44567 14 5.5 14C5.55426 14 5.60613 13.9788 5.64453 13.9404L7.58496 11.999L4.99902 9.41309L3.05957 11.3545ZM13.8809 6.99707C14.2907 6.99707 14.6966 7.07855 15.0752 7.23535C15.4537 7.39213 15.7982 7.62152 16.0879 7.91113C16.3776 8.20082 16.6078 8.54537 16.7646 8.92383C16.9214 9.30227 17.0018 9.70854 17.002 10.1182C17.002 10.528 16.9214 10.9349 16.7646 11.3135C16.6078 11.692 16.3776 12.0364 16.0879 12.3262L15.9941 12.4189L14.5801 11.0049L14.6738 10.9111C14.7778 10.8071 14.8607 10.6837 14.917 10.5479C14.9733 10.4119 15.002 10.2653 15.002 10.1182C15.0018 9.97119 14.9732 9.82525 14.917 9.68945C14.8607 9.55366 14.7777 9.43015 14.6738 9.32617C14.5698 9.22216 14.4455 9.13932 14.3096 9.08301C14.1737 9.02678 14.0279 8.99707 13.8809 8.99707C13.7337 8.99709 13.5881 9.02673 13.4521 9.08301C13.3162 9.13934 13.192 9.22211 13.0879 9.32617L12.9941 9.41895L11.5791 8.00391L11.6738 7.91113C11.9636 7.62147 12.308 7.39215 12.6865 7.23535C13.0652 7.07852 13.471 6.99709 13.8809 6.99707Z"
                    fill="white"
                    stroke="black"
                    strokeWidth="0.425"
                    strokeLinejoin="round"
                  />
                </mask>
              </defs>
            </CompositedSvg>
          </MonochromeIcon>
          <MonochromeIcon tone="control">
            <CompositedSvg
              viewBox="0 0 24 24"
              fill="none"
              className="canvas-toggle-icon-on"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12 15L16 19"
                stroke="currentColor"
                strokeWidth="1.575"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.35199 10.648C2.12605 10.8739 1.99911 11.1804 1.99911 11.5C1.99911 11.8195 2.12605 12.126 2.35199 12.352L4.64799 14.648C4.87396 14.8739 5.18043 15.0008 5.49999 15.0008C5.81954 15.0008 6.12601 14.8739 6.35199 14.648L12.381 8.61897C12.578 8.42199 12.8118 8.26573 13.0692 8.15913C13.3266 8.05252 13.6024 7.99765 13.881 7.99765C14.1596 7.99765 14.4354 8.05252 14.6928 8.15913C14.9502 8.26573 15.184 8.42199 15.381 8.61897C15.578 8.81595 15.7342 9.04981 15.8408 9.30718C15.9474 9.56455 16.0023 9.8404 16.0023 10.119C16.0023 10.3975 15.9474 10.6734 15.8408 10.9308C15.7342 11.1881 15.578 11.422 15.381 11.619L9.35199 17.648C9.12605 17.8739 8.99911 18.1804 8.99911 18.5C8.99911 18.8195 9.12605 19.126 9.35199 19.352L11.648 21.648C11.874 21.8739 12.1804 22.0008 12.5 22.0008C12.8195 22.0008 13.126 21.8739 13.352 21.648L19.717 15.281C21.1755 13.8221 21.9949 11.8437 21.9947 9.78076C21.9945 7.71786 21.1748 5.73953 19.716 4.28097C18.9937 3.55877 18.1361 2.98591 17.1924 2.5951C16.2487 2.2043 15.2372 2.0032 14.2158 2.0033C12.1529 2.00348 10.1745 2.82315 8.71599 4.28197L2.35199 10.648Z"
                stroke="currentColor"
                strokeWidth="1.575"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 8L9 12"
                stroke="currentColor"
                strokeWidth="1.575"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </CompositedSvg>
          </MonochromeIcon>
        </>
      )}
    </span>
  );
}
const SORT_OPTIONS = ["name", "addedAt"];
export const TidySortContext = reactExports.createContext({
  sortBy: "name",
  setSortBy: () => {},
});
const useTidySort = () => reactExports.useContext(TidySortContext);
export function useTidySortPreference(scope) {
  const key2 = `hilo:canvas:tidy:sortBy:${scope}`;
  const [choice, setChoice] = reactExports.useState(() => ({
    key: key2,
    value: readCanvasPreference(key2, SORT_OPTIONS, "name"),
  }));
  const sortBy =
    choice.key === key2 ? choice.value : readCanvasPreference(key2, SORT_OPTIONS, "name");
  const context = reactExports.useMemo(
    () => ({
      sortBy,
      setSortBy: (value) =>
        setChoice({
          key: key2,
          value,
        }),
    }),
    [key2, sortBy],
  );
  const finish = reactExports.useCallback(
    async (action) => {
      const result = await action;
      if (result.applied) writeCanvasPreference(key2, sortBy);
      return result;
    },
    [key2, sortBy],
  );
  return reactExports.useMemo(
    () => ({
      context,
      sortBy,
      finish,
    }),
    [context, sortBy, finish],
  );
}
function TidyGridIcon(props) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M5.25 8.75C6.28565 8.75 7.137 9.53722 7.23926 10.5459L7.25 10.75V12.75L7.23926 12.9541C7.1438 13.8957 6.39565 14.6438 5.4541 14.7393L5.25 14.75H3.25C2.14543 14.75 1.25 13.8546 1.25 12.75V10.75C1.25 9.64543 2.14543 8.75 3.25 8.75H5.25ZM13.5098 10.75C13.5098 10.3303 13.1697 9.99023 12.75 9.99023H10.75C10.3303 9.99023 9.99023 10.3303 9.99023 10.75V12.75C9.99023 13.1697 10.3303 13.5098 10.75 13.5098H12.75C13.1697 13.5098 13.5098 13.1697 13.5098 12.75V10.75ZM3.25 9.99023C2.83026 9.99023 2.49023 10.3303 2.49023 10.75V12.75C2.49023 13.1697 2.83026 13.5098 3.25 13.5098H5.25C5.66974 13.5098 6.00977 13.1697 6.00977 12.75V10.75C6.00977 10.3303 5.66974 9.99023 5.25 9.99023H3.25ZM5.25 1.25C6.28565 1.25 7.137 2.03722 7.23926 3.0459L7.25 3.25V5.25L7.23926 5.4541C7.1438 6.39565 6.39565 7.1438 5.4541 7.23926L5.25 7.25H3.25C2.14543 7.25 1.25 6.35457 1.25 5.25V3.25C1.25 2.14543 2.14543 1.25 3.25 1.25H5.25ZM12.75 1.25C13.7857 1.25 14.637 2.03722 14.7393 3.0459L14.75 3.25V5.25L14.7393 5.4541C14.6438 6.39565 13.8957 7.1438 12.9541 7.23926L12.75 7.25H10.75C9.64543 7.25 8.75 6.35457 8.75 5.25V3.25C8.75 2.14543 9.64543 1.25 10.75 1.25H12.75ZM3.25 2.49023C2.83026 2.49023 2.49023 2.83026 2.49023 3.25V5.25C2.49023 5.66974 2.83026 6.00977 3.25 6.00977H5.25C5.66974 6.00977 6.00977 5.66974 6.00977 5.25V3.25C6.00977 2.83026 5.66974 2.49023 5.25 2.49023H3.25ZM10.75 2.49023C10.3303 2.49023 9.99023 2.83026 9.99023 3.25V5.25C9.99023 5.66974 10.3303 6.00977 10.75 6.00977H12.75C13.1697 6.00977 13.5098 5.66974 13.5098 5.25V3.25C13.5098 2.83026 13.1697 2.49023 12.75 2.49023H10.75ZM14.75 12.75L14.7393 12.9541C14.6438 13.8957 13.8957 14.6438 12.9541 14.7393L12.75 14.75H10.75C9.64543 14.75 8.75 13.8546 8.75 12.75V10.75C8.75 9.64543 9.64543 8.75 10.75 8.75H12.75C13.7857 8.75 14.637 9.53722 14.7393 10.5459L14.75 10.75V12.75Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function TidyHorizontalIcon(props) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M5.75977 10C5.75977 9.58026 5.41974 9.24023 5 9.24023H3C2.58026 9.24023 2.24023 9.58026 2.24023 10V12C2.24023 12.4197 2.58026 12.7598 3 12.7598H5C5.41974 12.7598 5.75977 12.4197 5.75977 12V10ZM13.2598 10C13.2598 9.58026 12.9197 9.24023 12.5 9.24023H10.5C10.0803 9.24023 9.74023 9.58026 9.74023 10V12C9.74023 12.4197 10.0803 12.7598 10.5 12.7598H12.5C12.9197 12.7598 13.2598 12.4197 13.2598 12V10ZM7 12L6.98926 12.2041C6.8938 13.1457 6.14565 13.8938 5.2041 13.9893L5 14H3C1.89543 14 1 13.1046 1 12V10C1 8.89543 1.89543 8 3 8H5C6.03565 8 6.887 8.78722 6.98926 9.7959L7 10V12ZM14.5 12L14.4893 12.2041C14.3938 13.1457 13.6457 13.8938 12.7041 13.9893L12.5 14H10.5C9.39543 14 8.5 13.1046 8.5 12V10C8.5 8.89543 9.39543 8 10.5 8H12.5C13.5357 8 14.387 8.78722 14.4893 9.7959L14.5 10V12Z"
        fill="currentColor"
      />
      <path
        d="M1.06152 3.83398C1.06152 3.4915 1.33916 3.21387 1.68164 3.21387L12.5645 3.21387L11.5615 2.21094C11.3194 1.96877 11.3194 1.57615 11.5615 1.33398C11.8037 1.09182 12.1963 1.09182 12.4385 1.33398L14.2314 3.12688C14.6219 3.5174 14.6219 4.15057 14.2314 4.54109L12.4385 6.33398C12.1963 6.57615 11.8037 6.57615 11.5615 6.33398C11.3194 6.09182 11.3194 5.69919 11.5615 5.45703L12.5645 4.4541L1.68164 4.4541C1.33916 4.4541 1.06152 4.17647 1.06152 3.83398Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function TidyVerticalIcon(props) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M6 8.5C7.10457 8.5 8 9.39543 8 10.5V12.5C8 13.5357 7.21278 14.387 6.2041 14.4893L6 14.5H4L3.7959 14.4893C2.85435 14.3938 2.1062 13.6457 2.01074 12.7041L2 12.5V10.5C2 9.39543 2.89543 8.5 4 8.5H6ZM4 9.74023C3.58026 9.74023 3.24023 10.0803 3.24023 10.5V12.5C3.24023 12.9197 3.58026 13.2598 4 13.2598H6C6.41974 13.2598 6.75977 12.9197 6.75977 12.5V10.5C6.75977 10.0803 6.41974 9.74023 6 9.74023H4ZM6 1C7.10457 1 8 1.89543 8 3V5C8 6.03565 7.21278 6.887 6.2041 6.98926L6 7H4L3.7959 6.98926C2.85435 6.8938 2.1062 6.14565 2.01074 5.2041L2 5V3C2 1.89543 2.89543 1 4 1H6ZM4 2.24023C3.58026 2.24023 3.24023 2.58026 3.24023 3V5C3.24023 5.41974 3.58026 5.75977 4 5.75977H6C6.41974 5.75977 6.75977 5.41974 6.75977 5V3C6.75977 2.58026 6.41974 2.24023 6 2.24023H4Z"
        fill="currentColor"
      />
      <path
        d="M12 1.06152C12.3425 1.06152 12.6201 1.33916 12.6201 1.68164V12.5645L13.623 11.5615C13.8652 11.3194 14.2578 11.3194 14.5 11.5615C14.7422 11.8037 14.7422 12.1963 14.5 12.4385L12.7071 14.2314C12.3166 14.6219 11.6834 14.6219 11.2929 14.2314L9.5 12.4385C9.25784 12.1963 9.25784 11.8037 9.5 11.5615C9.74216 11.3194 10.1348 11.3194 10.377 11.5615L11.3799 12.5645V1.68164C11.3799 1.33916 11.6575 1.06152 12 1.06152Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function TidyCategoryIcon(props) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M6.02878 10.4572C6.02854 10.0377 5.68762 9.69649 5.26804 9.69649H3.18112C2.76155 9.6965 2.4216 10.0377 2.42136 10.4572V12.5441C2.42136 12.9639 2.7614 13.3039 3.18112 13.3039H5.26804C5.68777 13.3039 6.02878 12.9639 6.02878 12.5441V10.4572ZM11.8979 8.59688C13.4341 8.67492 14.6557 9.94556 14.6557 11.5012L14.6518 11.6506C14.5738 13.1867 13.3039 14.4081 11.7485 14.4084L11.5981 14.4045C10.1115 14.329 8.9197 13.1372 8.84421 11.6506L8.8403 11.5012C8.8403 9.89527 10.1426 8.59297 11.7485 8.59297L11.8979 8.59688ZM11.7485 9.83321C10.8274 9.83321 10.0805 10.5801 10.0805 11.5012C10.0808 12.422 10.8276 13.1682 11.7485 13.1682C12.6692 13.1679 13.4155 12.4218 13.4155 11.5012C13.4155 10.5803 12.6693 9.83349 11.7485 9.83321ZM7.26804 12.5441C7.26804 13.6487 6.37261 14.5441 5.26804 14.5441H3.18112C2.14549 14.5441 1.29413 13.7569 1.19186 12.7482L1.18112 12.5441V10.4572C1.18136 9.35288 2.07671 8.45725 3.18112 8.45723H5.26804C6.37246 8.45723 7.2678 9.35286 7.26804 10.4572V12.5441Z"
        fill="currentColor"
      />
      <path
        d="M7.67947 2.0106C7.83074 1.79442 8.15125 1.79442 8.30252 2.0106L11.201 6.15318C11.3771 6.40494 11.1976 6.75055 10.8904 6.75084H5.09256C4.78516 6.75084 4.6048 6.40504 4.78104 6.15318L7.67947 2.0106Z"
        stroke="currentColor"
        strokeWidth="1.24"
      />
    </CompositedSvg>
  );
}
export function TidyLayoutIcon(props) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M5.345 10.0625C6.44954 10.0625 7.34495 10.958 7.345 12.0625V12.5L7.33426 12.7041C7.23876 13.6456 6.49062 14.3938 5.5491 14.4893L5.345 14.5H3.345C2.24043 14.5 1.345 13.6046 1.345 12.5V12.0625C1.345 10.958 2.24043 10.0625 3.345 10.0625H5.345ZM3.345 11.3027C2.9253 11.3027 2.58529 11.6428 2.58524 12.0625V12.5C2.58529 12.9197 2.9253 13.2598 3.345 13.2598H5.345C5.76471 13.2598 6.10472 12.9197 6.10477 12.5V12.0625C6.10472 11.6428 5.76471 11.3027 5.345 11.3027H3.345ZM5.345 1C6.44957 1 7.345 1.89543 7.345 3V6.75C7.345 7.78567 6.55781 8.638 5.5491 8.74023L5.345 8.75H3.345C2.24043 8.75 1.345 7.78567 1.345 6.75V3C1.345 1.89543 2.24043 1 3.345 1H5.345ZM3.345 2.24023C2.92527 2.24023 2.58524 2.58026 2.58524 3V6.75C2.58524 7.16974 2.92526 7.51074 3.345 7.51074H5.345C5.76474 7.51074 6.10477 7.16974 6.10477 6.75V3C6.10477 2.58026 5.76474 2.24023 5.345 2.24023H3.345Z"
        fill="currentColor"
      />
      <path
        d="M12.655 5.4375C13.7595 5.4375 14.6549 4.54203 14.655 3.4375V3L14.6443 2.7959C14.5488 1.85439 13.8006 1.1062 12.8591 1.01074L12.655 1H10.655L10.4509 1.01074C9.50938 1.1062 8.76124 1.85439 8.66574 2.7959L8.655 3V3.4375C8.65505 4.54203 9.55046 5.4375 10.655 5.4375H12.655ZM10.655 4.19727C10.2353 4.19727 9.89528 3.85719 9.89523 3.4375V3C9.89528 2.58031 10.2353 2.24023 10.655 2.24023H12.655C13.0747 2.24023 13.4147 2.58031 13.4148 3V3.4375C13.4147 3.85719 13.0747 4.19727 12.655 4.19727H10.655ZM12.655 14.5C13.7596 14.5 14.655 13.6046 14.655 12.5V8.75C14.655 7.71433 13.8678 6.862 12.8591 6.75977L12.655 6.75H10.655L10.4509 6.75977C9.44219 6.862 8.655 7.71433 8.655 8.75V12.5C8.655 13.6046 9.55043 14.5 10.655 14.5H12.655ZM10.655 13.2598C10.2353 13.2598 9.89523 12.9197 9.89523 12.5V8.75C9.89523 8.33026 10.2353 7.98926 10.655 7.98926H12.655C13.0747 7.98926 13.4148 8.33026 13.4148 8.75V12.5C13.4148 12.9197 13.0747 13.2598 12.655 13.2598H10.655Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const INCLUDE_DEPS_STORAGE_KEY = "hilo:canvas:tidy:includeDeps";
let autoAlignSnapshot;
const autoAlignListeners = new Set();
function readAutoAlignPreference() {
  try {
    return (
      typeof localStorage !== "undefined" && localStorage.getItem(INCLUDE_DEPS_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}
function getAutoAlignSnapshot() {
  if (autoAlignSnapshot === void 0) autoAlignSnapshot = readAutoAlignPreference();
  return autoAlignSnapshot;
}
function emitAutoAlignChange() {
  for (const listener of autoAlignListeners) listener();
}
function handleStorageChange(event) {
  if (event.key !== INCLUDE_DEPS_STORAGE_KEY) return;
  const next2 = event.newValue === "1";
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  emitAutoAlignChange();
}
function subscribeAutoAlign(listener) {
  autoAlignListeners.add(listener);
  if (autoAlignListeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
  }
  return () => {
    autoAlignListeners.delete(listener);
    if (autoAlignListeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}
function setAutoAlignPreference(next2) {
  if (next2 === getAutoAlignSnapshot()) return;
  autoAlignSnapshot = next2;
  try {
    localStorage.setItem(INCLUDE_DEPS_STORAGE_KEY, next2 ? "1" : "0");
  } catch {}
  emitAutoAlignChange();
}
const LAYOUT_OPTIONS = [
  {
    kind: "grid",
    labelKey: "canvas.tidy.grid",
    defaultLabel: "宫格布局",
    icon: TidyGridIcon,
  },
  {
    kind: "horizontal",
    labelKey: "canvas.tidy.horizontal",
    defaultLabel: "水平布局",
    icon: TidyHorizontalIcon,
  },
  {
    kind: "vertical",
    labelKey: "canvas.tidy.vertical",
    defaultLabel: "垂直布局",
    icon: TidyVerticalIcon,
  },
];
export const MENU_CONTENT_CLASS =
  "min-w-[200px] border border-[var(--canvas-controls-border)] [border-width:var(--divider-width)]";
const MENU_LEADING_CLASS =
  "flex size-4 shrink-0 items-center justify-center pointer-coarse:size-11";
export function TidyHint({ hint, hintId }) {
  const swallow = reactExports.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  return (
    <>
      <Tooltip$1 content={hint} side="right" sideOffset={10} className="max-w-[260px]">
        <span
          data-canvas-tidy-hint=""
          aria-hidden="true"
          onClick={swallow}
          onPointerDown={swallow}
          className="ml-auto flex size-[18px] shrink-0 cursor-default items-center justify-center rounded-full text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-active)] hover:text-[var(--canvas-controls-text)]"
        >
          <CircleHelp size={14} strokeWidth={1.5} />
        </span>
      </Tooltip$1>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </>
  );
}
export function TidyLayoutMenuItems({ onTidy, showIncludeDeps, uiIdPrefix }) {
  const { t: t2 } = useTranslation();
  const { sortBy, setSortBy } = useTidySort();
  const includeDeps = reactExports.useSyncExternalStore(
    subscribeAutoAlign,
    getAutoAlignSnapshot,
    () => false,
  );
  const includeDepsHint = t2("canvas.tidy.includeDeps.hint", "根据节点连线关系自动整理上下游结构");
  const includeDepsHintId = reactExports.useId();
  const includeDepsId = reactExports.useId();
  return (
    <>
      <SegmentedSwitch$1
        value={sortBy}
        onValueChange={setSortBy}
        ariaLabel={t2("canvas.tidy.orderBy", "排序依据")}
        dataActionUiId={`${uiIdPrefix}-order-tabs`}
        options={[
          {
            value: "name",
            label: t2("canvas.tidy.orderName", "按名称"),
            dataActionUiId: `${uiIdPrefix}-order-name`,
          },
          {
            value: "addedAt",
            label: t2("canvas.tidy.orderAddedAt", "按时间"),
            dataActionUiId: `${uiIdPrefix}-order-added-at`,
          },
        ]}
        variant="label"
        gap="xs"
        stretch={true}
        itemClassName={
          uiIdPrefix === "canvas.selection-tidy"
            ? "canvas-toolbar-menu-item h-[26px]"
            : "h-[26px] text-xs hover:!bg-tab-active-bg/80"
        }
        className="mb-1 h-[30px] shrink-0 [&_[data-slot=segmented-switch-thumb]]:h-[26px] [&_[data-slot=segmented-switch-thumb]]:bg-card"
      />
      {LAYOUT_OPTIONS.map((option2) => {
        const Icon2 = option2.icon;
        return (
          <DropdownMenuItem$1
            key={option2.kind}
            data-action-ui-id={`${uiIdPrefix}-${option2.kind}`}
            onClick={() => void onTidy(option2.kind, includeDeps)}
            className="cursor-pointer gap-2 rounded-md px-3 py-2 text-xs tracking-tight"
          >
            <span className={MENU_LEADING_CLASS}>
              <Icon2 aria-hidden="true" className="text-[var(--canvas-controls-text-muted)]" />
            </span>
            <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
              {t2(option2.labelKey, option2.defaultLabel)}
            </span>
          </DropdownMenuItem$1>
        );
      })}
      {showIncludeDeps && (
        <>
          <DropdownMenuSeparator$1 />
          <div
            className={
              uiIdPrefix === "canvas.selection-tidy"
                ? "canvas-toolbar-menu-item group flex cursor-pointer items-center gap-2 px-3 py-2"
                : "group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs tracking-tight hover:bg-[var(--canvas-controls-hover)]"
            }
          >
            <label
              htmlFor={includeDepsId}
              className="flex flex-1 cursor-pointer items-center gap-2"
            >
              <span className={MENU_LEADING_CLASS}>
                <Checkbox
                  id={includeDepsId}
                  data-action-ui-id={`${uiIdPrefix}-include-deps`}
                  checked={includeDeps}
                  onCheckedChange={setAutoAlignPreference}
                  aria-describedby={includeDepsHintId}
                  size="sm"
                  className="cursor-pointer"
                />
              </span>
              <span className="whitespace-nowrap text-[var(--canvas-controls-text)]">
                {t2("canvas.tidy.includeDeps", "整理相连的上下游")}
              </span>
            </label>
            <TidyHint hint={includeDepsHint} hintId={includeDepsHintId} />
          </div>
        </>
      )}
    </>
  );
}
