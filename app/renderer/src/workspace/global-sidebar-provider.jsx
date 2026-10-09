// global-sidebar-provider.jsx
import { reactExports, useStorage } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  GLOBAL_SIDEBAR_MAX_WIDTH,
  GLOBAL_SIDEBAR_MIN_WIDTH,
  GlobalSidebarContext,
  HOME_SIDEBAR_WIDTH,
} from "./set-home-widget-dev-preview-mode.js";
import { useResizableWidth } from "../generation/use-resizable-width.js";

const GLOBAL_SIDEBAR_PREVIEW_OPEN_DELAY = 60;

const GLOBAL_SIDEBAR_PREVIEW_EXIT_DURATION = 0;

const GLOBAL_SIDEBAR_RESIZE_EXIT_POLL_DELAY = 50;

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
    setMode((previous2) =>
      previous2 === persistedMode ? previous2 : persistedMode,
    );
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
  }, [
    clearPreviewCloseTimer,
    clearPreviewExitTimer,
    clearPreviewOpenTimer,
    commitMode,
  ]);
  const togglePinned = reactExports.useCallback(() => {
    clearPreviewOpenTimer();
    clearPreviewCloseTimer();
    clearPreviewExitTimer();
    commitMode(modeRef.current === "pinned" ? "rail" : "pinned");
  }, [
    clearPreviewCloseTimer,
    clearPreviewExitTimer,
    clearPreviewOpenTimer,
    commitMode,
  ]);
  const setPinned = reactExports.useCallback(
    (pinned) => {
      const next2 = pinned ? "pinned" : "rail";
      if (modeRef.current === next2) return;
      clearPreviewOpenTimer();
      clearPreviewCloseTimer();
      clearPreviewExitTimer();
      commitMode(next2);
    },
    [
      clearPreviewCloseTimer,
      clearPreviewExitTimer,
      clearPreviewOpenTimer,
      commitMode,
    ],
  );
  const openPreview = reactExports.useCallback(() => {
    if (
      modeRef.current !== "rail" ||
      previewOpen ||
      previewOpenTimerRef.current
    )
      return;
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
    if (
      modeRef.current !== "rail" ||
      !previewOpenRef.current ||
      previewClosingRef.current
    ) {
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
