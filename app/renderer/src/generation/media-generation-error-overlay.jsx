// media-generation-error-overlay.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { useNodesData, useReactFlow } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { translateModelName } from "./missing-asset-card.jsx";
import { MediaErrorCard } from "./media-error-card.jsx";
import { useModelForAsset } from "../infra/create-recently-added-store.js";
import {
  useCanvasBridge,
  useGeneratingStateStore,
} from "../media-editing/package.jsx";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "./normalize-skill-detail-metadata.js";

export function MediaGenerationErrorOverlay({
  nodeId,
  message,
  nodeType,
  errorReason,
  retryPayload: persistedRetryPayload,
  recoverable = false,
  uncertain = false,
  errorSource = "in-place",
}) {
  const { t: translate } = useTranslation();
  const bridge = useCanvasBridge();
  const { mergeNodeData } = useCanvasActions();
  const { deleteElements } = useReactFlow();
  const nodeRefund = useNodesData(nodeId)?.data;
  const [cancelGenerationPending, setCancelGenerationPending] =
    reactExports.useState(false);
  const generating = useGeneratingStateStore((generationState) => generationState.byNode.get(nodeId));
  const registryModel = useModelForAsset(
    generating?.backend,
    generating?.modelId,
    nodeType,
  );
  const displayModel =
    registryModel?.name ??
    (generating?.model ? translateModelName(generating.model, translate) : void 0);
  const handleDelete = (clickEvent) => {
    clickEvent.stopPropagation();
    useGeneratingStateStore.getState().clear(nodeId);
    deleteElements({
      nodes: [
        {
          id: nodeId,
        },
      ],
    });
  };
  const handleDismissUnknown = reactExports.useCallback(
    async (clickEvent) => {
      clickEvent.stopPropagation();
      if (cancelGenerationPending) return;
      if (bridge.onDismissUnknownGeneration) {
        setCancelGenerationPending(true);
        try {
          const dismissed = await bridge.onDismissUnknownGeneration(nodeId);
          if (!dismissed) return;
        } finally {
          setCancelGenerationPending(false);
        }
      }
      useGeneratingStateStore.getState().clear(nodeId);
      mergeNodeData(nodeId, {
        status: void 0,
        errorMessage: void 0,
        errorReason: void 0,
        retryPayload: void 0,
        cloudTraceId: void 0,
        cloudTaskId: void 0,
        providerTaskId: void 0,
        generationAttemptId: void 0,
        generationStartedAt: void 0,
        estimatedRemainingWaitSeconds: void 0,
        estimatedRemainingWaitMinutes: void 0,
      });
    },
    [bridge, cancelGenerationPending, mergeNodeData, nodeId],
  );
  const handleReport = bridge.onReportNodeError
    ? (clickEvent) => {
        clickEvent.stopPropagation();
        bridge.onReportNodeError?.({
          nodeId,
          nodeType: nodeType ?? "media",
          model: generating?.model,
          prompt: generating?.prompt,
          errorMessage: message,
          traceId: generating?.traceId,
        });
        useGeneratingStateStore.getState().clear(nodeId);
      }
    : void 0;
  const resolvedErrorReason = generating?.errorReason ?? errorReason;
  const retryPayload =
    resolvedErrorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
      ? (generating?.retryPayload ?? persistedRetryPayload)
      : void 0;
  const handleRetry =
    retryPayload && bridge.onRetryGeneration
      ? (clickEvent) => {
          clickEvent.stopPropagation();
          bridge.onRetryGeneration?.(nodeId, retryPayload);
        }
      : void 0;
  const handleCancel = reactExports.useCallback(
    async (clickEvent) => {
      clickEvent.stopPropagation();
      if (!bridge.onCancelGeneration || cancelGenerationPending) return;
      setCancelGenerationPending(true);
      try {
        await bridge.onCancelGeneration(nodeId);
      } finally {
        setCancelGenerationPending(false);
      }
    },
    [bridge, cancelGenerationPending, nodeId],
  );
  return (
    <MediaErrorCard
      errorMessage={message}
      displayModel={displayModel}
      onDelete={handleDelete}
      onReport={handleReport}
      reportStatus={bridge.getNodeErrorReportStatus?.(nodeId) ?? "idle"}
      variant={
        recoverable
          ? "recoverable"
          : uncertain
            ? "uncertain"
            : resolvedErrorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
              ? "concurrency_limit"
              : "failed"
      }
      onCancel={
        recoverable && bridge.onCancelGeneration ? handleCancel : void 0
      }
      cancelling={cancelGenerationPending}
      onDismissUnknown={
        uncertain && errorSource === "in-place" ? handleDismissUnknown : void 0
      }
      dismissing={uncertain && cancelGenerationPending}
      uncertainDescription={
        uncertain && errorSource === "in-place"
          ? translate("canvas.generationStatusUnknown.inPlaceDescription")
          : void 0
      }
      onRetry={handleRetry}
      retrying={bridge.isRetryGenerationPending?.(nodeId) ?? false}
      refundStatus={nodeRefund?.refundStatus}
      refundedCredits={nodeRefund?.refundedCredits}
    />
  );
}
