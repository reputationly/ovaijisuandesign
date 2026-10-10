// use-txt2-text.js
import { instance, reactExports } from "../vendor.js";
import { canvasLog, dedupedToast } from "../infra/agent-http-client.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { useGeneratingStateApi } from "../media-editing/package.jsx";
import {
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_SHUTDOWN,
  HILO_SOURCE_HEADER,
  pickUserMessage,
} from "../generation/normalize-skill-detail-metadata.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  generationErrorStatusFromResponse,
  generationErrorStatusFromThrown,
  persistedGenerateErrorReason,
  RESUBMIT_BLOCKED_I18N,
  retainedGenerationBlocksResubmit,
  ScopedAsyncCache,
  semanticGenerationErrorCopy,
} from "../generation/use-mention-models.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";

const TEXT_MODEL_CACHE_TTL_MS = 6e4;

function providerOf(modelId) {
  const idx = modelId.indexOf("/");
  return idx >= 0 ? modelId.slice(0, idx) : modelId;
}

export function useTxt2Text({ httpClient, catalogScopeKey }) {
  const generatingStateStore = useGeneratingStateApi();
  const inflight = reactExports.useRef(new Set());
  const textModelsCache = reactExports.useRef(new ScopedAsyncCache()).current;
  textModelsCache.setScope(catalogScopeKey);
  const listTextModels = reactExports.useCallback(
    () =>
      textModelsCache.load(
        catalogScopeKey,
        async () => (await httpClient.listModels()).textModels,
        TEXT_MODEL_CACHE_TTL_MS,
      ),
    [catalogScopeKey, httpClient, textModelsCache],
  );
  const handleTxt2Text = reactExports.useCallback(
    async (
      nodeId,
      prompt,
      modelId,
      params,
      imagePaths,
      textPaths,
      videoPaths,
      audioPaths,
    ) => {
      if (inflight.current.has(nodeId)) {
        return {
          success: true,
        };
      }
      if (
        retainedGenerationBlocksResubmit(
          generatingStateStore.getState().byNode.get(nodeId),
        )
      ) {
        dedupedToast.warning(instance.t(...RESUBMIT_BLOCKED_I18N));
        return {
          success: false,
          error: "resubmit blocked: retained generation task",
        };
      }
      inflight.current.add(nodeId);
      const store = generatingStateStore.getState();
      store.mark(nodeId, {
        prompt,
        model: modelId,
        modelId,
        params,
        generationStartedAt: new Date().toISOString(),
      });
      recordAction("generate:t2t", {
        model: modelId,
      });
      trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
        popover_type: "t2t",
        node_id: nodeId,
        submit_mode: "replace",
        model_id: modelId,
        backend: providerOf(modelId),
        prompt_length: prompt.length,
        ref_count:
          (imagePaths?.length ?? 0) +
          (textPaths?.length ?? 0) +
          (videoPaths?.length ?? 0) +
          (audioPaths?.length ?? 0),
      });
      const headers = {
        [HILO_SOURCE_HEADER]: "canvas",
      };
      try {
        const resp = await httpClient.generateText(
          {
            model_id: modelId,
            prompt,
            // Chip-form copy for node persistence; the gateway interceptor
            // compiles `prompt` into the model-facing `图片N` dialect in place.
            display_prompt: prompt,
            params,
            source_node_id: nodeId,
            replace_node_id: nodeId,
            ...(imagePaths && imagePaths.length > 0
              ? {
                  image_paths: imagePaths,
                }
              : {}),
            ...(textPaths && textPaths.length > 0
              ? {
                  text_paths: textPaths,
                }
              : {}),
            ...(videoPaths && videoPaths.length > 0
              ? {
                  video_paths: videoPaths,
                }
              : {}),
            ...(audioPaths && audioPaths.length > 0
              ? {
                  audio_paths: audioPaths,
                }
              : {}),
          },
          {
            headers,
          },
        );
        if (!resp.ok) {
          if (resp.error_code === GENERATE_ERROR_CODE_SHUTDOWN) {
            return {
              success: true,
            };
          }
          const message2 = pickUserMessage(
            resp,
            instance.t("canvas.generateFailed", {
              defaultValue: "生成失败，请稍后重试",
            }),
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
                : stripErrorHtml(message2);
          if (errorStatus === "recoverable_error")
            dedupedToast.warning(userMessage);
          else dedupedToast.error(userMessage);
          const retryPayload =
            resp.error_code === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
              ? {
                  kind: "text",
                  sourceNodeId: nodeId,
                  prompt,
                  modelId,
                  params,
                  imagePaths,
                  textPaths,
                  videoPaths,
                  audioPaths,
                }
              : void 0;
          generatingStateStore.getState().mark(nodeId, {
            prompt,
            model: modelId,
            modelId,
            params,
            error: message2,
            errorStatus,
            errorReason: persistedGenerateErrorReason(resp.error_code),
            retryPayload,
            traceId: resp.cloud_trace_id,
          });
          return {
            success: false,
            error: userMessage,
            errorStatus,
          };
        }
        generatingStateStore.getState().clear(nodeId);
        return {
          success: true,
        };
      } catch (err) {
        const diagnosticMessage = err?.message || "No gateway response";
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
            : semanticGenerationErrorCopy(stripErrorHtml(diagnosticMessage));
        canvasLog.error("txt2text generation request threw", {
          error: diagnosticMessage,
          errorStatus,
        });
        dedupedToast.error(userMessage);
        generatingStateStore.getState().mark(nodeId, {
          prompt,
          model: modelId,
          modelId,
          params,
          error: diagnosticMessage,
          errorStatus,
        });
        return {
          success: false,
          error: userMessage,
          errorStatus,
        };
      } finally {
        inflight.current.delete(nodeId);
      }
    },
    [httpClient, generatingStateStore],
  );
  return {
    handleTxt2Text,
    listTextModels,
  };
}
