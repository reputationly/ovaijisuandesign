// set-home-widget-dev-preview-mode.js
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import reactExports from "react";
import { storageKeys } from "../infra/storage-cache.js";
import { useQueryClient } from "@tanstack/react-query";
import { canUseDebugTooling } from "./use-deep-link-router.js";
export function findEntryByPath(entries, path) {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    if (entry.children) {
      const found = findEntryByPath(entry.children, path);
      if (found) return found;
    }
  }
  return null;
}
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.ceil(seconds);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
export function formatFileSizeCompact(bytes) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let scaledBytes = bytes;
  let unitIndex = 0;
  while (scaledBytes >= 1024 && unitIndex < units.length - 1) {
    scaledBytes /= 1024;
    unitIndex++;
  }
  const fixed = unitIndex === 0 ? 0 : scaledBytes >= 100 ? 0 : 1;
  return `${scaledBytes.toFixed(fixed)} ${units[unitIndex]}`;
}
export const FilterMenu = Popover;
export const FilterMenuTrigger = PopoverTrigger;
export const SIDEBAR_TAB_STORAGE_KEY = "canvasSidebar.activeTab";
export const HOME_WIDGET_DEV_PREVIEW_EVENT =
  "hub:home-widget-dev-preview-change";
const STORAGE_KEY = "hilo-home-widget-preview";
function canUseHomeWidgetDevPreview() {
  return canUseDebugTooling();
}
function readSelection() {
  if (!canUseHomeWidgetDevPreview()) return "real";
  const value = globalThis.sessionStorage?.getItem(STORAGE_KEY);
  return value === "empty" || value === "survey" || value === "update"
    ? value
    : "real";
}
export let snapshot = {
  selection: "real",
  revision: 0,
};
export function getSnapshot() {
  const selection = readSelection();
  if (selection !== snapshot.selection)
    snapshot = {
      selection,
      revision: snapshot.revision + 1,
    };
  return snapshot;
}
export function setHomeWidgetDevPreviewMode(mode) {
  if (!canUseHomeWidgetDevPreview()) return;
  if (mode === "real") {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  } else {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, mode);
  }
  snapshot = {
    selection: mode,
    revision: snapshot.revision + 1,
  };
  globalThis.window?.dispatchEvent(
    new CustomEvent(HOME_WIDGET_DEV_PREVIEW_EVENT),
  );
}
export const RECENT_WORKSPACES_REFRESH_EVENT = "hilo:recent-workspaces-refresh";
export function useRecentWorkspacesRefresh() {
  const queryClient = useQueryClient();
  reactExports.useEffect(() => {
    const invalidateRecentWorkspaces = () => {
      void queryClient.invalidateQueries({
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
  }, [queryClient]);
}
export const HOME_SIDEBAR_WIDTH = 264;
export const GLOBAL_SIDEBAR_MIN_WIDTH = 220;
export const GLOBAL_SIDEBAR_MAX_WIDTH = 360;
export const GLOBAL_SIDEBAR_RAIL_WIDTH = 64;
export const GlobalSidebarContext = reactExports.createContext(null);
