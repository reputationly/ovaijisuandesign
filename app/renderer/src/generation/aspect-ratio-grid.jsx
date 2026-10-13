// aspect-ratio-grid.jsx
import { CompositedSvg, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AspectRatioIcon, optClass } from "./resolution-tabs.jsx";

function MaximizeIcon() {
  return (
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4" />
    </CompositedSvg>
  );
}

const isAutoOption = (opt) => opt.toLowerCase() === "auto";

export function AspectRatioGrid({
  options,
  value,
  onChange,
  disabled,
  disabledOptions,
}) {
  const { t: translate } = useTranslation();
  const autoOption = options.find(isAutoOption);
  const ratioOptions = options.filter((ratioOption) => !isAutoOption(ratioOption));
  const handlePick = (opt, optDisabled) => (clickEvent) => {
    clickEvent.stopPropagation();
    if (optDisabled || disabled) return;
    onChange?.(opt);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {autoOption && (
        <button
          type="button"
          onClick={handlePick(
            autoOption,
            disabled || (disabledOptions?.has(autoOption) ?? false),
          )}
          disabled={disabled || (disabledOptions?.has(autoOption) ?? false)}
          className={`${optClass(value === autoOption, disabled || (disabledOptions?.has(autoOption) ?? false))} flex items-center justify-center gap-2 px-3.5 py-2.5`}
          data-action-ui-id="popover.aspect-ratio-option"
          data-aspect-ratio={autoOption}
        >
          <MaximizeIcon />
          <span className="text-[13px]">
            {translate("canvas.param.option.auto", {
              defaultValue: "Auto",
            })}
          </span>
        </button>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {ratioOptions.map((opt) => {
          const optDisabled = disabled || (disabledOptions?.has(opt) ?? false);
          const selected = opt === value;
          const label =
            opt.toLowerCase() === "adaptive"
              ? translate("canvas.param.option.auto", {
                  defaultValue: "Auto",
                })
              : opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={handlePick(opt, optDisabled)}
              disabled={optDisabled}
              className={`${optClass(selected, optDisabled)} flex flex-col items-center justify-center gap-1 py-2.5 px-1`}
              data-action-ui-id="popover.aspect-ratio-option"
              data-aspect-ratio={opt}
            >
              <AspectRatioIcon ratio={opt} />
              <span className="text-[11px] leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
