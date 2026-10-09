// enhance-video-popover.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DEFAULT_ENHANCE_VIDEO_RESOLUTION,
  ENHANCE_VIDEO_FPS_OPTIONS,
  ENHANCE_VIDEO_RESOLUTIONS,
} from "./video-tool-meta.jsx";
import {
  jsxRuntimeExports,
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import {
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { CloseIcon$1, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { calcVideoCost } from "../generation/calc-video-cost.js";
import {
  Select$2,
  SelectContent$1,
  SelectItem$1,
  SelectTrigger$1,
  SelectValue$1,
} from "../generation/select-content.jsx";

const DEFAULT_ENHANCE_VIDEO_FPS = 60;

const RESOLUTION_LABELS = {
  "720p": "720p",
  "1080p": "1080p",
  "2k": "2K",
  "4k": "4K",
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

function isResolutionBelowCurrent(option2, current2) {
  if (!current2) return false;
  return RESOLUTION_RANK[option2] < RESOLUTION_RANK[current2];
}

function isFpsBelowCurrent(option2, current2) {
  if (!current2) return false;
  return option2 < current2;
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
      {ENHANCE_VIDEO_FPS_OPTIONS.map((option2) => {
        const active2 = option2 === value;
        const disabled2 = isFpsBelowCurrent(option2, currentFps);
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            onClick={() => {
              if (disabled2) return;
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.enhance-video.fps-${option2}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active2
                ? "var(--canvas-primary-btn-bg, #ffffff)"
                : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon, #000)"
                : "var(--canvas-controls-text, #fff)",
              cursor: disabled2 ? "not-allowed" : "pointer",
              opacity: disabled2 ? 0.5 : 1,
            }}
          >
            {option2}
          </button>
        );
      })}
    </div>
  );
}

export const EnhanceVideoPopover = reactExports.memo(
  function EnhanceVideoPopover2({
    onSubmit,
    onClose,
    currentResolution,
    currentFps,
    defaultResolution = DEFAULT_ENHANCE_VIDEO_RESOLUTION,
    defaultFps = DEFAULT_ENHANCE_VIDEO_FPS,
    durationSec,
    renderShell,
  }) {
    const { t: t2 } = useTranslation();
    const [resolution, setResolution] =
      reactExports.useState(defaultResolution);
    const [fps, setFps] = reactExports.useState(defaultFps);
    const onCloseRef = reactExports.useRef(onClose);
    onCloseRef.current = onClose;
    const nodeId = useNodeId();
    const selectedSelector = reactExports.useCallback(
      (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const selected2 = useStore$3(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (renderShell) return;
      if (!selected2) onCloseRef.current();
    }, [renderShell, selected2]);
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
    const body2 = (
      // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
      <div
        className="flex w-64 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.enhanceVideo.title", "高清 & 补帧")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.enhanceVideo.resolutionLabel", "分辨率")}
          </span>
          <Select$2
            value={resolution}
            onValueChange={(v2) => setResolution(v2)}
          >
            <SelectTrigger$1
              size="sm"
              data-action-ui-id="canvas.enhance-video.resolution-select"
              className="w-full"
            >
              <SelectValue$1 />
            </SelectTrigger$1>
            <SelectContent$1>
              {ENHANCE_VIDEO_RESOLUTIONS.map((option2) => (
                <SelectItem$1
                  key={option2}
                  value={option2}
                  disabled={isResolutionBelowCurrent(
                    option2,
                    currentResolution,
                  )}
                >
                  {formatEnhanceVideoResolution(option2)}
                </SelectItem$1>
              ))}
            </SelectContent$1>
          </Select$2>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.enhanceVideo.fpsLabel", "帧率")}
          </span>
          <FpsToggle value={fps} currentFps={currentFps} onChange={setFps} />
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.enhance-video.cancel"
            aria-label={t2("canvas.enhanceVideo.cancel", "取消")}
            title={t2("canvas.enhanceVideo.cancel", "取消")}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon$1 />
          </button>
          <div className="flex items-center gap-1.5">
            <CreditCostBadge cost={computedCreditCost} compact={true} />
            <Button$2
              variant="default"
              size="icon"
              disabled={isNoop || !accountSubmissionAllowed}
              onClick={handleSubmit}
              data-action-ui-id="canvas.enhance-video.submit"
              aria-label={t2("canvas.enhanceVideo.submit", "生成")}
              title={
                isNoop
                  ? t2(
                      "canvas.enhanceVideo.noChange",
                      "目标分辨率与帧率与原视频相同",
                    )
                  : void 0
              }
            >
              <SendArrowIcon />
            </Button$2>
          </div>
        </div>
      </div>
    );
    if (renderShell)
      return (
        <>
          {renderShell({
            onClose,
            children: body2,
          })}
        </>
      );
    return (
      <NodeToolbar$1
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        {body2}
      </NodeToolbar$1>
    );
  },
);
