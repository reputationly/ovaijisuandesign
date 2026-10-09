// use-retry-hint-active.js
import { getRuntimeConfig, reactExports } from "../vendor.js";
import { getNetworkDiagnosticsMainService } from "../team/copy-icon-button.jsx";
import { WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "../workspace/workspace-failure-diagnosis-registry.js";

const TERMINAL_STATES = new Set(["failed", "stopped"]);

function isTerminalState(s2) {
  return TERMINAL_STATES.has(s2);
}

export function shouldRefreshStatusOnResume(isActive2, lastState) {
  if (!isActive2 || lastState === void 0) return false;
  return isTerminalState(lastState) || lastState === "stopping";
}

export function runFullNetworkDiagnostics(options) {
  return getNetworkDiagnosticsMainService().runDiagnostics({
    localGatewayUrl: options?.gatewayUrl ?? getRuntimeConfig().gatewayUrl,
    localGatewayClaim: options?.gatewayUrl ? options?.workspaceClaim : void 0,
    localGatewayBinding: options?.gatewayUrl
      ? options?.workspaceBinding
      : void 0,
  });
}

export function useRetryHintActive(blockedUntilMs) {
  const [expiredUntilMs, setExpiredUntilMs] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    setExpiredUntilMs(void 0);
    if (blockedUntilMs === void 0) return;
    const remainingMs = blockedUntilMs - Date.now();
    if (remainingMs <= 0) {
      setExpiredUntilMs(blockedUntilMs);
      return;
    }
    const timer2 = setTimeout(
      () => setExpiredUntilMs(blockedUntilMs),
      remainingMs + 50,
    );
    return () => clearTimeout(timer2);
  }, [blockedUntilMs]);
  return (
    blockedUntilMs !== void 0 &&
    blockedUntilMs > Date.now() &&
    expiredUntilMs !== blockedUntilMs
  );
}

Object.fromEntries(
  Object.entries(WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY).map(([code2, meta2]) => [
    code2,
    {
      messageKey: meta2.message.key,
      messageDefault: meta2.message.zh,
      suggestions: meta2.suggestions.map((suggestion) => ({
        key: suggestion.key,
        defaultValue: suggestion.zh,
      })),
    },
  ]),
);
