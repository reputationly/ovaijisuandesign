// canvas-erase-bottom-bar.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { BananaResolutionPicker } from "./banana-resolution-picker.jsx";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { useImageEditCost } from "./image-edit-pricing.js";
const ERASE_RESOLUTIONS = ["1K", "2K"];
const ERASE_REF_COUNT = 1;
export const CanvasEraseBottomBar = reactExports.memo(
  function CanvasEraseBottomBar2({
    onCancel,
    onConfirm,
    confirming,
    canConfirm,
    resolution,
    onResolutionChange,
  }) {
    const { t: t2 } = useTranslation();
    const creditCost = useImageEditCost(
      "erase",
      resolution,
      void 0,
      ERASE_REF_COUNT,
    );
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so bar events don't reach the canvas pan/zoom handlers
      <div
        className="flex h-10 items-center gap-2 rounded-lg border p-1"
        style={{
          background: "var(--canvas-controls-bg, #262626)",
          borderColor: "var(--canvas-controls-border, #363636)",
          boxShadow: "var(--canvas-shadow-dropdown)",
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
      >
        <div className="flex items-center gap-16">
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-md transition-colors duration-150"
            aria-label={t2("common.cancel")}
            title={t2("common.cancel")}
            style={{
              color: "var(--canvas-controls-text, #fff)",
              background: "transparent",
              opacity: 0.7,
            }}
            onMouseEnter={(e2) => {
              e2.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e2) => {
              e2.currentTarget.style.opacity = "0.7";
            }}
          >
            <CloseIcon />
          </button>
          <BananaResolutionPicker
            value={resolution}
            onChange={onResolutionChange}
            disabled={confirming}
            options={ERASE_RESOLUTIONS}
          />
        </div>
        <div className="flex items-center gap-2">
          {!confirming && <CreditCostBadge cost={creditCost} compact={true} />}
          <button
            type="button"
            disabled={!canConfirm || confirming}
            onClick={onConfirm}
            className="inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
            aria-label={
              confirming ? t2("canvas.erasing") : t2("canvas.eraseApply")
            }
            title={confirming ? t2("canvas.erasing") : t2("canvas.eraseApply")}
            style={{
              background: "var(--canvas-primary-btn-bg, #000000d9)",
              color: "var(--canvas-primary-btn-icon, #fff)",
            }}
            onMouseEnter={(e2) => {
              if (confirming || !canConfirm) return;
              e2.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e2) => {
              e2.currentTarget.style.opacity = "1";
            }}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    );
  },
);
