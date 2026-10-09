// use-txt2-text.jsx
import { jsxRuntimeExports, reactExports, useTranslation, dedupedToast, useStorage, API_PATHS, instance, canvasLog, ActionListItem, Tag$1, CanvasNodeType, ActionListPanel, Copy, Save, ActionListSeparator, CopyPlus, Library, FolderInput, reactDomExports } from "../vendor.js";
import { recordAction, gatewayFetch } from "../infra/agent-ws-client.jsx";
import { PopoverTrigger, Popover } from "../assets/apply-asset-change.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { PlatformFileManagerLabel } from "../settings/interest-selection-provider.jsx";
import { useGeneratingStateApi, Settings2, Trash2 } from "../media-editing/parse-item.jsx";
import { pickUserMessage, HILO_SOURCE_HEADER, GENERATE_ERROR_CODE_SHUTDOWN, GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "../generation/push-inline.js";
import { DEFAULT_PLACEMENT_GAP } from "../canvas/reconcile-group-geometry-for-mode.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { ScopedAsyncCache, retainedGenerationBlocksResubmit, RESUBMIT_BLOCKED_I18N, semanticGenerationErrorCopy, generationErrorStatusFromResponse, persistedGenerateErrorReason, generationErrorStatusFromThrown, TEXT_MODEL_CACHE_TTL_MS, providerOf, useReleaseBadges } from "../generation/use-mention-models.jsx";
import { useGatewayFetch } from "../generation/use-resizable-width.js";
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { trackEvent } from "../infra/init-track.js";
import {
  CanvasBridgeProvider,
  AddToChatIcon,
  GroupIcon,
  UngroupIcon,
} from "../canvas/generating-media-area.jsx";
import { StrokeIcon, PencilIcon, LocalFolderIcon } from "../workspace/browser-inspiration-urls.jsx";
import { CanvasToolbarExtensionButton } from "../canvas/zoom-menu.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { useSettingsDialog } from "../settings/custom-provider-form.jsx";
import { CoachMark } from "../assets/asset-mention-list.jsx";
import { CDN_COACHMARK_CANVAS_GROUP } from "../workspace/new-workspace-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasTagPickerPanel } from "../canvas/use-canvas-tag-download.jsx";
export function useTxt2Text({ httpClient, catalogScopeKey }) {
  const generatingStateStore = useGeneratingStateApi();
  const inflight = reactExports.useRef(new Set());
  const textModelsCache = reactExports.useRef(new ScopedAsyncCache()).current;
  textModelsCache.setScope(catalogScopeKey);
  const listTextModels = reactExports.useCallback(
    () =>
      textModelsCache.load(
        catalogScopeKey,
        async () => (await httpClient.listModels()).textModels,
        TEXT_MODEL_CACHE_TTL_MS,
      ),
    [catalogScopeKey, httpClient, textModelsCache],
  );
  const handleTxt2Text = reactExports.useCallback(
    async (nodeId, prompt, modelId, params, imagePaths, textPaths, videoPaths, audioPaths) => {
      if (inflight.current.has(nodeId)) {
        return {
          success: true,
        };
      }
      if (retainedGenerationBlocksResubmit(generatingStateStore.getState().byNode.get(nodeId))) {
        dedupedToast.warning(instance.t(...RESUBMIT_BLOCKED_I18N));
        return {
          success: false,
          error: "resubmit blocked: retained generation task",
        };
      }
      inflight.current.add(nodeId);
      const store = generatingStateStore.getState();
      store.mark(nodeId, {
        prompt,
        model: modelId,
        modelId,
        params,
        generationStartedAt: new Date().toISOString(),
      });
      recordAction("generate:t2t", {
        model: modelId,
      });
      trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
        popover_type: "t2t",
        node_id: nodeId,
        submit_mode: "replace",
        model_id: modelId,
        backend: providerOf(modelId),
        prompt_length: prompt.length,
        ref_count:
          (imagePaths?.length ?? 0) +
          (textPaths?.length ?? 0) +
          (videoPaths?.length ?? 0) +
          (audioPaths?.length ?? 0),
      });
      const headers = {
        [HILO_SOURCE_HEADER]: "canvas",
      };
      try {
        const resp = await httpClient.generateText(
          {
            model_id: modelId,
            prompt,
            // Chip-form copy for node persistence; the gateway interceptor
            // compiles `prompt` into the model-facing `图片N` dialect in place.
            display_prompt: prompt,
            params,
            source_node_id: nodeId,
            replace_node_id: nodeId,
            ...(imagePaths && imagePaths.length > 0
              ? {
                  image_paths: imagePaths,
                }
              : {}),
            ...(textPaths && textPaths.length > 0
              ? {
                  text_paths: textPaths,
                }
              : {}),
            ...(videoPaths && videoPaths.length > 0
              ? {
                  video_paths: videoPaths,
                }
              : {}),
            ...(audioPaths && audioPaths.length > 0
              ? {
                  audio_paths: audioPaths,
                }
              : {}),
          },
          {
            headers,
          },
        );
        if (!resp.ok) {
          if (resp.error_code === GENERATE_ERROR_CODE_SHUTDOWN) {
            return {
              success: true,
            };
          }
          const message2 = pickUserMessage(
            resp,
            instance.t("canvas.generateFailed", {
              defaultValue: "生成失败，请稍后重试",
            }),
          );
          const errorStatus = generationErrorStatusFromResponse(resp.failure_presentation);
          const userMessage =
            errorStatus === "recoverable_error"
              ? instance.t("canvas.generationRecovery.description", {
                  defaultValue: "原任务已保留，结果将在恢复后自动回填。",
                })
              : errorStatus === "status_unknown"
                ? instance.t("canvas.generationStatusUnknown.description", {
                    defaultValue: "生成请求未能完成，系统不会自动重试。",
                  })
                : stripErrorHtml(message2);
          if (errorStatus === "recoverable_error") dedupedToast.warning(userMessage);
          else dedupedToast.error(userMessage);
          const retryPayload =
            resp.error_code === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
              ? {
                  kind: "text",
                  sourceNodeId: nodeId,
                  prompt,
                  modelId,
                  params,
                  imagePaths,
                  textPaths,
                  videoPaths,
                  audioPaths,
                }
              : void 0;
          generatingStateStore.getState().mark(nodeId, {
            prompt,
            model: modelId,
            modelId,
            params,
            error: message2,
            errorStatus,
            errorReason: persistedGenerateErrorReason(resp.error_code),
            retryPayload,
            traceId: resp.cloud_trace_id,
          });
          return {
            success: false,
            error: userMessage,
            errorStatus,
          };
        }
        generatingStateStore.getState().clear(nodeId);
        return {
          success: true,
        };
      } catch (err) {
        const diagnosticMessage = err?.message || "No gateway response";
        const errorStatus = generationErrorStatusFromThrown(err);
        const statusUnknownMessage = instance.t("canvas.generationStatusUnknown.description", {
          defaultValue: "生成请求未能完成，系统不会自动重试。",
        });
        const userMessage =
          errorStatus === "status_unknown"
            ? statusUnknownMessage
            : semanticGenerationErrorCopy(stripErrorHtml(diagnosticMessage));
        canvasLog.error("txt2text generation request threw", {
          error: diagnosticMessage,
          errorStatus,
        });
        dedupedToast.error(userMessage);
        generatingStateStore.getState().mark(nodeId, {
          prompt,
          model: modelId,
          modelId,
          params,
          error: diagnosticMessage,
          errorStatus,
        });
        return {
          success: false,
          error: userMessage,
          errorStatus,
        };
      } finally {
        inflight.current.delete(nodeId);
      }
    },
    [httpClient, generatingStateStore],
  );
  return {
    handleTxt2Text,
    listTextModels,
  };
}
export function CanvasHostToolbarButton({
  icon,
  label,
  onClick,
  dataActionUiId,
  iconSize = "md",
  tooltipSide = "top",
  kind = "action",
  active: active2,
  controlsId,
  hasPopup,
  count: count2,
}) {
  const content2 = (
    <>
      <Icon icon={icon} size={iconSize} aria-hidden={true} />
      {count2 !== void 0 && (
        <span className="text-[11px] tabular-nums" aria-hidden="true">
          {count2}
        </span>
      )}
    </>
  );
  let trigger;
  if (kind === "action") {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
      >
        {content2}
      </CanvasToolbarExtensionButton>
    );
  } else if (kind === "toggle") {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
        kind="toggle"
        active={active2 ?? false}
      >
        {content2}
      </CanvasToolbarExtensionButton>
    );
  } else {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
        kind="panel"
        active={active2 ?? false}
        controlsId={controlsId}
        hasPopup={hasPopup}
      >
        {content2}
      </CanvasToolbarExtensionButton>
    );
  }
  return trigger;
}
export function CanvasWatermarkChip({ variant = "floating" }) {
  const { t: t2 } = useTranslation();
  const { openSettings } = useSettingsDialog();
  const [config2] = useStorage("global.config");
  const watermarkEnabled = config2?.watermarkEnabled ?? true;
  if (!watermarkEnabled) return null;
  const handleWatermarkSettings = () => {
    openSettings("general");
  };
  const buttonClassName =
    variant === "toolbar"
      ? "pointer-events-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--canvas-controls-text)] opacity-80 transition-colors hover:bg-[var(--canvas-controls-hover)] hover:opacity-100"
      : "pointer-events-auto flex h-8 items-center rounded-lg border border-border bg-background transition-colors [border-width:var(--divider-width)] hover:border-foreground/80";
  const innerClassName =
    variant === "toolbar"
      ? "flex size-full cursor-pointer items-center justify-center rounded-full"
      : "flex h-full cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 text-xs opacity-70 transition-colors hover:bg-muted/60 hover:opacity-100";
  return (
    <div className={variant === "toolbar" ? void 0 : "pointer-events-auto"}>
      <button
        type="button"
        onClick={handleWatermarkSettings}
        title={t2("canvas.watermark.settings")}
        aria-label={t2("canvas.watermark.settings")}
        data-action-ui-id="canvas.watermark-settings"
        className={buttonClassName}
      >
        <span className={innerClassName}>
          <Settings2 size={14} strokeWidth={1.5} />
          {variant === "floating" && (
            <span className="@max-[640px]/canvas-area:hidden">
              {t2("canvas.watermark.settings")}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
const CANVAS_ADD_NODE_BADGE_IDS = {
  directorStage: "canvas-add-director-stage-new-v1",
  videoEditing: "canvas-add-video-editing-new-v1",
  comfyUi: "canvas-add-comfyui-new-v1",
};
function useCanvasAddNodeMenuBadges() {
  const { t: t2 } = useTranslation();
  const configs = reactExports.useMemo(() => {
    const appearance = {
      label: t2("canvas.releaseBadgeNew"),
      tone: "brand",
    };
    return Object.entries(CANVAS_ADD_NODE_BADGE_IDS).map(([target, id2]) => ({
      id: id2,
      target,
      display: {
        mode: "once",
        initial: appearance,
        afterComplete: null,
      },
    }));
  }, [t2]);
  const { badges: badges2, markReleaseBadgeComplete } = useReleaseBadges(configs);
  const addNodeMenuBadges = reactExports.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(badges2).map(([target, appearance]) => [target, appearance?.label]),
      ),
    [badges2],
  );
  return {
    addNodeMenuBadges,
    onAddNodeMenuBadgeComplete: markReleaseBadgeComplete,
  };
}
function asRecord$2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function requiredString$1(record2, key2) {
  const value = record2[key2];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
export function mapLocalComfyUiWorkflows(value) {
  const workflows = asRecord$2(value)?.workflows;
  if (!Array.isArray(workflows)) return [];
  return workflows.flatMap((candidate) => {
    const record2 = asRecord$2(candidate);
    if (!record2 || record2.source !== "user") return [];
    const id2 = requiredString$1(record2, "id");
    const name2 = requiredString$1(record2, "name");
    const title = requiredString$1(record2, "title");
    if (!id2 || !name2 || !title) return [];
    const shortDesc = requiredString$1(record2, "short_desc");
    const tags2 = Array.isArray(record2.tags)
      ? record2.tags.filter((tag) => typeof tag === "string")
      : void 0;
    return [
      {
        id: id2,
        name: name2,
        title,
        source: "user",
        ...(shortDesc
          ? {
              short_desc: shortDesc,
            }
          : {}),
        ...(tags2?.length
          ? {
              tags: tags2,
            }
          : {}),
      },
    ];
  });
}
async function fetchLocalComfyUiWorkflows(gatewayFetch2) {
  const response = await gatewayFetch2(API_PATHS.comfyUiWorkflows);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return mapLocalComfyUiWorkflows(await response.json());
}
function useComfyUiWorkflowBridge() {
  const { t: t2 } = useTranslation();
  const gatewayFetch$1 = useGatewayFetch();
  const fetchComfyUiWorkflows = reactExports.useCallback(
    () => fetchLocalComfyUiWorkflows(gatewayFetch),
    [],
  );
  const openComfyUiWorkflow = reactExports.useCallback(
    async (workflowId, position2) => {
      try {
        const response = await gatewayFetch$1(API_PATHS.comfyUiWorkflowOpen(workflowId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target: "new",
            open_editor: false,
            ...(position2
              ? {
                  position: position2,
                }
              : {}),
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = parseOpenWorkflowResult$1(await response.json());
        if (result.status !== "opened") throw new Error(result.error || result.status);
      } catch (error) {
        dedupedToast.error(
          t2("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [gatewayFetch$1, t2],
  );
  return {
    fetchComfyUiWorkflows,
    openComfyUiWorkflow,
  };
}
function parseOpenWorkflowResult$1(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid ComfyUI response");
  const record2 = value;
  if (typeof record2.status !== "string") throw new Error("Invalid ComfyUI response");
  return {
    status: record2.status,
    ...(typeof record2.error === "string"
      ? {
          error: record2.error,
        }
      : {}),
  };
}
export function CanvasWorkflowBridge({ children: children2, ...canvasBridgeState }) {
  const comfyUiWorkflowBridge = useComfyUiWorkflowBridge();
  const addNodeMenuBadgeBridge = useCanvasAddNodeMenuBadges();
  return (
    <CanvasBridgeProvider
      {...canvasBridgeState}
      {...comfyUiWorkflowBridge}
      {...addNodeMenuBadgeBridge}
    >
      {children2}
    </CanvasBridgeProvider>
  );
}
export function computeGridDropPositions(anchor, sizes, gap = DEFAULT_PLACEMENT_GAP) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(sizes.length)));
  const positions = [];
  let cursorX = anchor.x;
  let cursorY = anchor.y;
  let rowMaxHeight = 0;
  for (const [i2, size2] of sizes.entries()) {
    if (i2 > 0 && i2 % cols === 0) {
      cursorX = anchor.x;
      cursorY += rowMaxHeight + gap;
      rowMaxHeight = 0;
    }
    positions.push({
      x: cursorX,
      y: cursorY,
    });
    cursorX += size2.width + gap;
    rowMaxHeight = Math.max(rowMaxHeight, size2.height);
  }
  return positions;
}
const MEDIA_TYPE_SET = new Set(["image", "video", "audio", "text", "file"]);
export function asMediaType(t2) {
  return t2 && MEDIA_TYPE_SET.has(t2) ? t2 : void 0;
}
const MINIMAX_H3_MODEL_ID$1 = "MiniMax-H3";
const H3_VIDEO_UPSCALE_MODEL_ID = "h3_video_super_resolution";
const DEFAULT_H3_FREE_IMAGE_COUNT = 5;
const DISPLAY_RESOLUTIONS = new Set(["1k", "2k", "4k"]);
const IMAGE_MODEL_BY_NODE = {
  Banana2Node: "nano_banana_2_flash",
  BananaProNode: "nano_banana_2",
  GImage2Node: "gpt-image-2",
};
function equalModelId(left, right) {
  return (
    left.localeCompare(right, void 0, {
      sensitivity: "accent",
    }) === 0
  );
}
function displayResolution(value) {
  return value.toUpperCase();
}
function displayQuality(value) {
  return value.length === 0 ? value : `${value[0]?.toUpperCase()}${value.slice(1).toLowerCase()}`;
}
function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(value);
}
function withQualifier(label, resolution, quality, mode2) {
  const qualifier = [
    resolution && displayResolution(resolution),
    quality && displayQuality(quality),
    mode2,
  ]
    .filter(Boolean)
    .join(" · ");
  return qualifier ? `${label} (${qualifier})` : label;
}
function render(rows, copy2, locale) {
  if (rows.length === 0) return null;
  const separator = locale.toLowerCase().startsWith("zh") ? "：" : ": ";
  return `### ${copy2.heading}

${rows.map((row) => `- ${row.label}${separator}${row.value}`).join("\n")}`;
}
function collectImageRows(pricing, modelId, copy2, locale) {
  const model = pricing.image.find((item) => equalModelId(item.modelID, modelId));
  if (!model) return [];
  const rows = [];
  const seenOutput = new Set();
  for (const cost of model.imageCosts) {
    const resolutions = cost.resolutions.filter((value) =>
      DISPLAY_RESOLUTIONS.has(value.toLowerCase()),
    );
    const qualities = cost.qualities?.length ? cost.qualities : [""];
    for (const resolution of resolutions) {
      for (const quality of qualities) {
        const key2 = `${resolution.toLowerCase()}|${quality.toLowerCase()}|${cost.realCost}`;
        if (seenOutput.has(key2)) continue;
        seenOutput.add(key2);
        rows.push({
          label: withQualifier(copy2.generatedImage, resolution, quality),
          value:
            cost.realCost === 0
              ? copy2.free
              : copy2.creditsPerImage(formatNumber(cost.realCost, locale)),
        });
      }
    }
  }
  if (seenOutput.size === 0 && model.defaultCost > 0) {
    rows.push({
      label: copy2.generatedImage,
      value: copy2.creditsPerImage(formatNumber(model.defaultCost, locale)),
    });
  }
  const referenceRules = uniqueReferenceRules(model.imageCosts);
  for (const rule of referenceRules) {
    const rate = formatNumber(rule.rate, locale);
    rows.push({
      label: copy2.inputImages,
      value:
        rule.rate === 0
          ? copy2.free
          : rule.freeCount > 0
            ? copy2.imagePricing(rule.freeCount, rule.freeCount + 1, rate)
            : copy2.creditsPerImage(rate),
    });
  }
  return rows;
}
function uniqueReferenceRules(costs) {
  const seen2 = new Set();
  const rules = [];
  for (const cost of costs) {
    if (typeof cost.refCountPrice !== "number") continue;
    const freeCount = cost.refCountFree ?? 0;
    const key2 = `${cost.refCountPrice}|${freeCount}`;
    if (seen2.has(key2)) continue;
    seen2.add(key2);
    rules.push({
      rate: cost.refCountPrice,
      freeCount,
    });
  }
  return rules;
}
function matchesReferenceMode(cost, hasReferenceVideo) {
  return cost.hasReferenceVideo == null || cost.hasReferenceVideo === hasReferenceVideo;
}
function collectVideoRates(pricing, hasReferenceVideo) {
  const model = pricing.video.find((item) => equalModelId(item.modelID, MINIMAX_H3_MODEL_ID$1));
  if (!model) return [];
  return model.videoCosts.filter(
    (cost) =>
      typeof cost.costPerSecond === "number" &&
      (hasReferenceVideo == null || matchesReferenceMode(cost, hasReferenceVideo)) &&
      (cost.hasSound == null || cost.hasSound),
  );
}
function referenceModeLabel(cost, copy2) {
  if (cost.hasReferenceVideo === true) return copy2.withReferenceVideo;
  if (cost.hasReferenceVideo === false) return copy2.withoutReferenceVideo;
  return void 0;
}
function collectVideoImageRules(costs, copy2, distinguishReferenceMode) {
  const grouped = new Map();
  for (const cost of costs) {
    if (typeof cost.costPerImage !== "number") continue;
    const freeCount = cost.costPerImageFree ?? DEFAULT_H3_FREE_IMAGE_COUNT;
    const key2 = `${cost.costPerImage}|${freeCount}`;
    const existing = grouped.get(key2);
    if (existing) {
      existing.modes.add(cost.hasReferenceVideo);
    } else {
      grouped.set(key2, {
        rate: cost.costPerImage,
        freeCount,
        modes: new Set([cost.hasReferenceVideo]),
      });
    }
  }
  const rules = [];
  for (const rule of grouped.values()) {
    if (
      !distinguishReferenceMode ||
      rule.modes.has(void 0) ||
      (rule.modes.has(false) && rule.modes.has(true))
    ) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
      });
      continue;
    }
    if (rule.modes.has(false)) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
        mode: copy2.withoutReferenceVideo,
      });
    }
    if (rule.modes.has(true)) {
      rules.push({
        rate: rule.rate,
        freeCount: rule.freeCount,
        mode: copy2.withReferenceVideo,
      });
    }
  }
  return rules;
}
function collectVideoRows(pricing, nodeType, copy2, locale) {
  const isReference = nodeType === "MinimaxHailuo03ReferenceNode";
  const isFirstLast = nodeType === "MinimaxHailuo03FirstLastFrameNode";
  const costs = collectVideoRates(pricing, isReference ? void 0 : false);
  const rows = [];
  const seenRates = new Set();
  for (const cost of costs) {
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const rate = cost.costPerSecond;
      const mode2 = isReference ? referenceModeLabel(cost, copy2) : void 0;
      const key2 = `${resolution.toLowerCase()}|${rate}|${mode2 ?? ""}`;
      if (seenRates.has(key2)) continue;
      seenRates.add(key2);
      const formatted =
        rate === 0 ? copy2.free : copy2.creditsPerSecond(formatNumber(rate, locale));
      rows.push({
        label: withQualifier(copy2.generatedVideo, resolution, void 0, mode2),
        value: formatted,
      });
    }
  }
  const seenInputVideoRates = new Set();
  for (const cost of isReference ? collectVideoRates(pricing, true) : []) {
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const rate = cost.costPerSecond;
      const key2 = `${resolution.toLowerCase()}|${rate}`;
      if (seenInputVideoRates.has(key2)) continue;
      seenInputVideoRates.add(key2);
      rows.push({
        label: withQualifier(copy2.inputVideo, resolution),
        value: rate === 0 ? copy2.free : copy2.creditsPerSecond(formatNumber(rate, locale)),
      });
    }
  }
  if (isReference)
    rows.push({
      label: copy2.inputAudio,
      value: copy2.free,
    });
  if (isReference || isFirstLast) {
    for (const imageRule of collectVideoImageRules(costs, copy2, isReference)) {
      rows.push({
        label: withQualifier(copy2.inputImages, void 0, void 0, imageRule.mode),
        value:
          imageRule.rate === 0
            ? copy2.free
            : copy2.imagePricing(
                imageRule.freeCount,
                imageRule.freeCount + 1,
                formatNumber(imageRule.rate, locale),
              ),
      });
    }
  }
  return rows;
}
function collectContextIrRows(pricing, copy2, locale) {
  const contextIr = pricing.h3ContextIr;
  if (!contextIr) return [];
  const makeValue = (rate) =>
    rate === 0 ? copy2.free : copy2.creditsPerMillionTokens(formatNumber(rate, locale));
  return [
    {
      label: copy2.inputTokens,
      value: makeValue(contextIr.inputCreditPerMillionTokens),
    },
    {
      label: copy2.outputTokens,
      value: makeValue(contextIr.outputCreditPerMillionTokens),
    },
  ];
}
function collectUpscaleRows(pricing, copy2, locale) {
  const model = pricing.tool?.find((item) => equalModelId(item.modelID, H3_VIDEO_UPSCALE_MODEL_ID));
  if (!model) return [];
  const seen2 = new Set();
  const rows = [];
  for (const cost of model.costs) {
    if (typeof cost.costPerSecond !== "number") continue;
    const resolutions = cost.resolutions.length > 0 ? cost.resolutions : [""];
    for (const resolution of resolutions) {
      const key2 = `${resolution.toLowerCase()}|${cost.costPerSecond}`;
      if (seen2.has(key2)) continue;
      seen2.add(key2);
      rows.push({
        label: withQualifier(copy2.videoUpscale, resolution),
        value:
          cost.costPerSecond === 0
            ? copy2.free
            : copy2.creditsPerSecond(formatNumber(cost.costPerSecond, locale)),
      });
    }
  }
  return rows;
}
export function buildComfyUiNodePriceDescription(pricing, nodeType, copy2, locale) {
  if (!pricing) return null;
  if (pricing.enabled === false) {
    return `### ${copy2.heading}

${copy2.free}`;
  }
  const imageModelId = IMAGE_MODEL_BY_NODE[nodeType];
  const rows = imageModelId
    ? collectImageRows(pricing, imageModelId, copy2, locale)
    : nodeType === "MinimaxH3PromptExpandNode"
      ? collectContextIrRows(pricing, copy2, locale)
      : nodeType === "MinimaxH3VideoEnhancementNode"
        ? collectUpscaleRows(pricing, copy2, locale)
        : collectVideoRows(pricing, nodeType, copy2, locale);
  return render(rows, copy2, locale);
}
const MARK_ID$1 = "canvas-group-intro";
export function GroupCoachMark({ anchorRef, selectedCount }) {
  const { t: t2 } = useTranslation();
  return (
    <CoachMark
      markId={MARK_ID$1}
      enabled={selectedCount >= 2}
      anchorRef={anchorRef}
      side="top"
      align="end"
      sideOffset={0}
      hideArrow={true}
      showClose={true}
      media={{
        url: CDN_COACHMARK_CANVAS_GROUP,
        type: "image",
      }}
      title={t2("coachMark.canvas.group.title", "素材编组")}
      description={t2(
        "coachMark.canvas.group.desc",
        "画布乱了？选多个节点右键「编组」，垂直/水平/宫格三种布局自动排",
      )}
      ctaLabel={t2("coachMark.gotIt", "我知道了")}
    />
  );
}
const STORAGE_KEY$1 = "canvasSidebar.recentPlugins";
const MAX_STORED = 50;
class PluginRecentsStore {
  _onChange = new Emitter();
  snapshotRaw;
  snapshot = [];
  onChange = this._onChange.event;
  /**
   * Read the recents list (most-recent first). Tolerates corrupt storage.
   * Returns the same array reference while the stored value is unchanged so
   * callers can safely use this method as a `useSyncExternalStore` snapshot.
   */
  get() {
    let raw2;
    try {
      raw2 = localStorage.getItem(STORAGE_KEY$1);
    } catch {
      return this.snapshot;
    }
    if (raw2 === this.snapshotRaw) return this.snapshot;
    this.snapshotRaw = raw2;
    try {
      if (!raw2) {
        this.snapshot = [];
        return this.snapshot;
      }
      const parsed = JSON.parse(raw2);
      this.snapshot = Array.isArray(parsed) ? parsed.filter((x2) => typeof x2 === "string") : [];
    } catch {
      this.snapshot = [];
    }
    return this.snapshot;
  }
  /**
   * Promote `id` to the front of the recents list (dedup + unshift + cap).
   * No-op on empty id. Fires `onChange` so subscribers refresh.
   */
  record(id2) {
    if (!id2) return;
    const next2 = [id2, ...this.get().filter((x2) => x2 !== id2)].slice(0, MAX_STORED);
    const serialized = JSON.stringify(next2);
    try {
      localStorage.setItem(STORAGE_KEY$1, serialized);
      this.snapshotRaw = serialized;
      this.snapshot = next2;
    } catch {}
    this._onChange.fire();
  }
}
const pluginRecents = new PluginRecentsStore();
export async function instantiatePluginOnCanvas(
  { pluginId, position: position2, sourceNodeIds, initialData },
  { currentWorkspace, gatewayFetch: gatewayFetch2, t: t2 },
) {
  if (!currentWorkspace) {
    dedupedToast.error(
      t2("skills.plugin.addFailed", {
        error: "no workspace",
      }),
    );
    return null;
  }
  try {
    const resp = await gatewayFetch2(`/api/plugins/${encodeURIComponent(pluginId)}/instantiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspacePath: currentWorkspace,
        ...(position2
          ? {
              position: position2,
            }
          : {}),
        ...(sourceNodeIds && sourceNodeIds.length > 0
          ? {
              sourceNodeIds,
            }
          : {}),
        ...(initialData
          ? {
              initialData,
            }
          : {}),
      }),
    });
    if (!resp.ok) {
      const body2 = await resp.text();
      throw new Error(`instantiate ${resp.status}: ${body2}`);
    }
    const json2 = await resp.json();
    const nodeId = typeof json2.nodeId === "string" ? json2.nodeId : null;
    if (nodeId) pluginRecents.record(pluginId);
    return nodeId;
  } catch (err) {
    const message2 = err instanceof Error ? err.message : String(err);
    console.error("[canvas] Plugin instantiate failed:", err);
    dedupedToast.error(
      t2("skills.plugin.addFailed", {
        error: message2,
      }),
    );
    return null;
  }
}
function NodeContextMenuIcon({ icon, viewBoxSize = 24 }) {
  return <StrokeIcon icon={icon} size={16} viewBoxSize={viewBoxSize} />;
}
export const NODE_CONTEXT_MENU_VIEWPORT_MARGIN = 8;
const NODE_CONTEXT_MENU_ANCHOR_GAP = 4;
function resolveAxis(anchor, menuSize, viewportSize, margin, gap) {
  const min2 = margin;
  const max2 = Math.max(min2, viewportSize - margin - menuSize);
  const after = anchor + gap;
  const before = anchor - gap - menuSize;
  if (after >= min2 && after <= max2) return after;
  if (before >= min2 && before <= max2) return before;
  return Math.min(Math.max(after, min2), max2);
}
export function resolveNodeContextMenuPosition({
  anchor,
  menuSize,
  viewportSize,
  margin = NODE_CONTEXT_MENU_VIEWPORT_MARGIN,
  gap = NODE_CONTEXT_MENU_ANCHOR_GAP,
}) {
  return {
    x: resolveAxis(anchor.x, menuSize.width, viewportSize.width, margin, gap),
    y: resolveAxis(anchor.y, menuSize.height, viewportSize.height, margin, gap),
  };
}
function TagMenuItem({ assets }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const panelId = reactExports.useId();
  const label = t2("canvasTags.entry");
  const trigger = (
    <ActionListItem
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={panelId}
      data-action-ui-id="canvas.node-tag-submenu"
    >
      <NodeContextMenuIcon icon={Tag$1} />
      <span className="flex-1 text-left">{label}</span>
      {assets.length > 1 ? (
        <span className="text-xs text-muted-foreground">{assets.length}</span>
      ) : null}
    </ActionListItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        id={panelId}
        role="dialog"
        aria-label={label}
        side="right"
        align="start"
        sideOffset={4}
        positionerClassName="z-[60]"
        className="w-auto gap-0 p-1.5"
        data-canvas-tag-panel=""
        data-action-ui-id="canvas.node-tag-submenu-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        <CanvasTagPickerPanel assets={assets} embedded={true} />
      </PopoverContent>
    </Popover>
  );
}
const ESTIMATED_MENU_SIZE$1 = {
  width: 192,
  height: 440,
};
const SHOW_CANCEL_GENERATION_IN_CONTEXT_MENU = false;
function MenuButton$1({ icon, label, onClick, testId, destructive }) {
  return (
    <ActionListItem
      data-action-ui-id={testId}
      variant={destructive ? "destructive" : "default"}
      onClick={() => {
        if (testId) {
          trackEvent(TRACK_EVENTS.CANVAS_CONTEXT_MENU_CLICK, {
            menu_item: testId,
          });
        }
        onClick();
      }}
    >
      {icon}
      {label}
    </ActionListItem>
  );
}
export function NodeContextMenu({
  position: position2,
  targets,
  actions,
  onCopy,
  onSaveAs,
  onShowInFolder,
  onAddToChat,
  onRename,
  onCancelGeneration,
  tagAssets,
  onClose,
  motionProps,
}) {
  const { t: t2 } = useTranslation();
  const fallbackRef = reactExports.useRef(null);
  const ref = motionProps?.ref ?? fallbackRef;
  const closing2 = motionProps?.["data-ending-style"] !== void 0;
  const [menuPosition, setMenuPosition] = reactExports.useState(() =>
    resolveNodeContextMenuPosition({
      anchor: position2,
      menuSize: ESTIMATED_MENU_SIZE$1,
      viewportSize:
        typeof window === "undefined"
          ? {
              width: Number.MAX_SAFE_INTEGER,
              height: Number.MAX_SAFE_INTEGER,
            }
          : {
              width: window.innerWidth,
              height: window.innerHeight,
            },
    }),
  );
  const updateMenuPosition = reactExports.useCallback(() => {
    if (typeof window === "undefined") return;
    const menu2 = ref.current;
    const next2 = resolveNodeContextMenuPosition({
      anchor: {
        x: position2.x,
        y: position2.y,
      },
      menuSize: menu2
        ? {
            width: menu2.offsetWidth,
            height: menu2.offsetHeight,
          }
        : ESTIMATED_MENU_SIZE$1,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setMenuPosition((current2) =>
      current2.x === next2.x && current2.y === next2.y ? current2 : next2,
    );
  }, [position2.x, position2.y, ref]);
  reactExports.useLayoutEffect(updateMenuPosition, [updateMenuPosition]);
  reactExports.useEffect(() => {
    window.addEventListener("resize", updateMenuPosition);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateMenuPosition);
    if (ref.current) resizeObserver?.observe(ref.current);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [updateMenuPosition, ref]);
  reactExports.useEffect(() => {
    if (closing2) return;
    const handleClick2 = (e2) => {
      const target = e2.target;
      if (ref.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-canvas-tag-panel]")) return;
      onClose();
    };
    const handleKey = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick2);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick2);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, closing2, ref]);
  const wrap2 = (fn2) => () => {
    fn2();
    onClose();
  };
  const isSingle = targets.length === 1;
  const single = isSingle ? targets[0] : null;
  const isSingleGroup = isSingle && single?.nodeType === CanvasNodeType.Group;
  const fileBackedTargets = targets.filter((t22) => t22.filePath);
  const hasFileBackedTargets = fileBackedTargets.length > 0;
  const fsTargets = targets.filter((t22) => t22.filePath && t22.absolutePath);
  const isTable = single?.fileType === "table";
  const showAddToChat = hasFileBackedTargets;
  const hasFileSlot = isSingle && !!single?.filePath && !!single.absolutePath;
  const showOsClipboardActions = hasFileSlot && !isTable;
  const showRename =
    isSingle &&
    !!onRename &&
    (isSingleGroup || (!!single?.filePath && single.nodeType !== CanvasNodeType.File));
  const showShowInFolder = fsTargets.length > 0;
  const showCopyCanvas = true;
  const showGroup = !isSingle;
  const showUngroup = !!isSingleGroup && !!single;
  const hasGroupTarget = targets.some((t22) => t22.nodeType === CanvasNodeType.Group);
  const hasTableTarget = targets.some((t22) => t22.fileType === "table");
  const showPromoteToAsset =
    !!actions.promoteToAsset && !hasTableTarget && (hasFileBackedTargets || hasGroupTarget);
  const showSaveToProjectAssets =
    !!actions.saveToProjectAssets && !hasTableTarget && (hasFileBackedTargets || hasGroupTarget);
  const showCancelGeneration = SHOW_CANCEL_GENERATION_IN_CONTEXT_MENU;
  const showDelete = !targets.some(
    (target) =>
      target.generationErrorStatus === "recoverable_error" ||
      (target.generationErrorStatus === "status_unknown" &&
        target.nodeType !== CanvasNodeType.Placeholder),
  );
  const handleAddToChat = wrap2(() => onAddToChat(fileBackedTargets));
  const handleCopy = wrap2(() => {
    if (!single) return;
    if (single.isMultiImage) {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_COPY_PASTE, {
        action: "copy",
        node_count: 1,
        via: "context_menu",
      });
      actions.copyToCanvasClipboard();
      return;
    }
    trackEvent(TRACK_EVENTS.CANVAS_NODE_SAVE, {
      node_id: single.nodeId,
      action: "copy",
    });
    onCopy(single);
  });
  const handleSaveAs = wrap2(() => {
    if (!single) return;
    trackEvent(TRACK_EVENTS.CANVAS_NODE_SAVE, {
      node_id: single.nodeId,
      action: "save_as",
    });
    onSaveAs(single);
  });
  const handleShowInFolder = wrap2(() => {
    if (fsTargets.length === 0) return;
    const seen2 = new Set();
    for (const target of fsTargets) {
      const abs = target.absolutePath;
      if (!abs) continue;
      const slash2 = Math.max(abs.lastIndexOf("/"), abs.lastIndexOf("\\"));
      const dir = slash2 >= 0 ? abs.slice(0, slash2) : abs;
      if (seen2.has(dir)) continue;
      seen2.add(dir);
      onShowInFolder(target);
    }
  });
  const handleCopyCanvas = wrap2(() => {
    trackEvent(TRACK_EVENTS.CANVAS_NODE_COPY_PASTE, {
      action: "copy",
      node_count: targets.length,
      via: "context_menu",
    });
    actions.duplicateToCanvas();
  });
  const handleGroup = wrap2(actions.groupSelected);
  const handleUngroup = wrap2(() => {
    if (single?.nodeType === CanvasNodeType.Group) actions.ungroupGroup(single.nodeId);
  });
  const handlePromoteToAsset = wrap2(() => {
    actions.promoteToAsset?.(targets.map((target) => target.nodeId));
  });
  const handleSaveToProjectAssets = wrap2(() => {
    actions.saveToProjectAssets?.(targets.map((target) => target.nodeId));
  });
  const handleRename = wrap2(() => {
    if (single && onRename) onRename(single);
  });
  const handleDelete2 = wrap2(actions.deleteSelected);
  const menu = (
    <ActionListPanel
      {...motionProps}
      ref={ref}
      data-testid="canvas-node-context-menu"
      className={`fixed z-50 min-w-48 dp-motion-quick-zoom`}
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        maxHeight: `calc(100vh - ${NODE_CONTEXT_MENU_VIEWPORT_MARGIN * 2}px)`,
        overflowY: "auto",
      }}
    >
      {showAddToChat && (
        <MenuButton$1
          testId="canvas-add-to-chat"
          icon={<NodeContextMenuIcon icon={AddToChatIcon} viewBoxSize={20} />}
          label={t2("canvas.addToChat")}
          onClick={handleAddToChat}
        />
      )}
      {showOsClipboardActions && (
        <>
          <MenuButton$1
            testId="canvas-copy-from-menu"
            icon={<NodeContextMenuIcon icon={Copy} />}
            label={t2("common.copy")}
            onClick={handleCopy}
          />
          <MenuButton$1
            icon={<NodeContextMenuIcon icon={Save} />}
            label={t2("common.saveAs")}
            onClick={handleSaveAs}
          />
        </>
      )}
      {showRename && (
        <MenuButton$1
          testId="canvas-rename-from-menu"
          icon={<NodeContextMenuIcon icon={PencilIcon} />}
          label={t2("common.rename")}
          onClick={handleRename}
        />
      )}
      {tagAssets && tagAssets.length > 0 && <TagMenuItem assets={tagAssets} />}
      {(showAddToChat || showOsClipboardActions || showRename) && showCopyCanvas && (
        <ActionListSeparator />
      )}
      <MenuButton$1
        testId="canvas-copy-canvas"
        icon={<NodeContextMenuIcon icon={CopyPlus} />}
        label={t2("canvas.copyCanvasNode")}
        onClick={handleCopyCanvas}
      />
      {showGroup && (
        <MenuButton$1
          testId="canvas-group-from-menu"
          icon={<GroupIcon size={16} />}
          label={t2("canvas.group")}
          onClick={handleGroup}
        />
      )}
      {showUngroup && (
        <MenuButton$1
          testId="canvas-ungroup-from-menu"
          icon={<UngroupIcon size={16} />}
          label={t2("canvas.ungroup")}
          onClick={handleUngroup}
        />
      )}
      {showPromoteToAsset && (
        <MenuButton$1
          testId="canvas-promote-to-asset-from-menu"
          icon={<NodeContextMenuIcon icon={Library} />}
          label={t2("canvas.addToLibrary")}
          onClick={handlePromoteToAsset}
        />
      )}
      {showSaveToProjectAssets && (
        <MenuButton$1
          testId="canvas-save-to-project-assets-from-menu"
          icon={<NodeContextMenuIcon icon={FolderInput} />}
          label={t2("canvas.saveToProjectAssets")}
          onClick={handleSaveToProjectAssets}
        />
      )}
      {showShowInFolder && (
        <>
          <ActionListSeparator />
          <MenuButton$1
            icon={<LocalFolderIcon className="size-4" />}
            label={<PlatformFileManagerLabel />}
            onClick={handleShowInFolder}
          />
        </>
      )}
      {showDelete && <ActionListSeparator />}
      {showCancelGeneration}
      {showDelete && (
        <MenuButton$1
          testId="canvas-delete-from-menu"
          destructive={true}
          icon={<NodeContextMenuIcon icon={Trash2} />}
          label={
            single?.generationErrorStatus === "status_unknown"
              ? t2("canvas.removeLocalPlaceholder")
              : t2("common.delete")
          }
          onClick={handleDelete2}
        />
      )}
    </ActionListPanel>
  );
  return typeof document === "undefined" ? menu : reactDomExports.createPortal(menu, document.body);
}
