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
  disabled: disabled2,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const anchorRef = reactExports.useRef(null);
  const popupRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleMouseDown2 = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (popupRef.current?.contains(t22)) return;
      if (anchorRef.current?.contains(t22)) return;
      setOpen(false);
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown2, true);
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown2, true);
      document.removeEventListener("keydown", handleKeyDown2);
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
    const next2 = [];
    if (explicitOptions) {
      for (const option2 of explicitOptions) {
        if (
          option2 >= minCount &&
          option2 <= maxCount &&
          !next2.includes(option2)
        ) {
          next2.push(option2);
        }
      }
      return next2;
    }
    for (let i2 = minCount; i2 <= maxCount; i2++) next2.push(i2);
    return next2;
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
        onClick={(e2) => {
          e2.stopPropagation();
          setOpen((v2) => !v2);
        }}
        disabled={disabled2 || options.length <= 1}
        className="h-8 min-w-10 px-2 text-[13px] font-normal tracking-[-0.52px] leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 flex items-center justify-center gap-1 canvas-prompt-control"
        title={t2("canvas.imageNode.generateVariations", {
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
            onClick={(e2) => e2.stopPropagation()}
            onKeyDown={(e2) => e2.stopPropagation()}
            role="listbox"
            tabIndex={-1}
          >
            <div className="px-2 pt-1.5 pb-1 text-center text-xs font-normal text-muted-foreground">
              {t2("canvas.imageNode.generationCount", {
                defaultValue: "Generation Count",
              })}
            </div>
            {options.map((opt) => {
              const active2 = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  data-action-ui-id={`canvas.image-node.count-chip.option-${opt}`}
                  onClick={(e2) => {
                    e2.stopPropagation();
                    onChange(opt);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active2}
                  className={`h-7 px-2 text-center text-sm rounded-sm transition-colors duration-150 ${active2 ? "bg-[var(--canvas-param-selected-bg)] text-foreground" : "text-foreground hover:bg-[var(--canvas-controls-hover)]"}`}
                >
                  {"× "}
                  {opt}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
