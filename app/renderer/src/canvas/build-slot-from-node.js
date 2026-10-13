// build-slot-from-node.js
import { imageNodeAssetId } from "./ungroup-in-canvas.js";
import {
  isGenerationErrorStatus,
  isGenerationRefundStatus,
} from "./compute-group-bounds-from-children.js";
import { parseNodeId } from "./find-free-position-from-anchor.js";

const EMPTY_IMAGE_NODE_VIEW = Object.freeze({
  slots: Object.freeze([]),
  primaryIndex: 0,
  primary: void 0,
  isMulti: false,
  hasLoading: false,
  hasError: false,
  status: "empty",
  isUserEmpty: false,
  rounds: Object.freeze([]),
  activeRoundIndex: 0,
});

function nodeSlotStatus(node) {
  const data = node.data;
  const status = data?.status;
  if (node.type === "placeholder") {
    if (
      status === "pending" ||
      status === "generating" ||
      status === "loading" ||
      status === "queue_paused" ||
      status === "error" ||
      status === "recoverable_error" ||
      status === "status_unknown"
    ) {
      return status;
    }
    return "loading";
  }
  if (status === "recoverable_error" || status === "status_unknown")
    return status;
  if (
    status === "error" &&
    typeof data?.generationAttemptId === "string" &&
    data.generationAttemptId.length > 0
  ) {
    return status;
  }
  return "ready";
}

function assignRefundDisplayOwners(slots) {
  const ownerByTaskId = new Map();
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot?.refundStatus || !slot.refundTaskId) continue;
    if (!ownerByTaskId.has(slot.refundTaskId))
      ownerByTaskId.set(slot.refundTaskId, index);
  }
  return slots.map((slot, index) => {
    const refundDisplayOwner = slot.refundTaskId
      ? ownerByTaskId.get(slot.refundTaskId) === index
      : slot.refundStatus
        ? true
        : void 0;
    return refundDisplayOwner === void 0
      ? slot
      : {
          ...slot,
          refundDisplayOwner,
        };
  });
}

