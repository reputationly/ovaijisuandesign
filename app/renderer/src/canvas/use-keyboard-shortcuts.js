// use-keyboard-shortcuts.js
import { getExtFromMime } from "./separator.jsx";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";
import { copiedSystemText } from "./remap-clipboard.js";
import {
  getClipboard,
  INTERNAL_COPY_HTML_ATTRIBUTE,
} from "./partition-user-removal-elements.js";
import { CanvasNodeType } from "./canvas-geometry.js";
import reactExports from "react";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
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
    const active = document.activeElement;
    if (active === null || active === document.body) return true;
  }
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.closest('.react-flow, [data-hilo-canvas-root="true"]') !== null;
}
function collectClipboardFiles(data) {
  if (!data) return [];
  const collected = [];
  const seen = new Set();
  const push = (file, fallbackMime) => {
    const key = `${file.type}|${file.size}`;
    if (seen.has(key)) return;
    seen.add(key);
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
  for (const file of Array.from(data.files)) {
    push(file);
  }
  for (const item of Array.from(data.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    push(file, item.type);
  }
  return collected;
}
function isFromInternalNativeCopy(files, internalNodes) {
  if (files.length === 0 || files.length !== internalNodes.length) return false;
  const fileNames = new Set(files.map((file) => file.name));
  return internalNodes.every((node) => {
    const data = node.data;
    const nodeName = typeof data?.name === "string" ? data.name : void 0;
    const path = typeof data?.path === "string" ? data.path : void 0;
    const basename = path ? (path.split("/").pop() ?? path) : void 0;
    return Boolean(
      (nodeName && fileNames.has(nodeName)) ||
      (basename && fileNames.has(basename)),
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
function hasInternalCopyMarker(text, html) {
  return (
    text === INTERNAL_COPY_MARKER ||
    html.includes(INTERNAL_COPY_HTML_ATTRIBUTE)
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
    text,
    html,
    files,
    internalNodes,
    hasOnSystemPaste,
    hasOnSystemTextPaste,
  } = input;
  if (hasInternalCopyMarker(text, html))
    return {
      kind: "marker",
    };
  const copiedSysText = getCopiedSystemText();
  if (copiedSysText && text === copiedSysText && internalNodes.length > 0)
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
  if (hasOnSystemTextPaste && text.trim().length > 0)
    return {
      kind: "system-text",
      text,
    };
  return {
    kind: "internal-fallback",
  };
}
export function useKeyboardShortcuts(instance, options = {}) {
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
    getViewportRect,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  } = options;
  reactExports.useEffect(() => {
    const runInternalPaste = () => {
      const anchor = getInternalPasteAnchor?.() ?? null;
      if (anchor) {
        void instance.pasteAtPosition(anchor).catch((err) => {
          console.error("[canvas] internal paste at cursor failed:", err);
        });
        return;
      }
      void instance
        .pasteFromClipboard({
          ensureInView: ensureInternalPasteInView,
          viewportRect: getViewportRect?.() ?? void 0,
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
    const handleCopy = (clipboardEvent) => {
      if (!isCanvasInteractive(instance.getRootEl(), enabled)) return;
      if (isEditableTarget(clipboardEvent.target)) return;
      if (!isInsideCanvas(clipboardEvent.target)) return;
      if (instance.selection.getSelected().length === 0) return;
      clipboardEvent.preventDefault();
      instance.copySelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeCanvasSystemClipboard(onSystemCopy);
    };
    const handleCut = (clipboardEvent) => {
      if (!isCanvasInteractive(instance.getRootEl(), enabled)) return;
      if (isEditableTarget(clipboardEvent.target)) return;
      if (!isInsideCanvas(clipboardEvent.target)) return;
      if (instance.selection.getSelected().length === 0) return;
      clipboardEvent.preventDefault();
      instance.cutSelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeMarkerOnly();
    };
    const handlePaste = (clipboardEvent) => {
      if (!isCanvasInteractive(instance.getRootEl(), enabled)) return;
      if (isEditableTarget(clipboardEvent.target)) return;
      if (!isInsideCanvas(clipboardEvent.target)) return;
      const text = clipboardEvent.clipboardData?.getData("text/plain") ?? "";
      const html = clipboardEvent.clipboardData?.getData("text/html") ?? "";
      const files = onSystemPaste
        ? collectClipboardFiles(clipboardEvent.clipboardData)
        : [];
      const intent = decidePasteIntent({
        text,
        html,
        files,
        internalNodes: getClipboard()?.nodes ?? [],
        hasOnSystemPaste: Boolean(onSystemPaste),
        hasOnSystemTextPaste: Boolean(onSystemTextPaste),
      });
      clipboardEvent.preventDefault();
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
    const handler = (keyboardEvent) => {
      if (!isCanvasInteractive(instance.getRootEl(), enabled)) return;
      if (keyboardEvent.defaultPrevented) return;
      if (isEditableTarget(keyboardEvent.target)) return;
      if (keyboardEvent.isComposing || keyboardEvent.key === "Process") return;
      if (
        !keyboardEvent.defaultPrevented &&
        onHostKeyboardShortcut &&
        isInsideCanvas(keyboardEvent.target) &&
        onHostKeyboardShortcut(keyboardEvent)
      ) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        return;
      }
      const commandId = resolveCanvasShortcut(keyboardEvent);
      if (commandId && commandRegistry?.hasHandler(commandId)) {
        if (!isInsideCanvas(keyboardEvent.target)) return;
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        commandRegistry.execute(commandId, "keyboard");
        return;
      }
      const mod = keyboardEvent.metaKey || keyboardEvent.ctrlKey;
      if (keyboardEvent.shiftKey && !mod && keyboardEvent.code === "Digit1") {
        if (!isInsideCanvas(keyboardEvent.target)) return;
        keyboardEvent.preventDefault();
        onFitView?.();
        return;
      }
      if (!mod) return;
      const key = keyboardEvent.key.toLowerCase();
      if (keyboardEvent.altKey && keyboardEvent.code === "KeyC") {
        if (!isInsideCanvas(keyboardEvent.target)) return;
        if (!onCopyDebugInfo) return;
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onCopyDebugInfo();
        return;
      }
      if (key === "z") {
        keyboardEvent.preventDefault();
        if (keyboardEvent.shiftKey) {
          instance.redo();
        } else {
          instance.undo();
        }
        return;
      }
      if (key === "=" || key === "+") {
        keyboardEvent.preventDefault();
        onZoomIn?.();
        return;
      }
      if (key === "-") {
        keyboardEvent.preventDefault();
        onZoomOut?.();
        return;
      }
      if (key === "g") {
        if (!isInsideCanvas(keyboardEvent.target)) return;
        const selected = instance.selection.getSelected();
        if (keyboardEvent.shiftKey) {
          const graph = instance.getGraph();
          const target = selected.find(
            (id) =>
              graph.nodes.find((node) => node.id === id)?.type ===
              CanvasNodeType.Group,
          );
          if (target) {
            keyboardEvent.preventDefault();
            instance.ungroup(target);
          }
          return;
        }
        if (selected.length >= 2) {
          keyboardEvent.preventDefault();
          instance.groupNodes(selected);
        }
        return;
      }
    };
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handler);
    };
  }, [
    assetMetadataStore,
    enabled,
    instance,
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
    getViewportRect,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  ]);
}
