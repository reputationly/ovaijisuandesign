// use-browser-chat-media.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  API_PATHS,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  BROWSER_FILE_EVENT,
  BROWSER_SCREENSHOT_EVENT,
} from "../workspace/resolve-retry-message-payload.jsx";
import { fetchSceneAttachments } from "../generation/read-bounded-blob.js";
import { TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX } from "./handle-session-created-response.js";

const WorkspacePaneReorderContext = reactExports.createContext(null);

export function WorkspacePaneReorderProvider({ value, children }) {
  return (
    <WorkspacePaneReorderContext.Provider value={value}>
      {children}
    </WorkspacePaneReorderContext.Provider>
  );
}

export function useWorkspacePaneReorder() {
  return reactExports.useContext(WorkspacePaneReorderContext);
}

export const selectChatPanelState = (chat) => ({
  connected: chat.connected,
  sessionsLoading: chat.sessionsLoading,
  conversationLoading: chat.conversationLoading,
  sessionListUnavailable: chat.sessionListUnavailable,
  retrySessionList: chat.retrySessionList,
  messages: chat.messages,
  busy: chat.busy,
  pendingReasons: chat.pendingReasons,
  historyLoadFailed: chat.historyLoadFailed,
  historyReloading: chat.historyReloading,
  switching: chat.switching,
  creatingSession: chat.creatingSession,
  focusedSessionId: chat.focusedSessionId,
  input: chat.input,
  setInput: chat.setInput,
  sendMessage: chat.sendMessage,
  handleRetry: chat.handleRetry,
  handleCancel: chat.handleCancel,
  stalledSessions: chat.stalledSessions,
  stopStalledSession: chat.stopStalledSession,
  dismissStalledNotice: chat.dismissStalledNotice,
  reloadSessionHistory: chat.reloadSessionHistory,
  sendWsMessage: chat.sendWsMessage,
  sessionStore: chat.sessionStore,
  forkSession: chat.forkSession,
  selectedModelId: chat.selectedModelId,
  handleModelSelectionChange: chat.handleModelSelectionChange,
  selectedMediaModels: chat.selectedMediaModels,
  handleSelectedMediaModelsChange: chat.handleSelectedMediaModelsChange,
  trackInputChange: chat.trackInputChange,
  trackAttachmentsChange: chat.trackAttachmentsChange,
  pendingEditorReset: chat.pendingEditorReset,
  pendingEditorDoc: chat.pendingEditorDoc,
  handlePendingInputConsumed: chat.handlePendingInputConsumed,
  pendingComposerReset: chat.pendingComposerReset,
  restoreDraft: chat.restoreDraft,
  pendingAttachments: chat.pendingAttachments,
  handlePendingAttachmentsConsumed: chat.handlePendingAttachmentsConsumed,
  queuedUserMessages: chat.queuedUserMessages,
  queuedUserMessageScrollRequest: chat.queuedUserMessageScrollRequest,
  cancelQueuedUserMessage: chat.cancelQueuedUserMessage,
  reorderQueuedUserMessage: chat.reorderQueuedUserMessage,
  sendQueuedUserMessageNow: chat.sendQueuedUserMessageNow,
  documentEditSubmissions: chat.documentEditSubmissions,
});

export function selectMessages(messages, ready, textEditMode) {
  if (!ready) return [];
  return textEditMode
    ? messages.filter(
        (message) =>
          !message.id.startsWith(TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX),
      )
    : messages;
}

export function ChatReconnectNotice({ title, description, animated, stuck }) {
  return (
    <div
      className="chat-reconnecting-notice mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-reconnect-animated={animated ? "true" : void 0}
      data-reconnect-stuck={stuck ? "true" : void 0}
    >
      <div className="chat-reconnecting-title font-medium text-foreground">
        {animated ? (
          <>
            <span className="sr-only">{title}</span>
            <span aria-hidden={true}>
              {title.replace(/(?:\.{3}|…)[\s]*$/, "")}
              <span className="chat-reconnecting-loading-dots">
                <span className="chat-reconnecting-loading-dot" />
                <span className="chat-reconnecting-loading-dot" />
                <span className="chat-reconnecting-loading-dot" />
              </span>
            </span>
          </>
        ) : (
          title
        )}
      </div>
      <div className="chat-reconnecting-description">{description}</div>
    </div>
  );
}

