// history-manager2.js
import { POPOVER_DRAFT_DATA_KEY } from "./group-nodes-in-canvas.js";
import { createEmptyGraph } from "./node-tag-rings-canvas.jsx";
import {
  decideHistoryStep,
  isRetainedGenerationNode,
} from "./remove-nodes-and-promote-group-mains.js";
import { ASSET_PROJECTED_DATA_KEYS, TRANSIENT_DATA_KEYS } from "./resolve-derived-collision.js";
import { Tt$1 } from "../text-editor/use-diff-review-store.js";
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
  return keysA.every((k2) => Object.hasOwn(rb, k2) && isSamePersistedData(ra[k2], rb[k2]));
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
    if (!isSamePersistedData(stripInvisibleKeys(beforeNode), stripInvisibleKeys(afterNode))) {
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
      direction === "undo" ? history2.peekUndoState(steps) : history2.peekRedoState(steps);
    const decision = decideHistoryStep(current2, candidate);
    if (!decision.allow) {
      if (decision.blockReason) onBlocked?.(decision.blockReason);
      return 0;
    }
    if (candidate && !isInvisibleHistoryTransition(current2, candidate)) return steps;
  }
  return maxTransparentSteps + 1;
}
export function rebaseRetainedHistoryNodes(history2, pending2, live, currentNodes) {
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
export class HistoryManager2 {
  travels;
  unsubscribe;
  maxHistorySize;
  /** Monotone commit identity; unlike travels.position it never caps at maxHistory. */
  commitVersion = 0;
  /** Invalidates checkpoints on every later graph write, including unarchived server writes. */
  mutationVersion = 0;
  historyListeners = new Set();
  beforeWrite;
  /**
   * True when the pending (unarchived) tempPatches batch contains at least
   * one SERVER-driven write (`serverSetState`). `commit()` consults this to
   * seal that batch as its own history entry BEFORE applying the user's
   * updater — otherwise travels' manual-archive mode would fold the server
   * patches into the user's commit, and undoing the user's action would
   * silently also revert the server-driven changes (e.g. one Cmd-Z after a
   * generation both undoes the user's move AND deletes the placeholder the
   * server inserted).
   */
  pendingServerWrite = false;
  /**
   * > 0 while a transaction is open (see `beginTransaction`). Inside a
   * transaction, `commit()` applies its updater WITHOUT sealing a history
   * entry; `endTransaction()` archives everything accumulated since
   * `beginTransaction()` as ONE undoable step. Depth-counted so nested
   * transactions fold into the outermost one.
   */
  transactionDepth = 0;
  constructor(initialState, maxHistory = 100) {
    this.maxHistorySize = maxHistory;
    this.travels = Tt$1(initialState ?? createEmptyGraph(), {
      maxHistory,
      autoArchive: false,
    });
    this.unsubscribe = this.travels.subscribe(() => {});
  }
  // ---- State access ----
  getState() {
    return this.travels.getState();
  }
  // ---- State mutations ----
  /**
   * Register a hook that runs on the draft at the START of every functional
   * state write (both `setState` and `commit`), before the caller's updater.
   *
   * Used by CanvasInstance to bake staged placeholder fills (`pendingFills`)
   * into the truth state the moment any other write happens, so user updaters
   * that replace `node.data` always operate on (and win over) already-baked
   * content. The hook must be idempotent and must NOT read back through
   * CanvasInstance.getGraph() (it runs inside a draft).
   */
  setBeforeWriteHook(hook) {
    this.beforeWrite = hook;
  }
  /** Update state without creating a history entry (for initialization / bulk loads) */
  setState(updater) {
    if (this.beforeWrite && typeof updater === "function") {
      this.travels.setState(this.runWithHook(updater));
    } else {
      this.travels.setState(updater);
    }
    this.mutationVersion++;
  }
  /**
   * SERVER-driven sibling of `setState`: same "no own history entry" write,
   * but additionally marks the pending tempPatches batch as containing server
   * patches, so the NEXT `commit()` seals that batch into its own history
   * entry instead of folding it into the user's commit. See
   * `pendingServerWrite` for the full rationale.
   */
  serverSetState(updater) {
    this.setState(updater);
    this.pendingServerWrite = true;
  }
  /**
   * Apply a canonicalization transform to every undo/redo state.
   *
   * Identity migrations cannot live only in the current state: an older
   * checkpoint would otherwise restore the retired identity on undo and the
   * renderer would persist it again. Rebuilding the patch history keeps the
   * user's existing undo/redo timeline while making the transform invariant
   * across every reachable state.
   */
  rebase(updater) {
    const history2 = this.travels.getHistory();
    const position2 = this.travels.getPosition();
    const rebased = history2.map((state2) => {
      const temporary = Tt$1(state2, {
        maxHistory: 1,
        autoArchive: false,
      });
      temporary.setState(updater);
      return temporary.getState();
    });
    const initial = rebased[0];
    if (!initial) return;
    this.unsubscribe();
    this.travels = Tt$1(initial, {
      maxHistory: this.maxHistorySize,
      autoArchive: false,
    });
    for (const state2 of rebased.slice(1)) {
      this.travels.setState((draft) => {
        draft.nodes = state2.nodes;
        draft.edges = state2.edges;
        draft.viewport = state2.viewport;
      });
      this.travels.archive();
    }
    this.travels.go(Math.min(position2, rebased.length - 1));
    this.unsubscribe = this.travels.subscribe(() => {});
    this.pendingServerWrite = false;
    this.mutationVersion++;
    this.notifyHistoryChange();
  }
  /**
   * Open a transaction: every `commit()` until the matching
   * `endTransaction()` folds into ONE undoable history entry (a single
   * Cmd-Z reverts the whole batch). Used for composite gestures that are
   * implemented as several sequential commits — e.g. "全部独立" detaching
   * each sub image — but must read as one operation to the user.
   *
   * Any pending server-driven batch is sealed up front (same rationale as
   * `commit()`), so the transaction archives exactly the user's changes.
   */
  beginTransaction() {
    if (this.transactionDepth === 0 && this.pendingServerWrite) {
      this.travels.archive();
      this.pendingServerWrite = false;
    }
    this.transactionDepth++;
  }
  /**
   * Close the current transaction. When the outermost level closes, the
   * accumulated patches are archived as one entry; returns its checkpoint
   * (or null when nothing changed / a nested level closed).
   */
  endTransaction() {
    if (this.transactionDepth === 0) return null;
    this.transactionDepth--;
    if (this.transactionDepth > 0) return null;
    const changed = this.travels.canArchive();
    this.travels.archive();
    if (changed) this.commitVersion++;
    const checkpoint = changed ? this.createCheckpoint() : null;
    this.notifyHistoryChange();
    return checkpoint;
  }
  /** Update state AND create an undoable checkpoint; returns null for a no-op batch. */
  commit(updater) {
    if (this.transactionDepth > 0) {
      this.travels.setState(this.runWithHook(updater));
      this.mutationVersion++;
      this.notifyHistoryChange();
      return null;
    }
    if (this.pendingServerWrite) {
      this.travels.archive();
      this.pendingServerWrite = false;
    }
    this.travels.setState(this.runWithHook(updater));
    this.mutationVersion++;
    const changed = this.travels.canArchive();
    this.travels.archive();
    if (changed) this.commitVersion++;
    const checkpoint = changed ? this.createCheckpoint() : null;
    this.notifyHistoryChange();
    return checkpoint;
  }
  /**
   * Wrap a functional updater so the registered beforeWrite hook runs on the
   * draft first, then the caller's updater. The cast is unavoidable —
   * travels' setState types `Updater<S>` as `S | ((draft: Draft<S>) => S)`,
   * not a function returning void, so we have to bridge with `as never`.
   */
  runWithHook(updater) {
    const hook = this.beforeWrite;
    return (draft) => {
      hook?.(draft);
      updater(draft);
    };
  }
  // ---- Undo / Redo ----
  undo() {
    if (this.travels.canBack()) {
      this.pendingServerWrite = false;
      this.travels.back();
      this.mutationVersion++;
      this.notifyHistoryChange();
    }
  }
  redo() {
    if (this.travels.canForward()) {
      this.pendingServerWrite = false;
      this.travels.forward();
      this.mutationVersion++;
      this.notifyHistoryChange();
    }
  }
  canUndo() {
    return this.travels.canBack();
  }
  canRedo() {
    return this.travels.canForward();
  }
  /**
   * Return the exact state a single undo/redo would land on. `getHistory()`
   * includes pending manual-archive patches and keeps the current state at
   * `getPosition()`, so unsealed server batches are covered too.
   */
  peekUndoState(steps = 1) {
    if (!Number.isInteger(steps) || steps < 1) return void 0;
    return this.travels.getHistory()[this.travels.getPosition() - steps];
  }
  peekRedoState(steps = 1) {
    if (!Number.isInteger(steps) || steps < 1) return void 0;
    return this.travels.getHistory()[this.travels.getPosition() + steps];
  }
  /** Undo only while no graph write has occurred since this exact commit. */
  undoIfCurrent(checkpoint) {
    if (!this.isCheckpointCurrent(checkpoint) || !this.travels.canBack()) return false;
    this.undo();
    return true;
  }
  // ---- Lifecycle ----
  /** Establish the current state as the new baseline, clearing all history.
   *  Call after initialization / bulk loads so those changes aren't undoable. */
  snapshot() {
    const currentState = this.travels.getState();
    this.unsubscribe();
    this.travels = Tt$1(currentState, {
      maxHistory: this.maxHistorySize,
      autoArchive: false,
    });
    this.unsubscribe = this.travels.subscribe(() => {});
    this.pendingServerWrite = false;
    this.mutationVersion++;
    this.notifyHistoryChange();
  }
  clear() {
    this.travels.reset();
    this.pendingServerWrite = false;
    this.mutationVersion++;
    this.notifyHistoryChange();
  }
  /** Subscribe to undo/redo availability changes */
  onHistoryChange(listener) {
    this.historyListeners.add(listener);
    return () => this.historyListeners.delete(listener);
  }
  dispose() {
    this.unsubscribe();
    this.historyListeners.clear();
  }
  createCheckpoint() {
    return {
      commitVersion: this.commitVersion,
      mutationVersion: this.mutationVersion,
      position: this.travels.getPosition(),
    };
  }
  /** Whether this checkpoint is still the untouched top history entry. */
  isCheckpointCurrent(checkpoint) {
    return (
      checkpoint.commitVersion === this.commitVersion &&
      checkpoint.mutationVersion === this.mutationVersion &&
      checkpoint.position === this.travels.getPosition() &&
      !this.pendingServerWrite &&
      !this.travels.canArchive()
    );
  }
  notifyHistoryChange() {
    for (const listener of this.historyListeners) listener();
  }
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
          console.error(`[canvas] Event handler error for "${event.type}":`, err);
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
