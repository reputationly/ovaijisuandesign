// connector-hub-o-auth-section.jsx
import { jsxRuntimeExports, reactExports, useTranslation, usePlatform, ArrowUpRight, localizedI18nText } from "../vendor.js";
import { openExternalUrl, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Button$1 } from "../infra/use-browser-overlay-dialog-props.jsx";
import { homeService } from "../workspace/browser-inspiration-urls.jsx";
import { Label } from "../team/infinite-scroll-container.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ConnectorConsentNote,
  ConnectorDialogActions,
  ConnectorDialogError,
  ConnectorDialogIntro,
  ConnectorDialogShell,
  buildPlainConnectorInput,
  connectorTitle,
  useConnectorCopy,
} from "./connector-cli-auth-section.jsx";
function isRequiredInputSatisfied(input, value, normalize2 = (raw2) => raw2.trim()) {
  const normalized = normalize2(value);
  if (normalized.length === 0) return false;
  if (!input.pattern) return true;
  try {
    return new RegExp(input.pattern).test(normalized);
  } catch {
    return false;
  }
}
function ConnectorRequiredInputFields({
  connectorId,
  requiredInputs,
  values: values3,
  disabled: disabled2,
  normalize: normalize2,
  onChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const language2 = i18n?.language ?? "en";
  return (
    <>
      {requiredInputs.map((field) => {
        const value = values3[field.key] ?? "";
        const invalid2 =
          value.trim().length > 0 && !isRequiredInputSatisfied(field, value, normalize2);
        const fieldId = `connectors-${connectorId}-${field.key}`;
        return (
          <div key={field.key}>
            <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
              {localizedI18nText(field.label, language2)}
            </Label>
            <Input3
              id={fieldId}
              type="text"
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              disabled={disabled2}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={invalid2}
              aria-required="true"
              {...(field.placeholder
                ? {
                    placeholder: field.placeholder,
                  }
                : {})}
              className="mt-1.5 h-10 rounded-lg bg-card"
              data-action-ui-id={fieldId}
            />
            {invalid2 ? (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                {field.patternMessage
                  ? localizedI18nText(field.patternMessage, language2)
                  : t2("connectors.oauth.invalidInput")}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
async function installStagedConnector(connectorId, serverName) {
  const install = await homeService.connector.install(connectorId);
  if (!install.ok)
    return {
      ok: false,
      code: install.code,
    };
  const servers = await homeService.customMcp.list().catch(() => []);
  const installed = servers.find(
    (server) =>
      server.name.toLowerCase() === serverName.toLowerCase() && server.transport === "stdio",
  );
  return {
    ok: true,
    result: {
      ok: true,
      server: installed ?? {
        name: serverName,
        enabled: true,
        transport: "stdio",
        runtimeState: "connected",
      },
      runtime: {
        state: installed?.runtimeState ?? "connected",
        connectedRuntimes: 0,
        failedRuntimes: 0,
      },
    },
  };
}
export function ConnectorHubOAuthSection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onCreated,
  onBusyChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const connectorId = manifest.connectorId;
  const language2 = i18n?.language ?? "en";
  const profile = manifest.auth.kind === "hubOAuthProfile" ? manifest.auth.profile : void 0;
  const serverName = manifest.capabilities.mcp?.serverName ?? connectorId;
  const requiredInputs = profile?.requiredInputs ?? [];
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "oauth");
  const [values3, setValues] = reactExports.useState({});
  const [pending2, setPending] = reactExports.useState(false);
  const [cancelling, setCancelling] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const mounted = reactExports.useRef(true);
  const started = reactExports.useRef(false);
  const touched = reactExports.useRef(false);
  const cancelled = reactExports.useRef(false);
  const inputsReady = requiredInputs.every((input) =>
    isRequiredInputSatisfied(input, values3[input.key] ?? ""),
  );
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (touched.current)
        void homeService.customMcp.cancelAuthorization(serverName).catch(() => void 0);
    };
  }, [serverName]);
  const close2 = async () => {
    if (cancelling) return;
    cancelled.current = true;
    setCancelling(true);
    onBusyChange?.(true);
    try {
      if (touched.current) {
        const result = await homeService.customMcp.cancelAuthorization(serverName);
        if (result.ok) {
          onCreated(result);
          if (result.runtime.failedRuntimes > 0) throw new Error("Disconnect failed");
        } else if (result.code !== "server_not_found") throw new Error("Cancel failed");
      }
      started.current = false;
      touched.current = false;
      onClose();
    } catch {
      if (!touched.current) {
        started.current = false;
        onClose();
        return;
      }
      if (mounted.current) {
        setCancelling(false);
        onBusyChange?.(false);
        setError(t2("connectors.oauth.cancelFailed"));
      }
    }
  };
  const authorize = async () => {
    if (started.current || !inputsReady) return;
    started.current = true;
    touched.current = true;
    cancelled.current = false;
    setPending(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const input =
        requiredInputs.length === 0
          ? void 0
          : Object.fromEntries(
              requiredInputs.map((field) => [field.key, (values3[field.key] ?? "").trim()]),
            );
      const result = await homeService.customMcp.authorize(serverName, input);
      if (cancelled.current || !mounted.current) return;
      if (!result.ok) {
        if (result.code === "authorization_busy") touched.current = false;
        setError(t2(`connectors.customDialog.error.${result.code}`));
        return;
      }
      const install = await installStagedConnector(connectorId, serverName);
      if (cancelled.current || !mounted.current) return;
      touched.current = false;
      if (!install.ok) {
        setError(
          t2(`connectors.connector.error.${install.code}`, {
            name: connectorTitle(t2, language2, connectorId, manifest.displayName),
          }),
        );
        return;
      }
      onCreated(install.result);
      started.current = false;
      onClose();
    } catch {
      if (mounted.current && !cancelled.current)
        setError(t2("connectors.customDialog.error.authorization_failed"));
    } finally {
      if (!cancelled.current) started.current = false;
      if (mounted.current) {
        setPending(false);
        if (!cancelled.current) onBusyChange?.(false);
      }
    }
  };
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!cancelling}
      onRequestClose={() => void close2()}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          <div className="-mx-3 rounded-[10px] bg-secondary/60 px-3 py-3">
            {requiredInputs.length > 0 ? (
              <div
                className="mb-3 flex flex-col gap-3"
                data-layout-slot="connector-oauth-required-inputs"
              >
                <ConnectorRequiredInputFields
                  connectorId={connectorId}
                  requiredInputs={requiredInputs}
                  values={values3}
                  disabled={pending2 || cancelling}
                  onChange={(key2, value) => {
                    setValues((current2) => ({
                      ...current2,
                      [key2]: value,
                    }));
                    setError(void 0);
                  }}
                />
              </div>
            ) : null}
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t2("connectors.oauth.instructions")}
            </p>
            <ConnectorConsentNote text={copy2("consent")} className="mt-3" />
            {pending2 ? (
              <p role="status" className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {t2("connectors.oauth.waiting")}
              </p>
            ) : null}
            {error ? <ConnectorDialogError message={error} /> : null}
          </div>
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2("common.cancel")}
          cancelDisabled={cancelling}
          onCancel={() => void close2()}
        >
          <Button$1
            type="button"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={pending2 || cancelling || !inputsReady}
            loading={pending2}
            onClick={() => void authorize()}
            data-action-ui-id={`connectors-${connectorId}-authorize`}
          >
            {t2(pending2 ? "connectors.detail.connecting" : "connectors.oauth.connect")}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
function normalizeHostInput(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}
function isValidSecret(value) {
  const secret = value.trim();
  return secret.length > 0 && secret.length <= 512 && /^[\x21-\x7e]+$/.test(secret);
}
export function ConnectorManualCredentialSection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onCreated,
  onBusyChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const connectorId = manifest.connectorId;
  const language2 = i18n?.language ?? "en";
  const profile = manifest.auth.kind === "hubOAuthProfile" ? manifest.auth.profile : void 0;
  const manual = profile?.flow?.manual;
  const serverName = manifest.capabilities.mcp?.serverName ?? connectorId;
  const requiredInputs = profile?.requiredInputs ?? [];
  const docsUrl = profile?.flow?.docsUrl;
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "manual");
  const manualCopy = (key2) => {
    const override = manual?.copy?.[key2];
    return override ? localizedI18nText(override, language2) : copy2(key2);
  };
  const modes = manual?.modes ?? [];
  const [mode2, setMode] = reactExports.useState(modes[0] ?? "clientCredentials");
  const [values3, setValues] = reactExports.useState({});
  const [clientId, setClientId] = reactExports.useState("");
  const [clientSecret, setClientSecret] = reactExports.useState("");
  const [accessToken, setAccessToken] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const mounted = reactExports.useRef(true);
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const inputsReady = requiredInputs.every((input) =>
    isRequiredInputSatisfied(input, values3[input.key] ?? "", normalizeHostInput),
  );
  const credentialsReady =
    mode2 === "accessToken"
      ? isValidSecret(accessToken)
      : isValidSecret(clientId) && isValidSecret(clientSecret);
  const otherMode = modes.find((candidate) => candidate !== mode2);
  const connect = async () => {
    if (pending2 || !inputsReady || !credentialsReady) return;
    setPending(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const input = Object.fromEntries(
        requiredInputs.map((field) => [field.key, normalizeHostInput(values3[field.key] ?? "")]),
      );
      if (mode2 === "accessToken") {
        input.access_token = accessToken.trim();
      } else {
        input.client_id = clientId.trim();
        input.client_secret = clientSecret.trim();
      }
      const staged = await homeService.customMcp.connectManual(serverName, input);
      if (!mounted.current) return;
      if (!staged.ok) {
        setError(t2(`connectors.customDialog.error.${staged.code}`));
        return;
      }
      const finalized = await installStagedConnector(connectorId, serverName);
      if (!mounted.current) return;
      if (!finalized.ok) {
        setError(
          t2(`connectors.connector.error.${finalized.code}`, {
            name: connectorTitle(t2, language2, connectorId, manifest.displayName),
          }),
        );
        return;
      }
      onCreated(finalized.result);
      onClose();
    } catch {
      if (mounted.current) setError(t2("connectors.customDialog.error.authorization_failed"));
    } finally {
      if (mounted.current) {
        setPending(false);
        onBusyChange?.(false);
      }
    }
  };
  const secretField = (id2, label, placeholder, value, onChange, masked) => (
    <div>
      <Label htmlFor={id2} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Input3
        id={id2}
        type={masked ? "password" : "text"}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setError(void 0);
        }}
        disabled={pending2}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-required="true"
        {...(placeholder
          ? {
              placeholder,
            }
          : {})}
        className="mt-1.5 h-10 rounded-lg bg-card"
        data-action-ui-id={id2}
      />
    </div>
  );
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!pending2}
      onRequestClose={onClose}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={manualCopy("title")}
          description={manualCopy("description")}
        >
          <div className="-mx-3 flex flex-col gap-3 rounded-[10px] bg-secondary/60 px-3 py-3">
            {manual?.steps?.length ? (
              <div>
                <ol
                  className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted-foreground"
                  data-layout-slot="connector-manual-steps"
                >
                  {manual.steps.map((step) => (
                    <li key={step.text.en}>{localizedI18nText(step.text, language2)}</li>
                  ))}
                </ol>
                {docsUrl ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-[13px] text-foreground underline-offset-2 hover:underline"
                    onClick={() =>
                      void openExternalUrl(platform2, docsUrl, {
                        source: `connectors.${connectorId}.docs`,
                      })
                    }
                    data-action-ui-id={`connectors-${connectorId}-docs`}
                  >
                    {manualCopy("docsLink")}
                    <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                  </button>
                ) : null}
              </div>
            ) : null}
            <ConnectorRequiredInputFields
              connectorId={connectorId}
              requiredInputs={requiredInputs}
              values={values3}
              disabled={pending2}
              normalize={normalizeHostInput}
              onChange={(key2, value) => {
                setValues((current2) => ({
                  ...current2,
                  [key2]: value,
                }));
                setError(void 0);
              }}
            />
            {mode2 === "accessToken" ? (
              secretField(
                `connectors-${connectorId}-access-token`,
                manualCopy("token.label"),
                manualCopy("token.placeholder"),
                accessToken,
                setAccessToken,
                true,
              )
            ) : (
              <>
                {secretField(
                  `connectors-${connectorId}-client-id`,
                  manualCopy("clientId.label"),
                  manualCopy("clientId.placeholder"),
                  clientId,
                  setClientId,
                  false,
                )}
                {secretField(
                  `connectors-${connectorId}-client-secret`,
                  manualCopy("clientSecret.label"),
                  manualCopy("clientSecret.placeholder"),
                  clientSecret,
                  setClientSecret,
                  true,
                )}
              </>
            )}
            {otherMode ? (
              <button
                type="button"
                className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setMode(otherMode);
                  setError(void 0);
                }}
                data-action-ui-id={`connectors-${connectorId}-mode-toggle`}
              >
                {manualCopy(
                  otherMode === "clientCredentials" ? "useClientCredentials" : "useAccessToken",
                )}
              </button>
            ) : null}
            <ConnectorConsentNote text={manualCopy("consent")} />
            {error ? <ConnectorDialogError message={error} /> : null}
          </div>
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2("common.cancel")}
          cancelDisabled={pending2}
          onCancel={onClose}
        >
          <Button$1
            type="button"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={pending2 || !inputsReady || !credentialsReady}
            loading={pending2}
            onClick={() => void connect()}
            data-action-ui-id={`connectors-${connectorId}-connect`}
          >
            {pending2 ? t2("connectors.detail.connecting") : manualCopy("connect")}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
