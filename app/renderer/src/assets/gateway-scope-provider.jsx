// gateway-scope-provider.jsx
import {
  normalizeTeamKeyword,
  scopedAssetsQueryKey,
  scopeParts,
} from "./credit-query-keys.jsx";
import {
  decisionVersion,
  evaluateAccountSubmission,
  GatewayScopeContext,
  getRuntimeConfig,
  guardAccountSubmission,
  listeners$8,
  normalizeGatewayBaseUrl,
  PopoverTrigger$1,
  reactExports,
  WorkspaceGatewayClient,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

export async function refreshAssetIndex({ qc, gatewayScopeKey }) {
  await qc.invalidateQueries({
    queryKey: scopedAssetsQueryKey(gatewayScopeKey),
  });
}

export const teamQueryKeys = {
  root: ["team"],
  contract: (clientVersion) => ["team", "contract", clientVersion],
  identity: (identityKey) => ["team", "identity", identityKey],
  contexts: (identityKey) => [
    ...teamQueryKeys.identity(identityKey),
    "contexts",
  ],
  userCapabilities: (identityKey) => [
    ...teamQueryKeys.identity(identityKey),
    "capabilities",
  ],
  membership: (scope) => ["team", "membership", ...scopeParts(scope)],
  detail: (scope) => [...teamQueryKeys.membership(scope), "detail"],
  permissions: (scope) => [...teamQueryKeys.membership(scope), "permissions"],
  members: (scope, keyword2, cursor, pageSize) => [
    ...teamQueryKeys.membership(scope),
    "members",
    normalizeTeamKeyword(keyword2),
    cursor,
    pageSize,
  ],
  memberFeed: (scope, keyword2, pageSize) => [
    ...teamQueryKeys.membership(scope),
    "members",
    normalizeTeamKeyword(keyword2),
    "feed",
    pageSize,
  ],
  memberDetails: (scope) => [
    ...teamQueryKeys.membership(scope),
    "member-details",
  ],
  inGroupMembers: (scope) => [
    ...teamQueryKeys.membership(scope),
    "in-group-members",
  ],
  inviteLinks: (scope, cursor) => [
    ...teamQueryKeys.membership(scope),
    "invite-links",
    cursor,
  ],
  pastTeamMembers: (scope, keyword2) => [
    ...teamQueryKeys.membership(scope),
    "past-team-members",
    normalizeTeamKeyword(keyword2),
  ],
  inviteLinkFeed: (scope) => [
    ...teamQueryKeys.membership(scope),
    "invite-links",
    "feed",
  ],
  quota: (scope) => [...teamQueryKeys.membership(scope), "quota"],
};

function subscribeAccountSubmissionDecision(listener) {
  listeners$8.add(listener);
  return () => listeners$8.delete(listener);
}

function getAccountSubmissionDecisionVersion() {
  return decisionVersion;
}

export function MpIcon({ size: size2 = 14, className }) {
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
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.3978 1.5L7.19709 6.06008L4.53725 2.27041L2.27041 4.53725L6.06008 7.19709L1.5 6.39787V9.6022L6.06008 8.80291L2.27041 11.4628L4.53725 13.7296L7.19709 9.93992L6.3978 14.5H9.60213L8.80284 9.93992L11.4628 13.7296L13.7296 11.4628L9.93992 8.80291L14.5 9.6022V6.39787L9.93992 7.19709L13.7296 4.53725L11.4628 2.27041L8.80284 6.06008L9.60213 1.5H6.3978Z"
      />
    </svg>
  );
}

export function PopoverTrigger({ ...props }) {
  return <PopoverTrigger$1 data-slot="popover-trigger" {...props} />;
}

const INPUT_EDITABLE_WHILE_BLOCKED_REASON_CODES = new Set([
  "quota_insufficient",
  "team_balance_insufficient",
]);

function accountSubmissionBlocksInput(decision) {
  return (
    !decision.allowed &&
    !INPUT_EDITABLE_WHILE_BLOCKED_REASON_CODES.has(decision.reasonCode)
  );
}

export function useAccountSubmissionDecision(kind) {
  reactExports.useSyncExternalStore(
    subscribeAccountSubmissionDecision,
    getAccountSubmissionDecisionVersion,
    getAccountSubmissionDecisionVersion,
  );
  return evaluateAccountSubmission(kind);
}

function useAccountSubmissionBlocksInput(kind) {
  return accountSubmissionBlocksInput(useAccountSubmissionDecision(kind));
}

export function useAccountSubmissionControls(kind) {
  const blocksInput = useAccountSubmissionBlocksInput(kind);
  const beforeAccountSubmission = reactExports.useCallback(
    () => guardAccountSubmission(kind).allowed,
    [kind],
  );
  return {
    accountSubmissionAllowed: !blocksInput,
    beforeAccountSubmission,
  };
}

export function GatewayScopeProvider({
  children: children2,
  gatewayUrl: gatewayUrl2,
  gatewayBinding,
  gatewayReady,
  scopeKey,
  workspaceClaim,
  recoverWorkspace,
}) {
  const bindingBaseUrl = gatewayBinding?.baseUrl;
  const bindingClaim = gatewayBinding?.claim;
  const bindingInstanceId = gatewayBinding?.instanceId;
  const bindingGeneration = gatewayBinding?.generation;
  const stableGatewayBinding = reactExports.useMemo(() => {
    if (
      bindingBaseUrl === void 0 ||
      bindingClaim === void 0 ||
      bindingInstanceId === void 0 ||
      bindingGeneration === void 0
    ) {
      return void 0;
    }
    return {
      baseUrl: bindingBaseUrl,
      claim: bindingClaim,
      instanceId: bindingInstanceId,
      generation: bindingGeneration,
    };
  }, [bindingBaseUrl, bindingClaim, bindingGeneration, bindingInstanceId]);
  const value = reactExports.useMemo(() => {
    const fallbackGatewayUrl = scopeKey
      ? void 0
      : getRuntimeConfig().gatewayUrl;
    const baseUrl = normalizeGatewayBaseUrl(
      stableGatewayBinding?.baseUrl ?? gatewayUrl2 ?? fallbackGatewayUrl,
    );
    const workspaceClient = stableGatewayBinding
      ? new WorkspaceGatewayClient({
          binding: stableGatewayBinding,
          recoverWorkspace,
        })
      : void 0;
    return {
      baseUrl,
      gatewayReady: gatewayReady ?? baseUrl !== void 0,
      scopeKey: scopeKey ?? baseUrl ?? "app",
      workspaceClaim: stableGatewayBinding?.claim ?? workspaceClaim,
      gatewayBinding: stableGatewayBinding,
      workspaceClient,
      recoverWorkspace,
    };
  }, [
    gatewayReady,
    gatewayUrl2,
    recoverWorkspace,
    scopeKey,
    stableGatewayBinding,
    workspaceClaim,
  ]);
  return (
    <GatewayScopeContext.Provider value={value}>
      {children2}
    </GatewayScopeContext.Provider>
  );
}
