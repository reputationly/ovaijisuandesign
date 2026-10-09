// use-feishu-qr-login.jsx
import { jsxRuntimeExports, reactExports, InfoIcon$1 } from "../vendor.js";
import { Popover, PopoverTrigger } from "../m15/apply-asset-change.jsx";
import { services, Tooltip, TooltipTrigger, MoreVerticalIcon } from "../m15/graph.jsx";
import {
  Button$1,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PlaybackPlayIcon, IImBridgeMainService } from "../m08/browser-inspiration-urls.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const integrationActionGroupClassName = "flex w-52 shrink-0 items-center justify-end gap-1.5";
const integrationStatusPillToneClass = {
  muted: "bg-secondary text-muted-foreground",
  neutral: "bg-secondary text-foreground/70",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};
const integrationStatusMarkerOuterClass = {
  muted: "bg-muted-foreground/15",
  success: "bg-success/15",
  warning: "bg-warning/15",
  destructive: "bg-destructive/15",
};
const integrationStatusMarkerInnerClass = {
  muted: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};
export function IntegrationCard({ className, ...props }) {
  return (
    <li
      className={cn$2(
        "flex min-h-[108px] items-center gap-4 rounded-[14px] bg-[var(--im-bridge-channel-card-bg)] px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}
export function IntegrationIconFrame({ className, ...props }) {
  return (
    <span
      className={cn$2(
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1",
        className,
      )}
      {...props}
    />
  );
}
function IntegrationStatusMarker({ tone, active: active2 = false, icon, label }) {
  if (icon) {
    return (
      <span
        role="status"
        className="flex size-2.5 shrink-0 items-center justify-center"
        title={label}
        aria-label={label}
      >
        {icon}
      </span>
    );
  }
  if (!active2) {
    return (
      <span
        role="status"
        className={cn$2("size-1.5 shrink-0 rounded-full", integrationStatusMarkerInnerClass[tone])}
        title={label}
        aria-label={label}
      />
    );
  }
  return (
    <span
      role="status"
      className={cn$2(
        "relative isolate flex size-2.5 shrink-0 items-center justify-center rounded-full",
        integrationStatusMarkerOuterClass[tone],
      )}
      title={label}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="absolute -inset-px -z-10 rounded-full border border-warning/10 bg-warning/[0.02] motion-safe:animate-[im-status-radar_3600ms_ease-out_infinite]"
      />
      <span className={cn$2("size-1 rounded-full", integrationStatusMarkerInnerClass[tone])} />
    </span>
  );
}
export function IntegrationStatusPill({
  label,
  tone,
  markerTone,
  markerActive,
  markerIcon,
  markerLabel,
  tooltipActionId,
  tooltipContent,
  className,
}) {
  const content2 = (
    <>
      <IntegrationStatusMarker
        tone={markerTone}
        active={markerActive}
        icon={markerIcon}
        label={markerLabel}
      />
      <span className="truncate">{label}</span>
      {tooltipContent && <InfoIcon$1 className="ml-0.5 size-3 shrink-0" strokeWidth={2} />}
    </>
  );
  const pillClassName = cn$2(
    "inline-flex h-[22px] min-w-0 items-center gap-1.5 rounded-full px-2 text-xs font-normal leading-none",
    integrationStatusPillToneClass[tone],
    markerIcon && "gap-1",
    className,
  );
  if (!tooltipContent) {
    return <span className={pillClassName}>{content2}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn$2(
              pillClassName,
              "cursor-pointer transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
            )}
            data-action-ui-id={tooltipActionId}
          />
        }
      >
        {content2}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px] flex-col items-start gap-1.5 text-left">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
export function IntegrationActionGroup({ className, ...props }) {
  return <div className={cn$2(integrationActionGroupClassName, className)} {...props} />;
}
export function IntegrationActionButton({
  className,
  tone,
  leadingIcon,
  children: children2,
  ...props
}) {
  return (
    <Button$1
      size="lg"
      className={cn$2(
        "h-8 min-w-20 rounded-[10px] px-3 text-sm font-medium !transition-colors active:not-aria-[haspopup]:translate-y-0",
        tone === "warning" &&
          "border-warning/40 bg-card text-warning hover:bg-warning/10 hover:text-warning focus-visible:ring-warning/30",
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children2}
    </Button$1>
  );
}
export function IntegrationLifecycleToggleButton({
  inactive,
  activeLabel,
  inactiveLabel,
  loading = false,
  className,
  ...props
}) {
  return (
    <IntegrationActionButton
      variant={inactive ? "outline" : "destructive"}
      loading={loading}
      className={cn$2(
        "h-8 w-[72px] min-w-[72px] max-w-[72px] px-2.5",
        inactive && "gap-0.5 bg-card",
        className,
      )}
      leadingIcon={
        inactive && !loading ? (
          <PlaybackPlayIcon size={14} className="shrink-0 text-foreground/70" />
        ) : (
          void 0
        )
      }
      {...props}
    >
      <span>{inactive ? inactiveLabel : activeLabel}</span>
    </IntegrationActionButton>
  );
}
export function IntegrationMoreMenu({
  triggerLabel,
  actionLabel,
  actionIcon,
  actionUiIds,
  onAction,
  disabled: disabled2 = false,
  triggerClassName,
  additionalActions = [],
}) {
  const [open, setOpen] = reactExports.useState(false);
  const closeTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (disabled2) setOpen(false);
  }, [disabled2]);
  const clearCloseTimer = () => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };
  const handleMouseEnter = () => {
    if (disabled2) return;
    clearCloseTimer();
    setOpen(true);
  };
  const handleMouseLeave2 = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!disabled2) setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button$1
            type="button"
            variant="outline"
            size="icon-lg"
            disabled={disabled2}
            className={cn$2(
              "size-8 rounded-[10px] bg-card p-0 text-muted-foreground hover:bg-muted hover:text-foreground",
              triggerClassName,
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave2}
            data-action-ui-id={actionUiIds.trigger}
          />
        }
      >
        <MoreVerticalIcon className="size-4" />
        <span className="sr-only">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={4}
        className="relative w-max min-w-28 gap-0 p-1"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave2}
        data-action-ui-id={actionUiIds.content}
      >
        <span
          aria-hidden="true"
          className="-top-1 absolute left-0 h-1 w-full"
          data-action-ui-id={actionUiIds.bridge}
        />
        {additionalActions.map((action) => (
          <Button$1
            key={action.actionUiId}
            type="button"
            variant="ghost"
            className="h-8 w-full justify-start gap-2 whitespace-nowrap rounded-sm px-2.5 text-foreground text-xs hover:bg-popup-item-hover"
            onClick={() => {
              clearCloseTimer();
              setOpen(false);
              void action.onAction();
            }}
            data-action-ui-id={action.actionUiId}
          >
            {action.icon}
            {action.label}
          </Button$1>
        ))}
        <button
          type="button"
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm px-2.5 text-center text-destructive text-xs transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
          onClick={() => {
            setOpen(false);
            void onAction();
          }}
          data-action-ui-id={actionUiIds.action}
        >
          {actionIcon}
          {actionLabel}
        </button>
      </PopoverContent>
    </Popover>
  );
}
let _service$1 = null;
function getImBridgeMainService() {
  if (!_service$1) {
    _service$1 = services.get(IImBridgeMainService);
  }
  return _service$1;
}
export function useImAccounts() {
  const [state2, setState] = reactExports.useState({
    accounts: [],
    legacyCredentialsPresent: false,
    loading: true,
    error: null,
  });
  const refresh = reactExports.useCallback(async () => {
    try {
      const svc = getImBridgeMainService();
      const [accounts, migrationStatus] = await Promise.all([
        svc.listAccounts(),
        svc.getCredentialMigrationStatus(),
      ]);
      setState({
        accounts,
        legacyCredentialsPresent: migrationStatus.legacyCredentialsPresent,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        accounts: [],
        legacyCredentialsPresent: false,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  const addAccount = reactExports.useCallback(async (credentials, alias) => {
    return getImBridgeMainService().addAccount(credentials, alias);
  }, []);
  const removeAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().removeAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const renameAccount = reactExports.useCallback(
    async (accountId, alias) => {
      await getImBridgeMainService().renameAccount(accountId, alias);
      await refresh();
    },
    [refresh],
  );
  const pauseAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().pauseAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const resumeAccount = reactExports.useCallback(
    async (accountId) => {
      await getImBridgeMainService().resumeAccount(accountId);
      await refresh();
    },
    [refresh],
  );
  const resetLegacyCredentialState = reactExports.useCallback(async () => {
    await getImBridgeMainService().resetLegacyCredentialState();
    await refresh();
  }, [refresh]);
  return {
    ...state2,
    refresh,
    addAccount,
    removeAccount,
    renameAccount,
    pauseAccount,
    resumeAccount,
    resetLegacyCredentialState,
  };
}
export function useImStatuses() {
  const [statuses, setStatuses] = reactExports.useState({});
  reactExports.useEffect(() => {
    const svc = getImBridgeMainService();
    let cancelled = false;
    void svc.listStatuses().then((initial) => {
      if (cancelled) return;
      const map3 = {};
      for (const s2 of initial) map3[s2.accountId] = s2;
      setStatuses(map3);
    });
    const unsubscribe = svc.onStatusChange((status) => {
      setStatuses((prev) => ({
        ...prev,
        [status.accountId]: status,
      }));
    });
    return () => {
      cancelled = true;
      unsubscribe.dispose();
    };
  }, []);
  return statuses;
}
export function useAvailablePlatforms() {
  const [available, setAvailable] = reactExports.useState({
    feishu: false,
    telegram: false,
    wechat: false,
    discord: false,
    dingtalk: false,
  });
  reactExports.useEffect(() => {
    let cancelled = false;
    const svc = getImBridgeMainService();
    Promise.all([
      svc.isPlatformAvailable("feishu"),
      svc.isPlatformAvailable("telegram"),
      svc.isPlatformAvailable("wechat"),
      svc.isPlatformAvailable("discord"),
      svc.isPlatformAvailable("dingtalk"),
    ]).then(([feishu, telegram, wechat, discord, dingtalk]) => {
      if (cancelled) return;
      setAvailable({
        feishu,
        telegram,
        wechat,
        discord,
        dingtalk,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}
export function useWechatQrLogin() {
  const [state2, setState] = reactExports.useState({
    sessionId: null,
    status: null,
    qrcodeUrl: null,
    isImageData: false,
    message: null,
    errorReason: null,
    accountId: null,
  });
  const sessionIdRef = reactExports.useRef(null);
  const startSeqRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    const svc = getImBridgeMainService();
    const unsub = svc.onWechatQrState((update2) => {
      if (update2.sessionId !== sessionIdRef.current) return;
      setState((prev) => ({
        ...prev,
        status: update2.status,
        qrcodeUrl: update2.qrcodeUrl ?? prev.qrcodeUrl,
        isImageData: update2.isImageData ?? prev.isImageData,
        message: update2.message ?? null,
        errorReason: update2.errorReason ?? null,
        accountId: update2.accountId ?? null,
      }));
    });
    return () => unsub.dispose();
  }, []);
  reactExports.useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        void getImBridgeMainService().cancelWechatQrLogin(sid);
      }
    };
  }, []);
  const start2 = reactExports.useCallback(async (alias) => {
    const gen = ++startSeqRef.current;
    const sid = await getImBridgeMainService().startWechatQrLogin(alias);
    if (gen !== startSeqRef.current) {
      void getImBridgeMainService()
        .cancelWechatQrLogin(sid)
        .catch(() => {});
      return;
    }
    sessionIdRef.current = sid;
    setState({
      sessionId: sid,
      status: "loading",
      qrcodeUrl: null,
      isImageData: false,
      message: null,
      errorReason: null,
      accountId: null,
    });
  }, []);
  const cancel = reactExports.useCallback(async () => {
    startSeqRef.current++;
    const sid = sessionIdRef.current;
    if (!sid) return;
    sessionIdRef.current = null;
    await getImBridgeMainService().cancelWechatQrLogin(sid);
    setState({
      sessionId: null,
      status: null,
      qrcodeUrl: null,
      isImageData: false,
      message: null,
      errorReason: null,
      accountId: null,
    });
  }, []);
  return {
    state: state2,
    start: start2,
    cancel,
  };
}
export function useFeishuQrLogin() {
  const [state2, setState] = reactExports.useState({
    sessionId: null,
    status: null,
    qrcodeUrl: null,
    message: null,
    errorReason: null,
    accountId: null,
  });
  const sessionIdRef = reactExports.useRef(null);
  const startSeqRef = reactExports.useRef(0);
  const pendingEventsRef = reactExports.useRef(new Map());
  const applyQrEvent = reactExports.useCallback((update2) => {
    setState((prev) => ({
      ...prev,
      status: update2.status,
      qrcodeUrl: update2.qrcodeUrl ?? prev.qrcodeUrl,
      message: update2.message ?? null,
      errorReason: update2.errorReason ?? null,
      accountId: update2.accountId ?? null,
    }));
  }, []);
  const adoptSession = reactExports.useCallback(
    (sid) => {
      sessionIdRef.current = sid;
      const buffered = pendingEventsRef.current.get(sid);
      if (buffered) {
        pendingEventsRef.current.delete(sid);
        for (const ev of buffered) applyQrEvent(ev);
      }
    },
    [applyQrEvent],
  );
  reactExports.useEffect(() => {
    const svc = getImBridgeMainService();
    const unsub = svc.onFeishuQrState((update2) => {
      if (update2.sessionId !== sessionIdRef.current) {
        const buf = pendingEventsRef.current.get(update2.sessionId) ?? [];
        if (buf.length < 16) {
          buf.push(update2);
          pendingEventsRef.current.set(update2.sessionId, buf);
        }
        return;
      }
      applyQrEvent(update2);
    });
    return () => unsub.dispose();
  }, [applyQrEvent]);
  reactExports.useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        void getImBridgeMainService().cancelFeishuQrLogin(sid);
      }
    };
  }, []);
  const start2 = reactExports.useCallback(
    async (alias) => {
      const gen = ++startSeqRef.current;
      const sid = await getImBridgeMainService().startFeishuQrLogin(alias);
      if (gen !== startSeqRef.current) {
        pendingEventsRef.current.delete(sid);
        void getImBridgeMainService()
          .cancelFeishuQrLogin(sid)
          .catch(() => {});
        return;
      }
      setState({
        sessionId: sid,
        status: "loading",
        qrcodeUrl: null,
        message: null,
        errorReason: null,
        accountId: null,
      });
      adoptSession(sid);
    },
    [adoptSession],
  );
  const startUserAuth = reactExports.useCallback(
    async (accountId) => {
      const gen = ++startSeqRef.current;
      const sid = await getImBridgeMainService().startFeishuUserAuth(accountId);
      if (gen !== startSeqRef.current) {
        pendingEventsRef.current.delete(sid);
        void getImBridgeMainService()
          .cancelFeishuQrLogin(sid)
          .catch(() => {});
        return;
      }
      setState({
        sessionId: sid,
        status: "loading",
        qrcodeUrl: null,
        message: null,
        errorReason: null,
        accountId: null,
      });
      adoptSession(sid);
    },
    [adoptSession],
  );
  const cancel = reactExports.useCallback(async () => {
    startSeqRef.current++;
    const sid = sessionIdRef.current;
    if (!sid) return;
    sessionIdRef.current = null;
    pendingEventsRef.current.delete(sid);
    await getImBridgeMainService().cancelFeishuQrLogin(sid);
    setState({
      sessionId: null,
      status: null,
      qrcodeUrl: null,
      message: null,
      errorReason: null,
      accountId: null,
    });
  }, []);
  return {
    state: state2,
    start: start2,
    startUserAuth,
    cancel,
  };
}
