// use-model-catalog-scope-key.js
import {
  formatErrorMessage,
  ProgressRootContext,
  reactExports,
  useGatewayScope,
} from "../vendor.js";
import { gatewayUrlFromBase } from "../infra/gateway-http-error.jsx";
import { gatewayFetchFromBase } from "../infra/perform-gateway-fetch.js";
import { RuntimeConfigContext } from "../vendor-inline/vscode-base/graph.jsx";
import {
  AuthContext,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { canUseDebugTooling } from "../workspace/use-deep-link-router.js";
export function useGatewayScopeKey() {
  return useGatewayScope().scopeKey;
}
export function useGatewayReady() {
  return useGatewayScope().gatewayReady;
}
export function useGatewayUrl() {
  const { baseUrl, gatewayBinding, workspaceClaim, workspaceClient } =
    useGatewayScope();
  return reactExports.useCallback(
    (path2) =>
      workspaceClient?.url(path2) ??
      gatewayUrlFromBase(baseUrl, path2, gatewayBinding ?? workspaceClaim),
    [baseUrl, gatewayBinding, workspaceClaim, workspaceClient],
  );
}
export function useGatewayFetch() {
  const {
    baseUrl,
    gatewayBinding,
    workspaceClaim,
    workspaceClient,
    recoverWorkspace,
  } = useGatewayScope();
  return reactExports.useCallback(
    (path2, options) =>
      gatewayFetchFromBase(baseUrl, path2, {
        ...options,
        workspaceBinding: options?.workspaceBinding ?? gatewayBinding,
        workspaceClaim: options?.workspaceClaim ?? workspaceClaim,
        workspaceClient: options?.workspaceClient ?? workspaceClient,
        recoverWorkspace: options?.recoverWorkspace ?? recoverWorkspace,
      }),
    [
      baseUrl,
      gatewayBinding,
      recoverWorkspace,
      workspaceClaim,
      workspaceClient,
    ],
  );
}
const authSessionKeys = new WeakMap();
let nextAuthSessionKey = 1;
function getAuthSessionKey(user) {
  if (!user) return "anonymous";
  const existing = authSessionKeys.get(user);
  if (existing !== void 0) return `session:${existing}`;
  const created = nextAuthSessionKey;
  nextAuthSessionKey += 1;
  authSessionKeys.set(user, created);
  return `session:${created}`;
}
export function useModelCatalogScopeKey() {
  const auth = reactExports.useContext(AuthContext);
  const teamAccount = useOptionalTeamAccount();
  const authSessionKey = getAuthSessionKey(auth?.user);
  const identityKey =
    teamAccount?.snapshot?.identityKey ?? auth?.user?.userID ?? "no-identity";
  const activeContext = teamAccount?.snapshot?.activeContext;
  return reactExports.useMemo(
    () =>
      JSON.stringify([
        authSessionKey,
        identityKey,
        activeContext?.groupId ?? "no-group",
        activeContext?.epoch ?? "no-epoch",
        activeContext?.membershipRevision ?? "no-membership-revision",
      ]),
    [
      activeContext?.epoch,
      activeContext?.groupId,
      activeContext?.membershipRevision,
      authSessionKey,
      identityKey,
    ],
  );
}
export function useProgressRootContext() {
  const context = reactExports.useContext(ProgressRootContext);
  if (context === void 0) {
    throw new Error(formatErrorMessage(51));
  }
  return context;
}
export function folderNameFromPath(fullPath) {
  return fullPath.split(/[/\\]/).filter(Boolean).pop() || fullPath;
}
export function workspaceDisplayName(workspace) {
  const custom = workspace.displayName?.trim();
  return custom ? custom : folderNameFromPath(workspace.path);
}
export function formatTimestampDot(ts2) {
  const d2 = new Date(ts2);
  return `${d2.getFullYear()}.${d2.getMonth() + 1}.${d2.getDate()}`;
}
export const ACTIVE_CUSTOM_MODEL_QUERY_KEY = ["active-custom-model"];
export function resolveActiveModelId(selected2, _active) {
  return selected2 ?? null;
}
export function useRuntimeConfig() {
  const ctx = reactExports.useContext(RuntimeConfigContext);
  if (!ctx)
    throw new Error("useRuntimeConfig must be used within AppProviders");
  return ctx;
}
export const ThemeCtx = reactExports.createContext(null);
export function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function resolveTheme(theme2) {
  return theme2 === "system" ? getSystemTheme() : theme2;
}
export function applyClass(resolved) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
export function useTheme() {
  const ctx = reactExports.useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within AppProviders");
  return ctx;
}
export const UPDATER_DEV_PREVIEW_EVENT = "hub:updater-dev-preview-change";
export const STORAGE_KEY = "hilo-updater-preview";
export function canUseUpdaterDevPreview() {
  return canUseDebugTooling();
}
export function setUpdaterDevPreviewMode(mode2) {
  if (!canUseUpdaterDevPreview()) return;
  if (mode2 === "off") {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  } else {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, mode2);
  }
  globalThis.window?.dispatchEvent(
    new CustomEvent(UPDATER_DEV_PREVIEW_EVENT, {
      detail: {
        mode: mode2,
      },
    }),
  );
}
