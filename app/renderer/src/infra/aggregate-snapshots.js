// aggregate-snapshots.js
import {
  CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT,
  createState$1,
  getOrCreateState,
  HEAVY_FILE_VIEWER_KINDS,
  statesByWorkspace,
} from "./use-plugin-metadata-store.js";

const CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT = 200;

const CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT = 20;

function getExistingStates() {
  return [...statesByWorkspace.values()];
}

function incrementKindCount(byKind, kind) {
  byKind[kind] = (byKind[kind] ?? 0) + 1;
}

function buildWarnings(input) {
  const warnings = [];
  if (input.canvasNodeCount > CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT) {
    warnings.push({
      code: "canvas_node_count_high",
      actual: input.canvasNodeCount,
      limit: CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT,
    });
  }
  if (
    input.mountedFileViewerCount > CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT
  ) {
    warnings.push({
      code: "mounted_file_viewer_count_high",
      actual: input.mountedFileViewerCount,
      limit: CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT,
    });
  }
  const attemptedHeavyFileViewerCount =
    input.heavyFileViewerCount + input.deniedHeavyViewerCount;
  if (
    attemptedHeavyFileViewerCount > CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT
  ) {
    warnings.push({
      code: "heavy_file_viewer_count_high",
      actual: attemptedHeavyFileViewerCount,
      limit: CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT,
    });
  }
  return warnings;
}

function snapshotFromState(state2) {
  const byKind = {};
  const uniquePaths = new Set();
  let heavyMountedCount = 0;
  let deniedHeavyCount = 0;
  for (const viewer of state2.fileViewers.values()) {
    if (!viewer.admitted) {
      if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) deniedHeavyCount += 1;
      continue;
    }
    incrementKindCount(byKind, viewer.kind);
    uniquePaths.add(viewer.filePath);
    if (HEAVY_FILE_VIEWER_KINDS.has(viewer.kind)) heavyMountedCount += 1;
  }
  const mountedCount = [...state2.fileViewers.values()].filter(
    (viewer) => viewer.admitted,
  ).length;
  const warnings = buildWarnings({
    canvasNodeCount: state2.canvasNodeCount,
    canvasFileNodeCount: state2.canvasFileNodeCount,
    mountedFileViewerCount: mountedCount,
    heavyFileViewerCount: heavyMountedCount,
    deniedHeavyViewerCount: deniedHeavyCount,
  });
  return {
    canvas: {
      nodeCount: state2.canvasNodeCount,
      edgeCount: state2.canvasEdgeCount,
      fileNodeCount: state2.canvasFileNodeCount,
    },
    fileViewers: {
      mountedCount,
      heavyMountedCount,
      deniedHeavyCount,
      uniquePathCount: uniquePaths.size,
      byKind,
    },
    warnings,
    overBudget: warnings.length > 0,
    updatedAtMs: state2.updatedAtMs,
  };
}

function emptySnapshot() {
  return snapshotFromState(createState$1());
}

function aggregateSnapshots(snapshots2) {
  if (snapshots2.length === 0) {
    return {
      ...emptySnapshot(),
      workspaces: {
        count: 0,
        overBudgetCount: 0,
      },
    };
  }
  const byKind = {};
  let nodeCount = 0;
  let edgeCount = 0;
  let fileNodeCount = 0;
  let mountedCount = 0;
  let heavyMountedCount = 0;
  let deniedHeavyCount = 0;
  let uniquePathCount = 0;
  let updatedAtMs = 0;
  let overBudgetCount = 0;
  for (const snapshot2 of snapshots2) {
    nodeCount += snapshot2.canvas.nodeCount;
    edgeCount += snapshot2.canvas.edgeCount;
    fileNodeCount += snapshot2.canvas.fileNodeCount;
    mountedCount += snapshot2.fileViewers.mountedCount;
    heavyMountedCount += snapshot2.fileViewers.heavyMountedCount;
    deniedHeavyCount += snapshot2.fileViewers.deniedHeavyCount;
    uniquePathCount += snapshot2.fileViewers.uniquePathCount;
    updatedAtMs = Math.max(updatedAtMs, snapshot2.updatedAtMs);
    if (snapshot2.overBudget) overBudgetCount += 1;
    for (const [kind, count2] of Object.entries(snapshot2.fileViewers.byKind)) {
      if (!count2) continue;
      const viewerKind = kind;
      byKind[viewerKind] = (byKind[viewerKind] ?? 0) + count2;
    }
  }
  const warnings = buildWarnings({
    canvasNodeCount: nodeCount,
    mountedFileViewerCount: mountedCount,
    heavyFileViewerCount: heavyMountedCount,
    deniedHeavyViewerCount: deniedHeavyCount,
  });
  return {
    canvas: {
      nodeCount,
      edgeCount,
      fileNodeCount,
    },
    fileViewers: {
      mountedCount,
      heavyMountedCount,
      deniedHeavyCount,
      uniquePathCount,
      byKind,
    },
    warnings,
    overBudget: warnings.length > 0 || overBudgetCount > 0,
    updatedAtMs,
    workspaces: {
      count: snapshots2.length,
      overBudgetCount,
    },
  };
}

export function getWorkspaceContentBudgetSnapshot(workspaceId2) {
  if (workspaceId2 !== void 0)
    return snapshotFromState(getOrCreateState(workspaceId2));
  return aggregateSnapshots(getExistingStates().map(snapshotFromState));
}
