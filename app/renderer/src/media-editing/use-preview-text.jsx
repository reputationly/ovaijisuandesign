// use-preview-text.jsx
import {
  DialogBackdrop,
  DialogClose$1 as DialogClose,
  DialogDescription$2 as DialogDescriptionPrimitive,
  DialogPopup,
  DialogPortal$2 as DialogPortalPrimitive,
  DialogTitle$2 as DialogTitlePrimitive,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  XIcon,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn as mergeClassNames } from "../infra/dialog-content.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { Dialog } from "../canvas/separator.jsx";
import { useCanvasBridge } from "./package.jsx";
export function TextPreviewContent({ state, summary = false }) {
  const { t } = useTranslation();
  if (state.status === "ready") {
    return (
      <>
        <pre className="m-0 select-text whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.45] [overflow-wrap:anywhere]">
          {state.text ? (
            summary ? (
              state.text.slice(0, 2e3)
            ) : (
              state.text
            )
          ) : (
            <span className="text-[var(--canvas-controls-text-muted)] italic">
              {t("canvas.text.previewEmpty", "Empty file")}
            </span>
          )}
        </pre>
        {summary && state.text.length > 2e3 && (
          <p className="mt-2 text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t("canvas.text.previewTruncated", "Truncated")}
          </p>
        )}
      </>
    );
  }
  return (
    <p
      role={
        state.status === "error" || state.status === "too-large"
          ? "alert"
          : "status"
      }
      className="text-[12px] text-[var(--canvas-controls-text-muted)]"
    >
      {state.status === "loading"
        ? t("common.loading", "Loading...")
        : state.status === "too-large"
          ? t("canvas.file.viewer.tooLarge", "File is too large to preview")
          : state.status === "error"
            ? t("canvas.text.previewLoadFailed", "Failed to load content")
            : t("canvas.text.previewUnavailable", "Preview unavailable")}
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
export function usePreviewText(path, loader, active = true) {
  const [result, setResult] = reactExports.useState();
  reactExports.useEffect(() => {
    if (!active || !loader) return;
    let cancelled = false;
    const controller = new AbortController();
    setResult({
      path,
      loader,
      state: {
        status: "loading",
      },
    });
    Promise.resolve()
      .then(() => loader(path, controller.signal))
      .then((text) => {
        if (!cancelled)
          setResult({
            path,
            loader,
            state: {
              status: "ready",
              text,
            },
          });
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({
            path,
            loader,
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
  }, [path, loader, active]);
  if (!active || !loader)
    return {
      status: "unavailable",
    };
  return result?.path === path && result.loader === loader
    ? result.state
    : {
        status: "loading",
      };
}
function DialogPortal({ ...props }) {
  return <DialogPortalPrimitive data-slot="dialog-portal" {...props} />;
}
function DialogOverlay({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="dialog-overlay"
      className={mergeClassNames(
        "fixed inset-0 isolate z-[10000] bg-black/50 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}
export function DialogContent({
  className,
  children,
  showCloseButton = true,
  portalContainer,
  ...props
}) {
  const { t } = useTranslation();
  return (
    <DialogPortal container={portalContainer}>
      <DialogOverlay />
      <DialogPopup
        data-slot="dialog-content"
        className={mergeClassNames(
          "fixed top-1/2 left-1/2 z-[10001] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">{t("common.close", "Close")}</span>
          </DialogClose>
        )}
      </DialogPopup>
    </DialogPortal>
  );
}
export function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={mergeClassNames("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}
export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      data-slot="dialog-footer"
      className={mergeClassNames(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export function DialogTitle({ className, ...props }) {
  return (
    <DialogTitlePrimitive
      data-slot="dialog-title"
      className={mergeClassNames("text-sm font-medium", className)}
      {...props}
    />
  );
}
export function DialogDescription({ className, ...props }) {
  return (
    <DialogDescriptionPrimitive
      data-slot="dialog-description"
      className={mergeClassNames("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function TextReadDialog({
  open,
  onOpenChange,
  path,
  name: previewName,
  loadTextContent,
  active = true,
}) {
  const { t } = useTranslation();
  const bridge = useCanvasBridge();
  const effectiveActive = active && bridge.previewActive !== false;
  const loader =
    loadTextContent ?? bridge.loadPreviewTextContent ?? bridge.loadTextContent;
  const state = usePreviewText(path, loader, open && effectiveActive);
  reactExports.useEffect(() => {
    if (!effectiveActive && open) onOpenChange(false);
  }, [effectiveActive, open, onOpenChange]);
  return (
    <Dialog open={open && effectiveActive} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] flex-col sm:max-w-2xl"
        data-action-ui-id="attachment-text.reader"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") onOpenChange(false);
        }}
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="max-h-20 overflow-y-auto break-words [overflow-wrap:anywhere]">
            {previewName}
          </DialogTitle>
          <DialogDescription>
            {t("attachment.text.readOnly", "Read-only preview")}
          </DialogDescription>
        </DialogHeader>
        <div
          className="min-h-0 overflow-y-auto overscroll-contain select-text text-[var(--canvas-controls-text)]"
          data-testid="text-reader-content"
          onWheel={(event) => event.stopPropagation()}
        >
          <TextPreviewContent state={state} />
        </div>
      </DialogContent>
    </Dialog>
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
