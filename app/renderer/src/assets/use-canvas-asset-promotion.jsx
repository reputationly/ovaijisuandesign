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
  state: state2,
  onSaveToProjectAssets,
  onAddToLibrary,
  onClose,
  motionProps,
}) {
  const { t: t2 } = useTranslation();
  const ref = motionProps.ref;
  const closing2 = motionProps["data-ending-style"] !== void 0;
  const [menuPosition, setMenuPosition] = reactExports.useState(() =>
    resolveNodeContextMenuPosition({
      anchor: state2,
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
    const menu2 = ref.current;
    const next2 = resolveNodeContextMenuPosition({
      anchor: {
        x: state2.x,
        y: state2.y,
      },
      menuSize: menu2
        ? {
            width: menu2.offsetWidth,
            height: menu2.offsetHeight,
          }
        : ESTIMATED_MENU_SIZE,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setMenuPosition((current2) =>
      current2.x === next2.x && current2.y === next2.y ? current2 : next2,
    );
  }, [state2.x, state2.y, ref]);
  reactExports.useLayoutEffect(updateMenuPosition, [updateMenuPosition]);
  reactExports.useEffect(() => {
    window.addEventListener("resize", updateMenuPosition);
    return () => window.removeEventListener("resize", updateMenuPosition);
  }, [updateMenuPosition]);
  reactExports.useEffect(() => {
    if (closing2) return;
    const handleClick2 = (e2) => {
      if (ref.current?.contains(e2.target)) return;
      onClose();
    };
    const handleKey = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick2);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick2);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, closing2, ref]);
  const handleSaveToProject = () => {
    onClose();
    onSaveToProjectAssets(state2.nodeIds);
  };
  const handleAddToLibrary = () => {
    onClose();
    onAddToLibrary(state2.nodeIds, {
      x: state2.x,
      y: state2.y,
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
        {t2("canvas.saveToProjectAssets")}
      </ActionListItem>
      <ActionListItem
        data-action-ui-id="canvas-asset-save-menu.add-to-library"
        onClick={handleAddToLibrary}
      >
        <StrokeIcon icon={Library} size={16} />
        {t2("canvas.addToLibrary")}
      </ActionListItem>
    </ActionListPanel>
  );
  return typeof document === "undefined"
    ? menu
    : reactDomExports.createPortal(menu, document.body);
}

function AssetSaveMenu({
  state: state2,
  onSaveToProjectAssets,
  onAddToLibrary,
  onClose,
}) {
  return (
    <QuickZoomPresence value={state2}>
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
  state: state2,
  workspaceRoot,
  onClose,
  onGroupNodes,
}) {
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const open = state2 !== null && state2.files.length > 0;
  useSuspendCanvasInteractions(open);
  const anchor = state2
    ? {
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          x: state2.x,
          y: state2.y,
          top: state2.y,
          left: state2.x,
          right: state2.x,
          bottom: state2.y,
        }),
      }
    : void 0;
  const handleSuccess = reactExports.useCallback(
    (result) => {
      if (
        result?.entityName &&
        state2 &&
        state2.nodeIds.length >= 2 &&
        onGroupNodes
      ) {
        onGroupNodes(state2.nodeIds, result.entityName);
      }
      onClose();
    },
    [state2, onGroupNodes, onClose],
  );
  return (
    <Popover
      open={open}
      onOpenChange={(o2) => {
        if (!o2 && !isSubmitting) onClose();
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
        {state2 && (
          <PromoteToAssetForm
            files={state2.files}
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
  const gatewayFetch2 = useGatewayFetch();
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
      const seen2 = new Set();
      const files = [];
      for (const ref of refs) {
        if (seen2.has(ref.filePath)) continue;
        seen2.add(ref.filePath);
        const absolutePath = workspaceRoot
          ? joinFilePath(workspaceRoot, ref.filePath)
          : ref.filePath;
        const displayName2 = ref.filePath.split("/").pop() ?? ref.filePath;
        const vaultPrompt = workspaceAssets.find(
          (a2) => a2.path === ref.filePath,
        )?.prompt;
        files.push({
          workspaceRelPath: ref.filePath,
          absolutePath,
          displayName: displayName2,
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
    (point2) => ({
      ...(isTeamProject
        ? {}
        : {
            promoteToAsset: (ids2) => handlePromoteToAsset(ids2, point2),
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
      gatewayFetch2("/api/canvas/group", {
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
    [gatewayFetch2],
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
