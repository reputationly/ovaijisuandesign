// infinite-scroll-container.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  Tooltip,
  TooltipTrigger,
  gatewayFetch,
  useQuery,
  creditQueryKeys,
  TooltipProvider,
  useTeamAccount,
  evaluateAccountSubmission,
  Info$1,
  getLastGatewayTraceId,
  useAuth,
  useCreditAccountState,
} from "../vendor.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button$1,
  TooltipContent,
  cn$2,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { creditLog } from "../m08/shortcut-categories.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { CLOUD_SERVER_TIME_HEADER } from "../m01/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatCreditAmount, getTeamReasonText } from "./account-switcher-view.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
import { Spinner } from "./use-team-transactions-feed-query.jsx";
export function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn$2(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
const MAX_TEAM_NAME_LENGTH = 64;
export function CreateTeamFormSurface({
  inputId,
  inputActionId,
  cancelActionId,
  submitActionId,
  teamName,
  placeholder,
  disabled: disabled2,
  submitting,
  submitDisabled,
  actionsDisabled = false,
  statusText,
  statusTone = "neutral",
  autoFocus = false,
  submitLabel,
  onTeamNameChange,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  return (
    <>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>
            {t2("team.create.nameLabel", {
              defaultValue: "团队名称",
            })}
          </Label>
          <Input3
            id={inputId}
            value={teamName}
            onChange={(event) => onTeamNameChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled2}
            maxLength={MAX_TEAM_NAME_LENGTH}
            autoFocus={autoFocus}
            data-action-ui-id={inputActionId}
          />
        </div>
        {statusText ? (
          <p
            role={statusTone === "destructive" ? "alert" : "status"}
            aria-live={statusTone === "destructive" ? "assertive" : "polite"}
            className={
              statusTone === "destructive"
                ? "break-words rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                : "break-words rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            }
          >
            {statusText}
          </p>
        ) : null}
      </div>
      <DialogFooter className="sticky bottom-0 border-t border-border bg-popover px-4 py-3 sm:px-6 sm:py-4">
        <Button$1
          type="button"
          variant="outline"
          className="h-auto min-h-8 min-w-0 whitespace-normal text-center leading-relaxed"
          disabled={actionsDisabled}
          onClick={onCancel}
          data-action-ui-id={cancelActionId}
        >
          {t2("common.cancel", {
            defaultValue: "取消",
          })}
        </Button$1>
        <Button$1
          type="submit"
          className="h-auto min-h-8 min-w-0 whitespace-normal text-center leading-relaxed"
          loading={submitting}
          disabled={actionsDisabled || submitDisabled}
          data-action-ui-id={submitActionId}
        >
          {submitLabel ??
            t2("team.create.submit", {
              defaultValue: "创建并切换",
            })}
        </Button$1>
      </DialogFooter>
    </>
  );
}
export function CreateTeamDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const { createTeamAndSwitch, lastTransitionAttempt } = useTeamAccount();
  const [teamName, setTeamName] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [localAttempt, setLocalAttempt] = reactExports.useState(null);
  const statusAttempt = localAttempt ?? lastTransitionAttempt;
  const recovering = statusAttempt?.kind === "recovering";
  const statusText =
    statusAttempt?.kind === "busy"
      ? getTeamReasonText(t2, "switch_busy")
      : statusAttempt?.kind === "rejected"
        ? getTeamReasonText(t2, statusAttempt.code)
        : statusAttempt?.kind === "recovering"
          ? getTeamReasonText(t2, statusAttempt.reasonCode)
          : null;
  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedName = teamName.trim();
    if (!normalizedName || submitting || recovering) return;
    setSubmitting(true);
    setLocalAttempt(null);
    try {
      const result = await createTeamAndSwitch(normalizedName);
      if (result.status === "completed") {
        setTeamName("");
        setLocalAttempt(null);
        return;
      }
      if (result.status === "rejected") {
        setLocalAttempt({
          kind: "rejected",
          code: result.code,
        });
      } else if (result.status === "busy") {
        setLocalAttempt({
          kind: "busy",
          blockingReasons: result.blockingReasons,
        });
      } else if (result.status === "recovering") {
        setLocalAttempt({
          kind: "recovering",
          reasonCode: result.reasonCode,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.create-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pt-5 sm:pr-16 sm:pb-4">
          <DialogTitle>
            {t2("team.create.title", {
              defaultValue: "创建团队",
            })}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <span>
              {t2("team.create.description", {
                defaultValue:
                  "团队拥有独立积分账户，购买的积分由团队成员共享，每位成员可单独配置额度。",
              })}
            </span>
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="inline-flex shrink-0 text-muted-foreground"
                      data-action-ui-id="team.create-credit-info"
                    />
                  }
                >
                  <Info$1 size={14} strokeWidth={1.5} aria-hidden={true} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t2("team.create.creditInfo", {
                    defaultValue: "团队账号积分需单独购买，不与个人账号互通。",
                  })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
          <CreateTeamFormSurface
            inputId="team-create-name"
            inputActionId="team.create-name-input"
            cancelActionId="team.create-cancel"
            submitActionId="team.create-submit"
            teamName={teamName}
            placeholder={t2("team.create.namePlaceholder", {
              defaultValue: "输入团队名称",
            })}
            disabled={submitting || recovering}
            submitting={submitting}
            submitDisabled={recovering || teamName.trim().length === 0}
            statusText={statusText}
            statusTone={statusAttempt?.kind === "rejected" ? "destructive" : "neutral"}
            autoFocus={true}
            submitLabel={t2("team.create.submit", {
              defaultValue: "创建并切换",
            })}
            onTeamNameChange={setTeamName}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function DissolveTransferSuccessDialog({ result, onClose }) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-action-ui-id="team.management-dissolve-transfer-success">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.dissolveTransferSuccessTitle", {
              defaultValue: "积分转移成功",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("team.management.dissolveTransferSuccessDescription", {
              defaultValue: "已成功将 {{amount}} 积分转入“{{target}}”。",
              amount: formatCreditAmount(result.amount),
              target: result.targetName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            {t2("common.confirm", {
              defaultValue: "确认",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const INFINITE_SCROLL_PRELOAD_BATCHES = 3;
const LOAD_AHEAD_PX = 160;
export function InfiniteScrollContainer({
  children: children2,
  loadedBatchCount,
  hasMore,
  isLoadingMore,
  loadMoreError = false,
  onLoadMore,
  className,
  preloadBatchCount = INFINITE_SCROLL_PRELOAD_BATCHES,
  actionUiId,
}) {
  const viewportRef = reactExports.useRef(null);
  const sentinelRef = reactExports.useRef(null);
  const requestedAtBatchRef = reactExports.useRef(null);
  const hadLoadMoreErrorRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (requestedAtBatchRef.current !== loadedBatchCount) {
      requestedAtBatchRef.current = null;
    }
  }, [loadedBatchCount]);
  reactExports.useEffect(() => {
    if (loadMoreError) {
      hadLoadMoreErrorRef.current = true;
      return;
    }
    if (hadLoadMoreErrorRef.current) {
      hadLoadMoreErrorRef.current = false;
      requestedAtBatchRef.current = null;
    }
  }, [loadMoreError]);
  const requestLoadMore = reactExports.useCallback(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      loadMoreError ||
      requestedAtBatchRef.current === loadedBatchCount
    ) {
      return;
    }
    requestedAtBatchRef.current = loadedBatchCount;
    Promise.resolve(onLoadMore()).catch(() => {
      requestedAtBatchRef.current = null;
    });
  }, [hasMore, isLoadingMore, loadMoreError, loadedBatchCount, onLoadMore]);
  reactExports.useEffect(() => {
    if (loadedBatchCount > 0 && loadedBatchCount < preloadBatchCount) {
      requestLoadMore();
    }
  }, [loadedBatchCount, preloadBatchCount, requestLoadMore]);
  reactExports.useEffect(() => {
    const viewport = viewportRef.current;
    const sentinel = sentinelRef.current;
    if (!viewport || !sentinel || typeof IntersectionObserver === "undefined") return;
    const observer2 = new IntersectionObserver(
      (entries2) => {
        if (entries2.some((entry) => entry.isIntersecting)) requestLoadMore();
      },
      {
        root: viewport,
        rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px`,
      },
    );
    observer2.observe(sentinel);
    return () => observer2.disconnect();
  }, [requestLoadMore]);
  const handleScroll = (event) => {
    const viewport = event.currentTarget;
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom <= LOAD_AHEAD_PX) requestLoadMore();
  };
  return (
    <div
      ref={viewportRef}
      className={cn$2("scrollbar-fade overflow-y-auto", className)}
      onScroll={handleScroll}
      aria-busy={isLoadingMore || void 0}
      data-action-ui-id={actionUiId}
    >
      {children2}
      <div ref={sentinelRef} className="flex min-h-1 items-center justify-center py-1">
        {isLoadingMore ? <Spinner className="text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
export function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn$2("animate-pulse rounded-full bg-muted", className)}
      {...props}
    />
  );
}
const UNSIGNED_DECIMAL_RE = /^(0|[1-9]\d*)$/;
const SIGNED_DECIMAL_RE = /^-?(0|[1-9]\d*)$/;
function asRecord$4(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid billing response at ${field}: expected object`);
  }
  return value;
}
function asString$1(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(`Invalid billing response at ${field}: expected string`);
  }
  return value;
}
function asOptionalString(value, field) {
  if (value === void 0 || value === null) return void 0;
  return asString$1(value, field);
}
function asDecimal(value, field, signed = false) {
  const decimal = asString$1(value, field);
  if (!(signed ? SIGNED_DECIMAL_RE : UNSIGNED_DECIMAL_RE).test(decimal)) {
    throw new TypeError(`Invalid billing response at ${field}: expected decimal string`);
  }
  return decimal;
}
function asPositiveDecimal(value, field) {
  const decimal = asString$1(value, field);
  if (!UNSIGNED_DECIMAL_RE.test(decimal) || decimal === "0") {
    throw new TypeError(`Invalid billing response at ${field}: expected positive decimal string`);
  }
  return decimal;
}
function asSafeInteger(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`Invalid billing response at ${field}: expected safe integer`);
  }
  return value;
}
function asBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new TypeError(`Invalid billing response at ${field}: expected boolean`);
  }
  return value;
}
function asTimestamp(value, field) {
  const decimal = asDecimal(value, field);
  const timestamp2 = Number(decimal);
  if (!Number.isSafeInteger(timestamp2)) {
    throw new TypeError(`Invalid billing response at ${field}: expected safe timestamp`);
  }
  return timestamp2;
}
function mapBillingTransaction(value, index2) {
  const field = `$.items[${index2}]`;
  const source = asRecord$4(value, field);
  const type2 = asString$1(source.type, `${field}.type`);
  if (type2 !== "consume" && type2 !== "refund" && type2 !== "grant" && type2 !== "expired") {
    throw new TypeError(`Invalid billing response at ${field}.type: unsupported value`);
  }
  const reason = asOptionalString(source.reason, `${field}.reason`);
  const creditCategory = asOptionalString(source.credit_category, `${field}.credit_category`);
  return {
    id: asDecimal(source.id, `${field}.id`),
    type: type2,
    source: asString$1(source.source, `${field}.source`),
    billing_type: asString$1(source.billing_type, `${field}.billing_type`),
    amount: asPositiveDecimal(source.amount, `${field}.amount`),
    create_time: asTimestamp(source.create_time, `${field}.create_time`),
    model_key: asString$1(source.model_key, `${field}.model_key`),
    model_display_name: asString$1(source.model_display_name, `${field}.model_display_name`),
    media_type: asString$1(source.media_type, `${field}.media_type`),
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
  const source = asRecord$4(value, "$.credit_summary");
  return {
    total: asDecimal(source.total, "$.credit_summary.total"),
    membership: asDecimal(source.membership, "$.credit_summary.membership"),
    top_up: asDecimal(source.top_up, "$.credit_summary.top_up"),
    bonus: asDecimal(source.bonus, "$.credit_summary.bonus"),
  };
}
function mapBillingTransactionsResponse(value) {
  const source = asRecord$4(value, "$");
  if (!Array.isArray(source.items)) {
    throw new TypeError("Invalid billing response at $.items: expected array");
  }
  return {
    items: source.items.map(mapBillingTransaction),
    pageSize: asSafeInteger(source.page_size, "$.page_size"),
    nextCursorCreateTime: asDecimal(source.next_cursor_create_time, "$.next_cursor_create_time"),
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
export async function fetchTransactions(params, options) {
  const searchParams = new URLSearchParams();
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.type) searchParams.set("type", params.type);
  if (params.cursor) {
    searchParams.set("cursor_create_time", String(params.cursor.createTime));
    searchParams.set("cursor_id", String(params.cursor.id));
  }
  const qs = searchParams.toString();
  const res = await gatewayFetch(`/api/v1/billing/transactions${qs ? `?${qs}` : ""}`, {
    signal: options?.signal,
  });
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
export async function fetchWalletInfo(signal) {
  try {
    const res = await gatewayFetch("/api/v1/credit/wallet", {
      signal,
    });
    if (!res.ok) {
      throw new Error(`fetchWalletInfo failed: HTTP ${res.status}`);
    }
    const raw2 = await res.json();
    signal?.throwIfAborted();
    const serverTime = res.headers.get(CLOUD_SERVER_TIME_HEADER);
    const serverTimeMs = serverTime ? Number(serverTime) : Number.NaN;
    return {
      ...sanitizeWalletInfo(raw2),
      serverTimeMs: Number.isSafeInteger(serverTimeMs) && serverTimeMs > 0 ? serverTimeMs : void 0,
    };
  } catch (err) {
    creditLog.error("wallet.fetch_failed", {
      traceId: getLastGatewayTraceId(),
      error: err,
    });
    throw err;
  }
}
function sanitizeWalletInfo(raw2) {
  const toNum = (v2) => {
    if (typeof v2 === "number") return v2;
    if (typeof v2 === "string" && v2 !== "") {
      const n2 = Number(v2);
      return Number.isFinite(n2) ? n2 : 0;
    }
    return 0;
  };
  const toCreditNum = (v2, source) => {
    if (typeof v2 === "string" && v2 !== "" && !Number.isFinite(Number(v2))) {
      creditLog.warn("wallet.total_credit_coerced_zero", {
        source,
        raw: v2,
      });
    }
    return toNum(v2);
  };
  return {
    ...raw2,
    migrate_end_time: toNum(raw2.migrate_end_time),
    wallets: (raw2.wallets ?? []).map((w3) => ({
      ...w3,
      total_credit: toCreditNum(w3.total_credit, w3.source),
      debit_credit: toNum(w3.debit_credit),
      sub_credits: (w3.sub_credits ?? []).map((sc) => ({
        ...sc,
        credit: toNum(sc.credit),
        end_time: toNum(sc.end_time),
        records: (sc.records ?? []).map((record2) => ({
          ...record2,
          credit: toNum(record2.credit),
          end_time: toNum(record2.end_time),
        })),
      })),
    })),
  };
}
export async function migrateCredit(req) {
  const res = await gatewayFetch("/api/v1/credit/migrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  return await res.json();
}
export const CREDIT_CACHE_GC_MS$1 = 5 * 6e4;
export function creditScopeMatchesCurrentDecision(scope) {
  const decision = evaluateAccountSubmission("personal_credit_mutation");
  if (!decision.allowed) return false;
  if (scope.kind === "legacyPersonal") return decision.mode === "LEGACY_PERSONAL";
  return decision.mode === "CANONICAL" && accountScopeEquals(decision.scope, scope.accountScope);
}
export function useWalletQuery(options = {}) {
  const { isLoggedIn, isLoading } = useAuth();
  const { queryScope, canReadPersonalCredit } = useCreditAccountState();
  const enabled = !isLoading && isLoggedIn && queryScope !== null && canReadPersonalCredit;
  const query = useQuery({
    queryKey: queryScope
      ? creditQueryKeys.wallet(queryScope)
      : creditQueryKeys.unavailable("wallet"),
    queryFn: ({ signal }) => {
      if (!canReadPersonalCredit || !queryScope) {
        throw new Error("Personal wallet queried without a readable account scope");
      }
      return fetchWalletInfo(signal);
    },
    enabled,
    staleTime: 2e3,
    gcTime: CREDIT_CACHE_GC_MS$1,
    retry: false,
    refetchInterval: options.refetchInterval,
  });
  const loggedFailureRef = reactExports.useRef(false);
  const { isError, isRefetchError } = query;
  reactExports.useEffect(() => {
    if (isError || isRefetchError) {
      if (!loggedFailureRef.current) {
        loggedFailureRef.current = true;
        creditLog.warn("wallet.query_failed", {
          isError,
          isRefetchError,
          traceId: getLastGatewayTraceId(),
        });
      }
    } else {
      loggedFailureRef.current = false;
    }
  }, [isError, isRefetchError]);
  return enabled
    ? query
    : {
        ...query,
        data: void 0,
      };
}
