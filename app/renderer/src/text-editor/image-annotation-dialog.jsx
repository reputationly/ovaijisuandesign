// image-annotation-dialog.jsx
import {
  ArrowUpRight,
  ChevronDown,
  dedupedToast,
  Grid3X3,
  jsxRuntimeExports,
  Minus,
  reactExports,
  Redo2,
  Tag$1,
  Undo2,
  usePlatform,
  useTranslation,
  X$7,
} from "../vendor.js";
import {
  Brush,
  Circle,
  Download,
  MousePointer2,
  Square,
  Trash2,
  Type$1,
} from "../media-editing/package.jsx";
import { filenameExtension } from "./read-preview-text-response.jsx";
import { DropdownMenu, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AlertDialog,
  Button$1,
  cn$2,
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
    icon: Type$1,
    labelKey: "imageEdit.toolText",
  },
  {
    tool: "tag",
    icon: Tag$1,
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

function getAnnotatedFilename(filename, extension2) {
  const dot2 = filename.lastIndexOf(".");
  const base2 =
    (dot2 > 0 ? filename.slice(0, dot2) : filename).trim() || "image";
  return `${base2}-annotated.${extension2}`;
}

const IMAGE_ANNOTATION_VIEWPORT_INSET = 16;

function observeImageAnnotationViewport(element2, onSize) {
  let disposed = false;
  let frame2 = 0;
  const measure = () => {
    if (disposed) return;
    onSize({
      width: element2.clientWidth,
      height: element2.clientHeight,
    });
  };
  const scheduleMeasure = () => {
    if (disposed || frame2) return;
    if (typeof requestAnimationFrame === "undefined") {
      measure();
      return;
    }
    frame2 = requestAnimationFrame(() => {
      frame2 = 0;
      measure();
    });
  };
  measure();
  scheduleMeasure();
  const observer2 =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleMeasure);
  observer2?.observe(element2);
  return () => {
    disposed = true;
    if (frame2 && typeof cancelAnimationFrame !== "undefined")
      cancelAnimationFrame(frame2);
    observer2?.disconnect();
  };
}

