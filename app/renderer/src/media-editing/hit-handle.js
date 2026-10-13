// hit-handle.js
import { Tool, uid } from "./keep-tag-in-canvas.js";
export const HANDLE_SIZE = 8;
export function hitHandle(pointer, bounds, uiScale = 1) {
  const half = uiScale > 0 ? HANDLE_SIZE / uiScale : HANDLE_SIZE;
  const corners = [
    {
      c: "nw",
      x: bounds.x,
      y: bounds.y,
    },
    {
      c: "ne",
      x: bounds.x + bounds.width,
      y: bounds.y,
    },
    {
      c: "sw",
      x: bounds.x,
      y: bounds.y + bounds.height,
    },
    {
      c: "se",
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    },
  ];
  for (const { c: corner, x: cornerX, y: cornerY } of corners) {
    if (Math.abs(pointer.x - cornerX) <= half && Math.abs(pointer.y - cornerY) <= half) return corner;
  }
  return null;
}
export function cornerCursor(corner) {
  return corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
}
export class TextTool extends Tool {
  cursor = "text";
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    this.editor.openTextEditor(pointerEvent.point);
  }
}
export function buildTextShapeData(point, text, style) {
  return {
    id: uid("text"),
    type: "text",
    x: point.x,
    y: point.y,
    text,
    width: 0,
    height: 0,
    style: {
      ...style,
    },
  };
}
export class EventBus {
  listeners = new Map();
  on(type, handler) {
    let handlerSet = this.listeners.get(type);
    if (!handlerSet) {
      handlerSet = new Set();
      this.listeners.set(type, handlerSet);
    }
    handlerSet.add(handler);
    return () => this.off(type, handler);
  }
  off(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }
  emit(type, payload) {
    const handlerSet = this.listeners.get(type);
    if (!handlerSet) return;
    for (const handler of Array.from(handlerSet)) {
      try {
        handler(payload);
      } catch (error) {
        console.error("[EventBus] handler error", error);
      }
    }
  }
  clear() {
    this.listeners.clear();
  }
}
