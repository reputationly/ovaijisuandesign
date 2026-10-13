// canvas-event-bus.js
import { POPOVER_DRAFT_DATA_KEY } from "./compute-group-bounds-from-children.js";
import {
  ASSET_PROJECTED_DATA_KEYS,
  TRANSIENT_DATA_KEYS,
} from "./find-free-position-from-anchor.js";
import {
  decideHistoryStep,
  isRetainedGenerationNode,
} from "./remove-nodes-and-promote-group-mains.js";

export function isSamePersistedData(leftData, rightData) {
  if (leftData === rightData) return true;
  if (leftData === null || rightData === null) return leftData === rightData;
  if (typeof leftData !== "object" || typeof rightData !== "object") return false;
  if (Array.isArray(leftData) || Array.isArray(rightData)) {
    if (!Array.isArray(leftData) || !Array.isArray(rightData)) return false;
    if (leftData.length !== rightData.length) return false;
    return leftData.every((item, index) => isSamePersistedData(item, rightData[index]));
  }
  const ra = leftData;
  const rb = rightData;
  const keysA = Object.keys(ra).filter((key) => ra[key] !== void 0);
  const keysB = Object.keys(rb).filter((key) => rb[key] !== void 0);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) => Object.hasOwn(rb, key) && isSamePersistedData(ra[key], rb[key]),
  );
}

const UNDO_TRANSPARENT_DATA_KEYS = [POPOVER_DRAFT_DATA_KEY];

const INVISIBLE_DATA_KEYS = new Set([
  ...UNDO_TRANSPARENT_DATA_KEYS,
  ...ASSET_PROJECTED_DATA_KEYS,
  ...TRANSIENT_DATA_KEYS,
]);

function stripInvisibleKeys(node2) {
  const data2 = node2.data;
  if (!data2) return node2;
  let hasInvisible = false;
  const cleaned = {};
  for (const [key, value] of Object.entries(data2)) {
    if (INVISIBLE_DATA_KEYS.has(key)) hasInvisible = true;
    else cleaned[key] = value;
  }
  return hasInvisible
    ? {
        ...node2,
        data: cleaned,
      }
    : node2;
}

export function isInvisibleHistoryTransition(before, after) {
  if (before.nodes.length !== after.nodes.length) return false;
  if (before.edges.length !== after.edges.length) return false;
  const afterById = new Map(after.nodes.map((node) => [node.id, node]));
  for (const beforeNode of before.nodes) {
    const afterNode = afterById.get(beforeNode.id);
    if (!afterNode) return false;
    if (beforeNode === afterNode) continue;
    if (
      !isSamePersistedData(
        stripInvisibleKeys(beforeNode),
        stripInvisibleKeys(afterNode),
      )
    ) {
      return false;
    }
  }
  return isSamePersistedData(before.edges, after.edges);
}

export function findAllowedHistorySteps(
  current2,
  history2,
  direction,
  maxTransparentSteps,
  onBlocked,
) {
  for (let steps = 1; steps <= maxTransparentSteps + 1; steps++) {
    const candidate =
      direction === "undo"
        ? history2.peekUndoState(steps)
        : history2.peekRedoState(steps);
    const decision = decideHistoryStep(current2, candidate);
    if (!decision.allow) {
      if (decision.blockReason) onBlocked?.(decision.blockReason);
      return 0;
    }
    if (candidate && !isInvisibleHistoryTransition(current2, candidate))
      return steps;
  }
  return maxTransparentSteps + 1;
}

export function rebaseRetainedHistoryNodes(
  history2,
  pending2,
  live,
  currentNodes,
) {
  const retainedIds = new Set(
    pending2
      .filter((entry) => {
        const current2 = live.get(entry.id);
        return (
          isRetainedGenerationNode(current2) ||
          (entry.hasData &&
            isRetainedGenerationNode({
              data: entry.data,
            }))
        );
      })
      .map((entry) => entry.id),
  );
  if (retainedIds.size === 0) return;
  const canonicalById = new Map(
    currentNodes
      .filter((node2) => retainedIds.has(node2.id))
      .map((node2) => [node2.id, structuredClone(node2)]),
  );
  history2.rebase((draft) => {
    for (let index2 = 0; index2 < draft.nodes.length; index2++) {
      const canonical = canonicalById.get(draft.nodes[index2].id);
      if (canonical) draft.nodes[index2] = structuredClone(canonical);
    }
  });
}

export class CanvasEventBus {
  handlers = new Map();
  interceptors = new Map();
  on(type2, handler) {
    let set2 = this.handlers.get(type2);
    if (!set2) {
      set2 = new Set();
      this.handlers.set(type2, set2);
    }
    const registeredHandler = handler;
    set2.add(registeredHandler);
    return () => {
      set2.delete(registeredHandler);
    };
  }
  /**
   * Check if interceptors would allow the event.
   * Call BEFORE mutation to let interceptors block the operation.
   */
  canEmit(event) {
    const interceptors = this.interceptors.get(event.type);
    if (!interceptors) return true;
    for (const interceptor of interceptors) {
      const allow = interceptor(event);
      if (!allow) return false;
    }
    return true;
  }
  emit(event) {
    if (!this.canEmit(event)) return;
    this.emitDirect(event);
  }
  /** Emit without running interceptors. Use when canEmit() was already checked. */
  emitDirect(event) {
    const handlers2 = this.handlers.get(event.type);
    if (handlers2) {
      for (const handler of handlers2) {
        try {
          handler(event);
        } catch (err) {
          console.error(
            `[canvas] Event handler error for "${event.type}":`,
            err,
          );
        }
      }
    }
  }
  intercept(type2, interceptor) {
    let set2 = this.interceptors.get(type2);
    if (!set2) {
      set2 = new Set();
      this.interceptors.set(type2, set2);
    }
    const registeredInterceptor = interceptor;
    set2.add(registeredInterceptor);
    return () => {
      set2.delete(registeredInterceptor);
    };
  }
  /** Remove all listeners and interceptors */
  dispose() {
    this.handlers.clear();
    this.interceptors.clear();
  }
}