function isUsableSize(size2) {
  return (
    Number.isFinite(size2.width) &&
    Number.isFinite(size2.height) &&
    size2.width > 0 &&
    size2.height > 0
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
  const scale2 = Math.min(
    1,
    availableWidth / editorSize.width,
    availableHeight / editorSize.height,
  );
  return {
    width: editorSize.width * scale2,
    height: editorSize.height * scale2,
    scale: scale2,
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
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
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
    const next2 = {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    };
    if (next2.width <= 0 || next2.height <= 0) return;
    setViewportSize((current2) =>
      current2.width === next2.width && current2.height === next2.height
        ? current2
        : next2,
    );
  }, []);
  const handleViewportRef = reactExports.useCallback((element2) => {
    viewportRef.current = element2;
    setViewportElement((current2) =>
      current2 === element2 ? current2 : element2,
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
    return observeImageAnnotationViewport(viewportElement, (next2) => {
      if (next2.width <= 0 || next2.height <= 0) return;
      setViewportSize((current2) =>
        current2.width === next2.width && current2.height === next2.height
          ? current2
          : next2,
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
  const selectTool = reactExports.useCallback((tool2) => {
    setActiveTool(tool2);
    editorRef.current?.setTool(tool2);
  }, []);
  const selectColor = reactExports.useCallback((color2) => {
    setActiveColor(color2);
    editorRef.current?.setStyle({
      stroke: color2,
    });
  }, []);
  const selectStrokeWidth = reactExports.useCallback((strokeWidth) => {
    setActiveStrokeWidth(strokeWidth);
    editorRef.current?.setStyle({
      strokeWidth,
    });
  }, []);
  const selectMosaicMode = reactExports.useCallback((mode2) => {
    setMosaicMode(mode2);
    editorRef.current?.setStyle({
      mosaicMode: mode2,
    });
  }, []);
  const selectMosaicShape = reactExports.useCallback((shape) => {
    setMosaicShape(shape);
    editorRef.current?.setStyle({
      mosaicShape: shape,
    });
  }, []);
  const exportBlob = reactExports.useCallback(async () => {
    const handle2 = editorRef.current;
    if (!handle2) throw new Error("Image editor is not ready");
    return handle2.toBlob(output.mimeType, output.quality);
  }, [output]);
  const handleKeyDown2 = reactExports.useCallback(
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
      const key2 = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey && (key2 === "z" || key2 === "y")) {
        event.preventDefault();
        if (key2 === "y" || event.shiftKey) editorRef.current?.redo();
        else editorRef.current?.undo();
      } else if (
        !mod &&
        !event.altKey &&
        (key2 === "delete" || key2 === "backspace")
      ) {
        event.preventDefault();
        editorRef.current?.deleteSelected();
      }
    },
    [editorReady, working, discardOpen, privacyOpen],
  );
  const apply2 = reactExports.useCallback(
    async (mode2) => {
      if (operationRef.current || applyDisabled || !editorReady || !hasChanges)
        return;
      const operation = new AbortController();
      operationRef.current = operation;
      setWorking(mode2);
      const timeout2 = window.setTimeout(() => {
        if (operationRef.current !== operation) return;
        operation.abort();
        operationRef.current = null;
        setWorking(null);
        dedupedToast.error(t2("chat.imageAnnotation.saveTimedOut"));
      }, IMAGE_ANNOTATION_SAVE_TIMEOUT_MS);
      const stopTimeout = () => window.clearTimeout(timeout2);
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
        const current2 = applyContextRef.current;
        if (
          current2.applyDisabled ||
          (mode2 === "append" && !current2.canAppend)
        ) {
          dedupedToast.error(t2("chat.imageAnnotation.targetChanged"));
          return;
        }
        const accepted = await current2.onApply(
          attachment,
          file,
          mode2,
          operation.signal,
        );
        if (operation.signal.aborted) return;
        if (!accepted) {
          dedupedToast.error(t2("chat.imageAnnotation.targetChanged"));
          return;
        }
        applyContextRef.current.onClose();
      } catch (error) {
        if (operation.signal.aborted) return;
        void window.hilo?.logger?.error?.(
          `[image-annotation] apply failed: ${getErrorMessage(error)}`,
          "image-annotation",
        );
        dedupedToast.error(t2("chat.imageAnnotation.applyFailed"));
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
      t2,
    ],
  );
  const requestApply = reactExports.useCallback(
    (mode2) => {
      if (mode2 === "append" && hasMosaic) {
        setPrivacyOpen(true);
        return;
      }
      void apply2(mode2);
    },
    [apply2, hasMosaic],
  );
  const exportLocal = reactExports.useCallback(async () => {
    if (operationRef.current || !editorReady || !hasChanges) return;
    const operation = new AbortController();
    operationRef.current = operation;
    setWorking("export");
    try {
      const blob = await exportBlob();
      if (operation.signal.aborted) return;
      if (platform2.fs.showSaveDialog && platform2.fs.writeBinaryFile) {
        const targetPath = await platform2.fs.showSaveDialog({
          defaultPath: outputFilename,
          filters: [
            {
              name: output.extension.toUpperCase(),
              extensions: [output.extension],
            },
          ],
        });
        if (!targetPath || operation.signal.aborted) return;
        const bytes2 = await blob.arrayBuffer();
        if (operation.signal.aborted) return;
        await platform2.fs.writeBinaryFile(targetPath, bytes2);
      } else {
        const url2 = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url2;
        anchor.download = outputFilename;
        anchor.click();
        URL.revokeObjectURL(url2);
      }
      if (!operation.signal.aborted)
        dedupedToast.success(t2("chat.imageAnnotation.exported"));
    } catch (error) {
      if (operation.signal.aborted) return;
      void window.hilo?.logger?.error?.(
        `[image-annotation] export failed: ${getErrorMessage(error)}`,
        "image-annotation",
      );
      dedupedToast.error(t2("chat.imageAnnotation.exportFailed"));
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
    platform2,
    t2,
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
          onKeyDown={handleKeyDown2}
        >
          <DialogHeader className="px-4 pt-4 pr-14">
            <DialogTitle>{t2("chat.imageAnnotation.title")}</DialogTitle>
            <DialogDescription className="truncate">
              {t2("chat.imageAnnotation.description", {
                name: attachment.filename,
              })}
            </DialogDescription>
          </DialogHeader>
          <Button$1
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            aria-label={t2("common.close")}
            data-action-ui-id="chat-image-annotation-close"
            onClick={requestClose}
          >
            <Icon icon={X$7} size="lg" aria-hidden={true} />
          </Button$1>
          <div
            inert={Boolean(working) || !editorReady}
            className="flex min-h-10 flex-wrap items-center gap-1 border-y border-border px-3 py-2"
          >
            {TOOLS.map((option2) => (
              <Button$1
                key={option2.tool}
                type="button"
                variant={activeTool === option2.tool ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={t2(option2.labelKey)}
                title={t2(option2.labelKey)}
                data-action-ui-id={`chat-image-annotation-tool-${option2.tool}`}
                onClick={() => selectTool(option2.tool)}
              >
                <Icon icon={option2.icon} size="md" aria-hidden={true} />
              </Button$1>
            ))}
            <div className="mx-1 h-5 w-px bg-border" />
            {activeTool !== "select" && activeTool !== "mosaic" ? (
              <>
                <fieldset className="flex items-center gap-1">
                  <legend className="sr-only">
                    {t2("chat.imageAnnotation.color")}
                  </legend>
                  {COLORS.map((color2) => (
                    <button
                      key={color2}
                      type="button"
                      className={cn$2(
                        "size-5 rounded-full border border-border outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                        activeColor === color2 &&
                          "ring-2 ring-ring ring-offset-1 ring-offset-popover",
                      )}
                      style={{
                        backgroundColor: color2,
                      }}
                      aria-label={color2}
                      data-action-ui-id="chat-image-annotation-color"
                      onClick={() => selectColor(color2)}
                    />
                  ))}
                </fieldset>
                <div className="mx-1 h-5 w-px bg-border" />
                <fieldset className="flex items-center gap-1">
                  <legend className="sr-only">
                    {t2("imageEdit.strokeWidth")}
                  </legend>
                  {STROKE_WIDTHS.map((width) => (
                    <Button$1
                      key={width}
                      type="button"
                      variant={
                        activeStrokeWidth === width ? "secondary" : "ghost"
                      }
                      size="icon-sm"
                      aria-label={`${t2("imageEdit.strokeWidth")} ${width}`}
                      data-action-ui-id="chat-image-annotation-stroke-width"
                      onClick={() => selectStrokeWidth(width)}
                    >
                      <span
                        className="block w-4 rounded-full bg-current"
                        style={{
                          height: Math.max(1, width / 2),
                        }}
                      />
                    </Button$1>
                  ))}
                </fieldset>
              </>
            ) : null}
            {activeTool === "mosaic" ? (
              <div className="flex items-center gap-1">
                {["mosaic", "blur"].map((mode2) => (
                  <Button$1
                    key={mode2}
                    type="button"
                    variant={mosaicMode === mode2 ? "secondary" : "ghost"}
                    size="sm"
                    data-action-ui-id={`chat-image-annotation-${mode2}`}
                    onClick={() => selectMosaicMode(mode2)}
                  >
                    {t2(
                      mode2 === "mosaic"
                        ? "imageEdit.mosaicModeMosaic"
                        : "imageEdit.mosaicModeBlur",
                    )}
                  </Button$1>
                ))}
                {["rectangle", "brush"].map((shape) => (
                  <Button$1
                    key={shape}
                    type="button"
                    variant={mosaicShape === shape ? "secondary" : "ghost"}
                    size="sm"
                    data-action-ui-id={`chat-image-annotation-mosaic-${shape}`}
                    onClick={() => selectMosaicShape(shape)}
                  >
                    {t2(
                      shape === "rectangle"
                        ? "imageEdit.mosaicShapeRect"
                        : "imageEdit.mosaicShapeBrush",
                    )}
                  </Button$1>
                ))}
              </div>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              <Button$1
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!editorState.canUndo || Boolean(working)}
                aria-label={t2("imageEdit.undo")}
                title={t2("imageEdit.undo")}
                data-action-ui-id="chat-image-annotation-undo"
                onClick={() => editorRef.current?.undo()}
              >
                <Icon icon={Undo2} size="md" aria-hidden={true} />
              </Button$1>
              <Button$1
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!editorState.canRedo || Boolean(working)}
                aria-label={t2("imageEdit.redo")}
                title={t2("imageEdit.redo")}
                data-action-ui-id="chat-image-annotation-redo"
                onClick={() => editorRef.current?.redo()}
              >
                <Icon icon={Redo2} size="md" aria-hidden={true} />
              </Button$1>
              <Button$1
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasChanges || Boolean(working)}
                aria-label={t2("imageEdit.clear")}
                title={t2("imageEdit.clear")}
                data-action-ui-id="chat-image-annotation-clear"
                onClick={() => editorRef.current?.clear()}
              >
                <Icon icon={Trash2} size="md" aria-hidden={true} />
              </Button$1>
            </div>
          </div>
          <div
            ref={handleViewportRef}
            data-action-ui-id="chat-image-annotation-stage"
            className="relative flex min-h-0 items-center justify-center overflow-clip bg-muted/40 p-4"
          >
            <div
              className={cn$2(
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
                <p>{t2("chat.imageAnnotation.loadFailed")}</p>
                <Button$1
                  type="button"
                  variant="outline"
                  onClick={handleRetryLoad}
                  data-action-ui-id="chat-image-annotation-retry"
                >
                  {t2("common.retry")}
                </Button$1>
              </div>
            ) : !displayReady ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                {t2("chat.imageAnnotation.loading")}
              </div>
            ) : null}
          </div>
          <DialogFooter className="items-center border-t border-border px-4 py-3 sm:justify-end">
            <div className="flex items-center gap-2">
              <Button$1
                type="button"
                variant="outline"
                disabled={!editorReady || !hasChanges || Boolean(working)}
                loading={working === "export"}
                data-action-ui-id="chat-image-annotation-export"
                onClick={() => void exportLocal()}
              >
                <Icon icon={Download} size="sm" aria-hidden={true} />
                {t2("chat.imageAnnotation.export")}
              </Button$1>
              <Button$1
                type="button"
                variant="outline"
                disabled={working === "export"}
                onClick={requestClose}
              >
                {t2("common.cancel")}
              </Button$1>
              <div className="flex">
                <Button$1
                  type="button"
                  className="rounded-r-none"
                  disabled={!canFinish}
                  loading={working === "replace"}
                  data-action-ui-id="chat-image-annotation-replace"
                  onClick={() => requestApply("replace")}
                >
                  {t2("chat.imageAnnotation.replace")}
                </Button$1>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button$1
                        type="button"
                        className="rounded-l-none border-l-primary-foreground/25 px-2"
                        disabled={!canFinish}
                        aria-label={t2("chat.imageAnnotation.moreActions")}
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
                      {t2("chat.imageAnnotation.append")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent layer="nested" onKeyDown={handleKeyDown2}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("chat.imageAnnotation.discardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("chat.imageAnnotation.discardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              {t2("chat.imageAnnotation.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <AlertDialogContent layer="nested" onKeyDown={handleKeyDown2}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("chat.imageAnnotation.privacyTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("chat.imageAnnotation.privacyDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void apply2("append")}>
              {t2("chat.imageAnnotation.appendAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
