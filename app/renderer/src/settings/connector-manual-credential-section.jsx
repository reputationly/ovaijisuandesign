// connector-manual-credential-section.jsx
import {
  ArrowUpRight,
  jsxRuntimeExports,
  localizedI18nText,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ConnectorRequiredInputFields,
  installStagedConnector,
  isRequiredInputSatisfied,
} from "./connector-required-input-fields.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";
import { homeService } from "../workspace/home-service.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  ConnectorConsentNote,
  ConnectorDialogActions,
  ConnectorDialogError,
  ConnectorDialogIntro,
  ConnectorDialogShell,
  connectorTitle,
  useConnectorCopy,
} from "./make-async-image-task.jsx";

function normalizeHostInput(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function isValidSecret(value) {
  const secret = value.trim();
  return (
    secret.length > 0 && secret.length <= 512 && /^[\x21-\x7e]+$/.test(secret)
  );
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
  const profile =
    manifest.auth.kind === "hubOAuthProfile" ? manifest.auth.profile : void 0;
  const manual = profile?.flow?.manual;
  const serverName = manifest.capabilities.mcp?.serverName ?? connectorId;
  const requiredInputs = profile?.requiredInputs ?? [];
  const docsUrl = profile?.flow?.docsUrl;
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "manual",
  );
  const manualCopy = (key2) => {
    const override = manual?.copy?.[key2];
    return override ? localizedI18nText(override, language2) : copy2(key2);
  };
  const modes = manual?.modes ?? [];
  const [mode2, setMode] = reactExports.useState(
    modes[0] ?? "clientCredentials",
  );
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
    isRequiredInputSatisfied(
      input,
      values3[input.key] ?? "",
      normalizeHostInput,
    ),
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
        requiredInputs.map((field) => [
          field.key,
          normalizeHostInput(values3[field.key] ?? ""),
        ]),
      );
      if (mode2 === "accessToken") {
        input.access_token = accessToken.trim();
      } else {
        input.client_id = clientId.trim();
        input.client_secret = clientSecret.trim();
      }
      const staged = await homeService.customMcp.connectManual(
        serverName,
        input,
      );
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
      onCreated(finalized.result);
      onClose();
    } catch {
      if (mounted.current)
        setError(t2("connectors.customDialog.error.authorization_failed"));
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
                    <li key={step.text.en}>
                      {localizedI18nText(step.text, language2)}
                    </li>
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
                  otherMode === "clientCredentials"
                    ? "useClientCredentials"
                    : "useAccessToken",
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
            {pending2
              ? t2("connectors.detail.connecting")
              : manualCopy("connect")}
          </Button$1>
        </ConnectorDialogActions>
      </div>
    </ConnectorDialogShell>
  );
}
