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

function nodeSlotStatus(node2) {
  const data2 = node2.data;
  const status = data2?.status;
  if (node2.type === "placeholder") {
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
    typeof data2?.generationAttemptId === "string" &&
    data2.generationAttemptId.length > 0
  ) {
    return status;
  }
  return "ready";
}

function assignRefundDisplayOwners(slots) {
  const ownerByTaskId = new Map();
  for (let index2 = 0; index2 < slots.length; index2 += 1) {
    const slot = slots[index2];
    if (!slot?.refundStatus || !slot.refundTaskId) continue;
    if (!ownerByTaskId.has(slot.refundTaskId))
      ownerByTaskId.set(slot.refundTaskId, index2);
  }
  return slots.map((slot, index2) => {
    const refundDisplayOwner = slot.refundTaskId
      ? ownerByTaskId.get(slot.refundTaskId) === index2
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

function readNodeGenerationStartedAt(node2) {
  const value = node2.data?.generationStartedAt;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

function buildSlotFromNode(node2, resolveMeta) {
  const assetId = imageNodeAssetId(node2);
  const status = nodeSlotStatus(node2);
  const meta2 = resolveMeta(assetId);
  let slotError = null;
  if (node2.type === "placeholder") {
    const placeholderData = node2.data;
    if (isGenerationErrorStatus(placeholderData?.status)) {
      slotError =
        typeof placeholderData.errorMessage === "string" &&
        placeholderData.errorMessage.length > 0
          ? placeholderData.errorMessage
          : "";
    }
  }
  const dataName = node2.data?.name;
  const dataW = node2.data?.width;
  const dataH = node2.data?.height;
  const waitData = node2.data;
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
  const rawRetryPayload = node2.data?.retryPayload;
  const retryPayload =
    status === "queue_paused" &&
    rawRetryPayload &&
    typeof rawRetryPayload === "object"
      ? rawRetryPayload
      : void 0;
  const refundData = node2.data;
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
  const pendingMeta = status === "ready" && !meta2?.url && slotError === null;
  return {
    id: assetId,
    status,
    url: status === "ready" ? meta2?.url : void 0,
    error:
      slotError ??
      (status === "error" ||
      status === "recoverable_error" ||
      status === "status_unknown"
        ? (node2.data?.errorMessage ?? null)
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
    name: meta2?.name ?? (typeof dataName === "string" ? dataName : void 0),
    width: meta2?.width ?? (typeof dataW === "number" ? dataW : void 0),
    height: meta2?.height ?? (typeof dataH === "number" ? dataH : void 0),
    fileSize: meta2?.fileSize,
    prompt: meta2?.prompt ?? node2.data?.prompt,
    model: meta2?.model ?? node2.data?.model,
    modelId: meta2?.modelId ?? node2.data?.model_id,
    backend: meta2?.backend ?? node2.data?.backend,
    params: meta2?.params ?? node2.data?.params,
    estimatedRemainingWaitSeconds,
    retryPayload,
    pendingMeta: pendingMeta || void 0,
    round: Number.isInteger(node2.round) ? node2.round : void 0,
    generationStartedAt: readNodeGenerationStartedAt(node2),
  };
}

function groupSlotsByRound(slots) {
  if (slots.length === 0) return [];
  const byRound = new Map();
  for (const slot of slots) {
    const key2 = slot.round ?? 0;
    let bucket = byRound.get(key2);
    if (!bucket) {
      bucket = [];
      byRound.set(key2, bucket);
    }
    bucket.push(slot);
  }
  return [...byRound.entries()]
    .sort(([a2], [b3]) => a2 - b3)
    .map(([, bucket]) => bucket);
}

function buildImageGroupView(main2, subs, resolveMeta, opts) {
  if (!main2) {
    return opts?.isUserEmpty
      ? {
          ...EMPTY_IMAGE_NODE_VIEW,
          isUserEmpty: true,
        }
      : EMPTY_IMAGE_NODE_VIEW;
  }
  const mainSlot = buildSlotFromNode(main2, resolveMeta);
  const subSlots = subs.map((s2) => buildSlotFromNode(s2, resolveMeta));
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

function toSlotMeta(meta2) {
  if (!meta2) return void 0;
  return {
    url: meta2.url,
    name: meta2.name,
    width: meta2.width,
    height: meta2.height,
    fileSize: meta2.fileSize,
    prompt: meta2.prompt,
    model: meta2.model,
    modelId: meta2.model_id,
    backend: meta2.backend,
    params: meta2.params,
  };
}

export function buildImageNodeView(
  nodeId,
  data2,
  subImages,
  metaById,
  isUserEmpty,
  mainRound,
  nodeAssetId,
) {
  const resolve =
    typeof metaById === "function" ? metaById : (id2) => metaById.get(id2);
  const resolveSlotMeta = (assetId) => toSlotMeta(resolve(assetId));
  const d2 = data2 ?? {};
  const { assetId: parsedAssetId } = parseNodeId(nodeId);
  const explicitAssetId =
    typeof d2.assetId === "string" && d2.assetId.length > 0
      ? d2.assetId
      : typeof nodeAssetId === "string" && nodeAssetId.length > 0
        ? nodeAssetId
        : void 0;
  const mainAssetId = explicitAssetId ?? parsedAssetId;
  const mainMeta = resolve(mainAssetId);
  if (
    isUserEmpty &&
    (!explicitAssetId || !mainMeta?.url) &&
    subImages.length === 0 &&
    d2.status !== "loading" &&
    !isGenerationErrorStatus(d2.status)
  ) {
    return {
      ...EMPTY_IMAGE_NODE_VIEW,
      isUserEmpty: true,
    };
  }
  const fallbackRound =
    mainRound ??
    subImages.reduce((max2, sub) => {
      const r2 = sub.round;
      return typeof r2 === "number" && r2 > max2 ? r2 : max2;
    }, 0);
  const mainNode = {
    id: nodeId,
    type: "image",
    assetId: mainAssetId,
    data: d2,
    ...(fallbackRound > 0
      ? {
          round: fallbackRound,
        }
      : {}),
  };
  const subFileNodes = subImages;
  const view2 = buildImageGroupView(mainNode, subFileNodes, resolveSlotMeta, {
    isUserEmpty,
  });
  if (
    !view2.primary?.url &&
    !view2.primary?.pendingMeta &&
    view2.status === "ready" &&
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
  return view2;
}
