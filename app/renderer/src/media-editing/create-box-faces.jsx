// create-box-faces.jsx
import { reactExports, useTranslation, usePromptFontSizeStore, Layers3 } from "../vendor.js";
import { TokenIcon$2 } from "../generation/create-tracker.jsx";
import { PopoverShell } from "../generation/use-direct-reference-picker.jsx";
import { SubmitButton } from "../generation/param-tabs.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageSplitOverlayInner } from "./use-image-split-mode.jsx";
export const ImageSplitOverlay = reactExports.memo(ImageSplitOverlayInner);
export const DEFAULT_WATERMARK_SETTINGS = {
  text: "@ 水印文案",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
function loadImage$2(src) {
  return new Promise((resolve, reject) => {
    const image2 = new Image();
    image2.crossOrigin = "anonymous";
    image2.onload = () => resolve(image2);
    image2.onerror = reject;
    image2.src = src;
  });
}
function singlePosition(width, height, settings) {
  const padding = settings.padding;
  const top2 = padding + settings.fontSize / 2;
  const middle = height / 2;
  const bottom = height - padding - settings.fontSize / 2;
  const left = padding;
  const center = width / 2;
  const right = width - padding;
  const positions = {
    tl: {
      x: left,
      y: top2,
      align: "left",
    },
    tc: {
      x: center,
      y: top2,
      align: "center",
    },
    tr: {
      x: right,
      y: top2,
      align: "right",
    },
    ml: {
      x: left,
      y: middle,
      align: "left",
    },
    mc: {
      x: center,
      y: middle,
      align: "center",
    },
    mr: {
      x: right,
      y: middle,
      align: "right",
    },
    bl: {
      x: left,
      y: bottom,
      align: "left",
    },
    bc: {
      x: center,
      y: bottom,
      align: "center",
    },
    br: {
      x: right,
      y: bottom,
      align: "right",
    },
  };
  return positions[settings.position];
}
export function drawWatermark(context, width, height, settings) {
  if (!settings.text.trim()) return;
  context.save();
  context.font = `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}`;
  context.fillStyle = settings.color;
  context.globalAlpha = settings.opacity / 100;
  context.textBaseline = "middle";
  if (settings.shadow) {
    context.shadowColor = "rgba(0, 0, 0, 0.6)";
    context.shadowBlur = settings.shadowBlur;
    context.shadowOffsetX = settings.shadowBlur / 4;
    context.shadowOffsetY = settings.shadowBlur / 4;
  }
  const lines = settings.text.split("\n");
  const lineHeight = settings.fontSize * 1.3;
  const rotation = (settings.rotation * Math.PI) / 180;
  if (settings.mode === "single") {
    const { x: x2, y: y4, align } = singlePosition(width, height, settings);
    const startY = y4 - ((lines.length - 1) * lineHeight) / 2;
    context.textAlign = align;
    context.translate(x2, y4);
    context.rotate(rotation);
    context.translate(-x2, -y4);
    lines.forEach((line, index2) => {
      context.fillText(line, x2, startY + index2 * lineHeight);
    });
  } else {
    context.textAlign = "center";
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));
    const blockHeight = lines.length * lineHeight;
    const stepX = Math.max(1, widest + settings.spacing);
    const stepY = Math.max(1, blockHeight + settings.spacing);
    const centerX = width / 2;
    const centerY = height / 2;
    const diagonal = Math.hypot(width, height);
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.translate(-centerX, -centerY);
    for (let y4 = -diagonal; y4 < height + diagonal; y4 += stepY) {
      for (let x2 = -diagonal; x2 < width + diagonal; x2 += stepX) {
        lines.forEach((line, index2) => {
          context.fillText(line, x2, y4 + index2 * lineHeight);
        });
      }
    }
  }
  context.restore();
}
export async function renderWatermarkedBlob(src, settings) {
  const image2 = await loadImage$2(src);
  const canvas = document.createElement("canvas");
  canvas.width = image2.naturalWidth || image2.width;
  canvas.height = image2.naturalHeight || image2.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("watermark-utils: 2d context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image2, 0, 0, canvas.width, canvas.height);
  drawWatermark(context, canvas.width, canvas.height, settings);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("watermark-utils: toBlob returned null"));
    }, "image/png");
  });
}
export const ImageWatermarkPreview = reactExports.memo(function ImageWatermarkPreview2({
  displayWidth,
  displayHeight,
  sourceWidth,
  settings,
}) {
  const canvasRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth <= 0 || displayHeight <= 0 || sourceWidth <= 0) return;
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
});
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
const add$1 = (a2, b3) => ({
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
function localToWorld(point2, basis) {
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
  return points.map(({ x: x2, y: y4 }) => `${x2.toFixed(2)},${y4.toFixed(2)}`).join(" ");
}
export function createBoxFaces({ key: key2, center, size: size2, basis, fills, stroke }) {
  const x2 = size2.x / 2;
  const y4 = size2.y / 2;
  const z3 = size2.z / 2;
  const vertices = [
    {
      x: -x2,
      y: -y4,
      z: -z3,
    },
    {
      x: x2,
      y: -y4,
      z: -z3,
    },
    {
      x: x2,
      y: y4,
      z: -z3,
    },
    {
      x: -x2,
      y: y4,
      z: -z3,
    },
    {
      x: -x2,
      y: -y4,
      z: z3,
    },
    {
      x: x2,
      y: -y4,
      z: z3,
    },
    {
      x: x2,
      y: y4,
      z: z3,
    },
    {
      x: -x2,
      y: y4,
      z: z3,
    },
  ].map((point2) => add$1(point2, center));
  const definitions = [
    {
      name: "back",
      indices: [0, 3, 2, 1],
      normal: {
        x: 0,
        y: 0,
        z: -1,
      },
    },
    {
      name: "front",
      indices: [4, 5, 6, 7],
      normal: {
        x: 0,
        y: 0,
        z: 1,
      },
    },
    {
      name: "left",
      indices: [0, 4, 7, 3],
      normal: {
        x: -1,
        y: 0,
        z: 0,
      },
    },
    {
      name: "right",
      indices: [1, 2, 6, 5],
      normal: {
        x: 1,
        y: 0,
        z: 0,
      },
    },
    {
      name: "bottom",
      indices: [0, 1, 5, 4],
      normal: {
        x: 0,
        y: -1,
        z: 0,
      },
    },
    {
      name: "top",
      indices: [3, 7, 6, 2],
      normal: {
        x: 0,
        y: 1,
        z: 0,
      },
    },
  ];
  return definitions.flatMap((definition2) => {
    const visibility = localToWorld(definition2.normal, basis).z;
    if (visibility <= 1e-3) return [];
    const points = definition2.indices.map((index2) => project$1(vertices[index2], basis));
    return [
      {
        key: `${key2}-${definition2.name}`,
        points,
        depth: points.reduce((sum2, point2) => sum2 + point2.z, 0) / points.length,
        fill: fills[definition2.name] ?? fills.front,
        stroke,
      },
    ];
  });
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
