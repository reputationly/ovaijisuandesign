import { CurrentWorkspaceContext, useCurrentWorkspace } from "../infra/shared-runtime.js";
import { IHiloApp } from "../settings/parse-custom-mcp-arguments.js";
import { instantiationService } from "../workspace/home-service.jsx";
import { CANVAS_V3_ROUTES } from "../workspace/use-required-gateway-scope.jsx";
import { GatewayScopeProvider, normalizeWorkspaceId, useGatewayFetch, useGatewayScope, useTopbarActiveWorkspaceSnapshot } from "./listeners-a.jsx";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export async function loadWorkspaceProjectArchitecture(fetch2, signal) {
  const response = await fetch2(CANVAS_V3_ROUTES.architecture, {
    signal,
  });
  if (!response.ok) throw new Error(`PROJECT_ARCHITECTURE_LOAD_FAILED: ${response.status}`);
  const body2 = await response.json();
  if (body2 && typeof body2 === "object" && "projectArchitecture" in body2) {
    const architecture = body2.projectArchitecture;
    if (architecture === "legacy" || architecture === "resource_v3") return architecture;
  }
  throw new Error("PROJECT_ARCHITECTURE_UNSUPPORTED");
}

export function useActiveRuntime(currentWorkspaceId, hiloApp2) {
  const [runtime, setRuntime] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!currentWorkspaceId) {
      setRuntime(null);
      return;
    }
    setRuntime(null);
    let disposed = false;
    let requestId = 0;
    const refresh2 = () => {
      const currentRequest = ++requestId;
      void hiloApp2
        .getWorkspaceRuntime(currentWorkspaceId)
        .then((r2) => {
          if (!disposed && currentRequest === requestId) {
            const next2 = r2 ?? null;
            setRuntime((prev) => (prev && next2 && JSON.stringify(prev) === JSON.stringify(next2) ? prev : next2));
          }
        })
        .catch(() => {
          if (!disposed && currentRequest === requestId) setRuntime(null);
        });
    };
    const clear = () => {
      requestId += 1;
      setRuntime(null);
    };
    refresh2();
    const disposable = hiloApp2.onWorkspaceEntriesChanged((entries2) => {
      if (entries2.some((entry) => entry.workspaceId === currentWorkspaceId)) {
        refresh2();
      } else {
        clear();
      }
    });
    return () => {
      disposed = true;
      requestId += 1;
      disposable.dispose();
    };
  }, [currentWorkspaceId, hiloApp2]);
  return runtime;
}

export function SettingsWorkspaceScope({ children: children2, workspaceId }) {
  const routerSearch = useRouterState({
    select: (s2) => s2.location.search,
  });
  const routeWorkspaceId = normalizeWorkspaceId(routerSearch?.workspaceId) ?? null;
  const activeWorkspaceSnapshot = useTopbarActiveWorkspaceSnapshot();
  const currentWorkspaceId = workspaceId ?? routeWorkspaceId ?? activeWorkspaceSnapshot.currentWorkspaceId;
  const hiloApp2 = reactExports.useMemo(
    () => instantiationService.invokeFunction((accessor) => accessor.get(IHiloApp)),
    [],
  );
  const runtimeFromLookup = useActiveRuntime(currentWorkspaceId, hiloApp2);
  const runtimeFromTopbar =
    activeWorkspaceSnapshot.activeRuntime?.workspaceId === currentWorkspaceId
      ? activeWorkspaceSnapshot.activeRuntime
      : null;
  const activeRuntime =
    (runtimeFromLookup?.workspaceId === currentWorkspaceId ? runtimeFromLookup : null) ?? runtimeFromTopbar;
  const [recovered, setRecovered] = reactExports.useState(null);
  // `activeRuntime` 可能是 undefined（`runtimeFromTopbar` 为 undefined 时 `??` 不会兜底成 null）。
  // 那样 `recovered` 是 null 时两边都是 undefined，`===` 成立，接着读 `recovered.runtime` 就抛
  // 「Cannot read properties of null」。这是上游自己的隐患（和第 33 轮那处 `undefined === undefined` 同类），
  // 这里给 `runtime` 补一次可选链，语义不变。
  const effectiveRuntime =
    recovered?.runtime &&
    recovered.sourceRuntime === activeRuntime &&
    recovered.runtime.workspaceId === currentWorkspaceId
      ? recovered.runtime
      : activeRuntime;
  const recoverWorkspaceBinding = reactExports.useCallback(async () => {
    if (!currentWorkspaceId) return void 0;
    const next2 = await hiloApp2.getWorkspaceRuntime(currentWorkspaceId);
    if (!next2?.gatewayBinding) return void 0;
    setRecovered({
      sourceRuntime: activeRuntime,
      runtime: next2,
    });
    return next2.gatewayBinding;
  }, [activeRuntime, currentWorkspaceId, hiloApp2]);
  return (
    <GatewayScopeProvider
      gatewayUrl={effectiveRuntime?.gatewayUrl}
      gatewayBinding={effectiveRuntime?.gatewayBinding}
      scopeKey={currentWorkspaceId ?? void 0}
      workspaceClaim={effectiveRuntime?.workspaceClaim}
      recoverWorkspace={currentWorkspaceId ? recoverWorkspaceBinding : void 0}
    >
      <CurrentWorkspaceContext.Provider key={currentWorkspaceId ?? "app"} value={effectiveRuntime?.folderPath ?? ""}>
        {children2}
      </CurrentWorkspaceContext.Provider>
    </GatewayScopeProvider>
  );
}

export function ScopedProjectSettings({ children: children2, onDisabled, feature = "memory" }) {
  const fetcher = useGatewayFetch();
  const workspace2 = useCurrentWorkspace();
  const { scopeKey, workspaceId, gatewayBinding, gatewayReady } = useGatewayScope();
  const architecture = useQuery({
    queryKey: ["workspace-project-architecture", scopeKey, gatewayBinding?.instanceId, gatewayBinding?.generation],
    queryFn: ({ signal }) => loadWorkspaceProjectArchitecture(fetcher, signal),
    enabled: Boolean(workspace2 && workspaceId && gatewayReady && gatewayBinding),
    staleTime: Infinity,
    placeholderData: (previous2) => previous2,
    retry: false,
  });
  const [confirmed, setConfirmed] = reactExports.useState(architecture.data);
  reactExports.useEffect(() => {
    if (architecture.data) setConfirmed(architecture.data);
  }, [architecture.data]);
  const pin = architecture.data ?? confirmed;
  const enabled =
    feature === "rules" ? Boolean(workspaceId && pin === "resource_v3") : !workspaceId || pin === "legacy";
  reactExports.useEffect(() => {
    if ((!workspaceId || pin) && !enabled) onDisabled?.();
  }, [workspaceId, pin, enabled, onDisabled]);
  return enabled ? children2 : null;
}

export function ProjectSettingsGate(props) {
  return (
    <SettingsWorkspaceScope workspaceId={props.workspaceId}>
      <ScopedProjectSettings {...props} />
    </SettingsWorkspaceScope>
  );
}
