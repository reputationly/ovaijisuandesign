// create-canvas-overlay-store.js
import { createStore$1 as createStore } from "../vendor.js";
export function createCanvasOverlayStore() {
  return createStore((set2) => ({
    active: null,
    startCrop: (nodeId, meta2) =>
      set2({
        active: {
          kind: "crop",
          nodeId,
          meta: meta2,
        },
      }),
    cancelCrop: () =>
      set2((state) =>
        state.active?.kind === "crop"
          ? {
              active: null,
            }
          : state,
      ),
    startOutpaint: (nodeId, meta2) =>
      set2({
        active: {
          kind: "outpaint",
          nodeId,
          meta: meta2,
        },
      }),
    cancelOutpaint: () =>
      set2((state) =>
        state.active?.kind === "outpaint"
          ? {
              active: null,
            }
          : state,
      ),
    startErase: (nodeId, meta2) =>
      set2({
        active: {
          kind: "erase",
          nodeId,
          meta: meta2,
        },
      }),
    cancelErase: () =>
      set2((state) =>
        state.active?.kind === "erase"
          ? {
              active: null,
            }
          : state,
      ),
    startRedraw: (nodeId, meta2) =>
      set2({
        active: {
          kind: "redraw",
          nodeId,
          meta: meta2,
        },
      }),
    cancelRedraw: () =>
      set2((state) =>
        state.active?.kind === "redraw"
          ? {
              active: null,
            }
          : state,
      ),
    startMoveObject: (nodeId, meta2) =>
      set2({
        active: {
          kind: "move-object",
          nodeId,
          meta: meta2,
        },
      }),
    cancelMoveObject: () =>
      set2((state) =>
        state.active?.kind === "move-object"
          ? {
              active: null,
            }
          : state,
      ),
    reset: () =>
      set2({
        active: null,
      }),
  }));
}
