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

function isNodeGenerationActive(node, hasLiveGenerationState) {
  return hasLiveGenerationState || isNodeGenerating(node);
}

function beginSelectionChromeSuppression(
  current,
  selectionChangedByContextMenu,
) {
  return {
    suppressed: true,
    retainAfterDismiss:
      current.retainAfterDismiss || selectionChangedByContextMenu,
  };
}

function dismissSelectionChromeSuppression(current) {
  return current.retainAfterDismiss
    ? current
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

function isGraphLevelContextMenuTarget(node, filePath, isGenerating) {
  return (
    node?.type === CanvasNodeType.Group ||
    !!filePath ||
    isGenerating ||
    isPluginNode(node)
  );
}

async function dispatchContextMenuCopy(instance, sourceContext, onSystemCopy) {
  instance.copySelected(sourceContext);
  const rootEl = instance.getRootEl();
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
  const selectedIds = new Set(instance.selection.getSelected());
  const selectedNodes = instance
    .getGraph()
    .nodes.filter((node) => selectedIds.has(node.id));
  await writeCanvasSystemClipboard(
    onSystemCopy ? () => onSystemCopy(selectedNodes) : void 0,
  );
}

function dispatchPanePaste(instance, position, onRequestSystemPaste) {
  if (onRequestSystemPaste) {
    instance.getRootEl()?.focus({
      preventScroll: true,
    });
    onRequestSystemPaste(position);
    return;
  }
  void instance.pasteAtPosition(position);
}

export function useCanvasContextMenus({
  instance,
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
        const hinted = instance
          .getGraph()
          .nodes.find((node) => node.id === hintNodeId);
        if (hinted?.type === CanvasNodeType.Group && hinted.meta?.collapsed)
          return;
      }
      const currentSelected = instance.selection.getSelected();
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
        instance.getGraph().nodes.map((node) => [node.id, node]),
      );
      const nodes = targetIds.map((id) => {
        const targetNode = nodesById.get(id);
        const nodeType = targetNode?.type ?? "unknown";
        const isMultiImage =
          nodeType === CanvasNodeType.Image &&
          typeof targetNode?.groupId === "string" &&
          [...nodesById.values()].some(
            (candidate) =>
              candidate.id !== id && candidate.groupId === targetNode.groupId,
          );
        const generatingInfo = generatingByNode.get(id);
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
            nodeId: id,
            nodeType,
            isGenerating,
            generationErrorStatus,
          };
        }
        if (nodeType === CanvasNodeType.Table) {
          const tableData = targetNode?.data;
          return {
            nodeId: id,
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
        const { assetId } = parseNodeId(id);
        const meta = assetStore.get(assetId);
        return {
          nodeId: id,
          nodeType,
          filePath: meta?.path,
          fileType: meta?.type,
          width: targetNode?.size?.width,
          height: targetNode?.size?.height,
          isMultiImage,
          isGenerating,
          generationErrorStatus,
        };
      });
      const hasGraphLevelTarget = targetIds.some((id, index) =>
        isGraphLevelContextMenuTarget(
          nodesById.get(id),
          nodes[index]?.filePath,
          !!nodes[index]?.isGenerating,
        ),
      );
      if (!hasGraphLevelTarget) return;
      setSelectionChromeSuppression((current) =>
        beginSelectionChromeSuppression(
          current,
          selectionChangedByContextMenu,
        ),
      );
      if (hintNodeId && !isInMultiSelection) {
        instance.selection.set([hintNodeId]);
      }
      instance.copySelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: (id) => assetMetadataStore.getState().get(id)?.path,
      });
      event.preventDefault();
      const actions = {
        deleteSelected: () => {
          const { deletableIds, blockedCount, blockedReason } =
            partitionDeletableIds(targetIds, (id) => nodesById.get(id));
          if (blockedCount > 0) {
            instance.eventBus.emit({
              type: "delete:blocked",
              count: blockedCount,
              reason: blockedReason ?? "generating",
            });
          }
          if (deletableIds.length === 0) return;
          instance.removeNodes(deletableIds);
          instance.eventBus.emit({
            type: "persist:flush",
          });
        },
        copyToCanvasClipboard: () => {
          void dispatchContextMenuCopy(
            instance,
            {
              workspace: getCurrentWorkspace?.(),
              resolveAssetPath: (id) =>
                assetMetadataStore.getState().get(id)?.path,
            },
            onSystemCopy,
          );
        },
        duplicateToCanvas: () => {
          instance.copySelected({
            workspace: getCurrentWorkspace?.(),
            resolveAssetPath: (id) =>
              assetMetadataStore.getState().get(id)?.path,
          });
          void instance.pasteFromClipboard();
        },
        groupSelected: () => {
          instance.groupNodes(targetIds);
        },
        ungroupGroup: (groupId) => {
          instance.ungroup(groupId);
        },
        dismissContextMenu: dismissNodeContextMenu,
      };
      onNodeContextMenu(event, nodes, actions);
    },
    [
      assetMetadataStore,
      generatingStateStore,
      instance,
      onNodeContextMenu,
      onSystemCopy,
      getCurrentWorkspace,
      dismissNodeContextMenu,
    ],
  );
  const handleNodeContextMenu = reactExports.useCallback(
    (event, node) => {
      dispatchNodeMenu(event, node.id);
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
      if (instance.selection.count() > 0) return;
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
    [instance, screenToFlowPosition],
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
      instance,
      paneContextMenuFlowPos.current,
      onRequestSystemPaste,
    );
  }, [instance, onRequestSystemPaste]);
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
