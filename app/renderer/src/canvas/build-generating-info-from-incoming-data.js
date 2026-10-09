// build-generating-info-from-incoming-data.js
import { normalizeWaitSeconds } from "./build-incremental-node-data.js";

function normalizeStartedAt(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

export function buildGeneratingInfoFromIncomingData(current2, incomingData) {
  return {
    ...(current2 ?? {
      prompt: incomingData.prompt ?? "",
      model: incomingData.model ?? incomingData.model_id ?? "",
    }),
    prompt: current2?.prompt ?? incomingData.prompt ?? "",
    model: current2?.model ?? incomingData.model ?? incomingData.model_id ?? "",
    modelId: current2?.modelId ?? incomingData.model_id,
    backend: current2?.backend ?? incomingData.backend,
    params: current2?.params ?? incomingData.params,
    phase: incomingData.status === "pending" ? "pending" : "generating",
    // The gateway owns the durable origin, so incoming wins over the local
    // guess here (unlike prompt/model above, where the local submit value is
    // the more accurate one). Cleared while pending — a queued node has not
    // started generating yet.
    generationStartedAt:
      incomingData.status === "pending"
        ? void 0
        : (normalizeStartedAt(incomingData.generationStartedAt) ??
          current2?.generationStartedAt),
    error: void 0,
    errorReason: void 0,
    retryPayload: void 0,
    estimatedRemainingWaitSeconds:
      incomingData.status === "pending"
        ? void 0
        : normalizeWaitSeconds(
            incomingData.estimatedRemainingWaitSeconds,
            incomingData.estimatedRemainingWaitMinutes,
          ),
  };
}
