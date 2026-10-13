// use-tool-confirm-edit-state.js
import { registrySelectionRowIds } from "./normalize-skill-detail-metadata.js";
import { IMAGE_MODELS } from "./image-models.js";
import { VIDEO_MODELS } from "./video-models.js";
import { AUDIO_MODELS } from "./audio-models.js";
import { getToolLabelId } from "../chat/has-structured-success-payload.js";
import { TOOL_LABEL_DEFINITIONS as importedToolLabelDefinitions } from "../workspace/tool-label-definitions.js";
import { getBuiltInToolLabelId } from "../media-editing/tool-name-to-label-id.js";
import { getConfiguredToolDisplayLabel } from "../settings/request-prompt-prefill.jsx";
import { RECONNECTING_STUCK_THRESHOLD_MS } from "../chat/use-browser-chat-media.jsx";
import { BROWSER_IMAGE_EDIT_EVENT, reactExports } from "../vendor.js";
export function dispatchBrowserImageEditToChat(request) {
  const event = new CustomEvent(BROWSER_IMAGE_EDIT_EVENT, {
    detail: request,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
export function useChatConnectionPhase(workspaceId, connected) {
  const [connectionHistory, setConnectionHistory] = reactExports.useState(() => ({
    workspaceId,
    hasConnected: connected,
  }));
  reactExports.useEffect(() => {
    setConnectionHistory((current) => {
      if (current.workspaceId !== workspaceId) {
        return {
          workspaceId,
          hasConnected: connected,
        };
      }
      if (connected && !current.hasConnected) {
        return {
          ...current,
          hasConnected: true,
        };
      }
      return current;
    });
  }, [workspaceId, connected]);
  if (connected) return "connected";
  const hasConnected =
    connectionHistory.workspaceId === workspaceId && connectionHistory.hasConnected;
  return hasConnected ? "reconnecting" : "connecting";
}
function buildRegistryIndex(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const key of registrySelectionRowIds(entry)) {
      if (!map.has(key)) map.set(key, entry);
    }
    if (entry.name && !map.has(entry.name)) map.set(entry.name, entry);
  }
  return map;
}
export const REGISTRY_BY_TYPE = {
  image: buildRegistryIndex(IMAGE_MODELS),
  video: buildRegistryIndex(VIDEO_MODELS),
  audio: buildRegistryIndex(AUDIO_MODELS),
};
const legacyMidjourney = REGISTRY_BY_TYPE.image.get("midjourney-8.2");
if (legacyMidjourney)
  REGISTRY_BY_TYPE.image.set("midjourney", legacyMidjourney);
const RECLAIM_TTL_MS = RECONNECTING_STUCK_THRESHOLD_MS + 6e4;
export function useRuntimeMemoryReclaim() {
  const [reclaimed, setReclaimed] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const clearTimer = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (typeof hilo === "undefined") return;
    const unsubscribe = hilo.diagnostics.onRuntimeMemoryReclaim(() => {
      setReclaimed(true);
      clearTimer();
      timerRef.current = setTimeout(() => setReclaimed(false), RECLAIM_TTL_MS);
    });
    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [clearTimer]);
  return reclaimed;
}
function retainActiveEntries(previous, activeIds) {
  let changed = false;
  const next = {};
  for (const [requestId, value] of Object.entries(previous)) {
    if (activeIds.has(requestId)) next[requestId] = value;
    else changed = true;
  }
  return changed ? next : previous;
}
export function useToolConfirmEditState(pendingMessages, submittingIds) {
  const [edits, setEdits] = reactExports.useState({});
  const [approvalState, setApprovalState] = reactExports.useState({});
  const setEdit = reactExports.useCallback((requestId, args) => {
    setEdits((previous) => ({
      ...previous,
      [requestId]: args,
    }));
  }, []);
  const setApproval = reactExports.useCallback((requestId, state) => {
    setApprovalState((previous) => ({
      ...previous,
      [requestId]: state,
    }));
  }, []);
  const contextValue = reactExports.useMemo(
    () => ({
      edits,
      setEdit,
      approvalState,
      setApprovalState: setApproval,
      submittingIds,
    }),
    [approvalState, edits, setApproval, setEdit, submittingIds],
  );
  reactExports.useEffect(() => {
    const activeIds = new Set(
      pendingMessages
        .map((message) => message.requestId)
        .filter((requestId) => Boolean(requestId)),
    );
    setEdits((previous) => retainActiveEntries(previous, activeIds));
    setApprovalState((previous) => retainActiveEntries(previous, activeIds));
  }, [pendingMessages]);
  return {
    approvalState,
    contextValue,
    edits,
  };
}
const TOOL_LABEL_DEFINITIONS = {
  ...importedToolLabelDefinitions,
  browser: {
    i18nKey: "chat.toolLabel.browser",
  },
};
const MAIN_AGENT_THINKING_TOOL_NAMES = new Set([
  "todowrite",
  "hub_search_knowledge",
  "hub_select_image_recipe",
]);
const TRANSIENT_TOOL_LABEL_KEYS = {
  hub_canvas_get_node: "chat.toolLabel.canvasGetNode",
  hub_canvas_list_nodes: "chat.toolLabel.canvasListNodes",
  hub_canvas_grep_text: "chat.toolLabel.canvasGrepText",
  hub_canvas_read_text: "chat.toolLabel.canvasReadText",
  hub_plan_get_stage_status: "chat.toolLabel.planGetStageStatus",
  hub_plan_get_stage_detail: "chat.toolLabel.planGetStageDetail",
  hub_plan_get_work_items: "chat.toolLabel.planGetWorkItems",
  hub_plan_patch_stage: "chat.toolLabel.planPatchStage",
  hub_plan_update_stage_state: "chat.toolLabel.planUpdateStageState",
  hub_memory: "chat.toolLabel.memory",
  hub_search_knowledge: "chat.toolLabel.searchKnowledge",
  hub_select_image_recipe: "chat.toolLabel.selectImageRecipe",
  hub_list_capabilities: "chat.toolLabel.listCapabilities",
  hub_report_outcome: "chat.toolLabel.reportOutcome",
  hub_list_comfyui_template: "chat.toolLabel.listComfyUiWorkflow",
  hub_list_comfyui_workflow: "chat.toolLabel.listComfyUiWorkflow",
  hub_get_comfyui_workflow: "chat.toolLabel.getComfyUiWorkflow",
  hub_run_comfyui_workflow: "chat.toolLabel.runComfyUiWorkflow",
  hub_get_comfyui_run_status: "chat.toolLabel.getComfyUiRunStatus",
};
export function isMainAgentThinkingTool(toolName) {
  return !!toolName && MAIN_AGENT_THINKING_TOOL_NAMES.has(toolName);
}
export function isTransientTool(toolName) {
  return getToolLabelId(toolName) === "transient";
}
export function getToolDisplayLabel(toolName, translate) {
  const labelId = getToolLabelId(toolName);
  if (labelId === "silent") return "";
  if (toolName && !getBuiltInToolLabelId(toolName)) {
    const configured = getConfiguredToolDisplayLabel(toolName);
    if (configured) return configured;
  }
  if (labelId === "connectorOp" && toolName) {
    if (toolName === "hub_connector_authorize")
      return translate("connectors.oauth.connect");
    if (/^apify_/iu.test(toolName))
      return translate("chat.toolLabel.connector.apify");
    if (/^fastmoss(?:-mcp)?_/iu.test(toolName))
      return translate("chat.toolLabel.connector.fastmoss");
    if (/^shopify(?:-mcp)?_/iu.test(toolName))
      return translate("chat.toolLabel.connector.shopify");
    return toolName;
  }
  if (labelId === "transient" && toolName) {
    return translate(
      TRANSIENT_TOOL_LABEL_KEYS[toolName] ??
        TOOL_LABEL_DEFINITIONS.transient.i18nKey,
    );
  }
  if (labelId === "askUser" && toolName?.startsWith("hub_preview_")) {
    return translate("chat.toolLabel.askUser.preview");
  }
  return translate(TOOL_LABEL_DEFINITIONS[labelId].i18nKey);
}
export function filterSilentTools(messages, getToolName) {
  return messages.filter((message) => {
    if (message.type !== "tool") return true;
    const toolName = getToolName(message);
    return getToolLabelId(toolName) !== "silent";
  });
}
