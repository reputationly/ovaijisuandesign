// custom-connector-dialog.jsx
import {
  CUSTOM_MCP_NAME_MAX_LENGTH,
  CustomMcpCommandSyntaxError,
  CustomMcpValidationError,
  isReservedCustomMcpName,
  parseCustomMcpArguments,
} from "./parse-custom-mcp-arguments.js";
import { normalizeCustomMcpServerInput } from "./normalize-config.js";
import { normalizeCustomMcpLaunch } from "./normalize-custom-mcp-launch.js";
import { ChevronDown, reactExports, useTranslation } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Select } from "../assets/credit-query-keys.jsx";
import {
  Button,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  DialogDescription,
  DialogTitle,
  Textarea,
} from "../infra/badge-variants.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../workspace/shortcut-hint.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Switch } from "../generation/select-content.jsx";
import { ConnectorDialogFrame } from "./connector-dialog-frame.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
const VALIDATION_FIELDS = {
  name: {
    field: "name",
    messageKey: "connectors.customDialog.nameError",
  },
  command: {
    field: "command",
    messageKey: "connectors.customDialog.commandError",
  },
  args: {
    field: "arguments",
    messageKey: "connectors.customDialog.argumentsError",
  },
  url: {
    field: "url",
    messageKey: "connectors.customDialog.urlError",
  },
  description: {
    field: "description",
    messageKey: "connectors.customDialog.descriptionError",
  },
  env: {
    field: "key-values",
    messageKey: "connectors.customDialog.keyValuesError",
  },
  headers: {
    field: "key-values",
    messageKey: "connectors.customDialog.keyValuesError",
  },
  timeoutMs: {
    field: "timeout",
    messageKey: "connectors.customDialog.timeoutError",
  },
};
const COMMAND_ISSUE_KEYS = {
  unclosed_quote: "connectors.customDialog.unclosedQuoteError",
  shell_syntax: "connectors.customDialog.shellSyntaxError",
  ambiguous_executable: "connectors.customDialog.commandPathError",
};
function editorValidationError(error, entryName) {
  if (error instanceof CustomMcpCommandSyntaxError) {
    return {
      field: "arguments",
      messageKey: "connectors.customDialog.unclosedQuoteError",
    };
  }
  if (error instanceof CustomMcpValidationError && error.field) {
    if (error.commandIssue) {
      return {
        field: "command",
        messageKey: COMMAND_ISSUE_KEYS[error.commandIssue],
      };
    }
    if (error.field === "name" && isReservedCustomMcpName(entryName)) {
      return {
        field: "name",
        messageKey: "connectors.customDialog.error.reserved_name",
      };
    }
    return VALIDATION_FIELDS[error.field];
  }
  return {
    messageKey: "connectors.customDialog.error.invalid_config",
  };
}
const INITIAL_FORM_STATE = {
  name: "",
  transport: "stdio",
  command: "",
  argumentsText: "",
  url: "",
  description: "",
  enabled: true,
  keyValuesText: "",
  timeoutText: "",
};
const INITIAL_JSON = JSON.stringify(
  {
    "my-server": {
      transport: "stdio",
      command: "npx",
      args: ["-y", "@example/mcp-server"],
      enabled: true,
    },
  },
  null,
  2,
);
function parseEditorKeyValues(value) {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    if (Object.values(parsed).some((entry) => typeof entry !== "string"))
      return void 0;
    return parsed;
  } catch {
    return void 0;
  }
}
function normalizeEditorName(value) {
  return value.trim().replace(/\s+/gu, "-");
}
function validateEditorForm(state, existingName) {
  const keyValues = parseEditorKeyValues(state.keyValuesText);
  if (keyValues === void 0)
    return {
      error: VALIDATION_FIELDS.env,
    };
  const timeoutMs = state.timeoutText ? Number(state.timeoutText) : void 0;
  const common = {
    ...(state.description.trim()
      ? {
          description: state.description.trim(),
        }
      : {}),
    ...(timeoutMs !== void 0
      ? {
          timeoutMs,
        }
      : {}),
  };
  let args;
  try {
    args =
      state.transport === "stdio" && state.argumentsText.trim()
        ? parseCustomMcpArguments(state.argumentsText)
        : void 0;
  } catch (error) {
    return {
      error: editorValidationError(error, state.name),
    };
  }
  const candidate = {
    name: normalizeEditorName(state.name),
    enabled: state.enabled,
    config:
      state.transport === "stdio"
        ? {
            transport: "stdio",
            command: state.command,
            ...(args
              ? {
                  args,
                }
              : {}),
            ...(Object.keys(keyValues).length
              ? {
                  env: keyValues,
                }
              : {}),
            ...common,
          }
        : {
            transport: state.transport,
            url: state.url,
            ...(Object.keys(keyValues).length
              ? {
                  headers: keyValues,
                }
              : {}),
            ...common,
          },
  };
  try {
    return {
      input: normalizeCustomMcpServerInput(candidate, {
        source: candidate.name === existingName ? "update" : "create",
      }),
    };
  } catch (error) {
    return {
      error: editorValidationError(error, candidate.name),
    };
  }
}
function editorFormToInput(state) {
  return validateEditorForm(state).input;
}
function serializeDraftArguments(value) {
  try {
    return parseCustomMcpArguments(value);
  } catch {
    return value;
  }
}
function serializeEditorInput(input) {
  return JSON.stringify(
    {
      [input.name]: {
        ...input.config,
        enabled: input.enabled,
      },
    },
    null,
    2,
  );
}
function serializeEditorForm(state) {
  const input = editorFormToInput(state);
  if (input) return serializeEditorInput(input);
  const keyValues = parseEditorKeyValues(state.keyValuesText) ?? {};
  const config =
    state.transport === "stdio"
      ? {
          transport: state.transport,
          command: state.command.trim(),
          ...(state.argumentsText.trim()
            ? {
                args: serializeDraftArguments(state.argumentsText),
              }
            : {}),
          ...(Object.keys(keyValues).length
            ? {
                env: keyValues,
              }
            : {}),
        }
      : {
          transport: state.transport,
          url: state.url.trim(),
          ...(Object.keys(keyValues).length
            ? {
                headers: keyValues,
              }
            : {}),
        };
  return JSON.stringify(
    {
      [state.name.trim() || "my-server"]: {
        ...config,
        ...(state.description.trim()
          ? {
              description: state.description.trim(),
            }
          : {}),
        ...(state.timeoutText
          ? {
              timeoutMs: Number(state.timeoutText),
            }
          : {}),
        enabled: state.enabled,
      },
    },
    null,
    2,
  );
}
function formatEditorArguments(args) {
  return args
    .map((argument) =>
      /^[a-zA-Z0-9_@%+=:,./-]+$/u.test(argument)
        ? argument
        : `'${argument.replace(/'/gu, "'\\''")}'`,
    )
    .join(" ");
}
function normalizeEditorLaunchFields(state) {
  if (state.transport !== "stdio") return void 0;
  try {
    const launch = normalizeCustomMcpLaunch(
      state.command,
      state.argumentsText.trim()
        ? parseCustomMcpArguments(state.argumentsText)
        : void 0,
    );
    if (launch.command === state.command.trim()) return void 0;
    return {
      command: launch.command,
      argumentsText: formatEditorArguments(launch.args ?? []),
    };
  } catch {
    return void 0;
  }
}
function formatKeyValues(value) {
  return value && Object.keys(value).length
    ? JSON.stringify(value, null, 2)
    : "";
}
function editorInputToForm(input) {
  const { config } = input;
  return {
    name: input.name,
    transport: config.transport,
    command: config.transport === "stdio" ? config.command : "",
    argumentsText:
      config.transport === "stdio"
        ? formatEditorArguments(config.args ?? [])
        : "",
    url: config.transport === "stdio" ? "" : config.url,
    description: config.description ?? "",
    enabled: input.enabled,
    keyValuesText: formatKeyValues(
      config.transport === "stdio" ? config.env : config.headers,
    ),
    timeoutText: config.timeoutMs ? String(config.timeoutMs) : "",
  };
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function validateEditorJson(value, existingName) {
  const invalidJson = {
    error: {
      field: "json",
      messageKey: "connectors.customDialog.jsonError",
    },
  };
  let serverName = "";
  try {
    const parsed = JSON.parse(value);
    if (!isRecord(parsed)) return invalidJson;
    const source =
      Object.keys(parsed).length === 1 && isRecord(parsed.mcpServers)
        ? parsed.mcpServers
        : parsed;
    if (!isRecord(source)) return invalidJson;
    const entries = Object.entries(source);
    if (entries.length !== 1) return invalidJson;
    const entry = entries[0];
    if (!entry) return invalidJson;
    const [entryName, config] = entry;
    serverName = entryName;
    if (!isRecord(config)) return invalidJson;
    return {
      input: normalizeCustomMcpServerInput(
        {
          name: entryName,
          enabled: config.enabled ?? true,
          config: Object.fromEntries(
            Object.entries(config).filter(([key]) => key !== "enabled"),
          ),
        },
        {
          source: entryName === existingName ? "update" : "create",
        },
      ),
    };
  } catch (error) {
    return error instanceof CustomMcpValidationError
      ? {
          error: {
            ...editorValidationError(error, serverName),
            field: "json",
          },
        }
      : invalidJson;
  }
}
function parseEditorJson(value, existingName) {
  return validateEditorJson(value, existingName).input;
}
const MCP_TRANSPORT_LABELS = {
  stdio: "stdio",
  http: "HTTP",
  "streamable-http": "Streamable HTTP",
  sse: "SSE",
};
const FORM_OUTLINE_CLASS_NAME =
  "border border-input focus-visible:border-foreground focus-visible:ring-0";
const FORM_CONTROL_CLASS_NAME = `h-10 ${FORM_OUTLINE_CLASS_NAME}`;
const FORM_LABEL_CLASS_NAME = "text-sm font-medium text-foreground";
const HELPER_TEXT_CLASS_NAME =
  "text-[13px] leading-relaxed text-muted-foreground";
const SELECT_ITEM_CLASS_NAME =
  "h-8 rounded-sm py-2 pr-8 pl-3 text-sm font-normal text-foreground/70 focus:bg-popup-item-hover focus:text-foreground data-[highlighted]:bg-popup-item-hover data-[highlighted]:text-foreground";
export function CustomConnectorDialog({
  open,
  onOpenChange,
  onSubmit,
  onCreated,
  initialInput,
}) {
  const { t } = useTranslation();
  const [mode, setMode] = reactExports.useState("form");
  const [formState, setFormState] = reactExports.useState(INITIAL_FORM_STATE);
  const [jsonText, setJsonText] = reactExports.useState(INITIAL_JSON);
  const [advancedOpen, setAdvancedOpen] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [submitError, setSubmitError] = reactExports.useState();
  const [validationAttempted, setValidationAttempted] =
    reactExports.useState(false);
  const [focusTarget, setFocusTarget] = reactExports.useState();
  const [commandWasSplit, setCommandWasSplit] = reactExports.useState(false);
  const contentRef = reactExports.useRef(null);
  const busy = reactExports.useRef(false);
  const requestEpoch = reactExports.useRef(0);
  reactExports.useEffect(() => {
    requestEpoch.current += 1;
    busy.current = false;
    if (open) {
      setMode("form");
      setFormState(
        initialInput ? editorInputToForm(initialInput) : INITIAL_FORM_STATE,
      );
      setJsonText(
        initialInput ? serializeEditorInput(initialInput) : INITIAL_JSON,
      );
      setAdvancedOpen(false);
      setSubmitting(false);
      setSubmitError(void 0);
      setValidationAttempted(false);
      setFocusTarget(void 0);
      setCommandWasSplit(false);
    }
    return () => {
      requestEpoch.current += 1;
    };
  }, [open, initialInput]);
  const handleOpenChange = (nextOpen) => {
    if (!busy.current) onOpenChange(nextOpen);
  };
  const validation = reactExports.useMemo(
    () =>
      mode === "form"
        ? validateEditorForm(formState, initialInput?.name)
        : validateEditorJson(jsonText, initialInput?.name),
    [formState, jsonText, mode, initialInput?.name],
  );
  const { input } = validation;
  const validationError = validationAttempted ? validation.error : void 0;
  const nameLength = Array.from(normalizeEditorName(formState.name)).length;
  reactExports.useEffect(() => {
    if (!focusTarget) return;
    contentRef.current
      ?.querySelector(`#custom-connector-${focusTarget}`)
      ?.focus();
    setFocusTarget(void 0);
  }, [focusTarget]);
  const getFieldValidationProps = (field) => ({
    "aria-invalid": validationError?.field === field || void 0,
    "aria-describedby":
      validationError?.field === field
        ? `custom-connector-${field}-error`
        : field === "name"
          ? "custom-connector-name-hint custom-connector-name-count"
          : field === "command" || field === "arguments"
            ? "custom-connector-command-hint"
            : void 0,
  });
  const renderFieldError = (field) =>
    validationError?.field === field ? (
      <p
        id={`custom-connector-${field}-error`}
        className="text-xs text-destructive"
        role="alert"
      >
        {t(validationError.messageKey)}
      </p>
    ) : null;
  const handleModeChange = (nextMode) => {
    const editorMode = nextMode;
    if (editorMode === "json" && mode === "form") {
      setJsonText(serializeEditorForm(formState));
    } else if (editorMode === "form" && mode === "json") {
      const parsed = parseEditorJson(jsonText, initialInput?.name);
      if (parsed) setFormState(editorInputToForm(parsed));
    }
    setSubmitError(void 0);
    setValidationAttempted(false);
    setFocusTarget(void 0);
    setMode(editorMode);
  };
  const handleTransportChange = (value) => {
    if (!value) return;
    setFormState((current) => ({
      ...current,
      transport: value,
      keyValuesText: "",
    }));
  };
  const remote = formState.transport !== "stdio";
  const handleCommandBlur = () => {
    const normalized = normalizeEditorLaunchFields(formState);
    if (!normalized) return;
    setFormState((current) => ({
      ...current,
      ...normalized,
    }));
    setCommandWasSplit(true);
  };
  const handleSubmit = async () => {
    if (busy.current) return;
    setSubmitError(void 0);
    setValidationAttempted(true);
    if (!input) {
      const field = validation.error.field;
      if (field === "key-values" || field === "timeout") setAdvancedOpen(true);
      setFocusTarget(field);
      return;
    }
    if (initialInput && input.name !== initialInput.name) {
      setSubmitError(t("connectors.customDialog.nameLocked"));
      return;
    }
    busy.current = true;
    const epoch = requestEpoch.current;
    setSubmitting(true);
    setSubmitError(void 0);
    try {
      const result = await onSubmit(input);
      if (epoch !== requestEpoch.current) return;
      if (!result.ok) {
        setSubmitError(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onCreated?.(result);
      onOpenChange(false);
    } catch {
      if (epoch === requestEpoch.current) {
        setSubmitError(t("connectors.customDialog.error.requestFailed"));
      }
    } finally {
      if (epoch === requestEpoch.current) {
        busy.current = false;
        setSubmitting(false);
      }
    }
  };
  return (
    <ConnectorDialogFrame
      open={open}
      onOpenChange={handleOpenChange}
      actionUiId="custom-connector-dialog"
      closeLabel={t("common.close")}
      size="lg"
      showCloseButton={!submitting}
    >
      <fieldset disabled={submitting} className="contents">
        <div
          ref={contentRef}
          className="flex min-h-0 flex-1 flex-col px-6 pt-5 pb-3"
          data-layout-slot="custom-connector-dialog-body"
        >
          <DialogHeader className="mb-4 gap-1 pr-10">
            <DialogTitle className="text-base leading-5 text-foreground">
              {t(
                initialInput
                  ? "connectors.customDialog.editTitle"
                  : "connectors.customDialog.title",
              )}
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              {t(
                initialInput
                  ? "connectors.customDialog.editSubtitle"
                  : "connectors.customDialog.subtitle",
              )}
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={mode}
            onValueChange={handleModeChange}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <TabsList
              variant="track"
              className="w-60 self-start rounded-xl p-[3px] [--tabs-track-inset:3px]! [--tabs-track-radius:12px]!"
            >
              <TabsTrigger
                value="form"
                className="flex-1 font-normal text-muted-foreground transition-colors duration-200 data-[active]:font-medium data-[active]:text-foreground"
                data-action-ui-id="custom-connector-form-tab"
              >
                {t("connectors.customDialog.formTab")}
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="flex-1 font-normal text-muted-foreground transition-colors duration-200 data-[active]:font-medium data-[active]:text-foreground"
                data-action-ui-id="custom-connector-json-tab"
              >
                {t("connectors.customDialog.jsonTab")}
              </TabsTrigger>
            </TabsList>
            <div
              className="scrollbar-none min-h-0 overflow-y-auto pt-4"
              data-layout-slot="custom-connector-dialog-scroll"
            >
              <TabsContent value="form">
                <div className="flex flex-col gap-4">
                  <div
                    className="flex flex-col gap-4"
                    data-layout-slot="custom-connector-primary-fields"
                  >
                    <div
                      className="flex min-w-0 flex-col gap-2"
                      data-layout-slot="custom-connector-name-field"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor="custom-connector-name"
                          className={FORM_LABEL_CLASS_NAME}
                        >
                          {t("connectors.customDialog.name")}
                        </Label>
                        {!initialInput ? (
                          <span
                            id="custom-connector-name-count"
                            aria-live="polite"
                            className={`shrink-0 text-xs tabular-nums ${nameLength > CUSTOM_MCP_NAME_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                            data-action-ui-id="custom-connector-name-count"
                          >
                            {t("connectors.customDialog.nameCount", {
                              current: nameLength,
                              max: CUSTOM_MCP_NAME_MAX_LENGTH,
                            })}
                          </span>
                        ) : null}
                      </div>
                      <Input3
                        id="custom-connector-name"
                        {...getFieldValidationProps("name")}
                        value={formState.name}
                        readOnly={Boolean(initialInput)}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "connectors.customDialog.namePlaceholder",
                        )}
                        className={FORM_CONTROL_CLASS_NAME}
                        data-action-ui-id="custom-connector-name"
                      />
                      {renderFieldError("name")}
                      <p
                        id="custom-connector-name-hint"
                        className="text-xs leading-4 text-muted-foreground"
                      >
                        {t(
                          initialInput
                            ? "connectors.customDialog.nameLocked"
                            : "connectors.customDialog.nameHint",
                        )}
                      </p>
                    </div>
                    <div
                      className="flex min-w-0 flex-col gap-2"
                      data-layout-slot="custom-connector-transport-field"
                    >
                      <Label
                        htmlFor="custom-connector-transport"
                        className={FORM_LABEL_CLASS_NAME}
                      >
                        {t("connectors.customDialog.transport")}
                      </Label>
                      <Select
                        value={formState.transport}
                        onValueChange={handleTransportChange}
                      >
                        <SelectTrigger
                          id="custom-connector-transport"
                          className={`${FORM_CONTROL_CLASS_NAME} w-full bg-transparent! text-sm font-normal hover:bg-transparent! data-[size=default]:h-10`}
                          data-action-ui-id="custom-connector-transport"
                        >
                          <SelectValue>
                            {() => MCP_TRANSPORT_LABELS[formState.transport]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" className="p-1">
                          {Object.entries(MCP_TRANSPORT_LABELS).map(
                            ([value, label]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className={SELECT_ITEM_CLASS_NAME}
                              >
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {remote ? (
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label
                        htmlFor="custom-connector-url"
                        className={FORM_LABEL_CLASS_NAME}
                      >
                        {t("connectors.customDialog.url")}
                      </Label>
                      <Input3
                        id="custom-connector-url"
                        {...getFieldValidationProps("url")}
                        value={formState.url}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            url: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "connectors.customDialog.urlPlaceholder",
                        )}
                        className={FORM_CONTROL_CLASS_NAME}
                        data-action-ui-id="custom-connector-url"
                      />
                      {renderFieldError("url")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex min-w-0 flex-col gap-2">
                        <Label
                          htmlFor="custom-connector-command"
                          className={FORM_LABEL_CLASS_NAME}
                        >
                          {t("connectors.customDialog.command")}
                        </Label>
                        <Input3
                          id="custom-connector-command"
                          {...getFieldValidationProps("command")}
                          value={formState.command}
                          onChange={(event) => {
                            setCommandWasSplit(false);
                            setFormState((current) => ({
                              ...current,
                              command: event.target.value,
                            }));
                          }}
                          onBlur={handleCommandBlur}
                          placeholder={t(
                            "connectors.customDialog.commandPlaceholder",
                          )}
                          className={FORM_CONTROL_CLASS_NAME}
                          data-action-ui-id="custom-connector-command"
                        />
                        {renderFieldError("command")}
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <Label
                          htmlFor="custom-connector-arguments"
                          className={FORM_LABEL_CLASS_NAME}
                        >
                          {t("connectors.customDialog.arguments")}
                        </Label>
                        <Input3
                          id="custom-connector-arguments"
                          {...getFieldValidationProps("arguments")}
                          value={formState.argumentsText}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              argumentsText: event.target.value,
                            }))
                          }
                          placeholder={t(
                            "connectors.customDialog.argumentsPlaceholder",
                          )}
                          className={FORM_CONTROL_CLASS_NAME}
                          data-action-ui-id="custom-connector-arguments"
                        />
                        {renderFieldError("arguments")}
                      </div>
                      <p
                        id="custom-connector-command-hint"
                        className={`${HELPER_TEXT_CLASS_NAME} sm:col-span-2`}
                        aria-live="polite"
                      >
                        {t(
                          commandWasSplit
                            ? "connectors.customDialog.commandSplitHint"
                            : "connectors.customDialog.commandHint",
                        )}
                      </p>
                      <p className={`${HELPER_TEXT_CLASS_NAME} sm:col-span-2`}>
                        {t("connectors.customDialog.stdioRisk")}
                      </p>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label
                      htmlFor="custom-connector-description"
                      className={FORM_LABEL_CLASS_NAME}
                    >
                      {t("connectors.customDialog.description")}
                    </Label>
                    <Input3
                      id="custom-connector-description"
                      {...getFieldValidationProps("description")}
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t(
                        "connectors.customDialog.descriptionPlaceholder",
                      )}
                      className={FORM_CONTROL_CLASS_NAME}
                      data-action-ui-id="custom-connector-description"
                    />
                    {renderFieldError("description")}
                  </div>
                  <div
                    className="flex min-h-16 items-center justify-between gap-4 rounded-lg bg-secondary/60 px-4 py-3"
                    data-layout-slot="custom-connector-enabled-surface"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t(
                          initialInput
                            ? "connectors.customDialog.enabledAfterSave"
                            : "connectors.customDialog.enabled",
                        )}
                      </p>
                      <p className={`mt-0.5 ${HELPER_TEXT_CLASS_NAME}`}>
                        {t("connectors.customDialog.enabledHint")}
                      </p>
                    </div>
                    <Switch
                      checked={formState.enabled}
                      onCheckedChange={(enabled) =>
                        setFormState((current) => ({
                          ...current,
                          enabled,
                        }))
                      }
                      aria-label={t(
                        initialInput
                          ? "connectors.customDialog.enabledAfterSave"
                          : "connectors.customDialog.enabled",
                      )}
                      data-action-ui-id="custom-connector-enabled"
                    />
                  </div>
                  <button
                    type="button"
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((current) => !current)}
                    className="flex h-9 w-full items-center justify-between rounded-md text-left text-sm font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                    data-action-ui-id="custom-connector-advanced"
                  >
                    <span>{t("connectors.customDialog.advanced")}</span>
                    <Icon
                      icon={ChevronDown}
                      size="md"
                      aria-hidden={true}
                      className={`text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {advancedOpen ? (
                    <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                      <div className="flex min-w-0 flex-col gap-2 sm:col-span-2">
                        <Label
                          htmlFor="custom-connector-key-values"
                          className={FORM_LABEL_CLASS_NAME}
                        >
                          {t(
                            remote
                              ? "connectors.customDialog.headers"
                              : "connectors.customDialog.environment",
                          )}
                        </Label>
                        <Textarea
                          id="custom-connector-key-values"
                          {...getFieldValidationProps("key-values")}
                          value={formState.keyValuesText}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              keyValuesText: event.target.value,
                            }))
                          }
                          placeholder={t(
                            "connectors.customDialog.keyValuesPlaceholder",
                          )}
                          className={`min-h-24 font-mono text-xs ${FORM_OUTLINE_CLASS_NAME}`}
                          data-action-ui-id="custom-connector-key-values"
                        />
                        {renderFieldError("key-values")}
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <Label
                          htmlFor="custom-connector-timeout"
                          className={FORM_LABEL_CLASS_NAME}
                        >
                          {t("connectors.customDialog.timeout")}
                        </Label>
                        <Input3
                          id="custom-connector-timeout"
                          {...getFieldValidationProps("timeout")}
                          type="number"
                          min={1}
                          value={formState.timeoutText}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              timeoutText: event.target.value,
                            }))
                          }
                          placeholder={t(
                            "connectors.customDialog.timeoutPlaceholder",
                          )}
                          className={FORM_CONTROL_CLASS_NAME}
                          data-action-ui-id="custom-connector-timeout"
                        />
                        {renderFieldError("timeout")}
                      </div>
                    </div>
                  ) : null}
                </div>
              </TabsContent>
              <TabsContent value="json">
                <div className="flex flex-col gap-3">
                  <p className={HELPER_TEXT_CLASS_NAME}>
                    {t("connectors.customDialog.jsonHint")}
                  </p>
                  <Textarea
                    id="custom-connector-json"
                    {...getFieldValidationProps("json")}
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    aria-label={t("connectors.customDialog.jsonEditorLabel")}
                    spellCheck={false}
                    className={`min-h-80 resize-none font-mono text-xs leading-relaxed ${FORM_OUTLINE_CLASS_NAME}`}
                    data-action-ui-id="custom-connector-json-editor"
                  />
                  {renderFieldError("json")}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </fieldset>
      <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 px-6 pb-5">
        {submitError || (validationError && !validationError.field) ? (
          <p className="mr-auto text-xs text-destructive" role="alert">
            {submitError ?? (validationError && t(validationError.messageKey))}
          </p>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="h-9 min-w-22 rounded-[10px] px-4"
          disabled={submitting}
          onClick={() => handleOpenChange(false)}
          data-action-ui-id="custom-connector-cancel"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          className="h-9 min-w-26 rounded-[10px] px-4"
          disabled={submitting}
          loading={submitting}
          onClick={handleSubmit}
          data-action-ui-id="custom-connector-submit"
        >
          {t(
            initialInput
              ? "connectors.customDialog.save"
              : "connectors.customDialog.add",
          )}
        </Button>
      </DialogFooter>
    </ConnectorDialogFrame>
  );
}
