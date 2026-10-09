// workspace-stage-reducer.jsx
import {
  useTranslation,
  reactExports,
  workspaceEvents,
  useGatewayFetch,
  dedupedToast,
  BROWSER_IMAGE_EDIT_EVENT,
  useDiffReviewStore,
  useWorkspaceRemoteTool,
  useAccountSubmissionAllowed,
} from "../vendor.js";
import { RemoteToolDialog } from "../m11/bundle-error-screen.jsx";
import { CanvasArea } from "../m12/canvas-area.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function useChatReferenceReveal(isActive2, reveal) {
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    const subscription = workspaceEvents.onAddPluginNodeToChat(reveal);
    window.addEventListener(BROWSER_IMAGE_EDIT_EVENT, reveal);
    return () => {
      subscription.dispose();
      window.removeEventListener(BROWSER_IMAGE_EDIT_EVENT, reveal);
    };
  }, [isActive2, reveal]);
}
function toRevertEdit(hunk) {
  return {
    annotationId: hunk.id,
    exact: hunk.replacement,
    ...(hunk.reversePrefix
      ? {
          prefix: hunk.reversePrefix,
        }
      : {}),
    ...(hunk.reverseSuffix
      ? {
          suffix: hunk.reverseSuffix,
        }
      : {}),
    ...(hunk.replacement && hunk.reverseOccurrence !== void 0
      ? {
          occurrence: hunk.reverseOccurrence,
        }
      : {}),
    replacement: hunk.originalText,
  };
}
function mapRevertResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object") return null;
  const record2 = raw2;
  if (
    typeof record2.nodeId !== "string" ||
    typeof record2.content !== "string" ||
    !Array.isArray(record2.results)
  )
    return null;
  const results = [];
  for (const item of record2.results) {
    if (!item || typeof item !== "object") return null;
    const entry = item;
    if (typeof entry.annotationId !== "string" || typeof entry.status !== "string") return null;
    results.push({
      annotationId: entry.annotationId,
      status: entry.status === "applied" ? "applied" : "conflict",
    });
  }
  return {
    nodeId: record2.nodeId,
    status: record2.status === "applied" ? "applied" : "conflict",
    contentHash: typeof record2.contentHash === "string" ? record2.contentHash : "",
    content: record2.content,
    results,
  };
}
export function useDocumentEditReviewHost(enabled) {
  const gatewayFetch2 = useGatewayFetch();
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    if (!enabled) return;
    const handler = async (nodeId, hunks) => {
      const ordered = [...hunks].sort((a2, b3) => b3.startLine - a2.startLine);
      const failAll = () => ({
        undoneIds: [],
        failedIds: ordered.map((hunk) => hunk.id),
      });
      let response = null;
      try {
        const resp = await gatewayFetch2("/api/canvas/text-node/revert-edits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nodeId,
            edits: ordered.map(toRevertEdit),
          }),
        });
        if (!resp.ok) {
          dedupedToast.error(t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"));
          return failAll();
        }
        response = mapRevertResponse(await resp.json());
      } catch {
        dedupedToast.error(t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"));
        return failAll();
      }
      if (!response) {
        dedupedToast.error(t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"));
        return failAll();
      }
      const undoneIds = [];
      const failedIds = [];
      for (const result of response.results) {
        (result.status === "applied" ? undoneIds : failedIds).push(result.annotationId);
      }
      if (failedIds.length > 0) {
        dedupedToast.error(
          t2("chat.diffReview.undoPartial", "{{count}} 处修改无法撤销（内容已变化）", {
            count: failedIds.length,
          }),
        );
      }
      return {
        undoneIds,
        failedIds,
        content: response.content,
      };
    };
    useDiffReviewStore.getState().setUndoHandler(handler);
    return () => {
      useDiffReviewStore.getState().setUndoHandler(null);
    };
  }, [enabled, gatewayFetch2, t2]);
}
function writeDiagnostic(level, message2) {
  const logger = window.hilo?.logger;
  if (logger) {
    const write = level === "warn" ? logger.warn.bind(logger) : logger.info.bind(logger);
    write(message2).catch(() => {
      if (level === "warn") {
        console.warn(message2);
      } else {
        console.info(message2);
      }
    });
    return;
  }
  if (level === "warn") {
    console.warn(message2);
  } else {
    console.info(message2);
  }
}
function formatWorkspaceMatch(value, workspaceId2) {
  if (!value) return "unknown";
  return String(value === workspaceId2);
}
function formatDiagnosticSnapshot(instanceId, input) {
  return [
    `instance=${instanceId}`,
    `active=${input.isActive}`,
    `view=${input.viewKind}`,
    `runtimeKnown=${input.runtime !== void 0}`,
    `runtimeMatch=${formatWorkspaceMatch(input.runtime?.workspaceId, input.workspaceId)}`,
    `activeRuntime=${input.activeRuntime !== void 0}`,
    `statusKnown=${input.status !== void 0}`,
    `statusMatch=${formatWorkspaceMatch(input.status?.workspaceId, input.workspaceId)}`,
    `activeStatus=${input.activeStatus?.state ?? "unknown"}`,
    `activeRevision=${input.activeStatus?.revision ?? "unknown"}`,
    `liveRenderable=${input.liveRenderableStatus !== void 0}`,
    `lastRenderable=${input.lastRenderableStatus !== void 0}`,
    `lastRenderableRevision=${input.lastRenderableStatus?.revision ?? "unknown"}`,
    `activationFailure=${input.activationFailureStatus?.state ?? "none"}`,
    `canRetain=${input.canRenderRetainedContent}`,
    `refreshKey=${input.statusRefreshKey}`,
  ].join(" ");
}
export function useWorkspaceRuntimeViewDiagnostics(input) {
  const reactId = reactExports.useId();
  const instanceId = `workspace-runtime-${reactId.replace(/:/g, "")}`;
  const latestInputRef = reactExports.useRef(input);
  latestInputRef.current = input;
  const lifecycleGenerationRef = reactExports.useRef(0);
  const hasLoggedMountRef = reactExports.useRef(false);
  const hasCommittedContentRef = reactExports.useRef(false);
  const previousViewKindRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const generation = lifecycleGenerationRef.current + 1;
    lifecycleGenerationRef.current = generation;
    if (!hasLoggedMountRef.current) {
      hasLoggedMountRef.current = true;
      writeDiagnostic(
        "info",
        `[workspace-runtime-view] host mounted ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
      );
    }
    return () => {
      queueMicrotask(() => {
        if (lifecycleGenerationRef.current !== generation) return;
        writeDiagnostic(
          "info",
          `[workspace-runtime-view] host unmounted ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
        );
      });
    };
  }, [instanceId]);
  reactExports.useEffect(() => {
    const previousViewKind = previousViewKindRef.current;
    previousViewKindRef.current = input.viewKind;
    if (input.viewKind === "content" && !hasCommittedContentRef.current) {
      hasCommittedContentRef.current = true;
      writeDiagnostic(
        "info",
        `[workspace-runtime-view] content committed ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
      );
    }
    if (previousViewKind !== "content" || input.viewKind === "content") return;
    writeDiagnostic(
      "warn",
      `[workspace-runtime-view] committed content regression previous=content ${formatDiagnosticSnapshot(instanceId, latestInputRef.current)}`,
    );
  }, [input.viewKind, instanceId]);
}
function oppositeWorkspacePaneOrder(order2) {
  return order2 === "chat-canvas" ? "canvas-chat" : "chat-canvas";
}
export function queueWorkspacePaneOrderSet(paneOrder) {
  return {
    kind: "set",
    paneOrder,
  };
}
export function resolveWorkspacePaneOrderIntent(hydratedOrder, pending2) {
  if (!pending2) return hydratedOrder;
  return pending2.kind === "set" ? pending2.paneOrder : oppositeWorkspacePaneOrder(hydratedOrder);
}
export const DEFAULT_WORKSPACE_PANE_ORDER = "canvas-chat";
export const DEFAULT_WORKSPACE_CHAT_RATIO = 0.3;
const DEFAULT_WORKSPACE_STAGE_STATE = {
  paneOrder: DEFAULT_WORKSPACE_PANE_ORDER,
  canvasVisibility: "open",
  filesMode: "closed",
};
function isRecord$1(value) {
  return typeof value === "object" && value !== null;
}
function isPaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat";
}
function isCanvasVisibility(value) {
  return value === "closed" || value === "open";
}
function isWorkspaceMode(value) {
  return value === "chatOnly" || value === "split" || value === "canvasOnly";
}
function isFilesMode(value) {
  return value === "closed" || value === "peek" || value === "docked";
}
function isAutoReveal(value) {
  return value === "eligible" || value === "consumed" || value === "suppressed";
}
function normalizeWorkspaceStageState(input) {
  const candidate = isRecord$1(input) ? input : {};
  const paneOrder = isPaneOrder(candidate.paneOrder)
    ? candidate.paneOrder
    : DEFAULT_WORKSPACE_STAGE_STATE.paneOrder;
  const legacyCanvasVisibility = isCanvasVisibility(candidate.canvasVisibility)
    ? candidate.canvasVisibility
    : DEFAULT_WORKSPACE_STAGE_STATE.canvasVisibility;
  const workspaceMode = isWorkspaceMode(candidate.workspaceMode)
    ? candidate.workspaceMode
    : legacyCanvasVisibility === "open"
      ? "split"
      : "chatOnly";
  const canvasVisibility = workspaceMode === "chatOnly" ? "closed" : "open";
  let filesMode = isFilesMode(candidate.filesMode)
    ? candidate.filesMode
    : DEFAULT_WORKSPACE_STAGE_STATE.filesMode;
  let autoReveal = isAutoReveal(candidate.autoReveal) ? candidate.autoReveal : "eligible";
  if (canvasVisibility === "closed") {
    filesMode = "closed";
  } else if (autoReveal === "eligible") {
    autoReveal = "consumed";
  }
  return {
    paneOrder,
    workspaceMode,
    canvasVisibility,
    filesMode,
    autoReveal,
  };
}
export function createWorkspaceStageState(input = {}) {
  return normalizeWorkspaceStageState(input);
}
function consumeAutoReveal(autoReveal) {
  return autoReveal === "eligible" ? "consumed" : autoReveal;
}
function statesEqual(left, right) {
  return (
    left.paneOrder === right.paneOrder &&
    left.workspaceMode === right.workspaceMode &&
    left.canvasVisibility === right.canvasVisibility &&
    left.filesMode === right.filesMode &&
    left.autoReveal === right.autoReveal
  );
}
function transition(state2, patch2) {
  const next2 = normalizeWorkspaceStageState({
    ...state2,
    ...patch2,
  });
  return statesEqual(state2, next2) ? state2 : next2;
}
export function workspaceStageReducer(state2, action) {
  switch (action.type) {
    case "state/restore": {
      const restored = createWorkspaceStageState(action.state);
      return statesEqual(state2, restored) ? state2 : restored;
    }
    case "pane-order/set":
      return transition(state2, {
        paneOrder: action.paneOrder,
      });
    case "pane-order/swap":
      return transition(state2, {
        paneOrder: state2.paneOrder === "chat-canvas" ? "canvas-chat" : "chat-canvas",
      });
    case "canvas/open":
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "canvas/auto-reveal":
      if (state2.autoReveal !== "eligible") return state2;
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        autoReveal: "consumed",
      });
    case "canvas/close":
      return transition(state2, {
        workspaceMode: "chatOnly",
        filesMode: "closed",
        autoReveal: "suppressed",
      });
    case "chat/open":
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "canvasOnly" ? "split" : state2.workspaceMode,
      });
    case "chat/close":
      return transition(state2, {
        // Closing Chat is only meaningful when Canvas exists. From the
        // Chat-first state this atomically reveals Canvas, so the Stage never
        // enters an empty `none` mode even through a programmatic action.
        workspaceMode: "canvasOnly",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/open":
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: action.mode ?? "peek",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/close":
      return transition(state2, {
        filesMode: "closed",
      });
    case "files/toggle-peek":
      if (state2.filesMode !== "closed") {
        return transition(state2, {
          filesMode: "closed",
        });
      }
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: "peek",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/dock":
      return transition(state2, {
        workspaceMode: state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: "docked",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/undock":
      if (state2.filesMode !== "docked") return state2;
      return transition(state2, {
        filesMode: "peek",
      });
    case "auto-reveal/suppress":
      return transition(state2, {
        autoReveal: "suppressed",
      });
    case "auto-reveal/reset":
      return transition(state2, {
        autoReveal: "eligible",
      });
  }
}
export function rebaseWorkspaceStageActions(state2, actions) {
  return actions.reduce(workspaceStageReducer, state2);
}
export function selectWorkspaceStageLayout(state2) {
  const chatVisible = state2.workspaceMode !== "canvasOnly";
  const canvasVisible = state2.workspaceMode !== "chatOnly";
  const structuralPanes = (canvasFirst) => {
    if (!chatVisible) return state2.filesMode === "docked" ? ["canvas", "files"] : ["canvas"];
    if (!canvasVisible) return ["chat"];
    if (state2.filesMode !== "docked") return canvasFirst ? ["canvas", "chat"] : ["chat", "canvas"];
    return canvasFirst ? ["canvas", "files", "chat"] : ["chat", "canvas", "files"];
  };
  if (state2.paneOrder === "chat-canvas") {
    return {
      canvasSide: "right",
      seamSide: "left",
      toolbarCorner: "top-right",
      filesPeekDirection: "left",
      visiblePanes: structuralPanes(false),
    };
  }
  return {
    canvasSide: "left",
    seamSide: "right",
    toolbarCorner: "top-right",
    filesPeekDirection: "left",
    visiblePanes: structuralPanes(true),
  };
}
const announced = new Set();
export function shouldAnnounceRecoveryNotice(notice) {
  if (!notice) return false;
  if (announced.has(notice.atMs)) return false;
  announced.add(notice.atMs);
  return true;
}
export function resolveWorkspaceActivationResult(result) {
  if (!result)
    return {
      kind: "startup_failure",
    };
  switch (result.kind) {
    case "opened":
    case "reused":
      return {
        kind: "runtime",
        runtime: result.runtime,
      };
    default:
      return {
        kind: "soft_failure",
        result,
        returnHome: true,
      };
  }
}
export const MemoizedCanvasArea = reactExports.memo(
  CanvasArea,
  (prev, next2) =>
    prev.onCanvasTasksChange === next2.onCanvasTasksChange &&
    prev.onRenderableContentChange === next2.onRenderableContentChange &&
    prev.assetPanelOpen === next2.assetPanelOpen &&
    prev.assetPanelControlsId === next2.assetPanelControlsId &&
    prev.onToggleAssetPanel === next2.onToggleAssetPanel &&
    prev.browserOpen === next2.browserOpen &&
    prev.onToggleBrowser === next2.onToggleBrowser &&
    prev.isActive === next2.isActive &&
    prev.isPresented === next2.isPresented &&
    prev.workspaceId === next2.workspaceId &&
    prev.workspaceName === next2.workspaceName &&
    prev.getTextEditCloseBlockReason === next2.getTextEditCloseBlockReason &&
    prev.toolbarPlacement === next2.toolbarPlacement &&
    prev.layoutRelocationKey === next2.layoutRelocationKey,
);
export function RemoteToolHost() {
  const {
    remoteToolRequest,
    remoteToolDialogSessionId,
    clearRemoteToolRequest,
    clearPendingRemoteToolRequest,
    lastSkillGuiEvent,
    sendSkillGuiEvent,
  } = useWorkspaceRemoteTool();
  const { i18n } = useTranslation();
  const accountSubmissionAllowed = useAccountSubmissionAllowed("remote_tool");
  if (!remoteToolRequest) return null;
  return (
    <RemoteToolDialog
      open={true}
      onClose={clearRemoteToolRequest}
      toolUrl={remoteToolRequest.toolUrl}
      manifestPath={remoteToolRequest.manifestPath}
      toolId={remoteToolRequest.toolName}
      locale={i18n.language}
      initialParams={remoteToolRequest.initialParams}
      interactionDisabled={!accountSubmissionAllowed}
      onGuiEvent={(eventType, data2) => {
        if (
          eventType !== "gui:ready" &&
          eventType !== "generate:submit" &&
          eventType !== "generate:cancel"
        ) {
          return;
        }
        const sent = sendSkillGuiEvent(
          remoteToolRequest.toolName,
          eventType,
          data2,
          remoteToolDialogSessionId ?? void 0,
        );
        if (eventType === "generate:submit" && sent) {
          clearPendingRemoteToolRequest();
          clearRemoteToolRequest();
        }
      }}
      hostEvent={
        lastSkillGuiEvent
          ? {
              eventType: lastSkillGuiEvent.event_type,
              data: lastSkillGuiEvent.data,
            }
          : null
      }
    />
  );
}
