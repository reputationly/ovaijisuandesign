// handle-position-style.jsx
import {
  reactExports,
  useAssetMetadataStore,
  create$2,
  undoDepth$1,
  undo$1,
  Node$4,
  DOMSerializer,
  redo$1,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useNodeIsEmpty } from "./create-recently-added-store.jsx";
import { useCanvasActions, useCanvasActive } from "./parse-item.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { buildImageNodeView, useSubImages } from "./use-multi-image-actions.js";
const DIFF_CONTEXT_START = "";
const DIFF_CONTEXT_END = "";
const EXPLICIT_BLOCK_PREFIX_RE = /^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~)/;
function parseMarkdownDocument(editor, markdown2) {
  try {
    const manager = editor.storage.markdown?.manager;
    if (!manager) return null;
    const json2 = manager.parse(markdown2);
    if (!json2 || typeof json2 !== "object") return null;
    return Node$4.fromJSON(editor.schema, json2);
  } catch {
    return null;
  }
}
function serializeMarkdownDocument$1(editor, doc2) {
  try {
    const container = document.createElement("div");
    container.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(doc2.content));
    return container;
  } catch {
    return null;
  }
}
function serializeMarkdownNode(editor, node2) {
  try {
    const container = document.createElement("div");
    container.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(node2));
    return container;
  } catch {
    return null;
  }
}
function findMarkerPosition(doc2, marker) {
  let found2 = null;
  doc2.descendants((node2, pos) => {
    if (found2 !== null || !node2.isText) return;
    const index2 = node2.text?.indexOf(marker) ?? -1;
    if (index2 >= 0) found2 = pos + index2;
  });
  return found2;
}
function extractContextualTextblock(editor, context) {
  if (EXPLICIT_BLOCK_PREFIX_RE.test(context.sourceMarkdown.trimStart())) return null;
  const source = `${context.prefix}${context.sourceMarkdown}${context.suffix}`;
  if (source.includes(DIFF_CONTEXT_START) || source.includes(DIFF_CONTEXT_END)) return null;
  const contextualDoc = parseMarkdownDocument(
    editor,
    `${context.prefix}${DIFF_CONTEXT_START}${context.sourceMarkdown}${DIFF_CONTEXT_END}${context.suffix}`,
  );
  if (!contextualDoc) return null;
  const start2 = findMarkerPosition(contextualDoc, DIFF_CONTEXT_START);
  const end2 = findMarkerPosition(contextualDoc, DIFF_CONTEXT_END);
  if (start2 === null || end2 === null || end2 < start2 + DIFF_CONTEXT_START.length) return null;
  const from2 = start2 + DIFF_CONTEXT_START.length;
  const $from = contextualDoc.resolve(from2);
  const $to = contextualDoc.resolve(end2);
  if (!$from.sameParent($to) || !$from.parent.isTextblock) return null;
  return {
    block: $from.parent,
    content: contextualDoc.slice(from2, end2).content,
  };
}
function rebuildSoleTextblock(node2, content2) {
  try {
    if (node2.isTextblock) return node2.type.create(node2.attrs, content2, node2.marks);
    if (node2.childCount !== 1) return null;
    const child = rebuildSoleTextblock(node2.child(0), content2);
    return child ? node2.type.create(node2.attrs, child, node2.marks) : null;
  } catch {
    return null;
  }
}
export function renderDeletedMarkdown(editor, markdown2, context) {
  if (editor.isDestroyed) return null;
  const standaloneDoc = parseMarkdownDocument(editor, markdown2);
  if (context) {
    const contextual = extractContextualTextblock(editor, context);
    if (contextual) {
      const standaloneTop = standaloneDoc?.childCount === 1 ? standaloneDoc.firstChild : null;
      const template =
        standaloneTop?.type.name === "paragraph" && contextual.block.type.name !== "paragraph"
          ? contextual.block
          : (standaloneTop ?? contextual.block);
      const contextualNode =
        rebuildSoleTextblock(template, contextual.content) ??
        rebuildSoleTextblock(contextual.block, contextual.content);
      if (contextualNode) {
        const rendered = serializeMarkdownNode(editor, contextualNode);
        if (rendered) return rendered;
      }
    }
  }
  return standaloneDoc ? serializeMarkdownDocument$1(editor, standaloneDoc) : null;
}
export function useEditorHistoryShortcuts(editor, nodeId) {
  const active2 = useCanvasActive();
  const editorRef = reactExports.useRef(editor);
  editorRef.current = editor;
  reactExports.useEffect(() => {
    if (!active2) return;
    const isNativeTextInput = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    const run2 = (redo2, event) => {
      if (isNativeTextInput(event.target)) return;
      const current2 = editorRef.current;
      if (!current2) return;
      const reviewState = useDiffReviewStore.getState();
      const reviewSession = reviewState.session;
      const reviewUndoBlocked =
        !redo2 &&
        reviewSession !== null &&
        reviewSession.nodeId === nodeId &&
        (reviewSession.baselineMarkdown === void 0 ||
          undoDepth$1(current2.state) <= (reviewSession.historyDepthAtStart ?? 0) + 1);
      if (reviewState.reverting || reviewUndoBlocked) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      const handled = redo2
        ? redo$1(current2.state, current2.view.dispatch)
        : undo$1(current2.state, current2.view.dispatch);
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const handleKeyDown2 = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key2 = event.key.toLowerCase();
      if (key2 === "z") {
        run2(event.shiftKey, event);
      } else if (key2 === "y" && event.ctrlKey && !event.shiftKey) {
        run2(true, event);
      }
    };
    const handleBeforeInput = (event) => {
      if (event.inputType === "historyUndo") run2(false, event);
      else if (event.inputType === "historyRedo") run2(true, event);
    };
    document.addEventListener("keydown", handleKeyDown2, true);
    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown2, true);
      document.removeEventListener("beforeinput", handleBeforeInput, true);
    };
  }, [active2, nodeId]);
}
export function useVideoNodeView(nodeId, data2) {
  const assetsMap = useAssetMetadataStore((s2) => s2.assets);
  const subImages = useSubImages(nodeId);
  const isUserEmpty = useNodeIsEmpty(nodeId);
  const { getNodeById, subscribeGraphChange, promoteSubImageToMain } = useCanvasActions();
  const getRoundSnapshot = reactExports.useCallback(
    () => getNodeById(nodeId)?.round,
    [getNodeById, nodeId],
  );
  const mainRound = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getRoundSnapshot,
    getRoundSnapshot,
  );
  const getNodeAssetId = reactExports.useCallback(
    () => getNodeById(nodeId)?.assetId,
    [getNodeById, nodeId],
  );
  const nodeAssetId = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getNodeAssetId,
    getNodeAssetId,
  );
  const view2 = reactExports.useMemo(
    () =>
      buildImageNodeView(
        nodeId,
        data2,
        subImages,
        (id2) => assetsMap.get(id2),
        isUserEmpty,
        mainRound,
        nodeAssetId,
      ),
    [nodeId, data2, subImages, assetsMap, isUserEmpty, mainRound, nodeAssetId],
  );
  const resolveSlotNodeId = reactExports.useCallback(
    (slot) => {
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === slot.id || subAssetId === slot.id;
      });
      return subMatch?.id ?? slot.id;
    },
    [subImages],
  );
  const selectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view2.activeRoundIndex) return;
      const target = view2.rounds[roundIdx]?.[0];
      if (!target) return;
      const targetNodeId = resolveSlotNodeId(target);
      if (!targetNodeId) return;
      promoteSubImageToMain(targetNodeId);
    },
    [view2.activeRoundIndex, view2.rounds, resolveSlotNodeId, promoteSubImageToMain],
  );
  const selectSlot = reactExports.useCallback(
    (slotIdx) => {
      if (slotIdx <= 0) return;
      const target = view2.slots[slotIdx];
      if (!target || target.status !== "ready") return;
      const targetNodeId = resolveSlotNodeId(target);
      if (!targetNodeId) return;
      promoteSubImageToMain(targetNodeId, {
        persistMode: "request",
      });
    },
    [view2.slots, resolveSlotNodeId, promoteSubImageToMain],
  );
  return reactExports.useMemo(
    () => ({
      view: view2,
      slots: view2.slots,
      roundCount: view2.rounds.length,
      activeRoundIndex: view2.activeRoundIndex,
      selectRound,
      selectSlot,
    }),
    [view2, selectRound, selectSlot],
  );
}
export const useVideoStarterPresetStore = create$2((set2, get3) => ({
  tokens: {},
  refNodeIds: {},
  markApplied: (nodeId) =>
    set2((state2) => ({
      tokens: {
        ...state2.tokens,
        [nodeId]: (state2.tokens[nodeId] ?? 0) + 1,
      },
    })),
  rememberRefNodes: (nodeId, refNodeIds) =>
    set2((state2) => ({
      refNodeIds: {
        ...state2.refNodeIds,
        [nodeId]: [...refNodeIds],
      },
    })),
  takeRefNodes: (nodeId) => {
    const previous2 = get3().refNodeIds[nodeId] ?? [];
    if (previous2.length > 0) {
      set2((state2) => {
        const next2 = {
          ...state2.refNodeIds,
        };
        delete next2[nodeId];
        return {
          refNodeIds: next2,
        };
      });
    }
    return previous2;
  },
}));
export function useVideoStarterPresetToken(nodeId) {
  return useVideoStarterPresetStore((state2) => state2.tokens[nodeId] ?? 0);
}
export const VIDEO_TOOLBAR_TOOLS = [
  "hailuo03-super-resolution",
  "enhance-video",
  "clip",
  "watermark",
  "extract-frame",
  "extract-audio",
  "erase-subtitle",
  "asr",
  "color-adjust",
];
const STORAGE_KEY$7 = "hilo:canvas:video-toolbar:customization";
const TOOLBAR_ORDER_MIGRATION_KEY = "hilo:canvas:video-toolbar:h3-first-migrated-v2";
export const DEFAULT_PINNED = ["hailuo03-super-resolution", "clip", "watermark", "extract-audio"];
const PRE_WATERMARK_DEFAULT_PINNED = ["hailuo03-super-resolution", "clip", "extract-audio"];
export const DEFAULT_SHOW_LABELS = true;
function isVideoToolbarToolId(v2) {
  return VIDEO_TOOLBAR_TOOLS.includes(v2);
}
function migrateToolbarOrder(pinned) {
  if (typeof window === "undefined") return pinned;
  try {
    if (window.localStorage.getItem(TOOLBAR_ORDER_MIGRATION_KEY)) return pinned;
    window.localStorage.setItem(TOOLBAR_ORDER_MIGRATION_KEY, "1");
  } catch {
    return pinned;
  }
  const rest = pinned.filter(
    (id2) => id2 !== "hailuo03-super-resolution" && id2 !== "enhance-video",
  );
  return ["hailuo03-super-resolution", ...rest];
}
function readPersisted$1() {
  if (typeof window === "undefined") {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
    };
  }
  try {
    const raw2 = window.localStorage.getItem(STORAGE_KEY$7);
    if (!raw2)
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
      };
    const parsed = JSON.parse(raw2);
    if (!parsed || typeof parsed !== "object") {
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
      };
    }
    const p3 = parsed;
    const parsedPinned = Array.isArray(p3.pinned)
      ? p3.pinned.filter(isVideoToolbarToolId)
      : DEFAULT_PINNED;
    const migratedPinned = migrateToolbarOrder(parsedPinned);
    const pinned =
      migratedPinned.length === PRE_WATERMARK_DEFAULT_PINNED.length &&
      migratedPinned.every((id2, index2) => id2 === PRE_WATERMARK_DEFAULT_PINNED[index2])
        ? DEFAULT_PINNED
        : migratedPinned;
    const showLabels = typeof p3.showLabels === "boolean" ? p3.showLabels : DEFAULT_SHOW_LABELS;
    return {
      pinned,
      showLabels,
    };
  } catch {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
    };
  }
}
function persist(state2) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY$7, JSON.stringify(state2));
  } catch {}
}
export const useVideoToolbarCustomizationStore = create$2((set2) => ({
  ...readPersisted$1(),
  setCustomization(next2) {
    const pinned = next2.pinned.filter(isVideoToolbarToolId);
    const state2 = {
      pinned,
      showLabels: !!next2.showLabels,
    };
    set2(state2);
    persist(state2);
  },
  resetToDefaults() {
    const state2 = {
      pinned: [...DEFAULT_PINNED],
      showLabels: DEFAULT_SHOW_LABELS,
    };
    set2(state2);
    persist(state2);
  },
}));
export function normToPxRect(box2, vr) {
  return {
    x: vr.x + box2.tlx * vr.w,
    y: vr.y + box2.tly * vr.h,
    w: (box2.brx - box2.tlx) * vr.w,
    h: (box2.bry - box2.tly) * vr.h,
  };
}
const HANDLE_SIZE = 10;
export function ResizeHandle({ handle: handle2, onPointerDown: onPointerDown2 }) {
  const style2 = handlePositionStyle(handle2);
  return (
    <div
      onPointerDown={(e2) => onPointerDown2(e2, handle2)}
      className="absolute z-10 rounded-full border-2 border-primary bg-background"
      style={{
        ...style2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        cursor: handleCursor(handle2),
        touchAction: "none",
      }}
    />
  );
}
function handlePositionStyle(handle2) {
  const offset2 = -HANDLE_SIZE / 2;
  switch (handle2) {
    case "tl":
      return {
        left: offset2,
        top: offset2,
      };
    case "tr":
      return {
        right: offset2,
        top: offset2,
      };
    case "bl":
      return {
        left: offset2,
        bottom: offset2,
      };
    case "br":
      return {
        right: offset2,
        bottom: offset2,
      };
    case "t":
      return {
        left: "50%",
        top: offset2,
        transform: "translateX(-50%)",
      };
    case "b":
      return {
        left: "50%",
        bottom: offset2,
        transform: "translateX(-50%)",
      };
    case "l":
      return {
        left: offset2,
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "r":
      return {
        right: offset2,
        top: "50%",
        transform: "translateY(-50%)",
      };
  }
}
function handleCursor(handle2) {
  switch (handle2) {
    case "tl":
    case "br":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    case "t":
    case "b":
      return "ns-resize";
    case "l":
    case "r":
      return "ew-resize";
  }
}
export function arePropsEqual$2(prev, next2) {
  if (prev.nodes === next2.nodes) return true;
  if (prev.nodes.length !== next2.nodes.length) return false;
  for (let i2 = 0; i2 < prev.nodes.length; i2++) {
    const a2 = prev.nodes[i2];
    const b3 = next2.nodes[i2];
    if (a2.id !== b3.id || a2.type !== b3.type) return false;
  }
  return true;
}
export const DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT = "bottom-left";
export const VIEWPORT_CONTROLS_INSET = 8;
const VIEWPORT_CONTROLS_HEIGHT = 32;
const VIEWPORT_CONTROLS_OVERLAY_GAP = 8;
export const MINIMAP_CONTROLS_OFFSET =
  VIEWPORT_CONTROLS_INSET + VIEWPORT_CONTROLS_HEIGHT + VIEWPORT_CONTROLS_OVERLAY_GAP;
export const MINIMAP_SIZE = {
  width: 160,
  height: 130,
  margin: 0,
};
