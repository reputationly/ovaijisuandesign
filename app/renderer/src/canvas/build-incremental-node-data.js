// build-incremental-node-data.js
import {
  isAssetBackedNode,
  isGenerationErrorStatus,
  POPOVER_DRAFT_DATA_KEY,
} from "./compute-group-bounds-from-children.js";

function asDraftMap$1(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

function mergePopoverDraftMaps(base2, override) {
  if (override === null) return void 0;
  const baseMap = asDraftMap$1(base2);
  const overrideMap = asDraftMap$1(override);
  if (!baseMap) return overrideMap;
  if (!overrideMap) return baseMap;
  const merged = {
    ...baseMap,
  };
  for (const [key2, overrideEntry] of Object.entries(overrideMap)) {
    if (overrideEntry === null) {
      delete merged[key2];
      continue;
    }
    const baseEntryMap = asDraftMap$1(baseMap[key2]);
    const overrideEntryMap = asDraftMap$1(overrideEntry);
    merged[key2] =
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
  const data2 = {
    ...(fileNode.data ?? {}),
  };
  if (
    typeof fileNode.assetId === "string" &&
    fileNode.assetId.length > 0 &&
    typeof data2.assetId !== "string"
  ) {
    data2.assetId = fileNode.assetId;
  }
  if (fileNode.meta?.cloneOf != null) {
    data2.cloneOf = fileNode.meta.cloneOf;
  }
  return data2;
}

export function buildIncrementalNodeData(
  fileNode,
  resolveFileUrlById,
  existingMeta,
) {
  const data2 = mirrorImageFieldsIntoData(fileNode);
  if (!isAssetBackedNode(fileNode.type) || !fileNode.assetId) {
    return {
      data: data2,
    };
  }
  const name2 = data2.name;
  const path2 = data2.path;
  const prompt = data2.prompt;
  const description = data2.description;
  const model = data2.model;
  const voiceId = data2.voiceId;
  const lyrics = data2.lyrics;
  const compositionPlan = data2.composition_plan;
  const params = data2.params;
  const backend = data2.backend;
  const modelId = data2.model_id;
  const sourceTool = data2.source_tool;
  const cloudTraceId = data2.cloudTraceId;
  const cloudTaskId = data2.cloudTaskId;
  const providerTaskId = data2.providerTaskId;
  const time = data2.time;
  const referenceImageIds = data2.referenceImageIds;
  const referenceAudioIds = data2.referenceAudioIds;
  const referenceVideoIds = data2.referenceVideoIds;
  const referenceTextIds = data2.referenceTextIds;
  const width = typeof data2.width === "number" ? data2.width : void 0;
  const height = typeof data2.height === "number" ? data2.height : void 0;
  const durationSec =
    typeof data2.duration === "number" ? data2.duration : void 0;
  const previewWidth = fileNode.size?.width;
  const previewHeight = fileNode.size?.height;
  const meta2 = {
    url: resolveFileUrlById?.(fileNode.assetId) ?? existingMeta?.url ?? "",
    name: name2 ?? existingMeta?.name ?? fileNode.assetId,
    path: path2 ?? existingMeta?.path ?? "",
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
    data: data2,
    meta: meta2,
  };
}

const CANVAS_LOAD_RETRY_DELAYS_MS = [200, 400, 800, 1200, 2e3];

export function isSameCanvasLoadOwner(owner, instance2, workspaceId2) {
  return owner.instance === instance2 && owner.workspaceId === workspaceId2;
}

export function beginCanvasSnapshotLoad(state2) {
  if (state2.inFlight) {
    state2.reloadRequested = true;
    return false;
  }
  state2.inFlight = true;
  return true;
}

function consumeCanvasSnapshotReload(state2) {
  const shouldReload = state2.reloadRequested;
  state2.reloadRequested = false;
  return shouldReload;
}

export function finishCanvasSnapshotLoad(state2) {
  state2.inFlight = false;
  return consumeCanvasSnapshotReload(state2);
}

function isRetryableCanvasLoadError(error) {
  if (!error || typeof error !== "object") return false;
  const { type: type2, status } = error;
  if (type2 === "network" || type2 === "timeout") return true;
  if (type2 !== "http" || typeof status !== "number") return false;
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
  const { type: type2, status } = error;
  if (
    type2 === "network" ||
    type2 === "timeout" ||
    (type2 === "http" &&
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
  if (type2 === "http" && (status === 401 || status === 403)) {
    return {
      kind: "access",
      phase,
      autoRecoverable,
    };
  }
  if (type2 === "parse") {
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
    const timer2 = setTimeout(() => finish(resolve), delayMs);
    const onAbort = () => {
      clearTimeout(timer2);
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
    load: load2,
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
      const snapshot2 = await load2(attemptController.signal, attempt);
      throwIfAborted(signal);
      return snapshot2;
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
  const { state: state2, ...retryOptions } = options;
  let snapshot2;
  do {
    snapshot2 = await loadCanvasSnapshotWithRetry(retryOptions);
  } while (consumeCanvasSnapshotReload(state2));
  return snapshot2;
}

export function toGenerationStatusRuntimeUpdate(
  liveNode,
  snapshot2,
  data2 = snapshot2.data,
) {
  if (liveNode.id !== snapshot2.id) return null;
  return {
    id: liveNode.id,
    data: data2,
  };
}

export function mergeGenerationStatusSavedNode(existing, snapshot2) {
  if (!existing) {
    const { groupId: groupId2, round: round2, ...node2 } = snapshot2;
    return {
      ...node2,
      ...(groupId2
        ? {
            groupId: groupId2,
          }
        : {}),
      ...(typeof round2 === "number" && Number.isInteger(round2)
        ? {
            round: round2,
          }
        : {}),
    };
  }
  const next2 = {
    ...existing,
    type: snapshot2.type,
    ...(snapshot2.data
      ? {
          data: snapshot2.data,
        }
      : {}),
    ...(snapshot2.size
      ? {
          size: snapshot2.size,
        }
      : {}),
    ...(snapshot2.sizes
      ? {
          sizes: snapshot2.sizes,
        }
      : {}),
  };
  if ("assetId" in snapshot2) {
    if (snapshot2.assetId) next2.assetId = snapshot2.assetId;
    else delete next2.assetId;
  }
  if ("isEmpty" in snapshot2) {
    if (snapshot2.isEmpty === true) next2.isEmpty = true;
    else delete next2.isEmpty;
  }
  return next2;
}

function asDraftMap(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

function applyTombstones(draftMap, tombstonedKeys) {
  if (!draftMap) return void 0;
  if (tombstonedKeys.length === 0) return draftMap;
  const next2 = {
    ...draftMap,
  };
  for (const key2 of tombstonedKeys) delete next2[key2];
  return Object.keys(next2).length > 0 ? next2 : void 0;
}

function stripDraftTombstones(serverData) {
  const serverDraftMap = asDraftMap(serverData[POPOVER_DRAFT_DATA_KEY]);
  if (!serverDraftMap) return serverData;
  const tombstonedKeys = Object.keys(serverDraftMap).filter(
    (key2) => serverDraftMap[key2] === null,
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
        (key2) => serverDraftMap[key2] === null,
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
  current2,
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
    (current2?.phase === "generating" || persistedStatus === "generating") &&
    normalizeWaitSeconds(
      incomingData.estimatedRemainingWaitSeconds,
      incomingData.estimatedRemainingWaitMinutes,
    ) !== void 0
  );
}

export function shouldDeferTransientPending(current2, incomingData) {
  return current2?.phase === "generating" && incomingData.status === "pending";
}

export function isGenerationErrorNode(node2) {
  return isGenerationErrorStatus(node2.data?.status);
}
