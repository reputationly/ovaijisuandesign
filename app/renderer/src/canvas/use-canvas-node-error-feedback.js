// use-canvas-node-error-feedback.js
import { reactExports } from "../vendor.js";
import { useDirectFeedback } from "../settings/use-direct-feedback.jsx";

export function useCanvasNodeErrorFeedback() {
  const { submitDirect, getSubmissionStatus } = useDirectFeedback();
  const onReportNodeError = reactExports.useCallback(
    (info2) => {
      void submitDirect(
        {
          source: "context",
          contextType: "canvas_node_error",
          traceId: info2.traceId,
          context: {
            node_id: info2.nodeId,
            node_type: info2.nodeType,
            model_id: info2.model,
            prompt: info2.prompt,
            error_code: info2.errorMessage,
            trace_id: info2.traceId,
          },
          logUploadReason: `canvas_node_error:${info2.nodeType}`,
          defaultDescription: info2.errorMessage ?? "",
        },
        info2.nodeId,
      );
    },
    [submitDirect],
  );
  return {
    onReportNodeError,
    getNodeErrorReportStatus: getSubmissionStatus,
  };
}
