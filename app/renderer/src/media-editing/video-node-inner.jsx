// video-node-inner.jsx
import {
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useAssetMetadataApi,
  useAssetMetadataStore,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { buildImageNodeView } from "../canvas/build-slot-from-node.js";
import { useSubImages } from "./use-start-cloud-edit-from-node.js";
import { drawWatermark } from "./single-position.js";
import { resolveVideoPlaybackUrl } from "../generation/to-workspace-browser-url.js";
import {
  isCloneData,
  lightboxItemFromAssetMeta,
  lightboxItemsFromSlots,
  NODE_POPOVER_SAFE_GAP,
  readGenerationAttemptId,
  readGenerationStartedAt,
  readGenerationSubmittedAt,
  resolveLightboxIndexForSlot,
  useSimulatedProgress,
  useWarnMissingAssetMeta,
} from "./use-warn-missing-asset-meta.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useVideoStarterPresetStore } from "../canvas/use-video-starter-preset-store.js";
import {
  formatTime,
  MEDIA_NODE_RADIUS,
  useAssetMeta,
  useCanvasActive,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
  useGenerating,
  useGeneratingStateApi,
  useMediaPlayback,
} from "./package.jsx";
import {
  GenerationWaitEstimate,
  NodeEmptyState,
  NodeShell,
  normalizeEstimatedWaitSeconds,
  PlaceholderUploadButton,
  QueueGenerationControl,
} from "../canvas/node-shell-inner.jsx";
import {
  GeneratingMediaArea,
  shouldRenderMediaActionSurface,
  VideoPlaceholderIcon,
} from "../canvas/generating-media-area.jsx";
import {
  isGenerationErrorStatus,
  isIdleEmptyVideoNode,
  VIDEO_EMPTY_CARD_SIZE,
} from "../canvas/compute-group-bounds-from-children.js";
import { VideoActionSurface } from "./video-action-surface.jsx";
import {
  appendCanvasFileVersion,
  useFileVersion,
} from "../infra/use-plugin-metadata-store.js";
import { useNodeRename } from "../infra/use-node-rename.js";
import { useCropViewportZoom } from "../canvas/use-crop-viewport-zoom.js";
import {
  getNodeFlowRect,
  useEmitDerivedFromBlob,
} from "../canvas/use-start-crop-from-node.js";
import { useMultiImageActions } from "./use-multi-image-actions.js";
import { useVideoColorAdjust } from "./video-tool-meta.jsx";
import { CanvasImage } from "./canvas-image.jsx";
import {
  emptySizeFromRatio,
  MediaDownloadButton,
  useEmptyAspectRatio,
  useLutBundle,
} from "./base-backend.jsx";
import { useMediaNodeActions } from "../canvas/use-media-node-actions.jsx";
import { useMediaFallbackSize } from "../canvas/reconcile-media-fallback-style.js";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import {
  formatFileSize,
  getFileExtension,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import {
  DEFAULT_WATERMARK_SETTINGS,
  ImageWatermarkPreview,
} from "./layer-decompose-prompt.jsx";
import { VIDEO_CARD_MAX_WIDTH } from "../canvas/is-reexecutable-generation-node.js";
import { WATERMARK_PANEL_WIDTH } from "./storyboard-resize-max-edge.js";
import { WatermarkPopover } from "./watermark-popover.jsx";
import { isMiniMaxH3MaxModelValue } from "../generation/i2-v-aspect-ratio-field.jsx";
import { buildVideoThumbBase } from "./build-video-thumb-base.jsx";
import {
  shouldActivateVideoHover,
  VideoSplitAllButton,
  VideoSplitMainButton,
} from "./canvas-sticker-assets.jsx";
import { VideoPlayer } from "./video-player-inner.jsx";
import { VideoMultiOverlay } from "./video-multi-overlay.jsx";
import {
  isMissingAssetNodeData,
  MEDIA_FALLBACK_NODE_SIZE,
  MediaUnpreviewableFallback,
  MissingAssetCard,
} from "../generation/missing-asset-card.jsx";
import { MediaGenerationErrorOverlay } from "../generation/media-generation-error-overlay.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { CountBadge } from "./compute-multi-image-grid-positions.jsx";
import {
  ROUND_DOTS_POPOVER_GAP_OFFSET,
  RoundDots,
} from "./round-dots-inner.jsx";
function useVideoNodeView(nodeId, data2) {
  const assetsMap = useAssetMetadataStore((s2) => s2.assets);
  const subImages = useSubImages(nodeId);
  const isUserEmpty = useNodeIsEmpty(nodeId);
  const { getNodeById, subscribeGraphChange, promoteSubImageToMain } =
    useCanvasActions();
  const getRoundSnapshot = reactExports.useCallback(
    () => getNodeById(nodeId)?.round,
    [getNodeById, nodeId],
  );
  const mainRound = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getRoundSnapshot,
    getRoundSnapshot,
  );
  const getNodeAssetId = reactExports.useCallback(
    () => getNodeById(nodeId)?.assetId,
    [getNodeById, nodeId],
  );
  const nodeAssetId = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getNodeAssetId,
    getNodeAssetId,
  );
  const view2 = reactExports.useMemo(
    () =>
      buildImageNodeView(
        nodeId,
        data2,
        subImages,
        (id2) => assetsMap.get(id2),
        isUserEmpty,
        mainRound,
        nodeAssetId,
      ),
    [nodeId, data2, subImages, assetsMap, isUserEmpty, mainRound, nodeAssetId],
  );
  const resolveSlotNodeId = reactExports.useCallback(
    (slot) => {
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === slot.id || subAssetId === slot.id;
      });
      return subMatch?.id ?? slot.id;
    },
    [subImages],
  );
  const selectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view2.activeRoundIndex) return;
      const target = view2.rounds[roundIdx]?.[0];
      if (!target) return;
      const targetNodeId = resolveSlotNodeId(target);
      if (!targetNodeId) return;
      promoteSubImageToMain(targetNodeId);
    },
    [
      view2.activeRoundIndex,
      view2.rounds,
      resolveSlotNodeId,
      promoteSubImageToMain,
    ],
  );
  const selectSlot = reactExports.useCallback(
    (slotIdx) => {
      if (slotIdx <= 0) return;
      const target = view2.slots[slotIdx];
      if (!target || target.status !== "ready") return;
      const targetNodeId = resolveSlotNodeId(target);
      if (!targetNodeId) return;
      promoteSubImageToMain(targetNodeId, {
        persistMode: "request",
      });
    },
    [view2.slots, resolveSlotNodeId, promoteSubImageToMain],
  );
  return reactExports.useMemo(
    () => ({
      view: view2,
      slots: view2.slots,
      roundCount: view2.rounds.length,
      activeRoundIndex: view2.activeRoundIndex,
      selectRound,
      selectSlot,
    }),
    [view2, selectRound, selectSlot],
  );
}
function VideoStarterIcon({ presetId }) {
  const firstLastFrame =
    presetId === "first-last-frame" || presetId === "h3-max-first-last-frame";
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
  const markPresetApplied = useVideoStarterPresetStore(
    (state2) => state2.markApplied,
  );
  const rememberPresetRefNodes = useVideoStarterPresetStore(
    (state2) => state2.rememberRefNodes,
  );
  const takePresetRefNodes = useVideoStarterPresetStore(
    (state2) => state2.takeRefNodes,
  );
  const [applying, setApplying] = reactExports.useState(false);
  const matchingPresets = videoStarterPresets?.filter((preset2) => {
    if (preset2.modelId && modelId && preset2.modelId !== modelId) return false;
    if (H3_MAX_MODEL_IDS.has(modelId ?? "")) {
      return H3_MAX_STARTER_MODES.has(preset2.params.image_mode ?? "");
    }
    return true;
  });
  const presets2 =
    matchingPresets && matchingPresets.length > 0 ? matchingPresets : void 0;
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
function shouldDelayVideoPendingPresentation(
  liveGenerating,
  persistedGenerating,
) {
  return (
    liveGenerating?.phase === "generating" &&
    persistedGenerating?.phase === "pending"
  );
}
function resolveVideoGeneratingPresentation(
  liveGenerating,
  persistedGenerating,
  pendingPresentationDelayElapsed,
) {
  if (persistedGenerating?.phase === "pending") {
    if (
      liveGenerating?.phase === "generating" &&
      !pendingPresentationDelayElapsed
    ) {
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
  if (
    !mime ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
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
  if (audioDestination)
    tracks.push(...audioDestination.stream.getAudioTracks());
  const outputStream = new MediaStream(tracks);
  const recorder = new MediaRecorder(outputStream, {
    mimeType: mime.mimeType,
    videoBitsPerSecond: estimateWatermarkVideoBitrate(
      canvas.width,
      canvas.height,
    ),
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
    recorder.addEventListener("error", () =>
      reject(new Error("video-watermark: encoding failed")),
    );
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
      video.addEventListener(
        "error",
        () => reject(new Error("video-watermark: playback failed")),
        {
          once: true,
        },
      );
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
      error instanceof Error &&
      error.message === "video-watermark: source load failed";
    const fallbackUrl = resolveVideoPlaybackUrl(sourceUrl);
    if (!isSourceDecodeFailure || fallbackUrl === sourceUrl) throw error;
    return renderWatermarkedVideoSource(fallbackUrl, settings);
  }
}
const MEDIA_OVERLAY_EXIT_ANIMATION_MS = 160;
const VIDEO_ACTION_SURFACE_ACTIVATION_DELAY_MS = 80;
export function VideoNodeInner({
  id: id2,
  data: data2,
  selected: selected2,
  width,
  height,
}) {
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
  const handleI2VSelectedModelChange = reactExports.useCallback(
    (modelId, modelName) => {
      if (!modelId || !modelName) return;
      setEmptyStarterModel({
        id: modelId,
        name: modelName,
      });
    },
    [],
  );
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
  const {
    view: videoView,
    roundCount,
    activeRoundIndex,
  } = useVideoNodeView(id2, data2);
  const subVideos = useSubImages(id2);
  const primaryAssetKey = videoView.primary?.id ?? id2;
  const meta2 = useAssetMeta(primaryAssetKey);
  const fileVersion = useFileVersion(meta2?.path);
  const versionedUrl = meta2?.url
    ? appendCanvasFileVersion(meta2.url, fileVersion)
    : void 0;
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
    if (persisted?.status !== "pending" && persisted?.status !== "generating")
      return void 0;
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
      modelId:
        typeof persisted.model_id === "string" ? persisted.model_id : void 0,
      phase: persisted.status,
      prevUrl: meta2?.url,
      estimatedRemainingWaitSeconds,
      generationStartedAt: readGenerationStartedAt(persisted),
    };
  }, [data2, meta2?.url, t2]);
  const persistedErrorMessage =
    isGenerationErrorStatus(data2.status) &&
    typeof data2.errorMessage === "string"
      ? data2.errorMessage
      : void 0;
  const persistedErrorReason =
    isGenerationErrorStatus(data2.status) &&
    typeof data2.errorReason === "string"
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
  const isH3MaxGenerating = [generating?.modelId, generating?.model].some(
    (value) => isMiniMaxH3MaxModelValue(value),
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
  }, [
    isGenerating,
    meta2?.url,
    generating?.prevUrl,
    id2,
    generatingStateStore,
  ]);
  const generationErrorMessage = isGenerating
    ? generating?.error
    : persistedErrorMessage;
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
  }, [
    isErrorGenerating,
    isEmptyForSync,
    targetEmptyWidth,
    targetEmptyHeight,
    id2,
    reactFlow,
  ]);
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
    fallbackPath:
      typeof data2.path === "string" ? data2.path || void 0 : void 0,
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
  const resolvedThumbnailUrl = resolveVideoThumbnailUrl(
    thumbnailBase,
    thumbnailState,
  );
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
  }, [
    nodeWidth,
    meta2?.width,
    meta2?.height,
    meta2?.previewWidth,
    meta2?.previewHeight,
  ]);
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
  }, [
    videoView.rounds,
    videoView.primary?.id,
    displayMeta,
    assetMetadataStore,
    subVideos,
  ]);
  const lightboxInitialIndex = reactExports.useMemo(() => {
    if (lightboxItems.length === 0) return 0;
    return resolveVideoLightboxIndexForSlot(
      lightboxItems,
      videoView.primary,
      0,
    );
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
        const nextRound =
          (videoView.activeRoundIndex + 1) % videoView.rounds.length;
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
  const expandedMediaOverlay =
    videoView.isMulti && isOverlayOpen && !isEmpty2 && !isFallback;
  const isPlaying = useMediaPlayback((s2) => s2.playingId === id2);
  const videoDurationLabel =
    typeof meta2?.durationSec === "number" &&
    Number.isFinite(meta2.durationSec) &&
    meta2.durationSec > 0
      ? formatTime(meta2.durationSec, true)
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
  const isExpandedMediaOverlayVisible =
    expandedMediaOverlay || keepExpandedMediaOverlayMounted;
  const isExpandedMediaOverlayClosing =
    keepExpandedMediaOverlayMounted && !expandedMediaOverlay;
  if (isMissingAssetNodeData(data2)) {
    return (
      <MissingAssetCard
        nodeId={id2}
        name={typeof data2?.name === "string" ? data2.name : void 0}
      />
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
      (slot, index2) =>
        index2 !== videoView.primaryIndex && slot.status === "ready",
    );
  const showVideoSplitMain =
    videoView.rounds.length > 1 &&
    !videoView.hasLoading &&
    !isEmpty2 &&
    !isFallback;
  const showCollapsedVideoSplitRow =
    !isExpandedMediaOverlayVisible && (showVideoSplitAll || showVideoSplitMain);
  const showCollapsedVideoActionRow =
    !isExpandedMediaOverlayVisible &&
    (showVideoCountBadge || showCollapsedVideoSplitRow);
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
      onDoubleClick={
        isExpandedMediaOverlayVisible || isFallback ? void 0 : openLightbox
      }
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
            videoView.isMulti && !isExpandedMediaOverlayVisible
              ? "canvas-media-stack"
              : void 0
          }
        >
          {generationErrorMessage ? (
            <MediaGenerationErrorOverlay
              nodeId={id2}
              nodeType="video"
              message={generationErrorMessage}
              errorReason={
                isGenerating ? generating?.errorReason : persistedErrorReason
              }
              retryPayload={
                isGenerating ? generating?.retryPayload : persistedRetryPayload
              }
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
              extension={
                getFileExtension(meta2?.path) ?? getFileExtension(meta2?.name)
              }
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
                    <VideoSplitAllButton
                      onSplitAll={handleSplitAll}
                      disabled={false}
                    />
                  )}
                  {showVideoSplitMain && (
                    <VideoSplitMainButton
                      onSplitMain={handleSplitMain}
                      disabled={false}
                    />
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
                        <VideoSplitAllButton
                          onSplitAll={handleSplitAll}
                          disabled={false}
                        />
                      )}
                      {showVideoSplitMain && (
                        <VideoSplitMainButton
                          onSplitMain={handleSplitMain}
                          disabled={false}
                        />
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
          <RoundDots
            count={roundCount}
            activeIdx={activeRoundIndex}
            onSelect={handleSelectRound}
          />
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
          selected={
            selectionActionSurfaceReady && !isExpandedMediaOverlayVisible
          }
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
