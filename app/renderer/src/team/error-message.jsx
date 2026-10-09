// error-message.jsx
import {
  classifyRawErrorText,
  ErrorCodes,
} from "../generation/normalize-skill-detail-metadata.js";
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  guardAccountSubmission,
  jsxRuntimeExports,
  KeyRound,
  reactExports,
  ServerOff,
  ShieldAlert,
  usePlatform,
  useTranslation,
  WifiOff,
  Zap,
} from "../vendor.js";
import { Upload } from "../media-editing/package.jsx";
import { INSUFFICIENT_BALANCE_TEXT_PATTERN } from "../generation/to-workspace-browser-url.js";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAccountSubmissionDecision } from "../assets/gateway-scope-provider.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { BillingInsufficientCard } from "./billing-insufficient-card.jsx";
import { useMpSubscribeUrl } from "./hailuo-credit-row.jsx";
import { FeedbackButton } from "../settings/use-direct-feedback.jsx";
import { ErrorBlock } from "../text-editor/error-block.jsx";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
function ChatErrorActionButton({ action, label }) {
  const platform2 = usePlatform();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const handleClick2 = () => {
    if (action.kind === "external-link") {
      const decision = guardAccountSubmission("personal_checkout");
      if (!decision.allowed) return;
      void openExternalUrl(platform2, action.url, {
        source: "chat.error-action",
      });
    }
  };
  return (
    <Button
      variant="outline"
      size="xs"
      disabled={!checkoutDecision.allowed}
      title={checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode}
      onClick={handleClick2}
    >
      {label}
      <ExternalLink data-icon="inline-end" />
    </Button>
  );
}
function isInsufficientBalanceError(msg) {
  if (
    msg.error?.error_code === ErrorCodes.MODEL_PROVIDER_ERROR ||
    msg.error?.error_code === ErrorCodes.MODEL_PROVIDER_AUTH_FAILED
  )
    return false;
  if (msg.error?.error_code === ErrorCodes.BILLING_INSUFFICIENT_BALANCE)
    return true;
  const errorText = `${msg.error?.user_message ?? ""} ${msg.content ?? ""}`;
  return INSUFFICIENT_BALANCE_TEXT_PATTERN.test(errorText);
}
function isAuthExpiredError(msg) {
  return msg.error?.error_code === ErrorCodes.AUTH_EXPIRED;
}
const errorActionRules = [
  {
    match: isInsufficientBalanceError,
    derive: (_msg, options) => {
      if (!options.subscribeUrl) {
        return {
          actions: [],
          showFeedback: false,
        };
      }
      return {
        actions: [
          {
            id: "top-up",
            kind: "external-link",
            labelKey: "credits.topUp",
            url: options.subscribeUrl,
          },
        ],
        showFeedback: false,
      };
    },
  },
  {
    // AUTH_EXPIRED — token 过期需要重新登录，属于用户态问题，
    // 不属于产品 bug；反馈数据无价值。重新登录流程由 main/auth 模块独立触发。
    match: isAuthExpiredError,
    derive: () => ({
      actions: [],
      showFeedback: false,
    }),
  },
];
function getChatErrorActions(msg, options) {
  const rule = errorActionRules.find((r2) => r2.match(msg));
  if (rule) return rule.derive(msg, options);
  return {
    actions: [],
    showFeedback: !(msg.error?.retryable ?? false),
  };
}
const ERROR_CODE_I18N = {
  [ErrorCodes.NETWORK_TIMEOUT]: "chat.errors.networkTimeout",
  [ErrorCodes.NETWORK_UNREACHABLE]: "chat.errors.networkUnavailable",
  [ErrorCodes.NETWORK_DNS_FAILED]: "chat.errors.networkUnavailable",
  [ErrorCodes.RUNTIME_CANCELLED]: "chat.cancelled",
  [ErrorCodes.RUNTIME_SESSION_ERROR]: "chat.errors.runtimeSession",
  [ErrorCodes.CONTENT_BLOCKED]: "chat.errors.contentBlocked",
  [ErrorCodes.RUNTIME_CONNECTION_LOST]: "chat.errors.runtimeConnectionLost",
  [ErrorCodes.RUNTIME_STREAM_ERROR]: "chat.errors.runtimeStream",
  [ErrorCodes.RUNTIME_NOT_READY]: "chat.errors.runtimeNotReady",
  [ErrorCodes.RUNTIME_TOOLS_UNAVAILABLE]: "chat.errors.runtimeToolsUnavailable",
  // 02: zero-provider errors with a valid token are config-fetch failures —
  // show a friendly retryable message instead of the raw "no providers found".
  [ErrorCodes.PROVIDERS_UNAVAILABLE]: "chat.errors.providersUnavailable",
  [ErrorCodes.AUTH_EXPIRED]: "chat.errors.authExpired",
  [ErrorCodes.MODEL_PROVIDER_AUTH_FAILED]:
    "chat.errors.modelProviderAuthFailed",
  [ErrorCodes.STORAGE_FULL]: "chat.errors.storageFull",
  [ErrorCodes.BILLING_INSUFFICIENT_BALANCE]:
    "chat.errors.billingInsufficientBalance",
  [ErrorCodes.GATEWAY_INTERNAL]: "chat.errors.genericDetail",
  [ErrorCodes.GATEWAY_UPSTREAM_ERROR]: "chat.errors.genericDetail",
  [ErrorCodes.GATEWAY_UPSTREAM_TRUNCATED]: "chat.errors.runtimeStream",
};
const MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX = "message_delivery_stage:";
const RAW_AGENT_STALLED_ERROR =
  "Agent turn stalled with no progress; aborted by watchdog.";
