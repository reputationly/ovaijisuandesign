// use-chat-model-selection.js
import reactExports from "react";
import { useModelDefaults } from "./use-model-defaults.js";
import { resolveActiveModelId } from "../generation/use-model-catalog-scope-key.js";
import { useActiveCustomModel } from "../team/copy-icon-button.jsx";

export function useChatModelSelection({
  sessionStore,
  send,
  initialModelId,
  initialSelectedMediaModels,
  defaultModelId,
  defaultSelectedMediaModels,
  modelDefaultsHydrated,
  onRememberDefaults,
  pendingCreatePayloadRef,
}) {
  const {
    defaultModelId: effectiveDefaultModelId,
    defaultSelectedMediaModels: effectiveDefaultSelectedMediaModels,
    rememberDefaults,
    getDefaultModelId,
    getDefaultSelectedMediaModels,
  } = useModelDefaults({
    defaultModelId,
    defaultSelectedMediaModels,
    onRememberDefaults,
  });
  const activeCustomModel = useActiveCustomModel();
  const editedRef = reactExports.useRef({
    model: false,
    media: false,
  });
  const [selectedModelId, setSelectedModelId] = reactExports.useState(() => {
    const focused = sessionStore.getFocusedSession();
    return (
      initialModelId ??
      (focused ? (focused.modelId ?? null) : (defaultModelId ?? null))
    );
  });
  const selectedModelIdRef = reactExports.useRef(selectedModelId);
  const effectiveSelectedModelId = resolveActiveModelId(
    selectedModelId,
    activeCustomModel.data,
  );
  selectedModelIdRef.current = effectiveSelectedModelId;
  const [selectedMediaModels, setSelectedMediaModels] = reactExports.useState(
    () => {
      const focused = sessionStore.getFocusedSession();
      return (
        initialSelectedMediaModels ??
        (focused ? focused.selectedMediaModels : defaultSelectedMediaModels)
      );
    },
  );
  const selectedMediaModelsRef = reactExports.useRef(selectedMediaModels);
  selectedMediaModelsRef.current = selectedMediaModels;
  const syncSelectedModelId = reactExports.useCallback((modelId) => {
    selectedModelIdRef.current = modelId;
    setSelectedModelId(modelId);
  }, []);
  const syncSelectedMediaModels = reactExports.useCallback((models) => {
    selectedMediaModelsRef.current = models;
    setSelectedMediaModels(models);
  }, []);
  const getSelectedModelId = reactExports.useCallback(
    () =>
      resolveActiveModelId(selectedModelIdRef.current, activeCustomModel.data),
    [activeCustomModel.data],
  );
  const getSelectedMediaModels = reactExports.useCallback(
    () => selectedMediaModelsRef.current,
    [],
  );
  const handleModelChange = reactExports.useCallback(
    (modelId) => {
      editedRef.current.model = true;
      syncSelectedModelId(modelId);
      const sessionId = sessionStore.getState().focusedSessionId;
      if (sessionId) {
        sessionStore.updateModelId(sessionId, modelId);
        send({
          type: "update_model",
          model_id: modelId,
          session_id: sessionId,
        });
      }
    },
    [send, sessionStore, syncSelectedModelId],
  );
  const handleSelectedMediaModelsChange = reactExports.useCallback(
    (next) => {
      editedRef.current.media = true;
      syncSelectedMediaModels(next);
      const sessionId = sessionStore.getState().focusedSessionId;
      if (sessionId) {
        sessionStore.setSelectedMediaModels(sessionId, next);
        send({
          type: "update_selected_media_models",
          session_id: sessionId,
          selected_media_models: next,
        });
      }
    },
    [send, sessionStore, syncSelectedMediaModels],
  );
  const handleModelSelectionChange = reactExports.useCallback(
    (selection, rememberForNewChats = false) => {
      if (selection.media !== void 0)
        handleSelectedMediaModelsChange(selection.media);
      if (selection.modelId !== void 0) handleModelChange(selection.modelId);
      if (rememberForNewChats) void rememberDefaults(selection);
    },
    [handleModelChange, handleSelectedMediaModelsChange, rememberDefaults],
  );
  reactExports.useEffect(() => {
    if (initialSelectedMediaModels === void 0) return;
    syncSelectedMediaModels(initialSelectedMediaModels);
  }, [initialSelectedMediaModels, syncSelectedMediaModels]);
  reactExports.useEffect(() => {
    if (!modelDefaultsHydrated) return;
    if (
      sessionStore.getState().focusedSessionId ||
      pendingCreatePayloadRef.current
    )
      return;
    if (!initialModelId && !editedRef.current.model) {
      syncSelectedModelId(effectiveDefaultModelId ?? null);
    }
    if (initialSelectedMediaModels === void 0 && !editedRef.current.media) {
      syncSelectedMediaModels(effectiveDefaultSelectedMediaModels);
    }
  }, [
    effectiveDefaultModelId,
    effectiveDefaultSelectedMediaModels,
    initialModelId,
    initialSelectedMediaModels,
    modelDefaultsHydrated,
    pendingCreatePayloadRef,
    sessionStore,
    syncSelectedMediaModels,
    syncSelectedModelId,
  ]);
  const resetForNewChat = reactExports.useCallback(
    (preserveSelectedMediaModels) => {
      const nextMediaModels = preserveSelectedMediaModels
        ? selectedMediaModelsRef.current
        : getDefaultSelectedMediaModels();
      syncSelectedMediaModels(nextMediaModels);
      if (preserveSelectedMediaModels) return;
      editedRef.current = {
        model: false,
        media: false,
      };
      syncSelectedModelId(getDefaultModelId() ?? null);
    },
    [
      getDefaultModelId,
      getDefaultSelectedMediaModels,
      syncSelectedMediaModels,
      syncSelectedModelId,
    ],
  );
  return {
    getSelectedMediaModels,
    getSelectedModelId,
    handleModelChange,
    handleModelSelectionChange,
    handleSelectedMediaModelsChange,
    resetForNewChat,
    selectedMediaModels,
    selectedModelId: effectiveSelectedModelId,
    syncSelectedMediaModels,
    syncSelectedModelId,
  };
}
