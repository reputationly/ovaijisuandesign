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
  select(id, additive = false) {
    if (!additive) this.selected.clear();
    this.selected.add(id);
    this.notify();
  }
  deselect(id) {
    this.selected.delete(id);
    this.notify();
  }
  toggle(id) {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }
    this.notify();
  }
  set(ids) {
    if (
      ids.length === this.selected.size &&
      ids.every((id) => this.selected.has(id))
    ) {
      return;
    }
    this.selected.clear();
    for (const id of ids) this.selected.add(id);
    this.notify();
  }
  clear() {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this.notify();
  }
  selectAll(nodeIds) {
    this.selected.clear();
    for (const id of nodeIds) this.selected.add(id);
    this.notify();
  }
  selectByRect(rect, nodes, mode, additive = false) {
    if (!additive) this.selected.clear();
    for (const node of nodes) {
      const size = getNodeSize(node, mode) ?? DEFAULT_NODE_SIZE;
      const pos = getNodePosition(node, mode);
      if (
        pos.x + size.width > rect.x &&
        pos.x < rect.x + rect.w &&
        pos.y + size.height > rect.y &&
        pos.y < rect.y + rect.h
      ) {
        this.selected.add(node.id);
      }
    }
    this.notify();
  }
  getSelected() {
    return Array.from(this.selected);
  }
  isSelected(id) {
    return this.selected.has(id);
  }
  count() {
    return this.selected.size;
  }
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    const ids = this.getSelected();
    this.eventBus?.emit({
      type: "node:selected",
      nodeIds: ids,
    });
    for (const listener of this.listeners) listener(ids);
  }
}
