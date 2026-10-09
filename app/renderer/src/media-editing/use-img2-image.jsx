// use-img2-image.jsx
import { reactExports, useQueryClient, useTranslation, dedupedToast, useAssetMetadataApi, useQuery, useMutation, instance, mediaLineageRequestId, MEDIA_LINEAGE_REQUEST_HEADER, AccountSubmissionBlockedError, canvasLog } from "../vendor.js";
import { recordAction } from "../infra/agent-ws-client.jsx";
import { Popover } from "../assets/apply-asset-change.jsx";
import { stripErrorHtml } from "../infra/create-recently-added-store.jsx";
import { useGeneratingStateApi } from "./parse-item.jsx";
import { pickUserMessage, BACKEND_MIDJOURNEY, HILO_SOURCE_HEADER, GENERATE_ERROR_CODE_SHUTDOWN, GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "../generation/push-inline.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useCanvasTagFilter, logReferenceSubmission } from "../canvas/use-canvas-tag-filter.js";
import { isHailuo03OrdinaryVideoTrialGeneratingPlaceholder, ScopedAsyncCache, visibleCanvasModels, retainedGenerationBlocksResubmit, RESUBMIT_BLOCKED_I18N, findCanvasModel, GENERATE_ERROR_CODE_QUEUE_PAUSED$2, semanticGenerationErrorCopy, generationErrorStatusFromResponse, persistedGenerateErrorReason, generationErrorStatusFromThrown } from "../generation/use-mention-models.jsx";
import { trackEvent } from "../infra/init-track.js";
import { getAssetMetaByNodeIdFromStore } from "../canvas/generating-media-area.jsx";
import {
  PRESET_COLOR_NAME_KEYS,
  isCanvasColorTag,
  resolveTagIds,
  MAX_VISIBLE_CANVAS_TAG_COLORS,
} from "../infra/normalize-tag-registry.js";
import { useCanvasTags } from "../canvas/use-canvas-tags.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import {
  HAILUO03_VIDEO_TRIAL_QUERY_KEY,
  fetchHailuo03VideoTrialStatus,
  claimHailuo03VideoTrial,
  EMPTY_HAILUO03_VIDEO_TRIAL_STATUS,
} from "../settings/use-feature-popup-action.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasGlobalTagManager } from "../canvas/canvas-global-tag-manager.jsx";
import { pickEditErrorMessage } from "../assets/use-asset-picker-host.jsx";
import { CanvasTagPickerPanel, useCanvasTagDownload } from "../canvas/use-canvas-tag-download.jsx";
const TAG_TRIGGER_SELECTOR =
  '[data-action-ui-id="canvas.node-tag-switch"], [data-action-ui-id="canvas.node-tag-trigger"]';
