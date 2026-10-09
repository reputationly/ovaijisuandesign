// layer-decompose-prompt.jsx
import {
  Layers3,
  reactExports,
  usePromptFontSizeStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TokenIcon$2 } from "../generation/missing-asset-card.jsx";
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
  function ImageWatermarkPreview2({
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
  const { t: t2 } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  reactExports.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const costBadge =
    creditCost != null ? (
      <span
        data-action-ui-id="canvas.layer-decompose-prompt.credit-cost"
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] tracking-tight text-[var(--canvas-controls-text,#fff)]/70"
      >
        <TokenIcon$2 />
        <span className="pointer-events-none tabular-nums">{creditCost}</span>
        <span>{t2("canvas.layerDecompose.costPerImage", "积分/张")}</span>
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
          placeholder={t2(
            "canvas.layerDecompose.promptPlaceholder",
            "不填提示词：自动识别所有主要元素逐一拆分；也可用自然语言描述要拆的元素。",
          )}
          aria-label={t2("canvas.layerDecompose.promptLabel", "图层拆分提示词")}
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
            <span>{t2("canvas.layerDecompose.label", "Split Layers")}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SubmitButton
              submitting={submitting}
              canSubmit={!submitting}
              creditCost={creditCost}
              costBadge={costBadge}
              onClick={() => onSubmit()}
              title={t2("canvas.layerDecompose.start", "开始拆分")}
            />
          </div>
        </div>
      </div>
    </PopoverShell>
  );
}

export const VIEWBOX_SIZE = 40;

const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;

const DEG$2 = Math.PI / 180;

export const add$1 = (a2, b3) => ({
  x: a2.x + b3.x,
  y: a2.y + b3.y,
  z: a2.z + b3.z,
});

const scale = (value, amount) => ({
  x: value.x * amount,
  y: value.y * amount,
  z: value.z * amount,
});

const cross = (a2, b3) => ({
  x: a2.y * b3.z - a2.z * b3.y,
  y: a2.z * b3.x - a2.x * b3.z,
  z: a2.x * b3.y - a2.y * b3.x,
});

const length$1 = (value) => Math.hypot(value.x, value.y, value.z);

const normalize$4 = (value) => {
  const magnitude = length$1(value);
  return magnitude < 1e-6
    ? {
        x: 0,
        y: 0,
        z: 0,
      }
    : scale(value, 1 / magnitude);
};

export function getCameraModelView(horizontalAngle, verticalAngle) {
  const h2 = horizontalAngle * DEG$2;
  const v2 = verticalAngle * DEG$2;
  const position2 = normalize$4({
    x: Math.sin(h2) * Math.cos(v2),
    y: Math.sin(v2),
    z: Math.cos(h2) * Math.cos(v2),
  });
  const forward = scale(position2, -1);
  let right = normalize$4(
    cross(forward, {
      x: 0,
      y: 1,
      z: 0,
    }),
  );
  if (length$1(right) < 1e-6)
    right = {
      x: 1,
      y: 0,
      z: 0,
    };
  const up = normalize$4(cross(right, forward));
  return {
    right,
    up,
    forward,
    frontVisibility: forward.z,
    backVisibility: -forward.z,
  };
}

export function localToWorld(point2, basis) {
  return add$1(
    add$1(scale(basis.right, point2.x), scale(basis.up, point2.y)),
    scale(basis.forward, point2.z),
  );
}

export function project$1(point2, basis) {
  const world = localToWorld(point2, basis);
  return {
    x: VIEWBOX_CENTER + world.x,
    y: VIEWBOX_CENTER - world.y,
    z: world.z,
  };
}

export function pointsAttribute(points) {
  return points
    .map(({ x: x2, y: y4 }) => `${x2.toFixed(2)},${y4.toFixed(2)}`)
    .join(" ");
}

export function planeEllipse({ center, radius, basis, steps = 28 }) {
  return Array.from(
    {
      length: steps,
    },
    (_2, index2) => {
      const angle = (index2 / steps) * Math.PI * 2;
      return project$1(
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
