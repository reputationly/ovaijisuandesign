// use-canvas-shortcut-guard.js
import reactExports from "react";
import { useCanvasActive } from "./package.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
const CANVAS_DIRECTIONAL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
function decideCanvasShortcutGuardKeydown(event, targetEditable) {
  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    !targetEditable
  ) {
    return "stop-immediate";
  }
  if (event.key === "Escape") {
    return "allow";
  }
  if (CANVAS_DIRECTIONAL_KEYS.has(event.key) && !targetEditable) {
    return "stop";
  }
  const isModifierKeyPressed = event.metaKey === true || event.ctrlKey === true;
  const viewportShortcut =
    event.shiftKey === true &&
    (event.code === "Digit1" || event.code === "Digit2");
  if (isModifierKeyPressed || viewportShortcut) {
    return "stop";
  }
  return "allow";
}
function shouldCaptureCanvasShortcutKeydown(
  decision,
  directionalKey,
  insideGuardRoot,
  ownedDirectionalKey = false,
) {
  if (ownedDirectionalKey) return false;
  if (decision === "allow") return false;
  if (decision === "stop-immediate") return true;
  return directionalKey && insideGuardRoot;
}
function shouldStopCanvasShortcutClipboard(targetEditable) {
  return !targetEditable;
}
function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}
function isInsideGuardRoot(target, rootRef) {
  const root = rootRef?.current;
  return !!root && target instanceof Node && root.contains(target);
}
export function useCanvasShortcutGuard(
  enabled = true,
  rootRef,
  allowHorizontalArrowKeys = false,
) {
  const isCanvasActive = useCanvasActive();
  useSuspendCanvasInteractions(enabled);
  reactExports.useEffect(() => {
    if (!enabled || !isCanvasActive) return;
    const deleteKeyCapture = (event) => {
      const decision = decideCanvasShortcutGuardKeydown(
        event,
        isEditableTarget(event.target),
      );
      const directionalKey = CANVAS_DIRECTIONAL_KEYS.has(event.key);
      const ownedDirectionalKey =
        allowHorizontalArrowKeys &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight");
      if (
        !shouldCaptureCanvasShortcutKeydown(
          decision,
          directionalKey,
          isInsideGuardRoot(event.target, rootRef),
          ownedDirectionalKey,
        )
      ) {
        return;
      }
      if (directionalKey) {
        event.preventDefault();
      }
      event.stopPropagation();
      if (decision === "stop-immediate") {
        event.stopImmediatePropagation();
      }
    };
    const shortcutBubble = (event) => {
      const decision = decideCanvasShortcutGuardKeydown(
        event,
        isEditableTarget(event.target),
      );
      if (decision !== "stop") return;
      event.stopPropagation();
    };
    const clipboardCapture = (event) => {
      if (!shouldStopCanvasShortcutClipboard(isEditableTarget(event.target)))
        return;
      event.stopPropagation();
    };
    document.addEventListener("keydown", deleteKeyCapture, true);
    document.addEventListener("keydown", shortcutBubble);
    document.addEventListener("copy", clipboardCapture, true);
    document.addEventListener("cut", clipboardCapture, true);
    document.addEventListener("paste", clipboardCapture, true);
    return () => {
      document.removeEventListener("keydown", deleteKeyCapture, true);
      document.removeEventListener("keydown", shortcutBubble);
      document.removeEventListener("copy", clipboardCapture, true);
      document.removeEventListener("cut", clipboardCapture, true);
      document.removeEventListener("paste", clipboardCapture, true);
    };
  }, [isCanvasActive, enabled, rootRef, allowHorizontalArrowKeys]);
}
