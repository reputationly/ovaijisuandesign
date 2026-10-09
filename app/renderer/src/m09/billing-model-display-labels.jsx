// billing-model-display-labels.jsx
import {
  useTranslation,
  reactExports,
  dedupedToast,
  usePlatform,
  openExternalUrl,
  Tooltip,
  TooltipTrigger,
  ChevronRight$1,
  Select$1,
  getRuntimeConfig,
  TRACK_EVENTS,
  Icon,
  TooltipProvider,
  ChevronLeft,
  Info$1,
  useAuth,
  useCreditAccountState,
  useOptionalTeamAccount,
  guardAccountSubmission,
  useStorage,
  normalizeLegacyModelId,
  useAccountSubmissionDecision,
  useMediaModels,
  Trans,
  Popover,
  PopoverTrigger,
  ArrowLeft,
} from "../vendor.js";
import {
  WalletSource,
  CreditType,
  redactModelAliasesForDisplay,
  resolveModelDisplayName,
  MIN_CREDIT_REMINDER_THRESHOLD,
  MAX_CREDIT_REMINDER_THRESHOLD,
} from "../m01/text-models.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button$1,
  TooltipContent,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { getHailuoCreditsRulesUrl, getUserProtocolUrl } from "../m08/shortcut-categories.jsx";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input3,
} from "../asset-center/shared/select-content.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatSignedCreditAmount } from "./account-switcher-view.jsx";
import { InfiniteScrollContainer, Skeleton, useWalletQuery } from "./infinite-scroll-container.jsx";
import {
  CREDIT_PAGE_SIZE_OPTIONS,
  PopoverContent,
  PopoverTitle,
  SegmentedSwitch,
  SubscriptionRenewalBadge,
  TRANSACTION_TYPE,
  useCreditDetails,
  useMpCreditSummary,
  useMpSubscribeUrl,
  useMpWallet,
} from "./use-credit-details.jsx";
import { useTeamTransfersFeedQuery } from "./use-team-transactions-feed-query.jsx";
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
    typeof wallet?.next_renewal_time === "string" ? wallet.next_renewal_time.trim() : void 0;
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
    const get3 = (type2) => Number(parts.find((part) => part.type === type2)?.value);
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
    isWithinRenewalWindow: daysUntilRenewal !== null && daysUntilRenewal <= windowDays,
  };
}
function useSubscriptionStatus(windowDays = DEFAULT_RENEWAL_WINDOW_DAYS) {
  const query = useWalletQuery({
    refetchInterval: 6 * 60 * 60 * 1e3,
  });
  const failed = query.isError || query.isRefetchError;
  const wallet = failed
    ? void 0
    : query.data?.wallets.find((item) => item.source === WalletSource.WALLET_SOURCE_OP);
  const timeZone = getRuntimeConfig().region === "overseas" ? "UTC" : "Asia/Shanghai";
  return {
    ...deriveSubscriptionStatus(wallet, query.data?.serverTimeMs, timeZone, windowDays),
    isLoading: query.isLoading,
    isError: failed,
  };
}
export function useSubscriptionRenewalNotice() {
  const status = useSubscriptionStatus();
  const { user } = useAuth();
  const { queryScope, canReadPersonalCredit } = useCreditAccountState();
  const [seen2, setSeen, , hydrated] = useStorage("global.subscriptionRenewalSeen");
  const accountKey =
    user?.userID && queryScope && canReadPersonalCredit
      ? [user.userID, queryScope.kind === "canonical" ? queryScope.accountScope.groupId : "default"]
      : null;
  const noticeKey =
    accountKey && status.renewalDate ? JSON.stringify([...accountKey, status.renewalDate]) : null;
  const hasRead = Boolean(
    noticeKey &&
    (seen2?.[noticeKey] === true || seen2?.[JSON.stringify(accountKey)] === status.renewalDate),
  );
  const showBadge = Boolean(
    hydrated && noticeKey && status.isAutoRenewing && status.isWithinRenewalWindow && !hasRead,
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
function formatTime(ms) {
  const date2 = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date2.getFullYear()}-${pad(date2.getMonth() + 1)}-${pad(date2.getDate())} ${pad(date2.getHours())}:${pad(date2.getMinutes())}`;
}
export function CreditLedgerTable({
  rows,
  loading,
  error,
  descriptionLabel,
  modelLabel,
  operatorLabel,
  timeLabel,
  amountLabel,
  emptyLabel,
  errorLabel,
  retryLabel,
  onRetry,
  scrollable = true,
}) {
  const gridColumns = descriptionLabel
    ? modelLabel
      ? operatorLabel
        ? "grid-cols-[minmax(5.5rem,0.9fr)_minmax(7rem,1.1fr)_minmax(8rem,1.2fr)_minmax(7.5rem,1fr)_minmax(4.5rem,0.7fr)]"
        : "grid-cols-[minmax(7rem,1fr)_minmax(9rem,1.3fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]"
      : "grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]"
    : modelLabel && operatorLabel
      ? // 时间是定长 `YYYY-MM-DD HH:mm`，给固定 8rem 即可；省下的弹性宽度留给
        // 会被截断的“消耗人”（昵称 · 长数字 ID）。
        "grid-cols-[minmax(7rem,1fr)_minmax(10rem,2fr)_8rem_minmax(4.5rem,0.7fr)]"
      : "grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(5rem,0.8fr)]";
  return (
    <div
      className={cn$2(
        "rounded-lg border border-border",
        scrollable
          ? "flex h-[22rem] min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden"
          : "overflow-clip",
      )}
    >
      <div
        className={cn$2(
          modelLabel
            ? operatorLabel
              ? descriptionLabel
                ? "min-w-[42rem]"
                : "min-w-[36rem]"
              : "min-w-[40rem]"
            : "min-w-[28rem]",
          scrollable && "flex h-full min-h-0 flex-col",
        )}
      >
        <div
          className={cn$2(
            "grid shrink-0 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground",
            scrollable ? "bg-muted/50" : "sticky top-0 z-10 bg-muted",
            gridColumns,
          )}
        >
          {descriptionLabel ? (
            <span className="min-w-0 break-words">{descriptionLabel}</span>
          ) : null}
          {modelLabel ? <span className="min-w-0 break-words">{modelLabel}</span> : null}
          {operatorLabel ? <span className="min-w-0 break-words">{operatorLabel}</span> : null}
          <span className="min-w-0 break-words">{timeLabel}</span>
          <span className="min-w-0 break-words text-right">{amountLabel}</span>
        </div>
        <div className={cn$2(scrollable && "min-h-0 flex-1 overflow-y-auto")}>
          {loading ? (
            <div>
              {Array.from({
                length: 5,
              }).map((_2, index2) => (
                <div
                  key={index2}
                  className={cn$2(
                    "grid min-h-9 items-center border-b border-border/70 px-4 py-2 last:border-b-0",
                    gridColumns,
                  )}
                >
                  {descriptionLabel ? <Skeleton className="h-3 w-20 rounded-sm" /> : null}
                  {modelLabel ? <Skeleton className="h-3 w-24 rounded-sm" /> : null}
                  {operatorLabel ? <Skeleton className="h-3 w-24 rounded-sm" /> : null}
                  <Skeleton className="h-3 w-28 rounded-sm" />
                  <Skeleton className="ml-auto h-3 w-14 rounded-sm" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              className={cn$2(
                "flex flex-col items-center justify-center gap-3 px-4 text-center text-xs text-muted-foreground",
                scrollable ? "h-full min-h-40" : "min-h-24",
              )}
            >
              <span className="break-words">{errorLabel}</span>
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-7 max-w-full whitespace-normal text-center leading-relaxed"
                onClick={onRetry}
              >
                {retryLabel}
              </Button$1>
            </div>
          ) : rows.length === 0 ? (
            <div
              className={cn$2(
                "flex items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground",
                scrollable ? "h-full min-h-40" : "min-h-24",
              )}
            >
              {emptyLabel}
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={cn$2(
                  "grid items-center border-b border-border/70 px-4 py-2 last:border-b-0",
                  gridColumns,
                )}
              >
                {descriptionLabel ? (
                  <div className="min-w-0 truncate text-xs font-medium text-foreground">
                    {row.description}
                  </div>
                ) : null}
                {modelLabel ? (
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {row.model ?? "—"}
                  </div>
                ) : null}
                {operatorLabel ? (
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {row.operator ?? "—"}
                  </div>
                ) : null}
                <div className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
                  {formatTime(row.createdAtMs)}
                </div>
                <div
                  className={cn$2(
                    "min-w-0 truncate text-right text-xs font-medium tabular-nums",
                    row.tone === "credit" && "text-success",
                    row.tone === "debit" && "text-destructive",
                    row.tone === "neutral" && "text-foreground",
                  )}
                >
                  {row.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
const LEGACY_MEDIA_DISPLAY_NAME = "媒体";
const AGENT_DISPLAY_NAME = "Agent";
const MEDIAKIT_ENHANCE_BILLING_KEY = "mediakit-enhance-video";
const MEDIAKIT_ENHANCE_BILLING_PREFIX = `${MEDIAKIT_ENHANCE_BILLING_KEY}-`;
const MINIMAX_H3_BILLING_KEY = "minimax-h3";
const MINIMAX_H3_MAX_BILLING_KEY = "minimax-h3-max";
const MINIMAX_H3_CONTEXT_IR_BILLING_KEY = `${MINIMAX_H3_BILLING_KEY}-context-ir`;
const BILLING_MODEL_DISPLAY_LABELS = {
  jimeng_remove_background: {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  jimeng_remove_bg: {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  "Remove Background": {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  "mediakit-erase-subtitle": {
    key: "canvas.eraseSubtitle.label",
    fallback: "Erase Subtitles",
  },
  "mediakit-asr": {
    key: "canvas.asr.label",
    fallback: "Subtitle generation",
  },
  "mediakit-separate-voice": {
    key: "canvas.extractAudio",
    fallback: "Extract audio",
  },
  image_super_resolution: {
    key: "canvas.superResolution.label",
    fallback: "HD",
  },
  video_super_resolution: {
    key: "canvas.superResolution.label",
    fallback: "HD",
  },
  h3_video_super_resolution: {
    key: "credits.minimaxH3SuperResolution",
    fallback: "MiniMax H3 Super Resolution",
  },
  "mediakit_enhance-professional": {
    key: "credits.imageEnhance",
    fallback: "Image HD",
  },
  // Seedream 图层分离的大/小两档模型，账单不区分规格，统一显示为同一个功能名
  "seedream-layer-decompose-large": {
    key: "credits.layerDecompose",
    fallback: "Split Layers",
  },
  "seedream-layer-decompose-small": {
    key: "credits.layerDecompose",
    fallback: "Split Layers",
  },
  "gpt-image-1.5": {
    fallback: "GPT Image 1.5",
  },
  "qwen-image-edit": {
    fallback: "Qwen Image Edit",
  },
  "kling-avatar": {
    fallback: "Kling Avatar",
  },
  "kling-lip-sync": {
    fallback: "Kling Lip Sync",
  },
  "kling-v1-5": {
    fallback: "Kling 1.5",
  },
  "kling-v2": {
    fallback: "Kling 2.0",
  },
  "kling-v2-1": {
    fallback: "Kling 2.1",
  },
  "kling-v2-5-turbo": {
    fallback: "Kling 2.5 Turbo",
  },
  "kling-v2-6": {
    fallback: "Kling 2.6",
  },
  "kling-v2-master": {
    fallback: "Kling 2.6 Master",
  },
  [MINIMAX_H3_CONTEXT_IR_BILLING_KEY]: {
    key: "credits.minimaxH3PromptExpansion",
    fallback: "MiniMax H3 Prompt Expansion",
  },
  "MiniMax-H3": {
    fallback: "MiniMax H3",
  },
  "music-gen": {
    key: "credits.musicTitle",
    fallback: "Music Generation",
  },
  voice_clone: {
    key: "canvas.voiceClone.nodeName",
    fallback: "Voice Clone",
  },
  "voice-clone": {
    key: "canvas.voiceClone.nodeName",
    fallback: "Voice Clone",
  },
  voice_design: {
    key: "canvas.voiceDesign.nodeName",
    fallback: "Voice Design",
  },
  "voice-design": {
    key: "canvas.voiceDesign.nodeName",
    fallback: "Voice Design",
  },
  voice_isolation: {
    key: "canvas.voiceIsolate",
    fallback: "Voice Isolator",
  },
  "voice-isolation": {
    key: "canvas.voiceIsolate",
    fallback: "Voice Isolator",
  },
  // Vibe DAG 扣费的展示名，由 workflow 侧 Apollo design_dag_config 按 logical_dag_id
  // 下发（DAG 的 model_key 恒为 "template"，只能靠 display_name 区分）。
  // 复用画布入口的既有文案 key，保证账单与用户在画布上看到的名字一致。
  anyangle: {
    key: "canvas.multiAngle",
    fallback: "AnyAngle",
  },
  relight: {
    key: "canvas.relight",
    fallback: "Relight",
  },
  storyboard: {
    key: "canvas.storyboardGrid",
    fallback: "Storyboard",
  },
};
function isMiniMaxH3BillingKey(model) {
  const normalized = model.toLowerCase();
  return (
    normalized === MINIMAX_H3_BILLING_KEY || normalized.startsWith(`${MINIMAX_H3_BILLING_KEY}-`)
  );
}
function getBillingModelLabel(model, t2, region) {
  const normalized = model?.trim();
  if (!normalized) return void 0;
  const normalizedBillingKey = normalized.toLowerCase();
  if (normalizedBillingKey === MINIMAX_H3_MAX_BILLING_KEY) {
    return t2
      ? t2("credits.minimaxH3Max", {
          defaultValue: "MiniMax H3 Max",
        })
      : "MiniMax H3 Max";
  }
  const label =
    BILLING_MODEL_DISPLAY_LABELS[normalized] ??
    // Vibe DAG 的展示名来自人工维护的 Apollo 配置，大小写不受代码约束
    // （"Relight" / "relight" 都可能写进去），所以精确匹配未命中时再按小写兜一次。
    BILLING_MODEL_DISPLAY_LABELS[normalizedBillingKey] ??
    (normalizedBillingKey === MINIMAX_H3_CONTEXT_IR_BILLING_KEY
      ? BILLING_MODEL_DISPLAY_LABELS[MINIMAX_H3_CONTEXT_IR_BILLING_KEY]
      : void 0) ??
    (normalized === MEDIAKIT_ENHANCE_BILLING_KEY ||
    normalized.startsWith(MEDIAKIT_ENHANCE_BILLING_PREFIX)
      ? {
          key: "canvas.enhanceVideo.label",
          fallback: "HD & FPS",
        }
      : void 0);
  if (label) {
    const fallback = redactModelAliasesForDisplay(label.fallback, region);
    return label.key && t2
      ? t2(label.key, {
          defaultValue: fallback,
        })
      : fallback;
  }
  return isMiniMaxH3BillingKey(normalized) ? "MiniMax H3" : void 0;
}
export function getBillingModelDisplayName(metadata, t2, models) {
  const isAgent =
    metadata.billingType.trim().toLowerCase() === "token" ||
    metadata.mediaType.trim().toLowerCase() === "agent";
  if (isAgent) {
    return t2
      ? t2("credits.tabAgent", {
          defaultValue: AGENT_DISPLAY_NAME,
        })
      : AGENT_DISPLAY_NAME;
  }
  const rawModelKey = metadata.modelKey.trim();
  const displayName2 = metadata.modelDisplayName.trim();
  const modelKey = rawModelKey || displayName2;
  const fallbackName = displayName2 || modelKey || LEGACY_MEDIA_DISPLAY_NAME;
  if (!modelKey) return fallbackName;
  const region = getRuntimeConfig().region;
  const catalogDisplayName = getCatalogModelDisplayName(metadata, models);
  if (catalogDisplayName) return redactModelAliasesForDisplay(catalogDisplayName, region);
  const billingModelLabel =
    getBillingModelLabel(modelKey, t2, region) ??
    getBillingModelLabel(metadata.modelDisplayName, t2, region);
  if (billingModelLabel) return billingModelLabel;
  if (displayName2 && (!rawModelKey || displayName2 !== rawModelKey)) {
    if (normalizeLegacyModelId(displayName2) !== displayName2) {
      return redactModelAliasesForDisplay(displayName2, region);
    }
    const mediaType2 = metadata.mediaType || "image";
    const resolvedByDisplay = resolveModelDisplayName("", displayName2, region, mediaType2);
    return redactModelAliasesForDisplay(resolvedByDisplay, region);
  }
  const mediaType = metadata.mediaType || "image";
  const resolved = resolveModelDisplayName("", modelKey, region, mediaType);
  if (resolved !== modelKey) return resolved;
  return redactModelAliasesForDisplay(fallbackName, region);
}
function normalizeCatalogMediaType(type2) {
  return type2.trim().toLowerCase() === "music" ? "audio" : type2.trim().toLowerCase();
}
function getCatalogModelDisplayName(metadata, models) {
  if (!models?.length) return void 0;
  if (!metadata.modelDisplayName.trim()) return void 0;
  const candidates2 = new Set(
    [metadata.modelDisplayName, metadata.modelKey]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (candidates2.size === 0) return void 0;
  const mediaType = normalizeCatalogMediaType(metadata.mediaType);
  const match2 = models.find((model) => {
    if (mediaType && normalizeCatalogMediaType(model.type) !== mediaType) return false;
    return [model.id, model.display_name, model.model_name].some((value) =>
      value ? candidates2.has(value.trim().toLowerCase()) : false,
    );
  });
  return match2?.display_name.trim() || void 0;
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
function formatNumber$2(value) {
  return BigInt(value).toLocaleString();
}
const PACKAGE_CREDIT_CATEGORY_LABELS = {
  subscription: {
    key: "credits.transaction.category.subscription",
    fallback: "Subscription credit",
  },
  top_up: {
    key: "credits.transaction.category.topUp",
    fallback: "Top-up credit",
  },
  gift: {
    key: "credits.transaction.category.gift",
    fallback: "Gift credit",
  },
};
export function getPackageCreditCategoryLabel(creditCategory, t2) {
  const category = PACKAGE_CREDIT_CATEGORY_LABELS[creditCategory ?? ""];
  if (!category) return void 0;
  return category.key && t2
    ? t2(category.key, {
        defaultValue: category.fallback,
      })
    : category.fallback;
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
    amount: `${isCredit ? "+" : "-"}${formatNumber$2(item.amount)}`,
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
function CreditModelTable({ items, models, activeTab, loading, error, onRetry }) {
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
        <Select$1 value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
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
        </Select$1>
        <span>{t2("credits.entries")}</span>
      </div>
      <div className="flex items-center gap-3">
        {isFetching && !loading && <Skeleton className="h-4 w-12" />}
        <span className="text-xs text-muted-foreground">
          {t2("credits.pageNumber", {
            page: currentPage,
          })}
        </span>
        <Button$1
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canPrev}
          onClick={goPrev}
          aria-label={t2("credits.prev")}
          data-action-ui-id="credits.pagination-prev"
        >
          <ChevronLeft />
        </Button$1>
        <Button$1
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!canNext}
          onClick={goNext}
          aria-label={t2("credits.next")}
          data-action-ui-id="credits.pagination-next"
        >
          <ChevronRight$1 />
        </Button$1>
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
const FREE_PRIVILEGE_TYPE$1 = 0;
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
  const isFree = !mpWallet || mpWallet.privilege_type === FREE_PRIVILEGE_TYPE$1;
  const planName = mpWallet?.plan_name?.trim() || t2("credits.freePlan");
  const cta = isFree ? t2("credits.upgradeSubscription") : t2("credits.viewSubscription");
  const cycleKey = mpWallet?.cycle_type ? CYCLE_LABEL_KEYS[mpWallet.cycle_type] : void 0;
  const cycleLabel = cycleKey ? t2(cycleKey) : "";
  const title = !isFree && cycleLabel ? `${planName} · ${cycleLabel}` : planName;
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
        <h3 className="truncate font-heading text-sm font-medium text-foreground">{title}</h3>
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
      <Button$1
        type="button"
        variant="outline"
        className="shrink-0"
        disabled={!checkoutDecision.allowed}
        title={checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode}
        onClick={openSubscribePage}
        data-action-ui-id="credits.subscription-cta"
      >
        {cta}
      </Button$1>
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
  const { isLoading: walletLoading, isError, isRefetchError } = useWalletQuery();
  const walletError = isError || isRefetchError;
  const mpWallet = useMpWallet();
  const summary = useMpCreditSummary();
  const subscribeUrl = useMpSubscribeUrl();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const { markAsRead: markRenewalNoticeAsRead } = useSubscriptionRenewalNotice();
  const teamAccount = useOptionalTeamAccount();
  const transferScope = (teamAccount?.integrationEnabled ? teamAccount.activeScope : null) ?? null;
  const transferTabVisible = transferScope !== null;
  const [tab2, setTab] = reactExports.useState(TRANSACTION_TYPE.ALL);
  const transferTabActive = transferTabVisible && tab2 === TRANSFER_TAB;
  const transfersQuery = useTeamTransfersFeedQuery({
    scope: transferScope,
    enabled: open && transferTabActive,
    allowPersonalScope: true,
  });
  const transfers = transfersQuery.data?.pages.flatMap((page) => page.items) ?? [];
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
  const region = getRuntimeConfig().region === "domestic" ? "domestic" : "overseas";
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
                  model: formatTransferCounterparty$1(transfer),
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
            <Icon icon={Info$1} size="md" className="mt-0.5 shrink-0" aria-hidden={true} />
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
                          void openExternalUrl(platform2, getHailuoCreditsRulesUrl(region), {
                            source: "credits.details.model-costs",
                          });
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
                            getUserProtocolUrl(region, getRuntimeConfig().channel, "pointsRules"),
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
            <Button$1
              type="button"
              className="px-4 sm:px-6"
              disabled={!checkoutDecision.allowed}
              title={checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode}
              onClick={openSubscribePage}
              data-action-ui-id="credits.purchase-more"
            >
              {t2("credits.purchaseMore")}
            </Button$1>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function formatTransferCounterparty$1(transfer) {
  const name2 = transfer.counterpartyGroupName;
  const id2 = transfer.counterpartyGroupId;
  if (!name2 && !id2) return "—";
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      {name2 ? <span className="min-w-0 break-words">{name2}</span> : null}
      {name2 && id2 ? <span className="shrink-0 text-muted-foreground">/</span> : null}
      {id2 ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{id2}</span>
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
        <SummaryCard label={t2("credits.remaining")} value={creditTypes.total} />
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
  const validityActionId = tooltipKey?.replace(/^credits\./, "").replace(/Tip(?:MP)?$/, "");
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
              validityActionId ? `credits.${validityActionId}.validity` : "credits.validity"
            }
          />
        }
      >
        <Icon icon={Info$1} size="sm" aria-hidden={true} />
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
function parseThreshold(value) {
  if (!/^\d+$/.test(value.trim())) return void 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : void 0;
}
export function CreditReminderSettings({ config: config2, onBack, onSave }) {
  const { t: t2 } = useTranslation();
  const [enabled, setEnabled] = reactExports.useState(config2.enabled);
  const [thresholdInput, setThresholdInput] = reactExports.useState(String(config2.threshold));
  const [saving, setSaving] = reactExports.useState(false);
  const [saveError, setSaveError] = reactExports.useState(false);
  const threshold = parseThreshold(thresholdInput);
  const thresholdInRange =
    threshold !== void 0 &&
    threshold >= MIN_CREDIT_REMINDER_THRESHOLD &&
    threshold <= MAX_CREDIT_REMINDER_THRESHOLD;
  const thresholdInvalid = enabled && !thresholdInRange;
  const handleSave = async () => {
    if (thresholdInvalid) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({
        enabled,
        threshold: thresholdInRange ? threshold : config2.threshold,
      });
      onBack();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-3" data-action-ui-id="chat-credit-reminder-settings">
      <div className="flex items-center gap-1">
        <Button$1
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t2("common.back", "Back")}
          onClick={onBack}
          data-action-ui-id="chat-credit-reminder-settings.back"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </Button$1>
        <h3
          id="chat-credit-reminder-settings-title"
          className="font-heading text-sm font-medium text-foreground"
        >
          {t2("chat.creditReminder.settingsTitle", "Credit usage reminder")}
        </h3>
      </div>
      <p className="text-xs/relaxed text-muted-foreground">
        {t2(
          "chat.creditReminder.settingsDescription",
          "Remind me before one generation reaches the selected credit amount.",
        )}
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] text-foreground">
            {t2("chat.creditReminder.enabledLabel", "Credit usage reminder")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {enabled
              ? t2("chat.creditReminder.enabled", "On")
              : t2("chat.creditReminder.disabled", "Off")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
          aria-label={t2("chat.creditReminder.enabledLabel", "Credit usage reminder")}
          data-action-ui-id="chat-credit-reminder-settings.toggle"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="chat-credit-reminder-threshold" className="text-xs text-foreground/70">
          {t2("chat.creditReminder.thresholdLabel", "Reminder amount")}
        </label>
        <Input3
          id="chat-credit-reminder-threshold"
          type="number"
          min={MIN_CREDIT_REMINDER_THRESHOLD}
          max={MAX_CREDIT_REMINDER_THRESHOLD}
          step={100}
          value={thresholdInput}
          disabled={!enabled}
          aria-invalid={thresholdInvalid}
          aria-describedby="chat-credit-reminder-threshold-hint"
          onChange={(event) => setThresholdInput(event.target.value)}
          data-action-ui-id="chat-credit-reminder-settings.threshold"
        />
        <p
          id="chat-credit-reminder-threshold-hint"
          className={
            thresholdInvalid ? "text-[11px] text-destructive" : "text-[11px] text-muted-foreground"
          }
        >
          {thresholdInvalid
            ? t2("chat.creditReminder.thresholdError", {
                min: MIN_CREDIT_REMINDER_THRESHOLD.toLocaleString(),
                max: MAX_CREDIT_REMINDER_THRESHOLD.toLocaleString(),
                defaultValue: "Enter an amount from {{min}} to {{max}}.",
              })
            : t2("chat.creditReminder.accountScope", "Applies to all projects in this account.")}
        </p>
        {saveError && (
          <p className="text-[11px] text-destructive" role="alert">
            {t2("chat.creditReminder.saveError", "Could not save. Your changes are still here.")}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button$1
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          data-action-ui-id="chat-credit-reminder-settings.cancel"
        >
          {t2("common.cancel", "Cancel")}
        </Button$1>
        <Button$1
          type="button"
          size="sm"
          loading={saving}
          disabled={thresholdInvalid}
          onClick={() => void handleSave()}
          data-action-ui-id="chat-credit-reminder-settings.save"
        >
          {t2("common.save", "Save")}
        </Button$1>
      </div>
    </div>
  );
}
export const LEGACY_PERSONAL_GROUP_ID = "default";
