// browser-annotation-editor.jsx
import {
  Check,
  LoaderCircle,
  reactExports,
  Send,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { ImageEditor } from "../media-editing/image-editor.jsx";
const ANNOTATION_STROKE = "#6D6CFF";
const ANNOTATION_FILL = "transparent";
const TAG_BACKGROUND = "#E9E8FF";
const TAG_TEXT_COLOR = "#4542B8";
const MIN_RECTANGLE_SIZE = 8;
const ANNOTATION_STROKE_WIDTH = 5;
const DEFAULT_IMAGE_SIZE = {
  width: 1200,
  height: 800,
};
function sameBounds(a, b) {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  );
}
function resolveDisplaySize(imageSize, stageSize) {
  const source = imageSize ?? DEFAULT_IMAGE_SIZE;
  const availableWidth =
    stageSize.width > 0 ? Math.max(1, stageSize.width) : source.width;
  const availableHeight =
    stageSize.height > 0 ? Math.max(1, stageSize.height) : source.height;
  const scale = Math.min(
    1,
    availableWidth / source.width,
    availableHeight / source.height,
  );
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
    scale,
  };
}
function buildTagData(id, text, bounds, imageSize) {
  const fontSize = 18;
  const longestLine = Math.max(
    ...text.split("\n").map((line) => line.length),
    1,
  );
  const estimatedWidth = Math.max(
    96,
    Math.min(imageSize.width * 0.48, longestLine * fontSize * 0.62 + 28),
  );
  const estimatedHeight = Math.max(
    34,
    text.split("\n").length * fontSize * 1.4 + 8,
  );
  const gap = 14;
  const canPlaceRight =
    bounds.x + bounds.width + gap + estimatedWidth <= imageSize.width - 4;
  const cardX = canPlaceRight
    ? bounds.x + bounds.width + gap
    : Math.max(4, bounds.x - gap - estimatedWidth);
  const cardY = Math.max(
    4,
    Math.min(
      imageSize.height - estimatedHeight - 4,
      bounds.y + bounds.height - estimatedHeight,
    ),
  );
  const anchorX = canPlaceRight ? cardX - 8 : cardX + estimatedWidth + 8;
  const anchorY = Math.max(
    cardY + 8,
    Math.min(cardY + estimatedHeight - 8, bounds.y + bounds.height * 0.78),
  );
  return {
    id,
    type: "tag",
    anchorX,
    anchorY,
    x: cardX,
    y: cardY,
    width: estimatedWidth,
    height: estimatedHeight,
    // 标签宽度固定上限，长数字/中文由 TagShape 在卡片内换行。
    maxWidth: Math.max(
      96,
      Math.min(imageSize.width * 0.48, imageSize.width - 16),
    ),
    text,
    style: {
      stroke: ANNOTATION_STROKE,
      strokeWidth: ANNOTATION_STROKE_WIDTH,
      tagBackground: TAG_BACKGROUND,
      tagTextColor: TAG_TEXT_COLOR,
      tagAnchorRadius: Math.max(3, fontSize * 0.12),
      fontSize,
      fontWeight: 600,
    },
  };
}
const DRAFT_RECTANGLE_STYLE = {
  // Keep the outline visible without tinting the underlying website content.
  stroke: ANNOTATION_STROKE,
  fill: ANNOTATION_FILL,
  strokeWidth: ANNOTATION_STROKE_WIDTH,
  selectionStroke: "transparent",
  selectionLineDash: [],
  selectionHandleStroke: "#FFFFFF",
  selectionHandleFill: ANNOTATION_STROKE,
};
const COMMITTED_RECTANGLE_STYLE = {
  stroke: ANNOTATION_STROKE,
  fill: ANNOTATION_FILL,
  strokeWidth: ANNOTATION_STROKE_WIDTH,
  selectionStroke: "transparent",
  selectionLineDash: [],
  selectionHandleStroke: "#FFFFFF",
  selectionHandleFill: ANNOTATION_STROKE,
};
function commentLengthBucket(commentLength) {
  if (commentLength <= 20) return "1_20";
  if (commentLength <= 100) return "21_100";
  return "101_plus";
}
function AnnotationHeaderButton({
  actionId,
  label,
  disabled = false,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={actionId}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="browser-annotation-header-button flex size-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}
function DraftCommentInput({
  bounds,
  scale,
  canvasWidth,
  canvasHeight,
  value,
  onChange,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const box = {
    left: bounds.x * scale,
    top: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
  const inputWidth = Math.max(180, Math.min(420, canvasWidth - 16));
  const inputHeight = 50;
  const gap = 14;
  const edgeInset = 8;
  let left = box.left + (box.width - inputWidth) / 2;
  left = Math.max(
    edgeInset,
    Math.min(left, Math.max(edgeInset, canvasWidth - inputWidth - edgeInset)),
  );
  let popoverTop = box.top + box.height + gap;
  if (popoverTop + inputHeight > canvasHeight - edgeInset) {
    popoverTop = box.top - gap - inputHeight;
  }
  popoverTop = Math.max(
    edgeInset,
    Math.min(popoverTop, Math.max(edgeInset, canvasHeight - inputHeight - edgeInset)),
  );
  return (
    <form
      className="browser-annotation-comment absolute z-20 flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-lg"
      style={{
        left,
        top: popoverTop,
        width: inputWidth,
        minHeight: inputHeight,
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <textarea
        ref={inputRef}
        value={value}
        rows={1}
        data-action-ui-id="browser.annotation-comment"
        aria-label={t("workspace.browser.annotationComment", {
          defaultValue: "批注内容",
        })}
        placeholder={t("workspace.browser.annotationCommentPlaceholder", {
          defaultValue: "添加批注…",
        })}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          } else if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing &&
            event.keyCode !== 229
          ) {
            event.preventDefault();
            onConfirm();
          }
        }}
        className="min-h-8 min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-2 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-foreground/30"
      />
      <button
        type="submit"
        data-action-ui-id="browser.annotation-add"
        aria-label={t("workspace.browser.annotationConfirm", {
          defaultValue: "确认批注",
        })}
        title={t("workspace.browser.annotationConfirm", {
          defaultValue: "确认批注",
        })}
        disabled={!value.trim()}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Icon icon={Check} size="sm" />
      </button>
    </form>
  );
}
function boundsForShape(shape) {
  if (shape.type !== "rectangle") return null;
  const rectangle = shape;
  return {
    x: rectangle.width >= 0 ? rectangle.x : rectangle.x + rectangle.width,
    y: rectangle.height >= 0 ? rectangle.y : rectangle.y + rectangle.height,
    width: Math.abs(rectangle.width),
    height: Math.abs(rectangle.height),
  };
}
export function BrowserAnnotationEditor({
  src,
  viewportSize,
  title,
  onClose,
  onSend,
}) {
  const { t } = useTranslation();
  const editorRef = reactExports.useRef(null);
  const stageRef = reactExports.useRef(null);
  const shapeAddCleanupRef = reactExports.useRef(null);
  const draftRef = reactExports.useRef(null);
  const annotationsRef = reactExports.useRef([]);
  const annotationSequenceRef = reactExports.useRef(0);
  const [imageSize, setImageSize] = reactExports.useState(null);
  const [stageSize, setStageSize] = reactExports.useState({
    width: 0,
    height: 0,
  });
  const [draft, setDraft] = reactExports.useState(null);
  const [annotations, setAnnotations] = reactExports.useState([]);
  const [editorReady, setEditorReady] = reactExports.useState(false);
  const [sending, setSending] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let disposed = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      const width =
        viewportSize?.width ??
        (Number.isFinite(image.naturalWidth) && image.naturalWidth > 0
          ? image.naturalWidth
          : DEFAULT_IMAGE_SIZE.width);
      const height =
        viewportSize?.height ??
        (Number.isFinite(image.naturalHeight) && image.naturalHeight > 0
          ? image.naturalHeight
          : DEFAULT_IMAGE_SIZE.height);
      setImageSize({
        width,
        height,
      });
    };
    image.onerror = () => {
      if (!disposed) setImageSize(DEFAULT_IMAGE_SIZE);
    };
    image.src = src;
    return () => {
      disposed = true;
    };
  }, [src, viewportSize]);
  reactExports.useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({
        width: rect.width,
        height: rect.height,
      });
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  reactExports.useEffect(
    () => () => {
      shapeAddCleanupRef.current?.();
      shapeAddCleanupRef.current = null;
    },
    [],
  );
  const handleEditorChange = reactExports.useCallback((nextState) => {
    if (nextState.tool === "select" && !draftRef.current) {
      queueMicrotask(() => {
        const editor = editorRef.current?.getEditor();
        if (editor?.getTool() === "select" && !draftRef.current) {
          editor.setTool("rectangle");
        }
      });
    }
    const currentDraft = draftRef.current;
    if (currentDraft) {
      const currentShape = nextState.shapes.find(
        (shape) => shape.id === currentDraft.rectangleId,
      );
      const nextBounds = currentShape ? boundsForShape(currentShape) : null;
      if (!nextBounds) {
        draftRef.current = null;
        setDraft(null);
      } else if (!sameBounds(currentDraft.bounds, nextBounds)) {
        const nextDraft = {
          ...currentDraft,
          bounds: nextBounds,
        };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
      }
    }
    const liveIds = new Set(nextState.shapes.map((shape) => shape.id));
    const currentAnnotations = annotationsRef.current;
    const remaining = currentAnnotations
      .filter(
        (annotation) =>
          liveIds.has(annotation.rectangleId) && liveIds.has(annotation.tagId),
      )
      .map((annotation) => {
        const tag = nextState.shapes.find(
          (shape) => shape.id === annotation.tagId,
        );
        return tag?.type === "tag" && tag.text !== annotation.comment
          ? {
              ...annotation,
              comment: tag.text,
            }
          : annotation;
      });
    if (
      remaining.length !== currentAnnotations.length ||
      remaining.some(
        (annotation, index) =>
          annotation.comment !== currentAnnotations[index]?.comment,
      )
    ) {
      annotationsRef.current = remaining;
      setAnnotations(remaining);
    }
  }, []);
  const handleEditorReady = reactExports.useCallback(() => {
    setEditorReady(true);
    const editor = editorRef.current?.getEditor();
    if (!editor) return;
    shapeAddCleanupRef.current?.();
    shapeAddCleanupRef.current = editor.on("shape:add", (shape) => {
      if (shape.type !== "rectangle" || draftRef.current) return;
      const bounds = boundsForShape(shape);
      if (
        !bounds ||
        bounds.width < MIN_RECTANGLE_SIZE ||
        bounds.height < MIN_RECTANGLE_SIZE
      )
        return;
      const nextDraft = {
        rectangleId: shape.id,
        bounds,
        comment: "",
      };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      editor.select(shape.id);
      editor.setTool("select");
    });
  }, []);
  reactExports.useEffect(() => {
    const rectangleId = draft?.rectangleId;
    if (!rectangleId) return;
    let frameId = null;
    const syncBounds = () => {
      const editor = editorRef.current?.getEditor();
      const shape = editor
        ?.getState()
        .shapes.find((item) => item.id === rectangleId);
      const nextBounds = shape ? boundsForShape(shape) : null;
      const currentDraft = draftRef.current;
      if (!nextBounds || !currentDraft) return;
      if (!sameBounds(currentDraft.bounds, nextBounds)) {
        const nextDraft = {
          ...currentDraft,
          bounds: nextBounds,
        };
        draftRef.current = nextDraft;
        setDraft(nextDraft);
      }
      frameId = requestAnimationFrame(syncBounds);
    };
    frameId = requestAnimationFrame(syncBounds);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [draft?.rectangleId]);
  const updateDraftComment = reactExports.useCallback((comment) => {
    const currentDraft = draftRef.current;
    if (!currentDraft) return;
    const nextDraft = {
      ...currentDraft,
      comment,
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, []);
  const cancelDraft = reactExports.useCallback(() => {
    const currentDraft = draftRef.current;
    const editor = editorRef.current?.getEditor();
    draftRef.current = null;
    setDraft(null);
    if (editor && currentDraft) {
      editor.select(currentDraft.rectangleId);
      editor.deleteSelected();
    }
    editor?.setTool("rectangle");
    editor?.setStyle(DRAFT_RECTANGLE_STYLE);
  }, []);
  reactExports.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.isComposing ||
        (event.key !== "Delete" && event.key !== "Backspace")
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const editor = editorRef.current?.getEditor();
      const selected = editor?.getSelectedShape();
      if (!editor || !selected) return;
      const currentDraft = draftRef.current;
      if (currentDraft?.rectangleId === selected.id) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDraft();
        return;
      }
      const annotation = annotationsRef.current.find(
        (item) =>
          item.rectangleId === selected.id || item.tagId === selected.id,
      );
      if (!annotation) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      editor.deleteShapes([annotation.rectangleId, annotation.tagId]);
      editor.select(null);
      editor.setTool("rectangle");
      editor.setStyle(DRAFT_RECTANGLE_STYLE);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [cancelDraft]);
  const confirmDraft = reactExports.useCallback(() => {
    const currentDraft = draftRef.current;
    const editor = editorRef.current?.getEditor();
    const comment = currentDraft?.comment.trim() ?? "";
    if (!currentDraft || !editor || !comment) return;
    const rectangle = editor
      .getState()
      .shapes.find((shape) => shape.id === currentDraft.rectangleId);
    const bounds = rectangle ? boundsForShape(rectangle) : null;
    if (!rectangle || rectangle.type !== "rectangle" || !bounds) return;
    const sequence = ++annotationSequenceRef.current;
    const tagId = `browser-annotation-tag-${Date.now().toString(36)}-${sequence}`;
    const tag = buildTagData(
      tagId,
      comment,
      bounds,
      imageSize ?? DEFAULT_IMAGE_SIZE,
    );
    editor.select(currentDraft.rectangleId);
    editor.setStyle(COMMITTED_RECTANGLE_STYLE);
    draftRef.current = null;
    setDraft(null);
    editor.addShape(tag);
    editor.select(null);
    editor.setStyle(DRAFT_RECTANGLE_STYLE);
    editor.setTool("rectangle");
    const nextAnnotation = {
      id: `browser-annotation-${sequence}`,
      rectangleId: currentDraft.rectangleId,
      tagId,
      comment,
    };
    const nextAnnotations = [...annotationsRef.current, nextAnnotation];
    annotationsRef.current = nextAnnotations;
    setAnnotations(nextAnnotations);
    trackEvent(TRACK_EVENTS.BROWSER_ANNOTATION_ACTION, {
      action: "add",
      annotation_count: nextAnnotations.length,
      comment_length_bucket: commentLengthBucket(comment.length),
      result: "success",
    });
  }, [imageSize]);
  const sendAnnotations = reactExports.useCallback(async () => {
    if (sending || annotationsRef.current.length === 0) return;
    const dataUrl = editorRef.current?.toDataURL("image/png");
    if (!dataUrl) return;
    setSending(true);
    try {
      await onSend(dataUrl);
      trackEvent(TRACK_EVENTS.BROWSER_ANNOTATION_ACTION, {
        action: "attach_to_chat",
        annotation_count: annotationsRef.current.length,
        result: "success",
      });
    } catch (error) {
      trackEvent(TRACK_EVENTS.BROWSER_ANNOTATION_ACTION, {
        action: "attach_to_chat",
        annotation_count: annotationsRef.current.length,
        result: "failed",
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [onSend, sending]);
  const closeEditor = reactExports.useCallback(async () => {
    const annotationCount = annotationsRef.current.length;
    try {
      await onClose();
      trackEvent(TRACK_EVENTS.BROWSER_ANNOTATION_ACTION, {
        action: "exit",
        annotation_count: annotationCount,
        result: "success",
      });
    } catch (error) {
      trackEvent(TRACK_EVENTS.BROWSER_ANNOTATION_ACTION, {
        action: "exit",
        annotation_count: annotationCount,
        result: "failed",
      });
      throw error;
    }
  }, [onClose]);
  const display = resolveDisplaySize(imageSize, stageSize);
  return (
    <section
      className="flex min-h-0 flex-1 flex-col bg-background"
      aria-label={t("workspace.browser.annotation", {
        defaultValue: "批注",
      })}
    >
      <div
        className="browser-annotation-header flex h-12 shrink-0 items-center justify-between gap-2 px-2"
        data-action-ui-id="browser.annotation-toolbar"
        data-annotation-interaction="unified"
        data-annotation-count={annotations.length}
      >
        <div className="flex shrink-0 items-center gap-1">
          <AnnotationHeaderButton
            actionId="browser.annotation-exit"
            label={t("workspace.browser.annotationClose", {
              defaultValue: "退出批注",
            })}
            onClick={() => void closeEditor()}
          >
            <Icon icon={X} size="md" />
          </AnnotationHeaderButton>
        </div>
        <div className="min-w-0 flex-1 truncate text-center text-sm font-medium">
          {t("workspace.browser.annotationTitle", {
            defaultValue: "正在批注 · {{site}}",
            site: title,
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            data-action-ui-id="browser.annotation-send"
            aria-label={t("workspace.browser.annotationSend", {
              defaultValue: "发送批注",
            })}
            title={t("workspace.browser.annotationSend", {
              defaultValue: "发送批注",
            })}
            disabled={annotations.length === 0 || sending || !editorReady}
            onClick={() => void sendAnnotations()}
            className="browser-annotation-send flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <Icon icon={LoaderCircle} size="sm" className="animate-spin" />
            ) : (
              <Icon icon={Send} size="sm" />
            )}
            <span>
              {t("workspace.browser.annotationSend", {
                defaultValue: "发送",
              })}
            </span>
            <span className="tabular-nums">{annotations.length}</span>
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 overflow-auto bg-muted/30"
      >
        {imageSize ? (
          <div className="flex min-h-full min-w-full items-start justify-center">
            <div
              className="browser-annotation-canvas-wrap relative shrink-0"
              style={{
                width: display.width,
                height: display.height,
              }}
              data-browser-annotation-canvas="true"
              data-annotation-count={annotations.length}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  transform: `scale(${display.scale})`,
                }}
              >
                <ImageEditor
                  ref={editorRef}
                  src={src}
                  width={imageSize.width}
                  height={imageSize.height}
                  initialTool="rectangle"
                  initialStyle={DRAFT_RECTANGLE_STYLE}
                  onChange={handleEditorChange}
                  onReady={handleEditorReady}
                  className="browser-annotation-image-editor"
                />
              </div>
              {draft && (
                <DraftCommentInput
                  bounds={draft.bounds}
                  scale={display.scale}
                  canvasWidth={display.width}
                  canvasHeight={display.height}
                  value={draft.comment}
                  onChange={updateDraftComment}
                  onConfirm={confirmDraft}
                  onCancel={cancelDraft}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            <Icon icon={LoaderCircle} size="md" className="mr-2 animate-spin" />
            {t("workspace.browser.annotationLoading", {
              defaultValue: "正在准备截图…",
            })}
          </div>
        )}
      </div>
    </section>
  );
}
