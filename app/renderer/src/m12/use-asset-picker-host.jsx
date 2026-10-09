// use-asset-picker-host.jsx
import { reactExports, useTranslation, useStorage, CurrentWorkspaceContext, ApiError } from "../vendor.js";
import { stripErrorHtml } from "../m15/create-recently-added-store.jsx";
import { pickUserMessage } from "../m15/push-inline.js";
import { WorkspaceRemoteToolContext } from "../m15/use-canvas-tag-filter.js";
import {
  useSessionStore,
  useAgentModePreference,
} from "../m11/use-workspace-canvas-persistence.jsx";
import { setActiveChatSnapshot, clearActiveChatSnapshot } from "../m08/part-store.jsx";
import { useAssetSourcePicker } from "../m11/image-annotation-dialog.jsx";
import { isAbsoluteLocalFilePath } from "../m10/use-media-actions.jsx";
import { joinFilePath } from "../m11/use-asset-menu-shortcuts.js";
import { getFileName$1 } from "../m10/delete-local-node-dialog.jsx";
import { PRESET_COLOR_NAME_KEYS } from "../m01/normalize-tag-registry.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useChat } from "./use-chat.js";
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
function createWorkspaceChatStore(initialSnapshot, isEqual2 = Object.is) {
  let snapshot2 = initialSnapshot;
  const listeners2 = new Set();
  return {
    getSnapshot: () => snapshot2,
    setSnapshot: (next2) => {
      if (isEqual2(snapshot2, next2)) return;
      snapshot2 = next2;
      for (const listener of listeners2) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
  };
}
export function useWorkspaceChatStoreSelector(store, selector2, isEqual2 = Object.is) {
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
      const previousSelection = hasMemo ? memoizedSelection : previousSelectionRef.current.value;
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
const WorkspaceChatStoreContext = reactExports.createContext(null);
const WorkspaceProductionPlanDisclosureStoreContext = reactExports.createContext(null);
const PendingFirstMessageContext = reactExports.createContext(null);
export function WorkspaceChatProvider({
  children: children2,
  folderPath,
  initialMessage,
  initialAttachments,
  initialAttachmentRefs,
  initialPayloadId,
  initialEntityRefs,
  initialPayloadReady = true,
  initialModelId,
  initialSelectedMediaModels,
  onInitialMessageSent,
  isActive: isActive2 = true,
}) {
  const sessionStore = useSessionStore();
  const [agentModePreference] = useAgentModePreference();
  const [modelConfig, , setModelConfigAsync, modelDefaultsHydrated] = useStorage("global.config");
  const handleRememberDefaults = reactExports.useCallback(
    (selection2) =>
      setModelConfigAsync({
        ...(selection2.modelId !== void 0
          ? {
              homeAgentModelId: selection2.modelId,
            }
          : {}),
        ...(selection2.media !== void 0
          ? {
              homeSelectedMediaModels: selection2.media,
            }
          : {}),
      }),
    [setModelConfigAsync],
  );
  const workspace = folderPath || "";
  const chat = useChat(
    sessionStore,
    workspace,
    initialMessage,
    initialAttachments,
    onInitialMessageSent,
    initialSelectedMediaModels,
    {
      initialModelId,
      defaultModelId: modelConfig.homeAgentModelId,
      defaultSelectedMediaModels: modelConfig.homeSelectedMediaModels,
      modelDefaultsHydrated,
      onRememberDefaults: handleRememberDefaults,
      isActive: isActive2,
      initialPayloadReady,
      initialPayloadId,
      initialEntityRefs,
      agentMode: agentModePreference,
    },
  );
  const chatStore = reactExports.useMemo(
    () => createWorkspaceChatStore(chat, shallowEqualObject),
    [],
  );
  const productionPlanDisclosureStore = reactExports.useMemo(
    () => createWorkspaceChatStore(new Map()),
    [],
  );
  reactExports.useLayoutEffect(() => {
    chatStore.setSnapshot(chat);
  }, [chatStore, chat]);
  const remoteTool = reactExports.useMemo(
    () => ({
      pendingRemoteToolRequest: chat.pendingRemoteToolRequest,
      openPendingRemoteTool: chat.openPendingRemoteTool,
      clearPendingRemoteToolRequest: chat.clearPendingRemoteToolRequest,
      remoteToolRequest: chat.remoteToolRequest,
      remoteToolDialogSessionId: chat.remoteToolDialogSessionId,
      clearRemoteToolRequest: chat.clearRemoteToolRequest,
      lastSkillGuiEvent: chat.lastSkillGuiEvent,
      sendSkillGuiEvent: chat.sendSkillGuiEvent,
    }),
    [
      chat.pendingRemoteToolRequest,
      chat.openPendingRemoteTool,
      chat.clearPendingRemoteToolRequest,
      chat.remoteToolRequest,
      chat.remoteToolDialogSessionId,
      chat.clearRemoteToolRequest,
      chat.lastSkillGuiEvent,
      chat.sendSkillGuiEvent,
    ],
  );
  reactExports.useEffect(() => {
    if (!isActive2) return;
    setActiveChatSnapshot({
      workspaceDir: workspace,
      controller: chat.controller,
      focusedSessionId: chat.focusedSessionId,
    });
    return () => {
      clearActiveChatSnapshot(chat.controller);
    };
  }, [isActive2, workspace, chat.controller, chat.focusedSessionId]);
  return (
    <CurrentWorkspaceContext.Provider value={workspace}>
      <PendingFirstMessageContext.Provider value={initialMessage?.trim() || null}>
        <WorkspaceChatStoreContext.Provider value={chatStore}>
          <WorkspaceProductionPlanDisclosureStoreContext.Provider
            value={productionPlanDisclosureStore}
          >
            <WorkspaceRemoteToolContext.Provider value={remoteTool}>
              {children2}
            </WorkspaceRemoteToolContext.Provider>
          </WorkspaceProductionPlanDisclosureStoreContext.Provider>
        </WorkspaceChatStoreContext.Provider>
      </PendingFirstMessageContext.Provider>
    </CurrentWorkspaceContext.Provider>
  );
}
export function usePendingFirstMessage() {
  return reactExports.useContext(PendingFirstMessageContext);
}
export function useWorkspaceChatOptional() {
  const store = reactExports.useContext(WorkspaceChatStoreContext);
  return useWorkspaceChatStoreOptionalSelector(store, (chat) => chat);
}
export function useWorkspaceChatSelector(selector2, isEqual2) {
  const store = reactExports.useContext(WorkspaceChatStoreContext);
  if (!store) throw new Error("useWorkspaceChatSelector must be used within WorkspaceChatProvider");
  return useWorkspaceChatStoreSelector(store, selector2, isEqual2);
}
export function useWorkspaceProductionPlanDisclosureStore() {
  const store = reactExports.useContext(WorkspaceProductionPlanDisclosureStoreContext);
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
export function useAssetPickerHost({ isActive: isActive2, isPresented }) {
  const [pickerRequest, setPickerRequest] = reactExports.useState(null);
  const pickerBusyRef = reactExports.useRef(false);
  const activeRequestRef = reactExports.useRef(null);
  const sharedPicker = useAssetSourcePicker();
  const handlePluginPickAsset = reactExports.useCallback(
    (opts, ctx, source) =>
      new Promise((resolve, reject) => {
        if (pickerBusyRef.current) {
          const error = new Error("hub: picker_busy — another pickAsset() is already in progress");
          error.code = "picker_busy";
          reject(error);
          return;
        }
        pickerBusyRef.current = true;
        const request = {
          opts,
          source,
          ctx,
          openedAt: performance.now(),
          resolve: (value) => {
            if (activeRequestRef.current !== request) return;
            activeRequestRef.current = null;
            pickerBusyRef.current = false;
            setPickerRequest(null);
            resolve(value);
          },
        };
        activeRequestRef.current = request;
        setPickerRequest(request);
      }),
    [],
  );
  const handleCanvasPickAsset = reactExports.useCallback(
    (opts, source) =>
      handlePluginPickAsset(
        opts,
        {
          callerNodeId: "",
          upstreamAssetIds: [],
        },
        source
          ? {
              ...source,
              preferredSide: "top",
            }
          : void 0,
      ),
    [handlePluginPickAsset],
  );
  reactExports.useEffect(() => {
    if (!sharedPicker || !isActive2) return;
    const pick = (opts, source) =>
      handlePluginPickAsset(
        opts,
        {
          callerNodeId: "",
          upstreamAssetIds: [],
        },
        source,
      );
    sharedPicker.current = pick;
    return () => {
      if (sharedPicker.current === pick) sharedPicker.current = null;
    };
  }, [sharedPicker, isActive2, handlePluginPickAsset]);
  reactExports.useEffect(() => {
    if (!isActive2) activeRequestRef.current?.resolve(null);
    return () => activeRequestRef.current?.resolve(null);
  }, [isActive2]);
  reactExports.useEffect(() => {
    if (!window.__TEST_DRIVER_IPC__) return;
    const handleOpenAssetPickerPerfFixture = () => {
      if (!isActive2 || !isPresented) return;
      void handleCanvasPickAsset({
        type: "image",
        tabs: ["canvas"],
      }).catch(() => void 0);
    };
    window.addEventListener("hilo:test:open-asset-picker", handleOpenAssetPickerPerfFixture);
    return () =>
      window.removeEventListener("hilo:test:open-asset-picker", handleOpenAssetPickerPerfFixture);
  }, [handleCanvasPickAsset, isActive2, isPresented]);
  return {
    pickerRequest,
    handlePluginPickAsset,
    handleCanvasPickAsset,
  };
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
      if (!entry || typeof entry.modelId !== "string" || !entry.modelId) return void 0;
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
    Promise.allSettled([listImageModels(), listVideoModels(), fetchAudioModels()]).then(
      ([imageResult, videoResult, audioResult]) => {
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
        window.hilo?.logger?.warn(message2, "http-client") ?? console.warn(message2);
      },
    );
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
function resolveAssetSourcePath(workspaceRoot, filePath) {
  return isAbsoluteLocalFilePath(filePath) ? filePath : joinFilePath(workspaceRoot, filePath);
}
function selectDownloadableCanvasAssets(assets, canvasAssetIds) {
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
export function summarizeCanvasTagDownloads(assets, canvasAssetIds, tags2) {
  const knownTagIds = new Set(tags2.map(({ id: id2 }) => id2));
  const assetCountsByTag = new Map();
  let taggedAssetCount = 0;
  for (const asset of selectDownloadableCanvasAssets(assets, canvasAssetIds)) {
    let hasKnownTag = false;
    for (const tagId of asset.tagIds ?? []) {
      if (!knownTagIds.has(tagId)) continue;
      hasKnownTag = true;
      assetCountsByTag.set(tagId, (assetCountsByTag.get(tagId) ?? 0) + 1);
    }
    if (hasKnownTag) taggedAssetCount++;
  }
  return {
    assetCountsByTag,
    taggedAssetCount,
  };
}
export function buildSingleTagDownloadPlan(options, tagId) {
  const assets = selectDownloadableCanvasAssets(options.assets, options.canvasAssetIds).filter(
    (asset) => asset.tagIds?.includes(tagId),
  );
  return {
    assetCount: assets.length,
    files: assets.map((asset) => ({
      filePath: resolveAssetSourcePath(options.workspaceRoot, asset.path),
      fileName: getFileName$1(asset.path),
    })),
  };
}
export function buildAllTaggedDownloadPlan(options) {
  const assets = selectDownloadableCanvasAssets(options.assets, options.canvasAssetIds);
  const assetsByTag = new Map();
  for (const asset of assets) {
    for (const tagId of asset.tagIds ?? []) {
      const taggedAssets = assetsByTag.get(tagId);
      if (taggedAssets) taggedAssets.push(asset);
      else assetsByTag.set(tagId, [asset]);
    }
  }
  const files = [];
  for (const tag of options.tags) {
    const folderName = options.resolveTagName(tag);
    for (const asset of assetsByTag.get(tag.id) ?? []) {
      files.push({
        filePath: resolveAssetSourcePath(options.workspaceRoot, asset.path),
        fileName: getFileName$1(asset.path),
        folderName,
      });
    }
  }
  const includedAssetIds = new Set(
    options.tags.flatMap((tag) => (assetsByTag.get(tag.id) ?? []).map((asset) => asset.id)),
  );
  return {
    assetCount: includedAssetIds.size,
    files,
  };
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
