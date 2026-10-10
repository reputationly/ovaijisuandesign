// image-node-inner.jsx
import { BACKEND_VIBE_STORYBOARD, reactExports, useReactFlow, useTranslation, useUpdateNodeInternals } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MEDIA_OVERLAY_EXIT_ANIMATION_MS,
  SEEDREAM_LAYER_DECOMPOSE_SMALL_PRICING_MODEL,
  STORYBOARD_RESIZE_MAX_EDGE,
  STORYBOARD_RESIZE_MIN_EDGE,
  WATERMARK_PANEL_WIDTH,
} from "./storyboard-resize-max-edge.js";
import { WatermarkPopover } from "./watermark-popover.jsx";
import { useStableZoomTier } from "../canvas/separator.jsx";
import {
  appendCanvasFileVersion,
  usePathFileVersion,
} from "../infra/use-plugin-metadata-store.js";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import { useNodeRename } from "../infra/use-node-rename.js";
import { useModelForAsset } from "../infra/create-recently-added-store.js";
import { computeNodeSize } from "../canvas/compute-group-bounds-from-children.js";
import {
  MEDIA_NODE_RADIUS,
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import {
  getNodeFlowRect,
  useCropState,
  useEmitDerivedFromBlob,
  useStartCropFromNode,
} from "../canvas/use-start-crop-from-node.js";
import { useCropViewportZoom } from "../canvas/use-crop-viewport-zoom.js";
import {
  useEraseState,
  useImageNodeView,
  useMoveObjectState,
  useOutpaintState,
  useRedrawState,
  useStartEraseFromNode,
  useStartOutpaintFromNode,
  useStartRedrawFromNode,
  useSubImages,
} from "./use-start-cloud-edit-from-node.js";
import { useMultiImageActions } from "./use-multi-image-actions.js";
import { ImagePlaceholderIcon } from "../canvas/file-missing-icon.jsx";
import {
  formatFileSize,
  getFileExtension,
} from "../canvas/fullscreen-icon.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import {
  isMissingAssetNodeData,
  MEDIA_FALLBACK_NODE_SIZE,
  MediaUnpreviewableFallback,
  MissingAssetCard,
} from "../generation/missing-asset-card.jsx";
import {
  getLightboxSlotKey,
  isCloneData,
  lightboxItemFromAssetMeta,
  lightboxItemsFromSlots,
  NODE_POPOVER_SAFE_GAP,
  resolveLightboxIndexForSlot,
  submitAfterOptionalDraftFlush,
  useWarnMissingAssetMeta,
} from "./use-warn-missing-asset-meta.jsx";
import { isEnhanceImageInputEligible } from "../generation/to-workspace-browser-url.js";
import { CanvasImage } from "./canvas-image.jsx";
import {
  PANORAMA_EMPTY_NODE_SIZE,
  PANORAMA_VIEWER_PLUGIN_ID,
} from "./resolve-panorama-generation-presentation.js";
import {
  canOpenAssetGenerationPopover,
  emptySizeFromRatio,
  MediaDownloadButton,
  mergeReferenceImageIds,
  resolveGifAnimationSrc,
  resolveReferenceImages,
  resolveReferenceVideos,
  useEmptyAspectRatio,
  useLutBundle,
} from "./base-backend.jsx";
import {
  NodeShell,
  PlaceholderUploadButton,
  useAddToChat,
} from "../canvas/node-shell-inner.jsx";
import { useMediaFallbackSize } from "../canvas/reconcile-media-fallback-style.js";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import {
  IMAGE_CARD_MAX_WIDTH,
  reconcileNodeSize,
} from "../canvas/is-reexecutable-generation-node.js";
import { useReferenceNavigationSnapshot } from "./get-reference-navigation-defaults.jsx";
import {
  useUpstreamSameTypeMeta,
  useUpstreamTextContent,
} from "../assets/parse-prompt-to-tiptap.js";
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
import { useImageEditCost } from "./image-edit-pricing.js";
import {
  buildThumbnailSrcSet,
  buildThumbnailUrl,
} from "./build-video-thumb-base.jsx";
import { I2VPopover, shouldShowImageBottomPopover } from "./free-path-shape.js";
import { ImageNodeToolbarSection } from "./image-node-toolbar-section.jsx";
import { CustomizeToolbarDialog } from "./customize-toolbar-dialog-2.jsx";
import { EnhanceImagePopover } from "./enhance-image-popover.jsx";
import { I2IPopover } from "../generation/model-param-select.jsx";
import { ImageLightbox } from "./image-lightbox.jsx";
import { ColorAdjustDialog } from "./color-adjust-dialog.jsx";
import {
  DEFAULT_WATERMARK_SETTINGS,
  ImageSplitOverlay,
  ImageWatermarkPreview,
  LayerDecomposePrompt,
} from "./layer-decompose-prompt.jsx";
import { ImageInplaceEditor } from "./image-inplace-editor.jsx";
import { ImageRotateEditToolbar } from "./angle-scrubber.jsx";
import { MultiAnglePopover } from "./multi-angle-editor.jsx";
import { MultiImageChrome } from "./multi-image-chrome.jsx";
import { MultiImageOverlay } from "./ready-sub-image-card.jsx";
import {
  resolveImageNodeDisplayName,
  resolveStoryboardGridSelection,
  ROUND_DOTS_POPOVER_GAP_OFFSET,
  RoundDots,
} from "./round-dots-inner.jsx";
import { RelightPopover } from "./relight-popover.jsx";
import {
  StoryboardGridPopover,
  useDirectImageActions,
  useImageColorAdjust,
  useImageInplaceEdit,
  useImageLightbox,
} from "./use-image-inplace-edit.jsx";
import { useImageRotateEdit } from "./use-image-rotate-edit.js";
import { ImageRotatePreview } from "./image-rotate-preview-inner.jsx";
import { ImageSplitEditToolbar } from "./image-split-edit-toolbar-inner.jsx";
import { useImageSplitMode } from "./use-image-split-mode.js";
export function ImageNodeInner({
  id: id2,
  data: data2,
  selected: selected2,
  width,
  height,
}) {
  const trackedActionStartRef = reactExports.useRef(new Map());
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const nodeData = data2;
  const view2 = useImageNodeView(id2, data2);
  const subImages = useSubImages(id2);
  const meta2 = useAssetMeta(
    view2.primary?.id ?? (view2.isUserEmpty ? "" : id2),
  );
  const isStoryboardProduct =
    nodeData.backend === BACKEND_VIBE_STORYBOARD ||
    meta2?.backend === BACKEND_VIBE_STORYBOARD;
  const storyboardSplitGrid = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    const { rows, cols } = resolveStoryboardGridSelection(meta2?.params);
    return {
      rows,
      cols,
    };
  }, [isStoryboardProduct, meta2?.params]);
  const persistedReferenceImageIds = reactExports.useMemo(
    () =>
      mergeReferenceImageIds(
        nodeData.referenceImageIds,
        meta2?.referenceImageIds,
      ),
    [nodeData.referenceImageIds, meta2?.referenceImageIds],
  );
  const primaryPrompt = view2.primary?.prompt ?? meta2?.prompt;
  const {
    onAddToChat,
    submitImg2Video,
    fetchVideoModels,
    submitImg2Image,
    fetchImageModels,
    cropImage,
    batchCropAndUpscale,
    cropSplit,
    submitOutpaint,
    submitErase,
    submitRedraw,
    submitSuperResolution,
    submitRemoveBg,
    submitLayerDecompose,
    resolveFileUrl,
    onPlaceholderUpload,
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    onLutImport,
    onPromoteToAsset,
    getLastUsedModelParams,
    onSaveAs,
    onNodeAction,
    pricingConfig,
    onInstantiatePlugin,
  } = useCanvasBridge();
  const reactFlow = useReactFlow();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const onRename = useNodeRename(id2, isCloneData(data2));
  const { croppingNodeId } = useCropState();
  const { outpaintingNodeId } = useOutpaintState();
  const { erasingNodeId } = useEraseState();
  const { redrawingNodeId } = useRedrawState();
  const { movingObjectNodeId } = useMoveObjectState();
  const nodeWidth = width || IMAGE_CARD_MAX_WIDTH;
  const nodeHeight = height;
  const imageData = data2;
  const displaySize =
    imageData?.displaySize &&
    imageData.displaySize.width > 0 &&
    imageData.displaySize.height > 0
      ? imageData.displaySize
      : void 0;
  const displayImageOnly = imageData?.displayImageOnly === true;
  const { snapshot: referenceReturnI2V } = useReferenceNavigationSnapshot(
    id2,
    "i2v",
  );
  const { snapshot: referenceReturnI2I } = useReferenceNavigationSnapshot(
    id2,
    "i2i",
  );
  const [showI2VPopover, setShowI2VPopover] =
    reactExports.useState(!!referenceReturnI2V);
  const [showI2IPopover, setShowI2IPopover] =
    reactExports.useState(!!referenceReturnI2I);
  const [showEnhancePopover, setShowEnhancePopover] =
    reactExports.useState(false);
  const [showMultiAnglePopover, setShowMultiAnglePopover] =
    reactExports.useState(false);
  const [showStoryboardGridPopover, setShowStoryboardGridPopover] =
    reactExports.useState(false);
  const [showRelightPopover, setShowRelightPopover] =
    reactExports.useState(false);
  const [showWatermarkPopover, setShowWatermarkPopover] =
    reactExports.useState(false);
  const [watermarkSettings, setWatermarkSettings] = reactExports.useState(
    () => ({
      ...DEFAULT_WATERMARK_SETTINGS,
      text: t2("canvas.watermark.defaultText", "@ 水印文案"),
    }),
  );
  const [watermarkFocusTarget, setWatermarkFocusTarget] =
    reactExports.useState(null);
  useCropViewportZoom(
    watermarkFocusTarget,
    0,
    WATERMARK_PANEL_WIDTH + NODE_POPOVER_SAFE_GAP,
    0,
    1.25,
  );
  const [showCustomizeToolbar, setShowCustomizeToolbar] =
    reactExports.useState(false);
  const [showLayerDecomposePrompt, setShowLayerDecomposePrompt] =
    reactExports.useState(false);
  const [layerDecomposePrompt, setLayerDecomposePrompt] =
    reactExports.useState("");
  const [layerDecomposeSubmitting, setLayerDecomposeSubmitting] =
    reactExports.useState(false);
  const layerDecomposeCost = reactExports.useMemo(
    () =>
      pricingConfig?.image.find(
        (pricing) =>
          pricing.modelID === SEEDREAM_LAYER_DECOMPOSE_SMALL_PRICING_MODEL,
      )?.defaultCost,
    [pricingConfig],
  );
  const handleCustomizeToolbar = reactExports.useCallback(() => {
    setShowCustomizeToolbar(true);
  }, []);
  const handleMultiAngle = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowRelightPopover(false);
    setShowStoryboardGridPopover(false);
    setShowWatermarkPopover(false);
    setShowMultiAnglePopover(true);
  }, []);
  const handleWatermark = reactExports.useCallback(() => {
    if (!cropImage || (!view2.primary?.url && !meta2?.url)) return;
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowStoryboardGridPopover(false);
    setShowRelightPopover(false);
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
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
  }, [
    cropImage,
    id2,
    meta2?.url,
    nodeHeight,
    nodeWidth,
    reactFlow,
    t2,
    view2.primary?.url,
  ]);
  const handleStoryboardGrid = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowRelightPopover(false);
    setShowWatermarkPopover(false);
    setShowStoryboardGridPopover(true);
  }, []);
  const handleRelight = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowStoryboardGridPopover(false);
    setShowWatermarkPopover(false);
    setShowRelightPopover(true);
  }, []);
  const [imgErrorReason, setImgErrorReason] = reactExports.useState(null);
  const imgError = imgErrorReason !== null;
  const [naturalSize, setNaturalSize] = reactExports.useState(null);
  const handleNaturalSize = reactExports.useCallback((w3, h2) => {
    setNaturalSize((prev) =>
      prev && prev.width === w3 && prev.height === h2
        ? prev
        : {
            width: w3,
            height: h2,
          },
    );
  }, []);
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
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  const modelInfo = useModelForAsset(meta2?.backend, meta2?.model_id, "image");
  const {
    mergeNodeDataSilent,
    savePopoverDraft,
    getIncomingSourceIds,
    subscribeGraphChange,
    getNodeById,
    focusDerivedNode,
    resizeNode,
    moveAndResizeNode,
    moveAndResizeImageGroupMembers,
    flushPersist,
  } = useCanvasActions();
  const handlePanoramaReference = reactExports.useCallback(async () => {
    if (!onInstantiatePlugin || !view2.primary?.url) return;
    const panoramaNodeId = await onInstantiatePlugin({
      pluginId: PANORAMA_VIEWER_PLUGIN_ID,
      sourceNodeIds: [id2],
      initialData: {
        panoramaGenerationPending: true,
      },
    });
    if (!panoramaNodeId) return;
    let finished = false;
    let unsubscribe = () => {};
    let timeout2 = 0;
    const openGeneratorWhenReady = () => {
      if (
        finished ||
        !getNodeById(panoramaNodeId) ||
        !getIncomingSourceIds(panoramaNodeId).includes(id2)
      )
        return false;
      finished = true;
      unsubscribe();
      window.clearTimeout(timeout2);
      resizeNode(
        panoramaNodeId,
        PANORAMA_EMPTY_NODE_SIZE.width,
        PANORAMA_EMPTY_NODE_SIZE.height,
      );
      focusDerivedNode(panoramaNodeId);
      return true;
    };
    unsubscribe = subscribeGraphChange(openGeneratorWhenReady);
    if (!openGeneratorWhenReady()) {
      timeout2 = window.setTimeout(() => {
        finished = true;
        unsubscribe();
      }, 5e3);
    }
  }, [
    focusDerivedNode,
    getNodeById,
    getIncomingSourceIds,
    id2,
    onInstantiatePlugin,
    resizeNode,
    subscribeGraphChange,
    view2.primary?.url,
  ]);
  const handleImageResizeCommit = reactExports.useCallback(
    (nodeId, x2, y4, nextWidth, nextHeight) => {
      const persistedNode = getNodeById(nodeId);
      const nextData = {
        ...(persistedNode?.data ?? {}),
        displaySize: {
          width: nextWidth,
          height: nextHeight,
        },
      };
      if (isStoryboardProduct && persistedNode?.groupId) {
        moveAndResizeImageGroupMembers(
          nodeId,
          x2,
          y4,
          nextWidth,
          nextHeight,
          nextData,
        );
        return;
      }
      moveAndResizeNode(nodeId, x2, y4, nextWidth, nextHeight, {
        ...nextData,
      });
    },
    [
      getNodeById,
      isStoryboardProduct,
      moveAndResizeImageGroupMembers,
      moveAndResizeNode,
    ],
  );
  const i2iDraft = resolveActivePopoverDraft(data2, "i2i");
  const i2vDraft = resolveActivePopoverDraft(data2, "i2v");
  const i2iDraftPrompt =
    typeof i2iDraft?.prompt === "string" && i2iDraft.prompt.trim().length > 0
      ? i2iDraft.prompt
      : void 0;
  const i2iDraftPromptJson = i2iDraftPrompt ? i2iDraft?.promptJson : void 0;
  const i2vDraftPrompt =
    typeof i2vDraft?.prompt === "string" && i2vDraft.prompt.trim().length > 0
      ? i2vDraft.prompt
      : void 0;
  const i2vDraftPromptJson = i2vDraftPrompt ? i2vDraft?.promptJson : void 0;
  const upstreamImageMeta = useUpstreamSameTypeMeta(id2, "image");
  const lastUsedI2I = getLastUsedModelParams?.("i2i");
  const lastUsedI2V = getLastUsedModelParams?.("i2v");
  const zoomTier = useStableZoomTier();
  const isOutpaintingThis = outpaintingNodeId === id2;
  const fileVersion = usePathFileVersion(meta2?.path);
  const primaryUrl = view2.primary?.url ?? meta2?.url;
  const decodeSrc =
    primaryUrl !== void 0 && fileVersion > 0
      ? appendCanvasFileVersion(primaryUrl, fileVersion)
      : primaryUrl;
  reactExports.useEffect(() => {
    setImgErrorReason(null);
    setNaturalSize(null);
  }, [decodeSrc]);
  const isUnfilled =
    view2.isUserEmpty && view2.status === "empty" && view2.slots.length === 0;
  const isUserEmpty = isUnfilled;
  const i2iDefaultModelId = isUserEmpty
    ? (i2iDraft?.modelId ?? upstreamImageMeta?.modelId)
    : (i2iDraft?.modelId ?? modelInfo?.id ?? meta2?.model_id ?? meta2?.model);
  const i2iDefaultParams = isUserEmpty
    ? (i2iDraft?.params ?? upstreamImageMeta?.params)
    : (i2iDraft?.params ?? meta2?.params);
  const i2vDefaultModelId = isUserEmpty
    ? i2vDraft?.modelId
    : (i2vDraft?.modelId ?? modelInfo?.id);
  const i2vDefaultParams = isUserEmpty
    ? i2vDraft?.params
    : (i2vDraft?.params ?? meta2?.params);
  const i2iLastUsedModelId = isUserEmpty ? lastUsedI2I?.modelId : void 0;
  const i2iLastUsedParams = isUserEmpty ? lastUsedI2I?.params : void 0;
  const i2vLastUsedModelId = isUserEmpty ? lastUsedI2V?.modelId : void 0;
  const i2vLastUsedParams = isUserEmpty ? lastUsedI2V?.params : void 0;
  const i2iOriginalGenerationDraft = reactExports.useMemo(
    () =>
      buildOriginalGenerationDraft(
        primaryPrompt,
        modelInfo?.id ?? meta2?.model_id ?? meta2?.model,
        meta2?.params,
        referenceImagePaths,
      ),
    [
      primaryPrompt,
      modelInfo?.id,
      meta2?.model_id,
      meta2?.model,
      meta2?.params,
      referenceImagePaths,
    ],
  );
  const i2iRestoreOriginalDraft =
    !isUserEmpty &&
    draftOverridesOriginalGeneration(i2iDraft, i2iOriginalGenerationDraft)
      ? i2iOriginalGenerationDraft
      : void 0;
  const { emptyAspectRatio, setEmptyAspectRatio } = useEmptyAspectRatio({
    id: id2,
    data: data2,
    isEmptyForWrite: isUnfilled || !meta2,
    draftKeys: ["i2i", "i2v"],
  });
  const isEmptyForSync = (isUnfilled || !meta2) && !view2.primary;
  const targetEmptySize =
    isEmptyForSync && emptyAspectRatio
      ? emptySizeFromRatio(emptyAspectRatio)
      : void 0;
  const targetEmptyWidth = targetEmptySize?.width;
  const targetEmptyHeight = targetEmptySize?.height;
  const lastSyncActionRef = reactExports.useRef("none");
  reactExports.useEffect(() => {
    const prev = lastSyncActionRef.current;
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
  }, [isEmptyForSync, targetEmptyWidth, targetEmptyHeight, id2, reactFlow]);
  const persistedPathValue = data2.path;
  const persistedPath =
    typeof persistedPathValue === "string" && persistedPathValue.trim()
      ? persistedPathValue
      : void 0;
  const handleAddToChat = useAddToChat(id2, meta2, onAddToChat, persistedPath);
  const handlePromoteToAsset = reactExports.useMemo(() => {
    if (!onPromoteToAsset) return void 0;
    return (e2) => {
      onPromoteToAsset([id2], {
        x: e2.clientX,
        y: e2.clientY,
      });
    };
  }, [id2, onPromoteToAsset]);
  const { handleCrop } = useStartCropFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
  });
  const { handleOutpaint } = useStartOutpaintFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitOutpaint,
  });
  const { handleErase } = useStartEraseFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitErase,
  });
  const { handleRedraw } = useStartRedrawFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitRedraw,
  });
  const { handleRemoveBg } = useDirectImageActions({
    id: id2,
    meta: meta2,
    submitSuperResolution,
    submitRemoveBg,
  });
  const handleLayerDecompose = reactExports.useCallback(() => {
    if (!submitLayerDecompose || !meta2?.path || layerDecomposeSubmitting)
      return;
    setLayerDecomposePrompt("");
    setShowLayerDecomposePrompt(true);
  }, [layerDecomposeSubmitting, meta2?.path, submitLayerDecompose]);
  const dismissLayerDecomposePrompt = usePopoverCloseWithDeselect(
    id2,
    setShowLayerDecomposePrompt,
  );
  const closeLayerDecomposePrompt = reactExports.useCallback(() => {
    if (layerDecomposeSubmitting) return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "layer-decompose",
        phase: "abandon",
        interaction: "opens_dialog",
        durationMs: Date.now() - enteredAt,
      });
    }
    dismissLayerDecomposePrompt();
    setLayerDecomposePrompt("");
  }, [
    dismissLayerDecomposePrompt,
    id2,
    layerDecomposeSubmitting,
    onNodeAction,
  ]);
  const submitLayerDecomposePrompt = reactExports.useCallback(async () => {
    if (!submitLayerDecompose || !meta2?.path || layerDecomposeSubmitting)
      return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    onNodeAction?.({
      nodeId: id2,
      nodeType: "image",
      action: "layer-decompose",
      phase: "apply",
      interaction: "opens_dialog",
      durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
    });
    setLayerDecomposeSubmitting(true);
    dismissLayerDecomposePrompt();
    setLayerDecomposePrompt("");
    try {
      await submitLayerDecompose(id2, meta2.path, layerDecomposePrompt);
    } finally {
      setLayerDecomposeSubmitting(false);
    }
  }, [
    id2,
    dismissLayerDecomposePrompt,
    layerDecomposePrompt,
    layerDecomposeSubmitting,
    meta2?.path,
    onNodeAction,
    submitLayerDecompose,
  ]);
  reactExports.useEffect(() => {
    if (!selected2 && showLayerDecomposePrompt) {
      closeLayerDecomposePrompt();
    }
  }, [closeLayerDecomposePrompt, selected2, showLayerDecomposePrompt]);
  const handleSuperResolution = reactExports.useCallback(() => {
    if (!submitSuperResolution || !meta2?.path) return;
    const w3 = view2.primary?.width ?? meta2?.width ?? naturalSize?.width;
    const h2 = view2.primary?.height ?? meta2?.height ?? naturalSize?.height;
    if (!isEnhanceImageInputEligible(w3, h2)) {
      dedupedToast.error(
        t2(
          "canvas.enhanceImage.inputOutOfRange",
          "图片尺寸超出可处理范围（长边需 ≤ 3072px 且长短边比例 ≤ 8）",
        ),
        {
          id: "canvas-enhance-image-input",
        },
      );
      return;
    }
    setShowEnhancePopover(true);
  }, [
    submitSuperResolution,
    meta2?.path,
    meta2?.width,
    meta2?.height,
    view2.primary,
    naturalSize,
    t2,
  ]);
  const allImageSlots = reactExports.useMemo(
    () => view2.rounds.flat(),
    [view2.rounds],
  );
  const lightboxItems = reactExports.useMemo(() => {
    if (allImageSlots.length === 0) {
      const item = lightboxItemFromAssetMeta("image", meta2);
      return item ? [item] : [];
    }
    const metadata = assetMetadataStore.getState();
    return lightboxItemsFromSlots("image", allImageSlots, {
      getMetaById: (assetId) => metadata.get(assetId),
      nodes: subImages,
      primarySlotId: view2.primary?.id,
      primaryMeta: meta2,
    });
  }, [allImageSlots, view2.primary?.id, meta2, assetMetadataStore, subImages]);
  const lightboxInitialIndex = reactExports.useMemo(() => {
    if (lightboxItems.length === 0) return 0;
    return resolveLightboxIndexForSlot(lightboxItems, view2.primary, 0);
  }, [lightboxItems, view2.primary]);
  const lightbox = useImageLightbox({
    items: lightboxItems,
    initialIndex: lightboxInitialIndex,
  });
  const currentLightboxItem =
    lightbox.lightboxProps?.items[lightbox.lightboxProps.index];
  const currentLightboxSlot = reactExports.useMemo(
    () =>
      currentLightboxItem?.slotKey
        ? allImageSlots.find(
            (slot) => getLightboxSlotKey(slot) === currentLightboxItem.slotKey,
          )
        : void 0,
    [allImageSlots, currentLightboxItem?.slotKey],
  );
  const handleOpenSubLightbox = reactExports.useCallback(
    (originalIndex) => {
      const targetSlot = view2.slots[originalIndex];
      const targetIndex = resolveLightboxIndexForSlot(
        lightboxItems,
        targetSlot,
        lightboxInitialIndex,
      );
      lightbox.openLightbox(targetIndex);
    },
    [view2.slots, lightboxItems, lightboxInitialIndex, lightbox.openLightbox],
  );
  const colorAdjustLutBundle = useLutBundle(
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    "image",
    onLutImport,
  );
  const colorAdjust = useImageColorAdjust({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
    lut: colorAdjustLutBundle,
  });
  const emitWatermarkedImage = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const inplaceEdit = useImageInplaceEdit({
    id: id2,
    meta: meta2,
    selected: selected2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
    onApply: (blob) => {
      const enteredAt = trackedActionStartRef.current.get("image-inplace-edit");
      trackedActionStartRef.current.delete("image-inplace-edit");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "image-inplace-edit",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: {
          output_bytes: blob.size,
        },
      });
    },
    onAbandon: (hadProgress) => {
      const enteredAt = trackedActionStartRef.current.get("image-inplace-edit");
      if (enteredAt == null) return;
      trackedActionStartRef.current.delete("image-inplace-edit");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "image-inplace-edit",
        phase: "abandon",
        interaction: "opens_mode",
        durationMs: Date.now() - enteredAt,
        hadProgress,
      });
    },
  });
  const imageEditing = inplaceEdit.editing;
  const primaryWidth =
    view2.primary?.width ?? meta2?.width ?? naturalSize?.width;
  const primaryHeight =
    view2.primary?.height ?? meta2?.height ?? naturalSize?.height;
  const bodyHeight = reactExports.useMemo(() => {
    if ((displayImageOnly || isStoryboardProduct) && nodeHeight)
      return nodeHeight;
    if (displaySize) return Math.round(displaySize.height);
    const w3 = primaryWidth;
    const h2 = primaryHeight;
    if (w3 && h2) return Math.round(nodeWidth * (h2 / w3));
    return nodeHeight;
  }, [
    primaryWidth,
    primaryHeight,
    nodeWidth,
    nodeHeight,
    displaySize,
    displayImageOnly,
    isStoryboardProduct,
  ]);
  const sourceBodyHeight = bodyHeight ?? nodeWidth;
  const lastMetaSyncRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (isEmptyForSync) return;
    const dataDisplaySize = displaySize
      ? {
          width: Math.round(displaySize.width),
          height: Math.round(displaySize.height),
        }
      : void 0;
    if (!dataDisplaySize && (!primaryWidth || !primaryHeight)) return;
    const synced =
      dataDisplaySize ?? computeNodeSize(primaryWidth, primaryHeight);
    if (!synced) return;
    const targetW = synced.width;
    const targetH = synced.height;
    const prev = lastMetaSyncRef.current;
    if (prev && prev.w === targetW && prev.h === targetH) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((n2) => {
        if (n2.id !== id2) return n2;
        if (n2.width === targetW && n2.height === targetH) return n2;
        return {
          ...n2,
          width: targetW,
          height: targetH,
        };
      }),
    );
    lastMetaSyncRef.current = {
      w: targetW,
      h: targetH,
    };
    const fromNaturalOnly =
      !dataDisplaySize &&
      !view2.primary?.width &&
      !view2.primary?.height &&
      !meta2?.width &&
      !meta2?.height;
    if (fromNaturalOnly) {
      const target = reconcileNodeSize(
        "image",
        getNodeById(id2)?.size,
        primaryWidth,
        primaryHeight,
      );
      if (target) resizeNode(id2, target.width, target.height);
    }
  }, [
    isEmptyForSync,
    primaryWidth,
    primaryHeight,
    id2,
    reactFlow,
    view2.primary?.width,
    view2.primary?.height,
    meta2?.width,
    meta2?.height,
    displaySize,
    getNodeById,
    resizeNode,
  ]);
  const rotate2 = useImageRotateEdit({
    nodeId: id2,
    selected: !!selected2,
    meta: meta2,
    nodeWidth,
    sourceBodyHeight,
    cropImage,
    reactFlow,
    onSaved: () => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "rotate",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: {
          rotation_angle: rotate2.state.angle,
          flip_horizontal: rotate2.state.flipH,
          flip_vertical: rotate2.state.flipV,
        },
      });
    },
    onAbandon: (hadProgress) => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      if (enteredAt == null) return;
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "rotate",
        phase: "abandon",
        interaction: "opens_mode",
        durationMs: Date.now() - enteredAt,
        hadProgress,
      });
    },
  });
  const splitMode = useImageSplitMode({
    id: id2,
    selected: !!selected2,
    meta: meta2,
    batchCropAndUpscale,
    cropSplit,
    url: view2.primary?.url,
    onApply: (detail) => {
      const enteredAt = trackedActionStartRef.current.get("split-grid");
      trackedActionStartRef.current.delete("split-grid");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "split-grid",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: detail,
      });
    },
  });
  const splitPerCellCost = useImageEditCost("super-resolution");
  const updateNodeInternals2 = useUpdateNodeInternals();
  const lastRotateAabbRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const key2 = `${rotate2.displayWidth}x${rotate2.displayHeight}`;
    if (lastRotateAabbRef.current === key2) return;
    const isMount = lastRotateAabbRef.current === null;
    lastRotateAabbRef.current = key2;
    if (isMount) return;
    updateNodeInternals2(id2);
  }, [id2, updateNodeInternals2, rotate2.displayWidth, rotate2.displayHeight]);
  const handleI2VClose = usePopoverCloseWithDeselect(id2, setShowI2VPopover);
  const handleI2IClose = usePopoverCloseWithDeselect(id2, setShowI2IPopover);
  const closeEnhancePopover = usePopoverCloseWithDeselect(
    id2,
    setShowEnhancePopover,
  );
  const closeMultiAnglePopover = usePopoverCloseWithDeselect(
    id2,
    setShowMultiAnglePopover,
  );
  const closeStoryboardGridPopover = usePopoverCloseWithDeselect(
    id2,
    setShowStoryboardGridPopover,
  );
  const closeRelightPopover = usePopoverCloseWithDeselect(
    id2,
    setShowRelightPopover,
  );
  const closeWatermarkPopover = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("watermark");
    trackedActionStartRef.current.delete("watermark");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "watermark",
        phase: "abandon",
        interaction: "opens_panel",
        durationMs: Date.now() - enteredAt,
      });
    }
    setShowWatermarkPopover(false);
    setWatermarkFocusTarget(null);
  }, [id2, onNodeAction]);
  const handleEnhanceClose = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("super-resolution");
    trackedActionStartRef.current.delete("super-resolution");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "super-resolution",
        phase: "abandon",
        interaction: "opens_dialog",
        durationMs: Date.now() - enteredAt,
      });
    }
    closeEnhancePopover();
  }, [closeEnhancePopover, id2, onNodeAction]);
  const handleEnhanceSubmit = reactExports.useCallback(
    (params) => {
      const enteredAt = trackedActionStartRef.current.get("super-resolution");
      trackedActionStartRef.current.delete("super-resolution");
      if (enteredAt != null) {
        onNodeAction?.({
          nodeId: id2,
          nodeType: "image",
          action: "super-resolution",
          phase: "apply",
          interaction: "opens_dialog",
          durationMs: Date.now() - enteredAt,
          toolSpecific: {
            resolution: params.resolution,
          },
        });
      }
      if (submitSuperResolution && meta2?.path) {
        void submitSuperResolution(id2, meta2.path, {
          resolution: params.resolution,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
        });
      }
      closeEnhancePopover();
    },
    [
      submitSuperResolution,
      meta2?.path,
      id2,
      closeEnhancePopover,
      onNodeAction,
    ],
  );
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
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && !replaceNodeId && view2.status === "empty") {
        mergeNodeDataSilent(id2, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Video?.(
          id2,
          prompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt,
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
        onFlushError: () => {
          dedupedToast.error(t2("canvas.promptDraftSaveFailed"));
        },
      });
    },
    [id2, submitImg2Video, view2.status, mergeNodeDataSilent, flushPersist, t2],
  );
  const handleI2ISubmit = reactExports.useCallback(
    (
      prompt,
      modelId,
      params,
      imagePaths,
      replaceNodeId,
      count2,
      displayPrompt,
      textPaths,
    ) => {
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && view2.status === "empty") {
        mergeNodeDataSilent(id2, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Image?.(
          id2,
          prompt,
          modelId,
          params,
          imagePaths,
          replaceNodeId,
          count2,
          displayPrompt,
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
    [id2, submitImg2Image, view2.status, mergeNodeDataSilent, flushPersist, t2],
  );
  const {
    isOverlayOpen,
    handleToggleOverlay,
    handleSetPrimary,
    handleSetPrimarySlot,
    handleSelectRound: selectRound,
    handleDeleteSub,
    handleSplitSub,
    handleSplitSlot,
    handleSplitAll,
    handleSplitMain,
    handleSubContextMenu,
    handleDownloadSub,
  } = useMultiImageActions({
    id: id2,
    view: view2,
    subImages,
    reactFlow,
    nodeWidth,
    nodeHeight,
  });
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view2.activeRoundIndex) return;
      setShowI2VPopover(false);
      setShowI2IPopover(false);
      setShowEnhancePopover(false);
      setShowMultiAnglePopover(false);
      setShowStoryboardGridPopover(false);
      setShowRelightPopover(false);
      setShowWatermarkPopover(false);
      selectRound(roundIdx);
    },
    [selectRound, view2.activeRoundIndex],
  );
  const canSetLightboxPrimary =
    allImageSlots.length > 1 &&
    !!currentLightboxSlot &&
    currentLightboxSlot.id !== view2.primary?.id;
  const canSplitLightboxImage =
    allImageSlots.length > 1 && !!currentLightboxSlot;
  const handleSetLightboxPrimary = reactExports.useCallback(() => {
    if (!currentLightboxSlot) return;
    handleSetPrimarySlot(currentLightboxSlot);
  }, [currentLightboxSlot, handleSetPrimarySlot]);
  const handleSplitLightboxImage = reactExports.useCallback(() => {
    if (!currentLightboxSlot) return;
    handleSplitSlot(currentLightboxSlot);
  }, [currentLightboxSlot, handleSplitSlot]);
  const canOpenPopover =
    nodeData.forceShowPromptPopover === true ||
    canOpenAssetGenerationPopover({
      isUserEmpty,
      model: meta2?.model ?? nodeData.model,
      modelId: meta2?.model_id ?? nodeData.model_id,
      backend: meta2?.backend ?? nodeData.backend,
      sourceTool: meta2?.source_tool ?? nodeData.source_tool,
    });
  const handleDownloadMain = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!onSaveAs || !meta2?.path) return;
      onSaveAs(meta2.path, meta2.name);
    },
    [onSaveAs, meta2?.path, meta2?.name],
  );
  const selfAssetIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const slot of view2.slots) {
      if (slot.status === "ready" && slot.id) ids2.add(slot.id);
    }
    if (meta2 && id2) ids2.add(id2);
    return ids2;
  }, [view2.slots, meta2, id2]);
  const showOverlay = isOverlayOpen;
  const expandedMediaOverlay =
    view2.isMulti &&
    showOverlay &&
    !imageEditing &&
    !rotate2.editing &&
    !splitMode.editing;
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
  const isExpandedMediaOverlayVisible =
    expandedMediaOverlay || keepExpandedMediaOverlayMounted;
  const isExpandedMediaOverlayClosing =
    keepExpandedMediaOverlayMounted && !expandedMediaOverlay;
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (!canOpenPopover) return;
    if (isMultiSelect || isBoxSelecting) return;
    if (isExpandedMediaOverlayVisible) return;
    if (
      showI2IPopover ||
      showI2VPopover ||
      showEnhancePopover ||
      showMultiAnglePopover ||
      showStoryboardGridPopover ||
      showRelightPopover
    )
      return;
    const sources = getIncomingSourceIds(id2);
    setReferenceImagePaths(
      resolveReferenceImages(
        sources,
        persistedReferenceImageIds,
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
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(data2.referenceTextIds)
          ? data2.referenceTextIds
          : meta2?.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    refreshUpstreamText(sources);
    if (isStoryboardProduct) {
      setShowStoryboardGridPopover(true);
    } else {
      setShowI2IPopover(true);
    }
  }, [
    selected2,
    canOpenPopover,
    isMultiSelect,
    isBoxSelecting,
    showI2IPopover,
    showI2VPopover,
    showEnhancePopover,
    showMultiAnglePopover,
    showStoryboardGridPopover,
    showRelightPopover,
    isExpandedMediaOverlayVisible,
    id2,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const buildIncomingReferenceKey = reactExports.useCallback(() => {
    const sources = [...getIncomingSourceIds(id2)].sort();
    const imagePaths = resolveReferenceImages(
      sources,
      persistedReferenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
    return JSON.stringify({
      sources,
      imagePaths,
    });
  }, [
    id2,
    persistedReferenceImageIds,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  const [incomingSourceKey, setIncomingSourceKey] = reactExports.useState(
    buildIncomingReferenceKey,
  );
  reactExports.useEffect(() => {
    const currentKey = buildIncomingReferenceKey();
    setIncomingSourceKey((previousKey) =>
      previousKey === currentKey ? previousKey : currentKey,
    );
    const unsubscribe = subscribeGraphChange(() => {
      const key2 = buildIncomingReferenceKey();
      setIncomingSourceKey((prev) => (prev === key2 ? prev : key2));
    });
    return unsubscribe;
  }, [buildIncomingReferenceKey, subscribeGraphChange]);
  const storyboardReferencePaths = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    return resolveReferenceImages(
      getIncomingSourceIds(id2),
      persistedReferenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
  }, [
    incomingSourceKey,
    isStoryboardProduct,
    id2,
    persistedReferenceImageIds,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  reactExports.useEffect(() => {
    if (!showI2IPopover && !showI2VPopover) return;
    const sources = getIncomingSourceIds(id2);
    setReferenceImagePaths(
      resolveReferenceImages(
        sources,
        isStoryboardProduct ? persistedReferenceImageIds : void 0,
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
    showI2IPopover,
    showI2VPopover,
    id2,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const liveReferenceTextPaths = reactExports.useMemo(() => {
    return resolveReferenceTexts(
      getIncomingSourceIds(id2),
      void 0,
      assetMetadataStore,
      getNodeById,
    );
  }, [
    incomingSourceKey,
    id2,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  const defaultI2ITextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    i2iDraft?.textPaths,
  );
  const defaultI2VTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    i2vDraft?.textPaths,
  );
  const dimensions2 = reactExports.useMemo(() => {
    const w3 = meta2?.width;
    const h2 = meta2?.height;
    if (w3 && h2) return `${w3} x ${h2}`;
    return void 0;
  }, [meta2?.width, meta2?.height]);
  const hasDimensions = !!(meta2?.width && meta2?.height);
  const thumbnailUrl = reactExports.useMemo(
    () => (meta2?.url ? buildThumbnailUrl(meta2.url, nodeWidth) : void 0),
    [meta2?.url, nodeWidth],
  );
  const thumbnailSrcSet = reactExports.useMemo(
    () => (meta2?.url ? buildThumbnailSrcSet(meta2.url, nodeWidth) : void 0),
    [meta2?.url, nodeWidth],
  );
  const thumbnailSizes = `${Math.round(nodeWidth * zoomTier)}px`;
  const deferredSelected = reactExports.useDeferredValue(selected2);
  useWarnMissingAssetMeta({
    nodeId: id2,
    nodeType: "image",
    data: data2,
    meta: meta2,
    isUserEmpty,
  });
  const isEmpty2 = view2.status === "empty" && !view2.primary;
  useMediaFallbackSize(
    id2,
    imgError &&
      !isEmpty2 &&
      !!(meta2 || view2.primary) &&
      !isMissingAssetNodeData(data2),
  );
  if (isMissingAssetNodeData(data2)) {
    return (
      <MissingAssetCard
        nodeId={id2}
        name={typeof data2?.name === "string" ? data2.name : void 0}
      />
    );
  }
  if (!meta2 && !isUserEmpty && !view2.primary) return null;
  const isCropping = croppingNodeId !== null;
  const isOutpainting = outpaintingNodeId !== null;
  const isErasing = erasingNodeId !== null;
  const isRedrawing = redrawingNodeId !== null;
  const isMovingObject = movingObjectNodeId !== null;
  const isModalActive =
    isCropping || isOutpainting || isErasing || isRedrawing || isMovingObject;
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting;
  const showStandardToolbar =
    !displayImageOnly &&
    !isEmpty2 &&
    !!selected2 &&
    !!deferredSelected &&
    isInteractiveSelect &&
    !isExpandedMediaOverlayVisible &&
    !isModalActive &&
    !rotate2.editing &&
    !splitMode.editing &&
    !imageEditing &&
    !showEnhancePopover &&
    !showMultiAnglePopover &&
    (!showStoryboardGridPopover || isStoryboardProduct) &&
    !showRelightPopover &&
    !showWatermarkPopover;
  const showPopover = shouldShowImageBottomPopover({
    selected: !!selected2,
    deferredSelected: !!deferredSelected,
    isInteractiveSelect,
    isExpandedMediaOverlayVisible,
    isModalActive,
    rotateEditing: rotate2.editing,
    splitEditing: splitMode.editing,
    imageEditing,
    colorAdjustOpen: colorAdjust.open,
    showEnhancePopover,
    showMultiAnglePopover,
    showStoryboardGridPopover,
    showRelightPopover,
    showWatermarkPopover,
    showLayerDecomposePrompt,
  });
  const shellWidth = imgError
    ? MEDIA_FALLBACK_NODE_SIZE.width
    : rotate2.displayWidth;
  return (
    <NodeShell
      id={id2}
      tagIds={meta2?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.image-node"
      dataState={
        view2.isUserEmpty && view2.status === "empty"
          ? "empty"
          : view2.status === "ready" && view2.primary?.url
            ? "generated"
            : "empty"
      }
      dataAspectRatio={emptyAspectRatio}
      generating={false}
    >
      {!displayImageOnly &&
        !isOutpaintingThis &&
        !isExpandedMediaOverlayVisible && (
          <NodeHeader
            nodeType="image"
            tagIds={meta2?.tagIds}
            name={resolveImageNodeDisplayName(
              {
                dataName: data2?.name,
                primaryName: view2.primary?.name,
                metaName: meta2?.name,
              },
              t2("canvas.image"),
            )}
            selected={selected2}
            dimensions={dimensions2}
            maxWidth={shellWidth}
            onRename={onRename}
          />
        )}
      {showStandardToolbar && (
        <ImageNodeToolbarSection
          hasDimensions={hasDimensions}
          handleRedraw={handleRedraw}
          handleOutpaint={handleOutpaint}
          handleErase={handleErase}
          handleSuperResolution={handleSuperResolution}
          handleRemoveBg={handleRemoveBg}
          handleLayerDecompose={handleLayerDecompose}
          handleAddToChat={handleAddToChat}
          handleCrop={handleCrop}
          handleColorAdjust={colorAdjust.openDialog}
          handleImageEdit={inplaceEdit.enter}
          handleMultiAngle={handleMultiAngle}
          handlePanoramaReference={
            onInstantiatePlugin && view2.primary?.url
              ? handlePanoramaReference
              : void 0
          }
          handleWatermark={primaryUrl && cropImage ? handleWatermark : void 0}
          handleStoryboardGrid={
            isStoryboardProduct ? void 0 : handleStoryboardGrid
          }
          handleRelight={handleRelight}
          handleRotate={rotate2.enter}
          handleSplitEnter={splitMode.enter}
          pinSplitGrid={isStoryboardProduct}
          splitGrid={storyboardSplitGrid}
          handleFullscreen={lightbox.openLightbox}
          handlePromoteToAsset={handlePromoteToAsset}
          handleCustomizeToolbar={handleCustomizeToolbar}
          onToolClick={
            onNodeAction
              ? (info2) => {
                  if (
                    info2.interaction === "opens_mode" ||
                    info2.interaction === "opens_dialog" ||
                    info2.action === "watermark"
                  ) {
                    trackedActionStartRef.current.set(info2.action, Date.now());
                  }
                  onNodeAction({
                    nodeId: id2,
                    nodeType: "image",
                    action: info2.action,
                    phase: "click",
                    interaction: info2.interaction,
                    source: info2.source,
                  });
                }
              : void 0
          }
        />
      )}
      {showCustomizeToolbar && (
        <CustomizeToolbarDialog
          open={showCustomizeToolbar}
          onOpenChange={setShowCustomizeToolbar}
        />
      )}
      {rotate2.editing && (
        <ImageRotateEditToolbar
          visible={!!selected2}
          angle={rotate2.state.angle}
          onAngleChange={rotate2.setAngle}
          onRotate90={rotate2.step90}
          flipH={rotate2.state.flipH}
          flipV={rotate2.state.flipV}
          onFlipHorizontal={rotate2.toggleFlipH}
          onFlipVertical={rotate2.toggleFlipV}
          onCancel={rotate2.cancel}
          onSave={rotate2.save}
          saving={rotate2.saving}
          canSave={rotate2.hasChanges}
        />
      )}
      {splitMode.editing && splitMode.grid && (
        <ImageSplitEditToolbar
          visible={!!selected2}
          selectedCount={splitMode.selectedCells.size}
          magnification={splitMode.magnification}
          onSetMagnification={splitMode.setMagnification}
          onGenerate={splitMode.generateHighRes}
          onSplitLocal={splitMode.splitLocal}
          onExit={splitMode.exit}
          processing={splitMode.processing}
          perCellCost={splitPerCellCost}
        />
      )}
      <NodeBody
        width={shellWidth}
        tagIds={meta2?.tagIds}
        borderRadius={MEDIA_NODE_RADIUS}
        height={
          imgError
            ? MEDIA_FALLBACK_NODE_SIZE.height
            : isEmpty2 || isUserEmpty
              ? emptyAspectRatio
                ? emptySizeFromRatio(emptyAspectRatio).height
                : (nodeHeight ?? IMAGE_CARD_MAX_WIDTH)
              : rotate2.displayHeight
        }
        selected={selected2}
        variant={isEmpty2 ? "panel" : "media"}
        className={
          view2.isMulti &&
          !isExpandedMediaOverlayVisible &&
          !imageEditing &&
          !rotate2.editing
            ? "canvas-media-stack"
            : void 0
        }
        onDoubleClick={
          isEmpty2 ||
          imageEditing ||
          showWatermarkPopover ||
          imgError ||
          isExpandedMediaOverlayVisible
            ? void 0
            : () => lightbox.openLightbox()
        }
        dataActionUiId="canvas.image-node-body"
      >
        {isEmpty2 ? (
          <PlaceholderUploadButton
            icon={<ImagePlaceholderIcon />}
            label={t2("canvas.uploadImage")}
            onUpload={(anchor) => onPlaceholderUpload?.(id2, "image", anchor)}
          />
        ) : imgErrorReason ? (
          <MediaUnpreviewableFallback
            displayName={meta2?.name ?? t2("canvas.image")}
            extension={getFileExtension(meta2?.name)}
            sizeLabel={formatFileSize(meta2?.fileSize)}
            reason={imgErrorReason}
          />
        ) : imageEditing && meta2?.url ? (
          <ImageInplaceEditor
            src={meta2.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            width={nodeWidth}
            height={sourceBodyHeight}
            visible={!!selected2}
            onCancel={inplaceEdit.cancel}
            onConfirm={inplaceEdit.confirm}
            onProgressChange={inplaceEdit.setHadProgress}
          />
        ) : rotate2.editing && meta2?.url ? (
          <ImageRotatePreview
            src={thumbnailUrl ?? meta2.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            alt={meta2.name}
            width={nodeWidth}
            height={sourceBodyHeight}
            transform={rotate2.imageTransform}
          />
        ) : view2.primary?.url || meta2?.url ? (
          // Single-image ready render. Loading / error primaries never reach
          // ImageNode (they stay `type=placeholder` → PlaceholderNode; the
          // early `return null` above guards the invariant), and a single
          // image's url/meta land in the same `applyIncremental` batch as the
          // node flip (no multi-image parallel-fill race), so there's no
          // URL-race window to shimmer over here. NodeBody already supplies
          // the overflow-hidden / relative / sized shell + double-click →
          // lightbox, and CanvasImage owns its own decode placeholder, so we
          // render the bitmap directly without the ImageSlotBody/Card wrappers.
          <CanvasImage
            src={decodeSrc}
            animationSrc={resolveGifAnimationSrc(
              decodeSrc,
              meta2?.path,
              view2.primary?.name ?? meta2?.name,
            )}
            nodeId={id2}
            width={rotate2.displayWidth}
            height={rotate2.displayHeight}
            alt={view2.primary?.name ?? meta2?.name}
            onError={setImgErrorReason}
            onNaturalSize={handleNaturalSize}
          />
        ) : null}
        {showWatermarkPopover && !isEmpty2 && !imgError && (
          <ImageWatermarkPreview
            displayWidth={rotate2.displayWidth}
            displayHeight={rotate2.displayHeight}
            sourceWidth={primaryWidth ?? rotate2.displayWidth}
            settings={watermarkSettings}
          />
        )}
        {splitMode.editing && splitMode.grid && !isEmpty2 && !imgError && (
          <ImageSplitOverlay
            rows={splitMode.grid.rows}
            cols={splitMode.grid.cols}
            selected={splitMode.selectedCells}
            onToggle={splitMode.toggleCell}
            onSelectCells={splitMode.selectCells}
          />
        )}
        {!isEmpty2 &&
          !imgError &&
          !imageEditing &&
          !rotate2.editing &&
          !splitMode.editing &&
          !showWatermarkPopover &&
          !!onSaveAs &&
          !!meta2?.path &&
          (view2.primary?.url || meta2?.url) && (
            <MediaDownloadButton
              dataActionUiId="canvas.image-node.download"
              onClick={handleDownloadMain}
              label={t2("canvas.downloadImage", "下载图片")}
              title={t2("canvas.downloadImage", "下载图片")}
              className={
                isExpandedMediaOverlayVisible
                  ? "top-1 right-1 translate-y-0 opacity-100"
                  : "top-1 right-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0"
              }
            />
          )}
        {!isExpandedMediaOverlayClosing && !showWatermarkPopover && (
          <MultiImageChrome
            view={view2}
            showOverlay={showOverlay}
            hasLifecyclePrimary={false}
            isEmpty={isEmpty2}
            imgError={imgError}
            imageEditing={imageEditing}
            rotateEditing={rotate2.editing}
            onToggleOverlay={handleToggleOverlay}
            onSplitAll={handleSplitAll}
            onSplitMain={handleSplitMain}
          />
        )}
      </NodeBody>
      {showLayerDecomposePrompt && selected2 && (
        <LayerDecomposePrompt
          prompt={layerDecomposePrompt}
          submitting={layerDecomposeSubmitting}
          creditCost={layerDecomposeCost}
          onPromptChange={setLayerDecomposePrompt}
          onSubmit={() => void submitLayerDecomposePrompt()}
          onClose={closeLayerDecomposePrompt}
        />
      )}
      {view2.rounds.length > 1 &&
        !imageEditing &&
        !rotate2.editing &&
        !showWatermarkPopover && (
          <RoundDots
            count={view2.rounds.length}
            activeIdx={view2.activeRoundIndex}
            onSelect={handleSelectRound}
          />
        )}
      {isExpandedMediaOverlayVisible && (
        <MultiImageOverlay
          nodeId={id2}
          view={view2}
          cardWidth={rotate2.displayWidth}
          cardHeight={rotate2.displayHeight}
          closing={isExpandedMediaOverlayClosing}
          onSetPrimary={handleSetPrimary}
          onDeleteSub={handleDeleteSub}
          onSplitSub={handleSplitSub}
          onSplitAll={handleSplitAll}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenSubLightbox}
        />
      )}
      {showPopover && showI2VPopover && (
        <I2VPopover
          onSubmit={handleI2VSubmit}
          onClose={handleI2VClose}
          listVideoModels={fetchVideoModels}
          defaultImagePath={
            typeof meta2?.path === "string" ? meta2.path : void 0
          }
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
          defaultPrompt={i2vDraftPrompt ?? primaryPrompt}
          defaultPromptJson={i2vDraftPromptJson}
          defaultModelId={i2vDefaultModelId}
          defaultParams={i2vDefaultParams}
          lastUsedModelId={i2vLastUsedModelId}
          lastUsedParams={i2vLastUsedParams}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={id2}
          showCountChip={true}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(id2, "i2v", draft)}
          defaultTextPaths={defaultI2VTextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={
            view2.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
          }
        />
      )}
      {showPopover && showI2IPopover && (
        <I2IPopover
          onSubmit={handleI2ISubmit}
          onClose={handleI2IClose}
          listImageModels={fetchImageModels}
          defaultImagePaths={resolveDefaultReferencePaths(
            referenceImagePaths,
            i2iDraft?.imagePaths,
          )}
          defaultPrompt={i2iDraftPrompt ?? primaryPrompt}
          selfAssetIds={selfAssetIds}
          defaultPromptJson={i2iDraftPromptJson}
          defaultModelId={i2iDefaultModelId}
          defaultParams={i2iDefaultParams}
          lastUsedModelId={i2iLastUsedModelId}
          lastUsedParams={i2iLastUsedParams}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={id2}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(id2, "i2i", draft)}
          originalGenerationDraft={i2iRestoreOriginalDraft}
          currentImageCount={view2.slots.length}
          hasLoadingSlots={false}
          defaultTextPaths={defaultI2ITextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={
            view2.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
          }
        />
      )}
      {showEnhancePopover && (
        <EnhanceImagePopover
          onSubmit={handleEnhanceSubmit}
          onClose={handleEnhanceClose}
          width={primaryWidth}
          height={primaryHeight}
          creditCost={splitPerCellCost}
        />
      )}
      {showMultiAnglePopover && (
        <MultiAnglePopover
          onClose={closeMultiAnglePopover}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
        />
      )}
      {showStoryboardGridPopover && (
        <StoryboardGridPopover
          onClose={closeStoryboardGridPopover}
          replaceNodeId={isStoryboardProduct ? id2 : void 0}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
          defaultPrompt={isStoryboardProduct ? primaryPrompt : void 0}
          defaultParams={isStoryboardProduct ? meta2?.params : void 0}
          defaultReferencePaths={storyboardReferencePaths}
          resolveFileUrl={resolveFileUrl}
        />
      )}
      {showRelightPopover && (
        <RelightPopover
          onClose={closeRelightPopover}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
          imageWidth={primaryWidth}
          imageHeight={primaryHeight}
        />
      )}
      {showWatermarkPopover && primaryUrl && (
        <WatermarkPopover
          sourceUrl={primaryUrl}
          settings={watermarkSettings}
          onSettingsChange={setWatermarkSettings}
          onClose={closeWatermarkPopover}
          onConfirm={async (blob) => {
            const outputNodeId = await emitWatermarkedImage(blob, {
              suffix: "watermark",
              ext: "png",
            });
            focusDerivedNode(outputNodeId);
            const enteredAt = trackedActionStartRef.current.get("watermark");
            trackedActionStartRef.current.delete("watermark");
            onNodeAction?.({
              nodeId: id2,
              nodeType: "image",
              action: "watermark",
              phase: "apply",
              interaction: "opens_panel",
              durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
              toolSpecific: {
                output_bytes: blob.size,
              },
            });
          }}
        />
      )}
      {selected2 &&
        (displayImageOnly || isStoryboardProduct) &&
        isInteractiveSelect &&
        !isExpandedMediaOverlayVisible &&
        !isModalActive &&
        !rotate2.editing &&
        !splitMode.editing &&
        !imageEditing &&
        !showWatermarkPopover && (
          <NodeResizeFrame
            nodeId={id2}
            minWidth={isStoryboardProduct ? STORYBOARD_RESIZE_MIN_EDGE : void 0}
            minHeight={
              isStoryboardProduct ? STORYBOARD_RESIZE_MIN_EDGE : void 0
            }
            maxWidth={isStoryboardProduct ? STORYBOARD_RESIZE_MAX_EDGE : void 0}
            maxHeight={
              isStoryboardProduct ? STORYBOARD_RESIZE_MAX_EDGE : void 0
            }
            keepAspectRatio={isStoryboardProduct}
            onCommit={handleImageResizeCommit}
          />
        )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
      {lightbox.lightboxProps && (
        <ImageLightbox
          {...lightbox.lightboxProps}
          alt={meta2?.name ?? ""}
          onSetAsPrimary={
            canSetLightboxPrimary ? handleSetLightboxPrimary : void 0
          }
          onSplitToNode={
            canSplitLightboxImage ? handleSplitLightboxImage : void 0
          }
        />
      )}
      {colorAdjust.open && meta2?.url && (
        <ColorAdjustDialog
          {...colorAdjust.dialogProps}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              const enteredAt =
                trackedActionStartRef.current.get("color-adjust");
              trackedActionStartRef.current.delete("color-adjust");
              if (enteredAt != null) {
                onNodeAction?.({
                  nodeId: id2,
                  nodeType: "image",
                  action: "color-adjust",
                  phase: "abandon",
                  interaction: "opens_dialog",
                  durationMs: Date.now() - enteredAt,
                });
              }
            }
            colorAdjust.dialogProps.onOpenChange(nextOpen);
          }}
          onConfirm={async (blob) => {
            const enteredAt = trackedActionStartRef.current.get("color-adjust");
            trackedActionStartRef.current.delete("color-adjust");
            if (enteredAt != null) {
              onNodeAction?.({
                nodeId: id2,
                nodeType: "image",
                action: "color-adjust",
                phase: "apply",
                interaction: "opens_dialog",
                durationMs: Date.now() - enteredAt,
                toolSpecific: {
                  output_bytes: blob.size,
                },
              });
            }
            await colorAdjust.dialogProps.onConfirm(blob);
          }}
          imageSrc={meta2.url}
          fileName={meta2.name}
        />
      )}
    </NodeShell>
  );
}