export function ConnectorPlainSection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onSubmit,
  onCreated,
  onBusyChange,
}) {
  const { t: t2 } = useTranslation();
  const connectorId = manifest.connectorId;
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "plain");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const handleClose = () => {
    if (busy.current) return;
    mounted.current = false;
    onClose();
  };
  const handleSubmit = async () => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const result = await onSubmit(buildPlainConnectorInput(manifest, copy2("description")));
      if (!mounted.current) return;
      if (!result.ok) {
        setError(t2(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onCreated(result);
      onClose();
    } catch {
      if (mounted.current) setError(t2("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      if (mounted.current) {
        setSubmitting(false);
        onBusyChange?.(false);
      }
    }
  };
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!submitting}
      onRequestClose={handleClose}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          <div className="-mx-3 rounded-[10px] bg-secondary/60 px-6 py-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">{copy2("hint")}</p>
          </div>
          {error ? <ConnectorDialogError message={error} /> : null}
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2("common.cancel")}
          cancelDisabled={submitting}
          onCancel={handleClose}
        >
          <Button$1
            type="button"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={submitting}
            loading={submitting}
            onClick={() => void handleSubmit()}
            data-action-ui-id={`connectors-${connectorId}-connect`}
          >
            {submitting ? t2("connectors.detail.connecting") : copy2("connect")}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
