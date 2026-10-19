// 工作区存储的读写留在应用里，默认值从 from-vendor 读，不和平台垫片并文件。
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import reactExports from "react";
import { WORKSPACE_STORAGE_DEFAULTS, storageKeys, writeLocalCache$2, localCacheKey, readLocalCache$2, toStorageQueryData, resolveStorageQueryData, removeLocalCache, enqueueStorageWrite, isUndefinedStorageValue } from "./storage-cache.js";
import { getRendererGlobalDefaults } from "./runtime-config.js";
import { usePlatform } from "./platform-context.js";
import { useCurrentWorkspace } from "./shared-runtime.js";

function isPlainObject$1(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}
function resolveUpdater(updater, prev) {
  const next2 = typeof updater === "function" ? updater(prev) : updater;
  if (isPlainObject$1(next2) && isPlainObject$1(prev)) {
    return {
      ...prev,
      ...next2
    };
  }
  return next2;
}
function getDefault(key2) {
  const [scope, field] = key2.split(".");
  if (scope === "workspace") {
    return WORKSPACE_STORAGE_DEFAULTS[field];
  }
  return getRendererGlobalDefaults()[field];
}
export function useStorage(key2, options = {}) {
  const enabled = options.enabled ?? true;
  const [scope, field] = key2.split(".");
  const isGlobal = scope === "global";
  const defaultValue2 = getDefault(key2);
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const hasStorage = !!platform2.storage;
  reactExports.useEffect(() => {
    if (!enabled || key2 !== "global.config") return;
    return platform2.storage?.onGlobalConfigChanged?.(patch2 => {
      const next2 = queryClient2.setQueryData(storageKeys.global("config"), prev => ({
        ...getRendererGlobalDefaults().config,
        ...prev,
        ...patch2
      }));
      writeLocalCache$2("global.config", next2);
    });
  }, [enabled, key2, platform2.storage, queryClient2]);
  const workspaceDir = useCurrentWorkspace();
  const cacheKey = localCacheKey(scope, field, workspaceDir);
  const placeholder = reactExports.useMemo(() => enabled ? readLocalCache$2(cacheKey) : void 0, [cacheKey, enabled]);
  const queryKey = isGlobal ? storageKeys.global(field) : storageKeys.workspace(workspaceDir, field);
  const {
    data: rawData,
    isFetched
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!platform2.storage) throw new Error("storage unavailable");
      const value2 = isGlobal ? await platform2.storage.globalGet(field) : await platform2.storage.workspaceGet(workspaceDir, field);
      return toStorageQueryData(value2, defaultValue2);
    },
    enabled: enabled && (isGlobal ? hasStorage : !!workspaceDir && hasStorage),
    staleTime: Number.POSITIVE_INFINITY
  });
  const persistedData = resolveStorageQueryData(rawData);
  const isHydrated = enabled && isFetched;
  const data2 = enabled ? isHydrated ? persistedData ?? defaultValue2 : persistedData ?? placeholder ?? defaultValue2 : defaultValue2;
  reactExports.useEffect(() => {
    if (!enabled || !isHydrated) return;
    if (persistedData === void 0 && defaultValue2 === void 0) {
      removeLocalCache(cacheKey);
      return;
    }
    writeLocalCache$2(cacheKey, persistedData ?? defaultValue2);
  }, [cacheKey, defaultValue2, enabled, isHydrated, persistedData]);
  const {
    mutateAsync
  } = useMutation({
    mutationFn: async ({
      field: f2,
      value: value2,
      global: global2,
      directory
    }) => {
      if (!platform2.storage) return;
      if (global2) {
        await platform2.storage.globalSet(f2, value2);
      } else {
        await platform2.storage.workspaceSet(directory, f2, value2);
      }
    }
  });
  const value = data2;
  const requestSeqRef = reactExports.useRef(0);
  const setValueAsync = reactExports.useCallback(async updater => {
    if (!enabled) return false;
    const dir = workspaceDir;
    const global2 = isGlobal;
    if (!global2 && !dir) return false;
    const qk = global2 ? storageKeys.global(field) : storageKeys.workspace(dir, field);
    const activeCacheKey = localCacheKey(global2 ? "global" : "workspace", field, dir);
    return enqueueStorageWrite(activeCacheKey, async () => {
      await queryClient2.cancelQueries({
        queryKey: qk
      });
      const cached = queryClient2.getQueryData(qk);
      const queryState = queryClient2.getQueryState(qk);
      const localCached = readLocalCache$2(activeCacheKey);
      const hasHydratedCache = queryState?.status === "success";
      const resolvedCached = resolveStorageQueryData(cached);
      const current2 = hasHydratedCache ? resolvedCached ?? defaultValue2 : localCached ?? defaultValue2;
      const restoreQueryData = hasHydratedCache ? cached ?? toStorageQueryData(current2, defaultValue2) : toStorageQueryData(current2, defaultValue2);
      const shouldRestoreLocalCache = hasHydratedCache ? !isUndefinedStorageValue(restoreQueryData) : localCached !== void 0;
      const next2 = resolveUpdater(updater, current2);
      const requestId = (requestSeqRef.current ?? 0) + 1;
      requestSeqRef.current = requestId;
      queryClient2.setQueryData(qk, toStorageQueryData(next2, defaultValue2));
      if (next2 === void 0) {
        removeLocalCache(activeCacheKey);
      } else {
        writeLocalCache$2(activeCacheKey, next2);
      }
      try {
        await mutateAsync({
          field,
          value: next2,
          global: global2,
          directory: dir
        });
        return true;
      } catch (error) {
        console.error(`[useStorage] Failed to persist ${field}:`, error);
        if (requestSeqRef.current === requestId) {
          queryClient2.setQueryData(qk, restoreQueryData);
          if (shouldRestoreLocalCache) {
            writeLocalCache$2(activeCacheKey, current2);
          } else {
            removeLocalCache(activeCacheKey);
          }
        }
        return false;
      }
    });
  }, [defaultValue2, enabled, field, isGlobal, mutateAsync, queryClient2, workspaceDir]);
  const setValue = reactExports.useCallback(updater => {
    void setValueAsync(updater).catch(error => {
      console.error(`[useStorage] Unexpected async setter error for ${field}:`, error);
    });
  }, [setValueAsync, field]);
  return [value, setValue, setValueAsync, isHydrated];
}
