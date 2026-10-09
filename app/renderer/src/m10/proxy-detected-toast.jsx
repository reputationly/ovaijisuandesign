// proxy-detected-toast.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, ShieldAlert, X$7, XIcon, Link2, Film, Music, GraduationCap } from "../vendor.js";
import { DialogClose } from "../m15/agent-ws-client.jsx";
import { Icon } from "../m15/graph.jsx";
import { TOAST_DURATION_MS, TOAST_ID, PROXY_RECHECK_INTERVAL_MS, WARNING_CONFIRMATION_COUNT, OFFICIAL_CONNECTORS } from "../m15/interest-selection-provider.jsx";
import { Sparkles, Clapperboard, ShoppingBag, Megaphone, Brush } from "../m15/parse-item.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn$2,
  dialogChromeButtonClassName,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { reportRumAction } from "../m07/en.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { HubLogo, HubWordmark } from "./hub-logo.jsx";
import { CDN_CONNECTOR_HUB } from "./new-workspace-dialog.jsx";
function ProxyToastContent({ onDismiss }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="elevated-surface-border-width flex items-start gap-3 w-full rounded-lg border-yellow-500/30 bg-popover p-4 text-popover-foreground shadow-lg">
      <ShieldAlert className="size-5 text-yellow-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{t2("proxy.toastTitle", "Proxy / VPN detected")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t2(
            "proxy.toastDescription",
            "A system proxy or VPN is active. This may cause connection issues. For best experience, add MiniMax Design to your proxy bypass list or disable the proxy while using MiniMax Design.",
          )}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
      >
        <X$7 className="size-4" />
      </button>
    </div>
  );
}
function showProxyToast(onDismiss) {
  dedupedToast.custom(() => <ProxyToastContent onDismiss={onDismiss} />, {
    duration: TOAST_DURATION_MS,
    id: TOAST_ID,
  });
}
export function ProxyDetectedToast() {
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
      if ((!warningVisible && warningObservationCount === 0) || disposed) return;
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
          if (!warningVisible && warningObservationCount >= WARNING_CONFIRMATION_COUNT) {
            warningVisible = true;
            warningAcknowledged = true;
            warningExpiresAt = now2 + TOAST_DURATION_MS;
            showProxyToast(dismissProxyToast);
            reportDecision("shown", status.error ?? "connection_failed");
          }
          scheduleRecheck();
        } else {
          const hadWarningEpisode =
            warningVisible || warningAcknowledged || warningObservationCount > 0;
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
export function ConnectorDialogFrame({
  open,
  onOpenChange,
  actionUiId,
  closeLabel,
  children: children2,
  size: size2 = "md",
  className,
  stableHeight = false,
  showCloseButton = true,
  closeActionUiId,
}) {
  const dialogRef = reactExports.useRef(null);
  const previousStableHeightRef = reactExports.useRef(stableHeight);
  reactExports.useLayoutEffect(() => {
    const wasStableHeight = previousStableHeightRef.current;
    previousStableHeightRef.current = stableHeight;
    if (!open || !wasStableHeight || stableHeight) return;
    const dialog = dialogRef.current;
    if (!dialog || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const content2 = dialog.querySelector('[data-layout-slot="connector-dialog-view"]');
    const currentHeight = Math.min(window.innerHeight - 32, 700);
    dialog.style.transition = "none";
    dialog.style.height = `${currentHeight}px`;
    dialog.getBoundingClientRect();
    dialog.style.transition = "";
    if (content2) {
      content2.style.opacity = "0.94";
      content2.style.transform = "translateX(0.25rem)";
    }
    let settleTimer = 0;
    let cleanupTimer = 0;
    let animationFrame = 0;
    let contentAnimation;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      observer2.disconnect();
      window.clearTimeout(settleTimer);
      window.clearTimeout(cleanupTimer);
      dialog.style.height = "";
      if (content2) {
        content2.style.opacity = "";
        content2.style.transform = "";
      }
      contentAnimation?.cancel();
    };
    const handleTransitionEnd = (event) => {
      if (event.target === dialog && event.propertyName === "height") finish();
    };
    const beginAnimation = () => {
      const startHeight = dialog.getBoundingClientRect().height;
      dialog.style.transition = "none";
      dialog.style.height = "";
      const targetHeight = dialog.getBoundingClientRect().height;
      dialog.style.height = `${startHeight}px`;
      dialog.getBoundingClientRect();
      dialog.style.transition = "";
      if (targetHeight <= 0) {
        finish();
        return;
      }
      observer2.disconnect();
      animationFrame = window.requestAnimationFrame(() => {
        if (Math.abs(startHeight - targetHeight) >= 1) dialog.style.height = `${targetHeight}px`;
        if (content2?.animate) {
          contentAnimation = content2.animate(
            [
              {
                opacity: 0.94,
                transform: "translateX(0.25rem)",
              },
              {
                opacity: 1,
                transform: "translateX(0)",
              },
            ],
            {
              duration: 200,
              easing: "cubic-bezier(0, 0, 0.2, 1)",
              fill: "forwards",
            },
          );
        }
        cleanupTimer = window.setTimeout(finish, 240);
      });
    };
    const scheduleAnimation = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(beginAnimation, 80);
    };
    const observer2 = new MutationObserver(scheduleAnimation);
    dialog.addEventListener("transitionend", handleTransitionEnd);
    observer2.observe(dialog, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    scheduleAnimation();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(cleanupTimer);
      observer2.disconnect();
      dialog.removeEventListener("transitionend", handleTransitionEnd);
      dialog.style.transition = "";
      dialog.style.height = "";
      if (content2) {
        content2.style.opacity = "";
        content2.style.transform = "";
      }
      contentAnimation?.cancel();
    };
  }, [open, stableHeight]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        size={size2}
        showCloseButton={false}
        className={cn$2(
          "flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 motion-safe:transition-[height] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none [&_[data-slot=dialog-close]]:size-8! [&_[data-slot=dialog-close]_svg]:size-[18px]!",
          stableHeight ? "h-[calc(100vh-2rem)] max-h-[700px]" : "h-auto",
          className,
        )}
        data-action-ui-id={actionUiId}
        data-layout-slot="connector-dialog-frame"
      >
        {children2}
        {showCloseButton ? (
          <DialogClose
            render={
              <Button$1
                variant="ghost"
                className={`no-drag absolute top-2 right-2 size-8 ${dialogChromeButtonClassName}`}
                data-action-ui-id={closeActionUiId}
              />
            }
          >
            <XIcon className="size-[18px]" strokeWidth={1.75} />
            <span className="sr-only">{closeLabel}</span>
          </DialogClose>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
const FRAME_CLASS = {
  inline: "size-4 rounded-sm bg-transparent",
  list: "size-6 rounded-sm bg-muted/40",
  card: "size-10 rounded-lg bg-muted",
  detail: "size-12 rounded-lg bg-muted p-0.5",
};
const IMAGE_CLASS = {
  inline: "size-full rounded-sm",
  list: "size-5 rounded-sm",
  card: "size-8 rounded-sm",
  detail: "size-full rounded-sm",
};
const FALLBACK_SIZE = {
  inline: 12,
  list: 14,
  card: 20,
  detail: 24,
};
export function ConnectorIcon({ iconUrl, size: size2 = "list", className, fallback }) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  const showImage = Boolean(iconUrl && failedUrl !== iconUrl);
  return (
    <span
      data-slot="connector-icon"
      data-connector-icon-size={size2}
      className={cn$2(
        "inline-flex shrink-0 items-center justify-center overflow-hidden text-muted-foreground",
        FRAME_CLASS[size2],
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          key={iconUrl}
          src={iconUrl ?? void 0}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn$2("object-contain", IMAGE_CLASS[size2])}
          onError={() => setFailedUrl(iconUrl ?? null)}
        />
      ) : (
        (fallback ?? <Link2 size={FALLBACK_SIZE[size2]} strokeWidth={1.5} />)
      )}
    </span>
  );
}
export function ConnectorRelationshipGraphic({ targetIconUrl, className }) {
  return (
    <div
      className={cn$2("flex shrink-0 items-center gap-1.5", className)}
      aria-hidden="true"
      data-layout-slot="connector-relationship"
    >
      <span className="contents" data-layout-slot="connector-source-icon">
        <ConnectorIcon iconUrl={CDN_CONNECTOR_HUB} size="detail" />
      </span>
      <span className="flex shrink-0 items-center gap-1" data-layout-slot="connector-link-dots">
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
      </span>
      <span
        className="mx-1 flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        data-layout-slot="connector-link-icon"
      >
        <Icon icon={Link2} size="sm" strokeWidth={1.7} aria-hidden={true} />
      </span>
      <span className="flex shrink-0 items-center gap-1" data-layout-slot="connector-link-dots">
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      </span>
      <span className="contents" data-layout-slot="connector-target-icon">
        <ConnectorIcon iconUrl={targetIconUrl} size="detail" />
      </span>
    </div>
  );
}
function LibTvConnectorDialog({
  onClose,
  onPrepared,
  embedded = false,
  onBusyChange,
  preparation,
}) {
  const { t: t2 } = useTranslation();
  const [localPending, setPending] = reactExports.useState(false);
  const [retryStarted, setRetryStarted] = reactExports.useState(false);
  const pending2 = localPending || preparation?.state === "installing";
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const dismissed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleClose = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onBusyChange?.(false);
    onClose();
  };
  const handleAuthorize = async () => {
    if (busy.current || pending2 || dismissed.current) return;
    setRetryStarted(true);
    busy.current = true;
    setPending(true);
    setError(void 0);
    try {
      const result = await homeService.customMcp.prepareRemoteConnector({
        connectorId: "libtv",
        action: "authorize",
      });
      if (!mounted.current || dismissed.current) return;
      onPrepared?.();
      if (result.ok && result.mcpConnected) handleClose();
      else setError(t2(preparationErrorKey(result.code)));
    } catch {
      if (mounted.current && !dismissed.current) setError(t2("connectors.libtv.failed"));
    } finally {
      busy.current = false;
      if (mounted.current && !dismissed.current) {
        setPending(false);
        onBusyChange?.(false);
      }
    }
  };
  const visibleError =
    error ??
    (!retryStarted && preparation && preparation.state !== "installing" && !preparation.ok
      ? t2(preparationErrorKey(preparation.code))
      : void 0);
  const content2 = (
    <div className="flex min-h-0 flex-1 flex-col p-6" data-action-ui-id="connectors-libtv-setup">
      <ConnectorRelationshipGraphic
        targetIconUrl={OFFICIAL_CONNECTORS.libtv.iconUrl}
        className="mb-4 justify-center"
      />
      <DialogHeader className="items-center text-center">
        <DialogTitle>{t2("connectors.libtv.title")}</DialogTitle>
        <DialogDescription>{t2("connectors.libtv.description")}</DialogDescription>
      </DialogHeader>
      <p className="my-5 text-sm text-muted-foreground" role="status">
        {t2(pending2 ? "connectors.libtv.waiting" : "connectors.libtv.hint")}
      </p>
      {visibleError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {visibleError}
        </p>
      ) : null}
      <DialogFooter>
        <Button$1
          variant="outline"
          className="h-9 min-w-22 rounded-lg px-4"
          onClick={handleClose}
          data-action-ui-id="connectors-libtv-dismiss"
        >
          {t2("connectors.libtv.dismiss")}
        </Button$1>
        <Button$1
          className="h-9 min-w-26 rounded-lg px-4"
          onClick={() => void handleAuthorize()}
          disabled={pending2}
          loading={pending2}
          data-action-ui-id="connectors-libtv-authorize"
        >
          {t2("connectors.libtv.authorize")}
        </Button$1>
      </DialogFooter>
    </div>
  );
  return embedded ? (
    content2
  ) : (
    <ConnectorDialogFrame
      open={true}
      onOpenChange={(open) => !open && handleClose()}
      actionUiId="connectors-libtv-dialog"
      closeLabel={t2("common.close")}
      closeActionUiId="connectors-libtv-close"
    >
      {content2}
    </ConnectorDialogFrame>
  );
}
function preparationErrorKey(code2) {
  return code2 === "runtime_unavailable"
    ? "connectors.libtv.runtimeRequired"
    : code2 === "busy"
      ? "connectors.libtv.busy"
      : code2 === "server_exists"
        ? "connectors.libtv.conflict"
        : "connectors.libtv.failed";
}
export function RemoteConnectorAuthorizationHost() {
  const [preparation, setPreparation] = reactExports.useState();
  const dismissed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let active2 = true;
    let receivedEvent = false;
    let previousState;
    const update2 = (result) => {
      if (!active2 || result?.connectorId !== "libtv") return;
      const newAttempt = result.state === "installing" && previousState !== "installing";
      previousState = result.state;
      if (newAttempt) dismissed.current = false;
      if (dismissed.current) return;
      setPreparation(result.ok && result.mcpConnected ? void 0 : result);
    };
    const subscription = homeService.customMcp.onDidChangeRemotePreparation((result) => {
      receivedEvent = true;
      update2(result);
    });
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
export function HubBrandLine({ logoSize = 28, showSubtitle = true, className }) {
  const { t: t2 } = useTranslation();
  return (
    <div className={cn$2("flex items-center gap-3", className)}>
      <HubLogo size={logoSize} className="shrink-0" />
      <h1 className="flex items-center gap-2 font-heading text-xl font-medium leading-none text-foreground">
        <HubWordmark width={158} height={24} />
        {showSubtitle && (
          <>
            <span aria-hidden={true} className="text-foreground/40">
              —
            </span>
            <span className="whitespace-nowrap text-foreground/85">{t2("home.heroSubtitle")}</span>
          </>
        )}
      </h1>
    </div>
  );
}
export const INTEREST_OPTIONS = [
  {
    key: "shortDrama",
    icon: Film,
  },
  {
    key: "filmEdit",
    icon: Clapperboard,
  },
  {
    key: "ecommerce",
    icon: ShoppingBag,
  },
  {
    key: "adsMarketing",
    icon: Megaphone,
  },
  {
    key: "mvMusic",
    icon: Music,
  },
  {
    key: "animation",
    icon: Brush,
  },
  {
    key: "knowledge",
    icon: GraduationCap,
  },
  {
    key: "other",
    icon: Sparkles,
  },
];
