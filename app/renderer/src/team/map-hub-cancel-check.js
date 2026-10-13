// map-hub-cancel-check.js
import {
  useAuth,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { API_PATHS, useMutation, useQuery, useQueryClient } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import {
  asNullableString,
  asRecord,
  asString,
  mapAccountProfile,
} from "./account-submission-blocked-host.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { mapTeamCreditSummary } from "./map-team-credit-summary.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
function mapHailuoWebSummary(value) {
  const raw = asRecord(value);
  return {
    subscriptionPlan: asNullableString(raw?.subscription_plan),
    remainingCredits: asNullableString(raw?.remaining_credits),
  };
}
function mapHailuoCancelCheck(value) {
  const raw = asRecord(value);
  return {
    canCancel: raw?.can_cancel === true,
    reason: asNullableString(raw?.reason),
  };
}
function mapBlockingTeam(value) {
  const raw = asRecord(value);
  if (!raw) return null;
  const groupId = asString(raw.group_id);
  if (!groupId) return null;
  const role =
    raw.role === "OWNER" || raw.role === "ADMIN" ? raw.role : "MEMBER";
  return {
    groupId,
    groupName: asString(raw.group_name),
    role,
  };
}
function mapHubCancelCheck(value) {
  const raw = asRecord(value);
  if (!raw) {
    return {
      canDelete: false,
      hasIapSubscription: false,
      blockingTeams: [],
      personalSubscriptionPlan: null,
      personalCredits: null,
    };
  }
  const blockingTeams = Array.isArray(raw.blocking_teams)
    ? raw.blocking_teams.map(mapBlockingTeam).filter((blockingTeam) => blockingTeam !== null)
    : [];
  return {
    canDelete: raw.can_delete === true,
    hasIapSubscription: raw.has_iap_subscription === true,
    blockingTeams,
    personalSubscriptionPlan: asNullableString(raw.personal_subscription_plan),
    personalCredits: asNullableString(raw.personal_credits),
  };
}
async function fetchAccountProfile(signal) {
  const res = await gatewayFetch(API_PATHS.accountProfile, {
    signal,
  });
  return mapAccountProfile(await res.json());
}
async function updateAccountProfile(userName) {
  const body = {
    user_name: userName,
  };
  const res = await gatewayFetch(API_PATHS.accountProfile, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
  const body = {
    acknowledgements: ["data_erased", "self_initiated"],
    verify_code: verifyCode,
  };
  await gatewayFetch(API_PATHS.accountDelete, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: 8e4,
  });
}
export async function fetchTeamCreditSummaryByGroupId(groupId, signal) {
  const res = await gatewayFetch(API_PATHS.teamCreditSummary(groupId), {
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
  deletionPreviewTeamCredit: (identityKey, groupId) => [
    "account",
    identityKey,
    "deletion-preview",
    "team-credit",
    groupId,
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
  const queryClient = useQueryClient();
  const { updateUsername } = useAuth();
  const { identityKey } = useAccountQueryIdentity(true);
  return useMutation({
    mutationFn: (userName) => updateAccountProfile(userName),
    onSuccess: (profile) => {
      queryClient.setQueryData(
        ACCOUNT_QUERY_KEYS.profile(identityKey),
        profile,
      );
      void queryClient.invalidateQueries({
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
