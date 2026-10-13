// request-prompt-prefill.jsx
import {
  buildOfficialConnectorList,
  findHcpConnector,
  hcpToDefinition,
  jsxRuntimeExports,
  namesMatch,
  reactExports,
  sanitize,
  SPECIAL_CONNECTORS,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getPlatform } from "../infra/web-storage.js";
import { TOOL_LABEL_DEFINITIONS } from "../workspace/tool-label-definitions.js";
import { useIsScrolling } from "../assets/credit-query-keys.jsx";
const EMPTY_TOOL_CALL_DISPLAY_CONFIG = {
  displayLabels: {},
  labelIds: {},
};
function parseToolDisplayPatterns(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([label, patterns]) => {
      if (!label.trim() || !Array.isArray(patterns)) return [];
      const valid = patterns.filter((pattern) => {
        if (typeof pattern !== "string" || !pattern.trim()) return false;
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      });
      return valid.length ? [[label, valid]] : [];
    }),
  );
}
function parseToolCallDisplayConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_TOOL_CALL_DISPLAY_CONFIG;
  }
  const displayLabels = parseToolDisplayPatterns(
    "displayLabels" in value ? value.displayLabels : void 0,
  );
  const labelIds = Object.fromEntries(
    Object.entries(
      parseToolDisplayPatterns("labelIds" in value ? value.labelIds : void 0),
    ).filter(([label]) => Object.hasOwn(TOOL_LABEL_DEFINITIONS, label)),
  );
  return {
    displayLabels,
    labelIds,
  };
}
function compileToolDisplayPatterns(rules) {
  return Object.entries(rules).map(([label, patterns]) => ({
    label,
    patterns: patterns.map((pattern) => new RegExp(pattern)),
  }));
}
let configuredDisplayLabels = compileToolDisplayPatterns(
  EMPTY_TOOL_CALL_DISPLAY_CONFIG.displayLabels,
);
let toolCallDisplayConfigKey = JSON.stringify(EMPTY_TOOL_CALL_DISPLAY_CONFIG);
export let configuredLabelIds = compileToolDisplayPatterns(
  EMPTY_TOOL_CALL_DISPLAY_CONFIG.labelIds,
);
export function setToolCallDisplayConfig(value) {
  const next = parseToolCallDisplayConfig(value);
  const key = JSON.stringify(next);
  if (key === toolCallDisplayConfigKey) return;
  toolCallDisplayConfigKey = key;
  configuredDisplayLabels = compileToolDisplayPatterns(next.displayLabels);
  configuredLabelIds = compileToolDisplayPatterns(next.labelIds);
}
export function getConfiguredToolDisplayLabel(toolName2) {
  return configuredDisplayLabels.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(toolName2)),
  )?.label;
}
export const TOAST_ID = "proxy-detected";
export const TOAST_DURATION_MS = 15e3;
export const PROXY_RECHECK_INTERVAL_MS = 3e3;
export const WARNING_CONFIRMATION_COUNT = 2;
export function ConnectorDialogScrollableBody({ children: children2 }) {
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  return (
    <div
      ref={scrollRef}
      data-scrolling={isScrolling || void 0}
      className="connector-dialog-scrollbar scrollbar-fade min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable_both-edges]"
      data-layout-slot="connector-dialog-scroll"
    >
      {children2}
    </div>
  );
}
export const OFFICIAL_CONNECTORS = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return void 0;
      if (SPECIAL_CONNECTORS[prop]) return SPECIAL_CONNECTORS[prop]();
      return hcpToDefinition(prop);
    },
    has(_target, prop) {
      if (typeof prop !== "string") return false;
      if (SPECIAL_CONNECTORS[prop]) return true;
      return findHcpConnector(prop) !== void 0;
    },
  },
);
export function findOfficialConnectorForServer(server) {
  return buildOfficialConnectorList().find((connector) =>
    connector.matches(server),
  );
}
export function findOfficialConnectorByServerName(serverName) {
  return buildOfficialConnectorList().find((connector) =>
    namesMatch(connector.serverName, serverName),
  );
}
export const DEBUG_PANEL_OPEN_EVENT = "hub:debug-panel-open";
export const InterestSelectionContext = reactExports.createContext(null);
export function useInterestSelection() {
  const ctx = reactExports.useContext(InterestSelectionContext);
  if (!ctx) {
    throw new Error(
      "useInterestSelection must be used within <InterestSelectionProvider>",
    );
  }
  return ctx;
}
export function getFileManagerLabelKey(os) {
  if (os === "darwin") return "common.fileManager.open.darwin";
  if (os === "win32") return "common.fileManager.open.win32";
  return "common.fileManager.open.other";
}
export function PlatformFileManagerLabel({ os }) {
  const { t } = useTranslation();
  return <>{t(getFileManagerLabelKey(os ?? getPlatform().app.os))}</>;
}
export const KEY_PREFIX = "hilo:popup:claimed:";
export function clearClaimsForUser(userID) {
  if (!userID) return;
  try {
    const userPrefix = `${KEY_PREFIX}${userID}:`;
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(userPrefix)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {}
}
export function rehypeSanitize(options) {
  return function (tree) {
    const result = /** @type {Root} */ sanitize(tree, options);
    return result;
  };
}
const listeners = new Set();
const emitPromptPrefillChange = () => {
  for (const listener of listeners) listener();
};
let nextId = 0;
let pendingPromptPrefill = null;
export function completePromptPrefill(id, success) {
  if (pendingPromptPrefill?.request.id !== id) return false;
  const current = pendingPromptPrefill;
  pendingPromptPrefill = null;
  current.finish(success);
  emitPromptPrefillChange();
  return true;
}
export function requestPromptPrefill(payload, signal) {
  if (
    pendingPromptPrefill ||
    signal?.aborted ||
    !payload.prompt.trim() ||
    !payload.modelId.trim()
  ) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const id = ++nextId;
    const controller = new AbortController();
    const abort = () => completePromptPrefill(id, false);
    const timeout = setTimeout(abort, 15e3);
    signal?.addEventListener("abort", abort, {
      once: true,
    });
    pendingPromptPrefill = {
      request: {
        id,
        ...payload,
        signal: controller.signal,
      },
      claimed: false,
      finish: (success) => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        if (!success) controller.abort();
        resolve(success);
      },
    };
    emitPromptPrefillChange();
  });
}
export function subscribePromptPrefill(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getPromptPrefillRequest() {
  return pendingPromptPrefill?.request ?? null;
}
export function claimPromptPrefill(id) {
  if (!pendingPromptPrefill || pendingPromptPrefill.request.id !== id || pendingPromptPrefill.claimed)
    return false;
  pendingPromptPrefill.claimed = true;
  return true;
}
const randomInspirationListeners = new Set();
const emit = () => {
  for (const listener of randomInspirationListeners) listener();
};
let nextRandomInspirationId = 0;
let pending = null;
export function completeRandomInspiration(id, success) {
  if (pending?.id !== id) return false;
  const request = pending;
  pending = null;
  request.finish(success);
  emit();
  return true;
}
export function requestRandomInspiration(signal, queryIds) {
  if (pending || signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const id = ++nextRandomInspirationId;
    const abort = () => completeRandomInspiration(id, false);
    const timeout = setTimeout(abort, 15e3);
    signal?.addEventListener("abort", abort, {
      once: true,
    });
    pending = {
      id,
      queryIds: queryIds ? [...queryIds] : void 0,
      finish: (success) => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
        resolve(success);
      },
    };
    emit();
  });
}
export function subscribeRandomInspiration(listener) {
  randomInspirationListeners.add(listener);
  return () => {
    randomInspirationListeners.delete(listener);
  };
}
export function getRandomInspirationRequest() {
  return pending?.id ?? null;
}
export function getRandomInspirationQueryIds(id) {
  return pending?.id === id ? pending.queryIds : void 0;
}
