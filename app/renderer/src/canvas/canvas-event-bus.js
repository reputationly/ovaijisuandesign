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

function stripInvisibleKeys(node) {
  const data = node.data;
  if (!data) return node;
  let hasInvisible = false;
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    if (INVISIBLE_DATA_KEYS.has(key)) hasInvisible = true;
    else cleaned[key] = value;
  }
  return hasInvisible
    ? {
        ...node,
        data: cleaned,
      }
    : node;
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
  current,
  historyManager,
  direction,
  maxTransparentSteps,
  onBlocked,
) {
  for (let steps = 1; steps <= maxTransparentSteps + 1; steps++) {
    const candidate =
      direction === "undo"
        ? historyManager.peekUndoState(steps)
        : historyManager.peekRedoState(steps);
    const decision = decideHistoryStep(current, candidate);
    if (!decision.allow) {
      if (decision.blockReason) onBlocked?.(decision.blockReason);
      return 0;
    }
    if (candidate && !isInvisibleHistoryTransition(current, candidate))
      return steps;
  }
  return maxTransparentSteps + 1;
}

export function rebaseRetainedHistoryNodes(
  historyManager,
  pending,
  live,
  currentNodes,
) {
  const retainedIds = new Set(
    pending
      .filter((entry) => {
        const current = live.get(entry.id);
        return (
          isRetainedGenerationNode(current) ||
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
      .filter((node) => retainedIds.has(node.id))
      .map((node) => [node.id, structuredClone(node)]),
  );
  historyManager.rebase((draft) => {
    for (let index = 0; index < draft.nodes.length; index++) {
      const canonical = canonicalById.get(draft.nodes[index].id);
      if (canonical) draft.nodes[index] = structuredClone(canonical);
    }
  });
}

export class CanvasEventBus {
  handlers = new Map();
  interceptors = new Map();
  on(type, handler) {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const registeredHandler = handler;
    set.add(registeredHandler);
    return () => {
      set.delete(registeredHandler);
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
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
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
  intercept(type, interceptor) {
    let set = this.interceptors.get(type);
    if (!set) {
      set = new Set();
      this.interceptors.set(type, set);
    }
    const registeredInterceptor = interceptor;
    set.add(registeredInterceptor);
    return () => {
      set.delete(registeredInterceptor);
    };
  }
  /** Remove all listeners and interceptors */
  dispose() {
    this.handlers.clear();
    this.interceptors.clear();
  }
}
