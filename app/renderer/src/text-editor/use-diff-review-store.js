// use-diff-review-store.js
import { create$2 } from "../vendor.js";
import { isDiffReviewSessionReady } from "./is-diff-review-session-ready.js";

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
  const hunks = input.appliedEdits
    .map(toHunk)
    .sort((a2, b3) => a2.startLine - b3.startLine);
  return {
    requestId: input.requestId,
    nodeId: input.nodeId,
    contentHash: input.contentHash,
    contentReady,
    hunks,
  };
}

function withResolvedCleanup(session) {
  if (!session) return null;
  return session.hunks.some((hunk) => hunk.status === "pending")
    ? session
    : null;
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
    if (
      !session ||
      session.requestId !== requestId ||
      isDiffReviewSessionReady(session)
    )
      return;
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
    if (
      !session ||
      session.requestId !== requestId ||
      session.baselineMarkdown !== void 0
    )
      return;
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
    if (!session || (historyHandler && !isDiffReviewSessionReady(session)))
      return;
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
    if (after.hunks.every((hunk, index2) => hunk === session.hunks[index2]))
      return;
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
    if (!session || (historyHandler && !isDiffReviewSessionReady(session)))
      return;
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
    if (after.hunks.every((hunk, index2) => hunk === session.hunks[index2]))
      return;
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
      const { undoneIds, content: content2 } = await undoHandler(
        session.nodeId,
        targets,
      );
      const undone = new Set(undoneIds);
      const current2 = get3().session;
      if (
        !current2 ||
        current2.requestId !== session.requestId ||
        undone.size === 0
      )
        return;
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
