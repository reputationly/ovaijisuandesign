// resolve-retry-message-payload.jsx
import { hasMessagePayload } from "../media-editing/package.jsx";
import { API_PATHS, reactExports, useStorage } from "../vendor.js";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { MascotLoadingAnimation } from "./mascot-loading-animation.jsx";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { OPEN_BROWSER_EVENT } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { SessionStore } from "../chat/session-store.js";
function WorkspaceLoadingDotField() {
  return (
    <div className="workspace-loading-dot-field" aria-hidden="true">
      <div className="workspace-loading-dot-layer workspace-loading-dot-layer-base" />
      <div className="workspace-loading-dot-layer workspace-loading-dot-layer-wave" />
    </div>
  );
}
export function CanvasLoadingState({ label, className }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex size-full items-center justify-center overflow-hidden bg-background",
        className,
      )}
      data-action-ui-id="canvas.restoring"
      role="status"
      aria-label={label}
    >
      <div className="relative z-10 flex flex-col items-center gap-4 text-muted-foreground">
        <div className="workspace-loading-mascot-anchor">
          <WorkspaceLoadingDotField />
          <MascotLoadingAnimation />
        </div>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
const SessionStoreContext = reactExports.createContext(null);
export function SessionStoreProvider({ children }) {
  const store = reactExports.useMemo(() => new SessionStore(), []);
  return (
    <SessionStoreContext.Provider value={store}>
      {children}
    </SessionStoreContext.Provider>
  );
}
export function useSessionStore() {
  const ctx = reactExports.useContext(SessionStoreContext);
  if (!ctx)
    throw new Error("useSessionStore must be used within SessionStoreProvider");
  return ctx;
}
export function subscribeAddEntityToCanvas(events, handlers) {
  return events.onAddEntityToCanvas(({ entityId, attachmentIds }) => {
    if (!handlers.isActiveRef.current) return;
    handlers.dropEntityById(entityId, void 0, attachmentIds);
  });
}
const DEFAULT_AGENT_MODE_PREFERENCE = "auto";
function resolveAgentModePreference(preference) {
  return preference === "ask" ? "ask" : DEFAULT_AGENT_MODE_PREFERENCE;
}
export function useAgentModePreference() {
  const [config, setConfig] = useStorage("global.config");
  const mode = resolveAgentModePreference(config.agentModePreference);
  const setMode = reactExports.useCallback(
    (nextMode) => {
      if (nextMode !== "auto" && nextMode !== "ask") return;
      setConfig((previous) => ({
        ...previous,
        agentModePreference: nextMode,
      }));
    },
    [setConfig],
  );
  return [mode, setMode];
}
export const BROWSER_SCREENSHOT_EVENT = "hilo:browser-screenshot";
export const BROWSER_FILE_EVENT = "hilo:browser-file";
export function dispatchBrowserScreenshotToChat(detail) {
  window.dispatchEvent(
    new CustomEvent(BROWSER_SCREENSHOT_EVENT, {
      detail,
    }),
  );
}
export function dispatchBrowserAnnotationToChat(dataUrl) {
  dispatchBrowserScreenshotToChat({
    dataUrl,
    annotated: true,
  });
}
export function dispatchBrowserPickedFileToChat(detail) {
  window.dispatchEvent(
    new CustomEvent(BROWSER_FILE_EVENT, {
      detail,
    }),
  );
}
let browserChatContext = {
  surface_open: false,
};
export function setBuiltinBrowserChatContext(context) {
  browserChatContext = {
    surface_open: context.surface_open,
    ...(context.active_tab
      ? {
          active_tab: {
            ...context.active_tab,
          },
        }
      : {}),
  };
}
function getBuiltinBrowserChatContext() {
  return {
    surface_open: browserChatContext.surface_open,
    ...(browserChatContext.active_tab
      ? {
          active_tab: {
            ...browserChatContext.active_tab,
          },
        }
      : {}),
  };
}
export function getBuiltinBrowserChatContextForSend() {
  const context = getBuiltinBrowserChatContext();
  return context.surface_open ? context : void 0;
}
function isWebUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
function canOpenInBuiltinBrowser(url) {
  return Boolean(window.hilo?.browser) && isWebUrl(url);
}
let pendingUrl = null;
export function takePendingBuiltinBrowserUrl() {
  const url = pendingUrl;
  pendingUrl = null;
  return url;
}
export async function openUrlInBuiltinBrowser(platform, url, options) {
  if (!canOpenInBuiltinBrowser(url)) {
    return openExternalUrl(platform, url, options);
  }
  pendingUrl = url;
  window.dispatchEvent(
    new CustomEvent(OPEN_BROWSER_EVENT, {
      detail: {
        url,
      },
    }),
  );
  return true;
}
export function useQueuedMessageScrollRequest(focusedSessionId) {
  const revisionRef = reactExports.useRef(0);
  const [sessionRequest, setSessionRequest] = reactExports.useState(null);
  const queuedUserMessageScrollRequest = reactExports.useMemo(() => {
    return sessionRequest?.sessionId === focusedSessionId
      ? sessionRequest
      : null;
  }, [focusedSessionId, sessionRequest]);
  const requestQueuedMessageScroll = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      revisionRef.current += 1;
      setSessionRequest({
        sessionId,
        revision: revisionRef.current,
        clientMessageId,
      });
    },
    [],
  );
  return {
    queuedUserMessageScrollRequest,
    requestQueuedMessageScroll,
  };
}
export function applyQueuedMessageScrollRequest(container, request) {
  const row = container.querySelector(
    `[data-queued-client-message-id="${CSS.escape(request.clientMessageId)}"]`,
  );
  if (!row) return;
  container.scrollTop = container.scrollHeight;
}
export function resolveRetryMessagePayload(messages, targetUserMessage) {
  const userMessage =
    targetUserMessage ??
    [...messages].reverse().find((message) => {
      return message.role === "user" && message.type === "text";
    });
  if (!userMessage) return void 0;
  const attachmentPaths = userMessage.attachments?.map(
    (attachment) => attachment.path,
  );
  if (
    !hasMessagePayload(
      userMessage.content,
      attachmentPaths,
      void 0,
      void 0,
      userMessage.pluginNodeAttachments,
    )
  ) {
    return void 0;
  }
  return {
    text: userMessage.content,
    attachmentPaths,
    pluginNodeAttachments: userMessage.pluginNodeAttachments,
  };
}
export const DRAFT_NEW_TAB = "__new_tab__";
export function equalStringSets(leftSet, rightSet) {
  if (leftSet.size !== rightSet.size) return false;
  for (const value of leftSet) {
    if (!rightSet.has(value)) return false;
  }
  return true;
}
export function chatAttachmentsFromPaths(attachments, attachmentRefs) {
  if (!attachments?.length) return void 0;
  const refsByPath = new Map(attachmentRefs?.map((ref) => [ref.path, ref]));
  return attachments.map((path) => {
    const ref = refsByPath.get(path);
    return {
      path,
      url: API_PATHS.serveFile(path),
      // Unknown extensions use a generic file chip instead of a broken image.
      type: detectFileType(path) ?? "file",
      ...(ref
        ? {
            attachment_source: ref.attachment_source,
            attachment_id: ref.attachment_id,
          }
        : {}),
    };
  });
}
