// panorama-node.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Grid2X2, Grid3X3, Power } from "./lucide-icon-wraps.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import { useReactFlow } from "../vendor-fork/xyflow/react/index.js";
import { dedupedToast, useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { NodeResizeFrame } from "../infra/node-resize-frame-inner.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import {
  Camera,
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { DEFAULT_WORKFLOW_NODE_SPACING } from "../canvas/ungroup-in-canvas.js";
import { findFreePositionFromAnchor } from "../canvas/find-free-position-from-anchor.js";
import {
  AddToChatIcon,
  FullscreenIcon,
  PanoramaIcon,
  useCanvasNodeIsDragging,
} from "../canvas/fullscreen-icon.jsx";
import { GeneratingMediaArea } from "../canvas/generating-media-area.jsx";
import {
  FILE_PREVIEW_MIN_SIZE,
  FILE_PREVIEW_SIZE,
} from "../canvas/is-reexecutable-generation-node.js";
import { usePopoverCloseWithDeselect } from "../generation/resolve-reference-texts.js";
import {
  PANORAMA_EMPTY_NODE_SIZE,
  PANORAMA_VIEWER_NODE_SIZE,
  panoramaCleanPreviewUrl,
  panoramaGenerationPresentationKey,
  panoramaViewerNodeSize,
  resolvePanoramaGenerationPresentation,
} from "./resolve-panorama-generation-presentation.js";
import { CanvasImage } from "./canvas-image.jsx";
import { useSimulatedProgress } from "./use-warn-missing-asset-meta.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { CAPTURE_PLACEMENT_RESERVATION_MS } from "../infra/capture-placement-reservation-ms.js";
import { NodeShell, useAddToChat } from "../canvas/node-shell-inner.jsx";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";
import { MediaGenerationErrorOverlay } from "../generation/media-generation-error-overlay.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { PanoramaViewer } from "./panorama-viewer.jsx";
import { PanoramaGenerationPanel } from "./panorama-generation-panel.jsx";
export function PanoramaNode({
  id: panoramaNodeId,
  data,
  selected,
  width,
  height,
}) {
  const { t } = useTranslation();
  const reactFlow = useReactFlow();
  const {
    pickAsset,
    cropImage,
    cropSplit,
    submitImg2Image,
    getLastUsedModelParams,
    onAddToChat,
  } = useCanvasBridge();
  const {
    getIncomingSourceIds,
    getOutgoingTargetIds,
    subscribeGraphChange,
    subscribeIncomingChange,
    ensureDerivationEdge,
    getNodeById,
    focusDerivedNode,
    mergeNodeDataSilent,
    setNodeHidden,
    resizeNode,
  } = useCanvasActions();
  const panoramaData = data;
  const generationPending = panoramaData?.panoramaGenerationPending === true;
  const persistedGenerationActive =
    panoramaData?.panoramaGenerationActive === true;
  const panoramaGenerationStartedAt =
    typeof panoramaData?.panoramaGenerationStartedAt === "string"
      ? panoramaData.panoramaGenerationStartedAt
      : void 0;
  const persistedGeneratedSourceNodeId =
    typeof panoramaData?.panoramaGeneratedSourceNodeId === "string"
      ? panoramaData.panoramaGeneratedSourceNodeId
      : "";
  const [generatedSourceNodeId, setGeneratedSourceNodeId] =
    reactExports.useState(persistedGeneratedSourceNodeId);
  const generatedSourceMeta = useAssetMeta(generatedSourceNodeId);
  const [incomingSourceIds, setIncomingSourceIds] = reactExports.useState(() =>
    getIncomingSourceIds(panoramaNodeId),
  );
  const sourceNodeId = useAssetMetadataStore((state) => {
    if (
      generatedSourceNodeId &&
      incomingSourceIds.includes(generatedSourceNodeId) &&
      state.assets.get(generatedSourceNodeId)?.type === "image"
    ) {
      return generatedSourceNodeId;
    }
    return (
      incomingSourceIds.find(
        (sourceId) => state.assets.get(sourceId)?.type === "image",
      ) ?? ""
    );
  });
  const sourceMeta = useAssetMeta(sourceNodeId);
  const upstreamReferencesJson = useAssetMetadataStore((state) =>
    JSON.stringify(
      incomingSourceIds.flatMap((incomingId) => {
        if (incomingId === generatedSourceNodeId) return [];
        const meta = state.assets.get(incomingId);
        return meta?.type === "image" && meta.path && meta.url
          ? [
              {
                nodeId: incomingId,
                path: meta.path,
                url: meta.url,
                name: meta.name,
              },
            ]
          : [];
      }),
    ),
  );
  const upstreamReferences = reactExports.useMemo(
    () => JSON.parse(upstreamReferencesJson),
    [upstreamReferencesJson],
  );
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(panoramaNodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0
      ? height
      : FILE_PREVIEW_SIZE.height,
  );
  const [captureRequest, setCaptureRequest] = reactExports.useState();
  const [fullscreenRequestId, setFullscreenRequestId] =
    reactExports.useState(0);
  const [showGenerationPanel, setShowGenerationPanel] =
    reactExports.useState(false);
  const [generationActive, setGenerationActive] = reactExports.useState(
    persistedGenerationActive,
  );
  const [panoramaPreview, setPanoramaPreview] = reactExports.useState(false);
  const [staticCaptureActive, setStaticCaptureActive] =
    reactExports.useState(false);
  const [naturalSourceSize, setNaturalSourceSize] = reactExports.useState(null);
  const lastAspectSyncKeyRef = reactExports.useRef("");
  const captureRequestSequenceRef = reactExports.useRef(0);
  const capturePlacementReservationsRef = reactExports.useRef([]);
  const handleGenerationPanelClose = usePopoverCloseWithDeselect(
    panoramaNodeId,
    setShowGenerationPanel,
  );
  const getGeneratedSourcePresentationKey = reactExports.useCallback(
    () =>
      panoramaGenerationPresentationKey(
        generatedSourceNodeId ? getNodeById(generatedSourceNodeId) : void 0,
      ),
    [generatedSourceNodeId, getNodeById],
  );
  reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getGeneratedSourcePresentationKey,
    getGeneratedSourcePresentationKey,
  );
  const generatedSourceNode = generatedSourceNodeId
    ? getNodeById(generatedSourceNodeId)
    : void 0;
  const generationPresentation =
    resolvePanoramaGenerationPresentation(generatedSourceNode);
  const generationError =
    generationPresentation.status === "error" ? generationPresentation : void 0;
  const hasGenerationError = generationError !== void 0;
  const generationResourceLoading = generationPresentation.status === "loading";
  const showGenerationState =
    !hasGenerationError && (generationActive || generationResourceLoading);
  const generationProgress = useSimulatedProgress(
    showGenerationState,
    "image",
    panoramaGenerationStartedAt,
  );
  const sourceWidth =
    sourceMeta?.width ??
    (naturalSourceSize && naturalSourceSize.src === sourceMeta?.url
      ? naturalSourceSize.width
      : void 0);
  const sourceHeight =
    sourceMeta?.height ??
    (naturalSourceSize && naturalSourceSize.src === sourceMeta?.url
      ? naturalSourceSize.height
      : void 0);
  const displaySourceUrl =
    generatedSourceNodeId && sourceNodeId === generatedSourceNodeId
      ? panoramaCleanPreviewUrl(sourceMeta?.url ?? "")
      : (sourceMeta?.url ?? "");
  const sourceAspectRatio =
    sourceWidth && sourceHeight && sourceWidth > 0 && sourceHeight > 0
      ? sourceWidth / sourceHeight
      : PANORAMA_VIEWER_NODE_SIZE.width / PANORAMA_VIEWER_NODE_SIZE.height;
  const flatImageSize = reactExports.useMemo(() => {
    const boxAspect = previewWidth / Math.max(1, previewHeight);
    if (boxAspect > sourceAspectRatio) {
      return {
        width: Math.round(previewHeight * sourceAspectRatio),
        height: previewHeight,
      };
    }
    return {
      width: previewWidth,
      height: Math.round(previewWidth / sourceAspectRatio),
    };
  }, [previewHeight, previewWidth, sourceAspectRatio]);
  const discardPendingCurrentCapture = reactExports.useCallback(() => {
    setCaptureRequest((current) =>
      current?.count === 1 ? void 0 : current,
    );
  }, []);
  const enterPanoramaPreview = reactExports.useCallback(() => {
    discardPendingCurrentCapture();
    setPanoramaPreview(true);
  }, [discardPendingCurrentCapture]);
  const exitPanoramaPreview = reactExports.useCallback(() => {
    discardPendingCurrentCapture();
    setPanoramaPreview(false);
  }, [discardPendingCurrentCapture]);
  reactExports.useEffect(() => {
    if (persistedGenerationActive) setGenerationActive(true);
  }, [persistedGenerationActive]);
  reactExports.useEffect(() => {
    if (persistedGeneratedSourceNodeId) {
      setGeneratedSourceNodeId(persistedGeneratedSourceNodeId);
    }
  }, [persistedGeneratedSourceNodeId]);
  reactExports.useEffect(() => {
    if (!hasGenerationError) return;
    setGenerationActive(false);
    mergeNodeDataSilent(panoramaNodeId, {
      panoramaGenerationActive: void 0,
      panoramaGenerationStartedAt: void 0,
    });
  }, [hasGenerationError, panoramaNodeId, mergeNodeDataSilent]);
  reactExports.useEffect(() => {
    const syncSources = () => {
      const next = getIncomingSourceIds(panoramaNodeId);
      setIncomingSourceIds((current) =>
        current.length === next.length &&
        current.every((sourceId, index) => sourceId === next[index])
          ? current
          : next,
      );
    };
    syncSources();
    return subscribeIncomingChange(panoramaNodeId, syncSources);
  }, [getIncomingSourceIds, panoramaNodeId, subscribeIncomingChange]);
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setPreviewWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setPreviewHeight(height);
  }, [height]);
  reactExports.useLayoutEffect(() => {
    if (
      !generationPending ||
      (previewWidth === PANORAMA_EMPTY_NODE_SIZE.width &&
        previewHeight === PANORAMA_EMPTY_NODE_SIZE.height)
    )
      return;
    resizeNode(
      panoramaNodeId,
      PANORAMA_EMPTY_NODE_SIZE.width,
      PANORAMA_EMPTY_NODE_SIZE.height,
    );
  }, [generationPending, panoramaNodeId, previewHeight, previewWidth, resizeNode]);
  reactExports.useEffect(() => {
    const canOpenGenerationPanel =
      !hasGenerationError && !showGenerationState && generationPending;
    if (!canOpenGenerationPanel) {
      setShowGenerationPanel(false);
      return;
    }
    if (!selected || isMultiSelect || isBoxSelecting || showGenerationPanel)
      return;
    setShowGenerationPanel(true);
  }, [
    generationPending,
    hasGenerationError,
    isBoxSelecting,
    isMultiSelect,
    selected,
    showGenerationState,
    showGenerationPanel,
  ]);
  reactExports.useLayoutEffect(() => {
    const generationCompleted =
      generationActive && !!generatedSourceNodeId && !!generatedSourceMeta?.url;
    if (
      !sourceMeta?.url ||
      ((generationPending || generationActive) && !generationCompleted)
    )
      return;
    const aspectSyncKey = `${sourceNodeId}:${sourceMeta.url}:${sourceWidth ?? "default"}x${sourceHeight ?? "default"}`;
    if (!generationCompleted && lastAspectSyncKeyRef.current === aspectSyncKey)
      return;
    lastAspectSyncKeyRef.current = aspectSyncKey;
    const target = panoramaViewerNodeSize(
      sourceWidth,
      sourceHeight,
      generationCompleted ? PANORAMA_VIEWER_NODE_SIZE.width : previewWidth,
    );
    if (previewWidth !== target.width || previewHeight !== target.height) {
      resizeNode(panoramaNodeId, target.width, target.height);
    }
    if (!generationCompleted) return;
    setGenerationActive(false);
    mergeNodeDataSilent(panoramaNodeId, {
      panoramaGenerationActive: void 0,
      panoramaGenerationPending: void 0,
      panoramaGenerationStartedAt: void 0,
    });
  }, [
    generatedSourceMeta?.url,
    generatedSourceNodeId,
    generationActive,
    generationPending,
    panoramaNodeId,
    mergeNodeDataSilent,
    previewHeight,
    previewWidth,
    resizeNode,
    sourceHeight,
    sourceMeta?.url,
    sourceNodeId,
    sourceWidth,
  ]);
  const handleResize = reactExports.useCallback((nextWidth, nextHeight) => {
    setPreviewWidth(nextWidth);
    setPreviewHeight(nextHeight);
  }, []);
  const handlePickGenerateReferences = reactExports.useCallback(
    async (remaining) => {
      if (!pickAsset || remaining <= 0) return [];
      try {
        const picked = await pickAsset({
          type: "image",
          multiple: true,
          maxCount: remaining,
        });
        return (picked ?? []).flatMap((resource) =>
          resource.path && resource.url
            ? [
                {
                  nodeId: resource.nodeId ?? resource.path,
                  path: resource.path,
                  url: resource.url,
                  name: resource.name,
                },
              ]
            : [],
        );
      } catch (error) {
        if (error?.code !== "picker_busy") {
          console.warn("[panorama] Reference picker failed:", error);
        }
        return [];
      }
    },
    [pickAsset],
  );
  const handleGenerate = reactExports.useCallback(
    async (params) => {
      if (!submitImg2Image) return;
      const previousGeneratedSourceNodeId = generatedSourceNodeId;
      const generationStartedAt = new Date().toISOString();
      setPanoramaPreview(false);
      setGenerationActive(true);
      setGeneratedSourceNodeId("");
      setShowGenerationPanel(false);
      mergeNodeDataSilent(panoramaNodeId, {
        panoramaGenerationActive: true,
        panoramaGenerationStartedAt: generationStartedAt,
      });
      const generationAnchorIds = [panoramaNodeId, ...getIncomingSourceIds(panoramaNodeId)].filter(
        (nodeId, index, allAnchorIds) => allAnchorIds.indexOf(nodeId) === index,
      );
      const beforeTargets = new Set(
        generationAnchorIds.flatMap((anchorId) =>
          getOutgoingTargetIds(anchorId),
        ),
      );
      let finished = false;
      let unsubscribe = () => {};
      let timeout = 0;
      const adoptGeneratedImage = () => {
        if (finished) return;
        const targetId = generationAnchorIds
          .flatMap((anchorId) => getOutgoingTargetIds(anchorId))
          .find((candidate) => !beforeTargets.has(candidate));
        if (!targetId) return;
        const targetNode = getNodeById(targetId);
        const targetData = targetNode?.data;
        const isImageGenerationTarget =
          targetNode?.type === "image" ||
          (targetNode?.type === "placeholder" &&
            targetData?.mediaType === "image");
        if (!isImageGenerationTarget) return;
        finished = true;
        unsubscribe();
        window.clearTimeout(timeout);
        setNodeHidden?.(targetId, true);
        ensureDerivationEdge(targetId, panoramaNodeId);
        setGeneratedSourceNodeId(targetId);
        mergeNodeDataSilent(panoramaNodeId, {
          panoramaGeneratedSourceNodeId: targetId,
        });
      };
      unsubscribe = subscribeGraphChange(adoptGeneratedImage);
      timeout = window.setTimeout(() => {
        finished = true;
        unsubscribe();
      }, 12e4);
      const lastUsed = getLastUsedModelParams?.("i2i");
      const scene = params.prompt || "an immersive 360 degree environment";
      const panoramaPrompt = `Generate a 360-degree equirectangular panorama with seamless left and right edges, full horizontal 360° and vertical 180°, including zenith and nadir. ${scene}`;
      try {
        await submitImg2Image(
          panoramaNodeId,
          panoramaPrompt,
          params.modelId,
          {
            ...(lastUsed?.params ?? {}),
            aspect_ratio: "2:1",
            resolution: params.resolution,
            quality: params.quality,
          },
          params.references.map((reference) => reference.path),
          void 0,
          params.count,
        );
        adoptGeneratedImage();
      } catch (error) {
        finished = true;
        unsubscribe();
        window.clearTimeout(timeout);
        setGenerationActive(false);
        setGeneratedSourceNodeId(previousGeneratedSourceNodeId);
        mergeNodeDataSilent(panoramaNodeId, {
          panoramaGenerationActive: void 0,
          panoramaGenerationStartedAt: void 0,
        });
        throw error;
      }
    },
    [
      ensureDerivationEdge,
      getIncomingSourceIds,
      getLastUsedModelParams,
      getNodeById,
      getOutgoingTargetIds,
      generatedSourceNodeId,
      panoramaNodeId,
      mergeNodeDataSilent,
      setNodeHidden,
      submitImg2Image,
      subscribeGraphChange,
    ],
  );
  const handleCapture = reactExports.useCallback(
    async (items, label, options) => {
      if (items.length === 0) return;
      if (items.length > 1 && cropSplit) {
        await cropSplit(panoramaNodeId, items, label, {
          focusResult: !panoramaPreview,
        });
        return;
      }
      if (!cropImage) return;
      try {
        const nodes = reactFlow.getNodes();
        const nodeIds = new Set(nodes.map((node) => node.id));
        const now = Date.now();
        const pendingReservations =
          capturePlacementReservationsRef.current.filter(
            (reservation) =>
              !nodeIds.has(reservation.nodeId) &&
              now - reservation.createdAt < CAPTURE_PLACEMENT_RESERVATION_MS,
          );
        capturePlacementReservationsRef.current = pendingReservations;
        const edges = reactFlow.getEdges();
        const captureTargetIds = new Set(
          edges
            .filter(
              (edge) =>
                edge.source === panoramaNodeId &&
                (edge.type ?? "derivation") === "derivation",
            )
            .map((edge) => edge.target),
        );
        const occupied = pendingReservations.map(
          ({ x, y, w: reservationWidth, h: reservationHeight }) => ({
            x,
            y,
            w: reservationWidth,
            h: reservationHeight,
          }),
        );
        for (const node of nodes) {
          if (!captureTargetIds.has(node.id) || node.parentId) continue;
          const internal = reactFlow.getInternalNode(node.id);
          const absolute =
            internal?.internals.positionAbsolute ?? node.position;
          occupied.push({
            x: absolute.x,
            y: absolute.y,
            w: node.measured?.width ?? previewWidth,
            h: node.measured?.height ?? previewHeight,
          });
        }
        const sourceInternal = reactFlow.getInternalNode(panoramaNodeId);
        const sourceNode = sourceInternal ?? reactFlow.getNode(panoramaNodeId);
        const sourcePosition = sourceInternal?.internals.positionAbsolute ??
          sourceNode?.position ?? {
            x: 0,
            y: 0,
          };
        const sourceNodeWidth = sourceNode?.measured?.width ?? previewWidth;
        const desired = {
          x: sourcePosition.x + sourceNodeWidth + DEFAULT_WORKFLOW_NODE_SPACING,
          y: sourcePosition.y,
        };
        const position = findFreePositionFromAnchor(
          desired,
          {
            width: previewWidth,
            height: previewHeight,
          },
          occupied,
          {
            shiftAxis: "y",
          },
        );
        const outputNodeId = await cropImage(
          panoramaNodeId,
          items[0].blob,
          items[0].filename,
          position,
        );
        if (outputNodeId) {
          capturePlacementReservationsRef.current.push({
            nodeId: outputNodeId,
            createdAt: Date.now(),
            x: position.x,
            y: position.y,
            w: previewWidth,
            h: previewHeight,
          });
        }
        if (!options?.fullscreen) focusDerivedNode(outputNodeId);
        if (options?.fullscreen) {
          dedupedToast.success(
            t("canvas.panorama.captureCreated", "生图节点创建完成"),
            {
              duration: 3e3,
              closeButton: false,
              position: "top-center",
            },
          );
        }
      } catch (error) {
        if (options?.fullscreen) {
          dedupedToast.error(
            t("canvas.panorama.captureFailed", "全景截图创建失败"),
            {
              duration: 4e3,
              closeButton: false,
              position: "top-center",
            },
          );
        }
        throw error;
      }
    },
    [
      cropImage,
      cropSplit,
      focusDerivedNode,
      panoramaNodeId,
      panoramaPreview,
      previewHeight,
      previewWidth,
      reactFlow,
      t,
    ],
  );
  const handleAddToChat = useAddToChat(panoramaNodeId, sourceMeta, onAddToChat);
  const requestCapture = reactExports.useCallback(
    (count) => {
      if (!panoramaPreview) setStaticCaptureActive(true);
      captureRequestSequenceRef.current += 1;
      setCaptureRequest({
        sequence: captureRequestSequenceRef.current,
        count,
      });
    },
    [panoramaPreview],
  );
  const requestCurrentCapture = reactExports.useCallback(
    () => requestCapture(1),
    [requestCapture],
  );
  const handleCaptureRequestSettled = reactExports.useCallback((sequence) => {
    if (captureRequestSequenceRef.current !== sequence) return;
    setCaptureRequest(void 0);
    setStaticCaptureActive(false);
  }, []);
  const requestFullscreen = reactExports.useCallback(() => {
    enterPanoramaPreview();
    setFullscreenRequestId((current) => current + 1);
  }, [enterPanoramaPreview]);
  const panoramaToolbarItems = reactExports.useMemo(
    () => [
      {
        id: "panorama-capture",
        label: t("canvas.panorama.capture", "截取当前视角"),
        icon: <Camera size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: requestCurrentCapture,
      },
      {
        id: "panorama-capture-4",
        label: t("canvas.panorama.capture4", "4 大视角截图"),
        icon: <Grid2X2 size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: () => requestCapture(4),
      },
      {
        id: "panorama-capture-12",
        label: t("canvas.panorama.capture12", "12 大视角截图"),
        icon: <Grid3X3 size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: () => requestCapture(12),
      },
      {
        id: "add-to-chat",
        label: t("canvas.addToChat"),
        icon: <AddToChatIcon />,
        separator: true,
        disabled: !sourceMeta?.path || !onAddToChat,
        onClick: handleAddToChat,
      },
      {
        id: "fullscreen",
        label: t("canvas.fullscreen"),
        icon: <FullscreenIcon />,
        onClick: requestFullscreen,
      },
    ],
    [
      handleAddToChat,
      onAddToChat,
      requestCapture,
      requestCurrentCapture,
      requestFullscreen,
      sourceMeta?.path,
      t,
    ],
  );
  const flatToolbarItems = reactExports.useMemo(
    () => panoramaToolbarItems.filter((item) => item.id !== "panorama-capture"),
    [panoramaToolbarItems],
  );
  const interactive =
    !!selected && !isMultiSelect && !isDragging && !isBoxSelecting;
  const previewInteractive =
    panoramaPreview && !isMultiSelect && !isDragging && !isBoxSelecting;
  const previewToggleLabel = panoramaPreview
    ? t("canvas.panorama.exitPreview", "退出全景模式")
    : t("canvas.panorama.enterPreview", "进入全景模式");
  return (
    <NodeShell
      id={panoramaNodeId}
      width={previewWidth}
      dataActionUiId="canvas.panorama-node"
      dataState={
        hasGenerationError
          ? "error"
          : showGenerationState
            ? "generating"
            : generationPending
              ? "empty"
              : sourceMeta?.url
                ? "generated"
                : "generating"
      }
    >
      <NodeHeader
        nodeType="file"
        name={t("canvas.panorama.title", "全景图")}
        icon={<PanoramaIcon size={18} />}
        selected={selected}
        maxWidth={previewWidth}
      />
      <NodeBody
        width={previewWidth}
        height={previewHeight}
        selected={selected}
        variant="panel"
        panelPadding={0}
        className="bg-[var(--canvas-node-bg)]"
      >
        {generationError ? (
          <MediaGenerationErrorOverlay
            nodeId={generatedSourceNodeId}
            nodeType="image"
            message={generationError.errorMessage}
            errorReason={generationError.errorReason}
            retryPayload={generationError.retryPayload}
            recoverable={generationError.errorStatus === "recoverable_error"}
            uncertain={generationError.errorStatus === "status_unknown"}
            errorSource="placeholder"
          />
        ) : showGenerationState ? (
          <GeneratingMediaArea
            width="100%"
            height="100%"
            radius={20}
            icon={<PanoramaIcon size={54} />}
            progress={generationProgress}
            className="text-[var(--canvas-controls-text-muted)]"
          />
        ) : generationPending ? (
          <div className="flex size-full items-center justify-center bg-[var(--canvas-node-bg)] text-[var(--canvas-controls-text-muted)]">
            <PanoramaIcon size={54} />
          </div>
        ) : sourceMeta?.type === "image" && sourceMeta.url ? (
          <div className="group/panorama relative flex size-full items-center justify-center overflow-hidden bg-[var(--canvas-node-bg)]">
            {(panoramaPreview || staticCaptureActive) && (
              <div
                className={
                  panoramaPreview
                    ? "size-full"
                    : "pointer-events-none invisible absolute inset-0"
                }
              >
                <PanoramaViewer
                  src={displaySourceUrl}
                  interactive={previewInteractive}
                  emptyLabel={t(
                    "canvas.panorama.empty",
                    "连接一张全景图片后即可拖拽查看",
                  )}
                  loadingLabel={t(
                    "canvas.panorama.loading",
                    "正在加载全景图…",
                  )}
                  errorLabel={t("canvas.panorama.error", "全景图加载失败")}
                  captureName={sourceMeta.name}
                  captureRequest={captureRequest}
                  fullscreenRequestId={fullscreenRequestId}
                  onExitPreview={exitPanoramaPreview}
                  onRequestCaptureCurrent={requestCurrentCapture}
                  onCapture={handleCapture}
                  onCaptureRequestSettled={handleCaptureRequestSettled}
                />
              </div>
            )}
            {!panoramaPreview && (
              // biome-ignore lint/a11y/noStaticElementInteractions: double-click is an optional pointer shortcut; the adjacent preview button is the accessible primary action.
              <div
                className="flex size-full items-center justify-center"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  enterPanoramaPreview();
                }}
              >
                <CanvasImage
                  src={displaySourceUrl}
                  nodeId={panoramaNodeId}
                  width={flatImageSize.width}
                  height={flatImageSize.height}
                  alt={sourceMeta.name}
                  onNaturalSize={(naturalWidth, naturalHeight) => {
                    setNaturalSourceSize((current) =>
                      current?.src === sourceMeta.url &&
                      current.width === naturalWidth &&
                      current.height === naturalHeight
                        ? current
                        : {
                            src: sourceMeta.url,
                            width: naturalWidth,
                            height: naturalHeight,
                          },
                    );
                  }}
                />
              </div>
            )}
            <div
              className={`absolute right-3 top-3 z-[8] origin-top-right scale-[1.125] transition-opacity duration-150 ${panoramaPreview || selected ? "opacity-100" : "opacity-0 group-hover/panorama:opacity-100"}`}
            >
              <TooltipProvider delay={150} closeDelay={0}>
                <Tooltip content={previewToggleLabel} side="top" sideOffset={8}>
                  <button
                    type="button"
                    className="nodrag nopan nowheel flex size-9 items-center justify-center rounded-[10px] bg-black/65 text-white shadow-md backdrop-blur-md transition-[background-color,transform] duration-150 hover:scale-[1.03] hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (panoramaPreview) exitPanoramaPreview();
                      else enterPanoramaPreview();
                    }}
                    aria-label={previewToggleLabel}
                    aria-pressed={panoramaPreview}
                    data-action-ui-id="canvas.panorama.preview-toggle"
                  >
                    {panoramaPreview ? (
                      <Power size={19} strokeWidth={1.8} />
                    ) : (
                      <PanoramaIcon size={20} />
                    )}
                  </button>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--canvas-node-bg)] px-6 text-center text-[13px] text-[var(--canvas-empty-guidance-fg)]">
            {t("canvas.panorama.empty", "连接一张全景图片后即可拖拽查看")}
          </div>
        )}
      </NodeBody>
      {!hasGenerationError &&
        !showGenerationState &&
        generationPending &&
        selected &&
        showGenerationPanel && (
          <PanoramaGenerationPanel
            presentation="composer"
            onClose={handleGenerationPanelClose}
            upstreamGenerateReferences={upstreamReferences}
            onPickGenerateReferences={handlePickGenerateReferences}
            onGenerate={handleGenerate}
          />
        )}
      {interactive && !generationPending && sourceMeta?.url && (
        <NodeToolbar
          items={panoramaPreview ? panoramaToolbarItems : flatToolbarItems}
          visible={true}
        />
      )}
      {selected && (
        <NodeResizeFrame
          nodeId={panoramaNodeId}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          keepAspectRatio={!generationPending && !!sourceMeta?.url}
          onResize={handleResize}
        />
      )}
      <NodeHandles
        nodeId={panoramaNodeId}
        selected={!!selected}
        sourcePosition={Position.Left}
      />
    </NodeShell>
  );
}
