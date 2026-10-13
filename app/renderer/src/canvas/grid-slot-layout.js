// grid-slot-layout.js
import { sizeOf } from "./use-active-mode.js";
import {
  _,
  j,
  k,
  N,
  nodeToRect,
  O,
  S,
  V,
  w$3,
} from "./layout-category-lanes.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { DEFAULT_PLACEMENT_GAP } from "./ungroup-in-canvas.js";
import { findFreePositionForRects } from "./find-free-position-for-rects.js";
import { dn, L } from "./ot.js";
import { p$4 as Graph } from "../vendor.js";
export function st(graph) {
  (S(graph), V(graph));
}
export function lt2(graph) {
  let lowLimByNode = {},
    nextLim = 0;
  function assignLowLim(nodeId) {
    let low = nextLim;
    (graph.children(nodeId).forEach(assignLowLim),
      (lowLimByNode[nodeId] = {
        low,
        lim: nextLim++,
      }));
  }
  return (graph.children(_).forEach(assignLowLim), lowLimByNode);
}
export function Qe(graph, borderType, idPrefix, parentId, borderNodesByType, rank) {
  let borderNodeLabel = {
      width: 0,
      height: 0,
      rank,
      borderType,
    },
    previousBorderNode = borderNodesByType[borderType][rank - 1],
    borderNode = w$3(graph, "border", borderNodeLabel, idPrefix);
  ((borderNodesByType[borderType][rank] = borderNode),
    graph.setParent(borderNode, parentId),
    previousBorderNode &&
      graph.setEdge(previousBorderNode, borderNode, {
        weight: 1,
      }));
}
function createRootNode(graph) {
  let rootId;
  for (; graph.hasNode((rootId = j("_root"))););
  return rootId;
}
export function de(graph, rank, relationship, nodeIds) {
  nodeIds || (nodeIds = graph.nodes());
  let rootId = createRootNode(graph),
    layerGraph = new Graph({
      compound: true,
    })
      .setGraph({
        root: rootId,
      })
      .setDefaultNodeLabel((nodeId) => graph.node(nodeId));
  return (
    nodeIds.forEach((nodeId) => {
      let nodeLabel = graph.node(nodeId),
        parentId = graph.parent(nodeId);
      if (nodeLabel.rank === rank || (nodeLabel.minRank <= rank && rank <= nodeLabel.maxRank)) {
        (layerGraph.setNode(nodeId), layerGraph.setParent(nodeId, parentId || rootId));
        let incidentEdges = graph[relationship](nodeId);
        (incidentEdges &&
          incidentEdges.forEach((edge) => {
            let neighborId = edge.v === nodeId ? edge.w : edge.v,
              existingEdgeLabel = layerGraph.edge(neighborId, nodeId),
              existingWeight = existingEdgeLabel !== void 0 ? existingEdgeLabel.weight : 0;
            layerGraph.setEdge(neighborId, nodeId, {
              weight: graph.edge(edge).weight + existingWeight,
            });
          }),
          Object.hasOwn(nodeLabel, "minRank") &&
            layerGraph.setNode(nodeId, {
              borderLeft: nodeLabel.borderLeft[rank],
              borderRight: nodeLabel.borderRight[rank],
            }));
      }
    }),
    layerGraph
  );
}
export function _t(graph, layering) {
  let conflicts = {};
  function findConflictsInRange(nodeIdsByOrder, startIndex, endIndex, minOrder, maxOrder) {
    k(startIndex, endIndex).forEach((order) => {
      let nodeId = nodeIdsByOrder[order];
      if (nodeId !== void 0 && graph.node(nodeId).dummy) {
        let predecessors = graph.predecessors(nodeId);
        predecessors &&
          predecessors.forEach((predecessorId) => {
            if (predecessorId === void 0) return;
            let predecessorNode = graph.node(predecessorId);
            predecessorNode.dummy && (predecessorNode.order < minOrder || predecessorNode.order > maxOrder) && dn(conflicts, predecessorId, nodeId);
          });
      }
    });
  }
  function findType2ConflictsInLayer(upperLayer, layerNodes) {
    let previousBoundaryOrder = -1,
      nextBorderOrder = -1,
      rangeStart = 0;
    return (
      layerNodes.forEach((nodeId, nodeIndex) => {
        if (graph.node(nodeId).dummy === "border") {
          let predecessors = graph.predecessors(nodeId);
          if (predecessors && predecessors.length) {
            let firstPredecessor = predecessors[0];
            if (firstPredecessor === void 0) return;
            ((nextBorderOrder = graph.node(firstPredecessor).order),
              findConflictsInRange(layerNodes, rangeStart, nodeIndex, previousBoundaryOrder, nextBorderOrder),
              (rangeStart = nodeIndex),
              (previousBoundaryOrder = nextBorderOrder));
          }
        }
        findConflictsInRange(layerNodes, rangeStart, layerNodes.length, nextBorderOrder, upperLayer.length);
      }),
      layerNodes
    );
  }
  return (layering.length && layering.reduce(findType2ConflictsInLayer), conflicts);
}
export function Pt(alignmentCoordinates, referenceCoordinates) {
  let referenceCoordinateValues = Object.values(referenceCoordinates),
    referenceMinimum = L(Math.min, referenceCoordinateValues),
    referenceMaximum = L(Math.max, referenceCoordinateValues);
  ["u", "d"].forEach((verticalAlignment) => {
    ["l", "r"].forEach((horizontalAlignment) => {
      let alignmentKey = verticalAlignment + horizontalAlignment,
        coordinatesForAlignment = alignmentCoordinates[alignmentKey];
      if (!coordinatesForAlignment || coordinatesForAlignment === referenceCoordinates) return;
      let coordinateValues = Object.values(coordinatesForAlignment),
        coordinateShift = referenceMinimum - L(Math.min, coordinateValues);
      (horizontalAlignment !== "l" && (coordinateShift = referenceMaximum - L(Math.max, coordinateValues)),
        coordinateShift && (alignmentCoordinates[alignmentKey] = O(coordinatesForAlignment, (coordinate) => coordinate + coordinateShift)));
    });
  });
}
export function Mt(alignmentCoordinates, preferredAlignment = void 0) {
  let upperLeftAlignment = alignmentCoordinates.ul;
  return upperLeftAlignment
    ? O(upperLeftAlignment, (coordinate, nodeId) => {
        var firstMedianCoordinate, secondMedianCoordinate;
        if (preferredAlignment) {
          let preferredAlignmentKey = preferredAlignment.toLowerCase(),
            preferredCoordinates = alignmentCoordinates[preferredAlignmentKey];
          if (preferredCoordinates && preferredCoordinates[nodeId] !== void 0) return preferredCoordinates[nodeId];
        }
        let sortedCoordinates = Object.values(alignmentCoordinates)
          .map((alignmentCoordinates) => {
            let coordinateValue = alignmentCoordinates[nodeId];
            return coordinateValue !== void 0 ? coordinateValue : 0;
          })
          .sort((firstCoordinate, secondCoordinate) => firstCoordinate - secondCoordinate);
        return (
          (((firstMedianCoordinate = sortedCoordinates[1]) != null ? firstMedianCoordinate : 0) + ((secondMedianCoordinate = sortedCoordinates[2]) != null ? secondMedianCoordinate : 0)) /
          2
        );
      })
    : {};
}
export function Ft(graph) {
  let layering = N(graph),
    graphLabel = graph.graph(),
    rankSeparation = graphLabel.ranksep,
    rankAlignment = graphLabel.rankalign,
    currentY = 0;
  layering.forEach((layer) => {
    let layerHeight = layer.reduce((previousHeight, nodeId) => {
      var rawHeight;
      let nodeHeight = (rawHeight = graph.node(nodeId).height) != null ? rawHeight : 0;
      return previousHeight > nodeHeight ? previousHeight : nodeHeight;
    }, 0);
    (layer.forEach((nodeId) => {
      let nodeLabel = graph.node(nodeId);
      rankAlignment === "top"
        ? (nodeLabel.y = currentY + nodeLabel.height / 2)
        : rankAlignment === "bottom"
          ? (nodeLabel.y = currentY + layerHeight - nodeLabel.height / 2)
          : (nodeLabel.y = currentY + layerHeight / 2);
    }),
      (currentY += layerHeight + rankSeparation));
  });
}
const DEFAULT_NODE_WIDTH = 350;
const MAX_COLS = 8;
function computeMaxRowWidth(nodes, gap, mode) {
  if (nodes.length === 0)
    return MAX_COLS * DEFAULT_NODE_WIDTH + (MAX_COLS - 1) * gap;
  const maxW = Math.max(...nodes.map((node) => sizeOf(node, mode).width));
  return maxW * MAX_COLS + gap * (MAX_COLS - 1);
}
export class GridSlotLayout {
  name = "grid-slot";
  compute(nodes, _edges, options) {
    if (nodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    const maxRowW = computeMaxRowWidth(nodes, gap, mode);
    const positions = new Map();
    let curX = 0;
    let curY = 0;
    let colCount = 0;
    let rowMaxH = 0;
    let accW = 0;
    for (const node of nodes) {
      const sz = sizeOf(node, mode);
      if (colCount > 0) {
        const widthIfAdd = accW + gap + sz.width;
        if (colCount >= MAX_COLS || widthIfAdd > maxRowW) {
          curX = 0;
          curY += rowMaxH + gap;
          colCount = 0;
          rowMaxH = 0;
          accW = 0;
        }
      }
      positions.set(node.id, {
        x: curX,
        y: curY,
      });
      curX += sz.width + gap;
      accW += (colCount > 0 ? gap : 0) + sz.width;
      rowMaxH = Math.max(rowMaxH, sz.height);
      colCount++;
    }
    return positions;
  }
  /**
   * Row-first incremental placement.
   *
   * Adapts CanvasNode → Rect, then delegates each placement to the
   * shared `findFreePositionForRects` algorithm in @hilo/protocol.
   * Each just-placed node is appended to the occupied list so that
   * successive new nodes don't overlap each other.
   */
  computeIncremental(existingNodes, newNodes, _edges, options) {
    if (newNodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    if (existingNodes.length === 0) {
      return this.compute(newNodes, [], options);
    }
    const occupied = existingNodes.map((node) => nodeToRect(node, mode));
    const result = new Map();
    for (const node of newNodes) {
      const sz = sizeOf(node, mode);
      const pos = findFreePositionForRects(occupied, sz, {
        gap,
      });
      result.set(node.id, pos);
      occupied.push({
        x: pos.x,
        y: pos.y,
        w: sz.width,
        h: sz.height,
      });
    }
    return result;
  }
}
