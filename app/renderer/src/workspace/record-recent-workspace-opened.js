// record-recent-workspace-opened.js
import {
  retainCompleteWorkspaceCatalog,
  sortRecentWorkspacesByStableOrder,
} from "./asset-lineage-query-key.js";
import { truncateProjectName } from "../generation/normalize-skill-detail-metadata.js";
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";

function recordRecentWorkspaceOpened(
  workspaces,
  workspacePath,
  openedAt,
  options = {},
) {
  const pathsEqual = options.pathsEqual ?? ((left, right) => left === right);
  const matchesOpenedWorkspace = (path2) =>
    pathsEqual(path2, workspacePath) ||
    (options.previousWorkspacePath !== void 0 &&
      pathsEqual(path2, options.previousWorkspacePath));
  const ordered = sortRecentWorkspacesByStableOrder(workspaces);
  const deduped = [];
  let matchedOpenedWorkspaceIndex;
  const seenPaths = new Set();
  for (const workspace of ordered) {
    if (matchesOpenedWorkspace(workspace.path)) {
      if (matchedOpenedWorkspaceIndex !== void 0) {
        const retained = deduped[matchedOpenedWorkspaceIndex];
        if (retained) {
          deduped[matchedOpenedWorkspaceIndex] = {
            ...retained,
            ...(retained.displayName === void 0 &&
            workspace.displayName !== void 0
              ? {
                  displayName: workspace.displayName,
                }
              : {}),
            ...(retained.coverImage === void 0 &&
            workspace.coverImage !== void 0
              ? {
                  coverImage: workspace.coverImage,
                }
              : {}),
          };
        }
        continue;
      }
      matchedOpenedWorkspaceIndex = deduped.length;
    } else {
      if (seenPaths.has(workspace.path)) continue;
      seenPaths.add(workspace.path);
    }
    deduped.push(workspace);
  }
  const existingIndex = deduped.findIndex((workspace) =>
    matchesOpenedWorkspace(workspace.path),
  );
  if (existingIndex === -1) {
    deduped.unshift({
      path: workspacePath,
      openedAt,
    });
  } else {
    const existing = deduped[existingIndex];
    if (existing)
      deduped[existingIndex] = {
        ...existing,
        path: workspacePath,
        openedAt,
      };
  }
  return deduped.map((workspace, manualOrder) => ({
    ...workspace,
    manualOrder,
  }));
}

export function applyWorkspaceDisplayNameRename(
  workspaces,
  workspacePath,
  newName,
  openedAt = Date.now(),
) {
  const folderName = folderNameFromPath(workspacePath);
  const trimmed = truncateProjectName(newName);
  const displayName2 = !trimmed || trimmed === folderName ? void 0 : trimmed;
  let matched = false;
  const renamed = workspaces.map((workspace) => {
    if (workspace.path !== workspacePath) return workspace;
    matched = true;
    if (displayName2)
      return {
        ...workspace,
        displayName: displayName2,
      };
    const { displayName: _displayName, ...rest } = workspace;
    return rest;
  });
  if (matched) return renamed;
  const inserted = recordRecentWorkspaceOpened(
    workspaces,
    workspacePath,
    openedAt,
  ).map((workspace) =>
    workspace.path === workspacePath && displayName2
      ? {
          ...workspace,
          displayName: displayName2,
        }
      : workspace,
  );
  return retainCompleteWorkspaceCatalog(inserted);
}
