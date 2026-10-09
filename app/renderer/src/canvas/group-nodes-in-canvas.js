// group-nodes-in-canvas.js
import { CanvasNodeType, normalizeLabel$1 } from "../vendor.js";
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
  const mode2 = canvas.mode;
  const nodeById = new Map(canvas.nodes.map((n2) => [n2.id, n2]));
  const selectedGroups = [];
  const outsiders = [];
  const skippedNodes = [];
  const seen2 = new Set();
  for (const id2 of nodeIds) {
    if (seen2.has(id2)) continue;
    seen2.add(id2);
    const node2 = nodeById.get(id2);
    if (!node2) {
      skippedNodes.push({
        nodeId: id2,
        reason: "unknown",
      });
      continue;
    }
    if (node2.type === CanvasNodeType.Group) {
      selectedGroups.push(node2);
      continue;
    }
    if (node2.parentId) {
      skippedNodes.push({
        nodeId: id2,
        reason: "already-grouped",
        parentId: node2.parentId,
      });
      continue;
    }
    outsiders.push(node2);
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
    const allModes2 = new Set();
    allModes2.add(mode2);
    for (const o2 of outsiders) {
      for (const m3 of Object.keys(o2.positions ?? {})) {
        allModes2.add(m3);
      }
    }
    const boundsByMode = new Map();
    for (const m3 of allModes2) {
      const allHavePos = outsiders.every((o2) => o2.positions?.[m3] !== void 0);
      if (!allHavePos) continue;
      const childrenAbs = outsiders.map((n2) => ({
        position: n2.positions?.[m3],
        size: n2.size,
        type: n2.type,
      }));
      boundsByMode.set(m3, computeGroupBoundsFromChildren(childrenAbs));
    }
    const activeBounds = boundsByMode.get(mode2);
    if (!activeBounds) {
      const missingNodeIds = outsiders
        .filter((o2) => !o2.positions?.[mode2])
        .map((o2) => o2.id);
      return {
        canvas,
        addedNodes: [],
        removedNodeIds: [],
        updatedNodes: [],
        groupId: null,
        error: {
          code: "incomplete-positions",
          mode: mode2,
          missingNodeIds,
        },
        ...skipFields,
      };
    }
    const { size: size2 } = activeBounds;
    const groupId2 = createGroupNodeId();
    const childIdSet = new Set(outsiders.map((n2) => n2.id));
    const positionsRecord = {};
    const sizesRecord = {};
    for (const [m3, b3] of boundsByMode) {
      positionsRecord[m3] = b3.position;
      sizesRecord[m3] = b3.size;
    }
    const normalizedLabel = normalizeLabel$1(options?.label);
    const groupData = normalizedLabel
      ? {
          label: normalizedLabel,
        }
      : {};
    const groupNode = {
      id: groupId2,
      type: CanvasNodeType.Group,
      positions: positionsRecord,
      // Legacy `size` mirrors the active mode's bbox; `sizes` carries the
      // full per-mode map so future mode switches read the right frame
      // without falling back to the active mode's value.
      size: size2,
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
    const nextNodes2 = new Array(canvas.nodes.length + 1);
    let i2 = 0;
    for (const node2 of canvas.nodes) {
      if (childIdSet.has(node2.id)) {
        const newPositions = {
          ...(node2.positions ?? {}),
        };
        for (const [m3, b3] of boundsByMode) {
          const abs = node2.positions?.[m3];
          if (!abs) continue;
          newPositions[m3] = {
            x: abs.x - b3.position.x,
            y: abs.y - b3.position.y,
          };
        }
        const child = withParentId(
          {
            ...node2,
            positions: newPositions,
          },
          groupId2,
        );
        nextNodes2[i2++] = child;
        updatedChildren.push(child);
      } else {
        nextNodes2[i2++] = node2;
      }
    }
    nextNodes2[i2] = groupNode;
    return {
      canvas: {
        ...canvas,
        nodes: nextNodes2,
      },
      addedNodes: [groupNode],
      removedNodeIds: [],
      updatedNodes: updatedChildren,
      groupId: groupId2,
      ...skipFields,
    };
  }
  const mergeTarget = selectedGroups[0];
  const dissolvingGroups = selectedGroups.slice(1);
  const dissolvingGroupById = new Map(
    dissolvingGroups.map((g2) => [g2.id, g2]),
  );
  const crossGroupChildren = [];
  if (dissolvingGroupById.size > 0) {
    for (const node2 of canvas.nodes) {
      if (!node2.parentId) continue;
      const parent = dissolvingGroupById.get(node2.parentId);
      if (parent)
        crossGroupChildren.push({
          node: node2,
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
  for (const node2 of canvas.nodes) {
    if (node2.parentId === mergeTarget.id) existingMtChildren.push(node2);
  }
  const allModes = new Set();
  allModes.add(mode2);
  for (const m3 of Object.keys(mergeTarget.positions ?? {})) allModes.add(m3);
  for (const o2 of outsiders) {
    for (const m3 of Object.keys(o2.positions ?? {})) allModes.add(m3);
  }
  for (const c3 of existingMtChildren) {
    for (const m3 of Object.keys(c3.positions ?? {})) allModes.add(m3);
  }
  for (const { node: node2, parentGroup } of crossGroupChildren) {
    for (const m3 of Object.keys(node2.positions ?? {})) allModes.add(m3);
    for (const m3 of Object.keys(parentGroup.positions ?? {})) allModes.add(m3);
  }
  const dataByMode = new Map();
  for (const m3 of allModes) {
    const oldMtPos = mergeTarget.positions?.[m3];
    if (!oldMtPos) continue;
    let allPresent = true;
    for (const c3 of existingMtChildren) {
      if (!c3.positions?.[m3]) {
        allPresent = false;
        break;
      }
    }
    if (allPresent) {
      for (const o2 of outsiders) {
        if (!o2.positions?.[m3]) {
          allPresent = false;
          break;
        }
      }
    }
    if (allPresent) {
      for (const { node: node2, parentGroup } of crossGroupChildren) {
        if (!node2.positions?.[m3] || !parentGroup.positions?.[m3]) {
          allPresent = false;
          break;
        }
      }
    }
    if (!allPresent) continue;
    const survivors = [];
    const adoptionMap = new Map();
    for (const c3 of existingMtChildren) {
      const rel = c3.positions?.[m3];
      survivors.push({
        position: {
          x: oldMtPos.x + rel.x,
          y: oldMtPos.y + rel.y,
        },
        size: c3.size,
        type: c3.type,
      });
    }
    for (const o2 of outsiders) {
      const abs = o2.positions?.[m3];
      survivors.push({
        position: {
          ...abs,
        },
        size: o2.size,
        type: o2.type,
      });
      adoptionMap.set(o2.id, {
        ...abs,
      });
    }
    for (const { node: node2, parentGroup } of crossGroupChildren) {
      const parentAbs = parentGroup.positions?.[m3];
      const rel = node2.positions?.[m3];
      const absPos = {
        x: parentAbs.x + rel.x,
        y: parentAbs.y + rel.y,
      };
      survivors.push({
        position: absPos,
        size: node2.size,
        type: node2.type,
      });
      adoptionMap.set(node2.id, absPos);
    }
    const mtSize =
      readGroupSize(mergeTarget, m3) ??
      mergeTarget.size ??
      defaultNodeSizeForType(mergeTarget.type);
    const newBounds =
      survivors.length > 0
        ? computeGroupBoundsFromChildren(survivors)
        : {
            position: oldMtPos,
            size: mtSize,
          };
    dataByMode.set(m3, {
      oldMtPos,
      newPos: newBounds.position,
      newSize: newBounds.size,
      dx: oldMtPos.x - newBounds.position.x,
      dy: oldMtPos.y - newBounds.position.y,
      adoptionMap,
    });
  }
  const activeData = dataByMode.get(mode2);
  if (!activeData) {
    const candidates2 = [
      mergeTarget,
      ...existingMtChildren,
      ...outsiders,
      ...crossGroupChildren.map((c3) => c3.node),
      ...crossGroupChildren.map((c3) => c3.parentGroup),
    ];
    const seenIds = new Set();
    const missingNodeIds = [];
    for (const n2 of candidates2) {
      if (seenIds.has(n2.id)) continue;
      seenIds.add(n2.id);
      if (!n2.positions?.[mode2]) missingNodeIds.push(n2.id);
    }
    return {
      canvas,
      addedNodes: [],
      removedNodeIds: [],
      updatedNodes: [],
      groupId: null,
      error: {
        code: "incomplete-positions",
        mode: mode2,
        missingNodeIds,
      },
      ...skipFields,
    };
  }
  const activeNewSize = activeData.newSize;
  const adoptionIds = new Set();
  for (const o2 of outsiders) adoptionIds.add(o2.id);
  for (const { node: node2 } of crossGroupChildren) adoptionIds.add(node2.id);
  const updatedNodes = [];
  const nextNodes = [];
  for (const node2 of canvas.nodes) {
    if (dissolvingGroupById.has(node2.id)) continue;
    if (node2.id === mergeTarget.id) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      const newSizes = {
        ...(node2.sizes ?? {}),
      };
      for (const [m3, d2] of dataByMode) {
        newPositions[m3] = d2.newPos;
        newSizes[m3] = d2.newSize;
      }
      const existingData = node2.data ?? {};
      const nextData = {
        ...existingData,
        frameMode: "auto",
      };
      const next2 = {
        ...node2,
        positions: newPositions,
        // Legacy `size` mirrors the active mode's bbox so older clients render
        // the right frame; per-mode entries live in `sizes`.
        size: activeNewSize,
        sizes: newSizes,
        data: nextData,
      };
      nextNodes.push(next2);
      updatedNodes.push(next2);
      continue;
    }
    if (node2.parentId === mergeTarget.id) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      let modified = false;
      for (const [m3, d2] of dataByMode) {
        if (d2.dx === 0 && d2.dy === 0) continue;
        const rel = node2.positions?.[m3];
        if (!rel) continue;
        newPositions[m3] = {
          x: rel.x + d2.dx,
          y: rel.y + d2.dy,
        };
        modified = true;
      }
      if (modified) {
        const next2 = {
          ...node2,
          positions: newPositions,
        };
        nextNodes.push(next2);
        updatedNodes.push(next2);
      } else {
        nextNodes.push(node2);
      }
      continue;
    }
    if (adoptionIds.has(node2.id)) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      for (const [m3, d2] of dataByMode) {
        const abs = d2.adoptionMap.get(node2.id);
        if (!abs) continue;
        newPositions[m3] = {
          x: abs.x - d2.newPos.x,
          y: abs.y - d2.newPos.y,
        };
      }
      const next2 = withParentId(
        {
          ...node2,
          positions: newPositions,
        },
        mergeTarget.id,
      );
      nextNodes.push(next2);
      updatedNodes.push(next2);
      continue;
    }
    nextNodes.push(node2);
  }
  const removedNodeIds = dissolvingGroups.map((g2) => g2.id);
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
