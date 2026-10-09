// panorama-generation-panel.jsx
import { findModelByStoredId } from "../generation/param-label-fallbacks.js";
import { resolvePricingId } from "../generation/select-content.jsx";
import { calcImageCost } from "../generation/resolve-video-billing-tooltip.js";
import {
  ArrowUp,
  jsxRuntimeExports,
  reactExports,
  usePromptFontSizeStore,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useModelRegistryStore } from "../infra/create-recently-added-store.js";
import { ImageOutlineIcon, Sparkles, useCanvasBridge } from "./package.jsx";
import { PromptTextarea } from "../generation/time-intervals.jsx";
import { ParamsChip } from "../generation/params-chip.jsx";
import { ParamsPopup } from "../generation/params-popup.jsx";
import { PanoramaIcon } from "../canvas/fullscreen-icon.jsx";
import { ExpandToggleButton } from "../generation/expand-arrow-icon.jsx";
import { SubmitButton } from "../generation/submit-button.jsx";
import {
  ParamSectionLabel,
  ResolutionTabs,
} from "../generation/resolution-tabs.jsx";
import { ParamQualitySlider } from "./param-quality-slider.jsx";
import { PopoverShell } from "../generation/attachment-bar.jsx";
const DEFAULT_PANORAMA_MODEL_ID = "g-image-2";
const DEFAULT_PANORAMA_PRICING_ID = "gpt-image-2";
function resolvePanoramaPricingId(imageModels, generationModelId) {
  const model = findModelByStoredId(imageModels, generationModelId);
  if (model) return resolvePricingId(model);
  if (
    generationModelId === DEFAULT_PANORAMA_MODEL_ID ||
    generationModelId === DEFAULT_PANORAMA_PRICING_ID
  ) {
    return DEFAULT_PANORAMA_PRICING_ID;
  }
  return void 0;
}
function calcPanoramaGenerationCost(
  pricingConfig,
  imageModels,
  generationModelId,
  resolution,
  quality,
  refCount,
  count2,
) {
  const pricingModelId = resolvePanoramaPricingId(
    imageModels,
    generationModelId,
  );
  if (!pricingModelId) return void 0;
  const perImage = calcImageCost(
    pricingConfig,
    pricingModelId,
    resolution,
    quality,
    refCount,
  );
  return perImage == null ? void 0 : perImage * Math.max(1, count2);
}
const PANORAMA_PROMPT_MAX_LENGTH = 7500;
const PANORAMA_GENERATION_COUNT = 1;
const PANORAMA_QUALITY_OPTIONS = ["low", "medium", "high"];
export function PanoramaGenerationPanel({
  upstreamGenerateReferences = [],
  onPickGenerateReferences,
  onGenerate,
  onDismiss,
  onClose,
  presentation = "dialog",
  showTypeLabel = false,
  className = "",
}) {
  const { t: t2 } = useTranslation();
  const { getLastUsedModelParams, pricingConfig } = useCanvasBridge();
  const imageModels = useModelRegistryStore((state2) => state2.image);
  const promptFontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const [generatePrompt, setGeneratePrompt] = reactExports.useState("");
  const [generateResolution, setGenerateResolution] =
    reactExports.useState("2k");
  const [generateQuality, setGenerateQuality] = reactExports.useState("low");
  const [generateReferences, setGenerateReferences] = reactExports.useState(
    () => upstreamGenerateReferences.slice(0, 4),
  );
  const [generateSpecOpen, setGenerateSpecOpen] = reactExports.useState(false);
  const [generateBusy, setGenerateBusy] = reactExports.useState(false);
  const [expanded, setExpanded] = reactExports.useState(false);
  const generateSpecAnchorRef = reactExports.useRef(null);
  const isComposer = presentation === "composer";
  const closePanel = onClose ?? onDismiss ?? (() => void 0);
  const promptOverLimit = generatePrompt.length > PANORAMA_PROMPT_MAX_LENGTH;
  const canGenerate =
    !promptOverLimit &&
    (!!generatePrompt.trim() || generateReferences.length > 0) &&
    !!onGenerate;
  const generationModelId =
    getLastUsedModelParams?.("i2i")?.modelId ?? DEFAULT_PANORAMA_MODEL_ID;
  const generationCost = reactExports.useMemo(
    () =>
      calcPanoramaGenerationCost(
        pricingConfig,
        imageModels,
        generationModelId,
        generateResolution,
        generateQuality,
        generateReferences.length,
        PANORAMA_GENERATION_COUNT,
      ),
    [
      generateQuality,
      generateReferences.length,
      generateResolution,
      generationModelId,
      imageModels,
      pricingConfig,
    ],
  );
  reactExports.useEffect(() => {
    setGenerateReferences((current2) => {
      const currentIds = new Set(current2.map((reference) => reference.nodeId));
      const additions = upstreamGenerateReferences.filter(
        (reference) => !currentIds.has(reference.nodeId),
      );
      return additions.length > 0
        ? [...current2, ...additions].slice(0, 4)
        : current2;
    });
  }, [upstreamGenerateReferences]);
  const submitGeneration = async () => {
    if (!onGenerate || !canGenerate) return;
    setGenerateBusy(true);
    try {
      const generationTask = onGenerate({
        prompt: generatePrompt.trim(),
        modelId: generationModelId,
        resolution: generateResolution,
        quality: generateQuality,
        count: PANORAMA_GENERATION_COUNT,
        references: generateReferences,
      });
      if (isComposer) closePanel();
      await generationTask;
      onDismiss?.();
    } catch (error) {
      console.error("[panorama] Generation failed:", error);
    } finally {
      setGenerateBusy(false);
    }
  };
  const panelContent = (
    <>
      {onDismiss && !isComposer && (
        <button
          type="button"
          disabled={generateBusy}
          onClick={onDismiss}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:opacity-50"
          aria-label={t2("common.cancel", "取消")}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      )}
      <div
        className={`flex shrink-0 items-start ${isComposer ? "justify-between gap-3" : "gap-2"} ${onDismiss && !isComposer ? "pr-10" : ""}`}
      >
        <div
          className={`flex flex-wrap items-center ${isComposer ? "gap-1" : "gap-2"}`}
        >
          {generateReferences.map((reference) => (
            <div
              key={reference.nodeId}
              className={`group/reference relative shrink-0 overflow-hidden ${isComposer ? "size-12 rounded-[8px] border-[1.5px] border-transparent" : "size-14 rounded-md border border-[var(--canvas-controls-border)]"}`}
            >
              <img
                src={reference.url}
                alt=""
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setGenerateReferences((current2) =>
                    current2.filter((item) => item.nodeId !== reference.nodeId),
                  )
                }
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover/reference:opacity-100"
                aria-label={t2("common.remove", "移除")}
              >
                <X size={10} strokeWidth={2} />
              </button>
            </div>
          ))}
          {generateReferences.length < 4 && (
            <button
              type="button"
              disabled={!onPickGenerateReferences || generateBusy}
              onClick={async () => {
                if (!onPickGenerateReferences) return;
                const additions = await onPickGenerateReferences(
                  4 - generateReferences.length,
                );
                setGenerateReferences((current2) => {
                  const seen2 = new Set(current2.map((item) => item.nodeId));
                  return [
                    ...current2,
                    ...additions.filter((item) => !seen2.has(item.nodeId)),
                  ].slice(0, 4);
                });
              }}
              className={`flex shrink-0 items-center justify-center border-dashed text-lg transition-colors duration-150 disabled:opacity-50 ${isComposer ? "size-12 rounded-[8px] border-[1.5px] border-foreground/10 text-foreground/50 hover:border-foreground/30 hover:text-foreground" : "size-14 rounded-md border border-[var(--canvas-controls-border)] text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
              aria-label={t2("canvas.panorama.addReference", "添加参考图")}
            >
              +
            </button>
          )}
        </div>
        {isComposer && (
          <ExpandToggleButton
            expanded={expanded}
            onToggle={() => setExpanded((current2) => !current2)}
          />
        )}
      </div>
      {showTypeLabel && !isComposer && (
        <div className="flex w-fit items-center gap-1 rounded-md bg-[var(--canvas-controls-active)] px-2 py-1 text-xs font-medium text-[var(--canvas-controls-text)]">
          <ImageOutlineIcon size={14} strokeWidth={1.7} />
          {t2("canvas.panorama.title", "全景图")}
        </div>
      )}
      {isComposer ? (
        <div className="min-h-0 flex-1 pt-3">
          <PromptTextarea
            value={generatePrompt}
            onChange={setGeneratePrompt}
            placeholder={t2(
              "canvas.panorama.generatePlaceholder",
              "Click Generate to turn a scene image into a 720° panorama. Supports text and reference image generation.",
            )}
            onClose={closePanel}
            blockKeyHandlers={generateBusy}
            maxLength={PANORAMA_PROMPT_MAX_LENGTH}
          />
        </div>
      ) : (
        <textarea
          value={generatePrompt}
          onChange={(event) => setGeneratePrompt(event.target.value)}
          placeholder={t2(
            "canvas.panorama.generatePlaceholder",
            "Click Generate to turn a scene image into a 720° panorama. Supports text and reference image generation.",
          )}
          className="canvas-prompt-font-size-textarea nodrag nowheel min-h-28 resize-none rounded-lg border border-[var(--canvas-controls-border)] bg-transparent p-3 text-[var(--canvas-controls-text)] outline-none placeholder:text-muted-foreground/50 focus:border-[var(--canvas-controls-text)]"
          style={{
            "--canvas-prompt-font-size": promptFontSize,
          }}
        />
      )}
      <div
        className={`flex items-center justify-between gap-3 ${isComposer ? "relative pt-3" : ""}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {isComposer && (
            <>
              <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--canvas-controls-text)]">
                <PanoramaIcon size={16} />
                {t2("canvas.panorama.title", "全景图")}
              </div>
              <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
            </>
          )}
          <ParamsChip
            anchorRef={generateSpecAnchorRef}
            summary={`2:1 · ${generateResolution} · ${t2(`canvas.panorama.quality.${generateQuality}`, generateQuality)}`}
            open={generateSpecOpen}
            onToggle={() => setGenerateSpecOpen((current2) => !current2)}
            disabled={generateBusy}
            showSummaryIcons={false}
          />
          <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
          <span className="flex h-8 min-w-10 items-center justify-center gap-1 rounded-[4px] px-2 text-[13px] font-normal leading-[20px] tracking-[-0.52px] text-foreground opacity-70">
            <span aria-hidden="true">×</span>
            <span>{PANORAMA_GENERATION_COUNT}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isComposer ? (
            <SubmitButton
              submitting={generateBusy}
              canSubmit={canGenerate}
              creditCost={generationCost}
              onClick={() => void submitGeneration()}
              title={t2("canvas.panorama.generateAction", "生成")}
            />
          ) : (
            <>
              {generationCost != null && (
                <span className="flex items-center gap-1 text-xs text-[var(--canvas-controls-text-muted)]">
                  <Sparkles size={14} strokeWidth={1.5} />
                  {generationCost}
                </span>
              )}
              <button
                type="button"
                disabled={generateBusy || !canGenerate}
                onClick={() => void submitGeneration()}
                className="flex size-8 items-center justify-center rounded-lg bg-[var(--canvas-controls-text)] text-[var(--canvas-controls-bg)] disabled:opacity-50"
                aria-label={t2("canvas.panorama.generateAction", "生成")}
              >
                {generateBusy ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2} />
                )}
              </button>
            </>
          )}
        </div>
      </div>
      {generateSpecOpen && (
        <ParamsPopup
          anchorRef={generateSpecAnchorRef}
          onClose={() => setGenerateSpecOpen(false)}
        >
          <div>
            <ParamSectionLabel>
              {t2("canvas.panorama.resolution", "Resolution")}
            </ParamSectionLabel>
            <ResolutionTabs
              options={["1k", "2k", "4k"]}
              value={generateResolution}
              onChange={(value) => setGenerateResolution(value)}
              getOptionLabel={(value) => (value === "4k" ? "4K" : value)}
            />
          </div>
          <ParamQualitySlider
            label={t2("canvas.panorama.quality", "Image Quality")}
            options={PANORAMA_QUALITY_OPTIONS}
            value={generateQuality}
            onChange={(value) => setGenerateQuality(value)}
            getOptionLabel={(value) =>
              t2(`canvas.panorama.quality.${value}`, value)
            }
          />
        </ParamsPopup>
      )}
    </>
  );
  if (isComposer) {
    return (
      <PopoverShell
        onClose={closePanel}
        expanded={expanded}
        extraHeight={expanded ? 40 : 64}
      >
        <div
          className="contents"
          data-action-ui-id="canvas.panorama-generation-panel"
        >
          {panelContent}
        </div>
      </PopoverShell>
    );
  }
  return (
    <div
      className={`nodrag nowheel relative flex w-full flex-col gap-3 rounded-xl border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-4 shadow-[var(--canvas-shadow-menu)] ${className}`}
      data-action-ui-id="canvas.panorama-generation-panel"
    >
      {panelContent}
    </div>
  );
}
