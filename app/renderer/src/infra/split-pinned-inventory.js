// split-pinned-inventory.js
import { workspaceInventoryPathKey } from "../workspace/normalize-project-entries.js";
import { useReleaseBadges } from "../generation/use-mention-models.jsx";
import { getRuntimeConfig } from "../vendor.js";
import { resolveDesktopCanvasRenderPolicy } from "../assets/credit-query-keys.jsx";
import { recordCanvasRenderPolicy } from "./use-plugin-metadata-store.js";
import { getPlatform } from "./web-storage.js";

export function pinnedWorkspaceAliases(item) {
  const aliases = [item.workspace.path];
  if (item.recentPath) aliases.push(item.recentPath);
  if (item.authoritativeEntry) aliases.push(item.authoritativeEntry.folderPath);
  return aliases;
}

export function removePinnedWorkspacePaths(
  pinnedPaths,
  aliasPaths,
  caseInsensitive,
) {
  const aliasKeys = new Set(
    aliasPaths.map((path) =>
      workspaceInventoryPathKey(path, caseInsensitive),
    ),
  );
  return pinnedPaths.filter(
    (path) =>
      !aliasKeys.has(workspaceInventoryPathKey(path, caseInsensitive)),
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
      const key = workspaceInventoryPathKey(alias, caseInsensitive);
      if (!itemByAliasKey.has(key)) itemByAliasKey.set(key, item);
    }
  }
  const seen = new Set();
  const pinned = [];
  for (const path of pinnedPaths) {
    const item = itemByAliasKey.get(
      workspaceInventoryPathKey(path, caseInsensitive),
    );
    if (!item || seen.has(item)) continue;
    seen.add(item);
    pinned.push(item);
  }
  const unpinned = inventory.filter((item) => !seen.has(item));
  return {
    pinned,
    unpinned,
  };
}

const RECENT_PROJECT_DISMISSALS_STORAGE_KEY =
  "hilo.home.recent-project-dismissals.v1";

const RECENT_PROJECT_DISMISSALS_VERSION = 1;

const MAX_RECENT_PROJECT_DISMISSALS = 50;

export const recentProjectDismissalListeners = new Set();

function normalizePaths(paths) {
  return Array.from(
    new Set(
      paths.map((path) => path.trim()).filter((path) => path.length > 0),
    ),
  );
}

function normalizeDismissal(value) {
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  if (
    !Array.isArray(candidate.paths) ||
    !Number.isFinite(candidate.recentOpenedAt)
  )
    return null;
  const paths = normalizePaths(
    candidate.paths.filter((path) => typeof path === "string"),
  );
  return paths.length > 0 && candidate.recentOpenedAt !== void 0
    ? {
        paths,
        recentOpenedAt: candidate.recentOpenedAt,
      }
    : null;
}

export function readRecentProjectDismissals() {
  try {
    const raw = window.localStorage.getItem(
      RECENT_PROJECT_DISMISSALS_STORAGE_KEY,
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      parsed.version !== RECENT_PROJECT_DISMISSALS_VERSION ||
      !Array.isArray(parsed.dismissals)
    ) {
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
    dismissals: dismissals
      .slice(-MAX_RECENT_PROJECT_DISMISSALS)
      .map((dismissal) => ({
        paths: [...dismissal.paths],
        recentOpenedAt: dismissal.recentOpenedAt,
      })),
  };
  try {
    window.localStorage.setItem(
      RECENT_PROJECT_DISMISSALS_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch {}
  queueMicrotask(() => {
    for (const listener of recentProjectDismissalListeners) {
      listener(value.dismissals);
    }
  });
}

export function upsertRecentProjectDismissal(previous, dismissal) {
  const paths = normalizePaths(dismissal.paths);
  if (paths.length === 0) return [...previous];
  const pathSet = new Set(paths);
  const withoutAliases = previous.filter(
    (entry) => !entry.paths.some((path) => pathSet.has(path)),
  );
  return [
    ...withoutAliases,
    {
      paths,
      recentOpenedAt: dismissal.recentOpenedAt,
    },
  ].slice(-MAX_RECENT_PROJECT_DISMISSALS);
}

export function removeRecentProjectDismissal(previous, dismissal) {
  const paths = new Set(dismissal.paths);
  return previous.filter(
    (entry) =>
      entry.recentOpenedAt !== dismissal.recentOpenedAt ||
      !entry.paths.some((path) => paths.has(path)),
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
  const { badges, markReleaseBadgeComplete } = useReleaseBadges(
    SIDEBAR_BADGE_CONFIG.badges,
  );
  return {
    badges,
    markSidebarBadgeVisited: markReleaseBadgeComplete,
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
