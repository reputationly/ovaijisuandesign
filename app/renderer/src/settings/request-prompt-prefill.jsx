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
import { TOOL_LABEL_DEFINITIONS$1 } from "../workspace/tool-label-definitions.js";
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
      const valid2 = patterns.filter((pattern) => {
        if (typeof pattern !== "string" || !pattern.trim()) return false;
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      });
      return valid2.length ? [[label, valid2]] : [];
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
    ).filter(([label]) => Object.hasOwn(TOOL_LABEL_DEFINITIONS$1, label)),
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
  const next2 = parseToolCallDisplayConfig(value);
  const key2 = JSON.stringify(next2);
  if (key2 === toolCallDisplayConfigKey) return;
  toolCallDisplayConfigKey = key2;
  configuredDisplayLabels = compileToolDisplayPatterns(next2.displayLabels);
  configuredLabelIds = compileToolDisplayPatterns(next2.labelIds);
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

export function getFileManagerLabelKey(os2) {
  if (os2 === "darwin") return "common.fileManager.open.darwin";
  if (os2 === "win32") return "common.fileManager.open.win32";
  return "common.fileManager.open.other";
}

export function PlatformFileManagerLabel({ os: os2 }) {
  const { t: t2 } = useTranslation();
  return <>{t2(getFileManagerLabelKey(os2 ?? getPlatform().app.os))}</>;
}

export const KEY_PREFIX$3 = "hilo:popup:claimed:";

export function clearClaimsForUser(userID) {
  if (!userID) return;
  try {
    const userPrefix = `${KEY_PREFIX$3}${userID}:`;
    const toRemove = [];
    for (let i2 = 0; i2 < window.localStorage.length; i2++) {
      const key2 = window.localStorage.key(i2);
      if (key2?.startsWith(userPrefix)) toRemove.push(key2);
    }
    for (const key2 of toRemove) window.localStorage.removeItem(key2);
  } catch {}
}

export function rehypeSanitize(options) {
  return function (tree) {
    const result = /** @type {Root} */ sanitize(tree, options);
    return result;
  };
}

const listeners$3 = new Set();

const emit$1 = () => {
  for (const listener of listeners$3) listener();
};

let nextId$2 = 0;

let pending$1 = null;

export function completePromptPrefill(id2, success) {
  if (pending$1?.request.id !== id2) return false;
  const current2 = pending$1;
  pending$1 = null;
  current2.finish(success);
  emit$1();
  return true;
}

export function requestPromptPrefill(payload, signal) {
  if (
    pending$1 ||
    signal?.aborted ||
    !payload.prompt.trim() ||
    !payload.modelId.trim()
  ) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const id2 = ++nextId$2;
    const controller = new AbortController();
    const abort = () => completePromptPrefill(id2, false);
    const timeout2 = setTimeout(abort, 15e3);
    signal?.addEventListener("abort", abort, {
      once: true,
    });
    pending$1 = {
      request: {
        id: id2,
        ...payload,
        signal: controller.signal,
      },
      claimed: false,
      finish: (success) => {
        clearTimeout(timeout2);
        signal?.removeEventListener("abort", abort);
        if (!success) controller.abort();
        resolve(success);
      },
    };
    emit$1();
  });
}

export function subscribePromptPrefill(listener) {
  listeners$3.add(listener);
  return () => {
    listeners$3.delete(listener);
  };
}

export function getPromptPrefillRequest() {
  return pending$1?.request ?? null;
}

export function claimPromptPrefill(id2) {
  if (!pending$1 || pending$1.request.id !== id2 || pending$1.claimed)
    return false;
  pending$1.claimed = true;
  return true;
}

const listeners$2 = new Set();

const emit = () => {
  for (const listener of listeners$2) listener();
};

let nextId$1 = 0;

let pending = null;

export function completeRandomInspiration(id2, success) {
  if (pending?.id !== id2) return false;
  const request = pending;
  pending = null;
  request.finish(success);
  emit();
  return true;
}

export function requestRandomInspiration(signal, queryIds) {
  if (pending || signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const id2 = ++nextId$1;
    const abort = () => completeRandomInspiration(id2, false);
    const timeout2 = setTimeout(abort, 15e3);
    signal?.addEventListener("abort", abort, {
      once: true,
    });
    pending = {
      id: id2,
      queryIds: queryIds ? [...queryIds] : void 0,
      finish: (success) => {
        clearTimeout(timeout2);
        signal?.removeEventListener("abort", abort);
        resolve(success);
      },
    };
    emit();
  });
}

export function subscribeRandomInspiration(listener) {
  listeners$2.add(listener);
  return () => {
    listeners$2.delete(listener);
  };
}

export function getRandomInspirationRequest() {
  return pending?.id ?? null;
}

export function getRandomInspirationQueryIds(id2) {
  return pending?.id === id2 ? pending.queryIds : void 0;
}
