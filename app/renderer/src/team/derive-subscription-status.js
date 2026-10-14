// derive-subscription-status.js
import { getRuntimeConfig } from "../infra/runtime-config.js";
import reactExports from "react";
import { useStorage } from "../infra/use-storage.js";
import { WalletSource } from "../generation/to-workspace-browser-url.js";
import { useWalletQuery } from "./use-wallet-query.jsx";
import {
  useAuth,
  useCreditAccountState,
} from "../assets/credit-query-keys.jsx";
const DEFAULT_RENEWAL_WINDOW_DAYS = 5;
const DAY_MS = 864e5;
function parseRenewalDay(value) {
  const match = value?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.getTime()
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
    const get = (type) =>
      Number(parts.find((part) => part.type === type)?.value);
    const today = Date.UTC(get("year"), get("month") - 1, get("day"));
    const days = (renewalDay - today) / DAY_MS;
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
  const [seen, setSeen, , hydrated] = useStorage(
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
    (seen?.[noticeKey] === true ||
      seen?.[JSON.stringify(accountKey)] === status.renewalDate),
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
    setSeen((current) => ({
      ...current,
      [noticeKey]: true,
    }));
  }, [showBadge, noticeKey, setSeen]);
  return {
    ...status,
    showBadge,
    markAsRead,
  };
}
