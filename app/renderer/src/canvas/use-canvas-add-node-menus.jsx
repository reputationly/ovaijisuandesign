// use-canvas-add-node-menus.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useConnectToAddNode } from "./use-connect-to-add-node.js";
import { QuickZoomPresence } from "./canvas-high-blast-delete-dialog.jsx";
import { CanvasContextMenu } from "./canvas-context-menu.jsx";

export function useCanvasAddNodeMenus(options) {
  const {
    contextMenu,
    closeContextMenu,
    openContextMenuAt,
    getDropPosition,
    openDefaultMenu,
    onDeactivate,
  } = options;
  const connection = useConnectToAddNode(options);
  const { clearPendingConnection } = connection;
  const addNodeButtonRef = reactExports.useRef(null);
  const handleToolDockAddNode = reactExports.useCallback(() => {
    if (contextMenu?.dockAnchor) {
      clearPendingConnection();
      closeContextMenu();
      return;
    }
    const button = addNodeButtonRef.current;
    const toolbar = button?.closest('[data-action-ui-id="canvas.tool-dock"]');
    if (!button || !toolbar) {
      openDefaultMenu();
      return;
    }
    openContextMenuAt(
      {
        x: button.getBoundingClientRect().left,
        y: toolbar.getBoundingClientRect().top - 8,
        dockAnchor: {
          button,
          toolbar,
        },
      },
      getDropPosition(),
    );
    onDeactivate();
  }, [
    contextMenu,
    clearPendingConnection,
    closeContextMenu,
    openContextMenuAt,
    getDropPosition,
    openDefaultMenu,
    onDeactivate,
  ]);
  const content2 = (
    <QuickZoomPresence
      value={
        contextMenu
          ? {
              position: contextMenu,
              flowPosition: options.getAddNodePosition(),
              connectionSource: connection.connectionSource,
              sourceNodeType: connection.sourceNodeType,
              sourceNodePluginId: connection.sourceNodePluginId,
            }
          : null
      }
    >
      {(menu, motionProps) => (
        <CanvasContextMenu
          {...menu}
          motionProps={motionProps}
          onClose={() => {
            clearPendingConnection();
            closeContextMenu();
          }}
          onAddNode={connection.handleAddNode}
        />
      )}
    </QuickZoomPresence>
  );
  return {
    ...connection,
    content: content2,
    toolbarProps: {
      addNodeButtonRef,
      addNodeMenuOpen: Boolean(contextMenu?.dockAnchor),
      onOpenAddNodeMenu: handleToolDockAddNode,
    },
  };
}
