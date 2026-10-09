// media-generation-error-overlay.jsx
import {
  reactExports,
  useNodesData,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
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
  message: message2,
  nodeType,
  errorReason,
  retryPayload: persistedRetryPayload,
  recoverable = false,
  uncertain = false,
  errorSource = "in-place",
}) {
  const { t: t2 } = useTranslation();
  const bridge = useCanvasBridge();
  const { mergeNodeData } = useCanvasActions();
  const { deleteElements } = useReactFlow();
  const nodeRefund = useNodesData(nodeId)?.data;
  const [cancelGenerationPending, setCancelGenerationPending] =
    reactExports.useState(false);
  const generating = useGeneratingStateStore((s2) => s2.byNode.get(nodeId));
  const registryModel = useModelForAsset(
    generating?.backend,
    generating?.modelId,
    nodeType,
  );
  const displayModel =
    registryModel?.name ??
    (generating?.model ? translateModelName(generating.model, t2) : void 0);
  const handleDelete2 = (e2) => {
    e2.stopPropagation();
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
    async (e2) => {
      e2.stopPropagation();
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
    ? (e2) => {
        e2.stopPropagation();
        bridge.onReportNodeError?.({
          nodeId,
          nodeType: nodeType ?? "media",
          model: generating?.model,
          prompt: generating?.prompt,
          errorMessage: message2,
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
      ? (e2) => {
          e2.stopPropagation();
          bridge.onRetryGeneration?.(nodeId, retryPayload);
        }
      : void 0;
  const handleCancel = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
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
      errorMessage={message2}
      displayModel={displayModel}
      onDelete={handleDelete2}
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
          ? t2("canvas.generationStatusUnknown.inPlaceDescription")
          : void 0
      }
      onRetry={handleRetry}
      retrying={bridge.isRetryGenerationPending?.(nodeId) ?? false}
      refundStatus={nodeRefund?.refundStatus}
      refundedCredits={nodeRefund?.refundedCredits}
    />
  );
}
