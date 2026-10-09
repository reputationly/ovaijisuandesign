// use-img2-image.js
import {
  AccountSubmissionBlockedError,
  canvasLog,
  dedupedToast,
  instance,
  logMediaLineage,
  MEDIA_LINEAGE_MAX_REFERENCES,
  MEDIA_LINEAGE_REQUEST_HEADER,
  mediaLineageRequestId,
  reactExports,
  useAssetMetadataApi,
} from "../vendor.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { useGeneratingStateApi } from "./package.jsx";
import {
  BACKEND_MIDJOURNEY,
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_SHUTDOWN,
  HILO_SOURCE_HEADER,
  pickUserMessage,
} from "../generation/normalize-skill-detail-metadata.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  findCanvasModel,
  generationErrorStatusFromResponse,
  generationErrorStatusFromThrown,
  persistedGenerateErrorReason,
  RESUBMIT_BLOCKED_I18N,
  retainedGenerationBlocksResubmit,
  ScopedAsyncCache,
  semanticGenerationErrorCopy,
  visibleCanvasModels,
} from "../generation/use-mention-models.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";

function logReferenceSubmission(paths, context, assets) {
  try {
    for (const [referenceIndex, path2] of paths
      .slice(0, MEDIA_LINEAGE_MAX_REFERENCES)
      .entries()) {
      let assetId;
      if (assets) {
        for (const [, asset] of assets) {
          if (asset.path !== path2) continue;
          assetId = asset.url?.match(/\/files\/id\/([\w-]+)/)?.[1];
          if (assetId) break;
        }
      }
      logMediaLineage({
        ...context,
        stage: "reference.client-submit",
        referenceIndex,
        referenceCount: paths.length,
        path: path2,
        assetId,
      });
    }
    if (paths.length > MEDIA_LINEAGE_MAX_REFERENCES)
      logMediaLineage({
        ...context,
        stage: "reference.omitted",
        omittedCount: paths.length - MEDIA_LINEAGE_MAX_REFERENCES,
      });
  } catch {}
}

const GENERATE_ERROR_CODE_QUEUE_PAUSED$2 = "queue_paused";