export const RECONNECTING_STUCK_THRESHOLD_MS = 18e4;

export function useReconnectingStuck(
  reconnecting,
  thresholdMs = RECONNECTING_STUCK_THRESHOLD_MS,
) {
  const [stuck, setStuck] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!reconnecting) {
      setStuck(false);
      return;
    }
    const timeoutId = setTimeout(() => setStuck(true), thresholdMs);
    return () => clearTimeout(timeoutId);
  }, [reconnecting, thresholdMs]);
  return stuck;
}

const CONNECTING_STALLED_THRESHOLD_MS = 1e4;

export function ChatStartupNotice({
  starting,
  connecting,
  reconnecting,
  showPreparing = true,
}) {
  const { t: translate } = useTranslation();
  const connectingStalled = useReconnectingStuck(
    connecting,
    CONNECTING_STALLED_THRESHOLD_MS,
  );
  const preparing = starting || connecting;
  if (connectingStalled && !reconnecting) {
    return (
      <div
        className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
        data-action-ui-id="chat.connecting-stalled-notice"
      >
        <div className="font-medium text-foreground">
          {translate(
            "chat.connectingStalled.title",
            "Still connecting to the local runtime...",
          )}
        </div>
        <div>
          {translate(
            "chat.connectingStalled.description",
            "Loading is taking longer than expected. Your chat history will appear once the connection is ready.",
          )}
        </div>
      </div>
    );
  }
  if (!preparing || !showPreparing) return null;
  return (
    <div
      className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-action-ui-id="chat.starting-notice"
    >
      <div className="font-medium text-foreground">
        {translate("chat.starting.title", "Preparing your Agent")}
      </div>
      <div>
        {translate(
          "chat.starting.description",
          "Chat history is ready. Sending will be available as soon as the local Agent finishes starting.",
        )}
      </div>
    </div>
  );
}

function filesToFileList(files) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  return transfer.files;
}

export async function applyChatShowcaseSelection({
  item,
  language,
  input,
  selectedMediaModels,
  onSelectedMediaModelsChange,
  signal,
  fetchAttachments = fetchSceneAttachments,
}) {
  if (item.action.kind !== "query")
    return {
      failed: [],
    };
  const query = item.action.query;
  input.setInputText(
    language.startsWith("zh") ? query.queryCn : query.queryEn,
  );
  if (query.models) {
    onSelectedMediaModelsChange({
      ...selectedMediaModels,
      ...query.models,
    });
  }
  input.focus();
  const downloadableAttachments = query.attachments.filter(
    (attachment) => attachment.assetUrl,
  );
  if (downloadableAttachments.length === 0) {
    input.clearAttachments({
      source: "scene-query",
    });
    return {
      failed: [],
    };
  }
  const result = await fetchAttachments(downloadableAttachments, {
    signal,
  });
  if (signal?.aborted)
    return {
      failed: [],
    };
  input.clearAttachments({
    source: "scene-query",
  });
  if (result.files.length > 0) {
    input.addFromLocal(filesToFileList(result.files), {
      source: "scene-query",
    });
  }
  return {
    failed: result.failed,
  };
}

export function isDocumentEditSubmissionForAnnotations(
  submittedAnnotationIds,
  annotations,
) {
  return (
    submittedAnnotationIds.length === annotations.length &&
    submittedAnnotationIds.every(
      (annotationId, index) => annotationId === annotations[index]?.id,
    )
  );
}

const BROWSER_VIDEO_ASSET_EVENT = "hilo:browser-video-asset";

function isBrowserVideoAsset(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !("path" in value) ||
    !("filename" in value)
  )
    return false;
  return (
    typeof value.path === "string" &&
    typeof value.filename === "string" &&
    value.path.length > 0 &&
    !/^[\\/]|^[a-z][a-z\d+.-]*:/i.test(value.path) &&
    !value.path.includes("\0") &&
    !value.path.split(/[\\/]/).includes("..") &&
    /\.(mp4|webm|mkv|mov|avi)$/i.test(value.path)
  );
}

