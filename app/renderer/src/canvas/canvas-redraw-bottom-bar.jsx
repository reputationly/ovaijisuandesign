// canvas-redraw-bottom-bar.jsx
import { jsxRuntimeExports, mergeAttributes, Node$3 as Node, reactExports, useTranslation } from "../vendor.js";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
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
    const { x1: startX, y1: startY, x2: endX, y2: endY } = HTMLAttributes;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-redraw-region": "",
        "aria-label": `选区 ${startX},${startY} - ${endX},${endY}`,
        contenteditable: "false",
        class: "canvas-redraw-region-chip",
      }),
      `选区 ${startX},${startY} - ${endX},${endY}`,
    ];
  },
});
function AttachmentThumb({ attachment, onRemove: onRemove2 }) {
  const { t: translate } = useTranslation();
  const url2 = useAssetMetadataStore(
    (storeState) => storeState.assets.get(attachment.assetId)?.url,
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
        aria-label={translate("a11y.removeAttachment", "Remove attachment")}
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
    const { t: translate } = useTranslation();
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
      if (submitting) return translate("canvas.redraw.disabled.submitting");
      if (!hasRegions && trimmed.length === 0) {
        return translate("canvas.redraw.disabled.noStrokesAndPrompt");
      }
      if (!hasRegions) {
        return translate("canvas.redraw.disabled.noStrokes");
      }
      return translate("canvas.redraw.disabled.noPrompt");
    }, [canSend, submitting, hasRegions, trimmed.length, translate]);
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
          existingAssetIds: attachments.map((attachment) => attachment.assetId),
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
      } catch (error) {
        if (error?.code === "picker_busy") return;
        console.warn("[redraw-bottom-bar] pickAsset rejected", error);
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
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
          onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
        >
          <div className="min-h-10 max-h-32 w-full text-[13px] leading-[18px]">
            <RichPromptInput
              extraExtensions={redrawExtensions}
              editorRef={editorRef}
              onEditorReady={onEditorReady}
              onUpdate={handlePromptUpdate}
              onClose={() => void 0}
              placeholder={translate("canvas.redraw.placeholder")}
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
                  title={translate("canvas.redraw.addAttachment")}
                  aria-label={translate("canvas.redraw.addAttachment")}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150"
                  style={{
                    color: "var(--canvas-controls-text, #fff)",
                  }}
                  onMouseEnter={(mouseEvent) => {
                    mouseEvent.currentTarget.style.background =
                      "var(--canvas-controls-active, #ffffff1a)";
                  }}
                  onMouseLeave={(mouseEvent) => {
                    mouseEvent.currentTarget.style.background = "transparent";
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
                  title={canSend ? translate("canvas.redraw.send") : void 0}
                  aria-label={translate("canvas.redraw.send")}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--canvas-primary-btn-bg, #000000d9)",
                    color: "var(--canvas-primary-btn-icon, #fff)",
                  }}
                  onMouseEnter={(mouseEvent) => {
                    if (!canSend) return;
                    mouseEvent.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(mouseEvent) => {
                    if (!canSend) return;
                    mouseEvent.currentTarget.style.opacity = "1";
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
