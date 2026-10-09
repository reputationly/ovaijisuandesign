// use-credit-details.jsx
import { useTranslation, reactExports, ChevronRight$1, useQuery, useQueryClient, Info$1, useMutation, guardAccountSubmission, ArrowRight, PopoverArrow$1, PopoverPortal, PopoverPositioner, PopoverPopup } from "../vendor.js";
import { getLastGatewayTraceId } from "../m15/agent-ws-client.jsx";
import { creditQueryKeys, useAuth, useCreditAccountState, useOptionalTeamAccount, canonicalCreditScope, legacyPersonalCreditScope, MpIcon } from "../m15/apply-asset-change.jsx";
import { PopoverTitle$1, PopoverDescription$1 } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { Tooltip, TooltipTrigger, TooltipProvider } from "../m15/graph.jsx";
import { WalletSource, CreditType } from "../m01/text-models.js";
import { TooltipContent, cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { creditLog, appendOpenPlatformTrackingParams } from "../m08/shortcut-categories.jsx";
import { SegmentedSwitch$1 } from "../m01/params-popup.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CREDIT_CACHE_GC_MS$1,
  Skeleton,
  creditScopeMatchesCurrentDecision,
  fetchTransactions,
  fetchWalletInfo,
  migrateCredit,
  useWalletQuery,
} from "./infinite-scroll-container.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
function useSubscriptionWalletQuery() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const teamAccount = useOptionalTeamAccount();
  const canonicalScope = teamAccount?.activeScope
    ? canonicalCreditScope(teamAccount.activeScope)
    : null;
  const legacyScope = user?.userID ? legacyPersonalCreditScope(user.userID) : null;
  const queryScope = teamAccount?.integrationEnabled ? canonicalScope : legacyScope;
  const canonicalReady = Boolean(
    canonicalScope &&
    teamAccount?.accountDataVisible &&
    teamAccount.billingAvailable &&
    (teamAccount.viewModel.kind === "ready_personal" ||
      teamAccount.viewModel.kind === "ready_team"),
  );
  const canReadSubscriptionWallet = teamAccount?.integrationEnabled
    ? canonicalReady
    : legacyScope !== null;
  const enabled = !isLoading && isLoggedIn && queryScope !== null && canReadSubscriptionWallet;
  const accountType = teamAccount?.viewModel.kind === "ready_team" ? "TEAM" : "PERSONAL";
  const subscriptionContext = {
    accountType,
    groupId: teamAccount?.activeScope?.groupId,
  };
  const query = useQuery({
    queryKey: queryScope
      ? creditQueryKeys.subscriptionWallet(queryScope)
      : creditQueryKeys.unavailable("subscription-wallet"),
    queryFn: ({ signal }) => {
      if (!queryScope || !canReadSubscriptionWallet) {
        throw new Error("Subscription wallet queried without a readable account scope");
      }
      return fetchWalletInfo(signal);
    },
    enabled,
    staleTime: 2e3,
    gcTime: CREDIT_CACHE_GC_MS$1,
    retry: false,
  });
  return enabled
    ? {
        ...query,
        subscriptionContext,
      }
    : {
        ...query,
        data: void 0,
        subscriptionContext,
      };
}
export function useMpSubscriptionWalletQuery() {
  const query = useSubscriptionWalletQuery();
  const mpWallet = query.data?.wallets?.find((w3) => w3.source === WalletSource.WALLET_SOURCE_OP);
  return {
    ...query,
    mpWallet,
  };
}
export function useMpWallet() {
  const { data: data2 } = useWalletQuery();
  return data2?.wallets?.find((w3) => w3.source === WalletSource.WALLET_SOURCE_OP);
}
export function useMpSubscribeUrl() {
  const { mpWallet, subscriptionContext } = useMpSubscriptionWalletQuery();
  return appendOpenPlatformTrackingParams(mpWallet?.url, mpWallet?.source, subscriptionContext);
}
function deriveMpCreditSummary(mpWallet) {
  if (!mpWallet) {
    return {
      total: 0,
      membership: 0,
      topUp: 0,
      bonus: 0,
      transfer: 0,
      hasBreakdown: false,
    };
  }
  const sumByType = (type2) =>
    (mpWallet.sub_credits ?? [])
      .filter((sc) => sc.credit_type === type2)
      .reduce((acc, sc) => acc + (sc.credit ?? 0), 0);
  return {
    total: mpWallet.total_credit ?? 0,
    membership: sumByType(CreditType.CREDIT_TYPE_MEMBERSHIP),
    topUp: sumByType(CreditType.CREDIT_TYPE_TOP_UP),
    bonus: sumByType(CreditType.CREDIT_TYPE_BONUS),
    transfer: sumByType(CreditType.CREDIT_TYPE_TRANSFER),
    hasBreakdown: true,
  };
}
export function useMpCreditSummary() {
  return deriveMpCreditSummary(useMpWallet());
}
export function useTeamWalletCreditSummary(scope, enabled = true) {
  const queryScope = scope ? canonicalCreditScope(scope) : null;
  const query = useQuery({
    queryKey: queryScope
      ? creditQueryKeys.wallet(queryScope)
      : creditQueryKeys.unavailable("team-wallet"),
    queryFn: ({ signal }) => {
      if (!queryScope) throw new Error("Team wallet queried without an account scope");
      return fetchWalletInfo(signal);
    },
    enabled: enabled && queryScope !== null,
    staleTime: 2e3,
    gcTime: CREDIT_CACHE_GC_MS$1,
    retry: false,
  });
  const mpWallet = query.data?.wallets?.find((w3) => w3.source === WalletSource.WALLET_SOURCE_OP);
  const summary = deriveMpCreditSummary(mpWallet);
  const trusted = !query.isError && !query.isRefetchError && summary.hasBreakdown;
  return {
    ...query,
    summary,
    trusted,
  };
}
export function useHailuoWallet() {
  const { data: data2 } = useWalletQuery();
  return data2?.wallets?.find((w3) => w3.source === WalletSource.WALLET_SOURCE_HILO);
}
export function useCanMigrate() {
  const { data: data2, isError, isRefetchError } = useWalletQuery();
  if (isError || isRefetchError) return false;
  if (!data2?.can_migrate) return false;
  const endTime = data2.migrate_end_time ?? 0;
  return endTime > 0 && Date.now() < endTime;
}
export function useHiloToMpRatio() {
  return 10;
}
export function useMigrateDeadline() {
  const { data: data2 } = useWalletQuery();
  const endTime = data2?.migrate_end_time ?? 0;
  if (endTime <= 0) return null;
  const d2 = new Date(endTime);
  const yyyy = d2.getFullYear();
  const mm = String(d2.getMonth() + 1).padStart(2, "0");
  const dd2 = String(d2.getDate()).padStart(2, "0");
  return {
    date: `${yyyy}/${mm}/${dd2}`,
  };
}
export function useMigrateCredit() {
  const queryClient2 = useQueryClient();
  const { queryScope, canMutatePersonalCredit } = useCreditAccountState();
  const submittedScopesRef = reactExports.useRef(new WeakMap());
  return useMutation({
    mutationFn: (request) => {
      if (!queryScope || !canMutatePersonalCredit) {
        throw new Error("Credit migration is unavailable for the active account scope");
      }
      const decision = guardAccountSubmission("personal_credit_mutation");
      const scopeMatches =
        decision.allowed &&
        (queryScope.kind === "legacyPersonal"
          ? decision.mode === "LEGACY_PERSONAL"
          : decision.mode === "CANONICAL" &&
            accountScopeEquals(decision.scope, queryScope.accountScope));
      if (!scopeMatches) {
        throw new Error("Credit migration blocked: canonical account scope changed");
      }
      submittedScopesRef.current.set(request, queryScope);
      return migrateCredit(request);
    },
    onSuccess: (resp, request) => {
      const submittedScope = submittedScopesRef.current.get(request) ?? null;
      submittedScopesRef.current.delete(request);
      if (resp.ok) {
        creditLog.info("migrate.success", {
          transferred_amount: resp.transferred_amount,
        });
        if (submittedScope && creditScopeMatchesCurrentDecision(submittedScope)) {
          queryClient2.invalidateQueries({
            queryKey: creditQueryKeys.account(submittedScope),
          });
        }
      } else {
        creditLog.warn("migrate.rejected", {
          error_code: resp.error_code,
          error_message: resp.error_message,
        });
      }
    },
    onError: (err, request) => {
      submittedScopesRef.current.delete(request);
      creditLog.error("migrate.failed", {
        error: err,
        traceId: getLastGatewayTraceId(),
      });
    },
    retry: false,
  });
}
export function ShellIcon({ size: size2 = 14, className }) {
  return (
    <svg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M8.00048 1.82032C6.45773 1.81807 5.19485 2.38132 4.46364 3.58012C4.43766 3.62272 4.42779 3.67378 4.43462 3.72321C4.77643 6.19795 5.30049 8.145 5.40694 8.27814C4.92051 7.79389 4.28303 6.2985 3.68679 4.55829C3.66021 4.48072 3.59361 4.42262 3.51225 4.41238C2.63633 4.55829 1.57668 5.5607 1.25741 6.41925C-0.0504929 9.93425 4.9445 12.3503 4.9445 12.3503C4.9445 12.3503 5.47745 13.2418 6.06218 13.5395C6.44152 13.7327 6.98931 13.5734 7.32494 13.5395C8.01775 13.4697 7.91795 13.4697 8.61077 13.5395C8.94639 13.5734 9.51083 13.7193 9.87461 13.5395C10.475 13.2429 10.8305 12.3503 10.8305 12.3503C10.8305 12.3503 16.0386 9.93425 14.7306 6.41925C14.4114 5.5607 13.3517 4.55829 12.4758 4.41238C12.3944 4.42262 12.3279 4.48072 12.3013 4.55829C11.705 6.2985 11.0676 7.79389 10.5811 8.27814C10.6876 8.145 11.2116 6.19795 11.5534 3.72321C11.5603 3.67378 11.5504 3.62272 11.5244 3.58012C10.7932 2.38132 9.53872 1.82256 8.00048 1.82032Z" />
    </svg>
  );
}
export function SubscriptionRenewalBadge({ placement = "corner" }) {
  return (
    <span
      aria-hidden={true}
      data-slot="subscription-renewal-badge"
      className={cn$2(
        "pointer-events-none rounded-full bg-destructive",
        placement === "inline"
          ? "size-1.5 shrink-0"
          : "absolute -top-0.5 -right-0.5 size-2 ring-1 ring-background",
      )}
    />
  );
}
export function MpCreditRow({ onClick, showRenewalBadge = false }) {
  const { t: t2 } = useTranslation();
  const { data: data2, isLoading, isError, isRefetchError } = useWalletQuery();
  const walletFailed = isError || isRefetchError;
  const mpWallet = useMpWallet();
  const mpCredits = mpWallet?.total_credit ?? 0;
  const loggedDashRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!isLoading && walletFailed) {
      if (!loggedDashRef.current) {
        loggedDashRef.current = true;
        creditLog.warn("mp_row.render_dash", {
          isError,
          isRefetchError,
          hasData: !!data2,
          walletsCount: data2?.wallets?.length,
          walletSources: data2?.wallets?.map((w3) => w3.source),
          mpTotalCredit: mpWallet?.total_credit,
          traceId: getLastGatewayTraceId(),
        });
      }
    } else {
      loggedDashRef.current = false;
    }
  }, [isLoading, walletFailed, isError, isRefetchError, data2, mpWallet]);
  return (
    <button
      type="button"
      data-action-ui-id="user-menu.mp-credit-row"
      className="flex h-9 w-full cursor-pointer items-center justify-between rounded-sm px-2 leading-5 text-foreground transition-colors hover:bg-accent"
      onClick={onClick}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className="truncate">{t2("mediaplan.userMenu.mpCreditLabel")}</span>
        {showRenewalBadge && <SubscriptionRenewalBadge placement="inline" />}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {isLoading ? (
          <Skeleton className="h-4 w-12" />
        ) : walletFailed ? (
          <span className="text-xs text-muted-foreground">--</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium tabular-nums text-foreground">
            <MpIcon size={13} />
            <span>{mpCredits.toLocaleString()}</span>
          </span>
        )}
        <ChevronRight$1 size={14} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
    </button>
  );
}
export function HailuoCreditRow({ onExchange }) {
  const { t: t2 } = useTranslation();
  const { data: data2, isLoading, isError, isRefetchError } = useWalletQuery();
  const walletFailed = isError || isRefetchError;
  const hailuoWallet = useHailuoWallet();
  const hailuoCredits = hailuoWallet?.total_credit ?? 0;
  const loggedDashRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!isLoading && walletFailed) {
      if (!loggedDashRef.current) {
        loggedDashRef.current = true;
        creditLog.warn("hailuo_row.render_dash", {
          isError,
          isRefetchError,
          hasData: !!data2,
          walletSources: data2?.wallets?.map((w3) => w3.source),
          hailuoCredits: hailuoWallet?.total_credit,
          traceId: getLastGatewayTraceId(),
        });
      }
    } else {
      loggedDashRef.current = false;
    }
  }, [isLoading, walletFailed, isError, isRefetchError, data2, hailuoWallet]);
  if (!isLoading && !walletFailed && hailuoCredits <= 0) return null;
  return (
    <div className="flex h-9 w-full items-center justify-between gap-2 rounded-sm px-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {t2("userMenu.hailuoBalanceLabel")}
        </span>
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Info$1 size={12} className="shrink-0 cursor-help text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="max-w-72 text-xs">
              {t2("mediaplan.userMenu.hailuoTooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isLoading ? (
          <Skeleton className="h-4 w-12" />
        ) : walletFailed ? (
          <span className="text-xs text-muted-foreground">--</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-foreground">
            <ShellIcon size={13} />
            <span>{hailuoCredits.toLocaleString()}</span>
          </span>
        )}
        <button
          type="button"
          data-action-ui-id="user-menu.hailuo-exchange"
          onClick={onExchange}
          disabled={hailuoCredits <= 0}
          className="inline-flex h-[18px] cursor-pointer items-center gap-0.5 whitespace-nowrap rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t2("userMenu.hailuoBalanceRedeemCta")}
          <ArrowRight size={10} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
export function PopoverArrow({ className, ...props }) {
  return (
    <PopoverArrow$1
      data-slot="popover-arrow"
      className={cn$2("fill-popover stroke-border", className)}
      {...props}
    />
  );
}
export function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 2,
  anchor,
  collisionAvoidance,
  collisionPadding,
  positionerClassName,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <PopoverPortal>
      <PopoverPositioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionAvoidance={collisionAvoidance}
        collisionPadding={collisionPadding}
        className={cn$2("isolate z-50", positionerClassName)}
      >
        <PopoverPopup
          data-slot="popover-content"
          className={cn$2(
            "elevated-surface-border z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
            motion === "quick-zoom" && "dp-motion-quick-zoom",
            // Explicit compatibility exception for the hover-only canvas tag palette.
            motion === "legacy" &&
              "duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </PopoverPositioner>
    </PopoverPortal>
  );
}
export function PopoverHeader({ className, ...props }) {
  return (
    <div
      data-slot="popover-header"
      className={cn$2("flex flex-col gap-1 text-xs", className)}
      {...props}
    />
  );
}
export function PopoverTitle({ className, ...props }) {
  return (
    <PopoverTitle$1
      data-slot="popover-title"
      className={cn$2("text-sm font-medium", className)}
      {...props}
    />
  );
}
export function PopoverDescription({ className, ...props }) {
  return (
    <PopoverDescription$1
      data-slot="popover-description"
      className={cn$2("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function SegmentedSwitch(props) {
  return (
    <SegmentedSwitch$1
      {...props}
      renderTooltip={(button, content2) => (
        <Tooltip key={button.key}>
          <TooltipTrigger render={button} />
          <TooltipContent side="bottom">{content2}</TooltipContent>
        </Tooltip>
      )}
    />
  );
}
export const TRANSACTION_TYPE = {
  ALL: "all",
  CONSUMED: "consumed",
  REFUNDED: "refunded",
};
const DEFAULT_PAGE_SIZE$1 = 25;
const CREDIT_CACHE_GC_MS = 5 * 6e4;
export const CREDIT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export function useCreditDetails(open) {
  const [activeTab, setActiveTabState] = reactExports.useState(TRANSACTION_TYPE.ALL);
  const [pageSize, setPageSizeState] = reactExports.useState(DEFAULT_PAGE_SIZE$1);
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
        throw new Error("Personal transactions queried without a readable account scope");
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
  const canNext = Boolean(visiblePageData?.hasMore && visiblePageData.nextCursor);
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
