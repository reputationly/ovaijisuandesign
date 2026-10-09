// video-action-surface.jsx
import {
  jsxRuntimeExports,
  useGeneratingStateApi,
  useTranslation,
  useAssetMetadataApi,
  useCanvasBridge,
  useHtmlFullscreenApi,
  useCanvasActions,
  useReactFlow,
  reactExports,
  useModelForAsset,
  useVideoStarterPresetToken,
  dedupedToast,
  isUserProvidedAssetModel,
  parseNodeId,
  reactDomExports,
  CompositedSvg,
  VIDEO_EMPTY_CARD_SIZE,
  useVideoStarterPresetStore,
  useCanvasIsMultiSelect,
  useCanvasIsBoxSelecting,
  useVideoNodeView,
  useSubImages,
  useAssetMeta,
  useFileVersion,
  appendCanvasFileVersion,
  useNodeRename,
  useCropViewportZoom,
  useEmitDerivedFromBlob,
  useNodeIsEmpty,
  useGenerating,
  isGenerationErrorStatus,
  isIdleEmptyVideoNode,
  useMediaPlayback,
  useCanvasActive,
  getNodeFlowRect,
  useMultiImageActions,
  formatTime$2,
  MEDIA_NODE_RADIUS,
} from "../vendor.js";
import {
  isHailuo03SuperResolutionEligible,
  useEnhanceVideoSubmit,
  suggestNextResolution,
  parseEnhanceResolution,
  parseEnhanceFps,
  useEraseSubtitleSubmit,
  useAsrSubmit,
  resolveHailuo03SuperResolutionDuration,
  CustomizeToolbarDialog,
  EnhanceVideoPopover,
  Hailuo03SuperResolutionPopover,
  EraseSubtitlePopover,
  EraseSubtitleEditor,
  AsrPopover,
  DEFAULT_ASR_LANGUAGE,
  useVideoColorAdjust,
} from "../m05/text-node-inner.jsx";
import { resolveVideoPlaybackUrl } from "../m01/text-models.js";
import {
  resolveActivePopoverDraft,
  usePopoverCloseWithDeselect,
  resolveEditableTextReferencePaths,
  resolveReferenceTexts,
  resolveReferenceAudios,
  buildOriginalGenerationDraft,
  draftOverridesOriginalGeneration,
  resolveDefaultReferencePaths,
} from "../m01/resolve-reference-texts.js";
import {
  resolveVideoPopoverProviderTaskId,
  resolveVideoPopoverModelInitialization,
  TOOLBAR_HEIGHT,
  TOOLBAR_GAP,
  PORTAL_TOOLBAR_Z,
  I2V_POPOVER_WIDTH,
  I2V_POPOVER_HEIGHT_EXPANDED,
  I2V_POPOVER_HEIGHT_COMPACT,
  ENHANCE_POPOVER_WIDTH,
  ENHANCE_POPOVER_HEIGHT,
  VideoNodeToolbarSection,
  VideoFramePanel,
  VIEWPORT_MARGIN,
  PORTAL_POPOVER_Z,
} from "../m05/video-node-toolbar-section.jsx";
import { CLIP_STUDIO_PLUGIN_ID, CanvasImage } from "../m02/canvas-image.jsx";
import { useUpstreamTextContent, useUpstreamSameTypeMeta } from "../m01/use-assets-ref-validate.js";
import {
  submitAfterOptionalDraftFlush,
  lightboxItemFromAssetMeta,
  NODE_POPOVER_SAFE_GAP,
  resolveLightboxIndexForSlot,
  isCloneData,
  readGenerationStartedAt,
  readGenerationSubmittedAt,
  useSimulatedProgress,
  readGenerationAttemptId,
  lightboxItemsFromSlots,
  useWarnMissingAssetMeta,
} from "../m01/use-lightbox-media-actions.jsx";
import {
  resolveReferenceImages,
  resolveReferenceVideos,
  useEmptyAspectRatio,
  emptySizeFromRatio,
  useLutBundle,
  MediaDownloadButton,
} from "../m03/base-backend.jsx";
import { VideoLightbox } from "../m02/image-lightbox.jsx";
import { VideoClipPanel } from "../m02/thumb-chip.jsx";
import { VideoColorAdjustDialog } from "../m05/video-color-adjust-dialog.jsx";
import { I2VPopover } from "../m03/arrow-shape.js";
import {
  NodeEmptyState,
  normalizeEstimatedWaitSeconds,
  useMediaNodeActions,
  useMediaFallbackSize,
  NodeShell,
  NodeBody,
  QueueGenerationControl,
  GenerationWaitEstimate,
  PlaceholderUploadButton,
} from "../m01/use-media-node-actions.jsx";
import {
  VideoPlaceholderIcon,
  useCanvasNodeIsDragging,
  GeneratingMediaArea,
  getFileExtension,
  formatFileSize,
  shouldRenderMediaActionSurface,
} from "../m01/generating-media-area.jsx";
import {
  drawWatermark,
  DEFAULT_WATERMARK_SETTINGS,
  ImageWatermarkPreview,
} from "../m04/create-box-faces.jsx";
import { VIDEO_CARD_MAX_WIDTH } from "../m01/prune-persisted-node-data.js";
import { WATERMARK_PANEL_WIDTH, WatermarkPopover } from "../m04/image-node-inner.jsx";
import { isMiniMaxH3MaxModelValue } from "../m03/i2-v-popover-inner.jsx";
import { buildVideoThumbBase } from "../m02/media-clip-panel-inner.jsx";
import {
  shouldActivateVideoHover,
  VideoSplitAllButton,
  VideoSplitMainButton,
  VideoPlayer,
  VideoMultiOverlay,
} from "../m04/ready-sub-video-card.jsx";
import {
  isMissingAssetNodeData,
  MEDIA_FALLBACK_NODE_SIZE,
  MissingAssetCard,
  MediaGenerationErrorOverlay,
  MediaUnpreviewableFallback,
} from "../m01/create-tracker.jsx";
import { NodeHeader, NodeHandles } from "../m01/use-inline-rename.jsx";
import { CountBadge } from "../m04/ready-sub-image-card.jsx";
import { RoundDots, ROUND_DOTS_POPOVER_GAP_OFFSET } from "../m04/relight-editor.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function VideoActionSurface({
  nodeId,
  meta: meta2,
  data: data2,
  selected: selected2,
  isInteractiveSelect: isInteractiveSelectProp,
  generating,
  isGenerating,
  isUserEmpty,
  onAspectRatioChange,
  onI2VSelectedModelChange,
  anchor,
  lightboxItems,
  lightboxInitialIndex = 0,
  mediaActions,
  colorAdjust,
  watermark,
  popoverGapOffset = 0,
}) {
  const generatingStateStore = useGeneratingStateApi();
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const {
    submitImg2Video,
    submitEnhanceVideo,
    submitHailuo03VideoSuperResolution,
    submitEraseSubtitle,
    submitAsr,
    fetchVideoModels,
    resolveFileUrl,
    getLastUsedModelParams,
    onNodeAction,
    onInstantiatePlugin,
  } = useCanvasBridge();
  const fullscreenApi = useHtmlFullscreenApi();
  const {
    savePopoverDraft,
    getIncomingSourceIds,
    subscribeGraphChange,
    getNodeById,
    flushPersist,
  } = useCanvasActions();
  useReactFlow();
  const actionEnterTimesRef = reactExports.useRef(new Map());
  const handleToolClickTrack = reactExports.useCallback(
    (info2) => {
      if (info2.interaction === "opens_mode" || info2.interaction === "opens_dialog") {
        actionEnterTimesRef.current.set(info2.action, Date.now());
      }
      onNodeAction?.({
        nodeId,
        nodeType: "video",
        action: info2.action,
        phase: "click",
        interaction: info2.interaction,
        source: info2.source,
      });
    },
    [nodeId, onNodeAction],
  );
  const trackActionEnd = reactExports.useCallback(
    (action, phase, toolSpecific, hadProgress) => {
      const enteredAt = actionEnterTimesRef.current.get(action);
      if (enteredAt == null) return;
      actionEnterTimesRef.current.delete(action);
      onNodeAction?.({
        nodeId,
        nodeType: "video",
        action,
        phase,
        interaction: action === "customize-toolbar" ? "opens_dialog" : "opens_mode",
        durationMs: Date.now() - enteredAt,
        toolSpecific: phase === "apply" ? toolSpecific : void 0,
        hadProgress: phase === "abandon" ? hadProgress : void 0,
      });
    },
    [nodeId, onNodeAction],
  );
  const modelInfo = useModelForAsset(meta2?.backend, meta2?.model_id, "video");
  const hailuo03SuperResolutionVisible = reactExports.useMemo(
    () => isHailuo03SuperResolutionEligible(meta2, modelInfo),
    [meta2, modelInfo],
  );
  const playbackUrl = meta2?.url ? resolveVideoPlaybackUrl(meta2.url) : void 0;
  const i2vDraft = resolveActivePopoverDraft(data2, "i2v");
  const providerTaskId = resolveVideoPopoverProviderTaskId(meta2, data2);
  const starterPresetToken = useVideoStarterPresetToken(nodeId);
  const isInteractiveSelect =
    anchor.kind === "rect" || (selected2 && (isInteractiveSelectProp ?? true));
  const [showI2VPopover, setShowI2VPopover] = reactExports.useState(false);
  const [showEnhancePopover, setShowEnhancePopover] = reactExports.useState(false);
  const [showHailuo03SuperResolutionPopover, setShowHailuo03SuperResolutionPopover] =
    reactExports.useState(false);
  const [showEraseSubtitlePopover, setShowEraseSubtitlePopover] = reactExports.useState(false);
  const [showAsrPopover, setShowAsrPopover] = reactExports.useState(false);
  const [eraseSubMode, setEraseSubMode] = reactExports.useState("auto");
  const [eraseSubRegions, setEraseSubRegions] = reactExports.useState([]);
  const [showEraseSubEditor, setShowEraseSubEditor] = reactExports.useState(false);
  const handleWatermarkOpen = reactExports.useCallback(() => {
    if (!watermark) return;
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowHailuo03SuperResolutionPopover(false);
    setShowEraseSubtitlePopover(false);
    setShowAsrPopover(false);
    watermark.onOpen();
  }, [watermark]);
  const handleAddToClipNode = reactExports.useCallback(async () => {
    if (!onInstantiatePlugin || anchor.kind !== "node" || !meta2?.path) return;
    const editorNodeId = await onInstantiatePlugin({
      pluginId: CLIP_STUDIO_PLUGIN_ID,
      sourceNodeIds: [nodeId],
    });
    if (editorNodeId) fullscreenApi.getState().enter(editorNodeId);
  }, [anchor.kind, fullscreenApi, meta2?.path, nodeId, onInstantiatePlugin]);
  const {
    showLightbox,
    lightboxIndexOverride,
    showClipPanel,
    showFramePanel,
    closeLightbox,
    closeClipPanel,
    closeFramePanel,
    handleClipExport,
    toolbarItems: contentToolbarItems,
  } = mediaActions;
  const deselectI2VClose = usePopoverCloseWithDeselect(nodeId, setShowI2VPopover);
  const handleI2VClose = reactExports.useCallback(() => {
    if (anchor.kind === "rect") {
      setShowI2VPopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectI2VClose();
  }, [anchor, deselectI2VClose]);
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  const handleI2VSubmit = reactExports.useCallback(
    (
      prompt,
      modelId,
      params,
      imagePaths,
      videoPaths,
      audioPaths,
      replaceNodeId,
      displayPrompt,
      count2,
      textPaths,
    ) => {
      const isNewRound = anchor.kind === "node" && !isUserEmpty && !!replaceNodeId;
      const shouldSubmitCount = anchor.kind === "node";
      const submit = () => {
        submitImg2Video?.(
          nodeId,
          prompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt,
          shouldSubmitCount ? count2 : void 0,
          isNewRound,
          void 0,
          textPaths,
        );
        if (replaceNodeId && !isNewRound) {
          generatingStateStore.getState().mark(nodeId, {
            phase: "generating",
            prompt,
            model: modelId,
            prevUrl: meta2?.url,
            modelId,
            params,
            generationStartedAt: new Date().toISOString(),
          });
        }
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId && !isNewRound,
        flushDraft: flushPersist,
        submit,
        onFlushError: () => dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [
      nodeId,
      submitImg2Video,
      meta2?.url,
      generatingStateStore,
      anchor.kind,
      isUserEmpty,
      flushPersist,
      t2,
    ],
  );
  const forceShowPromptPopover = !!data2 && data2.forceShowPromptPopover === true;
  const canOpenPopover =
    forceShowPromptPopover ||
    isUserEmpty ||
    (!!meta2?.model && !isUserProvidedAssetModel(meta2.model));
  const selfAssetIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    if (nodeId) {
      ids2.add(nodeId);
      const { assetId } = parseNodeId(nodeId);
      if (assetId) ids2.add(assetId);
    }
    return ids2;
  }, [nodeId]);
  const [referenceImagePaths, setReferenceImagePaths] = reactExports.useState([]);
  const [referenceVideoPaths, setReferenceVideoPaths] = reactExports.useState([]);
  const [referenceAudioPaths, setReferenceAudioPaths] = reactExports.useState([]);
  const [referenceTextPaths, setReferenceTextPaths] = reactExports.useState([]);
  const defaultTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    resolveReferenceTexts(getIncomingSourceIds(nodeId), void 0, assetMetadataStore, getNodeById),
    i2vDraft?.textPaths,
  );
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (!canOpenPopover) return;
    if (!isInteractiveSelect) return;
    if (showI2VPopover) return;
    if (showEnhancePopover) return;
    if (showHailuo03SuperResolutionPopover) return;
    if (showEraseSubtitlePopover) return;
    if (showAsrPopover) return;
    if (showEraseSubEditor) return;
    if (colorAdjust.open) return;
    if (watermark?.open) return;
    const sources = getIncomingSourceIds(nodeId);
    setReferenceImagePaths(
      resolveReferenceImages(sources, meta2?.referenceImageIds, assetMetadataStore, getNodeById),
    );
    setReferenceVideoPaths(
      resolveReferenceVideos(sources, meta2?.referenceVideoIds, assetMetadataStore),
    );
    setReferenceAudioPaths(
      resolveReferenceAudios(sources, meta2?.referenceAudioIds, assetMetadataStore),
    );
    const persistedTextIds = data2?.referenceTextIds;
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(persistedTextIds) ? persistedTextIds : meta2?.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    refreshUpstreamText(sources);
    setShowI2VPopover(true);
  }, [
    selected2,
    canOpenPopover,
    isInteractiveSelect,
    showI2VPopover,
    showEnhancePopover,
    showHailuo03SuperResolutionPopover,
    showEraseSubtitlePopover,
    showAsrPopover,
    showEraseSubEditor,
    colorAdjust.open,
    watermark?.open,
    nodeId,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  const { submit: submitEnhance } = useEnhanceVideoSubmit({
    id: nodeId,
    meta: meta2,
    submitEnhanceVideo,
  });
  const sourceHeight = meta2?.height;
  const defaultEnhanceResolution = reactExports.useMemo(
    () => suggestNextResolution(sourceHeight),
    [sourceHeight],
  );
  const currentEnhanceResolution = reactExports.useMemo(
    () => parseEnhanceResolution(meta2?.params?.resolution),
    [meta2?.params?.resolution],
  );
  const currentEnhanceFps = reactExports.useMemo(
    () => parseEnhanceFps(meta2?.params?.fps),
    [meta2?.params?.fps],
  );
  const handleEnhanceOpen = reactExports.useCallback(() => {
    setShowI2VPopover(false);
    setShowEnhancePopover(true);
    setShowHailuo03SuperResolutionPopover(false);
    setShowEraseSubtitlePopover(false);
    setShowAsrPopover(false);
  }, []);
  const deselectEnhanceClose = usePopoverCloseWithDeselect(nodeId, setShowEnhancePopover);
  const handleEnhanceClose = reactExports.useCallback(() => {
    trackActionEnd("enhance-video", "abandon");
    if (anchor.kind === "rect") {
      setShowEnhancePopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectEnhanceClose();
  }, [anchor, deselectEnhanceClose, trackActionEnd]);
  const handleEnhanceSubmit = reactExports.useCallback(
    (params) => {
      trackActionEnd("enhance-video", "apply", params);
      submitEnhance(params);
      handleEnhanceClose();
    },
    [submitEnhance, handleEnhanceClose, trackActionEnd],
  );
  const handleHailuo03SuperResolutionOpen = reactExports.useCallback(() => {
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowHailuo03SuperResolutionPopover(true);
    setShowEraseSubtitlePopover(false);
    setShowAsrPopover(false);
  }, []);
  const deselectHailuo03SuperResolutionClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowHailuo03SuperResolutionPopover,
  );
  const handleHailuo03SuperResolutionClose = reactExports.useCallback(() => {
    trackActionEnd("hailuo03-super-resolution", "abandon");
    if (anchor.kind === "rect") {
      setShowHailuo03SuperResolutionPopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectHailuo03SuperResolutionClose();
  }, [anchor, deselectHailuo03SuperResolutionClose, trackActionEnd]);
  const handleHailuo03SuperResolution = reactExports.useCallback(() => {
    if (!submitHailuo03VideoSuperResolution || !meta2?.path || !meta2.providerTaskId) return;
    trackActionEnd("hailuo03-super-resolution", "apply", {
      resolution: "2K",
    });
    void submitHailuo03VideoSuperResolution(nodeId, meta2.path, meta2.providerTaskId);
    handleHailuo03SuperResolutionClose();
  }, [
    meta2?.path,
    meta2?.providerTaskId,
    nodeId,
    submitHailuo03VideoSuperResolution,
    trackActionEnd,
    handleHailuo03SuperResolutionClose,
  ]);
  const { submit: submitEraseSubtitleHook } = useEraseSubtitleSubmit({
    id: nodeId,
    meta: meta2,
    submitEraseSubtitle,
  });
  const handleEraseSubtitleOpen = reactExports.useCallback(() => {
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowHailuo03SuperResolutionPopover(false);
    setShowEraseSubtitlePopover(true);
    setShowAsrPopover(false);
  }, []);
  const deselectEraseSubtitleClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowEraseSubtitlePopover,
  );
  const handleEraseSubtitleClose = reactExports.useCallback(() => {
    trackActionEnd("erase-subtitle", "abandon");
    if (anchor.kind === "rect") {
      setShowEraseSubtitlePopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectEraseSubtitleClose();
  }, [anchor, deselectEraseSubtitleClose, trackActionEnd]);
  const handleEraseSubtitleSubmit = reactExports.useCallback(
    (mode2) => {
      if (mode2 === "auto") {
        trackActionEnd("erase-subtitle", "apply", {
          mode: "auto",
        });
        submitEraseSubtitleHook({
          mode: "Subtitle",
        });
        handleEraseSubtitleClose();
      } else {
        setShowEraseSubtitlePopover(false);
        setShowEraseSubEditor(true);
      }
    },
    [submitEraseSubtitleHook, handleEraseSubtitleClose, trackActionEnd],
  );
  const handleEraseSubEditorCancel = reactExports.useCallback(() => {
    trackActionEnd("erase-subtitle", "abandon", void 0, eraseSubRegions.length > 0);
    setShowEraseSubEditor(false);
  }, [eraseSubRegions.length, trackActionEnd]);
  const handleEraseSubEditorConfirm = reactExports.useCallback(
    (regions) => {
      trackActionEnd("erase-subtitle", "apply", {
        mode: "manual",
        region_count: regions.length,
      });
      setEraseSubRegions(regions);
      submitEraseSubtitleHook({
        mode: "Text",
        regions,
      });
      setShowEraseSubEditor(false);
    },
    [submitEraseSubtitleHook, trackActionEnd],
  );
  const { submit: submitAsrHook } = useAsrSubmit({
    id: nodeId,
    meta: meta2,
    submitAsr,
  });
  const handleAsrOpen = reactExports.useCallback(() => {
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowHailuo03SuperResolutionPopover(false);
    setShowEraseSubtitlePopover(false);
    setShowAsrPopover(true);
  }, []);
  const deselectAsrClose = usePopoverCloseWithDeselect(nodeId, setShowAsrPopover);
  const handleAsrClose = reactExports.useCallback(() => {
    trackActionEnd("asr", "abandon");
    if (anchor.kind === "rect") {
      setShowAsrPopover(false);
      anchor.onCloseAll();
      return;
    }
    deselectAsrClose();
  }, [anchor, deselectAsrClose, trackActionEnd]);
  const handleAsrSubmit = reactExports.useCallback(
    (params) => {
      trackActionEnd("asr", "apply", params);
      submitAsrHook(params);
      handleAsrClose();
    },
    [submitAsrHook, handleAsrClose, trackActionEnd],
  );
  const [showCustomizeToolbar, setShowCustomizeToolbar] = reactExports.useState(false);
  const handleCustomizeToolbar = reactExports.useCallback(() => {
    setShowCustomizeToolbar(true);
  }, []);
  const buildIncomingReferenceKey = reactExports.useCallback(() => {
    const sources = [...getIncomingSourceIds(nodeId)].sort();
    const imagePaths = resolveReferenceImages(
      sources,
      meta2?.referenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
    return JSON.stringify({
      sources,
      imagePaths,
    });
  }, [nodeId, meta2?.referenceImageIds, assetMetadataStore, getIncomingSourceIds, getNodeById]);
  const [incomingSourceKey, setIncomingSourceKey] =
    reactExports.useState(buildIncomingReferenceKey);
  reactExports.useEffect(() => {
    const unsubscribe = subscribeGraphChange(() => {
      const key2 = buildIncomingReferenceKey();
      setIncomingSourceKey((prev) => (prev === key2 ? prev : key2));
    });
    return unsubscribe;
  }, [buildIncomingReferenceKey, subscribeGraphChange]);
  reactExports.useEffect(() => {
    if (!showI2VPopover) return;
    const sources = getIncomingSourceIds(nodeId);
    setReferenceImagePaths(
      resolveReferenceImages(sources, meta2?.referenceImageIds, assetMetadataStore, getNodeById),
    );
    setReferenceVideoPaths(resolveReferenceVideos(sources, void 0, assetMetadataStore));
    setReferenceAudioPaths(resolveReferenceAudios(sources, void 0, assetMetadataStore));
    setReferenceTextPaths(resolveReferenceTexts(sources, void 0, assetMetadataStore, getNodeById));
    refreshUpstreamText(sources);
  }, [
    incomingSourceKey,
    showI2VPopover,
    meta2?.referenceImageIds,
    nodeId,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  const upstreamVideoMeta = useUpstreamSameTypeMeta(nodeId, "video");
  const lastUsedVideo = getLastUsedModelParams?.("i2v");
  const videoPopoverModelInitialization = resolveVideoPopoverModelInitialization({
    isUserEmpty,
    lastUsedModelId: lastUsedVideo?.modelId,
    draftModelId: i2vDraft?.modelId,
    assetModelId: modelInfo?.id,
    assetMetadataModelId: meta2?.model_id,
    assetParamsModelName: meta2?.params?.model_name,
    generatingModelId: generating?.modelId,
    upstreamModelId: upstreamVideoMeta?.modelId,
  });
  const i2vDefaultParams =
    i2vDraft?.params ?? meta2?.params ?? generating?.params ?? upstreamVideoMeta?.params;
  const surfaceVisible = anchor.kind === "rect" || selected2;
  const i2vOriginalGenerationDraft = reactExports.useMemo(
    () =>
      buildOriginalGenerationDraft(
        meta2?.prompt,
        modelInfo?.id ?? meta2?.model_id,
        meta2?.params,
        referenceImagePaths,
      ),
    [meta2?.prompt, modelInfo?.id, meta2?.model_id, meta2?.params, referenceImagePaths],
  );
  const i2vRestoreOriginalDraft =
    !isUserEmpty && draftOverridesOriginalGeneration(i2vDraft, i2vOriginalGenerationDraft)
      ? i2vOriginalGenerationDraft
      : void 0;
  const resolvedLightboxItems = reactExports.useMemo(() => {
    if (lightboxItems && lightboxItems.length > 0) return lightboxItems;
    const fallback = lightboxItemFromAssetMeta("video", meta2);
    return fallback ? [fallback] : [];
  }, [lightboxItems, meta2]);
  const toolbarVisible =
    anchor.kind === "rect"
      ? !isGenerating && !isUserEmpty
      : isInteractiveSelect && !isGenerating && !isUserEmpty && !watermark?.open;
  const toolbarRenderShell =
    anchor.kind === "rect"
      ? (children2) => {
          const rect = anchor.rect;
          const placeAbove = rect.top > TOOLBAR_HEIGHT + 16;
          const top2 = placeAbove
            ? rect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP
            : rect.bottom + TOOLBAR_GAP;
          const left = rect.left + rect.width / 2;
          return reactDomExports.createPortal(
            // biome-ignore lint/a11y/noStaticElementInteractions: anchor wrapper; child palette owns all interactive surfaces
            // biome-ignore lint/a11y/useKeyWithClickEvents: wrapper stops mouse propagation only; keyboard handled by inner controls
            <div
              className="nodrag nowheel"
              data-clip-popover-portal="true"
              style={{
                position: "fixed",
                top: top2,
                left,
                transform: "translateX(-50%)",
                zIndex: PORTAL_TOOLBAR_Z,
              }}
              onMouseDown={(e2) => e2.stopPropagation()}
              onClick={(e2) => e2.stopPropagation()}
            >
              {children2}
            </div>,
            document.body,
          );
        }
      : void 0;
  const i2vRenderShell =
    anchor.kind === "rect"
      ? (props) => {
          const pos = buildPopoverPosition(
            anchor.rect,
            I2V_POPOVER_WIDTH,
            props.expanded ? I2V_POPOVER_HEIGHT_EXPANDED : I2V_POPOVER_HEIGHT_COMPACT,
          );
          return (
            <FixedPortalCard
              top={pos.top}
              left={pos.left}
              width={I2V_POPOVER_WIDTH}
              height={pos.height}
              transitionHeight={true}
              promptLayout={true}
            >
              {props.children}
            </FixedPortalCard>
          );
        }
      : void 0;
  const enhanceRenderShell =
    anchor.kind === "rect"
      ? (props) => {
          const pos = buildPopoverPosition(
            anchor.rect,
            ENHANCE_POPOVER_WIDTH,
            ENHANCE_POPOVER_HEIGHT,
          );
          return (
            <FixedPortalCard
              top={pos.top}
              left={pos.left}
              width={ENHANCE_POPOVER_WIDTH}
              height={void 0}
            >
              {props.children}
            </FixedPortalCard>
          );
        }
      : void 0;
  return (
    <>
      {toolbarVisible && (
        <VideoNodeToolbarSection
          hasVideo={!!meta2?.path}
          enhanceDisabled={!submitEnhanceVideo}
          onEnhance={handleEnhanceOpen}
          hailuo03SuperResolutionVisible={hailuo03SuperResolutionVisible}
          hailuo03SuperResolutionDisabled={!submitHailuo03VideoSuperResolution}
          hailuo03SuperResolutionDurationSec={resolveHailuo03SuperResolutionDuration(meta2)}
          onHailuo03SuperResolution={handleHailuo03SuperResolutionOpen}
          eraseSubtitleDisabled={!submitEraseSubtitle}
          onEraseSubtitle={handleEraseSubtitleOpen}
          asrDisabled={!submitAsr}
          onAsr={handleAsrOpen}
          contentToolbarItems={contentToolbarItems}
          onWatermark={watermark ? handleWatermarkOpen : void 0}
          onAddToClipNode={
            onInstantiatePlugin && anchor.kind === "node" && meta2?.path
              ? handleAddToClipNode
              : void 0
          }
          handleCustomizeToolbar={handleCustomizeToolbar}
          renderShell={toolbarRenderShell}
          onToolClick={handleToolClickTrack}
        />
      )}
      <CustomizeToolbarDialog
        open={showCustomizeToolbar}
        onOpenChange={setShowCustomizeToolbar}
        hasPromoteToAsset={contentToolbarItems.some((it2) => it2.id === "promote-to-asset")}
        onApply={(detail) => trackActionEnd("customize-toolbar", "apply", detail)}
        onAbandon={(hadProgress) =>
          trackActionEnd("customize-toolbar", "abandon", void 0, hadProgress)
        }
      />
      {showLightbox && resolvedLightboxItems.length > 0 && (
        <VideoLightbox
          items={resolvedLightboxItems}
          initialIndex={lightboxIndexOverride ?? lightboxInitialIndex}
          onClose={closeLightbox}
        />
      )}
      {showClipPanel && playbackUrl && (
        <VideoClipPanel
          videoUrl={playbackUrl}
          videoName={meta2?.name ?? "video"}
          onClose={() => {
            trackActionEnd("clip", "abandon");
            closeClipPanel();
          }}
          onExport={async (blob, filename) => {
            trackActionEnd("clip", "apply", {
              output_bytes: blob.size,
            });
            await handleClipExport(blob, filename);
          }}
        />
      )}
      {showFramePanel && playbackUrl && (
        <VideoFramePanel
          videoUrl={playbackUrl}
          videoName={meta2?.name ?? "video"}
          onClose={() => {
            trackActionEnd("extract-frame", "abandon");
            closeFramePanel();
          }}
          onExport={async (blob, filename) => {
            trackActionEnd("extract-frame", "apply", {
              output_bytes: blob.size,
            });
            await handleClipExport(blob, filename);
          }}
        />
      )}
      {colorAdjust.open && playbackUrl && (
        <VideoColorAdjustDialog
          {...colorAdjust.dialogProps}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) trackActionEnd("color-adjust", "abandon");
            colorAdjust.dialogProps.onOpenChange(nextOpen);
          }}
          onConfirm={async (blob) => {
            trackActionEnd("color-adjust", "apply", {
              output_bytes: blob.size,
            });
            await colorAdjust.dialogProps.onConfirm(blob);
          }}
          videoSrc={playbackUrl}
          videoName={meta2?.name}
        />
      )}
      {surfaceVisible && showI2VPopover && (
        <I2VPopover
          onSubmit={handleI2VSubmit}
          onClose={handleI2VClose}
          listVideoModels={fetchVideoModels}
          selfAssetIds={selfAssetIds}
          defaultImagePaths={referenceImagePaths}
          defaultImageDraftPaths={i2vDraft?.imagePaths}
          defaultVideoPaths={resolveDefaultReferencePaths(
            referenceVideoPaths,
            i2vDraft?.videoPaths,
          )}
          defaultAudioPaths={resolveDefaultReferencePaths(
            referenceAudioPaths,
            i2vDraft?.audioPaths,
          )}
          defaultPrompt={i2vDraft?.prompt ?? meta2?.prompt ?? generating?.prompt}
          defaultPromptJson={i2vDraft?.promptJson}
          defaultModelId={videoPopoverModelInitialization.defaultModelId}
          defaultParams={i2vDefaultParams}
          prefillApplyToken={starterPresetToken}
          lastUsedModelId={lastUsedVideo?.modelId}
          lastUsedParams={lastUsedVideo?.params}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={nodeId}
          showCountChip={anchor.kind === "node"}
          isGenerating={isGenerating && !generating?.error}
          onAspectRatioChange={onAspectRatioChange}
          onSelectedModelChange={onI2VSelectedModelChange}
          onSaveDraft={
            anchor.kind === "node" ? (draft) => savePopoverDraft(nodeId, "i2v", draft) : void 0
          }
          originalGenerationDraft={anchor.kind === "node" ? i2vRestoreOriginalDraft : void 0}
          submitLabel={
            anchor.kind === "rect"
              ? t2("canvas.clipUpstream.submitGenerate", {
                  defaultValue: "生成",
                })
              : void 0
          }
          renderShell={i2vRenderShell}
          defaultTextPaths={defaultTextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          providerTaskId={providerTaskId}
          popoverGapOffset={popoverGapOffset}
        />
      )}
      {surfaceVisible && showEnhancePopover && (
        <EnhanceVideoPopover
          onSubmit={handleEnhanceSubmit}
          onClose={handleEnhanceClose}
          currentResolution={currentEnhanceResolution}
          currentFps={currentEnhanceFps}
          defaultResolution={currentEnhanceResolution ?? defaultEnhanceResolution}
          defaultFps={currentEnhanceFps ?? 60}
          durationSec={meta2?.durationSec}
          renderShell={enhanceRenderShell}
        />
      )}
      {surfaceVisible && showHailuo03SuperResolutionPopover && (
        <Hailuo03SuperResolutionPopover
          onSubmit={handleHailuo03SuperResolution}
          onClose={handleHailuo03SuperResolutionClose}
          durationSec={resolveHailuo03SuperResolutionDuration(meta2)}
          renderShell={enhanceRenderShell}
        />
      )}
      {surfaceVisible && showEraseSubtitlePopover && anchor.kind === "node" && (
        <EraseSubtitlePopover
          mode={eraseSubMode}
          onModeChange={setEraseSubMode}
          onSubmit={handleEraseSubtitleSubmit}
          onClose={handleEraseSubtitleClose}
        />
      )}
      {surfaceVisible && showEraseSubEditor && anchor.kind === "node" && playbackUrl && (
        <EraseSubtitleEditor
          videoSrc={playbackUrl}
          videoName={meta2?.name}
          initialRegions={eraseSubRegions}
          onCancel={handleEraseSubEditorCancel}
          onConfirm={handleEraseSubEditorConfirm}
        />
      )}
      {surfaceVisible && showAsrPopover && anchor.kind === "node" && (
        <AsrPopover
          onSubmit={handleAsrSubmit}
          onClose={handleAsrClose}
          defaultLanguage={DEFAULT_ASR_LANGUAGE}
        />
      )}
    </>
  );
}
function buildPopoverPosition(rect, width, height) {
  const placeBelow = window.innerHeight - rect.bottom > height + 24;
  const desiredLeft = rect.left + rect.width / 2 - width / 2;
  const clampedLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(window.innerWidth - width - VIEWPORT_MARGIN, desiredLeft),
  );
  const top2 = placeBelow
    ? rect.bottom + NODE_POPOVER_SAFE_GAP
    : Math.max(VIEWPORT_MARGIN, rect.top - height - NODE_POPOVER_SAFE_GAP);
  return {
    top: top2,
    left: clampedLeft,
    height,
  };
}
function FixedPortalCard({
  top: top2,
  left,
  width,
  height,
  transitionHeight,
  promptLayout = false,
  children: children2,
}) {
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: portaled popover frame; child popover owns all interactive surfaces
    // biome-ignore lint/a11y/useKeyWithClickEvents: outer card stops mouse propagation only; keyboard handled by inner controls
    <div
      className={`nodrag nowheel${promptLayout ? " gap-2" : ""}`}
      data-clip-popover-portal="true"
      data-action-ui-id={promptLayout ? "popover.shell" : void 0}
      style={{
        position: "fixed",
        top: top2,
        left,
        width,
        height,
        zIndex: PORTAL_POPOVER_Z,
        background: "var(--canvas-controls-bg)",
        border: "1px solid var(--canvas-controls-border)",
        boxShadow: "var(--canvas-shadow-dropdown)",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "i2v-popover-in 0.15s ease-out",
        transition: transitionHeight ? "height 250ms ease-out" : void 0,
      }}
      onMouseDown={(e2) => e2.stopPropagation()}
      onClick={(e2) => e2.stopPropagation()}
    >
      {children2}
    </div>,
    document.body,
  );
}
function VideoStarterIcon({ presetId }) {
  const firstLastFrame = presetId === "first-last-frame" || presetId === "h3-max-first-last-frame";
  return (
    <CompositedSvg
      data-role="mode-icon"
      className="size-4 shrink-0"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {firstLastFrame ? (
        <path d="M4.66667 2V14M2 5H4.66667M2 8H14M2 11H4.66667M11.3333 2V14M11.3333 5H14M11.3333 11H14M3.33333 2H12.6667C13.403 2 14 2.59695 14 3.33333V12.6667C14 13.403 13.403 14 12.6667 14H3.33333C2.59695 14 2 13.403 2 12.6667V3.33333C2 2.59695 2.59695 2 3.33333 2Z" />
      ) : presetId === "audio-video-extension" ? (
        <>
          <path
            d="M6.75582 14.2549C7.99293 14.501 9.27522 14.3747 10.4405 13.892C11.6059 13.4093 12.6019 12.5919 13.3026 11.5431C14.0034 10.4944 14.3774 9.26134 14.3774 8"
            strokeDasharray="0.96 1.6"
          />
          <path d="M14.3774 1.62256V5.16558H10.8344M14.3774 5.16558L12.776 3.56413C11.4942 2.32494 9.78289 1.62927 8 1.62256C6.73866 1.62256 5.50565 1.99659 4.45689 2.69735C3.40812 3.39811 2.59071 4.39413 2.10802 5.55946C1.62532 6.72478 1.49903 8.00707 1.7451 9.24418C1.99118 10.4813 2.59857 11.6176 3.49047 12.5095M7.54535 5.12589V8.45922L10.212 9.79256" />
        </>
      ) : (
        <>
          <path d="M4.2 10.1L10.5 3.8A1.55 1.55 0 0 1 12.7 6L6.4 12.3L3.4 13.1L4.2 10.1Z" />
          <path d="M3.1 3.5C1.6 4.8 3.2 7.7 5.7 10.2C8.2 12.7 11.2 14.2 12.4 13C13.2 12.2 12.7 10.5 11.6 8.8" />
          <path d="M5.8 1.5L6.3 2.7L7.5 3.2L6.3 3.7L5.8 4.9L5.3 3.7L4.1 3.2L5.3 2.7Z" />
        </>
      )}
    </CompositedSvg>
  );
}
const VIDEO_EMPTY_STARTER_SIZE = VIDEO_EMPTY_CARD_SIZE;
const H3_MAX_MODEL_IDS = new Set(["MiniMax-H3-Max", "MiniMax-H3-Max-Turbo"]);
const H3_MAX_STARTER_MODES = new Set(["text-to-video", "first-last-frame"]);
function VideoEmptyStarter({ nodeId, modelId, modelName }) {
  const { t: t2 } = useTranslation();
  const { videoStarterPresets, applyVideoStarterPreset } = useCanvasBridge();
  const {
    savePopoverDraft,
    selectNodeExclusive,
    getNodeById,
    getIncomingSourceIds,
    removeDerivationEdge,
    removeNode,
  } = useCanvasActions();
  const markPresetApplied = useVideoStarterPresetStore((state2) => state2.markApplied);
  const rememberPresetRefNodes = useVideoStarterPresetStore((state2) => state2.rememberRefNodes);
  const takePresetRefNodes = useVideoStarterPresetStore((state2) => state2.takeRefNodes);
  const [applying, setApplying] = reactExports.useState(false);
  const matchingPresets = videoStarterPresets?.filter((preset2) => {
    if (preset2.modelId && modelId && preset2.modelId !== modelId) return false;
    if (H3_MAX_MODEL_IDS.has(modelId ?? "")) {
      return H3_MAX_STARTER_MODES.has(preset2.params.image_mode ?? "");
    }
    return true;
  });
  const presets2 = matchingPresets && matchingPresets.length > 0 ? matchingPresets : void 0;
  const handlePresetClick = reactExports.useCallback(
    (preset2) => {
      if (applying) return;
      savePopoverDraft(nodeId, "i2v", {
        dirty: true,
        source: "user",
        prompt: preset2.prompt,
        ...(preset2.modelId
          ? {
              modelId: preset2.modelId,
            }
          : {}),
        params: {
          ...preset2.params,
        },
      });
      selectNodeExclusive(nodeId);
      markPresetApplied(nodeId);
      for (const previousRefNodeId of takePresetRefNodes(nodeId)) {
        removeNode(previousRefNodeId);
      }
      for (const sourceId of getIncomingSourceIds(nodeId)) {
        removeDerivationEdge(sourceId, nodeId);
      }
      if (preset2.refs.length === 0 || !applyVideoStarterPreset) return;
      const node2 = getNodeById(nodeId);
      if (!node2) return;
      setApplying(true);
      void applyVideoStarterPreset({
        videoNodeId: nodeId,
        preset: preset2,
        videoNodePosition: node2.position,
        videoNodeSize: node2.size,
      })
        .then((result) => {
          if (result?.createdNodeIds?.length) {
            rememberPresetRefNodes(nodeId, result.createdNodeIds);
          }
        })
        .catch(() => void 0)
        .finally(() => setApplying(false));
    },
    [
      applying,
      applyVideoStarterPreset,
      getIncomingSourceIds,
      getNodeById,
      markPresetApplied,
      nodeId,
      rememberPresetRefNodes,
      removeDerivationEdge,
      removeNode,
      savePopoverDraft,
      selectNodeExclusive,
      takePresetRefNodes,
    ],
  );
  return (
    <NodeEmptyState
      actionUiId="canvas.video-empty-starter"
      icon={<VideoPlaceholderIcon />}
      guidance={t2("canvas.videoNode.emptyStarter.title", {
        model: modelName ?? "MiniMax H3 Max",
        defaultValue: "Try {{model}}",
      })}
      suggestions={presets2?.map((preset2) => ({
        id: `canvas.video-empty-starter.${preset2.id}`,
        icon: <VideoStarterIcon presetId={preset2.id} />,
        label: preset2.title,
        onSelect: () => handlePresetClick(preset2),
        disabled: applying,
      }))}
    />
  );
}
const PENDING_PRESENTATION_DELAY_MS = 500;
function shouldDelayVideoPendingPresentation(liveGenerating, persistedGenerating) {
  return liveGenerating?.phase === "generating" && persistedGenerating?.phase === "pending";
}
function resolveVideoGeneratingPresentation(
  liveGenerating,
  persistedGenerating,
  pendingPresentationDelayElapsed,
) {
  if (persistedGenerating?.phase === "pending") {
    if (liveGenerating?.phase === "generating" && !pendingPresentationDelayElapsed) {
      return liveGenerating;
    }
    return persistedGenerating;
  }
  return liveGenerating ?? persistedGenerating;
}
function resolveVideoLightboxIndexForSlot(items, slot, fallbackIndex) {
  return resolveLightboxIndexForSlot(items, slot, fallbackIndex);
}
function initialVideoThumbnailState(hasThumbnailBase) {
  return hasThumbnailBase ? "cached" : "fallback";
}
function advanceVideoThumbnailState(state2) {
  return state2 === "cached" ? "forced" : "fallback";
}
function resolveVideoThumbnailUrl(thumbnailBase, state2) {
  if (!thumbnailBase || state2 === "fallback") return void 0;
  if (state2 === "cached") return thumbnailBase;
  return `${thumbnailBase}${thumbnailBase.includes("?") ? "&" : "?"}force=1`;
}
function shouldShowVideoThumbnailFallback(options) {
  if (options.isEmpty) return false;
  return options.thumbnailState === "fallback";
}
function pickVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates2 = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mimeType of candidates2) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return {
          mimeType,
          containerType: mimeType.split(";")[0] ?? "video/webm",
        };
      }
    } catch {}
  }
  return null;
}
function estimateWatermarkVideoBitrate(width, height) {
  const bitsPerSecond = Math.round(width * height * 30 * 0.22);
  return Math.max(4e6, Math.min(6e7, bitsPerSecond));
}
function waitForMetadata(video) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("video-watermark: source load failed"));
    };
    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("error", handleError);
  });
}
async function renderWatermarkedVideoSource(sourceUrl, settings) {
  const mime = pickVideoMimeType();
  if (!mime || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
    throw new Error("video-watermark: video encoding is unavailable");
  }
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  await waitForMetadata(video);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("video-watermark: 2d context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const canvasStream = canvas.captureStream(30);
  let audioContext = null;
  let audioSource = null;
  let audioDestination = null;
  try {
    audioContext = new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    audioSource = audioContext.createMediaElementSource(video);
    audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);
  } catch {
    audioContext = null;
    audioSource = null;
    audioDestination = null;
  }
  const tracks = [...canvasStream.getVideoTracks()];
  if (audioDestination) tracks.push(...audioDestination.stream.getAudioTracks());
  const outputStream = new MediaStream(tracks);
  const recorder = new MediaRecorder(outputStream, {
    mimeType: mime.mimeType,
    videoBitsPerSecond: estimateWatermarkVideoBitrate(canvas.width, canvas.height),
  });
  const chunks = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  const encoded = new Promise((resolve, reject) => {
    recorder.addEventListener("stop", () =>
      resolve(
        new Blob(chunks, {
          type: mime.containerType,
        }),
      ),
    );
    recorder.addEventListener("error", () => reject(new Error("video-watermark: encoding failed")));
  });
  let stopped = false;
  let animationFrame = 0;
  const drawFrame = () => {
    if (stopped) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(context, canvas.width, canvas.height, settings);
    animationFrame = requestAnimationFrame(drawFrame);
  };
  try {
    recorder.start();
    animationFrame = requestAnimationFrame(drawFrame);
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }
    await new Promise((resolve, reject) => {
      video.addEventListener("ended", () => resolve(), {
        once: true,
      });
      video.addEventListener("error", () => reject(new Error("video-watermark: playback failed")), {
        once: true,
      });
    });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(context, canvas.width, canvas.height, settings);
    stopped = true;
    cancelAnimationFrame(animationFrame);
    await new Promise((resolve) => setTimeout(resolve, 80));
    recorder.stop();
    return await encoded;
  } finally {
    stopped = true;
    cancelAnimationFrame(animationFrame);
    if (recorder.state !== "inactive") recorder.stop();
    for (const track of outputStream.getTracks()) track.stop();
    try {
      audioSource?.disconnect();
      audioDestination?.disconnect();
      await audioContext?.close();
    } catch {}
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}
async function renderWatermarkedVideoBlob(sourceUrl, settings) {
  try {
    return await renderWatermarkedVideoSource(sourceUrl, settings);
  } catch (error) {
    const isSourceDecodeFailure =
      error instanceof Error && error.message === "video-watermark: source load failed";
    const fallbackUrl = resolveVideoPlaybackUrl(sourceUrl);
    if (!isSourceDecodeFailure || fallbackUrl === sourceUrl) throw error;
    return renderWatermarkedVideoSource(fallbackUrl, settings);
  }
}
const MEDIA_OVERLAY_EXIT_ANIMATION_MS = 160;
const VIDEO_ACTION_SURFACE_ACTIVATION_DELAY_MS = 80;
export function VideoNodeInner({ id: id2, data: data2, selected: selected2, width, height }) {
  const { t: t2 } = useTranslation();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting && !isDragging;
  const [selectionActionSurfaceReady, setSelectionActionSurfaceReady] =
    reactExports.useState(false);
  const [emptyStarterModel, setEmptyStarterModel] = reactExports.useState({
    id: "MiniMax-H3-Max",
    name: "MiniMax H3 Max",
  });
  const handleI2VSelectedModelChange = reactExports.useCallback((modelId, modelName) => {
    if (!modelId || !modelName) return;
    setEmptyStarterModel({
      id: modelId,
      name: modelName,
    });
  }, []);
  reactExports.useEffect(() => {
    if (!selected2 || !isInteractiveSelect) {
      setSelectionActionSurfaceReady(false);
      return;
    }
    const timeoutId = window.setTimeout(
      () => setSelectionActionSurfaceReady(true),
      VIDEO_ACTION_SURFACE_ACTIVATION_DELAY_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [selected2, isInteractiveSelect]);
  const generatingStateStore = useGeneratingStateApi();
  const { view: videoView, roundCount, activeRoundIndex } = useVideoNodeView(id2, data2);
  const subVideos = useSubImages(id2);
  const primaryAssetKey = videoView.primary?.id ?? id2;
  const meta2 = useAssetMeta(primaryAssetKey);
  const fileVersion = useFileVersion(meta2?.path);
  const versionedUrl = meta2?.url ? appendCanvasFileVersion(meta2.url, fileVersion) : void 0;
  const displayMeta = reactExports.useMemo(
    () =>
      meta2 && versionedUrl
        ? {
            ...meta2,
            url: versionedUrl,
          }
        : meta2,
    [meta2, versionedUrl],
  );
  const assetMetadataStore = useAssetMetadataApi();
  const {
    onAddToChat,
    cropImage,
    onPlaceholderUpload,
    extractVideoAudio,
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    onLutImport,
    onPromoteToAsset,
    onSaveAs,
    onRetryGeneration,
    isRetryGenerationPending,
    onCancelGenerationQueue,
    isCancelGenerationQueuePending,
  } = useCanvasBridge();
  const onRename = useNodeRename(id2, isCloneData(data2));
  const reactFlow = useReactFlow();
  const nodeWidth = width || VIDEO_CARD_MAX_WIDTH;
  const [showWatermarkPopover, setShowWatermarkPopover] = reactExports.useState(false);
  const [watermarkSettings, setWatermarkSettings] = reactExports.useState(() => ({
    ...DEFAULT_WATERMARK_SETTINGS,
    text: t2("canvas.watermark.defaultText", "@ 水印文案"),
  }));
  const [watermarkFocusTarget, setWatermarkFocusTarget] = reactExports.useState(null);
  useCropViewportZoom(
    watermarkFocusTarget,
    0,
    WATERMARK_PANEL_WIDTH + NODE_POPOVER_SAFE_GAP,
    0,
    1.25,
  );
  const emitWatermarkedVideo = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const hasEmptyId = useNodeIsEmpty(id2);
  const isUserEmpty = hasEmptyId && !meta2;
  const { emptyAspectRatio, setEmptyAspectRatio } = useEmptyAspectRatio({
    id: id2,
    data: data2,
    isEmptyForWrite: isUserEmpty || !meta2?.url,
    draftKeys: ["i2v"],
  });
  const liveGenerating = useGenerating(id2);
  const persistedGenerating = reactExports.useMemo(() => {
    const persisted = data2;
    if (persisted?.status !== "pending" && persisted?.status !== "generating") return void 0;
    const prompt = typeof persisted.prompt === "string" ? persisted.prompt : "";
    const model =
      typeof persisted.model === "string"
        ? persisted.model
        : typeof persisted.model_id === "string"
          ? persisted.model_id
          : t2("canvas.video");
    const estimatedRemainingWaitSeconds = normalizeEstimatedWaitSeconds(
      persisted.estimatedRemainingWaitSeconds,
      persisted.estimatedRemainingWaitMinutes,
    );
    return {
      prompt,
      model,
      modelId: typeof persisted.model_id === "string" ? persisted.model_id : void 0,
      phase: persisted.status,
      prevUrl: meta2?.url,
      estimatedRemainingWaitSeconds,
      generationStartedAt: readGenerationStartedAt(persisted),
    };
  }, [data2, meta2?.url, t2]);
  const persistedErrorMessage =
    isGenerationErrorStatus(data2.status) && typeof data2.errorMessage === "string"
      ? data2.errorMessage
      : void 0;
  const persistedErrorReason =
    isGenerationErrorStatus(data2.status) && typeof data2.errorReason === "string"
      ? data2.errorReason
      : void 0;
  const persistedQueuePaused = data2.status === "queue_paused";
  const persistedRetryPayload =
    (isGenerationErrorStatus(data2.status) || persistedQueuePaused) &&
    data2.retryPayload &&
    typeof data2.retryPayload === "object"
      ? data2.retryPayload
      : void 0;
  reactExports.useEffect(() => {
    if (persistedErrorMessage !== void 0 || persistedQueuePaused) {
      generatingStateStore.getState().clear(id2);
    }
  }, [persistedErrorMessage, persistedQueuePaused, id2, generatingStateStore]);
  const delayPendingPresentation = shouldDelayVideoPendingPresentation(
    liveGenerating,
    persistedGenerating,
  );
  const [pendingPresentationDelayElapsed, setPendingPresentationDelayElapsed] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!delayPendingPresentation) {
      setPendingPresentationDelayElapsed(false);
      return;
    }
    const timeoutId = window.setTimeout(
      () => setPendingPresentationDelayElapsed(true),
      PENDING_PRESENTATION_DELAY_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [delayPendingPresentation]);
  const generating =
    persistedErrorMessage !== void 0 || persistedQueuePaused
      ? void 0
      : resolveVideoGeneratingPresentation(
          liveGenerating,
          persistedGenerating,
          pendingPresentationDelayElapsed,
        );
  const isGenerating = generating !== void 0;
  const isQueued = generating?.phase === "pending";
  const isH3MaxGenerating = [generating?.modelId, generating?.model].some((value) =>
    isMiniMaxH3MaxModelValue(value),
  );
  const generationProgressStartedAt =
    (isH3MaxGenerating ? readGenerationSubmittedAt(data2) : void 0) ??
    persistedGenerating?.generationStartedAt ??
    generating?.generationStartedAt;
  const handleResumeQueue = reactExports.useCallback(() => {
    if (!persistedRetryPayload) return;
    onRetryGeneration?.(id2, persistedRetryPayload);
  }, [id2, onRetryGeneration, persistedRetryPayload]);
  const handleCancelQueue = reactExports.useCallback(() => {
    onCancelGenerationQueue?.(id2);
  }, [id2, onCancelGenerationQueue]);
  const generatingProgress = useSimulatedProgress(
    isGenerating && !isQueued,
    "video",
    // Durable node.data wins over the in-memory store: it is the only source
    // that survives workspace close / app restart.
    generationProgressStartedAt,
    isH3MaxGenerating ? "h3-max-video" : void 0,
    readGenerationAttemptId(data2),
  );
  reactExports.useEffect(() => {
    if (isGenerating && meta2?.url && meta2.url !== generating?.prevUrl) {
      generatingStateStore.getState().clear(id2);
    }
  }, [isGenerating, meta2?.url, generating?.prevUrl, id2, generatingStateStore]);
  const generationErrorMessage = isGenerating ? generating?.error : persistedErrorMessage;
  const isErrorGenerating = !!generationErrorMessage;
  const generationErrorStatus = generationErrorMessage
    ? isGenerating
      ? (generating?.errorStatus ?? "error")
      : isGenerationErrorStatus(data2.status)
        ? data2.status
        : "error"
    : void 0;
  const isStarterEmpty =
    isIdleEmptyVideoNode({
      type: "video",
      isEmpty: isUserEmpty,
      data: data2,
    }) &&
    !isGenerating &&
    !persistedQueuePaused &&
    !isErrorGenerating;
  const isEmptyForSync = (isUserEmpty || !meta2?.url) && !isErrorGenerating;
  const targetEmptySize =
    isEmptyForSync && isStarterEmpty
      ? VIDEO_EMPTY_STARTER_SIZE
      : isEmptyForSync && emptyAspectRatio
        ? emptySizeFromRatio(emptyAspectRatio)
        : void 0;
  const targetEmptyWidth = targetEmptySize?.width;
  const targetEmptyHeight = targetEmptySize?.height;
  const lastSyncActionRef = reactExports.useRef("none");
  reactExports.useEffect(() => {
    const prev = lastSyncActionRef.current;
    if (isErrorGenerating) {
      if (prev !== "error") {
        reactFlow.setNodes((nodes) =>
          nodes.map((n2) => {
            if (n2.id !== id2) return n2;
            const { width: _w, height: _h, ...rest } = n2;
            return rest;
          }),
        );
        lastSyncActionRef.current = "error";
      }
      return;
    }
    if (isEmptyForSync) {
      if (targetEmptyWidth != null && targetEmptyHeight != null) {
        reactFlow.setNodes((nodes) =>
          nodes.map((n2) =>
            n2.id === id2
              ? {
                  ...n2,
                  width: targetEmptyWidth,
                  height: targetEmptyHeight,
                }
              : n2,
          ),
        );
        lastSyncActionRef.current = "empty";
      }
      return;
    }
    if (prev !== "none") {
      reactFlow.setNodes((nodes) =>
        nodes.map((n2) => {
          if (n2.id !== id2) return n2;
          const { width: _w, height: _h, ...rest } = n2;
          return rest;
        }),
      );
      lastSyncActionRef.current = "none";
    }
  }, [isErrorGenerating, isEmptyForSync, targetEmptyWidth, targetEmptyHeight, id2, reactFlow]);
  const lutBundle = useLutBundle(
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    "video",
    onLutImport,
  );
  const colorAdjust = useVideoColorAdjust({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
    lut: lutBundle,
  });
  const mediaActions = useMediaNodeActions({
    nodeId: id2,
    toolbarActive: selectionActionSurfaceReady,
    meta: meta2,
    fallbackPath: typeof data2.path === "string" ? data2.path || void 0 : void 0,
    fallbackWidth: nodeWidth,
    onAddToChat,
    cropImage,
    onExtractAudio: extractVideoAudio,
    onColorAdjust: colorAdjust.openDialog,
    enableFrameExtract: true,
    onPromoteToAsset,
  });
  const stop = useMediaPlayback((s2) => s2.stop);
  const [hovered, setHovered] = reactExports.useState(false);
  const thumbnailBase = reactExports.useMemo(() => {
    if (!meta2?.url || !meta2.path) return void 0;
    const base2 = buildVideoThumbBase(meta2.url, meta2.path);
    return base2 ? appendCanvasFileVersion(base2, fileVersion) : void 0;
  }, [fileVersion, meta2?.url, meta2?.path]);
  const [thumbnailState, setThumbnailState] = reactExports.useState(() =>
    initialVideoThumbnailState(Boolean(thumbnailBase)),
  );
  const canvasActive = useCanvasActive();
  const hoverTimerRef = reactExports.useRef(null);
  const hoverZoneRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setThumbnailState(initialVideoThumbnailState(Boolean(thumbnailBase)));
  }, [thumbnailBase]);
  const resolvedThumbnailUrl = resolveVideoThumbnailUrl(thumbnailBase, thumbnailState);
  const handleThumbnailError = reactExports.useCallback(() => {
    setThumbnailState(advanceVideoThumbnailState);
  }, []);
  const videoHeight = reactExports.useMemo(() => {
    const w3 = meta2?.width ?? meta2?.previewWidth;
    const h2 = meta2?.height ?? meta2?.previewHeight;
    if (w3 && h2 && w3 > 0 && h2 > 0) {
      return Math.round(nodeWidth * (h2 / w3));
    }
    return Math.round(nodeWidth * (9 / 16));
  }, [nodeWidth, meta2?.width, meta2?.height, meta2?.previewWidth, meta2?.previewHeight]);
  const handleWatermarkOpen = reactExports.useCallback(() => {
    if (!cropImage || !meta2?.url) return;
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, videoHeight);
    if (!rect) return;
    setWatermarkSettings({
      ...DEFAULT_WATERMARK_SETTINGS,
      text: t2("canvas.watermark.defaultText", "@ 水印文案"),
    });
    setWatermarkFocusTarget({
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
    });
    setShowWatermarkPopover(true);
  }, [cropImage, id2, meta2?.url, nodeWidth, reactFlow, t2, videoHeight]);
  const handleWatermarkClose = reactExports.useCallback(() => {
    setShowWatermarkPopover(false);
    setWatermarkFocusTarget(null);
  }, []);
  const handleMouseEnter = reactExports.useCallback(() => {
    if (!canvasActive || isDragging) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      if (
        !shouldActivateVideoHover({
          canvasActive,
          elementStillHovered: hoverZoneRef.current?.matches(":hover") ?? false,
          interactionBlocked: isDragging,
        })
      ) {
        return;
      }
      setHovered(true);
    }, 150);
  }, [canvasActive, isDragging]);
  const handleMouseLeave2 = reactExports.useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHovered(false);
    stop();
  }, [stop]);
  reactExports.useEffect(() => {
    if (!canvasActive || isDragging) handleMouseLeave2();
  }, [canvasActive, isDragging, handleMouseLeave2]);
  const handleDownload = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!onSaveAs || !meta2?.path) return;
      onSaveAs(meta2.path, meta2.name);
    },
    [onSaveAs, meta2?.path, meta2?.name],
  );
  const totalVideoCount = videoView.slots.length;
  const showVideoCountBadge = videoView.isMulti;
  const {
    isOverlayOpen,
    handleToggleOverlay,
    handleSetPrimary,
    handleSelectRound,
    handleDeleteSub,
    handleSplitSub,
    handleSplitAll,
    handleSplitMain,
    handleSubContextMenu,
    handleDownloadSub,
  } = useMultiImageActions({
    id: id2,
    view: videoView,
    subImages: subVideos,
    reactFlow,
    nodeWidth,
    nodeHeight: videoHeight,
  });
  const lightboxItems = reactExports.useMemo(() => {
    const allSlots = videoView.rounds.flat();
    if (allSlots.length === 0) {
      const item = lightboxItemFromAssetMeta("video", displayMeta);
      return item ? [item] : [];
    }
    const metadata = assetMetadataStore.getState();
    return lightboxItemsFromSlots("video", allSlots, {
      getMetaById: (assetId) => metadata.get(assetId),
      nodes: subVideos,
      primarySlotId: videoView.primary?.id,
      primaryMeta: displayMeta,
    });
  }, [videoView.rounds, videoView.primary?.id, displayMeta, assetMetadataStore, subVideos]);
  const lightboxInitialIndex = reactExports.useMemo(() => {
    if (lightboxItems.length === 0) return 0;
    return resolveVideoLightboxIndexForSlot(lightboxItems, videoView.primary, 0);
  }, [lightboxItems, videoView.primary]);
  const openLightbox = mediaActions.openLightbox;
  const handleOpenSubLightbox = reactExports.useCallback(
    (originalIndex) => {
      const targetSlot = videoView.slots[originalIndex];
      const targetIndex = resolveVideoLightboxIndexForSlot(
        lightboxItems,
        targetSlot,
        lightboxInitialIndex,
      );
      openLightbox(targetIndex);
    },
    [videoView.slots, lightboxItems, lightboxInitialIndex, openLightbox],
  );
  const handleVideoBadgeClick = reactExports.useCallback(
    (e2) => {
      if (videoView.rounds.length > 1 && videoView.slots.length === 1) {
        e2.stopPropagation();
        const nextRound = (videoView.activeRoundIndex + 1) % videoView.rounds.length;
        handleSelectRound(nextRound);
        return;
      }
      handleToggleOverlay(e2);
    },
    [
      videoView.rounds,
      videoView.slots.length,
      videoView.activeRoundIndex,
      handleSelectRound,
      handleToggleOverlay,
    ],
  );
  useWarnMissingAssetMeta({
    nodeId: id2,
    nodeType: "video",
    data: data2,
    meta: meta2,
    isUserEmpty,
  });
  const isEmpty2 = isUserEmpty || !meta2?.url;
  const isFallback = shouldShowVideoThumbnailFallback({
    isEmpty: isEmpty2,
    thumbnailState,
  });
  useMediaFallbackSize(
    id2,
    isFallback &&
      !isErrorGenerating &&
      !isGenerating &&
      !persistedQueuePaused &&
      !isMissingAssetNodeData(data2),
  );
  const shellWidth = isStarterEmpty
    ? VIDEO_EMPTY_STARTER_SIZE.width
    : isFallback
      ? MEDIA_FALLBACK_NODE_SIZE.width
      : nodeWidth;
  const expandedMediaOverlay = videoView.isMulti && isOverlayOpen && !isEmpty2 && !isFallback;
  const isPlaying = useMediaPlayback((s2) => s2.playingId === id2);
  const videoDurationLabel =
    typeof meta2?.durationSec === "number" &&
    Number.isFinite(meta2.durationSec) &&
    meta2.durationSec > 0
      ? formatTime$2(meta2.durationSec, true)
      : void 0;
  const [keepExpandedMediaOverlayMounted, setKeepExpandedMediaOverlayMounted] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (expandedMediaOverlay) {
      setKeepExpandedMediaOverlayMounted(true);
      return;
    }
    if (!keepExpandedMediaOverlayMounted) return;
    const timeoutId = setTimeout(() => {
      setKeepExpandedMediaOverlayMounted(false);
    }, MEDIA_OVERLAY_EXIT_ANIMATION_MS);
    return () => clearTimeout(timeoutId);
  }, [expandedMediaOverlay, keepExpandedMediaOverlayMounted]);
  const isExpandedMediaOverlayVisible = expandedMediaOverlay || keepExpandedMediaOverlayMounted;
  const isExpandedMediaOverlayClosing = keepExpandedMediaOverlayMounted && !expandedMediaOverlay;
  if (isMissingAssetNodeData(data2)) {
    return (
      <MissingAssetCard nodeId={id2} name={typeof data2?.name === "string" ? data2.name : void 0} />
    );
  }
  if (!meta2 && !isUserEmpty) return null;
  const videoCollapseLabel = t2("canvas.multiMedia.collapseView", "收起视图");
  const showVideoSplitAll =
    videoView.isMulti &&
    !videoView.hasLoading &&
    !isEmpty2 &&
    !isFallback &&
    videoView.slots.some(
      (slot, index2) => index2 !== videoView.primaryIndex && slot.status === "ready",
    );
  const showVideoSplitMain =
    videoView.rounds.length > 1 && !videoView.hasLoading && !isEmpty2 && !isFallback;
  const showCollapsedVideoSplitRow =
    !isExpandedMediaOverlayVisible && (showVideoSplitAll || showVideoSplitMain);
  const showCollapsedVideoActionRow =
    !isExpandedMediaOverlayVisible && (showVideoCountBadge || showCollapsedVideoSplitRow);
  return (
    <NodeShell
      id={id2}
      tagIds={meta2?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.video-node"
      dataState={
        isErrorGenerating
          ? "error"
          : isUserEmpty
            ? "empty"
            : isGenerating
              ? "generating"
              : meta2?.url
                ? "generated"
                : "empty"
      }
      onDoubleClick={isExpandedMediaOverlayVisible || isFallback ? void 0 : openLightbox}
      generating={isGenerating}
    >
      <div
        ref={hoverZoneRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave2}
        style={{
          position: "relative",
        }}
      >
        {!isExpandedMediaOverlayVisible && (
          <NodeHeader
            nodeType="video"
            tagIds={meta2?.tagIds}
            name={meta2?.name || t2("canvas.video")}
            selected={selected2}
            maxWidth={shellWidth}
            onRename={onRename}
          />
        )}
        <NodeBody
          width={shellWidth}
          tagIds={meta2?.tagIds}
          borderRadius={MEDIA_NODE_RADIUS}
          height={
            // Error: undefined so MediaErrorCard auto-sizes (centered
            // state block + wrapped footer). The wrapper sync effect also
            // drops width/height so ReactFlow measures DOM.
            isErrorGenerating
              ? void 0
              : isStarterEmpty
                ? VIDEO_EMPTY_STARTER_SIZE.height
                : isFallback
                  ? MEDIA_FALLBACK_NODE_SIZE.height
                  : isEmpty2 || isGenerating || persistedQueuePaused
                    ? emptyAspectRatio
                      ? emptySizeFromRatio(emptyAspectRatio).height
                      : (height ?? VIDEO_CARD_MAX_WIDTH)
                    : void 0
          }
          selected={selected2}
          panelPadding={isStarterEmpty ? 12 : void 0}
          variant={
            isErrorGenerating || isGenerating || persistedQueuePaused
              ? "media"
              : isEmpty2
                ? "panel"
                : "media"
          }
          className={
            videoView.isMulti && !isExpandedMediaOverlayVisible ? "canvas-media-stack" : void 0
          }
        >
          {generationErrorMessage ? (
            <MediaGenerationErrorOverlay
              nodeId={id2}
              nodeType="video"
              message={generationErrorMessage}
              errorReason={isGenerating ? generating?.errorReason : persistedErrorReason}
              retryPayload={isGenerating ? generating?.retryPayload : persistedRetryPayload}
              recoverable={generationErrorStatus === "recoverable_error"}
              uncertain={generationErrorStatus === "status_unknown"}
            />
          ) : persistedQueuePaused ? (
            <GeneratingMediaArea
              width="100%"
              height="100%"
              icon={<VideoPlaceholderIcon />}
              variant="queued"
              label={
                <QueueGenerationControl
                  state="paused"
                  onResume={handleResumeQueue}
                  resuming={isRetryGenerationPending?.(id2) ?? false}
                  canResume={!!persistedRetryPayload}
                  actionUiId="canvas.video-node.queue"
                />
              }
            />
          ) : isGenerating ? (
            <GeneratingMediaArea
              width="100%"
              height="100%"
              icon={<VideoPlaceholderIcon />}
              progress={isQueued ? void 0 : generatingProgress}
              variant={isQueued ? "queued" : "generating"}
              label={
                isQueued ? (
                  <QueueGenerationControl
                    state="queued"
                    onCancel={handleCancelQueue}
                    cancelling={isCancelGenerationQueuePending?.(id2) ?? false}
                    actionUiId="canvas.video-node.queue"
                  />
                ) : generating.estimatedRemainingWaitSeconds ? (
                  <GenerationWaitEstimate
                    seconds={generating.estimatedRemainingWaitSeconds}
                    actionUiId="canvas.video-node"
                  />
                ) : (
                  void 0
                )
              }
            />
          ) : isStarterEmpty || isEmpty2 ? (
            <PlaceholderUploadButton
              icon={<VideoPlaceholderIcon />}
              label={t2("canvas.uploadVideo")}
              onUpload={(anchor) => onPlaceholderUpload?.(id2, "video", anchor)}
            >
              {isStarterEmpty ? (
                <VideoEmptyStarter
                  nodeId={id2}
                  modelId={emptyStarterModel.id}
                  modelName={emptyStarterModel.name}
                />
              ) : (
                void 0
              )}
            </PlaceholderUploadButton>
          ) : isFallback ? (
            <MediaUnpreviewableFallback
              displayName={meta2?.name ?? t2("canvas.video")}
              extension={getFileExtension(meta2?.path) ?? getFileExtension(meta2?.name)}
              sizeLabel={formatFileSize(meta2?.fileSize)}
            />
          ) : (
            <div
              style={{
                position: "relative",
                width: nodeWidth,
                height: videoHeight,
              }}
            >
              {resolvedThumbnailUrl && (
                <CanvasImage
                  src={resolvedThumbnailUrl}
                  nodeId={id2}
                  width={nodeWidth}
                  height={videoHeight}
                  alt={meta2?.name}
                  onError={handleThumbnailError}
                />
              )}
              {videoDurationLabel && !isPlaying && (
                <div
                  data-action-ui-id="canvas.video-node.duration"
                  className="pointer-events-none absolute bottom-1 left-1 z-20 inline-flex h-6 items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2.5 text-[12px] font-medium tabular-nums text-[var(--canvas-media-control-fg)]"
                >
                  {videoDurationLabel}
                </div>
              )}
              {showVideoCountBadge && expandedMediaOverlay ? (
                <div
                  data-action-ui-id="canvas.video-node.expanded-actions"
                  className="pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
                >
                  <button
                    type="button"
                    data-action-ui-id="canvas.video-node.collapse-view"
                    onClick={handleVideoBadgeClick}
                    aria-label={videoCollapseLabel}
                    aria-expanded={expandedMediaOverlay}
                    className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] border-0 bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  >
                    {videoCollapseLabel}
                  </button>
                  {showVideoSplitAll && (
                    <VideoSplitAllButton onSplitAll={handleSplitAll} disabled={false} />
                  )}
                  {showVideoSplitMain && (
                    <VideoSplitMainButton onSplitMain={handleSplitMain} disabled={false} />
                  )}
                </div>
              ) : null}
              {showCollapsedVideoActionRow && (
                <div
                  data-action-ui-id="canvas.video-node.primary-actions"
                  className="canvas-media-primary-actions pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
                >
                  {showVideoCountBadge && (
                    <CountBadge
                      count={totalVideoCount}
                      expanded={isOverlayOpen}
                      unit={t2("canvas.multiVideo.countUnit", "段")}
                      onClick={handleVideoBadgeClick}
                    />
                  )}
                  {showCollapsedVideoSplitRow && (
                    <div
                      data-action-ui-id="canvas.video-node.split-actions"
                      className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {showVideoSplitAll && (
                        <VideoSplitAllButton onSplitAll={handleSplitAll} disabled={false} />
                      )}
                      {showVideoSplitMain && (
                        <VideoSplitMainButton onSplitMain={handleSplitMain} disabled={false} />
                      )}
                    </div>
                  )}
                </div>
              )}
              {canvasActive && !isDragging && hovered && meta2?.url && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                  }}
                >
                  <VideoPlayer
                    src={resolveVideoPlaybackUrl(versionedUrl ?? meta2.url)}
                    nodeId={id2}
                    width={nodeWidth}
                    height={videoHeight}
                    onFullscreen={openLightbox}
                  />
                </div>
              )}
              {showWatermarkPopover && (
                <ImageWatermarkPreview
                  displayWidth={nodeWidth}
                  displayHeight={videoHeight}
                  sourceWidth={meta2?.width ?? meta2?.previewWidth ?? nodeWidth}
                  settings={watermarkSettings}
                />
              )}
            </div>
          )}
        </NodeBody>
        {roundCount > 1 && !showWatermarkPopover && (
          <RoundDots count={roundCount} activeIdx={activeRoundIndex} onSelect={handleSelectRound} />
        )}
        {onSaveAs &&
          meta2?.path &&
          !isUserEmpty &&
          !isGenerating &&
          !isErrorGenerating &&
          !showWatermarkPopover && (
            <MediaDownloadButton
              onClick={handleDownload}
              dataActionUiId="canvas.video-node.download"
              label={t2("canvas.downloadVideo", "Download video")}
              className={`top-1 right-1 ${isExpandedMediaOverlayVisible || hovered ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
            />
          )}
      </div>
      {isExpandedMediaOverlayVisible && (
        <VideoMultiOverlay
          view={videoView}
          cardWidth={nodeWidth}
          cardHeight={videoHeight}
          closing={isExpandedMediaOverlayClosing}
          onSelectSlot={handleSetPrimary}
          onDeleteSub={handleDeleteSub}
          onSplitSub={handleSplitSub}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenSubLightbox}
          readonly={videoView.hasLoading}
        />
      )}
      {shouldRenderMediaActionSurface({
        selected: selectionActionSurfaceReady,
        showLightbox: mediaActions.showLightbox,
        showClipPanel: mediaActions.showClipPanel,
        showFramePanel: mediaActions.showFramePanel,
        showDialog: colorAdjust.open,
      }) && (
        <VideoActionSurface
          nodeId={id2}
          meta={meta2}
          data={data2}
          nodeWidth={nodeWidth}
          selected={selectionActionSurfaceReady && !isExpandedMediaOverlayVisible}
          isInteractiveSelect={selectionActionSurfaceReady}
          generating={generating}
          isGenerating={isGenerating}
          isUserEmpty={isUserEmpty}
          onAspectRatioChange={setEmptyAspectRatio}
          onI2VSelectedModelChange={handleI2VSelectedModelChange}
          anchor={{
            kind: "node",
          }}
          lightboxItems={lightboxItems}
          lightboxInitialIndex={lightboxInitialIndex}
          mediaActions={mediaActions}
          colorAdjust={colorAdjust}
          watermark={{
            open: showWatermarkPopover,
            onOpen: handleWatermarkOpen,
          }}
          popoverGapOffset={roundCount > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0}
        />
      )}
      {showWatermarkPopover && meta2?.url && (
        <WatermarkPopover
          sourceUrl={versionedUrl ?? meta2.url}
          settings={watermarkSettings}
          renderOutput={renderWatermarkedVideoBlob}
          onSettingsChange={setWatermarkSettings}
          onClose={handleWatermarkClose}
          onConfirm={async (blob) => {
            const extension2 = blob.type.includes("mp4") ? "mp4" : "webm";
            await emitWatermarkedVideo(blob, {
              suffix: "watermark",
              ext: extension2,
              baseFallback: "video",
            });
          }}
        />
      )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
    </NodeShell>
  );
}
