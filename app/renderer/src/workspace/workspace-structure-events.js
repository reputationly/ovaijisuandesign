/**
 * 工作区「结构订阅」客户端（第 164 轮从产物取回）。
 *
 * 它负责发 `task_subscribe(structure-0)` —— 此前整块缺失，
 * 导致 WebSocket 每工作区少发 5 帧、结构数据永远不到。
 *
 * 参考产物：index-BBp4hclA.js 424326–424477 与 429086–429245。
 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useQueryClient } from "@tanstack/react-query";
import { useOptionalWSConnection } from "../settings/changelog-table.jsx";
import { assetCenterLog } from "../vendor-inline/vscode-base/graph.jsx";
import { useOptionalTeamAccount } from "../assets/credit-query-keys.jsx";
import { useRequiredGatewayScope } from "../chat/use-required-gateway-scope.jsx";
import { usePlatform } from "../infra/platform-context.js";
import { workspaceLog } from "../infra/logger.js";
import {
  AuthContext, accountScopeKey, homeService, taskRecoveryAccountKeyFor,
} from "../canvas-v3/main-exports.js";
import { useWorkspaceProjectArchitecture } from "./use-workspace-project-architecture.jsx";
import { WorkspaceStructureContext } from "../canvas-v3/contexts.js";
import { parseTaskServerMessage } from "../canvas-v3/canvas-v3-model.js";
// 第 167 轮：真实 runtime 与设施层已取回但未接线（见两文件顶部说明），
// 仍用占位以保证应用行为不变、且链路状态可证伪。
const createWorkspaceStructureRuntime = () => undefined;

// 第 164 轮：以下 5 个在产物里属于另外几个未还原的模块，先给最小实现，
// 让订阅链路能跑通；它们不影响订阅帧的发送。
const useGatewayFetch = () => fetch;

const ensurePersistenceOwner = (owner) => owner;
const taskQueryKeys = { all: (scope) => ["tasks", scope] };
const taskRecoveryWorkspaceId = (scope) => scope?.workspaceId;

function createTaskSubscriptionNegotiation(prefix) {
  let subscriptionId = `${prefix}-${crypto.randomUUID()}`;
  let projectChanges = false;
  return {
    get subscriptionId() {
      return subscriptionId;
    },
    get projectChanges() {
      return projectChanges;
    },
    request() {
      return {
        type: "task_subscribe",
        subscriptionId,
        ...projectChanges ? { includeProjectChanges: true } : {}
      };
    },
    upgrade(message2) {
      const ready2 = parseTaskServerMessage(message2);
      if (ready2.type !== "task_subscription_ready" || ready2.subscriptionId !== subscriptionId || projectChanges || !ready2.capabilities?.includes("project_changes"))
        return;
      const previous2 = subscriptionId;
      subscriptionId = `${prefix}-${crypto.randomUUID()}`;
      projectChanges = true;
      return previous2;
    }
  };
}
function useWorkspaceStructureEvents(workbench, ready2, binding) {
  const queryClient2 = useQueryClient();
  const ws2 = useOptionalWSConnection();
  const [attempt, retry] = reactExports.useReducer((value) => value + 1, 0);
  const failures = reactExports.useRef(0);
  const [failed, setFailed] = reactExports.useState();
  const [subscribed, setSubscribed] = reactExports.useState();
  const retrySubscription = reactExports.useCallback(() => {
    failures.current = 0;
    retry();
  }, []);
  reactExports.useEffect(() => {
    failures.current = 0;
  }, [binding, ready2, workbench, ws2]);
  reactExports.useEffect(() => {
    if (!workbench || !ready2 || !binding || ws2?.scope !== "workspace" || !ws2.connected) return;
    const negotiation = createTaskSubscriptionNegotiation(`structure-${attempt}`);
    let active2 = true;
    let acknowledged = false;
    let retryTimer;
    let acknowledgeTimer;
    const send2 = (type, subscriptionId = negotiation.subscriptionId) => {
      try {
        if (ws2.send(type === "task_subscribe" ? negotiation.request() : { type, subscriptionId }))
          return true;
      } catch {
      }
      workspaceLog.warn("Structure task subscription message could not be sent", {
        subscriptionId,
        type
      });
      return false;
    };
    const stop = () => {
      if (!active2) return;
      active2 = false;
      clearTimeout(acknowledgeTimer);
      unsubscribe();
      send2("task_unsubscribe");
    };
    const handleUnavailable = (recoverable) => {
      if (!active2) return;
      stop();
      setFailed({ workbench, binding, ws: ws2 });
      if (recoverable) {
        const delay2 = Math.min(1e3 * 2 ** Math.min(failures.current++, 5), 3e4);
        retryTimer = setTimeout(retry, delay2);
      }
    };
    const unsubscribe = ws2.subscribe((event) => {
      if (!active2 || event.type !== "project_changed" && event.type !== "task_changed" && event.type !== "task_subscription_ready" && event.type !== "task_subscription_closed" && event.type !== "task_subscription_error" || event.subscriptionId !== negotiation.subscriptionId)
        return;
      try {
        if (event.type === "project_changed") {
          if (!acknowledged || !negotiation.projectChanges) return;
          const change = parseTaskServerMessage(event);
          if (change.type !== "project_changed") return;
          if (change.domains.includes("resources")) workbench.invalidateResources();
          if (change.domains.includes("compositions")) workbench.invalidateCompositions();
        } else if (event.type === "task_subscription_ready") {
          const previous2 = negotiation.upgrade(event);
          if (previous2) {
            acknowledged = false;
            setSubscribed(void 0);
            clearTimeout(acknowledgeTimer);
            send2("task_unsubscribe", previous2);
            acknowledgeTimer = setTimeout(() => handleUnavailable(true), 1e4);
            if (!send2("task_subscribe")) handleUnavailable(true);
            return;
          }
          if (acknowledged) return;
          acknowledged = true;
          clearTimeout(acknowledgeTimer);
          failures.current = 0;
          setFailed(void 0);
          setSubscribed({ attempt, workbench, binding, ws: ws2 });
          workbench.invalidateCompositions();
          workbench.invalidateResources();
          void queryClient2.invalidateQueries({ queryKey: taskQueryKeys.all(workbench.scopeKey) });
          workspaceLog.debug("Structure task subscription ready", {
            subscriptionId: negotiation.subscriptionId
          });
        } else if (event.type === "task_changed") {
          if (!acknowledged) return;
          workbench.acceptTaskSnapshot({ scopeKey: workbench.scopeKey, task: event.task });
        } else {
          workspaceLog.warn("Structure task subscription unavailable", {
            subscriptionId: negotiation.subscriptionId,
            code: event.type === "task_subscription_error" ? event.error.code : "closed"
          });
          handleUnavailable(
            event.type === "task_subscription_error" ? event.error.retryable || // Renderer login can precede gateway identity propagation.
            event.error.code === "UNAUTHENTICATED" : (
              // A closed subscription may have been revoked by an account/Group change.
              // Only a new owner scope or an explicit retry may subscribe again.
              false
            )
          );
        }
      } catch {
        workspaceLog.warn("Structure task event could not invalidate queries", {
          subscriptionId: negotiation.subscriptionId,
          type: event.type
        });
      }
    });
    if (!send2("task_subscribe")) handleUnavailable(true);
    else if (active2 && !acknowledged && !acknowledgeTimer)
      acknowledgeTimer = setTimeout(() => handleUnavailable(true), 1e4);
    return () => {
      clearTimeout(retryTimer);
      stop();
    };
  }, [attempt, binding, ready2, workbench, ws2, queryClient2]);
  return {
    connected: Boolean(
      ready2 && ws2?.connected && subscribed?.workbench === workbench && subscribed?.binding === binding && subscribed?.ws === ws2 && subscribed?.attempt === attempt && !(failed && failed.workbench === workbench && failed.binding === binding && failed.ws === ws2)
    ),
    unavailable: Boolean(
      workbench && ready2 && failed?.workbench === workbench && failed.binding === binding && failed.ws === ws2
    ),
    retry: retrySubscription
  };
}

function WorkspaceStructureProvider({
  children: children2,
  isActive: isActive2 = true
}) {
  const queryClient2 = useQueryClient();
  const scope = useRequiredGatewayScope();
  const request = useGatewayFetch();
  const auth = reactExports.useContext(AuthContext);
  const account = useOptionalTeamAccount();
  const projectArchitecture = useWorkspaceProjectArchitecture();
  const [pin, setPin] = reactExports.useState();
  const [runtime, setRuntime] = reactExports.useState();
  const [recoveryError, setRecoveryError] = reactExports.useState();
  const hostBinding = reactExports.useRef(scope.gatewayBinding);
  reactExports.useLayoutEffect(() => {
    hostBinding.current = scope.gatewayBinding;
  });
  const ownedRuntime = reactExports.useRef(void 0);
  const workspaceId = taskRecoveryWorkspaceId(scope.workspaceId);
  const instanceId = scope.gatewayBinding?.instanceId;
  const userId = auth?.user?.userID;
  const initialUserId = reactExports.useRef(void 0);
  if (!initialUserId.current && userId) initialUserId.current = userId;
  const signedOut = Boolean(auth && !auth.isLoading && !auth.isLoggedIn);
  const confirmedAccountKey = account?.integrationEnabled ? accountScopeKey(account.activeScope) ?? void 0 : "personal";
  const unresolvedAccountKey = account?.integrationEnabled && userId && initialUserId.current === userId && !account.activeScope ? JSON.stringify(["account-unresolved", userId]) : void 0;
  const accountKey = confirmedAccountKey ?? unresolvedAccountKey;
  const recoveryAccountKey = taskRecoveryAccountKeyFor(account) ?? unresolvedAccountKey;
  const accountIdentityReady = Boolean(userId && accountKey && recoveryAccountKey);
  const accountReady = Boolean(
    accountIdentityReady && (!account?.integrationEnabled || account.accountDataVisible)
  );
  const pinMatches = pin && pin.workspaceId === workspaceId && (!instanceId || pin.instanceId === instanceId);
  const architecture = projectArchitecture.data ?? (pinMatches ? pin?.architecture : void 0);
  function matchesCurrentScope(identity2) {
    return !signedOut && identity2.workspaceId === workspaceId && (!instanceId || identity2.instanceId === instanceId) && (!userId || identity2.userId === userId) && (!confirmedAccountKey || identity2.accountKey === confirmedAccountKey);
  }
  reactExports.useInsertionEffect(
    () => () => {
      const retiring = ownedRuntime.current;
      ownedRuntime.current = void 0;
      queueMicrotask(() => retiring?.dispose());
    },
    []
  );
  reactExports.useLayoutEffect(() => {
    if (projectArchitecture.data && instanceId && workspaceId) {
      const nextPin = { workspaceId, instanceId, architecture: projectArchitecture.data };
      setPin(
        (previous2) => previous2?.workspaceId === nextPin.workspaceId && previous2.instanceId === nextPin.instanceId && previous2.architecture === nextPin.architecture ? previous2 : nextPin
      );
    }
    let current2 = ownedRuntime.current;
    if (current2 && !matchesCurrentScope(current2.identity)) {
      current2.dispose();
      current2 = void 0;
    }
    const transportReady = architecture === "resource_v3" && Boolean(workspaceId) && scope.gatewayReady && Boolean(instanceId) && accountIdentityReady && !signedOut;
    const ready22 = transportReady && accountReady;
    const readOnly2 = transportReady && !accountReady;
    if (!current2 && transportReady && workspaceId && instanceId && userId && accountKey && recoveryAccountKey) {
      current2 = createWorkspaceStructureRuntime(
        { workspaceId, instanceId, userId, accountKey, recoveryAccountKey },
        queryClient2,
        request,
        () => {
          const binding = hostBinding.current;
          if (!binding || binding.instanceId !== instanceId)
            throw new Error("Workspace host retired");
          return {
            claim: binding.claim,
            instanceId: binding.instanceId,
            generation: binding.generation
          };
        },
        async (report) => {
          await ensurePersistenceOwner();
          await homeService.hiloApp.reportWorkspacePersistence(report);
        }
      );
    }
    current2?.updateConnection(request, ready22, readOnly2);
    ownedRuntime.current = current2;
    if (current2 !== runtime) setRuntime(current2);
  });
  const workbench = architecture === "resource_v3" && runtime && matchesCurrentScope(runtime.identity) ? runtime.workbench : void 0;
  const ready2 = Boolean(
    workbench && scope.gatewayReady && instanceId && accountReady && !signedOut
  );
  const {
    unavailable: subscriptionUnavailable,
    connected: subscriptionReady,
    retry: retrySubscription
  } = useWorkspaceStructureEvents(workbench, ready2, scope.gatewayBinding);
  const recoveryScope = JSON.stringify([workspaceId, instanceId, userId, accountKey]);
  const retry = reactExports.useCallback(async () => {
    setRecoveryError(void 0);
    try {
      if (!scope.gatewayReady || !scope.gatewayBinding) {
        await scope.recoverWorkspace?.();
        return;
      }
      if (!accountReady && account?.integrationEnabled) {
        await account.recoverSelectedGroup();
        return;
      }
      retrySubscription();
      await projectArchitecture.refetch();
    } catch (error2) {
      setRecoveryError({
        scope: recoveryScope,
        error: error2 instanceof Error ? error2 : new Error("Workspace Structure recovery failed")
      });
    }
  }, [
    scope.gatewayReady,
    scope.gatewayBinding,
    scope.recoverWorkspace,
    projectArchitecture.refetch,
    accountReady,
    account?.integrationEnabled,
    account?.recoverSelectedGroup,
    recoveryScope,
    retrySubscription
  ]);
  const error = (!ready2 && recoveryError?.scope === recoveryScope ? recoveryError.error : null) ?? projectArchitecture.error;
  const pending2 = !error && (architecture === void 0 || architecture === "resource_v3" && !ready2);
  const value = reactExports.useMemo(
    () => ({
      workspaceId,
      architecture,
      pending: pending2,
      error,
      ready: ready2,
      workbench,
      taskIntents: workbench ? runtime?.taskIntents : void 0,
      canvasImages: workbench ? runtime?.canvasImages : void 0,
      queryClient: queryClient2,
      retry,
      isActive: isActive2,
      subscriptionUnavailable,
      subscriptionReady
    }),
    [
      workspaceId,
      architecture,
      pending2,
      error,
      ready2,
      workbench,
      runtime,
      queryClient2,
      retry,
      isActive2,
      subscriptionUnavailable,
      subscriptionReady
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceStructureContext.Provider, { value, children: children2 });
}

export { useWorkspaceStructureEvents, WorkspaceStructureProvider, createTaskSubscriptionNegotiation };
