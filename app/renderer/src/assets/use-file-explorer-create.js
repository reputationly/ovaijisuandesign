// use-file-explorer-create.js
import { postCheckConflicts } from "./post-check-conflicts.js";
import {
  generateCopyName,
  joinFilePath,
  toRelativeFromRoot,
} from "./use-file-explorer-canvas-integration.js";
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";

async function findFreeRenameCandidate(
  gatewayFetch,
  baseName,
  isDirectory,
  targetDirRel,
) {
  let candidate = generateCopyName(baseName, isDirectory);
  for (let attempt = 0; attempt < 1e3; attempt++) {
    const probe = await postCheckConflicts(gatewayFetch, {
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
  gatewayFetch,
  conflictResolver,
  platformFs,
  refresh,
  invalidateDirs,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const { t: translate } = useTranslation();
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
  const handleCreateConfirm = useStableCallback(async (newEntryName) => {
    if (!creatingEntry) return;
    let confirmedName = newEntryName;
    const targetDirRel =
      rootPath && creatingEntry.parentPath !== rootPath
        ? toRelativeFromRoot(rootPath, creatingEntry.parentPath)
        : "";
    try {
      const probeJson = await postCheckConflicts(gatewayFetch, {
        items: [
          {
            name: newEntryName,
            kind: creatingEntry.isDirectory ? "folder" : "file",
          },
        ],
        targetDir: targetDirRel,
      });
      const first = probeJson.conflicts[0];
      if (first) {
        const result = await conflictResolver.resolve([
          {
            name: newEntryName,
            existingKind: first.existingKind,
          },
        ]);
        if (result.outcome !== "completed" || result.decisions[0] === "skip") {
          setCreatingEntry(null);
          return;
        }
        if (result.decisions[0] === "rename") {
          confirmedName = await findFreeRenameCandidate(
            gatewayFetch,
            newEntryName,
            creatingEntry.isDirectory,
            targetDirRel,
          );
        }
      }
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.createFailed", {
          name: newEntryName,
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
        translate("fileExplorer.createFailed", {
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
