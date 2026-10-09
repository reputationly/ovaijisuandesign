// use-comfy-ui-workflow-bridge.jsx
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  useTranslation,
} from "../vendor.js";
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
  const { t: t2 } = useTranslation();
  const configs = reactExports.useMemo(() => {
    const appearance = {
      label: t2("canvas.releaseBadgeNew"),
      tone: "brand",
    };
    return Object.entries(CANVAS_ADD_NODE_BADGE_IDS).map(([target, id2]) => ({
      id: id2,
      target,
      display: {
        mode: "once",
        initial: appearance,
        afterComplete: null,
      },
    }));
  }, [t2]);
  const { badges: badges2, markReleaseBadgeComplete } =
    useReleaseBadges(configs);
  const addNodeMenuBadges = reactExports.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(badges2).map(([target, appearance]) => [
          target,
          appearance?.label,
        ]),
      ),
    [badges2],
  );
  return {
    addNodeMenuBadges,
    onAddNodeMenuBadgeComplete: markReleaseBadgeComplete,
  };
}

async function fetchLocalComfyUiWorkflows(gatewayFetch2) {
  const response = await gatewayFetch2(API_PATHS.comfyUiWorkflows);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return mapLocalComfyUiWorkflows(await response.json());
}

function parseOpenWorkflowResult$1(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid ComfyUI response");
  const record2 = value;
  if (typeof record2.status !== "string")
    throw new Error("Invalid ComfyUI response");
  return {
    status: record2.status,
    ...(typeof record2.error === "string"
      ? {
          error: record2.error,
        }
      : {}),
  };
}

function useComfyUiWorkflowBridge() {
  const { t: t2 } = useTranslation();
  const gatewayFetch$1 = useGatewayFetch();
  const fetchComfyUiWorkflows = reactExports.useCallback(
    () => fetchLocalComfyUiWorkflows(gatewayFetch),
    [],
  );
  const openComfyUiWorkflow = reactExports.useCallback(
    async (workflowId, position2) => {
      try {
        const response = await gatewayFetch$1(
          API_PATHS.comfyUiWorkflowOpen(workflowId),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target: "new",
              open_editor: false,
              ...(position2
                ? {
                    position: position2,
                  }
                : {}),
            }),
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = parseOpenWorkflowResult$1(await response.json());
        if (result.status !== "opened")
          throw new Error(result.error || result.status);
      } catch (error) {
        dedupedToast.error(
          t2("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [gatewayFetch$1, t2],
  );
  return {
    fetchComfyUiWorkflows,
    openComfyUiWorkflow,
  };
}

export function CanvasWorkflowBridge({
  children: children2,
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
      {children2}
    </CanvasBridgeProvider>
  );
}
