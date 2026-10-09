// use-lightbox-media-actions.jsx
import { jsxRuntimeExports, reactExports, useStore$3, CompositedSvg, useTranslation, Position, reactDomExports, __insertCSS, withAutomaticDedupeId, dedupedToast, toast, Copy, Archive, MenuRoot, MenuTrigger, MenuPortal, MenuPositioner, MenuPopup, MenuItem$3, MenuSubmenuRoot, MenuSubmenuTrigger, NodeToolbar$1, ActionListPanel, ActionListItem, ActionListSeparator } from "../vendor.js";
import { useNativeViewOcclusion, TOOLBAR_ANIM_MS, zoomSelector$8, useDelayedUnmount, HEADER_FLOW_HEIGHT$3, TOOLBAR_GAP$5 } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { TooltipProvider$1 } from "../m15/create-recently-added-store.jsx";
import { useCanvasBridge, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, Download, FolderOpen, useCanvasActive, useCanvasIsDragging } from "../m15/parse-item.jsx";
import { parseNodeId } from "../m15/resolve-derived-collision.js";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1 } from "./create-tracker.jsx";
import { DropdownArrowIcon } from "./generating-media-area.jsx";
import { useSuspendCanvasInteractions } from "./use-inline-rename.jsx";
export function isCloneData(data2) {
  return data2?.cloneOf != null;
}
const PROGRESS_UPDATE_INTERVAL_MS = 500;
const H3_MAX_PROGRESS_DURATION_MS = 4e4;
const H3_MAX_PROGRESS_CAP = 95;
const PROFILES = {
  // 2min→90%, 7min→99%；起步约 2%/s，尾段几十秒涨 1%
  image: {
    ceiling: 99,
    tau: 50,
  },
  // 8min→80%, 18min→99%；起步约 0.3%/s，尾段慢爬
  video: {
    ceiling: 102.5,
    tau: 320,
  },
  // 音频生成通常较快，复用图片档
  audio: {
    ceiling: 99,
    tau: 50,
  },
  // LLM 文本生成很快：30s→~91%, 55s→~98%, ~64s→99%
  text: {
    ceiling: 99,
    tau: 12,
  },
};
function calculateProgress(kind, originMs, nowMs, profile) {
  const elapsedMs2 = Math.max(0, nowMs - originMs);
  if (profile === "h3-max-video") {
    return Math.min(
      H3_MAX_PROGRESS_CAP,
      Math.round((elapsedMs2 / H3_MAX_PROGRESS_DURATION_MS) * H3_MAX_PROGRESS_CAP),
    );
  }
  const { ceiling, tau } = PROFILES[kind];
  const elapsed = elapsedMs2 / 1e3;
  return Math.min(99, Math.round(ceiling * (1 - Math.exp(-elapsed / tau))));
}
function calculateInitialProgress(active2, kind, startedAt, profile) {
  if (!active2) return 0;
  const nowMs = Date.now();
  return calculateProgress(kind, parseGenerationStartedAt(startedAt) ?? nowMs, nowMs, profile);
}
export function parseGenerationStartedAt(value) {
  if (!value) return void 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : void 0;
}
export function readGenerationStartedAt(data2) {
  const value = data2?.generationStartedAt;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationAttemptId(data2) {
  const value = data2?.generationAttemptId;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
export function readGenerationSubmittedAt(data2) {
  const receipt = data2?.generationTaskReceipt;
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return void 0;
  const submittedAt = receipt.submittedAt;
  if (typeof submittedAt !== "number" || !Number.isFinite(submittedAt) || submittedAt < 0) {
    return void 0;
  }
  const date2 = new Date(submittedAt);
  return Number.isFinite(date2.getTime()) ? date2.toISOString() : void 0;
}
export function resolveGenerationProgressStartedAt(data2, persistedActive, inMemoryStartedAt) {
  return (persistedActive ? readGenerationStartedAt(data2) : void 0) ?? inMemoryStartedAt;
}
export function useSimulatedProgress(active2, kind = "image", startedAt, profile, attemptKey) {
  const [progress, setProgress] = reactExports.useState(() =>
    calculateInitialProgress(active2, kind, startedAt, profile),
  );
  const resolvedAttemptKey = attemptKey ?? startedAt;
  const progressAttemptKeyRef = reactExports.useRef(resolvedAttemptKey);
  reactExports.useEffect(() => {
    const isNewAttempt = progressAttemptKeyRef.current !== resolvedAttemptKey;
    progressAttemptKeyRef.current = resolvedAttemptKey;
    if (!active2) {
      setProgress(0);
      return;
    }
    const originMs = parseGenerationStartedAt(startedAt) ?? Date.now();
    let resetOnNextTick = isNewAttempt;
    const tick = () => {
      const nextProgress = calculateProgress(kind, originMs, Date.now(), profile);
      if (resetOnNextTick) {
        resetOnNextTick = false;
        setProgress(nextProgress);
        return;
      }
      setProgress((currentProgress) => Math.max(currentProgress, nextProgress));
    };
    tick();
    const intervalId = window.setInterval(tick, PROGRESS_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [active2, kind, startedAt, profile, resolvedAttemptKey]);
  return progress;
}
const warnedKeys = new Set();
export function useWarnMissingAssetMeta(ctx) {
  const { nodeId, nodeType, data: data2, meta: meta2, isUserEmpty } = ctx;
  reactExports.useEffect(() => {
    if (meta2 !== void 0) return;
    if (isUserEmpty) return;
    const key2 = `${nodeType}:${nodeId}`;
    if (warnedKeys.has(key2)) return;
    warnedKeys.add(key2);
    const obj = data2 ?? {};
    const path2 = typeof obj.path === "string" ? obj.path : "<missing>";
    const modelId = typeof obj.model_id === "string" ? obj.model_id : "<missing>";
    const sourceTool = typeof obj.source_tool === "string" ? obj.source_tool : "<missing>";
    const { assetId } = parseNodeId(nodeId);
    const isClone = assetId !== nodeId;
    console.warn(
      [
        `[canvas/${nodeType}-node] node "${nodeId}" rendered an EMPTY wrapper (return null path).`,
        `  reason: AssetMetadataStore has no entry for assetId="${assetId}"${isClone ? " (clone of base id)" : ""}.`,
        `  data.path=${path2}  data.model_id=${modelId}  data.source_tool=${sourceTool}`,
        "  likely causes (in order of probability):",
        "    1. incremental WS sync (canvas_updated) or group-execution in-place replace",
        "       added/replaced this node without calling AssetMetadataStore.setMany().",
        "       → reload the workspace; if it renders, this is the bug.",
        "    2. initial buildCanvasNodes seed missed this assetId (asset deleted",
        "       server-side but canvas file still references it).",
        "       → reload won't help; check use-canvas-data buildCanvasNodes.",
        isClone
          ? "    3. clone routing: this is a clone id (assetId~shortUuid). The BASE"
          : "    3. (n/a — this is not a clone id)",
        isClone ? `       assetId "${assetId}" itself was never registered.` : "",
        "  verify in DevTools console:",
        `    useAssetMetadataStore.getState().assets.get(${JSON.stringify(assetId)})`,
        "  expected: an AssetMeta object with url/name/path/type. actual: undefined.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }, [nodeId, nodeType, meta2, isUserEmpty, data2]);
}
__insertCSS(
  "[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}",
);
function createDedupedMethod(kind, method) {
  return (message2, data2) => method(message2, withAutomaticDedupeId(kind, message2, data2));
}
Object.assign(dedupedToast, {
  success: createDedupedMethod("success", toast.success),
  info: createDedupedMethod("info", toast.info),
  warning: createDedupedMethod("warning", toast.warning),
  error: createDedupedMethod("error", toast.error),
  message: (message2, data2) =>
    toast.message(message2, withAutomaticDedupeId("normal", message2, data2)),
  loading: toast.loading,
  promise: toast.promise,
  custom: toast.custom,
  dismiss: toast.dismiss,
  getHistory: toast.getHistory,
  getToasts: toast.getToasts,
});
export function isDraftSubmitFormDisabled(modelsLoading, isPreparing) {
  return modelsLoading || isPreparing;
}
export function shouldPersistPopoverDraftOnUnmount(submitted, modelLoaded) {
  return !submitted && modelLoaded;
}
export async function submitWithPersistedPopoverDraft({
  draft,
  saveDraft: saveDraft2,
  markSubmitted,
  submit,
}) {
  saveDraft2?.({
    ...draft,
    source: "submitted",
  });
  const accepted = await submit();
  if (accepted === false) return false;
  markSubmitted();
  return true;
}
async function submitAfterDraftFlush({ flushDraft, submit, onFlushError }) {
  try {
    await flushDraft();
  } catch (error) {
    console.error("[canvas] Failed to persist popover draft before generation", error);
    onFlushError(error);
    return false;
  }
  submit();
  return true;
}
export function submitAfterOptionalDraftFlush({ shouldFlush, ...options }) {
  if (!shouldFlush) {
    options.submit();
    return true;
  }
  return submitAfterDraftFlush(options);
}
const INSTRUMENTAL_PARAM_VALUES = new Set(["instrumental", "true"]);
function getCompositionPlanLyrics(compositionPlan) {
  if (!compositionPlan?.trim()) return void 0;
  try {
    const parsed = JSON.parse(compositionPlan);
    if (!parsed || typeof parsed !== "object") return void 0;
    const plan = parsed;
    if (Array.isArray(plan.chunks)) {
      const blocks = plan.chunks
        .map((chunk2) => {
          if (!chunk2 || typeof chunk2 !== "object") return "";
          const text2 = chunk2.text;
          return typeof text2 === "string" ? text2.trim() : "";
        })
        .filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
    if (Array.isArray(plan.sections)) {
      const blocks = plan.sections
        .map((section) => {
          if (!section || typeof section !== "object") return "";
          const lines = section.lines;
          if (!Array.isArray(lines)) return "";
          return lines
            .filter((line) => typeof line === "string")
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean);
      return blocks.length > 0 ? blocks.join("\n\n") : void 0;
    }
  } catch {
    return void 0;
  }
  return void 0;
}
function isInstrumentalAudioAsset(meta2) {
  const mode2 = meta2?.params?.is_instrumental;
  return mode2 !== void 0 && INSTRUMENTAL_PARAM_VALUES.has(mode2);
}
export function getDisplayLyrics(meta2) {
  if (!meta2 || isInstrumentalAudioAsset(meta2)) return void 0;
  if (meta2.lyrics?.trim()) return meta2.lyrics;
  return getCompositionPlanLyrics(meta2.compositionPlan);
}
export function resolveCanvasPlatform(platform2) {
  const value = (
    typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent
  ).toLowerCase();
  if (value.includes("mac")) return "mac";
  if (value.includes("win")) return "windows";
  return "other";
}
export function resolveCanvasShortcut$1(accelerator, platform2) {
  const os2 = resolveCanvasPlatform();
  if (os2 === "mac") {
    if (accelerator === "redo") return ["⇧", "⌘", "Z"];
    if (accelerator === "copyDebug") return ["⌘", "⌥", "C"];
    return ["⌘", accelerator === "paste" ? "V" : "Z"];
  }
  if (accelerator === "redo") return ["Ctrl", "Shift", "Z"];
  if (accelerator === "copyDebug") return ["Ctrl", "Alt", "C"];
  return ["Ctrl", accelerator === "paste" ? "V" : "Z"];
}
export function getCanvasFileManagerLabelKey(platform2) {
  const os2 = resolveCanvasPlatform();
  if (os2 === "mac") return "canvas.lightbox.openInFinder";
  if (os2 === "windows") return "canvas.lightbox.openInFileExplorer";
  return "canvas.lightbox.openInFileManager";
}
export function getLightboxSlotKey(slot) {
  return `${slot.round ?? 0}:${slot.id}`;
}
export function lightboxItemFromAssetMeta(kind, meta2) {
  if (!meta2?.url) return void 0;
  return {
    kind,
    url: meta2.url,
    filePath: meta2.path,
    fileName: meta2.name,
  };
}
function getLightboxNodeAssetId(node2) {
  const dataAssetId = node2?.data?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0) return dataAssetId;
  return typeof node2?.assetId === "string" && node2.assetId.length > 0 ? node2.assetId : void 0;
}
export function normalizeLegacyLightboxItems(kind, items, item, sources, src) {
  if (items && items.length > 0) {
    return items.filter((candidate) => !!candidate.url);
  }
  if (item?.url) {
    return [item];
  }
  const urls = sources && sources.length > 0 ? sources : src ? [src] : [];
  const normalized = [];
  for (const url2 of urls) {
    if (typeof url2 !== "string" || url2.length === 0) continue;
    const candidate = {
      kind,
      url: url2,
    };
    if (
      normalized.some(
        (existing) =>
          existing.kind === candidate.kind &&
          existing.url === candidate.url &&
          existing.filePath === candidate.filePath,
      )
    ) {
      continue;
    }
    normalized.push(candidate);
  }
  return normalized;
}
export function lightboxItemsFromSlots(kind, slots, options) {
  return slots.flatMap((slot) => {
    if (!slot.url) return [];
    const node2 = options.nodes?.find((candidate) => {
      const candidateAssetId = getLightboxNodeAssetId(candidate);
      return candidate.id === slot.id || candidateAssetId === slot.id;
    });
    const nodeAssetId = getLightboxNodeAssetId(node2);
    const slotMeta =
      options.getMetaById(slot.id) ??
      (nodeAssetId ? options.getMetaById(nodeAssetId) : void 0) ??
      (node2 ? options.getMetaById(node2.id) : void 0) ??
      (slot.id === options.primarySlotId ? options.primaryMeta : void 0);
    return [
      {
        kind,
        slotKey: getLightboxSlotKey(slot),
        url: slot.url,
        filePath: slotMeta?.path,
        fileName: slotMeta?.name,
      },
    ];
  });
}
export function resolveLightboxIndexForSlot(items, slot, fallbackIndex) {
  if (!slot) return fallbackIndex;
  const slotKey = getLightboxSlotKey(slot);
  const stableIndex = items.findIndex((item) => item.slotKey === slotKey);
  if (stableIndex >= 0) return stableIndex;
  if (!slot.url) return fallbackIndex;
  const legacyIndex = items.findIndex((item) => item.url === slot.url);
  return legacyIndex >= 0 ? legacyIndex : fallbackIndex;
}
function getLightboxDownloadSource(item) {
  return item?.filePath || item?.url || void 0;
}
function getLightboxDownloadFileName(item) {
  if (item?.fileName) return item.fileName;
  const source = getLightboxDownloadSource(item);
  if (!source) return void 0;
  const clean = source.split(/[?#]/)[0] ?? source;
  return clean.split("/").pop() || void 0;
}
function getLightboxCopySource(item) {
  if (item?.kind !== "image") return void 0;
  return item.filePath || item.url || void 0;
}
function isLightboxItemCopyable(item, onCopyImage) {
  return !!getLightboxCopySource(item) && !!onCopyImage;
}
function isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs) {
  if (!item?.url) return false;
  if (item.filePath && onSaveAs) return true;
  return !!onSaveUrlAs;
}
function getBatchDownloadableLightboxItems(items) {
  if (!items || items.length === 0) return [];
  const seen2 = new Set();
  const downloadable = [];
  for (const item of items) {
    const downloadSource = getLightboxDownloadSource(item);
    if (!downloadSource) continue;
    if (seen2.has(downloadSource)) continue;
    seen2.add(downloadSource);
    downloadable.push({
      ...item,
      downloadSource,
    });
  }
  return downloadable;
}
const CONTEXT_MENU_WIDTH = 176;
const CONTEXT_MENU_ROW_HEIGHT = 32;
const CONTEXT_MENU_PADDING = 8;
const VIEWPORT_MARGIN$5 = 8;
export function useLightboxMediaActions({ item, items }) {
  const { t: t2 } = useTranslation();
  const { onCopyImage, onSaveAs, onSaveManyAs, onSaveUrlAs, onShowInFolder } = useCanvasBridge();
  const [menuPoint, setMenuPoint] = reactExports.useState(null);
  const canCopy = isLightboxItemCopyable(item, onCopyImage);
  const canSave = isLightboxItemDownloadable(item, onSaveAs, onSaveUrlAs);
  const canReveal = !!item?.filePath && !!onShowInFolder;
  const batchDownloadableItems = reactExports.useMemo(
    () => getBatchDownloadableLightboxItems(items),
    [items],
  );
  const canSaveAll = batchDownloadableItems.length > 1 && !!onSaveManyAs;
  const canOpenMenu = canCopy || canSave || canReveal || canSaveAll;
  const handleCopyImage = reactExports.useCallback(() => {
    const source = getLightboxCopySource(item);
    if (!source || !onCopyImage) return;
    onCopyImage(source);
    setMenuPoint(null);
  }, [item, onCopyImage]);
  const handleDownload = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (item?.filePath && onSaveAs) {
        onSaveAs(item.filePath, getLightboxDownloadFileName(item));
        return;
      }
      if (item?.url && onSaveUrlAs) {
        onSaveUrlAs(item.url, getLightboxDownloadFileName(item));
      }
    },
    [item, onSaveAs, onSaveUrlAs],
  );
  const handleDownloadAll = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
      onSaveManyAs(
        batchDownloadableItems.map((candidate) => ({
          filePath: candidate.downloadSource,
          fileName: getLightboxDownloadFileName(candidate),
        })),
      );
    },
    [batchDownloadableItems, onSaveManyAs],
  );
  const handleContextMenu = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canOpenMenu) {
        setMenuPoint(null);
        return;
      }
      const rowCount = Number(canCopy) + Number(canSave) + Number(canSaveAll) + Number(canReveal);
      setMenuPoint(clampMenuPoint(event.clientX, event.clientY, rowCount));
    },
    [canOpenMenu, canCopy, canSave, canSaveAll, canReveal],
  );
  const handleSaveAs = reactExports.useCallback(() => {
    if (item?.filePath && onSaveAs) {
      onSaveAs(item.filePath, getLightboxDownloadFileName(item));
      setMenuPoint(null);
      return;
    }
    if (item?.url && onSaveUrlAs) {
      onSaveUrlAs(item.url, getLightboxDownloadFileName(item));
    }
    setMenuPoint(null);
  }, [item, onSaveAs, onSaveUrlAs]);
  const handleShowInFolderAction = reactExports.useCallback(() => {
    if (!item?.filePath || !onShowInFolder) return;
    onShowInFolder(item.filePath);
    setMenuPoint(null);
  }, [item?.filePath, onShowInFolder]);
  const handleShowInFolder = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleShowInFolderAction();
    },
    [handleShowInFolderAction],
  );
  const handleSaveAllAs = reactExports.useCallback(() => {
    if (!onSaveManyAs || batchDownloadableItems.length <= 1) return;
    onSaveManyAs(
      batchDownloadableItems.map((candidate) => ({
        filePath: candidate.downloadSource,
        fileName: getLightboxDownloadFileName(candidate),
      })),
    );
    setMenuPoint(null);
  }, [batchDownloadableItems, onSaveManyAs]);
  const itemActionKey = `${item?.kind ?? ""}\0${item?.url ?? ""}\0${item?.filePath ?? ""}`;
  reactExports.useEffect(() => {
    setMenuPoint((point2) => (point2 && itemActionKey ? null : point2));
  }, [itemActionKey]);
  reactExports.useEffect(() => {
    if (!menuPoint) return;
    const close2 = () => setMenuPoint(null);
    const handleKeyDown2 = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close2();
      }
    };
    document.addEventListener("mousedown", close2);
    document.addEventListener("keydown", handleKeyDown2, true);
    window.addEventListener("blur", close2);
    return () => {
      document.removeEventListener("mousedown", close2);
      document.removeEventListener("keydown", handleKeyDown2, true);
      window.removeEventListener("blur", close2);
    };
  }, [menuPoint]);
  const contextMenu = reactExports.useMemo(() => {
    if (!menuPoint || !canOpenMenu) return null;
    return (
      <LightboxMediaContextMenu
        x={menuPoint.x}
        y={menuPoint.y}
        copyLabel={t2("common.copy")}
        saveLabel={t2("common.saveAs")}
        saveAllLabel={t2("canvas.lightbox.downloadAll")}
        showInFolderLabel={t2(getCanvasFileManagerLabelKey())}
        canCopy={canCopy}
        canSave={canSave}
        canSaveAll={canSaveAll}
        canReveal={canReveal}
        onCopy={handleCopyImage}
        onSaveAs={handleSaveAs}
        onSaveAllAs={handleSaveAllAs}
        onShowInFolder={handleShowInFolderAction}
      />
    );
  }, [
    menuPoint,
    canOpenMenu,
    t2,
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleSaveAs,
    handleSaveAllAs,
    handleShowInFolderAction,
  ]);
  return {
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu,
  };
}
function LightboxDownloadButton({ label, dataActionUiId, onClick, className }) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      aria-label={label}
      title={label}
      className={cn$5(
        "pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white/80 transition-[background-color,color,transform] duration-150 hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60",
        className,
      )}
      onClick={onClick}
    >
      <Download size={14} strokeWidth={1} aria-hidden={true} />
    </button>
  );
}
export function LightboxActionButton({
  label,
  dataActionUiId,
  icon: Icon2,
  iconElement,
  onClick,
  className,
  disabled: disabled2 = false,
  busy = false,
}) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      aria-label={label}
      aria-busy={busy || void 0}
      title={label}
      disabled={disabled2}
      className={cn$5(
        "pointer-events-auto inline-flex h-8 min-w-[8.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 text-xs font-normal text-white/85 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-black/70 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-white/10 disabled:hover:bg-black/55 disabled:hover:text-white/85 disabled:active:scale-100",
        className,
      )}
      onClick={onClick}
    >
      {iconElement ?? (Icon2 ? <Icon2 size={14} strokeWidth={1.25} aria-hidden={true} /> : null)}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
