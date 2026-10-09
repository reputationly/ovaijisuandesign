// video-action-surface.jsx
import { useVideoStarterPresetStore } from "../canvas/use-video-starter-preset-store.js";
import {
  dedupedToast,
  isUserProvidedAssetModel,
  jsxRuntimeExports,
  reactDomExports,
  reactExports,
  useAssetMetadataApi,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ENHANCE_POPOVER_HEIGHT,
  ENHANCE_POPOVER_WIDTH,
  I2V_POPOVER_HEIGHT_COMPACT,
  I2V_POPOVER_HEIGHT_EXPANDED,
  I2V_POPOVER_WIDTH,
  PORTAL_POPOVER_Z,
  PORTAL_TOOLBAR_Z,
  resolveVideoPopoverModelInitialization,
  resolveVideoPopoverProviderTaskId,
  TOOLBAR_GAP,
  TOOLBAR_HEIGHT,
  VIEWPORT_MARGIN,
} from "./resolve-video-popover-model-initialization.js";
import {
  lightboxItemFromAssetMeta,
  NODE_POPOVER_SAFE_GAP,
  submitAfterOptionalDraftFlush,
} from "./use-warn-missing-asset-meta.jsx";
import { useHtmlFullscreenApi } from "../infra/use-plugin-metadata-store.js";
import { useModelForAsset } from "../infra/create-recently-added-store.js";
import { useCanvasBridge, useGeneratingStateApi } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { parseNodeId } from "../canvas/find-free-position-from-anchor.js";
import {
  CustomizeToolbarDialog,
  DEFAULT_ASR_LANGUAGE,
  isHailuo03SuperResolutionEligible,
  parseEnhanceFps,
  parseEnhanceResolution,
  resolveHailuo03SuperResolutionDuration,
  suggestNextResolution,
  useAsrSubmit,
  useEnhanceVideoSubmit,
  useEraseSubtitleSubmit,
} from "./video-tool-meta.jsx";
import { EnhanceVideoPopover } from "./enhance-video-popover.jsx";
import { Hailuo03SuperResolutionPopover } from "./hailuo03-super-resolution-popover.jsx";
import { EraseSubtitlePopover } from "./erase-subtitle-popover.jsx";
import { EraseSubtitleEditor } from "./erase-subtitle-editor.jsx";
import { AsrPopover } from "./asr-popover.jsx";
import { resolveVideoPlaybackUrl } from "../generation/to-workspace-browser-url.js";
import {
  buildOriginalGenerationDraft,
  draftOverridesOriginalGeneration,
  resolveActivePopoverDraft,
  resolveDefaultReferencePaths,
  resolveEditableTextReferencePaths,
} from "../generation/param-label-fallbacks.js";
import {
  resolveReferenceAudios,
  resolveReferenceTexts,
  usePopoverCloseWithDeselect,
} from "../generation/resolve-reference-texts.js";
import { VideoNodeToolbarSection } from "./video-node-toolbar-section.jsx";
import { VideoFramePanel } from "./frame-preview.jsx";
import { CLIP_STUDIO_PLUGIN_ID } from "./resolve-panorama-generation-presentation.js";
import {
  useUpstreamSameTypeMeta,
  useUpstreamTextContent,
} from "../assets/parse-prompt-to-tiptap.js";
import {
  resolveReferenceImages,
  resolveReferenceVideos,
} from "./base-backend.jsx";
import { VideoLightbox } from "./video-lightbox.jsx";
import { VideoClipPanel } from "./video-preview.jsx";
import { VideoColorAdjustDialog } from "./video-color-adjust-dialog.jsx";
import { I2VPopover } from "./free-path-shape.js";

