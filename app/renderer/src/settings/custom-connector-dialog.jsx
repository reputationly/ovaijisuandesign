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
function editorValidationError(error, name2) {
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
    if (error.field === "name" && isReservedCustomMcpName(name2)) {
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
function validateEditorForm(state2, existingName) {
  const keyValues = parseEditorKeyValues(state2.keyValuesText);
  if (keyValues === void 0)
    return {
      error: VALIDATION_FIELDS.env,
    };
  const timeoutMs = state2.timeoutText ? Number(state2.timeoutText) : void 0;
  const common2 = {
    ...(state2.description.trim()
      ? {
          description: state2.description.trim(),
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
      state2.transport === "stdio" && state2.argumentsText.trim()
        ? parseCustomMcpArguments(state2.argumentsText)
        : void 0;
  } catch (error) {
    return {
      error: editorValidationError(error, state2.name),
    };
  }
  const candidate = {
    name: normalizeEditorName(state2.name),
    enabled: state2.enabled,
    config:
      state2.transport === "stdio"
        ? {
            transport: "stdio",
            command: state2.command,
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
            ...common2,
          }
        : {
            transport: state2.transport,
            url: state2.url,
            ...(Object.keys(keyValues).length
              ? {
                  headers: keyValues,
                }
              : {}),
            ...common2,
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
function editorFormToInput(state2) {
  return validateEditorForm(state2).input;
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
function serializeEditorForm(state2) {
  const input = editorFormToInput(state2);
  if (input) return serializeEditorInput(input);
  const keyValues = parseEditorKeyValues(state2.keyValuesText) ?? {};
  const config2 =
    state2.transport === "stdio"
      ? {
          transport: state2.transport,
          command: state2.command.trim(),
          ...(state2.argumentsText.trim()
            ? {
                args: serializeDraftArguments(state2.argumentsText),
              }
            : {}),
          ...(Object.keys(keyValues).length
            ? {
                env: keyValues,
              }
            : {}),
        }
      : {
          transport: state2.transport,
          url: state2.url.trim(),
          ...(Object.keys(keyValues).length
            ? {
                headers: keyValues,
              }
            : {}),
        };
  return JSON.stringify(
    {
      [state2.name.trim() || "my-server"]: {
        ...config2,
        ...(state2.description.trim()
          ? {
              description: state2.description.trim(),
            }
          : {}),
        ...(state2.timeoutText
          ? {
              timeoutMs: Number(state2.timeoutText),
            }
          : {}),
        enabled: state2.enabled,
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
function normalizeEditorLaunchFields(state2) {
  if (state2.transport !== "stdio") return void 0;
  try {
    const launch = normalizeCustomMcpLaunch(
      state2.command,
      state2.argumentsText.trim()
        ? parseCustomMcpArguments(state2.argumentsText)
        : void 0,
    );
    if (launch.command === state2.command.trim()) return void 0;
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
  const { config: config2 } = input;
  return {
    name: input.name,
    transport: config2.transport,
    command: config2.transport === "stdio" ? config2.command : "",
    argumentsText:
      config2.transport === "stdio"
        ? formatEditorArguments(config2.args ?? [])
        : "",
    url: config2.transport === "stdio" ? "" : config2.url,
    description: config2.description ?? "",
    enabled: input.enabled,
    keyValuesText: formatKeyValues(
      config2.transport === "stdio" ? config2.env : config2.headers,
    ),
    timeoutText: config2.timeoutMs ? String(config2.timeoutMs) : "",
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
    const entries2 = Object.entries(source);
    if (entries2.length !== 1) return invalidJson;
    const entry = entries2[0];
    if (!entry) return invalidJson;
    const [name2, config2] = entry;
    serverName = name2;
    if (!isRecord(config2)) return invalidJson;
    return {
      input: normalizeCustomMcpServerInput(
        {
          name: name2,
          enabled: config2.enabled ?? true,
          config: Object.fromEntries(
            Object.entries(config2).filter(([key2]) => key2 !== "enabled"),
          ),
        },
        {
          source: name2 === existingName ? "update" : "create",
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
  const { t: t2 } = useTranslation();
  const [mode2, setMode] = reactExports.useState("form");
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
      mode2 === "form"
        ? validateEditorForm(formState, initialInput?.name)
        : validateEditorJson(jsonText, initialInput?.name),
    [formState, jsonText, mode2, initialInput?.name],
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
        {t2(validationError.messageKey)}
      </p>
    ) : null;
  const handleModeChange = (nextMode) => {
    const editorMode = nextMode;
    if (editorMode === "json" && mode2 === "form") {
      setJsonText(serializeEditorForm(formState));
    } else if (editorMode === "form" && mode2 === "json") {
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
    setFormState((current2) => ({
      ...current2,
      transport: value,
      keyValuesText: "",
    }));
  };
  const remote = formState.transport !== "stdio";
  const handleCommandBlur = () => {
    const normalized = normalizeEditorLaunchFields(formState);
    if (!normalized) return;
    setFormState((current2) => ({
      ...current2,
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
      setSubmitError(t2("connectors.customDialog.nameLocked"));
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
        setSubmitError(t2(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onCreated?.(result);
      onOpenChange(false);
    } catch {
      if (epoch === requestEpoch.current) {
        setSubmitError(t2("connectors.customDialog.error.requestFailed"));
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
      closeLabel={t2("common.close")}
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
              {t2(
                initialInput
                  ? "connectors.customDialog.editTitle"
                  : "connectors.customDialog.title",
              )}
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              {t2(
                initialInput
                  ? "connectors.customDialog.editSubtitle"
                  : "connectors.customDialog.subtitle",
              )}
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={mode2}
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
                {t2("connectors.customDialog.formTab")}
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="flex-1 font-normal text-muted-foreground transition-colors duration-200 data-[active]:font-medium data-[active]:text-foreground"
                data-action-ui-id="custom-connector-json-tab"
              >
                {t2("connectors.customDialog.jsonTab")}
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
                          {t2("connectors.customDialog.name")}
                        </Label>
                        {!initialInput ? (
                          <span
                            id="custom-connector-name-count"
                            aria-live="polite"
                            className={`shrink-0 text-xs tabular-nums ${nameLength > CUSTOM_MCP_NAME_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                            data-action-ui-id="custom-connector-name-count"
                          >
                            {t2("connectors.customDialog.nameCount", {
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
                          setFormState((current2) => ({
                            ...current2,
                            name: event.target.value,
                          }))
                        }
                        placeholder={t2(
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
                        {t2(
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
                        {t2("connectors.customDialog.transport")}
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
                        {t2("connectors.customDialog.url")}
                      </Label>
                      <Input3
                        id="custom-connector-url"
                        {...getFieldValidationProps("url")}
                        value={formState.url}
                        onChange={(event) =>
                          setFormState((current2) => ({
                            ...current2,
                            url: event.target.value,
                          }))
                        }
                        placeholder={t2(
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
                          {t2("connectors.customDialog.command")}
                        </Label>
                        <Input3
                          id="custom-connector-command"
                          {...getFieldValidationProps("command")}
                          value={formState.command}
                          onChange={(event) => {
                            setCommandWasSplit(false);
                            setFormState((current2) => ({
                              ...current2,
                              command: event.target.value,
                            }));
                          }}
                          onBlur={handleCommandBlur}
                          placeholder={t2(
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
                          {t2("connectors.customDialog.arguments")}
                        </Label>
                        <Input3
                          id="custom-connector-arguments"
                          {...getFieldValidationProps("arguments")}
                          value={formState.argumentsText}
                          onChange={(event) =>
                            setFormState((current2) => ({
                              ...current2,
                              argumentsText: event.target.value,
                            }))
                          }
                          placeholder={t2(
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
                        {t2(
                          commandWasSplit
                            ? "connectors.customDialog.commandSplitHint"
                            : "connectors.customDialog.commandHint",
                        )}
                      </p>
                      <p className={`${HELPER_TEXT_CLASS_NAME} sm:col-span-2`}>
                        {t2("connectors.customDialog.stdioRisk")}
                      </p>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label
                      htmlFor="custom-connector-description"
                      className={FORM_LABEL_CLASS_NAME}
                    >
                      {t2("connectors.customDialog.description")}
                    </Label>
                    <Input3
                      id="custom-connector-description"
                      {...getFieldValidationProps("description")}
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current2) => ({
                          ...current2,
                          description: event.target.value,
                        }))
                      }
                      placeholder={t2(
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
                        {t2(
                          initialInput
                            ? "connectors.customDialog.enabledAfterSave"
                            : "connectors.customDialog.enabled",
                        )}
                      </p>
                      <p className={`mt-0.5 ${HELPER_TEXT_CLASS_NAME}`}>
                        {t2("connectors.customDialog.enabledHint")}
                      </p>
                    </div>
                    <Switch
                      checked={formState.enabled}
                      onCheckedChange={(enabled) =>
                        setFormState((current2) => ({
                          ...current2,
                          enabled,
                        }))
                      }
                      aria-label={t2(
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
                    onClick={() => setAdvancedOpen((current2) => !current2)}
                    className="flex h-9 w-full items-center justify-between rounded-md text-left text-sm font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                    data-action-ui-id="custom-connector-advanced"
                  >
                    <span>{t2("connectors.customDialog.advanced")}</span>
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
                          {t2(
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
                            setFormState((current2) => ({
                              ...current2,
                              keyValuesText: event.target.value,
                            }))
                          }
                          placeholder={t2(
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
                          {t2("connectors.customDialog.timeout")}
                        </Label>
                        <Input3
                          id="custom-connector-timeout"
                          {...getFieldValidationProps("timeout")}
                          type="number"
                          min={1}
                          value={formState.timeoutText}
                          onChange={(event) =>
                            setFormState((current2) => ({
                              ...current2,
                              timeoutText: event.target.value,
                            }))
                          }
                          placeholder={t2(
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
                    {t2("connectors.customDialog.jsonHint")}
                  </p>
                  <Textarea
                    id="custom-connector-json"
                    {...getFieldValidationProps("json")}
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    aria-label={t2("connectors.customDialog.jsonEditorLabel")}
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
            {submitError ?? (validationError && t2(validationError.messageKey))}
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
          {t2("common.cancel")}
        </Button>
        <Button
          type="button"
          className="h-9 min-w-26 rounded-[10px] px-4"
          disabled={submitting}
          loading={submitting}
          onClick={handleSubmit}
          data-action-ui-id="custom-connector-submit"
        >
          {t2(
            initialInput
              ? "connectors.customDialog.save"
              : "connectors.customDialog.add",
          )}
        </Button>
      </DialogFooter>
    </ConnectorDialogFrame>
  );
}
