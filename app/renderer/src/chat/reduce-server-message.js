// reduce-server-message.js

export function reduceServerMessage(prev, serverMessage, _buffers, _sessionId) {
  const effects = [];
  switch (serverMessage.type) {
    // === Session management ===
    case "session_created":
      effects.push({
        type: "session_created",
        sessionId: serverMessage.session_id,
        name: serverMessage.name,
        folder: serverMessage.folder,
        modelId: serverMessage.model_id,
        createdAt: serverMessage.created_at,
        displayName: serverMessage.display_name,
        selectedMediaModels: serverMessage.selected_media_models,
        messages: serverMessage.messages,
        forkDraft: serverMessage.fork_draft,
        origin: serverMessage.origin,
        activated: serverMessage.activated,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_switched":
      effects.push({
        type: "session_switched",
        sessionId: serverMessage.session_id,
        name: serverMessage.name,
        displayName: serverMessage.display_name,
        folder: serverMessage.folder,
        modelId: serverMessage.model_id,
        messages: serverMessage.messages,
        historyLoadFailed: serverMessage.history_load_failed,
        agentRunning: serverMessage.agent_running,
        runtimeSessionId: serverMessage.runtime_session_id,
        selectedMediaModels: serverMessage.selected_media_models,
        selectedMediaModelsSnapshot: Object.hasOwn(
          serverMessage,
          "selected_media_models",
        ),
        pendingReasons: serverMessage.pending_reasons,
        pendingInteractions: serverMessage.pending_interactions,
        recentLoopGuardSettlements: serverMessage.recent_loop_guard_settlements,
        recentToolConfirmSettlements: serverMessage.recent_tool_confirm_settlements,
        activated: serverMessage.activated,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_list":
      effects.push({
        type: "session_list",
        sessions: serverMessage.sessions,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_bound":
      effects.push({
        type: "session_bound",
        uiSessionId: serverMessage.ui_session_id,
        runtimeSessionId: serverMessage.runtime_session_id,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_renamed":
      effects.push({
        type: "session_renamed",
        sessionId: serverMessage.session_id,
        runtimeSessionId: serverMessage.runtime_session_id,
        name: serverMessage.name,
      });
      return {
        messages: prev,
        effects,
      };
    case "selected_media_models_updated":
      effects.push({
        type: "selected_media_models_updated",
        sessionId: serverMessage.session_id,
        selectedMediaModels: serverMessage.selected_media_models,
      });
      return {
        messages: prev,
        effects,
      };
    case "pong":
      return {
        messages: prev,
        effects,
      };
    case "canvas_updated":
      effects.push({
        type: "canvas_updated",
        update: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "canvas_focus":
      effects.push({
        type: "canvas_focus",
        payload: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "canvas_node_generating":
      effects.push({
        type: "canvas_node_generating",
        payload: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_storage_changed":
      effects.push({
        type: "plugin_storage_changed",
        payload: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_agent_invoke":
      effects.push({
        type: "plugin_agent_invoke",
        payload: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_editor_open":
      effects.push({
        type: "plugin_editor_open",
        payload: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "asset_changed":
      effects.push({
        type: "asset_changed",
        event: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "assets_changed_batch":
      effects.push({
        type: "asset_changed",
        event: serverMessage,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_status_changed":
      effects.push({
        type: "set_busy",
        sessionId: serverMessage.session_id,
        busy: serverMessage.status === "running",
      });
      return {
        messages: prev,
        effects,
      };
    case "session_pending":
      effects.push({
        type: "set_pending_reasons",
        sessionId: serverMessage.session_id,
        reasons: serverMessage.reasons,
      });
      return {
        messages: prev,
        effects,
      };
    case "user_message_id": {
      for (let previousMessageIndex = prev.length - 1; previousMessageIndex >= 0; previousMessageIndex--) {
        if (prev[previousMessageIndex].role === "user" && prev[previousMessageIndex].type === "text") {
          const updated = [...prev];
          updated[previousMessageIndex] = {
            ...prev[previousMessageIndex],
            runtimeMessageId: serverMessage.runtime_message_id,
          };
          return {
            messages: updated,
            effects,
          };
        }
      }
      return {
        messages: prev,
        effects,
      };
    }
    default:
      return {
        messages: prev,
        effects,
      };
  }
}
