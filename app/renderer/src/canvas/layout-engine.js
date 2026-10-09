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
  unregister(name2) {
    this.strategies.delete(name2);
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
    const mode2 = options?.mode ?? CanvasMode.Workflow;
    const anchor = options?.anchor ?? computeCentroid(existingNodes, mode2);
    const occupied = existingNodes.map((n2) => nodeToRect(n2, mode2));
    const allNodeIds = new Set([
      ...existingNodes.map((n2) => n2.id),
      ...newNodes.map((n2) => n2.id),
    ]);
    const { children: children2, parents } = buildAdjacency(allNodeIds, edges);
    const levels = topoSortLevels(allNodeIds, children2, parents);
    const newByLevel = new Map();
    for (const n2 of newNodes) {
      const level = levels.get(n2.id) ?? 0;
      if (!newByLevel.has(level)) newByLevel.set(level, []);
      newByLevel.get(level)?.push(n2);
    }
    const result = new Map();
    const levelGap = options?.spacing?.x ?? LEVEL_GAP;
    const sortedLevels = [...newByLevel.keys()].sort((a2, b3) => a2 - b3);
    for (const level of sortedLevels) {
      const nodesAtLevel = newByLevel.get(level) ?? [];
      for (let i2 = 0; i2 < nodesAtLevel.length; i2++) {
        const node2 = nodesAtLevel[i2];
        const sz = sizeOf(node2, mode2);
        const pos = {
          x: anchor.x + level * levelGap,
          y: anchor.y + i2 * (sz.height + COLLISION_MARGIN),
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
        result.set(node2.id, finalPos);
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
