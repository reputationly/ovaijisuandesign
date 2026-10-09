// build-controls.js
import { PluginKey } from "../vendor.js";

export const DIFF_ADD_CLASS = "canvas-diff-add";

export const DIFF_CONTROLS_CLASS = "canvas-diff-controls";

export const diffReviewPluginKey = new PluginKey("canvasDiffReview");

export function buildControls(ids2, config2) {
  const bar = document.createElement("div");
  bar.className = DIFF_CONTROLS_CLASS;
  bar.setAttribute("data-diff-controls-for", ids2.join(" "));
  bar.setAttribute("data-diff-control-count", String(ids2.length));
  bar.contentEditable = "false";
  const mkBtn = (label, action, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = `${DIFF_CONTROLS_CLASS}-btn ${DIFF_CONTROLS_CLASS}-btn-${action}`;
    btn.setAttribute("data-action-ui-id", `canvas-diff-${action}`);
    btn.disabled = config2.disabled;
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    bar.appendChild(btn);
  };
  const hunkIds = [...ids2];
  mkBtn(config2.undoLabel, "undo", () => {
    if (hunkIds.length === 1) config2.onUndo(hunkIds[0]);
    else config2.onUndoGroup(hunkIds);
  });
  mkBtn(config2.acceptLabel, "accept", () => {
    if (hunkIds.length === 1) config2.onAccept(hunkIds[0]);
    else config2.onAcceptGroup(hunkIds);
  });
  return bar;
}
