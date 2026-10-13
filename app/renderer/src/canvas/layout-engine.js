// layout-engine.js
import {
  buildAdjacency,
  COLLISION_MARGIN,
  nodeToRect,
  rectsOverlap,
  topoSortLevels,
} from "./layout-category-lanes.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { computeCentroid, sizeOf } from "./use-active-mode.js";

const LEVEL_GAP = 40;

const MAX_COLLISION_ATTEMPTS = 50;

export class LayoutEngine {
  strategies = new Map();
  register(strategy) {
    this.strategies.set(strategy.name, strategy);
  }
  unregister(strategyName) {
    this.strategies.delete(strategyName);
  }
  compute(strategyName, nodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    return strategy.compute(nodes, edges, options);
  }
  async computeAsync(strategyName, nodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    if (strategy.computeAsync) {
      return strategy.computeAsync(nodes, edges, options);
    }
    return strategy.compute(nodes, edges, options);
  }
  /**
   * Incremental placement for new nodes among existing ones.
   *
   * Delegates to the strategy's own `computeIncremental` when available
   * (e.g. GridSlotLayout scans for the first free slot). Falls back to a
   * topological-level algorithm for workflow/DAG modes.
   */
  computeIncremental(strategyName, existingNodes, newNodes, edges, options) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Layout strategy "${strategyName}" not registered`);
    }
    if (newNodes.length === 0) return new Map();
    if (strategy.computeIncremental) {
      return strategy.computeIncremental(
        existingNodes,
        newNodes,
        edges,
        options,
      );
    }
    const mode = options?.mode ?? CanvasMode.Workflow;
    const anchor = options?.anchor ?? computeCentroid(existingNodes, mode);
    const occupied = existingNodes.map((node) => nodeToRect(node, mode));
    const allNodeIds = new Set([
      ...existingNodes.map((node) => node.id),
      ...newNodes.map((node) => node.id),
    ]);
    const { children, parents } = buildAdjacency(allNodeIds, edges);
    const levels = topoSortLevels(allNodeIds, children, parents);
    const newByLevel = new Map();
    for (const node of newNodes) {
      const level = levels.get(node.id) ?? 0;
      if (!newByLevel.has(level)) newByLevel.set(level, []);
      newByLevel.get(level)?.push(node);
    }
    const result = new Map();
    const levelGap = options?.spacing?.x ?? LEVEL_GAP;
    const sortedLevels = [...newByLevel.keys()].sort((leftLevel, rightLevel) => leftLevel - rightLevel);
    for (const level of sortedLevels) {
      const nodesAtLevel = newByLevel.get(level) ?? [];
      for (let nodeIndex = 0; nodeIndex < nodesAtLevel.length; nodeIndex++) {
        const node = nodesAtLevel[nodeIndex];
        const sz = sizeOf(node, mode);
        const pos = {
          x: anchor.x + level * levelGap,
          y: anchor.y + nodeIndex * (sz.height + COLLISION_MARGIN),
        };
        const candidate = {
          x: pos.x,
          y: pos.y,
          w: sz.width,
          h: sz.height,
        };
        for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
          const blocker = occupied.find((occ) => rectsOverlap(candidate, occ));
          if (!blocker) break;
          candidate.x = blocker.x + blocker.w + COLLISION_MARGIN;
        }
        const finalPos = {
          x: candidate.x,
          y: candidate.y,
        };
        result.set(node.id, finalPos);
        occupied.push({
          x: finalPos.x,
          y: finalPos.y,
          w: sz.width,
          h: sz.height,
        });
      }
    }
    return result;
  }
  listStrategies() {
    return Array.from(this.strategies.keys());
  }
}
