// create-canvas-overlay-store.js
import { createStore$1 as createStore } from "../vendor.js";
export function createCanvasOverlayStore() {
  return createStore((set) => ({
    active: null,
    startCrop: (nodeId, meta) =>
      set({
        active: {
          kind: "crop",
          nodeId,
          meta,
        },
      }),
    cancelCrop: () =>
      set((state) =>
        state.active?.kind === "crop"
          ? {
              active: null,
            }
          : state,
      ),
    startOutpaint: (nodeId, meta) =>
      set({
        active: {
          kind: "outpaint",
          nodeId,
          meta,
        },
      }),
    cancelOutpaint: () =>
      set((state) =>
        state.active?.kind === "outpaint"
          ? {
              active: null,
            }
          : state,
      ),
    startErase: (nodeId, meta) =>
      set({
        active: {
          kind: "erase",
          nodeId,
          meta,
        },
      }),
    cancelErase: () =>
      set((state) =>
        state.active?.kind === "erase"
          ? {
              active: null,
            }
          : state,
      ),
    startRedraw: (nodeId, meta) =>
      set({
        active: {
          kind: "redraw",
          nodeId,
          meta,
        },
      }),
    cancelRedraw: () =>
      set((state) =>
        state.active?.kind === "redraw"
          ? {
              active: null,
            }
          : state,
      ),
    startMoveObject: (nodeId, meta) =>
      set({
        active: {
          kind: "move-object",
          nodeId,
          meta,
        },
      }),
    cancelMoveObject: () =>
      set((state) =>
        state.active?.kind === "move-object"
          ? {
              active: null,
            }
          : state,
      ),
    reset: () =>
      set({
        active: null,
      }),
  }));
}
