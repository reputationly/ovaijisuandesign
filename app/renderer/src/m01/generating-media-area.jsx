// generating-media-area.jsx
import {
  INACTIVE_NODE_UNMOUNT_GRACE_MS,
  useDelayedFalse,
  reactExports,
  CanvasActiveDeferredContext,
  CanvasBridgeContext,
  useStore$3,
  AssetMetadataStoreContext,
  GeneratingStateStoreContext,
  CompositedSvg,
  withArtworkOpacity,
  PencilRuler,
  Speech,
  Pencil,
  PlaybackPlayIcon$1,
  MEDIA_NODE_RADIUS,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
const TOOL_CONFIRM_REJECT_REASONS = [
  "user_rejected",
  "confirmation_expired",
  "confirmation_unavailable",
];
function isToolConfirmRejectReason(value) {
  return typeof value === "string" && TOOL_CONFIRM_REJECT_REASONS.includes(value);
}
export function parseToolConfirmRejectReason(value) {
  if (!value) return void 0;
  const match2 = value.match(/\[tool-confirm-reject:([a-z_]+)\]/);
  return isToolConfirmRejectReason(match2?.[1]) ? match2[1] : void 0;
}
export const QUEUED_USER_MESSAGE_LIMIT = 20;
export function deriveBusy(agentRunning, pendingReasons) {
  return Boolean(agentRunning) || (pendingReasons?.length ?? 0) > 0;
}
export const DEFAULT_SESSION_NAME = "New Chat";
export const MAX_SESSION_NAME_LENGTH = 50;
export function useInactiveNodeVirtualization(
  isPresented,
  graceMs = INACTIVE_NODE_UNMOUNT_GRACE_MS,
) {
  return useDelayedFalse(isPresented, graceMs);
}
export function useCanvasActiveDeferred() {
  const ctx = reactExports.useContext(CanvasActiveDeferredContext);
  return ctx ?? true;
}
function useShallowStableActions(actions) {
  const ref = reactExports.useRef(actions);
  const prev = ref.current;
  if (!shallowEqualActions(prev, actions)) {
    ref.current = actions;
    return actions;
  }
  return prev;
}
function shallowEqualActions(a2, b3) {
  if (a2 === b3) return true;
  const keysA = Object.keys(a2);
  const keysB = Object.keys(b3);
  if (keysA.length !== keysB.length) return false;
  for (const key2 of keysA) {
    if (a2[key2] !== b3[key2]) return false;
  }
  return true;
}
export function CanvasBridgeProvider({ children: children2, ...actions }) {
  const stable = useShallowStableActions(actions);
  return <CanvasBridgeContext.Provider value={stable}>{children2}</CanvasBridgeContext.Provider>;
}
function createNodeDraggingSelector(nodeId) {
  return (state2) => !!state2.nodeLookup.get(nodeId)?.dragging;
}
export function useCanvasNodeIsDragging(nodeId) {
  const selector2 = reactExports.useMemo(() => createNodeDraggingSelector(nodeId), [nodeId]);
  return useStore$3(selector2);
}
const DEFAULT_VIEWPORT_BUFFER_RATIO = 1.5;
export function useViewportStatus(nodeId, width, height, options) {
  const bufferRatio = DEFAULT_VIEWPORT_BUFFER_RATIO;
  const selector2 = reactExports.useMemo(
    () => (state2) => {
      return classify(state2, nodeId, width, height, bufferRatio);
    },
    [nodeId, width, height, bufferRatio],
  );
  return useStore$3(selector2);
}
function classify(state2, nodeId, nodeWidth, nodeHeight, bufferRatio) {
  const lookup = state2.nodeLookup?.get(nodeId);
  if (!lookup) return "far";
  const pos = lookup.internals?.positionAbsolute ?? lookup.position;
  if (!pos) return "far";
  const [tx, ty, zoom2] = state2.transform;
  if (!zoom2 || zoom2 <= 0) return "far";
  const vLeft = -tx / zoom2;
  const vTop = -ty / zoom2;
  const vRight = vLeft + state2.width / zoom2;
  const vBottom = vTop + state2.height / zoom2;
  const renderBounds = lookup.renderBounds;
  const hostWidth = lookup.measured?.width ?? lookup.width ?? nodeWidth;
  const hostHeight = lookup.measured?.height ?? lookup.height ?? nodeHeight;
  const nLeft = pos.x - (renderBounds?.left ?? 0);
  const nTop = pos.y - (renderBounds?.top ?? 0);
  const nRight = pos.x + hostWidth + (renderBounds?.right ?? 0);
  const nBottom = pos.y + hostHeight + (renderBounds?.bottom ?? 0);
  const visible = !(nRight < vLeft || nLeft > vRight || nBottom < vTop || nTop > vBottom);
  if (visible) return "inView";
  const bufW = (state2.width / zoom2) * (bufferRatio - 1) * 0.5;
  const bufH = (state2.height / zoom2) * (bufferRatio - 1) * 0.5;
  const bLeft = vLeft - bufW;
  const bTop = vTop - bufH;
  const bRight = vRight + bufW;
  const bBottom = vBottom + bufH;
  const near = !(nRight < bLeft || nLeft > bRight || nBottom < bTop || nTop > bBottom);
  return near ? "nearView" : "far";
}
export function AssetMetadataStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    AssetMetadataStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
export function getAssetMetaByNodeIdFromStore(store, key2) {
  return store.getState().assets.get(key2);
}
export function GeneratingStateStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    GeneratingStateStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
export function areNodePropsEqual(prev, next2) {
  if (prev.id !== next2.id) return false;
  if (prev.selected !== next2.selected) return false;
  if (prev.data !== next2.data) return false;
  if (prev.width !== next2.width) return false;
  if (prev.height !== next2.height) return false;
  return true;
}
export function formatFileSize(bytes2) {
  if (typeof bytes2 !== "number" || !Number.isFinite(bytes2) || bytes2 < 0) return void 0;
  if (bytes2 < 1024) return `${bytes2} B`;
  const kb = bytes2 / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
export function getFileExtension(name2) {
  if (!name2) return void 0;
  const idx = name2.lastIndexOf(".");
  if (idx <= 0 || idx === name2.length - 1) return void 0;
  return name2.slice(idx).toLowerCase();
}
const ADD_TO_CHAT_VIEW_BOX = "0 0 20 20";
const ADD_TO_CHAT_PATHS = [
  "M12.1545 15.3767H18.6118",
  "M15.3896 12.1545L15.3896 18.6118",
  "M17.2956 9.34192C17.2956 4.94921 13.7346 1.38821 9.34191 1.38821C4.94919 1.38821 1.3882 4.94921 1.3882 9.34192C1.3882 10.9548 1.38819 14.4074 1.38819 16.186C1.38818 16.7996 1.88394 17.2956 2.49759 17.2956C4.28696 17.2956 7.76843 17.2956 9.34191 17.2956",
  "M5.93323 7.60952L12.7507 7.60952",
  "M5.93323 12.1545L9.34196 12.1545",
];
export function AddToChatIcon({ size: size2 = 20, ...props } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox={ADD_TO_CHAT_VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {ADD_TO_CHAT_PATHS.map((d2) => (
        <path key={d2} d={d2} />
      ))}
    </CompositedSvg>
  );
}
export function AnnotationIcon$1({ size: size2 = 24, ...props } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 11L3 17V20H12L15 17M22.0001 12L17.4001 16.6C17.0262 16.9665 16.5236 17.1717 16.0001 17.1717C15.4766 17.1717 14.9739 16.9665 14.6001 16.6L9.40008 11.4C9.03363 11.0261 8.82837 10.5235 8.82837 10C8.82837 9.47649 9.03363 8.97386 9.40008 8.6L14.0001 4" />
    </CompositedSvg>
  );
}
export const RetryIcon$1 = reactExports.forwardRef(function RetryIcon2(
  { size: size2 = 24, style: style2, ...props },
  ref,
) {
  const ariaHidden = props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={ariaHidden}
      style={withArtworkOpacity(style2, 0.85)}
    >
      <title>{props["aria-label"] ?? "Retry"}</title>
      <path
        d="M20.8128 9.96004C21.1123 10.1009 21.2992 10.4013 21.3011 10.7266C21.4176 11.6856 21.3857 12.6787 21.1858 13.6749C20.1769 18.7026 15.283 21.9609 10.2552 20.9522C7.54129 20.4077 5.34204 18.7293 4.05303 16.5128L5.6087 15.6085C6.64962 17.3984 8.42209 18.7487 10.6097 19.1876C14.3119 19.9301 17.9226 17.8019 19.1399 14.3389L17.5638 14.0225C17.3322 13.9758 17.2431 13.6914 17.4066 13.5206L20.8128 9.96004ZM2.81378 10.3262C3.82264 5.29847 8.71662 2.04025 13.7444 3.04891C16.458 3.59349 18.6567 5.2711 19.9456 7.48738L18.3899 8.39266C17.349 6.60274 15.5775 5.25248 13.3899 4.81355C9.68787 4.07088 6.07735 6.19867 4.85968 9.66121L6.43292 9.97664C6.6646 10.0233 6.75455 10.3077 6.59112 10.4786L3.18389 14.0391C2.88075 13.8966 2.69387 13.5907 2.69659 13.2608C2.58201 12.306 2.61487 11.3178 2.81378 10.3262Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
});
export const FeedbackIcon$1 = reactExports.forwardRef(function FeedbackIcon2(
  { size: size2 = 24, ...props },
  ref,
) {
  const ariaHidden = props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden={ariaHidden}
    >
      <title>{props["aria-label"] ?? "Feedback"}</title>
      <path d="M672 320H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h320c17.6 0 32 14.4 32 32s-14.4 32-32 32ZM544 448H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h192c17.6 0 32 14.4 32 32s-14.4 32-32 32Z" />
      <path d="M960 448v-3.2-3.2-1.6-1.6-3.2-1.6l-1.6-1.6v-1.6-1.6l-1.6-1.6-1.6-1.6-1.6-1.6-1.6-1.6h-1.6L832 352V160c0-52.8-43.2-96-96-96H288c-52.8 0-96 43.2-96 96v192l-112 68.8h-1.6l-1.6 1.6-1.6 1.6-1.6 1.6-1.6 1.6v3.2l-1.6 1.6v430.4c0 52.8 43.2 96 96 96h704c52.8 0 96-43.2 96-96L960 448Zm-92.8 0L832 468.8v-43.2l35.2 22.4ZM288 126.4h448c17.6 0 32 14.4 32 32v350.4l-256 156.8-256-156.8V158.4c0-17.6 14.4-32 32-32Zm-96 342.4L156.8 448l35.2-20.8v41.6ZM864 896H160c-17.6 0-32-14.4-32-32V505.6l368 225.6c1.6 1.6 3.2 1.6 4.8 1.6 1.6 0 1.6 0 3.2 1.6 3.2 0 4.8 1.6 8 1.6s4.8 0 8-1.6c1.6 0 1.6 0 3.2-1.6 1.6 0 3.2-1.6 4.8-1.6l368-225.6V864c0 17.6-14.4 32-32 32Z" />
    </CompositedSvg>
  );
});
const TOOLBAR_STROKE_WIDTH_24 = 1.8;
export function AnnotationIcon({ size: size2 = 20 } = {}) {
  return <AnnotationIcon$1 size={size2} strokeWidth={TOOLBAR_STROKE_WIDTH_24} />;
}
export function TextEditIcon() {
  return <PencilRuler size={20} strokeWidth={TOOLBAR_STROKE_WIDTH_24} aria-hidden="true" />;
}
export function CopyIcon$2() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={TOOLBAR_STROKE_WIDTH_24}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </CompositedSvg>
  );
}
export function MoreVerticalIcon$1({ size: size2 = 16 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </CompositedSvg>
  );
}
export function FullscreenIcon$1() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 2H18V6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 13.5V18H13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 18H2V13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 6.5V2H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function MinimizeIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M15 4.5H11.5V1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 15V11.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 11.5H4.5V15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 1V4.5H1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function RelightIcon({ size: size2 = 18 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform="translate(12 12) scale(1.12) translate(-12 -12)">
        <path d="M15.295 19.562 16 22" />
        <path d="m17 16 3.758 2.098" />
        <path d="m19 12.5 3.026-.598" />
        <path d="M7.61 6.3a3 3 0 0 0-3.92 1.3l-1.38 2.79a3 3 0 0 0 1.3 3.91l6.89 3.597a1 1 0 0 0 1.342-.447l3.106-6.211a1 1 0 0 0-.447-1.341z" />
        <path d="M8 9V2" />
      </g>
    </CompositedSvg>
  );
}
export function StoryboardGridIcon({ size: size2 = 18, strokeWidth = 1.5 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3V21M3 8H8M8 12H16M3 16H8M16 3V21M16 8H21M16 16H21M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" />
    </CompositedSvg>
  );
}
export function PanoramaIcon({ size: size2 = 18 } = {}) {
  return (
    <CompositedSvg width={size2} height={size2} fill="none" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1.48 7.624a.13.13 0 0 1 .198.112.14.14 0 0 1-.045.102c-.299.28-.465.588-.465.912 0 .99 1.543 1.835 3.718 2.174v-.88c0-.192.221-.301.375-.184l1.588 1.222a.35.35 0 0 1-.007.56L5.256 12.8a.233.233 0 0 1-.37-.189v-.565C2.218 11.662.294 10.569.293 9.28c0-.615.438-1.186 1.186-1.656m10.845.112a.13.13 0 0 1 .198-.112c.748.47 1.186 1.041 1.186 1.656 0 1.36-2.14 2.5-5.033 2.824a.2.2 0 0 1-.22-.198v-.716c0-.102.078-.188.18-.2 2.425-.283 4.197-1.179 4.198-2.24 0-.324-.166-.632-.465-.912a.14.14 0 0 1-.044-.102m-1.977-6.355a1.34 1.34 0 0 1 1.254.78q.174.356.174.797v4.294q0 .441-.174.804a1.37 1.37 0 0 1-.496.564 1.35 1.35 0 0 1-.758.21q-.456 0-.779-.21a1.35 1.35 0 0 1-.485-.564 1.9 1.9 0 0 1-.164-.804V2.958q0-.446.169-.803.172-.357.495-.565.323-.21.764-.21M4.622 2.532 3.551 8.75H2.44l1.09-6.229H1.925v-1.06h2.697zm2.073-1.151q.392 0 .665.13.274.128.442.366t.243.575q.08.333.079.744 0 .492-.148 1.062a9 9 0 0 1-.388 1.165q-.238.594-.535 1.175-.298.575-.605 1.09h1.696V8.75H5.238V7.688q.343-.525.664-1.105.323-.58.58-1.166a8 8 0 0 0 .417-1.14q.154-.55.154-1.011 0-.328-.065-.61-.064-.283-.293-.283-.227 0-.292.282a2.7 2.7 0 0 0-.064.61v.506h-1.07v-.505q-.001-.436.073-.784.079-.351.248-.595.169-.247.441-.376.273-.13.664-.13m3.653 1.042a.28.28 0 0 0-.273.168.8.8 0 0 0-.084.367v4.294q0 .213.084.377.084.159.273.16a.29.29 0 0 0 .273-.16.8.8 0 0 0 .084-.377V2.958a.8.8 0 0 0-.084-.377.29.29 0 0 0-.273-.158"
      />
    </CompositedSvg>
  );
}
export function MultiAngleIcon({ size: size2 = 16 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 21.6 21.8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.9 0c1.35 0 2.5.77 3.36 1.87.79.99 1.41 2.31 1.84 3.82q.8.23 1.51.52c1.82.75 3.33 1.88 3.92 3.35a.9.9 0 0 1-1.66.68c-.33-.81-1.3-1.69-2.95-2.36a18 18 0 0 0-9.75-.7 18 18 0 0 0-.37 3.72 18 18 0 0 0 .38 3.72 18 18 0 0 0 8.47-.25l-1.95-.95a.9.9 0 1 1 .79-1.62l3.81 1.86a.9.9 0 0 1 .42 1.2l-1.86 3.82a.9.9 0 1 1-1.62-.8l.87-1.77a20 20 0 0 1-8.38.45q.2.55.44 1C9.03 19.29 10.04 20 10.9 20q.33 0 .66-.13a.9.9 0 0 1 .68 1.66q-.64.27-1.34.27c-1.9 0-3.39-1.52-4.34-3.43a13 13 0 0 1-.87-2.26 13 13 0 0 1-2.26-.87C1.53 14.3 0 12.81 0 10.9s1.52-3.39 3.43-4.34a13 13 0 0 1 2.26-.87q.36-1.24.87-2.26C7.51 1.53 9 0 10.9 0M5.25 7.73q-.55.2-1.02.44c-1.71.86-2.43 1.87-2.43 2.73s.72 1.87 2.43 2.73q.47.23 1.02.44a20 20 0 0 1 0-6.34M10.9 1.8c-.86 0-1.87.72-2.73 2.43q-.24.47-.44 1.02a20 20 0 0 1 6.33 0 8 8 0 0 0-1.2-2.26c-.68-.85-1.36-1.19-1.96-1.19"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function AddToClipNodeIcon({ size: size2 = 20 } = {}) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.4126 18.924V17.7293H2.99391C2.64356 17.7293 2.29665 17.6603 1.97297 17.5262C1.64929 17.3921 1.35518 17.1956 1.10745 16.9479C0.859715 16.7001 0.663202 16.406 0.529129 16.0824C0.395056 15.7587 0.32605 15.4118 0.32605 15.0614V4.93512C0.32605 4.22756 0.607128 3.54898 1.10745 3.04866C1.60777 2.54834 2.28635 2.26726 2.99391 2.26726H12.4126V1.06092C12.435 0.884436 12.521 0.722172 12.6544 0.604554C12.7879 0.486936 12.9597 0.422043 13.1376 0.422043C13.3155 0.422043 13.4873 0.486936 13.6207 0.604554C13.7542 0.722172 13.8402 0.884436 13.8626 1.06092V18.9472C13.8626 19.1395 13.7862 19.3239 13.6502 19.4598C13.5143 19.5958 13.3299 19.6722 13.1376 19.6722C12.9453 19.6722 12.7609 19.5958 12.625 19.4598C12.489 19.3239 12.4126 19.1395 12.4126 18.9472M18.2123 15.0962V4.91192C18.2123 4.25076 17.6788 3.70559 17.006 3.70559H16.5304C16.3382 3.70559 16.1538 3.62921 16.0178 3.49325C15.8818 3.35729 15.8055 3.17289 15.8055 2.98062C15.8055 2.78835 15.8818 2.60395 16.0178 2.468C16.1538 2.33204 16.3382 2.25566 16.5304 2.25566H17.006C17.7136 2.25566 18.3921 2.53674 18.8925 3.03706C19.3928 3.53738 19.6739 4.21596 19.6739 4.92352V15.073C19.6708 15.7786 19.3884 16.4542 18.8884 16.952C18.3884 17.4498 17.7116 17.7293 17.006 17.7293H16.5304C16.3539 17.7069 16.1917 17.6209 16.0741 17.4875C15.9564 17.354 15.8915 17.1822 15.8915 17.0043C15.8915 16.8264 15.9564 16.6546 16.0741 16.5212C16.1917 16.3877 16.3539 16.3017 16.5304 16.2793H17.006C17.6788 16.2793 18.2123 15.7342 18.2123 15.073M5.59579 6.9952C5.82286 6.88166 6.11806 6.90437 6.33378 7.06332L9.39926 9.42488C9.48638 9.49166 9.55696 9.5776 9.60554 9.67604C9.65412 9.77448 9.67938 9.88278 9.67938 9.99256C9.67938 10.1023 9.65412 10.2106 9.60554 10.3091C9.55696 10.4075 9.48638 10.4935 9.39926 10.5602L6.33378 12.9218C6.22894 13.0031 6.10326 13.0532 5.9712 13.0662C5.83915 13.0792 5.70612 13.0546 5.58744 12.9953C5.46876 12.9359 5.36926 12.8443 5.30043 12.7308C5.2316 12.6174 5.19623 12.4868 5.19841 12.3541V7.631C5.19841 7.35851 5.34601 7.10873 5.58443 6.9952M1.77598 15.073C1.77598 15.7342 2.30955 16.2793 2.98231 16.2793H12.401V3.70559H2.99391C2.32115 3.70559 1.78758 4.25076 1.78758 4.92352L1.77598 15.073Z"
      />
    </CompositedSvg>
  );
}
export function VisibleIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.985 18.5c3.238 0 6.236-2.06 9.015-6.513C18.292 7.55 15.3 5.5 11.985 5.5 8.67 5.5 5.689 7.549 3 11.987c2.76 4.454 5.748 6.513 8.985 6.513ZM1.502 12.89a1.782 1.782 0 0 1 .023-1.838C4.428 6.017 7.915 3.5 11.984 3.5c4.086 0 7.594 2.538 10.523 7.614l.028.048c.296.519.294 1.16-.01 1.675-3.006 5.108-6.52 7.663-10.541 7.663-4.007 0-7.501-2.537-10.482-7.61ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
      />
    </CompositedSvg>
  );
}
export function PluginIcon$1() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 15h4" />
      <path d="m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27" />
      <path d="m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122" />
      <path d="M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </CompositedSvg>
  );
}
export function CardViewIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 7.5h18c.552 0 1 .424 1 .948v7.104c0 .524-.448.948-1 .948H3c-.552 0-1-.424-1-.947V8.447c0-.524.448-.948 1-.948Zm1 2v5h16v-5H4ZM2.5 19h19c.275 0 .5.225.5.5v1c0 .275-.225.5-.5.5h-19a.501.501 0 0 1-.5-.5v-1c0-.275.225-.5.5-.5Zm0-16h19c.275 0 .5.225.5.5v1c0 .275-.225.5-.5.5h-19a.501.501 0 0 1-.5-.5v-1c0-.275.225-.5.5-.5Z"
      />
    </CompositedSvg>
  );
}
export function PreviewViewIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm2 0v9h14V5H5ZM4 19a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2H4Z"
      />
    </CompositedSvg>
  );
}
export function FileMissingIcon() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--canvas-controls-text-muted-solid)] opacity-[var(--canvas-controls-text-muted-opacity)]"
      aria-hidden="true"
    >
      <path
        d="M36 22h32l16 16v60a4 4 0 0 1-4 4H36a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4Z"
        strokeDasharray="4 3"
      />
      <path d="M68 22v12a4 4 0 0 0 4 4h12" strokeDasharray="4 3" />
      <path d="M52 60l16 16M68 60l-16 16" strokeWidth="2" />
      <circle cx="22" cy="40" r="2" fill="currentColor" stroke="none" />
      <circle cx="98" cy="58" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="78" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="100" cy="92" r="1.5" fill="currentColor" stroke="none" />
      <path d="M16 56h6M104 76h6M14 92h4" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}
