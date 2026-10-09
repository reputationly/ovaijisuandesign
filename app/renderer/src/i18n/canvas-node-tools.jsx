// canvas-node-tools.jsx
import { reactExports, ReactFlowProvider } from "../vendor.js";
import {
  CanvasTagColorsContext,
  CanvasTagFilterActiveContext,
  createNodeTagColorStore,
  NodeTagColorStoreContext,
} from "../infra/create-recently-added-store.js";
import {
  HtmlFullscreenStoreContext,
  HtmlFullscreenStoreProvider,
} from "../infra/use-plugin-metadata-store.js";
import { CanvasReleaseRegionContext } from "../canvas/separator.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { createHtmlFullscreenStore } from "../infra/create-html-fullscreen-store.js";
import { CanvasViewInner } from "../canvas/canvas-view-inner.jsx";
import {
  _markUserReady,
  _pendingUser,
  _userBindingInFlightVersion,
  _userBindingVersion,
  _userReady,
  _userReadyPromise,
} from "../infra/init-track.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { buildRumInitStatusTrackProps } from "./init-rum.js";
const CanvasReleaseRegionProvider = CanvasReleaseRegionContext.Provider;
const PAGE_MAP = {
  "/": "Home",
  "/projects": "Projects",
  "/projects/": "Projects",
  "/skills": "Skills",
  "/skills/": "Skills",
  "/workflows": "ComfyUI Workflows",
  "/workflows/": "ComfyUI Workflows",
  "/workspace": "Workspace",
  "/workspace/": "Workspace",
};
function resolvePageTitle(pathname) {
  return (
    PAGE_MAP[pathname] ?? PAGE_MAP[pathname.replace(/\/$/, "")] ?? pathname
  );
}
const CanvasTagColorsProvider = CanvasTagColorsContext.Provider;
const CanvasTagFilterActiveProvider = CanvasTagFilterActiveContext.Provider;
const EMPTY_TAG_COLOR_RESOLVER = () => [];
function NodeTagColorStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    NodeTagColorStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
function useOptionalHtmlFullscreenApi() {
  return reactExports.useContext(HtmlFullscreenStoreContext);
}
function CanvasViewProviders({
  region = "overseas",
  tagColorResolver,
  tagFilterActive = false,
  children: children2,
}) {
  const [tagColorStore] = reactExports.useState(createNodeTagColorStore);
  const parentHtmlFullscreenStore = useOptionalHtmlFullscreenApi();
  const [ownHtmlFullscreenStore] = reactExports.useState(
    createHtmlFullscreenStore,
  );
  const htmlFullscreenStore =
    parentHtmlFullscreenStore ?? ownHtmlFullscreenStore;
  return (
    <CanvasReleaseRegionProvider value={region}>
      <CanvasTagFilterActiveProvider value={tagFilterActive}>
        <CanvasTagColorsProvider
          value={tagColorResolver ?? EMPTY_TAG_COLOR_RESOLVER}
        >
          <NodeTagColorStoreProvider store={tagColorStore}>
            <HtmlFullscreenStoreProvider store={htmlFullscreenStore}>
              <ReactFlowProvider>{children2}</ReactFlowProvider>
            </HtmlFullscreenStoreProvider>
          </NodeTagColorStoreProvider>
        </CanvasTagColorsProvider>
      </CanvasTagFilterActiveProvider>
    </CanvasReleaseRegionProvider>
  );
}
export const HiloCanvasView = reactExports.forwardRef(
  function HiloCanvasView2(props, ref) {
    return (
      <CanvasViewProviders
        region={props.region}
        tagColorResolver={props.tagColorResolver}
        tagFilterActive={props.tagFilterActive}
      >
        <CanvasViewInner {...props} handleRef={ref} />
      </CanvasViewProviders>
    );
  },
);
export function getAttachmentSlotActions({
  kind,
  ready,
  readOnly: readOnly2 = false,
  busy = false,
  canReference = false,
  canReplace = false,
  canEdit = false,
  canLocate = false,
  hasPreview = false,
}) {
  const editable2 = ready && !readOnly2 && !busy;
  const visual = kind === "image" || kind === "video";
  return {
    reference: editable2 && canReference,
    replace: editable2 && canReplace,
    edit: editable2 && kind === "image" && canEdit,
    remove: !readOnly2 && !busy,
    preview: ready && visual && hasPreview,
    locate: ready && visual && canLocate,
  };
}
export function resolveTrackingDomain(rawUrl) {
  try {
    const url2 = new URL(rawUrl);
    if (url2.protocol !== "http:" && url2.protocol !== "https:") return null;
    return url2.hostname.toLowerCase().replace(/\.$/u, "") || null;
  } catch {
    return null;
  }
}
const CANVAS_NODE_TOOLS = [
  "erase",
  "redraw",
  "crop",
  "outpaint",
  "move-object",
  "image-inplace-edit",
  "rotate",
  "split-grid",
  "super-resolution",
  "remove-bg",
  "color-adjust",
  "promote-to-asset",
  "customize-toolbar",
  "add-to-chat",
  "add-to-timeline",
  "more",
  "fullscreen",
  "enhance-video",
  "erase-subtitle",
  "asr",
  "clip",
  "extract-frame",
  "extract-audio",
  "capture-frame",
  "voice-isolate",
  "text-to-text",
  "copy",
  "other",
];
export function normalizeCanvasNodeTool(value) {
  return CANVAS_NODE_TOOLS.includes(value) ? value : "other";
}
export function waitForUserReady(timeoutMs = 1500) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    _userReadyPromise.then(finish);
    setTimeout(() => {
      if (
        !_userReady &&
        !_pendingUser &&
        _userBindingInFlightVersion !== _userBindingVersion
      ) {
        _markUserReady();
      }
      finish();
    }, timeoutMs);
  });
}
export function markTrackUserAnonymous() {
  if (
    _userReady ||
    _pendingUser ||
    _userBindingInFlightVersion === _userBindingVersion
  )
    return;
  _markUserReady();
}
export function useTrackPageView(pathname) {
  const lastRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (lastRef.current === pathname) return;
    lastRef.current = pathname;
    trackEvent(TRACK_EVENTS.PAGE_VIEW, {
      page_url: pathname,
      page_title: resolvePageTitle(pathname),
    });
  }, [pathname]);
}
const RUM_INIT_STATUS_REPORT_DELAY_MS = 3e3;
const RUM_INIT_STATUS_SNAPSHOT_DELAY_MS = 1e4;
export function scheduleRumInitStatusTrackReports(
  report,
  schedule2 = (handler, delayMs) => window.setTimeout(handler, delayMs),
) {
  schedule2(() => {
    report(buildRumInitStatusTrackProps("bootstrap_post_track_init"));
  }, RUM_INIT_STATUS_REPORT_DELAY_MS);
  schedule2(() => {
    report(buildRumInitStatusTrackProps("bootstrap_snapshot_10s"));
  }, RUM_INIT_STATUS_SNAPSHOT_DELAY_MS);
}
export const canvas_lyrics = "Lyrics";
export const error_auth_unauthorized = "Please sign in to continue.";
export const error_input_audio_blocked =
  "Your input audio failed safety check. Please check your audio and try again.";
export const error_input_image_blocked =
  "Your input image failed safety check. Please check your image and try again.";
export const error_input_text_blocked =
  "Your prompt failed safety check. Please check your content and try again.";
export const error_input_video_blocked =
  "Your input video failed safety check. Please check your video and try again.";
export const error_network_reconnecting =
  "Connection lost. Reconnecting to fetch your result…";
export const error_safety_image_output_blocked =
  "The generated image failed safety review. Please revise your prompt or reference and try again.";
export const error_seedance_free_quota_exhausted =
  "Seedance is temporarily unavailable. Please try again later.";
export const error_seedance_member_locked =
  "Seedance is not available on your current plan. Please upgrade to continue.";
export const model_input_error_general =
  "The provided input does not meet the model's requirements.";
