// custom-provider-form.jsx
import {
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  reactExports,
  RotateCcw,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Trash2 } from "../media-editing/package.jsx";
import { AlertDialog, Button$1 } from "../infra/dialog-content.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { Popover, Select$1 } from "../assets/credit-query-keys.jsx";
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
    const url2 = new URL(value.baseUrl.trim());
    if (
      !["http:", "https:"].includes(url2.protocol) ||
      url2.username ||
      url2.password ||
      url2.search ||
      url2.hash
    )
      errors.baseUrl = "url";
  } catch {
    errors.baseUrl = "url";
  }
  if (typeof value.apiKey !== "string" || /[\r\n]/.test(value.apiKey))
    errors.apiKey = "apiKey";
  else if (!value.apiKey.trim() && !stored?.apiKey) errors.apiKey = "required";
  const ids2 = new Map();
  if (
    !Array.isArray(value.models) ||
    !value.models.length ||
    value.models.length > 50
  )
    errors.models = "modelCount";
  for (const [index2, model] of (Array.isArray(value.models)
    ? value.models
    : []
  ).entries()) {
    const prefix = `models.${index2}`;
    if (!model) {
      errors[`${prefix}.id`] = "modelId";
      continue;
    }
    const id2 = typeof model.id === "string" ? model.id.trim() : "";
    if (
      !id2 ||
      id2.startsWith("__hub_reasoning__") ||
      Array.from(id2).some((char) => /\s/.test(char) || char.charCodeAt(0) < 32)
    )
      errors[`${prefix}.id`] = "modelId";
    else if (ids2.has(id2)) {
      errors[`${prefix}.id`] = "duplicateModel";
      errors[`models.${ids2.get(id2)}.id`] = "duplicateModel";
    } else ids2.set(id2, index2);
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
  for (const [index2, header] of (Array.isArray(value.headers)
    ? value.headers
    : []
  ).entries()) {
    const prefix = `headers.${index2}`;
    if (!header) {
      errors[`${prefix}.name`] = "headerName";
      continue;
    }
    const name2 =
      typeof header.name === "string" ? header.name.trim().toLowerCase() : "";
    if (
      !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name2) ||
      [
        "host",
        "content-length",
        "connection",
        "transfer-encoding",
        "upgrade",
      ].includes(name2)
    )
      errors[`${prefix}.name`] = "headerName";
    else if (names.has(name2)) {
      errors[`${prefix}.name`] = "duplicateHeader";
      errors[`headers.${names.get(name2)}.name`] = "duplicateHeader";
    } else names.set(name2, index2);
    if (typeof header.value !== "string" || /[\r\n\0]/.test(header.value))
      errors[`${prefix}.value`] = "headerValue";
    else if (
      !header.value &&
      !Object.entries(stored?.headers ?? {}).some(
        ([saved, value2]) =>
          saved.toLowerCase() === name2 &&
          typeof value2 === "string" &&
          value2.length > 0,
      )
    )
      errors[`${prefix}.value`] = "required";
  }
  return errors;
}

function CustomModelFieldError({ id: id2, error }) {
  const { t: t2 } = useTranslation();
  if (!error) return null;
  return (
    <p id={`${id2}-error`} role="alert" className="text-xs text-destructive">
      {t2(`settings.models.validation.${error}`)}
    </p>
  );
}

const PRESET_LEVELS = ["low", "medium", "high", "xhigh", "max"];

