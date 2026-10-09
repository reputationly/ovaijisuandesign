// expand-arrow-icon.jsx
import { CompositedSvg, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ParamSectionLabel } from "./resolution-tabs.jsx";
const SECONDS_OPTION_PATTERN = /^\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?$/;
export function formatSecondsOption(value) {
  return SECONDS_OPTION_PATTERN.test(value.trim()) ? `${value}s` : value;
}
export function ParamTextarea({
  label,
  value,
  onChange,
  disabled: disabled2,
  placeholder,
  rows = 3,
}) {
  return (
    <div>
      <ParamSectionLabel>{label}</ParamSectionLabel>
      <textarea
        rows={rows}
        value={value}
        onChange={(e2) => {
          e2.stopPropagation();
          onChange?.(e2.target.value);
        }}
        onClick={(e2) => e2.stopPropagation()}
        disabled={disabled2}
        placeholder={placeholder}
        className="w-full bg-[var(--canvas-controls-hover)] border border-[var(--canvas-controls-border)] px-2.5 py-1.5 text-[13px] text-[var(--canvas-controls-text)] placeholder:text-[var(--canvas-controls-text-muted)] outline-none resize-none transition-[border-color] duration-150 focus:border-[var(--canvas-node-border-selected)]"
      />
    </div>
  );
}
function ExpandArrowIcon({ expanded }) {
  return expanded ? (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3v4h4M3 9h4v4" />
      <path d="M9 7l5-5M2 14l5-5" />
    </CompositedSvg>
  ) : (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2h4v4M6 14H2v-4" />
      <path d="M14 2L9 7M2 14l5-5" />
    </CompositedSvg>
  );
}
export function ExpandToggleButton({ expanded, onToggle }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      onClick={(e2) => {
        e2.stopPropagation();
        onToggle();
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-foreground/40 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
      title={
        expanded ? t2("canvas.popover.collapse") : t2("canvas.popover.expand")
      }
    >
      <ExpandArrowIcon expanded={expanded} />
    </button>
  );
}
export function CloseButton({
  onClick,
  disabled: disabled2,
  title,
  variant = "cancel",
}) {
  if (variant === "inline") {
    return (
      <button
        type="button"
        className="text-[12px] text-[var(--canvas-controls-text-muted)] hover:text-[var(--canvas-controls-text)] leading-none"
        onClick={onClick}
        disabled={disabled2}
        title={title}
      >
        ✕
      </button>
    );
  }
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40"
      onClick={onClick}
      disabled={disabled2}
      title={title}
    >
      ✕
    </button>
  );
}
export const SPINNER = (
  <div className="w-3 h-3 border-[1.5px] border-[var(--canvas-controls-text-muted)] border-t-[var(--canvas-controls-text)] rounded-full animate-spin" />
);
export function TokenIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.52105 2L7.25885 6.2093L4.80361 2.71115L2.71115 4.80361L6.2093 7.25885L2 6.52111V9.47895L6.2093 8.74115L2.71115 11.1964L4.80361 13.2889L7.25885 9.7907L6.52105 14H9.47889L8.74108 9.7907L11.1964 13.2889L13.2889 11.1964L9.7907 8.74115L14 9.47895V6.52111L9.7907 7.25885L13.2889 4.80361L11.1964 2.71115L8.74108 6.2093L9.47889 2H6.52105Z"
      />
    </CompositedSvg>
  );
}
export const ACTION_BTN_BASE =
  "flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--canvas-controls-border)] px-3.5 text-[13px] font-medium transition-colors duration-150";
const COST_BADGE_CLASS =
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] tracking-tight text-[var(--canvas-controls-text,#fff)]/70";
export function CompactCreditCost({ creditCost }) {
  return (
    <span className={COST_BADGE_CLASS}>
      <TokenIcon />
      <span className="pointer-events-none tabular-nums">{creditCost}</span>
    </span>
  );
}
export function GeneratingButton({ label }) {
  return (
    <button
      type="button"
      className={`${ACTION_BTN_BASE} bg-foreground text-background border-transparent cursor-not-allowed pointer-events-none`}
      data-action-ui-id="popover.generating"
      disabled={true}
      tabIndex={-1}
    >
      {label}
    </button>
  );
}
export function svgBase({ size: size2 = 16, ...rest }) {
  return {
    width: size2,
    height: size2,
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    role: "presentation",
    "aria-hidden": true,
    ...rest,
  };
}
