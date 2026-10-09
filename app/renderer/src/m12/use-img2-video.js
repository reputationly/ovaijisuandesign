// use-img2-video.js
import {
  reactExports,
  dedupedToast,
  TRACK_EVENTS,
  recordAction,
  pickUserMessage,
  stripErrorHtml,
  useGeneratingStateApi,
  ScopedAsyncCache,
  retainedGenerationBlocksResubmit,
  instance,
  RESUBMIT_BLOCKED_I18N,
  findCanvasModel,
  HILO_SOURCE_HEADER,
  GENERATE_ERROR_CODE_SHUTDOWN,
  semanticGenerationErrorCopy,
  generationErrorStatusFromResponse,
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  persistedGenerateErrorReason,
  generationErrorStatusFromThrown,
  canvasLog,
  buildCanvasVideoSubmitTracking,
  MODEL_LIST_TIMEOUT_MS,
  visibleCanvasVideoModels,
  MAX_VIDEOS_PER_SUBMIT,
  isMiniMaxH3VideoPromptMissing,
  isHailuo03OrdinaryVideoTrialSubmit,
  GENERATE_ERROR_CODE_QUEUE_PAUSED$1,
  formatGenerateError,
  workspaceLog,
  BACKEND_MINIMAX_MUSIC,
  BACKEND_MINIMAX_MUSIC_COVER,
  BACKEND_ELEVENLABS_MUSIC,
  GENERATE_ERROR_CODE_QUEUE_PAUSED,
} from "../vendor.js";
import { trackEvent } from "../asset-center/shared/init-track.js";
function trackCanvasVideoSubmit(input) {
  trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
    ...buildCanvasVideoSubmitTracking(input),
  });
}
export function useImg2Video({
  httpClient,
  catalogScopeKey,
  hailuo03VideoTrialStatus,
  onHailuo03VideoTrialMaybeConsumed,
}) {
  const generatingStateStore = useGeneratingStateApi();
  const replaceTargets = reactExports.useRef(new Set());
  const videoModelsCache = reactExports.useRef(new ScopedAsyncCache()).current;
  videoModelsCache.setScope(catalogScopeKey);
  const loadVideoModels = reactExports.useCallback(
    () =>
      videoModelsCache.load(catalogScopeKey, async () => {
        const { videoModels } = await httpClient.listModels({
          timeoutMs: MODEL_LIST_TIMEOUT_MS,
        });
        return videoModels;
      }),
    [catalogScopeKey, httpClient, videoModelsCache],
  );
  const listVideoModels = reactExports.useCallback(
    async () => visibleCanvasVideoModels(await loadVideoModels()),
    [loadVideoModels],
  );
  const handleImg2Video = reactExports.useCallback(
    async (
      nodeId,
      prompt,
      modelId,
      params,
      imagePaths,
      videoPaths,
      audioPaths,
      replaceNodeId,
      displayPrompt,
      count2,
      newRound,
      backendOverride,
      textPaths,
      submission,
    ) => {
      const dedupeReplaceTarget = !!replaceNodeId && submission?.intent !== "resume";
      if (replaceNodeId && dedupeReplaceTarget) {
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
      let lastSubmitModelId = modelId;
      try {
        const effectiveCount = Math.max(
          1,
          Math.min(MAX_VIDEOS_PER_SUBMIT, Math.floor(count2 ?? 1)),
        );
        const models =
          videoModelsCache.peek(catalogScopeKey) ?? (await loadVideoModels().catch(() => []));
        const model = findCanvasModel(models, modelId);
        const backend = backendOverride ?? model?.backend ?? "minimax";
        const submitModelId = model?.id ?? modelId;
        lastSubmitModelId = submitModelId;
        const submitParams = model?.model_name
          ? {
              ...params,
              model_name: model.model_name,
            }
          : params;
        if (
          isMiniMaxH3VideoPromptMissing({
            backend,
            modelId: submitModelId,
            model,
            prompt,
          })
        ) {
          const error = instance.t("canvas.promptRequired", {
            defaultValue: "输入 prompt",
          });
          dedupedToast.error(error);
          return {
            success: false,
            error,
          };
        }
        recordAction("generate:img2video", {
          model: submitModelId,
        });
        trackCanvasVideoSubmit({
          nodeId,
          submitMode: !replaceNodeId ? "new_node" : newRound ? "new_round" : "replace",
          modelId: submitModelId,
          backend,
          seriesId: model?.series_id,
          promptLength: prompt.length,
          imageRefCount: imagePaths.length,
          videoRefCount: videoPaths.length,
          audioRefCount: audioPaths.length,
          outputCount: effectiveCount,
          aspectRatio: params.aspect_ratio ?? params.ratio,
          resolution: params.resolution,
          duration: params.duration,
        });
        const headers = {
          [HILO_SOURCE_HEADER]: "canvas",
        };
        const shouldRefreshHailuo03Trial = isHailuo03OrdinaryVideoTrialSubmit(
          model,
          submitModelId,
          submitParams,
          hailuo03VideoTrialStatus?.eligibility,
          imagePaths,
          videoPaths,
          audioPaths,
        );
        if (shouldRefreshHailuo03Trial) {
          void (async () => {
            await onHailuo03VideoTrialMaybeConsumed?.(effectiveCount);
          })().catch(() => void 0);
        }
        const resp = await httpClient.generateVideo(
          {
            backend,
            model_id: submitModelId,
            prompt,
            display_prompt: displayPrompt,
            image_paths: imagePaths,
            video_paths: videoPaths.length > 0 ? videoPaths : void 0,
            audio_paths: audioPaths.length > 0 ? audioPaths : void 0,
            text_paths: textPaths?.length ? textPaths : void 0,
            params: submitParams,
            source_node_id: nodeId,
            replace_node_id: replaceNodeId,
            new_round: newRound,
            count: newRound || effectiveCount > 1 ? effectiveCount : void 0,
            filename: `img2video-${nodeId}`,
          },
          {
            headers,
          },
        );
        if (!resp.ok) {
          if (
            resp.error_code === GENERATE_ERROR_CODE_SHUTDOWN ||
            resp.error_code === GENERATE_ERROR_CODE_QUEUE_PAUSED$1
          ) {
            return {
              success: true,
            };
          }
          const rawErrorMsg = formatGenerateError(
            pickUserMessage(
              resp,
              instance.t("canvas.generateFailed", {
                defaultValue: "生成失败，请稍后重试",
              }),
            ),
          );
          const toastErrorMsg = semanticGenerationErrorCopy(stripErrorHtml(rawErrorMsg));
          const errorStatus = generationErrorStatusFromResponse(resp.failure_presentation);
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
                    kind: "video",
                    sourceNodeId: nodeId,
                    prompt,
                    modelId: submitModelId,
                    params: submitParams,
                    backend,
                    imagePaths,
                    videoPaths,
                    audioPaths,
                    ...(textPaths?.length
                      ? {
                          textPaths,
                        }
                      : {}),
                    ...(displayPrompt
                      ? {
                          displayPrompt,
                        }
                      : {}),
                    ...(newRound
                      ? {
                          newRound: true,
                        }
                      : {}),
                    ...(newRound || effectiveCount > 1
                      ? {
                          count: effectiveCount,
                        }
                      : {}),
                  }
                : void 0;
            store.mark(replaceNodeId, {
              prompt,
              model: submitModelId,
              ...prev,
              error: rawErrorMsg,
              errorStatus,
              errorReason: persistedGenerateErrorReason(resp.error_code),
              retryPayload,
              // Unconditional so it overrides any stale traceId from `...prev`.
              traceId: resp.cloud_trace_id,
            });
          }
          if (errorStatus === "recoverable_error") dedupedToast.warning(userMessage);
          else dedupedToast.error(userMessage);
          return {
            success: false,
            error: userMessage,
            errorStatus,
          };
        }
        if (shouldRefreshHailuo03Trial) {
          void (async () => {
            await onHailuo03VideoTrialMaybeConsumed?.(effectiveCount);
          })().catch(() => void 0);
        }
        return {
          success: true,
        };
      } catch (err) {
        const rawErrorMsg = formatGenerateError(err?.message || "No gateway response");
        const errorStatus = generationErrorStatusFromThrown(err);
        const statusUnknownMessage = instance.t("canvas.generationStatusUnknown.description", {
          defaultValue: "生成请求未能完成，系统不会自动重试。",
        });
        const userMessage =
          errorStatus === "status_unknown"
            ? statusUnknownMessage
            : semanticGenerationErrorCopy(stripErrorHtml(rawErrorMsg));
        workspaceLog.error("img2video generation request threw", {
          error: rawErrorMsg,
          errorStatus,
          model: lastSubmitModelId,
        });
        if (replaceNodeId) {
          const store = generatingStateStore.getState();
          const prev = store.byNode.get(replaceNodeId);
          store.mark(replaceNodeId, {
            prompt,
            model: lastSubmitModelId,
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
        if (replaceNodeId && dedupeReplaceTarget) replaceTargets.current.delete(replaceNodeId);
      }
    },
    [
      catalogScopeKey,
      httpClient,
      generatingStateStore,
      hailuo03VideoTrialStatus?.eligibility,
      loadVideoModels,
      onHailuo03VideoTrialMaybeConsumed,
      videoModelsCache,
    ],
  );
  return {
    handleImg2Video,
    listVideoModels,
  };
}
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
          (model) => model.visibility !== "hidden" && model.id !== "MiniMax-H3 Audio",
        );
      }),
    [audioModelsCache, catalogScopeKey, httpClient],
  );
  const fetchTtsVoices = reactExports.useCallback(
    () => voicesCache.load(catalogScopeKey, () => httpClient.listSpeechVoices()),
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
          (m3) => m3.id === modelId || m3.model_name === modelId || m3.name === modelId,
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
          submit_mode: !replaceNodeId ? "new_node" : replaceTargetIsEmpty ? "single" : "replace",
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
          const toastErrorMsg = semanticGenerationErrorCopy(stripErrorHtml(rawErrorMsg));
          const errorStatus = generationErrorStatusFromResponse(resp.failure_presentation);
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
          if (errorStatus === "recoverable_error") dedupedToast.warning(userMessage);
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
          (err instanceof Error ? err.message : String(err)) || "No gateway response";
        const errorStatus = generationErrorStatusFromThrown(err);
        const statusUnknownMessage = instance.t("canvas.generationStatusUnknown.description", {
          defaultValue: "生成请求未能完成，系统不会自动重试。",
        });
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
          instance.t("canvas.voiceDesign.failedToast", "Voice design failed; please try again."),
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
