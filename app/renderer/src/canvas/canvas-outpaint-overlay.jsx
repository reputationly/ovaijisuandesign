// canvas-outpaint-overlay.jsx
import {
  CompositedSvg,
  reactExports,
  useReactFlow,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { clamp$6 } from "./use-start-crop-from-node.js";
import { CloseIcon$1, SendArrowIcon } from "./file-missing-icon.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { useImageEditCost } from "../media-editing/image-edit-pricing.js";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { useOutpaintState } from "../media-editing/use-start-cloud-edit-from-node.js";

function ImageIcon$1({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.4248 7.70801C8.23163 7.38605 7.76543 7.38392 7.56934 7.7041L2.3418 16.2393C2.13811 16.5724 2.378 17 2.76855 17H17.3525C17.7602 17 17.996 16.5386 17.7578 16.208L14.4053 11.5625C14.2057 11.286 13.7943 11.286 13.5947 11.5625L12.0342 13.7236L8.4248 7.70801ZM14.5 4C13.6716 4 13 4.67157 13 5.5C13 6.32843 13.6716 7 14.5 7C15.3284 7 16 6.32843 16 5.5C16 4.67157 15.3284 4 14.5 4Z" />
    </CompositedSvg>
  );
}

const CORNER_CLASSES = {
  tl: "absolute -left-[2px] -top-[2px] h-6 w-6 cursor-nw-resize z-10",
  tr: "absolute -right-[2px] -top-[2px] h-6 w-6 cursor-ne-resize z-10",
  bl: "absolute -bottom-[2px] -left-[2px] h-6 w-6 cursor-sw-resize z-10",
  br: "absolute -bottom-[2px] -right-[2px] h-6 w-6 cursor-se-resize z-10",
};

const CORNER_LINES = {
  tl: [
    "absolute left-0 top-0 h-[3px] w-full",
    "absolute left-0 top-0 h-full w-[3px]",
  ],
  tr: [
    "absolute right-0 top-0 h-[3px] w-full",
    "absolute right-0 top-0 h-full w-[3px]",
  ],
  bl: [
    "absolute bottom-0 left-0 h-[3px] w-full",
    "absolute bottom-0 left-0 h-full w-[3px]",
  ],
  br: [
    "absolute bottom-0 right-0 h-[3px] w-full",
    "absolute bottom-0 right-0 h-full w-[3px]",
  ],
};

function CornerHandle({ position: position2, onPointerDown: onPointerDown2 }) {
  const [lineA, lineB] = CORNER_LINES[position2];
  const lineStyle = {
    background: "var(--canvas-node-border-selected, #141414)",
  };
  return (
    <div
      className={CORNER_CLASSES[position2]}
      onPointerDown={(e2) => onPointerDown2(e2, position2)}
    >
      <div className={lineA} style={lineStyle} />
      <div className={lineB} style={lineStyle} />
    </div>
  );
}

const EDGE_CLASSES = {
  t: "absolute -top-[2px] left-6 right-6 h-[12px] -mt-[5px] cursor-n-resize z-10 flex items-center justify-center",
  b: "absolute -bottom-[2px] left-6 right-6 h-[12px] -mb-[5px] cursor-s-resize z-10 flex items-center justify-center",
  l: "absolute -left-[2px] top-6 bottom-6 w-[12px] -ml-[5px] cursor-w-resize z-10 flex items-center justify-center",
  r: "absolute -right-[2px] top-6 bottom-6 w-[12px] -mr-[5px] cursor-e-resize z-10 flex items-center justify-center",
};

const EDGE_BAR_CLASSES = {
  t: "h-[3px] w-8 rounded-full",
  b: "h-[3px] w-8 rounded-full",
  l: "h-8 w-[3px] rounded-full",
  r: "h-8 w-[3px] rounded-full",
};

function EdgeHandle({ position: position2, onPointerDown: onPointerDown2 }) {
  return (
    <div
      className={EDGE_CLASSES[position2]}
      onPointerDown={(e2) => onPointerDown2(e2, position2)}
    >
      <div
        className={EDGE_BAR_CLASSES[position2]}
        style={{
          background: "var(--canvas-node-border-selected, #141414)",
        }}
      />
    </div>
  );
}

const DEFAULT_IMAGE_OFFSET = {
  x: 0,
  y: 0,
};

const OUTPAINT_SCALE_OPTIONS = [1, 1.5, 2, 3, 4];

const MAX_OUTPAINT_OUTPUT_LONGEST = 8e3;

function isOutpaintScaleAllowed(longestPx, scale2) {
  if (scale2 === 1) return true;
  return longestPx * scale2 <= MAX_OUTPAINT_OUTPUT_LONGEST;
}

const OUTPAINT_STYLE_PRESETS = [
  "general",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "twitter",
];

const OUTPAINT_PRESET_ITEMS = {
  general: [
    {
      id: "general:original",
      ratio: null,
      ratioLabel: "Original",
      ratioLabelKey: "canvas.outpaintRatio.original",
    },
    {
      id: "general:1:1",
      ratio: 1,
      ratioLabel: "1:1",
    },
    {
      id: "general:3:4",
      ratio: 3 / 4,
      ratioLabel: "3:4",
    },
    {
      id: "general:2:3",
      ratio: 2 / 3,
      ratioLabel: "2:3",
    },
    {
      id: "general:9:16",
      ratio: 9 / 16,
      ratioLabel: "9:16",
    },
    {
      id: "general:4:3",
      ratio: 4 / 3,
      ratioLabel: "4:3",
    },
    {
      id: "general:3:2",
      ratio: 3 / 2,
      ratioLabel: "3:2",
    },
    {
      id: "general:16:9",
      ratio: 16 / 9,
      ratioLabel: "16:9",
    },
    {
      id: "general:4:5",
      ratio: 4 / 5,
      ratioLabel: "4:5",
    },
    {
      id: "general:5:4",
      ratio: 5 / 4,
      ratioLabel: "5:4",
    },
  ],
  instagram: [
    {
      id: "instagram:square",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Square",
      useCaseKey: "canvas.outpaintRatio.square",
    },
    {
      id: "instagram:reel",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Story",
      useCaseKey: "canvas.outpaintRatio.story",
    },
    {
      id: "instagram:portrait",
      ratio: 4 / 5,
      ratioLabel: "4:5",
      useCase: "Portrait",
      useCaseKey: "canvas.outpaintRatio.portrait",
    },
    {
      id: "instagram:landscape",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Landscape",
      useCaseKey: "canvas.outpaintRatio.landscape",
    },
    {
      id: "instagram:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  facebook: [
    {
      id: "facebook:story",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Story",
      useCaseKey: "canvas.outpaintRatio.story",
    },
    {
      id: "facebook:post",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Post",
      useCaseKey: "canvas.outpaintRatio.post",
    },
    {
      id: "facebook:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  tiktok: [
    {
      id: "tiktok:video",
      ratio: 9 / 16,
      ratioLabel: "9:16",
      useCase: "Video",
      useCaseKey: "canvas.outpaintRatio.video",
    },
  ],
  linkedin: [
    {
      id: "linkedin:post",
      ratio: 1.91,
      ratioLabel: "1.91:1",
      useCase: "Post",
      useCaseKey: "canvas.outpaintRatio.post",
    },
    {
      id: "linkedin:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
  twitter: [
    {
      id: "twitter:cover",
      ratio: 3,
      ratioLabel: "3:1",
      useCase: "Cover Photo",
      useCaseKey: "canvas.outpaintRatio.cover",
    },
    {
      id: "twitter:landscape",
      ratio: 2,
      ratioLabel: "2:1",
      useCase: "Landscape",
      useCaseKey: "canvas.outpaintRatio.landscape",
    },
    {
      id: "twitter:profile",
      ratio: 1,
      ratioLabel: "1:1",
      useCase: "Profile",
      useCaseKey: "canvas.outpaintRatio.profile",
    },
  ],
};

const DEFAULT_OUTPAINT_ITEM_ID = "general:original";

const MAX_OUTPAINT_HALF = 1.5;

const DEFAULT_OUTPAINT = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

function clampOutpaintRect(r2) {
  const x2 = clamp$6(r2.x, -MAX_OUTPAINT_HALF, 0);
  const y4 = clamp$6(r2.y, -MAX_OUTPAINT_HALF, 0);
  const right = clamp$6(r2.x + r2.width, 1, 1 + MAX_OUTPAINT_HALF);
  const bottom = clamp$6(r2.y + r2.height, 1, 1 + MAX_OUTPAINT_HALF);
  return {
    x: x2,
    y: y4,
    width: right - x2,
    height: bottom - y4,
  };
}

function scaleRectAroundCenter(rect, scale2) {
  if (scale2 === 1) return rect;
  const cx2 = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const width = rect.width * scale2;
  const height = rect.height * scale2;
  return clampOutpaintRect({
    x: cx2 - width / 2,
    y: cy - height / 2,
    width,
    height,
  });
}

function clampImageOffset(rect, offset2) {
  const xMin = rect.x;
  const xMax = rect.x + rect.width - 1;
  const yMin = rect.y;
  const yMax = rect.y + rect.height - 1;
  return {
    x: clamp$6(offset2.x, xMin, xMax),
    y: clamp$6(offset2.y, yMin, yMax),
  };
}

function calcOutpaintRect({ initialRect, deltaX, deltaY, handle: handle2 }) {
  if (handle2 === null) return initialRect;
  const { x: ix, y: iy, width: iw, height: ih } = initialRect;
  let left = ix;
  let top2 = iy;
  let right = ix + iw;
  let bottom = iy + ih;
  const movesLeft = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesRight = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesTop = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesBottom = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  if (movesLeft) left += deltaX;
  if (movesRight) right += deltaX;
  if (movesTop) top2 += deltaY;
  if (movesBottom) bottom += deltaY;
  return clampOutpaintRect({
    x: left,
    y: top2,
    width: right - left,
    height: bottom - top2,
  });
}

function calcOutpaintRectMove({ initialRect, deltaX, deltaY }) {
  const xMin = Math.max(-MAX_OUTPAINT_HALF, 1 - initialRect.width);
  const xMax = Math.min(0, 1 + MAX_OUTPAINT_HALF - initialRect.width);
  const yMin = Math.max(-MAX_OUTPAINT_HALF, 1 - initialRect.height);
  const yMax = Math.min(0, 1 + MAX_OUTPAINT_HALF - initialRect.height);
  return {
    x: clamp$6(initialRect.x + deltaX, xMin, xMax),
    y: clamp$6(initialRect.y + deltaY, yMin, yMax),
    width: initialRect.width,
    height: initialRect.height,
  };
}

function outpaintRectForAspectRatio(ratio, imageAspect) {
  if (ratio == null) return DEFAULT_OUTPAINT;
  const normRatio = ratio / imageAspect;
  let width;
  let height;
  if (normRatio >= 1) {
    height = 1;
    width = normRatio;
  } else {
    width = 1;
    height = 1 / normRatio;
  }
  const x2 = 0.5 - width / 2;
  const y4 = 0.5 - height / 2;
  return clampOutpaintRect({
    x: x2,
    y: y4,
    width,
    height,
  });
}

function rectToPixelParams(rect, offset2, originalWidth, originalHeight) {
  const targetWidth = Math.round(rect.width * originalWidth);
  const targetHeight = Math.round(rect.height * originalHeight);
  const offsetX = Math.round((-rect.x + offset2.x) * originalWidth);
  const offsetY = Math.round((-rect.y + offset2.y) * originalHeight);
  return {
    targetWidth,
    targetHeight,
    offsetX,
    offsetY,
  };
}

const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];

const RATIO_ICON_MAX = 14;

function defaultPresetLabel(p3) {
  switch (p3) {
    case "general":
      return "General";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "linkedin":
      return "LinkedIn";
    case "twitter":
      return "Twitter";
  }
}

function CheckIcon({ className }) {
  return (
    <CompositedSvg
      opacity={0.9}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.942 6.498a.75.75 0 0 1 1.116 1.004l-9 10a.75.75 0 0 1-1.088.028l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.94 3.94z" />
    </CompositedSvg>
  );
}

function DropdownItem({
  label,
  selected: selected2,
  disabled: disabled2,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled2}
      className="flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-left text-[13px] transition-colors duration-150 disabled:cursor-not-allowed"
      style={{
        color: disabled2
          ? "var(--canvas-controls-text-muted, #737373)"
          : "var(--canvas-controls-text, #262626)",
        background: selected2
          ? "var(--canvas-controls-active, #2626261a)"
          : "transparent",
        borderColor: selected2
          ? "var(--canvas-controls-text, #262626)"
          : "transparent",
        opacity: disabled2 ? 0.5 : 0.7,
      }}
      onMouseEnter={(e2) => {
        if (disabled2) return;
        e2.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e2) => {
        if (disabled2) return;
        e2.currentTarget.style.opacity = "0.7";
      }}
    >
      <span>{label}</span>
      {selected2 && !disabled2 && <CheckIcon className="size-4" />}
    </button>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <CompositedSvg
      opacity={0.9}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{
        color: "var(--canvas-controls-text-muted, #737373)",
      }}
    >
      <path d="M15.47 9.47a.75.75 0 1 1 1.06 1.06l-2.94 2.94a2.25 2.25 0 0 1-3.18 0l-2.94-2.94a.75.75 0 1 1 1.06-1.06l2.94 2.94a.75.75 0 0 0 1.06 0z" />
    </CompositedSvg>
  );
}

function Dropdown$1({ value, options, onChange }) {
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const onPointerDown2 = (e2) => {
      const target = e2.target;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
        e2.stopPropagation();
      }
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown2, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown2, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v2) => !v2)}
        className="flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-[13px] transition-colors duration-150"
        style={{
          background: "transparent",
          color: "var(--canvas-controls-text, #262626)",
          borderColor: "var(--canvas-controls-border, #0000000f)",
        }}
      >
        <span className="text-[13px]">{value}</span>
        <ChevronDownIcon
          className={
            open ? "rotate-180 transition-transform" : "transition-transform"
          }
        />
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-[calc(100%+4px)] z-10 w-full rounded-lg border p-1"
          style={{
            background: "var(--canvas-controls-bg, #ffffff)",
            borderColor: "var(--canvas-controls-border, #0000000f)",
            boxShadow: "var(--canvas-shadow-dropdown)",
          }}
        >
          {options.map((opt) => (
            <DropdownItem
              key={String(opt.value)}
              label={opt.label}
              selected={opt.label === value}
              disabled={opt.disabled}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FrameCornersIcon() {
  const corner = {
    width: 4,
    height: 4,
    borderColor: "var(--canvas-controls-text-muted, #737373)",
  };
  return (
    <span className="relative block size-[14px]">
      <span
        className="absolute left-0 top-0 [border-left-width:var(--control-border-width)] [border-top-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute right-0 top-0 [border-right-width:var(--control-border-width)] [border-top-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute bottom-0 left-0 [border-bottom-width:var(--control-border-width)] [border-left-width:var(--control-border-width)]"
        style={corner}
      />
      <span
        className="absolute bottom-0 right-0 [border-bottom-width:var(--control-border-width)] [border-right-width:var(--control-border-width)]"
        style={corner}
      />
    </span>
  );
}

function RatioGlyph({ ratio }) {
  if (ratio == null) {
    return <FrameCornersIcon />;
  }
  const w3 = ratio >= 1 ? RATIO_ICON_MAX : RATIO_ICON_MAX * ratio;
  const h2 = ratio >= 1 ? RATIO_ICON_MAX / ratio : RATIO_ICON_MAX;
  return (
    <span
      className="block border"
      style={{
        width: w3,
        height: h2,
        borderColor: "var(--canvas-controls-text-muted, #737373)",
      }}
    />
  );
}

function RatioRow({ item, selected: selected2, onClick }) {
  const { t: t2 } = useTranslation();
  const ratioLabel = item.ratioLabelKey
    ? t2(item.ratioLabelKey)
    : item.ratioLabel;
  const useCase = item.useCaseKey ? t2(item.useCaseKey) : item.useCase;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-8 items-center gap-2 rounded-md pl-[30px] pr-2 transition-colors duration-150"
      style={{
        color: "var(--canvas-controls-text, #262626)",
        background: selected2
          ? "var(--canvas-controls-active, #2626261a)"
          : "transparent",
      }}
      onMouseEnter={(e2) => {
        if (selected2) return;
        e2.currentTarget.style.background =
          "var(--canvas-controls-hover, #0000000d)";
      }}
      onMouseLeave={(e2) => {
        if (selected2) return;
        e2.currentTarget.style.background = "transparent";
      }}
    >
      {selected2 && <CheckIcon className="absolute left-2 size-4" />}
      <span
        className="flex size-[22px] shrink-0 items-center justify-center"
        style={{
          background: "var(--canvas-controls-hover, #0000000d)",
        }}
      >
        <RatioGlyph ratio={item.ratio} />
      </span>
      <span className="flex-1 truncate text-left text-[13px]">
        {ratioLabel}
      </span>
      {useCase && (
        <span
          className="shrink-0 text-[12px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {useCase}
        </span>
      )}
    </button>
  );
}

const CanvasOutpaintPanel = reactExports.memo(function CanvasOutpaintPanel2({
  preset: preset2,
  onPresetChange,
  selectedItemId,
  onSelectItem,
  scale: scale2,
  onScaleChange,
  disabledScales,
  resolution,
  onResolutionChange,
  onCancel,
  onConfirm,
  confirming,
}) {
  const { t: t2 } = useTranslation();
  const creditCost = useImageEditCost("outpaint", resolution);
  const items = OUTPAINT_PRESET_ITEMS[preset2];
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so panel events don't reach the canvas pan/zoom handlers
    <div
      className="flex w-[260px] flex-col rounded-lg border"
      style={{
        background: "var(--canvas-controls-bg, #ffffff)",
        borderColor: "var(--canvas-controls-border, #0000000f)",
        boxShadow: "var(--canvas-shadow-dropdown)",
      }}
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex h-11 items-center px-4"
        style={{
          color: "var(--canvas-controls-text, #262626)",
        }}
      >
        <span className="flex-1 font-heading text-[13px] font-medium">
          {t2("canvas.outpaint")}
        </span>
      </div>
      <div className="flex flex-col px-4 pb-2">
        <div
          className="flex h-8 items-center text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintScale")}
        </div>
        <Dropdown$1
          value={`${scale2}x`}
          options={OUTPAINT_SCALE_OPTIONS.map((s2) => ({
            label: `${s2}x`,
            value: s2,
            disabled: disabledScales?.has(s2),
          }))}
          onChange={(v2) => onScaleChange(v2)}
        />
      </div>
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <span
          className="text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintResolution")}
        </span>
        <div className="w-[120px]">
          <Dropdown$1
            value={resolution}
            options={RESOLUTION_OPTIONS.map((r2) => ({
              label: r2,
              value: r2,
            }))}
            onChange={(v2) => onResolutionChange(v2)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <span
          className="text-[13px]"
          style={{
            color: "var(--canvas-controls-text-muted, #737373)",
          }}
        >
          {t2("canvas.outpaintPreset")}
        </span>
        <div className="w-[120px]">
          <Dropdown$1
            value={t2(
              `canvas.outpaintStylePreset.${preset2}`,
              defaultPresetLabel(preset2),
            )}
            options={OUTPAINT_STYLE_PRESETS.map((p3) => ({
              label: t2(
                `canvas.outpaintStylePreset.${p3}`,
                defaultPresetLabel(p3),
              ),
              value: p3,
            }))}
            onChange={(v2) => onPresetChange(v2)}
          />
        </div>
      </div>
      <div className="autohide-scrollbar flex max-h-[320px] flex-col overflow-y-auto px-4 pb-1">
        {items.map((item) => (
          <RatioRow
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => onSelectItem(item)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150"
          aria-label={t2("common.cancel")}
          title={t2("common.cancel")}
          style={{
            color: "var(--canvas-controls-text, #262626)",
            background: "transparent",
          }}
          onMouseEnter={(e2) => {
            e2.currentTarget.style.background =
              "var(--canvas-controls-hover, #0000000d)";
          }}
          onMouseLeave={(e2) => {
            e2.currentTarget.style.background = "transparent";
          }}
        >
          <CloseIcon$1 />
        </button>
        <div className="flex items-center gap-1.5">
          {!confirming && <CreditCostBadge cost={creditCost} compact={true} />}
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
            aria-label={
              confirming
                ? t2("canvas.outpainting")
                : t2("canvas.outpaintGenerate")
            }
            title={
              confirming
                ? t2("canvas.outpainting")
                : t2("canvas.outpaintGenerate")
            }
            style={{
              background: "var(--canvas-primary-btn-bg, #000000d9)",
              color: "var(--canvas-primary-btn-icon, #ffffff)",
            }}
            onMouseEnter={(e2) => {
              if (!confirming) {
                e2.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e2) => {
              e2.currentTarget.style.opacity = "1";
            }}
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
});

const DEFAULT_RATIO_ITEM =
  OUTPAINT_PRESET_ITEMS.general.find(
    (it2) => it2.id === DEFAULT_OUTPAINT_ITEM_ID,
  ) ?? null;

function useImageOutpaint(containerWidth, containerHeight, imageAspect) {
  const [outpaintRect, setOutpaintRect] =
    reactExports.useState(DEFAULT_OUTPAINT);
  const [imageOffset, setImageOffset] =
    reactExports.useState(DEFAULT_IMAGE_OFFSET);
  const [selectedItem, setSelectedItem] =
    reactExports.useState(DEFAULT_RATIO_ITEM);
  const [scale2, setScale] = reactExports.useState(1);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
  };
  const applySelection = reactExports.useCallback(
    (item, s2) => {
      const baseRect = item
        ? outpaintRectForAspectRatio(item.ratio, imageAspect)
        : DEFAULT_OUTPAINT;
      const nextRect = scaleRectAroundCenter(baseRect, s2);
      setOutpaintRect(nextRect);
      setImageOffset(clampImageOffset(nextRect, DEFAULT_IMAGE_OFFSET));
    },
    [imageAspect],
  );
  const handleMove = reactExports.useCallback((e2) => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const { containerWidth: cw, containerHeight: ch } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    if (drag2.handle === null) {
      setOutpaintRect(
        calcOutpaintRectMove({
          initialRect: drag2.initialRect,
          deltaX,
          deltaY,
        }),
      );
    } else {
      const nextRect = calcOutpaintRect({
        initialRect: drag2.initialRect,
        deltaX,
        deltaY,
        handle: drag2.handle,
      });
      setOutpaintRect(nextRect);
      setImageOffset(clampImageOffset(nextRect, drag2.initialImageOffset));
    }
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging) return;
    let pendingEvent = null;
    const onMove = (e2) => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      const wasResizing = dragRef.current?.handle != null;
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
      if (wasResizing) {
        setSelectedItem(null);
        setScale(1);
      }
    };
    window.addEventListener("pointermove", onMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (e2, handle2 = null) => {
      if (!e2.isPrimary) return;
      if (e2.button !== 0) return;
      e2.stopPropagation();
      e2.preventDefault();
      dragRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initialRect: {
          ...outpaintRect,
        },
        initialImageOffset: {
          ...imageOffset,
        },
        handle: handle2,
      };
      setIsDragging(true);
      setActiveHandle(handle2);
    },
    [outpaintRect, imageOffset],
  );
  const selectItem = reactExports.useCallback(
    (item) => {
      setSelectedItem(item);
      applySelection(item, scale2);
    },
    [applySelection, scale2],
  );
  const selectScale = reactExports.useCallback(
    (next2) => {
      setScale(next2);
      applySelection(selectedItem, next2);
    },
    [applySelection, selectedItem],
  );
  const reset2 = reactExports.useCallback(() => {
    setSelectedItem(DEFAULT_RATIO_ITEM);
    setScale(1);
    setOutpaintRect(DEFAULT_OUTPAINT);
    setImageOffset(DEFAULT_IMAGE_OFFSET);
  }, []);
  return {
    outpaintRect,
    imageOffset,
    selectedItem,
    selectedItemId: selectedItem?.id ?? null,
    scale: scale2,
    isDragging,
    activeHandle,
    handlePointerDown,
    selectItem,
    selectScale,
    setOutpaintRect,
    setImageOffset,
    reset: reset2,
  };
}

