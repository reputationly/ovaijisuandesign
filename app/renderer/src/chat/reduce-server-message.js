// reduce-server-message.js

export function reduceServerMessage(prev, msg, _buffers, _sessionId) {
  const effects = [];
  switch (msg.type) {
    // === Session management ===
    case "session_created":
      effects.push({
        type: "session_created",
        sessionId: msg.session_id,
        name: msg.name,
        folder: msg.folder,
        modelId: msg.model_id,
        createdAt: msg.created_at,
        displayName: msg.display_name,
        selectedMediaModels: msg.selected_media_models,
        messages: msg.messages,
        forkDraft: msg.fork_draft,
        origin: msg.origin,
        activated: msg.activated,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_switched":
      effects.push({
        type: "session_switched",
        sessionId: msg.session_id,
        name: msg.name,
        displayName: msg.display_name,
        folder: msg.folder,
        modelId: msg.model_id,
        messages: msg.messages,
        historyLoadFailed: msg.history_load_failed,
        agentRunning: msg.agent_running,
        runtimeSessionId: msg.runtime_session_id,
        selectedMediaModels: msg.selected_media_models,
        selectedMediaModelsSnapshot: Object.hasOwn(
          msg,
          "selected_media_models",
        ),
        pendingReasons: msg.pending_reasons,
        pendingInteractions: msg.pending_interactions,
        recentLoopGuardSettlements: msg.recent_loop_guard_settlements,
        recentToolConfirmSettlements: msg.recent_tool_confirm_settlements,
        activated: msg.activated,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_list":
      effects.push({
        type: "session_list",
        sessions: msg.sessions,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_bound":
      effects.push({
        type: "session_bound",
        uiSessionId: msg.ui_session_id,
        runtimeSessionId: msg.runtime_session_id,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_renamed":
      effects.push({
        type: "session_renamed",
        sessionId: msg.session_id,
        runtimeSessionId: msg.runtime_session_id,
        name: msg.name,
      });
      return {
        messages: prev,
        effects,
      };
    case "selected_media_models_updated":
      effects.push({
        type: "selected_media_models_updated",
        sessionId: msg.session_id,
        selectedMediaModels: msg.selected_media_models,
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
        update: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "canvas_focus":
      effects.push({
        type: "canvas_focus",
        payload: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "canvas_node_generating":
      effects.push({
        type: "canvas_node_generating",
        payload: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_storage_changed":
      effects.push({
        type: "plugin_storage_changed",
        payload: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_agent_invoke":
      effects.push({
        type: "plugin_agent_invoke",
        payload: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "plugin_editor_open":
      effects.push({
        type: "plugin_editor_open",
        payload: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "asset_changed":
      effects.push({
        type: "asset_changed",
        event: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "assets_changed_batch":
      effects.push({
        type: "asset_changed",
        event: msg,
      });
      return {
        messages: prev,
        effects,
      };
    case "session_status_changed":
      effects.push({
        type: "set_busy",
        sessionId: msg.session_id,
        busy: msg.status === "running",
      });
      return {
        messages: prev,
        effects,
      };
    case "session_pending":
      effects.push({
        type: "set_pending_reasons",
        sessionId: msg.session_id,
        reasons: msg.reasons,
      });
      return {
        messages: prev,
        effects,
      };
    case "user_message_id": {
      for (let i2 = prev.length - 1; i2 >= 0; i2--) {
        if (prev[i2].role === "user" && prev[i2].type === "text") {
          const updated = [...prev];
          updated[i2] = {
            ...prev[i2],
            runtimeMessageId: msg.runtime_message_id,
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