function readNodeGenerationStartedAt(node) {
  const value = node.data?.generationStartedAt;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

function buildSlotFromNode(node, resolveMeta) {
  const assetId = imageNodeAssetId(node);
  const status = nodeSlotStatus(node);
  const meta = resolveMeta(assetId);
  let slotError = null;
  if (node.type === "placeholder") {
    const placeholderData = node.data;
    if (isGenerationErrorStatus(placeholderData?.status)) {
      slotError =
        typeof placeholderData.errorMessage === "string" &&
        placeholderData.errorMessage.length > 0
          ? placeholderData.errorMessage
          : "";
    }
  }
  const dataName = node.data?.name;
  const dataW = node.data?.width;
  const dataH = node.data?.height;
  const waitData = node.data;
  const rawWaitSeconds = waitData?.estimatedRemainingWaitSeconds;
  const rawLegacyWaitMinutes = waitData?.estimatedRemainingWaitMinutes;
  const estimatedRemainingWaitSeconds =
    status !== "pending" &&
    typeof rawWaitSeconds === "number" &&
    Number.isFinite(rawWaitSeconds) &&
    rawWaitSeconds > 0
      ? Math.ceil(rawWaitSeconds)
      : status !== "pending" &&
          typeof rawLegacyWaitMinutes === "number" &&
          Number.isFinite(rawLegacyWaitMinutes) &&
          rawLegacyWaitMinutes > 0
        ? Math.ceil(rawLegacyWaitMinutes * 60)
        : void 0;
  const rawRetryPayload = node.data?.retryPayload;
  const retryPayload =
    status === "queue_paused" &&
    rawRetryPayload &&
    typeof rawRetryPayload === "object"
      ? rawRetryPayload
      : void 0;
  const refundData = node.data;
  const refundStatus =
    isGenerationErrorStatus(status) &&
    isGenerationRefundStatus(refundData?.refundStatus)
      ? refundData.refundStatus
      : void 0;
  const refundedCredits =
    refundStatus === "refunded" &&
    typeof refundData?.refundedCredits === "number" &&
    Number.isFinite(refundData.refundedCredits)
      ? refundData.refundedCredits
      : void 0;
  const receipt =
    refundData?.generationTaskReceipt &&
    typeof refundData.generationTaskReceipt === "object" &&
    !Array.isArray(refundData.generationTaskReceipt)
      ? refundData.generationTaskReceipt
      : void 0;
  const refundTaskId =
    typeof refundData?.cloudTaskId === "string" &&
    refundData.cloudTaskId.length > 0
      ? refundData.cloudTaskId
      : typeof receipt?.taskId === "string" && receipt.taskId.length > 0
        ? receipt.taskId
        : void 0;
  const pendingMeta = status === "ready" && !meta?.url && slotError === null;
  return {
    id: assetId,
    status,
    url: status === "ready" ? meta?.url : void 0,
    error:
      slotError ??
      (status === "error" ||
      status === "recoverable_error" ||
      status === "status_unknown"
        ? (node.data?.errorMessage ?? null)
        : null),
    ...(refundStatus
      ? {
          refundStatus,
        }
      : {}),
    ...(refundedCredits !== void 0
      ? {
          refundedCredits,
        }
      : {}),
    ...(refundTaskId
      ? {
          refundTaskId,
        }
      : {}),
    name: meta?.name ?? (typeof dataName === "string" ? dataName : void 0),
    width: meta?.width ?? (typeof dataW === "number" ? dataW : void 0),
    height: meta?.height ?? (typeof dataH === "number" ? dataH : void 0),
    fileSize: meta?.fileSize,
    prompt: meta?.prompt ?? node.data?.prompt,
    model: meta?.model ?? node.data?.model,
    modelId: meta?.modelId ?? node.data?.model_id,
    backend: meta?.backend ?? node.data?.backend,
    params: meta?.params ?? node.data?.params,
    estimatedRemainingWaitSeconds,
    retryPayload,
    pendingMeta: pendingMeta || void 0,
    round: Number.isInteger(node.round) ? node.round : void 0,
    generationStartedAt: readNodeGenerationStartedAt(node),
  };
}

function groupSlotsByRound(slots) {
  if (slots.length === 0) return [];
  const byRound = new Map();
  for (const slot of slots) {
    const key = slot.round ?? 0;
    let bucket = byRound.get(key);
    if (!bucket) {
      bucket = [];
      byRound.set(key, bucket);
    }
    bucket.push(slot);
  }
  return [...byRound.entries()]
    .sort(([leftRound], [rightRound]) => leftRound - rightRound)
    .map(([, bucket]) => bucket);
}

function buildImageGroupView(main, subs, resolveMeta, opts) {
  if (!main) {
    return opts?.isUserEmpty
      ? {
          ...EMPTY_IMAGE_NODE_VIEW,
          isUserEmpty: true,
        }
      : EMPTY_IMAGE_NODE_VIEW;
  }
  const mainSlot = buildSlotFromNode(main, resolveMeta);
  const subSlots = subs.map((subNode) => buildSlotFromNode(subNode, resolveMeta));
  const allSlots = assignRefundDisplayOwners([mainSlot, ...subSlots]);
  const rounds = groupSlotsByRound(allSlots);
  let activeRoundIndex = rounds.findIndex(
    (bucket) => bucket[0]?.round === mainSlot.round,
  );
  if (activeRoundIndex === -1) {
    const mainRoundKey = mainSlot.round ?? 0;
    activeRoundIndex = rounds.findIndex(
      (bucket) => (bucket[0]?.round ?? 0) === mainRoundKey,
    );
  }
  if (activeRoundIndex === -1)
    activeRoundIndex = Math.max(0, rounds.length - 1);
  const activeSlots = rounds[activeRoundIndex] ?? allSlots;
  const activePrimary = activeSlots[0] ?? mainSlot;
  const hasLoading = activeSlots.some(
    (slot) =>
      slot.status === "pending" ||
      slot.status === "generating" ||
      slot.status === "loading",
  );
  const hasError = activeSlots.some(
    (slot) =>
      slot.status === "error" ||
      slot.status === "recoverable_error" ||
      slot.status === "status_unknown",
  );
  const status =
    activePrimary.status !== "ready" ||
    activePrimary.url ||
    activePrimary.pendingMeta
      ? "ready"
      : opts?.isUserEmpty
        ? "empty"
        : "ready";
  return {
    slots: activeSlots,
    primaryIndex: 0,
    primary: activePrimary,
    isMulti: activeSlots.length > 1,
    hasLoading,
    hasError,
    status,
    isUserEmpty: opts?.isUserEmpty ?? false,
    rounds,
    activeRoundIndex,
  };
}

function toSlotMeta(meta) {
  if (!meta) return void 0;
  return {
    url: meta.url,
    name: meta.name,
    width: meta.width,
    height: meta.height,
    fileSize: meta.fileSize,
    prompt: meta.prompt,
    model: meta.model,
    modelId: meta.model_id,
    backend: meta.backend,
    params: meta.params,
  };
}

export function buildImageNodeView(
  nodeId,
  data,
  subImages,
  metaById,
  isUserEmpty,
  mainRound,
  nodeAssetId,
) {
  const resolve =
    typeof metaById === "function" ? metaById : (id) => metaById.get(id);
  const resolveSlotMeta = (assetId) => toSlotMeta(resolve(assetId));
  const resolvedData = data ?? {};
  const { assetId: parsedAssetId } = parseNodeId(nodeId);
  const explicitAssetId =
    typeof resolvedData.assetId === "string" && resolvedData.assetId.length > 0
      ? resolvedData.assetId
      : typeof nodeAssetId === "string" && nodeAssetId.length > 0
        ? nodeAssetId
        : void 0;
  const mainAssetId = explicitAssetId ?? parsedAssetId;
  const mainMeta = resolve(mainAssetId);
  if (
    isUserEmpty &&
    (!explicitAssetId || !mainMeta?.url) &&
    subImages.length === 0 &&
    resolvedData.status !== "loading" &&
    !isGenerationErrorStatus(resolvedData.status)
  ) {
    return {
      ...EMPTY_IMAGE_NODE_VIEW,
      isUserEmpty: true,
    };
  }
  const fallbackRound =
    mainRound ??
    subImages.reduce((max, sub) => {
      const round = sub.round;
      return typeof round === "number" && round > max ? round : max;
    }, 0);
  const mainNode = {
    id: nodeId,
    type: "image",
    assetId: mainAssetId,
    data: resolvedData,
    ...(fallbackRound > 0
      ? {
          round: fallbackRound,
        }
      : {}),
  };
  const subFileNodes = subImages;
  const view = buildImageGroupView(mainNode, subFileNodes, resolveSlotMeta, {
    isUserEmpty,
  });
  if (
    !view.primary?.url &&
    !view.primary?.pendingMeta &&
    view.status === "ready" &&
    subImages.length === 0
  ) {
    const aliasMeta = resolve(nodeId);
    if (aliasMeta?.url) {
      const slot = {
        id: parsedAssetId,
        status: "ready",
        url: aliasMeta.url,
        name: aliasMeta.name,
        width: aliasMeta.width,
        height: aliasMeta.height,
        fileSize: aliasMeta.fileSize,
        prompt: aliasMeta.prompt,
        model: aliasMeta.model,
        backend: aliasMeta.backend,
        params: aliasMeta.params,
      };
      return {
        slots: [slot],
        primaryIndex: 0,
        primary: slot,
        isMulti: false,
        hasLoading: false,
        hasError: false,
        status: "ready",
        isUserEmpty: false,
        rounds: [[slot]],
        activeRoundIndex: 0,
      };
    }
  }
  return view;
}
