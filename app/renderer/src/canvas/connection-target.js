// 拖线落点、落点标记、小地图矩形。
import reactExports from "react";
import { flowPointToMiniMap, findHitTarget, CanvasNodeType } from "./canvas-geometry.js";
import { useStoreApi } from "../vendor-fork/xyflow/react/index.js";

export function nodeToMiniMapRect(node2, layout, minSize = 0) {
  const topLeft = flowPointToMiniMap({
    x: node2.x,
    y: node2.y
  }, layout);
  const width = node2.width * layout.scale;
  const height = node2.height * layout.scale;
  const paddedWidth = Math.max(width, minSize);
  const paddedHeight = Math.max(height, minSize);
  return {
    x: topLeft.x - (paddedWidth - width) / 2,
    y: topLeft.y - (paddedHeight - height) / 2,
    width: paddedWidth,
    height: paddedHeight
  };
}
const ENTRY_OFFSET = 14;
const ENTRY_DROP_RADIUS = 24;
export function findConnectionTarget(nodeLookup, dropFlow, sourceId, zoom2, excludedTargets) {
  if (findHitTarget(nodeLookup, dropFlow, sourceId) !== null) {
    return findHitTarget(nodeLookup, dropFlow, sourceId, excludedTargets);
  }
  const source = nodeLookup.get(sourceId);
  if (source && findHitTarget(/* @__PURE__ */new Map([[sourceId, source]]), dropFlow, "") !== null) return null;
  if (!Number.isFinite(zoom2) || zoom2 <= 0) return null;
  let bestId = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestZ = Number.NEGATIVE_INFINITY;
  for (const [id2, node2] of nodeLookup) {
    if (id2 === sourceId || node2.hidden || node2.type === CanvasNodeType.Group) continue;
    if (excludedTargets?.has(id2)) continue;
    if ((node2.measured?.width ?? node2.width ?? 0) <= 0) continue;
    if ((node2.measured?.height ?? node2.height ?? 0) <= 0) continue;
    const bounds = node2.internals.handleBounds;
    const {
      x: x2,
      y: y4
    } = node2.internals.positionAbsolute;
    for (const handle2 of [...(bounds?.target ?? []), ...(bounds?.source ?? [])]) {
      if (handle2.position !== "left" && handle2.position !== "right") continue;
      const offset2 = handle2.position === "left" ? -ENTRY_OFFSET : ENTRY_OFFSET;
      const dx = (dropFlow.x - x2 - handle2.x - handle2.width / 2) * zoom2 - offset2;
      const dy = (dropFlow.y - y4 - handle2.y - handle2.height / 2) * zoom2;
      const distance2 = Math.hypot(dx, dy);
      if (distance2 > ENTRY_DROP_RADIUS || distance2 > bestDistance) continue;
      const z3 = node2.internals.z ?? 0;
      if (distance2 === bestDistance && z3 < bestZ) continue;
      bestId = id2;
      bestDistance = distance2;
      bestZ = z3;
    }
  }
  return bestId;
}
export function ConnectionTargetMarker({
  edges
}) {
  const store = useStoreApi();
  reactExports.useEffect(() => {
    let markedNode = null;
    let markedEntry = null;
    let previousSourceId = null;
    let excluded = /* @__PURE__ */new Set();
    const clear = () => {
      markedNode?.classList.remove("node-connection-target");
      markedEntry?.removeAttribute("data-connection-target");
      markedNode = null;
      markedEntry = null;
    };
    const update2 = () => {
      const {
        connection,
        transform: transform2,
        nodeLookup,
        domNode
      } = store.getState();
      if (!connection.inProgress || !connection.fromNode || !domNode) {
        clear();
        return;
      }
      const sourceId = connection.fromNode.id;
      if (sourceId !== previousSourceId) {
        previousSourceId = sourceId;
        excluded = new Set(edges.filter(edge => edge.source === sourceId).map(edge => edge.target));
      }
      const point2 = {
        x: (connection.pointer.x - transform2[0]) / transform2[2],
        y: (connection.pointer.y - transform2[1]) / transform2[2]
      };
      const id2 = connection.isValid ? connection.toNode?.id : findConnectionTarget(nodeLookup, point2, sourceId, transform2[2], excluded);
      const node2 = id2 ? domNode.querySelector(`.react-flow__node[data-id="${CSS.escape(id2)}"]`) : null;
      let entry = null;
      let distance2 = Number.POSITIVE_INFINITY;
      if (node2) {
        const rootBounds = domNode.getBoundingClientRect();
        const x2 = rootBounds.left + connection.pointer.x;
        const y4 = rootBounds.top + connection.pointer.y;
        for (const candidate of node2.querySelectorAll(".node-handle-plus:not([data-hidden])")) {
          const rect = candidate.getBoundingClientRect();
          const d2 = Math.hypot(x2 - rect.left - rect.width / 2, y4 - rect.top - rect.height / 2);
          if (d2 < distance2) {
            distance2 = d2;
            entry = candidate;
          }
        }
      }
      if (node2 === markedNode && entry === markedEntry) return;
      clear();
      markedNode = node2;
      markedEntry = entry;
      markedNode?.classList.add("node-connection-target");
      markedEntry?.setAttribute("data-connection-target", "true");
    };
    const unsubscribe = store.subscribe((state2, previous2) => {
      if (state2.connection !== previous2.connection || state2.transform !== previous2.transform) update2();
    });
    update2();
    return () => {
      unsubscribe();
      clear();
    };
  }, [store, edges]);
  return null;
}