export function dispatchBrowserVideoToChat(asset, workspaceId, sessionId) {
  const event = new CustomEvent(BROWSER_VIDEO_ASSET_EVENT, {
    detail: {
      ...asset,
      workspaceId,
      sessionId,
    },
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

export async function downloadBrowserVideo(request, fetchImplementation) {
  const response = await fetchImplementation(API_PATHS.webMedia, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "download_video",
      url: request.url,
      playlist_mode: "single",
      container: "mp4",
      add_to_canvas: request.action === "canvas",
    }),
    timeoutMs: 31 * 6e4,
  });
  if (!response.ok)
    throw new Error(`Video download request failed: HTTP ${response.status}`);
  const body = await response.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("ok" in body) ||
    body.ok !== true ||
    !("assets" in body) ||
    !Array.isArray(body.assets)
  )
    throw new Error("Video download did not return an asset");
  const videos = body.assets.filter(
    (asset) =>
      asset &&
      typeof asset === "object" &&
      "kind" in asset &&
      asset.kind === "video",
  );
  if (videos.length !== 1)
    throw new Error("Expected exactly one downloaded video");
  const path = videos[0].path;
  const asset = {
    path,
    filename: typeof path === "string" ? (path.split("/").at(-1) ?? "") : "",
  };
  if (!isBrowserVideoAsset(asset))
    throw new Error("Invalid downloaded video path");
  return asset;
}

export function useBrowserChatMedia(
  inputRef,
  isActiveRef,
  workspaceId,
  sessionId,
) {
  reactExports.useEffect(() => {
    const handleBrowserVideo = (event) => {
      if (!inputRef.current?.addFromAssetPath) return;
      const asset = event.detail;
      if (!isBrowserVideoAsset(asset)) return;
      const targetWorkspace =
        "workspaceId" in asset ? asset.workspaceId : void 0;
      if (
        typeof targetWorkspace === "string"
          ? targetWorkspace !== workspaceId
          : !isActiveRef.current
      )
        return;
      if (
        "sessionId" in asset &&
        asset.sessionId !== void 0 &&
        asset.sessionId !== sessionId
      )
        return;
      if (
        inputRef.current.addFromAssetPath(asset.path, asset.filename) === false
      )
        return;
      event.preventDefault();
    };
    const handleBrowserScreenshot = (event) => {
      if (!isActiveRef.current) return;
      const detail = event.detail;
      const dataUrl = detail?.dataUrl;
      if (!dataUrl) return;
      try {
        const comma = dataUrl.indexOf(",");
        if (comma < 0) return;
        const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1)
          bytes[index] = binary.charCodeAt(index);
        const transfer = new DataTransfer();
        const stamp = Date.now().toString(36);
        const filename = detail.annotated
          ? `browser-annotation-${stamp}.png`
          : `browser-screenshot-${stamp}.png`;
        transfer.items.add(
          new File([bytes], filename, {
            type: mime,
          }),
        );
        inputRef.current?.addFromLocal(transfer.files, {
          chatContextOnly: true,
        });
      } catch {}
    };
    const handleBrowserFile = (event) => {
      if (!isActiveRef.current) return;
      const file = event.detail?.file;
      if (!(file instanceof File)) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current?.addFromLocal(transfer.files, {});
    };
    window.addEventListener(BROWSER_SCREENSHOT_EVENT, handleBrowserScreenshot);
    window.addEventListener(BROWSER_FILE_EVENT, handleBrowserFile);
    window.addEventListener(BROWSER_VIDEO_ASSET_EVENT, handleBrowserVideo);
    return () => {
      window.removeEventListener(
        BROWSER_SCREENSHOT_EVENT,
        handleBrowserScreenshot,
      );
      window.removeEventListener(BROWSER_FILE_EVENT, handleBrowserFile);
      window.removeEventListener(BROWSER_VIDEO_ASSET_EVENT, handleBrowserVideo);
    };
  }, [inputRef, isActiveRef, workspaceId, sessionId]);
}
