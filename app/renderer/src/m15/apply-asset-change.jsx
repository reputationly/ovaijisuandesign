// apply-asset-change.jsx
import {
  reactExports,
  getRuntimeConfig,
  instance,
  DialogTrigger$1,
  DialogPortal$2,
  normalizeGatewayBaseUrl,
  WorkspaceGatewayClient,
  dedupedToast,
  workspaceLog,
  SelectRoot,
  listeners$8,
  decisionVersion,
  PopoverRoot,
  PopoverTrigger$1,
  evaluateAccountSubmission,
  guardAccountSubmission,
  GatewayScopeContext,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  getCanvasRenderDiagnosticsSnapshot,
  getWorkspaceContentBudgetSnapshot,
  resolveCanvasRenderPolicy,
} from "./create-html-iframe-pool-store.jsx";
import {
  canUseDebugTooling,
  showVisiblePreviewTab,
  visiblePreviewTabsStore,
} from "./create-visible-preview-tabs-store.js";
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
const FILE_CONTENT_RESYNC_MAX_PATHS = 12;
const FILE_CONTENT_RESYNC_COOLDOWN_MS = 2e3;
const seqStateByScope = new Map();
const workspaceIdsByGatewayScope = new Map();
const fileContentResyncStateByScope = new Map();
const assetEventStateByWorkspace = new Map();
export function resetAssetSeqState(gatewayScopeKey) {
  seqStateByScope.delete(gatewayScopeKey);
  assetEventStateByWorkspace.delete(gatewayScopeKey);
  fileContentResyncStateByScope.delete(gatewayScopeKey);
  const workspaceIds = workspaceIdsByGatewayScope.get(gatewayScopeKey);
  if (workspaceIds) {
    for (const workspaceId2 of workspaceIds) {
      seqStateByScope.delete(workspaceId2);
      assetEventStateByWorkspace.delete(workspaceId2);
    }
    workspaceIdsByGatewayScope.delete(gatewayScopeKey);
  }
}
export function getAssetEventStateSnapshot() {
  return Object.fromEntries(assetEventStateByWorkspace.entries());
}
export async function refreshAssetIndex({ qc, gatewayScopeKey }) {
  await qc.invalidateQueries({
    queryKey: scopedAssetsQueryKey(gatewayScopeKey),
  });
}
export async function refreshFileContent({ qc, gatewayScopeKey, path: path2 }) {
  await qc.invalidateQueries({
    queryKey: scopedFileContentQueryKey(gatewayScopeKey, path2),
  });
}
export function invalidateAssetQueries({
  qc,
  gatewayScopeKey,
  msg,
  syncAssetMeta,
  resyncMode = "immediate",
  onResyncNeeded,
}) {
  const continuity = checkSeqContinuity(gatewayScopeKey, msg);
  recordSingleDiagnosticsState(gatewayScopeKey, msg, continuity.needsResync);
  if (continuity.needsResync) {
    handleAssetResyncNeeded({
      qc,
      gatewayScopeKey,
      request: continuity.request,
      resyncMode,
      onResyncNeeded,
    });
    return "resync";
  }
  applyAssetChange(qc, gatewayScopeKey, msg, syncAssetMeta);
  return "ok";
}
export function invalidateAssetBatchQueries({
  qc,
  gatewayScopeKey,
  msg,
  syncAssetMeta,
  resyncMode = "immediate",
  onResyncNeeded,
}) {
  const continuity = checkBatchSeqContinuity(gatewayScopeKey, msg);
  recordBatchDiagnosticsState(gatewayScopeKey, msg, continuity.needsResync);
  if (continuity.needsResync) {
    handleAssetResyncNeeded({
      qc,
      gatewayScopeKey,
      request: continuity.request,
      resyncMode,
      onResyncNeeded,
    });
    return "resync";
  }
  for (const event of msg.events) {
    applyAssetChange(qc, gatewayScopeKey, event, syncAssetMeta);
  }
  return "ok";
}
export function applyAssetReplayEvents({ qc, gatewayScopeKey, events: events2, syncAssetMeta }) {
  for (const event of events2) {
    applyAssetChange(qc, gatewayScopeKey, event, syncAssetMeta);
  }
  const last2 = events2.at(-1);
  if (last2) {
    recordAssetEventState({
      workspace_id: last2.workspace_id ?? gatewayScopeKey,
      event_epoch: last2.event_epoch,
      last_seq: last2.seq,
      pending_resync: false,
    });
  }
}
function handleAssetResyncNeeded({ qc, gatewayScopeKey, request, resyncMode, onResyncNeeded }) {
  if (resyncMode === "defer" && request?.replayable && onResyncNeeded) {
    onResyncNeeded(request);
    return;
  }
  requestAssetWorkspaceResync({
    qc,
    gatewayScopeKey,
    reason: "seq-gap",
  });
}
function applyAssetChange(qc, gatewayScopeKey, msg, syncAssetMeta) {
  const key2 = scopedAssetsQueryKey(gatewayScopeKey);
  if (msg.change === "created" && msg.asset) {
    const asset = msg.asset;
    qc.setQueryData(key2, (old) =>
      old ? [asset, ...old.filter((item) => item.id !== asset.id)] : [asset],
    );
  } else if (msg.change === "created") {
    void refreshAssetIndex({
      qc,
      gatewayScopeKey,
    });
  } else if (msg.change === "removed" && msg.id) {
    qc.setQueryData(key2, (old) => (old ? old.filter((a2) => a2.id !== msg.id) : old));
  } else if (msg.change === "updated" && msg.id) {
    if (msg.asset) {
      const asset = msg.asset;
      qc.setQueryData(key2, (old) =>
        old ? old.map((a2) => (a2.id === msg.id ? asset : a2)) : old,
      );
      syncAssetMeta?.(msg.id, asset);
    }
    const filePath = msg.path ?? msg.asset?.path;
    if (filePath) {
      void refreshFileContent({
        qc,
        gatewayScopeKey,
        path: filePath,
      });
    } else {
      requestAssetWorkspaceResync({
        qc,
        gatewayScopeKey,
        reason: "seq-gap",
      });
    }
  } else if (msg.change === "renamed" && msg.id) {
    if (msg.asset) {
      const asset = msg.asset;
      qc.setQueryData(key2, (old) =>
        old ? old.map((a2) => (a2.id === msg.id ? asset : a2)) : old,
      );
      syncAssetMeta?.(msg.id, asset);
    }
    const oldPath = msg.old_path;
    if (oldPath) {
      void refreshFileContent({
        qc,
        gatewayScopeKey,
        path: oldPath,
      });
    }
    const newPath = msg.path ?? msg.asset?.path;
    if (newPath) {
      void refreshFileContent({
        qc,
        gatewayScopeKey,
        path: newPath,
      });
    }
  } else if (msg.change === "status-changed" && msg.id && msg.status) {
    qc.setQueryData(key2, (old) =>
      old
        ? old.map((a2) => {
            if (a2.id !== msg.id) return a2;
            if (msg.asset) return msg.asset;
            return {
              ...a2,
              status: msg.status,
              candidate: void 0,
            };
          })
        : old,
    );
  }
}
export function requestAssetWorkspaceResync({ qc, gatewayScopeKey, reason }) {
  void refreshAssetIndex({
    qc,
    gatewayScopeKey,
  });
  const now2 = Date.now();
  const last2 = fileContentResyncStateByScope.get(gatewayScopeKey) ?? 0;
  if (now2 - last2 < FILE_CONTENT_RESYNC_COOLDOWN_MS) {
    recordResyncDiagnostics(gatewayScopeKey, reason, 0, 0, true);
    return;
  }
  fileContentResyncStateByScope.set(gatewayScopeKey, now2);
  const allPaths = collectFileContentResyncPaths(qc, gatewayScopeKey);
  const paths = allPaths.slice(0, FILE_CONTENT_RESYNC_MAX_PATHS);
  recordResyncDiagnostics(
    gatewayScopeKey,
    reason,
    paths.length,
    Math.max(0, allPaths.length - paths.length),
    false,
  );
  for (const path2 of paths) {
    void refreshFileContent({
      qc,
      gatewayScopeKey,
      path: path2,
    });
  }
}
export function scopedAssetsQueryKey(gatewayScopeKey) {
  return [...ASSETS_QUERY_KEY, gatewayScopeKey];
}
function scopedFileContentQueryKey(gatewayScopeKey, path2) {
  return [...FILE_CONTENT_QUERY_KEY, gatewayScopeKey, path2];
}
function collectFileContentResyncPaths(qc, gatewayScopeKey) {
  const candidates2 = [];
  for (const query of qc.getQueryCache().getAll()) {
    const key2 = query.queryKey;
    if (!Array.isArray(key2)) continue;
    if (key2[0] !== FILE_CONTENT_QUERY_KEY[0] || key2[1] !== gatewayScopeKey) continue;
    const path2 = key2[2];
    if (typeof path2 !== "string" || path2.length === 0) continue;
    candidates2.push({
      path: path2,
      active: query.getObserversCount() > 0,
      updatedAt: query.state.dataUpdatedAt,
    });
  }
  candidates2.sort((a2, b3) => {
    if (a2.active !== b3.active) return a2.active ? -1 : 1;
    return b3.updatedAt - a2.updatedAt;
  });
  return [...new Set(candidates2.map((candidate) => candidate.path))];
}
function checkSeqContinuity(gatewayScopeKey, msg) {
  if (msg.event_epoch == null || msg.seq == null)
    return {
      needsResync: false,
    };
  const seqScopeKey = resolveSeqScopeKey(gatewayScopeKey, msg.workspace_id);
  const prev = seqStateByScope.get(seqScopeKey);
  if (!prev) {
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq,
    });
    return {
      needsResync: false,
    };
  }
  if (prev.epoch !== msg.event_epoch) {
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq,
    });
    return {
      needsResync: true,
      request: {
        workspaceId: msg.workspace_id ?? gatewayScopeKey,
        eventEpoch: prev.epoch,
        afterSeq: prev.lastSeq,
        reason: "epoch-change",
        replayable: false,
      },
    };
  }
  if (msg.seq !== prev.lastSeq + 1) {
    const afterSeq = prev.lastSeq;
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq,
    });
    return {
      needsResync: true,
      request: {
        workspaceId: msg.workspace_id ?? gatewayScopeKey,
        eventEpoch: msg.event_epoch,
        afterSeq,
        toSeq: msg.seq,
        reason: "seq-gap",
        replayable: true,
      },
    };
  }
  prev.lastSeq = msg.seq;
  return {
    needsResync: false,
  };
}
function checkBatchSeqContinuity(gatewayScopeKey, msg) {
  const seqScopeKey = resolveSeqScopeKey(gatewayScopeKey, msg.workspace_id);
  const prev = seqStateByScope.get(seqScopeKey);
  const hasMalformedRange =
    msg.seq_end < msg.seq_start || msg.seq_end - msg.seq_start + 1 !== msg.events.length;
  if (!prev) {
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq_end,
    });
    return {
      needsResync: hasMalformedRange,
      ...(hasMalformedRange
        ? {
            request: {
              workspaceId: msg.workspace_id || gatewayScopeKey,
              eventEpoch: msg.event_epoch,
              afterSeq: Math.max(0, msg.seq_start - 1),
              reason: "batch-gap",
              replayable: false,
            },
          }
        : {}),
    };
  }
  if (prev.epoch !== msg.event_epoch) {
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq_end,
    });
    return {
      needsResync: true,
      request: {
        workspaceId: msg.workspace_id || gatewayScopeKey,
        eventEpoch: prev.epoch,
        afterSeq: prev.lastSeq,
        reason: "epoch-change",
        replayable: false,
      },
    };
  }
  if (hasMalformedRange || msg.seq_start !== prev.lastSeq + 1) {
    const afterSeq = prev.lastSeq;
    seqStateByScope.set(seqScopeKey, {
      epoch: msg.event_epoch,
      lastSeq: msg.seq_end,
    });
    return {
      needsResync: true,
      request: {
        workspaceId: msg.workspace_id || gatewayScopeKey,
        eventEpoch: msg.event_epoch,
        afterSeq,
        toSeq: msg.seq_end,
        reason: "batch-gap",
        replayable: !hasMalformedRange,
      },
    };
  }
  prev.lastSeq = msg.seq_end;
  return {
    needsResync: false,
  };
}
function resolveSeqScopeKey(gatewayScopeKey, workspaceId2) {
  if (!workspaceId2) return gatewayScopeKey;
  let workspaceIds = workspaceIdsByGatewayScope.get(gatewayScopeKey);
  if (!workspaceIds) {
    workspaceIds = new Set();
    workspaceIdsByGatewayScope.set(gatewayScopeKey, workspaceIds);
  }
  workspaceIds.add(workspaceId2);
  return workspaceId2;
}
function recordSingleDiagnosticsState(gatewayScopeKey, msg, pendingResync) {
  recordAssetEventState({
    workspace_id: msg.workspace_id ?? gatewayScopeKey,
    event_epoch: msg.event_epoch,
    last_seq: msg.seq,
    pending_resync: pendingResync,
  });
}
function recordBatchDiagnosticsState(gatewayScopeKey, msg, pendingResync) {
  recordAssetEventState({
    workspace_id: msg.workspace_id || gatewayScopeKey,
    event_epoch: msg.event_epoch,
    last_seq: msg.seq_end,
    pending_resync: pendingResync,
  });
}
function recordAssetEventState(state2) {
  assetEventStateByWorkspace.set(state2.workspace_id, {
    ...state2,
    updated_at_ms: Date.now(),
  });
}
function recordResyncDiagnostics(workspaceId2, reason, paths, skipped, cooldown) {
  const existing = assetEventStateByWorkspace.get(workspaceId2);
  assetEventStateByWorkspace.set(workspaceId2, {
    workspace_id: workspaceId2,
    event_epoch: existing?.event_epoch,
    last_seq: existing?.last_seq,
    pending_resync: true,
    resync_reason: reason,
    resync_file_content_paths: paths,
    resync_file_content_skipped: skipped,
    resync_cooldown: cooldown,
    updated_at_ms: Date.now(),
  });
}
export const MAX_RECENT_TRACES = 50;
export const tracesByClientId = new Map();
function getMessageDeliveryTracesSnapshot() {
  const recent = [...tracesByClientId.values()].sort((a2, b3) => a2.updatedAt - b3.updatedAt);
  const failed = recent
    .filter((trace) => trace.status === "failed" || trace.status === "timeout")
    .slice(-20);
  return {
    recent: recent.slice(-MAX_RECENT_TRACES),
    failed,
  };
}
const entries = new Map();
export function reportWorkspaceRetentionDiagnostics(workspaceId2, entry) {
  entries.set(workspaceId2, entry);
  return () => {
    entries.delete(workspaceId2);
  };
}
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
    inactiveRetainedContentHostCount: rows.filter((row) => !row.isActive && row.retainContent)
      .length,
    inactiveUnloadedContentHostCount: rows.filter((row) => !row.isActive && !row.retainContent)
      .length,
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
export function reportRendererReady(hiloApp2) {
  return Promise.resolve(
    hiloApp2.updateRendererDiagnosticsSnapshot({
      ...buildRendererDiagnosticsSnapshot(),
      rendererReady: true,
    }),
  );
}
const IDLE_MS = 600;
export function installScrollbarVisibility(doc2 = document) {
  const timers = new Map();
  doc2.documentElement.setAttribute("data-auto-hide-scrollbars", "");
  const onScroll = (event) => {
    const target = event.target === doc2 ? doc2.scrollingElement : event.target;
    if (!(target instanceof Element)) return;
    clearTimeout(timers.get(target));
    target.setAttribute("data-scroll-active", "");
    timers.set(
      target,
      setTimeout(() => {
        target.removeAttribute("data-scroll-active");
        timers.delete(target);
      }, IDLE_MS),
    );
  };
  doc2.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
  return () => {
    doc2.removeEventListener("scroll", onScroll, true);
    doc2.documentElement.removeAttribute("data-auto-hide-scrollbars");
    for (const [element2, timer2] of timers) {
      clearTimeout(timer2);
      element2.removeAttribute("data-scroll-active");
    }
    timers.clear();
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
export async function requestWorkspaceRuntimeClose(hiloApp2, workspaceId2, source) {
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
export function useIsScrolling({ scrollRef, idleMs = SCROLL_IDLE_MS, enabled = true }) {
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
export function AlertDialogTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="alert-dialog-trigger" {...props} />;
}
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
  if (!value) throw new Error("useTeamAccount must be used within TeamProvider");
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
  popupForViewer: (scope, identityKey) => [...creditQueryKeys.popup(scope), "viewer", identityKey],
  // Server-driven FEATURE is global account content and must be queryable while
  // Team account scope is still initializing. Keep that temporary cache keyed
  // by authenticated identity instead of the shared NO_SCOPE bucket.
  popupByIdentity: (identityKey) => [...creditQueryKeys.root, "popup", "identity", identityKey],
  personalTransactionsRoot: (scope) => [...accountRoot(scope), "personal-transactions"],
  personalTransactions: (scope, category, pageSize, cursorCreateTime, cursorId) => [
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
  transferFeed: (scope) => [...creditQueryKeys.scope(scope), "transfers", "feed"],
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
function scopeParts(scope) {
  return [scope.identityKey, scope.groupId, scope.epoch, scope.membershipRevision ?? "PERSONAL"];
}
export function normalizeTeamKeyword(value) {
  return value.trim().replace(/\s+/g, " ");
}
export const teamQueryKeys = {
  root: ["team"],
  contract: (clientVersion) => ["team", "contract", clientVersion],
  identity: (identityKey) => ["team", "identity", identityKey],
  contexts: (identityKey) => [...teamQueryKeys.identity(identityKey), "contexts"],
  userCapabilities: (identityKey) => [...teamQueryKeys.identity(identityKey), "capabilities"],
  membership: (scope) => ["team", "membership", ...scopeParts(scope)],
  detail: (scope) => [...teamQueryKeys.membership(scope), "detail"],
  permissions: (scope) => [...teamQueryKeys.membership(scope), "permissions"],
  members: (scope, keyword2, cursor, pageSize) => [
    ...teamQueryKeys.membership(scope),
    "members",
    normalizeTeamKeyword(keyword2),
    cursor,
    pageSize,
  ],
  memberFeed: (scope, keyword2, pageSize) => [
    ...teamQueryKeys.membership(scope),
    "members",
    normalizeTeamKeyword(keyword2),
    "feed",
    pageSize,
  ],
  memberDetails: (scope) => [...teamQueryKeys.membership(scope), "member-details"],
  inGroupMembers: (scope) => [...teamQueryKeys.membership(scope), "in-group-members"],
  inviteLinks: (scope, cursor) => [...teamQueryKeys.membership(scope), "invite-links", cursor],
  pastTeamMembers: (scope, keyword2) => [
    ...teamQueryKeys.membership(scope),
    "past-team-members",
    normalizeTeamKeyword(keyword2),
  ],
  inviteLinkFeed: (scope) => [...teamQueryKeys.membership(scope), "invite-links", "feed"],
  quota: (scope) => [...teamQueryKeys.membership(scope), "quota"],
};
export function accountScopeKey(scope) {
  if (!scope) return null;
  return scopeParts(scope).join(":");
}
function subscribeAccountSubmissionDecision(listener) {
  listeners$8.add(listener);
  return () => listeners$8.delete(listener);
}
function getAccountSubmissionDecisionVersion() {
  return decisionVersion;
}
function resolveCreditAccountState(teamAccount, legacyIdentityKey) {
  if (!teamAccount?.integrationEnabled) {
    const queryScope2 = legacyIdentityKey ? legacyPersonalCreditScope(legacyIdentityKey) : null;
    return {
      queryScope: queryScope2,
      canReadPersonalCredit: queryScope2 !== null,
      canMutatePersonalCredit: queryScope2 !== null,
    };
  }
  const queryScope = teamAccount.activeScope ? canonicalCreditScope(teamAccount.activeScope) : null;
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
export function MpIcon({ size: size2 = 14, className }) {
  return (
    <svg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.3978 1.5L7.19709 6.06008L4.53725 2.27041L2.27041 4.53725L6.06008 7.19709L1.5 6.39787V9.6022L6.06008 8.80291L2.27041 11.4628L4.53725 13.7296L7.19709 9.93992L6.3978 14.5H9.60213L8.80284 9.93992L11.4628 13.7296L13.7296 11.4628L9.93992 8.80291L14.5 9.6022V6.39787L9.93992 7.19709L13.7296 4.53725L11.4628 2.27041L8.80284 6.06008L9.60213 1.5H6.3978Z"
      />
    </svg>
  );
}
export function Popover({ ...props }) {
  return <PopoverRoot data-slot="popover" {...props} />;
}
export function PopoverTrigger({ ...props }) {
  return <PopoverTrigger$1 data-slot="popover-trigger" {...props} />;
}
const INPUT_EDITABLE_WHILE_BLOCKED_REASON_CODES = new Set([
  "quota_insufficient",
  "team_balance_insufficient",
]);
function accountSubmissionBlocksInput(decision) {
  return !decision.allowed && !INPUT_EDITABLE_WHILE_BLOCKED_REASON_CODES.has(decision.reasonCode);
}
export function useAccountSubmissionDecision(kind) {
  reactExports.useSyncExternalStore(
    subscribeAccountSubmissionDecision,
    getAccountSubmissionDecisionVersion,
    getAccountSubmissionDecisionVersion,
  );
  return evaluateAccountSubmission(kind);
}
export function useAccountSubmissionAllowed(kind) {
  return useAccountSubmissionDecision(kind).allowed;
}
function useAccountSubmissionBlocksInput(kind) {
  return accountSubmissionBlocksInput(useAccountSubmissionDecision(kind));
}
export function useAccountSubmissionControls(kind) {
  const blocksInput = useAccountSubmissionBlocksInput(kind);
  const beforeAccountSubmission = reactExports.useCallback(
    () => guardAccountSubmission(kind).allowed,
    [kind],
  );
  return {
    accountSubmissionAllowed: !blocksInput,
    beforeAccountSubmission,
  };
}
export function GatewayScopeProvider({
  children: children2,
  gatewayUrl: gatewayUrl2,
  gatewayBinding,
  gatewayReady,
  scopeKey,
  workspaceClaim,
  recoverWorkspace,
}) {
  const bindingBaseUrl = gatewayBinding?.baseUrl;
  const bindingClaim = gatewayBinding?.claim;
  const bindingInstanceId = gatewayBinding?.instanceId;
  const bindingGeneration = gatewayBinding?.generation;
  const stableGatewayBinding = reactExports.useMemo(() => {
    if (
      bindingBaseUrl === void 0 ||
      bindingClaim === void 0 ||
      bindingInstanceId === void 0 ||
      bindingGeneration === void 0
    ) {
      return void 0;
    }
    return {
      baseUrl: bindingBaseUrl,
      claim: bindingClaim,
      instanceId: bindingInstanceId,
      generation: bindingGeneration,
    };
  }, [bindingBaseUrl, bindingClaim, bindingGeneration, bindingInstanceId]);
  const value = reactExports.useMemo(() => {
    const fallbackGatewayUrl = scopeKey ? void 0 : getRuntimeConfig().gatewayUrl;
    const baseUrl = normalizeGatewayBaseUrl(
      stableGatewayBinding?.baseUrl ?? gatewayUrl2 ?? fallbackGatewayUrl,
    );
    const workspaceClient = stableGatewayBinding
      ? new WorkspaceGatewayClient({
          binding: stableGatewayBinding,
          recoverWorkspace,
        })
      : void 0;
    return {
      baseUrl,
      gatewayReady: gatewayReady ?? baseUrl !== void 0,
      scopeKey: scopeKey ?? baseUrl ?? "app",
      workspaceClaim: stableGatewayBinding?.claim ?? workspaceClaim,
      gatewayBinding: stableGatewayBinding,
      workspaceClient,
      recoverWorkspace,
    };
  }, [gatewayReady, gatewayUrl2, recoverWorkspace, scopeKey, stableGatewayBinding, workspaceClaim]);
  return <GatewayScopeContext.Provider value={value}>{children2}</GatewayScopeContext.Provider>;
}
