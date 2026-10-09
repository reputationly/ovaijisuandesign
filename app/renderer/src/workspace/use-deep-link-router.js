// use-deep-link-router.js
import { getRuntimeConfig, reactExports, useNavigate } from "../vendor.js";
import { IPC_CHANNELS } from "../infra/gateway-http-error.jsx";

export function canUseDebugTooling() {
  try {
    const config2 = getRuntimeConfig();
    return (
      config2.env === "development" ||
      config2.env === "test" ||
      config2.channel !== "prod"
    );
  } catch {
    return false;
  }
}

const EVENT = "hilo:debug-flag-changed";

export const DEBUG_FLAGS = {
  /**
   * Developer raw view. Two effects when on:
   *   1. Expand Input/Output detail for ALL timeline items, not just media gen.
   *   2. Stop filtering `silent` tools (todowrite / memory / dag / upload /
   *      any unmatched), so deliberately-hidden tool calls render in the
   *      timeline with their raw name + Input/Output. See `filterSilentTools`.
   */
  rawToolView: "hilo.debug.rawToolView",
  /** Prepend mock media-gen tool messages to the current session for visual testing. */
  mockMediaGen: "hilo.debug.mockMediaGen",
  /** Show a mock ToolConfirm injector backed by media-gen fixtures. */
  mockToolConfirm: "hilo.debug.mockToolConfirm",
  /** Force the observe-only offline banner for QA / support reproduction. */
  forceOfflineBanner: "hilo.debug.forceOfflineBanner",
  /** Enable the react-scan render-highlighting overlay (dev-only perf debugging). */
  reactScan: "hilo.debug.reactScan",
  /** Mount the tracking recorder overlay and subscribe to live analytics events. */
  trackingRecorder: "hilo.debug.trackingRecorder",
  /**
   * Inflate history rail to 80 turns for visual QA of compressed mode (turn > 40).
   * 仅影响 rail 自身 (turns 描述符), 不污染真实 messages.
   */
  mockHistoryRail: "hilo.debug.mockHistoryRail",
};

function readFlag(key2) {
  if (!canUseDebugTooling()) return false;
  try {
    return localStorage.getItem(key2) === "1";
  } catch {
    return false;
  }
}

export function setDebugFlag(key2, enabled) {
  if (!canUseDebugTooling()) return;
  try {
    if (enabled) localStorage.setItem(key2, "1");
    else localStorage.removeItem(key2);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: {
        key: key2,
      },
    }),
  );
}

export function useDebugFlag(key2) {
  const [enabled, setEnabled] = reactExports.useState(() => readFlag(key2));
  reactExports.useEffect(() => {
    const sync = () => setEnabled(readFlag(key2));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key2]);
  return enabled;
}

const SKILL_NAME_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;

function isValidSkillName(name2) {
  return SKILL_NAME_PATTERN.test(name2);
}

export function useDeepLinkRouter() {
  const [pendingInstall, setPendingInstall] = reactExports.useState(null);
  const [pendingTeamInvite, setPendingTeamInvite] = reactExports.useState(null);
  const processedRef = reactExports.useRef(new Set());
  reactExports.useEffect(() => {
    if (!window.hilo?.ipcRenderer) return;
    const dedupeTimers = new Set();
    const off = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.DEEPLINK_RECEIVED,
      (_event, ...args) => {
        const action = args[0];
        if (!action) return;
        if (action.action === "team/invite") {
          const { token: token2 } = action.params;
          if (!token2) return;
          const region =
            action.params.region === "domestic" ||
            action.params.region === "overseas"
              ? action.params.region
              : void 0;
          const dedupeKey2 = `team-invite:${region ?? "runtime"}:${token2}`;
          if (processedRef.current.has(dedupeKey2)) return;
          processedRef.current.add(dedupeKey2);
          const timer22 = window.setTimeout(() => {
            processedRef.current.delete(dedupeKey2);
            dedupeTimers.delete(timer22);
          }, 3e3);
          dedupeTimers.add(timer22);
          setPendingTeamInvite({
            token: token2,
            ...(region
              ? {
                  region,
                }
              : {}),
          });
          return;
        }
        if (action.action !== "skill/install") return;
        const { name: name2, source } = action.params;
        if (!name2 || !isValidSkillName(name2)) {
          return;
        }
        const dedupeKey = `${name2}:${source || ""}`;
        if (processedRef.current.has(dedupeKey)) return;
        processedRef.current.add(dedupeKey);
        const timer2 = window.setTimeout(() => {
          processedRef.current.delete(dedupeKey);
          dedupeTimers.delete(timer2);
        }, 3e3);
        dedupeTimers.add(timer2);
        setPendingInstall({
          name: name2,
          source,
        });
      },
    );
    return () => {
      off();
      for (const timer2 of dedupeTimers) {
        window.clearTimeout(timer2);
      }
      dedupeTimers.clear();
    };
  }, []);
  const dismiss = reactExports.useCallback(() => setPendingInstall(null), []);
  const dismissTeamInvite = reactExports.useCallback(
    () => setPendingTeamInvite(null),
    [],
  );
  return {
    pendingInstall,
    dismiss,
    pendingTeamInvite,
    dismissTeamInvite,
  };
}

export function buildWorkspaceSearch(workspaceId2, opts) {
  return {
    workspaceId: workspaceId2 || void 0,
    initialPayloadId: opts?.initialPayloadId,
    initialMessage: opts?.initialMessage,
    initialAttachments: opts?.initialAttachments,
    initialEntityRefs: opts?.initialEntityRefs,
    initialModelId: opts?.initialModelId,
    initialSelectedMediaModels: opts?.initialSelectedMediaModels,
    skillPrompt: opts?.skillPrompt,
    skillName: opts?.skillName,
    pluginId: opts?.pluginId,
    initialComfyUiWorkflowId: opts?.initialComfyUiWorkflowId,
    initialComfyUiWorkflowTarget: opts?.initialComfyUiWorkflowTarget,
    menuAction: opts?.menuAction,
    assetCenterRelocation: opts?.assetCenterRelocation || void 0,
  };
}

export function useNavigateToWorkspace() {
  const navigate = useNavigate();
  return reactExports.useCallback(
    (runtime, opts) => {
      return navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(runtime.workspaceId, opts),
      });
    },
    [navigate],
  );
}

export function resolveVisiblePreviewEntries(entries2, references) {
  const byWorkspaceId = new Map(
    entries2.map((entry) => [entry.workspaceId, entry]),
  );
  const byFolderPath = new Map(
    entries2.map((entry) => [entry.folderPath, entry]),
  );
  const seen2 = new Set();
  const visible = [];
  for (const reference of references) {
    const entry =
      byWorkspaceId.get(reference.workspaceId) ??
      (reference.folderPath ? byFolderPath.get(reference.folderPath) : void 0);
    if (!entry || seen2.has(entry.workspaceId)) continue;
    seen2.add(entry.workspaceId);
    visible.push(entry);
  }
  return visible;
}

export function getNextPreviewTabIdAfterHide(
  orderedWorkspaceIds,
  hiddenWorkspaceId,
) {
  const hiddenIndex = orderedWorkspaceIds.indexOf(hiddenWorkspaceId);
  if (hiddenIndex === -1) return null;
  const remaining = orderedWorkspaceIds.filter(
    (id2) => id2 !== hiddenWorkspaceId,
  );
  return remaining[Math.min(hiddenIndex, remaining.length - 1)] ?? null;
}
