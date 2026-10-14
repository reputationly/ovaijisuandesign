// use-diff-review-store.js
import { create } from "zustand";
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
    .sort((a, b) => a.startLine - b.startLine);
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
export const useDiffReviewStore = create((set, get) => ({
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
    set({
      undoHandler: handler,
    });
  },
  setHistoryHandler(handler) {
    set({
      historyHandler: handler,
    });
  },
  setActiveEditorNodeId(nodeId) {
    set({
      activeEditorNodeId: nodeId,
    });
  },
  setNavigation(nextNavigation) {
    set({
      navigation: nextNavigation,
    });
  },
  requestOpenEditor(nodeId) {
    set({
      pendingOpenNodeId: nodeId,
      pendingScrollToFirstHunkNodeId: nodeId,
    });
  },
  consumeOpenEditor(nodeId) {
    if (get().pendingOpenNodeId !== nodeId) return false;
    set({
      pendingOpenNodeId: null,
    });
    return true;
  },
  consumeScrollToFirstHunk(nodeId) {
    if (get().pendingScrollToFirstHunkNodeId !== nodeId) return false;
    set({
      pendingScrollToFirstHunkNodeId: null,
    });
    return true;
  },
  setContentReady(requestId) {
    const { session } = get();
    if (
      !session ||
      session.requestId !== requestId ||
      isDiffReviewSessionReady(session)
    )
      return;
    set({
      session: {
        ...session,
        contentReady: true,
      },
    });
    const queued = get().queuedSession;
    if (queued) {
      set({
        queuedSession: null,
      });
      get().startSession(queued);
    }
  },
  promoteQueuedSession(requestId) {
    const { queuedSession, reverting } = get();
    if (!queuedSession || queuedSession.requestId !== requestId) return;
    if (reverting) {
      if (queuedSession.contentReady === true) return;
      set({
        queuedSession: {
          ...queuedSession,
          contentReady: true,
        },
      });
      return;
    }
    set({
      session: toSession(queuedSession, true),
      queuedSession: null,
    });
  },
  setBaselineMarkdown(requestId, markdown, historyDepthAtStart = 0) {
    const { session } = get();
    if (
      !session ||
      session.requestId !== requestId ||
      session.baselineMarkdown !== void 0
    )
      return;
    set({
      session: {
        ...session,
        contentReady: true,
        baselineMarkdown: markdown,
        historyDepthAtStart,
      },
    });
    const queued = get().queuedSession;
    if (queued) {
      set({
        queuedSession: null,
      });
      get().startSession(queued);
    }
  },
  restoreRetainedSession(restored) {
    set({
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
    const { session } = get();
    if (!session || session.requestId !== restored.requestId) return;
    set({
      session: restored,
    });
  },
  finishHistorySession(requestId) {
    const { session } = get();
    if (
      !session ||
      session.requestId !== requestId ||
      session.hunks.some((hunk) => hunk.status === "pending")
    )
      return;
    set({
      session: null,
    });
  },
  finishSessionForUserEdit(requestId) {
    const { session } = get();
    if (!session || session.requestId !== requestId) return;
    set({
      session: null,
    });
  },
  startSession(input) {
    if (input.appliedEdits.length === 0) return;
    const { reverting, session, historyHandler } = get();
    if (reverting) {
      set({
        queuedSession: input,
      });
      return;
    }
    if (session?.requestId === input.requestId) return;
    if (session && historyHandler && !isDiffReviewSessionReady(session)) {
      set({
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
        set({
          session: null,
        });
      }
    }
    set({
      session: toSession(input),
      queuedSession: null,
    });
  },
  acceptHunk(id) {
    get().acceptHunks([id]);
  },
  acceptHunks(ids) {
    const { session, historyHandler } = get();
    if (!session || (historyHandler && !isDiffReviewSessionReady(session)))
      return;
    const acceptedIds = new Set(ids);
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
    if (after.hunks.every((hunk, index) => hunk === session.hunks[index]))
      return;
    if (
      historyHandler?.({
        kind: "accept",
        before: session,
        after,
      })
    )
      return;
    set({
      session: withResolvedCleanup(after),
    });
  },
  acceptAll() {
    const { session, historyHandler } = get();
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
    if (after.hunks.every((hunk, index) => hunk === session.hunks[index]))
      return;
    if (
      historyHandler?.({
        kind: "accept",
        before: session,
        after,
      })
    )
      return;
    set({
      session: withResolvedCleanup(after),
    });
  },
  async requestUndo(ids) {
    const { session, undoHandler, reverting, historyHandler } = get();
    if (
      !session ||
      !undoHandler ||
      reverting ||
      (historyHandler && !isDiffReviewSessionReady(session))
    )
      return;
    const targets = session.hunks.filter(
      (hunk) => hunk.status === "pending" && (!ids || ids.includes(hunk.id)),
    );
    if (targets.length === 0) return;
    const focusHunkId =
      ids?.length === 1 && targets.length === 1 && ids[0] === targets[0]?.id
        ? targets[0].id
        : void 0;
    set({
      reverting: true,
    });
    try {
      const { undoneIds, content } = await undoHandler(
        session.nodeId,
        targets,
      );
      const undone = new Set(undoneIds);
      const current = get().session;
      if (
        !current ||
        current.requestId !== session.requestId ||
        undone.size === 0
      )
        return;
      const after = {
        ...current,
        hunks: current.hunks.map((hunk) =>
          undone.has(hunk.id)
            ? {
                ...hunk,
                status: "undone",
              }
            : hunk,
        ),
      };
      const { historyHandler } = get();
      if (
        content !== void 0 &&
        historyHandler?.({
          kind: "revert",
          before: current,
          after,
          content,
          ...(focusHunkId
            ? {
                focusHunkId,
              }
            : {}),
        })
      )
        return;
      set({
        session: withResolvedCleanup(after),
      });
    } finally {
      set({
        reverting: false,
      });
      const queued = get().queuedSession;
      if (queued) {
        set({
          queuedSession: null,
        });
        get().startSession(queued);
      }
    }
  },
  clearSession() {
    set({
      session: null,
      reverting: false,
      queuedSession: null,
      pendingOpenNodeId: null,
      pendingScrollToFirstHunkNodeId: null,
      navigation: null,
    });
  },
}));
