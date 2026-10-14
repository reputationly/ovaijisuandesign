// use-retry-hint-active.js
import { getRuntimeConfig } from "./runtime-config.js";
import reactExports from "react";
import { getNetworkDiagnosticsMainService } from "../team/copy-icon-button.jsx";
import { WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "../workspace/workspace-failure-diagnosis-registry.js";

const TERMINAL_STATES = new Set(["failed", "stopped"]);

function isTerminalState(state) {
  return TERMINAL_STATES.has(state);
}

export function shouldRefreshStatusOnResume(isActive, lastState) {
  if (!isActive || lastState === void 0) return false;
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
    const timer = setTimeout(
      () => setExpiredUntilMs(blockedUntilMs),
      remainingMs + 50,
    );
    return () => clearTimeout(timer);
  }, [blockedUntilMs]);
  return (
    blockedUntilMs !== void 0 &&
    blockedUntilMs > Date.now() &&
    expiredUntilMs !== blockedUntilMs
  );
}

Object.fromEntries(
  Object.entries(WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY).map(([code, meta]) => [
    code,
    {
      messageKey: meta.message.key,
      messageDefault: meta.message.zh,
      suggestions: meta.suggestions.map((suggestion) => ({
        key: suggestion.key,
        defaultValue: suggestion.zh,
      })),
    },
  ]),
);
