// use-file-explorer-create.js
import { postCheckConflicts } from "./post-check-conflicts.js";
import {
  generateCopyName,
  joinFilePath,
  toRelativeFromRoot,
} from "./use-file-explorer-canvas-integration.js";
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";

async function findFreeRenameCandidate(
  gatewayFetch2,
  baseName,
  isDirectory,
  targetDirRel,
) {
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
  throw new Error(
    `No free rename candidate found for "${baseName}" after 1000 attempts`,
  );
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