const RUNTIME_ERROR_CODE_PREFIX = "RUNTIME_";
function isRuntimeErrorCode(code2) {
  return code2?.startsWith(RUNTIME_ERROR_CODE_PREFIX) ?? false;
}
const RAW_ERROR_CLASS_I18N = {
  concurrency: "canvas.errors.concurrency",
  interrupted: "chat.errors.interrupted",
  timeout: "chat.errors.networkTimeout",
  network: "chat.errors.networkUnavailable",
  storage: "chat.errors.storageFull",
  technical: "chat.errors.genericDetail",
};
function messageDeliveryStageFromDetails(details) {
  if (!details?.startsWith(MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX)) return void 0;
  const stage = details
    .slice(MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX.length)
    .split(/\s|\n/, 1)[0];
  switch (stage) {
    case "gateway_validation":
    case "runtime_send":
    case "runtime_timeout":
    case "bridge_error":
      return stage;
    default:
      return void 0;
  }
}
function presentationFor(code2, isGenerationStalled) {
  if (isGenerationStalled) {
    return {
      titleKey: "chat.errors.title.generationStalled",
      Icon: Zap,
    };
  }
  switch (code2) {
    case ErrorCodes.BILLING_INSUFFICIENT_BALANCE:
      return {
        titleKey: "chat.errors.title.billing",
        Icon: CreditCard,
      };
    case ErrorCodes.MODEL_PROVIDER_ERROR:
      return {
        titleKey: "chat.errors.title.modelProviderError",
        Icon: AlertCircle,
      };
    case ErrorCodes.MODEL_PROVIDER_AUTH_FAILED:
      return {
        titleKey: "chat.errors.title.modelProviderAuthFailed",
        Icon: KeyRound,
      };
    case ErrorCodes.AUTH_EXPIRED:
      return {
        titleKey: "chat.errors.title.authExpired",
        Icon: KeyRound,
      };
    case ErrorCodes.RUNTIME_CANCELLED:
      return {
        titleKey: "chat.errors.title.cancelled",
        Icon: AlertCircle,
      };
    case ErrorCodes.CONTENT_BLOCKED:
      return {
        titleKey: "chat.errors.title.contentBlocked",
        Icon: ShieldAlert,
      };
    case ErrorCodes.NETWORK_TIMEOUT:
      return {
        titleKey: "chat.errors.title.networkTimeout",
        Icon: WifiOff,
      };
    case ErrorCodes.NETWORK_UNREACHABLE:
    case ErrorCodes.NETWORK_DNS_FAILED:
      return {
        titleKey: "chat.errors.title.networkUnavailable",
        Icon: WifiOff,
      };
    case ErrorCodes.CLIENT_WS_ERROR:
    case ErrorCodes.CLIENT_WS_RECONNECT_FAILED:
      return {
        titleKey: "chat.errors.title.network",
        Icon: WifiOff,
      };
    case ErrorCodes.RUNTIME_CONNECTION_LOST:
      return {
        titleKey: "chat.errors.title.runtimeConnectionLost",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_NOT_READY:
      return {
        titleKey: "chat.errors.title.runtimeNotReady",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_TOOLS_UNAVAILABLE:
      return {
        titleKey: "chat.errors.title.runtimeToolsUnavailable",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_SESSION_ERROR:
      return {
        titleKey: "chat.errors.title.runtimeSession",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_STREAM_ERROR:
      return {
        titleKey: "chat.errors.title.runtimeStream",
        Icon: ServerOff,
      };
    case ErrorCodes.PROVIDERS_UNAVAILABLE:
      return {
        titleKey: "chat.errors.title.providersUnavailable",
        Icon: WifiOff,
      };
    case ErrorCodes.CLIENT_UPLOAD_FAILED:
      return {
        titleKey: "chat.errors.title.upload",
        Icon: Upload,
      };
    case ErrorCodes.GATEWAY_INTERNAL:
    case ErrorCodes.GATEWAY_UPSTREAM_ERROR:
      return {
        titleKey: "chat.errors.title.runtime",
        Icon: AlertCircle,
      };
    default:
      if (isRuntimeErrorCode(code2)) {
        return {
          titleKey: "chat.errors.title.runtime",
          Icon: ServerOff,
        };
      }
      return {
        titleKey: "chat.errors.title.generic",
        Icon: AlertCircle,
      };
  }
}
function suffixFor(retryable, code2) {
  if (code2 === ErrorCodes.RUNTIME_CANCELLED)
    return "chat.errors.suffix.cancelled";
  if (
    code2 === ErrorCodes.BILLING_INSUFFICIENT_BALANCE ||
    code2 === ErrorCodes.AUTH_EXPIRED
  ) {
    return "chat.errors.suffix.actionRequired";
  }
  if (code2 === ErrorCodes.MODEL_PROVIDER_AUTH_FAILED)
    return "chat.errors.suffix.actionRequired";
  if (retryable) return "chat.errors.suffix.retry";
  return "chat.errors.suffix.failed";
}
function fallbackDetailFor(rawDetail, t2) {
  if (!rawDetail) return t2("chat.errors.serverError");
  const rawClass = classifyRawErrorText(rawDetail);
  if (rawClass) return t2(RAW_ERROR_CLASS_I18N[rawClass]);
  return rawDetail;
}
function localizeModelProviderDetail(rawDetail, language2, t2) {
  if (!language2.toLowerCase().startsWith("zh")) return rawDetail;
  return rawDetail
    .split(/\r?\n/)
    .map((line) => {
      const detail = line.trim();
      if (/^Method Not Allowed(?::.*)?$/i.test(detail)) {
        return t2("chat.errors.modelProviderMethodNotAllowed");
      }
      if (/^FUNCTION_INVOCATION_FAILED$/i.test(detail)) {
        return t2("chat.errors.modelProviderInvocationFailed");
      }
      return line;
    })
    .join("\n");
}
export function ErrorMessage({ msg, onRetry, retrying = false }) {
  const { t: t2, i18n } = useTranslation();
  const errorCode = msg.error?.error_code;
  const deliveryStage = messageDeliveryStageFromDetails(msg.error?.details);
  const rawDetail = (msg.error?.user_message ?? msg.content ?? "").trim();
  const isGenerationStalled =
    deliveryStage === "runtime_timeout" ||
    rawDetail === RAW_AGENT_STALLED_ERROR;
  const i18nKey = isGenerationStalled
    ? "chat.errors.generationStalled"
    : errorCode
      ? (ERROR_CODE_I18N[errorCode] ??
        (isRuntimeErrorCode(errorCode) ? "chat.errors.genericDetail" : void 0))
      : void 0;
  const isModelProviderError = errorCode === ErrorCodes.MODEL_PROVIDER_ERROR;
  const detailText = redactForCurrentRegion(
    isModelProviderError && rawDetail
      ? localizeModelProviderDetail(rawDetail, i18n.language, t2)
      : i18nKey
        ? t2(i18nKey)
        : fallbackDetailFor(rawDetail, t2),
  );
  const retryable = msg.error?.retryable ?? false;
  const isRetrying = retryable && retrying;
  const subscribeUrl = useMpSubscribeUrl();
  const retryDecision = useAccountSubmissionDecision("retry");
  const { actions, showFeedback } = getChatErrorActions(msg, {
    subscribeUrl,
  });
  const presentation = presentationFor(errorCode, isGenerationStalled);
  const isRuntimeConnectionError = presentation.Icon === ServerOff;
  const suffix = t2(suffixFor(retryable, errorCode));
  const hasActions =
    actions.length > 0 || (retryable && !!onRetry) || showFeedback;
  const errorContext = reactExports.useMemo(() => {
    if (!showFeedback) return void 0;
    return {
      error_code: errorCode,
      message_id: msg.id,
      ...(msg.error?.details
        ? {
            details: msg.error.details,
          }
        : {}),
    };
  }, [showFeedback, errorCode, msg.error?.details, msg.id]);
  if (isInsufficientBalanceError(msg)) {
    const billing = msg.error?.billing;
    return (
      <BillingInsufficientCard
        estimate={
          billing
            ? {
                ...(billing.estimated_credits !== void 0
                  ? {
                      estimatedCredits: billing.estimated_credits,
                    }
                  : {}),
                ...(billing.current_credits !== void 0
                  ? {
                      currentCredits: billing.current_credits,
                    }
                  : {}),
                ...(billing.shortfall_credits !== void 0
                  ? {
                      shortfallCredits: billing.shortfall_credits,
                    }
                  : {}),
              }
            : void 0
        }
        onRetry={onRetry ? () => onRetry() !== false : void 0}
      />
    );
  }
  const actionsNode =
    actions.length > 0 || (retryable && onRetry) || showFeedback ? (
      <>
        {actions.map((action) => (
          <ChatErrorActionButton
            key={action.id}
            action={action}
            label={t2(action.labelKey)}
          />
        ))}
        {retryable && onRetry && (
          <Button
            variant={isRuntimeConnectionError ? "outline" : void 0}
            size={isRuntimeConnectionError ? "default" : "xs"}
            className={
              isRuntimeConnectionError
                ? "min-w-18 rounded-md hover:border-foreground hover:bg-background active:not-aria-[haspopup]:translate-y-0"
                : void 0
            }
            disabled={isRetrying || !retryDecision.allowed}
            aria-busy={isRetrying}
            title={retryDecision.allowed ? void 0 : retryDecision.reasonCode}
            data-action-ui-id="chat.error.retry"
            onClick={() => {
              const decision = guardAccountSubmission("retry");
              if (decision.allowed) onRetry();
            }}
          >
            {t2(isRetrying ? "chat.retrying" : "chat.retry")}
          </Button>
        )}
        {showFeedback && (
          <FeedbackButton
            errorContext={detailText}
            reason="chat_error"
            label={t2("feedback.reportIssue", {
              defaultValue: "Report Issue",
            })}
            variant="link"
            directSubmit={true}
            contextType="chat_error"
            context={errorContext}
          />
        )}
      </>
    ) : (
      void 0
    );
  const errorBlock = (
    <ErrorBlock
      title={t2(presentation.titleKey)}
      statusSuffix={suffix}
      Icon={presentation.Icon}
      iconSize={isRuntimeConnectionError ? 14 : 20}
      iconStrokeWidth={1.5}
      iconContainerClassName={
        isRuntimeConnectionError ? "mt-[3px] size-3.5 text-destructive" : void 0
      }
      defaultExpanded={hasActions || isModelProviderError}
      detail={detailText}
      actions={actionsNode}
      compact={isRuntimeConnectionError}
    />
  );
  if (!isRuntimeConnectionError) return errorBlock;
  return (
    <div
      data-runtime-error-card={true}
      className="rounded-lg border border-border bg-card px-3 py-2 [&_[data-error-title]]:text-destructive! [&_[data-error-suffix]]:text-destructive!"
    >
      {errorBlock}
    </div>
  );
}