export function CropIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 5H13.5C14.3284 5 15 5.67157 15 6.5V18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 15H6.5C5.67157 15 5 14.3284 5 13.5V2" stroke="currentColor" strokeWidth="1.5" />
    </CompositedSvg>
  );
}
export function OutpaintIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 13.25a2.25 2.25 0 0 1 2.25 2.25v3a2.25 2.25 0 0 1-2.25 2.25h-3a2.25 2.25 0 0 1-2.25-2.25v-3a2.25 2.25 0 0 1 2.25-2.25zm11.5-1a.75.75 0 0 1 .75.75v5.25a2.5 2.5 0 0 1-2.5 2.5H13a.75.75 0 0 1 0-1.5h5.25a1 1 0 0 0 1-1V13a.75.75 0 0 1 .75-.75m-14.5 2.5a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75zM11 3.25a.75.75 0 0 1 0 1.5H5.75a1 1 0 0 0-1 1V11a.75.75 0 0 1-1.5 0V5.75a2.5 2.5 0 0 1 2.5-2.5zm7.5 0a2.25 2.25 0 0 1 2.25 2.25V9a.75.75 0 0 1-1.5 0V5.81l-4.72 4.72a.75.75 0 1 1-1.06-1.06l4.72-4.72H15a.75.75 0 0 1 0-1.5z"
      />
    </CompositedSvg>
  );
}
export function EraseIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.606 3.348a3.75 3.75 0 0 1 5.303 0l3.757 3.757a3.75 3.75 0 0 1 0 5.304l-8.257 8.257c-1.427 1.463-3.845 1.458-5.303 0l-3.757-3.757a3.75 3.75 0 0 1 0-5.304zm-7.197 9.318a2.25 2.25 0 0 0 0 3.182l3.757 3.757c.882.882 2.343.865 3.174.009l1.132-1.132-6.94-6.94zm11.44-8.257a2.25 2.25 0 0 0-3.183 0l-6.073 6.073 6.94 6.94 6.073-6.074a2.25 2.25 0 0 0 0-3.182z"
      />
    </CompositedSvg>
  );
}
export function RedrawIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.7861 2.70996C15.4501 2.7101 16.0872 2.97481 16.5566 3.44434C17.0259 3.91388 17.2901 4.551 17.29 5.21484C17.2898 5.83713 17.0573 6.43545 16.6416 6.89453L16.5557 6.98438L15.1631 8.37793C15.1461 8.40023 15.1277 8.422 15.1074 8.44238C15.087 8.46277 15.0643 8.48107 15.042 8.49805L14.2109 9.3291L16.6396 11.7578C17.51 12.6284 17.5101 14.0367 16.6396 14.9072L14.9072 16.6396C14.0367 17.5101 12.6284 17.51 11.7578 16.6396L9.3291 14.2119L7.66016 15.8818C7.43325 16.108 7.15415 16.2749 6.84766 16.3682L3.94629 17.248H3.94531C3.7797 17.2978 3.60326 17.3019 3.43555 17.2598C3.26785 17.2176 3.11458 17.1309 2.99219 17.0088C2.86978 16.8866 2.78268 16.7331 2.74023 16.5654C2.69791 16.398 2.70158 16.2222 2.75098 16.0566V16.0537L3.63184 13.1533L3.63281 13.1514C3.72693 12.8447 3.89494 12.5653 4.12207 12.3389L5.78906 10.6719L3.35938 8.24219C2.94332 7.82411 2.70999 7.25779 2.70996 6.66797C2.70997 6.07812 2.9433 5.51184 3.35938 5.09375L5.09375 3.35938C5.51184 2.9433 6.07812 2.70997 6.66797 2.70996C7.22077 2.70999 7.75238 2.91491 8.16113 3.2832L8.24219 3.35938L10.6709 5.78809L11.502 4.95703C11.5189 4.93484 11.5373 4.91285 11.5576 4.89258C11.5777 4.87255 11.5992 4.85463 11.6211 4.83789L13.0156 3.44336C13.4851 2.97409 14.1223 2.70993 14.7861 2.70996ZM10.2129 13.3281L12.6416 15.7559C13.024 16.1381 13.6411 16.1382 14.0234 15.7559L15.7559 14.0234C16.1382 13.6411 16.1381 13.024 15.7559 12.6416L15.332 12.2168L14.4404 13.1074C14.1964 13.3515 13.8007 13.3515 13.5566 13.1074C13.3129 12.8634 13.3128 12.4676 13.5566 12.2236L14.4473 11.333L13.3271 10.2129L10.2129 13.3281ZM5.00488 13.2236V13.2246C4.92332 13.3059 4.86229 13.4057 4.82812 13.5156V13.5166L4.10645 15.8936L6.48438 15.1719C6.59497 15.1382 6.69543 15.0777 6.77734 14.9961L13.7764 7.99609L12.0039 6.22363L5.00488 13.2236ZM6.66797 3.95996C6.4086 3.95997 6.15943 4.06216 5.97559 4.24512L4.24414 5.97656C4.06192 6.16029 3.95997 6.40916 3.95996 6.66797C3.95999 6.92669 4.06202 7.1747 4.24414 7.3584L6.67285 9.78711L9.78711 6.67188L8.66699 5.55176L7.77637 6.44336C7.53233 6.6874 7.13667 6.68731 6.89258 6.44336C6.64854 6.19928 6.64852 5.80363 6.89258 5.55957L7.7832 4.66797L7.36035 4.24512L7.28809 4.18066C7.11378 4.03848 6.89487 3.95999 6.66797 3.95996ZM14.7861 3.95996C14.4538 3.95993 14.1345 4.0922 13.8994 4.32715L12.8877 5.33887L14.6602 7.1123L15.6719 6.10059L15.7559 6.00879C15.9385 5.78592 16.0399 5.50548 16.04 5.21484C16.0401 4.88258 15.9076 4.56321 15.6729 4.32812C15.4378 4.09305 15.1185 3.96006 14.7861 3.95996Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function SuperResolutionIcon({ size: size2 = 16 } = {}) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7529 0C18.5461 0 20 1.45394 20 3.24707V16.7529C20 18.5461 18.5461 20 16.7529 20H3.24707L3.08008 19.9961C1.3644 19.9093 0 18.4902 0 16.7529V3.24707C0 1.50983 1.3644 0.0906556 3.08008 0.00390625L3.24707 0H16.7529ZM3.24707 1.5C2.28236 1.5 1.5 2.28237 1.5 3.24707V16.7529C1.5 17.7176 2.28237 18.5 3.24707 18.5H16.7529C17.7176 18.5 18.5 17.7176 18.5 16.7529V3.24707C18.5 2.28236 17.7176 1.5 16.7529 1.5H3.24707ZM5.12109 9.25H7.91797V6.0752H9.41797V14.0752H7.91797V10.75H5.12109V14.0752H3.62109V6.0752H5.12109V9.25ZM13.2764 6.08008C14.7763 6.13536 17.0439 6.68501 17.0439 10.124C17.0438 13.5634 14.7109 14.0269 13.2637 14.0713L12.9873 14.0752H10.9941V6.0752H12.9873L13.2764 6.08008ZM12.4941 12.5752H12.9873C13.637 12.5752 14.2822 12.4963 14.7412 12.207C15.0683 12.0007 15.5439 11.5403 15.5439 10.124C15.5439 8.68966 15.0717 8.19497 14.7373 7.97168C14.2874 7.67149 13.6456 7.57521 12.9873 7.5752H12.4941V12.5752Z"
      />
    </CompositedSvg>
  );
}
export function EraseSubtitleIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7529 0C18.5461 0 20 1.45394 20 3.24707V16.7529C20 18.5461 18.5461 20 16.7529 20H3.24707L3.08008 19.9961C1.3644 19.9093 0 18.4902 0 16.7529V3.24707C0 1.50983 1.3644 0.0906556 3.08008 0.00390625L3.24707 0H16.7529ZM3.24707 1.5C2.28236 1.5 1.5 2.28237 1.5 3.24707V16.7529C1.5 17.7176 2.28237 18.5 3.24707 18.5H16.7529C17.7176 18.5 18.5 17.7176 18.5 16.7529V3.24707C18.5 2.28236 17.7176 1.5 16.7529 1.5H3.24707Z"
      />
      <rect x="4.25" y="12.5" width="11.5" height="1.5" fill="currentColor" />
      <rect x="4.25" y="15" width="7.5" height="1.5" fill="currentColor" />
      <path
        d="M2.75 17.25 L17.25 9.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
}
export function AsrIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7529 0C18.5461 0 20 1.45394 20 3.24707V16.7529C20 18.5461 18.5461 20 16.7529 20H3.24707L3.08008 19.9961C1.3644 19.9093 0 18.4902 0 16.7529V3.24707C0 1.50983 1.3644 0.0906556 3.08008 0.00390625L3.24707 0H16.7529ZM3.24707 1.5C2.28236 1.5 1.5 2.28237 1.5 3.24707V16.7529C1.5 17.7176 2.28237 18.5 3.24707 18.5H16.7529C17.7176 18.5 18.5 17.7176 18.5 16.7529V3.24707C18.5 2.28236 17.7176 1.5 16.7529 1.5H3.24707Z"
      />
      <rect x="8" y="3.5" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.5V12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 12H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3.75" y="14.5" width="12.5" height="1.5" fill="currentColor" />
      <rect x="3.75" y="16.5" width="8" height="1.5" fill="currentColor" />
    </CompositedSvg>
  );
}
export function RemoveBgIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.6699 0C18.509 0 20 1.49097 20 3.33008V9.52246L20.0098 9.53223L20 9.54199V16.6699C20 18.509 18.509 20 16.6699 20H3.33008L3.1582 19.9961C1.39904 19.9066 0 18.4513 0 16.6699V3.33008C0 1.54866 1.39904 0.0934226 3.1582 0.00390625L3.33008 0H16.6699ZM10.2871 12.2949C9.79856 11.8607 9.05787 11.8758 8.58789 12.3301L3.70508 17.0508L2.46484 18.2822C2.72255 18.4208 3.01702 18.5 3.33008 18.5H16.6699C16.8488 18.5 17.0212 18.4727 17.1846 18.4248L13.9297 15.5322L13.9102 15.5508L13.7188 15.3447L10.2871 12.2949ZM15.0527 14.4893L15.0332 14.5059L18.3291 17.4365C18.4372 17.203 18.5 16.9441 18.5 16.6699V11.042L15.0527 14.4893ZM1.5 11.0684V16.6699C1.5 16.8103 1.51692 16.9468 1.54688 17.0781L1.98145 16.6484L2.6543 15.9795L8.26367 10.3701L17.3018 1.61426C17.1046 1.54163 16.8923 1.5 16.6699 1.5H11.0684L1.5 11.0684ZM10.2002 10.582C10.5904 10.6913 10.9625 10.8869 11.2842 11.1729L13.9072 13.5049L14.0117 13.4092L18.5 8.9209V3.33008C18.5 3.09485 18.4539 2.87065 18.373 2.66406L10.2002 10.582ZM3.33008 1.5C2.31951 1.50013 1.5 2.31948 1.5 3.33008V8.94727L8.94727 1.5H3.33008Z"
      />
    </CompositedSvg>
  );
}
export function SplitGridIcon() {
  return (
    <CompositedSvg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </CompositedSvg>
  );
}
export function SendArrowIcon() {
  return (
    <CompositedSvg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 13V3M8 3L3.5 7.5M8 3L12.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function PaperclipIcon$1() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.146 5.354 6.354 10.146a1.5 1.5 0 0 0 2.121 2.121l5.5-5.5a3 3 0 1 0-4.242-4.242l-5.5 5.5a4.5 4.5 0 0 0 6.364 6.363l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function UndoIcon$1() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.25 12.5a5.75 5.75 0 0 0-5.75-5.75H5.81l1.72 1.72a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 1 1 1.06 1.06L5.81 5.25h7.69a7.25 7.25 0 1 1 0 14.5H6a.75.75 0 0 1 0-1.5h7.5a5.75 5.75 0 0 0 5.75-5.75"
      />
    </CompositedSvg>
  );
}
export function RedoIcon$1() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.75 12.5a5.75 5.75 0 0 1 5.75-5.75h7.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H10.5a7.25 7.25 0 1 0 0 14.5H18a.75.75 0 0 0 0-1.5h-7.5a5.75 5.75 0 0 1-5.75-5.75"
      />
    </CompositedSvg>
  );
}
export function SelectRectIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.133 10.999c.22 0 .4.18.4.4v1.213c0 .472.382.854.854.854H4.6c.22 0 .4.18.4.4v.4a.4.4 0 0 1-.4.4H3.387a2.054 2.054 0 0 1-2.051-1.948l-.003-.106V11.4c0-.22.18-.4.4-.4zm7.134 2.467c.22 0 .4.18.4.4v.4a.4.4 0 0 1-.4.4H6.733a.4.4 0 0 1-.4-.4v-.4c0-.22.18-.4.4-.4zm5-2.467c.22 0 .4.18.4.4v1.213l-.003.106a2.054 2.054 0 0 1-1.945 1.945l-.106.003H11.4a.4.4 0 0 1-.4-.4v-.4c0-.22.18-.4.4-.4h1.213a.854.854 0 0 0 .854-.854V11.4c0-.22.18-.4.4-.4zM2.133 6.332c.22 0 .4.18.4.4v2.534a.4.4 0 0 1-.4.4h-.4a.4.4 0 0 1-.4-.4V6.732c0-.22.18-.4.4-.4zm12.134 0c.22 0 .4.18.4.4v2.534a.4.4 0 0 1-.4.4h-.4a.4.4 0 0 1-.4-.4V6.732c0-.22.18-.4.4-.4zm-9.667-5c.22 0 .4.18.4.4v.4a.4.4 0 0 1-.4.4H3.387a.854.854 0 0 0-.854.854v1.213a.4.4 0 0 1-.4.4h-.4a.4.4 0 0 1-.4-.4V3.386c0-1.134.92-2.054 2.054-2.054zm8.119.003a2.054 2.054 0 0 1 1.948 2.05V4.6a.4.4 0 0 1-.4.4h-.4a.4.4 0 0 1-.4-.4V3.386a.854.854 0 0 0-.854-.854H11.4a.4.4 0 0 1-.4-.4v-.4c0-.22.18-.4.4-.4h1.213zm-3.452-.003c.22 0 .4.18.4.4v.4a.4.4 0 0 1-.4.4H6.733a.4.4 0 0 1-.4-.4v-.4c0-.22.18-.4.4-.4z"
      />
    </CompositedSvg>
  );
}
export function ColorAdjustIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M0.75 4H4.25M8.75 4H19.25M0.75 10H11.25M15.75 10H19.25M0.75 16H6.25M10.75 16H19.25" />
      <circle cx="6.5" cy="4" r="2.25" />
      <circle cx="13.5" cy="10" r="2.25" />
      <circle cx="8.5" cy="16" r="2.25" />
    </CompositedSvg>
  );
}
export function ClipIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.9621 1.54386C6.8493 1.54417 8.37909 3.07456 8.37909 4.96183C8.37888 6.27097 7.64174 7.40663 6.56073 7.98038L8.56171 9.12882L17.3312 4.07511C17.69 3.8683 18.1487 3.99092 18.3557 4.34953C18.5625 4.70837 18.4391 5.16708 18.0803 5.37394L10.0666 9.99308L11.5471 10.8437C11.9061 11.05 12.0296 11.508 11.8234 11.8671C11.6171 12.226 11.1591 12.3505 10.8 12.1444L8.56366 10.8603L6.5578 12.0165C7.64087 12.5899 8.37904 13.7283 8.37909 15.039C8.37886 16.926 6.84917 18.4557 4.9621 18.456C3.07477 18.456 1.54435 16.9262 1.54413 15.039C1.54418 13.4856 2.58092 12.1742 4.00018 11.7587L7.05878 9.99601L4.00311 8.24113C2.58261 7.82665 1.54438 6.51606 1.54413 4.96183C1.54413 3.07437 3.07464 1.54386 4.9621 1.54386ZM4.9621 13.121C3.90311 13.121 3.04419 13.98 3.04413 15.039C3.04435 16.0978 3.90321 16.956 4.9621 16.956C6.02072 16.9557 6.87886 16.0976 6.87909 15.039C6.87902 13.9802 6.02082 13.1213 4.9621 13.121ZM12.9523 13.3993C13.3664 13.3994 13.7022 13.7352 13.7023 14.1493C13.7023 14.5635 13.3665 14.8993 12.9523 14.8993H10.5812C10.167 14.8993 9.83124 14.5635 9.83124 14.1493C9.83133 13.7352 10.1671 13.3993 10.5812 13.3993H12.9523ZM17.6945 13.3993C18.1087 13.3993 18.4444 13.7352 18.4445 14.1493C18.4445 14.5635 18.1087 14.8993 17.6945 14.8993H15.3234C14.9092 14.8993 14.5734 14.5635 14.5734 14.1493C14.5735 13.7352 14.9093 13.3993 15.3234 13.3993H17.6945ZM4.9621 3.04386C3.90306 3.04386 3.04413 3.9028 3.04413 4.96183C3.04444 6.0206 3.90325 6.87882 4.9621 6.87882C6.02068 6.87852 6.87878 6.02041 6.87909 4.96183C6.87909 3.90298 6.02087 3.04417 4.9621 3.04386Z"
      />
    </CompositedSvg>
  );
}
export function ExtractFrameIcon() {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect
        x="0.75"
        y="4.5"
        width="18.5"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5 4.5v11M15 4.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 0.75v18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}
