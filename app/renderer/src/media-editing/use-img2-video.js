// use-img2-video.js
import {
  dedupedToast,
  instance,
  reactExports,
  workspaceLog,
} from "../vendor.js";
import {
  areHailuo03VideoTrialReferencesEligible,
  findCanvasModel,
  generationErrorStatusFromResponse,
  generationErrorStatusFromThrown,
  imageModeSubType,
  includesString,
  isHailuo03VideoTrialEligibleResolution,
  persistedGenerateErrorReason,
  RESUBMIT_BLOCKED_I18N,
  retainedGenerationBlocksResubmit,
  ScopedAsyncCache,
  semanticGenerationErrorCopy,
  visibleCanvasModels,
} from "../generation/use-mention-models.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { useGeneratingStateApi } from "./package.jsx";
import {
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_SHUTDOWN,
  HILO_SOURCE_HEADER,
  pickUserMessage,
} from "../generation/normalize-skill-detail-metadata.js";
function isEnoentErrorMessage(message2) {
  return /ENOENT|no such file or directory/i.test(message2);
}
function classifyVideoGenerationMode(input) {
  const kinds = [
    input.imageRefCount > 0,
    input.videoRefCount > 0,
    input.audioRefCount > 0,
  ].filter(Boolean).length;
  if (kinds > 1) return "multimodal";
  if (input.videoRefCount > 0) return "v2v";
  if (input.imageRefCount > 0) return "i2v";
  if (input.audioRefCount > 0) return "a2v";
  return "t2v";
}
function modelValues(model, modelId) {
  return [
    modelId,
    model?.id,
    model?.model_name,
    model?.pricingId,
    model?.name,
  ].filter((value) => typeof value === "string");
}
function isHailuo03VideoTrialModel(model, modelId, eligibility) {
  if (!eligibility) return false;
  return modelValues(model, modelId).some((value) =>
    includesString(eligibility.models, value),
  );
}
function isHailuo03OrdinaryVideoTrialSubmit(
  model,
  modelId,
  params,
  eligibility,
  imagePaths = [],
  videoPaths = [],
  audioPaths = [],
) {
  const imageMode = params.image_mode;
  const subType = imageModeSubType(imageMode);
  return (
    isHailuo03VideoTrialModel(model, modelId, eligibility) &&
    includesString(eligibility?.subTypes, subType) &&
    isHailuo03VideoTrialEligibleResolution(params.resolution, eligibility) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    })
  );
}
const CANVAS_VIDEO_MODEL_DISPLAY_ORDER = {
  "MiniMax-H3": 0,
  "MiniMax-H3-Max": 1,
  "MiniMax-H3-Max-Turbo": 2,
};
function visibleCanvasVideoModels(models) {
  return visibleCanvasModels(models)
    .map((model, index2) => ({
      model,
      index: index2,
    }))
    .sort((left, right) => {
      const leftOrder = CANVAS_VIDEO_MODEL_DISPLAY_ORDER[left.model.id] ?? 100;
      const rightOrder =
        CANVAS_VIDEO_MODEL_DISPLAY_ORDER[right.model.id] ?? 100;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ model }) => model);
}
const MINIMAX_H3_NORMALIZED_MODEL_ID = "minimax-h3";
const MINIMAX_H3_NORMALIZED_BACKEND_ID = "minimax-v3";
function normalizeModelValue(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
    : "";
}
function isMiniMaxH3ModelValue(value) {
  return normalizeModelValue(value) === MINIMAX_H3_NORMALIZED_MODEL_ID;
}
function isMiniMaxH3VideoPromptRequired(args) {
  const { backend, modelId, model } = args;
  return (
    normalizeModelValue(backend) === MINIMAX_H3_NORMALIZED_BACKEND_ID ||
    [modelId, model?.id, model?.model_name, model?.pricingId, model?.name].some(
      isMiniMaxH3ModelValue,
    )
  );
}
function isMiniMaxH3VideoPromptMissing(args) {
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  return isMiniMaxH3VideoPromptRequired(args) && prompt.trim().length === 0;
}
function buildCanvasVideoSubmitTracking(input) {
  return {
    popover_type: "i2v",
    node_id: input.nodeId,
    submit_mode: input.submitMode,
    model_id: input.modelId,
    backend: input.backend,
    series_id: input.seriesId,
    generation_mode: classifyVideoGenerationMode({
      imageRefCount: input.imageRefCount,
      videoRefCount: input.videoRefCount,
      audioRefCount: input.audioRefCount,
    }),
    prompt_length: input.promptLength,
    ref_count: input.imageRefCount,
    image_ref_count: input.imageRefCount,
    video_ref_count: input.videoRefCount,
    audio_ref_count: input.audioRefCount,
    count: input.outputCount,
    output_count: input.outputCount,
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
    duration: input.duration,
  };
}
const GENERATE_ERROR_CODE_QUEUE_PAUSED = "queue_paused";
const MODEL_LIST_TIMEOUT_MS = 1e4;
const MAX_VIDEOS_PER_SUBMIT = 9;
function formatGenerateError(message2) {
  if (isEnoentErrorMessage(message2)) {
    return instance.t("canvas.generateRefFileMissing", {
      defaultValue: "参考素材文件不存在或路径已失效，请确认文件仍在工作区内",
    });
  }
  return message2;
}
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
      const dedupeReplaceTarget =
        !!replaceNodeId && submission?.intent !== "resume";
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
          videoModelsCache.peek(catalogScopeKey) ??
          (await loadVideoModels().catch(() => []));
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
          submitMode: !replaceNodeId
            ? "new_node"
            : newRound
              ? "new_round"
              : "replace",
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
            resp.error_code === GENERATE_ERROR_CODE_QUEUE_PAUSED
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
          if (errorStatus === "recoverable_error")
            dedupedToast.warning(userMessage);
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
        const rawErrorMsg = formatGenerateError(
          err?.message || "No gateway response",
        );
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
        if (replaceNodeId && dedupeReplaceTarget)
          replaceTargets.current.delete(replaceNodeId);
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
