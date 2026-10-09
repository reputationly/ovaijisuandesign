// connector-cli-auth-section.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  usePlatform,
  openExternalUrl,
  ArrowUpRight,
  Icon,
  localizedI18nText,
  useIsScrolling,
  ShieldCheck,
  connectorDescription,
} from "../vendor.js";
import {
  Button$1,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { Label } from "../m09/infinite-scroll-container.jsx";
import {
  ConnectorDialogFrame,
  ConnectorRelationshipGraphic,
} from "../m10/proxy-detected-toast.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const TASK_TRACE_ID = "6a2579bb000000006cca619fd3c07aff";
function makeAsyncImageTask(
  taskId,
  status,
  extra,
  base2 = {
    code: 0,
    message: "",
  },
) {
  return {
    task_id: taskId,
    status,
    base: base2,
    type: "image",
    provider: "midjourney",
    model: "midjourney",
    created_at: 1717837304567,
    updated_at: 1717837337600,
    extra,
  };
}
makeAsyncImageTask("520029720819908618", "TASK_STATUS_COMPLETED", {
  trace_id: TASK_TRACE_ID,
  prompt: "a cute cat in cyberpunk style --ar 1:1",
  n: "4",
  width: "1024",
  height: "1024",
  image_urls: JSON.stringify([
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-0.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-1.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-2.png",
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840934315166921-520029720819908618-3.png",
  ]),
});
makeAsyncImageTask("520029720819908617", "TASK_STATUS_COMPLETED", {
  trace_id: TASK_TRACE_ID,
  prompt: "a cute cat in cyberpunk style --ar 1:1",
  n: "4",
  width: "1024",
  height: "1024",
  image_urls: JSON.stringify([
    "https://cdn.hailuoai.com/prod/2026-06-07-22/image/1780840945316795200-520029720819908617-0.png",
    "",
    "",
    "",
  ]),
});
export function connectorTitle(t2, language2, connectorId, displayName2) {
  return t2(`connectors.catalog.${connectorId}.title`, localizedI18nText(displayName2, language2));
}
export function useConnectorCopy(connectorId, displayName2, namespace2) {
  const { t: t2, i18n } = useTranslation();
  const language2 = i18n?.language ?? "en";
  const name2 = localizedI18nText(displayName2, language2);
  const copy2 = reactExports.useCallback(
    (key2, options) =>
      t2(`connectors.${connectorId}.${key2}`, {
        name: name2,
        ...options,
        defaultValue: t2(`connectors.${namespace2}.${key2}`, {
          name: name2,
          ...options,
        }),
      }),
    [t2, connectorId, namespace2, name2],
  );
  return {
    name: name2,
    copy: copy2,
  };
}
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
  const headerEntries = Object.entries(mcp.headers ?? {}).map(([name2, template]) => [
    name2,
    substitute(template),
  ]);
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
export function buildPlainConnectorInput(manifest, description) {
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote") throw new Error("Invalid connector configuration");
  const templates = [...Object.values(mcp.headers ?? {}), ...Object.values(mcp.queryParams ?? {})];
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
export function ConnectorDialogShell({
  connectorId,
  embedded,
  dismissible,
  onRequestClose,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  if (embedded) return <>{children2}</>;
  return (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => {
        if (!open) onRequestClose();
      }}
      actionUiId={`connectors-${connectorId}-dialog`}
      closeLabel={t2("common.close")}
      size="md"
      className="sm:max-w-[600px]"
      showCloseButton={dismissible}
    >
      {children2}
    </ConnectorDialogFrame>
  );
}
export function ConnectorDialogIntro({ iconUrl, title, description, children: children2 }) {
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  return (
    <div
      ref={scrollRef}
      data-scrolling={isScrolling || void 0}
      className="scrollbar-fade scrollbar-fade-compact min-h-0 overflow-y-auto px-6 pt-7 pb-3"
      data-layout-slot="connector-credential-dialog-body"
    >
      <ConnectorRelationshipGraphic targetIconUrl={iconUrl} className="mb-4 justify-center" />
      <DialogHeader className="mb-4 items-center gap-1 text-center">
        <DialogTitle className="text-base leading-5 font-medium text-foreground">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-5 text-muted-foreground">
          {description}
        </DialogDescription>
      </DialogHeader>
      {children2}
    </div>
  );
}
export function ConnectorConsentNote({ text: text2, className }) {
  return (
    <div className={`flex gap-2.5 rounded-lg bg-secondary px-3 py-2.5 ${className ?? ""}`}>
      <Icon
        icon={ShieldCheck}
        size="sm"
        aria-hidden={true}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <p className="text-[13px] leading-relaxed text-muted-foreground">{text2}</p>
    </div>
  );
}
export function ConnectorDialogError({ message: message2 }) {
  return (
    <p role="alert" className="mt-3 text-xs text-destructive">
      {message2}
    </p>
  );
}
export function ConnectorDialogActions({
  connectorId,
  cancelLabel,
  cancelDisabled = false,
  cancelActionUiId,
  onCancel,
  children: children2,
}) {
  return (
    <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 px-6 pb-5">
      <Button$1
        type="button"
        variant="secondary"
        className="h-9 min-w-22 rounded-lg px-4"
        disabled={cancelDisabled}
        onClick={onCancel}
        data-action-ui-id={cancelActionUiId ?? `connectors-${connectorId}-cancel`}
      >
        {cancelLabel}
      </Button$1>
      {children2}
    </DialogFooter>
  );
}
function ConnectorDialogStep({
  ordinal,
  first: first2 = false,
  last: last2 = false,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const lineClassName =
    "absolute left-1/2 w-[1px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--muted-foreground)_0,var(--muted-foreground)_1px,transparent_1px,transparent_3px)]";
  return (
    <section
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2"
      data-layout-slot="connector-credential-step"
    >
      <div className="relative flex justify-center pt-4">
        {first2 ? null : <span aria-hidden={true} className={`${lineClassName} top-0 h-4`} />}
        <span
          aria-hidden={true}
          className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-medium leading-none text-foreground"
          data-layout-slot="connector-credential-step-node"
        >
          {t2(`connectors.stepOrdinal.${ordinal}`)}
        </span>
        {last2 ? null : <span aria-hidden={true} className={`${lineClassName} top-10 bottom-0`} />}
      </div>
      <div className="min-w-0 py-4">{children2}</div>
    </section>
  );
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
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "generic");
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
          connectorDescription(t2, i18n?.language ?? "en", connectorId, manifest.description),
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
            <div className="w-full" data-layout-slot="connector-credential-steps">
              <ConnectorDialogStep ordinal={1} first={true}>
                <h3 className="text-sm font-medium text-foreground">{copy2("loginTitle")}</h3>
                <div data-layout-slot="connector-credential-step-content">
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {copy2("loginDescription")}
                  </p>
                  <div
                    className="mt-3 flex flex-wrap items-center gap-2"
                    data-layout-slot="connector-credential-actions"
                  >
                    <Button$1
                      type="button"
                      variant="outline"
                      className="h-8 gap-1 rounded-lg bg-card px-3 hover:bg-card/80"
                      disabled={submitting || openingLogin || !auth}
                      loading={openingLogin}
                      onClick={() =>
                        auth && void handleOpenPage(auth.keyPage, `connectors.${connectorId}.login`)
                      }
                      data-action-ui-id={`connectors-${connectorId}-login`}
                    >
                      {copy2("login")}
                      <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                    </Button$1>
                    {auth?.docsUrl ? (
                      <Button$1
                        type="button"
                        variant="ghost"
                        className="h-8 gap-1 rounded-lg px-3 text-muted-foreground hover:text-foreground"
                        disabled={submitting || openingLogin}
                        onClick={() =>
                          auth.docsUrl &&
                          void handleOpenPage(auth.docsUrl, `connectors.${connectorId}.docs`)
                        }
                        data-action-ui-id={`connectors-${connectorId}-docs`}
                      >
                        {t2("connectors.setupGuide")}
                        <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                      </Button$1>
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
                <Label htmlFor={keyInputId} className="text-sm font-medium text-foreground">
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
          <Button$1
            type="submit"
            className="h-9 min-w-26 rounded-lg px-4"
            disabled={!keyValid || submitting}
            loading={submitting}
            data-action-ui-id={`connectors-${connectorId}-connect`}
          >
            {submitting ? t2("connectors.detail.connecting") : copy2("connect")}
          </Button$1>
        </ConnectorDialogActions>
      </form>
    </ConnectorDialogShell>
  );
}
function formatCapacity(bytes2) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes2;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
export function ConnectorCliAuthSection({
  manifest,
  iconUrl,
  embedded,
  onClose,
  onCreated,
  onBusyChange,
}) {
  const { t: t2 } = useTranslation();
  const connectorId = manifest.connectorId;
  const { copy: copy2 } = useConnectorCopy(connectorId, manifest.displayName, "cli-auth");
  const platform2 = usePlatform();
  const [installed, setInstalled] = reactExports.useState(false);
  const [installing, setInstalling] = reactExports.useState(false);
  const [authorizing, setAuthorizing] = reactExports.useState(false);
  const [account, setAccount] = reactExports.useState();
  const [authCode, setAuthCode] = reactExports.useState("");
  const [authUrl, setAuthUrl] = reactExports.useState();
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const createdFired = reactExports.useRef(false);
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  reactExports.useEffect(() => {
    void (async () => {
      try {
        const servers = await homeService.customMcp.list();
        const saved = servers.some((server) => server.name === connectorId);
        if (!mounted.current || !saved) return;
        setInstalled(true);
        createdFired.current = true;
        const probed = await homeService.hcpCli.getAccount(connectorId);
        if (mounted.current && probed.ok) setAccount(probed);
      } catch {}
    })();
  }, [connectorId]);
  const fireCreated = reactExports.useCallback(async () => {
    if (createdFired.current) return;
    try {
      const servers = await homeService.customMcp.list();
      const server = servers.find((candidate) => candidate.name === connectorId);
      if (!server) return;
      createdFired.current = true;
      onCreated({
        ok: true,
        server,
        runtime: {
          state: server.runtimeState ?? "saved",
          connectedRuntimes: 0,
          failedRuntimes: 0,
        },
      });
    } catch {}
  }, [onCreated, connectorId]);
  const handleClose = () => {
    if (busy.current) return;
    if (installed) void fireCreated();
    onClose();
  };
  const withBusy = async (setter, task) => {
    if (busy.current) return;
    busy.current = true;
    setter(true);
    onBusyChange?.(true);
    setError(void 0);
    try {
      await task();
    } finally {
      busy.current = false;
      if (mounted.current) {
        setter(false);
        onBusyChange?.(false);
      }
    }
  };
  const handleInstall = () =>
    withBusy(setInstalling, async () => {
      const result = await homeService.connector.install(connectorId);
      if (!mounted.current) return;
      if (!result.ok) {
        setError(result.message ?? copy2("installFailed"));
        return;
      }
      setInstalled(true);
    });
  const handleAuthorize = (code2) =>
    withBusy(setAuthorizing, async () => {
      const result = await homeService.hcpCli.login(
        connectorId,
        code2
          ? {
              code: code2,
            }
          : void 0,
      );
      if (!mounted.current) return;
      if (!result.ok) {
        if (result.authUrl && !code2) {
          setAuthUrl(result.authUrl);
          void openExternalUrl(platform2, result.authUrl, {
            source: `connectors.${connectorId}.authUrl`,
          });
          return;
        }
        setError(result.message ?? copy2("authFailed"));
        if (result.authUrl) setAuthUrl(result.authUrl);
        return;
      }
      setAuthCode("");
      setAuthUrl(void 0);
      const probed = await homeService.hcpCli.getAccount(connectorId);
      if (!mounted.current) return;
      setAccount(
        probed.ok
          ? probed
          : {
              ok: true,
            },
      );
      await fireCreated();
    });
  const working = installing || authorizing;
  const authorized = Boolean(account);
  return (
    <ConnectorDialogShell
      connectorId={connectorId}
      embedded={embedded}
      dismissible={!working}
      onRequestClose={handleClose}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConnectorDialogIntro
          iconUrl={iconUrl}
          title={copy2("title")}
          description={copy2("description")}
        >
          {authorized ? (
            <div className="-mx-3 rounded-[10px] bg-secondary/60 px-6 py-5">
              <h3 className="text-sm font-medium text-foreground">{copy2("accountTitle")}</h3>
              <dl className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed">
                {account?.nickname ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">{copy2("accountNickname")}</dt>
                    <dd className="text-foreground">{account.nickname}</dd>
                  </div>
                ) : null}
                {account?.memberType ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">{copy2("accountMember")}</dt>
                    <dd className="text-foreground">{copy2(`memberType.${account.memberType}`)}</dd>
                  </div>
                ) : null}
                {account?.capacityTotal ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">{copy2("accountCapacity")}</dt>
                    <dd className="text-foreground">
                      {account.capacityUsed !== void 0
                        ? `${formatCapacity(account.capacityUsed)} / `
                        : ""}
                      {formatCapacity(account.capacityTotal)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                {copy2("accountReady")}
              </p>
            </div>
          ) : (
            <div className="-mx-3 rounded-[10px] bg-secondary/60 px-3 pb-3">
              <ConnectorDialogStep ordinal={1} first={true}>
                <h3 className="text-sm font-medium text-foreground">{copy2("installTitle")}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {copy2("installDescription")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button$1
                    type="button"
                    variant="outline"
                    className="h-8 gap-1 rounded-lg bg-card px-3 hover:bg-card/80"
                    disabled={installed || working}
                    loading={installing}
                    onClick={() => void handleInstall()}
                    data-action-ui-id={`connectors-${connectorId}-install`}
                  >
                    {copy2(installed ? "installed" : "install")}
                  </Button$1>
                </div>
              </ConnectorDialogStep>
              <ConnectorDialogStep ordinal={2} last={true}>
                <h3 className="text-sm font-medium text-foreground">{copy2("authTitle")}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {copy2("authDescription")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button$1
                    type="button"
                    variant="outline"
                    className="h-8 gap-1 rounded-lg bg-card px-3 hover:bg-card/80"
                    disabled={!installed || working}
                    loading={authorizing}
                    onClick={() => void handleAuthorize()}
                    data-action-ui-id={`connectors-${connectorId}-authorize`}
                  >
                    {copy2(authorizing ? "authorizing" : "authorize")}
                    <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                  </Button$1>
                  {authUrl ? (
                    <Button$1
                      type="button"
                      variant="ghost"
                      className="h-8 gap-1 rounded-lg px-3 text-muted-foreground hover:text-foreground"
                      disabled={working}
                      onClick={() =>
                        void openExternalUrl(platform2, authUrl, {
                          source: `connectors.${connectorId}.authUrl`,
                        })
                      }
                      data-action-ui-id={`connectors-${connectorId}-auth-url`}
                    >
                      {copy2("openAuthPage")}
                      <Icon icon={ArrowUpRight} size="sm" aria-hidden={true} />
                    </Button$1>
                  ) : null}
                </div>
                {authUrl ? (
                  <div className="mt-3">
                    <Label
                      htmlFor={`${connectorId}-auth-code`}
                      className="text-sm font-medium text-foreground"
                    >
                      {copy2("codeLabel")}
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input3
                        id={`${connectorId}-auth-code`}
                        value={authCode}
                        onChange={(event) => {
                          setAuthCode(event.target.value);
                          setError(void 0);
                        }}
                        disabled={working}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={copy2("codePlaceholder")}
                        className="h-9 rounded-lg bg-card"
                        data-action-ui-id={`connectors-${connectorId}-code`}
                      />
                      <Button$1
                        type="button"
                        className="h-9 shrink-0 rounded-lg px-4"
                        disabled={!authCode.trim() || working}
                        loading={authorizing}
                        onClick={() => void handleAuthorize(authCode.trim())}
                        data-action-ui-id={`connectors-${connectorId}-code-submit`}
                      >
                        {copy2("codeSubmit")}
                      </Button$1>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {copy2("codeHint")}
                    </p>
                  </div>
                ) : null}
              </ConnectorDialogStep>
              <ConnectorConsentNote text={copy2("consent")} className="mt-4" />
            </div>
          )}
          {error ? <ConnectorDialogError message={error} /> : null}
        </ConnectorDialogIntro>
        <ConnectorDialogActions
          connectorId={connectorId}
          cancelLabel={t2(authorized ? "common.close" : "common.cancel")}
          cancelDisabled={working}
          cancelActionUiId={`connectors-${connectorId}-close`}
          onCancel={handleClose}
        />
      </div>
    </ConnectorDialogShell>
  );
}
