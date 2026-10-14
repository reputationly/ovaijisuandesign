// build-controls.js
import { PluginKey } from "prosemirror-state";

export const DIFF_ADD_CLASS = "canvas-diff-add";

export const DIFF_CONTROLS_CLASS = "canvas-diff-controls";

export const diffReviewPluginKey = new PluginKey("canvasDiffReview");

export function buildControls(ids, config) {
  const bar = document.createElement("div");
  bar.className = DIFF_CONTROLS_CLASS;
  bar.setAttribute("data-diff-controls-for", ids.join(" "));
  bar.setAttribute("data-diff-control-count", String(ids.length));
  bar.contentEditable = "false";
  const mkBtn = (label, action, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = `${DIFF_CONTROLS_CLASS}-btn ${DIFF_CONTROLS_CLASS}-btn-${action}`;
    btn.setAttribute("data-action-ui-id", `canvas-diff-${action}`);
    btn.disabled = config.disabled;
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
  const hunkIds = [...ids];
  mkBtn(config.undoLabel, "undo", () => {
    if (hunkIds.length === 1) config.onUndo(hunkIds[0]);
    else config.onUndoGroup(hunkIds);
  });
  mkBtn(config.acceptLabel, "accept", () => {
    if (hunkIds.length === 1) config.onAccept(hunkIds[0]);
    else config.onAcceptGroup(hunkIds);
  });
  return bar;
}
