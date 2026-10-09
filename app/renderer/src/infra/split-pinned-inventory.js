// split-pinned-inventory.js
import { getRuntimeConfig, createFileRoute, lazyRouteComponent, redirect } from "../vendor.js";
import { applyReactScan, resolveDesktopCanvasRenderPolicy } from "../assets/apply-asset-change.jsx";
import { recordCanvasRenderPolicy } from "./create-html-iframe-pool-store.jsx";
import { DEBUG_FLAGS, canUseDebugTooling } from "../workspace/create-visible-preview-tabs-store.js";
import { ACTION_ICON_KEYS } from "../media-editing/parse-timeline-operations.js";
import { normalizeWorkspaceId } from "../settings/run-manual-update-check.js";
import { getPlatform } from "./track-events.js";
import { useReleaseBadges } from "../generation/use-mention-models.jsx";
import { workspaceInventoryPathKey } from "../workspace/workspace-events.js";
export function isActionIcon(value) {
  return typeof value === "string" && ACTION_ICON_KEYS.includes(value);
}
export function invalid(error) {
  return {
    state: null,
    error,
  };
}
export function pinnedWorkspaceAliases(item) {
  const aliases = [item.workspace.path];
  if (item.recentPath) aliases.push(item.recentPath);
  if (item.authoritativeEntry) aliases.push(item.authoritativeEntry.folderPath);
  return aliases;
}
export function removePinnedWorkspacePaths(pinnedPaths, aliasPaths, caseInsensitive) {
  const aliasKeys = new Set(
    aliasPaths.map((path2) => workspaceInventoryPathKey(path2, caseInsensitive)),
  );
  return pinnedPaths.filter(
    (path2) => !aliasKeys.has(workspaceInventoryPathKey(path2, caseInsensitive)),
  );
}
export function splitPinnedInventory(inventory, pinnedPaths, caseInsensitive) {
  if (pinnedPaths.length === 0)
    return {
      pinned: [],
      unpinned: [...inventory],
    };
  const itemByAliasKey = new Map();
  for (const item of inventory) {
    for (const alias of pinnedWorkspaceAliases(item)) {
      const key2 = workspaceInventoryPathKey(alias, caseInsensitive);
      if (!itemByAliasKey.has(key2)) itemByAliasKey.set(key2, item);
    }
  }
  const seen2 = new Set();
  const pinned = [];
  for (const path2 of pinnedPaths) {
    const item = itemByAliasKey.get(workspaceInventoryPathKey(path2, caseInsensitive));
    if (!item || seen2.has(item)) continue;
    seen2.add(item);
    pinned.push(item);
  }
  const unpinned = inventory.filter((item) => !seen2.has(item));
  return {
    pinned,
    unpinned,
  };
}
const RECENT_PROJECT_DISMISSALS_STORAGE_KEY = "hilo.home.recent-project-dismissals.v1";
const RECENT_PROJECT_DISMISSALS_VERSION = 1;
const MAX_RECENT_PROJECT_DISMISSALS = 50;
export const recentProjectDismissalListeners = new Set();
function normalizePaths(paths) {
  return Array.from(
    new Set(paths.map((path2) => path2.trim()).filter((path2) => path2.length > 0)),
  );
}
function normalizeDismissal(value) {
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  if (!Array.isArray(candidate.paths) || !Number.isFinite(candidate.recentOpenedAt)) return null;
  const paths = normalizePaths(candidate.paths.filter((path2) => typeof path2 === "string"));
  return paths.length > 0 && candidate.recentOpenedAt !== void 0
    ? {
        paths,
        recentOpenedAt: candidate.recentOpenedAt,
      }
    : null;
}
export function readRecentProjectDismissals() {
  try {
    const raw2 = window.localStorage.getItem(RECENT_PROJECT_DISMISSALS_STORAGE_KEY);
    if (!raw2) return [];
    const parsed = JSON.parse(raw2);
    if (parsed.version !== RECENT_PROJECT_DISMISSALS_VERSION || !Array.isArray(parsed.dismissals)) {
      return [];
    }
    return parsed.dismissals
      .map(normalizeDismissal)
      .filter((dismissal) => dismissal !== null)
      .slice(-MAX_RECENT_PROJECT_DISMISSALS);
  } catch {
    return [];
  }
}
export function persistRecentProjectDismissals(dismissals) {
  const value = {
    version: RECENT_PROJECT_DISMISSALS_VERSION,
    dismissals: dismissals.slice(-MAX_RECENT_PROJECT_DISMISSALS).map((dismissal) => ({
      paths: [...dismissal.paths],
      recentOpenedAt: dismissal.recentOpenedAt,
    })),
  };
  try {
    window.localStorage.setItem(RECENT_PROJECT_DISMISSALS_STORAGE_KEY, JSON.stringify(value));
  } catch {}
  queueMicrotask(() => {
    for (const listener of recentProjectDismissalListeners) {
      listener(value.dismissals);
    }
  });
}
export function upsertRecentProjectDismissal(previous2, dismissal) {
  const paths = normalizePaths(dismissal.paths);
  if (paths.length === 0) return [...previous2];
  const pathSet = new Set(paths);
  const withoutAliases = previous2.filter(
    (entry) => !entry.paths.some((path2) => pathSet.has(path2)),
  );
  return [
    ...withoutAliases,
    {
      paths,
      recentOpenedAt: dismissal.recentOpenedAt,
    },
  ].slice(-MAX_RECENT_PROJECT_DISMISSALS);
}
export function removeRecentProjectDismissal(previous2, dismissal) {
  const paths = new Set(dismissal.paths);
  return previous2.filter(
    (entry) =>
      entry.recentOpenedAt !== dismissal.recentOpenedAt ||
      !entry.paths.some((path2) => paths.has(path2)),
  );
}
const badges = [
  {
    id: "home-sidebar-connector-launch-v1",
    target: "connectors",
    display: {
      mode: "once",
      initial: {
        label: "New",
        tone: "brand",
      },
      afterComplete: null,
    },
  },
  {
    target: "workflows",
    display: {
      label: "Beta",
      tone: "muted",
    },
  },
];
const badgeConfig = {
  badges,
};
const SIDEBAR_BADGE_CONFIG = badgeConfig;
export function useSidebarBadges() {
  const { badges: badges2, markReleaseBadgeComplete } = useReleaseBadges(
    SIDEBAR_BADGE_CONFIG.badges,
  );
  return {
    badges: badges2,
    markSidebarBadgeVisited: markReleaseBadgeComplete,
  };
}
const $$splitComponentImporter$c = () => (() => import("../_home-COqe4OG7.js"))();
export const Route$d = createFileRoute("/_home")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component"),
});
const $$splitComponentImporter$b = () => (() => import("../_app-BYKdG-ns.js"))();
export const Route$c = createFileRoute("/_app")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component"),
});
const $$splitComponentImporter$a = () => (() => import("../home/index.jsx"))();
export const Route$b = createFileRoute("/_home/")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
});
const $$splitComponentImporter$9 = () => (() => import("../workflows/index.jsx"))();
export const Route$a = createFileRoute("/_home/workflows/")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component"),
  validateSearch: (search2) => ({
    tab: search2.tab === "mine" ? "mine" : search2.tab === "official" ? "official" : void 0,
  }),
});
export const Route$9 = createFileRoute("/_home/skill-community/")({
  validateSearch: (search2) => ({
    ...(search2.capability === "skills" || search2.capability === "connectors"
      ? {
          capability: search2.capability,
        }
      : {}),
    ...(search2.tab === "community" || search2.tab === "plugins" || search2.tab === "mine"
      ? {
          tab: search2.tab,
        }
      : {}),
    ...(search2.subTab === "skills" || search2.subTab === "plugins"
      ? {
          subTab: search2.subTab,
        }
      : {}),
    ...(typeof search2.pluginId === "string"
      ? {
          pluginId: search2.pluginId,
        }
      : {}),
  }),
  beforeLoad: ({ search: search2 }) => {
    throw redirect({
      to: "/skills",
      search: search2,
    });
  },
});
function parseProjectListSearch(search2) {
  return {
    kind: search2.kind === "team" ? "team" : "local",
  };
}
export function projectListLocation(kind) {
  return {
    to: "/projects",
    search: {
      kind,
    },
  };
}
const $$splitComponentImporter$8 = () => (() => import("../projects/index.jsx"))();
export const Route$8 = createFileRoute("/_home/projects/")({
  validateSearch: parseProjectListSearch,
  component: lazyRouteComponent($$splitComponentImporter$8, "component"),
});
const $$splitComponentImporter$7 = () => (() => import("../creations/index.jsx"))();
export const Route$7 = createFileRoute("/_home/creations/")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component"),
});
const $$splitComponentImporter$6 = () => (() => import("../changelog/index.jsx"))();
export const Route$6 = createFileRoute("/_home/changelog/")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component"),
  validateSearch: (search2) => ({
    targetId: typeof search2.targetId === "string" ? search2.targetId : void 0,
    source: search2.source === "home_top_whats_new" ? "home_top_whats_new" : void 0,
  }),
});
const $$splitComponentImporter$5 = () => (() => import("../index-DRApim0M.js"))();
function validateAssetCenterSearch(search2) {
  const result = {};
  if (search2.action === "create") result.action = "create";
  const returnWorkspaceId = normalizeWorkspaceId(search2.returnWorkspaceId);
  if (returnWorkspaceId) result.returnWorkspaceId = returnWorkspaceId;
  return result;
}
export const Route$5 = createFileRoute("/_home/asset-center/")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component"),
  validateSearch: validateAssetCenterSearch,
});
const $$splitComponentImporter$4 = () => (() => import("../index-HL7p23h1.js"))();
function parseInitialAttachments(value) {
  if (Array.isArray(value) && value.every((v2) => typeof v2 === "string")) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v2) => typeof v2 === "string")) return parsed;
  } catch {}
  return void 0;
}
function parseInitialSelectedMediaModels(value) {
  let raw2 = value;
  if (typeof value === "string") {
    try {
      raw2 = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const obj = raw2;
  const pick = (key2) => {
    const list2 = obj[key2];
    if (list2 === void 0) return void 0;
    if (Array.isArray(list2) && list2.every((id2) => typeof id2 === "string")) return list2;
    return void 0;
  };
  const result = {};
  const image2 = pick("image");
  const video = pick("video");
  const audio = pick("audio");
  if (image2 !== void 0) result.image = image2;
  if (video !== void 0) result.video = video;
  if (audio !== void 0) result.audio = audio;
  return result;
}
export const Route$4 = createFileRoute("/_app/workspace/")({
  validateSearch: (search2) => ({
    workspaceId: normalizeWorkspaceId(search2.workspaceId),
    initialPayloadId:
      typeof search2.initialPayloadId === "string" ? search2.initialPayloadId : void 0,
    initialMessage: search2.initialMessage != null ? String(search2.initialMessage) : void 0,
    initialAttachments: parseInitialAttachments(search2.initialAttachments),
    initialEntityRefs: parseInitialAttachments(search2.initialEntityRefs),
    initialModelId: typeof search2.initialModelId === "string" ? search2.initialModelId : void 0,
    initialSelectedMediaModels: parseInitialSelectedMediaModels(search2.initialSelectedMediaModels),
    skillPrompt: typeof search2.skillPrompt === "string" ? search2.skillPrompt : void 0,
    skillName: typeof search2.skillName === "string" ? search2.skillName : void 0,
    pluginId: typeof search2.pluginId === "string" ? search2.pluginId : void 0,
    initialComfyUiWorkflowId:
      typeof search2.initialComfyUiWorkflowId === "string" &&
      search2.initialComfyUiWorkflowId.trim()
        ? search2.initialComfyUiWorkflowId
        : void 0,
    initialComfyUiWorkflowTarget:
      search2.initialComfyUiWorkflowTarget === "current" ||
      search2.initialComfyUiWorkflowTarget === "new"
        ? search2.initialComfyUiWorkflowTarget
        : void 0,
    menuAction:
      search2.menuAction === "new-chat" || search2.menuAction === "open-settings"
        ? search2.menuAction
        : void 0,
    assetCenterRelocation:
      search2.assetCenterRelocation === true || search2.assetCenterRelocation === "true"
        ? true
        : void 0,
  }),
  beforeLoad: ({ search: search2 }) => {
    if (!search2.workspaceId)
      throw redirect({
        to: "/",
      });
  },
  component: lazyRouteComponent($$splitComponentImporter$4, "component"),
});
const $$splitComponentImporter$3 = () => (() => import("../skills/index.jsx"))();
function validateSkillsSearch(search2) {
  const out = {};
  const capability = search2.capability;
  if (capability === "skills" || capability === "connectors") {
    out.capability = capability;
  }
  const tab2 = search2.tab;
  if (tab2 === "community" || tab2 === "plugins" || tab2 === "mine") {
    out.tab = tab2;
  }
  const subTab = search2.subTab;
  if (subTab === "skills" || subTab === "plugins") {
    out.subTab = subTab;
  }
  const pluginId = typeof search2.pluginId === "string" ? search2.pluginId.trim() : "";
  if (pluginId) out.pluginId = pluginId;
  const skillName = typeof search2.skillName === "string" ? search2.skillName.trim() : "";
  if (skillName) out.skillName = skillName;
  const connectorId = typeof search2.connectorId === "string" ? search2.connectorId.trim() : "";
  if (connectorId) out.connectorId = connectorId;
  return out;
}
export const Route$3 = createFileRoute("/_app/skills/")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component"),
  // Accept capability and detail identifiers so external entries can deep-link
  // to a specific Skill, plugin, or Connector without duplicating their flows.
  // Unknown values are silently dropped so the page falls back to its default.
  // subTab only applies when tab === 'mine' (the only tab with a sub-switcher);
  // we still validate it independently so the schema stays self-describing.
  validateSearch: validateSkillsSearch,
});
const $$splitComponentImporter$2 = () => (() => import("../project-detail/index.jsx"))();
export const Route$2 = createFileRoute("/_home/projects/$projectId")({
  validateSearch: (search2) => ({
    tab: typeof search2.tab === "string" ? search2.tab : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
});
const $$splitComponentImporter$1 = () => (() => import("../remote-tool-DZYmJVoR.js"))();
export const Route$1 = createFileRoute("/_app/debug/remote-tool")({
  validateSearch: (search2) => ({
    url: typeof search2.url === "string" ? search2.url : void 0,
    manifest: typeof search2.manifest === "string" ? search2.manifest : void 0,
    tool: typeof search2.tool === "string" ? search2.tool : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
});
function requireChatCaseDebugAccess(canUseDebug = canUseDebugTooling) {
  if (!canUseDebug()) {
    throw redirect({
      to: "/",
    });
  }
}
const $$splitComponentImporter = () => (() => import("../chat-case-_htrAxBf.js"))();
export const Route2 = createFileRoute("/_app/debug/chat-case")({
  beforeLoad: () => requireChatCaseDebugAccess(),
  validateSearch: (search2) => ({
    case:
      search2.case === "image-reconnect-duplicate" ||
      search2.case === "production-confirm-overlap" ||
      search2.case === "question-overflow" ||
      search2.case === "generation-errors"
        ? search2.case
        : void 0,
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component"),
});
export const rendererRuntimeConfig = getRuntimeConfig();
const rendererPlatform = getPlatform();
recordCanvasRenderPolicy(
  resolveDesktopCanvasRenderPolicy(
    {
      os: rendererPlatform.app.os,
      arch: rendererPlatform.app.arch,
    },
    rendererRuntimeConfig,
  ),
);
export const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
if (canUseDebugTooling()) {
  try {
    const enabled = localStorage.getItem(DEBUG_FLAGS.reactScan) === "1";
    void applyReactScan(enabled);
  } catch {}
}
