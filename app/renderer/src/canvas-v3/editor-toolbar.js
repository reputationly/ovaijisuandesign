import { Tooltip, TooltipContent, TooltipTrigger } from "./main-exports.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";

/**
 * 编辑器工具栏的自包含部分：渐变/图案生成器、图标、省略文本（第 223 轮）（第 220 轮从 EditorInterface chunk 取回）。
 *
 * 参考：EditorInterface-DwXc-S2S.js 5309–6440，共 10 个声明。Toolbar 本体（978 行）依赖尚未还原的导出引擎，暂不取。
 */

export const CapCutIcon = ({ size = 24, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    ...props,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        fillRule: "evenodd",
        transform: "translate(1.2 1.2) scale(.9)",
        d: "M24.189 6.442V2.671l-4.535 2.383V4.91c.002-1.505-1.078-2.411-2.638-2.411H2.64C.993 2.5 0 3.407 0 4.91V8.72L6.354 12 0 15.316v3.8C0 20.595 1 21.5 2.64 21.5h14.373c1.56 0 2.639-.907 2.639-2.382v-.197l4.536 2.409v-3.828L13.64 12 24.19 6.443zM9.982 13.873l7.797 4.083H2.157l7.825-4.083zm7.741-7.828l-7.742 4.057-7.825-4.057h15.567z"
      }
    )
  }
);

export const EllipsisText = ({ text, className }) => {
  const ref = reactExports.useRef(null);
  const [isOverflowing, setIsOverflowing] = reactExports.useState(false);
  const measure = reactExports.useCallback(() => {
    const el = ref.current;
    if (el) setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);
  reactExports.useLayoutEffect(() => {
    measure();
  }, [measure, text]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        ref,
        onPointerEnter: measure,
        className: `block min-w-0 truncate ${className ?? ""}`,
        children: text
      }
    ) }),
    isOverflowing && // dropdown content 是 z-[9999]，tooltip 默认 z-50 会被压在下面。
    /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { side: "top", className: "z-[10000] max-w-[18rem] px-2 py-1 text-[12px]", children: text })
  ] });
};

export const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const generateSolidBackground = (color) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas;
};

export const generateLinearGradient = (colors, angle = 180) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const radians = (angle - 90) * (Math.PI / 180);
  const x1 = width / 2 - Math.cos(radians) * width;
  const y1 = height / 2 - Math.sin(radians) * height;
  const x2 = width / 2 + Math.cos(radians) * width;
  const y2 = height / 2 + Math.sin(radians) * height;
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach(
    (color, i) => gradient.addColorStop(i / (colors.length - 1), color)
  );
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas;
};

export const generateRadialGradient = (colors) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
  );
  colors.forEach(
    (color, i) => gradient.addColorStop(i / (colors.length - 1), color)
  );
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas;
};

export const generateMeshGradient = (colors) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, width, height);
  const blobs = [
    { x: 0.2, y: 0.3, r: 0.6, color: colors[1] || colors[0] },
    { x: 0.8, y: 0.2, r: 0.5, color: colors[2] || colors[1] || colors[0] },
    { x: 0.5, y: 0.8, r: 0.55, color: colors[3] || colors[2] || colors[0] },
    { x: 0.1, y: 0.9, r: 0.4, color: colors[4] || colors[1] || colors[0] }
  ];
  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(
      blob.x * width,
      blob.y * height,
      0,
      blob.x * width,
      blob.y * height,
      blob.r * Math.max(width, height)
    );
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas;
};

export const generateNoisePattern = (baseColor, noiseIntensity = 0.1) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * noiseIntensity;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const generateGridPattern = (bgColor, lineColor, spacing = 40) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  return canvas;
};

export const generateDotsPattern = (bgColor, dotColor, spacing = 30, dotSize = 3) => (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = dotColor;
  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing / 2; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
};
