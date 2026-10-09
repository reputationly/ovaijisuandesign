// use-canvas-context-menus.js
import {
  useGeneratingStateApi,
  useAssetMetadataApi,
  reactExports,
  parseNodeId,
  isGenerationErrorStatus,
  CanvasNodeType,
  CANVAS_COMMAND_IDS,
  writeCanvasSystemClipboard,
  partitionDeletableIds,
  isPluginNode,
} from "../vendor.js";
import { CANVAS_DEFAULT_STICKER_ASSET_ID } from "../m04/ready-sub-video-card.jsx";
import { isNodeGenerationActive } from "./selection-toolbar-inner.jsx";
function isCanvasChromeTarget(target) {
  return target instanceof Element && target.closest('[data-canvas-chrome="true"]') !== null;
}
export function useCanvasClickHandlers({
  commentsActive,
  selectedCommentTargetId,
  stickerMode,
  emitCommentContext,
  handlePlaceSticker,
  onStickerPlaced,
  restoreSelectionChrome,
}) {
  const handleCanvasPaneClick = reactExports.useCallback(
    (event) => {
      if (isCanvasChromeTarget(event.target)) return;
      restoreSelectionChrome();
      if (commentsActive) {
        emitCommentContext(event.clientX, event.clientY, selectedCommentTargetId);
        return;
      }
      if (stickerMode && event.button === 0 && handlePlaceSticker(event.clientX, event.clientY)) {
        onStickerPlaced();
      }
    },
    [
      commentsActive,
      emitCommentContext,
      handlePlaceSticker,
      onStickerPlaced,
      restoreSelectionChrome,
      selectedCommentTargetId,
      stickerMode,
    ],
  );
  const handleCanvasNodeClick = reactExports.useCallback(
    (event, node2) => {
      if (isCanvasChromeTarget(event.target)) return;
      restoreSelectionChrome();
      if (stickerMode) {
        if (event.button === 0 && handlePlaceSticker(event.clientX, event.clientY)) {
          onStickerPlaced();
        }
        return;
      }
      if (commentsActive) emitCommentContext(event.clientX, event.clientY, node2.id);
    },
    [
      commentsActive,
      emitCommentContext,
      handlePlaceSticker,
      onStickerPlaced,
      restoreSelectionChrome,
      stickerMode,
    ],
  );
  return {
    handleCanvasNodeClick,
    handleCanvasPaneClick,
  };
}
function beginSelectionChromeSuppression(current2, selectionChangedByContextMenu) {
  return {
    suppressed: true,
    retainAfterDismiss: current2.retainAfterDismiss || selectionChangedByContextMenu,
  };
}
function dismissSelectionChromeSuppression(current2) {
  return current2.retainAfterDismiss
    ? current2
    : {
        suppressed: false,
        retainAfterDismiss: false,
      };
}
function restoreSelectionChromeSuppression() {
  return {
    suppressed: false,
    retainAfterDismiss: false,
  };
}
function isGraphLevelContextMenuTarget(node2, filePath, isGenerating) {
  return node2?.type === CanvasNodeType.Group || !!filePath || isGenerating || isPluginNode(node2);
}
async function dispatchContextMenuCopy(instance2, sourceContext, onSystemCopy) {
  instance2.copySelected(sourceContext);
  const rootEl = instance2.getRootEl();
  rootEl?.focus({
    preventScroll: true,
  });
  if (rootEl && typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() =>
      rootEl.focus({
        preventScroll: true,
      }),
    );
  }
  const selectedIds = new Set(instance2.selection.getSelected());
  const selectedNodes = instance2.getGraph().nodes.filter((node2) => selectedIds.has(node2.id));
  await writeCanvasSystemClipboard(onSystemCopy ? () => onSystemCopy(selectedNodes) : void 0);
}
function dispatchPanePaste(instance2, position2, onRequestSystemPaste) {
  if (onRequestSystemPaste) {
    instance2.getRootEl()?.focus({
      preventScroll: true,
    });
    onRequestSystemPaste(position2);
    return;
  }
  void instance2.pasteAtPosition(position2);
}
export function useCanvasContextMenus({
  instance: instance2,
  onNodeContextMenu,
  onUpload,
  onRequestSystemPaste,
  onSystemCopy,
  getCurrentWorkspace,
  screenToFlowPosition,
}) {
  const assetMetadataStore = useAssetMetadataApi();
  const generatingStateStore = useGeneratingStateApi();
  const [contextMenu, setContextMenu] = reactExports.useState(null);
  const [paneContextMenu, setPaneContextMenu] = reactExports.useState(null);
  const contextMenuFlowPos = reactExports.useRef({
    x: 0,
    y: 0,
  });
  const paneContextMenuFlowPos = reactExports.useRef({
    x: 0,
    y: 0,
  });
  const [selectionChromeSuppression, setSelectionChromeSuppression] = reactExports.useState(
    restoreSelectionChromeSuppression,
  );
  const dismissNodeContextMenu = reactExports.useCallback(() => {
    setSelectionChromeSuppression(dismissSelectionChromeSuppression);
  }, []);
  const restoreSelectionChrome = reactExports.useCallback(() => {
    setSelectionChromeSuppression(restoreSelectionChromeSuppression);
  }, []);
  const closeContextMenu = reactExports.useCallback(() => {
    setContextMenu(null);
  }, []);
  const closePaneContextMenu = reactExports.useCallback(() => {
    setPaneContextMenu(null);
  }, []);
  const closeAllMenus = reactExports.useCallback(() => {
    setContextMenu(null);
    setPaneContextMenu(null);
  }, []);
  const dispatchNodeMenu = reactExports.useCallback(
    (event, hintNodeId) => {
      if (!onNodeContextMenu) return;
      if (hintNodeId) {
        const hinted = instance2.getGraph().nodes.find((n2) => n2.id === hintNodeId);
        if (hinted?.type === CanvasNodeType.Group && hinted.meta?.collapsed) return;
      }
      const currentSelected = instance2.selection.getSelected();
      const isInMultiSelection =
        !!hintNodeId && currentSelected.length > 1 && currentSelected.includes(hintNodeId);
      const selectionChangedByContextMenu =
        !!hintNodeId &&
        !isInMultiSelection &&
        (currentSelected.length !== 1 || currentSelected[0] !== hintNodeId);
      let targetIds;
      if (hintNodeId && !isInMultiSelection) {
        targetIds = [hintNodeId];
      } else if (hintNodeId) {
        targetIds = currentSelected;
      } else {
        targetIds = currentSelected;
      }
      if (targetIds.length === 0) return;
      const assetStore = assetMetadataStore.getState();
      const generatingByNode = generatingStateStore.getState().byNode;
      const nodesById = new Map(instance2.getGraph().nodes.map((n2) => [n2.id, n2]));
      const nodes = targetIds.map((id2) => {
        const targetNode = nodesById.get(id2);
        const nodeType = targetNode?.type ?? "unknown";
        const isMultiImage =
          nodeType === CanvasNodeType.Image &&
          typeof targetNode?.groupId === "string" &&
          [...nodesById.values()].some(
            (candidate) => candidate.id !== id2 && candidate.groupId === targetNode.groupId,
          );
        const generatingInfo = generatingByNode.get(id2);
        const isGenerating = isNodeGenerationActive(targetNode, generatingInfo !== void 0);
        const persistedStatus = targetNode?.data?.status;
        const generationErrorStatus = isGenerationErrorStatus(generatingInfo?.errorStatus)
          ? generatingInfo.errorStatus
          : isGenerationErrorStatus(persistedStatus)
            ? persistedStatus
            : void 0;
        if (nodeType === CanvasNodeType.Group || nodeType === CanvasNodeType.Placeholder) {
          return {
            nodeId: id2,
            nodeType,
            isGenerating,
            generationErrorStatus,
          };
        }
        if (nodeType === CanvasNodeType.Table) {
          const tableData = targetNode?.data;
          return {
            nodeId: id2,
            nodeType,
            filePath: tableData?.tablePath,
            fileType: "table",
            // The .htable filename is internal — surface the user-facing
            // title so host actions (add-to-chat) can display it instead.
            title: tableData?.title,
            isGenerating,
            generationErrorStatus,
          };
        }
        const { assetId } = parseNodeId(id2);
        const meta2 = assetStore.get(assetId);
        return {
          nodeId: id2,
          nodeType,
          filePath: meta2?.path,
          fileType: meta2?.type,
          width: targetNode?.size?.width,
          height: targetNode?.size?.height,
          isMultiImage,
          isGenerating,
          generationErrorStatus,
        };
      });
      const hasGraphLevelTarget = targetIds.some((id2, index2) =>
        isGraphLevelContextMenuTarget(
          nodesById.get(id2),
          nodes[index2]?.filePath,
          !!nodes[index2]?.isGenerating,
        ),
      );
      if (!hasGraphLevelTarget) return;
      setSelectionChromeSuppression((current2) =>
        beginSelectionChromeSuppression(current2, selectionChangedByContextMenu),
      );
      if (hintNodeId && !isInMultiSelection) {
        instance2.selection.set([hintNodeId]);
      }
      instance2.copySelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: (id2) => assetMetadataStore.getState().get(id2)?.path,
      });
      event.preventDefault();
      const actions = {
        deleteSelected: () => {
          const { deletableIds, blockedCount, blockedReason } = partitionDeletableIds(
            targetIds,
            (id2) => nodesById.get(id2),
          );
          if (blockedCount > 0) {
            instance2.eventBus.emit({
              type: "delete:blocked",
              count: blockedCount,
              reason: blockedReason ?? "generating",
            });
          }
          if (deletableIds.length === 0) return;
          instance2.removeNodes(deletableIds);
          instance2.eventBus.emit({
            type: "persist:flush",
          });
        },
        copyToCanvasClipboard: () => {
          void dispatchContextMenuCopy(
            instance2,
            {
              workspace: getCurrentWorkspace?.(),
              resolveAssetPath: (id2) => assetMetadataStore.getState().get(id2)?.path,
            },
            onSystemCopy,
          );
        },
        duplicateToCanvas: () => {
          instance2.copySelected({
            workspace: getCurrentWorkspace?.(),
            resolveAssetPath: (id2) => assetMetadataStore.getState().get(id2)?.path,
          });
          void instance2.pasteFromClipboard();
        },
        groupSelected: () => {
          instance2.groupNodes(targetIds);
        },
        ungroupGroup: (groupId2) => {
          instance2.ungroup(groupId2);
        },
        dismissContextMenu: dismissNodeContextMenu,
      };
      onNodeContextMenu(event, nodes, actions);
    },
    [
      assetMetadataStore,
      generatingStateStore,
      instance2,
      onNodeContextMenu,
      onSystemCopy,
      getCurrentWorkspace,
      dismissNodeContextMenu,
    ],
  );
  const handleNodeContextMenu = reactExports.useCallback(
    (event, node2) => {
      dispatchNodeMenu(event, node2.id);
    },
    [dispatchNodeMenu],
  );
  const handleSelectionContextMenu = reactExports.useCallback(
    (event) => {
      dispatchNodeMenu(event);
    },
    [dispatchNodeMenu],
  );
  const handlePaneDoubleClick = reactExports.useCallback(
    (event) => {
      if (instance2.selection.count() > 0) return;
      contextMenuFlowPos.current = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setPaneContextMenu(null);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [instance2, screenToFlowPosition],
  );
  const handlePaneContextMenu = reactExports.useCallback(
    (event) => {
      paneContextMenuFlowPos.current = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setPaneContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu(null);
    },
    [screenToFlowPosition],
  );
  const handlePaneUpload = reactExports.useCallback(() => {
    onUpload?.(paneContextMenuFlowPos.current);
  }, [onUpload]);
  const handlePaneAddNode = reactExports.useCallback(() => {
    contextMenuFlowPos.current = paneContextMenuFlowPos.current;
    setContextMenu(
      paneContextMenu
        ? {
            x: paneContextMenu.x,
            y: paneContextMenu.y,
          }
        : {
            x: 0,
            y: 0,
          },
    );
  }, [paneContextMenu]);
  const handlePanePaste = reactExports.useCallback(() => {
    dispatchPanePaste(instance2, paneContextMenuFlowPos.current, onRequestSystemPaste);
  }, [instance2, onRequestSystemPaste]);
  const getAddNodePosition = reactExports.useCallback(() => contextMenuFlowPos.current, []);
  const openContextMenuAt = reactExports.useCallback((screenPos, flowPos) => {
    contextMenuFlowPos.current = flowPos;
    setPaneContextMenu(null);
    setContextMenu(screenPos);
  }, []);
  return {
    contextMenu,
    paneContextMenu,
    selectionChromeSuppressed: selectionChromeSuppression.suppressed,
    closeContextMenu,
    closePaneContextMenu,
    closeAllMenus,
    getAddNodePosition,
    openContextMenuAt,
    handleNodeContextMenu,
    handleSelectionContextMenu,
    restoreSelectionChrome,
    // Direct node-menu opener keyed by node id — used by hidden nodes (e.g.
    // multi-image sub-image overlay cards) that never receive ReactFlow's
    // native onNodeContextMenu. Same single source of truth the native
    // handler delegates to.
    dispatchNodeMenu,
    handlePaneAddNode,
    handlePaneContextMenu,
    handlePaneDoubleClick,
    handlePanePaste,
    handlePaneUpload,
  };
}
const DEFAULT_STICKER_SELECTION = {
  kind: "asset",
  id: CANVAS_DEFAULT_STICKER_ASSET_ID,
};
export function useCanvasInteractionTool() {
  const [state2, setState] = reactExports.useState({
    tool: "select",
    activeCommand: null,
    stickerSelection: DEFAULT_STICKER_SELECTION,
  });
  const setActiveCommand = reactExports.useCallback((activeCommand) => {
    setState((current2) => ({
      ...current2,
      activeCommand,
    }));
  }, []);
  const setStickerSelection = reactExports.useCallback((stickerSelection) => {
    setState((current2) => ({
      ...current2,
      stickerSelection,
    }));
  }, []);
  const setInteractionTool = reactExports.useCallback((tool2, source = "trigger") => {
    setState((current2) => {
      if (tool2 !== "sticker")
        return {
          ...current2,
          tool: tool2,
          activeCommand: null,
        };
      if (source === "keyboard") {
        if (current2.tool === "sticker") return current2;
        return {
          tool: tool2,
          activeCommand: null,
          stickerSelection: DEFAULT_STICKER_SELECTION,
        };
      }
      const isOpen = current2.activeCommand === CANVAS_COMMAND_IDS.sticker;
      return {
        ...current2,
        tool: isOpen ? "select" : "sticker",
        activeCommand: isOpen ? null : CANVAS_COMMAND_IDS.sticker,
      };
    });
  }, []);
  const dismissStickerPanel = reactExports.useCallback(() => {
    setState((current2) =>
      current2.activeCommand === CANVAS_COMMAND_IDS.sticker
        ? {
            ...current2,
            activeCommand: null,
          }
        : current2,
    );
  }, []);
  const closeCommandPanel = reactExports.useCallback(() => {
    setState((current2) => ({
      ...current2,
      tool: current2.activeCommand === CANVAS_COMMAND_IDS.sticker ? "select" : current2.tool,
      activeCommand: null,
    }));
  }, []);
  return {
    activeCommand: state2.activeCommand,
    stickerMode: state2.tool === "sticker",
    handTool: state2.tool === "hand",
    stickerSelection: state2.stickerSelection,
    setStickerSelection,
    setActiveCommand,
    setInteractionTool,
    closeCommandPanel,
    dismissStickerPanel,
  };
}
export const CENTER_ON_NODES_DURATION_MS = 350;
export const FIT_PADDING_RATIO = 0.1;
export const FRAME_PADDING_RATIO = 0.15;
export const CENTER_ON_NODES_MAX_FRAME_ZOOM = 2;
export function easeOutQuart(t2) {
  return 1 - (1 - t2) ** 4;
}
export function interpolateFocusView(a2, b3) {
  const widthRatio = b3[2] / a2[2];
  return (t2) => {
    const scale2 = widthRatio ** t2;
    const remaining = (1 - t2) * scale2;
    return [
      b3[0] - (b3[0] - a2[0]) * remaining,
      b3[1] - (b3[1] - a2[1]) * remaining,
      a2[2] * scale2,
    ];
  };
}