export function useCanvasQuickTags({
  canvasViewRef,
  closeNodeContextMenu,
  isActive: isActive2,
  isPresented,
  toolbarPlacement,
  workspaceAssets,
  workspaceId: workspaceId2,
  workspaceRoot,
}) {
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const { registry: tagRegistry, toggleTagForAssets } = useCanvasTags();
  const [picker, setPicker] = reactExports.useState(null);
  const tagRenameEditingRef = reactExports.useRef(false);
  const preservePickerAfterRenameBlurRef = reactExports.useRef(false);
  const tagTriggerPointerDownRef = reactExports.useRef(false);
  const tagFilter = useCanvasTagFilter({
    canvasViewRef,
    isPresented: isPresented ?? isActive2,
    workspaceAssets,
    workspaceId: workspaceId2,
  });
  const tagDownload = useCanvasTagDownload({
    workspaceAssets,
    workspaceId: workspaceId2,
    workspaceRoot,
  });
  const { activeTagId, setActiveTagId } = tagFilter;
  const resolveTagColors = reactExports.useCallback(
    (tagIds) =>
      resolveTagIds(tagIds, tagRegistry)
        .filter(isCanvasColorTag)
        .slice(0, MAX_VISIBLE_CANVAS_TAG_COLORS)
        .map((tag) => ({
          id: tag.id,
          color: tag.color,
          name: tag.name || t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") || tag.id,
          active: tag.id === activeTagId,
        })),
    [activeTagId, tagRegistry, t2],
  );
  const handleNodeTagRequest = reactExports.useCallback(
    (nodeId, anchor) => {
      const assetPath = getAssetMetaByNodeIdFromStore(assetMetadataStore, nodeId)?.path;
      if (!assetPath || !workspaceAssets.some((asset2) => asset2.path === assetPath)) return;
      closeNodeContextMenu();
      const stableAnchor = anchor.closest(".react-flow__node") ?? anchor;
      tagRenameEditingRef.current = false;
      preservePickerAfterRenameBlurRef.current = false;
      setPicker((current2) => {
        if (current2?.nodeId !== nodeId) {
          return {
            nodeId,
            assetPath,
            anchor: stableAnchor,
            trigger: anchor,
            open: true,
          };
        }
        return {
          ...current2,
          trigger: anchor,
          open: !current2.open,
        };
      });
    },
    [assetMetadataStore, closeNodeContextMenu, workspaceAssets],
  );
  const handleNodeTagRemoveRequest = reactExports.useCallback(
    async (nodeId, tagId) => {
      const assetMeta = getAssetMetaByNodeIdFromStore(assetMetadataStore, nodeId);
      const asset2 = assetMeta?.path
        ? workspaceAssets.find((workspaceAsset) => workspaceAsset.path === assetMeta.path)
        : void 0;
      const currentTagIds = assetMeta?.tagIds ?? asset2?.tagIds ?? [];
      if (!asset2 || !currentTagIds.includes(tagId)) return;
      setPicker((current2) =>
        current2?.nodeId === nodeId
          ? {
              ...current2,
              open: false,
            }
          : current2,
      );
      try {
        await toggleTagForAssets(tagId, [
          {
            ...asset2,
            tagIds: currentTagIds,
          },
        ]);
      } catch {
        dedupedToast.error(t2("canvasTags.saveFailed"));
      }
    },
    [assetMetadataStore, t2, toggleTagForAssets, workspaceAssets],
  );
  const handleQuickTagSelectionChange = reactExports.useCallback((nodeIds) => {
    if (tagRenameEditingRef.current || preservePickerAfterRenameBlurRef.current) return;
    setPicker((current2) =>
      current2 && !nodeIds.includes(current2.nodeId)
        ? {
            ...current2,
            open: false,
          }
        : current2,
    );
  }, []);
  const handleTagRenameEditingChange = reactExports.useCallback((editing) => {
    tagRenameEditingRef.current = editing;
  }, []);
  const preservePickerAfterRenameBlur = reactExports.useCallback(() => {
    preservePickerAfterRenameBlurRef.current = true;
  }, []);
  reactExports.useEffect(() => {
    if (isActive2 === false) setPicker(null);
  }, [isActive2]);
  reactExports.useEffect(() => {
    if (!picker) {
      tagRenameEditingRef.current = false;
      preservePickerAfterRenameBlurRef.current = false;
    }
  }, [picker]);
  reactExports.useEffect(() => {
    const handlePointerDown = (event) => {
      preservePickerAfterRenameBlurRef.current = false;
      tagTriggerPointerDownRef.current =
        event.target instanceof Element && !!event.target.closest(TAG_TRIGGER_SELECTOR);
    };
    const handlePointerEnd = () => {
      tagTriggerPointerDownRef.current = false;
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerEnd, true);
    document.addEventListener("pointercancel", handlePointerEnd, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerEnd, true);
      document.removeEventListener("pointercancel", handlePointerEnd, true);
    };
  }, []);
  reactExports.useEffect(() => {
    if (activeTagId && !tagRegistry.tags.some((tag) => tag.id === activeTagId)) {
      setActiveTagId(void 0);
    }
  }, [activeTagId, setActiveTagId, tagRegistry.tags]);
  const asset = picker
    ? workspaceAssets.find((workspaceAsset) => workspaceAsset.path === picker.assetPath)
    : void 0;
  const quickTagPopover = (
    <Popover
      open={!!picker?.open && !!asset}
      onOpenChange={(open, eventDetails) => {
        if (open) return;
        const target = eventDetails.event.target;
        const focusTarget =
          eventDetails.event instanceof FocusEvent ? eventDetails.event.relatedTarget : null;
        if (
          (eventDetails.reason === "outside-press" &&
            target instanceof Element &&
            target.closest(TAG_TRIGGER_SELECTOR)) ||
          (eventDetails.reason === "focus-out" &&
            (tagTriggerPointerDownRef.current ||
              (focusTarget instanceof Element && focusTarget.closest(TAG_TRIGGER_SELECTOR))))
        ) {
          eventDetails.cancel();
          return;
        }
        const wasEditing = tagRenameEditingRef.current;
        if (
          !wasEditing &&
          preservePickerAfterRenameBlurRef.current &&
          eventDetails.reason === "escape-key"
        ) {
          preservePickerAfterRenameBlurRef.current = false;
          setPicker((current2) =>
            current2
              ? {
                  ...current2,
                  open: false,
                }
              : current2,
          );
          return;
        }
        if (wasEditing || preservePickerAfterRenameBlurRef.current) {
          eventDetails.cancel();
          if (wasEditing && eventDetails.reason === "outside-press") {
            preservePickerAfterRenameBlurRef.current = true;
          }
          return;
        }
        setPicker((current2) =>
          current2
            ? {
                ...current2,
                open: false,
              }
            : current2,
        );
      }}
      onOpenChangeComplete={(open) => {
        if (open) return;
        setPicker((current2) =>
          current2?.nodeId === picker?.nodeId && !current2?.open ? null : current2,
        );
      }}
    >
      {picker && asset && (
        <PopoverContent
          anchor={picker.anchor}
          side="right"
          align="start"
          sideOffset={8}
          finalFocus={() => (picker.trigger.isConnected ? picker.trigger : false)}
          className="w-auto gap-0 p-1.5"
          data-action-ui-id="canvas.node-tag-popover"
        >
          <CanvasTagPickerPanel
            assets={[asset]}
            allowRename={true}
            embedded={true}
            selectionMode="single"
            onRenameEditingChange={handleTagRenameEditingChange}
            onRenameBlurSave={preservePickerAfterRenameBlur}
          />
        </PopoverContent>
      )}
    </Popover>
  );
  const toolDockLabelControl = (
    <CanvasGlobalTagManager
      placement={toolbarPlacement}
      workspaceId={workspaceId2}
      workspaceAssets={workspaceAssets}
      activeTagId={activeTagId}
      onActiveTagChange={setActiveTagId}
      focusedNodeIndex={tagFilter.focusedNodeIndex}
      matchedNodeCount={tagFilter.matchedNodeIds.length}
      onFocusPrevious={tagFilter.focusPrevious}
      onFocusNext={tagFilter.focusNext}
      onLocateNode={tagFilter.locateNode}
      onClearFilter={tagFilter.clearFilter}
      downloadEnabled={tagDownload.downloadEnabled}
      downloadingAll={tagDownload.downloadingAll}
      downloadingTagId={tagDownload.downloadingTagId}
      onDownloadAllTagged={tagDownload.downloadAllTagged}
      onDownloadTag={tagDownload.downloadTag}
    />
  );
  return {
    handleNodeTagRequest,
    handleNodeTagRemoveRequest,
    handleTagFilterKeyboardShortcut: tagFilter.handleKeyboardShortcut,
    handleQuickTagSelectionChange,
    quickTagPopover,
    resolveTagColors,
    tagRegistry,
    tagFilterActive: tagFilter.tagFilterActive,
    toolDockLabelControl,
  };
}
export function useHailuo03VideoSuperResolutionSubmit({
  httpClient,
  canvasGenerationErrorToastId,
}) {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    async (nodeId, sourceVideoPath, providerTaskId) => {
      try {
        const resp = await httpClient.hailuo03VideoSuperResolution({
          video_path: sourceVideoPath,
          provider_task_id: providerTaskId,
          resolution: "2K",
          source_node_id: nodeId,
          filename: `sr-${nodeId}`,
        });
        if (!resp.ok) {
          dedupedToast.error(
            stripErrorHtml(pickUserMessage(resp, t2("canvas.superResolution.error"))),
            {
              id: canvasGenerationErrorToastId,
            },
          );
        }
      } catch (err) {
        console.error("[canvas] hailuo03 video super-resolution failed:", err);
        dedupedToast.error(pickEditErrorMessage(err, t2("canvas.superResolution.error")), {
          id: canvasGenerationErrorToastId,
        });
      }
    },
    [canvasGenerationErrorToastId, httpClient, t2],
  );
}
export function useHailuo03VideoTrial() {
  const queryClient2 = useQueryClient();
  const statusQuery = useQuery({
    queryKey: HAILUO03_VIDEO_TRIAL_QUERY_KEY,
    queryFn: fetchHailuo03VideoTrialStatus,
    retry: 2,
    // 剩余次数展示在提交决策点上,任何触发时机都必须回源;缓存只用于
    // revalidate 完成前的即时渲染和失败兜底(queryFn 失败保留旧数据)。
    staleTime: 0,
  });
  const claimMutation = useMutation({
    mutationFn: claimHailuo03VideoTrial,
    onSuccess: (status) => {
      queryClient2.setQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY, status);
    },
  });
  const refresh = reactExports.useCallback(async () => {
    try {
      const status = await fetchHailuo03VideoTrialStatus();
      queryClient2.setQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY, status);
      return status;
    } catch {
      return (
        queryClient2.getQueryData(HAILUO03_VIDEO_TRIAL_QUERY_KEY) ??
        EMPTY_HAILUO03_VIDEO_TRIAL_STATUS
      );
    }
  }, [queryClient2]);
  return {
    status: statusQuery.data ?? EMPTY_HAILUO03_VIDEO_TRIAL_STATUS,
    isLoading: statusQuery.isLoading,
    isFetching: statusQuery.isFetching,
    isClaiming: claimMutation.isPending,
    claim: claimMutation.mutateAsync,
    refresh,
  };
}
const HAILUO03_VIDEO_TRIAL_REFRESH_DELAYS_MS = [0, 200, 300, 500, 1e3, 3e3, 5e3, 1e4, 3e4, 6e4];
const HAILUO03_VIDEO_TRIAL_BATCH_MAX_WAIT_MS = 2e3;
function wait(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
export function useHailuo03VideoTrialConsumptionRefresh({ sessionStore, status, refresh, t: t2 }) {
  const statusRef = reactExports.useRef(status);
  const mountedRef = reactExports.useRef(true);
  const pollingRef = reactExports.useRef(false);
  const expectedUseCountRef = reactExports.useRef(1);
  const queueStartedNodeIdsRef = reactExports.useRef(new Set());
  const lastNotifiedRemainingRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    statusRef.current = status;
    const lastNotifiedRemaining = lastNotifiedRemainingRef.current;
    if (lastNotifiedRemaining != null && status.remainingCount > lastNotifiedRemaining) {
      lastNotifiedRemainingRef.current = null;
    }
  }, [status]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const handleMaybeConsumed = reactExports.useCallback(
    async (expectedUseCount = 1) => {
      const normalizedExpectedUseCount = Number.isFinite(expectedUseCount)
        ? Math.max(1, Math.floor(expectedUseCount))
        : 1;
      expectedUseCountRef.current = Math.max(
        expectedUseCountRef.current,
        normalizedExpectedUseCount,
      );
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const before = statusRef.current;
        let beforeRemaining = before.claimed ? before.remainingCount : 0;
        let elapsedMs2 = 0;
        let baselineStartedAtMs = 0;
        for (const delayMs of HAILUO03_VIDEO_TRIAL_REFRESH_DELAYS_MS) {
          if (delayMs > 0) {
            await wait(delayMs);
            elapsedMs2 += delayMs;
          }
          if (!mountedRef.current) return;
          const next2 = await refresh();
          statusRef.current = next2;
          if (beforeRemaining > 0 && next2.claimed && next2.remainingCount < beforeRemaining) {
            const expectedConsumed = Math.min(beforeRemaining, expectedUseCountRef.current);
            const observedConsumed = beforeRemaining - next2.remainingCount;
            const batchWaitExpired =
              elapsedMs2 - baselineStartedAtMs >= HAILUO03_VIDEO_TRIAL_BATCH_MAX_WAIT_MS;
            if (observedConsumed < expectedConsumed && !batchWaitExpired) {
              continue;
            }
            if (lastNotifiedRemainingRef.current !== next2.remainingCount) {
              lastNotifiedRemainingRef.current = next2.remainingCount;
              dedupedToast.success(
                t2("canvas.hailuo03Trial.freeUsed", {
                  count: observedConsumed,
                  defaultValue: "本次免费，已使用 {{count}} 次免费机会",
                }),
              );
            }
            return;
          }
          if (beforeRemaining <= 0 && next2.claimed && next2.remainingCount > 0) {
            beforeRemaining = next2.remainingCount;
            baselineStartedAtMs = elapsedMs2;
            continue;
          }
          if (beforeRemaining <= 0 || !next2.claimed || next2.remainingCount <= 0) {
            return;
          }
        }
      } finally {
        pollingRef.current = false;
        expectedUseCountRef.current = 1;
      }
    },
    [refresh, t2],
  );
  reactExports.useEffect(() => {
    return sessionStore.onCanvasUpdated((update2) => {
      for (const removedId of update2.removedNodeIds ?? []) {
        queueStartedNodeIdsRef.current.delete(removedId);
      }
      const eligibility = statusRef.current.eligibility;
      const node2 = [...(update2.addedNodes ?? []), ...(update2.updatedNodes ?? [])].find((item) =>
        isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(item, eligibility),
      );
      if (!node2 || queueStartedNodeIdsRef.current.has(node2.id)) {
        return;
      }
      queueStartedNodeIdsRef.current.add(node2.id);
      void handleMaybeConsumed().catch(() => void 0);
    });
  }, [handleMaybeConsumed, sessionStore]);
  return handleMaybeConsumed;
}
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
          imageModelsCache.peek(catalogScopeKey) ?? (await loadImageModels().catch(() => []));
        const model = findCanvasModel(models, modelId);
        const backend = backendOverride ?? model?.backend ?? "nano_banana";
        const effectiveCount =
          backend === BACKEND_MIDJOURNEY ? 1 : Math.max(1, Math.min(9, Math.floor(count2 ?? 1)));
        recordAction("generate:img2img", {
          model: modelId,
        });
        trackEvent(TRACK_EVENTS.CANVAS_GENERATE_SUBMIT, {
          popover_type: imagePaths.length === 0 ? "t2i" : "i2i",
          node_id: nodeId,
          submit_mode: !replaceNodeId ? "new_node" : replaceTargetIsEmpty ? "single" : "replace",
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
        if (err instanceof AccountSubmissionBlockedError) {
          return {
            success: false,
          };
        }
        const rawErrorMsg = err?.message || "No gateway response";
        const errorStatus = generationErrorStatusFromThrown(err);
        const statusUnknownMessage = instance.t("canvas.generationStatusUnknown.description", {
          defaultValue: "生成请求未能完成，系统不会自动重试。",
        });
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
