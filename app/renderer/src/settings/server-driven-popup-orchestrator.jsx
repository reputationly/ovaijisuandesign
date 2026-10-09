// server-driven-popup-orchestrator.jsx
import {
  ChevronLeftIcon,
  dedupedToast,
  DialogBackdrop,
  DialogClose$1 as DialogClose,
  DialogDescription$2,
  DialogPopup,
  DialogPortal$2 as DialogPortal,
  DialogTitle$2,
  getRuntimeConfig,
  jsxRuntimeExports,
  m$4 as m,
  QueryClientProvider,
  reactExports,
  storageKeys,
  Trans,
  usePlatform,
  useQueryClient,
  useStorage,
  useTranslation,
  XIcon,
} from "../vendor.js";
import {
  resolveDesktopCanvasRenderPolicy,
  useAuth,
} from "../assets/credit-query-keys.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  InterestOptionGrid,
  MAX_INTERESTS,
} from "../workspace/interest-option-grid.jsx";
import {
  DEBUG_PANEL_OPEN_EVENT,
  InterestSelectionContext,
  PROXY_RECHECK_INTERVAL_MS,
  TOAST_DURATION_MS,
  TOAST_ID,
  useInterestSelection,
  WARNING_CONFIRMATION_COUNT,
} from "./request-prompt-prefill.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  Button,
  Dialog,
  dialogChromeButtonClassName,
  DialogContent,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  HubBrandLine,
  showProxyToast,
} from "./connector-relationship-graphic.jsx";
import {
  NewWorkspaceDialogContext,
  OPEN_NEW_WORKSPACE_DIALOG_EVENT,
} from "../workspace/tool-label-definitions.js";
import {
  useBlockingModalPresence,
  useTopbarActions,
} from "../workspace/topbar-state-context.jsx";
import { NewWorkspaceDialog } from "../workspace/new-workspace-dialog.jsx";
import { useHubClientConfig } from "./parse-home-survey.js";
import {
  BLOCKING_MODAL_IDS,
  LoginGateContext,
  readSessionDismissed,
  SESSION_DISMISS_KEY,
  setModalScheduleConfig,
  STARTUP_MODAL_IDS,
  useLoginGate,
  useModalSchedulerSuspension,
  useModalSlot,
  useModalSlotWithLoading,
} from "../infra/schedule.js";
import { showLowMemoryToast } from "../workspace/use-new-workspace-dialog.jsx";
import {
  syncLanguage,
  useRouterState,
} from "../vendor-inline/vscode-base/linked-list.js";
import { IPC_CHANNELS } from "../infra/gateway-http-error.jsx";
import {
  homeService,
  instantiation,
  instantiationService,
  IProjectMainService,
  IWindowMainService,
} from "../workspace/home-service.jsx";
import { IHiloApp } from "./parse-custom-mcp-arguments.js";
import { useProjectArchiveActions } from "../workspace/use-project-archive-actions.js";
import { UpdaterRouterInner } from "./version-row.jsx";
import {
  useOptionalUpdaterContext,
  useUpdaterContext,
} from "./use-active-runtime.js";
import { UpdaterErrorBoundary } from "./minimal-forced-fallback.jsx";
import { LibTvConnectorDialog } from "./lib-tv-connector-dialog.jsx";
import { reportRumAction } from "../i18n/init-rum.js";
import {
  actionTrailLog,
  PlatformProvider,
  serverPopupLog,
} from "../vendor-inline/vscode-base/graph.jsx";
import { WindowCloseDialogContent } from "./window-close-dialog-content.jsx";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";
import { Switch } from "../generation/select-content.jsx";
import { useSettings } from "./use-settings.js";
import { MigrationPopup } from "./migration-popup.jsx";
import { PopupType } from "../generation/normalize-skill-detail-metadata.js";
import { usePopup } from "./use-popup.js";
import {
  MUTE_FOREVER,
  readMutedUntil,
  setMutedUntil,
  touchSeen,
  trackTypeOf,
  useAutoAnnouncement,
} from "./use-auto-announcement.js";
import { GeneralPopup } from "./general-popup.jsx";
import { FeaturePopup } from "./feature-popup.jsx";
import { BULLET_KEYS, HubWordmark } from "../infra/inline-rename-input.jsx";
import { HubLogo } from "../infra/hub-logo.jsx";
import { CDN_LOGIN_GATE_HERO } from "../workspace/context-menu-content.jsx";
import {
  ACTIVE_CUSTOM_MODEL_QUERY_KEY,
  applyClass,
  getSystemTheme,
  resolveTheme,
  ThemeCtx,
  useRuntimeConfig,
} from "../generation/use-model-catalog-scope-key.js";
import { SettingsDialog } from "../assets/general-section.jsx";
import { SettingsDialogCtx } from "../workspace/asset-lineage-query-key.js";
import { WSConnectionProviderCore } from "./ws-connection-provider-core.jsx";
import { canUseDebugTooling } from "../workspace/use-deep-link-router.js";
import { resolveRuntimeServices } from "./trial-granted-popup.jsx";
import {
  CANVAS_SURFACE_RECOVERY_MEASURE,
  ImBridgeDialogCtx,
  queryClient,
  safeInfo,
  safeTrack,
  safeWarn,
} from "../assets/wrap-as-asset-center-error.js";
import { CanvasRenderPolicyProvider } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { logErrorBoundary } from "./log-error-boundary.js";
import { loggedErrorBoundaryDiagnostics } from "./logged-error-boundary-diagnostics.js";
import { ErrorFallbackUI } from "../infra/error-fallback-ui.jsx";
import { getDesktopSettingsMainService } from "../team/copy-icon-button.jsx";
import { ImBridgeManager } from "./im-bridge-manager.jsx";
import { AuthProvider } from "./auth-provider.jsx";
import { FeedbackProvider } from "./use-direct-feedback.jsx";
import { TeamProvider } from "../team/team-provider.jsx";
import { TeamDialogHost } from "../team/create-team-dialog.jsx";
import {
  AccountSubmissionBlockedHost,
  TeamInviteDeepLinkHost,
} from "../team/account-submission-blocked-host.jsx";
import { TeamOperationHost } from "../team/team-operation-host.jsx";
import { TopbarProvider } from "../workspace/topbar-provider.jsx";
import { UpdaterProvider } from "./updater-provider.jsx";
function getLoggedErrorBoundaryDiagnostic(error) {
  return loggedErrorBoundaryDiagnostics.get(error);
}
function writeSessionDismissed(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    else sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {}
}
function LoginGateProvider({ children: children2 }) {
  const { user, isLoggedIn, isLoading, login } = useAuth();
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const sessionDismissedRef = reactExports.useRef(readSessionDismissed());
  const [hasEverLoggedIn, setHasEverLoggedIn, , hasEverLoggedInHydrated] =
    useStorage("global.hasEverLoggedIn");
  const everLoggedInWriteAttemptedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (isLoggedIn && hasEverLoggedInHydrated && !hasEverLoggedIn) {
      if (everLoggedInWriteAttemptedRef.current) return;
      everLoggedInWriteAttemptedRef.current = true;
      setHasEverLoggedIn(true);
    }
  }, [
    isLoggedIn,
    hasEverLoggedIn,
    hasEverLoggedInHydrated,
    setHasEverLoggedIn,
  ]);
  reactExports.useEffect(() => {
    if (isLoading) return;
    if (user) {
      setIsOpen(false);
      return;
    }
    if (!hasEverLoggedInHydrated) return;
    if (hasEverLoggedIn) return;
    if (!sessionDismissedRef.current) {
      setIsOpen(true);
    }
  }, [user, isLoading, hasEverLoggedIn, hasEverLoggedInHydrated]);
  const forceOpen = reactExports.useCallback(() => {
    sessionDismissedRef.current = false;
    writeSessionDismissed(false);
    setIsOpen(true);
  }, []);
  const dismissForSession = reactExports.useCallback(() => {
    sessionDismissedRef.current = true;
    writeSessionDismissed(true);
    setIsOpen(false);
  }, []);
  const triggerLogin = reactExports.useCallback(() => {
    login();
  }, [login]);
  useModalSchedulerSuspension(BLOCKING_MODAL_IDS.loginGate, isOpen);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.loginGate, isOpen);
  const value = reactExports.useMemo(
    () => ({
      isOpen,
      forceOpen,
      dismissForSession,
      triggerLogin,
    }),
    [isOpen, forceOpen, dismissForSession, triggerLogin],
  );
  return (
    <LoginGateContext.Provider value={value}>
      {children2}
    </LoginGateContext.Provider>
  );
}
const DebugPanelDialog = reactExports.lazy(() =>
  (() => import("../DebugPanelDialog-C7RBwCiN.js"))(),
);
function canUseDebugPanel() {
  return canUseDebugTooling();
}
function DebugPanelProvider({ children: children2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const isEnabled = canUseDebugPanel();
  reactExports.useEffect(() => {
    if (!isEnabled) return;
    const onOpenDebugPanel = () => setOpen(true);
    const onKeyDown = (event) => {
      if (event.key !== ";") return;
      if (event.altKey || event.shiftKey) return;
      const isMac2 =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const primary = isMac2 ? event.metaKey : event.ctrlKey;
      const otherModifier = isMac2 ? event.ctrlKey : event.metaKey;
      if (!primary || otherModifier) return;
      event.preventDefault();
      setOpen((v2) => !v2);
    };
    window.addEventListener(DEBUG_PANEL_OPEN_EVENT, onOpenDebugPanel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(DEBUG_PANEL_OPEN_EVENT, onOpenDebugPanel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isEnabled]);
  if (!isEnabled) return <>{children2}</>;
  return (
    <>
      {children2}
      <reactExports.Suspense fallback={null}>
        <DebugPanelDialog open={open} onOpenChange={setOpen} />
      </reactExports.Suspense>
    </>
  );
}
function InterestSelectionProvider({ children: children2 }) {
  const { isLoggedIn } = useAuth();
  const loginGate = useLoginGate();
  const [
    hasSelectedInterests,
    setHasSelectedInterests,
    setHasSelectedInterestsAsync,
    hasSelectedInterestsHydrated,
  ] = useStorage("global.hasSelectedInterests");
  const [, , setSelectedInterestsAsync] = useStorage(
    "global.selectedInterests",
  );
  const [forcedOpen, setForcedOpen] = reactExports.useState(false);
  const [selected2, setSelected] = reactExports.useState([]);
  const autoCandidate =
    isLoggedIn &&
    hasSelectedInterestsHydrated &&
    hasSelectedInterests !== true &&
    !loginGate.isOpen;
  const granted = useModalSlot(STARTUP_MODAL_IDS.interestSelection, {
    candidate: autoCandidate,
  });
  const isOpen = (granted && autoCandidate) || forcedOpen;
  useBlockingModalPresence(BLOCKING_MODAL_IDS.interestSelection, isOpen);
  const toggle = reactExports.useCallback((key2) => {
    setSelected((prev) => {
      if (prev.includes(key2)) return prev.filter((k2) => k2 !== key2);
      if (prev.length >= 3) return prev;
      return [...prev, key2];
    });
  }, []);
  const forceOpen = reactExports.useCallback(() => {
    setSelected([]);
    setHasSelectedInterests(false);
    setForcedOpen(true);
  }, [setHasSelectedInterests]);
  const complete = reactExports.useCallback(async () => {
    await Promise.all([
      setHasSelectedInterestsAsync(true),
      setSelectedInterestsAsync(selected2),
    ]);
    setForcedOpen(false);
  }, [selected2, setHasSelectedInterestsAsync, setSelectedInterestsAsync]);
  const value = reactExports.useMemo(
    () => ({
      isOpen,
      selected: selected2,
      toggle,
      forceOpen,
      complete,
    }),
    [isOpen, selected2, toggle, forceOpen, complete],
  );
  return (
    <InterestSelectionContext.Provider value={value}>
      {children2}
    </InterestSelectionContext.Provider>
  );
}
function V1LaunchNoticeSilentMigration() {
  const { isLoggedIn, isLoading: authLoading, clearLocalAuth } = useAuth();
  const [pending2, setPending, , isHydrated] = useStorage(
    "global.v1LaunchNoticePending",
  );
  const consumedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!isHydrated || pending2 !== true || authLoading || consumedRef.current)
      return;
    consumedRef.current = true;
    void setPending(false);
    if (isLoggedIn) clearLocalAuth();
  }, [
    isHydrated,
    pending2,
    authLoading,
    isLoggedIn,
    clearLocalAuth,
    setPending,
  ]);
  return null;
}
function isGlobalStorageSchema(data2) {
  if (data2 == null || typeof data2 !== "object") return false;
  const obj = data2;
  return (
    typeof obj._version === "number" &&
    obj.config != null &&
    typeof obj.config === "object"
  );
}
const TEAM_ACCOUNT_BOOTSTRAP_ENABLED = true;
function AppWSConnectionProvider({ children: children2 }) {
  return (
    <WSConnectionProviderCore
      wsUrl={getRuntimeConfig().wsUrl}
      scope="app"
      syncCanvasAssetMetadata={false}
    >
      {children2}
    </WSConnectionProviderCore>
  );
}
function ThemeProvider({ children: children2 }) {
  const { config: config2, set: set2 } = useSettings();
  const theme2 = config2.theme ?? "system";
  const [systemTheme, setSystemTheme] = reactExports.useState(getSystemTheme);
  const resolved = theme2 === "system" ? systemTheme : resolveTheme(theme2);
  const setTheme = reactExports.useCallback(
    (next2) => {
      void set2("theme", next2);
    },
    [set2],
  );
  reactExports.useEffect(() => {
    applyClass(resolved);
  }, [resolved]);
  reactExports.useEffect(() => {
    if (theme2 !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mq.matches ? "dark" : "light");
    const handler = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme2]);
  const value = reactExports.useMemo(
    () => ({
      theme: theme2,
      resolved,
      setTheme,
    }),
    [theme2, resolved, setTheme],
  );
  return <ThemeCtx value={value}>{children2}</ThemeCtx>;
}
function SettingsDialogProvider({ children: children2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const [initialSection, setInitialSection] = reactExports.useState("general");
  const { isLoggedIn } = useAuth();
  const openSettings = reactExports.useCallback((section) => {
    setInitialSection(section ?? "general");
    setOpen(true);
  }, []);
  const closeSettings = reactExports.useCallback(() => {
    setOpen(false);
  }, []);
  reactExports.useEffect(() => {
    if (!isLoggedIn) setOpen(false);
  }, [isLoggedIn]);
  reactExports.useEffect(() => {
    if (!window.hilo?.ipcRenderer) return;
    const off = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.MENU_OPEN_SETTINGS,
      () => {
        openSettings();
      },
    );
    return off;
  }, [openSettings]);
  const value = reactExports.useMemo(
    () => ({
      open,
      openSettings,
      closeSettings,
    }),
    [open, openSettings, closeSettings],
  );
  return (
    <SettingsDialogCtx value={value}>
      {children2}
      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        initialSection={initialSection}
      />
    </SettingsDialogCtx>
  );
}
function LoginGateDialog() {
  const { isOpen, dismissForSession, triggerLogin } = useLoginGate();
  const { t: t2 } = useTranslation();
  const handleDismiss = () => {
    dismissForSession();
    try {
      trackEvent(TRACK_EVENTS.LOGIN_GATE_DISMISS, {});
    } catch {}
  };
  reactExports.useEffect(() => {
    if (isOpen) {
      trackEvent(TRACK_EVENTS.LOGIN_GATE_VIEW, {});
    }
  }, [isOpen]);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open, details) => {
        if (open) return;
        details?.cancel();
      }}
      disablePointerDismissal={true}
    >
      <DialogContent
        overlayClassName="![backdrop-filter:none] ![-webkit-backdrop-filter:none]"
        className="!grid !h-[480px] !w-[760px] !max-w-[760px] !grid-cols-1 !grid-rows-[auto] !gap-0 !p-0 elevated-surface-border overflow-hidden rounded-xl bg-popover shadow-lg ring-0 sm:!max-w-[760px]"
        showCloseButton={false}
        data-action-ui-id="auth.login-gate"
      >
        <DialogDescription className="sr-only">
          {t2("auth.loginGate.subtitle")}
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3 z-10 text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
          onClick={handleDismiss}
          aria-label={t2("common.close")}
          data-action-ui-id="auth.login-gate.close"
        >
          <XIcon size={16} strokeWidth={1.5} />
        </Button>
        <div className="grid h-full grid-cols-[320px_1fr]">
          <div className="relative h-full w-[320px]">
            <div
              className="absolute inset-y-1 right-0 left-1 overflow-hidden rounded-lg bg-muted"
              data-slot="login-gate-media"
            >
              <img
                src={CDN_LOGIN_GATE_HERO}
                alt=""
                aria-hidden={true}
                draggable={false}
                loading="eager"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div
            className="flex h-full flex-col px-8 pt-4 pr-12 pb-8"
            data-slot="login-gate-content"
          >
            <div
              className="mt-0.5 flex items-center gap-1.5"
              data-slot="login-gate-brand"
            >
              <HubLogo
                size={17}
                className="shrink-0 [&_g:has(>[data-hub-logo-eye])]:transform-none!"
                data-slot="login-gate-brand-logo"
              />
              <HubWordmark
                width={99}
                height={14}
                className="translate-y-px [&_g>path:nth-child(n+10)]:fill-[var(--hub-wordmark-accent)]"
                data-slot="login-gate-brand-wordmark"
              />
            </div>
            <div
              aria-hidden="true"
              className="mt-6 border-t border-border"
              data-slot="login-gate-brand-divider"
            />
            <div className="mt-6 flex flex-col gap-4">
              <DialogTitle className="font-heading text-[22px] font-medium leading-snug text-foreground">
                {t2("auth.loginGate.title")}
              </DialogTitle>
              <p className="text-sm leading-relaxed text-foreground/70">
                {t2("auth.loginGate.subtitle")}
              </p>
            </div>
            <ul className="mt-5 flex flex-col gap-3.5 text-sm leading-relaxed text-foreground/70">
              {BULLET_KEYS.map((key2) => (
                <li key={key2} className="flex gap-2.5">
                  <span
                    aria-hidden={true}
                    className="mt-2 h-1.5 w-1.5 shrink-0 bg-foreground/70"
                  />
                  <span>
                    <Trans
                      i18nKey={key2}
                      components={{
                        i: <i />,
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Button
                type="button"
                size="lg"
                className="h-10 w-full rounded-xl px-6 text-sm font-medium"
                onClick={triggerLogin}
                data-action-ui-id="auth.login-gate.confirm"
              >
                {t2("auth.loginGate.button")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function NewWorkspaceDialogProvider({ children: children2 }) {
  const { createWorkspace } = useTopbarActions();
  const [open, setOpen] = reactExports.useState(false);
  const [presetProjectId, setPresetProjectId] = reactExports.useState(void 0);
  const confirmHandlerRef = reactExports.useRef(null);
  const defaultConfirm = reactExports.useCallback(
    (name2, options) => {
      return createWorkspace(name2, options);
    },
    [createWorkspace],
  );
  const requestOpen = reactExports.useCallback(
    (onConfirm, nextPresetProjectId) => {
      confirmHandlerRef.current = onConfirm ?? null;
      setPresetProjectId(nextPresetProjectId);
      setOpen(true);
    },
    [],
  );
  const close2 = reactExports.useCallback(() => {
    confirmHandlerRef.current = null;
    setPresetProjectId(void 0);
    setOpen(false);
  }, []);
  reactExports.useEffect(() => {
    const handleOpen = () => requestOpen();
    window.addEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen);
    return () =>
      window.removeEventListener(OPEN_NEW_WORKSPACE_DIALOG_EVENT, handleOpen);
  }, [requestOpen]);
  const handleConfirm = reactExports.useCallback(
    (name2, options) => {
      const handler = confirmHandlerRef.current ?? defaultConfirm;
      confirmHandlerRef.current = null;
      return handler(name2, options);
    },
    [defaultConfirm],
  );
  const handleOpenChange = reactExports.useCallback((nextOpen) => {
    if (!nextOpen) {
      confirmHandlerRef.current = null;
      setPresetProjectId(void 0);
    }
    setOpen(nextOpen);
  }, []);
  const value = reactExports.useMemo(
    () => ({
      open,
      requestOpen,
      close: close2,
    }),
    [close2, open, requestOpen],
  );
  return (
    <NewWorkspaceDialogContext value={value}>
      {children2}
      <NewWorkspaceDialog
        open={open}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
        defaultProjectId={presetProjectId}
      />
    </NewWorkspaceDialogContext>
  );
}
function LowMemoryToast() {
  const pendingPayloadRef = reactExports.useRef(null);
  const showOrDefer = reactExports.useCallback((payload) => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      showLowMemoryToast(payload);
      return;
    }
    pendingPayloadRef.current = payload;
  }, []);
  const flushPending = reactExports.useCallback(() => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    showLowMemoryToast(payload);
  }, []);
  reactExports.useEffect(() => {
    if (typeof hilo === "undefined") return;
    return hilo.diagnostics.onLowMemory((payload) => {
      showOrDefer(payload);
    });
  }, [showOrDefer]);
  reactExports.useEffect(() => {
    document.addEventListener("visibilitychange", flushPending);
    window.addEventListener("focus", flushPending);
    return () => {
      document.removeEventListener("visibilitychange", flushPending);
      window.removeEventListener("focus", flushPending);
    };
  }, [flushPending]);
  return null;
}
function ModalSchedulerBridge() {
  const { startupModalSchedule } = useHubClientConfig();
  reactExports.useEffect(() => {
    setModalScheduleConfig(startupModalSchedule);
  }, [startupModalSchedule]);
  return null;
}
function ProxyDetectedToast() {
  reactExports.useEffect(() => {
    const diagnostics = window.hilo?.diagnostics;
    if (!diagnostics) return;
    let disposed = false;
    let requestRevision = 0;
    let warningVisible = false;
    let warningAcknowledged = false;
    let warningObservationCount = 0;
    let nextWarningObservationAt = 0;
    let warningExpiresAt = 0;
    let lastReportedDecision = "";
    let recheckTimer;
    function reportDecision(decision, reason) {
      const key2 = `${decision}:${reason}`;
      if (lastReportedDecision === key2) return;
      lastReportedDecision = key2;
      reportRumAction("Proxy warning decision", {
        decision,
        reason,
      });
    }
    function clearRecheckTimer() {
      if (!recheckTimer) return;
      clearTimeout(recheckTimer);
      recheckTimer = void 0;
    }
    function hideProxyToast(acknowledged) {
      warningVisible = false;
      warningAcknowledged = acknowledged;
      warningObservationCount = 0;
      nextWarningObservationAt = 0;
      warningExpiresAt = 0;
      clearRecheckTimer();
      dedupedToast.dismiss(TOAST_ID);
    }
    function dismissProxyToast() {
      hideProxyToast(true);
    }
    function scheduleRecheck() {
      clearRecheckTimer();
      if ((!warningVisible && warningObservationCount === 0) || disposed)
        return;
      if (!warningVisible) {
        recheckTimer = setTimeout(
          () => void syncProxyToast(),
          Math.max(0, nextWarningObservationAt - Date.now()),
        );
        return;
      }
      const remainingMs = warningExpiresAt - Date.now();
      if (remainingMs <= 0) {
        warningVisible = false;
        warningObservationCount = 0;
        nextWarningObservationAt = 0;
        warningExpiresAt = 0;
        return;
      }
      recheckTimer = setTimeout(
        () => void syncProxyToast(),
        Math.min(PROXY_RECHECK_INTERVAL_MS, remainingMs),
      );
    }
    async function syncProxyToast() {
      const revision = ++requestRevision;
      try {
        const status = await diagnostics.getProxyStatus();
        if (disposed || revision !== requestRevision) return;
        const shouldWarn = status.shouldWarn === true;
        if (shouldWarn) {
          if (warningAcknowledged && !warningVisible) return;
          const now2 = Date.now();
          if (warningObservationCount === 0) {
            warningObservationCount = 1;
            nextWarningObservationAt = now2 + PROXY_RECHECK_INTERVAL_MS;
          } else if (now2 >= nextWarningObservationAt) {
            warningObservationCount = Math.min(
              WARNING_CONFIRMATION_COUNT,
              warningObservationCount + 1,
            );
          }
          if (
            !warningVisible &&
            warningObservationCount >= WARNING_CONFIRMATION_COUNT
          ) {
            warningVisible = true;
            warningAcknowledged = true;
            warningExpiresAt = now2 + TOAST_DURATION_MS;
            showProxyToast(dismissProxyToast);
            reportDecision("shown", status.error ?? "connection_failed");
          }
          scheduleRecheck();
        } else {
          const hadWarningEpisode =
            warningVisible ||
            warningAcknowledged ||
            warningObservationCount > 0;
          hideProxyToast(false);
          if (hadWarningEpisode) reportDecision("recovered", "route_healthy");
          else if (status.hasProxy && status.error === "connection_failed") {
            reportDecision("suppressed", "non_proxy_reachability_failure");
          }
        }
      } catch {
        if (!warningVisible && warningObservationCount > 0) {
          nextWarningObservationAt = Date.now() + PROXY_RECHECK_INTERVAL_MS;
        }
        scheduleRecheck();
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncProxyToast();
    };
    const unsubscribe = diagnostics.onProxyDetected(() => {
      void syncProxyToast();
    });
    window.addEventListener("focus", syncProxyToast);
    window.addEventListener("online", syncProxyToast);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void syncProxyToast();
    return () => {
      disposed = true;
      requestRevision += 1;
      clearRecheckTimer();
      unsubscribe();
      window.removeEventListener("focus", syncProxyToast);
      window.removeEventListener("online", syncProxyToast);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  return null;
}
function RemoteConnectorAuthorizationHost() {
  const [preparation, setPreparation] = reactExports.useState();
  const dismissed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let active2 = true;
    let receivedEvent = false;
    let previousState;
    const update2 = (result) => {
      if (!active2 || result?.connectorId !== "libtv") return;
      const newAttempt =
        result.state === "installing" && previousState !== "installing";
      previousState = result.state;
      if (newAttempt) dismissed.current = false;
      if (dismissed.current) return;
      setPreparation(result.ok && result.mcpConnected ? void 0 : result);
    };
    const subscription = homeService.customMcp.onDidChangeRemotePreparation(
      (result) => {
        receivedEvent = true;
        update2(result);
      },
    );
    void homeService.customMcp
      .getRemotePreparation()
      .then((result) => {
        if (!receivedEvent) update2(result);
      })
      .catch(() => {});
    return () => {
      active2 = false;
      subscription.dispose();
    };
  }, []);
  return preparation ? (
    <LibTvConnectorDialog
      preparation={preparation}
      onClose={() => {
        dismissed.current = true;
        setPreparation(void 0);
      }}
    />
  ) : null;
}
function InterestSelectionDialog() {
  const {
    isOpen,
    selected: selected2,
    toggle,
    complete,
  } = useInterestSelection();
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    if (isOpen) {
      trackEvent(TRACK_EVENTS.INTEREST_SELECTION_VIEW, {});
    }
  }, [isOpen]);
  const handleStart = async () => {
    if (selected2.length === 0) return;
    trackEvent(TRACK_EVENTS.INTEREST_SELECTION_COMPLETE, {
      interests: [...selected2],
    });
    await complete();
  };
  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {}}
      disablePointerDismissal={true}
    >
      <DialogContent
        className="!grid !grid-cols-1 !grid-rows-[auto] !w-[640px] !max-w-[640px] !gap-0 !p-0 elevated-surface-border rounded-xl bg-popover shadow-lg ring-0 sm:!max-w-[640px]"
        showCloseButton={false}
        data-action-ui-id="interestSelection"
      >
        <DialogTitle className="sr-only">
          {t2("interestSelection.heading")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t2("interestSelection.description")}
        </DialogDescription>
        <div className="flex flex-col">
          <div className="px-8 pt-8 pb-6">
            <HubBrandLine logoSize={28} showSubtitle={false} />
          </div>
          <div className="flex flex-col gap-5 px-8 pb-7">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-base font-medium text-foreground">
                {t2("interestSelection.heading")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t2("interestSelection.description")}
              </p>
            </div>
            <InterestOptionGrid value={selected2} onToggle={toggle} />
          </div>
          <div className="flex items-center justify-between gap-4 px-8 pt-2 pb-7">
            <div className="text-sm text-muted-foreground">
              {t2("interestSelection.counter", {
                count: selected2.length,
                max: MAX_INTERESTS,
              })}
            </div>
            <Button
              variant="default"
              size="lg"
              className="h-10 px-5 text-sm font-medium"
              onClick={handleStart}
              disabled={selected2.length === 0}
              data-action-ui-id="interestSelection.cta"
            >
              {t2("interestSelection.cta")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function ProjectArchiveMenuProvider({ children: children2 }) {
  const { runExport, runImport } = useProjectArchiveActions();
  const routerSearch = useRouterState({
    select: (s2) => s2.location.search,
  });
  const currentWorkspaceId = routerSearch?.workspaceId;
  const workspaceIdRef = reactExports.useRef(currentWorkspaceId);
  workspaceIdRef.current = currentWorkspaceId;
  reactExports.useEffect(() => {
    const ipc = window.hilo?.ipcRenderer;
    if (!ipc) return;
    const offExport = ipc.on(IPC_CHANNELS.MENU_EXPORT_PROJECT, () => {
      void (async () => {
        const workspaceId2 = workspaceIdRef.current;
        if (!workspaceId2) {
          await runExport(void 0);
          return;
        }
        const hiloApp2 = instantiationService.invokeFunction((accessor) =>
          accessor.get(IHiloApp),
        );
        const runtime = await hiloApp2.getWorkspaceRuntime(workspaceId2);
        await runExport(runtime?.folderPath);
      })();
    });
    const offImport = ipc.on(IPC_CHANNELS.MENU_IMPORT_PROJECT, () => {
      runImport();
    });
    return () => {
      offExport();
      offImport();
    };
  }, [runExport, runImport]);
  return <>{children2}</>;
}
const UpdaterRoot = () => {
  const { state: state2 } = useUpdaterContext();
  return (
    <UpdaterErrorBoundary forcedMode={state2.forced}>
      <UpdaterRouterInner />
    </UpdaterErrorBoundary>
  );
};
function ServerDrivenPopupOrchestrator() {
  const { user } = useAuth();
  const popupQuery = usePopup();
  const { data: rawPopup } = popupQuery;
  const updater = useOptionalUpdaterContext();
  const forcedUpdate = updater?.state.forced ?? false;
  const userID = user?.userID;
  const { popup, ready: announcementReady } = useAutoAnnouncement(
    rawPopup,
    userID,
  );
  const [closedFor, setClosedFor] = reactExports.useState(null);
  const onClose = reactExports.useCallback(() => {
    if (
      userID &&
      popup &&
      popup.popup_type !== PopupType.POPUP_TYPE_NONE &&
      popup.id
    ) {
      setClosedFor({
        userID,
        popupId: popup.id,
      });
    }
  }, [popup, userID]);
  const seenUserId = userID;
  const seenPopupId =
    popup && popup.popup_type !== PopupType.POPUP_TYPE_NONE ? popup.id : null;
  reactExports.useEffect(() => {
    if (!seenUserId || !seenPopupId) return;
    touchSeen(seenUserId, seenPopupId);
  }, [seenUserId, seenPopupId]);
  const autoShowBlocked =
    popup?.popup_type === PopupType.POPUP_TYPE_FEATURE &&
    (popup.auto_show === false || popup.trial_active === false);
  const candidatePopupId =
    popup && popup.popup_type !== PopupType.POPUP_TYPE_NONE && !autoShowBlocked
      ? popup.id
      : null;
  const muteRangeMs =
    popup?.popup_type === PopupType.POPUP_TYPE_FEATURE
      ? 0
      : (popup?.mute_range_time ?? 0);
  const trackType = popup ? trackTypeOf(popup.popup_type) : null;
  const trackUrl = popup?.action?.url ?? "";
  const trackHasCover = Boolean(popup?.cover_url);
  const trackCanClose = popup?.can_close ?? false;
  const [activation, setActivation] = reactExports.useState(null);
  const [muteVerdict, setMuteVerdict] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!userID || !candidatePopupId) {
      if (muteVerdict) setMuteVerdict(null);
      return;
    }
    if (
      muteVerdict?.userID === userID &&
      muteVerdict.popupId === candidatePopupId
    )
      return;
    if (
      activation?.userID === userID &&
      activation.popupId === candidatePopupId
    )
      return;
    const mutedUntil = readMutedUntil(userID, candidatePopupId);
    if (mutedUntil !== null) {
      serverPopupLog.info("skip: muted", {
        popupId: candidatePopupId,
        userID,
        mutedUntil,
      });
    }
    setMuteVerdict({
      userID,
      popupId: candidatePopupId,
      muted: mutedUntil !== null,
    });
  }, [userID, candidatePopupId, muteVerdict, activation]);
  const verdictClear =
    !!muteVerdict &&
    muteVerdict.userID === userID &&
    muteVerdict.popupId === candidatePopupId &&
    !muteVerdict.muted;
  const activationMatches =
    !!activation &&
    !!userID &&
    activation.userID === userID &&
    activation.popupId === candidatePopupId;
  const closedByUser =
    !!closedFor &&
    !!userID &&
    closedFor.userID === userID &&
    closedFor.popupId === candidatePopupId;
  const wantsSlot =
    !forcedUpdate &&
    !!userID &&
    !!candidatePopupId &&
    !closedByUser &&
    (verdictClear || activationMatches);
  const waitingForAnnouncement =
    !forcedUpdate &&
    !!userID &&
    ((popupQuery.isPending && !popupQuery.isError) ||
      !announcementReady ||
      (!!candidatePopupId &&
        !activationMatches &&
        (muteVerdict?.userID !== userID ||
          muteVerdict.popupId !== candidatePopupId)));
  const granted = useModalSlotWithLoading(STARTUP_MODAL_IDS.serverDrivenPopup, {
    candidate: wantsSlot,
    loading: waitingForAnnouncement,
  });
  reactExports.useEffect(() => {
    if (!candidatePopupId || forcedUpdate) {
      if (activation) setActivation(null);
      if (!candidatePopupId) return;
      serverPopupLog.info("skip: forced-update", {
        popupId: candidatePopupId,
        userID: userID ?? null,
      });
      return;
    }
    if (!userID) return;
    if (
      activation?.userID === userID &&
      activation.popupId === candidatePopupId
    )
      return;
    if (!granted) return;
    if (!verdictClear) return;
    const writeMutedUntil =
      muteRangeMs === 0 ? MUTE_FOREVER : Date.now() + muteRangeMs;
    setMutedUntil(userID, candidatePopupId, writeMutedUntil);
    setActivation({
      userID,
      popupId: candidatePopupId,
    });
    serverPopupLog.info("activated", {
      popupId: candidatePopupId,
      userID,
      popupType: trackType,
      muteRangeMs,
      mutedUntil: writeMutedUntil,
    });
    if (trackType) {
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_VIEW, {
        popup_type: trackType,
        url: trackUrl,
        has_cover: trackHasCover,
        can_close: trackCanClose,
      });
    }
  }, [
    forcedUpdate,
    userID,
    candidatePopupId,
    muteRangeMs,
    activation,
    granted,
    verdictClear,
    trackType,
    trackUrl,
    trackHasCover,
    trackCanClose,
  ]);
  const shouldRender =
    !forcedUpdate && granted && activationMatches && !closedByUser;
  useBlockingModalPresence(BLOCKING_MODAL_IDS.serverDrivenPopup, shouldRender);
  const wasShownRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (shouldRender) {
      wasShownRef.current = true;
      return;
    }
    if (!wasShownRef.current || !activation) return;
    wasShownRef.current = false;
    const closedByUser2 =
      closedFor?.userID === activation.userID &&
      closedFor?.popupId === activation.popupId;
    if (closedByUser2) {
      serverPopupLog.info("closed by user", {
        popupId: activation.popupId,
        userID: activation.userID,
      });
      return;
    }
    const sameCandidate =
      activation.userID === userID && activation.popupId === candidatePopupId;
    if (forcedUpdate || !sameCandidate) {
      serverPopupLog.info("dismissed", {
        reason: forcedUpdate ? "forced-update" : "candidate-changed",
        prevPopupId: activation.popupId,
        prevUserID: activation.userID,
        currentUserID: userID ?? null,
        candidatePopupId,
      });
      return;
    }
    serverPopupLog.warn("activation dropped", {
      popupId: activation.popupId,
      userID: activation.userID,
    });
  }, [
    shouldRender,
    activation,
    closedFor,
    userID,
    candidatePopupId,
    forcedUpdate,
  ]);
  if (!shouldRender || !popup) return null;
  switch (popup.popup_type) {
    case PopupType.POPUP_TYPE_GENERAL:
      return <GeneralPopup popup={popup} onClose={onClose} />;
    case PopupType.POPUP_TYPE_MIGRATION:
      return <MigrationPopup popup={popup} onClose={onClose} />;
    case PopupType.POPUP_TYPE_FEATURE:
      return <FeaturePopup popup={popup} onClose={onClose} />;
    default:
      return null;
  }
}
function WatermarkOnboarding() {
  const [config2, , , isHydrated] = useStorage("global.config");
  const { set: set2 } = useSettings();
  const [pendingRemove, setPendingRemove] = reactExports.useState(false);
  const isDomestic = getRuntimeConfig().region === "domestic";
  const candidate =
    isHydrated && !!config2 && config2.watermarkOnboardingShown !== true;
  const granted = useModalSlot(STARTUP_MODAL_IDS.watermarkOnboarding, {
    candidate,
  });
  const open = granted && candidate;
  const wasOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPendingRemove(config2?.watermarkEnabled === false);
    }
    wasOpenRef.current = open;
  }, [open, config2]);
  useBlockingModalPresence(BLOCKING_MODAL_IDS.watermarkOnboarding, open);
  const handleSave = async () => {
    await set2("watermarkEnabled", !pendingRemove);
    await set2("watermarkOnboardingShown", true);
  };
  const handleOpenChange = (next2, eventDetails) => {
    if (!next2) eventDetails.cancel();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      disablePointerDismissal={true}
    >
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-4"
        data-action-ui-id="watermark-onboarding.dialog"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>
            {isDomestic ? "AI 生成水印设置" : "AI Generated Watermark Settings"}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 text-xs/relaxed text-foreground space-y-3 pr-1">
          {isDomestic ? (
            <>
              <p>
                一、根据法律法规，AI 生成内容用于网络公开传播时，必须添加"AI
                生成"显式水印。
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2 text-muted-foreground">
                <li>
                  本平台所有生成内容
                  <strong className="font-bold text-foreground">
                    默认带有"AI 生成"水印
                  </strong>
                  ，满足公开传播的标识合规要求。
                </li>
                <li>
                  若您仅用于本地学习、收藏、内部研究等
                  <strong className="font-bold text-foreground">
                    非公开场景时
                  </strong>
                  ，
                  <strong className="font-bold text-foreground">
                    您可选择关闭水印
                  </strong>
                  ；
                </li>
                <li>
                  您知悉并承诺：若将无水印内容用于
                  <strong className="font-bold text-foreground">
                    任何网络公开传播场景
                  </strong>
                  ， 您必须
                  <strong className="font-bold text-foreground">
                    主动声明"AI 生成"
                  </strong>
                  ，
                  <strong className="font-bold text-foreground">
                    并使用传播平台提供的标识功能进行标识
                  </strong>
                  。
                </li>
              </ol>
              <p>
                二、您无论本地使用还是公开传播生成内容，均须严格遵守国家法律法规和公序良俗，禁止侵犯他人知识产权、肖像权、名誉权、隐私权等合法权益，不得利用本服务从事各类违法犯罪活动。
              </p>
              <p>
                三、您如将生成内容用于违法违规用途，或因未履行 AI
                标识义务，因此所发生的后果和责任均由您自行承担。
              </p>
            </>
          ) : (
            <>
              <p>
                All content generated by this platform{" "}
                <strong className="font-bold text-foreground">
                  includes an “AI Generated” watermark by default
                </strong>
                .
              </p>
              <p>
                If you only use the generated content for personal, non-public
                purposes, you may choose to remove the watermark.
              </p>
              <p>
                If you share AI-generated content publicly without the
                watermark, you acknowledge responsibility for clearly disclosing
                that it was AI-generated.
              </p>
            </>
          )}
        </div>
        <div className="border-t border-border pt-4 flex items-start gap-3">
          <Switch
            checked={pendingRemove}
            onCheckedChange={setPendingRemove}
            className="mt-0.5"
            data-action-ui-id="watermark-onboarding.switch"
          />
          <div className="flex-1 text-xs">
            <div className="font-medium text-foreground">
              {isDomestic ? "去除水印" : "Remove Watermark"}
            </div>
            <p className="mt-1 text-muted-foreground">
              {isDomestic ? (
                <>
                  打开开关并点击保存设置，代表您已确认充分了解上述情况并同意。
                  <br />
                  后续可以在 设置 → 通用 → 去除水印 中修改水印设置。
                </>
              ) : (
                <>
                  Toggle this switch and click save to confirm you understand
                  the above.
                  <br />
                  You can change this later in Settings → General → Remove
                  Watermark.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => void handleSave()}
            data-action-ui-id="watermark-onboarding.save"
          >
            {isDomestic ? "保存设置" : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function WindowCloseDialog() {
  const platform2 = usePlatform();
  const [request, setRequest] = reactExports.useState(null);
  const serviceRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!isElectron() || platform2.app.os !== "win32") return;
    let disposed = false;
    let eventReceived = false;
    let subscription;
    let connectedService;
    void (() => Promise.resolve().then(() => instantiation))()
      .then(async ({ services: services2 }) => {
        if (disposed) return;
        const service2 = services2.get(IWindowMainService);
        connectedService = service2;
        serviceRef.current = service2;
        subscription = service2.onDidChangeWindowCloseConfirmation(
          (pending22) => {
            eventReceived = true;
            if (!disposed) setRequest(pending22);
          },
        );
        await service2.setWindowCloseConfirmationReady(true);
        if (disposed) return;
        const pending2 = await service2.getPendingWindowCloseConfirmation();
        if (!disposed && !eventReceived) setRequest(pending2);
      })
      .catch((error) =>
        actionTrailLog.error("window-close subscription failed", {
          error,
        }),
      );
    return () => {
      disposed = true;
      subscription?.dispose();
      void connectedService
        ?.setWindowCloseConfirmationReady(false)
        .catch((error) =>
          actionTrailLog.error("window-close unregister failed", {
            error,
          }),
        );
      serviceRef.current = null;
    };
  }, [platform2.app.os]);
  const requestId = request?.id;
  reactExports.useEffect(() => {
    if (requestId === void 0) return;
    void serviceRef.current
      ?.acknowledgeWindowCloseConfirmation(requestId)
      .catch((error) =>
        actionTrailLog.error("window-close acknowledge failed", {
          error,
        }),
      );
  }, [requestId]);
  if (!request) return null;
  return (
    <WindowCloseDialogContent
      key={request.id}
      onChoose={async (choice) => {
        if (!serviceRef.current) throw new Error("Window service unavailable");
        await serviceRef.current.respondWindowCloseConfirmation(
          request.id,
          choice,
        );
        setRequest((current2) =>
          current2?.id === request.id ? null : current2,
        );
      }}
    />
  );
}
function CanvasRenderRuntimeProvider({
  services: services2,
  children: children2,
}) {
  const platform2 = usePlatform();
  const runtimeConfig = useRuntimeConfig();
  const { arch, os: os2, runningUnderARM64Translation } = platform2.app;
  const translationState = runningUnderARM64Translation ?? "unknown";
  const { canvasContentVisibilityOverride, canvasResumeRecoveryEnabled } =
    runtimeConfig;
  const policy = reactExports.useMemo(
    () =>
      resolveDesktopCanvasRenderPolicy(
        {
          arch,
          os: os2,
          runningUnderARM64Translation,
        },
        {
          canvasContentVisibilityOverride,
          canvasResumeRecoveryEnabled,
        },
      ),
    [
      arch,
      os2,
      runningUnderARM64Translation,
      canvasContentVisibilityOverride,
      canvasResumeRecoveryEnabled,
    ],
  );
  const runtimeServices = reactExports.useMemo(
    () => services2 ?? resolveRuntimeServices(policy.recoverAfterResume),
    [policy.recoverAfterResume, services2],
  );
  const { logService: logService2, powerStateService } = runtimeServices;
  const [resumeEpoch, setResumeEpoch] = reactExports.useState(0);
  const didTrackPolicyRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const profile = {
      profile: policy.reason,
      content_visibility: policy.contentVisibility,
      resume_recovery_enabled: policy.recoverAfterResume,
      recovery_frame_budget_ms: policy.recoveryFrameBudgetMs,
      recovery_max_per_frame: policy.recoveryMaxPerFrame,
      os: os2,
      arch,
      running_under_arm64_translation: translationState,
    };
    safeInfo(
      logService2,
      `[canvas-render] policy_applied ${JSON.stringify(profile)}`,
    );
    if (!didTrackPolicyRef.current) {
      didTrackPolicyRef.current = true;
      safeTrack(
        runtimeServices,
        TRACK_EVENTS.CANVAS_RENDER_POLICY_APPLIED,
        profile,
      );
    }
  }, [arch, logService2, os2, policy, runtimeServices, translationState]);
  reactExports.useEffect(() => {
    if (!policy.recoverAfterResume) return;
    if (!powerStateService) {
      safeWarn(logService2, "[canvas-render] power_bridge_unavailable");
      return;
    }
    let subscription;
    try {
      subscription = powerStateService.onDidResume((event) => {
        setResumeEpoch((current2) => Math.max(current2, event.resumeEpoch));
      });
    } catch (error) {
      safeWarn(
        logService2,
        `[canvas-render] power_bridge_subscribe_failed ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    try {
      Promise.resolve(powerStateService.getSnapshot())
        .then((snapshot2) => {
          setResumeEpoch((current2) =>
            Math.max(current2, snapshot2.resumeEpoch),
          );
        })
        .catch((error) => {
          safeWarn(
            logService2,
            `[canvas-render] power_snapshot_failed ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    } catch (error) {
      safeWarn(
        logService2,
        `[canvas-render] power_snapshot_failed ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return () => {
      try {
        subscription?.dispose();
      } catch {}
    };
  }, [logService2, policy.recoverAfterResume, powerStateService]);
  const handleRecovery = reactExports.useCallback(
    (result) => {
      const detail = {
        ...result,
        profile: policy.reason,
        content_visibility: policy.contentVisibility,
        os: os2,
        arch,
        running_under_arm64_translation: translationState,
      };
      safeInfo(
        logService2,
        `[canvas-render] recovery_completed ${JSON.stringify(detail)}`,
      );
      const recoveryProperties = {
        profile: policy.reason,
        content_visibility: policy.contentVisibility,
        os: os2,
        arch,
        running_under_arm64_translation: translationState,
        resume_epoch: result.resumeEpoch,
        recovery_trigger: result.trigger,
        scheduled_count: result.scheduledCount,
        recovered_count: result.recoveredCount,
        skipped_count: result.skippedCount,
        error_count: result.errorCount,
        frame_count: result.frameCount,
        max_frame_work_ms: result.maxFrameWorkMs,
        duration_ms: result.durationMs,
        scheduled_bitmap_canvas_count: result.scheduledByType.bitmapCanvas,
        scheduled_video_count: result.scheduledByType.video,
        recovered_bitmap_canvas_count: result.recoveredByType.bitmapCanvas,
        recovered_video_count: result.recoveredByType.video,
      };
      safeTrack(
        runtimeServices,
        TRACK_EVENTS.CANVAS_SURFACE_RECOVERY,
        recoveryProperties,
      );
      if (
        typeof performance === "undefined" ||
        typeof performance.measure !== "function"
      )
        return;
      try {
        performance.measure(CANVAS_SURFACE_RECOVERY_MEASURE, {
          start: Math.max(0, performance.now() - result.durationMs),
          duration: result.durationMs,
          detail,
        });
      } catch {}
    },
    [
      arch,
      logService2,
      os2,
      policy.contentVisibility,
      policy.reason,
      runtimeServices,
      translationState,
    ],
  );
  return (
    <CanvasRenderPolicyProvider
      policy={policy}
      resumeEpoch={resumeEpoch}
      onRecovery={handleRecovery}
    >
      {children2}
    </CanvasRenderPolicyProvider>
  );
}
function ImBridgeDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const regionSuffix =
    getRuntimeConfig().region === "overseas" ? "overseas" : "domestic";
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
      <DialogPortal>
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
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className={`size-11 ${dialogChromeButtonClassName}`}
                onClick={headerConfig.onBack}
                data-action-ui-id="im-bridge-dialog.back"
              >
                <ChevronLeftIcon className="size-6" strokeWidth={1.5} />
                <span className="sr-only">{t2("common.back")}</span>
              </Button>
            )}
            <DialogTitle$2 className="min-w-0 flex-1 truncate pr-14 font-heading font-medium text-base text-foreground">
              {title}
            </DialogTitle$2>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={`absolute top-1 right-1 size-11 ${dialogChromeButtonClassName}`}
                  data-action-ui-id="im-bridge-dialog.close"
                />
              }
            >
              <XIcon className="size-6" strokeWidth={1.75} />
              <span className="sr-only">{t2("common.close")}</span>
            </DialogClose>
          </div>
          <DialogDescription$2 className="sr-only">{title}</DialogDescription$2>
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!">
            <div className="flex min-h-full px-6 pt-5 pb-6 [&>*]:min-h-full [&>*]:flex-1">
              <ImBridgeManager onDialogHeaderChange={handleHeaderChange} />
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
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
  return (
    <QueryClientProvider client={queryClient}>{children2}</QueryClientProvider>
  );
}
function StorageEffect() {
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  reactExports.useEffect(() => {
    try {
      if (!isElectron()) return;
      const subscription =
        getDesktopSettingsMainService().onDidChangeCustomModel(() => {
          void queryClient2.invalidateQueries({
            queryKey: ACTIVE_CUSTOM_MODEL_QUERY_KEY,
          });
        });
      return () => subscription.dispose();
    } catch {
      console.warn(
        "[StorageEffect] Model configuration updates are unavailable",
      );
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
      setDiagnostic(
        getLoggedErrorBoundaryDiagnostic(err) ?? logErrorBoundary(err),
      );
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
  return jsxRuntimeExports.jsx(m, {
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