function CustomReasoningSelect({
  id: id2,
  index: index2,
  levels,
  draft,
  disabled: disabled2,
  invalid: invalid2,
  onChange,
}) {
  const { t: t2 } = useTranslation();
  const anchor = reactExports.useRef(null);
  const [open, setOpen] = reactExports.useState(false);
  const choices = [...new Set([...PRESET_LEVELS, ...levels])];
  const handleAdd = () => {
    const next2 = draft.trim();
    if (next2) onChange([...new Set([...levels, next2])], "");
  };
  return (
    <Popover open={open && !disabled2} onOpenChange={setOpen}>
      <div
        ref={anchor}
        data-invalid={invalid2 || void 0}
        data-disabled={disabled2 || void 0}
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
              <Button$1
                type="button"
                variant="ghost"
                size="icon"
                className="size-4 shrink-0 rounded-full text-muted-foreground"
                disabled={disabled2}
                aria-label={t2("settings.models.removeReasoning", {
                  level,
                })}
                data-action-ui-id={`settings-models.remove-reasoning-${index2}-${level}`}
                onClick={() =>
                  onChange(
                    levels.filter((item) => item !== level),
                    draft,
                  )
                }
              >
                <X$7 className="size-3" strokeWidth={1.5} />
              </Button$1>
            </Badge>
          ))}
          <Input3
            id={id2}
            aria-invalid={invalid2}
            aria-describedby={invalid2 ? `${id2}-error` : void 0}
            value={draft}
            disabled={disabled2}
            autoComplete="off"
            spellCheck={false}
            className="h-6 w-20 flex-1 rounded-none border-0 px-1 py-0 aria-invalid:ring-0"
            placeholder={
              levels.length
                ? void 0
                : t2("settings.models.reasoningPlaceholder")
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
            data-action-ui-id={`settings-models.reasoning-${index2}`}
          />
        </div>
        <PopoverTrigger
          render={
            <Button$1
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground"
              disabled={disabled2}
              aria-label={t2("settings.models.chooseReasoning")}
              data-action-ui-id={`settings-models.choose-reasoning-${index2}`}
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
        aria-label={t2("settings.models.reasoningLevels")}
      >
        {choices.map((level) => (
          <Label
            key={level}
            className="hilo-checkbox-label flex cursor-pointer items-center rounded-md px-2 py-1.5 hover:bg-accent focus-within:bg-accent"
          >
            <Checkbox
              checked={levels.includes(level)}
              disabled={disabled2}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...levels, level]
                    : levels.filter((item) => item !== level),
                  draft.trim() === level ? "" : draft,
                )
              }
              data-action-ui-id={`settings-models.reasoning-option-${index2}-${level}`}
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
  index: index2,
  disabled: disabled2,
  canRemove,
  onChange,
  onRemove: onRemove2,
}) {
  const { t: t2 } = useTranslation();
  const prefix = `custom-model-${index2}`;
  return (
    <section
      className="space-y-3"
      aria-label={t2("settings.models.modelNumber", {
        number: index2 + 1,
      })}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          {t2("settings.models.modelNumber", {
            number: String(index2 + 1).padStart(2, "0"),
          })}
        </h3>
        <div className="flex gap-1">
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2}
            aria-label={t2("settings.models.resetModel")}
            data-action-ui-id={`settings-models.reset-model-${index2}`}
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
          </Button$1>
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2 || !canRemove}
            aria-label={t2("settings.models.removeModel")}
            data-action-ui-id={`settings-models.remove-model-${index2}`}
            onClick={onRemove2}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button$1>
        </div>
      </div>
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label
            htmlFor={`${prefix}-id`}
            className="gap-1 after:text-destructive after:content-['*']"
          >
            {t2("settings.models.modelId")}
          </Label>
          <Input3
            id={`${prefix}-id`}
            aria-invalid={Boolean(errors[`models.${index2}.id`])}
            aria-describedby={
              errors[`models.${index2}.id`] ? `${prefix}-id-error` : void 0
            }
            value={model.id}
            required={true}
            disabled={disabled2}
            autoComplete="off"
            spellCheck={false}
            placeholder={t2("settings.models.modelIdPlaceholder")}
            onChange={(event) =>
              onChange({
                ...model,
                id: event.target.value,
              })
            }
            data-action-ui-id={`settings-models.model-id-${index2}`}
          />
          <CustomModelFieldError
            id={`${prefix}-id`}
            error={errors[`models.${index2}.id`]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor={`${prefix}-context`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t2("settings.models.contextWindow")}
            </Label>
            <Input3
              id={`${prefix}-context`}
              aria-invalid={Boolean(errors[`models.${index2}.contextWindow`])}
              aria-describedby={
                errors[`models.${index2}.contextWindow`]
                  ? `${prefix}-context-error`
                  : void 0
              }
              type="number"
              min={1}
              step={1}
              value={model.contextWindow || ""}
              required={true}
              disabled={disabled2}
              onChange={(event) =>
                onChange({
                  ...model,
                  contextWindow: Number(event.target.value),
                })
              }
              data-action-ui-id={`settings-models.context-window-${index2}`}
            />
            <CustomModelFieldError
              id={`${prefix}-context`}
              error={errors[`models.${index2}.contextWindow`]}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${prefix}-output`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t2("settings.models.maxOutputTokens")}
            </Label>
            <Input3
              id={`${prefix}-output`}
              aria-invalid={Boolean(errors[`models.${index2}.maxOutputTokens`])}
              aria-describedby={
                errors[`models.${index2}.maxOutputTokens`]
                  ? `${prefix}-output-error`
                  : void 0
              }
              type="number"
              min={1}
              step={1}
              value={model.maxOutputTokens || ""}
              required={true}
              disabled={disabled2}
              onChange={(event) =>
                onChange({
                  ...model,
                  maxOutputTokens: Number(event.target.value),
                })
              }
              data-action-ui-id={`settings-models.max-output-${index2}`}
            />
            <CustomModelFieldError
              id={`${prefix}-output`}
              error={errors[`models.${index2}.maxOutputTokens`]}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-reasoning`}>
            {t2("settings.models.reasoningLevels")}
          </Label>
          <CustomReasoningSelect
            id={`${prefix}-reasoning`}
            index={index2}
            levels={model.reasoningLevels}
            draft={model.reasoningDraft}
            disabled={disabled2}
            invalid={Boolean(errors[`models.${index2}.reasoningLevels`])}
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
            error={errors[`models.${index2}.reasoningLevels`]}
          />
        </div>
      </div>
    </section>
  );
}

