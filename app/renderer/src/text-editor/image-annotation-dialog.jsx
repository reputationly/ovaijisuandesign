// image-annotation-dialog.jsx
import { ArrowUpRight, ChevronDown, Grid3X3, jsxRuntimeExports, Minus, reactExports, Redo2, Tag$1 as Tag, Undo2, usePlatform, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  Brush,
  Circle,
  Download,
  MousePointer2,
  Square,
  Trash2,
  Type,
} from "../media-editing/package.jsx";
import { filenameExtension } from "./read-preview-text-response.jsx";
import { DropdownMenu, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AlertDialog,
  Button,
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useBrowserHoverPreview,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import { useEditorState } from "../media-editing/use-editor-state.js";
import { ImageEditor } from "../media-editing/image-editor.jsx";
import { DEFAULT_STYLE } from "../media-editing/history-manager.js";
const TOOLS = [
  {
    tool: "select",
    icon: MousePointer2,
    labelKey: "imageEdit.toolSelect",
  },
  {
    tool: "rectangle",
    icon: Square,
    labelKey: "imageEdit.toolRectangle",
  },
  {
    tool: "ellipse",
    icon: Circle,
    labelKey: "imageEdit.toolEllipse",
  },
  {
    tool: "arrow",
    icon: ArrowUpRight,
    labelKey: "imageEdit.toolArrow",
  },
  {
    tool: "line",
    icon: Minus,
    labelKey: "imageEdit.toolLine",
  },
  {
    tool: "brush",
    icon: Brush,
    labelKey: "imageEdit.toolBrush",
  },
  {
    tool: "text",
    icon: Type,
    labelKey: "imageEdit.toolText",
  },
  {
    tool: "tag",
    icon: Tag,
    labelKey: "imageEdit.toolTag",
  },
  {
    tool: "mosaic",
    icon: Grid3X3,
    labelKey: "imageEdit.toolMosaic",
  },
];
const IMAGE_ANNOTATION_SAVE_TIMEOUT_MS = 12e4;
const JPEG_SOURCE_EXTENSIONS = new Set(["jpg", "jpeg", "heic", "heif"]);
function getImageAnnotationOutput(filename) {
  if (JPEG_SOURCE_EXTENSIONS.has(filenameExtension(filename))) {
    return {
      extension: "jpg",
      mimeType: "image/jpeg",
      quality: 0.92,
    };
  }
  return {
    extension: "png",
    mimeType: "image/png",
  };
}
function getAnnotatedFilename(filename, extension) {
  const dot = filename.lastIndexOf(".");
  const base =
    (dot > 0 ? filename.slice(0, dot) : filename).trim() || "image";
  return `${base}-annotated.${extension}`;
}
const IMAGE_ANNOTATION_VIEWPORT_INSET = 16;
function observeImageAnnotationViewport(element, onSize) {
  let disposed = false;
  let frame = 0;
  const measure = () => {
    if (disposed) return;
    onSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });
  };
  const scheduleMeasure = () => {
    if (disposed || frame) return;
    if (typeof requestAnimationFrame === "undefined") {
      measure();
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  };
  measure();
  scheduleMeasure();
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleMeasure);
  observer?.observe(element);
  return () => {
    disposed = true;
    if (frame && typeof cancelAnimationFrame !== "undefined")
      cancelAnimationFrame(frame);
    observer?.disconnect();
  };
}
function isUsableSize(size) {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}
function calculateImageAnnotationDisplayFrame(
  editorSize,
  viewportSize,
  inset = IMAGE_ANNOTATION_VIEWPORT_INSET,
) {
  if (!isUsableSize(editorSize)) {
    return {
      width: 0,
      height: 0,
      scale: 1,
    };
  }
  if (!isUsableSize(viewportSize)) {
    return {
      width: 0,
      height: 0,
      scale: 1,
    };
  }
  const availableWidth = viewportSize.width - inset * 2;
  const availableHeight = viewportSize.height - inset * 2;
  if (availableWidth <= 0 || availableHeight <= 0) {
    return {
      width: 0,
      height: 0,
      scale: 1,
    };
  }
  const scale = Math.min(
    1,
    availableWidth / editorSize.width,
    availableHeight / editorSize.height,
  );
  return {
    width: editorSize.width * scale,
    height: editorSize.height * scale,
    scale,
  };
}
const COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#AF52DE",
  "#FFFFFF",
];
const STROKE_WIDTHS = [2, 4, 8];
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
export function ImageAnnotationDialog({
  attachment,
  canAppend,
  applyDisabled = false,
  onClose,
  onApply,
}) {
  const browserPreviewReady = useBrowserHoverPreview(true, {
    requireSnapshot: true,
    onError: onClose,
  });
  const { t } = useTranslation();
  const platform = usePlatform();
  const editorRef = reactExports.useRef(null);
  const viewportRef = reactExports.useRef(null);
  const [viewportElement, setViewportElement] = reactExports.useState(null);
  const editorState = useEditorState(editorRef);
  const [editorReady, setEditorReady] = reactExports.useState(false);
  const [loadFailed, setLoadFailed] = reactExports.useState(false);
  const [editorSize, setEditorSize] = reactExports.useState({
    width: 800,
    height: 600,
  });
  const [viewportSize, setViewportSize] = reactExports.useState({
    width: 0,
    height: 0,
  });
  const [activeTool, setActiveTool] = reactExports.useState("select");
  const [activeColor, setActiveColor] = reactExports.useState(
    DEFAULT_STYLE.stroke,
  );
  const [activeStrokeWidth, setActiveStrokeWidth] = reactExports.useState(
    DEFAULT_STYLE.strokeWidth,
  );
  const [mosaicMode, setMosaicMode] = reactExports.useState("mosaic");
  const [mosaicShape, setMosaicShape] = reactExports.useState("rectangle");
  const [working, setWorking] = reactExports.useState(null);
  const operationRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(
    () => () => {
      operationRef.current?.abort();
      operationRef.current = null;
    },
    [],
  );
  const [discardOpen, setDiscardOpen] = reactExports.useState(false);
  const [privacyOpen, setPrivacyOpen] = reactExports.useState(false);
  const applyContextRef = reactExports.useRef({
    onApply,
    onClose,
    applyDisabled,
    canAppend,
  });
  reactExports.useLayoutEffect(() => {
    applyContextRef.current = {
      onApply,
      onClose,
      applyDisabled,
      canAppend,
    };
  }, [onApply, onClose, applyDisabled, canAppend]);
  const hasChanges = editorState.shapes.length > 0;
  const hasMosaic = editorState.shapes.some((shape) => shape.type === "mosaic");
  const displayFrame = reactExports.useMemo(
    () => calculateImageAnnotationDisplayFrame(editorSize, viewportSize),
    [editorSize, viewportSize],
  );
  const viewportReady = viewportSize.width > 0 && viewportSize.height > 0;
  const displayReady = editorReady && viewportReady;
  const output = reactExports.useMemo(
    () => getImageAnnotationOutput(attachment.filename),
    [attachment.filename],
  );
  const outputFilename = reactExports.useMemo(
    () => getAnnotatedFilename(attachment.filename, output.extension),
    [attachment.filename, output.extension],
  );
  const syncViewportSize = reactExports.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    };
    if (next.width <= 0 || next.height <= 0) return;
    setViewportSize((current) =>
      current.width === next.width && current.height === next.height
        ? current
        : next,
    );
  }, []);
  const handleViewportRef = reactExports.useCallback((element) => {
    viewportRef.current = element;
    setViewportElement((current) =>
      current === element ? current : element,
    );
  }, []);
  const handleEditorReady = reactExports.useCallback(() => {
    const nextSize = editorRef.current?.getSize();
    if (nextSize) setEditorSize(nextSize);
    syncViewportSize();
    setLoadFailed(false);
    setEditorReady(true);
  }, [syncViewportSize]);
  reactExports.useEffect(() => {
    if (!viewportElement) return;
    return observeImageAnnotationViewport(viewportElement, (next) => {
      if (next.width <= 0 || next.height <= 0) return;
      setViewportSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    });
  }, [viewportElement]);
  const handleLoadError = reactExports.useCallback(() => {
    setEditorReady(false);
    setLoadFailed(true);
  }, []);
  const handleRetryLoad = reactExports.useCallback(() => {
    setLoadFailed(false);
    setEditorReady(false);
    void editorRef.current
      ?.loadImage(attachment.previewUrl)
      .catch(() => void 0);
  }, [attachment.previewUrl]);
  const selectTool = reactExports.useCallback((tool) => {
    setActiveTool(tool);
    editorRef.current?.setTool(tool);
  }, []);
  const selectColor = reactExports.useCallback((color) => {
    setActiveColor(color);
    editorRef.current?.setStyle({
      stroke: color,
    });
  }, []);
  const selectStrokeWidth = reactExports.useCallback((strokeWidth) => {
    setActiveStrokeWidth(strokeWidth);
    editorRef.current?.setStyle({
      strokeWidth,
    });
  }, []);
  const selectMosaicMode = reactExports.useCallback((mode) => {
    setMosaicMode(mode);
    editorRef.current?.setStyle({
      mosaicMode: mode,
    });
  }, []);
  const selectMosaicShape = reactExports.useCallback((shape) => {
    setMosaicShape(shape);
    editorRef.current?.setStyle({
      mosaicShape: shape,
    });
  }, []);
  const exportBlob = reactExports.useCallback(async () => {
    const handle = editorRef.current;
    if (!handle) throw new Error("Image editor is not ready");
    return handle.toBlob(output.mimeType, output.quality);
  }, [output]);
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (
        event.defaultPrevented ||
        event.nativeEvent.isComposing ||
        !editorReady ||
        working ||
        discardOpen ||
        privacyOpen ||
        !event.currentTarget.contains(event.target) ||
        (event.target instanceof HTMLElement &&
          event.target.closest('input, textarea, [contenteditable="true"]'))
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey && (key === "z" || key === "y")) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) editorRef.current?.redo();
        else editorRef.current?.undo();
      } else if (
        !mod &&
        !event.altKey &&
        (key === "delete" || key === "backspace")
      ) {
        event.preventDefault();
        editorRef.current?.deleteSelected();
      }
    },
    [editorReady, working, discardOpen, privacyOpen],
  );
  const apply = reactExports.useCallback(
    async (mode) => {
      if (operationRef.current || applyDisabled || !editorReady || !hasChanges)
        return;
      const operation = new AbortController();
      operationRef.current = operation;
      setWorking(mode);
      const timeout = window.setTimeout(() => {
        if (operationRef.current !== operation) return;
        operation.abort();
        operationRef.current = null;
        setWorking(null);
        dedupedToast.error(t("chat.imageAnnotation.saveTimedOut"));
      }, IMAGE_ANNOTATION_SAVE_TIMEOUT_MS);
      const stopTimeout = () => window.clearTimeout(timeout);
      operation.signal.addEventListener("abort", stopTimeout, {
        once: true,
      });
      try {
        const blob = await exportBlob();
        if (operation.signal.aborted) return;
        const file = new File([blob], outputFilename, {
          type: output.mimeType,
          lastModified: Date.now(),
        });
        const current = applyContextRef.current;
        if (
          current.applyDisabled ||
          (mode === "append" && !current.canAppend)
        ) {
          dedupedToast.error(t("chat.imageAnnotation.targetChanged"));
          return;
        }
        const accepted = await current.onApply(
          attachment,
          file,
          mode,
          operation.signal,
        );
        if (operation.signal.aborted) return;
        if (!accepted) {
          dedupedToast.error(t("chat.imageAnnotation.targetChanged"));
          return;
        }
        applyContextRef.current.onClose();
      } catch (error) {
        if (operation.signal.aborted) return;
        void window.hilo?.logger?.error?.(
          `[image-annotation] apply failed: ${getErrorMessage(error)}`,
          "image-annotation",
        );
        dedupedToast.error(t("chat.imageAnnotation.applyFailed"));
      } finally {
        stopTimeout();
        operation.signal.removeEventListener("abort", stopTimeout);
        if (operationRef.current === operation) {
          operationRef.current = null;
          setWorking(null);
        }
      }
    },
    [
      applyDisabled,
      attachment,
      editorReady,
      exportBlob,
      hasChanges,
      output.mimeType,
      outputFilename,
      t,
    ],
  );
  const requestApply = reactExports.useCallback(
    (mode) => {
      if (mode === "append" && hasMosaic) {
        setPrivacyOpen(true);
        return;
      }
      void apply(mode);
    },
    [apply, hasMosaic],
  );
  const exportLocal = reactExports.useCallback(async () => {
    if (operationRef.current || !editorReady || !hasChanges) return;
    const operation = new AbortController();
    operationRef.current = operation;
    setWorking("export");
    try {
      const blob = await exportBlob();
      if (operation.signal.aborted) return;
      if (platform.fs.showSaveDialog && platform.fs.writeBinaryFile) {
        const targetPath = await platform.fs.showSaveDialog({
          defaultPath: outputFilename,
          filters: [
            {
              name: output.extension.toUpperCase(),
              extensions: [output.extension],
            },
          ],
        });
        if (!targetPath || operation.signal.aborted) return;
        const bytes = await blob.arrayBuffer();
        if (operation.signal.aborted) return;
        await platform.fs.writeBinaryFile(targetPath, bytes);
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = outputFilename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      if (!operation.signal.aborted)
        dedupedToast.success(t("chat.imageAnnotation.exported"));
    } catch (error) {
      if (operation.signal.aborted) return;
      void window.hilo?.logger?.error?.(
        `[image-annotation] export failed: ${getErrorMessage(error)}`,
        "image-annotation",
      );
      dedupedToast.error(t("chat.imageAnnotation.exportFailed"));
    } finally {
      if (operationRef.current === operation) {
        operationRef.current = null;
        setWorking(null);
      }
    }
  }, [
    editorReady,
    exportBlob,
    hasChanges,
    output.extension,
    outputFilename,
    platform,
    t,
  ]);
  const requestClose = reactExports.useCallback(() => {
    if (operationRef.current && working !== "export") {
      operationRef.current.abort();
      operationRef.current = null;
      setWorking(null);
      return;
    }
    if (working) return;
    if (hasChanges) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [hasChanges, onClose, working]);
  const canFinish = editorReady && hasChanges && !applyDisabled && !working;
  return (
    <>
      <Dialog
        browserPreviewManaged={true}
        open={browserPreviewReady}
        onOpenChange={(open) => !open && requestClose()}
      >
        <DialogContent
          size="xl"
          showCloseButton={false}
          className="h-[min(820px,calc(100vh-2rem))] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 p-0"
          data-action-ui-id="chat-image-annotation-dialog"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader className="px-4 pt-4 pr-14">
            <DialogTitle>{t("chat.imageAnnotation.title")}</DialogTitle>
            <DialogDescription className="truncate">
              {t("chat.imageAnnotation.description", {
                name: attachment.filename,
              })}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            aria-label={t("common.close")}
            data-action-ui-id="chat-image-annotation-close"
            onClick={requestClose}
          >
            <Icon icon={X} size="lg" aria-hidden={true} />
          </Button>
          <div
            inert={Boolean(working) || !editorReady}
            className="flex min-h-10 flex-wrap items-center gap-1 border-y border-border px-3 py-2"
          >
            {TOOLS.map((option) => (
              <Button
                key={option.tool}
                type="button"
                variant={activeTool === option.tool ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={t(option.labelKey)}
                title={t(option.labelKey)}
                data-action-ui-id={`chat-image-annotation-tool-${option.tool}`}
                onClick={() => selectTool(option.tool)}
              >
                <Icon icon={option.icon} size="md" aria-hidden={true} />
              </Button>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            {activeTool !== "select" && activeTool !== "mosaic" ? (
              <>
                <fieldset className="flex items-center gap-1">
                  <legend className="sr-only">
                    {t("chat.imageAnnotation.color")}
                  </legend>
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "size-5 rounded-full border border-border outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                        activeColor === color &&
                          "ring-2 ring-ring ring-offset-1 ring-offset-popover",
                      )}
                      style={{
                        backgroundColor: color,
                      }}
                      aria-label={color}
                      data-action-ui-id="chat-image-annotation-color"
                      onClick={() => selectColor(color)}
                    />
                  ))}
                </fieldset>
                <div className="mx-1 h-5 w-px bg-border" />
                <fieldset className="flex items-center gap-1">
                  <legend className="sr-only">
                    {t("imageEdit.strokeWidth")}
                  </legend>
                  {STROKE_WIDTHS.map((width) => (
                    <Button
                      key={width}
                      type="button"
                      variant={
                        activeStrokeWidth === width ? "secondary" : "ghost"
                      }
                      size="icon-sm"
                      aria-label={`${t("imageEdit.strokeWidth")} ${width}`}
                      data-action-ui-id="chat-image-annotation-stroke-width"
                      onClick={() => selectStrokeWidth(width)}
                    >
                      <span
                        className="block w-4 rounded-full bg-current"
                        style={{
                          height: Math.max(1, width / 2),
                        }}
                      />
                    </Button>
                  ))}
                </fieldset>
              </>
            ) : null}
            {activeTool === "mosaic" ? (
              <div className="flex items-center gap-1">
                {["mosaic", "blur"].map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={mosaicMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    data-action-ui-id={`chat-image-annotation-${mode}`}
                    onClick={() => selectMosaicMode(mode)}
                  >
                    {t(
                      mode === "mosaic"
                        ? "imageEdit.mosaicModeMosaic"
                        : "imageEdit.mosaicModeBlur",
                    )}
                  </Button>
                ))}
                {["rectangle", "brush"].map((shape) => (
                  <Button
                    key={shape}
                    type="button"
                    variant={mosaicShape === shape ? "secondary" : "ghost"}
                    size="sm"
                    data-action-ui-id={`chat-image-annotation-mosaic-${shape}`}
                    onClick={() => selectMosaicShape(shape)}
                  >
                    {t(
                      shape === "rectangle"
                        ? "imageEdit.mosaicShapeRect"
                        : "imageEdit.mosaicShapeBrush",
                    )}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!editorState.canUndo || Boolean(working)}
                aria-label={t("imageEdit.undo")}
                title={t("imageEdit.undo")}
                data-action-ui-id="chat-image-annotation-undo"
                onClick={() => editorRef.current?.undo()}
              >
                <Icon icon={Undo2} size="md" aria-hidden={true} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!editorState.canRedo || Boolean(working)}
                aria-label={t("imageEdit.redo")}
                title={t("imageEdit.redo")}
                data-action-ui-id="chat-image-annotation-redo"
                onClick={() => editorRef.current?.redo()}
              >
                <Icon icon={Redo2} size="md" aria-hidden={true} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasChanges || Boolean(working)}
                aria-label={t("imageEdit.clear")}
                title={t("imageEdit.clear")}
                data-action-ui-id="chat-image-annotation-clear"
                onClick={() => editorRef.current?.clear()}
              >
                <Icon icon={Trash2} size="md" aria-hidden={true} />
              </Button>
            </div>
          </div>
          <div
            ref={handleViewportRef}
            data-action-ui-id="chat-image-annotation-stage"
            className="relative flex min-h-0 items-center justify-center overflow-clip bg-muted/40 p-4"
          >
            <div
              className={cn(
                "relative shrink-0 overflow-clip rounded-sm bg-background shadow-sm",
                !displayReady && "invisible",
              )}
              inert={Boolean(working) || !editorReady}
              onPointerDownCapture={(event) => {
                if (operationRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              style={{
                zoom: displayFrame.scale,
              }}
            >
              <ImageEditor
                ref={editorRef}
                src={attachment.previewUrl}
                width={800}
                height={600}
                initialTool="select"
                disableShortcuts={true}
                initialStyle={DEFAULT_STYLE}
                uiScale={displayFrame.scale}
                onReady={handleEditorReady}
                onError={handleLoadError}
              />
            </div>
            {loadFailed ? (
              <div
                role="alert"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-popover p-4 text-sm text-muted-foreground"
              >
                <p>{t("chat.imageAnnotation.loadFailed")}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetryLoad}
                  data-action-ui-id="chat-image-annotation-retry"
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : !displayReady ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                {t("chat.imageAnnotation.loading")}
              </div>
            ) : null}
          </div>
          <DialogFooter className="items-center border-t border-border px-4 py-3 sm:justify-end">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!editorReady || !hasChanges || Boolean(working)}
                loading={working === "export"}
                data-action-ui-id="chat-image-annotation-export"
                onClick={() => void exportLocal()}
              >
                <Icon icon={Download} size="sm" aria-hidden={true} />
                {t("chat.imageAnnotation.export")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={working === "export"}
                onClick={requestClose}
              >
                {t("common.cancel")}
              </Button>
              <div className="flex">
                <Button
                  type="button"
                  className="rounded-r-none"
                  disabled={!canFinish}
                  loading={working === "replace"}
                  data-action-ui-id="chat-image-annotation-replace"
                  onClick={() => requestApply("replace")}
                >
                  {t("chat.imageAnnotation.replace")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        className="rounded-l-none border-l-primary-foreground/25 px-2"
                        disabled={!canFinish}
                        aria-label={t("chat.imageAnnotation.moreActions")}
                        data-action-ui-id="chat-image-annotation-more-actions"
                      />
                    }
                  >
                    <Icon icon={ChevronDown} size="sm" aria-hidden={true} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top">
                    <DropdownMenuItem
                      disabled={!canAppend}
                      data-action-ui-id="chat-image-annotation-append"
                      onClick={() => requestApply("append")}
                    >
                      {t("chat.imageAnnotation.append")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent layer="nested" onKeyDown={handleKeyDown}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("chat.imageAnnotation.discardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.imageAnnotation.discardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              {t("chat.imageAnnotation.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <AlertDialogContent layer="nested" onKeyDown={handleKeyDown}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("chat.imageAnnotation.privacyTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.imageAnnotation.privacyDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void apply("append")}>
              {t("chat.imageAnnotation.appendAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
