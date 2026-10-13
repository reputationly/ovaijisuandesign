// detach-from-group.js
import {
  collectGroupMembers,
  isGroupedNode,
  mirrorAssetIdIntoData,
  pickSuccessorMain,
  resolveMainNode,
} from "./ungroup-in-canvas.js";

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
    if (hasGenerationValue(next2[key2]) || !hasGenerationValue(shared[key2]))
      continue;
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
  const target = nodes.find((node) => node.id === nodeId);
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
  const removedSortedIndex = orderedBefore.findIndex((node) => node.id === nodeId);
  const leftover = nodes.filter(
    (node) => node.groupId === groupId2 && node.id !== nodeId,
  );
  const collapseId = leftover.length === 1 ? leftover[0].id : void 0;
  const successorId =
    detachedWasMain && !collapseId
      ? pickSuccessorMain(leftover, removedSortedIndex)
      : void 0;
  const updatedIds = [nodeId];
  if (collapseId) updatedIds.push(collapseId);
  if (successorId) updatedIds.push(successorId);
  const ungroup = (node, pos, opts) => {
    const { groupId: _g, round: _r, ...withoutGroup } = node;
    const rest = opts?.dropParent
      ? (({ parentId: _p, ...nodeWithoutParent }) => nodeWithoutParent)(withoutGroup)
      : withoutGroup;
    const sharedGenerationData = resolveGroupGenerationData(orderedBefore, node);
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
  const out = nodes.map((node) => {
    if (node.id === nodeId)
      return ungroup(
        node,
        {
          x: absPosition.x,
          y: absPosition.y,
        },
        {
          dropParent: true,
        },
      );
    if (collapseId && node.id === collapseId) {
      const collapsed = ungroup(node);
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
    if (successorId && node.id === successorId) {
      const next2 = inheritGroupGenerationData(
        {
          ...node,
          meta: {
            ...(node.meta ?? {}),
            hidden: false,
          },
          positions: {
            ...target.positions,
          },
        },
        resolveGroupGenerationData(orderedBefore, node),
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
    return node;
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
