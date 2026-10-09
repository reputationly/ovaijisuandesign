// use-im-accounts.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { services } from "../vendor-inline/vscode-base/graph.jsx";
import {
  IImBridgeMainService,
  PlaybackPlayIcon,
} from "../workspace/home-service.jsx";
import { reactExports } from "../vendor.js";
const integrationActionGroupClassName =
  "flex w-52 shrink-0 items-center justify-end gap-1.5";
export function IntegrationCard({ className, ...props }) {
  return (
    <li
      className={cn(
        "flex min-h-[108px] items-center gap-4 rounded-[14px] bg-[var(--im-bridge-channel-card-bg)] px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}
export function IntegrationIconFrame({ className, ...props }) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1",
        className,
      )}
      {...props}
    />
  );
}
export function IntegrationActionGroup({ className, ...props }) {
  return (
    <div
      className={cn(integrationActionGroupClassName, className)}
      {...props}
    />
  );
}
export function IntegrationActionButton({
  className,
  tone,
  leadingIcon,
  children: children2,
  ...props
}) {
  return (
    <Button
      size="lg"
      className={cn(
        "h-8 min-w-20 rounded-[10px] px-3 text-sm font-medium !transition-colors active:not-aria-[haspopup]:translate-y-0",
        tone === "warning" &&
          "border-warning/40 bg-card text-warning hover:bg-warning/10 hover:text-warning focus-visible:ring-warning/30",
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children2}
    </Button>
  );
}
export function IntegrationLifecycleToggleButton({
  inactive,
  activeLabel,
  inactiveLabel,
  loading = false,
  className,
  ...props
}) {
  return (
    <IntegrationActionButton
      variant={inactive ? "outline" : "destructive"}
      loading={loading}
      className={cn(
        "h-8 w-[72px] min-w-[72px] max-w-[72px] px-2.5",
        inactive && "gap-0.5 bg-card",
        className,
      )}
      leadingIcon={
        inactive && !loading ? (
          <PlaybackPlayIcon size={14} className="shrink-0 text-foreground/70" />
        ) : (
          void 0
        )
      }
      {...props}
    >
      <span>{inactive ? inactiveLabel : activeLabel}</span>
    </IntegrationActionButton>
  );
}
let _service = null;
export function getImBridgeMainService() {
  if (!_service) {
    _service = services.get(IImBridgeMainService);
  }
  return _service;
}
export function useImAccounts() {
  const [state2, setState] = reactExports.useState({
    accounts: [],
    legacyCredentialsPresent: false,
    loading: true,
    error: null,
  });
  const refresh = reactExports.useCallback(async () => {
    try {
      const svc = getImBridgeMainService();
      const [accounts, migrationStatus] = await Promise.all([
        svc.listAccounts(),
        svc.getCredentialMigrationStatus(),
      ]);
      setState({
        accounts,
        legacyCredentialsPresent: migrationStatus.legacyCredentialsPresent,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        accounts: [],
        legacyCredentialsPresent: false,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  const addAccount = reactExports.useCallback(async (credentials, alias) => {
    return getImBridgeMainService().addAccount(credentials, alias);
  }, []);
  const removeAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().removeAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const renameAccount = reactExports.useCallback(
    async (accountId, alias) => {
      await getImBridgeMainService().renameAccount(accountId, alias);
      await refresh();
    },
    [refresh],
  );
  const pauseAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().pauseAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const resumeAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().resumeAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const resetLegacyCredentialState = reactExports.useCallback(async () => {
    await getImBridgeMainService().resetLegacyCredentialState();
    await refresh();
  }, [refresh]);
  return {
    ...state2,
    refresh,
    addAccount,
    removeAccount,
    renameAccount,
    pauseAccount,
    resumeAccount,
    resetLegacyCredentialState,
  };
}
export function useImStatuses() {
  const [statuses, setStatuses] = reactExports.useState({});
  reactExports.useEffect(() => {
    const svc = getImBridgeMainService();
    let cancelled = false;
    void svc.listStatuses().then((initial) => {
      if (cancelled) return;
      const map3 = {};
      for (const s2 of initial) map3[s2.accountId] = s2;
      setStatuses(map3);
    });
    const unsubscribe = svc.onStatusChange((status) => {
      setStatuses((prev) => ({
        ...prev,
        [status.accountId]: status,
      }));
    });
    return () => {
      cancelled = true;
      unsubscribe.dispose();
    };
  }, []);
  return statuses;
}
