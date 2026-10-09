// workspace-browser.jsx
import { jsxRuntimeExports, useTranslation, reactExports, ArrowRight, X$7, dedupedToast, usePlatform, Globe, PanelsTopLeft, getRuntimeConfig, Plus, ArrowLeft, RotateCw, ArrowUpRight, MoreHorizontal } from "../vendor.js";
import { useNativeViewOcclusion } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { Tooltip, TooltipTrigger, Icon } from "../m15/graph.jsx";
import { Bookmark, Camera, Chrome } from "../m15/parse-item.jsx";
import { useHasBlockingModal } from "../m15/thumbnail-load-scheduler.jsx";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { OPEN_BROWSER_EVENT } from "../m15/use-canvas-tag-filter.js";
import { workspaceEvents } from "../m15/use-hub-logo-hover-animation.jsx";
import { dispatchBrowserImageEditToChat } from "../m13/media-model-selector.jsx";
import { TooltipContent } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  dispatchBrowserPickedFileToChat,
  takePendingBuiltinBrowserUrl,
  dispatchBrowserAnnotationToChat,
  dispatchBrowserScreenshotToChat,
} from "../m11/use-workspace-canvas-persistence.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { useCoachMark, CoachMarkPopup } from "../m10/use-coach-mark.jsx";
import { useSettings } from "../m10/use-data-directory.js";
import { useBrowserHoverSnapshot } from "../m08/part-store.jsx";
import { blobToPng } from "../m11/use-canvas-image-annotation-host.jsx";
import { resolveTrackingDomain } from "../m07/en.jsx";
import { AnnotationIcon$1 } from "../m01/generating-media-area.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { BrowserAnnotationEditor } from "./browser-annotation-editor.jsx";
import {
  BrowserSearchHistory,
  browserBookmarkImportNotice,
  browserProfileImportErrorMessage,
  browserProfileImportFailureTrackProps,
  useBrowserChatContext,
  useBrowserTabPresence,
} from "./browser-inspiration-favicon-files.jsx";
import { BrowserErrorCard } from "./browser-inspiration-sites.jsx";
import { BrowserDownloads, BrowserTabMotion, BrowserTabOverview } from "./browser-tab-motion.jsx";
import { mergeBrowserBookmarks } from "./use-browser-video-download.jsx";
import {
  BrowserStartPage,
  BrowserTabIcon,
  IconButton,
} from "./workspace-canvas-focus-coordinator.jsx";
function BrowserEntryCoachMark({ anchorRef, enabled }) {
  const { t: t2 } = useTranslation();
  const blocked = useHasBlockingModal();
  const coach = useCoachMark("canvas-browser-entry-intro", enabled && !blocked, {
    autoClose: false,
    persistOnOpen: true,
  });
  return (
    <CoachMarkPopup
      open={enabled && !blocked && coach.isOpen}
      anchorRef={anchorRef}
      title={t2("workspace.browser.guide.entryTitle", "浏览网页，收集灵感")}
      description={t2(
        "workspace.browser.guide.entryDescription",
        "点击「浏览器」查找素材，添加到画布或对话；也可圈选网页内容并批注，让 Agent 按你的要求操作网页。",
      )}
      onDismiss={coach.dismiss}
      side="bottom"
      align="start"
      showClose={true}
      actionUiId="canvas.browser-entry-guide"
    />
  );
}
export function WorkspaceViewSwitch({ target, onClick, label }) {
  const { t: t2 } = useTranslation();
  const browserAnchor = reactExports.useRef(null);
  return (
    <div
      data-window-drag-region="no-drag"
      className="no-drag relative inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-0.5 shadow-xs [border-width:var(--divider-width)]"
    >
      <BrowserEntryCoachMark anchorRef={browserAnchor} enabled={target === "browser"} />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-7 rounded-md bg-[var(--canvas-controls-active)] transition-transform duration-200 ease-out motion-reduce:transition-none ${target === "canvas" ? "translate-x-20" : "translate-x-0"}`}
      />
      {["canvas", "browser"].map((mode2) => {
        const active2 = mode2 !== target;
        const title =
          mode2 === "canvas" ? (label ?? t2("workspace.browser.canvas")) : t2("workspace.browser");
        return (
          <button
            key={mode2}
            ref={mode2 === "browser" ? browserAnchor : void 0}
            type="button"
            onClick={active2 ? void 0 : onClick}
            aria-pressed={active2}
            aria-label={title}
            title={active2 ? title : void 0}
            data-action-ui-id={`workspace.switch-to-${mode2}`}
            className={`relative inline-flex h-full min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-md px-1 text-xs transition-[width,color] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active2 ? "w-7 font-medium text-[var(--canvas-controls-text)]" : "w-[78px] font-normal text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
          >
            <Icon icon={mode2 === "canvas" ? PanelsTopLeft : Globe} size="sm" />
            <span
              aria-hidden="true"
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out motion-reduce:transition-none ${active2 ? "ml-0 max-w-0 opacity-0" : "ml-1 max-w-16 opacity-100"}`}
            >
              {title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
const DEFAULT_URL = "";
const SEARCH_HISTORY_KEY = "hilo:browser-search-history";
const SEARCH_HISTORY_LIMIT = 7;
const BOOKMARKS_STORAGE_KEY = "hilo:browser-bookmarks:v1";
const MAX_STORED_FAVICON_DATA_URL_LENGTH = 9e4;
function isSafeBookmarkFaviconUrl(value) {
  if (typeof value !== "string") return false;
  if (
    value.length <= MAX_STORED_FAVICON_DATA_URL_LENGTH &&
    /^data:image\/(?:png|jpe?g|gif|webp|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/]+={0,2}$/iu.test(
      value,
    )
  )
    return true;
  if (value.length > 2048) return false;
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" || url2.protocol === "http:";
  } catch {
    return false;
  }
}
function readBookmarks() {
  try {
    const value = JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.url === "string" &&
        Array.isArray(item.folders) &&
        (item.faviconDataUrl === void 0 || isSafeBookmarkFaviconUrl(item.faviconDataUrl)),
    );
  } catch {
    return [];
  }
}
function readSearchHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string").slice(0, SEARCH_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}
function isUrl(value) {
  return /^(?:https?:\/\/|file:\/\/|about:|mailto:)/i.test(value.trim());
}
function destinationForInput(value) {
  const input = value.trim();
  if (isUrl(input))
    return {
      destination: input,
      search: false,
    };
  const engine = getRuntimeConfig().region === "domestic" ? "www.bing.com" : "www.google.com";
  return {
    destination: `https://${engine}/search?q=${encodeURIComponent(input)}`,
    search: true,
  };
}
function annotationSiteName(url2, fallback = "当前网页") {
  try {
    const hostname = new URL(url2).hostname;
    return hostname || fallback;
  } catch {
    return fallback;
  }
}
const BROWSER_MENU_WIDTH = 790;
const BROWSER_MENU_HEIGHT = 520;
const BROWSER_MENU_MARGIN = 8;
const BROWSER_MENU_OFFSET = 4;
const DEVICE_CANVASES = {
  "iphone-xr": {
    width: 414,
    height: 896,
  },
  mobile: {
    width: 375,
    height: 812,
  },
  tablet: {
    width: 768,
    height: 1024,
  },
};
export function WorkspaceBrowser({
  onBackToCanvas,
  backLabel,
  reserveViewSwitch = false,
  surfaceSource = "view_switch",
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { config: config2 } = useSettings();
  const browser2 = window.hilo?.browser;
  const [browserState, setBrowserState] = reactExports.useState({
    tabs: [],
    activeTabId: null,
  });
  const browserStateRef = reactExports.useRef(browserState);
  const [inputValue, setInputValue] = reactExports.useState(DEFAULT_URL);
  const [searchHistory, setSearchHistory] = reactExports.useState(readSearchHistory);
  const [bookmarks, setBookmarks] = reactExports.useState(readBookmarks);
  const bookmarksRef = reactExports.useRef(bookmarks);
  const [searchFocused, setSearchFocused] = reactExports.useState(false);
  const addressInputRef = reactExports.useRef(null);
  const [stageSize, setStageSize] = reactExports.useState({
    width: 0,
    height: 0,
  });
  const stageRef = reactExports.useRef(null);
  const viewportRef = reactExports.useRef(null);
  const browserTabsRef = reactExports.useRef(null);
  const previousTabCountRef = reactExports.useRef(0);
  const { entries: visibleTabs, finishExit } = useBrowserTabPresence(
    browserState.tabs,
    browserState.activeTabId,
  );
  const hasClosingTab = visibleTabs.some((entry) => entry.exiting);
  const [tabOverflow, setTabOverflow] = reactExports.useState({
    left: false,
    right: false,
  });
  const annotationGuideAnchor = reactExports.useRef(null);
  const moreButtonRef = reactExports.useRef(null);
  const activeTabIdRef = reactExports.useRef(null);
  const [moreOpen, setMoreOpen] = reactExports.useState(false);
  const moreMenuClosedAtRef = reactExports.useRef(-Infinity);
  const [chromeProfiles, setChromeProfiles] = reactExports.useState([]);
  const [showChromeBanner, setShowChromeBanner] = reactExports.useState(false);
  const chromeBannerTrackedRef = reactExports.useRef(false);
  const [showChromeDialog, setShowChromeDialog] = reactExports.useState(false);
  useNativeViewOcclusion(showChromeDialog);
  const [chromeImportKind, setChromeImportKind] = reactExports.useState("cookies");
  const [selectedChromeProfile, setSelectedChromeProfile] = reactExports.useState("");
  const [chromeImportScope, setChromeImportScope] = reactExports.useState("all");
  const [chromeImporting, setChromeImporting] = reactExports.useState(false);
  const [chromeImportResult, setChromeImportResult] = reactExports.useState(null);
  const [chromeImportError, setChromeImportError] = reactExports.useState("");
  const [annotationSession, setAnnotationSession] = reactExports.useState(null);
  const annotationSessionRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    browserStateRef.current = browserState;
  }, [browserState]);
  reactExports.useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);
  const activeTabId = browserState.activeTabId;
  const activeTab = browserState.tabs.find((tab2) => tab2.id === activeTabId);
  const activeTabUrl = activeTab?.url;
  const canUsePageTools = Boolean(activeTab && activeTabUrl?.trim());
  const hasBlockingModal = useHasBlockingModal();
  const annotationGuideEligible =
    canUsePageTools && !activeTab?.isLoading && !activeTab?.lastLoadError && !annotationSession;
  const annotationCoach = useCoachMark(
    "browser-annotation-intro",
    annotationGuideEligible && !hasBlockingModal,
    {
      autoClose: false,
    },
  );
  const showAnnotationGuide =
    !hasBlockingModal && annotationGuideEligible && annotationCoach.isOpen;
  useNativeViewOcclusion(showAnnotationGuide);
  const canBookmarkPage = Boolean(activeTabUrl && /^https?:\/\//u.test(activeTabUrl));
  const activeBookmark = activeTabUrl
    ? bookmarks.find((bookmark) => bookmark.url === activeTabUrl)
    : void 0;
  const previewMode = activeTab?.devicePreviewMode ?? "responsive";
  const deviceCanvas = previewMode === "responsive" ? null : DEVICE_CANVASES[previewMode];
  const deviceScale = deviceCanvas
    ? Math.min(
        1,
        (stageSize.width - 32) / deviceCanvas.width,
        (stageSize.height - 32) / deviceCanvas.height,
      )
    : 1;
  const viewportSize = deviceCanvas
    ? {
        width: Math.max(1, Math.round(deviceCanvas.width * deviceScale)),
        height: Math.max(1, Math.round(deviceCanvas.height * deviceScale)),
      }
    : null;
  const viewportLayoutKey = `${annotationSession ? "annotation" : "browser"}:${previewMode}:${viewportSize?.width ?? 0}:${viewportSize?.height ?? 0}`;
  useBrowserHoverSnapshot({
    browser: browser2,
    bridge: platform2.window,
    viewportRef,
    tabId:
      !annotationSession && canUsePageTools && !(activeTab?.lastLoadError && !activeTab.isLoading)
        ? activeTabId
        : null,
    // Size changes keep the same DOM viewport and aspect-preserving bitmap,
    // rather than collapsing/reopening a sidebar held by an account menu.
    viewportKey: `${annotationSession ? "annotation" : "browser"}:${deviceCanvas ? "device" : "responsive"}`,
  });
  useBrowserChatContext(activeTab, config2.browserConnectorEnabled !== false);
  const getMenuBounds = reactExports.useCallback(() => {
    const trigger = moreButtonRef.current;
    const stage = stageRef.current;
    if (!trigger || !stage) return null;
    const triggerRect = trigger.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return null;
    const viewportWidth = Math.round(window.innerWidth || document.documentElement.clientWidth);
    const viewportHeight = Math.round(window.innerHeight || document.documentElement.clientHeight);
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    const hostLeft = Math.max(0, Math.round(stageRect.left));
    const hostTop = Math.max(0, Math.round(stageRect.top));
    const hostRight = Math.min(viewportWidth, Math.round(stageRect.right));
    const hostBottom = Math.min(viewportHeight, Math.round(stageRect.bottom));
    if (hostRight <= hostLeft || hostBottom <= hostTop) return null;
    const hostWidth = hostRight - hostLeft;
    const hostHeight = Math.max(1, hostBottom - hostTop);
    const width = Math.min(BROWSER_MENU_WIDTH, Math.max(1, hostWidth - BROWSER_MENU_MARGIN * 2));
    const height = Math.min(BROWSER_MENU_HEIGHT, Math.max(1, hostHeight - BROWSER_MENU_MARGIN * 2));
    const maxX = Math.max(hostLeft + BROWSER_MENU_MARGIN, hostRight - width - BROWSER_MENU_MARGIN);
    const x2 = Math.min(
      maxX,
      Math.max(hostLeft + BROWSER_MENU_MARGIN, Math.round(triggerRect.right - width)),
    );
    const belowY = Math.round(triggerRect.bottom + BROWSER_MENU_OFFSET);
    const aboveY = Math.round(triggerRect.top - height - BROWSER_MENU_OFFSET);
    const y4 =
      belowY + height <= hostBottom - BROWSER_MENU_MARGIN
        ? belowY
        : Math.max(hostTop + BROWSER_MENU_MARGIN, aboveY);
    return {
      x: x2,
      y: y4,
      width,
      height,
    };
  }, []);
  reactExports.useEffect(() => {
    activeTabIdRef.current = browserState.activeTabId;
  }, [browserState.activeTabId]);
  reactExports.useEffect(() => {
    annotationSessionRef.current = annotationSession;
  }, [annotationSession]);
  reactExports.useEffect(() => {
    if (!browser2) return;
    return browser2.onMenuStateChanged((open) => {
      if (!open) moreMenuClosedAtRef.current = performance.now();
      setMoreOpen(open);
    });
  }, [browser2]);
  reactExports.useEffect(() => {
    if (!browser2) return;
    return browser2.onBookmarkDeleteRequested((bookmarkId) => {
      setBookmarks((current2) => {
        const next2 = current2.filter((bookmark) => bookmark.id !== bookmarkId);
        if (next2.length === current2.length) return current2;
        try {
          window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next2));
        } catch {}
        return next2;
      });
    });
  }, [browser2]);
  const copyPickedImage = reactExports.useCallback(
    async (file) => {
      const png = await blobToPng(file);
      if (!png) throw new Error("Image could not be decoded");
      if (!platform2.clipboard.writeImageData) throw new Error("Clipboard bridge unavailable");
      await platform2.clipboard.writeImageData(await png.arrayBuffer());
    },
    [platform2],
  );
  reactExports.useEffect(() => {
    if (!browser2?.onPluginEvent) return;
    const addToCanvas = (file, source) => {
      workspaceEvents.fireAddFilesToCanvas([file], source);
    };
    return browser2.onPluginEvent((event) => {
      if (event.type === "image-pick-failed") {
        dedupedToast.error(
          t2("workspace.browser.pluginImageError", {
            defaultValue: "图片添加失败：{{reason}}",
            reason: event.error,
          }),
        );
        return;
      }
      if (event.type === "video-pick-failed") {
        dedupedToast.error(
          t2("workspace.browser.pluginVideoError", {
            defaultValue: "视频添加失败：{{reason}}",
            reason: event.error,
          }),
        );
        return;
      }
      if (event.type === "video-picked") {
        const { video } = event;
        const file2 = new File([video.bytes], video.filename, {
          type: video.mime,
        });
        if (event.action === "canvas") {
          addToCanvas(file2, {
            pageUrl: video.pageUrl,
            pageTitle: video.pageTitle,
          });
        } else
          dispatchBrowserPickedFileToChat({
            file: file2,
            sourceUrl: video.sourceUrl,
          });
        return;
      }
      if (event.type !== "image-picked") return;
      const { image: image2 } = event;
      const file = new File([image2.bytes], image2.filename, {
        type: image2.mime,
      });
      switch (event.action) {
        case "edit":
          if (
            event.editAction &&
            !dispatchBrowserImageEditToChat({
              file,
              action: event.editAction,
              pageUrl: image2.pageUrl,
              pageTitle: image2.pageTitle,
            })
          ) {
            dedupedToast.warning(
              t2("workspace.browser.imageEdit.openProject", "请先打开项目，再使用图像编辑"),
            );
          }
          return;
        case "chat":
          dispatchBrowserPickedFileToChat({
            file,
            sourceUrl: image2.sourceUrl,
          });
          return;
        case "canvas":
          addToCanvas(file, {
            pageUrl: image2.pageUrl,
            pageTitle: image2.pageTitle,
          });
          return;
        case "clipboard":
          void copyPickedImage(file).catch(() => dedupedToast.error(t2("common.copyFailed")));
          return;
        default:
          return;
      }
    });
  }, [browser2, copyPickedImage, t2]);
  reactExports.useEffect(() => {
    if (!activeTabId || activeTabUrl === void 0) return;
    setInputValue(activeTabUrl);
  }, [activeTabId, activeTabUrl]);
  reactExports.useEffect(() => {
    const faviconUrl = activeTab?.faviconUrl;
    if (!activeTabUrl || !isSafeBookmarkFaviconUrl(faviconUrl)) return;
    setBookmarks((current2) => {
      const bookmark = current2.find((item) => item.url === activeTabUrl);
      if (!bookmark || bookmark.faviconDataUrl === faviconUrl) return current2;
      const next2 = current2.map((item) =>
        item.url === activeTabUrl
          ? {
              ...item,
              faviconDataUrl: faviconUrl,
            }
          : item,
      );
      try {
        window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next2));
      } catch {}
      return next2;
    });
  }, [activeTab?.faviconUrl, activeTabUrl]);
  const updateTabOverflow = reactExports.useCallback(() => {
    const tabs = browserTabsRef.current;
    if (!tabs) return;
    const maxScrollLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    const next2 = {
      left: tabs.scrollLeft > 1,
      right: tabs.scrollLeft < maxScrollLeft - 1,
    };
    setTabOverflow((current2) =>
      current2.left === next2.left && current2.right === next2.right ? current2 : next2,
    );
  }, []);
  reactExports.useEffect(() => {
    if (visibleTabs.length === 0) {
      setTabOverflow({
        left: false,
        right: false,
      });
      return;
    }
    const tabs = browserTabsRef.current;
    if (!tabs) return;
    const frameId = window.requestAnimationFrame(updateTabOverflow);
    tabs.addEventListener("scroll", updateTabOverflow, {
      passive: true,
    });
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateTabOverflow);
    resizeObserver?.observe(tabs);
    for (const tab2 of tabs.children) resizeObserver?.observe(tab2);
    return () => {
      window.cancelAnimationFrame(frameId);
      tabs.removeEventListener("scroll", updateTabOverflow);
      resizeObserver?.disconnect();
    };
  }, [visibleTabs.length, updateTabOverflow]);
  reactExports.useEffect(() => {
    const tabCount = browserState.tabs.length;
    const previousTabCount = previousTabCountRef.current;
    previousTabCountRef.current = tabCount;
    if (tabCount <= previousTabCount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frameId = 0;
    const followEnd = () => {
      const tabs = browserTabsRef.current;
      if (!tabs) return;
      tabs.scrollTo({
        left: tabs.scrollWidth,
        behavior: "instant",
      });
      if (!reduced && performance.now() - started < 320) {
        frameId = window.requestAnimationFrame(followEnd);
      }
    };
    const stopFollowing = () => window.cancelAnimationFrame(frameId);
    const strip = browserTabsRef.current;
    strip?.addEventListener("wheel", stopFollowing, {
      passive: true,
    });
    strip?.addEventListener("pointerdown", stopFollowing);
    frameId = window.requestAnimationFrame(followEnd);
    return () => {
      stopFollowing();
      strip?.removeEventListener("wheel", stopFollowing);
      strip?.removeEventListener("pointerdown", stopFollowing);
    };
  }, [browserState.tabs.length]);
  reactExports.useEffect(() => {
    if (!browser2) return;
    const startedAt = performance.now();
    void browser2
      .setSurfaceOpen(true)
      .then(() => {
        trackEvent(TRACK_EVENTS.BROWSER_SURFACE_ACTION, {
          action: "open",
          source: surfaceSource,
          result: "success",
          duration_ms: Math.round(performance.now() - startedAt),
          tab_count: browserStateRef.current.tabs.length,
        });
        window.dispatchEvent(new CustomEvent("hilo:browser-surface-ready"));
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_SURFACE_ACTION, {
          action: "open",
          source: surfaceSource,
          result: "failed",
          duration_ms: Math.round(performance.now() - startedAt),
          tab_count: browserStateRef.current.tabs.length,
        });
      });
    return () => {
      const closeStartedAt = performance.now();
      void browser2
        .setSurfaceOpen(false)
        .then(() => {
          trackEvent(TRACK_EVENTS.BROWSER_SURFACE_ACTION, {
            action: "close",
            source: surfaceSource,
            result: "success",
            duration_ms: Math.round(performance.now() - closeStartedAt),
            tab_count: browserStateRef.current.tabs.length,
          });
        })
        .catch(() => {
          trackEvent(TRACK_EVENTS.BROWSER_SURFACE_ACTION, {
            action: "close",
            source: surfaceSource,
            result: "failed",
            duration_ms: Math.round(performance.now() - closeStartedAt),
            tab_count: browserStateRef.current.tabs.length,
          });
        });
    };
  }, [browser2, surfaceSource]);
  reactExports.useEffect(() => {
    if (!browser2) return;
    let disposed = false;
    const stopListening = browser2.onStateChanged((nextState) => {
      if (!disposed) setBrowserState(nextState);
    });
    void browser2
      .getState()
      .then(async (currentState) => {
        if (disposed) return;
        if (currentState.tabs.length > 0 && currentState.activeTabId) {
          setBrowserState(currentState);
          const pendingUrl22 = takePendingBuiltinBrowserUrl();
          if (pendingUrl22) {
            const before = currentState.tabs.length;
            const nextState2 = await browser2.createTab(pendingUrl22);
            trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
              action: "create",
              source: "chat_link",
              tab_count_before: before,
              tab_count_after: nextState2.tabs.length,
              result: "success",
            });
            if (disposed && nextState2.activeTabId) {
              void browser2.hideTab(nextState2.activeTabId).catch(() => {});
            } else if (!disposed) {
              setBrowserState(nextState2);
            }
            return;
          }
          await browser2.showTab(currentState.activeTabId);
          return;
        }
        const pendingUrl2 = takePendingBuiltinBrowserUrl();
        const nextState = await browser2.createTab(pendingUrl2 ?? DEFAULT_URL);
        if (pendingUrl2) {
          trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
            action: "create",
            source: "chat_link",
            tab_count_before: currentState.tabs.length,
            tab_count_after: nextState.tabs.length,
            result: "success",
          });
        }
        if (disposed && nextState.activeTabId) {
          void browser2.hideTab(nextState.activeTabId).catch(() => {});
        } else if (!disposed) {
          setBrowserState(nextState);
        }
      })
      .catch(() => {
        if (!disposed)
          dedupedToast.error(
            t2("workspace.browser.loadError", {
              defaultValue: "浏览器启动失败",
            }),
          );
      });
    return () => {
      disposed = true;
      stopListening();
      const tabId = activeTabIdRef.current;
      const annotation = annotationSessionRef.current;
      void browser2.closeMenu().catch(() => {});
      if (annotation) {
        void browser2
          .setAnnotation(annotation.tabId, false)
          .catch(() => void 0)
          .then(() => browser2.showTab(annotation.tabId).catch(() => void 0));
      } else if (tabId) {
        void browser2.hideTab(tabId).catch(() => {});
      }
    };
  }, [browser2, t2]);
  reactExports.useEffect(() => {
    if (!browser2) return;
    const handleOpenBrowser = (event) => {
      const url2 = event.detail?.url;
      takePendingBuiltinBrowserUrl();
      if (!url2) return;
      const before = browserStateRef.current.tabs.length;
      void browser2
        .createTab(url2)
        .then((nextState) => {
          setBrowserState(nextState);
          trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
            action: "create",
            source: "chat_link",
            tab_count_before: before,
            tab_count_after: nextState.tabs.length,
            result: "success",
          });
        })
        .catch(() => {
          trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
            action: "create",
            source: "chat_link",
            tab_count_before: before,
            tab_count_after: before,
            result: "failed",
          });
          dedupedToast.error(
            t2("workspace.browser.loadError", {
              defaultValue: "浏览器启动失败",
            }),
          );
        });
    };
    window.addEventListener(OPEN_BROWSER_EVENT, handleOpenBrowser);
    return () => window.removeEventListener(OPEN_BROWSER_EVENT, handleOpenBrowser);
  }, [browser2, t2]);
  reactExports.useEffect(() => {
    const profileImport = window.hilo?.browser?.browserProfileImport;
    if (!profileImport || !activeTabId) return;
    if (window.localStorage.getItem("hilo:browser-profile-import-nux:v1") === "1") return;
    let cancelled = false;
    void profileImport
      .listProfiles()
      .then((result) => {
        if (
          cancelled ||
          !result?.success ||
          !result.capability?.available ||
          !result.profiles?.length
        )
          return;
        setChromeProfiles(result.profiles);
        setSelectedChromeProfile(
          result.profiles.find((profile) => profile.isDefault)?.id ?? result.profiles[0].id,
        );
        setShowChromeBanner(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeTabId]);
  reactExports.useEffect(() => {
    if (!showChromeBanner || chromeBannerTrackedRef.current) return;
    chromeBannerTrackedRef.current = true;
    trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
      action: "banner_view",
      kind: "profile",
      result: "success",
    });
  }, [showChromeBanner]);
  reactExports.useEffect(() => {
    const profileImport = window.hilo?.browser?.browserProfileImport;
    if (!profileImport) return;
    return profileImport.onRequested((tabId) => {
      if (tabId !== activeTabId) return;
      void profileImport
        .listProfiles()
        .then((result) => {
          if (!result?.success || !result.profiles?.length) return;
          setChromeProfiles(result.profiles);
          setSelectedChromeProfile(
            result.profiles.find((profile) => profile.isDefault)?.id ?? result.profiles[0].id,
          );
          setChromeImportKind("cookies");
          setChromeImportResult(null);
          setChromeImportError("");
          setShowChromeDialog(true);
          trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
            action: "dialog_open",
            kind: "cookies",
            result: "success",
          });
        })
        .catch(() => {});
    });
  }, [activeTabId]);
  reactExports.useEffect(() => {
    const profileImport = window.hilo?.browser?.browserProfileImport;
    if (!profileImport) return;
    return profileImport.onBookmarksRequested((tabId) => {
      if (tabId !== activeTabId) return;
      void profileImport
        .listBookmarkProfiles()
        .then((result) => {
          if (!result?.success || !result.profiles?.length) {
            dedupedToast.error(
              t2("workspace.browser.noChromeBookmarks", {
                defaultValue: "未找到可导入的 Chrome 书签",
              }),
            );
            return;
          }
          setChromeProfiles(result.profiles);
          setSelectedChromeProfile(
            result.profiles.find((profile) => profile.isDefault)?.id ?? result.profiles[0].id,
          );
          setChromeImportKind("bookmarks");
          setChromeImportResult(null);
          setChromeImportError("");
          setShowChromeDialog(true);
          trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
            action: "dialog_open",
            kind: "bookmarks",
            result: "success",
          });
        })
        .catch(() =>
          dedupedToast.error(
            t2("workspace.browser.chromeBookmarkSyncError", {
              defaultValue: "无法读取 Chrome 书签",
            }),
          ),
        );
    });
  }, [activeTabId, t2]);
  reactExports.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const update2 = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({
        width: rect.width,
        height: rect.height,
      });
    };
    update2();
    const observer2 = new ResizeObserver(update2);
    observer2.observe(stage);
    return () => observer2.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!browser2 || !moreOpen) return;
    const updateMenu = () => {
      const bounds = getMenuBounds();
      if (bounds) void browser2.updateMenu(bounds).catch(() => {});
    };
    updateMenu();
    window.addEventListener("resize", updateMenu);
    const stage = stageRef.current;
    const observer2 =
      stage && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateMenu) : null;
    if (observer2 && stage) observer2.observe(stage);
    return () => {
      window.removeEventListener("resize", updateMenu);
      observer2?.disconnect();
    };
  }, [browser2, getMenuBounds, moreOpen]);
  reactExports.useEffect(() => {
    if (!browser2 || !browserState.activeTabId || !viewportLayoutKey) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frameId = null;
    let lastBounds = null;
    const updateBounds = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const rect = viewport.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nextBounds = {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        if (
          lastBounds &&
          lastBounds.x === nextBounds.x &&
          lastBounds.y === nextBounds.y &&
          lastBounds.width === nextBounds.width &&
          lastBounds.height === nextBounds.height
        ) {
          return;
        }
        lastBounds = nextBounds;
        void browser2.setBounds(browserState.activeTabId, nextBounds).catch(() => {});
      });
    };
    updateBounds();
    const observer2 = new ResizeObserver(updateBounds);
    observer2.observe(viewport);
    window.addEventListener("resize", updateBounds);
    return () => {
      observer2.disconnect();
      window.removeEventListener("resize", updateBounds);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [browser2, browserState.activeTabId, viewportLayoutKey]);
  const applyState = reactExports.useCallback((nextState) => setBrowserState(nextState), []);
  const selectTab = (tabId, source = "tab_strip") => {
    if (!browser2) return;
    const before = browserState.tabs.length;
    const wasActive = browserState.activeTabId === tabId;
    void browser2
      .showTab(tabId)
      .then((nextState) => {
        applyState(nextState);
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "switch",
          source,
          tab_count_before: before,
          tab_count_after: nextState.tabs.length,
          was_active: wasActive,
          result: "success",
        });
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "switch",
          source,
          tab_count_before: before,
          tab_count_after: before,
          was_active: wasActive,
          result: "failed",
        });
      });
  };
  const closeTab = (tabId, source = "tab_strip") => {
    if (!browser2) return;
    const before = browserState.tabs.length;
    const wasActive = browserState.activeTabId === tabId;
    void browser2
      .destroyTab(tabId)
      .then((nextState) => {
        applyState(nextState);
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "close",
          source,
          tab_count_before: before,
          tab_count_after: nextState.tabs.length,
          was_active: wasActive,
          result: "success",
        });
        if (nextState.tabs.length === 0) onBackToCanvas();
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "close",
          source,
          tab_count_before: before,
          tab_count_after: before,
          was_active: wasActive,
          result: "failed",
        });
      });
  };
  const createTab = () => {
    if (!browser2) return;
    const before = browserState.tabs.length;
    void browser2
      .createTab("")
      .then((nextState) => {
        applyState(nextState);
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "create",
          source: "tab_strip",
          tab_count_before: before,
          tab_count_after: nextState.tabs.length,
          result: "success",
        });
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TAB_ACTION, {
          action: "create",
          source: "tab_strip",
          tab_count_before: before,
          tab_count_after: before,
          result: "failed",
        });
      });
  };
  const navigateToInput = (value, trackAddressSubmit = false, source) => {
    if (!browser2 || !activeTabId || !value.trim()) return;
    const { destination, search: search2 } = destinationForInput(value);
    if (search2) {
      const nextHistory = [
        value.trim(),
        ...searchHistory.filter((item) => item !== value.trim()),
      ].slice(0, SEARCH_HISTORY_LIMIT);
      setSearchHistory(nextHistory);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
      } catch {}
    }
    setSearchFocused(false);
    const addressProps = trackAddressSubmit
      ? {
          input_type: search2 ? "search" : "url",
          target_domain: resolveTrackingDomain(destination) ?? "unknown",
        }
      : null;
    const navigationSource =
      source ?? (trackAddressSubmit ? (search2 ? "search" : "address") : "unknown");
    void browser2
      .navigate(activeTabId, destination, navigationSource)
      .then((nextState) => {
        applyState(nextState);
        const nextTab = nextState.tabs.find((tab2) => tab2.id === nextState.activeTabId);
        if (nextTab) setInputValue(nextTab.url);
        if (addressProps) {
          trackEvent(TRACK_EVENTS.BROWSER_ADDRESS_SUBMIT, {
            ...addressProps,
            result: "accepted",
          });
        }
      })
      .catch((error) => {
        if (addressProps) {
          trackEvent(TRACK_EVENTS.BROWSER_ADDRESS_SUBMIT, {
            ...addressProps,
            result: "failed",
          });
        }
        dedupedToast.error(error instanceof Error ? error.message : "导航失败");
      });
  };
  const removeSearchHistoryItem = (itemToRemove) => {
    const nextHistory = searchHistory.filter((item) => item !== itemToRemove);
    setSearchHistory(nextHistory);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {}
  };
  const navigate = (event) => {
    event.preventDefault();
    navigateToInput(inputValue, true);
  };
  const runStateAction = (actionName, action) => {
    if (!browser2 || !activeTabId) return;
    void action(activeTabId)
      .then((nextState) => {
        applyState(nextState);
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: actionName,
          source: "toolbar",
          result: "success",
        });
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: actionName,
          source: "toolbar",
          result: "failed",
        });
      });
  };
  const toggleMoreMenu = () => {
    if (!browser2 || !activeTabId) return;
    if (moreOpen) {
      setMoreOpen(false);
      void browser2.closeMenu().catch(() => {});
      return;
    }
    if (performance.now() - moreMenuClosedAtRef.current < 200) return;
    const bounds = getMenuBounds();
    if (!bounds) return;
    void browser2
      .openMenu(
        activeTabId,
        bounds,
        bookmarks.map(({ id: id2, title, url: url2, folders, faviconDataUrl }) => ({
          id: id2,
          title,
          url: url2,
          folders,
          faviconDataUrl,
        })),
      )
      .then(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: "open",
          source: "toolbar",
          result: "success",
        });
      })
      .catch(() => {
        setMoreOpen(false);
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: "open",
          source: "toolbar",
          result: "failed",
        });
      });
  };
  const closeAnnotation = reactExports.useCallback(async () => {
    const session = annotationSessionRef.current;
    if (!browser2 || !session) return;
    try {
      await browser2.setAnnotation(session.tabId, false);
      const nextState = await browser2.showTab(session.tabId);
      applyState(nextState);
    } catch {
    } finally {
      annotationSessionRef.current = null;
      setAnnotationSession(null);
      window.requestAnimationFrame(() => {
        void browser2
          .showTab(session.tabId)
          .then(applyState)
          .catch(() => {});
      });
    }
  }, [applyState, browser2]);
  const startAnnotation = async () => {
    if (!browser2 || !activeTabId || !canUsePageTools || annotationSessionRef.current) return;
    const tabId = activeTabId;
    const startedAt = performance.now();
    try {
      const result = await browser2.captureFrame(tabId);
      if (!result.success || !result.dataUrl) {
        trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
          capture_type: "annotation",
          result: "failed",
          duration_ms: Math.round(performance.now() - startedAt),
          error_type: result.success ? "missing_data" : "capture_failed",
        });
        dedupedToast.error(
          result.error ??
            t2("workspace.browser.annotationCaptureError", {
              defaultValue: "无法截取当前网页",
            }),
        );
        return;
      }
      const currentTab = browserState.tabs.find((tab2) => tab2.id === tabId);
      const session = {
        tabId,
        dataUrl: result.dataUrl,
        viewportSize:
          result.width && result.height
            ? {
                width: result.width,
                height: result.height,
              }
            : void 0,
        title: annotationSiteName(currentTab?.url ?? activeTabUrl ?? ""),
        url: currentTab?.url ?? activeTabUrl ?? "",
      };
      annotationSessionRef.current = session;
      setAnnotationSession(session);
      const hiddenState = await browser2.hideTab(tabId);
      applyState(hiddenState);
      const annotatedState = await browser2.setAnnotation(tabId, true);
      applyState(annotatedState);
      trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
        capture_type: "annotation",
        result: "success",
        duration_ms: Math.round(performance.now() - startedAt),
      });
    } catch {
      trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
        capture_type: "annotation",
        result: "failed",
        duration_ms: Math.round(performance.now() - startedAt),
        error_type: "ipc_error",
      });
      dedupedToast.error(
        t2("workspace.browser.annotationCaptureError", {
          defaultValue: "无法截取当前网页",
        }),
      );
    }
  };
  const handleBackToCanvas = () => {
    if (!annotationSessionRef.current) {
      onBackToCanvas();
      return;
    }
    void closeAnnotation().finally(onBackToCanvas);
  };
  const handleAnnotationSend = reactExports.useCallback(
    async (dataUrl) => {
      dispatchBrowserAnnotationToChat(dataUrl);
      await closeAnnotation();
    },
    [closeAnnotation],
  );
  const toggleBookmark = () => {
    if (!activeTab || !activeTabUrl || !canBookmarkPage) return;
    const removing = Boolean(activeBookmark);
    setBookmarks((current2) => {
      const next2 = removing
        ? current2.filter((bookmark) => bookmark.url !== activeTabUrl)
        : [
            ...current2,
            {
              id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
              title: activeTab.title || annotationSiteName(activeTabUrl, activeTabUrl),
              url: activeTabUrl,
              folders: [],
              ...(isSafeBookmarkFaviconUrl(activeTab.faviconUrl)
                ? {
                    faviconDataUrl: activeTab.faviconUrl,
                  }
                : {}),
            },
          ];
      try {
        window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next2));
      } catch {}
      return next2;
    });
    dedupedToast.success(
      removing
        ? t2("workspace.browser.bookmarkRemoved", {
            defaultValue: "已取消收藏",
          })
        : t2("workspace.browser.bookmarkAdded", {
            defaultValue: "已添加到书签",
          }),
    );
    trackEvent(TRACK_EVENTS.BROWSER_BOOKMARK_ACTION, {
      action: removing ? "remove" : "add",
      source: "toolbar",
      result: "success",
    });
  };
  const removeBookmark = (bookmarkId) => {
    setBookmarks((current2) => {
      const next2 = current2.filter((bookmark) => bookmark.id !== bookmarkId);
      try {
        window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next2));
      } catch {}
      return next2;
    });
    dedupedToast.success(
      t2("workspace.browser.bookmarkRemoved", {
        defaultValue: "已删除书签",
      }),
    );
  };
  const takeScreenshot = () => {
    if (!browser2 || !activeTabId || !canUsePageTools) return;
    const startedAt = performance.now();
    void browser2
      .screenshot(activeTabId)
      .then((result) => {
        if (result.success) {
          if (result.dataUrl) {
            dispatchBrowserScreenshotToChat({
              dataUrl: result.dataUrl,
            });
            trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
              capture_type: "screenshot",
              result: "success",
              duration_ms: Math.round(performance.now() - startedAt),
            });
          } else {
            trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
              capture_type: "screenshot",
              result: "failed",
              duration_ms: Math.round(performance.now() - startedAt),
              error_type: "missing_data",
            });
          }
        } else {
          trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
            capture_type: "screenshot",
            result: "failed",
            duration_ms: Math.round(performance.now() - startedAt),
            error_type: "capture_failed",
          });
          dedupedToast.error(
            result.error ??
              t2("workspace.browser.screenshotError", {
                defaultValue: "截图失败",
              }),
          );
        }
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_CAPTURE_RESULT, {
          capture_type: "screenshot",
          result: "failed",
          duration_ms: Math.round(performance.now() - startedAt),
          error_type: "ipc_error",
        });
        dedupedToast.error(
          t2("workspace.browser.screenshotError", {
            defaultValue: "截图失败",
          }),
        );
      });
  };
  const openExternal = () => {
    if (!browser2 || !activeTabId) return;
    void browser2
      .openExternal(activeTabId)
      .then((result) => {
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: "open_external",
          source: "address_bar",
          result: result.success ? "success" : "failed",
        });
        if (!result.success)
          dedupedToast.error(
            result.error ??
              t2("workspace.browser.openExternalError", {
                defaultValue: "打开外部浏览器失败",
              }),
          );
      })
      .catch(() => {
        trackEvent(TRACK_EVENTS.BROWSER_TOOLBAR_ACTION, {
          action: "open_external",
          source: "address_bar",
          result: "failed",
        });
        dedupedToast.error(
          t2("workspace.browser.openExternalError", {
            defaultValue: "打开外部浏览器失败",
          }),
        );
      });
  };
  const loadError = activeTab?.lastLoadError;
  const showError = Boolean(loadError && !activeTab?.isLoading);
  const persistChromeBannerDismissal = () => {
    try {
      window.localStorage.setItem("hilo:browser-profile-import-nux:v1", "1");
      return true;
    } catch {
      return false;
    }
  };
  const dismissChromeBanner = () => {
    if (persistChromeBannerDismissal()) {
      setShowChromeBanner(false);
      trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
        action: "banner_dismiss",
        kind: "profile",
        result: "success",
      });
    } else {
      trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
        action: "banner_dismiss",
        kind: "profile",
        result: "failed",
      });
    }
  };
  const openChromeDialog = () => {
    if (!persistChromeBannerDismissal()) return;
    setShowChromeBanner(false);
    setChromeImportKind("cookies");
    setChromeImportResult(null);
    setChromeImportError("");
    setShowChromeDialog(true);
    trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
      action: "dialog_open",
      kind: "cookies",
      result: "success",
    });
  };
  const closeChromeDialog = () => {
    setShowChromeDialog(false);
    trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
      action: "dialog_close",
      kind: chromeImportKind,
      result: "success",
    });
  };
  const startChromeImport = async () => {
    const profileImport = window.hilo?.browser?.browserProfileImport;
    if (!profileImport || !activeTabId || !selectedChromeProfile) return;
    const requestId = `browser-profile-${Date.now().toString(36)}`;
    const trackingBase = {
      kind: chromeImportKind,
      ...(chromeImportKind === "cookies"
        ? {
            scope: chromeImportScope,
          }
        : {}),
    };
    trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
      action: "import",
      ...trackingBase,
      result: "start",
    });
    setChromeImporting(true);
    setChromeImportResult(null);
    setChromeImportError("");
    try {
      if (chromeImportKind === "bookmarks") {
        const result2 = await profileImport.importBookmarks({
          requestId,
          profileId: selectedChromeProfile,
        });
        if (!result2.success) {
          trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
            action: "import",
            ...trackingBase,
            result: "failed",
            error_code: result2.errorCode ?? "unknown",
          });
          setChromeImportError(browserProfileImportErrorMessage(t2, result2.errorCode));
          return;
        }
        const merged = mergeBrowserBookmarks(bookmarksRef.current, result2.bookmarks);
        window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(merged.bookmarks));
        bookmarksRef.current = merged.bookmarks;
        setBookmarks(merged.bookmarks);
        trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
          action: "import",
          ...trackingBase,
          result: "success",
          imported_count: merged.addedCount,
        });
        const notice = browserBookmarkImportNotice(t2, result2, merged.addedCount);
        if (notice.warning) dedupedToast.warning(notice.message);
        else dedupedToast.success(notice.message);
        setShowChromeDialog(false);
        return;
      }
      const result = await profileImport.importCookies({
        requestId,
        profileId: selectedChromeProfile,
        scope: chromeImportScope,
        target: {
          tabId: activeTabId,
          sessionId: null,
        },
      });
      if (result.success) {
        trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
          action: "import",
          ...trackingBase,
          result: "success",
          imported_count: result.importedCount,
        });
        dedupedToast.success(
          t2("workspace.browser.importSuccess", {
            count: result.importedCount,
          }),
        );
        setShowChromeDialog(false);
      } else {
        trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
          action: "import",
          ...trackingBase,
          result: "failed",
          ...browserProfileImportFailureTrackProps(result),
        });
        setChromeImportResult(result);
      }
    } catch {
      trackEvent(TRACK_EVENTS.BROWSER_PROFILE_IMPORT_ACTION, {
        action: "import",
        ...trackingBase,
        result: "failed",
        error_code: "ipc_error",
      });
      setChromeImportError(browserProfileImportErrorMessage(t2));
    } finally {
      setChromeImporting(false);
    }
  };
  return (
    <section
      className="flex size-full min-h-0 flex-col bg-background"
      data-browser-annotating={Boolean(annotationSession)}
      aria-label={t2("workspace.browser", {
        defaultValue: "浏览器",
      })}
    >
      <CoachMarkPopup
        open={showAnnotationGuide}
        anchorRef={annotationGuideAnchor}
        title={t2("workspace.browser.guide.annotationTitle", "批注网页，让 Agent 帮你操作")}
        description={t2(
          "workspace.browser.guide.annotationDescription",
          "点击「批注」，圈选网页内容并写下操作要求，发送到对话，让 Agent 帮你操作网页。",
        )}
        onDismiss={(method) => {
          annotationCoach.dismiss(method);
        }}
        side="bottom"
        align="center"
        showClose={true}
        actionUiId="browser.annotation-guide"
      />
      <div
        data-action-ui-id="browser.tab-bar"
        className="flex h-12 w-full min-w-0 shrink-0 items-center gap-1 bg-card px-2"
        style={{
          paddingRight: "calc(0.5rem + var(--canvas-top-right-overlay-inset, 0px))",
        }}
      >
        {!annotationSession &&
          (reserveViewSwitch ? (
            <span
              className="h-8 w-[calc(7rem+2*var(--divider-width))] shrink-0"
              aria-hidden="true"
            />
          ) : (
            <WorkspaceViewSwitch target="canvas" onClick={handleBackToCanvas} label={backLabel} />
          ))}
        {!annotationSession && (
          <span aria-hidden="true" className="mr-2 h-4 w-px shrink-0 bg-border" />
        )}
        <div
          ref={browserTabsRef}
          className="workspace-browser-tabs flex min-w-0 flex-initial items-center overflow-x-auto scrollbar-none"
          data-closing-tabs={hasClosingTab}
          data-overflow-left={tabOverflow.left}
          data-overflow-right={tabOverflow.right}
        >
          {visibleTabs.map(({ tab: tab2, active: active2, entering, exiting }) => (
            <BrowserTabMotion
              key={tab2.id}
              id={tab2.id}
              entering={entering}
              exiting={exiting}
              onExit={finishExit}
              className={`workspace-browser-tab group relative mr-1 flex h-8 w-[220px] min-w-[72px] max-w-[220px] shrink basis-[220px] items-center gap-1.5 rounded-md border-y-2 border-transparent bg-clip-padding pl-1 pr-2 text-[13px] font-normal leading-normal transition-colors duration-150 motion-reduce:transition-none ${active2 ? "bg-foreground/[0.08] text-foreground" : hasClosingTab ? "text-foreground/55" : "text-foreground/55 hover:bg-foreground/[0.05] hover:text-foreground"}`}
            >
              <button
                type="button"
                className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => selectTab(tab2.id)}
                disabled={Boolean(annotationSession)}
                aria-label={tab2.title}
              >
                <BrowserTabIcon tab={tab2} />
                <span className="workspace-browser-tab-title min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                  {tab2.title ||
                    t2("workspace.browser.newTab", {
                      defaultValue: "新标签页",
                    })}
                </span>
              </button>
              <button
                type="button"
                data-browser-tab-close={true}
                className="pointer-events-none absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground opacity-0 transition-opacity before:pointer-events-none before:absolute before:-inset-y-1 before:-right-1.5 before:w-10 before:rounded-r-md before:bg-gradient-to-l before:from-secondary before:via-secondary/95 before:to-transparent before:content-[''] group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:text-foreground"
                onClick={() => closeTab(tab2.id)}
                disabled={Boolean(annotationSession)}
                aria-label={t2("workspace.browser.closeTab", {
                  defaultValue: "关闭标签页",
                })}
              >
                <Icon icon={X$7} size="sm" className="relative" />
              </button>
            </BrowserTabMotion>
          ))}
        </div>
        <button
          type="button"
          data-action-ui-id="browser.new-tab"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
          onClick={createTab}
          disabled={Boolean(annotationSession)}
          aria-label={t2("workspace.browser.newTab", {
            defaultValue: "新建标签页",
          })}
        >
          <Icon icon={Plus} size="md" />
        </button>
        <BrowserTabOverview
          tabs={browserState.tabs}
          activeTabId={activeTabId}
          disabled={Boolean(annotationSession)}
          onSelect={(tabId) => selectTab(tabId, "overview")}
          onClose={(tabId) => closeTab(tabId, "overview")}
        />
      </div>
      {!annotationSession ? (
        <>
          <div className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-2">
            <IconButton
              label={t2("workspace.browser.back", {
                defaultValue: "后退",
              })}
              disabled={!activeTab?.canGoBack}
              onClick={() =>
                runStateAction("back", (id2) => browser2?.back(id2) ?? Promise.reject())
              }
            >
              <Icon icon={ArrowLeft} size="md" />
            </IconButton>
            <IconButton
              label={t2("workspace.browser.forward", {
                defaultValue: "前进",
              })}
              disabled={!activeTab?.canGoForward}
              onClick={() =>
                runStateAction("forward", (id2) => browser2?.forward(id2) ?? Promise.reject())
              }
            >
              <Icon icon={ArrowRight} size="md" />
            </IconButton>
            <IconButton
              label={t2("workspace.browser.reload", {
                defaultValue: "刷新",
              })}
              disabled={!activeTab}
              onClick={() =>
                runStateAction("reload", (id2) => browser2?.reload(id2) ?? Promise.reject())
              }
            >
              <Icon
                icon={RotateCw}
                size="md"
                className={activeTab?.isLoading ? "animate-spin" : ""}
              />
            </IconButton>
            <form
              className={`relative flex min-w-0 flex-1 items-center border px-2.5 transition-[border-color,background-color,border-radius] ${searchFocused ? "rounded-full border-input bg-muted" : "rounded-none border-transparent bg-transparent"}`}
              onSubmit={navigate}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchFocused(false);
              }}
            >
              <input
                ref={addressInputRef}
                data-action-ui-id="browser.address-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onClick={() => setSearchFocused(true)}
                className={`min-w-0 flex-1 bg-transparent py-1.5 text-xs text-foreground outline-none ${searchFocused ? "text-left" : "text-center"}`}
                aria-label={t2("workspace.browser.address", {
                  defaultValue: "地址",
                })}
                placeholder={t2("workspace.browser.urlPlaceholder", {
                  defaultValue: "搜索或输入网址",
                })}
                spellCheck={false}
              />
              {searchFocused &&
                activeTab?.url === "" &&
                !inputValue.trim() &&
                searchHistory.length > 0 && (
                  <BrowserSearchHistory
                    items={searchHistory}
                    onSelect={(item) => navigateToInput(item, false, "search_history")}
                    onRemove={removeSearchHistoryItem}
                  />
                )}
              {searchFocused && canUsePageTools && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        data-action-ui-id="browser.open-external"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={openExternal}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={t2("workspace.browser.openExternal", {
                          defaultValue: "在外部浏览器打开",
                        })}
                      />
                    }
                  >
                    <Icon icon={ArrowUpRight} size="sm" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t2("workspace.browser.openExternal", {
                      defaultValue: "在外部浏览器打开",
                    })}
                  </TooltipContent>
                </Tooltip>
              )}
            </form>
            <IconButton
              actionId="browser.bookmark-toggle"
              label={
                activeBookmark
                  ? t2("workspace.browser.removeBookmark", {
                      defaultValue: "取消收藏",
                    })
                  : t2("workspace.browser.addBookmark", {
                      defaultValue: "添加到书签",
                    })
              }
              disabled={!canBookmarkPage}
              onClick={toggleBookmark}
            >
              <Icon
                icon={Bookmark}
                size="md"
                className={activeBookmark ? "fill-foreground text-foreground" : void 0}
              />
            </IconButton>
            <IconButton
              actionId="browser.screenshot"
              label={t2("workspace.browser.screenshot", {
                defaultValue: "截图",
              })}
              disabled={!canUsePageTools}
              onClick={takeScreenshot}
            >
              <Icon icon={Camera} size="md" />
            </IconButton>
            <IconButton
              buttonRef={annotationGuideAnchor}
              actionId="browser.annotation-toggle"
              label={t2("workspace.browser.annotation", {
                defaultValue: "批注",
              })}
              active={Boolean(annotationSession)}
              disabled={!canUsePageTools || Boolean(annotationSession)}
              onClick={() => void startAnnotation()}
            >
              <AnnotationIcon$1 size={16} />
            </IconButton>
            <BrowserDownloads activeTabId={activeTabId} />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    ref={moreButtonRef}
                    type="button"
                    data-action-ui-id="browser.more-menu"
                    className={`flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground ${moreOpen ? "bg-secondary text-foreground" : ""}`}
                    onClick={toggleMoreMenu}
                    aria-label={t2("workspace.browser.more", {
                      defaultValue: "更多",
                    })}
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                  >
                    <Icon icon={MoreHorizontal} size="md" />
                  </button>
                }
              />
              <TooltipContent side="top">
                {t2("workspace.browser.more", {
                  defaultValue: "更多",
                })}
              </TooltipContent>
            </Tooltip>
          </div>
          {showChromeBanner && (
            <div className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-8 py-2">
              <Icon icon={Chrome} size="lg" className="shrink-0 text-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {t2("workspace.browser.chromeBannerTitle", {
                    defaultValue: "从 Chrome 导入登录状态",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t2("workspace.browser.chromeBannerDescription", {
                    defaultValue: "检测到可导入的 Chrome Profile，可将 Cookie 复制到 Browser。",
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={openChromeDialog}
                className="h-9 shrink-0 rounded-lg bg-muted px-4 text-sm text-foreground hover:bg-secondary"
              >
                {t2("workspace.browser.import", {
                  defaultValue: "导入",
                })}
              </button>
              <button
                type="button"
                onClick={dismissChromeBanner}
                className="shrink-0 px-2 text-xl text-muted-foreground hover:text-foreground"
                aria-label={t2("workspace.browser.dismissChromeBanner", {
                  defaultValue: "关闭 Chrome 导入提示",
                })}
              >
                ×
              </button>
            </div>
          )}
          {showChromeDialog && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/30 p-4">
              <div className="w-full max-w-md rounded-xl bg-popover p-5 text-popover-foreground shadow-lg">
                <div className="text-sm font-medium">
                  {chromeImportKind === "bookmarks"
                    ? t2("workspace.browser.chromeBookmarkDialogTitle", {
                        defaultValue: "从 Chrome 导入书签",
                      })
                    : t2("workspace.browser.chromeDialogTitle", {
                        defaultValue: "从 Chrome 导入",
                      })}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {chromeProfiles.map((profile) => (
                    <label
                      key={profile.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg bg-muted p-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="chrome-profile"
                        checked={selectedChromeProfile === profile.id}
                        onChange={() => setSelectedChromeProfile(profile.id)}
                      />
                      <span className="min-w-0 truncate">
                        {profile.displayName}
                        {profile.accountName ? ` · ${profile.accountName}` : ""}
                      </span>
                    </label>
                  ))}
                </div>
                {chromeImportKind === "cookies" && (
                  <div className="mt-4 flex gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={chromeImportScope === "all"}
                        onChange={() => setChromeImportScope("all")}
                      />
                      {t2("workspace.browser.allSites", {
                        defaultValue: "全部网站",
                      })}
                    </label>
                    {activeTabUrl && /^https?:/u.test(activeTabUrl) && (
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={chromeImportScope === "current-site"}
                          onChange={() => setChromeImportScope("current-site")}
                        />
                        {t2("workspace.browser.currentSite", {
                          defaultValue: "当前网站",
                        })}
                      </label>
                    )}
                  </div>
                )}
                {chromeImportResult && chromeImportKind === "cookies" && (
                  <div className="mt-4 rounded-lg bg-muted p-3 text-xs">
                    {chromeImportResult.success
                      ? t2("workspace.browser.importSuccess", {
                          defaultValue: "已导入 {{count}} 个 Cookie",
                          count: chromeImportResult.importedCount,
                        })
                      : browserProfileImportErrorMessage(t2, chromeImportResult.errorCode)}
                  </div>
                )}
                {chromeImportError && (
                  <div className="mt-4 text-xs text-destructive">{chromeImportError}</div>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={chromeImporting}
                    onClick={closeChromeDialog}
                    className="h-8 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {t2("common.cancel", {
                      defaultValue: "取消",
                    })}
                  </button>
                  <button
                    type="button"
                    disabled={chromeImporting || !selectedChromeProfile}
                    onClick={() => void startChromeImport()}
                    className="h-8 rounded-lg bg-foreground px-3 text-xs text-background disabled:opacity-50"
                  >
                    {chromeImporting
                      ? t2("workspace.browser.importing", {
                          defaultValue: "导入中…",
                        })
                      : t2("workspace.browser.import", {
                          defaultValue: "导入",
                        })}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
            <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-muted/30">
              <div className="absolute inset-0">
                {deviceCanvas && viewportSize ? (
                  <div
                    className="absolute left-1/2 top-1/2 rounded-xl border border-border bg-background p-1 shadow-lg"
                    style={{
                      width: viewportSize.width + 8,
                      height: viewportSize.height + 8,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      ref={viewportRef}
                      className="relative size-full overflow-hidden rounded-lg"
                    />
                  </div>
                ) : (
                  <div
                    ref={viewportRef}
                    className="absolute inset-0 overflow-hidden bg-background"
                  />
                )}
                {showError && loadError && (
                  <BrowserErrorCard error={loadError} onOpenExternal={openExternal} />
                )}
                {activeTab && !activeTabUrl && !showError && (
                  <BrowserStartPage
                    key={activeTab.id}
                    bookmarks={bookmarks}
                    searchHistory={searchHistory}
                    onSelectHistory={(value) => navigateToInput(value, false, "search_history")}
                    onRemoveHistory={removeSearchHistoryItem}
                    onSearch={(value) => navigateToInput(value, true)}
                    onNavigate={(value) => navigateToInput(value, false, "inspiration")}
                    onRemoveBookmark={removeBookmark}
                  />
                )}
                {!activeTab && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Icon icon={Globe} size="lg" />
                    <span className="text-sm">
                      {t2("workspace.browser.noTabs", {
                        defaultValue: "浏览器暂无标签页",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <BrowserAnnotationEditor
          src={annotationSession.dataUrl}
          viewportSize={annotationSession.viewportSize}
          title={annotationSession.title}
          onClose={closeAnnotation}
          onSend={handleAnnotationSend}
        />
      )}
    </section>
  );
}
