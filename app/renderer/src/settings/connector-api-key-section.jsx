// connector-api-key-section.jsx
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "../media-editing/lucide-icon-wraps.js";
import { connectorDescription } from "../skills/connectors/connector-market.js";
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
// 4.0.3：user_config 支持多字段替换（不再只认一个 API key）
// 4.0.3：user_config 多字段替换。apiKeyExtraFields 需要界面配合才用得上，
// 所以这里先只引 substituteUserConfig（见文件末尾的剩余工作说明）。
import { substituteUserConfig } from "./user-config-substitution.js";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";
const API_KEY_MAX_LENGTH = 2048;
function isValidApiKey(value) {
  const key = value.trim();
  return (
    key.length > 0 &&
    key.length <= API_KEY_MAX_LENGTH &&
    /^[\x21-\x7e]+$/u.test(key) &&
    !key.includes("://") &&
    !/^(?:Authorization|secret-key):/iu.test(key)
  );
}
/**
 * 组装连接器的 MCP 配置。
 *
 * **4.0.3 起支持多个 userConfig 字段**：除了 auth.configKey（这里作为 key 传入），
 * 模板里若还引用了别的字段，由 `extraValues` 提供（键为字段名）。
 * 替换统一走 substituteUserConfig —— 它会校验字段是否在 manifest 里声明过、
 * 有没有值，出错时抛 UserConfigSubstitutionError（带具体 key，界面能精确提示）。
 *
 * 兼容：不传 extraValues 时行为与 4.0.0 相同（只替换 configKey）。
 */
function buildApiKeyConnectorInput(manifest, key, description, extraValues = {}) {
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote" || manifest.auth.kind !== "apiKey") {
    throw new Error("Invalid connector configuration");
  }
  if (!isValidApiKey(key)) throw new Error("Invalid connector configuration");
  const value = key.trim();
  const fields = manifest.userConfig ?? [];
  const values = { [manifest.auth.configKey]: value, ...extraValues };
  const substitute = (template) => substituteUserConfig(template, values, fields);
  const url = new URL(mcp.endpoint);
  for (const [param, template] of Object.entries(mcp.queryParams ?? {})) {
    url.searchParams.set(param, substitute(template));
  }
  const headerEntries = Object.entries(mcp.headers ?? {}).map(
    ([fieldName, template]) => [fieldName, substitute(template)],
  );
  return {
    name: mcp.serverName,
    enabled: true,
    config: {
      transport: mcp.transport,
      url: url.href,
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
  const { t, i18n } = useTranslation();
  const connectorId = manifest.connectorId;
  const auth = manifest.auth.kind === "apiKey" ? manifest.auth : void 0;
  const { copy } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "generic",
  );
  const platform = usePlatform();
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
  const handleOpenPage = async (url, source) => {
    setOpeningLogin(true);
    setLoginError(false);
    const opened = await openExternalUrl(platform, url, {
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
            t,
            i18n?.language ?? "en",
            connectorId,
            manifest.description,
          ),
        ),
      );
      if (!mounted.current) return;
      if (!result.ok) {
        setError(t(`connectors.customDialog.error.${result.code}`));
        return;
      }
      setApiKey("");
      onCreated(result);
      onClose();
    } catch {
      if (mounted.current)
        setError(t("connectors.customDialog.error.requestFailed"));
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
          title={copy("title")}
          description={copy("description")}
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
                  {copy("loginTitle")}
                </h3>
                <div data-layout-slot="connector-credential-step-content">
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {copy("loginDescription")}
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
                      {copy("login")}
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
                        {t("connectors.setupGuide")}
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
                      {copy("loginError")}
                    </p>
                  ) : null}
                </div>
              </ConnectorDialogStep>
              <ConnectorDialogStep ordinal={2}>
                <Label
                  htmlFor={keyInputId}
                  className="text-sm font-medium text-foreground"
                >
                  {copy("keyLabel")}
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
                    placeholder={copy("keyPlaceholder")}
                    className="mt-3 h-10 rounded-lg bg-card"
                    data-action-ui-id={`connectors-${connectorId}-key`}
                  />
                  <p
                    id={keyHintId}
                    className="mt-2 text-[13px] leading-relaxed text-muted-foreground"
                  >
                    {copy("keyHint")}
                  </p>
                  {apiKey.trim() && !keyValid ? (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {copy("invalidKey")}
                    </p>
                  ) : null}
                </div>
              </ConnectorDialogStep>
            </div>
            <ConnectorConsentNote text={copy("consent")} className="mt-4" />
            {error ? <ConnectorDialogError message={error} /> : null}
          </div>
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t("common.cancel")}
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
            {submitting ? t("connectors.detail.connecting") : copy("connect")}
          </Button>
        </ConnectorDialogActions>
      </form>
    </ConnectorDialogShell>
  );
}
