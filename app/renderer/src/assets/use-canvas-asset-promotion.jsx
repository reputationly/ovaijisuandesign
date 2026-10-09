// use-canvas-asset-promotion.jsx
import { jsxRuntimeExports, reactExports, useTranslation, dedupedToast, ActionListItem, ActionListPanel, Library, FolderInput, reactDomExports } from "../vendor.js";
import { Popover } from "./apply-asset-change.jsx";
import { getPluginMeta } from "../infra/create-html-iframe-pool-store.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { pluginError, toTrackedCanvasNodeType } from "../generation/use-mention-models.jsx";
import { useGatewayFetch, folderNameFromPath } from "../generation/use-resizable-width.js";
import { useWorkspaceProject } from "../workspace/workspace-events.js";
import { trackEvent } from "../infra/init-track.js";
import { StrokeIcon } from "../workspace/browser-inspiration-urls.jsx";
import { joinFilePath } from "./use-asset-menu-shortcuts.js";
import { PromoteToAssetForm } from "./asset-panel-overlay-host.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { isBlobRef } from "../media-editing/use-plugin-host.jsx";
import { QuickZoomPresence } from "../canvas/canvas-toggle-icon.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  NODE_CONTEXT_MENU_VIEWPORT_MARGIN,
  resolveNodeContextMenuPosition,
} from "../text-editor/use-txt2-text.jsx";
function rememberPluginEditorOutput(pendingByEditorNode, editorNodeId, outputNodeId) {
  if (!editorNodeId || !outputNodeId) return;
  pendingByEditorNode.set(editorNodeId, outputNodeId);
}
function takePluginEditorOutput(pendingByEditorNode, editorNodeId) {
  const outputNodeId = pendingByEditorNode.get(editorNodeId);
  pendingByEditorNode.delete(editorNodeId);
  return outputNodeId;
}
export function usePluginEditorOutputSelection(trackActiveChange, canvasViewRef) {
  const pendingByEditorNode = reactExports.useRef(new Map());
  const pendingSelectionFrame = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      if (pendingSelectionFrame.current !== null) {
        cancelAnimationFrame(pendingSelectionFrame.current);
      }
    },
    [],
  );
  const handleActiveChange = reactExports.useCallback(
    (session, active2, agentName, pluginId, openContext) => {
      trackActiveChange(session, active2, agentName, pluginId, openContext);
      if (active2) {
        if (pendingSelectionFrame.current !== null) {
          cancelAnimationFrame(pendingSelectionFrame.current);
          pendingSelectionFrame.current = null;
        }
        pendingByEditorNode.current.delete(session.nodeId);
        return;
      }
      const outputNodeId = takePluginEditorOutput(pendingByEditorNode.current, session.nodeId);
      if (!outputNodeId) return;
      pendingSelectionFrame.current = requestAnimationFrame(() => {
        pendingSelectionFrame.current = null;
        canvasViewRef.current?.focusDerivedNode(outputNodeId, {
          alwaysCenter: true,
          duration: 400,
        });
      });
    },
    [canvasViewRef, trackActiveChange],
  );
  const rememberOutput = reactExports.useCallback(
    (editorNodeId, outputNodeId) =>
      rememberPluginEditorOutput(pendingByEditorNode.current, editorNodeId, outputNodeId),
    [],
  );
  return {
    handleActiveChange,
    rememberOutput,
  };
}
export function resolvePluginSourcePath(source) {
  if (typeof source === "string") {
    if (/^https?:\/\//.test(source)) {
      throw new Error("plugin: URL sources are not yet supported; upload first");
    }
    return source;
  }
  if (isBlobRef(source)) return source.path;
  throw new Error("plugin: invalid source — expected workspace path or BlobRef");
}
export function notifyFromPlugin(shell, message2, level, options) {
  const action = options?.action;
  const toastOptions = {
    ...(options?.description
      ? {
          description: options.description,
        }
      : {}),
    ...(action && shell.showItemInFolder
      ? {
          action: {
            label: action.label,
            onClick: () => void shell.showItemInFolder?.(action.revealPath),
          },
        }
      : {}),
  };
  if (level === "error") dedupedToast.error(message2, toastOptions);
  else if (level === "success") dedupedToast.success(message2, toastOptions);
  else if (level === "warning") dedupedToast.warning(message2, toastOptions);
  else dedupedToast.info(message2, toastOptions);
}
export async function savePluginFile(fs, workspace, resolveSourcePath, args) {
  if (!fs.showSaveDialog || !fs.copy) {
    throw new Error("plugin: native file saving is not available");
  }
  const extension2 = args.suggestedName.includes(".")
    ? args.suggestedName.split(".").pop()
    : void 0;
  const targetPath = await fs.showSaveDialog({
    ...(args.title
      ? {
          title: args.title,
        }
      : {}),
    defaultPath: args.suggestedName,
    ...(extension2
      ? {
          filters: [
            {
              name: extension2.toUpperCase(),
              extensions: [extension2],
            },
          ],
        }
      : {}),
  });
  if (!targetPath) return null;
  const sourcePath = resolveSourcePath(args.source);
  await fs.copy(workspace ? joinFilePath(workspace, sourcePath) : sourcePath, targetPath, true);
  return {
    path: targetPath,
  };
}
export async function runAfterProjectAssetAnchor(anchorProjectAssets, item, operation) {
  const [anchored] = await anchorProjectAssets([item]);
  if (!anchored) throw new Error("anchor returned no rows");
  return operation();
}
const ESTIMATED_MENU_SIZE = {
  width: 192,
  height: 84,
};
function AssetSaveMenu({ state: state2, onSaveToProjectAssets, onAddToLibrary, onClose }) {
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
  return typeof document === "undefined" ? menu : reactDomExports.createPortal(menu, document.body);
}
function PromoteToAssetPopover({ state: state2, workspaceRoot, onClose, onGroupNodes }) {
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
      if (result?.entityName && state2 && state2.nodeIds.length >= 2 && onGroupNodes) {
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
  const closeAssetSaveMenu = reactExports.useCallback(() => setAssetSaveMenu(null), []);
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
        const vaultPrompt = workspaceAssets.find((a2) => a2.path === ref.filePath)?.prompt;
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
    [isTeamProject, isInProject, handlePromoteToAsset, handleSaveToProjectAssets],
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
    [isTeamProject, isInProject, handlePromoteToAsset, handleSaveToProjectAssets],
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
        console.warn("[useCanvasAssetPromotion] auto-group after promote failed:", err);
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
export function trackPluginInstall(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_INSTALL, props);
}
export function trackPluginUninstall(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_UNINSTALL, props);
}
function trackPluginAddToCanvas(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_ADD_TO_CANVAS, props);
}
export function trackPluginEditorOpen(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_EDITOR_OPEN, props);
}
export function trackPluginWorkflowClick(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_WORKFLOW_CLICK, props);
}
export function trackPluginWorkflowOpen(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_WORKFLOW_OPEN, props);
}
export function trackPluginInstallFailed(props, error) {
  const normalized = pluginError(error);
  trackEvent(TRACK_EVENTS.PLUGIN_INSTALL_FAILED, {
    ...props,
    ...normalized,
    error_code: `install_${normalized.error_code}`,
    error_message: "Plugin install failed",
  });
}
export function trackPluginUninstallFailed(props, error) {
  const normalized = pluginError(error);
  trackEvent(TRACK_EVENTS.PLUGIN_UNINSTALL_FAILED, {
    ...props,
    ...normalized,
    error_code: `uninstall_${normalized.error_code}`,
    error_message: "Plugin uninstall failed",
  });
}
export function trackPluginWorkflowOpenFailed(props, error) {
  const normalized = pluginError(error);
  trackEvent(TRACK_EVENTS.PLUGIN_WORKFLOW_OPEN_FAILED, {
    ...props,
    ...normalized,
    error_code: `${props.stage}_${normalized.error_code}`,
    error_message:
      props.stage === "workspace_open"
        ? "Plugin workflow workspace open failed"
        : "Plugin workflow template import failed",
  });
}
export function useComfyUiCanvasTracking(workspaceRef) {
  const handleNodeAddTrack = reactExports.useCallback(
    (info2) => {
      const canvasId = workspaceRef.current ? folderNameFromPath(workspaceRef.current) : void 0;
      try {
        trackEvent(TRACK_EVENTS.CANVAS_NODE_ADD, {
          node_type:
            info2.pluginId === "comfyui" ? "comfyui" : toTrackedCanvasNodeType(info2.nodeType),
          source: info2.source,
          ...(info2.entryPoint
            ? {
                entry_point: info2.entryPoint,
              }
            : {}),
          ...(canvasId
            ? {
                canvas_id: canvasId,
              }
            : {}),
        });
        if (info2.pluginId && info2.nodeId) {
          const meta2 = getPluginMeta(info2.pluginId);
          trackPluginAddToCanvas({
            plugin_id: info2.pluginId,
            plugin_version: meta2?.version ?? "unknown",
            plugin_source: meta2?.source ?? "installed",
            plugin_instance_id: info2.nodeId,
            surface: "canvas",
            trigger: info2.source,
            duration_ms: info2.durationMs ?? 0,
          });
        }
      } catch {}
    },
    [workspaceRef],
  );
  const handlePaneContextMenuActionTrack = reactExports.useCallback((info2) => {
    try {
      trackEvent(TRACK_EVENTS.CANVAS_CONTEXT_MENU_CLICK, {
        menu_item: info2.menuItem,
        surface: "pane_context_menu",
      });
    } catch {}
  }, []);
  const handleComfyUiDraftActionTrack = reactExports.useCallback((info2) => {
    try {
      trackEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_DRAFT_ACTION, {
        action: info2.action,
        ...(info2.workflowSource
          ? {
              workflow_source: info2.workflowSource,
            }
          : {}),
      });
    } catch {}
  }, []);
  const handlePluginActionTrack = reactExports.useCallback((info2) => {
    if (info2.pluginId !== "comfyui" || info2.action !== "run" || !info2.runPath) return;
    try {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_RUN, {
        node_type: "comfyui",
        run_path: info2.runPath,
        has_workflow_content: true,
      });
    } catch {}
  }, []);
  return {
    handleComfyUiDraftActionTrack,
    handleNodeAddTrack,
    handlePaneContextMenuActionTrack,
    handlePluginActionTrack,
  };
}
