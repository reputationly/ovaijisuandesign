// group-nodes-in-canvas.js
import {
  CanvasNodeType,
  normalizeLabel$1 as normalizeLabel,
} from "../vendor.js";
import {
  computeGroupBoundsFromChildren,
  defaultNodeSizeForType,
  readGroupSize,
  withParentId,
} from "./compute-group-bounds-from-children.js";
const GROUP_NODE_PREFIX = "group-";
function createGroupNodeId() {
  return `${GROUP_NODE_PREFIX}${crypto.randomUUID()}`;
}
const GROUP_Z_INDEX = -100;
export function groupNodesInCanvas(canvas, nodeIds, options) {
  const mode = canvas.mode;
  const nodeById = new Map(canvas.nodes.map((node) => [node.id, node]));
  const selectedGroups = [];
  const outsiders = [];
  const skippedNodes = [];
  const seen = new Set();
  for (const id of nodeIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodeById.get(id);
    if (!node) {
      skippedNodes.push({
        nodeId: id,
        reason: "unknown",
      });
      continue;
    }
    if (node.type === CanvasNodeType.Group) {
      selectedGroups.push(node);
      continue;
    }
    if (node.parentId) {
      skippedNodes.push({
        nodeId: id,
        reason: "already-grouped",
        parentId: node.parentId,
      });
      continue;
    }
    outsiders.push(node);
  }
  const skipFields =
    skippedNodes.length > 0
      ? {
          skippedNodes,
        }
      : {};
  if (selectedGroups.length === 0) {
    if (outsiders.length < 2) {
      return {
        canvas,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        groupId: null,
        ...skipFields,
      };
    }
    const allModes = new Set();
    allModes.add(mode);
    for (const outsider of outsiders) {
      for (const mode of Object.keys(outsider.positions ?? {})) {
        allModes.add(mode);
      }
    }
    const boundsByMode = new Map();
    for (const mode of allModes) {
      const allHavePos = outsiders.every((outsider) => outsider.positions?.[mode] !== void 0);
      if (!allHavePos) continue;
      const childrenAbs = outsiders.map((outsider) => ({
        position: outsider.positions?.[mode],
        size: outsider.size,
        type: outsider.type,
      }));
      boundsByMode.set(mode, computeGroupBoundsFromChildren(childrenAbs));
    }
    const activeBounds = boundsByMode.get(mode);
    if (!activeBounds) {
      const missingNodeIds = outsiders
        .filter((outsider) => !outsider.positions?.[mode])
        .map((outsider) => outsider.id);
      return {
        canvas,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        groupId: null,
        error: {
          code: "incomplete-positions",
          mode,
          missingNodeIds,
        },
        ...skipFields,
      };
    }
    const { size } = activeBounds;
    const groupId = createGroupNodeId();
    const childIdSet = new Set(outsiders.map((outsider) => outsider.id));
    const positionsRecord = {};
    const sizesRecord = {};
    for (const [mode, bounds] of boundsByMode) {
      positionsRecord[mode] = bounds.position;
      sizesRecord[mode] = bounds.size;
    }
    const normalizedLabel = normalizeLabel(options?.label);
    const groupData = normalizedLabel
      ? {
          label: normalizedLabel,
        }
      : {};
    const groupNode = {
      id: groupId,
      type: CanvasNodeType.Group,
      positions: positionsRecord,
      // Legacy `size` mirrors the active mode's bbox; `sizes` carries the
      // full per-mode map so future mode switches read the right frame
      // without falling back to the active mode's value.
      size,
      sizes: sizesRecord,
      // GroupNodeData is a concrete interface; cast to the wider data shape
      // accepted by the persistence schema (Record<string, unknown>).
      data: groupData,
      meta: {
        zIndex: GROUP_Z_INDEX,
        addedAt: Date.now(),
      },
    };
    const updatedChildren = [];
    const nextNodes = new Array(canvas.nodes.length + 1);
    let index = 0;
    for (const node of canvas.nodes) {
      if (childIdSet.has(node.id)) {
        const newPositions = {
          ...(node.positions ?? {}),
        };
        for (const [mode, bounds] of boundsByMode) {
          const abs = node.positions?.[mode];
          if (!abs) continue;
          newPositions[mode] = {
            x: abs.x - bounds.position.x,
            y: abs.y - bounds.position.y,
          };
        }
        const child = withParentId(
          {
            ...node,
            positions: newPositions,
          },
          groupId,
        );
        nextNodes[index++] = child;
        updatedChildren.push(child);
      } else {
        nextNodes[index++] = node;
      }
    }
    nextNodes[index] = groupNode;
    return {
      canvas: {
        ...canvas,
        nodes: nextNodes,
      },
      addedNodes: [groupNode],
      removedNodeIds: [],
      updatedNodes: updatedChildren,
      groupId,
      ...skipFields,
    };
  }
  const mergeTarget = selectedGroups[0];
  const dissolvingGroups = selectedGroups.slice(1);
  const dissolvingGroupById = new Map(
    dissolvingGroups.map((group) => [group.id, group]),
  );
  const crossGroupChildren = [];
  if (dissolvingGroupById.size > 0) {
    for (const node of canvas.nodes) {
      if (!node.parentId) continue;
      const parent = dissolvingGroupById.get(node.parentId);
      if (parent)
        crossGroupChildren.push({
          node,
          parentGroup: parent,
        });
    }
  }
  if (outsiders.length === 0 && dissolvingGroups.length === 0) {
    return {
      canvas,
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      groupId: null,
      ...skipFields,
    };
  }
  const existingMtChildren = [];
  for (const node of canvas.nodes) {
    if (node.parentId === mergeTarget.id) existingMtChildren.push(node);
  }
  const allModes = new Set();
  allModes.add(mode);
  for (const mode of Object.keys(mergeTarget.positions ?? {})) allModes.add(mode);
  for (const outsider of outsiders) {
    for (const mode of Object.keys(outsider.positions ?? {})) allModes.add(mode);
  }
  for (const child of existingMtChildren) {
    for (const mode of Object.keys(child.positions ?? {})) allModes.add(mode);
  }
  for (const { node, parentGroup } of crossGroupChildren) {
    for (const mode of Object.keys(node.positions ?? {})) allModes.add(mode);
    for (const mode of Object.keys(parentGroup.positions ?? {})) allModes.add(mode);
  }
  const dataByMode = new Map();
  for (const mode of allModes) {
    const oldMtPos = mergeTarget.positions?.[mode];
    if (!oldMtPos) continue;
    let allPresent = true;
    for (const child of existingMtChildren) {
      if (!child.positions?.[mode]) {
        allPresent = false;
        break;
      }
    }
    if (allPresent) {
      for (const outsider of outsiders) {
        if (!outsider.positions?.[mode]) {
          allPresent = false;
          break;
        }
      }
    }
    if (allPresent) {
      for (const { node, parentGroup } of crossGroupChildren) {
        if (!node.positions?.[mode] || !parentGroup.positions?.[mode]) {
          allPresent = false;
          break;
        }
      }
    }
    if (!allPresent) continue;
    const survivors = [];
    const adoptionMap = new Map();
    for (const child of existingMtChildren) {
      const rel = child.positions?.[mode];
      survivors.push({
        position: {
          x: oldMtPos.x + rel.x,
          y: oldMtPos.y + rel.y,
        },
        size: child.size,
        type: child.type,
      });
    }
    for (const outsider of outsiders) {
      const abs = outsider.positions?.[mode];
      survivors.push({
        position: {
          ...abs,
        },
        size: outsider.size,
        type: outsider.type,
      });
      adoptionMap.set(outsider.id, {
        ...abs,
      });
    }
    for (const { node, parentGroup } of crossGroupChildren) {
      const parentAbs = parentGroup.positions?.[mode];
      const rel = node.positions?.[mode];
      const absPos = {
        x: parentAbs.x + rel.x,
        y: parentAbs.y + rel.y,
      };
      survivors.push({
        position: absPos,
        size: node.size,
        type: node.type,
      });
      adoptionMap.set(node.id, absPos);
    }
    const mtSize =
      readGroupSize(mergeTarget, mode) ??
      mergeTarget.size ??
      defaultNodeSizeForType(mergeTarget.type);
    const newBounds =
      survivors.length > 0
        ? computeGroupBoundsFromChildren(survivors)
        : {
            position: oldMtPos,
            size: mtSize,
          };
    dataByMode.set(mode, {
      oldMtPos,
      newPos: newBounds.position,
      newSize: newBounds.size,
      dx: oldMtPos.x - newBounds.position.x,
      dy: oldMtPos.y - newBounds.position.y,
      adoptionMap,
    });
  }
  const activeData = dataByMode.get(mode);
  if (!activeData) {
    const candidates = [
      mergeTarget,
      ...existingMtChildren,
      ...outsiders,
      ...crossGroupChildren.map((crossGroupChild) => crossGroupChild.node),
      ...crossGroupChildren.map((crossGroupChild) => crossGroupChild.parentGroup),
    ];
    const seenIds = new Set();
    const missingNodeIds = [];
    for (const candidateNode of candidates) {
      if (seenIds.has(candidateNode.id)) continue;
      seenIds.add(candidateNode.id);
      if (!candidateNode.positions?.[mode]) missingNodeIds.push(candidateNode.id);
    }
    return {
      canvas,
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      groupId: null,
      error: {
        code: "incomplete-positions",
        mode,
        missingNodeIds,
      },
      ...skipFields,
    };
  }
  const activeNewSize = activeData.newSize;
  const adoptionIds = new Set();
  for (const outsider of outsiders) adoptionIds.add(outsider.id);
  for (const { node } of crossGroupChildren) adoptionIds.add(node.id);
  const updatedNodes = [];
  const nextNodes = [];
  for (const node of canvas.nodes) {
    if (dissolvingGroupById.has(node.id)) continue;
    if (node.id === mergeTarget.id) {
      const newPositions = {
        ...(node.positions ?? {}),
      };
      const newSizes = {
        ...(node.sizes ?? {}),
      };
      for (const [mode, modeData] of dataByMode) {
        newPositions[mode] = modeData.newPos;
        newSizes[mode] = modeData.newSize;
      }
      const existingData = node.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      const next = {
        ...node,
        positions: newPositions,
        // Legacy `size` mirrors the active mode's bbox so older clients render
        // the right frame; per-mode entries live in `sizes`.
        size: activeNewSize,
        sizes: newSizes,
        data: nextData,
      };
      nextNodes.push(next);
      updatedNodes.push(next);
      continue;
    }
    if (node.parentId === mergeTarget.id) {
      const newPositions = {
        ...(node.positions ?? {}),
      };
      let modified = false;
      for (const [mode, modeData] of dataByMode) {
        if (modeData.dx === 0 && modeData.dy === 0) continue;
        const rel = node.positions?.[mode];
        if (!rel) continue;
        newPositions[mode] = {
          x: rel.x + modeData.dx,
          y: rel.y + modeData.dy,
        };
        modified = true;
      }
      if (modified) {
        const next = {
          ...node,
          positions: newPositions,
        };
        nextNodes.push(next);
        updatedNodes.push(next);
      } else {
        nextNodes.push(node);
      }
      continue;
    }
    if (adoptionIds.has(node.id)) {
      const newPositions = {
        ...(node.positions ?? {}),
      };
      for (const [mode, modeData] of dataByMode) {
        const abs = modeData.adoptionMap.get(node.id);
        if (!abs) continue;
        newPositions[mode] = {
          x: abs.x - modeData.newPos.x,
          y: abs.y - modeData.newPos.y,
        };
      }
      const next = withParentId(
        {
          ...node,
          positions: newPositions,
        },
        mergeTarget.id,
      );
      nextNodes.push(next);
      updatedNodes.push(next);
      continue;
    }
    nextNodes.push(node);
  }
  const removedNodeIds = dissolvingGroups.map((group) => group.id);
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
    },
    addedNodes: [],
    removedNodeIds,
    updatedNodes,
    groupId: mergeTarget.id,
    ...skipFields,
  };
}
