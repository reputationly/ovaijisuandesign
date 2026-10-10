// ws-connection-provider-core.jsx
import {
  assetEventStateByWorkspace,
  FILE_CONTENT_QUERY_KEY,
  getAssetEventStateSnapshot,
  refreshFileContent,
  scopedAssetsQueryKey,
} from "../assets/credit-query-keys.jsx";
import { refreshAssetIndex } from "../assets/gateway-scope-provider.jsx";
import {
  assetLineageQueryKey,
  canvasTagRegistryQueryKey,
  WSConnectionContext,
} from "../workspace/asset-lineage-query-key.js";
import { API_PATHS, reactExports, useGatewayScope, useQueryClient } from "../vendor.js";
import { guardAccountSubmission, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { buildWSUrl } from "../infra/gateway-http-error.jsx";
import { AgentWSClient } from "../infra/agent-ws-client.js";
import { assetInfoToAssetMeta } from "./use-active-runtime.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";
import { trackEvent } from "../infra/sanitize-track-props.js";

const CANVAS_TAG_REGISTRY_CHANGED_MESSAGE_TYPE = "canvas_tag_registry_changed";

const FILE_CONTENT_RESYNC_MAX_PATHS = 12;

const FILE_CONTENT_RESYNC_COOLDOWN_MS = 2e3;

const seqStateByScope = new Map();

const workspaceIdsByGatewayScope = new Map();

const fileContentResyncStateByScope = new Map();

function resetAssetSeqState(gatewayScopeKey) {
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

function collectFileContentResyncPaths(qc, gatewayScopeKey) {
  const candidates2 = [];
  for (const query of qc.getQueryCache().getAll()) {
    const key2 = query.queryKey;
    if (!Array.isArray(key2)) continue;
    if (key2[0] !== FILE_CONTENT_QUERY_KEY[0] || key2[1] !== gatewayScopeKey)
      continue;
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
    msg.seq_end < msg.seq_start ||
    msg.seq_end - msg.seq_start + 1 !== msg.events.length;
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

function recordAssetEventState(state2) {
  assetEventStateByWorkspace.set(state2.workspace_id, {
    ...state2,
    updated_at_ms: Date.now(),
  });
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

function recordResyncDiagnostics(
  workspaceId2,
  reason,
  paths,
  skipped,
  cooldown,
) {
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

function requestAssetWorkspaceResync({ qc, gatewayScopeKey, reason }) {
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

function handleAssetResyncNeeded({
  qc,
  gatewayScopeKey,
  request,
  resyncMode,
  onResyncNeeded,
}) {
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
    qc.setQueryData(key2, (old) =>
      old ? old.filter((a2) => a2.id !== msg.id) : old,
    );
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

function invalidateAssetQueries({
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

function invalidateAssetBatchQueries({
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

function applyAssetReplayEvents({
  qc,
  gatewayScopeKey,
  events: events2,
  syncAssetMeta,
}) {
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

function invalidateAssetLineageQueries(qc, childId, parentId, scopeKey) {
  if (!scopeKey) {
    qc.invalidateQueries({
      queryKey: assetLineageQueryKey.all(),
    });
    return;
  }
  qc.invalidateQueries({
    queryKey: assetLineageQueryKey.child(childId, scopeKey),
  });
  if (parentId) {
    qc.invalidateQueries({
      queryKey: assetLineageQueryKey.child(parentId, scopeKey),
    });
  }
}

const DEFAULT_ASSET_CHANGES_REPLAY_LIMIT = 500;

function buildAssetChangesReplayUrl(
  request,
  replayLimit = DEFAULT_ASSET_CHANGES_REPLAY_LIMIT,
) {
  const qs = new URLSearchParams({
    workspace_id: request.workspaceId,
    after_seq: String(request.afterSeq),
    limit: String(replayLimit),
  });
  if (request.eventEpoch) qs.set("event_epoch", request.eventEpoch);
  if (request.toSeq !== void 0) qs.set("to_seq", String(request.toSeq));
  return `${API_PATHS.assetChanges}?${qs}`;
}

function requestFallbackResync(qc, gatewayScopeKey, onFallbackResync) {
  requestAssetWorkspaceResync({
    qc,
    gatewayScopeKey,
    reason: "seq-gap",
  });
  onFallbackResync?.();
}

async function replayAssetChangesOrFallback({
  qc,
  gatewayScopeKey,
  gatewayFetch: gatewayFetch2,
  request,
  syncAssetMeta,
  onReplayApplied,
  onFallbackResync,
  replayLimit = DEFAULT_ASSET_CHANGES_REPLAY_LIMIT,
}) {
  try {
    const response = await gatewayFetch2(
      buildAssetChangesReplayUrl(request, replayLimit),
    );
    if (!response.ok)
      throw new Error(`asset changes replay failed: ${response.status}`);
    const manifest = await response.json();
    if (manifest.has_gap || manifest.has_more) {
      requestFallbackResync(qc, gatewayScopeKey, onFallbackResync);
      return;
    }
    const replayToSeq = request.toSeq;
    const replayEvents =
      replayToSeq === void 0
        ? manifest.events
        : manifest.events.filter((event) => (event.seq ?? 0) <= replayToSeq);
    applyAssetReplayEvents({
      qc,
      gatewayScopeKey,
      events: replayEvents,
      syncAssetMeta,
    });
    onReplayApplied?.();
  } catch {
    requestFallbackResync(qc, gatewayScopeKey, onFallbackResync);
  }
}

const WORKSPACE_FILE_PATH_PREFIX = "/files/";

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function rebindWorkspaceAssetMetadataUrls(assets, resolveGatewayUrl) {
  let nextAssets;
  for (const [key2, meta2] of assets) {
    let parsed;
    try {
      parsed = new URL(meta2.url);
    } catch {
      continue;
    }
    if (
      !LOOPBACK_HOSTNAMES.has(parsed.hostname) ||
      !parsed.pathname.startsWith(WORKSPACE_FILE_PATH_PREFIX)
    ) {
      continue;
    }
    const reboundUrl = resolveGatewayUrl(`${parsed.pathname}${parsed.search}`);
    if (!reboundUrl || reboundUrl === meta2.url) continue;
    nextAssets ??= new Map(assets);
    nextAssets.set(key2, {
      ...meta2,
      url: reboundUrl,
    });
  }
  return nextAssets ?? assets;
}

const ASSET_STATE_BREADCRUMB_INTERVAL_MS = 3e4;

function guardedSubmissionKind(msg) {
  if (msg.type === "message") {
    return msg.delivery === "defer_if_busy" ? "queue" : "chat";
  }
  if (msg.type === "skill_gui_event" && msg.event_type === "generate:submit") {
    return "remote_tool";
  }
  return null;
}

export function WSConnectionProviderCore({
  children: children2,
  wsUrl,
  scope,
  syncCanvasAssetMetadata = true,
}) {
  const queryClient2 = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const gatewayScopeKey = useGatewayScopeKey();
  const { gatewayBinding, gatewayReady, recoverWorkspace, workspaceClaim } =
    useGatewayScope();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayUrl2 = useGatewayUrl();
  const resolvedWsUrl = reactExports.useMemo(() => buildWSUrl(wsUrl), [wsUrl]);
  const [connected, setConnected] = reactExports.useState(false);
  const subscribersRef = reactExports.useRef(new Set());
  const wsRef = reactExports.useRef(null);
  const syncCanvasAssetMetadataRef = reactExports.useRef(
    syncCanvasAssetMetadata,
  );
  syncCanvasAssetMetadataRef.current = syncCanvasAssetMetadata;
  const queryClientRef = reactExports.useRef(queryClient2);
  queryClientRef.current = queryClient2;
  const assetMetadataStoreRef = reactExports.useRef(assetMetadataStore);
  assetMetadataStoreRef.current = assetMetadataStore;
  const gatewayFetchRef = reactExports.useRef(gatewayFetch2);
  gatewayFetchRef.current = gatewayFetch2;
  reactExports.useEffect(() => {
    if (scope !== "workspace") return;
    assetMetadataStore.setState((state2) => {
      const assets = rebindWorkspaceAssetMetadataUrls(
        state2.assets,
        gatewayUrl2,
      );
      return assets === state2.assets
        ? state2
        : {
            ...state2,
            assets,
          };
    });
  }, [assetMetadataStore, gatewayUrl2, scope]);
  reactExports.useEffect(() => {
    let connectStart = 0;
    let wasConnected = false;
    let lastAssetStateBreadcrumbAt = 0;
    const assetReplayInFlight = new Set();
    let failedAttempts = 0;
    trackEvent(TRACK_EVENTS.WS_CONNECT_START, {});
    connectStart = Date.now();
    const syncAssetMeta = (assetId, asset) => {
      if (!syncCanvasAssetMetadataRef.current) return;
      const metaStore = assetMetadataStoreRef.current.getState();
      const existing = metaStore.get(assetId);
      if (!existing) return;
      const nextMeta = assetInfoToAssetMeta(asset, () => existing.url);
      if (!nextMeta) return;
      const next2 = {
        ...existing,
        ...nextMeta,
        url: existing.url,
      };
      const assetLevelChanged =
        existing.name !== next2.name ||
        existing.path !== next2.path ||
        JSON.stringify(existing.tagIds) !== JSON.stringify(next2.tagIds);
      if (
        assetLevelChanged ||
        existing.prompt !== next2.prompt ||
        existing.description !== next2.description ||
        existing.model !== next2.model ||
        existing.backend !== next2.backend ||
        existing.model_id !== next2.model_id ||
        existing.source_tool !== next2.source_tool ||
        existing.cloudTraceId !== next2.cloudTraceId ||
        existing.cloudTaskId !== next2.cloudTaskId ||
        JSON.stringify(existing.params) !== JSON.stringify(next2.params) ||
        JSON.stringify(existing.referenceImageIds) !==
          JSON.stringify(next2.referenceImageIds) ||
        JSON.stringify(existing.referenceAudioIds) !==
          JSON.stringify(next2.referenceAudioIds) ||
        JSON.stringify(existing.referenceVideoIds) !==
          JSON.stringify(next2.referenceVideoIds) ||
        JSON.stringify(existing.referenceTextIds) !==
          JSON.stringify(next2.referenceTextIds) ||
        existing.width !== next2.width ||
        existing.height !== next2.height ||
        existing.durationSec !== next2.durationSec ||
        existing.fileSize !== next2.fileSize
      ) {
        if (assetLevelChanged) {
          metaStore.mergeAsset(assetId, {
            name: next2.name,
            path: next2.path,
            tagIds: next2.tagIds,
          });
        }
        metaStore.set(assetId, next2);
      }
    };
    const recordAssetStateBreadcrumb = (reason) => {
      const now2 = Date.now();
      if (
        reason !== "resync" &&
        now2 - lastAssetStateBreadcrumbAt < ASSET_STATE_BREADCRUMB_INTERVAL_MS
      ) {
        return;
      }
      lastAssetStateBreadcrumbAt = now2;
      void window.hilo?.diagnostics
        ?.addBreadcrumb?.("network", "asset-events: state", {
          reason,
          assetEventState: getAssetEventStateSnapshot(),
        })
        .catch(() => {});
    };
    const replayAssetChangesOrFallbackOnce = async (request) => {
      const replayKey = `${request.workspaceId}:${request.eventEpoch ?? ""}:${request.afterSeq}`;
      if (assetReplayInFlight.has(replayKey)) return;
      assetReplayInFlight.add(replayKey);
      try {
        await replayAssetChangesOrFallback({
          qc: queryClientRef.current,
          gatewayScopeKey,
          gatewayFetch: gatewayFetchRef.current,
          request,
          syncAssetMeta,
          onReplayApplied: () => recordAssetStateBreadcrumb("batch"),
          onFallbackResync: () => recordAssetStateBreadcrumb("resync"),
        });
      } finally {
        assetReplayInFlight.delete(replayKey);
      }
    };
    const hiloLogger = window.hilo?.logger;
    const wsLogger = hiloLogger
      ? {
          info: (m3) => hiloLogger.info(m3, "chat"),
          warn: (m3) => hiloLogger.warn(m3, "chat"),
          error: (m3) => hiloLogger.error(m3, "chat"),
        }
      : void 0;
    const ws2 = new AgentWSClient({
      url: resolvedWsUrl,
      workspaceClaim,
      workspaceBinding: gatewayBinding,
      onWorkspaceIdentityMismatch: () => {
        void recoverWorkspace?.();
      },
      // The client URL is pinned at construction. When the gateway respawned
      // on a NEW port (crash recovery, idle-suspend resume while this window
      // stayed open), retrying the old port can never succeed and no 1008
      // arrives (dead port → 1006). Re-resolve the runtime binding after a few
      // consecutive failures: recoverWorkspace resumes a suspended runtime /
      // refreshes the binding, and the provider rebuilds this client with the
      // fresh URL. Single-flighted by the workspace host, so the periodic
      // calls during a long outage stay cheap.
      onPersistentDisconnect: () => {
        void recoverWorkspace?.();
      },
      logger: wsLogger,
      onMessage: (msg) => {
        if (
          msg.type === "open_remote_tool" ||
          msg.type === "close_remote_tool"
        ) {
          remoteToolLog.info("ws-connection received", {
            msg_type: msg.type,
            tool_name: "tool_name" in msg ? msg.tool_name : null,
            session_id: "session_id" in msg ? (msg.session_id ?? null) : null,
            subscriber_count: subscribersRef.current.size,
          });
        }
        if (msg.type === "asset_changed") {
          const result = invalidateAssetQueries({
            qc: queryClientRef.current,
            gatewayScopeKey,
            msg,
            syncAssetMeta,
            resyncMode: "defer",
            onResyncNeeded: (request) => {
              void replayAssetChangesOrFallbackOnce(request);
            },
          });
          recordAssetStateBreadcrumb(result === "resync" ? "resync" : "sample");
        } else if (msg.type === "assets_changed_batch") {
          const result = invalidateAssetBatchQueries({
            qc: queryClientRef.current,
            gatewayScopeKey,
            msg,
            syncAssetMeta,
            resyncMode: "defer",
            onResyncNeeded: (request) => {
              void replayAssetChangesOrFallbackOnce(request);
            },
          });
          recordAssetStateBreadcrumb(result === "resync" ? "resync" : "batch");
        }
        if (msg.type === CANVAS_TAG_REGISTRY_CHANGED_MESSAGE_TYPE) {
          queryClientRef.current.setQueryData(
            canvasTagRegistryQueryKey(gatewayScopeKey),
            msg.registry,
          );
        }
        if (msg.type === "dependency_changed") {
          invalidateAssetLineageQueries(
            queryClientRef.current,
            msg.child_id,
            msg.parent_id,
            gatewayScopeKey,
          );
        }
        for (const handler of subscribersRef.current) {
          try {
            handler(msg);
          } catch (err) {
            console.error("[WSConnection] subscriber error:", err);
          }
        }
      },
      onConnectionChange: (next2) => {
        if (next2 && !wasConnected) {
          trackEvent(TRACK_EVENTS.WS_CONNECT_SUCCESS, {
            duration_ms: Date.now() - connectStart,
          });
          wasConnected = true;
          failedAttempts = 0;
          resetAssetSeqState(gatewayScopeKey);
          requestAssetWorkspaceResync({
            qc: queryClientRef.current,
            gatewayScopeKey,
            reason: "reconnect",
          });
          if (scope === "workspace") {
            void queryClientRef.current.invalidateQueries({
              queryKey: canvasTagRegistryQueryKey(gatewayScopeKey),
            });
          }
        } else if (!next2 && wasConnected) {
          trackEvent(TRACK_EVENTS.WS_DISCONNECT, {});
          wasConnected = false;
          connectStart = Date.now();
          trackEvent(TRACK_EVENTS.WS_RECONNECT, {});
          failedAttempts = 0;
        } else if (!next2 && !wasConnected) {
          failedAttempts += 1;
          const isPowerOfTwo = (failedAttempts & (failedAttempts - 1)) === 0;
          if (isPowerOfTwo) {
            trackEvent(TRACK_EVENTS.WS_CONNECT_FAILED, {
              duration_ms: Date.now() - connectStart,
              error_type: "network",
              attempt: failedAttempts,
            });
          }
          connectStart = Date.now();
        }
        setConnected(next2);
      },
    });
    wsRef.current = ws2;
    ws2.connect();
    return () => {
      ws2.disconnect();
      resetAssetSeqState(gatewayScopeKey);
      wsRef.current = null;
    };
  }, [
    gatewayBinding,
    gatewayScopeKey,
    recoverWorkspace,
    resolvedWsUrl,
    scope,
    workspaceClaim,
  ]);
  reactExports.useEffect(() => {
    if (gatewayReady) wsRef.current?.reconnectNow();
  }, [gatewayReady]);
  const send2 = reactExports.useCallback(
    (msg) => {
      if (scope === "workspace") {
        const submissionKind = guardedSubmissionKind(msg);
        if (submissionKind && !guardAccountSubmission(submissionKind).allowed)
          return false;
      }
      return wsRef.current?.send(msg) ?? false;
    },
    [scope],
  );
  const subscribe2 = reactExports.useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);
  const value = reactExports.useMemo(
    () => ({
      scope,
      wsUrl: resolvedWsUrl,
      connected,
      send: send2,
      subscribe: subscribe2,
    }),
    [scope, resolvedWsUrl, connected, send2, subscribe2],
  );
  return (
    <WSConnectionContext.Provider value={value}>
      {children2}
    </WSConnectionContext.Provider>
  );
}
