export function createSubjectMaterialDraftInbox() {
  const pending2 = new Map();
  const listeners2 = new Set();
  const delivering = new Set();
  return {
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    enqueue(draft) {
      if (!draft.isCurrent()) return;
      pending2.set(draft.key, draft);
      for (const listener of [...listeners2]) listener();
    },
    has(workspaceId) {
      return [...pending2.values()].some((draft) => draft.workspaceId === workspaceId && draft.isCurrent());
    },
    release(owner) {
      for (const [key2, draft] of pending2) if (draft.owner === owner) pending2.delete(key2);
    },
    async deliver(workspaceId, sessionId, accept, failed) {
      for (const [key2, draft] of pending2) {
        if (!draft.isCurrent()) {
          pending2.delete(key2);
          continue;
        }
        if (draft.workspaceId !== workspaceId || draft.sessionId !== sessionId) continue;
        if (delivering.has(key2)) continue;
        delivering.add(key2);
        try {
          const valid2 = await draft.validate();
          if (pending2.get(key2) !== draft) continue;
          if (!valid2) {
            pending2.delete(key2);
            if (draft.isCurrent()) failed?.(draft, false);
            continue;
          }
          if (pending2.get(key2) === draft && draft.isCurrent() && accept(draft)) pending2.delete(key2);
        } catch {
          if (pending2.get(key2) === draft && draft.isCurrent()) failed?.(draft, true);
        } finally {
          delivering.delete(key2);
          if (pending2.has(key2) && pending2.get(key2) !== draft) for (const listener of [...listeners2]) listener();
        }
      }
    },
  };
}

export const subjectMaterialDrafts = createSubjectMaterialDraftInbox();
