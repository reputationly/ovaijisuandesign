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

export function isSamePersistedData(a2, b3) {
  if (a2 === b3) return true;
  if (a2 === null || b3 === null) return a2 === b3;
  if (typeof a2 !== "object" || typeof b3 !== "object") return false;
  if (Array.isArray(a2) || Array.isArray(b3)) {
    if (!Array.isArray(a2) || !Array.isArray(b3)) return false;
    if (a2.length !== b3.length) return false;
    return a2.every((item, i2) => isSamePersistedData(item, b3[i2]));
  }
  const ra = a2;
  const rb = b3;
  const keysA = Object.keys(ra).filter((k2) => ra[k2] !== void 0);
  const keysB = Object.keys(rb).filter((k2) => rb[k2] !== void 0);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (k2) => Object.hasOwn(rb, k2) && isSamePersistedData(ra[k2], rb[k2]),
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
  for (const [k2, v2] of Object.entries(data2)) {
    if (INVISIBLE_DATA_KEYS.has(k2)) hasInvisible = true;
    else cleaned[k2] = v2;
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
  const afterById = new Map(after.nodes.map((n2) => [n2.id, n2]));
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
    const h2 = handler;
    set2.add(h2);
    return () => {
      set2.delete(h2);
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
    const i2 = interceptor;
    set2.add(i2);
    return () => {
      set2.delete(i2);
    };
  }
  /** Remove all listeners and interceptors */
  dispose() {
    this.handlers.clear();
    this.interceptors.clear();
  }
}
