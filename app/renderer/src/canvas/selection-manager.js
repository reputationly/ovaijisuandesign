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
  select(id2, additive = false) {
    if (!additive) this.selected.clear();
    this.selected.add(id2);
    this.notify();
  }
  deselect(id2) {
    this.selected.delete(id2);
    this.notify();
  }
  toggle(id2) {
    if (this.selected.has(id2)) {
      this.selected.delete(id2);
    } else {
      this.selected.add(id2);
    }
    this.notify();
  }
  set(ids2) {
    if (
      ids2.length === this.selected.size &&
      ids2.every((id2) => this.selected.has(id2))
    ) {
      return;
    }
    this.selected.clear();
    for (const id2 of ids2) this.selected.add(id2);
    this.notify();
  }
  clear() {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this.notify();
  }
  selectAll(nodeIds) {
    this.selected.clear();
    for (const id2 of nodeIds) this.selected.add(id2);
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
  isSelected(id2) {
    return this.selected.has(id2);
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
