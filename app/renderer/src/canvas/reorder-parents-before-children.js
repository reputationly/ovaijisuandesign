// reorder-parents-before-children.js
import { CanvasNodeType } from "../vendor.js";
import {
  GROUP_DERIVED_CHILD_COUNT_KEY,
  GROUP_DERIVED_COLLAPSED_KEY,
} from "./use-start-crop-from-node.js";
import {
  INTERNAL_COPY_HTML_ATTRIBUTE,
  normaliseHandle,
} from "./partition-user-removal-elements.js";

const INTERNAL_COPY_HTML_MARKER = `<span ${INTERNAL_COPY_HTML_ATTRIBUTE}="true"></span>`;

export function toFlowEdge(edge, selectedNodeIds, hidden) {
  const selected2 = selectedNodeIds
    ? selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)
    : void 0;
  const sourceHandle = normaliseHandle(edge.sourceHandle);
  const targetHandle = normaliseHandle(edge.targetHandle);
  return {
    id: edge.id,
    source: edge.source,
    ...(sourceHandle !== void 0
      ? {
          sourceHandle,
        }
      : {}),
    target: edge.target,
    ...(targetHandle !== void 0
      ? {
          targetHandle,
        }
      : {}),
    type: edge.type ?? "default",
    data: edge.data ?? {},
    ...(selected2 !== void 0
      ? {
          selected: selected2,
        }
      : {}),
    // Mirrors the `hidden` treatment in `toFlowNode`: omitted unless explicitly
    // true so ReactFlow's diff sees a stable shape for the common (always-
    // visible) case. Set by callers when either endpoint sits inside a
    // collapsed group — otherwise the edge would still render as a dangling
    // line floating across the canvas while its child node is hidden.
    ...(hidden
      ? {
          hidden: true,
        }
      : {}),
  };
}

function buildChildCountByParent(nodes) {
  const counts = new Map();
  for (const node of nodes) {
    if (!node.parentId) continue;
    counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
  }
  return counts;
}

export function injectDerivedChildCounts(nodes, childCountByParent) {
  const counts = childCountByParent ?? buildChildCountByParent(nodes);
  let mutated = false;
  const result = nodes.map((node) => {
    if (node.type !== CanvasNodeType.Group) return node;
    const next2 = counts.get(node.id) ?? 0;
    const collapsedRaw = !!node.meta?.collapsed;
    const data2 = node.data;
    const prevCount = data2?.[GROUP_DERIVED_CHILD_COUNT_KEY];
    const prevCollapsed = data2?.[GROUP_DERIVED_COLLAPSED_KEY];
    if (prevCount === next2 && prevCollapsed === collapsedRaw) return node;
    mutated = true;
    return {
      ...node,
      data: {
        ...(data2 ?? {}),
        [GROUP_DERIVED_CHILD_COUNT_KEY]: next2,
        [GROUP_DERIVED_COLLAPSED_KEY]: collapsedRaw,
      },
    };
  });
  return mutated ? result : nodes;
}

export function reorderParentsBeforeChildren(nodes) {
  let hasParented = false;
  for (const node of nodes) {
    if (node.parentId) {
      hasParented = true;
      break;
    }
  }
  if (!hasParented) return nodes;
  const parentOf = (node) => node.parentId;
  const childrenByParent = new Map();
  for (const node of nodes) {
    const pid = parentOf(node);
    if (!pid) continue;
    let bucket = childrenByParent.get(pid);
    if (!bucket) {
      bucket = [];
      childrenByParent.set(pid, bucket);
    }
    bucket.push(node);
  }
  const seen2 = new Set();
  const result = [];
  for (const node of nodes) {
    if (parentOf(node)) continue;
    if (seen2.has(node.id)) continue;
    seen2.add(node.id);
    result.push(node);
    const children2 = childrenByParent.get(node.id);
    if (children2) {
      for (const child of children2) {
        if (seen2.has(child.id)) continue;
        seen2.add(child.id);
        result.push(child);
      }
    }
  }
  for (const node of nodes) {
    if (seen2.has(node.id)) continue;
    seen2.add(node.id);
    result.push(node);
  }
  return result;
}

export function buildInternalClipboardItemData(blobs = null) {
  return {
    ...(blobs ?? {}),
    "text/html": new Blob([INTERNAL_COPY_HTML_MARKER], {
      type: "text/html",
    }),
  };
}

export async function writeCanvasSystemClipboard(onSystemCopy) {
  let result;
  if (onSystemCopy) {
    try {
      result = await onSystemCopy();
    } catch (error) {
      console.warn("[canvas] onSystemCopy failed:", error);
    }
  }
  if (result && "kind" in result && result.kind === "native") return;
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) return;
  const blobs = (result && !("kind" in result) ? result : null) ?? null;
  try {
    await navigator.clipboard.write([
      new ClipboardItem(buildInternalClipboardItemData(blobs)),
    ]);
  } catch (error) {
    console.warn("[canvas] system copy write failed:", error);
  }
}
