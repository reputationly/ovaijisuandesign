// select-startup-visible-preview-workspace.js
import { visiblePreviewTabsStore } from "../workspace/create-visible-preview-tabs-store.js";

function nonEmptyOpaqueText$1(value) {
  if (typeof value !== "string") return void 0;
  return value.trim().length > 0 ? value : void 0;
}

function normalizeReference$2(value) {
  if (typeof value === "string") {
    const workspaceId22 = nonEmptyOpaqueText$1(value);
    return workspaceId22
      ? {
          workspaceId: workspaceId22,
        }
      : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value;
  const workspaceId2 = nonEmptyOpaqueText$1(candidate.workspaceId);
  if (!workspaceId2) return null;
  const folderPath = nonEmptyOpaqueText$1(candidate.folderPath);
  return folderPath
    ? {
        workspaceId: workspaceId2,
        folderPath,
      }
    : {
        workspaceId: workspaceId2,
      };
}

function normalizeVisiblePreviewTabReferences(values3) {
  const seenWorkspaceIds = new Set();
  const seenFolderPaths = new Set();
  const result = [];
  for (const value of values3) {
    const reference = normalizeReference$2(value);
    if (!reference || seenWorkspaceIds.has(reference.workspaceId)) continue;
    if (reference.folderPath && seenFolderPaths.has(reference.folderPath))
      continue;
    seenWorkspaceIds.add(reference.workspaceId);
    if (reference.folderPath) seenFolderPaths.add(reference.folderPath);
    result.push(reference);
  }
  return result;
}

function selectStartupVisiblePreviewWorkspace$1(
  snapshot2,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  const restored = normalizeVisiblePreviewTabReferences(
    restoredWorkspaceIds,
  ).map((entry) => entry.workspaceId);
  if (restored.length === 0) return null;
  const restoredSet = new Set(restored);
  if (!snapshot2.initialized) {
    return preferredWorkspaceId && restoredSet.has(preferredWorkspaceId)
      ? preferredWorkspaceId
      : (restored[0] ?? null);
  }
  const visibleRestored = [];
  const seen2 = new Set();
  for (const reference of snapshot2.tabs) {
    const restoredId = restoredSet.has(reference.workspaceId)
      ? reference.workspaceId
      : reference.folderPath && restoredSet.has(reference.folderPath)
        ? reference.folderPath
        : void 0;
    if (!restoredId || seen2.has(restoredId)) continue;
    seen2.add(restoredId);
    visibleRestored.push(restoredId);
  }
  if (preferredWorkspaceId && visibleRestored.includes(preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }
  return visibleRestored[0] ?? null;
}

function selectStartupVisiblePreviewWorkspace(
  snapshot2,
  restoredWorkspaceIds,
  preferredWorkspaceId,
) {
  return selectStartupVisiblePreviewWorkspace$1(
    snapshot2,
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
