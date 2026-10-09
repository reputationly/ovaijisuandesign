// connector-cli-auth-section.jsx
import {
  ArrowUpRight,
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
import { Button$1 } from "../infra/dialog-content.jsx";
import { homeService } from "../workspace/home-service.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";

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
  const { copy: copy2 } = useConnectorCopy(
    connectorId,
    manifest.displayName,
    "cli-auth",
  );
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
      const server = servers.find(
        (candidate) => candidate.name === connectorId,
      );
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
              <h3 className="text-sm font-medium text-foreground">
                {copy2("accountTitle")}
              </h3>
              <dl className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed">
                {account?.nickname ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">
                      {copy2("accountNickname")}
                    </dt>
                    <dd className="text-foreground">{account.nickname}</dd>
                  </div>
                ) : null}
                {account?.memberType ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">
                      {copy2("accountMember")}
                    </dt>
                    <dd className="text-foreground">
                      {copy2(`memberType.${account.memberType}`)}
                    </dd>
                  </div>
                ) : null}
                {account?.capacityTotal ? (
                  <div className="flex items-center gap-3">
                    <dt className="text-muted-foreground">
                      {copy2("accountCapacity")}
                    </dt>
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
                <h3 className="text-sm font-medium text-foreground">
                  {copy2("installTitle")}
                </h3>
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
                <h3 className="text-sm font-medium text-foreground">
                  {copy2("authTitle")}
                </h3>
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
