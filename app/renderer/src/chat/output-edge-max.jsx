import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { longEdge } from "./long-edge.jsx";
import { RESOLUTION_LABELS } from "./resolution-labels.jsx";
import { CreditCostBadge } from "./token-icon.jsx";
import { Button as Button$2 } from "@base-ui/react";
import { default as reactExports } from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export const OUTPUT_EDGE_MAX = 10240;

export const ENHANCE_IMAGE_RESOLUTIONS = ["1k", "2k", "4k", "8k"];

export const RESOLUTION_LONG_EDGE = {
  "1k": 1024,
  "2k": 2048,
  "4k": 3840,
  "8k": 7680,
};

export function formatEnhanceImageResolution(value) {
  return RESOLUTION_LABELS[value];
}

export const DEFAULT_ENHANCE_IMAGE_RESOLUTION = "2k";

export function isEnhanceImageResolutionBelowSource(option2, width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return false;
  return RESOLUTION_LONG_EDGE[option2] <= long;
}

export function computeEnhanceImageTarget(option2, width, height) {
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

export function suggestEnhanceImageResolution(width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return DEFAULT_ENHANCE_IMAGE_RESOLUTION;
  for (const option2 of ENHANCE_IMAGE_RESOLUTIONS) {
    if (RESOLUTION_LONG_EDGE[option2] > long) return option2;
  }
  return "8k";
}

export const EnhanceImagePanel = reactExports.memo(function EnhanceImagePanel2({
  onSubmit,
  onClose,
  width,
  height,
  creditCost,
  submitting = false,
}) {
  const { t: t2 } = useTranslation();
  const [resolution2, setResolution] = reactExports.useState(() =>
    width && height ? suggestEnhanceImageResolution(width, height) : DEFAULT_ENHANCE_IMAGE_RESOLUTION,
  );
  const isBelowSource = isEnhanceImageResolutionBelowSource(resolution2, width, height);
  const handleSubmit = reactExports.useCallback(() => {
    if (isBelowSource || submitting) return;
    const target = computeEnhanceImageTarget(resolution2, width, height);
    onSubmit({
      resolution: resolution2,
      targetWidth: target?.targetWidth,
      targetHeight: target?.targetHeight,
    });
  }, [isBelowSource, submitting, resolution2, width, height, onSubmit]);
  return (
    <div
      className="flex w-64 flex-col gap-3 rounded-lg border bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
      onPointerDown={(e2) => e2.stopPropagation()}
    >
      <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
        {t2("canvas.enhanceImage.title", "高清增强")}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
          {t2("canvas.enhanceImage.resolutionLabel", "分辨率")}
        </span>
        <ResolutionToggle value={resolution2} width={width} height={height} onChange={setResolution} />
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
          <Button$2
            variant="default"
            size="icon"
            disabled={isBelowSource || submitting}
            onClick={handleSubmit}
            data-action-ui-id="canvas.enhance-image.submit"
            aria-label={t2("canvas.enhanceImage.submit", "生成")}
            title={isBelowSource ? t2("canvas.enhanceImage.belowSource", "目标分辨率不高于原图") : void 0}
          >
            <SendArrowIcon />
          </Button$2>
        </div>
      </div>
    </div>
  );
});

export function ResolutionToggle({ value, width, height, onChange }) {
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
        const disabled = isEnhanceImageResolutionBelowSource(option2, width, height);
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.enhance-image.resolution-${option2}`}
            title={disabled ? t2("canvas.enhanceImage.belowSource", "目标分辨率不高于原图") : void 0}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors"
            style={{
              background: active2 ? "var(--canvas-primary-btn-bg, #ffffff)" : "transparent",
              color: active2 ? "var(--canvas-primary-btn-icon, #000)" : "var(--canvas-controls-text, #fff)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {formatEnhanceImageResolution(option2)}
          </button>
        );
      })}
    </div>
  );
}
