// reconcile-group-geometry-for-mode.js
import { CanvasNodeType } from "../vendor.js";
import {
  GROUP_NODE_PADDING,
  computeGroupBoundsFromChildren,
  defaultNodeSizeForType,
  isGenerationErrorStatus,
  isGenerationRefundStatus,
  readGroupFrameMode,
  readGroupSize,
  withParentId,
} from "./group-nodes-in-canvas.js";
export function ungroupInCanvas(canvas, groupId2) {
  const mode2 = canvas.mode;
  const groupNode = canvas.nodes.find((n2) => n2.id === groupId2);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
    };
  }
  const groupModes = new Set();
  for (const m3 of Object.keys(groupNode.positions ?? {})) {
    groupModes.add(m3);
  }
  const groupAbsByMode = new Map();
  for (const m3 of groupModes) {
    const p3 = groupNode.positions?.[m3];
    if (p3) groupAbsByMode.set(m3, p3);
  }
  if (!groupAbsByMode.has(mode2)) {
    const availableModes = Array.from(groupAbsByMode.keys());
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
      error: {
        code: "incomplete-positions",
        mode: mode2,
        missingNodeIds: [groupId2],
        availableModes,
      },
    };
  }
  const updatedChildren = [];
  const nextNodes = [];
  for (const node2 of canvas.nodes) {
    if (node2.id === groupId2) continue;
    if (node2.parentId === groupId2) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      for (const [m3, groupAbs] of groupAbsByMode) {
        const rel = node2.positions?.[m3];
        if (!rel) continue;
        newPositions[m3] = {
          x: rel.x + groupAbs.x,
          y: rel.y + groupAbs.y,
        };
      }
      const next2 = withParentId(
        {
          ...node2,
          positions: newPositions,
        },
        void 0,
      );
      nextNodes.push(next2);
      updatedChildren.push(next2);
      continue;
    }
    nextNodes.push(node2);
  }
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
      edges: canvas.edges,
    },
    removedNodeIds: [groupId2],
    updatedNodes: updatedChildren,
    removed: true,
  };
}
export function reconcileGroupGeometryForMode(canvas, mode2) {
  const childrenByParent = new Map();
  for (const node2 of canvas.nodes) {
    if (!node2.parentId) continue;
    const bucket = childrenByParent.get(node2.parentId);
    if (bucket) bucket.push(node2);
    else childrenByParent.set(node2.parentId, [node2]);
  }
  if (childrenByParent.size === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const updatedById = new Map();
  for (const node2 of canvas.nodes) {
    if (node2.type !== CanvasNodeType.Group) continue;
    const children2 = childrenByParent.get(node2.id);
    if (!children2 || children2.length === 0) continue;
    const visibleChildren = children2.filter((c3) => !c3.meta?.hidden);
    if (visibleChildren.length === 0) continue;
    let allVisibleChildrenHavePos = true;
    for (const c3 of visibleChildren) {
      if (!c3.positions?.[mode2]) {
        allVisibleChildrenHavePos = false;
        break;
      }
    }
    if (!allVisibleChildrenHavePos) continue;
    const groupPos = node2.positions?.[mode2];
    if (!groupPos) {
      const absChildren = visibleChildren.map((c3) => {
        const p3 = c3.positions?.[mode2];
        return {
          position: p3,
          size: c3.size,
          type: c3.type,
        };
      });
      const { position: newGroupPos2, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      updatedById.set(node2.id, {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
          [mode2]: newGroupPos2,
        },
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
      });
      for (const c3 of children2) {
        const abs = c3.positions?.[mode2];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos2.x,
          y: abs.y - newGroupPos2.y,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
      continue;
    }
    const groupSize = readGroupSize(node2, mode2);
    if (!groupSize) continue;
    let relMinX = Number.POSITIVE_INFINITY;
    let relMinY = Number.POSITIVE_INFINITY;
    let relMaxX = Number.NEGATIVE_INFINITY;
    let relMaxY = Number.NEGATIVE_INFINITY;
    for (const c3 of visibleChildren) {
      const p3 = c3.positions?.[mode2];
      const sz = c3.size ?? defaultNodeSizeForType(c3.type);
      relMinX = Math.min(relMinX, p3.x);
      relMinY = Math.min(relMinY, p3.y);
      relMaxX = Math.max(relMaxX, p3.x + sz.width);
      relMaxY = Math.max(relMaxY, p3.y + sz.height);
    }
    const disjoint =
      relMaxX <= 0 || relMinX >= groupSize.width || relMaxY <= 0 || relMinY >= groupSize.height;
    const frameMode = readGroupFrameMode(node2);
    if (disjoint && frameMode !== "manual") {
      const absChildren = visibleChildren.map((c3) => {
        const p3 = c3.positions?.[mode2];
        return {
          position: p3,
          size: c3.size,
          type: c3.type,
        };
      });
      const { position: newGroupPos2, size: newGroupSize } =
        computeGroupBoundsFromChildren(absChildren);
      const sameGeometry =
        newGroupPos2.x === groupPos.x &&
        newGroupPos2.y === groupPos.y &&
        newGroupSize.width === groupSize.width &&
        newGroupSize.height === groupSize.height;
      if (sameGeometry) continue;
      updatedById.set(node2.id, {
        ...node2,
        positions: {
          ...(node2.positions ?? {}),
          [mode2]: newGroupPos2,
        },
        // Reconcile only fixes the broken mode — write `sizes[mode]` so other
        // modes' bboxes stay intact. Legacy `size` is left alone on purpose;
        // mirroring it here would corrupt the other mode's frame visually.
        sizes: {
          ...(node2.sizes ?? {}),
          [mode2]: newGroupSize,
        },
      });
      for (const c3 of children2) {
        const abs = c3.positions?.[mode2];
        if (!abs) continue;
        const newRel = {
          x: abs.x - newGroupPos2.x,
          y: abs.y - newGroupPos2.y,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
      continue;
    }
    let newLeft;
    let newTop;
    let newRight;
    let newBottom;
    if (frameMode === "manual") {
      newLeft = relMinX < 0 ? relMinX - GROUP_NODE_PADDING.x : 0;
      newTop = relMinY < 0 ? relMinY - GROUP_NODE_PADDING.top : 0;
      newRight = relMaxX > groupSize.width ? relMaxX + GROUP_NODE_PADDING.x : groupSize.width;
      newBottom =
        relMaxY > groupSize.height ? relMaxY + GROUP_NODE_PADDING.bottom : groupSize.height;
    } else {
      newLeft = relMinX - GROUP_NODE_PADDING.x;
      newTop = relMinY - GROUP_NODE_PADDING.top;
      newRight = relMaxX + GROUP_NODE_PADDING.x;
      newBottom = relMaxY + GROUP_NODE_PADDING.bottom;
    }
    const shiftX = newLeft;
    const shiftY = newTop;
    const newSize = {
      width: newRight - newLeft,
      height: newBottom - newTop,
    };
    const sameFrame =
      shiftX === 0 &&
      shiftY === 0 &&
      newSize.width === groupSize.width &&
      newSize.height === groupSize.height;
    if (sameFrame) continue;
    const newGroupPos = {
      x: groupPos.x + shiftX,
      y: groupPos.y + shiftY,
    };
    updatedById.set(node2.id, {
      ...node2,
      positions: {
        ...(node2.positions ?? {}),
        [mode2]: newGroupPos,
      },
      sizes: {
        ...(node2.sizes ?? {}),
        [mode2]: newSize,
      },
    });
    if (shiftX !== 0 || shiftY !== 0) {
      for (const c3 of children2) {
        const rel = c3.positions?.[mode2];
        if (!rel) continue;
        const newRel = {
          x: rel.x - shiftX,
          y: rel.y - shiftY,
        };
        updatedById.set(c3.id, {
          ...c3,
          positions: {
            ...(c3.positions ?? {}),
            [mode2]: newRel,
          },
        });
      }
    }
  }
  if (updatedById.size === 0) {
    return {
      canvas,
      updatedNodes: [],
      changed: false,
    };
  }
  const nextNodes = canvas.nodes.map((n2) => updatedById.get(n2.id) ?? n2);
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
    },
    updatedNodes: Array.from(updatedById.values()),
    changed: true,
  };
}
export const EMPTY_IMAGE_NODE_VIEW = Object.freeze({
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
export function isGroupedNode(node2) {
  return typeof node2.groupId === "string" && node2.groupId.length > 0;
}
export function collectGroupMembers(nodes, groupId2) {
  const members = [];
  for (let i2 = 0; i2 < nodes.length; i2 += 1) {
    if (nodes[i2].groupId === groupId2)
      members.push({
        node: nodes[i2],
        i: i2,
      });
  }
  members.sort((a2, b3) => {
    const ra = Number.isInteger(a2.node.round) ? a2.node.round : Number.MAX_SAFE_INTEGER;
    const rb = Number.isInteger(b3.node.round) ? b3.node.round : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a2.i - b3.i;
  });
  return members.map((x2) => x2.node);
}
function resolveMainNode(members) {
  if (members.length === 0) return void 0;
  return members.find((m3) => m3.meta?.hidden !== true) ?? members[0];
}
export function resolveGroupMainId(nodes, nodeId) {
  const node2 = nodes.find((n2) => n2.id === nodeId);
  if (!node2 || !isGroupedNode(node2)) return nodeId;
  const main2 = resolveMainNode(collectGroupMembers(nodes, node2.groupId));
  return main2?.id ?? nodeId;
}
export function pickSuccessorMain(remaining, removedSortedIndex) {
  if (remaining.length === 0) return void 0;
  const sorted = remaining
    .map((node2, i2) => ({
      node: node2,
      i: i2,
    }))
    .sort((a2, b3) => {
      const ra = Number.isInteger(a2.node.round) ? a2.node.round : Number.MAX_SAFE_INTEGER;
      const rb = Number.isInteger(b3.node.round) ? b3.node.round : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return a2.i - b3.i;
    })
    .map((x2) => x2.node);
  const idx = Math.max(0, removedSortedIndex);
  return (sorted[idx] ?? sorted[sorted.length - 1])?.id;
}
export function promoteToMain(nodes, nodeId) {
  const target = nodes.find((n2) => n2.id === nodeId);
  if (!target || !isGroupedNode(target)) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  const members = collectGroupMembers(nodes, target.groupId);
  const oldMain = resolveMainNode(members);
  if (!oldMain || oldMain.id === nodeId) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  const updatedIds = [];
  const out = nodes.map((n2) => {
    if (n2.id === nodeId) {
      updatedIds.push(n2.id);
      const next2 = {
        ...n2,
        meta: {
          ...(n2.meta ?? {}),
          hidden: false,
        },
        positions: {
          ...oldMain.positions,
        },
      };
      if (oldMain.size)
        next2.size = {
          ...oldMain.size,
        };
      if (oldMain.sizes)
        next2.sizes = {
          ...oldMain.sizes,
        };
      if (oldMain.parentId !== void 0) next2.parentId = oldMain.parentId;
      else delete next2.parentId;
      return mirrorAssetIdIntoData(next2);
    }
    if (n2.id === oldMain.id) {
      updatedIds.push(n2.id);
      const { parentId: _p, ...rest } = n2;
      return {
        ...rest,
        meta: {
          ...(n2.meta ?? {}),
          hidden: true,
        },
        positions: {},
      };
    }
    return n2;
  });
  return {
    nodes: out,
    removedIds: [],
    updatedIds,
    repointFollow: {
      from: oldMain.id,
      to: nodeId,
    },
  };
}
export function removeGroup(nodes, groupId2) {
  const removed = new Set();
  for (const n2 of nodes) if (n2.groupId === groupId2) removed.add(n2.id);
  if (removed.size === 0) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  return {
    nodes: nodes.filter((n2) => !removed.has(n2.id)),
    removedIds: [...removed],
    updatedIds: [],
  };
}
function mirrorAssetIdIntoData(node2) {
  const assetId = imageNodeAssetId(node2);
  if (!assetId || assetId === node2.id) return node2;
  const data2 = node2.data ?? {};
  if (data2.assetId === assetId) return node2;
  return {
    ...node2,
    data: {
      ...data2,
      assetId,
    },
  };
}
const GROUP_GENERATION_DATA_KEYS = [
  "prompt",
  "description",
  "model",
  "params",
  "backend",
  "model_id",
  "source_tool",
  "referenceImageIds",
  "referenceAudioIds",
  "referenceVideoIds",
];
function hasGenerationValue(value) {
  if (value === void 0 || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}
function cloneGenerationValue(value) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object")
    return {
      ...value,
    };
  return value;
}
function resolveGroupGenerationData(members, preferredNode) {
  const main2 = resolveMainNode(members);
  const sameRound = preferredNode
    ? members.filter(
        (member) =>
          member.id !== preferredNode.id &&
          Number.isInteger(member.round) &&
          member.round === preferredNode.round,
      )
    : [];
  const candidates2 = [
    ...sameRound,
    ...(main2 && main2.id !== preferredNode?.id ? [main2] : []),
    ...members.filter(
      (member) =>
        member.id !== preferredNode?.id &&
        member.id !== main2?.id &&
        !sameRound.some((same) => same.id === member.id),
    ),
  ];
  const shared = {};
  for (const key2 of GROUP_GENERATION_DATA_KEYS) {
    for (const member of candidates2) {
      const value = member.data?.[key2];
      if (!hasGenerationValue(value)) continue;
      shared[key2] = cloneGenerationValue(value);
      break;
    }
  }
  return shared;
}
function inheritGroupGenerationData(node2, shared) {
  const current2 = node2.data ?? {};
  const next2 = {
    ...current2,
  };
  let changed = false;
  for (const key2 of GROUP_GENERATION_DATA_KEYS) {
    if (hasGenerationValue(next2[key2]) || !hasGenerationValue(shared[key2])) continue;
    next2[key2] = cloneGenerationValue(shared[key2]);
    changed = true;
  }
  return changed
    ? {
        ...node2,
        data: next2,
      }
    : node2;
}
export function detachFromGroup(nodes, nodeId, absPosition, mode2) {
  const target = nodes.find((n2) => n2.id === nodeId);
  if (!target || !isGroupedNode(target)) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  const groupId2 = target.groupId;
  const orderedBefore = collectGroupMembers(nodes, groupId2);
  const detachedWasMain = resolveMainNode(orderedBefore)?.id === nodeId;
  const removedSortedIndex = orderedBefore.findIndex((n2) => n2.id === nodeId);
  const leftover = nodes.filter((n2) => n2.groupId === groupId2 && n2.id !== nodeId);
  const collapseId = leftover.length === 1 ? leftover[0].id : void 0;
  const successorId =
    detachedWasMain && !collapseId ? pickSuccessorMain(leftover, removedSortedIndex) : void 0;
  const updatedIds = [nodeId];
  if (collapseId) updatedIds.push(collapseId);
  if (successorId) updatedIds.push(successorId);
  const ungroup = (n2, pos, opts) => {
    const { groupId: _g, round: _r, ...withoutGroup } = n2;
    const rest = opts?.dropParent ? (({ parentId: _p, ...r2 }) => r2)(withoutGroup) : withoutGroup;
    const sharedGenerationData = resolveGroupGenerationData(orderedBefore, n2);
    return mirrorAssetIdIntoData(
      inheritGroupGenerationData(
        {
          ...rest,
          meta: {
            ...(rest.meta ?? {}),
            hidden: false,
          },
          ...(pos
            ? {
                positions: {
                  ...(rest.positions ?? {}),
                  [mode2]: pos,
                },
              }
            : {}),
        },
        sharedGenerationData,
      ),
    );
  };
  const out = nodes.map((n2) => {
    if (n2.id === nodeId)
      return ungroup(
        n2,
        {
          x: absPosition.x,
          y: absPosition.y,
        },
        {
          dropParent: true,
        },
      );
    if (collapseId && n2.id === collapseId) {
      const collapsed = ungroup(n2);
      if (!detachedWasMain) return collapsed;
      const next2 = {
        ...collapsed,
        positions: {
          ...target.positions,
        },
      };
      if (target.size)
        next2.size = {
          ...target.size,
        };
      if (target.sizes)
        next2.sizes = {
          ...target.sizes,
        };
      if (target.parentId !== void 0) next2.parentId = target.parentId;
      else delete next2.parentId;
      return next2;
    }
    if (successorId && n2.id === successorId) {
      const next2 = inheritGroupGenerationData(
        {
          ...n2,
          meta: {
            ...(n2.meta ?? {}),
            hidden: false,
          },
          positions: {
            ...target.positions,
          },
        },
        resolveGroupGenerationData(orderedBefore, n2),
      );
      if (target.size)
        next2.size = {
          ...target.size,
        };
      if (target.sizes)
        next2.sizes = {
          ...target.sizes,
        };
      if (target.parentId !== void 0) next2.parentId = target.parentId;
      else delete next2.parentId;
      return mirrorAssetIdIntoData(next2);
    }
    return n2;
  });
  const mut = {
    nodes: out,
    removedIds: [],
    updatedIds,
  };
  if (successorId)
    mut.repointFollow = {
      from: nodeId,
      to: successorId,
    };
  return mut;
}
function imageNodeAssetId(node2) {
  if (typeof node2.assetId === "string" && node2.assetId.length > 0) return node2.assetId;
  const da = node2.data?.assetId;
  if (typeof da === "string" && da.length > 0) return da;
  return node2.id;
}
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
  if (status === "recoverable_error" || status === "status_unknown") return status;
  if (
    status === "error" &&
    typeof data2?.generationAttemptId === "string" &&
    data2.generationAttemptId.length > 0
  ) {
    return status;
  }
  return "ready";
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
        typeof placeholderData.errorMessage === "string" && placeholderData.errorMessage.length > 0
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
    status === "queue_paused" && rawRetryPayload && typeof rawRetryPayload === "object"
      ? rawRetryPayload
      : void 0;
  const refundData = node2.data;
  const refundStatus =
    isGenerationErrorStatus(status) && isGenerationRefundStatus(refundData?.refundStatus)
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
    typeof refundData?.cloudTaskId === "string" && refundData.cloudTaskId.length > 0
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
      (status === "error" || status === "recoverable_error" || status === "status_unknown"
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
function assignRefundDisplayOwners(slots) {
  const ownerByTaskId = new Map();
  for (let index2 = 0; index2 < slots.length; index2 += 1) {
    const slot = slots[index2];
    if (!slot?.refundStatus || !slot.refundTaskId) continue;
    if (!ownerByTaskId.has(slot.refundTaskId)) ownerByTaskId.set(slot.refundTaskId, index2);
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
  return [...byRound.entries()].sort(([a2], [b3]) => a2 - b3).map(([, bucket]) => bucket);
}
export function buildImageGroupView(main2, subs, resolveMeta, opts) {
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
  let activeRoundIndex = rounds.findIndex((bucket) => bucket[0]?.round === mainSlot.round);
  if (activeRoundIndex === -1) {
    const mainRoundKey = mainSlot.round ?? 0;
    activeRoundIndex = rounds.findIndex((bucket) => (bucket[0]?.round ?? 0) === mainRoundKey);
  }
  if (activeRoundIndex === -1) activeRoundIndex = Math.max(0, rounds.length - 1);
  const activeSlots = rounds[activeRoundIndex] ?? allSlots;
  const activePrimary = activeSlots[0] ?? mainSlot;
  const hasLoading = activeSlots.some(
    (slot) =>
      slot.status === "pending" || slot.status === "generating" || slot.status === "loading",
  );
  const hasError = activeSlots.some(
    (slot) =>
      slot.status === "error" ||
      slot.status === "recoverable_error" ||
      slot.status === "status_unknown",
  );
  const status =
    activePrimary.status !== "ready" || activePrimary.url || activePrimary.pendingMeta
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
export const DEFAULT_WORKFLOW_NODE_SPACING = 100;
export const DEFAULT_PLACEMENT_GAP = DEFAULT_WORKFLOW_NODE_SPACING;
export const DEFAULT_WORKFLOW_LAYER_SPACING = 100;
export const LEGACY_WORKFLOW_NODE_SPACING = 100;
export const DEFAULTS$3 = {
  gap: DEFAULT_PLACEMENT_GAP,
  rowTolerance: 10,
  collisionMargin: 5,
  maxCols: 8,
  maxShiftAttempts: 50,
};
export function rectsOverlap$1(a2, b3, margin = 0) {
  return (
    a2.x < b3.x + b3.w + margin &&
    a2.x + a2.w + margin > b3.x &&
    a2.y < b3.y + b3.h + margin &&
    a2.y + a2.h + margin > b3.y
  );
}
export function verticalClearanceViolation(rect, above, gap, margin) {
  const horizontalOverlap =
    rect.x < above.x + above.w + margin && rect.x + rect.w + margin > above.x;
  if (!horizontalOverlap) return false;
  const aboveBottom = above.y + above.h;
  if (aboveBottom > rect.y) return false;
  return rect.y - aboveBottom < gap;
}
function groupRectsByRows(rects, tolerance) {
  if (rects.length === 0) return [];
  const sorted = [...rects].sort((a2, b3) => a2.y - b3.y);
  const rows = [];
  for (const rect of sorted) {
    const match2 = rows.find((row) => Math.abs(row.y - rect.y) <= tolerance);
    if (match2) {
      match2.rects.push(rect);
      match2.maxHeight = Math.max(match2.maxHeight, rect.h);
    } else {
      rows.push({
        y: rect.y,
        rects: [rect],
        maxHeight: rect.h,
      });
    }
  }
  for (const row of rows) row.rects.sort((a2, b3) => a2.x - b3.x);
  return rows;
}
export function rowFirstCandidate(occupied, newSize, gap, maxCols, rowTolerance) {
  const referenceWidth = newSize.width;
  const maxRowWidth = referenceWidth * maxCols + gap * (maxCols - 1);
  if (occupied.length === 0) {
    return {
      position: {
        x: 0,
        y: 0,
      },
      rowStartX: 0,
      maxRowWidth,
    };
  }
  const rows = groupRectsByRows(occupied, rowTolerance);
  const lastRow = rows[rows.length - 1];
  const firstRow = rows[0];
  const rowStartX = firstRow.rects[0].x;
  const lastRect = lastRow.rects[lastRow.rects.length - 1];
  const appendX = lastRect.x + lastRect.w + gap;
  const appendRightEdgeFromStart = appendX + newSize.width - rowStartX;
  if (lastRow.rects.length < maxCols && appendRightEdgeFromStart <= maxRowWidth) {
    return {
      position: {
        x: appendX,
        y: lastRow.y,
      },
      rowStartX,
      maxRowWidth,
    };
  }
  return {
    position: {
      x: rowStartX,
      y: lastRow.y + lastRow.maxHeight + gap,
    },
    rowStartX,
    maxRowWidth,
  };
}
