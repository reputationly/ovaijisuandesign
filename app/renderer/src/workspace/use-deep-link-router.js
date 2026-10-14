// use-deep-link-router.js
import { getRuntimeConfig } from "../infra/runtime-config.js";
import reactExports from "react";
import { useNavigate } from "@tanstack/react-router";
import { IPC_CHANNELS } from "../infra/gateway-http-error.jsx";

export function canUseDebugTooling() {
  try {
    const config = getRuntimeConfig();
    return (
      config.env === "development" ||
      config.env === "test" ||
      config.channel !== "prod"
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

function readFlag(key) {
  if (!canUseDebugTooling()) return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setDebugFlag(key, enabled) {
  if (!canUseDebugTooling()) return;
  try {
    if (enabled) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: {
        key,
      },
    }),
  );
}

export function useDebugFlag(key) {
  const [enabled, setEnabled] = reactExports.useState(() => readFlag(key));
  reactExports.useEffect(() => {
    const sync = () => setEnabled(readFlag(key));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);
  return enabled;
}

const SKILL_NAME_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;

function isValidSkillName(skillName) {
  return SKILL_NAME_PATTERN.test(skillName);
}

export function useDeepLinkRouter() {
  const [pendingInstall, setPendingInstall] = reactExports.useState(null);
  const [pendingTeamInvite, setPendingTeamInvite] = reactExports.useState(null);
  const processedRef = reactExports.useRef(new Set());
  reactExports.useEffect(() => {
    if (!window.hilo?.ipcRenderer) return;
    const dedupeTimers = new Set();
    const unsubscribe = window.hilo.ipcRenderer.on(
      IPC_CHANNELS.DEEPLINK_RECEIVED,
      (_event, ...args) => {
        const action = args[0];
        if (!action) return;
        if (action.action === "team/invite") {
          const { token } = action.params;
          if (!token) return;
          const region =
            action.params.region === "domestic" ||
            action.params.region === "overseas"
              ? action.params.region
              : void 0;
          const dedupeKey = `team-invite:${region ?? "runtime"}:${token}`;
          if (processedRef.current.has(dedupeKey)) return;
          processedRef.current.add(dedupeKey);
          const timer = window.setTimeout(() => {
            processedRef.current.delete(dedupeKey);
            dedupeTimers.delete(timer);
          }, 3e3);
          dedupeTimers.add(timer);
          setPendingTeamInvite({
            token,
            ...(region
              ? {
                  region,
                }
              : {}),
          });
          return;
        }
        if (action.action !== "skill/install") return;
        const { name: skillName, source } = action.params;
        if (!skillName || !isValidSkillName(skillName)) {
          return;
        }
        const dedupeKey = `${skillName}:${source || ""}`;
        if (processedRef.current.has(dedupeKey)) return;
        processedRef.current.add(dedupeKey);
        const timer = window.setTimeout(() => {
          processedRef.current.delete(dedupeKey);
          dedupeTimers.delete(timer);
        }, 3e3);
        dedupeTimers.add(timer);
        setPendingInstall({
          name: skillName,
          source,
        });
      },
    );
    return () => {
      unsubscribe();
      for (const timer of dedupeTimers) {
        window.clearTimeout(timer);
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

export function buildWorkspaceSearch(workspaceId, opts) {
  return {
    workspaceId: workspaceId || void 0,
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

export function resolveVisiblePreviewEntries(entries, references) {
  const byWorkspaceId = new Map(
    entries.map((entry) => [entry.workspaceId, entry]),
  );
  const byFolderPath = new Map(
    entries.map((entry) => [entry.folderPath, entry]),
  );
  const seen = new Set();
  const visible = [];
  for (const reference of references) {
    const entry =
      byWorkspaceId.get(reference.workspaceId) ??
      (reference.folderPath ? byFolderPath.get(reference.folderPath) : void 0);
    if (!entry || seen.has(entry.workspaceId)) continue;
    seen.add(entry.workspaceId);
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
    (workspaceId) => workspaceId !== hiddenWorkspaceId,
  );
  return remaining[Math.min(hiddenIndex, remaining.length - 1)] ?? null;
}
