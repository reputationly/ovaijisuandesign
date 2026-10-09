// apply-changeset-to-draft.js
import { CanvasNodeType } from "../vendor.js";
import { isPluginNode } from "./canvas-surface-recovery-scheduler.jsx";
import { resolvePlaceholderCardSize } from "../infra/deep-freeze.js";
import {
  FILE_CARD_DEFAULT_SIZE,
  VIDEO_EMPTY_CARD_SIZE,
  isGenerationErrorStatus,
  isIdleEmptyVideoNode,
  parseAspectRatio,
} from "./group-nodes-in-canvas.js";
import { placeWrappedItem } from "./layout-engine.js";
import {
  DEFAULT_NODE_SIZE,
  getNodePosition,
  getNodeSize,
  sizeOf,
} from "./node-tag-rings-canvas.jsx";
import { isInFlightNode } from "./remove-nodes-and-promote-group-mains.js";
export function createParentPlacementPlan(
  node2,
  parentNodes,
  primaryParent,
  children2,
  placedById,
  layerGap,
  siblingGap,
  mode2,
) {
  const size2 = sizeOf(node2, mode2);
  const maxParentRight = Math.max(
    ...parentNodes.map((parent) => getNodePosition(parent, mode2).x + sizeOf(parent, mode2).width),
  );
  const siblings2 = (children2.get(primaryParent.id) ?? [])
    .filter((childId) => childId !== node2.id)
    .map((childId) => placedById.get(childId))
    .filter((child) => Boolean(child));
  const itemWidth = Math.max(size2.width, ...siblings2.map((child) => sizeOf(child, mode2).width));
  const itemHeight = Math.max(
    size2.height,
    ...siblings2.map((child) => sizeOf(child, mode2).height),
  );
  const parentCenterY = getNodePosition(primaryParent, mode2).y;
  const origin = {
    x: maxParentRight + layerGap,
    y: parentCenterY,
  };
  return {
    slotIndex: siblings2.length,
    placeAt: (slotIndex) =>
      placeWrappedItem(slotIndex, origin, itemWidth, itemHeight, siblingGap, layerGap),
  };
}
export class NodeRegistry {
  types = new Map();
  nodeComponents = new Map();
  edgeComponents = new Map();
  version = 0;
  register(definition2, component) {
    this.types.set(definition2.type, definition2);
    this.nodeComponents.set(definition2.type, component);
    this.version++;
  }
  registerEdge(type2, component) {
    this.edgeComponents.set(type2, component);
    this.version++;
  }
  unregister(type2) {
    this.types.delete(type2);
    this.nodeComponents.delete(type2);
    this.version++;
  }
  unregisterEdge(type2) {
    this.edgeComponents.delete(type2);
    this.version++;
  }
  getDefinition(type2) {
    return this.types.get(type2);
  }
  getNodeComponent(type2) {
    return this.nodeComponents.get(type2);
  }
  getEdgeComponent(type2) {
    return this.edgeComponents.get(type2);
  }
  /** Monotonically increasing version for React change detection */
  getVersion() {
    return this.version;
  }
  listTypes(mode2) {
    const all2 = Array.from(this.types.values());
    if (!mode2) return all2;
    return all2.filter((t2) => !t2.supportedModes || t2.supportedModes.includes(mode2));
  }
  /** Get all registered node component types as a Record for @xyflow */
  getNodeComponentMap() {
    return Object.fromEntries(this.nodeComponents);
  }
  /** Get all registered edge component types as a Record for @xyflow */
  getEdgeComponentMap() {
    return Object.fromEntries(this.edgeComponents);
  }
}
export class PluginManager {
  plugins = new Map();
  activePlugins = new Set();
  use(plugin, context) {
    this.plugins.set(plugin.id, plugin);
    if (context) {
      plugin.onActivate?.(context);
      this.activePlugins.add(plugin.id);
    }
  }
  activate(pluginId, context) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || this.activePlugins.has(pluginId)) return;
    plugin.onActivate?.(context);
    this.activePlugins.add(pluginId);
  }
  remove(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    if (this.activePlugins.has(pluginId)) {
      plugin.onDeactivate?.();
      this.activePlugins.delete(pluginId);
    }
    this.plugins.delete(pluginId);
  }
  getPlugin(id2) {
    return this.plugins.get(id2);
  }
  listPlugins() {
    return Array.from(this.plugins.values());
  }
  /** Collect toolbar items from active plugins only */
  getToolbarItems() {
    return this.listActivePlugins().flatMap((p3) => p3.toolbarItems ?? []);
  }
  /** Collect context menu items from active plugins only */
  getContextMenuItems() {
    return this.listActivePlugins().flatMap((p3) => p3.contextMenuItems ?? []);
  }
  listActivePlugins() {
    return Array.from(this.plugins.values()).filter((p3) => this.activePlugins.has(p3.id));
  }
}
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
    if (ids2.length === this.selected.size && ids2.every((id2) => this.selected.has(id2))) {
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
const HIGH_BLAST_DELETE_MIN_NODES = 10;
const HIGH_BLAST_DELETE_REMAINING_RATIO = 0.5;
export function isHighBlastCanvasDeletion(currentNodeCount, incomingNodeCount) {
  return (
    currentNodeCount >= HIGH_BLAST_DELETE_MIN_NODES &&
    incomingNodeCount < currentNodeCount * HIGH_BLAST_DELETE_REMAINING_RATIO
  );
}
export function isHighBlastCanvasElementDeletion(
  currentNodeCount,
  incomingNodeCount,
  currentEdgeCount,
  incomingEdgeCount,
) {
  return (
    isHighBlastCanvasDeletion(currentNodeCount, incomingNodeCount) ||
    isHighBlastCanvasDeletion(currentEdgeCount, incomingEdgeCount)
  );
}
export function deletionAssetId(node2) {
  if (typeof node2.assetId === "string" && node2.assetId.length > 0) return node2.assetId;
  const dataAssetId = node2.data?.assetId;
  return typeof dataAssetId === "string" && dataAssetId.length > 0 ? dataAssetId : void 0;
}
export function fileNodeToRuntimeNode(file, mode2) {
  const data2 = {
    ...(file.data ?? {}),
  };
  if (
    typeof file.assetId === "string" &&
    file.assetId.length > 0 &&
    typeof data2.assetId !== "string"
  ) {
    data2.assetId = file.assetId;
  }
  const node2 = {
    id: file.id,
    type: file.type,
    positions: {
      ...(file.positions ?? {}),
    },
    data: data2,
  };
  if (file.type === CanvasNodeType.Group) {
    const resolved = file.sizes?.[mode2] ?? file.size;
    if (resolved) node2.size = resolved;
    if (file.sizes)
      node2.sizes = {
        ...file.sizes,
      };
  } else if (file.size) {
    node2.size = file.size;
  }
  if (file.parentId !== void 0) node2.parentId = file.parentId;
  if (file.groupId !== void 0) node2.groupId = file.groupId;
  if (Number.isInteger(file.round)) node2.round = file.round;
  if (typeof file.assetId === "string" && file.assetId.length > 0) node2.assetId = file.assetId;
  if (file.isEmpty === true) node2.isEmpty = true;
  if (file.meta) node2.meta = file.meta;
  return node2;
}
export function validIncomingAssetId(assetId) {
  return typeof assetId === "string" && assetId.length > 0 ? assetId : void 0;
}
export function shouldClearAssetIdForServerNode(update2) {
  if (validIncomingAssetId(update2.assetId)) return false;
  return update2.type === CanvasNodeType.Placeholder;
}
export function applyChangesetToDraft(draft, changes, mode2) {
  const removedSet =
    changes.removedNodeIds && changes.removedNodeIds.length > 0
      ? new Set(changes.removedNodeIds)
      : null;
  const updatedById =
    changes.updatedNodes && changes.updatedNodes.length > 0
      ? new Map(changes.updatedNodes.map((n2) => [n2.id, n2]))
      : null;
  const addedRuntime =
    changes.addedNodes && changes.addedNodes.length > 0
      ? changes.addedNodes.map((n2) => fileNodeToRuntimeNode(n2, mode2))
      : null;
  if (!removedSet && !updatedById && !addedRuntime) return;
  const next2 = [];
  for (const node2 of draft.nodes) {
    if (removedSet?.has(node2.id)) continue;
    const updated = updatedById?.get(node2.id);
    if (updated) {
      const updatedPositions = updated.positions ?? {};
      const shouldClearPositions =
        typeof updated.groupId === "string" &&
        updated.groupId.length > 0 &&
        updated.meta?.hidden === true &&
        Object.keys(updatedPositions).length === 0;
      const mergedPositions = shouldClearPositions
        ? {}
        : {
            ...(node2.positions ?? {}),
            ...updatedPositions,
          };
      const merged = {
        ...node2,
        type: updated.type,
        positions: mergedPositions,
      };
      if (updated.data) {
        merged.data = {
          ...node2.data,
          ...updated.data,
        };
      }
      const incomingAssetId = validIncomingAssetId(updated.assetId);
      if (incomingAssetId) {
        merged.assetId = incomingAssetId;
      } else if (shouldClearAssetIdForServerNode(updated)) {
        delete merged.assetId;
        const mergedData = merged.data;
        if (mergedData && typeof mergedData === "object") {
          const nextData = {
            ...mergedData,
          };
          delete nextData.assetId;
          merged.data = nextData;
        }
      }
      if (updated.parentId === void 0) {
        delete merged.parentId;
      } else {
        merged.parentId = updated.parentId;
      }
      if ("groupId" in updated) {
        if (updated.groupId) {
          merged.groupId = updated.groupId;
        } else {
          delete merged.groupId;
        }
      }
      if ("round" in updated) {
        if (Number.isInteger(updated.round)) {
          merged.round = updated.round;
        } else {
          delete merged.round;
        }
      }
      if (updated.type === CanvasNodeType.Group) {
        const resolved = updated.sizes?.[mode2] ?? updated.size;
        if (resolved) merged.size = resolved;
        if (updated.sizes)
          merged.sizes = {
            ...(node2.sizes ?? {}),
            ...updated.sizes,
          };
      } else if (updated.size) {
        merged.size = updated.size;
      }
      next2.push(merged);
      continue;
    }
    next2.push(node2);
  }
  if (addedRuntime) {
    const existingIds = new Set(next2.map((n2) => n2.id));
    for (const added of addedRuntime) {
      if (existingIds.has(added.id)) continue;
      existingIds.add(added.id);
      next2.push(added);
    }
  }
  draft.nodes = next2;
}
export const EMPTY_SUB_IMAGES = Object.freeze([]);
export function applyFillToNode(node2, fill) {
  node2.type = fill.type;
  const filledData = {
    ...fill.data,
  };
  if (
    typeof fill.assetId === "string" &&
    fill.assetId.length > 0 &&
    typeof filledData.assetId !== "string"
  ) {
    filledData.assetId = fill.assetId;
  }
  node2.data = filledData;
  if (fill.size) node2.size = fill.size;
  if (fill.assetId !== void 0) node2.assetId = fill.assetId;
  delete node2.isEmpty;
}
export function isPendingFillHost(node2) {
  return node2.type === CanvasNodeType.Placeholder || isInFlightNode(node2);
}
export function fillStillApplies(node2, fill) {
  if (node2.assetId) return false;
  return !fill.requirePendingHost || isPendingFillHost(node2);
}
export function findFillTarget(nodes, nodeId, fill) {
  const n2 = nodes.find((node2) => node2.id === nodeId);
  return n2 && fillStillApplies(n2, fill) ? n2 : null;
}
const COLLAPSED_GROUP_FLOW_SIZE = {
  width: 1,
  height: 1,
};
function resolvePlaceholderFlowSize(node2, inheritedSize) {
  const data2 = node2.data;
  if (data2?.placeholderDisplaySize) {
    return resolvePlaceholderCardSize(
      data2.status,
      data2.aspectRatio,
      data2.mediaType,
      data2.placeholderDisplaySize,
    );
  }
  const isLoadingPhase =
    data2?.status === "pending" || data2?.status === "generating" || data2?.status === "loading";
  if (
    isLoadingPhase &&
    inheritedSize &&
    data2?.mediaType !== "audio" &&
    !parseAspectRatio(data2?.aspectRatio)
  ) {
    return inheritedSize;
  }
  return resolvePlaceholderCardSize(
    data2?.status,
    data2?.aspectRatio,
    data2?.mediaType,
    data2?.placeholderDisplaySize,
  );
}
export function toFlowNode(node2, mode2, selectedNodeIds, hidden) {
  const selected2 = selectedNodeIds ? selectedNodeIds.has(node2.id) : void 0;
  const rawSize = isIdleEmptyVideoNode(node2) ? VIDEO_EMPTY_CARD_SIZE : getNodeSize(node2, mode2);
  const collapsed = !!node2.meta?.collapsed;
  const isCollapsedGroup = collapsed && node2.type === CanvasNodeType.Group;
  const errorData = node2.data;
  const isAutoSizedVideoError =
    node2.type === CanvasNodeType.Video &&
    isGenerationErrorStatus(errorData?.status) &&
    typeof errorData?.errorMessage === "string" &&
    errorData.errorMessage.length > 0;
  const isCompactFile =
    node2.type === CanvasNodeType.File &&
    !isPluginNode(node2) &&
    node2.data?.viewMode !== "preview";
  const size2 = isAutoSizedVideoError
    ? void 0
    : isCollapsedGroup
      ? COLLAPSED_GROUP_FLOW_SIZE
      : node2.type === CanvasNodeType.Placeholder
        ? resolvePlaceholderFlowSize(node2, rawSize)
        : isCompactFile
          ? FILE_CARD_DEFAULT_SIZE
          : rawSize;
  const position2 = getNodePosition(node2, mode2);
  return {
    id: node2.id,
    type: node2.type,
    position: position2,
    data: node2.data,
    ...(size2
      ? {
          width: size2.width,
          height: size2.height,
        }
      : {}),
    ...(node2.meta?.zIndex !== void 0
      ? {
          zIndex: node2.meta.zIndex,
        }
      : {}),
    // Collapsed groups still allow dragging, but only via the floating chip —
    // the `dragHandle` selector below restricts ReactFlow's d3-drag listener
    // to elements matching `.canvas-group-collapsed-drag-handle` (the label
    // text inside the chip). The wrapper itself shrinks to
    // `COLLAPSED_GROUP_FLOW_SIZE` (1x1) and is `pointer-events: none` in
    // `canvas-overrides.css`, so scoping the handle keeps the drag affordance
    // on the chip rather than on an invisible wrapper box.
    draggable: !node2.meta?.locked,
    // Collapsed groups are excluded from the selection set entirely — see
    // `canvas-overrides.css` for the matching wrapper-level pointer-events
    // rule. Force `selected: false` so any stale selection from before the
    // collapse doesn't bleed through into the toolbar / resize chrome.
    ...(collapsed
      ? {
          selectable: false,
          selected: false,
          className: "canvas-group-collapsed",
          dragHandle: ".canvas-group-collapsed-drag-handle",
        }
      : selected2 !== void 0
        ? {
            selected: selected2,
          }
        : {}),
    ...(node2.parentId
      ? {
          parentId: node2.parentId,
        }
      : {}),
    // `hidden` is omitted unless explicitly true so ReactFlow's diff sees a
    // stable shape for the common (always-visible) case. Set by callers when
    // the node's parent group is collapsed.
    ...(hidden
      ? {
          hidden: true,
        }
      : {}),
  };
}
