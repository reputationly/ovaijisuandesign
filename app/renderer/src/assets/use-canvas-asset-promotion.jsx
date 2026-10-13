// use-canvas-asset-promotion.jsx
import {
  ActionListItem,
  ActionListPanel,
  FolderInput,
  jsxRuntimeExports,
  Library,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import {
  NODE_CONTEXT_MENU_VIEWPORT_MARGIN,
  resolveNodeContextMenuPosition,
} from "../text-editor/canvas-host-toolbar-button.jsx";
import { QuickZoomPresence } from "../canvas/canvas-high-blast-delete-dialog.jsx";
import { Popover } from "./credit-query-keys.jsx";
import { PromoteToAssetForm } from "./promote-to-asset-form.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { useWorkspaceProject } from "../workspace/normalize-project-entries.js";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";

const ESTIMATED_MENU_SIZE = {
  width: 192,
  height: 84,
};

function AssetSaveMenuContent({
  state,
  onSaveToProjectAssets,
  onAddToLibrary,
  onClose,
  motionProps,
}) {
  const { t: translate } = useTranslation();
  const ref = motionProps.ref;
  const closing = motionProps["data-ending-style"] !== void 0;
  const [menuPosition, setMenuPosition] = reactExports.useState(() =>
    resolveNodeContextMenuPosition({
      anchor: state,
      menuSize: ESTIMATED_MENU_SIZE,
      viewportSize:
        typeof window === "undefined"
          ? {
              width: Number.MAX_SAFE_INTEGER,
              height: Number.MAX_SAFE_INTEGER,
            }
          : {
              width: window.innerWidth,
              height: window.innerHeight,
            },
    }),
  );
  const updateMenuPosition = reactExports.useCallback(() => {
    if (typeof window === "undefined") return;
    const menu = ref.current;
    const next = resolveNodeContextMenuPosition({
      anchor: {
        x: state.x,
        y: state.y,
      },
      menuSize: menu
        ? {
            width: menu.offsetWidth,
            height: menu.offsetHeight,
          }
        : ESTIMATED_MENU_SIZE,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setMenuPosition((current) =>
      current.x === next.x && current.y === next.y ? current : next,
    );
  }, [state.x, state.y, ref]);
  reactExports.useLayoutEffect(updateMenuPosition, [updateMenuPosition]);
  reactExports.useEffect(() => {
    window.addEventListener("resize", updateMenuPosition);
    return () => window.removeEventListener("resize", updateMenuPosition);
  }, [updateMenuPosition]);
  reactExports.useEffect(() => {
    if (closing) return;
    const handleClick = (mouseEvent) => {
      if (ref.current?.contains(mouseEvent.target)) return;
      onClose();
    };
    const handleKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, closing, ref]);
  const handleSaveToProject = () => {
    onClose();
    onSaveToProjectAssets(state.nodeIds);
  };
  const handleAddToLibrary = () => {
    onClose();
    onAddToLibrary(state.nodeIds, {
      x: state.x,
      y: state.y,
    });
  };
  const menu = (
    <ActionListPanel
      {...motionProps}
      data-testid="canvas-asset-save-menu"
      className={`fixed z-50 min-w-48 dp-motion-quick-zoom`}
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        maxHeight: `calc(100vh - ${NODE_CONTEXT_MENU_VIEWPORT_MARGIN * 2}px)`,
        overflowY: "auto",
      }}
    >
      <ActionListItem
        data-action-ui-id="canvas-asset-save-menu.save-to-project-assets"
        onClick={handleSaveToProject}
      >
        <StrokeIcon icon={FolderInput} size={16} />
        {translate("canvas.saveToProjectAssets")}
      </ActionListItem>
      <ActionListItem
        data-action-ui-id="canvas-asset-save-menu.add-to-library"
        onClick={handleAddToLibrary}
      >
        <StrokeIcon icon={Library} size={16} />
        {translate("canvas.addToLibrary")}
      </ActionListItem>
    </ActionListPanel>
  );
  return typeof document === "undefined"
    ? menu
    : reactDomExports.createPortal(menu, document.body);
}

function AssetSaveMenu({
  state,
  onSaveToProjectAssets,
  onAddToLibrary,
  onClose,
}) {
  return (
    <QuickZoomPresence value={state}>
      {(retainedState, motionProps) => (
        <AssetSaveMenuContent
          state={retainedState}
          motionProps={motionProps}
          onSaveToProjectAssets={onSaveToProjectAssets}
          onAddToLibrary={onAddToLibrary}
          onClose={onClose}
        />
      )}
    </QuickZoomPresence>
  );
}

function PromoteToAssetPopover({
  state,
  workspaceRoot,
  onClose,
  onGroupNodes,
}) {
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const open = state !== null && state.files.length > 0;
  useSuspendCanvasInteractions(open);
  const anchor = state
    ? {
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          x: state.x,
          y: state.y,
          top: state.y,
          left: state.x,
          right: state.x,
          bottom: state.y,
        }),
      }
    : void 0;
  const handleSuccess = reactExports.useCallback(
    (result) => {
      if (
        result?.entityName &&
        state &&
        state.nodeIds.length >= 2 &&
        onGroupNodes
      ) {
        onGroupNodes(state.nodeIds, result.entityName);
      }
      onClose();
    },
    [state, onGroupNodes, onClose],
  );
  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) onClose();
      }}
    >
      <PopoverContent
        anchor={anchor}
        side="right"
        align="start"
        sideOffset={8}
        className="w-96 max-h-[80vh] overflow-y-auto rounded-lg"
        data-action-ui-id="canvas.promote-to-asset-popover"
      >
        {state && (
          <PromoteToAssetForm
            files={state.files}
            workspaceRoot={workspaceRoot}
            onCancel={onClose}
            onSuccess={handleSuccess}
            onSubmittingChange={setIsSubmitting}
            variant="popover"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export function useCanvasAssetPromotion({
  canvasViewRef,
  workspaceRoot,
  workspaceAssets,
  closeNodeContextMenu,
  openSaveToProjectAssets,
}) {
  const gatewayFetch = useGatewayFetch();
  const [promotePopover, setPromotePopover] = reactExports.useState(null);
  const workspaceProject = useWorkspaceProject(workspaceRoot ?? void 0);
  const isInProject = !!workspaceProject;
  const isTeamProject = workspaceProject?.kind === "team";
  const [assetSaveMenu, setAssetSaveMenu] = reactExports.useState(null);
  const closeAssetSaveMenu = reactExports.useCallback(
    () => setAssetSaveMenu(null),
    [],
  );
  const collectFiles = reactExports.useCallback(
    (nodeIds) => {
      const refs = canvasViewRef.current?.collectFileNodeRefs(nodeIds) ?? [];
      const seen = new Set();
      const files = [];
      for (const ref of refs) {
        if (seen.has(ref.filePath)) continue;
        seen.add(ref.filePath);
        const absolutePath = workspaceRoot
          ? joinFilePath(workspaceRoot, ref.filePath)
          : ref.filePath;
        const displayName = ref.filePath.split("/").pop() ?? ref.filePath;
        const vaultPrompt = workspaceAssets.find(
          (workspaceAsset) => workspaceAsset.path === ref.filePath,
        )?.prompt;
        files.push({
          workspaceRelPath: ref.filePath,
          absolutePath,
          displayName,
          ...(vaultPrompt && vaultPrompt.trim().length > 0
            ? {
                vaultPrompt,
              }
            : {}),
        });
      }
      return files;
    },
    [canvasViewRef, workspaceRoot, workspaceAssets],
  );
  const handlePromoteToAsset = reactExports.useCallback(
    (nodeIds, anchor) => {
      const files = collectFiles(nodeIds);
      if (files.length === 0) return;
      closeNodeContextMenu();
      queueMicrotask(() =>
        setPromotePopover({
          x: anchor.x,
          y: anchor.y,
          files,
          nodeIds,
        }),
      );
    },
    [collectFiles, closeNodeContextMenu],
  );
  const handleSaveToProjectAssets = reactExports.useCallback(
    (nodeIds) => {
      const files = collectFiles(nodeIds);
      if (files.length === 0) return;
      closeNodeContextMenu();
      queueMicrotask(() =>
        openSaveToProjectAssets({
          files,
        }),
      );
    },
    [collectFiles, closeNodeContextMenu, openSaveToProjectAssets],
  );
  const handleToolbarPromoteToAsset = reactExports.useCallback(
    (nodeIds, anchor) => {
      if (isTeamProject) handleSaveToProjectAssets(nodeIds);
      else if (isInProject)
        setAssetSaveMenu({
          ...anchor,
          nodeIds,
        });
      else handlePromoteToAsset(nodeIds, anchor);
    },
    [
      isTeamProject,
      isInProject,
      handlePromoteToAsset,
      handleSaveToProjectAssets,
    ],
  );
  const promoteMenuActions = reactExports.useCallback(
    (point) => ({
      ...(isTeamProject
        ? {}
        : {
            promoteToAsset: (ids) => handlePromoteToAsset(ids, point),
          }),
      ...(isInProject
        ? {
            saveToProjectAssets: handleSaveToProjectAssets,
          }
        : {}),
    }),
    [
      isTeamProject,
      isInProject,
      handlePromoteToAsset,
      handleSaveToProjectAssets,
    ],
  );
  const handleGroupNodesAfterPromote = reactExports.useCallback(
    (nodeIds, label) => {
      gatewayFetch("/api/canvas/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeIds,
          label,
        }),
      }).catch((err) => {
        console.warn(
          "[useCanvasAssetPromotion] auto-group after promote failed:",
          err,
        );
      });
    },
    [gatewayFetch],
  );
  const promotePopoverElement = (
    <>
      <PromoteToAssetPopover
        state={promotePopover}
        workspaceRoot={workspaceRoot}
        onClose={() => setPromotePopover(null)}
        onGroupNodes={handleGroupNodesAfterPromote}
      />
      <AssetSaveMenu
        state={assetSaveMenu}
        onClose={closeAssetSaveMenu}
        onSaveToProjectAssets={handleSaveToProjectAssets}
        onAddToLibrary={handlePromoteToAsset}
      />
    </>
  );
  return {
    handlePromoteToAsset,
    handleSaveToProjectAssets,
    handleToolbarPromoteToAsset,
    promoteMenuActions,
    promotePopoverElement,
  };
}
