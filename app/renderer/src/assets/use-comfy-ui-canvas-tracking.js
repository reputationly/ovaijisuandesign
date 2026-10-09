// use-comfy-ui-canvas-tracking.js
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { reactExports } from "../vendor.js";
import { getPluginMeta } from "../infra/use-plugin-metadata-store.js";
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";

function toTrackedCanvasNodeType(nodeType) {
  switch (nodeType) {
    case "image":
    case "video":
    case "audio":
    case "text":
    case "table":
    case "file":
    case "group":
    case "comfyui":
      return nodeType;
    default:
      return "file";
  }
}

function trackPluginAddToCanvas(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_ADD_TO_CANVAS, props);
}

export function useComfyUiCanvasTracking(workspaceRef) {
  const handleNodeAddTrack = reactExports.useCallback(
    (info2) => {
      const canvasId = workspaceRef.current
        ? folderNameFromPath(workspaceRef.current)
        : void 0;
      try {
        trackEvent(TRACK_EVENTS.CANVAS_NODE_ADD, {
          node_type:
            info2.pluginId === "comfyui"
              ? "comfyui"
              : toTrackedCanvasNodeType(info2.nodeType),
          source: info2.source,
          ...(info2.entryPoint
            ? {
                entry_point: info2.entryPoint,
              }
            : {}),
          ...(canvasId
            ? {
                canvas_id: canvasId,
              }
            : {}),
        });
        if (info2.pluginId && info2.nodeId) {
          const meta2 = getPluginMeta(info2.pluginId);
          trackPluginAddToCanvas({
            plugin_id: info2.pluginId,
            plugin_version: meta2?.version ?? "unknown",
            plugin_source: meta2?.source ?? "installed",
            plugin_instance_id: info2.nodeId,
            surface: "canvas",
            trigger: info2.source,
            duration_ms: info2.durationMs ?? 0,
          });
        }
      } catch {}
    },
    [workspaceRef],
  );
  const handlePaneContextMenuActionTrack = reactExports.useCallback((info2) => {
    try {
      trackEvent(TRACK_EVENTS.CANVAS_CONTEXT_MENU_CLICK, {
        menu_item: info2.menuItem,
        surface: "pane_context_menu",
      });
    } catch {}
  }, []);
  const handleComfyUiDraftActionTrack = reactExports.useCallback((info2) => {
    try {
      trackEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_DRAFT_ACTION, {
        action: info2.action,
        ...(info2.workflowSource
          ? {
              workflow_source: info2.workflowSource,
            }
          : {}),
      });
    } catch {}
  }, []);
  const handlePluginActionTrack = reactExports.useCallback((info2) => {
    if (
      info2.pluginId !== "comfyui" ||
      info2.action !== "run" ||
      !info2.runPath
    )
      return;
    try {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_RUN, {
        node_type: "comfyui",
        run_path: info2.runPath,
        has_workflow_content: true,
      });
    } catch {}
  }, []);
  return {
    handleComfyUiDraftActionTrack,
    handleNodeAddTrack,
    handlePaneContextMenuActionTrack,
    handlePluginActionTrack,
  };
}
