export const entriesByWorkspace = new Map();

export function discardWorkspaceCanvasPersistence(workspaceId) {
  const entries2 = entriesByWorkspace.get(workspaceId);
  entriesByWorkspace.delete(workspaceId);
  for (const entry of entries2?.values() ?? []) entry.controller?.discardPending?.();
}