export function ConnectorServerOAuthSection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onSubmit,
  onCreated,
  onBusyChange,
}) {
  const { t: t2 } = useTranslation();
  const connectorId = manifest.connectorId;
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "server-oauth");
  const [phase, setPhase] = reactExports.useState("idle");
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const submitting = phase !== "idle";
  const handleClose = () => {
    if (phase === "saving") return;
    if (phase === "authorizing") {
      void homeService.customMcp.cancelAuthorization(connectorId);
    }
    mounted.current = false;
    onClose();
  };
  const handleConnect = async () => {
    if (busy.current) return;
    busy.current = true;
    setError(void 0);
    setPhase("saving");
    onBusyChange?.(true);
    try {
      const created = await onSubmit(buildPlainConnectorInput(manifest, copy2("description")));
      if (!mounted.current) return;
      let serverName;
      if (!created.ok) {
        if (created.code === "server_exists") serverName = connectorId;
        else {
          setError(t2(`connectors.customDialog.error.${created.code}`));
          return;
        }
      } else {
        serverName = created.server.name;
      }
      setPhase("authorizing");
      const authorized = await homeService.customMcp.authorizeServer(serverName);
      if (!mounted.current) return;
      if (!authorized.ok) {
        setError(t2(`connectors.customDialog.error.${authorized.code}`));
        return;
      }
      onCreated(authorized);
      onClose();
    } catch {
      if (mounted.current) setError(t2("connectors.customDialog.error.requestFailed"));
    } finally {
      busy.current = false;
      if (mounted.current) {
        setPhase("idle");
        onBusyChange?.(false);
      }
    }
  };
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!submitting}
      onRequestClose={handleClose}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          <div className="-mx-3 rounded-[10px] bg-secondary/60 px-6 py-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {copy2(phase === "authorizing" ? "authorizingHint" : "hint")}
            </p>
          </div>
          <ConnectorConsentNote text={copy2("consent")} className="mt-4" />
          {error ? <ConnectorDialogError message={error} /> : null}
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2("common.cancel")}
          cancelDisabled={phase === "saving"}
          onCancel={handleClose}
        >
          <Button$1
            type="button"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={submitting}
            loading={submitting}
            onClick={() => void handleConnect()}
            data-action-ui-id={`connectors-${connectorId}-connect`}
          >
            {phase === "authorizing" ? copy2("authorizing") : copy2("connect")}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
