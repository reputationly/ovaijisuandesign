// use-comfy-ui-workflow-bridge.jsx
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { mapLocalComfyUiWorkflows } from "./canvas-host-toolbar-button.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { useReleaseBadges } from "../generation/use-mention-models.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasBridgeProvider } from "../canvas/fullscreen-icon.jsx";
const CANVAS_ADD_NODE_BADGE_IDS = {
  directorStage: "canvas-add-director-stage-new-v1",
  videoEditing: "canvas-add-video-editing-new-v1",
  comfyUi: "canvas-add-comfyui-new-v1",
};
function useCanvasAddNodeMenuBadges() {
  const { t } = useTranslation();
  const configs = reactExports.useMemo(() => {
    const appearance = {
      label: t("canvas.releaseBadgeNew"),
      tone: "brand",
    };
    return Object.entries(CANVAS_ADD_NODE_BADGE_IDS).map(([target, id]) => ({
      id,
      target,
      display: {
        mode: "once",
        initial: appearance,
        afterComplete: null,
      },
    }));
  }, [t]);
  const { badges, markReleaseBadgeComplete } =
    useReleaseBadges(configs);
  const addNodeMenuBadges = reactExports.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(badges).map(([target, appearance]) => [
          target,
          appearance?.label,
        ]),
      ),
    [badges],
  );
  return {
    addNodeMenuBadges,
    onAddNodeMenuBadgeComplete: markReleaseBadgeComplete,
  };
}
async function fetchLocalComfyUiWorkflows(gatewayFetch) {
  const response = await gatewayFetch(API_PATHS.comfyUiWorkflows);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return mapLocalComfyUiWorkflows(await response.json());
}
function parseOpenWorkflowResult(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid ComfyUI response");
  const record = value;
  if (typeof record.status !== "string")
    throw new Error("Invalid ComfyUI response");
  return {
    status: record.status,
    ...(typeof record.error === "string"
      ? {
          error: record.error,
        }
      : {}),
  };
}
function useComfyUiWorkflowBridge() {
  const { t } = useTranslation();
  const scopedGatewayFetch = useGatewayFetch();
  const fetchComfyUiWorkflows = reactExports.useCallback(
    () => fetchLocalComfyUiWorkflows(gatewayFetch),
    [],
  );
  const openComfyUiWorkflow = reactExports.useCallback(
    async (workflowId, position) => {
      try {
        const response = await scopedGatewayFetch(
          API_PATHS.comfyUiWorkflowOpen(workflowId),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target: "new",
              open_editor: false,
              ...(position
                ? {
                    position,
                  }
                : {}),
            }),
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = parseOpenWorkflowResult(await response.json());
        if (result.status !== "opened")
          throw new Error(result.error || result.status);
      } catch (error) {
        dedupedToast.error(
          t("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [scopedGatewayFetch, t],
  );
  return {
    fetchComfyUiWorkflows,
    openComfyUiWorkflow,
  };
}
export function CanvasWorkflowBridge({
  children,
  ...canvasBridgeState
}) {
  const comfyUiWorkflowBridge = useComfyUiWorkflowBridge();
  const addNodeMenuBadgeBridge = useCanvasAddNodeMenuBadges();
  return (
    <CanvasBridgeProvider
      {...canvasBridgeState}
      {...comfyUiWorkflowBridge}
      {...addNodeMenuBadgeBridge}
    >
      {children}
    </CanvasBridgeProvider>
  );
}
