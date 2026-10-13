// param-quality-slider.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ParamSectionLabel } from "../generation/resolution-tabs.jsx";
import { Slider } from "../generation/slider.jsx";
export function ParamQualitySlider({
  label,
  options,
  value,
  onChange,
  disabled,
  disabledOptions,
  getOptionLabel,
}) {
  const { t: t2 } = useTranslation();
  const [preview, setPreview] = reactExports.useState(null);
  const previewRef = reactExports.useRef(null);
  const requestedRef = reactExports.useRef(null);
  const canceledRef = reactExports.useRef(false);
  const selectedIndex = Math.max(0, options.indexOf(value));
  const inactive =
    disabled || options.every((option) => disabledOptions?.has(option));
  const optionLabel = (option) =>
    getOptionLabel?.(option) ??
    t2(`canvas.param.option.${option}`, {
      defaultValue: option,
    });
  reactExports.useEffect(() => {
    if (previewRef.current !== null) canceledRef.current = true;
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  }, [value, options, disabled, disabledOptions]);
  const handlePreview = (next) => {
    if (canceledRef.current) return;
    const index = Math.round(typeof next === "number" ? next : next[0]);
    if (index === requestedRef.current) return;
    const current = previewRef.current ?? selectedIndex;
    const direction = index >= (requestedRef.current ?? current) ? 1 : -1;
    requestedRef.current = index;
    let available = index;
    while (
      available >= 0 &&
      available < options.length &&
      disabledOptions?.has(options[available])
    ) {
      available += direction;
    }
    if (available < 0 || available >= options.length) {
      available = index;
      while (
        available >= 0 &&
        available < options.length &&
        disabledOptions?.has(options[available])
      ) {
        available -= direction;
      }
    }
    if (available < 0 || available >= options.length) available = current;
    previewRef.current = available;
    setPreview(available);
  };
  const handleCommit = (next) => {
    const index =
      previewRef.current ??
      Math.round(typeof next === "number" ? next : next[0]);
    const option = options[index];
    if (
      !canceledRef.current &&
      !inactive &&
      option !== void 0 &&
      !disabledOptions?.has(option)
    ) {
      onChange?.(option);
    }
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  };
  const handleCancel = () => {
    canceledRef.current = true;
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  };
  return (
    <div data-action-ui-id="canvas.params.quality-control">
      <div className="hilo-slider-field__header flex items-baseline justify-between gap-3">
        <ParamSectionLabel>{label}</ParamSectionLabel>
        <output className="text-[13px] text-[var(--canvas-controls-text)]">
          {optionLabel(preview === null ? value : (options[preview] ?? value))}
        </output>
      </div>
      <Slider
        variant="filled"
        size="compact"
        value={preview ?? selectedIndex}
        min={0}
        max={Math.max(1, options.length - 1)}
        step={1}
        largeStep={1}
        disabled={inactive || options.length < 2}
        aria-label={label}
        onValueChange={handlePreview}
        onValueCommitted={handleCommit}
        onPointerCancel={handleCancel}
        onPointerDownCapture={() => {
          canceledRef.current = false;
        }}
        onKeyDownCapture={() => {
          canceledRef.current = false;
        }}
        onPointerDown={(event) => event.stopPropagation()}
        thumbProps={{
          "data-action-ui-id": "canvas.params.quality-slider",
          getAriaValueText: (_formatted, index) =>
            optionLabel(options[index] ?? value),
        }}
      />
      <div className="hilo-slider-field__marks flex items-start justify-between gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled || disabledOptions?.has(option)}
            aria-pressed={option === value}
            data-action-ui-id={`canvas.params.quality-option-${option}`}
            onClick={(event) => {
              event.stopPropagation();
              handleCancel();
              onChange?.(option);
            }}
            className="min-w-0 cursor-pointer rounded-md px-1 py-1 text-[11px] text-muted-foreground hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground aria-pressed:text-foreground disabled:cursor-default disabled:opacity-40"
          >
            {optionLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
