// dispatch-canvas-locate.js
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";

export function dispatchCanvasLocate(path2, workspaceId2) {
  if (!path2 || !workspaceId2) return;
  workspaceEvents.fireLocateCanvasFile(workspaceId2, path2);
}
