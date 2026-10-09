// hit-handle.js
import { Tool, uid } from "./keep-tag-in-canvas.js";
export const HANDLE_SIZE = 8;
export function hitHandle(p3, b3, uiScale = 1) {
  const half = uiScale > 0 ? HANDLE_SIZE / uiScale : HANDLE_SIZE;
  const corners = [
    {
      c: "nw",
      x: b3.x,
      y: b3.y,
    },
    {
      c: "ne",
      x: b3.x + b3.width,
      y: b3.y,
    },
    {
      c: "sw",
      x: b3.x,
      y: b3.y + b3.height,
    },
    {
      c: "se",
      x: b3.x + b3.width,
      y: b3.y + b3.height,
    },
  ];
  for (const { c: c3, x: x2, y: y4 } of corners) {
    if (Math.abs(p3.x - x2) <= half && Math.abs(p3.y - y4) <= half) return c3;
  }
  return null;
}
export function cornerCursor(c3) {
  return c3 === "nw" || c3 === "se" ? "nwse-resize" : "nesw-resize";
}
export class TextTool extends Tool {
  cursor = "text";
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    this.editor.openTextEditor(e2.point);
  }
}
export function buildTextShapeData(point2, text2, style2) {
  return {
    id: uid("text"),
    type: "text",
    x: point2.x,
    y: point2.y,
    text: text2,
    width: 0,
    height: 0,
    style: {
      ...style2,
    },
  };
}
export class EventBus {
  listeners = new Map();
  on(type2, handler) {
    let set2 = this.listeners.get(type2);
    if (!set2) {
      set2 = new Set();
      this.listeners.set(type2, set2);
    }
    set2.add(handler);
    return () => this.off(type2, handler);
  }
  off(type2, handler) {
    this.listeners.get(type2)?.delete(handler);
  }
  emit(type2, payload) {
    const set2 = this.listeners.get(type2);
    if (!set2) return;
    for (const h2 of Array.from(set2)) {
      try {
        h2(payload);
      } catch (e2) {
        console.error("[EventBus] handler error", e2);
      }
    }
  }
  clear() {
    this.listeners.clear();
  }
}
