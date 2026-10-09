// interest-selection-provider.jsx
import {
  jsxRuntimeExports,
  reactExports,
  API_PATHS,
  useStorage,
  SPECIAL_CONNECTORS,
  hcpToDefinition,
  findHcpConnector,
  buildOfficialConnectorList,
  namesMatch,
  useTranslation,
  sanitize,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayFetch } from "../infra/agent-ws-client.jsx";
import { useAuth, useIsScrolling } from "../assets/apply-asset-change.jsx";
import { canUseDebugTooling } from "../workspace/create-visible-preview-tabs-store.js";
import {
  DEFAULT_HOME_WIDGET_CONFIG,
  DEFAULT_UPDATE_WIDGET_CONFIG,
  HOME_WIDGET_KINDS,
  TOOL_LABEL_DEFINITIONS$1,
} from "../workspace/deferred-thumbnail-image-generation.jsx";
import { parseVideoStarterPresets } from "../media-editing/parse-item.jsx";
import {
  BLOCKING_MODAL_IDS,
  DEFAULT_MODAL_SCHEDULE_CONFIG,
  STARTUP_MODAL_IDS,
  parseStartupModalSchedule,
  useLoginGate,
  useModalSlot,
} from "../infra/thumbnail-load-scheduler.jsx";
import { getPlatform } from "../infra/track-events.js";
import { useBlockingModalPresence } from "../workspace/use-hub-logo-hover-animation.jsx";
export const EMPTY_TOOL_CALL_DISPLAY_CONFIG = {
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
    Object.entries(parseToolDisplayPatterns("labelIds" in value ? value.labelIds : void 0)).filter(
      ([label]) => Object.hasOwn(TOOL_LABEL_DEFINITIONS$1, label),
    ),
  );
  return {
    displayLabels,
    labelIds,
  };
}
export function compileToolDisplayPatterns(rules) {
  return Object.entries(rules).map(([label, patterns]) => ({
    label,
    patterns: patterns.map((pattern) => new RegExp(pattern)),
  }));
}
let configuredDisplayLabels = compileToolDisplayPatterns(
  EMPTY_TOOL_CALL_DISPLAY_CONFIG.displayLabels,
);
export function getConfiguredToolDisplayLabel(toolName2) {
  return configuredDisplayLabels.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(toolName2)),
  )?.label;
}
let toolCallDisplayConfigKey = JSON.stringify(EMPTY_TOOL_CALL_DISPLAY_CONFIG);
let configuredLabelIds = compileToolDisplayPatterns(EMPTY_TOOL_CALL_DISPLAY_CONFIG.labelIds);
function setToolCallDisplayConfig(value) {
  const next2 = parseToolCallDisplayConfig(value);
  const key2 = JSON.stringify(next2);
  if (key2 === toolCallDisplayConfigKey) return;
  toolCallDisplayConfigKey = key2;
  configuredDisplayLabels = compileToolDisplayPatterns(next2.displayLabels);
  configuredLabelIds = compileToolDisplayPatterns(next2.labelIds);
}
export async function refreshToolCallDisplayConfig() {
  try {
    const response = await gatewayFetch(API_PATHS.apolloConfig("tool_call_display_config"));
    if (!response.ok) return;
    const raw2 = await response.json();
    setToolCallDisplayConfig(raw2);
  } catch {}
}
export function getConfiguredToolLabelId(toolName2) {
  return configuredLabelIds.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(toolName2)),
  )?.label;
}
export const DEFAULT_HUB_CLIENT_CONFIG = {
  whatsNewEnabled: true,
  videoStarterPresets: [],
  startupModalSchedule: DEFAULT_MODAL_SCHEDULE_CONFIG,
  homeWidget: DEFAULT_HOME_WIDGET_CONFIG,
  updateWidget: DEFAULT_UPDATE_WIDGET_CONFIG,
};
export const HUB_CLIENT_CONFIG_REFRESH_INTERVAL_MS = 6e4;
function isRecord$b(value) {
  return typeof value === "object" && value !== null;
}
function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function localizedText(value, locale) {
  if (typeof value === "string") return value.trim();
  if (!isRecord$b(value)) return "";
  const keys2 = locale === "zh" ? ["zh-Hans", "zh", "en"] : ["en", "en-US", "zh-Hans", "zh"];
  for (const key2 of keys2) {
    const candidate = value[key2];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}
function plainText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function parseHomeSurvey(value) {
  if (!isRecord$b(value) || value.enabled !== true) return null;
  const id2 = plainText(value.id);
  const imageUrl = safeHttpsUrl(value.image_url);
  const title = plainText(value.title);
  const description = plainText(value.description);
  const cta = isRecord$b(value.cta) ? value.cta : null;
  const ctaLabel = plainText(cta?.label);
  const ctaUrl = safeHttpsUrl(cta?.url);
  if (!id2 || !imageUrl || !title || !description || !ctaLabel || !ctaUrl) return null;
  const bullets = Array.isArray(value.bullets)
    ? value.bullets
        .map(plainText)
        .filter((bullet) => bullet.length > 0)
        .slice(0, 5)
    : [];
  const configuredCooldown = value.cooldown_ms;
  const cooldownMs =
    typeof configuredCooldown === "number" && Number.isFinite(configuredCooldown)
      ? Math.min(Math.max(0, configuredCooldown), 30 * 24 * 60 * 60 * 1e3)
      : 7 * 24 * 60 * 60 * 1e3;
  return {
    id: id2,
    imageUrl,
    title,
    description,
    bullets,
    ctaLabel,
    ctaUrl,
    dismissible: value.dismissible !== false,
    cooldownMs,
  };
}
function parseUpdateWidget(value, locale) {
  if (!isRecord$b(value)) return DEFAULT_UPDATE_WIDGET_CONFIG;
  const imageUrl = safeHttpsUrl(localizedText(value.image_url, locale));
  return value.enabled === false
    ? {
        enabled: false,
        imageUrl,
      }
    : {
        imageUrl,
      };
}
function parseHomeWidget(value) {
  if (!isRecord$b(value)) return DEFAULT_HOME_WIDGET_CONFIG;
  const legacyOrder = Array.isArray(value.order)
    ? value.order.filter((kind) => typeof kind === "string" && HOME_WIDGET_KINDS.includes(kind))
    : void 0;
  return {
    enabled: value.enabled !== false,
    survey: parseHomeSurvey(value.survey),
    ...(legacyOrder && legacyOrder.length > 0
      ? {
          order: [...new Set(legacyOrder)],
        }
      : {}),
  };
}
export function mapHubClientConfig(raw2, locale) {
  if (!isRecord$b(raw2)) return DEFAULT_HUB_CLIENT_CONFIG;
  const cfg = raw2;
  const whatsNew = cfg.whats_new;
  const whatsNewEnabled =
    whatsNew && typeof whatsNew === "object" && "enabled" in whatsNew
      ? whatsNew.enabled !== false
      : DEFAULT_HUB_CLIENT_CONFIG.whatsNewEnabled;
  return {
    whatsNewEnabled,
    videoStarterPresets: parseVideoStarterPresets(cfg.video_starter_presets, locale),
    startupModalSchedule: parseStartupModalSchedule(cfg.startup_modal_schedule),
    homeWidget: parseHomeWidget(cfg.home_widget),
    updateWidget: parseUpdateWidget(cfg.update_widget, locale),
  };
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
  return buildOfficialConnectorList().find((connector) => connector.matches(server));
}
export function findOfficialConnectorByServerName(serverName) {
  return buildOfficialConnectorList().find((connector) =>
    namesMatch(connector.serverName, serverName),
  );
}
const DebugPanelDialog = reactExports.lazy(() =>
  (() => import("../DebugPanelDialog-C7RBwCiN.js"))(),
);
export const DEBUG_PANEL_OPEN_EVENT = "hub:debug-panel-open";
function canUseDebugPanel() {
  return canUseDebugTooling();
}
export function DebugPanelProvider({ children: children2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const isEnabled = canUseDebugPanel();
  reactExports.useEffect(() => {
    if (!isEnabled) return;
    const onOpenDebugPanel = () => setOpen(true);
    const onKeyDown = (event) => {
      if (event.key !== ";") return;
      if (event.altKey || event.shiftKey) return;
      const isMac2 =
        typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const primary = isMac2 ? event.metaKey : event.ctrlKey;
      const otherModifier = isMac2 ? event.ctrlKey : event.metaKey;
      if (!primary || otherModifier) return;
      event.preventDefault();
      setOpen((v2) => !v2);
    };
    window.addEventListener(DEBUG_PANEL_OPEN_EVENT, onOpenDebugPanel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(DEBUG_PANEL_OPEN_EVENT, onOpenDebugPanel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isEnabled]);
  if (!isEnabled) return <>{children2}</>;
  return (
    <>
      {children2}
      <reactExports.Suspense fallback={null}>
        <DebugPanelDialog open={open} onOpenChange={setOpen} />
      </reactExports.Suspense>
    </>
  );
}
const InterestSelectionContext = reactExports.createContext(null);
export function InterestSelectionProvider({ children: children2 }) {
  const { isLoggedIn } = useAuth();
  const loginGate = useLoginGate();
  const [
    hasSelectedInterests,
    setHasSelectedInterests,
    setHasSelectedInterestsAsync,
    hasSelectedInterestsHydrated,
  ] = useStorage("global.hasSelectedInterests");
  const [, , setSelectedInterestsAsync] = useStorage("global.selectedInterests");
  const [forcedOpen, setForcedOpen] = reactExports.useState(false);
  const [selected2, setSelected] = reactExports.useState([]);
  const autoCandidate =
    isLoggedIn &&
    hasSelectedInterestsHydrated &&
    hasSelectedInterests !== true &&
    !loginGate.isOpen;
  const granted = useModalSlot(STARTUP_MODAL_IDS.interestSelection, {
    candidate: autoCandidate,
  });
  const isOpen = (granted && autoCandidate) || forcedOpen;
  useBlockingModalPresence(BLOCKING_MODAL_IDS.interestSelection, isOpen);
  const toggle = reactExports.useCallback((key2) => {
    setSelected((prev) => {
      if (prev.includes(key2)) return prev.filter((k2) => k2 !== key2);
      if (prev.length >= 3) return prev;
      return [...prev, key2];
    });
  }, []);
  const forceOpen = reactExports.useCallback(() => {
    setSelected([]);
    setHasSelectedInterests(false);
    setForcedOpen(true);
  }, [setHasSelectedInterests]);
  const complete = reactExports.useCallback(async () => {
    await Promise.all([setHasSelectedInterestsAsync(true), setSelectedInterestsAsync(selected2)]);
    setForcedOpen(false);
  }, [selected2, setHasSelectedInterestsAsync, setSelectedInterestsAsync]);
  const value = reactExports.useMemo(
    () => ({
      isOpen,
      selected: selected2,
      toggle,
      forceOpen,
      complete,
    }),
    [isOpen, selected2, toggle, forceOpen, complete],
  );
  return (
    <InterestSelectionContext.Provider value={value}>{children2}</InterestSelectionContext.Provider>
  );
}
export function useInterestSelection() {
  const ctx = reactExports.useContext(InterestSelectionContext);
  if (!ctx) {
    throw new Error("useInterestSelection must be used within <InterestSelectionProvider>");
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
let nextId$2 = 0;
let pending$1 = null;
const listeners$3 = new Set();
const emit$1 = () => {
  for (const listener of listeners$3) listener();
};
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
  if (!pending$1 || pending$1.request.id !== id2 || pending$1.claimed) return false;
  pending$1.claimed = true;
  return true;
}
export function completePromptPrefill(id2, success) {
  if (pending$1?.request.id !== id2) return false;
  const current2 = pending$1;
  pending$1 = null;
  current2.finish(success);
  emit$1();
  return true;
}
export function requestPromptPrefill(payload, signal) {
  if (pending$1 || signal?.aborted || !payload.prompt.trim() || !payload.modelId.trim()) {
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
let nextId$1 = 0;
let pending = null;
const listeners$2 = new Set();
const emit = () => {
  for (const listener of listeners$2) listener();
};
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
