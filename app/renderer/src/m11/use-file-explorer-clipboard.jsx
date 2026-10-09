// use-file-explorer-clipboard.jsx
import {
  useTranslation,
  reactExports,
  dedupedToast,
  API_PATHS,
  useStableCallback,
  refreshAssetIndex,
} from "../vendor.js";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { instantiationService, IClipboardService } from "../m08/browser-inspiration-urls.jsx";
import { DELETE_UNDO_TTL_MS, OPERATIONS_UNDO_PATH } from "../m01/text-models.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { generateCopyName, joinFilePath, toRelativeFromRoot } from "./use-asset-menu-shortcuts.js";
const PASTED_IMAGE_EXTENSION = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};
export function useFileExplorerClipboard({
  gatewayFetch: gatewayFetch2,
  platform: platform2,
  rootPath,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
  sectionRef,
}) {
  const { t: t2 } = useTranslation();
  const clipboardService = reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IClipboardService)),
    [],
  );
  const [clipboardHasContent, setClipboardHasContent] = reactExports.useState(false);
  const handleNativePaste = useStableCallback(async (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    const cd = event.clipboardData;
    const files = Array.from(cd?.files ?? []);
    if (files.length === 0) {
      dedupedToast.info(t2("fileExplorer.pasteEmpty"));
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      const newAbsPaths = [];
      const onDiskPaths = [];
      const inMemoryFiles = [];
      for (const file of files) {
        const realPath = window.hilo?.webUtils?.getPathForFile?.(file) ?? "";
        if (realPath.length > 0) {
          onDiskPaths.push(realPath);
        } else {
          inMemoryFiles.push(file);
        }
      }
      if (onDiskPaths.length > 0) {
        const res = await gatewayFetch2(API_PATHS.importExternal, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: onDiskPaths,
          }),
        });
        if (!res.ok) {
          let detail = "";
          try {
            const errorBody = await res.json();
            if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
              detail = ` -- ${String(errorBody.error)}`;
            }
          } catch {}
          throw new Error(`Import failed: ${res.status} ${res.statusText}${detail}`);
        }
        let data2;
        try {
          data2 = await res.json();
        } catch (err) {
          throw new Error(
            `import-external response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        if (data2.imported && rootPath) {
          for (const it2 of data2.imported) {
            newAbsPaths.push(joinFilePath(rootPath, it2.path));
          }
        }
        if (data2.errors?.length) {
          console.warn("[fileExplorer] import-external partial failures:", data2.errors);
          dedupedToast.warning(
            t2("fileExplorer.importFailedCount", {
              count: data2.errors.length,
            }),
          );
        }
        await refresh();
      }
      if (inMemoryFiles.length > 0 && rootPath) {
        if (!platform2.fs.writeBinaryFile) {
          if (onDiskPaths.length > 0) {
            dedupedToast.warning(t2("fileExplorer.platformNotSupported"));
          } else {
            dedupedToast.error(t2("fileExplorer.platformNotSupported"));
          }
          return;
        }
        const ts2 = new Date()
          .toISOString()
          .replace(/[-:T.]/g, "")
          .slice(0, 14);
        const writeFailures = [];
        let successCount = 0;
        for (const file of inMemoryFiles) {
          const rand = Math.random().toString(36).slice(2, 6);
          const dot2 = file.name?.lastIndexOf(".") ?? -1;
          const ext =
            dot2 > 0 ? file.name.slice(dot2) : (PASTED_IMAGE_EXTENSION[file.type] ?? ".bin");
          const filename = `pasted_${ts2}_${rand}${ext}`;
          const destPath = joinFilePath(rootPath, filename);
          try {
            const ab = await file.arrayBuffer();
            await platform2.fs.writeBinaryFile(destPath, ab);
            successCount++;
            newAbsPaths.push(destPath);
          } catch (err) {
            writeFailures.push({
              name: file.name || filename,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        await refresh();
        if (writeFailures.length > 0) {
          console.warn("[fileExplorer] in-memory write failures:", writeFailures);
          const showFn = successCount > 0 ? dedupedToast.warning : dedupedToast.error;
          showFn(
            t2("fileExplorer.importFailedCount", {
              count: writeFailures.length,
            }),
          );
        }
      }
      if (newAbsPaths.length > 0) {
        setSelectedPaths(new Set(newAbsPaths));
        setLastSelectedPath(newAbsPaths[newAbsPaths.length - 1]);
      }
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.pasteFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handlePasteFromMenu = useStableCallback(async () => {
    sectionRef.current?.focus({
      preventScroll: true,
    });
    await new Promise((r2) => requestAnimationFrame(() => r2()));
    const result = await clipboardService.triggerPasteOnFocusedWindow();
    if (result.ok) {
      return;
    }
    if (result.reason === "paste-threw") {
      dedupedToast.error(
        t2("fileExplorer.pasteFailed") + (result.message ? `: ${result.message}` : ""),
      );
    } else {
      dedupedToast.info(t2("fileExplorer.pasteEmpty"));
    }
  });
  const probeClipboard = useStableCallback(() => {
    setClipboardHasContent(false);
    clipboardService
      .hasFiles()
      .then((value) => setClipboardHasContent(value))
      .catch((err) => {
        console.warn(
          "[fileExplorer] clipboard hasFiles probe failed; fail-open to surface real error via paste",
          err,
        );
        setClipboardHasContent(true);
      });
  });
  return {
    clipboardHasContent,
    handleNativePaste,
    handlePasteFromMenu,
    probeClipboard,
  };
}
export async function postCheckConflicts(gatewayFetch2, body2) {
  const res = await gatewayFetch2(API_PATHS.checkConflicts, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  if (!res.ok) {
    throw new Error(`checkConflicts failed: ${res.status} ${res.statusText}`);
  }
  let parsed;
  try {
    parsed = await res.json();
  } catch (err) {
    throw new Error(
      `checkConflicts response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const conflicts = parsed.conflicts;
  return {
    ok: true,
    conflicts: Array.isArray(conflicts) ? conflicts : [],
  };
}
async function findFreeRenameCandidate(gatewayFetch2, baseName, isDirectory, targetDirRel) {
  let candidate = generateCopyName(baseName, isDirectory);
  for (let i2 = 0; i2 < 1e3; i2++) {
    const probe = await postCheckConflicts(gatewayFetch2, {
      items: [
        {
          name: candidate,
          kind: isDirectory ? "folder" : "file",
        },
      ],
      targetDir: targetDirRel,
    });
    if (probe.conflicts.length === 0) return candidate;
    candidate = generateCopyName(candidate, isDirectory);
  }
  throw new Error(`No free rename candidate found for "${baseName}" after 1000 attempts`);
}
export function useFileExplorerCreate({
  setViewMode,
  expanded,
  setExpanded,
  rootPath,
  gatewayFetch: gatewayFetch2,
  conflictResolver,
  platformFs,
  refresh,
  invalidateDirs,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const { t: t2 } = useTranslation();
  const [creatingEntry, setCreatingEntry] = reactExports.useState(null);
  const startCreate = reactExports.useCallback(
    (parentPath, isDirectory) => {
      setViewMode("tree");
      if (!expanded.has(parentPath) && parentPath !== rootPath) {
        setExpanded((prev) => new Set(prev).add(parentPath));
      }
      setCreatingEntry({
        parentPath,
        isDirectory,
      });
    },
    [expanded, rootPath, setViewMode, setExpanded],
  );
  const handleCreateConfirm = useStableCallback(async (name2) => {
    if (!creatingEntry) return;
    let confirmedName = name2;
    const targetDirRel =
      rootPath && creatingEntry.parentPath !== rootPath
        ? toRelativeFromRoot(rootPath, creatingEntry.parentPath)
        : "";
    try {
      const probeJson = await postCheckConflicts(gatewayFetch2, {
        items: [
          {
            name: name2,
            kind: creatingEntry.isDirectory ? "folder" : "file",
          },
        ],
        targetDir: targetDirRel,
      });
      const first2 = probeJson.conflicts[0];
      if (first2) {
        const result = await conflictResolver.resolve([
          {
            name: name2,
            existingKind: first2.existingKind,
          },
        ]);
        if (result.outcome !== "completed" || result.decisions[0] === "skip") {
          setCreatingEntry(null);
          return;
        }
        if (result.decisions[0] === "rename") {
          confirmedName = await findFreeRenameCandidate(
            gatewayFetch2,
            name2,
            creatingEntry.isDirectory,
            targetDirRel,
          );
        }
      }
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.createFailed", {
          name: name2,
        }) + (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      setCreatingEntry(null);
      return;
    }
    const newPath = joinFilePath(creatingEntry.parentPath, confirmedName);
    let createdOk = false;
    try {
      if (creatingEntry.isDirectory) {
        await platformFs.mkdir(newPath);
      } else {
        await platformFs.writeTextFile(newPath, "");
      }
      await refresh();
      if (creatingEntry.isDirectory) {
        invalidateDirs();
      }
      createdOk = true;
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.createFailed", {
          name: confirmedName,
        }) + (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
    setCreatingEntry(null);
    if (createdOk) {
      setSelectedPaths(new Set([newPath]));
      setLastSelectedPath(newPath);
    }
  });
  const handleCreateCancel = useStableCallback(() => {
    setCreatingEntry(null);
  });
  return {
    creatingEntry,
    startCreate,
    handleCreateConfirm,
    handleCreateCancel,
  };
}
function DeleteUndoToast({
  toastId,
  count: count2,
  gatewayFetch: gatewayFetch2,
  onUndoSuccess,
  t: t2,
}) {
  const [remaining, setRemaining] = reactExports.useState(Math.ceil(DELETE_UNDO_TTL_MS / 1e3));
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((s2) => (s2 > 0 ? s2 - 1 : 0));
    }, 1e3);
    return () => clearInterval(tick);
  }, []);
  const handleUndoClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await gatewayFetch2(OPERATIONS_UNDO_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const body2 = await res.json().catch(() => null);
      if (res.ok && body2?.ok) {
        onUndoSuccess?.();
        dedupedToast.dismiss(toastId);
        return;
      }
      if (body2?.errorType === "partial") {
        onUndoSuccess?.();
        dedupedToast.dismiss(toastId);
        return;
      }
      if (body2?.errorType === "expired") {
        dedupedToast.dismiss(toastId);
        return;
      }
      dedupedToast.error(t2("fileExplorer.undoFailed"));
      dedupedToast.dismiss(toastId);
    } catch (err) {
      dedupedToast.error(
        err instanceof Error && err.message
          ? `${t2("fileExplorer.undoFailed")}: ${err.message}`
          : t2("fileExplorer.undoFailed"),
      );
      dedupedToast.dismiss(toastId);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="elevated-surface-border flex items-center gap-3 rounded-lg px-3 py-2 bg-popover text-popover-foreground text-xs">
      <span>
        {t2("fileExplorer.deleteUndoToast", {
          count: count2,
        })}
      </span>
      <span className="text-muted-foreground">·</span>
      <Button$1
        variant="ghost"
        size="xs"
        onClick={handleUndoClick}
        disabled={busy}
        className="h-6 rounded-sm px-2"
      >
        {t2("fileExplorer.deleteUndoToastUndo")}
        {" ("}
        {remaining})
      </Button$1>
    </div>
  );
}
function showDeleteUndoToast(opts) {
  const id2 = dedupedToast.custom(
    (id22) => (
      <DeleteUndoToast
        toastId={id22}
        count={opts.count}
        gatewayFetch={opts.gatewayFetch}
        onUndoSuccess={opts.onUndoSuccess}
        t={opts.t}
      />
    ),
    {
      duration: DELETE_UNDO_TTL_MS,
      // Track toast lifecycle so dismissNewestDeleteUndoToast() stays
      // in sync without needing to listen for click / duration events.
      // Plain sonner doesn't expose an unmount hook for custom toasts,
      // so onDismiss + onAutoClose cover the two paths sonner uses to
      // retire a toast.
      onDismiss: (t2) => removeFromActiveToasts(t2.id),
      onAutoClose: (t2) => removeFromActiveToasts(t2.id),
    },
  );
  activeToastIds.push(id2);
  return id2;
}
const activeToastIds = [];
function removeFromActiveToasts(id2) {
  const idx = activeToastIds.indexOf(id2);
  if (idx !== -1) activeToastIds.splice(idx, 1);
}
export function dismissNewestDeleteUndoToast() {
  const id2 = activeToastIds.pop();
  if (id2 === void 0) return;
  dedupedToast.dismiss(id2);
}
export function useFileExplorerDelete({
  remove: remove2,
  toRelativePath,
  invalidateDirs,
  lastSelectedPath,
  setLastSelectedPath,
  selectionAnchorRef,
  selectedPaths,
  setSelectedPaths,
  gatewayFetch: gatewayFetch2,
  queryClient: queryClient2,
  gatewayScopeKey,
}) {
  const { t: t2 } = useTranslation();
  const [deletingEntries, setDeletingEntries] = reactExports.useState([]);
  const requestDelete = useStableCallback((entries2) => {
    if (entries2.length === 0) return;
    const seen2 = new Set();
    const unique2 = [];
    for (const entry of entries2) {
      if (seen2.has(entry.path)) continue;
      seen2.add(entry.path);
      unique2.push(entry);
    }
    setDeletingEntries(unique2);
  });
  const cancelDelete = useStableCallback(() => {
    setDeletingEntries([]);
  });
  const handleDeleteConfirm = useStableCallback(async () => {
    if (deletingEntries.length === 0) return;
    const entries2 = deletingEntries;
    const deletedPaths = entries2.map((entry) => entry.path);
    const fileCount = entries2.filter((entry) => !entry.isDirectory).length;
    const hasDirectory = entries2.some((entry) => entry.isDirectory);
    try {
      const relativePaths = deletedPaths.map(toRelativePath);
      await remove2({
        paths: relativePaths,
      });
      if (!hasDirectory && fileCount > 0 && gatewayFetch2) {
        showDeleteUndoToast({
          count: fileCount,
          gatewayFetch: gatewayFetch2,
          onUndoSuccess:
            queryClient2 && gatewayScopeKey
              ? () => {
                  void refreshAssetIndex({
                    qc: queryClient2,
                    gatewayScopeKey,
                  });
                }
              : void 0,
          t: t2,
        });
      }
      if (lastSelectedPath && deletedPaths.includes(lastSelectedPath)) {
        setLastSelectedPath(null);
        selectionAnchorRef.current = null;
      }
      const stillSelected = new Set();
      let anyRemoved = false;
      for (const p3 of selectedPaths) {
        if (deletedPaths.includes(p3)) {
          anyRemoved = true;
          continue;
        }
        stillSelected.add(p3);
      }
      if (anyRemoved) setSelectedPaths(stillSelected);
      if (hasDirectory) {
        invalidateDirs();
      }
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.deleteFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
    setDeletingEntries([]);
  });
  return {
    deletingEntries,
    requestDelete,
    cancelDelete,
    handleDeleteConfirm,
  };
}
