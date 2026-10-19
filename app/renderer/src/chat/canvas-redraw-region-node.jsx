import { Node as Node$1, mergeAttributes } from "@tiptap/core";
export const CanvasRedrawRegionNode = Node$1.create({
  name: "canvasRedrawRegion",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      x1: {
        default: 0,
      },
      y1: {
        default: 0,
      },
      x2: {
        default: 999,
      },
      y2: {
        default: 999,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-canvas-redraw-region]",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { x1, y1, x2, y2: y22 } = HTMLAttributes;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-canvas-redraw-region": "",
        "aria-label": `选区 ${x1},${y1} - ${x2},${y22}`,
        contenteditable: "false",
        class: "canvas-redraw-region-chip",
      }),
      `选区 ${x1},${y1} - ${x2},${y22}`,
    ];
  },
});