export function useImg2Image({ httpClient, catalogScopeKey }) {
  const generatingStateStore = useGeneratingStateApi();
  const assetMetadataStore = useAssetMetadataApi();
  const replaceTargets = reactExports.useRef(new Set());
  const imageModelsCache = reactExports.useRef(new ScopedAsyncCache()).current;
  imageModelsCache.setScope(catalogScopeKey);
  const loadImageModels = reactExports.useCallback(
    () =>
      imageModelsCache.load(catalogScopeKey, async () => {
        const { imageModels } = await httpClient.listModels();
        return imageModels;
      }),
    [catalogScopeKey, httpClient, imageModelsCache],
  );
  const listImageModels = reactExports.useCallback(
    async () => visibleCanvasModels(await loadImageModels()),
    [loadImageModels],
  );
  const handleImg2Image = reactExports.useCallback(
    async (
      nodeId,
      prompt,
      modelId,
      params,
      imagePaths,
      replaceNodeId,
      count2,
      displayPrompt,
      replaceTargetIsEmpty,
      backendOverride,
      textPaths,
    ) => {
      if (replaceNodeId) {
        if (
          retainedGenerationBlocksResubmit(
            generatingStateStore.getState().byNode.get(replaceNodeId),
          )
        ) {
          dedupedToast.warning(instance.t(...RESUBMIT_BLOCKED_I18N));
          return {
            success: false,
            error: "resubmit blocked: retained generation task",
          };
        }
        if (replaceTargets.current.has(replaceNodeId)) {
          return {
            success: true,
          };
        }
        replaceTargets.current.add(replaceNodeId);
      }
      try {
        const models =
          imageModelsCache.peek(catalogScopeKey) ??
          (await loadImageModels().catch(() => []));
        const model = findCanvasModel(models, modelId);
        const backend = backendOverride ?? model?.backend ?? "nano_banana";
        const effectiveCount =
          backend === BACKEND_MIDJOURNEY
            ? 1
            : Math.max(1, Math.min(9, Math.floor(count2 ?? 1)));
        recordAction("generate:img2img", {
          model: modelId,
        });
        trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
          popover_type: imagePaths.length === 0 ? "t2i" : "i2i",
          node_id: nodeId,
          submit_mode: !replaceNodeId
            ? "new_node"
            : replaceTargetIsEmpty
              ? "single"
              : "replace",
          model_id: modelId,
          backend,
          prompt_length: prompt.length,
          ref_count: imagePaths.length,
          aspect_ratio: params.aspect_ratio ?? params.ratio,
          resolution: params.resolution,
        });
        const requestId = mediaLineageRequestId();
        const headers = {
          [HILO_SOURCE_HEADER]: "canvas",
          ...(requestId
            ? {
                [MEDIA_LINEAGE_REQUEST_HEADER]: requestId,
              }
            : {}),
        };
        logReferenceSubmission(
          imagePaths,
          {
            requestId,
            nodeId,
            backend,
            modelId,
          },
          assetMetadataStore.getState().assets,
        );
        const resp = await httpClient.generateImage(
          {
            backend,
            model_id: modelId,
            prompt,
            display_prompt: displayPrompt,
            image_paths: imagePaths,
            text_paths: textPaths,
            params: model?.model_name
              ? {
                  ...params,
                  model_name: model.model_name,
                }
              : params,
            source_node_id: nodeId,
            replace_node_id: replaceNodeId,
            filename: `img2image-${nodeId}`,
            count: effectiveCount,
          },
          {
            headers,
          },
        );
        if (!resp.ok) {
          if (
            resp.error_code === GENERATE_ERROR_CODE_SHUTDOWN ||
            resp.error_code === GENERATE_ERROR_CODE_QUEUE_PAUSED$2
          ) {
            return {
              success: true,
            };
          }
          const rawErrorMsg = pickUserMessage(
            resp,
            instance.t("canvas.generateFailed", {
              defaultValue: "生成失败，请稍后重试",
            }),
          );
          const toastErrorMsg = semanticGenerationErrorCopy(
            stripErrorHtml(rawErrorMsg),
          );
          const errorStatus = generationErrorStatusFromResponse(
            resp.failure_presentation,
          );
          const userMessage =
            errorStatus === "recoverable_error"
              ? instance.t("canvas.generationRecovery.description", {
                  defaultValue: "原任务已保留，结果将在恢复后自动回填。",
                })
              : errorStatus === "status_unknown"
                ? instance.t("canvas.generationStatusUnknown.description", {
                    defaultValue: "生成请求未能完成，系统不会自动重试。",
                  })
                : toastErrorMsg;
          if (replaceNodeId) {
            const store = generatingStateStore.getState();
            const prev = store.byNode.get(replaceNodeId);
            const retryPayload =
              resp.error_code === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
                ? {
                    kind: "image",
                    sourceNodeId: nodeId,
                    prompt,
                    modelId,
                    params,
                    backend,
                    imagePaths,
                    ...(textPaths?.length
                      ? {
                          textPaths,
                        }
                      : {}),
                    ...(typeof count2 === "number"
                      ? {
                          count: count2,
                        }
                      : {}),
                    ...(displayPrompt
                      ? {
                          displayPrompt,
                        }
                      : {}),
                  }
                : void 0;
            store.mark(replaceNodeId, {
              prompt,
              model: modelId,
              ...prev,
              error: rawErrorMsg,
              errorStatus,
              errorReason: persistedGenerateErrorReason(resp.error_code),
              retryPayload,
              // Unconditional so it overrides any stale traceId from `...prev`.
              traceId: resp.cloud_trace_id,
            });
          }
          if (errorStatus === "recoverable_error")
            dedupedToast.warning(userMessage);
          else dedupedToast.error(userMessage);
          return {
            success: false,
            error: userMessage,
            errorStatus,
          };
        }
        return {
          success: true,
        };
      } catch (err) {
        if (err instanceof AccountSubmissionBlockedError) {
          return {
            success: false,
          };
        }
        const rawErrorMsg = err?.message || "No gateway response";
        const errorStatus = generationErrorStatusFromThrown(err);
        const statusUnknownMessage = instance.t(
          "canvas.generationStatusUnknown.description",
          {
            defaultValue: "生成请求未能完成，系统不会自动重试。",
          },
        );
        const userMessage =
          errorStatus === "status_unknown"
            ? statusUnknownMessage
            : semanticGenerationErrorCopy(stripErrorHtml(rawErrorMsg));
        canvasLog.error("img2image generation request threw", {
          error: rawErrorMsg,
          errorStatus,
        });
        if (replaceNodeId) {
          const store = generatingStateStore.getState();
          const prev = store.byNode.get(replaceNodeId);
          store.mark(replaceNodeId, {
            prompt,
            model: modelId,
            ...prev,
            error: rawErrorMsg,
            errorStatus,
          });
        }
        dedupedToast.error(userMessage);
        return {
          success: false,
          error: userMessage,
          errorStatus,
        };
      } finally {
        if (replaceNodeId) replaceTargets.current.delete(replaceNodeId);
      }
    },
    [
      assetMetadataStore,
      catalogScopeKey,
      httpClient,
      generatingStateStore,
      imageModelsCache,
      loadImageModels,
    ],
  );
  return {
    handleImg2Image,
    listImageModels,
  };
}
