/**
 * 媒体静音偏好 + 紧凑编辑器判定 —— 从产物主包整段取回（第 76 轮）。
 *
 * `getMediaMuted` / `subscribeMute` / `toggle` / `useMediaMuted` 属于同一个静音模块
 * （共享 `muted` / `muteListeners` / 持久化写入），必须整段搬，不能只挑函数。
 * `editorControls` + `isCompactEditorBlank` 则是「点在编辑器控件上时不算空白」的判定。
 */
import reactExports from "react";
const editorControls = [
  "button",
  "input",
  "textarea",
  "select",
  "a[href]",
  '[role="button"]',
  '[role="slider"]',
  '[role="menu"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[contenteditable]:not([contenteditable="false"])',
  "[data-timeline-clip]",
  "[data-clip-id]",
  "[data-clip-trim-edge]",
  "[data-timeline-keyframe]",
  "[data-timeline-playhead]",
  '[data-action-ui-id="clip-studio.timeline.ruler"]',
  "[data-clip-studio-canvas-preview]",
  "[data-clip-studio-export-dialog-layer]",
  ".react-flow__resize-control",
  ".react-flow__handle"
].join(",");

let muted = false;
let preference;
let revision = 0;
let reading;
let pendingWrites = 0;
let writes = Promise.resolve();
const muteListeners = /* @__PURE__ */ new Set();
function subscribeMute(listener) {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}
function publish(value) {
  if (muted === value) return;
  muted = value;
  for (const listener of muteListeners) listener();
}
function getMediaMuted() {
  return muted;
}
function refreshMediaMuted() {
  const current2 = preference;
  if (!current2 || pendingWrites > 0) return Promise.resolve(muted);
  const version2 = revision;
  if (reading?.preference === current2 && reading.revision === version2) return reading.promise;
  const promise = Promise.resolve().then(() => current2.read()).then((value) => {
    if (preference === current2 && version2 === revision && pendingWrites === 0) publish(value);
    return muted;
  }).finally(() => {
    if (reading?.promise !== promise) return;
    const again = reading.again;
    reading = void 0;
    if (again) refresh();
  });
  reading = { preference: current2, revision: version2, again: false, promise };
  return promise;
}
const refresh = () => {
  void refreshMediaMuted().catch(() => {
  });
};
function bindMediaMutedPreference(next2) {
  preference = next2;
  const unsubscribe = next2.subscribe?.(() => {
    if (reading?.preference === next2) reading.again = true;
    else refresh();
  });
  refresh();
  return () => {
    unsubscribe?.();
    if (preference === next2) {
      preference = void 0;
    }
  };
}
function setMediaMuted(value) {
  const current2 = preference;
  revision += 1;
  publish(value);
  if (!current2) return Promise.resolve();
  pendingWrites += 1;
  const operation2 = writes.catch(() => {
  }).then(() => current2.write(value));
  writes = operation2;
  return operation2.finally(() => {
    pendingWrites -= 1;
    if (pendingWrites === 0) refresh();
  });
}
function toggle() {
  void setMediaMuted(!muted).catch(() => {
  });
}
function useMediaMuted() {
  return {
    muted: reactExports.useSyncExternalStore(subscribeMute, getMediaMuted, () => false),
    toggle
  };
}

function isCompactEditorBlank(event) {
  return !event.composedPath().some((target) => target instanceof Element && target.matches(editorControls));
}

export { getMediaMuted, subscribeMute, toggle, setMediaMuted, refreshMediaMuted, bindMediaMutedPreference, useMediaMuted, isCompactEditorBlank };
