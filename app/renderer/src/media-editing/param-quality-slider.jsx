// param-quality-slider.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ParamSectionLabel } from "../generation/resolution-tabs.jsx";
import { Slider$1 } from "../generation/slider.jsx";

export function ParamQualitySlider({
  label,
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
  getOptionLabel,
}) {
  const { t: t2 } = useTranslation();
  const [preview, setPreview] = reactExports.useState(null);
  const previewRef = reactExports.useRef(null);
  const requestedRef = reactExports.useRef(null);
  const canceledRef = reactExports.useRef(false);
  const selected2 = Math.max(0, options.indexOf(value));
  const inactive =
    disabled2 || options.every((option2) => disabledOptions?.has(option2));
  const optionLabel = (option2) =>
    getOptionLabel?.(option2) ??
    t2(`canvas.param.option.${option2}`, {
      defaultValue: option2,
    });
  reactExports.useEffect(() => {
    if (previewRef.current !== null) canceledRef.current = true;
    previewRef.current = null;
    requestedRef.current = null;
    setPreview(null);
  }, [value, options, disabled2, disabledOptions]);
  const handlePreview = (next2) => {
    if (canceledRef.current) return;
    const index2 = Math.round(typeof next2 === "number" ? next2 : next2[0]);
    if (index2 === requestedRef.current) return;
    const current2 = previewRef.current ?? selected2;
    const direction = index2 >= (requestedRef.current ?? current2) ? 1 : -1;
    requestedRef.current = index2;
    let available = index2;
    while (
      available >= 0 &&
      available < options.length &&
      disabledOptions?.has(options[available])
    ) {
      available += direction;
    }
    if (available < 0 || available >= options.length) {
      available = index2;
      while (
        available >= 0 &&
        available < options.length &&
        disabledOptions?.has(options[available])
      ) {
        available -= direction;
      }
    }
    if (available < 0 || available >= options.length) available = current2;
    previewRef.current = available;
    setPreview(available);
  };
  const handleCommit = (next2) => {
    const index2 =
      previewRef.current ??
      Math.round(typeof next2 === "number" ? next2 : next2[0]);
    const option2 = options[index2];
    if (
      !canceledRef.current &&
      !inactive &&
      option2 !== void 0 &&
      !disabledOptions?.has(option2)
    ) {
      onChange?.(option2);
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
      <Slider$1
        variant="filled"
        size="compact"
        value={preview ?? selected2}
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
          getAriaValueText: (_formatted, index2) =>
            optionLabel(options[index2] ?? value),
        }}
      />
      <div className="hilo-slider-field__marks flex items-start justify-between gap-1">
        {options.map((option2) => (
          <button
            key={option2}
            type="button"
            disabled={disabled2 || disabledOptions?.has(option2)}
            aria-pressed={option2 === value}
            data-action-ui-id={`canvas.params.quality-option-${option2}`}
            onClick={(event) => {
              event.stopPropagation();
              handleCancel();
              onChange?.(option2);
            }}
            className="min-w-0 cursor-pointer rounded-md px-1 py-1 text-[11px] text-muted-foreground hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground aria-pressed:text-foreground disabled:cursor-default disabled:opacity-40"
          >
            {optionLabel(option2)}
          </button>
        ))}
      </div>
    </div>
  );
}
