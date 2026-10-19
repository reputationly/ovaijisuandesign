// enhance-video-popover.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DEFAULT_ENHANCE_VIDEO_RESOLUTION,
  ENHANCE_VIDEO_FPS_OPTIONS,
  ENHANCE_VIDEO_RESOLUTIONS,
} from "./video-tool-meta.jsx";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { NodeToolbar, useNodeId, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import {
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { calcVideoCost } from "../generation/calc-video-cost.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../generation/select-content.jsx";
export const DEFAULT_ENHANCE_VIDEO_FPS = 60;
const RESOLUTION_LABELS = {
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
  "8k": "8K",
};
function formatEnhanceVideoResolution(value) {
  return RESOLUTION_LABELS[value];
}
const RESOLUTION_RANK = {
  "720p": 0,
  "1080p": 1,
  "2k": 2,
  "4k": 3,
};
function isEnhanceVideoNoop(
  currentResolution,
  currentFps,
  nextResolution,
  nextFps,
) {
  if (!currentResolution || !currentFps) return false;
  return (
    RESOLUTION_RANK[currentResolution] === RESOLUTION_RANK[nextResolution] &&
    currentFps === nextFps
  );
}
function isResolutionBelowCurrent(option, current) {
  if (!current) return false;
  return RESOLUTION_RANK[option] < RESOLUTION_RANK[current];
}
function isFpsBelowCurrent(option, current) {
  if (!current) return false;
  return option < current;
}
const ENHANCE_VIDEO_PRICING_MODEL_ID = "mediakit-enhance-video";
function FpsToggle({ value, currentFps, onChange }) {
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active, #ffffff14)",
      }}
    >
      {ENHANCE_VIDEO_FPS_OPTIONS.map((option) => {
        const active = option === value;
        const disabled = isFpsBelowCurrent(option, currentFps);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (option !== value) onChange(option);
            }}
            data-action-ui-id={`canvas.enhance-video.fps-${option}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active
                ? "var(--canvas-primary-btn-bg, #ffffff)"
                : "transparent",
              color: active
                ? "var(--canvas-primary-btn-icon, #000)"
                : "var(--canvas-controls-text, #fff)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
export const EnhanceVideoPopover = reactExports.memo(
  function EnhanceVideoPopover({
    onSubmit,
    onClose,
    currentResolution,
    currentFps,
    defaultResolution = DEFAULT_ENHANCE_VIDEO_RESOLUTION,
    defaultFps = DEFAULT_ENHANCE_VIDEO_FPS,
    durationSec,
    renderShell,
  }) {
    const { t } = useTranslation();
    const [resolution, setResolution] =
      reactExports.useState(defaultResolution);
    const [fps, setFps] = reactExports.useState(defaultFps);
    const onCloseRef = reactExports.useRef(onClose);
    onCloseRef.current = onClose;
    const nodeId = useNodeId();
    const selectedSelector = reactExports.useCallback(
      (storeState) => (nodeId ? !!storeState.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const selected = useStore(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (renderShell) return;
      if (!selected) onCloseRef.current();
    }, [renderShell, selected]);
    const hidden =
      !renderShell && (isDragging || isMultiSelect || isBoxSelecting);
    const isNoop = isEnhanceVideoNoop(
      currentResolution,
      currentFps,
      resolution,
      fps,
    );
    const {
      accountSubmissionAllowed = true,
      beforeAccountSubmission = () => true,
      pricingConfig,
    } = useCanvasBridge();
    const computedCreditCost = reactExports.useMemo(() => {
      if (!pricingConfig) return void 0;
      if (durationSec == null || durationSec <= 0) return void 0;
      return calcVideoCost(
        pricingConfig,
        ENHANCE_VIDEO_PRICING_MODEL_ID,
        resolution,
        durationSec,
        false,
        false,
        0,
        fps,
      );
    }, [pricingConfig, resolution, fps, durationSec]);
    const handleSubmit = reactExports.useCallback(() => {
      if (isNoop) return;
      if (!beforeAccountSubmission()) return;
      onSubmit({
        resolution,
        fps,
      });
    }, [isNoop, beforeAccountSubmission, onSubmit, resolution, fps]);
    const body = (
      // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
      <div
        className="flex w-64 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t("canvas.enhanceVideo.title", "高清 & 补帧")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t("canvas.enhanceVideo.resolutionLabel", "分辨率")}
          </span>
          <Select value={resolution} onValueChange={(resolutionValue) => setResolution(resolutionValue)}>
            <SelectTrigger
              size="sm"
              data-action-ui-id="canvas.enhance-video.resolution-select"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENHANCE_VIDEO_RESOLUTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  disabled={isResolutionBelowCurrent(
                    option,
                    currentResolution,
                  )}
                >
                  {formatEnhanceVideoResolution(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t("canvas.enhanceVideo.fpsLabel", "帧率")}
          </span>
          <FpsToggle value={fps} currentFps={currentFps} onChange={setFps} />
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.enhance-video.cancel"
            aria-label={t("canvas.enhanceVideo.cancel", "取消")}
            title={t("canvas.enhanceVideo.cancel", "取消")}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon />
          </button>
          <div className="flex items-center gap-1.5">
            <CreditCostBadge cost={computedCreditCost} compact={true} />
            <Button
              variant="default"
              size="icon"
              disabled={isNoop || !accountSubmissionAllowed}
              onClick={handleSubmit}
              data-action-ui-id="canvas.enhance-video.submit"
              aria-label={t("canvas.enhanceVideo.submit", "生成")}
              title={
                isNoop
                  ? t(
                      "canvas.enhanceVideo.noChange",
                      "目标分辨率与帧率与原视频相同",
                    )
                  : void 0
              }
            >
              <SendArrowIcon />
            </Button>
          </div>
        </div>
      </div>
    );
    if (renderShell)
      return (
        <>
          {renderShell({
            onClose,
            children: body,
          })}
        </>
      );
    return (
      <NodeToolbar
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        {body}
      </NodeToolbar>
    );
  },
);
