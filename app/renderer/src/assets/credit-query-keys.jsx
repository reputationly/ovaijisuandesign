// credit-query-keys.jsx
import { visiblePreviewTabsStore } from "../workspace/create-visible-preview-tabs-store.js";
import {
  DEFAULT_CANVAS_RENDER_POLICY,
  snapshot$3,
} from "../infra/use-plugin-metadata-store.js";
import { canUseDebugTooling } from "../workspace/use-deep-link-router.js";
import { getWorkspaceContentBudgetSnapshot } from "../infra/aggregate-snapshots.js";
import {
  dedupedToast,
  DialogPortal$2,
  instance,
  PopoverRoot,
  reactExports,
  SelectRoot,
  workspaceLog,
} from "../vendor.js";
import { showVisiblePreviewTab } from "../workspace/show-visible-preview-tab.js";
import { __jsx } from "../shared/jsx-runtime.js";

function resolveCanvasRenderPolicy(platform2, override = {}) {
  const isMacX64Canary =
    platform2?.os === "darwin" &&
    platform2.arch === "x64" &&
    platform2.runningUnderARM64Translation === false;
  const contentVisibility =
    override.contentVisibility ?? (isMacX64Canary ? "visible" : "auto");
  const recoverAfterResume = override.recoverAfterResume ?? isMacX64Canary;
  const reason =
    override.contentVisibility === "visible"
      ? "runtime-forced-visible"
      : override.contentVisibility === "auto"
        ? "runtime-forced-auto"
        : isMacX64Canary
          ? "mac-x64-canary"
          : "default";
  if (
    contentVisibility === DEFAULT_CANVAS_RENDER_POLICY.contentVisibility &&
    recoverAfterResume === DEFAULT_CANVAS_RENDER_POLICY.recoverAfterResume &&
    reason === DEFAULT_CANVAS_RENDER_POLICY.reason
  ) {
    return DEFAULT_CANVAS_RENDER_POLICY;
  }
  return {
    ...DEFAULT_CANVAS_RENDER_POLICY,
    contentVisibility,
    recoverAfterResume,
    reason,
  };
}

function getCanvasRenderDiagnosticsSnapshot() {
  return {
    ...snapshot$3,
    ...(snapshot$3.lastRecovery
      ? {
          lastRecovery: {
            ...snapshot$3.lastRecovery,
          },
        }
      : {}),
  };
}

export function hideVisiblePreviewTabs(workspaceIds) {
  visiblePreviewTabsStore.hide(workspaceIds);
}

export function resolveDesktopCanvasRenderPolicy(platform2, runtimeConfig) {
  return resolveCanvasRenderPolicy(platform2, {
    contentVisibility: runtimeConfig.canvasContentVisibilityOverride,
    recoverAfterResume: runtimeConfig.canvasResumeRecoveryEnabled,
  });
}

const READY_TIMEOUT_MS$1 = 5e3;

const READY_POLL_MS = 50;

function whenReactScanReady() {
  if (window.reactScan) return Promise.resolve(window.reactScan);
  return new Promise((resolve) => {
    let waited = 0;
    const timer2 = setInterval(() => {
      if (window.reactScan) {
        clearInterval(timer2);
        resolve(window.reactScan);
        return;
      }
      waited += READY_POLL_MS;
      if (waited >= READY_TIMEOUT_MS$1) {
        clearInterval(timer2);
        resolve(null);
      }
    }, READY_POLL_MS);
  });
}

export async function applyReactScan(enabled) {
  if (!canUseDebugTooling()) return;
  if (!enabled && !window.reactScan) return;
  const reactScan = await whenReactScanReady();
  if (!reactScan) {
    if (enabled) {
      console.info(
        "[react-scan] overlay not loaded — restart the dev server with HILO_REACT_SCAN=1 pnpm dev to enable it.",
      );
    }
    return;
  }
  try {
    reactScan({
      enabled,
      showToolbar: enabled,
    });
  } catch {}
}

