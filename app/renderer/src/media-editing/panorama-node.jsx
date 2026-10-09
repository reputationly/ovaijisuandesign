// panorama-node.jsx
import { useTranslation, useReactFlow, reactExports, useAssetMetadataStore, dedupedToast, Grid2X2, Grid3X3, Power, Position } from "../vendor.js";
import { NodeResizeFrame } from "../infra/create-html-iframe-pool-store.jsx";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.jsx";
import { useCanvasBridge, useCanvasActions, useAssetMeta, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, Camera } from "./parse-item.jsx";
import { DEFAULT_WORKFLOW_NODE_SPACING } from "../canvas/reconcile-group-geometry-for-mode.js";
import { findFreePositionFromAnchor } from "../canvas/resolve-derived-collision.js";
import {
  useCanvasNodeIsDragging,
  AddToChatIcon,
  FullscreenIcon$1,
  PanoramaIcon,
  GeneratingMediaArea,
} from "../canvas/generating-media-area.jsx";
import { FILE_PREVIEW_SIZE, FILE_PREVIEW_MIN_SIZE } from "../canvas/prune-persisted-node-data.js";
import { usePopoverCloseWithDeselect } from "../generation/resolve-reference-texts.js";
import {
  panoramaGenerationPresentationKey,
  resolvePanoramaGenerationPresentation,
  panoramaCleanPreviewUrl,
  PANORAMA_VIEWER_NODE_SIZE,
  PANORAMA_EMPTY_NODE_SIZE,
  panoramaViewerNodeSize,
  CanvasImage,
} from "./canvas-image.jsx";
import { useSimulatedProgress, NodeToolbar } from "./use-lightbox-media-actions.jsx";
import { CAPTURE_PLACEMENT_RESERVATION_MS } from "../infra/capture-placement-reservation-ms.js";
import { useAddToChat, NodeShell, NodeBody } from "../canvas/use-media-node-actions.jsx";
import { NodeHeader, NodeHandles } from "../canvas/use-inline-rename.jsx";
import { MediaGenerationErrorOverlay, Tooltip$1 } from "../generation/create-tracker.jsx";
import { PanoramaViewer, PanoramaGenerationPanel } from "./panorama-viewer.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function PanoramaNode({ id: id2, data: data2, selected: selected2, width, height }) {
  const { t: t2 } = useTranslation();
  const reactFlow = useReactFlow();
  const { pickAsset, cropImage, cropSplit, submitImg2Image, getLastUsedModelParams, onAddToChat } =
    useCanvasBridge();
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
  const panoramaData = data2;
  const generationPending = panoramaData?.panoramaGenerationPending === true;
  const persistedGenerationActive = panoramaData?.panoramaGenerationActive === true;
  const panoramaGenerationStartedAt =
    typeof panoramaData?.panoramaGenerationStartedAt === "string"
      ? panoramaData.panoramaGenerationStartedAt
      : void 0;
  const persistedGeneratedSourceNodeId =
    typeof panoramaData?.panoramaGeneratedSourceNodeId === "string"
      ? panoramaData.panoramaGeneratedSourceNodeId
      : "";
  const [generatedSourceNodeId, setGeneratedSourceNodeId] = reactExports.useState(
    persistedGeneratedSourceNodeId,
  );
  const generatedSourceMeta = useAssetMeta(generatedSourceNodeId);
  const [incomingSourceIds, setIncomingSourceIds] = reactExports.useState(() =>
    getIncomingSourceIds(id2),
  );
  const sourceNodeId = useAssetMetadataStore((state2) => {
    if (
      generatedSourceNodeId &&
      incomingSourceIds.includes(generatedSourceNodeId) &&
      state2.assets.get(generatedSourceNodeId)?.type === "image"
    ) {
      return generatedSourceNodeId;
    }
    return (
      incomingSourceIds.find((sourceId) => state2.assets.get(sourceId)?.type === "image") ?? ""
    );
  });
  const sourceMeta = useAssetMeta(sourceNodeId);
  const upstreamReferencesJson = useAssetMetadataStore((state2) =>
    JSON.stringify(
      incomingSourceIds.flatMap((incomingId) => {
        if (incomingId === generatedSourceNodeId) return [];
        const meta2 = state2.assets.get(incomingId);
        return meta2?.type === "image" && meta2.path && meta2.url
          ? [
              {
                nodeId: incomingId,
                path: meta2.path,
                url: meta2.url,
                name: meta2.name,
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
  const isDragging = useCanvasNodeIsDragging(id2);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const [previewWidth, setPreviewWidth] = reactExports.useState(
    typeof width === "number" && width > 0 ? width : FILE_PREVIEW_SIZE.width,
  );
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    typeof height === "number" && height > 0 ? height : FILE_PREVIEW_SIZE.height,
  );
  const [captureRequest, setCaptureRequest] = reactExports.useState();
  const [fullscreenRequestId, setFullscreenRequestId] = reactExports.useState(0);
  const [showGenerationPanel, setShowGenerationPanel] = reactExports.useState(false);
  const [generationActive, setGenerationActive] = reactExports.useState(persistedGenerationActive);
  const [panoramaPreview, setPanoramaPreview] = reactExports.useState(false);
  const [staticCaptureActive, setStaticCaptureActive] = reactExports.useState(false);
  const [naturalSourceSize, setNaturalSourceSize] = reactExports.useState(null);
  const lastAspectSyncKeyRef = reactExports.useRef("");
  const captureRequestSequenceRef = reactExports.useRef(0);
  const capturePlacementReservationsRef = reactExports.useRef([]);
  const handleGenerationPanelClose = usePopoverCloseWithDeselect(id2, setShowGenerationPanel);
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
  const generatedSourceNode = generatedSourceNodeId ? getNodeById(generatedSourceNodeId) : void 0;
  const generationPresentation = resolvePanoramaGenerationPresentation(generatedSourceNode);
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
    setCaptureRequest((current2) => (current2?.count === 1 ? void 0 : current2));
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
    mergeNodeDataSilent(id2, {
      panoramaGenerationActive: void 0,
      panoramaGenerationStartedAt: void 0,
    });
  }, [hasGenerationError, id2, mergeNodeDataSilent]);
  reactExports.useEffect(() => {
    const syncSources = () => {
      const next2 = getIncomingSourceIds(id2);
      setIncomingSourceIds((current2) =>
        current2.length === next2.length &&
        current2.every((sourceId, index2) => sourceId === next2[index2])
          ? current2
          : next2,
      );
    };
    syncSources();
    return subscribeIncomingChange(id2, syncSources);
  }, [getIncomingSourceIds, id2, subscribeIncomingChange]);
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
    resizeNode(id2, PANORAMA_EMPTY_NODE_SIZE.width, PANORAMA_EMPTY_NODE_SIZE.height);
  }, [generationPending, id2, previewHeight, previewWidth, resizeNode]);
  reactExports.useEffect(() => {
    const canOpenGenerationPanel = !hasGenerationError && !showGenerationState && generationPending;
    if (!canOpenGenerationPanel) {
      setShowGenerationPanel(false);
      return;
    }
    if (!selected2 || isMultiSelect || isBoxSelecting || showGenerationPanel) return;
    setShowGenerationPanel(true);
  }, [
    generationPending,
    hasGenerationError,
    isBoxSelecting,
    isMultiSelect,
    selected2,
    showGenerationState,
    showGenerationPanel,
  ]);
  reactExports.useLayoutEffect(() => {
    const generationCompleted =
      generationActive && !!generatedSourceNodeId && !!generatedSourceMeta?.url;
    if (!sourceMeta?.url || ((generationPending || generationActive) && !generationCompleted))
      return;
    const aspectSyncKey = `${sourceNodeId}:${sourceMeta.url}:${sourceWidth ?? "default"}x${sourceHeight ?? "default"}`;
    if (!generationCompleted && lastAspectSyncKeyRef.current === aspectSyncKey) return;
    lastAspectSyncKeyRef.current = aspectSyncKey;
    const target = panoramaViewerNodeSize(
      sourceWidth,
      sourceHeight,
      generationCompleted ? PANORAMA_VIEWER_NODE_SIZE.width : previewWidth,
    );
    if (previewWidth !== target.width || previewHeight !== target.height) {
      resizeNode(id2, target.width, target.height);
    }
    if (!generationCompleted) return;
    setGenerationActive(false);
    mergeNodeDataSilent(id2, {
      panoramaGenerationActive: void 0,
      panoramaGenerationPending: void 0,
      panoramaGenerationStartedAt: void 0,
    });
  }, [
    generatedSourceMeta?.url,
    generatedSourceNodeId,
    generationActive,
    generationPending,
    id2,
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
      mergeNodeDataSilent(id2, {
        panoramaGenerationActive: true,
        panoramaGenerationStartedAt: generationStartedAt,
      });
      const generationAnchorIds = [id2, ...getIncomingSourceIds(id2)].filter(
        (nodeId, index2, all2) => all2.indexOf(nodeId) === index2,
      );
      const beforeTargets = new Set(
        generationAnchorIds.flatMap((anchorId) => getOutgoingTargetIds(anchorId)),
      );
      let finished = false;
      let unsubscribe = () => {};
      let timeout2 = 0;
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
          (targetNode?.type === "placeholder" && targetData?.mediaType === "image");
        if (!isImageGenerationTarget) return;
        finished = true;
        unsubscribe();
        window.clearTimeout(timeout2);
        setNodeHidden?.(targetId, true);
        ensureDerivationEdge(targetId, id2);
        setGeneratedSourceNodeId(targetId);
        mergeNodeDataSilent(id2, {
          panoramaGeneratedSourceNodeId: targetId,
        });
      };
      unsubscribe = subscribeGraphChange(adoptGeneratedImage);
      timeout2 = window.setTimeout(() => {
        finished = true;
        unsubscribe();
      }, 12e4);
      const lastUsed = getLastUsedModelParams?.("i2i");
      const scene = params.prompt || "an immersive 360 degree environment";
      const panoramaPrompt = `Generate a 360-degree equirectangular panorama with seamless left and right edges, full horizontal 360° and vertical 180°, including zenith and nadir. ${scene}`;
      try {
        await submitImg2Image(
          id2,
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
        window.clearTimeout(timeout2);
        setGenerationActive(false);
        setGeneratedSourceNodeId(previousGeneratedSourceNodeId);
        mergeNodeDataSilent(id2, {
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
      id2,
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
        await cropSplit(id2, items, label, {
          focusResult: !panoramaPreview,
        });
        return;
      }
      if (!cropImage) return;
      try {
        const nodes = reactFlow.getNodes();
        const nodeIds = new Set(nodes.map((node2) => node2.id));
        const now2 = Date.now();
        const pendingReservations = capturePlacementReservationsRef.current.filter(
          (reservation) =>
            !nodeIds.has(reservation.nodeId) &&
            now2 - reservation.createdAt < CAPTURE_PLACEMENT_RESERVATION_MS,
        );
        capturePlacementReservationsRef.current = pendingReservations;
        const edges = reactFlow.getEdges();
        const captureTargetIds = new Set(
          edges
            .filter((edge) => edge.source === id2 && (edge.type ?? "derivation") === "derivation")
            .map((edge) => edge.target),
        );
        const occupied = pendingReservations.map(({ x: x2, y: y4, w: w3, h: h2 }) => ({
          x: x2,
          y: y4,
          w: w3,
          h: h2,
        }));
        for (const node2 of nodes) {
          if (!captureTargetIds.has(node2.id) || node2.parentId) continue;
          const internal2 = reactFlow.getInternalNode(node2.id);
          const absolute = internal2?.internals.positionAbsolute ?? node2.position;
          occupied.push({
            x: absolute.x,
            y: absolute.y,
            w: node2.measured?.width ?? previewWidth,
            h: node2.measured?.height ?? previewHeight,
          });
        }
        const sourceInternal = reactFlow.getInternalNode(id2);
        const sourceNode = sourceInternal ?? reactFlow.getNode(id2);
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
        const position2 = findFreePositionFromAnchor(
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
        const outputNodeId = await cropImage(id2, items[0].blob, items[0].filename, position2);
        if (outputNodeId) {
          capturePlacementReservationsRef.current.push({
            nodeId: outputNodeId,
            createdAt: Date.now(),
            x: position2.x,
            y: position2.y,
            w: previewWidth,
            h: previewHeight,
          });
        }
        if (!options?.fullscreen) focusDerivedNode(outputNodeId);
        if (options?.fullscreen) {
          dedupedToast.success(t2("canvas.panorama.captureCreated", "生图节点创建完成"), {
            duration: 3e3,
            closeButton: false,
            position: "top-center",
          });
        }
      } catch (error) {
        if (options?.fullscreen) {
          dedupedToast.error(t2("canvas.panorama.captureFailed", "全景截图创建失败"), {
            duration: 4e3,
            closeButton: false,
            position: "top-center",
          });
        }
        throw error;
      }
    },
    [
      cropImage,
      cropSplit,
      focusDerivedNode,
      id2,
      panoramaPreview,
      previewHeight,
      previewWidth,
      reactFlow,
      t2,
    ],
  );
  const handleAddToChat = useAddToChat(id2, sourceMeta, onAddToChat);
  const requestCapture = reactExports.useCallback(
    (count2) => {
      if (!panoramaPreview) setStaticCaptureActive(true);
      captureRequestSequenceRef.current += 1;
      setCaptureRequest({
        sequence: captureRequestSequenceRef.current,
        count: count2,
      });
    },
    [panoramaPreview],
  );
  const requestCurrentCapture = reactExports.useCallback(() => requestCapture(1), [requestCapture]);
  const handleCaptureRequestSettled = reactExports.useCallback((sequence) => {
    if (captureRequestSequenceRef.current !== sequence) return;
    setCaptureRequest(void 0);
    setStaticCaptureActive(false);
  }, []);
  const requestFullscreen = reactExports.useCallback(() => {
    enterPanoramaPreview();
    setFullscreenRequestId((current2) => current2 + 1);
  }, [enterPanoramaPreview]);
  const panoramaToolbarItems = reactExports.useMemo(
    () => [
      {
        id: "panorama-capture",
        label: t2("canvas.panorama.capture", "截取当前视角"),
        icon: <Camera size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: requestCurrentCapture,
      },
      {
        id: "panorama-capture-4",
        label: t2("canvas.panorama.capture4", "4 大视角截图"),
        icon: <Grid2X2 size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: () => requestCapture(4),
      },
      {
        id: "panorama-capture-12",
        label: t2("canvas.panorama.capture12", "12 大视角截图"),
        icon: <Grid3X3 size={20} strokeWidth={1.5} />,
        forceLabel: true,
        onClick: () => requestCapture(12),
      },
      {
        id: "add-to-chat",
        label: t2("canvas.addToChat"),
        icon: <AddToChatIcon />,
        separator: true,
        disabled: !sourceMeta?.path || !onAddToChat,
        onClick: handleAddToChat,
      },
      {
        id: "fullscreen",
        label: t2("canvas.fullscreen"),
        icon: <FullscreenIcon$1 />,
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
      t2,
    ],
  );
  const flatToolbarItems = reactExports.useMemo(
    () => panoramaToolbarItems.filter((item) => item.id !== "panorama-capture"),
    [panoramaToolbarItems],
  );
  const interactive = !!selected2 && !isMultiSelect && !isDragging && !isBoxSelecting;
  const previewInteractive = panoramaPreview && !isMultiSelect && !isDragging && !isBoxSelecting;
  const previewToggleLabel = panoramaPreview
    ? t2("canvas.panorama.exitPreview", "退出全景模式")
    : t2("canvas.panorama.enterPreview", "进入全景模式");
  return (
    <NodeShell
      id={id2}
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
        name={t2("canvas.panorama.title", "全景图")}
        icon={<PanoramaIcon size={18} />}
        selected={selected2}
        maxWidth={previewWidth}
      />
      <NodeBody
        width={previewWidth}
        height={previewHeight}
        selected={selected2}
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
                  panoramaPreview ? "size-full" : "pointer-events-none invisible absolute inset-0"
                }
              >
                <PanoramaViewer
                  src={displaySourceUrl}
                  interactive={previewInteractive}
                  emptyLabel={t2("canvas.panorama.empty", "连接一张全景图片后即可拖拽查看")}
                  loadingLabel={t2("canvas.panorama.loading", "正在加载全景图…")}
                  errorLabel={t2("canvas.panorama.error", "全景图加载失败")}
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
                  nodeId={id2}
                  width={flatImageSize.width}
                  height={flatImageSize.height}
                  alt={sourceMeta.name}
                  onNaturalSize={(naturalWidth, naturalHeight) => {
                    setNaturalSourceSize((current2) =>
                      current2?.src === sourceMeta.url &&
                      current2.width === naturalWidth &&
                      current2.height === naturalHeight
                        ? current2
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
              className={`absolute right-3 top-3 z-[8] origin-top-right scale-[1.125] transition-opacity duration-150 ${panoramaPreview || selected2 ? "opacity-100" : "opacity-0 group-hover/panorama:opacity-100"}`}
            >
              <TooltipProvider$1 delay={150} closeDelay={0}>
                <Tooltip$1 content={previewToggleLabel} side="top" sideOffset={8}>
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
                </Tooltip$1>
              </TooltipProvider$1>
            </div>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--canvas-node-bg)] px-6 text-center text-[13px] text-[var(--canvas-empty-guidance-fg)]">
            {t2("canvas.panorama.empty", "连接一张全景图片后即可拖拽查看")}
          </div>
        )}
      </NodeBody>
      {!hasGenerationError &&
        !showGenerationState &&
        generationPending &&
        selected2 &&
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
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={FILE_PREVIEW_MIN_SIZE.width}
          minHeight={FILE_PREVIEW_MIN_SIZE.height}
          keepAspectRatio={!generationPending && !!sourceMeta?.url}
          onResize={handleResize}
        />
      )}
      <NodeHandles nodeId={id2} selected={!!selected2} sourcePosition={Position.Left} />
    </NodeShell>
  );
}
