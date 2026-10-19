import { createState as createState$1 } from "../infra/use-plugin-metadata-store.js";
export const CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT = 200;
export const CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT = 20;
export const CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT = 20;
export const HEAVY_FILE_VIEWER_KINDS = new Set(["pdf", "code", "docx", "zip", "html"]);
export function incrementKindCount(byKind, kind2) {
  byKind[kind2] = (byKind[kind2] ?? 0) + 1;
}
export function buildWarnings(input) {
  const warnings = [];
  if (input.canvasNodeCount > CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT) {
    warnings.push({
      code: "canvas_node_count_high",
      actual: input.canvasNodeCount,
      limit: CONTENT_BUDGET_CANVAS_NODE_WARN_COUNT
    });
  }
  if (input.mountedFileViewerCount > CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT) {
    warnings.push({
      code: "mounted_file_viewer_count_high",
      actual: input.mountedFileViewerCount,
      limit: CONTENT_BUDGET_MOUNTED_FILE_VIEWER_WARN_COUNT
    });
  }
  const attemptedHeavyFileViewerCount = input.heavyFileViewerCount + input.deniedHeavyViewerCount;
  if (attemptedHeavyFileViewerCount > CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT) {
    warnings.push({
      code: "heavy_file_viewer_count_high",
      actual: attemptedHeavyFileViewerCount,
      limit: CONTENT_BUDGET_HEAVY_FILE_VIEWER_WARN_COUNT
    });
  }
  return warnings;
}
export function snapshotFromState(state2) {
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
  const mountedCount = [...state2.fileViewers.values()].filter(viewer => viewer.admitted).length;
  const warnings = buildWarnings({
    canvasNodeCount: state2.canvasNodeCount,
    canvasFileNodeCount: state2.canvasFileNodeCount,
    mountedFileViewerCount: mountedCount,
    heavyFileViewerCount: heavyMountedCount,
    deniedHeavyViewerCount: deniedHeavyCount
  });
  return {
    canvas: {
      nodeCount: state2.canvasNodeCount,
      edgeCount: state2.canvasEdgeCount,
      fileNodeCount: state2.canvasFileNodeCount
    },
    fileViewers: {
      mountedCount,
      heavyMountedCount,
      deniedHeavyCount,
      uniquePathCount: uniquePaths.size,
      byKind
    },
    warnings,
    overBudget: warnings.length > 0,
    updatedAtMs: state2.updatedAtMs
  };
}
export function emptySnapshot() {
  return snapshotFromState(createState$1());
}