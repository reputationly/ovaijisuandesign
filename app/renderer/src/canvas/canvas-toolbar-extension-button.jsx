// canvas-toolbar-extension-button.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { cn$5 } from "../infra/dialog-content.jsx";

export function ToolbarSeparator({ large = false, className }) {
  return (
    <div
      className={cn$5(
        `w-px shrink-0 bg-[var(--canvas-controls-border)] ${large ? "mx-[2px] h-5" : "mx-px h-4"}`,
        className,
      )}
    />
  );
}

export function ToolbarTooltipContent({ label, shortcut }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {shortcut && (
        <kbd className="font-sans text-[10px] leading-none text-background/70">
          {shortcut}
        </kbd>
      )}
    </span>
  );
}

export const CanvasToolbarExtensionButton = reactExports.forwardRef(
  function CanvasToolbarExtensionButton2(
    {
      children: children2,
      label,
      tooltipContent = label,
      tooltipSide = "top",
      onClick,
      dataActionUiId,
      disabled: disabled2 = false,
      kind = "action",
      active: active2,
      controlsId,
      hasPopup,
      className,
      ...triggerProps
    },
    ref,
  ) {
    const selected2 = kind !== "action" && active2;
    return (
      <Tooltip$1
        content={tooltipContent}
        side={tooltipSide}
        closeOnClick={true}
      >
        <button
          {...triggerProps}
          ref={ref}
          type="button"
          data-action-ui-id={dataActionUiId}
          data-canvas-control-kind={kind}
          aria-label={label}
          aria-pressed={kind === "toggle" ? active2 : void 0}
          aria-expanded={kind === "panel" ? active2 : void 0}
          aria-controls={kind === "panel" ? controlsId : void 0}
          aria-haspopup={kind === "panel" ? hasPopup : void 0}
          disabled={disabled2}
          onClick={onClick}
          className={`canvas-monochrome-control flex h-full min-w-8 items-center justify-center gap-1 rounded-full px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${disabled2 ? "cursor-default text-[var(--canvas-controls-text-muted)] opacity-30" : selected2 ? "cursor-pointer bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "cursor-pointer text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"} ${className ?? ""}`}
        >
          {children2}
        </button>
      </Tooltip$1>
    );
  },
);
