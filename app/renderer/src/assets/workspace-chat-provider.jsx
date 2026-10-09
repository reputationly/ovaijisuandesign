// workspace-chat-provider.jsx
import {
  CurrentWorkspaceContext,
  reactExports,
  useStorage,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PendingFirstMessageContext,
  shallowEqualObject,
  WorkspaceChatStoreContext,
  WorkspaceProductionPlanDisclosureStoreContext,
} from "./use-canvas-model-registry-hydration.js";
import { WorkspaceRemoteToolContext } from "../canvas/resolve-workspace-failure-diagnosis.js";
import {
  useAgentModePreference,
  useSessionStore,
} from "../workspace/resolve-retry-message-payload.jsx";
import {
  clearActiveChatSnapshot,
  setActiveChatSnapshot,
} from "../chat/attach-handoff-targets-to-sub-messages.js";
import { useChat } from "../chat/use-chat.js";

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
  const [modelConfig, , setModelConfigAsync, modelDefaultsHydrated] =
    useStorage("global.config");
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
      <PendingFirstMessageContext.Provider
        value={initialMessage?.trim() || null}
      >
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
