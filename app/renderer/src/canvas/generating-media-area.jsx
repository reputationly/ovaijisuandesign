// generating-media-area.jsx
import { CompositedSvg } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { MEDIA_NODE_RADIUS } from "../media-editing/package.jsx";
import { ImagePlaceholderIcon } from "./file-missing-icon.jsx";
import {
  PLACEHOLDER_ICON_CLASS,
  PLACEHOLDER_ICON_SIZE,
  RetryIcon$1,
} from "./fullscreen-icon.jsx";

export function BoldIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 2.5a.5.5 0 0 1 .5-.5h4a3 3 0 0 1 2.12 5.122A3.5 3.5 0 0 1 9.5 14H4.5a.5.5 0 0 1-.5-.5v-11ZM6 8.5v3.5h3.5a1.5 1.5 0 0 0 0-3H6ZM8.5 7a1 1 0 0 0 0-2H6v2h2.5Z" />
    </CompositedSvg>
  );
}

export function ItalicIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-1.573L7.073 13H9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h1.573L9.427 3H7.5a.5.5 0 0 1-.5-.5Z" />
    </CompositedSvg>
  );
}

export function BulletListIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3-1.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM6 8a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6Zm0 4.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM3 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </CompositedSvg>
  );
}

export function OrderedListIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.003 2.5a.5.5 0 0 1 .723-.447l.89.445a.5.5 0 1 1-.448.894l-.165-.082V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1h.5V2.5ZM6 2.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM6 8a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6Zm0 4.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM1.713 8.41a1.25 1.25 0 0 1 2.164-.404.5.5 0 1 1-.854.522.25.25 0 0 0-.433.081.25.25 0 0 0 .067.258l1.559 1.434A.5.5 0 0 1 3.877 11H1.5a.5.5 0 0 1 0-1h1.162l-.74-.681a1.25 1.25 0 0 1-.21-1.51l.001-.002Z" />
    </CompositedSvg>
  );
}

export function DropdownArrowIcon() {
  return (
    <CompositedSvg
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="currentColor"
      className="ml-0.5 opacity-60"
      aria-hidden="true"
      data-toolbar-icon="disclosure"
    >
      <path d="M4 5L0 0h8L4 5z" />
    </CompositedSvg>
  );
}

export function RefreshIcon() {
  return <RetryIcon$1 size={18} />;
}

export function VideoPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.53125 5.96094C7.86529 5.5432 7.00008 6.02151 7 6.80762V13.1992C7 13.9839 7.86223 14.4625 8.52832 14.0479L13.6416 10.8643C14.2689 10.4736 14.2706 9.56066 13.6445 9.16797L8.53125 5.96094Z" />
    </CompositedSvg>
  );
}

export function PromoteToAssetIcon({ size: size2 = 16 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m16 6 4 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4v16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}

export function TextPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM4 16.2646H12V14.4648H4V16.2646ZM4 12.6885H16V10.8887H4V12.6885ZM4 9.1123H16V7.31152H4V9.1123ZM4 5.53613H16V3.73535H4V5.53613Z" />
    </CompositedSvg>
  );
}

export function AudioPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1.3335 3.9999C1.33355 2.89537 2.22897 2 3.3335 2H12.6663C13.7709 2 14.6663 2.89543 14.6663 4V12C14.6663 13.1046 13.7709 14 12.6663 14H3.3331C2.2285 14 1.33305 13.1045 1.33311 11.9999L1.3335 3.9999ZM7.99967 8.114C7.59942 7.97249 7.16451 7.96201 6.75791 8.08409C6.3513 8.20616 5.99409 8.45446 5.73797 8.79303C5.48185 9.13161 5.34011 9.5429 5.33327 9.96738C5.32642 10.3919 5.45483 10.8075 5.6999 11.1542C5.94498 11.5008 6.294 11.7605 6.69646 11.8956C7.09892 12.0307 7.53394 12.0343 7.93855 11.9057C8.34316 11.7772 8.69637 11.5233 8.94706 11.1806C9.19776 10.838 9.33293 10.4245 9.33301 10V5.33267H11.333V4H7.99967V8.114Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}

const MEDIA_NODE_INNER_RADIUS = MEDIA_NODE_RADIUS - 2;

export function GeneratingMediaArea({
  width,
  height,
  radius = MEDIA_NODE_INNER_RADIUS,
  onClick,
  icon,
  label,
  progress,
  variant = "generating",
  className,
  style: style2,
}) {
  const interactive = !!onClick;
  const handleKeyDown2 = interactive
    ? (e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          onClick?.(e2);
        }
      }
    : void 0;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex are conditional
    <div
      className={`generating-wash flex items-center justify-center ${variant === "queued" ? "generating-wash--queued" : ""} ${className ?? ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown2}
      role={interactive ? "button" : void 0}
      tabIndex={interactive ? 0 : void 0}
      style={{
        width,
        height,
        borderRadius: radius,
        cursor: interactive ? "pointer" : void 0,
        "--gen-progress":
          variant === "queued"
            ? "100%"
            : progress != null
              ? `${progress}%`
              : void 0,
        ...style2,
      }}
      data-generation-state={variant}
    >
      <div
        className={`relative z-[2] flex w-full min-w-0 flex-col items-center justify-center ${variant === "queued" ? "gap-4" : "gap-6"}`}
      >
        {icon ?? <ImagePlaceholderIcon />}
        {label}
      </div>
    </div>
  );
}

export function shouldRenderMediaActionSurface({
  selected: selected2,
  showLightbox,
  showClipPanel,
  showFramePanel = false,
  showDialog = false,
}) {
  return (
    selected2 || showLightbox || showClipPanel || showFramePanel || showDialog
  );
}
