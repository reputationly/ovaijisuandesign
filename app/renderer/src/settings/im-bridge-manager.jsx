// im-bridge-manager.jsx
import { ArrowUpRight, getDefaultExportFromCjs$1 as getDefaultExportFromCjs, getRuntimeConfig, Info$1 as Info, jsxRuntimeExports, reactExports, requireLib, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  getImBridgeMainService,
  IntegrationActionButton,
  IntegrationActionGroup,
  IntegrationCard,
  IntegrationIconFrame,
  IntegrationLifecycleToggleButton,
  useImAccounts,
  useImStatuses,
} from "./use-im-accounts.jsx";
import {
  addFlowTitleClassName,
  AgentEntityChip,
  isZhLocale,
  PlatformIcon,
  TutorialButton,
} from "./tutorial-button.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AddFlowFrame } from "./step-indicator.jsx";
import {
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { QrCard } from "./qr-card.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import {
  Icon,
  openExternalUrl,
  PlaybackPauseIcon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { IntegrationStatusPill } from "./integration-status-pill.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { IntegrationMoreMenu } from "./integration-more-menu.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { Switch } from "../generation/select-content.jsx";
import { useSettings } from "./use-settings.js";
function useAvailablePlatforms() {
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
function useWechatQrLogin() {
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
function useFeishuQrLogin() {
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
var libExports = requireLib();
const QRCode = getDefaultExportFromCjs(libExports);
const DEFAULT_ALIAS = {
  feishu: "Feishu",
  telegram: "Telegram",
  wechat: "WeChat",
  discord: "Discord",
  dingtalk: "DingTalk",
};
function localizeImDisplayName(displayName2, locale) {
  if (isZhLocale(locale)) return displayName2;
  return displayName2
    .replace(/\s*的\s*飞书\s*CLI/g, "'s Lark CLI")
    .replace(/\s*的\s*飞书智能体/g, "'s Lark agent")
    .replace(/飞书\s*CLI/g, "Lark CLI")
    .replace(/飞书智能体/g, "Lark agent")
    .replace(/飞书/g, "Lark")
    .replace(/微信/g, "WeChat");
}
function getAccountDisplayName(account, status, locale) {
  const platformName = status?.botDisplayName?.trim();
  if (platformName) return localizeImDisplayName(platformName, locale);
  const alias = account?.alias.trim();
  if (!account || !alias || alias === DEFAULT_ALIAS[account.platform])
    return void 0;
  return localizeImDisplayName(alias, locale);
}
const AUTH_HANDOFF_MIN_MS = 900;
function trackConnectionFailure(action, platform2, layout, error) {
  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
    action,
    result: "failed",
    surface: layout === "settings" ? "settings" : "dialog",
    platform: platform2,
    error_message: (error instanceof Error
      ? error.message
      : String(error)
    ).slice(0, 200),
  });
}
function QrConnectView({
  platform: platform2,
  step = "scan",
  layout = "dialog",
  status,
  errorReason,
  qrNode,
  canRetry,
  onBack,
  onRetry,
  onDialogHeaderChange,
  agentName,
  transitioningToStep,
  transitionLabel,
  statusLabelOverride,
}) {
  const { t: t2, i18n } = useTranslation();
  const titleKey = step === "auth" ? "authTitle" : "scanTitle";
  const descriptionKey =
    step === "auth" ? "authDescription" : "scanDescription";
  const agentLabel =
    agentName?.trim() ||
    t2("settings.imBridge.addFlow.defaultAgentName.feishu");
  const isChineseLocale2 = isZhLocale(i18n.resolvedLanguage || i18n.language);
  const readyHintKey = `settings.imBridge.addFlow.${step === "auth" ? "authQrHint" : "scanQrHint"}.${platform2}`;
  const readyHint = t2(readyHintKey, {
    agentName: agentLabel,
  });
  const qrReadyHint = readyHint === readyHintKey ? void 0 : readyHint;
  return (
    <AddFlowFrame
      platform={platform2}
      step={step}
      layout={layout}
      onBack={onBack}
      onDialogHeaderChange={onDialogHeaderChange}
      transitioningToStep={transitioningToStep}
      transitionLabel={transitionLabel}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[520px] flex-col items-center text-center",
          layout === "settings" ? "flex-none pt-10" : "flex-1 justify-center",
        )}
      >
        <div
          className={cn(
            "flex max-w-full items-center justify-center gap-2",
            isChineseLocale2 ? "flex-wrap" : "flex-col",
          )}
        >
          <h3 className={addFlowTitleClassName(isChineseLocale2)}>
            {t2(`settings.imBridge.addFlow.${titleKey}.${platform2}`)}
          </h3>
        </div>
        {platform2 === "feishu" && step === "auth" ? (
          <p className="mt-2 max-w-[480px] text-[13px] leading-relaxed text-muted-foreground">
            {t2("settings.imBridge.addFlow.authDescription.action")}
          </p>
        ) : (
          <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">
            {t2(`settings.imBridge.addFlow.${descriptionKey}.${platform2}`)}
          </p>
        )}
        <QrCard
          platform={platform2}
          status={status}
          errorReason={errorReason}
          canRetry={canRetry}
          onRetry={onRetry}
          readyHint={qrReadyHint}
          statusLabelOverride={statusLabelOverride}
        >
          {qrNode}
        </QrCard>
      </div>
    </AddFlowFrame>
  );
}
function QrSuccessView({
  platform: platform2,
  layout = "dialog",
  onDone,
  onDialogHeaderChange,
  agentName,
}) {
  const { t: t2, i18n } = useTranslation();
  const label = t2(`settings.imBridge.platform.${platform2}`);
  const agentLabel =
    agentName?.trim() ||
    t2("settings.imBridge.addFlow.defaultAgentName.feishu");
  const entityLabel =
    platform2 === "feishu"
      ? agentLabel
      : t2("settings.imBridge.addFlow.defaultAgentName.wechat");
  const isChineseLocale2 = isZhLocale(i18n.resolvedLanguage || i18n.language);
  return (
    <AddFlowFrame
      platform={platform2}
      step="done"
      layout={layout}
      onBack={onDone}
      onDialogHeaderChange={onDialogHeaderChange}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[560px] flex-none flex-col text-center",
          layout === "settings" ? "pt-3" : "pt-2",
        )}
        data-action-ui-id={`im-bridge.${platform2}.qr.success`}
      >
        <div className="flex flex-col">
          <h3 className={addFlowTitleClassName(isChineseLocale2)}>
            {t2(`settings.imBridge.addFlow.successTitle.${platform2}`)}
          </h3>
          <div className="mx-4 mt-5 flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-card">
              <PlatformIcon
                platform={platform2}
                label={label}
                className="size-9 rounded-md object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="min-w-0 truncate font-medium text-foreground text-sm">
                {t2(`settings.imBridge.addFlow.accountSummary.${platform2}`)}
              </p>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {t2("settings.imBridge.addFlow.currentDevice")}
              </p>
            </div>
            <AgentEntityChip
              name={entityLabel}
              className="ml-auto max-w-[240px] shrink-0"
            />
          </div>
          <div className="mx-4 mt-4 rounded-lg bg-secondary/45 px-4 py-3.5 text-left">
            <p className="font-medium text-foreground text-sm">
              {t2("settings.imBridge.addFlow.successGuide.title")}
            </p>
            <ol className="mt-2 flex flex-col gap-1 text-[13px] leading-snug text-muted-foreground">
              {[1, 2, 3, 4].map((index2) => (
                <li key={index2} className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-card text-[10px] leading-none text-foreground/70">
                    {index2}
                  </span>
                  <span>
                    {t2(
                      `settings.imBridge.addFlow.successGuide.${platform2}.${index2}`,
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <TutorialButton
              platform={platform2}
              actionId={`im-bridge.${platform2}.qr.guide`}
              label={t2("settings.imBridge.addFlow.viewGuide")}
              variant="outline"
              size="default"
              className="w-28"
            />
            <Button
              type="button"
              size="default"
              className="w-28"
              onClick={onDone}
              data-action-ui-id={`im-bridge.${platform2}.qr.done`}
            >
              {t2("settings.imBridge.addFlow.done")}
            </Button>
          </div>
        </div>
      </div>
    </AddFlowFrame>
  );
}
function FeishuQrSection({
  alias,
  layout = "dialog",
  onClose,
  onConfirmed,
  onDialogHeaderChange,
  onConnected,
}) {
  const { t: t2, i18n } = useTranslation();
  const {
    state: state2,
    start: start2,
    startUserAuth,
    cancel,
  } = useFeishuQrLogin();
  const { accounts, refresh: refreshAccounts } = useImAccounts();
  const statuses = useImStatuses();
  const [step, setStep] = reactExports.useState("scan");
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [authHandoffPending, setAuthHandoffPending] =
    reactExports.useState(false);
  const aliasRef = reactExports.useRef(alias);
  const accountIdRef = reactExports.useRef(null);
  const scanSessionIdRef = reactExports.useRef(null);
  const connectedNotifiedRef = reactExports.useRef(false);
  const authHandoffTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    void start2(aliasRef.current || void 0);
  }, [start2]);
  reactExports.useEffect(() => {
    return () => {
      if (authHandoffTimerRef.current !== null) {
        window.clearTimeout(authHandoffTimerRef.current);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (state2.status !== "confirmed") return;
    if (step === "scan") {
      if (!state2.accountId) return;
      accountIdRef.current = state2.accountId;
      scanSessionIdRef.current = state2.sessionId;
      if (!connectedNotifiedRef.current) {
        connectedNotifiedRef.current = true;
        void onConnected?.();
      }
      void refreshAccounts();
      setAuthHandoffPending(true);
      if (authHandoffTimerRef.current !== null) {
        window.clearTimeout(authHandoffTimerRef.current);
      }
      authHandoffTimerRef.current = window.setTimeout(() => {
        setAuthHandoffPending(false);
        authHandoffTimerRef.current = null;
      }, AUTH_HANDOFF_MIN_MS);
      setStep("auth");
      void startUserAuth(state2.accountId);
      return;
    }
    if (state2.sessionId && state2.sessionId !== scanSessionIdRef.current) {
      setConfirmed(true);
    }
  }, [
    state2.status,
    state2.accountId,
    state2.sessionId,
    step,
    startUserAuth,
    onConnected,
    refreshAccounts,
  ]);
  reactExports.useEffect(() => {
    if (state2.status !== "error" && state2.status !== "pending_approval")
      return;
    trackConnectionFailure(
      step === "auth" ? "authorize" : "connect",
      "feishu",
      layout,
      state2.errorReason ?? state2.status,
    );
  }, [layout, state2.errorReason, state2.status, step]);
  const connectedAccountId = accountIdRef.current;
  const connectedAccount = connectedAccountId
    ? accounts.find((account) => account.accountId === connectedAccountId)
    : void 0;
  const agentName = getAccountDisplayName(
    connectedAccount,
    connectedAccountId ? statuses[connectedAccountId] : void 0,
    i18n?.resolvedLanguage || i18n?.language,
  );
  if (confirmed) {
    return (
      <QrSuccessView
        platform="feishu"
        layout={layout}
        onDone={onConfirmed}
        onDialogHeaderChange={onDialogHeaderChange}
        agentName={agentName}
      />
    );
  }
  const displayStatus = authHandoffPending ? "loading" : state2.status;
  const authLoading = step === "auth" && displayStatus === "loading";
  const authLoadingLabel = authLoading
    ? t2("settings.imBridge.addFlow.transition.auth.feishu")
    : void 0;
  const qrNode =
    !authHandoffPending && state2.status === "ready" && state2.qrcodeUrl ? (
      <img
        src={state2.qrcodeUrl}
        alt={t2(
          `settings.imBridge.addFlow.qrAlt.${step === "auth" ? "feishuAuth" : "feishu"}`,
        )}
        className="size-full object-contain"
      />
    ) : null;
  return (
    <QrConnectView
      platform="feishu"
      step={step}
      layout={layout}
      status={displayStatus}
      errorReason={state2.errorReason}
      qrNode={qrNode}
      canRetry={
        state2.status === "error" || state2.status === "pending_approval"
      }
      onBack={() => {
        void cancel();
        onClose();
      }}
      onRetry={() => {
        if (step === "auth" && accountIdRef.current) {
          void startUserAuth(accountIdRef.current);
          return;
        }
        void start2(aliasRef.current || void 0);
      }}
      onDialogHeaderChange={onDialogHeaderChange}
      agentName={agentName}
      transitioningToStep={authLoading ? "auth" : void 0}
      transitionLabel={authLoadingLabel}
      statusLabelOverride={authLoadingLabel}
    />
  );
}
function FeishuUserAuthFlow({
  accountId,
  layout = "dialog",
  onClose,
  onAuthorized,
  onDialogHeaderChange,
  agentName,
}) {
  const { t: t2 } = useTranslation();
  const { state: state2, startUserAuth, cancel } = useFeishuQrLogin();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const accountIdRef = reactExports.useRef(accountId);
  reactExports.useEffect(() => {
    void startUserAuth(accountIdRef.current);
  }, [startUserAuth]);
  reactExports.useEffect(() => {
    if (state2.status === "confirmed") {
      setConfirmed(true);
    }
  }, [state2.status]);
  reactExports.useEffect(() => {
    if (state2.status !== "error" && state2.status !== "pending_approval")
      return;
    trackConnectionFailure(
      "authorize",
      "feishu",
      layout,
      state2.errorReason ?? state2.status,
    );
  }, [layout, state2.errorReason, state2.status]);
  const handleDone = () => {
    void Promise.resolve(onAuthorized()).finally(() => onClose());
  };
  if (confirmed) {
    return (
      <QrSuccessView
        platform="feishu"
        layout={layout}
        onDone={handleDone}
        onDialogHeaderChange={onDialogHeaderChange}
        agentName={agentName}
      />
    );
  }
  const qrNode =
    state2.status === "ready" && state2.qrcodeUrl ? (
      <img
        src={state2.qrcodeUrl}
        alt={t2("settings.imBridge.addFlow.qrAlt.feishuAuth")}
        className="size-full object-contain"
      />
    ) : null;
  return (
    <QrConnectView
      platform="feishu"
      step="auth"
      layout={layout}
      status={state2.status}
      errorReason={state2.errorReason}
      qrNode={qrNode}
      canRetry={
        state2.status === "error" || state2.status === "pending_approval"
      }
      onBack={() => {
        void cancel();
        onClose();
      }}
      onRetry={() => {
        void startUserAuth(accountIdRef.current);
      }}
      onDialogHeaderChange={onDialogHeaderChange}
      agentName={agentName}
      transitioningToStep={state2.status === "loading" ? "auth" : void 0}
      transitionLabel={
        state2.status === "loading"
          ? t2("settings.imBridge.addFlow.transition.auth.feishu")
          : void 0
      }
      statusLabelOverride={
        state2.status === "loading"
          ? t2("settings.imBridge.addFlow.transition.auth.feishu")
          : void 0
      }
    />
  );
}
function FeishuSection({
  alias,
  layout = "dialog",
  onClose,
  onConfirmed,
  onDialogHeaderChange,
  onConnected,
}) {
  return (
    <FeishuQrSection
      alias={alias}
      layout={layout}
      onClose={onClose}
      onConfirmed={onConfirmed}
      onDialogHeaderChange={onDialogHeaderChange}
      onConnected={onConnected}
    />
  );
}
function WechatQrSection({
  alias,
  layout = "dialog",
  onClose,
  onConfirmed,
  onDialogHeaderChange,
  onConnected,
}) {
  const { t: t2 } = useTranslation();
  const { state: state2, start: start2, cancel } = useWechatQrLogin();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const aliasRef = reactExports.useRef(alias);
  const connectedNotifiedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    void start2(aliasRef.current || void 0);
  }, [start2]);
  reactExports.useEffect(() => {
    if (state2.status === "confirmed") {
      if (!connectedNotifiedRef.current) {
        connectedNotifiedRef.current = true;
        void onConnected?.();
      }
      setConfirmed(true);
    }
  }, [state2.status, onConnected]);
  reactExports.useEffect(() => {
    if (state2.status !== "error") return;
    trackConnectionFailure(
      "connect",
      "wechat",
      layout,
      state2.errorReason ?? state2.status,
    );
  }, [layout, state2.errorReason, state2.status]);
  const showQr =
    (state2.status === "ready" ||
      state2.status === "scanned" ||
      state2.status === "expired") &&
    state2.qrcodeUrl;
  if (confirmed) {
    return (
      <QrSuccessView
        platform="wechat"
        layout={layout}
        onDone={onConfirmed}
        onDialogHeaderChange={onDialogHeaderChange}
      />
    );
  }
  const qrNode =
    showQr && state2.qrcodeUrl ? (
      state2.isImageData ? (
        <img
          src={state2.qrcodeUrl}
          alt={t2("settings.imBridge.addFlow.qrAlt.wechat")}
          className="size-full object-contain"
        />
      ) : (
        <QRCode value={state2.qrcodeUrl} size={208} />
      )
    ) : null;
  return (
    <QrConnectView
      platform="wechat"
      layout={layout}
      status={state2.status}
      errorReason={state2.errorReason}
      qrNode={qrNode}
      canRetry={state2.status === "error"}
      onBack={() => {
        void cancel();
        onClose();
      }}
      onRetry={() => {
        void start2(aliasRef.current || void 0);
      }}
      onDialogHeaderChange={onDialogHeaderChange}
    />
  );
}
function AddAccountForm({
  platform: platform2,
  onClose,
  onAdded,
  onDialogHeaderChange,
  onConnected,
  layout = "dialog",
}) {
  const { t: t2 } = useTranslation();
  const { addAccount } = useImAccounts();
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [botToken, setBotToken] = reactExports.useState("");
  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const creds = {
        platform: "telegram",
        botToken: botToken.trim(),
      };
      await addAccount(creds, void 0);
      onAdded();
    } catch (err) {
      trackConnectionFailure("connect", "telegram", layout, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div
      className="flex min-h-full flex-1 flex-col gap-4"
      data-action-ui-id={`im-bridge.add.${platform2}`}
    >
      {platform2 === "feishu" && (
        <FeishuSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform2 === "wechat" && (
        <WechatQrSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform2 === "telegram" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="im-bottoken" className="text-xs">
              {t2("settings.imBridge.field.botToken")}
            </Label>
            <Input3
              id="im-bottoken"
              type="password"
              value={botToken}
              onChange={(e2) => setBotToken(e2.target.value)}
              placeholder={t2("settings.imBridge.field.botTokenPlaceholder")}
              autoComplete="off"
            />
          </div>
          {error && (
            <p
              className="text-destructive text-xs"
              data-action-ui-id="im-bridge.add.error"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              {t2("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSubmit} loading={submitting}>
              {t2("settings.imBridge.add.submit")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function getAccountStatusHint(status) {
  const state2 = status?.state ?? "disconnected";
  if (status?.errorKind === "credential_corrupt") {
    return {
      key: "settings.imBridge.credentialError.rowHint",
      tone: "destructive",
    };
  }
  if (status?.lastError) {
    return null;
  }
  switch (state2) {
    case "connected":
      return null;
    case "connecting":
      return {
        key: "settings.imBridge.status.connecting",
        tone: "warning",
      };
    case "error":
      return {
        key: "settings.imBridge.status.error",
        tone: "destructive",
      };
    case "disconnected":
      return {
        key: "settings.imBridge.status.disconnected",
        tone: "muted",
      };
  }
}
const TUTORIAL_URL = {
  wechat: "https://my.feishu.cn/wiki/UqkAwo1tMi050hkDlnic4a1Tntf",
  feishu: "https://my.feishu.cn/wiki/OAmLwbUOsiGOfSk8sB8c3klinPd",
};
const DOMESTIC_PLATFORM_ORDER = [
  "feishu",
  "wechat",
  "telegram",
  "discord",
  "dingtalk",
];
const OVERSEAS_PLATFORM_ORDER = [
  "feishu",
  "telegram",
  "wechat",
  "discord",
  "dingtalk",
];
function regionKeySuffix() {
  return getRuntimeConfig().region === "overseas" ? "overseas" : "domestic";
}
function getConnectionPlatformOrder() {
  return getRuntimeConfig().region === "overseas"
    ? OVERSEAS_PLATFORM_ORDER
    : DOMESTIC_PLATFORM_ORDER;
}
function getAddablePlatformOrder() {
  return getRuntimeConfig().region === "overseas"
    ? ["feishu", "telegram"]
    : ["feishu", "wechat"];
}
function AccountMoreMenu({ accountId, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  return (
    <IntegrationMoreMenu
      triggerLabel={t2("settings.imBridge.actions.more")}
      actionLabel={t2("settings.imBridge.actions.remove")}
      actionIcon={<Icon icon={Trash2} size="sm" strokeWidth={1.5} />}
      onAction={onRemove2}
      actionUiIds={{
        trigger: `im-bridge.row.${accountId}.more`,
        content: `im-bridge.row.${accountId}.more-popover`,
        bridge: `im-bridge.row.${accountId}.more-popover-hover-bridge`,
        action: `im-bridge.row.${accountId}.remove`,
      }}
    />
  );
}
function PlatformIconFrame({ platform: platform2, label }) {
  return (
    <IntegrationIconFrame>
      <PlatformIcon
        platform={platform2}
        label={label}
        className="size-12 rounded-md bg-white object-contain"
      />
    </IntegrationIconFrame>
  );
}
function getPlatformStatusDisplay(status) {
  return {
    key: `settings.imBridge.channel.status.${status}`,
    markerTone: "muted",
    state: "disconnected",
    tone: "muted",
  };
}
function getAccountRowStatusDisplay({
  account,
  status,
  needsAuth,
  credentialError,
}) {
  const state2 = status?.state ?? "disconnected";
  if (credentialError) {
    return {
      key: "settings.imBridge.channel.status.error",
      markerTone: "destructive",
      state: "error",
      tone: "destructive",
    };
  }
  if (needsAuth) {
    return {
      key: "settings.imBridge.channel.status.needsAuth",
      markerTone: "warning",
      state: "needsAuth",
      tone: "warning",
    };
  }
  if (account.paused) {
    return {
      key: "settings.imBridge.channel.status.paused",
      markerTone: "warning",
      state: "paused",
      tone: "warning",
    };
  }
  switch (state2) {
    case "connected":
      return {
        key: "settings.imBridge.channel.status.connected",
        markerTone: "success",
        state: state2,
        tone: "neutral",
      };
    case "connecting":
      return {
        key: "settings.imBridge.channel.status.connecting",
        markerTone: "warning",
        state: state2,
        tone: "warning",
      };
    case "error":
      return {
        key: "settings.imBridge.channel.status.error",
        markerTone: "destructive",
        state: state2,
        tone: "destructive",
      };
    case "disconnected":
      return {
        key: "settings.imBridge.channel.status.disconnected",
        markerTone: "muted",
        state: state2,
        tone: "muted",
      };
  }
}
function ConnectionStatusIndicator({
  display,
  className,
  tooltipActionId,
  tooltipContent,
}) {
  const { t: t2 } = useTranslation();
  return (
    <IntegrationStatusPill
      label={t2(display.key)}
      tone={display.tone}
      markerTone={display.markerTone}
      markerActive={display.state === "needsAuth"}
      markerIcon={
        display.state === "paused" ? (
          <PlaybackPauseIcon size={10} className="shrink-0 text-warning/80" />
        ) : (
          void 0
        )
      }
      markerLabel={`status:${display.state}`}
      tooltipActionId={tooltipActionId}
      tooltipContent={tooltipContent}
      className={className}
    />
  );
}
function AddableAccountRow({ option: option2, onAdd: onAdd2 }) {
  const { t: t2 } = useTranslation();
  const status = getPlatformStatusDisplay("notConnected");
  return (
    <IntegrationCard>
      <PlatformIconFrame platform={option2.platform} label={option2.label} />
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium text-[16px] text-foreground leading-none">
            {option2.label}
          </p>
          <ConnectionStatusIndicator display={status} />
        </div>
        <p className="mt-2 truncate text-muted-foreground text-xs">
          {t2(`settings.imBridge.channel.description.${option2.platform}`)}
        </p>
      </div>
      <div className="shrink-0">
        <Button
          type="button"
          size="lg"
          className="h-8 min-w-20 px-3 text-sm font-medium"
          onClick={() => onAdd2(option2.platform)}
          data-action-ui-id={`im-bridge.empty.add.${option2.platform}`}
        >
          {t2("settings.imBridge.channel.action.connectPlatform", {
            platform: option2.label,
          })}
        </Button>
      </div>
    </IntegrationCard>
  );
}
function TutorialLink({ platform: platform2, actionId, className }) {
  const { t: t2 } = useTranslation();
  const shellPlatform = usePlatform();
  const tutorialUrl = TUTORIAL_URL[platform2];
  if (!tutorialUrl) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1 text-brand-accent hover:text-brand-accent",
        className,
      )}
      onClick={() => {
        void openExternalUrl(shellPlatform, tutorialUrl, {
          source: "im-bridge.tutorial",
        });
      }}
      data-action-ui-id={actionId}
    >
      {t2("settings.imBridge.tutorialLink")}
      <Icon icon={ArrowUpRight} size="sm" strokeWidth={2} />
    </Button>
  );
}
function getFallbackTutorialPlatform() {
  return "feishu";
}
const ACCOUNT_STATUS_HINT_TONE_CLASS = {
  muted: "text-muted-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};
function AccountRow({
  account,
  status,
  onRemove: onRemove2,
  onPause,
  onResume,
  onAuthorize,
}) {
  const { t: t2, i18n } = useTranslation();
  const platformLabel = t2(`settings.imBridge.platform.${account.platform}`);
  const displayName2 =
    getAccountDisplayName(
      account,
      status,
      i18n?.resolvedLanguage || i18n?.language,
    ) || platformLabel;
  const needsAuth =
    account.platform === "feishu" && account.needsUserAuth === true;
  const credentialError = status?.errorKind === "credential_corrupt";
  const statusHint =
    account.paused && !credentialError ? null : getAccountStatusHint(status);
  const statusDisplay = getAccountRowStatusDisplay({
    account,
    status,
    needsAuth,
    credentialError,
  });
  const connectedGuidePlatform =
    account.platform === "feishu" || account.platform === "wechat"
      ? account.platform
      : null;
  const showConnectedGuide =
    connectedGuidePlatform !== null &&
    status?.state === "connected" &&
    !account.paused &&
    !needsAuth &&
    !credentialError;
  const subtitle =
    account.paused && !credentialError
      ? t2("settings.imBridge.channel.subtitle.paused", {
          name: displayName2,
        })
      : statusHint
        ? t2(statusHint.key)
        : showConnectedGuide
          ? t2(
              `settings.imBridge.channel.subtitle.connected.${connectedGuidePlatform}`,
            )
          : `${displayName2}${!credentialError && status?.lastError ? ` • ${status.lastError}` : ""}`;
  const subtitleToneClass = statusHint
    ? ACCOUNT_STATUS_HINT_TONE_CLASS[statusHint.tone]
    : "text-muted-foreground";
  return (
    <IntegrationCard>
      <PlatformIconFrame platform={account.platform} label={platformLabel} />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-h-14 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-medium text-[16px] text-foreground leading-none">
              {platformLabel}
            </p>
            <ConnectionStatusIndicator
              display={statusDisplay}
              tooltipActionId={
                needsAuth
                  ? `im-bridge.row.${account.accountId}.needs-auth-info`
                  : void 0
              }
              tooltipContent={
                needsAuth ? (
                  <>
                    <span>{t2("settings.imBridge.userAuth.hint")}</span>
                    <span>
                      {t2("settings.imBridge.security.availabilityHint")}
                    </span>
                  </>
                ) : (
                  void 0
                )
              }
            />
          </div>
          <div className="mt-1.5 flex items-center">
            <p
              className={cn(
                "line-clamp-2 whitespace-normal break-words text-xs leading-snug",
                subtitleToneClass,
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <IntegrationActionGroup>
        {needsAuth && (
          <IntegrationActionButton
            type="button"
            variant="outline"
            tone="warning"
            onClick={() => onAuthorize()}
            data-action-ui-id={`im-bridge.row.${account.accountId}.authorize`}
          >
            <span>{t2("settings.imBridge.userAuth.action")}</span>
          </IntegrationActionButton>
        )}
        {!needsAuth && (
          <IntegrationLifecycleToggleButton
            type="button"
            inactive={account.paused}
            activeLabel={t2("settings.imBridge.actions.pause")}
            inactiveLabel={t2("settings.imBridge.actions.resume")}
            onClick={() => (account.paused ? onResume() : onPause())}
            data-action-ui-id={`im-bridge.row.${account.accountId}.${account.paused ? "resume" : "pause"}`}
          />
        )}
        <AccountMoreMenu accountId={account.accountId} onRemove={onRemove2} />
      </IntegrationActionGroup>
    </IntegrationCard>
  );
}
function ConnectionList({
  platformOrder,
  accounts,
  statuses,
  addableOptions,
  onAdd: onAdd2,
  onRemove: onRemove2,
  onPause,
  onResume,
  onAuthorize,
}) {
  const accountsByPlatform = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const account of accounts) {
      const existing = map3.get(account.platform) ?? [];
      existing.push(account);
      map3.set(account.platform, existing);
    }
    return map3;
  }, [accounts]);
  const addableByPlatform = reactExports.useMemo(
    () => new Map(addableOptions.map((option2) => [option2.platform, option2])),
    [addableOptions],
  );
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {platformOrder.flatMap((platform2) => {
          const platformAccounts = accountsByPlatform.get(platform2);
          if (platformAccounts?.length) {
            return platformAccounts.map((acc) => (
              <AccountRow
                key={acc.accountId}
                account={acc}
                status={statuses[acc.accountId]}
                onRemove={() => onRemove2(acc.accountId)}
                onPause={() => onPause(acc.accountId)}
                onResume={() => onResume(acc.accountId)}
                onAuthorize={() => onAuthorize(acc)}
              />
            ));
          }
          const option2 = addableByPlatform.get(platform2);
          return option2
            ? [
                <AddableAccountRow
                  key={option2.platform}
                  option={option2}
                  onAdd={onAdd2}
                />,
              ]
            : [];
        })}
      </ul>
    </div>
  );
}
export function ImBridgeManager({
  onDialogHeaderChange,
  layout = "dialog",
} = {}) {
  const { t: t2, i18n } = useTranslation();
  const {
    accounts,
    legacyCredentialsPresent,
    loading,
    error,
    removeAccount,
    pauseAccount,
    resumeAccount,
    resetLegacyCredentialState,
    refresh,
  } = useImAccounts();
  const statuses = useImStatuses();
  const available = useAvailablePlatforms();
  const { config: config2, set: set2 } = useSettings();
  const [addingPlatform, setAddingPlatform] = reactExports.useState(null);
  const [authorizingAccount, setAuthorizingAccount] =
    reactExports.useState(null);
  const [updatingCredentials, setUpdatingCredentials] =
    reactExports.useState(false);
  const surface = layout === "settings" ? "settings" : "dialog";
  const trackAccountAction = (action, result, platform2, error2) => {
    trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
      action,
      result,
      surface,
      ...(platform2
        ? {
            platform: platform2,
          }
        : {}),
      ...(error2
        ? {
            error_message: (error2 instanceof Error
              ? error2.message
              : String(error2)
            ).slice(0, 200),
          }
        : {}),
    });
  };
  const platformOrder = reactExports.useMemo(
    () => getConnectionPlatformOrder(),
    [],
  );
  const addablePlatformOrder = reactExports.useMemo(
    () => getAddablePlatformOrder(),
    [],
  );
  const platformRank = reactExports.useMemo(
    () =>
      new Map(platformOrder.map((platform2, index2) => [platform2, index2])),
    [platformOrder],
  );
  const sorted = reactExports.useMemo(
    () =>
      [...accounts].sort((a2, b3) => {
        const rankDelta =
          (platformRank.get(a2.platform) ?? Number.MAX_SAFE_INTEGER) -
          (platformRank.get(b3.platform) ?? Number.MAX_SAFE_INTEGER);
        return rankDelta === 0 ? a2.createdAt - b3.createdAt : rankDelta;
      }),
    [accounts, platformRank],
  );
  const boundPlatforms = reactExports.useMemo(
    () => new Set(accounts.map((a2) => a2.platform)),
    [accounts],
  );
  const addableAccountOptions = reactExports.useMemo(() => {
    return addablePlatformOrder
      .filter(
        (platform2) => available[platform2] && !boundPlatforms.has(platform2),
      )
      .map((platform2) => ({
        platform: platform2,
        label: t2(`settings.imBridge.platform.${platform2}`),
      }));
  }, [addablePlatformOrder, available, boundPlatforms, t2]);
  const hasCredentialError = reactExports.useMemo(
    () =>
      sorted.some(
        (a2) => statuses[a2.accountId]?.errorKind === "credential_corrupt",
      ),
    [sorted, statuses],
  );
  if (addingPlatform) {
    return (
      <AddAccountForm
        platform={addingPlatform}
        layout={layout}
        onClose={() => setAddingPlatform(null)}
        onDialogHeaderChange={onDialogHeaderChange}
        onConnected={async () => {
          trackAccountAction("connect", "success", addingPlatform);
          await refresh();
        }}
        onAdded={() => {
          if (addingPlatform === "telegram") {
            trackAccountAction("connect", "success", addingPlatform);
          }
          void refresh();
          setAddingPlatform(null);
        }}
      />
    );
  }
  if (authorizingAccount) {
    const authorizingAgentName = getAccountDisplayName(
      authorizingAccount,
      statuses[authorizingAccount.accountId],
      i18n?.resolvedLanguage || i18n?.language,
    );
    return (
      <FeishuUserAuthFlow
        accountId={authorizingAccount.accountId}
        agentName={authorizingAgentName}
        layout={layout}
        onClose={() => setAuthorizingAccount(null)}
        onAuthorized={async () => {
          trackAccountAction(
            "authorize",
            "success",
            authorizingAccount.platform,
          );
          await refresh();
        }}
        onDialogHeaderChange={onDialogHeaderChange}
      />
    );
  }
  const regionSuffix = regionKeySuffix();
  const tutorialPlatform = getFallbackTutorialPlatform();
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t2("settings.imBridge.hero.title")}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
              {t2(`settings.imBridge.hero.description.${regionSuffix}`)}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("settings.imBridge.connection.infoLabel")}
                      className="ml-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  }
                >
                  <Icon icon={Info} size="xs" strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[260px] text-center leading-relaxed"
                >
                  {t2("settings.imBridge.executionNotice")}
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
          <TutorialLink
            platform={tutorialPlatform}
            actionId="im-bridge.tutorial"
            className="mt-0.5 shrink-0"
          />
        </div>
        {loading && (
          <p className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-muted-foreground text-xs">
            {t2("settings.imBridge.loading")}
          </p>
        )}
        {error && !loading && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            {t2("settings.imBridge.errors.listFailed", {
              message: error,
            })}
          </p>
        )}
        {(legacyCredentialsPresent || hasCredentialError) && (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5"
            data-action-ui-id="im-bridge.credential-update-banner"
          >
            <p className="text-[13px] leading-relaxed text-foreground">
              {t2("settings.imBridge.credentialUpdate.banner")}
            </p>
            <Button
              size="sm"
              disabled={updatingCredentials}
              onClick={async () => {
                setUpdatingCredentials(true);
                trackAccountAction("reset_credentials", "start");
                try {
                  await resetLegacyCredentialState();
                  trackAccountAction("reset_credentials", "success");
                  dedupedToast.success(
                    t2("settings.imBridge.credentialUpdate.success"),
                  );
                } catch (error2) {
                  trackAccountAction(
                    "reset_credentials",
                    "failed",
                    void 0,
                    error2,
                  );
                  dedupedToast.error(
                    t2("settings.imBridge.credentialUpdate.failed"),
                  );
                } finally {
                  setUpdatingCredentials(false);
                }
              }}
              data-action-ui-id="im-bridge.credential-update"
            >
              {t2("settings.imBridge.credentialUpdate.action")}
            </Button>
          </div>
        )}
        {!loading && !error && (
          <ConnectionList
            platformOrder={platformOrder}
            accounts={sorted}
            statuses={statuses}
            addableOptions={addableAccountOptions}
            onAdd={(platform2) => {
              trackAccountAction("connect", "start", platform2);
              setAddingPlatform(platform2);
            }}
            onRemove={async (accountId) => {
              const account = sorted.find(
                (item) => item.accountId === accountId,
              );
              trackAccountAction("remove", "start", account?.platform);
              try {
                await removeAccount(accountId);
                trackAccountAction("remove", "success", account?.platform);
              } catch (error2) {
                trackAccountAction(
                  "remove",
                  "failed",
                  account?.platform,
                  error2,
                );
                dedupedToast.error(t2("settings.imBridge.errors.removeFailed"));
              }
            }}
            onPause={async (accountId) => {
              const account = sorted.find(
                (item) => item.accountId === accountId,
              );
              trackAccountAction("pause", "start", account?.platform);
              try {
                await pauseAccount(accountId);
                trackAccountAction("pause", "success", account?.platform);
              } catch (error2) {
                trackAccountAction(
                  "pause",
                  "failed",
                  account?.platform,
                  error2,
                );
                throw error2;
              }
            }}
            onResume={async (accountId) => {
              const account = sorted.find(
                (item) => item.accountId === accountId,
              );
              trackAccountAction("resume", "start", account?.platform);
              try {
                await resumeAccount(accountId);
                trackAccountAction("resume", "success", account?.platform);
              } catch (error2) {
                trackAccountAction(
                  "resume",
                  "failed",
                  account?.platform,
                  error2,
                );
                throw error2;
              }
            }}
            onAuthorize={(account) => {
              trackAccountAction("authorize", "start", account.platform);
              setAuthorizingAccount(account);
            }}
          />
        )}
      </section>
      <section>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">
              {t2("imBridge.preventSleep.title")}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {t2("imBridge.preventSleep.description")}
            </p>
          </div>
          <Switch
            checked={config2.preventSleep ?? false}
            onCheckedChange={(checked) => {
              trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                action: "prevent_sleep",
                result: "start",
                surface,
                enabled: checked,
              });
              void set2("preventSleep", checked)
                .then(() => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "success",
                    surface,
                    enabled: checked,
                  });
                })
                .catch((error2) => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "failed",
                    surface,
                    enabled: checked,
                    error_message: (error2 instanceof Error
                      ? error2.message
                      : String(error2)
                    ).slice(0, 200),
                  });
                });
            }}
            data-action-ui-id="im-bridge.prevent-sleep-toggle"
          />
        </div>
      </section>
    </div>
  );
}
