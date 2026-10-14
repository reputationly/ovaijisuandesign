// text-edit-session-binding-persister.js
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import {
  clearActiveTextEditSession,
  LOCAL_CACHE_KEY,
  mergeEntry,
  normalizeTextEditSessionRecord,
  sameTextEditSessionEntry,
  STORAGE_KEY,
  upsertTextEditSessionEntry,
} from "./handle-session-created-response.js";
import {
  cachedTextEditSessionBindings,
  readLocalCache,
} from "./use-model-defaults.js";
const CROSS_CONTEXT_WRITE_LOCK = "hilo:workspace-text-edit-sessions";
function writeLocalCache(record) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(record));
  } catch {}
}
function getPlatformStorage() {
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
      const storage = getPlatformStorage();
      if (storage) {
        try {
          const record = normalizeTextEditSessionRecord(
            await storage.globalGet(STORAGE_KEY),
          );
          writeLocalCache(record);
          return record[workspaceKey] ?? {};
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
          const storage = getPlatformStorage();
          let record = readLocalCache();
          if (storage) {
            try {
              record = normalizeTextEditSessionRecord(
                await storage.globalGet(STORAGE_KEY),
              );
            } catch {}
          }
          const nextBinding = mutator(record[workspaceKey]?.[nodeId]);
          const workspaceBindings = {
            ...(record[workspaceKey] ?? {}),
          };
          if (nextBinding) workspaceBindings[nodeId] = nextBinding;
          else delete workspaceBindings[nodeId];
          const next = {
            ...record,
            [workspaceKey]: workspaceBindings,
          };
          writeLocalCache(next);
          if (storage) await storage.globalSet(STORAGE_KEY, next);
        }),
      );
    return bindingWriteQueue;
  }
  upsert(workspaceKey, nodeId, patch) {
    if (
      !workspaceKey ||
      !nodeId ||
      (!patch.uiSessionId && !patch.runtimeSessionId)
    ) {
      return Promise.resolve();
    }
    return this.mutate(workspaceKey, nodeId, (current) => {
      const entry = {
        ...(patch.uiSessionId
          ? {
              uiSessionId: patch.uiSessionId,
            }
          : {}),
        ...(patch.runtimeSessionId
          ? {
              runtimeSessionId: patch.runtimeSessionId,
            }
          : {}),
        updatedAt: patch.updatedAt ?? Date.now(),
      };
      const mergeable =
        current !== void 0 &&
        (sameTextEditSessionEntry(current, entry) ||
          (Boolean(entry.runtimeSessionId) &&
            !current.runtimeSessionId &&
            (!entry.uiSessionId ||
              entry.uiSessionId === current.uiSessionId)) ||
          (Boolean(entry.uiSessionId) &&
            !current.uiSessionId &&
            (!entry.runtimeSessionId ||
              entry.runtimeSessionId === current.runtimeSessionId)));
      const activeEntry =
        mergeable && current ? mergeEntry(current, entry) : entry;
      return upsertTextEditSessionEntry(current, activeEntry, {
        active: patch.active !== false,
      });
    });
  }
  /** Keep the node's history but stop resuming its last conversation. */
  clearActive(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, (current) =>
      current ? clearActiveTextEditSession(current, Date.now()) : null,
    );
  }
  /** The canvas text node is gone — drop its whole private history. */
  remove(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, () => null);
  }
}
