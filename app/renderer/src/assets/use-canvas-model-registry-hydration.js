// use-canvas-model-registry-hydration.js
import {
  ApiError,
  reactExports,
  useStorage,
  useTranslation,
} from "../vendor.js";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { pickUserMessage } from "../generation/normalize-skill-detail-metadata.js";
import { PRESET_COLOR_NAME_KEYS } from "../infra/parse-connector-selection.js";

export function shallowEqualObject(prev, next2) {
  if (Object.is(prev, next2)) return true;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next2);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key2 of prevKeys) {
    if (!Object.hasOwn(next2, key2)) return false;
    if (!Object.is(prev[key2], next2[key2])) return false;
  }
  return true;
}

const nullStore = {
  getSnapshot: () => null,
  setSnapshot: () => {},
  subscribe: () => () => {},
};

export function useWorkspaceChatStoreSelector(
  store,
  selector2,
  isEqual2 = Object.is,
) {
  const previousSelectionRef = reactExports.useRef({
    hasValue: false,
    value: void 0,
  });
  const getSelectedSnapshot = reactExports.useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot;
    let memoizedSelection;
    return () => {
      const nextSnapshot = store.getSnapshot();
      if (hasMemo && Object.is(memoizedSnapshot, nextSnapshot)) {
        return memoizedSelection;
      }
      const nextSelection = selector2(nextSnapshot);
      const previousSelection = hasMemo
        ? memoizedSelection
        : previousSelectionRef.current.value;
      if (
        (hasMemo || previousSelectionRef.current.hasValue) &&
        isEqual2(previousSelection, nextSelection)
      ) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        memoizedSelection = previousSelection;
        return previousSelection;
      }
      hasMemo = true;
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };
  }, [store, selector2, isEqual2]);
  const selected2 = reactExports.useSyncExternalStore(
    store.subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
  reactExports.useEffect(() => {
    previousSelectionRef.current = {
      hasValue: true,
      value: selected2,
    };
  }, [selected2]);
  return selected2;
}

function useWorkspaceChatStoreOptionalSelector(store, selector2, isEqual2) {
  const effectiveStore = store ?? nullStore;
  return useWorkspaceChatStoreSelector(
    effectiveStore,
    (snapshot2) => (snapshot2 === null ? null : selector2(snapshot2)),
    (prev, next2) => {
      if (prev === null || next2 === null) return Object.is(prev, next2);
      return Object.is(prev, next2);
    },
  );
}

export const WorkspaceChatStoreContext = reactExports.createContext(null);

export const WorkspaceProductionPlanDisclosureStoreContext =
  reactExports.createContext(null);

export const PendingFirstMessageContext = reactExports.createContext(null);

export function usePendingFirstMessage() {
  return reactExports.useContext(PendingFirstMessageContext);
}

export function useWorkspaceChatOptional() {
  const store = reactExports.useContext(WorkspaceChatStoreContext);
  return useWorkspaceChatStoreOptionalSelector(store, (chat) => chat);
}

export function useWorkspaceChatSelector(selector2, isEqual2) {
  const store = reactExports.useContext(WorkspaceChatStoreContext);
  if (!store)
    throw new Error(
      "useWorkspaceChatSelector must be used within WorkspaceChatProvider",
    );
  return useWorkspaceChatStoreSelector(store, selector2, isEqual2);
}

export function useWorkspaceProductionPlanDisclosureStore() {
  const store = reactExports.useContext(
    WorkspaceProductionPlanDisclosureStoreContext,
  );
  if (!store) {
    throw new Error(
      "useWorkspaceProductionPlanDisclosureStore must be used within WorkspaceChatProvider",
    );
  }
  return store;
}

export function pickEditErrorMessage(err, fallback) {
  if (err instanceof ApiError && err.body) {
    try {
      const parsed = JSON.parse(err.body);
      const msg = pickUserMessage(parsed, "");
      if (msg) return stripErrorHtml(msg);
    } catch {}
  }
  return fallback;
}

export function useCanvasGenerationReconcile({ onCanvasTasksChange }) {
  return reactExports.useCallback(
    (tasks) => {
      onCanvasTasksChange?.(tasks);
    },
    [onCanvasTasksChange],
  );
}

export function useCanvasLastUsedModelParams() {
  const [snapshot2, , setAsync] = useStorage("workspace.lastUsedModelParams");
  const getLastUsedModelParams = reactExports.useCallback(
    (key2) => {
      const entry = snapshot2?.[key2];
      if (!entry || typeof entry.modelId !== "string" || !entry.modelId)
        return void 0;
      return {
        modelId: entry.modelId,
        params: entry.params ?? {},
      };
    },
    [snapshot2],
  );
  const saveLastUsedModelParams = reactExports.useCallback(
    (key2, modelId, params) => {
      if (!modelId) return;
      const next2 = {
        modelId,
        params: {
          ...params,
        },
        updatedAt: Date.now(),
      };
      void setAsync((prev) => ({
        ...(prev ?? {}),
        [key2]: next2,
      }));
    },
    [setAsync],
  );
  return {
    getLastUsedModelParams,
    saveLastUsedModelParams,
  };
}

export function useCanvasModelRegistryHydration({
  enabled,
  catalogScopeKey,
  modelRegistryStore,
  listImageModels,
  listVideoModels,
  fetchAudioModels,
}) {
  reactExports.useLayoutEffect(() => {
    modelRegistryStore.setState({
      image: [],
      video: [],
      audio: [],
    });
    if (!enabled) {
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      listImageModels(),
      listVideoModels(),
      fetchAudioModels(),
    ]).then(([imageResult, videoResult, audioResult]) => {
      if (cancelled) return;
      modelRegistryStore.setState({
        image: imageResult.status === "fulfilled" ? imageResult.value : [],
        video: videoResult.status === "fulfilled" ? videoResult.value : [],
        audio: audioResult.status === "fulfilled" ? audioResult.value : [],
      });
      const failures = [
        ["image", imageResult],
        ["video", videoResult],
        ["audio", audioResult],
      ].filter(([, result]) => result.status === "rejected");
      if (failures.length === 0) return;
      const detail = failures
        .map(([kind, result]) => {
          const reason = result.status === "rejected" ? result.reason : void 0;
          return `${kind}: ${reason instanceof Error ? reason.message : String(reason)}`;
        })
        .join("; ");
      const message2 = `[CanvasArea] partially failed to hydrate model registry: ${detail}`;
      window.hilo?.logger?.warn(message2, "http-client") ??
        console.warn(message2);
    });
    return () => {
      cancelled = true;
    };
  }, [
    catalogScopeKey,
    enabled,
    listImageModels,
    listVideoModels,
    fetchAudioModels,
    modelRegistryStore,
  ]);
}

export function selectDownloadableCanvasAssets(assets, canvasAssetIds) {
  const uniqueAssets = new Map();
  for (const asset of assets) {
    if (
      canvasAssetIds.has(asset.id) &&
      asset.status !== "missing" &&
      asset.path.length > 0 &&
      (asset.tagIds?.length ?? 0) > 0 &&
      !uniqueAssets.has(asset.id)
    ) {
      uniqueAssets.set(asset.id, asset);
    }
  }
  return [...uniqueAssets.values()];
}

export function useCanvasTagName() {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    (tag) => {
      if (tag.name?.trim()) return tag.name;
      const key2 = tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id];
      return key2 ? t2(key2) : tag.id;
    },
    [t2],
  );
}
