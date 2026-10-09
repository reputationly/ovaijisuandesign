// workspace-display-mode-switcher.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  CDN_WORKSPACE_DISPLAY_MODE_CANVAS,
  CDN_WORKSPACE_DISPLAY_MODE_CANVAS_CHAT,
  CDN_WORKSPACE_DISPLAY_MODE_CHAT,
  CDN_WORKSPACE_DISPLAY_MODE_CHAT_CANVAS,
} from "./context-menu-content.jsx";
import { useHasBlockingModal } from "../infra/schedule.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { getPlatform } from "../infra/web-storage.js";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import {
  ShortcutHint,
  WORKSPACE_DISPLAY_MODE_SHORTCUT,
} from "./shortcut-hint.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { Switch } from "../generation/select-content.jsx";
function isWorkspaceDisplayModeShortcut(event, os2) {
  if (
    event.isComposing ||
    event.code !== "Backslash" ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }
  return os2 === "darwin"
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
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
      className={cn(
        "relative h-full w-full overflow-hidden rounded-md bg-card",
        status !== "ready" && "workspace-display-mode-preview-fallback",
      )}
      data-workspace-display-preview-status={status}
    >
      <img
        alt=""
        aria-hidden="true"
        className={cn(
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
          target === "trigger"
            ? triggerRef?.current
            : previousActiveElementRef.current;
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
    [
      mode2,
      onOpenChange,
      paneOrder,
      restoreFocus,
      selectedOptionId,
      sidebarCollapsed,
    ],
  );
  const applyOption = reactExports.useCallback(
    (option2, source) => {
      onModeChange(option2.mode);
      if (
        option2.mode === "split" &&
        option2.paneOrder &&
        option2.paneOrder !== paneOrder
      ) {
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
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
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
      (currentIndex + direction + DISPLAY_MODE_ORDER.length) %
      DISPLAY_MODE_ORDER.length;
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
    tag: option2.tagKey
      ? t2(option2.tagKey, option2.fallbackTag ?? "")
      : void 0,
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
              const current2 =
                getDisplayModeOptionId(mode2, paneOrder) === option2.id;
              return (
                <div
                  key={option2.id}
                  className={cn(
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
                    aria-label={
                      option2.tag
                        ? `${option2.tag}: ${option2.label}`
                        : option2.label
                    }
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
                <ShortcutHint
                  accelerator="Enter"
                  className="h-5 min-w-5 px-1.5"
                />
                {t2("workspace.displayMode.confirmHint", "Apply")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShortcutHint
                  accelerator="Esc"
                  className="h-5 min-w-5 px-1.5"
                />
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
                <span>
                  {t2(
                    "workspace.displayMode.primarySidebar",
                    "Primary sidebar",
                  )}
                </span>
                <span className="text-workspace-display-mode-mask-foreground/60">
                  {selectedSidebarCollapsed
                    ? t2(
                        "workspace.displayMode.primarySidebar.collapsed",
                        "Collapsed",
                      )
                    : t2(
                        "workspace.displayMode.primarySidebar.open",
                        "Expanded",
                      )}
                </span>
              </span>
              <Switch
                checked={!selectedSidebarCollapsed}
                id="workspace-display-mode-primary-sidebar-switch"
                aria-label={`${t2("workspace.displayMode.primarySidebar", "Primary sidebar")}: ${selectedSidebarCollapsed ? t2("workspace.displayMode.primarySidebar.collapsed", "Collapsed") : t2("workspace.displayMode.primarySidebar.open", "Expanded")}`}
                data-workspace-display-mode-primary-sidebar="true"
                onCheckedChange={(checked) =>
                  setSelectedSidebarCollapsed(!checked)
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
