// workspace-content.jsx
import { useAccountSubmissionDecision } from "../assets/gateway-scope-provider.jsx";
import { useWorkspaceRemoteToolOptional } from "../canvas/resolve-workspace-failure-diagnosis.js";
import {
  BROWSER_IMAGE_EDIT_EVENT,
  ChevronDown,
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { useDiffReviewStore } from "../text-editor/use-diff-review-store.js";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { workspaceEvents } from "./topbar-state-context.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { RemoteToolDialog } from "../infra/remote-tool-dialog.jsx";
import { CanvasArea } from "../canvas/canvas-area.jsx";
import { useSessionStore } from "./resolve-retry-message-payload.jsx";
import {
  dispatchBrowserVideoToChat,
  downloadBrowserVideo,
  useWorkspacePaneReorder,
} from "../chat/use-browser-chat-media.jsx";
import {
  cn$2,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  useBrowserHoverPreview,
} from "../infra/dialog-content.jsx";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
} from "../vendor-inline/vscode-base/graph.jsx";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.js";
import { useHasBlockingModal } from "../infra/schedule.js";
import { getPlatform } from "../infra/web-storage.js";
import { resolveShortcutDisplay } from "./other-modifiers.js";
import {
  ShortcutHint,
  WORKSPACE_DISPLAY_MODE_SHORTCUT,
} from "./shortcut-hint.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { CoachMark } from "../assets/use-materialized-entities.jsx";
import { useWorkspaceChatSelector } from "../assets/use-canvas-model-registry-hydration.js";
import { CanvasSidebarOverlay } from "./canvas-sidebar-overlay.jsx";
import { resolveCanvasSidebarRightEdgeInset } from "./workspace-asset-center-relocation-coach-mark.jsx";
import { useGlobalSidebar } from "../media-editing/derive-session-task-snapshot.jsx";
import { ChatPanel } from "../chat/chat-panel.jsx";
import { WorkspaceBrowser } from "./workspace-browser.jsx";
import { WorkspaceViewSwitch } from "./workspace-view-switch.jsx";
import { WorkspaceDisplayModeSwitcher } from "./workspace-display-mode-switcher.jsx";
import { WorkspaceStage } from "./workspace-stage.jsx";

function useAccountSubmissionAllowed(kind) {
  return useAccountSubmissionDecision(kind).allowed;
}

function useWorkspaceRemoteTool() {
  const ctx = useWorkspaceRemoteToolOptional();
  if (!ctx)
    throw new Error(
      "useWorkspaceRemoteTool must be used within WorkspaceChatProvider",
    );
  return ctx;
}

