// feishu-qr-section.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  Check,
  TRACK_EVENTS,
  usePlatform,
  openExternalUrl,
  ArrowUpRight,
  Icon,
  Tooltip,
  TooltipTrigger,
  requireLib,
  getDefaultExportFromCjs$1,
  Bot,
  LoaderCircle,
} from "../vendor.js";
import {
  Button$1,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { RetryIcon } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useFeishuQrLogin,
  useImAccounts,
  useImStatuses,
  useWechatQrLogin,
} from "./use-feishu-qr-login.jsx";
var libExports = requireLib();
const QRCode = getDefaultExportFromCjs$1(libExports);
const DEFAULT_ALIAS = {
  feishu: "Feishu",
  telegram: "Telegram",
  wechat: "WeChat",
  discord: "Discord",
  dingtalk: "DingTalk",
};
function isZhLocale(locale) {
  return Boolean(locale?.toLowerCase().startsWith("zh"));
}
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
export function getAccountDisplayName(account, status, locale) {
  const platformName = status?.botDisplayName?.trim();
  if (platformName) return localizeImDisplayName(platformName, locale);
  const alias = account?.alias.trim();
  if (!account || !alias || alias === DEFAULT_ALIAS[account.platform]) return void 0;
  return localizeImDisplayName(alias, locale);
}
const feishuIcon =
  "data:image/webp;base64,UklGRsoFAABXRUJQVlA4IL4FAADQIQCdASqAAIAAPlEijkQjoiGXS90IOAUEoA1IoufwGpaeD/KfpBuPfA3M7IB6zv4vnw9QH519Bz/VdSPzFfth+x3vVeh7/d+oB/gOod9ADy3PZN/cr0qtVJ8x9l+PrGIW53VGZGqgGo+QCjA9l/o3IaO9FcWQoir3pqotbIgUQCNPAI0iR/RBibJbQpC4rAs2GKG98nD5BKkrooK2rKKCZaX/WesrxdvrfhDTa7D8TzCQQtn0esCpl1gF+6cok8IUPhtLv9cBcno7PmoE/qTBbykBEgsw9RPFbgb4untmD7jm9SM/m3NHRknw6OGmRPf55jUhdDH11cwN6GpaXm8u11gekVb058KZNnj97Knd9WZvDu4e2gAA/v3AgACXucPEd1TggozyAZjWGZWva9XWwIeWjQAFCRnQZZI5Bnjb0KaFISpIkLLXnZoxk+bmRod/jz9tDyFF49zg783PYx/UCUZJGgODvEjkA5dQF36ePOSHdJWeH1qgBei1cBMHk/8i1XQXCVn7EMo0hZbz9VOrqUgfWDQjo0uT5ZbN/W5scxNyWGNOIE+9+Qwoqbcuv76C4EuT1tV2/FFyIdfNc2kXnTq/dLTStxNdzWti0stbGXb1T0VQp8r9I792ynK2W/b/kuoLq/X/Jk8GVuTXc8bN1bhucgHFFPnKy3hACT8rYRtcZG4nzhS+Y5M2ze7ov3A6wQyOdAz3ROXd9PyZBGw5A5Gm7AnKcF1VEKr/bkiMvxn62fLX/qHxnvifn0jX3kSqZ5v4aMcfmNrrGCgxYJtRbj6PYYHK0EOWAzM9SMEnHtKFQ+4sNgM7rlkfzPwYSF5+lNvFkI7YLfw5OdGp5qOoa85na1arm+MR2Nd++08781jPzpaQuS5Xe3v6f9vL1K1B1ryfamT8BI+m0U4hpdOhcR9ueaehbkVvn/mjT5aGe7/TmgQrjEGm6u345YYWpxKNXp8zed293bo4rP2WIu58+GJNEwWkj90OJuu0p14n3JaZmalHpuJELvTQBu2O3izALVtWCmi/SRHxwsRZ/8OkxlE529rbrMTpmnd1R943daUOjsS5Jja2ohtFvZyMuTLS4TQTG95Npcg8TjPlRO7h6Ra+/GLOuDCLR9Kr1wOEFMErBu0eTV5XKAZIDgl8hy+h8At9N4NRv6hGMJj9Ky5ef1SQpRfSuF4q8t+maffydOSauSpAImieeuvAG8K0gNCHfENqofiD5/9nEciggfkTF7F35ZxICyu5WnTwUSSnPPoxhStM9qPg4px2xUty4MoX3N0ScbWU8+2Pn2/mnd0ZL++LSiOVhAxTH14Se7vnu6wnM8aPYuXVooqf4PSreI6jYfWWz5iKM9mPRej90+m55hXlQzRjSk5/7+Z8/eIrYXGFA4sasZs/1gBlemkqgCzTQwnOcLopD4qQj+aSS/lLG9hkAGcLqkUuusi77VhLmnnNuYhyAsVUj8QgbLcB5qDWOkue4AWy28aLRFeWsULAUVmftgvbQvQDrzK+z9TnxRZLkM1spsG/eVs65JHXxofZNwbkfr7m0s/0LUvLLWTeX7i6aDq+A3qiz/fU9vIVVAM5+Hz2KQqGjkvpHZy/aPg8IcWTv7wbasDwJS+L9rho4KHO4GuGP/sZJ4DMD8q6ea8fIqXnQQlQ3ScwQOAk17KB4Xorn97NMELN5095uoeRuIlJ+qNqBBtHpbwqejY10GuPhq4Dd39T5XdIwHrX2Bk1WNZXNbgVtAIXATTOVHq4lc4j4Pw5uOocI2StirMSmxS1oPmXl8tDVVZly3+Lp9+FbvPd5/aB+6+HAE4jjbzN/Ye7CCNLKHFlJwLzk4bFZ00OZEzsger1GsUsOC0tai8/dz5cptvQA8AwAA0xvuBejvdtP+udqb9QO82oh0ljrYw/Cd7z8FNF9lyXOEkoEP2JxAUxsrAdxAhdKFJnSI5pOVZGNn7pQqvnTZYAAAA=";
