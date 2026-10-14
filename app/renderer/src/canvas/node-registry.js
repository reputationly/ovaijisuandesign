// node-registry.js
import { CanvasNodeType } from "./canvas-geometry.js";
import { isInFlightNode } from "./remove-nodes-and-promote-group-mains.js";
import { resolvePlaceholderCardSize } from "./placeholder-card-size.js";
import { parseAspectRatio } from "./compute-group-bounds-from-children.js";

export class NodeRegistry {
  types = new Map();
  nodeComponents = new Map();
  edgeComponents = new Map();
  version = 0;
  register(definition, component) {
    this.types.set(definition.type, definition);
    this.nodeComponents.set(definition.type, component);
    this.version++;
  }
  registerEdge(type, component) {
    this.edgeComponents.set(type, component);
    this.version++;
  }
  unregister(type) {
    this.types.delete(type);
    this.nodeComponents.delete(type);
    this.version++;
  }
  unregisterEdge(type) {
    this.edgeComponents.delete(type);
    this.version++;
  }
  getDefinition(type) {
    return this.types.get(type);
  }
  getNodeComponent(type) {
    return this.nodeComponents.get(type);
  }
  getEdgeComponent(type) {
    return this.edgeComponents.get(type);
  }
  /** Monotonically increasing version for React change detection */
  getVersion() {
    return this.version;
  }
  listTypes(mode) {
    const all = Array.from(this.types.values());
    if (!mode) return all;
    return all.filter(
      (definition) => !definition.supportedModes || definition.supportedModes.includes(mode),
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
  getPlugin(id) {
    return this.plugins.get(id);
  }
  listPlugins() {
    return Array.from(this.plugins.values());
  }
  /** Collect toolbar items from active plugins only */
  getToolbarItems() {
    return this.listActivePlugins().flatMap((plugin) => plugin.toolbarItems ?? []);
  }
  /** Collect context menu items from active plugins only */
  getContextMenuItems() {
    return this.listActivePlugins().flatMap((plugin) => plugin.contextMenuItems ?? []);
  }
  listActivePlugins() {
    return Array.from(this.plugins.values()).filter((plugin) =>
      this.activePlugins.has(plugin.id),
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

export function deletionAssetId(node) {
  if (typeof node.assetId === "string" && node.assetId.length > 0)
    return node.assetId;
  const dataAssetId = node.data?.assetId;
  return typeof dataAssetId === "string" && dataAssetId.length > 0
    ? dataAssetId
    : void 0;
}

export function fileNodeToRuntimeNode(file, mode) {
  const data = {
    ...(file.data ?? {}),
  };
  if (
    typeof file.assetId === "string" &&
    file.assetId.length > 0 &&
    typeof data.assetId !== "string"
  ) {
    data.assetId = file.assetId;
  }
  const node = {
    id: file.id,
    type: file.type,
    positions: {
      ...(file.positions ?? {}),
    },
    data,
  };
  if (file.type === CanvasNodeType.Group) {
    const resolved = file.sizes?.[mode] ?? file.size;
    if (resolved) node.size = resolved;
    if (file.sizes)
      node.sizes = {
        ...file.sizes,
      };
  } else if (file.size) {
    node.size = file.size;
  }
  if (file.parentId !== void 0) node.parentId = file.parentId;
  if (file.groupId !== void 0) node.groupId = file.groupId;
  if (Number.isInteger(file.round)) node.round = file.round;
  if (typeof file.assetId === "string" && file.assetId.length > 0)
    node.assetId = file.assetId;
  if (file.isEmpty === true) node.isEmpty = true;
  if (file.meta) node.meta = file.meta;
  return node;
}

export function validIncomingAssetId(assetId) {
  return typeof assetId === "string" && assetId.length > 0 ? assetId : void 0;
}

export function shouldClearAssetIdForServerNode(update) {
  if (validIncomingAssetId(update.assetId)) return false;
  return update.type === CanvasNodeType.Placeholder;
}

export const EMPTY_SUB_IMAGES = Object.freeze([]);

export function applyFillToNode(node, fill) {
  node.type = fill.type;
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
  node.data = filledData;
  if (fill.size) node.size = fill.size;
  if (fill.assetId !== void 0) node.assetId = fill.assetId;
  delete node.isEmpty;
}

export function isPendingFillHost(node) {
  return node.type === CanvasNodeType.Placeholder || isInFlightNode(node);
}

export function fillStillApplies(node, fill) {
  if (node.assetId) return false;
  return !fill.requirePendingHost || isPendingFillHost(node);
}

export function findFillTarget(nodes, nodeId, fill) {
  const targetNode = nodes.find((node) => node.id === nodeId);
  return targetNode && fillStillApplies(targetNode, fill) ? targetNode : null;
}

export function resolvePlaceholderFlowSize(node, inheritedSize) {
  const data = node.data;
  if (data?.placeholderDisplaySize) {
    return resolvePlaceholderCardSize(
      data.status,
      data.aspectRatio,
      data.mediaType,
      data.placeholderDisplaySize,
    );
  }
  const isLoadingPhase =
    data?.status === "pending" ||
    data?.status === "generating" ||
    data?.status === "loading";
  if (
    isLoadingPhase &&
    inheritedSize &&
    data?.mediaType !== "audio" &&
    !parseAspectRatio(data?.aspectRatio)
  ) {
    return inheritedSize;
  }
  return resolvePlaceholderCardSize(
    data?.status,
    data?.aspectRatio,
    data?.mediaType,
    data?.placeholderDisplaySize,
  );
}
