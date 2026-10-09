// general-section.jsx
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Bot,
  Brain$2 as Brain,
  ChevronLeftIcon,
  CircleArrowUp,
  CurrentWorkspaceContext,
  dedupedToast,
  DialogBackdrop,
  DialogClose$1 as DialogClose,
  DialogDescription$2,
  DialogPopup,
  DialogTitle$2,
  getRuntimeConfig,
  Globe,
  jsxRuntimeExports,
  Library,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  reactExports,
  ShieldAlert,
  Smartphone,
  Sun,
  useNavigate,
  usePlatform,
  useQueries,
  useQuery,
  useTranslation,
  XIcon,
} from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAssetCenterSettings } from "./use-asset-center-settings.js";
import {
  Blocks,
  Cable,
  CircleUserRound,
  Folder,
  HardDrive,
  Moon,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from "../media-editing/package.jsx";
import {
  Button,
  cn$2 as cn,
  Dialog,
  dialogChromeButtonClassName,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  SettingGroup,
  SettingRow,
  SettingsSelect,
} from "../settings/settings-select.jsx";
import {
  instantiationService,
  LocalFolderIcon,
} from "../workspace/home-service.jsx";
import { RestartBanner } from "../settings/restart-banner.jsx";
import { AssetCenterMigrateDialog } from "../settings/asset-center-migrate-dialog.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";
import {
  DialogDescription,
  DialogTitle,
  Textarea,
} from "../infra/badge-variants.jsx";
import {
  comfyuiLog,
  getDesignDownloadUrl,
  isMacPlatform,
  KbdGroup,
  SHORTCUT_DEFS,
  ShortcutKeycap,
} from "../workspace/shortcut-hint.jsx";
import { splitShortcutKeys } from "./split-shortcut-keys.js";
import { Switch } from "../generation/select-content.jsx";
import { useSettings } from "../settings/use-settings.js";
import {
  listeners,
  normalizeWorkspaceId,
  SettingsPanelHeaderContext,
  snapshot as snapshot$2,
  useActiveRuntime,
  useOptionalUpdaterContext,
} from "../settings/use-active-runtime.js";
import { FolderWhitelistSection } from "../settings/folder-whitelist-section.jsx";
import { DiagnosticsGroup } from "../settings/diagnostics-group.jsx";
import { ImBridgeManager } from "../settings/im-bridge-manager.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { useImAccounts } from "../settings/use-im-accounts.jsx";
import {
  BlockGroup,
  CopyIconButton,
  countChars,
  getDesktopSettingsMainService,
  getNetworkDiagnosticsMainService,
  roleLabelKey,
  SummaryRow,
} from "../team/copy-icon-button.jsx";
import {
  ACCOUNT_QUERY_KEYS,
  fetchTeamCreditSummaryByGroupId,
  groupTeamContexts,
  useAccountProfile,
  useHailuoCancelCheck,
  useHailuoWebSummary,
  useHubCancelCheck,
  useUpdateAccountProfile,
} from "../team/map-hub-cancel-check.js";
import { Input3 } from "../infra/select-content.jsx";
import { DeleteAccountConfirmDialog } from "../team/delete-account-confirm-dialog.jsx";
import {
  useAuth,
  useIsScrolling,
  useOptionalTeamAccount,
} from "./credit-query-keys.jsx";
import { useTeamContextsQuery } from "../team/use-team-transactions-feed-query.jsx";
import { useRuntimeConfig } from "../generation/use-model-catalog-scope-key.js";
import { RetryIcon, StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { SoftwareUpdateSectionContent } from "../settings/software-update-section-content.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { MemoryManager } from "../settings/memory-manager.jsx";
import { GatewayScopeProvider } from "./gateway-scope-provider.jsx";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import { isCustomModelProvider } from "../text-editor/build-asr-gateway-request.js";
import { CustomProviderForm } from "../settings/custom-provider-form.jsx";
import { useSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import { DataDirectorySettings } from "../settings/data-directory-settings.jsx";
import { DialogPortal } from "../infra/gateway-http-error.jsx";
function useSettingsPanelHeader() {
  return reactExports.useContext(SettingsPanelHeaderContext);
}
function getTopbarActiveWorkspaceSnapshot() {
  return snapshot$2;
}
function subscribeTopbarActiveWorkspaceSnapshot(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function useTopbarActiveWorkspaceSnapshot() {
  return reactExports.useSyncExternalStore(
    subscribeTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
  );
}
function SummaryBlock({ title, children: children2 }) {
  return (
    <div className="rounded-lg bg-secondary p-1.5">
      <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">
        {title}
      </div>
      {children2}
    </div>
  );
}
function DeleteAccountDialog({
  open,
  onOpenChange,
  createdTeams,
  joinedTeams,
}) {
  const { t: t2 } = useTranslation();
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = reactExports.useState(false);
  const summaryQuery = useHailuoWebSummary(open);
  const cancelCheckQuery = useHailuoCancelCheck(open);
  const hubCancelCheckQuery = useHubCancelCheck(open);
  const hailuoBlocked = cancelCheckQuery.data?.canCancel === false;
  const hailuoBlockedReason = cancelCheckQuery.data?.reason ?? null;
  const hubCancelCheck = hubCancelCheckQuery.data;
  const hubCancelAllowed =
    hubCancelCheckQuery.isSuccess && hubCancelCheck?.canDelete === true;
  const blocked = hailuoBlocked || !hubCancelAllowed;
  const hubCancelSettled =
    hubCancelCheckQuery.isSuccess || hubCancelCheckQuery.isError;
  const hubCancelBlocked = hubCancelSettled && !hubCancelAllowed;
  const hubBlockItems = [
    ...(hubCancelCheck?.hasIapSubscription
      ? [t2("account.delete.blockIapSubscription")]
      : []),
    ...(hubCancelCheck?.blockingTeams ?? []).map((team) =>
      t2(
        team.role === "OWNER"
          ? "account.delete.blockTeamOwner"
          : "account.delete.blockTeamMember",
        {
          team: team.groupName,
        },
      ),
    ),
  ];
  const identityKey = useOptionalTeamAccount()?.snapshot?.identityKey ?? null;
  const ownerCreditQueries = useQueries({
    queries: createdTeams.map((team) => ({
      queryKey: ACCOUNT_QUERY_KEYS.deletionPreviewTeamCredit(
        identityKey ?? "",
        team.groupId,
      ),
      queryFn: ({ signal }) =>
        fetchTeamCreditSummaryByGroupId(team.groupId, signal),
      enabled: open && identityKey !== null,
      retry: false,
      staleTime: 3e4,
    })),
  });
  const ownerCreditByGroupId = new Map(
    createdTeams.map((team, index2) => [
      team.groupId,
      ownerCreditQueries[index2]?.data ?? null,
    ]),
  );
  const allTeams = [...createdTeams, ...joinedTeams];
  const hubPlan = hubCancelCheck?.personalSubscriptionPlan || "--";
  const hubCredits = hubCancelCheck?.personalCredits ?? null;
  const hubCreditsNum = hubCredits != null ? Number(hubCredits) : Number.NaN;
  const showHubCredits = Number.isFinite(hubCreditsNum) && hubCreditsNum > 0;
  const hailuoPlan = summaryQuery.data?.subscriptionPlan ?? "--";
  const hailuoCredits = summaryQuery.data?.remainingCredits ?? null;
  const hailuoCreditsNum =
    hailuoCredits != null ? Number(hailuoCredits) : Number.NaN;
  const showHailuoCredits =
    Number.isFinite(hailuoCreditsNum) && hailuoCreditsNum > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        layer="nested"
        className="max-h-[85vh] grid-rows-[auto_1fr_auto]"
        data-action-ui-id="account-delete-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("account.delete.title")}</DialogTitle>
          <DialogDescription>{t2("account.delete.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="scrollbar-fade min-h-0 space-y-2 overflow-y-auto pr-1.5 [scrollbar-gutter:stable]">
          <SummaryBlock title={t2("account.delete.hubPersonalTitle")}>
            <SummaryRow
              label={t2("account.delete.accountName")}
              value={user?.username || "--"}
            />
            <SummaryRow
              label={t2("account.delete.subscriptionPlan")}
              value={hubPlan}
            />
            {showHubCredits && hubCredits !== null && (
              <SummaryRow
                label={t2("account.delete.remainingCredits")}
                value={hubCredits}
              />
            )}
          </SummaryBlock>
          {allTeams.length > 0 && (
            <SummaryBlock title={t2("account.delete.hubTeamsTitle")}>
              {allTeams.map((team) => {
                const ownerCredit =
                  team.role === "OWNER"
                    ? (ownerCreditByGroupId.get(team.groupId)?.teamRemaining ??
                      null)
                    : null;
                const roleLabel = t2(roleLabelKey(team.role));
                return (
                  <SummaryRow
                    key={team.groupId}
                    label={team.displayName}
                    value={
                      ownerCredit !== null
                        ? `${roleLabel} · ${t2("account.delete.teamRemainingCredits")} ${ownerCredit}`
                        : roleLabel
                    }
                  />
                );
              })}
            </SummaryBlock>
          )}
          <SummaryBlock title={t2("account.delete.hailuoTitle")}>
            <SummaryRow
              label={t2("account.delete.subscriptionPlan")}
              value={hailuoPlan}
            />
            {showHailuoCredits && hailuoCredits !== null && (
              <SummaryRow
                label={t2("account.delete.remainingCredits")}
                value={hailuoCredits}
              />
            )}
          </SummaryBlock>
          {hailuoBlocked && (
            <BlockGroup
              title={t2("account.delete.blockGroupHailuo")}
              items={[
                hailuoBlockedReason
                  ? t2("account.delete.blockHailuoReason", {
                      reason: hailuoBlockedReason,
                    })
                  : t2("account.delete.blockHailuoFallback"),
              ]}
            />
          )}
          {hubCancelBlocked && (
            <BlockGroup
              title={t2("account.delete.blockGroupDesign")}
              items={
                hubBlockItems.length > 0
                  ? hubBlockItems
                  : [t2("account.delete.blockCheckUnavailable")]
              }
            />
          )}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            data-action-ui-id="account-delete-dialog.cancel"
          >
            {t2("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={blocked}
            onClick={() => setConfirmOpen(true)}
            data-action-ui-id="account-delete-dialog.confirm"
          >
            {t2("account.delete.confirmButton")}
          </Button>
        </DialogFooter>
        <DeleteAccountConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onDeleted={() => {
            setConfirmOpen(false);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
function InfoRow({ label, value, copyActionId }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm text-foreground">
          {value ?? "--"}
        </span>
        {value ? (
          <CopyIconButton
            value={value}
            label={t2("common.copy")}
            actionId={copyActionId}
          />
        ) : null}
      </div>
    </div>
  );
}
const ACCOUNT_NAME_MIN_LENGTH = 2;
const ACCOUNT_NAME_MAX_LENGTH = 20;
function AccountNameRow({ savedName }) {
  const { t: t2 } = useTranslation();
  const [draft, setDraft] = reactExports.useState(null);
  const updateMutation = useUpdateAccountProfile();
  const handleBlur = () => {
    if (draft === null) return;
    const next2 = draft.trim();
    setDraft(null);
    if (next2 === savedName) return;
    if (next2 === "") {
      dedupedToast.error(t2("settings.account.nameEmptyError"));
      return;
    }
    const length2 = countChars(next2);
    if (
      length2 < ACCOUNT_NAME_MIN_LENGTH ||
      length2 > ACCOUNT_NAME_MAX_LENGTH
    ) {
      dedupedToast.error(t2("settings.account.nameLengthError"));
      return;
    }
    updateMutation.mutate(next2, {
      onError: () =>
        dedupedToast.error(t2("settings.account.nameUpdateFailed")),
    });
  };
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">
        {t2("settings.account.nameLabel")}
      </span>
      <div
        className="flex w-52 min-w-0 items-center gap-1"
        data-action-ui-id="settings-account.name-control"
      >
        {draft === null ? (
          <>
            <span className="min-w-0 flex-1 truncate text-right text-sm text-foreground">
              {savedName || "--"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={updateMutation.isPending}
              aria-label={`${t2("common.edit")} ${t2("settings.account.nameLabel")}`}
              data-action-ui-id="settings-account.edit-name"
              onClick={() => setDraft(savedName)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <Pencil size={13} strokeWidth={1.5} aria-hidden={true} />
            </Button>
          </>
        ) : (
          <>
            <Input3
              autoFocus={true}
              value={draft}
              placeholder={t2("settings.account.namePlaceholder")}
              disabled={updateMutation.isPending}
              data-action-ui-id="settings-account.name-input"
              className="h-7 min-w-0 flex-1 text-right text-sm md:text-sm"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span
              aria-hidden={true}
              className="size-6 shrink-0"
              data-action-ui-id="settings-account.name-edit-slot"
            />
          </>
        )}
      </div>
    </div>
  );
}
function TeamRow({ team }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex h-9 items-center justify-between gap-4 rounded-md px-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {team.displayName}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {t2("team.management.groupId")} {team.groupId}
      </span>
    </div>
  );
}
function AccountSection() {
  const { t: t2 } = useTranslation();
  const { user } = useAuth();
  const profileQuery = useAccountProfile();
  const teamAccount = useOptionalTeamAccount();
  const contextsQuery = useTeamContextsQuery(
    teamAccount?.snapshot?.identityKey ?? null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = reactExports.useState(false);
  const teams = reactExports.useMemo(
    () => groupTeamContexts(contextsQuery.data?.items),
    [contextsQuery.data],
  );
  const hasTeams = teams.created.length > 0 || teams.joined.length > 0;
  const account = profileQuery.data?.account || null;
  const uid2 = profileQuery.data?.uid || user?.userID || null;
  const userName = profileQuery.data?.user_name || user?.username || "";
  return (
    <div className="space-y-3">
      <SettingGroup title={t2("settings.account.infoTitle")}>
        <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
          <AccountNameRow savedName={userName} />
          <InfoRow
            label={t2("settings.account.accountLabel")}
            value={account}
            copyActionId="settings-account.copy-account"
          />
          <InfoRow
            label={t2("settings.account.uidLabel")}
            value={uid2}
            copyActionId="settings-account.copy-uid"
          />
        </div>
      </SettingGroup>
      <SettingGroup title={t2("settings.account.teamsTitle")}>
        {hasTeams ? (
          <div className="space-y-2">
            {teams.created.length > 0 && (
              <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
                <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">
                  {t2("settings.account.createdTeams")}
                </div>
                {teams.created.map((team) => (
                  <TeamRow key={team.groupId} team={team} />
                ))}
              </div>
            )}
            {teams.joined.length > 0 && (
              <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
                <div className="px-2.5 pt-1.5 pb-0.5 text-xs text-muted-foreground">
                  {t2("settings.account.joinedTeams")}
                </div>
                {teams.joined.map((team) => (
                  <TeamRow key={team.groupId} team={team} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-secondary p-1.5">
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              {t2("settings.account.noTeams")}
            </p>
          </div>
        )}
      </SettingGroup>
      <SettingGroup title={t2("settings.account.deleteTitle")}>
        <SettingRow
          label={t2("settings.account.deleteLabel")}
          description={t2("settings.account.deleteDescription")}
        >
          <Button
            variant="destructive"
            size="sm"
            data-action-ui-id="settings-account.delete-account"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t2("settings.account.deleteButton")}
          </Button>
        </SettingRow>
      </SettingGroup>
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        createdTeams={teams.created}
        joinedTeams={teams.joined}
      />
    </div>
  );
}
const PROXY_MODES = ["auto", "direct", "system"];
function NetworkSection() {
  const { t: t2 } = useTranslation();
  const [mode2, setMode] = reactExports.useState("auto");
  const requestRevisionRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    let mounted = true;
    const revision = requestRevisionRef.current;
    getNetworkDiagnosticsMainService()
      .getProxyMode()
      .then((m3) => {
        if (mounted && requestRevisionRef.current === revision) setMode(m3);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  if (!isElectron()) return null;
  const handleChange = async (value) => {
    const revision = ++requestRevisionRef.current;
    const next2 = value;
    const prev = mode2;
    setMode(next2);
    try {
      const result =
        await getNetworkDiagnosticsMainService().setProxyMode(next2);
      if (requestRevisionRef.current !== revision) return;
      if (result.success) {
        setMode(result.mode);
        dedupedToast.success(t2("settings.network.proxyModeSaved"));
      } else {
        setMode(prev);
        dedupedToast.error(t2("settings.network.proxyModeFailed"));
      }
    } catch {
      if (requestRevisionRef.current !== revision) return;
      setMode(prev);
      dedupedToast.error(t2("settings.network.proxyModeFailed"));
    }
  };
  return (
    <div className="space-y-4">
      <SettingGroup title={t2("settings.network.proxyGroup")}>
        <SettingRow
          label={t2("settings.network.proxyMode")}
          description={t2("settings.network.proxyModeDesc")}
        >
          <SettingsSelect
            value={mode2}
            onValueChange={(v2) => void handleChange(v2)}
            options={PROXY_MODES.map((m3) => ({
              value: m3,
              label: t2(`settings.network.proxyMode.${m3}`),
            }))}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}
function SettingsPanelHeaderProvider({
  children: children2,
  setHeaderOverride,
}) {
  return (
    <SettingsPanelHeaderContext.Provider
      value={{
        setHeaderOverride,
      }}
    >
      {children2}
    </SettingsPanelHeaderContext.Provider>
  );
}
function ImBridgeSection() {
  const { setHeaderOverride } = useSettingsPanelHeader();
  const { accounts } = useImAccounts();
  const openTrackedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
      source: "settings",
      has_account: accounts.length > 0,
    });
  }, [accounts.length]);
  return (
    <div className="flex min-h-[calc(min(620px,80vh)-5.5rem)] flex-col [&>div]:flex-1">
      <ImBridgeManager
        layout="settings"
        onDialogHeaderChange={setHeaderOverride}
      />
    </div>
  );
}
function getUpdateSettingsBadgeLabel(phase, t2) {
  switch (phase) {
    case "available":
    case "downloaded":
      return t2("settings.softwareUpdate.badgeNew");
    case "downloading":
      return t2("settings.softwareUpdate.badgeDownloading");
    default:
      return null;
  }
}
const bootSettingValues = new Map();
function useBootSettingValue(key2, currentValue) {
  const [bootValue] = reactExports.useState(() => {
    if (!bootSettingValues.has(key2)) {
      bootSettingValues.set(key2, currentValue);
    }
    return bootSettingValues.get(key2);
  });
  return bootValue;
}
function AdvancedSection() {
  const { t: t2 } = useTranslation();
  const { config: config2, setMany } = useSettings();
  const disableGpu = config2.disableGpu ?? false;
  const bootDisableGpu = useBootSettingValue("disableGpu", disableGpu);
  if (!isElectron()) return null;
  const gpuNeedsRestart = disableGpu !== bootDisableGpu;
  const handleDisableGpuChange = async (checked) => {
    await setMany({
      disableGpu: checked,
      gpuDisableReason: checked ? "user-preference" : void 0,
    });
  };
  return (
    <div className="space-y-4">
      <SettingGroup>
        <SettingRow
          label={t2("settings.disableGpu")}
          description={t2("settings.disableGpuDesc")}
        >
          <Switch
            checked={disableGpu}
            onCheckedChange={(checked) => void handleDisableGpuChange(checked)}
          />
        </SettingRow>
        {gpuNeedsRestart && <RestartBanner />}
      </SettingGroup>
      <DiagnosticsGroup />
      <FolderWhitelistSection />
    </div>
  );
}
function MemorySection() {
  const routerSearch = useRouterState({
    select: (s2) => s2.location.search,
  });
  const { setHeaderOverride } = useSettingsPanelHeader();
  const routeWorkspaceId =
    normalizeWorkspaceId(routerSearch?.workspaceId) ?? null;
  const activeWorkspaceSnapshot = useTopbarActiveWorkspaceSnapshot();
  const currentWorkspaceId =
    routeWorkspaceId ?? activeWorkspaceSnapshot.currentWorkspaceId;
  const hiloApp2 = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const runtimeFromLookup = useActiveRuntime(currentWorkspaceId, hiloApp2);
  const runtimeFromTopbar =
    activeWorkspaceSnapshot.activeRuntime?.workspaceId === currentWorkspaceId
      ? activeWorkspaceSnapshot.activeRuntime
      : null;
  const activeRuntime = runtimeFromLookup ?? runtimeFromTopbar;
  const [recovered, setRecovered] = reactExports.useState(null);
  const effectiveRuntime =
    recovered?.sourceRuntime === activeRuntime &&
    recovered.runtime.workspaceId === currentWorkspaceId
      ? recovered.runtime
      : activeRuntime;
  const recoverWorkspaceBinding = reactExports.useCallback(async () => {
    if (!currentWorkspaceId) return void 0;
    const next2 = await hiloApp2.getWorkspaceRuntime(currentWorkspaceId);
    if (!next2?.gatewayBinding) return void 0;
    setRecovered({
      sourceRuntime: activeRuntime,
      runtime: next2,
    });
    return next2.gatewayBinding;
  }, [activeRuntime, currentWorkspaceId, hiloApp2]);
  return (
    <GatewayScopeProvider
      gatewayUrl={effectiveRuntime?.gatewayUrl}
      gatewayBinding={effectiveRuntime?.gatewayBinding}
      scopeKey={currentWorkspaceId ?? void 0}
      workspaceClaim={effectiveRuntime?.workspaceClaim}
      recoverWorkspace={currentWorkspaceId ? recoverWorkspaceBinding : void 0}
    >
      <CurrentWorkspaceContext.Provider
        value={effectiveRuntime?.folderPath ?? ""}
      >
        <MemoryManager onHeaderChange={setHeaderOverride} />
      </CurrentWorkspaceContext.Provider>
    </GatewayScopeProvider>
  );
}
function SoftwareUpdateUnavailableSection() {
  const { t: t2 } = useTranslation();
  const runtimeConfig = useRuntimeConfig();
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg bg-secondary/60 p-2"
        data-action-ui-id="settings.software-update.status-card"
      >
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground"
            data-action-ui-id="settings.software-update.status-icon-bg"
          >
            <AlertCircle size={18} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-normal text-foreground">
              {t2("settings.softwareUpdate.unavailableTitle")}
            </p>
            <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">
              {t2("settings.softwareUpdate.unavailableDesc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {t2("settings.softwareUpdate.currentVersion", {
                version: `v${runtimeConfig.appVersion}`,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 font-normal"
              disabled={true}
              data-action-ui-id="settings.software-update.unavailable"
            >
              <RetryIcon size={14} />
              {t2("update.version.checkCta")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
function SoftwareUpdateSection() {
  const updater = useOptionalUpdaterContext();
  if (!updater) return <SoftwareUpdateUnavailableSection />;
  return <SoftwareUpdateSectionContent />;
}
const SECTIONS = [
  {
    id: "general",
    icon: Settings2,
    labelKey: "settings.general",
  },
  {
    id: "account",
    icon: CircleUserRound,
    labelKey: "settings.account.title",
  },
  {
    id: "storage",
    icon: HardDrive,
    labelKey: "settings.storageSection",
  },
  {
    id: "network",
    icon: Globe,
    labelKey: "settings.networkSection",
  },
  {
    id: "models",
    icon: Bot,
    labelKey: "settings.models.title",
  },
  {
    id: "memory",
    icon: Brain,
    labelKey: "settings.memory",
  },
  {
    id: "imBridge",
    icon: Smartphone,
    labelKey: (region) => `imBridge.title.${region}`,
  },
  {
    id: "assetCenter",
    icon: Library,
    labelKey: "settings.assetCenter.title",
  },
  {
    id: "comfyui",
    icon: Blocks,
    labelKey: "settings.comfyui.title",
  },
  {
    id: "advanced",
    icon: SlidersHorizontal,
    labelKey: "settings.advanced",
  },
  {
    id: "softwareUpdate",
    icon: CircleArrowUp,
    labelKey: "settings.softwareUpdate.title",
  },
];
function AssetCenterSection() {
  const { t: t2 } = useTranslation();
  const {
    status,
    busy,
    needsRestart,
    error,
    handleBrowse,
    handleReset,
    pendingSwitch,
    dialogError,
    confirmMigrate,
    confirmSwitchOnly,
    cancelSwitch,
  } = useAssetCenterSettings();
  if (!status) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        {t2("settings.assetCenter.loading")}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <SettingGroup>
        <SettingRow
          label={t2("settings.assetCenter.directory")}
          description={
            status.isCustomDirectory
              ? t2("settings.assetCenter.directoryDescCustom")
              : t2("settings.assetCenter.directoryDescDefault")
          }
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => void handleBrowse()}
              disabled={
                busy || needsRestart || status.dataDirectoryChangePending
              }
              data-action-ui-id="settings-asset-center-browse"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LocalFolderIcon />
              )}
              {t2("settings.assetCenter.browse")}
            </Button>
            {status.isCustomDirectory && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-normal text-muted-foreground"
                onClick={() => void handleReset()}
                disabled={
                  busy || needsRestart || status.dataDirectoryChangePending
                }
                data-action-ui-id="settings-asset-center-reset"
              >
                {t2("settings.assetCenter.reset")}
              </Button>
            )}
          </div>
        </SettingRow>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Icon
            icon={Folder}
            size="md"
            className="shrink-0 text-muted-foreground"
          />
          <p
            className="truncate text-xs text-muted-foreground"
            title={status.directory}
          >
            {status.directory}
          </p>
        </div>
      </SettingGroup>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      {status.dataDirectoryChangePending && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            {t2("settings.assetCenter.dataDirectoryChangePending")}
          </p>
        </div>
      )}
      {status.currentRootUnavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            {t2("settings.assetCenter.currentLocationUnavailable")}
          </p>
        </div>
      )}
      {needsRestart && (
        <RestartBanner message={t2("settings.assetCenter.restartRequired")} />
      )}
      <AssetCenterMigrateDialog
        open={pendingSwitch !== null}
        fromPath={pendingSwitch?.from ?? ""}
        toPath={pendingSwitch?.to ?? ""}
        targetHasContent={pendingSwitch?.targetHasContent ?? false}
        sourceUnavailable={pendingSwitch?.sourceUnavailable ?? false}
        busy={busy}
        error={dialogError}
        onMigrate={() => void confirmMigrate()}
        onSwitchOnly={() => void confirmSwitchOnly()}
        onCancel={cancelSwitch}
      />
    </div>
  );
}
const LAUNCH_ARGS_PATH = "/api/comfyui/launch-args";
function parseArgs(text2) {
  return text2
    .split(/\s+/)
    .map((token2) => token2.trim())
    .filter(Boolean);
}
function ComfyUiSection() {
  const { t: t2 } = useTranslation();
  const [text2, setText] = reactExports.useState("");
  const [savedText, setSavedText] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await gatewayFetch(LAUNCH_ARGS_PATH);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data2 = await res.json();
        if (cancelled) return;
        const joined = (data2.args ?? []).join("\n");
        setText(joined);
        setSavedText(joined);
      } catch (error) {
        comfyuiLog.warn("launch-args load failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleSave = reactExports.useCallback(async () => {
    setSaving(true);
    try {
      const args = parseArgs(text2);
      const res = await gatewayFetch(LAUNCH_ARGS_PATH, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          args,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const data2 = await res.json();
      const joined = (data2.args ?? []).join("\n");
      setText(joined);
      setSavedText(joined);
      dedupedToast.success(t2("settings.comfyui.saved"));
    } catch (error) {
      comfyuiLog.error("launch-args save failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      dedupedToast.error(t2("settings.comfyui.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [text2, t2]);
  if (!isElectron()) return null;
  const dirty = text2 !== savedText;
  return (
    <div className="space-y-4">
      <SettingGroup>
        <div className="py-2.5">
          <p className="text-sm font-normal text-foreground">
            {t2("settings.comfyui.launchArgs")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t2("settings.comfyui.launchArgsDesc")}
          </p>
        </div>
        <Textarea
          value={text2}
          onChange={(event) => setText(event.target.value)}
          placeholder={t2("settings.comfyui.launchArgsPlaceholder")}
          disabled={loading || saving}
          spellCheck={false}
          rows={5}
          className="font-mono"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            {t2("settings.comfyui.restartHint")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal"
            disabled={loading || saving || !dirty}
            onClick={() => void handleSave()}
          >
            {t2("settings.comfyui.save")}
          </Button>
        </div>
      </SettingGroup>
    </div>
  );
}
function ShortcutList({ children: children2 }) {
  return (
    <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">{children2}</div>
  );
}
function ShortcutRow({ label, keys: keys2 }) {
  const keyParts = splitShortcutKeys(keys2);
  const keyCounts = new Map();
  const keyCaps = keyParts.map((key2) => {
    const count2 = keyCounts.get(key2) ?? 0;
    keyCounts.set(key2, count2 + 1);
    return {
      id: count2 === 0 ? key2 : `${key2}-${count2}`,
      label: key2,
    };
  });
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 rounded-md px-3 py-1.5">
      <span className="min-w-0 truncate text-xs text-foreground">{label}</span>
      <KbdGroup className="shrink-0 gap-1.5" aria-label={keys2}>
        {keyCaps.map((keyCap) => (
          <ShortcutKeycap
            key={keyCap.id}
            token={keyCap.label}
            className="h-6 min-w-6 rounded-md border border-border bg-background px-1.5 font-sans text-[11px] font-medium text-foreground/70"
          />
        ))}
      </KbdGroup>
    </div>
  );
}
function GeneralSection() {
  const { t: t2 } = useTranslation();
  const {
    config: config2,
    set: set2,
    openNotificationSettings,
  } = useSettings();
  const runtimeConfig = getRuntimeConfig();
  const electron = isElectron();
  const isMac2 = isMacPlatform();
  const { app: platformApp } = usePlatform();
  const removeWatermarkChecked = !(config2.watermarkEnabled ?? true);
  return (
    <div className="space-y-2">
      <SettingGroup>
        <SettingRow
          label={t2("settings.language")}
          description={t2("settings.languageDesc")}
        >
          <SettingsSelect
            value={config2.language}
            onValueChange={async (v2) => {
              await set2("language", v2);
            }}
            options={[
              {
                value: "en",
                label: "English",
              },
              {
                value: "zh",
                label: "中文",
              },
            ]}
            className="w-32"
          />
        </SettingRow>
        <SettingRow
          label={t2("settings.theme")}
          description={t2("settings.themeDesc")}
        >
          <SettingsSelect
            value={config2.theme}
            onValueChange={(value) => void set2("theme", value)}
            className="w-32"
            options={[
              {
                value: "light",
                label: t2("settings.themeLight"),
                icon: Sun,
              },
              {
                value: "dark",
                label: t2("settings.themeDark"),
                icon: Moon,
              },
              {
                value: "system",
                label: t2("settings.themeSystem"),
                icon: Monitor,
              },
            ]}
          />
        </SettingRow>
        <SettingRow
          label={t2("settings.islandLayout")}
          description={t2("settings.islandLayoutDesc")}
        >
          <Switch
            checked={config2.islandLayout}
            onCheckedChange={(checked) => void set2("islandLayout", checked)}
          />
        </SettingRow>
        {electron && runtimeConfig.transparentWindowSupported && (
          <SettingRow
            label={t2("settings.transparentWindowExperiment")}
            description={t2("settings.transparentWindowExperimentDesc")}
          >
            <Switch
              checked={config2.transparentWindowExperiment ?? false}
              onCheckedChange={(checked) =>
                void set2("transparentWindowExperiment", checked)
              }
              data-action-ui-id="settings.transparent-window-experiment-toggle"
            />
          </SettingRow>
        )}
        <SettingRow
          label={t2("settings.removeWatermark")}
          description={t2("settings.removeWatermarkDesc")}
        >
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={removeWatermarkChecked}
              onCheckedChange={(checked) =>
                void set2("watermarkEnabled", !checked)
              }
              data-action-ui-id="settings.remove-watermark-toggle"
            />
            <span
              className="whitespace-nowrap text-xs text-muted-foreground"
              aria-live="polite"
            >
              {t2("settings.watermarkStatusCurrent", {
                status: t2(
                  removeWatermarkChecked
                    ? "settings.watermarkStatusOff"
                    : "settings.watermarkStatusOn",
                ),
              })}
            </span>
          </div>
        </SettingRow>
      </SettingGroup>
      {electron && (
        <SettingGroup title={t2("settings.groupSystem")}>
          {platformApp.os === "win32" && (
            <SettingRow
              label={t2("settings.windowCloseBehavior")}
              description={t2("settings.windowCloseBehaviorDesc")}
            >
              <SettingsSelect
                value={
                  config2.windowCloseBehavior === "tray" ||
                  config2.windowCloseBehavior === "quit"
                    ? config2.windowCloseBehavior
                    : "ask"
                }
                onValueChange={(value) => {
                  if (value === "ask" || value === "tray" || value === "quit") {
                    void set2("windowCloseBehavior", value);
                  }
                }}
                options={[
                  {
                    value: "ask",
                    label: t2("settings.windowCloseAsk"),
                  },
                  {
                    value: "tray",
                    label: t2("settings.windowCloseTray"),
                  },
                  {
                    value: "quit",
                    label: t2("settings.windowCloseQuit"),
                  },
                ]}
                className="w-40"
                aria-label={t2("settings.windowCloseBehavior")}
                data-action-ui-id="settings.window-close-behavior"
              />
            </SettingRow>
          )}
          <SettingRow
            label={t2("settings.autoStart")}
            description={t2("settings.autoStartDesc")}
          >
            <Switch
              checked={config2.runOnStartup}
              onCheckedChange={(checked) => void set2("runOnStartup", checked)}
            />
          </SettingRow>
          <SettingRow
            label={t2("settings.tray")}
            description={t2("settings.trayDesc")}
          >
            <Switch
              checked={config2.menuBarVisible}
              onCheckedChange={(checked) =>
                void set2("menuBarVisible", checked)
              }
            />
          </SettingRow>
          <SettingRow
            label={t2("settings.preventSleep")}
            description={t2("settings.preventSleepDesc")}
          >
            <Switch
              checked={config2.preventSleep ?? false}
              onCheckedChange={(checked) => void set2("preventSleep", checked)}
            />
          </SettingRow>
          <SettingRow
            label={t2("settings.notifications")}
            description={t2("settings.notificationsDesc")}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => void openNotificationSettings()}
            >
              <Bell size={14} strokeWidth={1.5} />
              {t2("settings.openSystemPrefs")}
            </Button>
          </SettingRow>
        </SettingGroup>
      )}
      <SettingGroup title={t2("settings.shortcuts")}>
        <ShortcutList>
          {Object.values(SHORTCUT_DEFS).map((def) => (
            <ShortcutRow
              key={def.labelKey}
              label={t2(def.labelKey)}
              keys={isMac2 ? def.macDisplay : def.otherDisplay}
            />
          ))}
        </ShortcutList>
      </SettingGroup>
    </div>
  );
}
function InstallLocationSettings() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { region } = useRuntimeConfig();
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const { data: info2 } = useQuery({
    queryKey: ["settings", "install-location"],
    queryFn: () => getDesktopSettingsMainService().getInstallLocationInfo(),
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (!info2?.supported) return null;
  const handleDownload = () => {
    setDialogOpen(false);
    void openExternalUrl(platform2, getDesignDownloadUrl(region), {
      source: "settings-install-location",
    });
  };
  return (
    <>
      <SettingRow
        label={t2("settings.storage.installLocation")}
        description={
          info2.isDefaultLocation
            ? t2("settings.storage.installLocationDefault")
            : info2.installDir
        }
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          onClick={() => setDialogOpen(true)}
          data-action-ui-id="settings-storage-change-install-location"
        >
          <HardDrive size={14} strokeWidth={1.5} />
          {t2("settings.storage.changeInstallLocation")}
        </Button>
      </SettingRow>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          size="sm"
          data-action-ui-id="settings-install-location-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {t2("settings.storage.changeInstallLocation")}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                {t2("settings.storage.changeInstallLocationSteps")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t2("settings.storage.changeInstallLocationSafety")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              {t2("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              data-action-ui-id="settings-install-location-download"
            >
              {t2("settings.storage.goToDownload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function StorageSection() {
  if (!isElectron()) return null;
  return (
    <>
      <DataDirectorySettings />
      <InstallLocationSettings />
    </>
  );
}
function getCustomModelProviders(config2) {
  const providers = config2.customModels ?? {};
  if (Object.keys(providers).some((id2) => !isCustomModelProvider(id2)))
    throw new Error("Invalid custom provider identity");
  return providers;
}
const DREAMINA_SKILL_NAME = "dreamina-cli";
const LIBTV_CONNECTOR_ID = "libtv";
function CustomModelSection() {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const { closeSettings } = useSettingsDialog();
  const { config: config2, saveCustomModel } = useSettings();
  const isOverseas = getRuntimeConfig().region === "overseas";
  const providers = getCustomModelProviders(config2);
  const [editing, setEditing] = reactExports.useState(null);
  const [communityOpen, setCommunityOpen] = reactExports.useState(false);
  if (editing !== null) {
    return (
      <CustomProviderForm
        key={editing ?? "new"}
        stored={editing ? providers[editing] : void 0}
        onCancel={() => setEditing(null)}
        onSave={async (input) => {
          const success = await saveCustomModel(input, editing);
          if (success) setEditing(null);
          return success;
        }}
      />
    );
  }
  const handleOpenDreaminaSkill = () => {
    closeSettings();
    void navigate({
      to: "/skills",
      search: {
        capability: "skills",
        tab: "community",
        skillName: DREAMINA_SKILL_NAME,
      },
    });
  };
  const handleOpenLibtvConnector = () => {
    closeSettings();
    void navigate({
      to: "/skills",
      search: {
        capability: "connectors",
        connectorId: LIBTV_CONNECTOR_ID,
      },
    });
  };
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted-foreground">
        {t2(
          isOverseas
            ? "settings.models.description.overseas"
            : "settings.models.description.domestic",
        )}{" "}
        {!isOverseas ? (
          <Button
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => setCommunityOpen(true)}
            data-action-ui-id="settings-models.open-community-generation"
          >
            {t2("settings.models.community.entry")}
          </Button>
        ) : null}
      </p>
      <Button
        variant="outline"
        onClick={() => setEditing(void 0)}
        data-action-ui-id="settings-models.add-provider"
      >
        <Plus className="size-4" strokeWidth={1.5} />
        {t2("settings.models.addProvider")}
      </Button>
      <div className="space-y-2">
        {Object.entries(providers).map(([id2, provider]) => (
          <div
            key={id2}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">
                {provider.providerName || t2("settings.models.customProvider")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {provider.baseUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                {t2("settings.models.modelCount", {
                  count: provider.models.length,
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(id2)}
              aria-label={t2("settings.models.editProviderNamed", {
                name:
                  provider.providerName || t2("settings.models.customProvider"),
              })}
              data-action-ui-id="settings-models.edit-provider"
              data-provider-id={id2}
            >
              {t2("settings.models.editProvider")}
            </Button>
          </div>
        ))}
      </div>
      {!isOverseas ? (
        <Dialog open={communityOpen} onOpenChange={setCommunityOpen}>
          <DialogContent size="md" layer="nested">
            <DialogHeader>
              <DialogTitle>{t2("settings.models.community.title")}</DialogTitle>
              <DialogDescription>
                {t2("settings.models.community.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <div className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t2("settings.models.community.dreamina.title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t2("settings.models.community.dreamina.meta")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t2("settings.models.community.dreamina.description")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDreaminaSkill}
                  data-action-ui-id="settings-models.open-dreamina-skill"
                >
                  {t2("settings.models.community.dreamina.action")}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                </Button>
              </div>
              <div className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Cable size={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t2("settings.models.community.libtv.title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t2("settings.models.community.libtv.meta")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t2("settings.models.community.libtv.description")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenLibtvConnector}
                  data-action-ui-id="settings-models.open-libtv-connector"
                >
                  {t2("settings.models.community.libtv.action")}
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
const SECTION_COMPONENTS = {
  general: GeneralSection,
  account: AccountSection,
  storage: StorageSection,
  network: NetworkSection,
  models: CustomModelSection,
  memory: MemorySection,
  imBridge: ImBridgeSection,
  assetCenter: AssetCenterSection,
  comfyui: ComfyUiSection,
  advanced: AdvancedSection,
  softwareUpdate: SoftwareUpdateSection,
};
function resolveSectionLabelKey(section, region) {
  return typeof section.labelKey === "function"
    ? section.labelKey(region)
    : section.labelKey;
}
export function SettingsDialog({
  open,
  onOpenChange,
  initialSection = "general",
}) {
  const { t: t2 } = useTranslation();
  const updater = useOptionalUpdaterContext();
  const isOverseas = getRuntimeConfig().region === "overseas";
  const regionSuffix = isOverseas ? "overseas" : "domestic";
  const initialActiveSection =
    isOverseas && initialSection === "imBridge" ? "general" : initialSection;
  const [activeSection, setActiveSection] =
    reactExports.useState(initialActiveSection);
  const updateBadgeLabel = getUpdateSettingsBadgeLabel(
    updater?.state.phase,
    t2,
  );
  const activeSectionMeta =
    SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const [headerOverride, setHeaderOverride] = reactExports.useState(null);
  const contentScrollRef = reactExports.useRef(null);
  const isSecondaryPage = Boolean(headerOverride?.onBack);
  const previousSecondaryPageRef = reactExports.useRef(isSecondaryPage);
  const [contentMotion, setContentMotion] = reactExports.useState("none");
  const isContentScrolling = useIsScrolling({
    scrollRef: contentScrollRef,
  });
  reactExports.useEffect(() => {
    if (open) {
      setActiveSection(initialActiveSection);
      setHeaderOverride(null);
    }
  }, [initialActiveSection, open]);
  reactExports.useEffect(() => {
    if (previousSecondaryPageRef.current === isSecondaryPage) return;
    setContentMotion(isSecondaryPage ? "forward" : "back");
    previousSecondaryPageRef.current = isSecondaryPage;
    const timer2 = window.setTimeout(() => setContentMotion("none"), 180);
    return () => window.clearTimeout(timer2);
  }, [isSecondaryPage]);
  const SectionComponent = reactExports.useMemo(
    () => SECTION_COMPONENTS[activeSection],
    [activeSection],
  );
  const activeSectionLabel = t2(
    resolveSectionLabelKey(activeSectionMeta, regionSuffix),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop
          data-slot="dialog-overlay"
          className="modal-mask fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPopup
          data-action-ui-id="settings-dialog"
          className="elevated-surface-border fixed top-1/2 left-1/2 z-50 flex h-[min(620px,80vh)] w-full max-w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-modal-shell p-1 text-popover-foreground shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [&_[data-slot=button]]:rounded-md [&_[data-slot=input]]:rounded-md [&_[data-slot=select-trigger]]:rounded-md"
        >
          <DialogDescription$2 className="sr-only">
            {t2("settings.title")}
          </DialogDescription$2>
          <aside className="flex w-52 shrink-0 flex-col rounded-md p-2">
            <div className="px-2 pb-4">
              <DialogTitle$2 className="pt-4 font-heading text-sm font-normal text-muted-foreground">
                {t2("settings.title")}
              </DialogTitle$2>
            </div>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((section) => {
                const Icon2 = section.icon;
                const isActive2 = activeSection === section.id;
                const isImBridgeDisabled =
                  isOverseas && section.id === "imBridge";
                return (
                  <button
                    key={section.id}
                    type="button"
                    data-action-ui-id={`settings-${section.id}`}
                    disabled={isImBridgeDisabled}
                    title={
                      isImBridgeDisabled ? t2("common.comingSoon") : void 0
                    }
                    onClick={() => {
                      if (isImBridgeDisabled) return;
                      setHeaderOverride(null);
                      setActiveSection(section.id);
                    }}
                    className={cn(
                      "list-row-hit-area [--list-row-gap:4px] first:before:top-0 last:before:bottom-0 flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-normal transition-colors",
                      isActive2
                        ? "bg-foreground/[0.06] text-foreground"
                        : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
                      "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60",
                      isImBridgeDisabled &&
                        "hover:bg-transparent hover:text-muted-foreground",
                    )}
                  >
                    <Icon2
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 text-current"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {t2(resolveSectionLabelKey(section, regionSuffix))}
                    </span>
                    {section.id === "softwareUpdate" && updateBadgeLabel && (
                      <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-brand-accent px-1.5 text-[10px] font-medium leading-none text-brand-accent-foreground">
                        {updateBadgeLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
          <section className="ml-2 flex min-w-0 flex-1 flex-col rounded-lg bg-modal-content">
            <div className="relative h-16 shrink-0 px-5">
              {headerOverride?.onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className={`absolute top-4 left-3 size-11 ${dialogChromeButtonClassName}`}
                  onClick={headerOverride.onBack}
                  disabled={headerOverride.backDisabled}
                  data-action-ui-id="settings-dialog.back"
                >
                  <StrokeIcon icon={ChevronLeftIcon} size={24} />
                  <span className="sr-only">
                    {headerOverride.backLabel ?? t2("common.back")}
                  </span>
                </Button>
              )}
              <h2
                className={cn(
                  "min-w-0 truncate pt-6 pr-16 font-heading text-lg font-medium text-foreground",
                  headerOverride?.onBack && "pl-10",
                )}
              >
                {headerOverride?.title ?? activeSectionLabel}
              </h2>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className={`absolute top-1 right-1 size-11 ${dialogChromeButtonClassName}`}
                    data-action-ui-id="settings-dialog.close"
                  />
                }
              >
                <StrokeIcon icon={XIcon} size={24} />
                <span className="sr-only">{t2("common.close")}</span>
              </DialogClose>
            </div>
            <div
              ref={contentScrollRef}
              data-action-ui-id="settings-dialog.content-scroll"
              data-scrolling={isContentScrolling ? "true" : void 0}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1.5 mr-0.5 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/0! [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-300! [&::-webkit-scrollbar-thumb]:ease-in-out! [&[data-scrolling=true]::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!"
            >
              <div
                className={cn(
                  "px-5 pt-1 pb-5",
                  contentMotion !== "none" &&
                    "duration-150 animate-in fade-in-0",
                  contentMotion === "forward" && "slide-in-from-right-4",
                  contentMotion === "back" && "slide-in-from-left-4",
                )}
              >
                <SettingsPanelHeaderProvider
                  setHeaderOverride={setHeaderOverride}
                >
                  <SectionComponent />
                </SettingsPanelHeaderProvider>
              </div>
            </div>
          </section>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
