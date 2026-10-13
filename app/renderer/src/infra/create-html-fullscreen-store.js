// create-html-fullscreen-store.js
import { createStore$1 as createStore } from "../vendor.js";
function isSamePluginOpenRequest(left, right) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.requestId === right.requestId &&
      left.command === right.command &&
      left.workflow === right.workflow &&
      left.workflowId === right.workflowId &&
      left.target === right.target)
  );
}
export function createHtmlFullscreenStore() {
  return createStore((set) => ({
    nodeId: null,
    containerEl: null,
    containerElByNode: new Map(),
    pluginOpenRequest: null,
    presentation: null,
    returnPresentation: null,
    enter: (nodeId, request, presentation = "fullscreen") =>
      set((state) => {
        const nextRequest = request ?? null;
        if (
          state.nodeId === nodeId &&
          isSamePluginOpenRequest(state.pluginOpenRequest, nextRequest) &&
          state.presentation === presentation
        ) {
          return state;
        }
        const containerEl = state.containerElByNode.get(nodeId) ?? null;
        return {
          nodeId,
          containerEl,
          pluginOpenRequest: nextRequest,
          presentation,
          returnPresentation: null,
        };
      }),
    setPresentation: (nodeId, presentation) =>
      set((state) => {
        if (state.nodeId !== nodeId) return state;
        return {
          presentation,
          returnPresentation:
            presentation === "fullscreen" && state.presentation === "canvas"
              ? "canvas"
              : null,
        };
      }),
    leaveFullscreen: (nodeId) =>
      set((state) => {
        if (state.nodeId !== nodeId || state.presentation !== "fullscreen")
          return state;
        if (state.returnPresentation === "canvas") {
          return {
            presentation: "canvas",
            returnPresentation: null,
          };
        }
        return {
          nodeId: null,
          containerEl: null,
          pluginOpenRequest: null,
          presentation: null,
          returnPresentation: null,
        };
      }),
    exit: (nodeId) =>
      set((state) => {
        if (state.nodeId !== nodeId) return state;
        return {
          nodeId: null,
          containerEl: null,
          pluginOpenRequest: null,
          presentation: null,
          returnPresentation: null,
        };
      }),
    setContainerEl: (nodeId, el) =>
      set((state) => {
        const existing = state.containerElByNode.get(nodeId);
        const isCurrent = state.nodeId === nodeId;
        if (existing === el) {
          if (isCurrent && state.containerEl !== el) {
            return {
              containerEl: el,
            };
          }
          return state;
        }
        const nextRegistry = new Map(state.containerElByNode);
        if (el) {
          nextRegistry.set(nodeId, el);
        } else {
          nextRegistry.delete(nodeId);
        }
        const patch = {
          containerElByNode: nextRegistry,
        };
        if (isCurrent) patch.containerEl = el;
        return patch;
      }),
  }));
}
