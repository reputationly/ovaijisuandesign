// custom-provider-form.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useAuth,
  reactExports,
  isElectron,
  useQuery,
  useQueryClient,
  useStorage,
  storageKeys,
  usePlatform,
  getSystemTheme,
  resolveTheme,
  applyClass,
  ThemeCtx,
  useRuntimeConfig,
  openExternalUrl,
  HardDrive,
  Popover,
  X$7,
  PopoverTrigger,
  ChevronDown,
  RotateCcw,
  Trash2,
  Plus,
  Select$1,
  EyeOff,
  Eye,
  useNavigate,
  getRuntimeConfig,
  Sparkles,
  ArrowUpRight,
  Cable,
  DialogBackdrop,
  DialogPopup,
  DialogClose$1,
  XIcon,
  DialogTitle$2,
  DialogDescription$2,
  useOptionalUpdaterContext,
  useIsScrolling,
  DialogPortal,
  ChevronLeftIcon,
  IPC_CHANNELS,
  SettingsDialogCtx,
  projectLog,
  workspaceInventoryPathKey,
  retainCompleteWorkspaceCatalog,
  useNewProjectFolder,
  useProjectStore,
  createProjectOperationId,
  logProjectOperationAttempt,
  dedupeProjectName,
  checkTextSafety,
  logProjectOperationFailure,
  logProjectOperationBlocked,
  createCloudProject,
  cloudStatus,
  cloudErrorDisplayMessage,
  logProjectOperationSuccess,
  normalizeProjectName,
  hasProjectNameConflict,
  renameCloudProject,
  deleteCloudProject,
  CloudProjectRequestError,
  hideProjectId,
  restoreProjectId,
  listCloudProjects,
  acceptProjectInvite,
} from "../vendor.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Checkbox,
  Button$1,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  cn$2,
  dialogChromeButtonClassName,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import {
  Input3,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../asset-center/shared/select-content.jsx";
import { SettingRow } from "../m09/auth-provider.jsx";
import {
  instantiationService,
  StrokeIcon,
  IProjectMainService,
} from "../m08/browser-inspiration-urls.jsx";
import { getDesignDownloadUrl } from "../m08/shortcut-categories.jsx";
import { isCustomModelProvider } from "../m01/myers-line-hunks.js";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MemorySection, SECTIONS, SoftwareUpdateSection } from "./compact-rewrite-flow.jsx";
import {
  AccountSection,
  NetworkSection,
  getDesktopSettingsMainService,
} from "./delete-account-confirm-dialog.jsx";
import { ImBridgeSection, SettingsPanelHeaderProvider } from "./im-bridge-manager.jsx";
import {
  AssetCenterSection,
  ComfyUiSection,
  GeneralSection,
} from "./use-asset-center-settings.jsx";
import { useSettings } from "./use-data-directory.js";
import { DataDirectorySettings } from "./use-media-actions.jsx";
import { AdvancedSection, getUpdateSettingsBadgeLabel } from "./use-update-actions.jsx";
export function ThemeProvider({ children: children2 }) {
  const { config: config2, set: set2 } = useSettings();
  const theme2 = config2.theme ?? "system";
  const [systemTheme, setSystemTheme] = reactExports.useState(getSystemTheme);
  const resolved = theme2 === "system" ? systemTheme : resolveTheme(theme2);
  const setTheme = reactExports.useCallback(
    (next2) => {
      void set2("theme", next2);
    },
    [set2],
  );
  reactExports.useEffect(() => {
    applyClass(resolved);
  }, [resolved]);
  reactExports.useEffect(() => {
    if (theme2 !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mq.matches ? "dark" : "light");
    const handler = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme2]);
  const value = reactExports.useMemo(
    () => ({
      theme: theme2,
      resolved,
      setTheme,
    }),
    [theme2, resolved, setTheme],
  );
  return <ThemeCtx value={value}>{children2}</ThemeCtx>;
}
function InstallLocationSettings() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { region } = useRuntimeConfig();
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const { data: info2 } = useQuery({
    queryKey: ["settings", "install-location"],
    queryFn: () => getDesktopSettingsMainService().getInstallLocationInfo(),
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (!info2?.supported) return null;
  const handleDownload = () => {
    setDialogOpen(false);
    void openExternalUrl(platform2, getDesignDownloadUrl(region), {
      source: "settings-install-location",
    });
  };
  return (
    <>
      <SettingRow
        label={t2("settings.storage.installLocation")}
        description={
          info2.isDefaultLocation ? t2("settings.storage.installLocationDefault") : info2.installDir
        }
      >
        <Button$1
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          onClick={() => setDialogOpen(true)}
          data-action-ui-id="settings-storage-change-install-location"
        >
          <HardDrive size={14} strokeWidth={1.5} />
          {t2("settings.storage.changeInstallLocation")}
        </Button$1>
      </SettingRow>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="sm" data-action-ui-id="settings-install-location-dialog">
          <DialogHeader>
            <DialogTitle>{t2("settings.storage.changeInstallLocation")}</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">{t2("settings.storage.changeInstallLocationSteps")}</span>
              <span className="block text-xs text-muted-foreground">
                {t2("settings.storage.changeInstallLocationSafety")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button$1 variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              {t2("common.cancel")}
            </Button$1>
            <Button$1
              size="sm"
              onClick={handleDownload}
              data-action-ui-id="settings-install-location-download"
            >
              {t2("settings.storage.goToDownload")}
            </Button$1>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function StorageSection() {
  if (!isElectron()) return null;
  return (
    <>
      <DataDirectorySettings />
      <InstallLocationSettings />
    </>
  );
}
function getCustomModelProviders(config2) {
  const providers = config2.customModels ?? {};
  if (Object.keys(providers).some((id2) => !isCustomModelProvider(id2)))
    throw new Error("Invalid custom provider identity");
  return providers;
}
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
  if (!["openai-compatible", "anthropic", "openai-responses"].includes(value.protocol))
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
  if (typeof value.apiKey !== "string" || /[\r\n]/.test(value.apiKey)) errors.apiKey = "apiKey";
  else if (!value.apiKey.trim() && !stored?.apiKey) errors.apiKey = "required";
  const ids2 = new Map();
  if (!Array.isArray(value.models) || !value.models.length || value.models.length > 50)
    errors.models = "modelCount";
  for (const [index2, model] of (Array.isArray(value.models) ? value.models : []).entries()) {
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
    if (!Number.isSafeInteger(model.maxOutputTokens) || model.maxOutputTokens <= 0)
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
  if (value.headers !== void 0 && !Array.isArray(value.headers)) errors.headers = "headerName";
  for (const [index2, header] of (Array.isArray(value.headers) ? value.headers : []).entries()) {
    const prefix = `headers.${index2}`;
    if (!header) {
      errors[`${prefix}.name`] = "headerName";
      continue;
    }
    const name2 = typeof header.name === "string" ? header.name.trim().toLowerCase() : "";
    if (
      !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name2) ||
      ["host", "content-length", "connection", "transfer-encoding", "upgrade"].includes(name2)
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
          saved.toLowerCase() === name2 && typeof value2 === "string" && value2.length > 0,
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
            <Badge key={level} variant="secondary" className="h-6 max-w-full gap-1 rounded-full">
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
            placeholder={levels.length ? void 0 : t2("settings.models.reasoningPlaceholder")}
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
                  checked ? [...levels, level] : levels.filter((item) => item !== level),
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
            aria-describedby={errors[`models.${index2}.id`] ? `${prefix}-id-error` : void 0}
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
          <CustomModelFieldError id={`${prefix}-id`} error={errors[`models.${index2}.id`]} />
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
                errors[`models.${index2}.contextWindow`] ? `${prefix}-context-error` : void 0
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
                errors[`models.${index2}.maxOutputTokens`] ? `${prefix}-output-error` : void 0
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
          <Label htmlFor={`${prefix}-reasoning`}>{t2("settings.models.reasoningLevels")}</Label>
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
function CustomModelHeaders({ headers, errors = {}, disabled: disabled2, savedNames, onChange }) {
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
                errors[`headers.${index2}.name`] ? `custom-header-name-${index2}-error` : void 0
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
                  (name2) => name2.toLowerCase() === header.name.trim().toLowerCase(),
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
                errors[`headers.${index2}.value`] ? `custom-header-value-${index2}-error` : void 0
              }
              type="password"
              value={header.value}
              required={
                !savedNames.some(
                  (name2) => name2.toLowerCase() === header.name.trim().toLowerCase(),
                )
              }
              disabled={disabled2}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={
                savedNames.some((name2) => name2.toLowerCase() === header.name.trim().toLowerCase())
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
            onClick={() => onChange(headers.filter((_2, rowIndex) => rowIndex !== index2))}
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
        <p className="text-xs text-muted-foreground">{t2("settings.models.headersHelp")}</p>
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
function CustomProviderForm({ stored, onSave, onCancel }) {
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
    models: value.models.map(({ rowKey: _rowKey, reasoningDraft, ...model }) => ({
      ...model,
      reasoningLevels: [
        ...new Set([
          ...model.reasoningLevels,
          ...(reasoningDraft.trim() ? [reasoningDraft.trim()] : []),
        ]),
      ],
    })),
    headers: value.headers.map(({ rowKey: _rowKey, ...header }) => header),
  };
  const fieldErrors = submitted ? getCustomModelValidationErrors(input, stored) : {};
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
      <p className="text-xs text-muted-foreground">{t2("settings.models.description")}</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-model-provider">{t2("settings.models.providerName")}</Label>
            <Input3
              id="custom-model-provider"
              aria-invalid={Boolean(fieldErrors.providerName)}
              aria-describedby={fieldErrors.providerName ? "custom-model-provider-error" : void 0}
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
            <CustomModelFieldError id="custom-model-provider" error={fieldErrors.providerName} />
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
                aria-describedby={fieldErrors.protocol ? "custom-model-protocol-error" : void 0}
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
            <CustomModelFieldError id="custom-model-protocol" error={fieldErrors.protocol} />
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
            aria-describedby={fieldErrors.baseUrl ? "custom-model-base-url-error" : void 0}
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
          <CustomModelFieldError id="custom-model-base-url" error={fieldErrors.baseUrl} />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="custom-model-api-key"
            className={
              !stored?.apiKey ? "gap-1 after:text-destructive after:content-['*']" : void 0
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
              aria-label={t2(showKey ? "settings.models.hideKey" : "settings.models.showKey")}
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
          <CustomModelFieldError id="custom-model-api-key" error={fieldErrors.apiKey} />
          <p id="custom-model-api-key-help" className="text-xs text-muted-foreground">
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
                models: value.models?.filter((_2, entryIndex) => entryIndex !== index2),
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
      <p className="text-xs text-muted-foreground">{t2("settings.models.applyHint")}</p>
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
                name: stored?.providerName || t2("settings.models.customProvider"),
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
const DREAMINA_SKILL_NAME = "dreamina-cli";
const LIBTV_CONNECTOR_ID = "libtv";
function CustomModelSection() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const { closeSettings } = useSettingsDialog();
  const { config: config2, saveCustomModel } = useSettings();
  const isOverseas = getRuntimeConfig().region === "overseas";
  const providers = getCustomModelProviders(config2);
  const [editing, setEditing] = reactExports.useState(null);
  const [communityOpen, setCommunityOpen] = reactExports.useState(false);
  if (editing !== null) {
    return (
      <CustomProviderForm
        key={editing ?? "new"}
        stored={editing ? providers[editing] : void 0}
        onCancel={() => setEditing(null)}
        onSave={async (input) => {
          const success = await saveCustomModel(input, editing);
          if (success) setEditing(null);
          return success;
        }}
      />
    );
  }
  const handleOpenDreaminaSkill = () => {
    closeSettings();
    void navigate({
      to: "/skills",
      search: {
        capability: "skills",
        tab: "community",
        skillName: DREAMINA_SKILL_NAME,
      },
    });
  };
  const handleOpenLibtvConnector = () => {
    closeSettings();
    void navigate({
      to: "/skills",
      search: {
        capability: "connectors",
        connectorId: LIBTV_CONNECTOR_ID,
      },
    });
  };
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted-foreground">
        {t2(
          isOverseas
            ? "settings.models.description.overseas"
            : "settings.models.description.domestic",
        )}{" "}
        {!isOverseas ? (
          <Button$1
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => setCommunityOpen(true)}
            data-action-ui-id="settings-models.open-community-generation"
          >
            {t2("settings.models.community.entry")}
          </Button$1>
        ) : null}
      </p>
      <Button$1
        variant="outline"
        onClick={() => setEditing(void 0)}
        data-action-ui-id="settings-models.add-provider"
      >
        <Plus className="size-4" strokeWidth={1.5} />
        {t2("settings.models.addProvider")}
      </Button$1>
      <div className="space-y-2">
        {Object.entries(providers).map(([id2, provider]) => (
          <div key={id2} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">
                {provider.providerName || t2("settings.models.customProvider")}
              </p>
              <p className="truncate text-xs text-muted-foreground">{provider.baseUrl}</p>
              <p className="text-xs text-muted-foreground">
                {t2("settings.models.modelCount", {
                  count: provider.models.length,
                })}
              </p>
            </div>
            <Button$1
              variant="outline"
              size="sm"
              onClick={() => setEditing(id2)}
              aria-label={t2("settings.models.editProviderNamed", {
                name: provider.providerName || t2("settings.models.customProvider"),
              })}
              data-action-ui-id="settings-models.edit-provider"
              data-provider-id={id2}
            >
              {t2("settings.models.editProvider")}
            </Button$1>
          </div>
        ))}
      </div>
      {!isOverseas ? (
        <Dialog open={communityOpen} onOpenChange={setCommunityOpen}>
          <DialogContent size="md" layer="nested">
            <DialogHeader>
              <DialogTitle>{t2("settings.models.community.title")}</DialogTitle>
              <DialogDescription>{t2("settings.models.community.description")}</DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <div className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t2("settings.models.community.dreamina.title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t2("settings.models.community.dreamina.meta")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t2("settings.models.community.dreamina.description")}
                  </p>
                </div>
                <Button$1
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDreaminaSkill}
                  data-action-ui-id="settings-models.open-dreamina-skill"
                >
                  {t2("settings.models.community.dreamina.action")}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                </Button$1>
              </div>
              <div className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Cable size={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t2("settings.models.community.libtv.title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t2("settings.models.community.libtv.meta")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t2("settings.models.community.libtv.description")}
                  </p>
                </div>
                <Button$1
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenLibtvConnector}
                  data-action-ui-id="settings-models.open-libtv-connector"
                >
                  {t2("settings.models.community.libtv.action")}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                </Button$1>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
const SECTION_COMPONENTS = {
  general: GeneralSection,
  account: AccountSection,
  storage: StorageSection,
  network: NetworkSection,
  models: CustomModelSection,
  memory: MemorySection,
  imBridge: ImBridgeSection,
  assetCenter: AssetCenterSection,
  comfyui: ComfyUiSection,
  advanced: AdvancedSection,
  softwareUpdate: SoftwareUpdateSection,
};
function resolveSectionLabelKey(section, region) {
  return typeof section.labelKey === "function" ? section.labelKey(region) : section.labelKey;
}
function SettingsDialog({ open, onOpenChange, initialSection = "general" }) {
  const { t: t2 } = useTranslation();
  const updater = useOptionalUpdaterContext();
  const isOverseas = getRuntimeConfig().region === "overseas";
  const regionSuffix = isOverseas ? "overseas" : "domestic";
  const initialActiveSection =
    isOverseas && initialSection === "imBridge" ? "general" : initialSection;
  const [activeSection, setActiveSection] = reactExports.useState(initialActiveSection);
  const updateBadgeLabel = getUpdateSettingsBadgeLabel(updater?.state.phase, t2);
  const activeSectionMeta = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const [headerOverride, setHeaderOverride] = reactExports.useState(null);
  const contentScrollRef = reactExports.useRef(null);
  const isSecondaryPage = Boolean(headerOverride?.onBack);
  const previousSecondaryPageRef = reactExports.useRef(isSecondaryPage);
  const [contentMotion, setContentMotion] = reactExports.useState("none");
  const isContentScrolling = useIsScrolling({
    scrollRef: contentScrollRef,
  });
  reactExports.useEffect(() => {
    if (open) {
      setActiveSection(initialActiveSection);
      setHeaderOverride(null);
    }
  }, [initialActiveSection, open]);
  reactExports.useEffect(() => {
    if (previousSecondaryPageRef.current === isSecondaryPage) return;
    setContentMotion(isSecondaryPage ? "forward" : "back");
    previousSecondaryPageRef.current = isSecondaryPage;
    const timer2 = window.setTimeout(() => setContentMotion("none"), 180);
    return () => window.clearTimeout(timer2);
  }, [isSecondaryPage]);
  const SectionComponent = reactExports.useMemo(
    () => SECTION_COMPONENTS[activeSection],
    [activeSection],
  );
  const activeSectionLabel = t2(resolveSectionLabelKey(activeSectionMeta, regionSuffix));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop
          data-slot="dialog-overlay"
          className="modal-mask fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPopup
          data-action-ui-id="settings-dialog"
          className="elevated-surface-border fixed top-1/2 left-1/2 z-50 flex h-[min(620px,80vh)] w-full max-w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-modal-shell p-1 text-popover-foreground shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [&_[data-slot=button]]:rounded-md [&_[data-slot=input]]:rounded-md [&_[data-slot=select-trigger]]:rounded-md"
        >
          <DialogDescription$2 className="sr-only">{t2("settings.title")}</DialogDescription$2>
          <aside className="flex w-52 shrink-0 flex-col rounded-md p-2">
            <div className="px-2 pb-4">
              <DialogTitle$2 className="pt-4 font-heading text-sm font-normal text-muted-foreground">
                {t2("settings.title")}
              </DialogTitle$2>
            </div>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((section) => {
                const Icon2 = section.icon;
                const isActive2 = activeSection === section.id;
                const isImBridgeDisabled = isOverseas && section.id === "imBridge";
                return (
                  <button
                    key={section.id}
                    type="button"
                    data-action-ui-id={`settings-${section.id}`}
                    disabled={isImBridgeDisabled}
                    title={isImBridgeDisabled ? t2("common.comingSoon") : void 0}
                    onClick={() => {
                      if (isImBridgeDisabled) return;
                      setHeaderOverride(null);
                      setActiveSection(section.id);
                    }}
                    className={cn$2(
                      "list-row-hit-area [--list-row-gap:4px] first:before:top-0 last:before:bottom-0 flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-normal transition-colors",
                      isActive2
                        ? "bg-foreground/[0.06] text-foreground"
                        : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
                      "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60",
                      isImBridgeDisabled && "hover:bg-transparent hover:text-muted-foreground",
                    )}
                  >
                    <Icon2 size={16} strokeWidth={1.5} className="shrink-0 text-current" />
                    <span className="min-w-0 flex-1 truncate">
                      {t2(resolveSectionLabelKey(section, regionSuffix))}
                    </span>
                    {section.id === "softwareUpdate" && updateBadgeLabel && (
                      <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-brand-accent px-1.5 text-[10px] font-medium leading-none text-brand-accent-foreground">
                        {updateBadgeLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
          <section className="ml-2 flex min-w-0 flex-1 flex-col rounded-lg bg-modal-content">
            <div className="relative h-16 shrink-0 px-5">
              {headerOverride?.onBack && (
                <Button$1
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className={`absolute top-4 left-3 size-11 ${dialogChromeButtonClassName}`}
                  onClick={headerOverride.onBack}
                  disabled={headerOverride.backDisabled}
                  data-action-ui-id="settings-dialog.back"
                >
                  <StrokeIcon icon={ChevronLeftIcon} size={24} />
                  <span className="sr-only">{headerOverride.backLabel ?? t2("common.back")}</span>
                </Button$1>
              )}
              <h2
                className={cn$2(
                  "min-w-0 truncate pt-6 pr-16 font-heading text-lg font-medium text-foreground",
                  headerOverride?.onBack && "pl-10",
                )}
              >
                {headerOverride?.title ?? activeSectionLabel}
              </h2>
              <DialogClose$1
                render={
                  <Button$1
                    variant="ghost"
                    size="icon-lg"
                    className={`absolute top-1 right-1 size-11 ${dialogChromeButtonClassName}`}
                    data-action-ui-id="settings-dialog.close"
                  />
                }
              >
                <StrokeIcon icon={XIcon} size={24} />
                <span className="sr-only">{t2("common.close")}</span>
              </DialogClose$1>
            </div>
            <div
              ref={contentScrollRef}
              data-action-ui-id="settings-dialog.content-scroll"
              data-scrolling={isContentScrolling ? "true" : void 0}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1.5 mr-0.5 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/0! [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-300! [&::-webkit-scrollbar-thumb]:ease-in-out! [&[data-scrolling=true]::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!"
            >
              <div
                className={cn$2(
                  "px-5 pt-1 pb-5",
                  contentMotion !== "none" && "duration-150 animate-in fade-in-0",
                  contentMotion === "forward" && "slide-in-from-right-4",
                  contentMotion === "back" && "slide-in-from-left-4",
                )}
              >
                <SettingsPanelHeaderProvider setHeaderOverride={setHeaderOverride}>
                  <SectionComponent />
                </SettingsPanelHeaderProvider>
              </div>
            </div>
          </section>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
export function SettingsDialogProvider({ children: children2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const [initialSection, setInitialSection] = reactExports.useState("general");
  const { isLoggedIn } = useAuth();
  const openSettings = reactExports.useCallback((section) => {
    setInitialSection(section ?? "general");
    setOpen(true);
  }, []);
  const closeSettings = reactExports.useCallback(() => {
    setOpen(false);
  }, []);
  reactExports.useEffect(() => {
    if (!isLoggedIn) setOpen(false);
  }, [isLoggedIn]);
  reactExports.useEffect(() => {
    if (!window.hilo?.ipcRenderer) return;
    const off = window.hilo.ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_SETTINGS, () => {
      openSettings();
    });
    return off;
  }, [openSettings]);
  const value = reactExports.useMemo(
    () => ({
      open,
      openSettings,
      closeSettings,
    }),
    [open, openSettings, closeSettings],
  );
  return (
    <SettingsDialogCtx value={value}>
      {children2}
      <SettingsDialog open={open} onOpenChange={setOpen} initialSection={initialSection} />
    </SettingsDialogCtx>
  );
}
export function useSettingsDialog() {
  const ctx = reactExports.useContext(SettingsDialogCtx);
  if (!ctx) throw new Error("useSettingsDialog must be used within SettingsDialogProvider");
  return ctx;
}
export function useOptionalSettingsDialog() {
  return reactExports.useContext(SettingsDialogCtx);
}
export function logProjectOperationCanceled(action, operationId, startedAt, reason, meta2) {
  projectLog.info(`${action} canceled`, {
    operationId,
    reason,
    durationMs: Date.now() - startedAt,
    ...meta2,
  });
}
export function reorderVisibleRecentWorkspaces(
  visibleWorkspaces,
  activePath,
  overPath,
  dropPosition,
) {
  const ordered = [...visibleWorkspaces];
  const fromIndex = ordered.findIndex((workspace) => workspace.path === activePath);
  const toIndex = ordered.findIndex((workspace) => workspace.path === overPath);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return ordered;
  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return ordered;
  if (dropPosition) {
    const targetIndex = ordered.findIndex((workspace) => workspace.path === overPath);
    const insertionIndex = targetIndex + (dropPosition === "after" ? 1 : 0);
    ordered.splice(insertionIndex, 0, moved);
  } else {
    ordered.splice(toIndex, 0, moved);
  }
  return ordered.map((workspace, index2) => ({
    ...workspace,
    manualOrder: index2,
  }));
}
export function persistVisibleWorkspaceManualOrder(
  latestInventory,
  reorderedVisibleWorkspaces,
  caseInsensitive,
) {
  const latestByPath = new Map(
    latestInventory.map((item) => [
      workspaceInventoryPathKey(item.workspace.path, caseInsensitive),
      item.workspace,
    ]),
  );
  const orderedKeys = [];
  const seen2 = new Set();
  for (const workspace of reorderedVisibleWorkspaces) {
    const key2 = workspaceInventoryPathKey(workspace.path, caseInsensitive);
    if (seen2.has(key2) || !latestByPath.has(key2)) continue;
    seen2.add(key2);
    orderedKeys.push(key2);
  }
  const unranked = latestInventory.flatMap((item) => {
    const key2 = workspaceInventoryPathKey(item.workspace.path, caseInsensitive);
    if (seen2.has(key2)) return [];
    const { manualOrder: _manualOrder, ...workspace } = item.workspace;
    return [workspace];
  });
  const ranked = orderedKeys.flatMap((key2, manualOrder) => {
    const workspace = latestByPath.get(key2);
    return workspace
      ? [
          {
            ...workspace,
            manualOrder,
          },
        ]
      : [];
  });
  return retainCompleteWorkspaceCatalog([...unranked, ...ranked]);
}
export function useProjectActions(options = {}) {
  const [parentFolderPath] = useNewProjectFolder();
  const {
    allProjects: projects,
    caseInsensitive,
    hiddenProjectIds,
    setHiddenProjectIdsAsync,
  } = useProjectStore(options);
  const [, , setGlobalConfigAsync] = useStorage("global.config", options);
  const queryClient2 = useQueryClient();
  const service2 = reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IProjectMainService)),
    [],
  );
  const refreshProjects = reactExports.useCallback(
    async () =>
      queryClient2.invalidateQueries({
        queryKey: storageKeys.global("projects"),
      }),
    [queryClient2],
  );
  const createProject = reactExports.useCallback(
    async (name2, kind) => {
      const operationId = createProjectOperationId("create-project");
      const startedAt = logProjectOperationAttempt("create-project", operationId, {
        kind,
      });
      const uniqueName = dedupeProjectName(projects, name2);
      let safety;
      try {
        safety = await checkTextSafety(uniqueName);
      } catch (error) {
        logProjectOperationFailure("create-project", operationId, startedAt, "text-safety", error, {
          kind,
        });
        throw error;
      }
      if (!safety.pass) {
        logProjectOperationBlocked(
          "create-project",
          operationId,
          startedAt,
          "text-safety",
          "safety-blocked",
          {
            kind,
            decision: safety.decision,
          },
        );
        return {
          safetyBlocked: true,
          errorMessageKey: "rename.safetyBlocked",
        };
      }
      let remoteId;
      if (kind === "team") {
        try {
          const cloud = await createCloudProject(uniqueName);
          remoteId = cloud.id;
        } catch (err) {
          logProjectOperationFailure(
            "create-project",
            operationId,
            startedAt,
            "cloud-create",
            err,
            {
              kind,
              status: cloudStatus(err),
            },
          );
          return {
            errorMessage: cloudErrorDisplayMessage(err),
          };
        }
      }
      let stage = "local-persist";
      try {
        const entry = await service2.createProject({
          name: uniqueName,
          kind,
          remoteId,
          ...(kind === "local" && parentFolderPath
            ? {
                parentFolderPath,
              }
            : {}),
        });
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("create-project", operationId, startedAt, {
          projectId: entry.id,
          kind,
          remoteId,
        });
        return {
          project: entry,
        };
      } catch (error) {
        logProjectOperationFailure("create-project", operationId, startedAt, stage, error, {
          kind,
        });
        throw error;
      }
    },
    [parentFolderPath, projects, refreshProjects, service2],
  );
  const renameProject = reactExports.useCallback(
    async (project2, name2) => {
      const operationId = createProjectOperationId("rename-project");
      const startedAt = logProjectOperationAttempt("rename-project", operationId, {
        projectId: project2.id,
        kind: project2.kind,
      });
      const normalizedName = normalizeProjectName(name2);
      if (!normalizedName) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "empty-name",
          {
            projectId: project2.id,
          },
        );
        return {};
      }
      let safety;
      try {
        safety = await checkTextSafety(normalizedName);
      } catch (error) {
        logProjectOperationFailure("rename-project", operationId, startedAt, "text-safety", error, {
          projectId: project2.id,
        });
        throw error;
      }
      if (!safety.pass) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "text-safety",
          "safety-blocked",
          {
            projectId: project2.id,
            kind: project2.kind,
            decision: safety.decision,
          },
        );
        return {
          safetyBlocked: true,
          errorMessageKey: "rename.safetyBlocked",
        };
      }
      if (hasProjectNameConflict(projects, project2.id, normalizedName)) {
        logProjectOperationBlocked(
          "rename-project",
          operationId,
          startedAt,
          "validation",
          "project-name-conflict",
          {
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-name-conflict",
        };
      }
      if (project2.kind === "team" && project2.remoteId) {
        try {
          await renameCloudProject(project2.remoteId, normalizedName);
        } catch (err) {
          logProjectOperationFailure(
            "rename-project",
            operationId,
            startedAt,
            "cloud-rename",
            err,
            {
              projectId: project2.id,
              remoteId: project2.remoteId,
              status: cloudStatus(err),
            },
          );
          return {
            errorMessage: cloudErrorDisplayMessage(err),
            errorCode: "cloud-request-failed",
          };
        }
      }
      let stage = "local-persist";
      try {
        await service2.renameProject(project2.id, normalizedName);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("rename-project", operationId, startedAt, {
          projectId: project2.id,
          kind: project2.kind,
        });
        return {};
      } catch (error) {
        logProjectOperationFailure("rename-project", operationId, startedAt, stage, error, {
          projectId: project2.id,
        });
        throw error;
      }
    },
    [projects, refreshProjects, service2],
  );
  const deleteProject = reactExports.useCallback(
    async (project2) => {
      const operationId = createProjectOperationId("dissolve-project");
      const startedAt = logProjectOperationAttempt("dissolve-project", operationId, {
        projectId: project2.id,
        kind: project2.kind,
      });
      let hasActiveTransfers;
      try {
        hasActiveTransfers = await service2.hasActiveProjectTransfers(project2.id);
      } catch (error) {
        logProjectOperationFailure(
          "dissolve-project",
          operationId,
          startedAt,
          "active-transfer-check",
          error,
          {
            projectId: project2.id,
          },
        );
        throw error;
      }
      if (hasActiveTransfers) {
        logProjectOperationBlocked(
          "dissolve-project",
          operationId,
          startedAt,
          "active-transfer-check",
          "project-transfer-active",
          {
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-transfer-active",
        };
      }
      if (project2.kind === "team" && project2.remoteId) {
        try {
          await deleteCloudProject(project2.remoteId);
        } catch (err) {
          if (err instanceof CloudProjectRequestError && err.status === 404) {
            projectLog.info("dissolve-project cloud already absent", {
              operationId,
              projectId: project2.id,
              remoteId: project2.remoteId,
            });
          } else {
            logProjectOperationFailure(
              "dissolve-project",
              operationId,
              startedAt,
              "cloud-delete",
              err,
              {
                projectId: project2.id,
                remoteId: project2.remoteId,
                status: cloudStatus(err),
              },
            );
            return {
              errorMessage: cloudErrorDisplayMessage(err),
              errorCode: "cloud-request-failed",
            };
          }
        }
      }
      const hidden = await setHiddenProjectIdsAsync((current2) =>
        hideProjectId(current2, project2.id),
      );
      if (!hidden) {
        logProjectOperationFailure(
          "dissolve-project",
          operationId,
          startedAt,
          "local-hide",
          {
            code: "project-hide-failed",
          },
          {
            projectId: project2.id,
          },
        );
        return {
          errorCode: "project-hide-failed",
        };
      }
      logProjectOperationSuccess("dissolve-project", operationId, startedAt, {
        projectId: project2.id,
        kind: project2.kind,
        remoteId: project2.remoteId,
        workspaceCount: project2.workspacePaths.length,
      });
      void setGlobalConfigAsync((previous2) => {
        const pinned = previous2.pinnedProjectIds ?? [];
        if (!pinned.includes(project2.id)) return previous2;
        return {
          ...previous2,
          pinnedProjectIds: pinned.filter((id2) => id2 !== project2.id),
        };
      });
      return {};
    },
    [service2, setGlobalConfigAsync, setHiddenProjectIdsAsync],
  );
  const restoreProjectVisibility = reactExports.useCallback(
    async (projectId) => {
      if (!hiddenProjectIds.includes(projectId)) return true;
      return setHiddenProjectIdsAsync((current2) => restoreProjectId(current2, projectId));
    },
    [hiddenProjectIds, setHiddenProjectIdsAsync],
  );
  const addWorkspaceToProject = reactExports.useCallback(
    async (workspacePath, projectId, source) => {
      const operationId = createProjectOperationId("add-workspace-to-project");
      const startedAt = logProjectOperationAttempt("add-workspace-to-project", operationId, {
        path: workspacePath,
        projectId,
        source: source ?? "unknown",
      });
      let stage = "local-persist";
      try {
        await service2.assignWorkspace(workspacePath, projectId, caseInsensitive);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("add-workspace-to-project", operationId, startedAt, {
          projectId,
          source: source ?? "unknown",
        });
      } catch (error) {
        logProjectOperationFailure(
          "add-workspace-to-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            projectId,
            source: source ?? "unknown",
          },
        );
        throw error;
      }
    },
    [caseInsensitive, refreshProjects, service2],
  );
  const removeWorkspaceFromProject = reactExports.useCallback(
    async (workspacePath, source) => {
      const operationId = createProjectOperationId("remove-workspace-from-project");
      const startedAt = logProjectOperationAttempt("remove-workspace-from-project", operationId, {
        path: workspacePath,
        source: source ?? "unknown",
      });
      let stage = "local-persist";
      try {
        await service2.detachWorkspace(workspacePath, caseInsensitive);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("remove-workspace-from-project", operationId, startedAt, {
          source: source ?? "unknown",
        });
      } catch (error) {
        logProjectOperationFailure(
          "remove-workspace-from-project",
          operationId,
          startedAt,
          stage,
          error,
          {
            source: source ?? "unknown",
          },
        );
        throw error;
      }
    },
    [caseInsensitive, refreshProjects, service2],
  );
  const reorderProject = reactExports.useCallback(
    async (sourceId, targetId, position2) => {
      await service2.reorderProject(sourceId, targetId, position2);
      await refreshProjects().catch(() => {
        projectLog.warn("Project reorder committed; storage cache refresh incomplete");
      });
    },
    [service2, refreshProjects],
  );
  const moveWorkspace = reactExports.useCallback(
    async (input) => {
      await service2.moveWorkspace(input);
      const refreshes = await Promise.allSettled(
        ["projects", "recentWorkspaces", "config"].map((field) =>
          queryClient2.invalidateQueries({
            queryKey: storageKeys.global(field),
          }),
        ),
      );
      if (refreshes.some((result) => result.status === "rejected")) {
        projectLog.warn("Workspace move committed; storage cache refresh incomplete");
      }
    },
    [service2, queryClient2],
  );
  const syncCloudProjects = reactExports.useCallback(async () => {
    const operationId = createProjectOperationId("sync-cloud-projects");
    const startedAt = logProjectOperationAttempt("sync-cloud-projects", operationId);
    let cloudProjects;
    try {
      cloudProjects = await listCloudProjects();
    } catch (err) {
      logProjectOperationFailure("sync-cloud-projects", operationId, startedAt, "cloud-list", err, {
        status: cloudStatus(err),
      });
      return null;
    }
    let stage = "local-merge";
    try {
      await service2.mergeCloudProjects(cloudProjects);
      stage = "renderer-refresh";
      await refreshProjects();
      logProjectOperationSuccess("sync-cloud-projects", operationId, startedAt, {
        cloudCount: cloudProjects.length,
      });
      return cloudProjects;
    } catch (error) {
      logProjectOperationFailure("sync-cloud-projects", operationId, startedAt, stage, error, {
        cloudCount: cloudProjects.length,
      });
      throw error;
    }
  }, [refreshProjects, service2]);
  const acceptProjectInviteToken = reactExports.useCallback(
    async (token2) => {
      const operationId = createProjectOperationId("accept-project-invite");
      const startedAt = logProjectOperationAttempt("accept-project-invite", operationId);
      let cloud;
      try {
        cloud = await acceptProjectInvite(token2);
      } catch (err) {
        logProjectOperationFailure(
          "accept-project-invite",
          operationId,
          startedAt,
          "cloud-accept",
          err,
          {
            status: cloudStatus(err),
          },
        );
        return {
          errorMessage: cloudErrorDisplayMessage(err),
        };
      }
      let stage = "local-upsert";
      try {
        const projectId = await service2.upsertCloudProject(cloud);
        stage = "renderer-refresh";
        await refreshProjects();
        logProjectOperationSuccess("accept-project-invite", operationId, startedAt, {
          remoteId: cloud.id,
          projectId,
        });
        return {
          projectId,
        };
      } catch (error) {
        logProjectOperationFailure("accept-project-invite", operationId, startedAt, stage, error, {
          remoteId: cloud.id,
        });
        throw error;
      }
    },
    [refreshProjects, service2],
  );
  const ensureProjectFolderName = reactExports.useCallback(
    async (projectId) => {
      const resolved = await service2.getProjectFolderName(projectId);
      return resolved;
    },
    [service2],
  );
  const provisionSampleProject = reactExports.useCallback(
    async (input) => {
      const project2 = await service2.provisionSampleProject({
        ...input,
        kind: "local",
        caseInsensitive,
      });
      await refreshProjects();
      return project2;
    },
    [caseInsensitive, refreshProjects, service2],
  );
  return {
    createProject,
    renameProject,
    deleteProject,
    restoreProjectVisibility,
    addWorkspaceToProject,
    removeWorkspaceFromProject,
    reorderProject,
    moveWorkspace,
    syncCloudProjects,
    acceptProjectInviteToken,
    ensureProjectFolderName,
    provisionSampleProject,
  };
}
