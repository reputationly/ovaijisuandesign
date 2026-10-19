// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====

// im-bridge-manager.jsx
import QRCode from "react-qr-code";
import { getRuntimeConfig } from "../infra/runtime-config.js";
import { usePlatform } from "../infra/platform-context.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Info$1 as Info } from "../media-editing/lucide-icon-wraps.js";
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
  mergeTailwindClasses as cn,
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
  const [state, setState] = reactExports.useState({
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
    const unsub = svc.onWechatQrState((update) => {
      if (update.sessionId !== sessionIdRef.current) return;
      setState((prev) => ({
        ...prev,
        status: update.status,
        qrcodeUrl: update.qrcodeUrl ?? prev.qrcodeUrl,
        isImageData: update.isImageData ?? prev.isImageData,
        message: update.message ?? null,
        errorReason: update.errorReason ?? null,
        accountId: update.accountId ?? null,
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
  const start = reactExports.useCallback(async (alias) => {
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
    state,
    start,
    cancel,
  };
}
function useFeishuQrLogin() {
  const [state, setState] = reactExports.useState({
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
  const applyQrEvent = reactExports.useCallback((update) => {
    setState((prev) => ({
      ...prev,
      status: update.status,
      qrcodeUrl: update.qrcodeUrl ?? prev.qrcodeUrl,
      message: update.message ?? null,
      errorReason: update.errorReason ?? null,
      accountId: update.accountId ?? null,
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
    const unsub = svc.onFeishuQrState((update) => {
      if (update.sessionId !== sessionIdRef.current) {
        const buf = pendingEventsRef.current.get(update.sessionId) ?? [];
        if (buf.length < 16) {
          buf.push(update);
          pendingEventsRef.current.set(update.sessionId, buf);
        }
        return;
      }
      applyQrEvent(update);
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
  const start = reactExports.useCallback(
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
    state,
    start,
    startUserAuth,
    cancel,
  };
}
const DEFAULT_ALIAS = {
  feishu: "Feishu",
  telegram: "Telegram",
  wechat: "WeChat",
  discord: "Discord",
  dingtalk: "DingTalk",
};
function localizeImDisplayName(displayName, locale) {
  if (isZhLocale(locale)) return displayName;
  return displayName
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
function trackConnectionFailure(action, platform, layout, error) {
  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
    action,
    result: "failed",
    surface: layout === "settings" ? "settings" : "dialog",
    platform,
    error_message: (error instanceof Error
      ? error.message
      : String(error)
    ).slice(0, 200),
  });
}
function QrConnectView({
  platform,
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
  const { t, i18n } = useTranslation();
  const titleKey = step === "auth" ? "authTitle" : "scanTitle";
  const descriptionKey =
    step === "auth" ? "authDescription" : "scanDescription";
  const agentLabel =
    agentName?.trim() ||
    t("settings.imBridge.addFlow.defaultAgentName.feishu");
  const isChineseLocale = isZhLocale(i18n.resolvedLanguage || i18n.language);
  const readyHintKey = `settings.imBridge.addFlow.${step === "auth" ? "authQrHint" : "scanQrHint"}.${platform}`;
  const readyHint = t(readyHintKey, {
    agentName: agentLabel,
  });
  const qrReadyHint = readyHint === readyHintKey ? void 0 : readyHint;
  return (
    <AddFlowFrame
      platform={platform}
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
            isChineseLocale ? "flex-wrap" : "flex-col",
          )}
        >
          <h3 className={addFlowTitleClassName(isChineseLocale)}>
            {t(`settings.imBridge.addFlow.${titleKey}.${platform}`)}
          </h3>
        </div>
        {platform === "feishu" && step === "auth" ? (
          <p className="mt-2 max-w-[480px] text-[13px] leading-relaxed text-muted-foreground">
            {t("settings.imBridge.addFlow.authDescription.action")}
          </p>
        ) : (
          <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">
            {t(`settings.imBridge.addFlow.${descriptionKey}.${platform}`)}
          </p>
        )}
        <QrCard
          platform={platform}
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
  platform,
  layout = "dialog",
  onDone,
  onDialogHeaderChange,
  agentName,
}) {
  const { t, i18n } = useTranslation();
  const label = t(`settings.imBridge.platform.${platform}`);
  const agentLabel =
    agentName?.trim() ||
    t("settings.imBridge.addFlow.defaultAgentName.feishu");
  const entityLabel =
    platform === "feishu"
      ? agentLabel
      : t("settings.imBridge.addFlow.defaultAgentName.wechat");
  const isChineseLocale = isZhLocale(i18n.resolvedLanguage || i18n.language);
  return (
    <AddFlowFrame
      platform={platform}
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
        data-action-ui-id={`im-bridge.${platform}.qr.success`}
      >
        <div className="flex flex-col">
          <h3 className={addFlowTitleClassName(isChineseLocale)}>
            {t(`settings.imBridge.addFlow.successTitle.${platform}`)}
          </h3>
          <div className="mx-4 mt-5 flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-card">
              <PlatformIcon
                platform={platform}
                label={label}
                className="size-9 rounded-md object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="min-w-0 truncate font-medium text-foreground text-sm">
                {t(`settings.imBridge.addFlow.accountSummary.${platform}`)}
              </p>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {t("settings.imBridge.addFlow.currentDevice")}
              </p>
            </div>
            <AgentEntityChip
              name={entityLabel}
              className="ml-auto max-w-[240px] shrink-0"
            />
          </div>
          <div className="mx-4 mt-4 rounded-lg bg-secondary/45 px-4 py-3.5 text-left">
            <p className="font-medium text-foreground text-sm">
              {t("settings.imBridge.addFlow.successGuide.title")}
            </p>
            <ol className="mt-2 flex flex-col gap-1 text-[13px] leading-snug text-muted-foreground">
              {[1, 2, 3, 4].map((index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-card text-[10px] leading-none text-foreground/70">
                    {index}
                  </span>
                  <span>
                    {t(
                      `settings.imBridge.addFlow.successGuide.${platform}.${index}`,
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <TutorialButton
              platform={platform}
              actionId={`im-bridge.${platform}.qr.guide`}
              label={t("settings.imBridge.addFlow.viewGuide")}
              variant="outline"
              size="default"
              className="w-28"
            />
            <Button
              type="button"
              size="default"
              className="w-28"
              onClick={onDone}
              data-action-ui-id={`im-bridge.${platform}.qr.done`}
            >
              {t("settings.imBridge.addFlow.done")}
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
  const { t, i18n } = useTranslation();
  const {
    state,
    start,
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
    void start(aliasRef.current || void 0);
  }, [start]);
  reactExports.useEffect(() => {
    return () => {
      if (authHandoffTimerRef.current !== null) {
        window.clearTimeout(authHandoffTimerRef.current);
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (state.status !== "confirmed") return;
    if (step === "scan") {
      if (!state.accountId) return;
      accountIdRef.current = state.accountId;
      scanSessionIdRef.current = state.sessionId;
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
      void startUserAuth(state.accountId);
      return;
    }
    if (state.sessionId && state.sessionId !== scanSessionIdRef.current) {
      setConfirmed(true);
    }
  }, [
    state.status,
    state.accountId,
    state.sessionId,
    step,
    startUserAuth,
    onConnected,
    refreshAccounts,
  ]);
  reactExports.useEffect(() => {
    if (state.status !== "error" && state.status !== "pending_approval")
      return;
    trackConnectionFailure(
      step === "auth" ? "authorize" : "connect",
      "feishu",
      layout,
      state.errorReason ?? state.status,
    );
  }, [layout, state.errorReason, state.status, step]);
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
  const displayStatus = authHandoffPending ? "loading" : state.status;
  const authLoading = step === "auth" && displayStatus === "loading";
  const authLoadingLabel = authLoading
    ? t("settings.imBridge.addFlow.transition.auth.feishu")
    : void 0;
  const qrNode =
    !authHandoffPending && state.status === "ready" && state.qrcodeUrl ? (
      <img
        src={state.qrcodeUrl}
        alt={t(
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
      errorReason={state.errorReason}
      qrNode={qrNode}
      canRetry={
        state.status === "error" || state.status === "pending_approval"
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
        void start(aliasRef.current || void 0);
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
  const { t } = useTranslation();
  const { state, startUserAuth, cancel } = useFeishuQrLogin();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const accountIdRef = reactExports.useRef(accountId);
  reactExports.useEffect(() => {
    void startUserAuth(accountIdRef.current);
  }, [startUserAuth]);
  reactExports.useEffect(() => {
    if (state.status === "confirmed") {
      setConfirmed(true);
    }
  }, [state.status]);
  reactExports.useEffect(() => {
    if (state.status !== "error" && state.status !== "pending_approval")
      return;
    trackConnectionFailure(
      "authorize",
      "feishu",
      layout,
      state.errorReason ?? state.status,
    );
  }, [layout, state.errorReason, state.status]);
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
    state.status === "ready" && state.qrcodeUrl ? (
      <img
        src={state.qrcodeUrl}
        alt={t("settings.imBridge.addFlow.qrAlt.feishuAuth")}
        className="size-full object-contain"
      />
    ) : null;
  return (
    <QrConnectView
      platform="feishu"
      step="auth"
      layout={layout}
      status={state.status}
      errorReason={state.errorReason}
      qrNode={qrNode}
      canRetry={
        state.status === "error" || state.status === "pending_approval"
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
      transitioningToStep={state.status === "loading" ? "auth" : void 0}
      transitionLabel={
        state.status === "loading"
          ? t("settings.imBridge.addFlow.transition.auth.feishu")
          : void 0
      }
      statusLabelOverride={
        state.status === "loading"
          ? t("settings.imBridge.addFlow.transition.auth.feishu")
          : void 0
      }
    />
  );
}
function FeishuSection({ alias, layout = "dialog", onClose, onConfirmed, onDialogHeaderChange, onConnected }) {
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
  const { t } = useTranslation();
  const { state, start, cancel } = useWechatQrLogin();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const aliasRef = reactExports.useRef(alias);
  const connectedNotifiedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    void start(aliasRef.current || void 0);
  }, [start]);
  reactExports.useEffect(() => {
    if (state.status === "confirmed") {
      if (!connectedNotifiedRef.current) {
        connectedNotifiedRef.current = true;
        void onConnected?.();
      }
      setConfirmed(true);
    }
  }, [state.status, onConnected]);
  reactExports.useEffect(() => {
    if (state.status !== "error") return;
    trackConnectionFailure(
      "connect",
      "wechat",
      layout,
      state.errorReason ?? state.status,
    );
  }, [layout, state.errorReason, state.status]);
  const showQr =
    (state.status === "ready" ||
      state.status === "scanned" ||
      state.status === "expired") &&
    state.qrcodeUrl;
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
    showQr && state.qrcodeUrl ? (
      state.isImageData ? (
        <img
          src={state.qrcodeUrl}
          alt={t("settings.imBridge.addFlow.qrAlt.wechat")}
          className="size-full object-contain"
        />
      ) : (
        <QRCode value={state.qrcodeUrl} size={208} />
      )
    ) : null;
  return (
    <QrConnectView
      platform="wechat"
      layout={layout}
      status={state.status}
      errorReason={state.errorReason}
      qrNode={qrNode}
      canRetry={state.status === "error"}
      onBack={() => {
        void cancel();
        onClose();
      }}
      onRetry={() => {
        void start(aliasRef.current || void 0);
      }}
      onDialogHeaderChange={onDialogHeaderChange}
    />
  );
}
function AddAccountForm({
  platform,
  onClose,
  onAdded,
  onDialogHeaderChange,
  onConnected,
  layout = "dialog",
}) {
  const { t } = useTranslation();
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
      data-action-ui-id={`im-bridge.add.${platform}`}
    >
      {platform === "feishu" && (
        <FeishuSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform === "wechat" && (
        <WechatQrSection
          alias=""
          layout={layout}
          onClose={onClose}
          onConfirmed={onAdded}
          onDialogHeaderChange={onDialogHeaderChange}
          onConnected={onConnected}
        />
      )}
      {platform === "telegram" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="im-bottoken" className="text-xs">
              {t("settings.imBridge.field.botToken")}
            </Label>
            <Input3
              id="im-bottoken"
              type="password"
              value={botToken}
              onChange={(changeEvent) => setBotToken(changeEvent.target.value)}
              placeholder={t("settings.imBridge.field.botTokenPlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSubmit} loading={submitting}>
              {t("settings.imBridge.add.submit")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function getAccountStatusHint(status) {
  const state = status?.state ?? "disconnected";
  if (status?.errorKind === "credential_corrupt") {
    return {
      key: "settings.imBridge.credentialError.rowHint",
      tone: "destructive",
    };
  }
  if (status?.lastError) {
    return null;
  }
  switch (state) {
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
function AccountMoreMenu({ accountId, onRemove }) {
  const { t } = useTranslation();
  return (
    <IntegrationMoreMenu
      triggerLabel={t("settings.imBridge.actions.more")}
      actionLabel={t("settings.imBridge.actions.remove")}
      actionIcon={<Icon icon={Trash2} size="sm" strokeWidth={1.5} />}
      onAction={onRemove}
      actionUiIds={{
        trigger: `im-bridge.row.${accountId}.more`,
        content: `im-bridge.row.${accountId}.more-popover`,
        bridge: `im-bridge.row.${accountId}.more-popover-hover-bridge`,
        action: `im-bridge.row.${accountId}.remove`,
      }}
    />
  );
}
function PlatformIconFrame({ platform, label }) {
  return (
    <IntegrationIconFrame>
      <PlatformIcon
        platform={platform}
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
  const state = status?.state ?? "disconnected";
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
  switch (state) {
    case "connected":
      return {
        key: "settings.imBridge.channel.status.connected",
        markerTone: "success",
        state,
        tone: "neutral",
      };
    case "connecting":
      return {
        key: "settings.imBridge.channel.status.connecting",
        markerTone: "warning",
        state,
        tone: "warning",
      };
    case "error":
      return {
        key: "settings.imBridge.channel.status.error",
        markerTone: "destructive",
        state,
        tone: "destructive",
      };
    case "disconnected":
      return {
        key: "settings.imBridge.channel.status.disconnected",
        markerTone: "muted",
        state,
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
  const { t } = useTranslation();
  return (
    <IntegrationStatusPill
      label={t(display.key)}
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
function AddableAccountRow({ option, onAdd }) {
  const { t } = useTranslation();
  const status = getPlatformStatusDisplay("notConnected");
  return (
    <IntegrationCard>
      <PlatformIconFrame platform={option.platform} label={option.label} />
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-medium text-[16px] text-foreground leading-none">
            {option.label}
          </p>
          <ConnectionStatusIndicator display={status} />
        </div>
        <p className="mt-2 truncate text-muted-foreground text-xs">
          {t(`settings.imBridge.channel.description.${option.platform}`)}
        </p>
      </div>
      <div className="shrink-0">
        <Button
          type="button"
          size="lg"
          className="h-8 min-w-20 px-3 text-sm font-medium"
          onClick={() => onAdd(option.platform)}
          data-action-ui-id={`im-bridge.empty.add.${option.platform}`}
        >
          {t("settings.imBridge.channel.action.connectPlatform", {
            platform: option.label,
          })}
        </Button>
      </div>
    </IntegrationCard>
  );
}
function TutorialLink({ platform, actionId, className }) {
  const { t } = useTranslation();
  const shellPlatform = usePlatform();
  const tutorialUrl = TUTORIAL_URL[platform];
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
      {t("settings.imBridge.tutorialLink")}
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
  onRemove,
  onPause,
  onResume,
  onAuthorize,
}) {
  const { t, i18n } = useTranslation();
  const platformLabel = t(`settings.imBridge.platform.${account.platform}`);
  const displayName =
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
      ? t("settings.imBridge.channel.subtitle.paused", {
          name: displayName,
        })
      : statusHint
        ? t(statusHint.key)
        : showConnectedGuide
          ? t(
              `settings.imBridge.channel.subtitle.connected.${connectedGuidePlatform}`,
            )
          : `${displayName}${!credentialError && status?.lastError ? ` • ${status.lastError}` : ""}`;
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
                    <span>{t("settings.imBridge.userAuth.hint")}</span>
                    <span>
                      {t("settings.imBridge.security.availabilityHint")}
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
            <span>{t("settings.imBridge.userAuth.action")}</span>
          </IntegrationActionButton>
        )}
        {!needsAuth && (
          <IntegrationLifecycleToggleButton
            type="button"
            inactive={account.paused}
            activeLabel={t("settings.imBridge.actions.pause")}
            inactiveLabel={t("settings.imBridge.actions.resume")}
            onClick={() => (account.paused ? onResume() : onPause())}
            data-action-ui-id={`im-bridge.row.${account.accountId}.${account.paused ? "resume" : "pause"}`}
          />
        )}
        <AccountMoreMenu accountId={account.accountId} onRemove={onRemove} />
      </IntegrationActionGroup>
    </IntegrationCard>
  );
}
function ConnectionList({
  platformOrder,
  accounts,
  statuses,
  addableOptions,
  onAdd,
  onRemove,
  onPause,
  onResume,
  onAuthorize,
}) {
  const accountsByPlatform = reactExports.useMemo(() => {
    const map = new Map();
    for (const account of accounts) {
      const existing = map.get(account.platform) ?? [];
      existing.push(account);
      map.set(account.platform, existing);
    }
    return map;
  }, [accounts]);
  const addableByPlatform = reactExports.useMemo(
    () => new Map(addableOptions.map((option) => [option.platform, option])),
    [addableOptions],
  );
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {platformOrder.flatMap((platform) => {
          const platformAccounts = accountsByPlatform.get(platform);
          if (platformAccounts?.length) {
            return platformAccounts.map((acc) => (
              <AccountRow
                key={acc.accountId}
                account={acc}
                status={statuses[acc.accountId]}
                onRemove={() => onRemove(acc.accountId)}
                onPause={() => onPause(acc.accountId)}
                onResume={() => onResume(acc.accountId)}
                onAuthorize={() => onAuthorize(acc)}
              />
            ));
          }
          const option = addableByPlatform.get(platform);
          return option
            ? [
                <AddableAccountRow
                  key={option.platform}
                  option={option}
                  onAdd={onAdd}
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
  const { t, i18n } = useTranslation();
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
  const { config, set } = useSettings();
  const [addingPlatform, setAddingPlatform] = reactExports.useState(null);
  const [authorizingAccount, setAuthorizingAccount] =
    reactExports.useState(null);
  const [updatingCredentials, setUpdatingCredentials] =
    reactExports.useState(false);
  const surface = layout === "settings" ? "settings" : "dialog";
  const trackAccountAction = (action, result, platform, error) => {
    trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
      action,
      result,
      surface,
      ...(platform
        ? {
            platform,
          }
        : {}),
      ...(error
        ? {
            error_message: (error instanceof Error
              ? error.message
              : String(error)
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
      new Map(platformOrder.map((platform, index) => [platform, index])),
    [platformOrder],
  );
  const sorted = reactExports.useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const rankDelta =
          (platformRank.get(a.platform) ?? Number.MAX_SAFE_INTEGER) -
          (platformRank.get(b.platform) ?? Number.MAX_SAFE_INTEGER);
        return rankDelta === 0 ? a.createdAt - b.createdAt : rankDelta;
      }),
    [accounts, platformRank],
  );
  const boundPlatforms = reactExports.useMemo(
    () => new Set(accounts.map((account) => account.platform)),
    [accounts],
  );
  const addableAccountOptions = reactExports.useMemo(() => {
    return addablePlatformOrder
      .filter(
        (platform) => available[platform] && !boundPlatforms.has(platform),
      )
      .map((platform) => ({
        platform,
        label: t(`settings.imBridge.platform.${platform}`),
      }));
  }, [addablePlatformOrder, available, boundPlatforms, t]);
  const hasCredentialError = reactExports.useMemo(
    () =>
      sorted.some(
        (account) => statuses[account.accountId]?.errorKind === "credential_corrupt",
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
              {t("settings.imBridge.hero.title")}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
              {t(`settings.imBridge.hero.description.${regionSuffix}`)}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t("settings.imBridge.connection.infoLabel")}
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
                  {t("settings.imBridge.executionNotice")}
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
            {t("settings.imBridge.loading")}
          </p>
        )}
        {error && !loading && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            {t("settings.imBridge.errors.listFailed", {
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
              {t("settings.imBridge.credentialUpdate.banner")}
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
                    t("settings.imBridge.credentialUpdate.success"),
                  );
                } catch (error) {
                  trackAccountAction(
                    "reset_credentials",
                    "failed",
                    void 0,
                    error,
                  );
                  dedupedToast.error(
                    t("settings.imBridge.credentialUpdate.failed"),
                  );
                } finally {
                  setUpdatingCredentials(false);
                }
              }}
              data-action-ui-id="im-bridge.credential-update"
            >
              {t("settings.imBridge.credentialUpdate.action")}
            </Button>
          </div>
        )}
        {!loading && !error && (
          <ConnectionList
            platformOrder={platformOrder}
            accounts={sorted}
            statuses={statuses}
            addableOptions={addableAccountOptions}
            onAdd={(platform) => {
              trackAccountAction("connect", "start", platform);
              setAddingPlatform(platform);
            }}
            onRemove={async (accountId) => {
              const account = sorted.find(
                (item) => item.accountId === accountId,
              );
              trackAccountAction("remove", "start", account?.platform);
              try {
                await removeAccount(accountId);
                trackAccountAction("remove", "success", account?.platform);
              } catch (error) {
                trackAccountAction(
                  "remove",
                  "failed",
                  account?.platform,
                  error,
                );
                dedupedToast.error(t("settings.imBridge.errors.removeFailed"));
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
              } catch (error) {
                trackAccountAction(
                  "pause",
                  "failed",
                  account?.platform,
                  error,
                );
                throw error;
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
              } catch (error) {
                trackAccountAction(
                  "resume",
                  "failed",
                  account?.platform,
                  error,
                );
                throw error;
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
              {t("imBridge.preventSleep.title")}
            </p>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              {t("imBridge.preventSleep.description")}
            </p>
          </div>
          <Switch
            checked={config.preventSleep ?? false}
            onCheckedChange={(checked) => {
              trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                action: "prevent_sleep",
                result: "start",
                surface,
                enabled: checked,
              });
              void set("preventSleep", checked)
                .then(() => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "success",
                    surface,
                    enabled: checked,
                  });
                })
                .catch((error) => {
                  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
                    action: "prevent_sleep",
                    result: "failed",
                    surface,
                    enabled: checked,
                    error_message: (error instanceof Error
                      ? error.message
                      : String(error)
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
