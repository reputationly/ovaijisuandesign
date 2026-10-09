// build-incremental-node-data.js
import {
  POPOVER_DRAFT_DATA_KEY,
  isAssetBackedNode,
  isGenerationErrorStatus,
} from "./group-nodes-in-canvas.js";
import { mergePopoverDraftMaps } from "./resolve-derived-collision.js";
export function carryIsEmptyField(saved) {
  return saved?.isEmpty && !saved.assetId
    ? {
        isEmpty: true,
      }
    : {};
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
export function buildIncrementalNodeData(fileNode, resolveFileUrlById, existingMeta) {
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
  const durationSec = typeof data2.duration === "number" ? data2.duration : void 0;
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
export const CANVAS_UNHYDRATED_RECOVERY_DELAY_MS = 3e3;
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
      (status === 404 || status === 408 || status === 425 || status === 429 || status >= 500))
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
function isRetryableCanvasLoadError(error) {
  if (!error || typeof error !== "object") return false;
  const { type: type2, status } = error;
  if (type2 === "network" || type2 === "timeout") return true;
  if (type2 !== "http" || typeof status !== "number") return false;
  return status === 404 || status === 408 || status === 425 || status === 429 || status >= 500;
}
export function shouldRecoverUnhydratedCanvas(error, hydratedNodeCount) {
  return hydratedNodeCount === null && isRetryableCanvasLoadError(error);
}
function abortReason(signal) {
  return signal.reason ?? new DOMException("Canvas snapshot load aborted", "AbortError");
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
  const { load: load2, signal, delaysMs = CANVAS_LOAD_RETRY_DELAYS_MS } = options;
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
export function toGenerationStatusRuntimeUpdate(liveNode, snapshot2, data2 = snapshot2.data) {
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
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
export function mergeServerNodeDataPreservingPopoverDraft(serverData, localData) {
  const serverDraft = serverData[POPOVER_DRAFT_DATA_KEY];
  const localDraft = localData?.[POPOVER_DRAFT_DATA_KEY];
  const localDraftMap = asDraftMap(localDraft);
  if (!localDraftMap) return stripDraftTombstones(serverData);
  if (serverDraft === null) return serverData;
  const serverDraftMap = asDraftMap(serverDraft);
  const tombstonedKeys = serverDraftMap
    ? Object.keys(serverDraftMap).filter((key2) => serverDraftMap[key2] === null)
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
function applyTombstones(draftMap, tombstonedKeys) {
  if (!draftMap) return void 0;
  if (tombstonedKeys.length === 0) return draftMap;
  const next2 = {
    ...draftMap,
  };
  for (const key2 of tombstonedKeys) delete next2[key2];
  return Object.keys(next2).length > 0 ? next2 : void 0;
}
function normalizeStartedAt(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function normalizeWaitSeconds(seconds, legacyMinutes) {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }
  if (typeof legacyMinutes === "number" && Number.isFinite(legacyMinutes) && legacyMinutes > 0) {
    return Math.ceil(legacyMinutes * 60);
  }
  return void 0;
}
export function shouldMirrorIncomingGeneratingData(current2, incomingData, persistedStatus) {
  if (incomingData.status === "pending" || incomingData.status === "generating") return true;
  if (isGenerationErrorStatus(incomingData.status) || incomingData.status === "queue_paused") {
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
export function buildGeneratingInfoFromIncomingData(current2, incomingData) {
  return {
    ...(current2 ?? {
      prompt: incomingData.prompt ?? "",
      model: incomingData.model ?? incomingData.model_id ?? "",
    }),
    prompt: current2?.prompt ?? incomingData.prompt ?? "",
    model: current2?.model ?? incomingData.model ?? incomingData.model_id ?? "",
    modelId: current2?.modelId ?? incomingData.model_id,
    backend: current2?.backend ?? incomingData.backend,
    params: current2?.params ?? incomingData.params,
    phase: incomingData.status === "pending" ? "pending" : "generating",
    // The gateway owns the durable origin, so incoming wins over the local
    // guess here (unlike prompt/model above, where the local submit value is
    // the more accurate one). Cleared while pending — a queued node has not
    // started generating yet.
    generationStartedAt:
      incomingData.status === "pending"
        ? void 0
        : (normalizeStartedAt(incomingData.generationStartedAt) ?? current2?.generationStartedAt),
    error: void 0,
    errorReason: void 0,
    retryPayload: void 0,
    estimatedRemainingWaitSeconds:
      incomingData.status === "pending"
        ? void 0
        : normalizeWaitSeconds(
            incomingData.estimatedRemainingWaitSeconds,
            incomingData.estimatedRemainingWaitMinutes,
          ),
  };
}
export function isGenerationErrorNode(node2) {
  return isGenerationErrorStatus(node2.data?.status);
}
export function mergeRejectedCanvasCandidateAdditions(lastGood, candidate, deletionReplay) {
  const replayedNodeIds = new Set(deletionReplay?.removedNodeIds ?? []);
  const replayedEdgeIds = new Set(deletionReplay?.removedEdgeIds ?? []);
  const durableNodes = lastGood.nodes.filter((node2) => !replayedNodeIds.has(node2.id));
  const durableNodeIds = new Set(durableNodes.map((node2) => node2.id));
  const durableEdges = lastGood.edges.filter(
    (edge) =>
      !replayedEdgeIds.has(edge.id) &&
      durableNodeIds.has(edge.source) &&
      durableNodeIds.has(edge.target),
  );
  const candidateNodeById = new Map();
  for (const node2 of candidate.nodes) {
    if (
      !node2.id ||
      replayedNodeIds.has(node2.id) ||
      durableNodeIds.has(node2.id) ||
      candidateNodeById.has(node2.id)
    ) {
      continue;
    }
    candidateNodeById.set(node2.id, node2);
  }
  const validCandidateNodeIds = new Set();
  const invalidCandidateNodeIds = new Set();
  for (const startId of candidateNodeById.keys()) {
    if (validCandidateNodeIds.has(startId) || invalidCandidateNodeIds.has(startId)) continue;
    const path2 = [];
    const pathIndexes = new Map();
    let currentId = startId;
    let valid2 = false;
    while (currentId) {
      if (durableNodeIds.has(currentId) || validCandidateNodeIds.has(currentId)) {
        valid2 = true;
        break;
      }
      if (invalidCandidateNodeIds.has(currentId) || pathIndexes.has(currentId)) break;
      const current2 = candidateNodeById.get(currentId);
      if (!current2) break;
      pathIndexes.set(currentId, path2.length);
      path2.push(currentId);
      if (!current2.parentId) {
        valid2 = true;
        break;
      }
      currentId = current2.parentId;
    }
    const destination = valid2 ? validCandidateNodeIds : invalidCandidateNodeIds;
    for (const nodeId of path2) destination.add(nodeId);
  }
  const candidateAdditions = [...candidateNodeById.values()].filter((node2) =>
    validCandidateNodeIds.has(node2.id),
  );
  const finalNodeIds = new Set([...durableNodeIds, ...validCandidateNodeIds]);
  const durableEdgeIds = new Set(durableEdges.map((edge) => edge.id));
  const admittedEdgeIds = new Set(durableEdgeIds);
  const candidateEdges = candidate.edges.filter((edge) => {
    if (
      !edge.id ||
      replayedEdgeIds.has(edge.id) ||
      admittedEdgeIds.has(edge.id) ||
      !finalNodeIds.has(edge.source) ||
      !finalNodeIds.has(edge.target)
    ) {
      return false;
    }
    admittedEdgeIds.add(edge.id);
    return true;
  });
  return {
    canvas: {
      ...lastGood,
      nodes: [...durableNodes, ...candidateAdditions],
      edges: [...durableEdges, ...candidateEdges],
    },
    preservedNodeCount: candidateAdditions.length,
    preservedEdgeCount: candidateEdges.length,
    replayedNodeCount: lastGood.nodes.length - durableNodes.length,
    replayedEdgeCount: lastGood.edges.length - durableEdges.length,
  };
}
