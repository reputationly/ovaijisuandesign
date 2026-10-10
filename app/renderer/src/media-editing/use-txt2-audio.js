// use-txt2-audio.js
import { instance, reactExports } from "../vendor.js";
import { canvasLog, dedupedToast } from "../infra/agent-http-client.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { useGeneratingStateApi } from "./package.jsx";
import {
  BACKEND_ELEVENLABS_MUSIC,
  BACKEND_MINIMAX_MUSIC,
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

const BACKEND_MINIMAX_MUSIC_COVER = "minimax_music_cover";

const GENERATE_ERROR_CODE_QUEUE_PAUSED = "queue_paused";

export function useTxt2Audio({ httpClient, catalogScopeKey }) {
  const generatingStateStore = useGeneratingStateApi();
  const replaceTargets = reactExports.useRef(new Set());
  const audioModelsCache = reactExports.useRef(new ScopedAsyncCache()).current;
  const voicesCache = reactExports.useRef(new ScopedAsyncCache()).current;
  audioModelsCache.setScope(catalogScopeKey);
  voicesCache.setScope(catalogScopeKey);
  const fetchAudioModels = reactExports.useCallback(
    () =>
      audioModelsCache.load(catalogScopeKey, async () => {
        const { audioModels } = await httpClient.listModels();
        return audioModels.filter(
          (model) =>
            model.visibility !== "hidden" && model.id !== "MiniMax-H3 Audio",
        );
      }),
    [audioModelsCache, catalogScopeKey, httpClient],
  );
  const fetchTtsVoices = reactExports.useCallback(
    () =>
      voicesCache.load(catalogScopeKey, () => httpClient.listSpeechVoices()),
    [catalogScopeKey, httpClient, voicesCache],
  );
  const handleTxt2Audio = reactExports.useCallback(
    async (
      nodeId,
      prompt,
      modelId,
      params,
      replaceNodeId,
      replaceTargetIsEmpty,
      backendOverride,
      imagePaths,
      audioPaths,
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
        const models = audioModelsCache.peek(catalogScopeKey) ?? [];
        const model = models.find(
          (m3) =>
            m3.id === modelId ||
            m3.model_name === modelId ||
            m3.name === modelId,
        );
        const backend = backendOverride ?? model?.backend ?? "minimax_tts";
        const refImagePaths = imagePaths ?? [];
        const refAudioPaths = audioPaths ?? [];
        const refCount = refImagePaths.length + refAudioPaths.length;
        recordAction("generate:audio", {
          type: backend,
        });
        trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
          popover_type: "t2a",
          node_id: nodeId,
          submit_mode: !replaceNodeId
            ? "new_node"
            : replaceTargetIsEmpty
              ? "single"
              : "replace",
          model_id: modelId,
          backend,
          prompt_length: prompt.length,
          ref_count: refCount,
          has_lyrics: !!params.lyrics?.trim(),
          is_instrumental: params.is_instrumental === "instrumental",
        });
        const isMusic =
          backend === BACKEND_MINIMAX_MUSIC ||
          backend === BACKEND_MINIMAX_MUSIC_COVER ||
          backend === BACKEND_ELEVENLABS_MUSIC;
        const submit = isMusic
          ? httpClient.generateMusic.bind(httpClient)
          : httpClient.generateSpeech.bind(httpClient);
        const resp = await submit(
          {
            backend,
            model_id: modelId,
            prompt,
            params: model?.model_name
              ? {
                  ...params,
                  model_name: model.model_name,
                }
              : params,
            source_node_id: nodeId,
            replace_node_id: replaceNodeId,
            filename: `txt2audio-${nodeId}`,
            // Reference files (seed-audio-1.0). Only attach when present so
            // the plain TTS / music payload shape stays unchanged. `@图片N` /
            // `@音频N` in the prompt refer to these by 1-based upload order.
            ...(refImagePaths.length > 0
              ? {
                  image_paths: refImagePaths,
                }
              : {}),
            ...(refAudioPaths.length > 0
              ? {
                  audio_paths: refAudioPaths,
                }
              : {}),
            ...(textPaths?.length
              ? {
                  text_paths: textPaths,
                }
              : {}),
          },
          {
            headers: {
              [HILO_SOURCE_HEADER]: "canvas",
            },
          },
        );
        if (!resp.ok) {
          if (
            resp.error_code === GENERATE_ERROR_CODE_SHUTDOWN ||
            resp.error_code === GENERATE_ERROR_CODE_QUEUE_PAUSED
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
                    kind: "audio",
                    sourceNodeId: nodeId,
                    prompt,
                    modelId,
                    backend,
                    params,
                    // Preserve seed-audio references so the retry re-uploads the
                    // same clips the `@音频N` / `@图片N` prompt tokens point at.
                    ...(refImagePaths.length > 0
                      ? {
                          imagePaths: refImagePaths,
                        }
                      : {}),
                    ...(refAudioPaths.length > 0
                      ? {
                          audioPaths: refAudioPaths,
                        }
                      : {}),
                    ...(textPaths?.length
                      ? {
                          textPaths,
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
        const rawErrorMsg =
          (err instanceof Error ? err.message : String(err)) ||
          "No gateway response";
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
        canvasLog.error("txt2audio generation request threw", {
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
    [audioModelsCache, catalogScopeKey, httpClient, generatingStateStore],
  );
  const handleDesignVoice = reactExports.useCallback(
    async (nodeId, prompt, previewText) => {
      const trimmedPrompt = prompt.trim();
      const trimmedPreview = previewText.trim();
      if (!trimmedPrompt || !trimmedPreview) {
        dedupedToast.warning(
          instance.t(
            "canvas.voiceDesign.missingFields",
            "Both voice description and preview text are required.",
          ),
        );
        return;
      }
      try {
        await httpClient.designVoice({
          prompt: trimmedPrompt,
          preview_text: trimmedPreview,
          source_node_id: nodeId,
        });
      } catch (err) {
        console.error("[useTxt2Audio] designVoice failed:", err);
        dedupedToast.error(
          instance.t(
            "canvas.voiceDesign.failedToast",
            "Voice design failed; please try again.",
          ),
        );
      }
    },
    [httpClient],
  );
  return {
    handleTxt2Audio,
    handleDesignVoice,
    fetchAudioModels,
    fetchTtsVoices,
  };
}
