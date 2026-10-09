// history-manager2.js
import { createEmptyGraph } from "./use-active-mode.js";
import { Tt } from "../text-editor/is-diff-review-session-ready.js";
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
    this.travels = Tt(initialState ?? createEmptyGraph(), {
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
      const temporary = Tt(state2, {
        maxHistory: 1,
        autoArchive: false,
      });
      temporary.setState(updater);
      return temporary.getState();
    });
    const initial = rebased[0];
    if (!initial) return;
    this.unsubscribe();
    this.travels = Tt(initial, {
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
    if (!this.isCheckpointCurrent(checkpoint) || !this.travels.canBack())
      return false;
    this.undo();
    return true;
  }
  // ---- Lifecycle ----
  /** Establish the current state as the new baseline, clearing all history.
   *  Call after initialization / bulk loads so those changes aren't undoable. */
  snapshot() {
    const currentState = this.travels.getState();
    this.unsubscribe();
    this.travels = Tt(currentState, {
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
