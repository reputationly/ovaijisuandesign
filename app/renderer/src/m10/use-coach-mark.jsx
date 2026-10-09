// use-coach-mark.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  isElectron,
  ACTIVE_CUSTOM_MODEL_QUERY_KEY,
  useQueryClient,
  useStorage,
  TRACK_EVENTS,
  storageKeys,
  usePlatform,
  Loader2,
  X$7,
  getRuntimeConfig,
  reactDomExports,
  DialogPortal$2,
  DialogBackdrop,
  DialogPopup,
  DialogClose$1,
  XIcon,
  DialogTitle$2,
  DialogDescription$2,
  ChevronLeftIcon,
  m$4,
  ImBridgeDialogCtx,
  queryClient,
  QueryClientProvider,
  isGlobalStorageSchema,
  syncLanguage,
  getLoggedErrorBoundaryDiagnostic,
  PlatformProvider,
  TEAM_ACCOUNT_BOOTSTRAP_ENABLED,
  V1LaunchNoticeSilentMigration,
  LoginGateProvider,
  InterestSelectionProvider,
  DebugPanelProvider,
  useDebugFlag,
  DEBUG_FLAGS,
  PopoverRoot,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from "../vendor.js";
import {
  Button$1,
  Dialog,
  cn$2,
  dialogChromeButtonClassName,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { AuthProvider } from "../m09/auth-provider.jsx";
import { instantiationService, IProjectMainService } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { ErrorFallbackUI } from "../m09/error-fallback-ui.jsx";
import { logErrorBoundary, FeedbackProvider } from "../m09/feedback-dialog.jsx";
import { TeamProvider } from "../m09/team-provider.jsx";
import {
  TeamDialogHost,
  TeamInviteDeepLinkHost,
  TeamOperationHost,
  AccountSubmissionBlockedHost,
} from "../m09/team-invite-deep-link-dialog.jsx";
import { useOnline } from "../asset-center/shared/misc-02.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AppWSConnectionProvider } from "./compact-rewrite-flow.jsx";
import { SettingsDialogProvider, ThemeProvider } from "./custom-provider-form.jsx";
import { getDesktopSettingsMainService } from "./delete-account-confirm-dialog.jsx";
import { LoginGateDialog } from "./hub-logo.jsx";
import { ImBridgeManager } from "./im-bridge-manager.jsx";
import {
  CanvasRenderRuntimeProvider,
  ServerDrivenPopupOrchestrator,
  WatermarkOnboarding,
  WindowCloseDialog,
} from "./migration-popup.jsx";
import { ProxyDetectedToast, RemoteConnectorAuthorizationHost } from "./proxy-detected-toast.jsx";
import { TopbarProvider } from "./topbar-provider.jsx";
import { UpdaterRoot } from "./update-banner.jsx";
import { UpdaterProvider } from "./updater-provider.jsx";
import { ProjectArchiveMenuProvider } from "./use-feature-popup-action.jsx";
import {
  LowMemoryToast,
  ModalSchedulerBridge,
  NewWorkspaceDialogProvider,
} from "./use-new-workspace-dialog.jsx";
import { InterestSelectionDialog } from "./use-project-archive-actions.jsx";
function ImBridgeDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const regionSuffix = getRuntimeConfig().region === "overseas" ? "overseas" : "domestic";
  const defaultTitle = t2(`imBridge.title.${regionSuffix}`);
  const [headerConfig, setHeaderConfig] = reactExports.useState(null);
  const title = headerConfig?.title ?? defaultTitle;
  const hasBackButton = Boolean(headerConfig?.onBack);
  reactExports.useEffect(() => {
    if (!open) setHeaderConfig(null);
  }, [open]);
  const handleHeaderChange = reactExports.useCallback((next2) => {
    setHeaderConfig(next2);
  }, []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal$2>
        <DialogBackdrop
          data-slot="dialog-overlay"
          className="modal-mask fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPopup
          data-action-ui-id="im-bridge-dialog"
          className="elevated-surface-border fixed top-1/2 left-1/2 z-50 flex h-[min(540px,calc(100vh-4rem))] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [&_[data-slot=button]]:rounded-md [&_[data-slot=input]]:rounded-md"
        >
          <div
            className={`relative flex h-16 shrink-0 items-center border-border border-b ${hasBackButton ? "gap-1 px-3" : "gap-3 pr-3 pl-7"}`}
          >
            {headerConfig?.onBack && (
              <Button$1
                type="button"
                variant="ghost"
                size="icon-lg"
                className={`size-11 ${dialogChromeButtonClassName}`}
                onClick={headerConfig.onBack}
                data-action-ui-id="im-bridge-dialog.back"
              >
                <ChevronLeftIcon className="size-6" strokeWidth={1.5} />
                <span className="sr-only">{t2("common.back")}</span>
              </Button$1>
            )}
            <DialogTitle$2 className="min-w-0 flex-1 truncate pr-14 font-heading font-medium text-base text-foreground">
              {title}
            </DialogTitle$2>
            <DialogClose$1
              render={
                <Button$1
                  variant="ghost"
                  size="icon-lg"
                  className={`absolute top-1 right-1 size-11 ${dialogChromeButtonClassName}`}
                  data-action-ui-id="im-bridge-dialog.close"
                />
              }
            >
              <XIcon className="size-6" strokeWidth={1.75} />
              <span className="sr-only">{t2("common.close")}</span>
            </DialogClose$1>
          </div>
          <DialogDescription$2 className="sr-only">{title}</DialogDescription$2>
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!">
            <div className="flex min-h-full px-6 pt-5 pb-6 [&>*]:min-h-full [&>*]:flex-1">
              <ImBridgeManager onDialogHeaderChange={handleHeaderChange} />
            </div>
          </div>
        </DialogPopup>
      </DialogPortal$2>
    </Dialog>
  );
}
function ImBridgeDialogProvider({ children: children2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const openImBridge = reactExports.useCallback(() => setOpen(true), []);
  const closeImBridge = reactExports.useCallback(() => setOpen(false), []);
  const value = reactExports.useMemo(
    () => ({
      open,
      openImBridge,
      closeImBridge,
    }),
    [open, openImBridge, closeImBridge],
  );
  return (
    <ImBridgeDialogCtx value={value}>
      {children2}
      <ImBridgeDialog open={open} onOpenChange={setOpen} />
    </ImBridgeDialogCtx>
  );
}
export function useImBridgeDialog() {
  const ctx = reactExports.useContext(ImBridgeDialogCtx);
  if (!ctx) throw new Error("useImBridgeDialog must be used within ImBridgeDialogProvider");
  return ctx;
}
function AppQueryProvider({ children: children2 }) {
  reactExports.useEffect(() => {
    const service2 = instantiationService.invokeFunction((accessor) =>
      accessor.get(IProjectMainService),
    );
    const disposable = service2.onDidChangeProjects(() => {
      void queryClient.invalidateQueries({
        queryKey: ["storage", "global", "projects"],
      });
    });
    return () => disposable.dispose();
  }, []);
  return <QueryClientProvider client={queryClient}>{children2}</QueryClientProvider>;
}
function StorageEffect() {
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  reactExports.useEffect(() => {
    try {
      if (!isElectron()) return;
      const subscription = getDesktopSettingsMainService().onDidChangeCustomModel(() => {
        void queryClient2.invalidateQueries({
          queryKey: ACTIVE_CUSTOM_MODEL_QUERY_KEY,
        });
      });
      return () => subscription.dispose();
    } catch {
      console.warn("[StorageEffect] Model configuration updates are unavailable");
    }
  }, [queryClient2]);
  reactExports.useEffect(() => {
    if (!platform2.capabilities.has("storage") || !platform2.storage) return;
    let cancelled = false;
    platform2.storage
      .globalLoad()
      .then((data2) => {
        if (cancelled || !data2 || !isGlobalStorageSchema(data2)) return;
        for (const [key2, value] of Object.entries(data2)) {
          if (key2 === "_version" || key2 === "currentWorkspace") continue;
          queryClient2.setQueryData(storageKeys.global(key2), value);
        }
      })
      .catch((err) => {
        console.error("[StorageEffect] Failed to load global storage:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [platform2, queryClient2]);
  const [config2] = useStorage("global.config");
  reactExports.useEffect(() => {
    syncLanguage(config2.language);
  }, [config2.language]);
  return null;
}
function ErrorFallback({ error }) {
  const [showDetails, setShowDetails] = reactExports.useState(false);
  const err = error instanceof Error ? error : new Error(String(error));
  const [diagnostic, setDiagnostic] = reactExports.useState(() =>
    getLoggedErrorBoundaryDiagnostic(err),
  );
  const showStack = getRuntimeConfig().channel !== "prod";
  reactExports.useEffect(() => {
    const timer2 = window.setTimeout(() => {
      setDiagnostic(getLoggedErrorBoundaryDiagnostic(err) ?? logErrorBoundary(err));
    }, 0);
    return () => window.clearTimeout(timer2);
  }, [err]);
  return (
    <ErrorFallbackUI
      message={err.message}
      stack={showStack ? err.stack : void 0}
      failureId={diagnostic?.failureId}
      failureTimestamp={diagnostic?.timestamp}
      showDetails={showDetails}
      onToggleDetails={() => setShowDetails((v2) => !v2)}
      onRetry={() => window.location.reload()}
    />
  );
}
function handleBoundaryError(error, info2) {
  const err = error instanceof Error ? error : new Error(String(error));
  logErrorBoundary(err, info2.componentStack);
}
function PlatformCanvasRenderProvider({ children: children2 }) {
  return (
    <PlatformProvider>
      <CanvasRenderRuntimeProvider>{children2}</CanvasRenderRuntimeProvider>
    </PlatformProvider>
  );
}
export function AppProviders({ children: children2 }) {
  return jsxRuntimeExports.jsx(m$4, {
    FallbackComponent: ErrorFallback,
    onError: handleBoundaryError,
    children: (
      <PlatformCanvasRenderProvider>
        <AppQueryProvider>
          <AppWSConnectionProvider>
            <ThemeProvider>
              <WindowCloseDialog />
              <AuthProvider>
                <TeamProvider enabled={TEAM_ACCOUNT_BOOTSTRAP_ENABLED}>
                  <StorageEffect />
                  <V1LaunchNoticeSilentMigration />
                  <ImBridgeDialogProvider>
                    <FeedbackProvider>
                      <ProjectArchiveMenuProvider>
                        <UpdaterProvider>
                          <SettingsDialogProvider>
                            <LoginGateProvider>
                              <InterestSelectionProvider>
                                <DebugPanelProvider>
                                  <TopbarProvider>
                                    <NewWorkspaceDialogProvider>
                                      {children2}
                                    </NewWorkspaceDialogProvider>
                                  </TopbarProvider>
                                  <LoginGateDialog />
                                  <InterestSelectionDialog />
                                  <WatermarkOnboarding />
                                  <RemoteConnectorAuthorizationHost />
                                </DebugPanelProvider>
                              </InterestSelectionProvider>
                            </LoginGateProvider>
                            <UpdaterRoot />
                            <ServerDrivenPopupOrchestrator />
                            <ModalSchedulerBridge />
                          </SettingsDialogProvider>
                        </UpdaterProvider>
                        <ProxyDetectedToast />
                        <LowMemoryToast />
                      </ProjectArchiveMenuProvider>
                    </FeedbackProvider>
                  </ImBridgeDialogProvider>
                  <>
                    <TeamDialogHost />
                    <TeamInviteDeepLinkHost />
                    <TeamOperationHost />
                    <AccountSubmissionBlockedHost />
                  </>
                </TeamProvider>
              </AuthProvider>
            </ThemeProvider>
          </AppWSConnectionProvider>
        </AppQueryProvider>
      </PlatformCanvasRenderProvider>
    ),
  });
}
export function OfflineBanner() {
  const { t: t2 } = useTranslation();
  const online = useOnline();
  const forceOfflineBanner = useDebugFlag(DEBUG_FLAGS.forceOfflineBanner);
  if (online && !forceOfflineBanner) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] -translate-x-1/2"
      data-action-ui-id="offline-banner"
    >
      <div
        role="status"
        className="pointer-events-none flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/15 px-4 py-1.5 text-xs text-destructive shadow-sm backdrop-blur"
      >
        {t2(
          "common.offline",
          "No internet connection. Some features may be unavailable until you reconnect.",
        )}
      </div>
    </div>
  );
}
const WINDOWS_TITLEBAR_HEIGHT = 32;
function deriveWindowChrome(os2) {
  const isMac2 = os2 === "darwin";
  const isWin = os2 === "win32";
  const chromeMode = isMac2 ? "mac-integrated" : isWin ? "windows-wco" : "native-frame";
  const titlebarHeight = isWin ? WINDOWS_TITLEBAR_HEIGHT : 0;
  return {
    chromeMode,
    isMacIntegratedChrome: isMac2,
    isWindowsTitlebarOverlay: isWin,
    isNativeFrame: !isMac2 && !isWin,
    hasReservedTitlebar: isWin,
    titlebarHeight,
    titlebarHeightCss: `${titlebarHeight}px`,
    isCustomChrome: isMac2 || isWin,
    needsDragRegion: isMac2 || isWin,
    needsTrafficLightSpacer: isMac2,
    needsWindowControls: false,
  };
}
export function useWindowChrome() {
  const { app } = usePlatform();
  return reactExports.useMemo(() => deriveWindowChrome(app.os), [app.os]);
}
const DEFAULT_AUTO_DISMISS_MS = 8e3;
const DEFAULT_OPEN_DELAY_MS$1 = 500;
export function useCoachMark(markId, enabled = true, options = {}) {
  const {
    autoClose = true,
    autoCloseMs = DEFAULT_AUTO_DISMISS_MS,
    openDelayMs = DEFAULT_OPEN_DELAY_MS$1,
    pauseOnHover = true,
    persistOnOpen = false,
  } = options;
  const [dismissedMarks, setDismissedMarks] = useStorage("global.dismissedCoachMarks");
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const hoveredRef = reactExports.useRef(false);
  const dismissedRef = reactExports.useRef(false);
  const openedRef = reactExports.useRef(false);
  const persistSeen = reactExports.useCallback(() => {
    setDismissedMarks((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(markId) ? arr : [...arr, markId];
    });
  }, [markId, setDismissedMarks]);
  reactExports.useEffect(() => {
    if (!openedRef.current && Array.isArray(dismissedMarks) && dismissedMarks.includes(markId)) {
      dismissedRef.current = true;
    }
  }, [dismissedMarks, markId]);
  reactExports.useEffect(() => {
    if (!enabled || dismissedRef.current || openedRef.current) return;
    if (Array.isArray(dismissedMarks) && dismissedMarks.includes(markId)) {
      dismissedRef.current = true;
      return;
    }
    const openTimer = setTimeout(() => {
      if (dismissedRef.current) return;
      openedRef.current = true;
      setIsOpen(true);
      if (persistOnOpen) persistSeen();
      trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
        mark_id: markId,
      });
    }, openDelayMs);
    return () => clearTimeout(openTimer);
  }, [enabled, dismissedMarks, markId, openDelayMs, persistOnOpen, persistSeen]);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const dismiss = reactExports.useCallback(
    (method) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      clearTimer2();
      setIsOpen(false);
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
      persistSeen();
    },
    [markId, clearTimer2, persistSeen],
  );
  const startTimer = reactExports.useCallback(() => {
    clearTimer2();
    if (!autoClose) return;
    timerRef.current = setTimeout(() => {
      if (!hoveredRef.current) {
        dismiss("timeout");
      }
    }, autoCloseMs);
  }, [clearTimer2, dismiss, autoCloseMs, autoClose]);
  reactExports.useEffect(() => {
    if (isOpen) startTimer();
    return clearTimer2;
  }, [isOpen, startTimer, clearTimer2]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        dismiss("close");
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, dismiss]);
  const onPointerEnter = reactExports.useCallback(() => {
    if (!pauseOnHover) return;
    hoveredRef.current = true;
    clearTimer2();
  }, [clearTimer2, pauseOnHover]);
  const onPointerLeave = reactExports.useCallback(() => {
    if (!pauseOnHover) return;
    hoveredRef.current = false;
    if (isOpen) startTimer();
  }, [isOpen, startTimer, pauseOnHover]);
  const holdOpen = reactExports.useCallback(() => {
    hoveredRef.current = true;
    clearTimer2();
  }, [clearTimer2]);
  return {
    isOpen,
    dismiss,
    onPointerEnter,
    onPointerLeave,
    holdOpen,
  };
}
function extractDominantColor(img) {
  try {
    const w3 = img.naturalWidth || img.width;
    const h2 = img.naturalHeight || img.height;
    if (!w3 || !h2) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w3;
    canvas.height = h2;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
    });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data: data2 } = ctx.getImageData(0, 0, w3, h2);
    const buckets2 = new Map();
    for (let i2 = 0; i2 < data2.length; i2 += 4) {
      if ((data2[i2 + 3] ?? 0) < 200) continue;
      const r2 = data2[i2] ?? 0;
      const g2 = data2[i2 + 1] ?? 0;
      const b3 = data2[i2 + 2] ?? 0;
      const key2 = `${r2 >> 4}-${g2 >> 4}-${b3 >> 4}`;
      const cur = buckets2.get(key2);
      if (cur) {
        cur.r += r2;
        cur.g += g2;
        cur.b += b3;
        cur.count += 1;
      } else {
        buckets2.set(key2, {
          r: r2,
          g: g2,
          b: b3,
          count: 1,
        });
      }
    }
    let winner = null;
    for (const bucket of buckets2.values()) {
      if (!winner || bucket.count > winner.count) winner = bucket;
    }
    if (!winner) return null;
    return `rgb(${Math.round(winner.r / winner.count)}, ${Math.round(winner.g / winner.count)}, ${Math.round(winner.b / winner.count)})`;
  } catch {
    return null;
  }
}
const ARROW_SIZE = 12;
const ARROW_INSET = 16;
function getArrowStyle(side, anchorRect, popupRect) {
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const maxLeft = Math.max(ARROW_INSET, popupRect.width - ARROW_INSET - ARROW_SIZE);
  const maxTop = Math.max(ARROW_INSET, popupRect.height - ARROW_INSET - ARROW_SIZE);
  const left = Math.min(
    Math.max(anchorCenterX - popupRect.left - ARROW_SIZE / 2, ARROW_INSET),
    maxLeft,
  );
  const top2 = Math.min(
    Math.max(anchorCenterY - popupRect.top - ARROW_SIZE / 2, ARROW_INSET),
    maxTop,
  );
  if (side === "top" || side === "bottom")
    return {
      left,
    };
  return {
    top: top2,
  };
}
const ARROW_CLASS = {
  // side = where the bubble sits relative to the anchor → arrow points back at anchor.
  bottom: "cm-arrow cm-arrow--up",
  top: "cm-arrow cm-arrow--down",
  right: "cm-arrow cm-arrow--left",
  left: "cm-arrow cm-arrow--right",
};
function SpotlightMask({ anchorRef, padding, onClickOutside }) {
  const [rect, setRect] = reactExports.useState(null);
  const measure = reactExports.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r2 = el.getBoundingClientRect();
    setRect({
      top: r2.top,
      left: r2.left,
      width: r2.width,
      height: r2.height,
    });
  }, [anchorRef]);
  reactExports.useEffect(() => {
    const el = anchorRef.current;
    measure();
    let ro;
    if (el) {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorRef, measure]);
  if (!rect) return null;
  return reactDomExports.createPortal(
    <button
      type="button"
      tabIndex={-1}
      data-slot="coach-mark-mask"
      onClick={onClickOutside}
      className="fixed inset-0 z-40 cursor-default border-none bg-transparent p-0 motion-safe:animate-in motion-safe:fade-in-0 duration-300"
    >
      <div
        className="absolute rounded-lg"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
        }}
      />
    </button>,
    document.body,
  );
}
export function CoachMarkPopup({
  open,
  onDismiss,
  title,
  description,
  anchorRef,
  anchorEl,
  side = "bottom",
  sideOffset = 10,
  align = "start",
  ctaLabel,
  ctaLoading = false,
  spotlightPadding = 4,
  showSpotlight = false,
  showClose = false,
  showLeftClose = false,
  media,
  preloadUrls,
  hideArrow = false,
  stepCurrent,
  stepTotal,
  actionUiId,
  onPointerEnter,
  onPointerLeave,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const popupRef = reactExports.useRef(null);
  const [arrowStyle, setArrowStyle] = reactExports.useState(null);
  const [renderedSide, setRenderedSide] = reactExports.useState(side);
  const [mediaError, setMediaError] = reactExports.useState(false);
  const [mediaBgColor, setMediaBgColor] = reactExports.useState(media?.bgColor);
  const [lastMediaUrl, setLastMediaUrl] = reactExports.useState(media?.url);
  if (media?.url !== lastMediaUrl) {
    setLastMediaUrl(media?.url);
    setMediaError(false);
    setMediaBgColor(media?.bgColor);
  }
  reactExports.useEffect(() => {
    if (!open || !preloadUrls?.length) return;
    for (const url2 of preloadUrls) {
      if (!url2) continue;
      const img = new Image();
      img.src = url2;
    }
  }, [open, preloadUrls]);
  const updateArrowStyle = reactExports.useCallback(() => {
    const anchor = anchorEl ?? anchorRef.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;
    const actualSide = popup.parentElement?.getAttribute("data-side") ?? side;
    setRenderedSide(actualSide);
    setArrowStyle(
      getArrowStyle(actualSide, anchor.getBoundingClientRect(), popup.getBoundingClientRect()),
    );
  }, [anchorRef, anchorEl, side]);
  reactExports.useEffect(() => {
    if (!open) return;
    const frame2 = requestAnimationFrame(updateArrowStyle);
    const anchor = anchorEl ?? anchorRef.current;
    const popup = popupRef.current;
    const observer2 = new ResizeObserver(updateArrowStyle);
    if (anchor) observer2.observe(anchor);
    if (popup) observer2.observe(popup);
    window.addEventListener("resize", updateArrowStyle);
    window.addEventListener("scroll", updateArrowStyle, true);
    return () => {
      cancelAnimationFrame(frame2);
      observer2.disconnect();
      window.removeEventListener("resize", updateArrowStyle);
      window.removeEventListener("scroll", updateArrowStyle, true);
    };
  }, [anchorRef, anchorEl, open, updateArrowStyle]);
  if (anchorEl === null) return null;
  const hasMedia = media !== void 0;
  const hasSteps = Boolean(stepCurrent && stepTotal && stepTotal > 1);
  return (
    <>
      {open && showSpotlight && (
        <SpotlightMask
          anchorRef={anchorRef}
          padding={spotlightPadding}
          onClickOutside={() => onDismiss("close")}
        />
      )}
      <PopoverRoot open={open}>
        <PopoverPortal>
          <PopoverPositioner
            side={side}
            sideOffset={sideOffset}
            align={align}
            anchor={anchorEl ?? anchorRef}
            className="isolate z-50"
          >
            <PopoverPopup
              ref={popupRef}
              onAnimationEnd={updateArrowStyle}
              onTransitionEnd={updateArrowStyle}
              data-slot="coach-mark"
              data-action-ui-id={actionUiId}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
              className={cn$2(
                "cm overflow-visible",
                hasMedia && "cm--with-media",
                // Enter (`data-open`) is snappy at 200ms; exit (`data-closed`)
                // is a soft 1s fade so timeout dismissal feels gentle rather
                // than a snap. ease-out keeps the early part of the exit
                // expressive and the tail subtle.
                "origin-(--transform-origin) duration-200 data-closed:duration-1000 data-closed:ease-out",
                // Enter animation: fade + zoom + slide in from the anchored
                // edge. The exit animation deliberately only fades — no zoom,
                // no slide — so the bubble dissolves in place without any
                // size or position shift.
                "motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95",
                "motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0",
                "motion-safe:data-[side=bottom]:data-open:slide-in-from-top-2 motion-safe:data-[side=top]:data-open:slide-in-from-bottom-2",
                "motion-safe:data-[side=left]:data-open:slide-in-from-right-2 motion-safe:data-[side=right]:data-open:slide-in-from-left-2",
              )}
            >
              {hasMedia && (
                <div
                  className={cn$2(
                    "cm-media",
                    (!media?.url || mediaError) && "cm-media--placeholder",
                  )}
                  style={
                    mediaBgColor
                      ? {
                          backgroundColor: mediaBgColor,
                        }
                      : void 0
                  }
                >
                  {media?.url && !mediaError ? (
                    media.type === "video" ? (
                      <video
                        src={media.url}
                        autoPlay={true}
                        muted={true}
                        loop={true}
                        playsInline={true}
                        onError={() => setMediaError(true)}
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={media.url}
                        alt=""
                        crossOrigin="anonymous"
                        onError={() => setMediaError(true)}
                        onLoad={(e2) => {
                          if (mediaBgColor) return;
                          const color2 = extractDominantColor(e2.currentTarget);
                          if (color2) setMediaBgColor(color2);
                        }}
                      />
                    )
                  ) : (
                    <span>{t2("coachMark.mediaPlaceholder", "媒体占位（待补图）")}</span>
                  )}
                  {(!media?.url || mediaError) && <div className="cm-media-overlay" />}
                </div>
              )}
              {showClose && (
                <button
                  type="button"
                  className="cm-close"
                  aria-label={t2("common.close")}
                  onClick={() => onDismiss("close")}
                >
                  <X$7 size={14} strokeWidth={1.75} />
                </button>
              )}
              <div className="cm-content">
                <p className="cm-title">{title}</p>
                <p className="cm-desc">{description}</p>
                {children2}
                <div
                  className={cn$2(
                    "cm-footer",
                    hasSteps ? "cm-footer--steps" : "cm-footer--no-steps",
                  )}
                >
                  {hasSteps && (
                    <div className="cm-steps" aria-hidden="true">
                      {Array.from(
                        {
                          length: stepTotal,
                        },
                        (_2, i2) => (
                          <span
                            key={i2}
                            className={cn$2("cm-step", i2 < stepCurrent && "is-active")}
                          />
                        ),
                      )}
                    </div>
                  )}
                  <div className="cm-actions">
                    {showLeftClose && (
                      <button
                        type="button"
                        className="cm-left-close"
                        aria-label={t2("common.close")}
                        data-action-ui-id={actionUiId ? `${actionUiId}-left-close` : void 0}
                        disabled={ctaLoading}
                        onClick={() => onDismiss("close")}
                      >
                        <X$7 size={16} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="cm-cta"
                      data-action-ui-id={actionUiId ? `${actionUiId}-cta` : void 0}
                      disabled={ctaLoading}
                      onClick={() => onDismiss("button")}
                    >
                      {ctaLoading && (
                        <Loader2 size={12} strokeWidth={1} className="cm-cta-spinner" />
                      )}
                      {ctaLabel ?? t2("coachMark.gotIt", "Got it")}
                    </button>
                  </div>
                </div>
              </div>
              {!hideArrow && (
                <div className={ARROW_CLASS[renderedSide]} style={arrowStyle ?? void 0} />
              )}
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </PopoverRoot>
    </>
  );
}
