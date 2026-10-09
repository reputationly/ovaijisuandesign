// text-hover-preview.jsx
import { reactDomExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TextPreviewContent, usePreviewText } from "./use-preview-text.jsx";
import { useCanvasBridge } from "./package.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { useHoverPreview } from "./use-hover-preview.js";

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
  const loader2 =
    providedLoader ?? bridge.loadPreviewTextContent ?? bridge.loadTextContent;
  const state2 = usePreviewText(
    path2,
    loader2,
    effectiveActive && !metadataOnly,
  );
  const [previewHeight, setPreviewHeight] =
    reactExports.useState(PREVIEW_MAX_H);
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
    const height =
      preview.offsetHeight - content2.clientHeight + content2.scrollHeight;
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
