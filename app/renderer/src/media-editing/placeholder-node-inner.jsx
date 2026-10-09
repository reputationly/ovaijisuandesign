// placeholder-node-inner.jsx
import {
  resolveReferenceImages,
  resolveReferenceVideos,
} from "./base-backend.jsx";
import {
  resolveReferenceAudios,
  resolveReferenceTexts,
  usePopoverCloseWithDeselect,
} from "../generation/resolve-reference-texts.js";
import { buildImageNodeView } from "../canvas/build-slot-from-node.js";
import {
  BACKEND_VIBE_STORYBOARD,
  dedupedToast,
  Handle,
  Position,
  reactExports,
  useAssetMetadataApi,
  useAssetMetadataStore,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { VideoMultiOverlay } from "./video-multi-overlay.jsx";
import {
  useModelForAsset,
  useRegisterZoomCounter,
} from "../infra/create-recently-added-store.js";
import { resolvePlaceholderCardSize } from "../infra/shallow-copy.js";
import { isGenerationErrorStatus } from "../canvas/compute-group-bounds-from-children.js";
import {
  MEDIA_NODE_RADIUS,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "../generation/normalize-skill-detail-metadata.js";
import {
  useIsOverlayOpen,
  useMultiImageOverlayApi,
  useSubImages,
} from "./use-start-cloud-edit-from-node.js";
import { useMultiImageActions } from "./use-multi-image-actions.js";
import { ImagePlaceholderIcon } from "../canvas/file-missing-icon.jsx";
import {
  AudioPlaceholderIcon,
  TextPlaceholderIcon,
  VideoPlaceholderIcon,
} from "../canvas/generating-media-area.jsx";
import { translateModelName } from "../generation/missing-asset-card.jsx";
import { MediaErrorCard } from "../generation/media-error-card.jsx";
import {
  lightboxItemsFromSlots,
  readGenerationAttemptId,
  readGenerationStartedAt,
  readGenerationSubmittedAt,
  resolveLightboxIndexForSlot,
  submitAfterOptionalDraftFlush,
  useSimulatedProgress,
} from "./use-warn-missing-asset-meta.jsx";
import { resolveImageGenerationEstimateSeconds } from "../generation/to-workspace-browser-url.js";
import {
  GenerationWaitEstimate,
  NodeFrameStroke,
  NodeShell,
  normalizeEstimatedWaitSeconds,
  QueueGenerationControl,
} from "../canvas/node-shell-inner.jsx";
import { getPopoverDraftMap } from "../canvas/is-reexecutable-generation-node.js";
import { useUpstreamTextContent } from "../assets/parse-prompt-to-tiptap.js";
import {
  popoverDraftHasUserEdits,
  resolveDraftReferencePaths,
  resolveEditableTextReferencePaths,
} from "../generation/param-label-fallbacks.js";
import { I2VPopover } from "./free-path-shape.js";
import { I2IPopover } from "../generation/model-param-select.jsx";
import { ImageLightbox } from "./image-lightbox.jsx";
import { VideoLightbox } from "./video-lightbox.jsx";
import { isMiniMaxH3MaxModelValue } from "../generation/i2-v-aspect-ratio-field.jsx";
import {
  AUDIO_FULL_BODY_POPOVER_GAP_OFFSET,
  TxtPopover,
} from "./audio-full-body-popover-gap-offset.js";
import {
  CountBadge,
  useGenerationWaitEstimate,
} from "./compute-multi-image-grid-positions.jsx";
import { ImageSlotBody } from "./image-slot-body.jsx";
import { MultiImageOverlay } from "./ready-sub-image-card.jsx";
import {
  ROUND_DOTS_POPOVER_GAP_OFFSET,
  RoundDots,
} from "./round-dots-inner.jsx";
import {
  StoryboardGridPopover,
  useImageLightbox,
} from "./use-image-inplace-edit.jsx";
function buildPlaceholderImageNodeView(
  nodeId,
  data2,
  subImages,
  metaById,
  mainRound,
  nodeAssetId,
) {
  return buildImageNodeView(
    nodeId,
    data2,
    subImages,
    metaById,
    false,
    mainRound,
    nodeAssetId,
  );
}
function resolvePlaceholderReferencePaths({
  incomingSourceIds,
  referenceImageIds,
  referenceVideoIds,
  referenceAudioIds,
  assetMetadataStore,
  getNodeById,
}) {
  return {
    imagePaths: resolveReferenceImages(
      incomingSourceIds,
      referenceImageIds,
      assetMetadataStore,
      getNodeById,
    ),
    videoPaths: resolveReferenceVideos(
      incomingSourceIds,
      referenceVideoIds,
      assetMetadataStore,
    ),
    audioPaths: resolveReferenceAudios(
      incomingSourceIds,
      referenceAudioIds,
      assetMetadataStore,
    ),
  };
}
function imageViewPrimaryPrompt(data2) {
  const d2 = data2;
  const prompt = d2?.prompt;
  if (typeof prompt === "string" && prompt.trim().length > 0) return prompt;
  const description = d2?.description;
  return typeof description === "string" && description.trim().length > 0
    ? description
    : void 0;
}
function toNonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function normalizePlaceholderDefaultModelId(
  draftModelId,
  registryModelId,
  registryModelName,
  persistedModelId,
) {
  const draft = toNonEmptyString(draftModelId);
  if (
    draft &&
    registryModelId &&
    (draft === registryModelId ||
      draft === registryModelName ||
      draft === persistedModelId)
  ) {
    return registryModelId;
  }
  return draft ?? registryModelId ?? persistedModelId;
}
export function PlaceholderNodeInner({
  id: id2,
  data: data2,
  selected: selected2,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t: t2 } = useTranslation();
  const placeholderData = data2;
  const {
    prompt,
    model,
    status,
    errorMessage: errorMessage2,
    mediaType,
  } = placeholderData;
  const nodePrompt =
    (typeof prompt === "string" && prompt.trim().length > 0
      ? prompt
      : typeof placeholderData.description === "string" &&
          placeholderData.description.trim().length > 0
        ? placeholderData.description
        : void 0) ??
    imageViewPrimaryPrompt(data2) ??
    void 0;
  const isError = isGenerationErrorStatus(status);
  const isRecoverableError = status === "recoverable_error";
  const isGenerationStatusUnknown = status === "status_unknown";
  const isQueued = status === "pending";
  const isQueuePaused = status === "queue_paused";
  const liveRemainingWaitSeconds = normalizeEstimatedWaitSeconds(
    placeholderData.estimatedRemainingWaitSeconds,
    placeholderData.estimatedRemainingWaitMinutes,
  );
  const reactFlow = useReactFlow();
  const { deleteElements } = reactFlow;
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const bridge = useCanvasBridge();
  const {
    savePopoverDraft,
    promoteSubImageToMain,
    flushPersist,
    getIncomingSourceIds,
    getNodeById,
    subscribeGraphChange,
  } = useCanvasActions();
  const overlayStore = useMultiImageOverlayApi();
  const isOverlayOpen = useIsOverlayOpen(id2);
  const [showI2IPopover, setShowI2IPopover] = reactExports.useState(false);
  const [showI2VPopover, setShowI2VPopover] = reactExports.useState(false);
  const [showT2APopover, setShowT2APopover] = reactExports.useState(false);
  const [showStoryboardGridPopover, setShowStoryboardGridPopover] =
    reactExports.useState(false);
  const [cancelGenerationPending, setCancelGenerationPending] =
    reactExports.useState(false);
  const subImages = useSubImages(id2);
  const assetMetadataStore = useAssetMetadataApi();
  const assetsMap = useAssetMetadataStore((s2) => s2.assets);
  const getRoundSnapshot = reactExports.useCallback(
    () => getNodeById(id2)?.round,
    [getNodeById, id2],
  );
  const mainRound = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getRoundSnapshot,
    getRoundSnapshot,
  );
  const getNodeAssetId = reactExports.useCallback(
    () => getNodeById(id2)?.assetId,
    [getNodeById, id2],
  );
  const nodeAssetId = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getNodeAssetId,
    getNodeAssetId,
  );
  const [referenceRevision, setReferenceRevision] = reactExports.useState(0);
  reactExports.useEffect(
    () =>
      subscribeGraphChange(() =>
        setReferenceRevision((revision) => revision + 1),
      ),
    [subscribeGraphChange],
  );
  const incomingSourceIds = reactExports.useMemo(
    () => getIncomingSourceIds(id2),
    [getIncomingSourceIds, id2, referenceRevision],
  );
  const referenceTextPaths = reactExports.useMemo(
    () =>
      resolveReferenceTexts(
        incomingSourceIds,
        placeholderData.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    [
      incomingSourceIds,
      placeholderData.referenceTextIds,
      assetMetadataStore,
      getNodeById,
    ],
  );
  const liveReferenceTextPaths = reactExports.useMemo(
    () =>
      resolveReferenceTexts(
        incomingSourceIds,
        void 0,
        assetMetadataStore,
        getNodeById,
      ),
    [incomingSourceIds, assetMetadataStore, getNodeById],
  );
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  const imageView = reactExports.useMemo(
    () =>
      buildPlaceholderImageNodeView(
        id2,
        data2,
        subImages,
        (assetId) => assetsMap.get(assetId),
        mainRound,
        nodeAssetId,
      ),
    [id2, data2, subImages, assetsMap, mainRound, nodeAssetId],
  );
  const mediaLightboxItems = reactExports.useMemo(() => {
    if (mediaType !== "image" && mediaType !== "video") return [];
    return lightboxItemsFromSlots(mediaType, imageView.rounds.flat(), {
      getMetaById: (assetId) => assetsMap.get(assetId),
      nodes: subImages,
      primarySlotId: imageView.primary?.id,
    });
  }, [
    mediaType,
    imageView.rounds,
    imageView.primary?.id,
    assetsMap,
    subImages,
  ]);
  const mediaLightbox = useImageLightbox({
    items: mediaLightboxItems,
  });
  const displayPrompt = nodePrompt ?? imageView.primary?.prompt ?? "";
  const isStoryboardGeneration =
    placeholderData.backend === BACKEND_VIBE_STORYBOARD;
  const isGeneratingPopover =
    status === "pending" || status === "generating" || status === "loading";
  const placeholderModelId = toNonEmptyString(placeholderData.model_id);
  const providerTaskId = toNonEmptyString(placeholderData.providerTaskId);
  const placeholderModelInfo = useModelForAsset(
    typeof placeholderData.backend === "string"
      ? placeholderData.backend
      : void 0,
    placeholderModelId,
    mediaType,
  );
  const displayModel =
    placeholderModelInfo?.name ?? translateModelName(model ?? "", t2);
  const estimatedRemainingWaitSeconds = useGenerationWaitEstimate({
    active: !isError && !isQueuePaused && !isQueued,
    liveRemainingWaitSeconds,
    estimatedGenerationSeconds:
      mediaType === "image"
        ? resolveImageGenerationEstimateSeconds(
            typeof placeholderData.backend === "string"
              ? placeholderData.backend
              : void 0,
            placeholderModelId ?? toNonEmptyString(model),
          )
        : void 0,
    startedAt: readGenerationStartedAt(data2),
  });
  const handleDelete2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      deleteElements({
        nodes: [
          {
            id: id2,
          },
        ],
      });
    },
    [id2, deleteElements],
  );
  const handleReport = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      bridge.onReportNodeError?.({
        nodeId: id2,
        // PlaceholderNode is generation-agnostic; downstream node-type can
        // be inferred by the host from `model` / data shape if needed.
        nodeType: "placeholder",
        model,
        prompt: displayPrompt,
        errorMessage: errorMessage2,
        traceId: placeholderData.cloudTraceId,
      });
    },
    [
      bridge,
      id2,
      model,
      displayPrompt,
      errorMessage2,
      placeholderData.cloudTraceId,
    ],
  );
  const handleRetry = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!placeholderData.retryPayload) return;
      bridge.onRetryGeneration?.(id2, placeholderData.retryPayload);
    },
    [bridge, id2, placeholderData.retryPayload],
  );
  const handleCancelGeneration = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
      if (!bridge.onCancelGeneration || cancelGenerationPending) return;
      setCancelGenerationPending(true);
      try {
        await bridge.onCancelGeneration(id2);
      } finally {
        setCancelGenerationPending(false);
      }
    },
    [bridge, cancelGenerationPending, id2],
  );
  const handleResumeQueue = reactExports.useCallback(() => {
    if (!placeholderData.retryPayload) return;
    bridge.onRetryGeneration?.(id2, placeholderData.retryPayload);
  }, [bridge, id2, placeholderData.retryPayload]);
  const handleCancelQueue = reactExports.useCallback(() => {
    bridge.onCancelGenerationQueue?.(id2);
  }, [bridge, id2]);
  const borderClass = "canvas-node-frame border-0 p-px";
  const showEdgeLight =
    status === "pending" || status === "generating" || status === "loading";
  const card = resolvePlaceholderCardSize(
    status,
    placeholderData.aspectRatio,
    mediaType,
    placeholderData.placeholderDisplaySize,
  );
  const cardWidth = card.width;
  const mediaAreaHeight = card.height;
  const activeRoundSlotCount = imageView.slots.length;
  const showImageChrome = mediaType === "image" && imageView.isMulti;
  const showVideoChrome = mediaType === "video" && imageView.isMulti;
  const showRoundSwitcher =
    (mediaType === "image" || mediaType === "video") &&
    imageView.rounds.length > 1;
  const showImageOverlay =
    showImageChrome && isOverlayOpen && imageView.isMulti;
  const showVideoOverlay =
    showVideoChrome && isOverlayOpen && imageView.isMulti;
  const totalImageCount = activeRoundSlotCount;
  const countUnit =
    mediaType === "video"
      ? t2("canvas.multiVideo.countUnit", "段")
      : t2("canvas.multiImage.countUnit", "张");
  const noopImageAction = reactExports.useCallback(() => {}, []);
  const handleI2IClose = usePopoverCloseWithDeselect(id2, setShowI2IPopover);
  const handleI2VClose = usePopoverCloseWithDeselect(id2, setShowI2VPopover);
  const handleT2AClose = usePopoverCloseWithDeselect(id2, setShowT2APopover);
  const handleStoryboardGridClose = usePopoverCloseWithDeselect(
    id2,
    setShowStoryboardGridPopover,
  );
  const {
    submitImg2Image,
    submitImg2Video,
    submitTxt2Audio,
    fetchImageModels,
    fetchVideoModels,
    fetchAudioModels,
    fetchTtsVoices,
    resolveFileUrl,
    getLastUsedModelParams,
  } = bridge;
  const lastUsedI2I = getLastUsedModelParams?.("i2i");
  const lastUsedI2V = getLastUsedModelParams?.("i2v");
  const lastUsedAudio = getLastUsedModelParams?.("t2a");
  const popoverDraftMap = getPopoverDraftMap(data2);
  const popoverDraft = popoverDraftMap?.i2i;
  const i2vDraft = popoverDraftMap?.i2v;
  const t2aDraft = popoverDraftMap?.t2a;
  const placeholderModelCandidates = reactExports.useMemo(
    () => [
      placeholderModelInfo?.id,
      placeholderModelInfo?.model_name,
      placeholderModelId,
      typeof model === "string" ? model : void 0,
    ],
    [
      placeholderModelInfo?.id,
      placeholderModelInfo?.model_name,
      placeholderModelId,
      model,
    ],
  );
  const i2iDraftHasUserEdits = popoverDraftHasUserEdits(popoverDraft, {
    prompt: displayPrompt,
    modelIds: placeholderModelCandidates,
    params: placeholderData.params ?? imageView.primary?.params,
  });
  const i2vDraftHasUserEdits = popoverDraftHasUserEdits(i2vDraft, {
    prompt: displayPrompt,
    modelIds: placeholderModelCandidates,
    params: placeholderData.params,
  });
  const i2iUserDraft = i2iDraftHasUserEdits ? popoverDraft : void 0;
  const i2vUserDraft = i2vDraftHasUserEdits ? i2vDraft : void 0;
  const i2iDraftPrompt =
    typeof i2iUserDraft?.prompt === "string" &&
    i2iUserDraft.prompt.trim().length > 0
      ? i2iUserDraft.prompt
      : void 0;
  const i2iDraftPromptJson = i2iDraftPrompt ? i2iUserDraft?.promptJson : void 0;
  const i2vDraftPrompt =
    typeof i2vUserDraft?.prompt === "string" &&
    i2vUserDraft.prompt.trim().length > 0
      ? i2vUserDraft.prompt
      : void 0;
  const i2vDraftPromptJson = i2vDraftPrompt ? i2vUserDraft?.promptJson : void 0;
  const t2aDraftPrompt =
    typeof t2aDraft?.prompt === "string" && t2aDraft.prompt.trim().length > 0
      ? t2aDraft.prompt
      : void 0;
  const defaultModelId = normalizePlaceholderDefaultModelId(
    i2iUserDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultVideoModelId = normalizePlaceholderDefaultModelId(
    i2vUserDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultAudioModelId = normalizePlaceholderDefaultModelId(
    t2aDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultParams =
    i2iUserDraft?.params ?? placeholderData.params ?? imageView.primary?.params;
  const defaultVideoParams = i2vUserDraft?.params ?? placeholderData.params;
  const defaultAudioParams = t2aDraft?.params ?? placeholderData.params;
  const draftImagePaths = Array.isArray(i2iUserDraft?.imagePaths)
    ? i2iUserDraft.imagePaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const draftVideoImagePaths = Array.isArray(i2vUserDraft?.imagePaths)
    ? i2vUserDraft.imagePaths.filter((path2) => typeof path2 === "string")
    : void 0;
  const draftVideoPaths = Array.isArray(i2vUserDraft?.videoPaths)
    ? i2vUserDraft.videoPaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const draftAudioPaths = Array.isArray(i2vUserDraft?.audioPaths)
    ? i2vUserDraft.audioPaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const t2aDraftAudioPaths = Array.isArray(t2aDraft?.audioPaths)
    ? t2aDraft.audioPaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const draftI2ITextPaths = Array.isArray(i2iUserDraft?.textPaths)
    ? i2iUserDraft.textPaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const draftI2VTextPaths = Array.isArray(i2vUserDraft?.textPaths)
    ? i2vUserDraft.textPaths.filter(
        (path2) => typeof path2 === "string" && !!path2,
      )
    : void 0;
  const draftT2ATextPaths = Array.isArray(t2aDraft?.textPaths)
    ? t2aDraft.textPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const referenceMediaPaths = reactExports.useMemo(
    () =>
      resolvePlaceholderReferencePaths({
        incomingSourceIds,
        referenceImageIds: placeholderData.referenceImageIds,
        referenceVideoIds: placeholderData.referenceVideoIds,
        referenceAudioIds: placeholderData.referenceAudioIds,
        assetMetadataStore,
        getNodeById,
      }),
    [
      incomingSourceIds,
      placeholderData.referenceImageIds,
      placeholderData.referenceVideoIds,
      placeholderData.referenceAudioIds,
      assetMetadataStore,
      getNodeById,
    ],
  );
  const referenceImagePaths = referenceMediaPaths.imagePaths;
  const defaultImagePaths = resolveDraftReferencePaths(
    referenceImagePaths,
    draftImagePaths,
  );
  const defaultI2VImagePaths = resolveDraftReferencePaths(
    referenceImagePaths,
    draftVideoImagePaths,
  );
  const defaultI2VVideoPaths = resolveDraftReferencePaths(
    referenceMediaPaths.videoPaths,
    draftVideoPaths,
  );
  const defaultI2VAudioPaths = resolveDraftReferencePaths(
    referenceMediaPaths.audioPaths,
    draftAudioPaths,
  );
  const t2aReferenceAudioPaths = reactExports.useMemo(
    () =>
      resolvePlaceholderReferencePaths({
        incomingSourceIds,
        referenceAudioIds: placeholderData.referenceAudioIds,
        assetMetadataStore,
      }).audioPaths,
    [incomingSourceIds, placeholderData.referenceAudioIds, assetMetadataStore],
  );
  const defaultT2AAudioPaths = resolveDraftReferencePaths(
    t2aReferenceAudioPaths,
    t2aDraftAudioPaths,
  );
  const defaultI2ITextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftI2ITextPaths,
  );
  const defaultI2VTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftI2VTextPaths,
  );
  const defaultT2ATextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftT2ATextPaths,
  );
  const selfAssetIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const slot of imageView.slots) {
      if (slot.status === "ready" && slot.id) ids2.add(slot.id);
    }
    ids2.add(id2);
    return ids2;
  }, [id2, imageView.slots]);
  const {
    handleSetPrimary,
    handleDeleteSub,
    handleSplitSub,
    handleSubContextMenu,
    handleDownloadSub,
  } = useMultiImageActions({
    id: id2,
    view: imageView,
    subImages,
    reactFlow,
    nodeWidth: cardWidth,
    nodeHeight: mediaAreaHeight,
  });
  const handleOpenPlaceholderSlot = reactExports.useCallback(
    (originalIndex) => {
      const targetSlot = imageView.slots[originalIndex];
      const targetIndex = resolveLightboxIndexForSlot(
        mediaLightboxItems,
        targetSlot,
        0,
      );
      mediaLightbox.openLightbox(targetIndex);
    },
    [imageView.slots, mediaLightboxItems, mediaLightbox.openLightbox],
  );
  const handleToggleOverlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      const { open, close: close2 } = overlayStore.getState();
      if (isOverlayOpen) close2(id2);
      else open(id2);
    },
    [overlayStore, isOverlayOpen, id2],
  );
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === imageView.activeRoundIndex) return;
      const target = imageView.rounds[roundIdx]?.[0];
      if (!target) return;
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === target.id || subAssetId === target.id;
      });
      const targetNodeId = subMatch?.id ?? target.id;
      promoteSubImageToMain(targetNodeId);
    },
    [
      imageView.activeRoundIndex,
      imageView.rounds,
      subImages,
      promoteSubImageToMain,
    ],
  );
  const handleSelectVideoSlot = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      if (!isError && imageView.hasLoading) return;
      const target = imageView.slots[originalIndex];
      if (!target || target.status !== "ready") return;
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === target.id || subAssetId === target.id;
      });
      const targetNodeId = subMatch?.id ?? target.id;
      promoteSubImageToMain(targetNodeId, {
        persistMode: "request",
      });
      overlayStore.getState().close(id2);
    },
    [
      isError,
      imageView.hasLoading,
      imageView.slots,
      subImages,
      promoteSubImageToMain,
      overlayStore,
      id2,
    ],
  );
  const handleBadgeClick = reactExports.useCallback(
    (e2) => {
      if (imageView.rounds.length > 1 && imageView.slots.length === 1) {
        e2.stopPropagation();
        const next2 =
          (imageView.activeRoundIndex + 1) % imageView.rounds.length;
        handleSelectRound(next2);
        return;
      }
      handleToggleOverlay(e2);
    },
    [
      imageView.rounds,
      imageView.slots.length,
      imageView.activeRoundIndex,
      handleSelectRound,
      handleToggleOverlay,
    ],
  );
  const handleI2ISubmit = reactExports.useCallback(
    (
      nextPrompt,
      modelId,
      params,
      imagePaths,
      replaceNodeId,
      count2,
      displayPrompt2,
      textPaths,
    ) => {
      const submit = () => {
        submitImg2Image?.(
          id2,
          nextPrompt,
          modelId,
          params,
          imagePaths,
          replaceNodeId,
          count2,
          displayPrompt2,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () =>
          dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [id2, submitImg2Image, flushPersist, t2],
  );
  const handleI2VSubmit = reactExports.useCallback(
    (
      nextPrompt,
      modelId,
      params,
      imagePaths,
      videoPaths,
      audioPaths,
      replaceNodeId,
      displayPrompt2,
      count2,
      textPaths,
    ) => {
      const submit = () => {
        submitImg2Video?.(
          id2,
          nextPrompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt2,
          count2,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () =>
          dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [id2, submitImg2Video, flushPersist, t2],
  );
  const handleT2ASubmit = reactExports.useCallback(
    (
      nextPrompt,
      modelId,
      params,
      replaceNodeId,
      imagePaths,
      audioPaths,
      textPaths,
    ) => {
      void (async () => {
        if (replaceNodeId) await flushPersist();
        submitTxt2Audio?.(
          id2,
          nextPrompt,
          modelId,
          params,
          replaceNodeId,
          void 0,
          void 0,
          imagePaths,
          audioPaths,
          textPaths,
        );
      })();
    },
    [id2, submitTxt2Audio, flushPersist],
  );
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (isMultiSelect || isBoxSelecting) return;
    if ((mediaType === "image" || mediaType === "video") && isOverlayOpen)
      return;
    if (mediaType === "image") {
      if (isStoryboardGeneration) {
        if (showStoryboardGridPopover) return;
        setShowStoryboardGridPopover(true);
        return;
      }
      if (showI2IPopover) return;
      setShowI2IPopover(true);
      return;
    }
    if (mediaType === "video") {
      if (showI2VPopover) return;
      setShowI2VPopover(true);
      return;
    }
    if (mediaType === "audio") {
      if (showT2APopover) return;
      setShowT2APopover(true);
    }
  }, [
    selected2,
    isMultiSelect,
    isBoxSelecting,
    mediaType,
    isStoryboardGeneration,
    isOverlayOpen,
    showI2IPopover,
    showI2VPopover,
    showT2APopover,
    showStoryboardGridPopover,
  ]);
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (mediaType !== "image" && mediaType !== "video" && mediaType !== "audio")
      return;
    refreshUpstreamText(incomingSourceIds);
  }, [selected2, mediaType, incomingSourceIds, refreshUpstreamText]);
  const fakeSlot = reactExports.useMemo(
    () => ({
      id: id2,
      status: "ready",
      error: errorMessage2 ?? null,
    }),
    [id2, errorMessage2],
  );
  const generatingIcon = reactExports.useMemo(() => {
    if (mediaType === "video") return <VideoPlaceholderIcon />;
    if (mediaType === "audio") return <AudioPlaceholderIcon />;
    if (mediaType === "text") return <TextPlaceholderIcon />;
    return <ImagePlaceholderIcon />;
  }, [mediaType]);
  const progressKind =
    mediaType === "video"
      ? "video"
      : mediaType === "audio"
        ? "audio"
        : mediaType === "text"
          ? "text"
          : "image";
  const isH3MaxVideo =
    mediaType === "video" &&
    [placeholderModelId, model].some((value) =>
      isMiniMaxH3MaxModelValue(value),
    );
  const generationProgressStartedAt =
    (isH3MaxVideo ? readGenerationSubmittedAt(data2) : void 0) ??
    readGenerationStartedAt(data2);
  const generatingProgress = useSimulatedProgress(
    !isError && !isQueuePaused && !isQueued,
    progressKind,
    generationProgressStartedAt,
    isH3MaxVideo ? "h3-max-video" : void 0,
    readGenerationAttemptId(data2),
  );
  return (
    <NodeShell
      width={cardWidth}
      generating={showEdgeLight}
      className={isError ? "h-full" : void 0}
    >
      <div
        ref={frameRef}
        className={`relative overflow-hidden ${borderClass}${imageView.isMulti && !isOverlayOpen ? " canvas-media-stack" : ""}${isError ? " h-full" : ""}`}
        style={{
          width: cardWidth,
          borderRadius: MEDIA_NODE_RADIUS,
          outlineStyle: "none",
        }}
        data-node-selected={selected2 ? "true" : "false"}
      >
        <NodeFrameStroke />
        <Handle
          type="target"
          position={Position.Left}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
        {isError ? (
          // Error state delegates to MediaErrorCard, but grouped placeholders
          // still expose the active-round count badge and the bottom round strip
          // so the user can inspect siblings or jump back to a successful round.
          <div className="relative h-full">
            <MediaErrorCard
              errorMessage={errorMessage2}
              displayModel={displayModel}
              onDelete={handleDelete2}
              onReport={bridge.onReportNodeError ? handleReport : void 0}
              reportStatus={bridge.getNodeErrorReportStatus?.(id2) ?? "idle"}
              variant={
                isRecoverableError
                  ? "recoverable"
                  : isGenerationStatusUnknown
                    ? "uncertain"
                    : placeholderData.errorReason ===
                        GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
                      ? "concurrency_limit"
                      : "failed"
              }
              onCancel={
                isRecoverableError && bridge.onCancelGeneration
                  ? handleCancelGeneration
                  : void 0
              }
              cancelling={cancelGenerationPending}
              onRetry={
                placeholderData.errorReason ===
                  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT &&
                placeholderData.retryPayload &&
                bridge.onRetryGeneration
                  ? handleRetry
                  : void 0
              }
              retrying={bridge.isRetryGenerationPending?.(id2) ?? false}
              refundStatus={placeholderData.refundStatus}
              refundedCredits={placeholderData.refundedCredits}
            />
            {(showImageChrome || showVideoChrome) && (
              <CountBadge
                count={totalImageCount}
                expanded={isOverlayOpen}
                unit={countUnit}
                onClick={handleBadgeClick}
              />
            )}
          </div>
        ) : (
          <div
            className="relative"
            style={{
              height: mediaAreaHeight,
              width: "100%",
            }}
          >
            <ImageSlotBody
              nodeId={id2}
              slot={fakeSlot}
              width={cardWidth}
              height={mediaAreaHeight}
              errorVariant="full"
              generatingProgress={
                isQueued || isQueuePaused ? void 0 : generatingProgress
              }
              generatingIcon={generatingIcon}
              generatingLabel={
                isQueued || isQueuePaused ? (
                  <QueueGenerationControl
                    state={isQueuePaused ? "paused" : "queued"}
                    onCancel={isQueued ? handleCancelQueue : void 0}
                    onResume={isQueuePaused ? handleResumeQueue : void 0}
                    cancelling={
                      bridge.isCancelGenerationQueuePending?.(id2) ?? false
                    }
                    resuming={bridge.isRetryGenerationPending?.(id2) ?? false}
                    canResume={!!placeholderData.retryPayload}
                    actionUiId="canvas.placeholder.queue"
                  />
                ) : estimatedRemainingWaitSeconds ? (
                  <GenerationWaitEstimate
                    seconds={estimatedRemainingWaitSeconds}
                    actionUiId="canvas.placeholder"
                  />
                ) : (
                  void 0
                )
              }
              overrideStatus={
                isError
                  ? "error"
                  : isQueued || isQueuePaused
                    ? "pending"
                    : "generating"
              }
              overrideError={errorMessage2 ?? null}
            />
            {(showImageChrome || showVideoChrome) && (
              <CountBadge
                count={totalImageCount}
                expanded={isOverlayOpen}
                unit={countUnit}
                onClick={handleBadgeClick}
              />
            )}
          </div>
        )}
      </div>
      {showRoundSwitcher && (
        <RoundDots
          count={imageView.rounds.length}
          activeIdx={imageView.activeRoundIndex}
          onSelect={handleSelectRound}
        />
      )}
      {showImageOverlay && (
        <MultiImageOverlay
          nodeId={id2}
          view={imageView}
          cardWidth={cardWidth}
          cardHeight={mediaAreaHeight}
          onSetPrimary={isError ? handleSetPrimary : noopImageAction}
          onDeleteSub={isError ? handleDeleteSub : noopImageAction}
          onSplitSub={isError ? handleSplitSub : noopImageAction}
          onSplitAll={noopImageAction}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenPlaceholderSlot}
          readonly={!isError}
        />
      )}
      {showVideoOverlay && (
        <VideoMultiOverlay
          view={imageView}
          cardWidth={cardWidth}
          cardHeight={mediaAreaHeight}
          onSelectSlot={handleSelectVideoSlot}
          onDeleteSub={isError ? handleDeleteSub : noopImageAction}
          onSplitSub={isError ? handleSplitSub : noopImageAction}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenPlaceholderSlot}
          readonly={!isError}
        />
      )}
      {mediaType === "image" && mediaLightbox.lightboxProps && (
        <ImageLightbox
          {...mediaLightbox.lightboxProps}
          alt={
            mediaLightbox.lightboxProps.items[mediaLightbox.lightboxProps.index]
              ?.fileName ?? ""
          }
        />
      )}
      {mediaType === "video" && mediaLightbox.lightboxProps && (
        <VideoLightbox
          items={mediaLightbox.lightboxProps.items}
          initialIndex={mediaLightbox.lightboxProps.index}
          onClose={mediaLightbox.lightboxProps.onClose}
        />
      )}
      {mediaType === "image" &&
        !isStoryboardGeneration &&
        selected2 &&
        !isOverlayOpen &&
        showI2IPopover && (
          <I2IPopover
            onSubmit={handleI2ISubmit}
            onClose={handleI2IClose}
            listImageModels={fetchImageModels}
            defaultImagePaths={defaultImagePaths}
            defaultPrompt={i2iDraftPrompt ?? displayPrompt}
            defaultPromptJson={
              typeof i2iDraftPromptJson === "string"
                ? i2iDraftPromptJson
                : void 0
            }
            defaultModelId={defaultModelId}
            defaultParams={defaultParams}
            lastUsedModelId={lastUsedI2I?.modelId}
            lastUsedParams={lastUsedI2I?.params}
            resolveFileUrl={resolveFileUrl}
            selfAssetIds={selfAssetIds}
            nodeId={void 0}
            replaceNodeId={id2}
            isGenerating={isGeneratingPopover}
            onSaveDraft={(draft) => savePopoverDraft(id2, "i2i", draft)}
            currentImageCount={imageView.slots.length}
            hasLoadingSlots={isGeneratingPopover}
            defaultTextPaths={defaultI2ITextPaths}
            hasUpstreamText={!!upstreamTextContent}
            referenceTextContent={upstreamTextContent}
            popoverGapOffset={
              showRoundSwitcher ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
            }
          />
        )}
      {mediaType === "image" &&
        isStoryboardGeneration &&
        selected2 &&
        !isOverlayOpen &&
        showStoryboardGridPopover && (
          <StoryboardGridPopover
            onClose={handleStoryboardGridClose}
            replaceNodeId={id2}
            defaultPrompt={displayPrompt}
            defaultParams={placeholderData.params}
            defaultReferencePaths={defaultImagePaths}
            resolveFileUrl={resolveFileUrl}
            isGenerating={isGeneratingPopover}
          />
        )}
      {mediaType === "video" &&
        selected2 &&
        !isOverlayOpen &&
        showI2VPopover && (
          <I2VPopover
            onSubmit={handleI2VSubmit}
            onClose={handleI2VClose}
            listVideoModels={fetchVideoModels}
            selfAssetIds={selfAssetIds}
            defaultImagePaths={defaultI2VImagePaths}
            defaultVideoPaths={defaultI2VVideoPaths}
            defaultAudioPaths={defaultI2VAudioPaths}
            defaultPrompt={i2vDraftPrompt ?? displayPrompt}
            defaultPromptJson={
              typeof i2vDraftPromptJson === "string"
                ? i2vDraftPromptJson
                : void 0
            }
            defaultModelId={defaultVideoModelId}
            defaultParams={defaultVideoParams}
            lastUsedModelId={lastUsedI2V?.modelId}
            lastUsedParams={lastUsedI2V?.params}
            resolveFileUrl={resolveFileUrl}
            nodeId={void 0}
            replaceNodeId={id2}
            showCountChip={true}
            isGenerating={isGeneratingPopover}
            onSaveDraft={(draft) => savePopoverDraft(id2, "i2v", draft)}
            defaultTextPaths={defaultI2VTextPaths}
            hasUpstreamText={!!upstreamTextContent}
            referenceTextContent={upstreamTextContent}
            providerTaskId={providerTaskId}
            suppressImageAspectRejectedToast={isError}
            popoverGapOffset={
              showRoundSwitcher ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
            }
          />
        )}
      {mediaType === "audio" && selected2 && showT2APopover && (
        <TxtPopover
          mode="audio"
          onSubmit={handleT2ASubmit}
          onClose={handleT2AClose}
          listModels={fetchAudioModels}
          fetchTtsVoices={fetchTtsVoices}
          defaultPrompt={t2aDraftPrompt ?? displayPrompt}
          defaultModelId={defaultAudioModelId}
          defaultParams={defaultAudioParams}
          lastUsedModelId={lastUsedAudio?.modelId}
          lastUsedParams={lastUsedAudio?.params}
          nodeId={void 0}
          replaceNodeId={id2}
          isGenerating={isGeneratingPopover}
          popoverGapOffset={AUDIO_FULL_BODY_POPOVER_GAP_OFFSET}
          onSaveDraft={(draft) => savePopoverDraft(id2, "t2a", draft)}
          resolveFileUrl={resolveFileUrl}
          defaultImagePaths={t2aDraft?.imagePaths}
          defaultAudioPaths={defaultT2AAudioPaths}
          defaultTextPaths={defaultT2ATextPaths}
          referenceTextContent={upstreamTextContent}
        />
      )}
    </NodeShell>
  );
}
