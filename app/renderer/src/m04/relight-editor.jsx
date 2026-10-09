// relight-editor.jsx
import { reactExports, useTranslation, useStore$3, NodeToolbar$1, Position, dedupedToast, useNodeId, X$7, Loader2 } from "../vendor.js";
import { useCanvasBridge, useCanvasIsDragging, useCanvasIsMultiSelect, useCanvasIsBoxSelecting } from "../m15/parse-item.jsx";
import { Tooltip$1, CreditCostBadge } from "../m01/create-tracker.jsx";
import { NODE_POPOVER_SAFE_GAP } from "../m01/use-lightbox-media-actions.jsx";
import { BACKEND_VIBE_RELIGHT } from "../m01/text-models.js";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { PresetsPanel, RelightControlsPanel, roundAngle } from "./backdrop-gradient-stops.jsx";
import { ToolResetIcon } from "./camera-ball.jsx";
import { LeftPanel } from "./multi-angle-editor.jsx";
import {
  INITIAL_STATE$1,
  StudioPreview,
  buildRelightControlParams,
  messages$1,
  relightReducer,
  renderRelightPixels,
} from "./relight-reducer.jsx";
function renderInWorker(params) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL(
        /* @vite-ignore */
        "" + new URL("../relight-reference.worker-Dx90rBtG.js", import.meta.url).href,
        import.meta.url,
      ),
      {
        type: "module",
        name: "relight-reference",
      },
    );
    let settled = false;
    const finish = (error, blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer2);
      worker.terminate();
      if (error) reject(error);
      else if (blob) resolve(blob);
      else reject(new Error("Missing lighting reference PNG"));
    };
    const timer2 = setTimeout(() => finish(new Error("Lighting reference worker timed out")), 15e3);
    worker.onmessage = (event) => {
      const result = event.data;
      if (result.blob instanceof Blob && result.blob.size > 0) finish(void 0, result.blob);
      else finish(new Error(result.error || "Invalid lighting reference PNG"));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(new Error(event.message || "Lighting reference worker failed"));
    };
    worker.onmessageerror = () => finish(new Error("Lighting reference worker message failed"));
    try {
      worker.postMessage(params);
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
async function renderOnMainThread(params) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const { width, height, data: data2 } = renderRelightPixels(params);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    const image2 = context.createImageData(width, height);
    image2.data.set(data2);
    context.putImageData(image2, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
async function renderRelightReference(params) {
  try {
    if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
      try {
        return await renderInWorker(params);
      } catch (error) {
        console.warn("[renderRelightReference] Worker failed, falling back to Canvas 2D", error);
      }
    }
    if (typeof document === "undefined") return null;
    return await renderOnMainThread(params);
  } catch (error) {
    console.error("[renderRelightReference] 渲染失败", error);
    return null;
  }
}
const RELIGHT_GENERATE_COUNT = 1;
const RELIGHT_CREDIT_COST = 60;
function readableError(error, serviceErrorMessage) {
  const raw2 = error instanceof Error ? error.message : String(error);
  if (/<!doctype\s+html|<html[\s>]/i.test(raw2)) return serviceErrorMessage;
  return raw2.length > 240 ? `${raw2.slice(0, 240)}…` : raw2;
}
function loadImageDimensions(url2) {
  return new Promise((resolve) => {
    const image2 = new Image();
    image2.onload = () =>
      resolve({
        width: image2.naturalWidth || 1024,
        height: image2.naturalHeight || 1024,
      });
    image2.onerror = () =>
      resolve({
        width: 1024,
        height: 1024,
      });
    image2.src = url2;
  });
}
function RelightEditor({ nodeId, imageUrl, imagePath, imageWidth, imageHeight, onClose }) {
  const { i18n, t: t2 } = useTranslation();
  const translate2 = reactExports.useMemo(
    () => (key2) => {
      const locale = i18n.resolvedLanguage?.startsWith("zh") ? "zh" : "en";
      return messages$1[locale][key2] ?? key2;
    },
    [i18n.resolvedLanguage],
  );
  const { pickAsset, submitImg2Image, uploadFileToCdn } = useCanvasBridge();
  const [state2, dispatch2] = reactExports.useReducer(relightReducer, {
    ...INITIAL_STATE$1,
    imageInfo: imageUrl
      ? {
          url: imageUrl,
          pendingUpload: false,
        }
      : null,
  });
  const [sourcePath, setSourcePath] = reactExports.useState(imagePath ?? null);
  const [sourceSize, setSourceSize] = reactExports.useState({
    width: imageWidth,
    height: imageHeight,
  });
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const submitLockRef = reactExports.useRef(false);
  const handleBakeLights = reactExports.useCallback((results) => {
    dispatch2({
      type: "UPDATE_LIGHTS_BATCH",
      updates: results.map((result) => ({
        ...result,
        horizontalAngle: roundAngle(result.horizontalAngle),
        verticalAngle: roundAngle(result.verticalAngle),
      })),
    });
  }, []);
  const handlePickImage = reactExports.useCallback(async () => {
    if (!pickAsset) return;
    try {
      const selected2 = (
        await pickAsset({
          type: "image",
        })
      )?.[0];
      if (!selected2?.url || !selected2.path) return;
      dispatch2({
        type: "SET_IMAGE",
        info: {
          url: selected2.url,
          pendingUpload: false,
        },
      });
      setSourcePath(selected2.path);
      setSourceSize({
        width: selected2.width,
        height: selected2.height,
      });
    } catch (error) {
      dedupedToast.error(
        `${translate2("error_upload_failed")}: ${readableError(error, translate2("error_service_failed"))}`,
      );
    }
  }, [pickAsset, translate2]);
  const handleReset = reactExports.useCallback(
    () =>
      dispatch2({
        type: "RESET_CUSTOM",
      }),
    [],
  );
  const handleSelectPreset = reactExports.useCallback((preset2) => {
    dispatch2({
      type: "SELECT_PRESET",
      presetId: preset2.id,
      lights: preset2.parsedPrompt.lights?.slice(0, 1) ?? [],
      studioMode: preset2.parsedPrompt.studioMode ?? "default",
      effectType: preset2.effectType,
    });
  }, []);
  const handleSubmit = reactExports.useCallback(async () => {
    const sourceUrl = state2.imageInfo?.url;
    if (
      submitLockRef.current ||
      !sourceUrl ||
      !sourcePath ||
      !submitImg2Image ||
      !uploadFileToCdn
    ) {
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const dimensions2 =
        sourceSize.width && sourceSize.height
          ? {
              width: sourceSize.width,
              height: sourceSize.height,
            }
          : await loadImageDimensions(sourceUrl);
      const reference = await renderRelightReference({
        lights: state2.lights,
        studioMode: state2.studioMode,
        userImageWidth: dimensions2.width,
        userImageHeight: dimensions2.height,
      });
      if (!reference) throw new Error(translate2("error_render_failed"));
      const referenceUrl = await uploadFileToCdn(
        new File([reference], `relight-reference-${Date.now()}.png`, {
          type: "image/png",
        }),
      );
      const params = buildRelightControlParams({
        lights: state2.lights,
        studioMode: state2.studioMode,
        effectType: state2.effectType,
      });
      const submission = submitImg2Image(
        nodeId,
        "Relight",
        "relight_image_v4",
        {
          ...params,
          reference_img: referenceUrl,
        },
        [sourcePath],
        void 0,
        RELIGHT_GENERATE_COUNT,
        "Relight",
        false,
        BACKEND_VIBE_RELIGHT,
      );
      onClose();
      const result = await submission;
      if (!result.success) throw new Error(result.error || translate2("error_generic"));
    } catch (error) {
      dedupedToast.error(
        `${translate2("error_generic")}: ${readableError(error, translate2("error_service_failed"))}`,
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    nodeId,
    onClose,
    sourcePath,
    sourceSize,
    state2,
    submitImg2Image,
    translate2,
    uploadFileToCdn,
  ]);
  const disabled2 =
    isSubmitting || !state2.imageInfo?.url || !sourcePath || !submitImg2Image || !uploadFileToCdn;
  const totalCreditCost = RELIGHT_CREDIT_COST;
  const estimatedCostLabel = t2("canvas.billing.estimatedCost", {
    cost: totalCreditCost,
    defaultValue: "预计消耗 {{cost}} 积分",
  });
  return (
    <div className="multi-angle-theme flex h-full min-h-0 flex-col bg-hl_bg_01">
      <header className="shrink-0 px-4 pb-1 pt-3 pr-10">
        <h2 className="text-hl_text_00 text-sm font-semibold leading-5">
          {translate2("tool_title")}
        </h2>
      </header>
      <div className="min-h-0 flex-1">
        <LeftPanel
          leftContentScrollable={false}
          leftContent={
            <div className="flex h-full min-h-0 flex-col">
              <div
                className="relative mx-3 mb-3 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--hl_relight_surface)] p-3"
                data-action-ui-id="canvas.relight.control-card"
              >
                <button
                  type="button"
                  data-action-ui-id="canvas.relight.reset"
                  className="absolute right-2 top-2 z-10 flex h-7 items-center gap-1 rounded-md px-2 text-xs text-hl_text_03 transition-colors hover:bg-hl_bg_07 hover:text-hl_text_00 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleReset}
                >
                  <ToolResetIcon />
                  <span>{translate2("reset")}</span>
                </button>
                <div className="h-[212px] shrink-0">
                  <StudioPreview
                    translate={translate2}
                    lights={state2.lights}
                    activeLightId={state2.activeLightId}
                    imageUrl={state2.imageInfo?.url ?? null}
                    studioMode={state2.studioMode}
                    isInteractionDisabled={isSubmitting}
                    onBakeLights={handleBakeLights}
                    onSelectActiveLight={(id2) =>
                      dispatch2({
                        type: "SET_ACTIVE_LIGHT",
                        id: id2,
                      })
                    }
                    onUploadClick={() => void handlePickImage()}
                  />
                </div>
                <section
                  className="nowheel min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onWheelCapture={(event) => event.stopPropagation()}
                >
                  <RelightControlsPanel
                    translate={translate2}
                    state={state2}
                    dispatch={dispatch2}
                  />
                </section>
              </div>
            </div>
          }
          leftFooter={null}
          rightScrollClassName="mt-2"
          rightContent={
            <section
              className="nowheel flex flex-col overscroll-contain pb-3"
              onWheelCapture={(event) => event.stopPropagation()}
            >
              <PresetsPanel
                translate={translate2}
                selectedPresetId={state2.selectedPresetId}
                panelMode={state2.panelMode}
                onSelect={handleSelectPreset}
                onResetToOriginal={handleReset}
              />
            </section>
          }
          rightFooter={
            <div className="flex shrink-0 items-center justify-end gap-2 bg-hl_bg_01 px-4 py-2">
              {!isSubmitting && (
                <Tooltip$1 content={estimatedCostLabel} side="top">
                  <span
                    className="inline-flex h-8 shrink-0 items-center rounded-md px-2 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
                    data-action-ui-id="popover.credit-cost"
                  >
                    <CreditCostBadge cost={totalCreditCost} compact={true} />
                  </span>
                </Tooltip$1>
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={disabled2}
                aria-label={translate2(isSubmitting ? "generating_label" : "generate_button")}
                title={translate2(isSubmitting ? "generating_label" : "generate_button")}
                className="flex size-8 items-center justify-center rounded-md bg-hl_text_00 text-[13px] text-hl_text_05 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                data-action-ui-id="canvas.relight.generate"
              >
                {isSubmitting ? (
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <span aria-hidden="true">↑</span>
                )}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
const RELIGHT_POPOVER_WIDTH = 658;
const RELIGHT_POPOVER_MAX_HEIGHT = 536;
const RELIGHT_POPOVER_MIN_HEIGHT = 360;
const RELIGHT_POPOVER_VIEWPORT_MARGIN = 16;
export function RelightPopover({ onClose, imageUrl, imagePath, imageWidth, imageHeight }) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const selected2 = useStore$3(
    reactExports.useCallback(
      (state2) => (nodeId ? !!state2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    ),
  );
  const sourceScreenBottom = useStore$3((state2) => {
    const sourceNode = nodeId ? state2.nodeLookup.get(nodeId) : void 0;
    const sourcePosition = sourceNode?.internals.positionAbsolute;
    const sourceHeight = sourceNode?.measured.height ?? sourceNode?.height ?? 0;
    if (!sourcePosition) return 0;
    const [, viewportY, zoom2] = state2.transform;
    return viewportY + (sourcePosition.y + sourceHeight) * zoom2;
  });
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight =
    window.innerHeight -
    sourceScreenBottom -
    NODE_POPOVER_SAFE_GAP -
    RELIGHT_POPOVER_VIEWPORT_MARGIN;
  const popoverHeight = Math.max(
    RELIGHT_POPOVER_MIN_HEIGHT,
    Math.min(RELIGHT_POPOVER_MAX_HEIGHT, availableHeight),
  );
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className="nodrag nopan nowheel relative flex max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg bg-background shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          width: RELIGHT_POPOVER_WIDTH,
          height: popoverHeight,
          display: hidden ? "none" : void 0,
        }}
        data-action-ui-id="canvas.relight.popover"
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
          aria-label={t2("common.close", "Close")}
          data-action-ui-id="canvas.relight.close"
        >
          <X$7 size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <RelightEditor
          nodeId={nodeId}
          imageUrl={imageUrl}
          imagePath={imagePath}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onClose={onClose}
        />
      </div>
    </NodeToolbar$1>
  );
}
export function resolveImageNodeDisplayName(candidates2, fallbackLabel) {
  const ordered = [candidates2.dataName, candidates2.primaryName, candidates2.metaName];
  for (const candidate of ordered) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return fallbackLabel;
}
const ROUND_DOTS_MIN_ZOOM = 0.3;
export const ROUND_DOTS_POPOVER_GAP_OFFSET = 25;
const zoomSelector$1 = (s2) => s2.transform[2];
function RoundDotsInner({ count: count2, activeIdx, onSelect, placement = "below-center" }) {
  const zoom2 = useStore$3(zoomSelector$1);
  if (count2 <= 1) return null;
  if (zoom2 < ROUND_DOTS_MIN_ZOOM) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointerDown/mouseDown only stopPropagation to keep ReactFlow node drag from starting; actions live on the child buttons
    <div
      data-action-ui-id="canvas.image-node.round-dots"
      onPointerDown={(e2) => e2.stopPropagation()}
      onMouseDown={(e2) => e2.stopPropagation()}
      className={cn$5(
        // 绝对定位。z-30 高于 loading overlay / image body / 任何装饰层
        // （loading 时也要可见可点）。
        "pointer-events-auto absolute z-30",
        placement === "top-right"
          ? "top-2 right-2"
          : placement === "bottom-center"
            ? "bottom-2 left-1/2 -translate-x-1/2"
            : "top-full left-1/2 mt-2 -translate-x-1/2",
        "flex items-center gap-2 rounded-full",
      )}
    >
      {Array.from(
        {
          length: count2,
        },
        (_2, idx) => {
          const selected2 = idx === activeIdx;
          return (
            <button
              key={idx}
              type="button"
              data-action-ui-id={`canvas.image-node.round-dot-${idx}`}
              aria-label={`第 ${idx + 1} 轮`}
              aria-pressed={selected2}
              onPointerDown={(e2) => e2.stopPropagation()}
              onPointerUp={(e2) => e2.stopPropagation()}
              onMouseDown={(e2) => e2.stopPropagation()}
              onClick={(e2) => {
                e2.stopPropagation();
                onSelect(idx);
              }}
              className="group/round-dot flex h-4 cursor-pointer items-center justify-center px-0.5"
            >
              <span
                aria-hidden="true"
                className={cn$5(
                  "pointer-events-none block h-1.5 rounded-full transition-[width,height,background-color] duration-150",
                  selected2
                    ? "w-11 bg-foreground/45 group-hover/round-dot:h-2 group-hover/round-dot:bg-foreground/55"
                    : "w-4 bg-foreground/15 group-hover/round-dot:h-2 group-hover/round-dot:bg-foreground/25",
                )}
              />
            </button>
          );
        },
      )}
    </div>
  );
}
export const RoundDots = reactExports.memo(RoundDotsInner);
export const STORYBOARD_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16"];
export const MAX_STORYBOARD_REFERENCES = 4;
export const MAX_STORYBOARD_PROMPT_LENGTH = 5e3;
const GRID_VALIDITY_MAP = {
  "1:1": new Set([
    "1,1",
    "1,2",
    "2,1",
    "2,2",
    "2,3",
    "2,4",
    "3,2",
    "3,3",
    "3,4",
    "3,5",
    "4,2",
    "4,3",
    "4,4",
    "4,5",
    "5,3",
    "5,4",
    "5,5",
  ]),
  "3:4": new Set([
    "1,1",
    "1,2",
    "1,3",
    "2,2",
    "2,3",
    "2,4",
    "2,5",
    "3,2",
    "3,3",
    "3,4",
    "3,5",
    "4,3",
    "4,4",
    "4,5",
    "5,3",
    "5,4",
    "5,5",
  ]),
  "4:3": new Set([
    "1,1",
    "2,1",
    "2,2",
    "2,3",
    "3,1",
    "3,2",
    "3,3",
    "3,4",
    "3,5",
    "4,2",
    "4,3",
    "4,4",
    "4,5",
    "5,2",
    "5,3",
    "5,4",
    "5,5",
  ]),
  "9:16": new Set([
    "1,1",
    "1,2",
    "1,3",
    "1,4",
    "2,2",
    "2,3",
    "2,4",
    "2,5",
    "3,3",
    "3,4",
    "3,5",
    "4,4",
    "4,5",
    "5,4",
    "5,5",
  ]),
  "16:9": new Set([
    "1,1",
    "2,1",
    "2,2",
    "3,1",
    "3,2",
    "3,3",
    "4,1",
    "4,2",
    "4,3",
    "4,4",
    "4,5",
    "5,2",
    "5,3",
    "5,4",
    "5,5",
  ]),
};
export function isStoryboardGridValid(ratio, rows, cols) {
  return GRID_VALIDITY_MAP[ratio].has(`${rows},${cols}`);
}
export function nearestValidStoryboardGrid(ratio, preferredRows, preferredCols) {
  if (isStoryboardGridValid(ratio, preferredRows, preferredCols)) {
    return {
      rows: preferredRows,
      cols: preferredCols,
    };
  }
  const candidates2 = [];
  for (let rows = 1; rows <= 5; rows += 1) {
    for (let cols = 1; cols <= 5; cols += 1) {
      if (isStoryboardGridValid(ratio, rows, cols))
        candidates2.push({
          rows,
          cols,
        });
    }
  }
  return (
    candidates2.sort(
      (a2, b3) =>
        Math.abs(a2.rows - preferredRows) +
        Math.abs(a2.cols - preferredCols) -
        (Math.abs(b3.rows - preferredRows) + Math.abs(b3.cols - preferredCols)),
    )[0] ?? {
      rows: 3,
      cols: 3,
    }
  );
}
export function resolveStoryboardGridSelection(params) {
  let ratio = "16:9";
  if (STORYBOARD_RATIOS.some((candidate) => candidate === params?.cell_ratio)) {
    ratio = params?.cell_ratio;
  }
  let rows = 3;
  let cols = 3;
  try {
    const parsed = JSON.parse(params?.grid_setting ?? "");
    if (STORYBOARD_RATIOS.some((candidate) => candidate === parsed.cell_ratio)) {
      ratio = parsed.cell_ratio;
    }
    if (Number.isInteger(parsed.rows)) rows = parsed.rows;
    if (Number.isInteger(parsed.cols)) cols = parsed.cols;
  } catch {}
  const grid = nearestValidStoryboardGrid(ratio, rows, cols);
  return {
    ratio,
    rows: grid.rows,
    cols: grid.cols,
  };
}
export const messages = {
  en: {
    title: "Storyboard",
    gridLayout: "Grid layout",
    customGrid: "Custom Grid",
    cellRatio: "Cell Ratio",
    references: "References",
    referenceHint: "The current image is used as the first reference. Add up to 3 more.",
    addReference: "Add reference",
    removeReference: "Remove reference",
    story: "Your story",
    promptPlaceholder: "Describe the story to break into storyboard panels…",
    reset: "Reset",
    generate: "Generate",
    generating: "Generating…",
    pickerError: "Failed to select a reference image",
    missingAsset: "The selected image is unavailable",
    generateError: "Failed to generate storyboard",
    invalidLayout: "This layout is unavailable at the selected ratio",
  },
  zh: {
    title: "故事版",
    gridLayout: "分镜布局",
    customGrid: "自定义表格",
    cellRatio: "单格比例",
    references: "参考图",
    referenceHint: "当前图片会作为第一张参考图，最多还能添加 3 张。",
    addReference: "添加参考图",
    removeReference: "移除参考图",
    story: "你的故事",
    promptPlaceholder: "描述要拆解成分镜的故事…",
    reset: "重置",
    generate: "生成",
    generating: "生成中…",
    pickerError: "选择参考图失败",
    missingAsset: "所选图片不可用",
    generateError: "多宫格生成失败",
    invalidLayout: "此比例下无法使用此布局",
  },
};
