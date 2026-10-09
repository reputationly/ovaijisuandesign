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
      set2((s2) =>
        s2.active?.kind === "crop"
          ? {
              active: null,
            }
          : s2,
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
      set2((s2) =>
        s2.active?.kind === "outpaint"
          ? {
              active: null,
            }
          : s2,
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
      set2((s2) =>
        s2.active?.kind === "erase"
          ? {
              active: null,
            }
          : s2,
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
      set2((s2) =>
        s2.active?.kind === "redraw"
          ? {
              active: null,
            }
          : s2,
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
      set2((s2) =>
        s2.active?.kind === "move-object"
          ? {
              active: null,
            }
          : s2,
      ),
    reset: () =>
      set2({
        active: null,
      }),
  }));
}
