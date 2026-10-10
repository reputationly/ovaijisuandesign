// use-canvas-context-menus.js
import {
  isNodeGenerating,
  partitionDeletableIds,
} from "./partition-user-removal-elements.js";
import { writeCanvasSystemClipboard } from "./reorder-parents-before-children.js";
import { CanvasNodeType, reactExports } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { isPluginNode } from "./separator.jsx";
import { isGenerationErrorStatus } from "./compute-group-bounds-from-children.js";
import { useGeneratingStateApi } from "../media-editing/package.jsx";
import { parseNodeId } from "./find-free-position-from-anchor.js";

function isNodeGenerationActive(node2, hasLiveGenerationState) {
  return hasLiveGenerationState || isNodeGenerating(node2);
}

function beginSelectionChromeSuppression(
  current2,
  selectionChangedByContextMenu,
) {
  return {
    suppressed: true,
    retainAfterDismiss:
      current2.retainAfterDismiss || selectionChangedByContextMenu,
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
  return (
    node2?.type === CanvasNodeType.Group ||
    !!filePath ||
    isGenerating ||
    isPluginNode(node2)
  );
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
  const selectedNodes = instance2
    .getGraph()
    .nodes.filter((node2) => selectedIds.has(node2.id));
  await writeCanvasSystemClipboard(
    onSystemCopy ? () => onSystemCopy(selectedNodes) : void 0,
  );
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
  const [selectionChromeSuppression, setSelectionChromeSuppression] =
    reactExports.useState(restoreSelectionChromeSuppression);
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
        const hinted = instance2
          .getGraph()
          .nodes.find((n2) => n2.id === hintNodeId);
        if (hinted?.type === CanvasNodeType.Group && hinted.meta?.collapsed)
          return;
      }
      const currentSelected = instance2.selection.getSelected();
      const isInMultiSelection =
        !!hintNodeId &&
        currentSelected.length > 1 &&
        currentSelected.includes(hintNodeId);
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
      const nodesById = new Map(
        instance2.getGraph().nodes.map((n2) => [n2.id, n2]),
      );
      const nodes = targetIds.map((id2) => {
        const targetNode = nodesById.get(id2);
        const nodeType = targetNode?.type ?? "unknown";
        const isMultiImage =
          nodeType === CanvasNodeType.Image &&
          typeof targetNode?.groupId === "string" &&
          [...nodesById.values()].some(
            (candidate) =>
              candidate.id !== id2 && candidate.groupId === targetNode.groupId,
          );
        const generatingInfo = generatingByNode.get(id2);
        const isGenerating = isNodeGenerationActive(
          targetNode,
          generatingInfo !== void 0,
        );
        const persistedStatus = targetNode?.data?.status;
        const generationErrorStatus = isGenerationErrorStatus(
          generatingInfo?.errorStatus,
        )
          ? generatingInfo.errorStatus
          : isGenerationErrorStatus(persistedStatus)
            ? persistedStatus
            : void 0;
        if (
          nodeType === CanvasNodeType.Group ||
          nodeType === CanvasNodeType.Placeholder
        ) {
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
        beginSelectionChromeSuppression(
          current2,
          selectionChangedByContextMenu,
        ),
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
          const { deletableIds, blockedCount, blockedReason } =
            partitionDeletableIds(targetIds, (id2) => nodesById.get(id2));
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
              resolveAssetPath: (id2) =>
                assetMetadataStore.getState().get(id2)?.path,
            },
            onSystemCopy,
          );
        },
        duplicateToCanvas: () => {
          instance2.copySelected({
            workspace: getCurrentWorkspace?.(),
            resolveAssetPath: (id2) =>
              assetMetadataStore.getState().get(id2)?.path,
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
    dispatchPanePaste(
      instance2,
      paneContextMenuFlowPos.current,
      onRequestSystemPaste,
    );
  }, [instance2, onRequestSystemPaste]);
  const getAddNodePosition = reactExports.useCallback(
    () => contextMenuFlowPos.current,
    [],
  );
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
