// param-field.jsx
import {
  getParamLabel,
  isComfyUiPromptParameter,
  MODEL_NAME_KEYS,
} from "./domestic-param-labels.jsx";
import { resolveModelNameForCurrentRegion } from "./replace-configured-model-names-for-current-region.js";
import {
  Check,
  ChevronDown,
  reactExports,
  SliderControl$1 as SliderControl,
  SliderIndicator,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  useTranslation,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { isHiddenVideoGenerationMode } from "../chat/use-tool-confirm-settlement.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { Textarea } from "../infra/badge-variants.jsx";
import { Switch } from "./select-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
function Slider({
  className,
  defaultValue: defaultValue2,
  value,
  min: min2 = 0,
  max: max2 = 100,
  ...props
}) {
  const _values = reactExports.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue2)
          ? defaultValue2
          : [min2, max2],
    [value, defaultValue2, min2, max2],
  );
  return (
    <SliderRoot
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue2}
      value={value}
      min={min2}
      max={max2}
      thumbAlignment="edge"
      {...props}
    >
      <SliderControl className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderTrack
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderIndicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderTrack>
        {Array.from(
          {
            length: _values.length,
          },
          (_2, index2) => (
            <SliderThumb
              key={index2}
              data-slot="slider-thumb"
              className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden active:ring-1 disabled:pointer-events-none disabled:opacity-50"
            />
          ),
        )}
      </SliderControl>
    </SliderRoot>
  );
}
function ParamEnumPopover({
  paramKey,
  paramLabel,
  description,
  values: values3,
  value,
  disabled: disabled2,
  displayMap,
  onChange,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const { t: t2 } = useTranslation();
  const displayValue = (raw2) => {
    const optionLabel = t2(`canvas.param.option.${raw2}`, {
      defaultValue: raw2,
    });
    return optionLabel !== raw2 ? optionLabel : (displayMap?.get(raw2) ?? raw2);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled2}
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
        className={cn(
          "inline-flex min-w-[7rem] max-w-[16rem] items-center justify-between gap-1 px-2 py-1 rounded-sm",
          "text-body-12 border border-border bg-background hover:bg-muted transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-default",
        )}
      >
        <span className="truncate text-foreground">
          {displayValue(value) || "—"}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-64 p-0 gap-0 rounded-sm"
      >
        <div className="border-b border-border px-3 py-2">
          <div className="text-body-12 font-medium text-muted-foreground">
            {paramLabel ?? paramKey}
          </div>
          {description && paramKey !== "model" && paramKey !== "model_name" && (
            <div className="text-caption-11 text-muted-foreground line-clamp-2 mt-0.5">
              {description}
            </div>
          )}
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {values3.map((opt) => {
            const active2 = value === opt;
            return (
              <li key={opt}>
                <button
                  type="button"
                  data-action-ui-id={`tool-confirm-param-${paramKey}-option-${opt}`}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-body-12 cursor-pointer transition-colors",
                    active2
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{displayValue(opt)}</span>
                  {active2 && (
                    <Check size={14} strokeWidth={1.5} className="shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
function isModelParamKey(paramKey) {
  const baseKey = paramKey.split("[")[0] ?? paramKey;
  return MODEL_NAME_KEYS.has(baseKey);
}
function filterModeHiddenValues(paramKey, values3) {
  if (paramKey !== "mode") return values3;
  return values3.filter((value) => !isHiddenVideoGenerationMode(value));
}
function displayEnumValue(paramKey, value, t2, displayMap) {
  const optionLabel = t2(`canvas.param.option.${value}`, {
    defaultValue: value,
  });
  if (optionLabel !== value) return optionLabel;
  return (
    displayMap?.get(value) ??
    (isModelParamKey(paramKey)
      ? resolveModelNameForCurrentRegion(value)
      : value)
  );
}
function InlineEnumOptions({
  paramKey,
  values: values3,
  value,
  disabled: disabled2 = false,
  displayMap,
  onChange,
  onSelect,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex max-h-56 flex-wrap gap-1 overflow-y-auto"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    >
      {values3.map((option2) => {
        const active2 = option2 === value;
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            data-action-ui-id={`tool-confirm-param-${paramKey}-option-${option2}`}
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm border px-2.5 py-1 text-left text-body-12 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              active2
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            onClick={() => {
              onChange(option2);
              onSelect?.();
            }}
          >
            <span className="truncate">
              {displayEnumValue(paramKey, option2, t2, displayMap)}
            </span>
            {active2 && <Icon icon={Check} size="sm" className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
export function ParamField({
  paramKey,
  value,
  originalValue,
  hint,
  multiline = false,
  disabled: disabled2 = false,
  displayMap,
  onChange,
  onEnumSelect,
}) {
  const { t: t2 } = useTranslation();
  if (Array.isArray(originalValue)) {
    const items = (() => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch {
        return [value];
      }
    })();
    const updateItem = (index2, v2) => {
      const next2 = items.map((item, i2) => (i2 === index2 ? v2 : item));
      onChange(JSON.stringify(next2));
    };
    const itemRows = items.map((item, index2) => ({
      item,
      index: index2,
      key: `${paramKey}:${String(originalValue[index2] ?? item)}:${index2}`,
    }));
    if (hint?.type === "enum") {
      return (
        <div
          className="flex flex-col gap-1"
          data-action-ui-id={`tool-confirm-param-${paramKey}`}
        >
          {itemRows.map(({ item, index: index2, key: key2 }) => (
            <ParamEnumPopover
              key={key2}
              paramKey={`${paramKey}[${index2}]`}
              paramLabel={getParamLabel(paramKey)}
              description={hint.description}
              values={filterModeHiddenValues(paramKey, hint.values)}
              value={item}
              disabled={disabled2}
              displayMap={displayMap}
              onChange={(v2) => updateItem(index2, v2)}
            />
          ))}
        </div>
      );
    }
    return (
      <div
        className="flex flex-col gap-1"
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      >
        {itemRows.map(({ item, index: index2, key: key2 }) => {
          const isLongItem =
            paramKey === "prompts" ||
            paramKey === "prompt" ||
            item.length >= 40;
          return isLongItem ? (
            <Textarea
              key={key2}
              rows={3}
              value={item}
              disabled={disabled2}
              onChange={(e2) => updateItem(index2, e2.target.value)}
              className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
              style={{
                fieldSizing: "fixed",
              }}
            />
          ) : (
            <Input3
              key={key2}
              value={item}
              disabled={disabled2}
              onChange={(e2) => updateItem(index2, e2.target.value)}
              className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
            />
          );
        })}
      </div>
    );
  }
  if (hint?.type === "enum") {
    return (
      <InlineEnumOptions
        paramKey={paramKey}
        values={filterModeHiddenValues(paramKey, hint.values)}
        value={value}
        disabled={disabled2}
        displayMap={displayMap}
        onChange={onChange}
        onSelect={onEnumSelect}
      />
    );
  }
  if (hint?.type === "range") {
    const numValue = Number(value) || 0;
    const step =
      Number.isInteger(hint.min) && Number.isInteger(hint.max) ? 1 : 0.1;
    return (
      <div
        className="flex items-center gap-2"
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      >
        <Slider
          min={hint.min}
          max={hint.max}
          step={step}
          value={[numValue]}
          disabled={disabled2}
          onValueChange={(v2) => {
            const arr = Array.isArray(v2) ? v2 : [v2];
            onChange(String(arr[0]));
          }}
          className="flex-1"
        />
        <span className="shrink-0 w-8 text-right text-xs tabular-nums text-foreground">
          {numValue}
        </span>
      </div>
    );
  }
  if (typeof originalValue === "boolean") {
    return (
      <div
        className="flex items-center gap-2"
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      >
        <Switch
          checked={value === "true"}
          disabled={disabled2}
          onCheckedChange={(v2) => onChange(String(v2))}
        />
        <span className="text-xs text-muted-foreground">
          {value === "true"
            ? t2("chat.toolConfirm.booleanOn")
            : t2("chat.toolConfirm.booleanOff")}
        </span>
      </div>
    );
  }
  if (typeof originalValue === "number") {
    return (
      <Input3
        type="number"
        value={value}
        disabled={disabled2}
        onChange={(e2) => onChange(e2.target.value)}
        className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      />
    );
  }
  const isLong =
    multiline ||
    isComfyUiPromptParameter(paramKey) ||
    String(value).length >= 40 ||
    String(originalValue ?? "").length >= 40;
  if (isLong) {
    return (
      <Textarea
        rows={3}
        value={value}
        disabled={disabled2}
        onChange={(e2) => onChange(e2.target.value)}
        className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
        style={{
          fieldSizing: "fixed",
        }}
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      />
    );
  }
  return (
    <Input3
      value={value}
      disabled={disabled2}
      onChange={(e2) => onChange(e2.target.value)}
      className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    />
  );
}
