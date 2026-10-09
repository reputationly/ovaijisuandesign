// connector-hub-o-auth-section.jsx
import {
  isSkillsOnly,
  reactExports,
  resolveConnectorIcon,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1 } from "../infra/dialog-content.jsx";
import { homeService } from "../workspace/home-service.jsx";
import {
  ConnectorConsentNote,
  ConnectorDialogActions,
  ConnectorDialogError,
  ConnectorDialogIntro,
  ConnectorDialogShell,
  connectorTitle,
  useConnectorCopy,
} from "./make-async-image-task.jsx";
import {
  ConnectorRequiredInputFields,
  installStagedConnector,
  isRequiredInputSatisfied,
} from "./connector-required-input-fields.jsx";
import { ConnectorApiKeySection } from "./connector-api-key-section.jsx";
import { ConnectorCliAuthSection } from "./connector-cli-auth-section.jsx";
import { ConnectorManualCredentialSection } from "./connector-manual-credential-section.jsx";

function buildPlainConnectorInput(manifest, description) {
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote")
    throw new Error("Invalid connector configuration");
  const templates = [
    ...Object.values(mcp.headers ?? {}),
    ...Object.values(mcp.queryParams ?? {}),
  ];
  if (templates.some((value) => value.includes("${user_config."))) {
    throw new Error("Invalid connector configuration");
  }
  const url2 = new URL(mcp.endpoint);
  for (const [param, value] of Object.entries(mcp.queryParams ?? {})) {
    url2.searchParams.set(param, value);
  }
  return {
    name: mcp.serverName,
    enabled: true,
    config: {
      transport: mcp.transport,
      url: url2.href,
      ...(mcp.headers
        ? {
            headers: {
              ...mcp.headers,
            },
          }
        : {}),
      timeoutMs: mcp.timeoutMs ?? 3e4,
      description,
    },
  };
}

function ConnectorHubOAuthSection({
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
  const profile =
    manifest.auth.kind === "hubOAuthProfile" ? manifest.auth.profile : void 0;
  const serverName = manifest.capabilities.mcp?.serverName ?? connectorId;
  const requiredInputs = profile?.requiredInputs ?? [];
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "oauth",
  );
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
        void homeService.customMcp
          .cancelAuthorization(serverName)
          .catch(() => void 0);
    };
  }, [serverName]);
  const close2 = async () => {
    if (cancelling) return;
    cancelled.current = true;
    setCancelling(true);
    onBusyChange?.(true);
    try {
      if (touched.current) {
        const result =
          await homeService.customMcp.cancelAuthorization(serverName);
        if (result.ok) {
          onCreated(result);
          if (result.runtime.failedRuntimes > 0)
            throw new Error("Disconnect failed");
        } else if (result.code !== "server_not_found")
          throw new Error("Cancel failed");
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
              requiredInputs.map((field) => [
                field.key,
                (values3[field.key] ?? "").trim(),
              ]),
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
            name: connectorTitle(
              t2,
              language2,
              connectorId,
              manifest.displayName,
            ),
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
              <p
                role="status"
                className="mt-3 text-[13px] leading-relaxed text-muted-foreground"
              >
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
            {t2(
              pending2
                ? "connectors.detail.connecting"
                : "connectors.oauth.connect",
            )}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}

function ConnectorPlainSection({
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
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "plain",
  );
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
      const result = await onSubmit(
        buildPlainConnectorInput(manifest, copy2("description")),
      );
      if (!mounted.current) return;
      if (!result.ok) {
        setError(t2(`connectors.customDialog.error.${result.code}`));
        return;
      }
      onCreated(result);
      onClose();
    } catch {
      if (mounted.current)
        setError(t2("connectors.customDialog.error.requestFailed"));
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
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {copy2("hint")}
            </p>
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

function ConnectorServerOAuthSection({
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
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "server-oauth",
  );
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
      const created = await onSubmit(
        buildPlainConnectorInput(manifest, copy2("description")),
      );
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
      const authorized =
        await homeService.customMcp.authorizeServer(serverName);
      if (!mounted.current) return;
      if (!authorized.ok) {
        setError(t2(`connectors.customDialog.error.${authorized.code}`));
        return;
      }
      onCreated(authorized);
      onClose();
    } catch {
      if (mounted.current)
        setError(t2("connectors.customDialog.error.requestFailed"));
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

function ConnectorSkillOnlySection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onBusyChange,
}) {
  const { t: t2 } = useTranslation();
  const connectorId = manifest.connectorId;
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "skill-only",
  );
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

export function ConnectorDialog({ manifest, ...props }) {
  const section = {
    ...props,
    manifest,
    iconUrl: resolveConnectorIcon(manifest.icon),
    embedded: props.embedded ?? false,
  };
  if (manifest.auth.kind === "cliAuth")
    return <ConnectorCliAuthSection {...section} />;
  if (isSkillsOnly(manifest)) return <ConnectorSkillOnlySection {...section} />;
  switch (manifest.auth.kind) {
    case "apiKey":
      return <ConnectorApiKeySection {...section} />;
    case "serverOAuth":
      return <ConnectorServerOAuthSection {...section} />;
    case "hubOAuthProfile":
      return manifest.auth.profile.flow?.manual?.only ? (
        <ConnectorManualCredentialSection {...section} />
      ) : (
        <ConnectorHubOAuthSection {...section} />
      );
    case "none":
      return <ConnectorPlainSection {...section} />;
  }
}
