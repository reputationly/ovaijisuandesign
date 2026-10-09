// canvas-redraw-overlay.jsx
import { jsxRuntimeExports, useTranslation, reactExports, CompositedSvg, useAssetMetadataStore, useStore$3, Node$3, mergeAttributes } from "../vendor.js";
import { BAR_GAP, insertCanvasRedrawRegion, REDRAW_HIGHLIGHT_CSS_COLOR, REDRAW_HIGHLIGHT_UI_OPACITY, TOP_BAR_MIN_WIDTH, BOTTOM_BAR_MIN_WIDTH, BOTTOM_BAR_MAX_WIDTH, TOP_BAR_HEIGHT } from "../m15/node-tag-rings-canvas.jsx";
import { useCanvasBridge } from "../m15/parse-item.jsx";
import { useCropViewportZoom } from "../m15/use-file-bytes.js";
import { selectionToNormalizedBBox, useImageErase, useImageMaskPainter } from "../m15/use-image-mask-painter.js";
import { useRedrawState } from "../m15/use-multi-image-actions.js";
import { extractCanvasEditorText } from "../m01/use-assets-ref-validate.js";
import {
  CloseIcon$1,
  SendArrowIcon,
  PaperclipIcon$1,
  ImagePlaceholderIcon,
} from "../m01/generating-media-area.jsx";
import { buildThumbnailUrl } from "../m02/media-clip-panel-inner.jsx";
import { CreditCostBadge } from "../m01/create-tracker.jsx";
import { useImageEditCost, SEEDREAM_REDRAW_PRICING_MODEL_ID } from "../m03/calc-crop-rect.jsx";
import { RichPromptInput } from "../m02/rich-prompt-input.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { BananaResolutionPicker, CanvasEraseTopBar } from "./canvas-crop-overlay.jsx";
export function ImageIcon$1({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.4248 7.70801C8.23163 7.38605 7.76543 7.38392 7.56934 7.7041L2.3418 16.2393C2.13811 16.5724 2.378 17 2.76855 17H17.3525C17.7602 17 17.996 16.5386 17.7578 16.208L14.4053 11.5625C14.2057 11.286 13.7943 11.286 13.5947 11.5625L12.0342 13.7236L8.4248 7.70801ZM14.5 4C13.6716 4 13 4.67157 13 5.5C13 6.32843 13.6716 7 14.5 7C15.3284 7 16 6.32843 16 5.5C16 4.67157 15.3284 4 14.5 4Z" />
    </CompositedSvg>
  );
}
const CORNER_CLASSES = {
  tl: "absolute -left-[2px] -top-[2px] h-6 w-6 cursor-nw-resize z-10",
  tr: "absolute -right-[2px] -top-[2px] h-6 w-6 cursor-ne-resize z-10",
  bl: "absolute -bottom-[2px] -left-[2px] h-6 w-6 cursor-sw-resize z-10",
  br: "absolute -bottom-[2px] -right-[2px] h-6 w-6 cursor-se-resize z-10",
};
const CORNER_LINES = {
  tl: ["absolute left-0 top-0 h-[3px] w-full", "absolute left-0 top-0 h-full w-[3px]"],
  tr: ["absolute right-0 top-0 h-[3px] w-full", "absolute right-0 top-0 h-full w-[3px]"],
  bl: ["absolute bottom-0 left-0 h-[3px] w-full", "absolute bottom-0 left-0 h-full w-[3px]"],
  br: ["absolute bottom-0 right-0 h-[3px] w-full", "absolute bottom-0 right-0 h-full w-[3px]"],
};
export function CornerHandle({ position: position2, onPointerDown: onPointerDown2 }) {
  const [lineA, lineB] = CORNER_LINES[position2];
  const lineStyle = {
    background: "var(--canvas-node-border-selected, #141414)",
  };
  return (
    <div
      className={CORNER_CLASSES[position2]}
      onPointerDown={(e2) => onPointerDown2(e2, position2)}
    >
      <div className={lineA} style={lineStyle} />
      <div className={lineB} style={lineStyle} />
    </div>
  );
}
const EDGE_CLASSES = {
  t: "absolute -top-[2px] left-6 right-6 h-[12px] -mt-[5px] cursor-n-resize z-10 flex items-center justify-center",
  b: "absolute -bottom-[2px] left-6 right-6 h-[12px] -mb-[5px] cursor-s-resize z-10 flex items-center justify-center",
  l: "absolute -left-[2px] top-6 bottom-6 w-[12px] -ml-[5px] cursor-w-resize z-10 flex items-center justify-center",
  r: "absolute -right-[2px] top-6 bottom-6 w-[12px] -mr-[5px] cursor-e-resize z-10 flex items-center justify-center",
};
const EDGE_BAR_CLASSES = {
  t: "h-[3px] w-8 rounded-full",
  b: "h-[3px] w-8 rounded-full",
  l: "h-8 w-[3px] rounded-full",
  r: "h-8 w-[3px] rounded-full",
};
export function EdgeHandle({ position: position2, onPointerDown: onPointerDown2 }) {
  return (
    <div className={EDGE_CLASSES[position2]} onPointerDown={(e2) => onPointerDown2(e2, position2)}>
      <div
        className={EDGE_BAR_CLASSES[position2]}
        style={{
          background: "var(--canvas-node-border-selected, #141414)",
        }}
      />
    </div>
  );
}
const CanvasRedrawRegionNode = Node$3.create({
  name: "canvasRedrawRegion",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      x1: {
        default: 0,
      },
      y1: {
        default: 0,
      },
      x2: {
        default: 999,
      },
      y2: {
        default: 999,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-canvas-redraw-region]",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { x1, y1, x2, y2: y22 } = HTMLAttributes;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-redraw-region": "",
        "aria-label": `选区 ${x1},${y1} - ${x2},${y22}`,
        contenteditable: "false",
        class: "canvas-redraw-region-chip",
      }),
      `选区 ${x1},${y1} - ${x2},${y22}`,
    ];
  },
});
function loadImage(url2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url2}`));
    img.src = url2;
  });
}
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/png",
      1,
    );
  });
}
export async function loadSourceAsPngBlob(srcImageUrl, opts) {
  const srcImg = await loadImage(srcImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = srcImg.naturalWidth;
  canvas.height = srcImg.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context for source encode");
  if (opts?.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(srcImg, 0, 0);
  return canvasToPngBlob(canvas);
}
export async function compositeOutpaintCanvas(srcImageUrl, params) {
  const srcImg = await loadImage(srcImageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = params.targetWidth;
  canvas.height = params.targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context for outpaint composite");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(srcImg, params.offsetX, params.offsetY, srcImg.naturalWidth, srcImg.naturalHeight);
  return canvasToPngBlob(canvas);
}
const CanvasRedrawBottomBar = reactExports.memo(function CanvasRedrawBottomBar2({
  hasRegions,
  submitting,
  onSend,
  resolution,
  onResolutionChange,
  onEditorReady,
}) {
  const { t: t2 } = useTranslation();
  const { pickAsset } = useCanvasBridge();
  const [prompt, setPrompt] = reactExports.useState("");
  const [attachments, setAttachments] = reactExports.useState([]);
  const redrawExtensions = reactExports.useMemo(() => [CanvasRedrawRegionNode], []);
  const seedreamRefCount = 1 + attachments.length;
  const creditCost = useImageEditCost(
    "redraw",
    resolution,
    SEEDREAM_REDRAW_PRICING_MODEL_ID,
    seedreamRefCount,
  );
  const editorRef = reactExports.useRef(null);
  const trimmed = prompt.replace(/<bbox>[^<]*<\/bbox>/g, "").trim();
  const compiledPrompt = prompt.trim();
  const canSend = hasRegions && trimmed.length > 0 && !submitting;
  const disabledReason = reactExports.useMemo(() => {
    if (canSend) return null;
    if (submitting) return t2("canvas.redraw.disabled.submitting");
    if (!hasRegions && trimmed.length === 0) {
      return t2("canvas.redraw.disabled.noStrokesAndPrompt");
    }
    if (!hasRegions) {
      return t2("canvas.redraw.disabled.noStrokes");
    }
    return t2("canvas.redraw.disabled.noPrompt");
  }, [canSend, submitting, hasRegions, trimmed.length, t2]);
  const [sendBtnHover, setSendBtnHover] = reactExports.useState(false);
  const showDisabledTooltip = sendBtnHover && disabledReason !== null;
  const handleSend = reactExports.useCallback(() => {
    if (!canSend) return;
    onSend(compiledPrompt, attachments);
  }, [canSend, compiledPrompt, attachments, onSend]);
  const handlePromptUpdate = reactExports.useCallback((_hasContent) => {
    if (!editorRef.current) return;
    setPrompt(extractCanvasEditorText(editorRef.current));
  }, []);
  const openPicker = reactExports.useCallback(async () => {
    if (!pickAsset) {
      return;
    }
    try {
      const resources = await pickAsset({
        type: "image",
        existingAssetIds: attachments.map((a2) => a2.assetId),
        uploadMode: "attach",
        tabs: ["canvas", "upload"],
      });
      if (!resources || resources.length === 0) return;
      const picked = resources[0];
      if (picked.type !== "image") return;
      setAttachments([
        {
          assetId: picked.assetId,
          name: picked.name,
        },
      ]);
    } catch (err) {
      if (err?.code === "picker_busy") return;
      console.warn("[redraw-bottom-bar] pickAsset rejected", err);
    }
  }, [pickAsset, attachments]);
  const removeAttachment2 = reactExports.useCallback(() => {
    setAttachments([]);
  }, []);
  return (
    <>
      <div
        className="flex w-full flex-col gap-2 rounded-lg border p-3"
        style={{
          background: "var(--canvas-controls-bg, #262626)",
          borderColor: "var(--canvas-controls-border, #363636)",
          boxShadow: "var(--canvas-shadow-dropdown)",
          color: "var(--canvas-controls-text, #fff)",
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
      >
        <div className="min-h-10 max-h-32 w-full text-[13px] leading-[18px]">
          <RichPromptInput
            extraExtensions={redrawExtensions}
            editorRef={editorRef}
            onEditorReady={onEditorReady}
            onUpdate={handlePromptUpdate}
            onClose={() => void 0}
            placeholder={t2("canvas.redraw.placeholder")}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex w-10 shrink-0 justify-center">
            {attachments.length > 0 ? (
              <AttachmentThumb attachment={attachments[0]} onRemove={removeAttachment2} />
            ) : (
              <button
                type="button"
                onClick={() => {
                  void openPicker();
                }}
                title={t2("canvas.redraw.addAttachment")}
                aria-label={t2("canvas.redraw.addAttachment")}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150"
                style={{
                  color: "var(--canvas-controls-text, #fff)",
                }}
                onMouseEnter={(e2) => {
                  e2.currentTarget.style.background = "var(--canvas-controls-active, #ffffff1a)";
                }}
                onMouseLeave={(e2) => {
                  e2.currentTarget.style.background = "transparent";
                }}
              >
                <PaperclipIcon$1 />
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <BananaResolutionPicker
              value={resolution}
              onChange={onResolutionChange}
              disabled={submitting}
              options={["1K", "2K"]}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCostBadge
              cost={creditCost}
              compact={true}
              className="shrink-0 text-[13px] text-[var(--canvas-controls-text,#fff)]/70"
            />
            <div
              className="relative"
              onMouseEnter={() => setSendBtnHover(true)}
              onMouseLeave={() => setSendBtnHover(false)}
            >
              <button
                type="button"
                disabled={!canSend}
                onClick={handleSend}
                title={canSend ? t2("canvas.redraw.send") : void 0}
                aria-label={t2("canvas.redraw.send")}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--canvas-primary-btn-bg, #000000d9)",
                  color: "var(--canvas-primary-btn-icon, #fff)",
                }}
                onMouseEnter={(e2) => {
                  if (!canSend) return;
                  e2.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e2) => {
                  if (!canSend) return;
                  e2.currentTarget.style.opacity = "1";
                }}
              >
                <SendArrowIcon />
              </button>
              {showDisabledTooltip && (
                <div
                  className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2"
                  style={{
                    zIndex: 10,
                  }}
                >
                  <div
                    className="whitespace-nowrap rounded-md px-2 py-1 text-[12px] leading-[16px] text-white"
                    style={{
                      background: "rgba(30,30,30,0.95)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {disabledReason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
function AttachmentThumb({ attachment, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const url2 = useAssetMetadataStore((s2) => s2.assets.get(attachment.assetId)?.url);
  const thumb = url2 ? buildThumbnailUrl(url2, 96) : void 0;
  return (
    <div
      className="group relative h-7 w-7 shrink-0 overflow-hidden rounded-md border"
      style={{
        background: "var(--canvas-controls-active, #ffffff14)",
        borderColor: "var(--canvas-controls-border, #363636)",
      }}
      title={attachment.name}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={attachment.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            color: "var(--canvas-controls-text, #fff)",
          }}
        >
          <ImagePlaceholderIcon />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove2}
        className="absolute right-0 top-0 rounded-bl-md bg-black/50 p-0.5 text-white transition-colors hover:bg-red-500/80 [&>svg]:size-3"
        aria-label={t2("a11y.removeAttachment", "Remove attachment")}
      >
        <CloseIcon$1 />
      </button>
    </div>
  );
}
export const CanvasRedrawOverlay = reactExports.memo(function CanvasRedrawOverlay2() {
  const { meta: meta2, cancelRedraw, redrawingNodeId } = useRedrawState();
  const { onNodeAction } = useCanvasBridge();
  const enterTimeRef = reactExports.useRef(Date.now());
  const bottomBarRef = reactExports.useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const node2 = bottomBarRef.current;
    if (!node2) return;
    const ro = new ResizeObserver((entries2) => {
      for (const entry of entries2) {
        const h2 = entry.contentRect.height;
        setBottomBarHeight((prev) => (Math.abs(prev - h2) > 0.5 ? h2 : prev));
      }
    });
    ro.observe(node2);
    return () => ro.disconnect();
  }, []);
  const composerMeasured = bottomBarHeight > 0;
  useCropViewportZoom(
    composerMeasured ? meta2 : null,
    composerMeasured ? bottomBarHeight + BAR_GAP : 0,
  );
  const transform2 = useStore$3((s2) => s2.transform);
  const [vpX, vpY, vpZoom] = transform2;
  const [resolution, setResolution] = reactExports.useState("2K");
  const sentRef = reactExports.useRef(false);
  const eraseApi = useImageErase();
  const {
    selections,
    brushSize,
    setBrushSize,
    tool: tool2,
    setTool,
    undoStroke,
    redoStroke,
    canRedo,
  } = eraseApi;
  const editorRef = reactExports.useRef(null);
  const trackedCancelRedraw = reactExports.useCallback(() => {
    if (onNodeAction && redrawingNodeId && !sentRef.current) {
      try {
        onNodeAction({
          nodeId: redrawingNodeId,
          nodeType: "image",
          action: "redraw",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          hadProgress: selections.length > 0,
        });
      } catch {}
    }
    cancelRedraw();
  }, [onNodeAction, redrawingNodeId, selections.length, cancelRedraw]);
  const imagePos = reactExports.useMemo(() => {
    if (!meta2) return null;
    return {
      x: meta2.nodeFlowX * vpZoom + vpX,
      y: meta2.nodeFlowY * vpZoom + vpY,
      w: meta2.nodeWidth * vpZoom,
      h: meta2.nodeHeight * vpZoom,
    };
  }, [meta2, vpX, vpY, vpZoom]);
  const {
    paintRectRef,
    maskCanvasRef,
    paintRectHandlers,
    backdropHandlers,
    cursorStyle,
    maskOverlayOpacity,
  } = useImageMaskPainter({
    meta: meta2,
    imagePos,
    onCancel: trackedCancelRedraw,
    toolApi: eraseApi,
    onSelectionComplete: (rect) => {
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        insertCanvasRedrawRegion(editor, selectionToNormalizedBBox(rect));
      }
    },
    // Paint with the exact burn-in highlight (color + alpha) so what the user
    // sees on canvas IS the marked image submitted to the model.
    brushColor: REDRAW_HIGHLIGHT_CSS_COLOR,
    overlayOpacity: REDRAW_HIGHLIGHT_UI_OPACITY,
  });
  const handleSend = reactExports.useCallback(
    (prompt, attachments) => {
      if (sentRef.current || !meta2 || selections.length === 0) return;
      sentRef.current = true;
      if (onNodeAction && redrawingNodeId) {
        try {
          onNodeAction({
            nodeId: redrawingNodeId,
            nodeType: "image",
            action: "redraw",
            phase: "apply",
            interaction: "opens_mode",
            durationMs: Date.now() - enterTimeRef.current,
            toolSpecific: {
              resolution,
              prompt_length: prompt.length,
              attachment_count: attachments.length,
            },
          });
        } catch {}
      }
      const { onConfirm, originalWidth, originalHeight } = meta2;
      const aspectRatio =
        originalWidth > 0 && originalHeight > 0 ? originalWidth / originalHeight : void 0;
      cancelRedraw();
      void onConfirm({
        prompt,
        attachments,
        bbox: selectionToNormalizedBBox(selections[0]),
        resolution,
        aspectRatio,
      }).catch(() => {});
    },
    [meta2, selections, resolution, cancelRedraw, onNodeAction, redrawingNodeId],
  );
  if (!meta2 || !imagePos) return null;
  const topBarWidth = Math.max(imagePos.w, TOP_BAR_MIN_WIDTH);
  const topBarLeft = imagePos.x + (imagePos.w - topBarWidth) / 2;
  const bottomBarWidth = Math.max(BOTTOM_BAR_MIN_WIDTH, Math.min(BOTTOM_BAR_MAX_WIDTH, imagePos.w));
  const bottomBarLeft = imagePos.x + (imagePos.w - bottomBarWidth) / 2;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div className="absolute inset-0 pointer-events-auto" {...backdropHandlers} />
      <div
        ref={paintRectRef}
        className="absolute pointer-events-auto select-none touch-none"
        style={{
          transform: `translate3d(${imagePos.x}px, ${imagePos.y}px, 0)`,
          width: imagePos.w,
          height: imagePos.h,
          top: 0,
          left: 0,
          willChange: "transform",
          ...cursorStyle,
        }}
        {...paintRectHandlers}
      >
        <canvas
          ref={maskCanvasRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            opacity: maskOverlayOpacity,
          }}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${topBarLeft}px, ${imagePos.y - TOP_BAR_HEIGHT - BAR_GAP}px, 0)`,
          width: topBarWidth,
          height: TOP_BAR_HEIGHT,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseTopBar
          tool={tool2}
          onToolChange={setTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          hasStrokes={selections.length > 0}
          canRedo={canRedo}
          onUndo={undoStroke}
          onRedo={redoStroke}
          onClose={trackedCancelRedraw}
        />
      </div>
      <div
        ref={bottomBarRef}
        className="absolute pointer-events-auto"
        style={{
          left: bottomBarLeft,
          top: imagePos.y + imagePos.h + BAR_GAP,
          width: bottomBarWidth,
        }}
      >
        <CanvasRedrawBottomBar
          hasRegions={selections.length > 0}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
          submitting={false}
          onSend={handleSend}
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      </div>
    </div>
  );
});
