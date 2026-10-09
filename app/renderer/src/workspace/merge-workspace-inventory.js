// merge-workspace-inventory.js
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";
import {
  sortRecentWorkspaces,
  workspaceInventoryPathKey,
} from "./normalize-project-entries.js";

function syntheticWorkspace(entry, openedAt) {
  const projectName = entry.projectName.trim();
  const folderName = folderNameFromPath(entry.folderPath);
  return {
    path: entry.folderPath,
    openedAt,
    ...(projectName && projectName !== folderName
      ? {
          displayName: projectName,
        }
      : {}),
  };
}

export function mergeWorkspaceInventory(
  recentWorkspaces,
  authoritativeEntries,
  options,
) {
  const entryByPath = new Map();
  const dedupedEntries = [];
  const seenEntryIds = new Set();
  const dismissedAtByPath = new Map();
  for (const dismissal of options.dismissals ?? []) {
    for (const path2 of dismissal.paths) {
      const key2 = workspaceInventoryPathKey(path2, options.caseInsensitive);
      dismissedAtByPath.set(
        key2,
        Math.max(
          dismissedAtByPath.get(key2) ?? Number.NEGATIVE_INFINITY,
          dismissal.recentOpenedAt,
        ),
      );
    }
  }
  const dismissedAtForPaths = (...paths) => {
    let dismissedAt;
    for (const path2 of paths) {
      if (!path2) continue;
      const value = dismissedAtByPath.get(
        workspaceInventoryPathKey(path2, options.caseInsensitive),
      );
      if (value !== void 0) dismissedAt = Math.max(dismissedAt ?? value, value);
    }
    return dismissedAt;
  };
  for (const entry of authoritativeEntries) {
    const folderKey = workspaceInventoryPathKey(
      entry.folderPath,
      options.caseInsensitive,
    );
    const workspaceIdKey = workspaceInventoryPathKey(
      entry.workspaceId,
      options.caseInsensitive,
    );
    if (
      seenEntryIds.has(entry.workspaceId) ||
      entryByPath.has(folderKey) ||
      entryByPath.has(workspaceIdKey)
    ) {
      continue;
    }
    seenEntryIds.add(entry.workspaceId);
    entryByPath.set(folderKey, entry);
    entryByPath.set(workspaceIdKey, entry);
    dedupedEntries.push(entry);
  }
  const consumedEntryIds = new Set();
  const seenRecentPaths = new Set();
  const inventory = [];
  for (const recent of recentWorkspaces) {
    const recentKey = workspaceInventoryPathKey(
      recent.path,
      options.caseInsensitive,
    );
    if (seenRecentPaths.has(recentKey)) continue;
    seenRecentPaths.add(recentKey);
    const authoritativeEntry = entryByPath.get(recentKey);
    const dismissedAt = dismissedAtForPaths(
      recent.path,
      authoritativeEntry?.folderPath,
      authoritativeEntry?.workspaceId,
    );
    if (dismissedAt !== void 0 && dismissedAt >= recent.openedAt) continue;
    if (
      authoritativeEntry &&
      consumedEntryIds.has(authoritativeEntry.workspaceId)
    )
      continue;
    if (authoritativeEntry) {
      consumedEntryIds.add(authoritativeEntry.workspaceId);
      inventory.push({
        workspace: {
          ...recent,
          path: authoritativeEntry.folderPath,
        },
        authoritativeEntry,
        recentPath: recent.path,
      });
      continue;
    }
    inventory.push({
      workspace: recent,
      recentPath: recent.path,
    });
  }
  for (const entry of dedupedEntries) {
    if (consumedEntryIds.has(entry.workspaceId)) continue;
    consumedEntryIds.add(entry.workspaceId);
    if (dismissedAtForPaths(entry.folderPath, entry.workspaceId) !== void 0)
      continue;
    const syntheticOpenedAt =
      options.syntheticOpenedAtForEntry?.(entry) ??
      options.syntheticOpenedAt ??
      Date.now();
    inventory.push({
      workspace: syntheticWorkspace(entry, syntheticOpenedAt),
      authoritativeEntry: entry,
    });
  }
  const sortedWorkspaces = sortRecentWorkspaces(
    inventory.map((item) => item.workspace),
    options.sortMode,
  );
  const itemByWorkspace = new Map(
    inventory.map((item) => [item.workspace, item]),
  );
  return sortedWorkspaces.flatMap((workspace) => {
    const item = itemByWorkspace.get(workspace);
    return item ? [item] : [];
  });
}
