// use-file-explorer-import.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { getFileName } from "../canvas/uploading-assets.jsx";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";
import { postCheckConflicts } from "./post-check-conflicts.js";
export function useFileExplorerImport({
  gatewayFetch,
  platform,
  rootPath,
  conflictResolver,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const { t: translate } = useTranslation();
  const [externalDragOver, setExternalDragOver] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  const handleImportFilesFromMenu = useStableCallback(async () => {
    if (!rootPath) return;
    const showOpenDialog = platform.fs.showOpenDialog;
    if (!showOpenDialog) {
      dedupedToast.error(translate("fileExplorer.platformNotSupported"));
      return;
    }
    let picked;
    try {
      picked = await showOpenDialog({
        title: translate("fileExplorer.importFilesDialogTitle"),
        multiple: true,
        directory: false,
      });
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    if (!picked || picked.length === 0) return;
    const probeItems = picked.map((sourcePath) => ({
      name: getFileName(sourcePath),
      sourcePath,
      kind: "file",
    }));
    let conflicts;
    try {
      const probeJson = await postCheckConflicts(gatewayFetch, {
        items: probeItems,
        targetDir: "",
      });
      conflicts = probeJson.conflicts.map((conflict) => ({
        name: conflict.name,
        sourcePath: conflict.sourcePath,
        existingKind: conflict.existingKind,
      }));
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    const skipSources = new Set();
    const overwriteTargets = [];
    if (conflicts.length > 0) {
      const result = await conflictResolver.resolve(conflicts);
      if (result.outcome === "dismissed") return;
      if (result.outcome === "preempted") {
        console.warn("[fileExplorer] conflict resolver preempted mid-import");
        return;
      }
      const { decisions } = result;
      conflicts.forEach((conflict, conflictIndex) => {
        const decision = decisions[conflictIndex];
        if (!conflict.sourcePath) return;
        if (decision === "skip") skipSources.add(conflict.sourcePath);
        else if (decision === "overwrite") overwriteTargets.push(conflict.name);
      });
    }
    const sourcesToImport = picked.filter((sourcePath) => !skipSources.has(sourcePath));
    if (sourcesToImport.length === 0) {
      return;
    }
    if (overwriteTargets.length > 0) {
      try {
        const deleteRes = await gatewayFetch(API_PATHS.deleteFiles, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: overwriteTargets,
          }),
        });
        if (!deleteRes.ok) {
          throw new Error(
            `delete failed: ${deleteRes.status} ${deleteRes.statusText}`,
          );
        }
      } catch (err) {
        console.warn("[fileExplorer] overwrite delete failed", err);
        dedupedToast.warning(translate("fileExplorer.overwriteFailedRenamed"));
      }
    }
    try {
      const res = await gatewayFetch(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: sourcesToImport,
        }),
      });
      if (!res.ok) {
        throw new Error(`Import failed: ${res.status} ${res.statusText}`);
      }
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error(
          `Import response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const newAbsPaths = (data.imported ?? []).map((importedItem) =>
        joinFilePath(rootPath, importedItem.path),
      );
      if (data.errors?.length) {
        console.warn("[fileExplorer] import partial failures:", data.errors);
        dedupedToast.warning(
          translate("fileExplorer.importFailedCount", {
            count: data.errors.length,
          }),
        );
      } else {
        dedupedToast.success(translate("fileExplorer.importComplete"));
      }
      await refresh();
      if (newAbsPaths.length > 0) {
        setSelectedPaths(new Set(newAbsPaths));
        setLastSelectedPath(newAbsPaths[newAbsPaths.length - 1]);
      }
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const isExternalFileDrag = reactExports.useCallback((dragEvent) => {
    return (
      dragEvent.dataTransfer.types.includes("Files") &&
      !dragEvent.dataTransfer.types.includes(RESOURCE_DRAG_MIME)
    );
  }, []);
  const handleExternalDragEnter = reactExports.useCallback(
    (dragEvent) => {
      if (!isExternalFileDrag(dragEvent)) return;
      dragEvent.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setExternalDragOver(true);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDragOver = reactExports.useCallback(
    (dragEvent) => {
      if (!isExternalFileDrag(dragEvent)) return;
      dragEvent.preventDefault();
      dragEvent.dataTransfer.dropEffect = "copy";
    },
    [isExternalFileDrag],
  );
  const handleExternalDragLeave = reactExports.useCallback(
    (dragEvent) => {
      if (!isExternalFileDrag(dragEvent)) return;
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setExternalDragOver(false);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDrop = useStableCallback(async (dragEvent) => {
    if (!isExternalFileDrag(dragEvent)) return;
    dragEvent.preventDefault();
    dragCounterRef.current = 0;
    setExternalDragOver(false);
    const files = Array.from(dragEvent.dataTransfer.files);
    const paths = files
      .map((file) => window.hilo?.webUtils?.getPathForFile(file))
      .filter((filePath) => !!filePath);
    if (paths.length === 0) return;
    try {
      const res = await gatewayFetch(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths,
        }),
      });
      if (!res.ok) throw new Error(`Import failed: ${res.status}`);
      const data = await res.json();
      if (data.errors?.length) {
        dedupedToast.error(
          translate("fileExplorer.importFailedCount", {
            count: data.errors.length,
          }),
        );
      }
      await refresh();
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  return {
    externalDragOver,
    handleImportFilesFromMenu,
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,
  };
}
