// use-preview-text.jsx
import {
  DialogBackdrop,
  DialogClose$1,
  DialogDescription$2,
  DialogPopup,
  DialogPortal$2,
  DialogTitle$2,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  XIcon,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "../infra/dialog-content.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { Dialog$1 } from "../canvas/separator.jsx";
import { useCanvasBridge } from "./package.jsx";

export function TextPreviewContent({ state: state2, summary = false }) {
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
      role={
        state2.status === "error" || state2.status === "too-large"
          ? "alert"
          : "status"
      }
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

export function usePreviewText(path2, loader2, active2 = true) {
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
            render={
              <Button$2
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
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
      className={cn$5(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
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
  const loader2 =
    loadTextContent ?? bridge.loadPreviewTextContent ?? bridge.loadTextContent;
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

function calculateMediaDurationExcesses(items, kind, limitSec) {
  const excesses = new Map();
  if (limitSec == null || limitSec <= 0) return excesses;
  let totalSec = 0;
  for (const item of items) {
    if (item.kind !== kind || !item.durationSec || item.durationSec <= 0)
      continue;
    totalSec += item.durationSec;
    if (totalSec > limitSec) excesses.set(item.path, totalSec - limitSec);
  }
  return excesses;
}

export function calculateVideoDurationExcesses(items, limitSec) {
  return calculateMediaDurationExcesses(items, "video", limitSec);
}

export function calculateAudioDurationExcesses(items, limitSec) {
  return calculateMediaDurationExcesses(items, "audio", limitSec);
}
