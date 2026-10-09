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
    aliasPaths.map((path2) =>
      workspaceInventoryPathKey(path2, caseInsensitive),
    ),
  );
  return pinnedPaths.filter(
    (path2) =>
      !aliasKeys.has(workspaceInventoryPathKey(path2, caseInsensitive)),
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
    const item = itemByAliasKey.get(
      workspaceInventoryPathKey(path2, caseInsensitive),
    );
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

const RECENT_PROJECT_DISMISSALS_STORAGE_KEY =
  "hilo.home.recent-project-dismissals.v1";

const RECENT_PROJECT_DISMISSALS_VERSION = 1;

const MAX_RECENT_PROJECT_DISMISSALS = 50;

export const recentProjectDismissalListeners = new Set();

function normalizePaths(paths) {
  return Array.from(
    new Set(
      paths.map((path2) => path2.trim()).filter((path2) => path2.length > 0),
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
    candidate.paths.filter((path2) => typeof path2 === "string"),
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
    const raw2 = window.localStorage.getItem(
      RECENT_PROJECT_DISMISSALS_STORAGE_KEY,
    );
    if (!raw2) return [];
    const parsed = JSON.parse(raw2);
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
