// layer-decompose-prompt.jsx
import {
  Layers3,
  reactExports,
  usePromptFontSizeStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TokenIcon } from "../generation/missing-asset-card.jsx";
import { PopoverShell } from "../generation/attachment-bar.jsx";
import { SubmitButton } from "../generation/submit-button.jsx";
import { drawWatermark } from "./single-position.js";
import { ImageSplitOverlayInner } from "./image-split-overlay-inner.jsx";
export const ImageSplitOverlay = reactExports.memo(ImageSplitOverlayInner);
export const DEFAULT_WATERMARK_SETTINGS = {
  text: "@ 水印文案",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 48,
  fontWeight: 400,
  color: "#000000",
  opacity: 100,
  rotation: 0,
  mode: "tile",
  position: "br",
  spacing: 120,
  padding: 30,
  shadow: false,
  shadowBlur: 4,
};
export const ImageWatermarkPreview = reactExports.memo(
  function ImageWatermarkPreviewComponent({
    displayWidth,
    displayHeight,
    sourceWidth,
    settings,
  }) {
    const canvasRef = reactExports.useRef(null);
    reactExports.useEffect(() => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        displayWidth <= 0 ||
        displayHeight <= 0 ||
        sourceWidth <= 0
      )
        return;
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(displayWidth * ratio));
      canvas.height = Math.max(1, Math.round(displayHeight * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(ratio, ratio);
      const previewScale = displayWidth / sourceWidth;
      drawWatermark(context, displayWidth, displayHeight, {
        ...settings,
        fontSize: settings.fontSize * previewScale,
        spacing: settings.spacing * previewScale,
        padding: settings.padding * previewScale,
        shadowBlur: settings.shadowBlur * previewScale,
      });
    }, [displayHeight, displayWidth, settings, sourceWidth]);
    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] size-full"
        data-action-ui-id="canvas.watermark.live-preview"
      />
    );
  },
);
export function LayerDecomposePrompt({
  prompt,
  submitting,
  creditCost,
  onPromptChange,
  onSubmit,
  onClose,
}) {
  const { t } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const fontSize = usePromptFontSizeStore((state) => state.fontSize);
  reactExports.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const costBadge =
    creditCost != null ? (
      <span
        data-action-ui-id="canvas.layer-decompose-prompt.credit-cost"
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] tracking-tight text-[var(--canvas-controls-text,#fff)]/70"
      >
        <TokenIcon />
        <span className="pointer-events-none tabular-nums">{creditCost}</span>
        <span>{t("canvas.layerDecompose.costPerImage", "积分/张")}</span>
      </span>
    ) : (
      void 0
    );
  return (
    <PopoverShell onClose={onClose}>
      <div
        data-action-ui-id="canvas.layer-decompose-prompt"
        className="canvas-prompt-font-size-editor flex h-full min-h-0 flex-col"
        style={{
          "--canvas-prompt-font-size": fontSize,
        }}
      >
        <textarea
          ref={inputRef}
          data-action-ui-id="canvas.layer-decompose-prompt.input"
          value={prompt}
          disabled={submitting}
          placeholder={t(
            "canvas.layerDecompose.promptPlaceholder",
            "不填提示词：自动识别所有主要元素逐一拆分；也可用自然语言描述要拆的元素。",
          )}
          aria-label={t("canvas.layerDecompose.promptLabel", "图层拆分提示词")}
          className="canvas-prompt-font-size-textarea nowheel nopan min-h-0 flex-1 resize-none border-0 bg-transparent px-1 text-[var(--canvas-controls-text)] outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
        <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
          <div
            data-action-ui-id="canvas.layer-decompose-prompt.tool-label"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--canvas-controls-text)]"
          >
            <Layers3 size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{t("canvas.layerDecompose.label", "Split Layers")}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SubmitButton
              submitting={submitting}
              canSubmit={!submitting}
              creditCost={creditCost}
              costBadge={costBadge}
              onClick={() => onSubmit()}
              title={t("canvas.layerDecompose.start", "开始拆分")}
            />
          </div>
        </div>
      </div>
    </PopoverShell>
  );
}
export const VIEWBOX_SIZE = 40;
const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;
const DEG = Math.PI / 180;
export const add = (leftVector, rightVector) => ({
  x: leftVector.x + rightVector.x,
  y: leftVector.y + rightVector.y,
  z: leftVector.z + rightVector.z,
});
const scale = (value, amount) => ({
  x: value.x * amount,
  y: value.y * amount,
  z: value.z * amount,
});
const cross = (leftVector, rightVector) => ({
  x: leftVector.y * rightVector.z - leftVector.z * rightVector.y,
  y: leftVector.z * rightVector.x - leftVector.x * rightVector.z,
  z: leftVector.x * rightVector.y - leftVector.y * rightVector.x,
});
const vectorMagnitude = (value) => Math.hypot(value.x, value.y, value.z);
const normalize = (value) => {
  const magnitude = vectorMagnitude(value);
  return magnitude < 1e-6
    ? {
        x: 0,
        y: 0,
        z: 0,
      }
    : scale(value, 1 / magnitude);
};
export function getCameraModelView(horizontalAngle, verticalAngle) {
  const horizontalRadians = horizontalAngle * DEG;
  const verticalRadians = verticalAngle * DEG;
  const position = normalize({
    x: Math.sin(horizontalRadians) * Math.cos(verticalRadians),
    y: Math.sin(verticalRadians),
    z: Math.cos(horizontalRadians) * Math.cos(verticalRadians),
  });
  const forward = scale(position, -1);
  let right = normalize(
    cross(forward, {
      x: 0,
      y: 1,
      z: 0,
    }),
  );
  if (vectorMagnitude(right) < 1e-6)
    right = {
      x: 1,
      y: 0,
      z: 0,
    };
  const upVector = normalize(cross(right, forward));
  return {
    right,
    up: upVector,
    forward,
    frontVisibility: forward.z,
    backVisibility: -forward.z,
  };
}
export function localToWorld(point, basis) {
  return add(
    add(scale(basis.right, point.x), scale(basis.up, point.y)),
    scale(basis.forward, point.z),
  );
}
export function project(point, basis) {
  const world = localToWorld(point, basis);
  return {
    x: VIEWBOX_CENTER + world.x,
    y: VIEWBOX_CENTER - world.y,
    z: world.z,
  };
}
export function pointsAttribute(points) {
  return points
    .map(({ x: pointX, y: pointY }) => `${pointX.toFixed(2)},${pointY.toFixed(2)}`)
    .join(" ");
}
export function planeEllipse({ center, radius, basis, steps = 28 }) {
  return Array.from(
    {
      length: steps,
    },
    (_unusedValue, index) => {
      const angle = (index / steps) * Math.PI * 2;
      return project(
        {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
          z: center.z,
        },
        basis,
      );
    },
  );
}
