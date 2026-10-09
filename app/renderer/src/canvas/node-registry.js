// node-registry.js
import { CanvasNodeType } from "../vendor.js";
import { isInFlightNode } from "./remove-nodes-and-promote-group-mains.js";
import { resolvePlaceholderCardSize } from "../infra/shallow-copy.js";
import { parseAspectRatio } from "./compute-group-bounds-from-children.js";

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
    return all2.filter(
      (t2) => !t2.supportedModes || t2.supportedModes.includes(mode2),
    );
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
    return Array.from(this.plugins.values()).filter((p3) =>
      this.activePlugins.has(p3.id),
    );
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
  if (typeof node2.assetId === "string" && node2.assetId.length > 0)
    return node2.assetId;
  const dataAssetId = node2.data?.assetId;
  return typeof dataAssetId === "string" && dataAssetId.length > 0
    ? dataAssetId
    : void 0;
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
  if (typeof file.assetId === "string" && file.assetId.length > 0)
    node2.assetId = file.assetId;
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

export function resolvePlaceholderFlowSize(node2, inheritedSize) {
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
    data2?.status === "pending" ||
    data2?.status === "generating" ||
    data2?.status === "loading";
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
