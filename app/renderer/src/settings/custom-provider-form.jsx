// custom-provider-form.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Eye, EyeOff, Plus, RotateCcw, X$7 as X } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Trash2 } from "../media-editing/package.jsx";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { Popover, Select } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
} from "../infra/badge-variants.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
const DEFAULT_CUSTOM_MODEL_LIMITS = {
  contextWindow: 256e3,
  maxOutputTokens: 128e3,
};
function getCustomModelValidationErrors(value, stored) {
  const errors = {};
  if (!value)
    return {
      baseUrl: "url",
      apiKey: "required",
      models: "modelCount",
    };
  if (
    !["openai-compatible", "anthropic", "openai-responses"].includes(
      value.protocol,
    )
  )
    errors.protocol = "protocol";
  if (
    value.providerName !== void 0 &&
    (typeof value.providerName !== "string" || !value.providerName.trim())
  )
    errors.providerName = "required";
  try {
    const url = new URL(value.baseUrl.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      errors.baseUrl = "url";
  } catch {
    errors.baseUrl = "url";
  }
  if (typeof value.apiKey !== "string" || /[\r\n]/.test(value.apiKey))
    errors.apiKey = "apiKey";
  else if (!value.apiKey.trim() && !stored?.apiKey) errors.apiKey = "required";
  const ids = new Map();
  if (
    !Array.isArray(value.models) ||
    !value.models.length ||
    value.models.length > 50
  )
    errors.models = "modelCount";
  for (const [index, model] of (Array.isArray(value.models)
    ? value.models
    : []
  ).entries()) {
    const prefix = `models.${index}`;
    if (!model) {
      errors[`${prefix}.id`] = "modelId";
      continue;
    }
    const id = typeof model.id === "string" ? model.id.trim() : "";
    if (
      !id ||
      id.startsWith("__hub_reasoning__") ||
      Array.from(id).some((char) => /\s/.test(char) || char.charCodeAt(0) < 32)
    )
      errors[`${prefix}.id`] = "modelId";
    else if (ids.has(id)) {
      errors[`${prefix}.id`] = "duplicateModel";
      errors[`models.${ids.get(id)}.id`] = "duplicateModel";
    } else ids.set(id, index);
    if (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)
      errors[`${prefix}.contextWindow`] = "positiveInteger";
    if (
      !Number.isSafeInteger(model.maxOutputTokens) ||
      model.maxOutputTokens <= 0
    )
      errors[`${prefix}.maxOutputTokens`] = "positiveInteger";
    else if (
      Number.isSafeInteger(model.contextWindow) &&
      model.contextWindow > 0 &&
      model.maxOutputTokens > model.contextWindow
    )
      errors[`${prefix}.maxOutputTokens`] = "outputLimit";
    if (
      !Array.isArray(model.reasoningLevels) ||
      model.reasoningLevels.length > 16 ||
      new Set(model.reasoningLevels).size !== model.reasoningLevels.length ||
      model.reasoningLevels.some(
        (level) => typeof level !== "string" || !/^[a-zA-Z0-9_-]+$/.test(level),
      )
    )
      errors[`${prefix}.reasoningLevels`] = "reasoning";
    else if (
      value.protocol === "anthropic" &&
      model.reasoningLevels.some(
        (level) => !["low", "medium", "high", "xhigh", "max"].includes(level),
      )
    )
      errors[`${prefix}.reasoningLevels`] = "anthropicReasoning";
  }
  const names = new Map();
  if (value.headers !== void 0 && !Array.isArray(value.headers))
    errors.headers = "headerName";
  for (const [index, header] of (Array.isArray(value.headers)
    ? value.headers
    : []
  ).entries()) {
    const prefix = `headers.${index}`;
    if (!header) {
      errors[`${prefix}.name`] = "headerName";
      continue;
    }
    const headerName =
      typeof header.name === "string" ? header.name.trim().toLowerCase() : "";
    if (
      !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(headerName) ||
      [
        "host",
        "content-length",
        "connection",
        "transfer-encoding",
        "upgrade",
      ].includes(headerName)
    )
      errors[`${prefix}.name`] = "headerName";
    else if (names.has(headerName)) {
      errors[`${prefix}.name`] = "duplicateHeader";
      errors[`headers.${names.get(headerName)}.name`] = "duplicateHeader";
    } else names.set(headerName, index);
    if (typeof header.value !== "string" || /[\r\n\0]/.test(header.value))
      errors[`${prefix}.value`] = "headerValue";
    else if (
      !header.value &&
      !Object.entries(stored?.headers ?? {}).some(
        ([saved, value]) =>
          saved.toLowerCase() === headerName &&
          typeof value === "string" &&
          value.length > 0,
      )
    )
      errors[`${prefix}.value`] = "required";
  }
  return errors;
}
function CustomModelFieldError({ id, error }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
      {t(`settings.models.validation.${error}`)}
    </p>
  );
}
const PRESET_LEVELS = ["low", "medium", "high", "xhigh", "max"];
function CustomReasoningSelect({
  id,
  index,
  levels,
  draft,
  disabled,
  invalid,
  onChange,
}) {
  const { t } = useTranslation();
  const anchor = reactExports.useRef(null);
  const [open, setOpen] = reactExports.useState(false);
  const choices = [...new Set([...PRESET_LEVELS, ...levels])];
  const handleAdd = () => {
    const next = draft.trim();
    if (next) onChange([...new Set([...levels, next])], "");
  };
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <div
        ref={anchor}
        data-invalid={invalid || void 0}
        data-disabled={disabled || void 0}
        data-slot="reasoning-select"
        className="flex min-h-8 items-center gap-1 rounded-lg border border-input px-2 py-1 focus-within:border-foreground data-[disabled]:opacity-50 data-[invalid]:border-destructive data-[invalid]:ring-1 data-[invalid]:ring-destructive/20"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {levels.map((level) => (
            <Badge
              key={level}
              variant="secondary"
              className="h-6 max-w-full gap-1 rounded-full"
            >
              <span className="truncate">{level}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-4 shrink-0 rounded-full text-muted-foreground"
                disabled={disabled}
                aria-label={t("settings.models.removeReasoning", {
                  level,
                })}
                data-action-ui-id={`settings-models.remove-reasoning-${index}-${level}`}
                onClick={() =>
                  onChange(
                    levels.filter((item) => item !== level),
                    draft,
                  )
                }
              >
                <X className="size-3" strokeWidth={1.5} />
              </Button>
            </Badge>
          ))}
          <Input3
            id={id}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : void 0}
            value={draft}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="h-6 w-20 flex-1 rounded-none border-0 px-1 py-0 aria-invalid:ring-0"
            placeholder={
              levels.length
                ? void 0
                : t("settings.models.reasoningPlaceholder")
            }
            onChange={(event) => onChange(levels, event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
              }
            }}
            data-action-ui-id={`settings-models.reasoning-${index}`}
          />
        </div>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground"
              disabled={disabled}
              aria-label={t("settings.models.chooseReasoning")}
              data-action-ui-id={`settings-models.choose-reasoning-${index}`}
            />
          }
        >
          <ChevronDown className="size-4" strokeWidth={1.5} />
        </PopoverTrigger>
      </div>
      <PopoverContent
        anchor={anchor}
        align="start"
        className="w-(--anchor-width) gap-1 p-1"
        aria-label={t("settings.models.reasoningLevels")}
      >
        {choices.map((level) => (
          <Label
            key={level}
            className="hilo-checkbox-label flex cursor-pointer items-center rounded-md px-2 py-1.5 hover:bg-accent focus-within:bg-accent"
          >
            <Checkbox
              checked={levels.includes(level)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...levels, level]
                    : levels.filter((item) => item !== level),
                  draft.trim() === level ? "" : draft,
                )
              }
              data-action-ui-id={`settings-models.reasoning-option-${index}-${level}`}
            />
            {level}
          </Label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
function CustomModelCard({
  model,
  errors = {},
  index,
  disabled,
  canRemove,
  onChange,
  onRemove,
}) {
  const { t } = useTranslation();
  const prefix = `custom-model-${index}`;
  return (
    <section
      className="space-y-3"
      aria-label={t("settings.models.modelNumber", {
        number: index + 1,
      })}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          {t("settings.models.modelNumber", {
            number: String(index + 1).padStart(2, "0"),
          })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t("settings.models.resetModel")}
            data-action-ui-id={`settings-models.reset-model-${index}`}
            onClick={() => {
              onChange({
                ...model,
                ...DEFAULT_CUSTOM_MODEL_LIMITS,
                reasoningLevels: [],
                reasoningDraft: "",
              });
            }}
          >
            <RotateCcw className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || !canRemove}
            aria-label={t("settings.models.removeModel")}
            data-action-ui-id={`settings-models.remove-model-${index}`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label
            htmlFor={`${prefix}-id`}
            className="gap-1 after:text-destructive after:content-['*']"
          >
            {t("settings.models.modelId")}
          </Label>
          <Input3
            id={`${prefix}-id`}
            aria-invalid={Boolean(errors[`models.${index}.id`])}
            aria-describedby={
              errors[`models.${index}.id`] ? `${prefix}-id-error` : void 0
            }
            value={model.id}
            required={true}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("settings.models.modelIdPlaceholder")}
            onChange={(event) =>
              onChange({
                ...model,
                id: event.target.value,
              })
            }
            data-action-ui-id={`settings-models.model-id-${index}`}
          />
          <CustomModelFieldError
            id={`${prefix}-id`}
            error={errors[`models.${index}.id`]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor={`${prefix}-context`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t("settings.models.contextWindow")}
            </Label>
            <Input3
              id={`${prefix}-context`}
              aria-invalid={Boolean(errors[`models.${index}.contextWindow`])}
              aria-describedby={
                errors[`models.${index}.contextWindow`]
                  ? `${prefix}-context-error`
                  : void 0
              }
              type="number"
              min={1}
              step={1}
              value={model.contextWindow || ""}
              required={true}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...model,
                  contextWindow: Number(event.target.value),
                })
              }
              data-action-ui-id={`settings-models.context-window-${index}`}
            />
            <CustomModelFieldError
              id={`${prefix}-context`}
              error={errors[`models.${index}.contextWindow`]}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${prefix}-output`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t("settings.models.maxOutputTokens")}
            </Label>
            <Input3
              id={`${prefix}-output`}
              aria-invalid={Boolean(errors[`models.${index}.maxOutputTokens`])}
              aria-describedby={
                errors[`models.${index}.maxOutputTokens`]
                  ? `${prefix}-output-error`
                  : void 0
              }
              type="number"
              min={1}
              step={1}
              value={model.maxOutputTokens || ""}
              required={true}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...model,
                  maxOutputTokens: Number(event.target.value),
                })
              }
              data-action-ui-id={`settings-models.max-output-${index}`}
            />
            <CustomModelFieldError
              id={`${prefix}-output`}
              error={errors[`models.${index}.maxOutputTokens`]}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-reasoning`}>
            {t("settings.models.reasoningLevels")}
          </Label>
          <CustomReasoningSelect
            id={`${prefix}-reasoning`}
            index={index}
            levels={model.reasoningLevels}
            draft={model.reasoningDraft}
            disabled={disabled}
            invalid={Boolean(errors[`models.${index}.reasoningLevels`])}
            onChange={(reasoningLevels, reasoningDraft) =>
              onChange({
                ...model,
                reasoningLevels,
                reasoningDraft,
              })
            }
          />
          <CustomModelFieldError
            id={`${prefix}-reasoning`}
            error={errors[`models.${index}.reasoningLevels`]}
          />
        </div>
      </div>
    </section>
  );
}
function CustomModelHeaders({
  headers,
  errors = {},
  disabled,
  savedNames,
  onChange,
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" aria-label={t("settings.models.headers")}>
      <h3 className="text-sm font-medium">{t("settings.models.headers")}</h3>
      <CustomModelFieldError id="custom-headers" error={errors.headers} />
      {headers.map((header, index) => (
        <div key={header.rowKey} className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label
              htmlFor={`custom-header-name-${index}`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t("settings.models.headerName")}
            </Label>
            <Input3
              id={`custom-header-name-${index}`}
              aria-invalid={Boolean(errors[`headers.${index}.name`])}
              aria-describedby={
                errors[`headers.${index}.name`]
                  ? `custom-header-name-${index}-error`
                  : void 0
              }
              value={header.name}
              required={true}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                onChange(
                  headers.map((row, rowIndex) =>
                    rowIndex === index
                      ? {
                          ...row,
                          name: event.target.value,
                        }
                      : row,
                  ),
                )
              }
              data-action-ui-id={`settings-models.header-name-${index}`}
            />
            <CustomModelFieldError
              id={`custom-header-name-${index}`}
              error={errors[`headers.${index}.name`]}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label
              htmlFor={`custom-header-value-${index}`}
              className={
                !savedNames.some(
                  (savedName) =>
                    savedName.toLowerCase() === header.name.trim().toLowerCase(),
                )
                  ? "gap-1 after:text-destructive after:content-['*']"
                  : void 0
              }
            >
              {t("settings.models.headerValue")}
            </Label>
            <Input3
              id={`custom-header-value-${index}`}
              aria-invalid={Boolean(errors[`headers.${index}.value`])}
              aria-describedby={
                errors[`headers.${index}.value`]
                  ? `custom-header-value-${index}-error`
                  : void 0
              }
              type="password"
              value={header.value}
              required={
                !savedNames.some(
                  (savedName) =>
                    savedName.toLowerCase() === header.name.trim().toLowerCase(),
                )
              }
              disabled={disabled}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={
                savedNames.some(
                  (savedName) =>
                    savedName.toLowerCase() === header.name.trim().toLowerCase(),
                )
                  ? t("settings.models.headerSavedPlaceholder")
                  : void 0
              }
              onChange={(event) =>
                onChange(
                  headers.map((row, rowIndex) =>
                    rowIndex === index
                      ? {
                          ...row,
                          value: event.target.value,
                        }
                      : row,
                  ),
                )
              }
              data-action-ui-id={`settings-models.header-value-${index}`}
            />
            <CustomModelFieldError
              id={`custom-header-value-${index}`}
              error={errors[`headers.${index}.value`]}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-6"
            disabled={disabled}
            aria-label={t("settings.models.removeHeader")}
            data-action-ui-id={`settings-models.remove-header-${index}`}
            onClick={() =>
              onChange(headers.filter((_, rowIndex) => rowIndex !== index))
            }
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...headers,
            {
              name: "",
              value: "",
              rowKey: crypto.randomUUID(),
            },
          ])
        }
        data-action-ui-id="settings-models.add-header"
      >
        <Plus className="size-4" strokeWidth={1.5} />
        {t("settings.models.addHeader")}
      </Button>
      {headers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("settings.models.headersHelp")}
        </p>
      )}
    </section>
  );
}
const newModel = () => ({
  id: "",
  ...DEFAULT_CUSTOM_MODEL_LIMITS,
  reasoningLevels: [],
  reasoningDraft: "",
  rowKey: crypto.randomUUID(),
});
const emptyInput = () => ({
  protocol: "anthropic",
  baseUrl: "",
  apiKey: "",
  models: [newModel()],
  headers: [],
});
function formValue(stored) {
  if (!stored) return emptyInput();
  return {
    protocol: stored.protocol,
    providerName: stored.providerName,
    baseUrl: stored.baseUrl,
    apiKey: "",
    models: stored.models.map((model) => ({
      ...model,
      rowKey: crypto.randomUUID(),
      reasoningDraft: "",
    })),
    headers: Object.keys(stored.headers ?? {}).map((headerName) => ({
      name: headerName,
      value: "",
      rowKey: crypto.randomUUID(),
    })),
  };
}
export function CustomProviderForm({ stored, onSave, onCancel }) {
  const { t } = useTranslation();
  const [value, setValue] = reactExports.useState(() => formValue(stored));
  const [showKey, setShowKey] = reactExports.useState(false);
  const [pending, setPending] = reactExports.useState(false);
  const [deleteOpen, setDeleteOpen] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [saved, setSaved] = reactExports.useState(false);
  const dirtyRef = reactExports.useRef(false);
  const formRef = reactExports.useRef(null);
  const [submitted, setSubmitted] = reactExports.useState(false);
  const input = {
    ...value,
    providerName: value.providerName?.trim() || void 0,
    models: value.models.map(
      ({ rowKey: _rowKey, reasoningDraft, ...model }) => ({
        ...model,
        reasoningLevels: [
          ...new Set([
            ...model.reasoningLevels,
            ...(reasoningDraft.trim() ? [reasoningDraft.trim()] : []),
          ]),
        ],
      }),
    ),
    headers: value.headers.map(({ rowKey: _rowKey, ...header }) => header),
  };
  const fieldErrors = submitted
    ? getCustomModelValidationErrors(input, stored)
    : {};
  reactExports.useEffect(() => {
    if (dirtyRef.current) return;
    setValue(formValue(stored));
  }, [stored]);
  const handleChange = (patch) => {
    dirtyRef.current = true;
    setValue((current) => ({
      ...current,
      ...patch,
    }));
    setError(void 0);
    setSaved(false);
  };
  const handleSave = async (clear = false) => {
    if (pending) return;
    if (!clear) {
      setSubmitted(true);
      setError(void 0);
      if (Object.keys(getCustomModelValidationErrors(input, stored)).length) {
        requestAnimationFrame(() =>
          formRef.current?.querySelector('[aria-invalid="true"]')?.focus(),
        );
        return;
      }
    }
    setPending(true);
    setError(void 0);
    setSaved(false);
    try {
      if (await onSave(clear ? void 0 : input)) {
        if (clear) setDeleteOpen(false);
        dirtyRef.current = false;
        setSubmitted(false);
        setValue(
          clear
            ? emptyInput()
            : {
                ...value,
                apiKey: "",
                models: value.models.map((model, index) => ({
                  ...model,
                  reasoningLevels: input.models[index].reasoningLevels,
                  reasoningDraft: "",
                })),
                headers: value.headers.map((header) => ({
                  ...header,
                  value: "",
                })),
              },
        );
        setShowKey(false);
        setSaved(true);
      } else {
        setError(t("settings.models.saveFailed"));
      }
    } catch {
      setError(t("settings.models.saveFailed"));
    } finally {
      setPending(false);
    }
  };
  return (
    <div ref={formRef} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("settings.models.description")}
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-model-provider">
              {t("settings.models.providerName")}
            </Label>
            <Input3
              id="custom-model-provider"
              aria-invalid={Boolean(fieldErrors.providerName)}
              aria-describedby={
                fieldErrors.providerName
                  ? "custom-model-provider-error"
                  : void 0
              }
              value={value.providerName ?? ""}
              disabled={pending}
              autoComplete="off"
              placeholder={t("settings.models.providerNamePlaceholder")}
              onChange={(event) =>
                handleChange({
                  providerName: event.target.value,
                })
              }
              data-action-ui-id="settings-models.provider-name"
            />
            <CustomModelFieldError
              id="custom-model-provider"
              error={fieldErrors.providerName}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="custom-model-protocol"
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t("settings.models.protocol")}
            </Label>
            <Select
              value={value.protocol}
              disabled={pending}
              onValueChange={(protocol) => {
                if (
                  protocol === "openai-compatible" ||
                  protocol === "anthropic" ||
                  protocol === "openai-responses"
                ) {
                  handleChange({
                    protocol,
                  });
                }
              }}
            >
              <SelectTrigger
                id="custom-model-protocol"
                aria-invalid={Boolean(fieldErrors.protocol)}
                aria-required="true"
                aria-describedby={
                  fieldErrors.protocol ? "custom-model-protocol-error" : void 0
                }
                className="w-full"
                data-action-ui-id="settings-models.protocol"
              >
                <SelectValue>
                  {t(
                    value.protocol === "anthropic"
                      ? "settings.models.protocolAnthropic"
                      : value.protocol === "openai-responses"
                        ? "settings.models.protocolResponses"
                        : "settings.models.protocolOpenAI",
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="anthropic"
                  data-action-ui-id="settings-models.protocol-anthropic"
                >
                  {t("settings.models.protocolAnthropic")}
                </SelectItem>
                <SelectItem
                  value="openai-compatible"
                  data-action-ui-id="settings-models.protocol-openai"
                >
                  {t("settings.models.protocolOpenAI")}
                </SelectItem>
                <SelectItem
                  value="openai-responses"
                  data-action-ui-id="settings-models.protocol-responses"
                >
                  {t("settings.models.protocolResponses")}
                </SelectItem>
              </SelectContent>
            </Select>
            <CustomModelFieldError
              id="custom-model-protocol"
              error={fieldErrors.protocol}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="custom-model-base-url"
            className="gap-1 after:text-destructive after:content-['*']"
          >
            {t("settings.models.baseUrl")}
          </Label>
          <Input3
            id="custom-model-base-url"
            aria-invalid={Boolean(fieldErrors.baseUrl)}
            aria-describedby={
              fieldErrors.baseUrl ? "custom-model-base-url-error" : void 0
            }
            value={value.baseUrl}
            required={true}
            disabled={pending}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("settings.models.baseUrlPlaceholder")}
            onChange={(event) =>
              handleChange({
                baseUrl: event.target.value,
              })
            }
            data-action-ui-id="settings-models.base-url"
          />
          <CustomModelFieldError
            id="custom-model-base-url"
            error={fieldErrors.baseUrl}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="custom-model-api-key"
            className={
              !stored?.apiKey
                ? "gap-1 after:text-destructive after:content-['*']"
                : void 0
            }
          >
            {t("settings.models.apiKey")}
          </Label>
          <div className="relative">
            <Input3
              id="custom-model-api-key"
              aria-invalid={Boolean(fieldErrors.apiKey)}
              aria-describedby={
                fieldErrors.apiKey
                  ? "custom-model-api-key-help custom-model-api-key-error"
                  : "custom-model-api-key-help"
              }
              className="pr-10"
              type={showKey ? "text" : "password"}
              value={value.apiKey}
              required={!stored?.apiKey}
              disabled={pending}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={t(
                stored?.apiKey
                  ? "settings.models.apiKeySavedPlaceholder"
                  : "settings.models.apiKeyPlaceholder",
              )}
              onChange={(event) =>
                handleChange({
                  apiKey: event.target.value,
                })
              }
              data-action-ui-id="settings-models.api-key"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              disabled={pending}
              aria-label={t(
                showKey ? "settings.models.hideKey" : "settings.models.showKey",
              )}
              data-action-ui-id="settings-models.toggle-key"
              onClick={() => setShowKey((current) => !current)}
            >
              {showKey ? (
                <EyeOff className="size-4" strokeWidth={1.5} />
              ) : (
                <Eye className="size-4" strokeWidth={1.5} />
              )}
            </Button>
          </div>
          <CustomModelFieldError
            id="custom-model-api-key"
            error={fieldErrors.apiKey}
          />
          <p
            id="custom-model-api-key-help"
            className="text-xs text-muted-foreground"
          >
            {t("settings.models.apiKeyHelp")}
          </p>
        </div>
      </div>
      <CustomModelHeaders
        errors={fieldErrors}
        headers={value.headers ?? []}
        disabled={pending}
        savedNames={Object.keys(stored?.headers ?? {})}
        onChange={(headers) =>
          handleChange({
            headers,
          })
        }
      />
      <div className="space-y-4">
        <CustomModelFieldError id="custom-models" error={fieldErrors.models} />
        {(value.models ?? []).map((model, index) => (
          <CustomModelCard
            key={model.rowKey}
            errors={fieldErrors}
            model={model}
            index={index}
            disabled={pending}
            canRemove={(value.models?.length ?? 0) > 1}
            onChange={(next) =>
              handleChange({
                models: value.models?.map((entry, entryIndex) =>
                  entryIndex === index
                    ? {
                        ...next,
                        rowKey: entry.rowKey,
                      }
                    : entry,
                ),
              })
            }
            onRemove={() =>
              handleChange({
                models: value.models?.filter(
                  (_, entryIndex) => entryIndex !== index,
                ),
              })
            }
          />
        ))}
        <Button
          variant="outline"
          disabled={pending || (value.models?.length ?? 0) >= 50}
          onClick={() =>
            handleChange({
              models: [...(value.models ?? []), newModel()],
            })
          }
          data-action-ui-id="settings-models.add-model"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          {t("settings.models.addModel")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("settings.models.applyHint")}
      </p>
      {error && !deleteOpen && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("settings.models.saved")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={onCancel}
          data-action-ui-id="settings-models.cancel-provider"
        >
          {t("common.cancel")}
        </Button>
        <Button
          disabled={pending}
          onClick={() => void handleSave()}
          data-action-ui-id="settings-models.save"
        >
          {t(pending ? "common.saving" : "common.save")}
        </Button>
        {stored && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError(void 0);
              setDeleteOpen(true);
            }}
            data-action-ui-id="settings-models.clear"
          >
            {t("settings.models.clear")}
          </Button>
        )}
      </div>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!pending) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent size="sm" layer="nested">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.models.deleteProviderTitle", {
                name:
                  stored?.providerName || t("settings.models.customProvider"),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.models.deleteProviderDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={pending}
              data-action-ui-id="settings-models.cancel-delete-provider"
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => void handleSave(true)}
              data-action-ui-id="settings-models.confirm-delete-provider"
            >
              {t(pending ? "common.deleting" : "common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