function useBrowserVideoDownload(isActive2) {
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
      if (
        request.type !== "video-download-requested" ||
        !current2.current.isActive
      )
        return;
      const origin = current2.current;
      const sessionId = origin.sessionStore.getState().focusedSessionId;
      void (async () => {
        let downloaded = false;
        try {
          const asset = await downloadBrowserVideo(
            request,
            origin.gatewayFetch,
          );
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
            dedupedToast.success(
              current2.current.t("workspace.browser.pluginAddedToCanvas"),
            );
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

const WORKSPACE_VIEW_MODE_CONTROL_WIDTH = 104;

const WORKSPACE_VIEW_MODE_CONTROL_SPLIT_WIDTH = 120;

const WORKSPACE_VIEW_MODE_CONTROL_GAP = 6;

const WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH = 32;

function isWorkspaceMode$1(value) {
  return value === "chatOnly" || value === "split" || value === "canvasOnly";
}

function isWorkspacePaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat";
}

function WorkspaceViewModeIcon({ mode: mode2, paneOrder, className }) {
  const chatOnLeft = paneOrder === "chat-canvas";
  const leftActive =
    mode2 === "split" || (mode2 === "chatOnly" ? chatOnLeft : !chatOnLeft);
  const rightActive =
    mode2 === "split" || (mode2 === "chatOnly" ? !chatOnLeft : chatOnLeft);
  return (
    <svg
      viewBox="0 0 18 18"
      aria-hidden="true"
      className={cn$2("size-4 shrink-0", className)}
      data-workspace-view-mode-icon="true"
      data-left-active={leftActive ? "true" : "false"}
      data-right-active={rightActive ? "true" : "false"}
    >
      <rect
        x="1.25"
        y="2.25"
        width="15.5"
        height="13.5"
        rx="3"
        fill="none"
        className="stroke-current opacity-65"
        strokeWidth="1.25"
      />
      <rect
        x="2.75"
        y="3.75"
        width="5.25"
        height="10.5"
        rx="1.5"
        className={
          leftActive ? "fill-current opacity-60" : "fill-current opacity-[0.12]"
        }
      />
      <rect
        x="10"
        y="3.75"
        width="5.25"
        height="10.5"
        rx="1.5"
        className={
          rightActive
            ? "fill-current opacity-60"
            : "fill-current opacity-[0.12]"
        }
      />
    </svg>
  );
}

function WorkspaceViewModeMenu({
  mode: mode2,
  paneOrder,
  onModeChange,
  onPaneOrderChange,
  variant = "chat-header",
  source = "chat",
  align = "end",
  compact = false,
  coachMarkEnabled = false,
  triggerRef: externalTriggerRef,
  onControlWidthChange,
}) {
  const { t: t2 } = useTranslation();
  const paneReorder = useWorkspacePaneReorder();
  const internalTriggerRef = reactExports.useRef(null);
  const triggerRef = externalTriggerRef ?? internalTriggerRef;
  const hasBlockingModal = useHasBlockingModal();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  useBrowserHoverPreview(menuOpen);
  const platformOs = getPlatform().app.os;
  const shortcutText = resolveShortcutDisplay(
    platformOs === "darwin"
      ? WORKSPACE_DISPLAY_MODE_SHORTCUT.mac
      : WORKSPACE_DISPLAY_MODE_SHORTCUT.other,
    platformOs,
  ).text;
  const label = t2("workspace.layout.label", "Workspace layout");
  const currentModeLabel =
    mode2 === "split"
      ? t2("workspace.layout.chatAndCanvas", "Chat + Canvas")
      : mode2 === "chatOnly"
        ? t2("workspace.layout.chatOnly", "Chat only")
        : t2("workspace.layout.canvasOnly", "Canvas only");
  const requestPaneOrderChange = (targetOrder) => {
    if (paneReorder?.enabled && paneReorder.requestPaneOrderChange) {
      paneReorder.requestPaneOrderChange(targetOrder);
      return;
    }
    onPaneOrderChange(targetOrder);
  };
  const reportControlWidth = reactExports.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !onControlWidthChange) return;
    const nextWidth = Math.ceil(
      trigger.getBoundingClientRect().width || trigger.offsetWidth,
    );
    if (nextWidth > 0) onControlWidthChange(nextWidth);
  }, [onControlWidthChange, triggerRef]);
  reactExports.useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !onControlWidthChange) return;
    reportControlWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", reportControlWidth);
      return () => window.removeEventListener("resize", reportControlWidth);
    }
    const observer2 = new ResizeObserver(reportControlWidth);
    observer2.observe(trigger);
    return () => observer2.disconnect();
  }, [onControlWidthChange, reportControlWidth, triggerRef]);
  return (
    <>
      <TooltipProvider$1 delay={150} closeDelay={0}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip$1 content={label} closeOnClick={true}>
            <DropdownMenuTrigger
              ref={triggerRef}
              type="button"
              aria-label={`${label}: ${currentModeLabel}`}
              title={compact ? currentModeLabel : void 0}
              data-action-ui-id={`workspace.view-mode-menu.${source}`}
              data-window-drag-region="no-drag"
              data-workspace-layout-label={mode2}
              style={{
                width: compact
                  ? WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH
                  : void 0,
              }}
              className={cn$2(
                "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                compact
                  ? // Keep the compact Chat-header variant icon-only; the shortcut
                    // hint lives inside the opened display-mode menu.
                    "-mt-0.5 h-7 rounded-md px-2 text-foreground/65 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
                  : cn$2(
                      "px-2",
                      variant === "chat-header"
                        ? "h-7 rounded-md text-foreground/65 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
                        : "h-8 rounded-lg text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.08] data-[popup-open]:text-foreground",
                    ),
              )}
            >
              <WorkspaceViewModeIcon mode={mode2} paneOrder={paneOrder} />
              {compact ? null : (
                <span className="truncate">{currentModeLabel}</span>
              )}
              {compact ? null : (
                <ChevronDown
                  className="size-3.5 shrink-0 opacity-50"
                  strokeWidth={1.5}
                />
              )}
            </DropdownMenuTrigger>
          </Tooltip$1>
          <DropdownMenuContent
            align={align}
            side="bottom"
            sideOffset={variant === "stage-chrome" ? 8 : 6}
            className="min-w-44"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between gap-4">
                <span>{t2("workspace.layout.mode", "Layout mode")}</span>
                <ShortcutHint
                  accelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.mac}
                  otherAccelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.other}
                  os={platformOs}
                  data-workspace-layout-shortcut="true"
                  className="h-4 min-w-4 shrink-0 rounded-[4px] px-0.5 text-[10px] opacity-80"
                />
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={mode2}
                aria-label={t2("workspace.layout.mode", "Layout mode")}
                onValueChange={(value) => {
                  if (isWorkspaceMode$1(value)) onModeChange(value);
                }}
              >
                <DropdownMenuRadioItem
                  value="split"
                  data-action-ui-id="workspace.view-mode.split"
                >
                  <WorkspaceViewModeIcon
                    mode="split"
                    paneOrder={paneOrder}
                    className="size-4"
                  />
                  <span>
                    {t2("workspace.layout.chatAndCanvas", "Chat + Canvas")}
                  </span>
                </DropdownMenuRadioItem>
                {mode2 === "split" ? (
                  <div
                    className="ml-5 border-l border-border/60 pl-1"
                    data-workspace-layout-secondary="chat-position"
                  >
                    <DropdownMenuRadioGroup
                      value={paneOrder}
                      aria-label={t2(
                        "workspace.layout.chatPosition",
                        "Chat position",
                      )}
                      onValueChange={(value) => {
                        if (isWorkspacePaneOrder(value))
                          requestPaneOrderChange(value);
                      }}
                    >
                      <DropdownMenuRadioItem
                        value="chat-canvas"
                        data-action-ui-id="workspace.pane-order.chat-left"
                      >
                        <span>
                          {t2("workspace.layout.chatLeft", "Chat on left")}
                        </span>
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="canvas-chat"
                        data-action-ui-id="workspace.pane-order.chat-right"
                      >
                        <span>
                          {t2("workspace.layout.chatRight", "Chat on right")}
                        </span>
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </div>
                ) : null}
                <DropdownMenuRadioItem
                  value="chatOnly"
                  data-action-ui-id="workspace.view-mode.chat-only"
                >
                  <WorkspaceViewModeIcon
                    mode="chatOnly"
                    paneOrder={paneOrder}
                    className="size-4"
                  />
                  <span>{t2("workspace.layout.chatOnly", "Chat only")}</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="canvasOnly"
                  data-action-ui-id="workspace.view-mode.canvas-only"
                >
                  <WorkspaceViewModeIcon
                    mode="canvasOnly"
                    paneOrder={paneOrder}
                    className="size-4"
                  />
                  <span>
                    {t2("workspace.layout.canvasOnly", "Canvas only")}
                  </span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider$1>
      {coachMarkEnabled && !hasBlockingModal ? (
        <CoachMark
          markId="workspace-display-mode-shortcut-intro"
          enabled={true}
          anchorRef={triggerRef}
          side="bottom"
          align="end"
          showClose={true}
          title={t2(
            "coachMark.workspace.displayMode.title",
            "Quickly switch display modes",
          )}
          description={t2("coachMark.workspace.displayMode.desc", {
            defaultValue:
              "Press {{shortcut}} to open the full-screen display mode switcher. Use arrow keys to preselect and Enter to apply.",
            shortcut: shortcutText,
          })}
          ctaLabel={t2("coachMark.gotIt", "Got it")}
        />
      ) : null}
    </>
  );
}

