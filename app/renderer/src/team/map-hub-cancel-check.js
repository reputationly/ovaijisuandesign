// map-hub-cancel-check.js
import {
  useAuth,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { API_PATHS, useMutation, useQuery, useQueryClient } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import {
  asNullableString,
  asRecord$3,
  asString,
  mapAccountProfile,
} from "./account-submission-blocked-host.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { mapTeamCreditSummary } from "./map-team-credit-summary.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";

function mapHailuoWebSummary(value) {
  const raw2 = asRecord$3(value);
  return {
    subscriptionPlan: asNullableString(raw2?.subscription_plan),
    remainingCredits: asNullableString(raw2?.remaining_credits),
  };
}

function mapHailuoCancelCheck(value) {
  const raw2 = asRecord$3(value);
  return {
    canCancel: raw2?.can_cancel === true,
    reason: asNullableString(raw2?.reason),
  };
}

function mapBlockingTeam(value) {
  const raw2 = asRecord$3(value);
  if (!raw2) return null;
  const groupId2 = asString(raw2.group_id);
  if (!groupId2) return null;
  const role =
    raw2.role === "OWNER" || raw2.role === "ADMIN" ? raw2.role : "MEMBER";
  return {
    groupId: groupId2,
    groupName: asString(raw2.group_name),
    role,
  };
}

function mapHubCancelCheck(value) {
  const raw2 = asRecord$3(value);
  if (!raw2) {
    return {
      canDelete: false,
      hasIapSubscription: false,
      blockingTeams: [],
      personalSubscriptionPlan: null,
      personalCredits: null,
    };
  }
  const blockingTeams = Array.isArray(raw2.blocking_teams)
    ? raw2.blocking_teams.map(mapBlockingTeam).filter((t2) => t2 !== null)
    : [];
  return {
    canDelete: raw2.can_delete === true,
    hasIapSubscription: raw2.has_iap_subscription === true,
    blockingTeams,
    personalSubscriptionPlan: asNullableString(raw2.personal_subscription_plan),
    personalCredits: asNullableString(raw2.personal_credits),
  };
}

async function fetchAccountProfile(signal) {
  const res = await gatewayFetch(API_PATHS.accountProfile, {
    signal,
  });
  return mapAccountProfile(await res.json());
}

async function updateAccountProfile(userName) {
  const body2 = {
    user_name: userName,
  };
  const res = await gatewayFetch(API_PATHS.accountProfile, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
  });
  return mapAccountProfile(await res.json());
}

async function fetchHailuoWebSummary(signal) {
  const res = await gatewayFetch(API_PATHS.accountHailuoWeb, {
    signal,
  });
  return mapHailuoWebSummary(await res.json());
}

async function fetchHailuoCancelCheck(signal) {
  const res = await gatewayFetch(API_PATHS.accountHailuoCancelCheck, {
    signal,
  });
  return mapHailuoCancelCheck(await res.json());
}

async function fetchHubCancelCheck(signal) {
  const res = await gatewayFetch(API_PATHS.accountHubCancelCheck, {
    signal,
  });
  return mapHubCancelCheck(await res.json());
}

export async function sendCancelCode() {
  await gatewayFetch(API_PATHS.accountCancelSendCode, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

export async function deleteAccount(verifyCode) {
  const body2 = {
    acknowledgements: ["data_erased", "self_initiated"],
    verify_code: verifyCode,
  };
  await gatewayFetch(API_PATHS.accountDelete, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body2),
    timeoutMs: 8e4,
  });
}

export async function fetchTeamCreditSummaryByGroupId(groupId2, signal) {
  const res = await gatewayFetch(API_PATHS.teamCreditSummary(groupId2), {
    signal,
  });
  return mapTeamCreditSummary(await res.json());
}

