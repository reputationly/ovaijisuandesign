// editable-param-chip.jsx
import {
  getParamLabel,
  MODEL_NAME_KEYS,
  stringifyParamValue,
} from "./domestic-param-labels.jsx";
import { Clock } from "../media-editing/package.jsx";
import { Info$1 as Info, reactExports, useTranslation } from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { parseParamValueLikeOriginal } from "./reference-media-strip.jsx";
import { ParamField } from "./param-field.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
const HIDE_DESC_KEYS = new Set(["model_name", "model_id"]);
const TAG_ICON = {
  duration: Clock,
  durations: Clock,
};
function displayParamValue(value, t2, displayMap, formatBoolean) {
  if (Array.isArray(value)) {
    const values3 = value
      .map((item) => displayParamValue(item, t2, displayMap, formatBoolean))
      .filter(Boolean);
    if (values3.length === 0) return "—";
    if (values3.length <= 2) return values3.join(", ");
    return `${values3[0]} +${values3.length - 1}`;
  }
  if (typeof value === "boolean")
    return formatBoolean ? formatBoolean(value) : value ? "ON" : "OFF";
  const raw2 = stringifyParamValue(value);
  const optionLabel = t2(`canvas.param.option.${raw2}`, {
    defaultValue: raw2,
  });
  return (
    (optionLabel !== raw2 ? optionLabel : (displayMap?.get(raw2) ?? raw2)) ||
    "—"
  );
}
export function EditableParamChip({
  paramKey,
  value,
  displayValue,
  originalValue,
  hint,
  displayMap,
  categoryIcon,
  batchPageIndex,
  batchPageCount,
  onChange,
}) {
  const { t: t2 } = useTranslation();
  const label = getParamLabel(paramKey);
  const ParamIcon = MODEL_NAME_KEYS.has(paramKey)
    ? categoryIcon
    : TAG_ICON[paramKey];
  const pagedArray =
    batchPageIndex !== void 0 &&
    batchPageCount > 1 &&
    Array.isArray(value) &&
    Array.isArray(originalValue) &&
    value.length === batchPageCount;
  const fieldValue = pagedArray ? value[batchPageIndex] : value;
  const fieldOriginalValue = pagedArray
    ? originalValue[batchPageIndex]
    : originalValue;
  const stringValue2 = stringifyParamValue(fieldValue);
  const handleChange = reactExports.useCallback(
    (nextValue) => {
      if (!pagedArray || batchPageIndex === void 0 || !Array.isArray(value)) {
        onChange(nextValue);
        return;
      }
      const next2 = [...value];
      next2[batchPageIndex] = parseParamValueLikeOriginal(
        fieldOriginalValue,
        nextValue,
      );
      onChange(JSON.stringify(next2));
    },
    [batchPageIndex, fieldOriginalValue, onChange, pagedArray, value],
  );
  const [open, setOpen] = reactExports.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
        title={label}
        className="inline-flex min-w-0 max-w-full shrink-0 items-center gap-0.5 px-2 py-0 rounded-sm text-body-12 text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
      >
        {ParamIcon && (
          <ParamIcon size={16} strokeWidth={1.5} className="shrink-0" />
        )}
        <span className="whitespace-nowrap">
          {displayParamValue(displayValue ?? value, t2, displayMap, (v2) =>
            t2(
              v2 ? "chat.toolConfirm.booleanOn" : "chat.toolConfirm.booleanOff",
            ),
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-sm">
        <div className="flex items-center gap-1 text-body-12 font-medium text-muted-foreground">
          {label}
          {hint?.description && !HIDE_DESC_KEYS.has(paramKey) && (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <Icon
                    icon={Info}
                    size="xs"
                    className="shrink-0 text-brand-accent"
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-60 text-body-12">
                  {hint.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <ParamField
          paramKey={paramKey}
          value={stringValue2}
          originalValue={fieldOriginalValue}
          hint={hint}
          displayMap={displayMap}
          onChange={handleChange}
          onEnumSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
