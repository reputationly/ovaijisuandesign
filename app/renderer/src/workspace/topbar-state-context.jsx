// topbar-state-context.jsx
import {
  CDN_BASE_MAP,
  ContextMenuRoot,
  getCdnRegion,
  instance,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { WorkspaceEvents } from "./workspace-events.js";

export const workspaceEvents = new WorkspaceEvents();

export const TopbarStateContext = reactExports.createContext({
  entries: [],
  previewEntries: [],
  currentWorkspaceId: null,
  isHomeActive: true,
  activeRuntime: null,
  searchSessions: [],
  searchWorkspaces: [],
  activeTasks: [],
  completedTasks: [],
  unreadCompletedTaskCount: 0,
  workspaceStatusById: new Map(),
});

export const TopbarActionsContext = reactExports.createContext(null);

export function useTopbarState() {
  return reactExports.useContext(TopbarStateContext);
}

export function useTopbarActions() {
  const actions = reactExports.useContext(TopbarActionsContext);
  if (!actions)
    throw new Error("useTopbarActions must be used within TopbarProvider");
  return actions;
}

export function isChineseLocale() {
  return (instance.resolvedLanguage ?? instance.language).startsWith("zh");
}

export function ContextMenu({ ...props }) {
  return <ContextMenuRoot data-slot="context-menu" {...props} />;
}

export const OSS_WEBP = "?x-oss-process=image/format,webp";

export function cdnRegionalImage(files) {
  const region = getCdnRegion();
  return `${CDN_BASE_MAP[region]}/${files[region]}${OSS_WEBP}`;
}

export function cdnRegionalFile(files) {
  const region = getCdnRegion();
  return `${CDN_BASE_MAP[region]}/${files[region]}`;
}

export const CDN_SKILL_SHOWCASE_FALLBACK = `${CDN_BASE_MAP.domestic}/232f1aee-b73a-4982-8930-a628ab6aad59.png`;

const PROMOTION_SEEDANCE_FILES = {
  domestic: "71a33405-9268-4db7-adf2-c77d6f05571d.png",
  overseas: "e75d691e-dc2b-4436-ae1e-0fbe65fdaa73.png",
};

export const CDN_PROMOTION_SEEDANCE = cdnRegionalImage(
  PROMOTION_SEEDANCE_FILES,
);

export const COACHMARK_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/public_assets",
  overseas: "https://cdn.hailuoai.video/public_assets",
};

export function coachMarkImage(baseName) {
  const region = getCdnRegion();
  const suffix = region === "overseas" ? "global" : "cn";
  return `${COACHMARK_BASE_MAP[region]}/coachmark-${baseName}-${suffix}.png${OSS_WEBP}`;
}

export const CDN_COACHMARK_HOME_AT = coachMarkImage("home-at");

export const CDN_COACHMARK_HOME_SLASH = coachMarkImage("home-slash");

export const CDN_TEMPLATE_PROJECT_3D_DIRECTOR = cdnRegionalFile({
  domestic: "23d22e0b-5e1f-4ab7-82e8-8d53be2966f6.zip",
  overseas: "3fc6da43-afc7-42f7-8cbf-a1fb01214e55.zip",
});

export const CDN_TEMPLATE_PROJECT_MULTI_SHOT = cdnRegionalFile({
  domestic: "4ece4270-8b18-49d2-8baa-ebb6e838836d.zip",
  overseas: "1c419bd9-800f-477d-9b7c-aa198d91c799.zip",
});

export const CDN_TEMPLATE_PROJECT_N_STORYBOARD = cdnRegionalFile({
  domestic: "edcbe984-30e4-4293-9ee9-a859c4650498.zip",
  overseas: "27ec9ccf-3185-47ae-b190-b2b24ca4a9a1.zip",
});

export const CDN_TEMPLATE_PROJECT_PANORAMA_VIEWER = cdnRegionalFile({
  domestic: "1833c3a5-045a-4802-a72c-4b8cbc38e89f.zip",
  overseas: "1889486e-32ae-4ba1-9128-2b4a00927d14.zip",
});

export const CDN_TEMPLATE_PROJECT_RELIGHT = cdnRegionalFile({
  domestic: "46769f81-b9bb-4fb7-8688-3792b510a578.zip",
  overseas: "9cb2a2c1-e20a-455b-a455-684e56f25472.zip",
});

export const CDN_TEMPLATE_PROJECT_WATERMARK_TOOL = cdnRegionalFile({
  domestic: "52e8059e-f99c-4e5d-9e2e-e508d366d3e4.zip",
  overseas: "cfd4abcc-a484-4933-baed-2b75ae7899e1.zip",
});

export const CDN_CONNECTOR_CUSTOM = cdnRegionalImage({
  domestic: "connector-custom-512-2df5a8a59c73.png",
  overseas: "connector-custom-512-2df5a8a59c73.png",
});

export const activeIds = new Set();

export const listeners$5 = new Set();

function emit$3() {
  for (const listener of listeners$5) listener();
}

function acquireModalPresence(id2) {
  activeIds.add(id2);
  emit$3();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeIds.delete(id2);
    emit$3();
  };
}

export function useBlockingModalPresence(id2, active2) {
  reactExports.useEffect(() => {
    if (!active2) return;
    return acquireModalPresence(id2);
  }, [id2, active2]);
}
