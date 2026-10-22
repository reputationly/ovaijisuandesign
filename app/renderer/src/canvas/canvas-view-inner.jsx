// canvas-view-inner.jsx
import { CanvasNodeType } from "./canvas-geometry.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Loader2Icon } from "../media-editing/lucide-icon-wraps.js";
import { useNodesInitialized, useReactFlow, useStore, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  applyReactFlowSelectionWriteback,
  applyVisibilityPriorityFocus,
  DEFAULT_STICKER_EMOJI,
  EMPTY_SHELL_EDGES,
  EMPTY_SHELL_NODES,
  filterInitialFitFallbackNodes,
  findStickerTarget,
  getAbsoluteNodePosition,
  getTextNodeBackingPath,
  hasOtherTextNodeWithBackingPath,
  INITIAL_FIT_FALLBACK_MS,
  randomStickerRotation,
  resolveFileNodeIdByPath,
  resolveFirstFileNodeIdByPartialName,
  resolveInitialFitFallbackViewport,
  resolveInitialFitGateAction,
  resolveNewNodesToastAction,
  shouldAcquireCanvasResources,
  shouldRecenterFirstNodes,
  STICKER_BINDING_DELAY_MS,
} from "./apply-visibility-priority-focus.js";
import { buildIncrementalNodeData } from "./build-incremental-node-data.js";
import { syncStableZoomSignals } from "./separator.jsx";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  useHtmlFullscreenApi,
} from "../infra/use-plugin-metadata-store.js";
import {
  getDerivedNodePosition,
  useRecentlyAddedApi,
} from "../infra/create-recently-added-store.js";
import {
  CanvasMode,
  defaultNodeSizeForType,
  isAssetBackedNode,
  POPOVER_DRAFT_DATA_KEY,
  TABLE_CARD_DEFAULT_SIZE,
} from "./compute-group-bounds-from-children.js";
import { DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT } from "./use-video-starter-preset-store.js";
import {
  CANVAS_COMMAND_IDS,
  getNodePosition,
  readCanvasPreference,
  sizeOf,
  writeCanvasPreference,
} from "./use-active-mode.js";
import {
  useCanvasBridge,
  useGeneratingStateStore,
} from "../media-editing/package.jsx";
import { deriveEdgeId, parseNodeId } from "./find-free-position-from-anchor.js";
import { useCanvasNodeAssetsStore } from "../infra/use-canvas-node-assets-store.js";
import {
  useMultiImageOverlayApi,
  useMultiImageOverlayStore,
} from "../media-editing/use-start-cloud-edit-from-node.js";
import {
  readCanvasViewport,
  writeCanvasViewport,
} from "./resolve-visibility-priority-focus.js";
import {
  applyCanvasFocusSelection,
  canvasFocus,
  createCanvasFocusScheduler,
  createCanvasViewportStorageKey,
  deleteBlockedMessage,
  getCanvasTaskSnapshots,
  getCanvasToastId,
  historyBlockedMessage,
  resolveStickerPointerPlacement,
  STICKER_NODE_SIZE,
  useStickerFollowIndex,
} from "./resolve-canvas-focus-targets.js";
import { StickerCursorPreview } from "./sticker-cursor-preview-content.jsx";
import {
  getAssetMetaByNodeIdFromStore,
  useInactiveNodeVirtualization,
} from "./fullscreen-icon.jsx";
import {
  CanvasConfirmationDialog,
  CanvasHighBlastDeleteDialog,
  QuickZoomPresence,
  TidySortContext,
  useTidySortPreference,
} from "./canvas-high-blast-delete-dialog.jsx";
import { CanvasCommandPanelContent } from "./canvas-command-panel-content.jsx";
import { CanvasLoadError } from "./canvas-load-error.jsx";
import { CanvasPaneContextMenu } from "./canvas-pane-context-menu.jsx";
import {
  CANVAS_BACKGROUND_PATTERNS,
  collectAffectedStickerNodes,
  createCanvasResizeActions,
  getCanvasViewportStorage,
} from "./create-canvas-resize-actions.js";
import { CanvasShell } from "./canvas-shell.jsx";
import {
  CANVAS_MORE_TONES,
  CANVAS_PRIMARY_TONES,
  CANVAS_TONES,
} from "./cursor-icon.jsx";
import {
  useCanvasClickHandlers,
  useCanvasInteractionTool,
} from "./use-canvas-interaction-tool.js";
import { useCanvasContextMenus } from "./use-canvas-context-menus.js";
import {
  CANVAS_DEFAULT_STICKER_ASSET_ID,
  getCanvasStickerAsset,
} from "../media-editing/canvas-sticker-assets.jsx";
import { useCanvas } from "./use-canvas.js";
import {
  CANVAS_INITIAL_FIT_MAX_ZOOM,
  CANVAS_INITIAL_FIT_MIN_ZOOM,
  exitFullscreenForRemovedNode,
  WorkspaceContentBudgetScopeProvider,
} from "../media-editing/input.jsx";
import { useRenderableContentChange } from "./use-renderable-content-change.js";
import { computeMultiImageRenderBounds } from "../media-editing/compute-multi-image-grid-positions.jsx";
import { usePersist } from "./use-persist.js";
import { usePasteNodeTransformer } from "./create-paste-node-transformer.js";
import { useGroupExecution } from "./use-group-execution.js";
import { useHistoryState } from "./use-history-state.js";
import { useCanvasViewportFocus } from "./use-canvas-viewport-focus.js";
import {
  isReexecutableGenerationNode,
  newTablePath,
} from "./is-reexecutable-generation-node.js";
import { buildPlaceholderFillData } from "../media-editing/audio-lightbox.jsx";
import { syncStableZoomAfter } from "../media-editing/get-reference-navigation-defaults.jsx";
import { CanvasReferenceNavigationScope } from "../media-editing/reference-navigation-provider.jsx";
import { useCanvasAddNode } from "./use-canvas-add-node.js";
import { useCanvasAddNodeMenus } from "./use-canvas-add-node-menus.jsx";
import { serializeTableDocument } from "../text-editor/table-document-to-llm-content.js";
import {
  parseResourceDrag,
  RESOURCE_DRAG_MIME,
} from "../text-editor/build-asr-gateway-request.js";
import { CanvasToolbar } from "./canvas-toolbar.jsx";
import { EmptyViewportToast } from "./empty-viewport-toast.jsx";
import { CanvasViewControls } from "./canvas-view-controls.jsx";
import { SelectionToolbar } from "./selection-toolbar.js";
import { MultiSelectPlusHandle } from "./multi-select-plus-handle-inner.jsx";
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
  isActive = true,
  isPresented = isActive,
  workspaceName,
  onNewNodesNavigate,
  onPersistenceStatusChange,
  onPersistenceControllerChange,
  loadingOverlay,
  onLoadStateChange,
  handleRef,
}) {
  const { t: translate } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const [mode, setMode] = reactExports.useState(initialMode);
  // 第 343 轮（验收）：4.0.0 改了默认值 —— 没存过记录时**默认展开**。
  // 参照 index-BBp4hclA.js:297739 的读法是 `!== "0"`、异常时 true；
  // 我们这里还是 3.0.21 的 `=== "1"`（缺省收起）。写入侧本来就是存 "1"/"0"（见本文件 1862 行），
  // 所以只改读法即可，不会影响已存在的偏好。
  const [minimapVisible, setMinimapVisible] = reactExports.useState(() => {
    try {
      return localStorage.getItem("hilo:canvas:minimap") !== "0";
    } catch {
      return true;
    }
  });
  const minimapVisibleRef = reactExports.useRef(minimapVisible);
  const [edgesVisible, setEdgesVisible] = reactExports.useState(true);
  const edgesVisibleRef = reactExports.useRef(edgesVisible);
  const dragDepthRef = reactExports.useRef(0);
  const pendingMenuPastePositionRef = reactExports.useRef(null);
  const consumeMenuPastePosition = reactExports.useCallback(() => {
    const position = pendingMenuPastePositionRef.current;
    pendingMenuPastePositionRef.current = null;
    return position;
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
  const expandedMediaNodeId = useMultiImageOverlayStore(
    (state) => state.openNodeId,
  );
  const workspaceContentBudgetScope = getCurrentWorkspace?.();
  const viewportStorageKey = createCanvasViewportStorageKey(
    workspaceContentBudgetScope,
    mode,
  );
  const initialViewportOwner = viewportStorageKey ?? `unscoped:${mode}`;
  const newNodesToastId = getCanvasToastId(
    "new-nodes",
    workspaceContentBudgetScope,
  );
  const preferenceScope = encodeURIComponent(
    workspaceContentBudgetScope ?? "default",
  );
  const tidySort = useTidySortPreference(preferenceScope);
  const backgroundPatternKey = `hilo:canvas:background-pattern:${preferenceScope}`;
  const canvasToneKey = `hilo:canvas:background-tone:${preferenceScope}`;
  const [backgroundPattern, setBackgroundPattern] = reactExports.useState(() =>
    readCanvasPreference(
      backgroundPatternKey,
      CANVAS_BACKGROUND_PATTERNS,
      "dots",
    ),
  );
  const [canvasTone, setCanvasTone] = reactExports.useState(() =>
    readCanvasPreference(canvasToneKey, CANVAS_TONES, "default"),
  );
  const [moreCanvasTonesOpen, setMoreCanvasTonesOpen] = reactExports.useState(
    () => CANVAS_MORE_TONES.some((tone) => tone === canvasTone),
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
  const stickerAssetId =
    stickerSelection.kind === "asset" ? stickerSelection.id : "";
  const stickerEmoji =
    stickerSelection.kind === "emoji"
      ? stickerSelection.value
      : DEFAULT_STICKER_EMOJI;
  const [emojiPickerOpen, setEmojiPickerOpen] = reactExports.useState(true);
  const stickerSelectionOwnerRef = reactExports.useRef(
    workspaceContentBudgetScope,
  );
  reactExports.useEffect(() => {
    if (stickerSelectionOwnerRef.current === workspaceContentBudgetScope)
      return;
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
    (emoji) => {
      const nextSelection = {
        kind: "emoji",
        value: emoji,
      };
      stickerSelectionRef.current = nextSelection;
      setStickerSelection(nextSelection);
    },
    [setStickerSelection],
  );
  const [freshStickerIds, setFreshStickerIds] = reactExports.useState(
    () => new Set(),
  );
  const stickerBindingTimerRef = reactExports.useRef(null);
  const pendingStickerBindingIdsRef = reactExports.useRef(new Set());
  const [stickerFollowPositions, setStickerFollowPositions] =
    reactExports.useState(() => new Map());
  const stickerFollowPositionsRef = reactExports.useRef(new Map());
  const stickerFollowClearTimerRef = reactExports.useRef(null);
  const stickerDragActiveRef = reactExports.useRef(false);
  const flowPositionSnapshotsRef = reactExports.useRef(new Map());
  const getCommandHandlers = reactExports.useCallback(
    () => commandHandlersRef.current,
    [],
  );
  const canvasOptions = {
    mode,
    dataSource,
    plugins,
    isPresented,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    consumePastePositionOverride: consumeMenuPastePosition,
    getCurrentWorkspace,
    onNodesAdded: (ids) => handleNodesAddedRef.current(ids),
    onFirstNodesPlaced: (ids) => handleFirstNodesPlacedRef.current(ids),
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
    instance,
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
  const generatingByNode = useGeneratingStateStore((storeState) => storeState.byNode);
  const fullscreenApi = useHtmlFullscreenApi();
  reactExports.useEffect(() => {
    return instance.eventBus.on("node:removed", ({ nodeId }) => {
      exitFullscreenForRemovedNode(fullscreenApi, nodeId);
    });
  }, [fullscreenApi, instance]);
  const getStickerFollowIndex = useStickerFollowIndex(instance);
  useRenderableContentChange(nodes, onRenderableContentChange);
  reactExports.useEffect(() => {
    const snapshots = flowPositionSnapshotsRef.current;
    const liveIds = new Set();
    for (const node of nodes) {
      liveIds.add(node.id);
      snapshots.set(node.id, {
        position: {
          x: node.position.x,
          y: node.position.y,
        },
        ...(node.parentId
          ? {
              parentId: node.parentId,
            }
          : {}),
      });
    }
    for (const id of snapshots.keys()) {
      if (!liveIds.has(id)) snapshots.delete(id);
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
    return nodes.map((node) => {
      const followPosition = stickerFollowPositions.get(node.id);
      const isFresh =
        node.type === CanvasNodeType.Sticker && freshStickerIds.has(node.id);
      const keepsExpandedMediaVisible = node.id === expandedMediaNodeId;
      const nodeWidth = node.measured?.width ?? node.width;
      const nodeHeight = node.measured?.height ?? node.height;
      const renderBounds =
        keepsExpandedMediaVisible &&
        nodeWidth !== void 0 &&
        nodeHeight !== void 0
          ? computeMultiImageRenderBounds(nodeWidth, nodeHeight)
          : void 0;
      if (!followPosition && !isFresh && !renderBounds) return node;
      return {
        ...node,
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
                ...(node.data ?? {}),
                __fresh: true,
              },
            }
          : {}),
      };
    });
  }, [
    expandedMediaNodeId,
    freshStickerIds,
    nodes,
    shouldRenderNodes,
    stickerFollowPositions,
  ]);
  const shellEdges = shouldRenderNodes ? edges : EMPTY_SHELL_EDGES;
  const persistenceController = usePersist({
    instance,
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
    const offIntercept = instance.eventBus.intercept(
      "node:removed",
      ({ nodeId }) => {
        const node = instance.getGraph().nodes.find((node) => node.id === nodeId);
        const filePath = node
          ? getTextNodeBackingPath(node, assetMetadataStore)
          : null;
        if (filePath) pendingDeletePaths.set(nodeId, filePath);
        else pendingDeletePaths.delete(nodeId);
        return true;
      },
    );
    const offRemoved = instance.eventBus.on("node:removed", ({ nodeId }) => {
      const filePath = pendingDeletePaths.get(nodeId);
      pendingDeletePaths.delete(nodeId);
      if (!filePath) return;
      if (
        hasOtherTextNodeWithBackingPath(
          instance.getGraph().nodes,
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
  }, [assetMetadataStore, onDeleteTextFileIfEmpty, instance]);
  reactExports.useEffect(() => {
    if (!onTextNodeRemoved) return;
    const removedTextNodeIds = new Set();
    const offIntercept = instance.eventBus.intercept(
      "node:removed",
      ({ nodeId }) => {
        const node = instance.getGraph().nodes.find((node) => node.id === nodeId);
        if (node?.type === CanvasNodeType.Text) removedTextNodeIds.add(nodeId);
        else removedTextNodeIds.delete(nodeId);
        return true;
      },
    );
    const offRemoved = instance.eventBus.on("node:removed", ({ nodeId }) => {
      if (!removedTextNodeIds.delete(nodeId)) return;
      onTextNodeRemoved(nodeId);
    });
    return () => {
      offIntercept();
      offRemoved();
      removedTextNodeIds.clear();
    };
  }, [instance, onTextNodeRemoved]);
  const {
    executeGroup,
    cancelExecution: cancelGroupExecution,
    executingGroupIds,
  } = useGroupExecution(instance);
  const executableChildCount = reactExports.useMemo(() => {
    if (selectedIds.length !== 1) return 0;
    const groupId = selectedIds[0];
    const groupNode = nodes.find((node) => node.id === groupId);
    if (!groupNode || groupNode.type !== CanvasNodeType.Group) return 0;
    let count = 0;
    for (const node of nodes) {
      if (node.parentId === groupId && isReexecutableGenerationNode(node)) {
        count++;
      }
    }
    return count;
  }, [nodes, selectedIds]);
  const createPlaceholderFillGuard = reactExports.useCallback(
    (nodeId) => {
      const target = instance
        .getGraph()
        .nodes.find((node) => node.id === nodeId);
      return () =>
        Boolean(
          target?.isEmpty &&
          !target.assetId &&
          instance.getGraph().nodes.find((node) => node.id === nodeId) ===
            target,
        );
    },
    [instance],
  );
  const fillEmptyPlaceholderWithAsset = reactExports.useCallback(
    (nodeId, payload, opts) => {
      const target = instance.getGraph().nodes.find((node) => node.id === nodeId);
      if (!target) return false;
      const data = buildPlaceholderFillData(target.data ?? {}, !!opts?.staged);
      data.name = payload.name;
      data.path = payload.path;
      if (payload.intrinsicWidth != null) data.width = payload.intrinsicWidth;
      if (payload.intrinsicHeight != null)
        data.height = payload.intrinsicHeight;
      const fill = {
        type: payload.type,
        assetId: payload.assetId,
        data,
        size: payload.size,
      };
      if (opts?.staged) {
        instance.stagePlaceholderFill(nodeId, fill);
        instance.eventBus.emit({
          type: "persist:flush",
        });
      } else {
        instance.markPlaceholderFilled(nodeId, fill);
      }
      const runtimeNode = instance
        .getGraph()
        .nodes.find((node) => node.id === nodeId);
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
          data,
        });
      }
      const fakeFileNode = {
        id: payload.assetId,
        type: payload.type,
        assetId: payload.assetId,
        size: payload.size,
        data,
      };
      const { meta } = buildIncrementalNodeData(
        fakeFileNode,
        dataSource.resolveFileUrlById?.bind(dataSource),
      );
      if (meta) {
        assetMetadataStore.getState().setMany([
          [payload.assetId, meta],
          [nodeId, meta],
        ]);
      }
      return true;
    },
    [assetMetadataStore, instance, savedPositionsRef, dataSource],
  );
  const getIncomingSourceIdsForHandle = reactExports.useCallback(
    (nodeId) => {
      const sources = [];
      for (const edge of instance.getGraph().edges) {
        if (edge.target === nodeId) sources.push(edge.source);
      }
      return sources;
    },
    [instance],
  );
  const collectFileNodeRefsForHandle = reactExports.useCallback(
    (nodeIds) => {
      const graphNodes = instance.getGraph().nodes;
      const childrenByParent = new Map();
      const nodeById = new Map();
      for (const node of graphNodes) {
        nodeById.set(node.id, node);
        if (!node.parentId) continue;
        const arr = childrenByParent.get(node.parentId);
        if (arr) arr.push(node);
        else childrenByParent.set(node.parentId, [node]);
      }
      const assetStore = assetMetadataStore.getState();
      const out = [];
      const visited = new Set();
      const walk = (id) => {
        if (visited.has(id)) return;
        visited.add(id);
        const node = nodeById.get(id);
        if (!node) return;
        if (node.type === CanvasNodeType.Group) {
          for (const child of childrenByParent.get(id) ?? []) walk(child.id);
          return;
        }
        if (node.type === CanvasNodeType.Table) {
          const tablePath = node.data?.tablePath;
          if (tablePath)
            out.push({
              nodeId: id,
              filePath: tablePath,
              fileType: "table",
            });
          return;
        }
        if (isAssetBackedNode(node.type)) {
          const { assetId } = parseNodeId(id);
          const meta = assetStore.get(assetId);
          if (meta?.path)
            out.push({
              nodeId: id,
              filePath: meta.path,
              fileType: meta.type,
            });
          return;
        }
      };
      for (const id of nodeIds) walk(id);
      return out;
    },
    [instance, assetMetadataStore],
  );
  const handleDownloadSelectedFiles = reactExports.useCallback(
    (nodeIds) => {
      if (!onSaveManyAs) return;
      const seen = new Set();
      const files = [];
      for (const ref of collectFileNodeRefsForHandle(nodeIds)) {
        if (seen.has(ref.filePath)) continue;
        seen.add(ref.filePath);
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
    const groupId = selectedIds[0];
    const groupNode = nodes.find((node) => node.id === groupId);
    if (!groupNode || groupNode.type !== CanvasNodeType.Group) return [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return collectFileNodeRefsForHandle([groupId]).map(
      ({ nodeId, filePath, fileType }) => {
        const fileNode = nodeById.get(nodeId);
        const title =
          fileType === "table"
            ? fileNode?.data?.title?.trim() ||
              translate("canvas.table.untitled", "Untitled table")
            : void 0;
        return {
          filePath,
          filename: title
            ? `${title}.htable`
            : (filePath.split("/").pop() ?? filePath),
          nodeId,
        };
      },
    );
  }, [collectFileNodeRefsForHandle, nodes, selectedIds, translate]);
  const findNodeIdByFilePathForHandle = reactExports.useCallback(
    (rawPath) => {
      if (!rawPath) return null;
      const assetStore = assetMetadataStore.getState();
      const graphNodes = instance.getGraph().nodes;
      const candidates = [];
      for (const node of graphNodes) {
        if (node.type === CanvasNodeType.Group) continue;
        if (node.type === CanvasNodeType.Table) {
          candidates.push({
            nodeId: node.id,
            path: node.data?.tablePath,
          });
          continue;
        }
        const { assetId } = parseNodeId(node.id);
        const meta = assetStore.get(assetId);
        candidates.push({
          nodeId: node.id,
          path: meta?.path,
        });
      }
      return resolveFileNodeIdByPath(rawPath, candidates);
    },
    [instance, assetMetadataStore],
  );
  const findNodeIdByPartialFileName = reactExports.useCallback(
    (rawName) => {
      const assetStore = assetMetadataStore.getState();
      const candidates = instance.getGraph().nodes.flatMap((node) => {
        if (node.type === CanvasNodeType.Group) return [];
        const data = node.data;
        const assetId =
          node.assetId ??
          (typeof data?.assetId === "string" ? data.assetId : void 0) ??
          parseNodeId(node.id).assetId;
        const meta = assetStore.get(assetId) ?? assetStore.get(node.id);
        const path =
          node.type === CanvasNodeType.Table &&
          typeof data?.tablePath === "string"
            ? data.tablePath
            : (meta?.path ??
              (typeof data?.path === "string" ? data.path : void 0));
        const candidateName =
          typeof data?.name === "string"
            ? data.name
            : typeof meta?.name === "string"
              ? meta.name
              : void 0;
        return [
          {
            nodeId: node.id,
            name: candidateName,
            path,
          },
        ];
      });
      return resolveFirstFileNodeIdByPartialName(rawName, candidates);
    },
    [instance, assetMetadataStore],
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
        ...new Set(
          paths
            .map(findNodeIdByFilePathForHandle)
            .filter((nodeId) => Boolean(nodeId)),
        ),
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
    const workspaceId = getCurrentWorkspace?.();
    const sync = () =>
      useCanvasNodeAssetsStore.getState().setFromNodes(
        workspaceId,
        // Index by each node's REAL backing asset id (node.assetId →
        // data.assetId → parseNodeId fallback for legacy assetId-encoded ids).
        // Node ids are decoupled random UUIDs now, so reverse lookups must key
        // off the asset id, not the node id — otherwise chat / file-explorer
        // "locate on canvas" silently no-ops for generated media.
        instance.getGraph().nodes.map((node) => ({
          nodeId: node.id,
          assetId: node.assetId ?? node.data?.assetId ?? parseNodeId(node.id).assetId,
        })),
      );
    sync();
    return instance.onGraphChange(sync);
  }, [getCurrentWorkspace, instance]);
  reactExports.useEffect(() => {
    const workspaceId = getCurrentWorkspace?.();
    return () =>
      useCanvasNodeAssetsStore.getState().clearWorkspace(workspaceId);
  }, [getCurrentWorkspace]);
  const prevTasksRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    const next = getCanvasTaskSnapshots(nodes, generatingByNode);
    const prev = prevTasksRef.current;
    if (
      next.length === prev.length &&
      next.every(
        (task, index) =>
          task.id === prev[index].id &&
          task.label === prev[index].label &&
          task.detail === prev[index].detail,
      )
    ) {
      return;
    }
    prevTasksRef.current = next;
    const snapshot = next;
    queueMicrotask(() => onCanvasTasksChange?.(snapshot));
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
  const scheduleCanvasFocusRef = reactExports.useRef(
    (_nodeIds, _options) => {},
  );
  const focusNodeIdsRef = reactExports.useRef(() => {});
  const cancelPendingFocusRef = reactExports.useRef(() => {});
  focusNodeIdsRef.current = (nodeIds, options) => {
    if (nodeIds.length === 0) return;
    const zoom =
      options?.zoom ?? (options?.preserveZoom ? "preserve" : void 0);
    scheduleCanvasFocusRef.current(nodeIds, {
      delay:
        options?.expandAncestorGroups && canvasFocus.expand(instance, nodeIds)
          ? 120
          : 300,
      padding: 0.3,
      duration: 400,
      visibilityPriority: options?.visibilityPriority,
      zoom,
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
          return nodeIds.every((id) => {
            const node = nodeLookup.get(id);
            return Boolean(node?.measured?.width && node.measured.height);
          });
        },
        fit: ({
          nodeIds,
          padding,
          duration,
          visibilityPriority,
          zoom,
        }) => {
          if (visibilityPriority && zoom === void 0) {
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
          if (zoom === void 0) {
            syncStableZoomAfterViewportChange(
              fitView({
                nodes: nodeIds.map((id) => ({
                  id,
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
          for (const id of nodeIds) {
            const node = nodeLookup.get(id);
            const width = node?.measured?.width;
            const height = node?.measured?.height;
            if (!node || !width || !height) return;
            const position = node.internals.positionAbsolute;
            minX = Math.min(minX, position.x);
            minY = Math.min(minY, position.y);
            maxX = Math.max(maxX, position.x + width);
            maxY = Math.max(maxY, position.y + height);
          }
          if (!Number.isFinite(minX)) return;
          const targetZoom =
            zoom === "preserve"
              ? getViewport().zoom
              : Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom));
          syncStableZoomAfterViewportChange(
            setCenter((minX + maxX) / 2, (minY + maxY) / 2, {
              zoom: targetZoom,
              duration,
            }),
          );
        },
      }),
    [
      fitView,
      getViewport,
      setCenter,
      setViewport,
      storeApi,
      syncStableZoomAfterViewportChange,
    ],
  );
  scheduleCanvasFocusRef.current = (nodeIds, options) =>
    focusScheduler.request({
      nodeIds,
      ...options,
    });
  cancelPendingFocusRef.current = focusScheduler.cancel;
  reactExports.useEffect(
    () => () => focusScheduler.dispose(),
    [focusScheduler],
  );
  const isActiveRef = reactExports.useRef(isActive);
  isActiveRef.current = isActive;
  const isPresentedRef = reactExports.useRef(isPresented);
  isPresentedRef.current = isPresented;
  const onNewNodesNavigateRef = reactExports.useRef(onNewNodesNavigate);
  reactExports.useEffect(() => {
    onNewNodesNavigateRef.current = onNewNodesNavigate;
  }, [onNewNodesNavigate]);
  reactExports.useEffect(() => {
    handleFirstNodesPlacedRef.current = (ids) => {
      if (
        !shouldRecenterFirstNodes({
          canvasPresented: isPresentedRef.current,
          nodeCount: ids.length,
        })
      ) {
        return;
      }
      const graph = instance.getGraph();
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const id of ids) {
        const node = graph.nodes.find((node) => node.id === id);
        const pos = node?.positions?.[mode];
        if (!node || !pos) continue;
        const size = node.size ?? defaultNodeSizeForType(node.type);
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + size.width);
        maxY = Math.max(maxY, pos.y + size.height);
      }
      if (Number.isFinite(minX)) {
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const { zoom } = getViewport();
        void setCenter(cx, cy, {
          zoom,
        });
      }
    };
    handleNodesAddedRef.current = (ids) => {
      if (ids.length === 0) return;
      recentlyAddedApi.getState().addMany(ids);
      for (const id of ids) {
        if (!pendingNodeIdsRef.current.includes(id)) {
          pendingNodeIdsRef.current.push(id);
        }
      }
      const allIds = pendingNodeIdsRef.current;
      const isCrossWorkspace = !isActive;
      let message;
      if (isCrossWorkspace && workspaceName) {
        message =
          allIds.length === 1
            ? translate("canvas.newNodeReady.crossWorkspace", {
                workspace: workspaceName,
                defaultValue: "{{workspace}} 中节点已生成",
              })
            : translate("canvas.newNodesReady.crossWorkspace", {
                count: allIds.length,
                workspace: workspaceName,
                defaultValue: "{{workspace}} 中 {{count}} 个节点已生成",
              });
      } else {
        message =
          allIds.length === 1
            ? translate("canvas.newNodeReady", "节点已经生成好了，去看看")
            : translate("canvas.newNodesReady", {
                count: allIds.length,
                defaultValue: "{{count}} 个节点已生成，去看看",
              });
      }
      dedupedToast(message, {
        id: newNodesToastId,
        duration: 8e3,
        action: {
          label: translate("canvas.newNodeReady.action", "去看看"),
          onClick: () => {
            const action = resolveNewNodesToastAction({
              projectActive: isActiveRef.current,
              canvasPresented: isPresentedRef.current,
            });
            if (action === "navigate") {
              onNewNodesNavigateRef.current?.(allIds.slice());
              return;
            }
            const existing = allIds.filter((id) =>
              instance.getGraph().nodes.some((node) => node.id === id),
            );
            if (existing.length === 0) return;
            const targets = existing.map((id) => ({
              id,
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
                setTimeout(
                  () => syncStableZoomAfterViewportChange(fitView(opts)),
                  500,
                );
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
    mode,
    syncStableZoomAfterViewportChange,
    syncStableZoomFromViewport,
    translate,
    recentlyAddedApi,
    instance,
    isActive,
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
      prev.every((id, index) => id === selectedIds[index])
    ) {
      return;
    }
    lastSelectionRef.current = selectedIds;
    onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);
  usePasteNodeTransformer({
    instance,
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
    instance,
    onNodeContextMenu: bridgeContextMenu,
    onUpload: bridgeUpload,
    onRequestSystemPaste: onRequestSystemPaste
      ? (position) => {
          pendingMenuPastePositionRef.current = position;
          onRequestSystemPaste();
          window.setTimeout(() => {
            if (pendingMenuPastePositionRef.current === position) {
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
      const size = props.size ?? defaultNodeSizeForType(props.type);
      const cx = props.position.x + size.width / 2;
      const cy = props.position.y + size.height / 2;
      const currentZoom = storeApi.getState().transform[2];
      void setCenter(cx, cy, {
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
      const meta = getAssetMetaByNodeIdFromStore(assetMetadataStore, nodeId);
      if (!meta?.path) return "";
      try {
        return await loadTextContent(meta.path);
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
    instance,
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
      updateNodeData: (nodeId, data) => {
        instance.updateNodeData(nodeId, data);
        instance.eventBus.emit({
          type: "persist:request",
        });
      },
      mergeNodeData: (nodeId, patch) => {
        instance.mergeNodeData(nodeId, patch);
        instance.eventBus.emit({
          type: "persist:request",
        });
      },
      setStickerSelectionAsset: handleStickerAssetChange,
      setStickerSelectionEmoji: handleStickerEmojiChange,
      mergeNodeDataSilent: (nodeId, patch) => {
        instance.mergeNodeDataSilent(nodeId, patch);
      },
      setNodeHidden: (nodeId, hidden) => {
        instance.updateNodesMeta([nodeId], {
          hidden,
        });
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      updateNodeDataSilent: (nodeId, data) => {
        instance.updateNodeDataSilent(nodeId, data);
      },
      ...createCanvasResizeActions(instance),
      resizeGroupNode: (groupId, positionX, positionY, width, height) => {
        instance.resizeGroupNode(
          groupId,
          {
            x: positionX,
            y: positionY,
          },
          {
            width,
            height,
          },
        );
        instance.eventBus.emit({
          type: "persist:request",
        });
      },
      replaceNodeId: (oldId, newId) => {
        instance.replaceNodeId(oldId, newId);
        savedPositionsRef.current?.delete(oldId);
        const map = replacedIdsRef.current;
        map.set(oldId, newId);
        if (map.size > 200) {
          const first = map.keys().next().value;
          if (first !== void 0) map.delete(first);
        }
      },
      promoteCloneToPrimary: (nodeId, forked) => {
        instance.promoteCloneToPrimary(nodeId, forked);
      },
      savePopoverDraft: (nodeId, key, draft) => {
        const node = instance.getGraph().nodes.find((node) => node.id === nodeId);
        if (!node) return;
        const prevData = node.data ?? {};
        const prevMap = prevData[POPOVER_DRAFT_DATA_KEY] ?? {};
        const nextMap = {
          ...prevMap,
        };
        if (draft === void 0) delete nextMap[key];
        else
          nextMap[key] = {
            ...draft,
            source: draft.source ?? "user",
          };
        const nextData = {
          ...prevData,
        };
        if (Object.keys(nextMap).length === 0)
          delete nextData[POPOVER_DRAFT_DATA_KEY];
        else nextData[POPOVER_DRAFT_DATA_KEY] = nextMap;
        instance.updateNodeDataSilent(nodeId, nextData);
      },
      openAddNodeMenu,
      openAddNodeMenuFromMulti,
      focusNodeIds: (nodeIds, options) =>
        focusNodeIdsRef.current(nodeIds, options),
      findNodeIdByPartialFileName,
      focusDerivedNode,
      focusNextDerivedFrom,
      attachDraftOnNextDerived,
      getIncomingSourceIds: (nodeId) => {
        const sources = [];
        for (const edge of instance.getGraph().edges) {
          if (edge.target === nodeId) sources.push(edge.source);
        }
        return sources;
      },
      getOutgoingTargetIds: (nodeId) => {
        const targets = [];
        for (const edge of instance.getGraph().edges) {
          if (edge.source === nodeId) targets.push(edge.target);
        }
        return targets;
      },
      subscribeGraphChange: (cb) => instance.onGraphChange(() => cb()),
      subscribeNodeDataChange: (nodeId, cb) => {
        return instance.eventBus.on(
          "node:data-changed",
          ({ nodeId: id, data }) => {
            if (id !== nodeId) return;
            cb(data);
          },
        );
      },
      subscribeIncomingChange: (nodeId, cb) => {
        let incomingEdgeIds = new Set();
        for (const edge of instance.getGraph().edges) {
          if (edge.target === nodeId) incomingEdgeIds.add(edge.id);
        }
        const offAdd = instance.eventBus.on("edge:added", ({ edge }) => {
          if (edge.target !== nodeId) return;
          incomingEdgeIds.add(edge.id);
          cb();
        });
        const offRemove = instance.eventBus.on(
          "edge:removed",
          ({ edgeId }) => {
            if (!incomingEdgeIds.delete(edgeId)) return;
            cb();
          },
        );
        const offHistory = instance.history.onHistoryChange(() => {
          const next = new Set();
          for (const edge of instance.getGraph().edges) {
            if (edge.target === nodeId) next.add(edge.id);
          }
          if (next.size !== incomingEdgeIds.size) {
            incomingEdgeIds = next;
            cb();
            return;
          }
          for (const id of next) {
            if (!incomingEdgeIds.has(id)) {
              incomingEdgeIds = next;
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
      getNodeIdByPath: (path) => {
        if (!path) return null;
        const store = assetMetadataStore.getState();
        const nodes = instance.getGraph().nodes;
        const matches = [];
        for (const node of nodes) {
          const nodeAssetId = node.data?.assetId;
          if (typeof nodeAssetId !== "string") continue;
          const meta = store.get(nodeAssetId) ?? store.get(node.id);
          if (meta?.path === path) matches.push(node);
        }
        if (matches.length === 0) return null;
        const origin = matches.find((node) => node.meta?.cloneOf == null);
        return (origin ?? matches[0]).id;
      },
      ensureStandaloneNodeForPath: (path) => {
        if (!path) return null;
        const store = assetMetadataStore.getState();
        const nodes = instance.getGraph().nodes;
        const matches = [];
        for (const node of nodes) {
          const nodeAssetId = node.data?.assetId;
          if (typeof nodeAssetId !== "string") continue;
          const meta = store.get(nodeAssetId) ?? store.get(node.id);
          if (meta?.path === path) matches.push(node);
        }
        if (matches.length === 0) return null;
        const origin = matches.find((node) => node.meta?.cloneOf == null);
        const picked = origin ?? matches[0];
        if (picked.meta?.hidden === true && picked.groupId) {
          const detachedId = instance.detachSubImageToFreeSlot(picked.id);
          if (detachedId) return detachedId;
        }
        return picked.id;
      },
      ensureStandaloneNodeById: (nodeId) => {
        if (!nodeId) return null;
        const picked = instance
          .getGraph()
          .nodes.find((node) => node.id === nodeId);
        if (!picked) return null;
        if (picked.meta?.hidden === true && picked.groupId) {
          return instance.detachSubImageToFreeSlot(picked.id) ?? null;
        }
        return picked.id;
      },
      getIncomingSourceNodeIdByPath: (targetNodeId, path) => {
        if (!targetNodeId || !path) return null;
        const graph = instance.getGraph();
        const store = assetMetadataStore.getState();
        for (const edge of graph.edges) {
          if (edge.target !== targetNodeId || edge.type !== "derivation")
            continue;
          const source = graph.nodes.find((node) => node.id === edge.source);
          if (!source) continue;
          const sourceAssetId = source.data?.assetId;
          if (typeof sourceAssetId !== "string") continue;
          const meta = store.get(sourceAssetId) ?? store.get(source.id);
          if (meta?.path === path) return source.id;
        }
        return null;
      },
      getNodeById: (nodeId) => {
        if (!nodeId) return null;
        const node = instance.getGraph().nodes.find((node) => node.id === nodeId);
        if (!node) return null;
        const mode = instance.getMode();
        const nodeAssetId = node.assetId;
        return {
          id: node.id,
          type: node.type,
          position: getNodePosition(node, mode),
          size: sizeOf(node, mode),
          data: node.data ?? {},
          ...(typeof nodeAssetId === "string" && nodeAssetId.length > 0
            ? {
                assetId: nodeAssetId,
              }
            : {}),
          ...(node.meta
            ? {
                meta: node.meta,
              }
            : {}),
          ...(node.groupId
            ? {
                groupId: node.groupId,
              }
            : {}),
          ...(Number.isInteger(node.round)
            ? {
                round: node.round,
              }
            : {}),
          ...(node.isEmpty
            ? {
                isEmpty: true,
              }
            : {}),
        };
      },
      getSubImages: (mainId) => instance.getSubImagesByParent(mainId),
      promoteSubImageToMain: (subId, opts) => {
        instance.promoteSubImageToMain(subId, opts);
      },
      detachSubImage: (subId, absPosition) => {
        instance.detachSubImage(subId, absPosition);
      },
      detachSubImages: (entries) => {
        instance.detachSubImages(entries);
      },
      ensureDerivationEdge: (sourceId, targetId) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        const id = deriveEdgeId(sourceId, targetId);
        const edges = instance.getGraph().edges;
        if (edges.some((edge) => edge.id === id)) return;
        instance.addEdge({
          id,
          source: sourceId,
          target: targetId,
          type: "derivation",
        });
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      removeDerivationEdge: (sourceId, targetId) => {
        if (!sourceId || !targetId) return;
        const id = deriveEdgeId(sourceId, targetId);
        const edges = instance.getGraph().edges;
        if (!edges.some((edge) => edge.id === id)) return;
        instance.removeEdges([id]);
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      ungroupNode: (groupId) => {
        instance.ungroup(groupId);
      },
      selectNodeExclusive: (nodeId) => {
        instance.selection.set([nodeId]);
      },
      clearSelection: () => {
        instance.selection.clear();
      },
      removeNode: (nodeId) => {
        instance.removeNode(nodeId);
        instance.eventBus.emit({
          type: "persist:flush",
        });
      },
      copyNode: (nodeId) => {
        const isSelected = instance.selection.getSelected().includes(nodeId);
        if (!isSelected) instance.selection.set([nodeId]);
        instance.copySelected({
          workspace: getCurrentWorkspace?.(),
          resolveAssetPath: (assetId) =>
            assetMetadataStore.getState().get(assetId)?.path,
        });
        void instance.pasteFromClipboard();
      },
      openNodeContextMenu: (event, nodeId) => {
        dispatchNodeMenu(event, nodeId);
      },
      closeContextMenus: () => {
        closeAllMenus();
      },
      relayoutGroup: (groupId, layout) => {
        instance.relayoutGroup(groupId, layout);
      },
      tidyGroupChildren: (groupId, layout) => {
        void tidySort.finish(
          commands.tidyGroupChildren(groupId, layout, true, tidySort.sortBy),
        );
      },
      setGroupCollapsed: (groupId, collapsed) => {
        instance.setGroupCollapsed(groupId, collapsed);
      },
      addTableNodeFromDocument: async (doc, sourceNodeId) => {
        if (!saveTableContent) {
          console.warn("[canvas] saveTableContent bridge not provided");
          return null;
        }
        const tablePath = newTablePath();
        const tableNodeId = crypto.randomUUID();
        const source =
          sourceNodeId &&
          instance.getGraph().nodes.some((node) => node.id === sourceNodeId)
            ? sourceNodeId
            : void 0;
        try {
          await saveTableContent(tablePath, serializeTableDocument(doc));
          const position = source
            ? getDerivedNodePosition(
                reactFlowInstance,
                source,
                instance.getGraph().edges,
                TABLE_CARD_DEFAULT_SIZE.width,
              )
            : getAddNodePosition();
          addNodeWithRecenter({
            type: CanvasNodeType.Table,
            id: tableNodeId,
            data: {
              tablePath,
            },
            position,
            size: TABLE_CARD_DEFAULT_SIZE,
          });
          if (source) {
            instance.addEdge({
              id: deriveEdgeId(source, tableNodeId),
              source,
              target: tableNodeId,
              type: "derivation",
            });
            instance.eventBus.emit({
              type: "persist:flush",
            });
          }
          return tableNodeId;
        } catch (err) {
          console.error(
            "[canvas] Failed to create table node from document:",
            err,
          );
          return null;
        }
      },
      flushPersist: () => {
        let pending;
        instance.eventBus.emit({
          type: "persist:flush",
          waitUntil: (promise) => {
            pending = promise;
          },
        });
        return pending ?? Promise.resolve();
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
      instance,
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
    (ids) => {
      instance.groupNodes(ids);
    },
    [instance],
  );
  const handleUngroupGroup = reactExports.useCallback(
    (groupId) => {
      instance.ungroup(groupId);
    },
    [instance],
  );
  const isCanvasDropDrag = reactExports.useCallback((event) => {
    const types = Array.from(event.dataTransfer.types);
    return types.includes(RESOURCE_DRAG_MIME) || types.includes("Files");
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
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (items && items.length > 0) {
        onResourceDrop?.(items, position);
        return;
      }
      if (files.length > 0) {
        onNativeFileDrop?.(files, position);
      }
    },
    [onNativeFileDrop, onResourceDrop, screenToFlowPosition],
  );
  const handleSortByConnections = reactExports.useCallback(
    () => commands.autoLayout(),
    [commands],
  );
  const handleSortByMediaType = reactExports.useCallback(
    () => commands.autoLayoutByCategory(),
    [commands],
  );
  const handleTidyCanvasLayout = reactExports.useCallback(
    (layout, includeDeps) => {
      return tidySort.finish(
        commands.autoLayoutAll(layout, includeDeps, tidySort.sortBy),
      );
    },
    [commands, tidySort],
  );
  const handleTidySubset = reactExports.useCallback(
    (layout, includeDeps) => {
      return tidySort.finish(
        commands.autoLayoutSubset(
          selectedIds,
          layout,
          includeDeps,
          tidySort.sortBy,
        ),
      );
    },
    [commands, selectedIds, tidySort],
  );
  const handleTidyGroup = reactExports.useCallback(
    (groupId, layout, includeDeps) => {
      return tidySort.finish(
        commands.tidyGroupChildren(
          groupId,
          layout,
          includeDeps,
          tidySort.sortBy,
        ),
      );
    },
    [commands, tidySort],
  );
  const handleTidyGroupChildren = reactExports.useCallback(
    (groupId, childIds, layout) => {
      return tidySort.finish(
        commands.tidyGroupChildrenSubset(
          groupId,
          childIds,
          layout,
          tidySort.sortBy,
        ),
      );
    },
    [commands, tidySort],
  );
  const handleTidyBlocked = reactExports.useCallback(() => {
    dedupedToast(
      translate(
        "canvas.tidy.mixedSelection",
        "跨编组或编组内外混选时无法布局，请只选中同一编组内的元素",
      ),
    );
  }, [translate]);
  const { canUndo, canRedo } = useHistoryState(instance);
  reactExports.useEffect(() => {
    return instance.eventBus.on("history:blocked", ({ direction, reason }) => {
      dedupedToast.warning(historyBlockedMessage(translate, direction, reason), {
        id: getCanvasToastId("history-blocked", workspaceContentBudgetScope),
      });
    });
  }, [instance, translate, workspaceContentBudgetScope]);
  reactExports.useEffect(() => {
    return instance.eventBus.on("delete:blocked", ({ reason }) => {
      dedupedToast.warning(deleteBlockedMessage(translate, reason), {
        id: getCanvasToastId("delete-blocked", workspaceContentBudgetScope),
      });
    });
  }, [instance, translate, workspaceContentBudgetScope]);
  const handleRootElChange = reactExports.useCallback(
    (el) => instance.setRootEl(el),
    [instance],
  );
  const handleSelectionChange = reactExports.useCallback(
    (ids) => {
      applyReactFlowSelectionWriteback({
        ids,
        syncing: syncingRef.current,
        // Read via ref: the callback identity must not churn on tab
        // switches, and hidden-Canvas echoes (empty selection emitted when
        // presentation virtualization unmounts the nodes) must not
        // clear the user's real selection.
        active: isPresentedRef.current,
        writeSelection: (next) => instance.selection.set(next),
        closeMenus: closeAllMenus,
      });
    },
    [closeAllMenus, instance, syncingRef],
  );
  const handlePaneUndo = reactExports.useCallback(() => {
    instance.undo();
  }, [instance]);
  const handlePaneRedo = reactExports.useCallback(() => {
    instance.redo();
  }, [instance]);
  const handleToggleMinimap = reactExports.useCallback(() => {
    const next = !minimapVisibleRef.current;
    minimapVisibleRef.current = next;
    setMinimapVisible(next);
    try {
      localStorage.setItem("hilo:canvas:minimap", next ? "1" : "0");
    } catch {}
    onCanvasViewControl?.({
      action: "minimap_toggle",
      zoomAfter: Math.round(getViewport().zoom * 100),
      minimapVisible: next,
    });
  }, [getViewport, onCanvasViewControl]);
  const handleToggleEdges = reactExports.useCallback(() => {
    const next = !edgesVisibleRef.current;
    edgesVisibleRef.current = next;
    setEdgesVisible(next);
    onCanvasViewControl?.({
      action: "edges_toggle",
      zoomAfter: Math.round(getViewport().zoom * 100),
      edgesVisible: next,
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
    () => nodes.filter((node) => node.type === CanvasNodeType.Sticker),
    [nodes],
  );
  const [clearStickersConfirmationOpen, setClearStickersConfirmationOpen] =
    reactExports.useState(false);
  const allStickersHidden = reactExports.useMemo(() => {
    if (stickerNodes.length === 0) return false;
    const hiddenStickerIds = new Set(
      instance
        .getGraph()
        .nodes.filter(
          (node) =>
            node.type === CanvasNodeType.Sticker && node.meta?.hidden,
        )
        .map((node) => node.id),
    );
    return stickerNodes.every((sticker) => hiddenStickerIds.has(sticker.id));
  }, [instance, stickerNodes]);
  const handleStickerVisibility = reactExports.useCallback(
    (hidden) => {
      instance.updateNodesMeta(
        stickerNodes.map((sticker) => sticker.id),
        {
          hidden,
        },
      );
      instance.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance, stickerNodes],
  );
  const handleClearStickers = reactExports.useCallback(() => {
    if (stickerNodes.length === 0) return;
    setClearStickersConfirmationOpen(true);
  }, [stickerNodes.length]);
  const handleConfirmClearStickers = reactExports.useCallback(() => {
    setClearStickersConfirmationOpen(false);
    instance.runExplicitlyConfirmedDeletion(() => {
      instance.removeNodes(stickerNodes.map((sticker) => sticker.id));
    });
    instance.eventBus.emit({
      type: "persist:flush",
    });
    setInteractionTool("select");
  }, [instance, stickerNodes, setInteractionTool]);
  const { handleFitView, handleFocusSelection, handleMinimapNodeSelect } =
    useCanvasViewportFocus(instance);
  const nodesInitialized = useNodesInitialized();
  const flowViewportWidth = useStore((state) => state.width);
  const flowViewportHeight = useStore((state) => state.height);
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
      if ((initialHydratedNodeCount ?? 0) > 0 && allCurrentNodes.length === 0)
        return;
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
    const timeout = window.setTimeout(() => {
      applyInitialViewport();
    }, INITIAL_FIT_FALLBACK_MS);
    return () => window.clearTimeout(timeout);
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
    return instance.eventBus.on("mode:changed", (event) => {
      setMode(event.mode);
    });
  }, [instance]);
  reactExports.useEffect(() => {
    if (!dataSource.onCanvasFocus) return;
    return dataSource.onCanvasFocus((event) => {
      if (event.nodeIds.length === 0) return;
      const map = replacedIdsRef.current;
      const graphNodes = instance.getGraph().nodes;
      const existingNodeIds = new Set(graphNodes.map((node) => node.id));
      const resolvedIds = event.nodeIds
        .map((id) => map.get(id) ?? id)
        .filter((id) => existingNodeIds.has(id));
      if (resolvedIds.length === 0) return;
      const focusTargets = canvasFocus.resolve(
        graphNodes,
        resolvedIds,
        event.preferParentGroup,
      );
      if (focusTargets.nodeIds.length === 0) return;
      for (const groupId of focusTargets.groupIdsToExpand ?? []) {
        instance.setGroupCollapsed(groupId, false);
      }
      applyCanvasFocusSelection(
        instance.selection,
        focusTargets.nodeIds,
        event.select,
      );
      let didPromote = false;
      let overlayTargetId = null;
      for (const id of focusTargets.nodeIds) {
        if (instance.resolveImageGroupMainId(id) !== id) {
          instance.promoteSubImageToMain(id);
          didPromote = true;
          overlayTargetId = id;
        }
      }
      if (didPromote) {
        if (overlayTargetId)
          multiImageOverlayApi.getState().open(overlayTargetId);
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
  }, [dataSource, instance, multiImageOverlayApi]);
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
  }, [
    getViewport,
    zoomIn,
    syncStableZoomAfterViewportChange,
    trackToolbarZoom,
  ]);
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
  }, [
    getViewport,
    zoomOut,
    syncStableZoomAfterViewportChange,
    trackToolbarZoom,
  ]);
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
        const rect = instance.getRootEl()?.getBoundingClientRect();
        const screenPosition = rect
          ? {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            }
          : {
              x: 160,
              y: 160,
            };
        openContextMenuAt(screenPosition, getDropPosition());
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
    instance,
    openContextMenuAt,
    onOpenAssets,
    onOpenHelp,
    setActiveCommand,
    setInteractionTool,
  ]);
  const emitCommentContext = reactExports.useCallback(
    (clientX, clientY, targetId) => {
      const root = instance.getRootEl();
      const rect = root?.getBoundingClientRect();
      const viewport = getViewport();
      const scale =
        typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
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
          width: Math.round((rect?.width ?? 0) * scale),
          height: Math.round((rect?.height ?? 0) * scale),
          deviceScaleFactor: scale,
        },
      };
      instance.eventBus.emit({
        type: "comment:context",
        context,
      });
      onCommentContext?.(context);
      setActiveCommand(null);
    },
    [
      getViewport,
      instance,
      onCommentContext,
      screenToFlowPosition,
      workspaceContentBudgetScope,
      setActiveCommand,
    ],
  );
  const resolveStickerPlacement = reactExports.useCallback(
    (clientPosition) =>
      resolveStickerPointerPlacement(clientPosition, screenToFlowPosition),
    [screenToFlowPosition],
  );
  const handlePlaceSticker = reactExports.useCallback(
    (clientX, clientY) => {
      const currentSelection = stickerSelectionRef.current;
      const currentStickerAssetId =
        currentSelection.kind === "asset" ? currentSelection.id : "";
      const currentStickerEmoji =
        currentSelection.kind === "emoji"
          ? currentSelection.value
          : DEFAULT_STICKER_EMOJI;
      const position = resolveStickerPlacement({
        x: clientX,
        y: clientY,
      });
      const graphNodes = instance.getGraph().nodes;
      const stickerTarget = findStickerTarget(graphNodes, position, mode);
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
                  x: position.x - stickerTarget.position.x,
                  y: position.y - stickerTarget.position.y,
                },
                targetAnchor: stickerTarget.anchor,
              }
            : {}),
        },
        position,
        size: STICKER_NODE_SIZE,
      });
      const targetNode = stickerTarget
        ? graphNodes.find((node) => node.id === stickerTarget.id)
        : void 0;
      const targetCloudTaskId = targetNode?.assetId
        ? assetMetadataStore.getState().get(targetNode.assetId)?.cloudTaskId
        : void 0;
      if (
        typeof targetCloudTaskId === "string" &&
        targetCloudTaskId.trim().length > 0
      ) {
        onStickerAdd?.({
          stickerId:
            currentSelection.kind === "asset"
              ? currentSelection.id
              : currentSelection.value,
          cloudTaskId: targetCloudTaskId,
        });
      }
      if (!instance.getGraph().nodes.some((node) => node.id === stickerId))
        return false;
      instance.selection.set([stickerId]);
      setFreshStickerIds((current) => {
        const next = new Set(current);
        next.add(stickerId);
        return next;
      });
      window.setTimeout(() => {
        setFreshStickerIds((current) => {
          if (!current.has(stickerId)) return current;
          const next = new Set(current);
          next.delete(stickerId);
          return next;
        });
      }, 540);
      return true;
    },
    [
      assetMetadataStore,
      commands,
      instance,
      mode,
      onStickerAdd,
      resolveStickerPlacement,
    ],
  );
  const { handleCanvasNodeClick, handleCanvasPaneClick } =
    useCanvasClickHandlers({
      commentsActive: activeCommand === CANVAS_COMMAND_IDS.comments,
      selectedCommentTargetId:
        selectedIds.length === 1 ? selectedIds[0] : void 0,
      stickerMode,
      emitCommentContext,
      handlePlaceSticker,
      onStickerPlaced: dismissStickerPanel,
      restoreSelectionChrome,
    });
  const syncStickerBindings = reactExports.useCallback(
    (affectedNodeId) => {
      const graph = instance.getGraph();
      const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
      const affectedIds = new Set([affectedNodeId]);
      for (const node of graph.nodes) {
        let parentId = node.parentId;
        const visited = new Set();
        while (parentId && !visited.has(parentId)) {
          if (parentId === affectedNodeId) {
            affectedIds.add(node.id);
            break;
          }
          visited.add(parentId);
          parentId = nodesById.get(parentId)?.parentId;
        }
      }
      for (const sticker of graph.nodes) {
        if (sticker.type !== CanvasNodeType.Sticker) continue;
        const data = sticker.data;
        if (!data.targetId || !affectedIds.has(data.targetId)) continue;
        const target = nodesById.get(data.targetId);
        if (!target) continue;
        const targetPosition = getAbsoluteNodePosition(
          target,
          nodesById,
          mode,
        );
        const targetSize = sizeOf(target, mode);
        const offset = data.targetAnchor
          ? {
              x: data.targetAnchor.x * targetSize.width,
              y: data.targetAnchor.y * targetSize.height,
            }
          : data.targetOffset;
        if (!offset) continue;
        const nextAbsolutePosition = {
          x: targetPosition.x + offset.x,
          y: targetPosition.y + offset.y,
        };
        const parentNode = sticker.parentId
          ? nodesById.get(sticker.parentId)
          : void 0;
        const parentPosition = parentNode
          ? getAbsoluteNodePosition(parentNode, nodesById, mode)
          : void 0;
        const nextPosition = {
          x: nextAbsolutePosition.x - (parentPosition?.x ?? 0),
          y: nextAbsolutePosition.y - (parentPosition?.y ?? 0),
        };
        const currentPosition = getNodePosition(sticker, mode);
        if (
          currentPosition.x === nextPosition.x &&
          currentPosition.y === nextPosition.y
        ) {
          continue;
        }
        instance.moveNode(sticker.id, nextPosition);
      }
    },
    [instance, mode],
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
      const snapshot = flowPositionSnapshotsRef.current.get(nodeId);
      if (!graphNode && !snapshot) return void 0;
      const position =
        snapshot?.position ??
        (graphNode ? getNodePosition(graphNode, mode) : null);
      if (!position) return void 0;
      const parentId = snapshot?.parentId ?? graphNode?.parentId;
      if (!parentId)
        return {
          x: position.x,
          y: position.y,
        };
      const parentPosition = resolveFollowAbsolutePosition(
        parentId,
        graphById,
        visited,
      );
      if (!parentPosition)
        return {
          x: position.x,
          y: position.y,
        };
      return {
        x: parentPosition.x + position.x,
        y: parentPosition.y + position.y,
      };
    },
    [mode],
  );
  const getStickerFollowPositions = reactExports.useCallback(
    (affectedNodeIds) => {
      const index = getStickerFollowIndex();
      if (!index) return stickerFollowPositionsRef.current;
      const affectedStickers = collectAffectedStickerNodes(
        index,
        affectedNodeIds,
      );
      if (affectedStickers.length === 0)
        return stickerFollowPositionsRef.current;
      const next = new Map(stickerFollowPositionsRef.current);
      for (const sticker of affectedStickers) {
        const data = sticker.data;
        if (!data.targetId) continue;
        const target = index.nodeById.get(data.targetId);
        const targetPosition = target
          ? resolveFollowAbsolutePosition(data.targetId, index.nodeById)
          : void 0;
        if (!target || !targetPosition) {
          next.delete(sticker.id);
          continue;
        }
        const targetSize = sizeOf(target, mode);
        const offset = data.targetAnchor
          ? {
              x: data.targetAnchor.x * targetSize.width,
              y: data.targetAnchor.y * targetSize.height,
            }
          : data.targetOffset;
        if (!offset) {
          next.delete(sticker.id);
          continue;
        }
        const absolutePosition = {
          x: targetPosition.x + offset.x,
          y: targetPosition.y + offset.y,
        };
        const stickerParentId =
          flowPositionSnapshotsRef.current.get(sticker.id)?.parentId ??
          sticker.parentId;
        const parentPosition = stickerParentId
          ? resolveFollowAbsolutePosition(stickerParentId, index.nodeById)
          : void 0;
        next.set(sticker.id, {
          x: absolutePosition.x - (parentPosition?.x ?? 0),
          y: absolutePosition.y - (parentPosition?.y ?? 0),
        });
      }
      return next;
    },
    [getStickerFollowIndex, mode, resolveFollowAbsolutePosition],
  );
  const publishStickerFollowPositions = reactExports.useCallback(
    (positions) => {
      const current = stickerFollowPositionsRef.current;
      if (
        current.size === positions.size &&
        Array.from(positions).every(([id, position]) => {
          const previous = current.get(id);
          return previous?.x === position.x && previous?.y === position.y;
        })
      ) {
        return;
      }
      const next = new Map(positions);
      stickerFollowPositionsRef.current = next;
      setStickerFollowPositions(next);
    },
    [],
  );
  const handleStickerFollowChanges = reactExports.useCallback(
    (positionChanges) => {
      if (positionChanges.length === 0) return;
      const startsDrag = positionChanges.some(
        (change) => change.dragging === true,
      );
      const isDragEnd = positionChanges.every(
        (change) => change.dragging === false,
      );
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
        const previous = flowPositionSnapshotsRef.current.get(change.id);
        const graphNode = graphNodesById?.get(change.id);
        flowPositionSnapshotsRef.current.set(change.id, {
          position: {
            x: change.position.x,
            y: change.position.y,
          },
          ...(previous?.parentId || graphNode?.parentId
            ? {
                parentId: previous?.parentId ?? graphNode?.parentId,
              }
            : {}),
        });
      }
      const positions = getStickerFollowPositions(
        positionChanges.map((change) => change.id),
      );
      publishStickerFollowPositions(positions);
      if (isDragEnd) stickerDragActiveRef.current = false;
    },
    [
      getStickerFollowIndex,
      getStickerFollowPositions,
      publishStickerFollowPositions,
    ],
  );
  const handleCanvasNodesChange = reactExports.useCallback(
    (changes) => {
      onNodesChange(changes);
      const positionChanges = changes.filter(
        (change) =>
          change.type === "position" &&
          !!change.position &&
          change.dragging === false,
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
        draggedNodes.map((node) => ({
          id: node.id,
          position: {
            x: node.position.x,
            y: node.position.y,
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
      const flush = () => {
        if (stickerDragActiveRef.current) {
          stickerBindingTimerRef.current = setTimeout(
            flush,
            STICKER_BINDING_DELAY_MS,
          );
          return;
        }
        stickerBindingTimerRef.current = null;
        const affectedNodeIds = Array.from(pendingStickerBindingIdsRef.current);
        pendingStickerBindingIdsRef.current.clear();
        for (const nodeId of affectedNodeIds) {
          syncStickerBindings(nodeId);
        }
      };
      stickerBindingTimerRef.current = setTimeout(
        flush,
        STICKER_BINDING_DELAY_MS,
      );
    },
    [syncStickerBindings],
  );
  const handleNodeDragStop = reactExports.useCallback(
    (moves) => {
      stickerDragActiveRef.current = false;
      for (const move of moves) {
        const previous = flowPositionSnapshotsRef.current.get(move.id);
        const graphNode = instance
          .getGraph()
          .nodes.find((node) => node.id === move.id);
        flowPositionSnapshotsRef.current.set(move.id, {
          position: {
            x: move.position.x,
            y: move.position.y,
          },
          ...((previous?.parentId ?? graphNode?.parentId)
            ? {
                parentId: previous?.parentId ?? graphNode?.parentId,
              }
            : {}),
        });
      }
      if (moves.length > 0) {
        publishStickerFollowPositions(
          getStickerFollowPositions(moves.map((move) => move.id)),
        );
      }
      onNodeDragStop(moves);
      const graph = instance.getGraph();
      const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
      let didRebind = false;
      for (const move of moves) {
        const sticker = nodesById.get(move.id);
        if (sticker?.type !== CanvasNodeType.Sticker) {
          scheduleStickerBindings(move.id);
          continue;
        }
        const data = sticker.data;
        const stickerPosition = getAbsoluteNodePosition(
          sticker,
          nodesById,
          mode,
        );
        const target = findStickerTarget(graph.nodes, stickerPosition, mode);
        const patch = target
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
          data.targetId === patch.targetId &&
          data.targetOffset?.x === patch.targetOffset?.x &&
          data.targetOffset?.y === patch.targetOffset?.y &&
          data.targetAnchor?.x === patch.targetAnchor?.x &&
          data.targetAnchor?.y === patch.targetAnchor?.y;
        if (unchanged) continue;
        instance.mergeNodeData(move.id, patch);
        didRebind = true;
      }
      if (didRebind)
        instance.eventBus.emit({
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
      instance,
      mode,
      onNodeDragStop,
      publishStickerFollowPositions,
      scheduleStickerBindings,
    ],
  );
  reactExports.useEffect(() => {
    const offMoved = instance.eventBus.on("node:moved", ({ nodeId }) => {
      scheduleStickerBindings(nodeId);
    });
    const offResized = instance.eventBus.on("node:resized", ({ nodeId }) => {
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
  }, [clearStickerFollowState, instance, scheduleStickerBindings]);
  const appearancePanelContent = reactExports.useMemo(() => {
    const cardClass = (selected) =>
      `relative overflow-hidden rounded-md border text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-[var(--canvas-controls-text)]" : "border-[var(--canvas-controls-border)] hover:border-[var(--canvas-controls-text-muted)]"}`;
    const selectedMark = (
      <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[var(--canvas-controls-bg)] text-[var(--canvas-controls-text)] shadow-[var(--canvas-shadow-menu)]">
        <Check size={11} strokeWidth={2} aria-hidden="true" />
      </span>
    );
    const renderToneCards = (tones) =>
      tones.map((tone) => {
        const selected = canvasTone === tone;
        return (
          <button
            key={tone}
            type="button"
            aria-pressed={selected}
            data-action-ui-id={`canvas.appearance-tone-${tone}`}
            className={cardClass(selected)}
            onClick={() => handleCanvasToneChange(tone)}
          >
            <span
              className="canvas-appearance-preview block h-9 w-full"
              data-canvas-tone={tone}
              data-background-pattern="none"
              aria-hidden="true"
            />
            {selected && selectedMark}
            <span className="flex h-6 items-center justify-center border-t border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-1 text-center text-[10px] text-[var(--canvas-controls-text)] [border-top-width:var(--divider-width)]">
              {translate(`canvas.toolbar.tone.${tone}`)}
            </span>
          </button>
        );
      });
    return (
      <div className="space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-medium text-[var(--canvas-controls-text-muted)]">
            {translate("canvas.toolbar.backgroundPattern")}
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {CANVAS_BACKGROUND_PATTERNS.map((pattern) => {
              const selected = backgroundPattern === pattern;
              return (
                <button
                  key={pattern}
                  type="button"
                  aria-pressed={selected}
                  data-action-ui-id={`canvas.appearance-pattern-${pattern}`}
                  className={cardClass(selected)}
                  onClick={() => handleBackgroundPatternChange(pattern)}
                >
                  <span
                    className="canvas-appearance-preview block h-9 w-full"
                    data-canvas-tone={canvasTone}
                    data-background-pattern={pattern}
                    aria-hidden="true"
                  />
                  {selected && selectedMark}
                  <span className="flex h-6 items-center justify-center border-t border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-1 text-center text-[10px] text-[var(--canvas-controls-text)] [border-top-width:var(--divider-width)]">
                    {translate(`canvas.toolbar.background.${pattern}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-medium text-[var(--canvas-controls-text-muted)]">
            {translate("canvas.toolbar.backgroundTone")}
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {renderToneCards(CANVAS_PRIMARY_TONES)}
          </div>
          <button
            type="button"
            data-action-ui-id="canvas.appearance-more-tones"
            aria-expanded={moreCanvasTonesOpen}
            onClick={() => setMoreCanvasTonesOpen((open) => !open)}
            className="mt-1.5 flex h-7 w-full items-center justify-center gap-1 rounded-md text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{translate("canvas.toolbar.moreColors")}</span>
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
    translate,
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
      onToggleStickerVisibility={() =>
        handleStickerVisibility(!allStickersHidden)
      }
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
      aria-label={translate("a11y.loading")}
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
  const content = (
    <WorkspaceContentBudgetScopeProvider
      workspaceId={workspaceContentBudgetScope}
    >
      <CanvasReferenceNavigationScope
        actions={canvasActions}
        scope={`${workspaceContentBudgetScope ?? ""}:${mode}`}
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
              registry={instance.registry}
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
                onDownloadAllFiles={
                  onSaveManyAs ? handleDownloadSelectedFiles : void 0
                }
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
            <CanvasLoadError
              failure={loadError}
              retrying={loadRetrying}
              onRetry={retryLoad}
            />
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
          {(position, motionProps) => (
            <CanvasPaneContextMenu
              position={position}
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
        <CanvasHighBlastDeleteDialog instance={instance} />
        <CanvasConfirmationDialog
          open={clearStickersConfirmationOpen}
          title={translate("canvas.toolbar.clearStickersTitle", "清空全部贴纸")}
          description={translate("canvas.toolbar.clearStickersConfirm")}
          cancelLabel={translate("common.cancel", "取消")}
          confirmLabel={translate("canvas.toolbar.clearStickersAction", "确认清空")}
          onCancel={() => setClearStickersConfirmationOpen(false)}
          onConfirm={handleConfirmClearStickers}
        />
      </CanvasReferenceNavigationScope>
    </WorkspaceContentBudgetScopeProvider>
  );
  return (
    <TidySortContext.Provider value={tidySort.context}>
      {content}
    </TidySortContext.Provider>
  );
}
