// use-tool-confirm-edit-state.js
import { registrySelectionRowIds } from "./normalize-skill-detail-metadata.js";
import { IMAGE_MODELS } from "./image-models.js";
import { VIDEO_MODELS } from "./video-models.js";
import { AUDIO_MODELS } from "./audio-models.js";
import { getToolLabelId } from "../chat/has-structured-success-payload.js";
import { TOOL_LABEL_DEFINITIONS as TOOL_LABEL_DEFINITIONS$1 } from "../workspace/tool-label-definitions.js";
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
export function useChatConnectionPhase(workspaceId2, connected) {
  const [history2, setHistory] = reactExports.useState(() => ({
    workspaceId: workspaceId2,
    hasConnected: connected,
  }));
  reactExports.useEffect(() => {
    setHistory((current2) => {
      if (current2.workspaceId !== workspaceId2) {
        return {
          workspaceId: workspaceId2,
          hasConnected: connected,
        };
      }
      if (connected && !current2.hasConnected) {
        return {
          ...current2,
          hasConnected: true,
        };
      }
      return current2;
    });
  }, [workspaceId2, connected]);
  if (connected) return "connected";
  const hasConnected =
    history2.workspaceId === workspaceId2 && history2.hasConnected;
  return hasConnected ? "reconnecting" : "connecting";
}
function buildRegistryIndex(entries2) {
  const map3 = new Map();
  for (const entry of entries2) {
    for (const key2 of registrySelectionRowIds(entry)) {
      if (!map3.has(key2)) map3.set(key2, entry);
    }
    if (entry.name && !map3.has(entry.name)) map3.set(entry.name, entry);
  }
  return map3;
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
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (typeof hilo === "undefined") return;
    const unsubscribe = hilo.diagnostics.onRuntimeMemoryReclaim(() => {
      setReclaimed(true);
      clearTimer2();
      timerRef.current = setTimeout(() => setReclaimed(false), RECLAIM_TTL_MS);
    });
    return () => {
      unsubscribe();
      clearTimer2();
    };
  }, [clearTimer2]);
  return reclaimed;
}
function retainActiveEntries(previous2, activeIds2) {
  let changed = false;
  const next2 = {};
  for (const [requestId, value] of Object.entries(previous2)) {
    if (activeIds2.has(requestId)) next2[requestId] = value;
    else changed = true;
  }
  return changed ? next2 : previous2;
}
export function useToolConfirmEditState(pendingMessages, submittingIds) {
  const [edits, setEdits] = reactExports.useState({});
  const [approvalState, setApprovalState] = reactExports.useState({});
  const setEdit = reactExports.useCallback((requestId, args) => {
    setEdits((previous2) => ({
      ...previous2,
      [requestId]: args,
    }));
  }, []);
  const setApproval = reactExports.useCallback((requestId, state2) => {
    setApprovalState((previous2) => ({
      ...previous2,
      [requestId]: state2,
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
    const activeIds2 = new Set(
      pendingMessages
        .map((message2) => message2.requestId)
        .filter((requestId) => Boolean(requestId)),
    );
    setEdits((previous2) => retainActiveEntries(previous2, activeIds2));
    setApprovalState((previous2) => retainActiveEntries(previous2, activeIds2));
  }, [pendingMessages]);
  return {
    approvalState,
    contextValue,
    edits,
  };
}
const TOOL_LABEL_DEFINITIONS = {
  ...TOOL_LABEL_DEFINITIONS$1,
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
export function isMainAgentThinkingTool(toolName2) {
  return !!toolName2 && MAIN_AGENT_THINKING_TOOL_NAMES.has(toolName2);
}
export function isTransientTool(toolName2) {
  return getToolLabelId(toolName2) === "transient";
}
export function getToolDisplayLabel(toolName2, t2) {
  const labelId = getToolLabelId(toolName2);
  if (labelId === "silent") return "";
  if (toolName2 && !getBuiltInToolLabelId(toolName2)) {
    const configured = getConfiguredToolDisplayLabel(toolName2);
    if (configured) return configured;
  }
  if (labelId === "connectorOp" && toolName2) {
    if (toolName2 === "hub_connector_authorize")
      return t2("connectors.oauth.connect");
    if (/^apify_/iu.test(toolName2))
      return t2("chat.toolLabel.connector.apify");
    if (/^fastmoss(?:-mcp)?_/iu.test(toolName2))
      return t2("chat.toolLabel.connector.fastmoss");
    if (/^shopify(?:-mcp)?_/iu.test(toolName2))
      return t2("chat.toolLabel.connector.shopify");
    return toolName2;
  }
  if (labelId === "transient" && toolName2) {
    return t2(
      TRANSIENT_TOOL_LABEL_KEYS[toolName2] ??
        TOOL_LABEL_DEFINITIONS.transient.i18nKey,
    );
  }
  if (labelId === "askUser" && toolName2?.startsWith("hub_preview_")) {
    return t2("chat.toolLabel.askUser.preview");
  }
  return t2(TOOL_LABEL_DEFINITIONS[labelId].i18nKey);
}
export function filterSilentTools(messages2, getToolName) {
  return messages2.filter((msg) => {
    if (msg.type !== "tool") return true;
    const name2 = getToolName(msg);
    return getToolLabelId(name2) !== "silent";
  });
}
