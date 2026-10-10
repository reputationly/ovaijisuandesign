// use-drop-handler.js
import { reactExports } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { hasFileDropPayload } from "./find-trailing-trigger.js";
import { useImportExternalFiles } from "../text-editor/use-placeholder-asset-source.jsx";
import { useAnchorProjectAssets } from "../assets/rename-local-node-dialog.jsx";
import { parseResourceDrag } from "../text-editor/build-asr-gateway-request.js";

function hasDroppedDirectories(dataTransfer) {
  const items = dataTransfer?.items;
  if (!items) return false;
  return Array.from(items).some((item) => {
    if (item.kind !== "file") return false;
    const entry = item.webkitGetAsEntry?.();
    return entry?.isDirectory === true;
  });
}

function hasNativeFileDrag(dataTransfer) {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types ?? []).includes("Files");
}

export function useDropHandler({
  guard,
  getTransactionGeneration,
  addFromLocal,
  addFromAssetPath,
  folderWarningText,
}) {
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  const anchorProjectAssets = useAnchorProjectAssets();
  const importExternalToWorkspace = useImportExternalFiles();
  const warnUnsupportedFolder = reactExports.useCallback(() => {
    dedupedToast.warning(folderWarningText);
  }, [folderWarningText]);
  const handleDragOver = reactExports.useCallback((e2) => {
    if (!hasFileDropPayload(e2.dataTransfer)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "copy";
  }, []);
  const handleDragEnter = reactExports.useCallback((e2) => {
    if (!hasFileDropPayload(e2.dataTransfer)) return;
    e2.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);
  const handleDragLeave = reactExports.useCallback((e2) => {
    if (dragCounterRef.current === 0) return;
    e2.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);
  const handleDrop2 = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const resources = parseResourceDrag(e2);
      if (resources) {
        if (guard && !guard()) return;
        const transactionGeneration = getTransactionGeneration?.();
        let added = 0;
        const externalPaths = [];
        const projectAssets = [];
        for (const item of resources) {
          if (item.isDirectory) continue;
          if (item.external) {
            if (item.absolutePath) {
              if (item.projectAsset) {
                projectAssets.push({
                  absolutePath: item.absolutePath,
                  name: item.name,
                  identity: item.projectAsset,
                });
              } else {
                externalPaths.push(item.absolutePath);
              }
              added++;
            }
            continue;
          }
          addFromAssetPath(item.path, item.name, void 0, item.assetId);
          added++;
        }
        if (externalPaths.length > 0) {
          void importExternalToWorkspace(externalPaths)
            .then((rows) => {
              if (
                transactionGeneration !== void 0 &&
                getTransactionGeneration?.() !== transactionGeneration
              ) {
                return;
              }
              if (guard && !guard()) return;
              for (const row of rows) {
                addFromAssetPath(
                  row.path,
                  row.path.split("/").pop() ?? row.path,
                  void 0,
                  row.id,
                );
              }
            })
            .catch((err) => {
              console.error(
                "[chat] External resource drop import failed:",
                err,
              );
            });
        }
        for (const item of projectAssets) {
          void anchorProjectAssets([
            {
              path: item.absolutePath,
              assetId: item.identity.assetId,
              projectFolderName: item.identity.projectFolderName,
            },
          ])
            .then(([anchored]) => {
              if (!anchored) throw new Error("anchor returned no rows");
              if (
                transactionGeneration !== void 0 &&
                getTransactionGeneration?.() !== transactionGeneration
              ) {
                return;
              }
              if (guard && !guard()) return;
              addFromAssetPath(anchored.path, item.name);
            })
            .catch((err) => {
              console.error("[chat] Project asset drop anchor failed:", err);
            });
        }
        if (added === 0) warnUnsupportedFolder();
        return;
      }
      const hasDirectories = hasDroppedDirectories(e2.dataTransfer);
      if (e2.dataTransfer.files.length > 0) {
        if (guard && !guard()) return;
        addFromLocal(e2.dataTransfer.files);
        if (hasDirectories) warnUnsupportedFolder();
      } else if (hasDirectories || hasNativeFileDrag(e2.dataTransfer)) {
        warnUnsupportedFolder();
      }
    },
    [
      guard,
      getTransactionGeneration,
      addFromLocal,
      addFromAssetPath,
      anchorProjectAssets,
      importExternalToWorkspace,
      warnUnsupportedFolder,
    ],
  );
  return {
    isDragging,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop2,
    },
  };
}
