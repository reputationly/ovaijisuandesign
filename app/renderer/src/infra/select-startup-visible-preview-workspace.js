// select-startup-visible-preview-workspace.js
import { visiblePreviewTabsStore } from "../workspace/create-visible-preview-tabs-store.js";
function nonEmptyOpaqueText(value) {
  if (typeof value !== "string") return void 0;
  return value.trim().length > 0 ? value : void 0;
}
function normalizeReference(value) {
  if (typeof value === "string") {
    const workspaceId = nonEmptyOpaqueText(value);
    return workspaceId
      ? {
          workspaceId,
        }
      : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  const workspaceId = nonEmptyOpaqueText(candidate.workspaceId);
  if (!workspaceId) return null;
  const folderPath = nonEmptyOpaqueText(candidate.folderPath);
  return folderPath
    ? {
        workspaceId,
        folderPath,
      }
    : {
        workspaceId,
      };
}
function normalizeVisiblePreviewTabReferences(values) {
  const seenWorkspaceIds = new Set();
  const seenFolderPaths = new Set();
  const result = [];
  for (const value of values) {
    const reference = normalizeReference(value);
    if (!reference || seenWorkspaceIds.has(reference.workspaceId)) continue;
    if (reference.folderPath && seenFolderPaths.has(reference.folderPath))
      continue;
    seenWorkspaceIds.add(reference.workspaceId);
    if (reference.folderPath) seenFolderPaths.add(reference.folderPath);
    result.push(reference);
  }
  return result;
}
function resolveStartupVisiblePreviewWorkspace(
  snapshot,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  const restored = normalizeVisiblePreviewTabReferences(
    restoredWorkspaceIds,
  ).map((entry) => entry.workspaceId);
  if (restored.length === 0) return null;
  const restoredSet = new Set(restored);
  if (!snapshot.initialized) {
    return preferredWorkspaceId && restoredSet.has(preferredWorkspaceId)
      ? preferredWorkspaceId
      : (restored[0] ?? null);
  }
  const visibleRestored = [];
  const seen = new Set();
  for (const reference of snapshot.tabs) {
    const restoredId = restoredSet.has(reference.workspaceId)
      ? reference.workspaceId
      : reference.folderPath && restoredSet.has(reference.folderPath)
        ? reference.folderPath
        : void 0;
    if (!restoredId || seen.has(restoredId)) continue;
    seen.add(restoredId);
    visibleRestored.push(restoredId);
  }
  if (preferredWorkspaceId && visibleRestored.includes(preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }
  return visibleRestored[0] ?? null;
}
function selectStartupVisiblePreviewWorkspace(
  snapshot,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  return resolveStartupVisiblePreviewWorkspace(
    snapshot,
    restoredWorkspaceIds,
    preferredWorkspaceId,
  );
}
export function getStartupVisiblePreviewWorkspace(
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  return selectStartupVisiblePreviewWorkspace(
    visiblePreviewTabsStore.getSnapshot(),
    restoredWorkspaceIds,
    preferredWorkspaceId,
  );
}
