// team-provider.jsx
import {
  MINUTE_MS,
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
  useTeamDetailQuery,
  useTeamInviteLinksFeedQuery,
  useTeamMembersFeedQuery,
  useTeamQuotaQuery,
} from "./use-team-transactions-feed-query.jsx";
import { deriveActiveScope, getRuntimeConfig, reactExports, useQuery, useQueryClient, useTranslation } from "../vendor.js";
import { activateAccountSubmissionGuard, dedupedToast, evaluateAccountSubmission, updateAccountSubmissionDecision } from "../infra/agent-http-client.js";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { teamApi } from "./team-api.js";
import {
  instantiationService,
  isRecoverableTeamAccountStatus,
  ITeamAccountService,
} from "../workspace/home-service.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { accountScopeEquals } from "./account-scope-equals.js";
import { TeamAccountContext } from "../assets/credit-query-keys.jsx";
function isQueryOwnedByIdentity(queryKey, identityKey) {
  return (
    queryKey.includes(identityKey) &&
    (queryKey[0] === "team" ||
      queryKey[0] === "credit" ||
      queryKey[0] === "account")
  );
}
function isQueryOwnedByScope(queryKey, scope) {
  const scopeIdentity = queryKey.indexOf(scope.identityKey);
  if (scopeIdentity < 0) return false;
  return (
    queryKey[scopeIdentity + 1] === scope.groupId &&
    queryKey[scopeIdentity + 2] === scope.epoch &&
    queryKey[scopeIdentity + 3] === (scope.membershipRevision ?? "PERSONAL")
  );
}
const TEAM_CONTRACT_STALE_MS = 5 * MINUTE_MS;
const TEAM_CONTRACT_GC_MS = 30 * MINUTE_MS;
function useTeamContractQuery(clientVersion, enabled) {
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
function isNewerSnapshot(current, incoming) {
  try {
    const incomingSequence = BigInt(incoming.sequence);
    return current === null || incomingSequence > BigInt(current.sequence);
  } catch {
    return false;
  }
}
function mergeTeamSnapshot(current, incoming) {
  return isNewerSnapshot(current, incoming) ? incoming : current;
}
function deriveTeamAccountViewModel({
  snapshot,
  contract,
  contractPending,
  contractFailed,
  serviceAvailable,
}) {
  if (!serviceAvailable) {
    return {
      kind: "blocked",
      snapshot,
      status: "temporarily_unavailable",
      reasonCode: "team_account_service_unavailable",
    };
  }
  if (!snapshot) {
    return {
      kind: "bootstrapping",
      snapshot: null,
      reasonCode: "canonical_context_pending",
    };
  }
  if (snapshot.status === "signed_out")
    return {
      kind: "signed_out",
      snapshot,
    };
  if (snapshot.status !== "ready") {
    return {
      kind: "blocked",
      snapshot,
      status: snapshot.status,
      reasonCode:
        snapshot.status === "syncing"
          ? "canonical_context_syncing"
          : snapshot.reasonCode,
    };
  }
  const scope = deriveActiveScope(snapshot);
  if (!scope) {
    return {
      kind: "blocked",
      snapshot,
      status: "temporarily_unavailable",
      reasonCode: "canonical_scope_missing",
    };
  }
  if (snapshot.activeContext.accountType === "PERSONAL") {
    return {
      kind: "ready_personal",
      snapshot,
      scope,
    };
  }
  if (contractPending || (!contract && !contractFailed)) {
    return {
      kind: "blocked",
      snapshot,
      status: "syncing",
      reasonCode: "team_contract_pending",
    };
  }
  if (contractFailed || !contract) {
    return {
      kind: "blocked",
      snapshot,
      status: "temporarily_unavailable",
      reasonCode: "team_contract_unavailable",
    };
  }
  if (contract.compatibility === "UPGRADE_REQUIRED") {
    return {
      kind: "blocked",
      snapshot,
      status: "upgrade_required",
      reasonCode: "minimum_client_version",
    };
  }
  if (
    contract.compatibility === "TEMPORARILY_UNAVAILABLE" ||
    !contract.gates.teamRead
  ) {
    return {
      kind: "blocked",
      snapshot,
      status: "temporarily_unavailable",
      reasonCode: contract.gates.teamRead
        ? "team_contract_unavailable"
        : "team_read_disabled",
    };
  }
  return {
    kind: "ready_team",
    snapshot,
    scope,
    contract,
    billingAvailable: contract.gates.teamBilling,
  };
}
async function clearIdentityQueries(queryClient, identityKey) {
  const predicate = (query) =>
    isQueryOwnedByIdentity(query.queryKey, identityKey);
  await queryClient.cancelQueries({
    predicate,
  });
  queryClient.removeQueries({
    predicate,
  });
}
async function clearAccountScopeQueries(queryClient, scope) {
  const predicate = (query) => isQueryOwnedByScope(query.queryKey, scope);
  await queryClient.cancelQueries({
    predicate,
  });
  queryClient.removeQueries({
    predicate,
  });
}
function createRequestId() {
  return crypto.randomUUID();
}
function rejectedResult(code) {
  return {
    status: "rejected",
    code,
  };
}
function isDeterministicCompositeCommandResult(result) {
  return (
    result.status === "completed" ||
    (result.status === "rejected" && result.code !== "temporarily_unavailable")
  );
}
function isRetryableRevalidationResult(result) {
  return (
    result.status === "busy" ||
    result.status === "recovering" ||
    (result.status === "rejected" && result.code === "temporarily_unavailable")
  );
}
function contextConfirmsCanonical(item, snapshot) {
  const membershipConfirmed =
    item.accountType === "PERSONAL" ||
    (item.role !== null && item.switchDecision.allowed);
  return (
    snapshot.status === "ready" &&
    item.groupId === snapshot.activeContext.groupId &&
    item.accountType === snapshot.activeContext.accountType &&
    item.lifecycle === "ACTIVE" &&
    membershipConfirmed
  );
}
function snapshotReachedSequence(snapshot, sequence) {
  if (!snapshot) return false;
  try {
    return BigInt(snapshot.sequence) >= BigInt(sequence);
  } catch {
    return false;
  }
}
function contextsObservationKey(
  refreshKey,
  dataUpdatedAt,
  contextsRevision,
  serverTimeMs,
) {
  return `${refreshKey}:${dataUpdatedAt}:${contextsRevision}:${serverTimeMs}`;
}
function invitationIntentKey(invitationId, expectedInvitationVersion) {
  return JSON.stringify([
    invitationId.trim(),
    expectedInvitationVersion.trim(),
  ]);
}
function contextsSyncingSnapshot(snapshot) {
  if (snapshot?.status !== "ready") return snapshot;
  return {
    schemaVersion: snapshot.schemaVersion,
    sequence: snapshot.sequence,
    identityKey: snapshot.identityKey,
    status: "syncing",
    activeContext: null,
  };
}
function resolveService(override) {
  if (override) return override;
  try {
    return instantiationService.invokeFunction((accessor) =>
      accessor.get(ITeamAccountService),
    );
  } catch {
    return null;
  }
}
export function TeamProvider({
  children: children2,
  service: serviceOverride,
  enabled = true,
}) {
  if (enabled) activateAccountSubmissionGuard();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const service = reactExports.useMemo(
    () => (enabled ? resolveService(serviceOverride) : null),
    [enabled, serviceOverride],
  );
  const [snapshot, setSnapshot] = reactExports.useState(null);
  const snapshotRef = reactExports.useRef(null);
  const [lastTransitionAttempt, setLastTransitionAttempt] =
    reactExports.useState(null);
  const [dialog, setDialog] = reactExports.useState({
    type: "closed",
  });
  const [pendingManagementOpen, setPendingManagementOpen] =
    reactExports.useState(null);
  const pendingManagementIntentRef = reactExports.useRef(null);
  const dialogGenerationRef = reactExports.useRef(0);
  const dialogCloseSequenceRef = reactExports.useRef(null);
  const previousIdentityRef = reactExports.useRef(null);
  const previousScopeRef = reactExports.useRef(deriveActiveScope(snapshot));
  const startedContextsRefreshRef = reactExports.useRef(null);
  const processedContextsObservationRef = reactExports.useRef(null);
  const lastContextRevalidationRef = reactExports.useRef(null);
  const createTeamIntentsRef = reactExports.useRef(new Map());
  const invitationIntentsRef = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    if (!service) return void 0;
    let disposed = false;
    const acceptSnapshot = (incoming) => {
      if (disposed) return;
      const next = mergeTeamSnapshot(snapshotRef.current, incoming);
      if (!next || next === snapshotRef.current) return;
      if (snapshotRef.current?.identityKey !== next.identityKey) {
        createTeamIntentsRef.current.clear();
        invitationIntentsRef.current.clear();
      }
      snapshotRef.current = next;
      updateAccountSubmissionDecision(contextsSyncingSnapshot(next), null);
      setSnapshot(next);
    };
    const subscription = service.onDidChange(acceptSnapshot);
    void service
      .getSnapshot()
      .then(acceptSnapshot)
      .catch(() => {});
    return () => {
      disposed = true;
      subscription.dispose();
    };
  }, [service]);
  const identityKey = snapshot?.identityKey ?? null;
  const activeScope = reactExports.useMemo(
    () => deriveActiveScope(snapshot),
    [snapshot],
  );
  const canonicalAccountReady =
    snapshot?.status === "ready" && activeScope !== null;
  const clientVersion = getRuntimeConfig().appVersion?.trim() || "unknown";
  const contractQuery = useTeamContractQuery(
    clientVersion,
    enabled && service !== null && canonicalAccountReady,
  );
  const contract = contractQuery.isError ? null : (contractQuery.data ?? null);
  const viewModel = reactExports.useMemo(
    () =>
      deriveTeamAccountViewModel({
        snapshot,
        contract,
        contractPending:
          contractQuery.isPending && contractQuery.fetchStatus !== "idle",
        contractFailed: contractQuery.isError,
        serviceAvailable: service !== null,
      }),
    [
      contract,
      contractQuery.fetchStatus,
      contractQuery.isError,
      contractQuery.isPending,
      service,
      snapshot,
    ],
  );
  const contextsConfirmationEnabled = Boolean(
    enabled &&
    service !== null &&
    canonicalAccountReady &&
    snapshot?.status === "ready" &&
    activeScope,
  );
  const contextsRefreshKey =
    contextsConfirmationEnabled && snapshot?.status === "ready" && activeScope
      ? [
          snapshot.sequence,
          activeScope.identityKey,
          activeScope.groupId,
          activeScope.epoch,
          activeScope.membershipRevision ?? "PERSONAL",
        ].join(":")
      : null;
  const accountDataVisible = canonicalAccountReady;
  const billingAvailable =
    accountDataVisible &&
    (viewModel.kind === "ready_personal" ||
      (viewModel.kind === "ready_team" && viewModel.billingAvailable));
  const contextsQuery = useTeamContextsQuery(
    identityKey,
    contextsConfirmationEnabled,
  );
  const teamInfoPreloadEnabled = Boolean(
    enabled &&
    accountDataVisible &&
    activeScope?.membershipRevision &&
    contract?.compatibility === "SUPPORTED" &&
    contract.gates.teamRead,
  );
  const preloadedDetailQuery = useTeamDetailQuery(
    activeScope,
    teamInfoPreloadEnabled,
  );
  const preloadMemberPageSize = Math.min(
    20,
    contract?.limits.maxMemberPageSize ?? 20,
  );
  const preloadViewMembers =
    preloadedDetailQuery.data?.currentRole !== "MEMBER" &&
    preloadedDetailQuery.data?.permissions.viewMembers.allowed === true;
  const preloadViewInviteLinks = Boolean(
    contract?.gates.teamMutation &&
    (preloadedDetailQuery.data?.permissions.createInviteLink.allowed ||
      preloadedDetailQuery.data?.permissions.revokeInviteLink.allowed),
  );
  const preloadBilling = contract?.gates.teamBilling === true;
  const preloadTeamDefaultQuota = Boolean(
    preloadedDetailQuery.data &&
    preloadedDetailQuery.data.currentRole !== "MEMBER",
  );
  useTeamMembersFeedQuery({
    scope: activeScope,
    keyword: "",
    pageSize: preloadMemberPageSize,
    enabled: teamInfoPreloadEnabled && preloadViewMembers,
  });
  useTeamInviteLinksFeedQuery({
    scope: activeScope,
    enabled: teamInfoPreloadEnabled && preloadViewInviteLinks,
  });
  useTeamQuotaQuery(
    activeScope,
    teamInfoPreloadEnabled && preloadBilling && preloadTeamDefaultQuota,
  );
  const preloadedCreditSummaryQuery = useTeamCreditSummaryQuery(
    activeScope,
    teamInfoPreloadEnabled && preloadBilling,
  );
  reactExports.useLayoutEffect(() => {
    if (!enabled) return;
    if (snapshotRef.current !== snapshot) return;
    updateAccountSubmissionDecision(
      snapshot,
      viewModel.kind === "ready_team" ? viewModel.contract : null,
      preloadedCreditSummaryQuery.isSuccess
        ? preloadedCreditSummaryQuery.data
        : null,
    );
  }, [
    enabled,
    preloadedCreditSummaryQuery.data,
    preloadedCreditSummaryQuery.isSuccess,
    snapshot,
    viewModel,
  ]);
  reactExports.useEffect(() => {
    const previousIdentity = previousIdentityRef.current;
    const previousScope = previousScopeRef.current;
    if (previousIdentity && previousIdentity !== identityKey) {
      void clearIdentityQueries(queryClient, previousIdentity);
    } else if (
      previousScope &&
      !accountScopeEquals(previousScope, activeScope)
    ) {
      void clearAccountScopeQueries(queryClient, previousScope);
    }
    if (
      previousIdentity !== identityKey ||
      !accountScopeEquals(previousScope, activeScope)
    ) {
      setLastTransitionAttempt(null);
    }
    previousIdentityRef.current = identityKey;
    previousScopeRef.current = activeScope;
  }, [activeScope, identityKey, queryClient]);
  reactExports.useEffect(() => {
    setDialog((current) => {
      if (current.type === "closed") return current;
      if (current.type === "create") {
        return current.identityKey === identityKey
          ? current
          : {
              type: "closed",
            };
      }
      if (current.type === "switch-blocked") {
        return current.identityKey === identityKey
          ? current
          : {
              type: "closed",
            };
      }
      if (
        activeScope &&
        !accountScopeEquals(current.scope, activeScope) &&
        current.scope.identityKey === activeScope.identityKey &&
        current.scope.groupId === activeScope.groupId &&
        current.scope.epoch === activeScope.epoch
      ) {
        if (!accountDataVisible) return current;
        return {
          ...current,
          scope: activeScope,
        };
      }
      if (accountScopeEquals(current.scope, activeScope)) {
        return accountDataVisible
          ? current
          : {
              type: "closed",
            };
      }
      return {
        type: "closed",
      };
    });
  }, [accountDataVisible, activeScope, identityKey]);
  reactExports.useEffect(() => {
    if (!pendingManagementOpen || !snapshot) return;
    const pendingIntent = createTeamIntentsRef.current.get(
      pendingManagementOpen.intentKey,
    );
    if (
      !pendingIntent ||
      pendingManagementIntentRef.current !== pendingIntent ||
      pendingIntent.commandId !== pendingManagementOpen.commandId ||
      pendingIntent.dialogGeneration !==
        pendingManagementOpen.dialogGeneration ||
      dialogGenerationRef.current !== pendingManagementOpen.dialogGeneration
    ) {
      pendingManagementIntentRef.current = null;
      setPendingManagementOpen(null);
      return;
    }
    if (snapshot.identityKey !== pendingManagementOpen.identityKey) {
      pendingManagementIntentRef.current = null;
      setPendingManagementOpen(null);
      return;
    }
    if (
      !snapshotReachedSequence(snapshot, pendingManagementOpen.appliedSequence)
    )
      return;
    if (snapshot.status !== "ready") return;
    createTeamIntentsRef.current.delete(pendingManagementOpen.intentKey);
    pendingManagementIntentRef.current = null;
    setPendingManagementOpen(null);
    if (
      snapshot.activeContext.accountType !== "TEAM" ||
      !activeScope?.membershipRevision
    )
      return;
    dialogCloseSequenceRef.current = null;
    setDialog({
      type: "management",
      scope: activeScope,
    });
  }, [activeScope, pendingManagementOpen, snapshot]);
  const closeDialogAtSequence = reactExports.useCallback((sequence) => {
    dialogCloseSequenceRef.current = sequence;
    if (!snapshotReachedSequence(snapshotRef.current, sequence)) return;
    dialogCloseSequenceRef.current = null;
    setDialog({
      type: "closed",
    });
  }, []);
  reactExports.useEffect(() => {
    const closeAt = dialogCloseSequenceRef.current;
    if (!closeAt || !snapshotReachedSequence(snapshot, closeAt)) return;
    dialogCloseSequenceRef.current = null;
    setDialog({
      type: "closed",
    });
  }, [snapshot]);
  const applyCommandResult = reactExports.useCallback(
    (result) => {
      if (result.status === "busy") {
        setLastTransitionAttempt({
          kind: "busy",
          blockingReasons: result.blockingReasons,
        });
      } else if (result.status === "rejected") {
        setLastTransitionAttempt({
          kind: "rejected",
          code: result.code,
        });
      } else if (result.status === "recovering") {
        setLastTransitionAttempt({
          kind: "recovering",
          reasonCode: result.reasonCode,
        });
        closeDialogAtSequence(result.appliedSequence);
      } else {
        setLastTransitionAttempt(null);
        closeDialogAtSequence(result.appliedSequence);
      }
      return result;
    },
    [closeDialogAtSequence],
  );
  const currentCommandBase = reactExports.useCallback(() => {
    const current = snapshotRef.current;
    if (!current?.identityKey) return null;
    return {
      commandId: createRequestId(),
      expectedIdentityKey: current.identityKey,
      expectedSequence: current.sequence,
    };
  }, []);
  const commandScopeMatchesCurrent = reactExports.useCallback(
    (expectedIdentityKey, expectedScope) => {
      const current = snapshotRef.current;
      return (
        current?.identityKey === expectedIdentityKey &&
        accountScopeEquals(deriveActiveScope(current), expectedScope)
      );
    },
    [],
  );
  const currentCompositeCommandIntent = reactExports.useCallback(
    (intents, intentKey) => {
      const current = snapshotRef.current;
      if (!current?.identityKey) return null;
      const existing = intents.get(intentKey);
      if (existing?.expectedIdentityKey === current.identityKey)
        return existing;
      const intent = {
        commandId: createRequestId(),
        expectedIdentityKey: current.identityKey,
        expectedSequence: current.sequence,
        idempotencyKey: createRequestId(),
      };
      intents.set(intentKey, intent);
      return intent;
    },
    [],
  );
  const currentCreateTeamCommandIntent = reactExports.useCallback(
    (intentKey) => {
      const current = snapshotRef.current;
      if (!current?.identityKey) return null;
      const dialogGeneration = dialogGenerationRef.current;
      const existing = createTeamIntentsRef.current.get(intentKey);
      if (
        existing?.expectedIdentityKey === current.identityKey &&
        existing.dialogGeneration === dialogGeneration &&
        pendingManagementIntentRef.current !== existing
      ) {
        return existing;
      }
      if (pendingManagementIntentRef.current === existing) {
        pendingManagementIntentRef.current = null;
        setPendingManagementOpen(null);
      }
      const intent = {
        commandId: createRequestId(),
        expectedIdentityKey: current.identityKey,
        expectedSequence: current.sequence,
        idempotencyKey: createRequestId(),
        dialogGeneration,
      };
      createTeamIntentsRef.current.set(intentKey, intent);
      return intent;
    },
    [],
  );
  const rejectLocally = reactExports.useCallback(
    (code) => applyCommandResult(rejectedResult(code)),
    [applyCommandResult],
  );
  const handleCommandTransportFailure = reactExports.useCallback(
    (expectedIdentityKey) => {
      const result = rejectedResult("temporarily_unavailable");
      if (snapshotRef.current?.identityKey !== expectedIdentityKey)
        return result;
      return applyCommandResult(result);
    },
    [applyCommandResult],
  );
  const invalidateCompositeIdentity = reactExports.useCallback(
    (commandIdentityKey) => {
      const keys = [
        teamQueryKeys.contexts(commandIdentityKey),
        teamQueryKeys.userCapabilities(commandIdentityKey),
      ];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({
          queryKey,
          exact: true,
        });
      }
    },
    [queryClient],
  );
  const switchContext = reactExports.useCallback(
    async (targetGroupId, membershipProof) => {
      const base = currentCommandBase();
      if (!service || !base) {
        return rejectLocally("temporarily_unavailable");
      }
      const expectedScope = deriveActiveScope(snapshotRef.current);
      let result;
      try {
        result = await service.switchContext({
          ...base,
          targetGroupId,
          ...(membershipProof
            ? {
                membershipProof,
              }
            : {}),
        });
      } catch {
        const failure = rejectedResult("temporarily_unavailable");
        if (
          !commandScopeMatchesCurrent(base.expectedIdentityKey, expectedScope)
        )
          return failure;
        return applyCommandResult(failure);
      }
      if (snapshotRef.current?.identityKey !== base.expectedIdentityKey)
        return result;
      if (result.status === "rejected" && result.code === "membership_stale") {
        if (
          commandScopeMatchesCurrent(base.expectedIdentityKey, expectedScope)
        ) {
          setLastTransitionAttempt(null);
          invalidateCompositeIdentity(base.expectedIdentityKey);
        }
        return result;
      }
      if (
        (result.status === "busy" || result.status === "rejected") &&
        !commandScopeMatchesCurrent(base.expectedIdentityKey, expectedScope)
      ) {
        return result;
      }
      return applyCommandResult(result);
    },
    [
      applyCommandResult,
      commandScopeMatchesCurrent,
      currentCommandBase,
      invalidateCompositeIdentity,
      rejectLocally,
      service,
    ],
  );
  const createTeamAndSwitch = reactExports.useCallback(
    async (teamName) => {
      const normalizedTeamName = teamName.trim();
      if (!service || !snapshotRef.current?.identityKey) {
        return rejectLocally("temporarily_unavailable");
      }
      const intent = currentCreateTeamCommandIntent(normalizedTeamName);
      if (!intent) return rejectLocally("temporarily_unavailable");
      let result;
      try {
        result = await service.createTeamAndSwitch({
          ...intent,
          teamName: normalizedTeamName,
        });
      } catch {
        if (
          createTeamIntentsRef.current.get(normalizedTeamName) !== intent ||
          dialogGenerationRef.current !== intent.dialogGeneration
        ) {
          return rejectedResult("temporarily_unavailable");
        }
        return handleCommandTransportFailure(intent.expectedIdentityKey);
      }
      const intentStillActive =
        createTeamIntentsRef.current.get(normalizedTeamName) === intent;
      if (result.status === "completed") {
        invalidateCompositeIdentity(intent.expectedIdentityKey);
        if (
          intentStillActive &&
          dialogGenerationRef.current === intent.dialogGeneration
        ) {
          pendingManagementIntentRef.current = intent;
          setPendingManagementOpen({
            identityKey: intent.expectedIdentityKey,
            appliedSequence: result.appliedSequence,
            intentKey: normalizedTeamName,
            commandId: intent.commandId,
            dialogGeneration: intent.dialogGeneration,
          });
        }
      } else if (
        isDeterministicCompositeCommandResult(result) &&
        intentStillActive
      ) {
        createTeamIntentsRef.current.delete(normalizedTeamName);
      }
      if (
        snapshotRef.current?.identityKey !== intent.expectedIdentityKey ||
        !intentStillActive ||
        dialogGenerationRef.current !== intent.dialogGeneration
      ) {
        return result;
      }
      return applyCommandResult(result);
    },
    [
      applyCommandResult,
      currentCreateTeamCommandIntent,
      handleCommandTransportFailure,
      invalidateCompositeIdentity,
      rejectLocally,
      service,
    ],
  );
  const acceptInvitationAndSwitch = reactExports.useCallback(
    async (invitationId, expectedInvitationVersion) => {
      if (
        !service ||
        !snapshotRef.current?.identityKey ||
        contract?.compatibility !== "SUPPORTED" ||
        !contract.gates.teamRead ||
        !contract.gates.teamSwitch ||
        !contract.gates.teamInvitation
      ) {
        return rejectLocally(
          service ? "feature_disabled" : "temporarily_unavailable",
        );
      }
      const normalizedInvitationId = invitationId.trim();
      const normalizedInvitationVersion = expectedInvitationVersion.trim();
      const intentKey = invitationIntentKey(
        normalizedInvitationId,
        normalizedInvitationVersion,
      );
      const intent = currentCompositeCommandIntent(
        invitationIntentsRef.current,
        intentKey,
      );
      if (!intent) return rejectLocally("temporarily_unavailable");
      let result;
      try {
        result = await service.acceptInvitationAndSwitch({
          ...intent,
          invitationId: normalizedInvitationId,
          expectedInvitationVersion: normalizedInvitationVersion,
        });
      } catch {
        return handleCommandTransportFailure(intent.expectedIdentityKey);
      }
      if (
        isDeterministicCompositeCommandResult(result) &&
        invitationIntentsRef.current.get(intentKey) === intent
      ) {
        invitationIntentsRef.current.delete(intentKey);
      }
      if (result.status === "completed") {
        invalidateCompositeIdentity(intent.expectedIdentityKey);
      }
      if (snapshotRef.current?.identityKey !== intent.expectedIdentityKey)
        return result;
      return applyCommandResult(result);
    },
    [
      applyCommandResult,
      contract,
      currentCompositeCommandIntent,
      handleCommandTransportFailure,
      invalidateCompositeIdentity,
      rejectLocally,
      service,
    ],
  );
  const revalidateContext = reactExports.useCallback(
    async (observedContextsRevision) => {
      const base = currentCommandBase();
      if (
        !service ||
        !base ||
        contract?.compatibility !== "SUPPORTED" ||
        !contract.gates.teamRead
      ) {
        return rejectLocally(
          service ? "invalid_request" : "temporarily_unavailable",
        );
      }
      let result;
      try {
        result = await service.revalidateContext({
          ...base,
          observedContextsRevision,
        });
      } catch {
        return handleCommandTransportFailure(base.expectedIdentityKey);
      }
      if (snapshotRef.current?.identityKey !== base.expectedIdentityKey)
        return result;
      return applyCommandResult(result);
    },
    [
      applyCommandResult,
      contract,
      currentCommandBase,
      handleCommandTransportFailure,
      rejectLocally,
      service,
    ],
  );
  const exitCurrentTeam = reactExports.useCallback(
    async (request) => {
      const base = currentCommandBase();
      const command = service?.exitCurrentTeam;
      if (
        !service ||
        !command ||
        !base ||
        contract?.compatibility !== "SUPPORTED" ||
        !contract.gates.teamRead ||
        !contract.gates.teamMutation
      ) {
        return {
          status: "rejected",
          code: service ? "feature_disabled" : "temporarily_unavailable",
        };
      }
      let result;
      try {
        result = await command({
          ...base,
          ...request,
        });
      } catch {
        result = {
          status: "rejected",
          code: "temporarily_unavailable",
        };
      }
      if (snapshotRef.current?.identityKey !== base.expectedIdentityKey)
        return result;
      if (result.status === "busy") {
        setLastTransitionAttempt({
          kind: "busy",
          blockingReasons: result.blockingReasons,
        });
      } else if (result.status === "rejected") {
        setLastTransitionAttempt({
          kind: "rejected",
          code: result.code,
        });
      } else if (result.status === "recovering") {
        setLastTransitionAttempt({
          kind: "recovering",
          reasonCode: result.reasonCode,
        });
        closeDialogAtSequence(result.appliedSequence);
      } else if (result.status === "completed") {
        setLastTransitionAttempt(null);
        closeDialogAtSequence(result.appliedSequence);
      }
      if (result.status === "completed" || result.status === "recovering") {
        invalidateCompositeIdentity(base.expectedIdentityKey);
      }
      return result;
    },
    [
      closeDialogAtSequence,
      contract,
      currentCommandBase,
      invalidateCompositeIdentity,
      service,
    ],
  );
  const transferCredits = reactExports.useCallback(
    async (request) => {
      const base = currentCommandBase();
      const command = service?.transferCredits;
      if (
        !service ||
        !command ||
        !base ||
        contract?.compatibility !== "SUPPORTED" ||
        !contract.gates.teamBilling
      ) {
        return {
          status: "rejected",
          code: service ? "feature_disabled" : "temporarily_unavailable",
        };
      }
      try {
        return await command({
          ...base,
          ...request,
        });
      } catch {
        return {
          status: "unknown",
          reasonCode: "team_credit_transfer_result_unknown",
        };
      }
    },
    [contract, currentCommandBase, service],
  );
  const acknowledgeCreditTransfer = reactExports.useCallback(
    async (request) => {
      const base = currentCommandBase();
      if (!service?.acknowledgeCreditTransfer || !base) {
        throw new Error("team_credit_transfer_ack_unavailable");
      }
      await service.acknowledgeCreditTransfer({
        ...base,
        ...request,
      });
    },
    [currentCommandBase, service],
  );
  const observedContexts = contextsQuery.isSuccess ? contextsQuery.data : null;
  const observedContextsKey =
    contextsRefreshKey && observedContexts
      ? contextsObservationKey(
          contextsRefreshKey,
          contextsQuery.dataUpdatedAt,
          observedContexts.contextsRevision,
          observedContexts.serverTimeMs,
        )
      : null;
  reactExports.useEffect(() => {
    if (
      !service ||
      !activeScope ||
      snapshot?.status !== "ready" ||
      !contextsRefreshKey
    ) {
      return;
    }
    let disposed = false;
    const expectedIdentityKey = snapshot.identityKey;
    const expectedSequence = snapshot.sequence;
    void (async () => {
      let contexts = observedContexts;
      let observationKey = observedContextsKey;
      if (startedContextsRefreshRef.current !== contextsRefreshKey) {
        startedContextsRefreshRef.current = contextsRefreshKey;
        if (disposed) return;
        const result = await contextsQuery.refetch({
          cancelRefetch: false,
        });
        if (disposed || !result.isSuccess || !result.data) return;
        contexts = result.data;
        observationKey = contextsObservationKey(
          contextsRefreshKey,
          result.dataUpdatedAt,
          result.data.contextsRevision,
          result.data.serverTimeMs,
        );
      }
      if (!contexts || !observationKey) return;
      if (processedContextsObservationRef.current === observationKey) return;
      processedContextsObservationRef.current = observationKey;
      const current = snapshotRef.current;
      if (
        current?.status !== "ready" ||
        current.identityKey !== expectedIdentityKey ||
        current.sequence !== expectedSequence
      ) {
        return;
      }
      const currentScope = deriveActiveScope(current);
      if (!accountScopeEquals(currentScope, activeScope)) return;
      if (
        contexts.items.some((item) => contextConfirmsCanonical(item, current))
      ) {
        return;
      }
      const activeTeamGroupId =
        current.activeContext.accountType === "TEAM"
          ? current.activeContext.groupId
          : null;
      const revalidationKey = `${contextsRefreshKey}:${contexts.contextsRevision}`;
      if (lastContextRevalidationRef.current === revalidationKey) return;
      lastContextRevalidationRef.current = revalidationKey;
      let commandResult;
      try {
        commandResult = await service.revalidateContext({
          commandId: createRequestId(),
          expectedIdentityKey,
          expectedSequence,
          observedContextsRevision: contexts.contextsRevision,
        });
      } catch {
        if (lastContextRevalidationRef.current === revalidationKey) {
          lastContextRevalidationRef.current = null;
        }
        return;
      }
      if (
        isRetryableRevalidationResult(commandResult) &&
        lastContextRevalidationRef.current === revalidationKey
      ) {
        lastContextRevalidationRef.current = null;
      }
      if (
        !disposed &&
        commandResult.status === "completed" &&
        activeTeamGroupId !== null
      ) {
        let latest = snapshotRef.current;
        if (!snapshotReachedSequence(latest, commandResult.appliedSequence)) {
          latest = await service.getSnapshot();
        }
        if (disposed) return;
        const switchedToAnotherAccount =
          latest?.status === "ready" &&
          latest.activeContext !== null &&
          (latest.activeContext.accountType !== "TEAM" ||
            latest.activeContext.groupId !== activeTeamGroupId);
        if (switchedToAnotherAccount) {
          dedupedToast.warning(
            t("team.account.autoSwitching", {
              defaultValue: "当前团队账号已不可用，将自动切换到其他账号。",
            }),
          );
        }
      }
      if (!disposed) applyCommandResult(commandResult);
    })();
    return () => {
      disposed = true;
    };
  }, [
    activeScope,
    applyCommandResult,
    contextsRefreshKey,
    contextsQuery.refetch,
    observedContexts,
    observedContextsKey,
    service,
    snapshot,
    t,
  ]);
  const getSubmissionDecision = reactExports.useCallback(
    (kind) => evaluateAccountSubmission(kind),
    [],
  );
  const submissionAllowed = evaluateAccountSubmission("chat").allowed;
  const beginDialogGeneration = reactExports.useCallback(() => {
    dialogGenerationRef.current += 1;
    dialogCloseSequenceRef.current = null;
    createTeamIntentsRef.current.clear();
    pendingManagementIntentRef.current = null;
    setPendingManagementOpen(null);
  }, []);
  const recoverSelectedGroup = reactExports.useCallback(
    async (trigger = "user_retry") => {
      const identityKey = snapshotRef.current?.identityKey;
      if (!service || !identityKey) return false;
      try {
        const next = await service.recoverSelectedGroup({
          commandId: createRequestId(),
          expectedIdentityKey: identityKey,
          trigger,
        });
        return next.status === "ready";
      } catch {
        return false;
      }
    },
    [service],
  );
  reactExports.useEffect(() => {
    if (!service) return void 0;
    if (!isRecoverableTeamAccountStatus(snapshot?.status ?? "signed_out"))
      return void 0;
    let disposed = false;
    const attempt = (event) => {
      if (disposed) return;
      void recoverSelectedGroup(
        event.type === "online" ? "renderer_online" : "renderer_focus",
      );
    };
    window.addEventListener("online", attempt);
    window.addEventListener("focus", attempt);
    attempt(new Event("focus"));
    return () => {
      disposed = true;
      window.removeEventListener("online", attempt);
      window.removeEventListener("focus", attempt);
    };
  }, [recoverSelectedGroup, service, snapshot?.status]);
  const openCreate = reactExports.useCallback(() => {
    if (!identityKey) return;
    beginDialogGeneration();
    setDialog({
      type: "create",
      identityKey,
    });
  }, [beginDialogGeneration, identityKey]);
  const openManagement = reactExports.useCallback(() => {
    if (!activeScope?.membershipRevision) return;
    beginDialogGeneration();
    setDialog({
      type: "management",
      scope: activeScope,
    });
  }, [activeScope, beginDialogGeneration]);
  const openCredits = reactExports.useCallback(() => {
    if (!activeScope?.membershipRevision) return;
    beginDialogGeneration();
    setDialog({
      type: "credits",
      scope: activeScope,
    });
  }, [activeScope, beginDialogGeneration]);
  const openSwitchBlocked = reactExports.useCallback(
    (blockingReasons) => {
      if (!identityKey) return;
      beginDialogGeneration();
      setDialog({
        type: "switch-blocked",
        identityKey,
        blockingReasons,
      });
    },
    [beginDialogGeneration, identityKey],
  );
  const closeDialog = reactExports.useCallback(() => {
    beginDialogGeneration();
    setDialog({
      type: "closed",
    });
  }, [beginDialogGeneration]);
  const value = reactExports.useMemo(
    () => ({
      integrationEnabled: enabled,
      snapshot,
      viewModel,
      contract,
      activeScope,
      accountDataVisible,
      billingAvailable,
      submissionAllowed,
      lastTransitionAttempt,
      dialog,
      getSubmissionDecision,
      switchContext,
      createTeamAndSwitch,
      acceptInvitationAndSwitch,
      transferCredits,
      acknowledgeCreditTransfer,
      exitCurrentTeam,
      revalidateContext,
      recoverSelectedGroup,
      openCreate,
      openManagement,
      openCredits,
      openSwitchBlocked,
      closeDialog,
    }),
    [
      acceptInvitationAndSwitch,
      acknowledgeCreditTransfer,
      accountDataVisible,
      activeScope,
      billingAvailable,
      closeDialog,
      contract,
      createTeamAndSwitch,
      dialog,
      enabled,
      getSubmissionDecision,
      exitCurrentTeam,
      lastTransitionAttempt,
      openCreate,
      openCredits,
      openManagement,
      openSwitchBlocked,
      recoverSelectedGroup,
      revalidateContext,
      snapshot,
      submissionAllowed,
      switchContext,
      transferCredits,
      viewModel,
    ],
  );
  return (
    <TeamAccountContext.Provider value={value}>
      {children2}
    </TeamAccountContext.Provider>
  );
}
