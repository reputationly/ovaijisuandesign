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
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import reactExports from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    for (const workspaceId of workspaceIds) {
      seqStateByScope.delete(workspaceId);
      assetEventStateByWorkspace.delete(workspaceId);
    }
    workspaceIdsByGatewayScope.delete(gatewayScopeKey);
  }
}

function collectFileContentResyncPaths(qc, gatewayScopeKey) {
  const candidates = [];
  for (const query of qc.getQueryCache().getAll()) {
    const key = query.queryKey;
    if (!Array.isArray(key)) continue;
    if (key[0] !== FILE_CONTENT_QUERY_KEY[0] || key[1] !== gatewayScopeKey)
      continue;
    const path = key[2];
    if (typeof path !== "string" || path.length === 0) continue;
    candidates.push({
      path,
      active: query.getObserversCount() > 0,
      updatedAt: query.state.dataUpdatedAt,
    });
  }
  candidates.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  return [...new Set(candidates.map((candidate) => candidate.path))];
}

function resolveSeqScopeKey(gatewayScopeKey, workspaceId) {
  if (!workspaceId) return gatewayScopeKey;
  let workspaceIds = workspaceIdsByGatewayScope.get(gatewayScopeKey);
  if (!workspaceIds) {
    workspaceIds = new Set();
    workspaceIdsByGatewayScope.set(gatewayScopeKey, workspaceIds);
  }
  workspaceIds.add(workspaceId);
  return workspaceId;
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

function recordAssetEventState(state) {
  assetEventStateByWorkspace.set(state.workspace_id, {
    ...state,
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
  workspaceId,
  reason,
  paths,
  skipped,
  cooldown,
) {
  const existing = assetEventStateByWorkspace.get(workspaceId);
  assetEventStateByWorkspace.set(workspaceId, {
    workspace_id: workspaceId,
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
  const now = Date.now();
  const last = fileContentResyncStateByScope.get(gatewayScopeKey) ?? 0;
  if (now - last < FILE_CONTENT_RESYNC_COOLDOWN_MS) {
    recordResyncDiagnostics(gatewayScopeKey, reason, 0, 0, true);
    return;
  }
  fileContentResyncStateByScope.set(gatewayScopeKey, now);
  const allPaths = collectFileContentResyncPaths(qc, gatewayScopeKey);
  const paths = allPaths.slice(0, FILE_CONTENT_RESYNC_MAX_PATHS);
  recordResyncDiagnostics(
    gatewayScopeKey,
    reason,
    paths.length,
    Math.max(0, allPaths.length - paths.length),
    false,
  );
  for (const path of paths) {
    void refreshFileContent({
      qc,
      gatewayScopeKey,
      path,
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
  const key = scopedAssetsQueryKey(gatewayScopeKey);
  if (msg.change === "created" && msg.asset) {
    const asset = msg.asset;
    qc.setQueryData(key, (old) =>
      old ? [asset, ...old.filter((item) => item.id !== asset.id)] : [asset],
    );
  } else if (msg.change === "created") {
    void refreshAssetIndex({
      qc,
      gatewayScopeKey,
    });
  } else if (msg.change === "removed" && msg.id) {
    qc.setQueryData(key, (old) =>
      old ? old.filter((cachedAsset) => cachedAsset.id !== msg.id) : old,
    );
  } else if (msg.change === "updated" && msg.id) {
    if (msg.asset) {
      const asset = msg.asset;
      qc.setQueryData(key, (old) =>
        old ? old.map((cachedAsset) => (cachedAsset.id === msg.id ? asset : cachedAsset)) : old,
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
      qc.setQueryData(key, (old) =>
        old ? old.map((cachedAsset) => (cachedAsset.id === msg.id ? asset : cachedAsset)) : old,
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
    qc.setQueryData(key, (old) =>
      old
        ? old.map((cachedAsset) => {
            if (cachedAsset.id !== msg.id) return cachedAsset;
            if (msg.asset) return msg.asset;
            return {
              ...cachedAsset,
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
  events,
  syncAssetMeta,
}) {
  for (const event of events) {
    applyAssetChange(qc, gatewayScopeKey, event, syncAssetMeta);
  }
  const last = events.at(-1);
  if (last) {
    recordAssetEventState({
      workspace_id: last.workspace_id ?? gatewayScopeKey,
      event_epoch: last.event_epoch,
      last_seq: last.seq,
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
  gatewayFetch,
  request,
  syncAssetMeta,
  onReplayApplied,
  onFallbackResync,
  replayLimit = DEFAULT_ASSET_CHANGES_REPLAY_LIMIT,
}) {
  try {
    const response = await gatewayFetch(
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
  for (const [key, meta] of assets) {
    let parsed;
    try {
      parsed = new URL(meta.url);
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
    if (!reboundUrl || reboundUrl === meta.url) continue;
    nextAssets ??= new Map(assets);
    nextAssets.set(key, {
      ...meta,
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
  children,
  wsUrl,
  scope,
  syncCanvasAssetMetadata = true,
}) {
  const queryClient = useQueryClient();
  const assetMetadataStore = useAssetMetadataApi();
  const gatewayScopeKey = useGatewayScopeKey();
  const { gatewayBinding, gatewayReady, recoverWorkspace, workspaceClaim } =
    useGatewayScope();
  const gatewayFetch = useGatewayFetch();
  const gatewayUrl = useGatewayUrl();
  const resolvedWsUrl = reactExports.useMemo(() => buildWSUrl(wsUrl), [wsUrl]);
  const [connected, setConnected] = reactExports.useState(false);
  const subscribersRef = reactExports.useRef(new Set());
  const wsRef = reactExports.useRef(null);
  const syncCanvasAssetMetadataRef = reactExports.useRef(
    syncCanvasAssetMetadata,
  );
  syncCanvasAssetMetadataRef.current = syncCanvasAssetMetadata;
  const queryClientRef = reactExports.useRef(queryClient);
  queryClientRef.current = queryClient;
  const assetMetadataStoreRef = reactExports.useRef(assetMetadataStore);
  assetMetadataStoreRef.current = assetMetadataStore;
  const gatewayFetchRef = reactExports.useRef(gatewayFetch);
  gatewayFetchRef.current = gatewayFetch;
  reactExports.useEffect(() => {
    if (scope !== "workspace") return;
    assetMetadataStore.setState((state) => {
      const assets = rebindWorkspaceAssetMetadataUrls(
        state.assets,
        gatewayUrl,
      );
      return assets === state.assets
        ? state
        : {
            ...state,
            assets,
          };
    });
  }, [assetMetadataStore, gatewayUrl, scope]);
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
      const next = {
        ...existing,
        ...nextMeta,
        url: existing.url,
      };
      const assetLevelChanged =
        existing.name !== next.name ||
        existing.path !== next.path ||
        JSON.stringify(existing.tagIds) !== JSON.stringify(next.tagIds);
      if (
        assetLevelChanged ||
        existing.prompt !== next.prompt ||
        existing.description !== next.description ||
        existing.model !== next.model ||
        existing.backend !== next.backend ||
        existing.model_id !== next.model_id ||
        existing.source_tool !== next.source_tool ||
        existing.cloudTraceId !== next.cloudTraceId ||
        existing.cloudTaskId !== next.cloudTaskId ||
        JSON.stringify(existing.params) !== JSON.stringify(next.params) ||
        JSON.stringify(existing.referenceImageIds) !==
          JSON.stringify(next.referenceImageIds) ||
        JSON.stringify(existing.referenceAudioIds) !==
          JSON.stringify(next.referenceAudioIds) ||
        JSON.stringify(existing.referenceVideoIds) !==
          JSON.stringify(next.referenceVideoIds) ||
        JSON.stringify(existing.referenceTextIds) !==
          JSON.stringify(next.referenceTextIds) ||
        existing.width !== next.width ||
        existing.height !== next.height ||
        existing.durationSec !== next.durationSec ||
        existing.fileSize !== next.fileSize
      ) {
        if (assetLevelChanged) {
          metaStore.mergeAsset(assetId, {
            name: next.name,
            path: next.path,
            tagIds: next.tagIds,
          });
        }
        metaStore.set(assetId, next);
      }
    };
    const recordAssetStateBreadcrumb = (reason) => {
      const now = Date.now();
      if (
        reason !== "resync" &&
        now - lastAssetStateBreadcrumbAt < ASSET_STATE_BREADCRUMB_INTERVAL_MS
      ) {
        return;
      }
      lastAssetStateBreadcrumbAt = now;
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
          info: (message) => hiloLogger.info(message, "chat"),
          warn: (message) => hiloLogger.warn(message, "chat"),
          error: (message) => hiloLogger.error(message, "chat"),
        }
      : void 0;
    const ws = new AgentWSClient({
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
      onConnectionChange: (next) => {
        if (next && !wasConnected) {
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
        } else if (!next && wasConnected) {
          trackEvent(TRACK_EVENTS.WS_DISCONNECT, {});
          wasConnected = false;
          connectStart = Date.now();
          trackEvent(TRACK_EVENTS.WS_RECONNECT, {});
          failedAttempts = 0;
        } else if (!next && !wasConnected) {
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
        setConnected(next);
      },
    });
    wsRef.current = ws;
    ws.connect();
    return () => {
      ws.disconnect();
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
  const send = reactExports.useCallback(
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
  const subscribe = reactExports.useCallback((handler) => {
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
      send,
      subscribe,
    }),
    [scope, resolvedWsUrl, connected, send, subscribe],
  );
  return (
    <WSConnectionContext.Provider value={value}>
      {children}
    </WSConnectionContext.Provider>
  );
}
