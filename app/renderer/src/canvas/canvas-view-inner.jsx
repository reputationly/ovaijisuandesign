// canvas-view-inner.jsx
import { getViewportForBounds, CanvasNodeType, useTranslation, useAssetMetadataApi, reactExports, useReactFlow, useStoreApi, dedupedToast, useNodesInitialized, useStore$3, Check, ChevronDown, Loader2Icon } from "../vendor.js";
import { buildIncrementalNodeData } from "./build-incremental-node-data.js";
import { syncStableZoomSignals } from "./canvas-surface-recovery-scheduler.jsx";
import { useHtmlFullscreenApi, CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from "../infra/create-html-iframe-pool-store.jsx";
import { useRecentlyAddedApi, getDerivedNodePosition } from "../infra/create-recently-added-store.jsx";
import { CanvasMode, isAssetBackedNode, defaultNodeSizeForType, POPOVER_DRAFT_DATA_KEY, TABLE_CARD_DEFAULT_SIZE } from "./group-nodes-in-canvas.js";
import { DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT } from "./handle-position-style.jsx";
import { getNodePosition, sizeOf, readCanvasPreference, CANVAS_COMMAND_IDS, writeCanvasPreference } from "./node-tag-rings-canvas.jsx";
import { useCanvasBridge, useGeneratingStateStore } from "../media-editing/parse-item.jsx";
import { parseNodeId, deriveEdgeId } from "./resolve-derived-collision.js";
import { useCanvasNodeAssetsStore } from "../infra/track-events.js";
import { useMultiImageOverlayApi, useMultiImageOverlayStore } from "../media-editing/use-multi-image-actions.js";
import {
  resolveVisibilityPriorityFocus,
  readCanvasViewport,
  writeCanvasViewport,
} from "./resolve-visibility-priority-focus.js";
import {
  STICKER_NODE_SIZE,
  createCanvasViewportStorageKey,
  getCanvasToastId,
  useStickerFollowIndex,
  getCanvasTaskSnapshots,
  canvasFocus,
  createCanvasFocusScheduler,
  historyBlockedMessage,
  deleteBlockedMessage,
  applyCanvasFocusSelection,
  resolveStickerPointerPlacement,
  StickerCursorPreview,
} from "./sticker-cursor-preview-content.jsx";
import {
  getAssetMetaByNodeIdFromStore,
  useInactiveNodeVirtualization,
} from "./generating-media-area.jsx";
import {
  useTidySortPreference,
  CanvasCommandPanelContent,
  CanvasLoadError,
  QuickZoomPresence,
  CanvasPaneContextMenu,
  CanvasHighBlastDeleteDialog,
  CanvasConfirmationDialog,
  TidySortContext,
} from "./canvas-toggle-icon.jsx";
import {
  CANVAS_BACKGROUND_PATTERNS,
  createCanvasResizeActions,
  getCanvasViewportStorage,
  collectAffectedStickerNodes,
  CanvasShell,
} from "./canvas-shell-inner.jsx";
import {
  CANVAS_TONES,
  CANVAS_MORE_TONES,
  CANVAS_PRIMARY_TONES,
} from "./node-alignment-guides.jsx";
import {
  useCanvasInteractionTool,
  useCanvasContextMenus,
  useCanvasClickHandlers,
} from "./use-canvas-context-menus.js";
import {
  CANVAS_DEFAULT_STICKER_ASSET_ID,
  getCanvasStickerAsset,
} from "../media-editing/ready-sub-video-card.jsx";
import { useCanvas } from "./use-canvas.js";
import {
  exitFullscreenForRemovedNode,
  CANVAS_INITIAL_FIT_MIN_ZOOM,
  CANVAS_INITIAL_FIT_MAX_ZOOM,
  WorkspaceContentBudgetScopeProvider,
} from "../media-editing/use-plugin-host.jsx";
import { useRenderableContentChange } from "./edge-interaction-layer.jsx";
import { computeMultiImageRenderBounds } from "../media-editing/ready-sub-image-card.jsx";
import { usePersist, usePasteNodeTransformer } from "./persist-save-queue.js";
import {
  useGroupExecution,
  useHistoryState,
  useCanvasViewportFocus,
} from "./use-group-execution.js";
import { isReexecutableGenerationNode, newTablePath } from "./prune-persisted-node-data.js";
import { buildPlaceholderFillData } from "../media-editing/use-lightbox-media-actions.jsx";
import { syncStableZoomAfter, CanvasReferenceNavigationScope } from "../media-editing/decode-worker-pool.jsx";
import { useCanvasAddNode } from "./comfy-ui-submenu.jsx";
import { useCanvasAddNodeMenus } from "./use-connect-to-add-node.jsx";
import { serializeTableDocument } from "../text-editor/table-document-to-llm-content.js";
import { RESOURCE_DRAG_MIME, parseResourceDrag } from "../text-editor/myers-line-hunks.js";
import { CanvasToolbar, EmptyViewportToast } from "./empty-viewport-toast.jsx";
import { CanvasViewControls } from "./zoom-menu.jsx";
import { SelectionToolbar } from "./selection-toolbar-inner.jsx";
import { MultiSelectPlusHandle } from "./multi-select-plus-handle-inner.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function applyVisibilityPriorityFocus({
  duration,
  getViewport,
  minReadableZoom,
  minZoom,
  nodeIds,
  padding,
  setCenter,
  setViewport,
  state: state2,
  syncViewportChange,
}) {
  const nodeRects = [];
  for (const id2 of nodeIds) {
    const node2 = state2.nodeLookup.get(id2);
    const width = node2?.measured?.width;
    const height = node2?.measured?.height;
    if (!node2 || !width || !height) return;
    const position2 = node2.internals.positionAbsolute;
    nodeRects.push({
      id: id2,
      x: position2.x,
      y: position2.y,
      width,
      height,
    });
  }
  if (nodeRects.length === 0 || state2.width <= 0 || state2.height <= 0) return;
  const minX = Math.min(...nodeRects.map((rect) => rect.x));
  const minY = Math.min(...nodeRects.map((rect) => rect.y));
  const maxX = Math.max(...nodeRects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...nodeRects.map((rect) => rect.y + rect.height));
  const fitAllViewport = getViewportForBounds(
    {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    state2.width,
    state2.height,
    minZoom,
    1,
    padding,
  );
  const currentViewport = getViewport();
  const decision = resolveVisibilityPriorityFocus({
    fitAllZoom: fitAllViewport.zoom,
    minReadableZoom,
    nodeRects,
    viewportRect: {
      x: -currentViewport.x / currentViewport.zoom,
      y: -currentViewport.y / currentViewport.zoom,
      width: state2.width / currentViewport.zoom,
      height: state2.height / currentViewport.zoom,
    },
  });
  if (decision.type === "keep") return;
  if (decision.type === "fit-all") {
    syncViewportChange(
      setViewport(fitAllViewport, {
        duration,
      }),
    );
    return;
  }
  const target = nodeRects.find((rect) => rect.id === decision.nodeId);
  if (!target) return;
  syncViewportChange(
    setCenter(target.x + target.width / 2, target.y + target.height / 2, {
      duration,
      zoom: Math.max(currentViewport.zoom, minReadableZoom),
    }),
  );
}
function resolveInitialFitGateAction({
  presented,
  loading,
  initialFitConsumed,
  initialHydratedNodeCount,
  nodeCount,
  nodesInitialized,
}) {
  if (!presented || loading || initialFitConsumed) return "wait";
  if (initialHydratedNodeCount === null) return "wait";
  if (initialHydratedNodeCount === 0) return "reveal-empty";
  if (nodeCount === 0) return "wait";
  return nodesInitialized ? "fit-measured" : "schedule-fallback";
}
function shouldAcquireCanvasResources({ presented, loading, initialFitDone }) {
  return presented && !loading && initialFitDone;
}
function filterInitialFitFallbackNodes(nodes) {
  return nodes.filter((node2) => !("hidden" in node2) || node2.hidden !== true);
}
function resolveInitialFitFallbackViewport({
  bounds,
  viewportWidth,
  viewportHeight,
  minZoom,
  maxZoom,
  padding,
}) {
  if (viewportWidth <= 0 || viewportHeight <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return void 0;
  }
  return getViewportForBounds(bounds, viewportWidth, viewportHeight, minZoom, maxZoom, padding);
}
function resolveNewNodesToastAction(input) {
  return input.projectActive && input.canvasPresented ? "focus-presented-canvas" : "navigate";
}
function shouldRecenterFirstNodes(input) {
  return input.canvasPresented && input.nodeCount > 0;
}
const URL_PATH_PARAM_KEYS = ["path", "file", "file_path", "local_path"];
const FILES_ROUTE_PREFIX = "/files/";
const THUMBNAIL_ROUTE_PREFIX = "/api/thumbnail/";
function decodePath$1(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function stripQueryAndHash$2(value) {
  return value.split("?")[0]?.split("#")[0] ?? value;
}
function normalizePath$2(value) {
  return decodePath$1(stripQueryAndHash$2(value.trim())).replace(/\\/g, "/");
}
function pushUnique(values3, value) {
  if (!value) return;
  const normalized = normalizePath$2(value);
  if (!normalized || values3.includes(normalized)) return;
  values3.push(normalized);
}
function pathQueries(rawPath) {
  const values3 = [];
  pushUnique(values3, rawPath);
  try {
    const url2 = new URL(rawPath, "http://hilo.local");
    for (const key2 of URL_PATH_PARAM_KEYS) {
      pushUnique(values3, url2.searchParams.get(key2) ?? void 0);
    }
    const pathname = normalizePath$2(url2.pathname);
    pushUnique(values3, pathname);
    if (pathname.startsWith(FILES_ROUTE_PREFIX)) {
      pushUnique(values3, pathname.slice(FILES_ROUTE_PREFIX.length));
    }
    if (pathname.startsWith(THUMBNAIL_ROUTE_PREFIX)) {
      pushUnique(values3, pathname.slice(THUMBNAIL_ROUTE_PREFIX.length));
    }
  } catch {}
  return values3;
}
function basename$9(value) {
  return value.split("/").pop() ?? value;
}
function hasDirectorySegment(value) {
  return value.includes("/");
}
function isExactOrSegmentSuffix(candidate, query) {
  if (candidate === query) return true;
  if (hasDirectorySegment(candidate) && query.endsWith(`/${candidate}`)) return true;
  if (hasDirectorySegment(query) && candidate.endsWith(`/${query}`)) return true;
  return false;
}
function resolveFileNodeIdByPath(rawPath, candidates2) {
  if (!rawPath) return null;
  const queries = pathQueries(rawPath);
  if (queries.length === 0) return null;
  for (const query of queries) {
    for (const candidate of candidates2) {
      if (!candidate.path) continue;
      if (isExactOrSegmentSuffix(normalizePath$2(candidate.path), query)) {
        return candidate.nodeId;
      }
    }
  }
  const queryBases = new Set(queries.map((query) => basename$9(query)).filter(Boolean));
  const basenameMatches = new Set();
  for (const candidate of candidates2) {
    if (!candidate.path) continue;
    if (queryBases.has(basename$9(normalizePath$2(candidate.path)))) {
      basenameMatches.add(candidate.nodeId);
    }
  }
  return basenameMatches.size === 1 ? ([...basenameMatches][0] ?? null) : null;
}
function resolveFirstFileNodeIdByPartialName(rawName, candidates2) {
  const query = decodePath$1(rawName).trim().toLowerCase();
  if (!query) return null;
  for (const candidate of candidates2) {
    const names = [
      candidate.name,
      candidate.path ? basename$9(normalizePath$2(candidate.path)) : null,
    ];
    if (names.some((name2) => typeof name2 === "string" && name2.toLowerCase().includes(query))) {
      return candidate.nodeId;
    }
  }
  return null;
}
function applyReactFlowSelectionWriteback({
  ids: ids2,
  syncing,
  active: active2,
  writeSelection,
  closeMenus,
}) {
  if (syncing) return "ignored-syncing";
  if (!active2) return "ignored-inactive";
  writeSelection([...ids2]);
  closeMenus();
  return "applied";
}
const INITIAL_FIT_FALLBACK_MS = 2500;
const EMPTY_SHELL_NODES = [];
const EMPTY_SHELL_EDGES = [];
const STICKER_MAX_ROTATION_DEG = 30;
const STICKER_BINDING_DELAY_MS = 120;
function randomStickerRotation() {
  return Math.round((Math.random() * 2 - 1) * STICKER_MAX_ROTATION_DEG);
}
const DEFAULT_STICKER_EMOJI = "⭐";
function getAbsoluteNodePosition(node2, nodesById, mode2) {
  let position2 = getNodePosition(node2, mode2);
  let parentId = node2.parentId;
  const visited = new Set([node2.id]);
  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const parent = nodesById.get(parentId);
    if (!parent) break;
    const parentPosition = getNodePosition(parent, mode2);
    position2 = {
      x: position2.x + parentPosition.x,
      y: position2.y + parentPosition.y,
    };
    parentId = parent.parentId;
  }
  return position2;
}
function findStickerTarget(nodes, stickerPosition, mode2) {
  let best;
  const nodesById = new Map(nodes.map((node2) => [node2.id, node2]));
  const stickerRight = stickerPosition.x + STICKER_NODE_SIZE.width;
  const stickerBottom = stickerPosition.y + STICKER_NODE_SIZE.height;
  for (const node2 of nodes) {
    if (node2.type === CanvasNodeType.Sticker || node2.meta?.hidden) continue;
    const position2 = getAbsoluteNodePosition(node2, nodesById, mode2);
    const size2 = sizeOf(node2, mode2);
    const overlapWidth = Math.max(
      0,
      Math.min(stickerRight, position2.x + size2.width) - Math.max(stickerPosition.x, position2.x),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(stickerBottom, position2.y + size2.height) -
        Math.max(stickerPosition.y, position2.y),
    );
    const area = overlapWidth * overlapHeight;
    if (area <= 0 || (best && area <= best.area)) continue;
    best = {
      area,
      target: {
        id: node2.id,
        position: position2,
        size: size2,
        anchor: {
          x: (stickerPosition.x - position2.x) / Math.max(size2.width, 1),
          y: (stickerPosition.y - position2.y) / Math.max(size2.height, 1),
        },
      },
    };
  }
  return best?.target;
}
function getTextNodeBackingPath(node2, assetMetadataStore) {
  if (node2.type !== CanvasNodeType.Text) return null;
  const metaPath = getAssetMetaByNodeIdFromStore(assetMetadataStore, node2.id)?.path;
  if (metaPath) return metaPath;
  const data2 = node2.data;
  const dataPath = data2?.path;
  return typeof dataPath === "string" && dataPath.length > 0 ? dataPath : null;
}
function hasOtherTextNodeWithBackingPath(nodes, removedNodeId, filePath, assetMetadataStore) {
  return nodes.some(
    (node2) =>
      node2.id !== removedNodeId && getTextNodeBackingPath(node2, assetMetadataStore) === filePath,
  );
}
export function CanvasViewInner({
  dataSource,
  plugins,
  initialMode = CanvasMode.Workflow,
  onCanvasTasksChange,
  onResourceDrop,
  onNativeFileDrop,
  onSystemPaste,
  onSystemTextPaste,
  onRequestSystemPaste,
  onSystemCopy,
  onHostKeyboardShortcut,
  onCommentContext,
  onOpenAssets,
  onOpenHelp,
  onDeleteTextFileIfEmpty,
  onTextNodeRemoved,
  toolbarLeading,
  toolbarTrailing,
  toolDockBeforeSticker,
  toolDockTrailing,
  utilityControls,
  toolbarPlacement = DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
  layoutRelocationKey,
  onRenderableContentChange,
  isActive: isActive2 = true,
  isPresented = isActive2,
  workspaceName,
  onNewNodesNavigate,
  onPersistenceStatusChange,
  onPersistenceControllerChange,
  loadingOverlay,
  onLoadStateChange,
  handleRef,
}) {
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const [mode2, setMode] = reactExports.useState(initialMode);
  const [minimapVisible, setMinimapVisible] = reactExports.useState(() => {
    try {
      return localStorage.getItem("hilo:canvas:minimap") === "1";
    } catch {
      return false;
    }
  });
  const minimapVisibleRef = reactExports.useRef(minimapVisible);
  const [edgesVisible, setEdgesVisible] = reactExports.useState(true);
  const edgesVisibleRef = reactExports.useRef(edgesVisible);
  const dragDepthRef = reactExports.useRef(0);
  const pendingMenuPastePositionRef = reactExports.useRef(null);
  const consumeMenuPastePosition = reactExports.useCallback(() => {
    const position2 = pendingMenuPastePositionRef.current;
    pendingMenuPastePositionRef.current = null;
    return position2;
  }, []);
  const replacedIdsRef = reactExports.useRef(new Map());
  const {
    onNodeContextMenu: bridgeContextMenu,
    onAddToChat,
    saveTableContent,
    duplicateTextAsset,
    duplicateFileAsset,
    duplicateTableAsset,
    duplicateAssetByPath,
    getCurrentWorkspace,
    onUpload: bridgeUpload,
    onSelectionChange,
    onCanvasEnter,
    onStickerAdd,
    onCanvasViewControl,
    onNodeAdd,
    onInstantiatePlugin,
    onPromoteToAsset,
    onSaveManyAs,
    loadTextContent,
    getLastUsedModelParams,
  } = useCanvasBridge();
  const recentlyAddedApi = useRecentlyAddedApi();
  const multiImageOverlayApi = useMultiImageOverlayApi();
  const expandedMediaNodeId = useMultiImageOverlayStore((state2) => state2.openNodeId);
  const workspaceContentBudgetScope = getCurrentWorkspace?.();
  const viewportStorageKey = createCanvasViewportStorageKey(workspaceContentBudgetScope, mode2);
  const initialViewportOwner = viewportStorageKey ?? `unscoped:${mode2}`;
  const newNodesToastId = getCanvasToastId("new-nodes", workspaceContentBudgetScope);
  const preferenceScope = encodeURIComponent(workspaceContentBudgetScope ?? "default");
  const tidySort = useTidySortPreference(preferenceScope);
  const backgroundPatternKey = `hilo:canvas:background-pattern:${preferenceScope}`;
  const canvasToneKey = `hilo:canvas:background-tone:${preferenceScope}`;
  const [backgroundPattern, setBackgroundPattern] = reactExports.useState(() =>
    readCanvasPreference(backgroundPatternKey, CANVAS_BACKGROUND_PATTERNS, "dots"),
  );
  const [canvasTone, setCanvasTone] = reactExports.useState(() =>
    readCanvasPreference(canvasToneKey, CANVAS_TONES, "default"),
  );
  const [moreCanvasTonesOpen, setMoreCanvasTonesOpen] = reactExports.useState(() =>
    CANVAS_MORE_TONES.some((tone) => tone === canvasTone),
  );
  const handleNodesAddedRef = reactExports.useRef(() => {});
  const handleFirstNodesPlacedRef = reactExports.useRef(() => {});
  const pendingNodeIdsRef = reactExports.useRef([]);
  const commandHandlersRef = reactExports.useRef({});
  const {
    activeCommand,
    stickerMode,
    handTool,
    setActiveCommand,
    setInteractionTool,
    closeCommandPanel,
    dismissStickerPanel,
    stickerSelection,
    setStickerSelection,
  } = useCanvasInteractionTool();
  const stickerSelectionRef = reactExports.useRef(stickerSelection);
  stickerSelectionRef.current = stickerSelection;
  const stickerAssetId = stickerSelection.kind === "asset" ? stickerSelection.id : "";
  const stickerEmoji =
    stickerSelection.kind === "emoji" ? stickerSelection.value : DEFAULT_STICKER_EMOJI;
  const [emojiPickerOpen, setEmojiPickerOpen] = reactExports.useState(true);
  const stickerSelectionOwnerRef = reactExports.useRef(workspaceContentBudgetScope);
  reactExports.useEffect(() => {
    if (stickerSelectionOwnerRef.current === workspaceContentBudgetScope) return;
    stickerSelectionOwnerRef.current = workspaceContentBudgetScope;
    const defaultSelection = {
      kind: "asset",
      id: CANVAS_DEFAULT_STICKER_ASSET_ID,
    };
    stickerSelectionRef.current = defaultSelection;
    setStickerSelection(defaultSelection);
    setEmojiPickerOpen(true);
  }, [workspaceContentBudgetScope, setStickerSelection]);
  const handleStickerAssetChange = reactExports.useCallback(
    (assetId) => {
      const nextSelection = {
        kind: "asset",
        id: assetId,
      };
      stickerSelectionRef.current = nextSelection;
      setStickerSelection(nextSelection);
    },
    [setStickerSelection],
  );
  const handleStickerEmojiChange = reactExports.useCallback(
    (emoji2) => {
      const nextSelection = {
        kind: "emoji",
        value: emoji2,
      };
      stickerSelectionRef.current = nextSelection;
      setStickerSelection(nextSelection);
    },
    [setStickerSelection],
  );
  const [freshStickerIds, setFreshStickerIds] = reactExports.useState(() => new Set());
  const stickerBindingTimerRef = reactExports.useRef(null);
  const pendingStickerBindingIdsRef = reactExports.useRef(new Set());
  const [stickerFollowPositions, setStickerFollowPositions] = reactExports.useState(
    () => new Map(),
  );
  const stickerFollowPositionsRef = reactExports.useRef(new Map());
  const stickerFollowClearTimerRef = reactExports.useRef(null);
  const stickerDragActiveRef = reactExports.useRef(false);
  const flowPositionSnapshotsRef = reactExports.useRef(new Map());
  const getCommandHandlers = reactExports.useCallback(() => commandHandlersRef.current, []);
  const canvasOptions = {
    mode: mode2,
    dataSource,
    plugins,
    isPresented,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    consumePastePositionOverride: consumeMenuPastePosition,
    getCurrentWorkspace,
    onNodesAdded: (ids2) => handleNodesAddedRef.current(ids2),
    onFirstNodesPlaced: (ids2) => handleFirstNodesPlacedRef.current(ids2),
    commandHandlers: getCommandHandlers,
  };
  const {
    nodes,
    edges,
    selectedIds,
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    commands,
    instance: instance2,
    savedPositionsRef,
    hiddenAssetIdsRef,
    getDropPosition,
    clientToFlowPosition,
    focusDerivedNode,
    focusNextDerivedFrom,
    attachDraftOnNextDerived,
    syncingRef,
    commandRegistry,
  } = useCanvas(canvasOptions);
  const generatingByNode = useGeneratingStateStore((s2) => s2.byNode);
  const fullscreenApi = useHtmlFullscreenApi();
  reactExports.useEffect(() => {
    return instance2.eventBus.on("node:removed", ({ nodeId }) => {
      exitFullscreenForRemovedNode(fullscreenApi, nodeId);
    });
  }, [fullscreenApi, instance2]);
  const getStickerFollowIndex = useStickerFollowIndex(instance2);
  useRenderableContentChange(nodes, onRenderableContentChange);
  reactExports.useEffect(() => {
    const snapshots2 = flowPositionSnapshotsRef.current;
    const liveIds = new Set();
    for (const node2 of nodes) {
      liveIds.add(node2.id);
      snapshots2.set(node2.id, {
        position: {
          x: node2.position.x,
          y: node2.position.y,
        },
        ...(node2.parentId
          ? {
              parentId: node2.parentId,
            }
          : {}),
      });
    }
    for (const id2 of snapshots2.keys()) {
      if (!liveIds.has(id2)) snapshots2.delete(id2);
    }
  }, [nodes]);
  const shouldRenderNodes = useInactiveNodeVirtualization(isPresented);
  const shellNodes = reactExports.useMemo(() => {
    if (!shouldRenderNodes) return EMPTY_SHELL_NODES;
    if (
      freshStickerIds.size === 0 &&
      stickerFollowPositions.size === 0 &&
      expandedMediaNodeId === null
    ) {
      return nodes;
    }
    return nodes.map((node2) => {
      const followPosition = stickerFollowPositions.get(node2.id);
      const isFresh = node2.type === CanvasNodeType.Sticker && freshStickerIds.has(node2.id);
      const keepsExpandedMediaVisible = node2.id === expandedMediaNodeId;
      const nodeWidth = node2.measured?.width ?? node2.width;
      const nodeHeight = node2.measured?.height ?? node2.height;
      const renderBounds =
        keepsExpandedMediaVisible && nodeWidth !== void 0 && nodeHeight !== void 0
          ? computeMultiImageRenderBounds(nodeWidth, nodeHeight)
          : void 0;
      if (!followPosition && !isFresh && !renderBounds) return node2;
      return {
        ...node2,
        ...(followPosition
          ? {
              position: followPosition,
            }
          : {}),
        ...(renderBounds
          ? {
              renderBounds,
            }
          : {}),
        ...(isFresh
          ? {
              data: {
                ...(node2.data ?? {}),
                __fresh: true,
              },
            }
          : {}),
      };
    });
  }, [expandedMediaNodeId, freshStickerIds, nodes, shouldRenderNodes, stickerFollowPositions]);
  const shellEdges = shouldRenderNodes ? edges : EMPTY_SHELL_EDGES;
  const persistenceController = usePersist({
    instance: instance2,
    dataSource,
    savedPositionsRef,
    hiddenAssetIdsRef,
    isHydrated: initialHydratedNodeCount !== null,
    onPersistenceStatusChange,
  });
  reactExports.useEffect(() => {
    onPersistenceControllerChange?.(persistenceController);
    return () => onPersistenceControllerChange?.(null);
  }, [onPersistenceControllerChange, persistenceController]);
  reactExports.useEffect(() => {
    if (!onDeleteTextFileIfEmpty) return;
    const pendingDeletePaths = new Map();
    const offIntercept = instance2.eventBus.intercept("node:removed", ({ nodeId }) => {
      const node2 = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
      const filePath = node2 ? getTextNodeBackingPath(node2, assetMetadataStore) : null;
      if (filePath) pendingDeletePaths.set(nodeId, filePath);
      else pendingDeletePaths.delete(nodeId);
      return true;
    });
    const offRemoved = instance2.eventBus.on("node:removed", ({ nodeId }) => {
      const filePath = pendingDeletePaths.get(nodeId);
      pendingDeletePaths.delete(nodeId);
      if (!filePath) return;
      if (
        hasOtherTextNodeWithBackingPath(
          instance2.getGraph().nodes,
          nodeId,
          filePath,
          assetMetadataStore,
        )
      ) {
        return;
      }
      void onDeleteTextFileIfEmpty(filePath).catch((err) => {
        console.warn("[canvas] failed to delete empty text backing file:", err);
      });
    });
    return () => {
      offIntercept();
      offRemoved();
      pendingDeletePaths.clear();
    };
  }, [assetMetadataStore, onDeleteTextFileIfEmpty, instance2]);
  reactExports.useEffect(() => {
    if (!onTextNodeRemoved) return;
    const removedTextNodeIds = new Set();
    const offIntercept = instance2.eventBus.intercept("node:removed", ({ nodeId }) => {
      const node2 = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
      if (node2?.type === CanvasNodeType.Text) removedTextNodeIds.add(nodeId);
      else removedTextNodeIds.delete(nodeId);
      return true;
    });
    const offRemoved = instance2.eventBus.on("node:removed", ({ nodeId }) => {
      if (!removedTextNodeIds.delete(nodeId)) return;
      onTextNodeRemoved(nodeId);
    });
    return () => {
      offIntercept();
      offRemoved();
      removedTextNodeIds.clear();
    };
  }, [instance2, onTextNodeRemoved]);
  const {
    executeGroup,
    cancelExecution: cancelGroupExecution,
    executingGroupIds,
  } = useGroupExecution(instance2);
  const executableChildCount = reactExports.useMemo(() => {
    if (selectedIds.length !== 1) return 0;
    const groupId2 = selectedIds[0];
    const groupNode = nodes.find((n2) => n2.id === groupId2);
    if (!groupNode || groupNode.type !== CanvasNodeType.Group) return 0;
    let count2 = 0;
    for (const n2 of nodes) {
      if (n2.parentId === groupId2 && isReexecutableGenerationNode(n2)) {
        count2++;
      }
    }
    return count2;
  }, [nodes, selectedIds]);
  const createPlaceholderFillGuard = reactExports.useCallback(
    (nodeId) => {
      const target = instance2.getGraph().nodes.find((node2) => node2.id === nodeId);
      return () =>
        Boolean(
          target?.isEmpty &&
          !target.assetId &&
          instance2.getGraph().nodes.find((node2) => node2.id === nodeId) === target,
        );
    },
    [instance2],
  );
  const fillEmptyPlaceholderWithAsset = reactExports.useCallback(
    (nodeId, payload, opts) => {
      const target = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
      if (!target) return false;
      const data2 = buildPlaceholderFillData(target.data ?? {}, !!opts?.staged);
      data2.name = payload.name;
      data2.path = payload.path;
      if (payload.intrinsicWidth != null) data2.width = payload.intrinsicWidth;
      if (payload.intrinsicHeight != null) data2.height = payload.intrinsicHeight;
      const fill = {
        type: payload.type,
        assetId: payload.assetId,
        data: data2,
        size: payload.size,
      };
      if (opts?.staged) {
        instance2.stagePlaceholderFill(nodeId, fill);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      } else {
        instance2.markPlaceholderFilled(nodeId, fill);
      }
      const runtimeNode = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
      if (runtimeNode) {
        savedPositionsRef.current?.set(nodeId, {
          id: nodeId,
          type: payload.type,
          assetId: payload.assetId,
          positions: {
            ...runtimeNode.positions,
          },
          ...(payload.size
            ? {
                size: payload.size,
              }
            : {}),
          data: data2,
        });
      }
      const fakeFileNode = {
        id: payload.assetId,
        type: payload.type,
        assetId: payload.assetId,
        size: payload.size,
        data: data2,
      };
      const { meta: meta2 } = buildIncrementalNodeData(
        fakeFileNode,
        dataSource.resolveFileUrlById?.bind(dataSource),
      );
      if (meta2) {
        assetMetadataStore.getState().setMany([
          [payload.assetId, meta2],
          [nodeId, meta2],
        ]);
      }
      return true;
    },
    [assetMetadataStore, instance2, savedPositionsRef, dataSource],
  );
  const getIncomingSourceIdsForHandle = reactExports.useCallback(
    (nodeId) => {
      const sources = [];
      for (const edge of instance2.getGraph().edges) {
        if (edge.target === nodeId) sources.push(edge.source);
      }
      return sources;
    },
    [instance2],
  );
  const collectFileNodeRefsForHandle = reactExports.useCallback(
    (nodeIds) => {
      const graphNodes = instance2.getGraph().nodes;
      const childrenByParent = new Map();
      const nodeById = new Map();
      for (const n2 of graphNodes) {
        nodeById.set(n2.id, n2);
        if (!n2.parentId) continue;
        const arr = childrenByParent.get(n2.parentId);
        if (arr) arr.push(n2);
        else childrenByParent.set(n2.parentId, [n2]);
      }
      const assetStore = assetMetadataStore.getState();
      const out = [];
      const visited = new Set();
      const walk = (id2) => {
        if (visited.has(id2)) return;
        visited.add(id2);
        const node2 = nodeById.get(id2);
        if (!node2) return;
        if (node2.type === CanvasNodeType.Group) {
          for (const child of childrenByParent.get(id2) ?? []) walk(child.id);
          return;
        }
        if (node2.type === CanvasNodeType.Table) {
          const tablePath = node2.data?.tablePath;
          if (tablePath)
            out.push({
              nodeId: id2,
              filePath: tablePath,
              fileType: "table",
            });
          return;
        }
        if (isAssetBackedNode(node2.type)) {
          const { assetId } = parseNodeId(id2);
          const meta2 = assetStore.get(assetId);
          if (meta2?.path)
            out.push({
              nodeId: id2,
              filePath: meta2.path,
              fileType: meta2.type,
            });
          return;
        }
      };
      for (const id2 of nodeIds) walk(id2);
      return out;
    },
    [instance2, assetMetadataStore],
  );
  const handleDownloadSelectedFiles = reactExports.useCallback(
    (nodeIds) => {
      if (!onSaveManyAs) return;
      const seen2 = new Set();
      const files = [];
      for (const ref of collectFileNodeRefsForHandle(nodeIds)) {
        if (seen2.has(ref.filePath)) continue;
        seen2.add(ref.filePath);
        files.push({
          filePath: ref.filePath,
          fileName: ref.filePath.split(/[/\\]/).pop() ?? ref.filePath,
        });
      }
      if (files.length === 0) return;
      onSaveManyAs(files);
    },
    [collectFileNodeRefsForHandle, onSaveManyAs],
  );
  const groupAddToChatTargets = reactExports.useMemo(() => {
    if (selectedIds.length !== 1) return [];
    const groupId2 = selectedIds[0];
    const groupNode = nodes.find((n2) => n2.id === groupId2);
    if (!groupNode || groupNode.type !== CanvasNodeType.Group) return [];
    const nodeById = new Map(nodes.map((node2) => [node2.id, node2]));
    return collectFileNodeRefsForHandle([groupId2]).map(({ nodeId, filePath, fileType }) => {
      const fileNode = nodeById.get(nodeId);
      const title =
        fileType === "table"
          ? fileNode?.data?.title?.trim() || t2("canvas.table.untitled", "Untitled table")
          : void 0;
      return {
        filePath,
        filename: title ? `${title}.htable` : (filePath.split("/").pop() ?? filePath),
        nodeId,
      };
    });
  }, [collectFileNodeRefsForHandle, nodes, selectedIds, t2]);
  const findNodeIdByFilePathForHandle = reactExports.useCallback(
    (rawPath) => {
      if (!rawPath) return null;
      const assetStore = assetMetadataStore.getState();
      const graphNodes = instance2.getGraph().nodes;
      const candidates2 = [];
      for (const node2 of graphNodes) {
        if (node2.type === CanvasNodeType.Group) continue;
        if (node2.type === CanvasNodeType.Table) {
          candidates2.push({
            nodeId: node2.id,
            path: node2.data?.tablePath,
          });
          continue;
        }
        const { assetId } = parseNodeId(node2.id);
        const meta2 = assetStore.get(assetId);
        candidates2.push({
          nodeId: node2.id,
          path: meta2?.path,
        });
      }
      return resolveFileNodeIdByPath(rawPath, candidates2);
    },
    [instance2, assetMetadataStore],
  );
  const findNodeIdByPartialFileName = reactExports.useCallback(
    (rawName) => {
      const assetStore = assetMetadataStore.getState();
      const candidates2 = instance2.getGraph().nodes.flatMap((node2) => {
        if (node2.type === CanvasNodeType.Group) return [];
        const data2 = node2.data;
        const assetId =
          node2.assetId ??
          (typeof data2?.assetId === "string" ? data2.assetId : void 0) ??
          parseNodeId(node2.id).assetId;
        const meta2 = assetStore.get(assetId) ?? assetStore.get(node2.id);
        const path2 =
          node2.type === CanvasNodeType.Table && typeof data2?.tablePath === "string"
            ? data2.tablePath
            : (meta2?.path ?? (typeof data2?.path === "string" ? data2.path : void 0));
        const name2 =
          typeof data2?.name === "string"
            ? data2.name
            : typeof meta2?.name === "string"
              ? meta2.name
              : void 0;
        return [
          {
            nodeId: node2.id,
            name: name2,
            path: path2,
          },
        ];
      });
      return resolveFirstFileNodeIdByPartialName(rawName, candidates2);
    },
    [instance2, assetMetadataStore],
  );
  reactExports.useImperativeHandle(
    handleRef,
    () => ({
      getPersistenceStatus: persistenceController.getStatus,
      flushPersistence: persistenceController.flushAndWaitLatest,
      getDropPosition,
      clientToFlowPosition,
      getIncomingSourceIds: getIncomingSourceIdsForHandle,
      createPlaceholderFillGuard,
      fillEmptyPlaceholderWithAsset,
      collectFileNodeRefs: collectFileNodeRefsForHandle,
      focusNodeIds: focusNodeIdsRef.current,
      focusDerivedNode,
      cancelPendingFocus: () => cancelPendingFocusRef.current(),
      findNodeIdByFilePath: findNodeIdByFilePathForHandle,
      findNodeIdsByFilePaths: (paths) => [
        ...new Set(paths.map(findNodeIdByFilePathForHandle).filter((nodeId) => Boolean(nodeId))),
      ],
    }),
    [
      getDropPosition,
      clientToFlowPosition,
      getIncomingSourceIdsForHandle,
      createPlaceholderFillGuard,
      fillEmptyPlaceholderWithAsset,
      collectFileNodeRefsForHandle,
      focusDerivedNode,
      findNodeIdByFilePathForHandle,
      persistenceController,
    ],
  );
  reactExports.useEffect(() => {
    const workspaceId2 = getCurrentWorkspace?.();
    const sync = () =>
      useCanvasNodeAssetsStore.getState().setFromNodes(
        workspaceId2,
        // Index by each node's REAL backing asset id (node.assetId →
        // data.assetId → parseNodeId fallback for legacy assetId-encoded ids).
        // Node ids are decoupled random UUIDs now, so reverse lookups must key
        // off the asset id, not the node id — otherwise chat / file-explorer
        // "locate on canvas" silently no-ops for generated media.
        instance2.getGraph().nodes.map((n2) => ({
          nodeId: n2.id,
          assetId: n2.assetId ?? n2.data?.assetId ?? parseNodeId(n2.id).assetId,
        })),
      );
    sync();
    return instance2.onGraphChange(sync);
  }, [getCurrentWorkspace, instance2]);
  reactExports.useEffect(() => {
    const workspaceId2 = getCurrentWorkspace?.();
    return () => useCanvasNodeAssetsStore.getState().clearWorkspace(workspaceId2);
  }, [getCurrentWorkspace]);
  const prevTasksRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    const next2 = getCanvasTaskSnapshots(nodes, generatingByNode);
    const prev = prevTasksRef.current;
    if (
      next2.length === prev.length &&
      next2.every(
        (t22, i2) =>
          t22.id === prev[i2].id && t22.label === prev[i2].label && t22.detail === prev[i2].detail,
      )
    ) {
      return;
    }
    prevTasksRef.current = next2;
    const snapshot2 = next2;
    queueMicrotask(() => onCanvasTasksChange?.(snapshot2));
  }, [nodes, generatingByNode, onCanvasTasksChange]);
  const {
    zoomIn,
    zoomOut,
    zoomTo,
    fitView,
    screenToFlowPosition,
    setCenter,
    setViewport,
    getViewport,
  } = useReactFlow();
  const reactFlowInstance = useReactFlow();
  const storeApi = useStoreApi();
  const scheduleCanvasFocusRef = reactExports.useRef((_nodeIds, _options) => {});
  const focusNodeIdsRef = reactExports.useRef(() => {});
  const cancelPendingFocusRef = reactExports.useRef(() => {});
  focusNodeIdsRef.current = (nodeIds, options) => {
    if (nodeIds.length === 0) return;
    const zoom2 = options?.zoom ?? (options?.preserveZoom ? "preserve" : void 0);
    scheduleCanvasFocusRef.current(nodeIds, {
      delay: options?.expandAncestorGroups && canvasFocus.expand(instance2, nodeIds) ? 120 : 300,
      padding: 0.3,
      duration: 400,
      visibilityPriority: options?.visibilityPriority,
      zoom: zoom2,
    });
  };
  const syncStableZoomFromViewport = reactExports.useCallback(() => {
    syncStableZoomSignals(getViewport().zoom);
  }, [getViewport]);
  const syncStableZoomAfterViewportChange = reactExports.useCallback(
    (result) => syncStableZoomAfter(result, () => getViewport().zoom),
    [getViewport],
  );
  const focusScheduler = reactExports.useMemo(
    () =>
      createCanvasFocusScheduler({
        isMeasured: (nodeIds) => {
          const nodeLookup = storeApi.getState().nodeLookup;
          return nodeIds.every((id2) => {
            const node2 = nodeLookup.get(id2);
            return Boolean(node2?.measured?.width && node2.measured.height);
          });
        },
        fit: ({ nodeIds, padding, duration, visibilityPriority, zoom: zoom2 }) => {
          if (visibilityPriority && zoom2 === void 0) {
            applyVisibilityPriorityFocus({
              duration,
              getViewport,
              minReadableZoom: visibilityPriority.minReadableZoom,
              minZoom: CANVAS_MIN_ZOOM,
              nodeIds,
              padding,
              setCenter,
              setViewport,
              state: storeApi.getState(),
              syncViewportChange: syncStableZoomAfterViewportChange,
            });
            return;
          }
          if (zoom2 === void 0) {
            syncStableZoomAfterViewportChange(
              fitView({
                nodes: nodeIds.map((id2) => ({
                  id: id2,
                })),
                padding,
                maxZoom: 1,
                duration,
              }),
            );
            return;
          }
          const nodeLookup = storeApi.getState().nodeLookup;
          let minX = Number.POSITIVE_INFINITY;
          let minY = Number.POSITIVE_INFINITY;
          let maxX = Number.NEGATIVE_INFINITY;
          let maxY = Number.NEGATIVE_INFINITY;
          for (const id2 of nodeIds) {
            const node2 = nodeLookup.get(id2);
            const width = node2?.measured?.width;
            const height = node2?.measured?.height;
            if (!node2 || !width || !height) return;
            const position2 = node2.internals.positionAbsolute;
            minX = Math.min(minX, position2.x);
            minY = Math.min(minY, position2.y);
            maxX = Math.max(maxX, position2.x + width);
            maxY = Math.max(maxY, position2.y + height);
          }
          if (!Number.isFinite(minX)) return;
          const targetZoom =
            zoom2 === "preserve"
              ? getViewport().zoom
              : Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom2));
          syncStableZoomAfterViewportChange(
            setCenter((minX + maxX) / 2, (minY + maxY) / 2, {
              zoom: targetZoom,
              duration,
            }),
          );
        },
      }),
    [fitView, getViewport, setCenter, setViewport, storeApi, syncStableZoomAfterViewportChange],
  );
  scheduleCanvasFocusRef.current = (nodeIds, options) =>
    focusScheduler.request({
      nodeIds,
      ...options,
    });
  cancelPendingFocusRef.current = focusScheduler.cancel;
  reactExports.useEffect(() => () => focusScheduler.dispose(), [focusScheduler]);
  const isActiveRef = reactExports.useRef(isActive2);
  isActiveRef.current = isActive2;
  const isPresentedRef = reactExports.useRef(isPresented);
  isPresentedRef.current = isPresented;
  const onNewNodesNavigateRef = reactExports.useRef(onNewNodesNavigate);
  reactExports.useEffect(() => {
    onNewNodesNavigateRef.current = onNewNodesNavigate;
  }, [onNewNodesNavigate]);
  reactExports.useEffect(() => {
    handleFirstNodesPlacedRef.current = (ids2) => {
      if (
        !shouldRecenterFirstNodes({
          canvasPresented: isPresentedRef.current,
          nodeCount: ids2.length,
        })
      ) {
        return;
      }
      const graph = instance2.getGraph();
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const id2 of ids2) {
        const node2 = graph.nodes.find((n2) => n2.id === id2);
        const pos = node2?.positions?.[mode2];
        if (!node2 || !pos) continue;
        const size2 = node2.size ?? defaultNodeSizeForType(node2.type);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + size2.width);
        maxY = Math.max(maxY, pos.y + size2.height);
      }
      if (Number.isFinite(minX)) {
        const cx2 = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const { zoom: zoom2 } = getViewport();
        void setCenter(cx2, cy, {
          zoom: zoom2,
        });
      }
    };
    handleNodesAddedRef.current = (ids2) => {
      if (ids2.length === 0) return;
      recentlyAddedApi.getState().addMany(ids2);
      for (const id2 of ids2) {
        if (!pendingNodeIdsRef.current.includes(id2)) {
          pendingNodeIdsRef.current.push(id2);
        }
      }
      const allIds = pendingNodeIdsRef.current;
      const isCrossWorkspace = !isActive2;
      let message2;
      if (isCrossWorkspace && workspaceName) {
        message2 =
          allIds.length === 1
            ? t2("canvas.newNodeReady.crossWorkspace", {
                workspace: workspaceName,
                defaultValue: "{{workspace}} 中节点已生成",
              })
            : t2("canvas.newNodesReady.crossWorkspace", {
                count: allIds.length,
                workspace: workspaceName,
                defaultValue: "{{workspace}} 中 {{count}} 个节点已生成",
              });
      } else {
        message2 =
          allIds.length === 1
            ? t2("canvas.newNodeReady", "节点已经生成好了，去看看")
            : t2("canvas.newNodesReady", {
                count: allIds.length,
                defaultValue: "{{count}} 个节点已生成，去看看",
              });
      }
      dedupedToast(message2, {
        id: newNodesToastId,
        duration: 8e3,
        action: {
          label: t2("canvas.newNodeReady.action", "去看看"),
          onClick: () => {
            const action = resolveNewNodesToastAction({
              projectActive: isActiveRef.current,
              canvasPresented: isPresentedRef.current,
            });
            if (action === "navigate") {
              onNewNodesNavigateRef.current?.(allIds.slice());
              return;
            }
            const existing = allIds.filter((id2) =>
              instance2.getGraph().nodes.some((n2) => n2.id === id2),
            );
            if (existing.length === 0) return;
            const targets = existing.map((id2) => ({
              id: id2,
            }));
            const opts = {
              nodes: targets,
              padding: 0.05,
              maxZoom: CANVAS_MAX_ZOOM,
              duration: 300,
            };
            void fitView(opts).then((fitted) => {
              syncStableZoomFromViewport();
              if (!fitted) {
                setTimeout(() => syncStableZoomAfterViewportChange(fitView(opts)), 500);
              }
            });
          },
        },
        onDismiss: () => {
          pendingNodeIdsRef.current = [];
        },
        onAutoClose: () => {
          pendingNodeIdsRef.current = [];
        },
      });
    };
  }, [
    fitView,
    setCenter,
    getViewport,
    mode2,
    syncStableZoomAfterViewportChange,
    syncStableZoomFromViewport,
    t2,
    recentlyAddedApi,
    instance2,
    isActive2,
    newNodesToastId,
    workspaceName,
  ]);
  const lastSelectionRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!onSelectionChange) return;
    const prev = lastSelectionRef.current;
    if (
      prev &&
      prev.length === selectedIds.length &&
      prev.every((id2, i2) => id2 === selectedIds[i2])
    ) {
      return;
    }
    lastSelectionRef.current = selectedIds;
    onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);
  usePasteNodeTransformer({
    instance: instance2,
    duplicateTextAsset,
    duplicateFileAsset,
    duplicateTableAsset,
    duplicateAssetByPath,
    getCurrentWorkspace,
  });
  reactExports.useEffect(() => {
    return;
  }, [reactFlowInstance, assetMetadataStore]);
  const {
    contextMenu,
    paneContextMenu,
    selectionChromeSuppressed,
    closeContextMenu,
    closePaneContextMenu,
    closeAllMenus,
    getAddNodePosition,
    openContextMenuAt,
    handleNodeContextMenu,
    handleSelectionContextMenu,
    restoreSelectionChrome,
    dispatchNodeMenu,
    handlePaneAddNode,
    handlePaneContextMenu,
    handlePaneDoubleClick,
    handlePanePaste,
    handlePaneUpload,
  } = useCanvasContextMenus({
    instance: instance2,
    onNodeContextMenu: bridgeContextMenu,
    onUpload: bridgeUpload,
    onRequestSystemPaste: onRequestSystemPaste
      ? (position2) => {
          pendingMenuPastePositionRef.current = position2;
          onRequestSystemPaste();
          window.setTimeout(() => {
            if (pendingMenuPastePositionRef.current === position2) {
              pendingMenuPastePositionRef.current = null;
            }
          }, 1e3);
        }
      : void 0,
    onSystemCopy,
    getCurrentWorkspace,
    screenToFlowPosition,
  });
  const addNodeWithRecenter = reactExports.useCallback(
    (props) => {
      commands.addNode(props);
      if (!props.position) return;
      const size2 = props.size ?? defaultNodeSizeForType(props.type);
      const cx2 = props.position.x + size2.width / 2;
      const cy = props.position.y + size2.height / 2;
      const currentZoom = storeApi.getState().transform[2];
      void setCenter(cx2, cy, {
        zoom: currentZoom,
        duration: 300,
      });
    },
    [commands, setCenter, storeApi],
  );
  const connectCommands = reactExports.useMemo(
    () => ({
      addNode: addNodeWithRecenter,
    }),
    [addNodeWithRecenter],
  );
  const bridgeAddNode = useCanvasAddNode({
    saveTableContent,
    addNode: addNodeWithRecenter,
    getPosition: getAddNodePosition,
    getLastUsedModelParams,
  });
  const loadSourceText = reactExports.useCallback(
    async (nodeId) => {
      if (!loadTextContent) return "";
      const meta2 = getAssetMetaByNodeIdFromStore(assetMetadataStore, nodeId);
      if (!meta2?.path) return "";
      try {
        return await loadTextContent(meta2.path);
      } catch {
        return "";
      }
    },
    [loadTextContent, assetMetadataStore],
  );
  const {
    connectionSource,
    openAddNodeMenu,
    openAddNodeMenuFromMulti,
    wireEdgesFromMultiToTarget,
    handleConnectEnd,
    toolbarProps: addNodeToolbarProps,
    content: addNodeMenuContent,
  } = useCanvasAddNodeMenus({
    instance: instance2,
    commands: connectCommands,
    bridgeAddNode,
    bridgeInstantiatePlugin: onInstantiatePlugin,
    openContextMenuAt,
    getAddNodePosition,
    onNodeAdd,
    loadSourceText,
    getLastUsedModelParams,
    contextMenu,
    closeContextMenu,
    getDropPosition,
    openDefaultMenu: () => commandRegistry.execute(CANVAS_COMMAND_IDS.addNode),
    onDeactivate: () => setActiveCommand(null),
  });
  const canvasActions = reactExports.useMemo(
    () => ({
      updateNodeData: (nodeId, data2) => {
        instance2.updateNodeData(nodeId, data2);
        instance2.eventBus.emit({
          type: "persist:request",
        });
      },
      mergeNodeData: (nodeId, patch2) => {
        instance2.mergeNodeData(nodeId, patch2);
        instance2.eventBus.emit({
          type: "persist:request",
        });
      },
      setStickerSelectionAsset: handleStickerAssetChange,
      setStickerSelectionEmoji: handleStickerEmojiChange,
      mergeNodeDataSilent: (nodeId, patch2) => {
        instance2.mergeNodeDataSilent(nodeId, patch2);
      },
      setNodeHidden: (nodeId, hidden) => {
        instance2.updateNodesMeta([nodeId], {
          hidden,
        });
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      updateNodeDataSilent: (nodeId, data2) => {
        instance2.updateNodeDataSilent(nodeId, data2);
      },
      ...createCanvasResizeActions(instance2),
      resizeGroupNode: (groupId2, x2, y4, width, height) => {
        instance2.resizeGroupNode(
          groupId2,
          {
            x: x2,
            y: y4,
          },
          {
            width,
            height,
          },
        );
        instance2.eventBus.emit({
          type: "persist:request",
        });
      },
      replaceNodeId: (oldId, newId2) => {
        instance2.replaceNodeId(oldId, newId2);
        savedPositionsRef.current?.delete(oldId);
        const map3 = replacedIdsRef.current;
        map3.set(oldId, newId2);
        if (map3.size > 200) {
          const first2 = map3.keys().next().value;
          if (first2 !== void 0) map3.delete(first2);
        }
      },
      promoteCloneToPrimary: (nodeId, forked) => {
        instance2.promoteCloneToPrimary(nodeId, forked);
      },
      savePopoverDraft: (nodeId, key2, draft) => {
        const node2 = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
        if (!node2) return;
        const prevData = node2.data ?? {};
        const prevMap = prevData[POPOVER_DRAFT_DATA_KEY] ?? {};
        const nextMap = {
          ...prevMap,
        };
        if (draft === void 0) delete nextMap[key2];
        else
          nextMap[key2] = {
            ...draft,
            source: draft.source ?? "user",
          };
        const nextData = {
          ...prevData,
        };
        if (Object.keys(nextMap).length === 0) delete nextData[POPOVER_DRAFT_DATA_KEY];
        else nextData[POPOVER_DRAFT_DATA_KEY] = nextMap;
        instance2.updateNodeDataSilent(nodeId, nextData);
      },
      openAddNodeMenu,
      openAddNodeMenuFromMulti,
      focusNodeIds: (nodeIds, options) => focusNodeIdsRef.current(nodeIds, options),
      findNodeIdByPartialFileName,
      focusDerivedNode,
      focusNextDerivedFrom,
      attachDraftOnNextDerived,
      getIncomingSourceIds: (nodeId) => {
        const sources = [];
        for (const edge of instance2.getGraph().edges) {
          if (edge.target === nodeId) sources.push(edge.source);
        }
        return sources;
      },
      getOutgoingTargetIds: (nodeId) => {
        const targets = [];
        for (const edge of instance2.getGraph().edges) {
          if (edge.source === nodeId) targets.push(edge.target);
        }
        return targets;
      },
      subscribeGraphChange: (cb) => instance2.onGraphChange(() => cb()),
      subscribeNodeDataChange: (nodeId, cb) => {
        return instance2.eventBus.on("node:data-changed", ({ nodeId: id2, data: data2 }) => {
          if (id2 !== nodeId) return;
          cb(data2);
        });
      },
      subscribeIncomingChange: (nodeId, cb) => {
        let incomingEdgeIds = new Set();
        for (const e2 of instance2.getGraph().edges) {
          if (e2.target === nodeId) incomingEdgeIds.add(e2.id);
        }
        const offAdd = instance2.eventBus.on("edge:added", ({ edge }) => {
          if (edge.target !== nodeId) return;
          incomingEdgeIds.add(edge.id);
          cb();
        });
        const offRemove = instance2.eventBus.on("edge:removed", ({ edgeId }) => {
          if (!incomingEdgeIds.delete(edgeId)) return;
          cb();
        });
        const offHistory = instance2.history.onHistoryChange(() => {
          const next2 = new Set();
          for (const e2 of instance2.getGraph().edges) {
            if (e2.target === nodeId) next2.add(e2.id);
          }
          if (next2.size !== incomingEdgeIds.size) {
            incomingEdgeIds = next2;
            cb();
            return;
          }
          for (const id2 of next2) {
            if (!incomingEdgeIds.has(id2)) {
              incomingEdgeIds = next2;
              cb();
              return;
            }
          }
        });
        return () => {
          offAdd();
          offRemove();
          offHistory();
        };
      },
      getNodeIdByPath: (path2) => {
        if (!path2) return null;
        const store = assetMetadataStore.getState();
        const nodes2 = instance2.getGraph().nodes;
        const matches2 = [];
        for (const n2 of nodes2) {
          const nodeAssetId = n2.data?.assetId;
          if (typeof nodeAssetId !== "string") continue;
          const meta2 = store.get(nodeAssetId) ?? store.get(n2.id);
          if (meta2?.path === path2) matches2.push(n2);
        }
        if (matches2.length === 0) return null;
        const origin = matches2.find((n2) => n2.meta?.cloneOf == null);
        return (origin ?? matches2[0]).id;
      },
      ensureStandaloneNodeForPath: (path2) => {
        if (!path2) return null;
        const store = assetMetadataStore.getState();
        const nodes2 = instance2.getGraph().nodes;
        const matches2 = [];
        for (const n2 of nodes2) {
          const nodeAssetId = n2.data?.assetId;
          if (typeof nodeAssetId !== "string") continue;
          const meta2 = store.get(nodeAssetId) ?? store.get(n2.id);
          if (meta2?.path === path2) matches2.push(n2);
        }
        if (matches2.length === 0) return null;
        const origin = matches2.find((n2) => n2.meta?.cloneOf == null);
        const picked = origin ?? matches2[0];
        if (picked.meta?.hidden === true && picked.groupId) {
          const detachedId = instance2.detachSubImageToFreeSlot(picked.id);
          if (detachedId) return detachedId;
        }
        return picked.id;
      },
      ensureStandaloneNodeById: (nodeId) => {
        if (!nodeId) return null;
        const picked = instance2.getGraph().nodes.find((node2) => node2.id === nodeId);
        if (!picked) return null;
        if (picked.meta?.hidden === true && picked.groupId) {
          return instance2.detachSubImageToFreeSlot(picked.id) ?? null;
        }
        return picked.id;
      },
      getIncomingSourceNodeIdByPath: (targetNodeId, path2) => {
        if (!targetNodeId || !path2) return null;
        const graph = instance2.getGraph();
        const store = assetMetadataStore.getState();
        for (const edge of graph.edges) {
          if (edge.target !== targetNodeId || edge.type !== "derivation") continue;
          const source = graph.nodes.find((node2) => node2.id === edge.source);
          if (!source) continue;
          const sourceAssetId = source.data?.assetId;
          if (typeof sourceAssetId !== "string") continue;
          const meta2 = store.get(sourceAssetId) ?? store.get(source.id);
          if (meta2?.path === path2) return source.id;
        }
        return null;
      },
      getNodeById: (nodeId) => {
        if (!nodeId) return null;
        const node2 = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
        if (!node2) return null;
        const mode22 = instance2.getMode();
        const nodeAssetId = node2.assetId;
        return {
          id: node2.id,
          type: node2.type,
          position: getNodePosition(node2, mode22),
          size: sizeOf(node2, mode22),
          data: node2.data ?? {},
          ...(typeof nodeAssetId === "string" && nodeAssetId.length > 0
            ? {
                assetId: nodeAssetId,
              }
            : {}),
          ...(node2.meta
            ? {
                meta: node2.meta,
              }
            : {}),
          ...(node2.groupId
            ? {
                groupId: node2.groupId,
              }
            : {}),
          ...(Number.isInteger(node2.round)
            ? {
                round: node2.round,
              }
            : {}),
          ...(node2.isEmpty
            ? {
                isEmpty: true,
              }
            : {}),
        };
      },
      getSubImages: (mainId) => instance2.getSubImagesByParent(mainId),
      promoteSubImageToMain: (subId, opts) => {
        instance2.promoteSubImageToMain(subId, opts);
      },
      detachSubImage: (subId, absPosition) => {
        instance2.detachSubImage(subId, absPosition);
      },
      detachSubImages: (entries2) => {
        instance2.detachSubImages(entries2);
      },
      ensureDerivationEdge: (sourceId, targetId) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        const id2 = deriveEdgeId(sourceId, targetId);
        const edges2 = instance2.getGraph().edges;
        if (edges2.some((e2) => e2.id === id2)) return;
        instance2.addEdge({
          id: id2,
          source: sourceId,
          target: targetId,
          type: "derivation",
        });
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      removeDerivationEdge: (sourceId, targetId) => {
        if (!sourceId || !targetId) return;
        const id2 = deriveEdgeId(sourceId, targetId);
        const edges2 = instance2.getGraph().edges;
        if (!edges2.some((e2) => e2.id === id2)) return;
        instance2.removeEdges([id2]);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      ungroupNode: (groupId2) => {
        instance2.ungroup(groupId2);
      },
      selectNodeExclusive: (nodeId) => {
        instance2.selection.set([nodeId]);
      },
      clearSelection: () => {
        instance2.selection.clear();
      },
      removeNode: (nodeId) => {
        instance2.removeNode(nodeId);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      copyNode: (nodeId) => {
        const isSelected = instance2.selection.getSelected().includes(nodeId);
        if (!isSelected) instance2.selection.set([nodeId]);
        instance2.copySelected({
          workspace: getCurrentWorkspace?.(),
          resolveAssetPath: (assetId) => assetMetadataStore.getState().get(assetId)?.path,
        });
        void instance2.pasteFromClipboard();
      },
      openNodeContextMenu: (event, nodeId) => {
        dispatchNodeMenu(event, nodeId);
      },
      closeContextMenus: () => {
        closeAllMenus();
      },
      relayoutGroup: (groupId2, layout) => {
        instance2.relayoutGroup(groupId2, layout);
      },
      tidyGroupChildren: (groupId2, layout) => {
        void tidySort.finish(commands.tidyGroupChildren(groupId2, layout, true, tidySort.sortBy));
      },
      setGroupCollapsed: (groupId2, collapsed) => {
        instance2.setGroupCollapsed(groupId2, collapsed);
      },
      addTableNodeFromDocument: async (doc2, sourceNodeId) => {
        if (!saveTableContent) {
          console.warn("[canvas] saveTableContent bridge not provided");
          return null;
        }
        const tablePath = newTablePath();
        const tableNodeId = crypto.randomUUID();
        const source =
          sourceNodeId && instance2.getGraph().nodes.some((n2) => n2.id === sourceNodeId)
            ? sourceNodeId
            : void 0;
        try {
          await saveTableContent(tablePath, serializeTableDocument(doc2));
          const position2 = source
            ? getDerivedNodePosition(
                reactFlowInstance,
                source,
                instance2.getGraph().edges,
                TABLE_CARD_DEFAULT_SIZE.width,
              )
            : getAddNodePosition();
          addNodeWithRecenter({
            type: CanvasNodeType.Table,
            id: tableNodeId,
            data: {
              tablePath,
            },
            position: position2,
            size: TABLE_CARD_DEFAULT_SIZE,
          });
          if (source) {
            instance2.addEdge({
              id: deriveEdgeId(source, tableNodeId),
              source,
              target: tableNodeId,
              type: "derivation",
            });
            instance2.eventBus.emit({
              type: "persist:flush",
            });
          }
          return tableNodeId;
        } catch (err) {
          console.error("[canvas] Failed to create table node from document:", err);
          return null;
        }
      },
      flushPersist: () => {
        let pending2;
        instance2.eventBus.emit({
          type: "persist:flush",
          waitUntil: (promise) => {
            pending2 = promise;
          },
        });
        return pending2 ?? Promise.resolve();
      },
      fillEmptyPlaceholder: (nodeId, payload) =>
        // Staged: this action backs the text-node lazy-asset attach when manual
        // editing begins; file attachment is bookkeeping, not an undo step.
        // See the `staged` option doc on HiloCanvasViewHandle.
        fillEmptyPlaceholderWithAsset(nodeId, payload, {
          staged: true,
        }),
    }),
    [
      instance2,
      assetMetadataStore,
      handleStickerAssetChange,
      handleStickerEmojiChange,
      getCurrentWorkspace,
      savedPositionsRef,
      openAddNodeMenu,
      openAddNodeMenuFromMulti,
      findNodeIdByPartialFileName,
      focusDerivedNode,
      focusNextDerivedFrom,
      attachDraftOnNextDerived,
      dispatchNodeMenu,
      closeAllMenus,
      commands,
      tidySort,
      saveTableContent,
      addNodeWithRecenter,
      getAddNodePosition,
      reactFlowInstance,
      fillEmptyPlaceholderWithAsset,
    ],
  );
  const handleGroupSelected = reactExports.useCallback(
    (ids2) => {
      instance2.groupNodes(ids2);
    },
    [instance2],
  );
  const handleUngroupGroup = reactExports.useCallback(
    (groupId2) => {
      instance2.ungroup(groupId2);
    },
    [instance2],
  );
  const isCanvasDropDrag = reactExports.useCallback((event) => {
    const types2 = Array.from(event.dataTransfer.types);
    return types2.includes(RESOURCE_DRAG_MIME) || types2.includes("Files");
  }, []);
  const handleCanvasDragEnter = reactExports.useCallback(
    (event) => {
      if (!isCanvasDropDrag(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
    },
    [isCanvasDropDrag],
  );
  const handleCanvasDragOver = reactExports.useCallback(
    (event) => {
      if (!isCanvasDropDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isCanvasDropDrag],
  );
  const handleCanvasDragLeave = reactExports.useCallback(
    (event) => {
      if (!isCanvasDropDrag(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    },
    [isCanvasDropDrag],
  );
  const handleCanvasDrop = reactExports.useCallback(
    (event) => {
      const items = parseResourceDrag(event);
      const files = Array.from(event.dataTransfer.files ?? []);
      if ((!items || items.length === 0) && files.length === 0) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      const position2 = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (items && items.length > 0) {
        onResourceDrop?.(items, position2);
        return;
      }
      if (files.length > 0) {
        onNativeFileDrop?.(files, position2);
      }
    },
    [onNativeFileDrop, onResourceDrop, screenToFlowPosition],
  );
  const handleSortByConnections = reactExports.useCallback(() => commands.autoLayout(), [commands]);
  const handleSortByMediaType = reactExports.useCallback(
    () => commands.autoLayoutByCategory(),
    [commands],
  );
  const handleTidyCanvasLayout = reactExports.useCallback(
    (layout, includeDeps) => {
      return tidySort.finish(commands.autoLayoutAll(layout, includeDeps, tidySort.sortBy));
    },
    [commands, tidySort],
  );
  const handleTidySubset = reactExports.useCallback(
    (layout, includeDeps) => {
      return tidySort.finish(
        commands.autoLayoutSubset(selectedIds, layout, includeDeps, tidySort.sortBy),
      );
    },
    [commands, selectedIds, tidySort],
  );
  const handleTidyGroup = reactExports.useCallback(
    (groupId2, layout, includeDeps) => {
      return tidySort.finish(
        commands.tidyGroupChildren(groupId2, layout, includeDeps, tidySort.sortBy),
      );
    },
    [commands, tidySort],
  );
  const handleTidyGroupChildren = reactExports.useCallback(
    (groupId2, childIds, layout) => {
      return tidySort.finish(
        commands.tidyGroupChildrenSubset(groupId2, childIds, layout, tidySort.sortBy),
      );
    },
    [commands, tidySort],
  );
  const handleTidyBlocked = reactExports.useCallback(() => {
    dedupedToast(
      t2("canvas.tidy.mixedSelection", "跨编组或编组内外混选时无法布局，请只选中同一编组内的元素"),
    );
  }, [t2]);
  const { canUndo, canRedo } = useHistoryState(instance2);
  reactExports.useEffect(() => {
    return instance2.eventBus.on("history:blocked", ({ direction, reason }) => {
      dedupedToast.warning(historyBlockedMessage(t2, direction, reason), {
        id: getCanvasToastId("history-blocked", workspaceContentBudgetScope),
      });
    });
  }, [instance2, t2, workspaceContentBudgetScope]);
  reactExports.useEffect(() => {
    return instance2.eventBus.on("delete:blocked", ({ reason }) => {
      dedupedToast.warning(deleteBlockedMessage(t2, reason), {
        id: getCanvasToastId("delete-blocked", workspaceContentBudgetScope),
      });
    });
  }, [instance2, t2, workspaceContentBudgetScope]);
  const handleRootElChange = reactExports.useCallback((el) => instance2.setRootEl(el), [instance2]);
  const handleSelectionChange = reactExports.useCallback(
    (ids2) => {
      applyReactFlowSelectionWriteback({
        ids: ids2,
        syncing: syncingRef.current,
        // Read via ref: the callback identity must not churn on tab
        // switches, and hidden-Canvas echoes (empty selection emitted when
        // presentation virtualization unmounts the nodes) must not
        // clear the user's real selection.
        active: isPresentedRef.current,
        writeSelection: (next2) => instance2.selection.set(next2),
        closeMenus: closeAllMenus,
      });
    },
    [closeAllMenus, instance2, syncingRef],
  );
  const handlePaneUndo = reactExports.useCallback(() => {
    instance2.undo();
  }, [instance2]);
  const handlePaneRedo = reactExports.useCallback(() => {
    instance2.redo();
  }, [instance2]);
  const handleToggleMinimap = reactExports.useCallback(() => {
    const next2 = !minimapVisibleRef.current;
    minimapVisibleRef.current = next2;
    setMinimapVisible(next2);
    try {
      localStorage.setItem("hilo:canvas:minimap", next2 ? "1" : "0");
    } catch {}
    onCanvasViewControl?.({
      action: "minimap_toggle",
      zoomAfter: Math.round(getViewport().zoom * 100),
      minimapVisible: next2,
    });
  }, [getViewport, onCanvasViewControl]);
  const handleToggleEdges = reactExports.useCallback(() => {
    const next2 = !edgesVisibleRef.current;
    edgesVisibleRef.current = next2;
    setEdgesVisible(next2);
    onCanvasViewControl?.({
      action: "edges_toggle",
      zoomAfter: Math.round(getViewport().zoom * 100),
      edgesVisible: next2,
    });
  }, [getViewport, onCanvasViewControl]);
  const handleBackgroundPatternChange = reactExports.useCallback(
    (value) => {
      setBackgroundPattern(value);
      writeCanvasPreference(backgroundPatternKey, value);
    },
    [backgroundPatternKey],
  );
  const handleCanvasToneChange = reactExports.useCallback(
    (value) => {
      setCanvasTone(value);
      writeCanvasPreference(canvasToneKey, value);
    },
    [canvasToneKey],
  );
  const stickerNodes = reactExports.useMemo(
    () => nodes.filter((node2) => node2.type === CanvasNodeType.Sticker),
    [nodes],
  );
  const [clearStickersConfirmationOpen, setClearStickersConfirmationOpen] =
    reactExports.useState(false);
  const allStickersHidden = reactExports.useMemo(() => {
    if (stickerNodes.length === 0) return false;
    const hiddenStickerIds = new Set(
      instance2
        .getGraph()
        .nodes.filter((node2) => node2.type === CanvasNodeType.Sticker && node2.meta?.hidden)
        .map((node2) => node2.id),
    );
    return stickerNodes.every((sticker) => hiddenStickerIds.has(sticker.id));
  }, [instance2, stickerNodes]);
  const handleStickerVisibility = reactExports.useCallback(
    (hidden) => {
      instance2.updateNodesMeta(
        stickerNodes.map((sticker) => sticker.id),
        {
          hidden,
        },
      );
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance2, stickerNodes],
  );
  const handleClearStickers = reactExports.useCallback(() => {
    if (stickerNodes.length === 0) return;
    setClearStickersConfirmationOpen(true);
  }, [stickerNodes.length]);
  const handleConfirmClearStickers = reactExports.useCallback(() => {
    setClearStickersConfirmationOpen(false);
    instance2.runExplicitlyConfirmedDeletion(() => {
      instance2.removeNodes(stickerNodes.map((sticker) => sticker.id));
    });
    instance2.eventBus.emit({
      type: "persist:flush",
    });
    setInteractionTool("select");
  }, [instance2, stickerNodes, setInteractionTool]);
  const { handleFitView, handleFocusSelection, handleMinimapNodeSelect } =
    useCanvasViewportFocus(instance2);
  const nodesInitialized = useNodesInitialized();
  const flowViewportWidth = useStore$3((state2) => state2.width);
  const flowViewportHeight = useStore$3((state2) => state2.height);
  const didInitialFitRef = reactExports.useRef(false);
  const [initialFitDone, setInitialFitDone] = reactExports.useState(false);
  const initialFitOwnerRef = reactExports.useRef(initialViewportOwner);
  const initialFitGenerationRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    if (initialFitOwnerRef.current === initialViewportOwner) return;
    initialFitOwnerRef.current = initialViewportOwner;
    initialFitGenerationRef.current += 1;
    didInitialFitRef.current = false;
    setInitialFitDone(false);
  }, [initialViewportOwner]);
  const revealInitialFit = reactExports.useCallback(
    (generation) => {
      if (generation !== initialFitGenerationRef.current) return;
      syncStableZoomFromViewport();
      setInitialFitDone(true);
    },
    [syncStableZoomFromViewport],
  );
  reactExports.useEffect(() => {
    const action = resolveInitialFitGateAction({
      presented: isPresented,
      loading,
      initialFitConsumed: didInitialFitRef.current,
      initialHydratedNodeCount,
      nodeCount: nodes.length,
      nodesInitialized,
    });
    if (action === "wait") return;
    if (flowViewportWidth <= 0 || flowViewportHeight <= 0) return;
    const fitGeneration = initialFitGenerationRef.current;
    const viewportStorage = getCanvasViewportStorage();
    const restoredViewport =
      viewportStorageKey && viewportStorage
        ? readCanvasViewport(viewportStorage, viewportStorageKey, {
            width: flowViewportWidth,
            height: flowViewportHeight,
            minZoom: CANVAS_MIN_ZOOM,
            maxZoom: CANVAS_MAX_ZOOM,
          })
        : void 0;
    if (restoredViewport) {
      didInitialFitRef.current = true;
      void reactFlowInstance.setViewport(restoredViewport).then(
        () => revealInitialFit(fitGeneration),
        () => revealInitialFit(fitGeneration),
      );
      return;
    }
    if (action === "reveal-empty") {
      didInitialFitRef.current = true;
      revealInitialFit(fitGeneration);
      return;
    }
    const applyInitialViewport = () => {
      if (!isPresentedRef.current || didInitialFitRef.current) return;
      const allCurrentNodes = reactFlowInstance.getNodes();
      if ((initialHydratedNodeCount ?? 0) > 0 && allCurrentNodes.length === 0) return;
      const currentNodes = filterInitialFitFallbackNodes(allCurrentNodes);
      if (currentNodes.length === 0) {
        didInitialFitRef.current = true;
        revealInitialFit(fitGeneration);
        return;
      }
      const bounds = reactFlowInstance.getNodesBounds(currentNodes);
      const viewport = resolveInitialFitFallbackViewport({
        bounds,
        viewportWidth: flowViewportWidth,
        viewportHeight: flowViewportHeight,
        minZoom: CANVAS_INITIAL_FIT_MIN_ZOOM,
        maxZoom: CANVAS_INITIAL_FIT_MAX_ZOOM,
        padding: 0.2,
      });
      if (!viewport) return;
      didInitialFitRef.current = true;
      void reactFlowInstance.setViewport(viewport).then(
        () => revealInitialFit(fitGeneration),
        () => revealInitialFit(fitGeneration),
      );
    };
    if (action === "fit-measured") {
      applyInitialViewport();
      return;
    }
    const timeout2 = window.setTimeout(() => {
      applyInitialViewport();
    }, INITIAL_FIT_FALLBACK_MS);
    return () => window.clearTimeout(timeout2);
  }, [
    isPresented,
    loading,
    initialHydratedNodeCount,
    nodesInitialized,
    nodes.length,
    flowViewportHeight,
    flowViewportWidth,
    reactFlowInstance,
    revealInitialFit,
    viewportStorageKey,
  ]);
  const handleViewportChangeEnd = reactExports.useCallback(
    (viewport) => {
      const viewportStorage = getCanvasViewportStorage();
      if (
        !initialFitDone ||
        !isPresentedRef.current ||
        initialFitOwnerRef.current !== initialViewportOwner ||
        !viewportStorageKey ||
        !viewportStorage
      ) {
        return;
      }
      const { width, height } = storeApi.getState();
      writeCanvasViewport(viewportStorage, viewportStorageKey, viewport, {
        width,
        height,
      });
    },
    [initialFitDone, initialViewportOwner, storeApi, viewportStorageKey],
  );
  const didEnterRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!initialFitDone || didEnterRef.current) return;
    didEnterRef.current = true;
    onCanvasEnter?.({
      nodeCount: nodes.length,
    });
  }, [initialFitDone, nodes.length, onCanvasEnter]);
  reactExports.useEffect(() => {
    return instance2.eventBus.on("mode:changed", (event) => {
      setMode(event.mode);
    });
  }, [instance2]);
  reactExports.useEffect(() => {
    if (!dataSource.onCanvasFocus) return;
    return dataSource.onCanvasFocus((event) => {
      if (event.nodeIds.length === 0) return;
      const map3 = replacedIdsRef.current;
      const graphNodes = instance2.getGraph().nodes;
      const existingNodeIds = new Set(graphNodes.map((node2) => node2.id));
      const resolvedIds = event.nodeIds
        .map((id2) => map3.get(id2) ?? id2)
        .filter((id2) => existingNodeIds.has(id2));
      if (resolvedIds.length === 0) return;
      const focusTargets = canvasFocus.resolve(graphNodes, resolvedIds, event.preferParentGroup);
      if (focusTargets.nodeIds.length === 0) return;
      for (const groupId2 of focusTargets.groupIdsToExpand ?? []) {
        instance2.setGroupCollapsed(groupId2, false);
      }
      applyCanvasFocusSelection(instance2.selection, focusTargets.nodeIds, event.select);
      let didPromote = false;
      let overlayTargetId = null;
      for (const id2 of focusTargets.nodeIds) {
        if (instance2.resolveImageGroupMainId(id2) !== id2) {
          instance2.promoteSubImageToMain(id2);
          didPromote = true;
          overlayTargetId = id2;
        }
      }
      if (didPromote) {
        if (overlayTargetId) multiImageOverlayApi.getState().open(overlayTargetId);
        scheduleCanvasFocusRef.current(focusTargets.nodeIds, {
          delay: 300,
          padding: event.padding ?? 0.2,
          duration: event.duration ?? 400,
        });
      } else if (focusTargets.groupIdsToExpand?.length) {
        scheduleCanvasFocusRef.current(focusTargets.nodeIds, {
          delay: 120,
          padding: event.padding ?? 0.2,
          duration: event.duration ?? 400,
        });
      } else {
        scheduleCanvasFocusRef.current(focusTargets.nodeIds, {
          delay: 0,
          padding: event.padding ?? 0.2,
          duration: event.duration ?? 400,
        });
      }
    });
  }, [dataSource, instance2, multiImageOverlayApi]);
  const trackToolbarZoom = reactExports.useCallback(
    (action, before) => {
      syncStableZoomFromViewport();
      const after = getViewport().zoom;
      if (Math.abs(after - before) < 1e-4) return;
      onCanvasViewControl?.({
        action,
        zoomBefore: Math.round(before * 100),
        zoomAfter: Math.round(after * 100),
      });
    },
    [getViewport, onCanvasViewControl, syncStableZoomFromViewport],
  );
  const handleZoomIn = reactExports.useCallback(() => {
    const before = getViewport().zoom;
    const result = zoomIn();
    syncStableZoomAfterViewportChange(result);
    if (result) {
      void result.then(
        () => trackToolbarZoom("zoom_in", before),
        () => trackToolbarZoom("zoom_in", before),
      );
    } else {
      requestAnimationFrame(() => trackToolbarZoom("zoom_in", before));
    }
  }, [getViewport, zoomIn, syncStableZoomAfterViewportChange, trackToolbarZoom]);
  const handleZoomOut = reactExports.useCallback(() => {
    const before = getViewport().zoom;
    const result = zoomOut();
    syncStableZoomAfterViewportChange(result);
    if (result) {
      void result.then(
        () => trackToolbarZoom("zoom_out", before),
        () => trackToolbarZoom("zoom_out", before),
      );
    } else {
      requestAnimationFrame(() => trackToolbarZoom("zoom_out", before));
    }
  }, [getViewport, zoomOut, syncStableZoomAfterViewportChange, trackToolbarZoom]);
  const handleZoomTo = reactExports.useCallback(
    (level) => {
      syncStableZoomAfterViewportChange(
        zoomTo(level, {
          duration: 300,
        }),
      );
    },
    [syncStableZoomAfterViewportChange, zoomTo],
  );
  reactExports.useEffect(() => {
    commandHandlersRef.current = {
      [CANVAS_COMMAND_IDS.addNode]: () => {
        const rect = instance2.getRootEl()?.getBoundingClientRect();
        const screen2 = rect
          ? {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            }
          : {
              x: 160,
              y: 160,
            };
        openContextMenuAt(screen2, getDropPosition());
        setActiveCommand(null);
      },
      [CANVAS_COMMAND_IDS.assets]: () => {
        setInteractionTool("select");
        if (onOpenAssets) {
          onOpenAssets();
          return;
        }
        setActiveCommand(CANVAS_COMMAND_IDS.assets);
      },
      [CANVAS_COMMAND_IDS.select]: () => {
        setInteractionTool("select");
      },
      [CANVAS_COMMAND_IDS.handTool]: () => {
        setInteractionTool("hand");
      },
      [CANVAS_COMMAND_IDS.comments]: () => {
        setInteractionTool("select");
        setActiveCommand(CANVAS_COMMAND_IDS.comments);
      },
      [CANVAS_COMMAND_IDS.sticker]: (source) => {
        setInteractionTool("sticker", source);
      },
      [CANVAS_COMMAND_IDS.shortcuts]: () => {
        onOpenHelp?.();
        setActiveCommand(null);
      },
      [CANVAS_COMMAND_IDS.help]: () => {
        onOpenHelp?.();
        setActiveCommand(null);
      },
      [CANVAS_COMMAND_IDS.minimap]: handleToggleMinimap,
      [CANVAS_COMMAND_IDS.zoomOut]: handleZoomOut,
      [CANVAS_COMMAND_IDS.zoomIn]: handleZoomIn,
      [CANVAS_COMMAND_IDS.fitView]: handleFitView,
      [CANVAS_COMMAND_IDS.focusSelection]: handleFocusSelection,
    };
  }, [
    getDropPosition,
    handleFitView,
    handleFocusSelection,
    handleToggleMinimap,
    handleZoomIn,
    handleZoomOut,
    instance2,
    openContextMenuAt,
    onOpenAssets,
    onOpenHelp,
    setActiveCommand,
    setInteractionTool,
  ]);
  const emitCommentContext = reactExports.useCallback(
    (clientX, clientY, targetId) => {
      const root2 = instance2.getRootEl();
      const rect = root2?.getBoundingClientRect();
      const viewport = getViewport();
      const scale2 = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
      const context = {
        canvasId: workspaceContentBudgetScope ?? "unknown",
        worldPosition: screenToFlowPosition({
          x: clientX,
          y: clientY,
        }),
        ...(targetId
          ? {
              targetId,
            }
          : {}),
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
        },
        screenshot: {
          width: Math.round((rect?.width ?? 0) * scale2),
          height: Math.round((rect?.height ?? 0) * scale2),
          deviceScaleFactor: scale2,
        },
      };
      instance2.eventBus.emit({
        type: "comment:context",
        context,
      });
      onCommentContext?.(context);
      setActiveCommand(null);
    },
    [
      getViewport,
      instance2,
      onCommentContext,
      screenToFlowPosition,
      workspaceContentBudgetScope,
      setActiveCommand,
    ],
  );
  const resolveStickerPlacement = reactExports.useCallback(
    (clientPosition) => resolveStickerPointerPlacement(clientPosition, screenToFlowPosition),
    [screenToFlowPosition],
  );
  const handlePlaceSticker = reactExports.useCallback(
    (clientX, clientY) => {
      const currentSelection = stickerSelectionRef.current;
      const currentStickerAssetId = currentSelection.kind === "asset" ? currentSelection.id : "";
      const currentStickerEmoji =
        currentSelection.kind === "emoji" ? currentSelection.value : DEFAULT_STICKER_EMOJI;
      const position2 = resolveStickerPlacement({
        x: clientX,
        y: clientY,
      });
      const graphNodes = instance2.getGraph().nodes;
      const stickerTarget = findStickerTarget(graphNodes, position2, mode2);
      const stickerId = `sticker-${crypto.randomUUID()}`;
      const rotation = randomStickerRotation();
      commands.addNode({
        id: stickerId,
        type: CanvasNodeType.Sticker,
        data: {
          emoji: currentStickerEmoji,
          rotation,
          ...(currentStickerAssetId
            ? {
                brandId: currentStickerAssetId,
              }
            : {}),
          ...(stickerTarget
            ? {
                targetId: stickerTarget.id,
                targetOffset: {
                  x: position2.x - stickerTarget.position.x,
                  y: position2.y - stickerTarget.position.y,
                },
                targetAnchor: stickerTarget.anchor,
              }
            : {}),
        },
        position: position2,
        size: STICKER_NODE_SIZE,
      });
      const targetNode = stickerTarget
        ? graphNodes.find((node2) => node2.id === stickerTarget.id)
        : void 0;
      const targetCloudTaskId = targetNode?.assetId
        ? assetMetadataStore.getState().get(targetNode.assetId)?.cloudTaskId
        : void 0;
      if (typeof targetCloudTaskId === "string" && targetCloudTaskId.trim().length > 0) {
        onStickerAdd?.({
          stickerId:
            currentSelection.kind === "asset" ? currentSelection.id : currentSelection.value,
          cloudTaskId: targetCloudTaskId,
        });
      }
      if (!instance2.getGraph().nodes.some((node2) => node2.id === stickerId)) return false;
      instance2.selection.set([stickerId]);
      setFreshStickerIds((current2) => {
        const next2 = new Set(current2);
        next2.add(stickerId);
        return next2;
      });
      window.setTimeout(() => {
        setFreshStickerIds((current2) => {
          if (!current2.has(stickerId)) return current2;
          const next2 = new Set(current2);
          next2.delete(stickerId);
          return next2;
        });
      }, 540);
      return true;
    },
    [assetMetadataStore, commands, instance2, mode2, onStickerAdd, resolveStickerPlacement],
  );
  const { handleCanvasNodeClick, handleCanvasPaneClick } = useCanvasClickHandlers({
    commentsActive: activeCommand === CANVAS_COMMAND_IDS.comments,
    selectedCommentTargetId: selectedIds.length === 1 ? selectedIds[0] : void 0,
    stickerMode,
    emitCommentContext,
    handlePlaceSticker,
    onStickerPlaced: dismissStickerPanel,
    restoreSelectionChrome,
  });
  const syncStickerBindings = reactExports.useCallback(
    (affectedNodeId) => {
      const graph = instance2.getGraph();
      const nodesById = new Map(graph.nodes.map((node2) => [node2.id, node2]));
      const affectedIds = new Set([affectedNodeId]);
      for (const node2 of graph.nodes) {
        let parentId = node2.parentId;
        const visited = new Set();
        while (parentId && !visited.has(parentId)) {
          if (parentId === affectedNodeId) {
            affectedIds.add(node2.id);
            break;
          }
          visited.add(parentId);
          parentId = nodesById.get(parentId)?.parentId;
        }
      }
      for (const sticker of graph.nodes) {
        if (sticker.type !== CanvasNodeType.Sticker) continue;
        const data2 = sticker.data;
        if (!data2.targetId || !affectedIds.has(data2.targetId)) continue;
        const target = nodesById.get(data2.targetId);
        if (!target) continue;
        const targetPosition = getAbsoluteNodePosition(target, nodesById, mode2);
        const targetSize = sizeOf(target, mode2);
        const offset2 = data2.targetAnchor
          ? {
              x: data2.targetAnchor.x * targetSize.width,
              y: data2.targetAnchor.y * targetSize.height,
            }
          : data2.targetOffset;
        if (!offset2) continue;
        const nextAbsolutePosition = {
          x: targetPosition.x + offset2.x,
          y: targetPosition.y + offset2.y,
        };
        const parentNode2 = sticker.parentId ? nodesById.get(sticker.parentId) : void 0;
        const parentPosition = parentNode2
          ? getAbsoluteNodePosition(parentNode2, nodesById, mode2)
          : void 0;
        const nextPosition = {
          x: nextAbsolutePosition.x - (parentPosition?.x ?? 0),
          y: nextAbsolutePosition.y - (parentPosition?.y ?? 0),
        };
        const currentPosition = getNodePosition(sticker, mode2);
        if (currentPosition.x === nextPosition.x && currentPosition.y === nextPosition.y) {
          continue;
        }
        instance2.moveNode(sticker.id, nextPosition);
      }
    },
    [instance2, mode2],
  );
  const clearStickerFollowState = reactExports.useCallback(() => {
    if (stickerFollowClearTimerRef.current) {
      clearTimeout(stickerFollowClearTimerRef.current);
      stickerFollowClearTimerRef.current = null;
    }
    stickerFollowPositionsRef.current.clear();
    setStickerFollowPositions(new Map());
  }, []);
  const resolveFollowAbsolutePosition = reactExports.useCallback(
    (nodeId, graphById, visited = new Set()) => {
      if (visited.has(nodeId)) return void 0;
      visited.add(nodeId);
      const graphNode = graphById.get(nodeId);
      const snapshot2 = flowPositionSnapshotsRef.current.get(nodeId);
      if (!graphNode && !snapshot2) return void 0;
      const position2 =
        snapshot2?.position ?? (graphNode ? getNodePosition(graphNode, mode2) : null);
      if (!position2) return void 0;
      const parentId = snapshot2?.parentId ?? graphNode?.parentId;
      if (!parentId)
        return {
          x: position2.x,
          y: position2.y,
        };
      const parentPosition = resolveFollowAbsolutePosition(parentId, graphById, visited);
      if (!parentPosition)
        return {
          x: position2.x,
          y: position2.y,
        };
      return {
        x: parentPosition.x + position2.x,
        y: parentPosition.y + position2.y,
      };
    },
    [mode2],
  );
  const getStickerFollowPositions = reactExports.useCallback(
    (affectedNodeIds) => {
      const index2 = getStickerFollowIndex();
      if (!index2) return stickerFollowPositionsRef.current;
      const affectedStickers = collectAffectedStickerNodes(index2, affectedNodeIds);
      if (affectedStickers.length === 0) return stickerFollowPositionsRef.current;
      const next2 = new Map(stickerFollowPositionsRef.current);
      for (const sticker of affectedStickers) {
        const data2 = sticker.data;
        if (!data2.targetId) continue;
        const target = index2.nodeById.get(data2.targetId);
        const targetPosition = target
          ? resolveFollowAbsolutePosition(data2.targetId, index2.nodeById)
          : void 0;
        if (!target || !targetPosition) {
          next2.delete(sticker.id);
          continue;
        }
        const targetSize = sizeOf(target, mode2);
        const offset2 = data2.targetAnchor
          ? {
              x: data2.targetAnchor.x * targetSize.width,
              y: data2.targetAnchor.y * targetSize.height,
            }
          : data2.targetOffset;
        if (!offset2) {
          next2.delete(sticker.id);
          continue;
        }
        const absolutePosition = {
          x: targetPosition.x + offset2.x,
          y: targetPosition.y + offset2.y,
        };
        const stickerParentId =
          flowPositionSnapshotsRef.current.get(sticker.id)?.parentId ?? sticker.parentId;
        const parentPosition = stickerParentId
          ? resolveFollowAbsolutePosition(stickerParentId, index2.nodeById)
          : void 0;
        next2.set(sticker.id, {
          x: absolutePosition.x - (parentPosition?.x ?? 0),
          y: absolutePosition.y - (parentPosition?.y ?? 0),
        });
      }
      return next2;
    },
    [getStickerFollowIndex, mode2, resolveFollowAbsolutePosition],
  );
  const publishStickerFollowPositions = reactExports.useCallback((positions) => {
    const current2 = stickerFollowPositionsRef.current;
    if (
      current2.size === positions.size &&
      Array.from(positions).every(([id2, position2]) => {
        const previous2 = current2.get(id2);
        return previous2?.x === position2.x && previous2?.y === position2.y;
      })
    ) {
      return;
    }
    const next2 = new Map(positions);
    stickerFollowPositionsRef.current = next2;
    setStickerFollowPositions(next2);
  }, []);
  const handleStickerFollowChanges = reactExports.useCallback(
    (positionChanges) => {
      if (positionChanges.length === 0) return;
      const startsDrag = positionChanges.some((change) => change.dragging === true);
      const isDragEnd = positionChanges.every((change) => change.dragging === false);
      if (startsDrag && !stickerDragActiveRef.current) {
        stickerDragActiveRef.current = true;
        if (stickerFollowClearTimerRef.current) {
          clearTimeout(stickerFollowClearTimerRef.current);
          stickerFollowClearTimerRef.current = null;
        }
        stickerFollowPositionsRef.current.clear();
        setStickerFollowPositions(new Map());
      }
      const graphNodesById = getStickerFollowIndex()?.nodeById;
      for (const change of positionChanges) {
        const previous2 = flowPositionSnapshotsRef.current.get(change.id);
        const graphNode = graphNodesById?.get(change.id);
        flowPositionSnapshotsRef.current.set(change.id, {
          position: {
            x: change.position.x,
            y: change.position.y,
          },
          ...(previous2?.parentId || graphNode?.parentId
            ? {
                parentId: previous2?.parentId ?? graphNode?.parentId,
              }
            : {}),
        });
      }
      const positions = getStickerFollowPositions(positionChanges.map((change) => change.id));
      publishStickerFollowPositions(positions);
      if (isDragEnd) stickerDragActiveRef.current = false;
    },
    [getStickerFollowIndex, getStickerFollowPositions, publishStickerFollowPositions],
  );
  const handleCanvasNodesChange = reactExports.useCallback(
    (changes) => {
      onNodesChange(changes);
      const positionChanges = changes.filter(
        (change) => change.type === "position" && !!change.position && change.dragging === false,
      );
      handleStickerFollowChanges(
        positionChanges.flatMap((change) =>
          change.position
            ? [
                {
                  id: change.id,
                  position: change.position,
                  dragging: change.dragging,
                },
              ]
            : [],
        ),
      );
    },
    [handleStickerFollowChanges, onNodesChange],
  );
  const handleCanvasNodeDrag = reactExports.useCallback(
    (_event, _node, draggedNodes) => {
      handleStickerFollowChanges(
        draggedNodes.map((node2) => ({
          id: node2.id,
          position: {
            x: node2.position.x,
            y: node2.position.y,
          },
          dragging: true,
        })),
      );
    },
    [handleStickerFollowChanges],
  );
  const scheduleStickerBindings = reactExports.useCallback(
    (affectedNodeId) => {
      pendingStickerBindingIdsRef.current.add(affectedNodeId);
      if (stickerBindingTimerRef.current) {
        clearTimeout(stickerBindingTimerRef.current);
      }
      const flush2 = () => {
        if (stickerDragActiveRef.current) {
          stickerBindingTimerRef.current = setTimeout(flush2, STICKER_BINDING_DELAY_MS);
          return;
        }
        stickerBindingTimerRef.current = null;
        const affectedNodeIds = Array.from(pendingStickerBindingIdsRef.current);
        pendingStickerBindingIdsRef.current.clear();
        for (const nodeId of affectedNodeIds) {
          syncStickerBindings(nodeId);
        }
      };
      stickerBindingTimerRef.current = setTimeout(flush2, STICKER_BINDING_DELAY_MS);
    },
    [syncStickerBindings],
  );
  const handleNodeDragStop = reactExports.useCallback(
    (moves) => {
      stickerDragActiveRef.current = false;
      for (const move of moves) {
        const previous2 = flowPositionSnapshotsRef.current.get(move.id);
        const graphNode = instance2.getGraph().nodes.find((node2) => node2.id === move.id);
        flowPositionSnapshotsRef.current.set(move.id, {
          position: {
            x: move.position.x,
            y: move.position.y,
          },
          ...((previous2?.parentId ?? graphNode?.parentId)
            ? {
                parentId: previous2?.parentId ?? graphNode?.parentId,
              }
            : {}),
        });
      }
      if (moves.length > 0) {
        publishStickerFollowPositions(getStickerFollowPositions(moves.map((move) => move.id)));
      }
      onNodeDragStop(moves);
      const graph = instance2.getGraph();
      const nodesById = new Map(graph.nodes.map((node2) => [node2.id, node2]));
      let didRebind = false;
      for (const move of moves) {
        const sticker = nodesById.get(move.id);
        if (sticker?.type !== CanvasNodeType.Sticker) {
          scheduleStickerBindings(move.id);
          continue;
        }
        const data2 = sticker.data;
        const stickerPosition = getAbsoluteNodePosition(sticker, nodesById, mode2);
        const target = findStickerTarget(graph.nodes, stickerPosition, mode2);
        const patch2 = target
          ? {
              targetId: target.id,
              targetOffset: {
                x: stickerPosition.x - target.position.x,
                y: stickerPosition.y - target.position.y,
              },
              targetAnchor: target.anchor,
            }
          : {
              targetId: void 0,
              targetOffset: void 0,
              targetAnchor: void 0,
            };
        const unchanged =
          data2.targetId === patch2.targetId &&
          data2.targetOffset?.x === patch2.targetOffset?.x &&
          data2.targetOffset?.y === patch2.targetOffset?.y &&
          data2.targetAnchor?.x === patch2.targetAnchor?.x &&
          data2.targetAnchor?.y === patch2.targetAnchor?.y;
        if (unchanged) continue;
        instance2.mergeNodeData(move.id, patch2);
        didRebind = true;
      }
      if (didRebind)
        instance2.eventBus.emit({
          type: "persist:request",
        });
      if (stickerFollowClearTimerRef.current) {
        clearTimeout(stickerFollowClearTimerRef.current);
      }
      stickerFollowClearTimerRef.current = setTimeout(() => {
        stickerFollowClearTimerRef.current = null;
        clearStickerFollowState();
      }, STICKER_BINDING_DELAY_MS + 24);
    },
    [
      clearStickerFollowState,
      getStickerFollowPositions,
      instance2,
      mode2,
      onNodeDragStop,
      publishStickerFollowPositions,
      scheduleStickerBindings,
    ],
  );
  reactExports.useEffect(() => {
    const offMoved = instance2.eventBus.on("node:moved", ({ nodeId }) => {
      scheduleStickerBindings(nodeId);
    });
    const offResized = instance2.eventBus.on("node:resized", ({ nodeId }) => {
      scheduleStickerBindings(nodeId);
    });
    return () => {
      offMoved();
      offResized();
      if (stickerBindingTimerRef.current) {
        clearTimeout(stickerBindingTimerRef.current);
        stickerBindingTimerRef.current = null;
      }
      pendingStickerBindingIdsRef.current.clear();
      stickerDragActiveRef.current = false;
      clearStickerFollowState();
    };
  }, [clearStickerFollowState, instance2, scheduleStickerBindings]);
  const appearancePanelContent = reactExports.useMemo(() => {
    const cardClass = (selected2) =>
      `relative overflow-hidden rounded-md border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected2 ? "border-[var(--canvas-controls-text)]" : "border-[var(--canvas-controls-border)] hover:border-[var(--canvas-controls-text-muted)]"}`;
    const selectedMark = (
      <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[var(--canvas-controls-bg)] text-[var(--canvas-controls-text)] shadow-[var(--canvas-shadow-menu)]">
        <Check size={11} strokeWidth={2} aria-hidden="true" />
      </span>
    );
    const renderToneCards = (tones) =>
      tones.map((tone) => {
        const selected2 = canvasTone === tone;
        return (
          <button
            key={tone}
            type="button"
            aria-pressed={selected2}
            data-action-ui-id={`canvas.appearance-tone-${tone}`}
            className={cardClass(selected2)}
            onClick={() => handleCanvasToneChange(tone)}
          >
            <span
              className="canvas-appearance-preview block h-9 w-full"
              data-canvas-tone={tone}
              data-background-pattern="none"
              aria-hidden="true"
            />
            {selected2 && selectedMark}
            <span className="flex h-6 items-center justify-center border-t border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-1 text-center text-[10px] text-[var(--canvas-controls-text)] [border-top-width:var(--divider-width)]">
              {t2(`canvas.toolbar.tone.${tone}`)}
            </span>
          </button>
        );
      });
    return (
      <div className="space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-medium text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.toolbar.backgroundPattern")}
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {CANVAS_BACKGROUND_PATTERNS.map((pattern) => {
              const selected2 = backgroundPattern === pattern;
              return (
                <button
                  key={pattern}
                  type="button"
                  aria-pressed={selected2}
                  data-action-ui-id={`canvas.appearance-pattern-${pattern}`}
                  className={cardClass(selected2)}
                  onClick={() => handleBackgroundPatternChange(pattern)}
                >
                  <span
                    className="canvas-appearance-preview block h-9 w-full"
                    data-canvas-tone={canvasTone}
                    data-background-pattern={pattern}
                    aria-hidden="true"
                  />
                  {selected2 && selectedMark}
                  <span className="flex h-6 items-center justify-center border-t border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-1 text-center text-[10px] text-[var(--canvas-controls-text)] [border-top-width:var(--divider-width)]">
                    {t2(`canvas.toolbar.background.${pattern}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-medium text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.toolbar.backgroundTone")}
          </legend>
          <div className="grid grid-cols-3 gap-1.5">{renderToneCards(CANVAS_PRIMARY_TONES)}</div>
          <button
            type="button"
            data-action-ui-id="canvas.appearance-more-tones"
            aria-expanded={moreCanvasTonesOpen}
            onClick={() => setMoreCanvasTonesOpen((open) => !open)}
            className="mt-1.5 flex h-7 w-full items-center justify-center gap-1 rounded-md text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{t2("canvas.toolbar.moreColors")}</span>
            <ChevronDown
              size={12}
              strokeWidth={1.5}
              className={`transition-transform ${moreCanvasTonesOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {moreCanvasTonesOpen && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {renderToneCards(CANVAS_MORE_TONES)}
            </div>
          )}
        </fieldset>
      </div>
    );
  }, [
    backgroundPattern,
    canvasTone,
    handleBackgroundPatternChange,
    handleCanvasToneChange,
    moreCanvasTonesOpen,
    t2,
  ]);
  const commandPanelContent = (activeCommand === CANVAS_COMMAND_IDS.comments ||
    activeCommand === CANVAS_COMMAND_IDS.sticker ||
    activeCommand === CANVAS_COMMAND_IDS.assets) && (
    <CanvasCommandPanelContent
      activeCommand={activeCommand}
      stickerCount={stickerNodes.length}
      allStickersHidden={allStickersHidden}
      emojiPickerOpen={emojiPickerOpen}
      stickerAssetId={stickerAssetId}
      stickerEmoji={stickerEmoji}
      onToggleStickerVisibility={() => handleStickerVisibility(!allStickersHidden)}
      onClearStickers={handleClearStickers}
      onEmojiPickerOpenChange={setEmojiPickerOpen}
      onStickerAssetChange={handleStickerAssetChange}
      onStickerEmojiChange={handleStickerEmojiChange}
    />
  );
  const toolbar = (
    <CanvasToolbar
      commandRegistry={commandRegistry}
      {...addNodeToolbarProps}
      activeCommand={activeCommand}
      interactionMode={handTool ? "hand" : "move"}
      stickerMode={stickerMode}
      panelContent={commandPanelContent}
      onClosePanel={closeCommandPanel}
      beforeSticker={toolDockBeforeSticker}
      trailing={toolDockTrailing}
    />
  );
  const viewportControls = (
    <CanvasViewControls
      onSortByConnections={handleSortByConnections}
      onSortByMediaType={handleSortByMediaType}
      onTidyLayout={handleTidyCanvasLayout}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onFitView={handleFitView}
      onZoomTo={handleZoomTo}
      onToggleMinimap={handleToggleMinimap}
      minimapVisible={minimapVisible}
      appearancePanel={appearancePanelContent}
      onAppearanceOpen={() => setActiveCommand(null)}
      onToggleEdges={handleToggleEdges}
      edgesVisible={edgesVisible}
      leading={toolbarLeading}
      trailing={toolbarTrailing}
      minZoom={CANVAS_MIN_ZOOM}
      maxZoom={CANVAS_MAX_ZOOM}
      placement={toolbarPlacement}
    />
  );
  const spinner = (
    <Loader2Icon
      className="size-8 animate-spin text-muted-foreground"
      role="img"
      aria-label={t2("a11y.loading")}
    />
  );
  const canvasReady = !loading && initialFitDone;
  reactExports.useEffect(() => {
    onLoadStateChange?.(loadError ? "error" : loading ? "loading" : "ready");
  }, [loadError, loading, onLoadStateChange]);
  const canvasVisible = isPresented && canvasReady;
  const blockingLoadError = loadError?.phase === "initial" ? loadError : null;
  const canvasResourcesActive = shouldAcquireCanvasResources({
    presented: isPresented,
    loading,
    initialFitDone,
  });
  const selectedStickerAsset = getCanvasStickerAsset(stickerAssetId);
  const content2 = (
    <WorkspaceContentBudgetScopeProvider workspaceId={workspaceContentBudgetScope}>
      <CanvasReferenceNavigationScope
        actions={canvasActions}
        scope={`${workspaceContentBudgetScope ?? ""}:${mode2}`}
        cancelPendingFocus={() => cancelPendingFocusRef.current()}
      >
        <div className="relative isolate size-full">
          <div
            style={{
              width: "100%",
              height: "100%",
              opacity: canvasVisible ? 1 : 0,
              pointerEvents: canvasVisible ? "auto" : "none",
            }}
            aria-hidden={!canvasVisible}
          >
            <CanvasShell
              nodes={shellNodes}
              edges={shellEdges}
              registry={instance2.registry}
              onNodesChange={handleCanvasNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={handleConnectEnd}
              onNodeDrag={handleCanvasNodeDrag}
              onNodeDragStop={handleNodeDragStop}
              onPaneClick={handleCanvasPaneClick}
              onSelectionChange={handleSelectionChange}
              onNodeContextMenu={handleNodeContextMenu}
              onSelectionContextMenu={handleSelectionContextMenu}
              onPaneDoubleClick={handTool ? void 0 : handlePaneDoubleClick}
              onPaneContextMenu={handlePaneContextMenu}
              onCanvasDragEnter={handleCanvasDragEnter}
              onCanvasDragOver={handleCanvasDragOver}
              onCanvasDragLeave={handleCanvasDragLeave}
              onCanvasDrop={handleCanvasDrop}
              minimap={minimapVisible}
              background={backgroundPattern}
              canvasTone={canvasTone}
              stickerMode={stickerMode}
              handTool={handTool}
              suppressSelectionChrome={selectionChromeSuppressed}
              edgesVisible={edgesVisible}
              toolbar={toolbar}
              viewportControls={viewportControls}
              utilityControls={utilityControls}
              toolbarPlacement={toolbarPlacement}
              layoutRelocationKey={layoutRelocationKey}
              onNodeClick={handleCanvasNodeClick}
              onMinimapNodeSelect={handleMinimapNodeSelect}
              active={canvasResourcesActive}
              onRootElChange={handleRootElChange}
              onViewportChangeEnd={handleViewportChangeEnd}
            >
              <SelectionToolbar
                selectedIds={selectedIds}
                onAddToChat={onAddToChat}
                groupAddToChatTargets={groupAddToChatTargets}
                onInstantiatePlugin={onInstantiatePlugin}
                onGroup={handleGroupSelected}
                onUngroup={handleUngroupGroup}
                executableChildCount={executableChildCount}
                onExecuteGroup={executeGroup}
                onCancelExecuteGroup={cancelGroupExecution}
                executingGroupIds={executingGroupIds}
                onPromoteToAsset={onPromoteToAsset}
                onDownloadAllFiles={onSaveManyAs ? handleDownloadSelectedFiles : void 0}
                onTidySubset={handleTidySubset}
                onTidyGroup={handleTidyGroup}
                onTidyGroupChildren={handleTidyGroupChildren}
                onTidyBlocked={handleTidyBlocked}
              />
              <MultiSelectPlusHandle
                selectedIds={selectedIds}
                onOpenAddNodeMenu={openAddNodeMenuFromMulti}
                onWireEdgesToTarget={wireEdgesFromMultiToTarget}
                hideAnchor={connectionSource?.showEndCap === true}
              />
              <EmptyViewportToast />
            </CanvasShell>
          </div>
          {isPresented && blockingLoadError && (
            <CanvasLoadError
              failure={blockingLoadError}
              retrying={loadRetrying}
              onRetry={retryLoad}
            />
          )}
          {isPresented &&
            !canvasReady &&
            !blockingLoadError &&
            (loadingOverlay ?? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
                {spinner}
              </div>
            ))}
          {isPresented && loadError?.phase === "refresh" && (
            <CanvasLoadError failure={loadError} retrying={loadRetrying} onRetry={retryLoad} />
          )}
          <StickerCursorPreview
            active={canvasReady && stickerMode}
            asset={selectedStickerAsset}
            emoji={stickerEmoji}
            resolvePlacement={resolveStickerPlacement}
          />
        </div>
        {addNodeMenuContent}
        <QuickZoomPresence value={paneContextMenu}>
          {(position2, motionProps) => (
            <CanvasPaneContextMenu
              position={position2}
              motionProps={motionProps}
              canUndo={canUndo}
              canRedo={canRedo}
              onClose={closePaneContextMenu}
              onUpload={handlePaneUpload}
              onAddNode={handlePaneAddNode}
              onUndo={handlePaneUndo}
              onRedo={handlePaneRedo}
              onPaste={handlePanePaste}
            />
          )}
        </QuickZoomPresence>
        <CanvasHighBlastDeleteDialog instance={instance2} />
        <CanvasConfirmationDialog
          open={clearStickersConfirmationOpen}
          title={t2("canvas.toolbar.clearStickersTitle", "清空全部贴纸")}
          description={t2("canvas.toolbar.clearStickersConfirm")}
          cancelLabel={t2("common.cancel", "取消")}
          confirmLabel={t2("canvas.toolbar.clearStickersAction", "确认清空")}
          onCancel={() => setClearStickersConfirmationOpen(false)}
          onConfirm={handleConfirmClearStickers}
        />
      </CanvasReferenceNavigationScope>
    </WorkspaceContentBudgetScopeProvider>
  );
  return <TidySortContext.Provider value={tidySort.context}>{content2}</TidySortContext.Provider>;
}
