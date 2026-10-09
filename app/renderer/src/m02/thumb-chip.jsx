// thumb-chip.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  reactDomExports,
  getExtFromMime,
  formatTime$2,
  CompositedSvg,
  useCanvasBridge,
  ImageOutlineIcon,
  DialogPortal$2,
  DialogBackdrop,
  DialogPopup,
  DialogClose$1,
  XIcon,
  DialogTitle$2,
  DialogDescription$2,
  Dialog$1,
  FileText,
  CircleAlert,
  Scissors,
  X$7,
} from "../vendor.js";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaHoverPreview, useHoverPreview } from "./audio-preview-player.jsx";
import {
  ImageSlotList,
  ReferenceMediaLightbox,
  ReferenceThumbnailOverlay,
  ReferenceThumbnailVideoInfo,
  SWAP_SLOT_ANIMATION_CLASSES,
} from "./image-slot-list.jsx";
import { MediaClipPanel } from "./media-clip-panel-inner.jsx";
const SWAP_ANIMATION_DURATION_MS = 260;
export function FirstLastFrameImageSlots({
  imagePaths,
  contextKey,
  disabled: disabled2,
  resolveFileUrl,
  onUpdatePaths,
  onReplacePath,
  getLocateAction,
  onReference,
  onEditImage,
}) {
  const { t: t2 } = useTranslation();
  const [swapAnimationRun, setSwapAnimationRun] = reactExports.useState(0);
  const [swapAnimationActive, setSwapAnimationActive] = reactExports.useState(false);
  const hasFrame = imagePaths.slice(0, 2).some((path2) => path2?.trim());
  const swapDisabled = disabled2 || !hasFrame;
  const swapLabel = t2("canvas.imageSlot.swapFrames", {
    defaultValue: "交换首尾帧",
  });
  reactExports.useEffect(() => {
    if (!swapAnimationActive || swapAnimationRun === 0) return;
    const timeoutId = window.setTimeout(
      () => setSwapAnimationActive(false),
      SWAP_ANIMATION_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [swapAnimationActive, swapAnimationRun]);
  const handleSwapFrames = () => {
    if (swapDisabled) return;
    setSwapAnimationRun((currentRun) => currentRun + 1);
    setSwapAnimationActive(true);
    onUpdatePaths([imagePaths[1] ?? "", imagePaths[0] ?? ""]);
  };
  const swapAnimationVariant = swapAnimationRun % 2 === 0 ? "b" : "a";
  return (
    <ImageSlotList
      imagePaths={imagePaths}
      contextKey={contextKey}
      renderedSlotCount={2}
      maxSlots={2}
      disabled={disabled2}
      resolveFileUrl={resolveFileUrl}
      getSlotLabel={(index2) =>
        index2 === 0 ? t2("canvas.imageSlot.firstFrame") : t2("canvas.imageSlot.lastFrame")
      }
      getSlotActionUiId={(index2) =>
        index2 === 0 ? "popover.frame-slot.first" : "popover.frame-slot.last"
      }
      getSlotClassName={(index2) =>
        swapAnimationActive ? SWAP_SLOT_ANIMATION_CLASSES[swapAnimationVariant][index2] : void 0
      }
      enableHoverReplace={true}
      getLocateAction={getLocateAction}
      onReference={onReference}
      onEditImage={onEditImage}
      renderSlotSeparator={() => (
        <Tooltip$1 content={swapLabel} side="top">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSwapFrames();
            }}
            disabled={swapDisabled}
            aria-label={swapLabel}
            title={swapLabel}
            data-action-ui-id="popover.frame-slot.swap"
            className="flex size-6 shrink-0 self-center cursor-pointer items-center justify-center rounded-full backdrop-blur-[20px] transition-colors duration-150 hover:enabled:bg-[var(--canvas-controls-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-border)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none ${swapAnimationRun % 2 === 1 ? "rotate-180" : "rotate-0"}`}
            >
              <path
                d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z"
                fill="var(--canvas-controls-bg)"
                fillOpacity="0.2"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.70557 13.3054C6.36055 13.3056 6.08057 13.5853 6.08057 13.9304C6.08057 14.2754 6.36055 14.5552 6.70557 14.5554H14.606V16.2888C14.606 16.5518 14.7708 16.787 15.0181 16.8766C15.2654 16.9663 15.5429 16.8912 15.7114 16.6891L17.6782 14.3308C17.7725 14.2178 17.8222 14.0779 17.8237 13.9362L17.9194 13.8278H17.8149C17.8058 13.7726 17.7896 13.718 17.7651 13.6657C17.6623 13.446 17.4413 13.3054 17.1987 13.3054H6.70557ZM15.856 14.5641V14.5554H15.8638L15.856 14.5641ZM8.88623 7.12372C8.63901 7.03419 8.36237 7.10941 8.19385 7.31122L6.22607 9.66962C6.07071 9.85585 6.03737 10.115 6.14014 10.3347C6.24292 10.5542 6.46314 10.6949 6.70557 10.695H17.1987C17.5439 10.695 17.8237 10.4152 17.8237 10.07C17.8237 9.72483 17.5439 9.44501 17.1987 9.44501H9.29834V7.71161C9.29834 7.44853 9.13357 7.21334 8.88623 7.12372ZM8.04834 9.44501H8.0415L8.04834 9.43622V9.44501Z"
                fill="var(--canvas-controls-text)"
                fillOpacity="0.7"
              />
            </svg>
          </button>
        </Tooltip$1>
      )}
      onUpdatePaths={onUpdatePaths}
      onReplacePath={onReplacePath}
    />
  );
}
const getVideoExt = (mime) => getExtFromMime(mime, "mp4");
function VideoPreview$1({ engine, state: state2, loading, previewSize }) {
  const previewCanvasRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !state2.previewFrame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = state2.previewFrame;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    ctx.drawImage(state2.previewFrame, 0, 0);
  }, [state2.previewFrame]);
  reactExports.useEffect(() => {
    if (!engine) return;
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;
    engine.onPreviewFrameDirect = (source, width, height) => {
      if (previewCanvas.width !== width || previewCanvas.height !== height) {
        previewCanvas.width = width;
        previewCanvas.height = height;
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      ctx.drawImage(source, 0, 0, width, height);
    };
    return () => {
      engine.onPreviewFrameDirect = null;
    };
  }, [engine]);
  const maxPreviewWidth = 768;
  const maxPreviewHeight = 432;
  let displayW = maxPreviewWidth;
  let displayH = maxPreviewHeight;
  if (previewSize.w > 0 && previewSize.h > 0) {
    const ar = previewSize.w / previewSize.h;
    if (ar >= maxPreviewWidth / maxPreviewHeight) {
      displayW = maxPreviewWidth;
      displayH = Math.round(maxPreviewWidth / ar);
    } else {
      displayH = maxPreviewHeight;
      displayW = Math.round(maxPreviewHeight * ar);
    }
  }
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--canvas-controls-bg)] px-4 py-4">
      <canvas
        ref={previewCanvasRef}
        className="h-full w-full"
        style={{
          maxWidth: displayW,
          maxHeight: displayH,
          objectFit: "contain",
          borderRadius: 6,
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
        </div>
      )}
    </div>
  );
}
function VideoClipPanelInner({ videoUrl, videoName, onClose, onExport }) {
  const [previewSize, setPreviewSize] = reactExports.useState({
    w: 640,
    h: 360,
  });
  const handleMediaLoaded = reactExports.useCallback((engine) => {
    const clips = engine.getClips();
    if (clips.length > 0 && clips[0].width > 0 && clips[0].height > 0) {
      setPreviewSize({
        w: clips[0].width,
        h: clips[0].height,
      });
    }
  }, []);
  const renderPreview2 = reactExports.useCallback(
    (ctx) => <VideoPreview$1 {...ctx} previewSize={previewSize} />,
    [previewSize],
  );
  return (
    <MediaClipPanel
      mediaUrl={videoUrl}
      mediaName={videoName}
      defaultMime="video/mp4"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview2}
      onMediaLoaded={handleMediaLoaded}
      getExtFromMime={getVideoExt}
      splitEnabled={true}
    />
  );
}
export const VideoClipPanel = reactExports.memo(VideoClipPanelInner);
function TextPreviewContent({ state: state2, summary = false }) {
  const { t: t2 } = useTranslation();
  if (state2.status === "ready") {
    return (
      <>
        <pre className="m-0 select-text whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.45] [overflow-wrap:anywhere]">
          {state2.text ? (
            summary ? (
              state2.text.slice(0, 2e3)
            ) : (
              state2.text
            )
          ) : (
            <span className="text-[var(--canvas-controls-text-muted)] italic">
              {t2("canvas.text.previewEmpty", "Empty file")}
            </span>
          )}
        </pre>
        {summary && state2.text.length > 2e3 && (
          <p className="mt-2 text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.text.previewTruncated", "Truncated")}
          </p>
        )}
      </>
    );
  }
  return (
    <p
      role={state2.status === "error" || state2.status === "too-large" ? "alert" : "status"}
      className="text-[12px] text-[var(--canvas-controls-text-muted)]"
    >
      {state2.status === "loading"
        ? t2("common.loading", "Loading...")
        : state2.status === "too-large"
          ? t2("canvas.file.viewer.tooLarge", "File is too large to preview")
          : state2.status === "error"
            ? t2("canvas.text.previewLoadFailed", "Failed to load content")
            : t2("canvas.text.previewUnavailable", "Preview unavailable")}
    </p>
  );
}
function isTooLarge(error) {
  if (!error || typeof error !== "object") return false;
  return (
    ("code" in error && error.code === "FILE_TOO_LARGE") ||
    ("status" in error && error.status === 413)
  );
}
function usePreviewText(path2, loader2, active2 = true) {
  const [result, setResult] = reactExports.useState();
  reactExports.useEffect(() => {
    if (!active2 || !loader2) return;
    let cancelled = false;
    const controller = new AbortController();
    setResult({
      path: path2,
      loader: loader2,
      state: {
        status: "loading",
      },
    });
    Promise.resolve()
      .then(() => loader2(path2, controller.signal))
      .then((text2) => {
        if (!cancelled)
          setResult({
            path: path2,
            loader: loader2,
            state: {
              status: "ready",
              text: text2,
            },
          });
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({
            path: path2,
            loader: loader2,
            state: {
              status: isTooLarge(error) ? "too-large" : "error",
            },
          });
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path2, loader2, active2]);
  if (!active2 || !loader2)
    return {
      status: "unavailable",
    };
  return result?.path === path2 && result.loader === loader2
    ? result.state
    : {
        status: "loading",
      };
}
const PREVIEW_W$1 = 320;
const PREVIEW_MAX_H = 240;
export function TextHoverPreview({
  path: path2,
  metadataOnly = false,
  loadTextContent: providedLoader,
  onReadFull,
  active: active2 = true,
  name: name2,
  anchorRect,
  anchorElement,
  action,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  const { t: t2 } = useTranslation();
  const bridge = useCanvasBridge();
  const effectiveActive = active2 && bridge.previewActive !== false;
  const loader2 = providedLoader ?? bridge.loadPreviewTextContent ?? bridge.loadTextContent;
  const state2 = usePreviewText(path2, loader2, effectiveActive && !metadataOnly);
  const [previewHeight, setPreviewHeight] = reactExports.useState(PREVIEW_MAX_H);
  const contentRef = reactExports.useRef(null);
  const interactive = true;
  const { layout, previewRef, handlePreviewMouseLeave } = useHoverPreview({
    anchorElement,
    anchorRect,
    size: {
      width: PREVIEW_W$1,
      height: previewHeight,
    },
    fit: "independent",
    interactive,
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  });
  reactExports.useLayoutEffect(() => {
    void layout.width;
    const preview = previewRef.current;
    const content2 = contentRef.current;
    if (!(content2 instanceof HTMLElement) || !preview) return;
    const height = preview.offsetHeight - content2.clientHeight + content2.scrollHeight;
    if (height) setPreviewHeight(Math.min(PREVIEW_MAX_H, height));
  }, [state2, previewRef, layout.width]);
  if (!effectiveActive) return null;
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useSemanticElements: this portal groups a document preview with an optional action; fieldset is not appropriate here.
    <div
      role="group"
      ref={previewRef}
      className={`fixed z-[10002] flex flex-col overflow-hidden rounded-xl border-[0.75px] border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] shadow-md ${"pointer-events-auto"}`}
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxHeight: layout.height,
      }}
      data-testid="text-hover-preview"
      onMouseEnter={onPreviewMouseEnter}
      onMouseLeave={handlePreviewMouseLeave}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-[var(--canvas-controls-border)] px-2.5 py-1.5 text-[11px] text-[var(--canvas-controls-text-muted)]">
        <span
          data-testid="preview-file-name"
          className="min-w-0 max-h-20 flex-1 overflow-y-auto overscroll-contain whitespace-normal break-words [overflow-wrap:anywhere]"
        >
          {name2}
        </span>
        {action && (
          <button
            type="button"
            className="flex h-6 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[100px] bg-[var(--canvas-controls-hover)] px-2 text-[11px] text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-active)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            aria-label={action.label}
            data-action-ui-id={action.actionUiId}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <div
        ref={contentRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-2 select-text text-[var(--canvas-controls-text)]"
      >
        {!metadataOnly && <TextPreviewContent state={state2} summary={true} />}
      </div>
      {!metadataOnly && onReadFull && loader2 && (
        <Button$2
          variant="ghost"
          size="sm"
          className="mx-2.5 mb-2 shrink-0 self-start"
          disabled={state2.status === "too-large"}
          data-action-ui-id="attachment-text.read-full"
          onClick={(event) => {
            event.stopPropagation();
            onReadFull();
          }}
        >
          {t2("attachment.text.readFull", "Read full text")}
        </Button$2>
      )}
    </div>,
    document.body,
  );
}
function DialogPortal$1({ ...props }) {
  return <DialogPortal$2 data-slot="dialog-portal" {...props} />;
}
function DialogOverlay$1({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="dialog-overlay"
      className={cn$5(
        "fixed inset-0 isolate z-[10000] bg-black/50 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}
export function DialogContent$1({
  className,
  children: children2,
  showCloseButton = true,
  portalContainer,
  ...props
}) {
  const { t: t2 } = useTranslation();
  return (
    <DialogPortal$1 container={portalContainer}>
      <DialogOverlay$1 />
      <DialogPopup
        data-slot="dialog-content"
        className={cn$5(
          "fixed top-1/2 left-1/2 z-[10001] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children2}
        {showCloseButton && (
          <DialogClose$1
            data-slot="dialog-close"
            render={<Button$2 variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">{t2("common.close", "Close")}</span>
          </DialogClose$1>
        )}
      </DialogPopup>
    </DialogPortal$1>
  );
}
export function DialogHeader$1({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn$5("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}
export function DialogFooter$1({ className, children: children2, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn$5("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {children2}
    </div>
  );
}
export function DialogTitle$1({ className, ...props }) {
  return (
    <DialogTitle$2
      data-slot="dialog-title"
      className={cn$5("text-sm font-medium", className)}
      {...props}
    />
  );
}
export function DialogDescription$1({ className, ...props }) {
  return (
    <DialogDescription$2
      data-slot="dialog-description"
      className={cn$5("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function TextReadDialog({
  open,
  onOpenChange,
  path: path2,
  name: name2,
  loadTextContent,
  active: active2 = true,
}) {
  const { t: t2 } = useTranslation();
  const bridge = useCanvasBridge();
  const effectiveActive = active2 && bridge.previewActive !== false;
  const loader2 = loadTextContent ?? bridge.loadPreviewTextContent ?? bridge.loadTextContent;
  const state2 = usePreviewText(path2, loader2, open && effectiveActive);
  reactExports.useEffect(() => {
    if (!effectiveActive && open) onOpenChange(false);
  }, [effectiveActive, open, onOpenChange]);
  return (
    <Dialog$1 open={open && effectiveActive} onOpenChange={onOpenChange}>
      <DialogContent$1
        className="flex max-h-[80vh] flex-col sm:max-w-2xl"
        data-action-ui-id="attachment-text.reader"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") onOpenChange(false);
        }}
      >
        <DialogHeader$1 className="min-w-0 pr-8">
          <DialogTitle$1 className="max-h-20 overflow-y-auto break-words [overflow-wrap:anywhere]">
            {name2}
          </DialogTitle$1>
          <DialogDescription$1>
            {t2("attachment.text.readOnly", "Read-only preview")}
          </DialogDescription$1>
        </DialogHeader$1>
        <div
          className="min-h-0 overflow-y-auto overscroll-contain select-text text-[var(--canvas-controls-text)]"
          data-testid="text-reader-content"
          onWheel={(event) => event.stopPropagation()}
        >
          <TextPreviewContent state={state2} />
        </div>
      </DialogContent$1>
    </Dialog$1>
  );
}
export const THUMB_SIZE = 48;
export function calculateVideoDurationExcesses(items, limitSec) {
  return calculateMediaDurationExcesses(items, "video", limitSec);
}
export function calculateAudioDurationExcesses(items, limitSec) {
  return calculateMediaDurationExcesses(items, "audio", limitSec);
}
function calculateMediaDurationExcesses(items, kind, limitSec) {
  const excesses = new Map();
  if (limitSec == null || limitSec <= 0) return excesses;
  let totalSec = 0;
  for (const item of items) {
    if (item.kind !== kind || !item.durationSec || item.durationSec <= 0) continue;
    totalSec += item.durationSec;
    if (totalSec > limitSec) excesses.set(item.path, totalSec - limitSec);
  }
  return excesses;
}
function formatReferenceVideoDuration(durationSec) {
  if (durationSec === void 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
    return void 0;
  }
  return `${durationSec.toFixed(2)}s`;
}
function ReferenceImagePlaceholderIcon() {
  return <ImageOutlineIcon size={16} strokeWidth={1.8} aria-hidden="true" />;
}
function ReferenceTextIcon() {
  return <FileText size={16} aria-hidden={true} />;
}
function ReferenceAudioIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}
export function ThumbChip({
  item,
  disabled: disabled2,
  readOnly: readOnly2,
  videoDurationExcessSec,
  audioDurationExcessSec,
  onClipVideo,
  onClipAudio,
  onReplace,
  onRemove: onRemove2,
  onClick,
  onLocate,
}) {
  const { t: t2 } = useTranslation();
  const [hovered, setHovered] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [lightboxItem, setLightboxItem] = reactExports.useState(null);
  const isPreviewable = item.kind === "image" || item.kind === "video";
  const supportsFullTextReading = item.kind === "text" || /\.(?:txt|md)$/i.test(item.path);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const isVideoDurationExceeded = videoDurationExcessSec != null;
  const isAudioDurationExceeded = audioDurationExcessSec != null;
  const isDurationOutOfRange = item.durationOutOfRange === true;
  const isDurationExceeded =
    isVideoDurationExceeded || isAudioDurationExceeded || isDurationOutOfRange;
  const durationWarningKey = isDurationOutOfRange
    ? "canvas.mediaSlot.durationOutOfRange"
    : item.kind === "audio"
      ? "canvas.audioSlot.durationTooLong"
      : "canvas.videoSlot.durationTooLong";
  const durationWarningActionId =
    item.kind === "audio"
      ? "popover.reference-audio-duration-warning"
      : "popover.reference-video-duration-warning";
  const handleRemove = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onRemove2(item.path);
    },
    [item.path, onRemove2],
  );
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current === null) return;
    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const showPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(true);
  }, [clearPreviewCloseTimer]);
  const schedulePreviewClose = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => {
      setHovered(false);
      previewCloseTimerRef.current = null;
    }, 120);
  }, [clearPreviewCloseTimer]);
  reactExports.useEffect(() => clearPreviewCloseTimer, [clearPreviewCloseTimer]);
  const handleReplace = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(false);
    onReplace?.(item);
  }, [clearPreviewCloseTimer, item, onReplace]);
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!e2.currentTarget.contains(e2.target)) return;
      if (e2.target instanceof Element && e2.target.closest("button")) return;
      showPreview();
      onClick(item);
    },
    [item, onClick, showPreview],
  );
  const handleClipVideo = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onClipVideo?.(item);
    },
    [item, onClipVideo],
  );
  const handleClipAudio = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onClipAudio?.(item);
    },
    [item, onClipAudio],
  );
  const durationLabel =
    item.kind === "video"
      ? formatReferenceVideoDuration(item.durationSec)
      : item.kind !== "image" && item.durationSec && item.durationSec > 0
        ? formatTime$2(item.durationSec, true)
        : void 0;
  return (
    // ThumbChip 外层用 div + role="button" 而不是 <button>,因为内部 remove
    // 还有一个 <button>,HTML 不允许 button 嵌套(React 19 hydration 会报错)。
    // biome-ignore lint/a11y/useSemanticElements: nested button is illegal HTML
    <div
      ref={setChipEl}
      role="button"
      tabIndex={disabled2 || isDurationExceeded ? -1 : 0}
      aria-disabled={disabled2 || isDurationExceeded || void 0}
      className={`group/thumb relative transition-transform duration-150 motion-reduce:transform-none ${hovered && isPreviewable ? "scale-[1.04]" : ""} shrink-0 flex items-center justify-center border-[1.5px] ${item.kind === "video" ? "border-[var(--canvas-node-border)]" : "border-transparent"} ${item.kind === "text" || item.kind === "file" ? "bg-[var(--canvas-controls-hover)]" : ""} rounded-[8px] overflow-hidden ${item.durationOutOfRange ? "opacity-50" : ""} ${disabled2 ? "cursor-default opacity-60" : isDurationExceeded ? "cursor-default" : "cursor-pointer"}`}
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
      }}
      onMouseDown={(event) => {
        if (!event.currentTarget.contains(event.target)) return;
        if (event.target instanceof Element && event.target.closest("button")) return;
        event.preventDefault();
      }}
      onClick={(e2) => {
        if (disabled2 || isDurationExceeded) {
          e2.stopPropagation();
          return;
        }
        handleClick2(e2);
      }}
      onKeyDown={(e2) => {
        if (e2.target !== e2.currentTarget) return;
        if (disabled2 || isDurationExceeded) {
          e2.stopPropagation();
          return;
        }
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          handleClick2(e2);
        }
      }}
      onMouseEnter={showPreview}
      onMouseLeave={schedulePreviewClose}
    >
      {item.kind === "text" ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceTextIcon />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">{item.name}</span>
        </div>
      ) : item.kind === "file" ? (
        // Source documents have no renderable thumbnail (pdf / docx / xlsx),
        // so they reuse the reference-text chip shape with a document icon.
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <FileText size={16} strokeWidth={1.5} />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">{item.name}</span>
        </div>
      ) : item.kind === "audio" ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceAudioIcon />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">{item.name}</span>
        </div>
      ) : item.kind === "video" ? (
        <video
          src={item.thumbUrl}
          muted={true}
          playsInline={true}
          preload="metadata"
          onLoadedMetadata={(e2) => {
            try {
              e2.currentTarget.currentTime = 1e-3;
            } catch {}
          }}
          className="h-full w-full appearance-none border-0 object-cover outline-none ring-0 shadow-none pointer-events-none"
        >
          <track kind="captions" />
        </video>
      ) : item.thumbUrl ? (
        <img
          src={item.thumbUrl}
          alt={item.name}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceImagePlaceholderIcon />
        </div>
      )}
      {isPreviewable && (
        <ReferenceThumbnailOverlay
          visible={hovered}
          disabled={disabled2 || isDurationExceeded}
          onReference={() => {
            showPreview();
            onClick(item);
          }}
        />
      )}
      {item.badgeLabel && !isPreviewable && (
        <span className="absolute bottom-0 left-0 px-1 text-[9px] leading-normal bg-black/60 text-white">
          {item.badgeLabel}
        </span>
      )}
      {item.kind === "video" && (
        <ReferenceThumbnailVideoInfo visible={!hovered} durationLabel={durationLabel} />
      )}
      {item.kind !== "video" && durationLabel && (
        <span className="absolute top-0.5 left-0.5 rounded-[3px] bg-black/60 px-1 py-0.5 text-[9px] leading-none text-white">
          {durationLabel}
        </span>
      )}
      {isDurationExceeded && (
        <span
          data-action-ui-id={durationWarningActionId}
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/55 px-1 text-center text-[10px] leading-tight text-white group-hover/thumb:hidden"
        >
          <CircleAlert
            size={16}
            strokeWidth={2}
            aria-label={t2(durationWarningKey, {
              min: item.durationMinSec,
              max: item.durationMaxSec,
              defaultValue: "参考媒体时长需在 {{min}}-{{max}} 秒之间",
            })}
          />
        </span>
      )}
      {videoDurationExcessSec != null && onClipVideo && !disabled2 && !readOnly2 && (
        <Tooltip$1 content={t2("canvas.videoSlot.durationTooLong")} side="top">
          <button
            type="button"
            aria-label={t2("canvas.clip", {
              defaultValue: "裁剪",
            })}
            data-action-ui-id="popover.reference-video-duration-warning.clip"
            className="absolute inset-0 z-[2] hidden cursor-pointer items-center justify-center bg-black/70 text-white group-hover/thumb:flex"
            onClick={handleClipVideo}
          >
            <Scissors size={16} strokeWidth={1.5} />
          </button>
        </Tooltip$1>
      )}
      {audioDurationExcessSec != null && onClipAudio && !disabled2 && !readOnly2 && (
        <Tooltip$1 content={t2("canvas.audioSlot.durationTooLong")} side="top">
          <button
            type="button"
            aria-label={t2("canvas.clip", {
              defaultValue: "裁剪",
            })}
            data-action-ui-id="popover.reference-audio-duration-warning.clip"
            className="absolute inset-0 z-[2] hidden cursor-pointer items-center justify-center bg-black/70 text-white group-hover/thumb:flex"
            onClick={handleClipAudio}
          >
            <Scissors size={16} strokeWidth={1.5} />
          </button>
        </Tooltip$1>
      )}
      {!disabled2 && !readOnly2 && (
        <div
          className={`absolute top-px right-px z-[3] flex transition-opacity duration-150 motion-reduce:transition-none focus-within:opacity-100 ${hovered ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <button
            type="button"
            aria-label={t2("a11y.removeAttachment", "Remove attachment")}
            data-action-ui-id="popover.attachment-remove"
            className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            onClick={handleRemove}
          >
            <X$7 size={9} strokeWidth={2.2} className="scale-[1.15]" />
          </button>
        </div>
      )}
      {reading && supportsFullTextReading && (
        <TextReadDialog
          open={reading}
          onOpenChange={setReading}
          path={item.path}
          name={item.name}
        />
      )}
      {hovered && !reading && chipEl && (item.kind === "text" || item.kind === "file") && (
        <TextHoverPreview
          path={item.path}
          name={item.name}
          metadataOnly={!supportsFullTextReading}
          anchorRect={chipEl.getBoundingClientRect()}
          onReadFull={
            supportsFullTextReading
              ? () => {
                  setHovered(false);
                  setReading(true);
                }
              : void 0
          }
          action={
            onReplace && !disabled2 && !readOnly2
              ? {
                  label: t2("canvas.attachment.replace", {
                    defaultValue: "Replace",
                  }),
                  onClick: handleReplace,
                  actionUiId: "popover.attachment-replace",
                }
              : void 0
          }
          onPreviewMouseEnter={showPreview}
          onPreviewMouseLeave={schedulePreviewClose}
        />
      )}
      {hovered && !lightboxItem && chipEl && item.kind !== "text" && item.kind !== "file" && (
        <MediaHoverPreview
          kind={item.kind}
          url={item.thumbUrl}
          name={item.name}
          durationSec={item.durationSec}
          width={item.width}
          height={item.height}
          anchorRect={chipEl.getBoundingClientRect()}
          previewAction={
            isPreviewable
              ? {
                  label: t2("canvas.fullscreenPreview"),
                  onClick: () => {
                    clearPreviewCloseTimer();
                    setHovered(false);
                    if (item.kind === "image" || item.kind === "video") {
                      setLightboxItem({
                        kind: item.kind,
                        url: item.thumbUrl,
                        filePath: item.path,
                        fileName: item.name,
                      });
                    }
                  },
                }
              : void 0
          }
          locateAction={
            onLocate
              ? {
                  label: t2("canvas.referenceNavigation.locate"),
                  onClick: () => {
                    clearPreviewCloseTimer();
                    setHovered(false);
                    onLocate();
                  },
                }
              : void 0
          }
          action={
            onReplace && !disabled2 && !readOnly2
              ? {
                  label: t2("canvas.attachment.replace", {
                    defaultValue: "Replace",
                  }),
                  onClick: handleReplace,
                  actionUiId: "popover.attachment-replace",
                }
              : void 0
          }
          onPreviewMouseEnter={showPreview}
          onPreviewMouseLeave={schedulePreviewClose}
        />
      )}
      <ReferenceMediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </div>
  );
}