function CustomModelHeaders({
  headers,
  errors = {},
  disabled: disabled2,
  savedNames,
  onChange,
}) {
  const { t: t2 } = useTranslation();
  return (
    <section className="space-y-3" aria-label={t2("settings.models.headers")}>
      <h3 className="text-sm font-medium">{t2("settings.models.headers")}</h3>
      <CustomModelFieldError id="custom-headers" error={errors.headers} />
      {headers.map((header, index2) => (
        <div key={header.rowKey} className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label
              htmlFor={`custom-header-name-${index2}`}
              className="gap-1 after:text-destructive after:content-['*']"
            >
              {t2("settings.models.headerName")}
            </Label>
            <Input3
              id={`custom-header-name-${index2}`}
              aria-invalid={Boolean(errors[`headers.${index2}.name`])}
              aria-describedby={
                errors[`headers.${index2}.name`]
                  ? `custom-header-name-${index2}-error`
                  : void 0
              }
              value={header.name}
              required={true}
              disabled={disabled2}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                onChange(
                  headers.map((row, rowIndex) =>
                    rowIndex === index2
                      ? {
                          ...row,
                          name: event.target.value,
                        }
                      : row,
                  ),
                )
              }
              data-action-ui-id={`settings-models.header-name-${index2}`}
            />
            <CustomModelFieldError
              id={`custom-header-name-${index2}`}
              error={errors[`headers.${index2}.name`]}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label
              htmlFor={`custom-header-value-${index2}`}
              className={
                !savedNames.some(
                  (name2) =>
                    name2.toLowerCase() === header.name.trim().toLowerCase(),
                )
                  ? "gap-1 after:text-destructive after:content-['*']"
                  : void 0
              }
            >
              {t2("settings.models.headerValue")}
            </Label>
            <Input3
              id={`custom-header-value-${index2}`}
              aria-invalid={Boolean(errors[`headers.${index2}.value`])}
              aria-describedby={
                errors[`headers.${index2}.value`]
                  ? `custom-header-value-${index2}-error`
                  : void 0
              }
              type="password"
              value={header.value}
              required={
                !savedNames.some(
                  (name2) =>
                    name2.toLowerCase() === header.name.trim().toLowerCase(),
                )
              }
              disabled={disabled2}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={
                savedNames.some(
                  (name2) =>
                    name2.toLowerCase() === header.name.trim().toLowerCase(),
                )
                  ? t2("settings.models.headerSavedPlaceholder")
                  : void 0
              }
              onChange={(event) =>
                onChange(
                  headers.map((row, rowIndex) =>
                    rowIndex === index2
                      ? {
                          ...row,
                          value: event.target.value,
                        }
                      : row,
                  ),
                )
              }
              data-action-ui-id={`settings-models.header-value-${index2}`}
            />
            <CustomModelFieldError
              id={`custom-header-value-${index2}`}
              error={errors[`headers.${index2}.value`]}
            />
          </div>
          <Button$1
            variant="ghost"
            size="icon"
            className="mt-6"
            disabled={disabled2}
            aria-label={t2("settings.models.removeHeader")}
            data-action-ui-id={`settings-models.remove-header-${index2}`}
            onClick={() =>
              onChange(headers.filter((_2, rowIndex) => rowIndex !== index2))
            }
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button$1>
        </div>
      ))}
      <Button$1
        variant="outline"
        disabled={disabled2}
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
        {t2("settings.models.addHeader")}
      </Button$1>
      {headers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t2("settings.models.headersHelp")}
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
    headers: Object.keys(stored.headers ?? {}).map((name2) => ({
      name: name2,
      value: "",
      rowKey: crypto.randomUUID(),
    })),
  };
}

