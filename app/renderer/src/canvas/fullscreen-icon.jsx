// fullscreen-icon.jsx
import {
  AssetMetadataStoreContext,
  CompositedSvg,
  PencilRuler,
  reactExports,
  useStore$3,
  withArtworkOpacity,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CanvasActiveDeferredContext,
  CanvasBridgeContext,
  GeneratingStateStoreContext,
  INACTIVE_NODE_UNMOUNT_GRACE_MS,
  useDelayedFalse,
} from "../media-editing/package.jsx";

const TOOL_CONFIRM_REJECT_REASONS = [
  "user_rejected",
  "confirmation_expired",
  "confirmation_unavailable",
];

function isToolConfirmRejectReason(value) {
  return (
    typeof value === "string" && TOOL_CONFIRM_REJECT_REASONS.includes(value)
  );
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

function useShallowStableActions(actions) {
  const ref = reactExports.useRef(actions);
  const prev = ref.current;
  if (!shallowEqualActions(prev, actions)) {
    ref.current = actions;
    return actions;
  }
  return prev;
}

export function CanvasBridgeProvider({ children: children2, ...actions }) {
  const stable = useShallowStableActions(actions);
  return (
    <CanvasBridgeContext.Provider value={stable}>
      {children2}
    </CanvasBridgeContext.Provider>
  );
}

function createNodeDraggingSelector(nodeId) {
  return (state2) => !!state2.nodeLookup.get(nodeId)?.dragging;
}

export function useCanvasNodeIsDragging(nodeId) {
  const selector2 = reactExports.useMemo(
    () => createNodeDraggingSelector(nodeId),
    [nodeId],
  );
  return useStore$3(selector2);
}

const DEFAULT_VIEWPORT_BUFFER_RATIO = 1.5;

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
  const visible = !(
    nRight < vLeft ||
    nLeft > vRight ||
    nBottom < vTop ||
    nTop > vBottom
  );
  if (visible) return "inView";
  const bufW = (state2.width / zoom2) * (bufferRatio - 1) * 0.5;
  const bufH = (state2.height / zoom2) * (bufferRatio - 1) * 0.5;
  const bLeft = vLeft - bufW;
  const bTop = vTop - bufH;
  const bRight = vRight + bufW;
  const bBottom = vBottom + bufH;
  const near = !(
    nRight < bLeft ||
    nLeft > bRight ||
    nBottom < bTop ||
    nTop > bBottom
  );
  return near ? "nearView" : "far";
}

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
  if (typeof bytes2 !== "number" || !Number.isFinite(bytes2) || bytes2 < 0)
    return void 0;
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
  const ariaHidden =
    props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
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

const TOOLBAR_STROKE_WIDTH_24 = 1.8;

export function AnnotationIcon({ size: size2 = 20 } = {}) {
  return (
    <AnnotationIcon$1 size={size2} strokeWidth={TOOLBAR_STROKE_WIDTH_24} />
  );
}

export function TextEditIcon() {
  return (
    <PencilRuler
      size={20}
      strokeWidth={TOOLBAR_STROKE_WIDTH_24}
      aria-hidden="true"
    />
  );
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
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
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
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

export function StoryboardGridIcon({
  size: size2 = 18,
  strokeWidth = 1.5,
} = {}) {
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
    <CompositedSvg
      width={size2}
      height={size2}
      fill="none"
      viewBox="0 0 14 14"
      aria-hidden="true"
    >
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
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.4126 18.924V17.7293H2.99391C2.64356 17.7293 2.29665 17.6603 1.97297 17.5262C1.64929 17.3921 1.35518 17.1956 1.10745 16.9479C0.859715 16.7001 0.663202 16.406 0.529129 16.0824C0.395056 15.7587 0.32605 15.4118 0.32605 15.0614V4.93512C0.32605 4.22756 0.607128 3.54898 1.10745 3.04866C1.60777 2.54834 2.28635 2.26726 2.99391 2.26726H12.4126V1.06092C12.435 0.884436 12.521 0.722172 12.6544 0.604554C12.7879 0.486936 12.9597 0.422043 13.1376 0.422043C13.3155 0.422043 13.4873 0.486936 13.6207 0.604554C13.7542 0.722172 13.8402 0.884436 13.8626 1.06092V18.9472C13.8626 19.1395 13.7862 19.3239 13.6502 19.4598C13.5143 19.5958 13.3299 19.6722 13.1376 19.6722C12.9453 19.6722 12.7609 19.5958 12.625 19.4598C12.489 19.3239 12.4126 19.1395 12.4126 18.9472M18.2123 15.0962V4.91192C18.2123 4.25076 17.6788 3.70559 17.006 3.70559H16.5304C16.3382 3.70559 16.1538 3.62921 16.0178 3.49325C15.8818 3.35729 15.8055 3.17289 15.8055 2.98062C15.8055 2.78835 15.8818 2.60395 16.0178 2.468C16.1538 2.33204 16.3382 2.25566 16.5304 2.25566H17.006C17.7136 2.25566 18.3921 2.53674 18.8925 3.03706C19.3928 3.53738 19.6739 4.21596 19.6739 4.92352V15.073C19.6708 15.7786 19.3884 16.4542 18.8884 16.952C18.3884 17.4498 17.7116 17.7293 17.006 17.7293H16.5304C16.3539 17.7069 16.1917 17.6209 16.0741 17.4875C15.9564 17.354 15.8915 17.1822 15.8915 17.0043C15.8915 16.8264 15.9564 16.6546 16.0741 16.5212C16.1917 16.3877 16.3539 16.3017 16.5304 16.2793H17.006C17.6788 16.2793 18.2123 15.7342 18.2123 15.073M5.59579 6.9952C5.82286 6.88166 6.11806 6.90437 6.33378 7.06332L9.39926 9.42488C9.48638 9.49166 9.55696 9.5776 9.60554 9.67604C9.65412 9.77448 9.67938 9.88278 9.67938 9.99256C9.67938 10.1023 9.65412 10.2106 9.60554 10.3091C9.55696 10.4075 9.48638 10.4935 9.39926 10.5602L6.33378 12.9218C6.22894 13.0031 6.10326 13.0532 5.9712 13.0662C5.83915 13.0792 5.70612 13.0546 5.58744 12.9953C5.46876 12.9359 5.36926 12.8443 5.30043 12.7308C5.2316 12.6174 5.19623 12.4868 5.19841 12.3541V7.631C5.19841 7.35851 5.34601 7.10873 5.58443 6.9952M1.77598 15.073C1.77598 15.7342 2.30955 16.2793 2.98231 16.2793H12.401V3.70559H2.99391C2.32115 3.70559 1.78758 4.25076 1.78758 4.92352L1.77598 15.073Z"
      />
    </CompositedSvg>
  );
}

export const PLACEHOLDER_ICON_CLASS =
  "text-[var(--canvas-empty-placeholder-fg)]";

export const PLACEHOLDER_ICON_SIZE = 42;
