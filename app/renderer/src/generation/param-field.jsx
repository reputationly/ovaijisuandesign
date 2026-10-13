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
import { Input3 as Input } from "../infra/select-content.jsx";
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}) {
  const _values = reactExports.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );
  return (
    <SliderRoot
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
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
          (_unusedArg, index) => (
            <SliderThumb
              key={index}
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
  values,
  value,
  disabled,
  displayMap,
  onChange,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const { t: translate } = useTranslation();
  const displayValue = (raw) => {
    const optionLabel = translate(`canvas.param.option.${raw}`, {
      defaultValue: raw,
    });
    return optionLabel !== raw ? optionLabel : (displayMap?.get(raw) ?? raw);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
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
          {values.map((option) => {
            const active = value === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  data-action-ui-id={`tool-confirm-param-${paramKey}-option-${option}`}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-body-12 cursor-pointer transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{displayValue(option)}</span>
                  {active && (
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
function filterModeHiddenValues(paramKey, values) {
  if (paramKey !== "mode") return values;
  return values.filter((value) => !isHiddenVideoGenerationMode(value));
}
function displayEnumValue(paramKey, value, translate, displayMap) {
  const optionLabel = translate(`canvas.param.option.${value}`, {
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
  values,
  value,
  disabled = false,
  displayMap,
  onChange,
  onSelect,
}) {
  const { t: translate } = useTranslation();
  return (
    <div
      className="flex max-h-56 flex-wrap gap-1 overflow-y-auto"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    >
      {values.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            data-action-ui-id={`tool-confirm-param-${paramKey}-option-${option}`}
            className={cn(
              "inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm border px-2.5 py-1 text-left text-body-12 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            onClick={() => {
              onChange(option);
              onSelect?.();
            }}
          >
            <span className="truncate">
              {displayEnumValue(paramKey, option, translate, displayMap)}
            </span>
            {active && <Icon icon={Check} size="sm" className="shrink-0" />}
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
  disabled = false,
  displayMap,
  onChange,
  onEnumSelect,
}) {
  const { t: translate } = useTranslation();
  if (Array.isArray(originalValue)) {
    const items = (() => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch {
        return [value];
      }
    })();
    const updateItem = (optionIndex, value) => {
      const next = items.map((item, index) => (index === optionIndex ? value : item));
      onChange(JSON.stringify(next));
    };
    const itemRows = items.map((item, index) => ({
      item,
      index,
      key: `${paramKey}:${String(originalValue[index] ?? item)}:${index}`,
    }));
    if (hint?.type === "enum") {
      return (
        <div
          className="flex flex-col gap-1"
          data-action-ui-id={`tool-confirm-param-${paramKey}`}
        >
          {itemRows.map(({ item, index, key }) => (
            <ParamEnumPopover
              key={key}
              paramKey={`${paramKey}[${index}]`}
              paramLabel={getParamLabel(paramKey)}
              description={hint.description}
              values={filterModeHiddenValues(paramKey, hint.values)}
              value={item}
              disabled={disabled}
              displayMap={displayMap}
              onChange={(value) => updateItem(index, value)}
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
        {itemRows.map(({ item, index, key }) => {
          const isLongItem =
            paramKey === "prompts" ||
            paramKey === "prompt" ||
            item.length >= 40;
          return isLongItem ? (
            <Textarea
              key={key}
              rows={3}
              value={item}
              disabled={disabled}
              onChange={(changeEvent) => updateItem(index, changeEvent.target.value)}
              className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
              style={{
                fieldSizing: "fixed",
              }}
            />
          ) : (
            <Input
              key={key}
              value={item}
              disabled={disabled}
              onChange={(changeEvent) => updateItem(index, changeEvent.target.value)}
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
        disabled={disabled}
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
          disabled={disabled}
          onValueChange={(value) => {
            const values = Array.isArray(value) ? value : [value];
            onChange(String(values[0]));
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
          disabled={disabled}
          onCheckedChange={(checked) => onChange(String(checked))}
        />
        <span className="text-xs text-muted-foreground">
          {value === "true"
            ? translate("chat.toolConfirm.booleanOn")
            : translate("chat.toolConfirm.booleanOff")}
        </span>
      </div>
    );
  }
  if (typeof originalValue === "number") {
    return (
      <Input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
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
        disabled={disabled}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
        style={{
          fieldSizing: "fixed",
        }}
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      />
    );
  }
  return (
    <Input
      value={value}
      disabled={disabled}
      onChange={(changeEvent) => onChange(changeEvent.target.value)}
      className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    />
  );
}