const wechatIcon =
  "data:image/webp;base64,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";
const PLATFORM_ICON_SRC = {
  feishu: feishuIcon,
  wechat: wechatIcon,
};
export function PlatformIcon({ platform: platform2, label, className }) {
  const iconSrc = PLATFORM_ICON_SRC[platform2];
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={cn$2("size-4 shrink-0 object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn$2(
        "flex size-4 shrink-0 items-center justify-center rounded-sm bg-secondary text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}
function qrStatusLabel(t2, platform2, status, errorReason) {
  const ns2 = `settings.imBridge.${platform2}.qr.status`;
  if (status === "pending_approval") {
    return t2(`${ns2}.pendingApproval`);
  }
  if (status === "error") {
    if (errorReason && errorReason !== "unknown") {
      const specific = t2(`${ns2}.error.${errorReason}`);
      if (specific && specific !== `${ns2}.error.${errorReason}`) return specific;
    }
    return t2(`${ns2}.error`);
  }
  return t2(`${ns2}.${status}`);
}
const TUTORIAL_URL$1 = {
  wechat: "https://my.feishu.cn/wiki/UqkAwo1tMi050hkDlnic4a1Tntf",
  feishu: "https://my.feishu.cn/wiki/OAmLwbUOsiGOfSk8sB8c3klinPd",
};
const AUTH_HANDOFF_MIN_MS = 900;
export function trackConnectionFailure(action, platform2, layout, error) {
  trackEvent(TRACK_EVENTS.IM_BRIDGE_ACCOUNT_ACTION, {
    action,
    result: "failed",
    surface: layout === "settings" ? "settings" : "dialog",
    platform: platform2,
    error_message: (error instanceof Error ? error.message : String(error)).slice(0, 200),
  });
}
function AddFlowFrame({
  platform: platform2,
  step,
  children: children2,
  layout = "dialog",
  onBack,
  onDialogHeaderChange,
  transitioningToStep,
  transitionLabel,
}) {
  const { t: t2 } = useTranslation();
  const title = t2(`settings.imBridge.addFlow.title.${platform2}`);
  const onBackRef = reactExports.useRef(onBack);
  reactExports.useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);
  reactExports.useEffect(() => {
    if (!onDialogHeaderChange) return;
    onDialogHeaderChange({
      title,
      onBack: () => onBackRef.current(),
    });
    return () => onDialogHeaderChange(null);
  }, [onDialogHeaderChange, title]);
  return (
    <div
      className={cn$2(
        "flex min-h-full flex-1 flex-col duration-150 animate-in fade-in-0 slide-in-from-right-4",
        layout === "settings" ? "gap-0 pt-5" : "gap-6",
      )}
      data-action-ui-id={`im-bridge.${platform2}.flow`}
    >
      <StepIndicator
        platform={platform2}
        step={step}
        transitioningToStep={transitioningToStep}
        transitionLabel={transitionLabel}
      />
      {children2}
    </div>
  );
}
function StepIndicator({ platform: platform2, step, transitioningToStep, transitionLabel }) {
  const { t: t2 } = useTranslation();
  const stepKeys = platform2 === "feishu" ? ["scan", "auth", "done"] : ["scan", "done"];
  const activeIndex = Math.max(stepKeys.indexOf(step), 0);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-3">
        {stepKeys.map((key2, index2) => {
          const state2 =
            index2 < activeIndex ? "done" : index2 === activeIndex ? "active" : "pending";
          const shouldPulse = state2 === "active" && key2 === "auth";
          const shouldFlowLine = transitioningToStep === stepKeys[index2 + 1];
          return (
            <div key={key2} className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn$2(
                        "group/step relative isolate inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        state2 === "active" && "font-medium text-foreground",
                        state2 === "done" && "text-foreground/70 hover:text-foreground",
                        state2 === "pending" && "text-muted-foreground hover:text-foreground",
                      )}
                    />
                  }
                >
                  <span
                    className={cn$2(
                      "relative isolate flex h-4 min-w-12 items-center justify-center rounded-full px-2 text-[10px] font-medium leading-none transition-colors",
                      state2 === "active" &&
                        "bg-foreground text-background group-hover/step:bg-foreground/90",
                      state2 === "done" &&
                        "min-w-8 bg-secondary text-foreground/70 group-hover/step:bg-secondary/80 group-hover/step:text-foreground",
                      state2 === "pending" &&
                        "bg-secondary text-muted-foreground group-hover/step:bg-secondary/80",
                    )}
                  >
                    {shouldPulse && (
                      <span
                        aria-hidden="true"
                        className="absolute -inset-px -z-10 rounded-full border border-foreground/10 bg-foreground/[0.02] motion-safe:animate-[im-status-radar_3600ms_ease-out_infinite]"
                      />
                    )}
                    {state2 === "done" ? (
                      <Icon icon={Check} size="xs" strokeWidth={2} />
                    ) : (
                      t2(`settings.imBridge.addFlow.stepOrdinal.${index2 + 1}`)
                    )}
                  </span>
                  <span className="leading-none">
                    {t2(
                      getStepLabelKey({
                        platform: platform2,
                        state: state2,
                        step: key2,
                      }),
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-center leading-relaxed">
                  <StepHintContent platform={platform2} step={key2} />
                </TooltipContent>
              </Tooltip>
              {index2 < stepKeys.length - 1 && (
                <span
                  className={cn$2(
                    "h-px w-16 bg-border",
                    shouldFlowLine &&
                      "bg-[linear-gradient(90deg,var(--border)_0%,var(--border)_35%,color-mix(in_srgb,var(--foreground)_42%,var(--border))_50%,var(--border)_65%,var(--border)_100%)] bg-[length:200%_100%] motion-safe:animate-[im-step-line-flow_1400ms_linear_infinite]",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
      {transitionLabel && (
        <p
          className="text-center text-[11px] leading-relaxed text-muted-foreground"
          data-action-ui-id={`im-bridge.${platform2}.step-transition`}
        >
          {transitionLabel}
        </p>
      )}
    </div>
  );
}
function getStepLabelKey({ platform: platform2, state: state2, step }) {
  if (state2 === "done") {
    if (step === "scan") return `settings.imBridge.addFlow.stepDone.scan.${platform2}`;
    if (step === "auth") return `settings.imBridge.addFlow.stepDone.auth.${platform2}`;
  }
  return step === "scan"
    ? `settings.imBridge.addFlow.step.scan.${platform2}`
    : `settings.imBridge.addFlow.step.${step}`;
}
function StepHintContent({ platform: platform2, step }) {
  const { t: t2 } = useTranslation();
  const hintKey =
    step === "scan"
      ? `settings.imBridge.addFlow.stepHint.scan.${platform2}`
      : `settings.imBridge.addFlow.stepHint.${step}.${platform2}`;
  return <>{t2(hintKey)}</>;
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
  const descriptionKey = step === "auth" ? "authDescription" : "scanDescription";
  const agentLabel = agentName?.trim() || t2("settings.imBridge.addFlow.defaultAgentName.feishu");
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
        className={cn$2(
          "mx-auto flex w-full max-w-[520px] flex-col items-center text-center",
          layout === "settings" ? "flex-none pt-10" : "flex-1 justify-center",
        )}
      >
        <div
          className={cn$2(
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
function AgentEntityChip({ name: name2, size: size2 = "default", className }) {
  return (
    <span
      className={cn$2(
        "inline-flex min-w-0 max-w-[220px] items-center rounded-full border font-medium",
        "border-brand-accent/20 bg-brand-accent/10 text-brand-accent",
        size2 === "lg"
          ? "max-w-[260px] gap-1.5 px-3 py-1 text-[15px]"
          : "gap-1 px-2.5 py-1 text-[13px]",
        className,
      )}
    >
      <Icon icon={Bot} size={size2 === "lg" ? "md" : "sm"} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{name2}</span>
    </span>
  );
}
function addFlowTitleClassName(isChineseLocale2) {
  return cn$2(
    "max-w-full break-words text-center font-heading text-[20px] font-medium leading-tight text-foreground",
    isChineseLocale2 && "tracking-[0.03em]",
  );
}
function QrCard({
  platform: platform2,
  status,
  errorReason,
  canRetry,
  onRetry,
  readyHint,
  statusLabelOverride,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const label =
    statusLabelOverride ??
    (status
      ? qrStatusLabel(t2, platform2, status, errorReason)
      : t2(`settings.imBridge.${platform2}.qr.status.loading`));
  const footerLabel = status === "ready" && readyHint ? readyHint : label;
  const hasQr = Boolean(children2);
  const isLoading = status === null || status === "loading";
  const isScanned = status === "scanned";
  const showMask = hasQr && (status === "error" || status === "expired" || isScanned);
  const showStatusBelowQr = hasQr && !showMask;
  return (
    <div className="mt-5 flex flex-col items-center">
      <div
        className="relative flex size-60 items-center justify-center overflow-hidden rounded-2xl bg-secondary/60 p-2"
        data-action-ui-id={`im-bridge.${platform2}.qrcode`}
      >
        {hasQr ? (
          <div className="flex size-full items-center justify-center rounded-lg bg-card p-2">
            {children2}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isLoading && (
              <Icon
                icon={LoaderCircle}
                size="md"
                strokeWidth={1.5}
                className="animate-spin text-muted-foreground"
              />
            )}
            <span
              className={cn$2(
                "text-center text-xs leading-relaxed",
                status === "error" && "text-destructive",
                status === "pending_approval" && "text-warning",
                status !== "error" && status !== "pending_approval" && "text-muted-foreground",
              )}
              data-action-ui-id={`im-bridge.${platform2}.qr.status`}
            >
              {label}
            </span>
            {canRetry && (
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                data-action-ui-id={`im-bridge.${platform2}.qr.retry`}
              >
                <RetryIcon size={14} />
                {t2(`settings.imBridge.${platform2}.qr.retry`)}
              </Button$1>
            )}
          </div>
        )}
        {showMask && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/70 px-6 text-center text-background backdrop-blur-[1px]">
            {isScanned && (
              <Icon icon={LoaderCircle} size="md" strokeWidth={1.5} className="animate-spin" />
            )}
            <span
              className="max-w-44 text-xs leading-relaxed"
              data-action-ui-id={`im-bridge.${platform2}.qr.mask-status`}
            >
              {label}
            </span>
            {canRetry && (
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                className="bg-background"
                onClick={onRetry}
                data-action-ui-id={`im-bridge.${platform2}.qr.mask-retry`}
              >
                <RetryIcon size={14} />
                {t2(`settings.imBridge.${platform2}.qr.retry`)}
              </Button$1>
            )}
          </div>
        )}
      </div>
      {showStatusBelowQr && (
        <p
          className={cn$2(
            "mt-4 max-w-[480px] text-center text-xs leading-relaxed",
            status === "error" && "text-destructive",
            status === "pending_approval" && "text-warning",
            status !== "error" && status !== "pending_approval" && "text-muted-foreground",
          )}
          data-action-ui-id={`im-bridge.${platform2}.qr.status`}
        >
          {footerLabel}
        </p>
      )}
    </div>
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
  const agentLabel = agentName?.trim() || t2("settings.imBridge.addFlow.defaultAgentName.feishu");
  const entityLabel =
    platform2 === "feishu" ? agentLabel : t2("settings.imBridge.addFlow.defaultAgentName.wechat");
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
        className={cn$2(
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
            <AgentEntityChip name={entityLabel} className="ml-auto max-w-[240px] shrink-0" />
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
                  <span>{t2(`settings.imBridge.addFlow.successGuide.${platform2}.${index2}`)}</span>
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
            <Button$1
              type="button"
              size="default"
              className="w-28"
              onClick={onDone}
              data-action-ui-id={`im-bridge.${platform2}.qr.done`}
            >
              {t2("settings.imBridge.addFlow.done")}
            </Button$1>
          </div>
        </div>
      </div>
    </AddFlowFrame>
  );
}
function TutorialButton({
  platform: platform2,
  actionId,
  label,
  variant,
  size: size2 = "sm",
  className,
}) {
  const shellPlatform = usePlatform();
  const tutorialUrl = TUTORIAL_URL$1[platform2];
  if (!tutorialUrl) return null;
  return (
    <Button$1
      type="button"
      variant={variant}
      size={size2}
      className={cn$2(
        "gap-1",
        variant === "ghost" && "text-brand-accent hover:text-brand-accent",
        className,
      )}
      onClick={() => {
        void openExternalUrl(shellPlatform, tutorialUrl, {
          source: "im-bridge.tutorial",
        });
      }}
      data-action-ui-id={actionId}
    >
      {label}
      <Icon icon={ArrowUpRight} size="sm" strokeWidth={2} />
    </Button$1>
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
  const { state: state2, start: start2, startUserAuth, cancel } = useFeishuQrLogin();
  const { accounts, refresh: refreshAccounts } = useImAccounts();
  const statuses = useImStatuses();
  const [step, setStep] = reactExports.useState("scan");
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [authHandoffPending, setAuthHandoffPending] = reactExports.useState(false);
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
    if (state2.status !== "error" && state2.status !== "pending_approval") return;
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
        alt={t2(`settings.imBridge.addFlow.qrAlt.${step === "auth" ? "feishuAuth" : "feishu"}`)}
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
      canRetry={state2.status === "error" || state2.status === "pending_approval"}
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
export function FeishuUserAuthFlow({
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
    if (state2.status !== "error" && state2.status !== "pending_approval") return;
    trackConnectionFailure("authorize", "feishu", layout, state2.errorReason ?? state2.status);
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
      canRetry={state2.status === "error" || state2.status === "pending_approval"}
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
export function FeishuSection({
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
export function WechatQrSection({
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
    trackConnectionFailure("connect", "wechat", layout, state2.errorReason ?? state2.status);
  }, [layout, state2.errorReason, state2.status]);
  const showQr =
    (state2.status === "ready" || state2.status === "scanned" || state2.status === "expired") &&
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
