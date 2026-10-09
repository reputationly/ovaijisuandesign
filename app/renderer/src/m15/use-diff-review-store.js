// use-diff-review-store.js
import { reactExports, create$2 } from "../vendor.js";
import { Ct$2 } from "./ct.js";
export function Tt$1(t2, e2 = {}) {
  return new Ct$2(t2, e2);
}
const MAX_HISTORY = 100;
function createHistory$1(initial) {
  return Tt$1(initial, {
    maxHistory: MAX_HISTORY,
    autoArchive: false,
  });
}
export function useTableHistory(initial) {
  const travelsRef = reactExports.useRef(null);
  if (travelsRef.current === null) travelsRef.current = createHistory$1(initial);
  const [doc2, setDoc] = reactExports.useState(initial);
  reactExports.useEffect(() => {
    travelsRef.current = createHistory$1(initial);
    setDoc(initial);
  }, [initial]);
  const apply2 = reactExports.useCallback((transform2) => {
    const travels2 = travelsRef.current;
    if (!travels2) return;
    const prev = travels2.getState();
    const next2 = transform2(prev);
    if (next2 === prev) return;
    travels2.setState((draft) => {
      mergeDocIntoDraft(draft, next2, prev);
    });
    travels2.archive();
    setDoc(travels2.getState());
  }, []);
  const reset2 = reactExports.useCallback((next2) => {
    travelsRef.current = createHistory$1(next2);
    setDoc(next2);
  }, []);
  const undo2 = reactExports.useCallback(() => {
    const travels2 = travelsRef.current;
    if (!travels2?.canBack()) return;
    travels2.back();
    setDoc(travels2.getState());
  }, []);
  const redo2 = reactExports.useCallback(() => {
    const travels2 = travelsRef.current;
    if (!travels2?.canForward()) return;
    travels2.forward();
    setDoc(travels2.getState());
  }, []);
  const travels = travelsRef.current;
  return {
    doc: doc2,
    apply: apply2,
    reset: reset2,
    undo: undo2,
    redo: redo2,
    canUndo: travels?.canBack() ?? false,
    canRedo: travels?.canForward() ?? false,
  };
}
function mergeDocIntoDraft(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.version !== prev.version) draft.version = next2.version;
  if (next2.columns !== prev.columns) {
    if (!tryMergeArrayById(draft.columns, next2.columns, prev.columns, mergeColumnInto)) {
      draft.columns = next2.columns;
    }
  }
  if (next2.rows !== prev.rows) {
    if (!tryMergeArrayById(draft.rows, next2.rows, prev.rows, mergeRowInto)) {
      draft.rows = next2.rows;
    }
  }
  if (next2.filter !== prev.filter) {
    mergeOptionalField(draft, "filter", next2.filter, prev.filter);
  }
  if (next2.rowHeight !== prev.rowHeight) {
    mergeOptionalField(draft, "rowHeight", next2.rowHeight, prev.rowHeight);
  }
}
function mergeOptionalField(draft, key2, next2, prev) {
  if (next2 === void 0) {
    if (prev !== void 0) delete draft[key2];
    return;
  }
  draft[key2] = next2;
}
function mergeColumnInto(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.id !== prev.id) draft.id = next2.id;
  if (next2.title !== prev.title) draft.title = next2.title;
  if (next2.type !== prev.type) draft.type = next2.type;
  if (next2.visible !== prev.visible) draft.visible = next2.visible;
  if (next2.width !== prev.width) draft.width = next2.width;
}
function mergeRowInto(draft, next2, prev) {
  if (next2 === prev) return;
  if (next2.id !== prev.id) draft.id = next2.id;
  if (next2.cells !== prev.cells) {
    mergeCellsInto(draft.cells, next2.cells, prev.cells);
  }
  if (next2.height !== prev.height) {
    if (next2.height === void 0) delete draft.height;
    else draft.height = next2.height;
  }
}
function mergeCellsInto(draft, next2, prev) {
  for (const key2 of Object.keys(prev)) {
    if (!(key2 in next2)) delete draft[key2];
  }
  for (const key2 of Object.keys(next2)) {
    if (next2[key2] !== prev[key2]) draft[key2] = next2[key2];
  }
}
function tryMergeArrayById(draft, next2, prev, mergeItem) {
  if (next2 === prev) return true;
  if (next2.length === prev.length) {
    for (let i2 = 0; i2 < next2.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (!n2 || !p3 || n2.id !== p3.id) return false;
    }
    for (let i2 = 0; i2 < next2.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (n2 !== p3) mergeItem(draft[i2], n2, p3);
    }
    return true;
  }
  if (next2.length === prev.length + 1) {
    for (let i2 = 0; i2 < prev.length; i2++) {
      const n2 = next2[i2];
      const p3 = prev[i2];
      if (!n2 || !p3 || n2.id !== p3.id) return false;
    }
    draft.push(next2[prev.length]);
    return true;
  }
  if (next2.length + 1 === prev.length) {
    let removedAt = -1;
    let scan = 0;
    for (let i2 = 0; i2 < prev.length; i2++) {
      const p3 = prev[i2];
      const n2 = scan < next2.length ? next2[scan] : void 0;
      if (p3 && n2 && p3.id === n2.id) {
        scan++;
      } else if (removedAt === -1) {
        removedAt = i2;
      } else {
        return false;
      }
    }
    if (removedAt >= 0 && scan === next2.length) {
      draft.splice(removedAt, 1);
      return true;
    }
  }
  return false;
}
function diffReviewHunkId(edit) {
  return `${edit.annotationId}:${edit.targetIndex ?? 0}`;
}
function toHunk(edit) {
  return {
    id: diffReviewHunkId(edit),
    annotationId: edit.annotationId,
    ...(edit.targetIndex !== void 0
      ? {
          targetIndex: edit.targetIndex,
        }
      : {}),
    originalText: edit.originalText,
    replacement: edit.replacement,
    newStart: edit.newStart,
    newEnd: edit.newEnd,
    reversePrefix: edit.reversePrefix,
    reverseSuffix: edit.reverseSuffix,
    ...(edit.reverseOccurrence !== void 0
      ? {
          reverseOccurrence: edit.reverseOccurrence,
        }
      : {}),
    startLine: edit.startLine,
    status: "pending",
  };
}
function toSession(input, contentReady = input.contentReady ?? false) {
  const hunks = input.appliedEdits.map(toHunk).sort((a2, b3) => a2.startLine - b3.startLine);
  return {
    requestId: input.requestId,
    nodeId: input.nodeId,
    contentHash: input.contentHash,
    contentReady,
    hunks,
  };
}
export function isDiffReviewSessionReady(session) {
  return session.contentReady === true || session.baselineMarkdown !== void 0;
}
function withResolvedCleanup(session) {
  if (!session) return null;
  return session.hunks.some((hunk) => hunk.status === "pending") ? session : null;
}
export const useDiffReviewStore = create$2((set2, get3) => ({
  session: null,
  reverting: false,
  undoHandler: null,
  historyHandler: null,
  queuedSession: null,
  activeEditorNodeId: null,
  pendingOpenNodeId: null,
  pendingScrollToFirstHunkNodeId: null,
  navigation: null,
  setUndoHandler(handler) {
    set2({
      undoHandler: handler,
    });
  },
  setHistoryHandler(handler) {
    set2({
      historyHandler: handler,
    });
  },
  setActiveEditorNodeId(nodeId) {
    set2({
      activeEditorNodeId: nodeId,
    });
  },
  setNavigation(navigation2) {
    set2({
      navigation: navigation2,
    });
  },
  requestOpenEditor(nodeId) {
    set2({
      pendingOpenNodeId: nodeId,
      pendingScrollToFirstHunkNodeId: nodeId,
    });
  },
  consumeOpenEditor(nodeId) {
    if (get3().pendingOpenNodeId !== nodeId) return false;
    set2({
      pendingOpenNodeId: null,
    });
    return true;
  },
  consumeScrollToFirstHunk(nodeId) {
    if (get3().pendingScrollToFirstHunkNodeId !== nodeId) return false;
    set2({
      pendingScrollToFirstHunkNodeId: null,
    });
    return true;
  },
  setContentReady(requestId) {
    const { session } = get3();
    if (!session || session.requestId !== requestId || isDiffReviewSessionReady(session)) return;
    set2({
      session: {
        ...session,
        contentReady: true,
      },
    });
    const queued = get3().queuedSession;
    if (queued) {
      set2({
        queuedSession: null,
      });
      get3().startSession(queued);
    }
  },
  promoteQueuedSession(requestId) {
    const { queuedSession, reverting } = get3();
    if (!queuedSession || queuedSession.requestId !== requestId) return;
    if (reverting) {
      if (queuedSession.contentReady === true) return;
      set2({
        queuedSession: {
          ...queuedSession,
          contentReady: true,
        },
      });
      return;
    }
    set2({
      session: toSession(queuedSession, true),
      queuedSession: null,
    });
  },
  setBaselineMarkdown(requestId, markdown2, historyDepthAtStart = 0) {
    const { session } = get3();
    if (!session || session.requestId !== requestId || session.baselineMarkdown !== void 0) return;
    set2({
      session: {
        ...session,
        contentReady: true,
        baselineMarkdown: markdown2,
        historyDepthAtStart,
      },
    });
    const queued = get3().queuedSession;
    if (queued) {
      set2({
        queuedSession: null,
      });
      get3().startSession(queued);
    }
  },
  restoreRetainedSession(restored) {
    set2({
      session: restored,
      reverting: false,
      queuedSession: null,
      activeEditorNodeId: null,
      pendingOpenNodeId: null,
      pendingScrollToFirstHunkNodeId: null,
      navigation: null,
    });
  },
  restoreHistorySession(restored) {
    const { session } = get3();
    if (!session || session.requestId !== restored.requestId) return;
    set2({
      session: restored,
    });
  },
  finishHistorySession(requestId) {
    const { session } = get3();
    if (
      !session ||
      session.requestId !== requestId ||
      session.hunks.some((hunk) => hunk.status === "pending")
    )
      return;
    set2({
      session: null,
    });
  },
  finishSessionForUserEdit(requestId) {
    const { session } = get3();
    if (!session || session.requestId !== requestId) return;
    set2({
      session: null,
    });
  },
  startSession(input) {
    if (input.appliedEdits.length === 0) return;
    const { reverting, session, historyHandler } = get3();
    if (reverting) {
      set2({
        queuedSession: input,
      });
      return;
    }
    if (session?.requestId === input.requestId) return;
    if (session && historyHandler && !isDiffReviewSessionReady(session)) {
      set2({
        queuedSession: input,
      });
      return;
    }
    if (session) {
      const after = {
        ...session,
        hunks: session.hunks.map((hunk) =>
          hunk.status === "pending"
            ? {
                ...hunk,
                status: "accepted",
              }
            : hunk,
        ),
      };
      if (
        !historyHandler?.({
          kind: "accept",
          before: session,
          after,
        })
      ) {
        set2({
          session: null,
        });
      }
    }
    set2({
      session: toSession(input),
      queuedSession: null,
    });
  },
  acceptHunk(id2) {
    get3().acceptHunks([id2]);
  },
  acceptHunks(ids2) {
    const { session, historyHandler } = get3();
    if (!session || (historyHandler && !isDiffReviewSessionReady(session))) return;
    const acceptedIds = new Set(ids2);
    const after = {
      ...session,
      hunks: session.hunks.map((hunk) =>
        acceptedIds.has(hunk.id) && hunk.status === "pending"
          ? {
              ...hunk,
              status: "accepted",
            }
          : hunk,
      ),
    };
    if (after.hunks.every((hunk, index2) => hunk === session.hunks[index2])) return;
    if (
      historyHandler?.({
        kind: "accept",
        before: session,
        after,
      })
    )
      return;
    set2({
      session: withResolvedCleanup(after),
    });
  },
  acceptAll() {
    const { session, historyHandler } = get3();
    if (!session || (historyHandler && !isDiffReviewSessionReady(session))) return;
    const after = {
      ...session,
      hunks: session.hunks.map((hunk) =>
        hunk.status === "pending"
          ? {
              ...hunk,
              status: "accepted",
            }
          : hunk,
      ),
    };
    if (after.hunks.every((hunk, index2) => hunk === session.hunks[index2])) return;
    if (
      historyHandler?.({
        kind: "accept",
        before: session,
        after,
      })
    )
      return;
    set2({
      session: withResolvedCleanup(after),
    });
  },
  async requestUndo(ids2) {
    const { session, undoHandler, reverting, historyHandler } = get3();
    if (
      !session ||
      !undoHandler ||
      reverting ||
      (historyHandler && !isDiffReviewSessionReady(session))
    )
      return;
    const targets = session.hunks.filter(
      (hunk) => hunk.status === "pending" && (!ids2 || ids2.includes(hunk.id)),
    );
    if (targets.length === 0) return;
    const focusHunkId =
      ids2?.length === 1 && targets.length === 1 && ids2[0] === targets[0]?.id
        ? targets[0].id
        : void 0;
    set2({
      reverting: true,
    });
    try {
      const { undoneIds, content: content2 } = await undoHandler(session.nodeId, targets);
      const undone = new Set(undoneIds);
      const current2 = get3().session;
      if (!current2 || current2.requestId !== session.requestId || undone.size === 0) return;
      const after = {
        ...current2,
        hunks: current2.hunks.map((hunk) =>
          undone.has(hunk.id)
            ? {
                ...hunk,
                status: "undone",
              }
            : hunk,
        ),
      };
      const { historyHandler: historyHandler2 } = get3();
      if (
        content2 !== void 0 &&
        historyHandler2?.({
          kind: "revert",
          before: current2,
          after,
          content: content2,
          ...(focusHunkId
            ? {
                focusHunkId,
              }
            : {}),
        })
      )
        return;
      set2({
        session: withResolvedCleanup(after),
      });
    } finally {
      set2({
        reverting: false,
      });
      const queued = get3().queuedSession;
      if (queued) {
        set2({
          queuedSession: null,
        });
        get3().startSession(queued);
      }
    }
  },
  clearSession() {
    set2({
      session: null,
      reverting: false,
      queuedSession: null,
      pendingOpenNodeId: null,
      pendingScrollToFirstHunkNodeId: null,
      navigation: null,
    });
  },
}));
