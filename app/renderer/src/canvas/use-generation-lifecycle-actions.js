// use-generation-lifecycle-actions.js
import { API_PATHS, reactExports } from "../vendor.js";
import { canvasLog, dedupedToast } from "../infra/agent-http-client.js";

function mapGenerationCancelResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object") {
    throw new Error("generation cancel returned a non-object response");
  }
  const record2 = raw2;
  if (record2.ok !== true || typeof record2.cancelled !== "boolean") {
    throw new Error("generation cancel returned an invalid response");
  }
  if (record2.dismissed !== void 0 && typeof record2.dismissed !== "boolean") {
    throw new Error("generation cancel returned an invalid dismissed state");
  }
  return {
    cancelled: record2.cancelled,
    ...(typeof record2.dismissed === "boolean"
      ? {
          dismissed: record2.dismissed,
        }
      : {}),
  };
}

export function useGenerationLifecycleActions({
  gatewayFetch: gatewayFetch2,
  t: t2,
}) {
  const handleCancelGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch2(API_PATHS.generationCancel, {
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
          dedupedToast.error(t2("canvas.cancelGenerationFailed"));
          return false;
        }
        dedupedToast.success(t2("canvas.generationCancelled"));
        return true;
      } catch (err) {
        canvasLog.error("cancel generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(t2("canvas.cancelGenerationFailed"));
        return false;
      }
    },
    [gatewayFetch2, t2],
  );
  const handleDismissUnknownGeneration = reactExports.useCallback(
    async (nodeId) => {
      try {
        const response = await gatewayFetch2(API_PATHS.generationCancel, {
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
          dedupedToast.error(t2("canvas.dismissGenerationStatusFailed"));
          return false;
        }
        return true;
      } catch (err) {
        canvasLog.error("dismiss unknown generation failed", {
          nodeId,
          error: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(t2("canvas.dismissGenerationStatusFailed"));
        return false;
      }
    },
    [gatewayFetch2, t2],
  );
  return {
    handleCancelGeneration,
    handleDismissUnknownGeneration,
  };
}
