// param-tabs.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatSecondsOption } from "./expand-arrow-icon.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
import {
  PARAM_OPTION_SELECTED_CLASS,
  ParamSectionLabel,
} from "./resolution-tabs.jsx";
function shouldRenderParamTabs(optionCount, variant) {
  return variant !== "track" || optionCount > 1;
}
export function ParamTabs({
  label,
  options,
  value,
  onChange,
  disabled,
  disabledOptions,
  getDisabledOptionTooltip,
  getOptionLabel,
  grouped = false,
  optionUnit,
  variant = "tags",
  trackColumns,
  allowDeselect,
}) {
  const { t: translate } = useTranslation();
  if (!shouldRenderParamTabs(options.length, variant)) return null;
  const selectedIndex = Math.max(0, options.indexOf(value));
  const trackColumnCount = Math.max(
    1,
    Math.min(trackColumns ?? options.length, options.length),
  );
  const selectedColumn = selectedIndex % trackColumnCount;
  const selectedRow = Math.floor(selectedIndex / trackColumnCount);
  const trackStyle = {
    gridTemplateColumns: `repeat(${trackColumnCount}, minmax(0, 1fr))`,
  };
  const thumbStyle = {
    width: `calc((100% - 4px) / ${trackColumnCount})`,
    transform: `translate(${selectedColumn * 100}%, ${selectedRow * 100}%)`,
  };
  return (
    <div>
      <ParamSectionLabel>{label}</ParamSectionLabel>
      <fieldset
        className={
          variant === "track"
            ? "relative m-0 grid w-full min-w-0 rounded-[8px] border-0 bg-foreground/[0.06] p-0.5"
            : grouped
              ? "m-0 grid grid-cols-8 gap-1.5 rounded-md border-0 bg-[color-mix(in_srgb,var(--canvas-controls-hover)_60%,transparent)] p-1"
              : "m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        }
        style={variant === "track" ? trackStyle : void 0}
        aria-label={label}
      >
        {variant === "track" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-0.5 h-7 rounded-[6px] bg-[var(--canvas-controls-bg)] transition-transform duration-200 ease-out"
            style={thumbStyle}
          />
        )}
        {options.map((option) => {
          const isSelected = option === value;
          const isOptDisabled =
            disabled || (disabledOptions?.has(option) ?? false);
          const secondsLabel = formatSecondsOption(option);
          const optionLabel = getOptionLabel
            ? getOptionLabel(option)
            : optionUnit === "seconds" && secondsLabel !== option
              ? translate("canvas.params.durationOption", {
                  duration: option,
                  defaultValue: secondsLabel,
                })
              : translate(`canvas.param.option.${option}`, {
                  defaultValue: option,
                });
          const button = (
            <button
              key={option}
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                if (isOptDisabled || disabled) return;
                if (isSelected && allowDeselect) {
                  onChange?.("");
                  return;
                }
                onChange?.(option);
              }}
              disabled={isOptDisabled}
              aria-pressed={isSelected}
              className={[
                variant === "track"
                  ? "relative z-10 h-7 w-full min-w-0 truncate rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 cursor-pointer disabled:cursor-default"
                  : grouped
                    ? "flex h-7 w-full items-center justify-center border rounded-sm px-3 py-0 text-center text-[13px] transition-colors duration-150 cursor-pointer disabled:cursor-default"
                    : "h-7 px-3 py-0 text-[13px] border rounded-sm transition-colors duration-150 cursor-pointer disabled:cursor-default",
                variant === "track"
                  ? isSelected
                    ? "font-normal text-foreground"
                    : "font-normal text-muted-foreground hover:enabled:text-foreground"
                  : grouped
                    ? isSelected
                      ? PARAM_OPTION_SELECTED_CLASS
                      : "border-transparent bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground"
                    : isSelected
                      ? PARAM_OPTION_SELECTED_CLASS
                      : "border-border bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground",
                isOptDisabled && !isSelected ? "opacity-40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {optionLabel}
            </button>
          );
          const disabledOptionTooltip =
            !disabled && disabledOptions?.has(option)
              ? getDisabledOptionTooltip?.(option)
              : void 0;
          return disabledOptionTooltip ? (
            <Tooltip key={option} content={disabledOptionTooltip}>
              <span
                className={
                  variant === "track"
                    ? "flex min-w-0"
                    : grouped
                      ? "flex w-full"
                      : "inline-flex"
                }
              >
                {button}
              </span>
            </Tooltip>
          ) : (
            button
          );
        })}
      </fieldset>
    </div>
  );
}
