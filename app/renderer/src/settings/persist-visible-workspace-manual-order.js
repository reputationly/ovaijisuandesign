// persist-visible-workspace-manual-order.js
import { reactExports } from "../vendor.js";
import {
  retainCompleteWorkspaceCatalog,
  SettingsDialogCtx,
} from "../workspace/asset-lineage-query-key.js";
import { workspaceInventoryPathKey } from "../workspace/normalize-project-entries.js";

export function useSettingsDialog() {
  const ctx = reactExports.useContext(SettingsDialogCtx);
  if (!ctx)
    throw new Error(
      "useSettingsDialog must be used within SettingsDialogProvider",
    );
  return ctx;
}

export function useOptionalSettingsDialog() {
  return reactExports.useContext(SettingsDialogCtx);
}

export function reorderVisibleRecentWorkspaces(
  visibleWorkspaces,
  activePath,
  overPath,
  dropPosition,
) {
  const ordered = [...visibleWorkspaces];
  const fromIndex = ordered.findIndex(
    (workspace) => workspace.path === activePath,
  );
  const toIndex = ordered.findIndex((workspace) => workspace.path === overPath);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
    return ordered;
  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return ordered;
  if (dropPosition) {
    const targetIndex = ordered.findIndex(
      (workspace) => workspace.path === overPath,
    );
    const insertionIndex = targetIndex + (dropPosition === "after" ? 1 : 0);
    ordered.splice(insertionIndex, 0, moved);
  } else {
    ordered.splice(toIndex, 0, moved);
  }
  return ordered.map((workspace, index2) => ({
    ...workspace,
    manualOrder: index2,
  }));
}

export function persistVisibleWorkspaceManualOrder(
  latestInventory,
  reorderedVisibleWorkspaces,
  caseInsensitive,
) {
  const latestByPath = new Map(
    latestInventory.map((item) => [
      workspaceInventoryPathKey(item.workspace.path, caseInsensitive),
      item.workspace,
    ]),
  );
  const orderedKeys = [];
  const seen2 = new Set();
  for (const workspace of reorderedVisibleWorkspaces) {
    const key2 = workspaceInventoryPathKey(workspace.path, caseInsensitive);
    if (seen2.has(key2) || !latestByPath.has(key2)) continue;
    seen2.add(key2);
    orderedKeys.push(key2);
  }
  const unranked = latestInventory.flatMap((item) => {
    const key2 = workspaceInventoryPathKey(
      item.workspace.path,
      caseInsensitive,
    );
    if (seen2.has(key2)) return [];
    const { manualOrder: _manualOrder, ...workspace } = item.workspace;
    return [workspace];
  });
  const ranked = orderedKeys.flatMap((key2, manualOrder) => {
    const workspace = latestByPath.get(key2);
    return workspace
      ? [
          {
            ...workspace,
            manualOrder,
          },
        ]
      : [];
  });
  return retainCompleteWorkspaceCatalog([...unranked, ...ranked]);
}
