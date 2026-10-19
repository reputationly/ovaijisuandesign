// overlay-state-flags.js
//
// 把「界面上有没有浮层」这件事**写到 DOM 上**，供 CSS 用。
//
// 为什么要落到 DOM 属性而不是 React 状态：需要知道这件事的地方有一堆，
// 其中不少在 React 树之外（原生视图、插件注入的样式、打印样式），
// 让它们都订阅一个 React 上下文不现实。用属性最省事，而且**变化粒度是 CSS 能直接用的**。
//
// 用 MutationObserver 而不是在每次开关浮层时手动调：浮层来自很多地方
//（React 门户、原生弹层、编辑器插件），逐个挂钩子必漏。观察整棵树代价也不大 ——
// 先用 `isRelevant` 挡掉绝大多数无关变更，再用 microtask 合并同一帧里的多次触发。
const DIALOG_OPEN = "[data-slot='dialog-overlay'][data-open]";
const HTML_FULLSCREEN = ".html-viewer-popover[data-presentation='fullscreen']";
const PLUGIN_OVERLAY_OPEN = "[data-plugin-editor-overlay-open='true']";
const BROWSER_ANNOTATING = "[data-browser-annotating='true']";
const CANVAS_PANE = "[data-workspace-pane='canvas']";
const CANVAS_PANE_SURFACE = "[data-workspace-pane-surface='canvas']";
const CANVAS_VIEWPORT_HOST = "[data-workspace-canvas-viewport-host='true']";
const DIALOG_OPEN_CLASS = "hilo-dialog-open";
const HTML_FULLSCREEN_CLASS = "hilo-html-fullscreen";
const PLUGIN_OVERLAY_ACTIVE_ATTR = "data-plugin-editor-overlay-active";
const BROWSER_ANNOTATING_ACTIVE_ATTR = "data-browser-annotating-active";
const WATCHED_ELEMENTS = [
  "[data-slot='dialog-overlay']",
  ".html-viewer-popover",
  "[data-plugin-editor-overlay-open]",
  "[data-browser-annotating]"
].join(",");
const WATCHED_ATTRIBUTES = [
  "data-open",
  "data-slot",
  "data-presentation",
  "data-plugin-editor-overlay-open",
  "data-browser-annotating"
];
function isPopoverOpen(element) {
  try {
    return element.matches(":popover-open");
  } catch {
    return false;
  }
}
function setClass(element, name, on) {
  if (element.classList.contains(name) !== on) element.classList.toggle(name, on);
}
function setAttr(element, name, on) {
  if (element.hasAttribute(name) !== on) element.toggleAttribute(name, on);
}
function syncContainers(doc, container, child, attr2) {
  for (const element of doc.querySelectorAll(container)) {
    setAttr(element, attr2, element.querySelector(child) != null);
  }
}
function syncOverlayStateFlags(doc = document) {
  const body = doc.body;
  if (!body) return;
  setClass(body, DIALOG_OPEN_CLASS, doc.querySelector(DIALOG_OPEN) != null);
  setClass(
    body,
    HTML_FULLSCREEN_CLASS,
    Array.from(doc.querySelectorAll(HTML_FULLSCREEN)).some(isPopoverOpen)
  );
  syncContainers(doc, CANVAS_PANE, PLUGIN_OVERLAY_OPEN, PLUGIN_OVERLAY_ACTIVE_ATTR);
  syncContainers(doc, CANVAS_PANE_SURFACE, PLUGIN_OVERLAY_OPEN, PLUGIN_OVERLAY_ACTIVE_ATTR);
  syncContainers(doc, CANVAS_VIEWPORT_HOST, BROWSER_ANNOTATING, BROWSER_ANNOTATING_ACTIVE_ATTR);
}
function touchesWatched(node) {
  if (node.nodeType !== 1) return false;
  const element = node;
  return element.matches(WATCHED_ELEMENTS) || element.querySelector(WATCHED_ELEMENTS) != null;
}
function isRelevant(records) {
  for (const record2 of records) {
    if (record2.type === "attributes") return true;
    for (const node of record2.addedNodes) if (touchesWatched(node)) return true;
    for (const node of record2.removedNodes) if (touchesWatched(node)) return true;
  }
  return false;
}
function installOverlayStateFlags(doc = document) {
  const view = doc.defaultView;
  if (!doc.body || !view?.MutationObserver) return () => {
  };
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    syncOverlayStateFlags(doc);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  };
  const observer = new view.MutationObserver((records) => {
    if (isRelevant(records)) schedule();
  });
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: WATCHED_ATTRIBUTES
  });
  doc.addEventListener("toggle", schedule, true);
  syncOverlayStateFlags(doc);
  return () => {
    observer.disconnect();
    doc.removeEventListener("toggle", schedule, true);
    const body = doc.body;
    if (body) {
      body.classList.remove(DIALOG_OPEN_CLASS, HTML_FULLSCREEN_CLASS);
    }
    for (const element of doc.querySelectorAll(`[${PLUGIN_OVERLAY_ACTIVE_ATTR}]`)) {
      element.removeAttribute(PLUGIN_OVERLAY_ACTIVE_ATTR);
    }
    for (const element of doc.querySelectorAll(`[${BROWSER_ANNOTATING_ACTIVE_ATTR}]`)) {
      element.removeAttribute(BROWSER_ANNOTATING_ACTIVE_ATTR);
    }
  };
}
export { installOverlayStateFlags };
