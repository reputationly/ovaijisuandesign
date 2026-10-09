// global-sidebar-provider.jsx
import {
  reactExports,
  useStorage,
  BROWSER_ASSET_SOURCE_METADATA_KEYS,
  useQueryClient,
  storageKeys,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover, PopoverTrigger } from "../assets/apply-asset-change.jsx";
import { canUseDebugTooling } from "./create-visible-preview-tabs-store.js";
import { getNodeIdsForAsset } from "../infra/track-events.js";
import { useStableCallback } from "../assets/use-entity-hover-preview.js";
import { workspaceEvents } from "./use-hub-logo-hover-animation.jsx";
import { useResizableWidth } from "../generation/use-resizable-width.js";
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
function formatModifiedAt(value) {
  if (value == null || value === "") return "";
  let d2;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1e3 : value;
    d2 = new Date(ms);
  } else {
    d2 = new Date(value);
  }
  if (Number.isNaN(d2.getTime())) return "";
  const pad = (n2) => n2.toString().padStart(2, "0");
  return `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())} ${pad(d2.getHours())}:${pad(d2.getMinutes())}`;
}
export function useFileExplorerOverlayBridge({
  rootPath,
  assetByAbsPath,
  currentWorkspace,
  filteredTree,
  handleAddToCanvas,
}) {
  const overlayHostRef = reactExports.useRef(null);
  const rowAnchorsRef = reactExports.useRef(new Map());
  const registerRowAnchor = useStableCallback((path2, el) => {
    if (el) {
      rowAnchorsRef.current.set(path2, el);
    } else {
      rowAnchorsRef.current.delete(path2);
    }
  });
  const getRowAnchor = useStableCallback((path2) => rowAnchorsRef.current.get(path2));
  const handleHoverIntent = useStableCallback((target) => {
    overlayHostRef.current?.notifyHoverIntent(target);
  });
  const handleHoverEnd = useStableCallback(() => {
    overlayHostRef.current?.notifyHoverEnd();
  });
  const handleLocateOnCanvas = useStableCallback((target) => {
    const asset = assetByAbsPath.get(target.path);
    const showMissing = () => {
      const anchor = rowAnchorsRef.current.get(target.path);
      if (!anchor) {
        return;
      }
      overlayHostRef.current?.showLocateMissing(anchor, target.path);
    };
    if (!asset?.id) {
      showMissing();
      return;
    }
    const nodeIds = getNodeIdsForAsset(asset.id, currentWorkspace);
    if (nodeIds.length === 0) {
      showMissing();
      return;
    }
    overlayHostRef.current?.hideLocateMissing();
    workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds);
  });
  const handleHoverLocateOnCanvas = useStableCallback((absolutePath) => {
    handleLocateOnCanvas({
      path: absolutePath,
      name: absolutePath.split(/[/\\]/).pop() ?? absolutePath,
      isDirectory: false,
    });
  });
  const handleLocateMissingConfirmInsert = useStableCallback((absolutePath) => {
    const entry = findEntryByPath(filteredTree, absolutePath);
    handleAddToCanvas({
      path: absolutePath,
      name: entry?.name ?? absolutePath.split(/[/\\]/).pop() ?? absolutePath,
      isDirectory: entry?.isDirectory ?? false,
    });
  });
  reactExports.useEffect(() => {
    overlayHostRef.current?.hideLocateMissing();
  }, [rootPath]);
  return {
    overlayHostRef,
    registerRowAnchor,
    getRowAnchor,
    handleHoverIntent,
    handleHoverEnd,
    handleHoverLocateOnCanvas,
    handleLocateOnCanvas,
    handleLocateMissingConfirmInsert,
  };
}
export function browserAssetSourceWebsite(metadata) {
  const pageUrl = metadata?.[BROWSER_ASSET_SOURCE_METADATA_KEYS.pageUrl];
  if (typeof pageUrl !== "string" || !pageUrl) return "";
  try {
    const url2 = new URL(pageUrl);
    if (url2.protocol !== "http:" && url2.protocol !== "https:") return "";
    return url2.hostname.replace(/^www\./iu, "");
  } catch {
    return "";
  }
}
function pickString(meta2, key2) {
  const v2 = meta2?.[key2];
  return typeof v2 === "string" && v2 ? v2 : void 0;
}
export function pickNumber(meta2, key2) {
  const v2 = meta2?.[key2];
  return typeof v2 === "number" && Number.isFinite(v2) ? v2 : void 0;
}
function extOf(asset) {
  const base2 = asset.path.split(/[/\\]/).pop() ?? "";
  const dot2 = base2.lastIndexOf(".");
  return dot2 > 0 ? base2.slice(dot2 + 1).toUpperCase() : "";
}
function dimensions(asset) {
  if (asset.width && asset.height) return `${asset.width} × ${asset.height}`;
  return "";
}
export function modifiedAt(asset) {
  const mtime = asset.metadata?.mtime;
  if (typeof mtime === "number" || typeof mtime === "string") {
    const formatted = formatModifiedAt(mtime);
    if (formatted) return formatted;
  }
  return formatModifiedAt(asset.time);
}
export function imageRows(asset) {
  return [
    {
      labelKey: "dimensions",
      labelFallback: "Dimensions",
      value: dimensions(asset),
    },
    {
      labelKey: "format",
      labelFallback: "Format",
      value: extOf(asset),
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
export function videoRows(asset, _t2) {
  const fps = pickNumber(asset.metadata, "fps");
  const codec = pickString(asset.metadata, "codec");
  const bitRate = pickNumber(asset.metadata, "bitRate");
  return [
    {
      labelKey: "dimensions",
      labelFallback: "Resolution",
      value: dimensions(asset),
    },
    {
      labelKey: "duration",
      labelFallback: "Duration",
      value: formatDuration$3(asset.duration),
    },
    {
      labelKey: "fps",
      labelFallback: "Frame rate",
      value: fps != null ? `${fps} fps` : "",
    },
    {
      labelKey: "codec",
      labelFallback: "Codec",
      value: codec ?? "",
    },
    {
      labelKey: "bitrate",
      labelFallback: "Bitrate",
      value: bitRate != null ? `${Math.round(bitRate / 1e3)} kbps` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
export function fileRows(asset) {
  const pageCount = pickNumber(asset.metadata, "pageCount");
  const wordCount = pickNumber(asset.metadata, "wordCount");
  return [
    {
      labelKey: "format",
      labelFallback: "Format",
      value: extOf(asset),
    },
    {
      labelKey: "pageCount",
      labelFallback: "Pages",
      // 0 pages is a real (degenerate) value — explicitly check for null
      // rather than relying on truthy coercion that would hide a 0.
      value: pageCount != null ? `${pageCount}` : "",
    },
    {
      labelKey: "wordCount",
      labelFallback: "Words",
      value: wordCount != null ? `${wordCount.toLocaleString()}` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
export const FilterMenu = Popover;
export const FilterMenuTrigger = PopoverTrigger;
export const SIDEBAR_TAB_STORAGE_KEY = "canvasSidebar.activeTab";
const HOME_WIDGET_DEV_PREVIEW_EVENT = "hub:home-widget-dev-preview-change";
const STORAGE_KEY$4 = "hilo-home-widget-preview";
let snapshot$1 = {
  selection: "real",
  revision: 0,
};
const listeners$1 = new Set();
function canUseHomeWidgetDevPreview() {
  return canUseDebugTooling();
}
function readSelection() {
  if (!canUseHomeWidgetDevPreview()) return "real";
  const value = globalThis.sessionStorage?.getItem(STORAGE_KEY$4);
  return value === "empty" || value === "survey" || value === "update" ? value : "real";
}
function getSnapshot() {
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
  globalThis.window?.dispatchEvent(new CustomEvent(HOME_WIDGET_DEV_PREVIEW_EVENT));
}
function subscribeHomeWidgetDevPreview(listener) {
  listeners$1.add(listener);
  if (typeof window === "undefined") return () => listeners$1.delete(listener);
  window.addEventListener(HOME_WIDGET_DEV_PREVIEW_EVENT, listener);
  return () => {
    listeners$1.delete(listener);
    window.removeEventListener(HOME_WIDGET_DEV_PREVIEW_EVENT, listener);
  };
}
export function useHomeWidgetDevPreviewMode() {
  return reactExports.useSyncExternalStore(
    subscribeHomeWidgetDevPreview,
    getSnapshot,
    () => snapshot$1,
  );
}
export const SNAPSHOT_RETRY_DELAY_MS = 500;
export const SNAPSHOT_RETRY_MAX_ELAPSED_MS = 3e4;
export function createSnapshotUnavailableStatus(workspaceId2) {
  const id2 = workspaceId2 ?? "workspace";
  return {
    workspaceId: id2,
    folderPath: id2,
    state: "failed",
    revision: 0,
    error: "Workspace runtime did not become available in time. Please retry to resume it.",
    diagnosis: {
      code: "runtime_start_timeout",
    },
    synthetic: true,
  };
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
    window.addEventListener(RECENT_WORKSPACES_REFRESH_EVENT, invalidateRecentWorkspaces);
    return () => {
      window.removeEventListener("focus", invalidateRecentWorkspaces);
      window.removeEventListener(RECENT_WORKSPACES_REFRESH_EVENT, invalidateRecentWorkspaces);
    };
  }, [queryClient2]);
}
export const HOME_SIDEBAR_WIDTH = 264;
export const GLOBAL_SIDEBAR_MIN_WIDTH = 220;
export const GLOBAL_SIDEBAR_MAX_WIDTH = 360;
export const GLOBAL_SIDEBAR_RAIL_WIDTH = 64;
const GLOBAL_SIDEBAR_PREVIEW_OPEN_DELAY = 60;
const GLOBAL_SIDEBAR_PREVIEW_EXIT_DURATION = 0;
const GLOBAL_SIDEBAR_RESIZE_EXIT_POLL_DELAY = 50;
export const GlobalSidebarContext = reactExports.createContext(null);
export function GlobalSidebarProvider({ children: children2 }) {
  const [layout, , setLayoutAsync] = useStorage("global.globalSidebarLayout");
  const [legacyConfig] = useStorage("global.config");
  const layoutRef = reactExports.useRef(layout);
  layoutRef.current = layout;
  const persistedMode =
    layout?.mode ??
    legacyConfig.globalSidebarMode ??
    (legacyConfig.globalSidebarCollapsed ? "rail" : "pinned");
  const persistedWidth = layout?.width ?? legacyConfig.globalSidebarWidth;
  const [mode2, setMode] = reactExports.useState(persistedMode);
  const modeRef = reactExports.useRef(mode2);
  modeRef.current = mode2;
  const modeIntentRevisionRef = reactExports.useRef(0);
  const pendingModeIntentRef = reactExports.useRef(null);
  const [previewOpen, setPreviewOpen] = reactExports.useState(false);
  const previewOpenRef = reactExports.useRef(previewOpen);
  previewOpenRef.current = previewOpen;
  const [previewOpening, setPreviewOpening] = reactExports.useState(false);
  const [previewClosing, setPreviewClosing] = reactExports.useState(false);
  const previewClosingRef = reactExports.useRef(previewClosing);
  previewClosingRef.current = previewClosing;
  const previewOpenTimerRef = reactExports.useRef(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const previewExitTimerRef = reactExports.useRef(null);
  const previewHoldsRef = reactExports.useRef(new Set());
  const previewCloseRequestedWhileHeldRef = reactExports.useRef(false);
  const storage = reactExports.useMemo(
    () => ({
      read: () => layoutRef.current?.width,
      write: (value2) => {
        void setLayoutAsync((previous2) => ({
          ...previous2,
          width: value2,
        }));
      },
    }),
    [setLayoutAsync],
  );
  const {
    width,
    onMouseDown: onResizeMouseDown,
    onValueChange: onResizeValueChange,
    reset: resetWidth,
  } = useResizableWidth({
    defaultWidth: HOME_SIDEBAR_WIDTH,
    minWidth: GLOBAL_SIDEBAR_MIN_WIDTH,
    maxWidth: GLOBAL_SIDEBAR_MAX_WIDTH,
    storage,
    externalValue: persistedWidth,
  });
  reactExports.useEffect(() => {
    const pendingIntent = pendingModeIntentRef.current;
    if (pendingIntent) return;
    modeRef.current = persistedMode;
    setMode((previous2) => (previous2 === persistedMode ? previous2 : persistedMode));
  }, [persistedMode]);
  const clearPreviewOpenTimer = reactExports.useCallback(() => {
    if (!previewOpenTimerRef.current) return;
    clearTimeout(previewOpenTimerRef.current);
    previewOpenTimerRef.current = null;
    setPreviewOpening(false);
  }, []);
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (!previewCloseTimerRef.current) return;
    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const clearPreviewExitTimer = reactExports.useCallback(() => {
    if (!previewExitTimerRef.current) return;
    clearTimeout(previewExitTimerRef.current);
    previewExitTimerRef.current = null;
  }, []);
  reactExports.useEffect(
    () => () => {
      clearPreviewOpenTimer();
      clearPreviewCloseTimer();
      clearPreviewExitTimer();
    },
    [clearPreviewCloseTimer, clearPreviewExitTimer, clearPreviewOpenTimer],
  );
  const commitMode = reactExports.useCallback(
    (next2) => {
      const revision = modeIntentRevisionRef.current + 1;
      modeIntentRevisionRef.current = revision;
      pendingModeIntentRef.current = {
        revision,
        value: next2,
      };
      modeRef.current = next2;
      setMode(next2);
      previewOpenRef.current = false;
      setPreviewOpen(false);
      previewClosingRef.current = false;
      setPreviewClosing(false);
      void setLayoutAsync((previous2) => ({
        ...previous2,
        mode: next2,
      })).then((persisted) => {
        if (pendingModeIntentRef.current?.revision !== revision) return;
        if (persisted) {
          pendingModeIntentRef.current = null;
          return;
        }
      });
    },
    [setLayoutAsync],
  );
  const pinOpen = reactExports.useCallback(() => {
    clearPreviewOpenTimer();
    clearPreviewCloseTimer();
    clearPreviewExitTimer();
    commitMode("pinned");
  }, [clearPreviewCloseTimer, clearPreviewExitTimer, clearPreviewOpenTimer, commitMode]);
  const togglePinned = reactExports.useCallback(() => {
    clearPreviewOpenTimer();
    clearPreviewCloseTimer();
    clearPreviewExitTimer();
    commitMode(modeRef.current === "pinned" ? "rail" : "pinned");
  }, [clearPreviewCloseTimer, clearPreviewExitTimer, clearPreviewOpenTimer, commitMode]);
  const setPinned = reactExports.useCallback(
    (pinned) => {
      const next2 = pinned ? "pinned" : "rail";
      if (modeRef.current === next2) return;
      clearPreviewOpenTimer();
      clearPreviewCloseTimer();
      clearPreviewExitTimer();
      commitMode(next2);
    },
    [clearPreviewCloseTimer, clearPreviewExitTimer, clearPreviewOpenTimer, commitMode],
  );
  const openPreview = reactExports.useCallback(() => {
    if (modeRef.current !== "rail" || previewOpen || previewOpenTimerRef.current) return;
    clearPreviewCloseTimer();
    setPreviewOpening(true);
    previewOpenTimerRef.current = setTimeout(() => {
      previewOpenTimerRef.current = null;
      setPreviewOpening(false);
      if (modeRef.current === "rail") {
        previewOpenRef.current = true;
        setPreviewOpen(true);
      }
    }, GLOBAL_SIDEBAR_PREVIEW_OPEN_DELAY);
  }, [clearPreviewCloseTimer, previewOpen]);
  const keepPreviewOpen = reactExports.useCallback(() => {
    clearPreviewOpenTimer();
    clearPreviewCloseTimer();
    clearPreviewExitTimer();
    previewCloseRequestedWhileHeldRef.current = false;
    if (previewClosingRef.current) {
      previewClosingRef.current = false;
      setPreviewClosing(false);
    }
  }, [clearPreviewCloseTimer, clearPreviewExitTimer, clearPreviewOpenTimer]);
  const completePreviewClose = reactExports.useCallback(() => {
    if (!previewClosingRef.current) return;
    clearPreviewExitTimer();
    if (document.documentElement.dataset.columnResizeActive === "true") {
      previewClosingRef.current = false;
      setPreviewClosing(false);
      return;
    }
    previewClosingRef.current = false;
    setPreviewClosing(false);
    previewOpenRef.current = false;
    setPreviewOpen(false);
  }, [clearPreviewExitTimer]);
  const beginPreviewClose = reactExports.useCallback(() => {
    if (modeRef.current !== "rail" || !previewOpenRef.current || previewClosingRef.current) {
      return;
    }
    previewClosingRef.current = true;
    setPreviewClosing(true);
    clearPreviewExitTimer();
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    previewExitTimerRef.current = setTimeout(
      completePreviewClose,
      reducedMotion ? 0 : GLOBAL_SIDEBAR_PREVIEW_EXIT_DURATION,
    );
  }, [clearPreviewExitTimer, completePreviewClose]);
  const schedulePreviewClose = reactExports.useCallback(() => {
    if (modeRef.current !== "rail") return;
    if (previewHoldsRef.current.size > 0) {
      previewCloseRequestedWhileHeldRef.current = true;
      return;
    }
    clearPreviewOpenTimer();
    clearPreviewCloseTimer();
    if (!previewOpenRef.current) return;
    const closeWhenResizeFinishes = () => {
      if (document.documentElement.dataset.columnResizeActive === "true") {
        previewCloseTimerRef.current = setTimeout(
          closeWhenResizeFinishes,
          GLOBAL_SIDEBAR_RESIZE_EXIT_POLL_DELAY,
        );
        return;
      }
      previewCloseTimerRef.current = null;
      beginPreviewClose();
    };
    closeWhenResizeFinishes();
  }, [beginPreviewClose, clearPreviewCloseTimer, clearPreviewOpenTimer]);
  const holdPreviewOpen = reactExports.useCallback(
    (token2) => {
      previewHoldsRef.current.add(token2);
      keepPreviewOpen();
    },
    [keepPreviewOpen],
  );
  const releasePreviewHold = reactExports.useCallback(
    (token2) => {
      if (!previewHoldsRef.current.delete(token2)) return;
      if (previewHoldsRef.current.size > 0) return;
      if (!previewCloseRequestedWhileHeldRef.current) return;
      previewCloseRequestedWhileHeldRef.current = false;
      schedulePreviewClose();
    },
    [schedulePreviewClose],
  );
  const handleResizeMouseDown = reactExports.useCallback(
    (event) => {
      keepPreviewOpen();
      onResizeMouseDown(event);
    },
    [keepPreviewOpen, onResizeMouseDown],
  );
  reactExports.useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      clearPreviewCloseTimer();
      clearPreviewExitTimer();
      previewClosingRef.current = false;
      setPreviewClosing(false);
      previewOpenRef.current = false;
      setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [clearPreviewCloseTimer, clearPreviewExitTimer, previewOpen]);
  const collapsed = mode2 === "rail";
  const value = reactExports.useMemo(
    () => ({
      width,
      mode: mode2,
      collapsed,
      previewOpen,
      previewOpening,
      previewClosing,
      togglePinned,
      setPinned,
      pinOpen,
      openPreview,
      keepPreviewOpen,
      schedulePreviewClose,
      completePreviewClose,
      holdPreviewOpen,
      releasePreviewHold,
      onResizeMouseDown: handleResizeMouseDown,
      onResizeValueChange,
      resetWidth,
    }),
    [
      collapsed,
      completePreviewClose,
      handleResizeMouseDown,
      holdPreviewOpen,
      keepPreviewOpen,
      mode2,
      onResizeValueChange,
      openPreview,
      pinOpen,
      previewOpen,
      previewOpening,
      previewClosing,
      releasePreviewHold,
      resetWidth,
      schedulePreviewClose,
      setPinned,
      togglePinned,
      width,
    ],
  );
  return <GlobalSidebarContext value={value}>{children2}</GlobalSidebarContext>;
}
