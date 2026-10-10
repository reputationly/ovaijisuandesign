// promo-banner.jsx
import { reactExports, usePlatform, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  isBillingPromotionActive,
  useBillingPromotion,
} from "./chat-compliance-notice.jsx";
import {
  useMpSubscribeUrl,
  useMpSubscriptionWalletQuery,
} from "../team/hailuo-credit-row.jsx";
import { isAnnualMember } from "../team/team-credit-history-section.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Sparkles } from "../media-editing/package.jsx";
function readDismissedUntil(key2) {
  try {
    const raw2 = window.localStorage.getItem(key2);
    if (!raw2) return 0;
    const n2 = Number(raw2);
    return Number.isFinite(n2) ? n2 : 0;
  } catch {
    return 0;
  }
}
function writeDismissedUntil(key2, untilMs) {
  try {
    window.localStorage.setItem(key2, String(untilMs));
  } catch {}
}
function usePromotionGate(keyPrefix) {
  const promotion = useBillingPromotion();
  const [, setDismissTick] = reactExports.useState(0);
  const dismiss = reactExports.useCallback(() => {
    if (!promotion) return;
    const muteMs = promotion.muteRangeTime > 0 ? promotion.muteRangeTime : 0;
    writeDismissedUntil(
      `${keyPrefix}${promotion.activityID}`,
      Date.now() + muteMs,
    );
    setDismissTick((n2) => n2 + 1);
  }, [promotion, keyPrefix]);
  if (!promotion)
    return {
      promotion: null,
      dismiss,
    };
  const now2 = Date.now();
  if (!isBillingPromotionActive(promotion, now2))
    return {
      promotion: null,
      dismiss,
    };
  const dismissedUntil = readDismissedUntil(
    `${keyPrefix}${promotion.activityID}`,
  );
  if (now2 < dismissedUntil)
    return {
      promotion: null,
      dismiss,
    };
  return {
    promotion,
    dismiss,
  };
}
const BANNER_KEY_PREFIX = "hilo:promo-banner:dismissed-until:";
function usePromoBanner() {
  const gate = usePromotionGate(BANNER_KEY_PREFIX);
  const { mpWallet, isLoading, isError, isRefetchError } =
    useMpSubscriptionWalletQuery();
  const subscriptionStateKnown =
    mpWallet?.subscription_state_known === true &&
    !isLoading &&
    !isError &&
    !isRefetchError;
  if (!subscriptionStateKnown || isAnnualMember(mpWallet)) {
    return {
      ...gate,
      promotion: null,
    };
  }
  return gate;
}
export function PromoBanner() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const subscribeUrl = useMpSubscribeUrl();
  const { promotion, dismiss } = usePromoBanner();
  const handleJump = reactExports.useCallback(() => {
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: "promo.banner.subscribe",
    });
  }, [platform2, subscribeUrl, t2]);
  if (!promotion) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: can't use a native <button> here — it contains a nested close <button>, which is invalid HTML. role="button" + keyboard handler keeps it accessible.
    <div
      role="button"
      tabIndex={0}
      onClick={handleJump}
      onKeyDown={(e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          handleJump();
        }
      }}
      className="-mb-3 flex cursor-pointer items-center gap-2.5 rounded-t-lg bg-foreground/[0.04] px-3 pb-5 pt-2.5"
      data-action-ui-id="promo-banner"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-accent">
        <Sparkles
          size={14}
          strokeWidth={1.5}
          className="text-white"
          fill="currentColor"
        />
      </span>
      <span
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
        title={promotion.toastTitle}
      >
        {promotion.toastTitle}
      </span>
      <button
        type="button"
        onClick={(e2) => {
          e2.stopPropagation();
          dismiss();
        }}
        data-action-ui-id="promo-banner-close"
        aria-label={t2("promoBanner.close", "Dismiss")}
        className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-foreground/10 hover:text-foreground"
      >
        <X size={16} strokeWidth={1} />
      </button>
    </div>
  );
}
