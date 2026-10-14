// session-tabs-persister.js

const STORAGE_KEY = "workspaceSessionTabs";
const LOCAL_CACHE_KEY = `hilo:storage:global.${STORAGE_KEY}`;
const MAX_WORKSPACE_RECORDS = 100;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniqueStrings(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item))
      continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}
function normalizeTabsState(value) {
  if (!isRecord(value)) return null;
  const openedTabIds = uniqueStrings(value.openedTabIds);
  const rawFocused = value.focusedSessionId;
  const focusedSessionId =
    typeof rawFocused === "string" && openedTabIds.includes(rawFocused)
      ? rawFocused
      : null;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : 0;
  return {
    openedTabIds,
    focusedSessionId,
    updatedAt,
  };
}
function normalizeTabsRecord(value) {
  if (!isRecord(value)) return {};
  const result = {};
  for (const [workspaceKey, rawState] of Object.entries(value)) {
    if (!workspaceKey) continue;
    const state = normalizeTabsState(rawState);
    if (state) result[workspaceKey] = state;
  }
  return result;
}
function pruneTabsRecord(value) {
  const entries = Object.entries(value).sort(
    (leftEntry, rightEntry) => rightEntry[1].updatedAt - leftEntry[1].updatedAt,
  );
  return Object.fromEntries(entries.slice(0, MAX_WORKSPACE_RECORDS));
}
function readLocalCache() {
  if (typeof localStorage === "undefined") return {};
  try {
    return normalizeTabsRecord(
      JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? "{}"),
    );
  } catch {
    return {};
  }
}
function writeLocalCache(value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(value));
  } catch {}
}
export class SessionTabsPersister {
  constructor(getStorage) {
    this.getStorage = getStorage;
  }
  queue = Promise.resolve();
  /** Read the saved tab state for a workspace. */
  async load(workspaceKey) {
    if (!workspaceKey) return null;
    const storage = this.getStorage();
    if (storage) {
      try {
        const record = normalizeTabsRecord(
          await storage.globalGet(STORAGE_KEY),
        );
        writeLocalCache(record);
        return record[workspaceKey] ?? null;
      } catch {}
    }
    return readLocalCache()[workspaceKey] ?? null;
  }
  /** Enqueue a persist operation (serial, non-blocking). */
  persist(workspaceKey, snapshot) {
    if (!workspaceKey) return Promise.resolve();
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        const storage = this.getStorage();
        let current = readLocalCache();
        if (storage) {
          try {
            current = normalizeTabsRecord(
              await storage.globalGet(STORAGE_KEY),
            );
          } catch {}
        }
        const next = pruneTabsRecord({
          ...current,
          [workspaceKey]: {
            openedTabIds: [...snapshot.openedTabIds],
            focusedSessionId: snapshot.focusedSessionId,
            updatedAt: Date.now(),
          },
        });
        writeLocalCache(next);
        if (storage) await storage.globalSet(STORAGE_KEY, next);
      });
    return this.queue;
  }
  /**
   * Remove a workspace's tab state (e.g. when user deletes the workspace
   * from recents). Best-effort: if IPC fails, the entry will eventually be
   * pruned by {@link MAX_WORKSPACE_RECORDS}.
   */
  async remove(workspaceKey) {
    if (!workspaceKey) return;
    const storage = this.getStorage();
    let current = readLocalCache();
    if (storage) {
      try {
        current = normalizeTabsRecord(await storage.globalGet(STORAGE_KEY));
      } catch {}
    }
    if (!(workspaceKey in current)) return;
    const { [workspaceKey]: removedWorkspaceState, ...rest } = current;
    writeLocalCache(rest);
    if (storage) {
      try {
        await storage.globalSet(STORAGE_KEY, rest);
      } catch {}
    }
  }
}
