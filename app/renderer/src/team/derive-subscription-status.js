// derive-subscription-status.js
import { getRuntimeConfig, reactExports, useStorage } from "../vendor.js";
import { WalletSource } from "../generation/to-workspace-browser-url.js";
import { useWalletQuery } from "./use-wallet-query.jsx";
import {
  useAuth,
  useCreditAccountState,
} from "../assets/credit-query-keys.jsx";

const DEFAULT_RENEWAL_WINDOW_DAYS = 5;

const DAY_MS$2 = 864e5;

function parseRenewalDay(value) {
  const match2 = value?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match2) return null;
  const [, month, day, year] = match2.map(Number);
  const date2 = new Date(Date.UTC(year, month - 1, day));
  return date2.getUTCFullYear() === year &&
    date2.getUTCMonth() === month - 1 &&
    date2.getUTCDate() === day
    ? date2.getTime()
    : null;
}

function deriveSubscriptionStatus(
  wallet,
  serverTimeMs,
  timeZone,
  windowDays = DEFAULT_RENEWAL_WINDOW_DAYS,
) {
  const isKnown = wallet?.subscription_state_known === true;
  const isPaid = isKnown && (wallet?.privilege_type ?? 0) > 0;
  const rawRenewalDate =
    typeof wallet?.next_renewal_time === "string"
      ? wallet.next_renewal_time.trim()
      : void 0;
  const renewalDay = parseRenewalDay(rawRenewalDate);
  const renewalDate = renewalDay !== null ? (rawRenewalDate ?? null) : null;
  const isAutoRenewing = isKnown ? isPaid && renewalDate !== null : null;
  let daysUntilRenewal = null;
  if (isAutoRenewing && renewalDay !== null) {
    const currentTimeMs =
      serverTimeMs !== void 0 &&
      Number.isSafeInteger(serverTimeMs) &&
      serverTimeMs > 0 &&
      Number.isFinite(new Date(serverTimeMs).getTime())
        ? serverTimeMs
        : Date.now();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(currentTimeMs);
    const get3 = (type2) =>
      Number(parts.find((part) => part.type === type2)?.value);
    const today = Date.UTC(get3("year"), get3("month") - 1, get3("day"));
    const days = (renewalDay - today) / DAY_MS$2;
    if (days >= 0) daysUntilRenewal = days;
  }
  return {
    isKnown,
    planName: isKnown ? (wallet?.plan_name ?? "") : "",
    cycleType: isKnown ? wallet?.cycle_type : void 0,
    isAutoRenewing,
    renewalDate: isKnown ? renewalDate : null,
    daysUntilRenewal,
    isWithinRenewalWindow:
      daysUntilRenewal !== null && daysUntilRenewal <= windowDays,
  };
}

function useSubscriptionStatus(windowDays = DEFAULT_RENEWAL_WINDOW_DAYS) {
  const query = useWalletQuery({
    refetchInterval: 6 * 60 * 60 * 1e3,
  });
  const failed = query.isError || query.isRefetchError;
  const wallet = failed
    ? void 0
    : query.data?.wallets.find(
        (item) => item.source === WalletSource.WALLET_SOURCE_OP,
      );
  const timeZone =
    getRuntimeConfig().region === "overseas" ? "UTC" : "Asia/Shanghai";
  return {
    ...deriveSubscriptionStatus(
      wallet,
      query.data?.serverTimeMs,
      timeZone,
      windowDays,
    ),
    isLoading: query.isLoading,
    isError: failed,
  };
}

export function useSubscriptionRenewalNotice() {
  const status = useSubscriptionStatus();
  const { user } = useAuth();
  const { queryScope, canReadPersonalCredit } = useCreditAccountState();
  const [seen2, setSeen, , hydrated] = useStorage(
    "global.subscriptionRenewalSeen",
  );
  const accountKey =
    user?.userID && queryScope && canReadPersonalCredit
      ? [
          user.userID,
          queryScope.kind === "canonical"
            ? queryScope.accountScope.groupId
            : "default",
        ]
      : null;
  const noticeKey =
    accountKey && status.renewalDate
      ? JSON.stringify([...accountKey, status.renewalDate])
      : null;
  const hasRead = Boolean(
    noticeKey &&
    (seen2?.[noticeKey] === true ||
      seen2?.[JSON.stringify(accountKey)] === status.renewalDate),
  );
  const showBadge = Boolean(
    hydrated &&
    noticeKey &&
    status.isAutoRenewing &&
    status.isWithinRenewalWindow &&
    !hasRead,
  );
  const markAsRead = reactExports.useCallback(() => {
    if (!showBadge || !noticeKey) return;
    setSeen((current2) => ({
      ...current2,
      [noticeKey]: true,
    }));
  }, [showBadge, noticeKey, setSeen]);
  return {
    ...status,
    showBadge,
    markAsRead,
  };
}