const PANEL_GAP = 16;

const PANEL_WIDTH = 260;

const PANEL_MIN_HEIGHT = 480;

export const CanvasOutpaintOverlay = reactExports.memo(
  function CanvasOutpaintOverlay2() {
    const {
      meta: meta2,
      cancelOutpaint,
      outpaintingNodeId,
    } = useOutpaintState();
    const { onNodeAction } = useCanvasBridge();
    const enterTimeRef = reactExports.useRef(Date.now());
    const appliedRef = reactExports.useRef(false);
    const transform2 = useStore$3((s2) => s2.transform);
    const flowDomNode = useStore$3((s2) => s2.domNode);
    const reactFlow = useReactFlow();
    const [vpX, vpY, vpZoom] = transform2;
    const [confirming, setConfirming] = reactExports.useState(false);
    const [preset2, setPreset] = reactExports.useState("general");
    const [resolution, setResolution] = reactExports.useState("2K");
    const imagePos = reactExports.useMemo(() => {
      if (!meta2) return null;
      return {
        x: meta2.nodeFlowX * vpZoom + vpX,
        y: meta2.nodeFlowY * vpZoom + vpY,
        w: meta2.nodeWidth * vpZoom,
        h: meta2.nodeHeight * vpZoom,
      };
    }, [meta2, vpX, vpY, vpZoom]);
    const imageW = imagePos?.w ?? 0;
    const imageH = imagePos?.h ?? 0;
    const imageAspect = reactExports.useMemo(() => {
      if (!meta2) return 1;
      const w3 = meta2.originalWidth || meta2.nodeWidth || 1;
      const h2 = meta2.originalHeight || meta2.nodeHeight || 1;
      return w3 / h2;
    }, [meta2]);
    const {
      outpaintRect,
      imageOffset,
      selectedItem,
      selectedItemId,
      scale: scale2,
      isDragging,
      handlePointerDown,
      selectItem,
      selectScale,
    } = useImageOutpaint(imageW, imageH, imageAspect);
    const handleConfirm = reactExports.useCallback(() => {
      if (appliedRef.current || !meta2) return;
      appliedRef.current = true;
      setConfirming(true);
      const params = rectToPixelParams(
        outpaintRect,
        imageOffset,
        meta2.originalWidth,
        meta2.originalHeight,
      );
      if (onNodeAction && outpaintingNodeId) {
        try {
          onNodeAction({
            nodeId: outpaintingNodeId,
            nodeType: "image",
            action: "outpaint",
            phase: "apply",
            interaction: "opens_mode",
            durationMs: Date.now() - enterTimeRef.current,
            toolSpecific: {
              resolution,
            },
          });
        } catch {}
      }
      void meta2.onConfirm({
        ...params,
        resolution,
      });
      cancelOutpaint();
    }, [
      meta2,
      outpaintRect,
      imageOffset,
      resolution,
      cancelOutpaint,
      onNodeAction,
      outpaintingNodeId,
    ]);
    const trackedCancelOutpaint = reactExports.useCallback(() => {
      if (onNodeAction && outpaintingNodeId && !appliedRef.current) {
        try {
          onNodeAction({
            nodeId: outpaintingNodeId,
            nodeType: "image",
            action: "outpaint",
            phase: "abandon",
            interaction: "opens_mode",
            durationMs: Date.now() - enterTimeRef.current,
            hadProgress:
              preset2 !== "general" ||
              resolution !== "2K" ||
              selectedItemId !== "general:original" ||
              scale2 !== 1 ||
              outpaintRect.x !== DEFAULT_OUTPAINT.x ||
              outpaintRect.y !== DEFAULT_OUTPAINT.y ||
              outpaintRect.width !== DEFAULT_OUTPAINT.width ||
              outpaintRect.height !== DEFAULT_OUTPAINT.height ||
              imageOffset.x !== DEFAULT_IMAGE_OFFSET.x ||
              imageOffset.y !== DEFAULT_IMAGE_OFFSET.y,
          });
        } catch {}
      }
      cancelOutpaint();
    }, [
      onNodeAction,
      outpaintingNodeId,
      preset2,
      resolution,
      selectedItemId,
      scale2,
      outpaintRect,
      imageOffset,
      cancelOutpaint,
    ]);
    reactExports.useEffect(() => {
      const handleKey = (e2) => {
        if (e2.key === "Escape") {
          e2.stopPropagation();
          trackedCancelOutpaint();
        }
      };
      document.addEventListener("keydown", handleKey, true);
      return () => document.removeEventListener("keydown", handleKey, true);
    }, [trackedCancelOutpaint]);
    const handlePresetChange = reactExports.useCallback(
      (next2) => {
        setPreset(next2);
        const items = OUTPAINT_PRESET_ITEMS[next2];
        const first2 = items[0];
        if (first2) selectItem(first2);
      },
      [selectItem],
    );
    const disabledScales = reactExports.useMemo(() => {
      if (!meta2) return new Set();
      const baseRect = selectedItem
        ? outpaintRectForAspectRatio(selectedItem.ratio, imageAspect)
        : outpaintRect;
      const baseLongestPx = Math.max(
        baseRect.width * meta2.originalWidth,
        baseRect.height * meta2.originalHeight,
      );
      const out = new Set();
      for (const s2 of OUTPAINT_SCALE_OPTIONS) {
        if (!isOutpaintScaleAllowed(baseLongestPx, s2)) out.add(s2);
      }
      return out;
    }, [meta2, selectedItem, imageAspect, outpaintRect]);
    reactExports.useEffect(() => {
      if (!disabledScales.has(scale2)) return;
      let fallback = 1;
      for (const s2 of OUTPAINT_SCALE_OPTIONS) {
        if (!disabledScales.has(s2)) fallback = s2;
      }
      selectScale(fallback);
    }, [disabledScales, scale2, selectScale]);
    const rectRef = reactExports.useRef(null);
    reactExports.useEffect(() => {
      const node2 = rectRef.current;
      if (!node2 || !flowDomNode) return;
      const onWheel = (e2) => {
        e2.preventDefault();
        e2.stopPropagation();
        const viewport = reactFlow.getViewport();
        if (e2.ctrlKey || e2.metaKey) {
          const containerRect = flowDomNode.getBoundingClientRect();
          const px2 = e2.clientX - containerRect.left;
          const py = e2.clientY - containerRect.top;
          const zoomFactor = 2 ** (-e2.deltaY / 100);
          const newZoom = Math.max(
            CANVAS_MIN_ZOOM,
            Math.min(CANVAS_MAX_ZOOM, viewport.zoom * zoomFactor),
          );
          if (newZoom === viewport.zoom) return;
          const flowX = (px2 - viewport.x) / viewport.zoom;
          const flowY = (py - viewport.y) / viewport.zoom;
          reactFlow.setViewport({
            x: px2 - flowX * newZoom,
            y: py - flowY * newZoom,
            zoom: newZoom,
          });
        } else {
          reactFlow.setViewport({
            x: viewport.x - e2.deltaX,
            y: viewport.y - e2.deltaY,
            zoom: viewport.zoom,
          });
        }
      };
      node2.addEventListener("wheel", onWheel, {
        passive: false,
      });
      return () => node2.removeEventListener("wheel", onWheel);
    }, [flowDomNode, reactFlow]);
    const panStateRef = reactExports.useRef(null);
    const handlePanPointerDown = reactExports.useCallback(
      (e2) => {
        if (e2.button !== 1 && e2.button !== 2) return;
        e2.preventDefault();
        e2.stopPropagation();
        e2.currentTarget.setPointerCapture(e2.pointerId);
        panStateRef.current = {
          startX: e2.clientX,
          startY: e2.clientY,
          initial: reactFlow.getViewport(),
        };
      },
      [reactFlow],
    );
    const handlePanPointerMove = reactExports.useCallback(
      (e2) => {
        const state2 = panStateRef.current;
        if (!state2) return;
        e2.preventDefault();
        reactFlow.setViewport({
          x: state2.initial.x + (e2.clientX - state2.startX),
          y: state2.initial.y + (e2.clientY - state2.startY),
          zoom: state2.initial.zoom,
        });
      },
      [reactFlow],
    );
    const handlePanPointerUp = reactExports.useCallback((e2) => {
      if (!panStateRef.current) return;
      if (e2.currentTarget.hasPointerCapture(e2.pointerId)) {
        e2.currentTarget.releasePointerCapture(e2.pointerId);
      }
      panStateRef.current = null;
    }, []);
    const handleContextMenu = reactExports.useCallback((e2) => {
      e2.preventDefault();
    }, []);
    if (!meta2 || !imagePos) return null;
    const px = {
      x: imagePos.x + outpaintRect.x * imagePos.w,
      y: imagePos.y + outpaintRect.y * imagePos.h,
      w: outpaintRect.width * imagePos.w,
      h: outpaintRect.height * imagePos.h,
    };
    const targetPxW = Math.round(outpaintRect.width * meta2.originalWidth);
    const targetPxH = Math.round(outpaintRect.height * meta2.originalHeight);
    const containerW = flowDomNode?.clientWidth ?? window.innerWidth;
    const containerH = flowDomNode?.clientHeight ?? window.innerHeight;
    const panelOnRight = px.x + px.w + PANEL_GAP + PANEL_WIDTH <= containerW;
    const panelX = panelOnRight
      ? px.x + px.w + PANEL_GAP
      : px.x - PANEL_GAP - PANEL_WIDTH;
    const panelY = Math.max(
      8,
      Math.min(px.y, containerH - 8 - PANEL_MIN_HEIGHT),
    );
    return (
      <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
        <div
          ref={rectRef}
          className="absolute pointer-events-auto"
          style={{
            transform: `translate3d(${px.x}px, ${px.y}px, 0)`,
            width: px.w,
            height: px.h,
            top: 0,
            left: 0,
            willChange: "transform",
          }}
          onPointerDown={handlePanPointerDown}
          onPointerMove={handlePanPointerMove}
          onPointerUp={handlePanPointerUp}
          onPointerCancel={handlePanPointerUp}
          onContextMenu={handleContextMenu}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              border: "1px solid var(--canvas-node-border-selected, #141414)",
              opacity: 0.5,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: isDragging ? 1 : 0,
            }}
          >
            <div
              className="absolute left-0 right-0 top-1/3 h-px"
              style={{
                background: "var(--canvas-node-border-selected, #141414)",
                opacity: 0.3,
              }}
            />
            <div
              className="absolute left-0 right-0 top-2/3 h-px"
              style={{
                background: "var(--canvas-node-border-selected, #141414)",
                opacity: 0.3,
              }}
            />
            <div
              className="absolute bottom-0 left-1/3 top-0 w-px"
              style={{
                background: "var(--canvas-node-border-selected, #141414)",
                opacity: 0.3,
              }}
            />
            <div
              className="absolute bottom-0 left-2/3 top-0 w-px"
              style={{
                background: "var(--canvas-node-border-selected, #141414)",
                opacity: 0.3,
              }}
            />
          </div>
          <CornerHandle position="tl" onPointerDown={handlePointerDown} />
          <CornerHandle position="tr" onPointerDown={handlePointerDown} />
          <CornerHandle position="bl" onPointerDown={handlePointerDown} />
          <CornerHandle position="br" onPointerDown={handlePointerDown} />
          <EdgeHandle position="t" onPointerDown={handlePointerDown} />
          <EdgeHandle position="b" onPointerDown={handlePointerDown} />
          <EdgeHandle position="l" onPointerDown={handlePointerDown} />
          <EdgeHandle position="r" onPointerDown={handlePointerDown} />
          <div
            className="absolute inset-0 cursor-move"
            onPointerDown={(e2) => handlePointerDown(e2, null)}
          />
          <div
            className="absolute left-0 right-0 flex items-center pointer-events-none"
            style={{
              color: "var(--fg-muted, #525252)",
              top: -28 * vpZoom,
              height: 24 * vpZoom,
              gap: 4 * vpZoom,
              fontSize: 13 * vpZoom,
            }}
          >
            <div
              className="flex min-w-0 flex-1 items-center"
              style={{
                gap: 4 * vpZoom,
              }}
            >
              <ImageIcon$1 size={14 * vpZoom} />
              {meta2.name && <span className="truncate">{meta2.name}</span>}
            </div>
            <span
              className="shrink-0 whitespace-nowrap tabular-nums"
              style={{
                fontSize: 11 * vpZoom,
                opacity: 0.8,
              }}
            >
              {targetPxW}
              {" × "}
              {targetPxH}
            </span>
          </div>
        </div>
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            transform: `translate3d(${panelX}px, ${panelY}px, 0)`,
            top: 0,
            left: 0,
            willChange: "transform",
          }}
        >
          <CanvasOutpaintPanel
            preset={preset2}
            onPresetChange={handlePresetChange}
            selectedItemId={selectedItemId}
            onSelectItem={selectItem}
            scale={scale2}
            onScaleChange={selectScale}
            disabledScales={disabledScales}
            resolution={resolution}
            onResolutionChange={setResolution}
            onCancel={trackedCancelOutpaint}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        </div>
      </div>
    );
  },
);