export function CustomProviderForm({ stored, onSave, onCancel }) {
  const { t: t2 } = useTranslation();
  const [value, setValue] = reactExports.useState(() => formValue(stored));
  const [showKey, setShowKey] = reactExports.useState(false);
  const [pending2, setPending] = reactExports.useState(false);
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
  const handleChange = (patch2) => {
    dirtyRef.current = true;
    setValue((current2) => ({
      ...current2,
      ...patch2,
    }));
    setError(void 0);
    setSaved(false);
  };
  const handleSave = async (clear = false) => {
    if (pending2) return;
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
                models: value.models.map((model, index2) => ({
                  ...model,
                  reasoningLevels: input.models[index2].reasoningLevels,
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
        setError(t2("settings.models.saveFailed"));
      }
    } catch {
      setError(t2("settings.models.saveFailed"));
    } finally {
      setPending(false);
    }
  };
  return (
    <div ref={formRef} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t2("settings.models.description")}
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-model-provider">
              {t2("settings.models.providerName")}
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
              disabled={pending2}
              autoComplete="off"
              placeholder={t2("settings.models.providerNamePlaceholder")}
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
              {t2("settings.models.protocol")}
            </Label>
            <Select$1
              value={value.protocol}
              disabled={pending2}
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
                  {t2(
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
                  {t2("settings.models.protocolAnthropic")}
                </SelectItem>
                <SelectItem
                  value="openai-compatible"
                  data-action-ui-id="settings-models.protocol-openai"
                >
                  {t2("settings.models.protocolOpenAI")}
                </SelectItem>
                <SelectItem
                  value="openai-responses"
                  data-action-ui-id="settings-models.protocol-responses"
                >
                  {t2("settings.models.protocolResponses")}
                </SelectItem>
              </SelectContent>
            </Select$1>
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
            {t2("settings.models.baseUrl")}
          </Label>
          <Input3
            id="custom-model-base-url"
            aria-invalid={Boolean(fieldErrors.baseUrl)}
            aria-describedby={
              fieldErrors.baseUrl ? "custom-model-base-url-error" : void 0
            }
            value={value.baseUrl}
            required={true}
            disabled={pending2}
            autoComplete="off"
            spellCheck={false}
            placeholder={t2("settings.models.baseUrlPlaceholder")}
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
            {t2("settings.models.apiKey")}
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
              disabled={pending2}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={t2(
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
            <Button$1
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              disabled={pending2}
              aria-label={t2(
                showKey ? "settings.models.hideKey" : "settings.models.showKey",
              )}
              data-action-ui-id="settings-models.toggle-key"
              onClick={() => setShowKey((current2) => !current2)}
            >
              {showKey ? (
                <EyeOff className="size-4" strokeWidth={1.5} />
              ) : (
                <Eye className="size-4" strokeWidth={1.5} />
              )}
            </Button$1>
          </div>
          <CustomModelFieldError
            id="custom-model-api-key"
            error={fieldErrors.apiKey}
          />
          <p
            id="custom-model-api-key-help"
            className="text-xs text-muted-foreground"
          >
            {t2("settings.models.apiKeyHelp")}
          </p>
        </div>
      </div>
      <CustomModelHeaders
        errors={fieldErrors}
        headers={value.headers ?? []}
        disabled={pending2}
        savedNames={Object.keys(stored?.headers ?? {})}
        onChange={(headers) =>
          handleChange({
            headers,
          })
        }
      />
      <div className="space-y-4">
        <CustomModelFieldError id="custom-models" error={fieldErrors.models} />
        {(value.models ?? []).map((model, index2) => (
          <CustomModelCard
            key={model.rowKey}
            errors={fieldErrors}
            model={model}
            index={index2}
            disabled={pending2}
            canRemove={(value.models?.length ?? 0) > 1}
            onChange={(next2) =>
              handleChange({
                models: value.models?.map((entry, entryIndex) =>
                  entryIndex === index2
                    ? {
                        ...next2,
                        rowKey: entry.rowKey,
                      }
                    : entry,
                ),
              })
            }
            onRemove={() =>
              handleChange({
                models: value.models?.filter(
                  (_2, entryIndex) => entryIndex !== index2,
                ),
              })
            }
          />
        ))}
        <Button$1
          variant="outline"
          disabled={pending2 || (value.models?.length ?? 0) >= 50}
          onClick={() =>
            handleChange({
              models: [...(value.models ?? []), newModel()],
            })
          }
          data-action-ui-id="settings-models.add-model"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          {t2("settings.models.addModel")}
        </Button$1>
      </div>
      <p className="text-xs text-muted-foreground">
        {t2("settings.models.applyHint")}
      </p>
      {error && !deleteOpen && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-xs text-muted-foreground">
          {t2("settings.models.saved")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button$1
          variant="outline"
          disabled={pending2}
          onClick={onCancel}
          data-action-ui-id="settings-models.cancel-provider"
        >
          {t2("common.cancel")}
        </Button$1>
        <Button$1
          disabled={pending2}
          onClick={() => void handleSave()}
          data-action-ui-id="settings-models.save"
        >
          {t2(pending2 ? "common.saving" : "common.save")}
        </Button$1>
        {stored && (
          <Button$1
            variant="outline"
            disabled={pending2}
            onClick={() => {
              setError(void 0);
              setDeleteOpen(true);
            }}
            data-action-ui-id="settings-models.clear"
          >
            {t2("settings.models.clear")}
          </Button$1>
        )}
      </div>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!pending2) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent size="sm" layer="nested">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("settings.models.deleteProviderTitle", {
                name:
                  stored?.providerName || t2("settings.models.customProvider"),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("settings.models.deleteProviderDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={pending2}
              data-action-ui-id="settings-models.cancel-delete-provider"
            >
              {t2("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending2}
              onClick={() => void handleSave(true)}
              data-action-ui-id="settings-models.confirm-delete-provider"
            >
              {t2(pending2 ? "common.deleting" : "common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