export const recentSlowMeasures = [];

export const recentLongTasks = [];

function getRecentSlowMeasures() {
  return [...recentSlowMeasures];
}

function getRecentLongTasks() {
  return recentLongTasks.map((entry) => ({
    ...entry,
  }));
}

export const ASSETS_QUERY_KEY = ["assets"];

export const FILE_CONTENT_QUERY_KEY = ["file-content"];

export const assetEventStateByWorkspace = new Map();

export function getAssetEventStateSnapshot() {
  return Object.fromEntries(assetEventStateByWorkspace.entries());
}

export function scopedAssetsQueryKey(gatewayScopeKey) {
  return [...ASSETS_QUERY_KEY, gatewayScopeKey];
}

function scopedFileContentQueryKey(gatewayScopeKey, path2) {
  return [...FILE_CONTENT_QUERY_KEY, gatewayScopeKey, path2];
}

export async function refreshFileContent({ qc, gatewayScopeKey, path: path2 }) {
  await qc.invalidateQueries({
    queryKey: scopedFileContentQueryKey(gatewayScopeKey, path2),
  });
}

export const MAX_RECENT_TRACES = 50;

export const tracesByClientId = new Map();

function getMessageDeliveryTracesSnapshot() {
  const recent = [...tracesByClientId.values()].sort(
    (a2, b3) => a2.updatedAt - b3.updatedAt,
  );
  const failed = recent
    .filter((trace) => trace.status === "failed" || trace.status === "timeout")
    .slice(-20);
  return {
    recent: recent.slice(-MAX_RECENT_TRACES),
    failed,
  };
}

export const entries = new Map();

function getWorkspaceRetentionDiagnosticsSnapshot() {
  const rows = [...entries.values()];
  const statusCounts = {};
  for (const row of rows) {
    const state2 = row.statusState ?? "unknown";
    statusCounts[state2] = (statusCounts[state2] ?? 0) + 1;
  }
  return {
    hostCount: rows.length,
    activeHostCount: rows.filter((row) => row.isActive).length,
    retainedContentHostCount: rows.filter((row) => row.retainContent).length,
    inactiveRetainedContentHostCount: rows.filter(
      (row) => !row.isActive && row.retainContent,
    ).length,
    inactiveUnloadedContentHostCount: rows.filter(
      (row) => !row.isActive && !row.retainContent,
    ).length,
    runtimeKnownHostCount: rows.filter((row) => row.hasRuntime).length,
    statusCounts,
  };
}

export function buildRendererDiagnosticsSnapshot() {
  return {
    assetEventState: getAssetEventStateSnapshot(),
    messageDeliveryTraces: getMessageDeliveryTracesSnapshot(),
    recentSlowMeasures: getRecentSlowMeasures(),
    rendererLongTasks: getRecentLongTasks(),
    workspaceRetention: getWorkspaceRetentionDiagnosticsSnapshot(),
    workspaceContentBudget: getWorkspaceContentBudgetSnapshot(),
    canvasRender: getCanvasRenderDiagnosticsSnapshot(),
  };
}

function isChineseLocale$1() {
  return (instance.resolvedLanguage ?? instance.language).startsWith("zh");
}

function blockedUnsavedFallback() {
  return isChineseLocale$1()
    ? "项目还有内容未保存完成，暂时无法关闭，已恢复标签页。"
    : "This project still has unsaved changes and cannot be closed yet. Its tab has been restored.";
}

function blockedActiveFallback() {
  return isChineseLocale$1()
    ? "项目仍有任务在运行，暂时无法关闭，已恢复标签页。"
    : "This project still has tasks running and cannot be closed yet. Its tab has been restored.";
}

function blockedGenericFallback() {
  return isChineseLocale$1()
    ? "项目暂时无法关闭，已恢复标签页，请稍后重试。"
    : "This project could not be closed. Its tab has been restored — please try again shortly.";
}

