// use-keyboard-shortcuts.js
import { getExtFromMime } from "./separator.jsx";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";
import { copiedSystemText } from "./remap-clipboard.js";
import {
  getClipboard,
  INTERNAL_COPY_HTML_ATTRIBUTE,
} from "./partition-user-removal-elements.js";
import {
  CanvasNodeType,
  reactExports,
  useAssetMetadataApi,
} from "../vendor.js";
import {
  buildInternalClipboardItemData,
  writeCanvasSystemClipboard,
} from "./reorder-parents-before-children.js";
function isCanvasInteractive(rootEl, enabled = true) {
  if (!enabled) return false;
  if (rootEl === null) return true;
  return rootEl.offsetParent !== null;
}
function isInsideCanvas(target) {
  if (typeof window !== "undefined") {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const anchor = sel.anchorNode;
      const el =
        anchor?.nodeType === Node.ELEMENT_NODE
          ? anchor
          : (anchor?.parentElement ?? null);
      if (
        el &&
        el.closest('.react-flow, [data-hilo-canvas-root="true"]') === null
      ) {
        return false;
      }
    }
  }
  if (typeof document !== "undefined") {
    const active2 = document.activeElement;
    if (active2 === null || active2 === document.body) return true;
  }
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.closest('.react-flow, [data-hilo-canvas-root="true"]') !== null;
}
function collectClipboardFiles(data2) {
  if (!data2) return [];
  const collected = [];
  const seen2 = new Set();
  const push2 = (file, fallbackMime) => {
    const key2 = `${file.type}|${file.size}`;
    if (seen2.has(key2)) return;
    seen2.add(key2);
    if (!file.name || file.name === "image.png" || file.name === "image") {
      const ext = getExtFromMime(
        file.type || fallbackMime || "image/png",
        "png",
      );
      collected.push(
        new File([file], `pasted-${Date.now()}.${ext}`, {
          type: file.type || fallbackMime,
        }),
      );
      return;
    }
    collected.push(file);
  };
  for (const file of Array.from(data2.files)) {
    push2(file);
  }
  for (const item of Array.from(data2.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    push2(file, item.type);
  }
  return collected;
}
function isFromInternalNativeCopy(files, internalNodes) {
  if (files.length === 0 || files.length !== internalNodes.length) return false;
  const fileNames = new Set(files.map((f2) => f2.name));
  return internalNodes.every((node2) => {
    const data2 = node2.data;
    const name2 = typeof data2?.name === "string" ? data2.name : void 0;
    const path2 = typeof data2?.path === "string" ? data2.path : void 0;
    const basename2 = path2 ? (path2.split("/").pop() ?? path2) : void 0;
    return Boolean(
      (name2 && fileNames.has(name2)) ||
      (basename2 && fileNames.has(basename2)),
    );
  });
}
function resolveCanvasShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return void 0;
  if (event.shiftKey && event.code === "KeyI") return CANVAS_COMMAND_IDS.assets;
  if (event.shiftKey && event.key === "?") return CANVAS_COMMAND_IDS.shortcuts;
  if (event.shiftKey && event.code === "Digit2") {
    return event.repeat ? void 0 : CANVAS_COMMAND_IDS.focusSelection;
  }
  if (event.shiftKey) return void 0;
  switch (event.code) {
    case "Escape":
      return CANVAS_COMMAND_IDS.select;
    case "KeyN":
      return CANVAS_COMMAND_IDS.addNode;
    case "KeyV":
      return CANVAS_COMMAND_IDS.select;
    case "KeyH":
      return CANVAS_COMMAND_IDS.handTool;
    case "KeyS":
      return event.repeat ? void 0 : CANVAS_COMMAND_IDS.sticker;
    case "KeyM":
      return CANVAS_COMMAND_IDS.minimap;
    case "F1":
      return CANVAS_COMMAND_IDS.help;
    default:
      return void 0;
  }
}
const INTERNAL_COPY_MARKER = "​[hilo-canvas-internal-copy]​";
function hasInternalCopyMarker(text2, html2) {
  return (
    text2 === INTERNAL_COPY_MARKER ||
    html2.includes(INTERNAL_COPY_HTML_ATTRIBUTE)
  );
}
function getCopiedSystemText() {
  return copiedSystemText;
}
function makeAssetPathResolver(assetMetadataStore) {
  return (assetId) => assetMetadataStore.getState().get(assetId)?.path;
}
function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
function decidePasteIntent(input) {
  const {
    text: text2,
    html: html2,
    files,
    internalNodes,
    hasOnSystemPaste,
    hasOnSystemTextPaste,
  } = input;
  if (hasInternalCopyMarker(text2, html2))
    return {
      kind: "marker",
    };
  const copiedSysText = getCopiedSystemText();
  if (copiedSysText && text2 === copiedSysText && internalNodes.length > 0)
    return {
      kind: "marker",
    };
  if (files.length > 0) {
    if (isFromInternalNativeCopy(files, internalNodes))
      return {
        kind: "internal-from-copy",
      };
    if (hasOnSystemPaste)
      return {
        kind: "system-files",
        files,
      };
  }
  if (hasOnSystemTextPaste && text2.trim().length > 0)
    return {
      kind: "system-text",
      text: text2,
    };
  return {
    kind: "internal-fallback",
  };
}
export function useKeyboardShortcuts(instance2, options = {}) {
  const assetMetadataStore = useAssetMetadataApi();
  const {
    enabled = true,
    commandRegistry,
    onZoomIn,
    onZoomOut,
    onFitView,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect: getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  } = options;
  reactExports.useEffect(() => {
    const runInternalPaste = () => {
      const anchor = getInternalPasteAnchor?.() ?? null;
      if (anchor) {
        void instance2.pasteAtPosition(anchor).catch((err) => {
          console.error("[canvas] internal paste at cursor failed:", err);
        });
        return;
      }
      void instance2
        .pasteFromClipboard({
          ensureInView: ensureInternalPasteInView,
          viewportRect: getViewportRect2?.() ?? void 0,
          viewportCenter: getViewportCenter?.(),
        })
        .catch((err) => {
          console.error("[canvas] internal paste failed:", err);
        });
    };
    const writeMarkerOnly = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.write)
        return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem(buildInternalClipboardItemData()),
        ]);
      } catch (err) {
        console.warn("[canvas] write marker failed:", err);
      }
    };
    const handleCopy = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      if (instance2.selection.getSelected().length === 0) return;
      e2.preventDefault();
      instance2.copySelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeCanvasSystemClipboard(onSystemCopy);
    };
    const handleCut = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      if (instance2.selection.getSelected().length === 0) return;
      e2.preventDefault();
      instance2.cutSelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeMarkerOnly();
    };
    const handlePaste2 = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      const text2 = e2.clipboardData?.getData("text/plain") ?? "";
      const html2 = e2.clipboardData?.getData("text/html") ?? "";
      const files = onSystemPaste
        ? collectClipboardFiles(e2.clipboardData)
        : [];
      const intent = decidePasteIntent({
        text: text2,
        html: html2,
        files,
        internalNodes: getClipboard()?.nodes ?? [],
        hasOnSystemPaste: Boolean(onSystemPaste),
        hasOnSystemTextPaste: Boolean(onSystemTextPaste),
      });
      e2.preventDefault();
      switch (intent.kind) {
        case "marker":
        case "internal-from-copy":
        case "internal-fallback":
          runInternalPaste();
          return;
        case "system-files":
          onSystemPaste?.(intent.files);
          return;
        case "system-text":
          onSystemTextPaste?.(intent.text);
          return;
      }
    };
    const handler = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (e2.defaultPrevented) return;
      if (isEditableTarget(e2.target)) return;
      if (e2.isComposing || e2.key === "Process") return;
      if (
        !e2.defaultPrevented &&
        onHostKeyboardShortcut &&
        isInsideCanvas(e2.target) &&
        onHostKeyboardShortcut(e2)
      ) {
        e2.preventDefault();
        e2.stopPropagation();
        return;
      }
      const commandId = resolveCanvasShortcut(e2);
      if (commandId && commandRegistry?.hasHandler(commandId)) {
        if (!isInsideCanvas(e2.target)) return;
        e2.preventDefault();
        e2.stopPropagation();
        commandRegistry.execute(commandId, "keyboard");
        return;
      }
      const mod = e2.metaKey || e2.ctrlKey;
      if (e2.shiftKey && !mod && e2.code === "Digit1") {
        if (!isInsideCanvas(e2.target)) return;
        e2.preventDefault();
        onFitView?.();
        return;
      }
      if (!mod) return;
      const key2 = e2.key.toLowerCase();
      if (e2.altKey && e2.code === "KeyC") {
        if (!isInsideCanvas(e2.target)) return;
        if (!onCopyDebugInfo) return;
        e2.preventDefault();
        e2.stopPropagation();
        onCopyDebugInfo();
        return;
      }
      if (key2 === "z") {
        e2.preventDefault();
        if (e2.shiftKey) {
          instance2.redo();
        } else {
          instance2.undo();
        }
        return;
      }
      if (key2 === "=" || key2 === "+") {
        e2.preventDefault();
        onZoomIn?.();
        return;
      }
      if (key2 === "-") {
        e2.preventDefault();
        onZoomOut?.();
        return;
      }
      if (key2 === "g") {
        if (!isInsideCanvas(e2.target)) return;
        const selected2 = instance2.selection.getSelected();
        if (e2.shiftKey) {
          const graph = instance2.getGraph();
          const target = selected2.find(
            (id2) =>
              graph.nodes.find((n2) => n2.id === id2)?.type ===
              CanvasNodeType.Group,
          );
          if (target) {
            e2.preventDefault();
            instance2.ungroup(target);
          }
          return;
        }
        if (selected2.length >= 2) {
          e2.preventDefault();
          instance2.groupNodes(selected2);
        }
        return;
      }
    };
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste2);
    window.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste2);
      window.removeEventListener("keydown", handler);
    };
  }, [
    assetMetadataStore,
    enabled,
    instance2,
    commandRegistry,
    onZoomIn,
    onZoomOut,
    onFitView,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  ]);
}
