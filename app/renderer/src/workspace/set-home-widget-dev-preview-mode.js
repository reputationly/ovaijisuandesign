// set-home-widget-dev-preview-mode.js
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { reactExports, storageKeys, useQueryClient } from "../vendor.js";
import { canUseDebugTooling } from "./use-deep-link-router.js";

export function findEntryByPath(entries2, path2) {
  for (const entry of entries2) {
    if (entry.path === path2) return entry;
    if (entry.children) {
      const found2 = findEntryByPath(entry.children, path2);
      if (found2) return found2;
    }
  }
  return null;
}

export function formatDuration$3(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.ceil(seconds);
  const mm = Math.floor(total / 60);
  const ss2 = total % 60;
  return `${mm}:${ss2.toString().padStart(2, "0")}`;
}

export function formatFileSizeCompact(bytes2) {
  if (bytes2 == null || !Number.isFinite(bytes2) || bytes2 < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n2 = bytes2;
  let i2 = 0;
  while (n2 >= 1024 && i2 < units.length - 1) {
    n2 /= 1024;
    i2++;
  }
  const fixed = i2 === 0 ? 0 : n2 >= 100 ? 0 : 1;
  return `${n2.toFixed(fixed)} ${units[i2]}`;
}

export const FilterMenu = Popover;

export const FilterMenuTrigger = PopoverTrigger;

export const SIDEBAR_TAB_STORAGE_KEY = "canvasSidebar.activeTab";

export const HOME_WIDGET_DEV_PREVIEW_EVENT =
  "hub:home-widget-dev-preview-change";

const STORAGE_KEY$4 = "hilo-home-widget-preview";

function canUseHomeWidgetDevPreview() {
  return canUseDebugTooling();
}

function readSelection() {
  if (!canUseHomeWidgetDevPreview()) return "real";
  const value = globalThis.sessionStorage?.getItem(STORAGE_KEY$4);
  return value === "empty" || value === "survey" || value === "update"
    ? value
    : "real";
}

export let snapshot$1 = {
  selection: "real",
  revision: 0,
};

export function getSnapshot() {
  const selection2 = readSelection();
  if (selection2 !== snapshot$1.selection)
    snapshot$1 = {
      selection: selection2,
      revision: snapshot$1.revision + 1,
    };
  return snapshot$1;
}

export function setHomeWidgetDevPreviewMode(mode2) {
  if (!canUseHomeWidgetDevPreview()) return;
  if (mode2 === "real") {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY$4);
  } else {
    globalThis.sessionStorage?.setItem(STORAGE_KEY$4, mode2);
  }
  snapshot$1 = {
    selection: mode2,
    revision: snapshot$1.revision + 1,
  };
  globalThis.window?.dispatchEvent(
    new CustomEvent(HOME_WIDGET_DEV_PREVIEW_EVENT),
  );
}

export const RECENT_WORKSPACES_REFRESH_EVENT = "hilo:recent-workspaces-refresh";

export function useRecentWorkspacesRefresh() {
  const queryClient2 = useQueryClient();
  reactExports.useEffect(() => {
    const invalidateRecentWorkspaces = () => {
      void queryClient2.invalidateQueries({
        queryKey: storageKeys.global("recentWorkspaces"),
      });
    };
    invalidateRecentWorkspaces();
    window.addEventListener("focus", invalidateRecentWorkspaces);
    window.addEventListener(
      RECENT_WORKSPACES_REFRESH_EVENT,
      invalidateRecentWorkspaces,
    );
    return () => {
      window.removeEventListener("focus", invalidateRecentWorkspaces);
      window.removeEventListener(
        RECENT_WORKSPACES_REFRESH_EVENT,
        invalidateRecentWorkspaces,
      );
    };
  }, [queryClient2]);
}

export const HOME_SIDEBAR_WIDTH = 264;

export const GLOBAL_SIDEBAR_MIN_WIDTH = 220;

export const GLOBAL_SIDEBAR_MAX_WIDTH = 360;

export const GLOBAL_SIDEBAR_RAIL_WIDTH = 64;

export const GlobalSidebarContext = reactExports.createContext(null);
