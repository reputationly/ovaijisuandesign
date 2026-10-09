// use-browser-video-download.jsx
import { useTranslation, reactExports, useNavigate, dedupedToast, API_PATHS } from "../vendor.js";
import { buildWorkspaceSearch } from "../m15/create-visible-preview-tabs-store.js";
import { workflowSourceFromId } from "../m15/parse-timeline-operations.js";
import { TRACK_EVENTS } from "../m15/track-events.js";
import { useGatewayScopeKey, useGatewayFetch, useGatewayReady$1 } from "../m15/use-resizable-width.js";
import { MOCK_MEDIA_GEN_MESSAGES } from "../m13/history-anchor-rail-impl.jsx";
import { useWorkspaceChatSelector } from "../m12/use-asset-picker-host.jsx";
import { useSessionStore } from "../m11/use-workspace-canvas-persistence.jsx";
import { downloadBrowserVideo, dispatchBrowserVideoToChat } from "../m13/session-tab-strip.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { instantiatePluginOnCanvas } from "../m12/use-txt2-text.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function parseMockToolArgs(raw2) {
  if (!raw2) return {};
  try {
    const parsed = JSON.parse(raw2);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
const MOCK_ENUM_HINTS = {
  // capability dispatcher (post MR-1849) — vendor + model_id are top-level enums
  vendor: ["banana", "gpt-image", "seedream", "midjourney", "kling", "seedance", "MiniMax", "veo3"],
  model_id: [
    "nano_banana_2_flash",
    "nano_banana_2",
    "gpt-image-2",
    "doubao-seedream-5-0-pro-260628",
    "kling-v3-omni",
    "seedance2.0",
    "seedance2.0-fast",
    "seedance2.0-mini",
    "seedance2.5",
    "MiniMax-H3",
    "veo-3.1-fast-generate-001",
  ],
  model_name: [
    "banana_2",
    "banana_pro",
    "seedance2.0",
    "MiniMax-H3",
    "kling-v3-omni",
    "speech-2.8-hd",
  ],
  model: ["doubao-seedream-5-0-pro-260628", "veo-3.1-fast-generate-001", "banana_2", "banana_pro"],
  aspect_ratio: ["1:1", "16:9", "9:16", "3:2", "3:4", "4:3", "21:9"],
  aspect_ratios: ["1:1", "16:9", "9:16", "3:2", "3:4", "4:3"],
  ratio: ["adaptive", "1:1", "16:9", "9:16", "3:2", "3:4", "4:3", "21:9"],
  resolution: ["480p", "720p", "768P", "1080P", "2160P", "4k", "1K", "2K", "1k", "2k"],
  duration: ["5", "6", "8", "10"],
  durations: ["5", "6", "8", "10"],
  mode: ["std", "pro", "4k"],
  sound: ["on", "off"],
  scale_mode: ["first", "fit", "fill", "custom"],
  replace_existing: ["true", "false"],
  emotion: ["happy", "calm", "sad", "angry", "fearful", "disgusted", "surprised"],
  emotions: ["happy", "calm", "sad", "angry", "fearful", "disgusted", "surprised"],
};
function uniqueStrings(values3, current2) {
  const next2 = new Set();
  const add2 = (value) => {
    if (value == null || value === "") return;
    next2.add(String(value));
  };
  if (Array.isArray(current2)) {
    for (const item of current2) add2(item);
  } else {
    add2(current2);
  }
  for (const value of values3) next2.add(value);
  return [...next2];
}
function mockParamHintsForArgs(args) {
  const hints = {};
  const visit2 = (entries2) => {
    for (const [key2, value] of Object.entries(entries2)) {
      if (key2 === "vendor_params" && value && typeof value === "object" && !Array.isArray(value)) {
        visit2(value);
        continue;
      }
      const enumValues = MOCK_ENUM_HINTS[key2];
      if (enumValues) {
        hints[key2] = {
          type: "enum",
          values: uniqueStrings(enumValues, value),
        };
      } else if (key2 === "count" || key2 === "n" || key2 === "concurrency") {
        hints[key2] = {
          type: "range",
          min: 1,
          max: 5,
        };
      } else if (key2 === "speed" || key2 === "speeds") {
        hints[key2] = {
          type: "range",
          min: 0.5,
          max: 2,
        };
      }
    }
  };
  visit2(args);
  return hints;
}
function mockToolConfirmSources() {
  return MOCK_MEDIA_GEN_MESSAGES.flatMap((message2) => {
    if (message2.type !== "tool" || !message2.toolName) return [];
    const args = parseMockToolArgs(message2.toolArgs);
    return [
      {
        id: message2.id,
        tool: message2.toolName,
        args,
        label: message2.toolName,
        paramHints: mockParamHintsForArgs(args),
        toolMessage: message2,
      },
    ];
  });
}
export function DevToolConfirmTrigger({ sessionStore, focusedSessionId }) {
  const sources = reactExports.useMemo(() => mockToolConfirmSources(), []);
  const [selectedId, setSelectedId] = reactExports.useState(() => sources[0]?.id ?? "");
  const selected2 = sources.find((source) => source.id === selectedId) ?? sources[0];
  const inject = reactExports.useCallback(() => {
    const sid = focusedSessionId;
    if (!sid || !selected2) return;
    const now2 = Date.now();
    const toolId = `dev-tool-${now2}`;
    const confirmId = `dev-confirm-${now2}`;
    const toolMsg = {
      ...selected2.toolMessage,
      id: toolId,
      role: "agent",
      type: "tool",
      content: selected2.tool,
      toolName: selected2.tool,
      toolStatus: "pending",
      toolArgs: JSON.stringify(selected2.args),
      toolResult: void 0,
    };
    const confirmMsg = {
      id: confirmId,
      role: "agent",
      type: "tool_confirm_ask",
      content: "",
      requestId: confirmId,
      resolved: false,
      toolConfirmData: {
        tool: selected2.tool,
        args: selected2.args,
        paramHints: selected2.paramHints,
      },
    };
    sessionStore.updateMessages(sid, (prev) => [...prev, toolMsg, confirmMsg]);
  }, [focusedSessionId, selected2, sessionStore]);
  return (
    <div className="mx-4 mb-1 flex items-center gap-1">
      <select
        value={selected2?.id ?? ""}
        onChange={(e2) => setSelectedId(e2.target.value)}
        className="h-5 max-w-72 min-w-0 flex-1 rounded-sm border border-dashed border-border bg-background px-1.5 font-mono text-caption-10 text-muted-foreground"
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={inject}
        disabled={!focusedSessionId || !selected2}
        className="shrink-0 cursor-pointer rounded-sm border border-dashed border-border px-1.5 py-0.5 text-caption-10 text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-50"
      >
        Inject confirm
      </button>
      <span className="text-caption-10 text-muted-foreground/60">
        {sources.length}
        {" mocks"}
      </span>
    </div>
  );
}
function trackComfyUiEvent(event, properties2) {
  try {
    trackEvent(event, properties2);
  } catch {}
}
export function trackComfyUiWorkflowCatalogAction(surface, action, workflowId) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_CATALOG_ACTION, {
    surface,
    action,
    ...(workflowId
      ? {
          workflow_source: workflowSourceFromId(workflowId),
        }
      : {}),
  });
}
export function trackComfyUiWorkflowInstall(surface, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_INSTALL, {
    surface,
    workflow_source: "template",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
export function trackComfyUiWorkflowInstallFailed(surface, startedAt, stage) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_INSTALL_FAILED, {
    surface,
    workflow_source: "template",
    stage,
    error_type: "business",
    error_code: stage,
    error_message: "ComfyUI workflow installation failed",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
function trackComfyUiWorkflowOpen(workflowSource, target, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_OPEN, {
    entry_point: "workspace_pending",
    workflow_source: workflowSource,
    target,
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
function trackComfyUiWorkflowOpenFailed(workflowSource, target, startedAt) {
  trackComfyUiEvent(TRACK_EVENTS.COMFYUI_WORKFLOW_OPEN_FAILED, {
    entry_point: "workspace_pending",
    workflow_source: workflowSource,
    target,
    error_type: "business",
    error_code: "workflow_open_failed",
    error_message: "ComfyUI workflow could not be opened",
    duration_ms: Math.max(0, Date.now() - startedAt),
  });
}
export function PendingComfyUiWorkflowOpener({
  workflowId,
  target = "new",
  workspaceId: workspaceId2,
  isActive: isActive2,
}) {
  const { t: t2 } = useTranslation();
  const navigate = useNavigate();
  const gatewayFetch2 = useGatewayFetch();
  const connected = useWorkspaceChatSelector((chat) => chat.connected);
  const sessionId = useWorkspaceChatSelector((chat) => chat.focusedSessionId);
  const openingRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!workflowId) {
      openingRef.current = null;
      return;
    }
    if (!isActive2 || !connected) return;
    const requestKey = `${workspaceId2}:${workflowId}:${target}`;
    if (openingRef.current === requestKey) return;
    openingRef.current = requestKey;
    const startedAt = Date.now();
    const workflowSource = workflowSourceFromId(workflowId);
    const clearPendingIntent = () =>
      navigate({
        to: "/workspace",
        replace: true,
        search: buildWorkspaceSearch(workspaceId2),
      });
    void gatewayFetch2(API_PATHS.comfyUiWorkflowOpen(workflowId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(sessionId
          ? {
              session_id: sessionId,
            }
          : {}),
        target,
        open_editor: false,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = parseOpenWorkflowResult(await response.json());
        if (result.status !== "opened") throw new Error(result.error || result.status);
        trackComfyUiWorkflowOpen(workflowSource, target, startedAt);
        dedupedToast.success(t2("workflows.addedToCanvas"));
      })
      .catch((error) => {
        trackComfyUiWorkflowOpenFailed(workflowSource, target, startedAt);
        dedupedToast.error(
          t2("workflows.addFailed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      })
      .finally(clearPendingIntent);
  }, [
    connected,
    gatewayFetch2,
    isActive2,
    navigate,
    sessionId,
    t2,
    workflowId,
    workspaceId2,
    target,
  ]);
  return null;
}
function parseOpenWorkflowResult(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid ComfyUI response");
  const record2 = value;
  if (typeof record2.status !== "string") throw new Error("Invalid ComfyUI response");
  return {
    status: record2.status,
    ...(typeof record2.error === "string"
      ? {
          error: record2.error,
        }
      : {}),
  };
}
export function PluginInstantiator({ pluginId, workspaceId: workspaceId2, folderPath }) {
  const navigate = useNavigate();
  const scopedFetch = useGatewayFetch();
  const gatewayReady = useGatewayReady$1();
  const { t: t2 } = useTranslation();
  const applied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (applied.current || !pluginId || !gatewayReady) return;
    applied.current = true;
    const clearSearch = () =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
          pluginId: void 0,
        }),
        replace: true,
      });
    void instantiatePluginOnCanvas(
      {
        pluginId,
      },
      {
        currentWorkspace: folderPath,
        gatewayFetch: scopedFetch,
        t: t2,
      },
    ).finally(clearSearch);
  }, [folderPath, gatewayReady, navigate, pluginId, scopedFetch, t2, workspaceId2]);
  return null;
}
export function useRetainInactiveWorkspaceContent(isActive2) {
  return true;
}
export function RetainedHeavyContent({ isActive: isActive2, children: children2 }) {
  return <div className={isActive2 ? "contents" : "hidden"}>{children2}</div>;
}
export function useBrowserVideoDownload(isActive2) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  const sessionStore = useSessionStore();
  const { t: t2 } = useTranslation();
  const current2 = reactExports.useRef({
    gatewayFetch: gatewayFetch2,
    scopeKey,
    sessionStore,
    t: t2,
    isActive: isActive2,
  });
  current2.current = {
    gatewayFetch: gatewayFetch2,
    scopeKey,
    sessionStore,
    t: t2,
    isActive: isActive2,
  };
  const browser2 = window.hilo?.browser;
  reactExports.useEffect(() => {
    if (!browser2?.onPluginEvent || !browser2.completeVideoDownload) return;
    let active2 = true;
    const stop = browser2.onPluginEvent((request) => {
      if (request.type !== "video-download-requested" || !current2.current.isActive) return;
      const origin = current2.current;
      const sessionId = origin.sessionStore.getState().focusedSessionId;
      void (async () => {
        let downloaded = false;
        try {
          const asset = await downloadBrowserVideo(request, origin.gatewayFetch);
          downloaded = true;
          if (
            request.action === "chat" &&
            (!active2 || current2.current.scopeKey !== origin.scopeKey)
          )
            throw new Error("Originating workspace is no longer mounted");
          if (
            request.action === "chat" &&
            origin.sessionStore.getState().focusedSessionId !== sessionId
          )
            throw new Error("Originating chat is no longer focused");
          if (
            request.action === "chat" &&
            !dispatchBrowserVideoToChat(asset, origin.scopeKey, sessionId)
          )
            throw new Error("Chat could not accept the downloaded video");
          if (
            request.action === "canvas" &&
            active2 &&
            current2.current.isActive &&
            current2.current.scopeKey === origin.scopeKey
          )
            dedupedToast.success(current2.current.t("workspace.browser.pluginAddedToCanvas"));
          await browser2.completeVideoDownload({
            requestId: request.requestId,
            ok: true,
          });
        } catch (error) {
          void window.hilo?.logger
            ?.warn(
              `[browser-video] ${error instanceof Error ? error.message : String(error)}`,
              "browser-video",
            )
            .catch(() => {});
          await browser2.completeVideoDownload({
            requestId: request.requestId,
            ok: false,
            error: downloaded
              ? current2.current.t(
                  "workspace.browser.videoAttachmentFailed",
                  "视频已保存到项目，但未能添加到对话。请从项目素材中重新添加。",
                )
              : current2.current.t(
                  "workspace.browser.videoDownloadFailed",
                  "无法下载此视频，请确认视频可以公开访问后重试。",
                ),
          });
        }
      })().catch(() => {});
    });
    return () => {
      active2 = false;
      stop();
    };
  }, [browser2]);
}
function bookmarkUrlIdentity(url2) {
  try {
    return new URL(url2).href;
  } catch {
    return url2;
  }
}
function bookmarkContentIdentity(bookmark) {
  return JSON.stringify([bookmarkUrlIdentity(bookmark.url), bookmark.folders, bookmark.title]);
}
export function mergeBrowserBookmarks(current2, incoming) {
  const bookmarks = [...current2];
  const ids2 = new Set(current2.map((bookmark) => bookmark.id));
  const identities = new Set(current2.map(bookmarkContentIdentity));
  const manualUrls = new Set(
    current2
      .filter((bookmark) => bookmark.id.startsWith("manual-"))
      .map((bookmark) => bookmarkUrlIdentity(bookmark.url)),
  );
  for (const bookmark of incoming) {
    const identity2 = bookmarkContentIdentity(bookmark);
    if (
      ids2.has(bookmark.id) ||
      identities.has(identity2) ||
      manualUrls.has(bookmarkUrlIdentity(bookmark.url))
    )
      continue;
    bookmarks.push(bookmark);
    ids2.add(bookmark.id);
    identities.add(identity2);
  }
  return {
    bookmarks,
    addedCount: bookmarks.length - current2.length,
  };
}
export function groupBrowserBookmarks(bookmarks) {
  const groups = new Map();
  for (const bookmark of bookmarks) {
    const folders = Array.isArray(bookmark.folders)
      ? bookmark.folders.filter((folder) => typeof folder === "string" && folder.trim().length > 0)
      : [];
    const id2 = JSON.stringify(folders);
    let group = groups.get(id2);
    if (!group) {
      group = {
        id: id2,
        folders,
        bookmarks: [],
      };
      groups.set(id2, group);
    }
    group.bookmarks.push(bookmark);
  }
  return [...groups.values()];
}
export const ANNOTATION_STROKE = "#6D6CFF";
export const ANNOTATION_FILL = "transparent";
export const TAG_BACKGROUND = "#E9E8FF";
export const TAG_TEXT_COLOR = "#4542B8";
export const MIN_RECTANGLE_SIZE = 8;
export const ANNOTATION_STROKE_WIDTH = 5;
export const DEFAULT_IMAGE_SIZE = {
  width: 1200,
  height: 800,
};
