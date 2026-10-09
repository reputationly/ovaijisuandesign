// canvas-redraw-bottom-bar.jsx
import {
  jsxRuntimeExports,
  mergeAttributes,
  Node$3 as Node,
  reactExports,
  useAssetMetadataStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CloseIcon,
  ImagePlaceholderIcon,
  PaperclipIcon,
  SendArrowIcon,
} from "./file-missing-icon.jsx";
import { buildThumbnailUrl } from "../media-editing/build-video-thumb-base.jsx";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { extractCanvasEditorText } from "../assets/parse-prompt-to-tiptap.js";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import {
  SEEDREAM_REDRAW_PRICING_MODEL_ID,
  useImageEditCost,
} from "../media-editing/image-edit-pricing.js";
import { RichPromptInput } from "../chat/rich-prompt-input.jsx";
import { BananaResolutionPicker } from "../media-editing/banana-resolution-picker.jsx";
const CanvasRedrawRegionNode = Node.create({
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
function AttachmentThumb({ attachment, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const url2 = useAssetMetadataStore(
    (s2) => s2.assets.get(attachment.assetId)?.url,
  );
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
        <CloseIcon />
      </button>
    </div>
  );
}
export const CanvasRedrawBottomBar = reactExports.memo(
  function CanvasRedrawBottomBar2({
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
    const redrawExtensions = reactExports.useMemo(
      () => [CanvasRedrawRegionNode],
      [],
    );
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
                <AttachmentThumb
                  attachment={attachments[0]}
                  onRemove={removeAttachment2}
                />
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
                    e2.currentTarget.style.background =
                      "var(--canvas-controls-active, #ffffff1a)";
                  }}
                  onMouseLeave={(e2) => {
                    e2.currentTarget.style.background = "transparent";
                  }}
                >
                  <PaperclipIcon />
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
  },
);
