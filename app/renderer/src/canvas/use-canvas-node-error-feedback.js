// use-canvas-node-error-feedback.js
import { reactExports } from "../vendor.js";
import { useDirectFeedback } from "../settings/use-direct-feedback.jsx";

export function useCanvasNodeErrorFeedback() {
  const { submitDirect, getSubmissionStatus } = useDirectFeedback();
  const onReportNodeError = reactExports.useCallback(
    (info) => {
      void submitDirect(
        {
          source: "context",
          contextType: "canvas_node_error",
          traceId: info.traceId,
          context: {
            node_id: info.nodeId,
            node_type: info.nodeType,
            model_id: info.model,
            prompt: info.prompt,
            error_code: info.errorMessage,
            trace_id: info.traceId,
          },
          logUploadReason: `canvas_node_error:${info.nodeType}`,
          defaultDescription: info.errorMessage ?? "",
        },
        info.nodeId,
      );
    },
    [submitDirect],
  );
  return {
    onReportNodeError,
    getNodeErrorReportStatus: getSubmissionStatus,
  };
}
