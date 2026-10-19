import { __jsx } from "../shared/jsx-runtime.js";
import { GatewayScopeContext as CanonicalGatewayScopeContext, getRuntimeConfig } from "../infra/runtime-config.js";
import { snapshot as snapshot$2 } from "../infra/use-plugin-metadata-store.js";
import { gatewayFetchFromBase, normalizeGatewayBaseUrl } from "./record-gateway-trace-id.jsx";
import { WorkspaceGatewayClient } from "./workspace-gateway-url.jsx";
import { default as reactExports } from "react";
export const listeners$a = new Set();

export function getTopbarActiveWorkspaceSnapshot() {
  return snapshot$2;
}

export function subscribeTopbarActiveWorkspaceSnapshot(listener) {
  listeners$a.add(listener);
  return () => listeners$a.delete(listener);
}

export function useTopbarActiveWorkspaceSnapshot() {
  return reactExports.useSyncExternalStore(
    subscribeTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
    getTopbarActiveWorkspaceSnapshot,
  );
}

export function normalizeWorkspaceId(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

// 必须和 `gateway-scope-provider.jsx` 用**同一个** context 对象。
//
// 之前这里自己 `createContext` 了一份，而 provider 用的是
// `infra/runtime-config.js` 里那份 —— 两份 context 互不相通：
// 页面明明在 provider 里面，`useGatewayScope()` 却永远读到兜底值
//（`scopeKey="app"`、`gatewayBinding=undefined`），于是
// `useWorkspaceProjectArchitecture` 的 `enabled` 永远是 false，画布卡在加载态。
export const GatewayScopeContext = CanonicalGatewayScopeContext;

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
    const fallbackGatewayUrl = scopeKey ? void 0 : getRuntimeConfig().gatewayUrl;
    const baseUrl = normalizeGatewayBaseUrl(stableGatewayBinding?.baseUrl ?? gatewayUrl2 ?? fallbackGatewayUrl);
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
      workspaceId: scopeKey,
      workspaceClaim: stableGatewayBinding?.claim ?? workspaceClaim,
      gatewayBinding: stableGatewayBinding,
      workspaceClient,
      recoverWorkspace,
    };
  }, [gatewayReady, gatewayUrl2, recoverWorkspace, scopeKey, stableGatewayBinding, workspaceClaim]);
  return <GatewayScopeContext.Provider value={value}>{children2}</GatewayScopeContext.Provider>;
}

export function useGatewayScope() {
  const context = reactExports.useContext(GatewayScopeContext);
  if (context) return context;
  const baseUrl = normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
  return {
    baseUrl,
    gatewayReady: baseUrl !== void 0,
    scopeKey: "app",
    workspaceId: void 0,
    workspaceClaim: void 0,
    gatewayBinding: void 0,
    workspaceClient: void 0,
    recoverWorkspace: void 0,
  };
}

export function useGatewayFetch() {
  const { baseUrl, gatewayBinding, workspaceClaim, workspaceClient, recoverWorkspace } = useGatewayScope();
  return reactExports.useCallback(
    (path2, options2) =>
      gatewayFetchFromBase(baseUrl, path2, {
        ...options2,
        workspaceBinding: options2?.workspaceBinding ?? gatewayBinding,
        workspaceClaim: options2?.workspaceClaim ?? workspaceClaim,
        workspaceClient: options2?.workspaceClient ?? workspaceClient,
        recoverWorkspace: options2?.recoverWorkspace ?? recoverWorkspace,
      }),
    [baseUrl, gatewayBinding, recoverWorkspace, workspaceClaim, workspaceClient],
  );
}
