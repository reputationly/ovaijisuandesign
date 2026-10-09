// billing-insufficient-card.jsx
import {
  CircleAlert,
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { Icon, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CollapsedSettledRow,
  CollapseSettledButton,
  useCreditCountdown,
  useSettledCollapse,
} from "./streaming-label.jsx";
import { useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  useMpSubscribeUrl,
  useMpSubscriptionWalletQuery,
} from "./hailuo-credit-row.jsx";
function formatCredits(value) {
  return value?.toLocaleString();
}
export function BillingInsufficientCard({
  estimate,
  onRetry,
  expiresAt,
  resolved = false,
  settlementStatus,
  retryResetMs,
  refreshRevision,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const subscribeUrl = useMpSubscribeUrl();
  const isTeamContext =
    useOptionalTeamAccount()?.snapshot?.activeContext?.accountType === "TEAM";
  const { mpWallet, isLoading, isError, isRefetchError } =
    useMpSubscriptionWalletQuery();
  const walletReady =
    mpWallet?.subscription_state_known === true &&
    !isLoading &&
    !isError &&
    !isRefetchError;
  const estimatedCredits = formatCredits(estimate?.estimatedCredits);
  const currentCredits = formatCredits(
    estimate?.currentCredits ?? (walletReady ? mpWallet.total_credit : void 0),
  );
  const shortfallCredits = formatCredits(estimate?.shortfallCredits);
  const [retryState, setRetryState] = reactExports.useState("idle");
  reactExports.useEffect(() => {
    if (retryState !== "submitted" || retryResetMs === void 0) return;
    const timer2 = setTimeout(() => setRetryState("idle"), retryResetMs);
    return () => clearTimeout(timer2);
  }, [retryState, retryResetMs]);
  const countdown = useCreditCountdown(expiresAt, !resolved);
  const topupContinued = resolved && settlementStatus === "continued";
  const settledSummary =
    settlementStatus === "continued"
      ? t2(
          "chat.creditReminder.topupContinued",
          "Credits have been added. This generation resumed automatically.",
        )
      : t2(
          "chat.creditReminder.topupExpired",
          "No top-up arrived in time. This generation has stopped.",
        );
  const title = topupContinued
    ? t2(
        "chat.creditReminder.topupContinuedTitle",
        "Top-up successful. Generation is continuing.",
      )
    : t2("chat.billingInsufficient.title");
  const { collapsed, expand, collapse } = useSettledCollapse(resolved);
  const [collapsedWaiting, setCollapsedWaiting] = reactExports.useState(false);
  const [notArrived, setNotArrived] = reactExports.useState(false);
  const lastRevisionRef = reactExports.useRef(refreshRevision);
  reactExports.useEffect(() => {
    if (refreshRevision === lastRevisionRef.current) return;
    lastRevisionRef.current = refreshRevision;
    if (resolved) return;
    setCollapsedWaiting(false);
    setNotArrived(true);
    setRetryState("idle");
  }, [refreshRevision, resolved]);
  const handleRetryAfterPurchase = () => {
    if (!onRetry || retryState === "submitted") return;
    const delivered = onRetry();
    setRetryState(delivered ? "submitted" : "failed");
    if (delivered) {
      setCollapsedWaiting(true);
      setNotArrived(false);
    }
  };
  const handleOpenPurchase = (source) => {
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: `chat.billing-insufficient.${source}`,
    });
  };
  if (collapsed) {
    return (
      <CollapsedSettledRow
        icon={CircleAlert}
        title={title}
        summary={topupContinued ? "" : settledSummary}
        onExpand={expand}
        actionUiId="chat.billing-insufficient-card.expand"
      />
    );
  }
  return (
    <section
      className="w-full rounded-lg border border-border bg-card p-4"
      aria-label={title}
      data-action-ui-id="chat.billing-insufficient-card"
    >
      <div className="flex items-center gap-2">
        <Icon
          icon={CircleAlert}
          size="lg"
          strokeWidth={1.5}
          className="text-foreground/70"
        />
        <h3 className="font-heading text-sm font-medium text-foreground">
          {title}
        </h3>
        {countdown && (
          <span
            className="ml-auto rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-xs text-foreground/70"
            aria-live="off"
          >
            {countdown}
          </span>
        )}
        {resolved && <CollapseSettledButton onCollapse={collapse} />}
      </div>
      {!resolved && !collapsedWaiting && (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2(
            isTeamContext
              ? "chat.billingInsufficient.teamDescription"
              : "chat.billingInsufficient.description",
          )}
        </p>
      )}
      {!topupContinued &&
        !collapsedWaiting &&
        (estimatedCredits || currentCredits || shortfallCredits) && (
          <dl className="mt-3 flex gap-2 rounded-md bg-secondary/60 px-3 py-2.5 text-xs [&>div]:min-w-0 [&>div]:flex-1">
            {estimatedCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.estimatedCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">
                  {estimatedCredits}
                </dd>
              </div>
            )}
            {currentCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.currentCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">
                  {currentCredits}
                </dd>
              </div>
            )}
            {shortfallCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.shortfallCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">
                  {shortfallCredits}
                </dd>
              </div>
            )}
          </dl>
        )}
      {resolved ? (
        <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
          {settledSummary}
        </p>
      ) : collapsedWaiting ? (
        <div className="mt-4 flex items-center gap-2">
          <p
            className="min-w-0 flex-1 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {t2("chat.billingInsufficient.waitingCollapsed")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retryState === "submitted"}
            onClick={handleRetryAfterPurchase}
            data-action-ui-id="chat.billing-insufficient.recheck-again"
          >
            {t2("chat.billingInsufficient.recheckAgain")}
          </Button>
        </div>
      ) : (
        <>
          {notArrived && (
            <p className="mt-3 text-xs text-muted-foreground" role="alert">
              {t2("chat.billingInsufficient.topupNotArrived")}
            </p>
          )}
          {!isTeamContext && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleOpenPurchase("top-up")}
                data-action-ui-id="chat.billing-insufficient.top-up"
              >
                {t2("chat.billingInsufficient.topUp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleOpenPurchase("upgrade")}
                data-action-ui-id="chat.billing-insufficient.upgrade"
              >
                {t2("chat.billingInsufficient.upgrade")}
              </Button>
            </div>
          )}
          {onRetry && (
            <>
              {retryState === "failed" && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {t2("chat.billingInsufficient.retryFailed")}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full text-foreground/70",
                  isTeamContext ? "mt-4" : "mt-2",
                )}
                onClick={handleRetryAfterPurchase}
                data-action-ui-id="chat.billing-insufficient.retry-after-purchase"
              >
                {t2("chat.billingInsufficient.retryAfterPurchase")}
              </Button>
            </>
          )}
        </>
      )}
    </section>
  );
}
