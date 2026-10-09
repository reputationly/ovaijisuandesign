// text-edit-session-binding-persister.js
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import {
  clearActiveTextEditSession,
  LOCAL_CACHE_KEY$1,
  mergeEntry,
  normalizeTextEditSessionRecord,
  sameTextEditSessionEntry,
  STORAGE_KEY$3,
  upsertTextEditSessionEntry,
} from "./handle-session-created-response.js";
import {
  cachedTextEditSessionBindings,
  readLocalCache$1,
} from "./use-model-defaults.js";

const CROSS_CONTEXT_WRITE_LOCK = "hilo:workspace-text-edit-sessions";

function writeLocalCache$1(record2) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY$1, JSON.stringify(record2));
  } catch {}
}

function getPlatformStorage$1() {
  try {
    return getElectronPlatform()?.storage;
  } catch {
    return void 0;
  }
}

async function withCrossContextStorageLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    let taskStarted = false;
    try {
      return await navigator.locks.request(
        CROSS_CONTEXT_WRITE_LOCK,
        async () => {
          taskStarted = true;
          return task();
        },
      );
    } catch (error) {
      if (taskStarted) throw error;
    }
  }
  return task();
}

let bindingWriteQueue = Promise.resolve();

export class TextEditSessionBindingPersister {
  async load(workspaceKey) {
    if (!workspaceKey) return {};
    await bindingWriteQueue.catch(() => void 0);
    return withCrossContextStorageLock(async () => {
      const storage = getPlatformStorage$1();
      if (storage) {
        try {
          const record2 = normalizeTextEditSessionRecord(
            await storage.globalGet(STORAGE_KEY$3),
          );
          writeLocalCache$1(record2);
          return record2[workspaceKey] ?? {};
        } catch {}
      }
      return cachedTextEditSessionBindings(workspaceKey);
    });
  }
  /**
   * Serialized read-modify-write against the authoritative record. The mutator
   * runs inside the cross-context lock and sees the freshest snapshot, so a
   * sibling window's concurrent write can never be clobbered. Returning null
   * deletes the node's record entirely.
   */
  mutate(workspaceKey, nodeId, mutator) {
    if (!workspaceKey || !nodeId) return Promise.resolve();
    bindingWriteQueue = bindingWriteQueue
      .catch(() => {})
      .then(() =>
        withCrossContextStorageLock(async () => {
          const storage = getPlatformStorage$1();
          let record2 = readLocalCache$1();
          if (storage) {
            try {
              record2 = normalizeTextEditSessionRecord(
                await storage.globalGet(STORAGE_KEY$3),
              );
            } catch {}
          }
          const nextBinding = mutator(record2[workspaceKey]?.[nodeId]);
          const workspaceBindings = {
            ...(record2[workspaceKey] ?? {}),
          };
          if (nextBinding) workspaceBindings[nodeId] = nextBinding;
          else delete workspaceBindings[nodeId];
          const next2 = {
            ...record2,
            [workspaceKey]: workspaceBindings,
          };
          writeLocalCache$1(next2);
          if (storage) await storage.globalSet(STORAGE_KEY$3, next2);
        }),
      );
    return bindingWriteQueue;
  }
  upsert(workspaceKey, nodeId, patch2) {
    if (
      !workspaceKey ||
      !nodeId ||
      (!patch2.uiSessionId && !patch2.runtimeSessionId)
    ) {
      return Promise.resolve();
    }
    return this.mutate(workspaceKey, nodeId, (current2) => {
      const entry = {
        ...(patch2.uiSessionId
          ? {
              uiSessionId: patch2.uiSessionId,
            }
          : {}),
        ...(patch2.runtimeSessionId
          ? {
              runtimeSessionId: patch2.runtimeSessionId,
            }
          : {}),
        updatedAt: patch2.updatedAt ?? Date.now(),
      };
      const mergeable =
        current2 !== void 0 &&
        (sameTextEditSessionEntry(current2, entry) ||
          (Boolean(entry.runtimeSessionId) &&
            !current2.runtimeSessionId &&
            (!entry.uiSessionId ||
              entry.uiSessionId === current2.uiSessionId)) ||
          (Boolean(entry.uiSessionId) &&
            !current2.uiSessionId &&
            (!entry.runtimeSessionId ||
              entry.runtimeSessionId === current2.runtimeSessionId)));
      const activeEntry =
        mergeable && current2 ? mergeEntry(current2, entry) : entry;
      return upsertTextEditSessionEntry(current2, activeEntry, {
        active: patch2.active !== false,
      });
    });
  }
  /** Keep the node's history but stop resuming its last conversation. */
  clearActive(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, (current2) =>
      current2 ? clearActiveTextEditSession(current2, Date.now()) : null,
    );
  }
  /** The canvas text node is gone — drop its whole private history. */
  remove(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, () => null);
  }
}