function blockedStorageFallback() {
  return isChineseLocale$1()
    ? "项目保存保护未完成，已取消关闭并恢复标签页。请检查磁盘空间和权限，或上传日志联系支持。"
    : "Project protection is incomplete. Closing was cancelled and the tab restored. Check disk space and permissions, or upload logs and contact support.";
}

export function toastWorkspaceCloseBlocked(workspaceId2, result) {
  const key2 =
    result.reason === "storage"
      ? "workspace.close.blockedStorage"
      : result.reason === "unsaved"
        ? "workspace.close.blockedUnsaved"
        : result.reason === "active"
          ? "workspace.close.blockedActive"
          : "workspace.close.blockedGeneric";
  const fallback =
    result.reason === "storage"
      ? blockedStorageFallback()
      : result.reason === "unsaved"
        ? blockedUnsavedFallback()
        : result.reason === "active"
          ? blockedActiveFallback()
          : blockedGenericFallback();
  dedupedToast.warning(
    instance.t(key2, {
      defaultValue: fallback,
    }),
    {
      id: `workspace-close-blocked-${workspaceId2}`,
    },
  );
}

export async function requestWorkspaceRuntimeClose(
  hiloApp2,
  workspaceId2,
  source,
) {
  try {
    const result = await hiloApp2.closeWorkspace(workspaceId2, {
      source,
    });
    if (!result.closed) {
      workspaceLog.warn(
        `[workspace-close] Close rejected, restoring preview tab: ${workspaceId2}, source=${source}, reason=${result.reason ?? "unknown"}${result.blockingReasons?.length ? `, blocking=${result.blockingReasons.join("|")}` : ""}`,
      );
      showVisiblePreviewTab(workspaceId2);
      toastWorkspaceCloseBlocked(workspaceId2, result);
    }
    return result;
  } catch (err) {
    workspaceLog.error(
      `[workspace-close] Close request failed, restoring preview tab: ${workspaceId2}, source=${source}, error=${err instanceof Error ? err.message : String(err)}`,
    );
    showVisiblePreviewTab(workspaceId2);
    toastWorkspaceCloseBlocked(workspaceId2, {});
    return void 0;
  }
}

const SCROLL_IDLE_MS = 600;

export function useIsScrolling({
  scrollRef,
  idleMs = SCROLL_IDLE_MS,
  enabled = true,
}) {
  const [isScrolling, setIsScrolling] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setIsScrolling((prev) => (prev ? prev : true));
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setIsScrolling(false);
      }, idleMs);
    };
    el.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scrollRef, idleMs, enabled]);
  return enabled && isScrolling;
}

export const Select$1 = SelectRoot;

export function AlertDialogPortal({ ...props }) {
  return <DialogPortal$2 data-slot="alert-dialog-portal" {...props} />;
}

export const AuthContext = reactExports.createContext(null);

