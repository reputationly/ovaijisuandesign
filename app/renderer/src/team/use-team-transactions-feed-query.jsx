// use-team-transactions-feed-query.jsx
import { Loader2Icon, useQuery, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { teamApi } from "./team-api.js";
import {
  creditQueryKeys,
  normalizeTeamKeyword,
} from "../assets/credit-query-keys.jsx";
import { useInfiniteQuery } from "./map-team-credit-summary.js";
import { TEAM_LEDGER_PAGE_SIZE } from "./team-ledger-page-size.js";

export const MINUTE_MS$1 = 6e4;

export const TEAM_INFO_REFRESH_MS = 3e4;

export const IDENTITY_STALE_MS = 3e4;

export const IDENTITY_GC_MS = 10 * MINUTE_MS$1;

export const MEMBERSHIP_STALE_MS = 2e4;

export const MEMBERSHIP_GC_MS = 10 * MINUTE_MS$1;

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
  const previousIdentityIndex = previousQuery.queryKey.indexOf(
    scope.identityKey,
  );
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
    if (
      index2 !== revisionIndex &&
      currentQueryKey[index2] !== previousQuery.queryKey[index2]
    ) {
      return void 0;
    }
  }
  return previousData;
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

export function useTeamDetailQuery(scope, enabled = true) {
  const queryKey = scope
    ? teamQueryKeys.detail(scope)
    : ["team", "membership", "NO_SCOPE", "detail"];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!scope)
        throw new Error("Team detail queried without an account scope");
      return teamApi.getTeamDetail(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(
        scope,
        queryKey,
        previousData,
        previousQuery,
      ),
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInGroupMembersQuery({ scope, enabled = true }) {
  const queryKey = scope
    ? teamQueryKeys.inGroupMembers(scope)
    : ["team", "membership", "NO_SCOPE", "in-group-members"];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!scope)
        throw new Error("In-group members queried without an account scope");
      return teamApi.listInGroupMembers(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(
        scope,
        queryKey,
        previousData,
        previousQuery,
      ),
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
  });
}

export function useTeamMembersFeedQuery({
  scope,
  keyword: keyword2,
  pageSize,
  enabled = true,
}) {
  const normalizedKeyword = normalizeTeamKeyword(keyword2);
  return useInfiniteQuery({
    queryKey: scope
      ? teamQueryKeys.memberFeed(scope, normalizedKeyword, pageSize)
      : [
          "team",
          "membership",
          "NO_SCOPE",
          "members",
          normalizedKeyword,
          "feed",
          pageSize,
        ],
    queryFn: ({ signal, pageParam }) => {
      if (!scope)
        throw new Error("Team members queried without an account scope");
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

export function useTeamInviteLinksFeedQuery({ scope, enabled = true }) {
  return useInfiniteQuery({
    queryKey: scope
      ? teamQueryKeys.inviteLinkFeed(scope)
      : ["team", "membership", "NO_SCOPE", "invite-links", "feed"],
    queryFn: ({ signal, pageParam }) => {
      if (!scope)
        throw new Error("Team invite links queried without an account scope");
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
    queryKey: scope
      ? teamQueryKeys.quota(scope)
      : ["team", "membership", "NO_SCOPE", "quota"],
    queryFn: ({ signal }) => {
      if (!scope)
        throw new Error("Team quota queried without an account scope");
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
      if (!scope)
        throw new Error("Team credit summary queried without an account scope");
      return teamApi.getCreditSummary(scope, {
        signal,
      });
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(
        scope,
        queryKey,
        previousData,
        previousQuery,
      ),
    retry: false,
    staleTime: CREDIT_STALE_MS,
    gcTime: CREDIT_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTeamTransactionsQuery({
  scope,
  cursor,
  category = "ALL",
  enabled = true,
}) {
  return useQuery({
    queryKey: scope
      ? creditQueryKeys.transactions(scope, category, cursor)
      : ["credit", "scope", "NO_SCOPE", "transactions", category, cursor],
    queryFn: ({ signal }) => {
      if (!scope)
        throw new Error("Team transactions queried without an account scope");
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

export function useTeamTransfersFeedQuery({
  scope,
  enabled = true,
  allowPersonalScope = false,
}) {
  const queryKey = scope
    ? creditQueryKeys.transferFeed(scope)
    : ["credit", "scope", "NO_SCOPE", "transfers", "feed"];
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) => {
      if (!scope)
        throw new Error("Team transfers queried without an account scope");
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
    enabled:
      enabled &&
      scope !== null &&
      (allowPersonalScope || scope.membershipRevision !== null),
    placeholderData: (previousData, previousQuery) =>
      keepPreviousDataForMembershipRevision(
        scope,
        queryKey,
        previousData,
        previousQuery,
      ),
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
        ? [
            ...creditQueryKeys.selfTransactionFeed(scope, category),
            startTime ?? 0,
            endTime ?? 0,
          ]
        : [
            ...creditQueryKeys.transactionFeed(scope, category),
            startTime ?? 0,
            endTime ?? 0,
          ]
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
      if (!scope)
        throw new Error("Team transactions queried without an account scope");
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
      keepPreviousDataForMembershipRevision(
        scope,
        queryKey,
        previousData,
        previousQuery,
      ),
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
