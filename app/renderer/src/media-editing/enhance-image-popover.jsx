// enhance-image-popover.jsx
import {
  NodeToolbar$1 as NodeToolbar,
  Position,
  reactExports,
  useNodeId,
  useStore$3 as useStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
const OUTPUT_EDGE_MAX = 10240;
const ENHANCE_IMAGE_RESOLUTIONS = ["1k", "2k", "4k", "8k"];
const RESOLUTION_LONG_EDGE = {
  "1k": 1024,
  "2k": 2048,
  "4k": 3840,
  "8k": 7680,
};
const RESOLUTION_LABELS = {
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
  "8k": "8K",
};
function formatEnhanceImageResolution(value) {
  return RESOLUTION_LABELS[value];
}
const DEFAULT_ENHANCE_IMAGE_RESOLUTION = "2k";
function longEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
function isEnhanceImageResolutionBelowSource(option2, width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return false;
  return RESOLUTION_LONG_EDGE[option2] <= long;
}
function computeEnhanceImageTarget(option2, width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  const long = Math.max(width, height);
  const targetLong = Math.min(RESOLUTION_LONG_EDGE[option2], OUTPUT_EDGE_MAX);
  const scale2 = targetLong / long;
  const targetWidth = Math.min(Math.round(width * scale2), OUTPUT_EDGE_MAX);
  const targetHeight = Math.min(Math.round(height * scale2), OUTPUT_EDGE_MAX);
  return {
    targetWidth,
    targetHeight,
  };
}
function suggestEnhanceImageResolution(width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return DEFAULT_ENHANCE_IMAGE_RESOLUTION;
  for (const option2 of ENHANCE_IMAGE_RESOLUTIONS) {
    if (RESOLUTION_LONG_EDGE[option2] > long) return option2;
  }
  return "8k";
}
function ResolutionToggle({ value, width, height, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active, #ffffff14)",
      }}
    >
      {ENHANCE_IMAGE_RESOLUTIONS.map((option2) => {
        const active2 = option2 === value;
        const disabled2 = isEnhanceImageResolutionBelowSource(
          option2,
          width,
          height,
        );
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            onClick={() => {
              if (disabled2) return;
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.enhance-image.resolution-${option2}`}
            title={
              disabled2
                ? t2("canvas.enhanceImage.belowSource", "目标分辨率不高于原图")
                : void 0
            }
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors"
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
            {formatEnhanceImageResolution(option2)}
          </button>
        );
      })}
    </div>
  );
}
export const EnhanceImagePopover = reactExports.memo(
  function EnhanceImagePopover2({
    onSubmit,
    onClose,
    width,
    height,
    creditCost,
  }) {
    const { t: t2 } = useTranslation();
    const [resolution, setResolution] = reactExports.useState(() =>
      width && height
        ? suggestEnhanceImageResolution(width, height)
        : DEFAULT_ENHANCE_IMAGE_RESOLUTION,
    );
    const onCloseRef = reactExports.useRef(onClose);
    onCloseRef.current = onClose;
    const nodeId = useNodeId();
    const selectedSelector = reactExports.useCallback(
      (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const selected2 = useStore(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (!selected2) onCloseRef.current();
    }, [selected2]);
    const hidden = isDragging || isMultiSelect || isBoxSelecting;
    const isBelowSource = isEnhanceImageResolutionBelowSource(
      resolution,
      width,
      height,
    );
    const handleSubmit = reactExports.useCallback(() => {
      if (isBelowSource) return;
      const target = computeEnhanceImageTarget(resolution, width, height);
      onSubmit({
        resolution,
        targetWidth: target?.targetWidth,
        targetHeight: target?.targetHeight,
      });
    }, [isBelowSource, resolution, width, height, onSubmit]);
    return (
      <NodeToolbar
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        <div
          className="flex w-64 flex-col gap-3 rounded-lg border bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
          style={{
            display: hidden ? "none" : void 0,
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
        >
          <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
            {t2("canvas.enhanceImage.title", "高清增强")}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
              {t2("canvas.enhanceImage.resolutionLabel", "分辨率")}
            </span>
            <ResolutionToggle
              value={resolution}
              width={width}
              height={height}
              onChange={setResolution}
            />
          </div>
          <div className="flex w-full items-center justify-between pt-3">
            <button
              type="button"
              onClick={onClose}
              data-action-ui-id="canvas.enhance-image.cancel"
              className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
              aria-label={t2("canvas.enhanceImage.cancel", "取消")}
              title={t2("canvas.enhanceImage.cancel", "取消")}
            >
              <CloseIcon />
            </button>
            <div className="flex items-center gap-1.5">
              <CreditCostBadge cost={creditCost} compact={true} />
              <Button
                variant="default"
                size="icon"
                disabled={isBelowSource}
                onClick={handleSubmit}
                data-action-ui-id="canvas.enhance-image.submit"
                aria-label={t2("canvas.enhanceImage.submit", "生成")}
                title={
                  isBelowSource
                    ? t2(
                        "canvas.enhanceImage.belowSource",
                        "目标分辨率不高于原图",
                      )
                    : void 0
                }
              >
                <SendArrowIcon />
              </Button>
            </div>
          </div>
        </div>
      </NodeToolbar>
    );
  },
);
