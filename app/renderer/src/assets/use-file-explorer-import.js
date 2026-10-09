// use-file-explorer-import.js
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { getFileName$1 } from "../canvas/uploading-assets.jsx";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";
import { postCheckConflicts } from "./post-check-conflicts.js";

export function useFileExplorerImport({
  gatewayFetch: gatewayFetch2,
  platform: platform2,
  rootPath,
  conflictResolver,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const { t: t2 } = useTranslation();
  const [externalDragOver, setExternalDragOver] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  const handleImportFilesFromMenu = useStableCallback(async () => {
    if (!rootPath) return;
    const showOpenDialog = platform2.fs.showOpenDialog;
    if (!showOpenDialog) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    let picked;
    try {
      picked = await showOpenDialog({
        title: t2("fileExplorer.importFilesDialogTitle"),
        multiple: true,
        directory: false,
      });
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    if (!picked || picked.length === 0) return;
    const probeItems = picked.map((p3) => ({
      name: getFileName$1(p3),
      sourcePath: p3,
      kind: "file",
    }));
    let conflicts;
    try {
      const probeJson = await postCheckConflicts(gatewayFetch2, {
        items: probeItems,
        targetDir: "",
      });
      conflicts = probeJson.conflicts.map((c3) => ({
        name: c3.name,
        sourcePath: c3.sourcePath,
        existingKind: c3.existingKind,
      }));
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
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
      conflicts.forEach((c3, i2) => {
        const decision = decisions[i2];
        if (!c3.sourcePath) return;
        if (decision === "skip") skipSources.add(c3.sourcePath);
        else if (decision === "overwrite") overwriteTargets.push(c3.name);
      });
    }
    const sourcesToImport = picked.filter((p3) => !skipSources.has(p3));
    if (sourcesToImport.length === 0) {
      return;
    }
    if (overwriteTargets.length > 0) {
      try {
        const deleteRes = await gatewayFetch2(API_PATHS.deleteFiles, {
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
        dedupedToast.warning(t2("fileExplorer.overwriteFailedRenamed"));
      }
    }
    try {
      const res = await gatewayFetch2(API_PATHS.importExternal, {
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
      let data2;
      try {
        data2 = await res.json();
      } catch (err) {
        throw new Error(
          `Import response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const newAbsPaths = (data2.imported ?? []).map((it2) =>
        joinFilePath(rootPath, it2.path),
      );
      if (data2.errors?.length) {
        console.warn("[fileExplorer] import partial failures:", data2.errors);
        dedupedToast.warning(
          t2("fileExplorer.importFailedCount", {
            count: data2.errors.length,
          }),
        );
      } else {
        dedupedToast.success(t2("fileExplorer.importComplete"));
      }
      await refresh();
      if (newAbsPaths.length > 0) {
        setSelectedPaths(new Set(newAbsPaths));
        setLastSelectedPath(newAbsPaths[newAbsPaths.length - 1]);
      }
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const isExternalFileDrag = reactExports.useCallback((e2) => {
    return (
      e2.dataTransfer.types.includes("Files") &&
      !e2.dataTransfer.types.includes(RESOURCE_DRAG_MIME)
    );
  }, []);
  const handleExternalDragEnter = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      e2.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setExternalDragOver(true);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDragOver = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      e2.preventDefault();
      e2.dataTransfer.dropEffect = "copy";
    },
    [isExternalFileDrag],
  );
  const handleExternalDragLeave = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setExternalDragOver(false);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDrop = useStableCallback(async (e2) => {
    if (!isExternalFileDrag(e2)) return;
    e2.preventDefault();
    dragCounterRef.current = 0;
    setExternalDragOver(false);
    const files = Array.from(e2.dataTransfer.files);
    const paths = files
      .map((f2) => window.hilo?.webUtils?.getPathForFile(f2))
      .filter((p3) => !!p3);
    if (paths.length === 0) return;
    try {
      const res = await gatewayFetch2(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths,
        }),
      });
      if (!res.ok) throw new Error(`Import failed: ${res.status}`);
      const data2 = await res.json();
      if (data2.errors?.length) {
        dedupedToast.error(
          t2("fileExplorer.importFailedCount", {
            count: data2.errors.length,
          }),
        );
      }
      await refresh();
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
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