export function ConnectorSkillOnlySection({ manifest, iconUrl, embedded, onClose, onBusyChange }) {
  const { t: t2 } = useTranslation();
  const connectorId = manifest.connectorId;
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "skill-only");
  const [installing, setInstalling] = reactExports.useState(false);
  const [installed, setInstalled] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const handleInstall = async () => {
    if (busy.current) return;
    busy.current = true;
    setInstalling(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const result = await homeService.connector.install(connectorId);
      if (result.ok) setInstalled(true);
      else setError(result.message ?? copy2("installFailed"));
    } catch {
      setError(copy2("installFailed"));
    } finally {
      busy.current = false;
      setInstalling(false);
      onBusyChange?.(false);
    }
  };
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!installing}
      onRequestClose={() => {
        if (!installing) onClose();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          <div className="-mx-3 rounded-[10px] bg-secondary/60 px-6 py-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {copy2(installed ? "installedHint" : "installHint")}
            </p>
          </div>
          {error ? <ConnectorDialogError message={error} /> : null}
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2(installed ? "common.close" : "common.cancel")}
          cancelDisabled={installing}
          cancelActionUiId={`connectors-${connectorId}-close`}
          onCancel={onClose}
        >
          {installed ? null : (
            <Button$1
              type="button"
              className="h-9 min-w-22 rounded-lg px-4"
              loading={installing}
              onClick={() => void handleInstall()}
              data-action-ui-id={`connectors-${connectorId}-install`}
            >
              {copy2("install")}
            </Button$1>
          )}
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
