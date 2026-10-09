// use-team-transactions-feed-query.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  Tooltip,
  TooltipTrigger,
  Check,
  Loader2Icon,
  useQuery,
  teamQueryKeys,
  normalizeTeamKeyword,
  creditQueryKeys,
  Icon,
  UserRound,
  Users,
  TooltipProvider,
} from "../vendor.js";
import {
  Button$1,
  TooltipContent,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useInfiniteQuery } from "./map-hub-group-list-response.js";
import { TEAM_LEDGER_PAGE_SIZE, teamApi } from "./team-api.js";
export function isQueryOwnedByIdentity(queryKey, identityKey) {
  return (
    queryKey.includes(identityKey) &&
    (queryKey[0] === "team" || queryKey[0] === "credit" || queryKey[0] === "account")
  );
}
export function isQueryOwnedByScope(queryKey, scope) {
  const scopeIdentity = queryKey.indexOf(scope.identityKey);
  if (scopeIdentity < 0) return false;
  return (
    queryKey[scopeIdentity + 1] === scope.groupId &&
    queryKey[scopeIdentity + 2] === scope.epoch &&
    queryKey[scopeIdentity + 3] === (scope.membershipRevision ?? "PERSONAL")
  );
}
const MINUTE_MS$1 = 6e4;
const TEAM_INFO_REFRESH_MS = 3e4;
const TEAM_CONTRACT_STALE_MS = 5 * MINUTE_MS$1;
const TEAM_CONTRACT_GC_MS = 30 * MINUTE_MS$1;
const IDENTITY_STALE_MS = 3e4;
const IDENTITY_GC_MS = 10 * MINUTE_MS$1;
const MEMBERSHIP_STALE_MS = 2e4;
const MEMBERSHIP_GC_MS = 10 * MINUTE_MS$1;
const CREDIT_STALE_MS = 15e3;
const CREDIT_GC_MS = 5 * MINUTE_MS$1;
function keepPreviousDataForMembershipRevision(
  scope,
  currentQueryKey,
  previousData,
  previousQuery,
) {
  if (!scope || previousData === void 0 || !previousQuery) return void 0;
  const identityIndex = currentQueryKey.indexOf(scope.identityKey);
  const previousIdentityIndex = previousQuery.queryKey.indexOf(scope.identityKey);
  if (
    identityIndex < 0 ||
    previousIdentityIndex !== identityIndex ||
    currentQueryKey[identityIndex + 1] !== scope.groupId ||
    currentQueryKey[identityIndex + 2] !== scope.epoch ||
    previousQuery.queryKey[identityIndex + 1] !== scope.groupId ||
    previousQuery.queryKey[identityIndex + 2] !== scope.epoch ||
    currentQueryKey.length !== previousQuery.queryKey.length
  ) {
    return void 0;
  }
  const revisionIndex = identityIndex + 3;
  for (let index2 = 0; index2 < currentQueryKey.length; index2 += 1) {
    if (index2 !== revisionIndex && currentQueryKey[index2] !== previousQuery.queryKey[index2]) {
      return void 0;
    }
  }
  return previousData;
}
export function useTeamContractQuery(clientVersion, enabled) {
  return useQuery({
    queryKey: teamQueryKeys.contract(clientVersion),
    queryFn: ({ signal }) =>
      teamApi.getContract(clientVersion, {
        signal,
      }),
    enabled,
    retry: false,
    staleTime: TEAM_CONTRACT_STALE_MS,
    gcTime: TEAM_CONTRACT_GC_MS,
  });
}
export function useTeamContextsQuery(identityKey, enabled = true) {
  return useQuery({
    queryKey: teamQueryKeys.contexts(identityKey ?? "NO_IDENTITY"),
    queryFn: ({ signal }) =>
      teamApi.listContexts({
        signal,
      }),
    enabled: enabled && identityKey !== null,
    retry: false,
    staleTime: IDENTITY_STALE_MS,
    gcTime: IDENTITY_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
export function useUserTeamCapabilitiesQuery(identityKey, enabled = true) {
  return useQuery({
    queryKey: teamQueryKeys.userCapabilities(identityKey ?? "NO_IDENTITY"),
    queryFn: ({ signal }) => {
      if (!identityKey) throw new Error("Team capabilities queried without an identity");
      return teamApi.getCapabilities(identityKey, {
        signal,
      });
    },
    enabled: enabled && identityKey !== null,
    retry: false,
    staleTime: IDENTITY_STALE_MS,
    gcTime: IDENTITY_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
export function useTeamDetailQuery(scope, enabled = true) {
  const queryKey = scope
    ? teamQueryKeys.detail(scope)
    : ["team", "membership", "NO_SCOPE", "detail"];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Team detail queried without an account scope");
      return teamApi.getTeamDetail(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(scope, queryKey, previousData, previousQuery),
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
export function useTeamMemberDetailsQuery({ scope, enabled = true }) {
  return useQuery({
    queryKey: scope
      ? teamQueryKeys.memberDetails(scope)
      : ["team", "membership", "NO_SCOPE", "member-details"],
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Team member details queried without an account scope");
      return teamApi.listMemberDetails(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}
export function useInGroupMembersQuery({ scope, enabled = true }) {
  const queryKey = scope
    ? teamQueryKeys.inGroupMembers(scope)
    : ["team", "membership", "NO_SCOPE", "in-group-members"];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("In-group members queried without an account scope");
      return teamApi.listInGroupMembers(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(scope, queryKey, previousData, previousQuery),
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}
export function useTeamMembersFeedQuery({ scope, keyword: keyword2, pageSize, enabled = true }) {
  const normalizedKeyword = normalizeTeamKeyword(keyword2);
  return useInfiniteQuery({
    queryKey: scope
      ? teamQueryKeys.memberFeed(scope, normalizedKeyword, pageSize)
      : ["team", "membership", "NO_SCOPE", "members", normalizedKeyword, "feed", pageSize],
    queryFn: ({ signal, pageParam }) => {
      if (!scope) throw new Error("Team members queried without an account scope");
      return teamApi.listMembers(
        {
          scope,
          keyword: normalizedKeyword,
          cursor: pageParam,
          pageSize,
        },
        {
          signal,
        },
      );
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : void 0,
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}
export function usePastTeamMembersQuery({ scope, keyword: keyword2, enabled = true }) {
  const normalizedKeyword = normalizeTeamKeyword(keyword2);
  return useQuery({
    queryKey: scope
      ? teamQueryKeys.pastTeamMembers(scope, normalizedKeyword)
      : ["team", "membership", "NO_SCOPE", "past-team-members", normalizedKeyword],
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Past team members queried without an account scope");
      return teamApi.queryPastTeamMembers(
        {
          scope,
          keyword: normalizedKeyword,
        },
        {
          signal,
        },
      );
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
  });
}
export function useTeamInviteLinksFeedQuery({ scope, enabled = true }) {
  return useInfiniteQuery({
    queryKey: scope
      ? teamQueryKeys.inviteLinkFeed(scope)
      : ["team", "membership", "NO_SCOPE", "invite-links", "feed"],
    queryFn: ({ signal, pageParam }) => {
      if (!scope) throw new Error("Team invite links queried without an account scope");
      return teamApi.listInviteLinks(scope, pageParam, {
        signal,
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : void 0,
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}
export function useTeamQuotaQuery(scope, enabled = true) {
  return useQuery({
    queryKey: scope ? teamQueryKeys.quota(scope) : ["team", "membership", "NO_SCOPE", "quota"],
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Team quota queried without an account scope");
      return teamApi.getQuota(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: CREDIT_STALE_MS,
    gcTime: CREDIT_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}
export function useTeamCreditSummaryQuery(scope, enabled = true) {
  const queryKey = scope
    ? creditQueryKeys.summary(scope)
    : ["credit", "scope", "NO_SCOPE", "summary"];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Team credit summary queried without an account scope");
      return teamApi.getCreditSummary(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(scope, queryKey, previousData, previousQuery),
    retry: false,
    staleTime: CREDIT_STALE_MS,
    gcTime: CREDIT_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
export function useTeamTransactionsQuery({ scope, cursor, category = "ALL", enabled = true }) {
  return useQuery({
    queryKey: scope
      ? creditQueryKeys.transactions(scope, category, cursor)
      : ["credit", "scope", "NO_SCOPE", "transactions", category, cursor],
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Team transactions queried without an account scope");
      return teamApi.listTransactions(
        {
          scope,
          cursor,
          category,
        },
        {
          signal,
        },
      );
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: 3e4,
    gcTime: CREDIT_GC_MS,
  });
}
export function useTeamTransfersFeedQuery({ scope, enabled = true, allowPersonalScope = false }) {
  const queryKey = scope
    ? creditQueryKeys.transferFeed(scope)
    : ["credit", "scope", "NO_SCOPE", "transfers", "feed"];
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) => {
      if (!scope) throw new Error("Team transfers queried without an account scope");
      return teamApi.listTransfers(
        {
          scope,
          cursor: pageParam,
          pageSize: TEAM_LEDGER_PAGE_SIZE,
        },
        {
          signal,
        },
      );
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : void 0,
    enabled: enabled && scope !== null && (allowPersonalScope || scope.membershipRevision !== null),
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(scope, queryKey, previousData, previousQuery),
    retry: false,
    staleTime: 3e4,
    gcTime: CREDIT_GC_MS,
  });
}
export function useTeamTransactionsFeedQuery({
  scope,
  memberId,
  selfOnly = false,
  category = "ALL",
  startTime,
  endTime,
  enabled = true,
}) {
  const queryKey = scope
    ? memberId
      ? [
          ...creditQueryKeys.memberUsageFeed(scope, memberId, category),
          startTime ?? 0,
          endTime ?? 0,
        ]
      : selfOnly
        ? [...creditQueryKeys.selfTransactionFeed(scope, category), startTime ?? 0, endTime ?? 0]
        : [...creditQueryKeys.transactionFeed(scope, category), startTime ?? 0, endTime ?? 0]
    : [
        "credit",
        "scope",
        "NO_SCOPE",
        "transactions",
        category,
        "feed",
        startTime ?? 0,
        endTime ?? 0,
      ];
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) => {
      if (!scope) throw new Error("Team transactions queried without an account scope");
      return teamApi.listTransactions(
        {
          scope,
          memberId,
          selfOnly,
          cursor: pageParam,
          category,
          pageSize: TEAM_LEDGER_PAGE_SIZE,
          startTime,
          endTime,
        },
        {
          signal,
        },
      );
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : void 0,
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(scope, queryKey, previousData, previousQuery),
    retry: false,
    staleTime: 3e4,
    gcTime: CREDIT_GC_MS,
  });
}
export function Spinner({ className, ...props }) {
  const { t: t2 } = useTranslation();
  return (
    <Loader2Icon
      role="status"
      aria-label={t2("a11y.loading")}
      className={cn$2("size-4 animate-spin", className)}
      {...props}
    />
  );
}
export function AccountSwitcherRowSurface({
  accountType,
  active: active2 = false,
  dataActionUiId,
  dataGroupId,
  dataTeamRole,
  disabled: disabled2 = false,
  disabledReason,
  displayName: displayName2,
  groupId: groupId2,
  loading = false,
  meta: meta2,
  tag,
  onClick,
}) {
  const reasonId = reactExports.useId();
  const { t: t2 } = useTranslation();
  const unavailable = disabled2 && !active2 && Boolean(disabledReason);
  const nativeDisabled = active2 || (disabled2 && !disabledReason);
  const content2 = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
        <Icon
          icon={accountType === "PERSONAL" ? UserRound : Users}
          size="sm"
          className="text-foreground opacity-50"
          aria-hidden={true}
        />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-normal text-body-12 text-current">
            {displayName2}
          </span>
          {meta2 ? (
            <span className="shrink-0 truncate text-caption-11 font-normal text-muted-foreground">
              {meta2}
            </span>
          ) : null}
        </span>
        {groupId2 ? (
          <span className="block truncate text-caption-11 font-normal text-muted-foreground">
            {t2("team.management.groupId", {
              defaultValue: "Group ID",
            })}
            {": "}
            {groupId2}
          </span>
        ) : null}
      </span>
      {tag ? (
        <span className="shrink-0 text-caption-11 font-normal text-muted-foreground">{tag}</span>
      ) : null}
      {loading ? (
        <span role="status" className="inline-flex shrink-0" aria-live="polite">
          <Spinner className="shrink-0" />
          <span className="sr-only">Loading</span>
        </span>
      ) : null}
      {active2 && !loading ? (
        <Icon icon={Check} size="sm" className="shrink-0 text-foreground" aria-hidden={true} />
      ) : null}
    </>
  );
  const buttonClassName = cn$2(
    "h-auto min-h-10 w-full min-w-0 justify-start gap-2 rounded-md px-2 py-1.5 leading-tight whitespace-normal text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground",
    active2 &&
      "bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.05] disabled:opacity-100",
    unavailable && "cursor-not-allowed opacity-50",
  );
  if (unavailable && disabledReason) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button$1
                  type="button"
                  variant="ghost"
                  className={buttonClassName}
                  aria-disabled="true"
                  aria-label={displayName2}
                  aria-describedby={reasonId}
                  data-action-ui-id={dataActionUiId}
                  data-account-type={accountType.toLowerCase()}
                  data-group-id={dataGroupId}
                  data-team-role={dataTeamRole}
                />
              }
            >
              {content2}
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      </>
    );
  }
  return (
    <Button$1
      type="button"
      variant="ghost"
      className={buttonClassName}
      disabled={nativeDisabled}
      aria-label={displayName2}
      aria-current={active2 ? "true" : void 0}
      aria-busy={loading || void 0}
      onClick={onClick}
      data-action-ui-id={dataActionUiId}
      data-account-type={accountType.toLowerCase()}
      data-group-id={dataGroupId}
      data-team-role={dataTeamRole}
    >
      {content2}
    </Button$1>
  );
}
