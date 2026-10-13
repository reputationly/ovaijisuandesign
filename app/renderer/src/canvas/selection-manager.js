// selection-manager.js
import {
  DEFAULT_NODE_SIZE,
  getNodePosition,
  getNodeSize,
} from "./use-active-mode.js";

export class SelectionManager {
  selected = new Set();
  listeners = new Set();
  eventBus = null;
  /** Bind to an event bus to emit node:selected events */
  bindEventBus(eventBus) {
    this.eventBus = eventBus;
  }
  select(nodeId, additive = false) {
    if (!additive) this.selected.clear();
    this.selected.add(nodeId);
    this.notify();
  }
  deselect(nodeId) {
    this.selected.delete(nodeId);
    this.notify();
  }
  toggle(nodeId) {
    if (this.selected.has(nodeId)) {
      this.selected.delete(nodeId);
    } else {
      this.selected.add(nodeId);
    }
    this.notify();
  }
  set(ids2) {
    if (
      ids2.length === this.selected.size &&
      ids2.every((nodeId) => this.selected.has(nodeId))
    ) {
      return;
    }
    this.selected.clear();
    for (const nodeId of ids2) this.selected.add(nodeId);
    this.notify();
  }
  clear() {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this.notify();
  }
  selectAll(nodeIds) {
    this.selected.clear();
    for (const nodeId of nodeIds) this.selected.add(nodeId);
    this.notify();
  }
  selectByRect(rect, nodes, mode2, additive = false) {
    if (!additive) this.selected.clear();
    for (const node2 of nodes) {
      const size2 = getNodeSize(node2, mode2) ?? DEFAULT_NODE_SIZE;
      const pos = getNodePosition(node2, mode2);
      if (
        pos.x + size2.width > rect.x &&
        pos.x < rect.x + rect.w &&
        pos.y + size2.height > rect.y &&
        pos.y < rect.y + rect.h
      ) {
        this.selected.add(node2.id);
      }
    }
    this.notify();
  }
  getSelected() {
    return Array.from(this.selected);
  }
  isSelected(nodeId) {
    return this.selected.has(nodeId);
  }
  count() {
    return this.selected.size;
  }
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    const ids2 = this.getSelected();
    this.eventBus?.emit({
      type: "node:selected",
      nodeIds: ids2,
    });
    for (const listener of this.listeners) listener(ids2);
  }
}