function useVideoStarterPresetToken(nodeId) {
  return useVideoStarterPresetStore((state2) => state2.tokens[nodeId] ?? 0);
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

export function VideoActionSurface({
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
      if (
        info2.interaction === "opens_mode" ||
        info2.interaction === "opens_dialog"
      ) {
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
        interaction:
          action === "customize-toolbar" ? "opens_dialog" : "opens_mode",
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
  const [showEnhancePopover, setShowEnhancePopover] =
    reactExports.useState(false);
  const [
    showHailuo03SuperResolutionPopover,
    setShowHailuo03SuperResolutionPopover,
  ] = reactExports.useState(false);
  const [showEraseSubtitlePopover, setShowEraseSubtitlePopover] =
    reactExports.useState(false);
  const [showAsrPopover, setShowAsrPopover] = reactExports.useState(false);
  const [eraseSubMode, setEraseSubMode] = reactExports.useState("auto");
  const [eraseSubRegions, setEraseSubRegions] = reactExports.useState([]);
  const [showEraseSubEditor, setShowEraseSubEditor] =
    reactExports.useState(false);
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
  const deselectI2VClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowI2VPopover,
  );
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
      const isNewRound =
        anchor.kind === "node" && !isUserEmpty && !!replaceNodeId;
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
        onFlushError: () =>
          dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
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
  const forceShowPromptPopover =
    !!data2 && data2.forceShowPromptPopover === true;
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
  const [referenceImagePaths, setReferenceImagePaths] = reactExports.useState(
    [],
  );
  const [referenceVideoPaths, setReferenceVideoPaths] = reactExports.useState(
    [],
  );
  const [referenceAudioPaths, setReferenceAudioPaths] = reactExports.useState(
    [],
  );
  const [referenceTextPaths, setReferenceTextPaths] = reactExports.useState([]);
  const defaultTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    resolveReferenceTexts(
      getIncomingSourceIds(nodeId),
      void 0,
      assetMetadataStore,
      getNodeById,
    ),
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
      resolveReferenceImages(
        sources,
        meta2?.referenceImageIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    setReferenceVideoPaths(
      resolveReferenceVideos(
        sources,
        meta2?.referenceVideoIds,
        assetMetadataStore,
      ),
    );
    setReferenceAudioPaths(
      resolveReferenceAudios(
        sources,
        meta2?.referenceAudioIds,
        assetMetadataStore,
      ),
    );
    const persistedTextIds = data2?.referenceTextIds;
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(persistedTextIds)
          ? persistedTextIds
          : meta2?.referenceTextIds,
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
  const deselectEnhanceClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowEnhancePopover,
  );
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
    if (
      !submitHailuo03VideoSuperResolution ||
      !meta2?.path ||
      !meta2.providerTaskId
    )
      return;
    trackActionEnd("hailuo03-super-resolution", "apply", {
      resolution: "2K",
    });
    void submitHailuo03VideoSuperResolution(
      nodeId,
      meta2.path,
      meta2.providerTaskId,
    );
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
    trackActionEnd(
      "erase-subtitle",
      "abandon",
      void 0,
      eraseSubRegions.length > 0,
    );
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
  const deselectAsrClose = usePopoverCloseWithDeselect(
    nodeId,
    setShowAsrPopover,
  );
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
  const [showCustomizeToolbar, setShowCustomizeToolbar] =
    reactExports.useState(false);
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
  }, [
    nodeId,
    meta2?.referenceImageIds,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  const [incomingSourceKey, setIncomingSourceKey] = reactExports.useState(
    buildIncomingReferenceKey,
  );
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
      resolveReferenceImages(
        sources,
        meta2?.referenceImageIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    setReferenceVideoPaths(
      resolveReferenceVideos(sources, void 0, assetMetadataStore),
    );
    setReferenceAudioPaths(
      resolveReferenceAudios(sources, void 0, assetMetadataStore),
    );
    setReferenceTextPaths(
      resolveReferenceTexts(sources, void 0, assetMetadataStore, getNodeById),
    );
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
  const videoPopoverModelInitialization =
    resolveVideoPopoverModelInitialization({
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
    i2vDraft?.params ??
    meta2?.params ??
    generating?.params ??
    upstreamVideoMeta?.params;
  const surfaceVisible = anchor.kind === "rect" || selected2;
  const i2vOriginalGenerationDraft = reactExports.useMemo(
    () =>
      buildOriginalGenerationDraft(
        meta2?.prompt,
        modelInfo?.id ?? meta2?.model_id,
        meta2?.params,
        referenceImagePaths,
      ),
    [
      meta2?.prompt,
      modelInfo?.id,
      meta2?.model_id,
      meta2?.params,
      referenceImagePaths,
    ],
  );
  const i2vRestoreOriginalDraft =
    !isUserEmpty &&
    draftOverridesOriginalGeneration(i2vDraft, i2vOriginalGenerationDraft)
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
      : isInteractiveSelect &&
        !isGenerating &&
        !isUserEmpty &&
        !watermark?.open;
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
            props.expanded
              ? I2V_POPOVER_HEIGHT_EXPANDED
              : I2V_POPOVER_HEIGHT_COMPACT,
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
          hailuo03SuperResolutionDurationSec={resolveHailuo03SuperResolutionDuration(
            meta2,
          )}
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
        hasPromoteToAsset={contentToolbarItems.some(
          (it2) => it2.id === "promote-to-asset",
        )}
        onApply={(detail) =>
          trackActionEnd("customize-toolbar", "apply", detail)
        }
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
          defaultPrompt={
            i2vDraft?.prompt ?? meta2?.prompt ?? generating?.prompt
          }
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
            anchor.kind === "node"
              ? (draft) => savePopoverDraft(nodeId, "i2v", draft)
              : void 0
          }
          originalGenerationDraft={
            anchor.kind === "node" ? i2vRestoreOriginalDraft : void 0
          }
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
          defaultResolution={
            currentEnhanceResolution ?? defaultEnhanceResolution
          }
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
      {surfaceVisible &&
        showEraseSubEditor &&
        anchor.kind === "node" &&
        playbackUrl && (
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
