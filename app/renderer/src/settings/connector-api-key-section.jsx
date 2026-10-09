// connector-api-key-section.jsx
import {
  ArrowUpRight,
  connectorDescription,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ConnectorConsentNote,
  ConnectorDialogActions,
  ConnectorDialogError,
  ConnectorDialogIntro,
  ConnectorDialogShell,
  ConnectorDialogStep,
  useConnectorCopy,
} from "./make-async-image-task.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";
const API_KEY_MAX_LENGTH = 2048;
function isValidApiKey(value) {
  const key2 = value.trim();
  return (
    key2.length > 0 &&
    key2.length <= API_KEY_MAX_LENGTH &&
    /^[\x21-\x7e]+$/u.test(key2) &&
    !key2.includes("://") &&
    !/^(?:Authorization|secret-key):/iu.test(key2)
  );
}
function buildApiKeyConnectorInput(manifest, key2, description) {
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote" || manifest.auth.kind !== "apiKey") {
    throw new Error("Invalid connector configuration");
  }
  if (!isValidApiKey(key2)) throw new Error("Invalid connector configuration");
  const value = key2.trim();
  const placeholder = `\${user_config.${manifest.auth.configKey}}`;
  const substitute = (template) => template.split(placeholder).join(value);
  const url2 = new URL(mcp.endpoint);
  for (const [param, template] of Object.entries(mcp.queryParams ?? {})) {
    url2.searchParams.set(param, substitute(template));
  }
  const headerEntries = Object.entries(mcp.headers ?? {}).map(
    ([name2, template]) => [name2, substitute(template)],
  );
  return {
    name: mcp.serverName,
    enabled: true,
    config: {
      transport: mcp.transport,
      url: url2.href,
      ...(headerEntries.length > 0
        ? {
            headers: Object.fromEntries(headerEntries),
          }
        : {}),
      timeoutMs: mcp.timeoutMs ?? 3e4,
      description,
    },
  };
}
export function ConnectorApiKeySection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onSubmit,
  onCreated,
  onBusyChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const connectorId = manifest.connectorId;
  const auth = manifest.auth.kind === "apiKey" ? manifest.auth : void 0;
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "generic",
  );
  const platform2 = usePlatform();
  const [apiKey, setApiKey] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [openingLogin, setOpeningLogin] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [loginError, setLoginError] = reactExports.useState(false);
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const keyValid = isValidApiKey(apiKey);
  const keyInputId = `${connectorId}-api-key`;
  const keyHintId = `${connectorId}-key-hint`;
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleClose = () => {
    if (busy.current) return;
    mounted.current = false;
    setApiKey("");
    onClose();
  };
  const handleOpenPage = async (url2, source) => {
    setOpeningLogin(true);
    setLoginError(false);
    const opened = await openExternalUrl(platform2, url2, {
      source,
    });
    if (mounted.current) {
      setLoginError(!opened);
      setOpeningLogin(false);
    }
  };
  const handleSubmit = async () => {
    if (!keyValid || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      const result = await onSubmit(
        buildApiKeyConnectorInput(
          manifest,
          apiKey,
          connectorDescription(
            t2,
            i18n?.language ?? "en",
            connectorId,
            manifest.description,
          ),
        ),
      );
      if (!mounted.current) return;
      if (!result.ok) {
        setError(t2(`connectors.customDialog.error.${result.code}`));
        return;
      }
      setApiKey("");
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
      <form
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          <div
            className="-mx-3 rounded-[10px] bg-secondary/60 px-3 pb-3"
            data-layout-slot="connector-credential-surface"
          >
            <div
              className="w-full"
              data-layout-slot="connector-credential-steps"
            >
              <ConnectorDialogStep ordinal={1} first={true}>
                <h3 className="text-sm font-medium text-foreground">
                  {copy2("loginTitle")}
                </h3>
                <div data-layout-slot="connector-credential-step-content">
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {copy2("loginDescription")}
                  </p>
                  <div
                    className="mt-3 flex flex-wrap items-center gap-2"
                    data-layout-slot="connector-credential-actions"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 gap-1 rounded-lg bg-card px-3 hover:bg-card/80"
                      disabled={submitting || openingLogin || !auth}
                      loading={openingLogin}
                      onClick={() =>
                        auth &&
                        void handleOpenPage(
                          auth.keyPage,
                          `connectors.${connectorId}.login`,
                        )
                      }
                      data-action-ui-id={`connectors-${connectorId}-login`}
                    >
                      {copy2("login")}
                      <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                    </Button>
                    {auth?.docsUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 gap-1 rounded-lg px-3 text-muted-foreground hover:text-foreground"
                        disabled={submitting || openingLogin}
                        onClick={() =>
                          auth.docsUrl &&
                          void handleOpenPage(
                            auth.docsUrl,
                            `connectors.${connectorId}.docs`,
                          )
                        }
                        data-action-ui-id={`connectors-${connectorId}-docs`}
                      >
                        {t2("connectors.setupGuide")}
                        <Icon
                          icon={ArrowUpRight}
                          size="sm"
                          aria-hidden={true}
                        />
                      </Button>
                    ) : null}
                  </div>
                  {loginError ? (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {copy2("loginError")}
                    </p>
                  ) : null}
                </div>
              </ConnectorDialogStep>
              <ConnectorDialogStep ordinal={2}>
                <Label
                  htmlFor={keyInputId}
                  className="text-sm font-medium text-foreground"
                >
                  {copy2("keyLabel")}
                </Label>
                <div data-layout-slot="connector-credential-step-content">
                  <Input3
                    id={keyInputId}
                    type="password"
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setError(void 0);
                    }}
                    disabled={submitting}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={API_KEY_MAX_LENGTH}
                    aria-invalid={Boolean(apiKey.trim()) && !keyValid}
                    aria-describedby={keyHintId}
                    aria-required="true"
                    placeholder={copy2("keyPlaceholder")}
                    className="mt-3 h-10 rounded-lg bg-card"
                    data-action-ui-id={`connectors-${connectorId}-key`}
                  />
                  <p
                    id={keyHintId}
                    className="mt-2 text-[13px] leading-relaxed text-muted-foreground"
                  >
                    {copy2("keyHint")}
                  </p>
                  {apiKey.trim() && !keyValid ? (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {copy2("invalidKey")}
                    </p>
                  ) : null}
                </div>
              </ConnectorDialogStep>
            </div>
            <ConnectorConsentNote text={copy2("consent")} className="mt-4" />
            {error ? <ConnectorDialogError message={error} /> : null}
          </div>
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2("common.cancel")}
          cancelDisabled={submitting}
          onCancel={handleClose}
        >
          <Button
            type="submit"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={!keyValid || submitting}
            loading={submitting}
            data-action-ui-id={`connectors-${connectorId}-connect`}
          >
            {submitting ? t2("connectors.detail.connecting") : copy2("connect")}
          </Button>
        </ConnectorDialogActions>
      </form>
    </ConnectorDialogShell>
  );
}