export const ACCOUNT_QUERY_KEYS = {
  profile: (identityKey) => ["account", identityKey, "profile"],
  hailuoWeb: (identityKey) => ["account", identityKey, "hailuo-web"],
  hailuoCancelCheck: (identityKey) => [
    "account",
    identityKey,
    "hailuo-cancel-check",
  ],
  hubCancelCheck: (identityKey) => ["account", identityKey, "hub-cancel-check"],
  deletionPreviewTeamCredit: (identityKey, groupId2) => [
    "account",
    identityKey,
    "deletion-preview",
    "team-credit",
    groupId2,
  ],
};

const PROFILE_STALE_TIME = 5 * 60 * 1e3;

function useAccountQueryIdentity(enabled) {
  const { isLoggedIn } = useAuth();
  const identityKey = useOptionalTeamAccount()?.snapshot?.identityKey ?? null;
  return {
    identityKey: identityKey ?? "",
    ready: enabled && isLoggedIn && identityKey !== null,
  };
}

export function useAccountProfile(enabled = true) {
  const { identityKey, ready } = useAccountQueryIdentity(enabled);
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.profile(identityKey),
    queryFn: ({ signal }) => fetchAccountProfile(signal),
    enabled: ready,
    staleTime: PROFILE_STALE_TIME,
    retry: false,
  });
}

export function useUpdateAccountProfile() {
  const queryClient2 = useQueryClient();
  const { updateUsername } = useAuth();
  const { identityKey } = useAccountQueryIdentity(true);
  return useMutation({
    mutationFn: (userName) => updateAccountProfile(userName),
    onSuccess: (profile) => {
      queryClient2.setQueryData(
        ACCOUNT_QUERY_KEYS.profile(identityKey),
        profile,
      );
      void queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.root,
      });
      if (profile.user_name) {
        void updateUsername(profile.user_name);
      }
    },
  });
}

export function useHailuoWebSummary(enabled = true) {
  const { identityKey, ready } = useAccountQueryIdentity(enabled);
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.hailuoWeb(identityKey),
    queryFn: ({ signal }) => fetchHailuoWebSummary(signal),
    enabled: ready,
    staleTime: 0,
    gcTime: 6e4,
    retry: false,
  });
}

export function useHailuoCancelCheck(enabled = true) {
  const { identityKey, ready } = useAccountQueryIdentity(enabled);
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.hailuoCancelCheck(identityKey),
    queryFn: ({ signal }) => fetchHailuoCancelCheck(signal),
    enabled: ready,
    staleTime: 0,
    gcTime: 6e4,
    retry: false,
  });
}

export function useHubCancelCheck(enabled = true) {
  const { identityKey, ready } = useAccountQueryIdentity(enabled);
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.hubCancelCheck(identityKey),
    queryFn: ({ signal }) => fetchHubCancelCheck(signal),
    enabled: ready,
    staleTime: 0,
    gcTime: 6e4,
    retry: false,
  });
}

export function groupTeamContexts(items) {
  const teams = (items ?? []).filter(
    (item) => item.accountType === "TEAM" && item.lifecycle === "ACTIVE",
  );
  return {
    created: teams.filter((item) => item.role === "OWNER"),
    joined: teams.filter((item) => item.role !== "OWNER"),
  };
}

export function isVerifyCodeError(error) {
  return error instanceof GatewayHttpError && error.status === 400;
}

export function backendUserMessage(error) {
  if (
    error instanceof GatewayHttpError &&
    error.userMessage &&
    error.userMessage.trim()
  ) {
    return error.userMessage.trim();
  }
  return null;
}

export const WARNING_KEYS = [
  "account.delete.warning.irreversible",
  "account.delete.warning.contentErased",
  "account.delete.warning.creditsCleared",
  "account.delete.warning.teamsDissolved",
  "account.delete.warning.subscriptionTerminated",
  "account.delete.warning.noNewUserBonus",
];

export const RESEND_COOLDOWN_SEC = 60;

export const SUBMIT_LOCK_AFTER_SEND_MS = 2500;
