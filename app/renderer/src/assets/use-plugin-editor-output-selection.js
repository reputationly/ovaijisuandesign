// use-plugin-editor-output-selection.js
import { dedupedToast, reactExports } from "../vendor.js";
import { isBlobRef } from "../media-editing/input.jsx";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { pluginError } from "../generation/use-mention-models.jsx";

function rememberPluginEditorOutput(
  pendingByEditorNode,
  editorNodeId,
  outputNodeId,
) {
  if (!editorNodeId || !outputNodeId) return;
  pendingByEditorNode.set(editorNodeId, outputNodeId);
}

function takePluginEditorOutput(pendingByEditorNode, editorNodeId) {
  const outputNodeId = pendingByEditorNode.get(editorNodeId);
  pendingByEditorNode.delete(editorNodeId);
  return outputNodeId;
}

export function usePluginEditorOutputSelection(
  trackActiveChange,
  canvasViewRef,
) {
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
      const outputNodeId = takePluginEditorOutput(
        pendingByEditorNode.current,
        session.nodeId,
      );
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
      rememberPluginEditorOutput(
        pendingByEditorNode.current,
        editorNodeId,
        outputNodeId,
      ),
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
      throw new Error(
        "plugin: URL sources are not yet supported; upload first",
      );
    }
    return source;
  }
  if (isBlobRef(source)) return source.path;
  throw new Error(
    "plugin: invalid source — expected workspace path or BlobRef",
  );
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
  await fs.copy(
    workspace ? joinFilePath(workspace, sourcePath) : sourcePath,
    targetPath,
    true,
  );
  return {
    path: targetPath,
  };
}

export async function runAfterProjectAssetAnchor(
  anchorProjectAssets,
  item,
  operation,
) {
  const [anchored] = await anchorProjectAssets([item]);
  if (!anchored) throw new Error("anchor returned no rows");
  return operation();
}

export function trackPluginInstall(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_INSTALL, props);
}

export function trackPluginUninstall(props) {
  trackEvent(TRACK_EVENTS.PLUGIN_UNINSTALL, props);
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
