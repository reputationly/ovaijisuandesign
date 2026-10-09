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
  disabled: disabled2,
  disabledOptions,
}) {
  const { t: t2 } = useTranslation();
  const autoOption = options.find(isAutoOption);
  const ratioOptions = options.filter((o2) => !isAutoOption(o2));
  const handlePick = (opt, optDisabled) => (e2) => {
    e2.stopPropagation();
    if (optDisabled || disabled2) return;
    onChange?.(opt);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {autoOption && (
        <button
          type="button"
          onClick={handlePick(
            autoOption,
            disabled2 || (disabledOptions?.has(autoOption) ?? false),
          )}
          disabled={disabled2 || (disabledOptions?.has(autoOption) ?? false)}
          className={`${optClass(value === autoOption, disabled2 || (disabledOptions?.has(autoOption) ?? false))} flex items-center justify-center gap-2 px-3.5 py-2.5`}
          data-action-ui-id="popover.aspect-ratio-option"
          data-aspect-ratio={autoOption}
        >
          <MaximizeIcon />
          <span className="text-[13px]">
            {t2("canvas.param.option.auto", {
              defaultValue: "Auto",
            })}
          </span>
        </button>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {ratioOptions.map((opt) => {
          const optDisabled = disabled2 || (disabledOptions?.has(opt) ?? false);
          const selected2 = opt === value;
          const label =
            opt.toLowerCase() === "adaptive"
              ? t2("canvas.param.option.auto", {
                  defaultValue: "Auto",
                })
              : opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={handlePick(opt, optDisabled)}
              disabled={optDisabled}
              className={`${optClass(selected2, optDisabled)} flex flex-col items-center justify-center gap-1 py-2.5 px-1`}
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
