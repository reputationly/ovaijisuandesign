// workspace-content.jsx
import { reactExports, useNavigate, API_PATHS } from "../vendor.js";
import { buildWorkspaceSearch } from "./create-visible-preview-tabs-store.js";
import { workspaceEvents } from "./use-hub-logo-hover-animation.jsx";
import { useGatewayFetch } from "../generation/use-resizable-width.js";
import { useWorkspaceChatSelector } from "../assets/use-asset-picker-host.jsx";
import { redactForCurrentRegion } from "../generation/resolve-chat-file-reference.js";
import {
  CanvasSidebarOverlay,
  resolveCanvasSidebarRightEdgeInset,
} from "./home-widget-host.jsx";
import { useGlobalSidebar } from "../media-editing/remote-tool-host.jsx";
import { useSettingsDialog } from "../settings/custom-provider-form.jsx";
import { getCanvasTaskSnapshot } from "../canvas/sticker-cursor-preview-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ChatPanel } from "../chat/chat-panel.jsx";
import {
  WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH,
  WORKSPACE_VIEW_MODE_CONTROL_GAP,
  WORKSPACE_VIEW_MODE_CONTROL_SPLIT_WIDTH,
  WORKSPACE_VIEW_MODE_CONTROL_WIDTH,
  WorkspaceViewModeMenu,
} from "./use-adopt-initial-attachments.jsx";
import { useBrowserVideoDownload } from "../media-editing/use-browser-video-download.jsx";
import { WorkspaceBrowser, WorkspaceViewSwitch } from "./workspace-browser.jsx";
import { WorkspaceDisplayModeSwitcher } from "./workspace-canvas-focus-coordinator.jsx";
import {
  MemoizedCanvasArea,
  RemoteToolHost,
  selectWorkspaceStageLayout,
  useChatReferenceReveal,
  useDocumentEditReviewHost,
} from "./workspace-stage-reducer.jsx";
import { WorkspaceStage } from "./workspace-stage.jsx";
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
  const [pluginEditAgentName, setPluginEditAgentName] = reactExports.useState(void 0);
  const [pluginEditPluginId, setPluginEditPluginId] = reactExports.useState(void 0);
  const pluginEditSessionRef = reactExports.useRef(null);
  const pluginEditActive = pluginEditSession !== null;
  const editSurfaceActive = textEditActive || pluginEditActive;
  const enterTextEditAgent = useWorkspaceChatSelector((chat) => chat.enterTextEditAgent);
  const leaveTextEditAgent = useWorkspaceChatSelector((chat) => chat.leaveTextEditAgent);
  const clearTextEditSessionsForNode = useWorkspaceChatSelector(
    (chat) => chat.clearTextEditSessionsForNode,
  );
  const textEditAgentState = useWorkspaceChatSelector((chat) => chat.textEditAgentState);
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
  const [hasTextEditSelection, setHasTextEditSelection] = reactExports.useState(false);
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
      if (current2?.nodeId === e2.nodeId && current2.editSessionId === e2.editSessionId) {
        leaveTextEditAgent(session);
        textEditSessionRef.current = null;
        textEditSelectionRef.current = null;
        setHasTextEditSelection(false);
        setTextEditSession(null);
      }
    });
    return () => d2.dispose();
  }, [dispatchStage, enterTextEditAgent, isActive2, leaveTextEditAgent, workspaceId2]);
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
      if (current2?.nodeId === e2.nodeId && current2.editSessionId === e2.editSessionId) {
        leaveTextEditAgent(session);
        pluginEditSessionRef.current = null;
        setPluginEditSession(null);
        setPluginEditAgentName(void 0);
        setPluginEditPluginId(void 0);
      }
    });
    return () => d2.dispose();
  }, [dispatchStage, enterTextEditAgent, isActive2, leaveTextEditAgent, workspaceId2]);
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onTextNodeRemoved((e2) => {
      if (e2.workspaceId !== workspaceId2) return;
      clearTextEditSessionsForNode(e2.nodeId);
    });
    return () => d2.dispose();
  }, [clearTextEditSessionsForNode, workspaceId2]);
  const [annotations, setAnnotations] = reactExports.useState([]);
  const [activeAnnotationId, setActiveAnnotationId] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (isActive2 === false) return;
    const matchesCurrentEditor = (event) => {
      const current2 = textEditSessionRef.current;
      return current2?.nodeId === event.nodeId && current2.editSessionId === event.editSessionId;
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
  const chatVisible = editSurfaceActive || stageState.workspaceMode !== "canvasOnly";
  const canvasOpen = editSurfaceActive || stageState.workspaceMode !== "chatOnly";
  const filesPresentationRef = reactExports.useRef("peek");
  if (stageState.filesMode !== "closed") filesPresentationRef.current = stageState.filesMode;
  const [filesSurfacePresentation, setFilesSurfacePresentation] = reactExports.useState("closed");
  const [displayModeSwitcherOpen, setDisplayModeSwitcherOpen] = reactExports.useState(false);
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
  const { mode: globalSidebarMode, setPinned: setGlobalSidebarPinned } = useGlobalSidebar();
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
        type: stageState.workspaceMode === "canvasOnly" ? "chat/open" : "canvas/open",
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
    const unsubscribe = window.hilo?.browser?.onSurfaceRequested?.(openBrowserFromAgent);
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
  const stageControlOverChat = !canvasOpen || (chatVisible && stageLayout.canvasSide === "left");
  const stageControlOverCanvas = canvasOpen && (!chatVisible || stageLayout.canvasSide === "right");
  const stageViewModeCompact = stageControlOverChat && canvasOpen;
  const stageViewModeControlEstimate = stageViewModeCompact
    ? WORKSPACE_VIEW_MODE_CONTROL_COMPACT_WIDTH
    : stageState.workspaceMode === "split"
      ? WORKSPACE_VIEW_MODE_CONTROL_SPLIT_WIDTH
      : WORKSPACE_VIEW_MODE_CONTROL_WIDTH;
  const [stageViewModeMeasuredWidth, setStageViewModeMeasuredWidth] = reactExports.useState(null);
  const stageViewModeControlWidth = stageViewModeMeasuredWidth ?? stageViewModeControlEstimate;
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
        coachMarkEnabled={Boolean(isActive2) && stageLayoutReady && !displayModeSwitcherOpen}
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
    filesSurfacePresentation === "drawer-overlay" ? `${assetPanel.width + 8}px` : "0px";
  const stageControlsRightInset =
    8 +
    (stageControlOverCanvas
      ? resolveCanvasSidebarRightEdgeInset(filesSurfacePresentation, assetPanel.width)
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
export function SkillPromptInjector({ skillPrompt, skillName, workspaceId: workspaceId2 }) {
  const setInput = useWorkspaceChatSelector((chat) => chat.setInput);
  const trackInputChange = useWorkspaceChatSelector((chat) => chat.trackInputChange);
  const navigate = useNavigate();
  const scopedFetch = useGatewayFetch();
  const applied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (applied.current) return;
    if (!skillName && !skillPrompt) return;
    applied.current = true;
    const clearSearch = () =>
      navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
          skillPrompt: void 0,
          skillName: void 0,
        }),
        replace: true,
      });
    if (skillName) {
      scopedFetch(API_PATHS.skills)
        .then((r2) => (r2.ok ? r2.json() : []))
        .then((data2) => {
          if (!Array.isArray(data2)) return;
          const skill = data2.find(
            (s2) => s2 != null && typeof s2 === "object" && "name" in s2 && s2.name === skillName,
          );
          if (skill) {
            requestAnimationFrame(() => {
              workspaceEvents.queueAddSkillToChat(workspaceId2 ?? "", skill);
            });
          }
        })
        .catch(() => {})
        .finally(clearSearch);
      return;
    }
    if (skillPrompt) {
      setInput(skillPrompt);
      trackInputChange(skillPrompt);
      clearSearch();
    }
  }, [skillName, skillPrompt, setInput, trackInputChange, navigate, workspaceId2, scopedFetch]);
  return null;
}
export function MenuActionInjector({ skillPrompt, menuAction, workspaceId: workspaceId2 }) {
  const navigate = useNavigate();
  const connected = useWorkspaceChatSelector((chat) => chat.connected);
  const sendWsMessage = useWorkspaceChatSelector((chat) => chat.sendWsMessage);
  const { openSettings } = useSettingsDialog();
  const handledRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!menuAction) {
      handledRef.current = null;
      return;
    }
    if (handledRef.current === menuAction) return;
    if (menuAction === "open-settings") {
      handledRef.current = menuAction;
      openSettings();
      void navigate({
        to: "/workspace",
        search: buildWorkspaceSearch(workspaceId2 ?? "", {
          skillPrompt,
        }),
        replace: true,
      });
      return;
    }
    if (!connected) return;
    handledRef.current = menuAction;
    sendWsMessage({
      type: "create_session",
    });
    void navigate({
      to: "/workspace",
      search: buildWorkspaceSearch(workspaceId2 ?? "", {
        skillPrompt,
      }),
      replace: true,
    });
  }, [connected, menuAction, navigate, openSettings, sendWsMessage, skillPrompt, workspaceId2]);
  return null;
}
const TASK_PROMPT_PREVIEW_MAX_LENGTH = 36;
export function normalizeTaskPromptPreview(content2) {
  const normalized = content2.replace(/\s+/g, " ").trim();
  if (!normalized) return void 0;
  return normalized.length > TASK_PROMPT_PREVIEW_MAX_LENGTH
    ? `${normalized.slice(0, TASK_PROMPT_PREVIEW_MAX_LENGTH)}...`
    : normalized;
}
export function getLatestUserPromptPreview(messages2) {
  if (!messages2) return void 0;
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (message2.role !== "user" || message2.type !== "text") continue;
    const preview = normalizeTaskPromptPreview(message2.content);
    if (preview) return redactForCurrentRegion(preview);
  }
  return void 0;
}
export function patchCanvasTasks(prev, update2) {
  const next2 = new Map(prev.map((task) => [task.id, task]));
  for (const id2 of update2.removedNodeIds ?? []) {
    next2.delete(id2);
  }
  for (const node2 of update2.addedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node2);
    if (task) next2.set(task.id, task);
  }
  for (const node2 of update2.updatedNodes ?? []) {
    const task = getCanvasTaskSnapshot(node2);
    if (task) {
      next2.set(task.id, task);
      continue;
    }
    next2.delete(node2.id);
  }
  return Array.from(next2.values());
}
