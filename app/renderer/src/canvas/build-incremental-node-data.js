// build-incremental-node-data.js
import {
  isAssetBackedNode,
  isGenerationErrorStatus,
  POPOVER_DRAFT_DATA_KEY,
} from "./compute-group-bounds-from-children.js";

function asPopoverDraftMap(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

function mergePopoverDraftMaps(base, override) {
  if (override === null) return void 0;
  const baseMap = asPopoverDraftMap(base);
  const overrideMap = asPopoverDraftMap(override);
  if (!baseMap) return overrideMap;
  if (!overrideMap) return baseMap;
  const merged = {
    ...baseMap,
  };
  for (const [key, overrideEntry] of Object.entries(overrideMap)) {
    if (overrideEntry === null) {
      delete merged[key];
      continue;
    }
    const baseEntryMap = asPopoverDraftMap(baseMap[key]);
    const overrideEntryMap = asPopoverDraftMap(overrideEntry);
    merged[key] =
      baseEntryMap && overrideEntryMap
        ? {
            ...baseEntryMap,
            ...overrideEntryMap,
          }
        : overrideEntry;
  }
  return Object.keys(merged).length > 0 ? merged : void 0;
}

export function mirrorImageFieldsIntoData(fileNode) {
  const data = {
    ...(fileNode.data ?? {}),
  };
  if (
    typeof fileNode.assetId === "string" &&
    fileNode.assetId.length > 0 &&
    typeof data.assetId !== "string"
  ) {
    data.assetId = fileNode.assetId;
  }
  if (fileNode.meta?.cloneOf != null) {
    data.cloneOf = fileNode.meta.cloneOf;
  }
  return data;
}

export function buildIncrementalNodeData(
  fileNode,
  resolveFileUrlById,
  existingMeta,
) {
  const data = mirrorImageFieldsIntoData(fileNode);
  if (!isAssetBackedNode(fileNode.type) || !fileNode.assetId) {
    return {
      data,
    };
  }
  const assetName = data.name;
  const path = data.path;
  const prompt = data.prompt;
  const description = data.description;
  const model = data.model;
  const voiceId = data.voiceId;
  const lyrics = data.lyrics;
  const compositionPlan = data.composition_plan;
  const params = data.params;
  const backend = data.backend;
  const modelId = data.model_id;
  const sourceTool = data.source_tool;
  const cloudTraceId = data.cloudTraceId;
  const cloudTaskId = data.cloudTaskId;
  const providerTaskId = data.providerTaskId;
  const time = data.time;
  const referenceImageIds = data.referenceImageIds;
  const referenceAudioIds = data.referenceAudioIds;
  const referenceVideoIds = data.referenceVideoIds;
  const referenceTextIds = data.referenceTextIds;
  const width = typeof data.width === "number" ? data.width : void 0;
  const height = typeof data.height === "number" ? data.height : void 0;
  const durationSec =
    typeof data.duration === "number" ? data.duration : void 0;
  const previewWidth = fileNode.size?.width;
  const previewHeight = fileNode.size?.height;
  const meta = {
    url: resolveFileUrlById?.(fileNode.assetId) ?? existingMeta?.url ?? "",
    name: assetName ?? existingMeta?.name ?? fileNode.assetId,
    path: path ?? existingMeta?.path ?? "",
    type: fileNode.type,
    prompt: prompt ?? existingMeta?.prompt,
    description: description ?? existingMeta?.description,
    model: model ?? existingMeta?.model,
    voiceId: voiceId ?? existingMeta?.voiceId,
    lyrics: lyrics ?? existingMeta?.lyrics,
    compositionPlan: compositionPlan ?? existingMeta?.compositionPlan,
    params: params ?? existingMeta?.params,
    backend: backend ?? existingMeta?.backend,
    model_id: modelId ?? existingMeta?.model_id,
    source_tool: sourceTool ?? existingMeta?.source_tool,
    cloudTraceId: cloudTraceId ?? existingMeta?.cloudTraceId,
    cloudTaskId: cloudTaskId ?? existingMeta?.cloudTaskId,
    providerTaskId: providerTaskId ?? existingMeta?.providerTaskId,
    time: time ?? existingMeta?.time,
    width: width ?? existingMeta?.width,
    height: height ?? existingMeta?.height,
    durationSec: durationSec ?? existingMeta?.durationSec,
    previewWidth: previewWidth ?? existingMeta?.previewWidth,
    previewHeight: previewHeight ?? existingMeta?.previewHeight,
    referenceImageIds: referenceImageIds ?? existingMeta?.referenceImageIds,
    referenceVideoIds: referenceVideoIds ?? existingMeta?.referenceVideoIds,
    referenceAudioIds: referenceAudioIds ?? existingMeta?.referenceAudioIds,
    referenceTextIds: referenceTextIds ?? existingMeta?.referenceTextIds,
  };
  return {
    data,
    meta,
  };
}

const CANVAS_LOAD_RETRY_DELAYS_MS = [200, 400, 800, 1200, 2e3];

export function isSameCanvasLoadOwner(owner, instance, workspaceId) {
  return owner.instance === instance && owner.workspaceId === workspaceId;
}

export function beginCanvasSnapshotLoad(state) {
  if (state.inFlight) {
    state.reloadRequested = true;
    return false;
  }
  state.inFlight = true;
  return true;
}

function consumeCanvasSnapshotReload(state) {
  const shouldReload = state.reloadRequested;
  state.reloadRequested = false;
  return shouldReload;
}

export function finishCanvasSnapshotLoad(state) {
  state.inFlight = false;
  return consumeCanvasSnapshotReload(state);
}

function isRetryableCanvasLoadError(error) {
  if (!error || typeof error !== "object") return false;
  const { type, status } = error;
  if (type === "network" || type === "timeout") return true;
  if (type !== "http" || typeof status !== "number") return false;
  return (
    status === 404 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

export function classifyCanvasLoadFailure(error, phase) {
  const autoRecoverable = isRetryableCanvasLoadError(error);
  if (!error || typeof error !== "object") {
    return {
      kind: "unknown",
      phase,
      autoRecoverable,
    };
  }
  const { type, status } = error;
  if (
    type === "network" ||
    type === "timeout" ||
    (type === "http" &&
      typeof status === "number" &&
      (status === 404 ||
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status >= 500))
  ) {
    return {
      kind: "unavailable",
      phase,
      autoRecoverable,
    };
  }
  if (type === "http" && (status === 401 || status === 403)) {
    return {
      kind: "access",
      phase,
      autoRecoverable,
    };
  }
  if (type === "parse") {
    return {
      kind: "invalid-response",
      phase,
      autoRecoverable,
    };
  }
  return {
    kind: "unknown",
    phase,
    autoRecoverable,
  };
}

export function shouldRecoverUnhydratedCanvas(error, hydratedNodeCount) {
  return hydratedNodeCount === null && isRetryableCanvasLoadError(error);
}

function abortReason(signal) {
  return (
    signal.reason ??
    new DOMException("Canvas snapshot load aborted", "AbortError")
  );
}

function throwIfAborted(signal) {
  if (signal.aborted) throw abortReason(signal);
}

function waitForRetry(delayMs, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const timer = setTimeout(() => finish(resolve), delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      finish(() => reject(abortReason(signal)));
    };
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    if (signal.aborted) onAbort();
  });
}

async function loadCanvasSnapshotWithRetry(options) {
  const {
    load,
    signal,
    delaysMs = CANVAS_LOAD_RETRY_DELAYS_MS,
  } = options;
  let attempt = 0;
  while (true) {
    throwIfAborted(signal);
    const attemptController = new AbortController();
    const abortAttempt = () => attemptController.abort(abortReason(signal));
    signal.addEventListener("abort", abortAttempt, {
      once: true,
    });
    if (signal.aborted) abortAttempt();
    let retryDelayMs;
    let attemptFailed = false;
    try {
      const snapshot = await load(attemptController.signal, attempt);
      throwIfAborted(signal);
      return snapshot;
    } catch (error) {
      attemptFailed = true;
      if (signal.aborted) throw abortReason(signal);
      const delayMs = delaysMs[attempt];
      if (delayMs === void 0 || !isRetryableCanvasLoadError(error)) {
        throw error;
      }
      retryDelayMs = delayMs;
    } finally {
      signal.removeEventListener("abort", abortAttempt);
      if (attemptFailed && !attemptController.signal.aborted) {
        attemptController.abort();
      }
    }
    await waitForRetry(retryDelayMs, signal);
    attempt += 1;
  }
}

export async function loadLatestCanvasSnapshot(options) {
  const { state, ...retryOptions } = options;
  let snapshot;
  do {
    snapshot = await loadCanvasSnapshotWithRetry(retryOptions);
  } while (consumeCanvasSnapshotReload(state));
  return snapshot;
}

export function toGenerationStatusRuntimeUpdate(
  liveNode,
  snapshot,
  data = snapshot.data,
) {
  if (liveNode.id !== snapshot.id) return null;
  return {
    id: liveNode.id,
    data,
  };
}

export function mergeGenerationStatusSavedNode(existing, snapshot) {
  if (!existing) {
    const { groupId, round, ...node } = snapshot;
    return {
      ...node,
      ...(groupId
        ? {
            groupId,
          }
        : {}),
      ...(typeof round === "number" && Number.isInteger(round)
        ? {
            round,
          }
        : {}),
    };
  }
  const next = {
    ...existing,
    type: snapshot.type,
    ...(snapshot.data
      ? {
          data: snapshot.data,
        }
      : {}),
    ...(snapshot.size
      ? {
          size: snapshot.size,
        }
      : {}),
    ...(snapshot.sizes
      ? {
          sizes: snapshot.sizes,
        }
      : {}),
  };
  if ("assetId" in snapshot) {
    if (snapshot.assetId) next.assetId = snapshot.assetId;
    else delete next.assetId;
  }
  if ("isEmpty" in snapshot) {
    if (snapshot.isEmpty === true) next.isEmpty = true;
    else delete next.isEmpty;
  }
  return next;
}

function asDraftMap(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

function applyTombstones(draftMap, tombstonedKeys) {
  if (!draftMap) return void 0;
  if (tombstonedKeys.length === 0) return draftMap;
  const next = {
    ...draftMap,
  };
  for (const key of tombstonedKeys) delete next[key];
  return Object.keys(next).length > 0 ? next : void 0;
}

function stripDraftTombstones(serverData) {
  const serverDraftMap = asDraftMap(serverData[POPOVER_DRAFT_DATA_KEY]);
  if (!serverDraftMap) return serverData;
  const tombstonedKeys = Object.keys(serverDraftMap).filter(
    (key) => serverDraftMap[key] === null,
  );
  if (tombstonedKeys.length === 0) return serverData;
  const cleaned = applyTombstones(serverDraftMap, tombstonedKeys);
  if (!cleaned) {
    const { [POPOVER_DRAFT_DATA_KEY]: _dropped, ...rest } = serverData;
    return rest;
  }
  return {
    ...serverData,
    [POPOVER_DRAFT_DATA_KEY]: cleaned,
  };
}

export function mergeServerNodeDataPreservingPopoverDraft(
  serverData,
  localData,
) {
  const serverDraft = serverData[POPOVER_DRAFT_DATA_KEY];
  const localDraft = localData?.[POPOVER_DRAFT_DATA_KEY];
  const localDraftMap = asDraftMap(localDraft);
  if (!localDraftMap) return stripDraftTombstones(serverData);
  if (serverDraft === null) return serverData;
  const serverDraftMap = asDraftMap(serverDraft);
  const tombstonedKeys = serverDraftMap
    ? Object.keys(serverDraftMap).filter(
        (key) => serverDraftMap[key] === null,
      )
    : [];
  const mergedDraft = mergePopoverDraftMaps(serverDraft, localDraftMap);
  const withTombstones = applyTombstones(mergedDraft, tombstonedKeys);
  if (!withTombstones) {
    const { [POPOVER_DRAFT_DATA_KEY]: _dropped, ...rest } = serverData;
    return rest;
  }
  return {
    ...serverData,
    [POPOVER_DRAFT_DATA_KEY]: withTombstones,
  };
}

export function normalizeWaitSeconds(seconds, legacyMinutes) {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }
  if (
    typeof legacyMinutes === "number" &&
    Number.isFinite(legacyMinutes) &&
    legacyMinutes > 0
  ) {
    return Math.ceil(legacyMinutes * 60);
  }
  return void 0;
}

export function shouldMirrorIncomingGeneratingData(
  current,
  incomingData,
  persistedStatus,
) {
  if (incomingData.status === "pending" || incomingData.status === "generating")
    return true;
  if (
    isGenerationErrorStatus(incomingData.status) ||
    incomingData.status === "queue_paused"
  ) {
    return false;
  }
  return (
    (current?.phase === "generating" || persistedStatus === "generating") &&
    normalizeWaitSeconds(
      incomingData.estimatedRemainingWaitSeconds,
      incomingData.estimatedRemainingWaitMinutes,
    ) !== void 0
  );
}

export function shouldDeferTransientPending(current, incomingData) {
  return current?.phase === "generating" && incomingData.status === "pending";
}

export function isGenerationErrorNode(node) {
  return isGenerationErrorStatus(node.data?.status);
}
