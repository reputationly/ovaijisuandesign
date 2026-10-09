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
  return createStore((set2) => ({
    nodeId: null,
    containerEl: null,
    containerElByNode: new Map(),
    pluginOpenRequest: null,
    presentation: null,
    returnPresentation: null,
    enter: (nodeId, request, presentation = "fullscreen") =>
      set2((state2) => {
        const nextRequest = request ?? null;
        if (
          state2.nodeId === nodeId &&
          isSamePluginOpenRequest(state2.pluginOpenRequest, nextRequest) &&
          state2.presentation === presentation
        ) {
          return state2;
        }
        const containerEl = state2.containerElByNode.get(nodeId) ?? null;
        return {
          nodeId,
          containerEl,
          pluginOpenRequest: nextRequest,
          presentation,
          returnPresentation: null,
        };
      }),
    setPresentation: (nodeId, presentation) =>
      set2((state2) => {
        if (state2.nodeId !== nodeId) return state2;
        return {
          presentation,
          returnPresentation:
            presentation === "fullscreen" && state2.presentation === "canvas"
              ? "canvas"
              : null,
        };
      }),
    leaveFullscreen: (nodeId) =>
      set2((state2) => {
        if (state2.nodeId !== nodeId || state2.presentation !== "fullscreen")
          return state2;
        if (state2.returnPresentation === "canvas") {
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
      set2((state2) => {
        if (state2.nodeId !== nodeId) return state2;
        return {
          nodeId: null,
          containerEl: null,
          pluginOpenRequest: null,
          presentation: null,
          returnPresentation: null,
        };
      }),
    setContainerEl: (nodeId, el) =>
      set2((state2) => {
        const existing = state2.containerElByNode.get(nodeId);
        const isCurrent = state2.nodeId === nodeId;
        if (existing === el) {
          if (isCurrent && state2.containerEl !== el) {
            return {
              containerEl: el,
            };
          }
          return state2;
        }
        const nextRegistry = new Map(state2.containerElByNode);
        if (el) {
          nextRegistry.set(nodeId, el);
        } else {
          nextRegistry.delete(nodeId);
        }
        const patch2 = {
          containerElByNode: nextRegistry,
        };
        if (isCurrent) patch2.containerEl = el;
        return patch2;
      }),
  }));
}