function useChatReferenceReveal(isActive2, reveal) {
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
    if (
      typeof entry.annotationId !== "string" ||
      typeof entry.status !== "string"
    )
      return null;
    results.push({
      annotationId: entry.annotationId,
      status: entry.status === "applied" ? "applied" : "conflict",
    });
  }
  return {
    nodeId: record2.nodeId,
    status: record2.status === "applied" ? "applied" : "conflict",
    contentHash:
      typeof record2.contentHash === "string" ? record2.contentHash : "",
    content: record2.content,
    results,
  };
}

function useDocumentEditReviewHost(enabled) {
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
          dedupedToast.error(
            t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"),
          );
          return failAll();
        }
        response = mapRevertResponse(await resp.json());
      } catch {
        dedupedToast.error(
          t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"),
        );
        return failAll();
      }
      if (!response) {
        dedupedToast.error(
          t2("chat.diffReview.undoFailed", "撤销失败，请稍后重试"),
        );
        return failAll();
      }
      const undoneIds = [];
      const failedIds = [];
      for (const result of response.results) {
        (result.status === "applied" ? undoneIds : failedIds).push(
          result.annotationId,
        );
      }
      if (failedIds.length > 0) {
        dedupedToast.error(
          t2(
            "chat.diffReview.undoPartial",
            "{{count}} 处修改无法撤销（内容已变化）",
            {
              count: failedIds.length,
            },
          ),
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

function selectWorkspaceStageLayout(state2) {
  const chatVisible = state2.workspaceMode !== "canvasOnly";
  const canvasVisible = state2.workspaceMode !== "chatOnly";
  const structuralPanes = (canvasFirst) => {
    if (!chatVisible)
      return state2.filesMode === "docked" ? ["canvas", "files"] : ["canvas"];
    if (!canvasVisible) return ["chat"];
    if (state2.filesMode !== "docked")
      return canvasFirst ? ["canvas", "chat"] : ["chat", "canvas"];
    return canvasFirst
      ? ["canvas", "files", "chat"]
      : ["chat", "canvas", "files"];
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

const MemoizedCanvasArea = reactExports.memo(
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

function RemoteToolHost() {
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

export function WorkspaceContent({
  assetPanel,
  stageState,
  dispatchStage,
  onPaneOrderChange,
  chatRatio,
  onChatRatioChange,
  onCanvasPaneChange,
  browserOpen,
  setBrowserOpen,
  folderPath,
  onCanvasTasksChange,
  onRenderableContentChange,
  isActive: isActive2,
  workspaceId: workspaceId2,
  workspaceName,
  stageLayoutReady,
}) {
  useBrowserVideoDownload(isActive2 !== false);
  const assetPanelIdSuffix = reactExports.useId();
  const assetPanelId = `workspace-project-assets-panel-${assetPanelIdSuffix}`;
  const stageLayout = selectWorkspaceStageLayout(stageState);
  const [textEditSession, setTextEditSession] = reactExports.useState(null);
  const textEditSessionRef = reactExports.useRef(null);
  const textEditActive = textEditSession !== null;
  const [pluginEditSession, setPluginEditSession] = reactExports.useState(null);
  const [pluginEditAgentName, setPluginEditAgentName] =
    reactExports.useState(void 0);
  const [pluginEditPluginId, setPluginEditPluginId] =
    reactExports.useState(void 0);
  const pluginEditSessionRef = reactExports.useRef(null);
  const pluginEditActive = pluginEditSession !== null;
  const editSurfaceActive = textEditActive || pluginEditActive;
  const enterTextEditAgent = useWorkspaceChatSelector(
    (chat) => chat.enterTextEditAgent,
  );
  const leaveTextEditAgent = useWorkspaceChatSelector(
    (chat) => chat.leaveTextEditAgent,
  );
  const clearTextEditSessionsForNode = useWorkspaceChatSelector(
    (chat) => chat.clearTextEditSessionsForNode,
  );
  const textEditAgentState = useWorkspaceChatSelector(
    (chat) => chat.textEditAgentState,
  );
  const getTextEditCloseBlockReason = useWorkspaceChatSelector(
    (chat) => chat.getTextEditCloseBlockReason,
  );
  const textEditChatStatus =
    textEditSession &&
    textEditAgentState?.editor.nodeId === textEditSession.nodeId &&
    textEditAgentState.editor.editSessionId === textEditSession.editSessionId
      ? textEditAgentState.status
      : "resolving";
  const pluginEditChatStatus =
    pluginEditSession &&
    textEditAgentState?.editor.nodeId === pluginEditSession.nodeId &&
    textEditAgentState.editor.editSessionId === pluginEditSession.editSessionId
      ? textEditAgentState.status
      : "resolving";
  const textEditSelectionRef = reactExports.useRef(null);
  const [hasTextEditSelection, setHasTextEditSelection] =
    reactExports.useState(false);
  useDocumentEditReviewHost(isActive2 !== false);
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    const d2 = workspaceEvents.onTextEditActive((e2) => {
      if (e2.workspaceId !== workspaceId2) return;
      const session = {
        nodeId: e2.nodeId,
        editSessionId: e2.editSessionId,
      };
      if (e2.active) {
        textEditSessionRef.current = session;
        textEditSelectionRef.current = null;
        setHasTextEditSelection(false);
        enterTextEditAgent(session);
        setTextEditSession(session);
        dispatchStage({
          type: "files/close",
        });
        return;
      }
      const current2 = textEditSessionRef.current;
      if (
        current2?.nodeId === e2.nodeId &&
        current2.editSessionId === e2.editSessionId
      ) {
        leaveTextEditAgent(session);
        textEditSessionRef.current = null;
        textEditSelectionRef.current = null;
        setHasTextEditSelection(false);
        setTextEditSession(null);
      }
    });
    return () => d2.dispose();
  }, [
    dispatchStage,
    enterTextEditAgent,
    isActive2,
    leaveTextEditAgent,
    workspaceId2,
  ]);
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    const d2 = workspaceEvents.onPluginEditActive((e2) => {
      if (e2.workspaceId !== workspaceId2) return;
      const session = {
        nodeId: e2.nodeId,
        editSessionId: e2.editSessionId,
      };
      if (e2.active) {
        pluginEditSessionRef.current = session;
        enterTextEditAgent(session, "plugin", e2.agentName);
        setPluginEditSession(session);
        setPluginEditAgentName(e2.agentName);
        setPluginEditPluginId(e2.pluginId);
        dispatchStage({
          type: "files/close",
        });
        return;
      }
      const current2 = pluginEditSessionRef.current;
      if (
        current2?.nodeId === e2.nodeId &&
        current2.editSessionId === e2.editSessionId
      ) {
        leaveTextEditAgent(session);
        pluginEditSessionRef.current = null;
        setPluginEditSession(null);
        setPluginEditAgentName(void 0);
        setPluginEditPluginId(void 0);
      }
    });
    return () => d2.dispose();
  }, [
    dispatchStage,
    enterTextEditAgent,
    isActive2,
    leaveTextEditAgent,
    workspaceId2,
  ]);
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onTextNodeRemoved((e2) => {
      if (e2.workspaceId !== workspaceId2) return;
      clearTextEditSessionsForNode(e2.nodeId);
    });
    return () => d2.dispose();
  }, [clearTextEditSessionsForNode, workspaceId2]);
  const [annotations, setAnnotations] = reactExports.useState([]);
  const [activeAnnotationId, setActiveAnnotationId] =
    reactExports.useState(null);
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    const matchesCurrentEditor = (event) => {
      const current2 = textEditSessionRef.current;
      return (
        current2?.nodeId === event.nodeId &&
        current2.editSessionId === event.editSessionId
      );
    };
    const dChanged = workspaceEvents.onAnnotationsChanged((e2) => {
      if (e2.workspaceId !== workspaceId2 || !matchesCurrentEditor(e2)) return;
      setAnnotations(e2.annotations);
    });
    const dActivated = workspaceEvents.onAnnotationActivated((e2) => {
      if (e2.workspaceId !== workspaceId2 || !matchesCurrentEditor(e2)) return;
      setActiveAnnotationId(e2.id);
    });
    const dSelection = workspaceEvents.onTextEditSelection((e2) => {
      if (e2.workspaceId !== workspaceId2 || !matchesCurrentEditor(e2)) return;
      textEditSelectionRef.current = e2.selection;
      setHasTextEditSelection(Boolean(e2.selection.anchor?.exact.trim()));
    });
    return () => {
      dChanged.dispose();
      dActivated.dispose();
      dSelection.dispose();
    };
  }, [isActive2, workspaceId2]);
  reactExports.useEffect(() => {
    if (!textEditActive) {
      setAnnotations([]);
      setActiveAnnotationId(null);
    }
  }, [textEditActive]);
  const handleAnnotationLocate = reactExports.useCallback(
    (id2) => {
      const session = textEditSessionRef.current;
      if (!workspaceId2 || !session) return;
      workspaceEvents.fireAnnotationCommand(workspaceId2, session, {
        type: "locate",
        id: id2,
      });
      setActiveAnnotationId(id2);
    },
    [workspaceId2],
  );
  const handleAnnotationDelete = reactExports.useCallback(
    (id2) => {
      const session = textEditSessionRef.current;
      if (!workspaceId2 || !session) return;
      workspaceEvents.fireAnnotationCommand(workspaceId2, session, {
        type: "delete",
        id: id2,
      });
    },
    [workspaceId2],
  );
  const handleAnnotationClear = reactExports.useCallback(() => {
    const session = textEditSessionRef.current;
    if (!workspaceId2 || !session) return;
    workspaceEvents.fireAnnotationCommand(workspaceId2, session, {
      type: "clear",
    });
  }, [workspaceId2]);
  const chatVisible =
    editSurfaceActive || stageState.workspaceMode !== "canvasOnly";
  const canvasOpen =
    editSurfaceActive || stageState.workspaceMode !== "chatOnly";
  const filesPresentationRef = reactExports.useRef("peek");
  if (stageState.filesMode !== "closed")
    filesPresentationRef.current = stageState.filesMode;
  const [filesSurfacePresentation, setFilesSurfacePresentation] =
    reactExports.useState("closed");
  const [displayModeSwitcherOpen, setDisplayModeSwitcherOpen] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isActive2 !== false) return;
    setDisplayModeSwitcherOpen(false);
    const textSession = textEditSessionRef.current;
    if (textSession) {
      textEditSessionRef.current = null;
      textEditSelectionRef.current = null;
      setHasTextEditSelection(false);
      leaveTextEditAgent(textSession);
      setTextEditSession(null);
    }
    const pluginSession = pluginEditSessionRef.current;
    if (pluginSession) {
      pluginEditSessionRef.current = null;
      leaveTextEditAgent(pluginSession);
      setPluginEditSession(null);
      setPluginEditAgentName(void 0);
      setPluginEditPluginId(void 0);
    }
  }, [isActive2, leaveTextEditAgent]);
  const { mode: globalSidebarMode, setPinned: setGlobalSidebarPinned } =
    useGlobalSidebar();
  const globalSidebarCollapsed = globalSidebarMode === "rail";
  const handleWorkspaceModeChange = reactExports.useCallback(
    (targetMode) => {
      if (targetMode === stageState.workspaceMode) return;
      if (targetMode === "chatOnly") {
        dispatchStage({
          type: "canvas/close",
        });
        return;
      }
      if (targetMode === "canvasOnly") {
        dispatchStage({
          type: "chat/close",
        });
        return;
      }
      dispatchStage({
        type:
          stageState.workspaceMode === "canvasOnly"
            ? "chat/open"
            : "canvas/open",
      });
    },
    [dispatchStage, stageState.workspaceMode],
  );
  const handleWorkspacePaneOrderChange = reactExports.useCallback(
    (targetOrder) => {
      if (targetOrder !== stageState.paneOrder) onPaneOrderChange(targetOrder);
    },
    [onPaneOrderChange, stageState.paneOrder],
  );
  const handleSidebarCollapsedChange = reactExports.useCallback(
    (collapsed) => {
      setGlobalSidebarPinned(!collapsed);
    },
    [setGlobalSidebarPinned],
  );
  const handleToggleFiles = reactExports.useCallback(() => {
    assetPanel.handleTogglePanel();
  }, [assetPanel]);
  const browserSurfaceSourceRef = reactExports.useRef("view_switch");
  const handleToggleBrowser = reactExports.useCallback(() => {
    browserSurfaceSourceRef.current = "view_switch";
    setBrowserOpen((open) => !open);
  }, [setBrowserOpen]);
  reactExports.useEffect(() => {
    if (!isActive2) return;
    const openBrowserFromFallback = () => {
      browserSurfaceSourceRef.current = "fallback_card";
      if (stageState.workspaceMode === "chatOnly")
        dispatchStage({
          type: "canvas/open",
        });
      setBrowserOpen(true);
    };
    const openBrowserFromAgent = () => {
      browserSurfaceSourceRef.current = "agent_request";
      if (stageState.workspaceMode === "chatOnly")
        dispatchStage({
          type: "canvas/open",
        });
      setBrowserOpen(true);
    };
    window.addEventListener("hilo:open-browser", openBrowserFromFallback);
    const unsubscribe =
      window.hilo?.browser?.onSurfaceRequested?.(openBrowserFromAgent);
    return () => {
      window.removeEventListener("hilo:open-browser", openBrowserFromFallback);
      unsubscribe?.();
    };
  }, [dispatchStage, isActive2, setBrowserOpen, stageState.workspaceMode]);
  const handleToggleFilesDock = reactExports.useCallback(() => {
    dispatchStage({
      type: stageState.filesMode === "docked" ? "files/undock" : "files/dock",
    });
  }, [dispatchStage, stageState.filesMode]);
  useChatReferenceReveal(
    isActive2,
    reactExports.useCallback(
      () =>
        dispatchStage({
          type: "chat/open",
        }),
      [dispatchStage],
    ),
  );
  const stageControlOverChat =
    !canvasOpen || (chatVisible && stageLayout.canvasSide === "left");
  const stageControlOverCanvas =
    canvasOpen && (!chatVisible || stageLayout.canvasSide === "right");
  const stageViewModeCompact = stageControlOverChat && canvasOpen;
  const stageViewModeControlEstimate = stageViewModeCompact
    ? WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH
    : stageState.workspaceMode === "split"
      ? WORKSPACE_VIEW_MODE_CONTROL_SPLIT_WIDTH
      : WORKSPACE_VIEW_MODE_CONTROL_WIDTH;
  const [stageViewModeMeasuredWidth, setStageViewModeMeasuredWidth] =
    reactExports.useState(null);
  const stageViewModeControlWidth =
    stageViewModeMeasuredWidth ?? stageViewModeControlEstimate;
  const stageViewModeTriggerRef = reactExports.useRef(null);
  const stageViewModeMenu = reactExports.useMemo(
    () => (
      <WorkspaceViewModeMenu
        mode={stageState.workspaceMode}
        paneOrder={stageState.paneOrder}
        onModeChange={handleWorkspaceModeChange}
        onPaneOrderChange={handleWorkspacePaneOrderChange}
        variant="stage-chrome"
        source="stage"
        compact={stageViewModeCompact}
        coachMarkEnabled={
          Boolean(isActive2) && stageLayoutReady && !displayModeSwitcherOpen
        }
        triggerRef={stageViewModeTriggerRef}
        onControlWidthChange={setStageViewModeMeasuredWidth}
      />
    ),
    [
      handleWorkspaceModeChange,
      handleWorkspacePaneOrderChange,
      stageState.paneOrder,
      stageState.workspaceMode,
      stageViewModeCompact,
      displayModeSwitcherOpen,
      isActive2,
      stageLayoutReady,
    ],
  );
  const displayModeSwitcher = (
    <WorkspaceDisplayModeSwitcher
      mode={stageState.workspaceMode}
      paneOrder={stageState.paneOrder}
      open={displayModeSwitcherOpen}
      onOpenChange={setDisplayModeSwitcherOpen}
      onModeChange={handleWorkspaceModeChange}
      onPaneOrderChange={handleWorkspacePaneOrderChange}
      isActive={Boolean(isActive2)}
      isReady={stageLayoutReady}
      sidebarCollapsed={globalSidebarCollapsed}
      onSidebarCollapsedChange={handleSidebarCollapsedChange}
      triggerRef={stageViewModeTriggerRef}
    />
  );
  const chatSurface = (
    <div
      className="relative h-full min-h-0 overflow-hidden bg-card"
      data-media-preview-boundary={browserOpen && canvasOpen ? "true" : "false"}
    >
      <ChatPanel
        isPresented={Boolean(isActive2 && chatVisible && stageLayoutReady)}
        headerActions={
          stageControlOverChat && (canvasOpen || !editSurfaceActive) ? (
            <span
              className="block h-8 shrink-0"
              style={{
                width: stageViewModeControlWidth,
              }}
              aria-hidden="true"
            />
          ) : (
            void 0
          )
        }
        textEditMode={textEditActive}
        textEditChatStatus={textEditChatStatus}
        textEditSession={textEditSession}
        textEditSelectionRef={textEditSelectionRef}
        hasTextEditSelection={hasTextEditSelection}
        pluginEditMode={pluginEditActive}
        pluginEditChatStatus={pluginEditChatStatus}
        pluginEditSession={pluginEditSession}
        pluginEditAgentName={pluginEditAgentName}
        pluginEditPluginId={pluginEditPluginId}
        annotations={annotations}
        activeAnnotationId={activeAnnotationId}
        onAnnotationLocate={handleAnnotationLocate}
        onAnnotationDelete={handleAnnotationDelete}
        onAnnotationClear={handleAnnotationClear}
      />
    </div>
  );
  const filesSurface = (
    <CanvasSidebarOverlay
      key={"project-files"}
      id={assetPanelId}
      controller={assetPanel}
      initialFolderPath={folderPath}
      mode={filesPresentationRef.current}
      seamSide="right"
      layoutOrder={2}
      onToggleDock={handleToggleFilesDock}
      onPresentationChange={setFilesSurfacePresentation}
    />
  );
  const filesOverlayInset =
    filesSurfacePresentation === "drawer-overlay"
      ? `${assetPanel.width + 8}px`
      : "0px";
  const stageControlsRightInset =
    8 +
    (stageControlOverCanvas
      ? resolveCanvasSidebarRightEdgeInset(
          filesSurfacePresentation,
          assetPanel.width,
        )
      : 0);
  const canvasViewport = (
    <div
      key={"canvas-viewport-host"}
      className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden [&:has([data-browser-annotating=true])_.workspace-view-switch]:hidden"
      data-workspace-canvas-viewport-host="true"
      data-layout-relocation-key={stageState.paneOrder}
      style={{
        order: 0,
        "--canvas-top-right-overlay-inset": stageControlOverCanvas
          ? `${stageViewModeControlWidth + WORKSPACE_VIEW_MODE_CONTROL_GAP}px`
          : "0px",
        "--canvas-top-right-panel-inset": filesOverlayInset,
        "--canvas-minimap-top-right-panel-inset": filesOverlayInset,
      }}
    >
      <MemoizedCanvasArea
        onCanvasTasksChange={onCanvasTasksChange}
        onRenderableContentChange={onRenderableContentChange}
        assetPanelOpen={stageState.filesMode !== "closed"}
        assetPanelControlsId={assetPanelId}
        onToggleAssetPanel={handleToggleFiles}
        browserOpen={browserOpen}
        onToggleBrowser={handleToggleBrowser}
        isActive={isActive2}
        isPresented={isActive2 && canvasOpen && !browserOpen}
        workspaceId={workspaceId2}
        workspaceName={workspaceName}
        getTextEditCloseBlockReason={getTextEditCloseBlockReason}
        toolbarPlacement={stageLayout.toolbarCorner}
        layoutRelocationKey={stageState.paneOrder}
      />
      {isActive2 && canvasOpen && (!editSurfaceActive || browserOpen) ? (
        <div className="workspace-view-switch absolute left-2 top-2 z-20">
          <WorkspaceViewSwitch
            target={browserOpen ? "canvas" : "browser"}
            onClick={handleToggleBrowser}
          />
        </div>
      ) : null}
      {isActive2 && browserOpen && canvasOpen ? (
        <div className="absolute inset-0 z-10">
          <WorkspaceBrowser
            onBackToCanvas={() => setBrowserOpen(false)}
            reserveViewSwitch={true}
            surfaceSource={browserSurfaceSourceRef.current}
          />
        </div>
      ) : null}
    </div>
  );
  const canvasSurface = (
    <div
      data-workspace-canvas-surface="base"
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background"
    >
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="relative flex-1 min-h-0 flex">
          {filesSurface}
          {canvasViewport}
        </div>
      </div>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div
        className="relative flex min-h-0 flex-1 overflow-hidden"
        data-canvas-sidebar-root="true"
        data-workspace-active={isActive2 === false ? "false" : "true"}
      >
        <WorkspaceStage
          isActive={isActive2}
          paneOrder={stageState.paneOrder}
          textEditMode={editSurfaceActive}
          chatVisible={chatVisible}
          canvasVisible={canvasOpen}
          chatRatio={chatRatio}
          onChatRatioChange={onChatRatioChange}
          onPaneOrderChange={editSurfaceActive ? void 0 : onPaneOrderChange}
          onCanvasPaneChange={onCanvasPaneChange}
          controls={editSurfaceActive ? void 0 : stageViewModeMenu}
          controlsRightInset={stageControlsRightInset}
          overlay={displayModeSwitcher}
          overlayOpen={displayModeSwitcherOpen}
          chat={chatSurface}
          canvas={canvasSurface}
        />
      </div>
      <RemoteToolHost />
    </div>
  );
}
