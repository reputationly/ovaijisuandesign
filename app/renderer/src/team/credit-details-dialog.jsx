// credit-details-dialog.jsx
import {
  deriveMpCreditSummary,
  PopoverContent,
  SubscriptionRenewalBadge,
  useMpSubscribeUrl,
  useMpWallet,
} from "./hailuo-credit-row.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { ChevronLeft, ChevronRight$1 as ChevronRight, getRuntimeConfig, Info$1 as Info, reactExports, Trans, usePlatform, useQuery, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import {
  creditQueryKeys,
  Popover,
  Select,
  useCreditAccountState,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import {
  Icon,
  openExternalUrl,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PopoverTrigger,
  useAccountSubmissionDecision,
} from "../assets/gateway-scope-provider.jsx";
import { PopoverTitle, SegmentedSwitch } from "../canvas/popover-title.jsx";
import { CreditType } from "../generation/to-workspace-browser-url.js";
import { Skeleton, useWalletQuery } from "./use-wallet-query.jsx";
import { useSubscriptionRenewalNotice } from "./derive-subscription-status.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { getBillingModelDisplayName } from "./billing-model-display-labels.js";
import { getPackageCreditCategoryLabel } from "./package-credit-category-labels.js";
import { CreditLedgerTable } from "./credit-ledger-table.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useMediaModels } from "../generation/normalize-model-info.js";
import { DialogTitle } from "../infra/badge-variants.jsx";
import {
  getHailuoCreditsRulesUrl,
  getUserProtocolUrl,
} from "../workspace/shortcut-hint.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { formatSignedCreditAmount } from "./team-panel-stale.jsx";
import { InfiniteScrollContainer } from "./infinite-scroll-container.jsx";
import { useTeamTransfersFeedQuery } from "./use-team-transactions-feed-query.jsx";
const UNSIGNED_DECIMAL_RE = /^(0|[1-9]\d*)$/;
const SIGNED_DECIMAL_RE = /^-?(0|[1-9]\d*)$/;
function asRecord(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(
      `Invalid billing response at ${field}: expected object`,
    );
  }
  return value;
}
function asString(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(
      `Invalid billing response at ${field}: expected string`,
    );
  }
  return value;
}
function asOptionalString(value, field) {
  if (value === void 0 || value === null) return void 0;
  return asString(value, field);
}
function asDecimal(value, field, signed = false) {
  const decimal = asString(value, field);
  if (!(signed ? SIGNED_DECIMAL_RE : UNSIGNED_DECIMAL_RE).test(decimal)) {
    throw new TypeError(
      `Invalid billing response at ${field}: expected decimal string`,
    );
  }
  return decimal;
}
function asPositiveDecimal(value, field) {
  const decimal = asString(value, field);
  if (!UNSIGNED_DECIMAL_RE.test(decimal) || decimal === "0") {
    throw new TypeError(
      `Invalid billing response at ${field}: expected positive decimal string`,
    );
  }
  return decimal;
}
function asSafeInteger(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(
      `Invalid billing response at ${field}: expected safe integer`,
    );
  }
  return value;
}
function asBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new TypeError(
      `Invalid billing response at ${field}: expected boolean`,
    );
  }
  return value;
}
function asTimestamp(value, field) {
  const decimal = asDecimal(value, field);
  const timestamp2 = Number(decimal);
  if (!Number.isSafeInteger(timestamp2)) {
    throw new TypeError(
      `Invalid billing response at ${field}: expected safe timestamp`,
    );
  }
  return timestamp2;
}
function mapBillingTransaction(value, index2) {
  const field = `$.items[${index2}]`;
  const source = asRecord(value, field);
  const type2 = asString(source.type, `${field}.type`);
  if (
    type2 !== "consume" &&
    type2 !== "refund" &&
    type2 !== "grant" &&
    type2 !== "expired"
  ) {
    throw new TypeError(
      `Invalid billing response at ${field}.type: unsupported value`,
    );
  }
  const reason = asOptionalString(source.reason, `${field}.reason`);
  const creditCategory = asOptionalString(
    source.credit_category,
    `${field}.credit_category`,
  );
  return {
    id: asDecimal(source.id, `${field}.id`),
    type: type2,
    source: asString(source.source, `${field}.source`),
    billing_type: asString(source.billing_type, `${field}.billing_type`),
    amount: asPositiveDecimal(source.amount, `${field}.amount`),
    create_time: asTimestamp(source.create_time, `${field}.create_time`),
    model_key: asString(source.model_key, `${field}.model_key`),
    model_display_name: asString(
      source.model_display_name,
      `${field}.model_display_name`,
    ),
    media_type: asString(source.media_type, `${field}.media_type`),
    ...(reason === void 0
      ? {}
      : {
          reason,
        }),
    ...(creditCategory === void 0
      ? {}
      : {
          credit_category: creditCategory,
        }),
  };
}
function mapCreditSummary(value) {
  const source = asRecord(value, "$.credit_summary");
  return {
    total: asDecimal(source.total, "$.credit_summary.total"),
    membership: asDecimal(source.membership, "$.credit_summary.membership"),
    top_up: asDecimal(source.top_up, "$.credit_summary.top_up"),
    bonus: asDecimal(source.bonus, "$.credit_summary.bonus"),
  };
}
function mapBillingTransactionsResponse(value) {
  const source = asRecord(value, "$");
  if (!Array.isArray(source.items)) {
    throw new TypeError("Invalid billing response at $.items: expected array");
  }
  return {
    items: source.items.map(mapBillingTransaction),
    pageSize: asSafeInteger(source.page_size, "$.page_size"),
    nextCursorCreateTime: asDecimal(
      source.next_cursor_create_time,
      "$.next_cursor_create_time",
    ),
    nextCursorId: asDecimal(source.next_cursor_id, "$.next_cursor_id"),
    hasMore: asBoolean(source.has_more, "$.has_more"),
    balance: asDecimal(source.balance, "$.balance", true),
    ...(source.credit_summary === void 0
      ? {}
      : {
          creditSummary: mapCreditSummary(source.credit_summary),
        }),
  };
}
async function fetchTransactions(params, options) {
  const searchParams = new URLSearchParams();
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.type) searchParams.set("type", params.type);
  if (params.cursor) {
    searchParams.set("cursor_create_time", String(params.cursor.createTime));
    searchParams.set("cursor_id", String(params.cursor.id));
  }
  const qs = searchParams.toString();
  const res = await gatewayFetch(
    `/api/v1/billing/transactions${qs ? `?${qs}` : ""}`,
    {
      signal: options?.signal,
    },
  );
  const raw2 = await res.json();
  options?.signal?.throwIfAborted();
  const data2 = mapBillingTransactionsResponse(raw2);
  return {
    items: data2.items,
    hasMore: data2.hasMore,
    nextCursor: data2.hasMore
      ? {
          createTime: data2.nextCursorCreateTime,
          id: data2.nextCursorId,
        }
      : null,
    balance: data2.balance,
  };
}
function useMpCreditSummary() {
  return deriveMpCreditSummary(useMpWallet());
}
const TRANSACTION_TYPE = {
  ALL: "all",
  CONSUMED: "consumed",
  REFUNDED: "refunded",
};
const DEFAULT_PAGE_SIZE = 25;
const CREDIT_CACHE_GC_MS = 5 * 6e4;
const CREDIT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
function useCreditDetails(open) {
  const [activeTab, setActiveTabState] = reactExports.useState(
    TRANSACTION_TYPE.ALL,
  );
  const [pageSize, setPageSizeState] = reactExports.useState(DEFAULT_PAGE_SIZE);
  const [cursorStack, setCursorStack] = reactExports.useState([]);
  const queryClient2 = useQueryClient();
  const { queryScope, canReadPersonalCredit } = useCreditAccountState();
  const dialogScopeRef = reactExports.useRef(null);
  const currentCursor = cursorStack.at(-1) ?? null;
  const currentPage = cursorStack.length + 1;
  const queryEnabled = open && queryScope !== null && canReadPersonalCredit;
  const resetCursorStack = reactExports.useCallback(() => {
    setCursorStack((prev) => (prev.length === 0 ? prev : []));
  }, []);
  const setActiveTab = reactExports.useCallback(
    (tab2) => {
      setActiveTabState(tab2);
      resetCursorStack();
    },
    [resetCursorStack],
  );
  const setPageSize = reactExports.useCallback(
    (nextPageSize) => {
      setPageSizeState(nextPageSize);
      resetCursorStack();
    },
    [resetCursorStack],
  );
  reactExports.useEffect(() => {
    if (open) {
      dialogScopeRef.current = queryScope;
      return;
    }
    const closedScope = dialogScopeRef.current;
    dialogScopeRef.current = null;
    if (closedScope) {
      queryClient2.removeQueries({
        queryKey: creditQueryKeys.personalTransactionsRoot(closedScope),
      });
    }
    resetCursorStack();
  }, [open, queryClient2, queryScope, resetCursorStack]);
  const {
    data: pageData,
    isLoading: loadingList,
    isError: errorList,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryScope
      ? creditQueryKeys.personalTransactions(
          queryScope,
          activeTab,
          pageSize,
          currentCursor?.createTime ?? "0",
          currentCursor?.id ?? "0",
        )
      : creditQueryKeys.unavailable("personal-transactions"),
    queryFn: ({ signal }) => {
      if (!queryScope || !canReadPersonalCredit) {
        throw new Error(
          "Personal transactions queried without a readable account scope",
        );
      }
      return fetchTransactions(
        {
          cursor: currentCursor ?? void 0,
          pageSize,
          type: activeTab === TRANSACTION_TYPE.ALL ? void 0 : activeTab,
        },
        {
          signal,
        },
      );
    },
    enabled: queryEnabled,
    gcTime: CREDIT_CACHE_GC_MS,
    retry: false,
  });
  const canPrev = cursorStack.length > 0;
  const visiblePageData = queryEnabled ? pageData : void 0;
  const canNext = Boolean(
    visiblePageData?.hasMore && visiblePageData.nextCursor,
  );
  const goPrev = reactExports.useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1));
  }, []);
  const goNext = reactExports.useCallback(() => {
    if (!visiblePageData?.hasMore || !visiblePageData.nextCursor) return;
    setCursorStack((prev) => [...prev, visiblePageData.nextCursor]);
  }, [visiblePageData]);
  return {
    activeTab,
    setActiveTab,
    items: visiblePageData?.items ?? [],
    loadingList,
    errorList,
    isFetching,
    retryList: refetch,
    pageSize,
    setPageSize,
    currentPage,
    canPrev,
    canNext,
    goPrev,
    goNext,
  };
}
function getModelDisplayName(item, t2, models) {
  return getBillingModelDisplayName(
    {
      billingType: item.billing_type,
      modelKey: item.model_key,
      modelDisplayName: item.model_display_name,
      mediaType: item.media_type,
    },
    t2,
    models,
  );
}
function formatNumber(value) {
  return BigInt(value).toLocaleString();
}
function getBillingTransactionCategory(item, t2) {
  if (item.type !== "grant" && item.type !== "expired") return void 0;
  return getPackageCreditCategoryLabel(item.credit_category, t2);
}
function getBillingTransactionReason(item) {
  if (item.type !== "grant" && item.type !== "expired") return void 0;
  const reason = item.reason;
  if (!reason || reason.trim() === "") return void 0;
  return reason;
}
function getBillingTransactionPresentation(item, t2) {
  const isCredit = item.type === "refund" || item.type === "grant";
  const category = getBillingTransactionCategory(item, t2);
  const reason = getBillingTransactionReason(item);
  const label =
    item.type === "grant"
      ? (t2?.("credits.transaction.grant", {
          defaultValue: "Credit issued",
        }) ?? "Credit issued")
      : item.type === "expired"
        ? (t2?.("credits.transaction.expired", {
            defaultValue: "Credits expired",
          }) ?? "Credits expired")
        : void 0;
  return {
    ...(label
      ? {
          label,
        }
      : {}),
    ...(category
      ? {
          category,
        }
      : {}),
    ...(reason
      ? {
          reason,
        }
      : {}),
    amount: `${isCredit ? "+" : "-"}${formatNumber(item.amount)}`,
    tone: isCredit ? "credit" : "debit",
  };
}
function isBillingTransactionVisibleOnTab(item, activeTab) {
  if (activeTab === TRANSACTION_TYPE.ALL) return true;
  if (activeTab === TRANSACTION_TYPE.CONSUMED) return item.type === "consume";
  return item.type === "refund";
}
function isLegacyMedia(item) {
  return !item.model_display_name && item.billing_type !== "token";
}
function CreditPagination({
  pageSize,
  setPageSize,
  currentPage,
  canPrev,
  canNext,
  goPrev,
  goNext,
  isFetching,
  loading,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t2("credits.show")}</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => setPageSize(Number(value))}
        >
          <SelectTrigger size="sm" className="min-w-20">
            <SelectValue>{() => pageSize}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CREDIT_PAGE_SIZE_OPTIONS.map((option2) => (
              <SelectItem key={option2} value={String(option2)}>
                {option2}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{t2("credits.entries")}</span>
      </div>
      <div className="flex items-center gap-3">
        {isFetching && !loading && <Skeleton className="h-4 w-12" />}
        <span className="text-xs text-muted-foreground">
          {t2("credits.pageNumber", {
            page: currentPage,
          })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canPrev}
          onClick={goPrev}
          aria-label={t2("credits.prev")}
          data-action-ui-id="credits.pagination-prev"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canNext}
          onClick={goNext}
          aria-label={t2("credits.next")}
          data-action-ui-id="credits.pagination-next"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
function BillingModelDescription({ item, models }) {
  const { t: t2 } = useTranslation();
  const modelName = getModelDisplayName(item, t2, models);
  return isLegacyMedia(item) ? (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex min-w-0" />}>
          <span className="truncate underline decoration-dotted underline-offset-4">
            {modelName}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs">
          {t2("credits.legacyMediaTip")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className="truncate">{modelName}</span>
  );
}
function CreditModelTable({
  items,
  models,
  activeTab,
  loading,
  error,
  onRetry,
}) {
  const { t: t2 } = useTranslation();
  return (
    <CreditLedgerTable
      rows={items
        .filter((item) => isBillingTransactionVisibleOnTab(item, activeTab))
        .map((item) => {
          const presentation = getBillingTransactionPresentation(item, t2);
          return {
            id: `${item.id}-${item.type}-${item.create_time}`,
            description: presentation.label ? (
              <span className="truncate">
                {presentation.label}
                {presentation.category ? (
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {presentation.category}
                  </span>
                ) : null}
                {presentation.reason ? (
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {presentation.reason}
                  </span>
                ) : null}
              </span>
            ) : (
              <BillingModelDescription item={item} models={models} />
            ),
            createdAtMs: item.create_time,
            amount: presentation.amount,
            tone: presentation.tone,
          };
        })}
      loading={loading}
      error={error}
      descriptionLabel={t2("credits.colModel")}
      timeLabel={t2("credits.colTime")}
      amountLabel={t2("credits.colCreditAmount")}
      emptyLabel={t2("credits.noConsumptionRecords")}
      errorLabel={t2("credits.fetchErrorMP")}
      retryLabel={t2("credits.retry")}
      onRetry={onRetry}
    />
  );
}
const FREE_PRIVILEGE_TYPE = 0;
const CYCLE_LABEL_KEYS = {
  1: "credits.billingCycle.monthly",
  2: "credits.billingCycle.quarterly",
  3: "credits.billingCycle.yearly",
};
function SubscriptionInfoPanel() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { isLoading: loading } = useWalletQuery();
  const mpWallet = useMpWallet();
  const subscribeUrl = useMpSubscribeUrl();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const { isWithinRenewalWindow, showBadge } = useSubscriptionRenewalNotice();
  const openSubscribePage = () => {
    const decision = guardAccountSubmission("personal_checkout");
    if (!decision.allowed) return;
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: "credits.subscription-panel",
    });
  };
  if (loading) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3">
        <Skeleton className="mb-2 h-4 w-36" />
        <Skeleton className="h-3 w-72" />
      </div>
    );
  }
  const isFree = !mpWallet || mpWallet.privilege_type === FREE_PRIVILEGE_TYPE;
  const planName = mpWallet?.plan_name?.trim() || t2("credits.freePlan");
  const cta = isFree
    ? t2("credits.upgradeSubscription")
    : t2("credits.viewSubscription");
  const cycleKey = mpWallet?.cycle_type
    ? CYCLE_LABEL_KEYS[mpWallet.cycle_type]
    : void 0;
  const cycleLabel = cycleKey ? t2(cycleKey) : "";
  const title =
    !isFree && cycleLabel ? `${planName} · ${cycleLabel}` : planName;
  const description = (() => {
    if (isFree) return t2("credits.freeDesc");
    const renew = mpWallet?.next_renewal_time?.trim();
    if (renew) {
      return t2(
        isWithinRenewalWindow
          ? "credits.subscriptionDesc.renewalNotice"
          : "credits.subscriptionDesc.renewal",
        {
          date: renew,
        },
      );
    }
    const end2 = mpWallet?.end_time?.trim();
    const creditRefresh = mpWallet?.next_credit_refresh_time?.trim();
    if (end2 && mpWallet?.cycle_type === 3 && creditRefresh) {
      return t2("credits.subscriptionDesc.cancelWithCreditRefresh", {
        date: end2,
        refreshDate: creditRefresh,
      });
    }
    if (end2)
      return t2("credits.subscriptionDesc.cancel", {
        date: end2,
      });
    return "";
  })();
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
      <div className="min-w-0">
        <h3 className="truncate font-heading text-sm font-medium text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed break-words text-muted-foreground">
            {showBadge && (
              <span className="mt-1.5 flex shrink-0">
                <SubscriptionRenewalBadge placement="inline" />
              </span>
            )}
            <span>{description}</span>
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        disabled={!checkoutDecision.allowed}
        title={checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode}
        onClick={openSubscribePage}
        data-action-ui-id="credits.subscription-cta"
      >
        {cta}
      </Button>
    </div>
  );
}
const TRANSFER_TAB = "transfer";
const TAB_VALUES = [
  {
    value: TRANSACTION_TYPE.ALL,
    labelKey: "credits.tabAll",
  },
  {
    value: TRANSACTION_TYPE.CONSUMED,
    labelKey: "credits.tabConsumed",
  },
  {
    value: TRANSACTION_TYPE.REFUNDED,
    labelKey: "credits.tabRefunded",
  },
];
function formatNumber$1(n2) {
  return n2.toLocaleString();
}
function formatTransferCounterparty(transfer) {
  const name2 = transfer.counterpartyGroupName;
  const id2 = transfer.counterpartyGroupId;
  if (!name2 && !id2) return "—";
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      {name2 ? <span className="min-w-0 break-words">{name2}</span> : null}
      {name2 && id2 ? (
        <span className="shrink-0 text-muted-foreground">/</span>
      ) : null}
      {id2 ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {id2}
        </span>
      ) : null}
    </span>
  );
}
function transferAmountTone(amount) {
  const value = BigInt(amount);
  if (value > 0n) return "credit";
  if (value < 0n) return "debit";
  return "neutral";
}
function findCreditInfo(wallet, creditType) {
  return wallet?.sub_credits?.find((item) => item?.credit_type === creditType);
}
function creditExpiryBatches(creditInfo, fallbackCredit) {
  const now2 = Date.now();
  const creditByEndTime = new Map();
  for (const record2 of creditInfo?.records ?? []) {
    if (
      !Number.isFinite(record2.credit) ||
      record2.credit <= 0 ||
      !Number.isFinite(record2.end_time) ||
      record2.end_time <= now2
    ) {
      continue;
    }
    creditByEndTime.set(
      record2.end_time,
      (creditByEndTime.get(record2.end_time) ?? 0) + record2.credit,
    );
  }
  if (creditByEndTime.size > 0) {
    return [...creditByEndTime.entries()]
      .map(([endTime, credit]) => ({
        credit,
        endTime,
      }))
      .sort((a2, b3) => a2.endTime - b3.endTime);
  }
  const fallbackEndTime = creditInfo?.end_time ?? 0;
  if (
    Number.isFinite(fallbackCredit) &&
    fallbackCredit > 0 &&
    Number.isFinite(fallbackEndTime) &&
    fallbackEndTime > now2
  ) {
    return [
      {
        credit: fallbackCredit,
        endTime: fallbackEndTime,
      },
    ];
  }
  return [];
}
function formatCreditExpiry(timestamp2) {
  if (!Number.isFinite(timestamp2) || timestamp2 <= 0) return "";
  return new Intl.DateTimeFormat(void 0, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(new Date(timestamp2));
}
function Operator({ symbol }) {
  return (
    <span className="hidden pb-1 text-xl text-muted-foreground/60 select-none sm:block">
      {symbol}
    </span>
  );
}
function SummaryCard({ label, value, tooltipKey, creditInfo }) {
  const { t: t2 } = useTranslation();
  const expiryBatches = creditExpiryBatches(creditInfo, value);
  const validityActionId = tooltipKey
    ?.replace(/^credits\./, "")
    .replace(/Tip(?:MP)?$/, "");
  const validityPopover = tooltipKey ? (
    <Popover>
      <PopoverTrigger
        openOnHover={true}
        delay={200}
        render={
          <button
            type="button"
            aria-label={t2("credits.creditExpiry.open", {
              type: label,
            })}
            className="inline-flex cursor-pointer rounded-md p-0.5 text-muted-foreground outline-hidden hover:bg-foreground/5 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
            data-action-ui-id={
              validityActionId
                ? `credits.${validityActionId}.validity`
                : "credits.validity"
            }
          />
        }
      >
        <Icon icon={Info} size="sm" aria-hidden={true} />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-h-(--available-height) w-80 gap-3 overflow-y-auto p-4"
      >
        <PopoverTitle className="font-heading text-sm font-medium">
          {t2("credits.creditExpiry.title", {
            type: label,
          })}
        </PopoverTitle>
        <p className="text-xs text-muted-foreground">{t2(tooltipKey)}</p>
        {expiryBatches.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {expiryBatches.map((batch2) => (
              <p
                key={batch2.endTime}
                className="text-xs tabular-nums text-foreground"
                data-action-ui-id="credits.expiry-batch"
              >
                {t2("credits.creditExpiry.batch", {
                  credit: formatNumber$1(batch2.credit),
                  date: formatCreditExpiry(batch2.endTime),
                })}
              </p>
            ))}
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {t2("credits.creditExpiry.empty")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  ) : null;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        {validityPopover}
      </div>
      <div className="truncate text-xl font-medium tabular-nums text-foreground">
        {formatNumber$1(value)}
      </div>
    </div>
  );
}
function CreditTypeSummary({ loading, error, creditTypes, wallet }) {
  const { t: t2 } = useTranslation();
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-5 py-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">
        {t2("credits.fetchErrorMP")}
      </div>
    );
  }
  const membership = findCreditInfo(wallet, CreditType.CREDIT_TYPE_MEMBERSHIP);
  const topUp = findCreditInfo(wallet, CreditType.CREDIT_TYPE_TOP_UP);
  const bonus = findCreditInfo(wallet, CreditType.CREDIT_TYPE_BONUS);
  const transfer = findCreditInfo(wallet, CreditType.CREDIT_TYPE_TRANSFER);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="grid grid-cols-2 items-end gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
        <SummaryCard
          label={t2("credits.remaining")}
          value={creditTypes.total}
        />
        <Operator symbol="=" />
        <SummaryCard
          label={t2("credits.membership")}
          value={creditTypes.membership}
          tooltipKey="credits.membershipTipMP"
          creditInfo={membership}
        />
        <Operator symbol="+" />
        <SummaryCard
          label={t2("credits.topUp")}
          value={creditTypes.topUp}
          tooltipKey="credits.topUpTipMP"
          creditInfo={topUp}
        />
        <Operator symbol="+" />
        <SummaryCard
          label={t2("credits.bonus")}
          value={creditTypes.bonus}
          tooltipKey="credits.bonusTipMP"
          creditInfo={bonus}
        />
        <Operator symbol="+" />
        <SummaryCard
          label={t2("credits.transfer")}
          value={creditTypes.transfer}
          tooltipKey="credits.transferTipMP"
          creditInfo={transfer}
        />
      </div>
      <p
        className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground"
        data-action-ui-id="credits.expiry-priority-note"
      >
        {t2("credits.creditExpiry.globalPriority")}
      </p>
    </div>
  );
}
export function CreditDetailsDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { data: mediaModels } = useMediaModels();
  const {
    activeTab,
    setActiveTab,
    items,
    loadingList,
    errorList,
    isFetching,
    retryList,
    pageSize,
    setPageSize,
    currentPage,
    canPrev,
    canNext,
    goPrev,
    goNext,
  } = useCreditDetails(open);
  const {
    isLoading: walletLoading,
    isError,
    isRefetchError,
  } = useWalletQuery();
  const walletError = isError || isRefetchError;
  const mpWallet = useMpWallet();
  const summary = useMpCreditSummary();
  const subscribeUrl = useMpSubscribeUrl();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const { markAsRead: markRenewalNoticeAsRead } =
    useSubscriptionRenewalNotice();
  const teamAccount = useOptionalTeamAccount();
  const transferScope =
    (teamAccount?.integrationEnabled ? teamAccount.activeScope : null) ?? null;
  const transferTabVisible = transferScope !== null;
  const [tab2, setTab] = reactExports.useState(TRANSACTION_TYPE.ALL);
  const transferTabActive = transferTabVisible && tab2 === TRANSFER_TAB;
  const transfersQuery = useTeamTransfersFeedQuery({
    scope: transferScope,
    enabled: open && transferTabActive,
    allowPersonalScope: true,
  });
  const transfers =
    transfersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const formatTransferDirection = (direction) =>
    direction === "IN"
      ? t2("team.credit.transferIn", {
          defaultValue: "转入",
        })
      : direction === "OUT"
        ? t2("team.credit.transferOut", {
            defaultValue: "转出",
          })
        : "—";
  const handleTabChange = (value) => {
    trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
      action: "tab_change",
      value,
    });
    setTab(value);
    if (value !== TRANSFER_TAB) setActiveTab(value);
  };
  const region =
    getRuntimeConfig().region === "domestic" ? "domestic" : "overseas";
  const openSubscribePage = () => {
    const decision = guardAccountSubmission("personal_checkout");
    if (!decision.allowed) return;
    trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
      action: "purchase_more",
    });
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: "credits.details.purchase",
    });
  };
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
        action: "close",
      });
      markRenewalNoticeAsRead();
    }
    onOpenChange(nextOpen);
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100vh-4rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]"
        showCloseButton={true}
        data-action-ui-id="credits.details-dialog"
      >
        <DialogHeader className="shrink-0 px-6 pt-5 pb-3">
          <DialogTitle className="font-heading text-sm font-medium">
            {t2("credits.detailsTitleMP")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 pb-6">
          <SubscriptionInfoPanel />
          <CreditTypeSummary
            loading={walletLoading}
            error={walletError || !mpWallet}
            creditTypes={summary}
            wallet={mpWallet}
          />
          <SegmentedSwitch
            value={transferTabActive ? TRANSFER_TAB : activeTab}
            onValueChange={handleTabChange}
            ariaLabel={t2("credits.detailsTitleMP")}
            dataActionUiId="credits.transaction-type-switch"
            thumbDataSlot="credits-transaction-type-thumb"
            variant="label"
            stretch={true}
            options={[
              ...TAB_VALUES.map(({ value, labelKey }) => ({
                value,
                label: t2(labelKey),
                dataActionUiId: `credits.tab-${value}`,
              })),
              ...(transferTabVisible
                ? [
                    {
                      value: TRANSFER_TAB,
                      label: t2("credits.tabTransfer"),
                      dataActionUiId: "credits.tab-transfer",
                    },
                  ]
                : []),
            ]}
          />
          {transferTabActive ? (
            <InfiniteScrollContainer
              className="min-h-0 flex-1"
              loadedBatchCount={transfersQuery.data?.pages.length ?? 0}
              hasMore={Boolean(transfersQuery.hasNextPage)}
              isLoadingMore={transfersQuery.isFetchingNextPage}
              loadMoreError={transfersQuery.isFetchNextPageError}
              onLoadMore={() => transfersQuery.fetchNextPage()}
              actionUiId="credits.transfers-scroll"
            >
              <CreditLedgerTable
                rows={transfers.map((transfer) => ({
                  id: transfer.transferId,
                  description: formatTransferDirection(transfer.direction),
                  model: formatTransferCounterparty(transfer),
                  createdAtMs: transfer.createdAtMs,
                  amount: formatSignedCreditAmount(transfer.amount),
                  tone: transferAmountTone(transfer.amount),
                }))}
                loading={transfersQuery.isPending}
                error={transfersQuery.isError && !transfersQuery.data}
                scrollable={false}
                descriptionLabel={t2("team.credit.transferType", {
                  defaultValue: "类型",
                })}
                modelLabel={t2("team.credit.transferCounterparty", {
                  defaultValue: "团队 / 账号",
                })}
                timeLabel={t2("team.credit.time", {
                  defaultValue: "时间",
                })}
                amountLabel={t2("team.credit.amount", {
                  defaultValue: "积分",
                })}
                emptyLabel={t2("team.credit.transferEmpty", {
                  defaultValue: "暂无积分转移",
                })}
                errorLabel={t2("team.common.loadFailed", {
                  defaultValue: "加载失败",
                })}
                retryLabel={t2("common.retry", {
                  defaultValue: "重试",
                })}
                onRetry={() => void transfersQuery.refetch()}
              />
            </InfiniteScrollContainer>
          ) : (
            <CreditModelTable
              items={items}
              models={mediaModels}
              activeTab={activeTab}
              loading={loadingList}
              error={errorList}
              onRetry={() => {
                void retryList();
              }}
            />
          )}
        </div>
        {!transferTabActive ? (
          <div className="shrink-0 border-t border-border bg-background px-6 py-3">
            <CreditPagination
              pageSize={pageSize}
              setPageSize={(value) => {
                trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
                  action: "page_size_change",
                  value,
                });
                setPageSize(value);
              }}
              currentPage={currentPage}
              canPrev={canPrev}
              canNext={canNext}
              goPrev={() => {
                trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
                  action: "page_prev",
                  page: currentPage,
                });
                goPrev();
              }}
              goNext={() => {
                trackEvent(TRACK_EVENTS.CREDIT_DETAILS_ACTION, {
                  action: "page_next",
                  page: currentPage,
                });
                goNext();
              }}
              isFetching={isFetching}
              loading={loadingList}
            />
          </div>
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border bg-background px-5 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-xs text-muted-foreground">
            <Icon
              icon={Info}
              size="md"
              className="mt-0.5 shrink-0"
              aria-hidden={true}
            />
            <div className="min-w-0 flex-1">
              <p>
                <Trans
                  t={t2}
                  i18nKey="credits.costVaryNoteMP"
                  components={{
                    modelCosts: (
                      <button
                        type="button"
                        className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          void openExternalUrl(
                            platform2,
                            getHailuoCreditsRulesUrl(region),
                            {
                              source: "credits.details.model-costs",
                            },
                          );
                        }}
                        data-action-ui-id="credits.model-costs-link"
                      />
                    ),
                    rules: (
                      <button
                        type="button"
                        className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          void openExternalUrl(
                            platform2,
                            getUserProtocolUrl(
                              region,
                              getRuntimeConfig().channel,
                              "pointsRules",
                            ),
                            {
                              source: "credits.details.rules",
                            },
                          );
                        }}
                        data-action-ui-id="credits.rules-link"
                      />
                    ),
                  }}
                />
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              className="px-4 sm:px-6"
              disabled={!checkoutDecision.allowed}
              title={
                checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode
              }
              onClick={openSubscribePage}
              data-action-ui-id="credits.purchase-more"
            >
              {t2("credits.purchaseMore")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
