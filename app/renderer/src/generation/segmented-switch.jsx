// segmented-switch.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "../infra/dialog-content.jsx";

const GRID_CLASS_BY_COUNT = {
  2: "grid-cols-2",
  3: "grid-cols-3",
};

export function SegmentedSwitch$1({
  value,
  options,
  onValueChange,
  ariaLabel,
  dataActionUiId,
  thumbDataSlot = "segmented-switch-thumb",
  variant = "icon",
  size: size2 = "md",
  gap = "none",
  stretch = false,
  className,
  itemClassName,
  thumbClassName,
  iconSize = 16,
  iconStrokeWidth = 1.5,
  renderTooltip,
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option2) => option2.value === value),
  );
  const optionCount = Math.max(1, options.length);
  const itemGapRem = gap === "xs" ? 0.125 : 0;
  const totalGapRem = (optionCount - 1) * itemGapRem;
  const selectedGapOffsetRem = selectedIndex * itemGapRem;
  const gridStyle =
    options.length in GRID_CLASS_BY_COUNT
      ? void 0
      : {
          gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))`,
        };
  const thumbStyle = {
    width:
      gap === "xs"
        ? `calc((100% - 4px - ${totalGapRem}rem) / ${optionCount})`
        : `calc((100% - 4px) / ${optionCount})`,
    transform:
      selectedGapOffsetRem > 0
        ? `translateX(calc(${selectedIndex * 100}% + ${selectedGapOffsetRem}rem))`
        : `translateX(${selectedIndex * 100}%)`,
  };
  const content2 = (
    <fieldset
      aria-label={ariaLabel}
      data-action-ui-id={dataActionUiId}
      className={cn$5(
        "relative m-0 grid min-w-0 rounded-[8px] border-0 bg-foreground/[0.025] p-0.5 dark:bg-foreground/[0.05]",
        gap === "xs" && "gap-0.5",
        stretch ? "w-full" : "w-max",
        GRID_CLASS_BY_COUNT[options.length],
        className,
      )}
      style={gridStyle}
    >
      <span
        aria-hidden={true}
        data-slot={thumbDataSlot}
        className={cn$5(
          "pointer-events-none absolute top-0.5 left-0.5 rounded-[6px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out dark:bg-white/[0.08] dark:shadow-none",
          size2 === "sm" ? "h-6" : "h-7",
          thumbClassName,
        )}
        style={thumbStyle}
      />
      {options.map((option2) => {
        const selected2 = option2.value === value;
        const Icon2 = option2.icon;
        const labelText =
          typeof option2.label === "string" ? option2.label : void 0;
        const button = (
          <button
            key={option2.value}
            type="button"
            aria-pressed={selected2}
            aria-label={option2.ariaLabel ?? labelText}
            disabled={option2.disabled}
            data-action-ui-id={option2.dataActionUiId}
            className={cn$5(
              "relative z-10 inline-flex items-center justify-center rounded-[6px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              variant === "icon"
                ? size2 === "sm"
                  ? "size-6"
                  : "size-7"
                : cn$5(
                    "min-w-0 gap-1 whitespace-nowrap",
                    size2 === "sm"
                      ? "h-6 px-2 text-[11px]"
                      : "h-7 px-2.5 text-[13px]",
                  ),
              selected2
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground font-normal",
              itemClassName,
            )}
            onClick={() => {
              if (!option2.disabled && option2.value !== value) {
                onValueChange(option2.value);
              }
            }}
          >
            {Icon2 && (
              <Icon2
                className="shrink-0"
                size={iconSize}
                strokeWidth={iconStrokeWidth}
              />
            )}
            {(variant === "label" || !Icon2) && (
              <span className="min-w-0 truncate">{option2.label}</span>
            )}
          </button>
        );
        if (!option2.tooltip || !renderTooltip) return button;
        return renderTooltip(button, option2.tooltip);
      })}
    </fieldset>
  );
  return content2;
}
