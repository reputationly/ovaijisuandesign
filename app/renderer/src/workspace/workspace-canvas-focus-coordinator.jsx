// workspace-canvas-focus-coordinator.jsx
import { useTranslation, reactExports, Globe } from "../vendor.js";
import { Tooltip, TooltipTrigger, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { useHasBlockingModal } from "../infra/thumbnail-load-scheduler.jsx";
import { TRACK_EVENTS, getPlatform } from "../infra/track-events.js";
import { workspaceEvents } from "./use-hub-logo-hover-animation.jsx";
import {
  TooltipContent,
  cn$2,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { useWorkspaceChatSelector } from "../assets/use-asset-picker-host.jsx";
import { ShortcutHint, WORKSPACE_DISPLAY_MODE_SHORTCUT } from "./shortcut-categories.jsx";
import { trackEvent } from "../infra/init-track.js";
import {
  CDN_WORKSPACE_DISPLAY_MODE_CHAT_CANVAS,
  CDN_WORKSPACE_DISPLAY_MODE_CANVAS_CHAT,
  CDN_WORKSPACE_DISPLAY_MODE_CANVAS,
  CDN_WORKSPACE_DISPLAY_MODE_CHAT,
} from "./new-workspace-dialog.jsx";
import { Switch } from "../generation/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { BrowserInspiration, BrowserStartSearch } from "./browser-inspiration-favicon-files.jsx";
import { BrowserBookmarks } from "./browser-inspiration-sites.jsx";
export function BrowserTabIcon({ tab: tab2 }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      {tab2.faviconUrl ? (
        <img src={tab2.faviconUrl} alt="" className="size-4 object-contain" />
      ) : (
        <Icon icon={Globe} size="sm" />
      )}
    </span>
  );
}
export function IconButton({
  buttonRef,
  actionId,
  label,
  active: active2,
  disabled: disabled2,
  onClick,
  children: children2,
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <button
          type="button"
          ref={buttonRef}
          {...(actionId
            ? {
                "data-action-ui-id": actionId,
              }
            : {})}
          aria-label={label}
          disabled={disabled2}
          onClick={onClick}
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${active2 ? "bg-foreground/10 text-foreground" : ""}`}
        >
          {children2}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
export function BrowserStartPage({
  searchHistory,
  onSelectHistory,
  onRemoveHistory,
  bookmarks,
  onSearch,
  onNavigate,
  onRemoveBookmark,
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-card px-8 py-12 scrollbar-fade">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-start gap-12 pt-[clamp(2rem,9vh,6rem)]">
        <BrowserStartSearch
          onSearch={onSearch}
          searchHistory={searchHistory}
          onSelectHistory={onSelectHistory}
          onRemoveHistory={onRemoveHistory}
        />
        <BrowserInspiration onNavigate={onNavigate} />
        <BrowserBookmarks
          bookmarks={bookmarks}
          onNavigate={onNavigate}
          onRemoveBookmark={onRemoveBookmark}
        />
      </div>
    </div>
  );
}
function shouldAutoRevealCanvas({
  isActive: isActive2,
  hasRenderableContent,
  autoReveal,
  projectRunning,
}) {
  return isActive2 && hasRenderableContent && autoReveal === "eligible" && !projectRunning;
}
export function WorkspaceCanvasAutoRevealBridge({
  isActive: isActive2,
  hasRenderableContent,
  autoReveal,
  onAutoReveal,
}) {
  const sessionStore = useWorkspaceChatSelector((chat) => chat.sessionStore);
  const focusedSessionRunning = useWorkspaceChatSelector(
    (chat) => chat.busy || chat.pendingReasons.length > 0,
  );
  const readProjectRunning = reactExports.useCallback(
    () =>
      Array.from(sessionStore.getState().sessions.values()).some(
        (session) => session.busy || session.pendingReasons.length > 0,
      ),
    [sessionStore],
  );
  const [projectRunning, setProjectRunning] = reactExports.useState(readProjectRunning);
  reactExports.useEffect(() => {
    const sync = () => setProjectRunning(readProjectRunning());
    sync();
    return sessionStore.subscribe(sync);
  }, [readProjectRunning, sessionStore]);
  reactExports.useEffect(() => {
    if (
      shouldAutoRevealCanvas({
        isActive: isActive2,
        hasRenderableContent,
        autoReveal,
        projectRunning: focusedSessionRunning || projectRunning,
      })
    ) {
      onAutoReveal();
    }
  }, [
    autoReveal,
    focusedSessionRunning,
    hasRenderableContent,
    isActive2,
    onAutoReveal,
    projectRunning,
  ]);
  return null;
}
const CANVAS_NAVIGATION_TIMEOUT_MS = 4e3;
function hasPositiveBounds(element2) {
  if (!element2) return false;
  const bounds = element2.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}
export function WorkspaceCanvasFocusCoordinator({
  workspaceId: workspaceId2,
  isActive: isActive2,
  canvasVisible: canvasExpanded,
  browserOpen = false,
  onEnsureCanvasVisible,
  getCanvasPane,
}) {
  const canvasVisible = canvasExpanded && !browserOpen;
  const isActiveRef = reactExports.useRef(isActive2);
  const canvasVisibleRef = reactExports.useRef(canvasVisible);
  const onEnsureCanvasVisibleRef = reactExports.useRef(onEnsureCanvasVisible);
  const getCanvasPaneRef = reactExports.useRef(getCanvasPane);
  const pendingRef = reactExports.useRef(null);
  const latestTokenRef = reactExports.useRef(0);
  const runningTokenRef = reactExports.useRef(null);
  const probeFrameRef = reactExports.useRef(null);
  const settleFrameRef = reactExports.useRef(null);
  const timeoutRef = reactExports.useRef(null);
  const resizeObserverRef = reactExports.useRef(null);
  const observedPaneRef = reactExports.useRef(null);
  const recheckBoundsRef = reactExports.useRef(null);
  isActiveRef.current = isActive2;
  canvasVisibleRef.current = canvasVisible;
  onEnsureCanvasVisibleRef.current = onEnsureCanvasVisible;
  getCanvasPaneRef.current = getCanvasPane;
  const cancelWait = reactExports.useCallback(() => {
    if (probeFrameRef.current !== null) {
      cancelAnimationFrame(probeFrameRef.current);
      probeFrameRef.current = null;
    }
    if (settleFrameRef.current !== null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    observedPaneRef.current = null;
    recheckBoundsRef.current = null;
    runningTokenRef.current = null;
  }, []);
  const beginPending = reactExports.useCallback(() => {
    const pending2 = pendingRef.current;
    if (!pending2 || !isActiveRef.current) return;
    if (!canvasVisibleRef.current && !pending2.ensureRequested) {
      pending2.ensureRequested = true;
      onEnsureCanvasVisibleRef.current();
    }
    if (runningTokenRef.current === pending2.token) {
      recheckBoundsRef.current?.();
      return;
    }
    cancelWait();
    runningTokenRef.current = pending2.token;
    const isCurrent = () => {
      const current2 = pendingRef.current;
      return Boolean(
        current2 &&
        current2.token === pending2.token &&
        latestTokenRef.current === pending2.token &&
        isActiveRef.current,
      );
    };
    const cancelThisWait = () => {
      if (runningTokenRef.current === pending2.token) cancelWait();
    };
    const deliver = () => {
      const current2 = pendingRef.current;
      if (!current2 || current2.token !== pending2.token || !isCurrent()) return;
      pendingRef.current = null;
      cancelWait();
      if (current2.kind === "focus") {
        workspaceEvents.deliverCanvasFocus(current2.event.workspaceId, current2.event.nodeIds, {
          ...(current2.event.select !== void 0
            ? {
                select: current2.event.select,
              }
            : {}),
          ...(current2.event.preferParentGroup !== void 0
            ? {
                preferParentGroup: current2.event.preferParentGroup,
              }
            : {}),
        });
      } else {
        workspaceEvents.deliverLocateCanvasFile(
          current2.event.workspaceId,
          current2.event.path ?? "",
          {
            ...(current2.event.nodeIds
              ? {
                  nodeIds: current2.event.nodeIds,
                }
              : {}),
            ...(current2.event.paths
              ? {
                  paths: current2.event.paths,
                }
              : {}),
            ...(current2.event.preferParentGroup
              ? {
                  preferParentGroup: true,
                }
              : {}),
          },
        );
      }
    };
    let settling = false;
    let stableFrames = 0;
    const cancelSettle = () => {
      if (settleFrameRef.current !== null) {
        cancelAnimationFrame(settleFrameRef.current);
        settleFrameRef.current = null;
      }
      settling = false;
      stableFrames = 0;
    };
    let checkBounds;
    const scheduleProbe = () => {
      if (probeFrameRef.current !== null) return;
      probeFrameRef.current = requestAnimationFrame(() => {
        probeFrameRef.current = null;
        checkBounds();
      });
    };
    const settle2 = () => {
      settleFrameRef.current = null;
      if (!isCurrent()) {
        cancelThisWait();
        return;
      }
      if (!canvasVisibleRef.current || !hasPositiveBounds(getCanvasPaneRef.current())) {
        cancelSettle();
        checkBounds();
        return;
      }
      stableFrames += 1;
      if (stableFrames >= 2) {
        deliver();
        return;
      }
      settleFrameRef.current = requestAnimationFrame(settle2);
    };
    checkBounds = () => {
      if (!isCurrent()) {
        cancelThisWait();
        return;
      }
      const pane = getCanvasPaneRef.current();
      if (pane !== observedPaneRef.current) {
        resizeObserverRef.current?.disconnect();
        observedPaneRef.current = pane;
        if (pane && resizeObserverRef.current) resizeObserverRef.current.observe(pane);
      }
      const boundsReady = canvasVisibleRef.current && hasPositiveBounds(getCanvasPaneRef.current());
      if (!boundsReady) {
        cancelSettle();
        if (!resizeObserverRef.current || !pane) scheduleProbe();
        return;
      }
      if (probeFrameRef.current !== null) {
        cancelAnimationFrame(probeFrameRef.current);
        probeFrameRef.current = null;
      }
      if (settling) return;
      settling = true;
      stableFrames = 0;
      settleFrameRef.current = requestAnimationFrame(settle2);
    };
    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(checkBounds);
    }
    recheckBoundsRef.current = checkBounds;
    timeoutRef.current = window.setTimeout(() => {
      const current2 = pendingRef.current;
      if (current2?.token === pending2.token) pendingRef.current = null;
      cancelThisWait();
    }, CANVAS_NAVIGATION_TIMEOUT_MS);
    checkBounds();
  }, [cancelWait]);
  reactExports.useEffect(() => {
    if (!isActive2) {
      const pending22 = pendingRef.current;
      if (pending22 && !pending22.hasObservedVisibleCanvas) pending22.ensureRequested = false;
      cancelWait();
      return;
    }
    const pending2 = pendingRef.current;
    if (pending2) {
      if (canvasVisible) {
        pending2.hasObservedVisibleCanvas = true;
      } else if (pending2.hasObservedVisibleCanvas) {
        pendingRef.current = null;
        cancelWait();
        return;
      }
    }
    beginPending();
  }, [beginPending, cancelWait, canvasVisible, isActive2]);
  reactExports.useEffect(() => {
    const queueRequest = (request) => {
      cancelWait();
      const token2 = latestTokenRef.current + 1;
      latestTokenRef.current = token2;
      pendingRef.current =
        request.event.workspaceId === workspaceId2
          ? {
              ...request,
              token: token2,
              ensureRequested: false,
              hasObservedVisibleCanvas: canvasVisibleRef.current,
            }
          : null;
      beginPending();
    };
    const focusSubscription = workspaceEvents.onCanvasFocusRequest((event) => {
      queueRequest({
        kind: "focus",
        event,
      });
    });
    const locateSubscription = workspaceEvents.onLocateCanvasFileRequest((event) => {
      queueRequest({
        kind: "locate",
        event,
      });
    });
    return () => {
      focusSubscription.dispose();
      locateSubscription.dispose();
      latestTokenRef.current += 1;
      pendingRef.current = null;
      cancelWait();
    };
  }, [beginPending, cancelWait, workspaceId2]);
  return null;
}
function isWorkspaceDisplayModeShortcut(event, os2) {
  if (event.isComposing || event.code !== "Backslash" || event.altKey || event.shiftKey) {
    return false;
  }
  return os2 === "darwin" ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
const DISPLAY_MODE_OPTIONS = [
  {
    id: "chatCanvas",
    mode: "split",
    paneOrder: "chat-canvas",
    tagKey: "workspace.displayMode.splitTag",
    fallbackTag: "Split layout",
    labelKey: "workspace.displayMode.chatLeftCanvasRight",
    fallbackLabel: "Chat left + Canvas right",
    previewImage: CDN_WORKSPACE_DISPLAY_MODE_CHAT_CANVAS,
  },
  {
    id: "canvasChat",
    mode: "split",
    paneOrder: "canvas-chat",
    tagKey: "workspace.displayMode.splitTag",
    fallbackTag: "Split layout",
    labelKey: "workspace.displayMode.canvasLeftChatRight",
    fallbackLabel: "Canvas left + Chat right",
    previewImage: CDN_WORKSPACE_DISPLAY_MODE_CANVAS_CHAT,
  },
  {
    id: "canvasOnly",
    mode: "canvasOnly",
    tagKey: "workspace.displayMode.focusTag",
    fallbackTag: "Focus mode",
    labelKey: "workspace.displayMode.canvasFocus",
    fallbackLabel: "Canvas only",
    previewImage: CDN_WORKSPACE_DISPLAY_MODE_CANVAS,
  },
  {
    id: "chatOnly",
    mode: "chatOnly",
    tagKey: "workspace.displayMode.focusTag",
    fallbackTag: "Focus mode",
    labelKey: "workspace.displayMode.chatFocus",
    fallbackLabel: "Chat only",
    previewImage: CDN_WORKSPACE_DISPLAY_MODE_CHAT,
  },
];
const DISPLAY_MODE_ORDER = DISPLAY_MODE_OPTIONS.map((option2) => option2.id);
function getDisplayModeOptionId(mode2, paneOrder) {
  if (mode2 === "canvasOnly") return "canvasOnly";
  if (mode2 === "chatOnly") return "chatOnly";
  return paneOrder === "chat-canvas" ? "chatCanvas" : "canvasChat";
}
function WorkspaceModePreview({ mode: mode2, previewImage: previewImage2 }) {
  const pane = mode2 === "chatOnly" ? "chat" : "canvas";
  const [status, setStatus] = reactExports.useState("loading");
  return (
    <div
      className={cn$2(
        "relative h-full w-full overflow-hidden rounded-md bg-card",
        status !== "ready" && "workspace-display-mode-preview-fallback",
      )}
      data-workspace-display-preview-status={status}
    >
      <img
        alt=""
        aria-hidden="true"
        className={cn$2(
          "workspace-display-preview absolute inset-0 size-full object-cover transition-opacity duration-200",
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
        src={previewImage2}
        decoding="async"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("failed")}
        data-workspace-display-preview-pane={pane}
      />
    </div>
  );
}
export function WorkspaceDisplayModeSwitcher({
  mode: mode2,
  paneOrder,
  open,
  onOpenChange,
  onModeChange,
  onPaneOrderChange,
  isActive: isActive2,
  isReady,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  triggerRef,
}) {
  const { t: t2 } = useTranslation();
  const hasBlockingModal = useHasBlockingModal();
  const platformOs = getPlatform().app.os;
  const [selectedOptionId, setSelectedOptionId] = reactExports.useState(() =>
    getDisplayModeOptionId(mode2, paneOrder),
  );
  const [selectedSidebarCollapsed, setSelectedSidebarCollapsed] =
    reactExports.useState(sidebarCollapsed);
  const previousActiveElementRef = reactExports.useRef(null);
  const optionRefs = reactExports.useRef({
    canvasOnly: null,
    chatOnly: null,
    chatCanvas: null,
    canvasChat: null,
  });
  const restoreFocus = reactExports.useCallback(
    (target) => {
      window.setTimeout(() => {
        const nextFocus =
          target === "trigger" ? triggerRef?.current : previousActiveElementRef.current;
        if (nextFocus?.isConnected) nextFocus.focus();
      }, 0);
    },
    [triggerRef],
  );
  const closeWithoutApplying = reactExports.useCallback(
    (reason) => {
      setSelectedOptionId(getDisplayModeOptionId(mode2, paneOrder));
      setSelectedSidebarCollapsed(sidebarCollapsed);
      onOpenChange(false);
      trackEvent(TRACK_EVENTS.DIALOG_CLOSE, {
        dialog_name: "workspace_display_mode_switcher",
        reason,
        applied_mode: mode2,
        selected_mode: selectedOptionId,
      });
      restoreFocus("previous");
    },
    [mode2, onOpenChange, paneOrder, restoreFocus, selectedOptionId, sidebarCollapsed],
  );
  const applyOption = reactExports.useCallback(
    (option2, source) => {
      onModeChange(option2.mode);
      if (option2.mode === "split" && option2.paneOrder && option2.paneOrder !== paneOrder) {
        onPaneOrderChange(option2.paneOrder);
      }
      if (selectedSidebarCollapsed !== sidebarCollapsed) {
        onSidebarCollapsedChange(selectedSidebarCollapsed);
      }
      onOpenChange(false);
      trackEvent(TRACK_EVENTS.DIALOG_CLOSE, {
        dialog_name: "workspace_display_mode_switcher",
        reason: "confirm",
        source,
        from_mode: mode2,
        to_mode: option2.mode,
        to_option: option2.id,
      });
      restoreFocus("trigger");
    },
    [
      mode2,
      onModeChange,
      onOpenChange,
      onPaneOrderChange,
      onSidebarCollapsedChange,
      paneOrder,
      restoreFocus,
      selectedSidebarCollapsed,
      sidebarCollapsed,
    ],
  );
  reactExports.useEffect(() => {
    if (!open) {
      setSelectedOptionId(getDisplayModeOptionId(mode2, paneOrder));
      setSelectedSidebarCollapsed(sidebarCollapsed);
    }
  }, [mode2, open, paneOrder, sidebarCollapsed]);
  reactExports.useEffect(() => {
    if (!open) return;
    optionRefs.current[selectedOptionId]?.focus();
  }, [open, selectedOptionId]);
  reactExports.useEffect(() => {
    if ((!isActive2 || !isReady || hasBlockingModal) && open) {
      onOpenChange(false);
      setSelectedOptionId(getDisplayModeOptionId(mode2, paneOrder));
      setSelectedSidebarCollapsed(sidebarCollapsed);
      restoreFocus("previous");
    }
  }, [
    hasBlockingModal,
    isActive2,
    isReady,
    mode2,
    onOpenChange,
    open,
    paneOrder,
    restoreFocus,
    sidebarCollapsed,
  ]);
  const handleKeyDownRef = reactExports.useRef(() => void 0);
  handleKeyDownRef.current = (event) => {
    if (isWorkspaceDisplayModeShortcut(event, platformOs)) {
      if (!isReady || hasBlockingModal || event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      if (open) {
        closeWithoutApplying("cancel");
        return;
      }
      previousActiveElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setSelectedOptionId(getDisplayModeOptionId(mode2, paneOrder));
      setSelectedSidebarCollapsed(sidebarCollapsed);
      onOpenChange(true);
      trackEvent(TRACK_EVENTS.DIALOG_OPEN, {
        dialog_name: "workspace_display_mode_switcher",
        trigger: "shortcut",
        applied_mode: mode2,
      });
      return;
    }
    if (!open || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeWithoutApplying("esc");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const selectedOption = DISPLAY_MODE_OPTIONS.find(
        (option2) => option2.id === selectedOptionId,
      );
      if (selectedOption) applyOption(selectedOption, "keyboard");
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = DISPLAY_MODE_ORDER.indexOf(selectedOptionId);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + DISPLAY_MODE_ORDER.length) % DISPLAY_MODE_ORDER.length;
    const nextOptionId = DISPLAY_MODE_ORDER[nextIndex];
    const nextOption = DISPLAY_MODE_OPTIONS[nextIndex];
    setSelectedOptionId(nextOptionId);
    trackEvent(TRACK_EVENTS.DIALOG_STEP_CHANGE, {
      dialog_name: "workspace_display_mode_switcher",
      from_mode: DISPLAY_MODE_OPTIONS[currentIndex].mode,
      to_mode: nextOption.mode,
      from_option: selectedOptionId,
      to_option: nextOptionId,
      source: "keyboard",
    });
  };
  reactExports.useEffect(() => {
    if (!isActive2) return;
    const handleKeyDown2 = (event) => handleKeyDownRef.current(event);
    window.addEventListener("keydown", handleKeyDown2, true);
    return () => window.removeEventListener("keydown", handleKeyDown2, true);
  }, [isActive2]);
  if (!open) return null;
  const options = DISPLAY_MODE_OPTIONS.map((option2) => ({
    ...option2,
    tag: option2.tagKey ? t2(option2.tagKey, option2.fallbackTag ?? "") : void 0,
    label: t2(option2.labelKey, option2.fallbackLabel),
  }));
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) closeWithoutApplying("cancel");
      }}
    >
      <DialogContent
        showCloseButton={false}
        size="xl"
        className="inset-0 top-0 left-0 flex h-dvh w-dvw max-w-none translate-x-0 translate-y-0 items-center justify-center overflow-auto rounded-none border-0 bg-transparent p-6 text-workspace-display-mode-mask-foreground shadow-none duration-200 data-open:zoom-in-100 data-closed:zoom-out-100 sm:max-w-none"
        overlayClassName="workspace-display-mode-mask duration-200"
        data-action-ui-id="workspace.display-mode.overlay"
      >
        <div className="workspace-display-mode-panel flex w-full max-w-[1200px] flex-col items-center text-center">
          <DialogHeader className="items-center gap-2 text-center">
            <DialogTitle className="text-lg">
              {t2("workspace.displayMode.title", "Switch layout mode")}
            </DialogTitle>
            <DialogDescription className="text-workspace-display-mode-mask-foreground text-sm">
              {t2(
                "workspace.displayMode.description",
                "Choose the layout for Chat and Canvas in this Project",
              )}
            </DialogDescription>
          </DialogHeader>
          <div
            role="radiogroup"
            aria-label={t2("workspace.layout.mode", "Layout mode")}
            className="mt-11 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {options.map((option2) => {
              const selected2 = selectedOptionId === option2.id;
              const current2 = getDisplayModeOptionId(mode2, paneOrder) === option2.id;
              return (
                <div
                  key={option2.id}
                  className={cn$2(
                    "workspace-display-mode-card flex min-w-0 flex-col rounded-xl border border-border bg-card p-1.5",
                    selected2 && "workspace-display-mode-card-selected",
                  )}
                  data-selected={selected2 ? "true" : "false"}
                >
                  <button
                    ref={(element2) => {
                      optionRefs.current[option2.id] = element2;
                    }}
                    type="button"
                    role="radio"
                    aria-label={option2.tag ? `${option2.tag}: ${option2.label}` : option2.label}
                    aria-checked={selected2}
                    tabIndex={selected2 ? 0 : -1}
                    data-action-ui-id={`workspace.display-mode.card.${option2.id}`}
                    data-selected={selected2 ? "true" : "false"}
                    onFocus={() => {
                      if (selected2) return;
                      setSelectedOptionId(option2.id);
                    }}
                    onClick={() => applyOption(option2, "pointer")}
                    className="group flex w-full flex-col items-center gap-2 rounded-lg p-0 text-left outline-none"
                  >
                    <span className="flex h-6 w-full shrink-0 items-center justify-between gap-2 pl-2 pr-1.5">
                      {option2.tag ? (
                        <span className="text-sm font-normal leading-5 text-foreground">
                          {option2.tag}
                        </span>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      {current2 ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground"
                          data-workspace-display-mode-current="true"
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-brand-accent/80"
                          />
                          {t2("workspace.displayMode.currentTag", "Current")}
                        </span>
                      ) : null}
                    </span>
                    <span className="relative h-16 w-full overflow-hidden rounded-md border border-border bg-background p-0">
                      <WorkspaceModePreview
                        mode={option2.mode}
                        previewImage={option2.previewImage}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 z-10 bg-workspace-display-mode-current-mask"
                      />
                      <span className="absolute inset-0 z-20 flex items-center justify-center px-3 text-base font-semibold leading-5 text-workspace-display-mode-current-tag-foreground">
                        {option2.label}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-11 flex w-full items-end justify-between gap-6 text-workspace-display-mode-mask-foreground text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5">
                <ShortcutHint accelerator="←" className="h-5 min-w-5 px-1.5" />
                <ShortcutHint accelerator="→" className="h-5 min-w-5 px-1.5" />
                {t2("workspace.displayMode.navigateHint", "Select")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShortcutHint accelerator="Enter" className="h-5 min-w-5 px-1.5" />
                {t2("workspace.displayMode.confirmHint", "Apply")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShortcutHint accelerator="Esc" className="h-5 min-w-5 px-1.5" />
                {t2("workspace.displayMode.cancelHint", "Cancel")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShortcutHint
                  accelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.mac}
                  otherAccelerator={WORKSPACE_DISPLAY_MODE_SHORTCUT.other}
                  os={platformOs}
                  className="h-5 min-w-5 px-1.5"
                />
                {t2("workspace.displayMode.toggleHint", "Close")}
              </span>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 text-xs text-workspace-display-mode-mask-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span>{t2("workspace.displayMode.primarySidebar", "Primary sidebar")}</span>
                <span className="text-workspace-display-mode-mask-foreground/60">
                  {selectedSidebarCollapsed
                    ? t2("workspace.displayMode.primarySidebar.collapsed", "Collapsed")
                    : t2("workspace.displayMode.primarySidebar.open", "Expanded")}
                </span>
              </span>
              <Switch
                checked={!selectedSidebarCollapsed}
                id="workspace-display-mode-primary-sidebar-switch"
                aria-label={`${t2("workspace.displayMode.primarySidebar", "Primary sidebar")}: ${selectedSidebarCollapsed ? t2("workspace.displayMode.primarySidebar.collapsed", "Collapsed") : t2("workspace.displayMode.primarySidebar.open", "Expanded")}`}
                data-workspace-display-mode-primary-sidebar="true"
                onCheckedChange={(checked) => setSelectedSidebarCollapsed(!checked)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
