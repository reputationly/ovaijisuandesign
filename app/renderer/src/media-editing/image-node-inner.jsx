// image-node-inner.jsx
import { BACKEND_VIBE_STORYBOARD } from "../infra/shared-runtime.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { useReactFlow, useUpdateNodeInternals } from "../vendor-fork/xyflow/react/index.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { useImageUpscaleAvailable } from "../generation/normalize-model-info.js";
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
  id: imageNodeId,
  data,
  selected,
  width,
  height,
}) {
  const trackedActionStartRef = reactExports.useRef(new Map());
  const { t } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const nodeData = data;
  const view = useImageNodeView(imageNodeId, data);
  const subImages = useSubImages(imageNodeId);
  const meta = useAssetMeta(
    view.primary?.id ?? (view.isUserEmpty ? "" : imageNodeId),
  );
  const isStoryboardProduct =
    nodeData.backend === BACKEND_VIBE_STORYBOARD ||
    meta?.backend === BACKEND_VIBE_STORYBOARD;
  const storyboardSplitGrid = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    const { rows, cols } = resolveStoryboardGridSelection(meta?.params);
    return {
      rows,
      cols,
    };
  }, [isStoryboardProduct, meta?.params]);
  const persistedReferenceImageIds = reactExports.useMemo(
    () =>
      mergeReferenceImageIds(
        nodeData.referenceImageIds,
        meta?.referenceImageIds,
      ),
    [nodeData.referenceImageIds, meta?.referenceImageIds],
  );
  const primaryPrompt = view.primary?.prompt ?? meta?.prompt;
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
  const onRename = useNodeRename(imageNodeId, isCloneData(data));
  const { croppingNodeId } = useCropState();
  const { outpaintingNodeId } = useOutpaintState();
  const { erasingNodeId } = useEraseState();
  const { redrawingNodeId } = useRedrawState();
  const { movingObjectNodeId } = useMoveObjectState();
  const nodeWidth = width || IMAGE_CARD_MAX_WIDTH;
  const nodeHeight = height;
  const imageData = data;
  const displaySize =
    imageData?.displaySize &&
    imageData.displaySize.width > 0 &&
    imageData.displaySize.height > 0
      ? imageData.displaySize
      : void 0;
  const displayImageOnly = imageData?.displayImageOnly === true;
  const { snapshot: referenceReturnI2V } = useReferenceNavigationSnapshot(
    imageNodeId,
    "i2v",
  );
  const { snapshot: referenceReturnI2I } = useReferenceNavigationSnapshot(
    imageNodeId,
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
      text: t("canvas.watermark.defaultText", "@ 水印文案"),
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
    if (!cropImage || (!view.primary?.url && !meta?.url)) return;
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowStoryboardGridPopover(false);
    setShowRelightPopover(false);
    const rect = getNodeFlowRect(reactFlow, imageNodeId, nodeWidth, nodeHeight);
    if (!rect) return;
    setWatermarkSettings({
      ...DEFAULT_WATERMARK_SETTINGS,
      text: t("canvas.watermark.defaultText", "@ 水印文案"),
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
    imageNodeId,
    meta?.url,
    nodeHeight,
    nodeWidth,
    reactFlow,
    t,
    view.primary?.url,
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
  const handleNaturalSize = reactExports.useCallback((naturalWidth, naturalHeight) => {
    setNaturalSize((prev) =>
      prev && prev.width === naturalWidth && prev.height === naturalHeight
        ? prev
        : {
            width: naturalWidth,
            height: naturalHeight,
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
  const modelInfo = useModelForAsset(meta?.backend, meta?.model_id, "image");
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
    if (!onInstantiatePlugin || !view.primary?.url) return;
    const panoramaNodeId = await onInstantiatePlugin({
      pluginId: PANORAMA_VIEWER_PLUGIN_ID,
      sourceNodeIds: [imageNodeId],
      initialData: {
        panoramaGenerationPending: true,
      },
    });
    if (!panoramaNodeId) return;
    let finished = false;
    let unsubscribe = () => {};
    let timeout = 0;
    const openGeneratorWhenReady = () => {
      if (
        finished ||
        !getNodeById(panoramaNodeId) ||
        !getIncomingSourceIds(panoramaNodeId).includes(imageNodeId)
      )
        return false;
      finished = true;
      unsubscribe();
      window.clearTimeout(timeout);
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
      timeout = window.setTimeout(() => {
        finished = true;
        unsubscribe();
      }, 5e3);
    }
  }, [
    focusDerivedNode,
    getNodeById,
    getIncomingSourceIds,
    imageNodeId,
    onInstantiatePlugin,
    resizeNode,
    subscribeGraphChange,
    view.primary?.url,
  ]);
  const handleImageResizeCommit = reactExports.useCallback(
    (nodeId, positionX, positionY, nextWidth, nextHeight) => {
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
          positionX,
          positionY,
          nextWidth,
          nextHeight,
          nextData,
        );
        return;
      }
      moveAndResizeNode(nodeId, positionX, positionY, nextWidth, nextHeight, {
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
  const i2iDraft = resolveActivePopoverDraft(data, "i2i");
  const i2vDraft = resolveActivePopoverDraft(data, "i2v");
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
  const upstreamImageMeta = useUpstreamSameTypeMeta(imageNodeId, "image");
  const lastUsedI2I = getLastUsedModelParams?.("i2i");
  const lastUsedI2V = getLastUsedModelParams?.("i2v");
  const zoomTier = useStableZoomTier();
  const isOutpaintingThis = outpaintingNodeId === imageNodeId;
  const fileVersion = usePathFileVersion(meta?.path);
  const primaryUrl = view.primary?.url ?? meta?.url;
  const decodeSrc =
    primaryUrl !== void 0 && fileVersion > 0
      ? appendCanvasFileVersion(primaryUrl, fileVersion)
      : primaryUrl;
  reactExports.useEffect(() => {
    setImgErrorReason(null);
    setNaturalSize(null);
  }, [decodeSrc]);
  const isUnfilled =
    view.isUserEmpty && view.status === "empty" && view.slots.length === 0;
  const isUserEmpty = isUnfilled;
  const i2iDefaultModelId = isUserEmpty
    ? (i2iDraft?.modelId ?? upstreamImageMeta?.modelId)
    : (i2iDraft?.modelId ?? modelInfo?.id ?? meta?.model_id ?? meta?.model);
  const i2iDefaultParams = isUserEmpty
    ? (i2iDraft?.params ?? upstreamImageMeta?.params)
    : (i2iDraft?.params ?? meta?.params);
  const i2vDefaultModelId = isUserEmpty
    ? i2vDraft?.modelId
    : (i2vDraft?.modelId ?? modelInfo?.id);
  const i2vDefaultParams = isUserEmpty
    ? i2vDraft?.params
    : (i2vDraft?.params ?? meta?.params);
  const i2iLastUsedModelId = isUserEmpty ? lastUsedI2I?.modelId : void 0;
  const i2iLastUsedParams = isUserEmpty ? lastUsedI2I?.params : void 0;
  const i2vLastUsedModelId = isUserEmpty ? lastUsedI2V?.modelId : void 0;
  const i2vLastUsedParams = isUserEmpty ? lastUsedI2V?.params : void 0;
  const i2iOriginalGenerationDraft = reactExports.useMemo(
    () =>
      buildOriginalGenerationDraft(
        primaryPrompt,
        modelInfo?.id ?? meta?.model_id ?? meta?.model,
        meta?.params,
        referenceImagePaths,
      ),
    [
      primaryPrompt,
      modelInfo?.id,
      meta?.model_id,
      meta?.model,
      meta?.params,
      referenceImagePaths,
    ],
  );
  const i2iRestoreOriginalDraft =
    !isUserEmpty &&
    draftOverridesOriginalGeneration(i2iDraft, i2iOriginalGenerationDraft)
      ? i2iOriginalGenerationDraft
      : void 0;
  const { emptyAspectRatio, setEmptyAspectRatio } = useEmptyAspectRatio({
    id: imageNodeId,
    data,
    isEmptyForWrite: isUnfilled || !meta,
    draftKeys: ["i2i", "i2v"],
  });
  const isEmptyForSync = (isUnfilled || !meta) && !view.primary;
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
          nodes.map((node) =>
            node.id === imageNodeId
              ? {
                  ...node,
                  width: targetEmptyWidth,
                  height: targetEmptyHeight,
                }
              : node,
          ),
        );
        lastSyncActionRef.current = "empty";
      }
      return;
    }
    if (prev !== "none") {
      reactFlow.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== imageNodeId) return node;
          const { width: _removedWidth, height: _removedHeight, ...rest } = node;
          return rest;
        }),
      );
      lastSyncActionRef.current = "none";
    }
  }, [isEmptyForSync, targetEmptyWidth, targetEmptyHeight, imageNodeId, reactFlow]);
  const persistedPathValue = data.path;
  const persistedPath =
    typeof persistedPathValue === "string" && persistedPathValue.trim()
      ? persistedPathValue
      : void 0;
  const handleAddToChat = useAddToChat(imageNodeId, meta, onAddToChat, persistedPath);
  const handlePromoteToAsset = reactExports.useMemo(() => {
    if (!onPromoteToAsset) return void 0;
    return (clickEvent) => {
      onPromoteToAsset([imageNodeId], {
        x: clickEvent.clientX,
        y: clickEvent.clientY,
      });
    };
  }, [imageNodeId, onPromoteToAsset]);
  const { handleCrop } = useStartCropFromNode({
    id: imageNodeId,
    meta,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
  });
  const { handleOutpaint } = useStartOutpaintFromNode({
    id: imageNodeId,
    meta,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitOutpaint,
  });
  const { handleErase } = useStartEraseFromNode({
    id: imageNodeId,
    meta,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitErase,
  });
  const { handleRedraw } = useStartRedrawFromNode({
    id: imageNodeId,
    meta,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitRedraw,
  });
  const { handleRemoveBg } = useDirectImageActions({
    id: imageNodeId,
    meta,
    submitSuperResolution,
    submitRemoveBg,
  });
  const handleLayerDecompose = reactExports.useCallback(() => {
    if (!submitLayerDecompose || !meta?.path || layerDecomposeSubmitting)
      return;
    setLayerDecomposePrompt("");
    setShowLayerDecomposePrompt(true);
  }, [layerDecomposeSubmitting, meta?.path, submitLayerDecompose]);
  const dismissLayerDecomposePrompt = usePopoverCloseWithDeselect(
    imageNodeId,
    setShowLayerDecomposePrompt,
  );
  const closeLayerDecomposePrompt = reactExports.useCallback(() => {
    if (layerDecomposeSubmitting) return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: imageNodeId,
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
    imageNodeId,
    layerDecomposeSubmitting,
    onNodeAction,
  ]);
  const submitLayerDecomposePrompt = reactExports.useCallback(async () => {
    if (!submitLayerDecompose || !meta?.path || layerDecomposeSubmitting)
      return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    onNodeAction?.({
      nodeId: imageNodeId,
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
      await submitLayerDecompose(imageNodeId, meta.path, layerDecomposePrompt);
    } finally {
      setLayerDecomposeSubmitting(false);
    }
  }, [
    imageNodeId,
    dismissLayerDecomposePrompt,
    layerDecomposePrompt,
    layerDecomposeSubmitting,
    meta?.path,
    onNodeAction,
    submitLayerDecompose,
  ]);
  reactExports.useEffect(() => {
    if (!selected && showLayerDecomposePrompt) {
      closeLayerDecomposePrompt();
    }
  }, [closeLayerDecomposePrompt, selected, showLayerDecomposePrompt]);
  // 图片超分没有可用模型时入口整个不显示（`models.image_upscale` 为空，见 B-1 的兜底边界）。
  const imageUpscaleAvailable = useImageUpscaleAvailable();
  const handleSuperResolution = reactExports.useCallback(() => {
    if (!imageUpscaleAvailable) {
      dedupedToast.error(t("canvas.superResolution.unavailable", "当前平台没有配置图片超分模型"));
      return;
    }
    if (!submitSuperResolution || !meta?.path) return;
    const imageWidth = view.primary?.width ?? meta?.width ?? naturalSize?.width;
    const imageHeight = view.primary?.height ?? meta?.height ?? naturalSize?.height;
    if (!isEnhanceImageInputEligible(imageWidth, imageHeight)) {
      dedupedToast.error(
        t(
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
    imageUpscaleAvailable,
    submitSuperResolution,
    meta?.path,
    meta?.width,
    meta?.height,
    view.primary,
    naturalSize,
    t,
  ]);
  const allImageSlots = reactExports.useMemo(
    () => view.rounds.flat(),
    [view.rounds],
  );
  const lightboxItems = reactExports.useMemo(() => {
    if (allImageSlots.length === 0) {
      const item = lightboxItemFromAssetMeta("image", meta);
      return item ? [item] : [];
    }
    const metadata = assetMetadataStore.getState();
    return lightboxItemsFromSlots("image", allImageSlots, {
      getMetaById: (assetId) => metadata.get(assetId),
      nodes: subImages,
      primarySlotId: view.primary?.id,
      primaryMeta: meta,
    });
  }, [allImageSlots, view.primary?.id, meta, assetMetadataStore, subImages]);
  const lightboxInitialIndex = reactExports.useMemo(() => {
    if (lightboxItems.length === 0) return 0;
    return resolveLightboxIndexForSlot(lightboxItems, view.primary, 0);
  }, [lightboxItems, view.primary]);
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
      const targetSlot = view.slots[originalIndex];
      const targetIndex = resolveLightboxIndexForSlot(
        lightboxItems,
        targetSlot,
        lightboxInitialIndex,
      );
      lightbox.openLightbox(targetIndex);
    },
    [view.slots, lightboxItems, lightboxInitialIndex, lightbox.openLightbox],
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
    id: imageNodeId,
    meta,
    nodeWidth,
    reactFlow,
    cropImage,
    lut: colorAdjustLutBundle,
  });
  const emitWatermarkedImage = useEmitDerivedFromBlob({
    id: imageNodeId,
    meta,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const inplaceEdit = useImageInplaceEdit({
    id: imageNodeId,
    meta,
    selected,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
    onApply: (blob) => {
      const enteredAt = trackedActionStartRef.current.get("image-inplace-edit");
      trackedActionStartRef.current.delete("image-inplace-edit");
      onNodeAction?.({
        nodeId: imageNodeId,
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
        nodeId: imageNodeId,
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
    view.primary?.width ?? meta?.width ?? naturalSize?.width;
  const primaryHeight =
    view.primary?.height ?? meta?.height ?? naturalSize?.height;
  const bodyHeight = reactExports.useMemo(() => {
    if ((displayImageOnly || isStoryboardProduct) && nodeHeight)
      return nodeHeight;
    if (displaySize) return Math.round(displaySize.height);
    const primaryImageWidth = primaryWidth;
    const primaryImageHeight = primaryHeight;
    if (primaryImageWidth && primaryImageHeight) return Math.round(nodeWidth * (primaryImageHeight / primaryImageWidth));
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
      nodes.map((node) => {
        if (node.id !== imageNodeId) return node;
        if (node.width === targetW && node.height === targetH) return node;
        return {
          ...node,
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
      !view.primary?.width &&
      !view.primary?.height &&
      !meta?.width &&
      !meta?.height;
    if (fromNaturalOnly) {
      const target = reconcileNodeSize(
        "image",
        getNodeById(imageNodeId)?.size,
        primaryWidth,
        primaryHeight,
      );
      if (target) resizeNode(imageNodeId, target.width, target.height);
    }
  }, [
    isEmptyForSync,
    primaryWidth,
    primaryHeight,
    imageNodeId,
    reactFlow,
    view.primary?.width,
    view.primary?.height,
    meta?.width,
    meta?.height,
    displaySize,
    getNodeById,
    resizeNode,
  ]);
  const rotate = useImageRotateEdit({
    nodeId: imageNodeId,
    selected: !!selected,
    meta,
    nodeWidth,
    sourceBodyHeight,
    cropImage,
    reactFlow,
    onSaved: () => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: imageNodeId,
        nodeType: "image",
        action: "rotate",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: {
          rotation_angle: rotate.state.angle,
          flip_horizontal: rotate.state.flipH,
          flip_vertical: rotate.state.flipV,
        },
      });
    },
    onAbandon: (hadProgress) => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      if (enteredAt == null) return;
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: imageNodeId,
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
    id: imageNodeId,
    selected: !!selected,
    meta,
    batchCropAndUpscale,
    cropSplit,
    url: view.primary?.url,
    onApply: (detail) => {
      const enteredAt = trackedActionStartRef.current.get("split-grid");
      trackedActionStartRef.current.delete("split-grid");
      onNodeAction?.({
        nodeId: imageNodeId,
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
  const updateNodeInternals = useUpdateNodeInternals();
  const lastRotateAabbRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const key = `${rotate.displayWidth}x${rotate.displayHeight}`;
    if (lastRotateAabbRef.current === key) return;
    const isMount = lastRotateAabbRef.current === null;
    lastRotateAabbRef.current = key;
    if (isMount) return;
    updateNodeInternals(imageNodeId);
  }, [imageNodeId, updateNodeInternals, rotate.displayWidth, rotate.displayHeight]);
  const handleI2VClose = usePopoverCloseWithDeselect(imageNodeId, setShowI2VPopover);
  const handleI2IClose = usePopoverCloseWithDeselect(imageNodeId, setShowI2IPopover);
  const closeEnhancePopover = usePopoverCloseWithDeselect(
    imageNodeId,
    setShowEnhancePopover,
  );
  const closeMultiAnglePopover = usePopoverCloseWithDeselect(
    imageNodeId,
    setShowMultiAnglePopover,
  );
  const closeStoryboardGridPopover = usePopoverCloseWithDeselect(
    imageNodeId,
    setShowStoryboardGridPopover,
  );
  const closeRelightPopover = usePopoverCloseWithDeselect(
    imageNodeId,
    setShowRelightPopover,
  );
  const closeWatermarkPopover = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("watermark");
    trackedActionStartRef.current.delete("watermark");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: imageNodeId,
        nodeType: "image",
        action: "watermark",
        phase: "abandon",
        interaction: "opens_panel",
        durationMs: Date.now() - enteredAt,
      });
    }
    setShowWatermarkPopover(false);
    setWatermarkFocusTarget(null);
  }, [imageNodeId, onNodeAction]);
  const handleEnhanceClose = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("super-resolution");
    trackedActionStartRef.current.delete("super-resolution");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: imageNodeId,
        nodeType: "image",
        action: "super-resolution",
        phase: "abandon",
        interaction: "opens_dialog",
        durationMs: Date.now() - enteredAt,
      });
    }
    closeEnhancePopover();
  }, [closeEnhancePopover, imageNodeId, onNodeAction]);
  const handleEnhanceSubmit = reactExports.useCallback(
    (params) => {
      const enteredAt = trackedActionStartRef.current.get("super-resolution");
      trackedActionStartRef.current.delete("super-resolution");
      if (enteredAt != null) {
        onNodeAction?.({
          nodeId: imageNodeId,
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
      if (submitSuperResolution && meta?.path) {
        void submitSuperResolution(imageNodeId, meta.path, {
          resolution: params.resolution,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
        });
      }
      closeEnhancePopover();
    },
    [
      submitSuperResolution,
      meta?.path,
      imageNodeId,
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
      count,
      textPaths,
    ) => {
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && !replaceNodeId && view.status === "empty") {
        mergeNodeDataSilent(imageNodeId, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Video?.(
          imageNodeId,
          prompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt,
          count,
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
          dedupedToast.error(t("canvas.promptDraftSaveFailed"));
        },
      });
    },
    [imageNodeId, submitImg2Video, view.status, mergeNodeDataSilent, flushPersist, t],
  );
  const handleI2ISubmit = reactExports.useCallback(
    (
      prompt,
      modelId,
      params,
      imagePaths,
      replaceNodeId,
      count,
      displayPrompt,
      textPaths,
    ) => {
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && view.status === "empty") {
        mergeNodeDataSilent(imageNodeId, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Image?.(
          imageNodeId,
          prompt,
          modelId,
          params,
          imagePaths,
          replaceNodeId,
          count,
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
          dedupedToast.error(t("canvas.promptDraftSaveFailed")),
      });
    },
    [imageNodeId, submitImg2Image, view.status, mergeNodeDataSilent, flushPersist, t],
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
    id: imageNodeId,
    view,
    subImages,
    reactFlow,
    nodeWidth,
    nodeHeight,
  });
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view.activeRoundIndex) return;
      setShowI2VPopover(false);
      setShowI2IPopover(false);
      setShowEnhancePopover(false);
      setShowMultiAnglePopover(false);
      setShowStoryboardGridPopover(false);
      setShowRelightPopover(false);
      setShowWatermarkPopover(false);
      selectRound(roundIdx);
    },
    [selectRound, view.activeRoundIndex],
  );
  const canSetLightboxPrimary =
    allImageSlots.length > 1 &&
    !!currentLightboxSlot &&
    currentLightboxSlot.id !== view.primary?.id;
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
      model: meta?.model ?? nodeData.model,
      modelId: meta?.model_id ?? nodeData.model_id,
      backend: meta?.backend ?? nodeData.backend,
      sourceTool: meta?.source_tool ?? nodeData.source_tool,
    });
  const handleDownloadMain = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      if (!onSaveAs || !meta?.path) return;
      onSaveAs(meta.path, meta.name);
    },
    [onSaveAs, meta?.path, meta?.name],
  );
  const selfAssetIds = reactExports.useMemo(() => {
    const ids = new Set();
    for (const slot of view.slots) {
      if (slot.status === "ready" && slot.id) ids.add(slot.id);
    }
    if (meta && imageNodeId) ids.add(imageNodeId);
    return ids;
  }, [view.slots, meta, imageNodeId]);
  const showOverlay = isOverlayOpen;
  const expandedMediaOverlay =
    view.isMulti &&
    showOverlay &&
    !imageEditing &&
    !rotate.editing &&
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
    if (!selected) return;
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
    const sources = getIncomingSourceIds(imageNodeId);
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
        meta?.referenceVideoIds,
        assetMetadataStore,
      ),
    );
    setReferenceAudioPaths(
      resolveReferenceAudios(
        sources,
        meta?.referenceAudioIds,
        assetMetadataStore,
      ),
    );
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(data.referenceTextIds)
          ? data.referenceTextIds
          : meta?.referenceTextIds,
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
    selected,
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
    imageNodeId,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const buildIncomingReferenceKey = reactExports.useCallback(() => {
    const sources = [...getIncomingSourceIds(imageNodeId)].sort();
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
    imageNodeId,
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
      const key = buildIncomingReferenceKey();
      setIncomingSourceKey((prev) => (prev === key ? prev : key));
    });
    return unsubscribe;
  }, [buildIncomingReferenceKey, subscribeGraphChange]);
  const storyboardReferencePaths = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    return resolveReferenceImages(
      getIncomingSourceIds(imageNodeId),
      persistedReferenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
  }, [
    incomingSourceKey,
    isStoryboardProduct,
    imageNodeId,
    persistedReferenceImageIds,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  reactExports.useEffect(() => {
    if (!showI2IPopover && !showI2VPopover) return;
    const sources = getIncomingSourceIds(imageNodeId);
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
    imageNodeId,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const liveReferenceTextPaths = reactExports.useMemo(() => {
    return resolveReferenceTexts(
      getIncomingSourceIds(imageNodeId),
      void 0,
      assetMetadataStore,
      getNodeById,
    );
  }, [
    incomingSourceKey,
    imageNodeId,
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
  const dimensions = reactExports.useMemo(() => {
    const imageWidth = meta?.width;
    const imageHeight = meta?.height;
    if (imageWidth && imageHeight) return `${imageWidth} x ${imageHeight}`;
    return void 0;
  }, [meta?.width, meta?.height]);
  const hasDimensions = !!(meta?.width && meta?.height);
  const thumbnailUrl = reactExports.useMemo(
    () => (meta?.url ? buildThumbnailUrl(meta.url, nodeWidth) : void 0),
    [meta?.url, nodeWidth],
  );
  const thumbnailSrcSet = reactExports.useMemo(
    () => (meta?.url ? buildThumbnailSrcSet(meta.url, nodeWidth) : void 0),
    [meta?.url, nodeWidth],
  );
  const thumbnailSizes = `${Math.round(nodeWidth * zoomTier)}px`;
  const deferredSelected = reactExports.useDeferredValue(selected);
  useWarnMissingAssetMeta({
    nodeId: imageNodeId,
    nodeType: "image",
    data,
    meta,
    isUserEmpty,
  });
  const isEmpty = view.status === "empty" && !view.primary;
  useMediaFallbackSize(
    imageNodeId,
    imgError &&
      !isEmpty &&
      !!(meta || view.primary) &&
      !isMissingAssetNodeData(data),
  );
  if (isMissingAssetNodeData(data)) {
    return (
      <MissingAssetCard
        nodeId={imageNodeId}
        name={typeof data?.name === "string" ? data.name : void 0}
      />
    );
  }
  if (!meta && !isUserEmpty && !view.primary) return null;
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
    !isEmpty &&
    !!selected &&
    !!deferredSelected &&
    isInteractiveSelect &&
    !isExpandedMediaOverlayVisible &&
    !isModalActive &&
    !rotate.editing &&
    !splitMode.editing &&
    !imageEditing &&
    !showEnhancePopover &&
    !showMultiAnglePopover &&
    (!showStoryboardGridPopover || isStoryboardProduct) &&
    !showRelightPopover &&
    !showWatermarkPopover;
  const showPopover = shouldShowImageBottomPopover({
    selected: !!selected,
    deferredSelected: !!deferredSelected,
    isInteractiveSelect,
    isExpandedMediaOverlayVisible,
    isModalActive,
    rotateEditing: rotate.editing,
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
    : rotate.displayWidth;
  return (
    <NodeShell
      id={imageNodeId}
      tagIds={meta?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.image-node"
      dataState={
        view.isUserEmpty && view.status === "empty"
          ? "empty"
          : view.status === "ready" && view.primary?.url
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
            tagIds={meta?.tagIds}
            name={resolveImageNodeDisplayName(
              {
                dataName: data?.name,
                primaryName: view.primary?.name,
                metaName: meta?.name,
              },
              t("canvas.image"),
            )}
            selected={selected}
            dimensions={dimensions}
            maxWidth={shellWidth}
            onRename={onRename}
          />
        )}
      {showStandardToolbar && (
        <ImageNodeToolbarSection
          hasDimensions={hasDimensions}
          imageUpscaleAvailable={imageUpscaleAvailable}
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
            onInstantiatePlugin && view.primary?.url
              ? handlePanoramaReference
              : void 0
          }
          handleWatermark={primaryUrl && cropImage ? handleWatermark : void 0}
          handleStoryboardGrid={
            isStoryboardProduct ? void 0 : handleStoryboardGrid
          }
          handleRelight={handleRelight}
          handleRotate={rotate.enter}
          handleSplitEnter={splitMode.enter}
          pinSplitGrid={isStoryboardProduct}
          splitGrid={storyboardSplitGrid}
          handleFullscreen={lightbox.openLightbox}
          handlePromoteToAsset={handlePromoteToAsset}
          handleCustomizeToolbar={handleCustomizeToolbar}
          onToolClick={
            onNodeAction
              ? (info) => {
                  if (
                    info.interaction === "opens_mode" ||
                    info.interaction === "opens_dialog" ||
                    info.action === "watermark"
                  ) {
                    trackedActionStartRef.current.set(info.action, Date.now());
                  }
                  onNodeAction({
                    nodeId: imageNodeId,
                    nodeType: "image",
                    action: info.action,
                    phase: "click",
                    interaction: info.interaction,
                    source: info.source,
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
      {rotate.editing && (
        <ImageRotateEditToolbar
          visible={!!selected}
          angle={rotate.state.angle}
          onAngleChange={rotate.setAngle}
          onRotate90={rotate.step90}
          flipH={rotate.state.flipH}
          flipV={rotate.state.flipV}
          onFlipHorizontal={rotate.toggleFlipH}
          onFlipVertical={rotate.toggleFlipV}
          onCancel={rotate.cancel}
          onSave={rotate.save}
          saving={rotate.saving}
          canSave={rotate.hasChanges}
        />
      )}
      {splitMode.editing && splitMode.grid && (
        <ImageSplitEditToolbar
          visible={!!selected}
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
        tagIds={meta?.tagIds}
        borderRadius={MEDIA_NODE_RADIUS}
        height={
          imgError
            ? MEDIA_FALLBACK_NODE_SIZE.height
            : isEmpty || isUserEmpty
              ? emptyAspectRatio
                ? emptySizeFromRatio(emptyAspectRatio).height
                : (nodeHeight ?? IMAGE_CARD_MAX_WIDTH)
              : rotate.displayHeight
        }
        selected={selected}
        variant={isEmpty ? "panel" : "media"}
        className={
          view.isMulti &&
          !isExpandedMediaOverlayVisible &&
          !imageEditing &&
          !rotate.editing
            ? "canvas-media-stack"
            : void 0
        }
        onDoubleClick={
          isEmpty ||
          imageEditing ||
          showWatermarkPopover ||
          imgError ||
          isExpandedMediaOverlayVisible
            ? void 0
            : () => lightbox.openLightbox()
        }
        dataActionUiId="canvas.image-node-body"
      >
        {isEmpty ? (
          <PlaceholderUploadButton
            icon={<ImagePlaceholderIcon />}
            label={t("canvas.uploadImage")}
            onUpload={(anchor) => onPlaceholderUpload?.(imageNodeId, "image", anchor)}
          />
        ) : imgErrorReason ? (
          <MediaUnpreviewableFallback
            displayName={meta?.name ?? t("canvas.image")}
            extension={getFileExtension(meta?.name)}
            sizeLabel={formatFileSize(meta?.fileSize)}
            reason={imgErrorReason}
          />
        ) : imageEditing && meta?.url ? (
          <ImageInplaceEditor
            src={meta.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            width={nodeWidth}
            height={sourceBodyHeight}
            visible={!!selected}
            onCancel={inplaceEdit.cancel}
            onConfirm={inplaceEdit.confirm}
            onProgressChange={inplaceEdit.setHadProgress}
          />
        ) : rotate.editing && meta?.url ? (
          <ImageRotatePreview
            src={thumbnailUrl ?? meta.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            alt={meta.name}
            width={nodeWidth}
            height={sourceBodyHeight}
            transform={rotate.imageTransform}
          />
        ) : view.primary?.url || meta?.url ? (
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
              meta?.path,
              view.primary?.name ?? meta?.name,
            )}
            nodeId={imageNodeId}
            width={rotate.displayWidth}
            height={rotate.displayHeight}
            alt={view.primary?.name ?? meta?.name}
            onError={setImgErrorReason}
            onNaturalSize={handleNaturalSize}
          />
        ) : null}
        {showWatermarkPopover && !isEmpty && !imgError && (
          <ImageWatermarkPreview
            displayWidth={rotate.displayWidth}
            displayHeight={rotate.displayHeight}
            sourceWidth={primaryWidth ?? rotate.displayWidth}
            settings={watermarkSettings}
          />
        )}
        {splitMode.editing && splitMode.grid && !isEmpty && !imgError && (
          <ImageSplitOverlay
            rows={splitMode.grid.rows}
            cols={splitMode.grid.cols}
            selected={splitMode.selectedCells}
            onToggle={splitMode.toggleCell}
            onSelectCells={splitMode.selectCells}
          />
        )}
        {!isEmpty &&
          !imgError &&
          !imageEditing &&
          !rotate.editing &&
          !splitMode.editing &&
          !showWatermarkPopover &&
          !!onSaveAs &&
          !!meta?.path &&
          (view.primary?.url || meta?.url) && (
            <MediaDownloadButton
              dataActionUiId="canvas.image-node.download"
              onClick={handleDownloadMain}
              label={t("canvas.downloadImage", "下载图片")}
              title={t("canvas.downloadImage", "下载图片")}
              className={
                isExpandedMediaOverlayVisible
                  ? "top-1 right-1 translate-y-0 opacity-100"
                  : "top-1 right-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0"
              }
            />
          )}
        {!isExpandedMediaOverlayClosing && !showWatermarkPopover && (
          <MultiImageChrome
            view={view}
            showOverlay={showOverlay}
            hasLifecyclePrimary={false}
            isEmpty={isEmpty}
            imgError={imgError}
            imageEditing={imageEditing}
            rotateEditing={rotate.editing}
            onToggleOverlay={handleToggleOverlay}
            onSplitAll={handleSplitAll}
            onSplitMain={handleSplitMain}
          />
        )}
      </NodeBody>
      {showLayerDecomposePrompt && selected && (
        <LayerDecomposePrompt
          prompt={layerDecomposePrompt}
          submitting={layerDecomposeSubmitting}
          creditCost={layerDecomposeCost}
          onPromptChange={setLayerDecomposePrompt}
          onSubmit={() => void submitLayerDecomposePrompt()}
          onClose={closeLayerDecomposePrompt}
        />
      )}
      {view.rounds.length > 1 &&
        !imageEditing &&
        !rotate.editing &&
        !showWatermarkPopover && (
          <RoundDots
            count={view.rounds.length}
            activeIdx={view.activeRoundIndex}
            onSelect={handleSelectRound}
          />
        )}
      {isExpandedMediaOverlayVisible && (
        <MultiImageOverlay
          nodeId={imageNodeId}
          view={view}
          cardWidth={rotate.displayWidth}
          cardHeight={rotate.displayHeight}
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
            typeof meta?.path === "string" ? meta.path : void 0
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
          replaceNodeId={imageNodeId}
          showCountChip={true}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(imageNodeId, "i2v", draft)}
          defaultTextPaths={defaultI2VTextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={
            view.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
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
          replaceNodeId={imageNodeId}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(imageNodeId, "i2i", draft)}
          originalGenerationDraft={i2iRestoreOriginalDraft}
          currentImageCount={view.slots.length}
          hasLoadingSlots={false}
          defaultTextPaths={defaultI2ITextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={
            view.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0
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
          imagePath={meta?.path}
        />
      )}
      {showStoryboardGridPopover && (
        <StoryboardGridPopover
          onClose={closeStoryboardGridPopover}
          replaceNodeId={isStoryboardProduct ? imageNodeId : void 0}
          imageUrl={primaryUrl}
          imagePath={meta?.path}
          defaultPrompt={isStoryboardProduct ? primaryPrompt : void 0}
          defaultParams={isStoryboardProduct ? meta?.params : void 0}
          defaultReferencePaths={storyboardReferencePaths}
          resolveFileUrl={resolveFileUrl}
        />
      )}
      {showRelightPopover && (
        <RelightPopover
          onClose={closeRelightPopover}
          imageUrl={primaryUrl}
          imagePath={meta?.path}
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
              nodeId: imageNodeId,
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
      {selected &&
        (displayImageOnly || isStoryboardProduct) &&
        isInteractiveSelect &&
        !isExpandedMediaOverlayVisible &&
        !isModalActive &&
        !rotate.editing &&
        !splitMode.editing &&
        !imageEditing &&
        !showWatermarkPopover && (
          <NodeResizeFrame
            nodeId={imageNodeId}
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
      <NodeHandles nodeId={imageNodeId} selected={!!selected} />
      {lightbox.lightboxProps && (
        <ImageLightbox
          {...lightbox.lightboxProps}
          alt={meta?.name ?? ""}
          onSetAsPrimary={
            canSetLightboxPrimary ? handleSetLightboxPrimary : void 0
          }
          onSplitToNode={
            canSplitLightboxImage ? handleSplitLightboxImage : void 0
          }
        />
      )}
      {colorAdjust.open && meta?.url && (
        <ColorAdjustDialog
          {...colorAdjust.dialogProps}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              const enteredAt =
                trackedActionStartRef.current.get("color-adjust");
              trackedActionStartRef.current.delete("color-adjust");
              if (enteredAt != null) {
                onNodeAction?.({
                  nodeId: imageNodeId,
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
                nodeId: imageNodeId,
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
          imageSrc={meta.url}
          fileName={meta.name}
        />
      )}
    </NodeShell>
  );
}