function LightboxMediaContextMenu({
  x: x2,
  y: y4,
  copyLabel,
  saveLabel,
  saveAllLabel,
  showInFolderLabel,
  canCopy,
  canSave,
  canSaveAll,
  canReveal,
  onCopy,
  onSaveAs,
  onSaveAllAs,
  onShowInFolder,
}) {
  return reactDomExports.createPortal(
    <div
      role="menu"
      tabIndex={-1}
      data-action-ui-id="canvas.media-lightbox.context-menu"
      className="fixed z-[10000] min-w-44 rounded-lg border border-white/10 bg-neutral-950/95 p-1 text-xs text-white/85 shadow-lg"
      style={{
        left: x2,
        top: y4,
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {canCopy && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.copy"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onCopy}
        >
          <Copy size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{copyLabel}</span>
        </button>
      )}
      {canSave && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.save-as"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onSaveAs}
        >
          <Download size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveLabel}</span>
        </button>
      )}
      {canSaveAll && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.save-all-as"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onSaveAllAs}
        >
          <Archive size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{saveAllLabel}</span>
        </button>
      )}
      {canReveal && (
        <button
          type="button"
          data-action-ui-id="canvas.media-lightbox.context-menu.show-in-folder"
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          onClick={onShowInFolder}
        >
          <FolderOpen size={14} strokeWidth={1.25} aria-hidden={true} />
          <span>{showInFolderLabel}</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
function clampMenuPoint(x2, y4, rowCount) {
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const width = CONTEXT_MENU_WIDTH;
  const height = rowCount * CONTEXT_MENU_ROW_HEIGHT + CONTEXT_MENU_PADDING;
  const maxX = Math.max(VIEWPORT_MARGIN$5, viewportWidth - width - VIEWPORT_MARGIN$5);
  const maxY = Math.max(VIEWPORT_MARGIN$5, viewportHeight - height - VIEWPORT_MARGIN$5);
  return {
    x: Math.min(Math.max(x2, VIEWPORT_MARGIN$5), maxX),
    y: Math.min(Math.max(y4, VIEWPORT_MARGIN$5), maxY),
  };
}
const CANVAS_DIRECTIONAL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
function decideCanvasShortcutGuardKeydown(event, targetEditable) {
  if ((event.key === "Delete" || event.key === "Backspace") && !targetEditable) {
    return "stop-immediate";
  }
  if (event.key === "Escape") {
    return "allow";
  }
  if (CANVAS_DIRECTIONAL_KEYS.has(event.key) && !targetEditable) {
    return "stop";
  }
  const meta2 = event.metaKey === true || event.ctrlKey === true;
  const viewportShortcut =
    event.shiftKey === true && (event.code === "Digit1" || event.code === "Digit2");
  if (meta2 || viewportShortcut) {
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
function isEditableTarget$4(target) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}
function isInsideGuardRoot(target, rootRef) {
  const root2 = rootRef?.current;
  return !!root2 && target instanceof Node && root2.contains(target);
}
export function useCanvasShortcutGuard$1(
  enabled = true,
  rootRef,
  allowHorizontalArrowKeys = false,
) {
  const active2 = useCanvasActive();
  useSuspendCanvasInteractions(enabled);
  reactExports.useEffect(() => {
    if (!enabled || !active2) return;
    const deleteKeyCapture = (event) => {
      const decision = decideCanvasShortcutGuardKeydown(event, isEditableTarget$4(event.target));
      const directionalKey = CANVAS_DIRECTIONAL_KEYS.has(event.key);
      const ownedDirectionalKey =
        allowHorizontalArrowKeys && (event.key === "ArrowLeft" || event.key === "ArrowRight");
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
      const decision = decideCanvasShortcutGuardKeydown(event, isEditableTarget$4(event.target));
      if (decision !== "stop") return;
      event.stopPropagation();
    };
    const clipboardCapture = (event) => {
      if (!shouldStopCanvasShortcutClipboard(isEditableTarget$4(event.target))) return;
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
  }, [active2, enabled, rootRef, allowHorizontalArrowKeys]);
}
const LIGHTBOX_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "video[controls]",
  "audio[controls]",
].join(",");
function getFocusableElements(root2) {
  return Array.from(root2.querySelectorAll(LIGHTBOX_FOCUSABLE_SELECTOR)).filter((element2) => {
    if (element2.hidden || element2.getAttribute("aria-hidden") === "true") return false;
    const style2 = window.getComputedStyle(element2);
    return style2.display !== "none" && style2.visibility !== "hidden";
  });
}
function getWindowBridge$2() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
export const MediaLightbox$1 = reactExports.memo(function MediaLightbox2({
  onClose,
  children: children2,
  onContextMenu,
  ariaLabel,
  allowHorizontalArrowKeys = false,
}) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  useNativeViewOcclusion(active2);
  const rootRef = reactExports.useRef(null);
  useCanvasShortcutGuard$1(true, rootRef, allowHorizontalArrowKeys);
  const handleKeyDown2 = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        onClose();
        return;
      }
      if (e2.key !== "Tab") return;
      const root2 = rootRef.current;
      if (!root2) return;
      const focusableElements = getFocusableElements(root2);
      e2.preventDefault();
      e2.stopPropagation();
      if (focusableElements.length === 0) {
        root2.focus({
          preventScroll: true,
        });
        return;
      }
      const currentIndex = focusableElements.indexOf(document.activeElement);
      const nextIndex = e2.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex < 0 || currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1;
      focusableElements[nextIndex]?.focus({
        preventScroll: true,
      });
    },
    [onClose],
  );
  reactExports.useEffect(() => {
    if (!active2) return;
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [active2, handleKeyDown2]);
  reactExports.useEffect(() => {
    if (!active2) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.focus({
      preventScroll: true,
    });
    return () => {
      if (previousFocus?.isConnected)
        previousFocus.focus({
          preventScroll: true,
        });
    };
  }, [active2]);
  reactExports.useEffect(() => {
    if (!active2) return;
    const bridge = getWindowBridge$2();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, [active2]);
  const handleBackdropClick = reactExports.useCallback(
    (e2) => {
      if (e2.target === e2.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );
  if (!active2) return null;
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? t2("canvas.fullscreenPreview")}
      tabIndex={-1}
      className="no-drag fixed inset-0 isolate z-[9999] flex items-center justify-center p-16 bg-black/85 backdrop-blur-[8px] cursor-zoom-out animate-[lightbox-fade-in_0.15s_ease-out]"
      onClick={handleBackdropClick}
      onContextMenu={onContextMenu}
      data-action-ui-id="canvas.media-lightbox"
      data-canvas-chrome="true"
    >
      <button
        type="button"
        aria-label={t2("common.close")}
        className="no-drag pointer-events-auto absolute top-8 right-8 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer"
        onClick={onClose}
        data-action-ui-id="canvas.media-lightbox.close"
      >
        <CompositedSvg
          className="pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </CompositedSvg>
      </button>
      {children2}
    </div>,
    document.body,
  );
});
export const AudioLightbox$1 = reactExports.memo(function AudioLightbox2({
  src,
  name: name2,
  lyrics,
  onClose,
  item,
}) {
  const { t: t2 } = useTranslation();
  const current2 = item ?? normalizeLegacyLightboxItems("audio", void 0, void 0, void 0, src)[0];
  const downloadLabel = t2("canvas.downloadAudio");
  const { canSave, handleDownload, handleContextMenu, contextMenu } = useLightboxMediaActions({
    item: current2,
  });
  if (!current2?.url) return null;
  return (
    <MediaLightbox$1 onClose={onClose} onContextMenu={handleContextMenu}>
      <div
        className="flex flex-col items-center gap-4 cursor-default"
        onClick={(e2) => e2.stopPropagation()}
      >
        {name2 && (
          <span className="text-sm font-medium text-white/80 max-w-[60vw] truncate">{name2}</span>
        )}
        {lyrics && (
          <div className="w-[min(480px,80vw)] max-h-[50vh] overflow-y-auto rounded-md border border-white/10 bg-white/5 px-4 py-3">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/85">
              {lyrics}
            </pre>
          </div>
        )}
        <audio src={current2.url} className="w-[min(480px,80vw)]" controls={true} autoPlay={true} />
      </div>
      {contextMenu}
      {canSave && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 pointer-events-auto">
          <LightboxDownloadButton
            label={downloadLabel}
            dataActionUiId="canvas.audio-lightbox.download"
            onClick={handleDownload}
          />
        </div>
      )}
    </MediaLightbox$1>
  );
});
export const NODE_POPOVER_SAFE_GAP = 12;
export function DropdownMenu$1({ ...props }) {
  return <MenuRoot data-slot="dropdown-menu" {...props} />;
}
export function DropdownMenuTrigger$1({ className, ...props }) {
  return (
    <MenuTrigger
      data-slot="dropdown-menu-trigger"
      className={cn$5("select-none outline-none", className)}
      {...props}
    />
  );
}
export function DropdownMenuContent$1({
  className,
  positionerClassName,
  variant,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className={cn$5("isolate z-50 outline-none", positionerClassName)}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="dropdown-menu-content"
          className={cn$5(
            "z-50 flex max-h-(--available-height) min-w-32 origin-(--transform-origin) flex-col overflow-x-hidden overflow-y-auto rounded-lg p-1 outline-none dp-motion-quick-zoom",
            variant === "toolbar" && "canvas-toolbar-menu",
            className,
          )}
          style={
            variant === "toolbar"
              ? void 0
              : {
                  background: "var(--canvas-controls-bg)",
                  color: "var(--canvas-controls-text)",
                  boxShadow: "var(--canvas-shadow-dropdown)",
                }
          }
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}
export function DropdownMenuItem$1({ className, ...props }) {
  return (
    <MenuItem$3
      data-slot="dropdown-menu-item"
      className={cn$5(
        "list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator$1({ className, ...props }) {
  return (
    <hr
      data-slot="dropdown-menu-separator"
      className={cn$5("mx-1 my-1 h-px border-none", className)}
      style={{
        background: "var(--canvas-divider-subtle, var(--canvas-controls-border))",
      }}
      {...props}
    />
  );
}
export function DropdownMenuSub$1({ ...props }) {
  return <MenuSubmenuRoot {...props} />;
}
export function DropdownMenuSubTrigger$1({ className, ...props }) {
  return (
    <MenuSubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn$5(
        "list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-popup-open:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
export function ToolbarSurface({ density = "standard", className, ...props }) {
  return (
    <div
      {...props}
      data-canvas-toolbar="true"
      data-density={density}
      className={cn$5("canvas-toolbar-surface", className)}
    />
  );
}
function NodeToolbarPalette({ items, state: state2 = "entering", density = "standard" }) {
  if (items.length === 0) return null;
  const animation =
    state2 === "entering"
      ? `toolbar-fade-in ${TOOLBAR_ANIM_MS}ms ease-out`
      : `toolbar-fade-out ${TOOLBAR_ANIM_MS}ms ease-in forwards`;
  return (
    <TooltipProvider$1 delay={80} closeDelay={0}>
      <ToolbarSurface
        density={density}
        className="pointer-events-auto relative z-[1] nopan nodrag nokey"
        style={{
          animation,
        }}
        data-canvas-chrome="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {items.map((item, i2) => (
          <ToolbarItem key={item.id} item={item} showSeparator={item.separator && i2 > 0} />
        ))}
      </ToolbarSurface>
    </TooltipProvider$1>
  );
}
function NodeToolbarInner({ items, visible, renderShell, density }) {
  const zoom2 = useStore$3(zoomSelector$8);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const { shouldRender, state: state2 } = useDelayedUnmount(visible, hidden);
  if (items.length === 0) return null;
  if (hidden) return null;
  if (!shouldRender) return null;
  const palette = <NodeToolbarPalette items={items} state={state2} density={density} />;
  if (renderShell) {
    return <>{renderShell(palette)}</>;
  }
  const offset2 = HEADER_FLOW_HEIGHT$3 * zoom2 + TOOLBAR_GAP$5;
  return (
    <NodeToolbar$1 isVisible={true} position={Position.Top} offset={offset2} align="center">
      {palette}
    </NodeToolbar$1>
  );
}
function ToolbarItem({ item, showSeparator }) {
  const hasDropdown = !!item.dropdownItems;
  const hasMainAction = hasDropdown && !!item.onClick;
  const iconOnlyDropdown = hasDropdown && item.hideDropdownArrow;
  const showLabel =
    !!item.label && (!item.icon || (hasDropdown && !iconOnlyDropdown) || item.forceLabel);
  const [open, setOpen] = reactExports.useState(false);
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) item.onDropdownOpen?.();
  };
  const labelEl = showLabel ? (
    <span className="canvas-toolbar-label whitespace-nowrap">{item.label}</span>
  ) : null;
  const newFeatureDot = item.showNewFeatureDot ? <NewFeatureDot /> : null;
  const trailingEl = null;
  const tooltipContent = item.tooltipLabel ? (
    item.tooltipLabel
  ) : item.trailing ? (
    <span className="inline-flex items-center gap-1.5">
      {item.label}
      {item.trailing}
    </span>
  ) : showLabel ? (
    void 0
  ) : (
    item.label
  );
  const separator = showSeparator ? (
    <div className="canvas-toolbar-separator" aria-hidden="true" />
  ) : null;
  if (item.render) {
    return (
      <>
        {separator}
        {item.render()}
      </>
    );
  }
  if (hasMainAction) {
    return (
      <>
        {separator}
        <div className="canvas-toolbar-split">
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className="canvas-toolbar-action"
            data-content={!showLabel ? "icon" : void 0}
          >
            {item.icon}
            {labelEl}
            {newFeatureDot}
            {trailingEl}
          </button>
          <DropdownMenu$1 open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger$1
              disabled={item.disabled}
              className="canvas-toolbar-action canvas-toolbar-disclosure"
              openOnHover={true}
              delay={100}
              closeDelay={150}
            >
              <DropdownArrowIcon />
            </DropdownMenuTrigger$1>
            <ActionListPanel
              className="w-max"
              render={
                <DropdownMenuContent$1
                  variant="toolbar"
                  className="data-open:zoom-in-100 data-closed:zoom-out-100"
                  side="bottom"
                  sideOffset={8}
                  align="center"
                />
              }
            >
              {item.dropdownItems?.map((child, idx) => (
                <DropdownChildSlot
                  key={child.id}
                  child={child}
                  isActive={item.activeChildId === child.id}
                  showSeparator={!!child.separator && idx > 0}
                />
              ))}
            </ActionListPanel>
          </DropdownMenu$1>
        </div>
      </>
    );
  }
  if (hasDropdown) {
    return (
      <>
        {separator}
        <DropdownMenu$1 open={open} onOpenChange={handleOpenChange}>
          <Tooltip$1 content={tooltipContent}>
            <DropdownMenuTrigger$1
              disabled={item.disabled}
              className="canvas-toolbar-action"
              data-action-ui-id={`canvas.toolbar-dropdown-${item.id}`}
              data-content={!showLabel ? "icon" : void 0}
            >
              {item.icon}
              {labelEl}
              {newFeatureDot}
              {trailingEl}
              {item.hideDropdownArrow ? null : <DropdownArrowIcon />}
            </DropdownMenuTrigger$1>
          </Tooltip$1>
          <ActionListPanel
            className="w-max"
            render={
              <DropdownMenuContent$1
                variant="toolbar"
                className="data-open:zoom-in-100 data-closed:zoom-out-100"
                side="bottom"
                sideOffset={8}
                align="center"
              />
            }
          >
            {item.dropdownItems?.map((child, idx) => (
              <DropdownChildSlot
                key={child.id}
                child={child}
                isActive={item.activeChildId === child.id}
                showSeparator={!!child.separator && idx > 0}
              />
            ))}
          </ActionListPanel>
        </DropdownMenu$1>
      </>
    );
  }
  return (
    <>
      {separator}
      <Tooltip$1 content={tooltipContent}>
        <button
          type="button"
          aria-disabled={item.disabled || void 0}
          aria-label={!showLabel && typeof item.label === "string" ? item.label : void 0}
          onClick={item.disabled ? void 0 : item.onClick}
          className="canvas-toolbar-action"
          data-content={!showLabel ? "icon" : void 0}
          data-action-ui-id={item.dataActionUiId}
          data-active={item.active || void 0}
        >
          {item.icon}
          {labelEl}
          {newFeatureDot}
          {trailingEl}
        </button>
      </Tooltip$1>
    </>
  );
}
function DropdownEntry({ child, isActive: isActive2 }) {
  if (child.renderSubmenu) {
    return (
      <DropdownMenuSub$1>
        <ActionListItem
          render={<DropdownMenuSubTrigger$1 />}
          disabled={child.disabled}
          onClick={() => {
            if (!child.disabled) child.onSelect();
          }}
          className="canvas-toolbar-menu-item"
          data-action-ui-id={`canvas.toolbar-menu-${child.id}`}
        >
          {child.icon && (
            <span className="canvas-toolbar-action-list-icon">
              <span>{child.icon}</span>
            </span>
          )}
          <span className="whitespace-nowrap">{child.label}</span>
          {child.showNewFeatureDot ? <NewFeatureDot /> : null}
          <span className="ml-auto pl-3 opacity-60">
            <SubmenuChevron />
          </span>
        </ActionListItem>
        <ActionListPanel
          className="w-max"
          render={
            <DropdownMenuContent$1
              variant="toolbar"
              className="data-open:zoom-in-100 data-closed:zoom-out-100"
              side="right"
              sideOffset={8}
              align="start"
            />
          }
        >
          {child.renderSubmenu()}
        </ActionListPanel>
      </DropdownMenuSub$1>
    );
  }
  return (
    <Tooltip$1 content={child.tooltipLabel} side="right" sideOffset={8}>
      <ActionListItem
        render={<DropdownMenuItem$1 />}
        disabled={child.disabled}
        onClick={() => {
          if (!child.disabled) child.onSelect();
        }}
        className="canvas-toolbar-menu-item"
        data-action-ui-id={`canvas.toolbar-menu-${child.id}`}
        data-active={isActive2 || void 0}
      >
        {child.icon && (
          <span className="canvas-toolbar-action-list-icon">
            <span>{child.icon}</span>
          </span>
        )}
        <span className="whitespace-nowrap">{child.label}</span>
        {child.showNewFeatureDot ? <NewFeatureDot /> : null}
        {child.trailing && (
          <span className="ml-auto flex w-12 shrink-0 items-center pl-3 text-muted-foreground">
            {child.trailing}
          </span>
        )}
      </ActionListItem>
    </Tooltip$1>
  );
}
function NewFeatureDot() {
  return (
    <span
      aria-hidden="true"
      className="relative -top-2 -ml-px inline-block size-[6px] shrink-0 rounded-full bg-[var(--canvas-toolbar-new-feature)]"
    />
  );
}
function SubmenuChevron() {
  return (
    <CompositedSvg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true">
      <path
        d="M2 1L6 5L2 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function DropdownChildSlot({ child, isActive: isActive2, showSeparator }) {
  return (
    <>
      {showSeparator && <ActionListSeparator />}
      <DropdownEntry child={child} isActive={isActive2} />
    </>
  );
}
export const NodeToolbar = reactExports.memo(NodeToolbarInner);
export function rejectedReferencePaths(incomingPaths, existingPaths, admittedPaths) {
  const accepted = new Set([...existingPaths, ...admittedPaths]);
  return incomingPaths.filter((path2) => !accepted.has(path2));
}
export const IMAGE_MODE_KEY = "image_mode";
export const ASPECT_RATIO_PARAM_KEYS = ["aspect_ratio", "ratio"];
export function buildPlaceholderFillData(existingData, staged) {
  return staged
    ? {
        ...existingData,
      }
    : {};
}
