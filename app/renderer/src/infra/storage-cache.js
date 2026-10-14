// 本地缓存和存储默认值跟页面读写走，不跟库放一起。


export const WORKSPACE_STORAGE_VERSION = 10;
export const WORKSPACE_STORAGE_DEFAULTS = {
  _version: WORKSPACE_STORAGE_VERSION,
  preferences: {
    loadUserMemory: true
  },
  recentFiles: [],
  assetPanel: {
    typeFilters: [],
    dateFilter: {
      kind: "all"
    },
    sortOrder: "desc"
  },
  lastUsedModelParams: {},
  pinnedSessionIds: [],
  hiddenSessionIds: [],
  capabilityCardSelections: {}
};
export const storageKeys = {
  workspaceAll: dir => ["storage", "workspace", dir],
  workspace: (dir, field) => ["storage", "workspace", dir, field],
  globalAll: () => ["storage", "global"],
  global: field => ["storage", "global", field]
};
export const storageWriteQueues = /* @__PURE__ */new Map();
export function enqueueStorageWrite(key, task) {
  const previous = storageWriteQueues.get(key) ?? Promise.resolve();
  const run = previous.catch(() => void 0).then(task);
  const tail = run.then(() => void 0, () => void 0);
  storageWriteQueues.set(key, tail);
  void tail.then(() => {
    if (storageWriteQueues.get(key) === tail) storageWriteQueues.delete(key);
  });
  return run;
}
export const LS_PREFIX = "hilo:storage:";
export const UNDEFINED_STORAGE_VALUE = Symbol("hilo.storage.undefined");
export function isUndefinedStorageValue(value) {
  return value === UNDEFINED_STORAGE_VALUE;
}
export function toStorageQueryData(value, defaultValue) {
  if (value !== void 0) return value;
  return defaultValue === void 0 ? UNDEFINED_STORAGE_VALUE : defaultValue;
}
export function resolveStorageQueryData(value) {
  return isUndefinedStorageValue(value) ? void 0 : value;
}
export function localCacheKey(scope, field, workspaceDir) {
  return scope === "global" ? `global.${field}` : `workspace.${workspaceDir}.${field}`;
}
export function readLocalCache$2(key) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    return raw != null ? JSON.parse(raw) : void 0;
  } catch {
    return void 0;
  }
}
export function writeLocalCache$2(key, value) {
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`[useStorage] Failed to write localStorage cache for "${key}":`, err);
  }
}
export function removeLocalCache(key) {
  try {
    localStorage.removeItem(`${LS_PREFIX}${key}`);
  } catch (err) {
    console.warn(`[useStorage] Failed to remove localStorage cache for "${key}":`, err);
  }
}
