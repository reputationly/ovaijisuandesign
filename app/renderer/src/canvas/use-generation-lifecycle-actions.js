// use-generation-lifecycle-actions.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { canvasLog, dedupedToast } from "../infra/agent-http-client.js";

function mapGenerationCancelResponse(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("generation cancel returned a non-object response");
  }
  const record = raw;
  if (record.ok !== true || typeof record.cancelled !== "boolean") {
    throw new Error("generation cancel returned an invalid response");
  }
  if (record.dismissed !== void 0 && typeof record.dismissed !== "boolean") {
    throw new Error("generation cancel returned an invalid dismissed state");
  }
  return {
    cancelled: record.cancelled,
    ...(typeof record.dismissed === "boolean"
      ? {
          dismissed: record.dismissed,
        }
      : {}),
  };
}

export function useGenerationLifecycleActions({
  gatewayFetch,
  t: translate,
}) {
  const handleCancelGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch(API_PATHS.generationCancel, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node_id: nodeId,
          }),
        });
        if (!response.ok)
          throw new Error(`generation cancel failed (${response.status})`);
        if (!mapGenerationCancelResponse(await response.json()).cancelled) {
          dedupedToast.error(translate("canvas.cancelGenerationFailed"));
          return false;
        }
        dedupedToast.success(translate("canvas.generationCancelled"));
        return true;
      } catch (err) {
        canvasLog.error("cancel generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(translate("canvas.cancelGenerationFailed"));
        return false;
      }
    },
    [gatewayFetch, translate],
  );
  const handleDismissUnknownGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch(API_PATHS.generationCancel, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node_id: nodeId,
            preserve_original: true,
          }),
        });
        if (!response.ok)
          throw new Error(`generation dismiss failed (${response.status})`);
        if (
          mapGenerationCancelResponse(await response.json()).dismissed !== true
        ) {
          dedupedToast.error(translate("canvas.dismissGenerationStatusFailed"));
          return false;
        }
        return true;
      } catch (err) {
        canvasLog.error("dismiss unknown generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(translate("canvas.dismissGenerationStatusFailed"));
        return false;
      }
    },
    [gatewayFetch, translate],
  );
  return {
    handleCancelGeneration,
    handleDismissUnknownGeneration,
  };
}
