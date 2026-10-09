// use-asset-menu-shortcuts.js
import { reactExports } from "../vendor.js";

export function useAssetMenuShortcuts(handlers2) {
  return reactExports.useCallback(
    (event) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey;
      const isInputTarget =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);
      if (isInputTarget) return;
      const hasSelection2 =
        (window.getSelection?.()?.toString().length ?? 0) > 0;
      if (event.key === "Escape") {
        if (!handlers2.onClearSelection) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onClearSelection();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "a" || event.key === "A")
      ) {
        if (hasSelection2) return;
        if (!handlers2.onSelectAll) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSelectAll();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && event.key === "1") {
        if (!handlers2.onSwitchToTreeView) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSwitchToTreeView();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && event.key === "2") {
        if (!handlers2.onSwitchToGridView) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSwitchToGridView();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "f" || event.key === "F")
      ) {
        if (!handlers2.onFocusSearch) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onFocusSearch();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "c" || event.key === "C")
      ) {
        if (hasSelection2) return;
        if (!handlers2.onCopy) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onCopy();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "d" || event.key === "D")
      ) {
        if (!handlers2.onDuplicate) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onDuplicate();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "z" || event.key === "Z")
      ) {
        if (!handlers2.onUndo) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onUndo();
        return;
      }
      if (
        cmdOrCtrl &&
        event.shiftKey &&
        (event.key === "a" || event.key === "A")
      ) {
        if (!handlers2.onAddToCanvas) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onAddToCanvas();
        return;
      }
      if (
        cmdOrCtrl &&
        event.shiftKey &&
        (event.key === "r" || event.key === "R")
      ) {
        if (!handlers2.onShowInFolder) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onShowInFolder();
        return;
      }
      if (
        cmdOrCtrl &&
        !event.shiftKey &&
        (event.key === "o" || event.key === "O")
      ) {
        if (!handlers2.onOpenDefault) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onOpenDefault();
        return;
      }
      if (!cmdOrCtrl && !event.shiftKey && event.key === "Enter") {
        if (!handlers2.onRename) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onRename();
        return;
      }
      if (!cmdOrCtrl && (event.key === "Backspace" || event.key === "Delete")) {
        if (!handlers2.onDelete) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onDelete();
        return;
      }
    },
    [handlers2],
  );
}