export function useAuth() {
  const ctx = reactExports.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const TeamAccountContext = reactExports.createContext(null);

export function useTeamAccount() {
  const value = reactExports.useContext(TeamAccountContext);
  if (!value)
    throw new Error("useTeamAccount must be used within TeamProvider");
  return value;
}

export function useOptionalTeamAccount() {
  return reactExports.useContext(TeamAccountContext);
}

const PERSONAL_MEMBERSHIP = "PERSONAL";

const NO_CREDIT_SCOPE = "NO_SCOPE";

function canonicalScopeParts(scope) {
  return [
    scope.identityKey,
    scope.groupId,
    scope.epoch,
    scope.membershipRevision ?? PERSONAL_MEMBERSHIP,
  ];
}

function accountRoot(scope) {
  return scope.kind === "canonical"
    ? creditQueryKeys.scope(scope.accountScope)
    : creditQueryKeys.legacyPersonal(scope.identityKey);
}

export const creditQueryKeys = {
  root: ["credit"],
  unavailable: (resource) => ["credit", NO_CREDIT_SCOPE, resource],
  legacyPersonal: (identityKey) => ["credit", "legacy-personal", identityKey],
  scope: (scope) => ["credit", "scope", ...canonicalScopeParts(scope)],
  account: (scope) => accountRoot(scope),
  wallet: (scope) => [...accountRoot(scope), "wallet"],
  subscriptionWallet: (scope) => [...accountRoot(scope), "subscription-wallet"],
  popup: (scope) => [...accountRoot(scope), "popup"],
  popupForViewer: (scope, identityKey) => [
    ...creditQueryKeys.popup(scope),
    "viewer",
    identityKey,
  ],
  // Server-driven FEATURE is global account content and must be queryable while
  // Team account scope is still initializing. Keep that temporary cache keyed
  // by authenticated identity instead of the shared NO_SCOPE bucket.
  popupByIdentity: (identityKey) => [
    ...creditQueryKeys.root,
    "popup",
    "identity",
    identityKey,
  ],
  personalTransactionsRoot: (scope) => [
    ...accountRoot(scope),
    "personal-transactions",
  ],
  personalTransactions: (
    scope,
    category,
    pageSize,
    cursorCreateTime,
    cursorId,
  ) => [
    ...creditQueryKeys.personalTransactionsRoot(scope),
    category,
    pageSize,
    cursorCreateTime,
    cursorId,
  ],
  summary: (scope) => [...creditQueryKeys.scope(scope), "summary"],
  transactions: (scope, category, cursor) => [
    ...creditQueryKeys.scope(scope),
    "transactions",
    category,
    cursor,
  ],
  transactionFeed: (scope, category) => [
    ...creditQueryKeys.scope(scope),
    "transactions",
    category,
    "feed",
  ],
  selfTransactionFeed: (scope, category) => [
    ...creditQueryKeys.scope(scope),
    "self-transactions",
    category,
    "feed",
  ],
  memberUsage: (scope, memberId, cursor) => [
    ...creditQueryKeys.scope(scope),
    "member-usage",
    memberId,
    cursor,
  ],
  memberUsageFeed: (scope, memberId, category) => [
    ...creditQueryKeys.scope(scope),
    "member-usage",
    memberId,
    category,
    "feed",
  ],
  transferFeed: (scope) => [
    ...creditQueryKeys.scope(scope),
    "transfers",
    "feed",
  ],
};

export function canonicalCreditScope(scope) {
  return {
    kind: "canonical",
    accountScope: scope,
  };
}

export function legacyPersonalCreditScope(identityKey) {
  return {
    kind: "legacyPersonal",
    identityKey,
  };
}

export function scopeParts(scope) {
  return [
    scope.identityKey,
    scope.groupId,
    scope.epoch,
    scope.membershipRevision ?? "PERSONAL",
  ];
}

export function normalizeTeamKeyword(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function accountScopeKey(scope) {
  if (!scope) return null;
  return scopeParts(scope).join(":");
}

function resolveCreditAccountState(teamAccount, legacyIdentityKey) {
  if (!teamAccount?.integrationEnabled) {
    const queryScope2 = legacyIdentityKey
      ? legacyPersonalCreditScope(legacyIdentityKey)
      : null;
    return {
      queryScope: queryScope2,
      canReadPersonalCredit: queryScope2 !== null,
      canMutatePersonalCredit: queryScope2 !== null,
    };
  }
  const queryScope = teamAccount.activeScope
    ? canonicalCreditScope(teamAccount.activeScope)
    : null;
  const readyPersonal =
    queryScope !== null &&
    teamAccount.viewModel.kind === "ready_personal" &&
    teamAccount.accountDataVisible &&
    teamAccount.billingAvailable;
  return {
    queryScope,
    canReadPersonalCredit: readyPersonal,
    canMutatePersonalCredit: readyPersonal,
  };
}

export function useCreditAccountState() {
  const teamAccount = useOptionalTeamAccount();
  const { user } = useAuth();
  return resolveCreditAccountState(teamAccount, user?.userID);
}

export function Popover({ ...props }) {
  return <PopoverRoot data-slot="popover" {...props} />;
}
