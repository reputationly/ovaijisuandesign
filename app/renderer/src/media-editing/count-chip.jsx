// count-chip.jsx
import { reactDomExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { usePortalAnchorPlacement } from "../generation/use-portal-anchor-placement.jsx";

const COUNT_POPUP_WIDTH = 120;

export function CountChip({
  value,
  maxCount,
  options: explicitOptions,
  minCount = 1,
  onChange,
  disabled,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const anchorRef = reactExports.useRef(null);
  const popupRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleMouseDown = (mouseDownEvent) => {
      const eventTarget = mouseDownEvent.target;
      if (!eventTarget) return;
      if (popupRef.current?.contains(eventTarget)) return;
      if (anchorRef.current?.contains(eventTarget)) return;
      setOpen(false);
    };
    const handleKeyDown = (keyDownEvent) => {
      if (keyDownEvent.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);
  const placement = usePortalAnchorPlacement(anchorRef, {
    open,
    minHeight: 80,
    maxHeight: 200,
    align: "center",
    panelWidth: COUNT_POPUP_WIDTH,
  });
  const options = reactExports.useMemo(() => {
    const next = [];
    if (explicitOptions) {
      for (const option of explicitOptions) {
        if (
          option >= minCount &&
          option <= maxCount &&
          !next.includes(option)
        ) {
          next.push(option);
        }
      }
      return next;
    }
    for (let count = minCount; count <= maxCount; count++) next.push(count);
    return next;
  }, [explicitOptions, maxCount, minCount]);
  reactExports.useEffect(() => {
    const fallback = options.at(-1);
    if (fallback !== void 0 && !options.includes(value)) onChange(fallback);
  }, [value, options, onChange]);
  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        data-action-ui-id="canvas.image-node.count-chip"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          setOpen((isOpen) => !isOpen);
        }}
        disabled={disabled || options.length <= 1}
        className="h-8 min-w-10 px-2 text-[13px] font-normal tracking-[-0.52px] leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 flex items-center justify-center gap-1 canvas-prompt-control"
        title={t("canvas.imageNode.generateVariations", {
          count: value,
          defaultValue: `Generate ${value} variation${value > 1 ? "s" : ""}`,
        })}
      >
        <span aria-hidden="true">×</span>
        <span>{value}</span>
      </button>
      {open &&
        options.length > 1 &&
        placement &&
        reactDomExports.createPortal(
          <div
            ref={popupRef}
            data-side={placement.side}
            className="canvas-portal-popover-in nowheel fixed z-[10001] flex flex-col rounded-[16px] border shadow-lg p-1"
            style={{
              background: "var(--canvas-controls-bg)",
              borderColor: "var(--canvas-controls-border)",
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
              width: COUNT_POPUP_WIDTH,
            }}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            onKeyDown={(keyDownEvent) => keyDownEvent.stopPropagation()}
            role="listbox"
            tabIndex={-1}
          >
            <div className="px-2 pt-1.5 pb-1 text-center text-xs font-normal text-muted-foreground">
              {t("canvas.imageNode.generationCount", {
                defaultValue: "Generation Count",
              })}
            </div>
            {options.map((option) => {
              const active = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  data-action-ui-id={`canvas.image-node.count-chip.option-${option}`}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onChange(option);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active}
                  className={`h-7 px-2 text-center text-sm rounded-sm transition-colors duration-150 ${active ? "bg-[var(--canvas-param-selected-bg)] text-foreground" : "text-foreground hover:bg-[var(--canvas-controls-hover)]"}`}
                >
                  {"× "}
                  {option}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