export function ExtractAudioIcon() {
  return (
    <CompositedSvg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5332 12.6465C2.5333 13.0994 2.9006 13.4668 3.35352 13.4668H4.66699V14.667H3.35352L3.24902 14.6641C2.21621 14.6114 1.38816 13.7829 1.33594 12.75L1.33301 12.6465V11.333H2.5332V12.6465ZM10 14.667H6V13.4668H10V14.667ZM14.667 12.6465L14.6641 12.75C14.6118 13.7829 13.7838 14.6114 12.751 14.6641L12.6465 14.667H11.333V13.4668H12.6465C13.0994 13.4668 13.4667 13.0994 13.4668 12.6465V11.333H14.667V12.6465ZM12.2002 2.42578H10.0186V7.9043L10.0146 8.03223C9.95184 9.3472 8.92701 10.4256 7.54199 10.4258C6.14014 10.4257 4.98739 9.30497 4.9873 7.9043C4.98745 6.50367 6.14017 5.38386 7.54199 5.38379C8.06614 5.38386 8.53834 5.53858 8.92676 5.80176V1.33496H12.2002V2.42578ZM4 7.33496H3.35352C2.9006 7.33497 2.5333 7.70238 2.5332 8.15527V10H1.33301V8.15527C1.33311 7.03964 2.23786 6.13478 3.35352 6.13477H4V7.33496ZM12.751 6.1377C13.8181 6.19208 14.6669 7.07469 14.667 8.15527V10H13.4668V8.15527C13.4667 7.70238 13.0994 7.33497 12.6465 7.33496H12V6.13477H12.6465L12.751 6.1377ZM7.54199 6.47461C6.72568 6.47468 6.07925 7.12301 6.0791 7.9043C6.07919 8.68563 6.72565 9.33489 7.54199 9.33496C8.33023 9.33476 8.92668 8.71383 8.92676 7.9043C8.92663 7.09481 8.3302 6.47481 7.54199 6.47461Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function VoiceIsolateIcon() {
  return <Speech size={20} strokeWidth={1.5} aria-hidden="true" />;
}
export function GroupIcon({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.33301 12.667C2.33318 13.219 2.78098 13.6668 3.33301 13.667H5.33301V14.667H3.33301L3.23047 14.6641C2.20777 14.6123 1.38775 13.7922 1.33594 12.7695L1.33301 12.667V11.333H2.33301V12.667ZM14.667 12.667C14.6668 13.7369 13.8262 14.6105 12.7695 14.6641L12.667 14.667H10.667V13.667H12.667C13.219 13.6668 13.6668 13.219 13.667 12.667V11.333H14.667V12.667ZM8.66699 4.16699C9.31107 4.16717 9.83283 4.68893 9.83301 5.33301V7.33301C9.83301 7.38965 9.82811 7.44551 9.82031 7.5H10.667C11.3112 7.50018 11.833 8.02277 11.833 8.66699V10.667C11.8328 11.3111 11.3111 11.8328 10.667 11.833H7.33301C6.68893 11.8328 6.16717 11.3111 6.16699 10.667V8.66699C6.16699 8.61035 6.17189 8.55449 6.17969 8.5H5.33301C4.68883 8.49982 4.16699 7.97723 4.16699 7.33301V5.33301C4.16717 4.68893 4.68893 4.16717 5.33301 4.16699H8.66699ZM7.33301 8.5C7.24111 8.50018 7.16699 8.57505 7.16699 8.66699V10.667C7.16717 10.7588 7.24122 10.8328 7.33301 10.833H10.667C10.7588 10.8328 10.8328 10.7588 10.833 10.667V8.66699C10.833 8.57505 10.7589 8.50018 10.667 8.5H7.33301ZM5.33301 5.16699C5.24122 5.16717 5.16717 5.24122 5.16699 5.33301V7.33301C5.16699 7.42495 5.24111 7.49982 5.33301 7.5H8.66699C8.75889 7.49982 8.83301 7.42495 8.83301 7.33301V5.33301C8.83283 5.24122 8.75878 5.16717 8.66699 5.16699H5.33301ZM5.33301 2.33301H3.33301C2.78098 2.33318 2.33318 2.78098 2.33301 3.33301V5.33301H1.33301V3.33301C1.33318 2.2287 2.2287 1.33318 3.33301 1.33301H5.33301V2.33301ZM12.667 1.33301C13.7713 1.33318 14.6668 2.2287 14.667 3.33301V5.33301H13.667V3.33301C13.6668 2.78098 13.219 2.33318 12.667 2.33301H10.667V1.33301H12.667Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function UngroupIcon({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1.5 19C2.32843 19 3 19.6716 3 20.5C3 21.3284 2.32843 22 1.5 22C0.671573 22 0 21.3284 0 20.5C0 19.6716 0.671573 19 1.5 19ZM20.5 19C21.3284 19 22 19.6716 22 20.5C22 21.3284 21.3284 22 20.5 22C19.6716 22 19 21.3284 19 20.5C19 19.6716 19.6716 19 20.5 19ZM6 21H4V20H6V21ZM10 21H8V20H10V21ZM14 21H12V20H14V21ZM18 21H16V20H18V21ZM2 18H1V16H2V18ZM21 18H20V16H21V18ZM12 5.25C12.9665 5.25 13.75 6.0335 13.75 7V10C13.75 10.085 13.7422 10.1683 13.7305 10.25H15C15.9665 10.25 16.75 11.0335 16.75 12V15C16.75 15.9665 15.9665 16.75 15 16.75H10C9.0335 16.75 8.25 15.9665 8.25 15V12C8.25 11.915 8.25783 11.8317 8.26953 11.75H7C6.0335 11.75 5.25 10.9665 5.25 10V7C5.25 6.0335 6.0335 5.25 7 5.25H12ZM10 11.75C9.86193 11.75 9.75 11.8619 9.75 12V15C9.75 15.1381 9.86193 15.25 10 15.25H15C15.1381 15.25 15.25 15.1381 15.25 15V12C15.25 11.8619 15.1381 11.75 15 11.75H10ZM2 14H1V12H2V14ZM21 14H20V12H21V14ZM7 6.75C6.86193 6.75 6.75 6.86193 6.75 7V10C6.75 10.1381 6.86193 10.25 7 10.25H12C12.1381 10.25 12.25 10.1381 12.25 10V7C12.25 6.86193 12.1381 6.75 12 6.75H7ZM2 10H1V8H2V10ZM21 10H20V8H21V10ZM2 6H1V4H2V6ZM21 6H20V4H21V6ZM1.5 0C2.32843 0 3 0.671573 3 1.5C3 2.32843 2.32843 3 1.5 3C0.671573 3 0 2.32843 0 1.5C0 0.671573 0.671573 0 1.5 0ZM20.5 0C21.3284 0 22 0.671573 22 1.5C22 2.32843 21.3284 3 20.5 3C19.6716 3 19 2.32843 19 1.5C19 0.671573 19.6716 0 20.5 0ZM6 2H4V1H6V2ZM10 2H8V1H10V2ZM14 2H12V1H14V2ZM18 2H16V1H18V2Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export function CloseIcon$1() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3.354 2.646a.5.5 0 1 0-.708.708L7.293 8l-4.647 4.646a.5.5 0 0 0 .708.708L8 8.707l4.646 4.647a.5.5 0 0 0 .708-.708L8.707 8l4.647-4.646a.5.5 0 0 0-.708-.708L8 7.293 3.354 2.646Z" />
    </CompositedSvg>
  );
}
export function ToolbarSpinnerIcon() {
  return (
    <span
      className="inline-block w-[14px] h-[14px] border-[1.5px] border-[var(--canvas-controls-text-muted)] border-t-[var(--canvas-controls-text)] rounded-full animate-spin"
      aria-hidden="true"
    />
  );
}
export function RenameIcon({ size: size2 = 14 }) {
  return <Pencil size={size2} strokeWidth={1.75} aria-hidden="true" />;
}
export function UploadIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 10.5V2M8 2L4.5 5.5M8 2L11.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 10.5V12.5C2.5 13.0523 2.94772 13.5 3.5 13.5H12.5C13.0523 13.5 13.5 13.0523 13.5 12.5V10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const PLACEHOLDER_ICON_CLASS = "text-[var(--canvas-empty-placeholder-fg)]";
const PLACEHOLDER_ICON_SIZE = 42;
export function ImagePlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.4248 7.70801C8.23163 7.38605 7.76543 7.38392 7.56934 7.7041L2.3418 16.2393C2.13811 16.5724 2.378 17 2.76855 17H17.3525C17.7602 17 17.996 16.5386 17.7578 16.208L14.4053 11.5625C14.2057 11.286 13.7943 11.286 13.5947 11.5625L12.0342 13.7236L8.4248 7.70801ZM14.5 4C13.6716 4 13 4.67157 13 5.5C13 6.32843 13.6716 7 14.5 7C15.3284 7 16 6.32843 16 5.5C16 4.67157 15.3284 4 14.5 4Z" />
    </CompositedSvg>
  );
}
export function ParagraphIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.5 2C4.567 2 3 3.567 3 5.5S4.567 9 6.5 9H7v4.5a.5.5 0 0 0 1 0V3h1.5v10.5a.5.5 0 0 0 1 0V3H12a.5.5 0 0 0 0-1H6.5ZM7 8H6.5C5.119 8 4 6.881 4 5.5S5.119 3 6.5 3H7v5Z" />
    </CompositedSvg>
  );
}
export function BoldIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 2.5a.5.5 0 0 1 .5-.5h4a3 3 0 0 1 2.12 5.122A3.5 3.5 0 0 1 9.5 14H4.5a.5.5 0 0 1-.5-.5v-11ZM6 8.5v3.5h3.5a1.5 1.5 0 0 0 0-3H6ZM8.5 7a1 1 0 0 0 0-2H6v2h2.5Z" />
    </CompositedSvg>
  );
}
export function ItalicIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-1.573L7.073 13H9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h1.573L9.427 3H7.5a.5.5 0 0 1-.5-.5Z" />
    </CompositedSvg>
  );
}
export function BulletListIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3-1.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM6 8a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6Zm0 4.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM3 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </CompositedSvg>
  );
}
export function OrderedListIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.003 2.5a.5.5 0 0 1 .723-.447l.89.445a.5.5 0 1 1-.448.894l-.165-.082V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1h.5V2.5ZM6 2.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM6 8a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6Zm0 4.5a.5.5 0 0 0 0 1h7.5a.5.5 0 0 0 0-1H6ZM1.713 8.41a1.25 1.25 0 0 1 2.164-.404.5.5 0 1 1-.854.522.25.25 0 0 0-.433.081.25.25 0 0 0 .067.258l1.559 1.434A.5.5 0 0 1 3.877 11H1.5a.5.5 0 0 1 0-1h1.162l-.74-.681a1.25 1.25 0 0 1-.21-1.51l.001-.002Z" />
    </CompositedSvg>
  );
}
export function DropdownArrowIcon() {
  return (
    <CompositedSvg
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="currentColor"
      className="ml-0.5 opacity-60"
      aria-hidden="true"
      data-toolbar-icon="disclosure"
    >
      <path d="M4 5L0 0h8L4 5z" />
    </CompositedSvg>
  );
}
export function RunIcon() {
  return <PlaybackPlayIcon$1 size={20} />;
}
export function RefreshIcon() {
  return <RetryIcon$1 size={18} />;
}
export function VideoPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM8.53125 5.96094C7.86529 5.5432 7.00008 6.02151 7 6.80762V13.1992C7 13.9839 7.86223 14.4625 8.52832 14.0479L13.6416 10.8643C14.2689 10.4736 14.2706 9.56066 13.6445 9.16797L8.53125 5.96094Z" />
    </CompositedSvg>
  );
}
export function PromoteToAssetIcon({ size: size2 = 16 } = {}) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m16 6 4 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4v16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function TextPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004ZM4 16.2646H12V14.4648H4V16.2646ZM4 12.6885H16V10.8887H4V12.6885ZM4 9.1123H16V7.31152H4V9.1123ZM4 5.53613H16V3.73535H4V5.53613Z" />
    </CompositedSvg>
  );
}
export function AudioPlaceholderIcon({
  size: size2 = PLACEHOLDER_ICON_SIZE,
  className = PLACEHOLDER_ICON_CLASS,
} = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1.3335 3.9999C1.33355 2.89537 2.22897 2 3.3335 2H12.6663C13.7709 2 14.6663 2.89543 14.6663 4V12C14.6663 13.1046 13.7709 14 12.6663 14H3.3331C2.2285 14 1.33305 13.1045 1.33311 11.9999L1.3335 3.9999ZM7.99967 8.114C7.59942 7.97249 7.16451 7.96201 6.75791 8.08409C6.3513 8.20616 5.99409 8.45446 5.73797 8.79303C5.48185 9.13161 5.34011 9.5429 5.33327 9.96738C5.32642 10.3919 5.45483 10.8075 5.6999 11.1542C5.94498 11.5008 6.294 11.7605 6.69646 11.8956C7.09892 12.0307 7.53394 12.0343 7.93855 11.9057C8.34316 11.7772 8.69637 11.5233 8.94706 11.1806C9.19776 10.838 9.33293 10.4245 9.33301 10V5.33267H11.333V4H7.99967V8.114Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const MEDIA_NODE_INNER_RADIUS = MEDIA_NODE_RADIUS - 2;
export function GeneratingMediaArea({
  width,
  height,
  radius = MEDIA_NODE_INNER_RADIUS,
  onClick,
  icon,
  label,
  progress,
  variant = "generating",
  className,
  style: style2,
}) {
  const interactive = !!onClick;
  const handleKeyDown2 = interactive
    ? (e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          onClick?.(e2);
        }
      }
    : void 0;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex are conditional
    <div
      className={`generating-wash flex items-center justify-center ${variant === "queued" ? "generating-wash--queued" : ""} ${className ?? ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown2}
      role={interactive ? "button" : void 0}
      tabIndex={interactive ? 0 : void 0}
      style={{
        width,
        height,
        borderRadius: radius,
        cursor: interactive ? "pointer" : void 0,
        "--gen-progress":
          variant === "queued" ? "100%" : progress != null ? `${progress}%` : void 0,
        ...style2,
      }}
      data-generation-state={variant}
    >
      <div
        className={`relative z-[2] flex w-full min-w-0 flex-col items-center justify-center ${variant === "queued" ? "gap-4" : "gap-6"}`}
      >
        {icon ?? <ImagePlaceholderIcon />}
        {label}
      </div>
    </div>
  );
}
export function shouldRenderMediaActionSurface({
  selected: selected2,
  showLightbox,
  showClipPanel,
  showFramePanel = false,
  showDialog = false,
}) {
  return selected2 || showLightbox || showClipPanel || showFramePanel || showDialog;
}
