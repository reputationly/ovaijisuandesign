// session-tab-strip.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  dedupedToast,
  Tooltip,
  TooltipTrigger,
  useStorage,
  ChevronDown,
  API_PATHS,
  usePlatform,
  ContextMenu,
  Icon,
  useSessionCostVisible,
  Popover,
  PopoverTrigger,
  useGatewayFetch,
  HistoryIcon,
  SearchIcon,
  PinIcon,
  EyeOffIcon$1,
  DownloadIcon,
  EyeIcon$1,
  Clapperboard,
  MessageSquareQuote,
  Scissors,
  NotebookPen,
  PencilRuler,
  Plus,
  GripVertical,
  Loader2,
  fetchSceneAttachments,
  useDiffReviewStore,
  isDiffReviewSessionReady,
  FileDiff,
  ChevronUp,
  Eye,
} from "../vendor.js";
import {
  TooltipContent,
  cn$2,
  Button$1,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import {
  BROWSER_SCREENSHOT_EVENT,
  BROWSER_FILE_EVENT,
} from "../m11/use-workspace-canvas-persistence.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../m10/new-workspace-dialog.jsx";
import { Spinner } from "../m09/use-team-transactions-feed-query.jsx";
import { useWorkspaceChatSelector, shallowEqualObject } from "../m12/use-asset-picker-host.jsx";
import { CoachMark } from "../m10/asset-mention-list.jsx";
import { deriveSessionTaskStatus } from "../m11/remote-tool-host.jsx";
import { TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX } from "../m11/use-session-list-retry.js";
import { Skeleton } from "../m09/infinite-scroll-container.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  SessionCostPopover,
  SessionTab,
  sessionDisplayName,
  useSessionCost,
} from "./empty-chat-recommendations.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./yt.jsx";
const WorkspacePaneReorderContext = reactExports.createContext(null);
export function WorkspacePaneReorderProvider({ value, children: children2 }) {
  return (
    <WorkspacePaneReorderContext.Provider value={value}>
      {children2}
    </WorkspacePaneReorderContext.Provider>
  );
}
export function useWorkspacePaneReorder() {
  return reactExports.useContext(WorkspacePaneReorderContext);
}
function sessionPreferenceId(session) {
  return session.runtime_session_id ?? session.id;
}
function migrateSessionPreferenceIds(storedIds, sessions) {
  const runtimeByUiId = new Map();
  for (const session of sessions) {
    if (session.runtime_session_id) {
      runtimeByUiId.set(session.id, session.runtime_session_id);
    }
  }
  const migrated = [];
  const seen2 = new Set();
  for (const storedId of storedIds) {
    const nextId2 = runtimeByUiId.get(storedId) ?? storedId;
    if (seen2.has(nextId2)) continue;
    seen2.add(nextId2);
    migrated.push(nextId2);
  }
  return migrated;
}
function sessionPreferenceIdsEqual(left, right) {
  return left.length === right.length && left.every((value, index2) => value === right[index2]);
}
const SESSION_EVICTION_TOAST_LIMIT = 3;
function normalizeEvictionToastCount(value) {
  if (!Number.isFinite(value) || value == null) return 0;
  return Math.max(0, Math.floor(value));
}
function SessionHistory({
  sessions,
  openedTabIds,
  loading = false,
  onOpen,
  hasUnseen = false,
  onOpenChange,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const gatewayFetch2 = useGatewayFetch();
  const [open, setOpen] = reactExports.useState(false);
  const [search2, setSearch] = reactExports.useState("");
  const [exportingId, setExportingId] = reactExports.useState(null);
  const [showHidden, setShowHidden] = reactExports.useState(false);
  const [pinnedSessionIds, setPinnedSessionIds] = useStorage("workspace.pinnedSessionIds");
  const [hiddenSessionIds, setHiddenSessionIds] = useStorage("workspace.hiddenSessionIds");
  const [evictionToastShownCount, setEvictionToastShownCount, , isToastCountHydrated] = useStorage(
    "global.sessionEvictionToastCount",
  );
  reactExports.useEffect(() => {
    setPinnedSessionIds((previous2) => {
      const migrated = migrateSessionPreferenceIds(previous2, sessions);
      return sessionPreferenceIdsEqual(previous2, migrated) ? previous2 : migrated;
    });
    setHiddenSessionIds((previous2) => {
      const migrated = migrateSessionPreferenceIds(previous2, sessions);
      return sessionPreferenceIdsEqual(previous2, migrated) ? previous2 : migrated;
    });
  }, [sessions, setHiddenSessionIds, setPinnedSessionIds]);
  const handledEvictionRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!isToastCountHydrated) return;
    if (!hasUnseen) {
      handledEvictionRef.current = false;
      return;
    }
    if (handledEvictionRef.current) return;
    handledEvictionRef.current = true;
    if (normalizeEvictionToastCount(evictionToastShownCount) >= SESSION_EVICTION_TOAST_LIMIT)
      return;
    dedupedToast(t2("session.tabs.evictedToHistory", "已打开该对话，较早的对话已收纳到历史记录"));
    setEvictionToastShownCount((current2) =>
      Math.min(normalizeEvictionToastCount(current2) + 1, SESSION_EVICTION_TOAST_LIMIT),
    );
  }, [evictionToastShownCount, hasUnseen, isToastCountHydrated, setEvictionToastShownCount, t2]);
  const { filteredSessions, filteredHiddenSessions } = reactExports.useMemo(() => {
    const pinOrder = new Map(pinnedSessionIds.map((id2, index2) => [id2, index2]));
    const sorted = sessions.slice().sort((a2, b3) => {
      const aPinOrder = pinOrder.get(sessionPreferenceId(a2));
      const bPinOrder = pinOrder.get(sessionPreferenceId(b3));
      if (aPinOrder !== void 0 || bPinOrder !== void 0) {
        if (aPinOrder === void 0) return 1;
        if (bPinOrder === void 0) return -1;
        return aPinOrder - bPinOrder;
      }
      return b3.created_at.localeCompare(a2.created_at);
    });
    const q2 = search2.trim().toLowerCase();
    const searched = q2
      ? sorted.filter((session) => sessionDisplayName(session, t2).toLowerCase().includes(q2))
      : sorted;
    return {
      filteredSessions: searched.filter(
        (session) => !hiddenSessionIds.includes(sessionPreferenceId(session)),
      ),
      filteredHiddenSessions: searched.filter((session) =>
        hiddenSessionIds.includes(sessionPreferenceId(session)),
      ),
    };
  }, [sessions, search2, t2, pinnedSessionIds, hiddenSessionIds]);
  const handleTogglePin = (id2) => {
    setPinnedSessionIds((previous2) =>
      previous2.includes(id2)
        ? previous2.filter((sessionId) => sessionId !== id2)
        : [id2, ...previous2],
    );
  };
  const handleHide = (id2) => {
    setPinnedSessionIds((previous2) => previous2.filter((sessionId) => sessionId !== id2));
    setHiddenSessionIds((previous2) => (previous2.includes(id2) ? previous2 : [...previous2, id2]));
  };
  const handleRestore = (id2) => {
    setHiddenSessionIds((previous2) => previous2.filter((sessionId) => sessionId !== id2));
  };
  const handleOpen = (id2) => {
    onOpen(id2);
    setOpen(false);
    setSearch("");
  };
  const handleOpenChange = (next2) => {
    setOpen(next2);
    if (!next2) setSearch("");
    onOpenChange?.(next2);
  };
  const handleExport = reactExports.useCallback(
    async (sessionId) => {
      if (exportingId) return;
      setExportingId(sessionId);
      try {
        const res = await gatewayFetch2(API_PATHS.exportSession(sessionId));
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match2 = disposition.match(/filename="(.+)"/);
        const defaultName = match2?.[1] ?? `chat-${sessionId}.zip`;
        if (platform2.fs.showSaveDialog && platform2.fs.writeBinaryFile) {
          const targetPath = await platform2.fs.showSaveDialog({
            defaultPath: defaultName,
            filters: [
              {
                name: "ZIP",
                extensions: ["zip"],
              },
            ],
          });
          if (!targetPath) return;
          const buffer = await blob.arrayBuffer();
          await platform2.fs.writeBinaryFile(targetPath, buffer);
        } else {
          const url2 = URL.createObjectURL(blob);
          const a2 = document.createElement("a");
          a2.href = url2;
          a2.download = defaultName;
          a2.click();
          URL.revokeObjectURL(url2);
        }
        dedupedToast.success(t2("session.export.success", "Chat exported"));
      } catch {
        dedupedToast.error(t2("session.export.failed", "Export failed"));
      } finally {
        setExportingId(null);
      }
    },
    [exportingId, gatewayFetch2, platform2, t2],
  );
  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                className={cn$2(
                  "relative flex size-7 shrink-0 items-center justify-center rounded-md cursor-pointer transition-colors",
                  "hover:bg-foreground/[0.06] hover:text-foreground",
                  "text-foreground/55",
                )}
                data-action-ui-id="session-history"
              >
                <HistoryIcon className="size-3.5" strokeWidth={1.25} />
              </PopoverTrigger>
            }
          />
          <TooltipContent side="bottom">{t2("session.history", "History")}</TooltipContent>
        </Tooltip>
        <PopoverContent side="bottom" align="end" sideOffset={4} className="w-72 gap-0 p-0">
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SearchIcon className="size-3.5 shrink-0" />
              <input
                type="text"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                placeholder={t2("session.searchSessions", "Search sessions...")}
                value={search2}
                onChange={(e2) => setSearch(e2.target.value)}
                data-action-ui-id="session-history-search"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading && filteredSessions.length === 0 && (
              <div className="px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                <Spinner className="size-3" />
                <span>{t2("session.loadingSessions", "Loading sessions...")}</span>
              </div>
            )}
            {!loading && filteredSessions.length === 0 && filteredHiddenSessions.length === 0 && (
              <div className="px-3 py-1.5 text-sm text-muted-foreground">
                {search2.trim()
                  ? t2("session.noMatchingSessions", "No matching sessions")
                  : t2("session.noSessions", "No sessions")}
              </div>
            )}
            {filteredSessions.map((session) => {
              const preferenceId = sessionPreferenceId(session);
              const isOpened = openedTabIds.has(session.id);
              const isExporting = exportingId === session.id;
              const isPinned = pinnedSessionIds.includes(preferenceId);
              return (
                <ContextMenu key={session.id}>
                  <ContextMenuTrigger
                    render={
                      <div
                        data-action-ui-id={`session-history-item-${session.id}`}
                        className="group relative w-full px-3 py-1.5 text-sm hover:bg-popup-item-hover"
                      />
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-center gap-2 pr-0 text-left transition-[padding] group-hover:pr-13 focus-visible:pr-13"
                      onClick={() => handleOpen(session.id)}
                    >
                      {isPinned && (
                        <PinIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{sessionDisplayName(session, t2)}</span>
                        {isOpened && (
                          <span className="block text-caption-10 leading-tight text-muted-foreground">
                            {t2("session.opened", "opened")}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-0.5 bg-accent opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        aria-label={t2(isPinned ? "session.unpin" : "session.pin")}
                        data-action-ui-id={`session-history-pin-${session.id}`}
                        className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTogglePin(preferenceId);
                        }}
                      >
                        <PinIcon
                          className={cn$2("size-3.5", isPinned && "fill-current")}
                          strokeWidth={1.5}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={t2("session.hideFromHistory")}
                        data-action-ui-id={`session-history-hide-${session.id}`}
                        className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleHide(preferenceId);
                        }}
                      >
                        <EyeOffIcon$1 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleTogglePin(preferenceId)}>
                      <PinIcon className={cn$2(isPinned && "fill-current")} />
                      {t2(isPinned ? "session.unpin" : "session.pin")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={isExporting}
                      onClick={() => handleExport(session.id)}
                      data-action-ui-id={`session-export-${session.id}`}
                    >
                      {isExporting ? <Spinner className="size-3.5" /> : <DownloadIcon />}
                      {isExporting
                        ? t2("session.export.exporting", "Exporting...")
                        : t2("session.export.menuItem", "Export Chat")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleHide(preferenceId)}>
                      <EyeOffIcon$1 />
                      {t2("session.hideFromHistory")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {filteredHiddenSessions.length > 0 && (
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowHidden((value) => !value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  data-action-ui-id="session-history-hidden-toggle"
                >
                  <EyeOffIcon$1 className="size-3.5" strokeWidth={1.5} />
                  <span className="flex-1 text-left">
                    {t2("session.hiddenSessions", {
                      count: filteredHiddenSessions.length,
                    })}
                  </span>
                </button>
                {showHidden &&
                  filteredHiddenSessions.map((session) => {
                    const preferenceId = sessionPreferenceId(session);
                    return (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                        data-action-ui-id={`session-history-hidden-item-${session.id}`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {sessionDisplayName(session, t2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRestore(preferenceId)}
                          className="flex size-6 items-center justify-center rounded-sm hover:bg-foreground/[0.06] hover:text-foreground"
                          aria-label={t2("session.restoreToHistory")}
                          data-action-ui-id={`session-history-restore-${session.id}`}
                        >
                          <EyeIcon$1 className="size-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
const MARK_ID = "session-cost-intro";
const COMPLETION_SETTLE_MS = 1e3;
function isDocumentForeground() {
  return document.visibilityState === "visible" && document.hasFocus();
}
function SessionCostCoachMark({ session, running: running2, isPresented, anchorRef }) {
  const { t: t2 } = useTranslation();
  const [dismissedMarks, , , dismissedMarksHydrated] = useStorage("global.dismissedCoachMarks");
  const visible = useSessionCostVisible(session);
  const markAlreadySeen =
    dismissedMarksHydrated && Array.isArray(dismissedMarks) && dismissedMarks.includes(MARK_ID);
  const canCheckCost = dismissedMarksHydrated && !markAlreadySeen;
  const wasRunningRef = reactExports.useRef(running2);
  const completionTimerRef = reactExports.useRef(null);
  const [documentForeground, setDocumentForeground] = reactExports.useState(isDocumentForeground);
  const [shouldCheckCost, setShouldCheckCost] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const syncDocumentForeground = () => setDocumentForeground(isDocumentForeground());
    document.addEventListener("visibilitychange", syncDocumentForeground);
    window.addEventListener("focus", syncDocumentForeground);
    window.addEventListener("blur", syncDocumentForeground);
    return () => {
      document.removeEventListener("visibilitychange", syncDocumentForeground);
      window.removeEventListener("focus", syncDocumentForeground);
      window.removeEventListener("blur", syncDocumentForeground);
    };
  }, []);
  reactExports.useEffect(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (!isPresented) {
      wasRunningRef.current = running2;
      setShouldCheckCost(false);
      return;
    }
    if (running2) {
      wasRunningRef.current = true;
      setShouldCheckCost(false);
      return;
    }
    if (!dismissedMarksHydrated || markAlreadySeen) return;
    if (!visible) {
      setShouldCheckCost(false);
      return;
    }
    if (!documentForeground) return;
    if (!wasRunningRef.current) return;
    completionTimerRef.current = setTimeout(() => {
      completionTimerRef.current = null;
      if (!isDocumentForeground()) return;
      wasRunningRef.current = false;
      setShouldCheckCost(true);
    }, COMPLETION_SETTLE_MS);
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [dismissedMarksHydrated, documentForeground, isPresented, markAlreadySeen, running2, visible]);
  const cost = useSessionCost(
    session,
    canCheckCost && isPresented && documentForeground && visible && shouldCheckCost,
  );
  const enabled =
    isPresented &&
    documentForeground &&
    shouldCheckCost &&
    cost.status === "ready" &&
    cost.buckets.total > 0;
  return isPresented ? (
    <CoachMark
      markId={MARK_ID}
      enabled={enabled}
      persistOnOpen={true}
      anchorRef={anchorRef}
      side="bottom"
      align="start"
      showClose={true}
      title={t2("coachMark.sessionCost.title", "View chat credit usage")}
      description={t2(
        "coachMark.sessionCost.desc",
        "Hover over the chat title to view credits used for images, videos, audio, and Agent activity in this chat. Usage updates after each task completes. Credit usage is not available for historical chats yet.",
      )}
    />
  ) : null;
}
function deriveTabStatus(input) {
  const status = deriveSessionTaskStatus(input);
  if (status === "needs-answer")
    return {
      kind: "needs-user-action",
      action: "answer",
    };
  if (status === "needs-confirmation") {
    return {
      kind: "needs-user-action",
      action: "confirmation",
    };
  }
  if (status === "running") {
    return {
      kind: "running",
    };
  }
  return {
    kind: "idle",
  };
}
function nodeEditSessionTitle(session, t2, agentTitle) {
  const genericDefaults = new Set([
    t2("chat.textEditAgent.sessionName", "Text Assistant"),
    t2("chat.pluginEditAgent.sessionName", "Editor Agent"),
    "Text Agent",
    "文本 Agent",
  ]);
  if (genericDefaults.has(session.name)) return agentTitle;
  return sessionDisplayName(session, t2);
}
function nodeEditTitleIcon(agentTitle) {
  const identity2 = agentTitle.toLocaleLowerCase();
  if (identity2.includes("director") || identity2.includes("导演")) return Clapperboard;
  if (
    identity2.includes("dialogue") ||
    identity2.includes("script") ||
    identity2.includes("台词")
  ) {
    return MessageSquareQuote;
  }
  if (identity2.includes("editing") || identity2.includes("editor") || identity2.includes("剪辑")) {
    return Scissors;
  }
  if (identity2.includes("summary") || identity2.includes("brief") || identity2.includes("简介")) {
    return NotebookPen;
  }
  return PencilRuler;
}
function SessionTabStrip({
  sessions,
  openedTabOrder,
  openedTabIds,
  focusedSessionId,
  pendingNewTab,
  sessionsLoading = false,
  isPresented = true,
  sessionStore,
  onSend,
  onRename,
  onNewTab,
  onCloseTab,
  hasEvicted,
  onEvictedSeen,
  rightActions,
  variant = "default",
  nodeEditAgentName,
  textEditNav,
}) {
  const { t: t2 } = useTranslation();
  const paneReorder = useWorkspacePaneReorder();
  const activeTabRef = reactExports.useRef(null);
  const singleTitleRef = reactExports.useRef(null);
  const [rawStatusById, setRawStatusById] = reactExports.useState(() =>
    snapshotStatuses(sessionStore, openedTabOrder),
  );
  reactExports.useEffect(() => {
    const update2 = () => {
      const next2 = snapshotStatuses(sessionStore, openedTabOrder);
      setRawStatusById((current2) => (equalTabStatusMaps(current2, next2) ? current2 : next2));
    };
    update2();
    return sessionStore.subscribe(update2);
  }, [sessionStore, openedTabOrder]);
  const prevRunningRef = reactExports.useRef(new Set());
  const [unreadIds, setUnreadIds] = reactExports.useState(() => new Set());
  reactExports.useEffect(() => {
    const currRunning = new Set();
    for (const [id2, status] of rawStatusById) {
      if (status.kind === "running") currRunning.add(id2);
    }
    const prevRunning = prevRunningRef.current;
    prevRunningRef.current = currRunning;
    setUnreadIds((prev) => {
      let next2 = null;
      for (const id2 of prevRunning) {
        if (!currRunning.has(id2) && id2 !== focusedSessionId && !prev.has(id2)) {
          if (!next2) next2 = new Set(prev);
          next2.add(id2);
        }
      }
      return next2 ?? prev;
    });
  }, [rawStatusById, focusedSessionId]);
  reactExports.useEffect(() => {
    if (!focusedSessionId && openedTabOrder.length === 0) return;
    setUnreadIds((prev) => {
      if (prev.size === 0) return prev;
      const next2 = new Set(prev);
      if (focusedSessionId) next2.delete(focusedSessionId);
      for (const id2 of prev) {
        if (!openedTabOrder.includes(id2) && id2 !== focusedSessionId) next2.delete(id2);
      }
      return next2.size === prev.size &&
        [...next2].every((id2) => prev.has(id2)) &&
        [...prev].every((id2) => next2.has(id2))
        ? prev
        : next2;
    });
  }, [focusedSessionId, openedTabOrder]);
  const statusById = new Map(rawStatusById);
  for (const id2 of unreadIds) {
    const raw2 = statusById.get(id2);
    if (!raw2 || raw2.kind === "idle") {
      statusById.set(id2, {
        kind: "unread",
      });
    }
  }
  reactExports.useEffect(() => {
    if (!focusedSessionId) return;
    activeTabRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
    singleTitleRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [focusedSessionId]);
  const handleActivate = reactExports.useCallback(
    (id2) => {
      if (id2 === focusedSessionId) return;
      onSend({
        type: "switch_session",
        session_id: id2,
      });
    },
    [onSend, focusedSessionId],
  );
  const handleClose = reactExports.useCallback(
    (id2) => {
      if (!onCloseTab(id2)) return;
      dedupedToast(t2("session.tabs.close.toast", "Tab closed. Reopen from History if needed."));
    },
    [onCloseTab, t2],
  );
  const handleRename = reactExports.useCallback(
    (id2, name2) => {
      onRename(id2, name2);
    },
    [onRename],
  );
  const handleTabListKeyDown = reactExports.useCallback(
    (e2) => {
      if (openedTabOrder.length === 0) return;
      let targetIndex = null;
      const currentIndex = focusedSessionId ? openedTabOrder.indexOf(focusedSessionId) : -1;
      switch (e2.key) {
        case "ArrowLeft":
          targetIndex = currentIndex <= 0 ? openedTabOrder.length - 1 : currentIndex - 1;
          break;
        case "ArrowRight":
          targetIndex = currentIndex >= openedTabOrder.length - 1 ? 0 : currentIndex + 1;
          break;
        case "Home":
          targetIndex = 0;
          break;
        case "End":
          targetIndex = openedTabOrder.length - 1;
          break;
        default:
          return;
      }
      e2.preventDefault();
      const targetId = openedTabOrder[targetIndex];
      if (targetId && targetId !== focusedSessionId) {
        onSend({
          type: "switch_session",
          session_id: targetId,
        });
      }
    },
    [openedTabOrder, focusedSessionId, onSend],
  );
  const sessionById = new Map(sessions.map((s2) => [s2.id, s2]));
  const visibleTabs = [];
  for (const id2 of openedTabOrder) {
    const s2 = sessionById.get(id2);
    if (s2) visibleTabs.push(s2);
  }
  const presentationCount = visibleTabs.length + (pendingNewTab ? 1 : 0);
  const multiChat = sessions.length > 1 || presentationCount > 1;
  const hideCloseSingleton = visibleTabs.length === 1 && !pendingNewTab;
  const focusedSession = focusedSessionId ? sessionById.get(focusedSessionId) : void 0;
  const titleSession = focusedSession ?? visibleTabs[0] ?? sessions[0];
  const singleTitle = pendingNewTab
    ? t2("chat.newChat", "New Chat")
    : titleSession
      ? sessionDisplayName(titleSession, t2)
      : t2("chat.newChat", "New Chat");
  const paneReorderLabel =
    paneReorder?.paneOrder === "chat-canvas"
      ? t2("workspace.paneReorder.moveRight", "Move Chat to the right of Canvas")
      : t2("workspace.paneReorder.moveLeft", "Move Chat to the left of Canvas");
  if (variant === "text-edit" || variant === "plugin-edit") {
    const pluginEdit = variant === "plugin-edit";
    const nodeEditAgentTitle = pluginEdit
      ? (nodeEditAgentName?.trim() ?? "") || t2("chat.pluginEditAgent.title", "Editor Agent")
      : t2("chat.textEditAgent.title", "Text Agent");
    const nodeEditNewSessionLabel = pluginEdit
      ? t2("chat.pluginEditAgent.newSession", "New {{name}} chat", {
          name: nodeEditAgentTitle,
        })
      : t2("chat.textEditAgent.newSession", "New Text Assistant chat");
    const textEditSessions = textEditNav?.sessions ?? [];
    const activeTextEditSession = textEditNav?.activeSessionId
      ? textEditSessions.find((item) => item.id === textEditNav.activeSessionId)
      : void 0;
    const showTextEditHistory = textEditSessions.length > 1;
    return (
      <div
        data-action-ui-id="session-tabs"
        data-chat-header-mode={variant}
        className="mac-window-drag-region relative flex h-11 min-w-0 shrink-0 items-center overflow-hidden bg-card"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-3">
          <span
            aria-hidden="true"
            className="flex shrink-0 text-brand-accent"
            data-action-ui-id={pluginEdit ? "node-agent-title-icon" : "text-assistant-title-icon"}
          >
            <Icon
              icon={pluginEdit ? nodeEditTitleIcon(nodeEditAgentTitle) : PencilRuler}
              size="md"
            />
          </span>
          <span className="truncate text-[13px] font-medium leading-normal text-foreground">
            {activeTextEditSession
              ? nodeEditSessionTitle(activeTextEditSession, t2, nodeEditAgentTitle)
              : nodeEditAgentTitle}
          </span>
        </div>
        {textEditNav ? (
          <div
            className="no-drag flex h-full shrink-0 items-center gap-1.5 px-2"
            data-window-drag-region="no-drag"
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={textEditNav.onNewSession}
                    aria-label={nodeEditNewSessionLabel}
                    data-action-ui-id="text-edit-session-new"
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                  />
                }
              >
                <Icon icon={Plus} size="md" strokeWidth={1} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{nodeEditNewSessionLabel}</TooltipContent>
            </Tooltip>
            {showTextEditHistory ? (
              <SessionHistory
                sessions={textEditSessions}
                openedTabIds={
                  textEditNav.activeSessionId ? new Set([textEditNav.activeSessionId]) : new Set()
                }
                loading={sessionsLoading}
                onOpen={textEditNav.onSwitchSession}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div
      data-action-ui-id="session-tabs"
      data-chat-header-mode={multiChat ? "multi" : "single"}
      className={cn$2(
        "mac-window-drag-region relative flex h-11 min-w-0 shrink-0 items-center overflow-hidden bg-card",
        multiChat && "border-b-[0.5px] border-border",
      )}
    >
      {paneReorder?.enabled ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={paneReorderLabel}
                data-action-ui-id="workspace.pane-reorder-handle"
                data-pane-reorder-handle="chat"
                data-pane-reorder-state={paneReorder.phase}
                data-window-drag-region="no-drag"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onKeyDown={paneReorder.onHandleKeyDown}
                onLostPointerCapture={paneReorder.onHandleLostPointerCapture}
                onPointerCancel={paneReorder.onHandlePointerCancel}
                onPointerDown={paneReorder.onHandlePointerDown}
                onPointerMove={paneReorder.onHandlePointerMove}
                onPointerUp={paneReorder.onHandlePointerUp}
                className={cn$2(
                  "ml-2 flex size-7 shrink-0 touch-none items-center justify-center rounded-md border-0 bg-transparent p-0 text-foreground/35 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  paneReorder.phase === "dragging" || paneReorder.phase === "targeted"
                    ? "cursor-grabbing bg-foreground/[0.06] text-foreground/65"
                    : "cursor-grab",
                )}
                style={{
                  WebkitAppRegion: "no-drag",
                }}
              />
            }
          >
            <Icon icon={GripVertical} size="sm" strokeWidth={1.25} />
          </TooltipTrigger>
          <TooltipContent side="bottom">{paneReorderLabel}</TooltipContent>
        </Tooltip>
      ) : null}
      {multiChat ? (
        <div className="h-full min-w-0 flex-1 overflow-hidden">
          <div
            role="tablist"
            aria-label={t2("session.tabs.list.label", "Chat sessions")}
            onKeyDown={handleTabListKeyDown}
            className="flex h-full items-center gap-1 px-2"
          >
            {visibleTabs.map((session) => {
              const isActive2 = session.id === focusedSessionId;
              return (
                <div
                  key={session.id}
                  ref={isActive2 ? activeTabRef : void 0}
                  className="relative flex min-w-0 max-w-[220px] flex-1 basis-0"
                >
                  <SessionTab
                    session={session}
                    active={isActive2}
                    status={
                      statusById.get(session.id) ?? {
                        kind: "idle",
                      }
                    }
                    hideClose={hideCloseSingleton}
                    onActivate={handleActivate}
                    onClose={handleClose}
                    onRename={handleRename}
                  />
                </div>
              );
            })}
            {pendingNewTab && (
              <div className="relative flex min-w-0 max-w-[220px] flex-1 basis-0">
                <div
                  data-action-ui-id="session-tab-pending"
                  className="flex h-7 w-full items-center rounded-md bg-foreground/[0.08] px-2 text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] font-normal leading-normal">
                    {t2("chat.newChat", "New Chat")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center px-3" data-layout-slot="chat-single-title">
          {titleSession && !pendingNewTab ? (
            <SessionCostPopover session={titleSession}>
              <span
                ref={singleTitleRef}
                className="no-drag truncate text-[13px] font-medium leading-normal text-foreground"
                data-window-drag-region="no-drag"
              >
                {singleTitle}
              </span>
            </SessionCostPopover>
          ) : (
            <span className="truncate text-[13px] font-medium leading-normal text-foreground">
              {singleTitle}
            </span>
          )}
        </div>
      )}
      {focusedSession && !pendingNewTab ? (
        <SessionCostCoachMark
          key={focusedSession.id}
          session={focusedSession}
          isPresented={isPresented}
          running={
            statusById.get(focusedSession.id)?.kind === "running" ||
            statusById.get(focusedSession.id)?.kind === "needs-user-action"
          }
          anchorRef={multiChat ? activeTabRef : singleTitleRef}
        />
      ) : null}
      <div
        className="no-drag flex h-full shrink-0 items-center gap-1.5 px-2"
        data-window-drag-region="no-drag"
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onNewTab}
                aria-label={t2("session.tabs.new.tooltip", "New chat")}
                data-action-ui-id="session-tab-new"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              />
            }
          >
            <Icon icon={Plus} size="md" strokeWidth={1} />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t2("session.tabs.new.tooltip", "New chat")}
          </TooltipContent>
        </Tooltip>
        {multiChat ? (
          <SessionHistory
            sessions={sessions}
            openedTabIds={openedTabIds}
            loading={sessionsLoading}
            hasUnseen={hasEvicted}
            onOpen={(id2) =>
              onSend({
                type: "switch_session",
                session_id: id2,
              })
            }
            onOpenChange={(open) => {
              if (open) onEvictedSeen();
            }}
          />
        ) : null}
        {rightActions ? (
          <div
            className="ml-0.5 flex shrink-0 items-center"
            data-layout-slot="chat-project-actions"
            data-actions-side="right"
          >
            {rightActions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
function snapshotStatuses(store, openedTabOrder) {
  const state2 = store.getState();
  const out = new Map();
  for (const id2 of openedTabOrder) {
    const s2 = state2.sessions.get(id2);
    if (!s2) continue;
    out.set(
      id2,
      deriveTabStatus({
        busy: s2.busy,
        pendingReasons: s2.pendingReasons,
        messages: s2.messages,
      }),
    );
  }
  return out;
}
function equalTabStatusMaps(left, right) {
  if (left.size !== right.size) return false;
  for (const [id2, leftStatus] of left) {
    const rightStatus = right.get(id2);
    if (!rightStatus || leftStatus.kind !== rightStatus.kind) return false;
    if (
      leftStatus.kind === "needs-user-action" &&
      (rightStatus.kind !== "needs-user-action" || leftStatus.action !== rightStatus.action)
    ) {
      return false;
    }
  }
  return true;
}
const ChatHeader = reactExports.memo(function ChatHeader2({
  sessions,
  openedTabOrder,
  openedTabIds,
  focusedSessionId,
  pendingNewTab,
  sessionsLoading = false,
  isPresented = true,
  sessionStore,
  onSend,
  onRename,
  onNewTab,
  onCloseTab,
  hasEvicted,
  onEvictedSeen,
  rightActions,
  variant,
  nodeEditAgentName,
  textEditNav,
}) {
  return (
    <SessionTabStrip
      sessions={sessions}
      openedTabOrder={openedTabOrder}
      openedTabIds={openedTabIds}
      focusedSessionId={focusedSessionId}
      pendingNewTab={pendingNewTab}
      sessionsLoading={sessionsLoading}
      isPresented={isPresented}
      sessionStore={sessionStore}
      onSend={onSend}
      onRename={onRename}
      onNewTab={onNewTab}
      onCloseTab={onCloseTab}
      hasEvicted={hasEvicted}
      onEvictedSeen={onEvictedSeen}
      rightActions={rightActions}
      variant={variant}
      nodeEditAgentName={nodeEditAgentName}
      textEditNav={textEditNav}
    />
  );
});
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
export function selectMessages(messages2, ready, textEditMode) {
  if (!ready) return [];
  return textEditMode
    ? messages2.filter((message2) => !message2.id.startsWith(TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX))
    : messages2;
}
const selectChatHeaderState = (chat) => ({
  focusedSessionId: chat.focusedSessionId,
  sessions: chat.sessions,
  sessionsLoading: chat.sessionsLoading,
  openedTabOrder: chat.openedTabOrder,
  openedTabIds: chat.openedTabIds,
  pendingNewTab: chat.pendingNewTab,
  evictedTabIds: chat.evictedTabIds,
  clearEvictedTabIds: chat.clearEvictedTabIds,
  sendWsMessage: chat.sendWsMessage,
  renameSession: chat.renameSession,
  openNewTab: chat.openNewTab,
  closeTab: chat.closeTab,
  sessionStore: chat.sessionStore,
  textEditSessionIds: chat.textEditSessionIds,
  textEditNodeSessionIds: chat.textEditNodeSessionIds,
  textEditAgentState: chat.textEditAgentState,
  newTextEditSession: chat.newTextEditSession,
  switchTextEditSession: chat.switchTextEditSession,
});
export function ChatHeaderContainer({
  rightActions,
  variant = "default",
  nodeEditAgentName,
  isPresented = true,
} = {}) {
  const {
    sessions,
    openedTabOrder,
    openedTabIds,
    focusedSessionId,
    pendingNewTab,
    sessionsLoading,
    sessionStore,
    sendWsMessage,
    renameSession,
    openNewTab,
    closeTab,
    evictedTabIds,
    clearEvictedTabIds,
    textEditSessionIds,
    textEditNodeSessionIds,
    textEditAgentState,
    newTextEditSession,
    switchTextEditSession,
  } = useWorkspaceChatSelector(selectChatHeaderState, shallowEqualObject);
  const { ordinarySessions, ordinaryTabOrder, ordinaryTabIds } = reactExports.useMemo(() => {
    if (textEditSessionIds.size === 0) {
      return {
        ordinarySessions: sessions,
        ordinaryTabOrder: openedTabOrder,
        ordinaryTabIds: openedTabIds,
      };
    }
    const hiddenSessionIds = new Set(textEditSessionIds);
    for (const session of sessions) {
      if (session.runtime_session_id && textEditSessionIds.has(session.runtime_session_id)) {
        hiddenSessionIds.add(session.id);
      }
    }
    const visibleTabOrder = openedTabOrder.filter((id2) => !hiddenSessionIds.has(id2));
    return {
      ordinarySessions: sessions.filter((session) => !hiddenSessionIds.has(session.id)),
      ordinaryTabOrder: visibleTabOrder,
      ordinaryTabIds: new Set(visibleTabOrder),
    };
  }, [sessions, openedTabOrder, openedTabIds, textEditSessionIds]);
  const nodeEdit = variant === "text-edit" || variant === "plugin-edit";
  const textEditNav = reactExports.useMemo(
    () =>
      nodeEdit
        ? {
            sessions: sessions.filter(
              (session) =>
                textEditNodeSessionIds.has(session.id) ||
                (session.runtime_session_id
                  ? textEditNodeSessionIds.has(session.runtime_session_id)
                  : false),
            ),
            activeSessionId: textEditAgentState?.sessionId ?? null,
            onNewSession: newTextEditSession,
            onSwitchSession: switchTextEditSession,
          }
        : void 0,
    [
      nodeEdit,
      sessions,
      textEditNodeSessionIds,
      textEditAgentState?.sessionId,
      newTextEditSession,
      switchTextEditSession,
    ],
  );
  return (
    <ChatHeader
      sessions={ordinarySessions}
      openedTabOrder={ordinaryTabOrder}
      openedTabIds={ordinaryTabIds}
      focusedSessionId={focusedSessionId}
      pendingNewTab={pendingNewTab}
      sessionsLoading={sessionsLoading}
      isPresented={isPresented}
      sessionStore={sessionStore}
      onSend={sendWsMessage}
      onRename={renameSession}
      onNewTab={openNewTab}
      onCloseTab={closeTab}
      hasEvicted={evictedTabIds.length > 0}
      onEvictedSeen={clearEvictedTabIds}
      rightActions={rightActions}
      variant={variant}
      nodeEditAgentName={nodeEditAgentName}
      textEditNav={textEditNav}
    />
  );
}
export function ChatHistoryLoadingState({ label, includeChrome = false, className }) {
  return (
    <div
      className={cn$2(
        "chat-history-skeleton-stage flex min-h-0 flex-1 flex-col overflow-hidden bg-card",
        className,
      )}
      data-action-ui-id="chat.history-restoring"
      role="status"
      aria-label={label}
    >
      {includeChrome ? (
        <div className="flex h-11 shrink-0 items-center px-3">
          <Skeleton className="chat-history-skeleton-bar h-3 w-24 rounded-sm" />
        </div>
      ) : null}
      <div className="chat-history-skeleton-viewport flex min-h-0 flex-1 flex-col justify-end overflow-hidden py-6">
        <div
          className="mx-auto flex w-full flex-col gap-8 px-4"
          style={{
            maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
          }}
          data-layout-slot="chat-history-loading-content"
        >
          <div className="chat-history-loading-label flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Icon
              icon={Loader2}
              size="sm"
              className="chat-history-loading-spinner animate-spin motion-reduce:animate-none"
              aria-hidden={true}
            />
            {label}
          </div>
          <div className="chat-history-loading-node-turn flex flex-col items-end gap-2">
            <Skeleton className="chat-history-skeleton-bar h-3 w-2/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-10 w-3/5 rounded-lg" />
          </div>
          <div className="chat-history-loading-node-turn flex items-start gap-2">
            <Skeleton className="chat-history-skeleton-bar size-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <Skeleton className="chat-history-skeleton-bar h-3 w-4/5 rounded-sm" />
              <Skeleton className="chat-history-skeleton-bar h-3 w-3/5 rounded-sm" />
              <Skeleton className="chat-history-skeleton-bar h-3 w-2/5 rounded-sm" />
            </div>
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-0 flex-col items-end gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-2/5 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-1 flex-col items-start gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-4/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/5 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-2/5 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-2 flex-col items-end gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/2 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/3 rounded-sm" />
          </div>
          <div className="chat-history-loading-default-turn chat-history-loading-turn-phase-3 flex-col items-start gap-1.5">
            <Skeleton className="chat-history-skeleton-bar h-5 w-3/4 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/2 rounded-sm" />
            <Skeleton className="chat-history-skeleton-bar h-5 w-1/3 rounded-sm" />
          </div>
        </div>
      </div>
      {includeChrome ? (
        <div className="shrink-0 px-4 pb-2">
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
            }}
            data-layout-slot="chat-history-loading-composer"
          >
            <Skeleton className="chat-history-skeleton-bar h-[var(--workspace-chat-composer-default-height)] w-full rounded-[var(--message-input-surface-radius)]" />
          </div>
        </div>
      ) : null}
    </div>
  );
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
export function useReconnectingStuck(reconnecting, thresholdMs = RECONNECTING_STUCK_THRESHOLD_MS) {
  const [stuck, setStuck] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!reconnecting) {
      setStuck(false);
      return;
    }
    const id2 = setTimeout(() => setStuck(true), thresholdMs);
    return () => clearTimeout(id2);
  }, [reconnecting, thresholdMs]);
  return stuck;
}
const CONNECTING_STALLED_THRESHOLD_MS = 1e4;
export function ChatStartupNotice({ starting, connecting, reconnecting, showPreparing = true }) {
  const { t: t2 } = useTranslation();
  const connectingStalled = useReconnectingStuck(connecting, CONNECTING_STALLED_THRESHOLD_MS);
  const preparing = starting || connecting;
  if (connectingStalled && !reconnecting) {
    return (
      <div
        className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
        data-action-ui-id="chat.connecting-stalled-notice"
      >
        <div className="font-medium text-foreground">
          {t2("chat.connectingStalled.title", "Still connecting to the local runtime...")}
        </div>
        <div>
          {t2(
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
        {t2("chat.starting.title", "Preparing your Agent")}
      </div>
      <div>
        {t2(
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
  language: language2,
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
  input.setInputText(language2.startsWith("zh") ? query.queryCn : query.queryEn);
  if (query.models) {
    onSelectedMediaModelsChange({
      ...selectedMediaModels,
      ...query.models,
    });
  }
  input.focus();
  const downloadableAttachments = query.attachments.filter((attachment) => attachment.assetUrl);
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
export function DocumentEditReviewBar() {
  const { t: t2 } = useTranslation();
  const session = useDiffReviewStore((state2) => state2.session);
  const reverting = useDiffReviewStore((state2) => state2.reverting);
  const historyHandler = useDiffReviewStore((state2) => state2.historyHandler);
  const activeEditorNodeId = useDiffReviewStore((state2) => state2.activeEditorNodeId);
  const acceptAll = useDiffReviewStore((state2) => state2.acceptAll);
  const requestUndo = useDiffReviewStore((state2) => state2.requestUndo);
  const requestOpenEditor = useDiffReviewStore((state2) => state2.requestOpenEditor);
  const navigation2 = useDiffReviewStore((state2) => state2.navigation);
  if (!session) return null;
  const pendingCount = session.hunks.filter((hunk) => hunk.status === "pending").length;
  if (pendingCount === 0) return null;
  const inEditor = activeEditorNodeId === session.nodeId;
  const reviewBlocked =
    reverting || (!isDiffReviewSessionReady(session) && (inEditor || historyHandler !== null));
  const nav2 = inEditor ? navigation2 : null;
  const navBtnClass =
    "flex h-6 w-6 items-center justify-center rounded transition-colors text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
      data-action-ui-id="chat-diff-review-bar"
    >
      <FileDiff size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      {nav2 ? (
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <span className="truncate text-muted-foreground">
            {t2("canvas.diffReview.counter", "{{current}} / {{total}} 处修改", {
              current: nav2.current,
              total: nav2.total,
            })}
          </span>
          <button
            type="button"
            title={t2("canvas.diffReview.prev", "上一处")}
            onClick={() => nav2.step(-1)}
            className={navBtnClass}
            data-action-ui-id="chat-diff-review-prev"
          >
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            title={t2("canvas.diffReview.next", "下一处")}
            onClick={() => nav2.step(1)}
            className={navBtnClass}
            data-action-ui-id="chat-diff-review-next"
          >
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {t2("chat.diffReview.pendingCount", "{{count}} 处修改待确认", {
            count: pendingCount,
          })}
        </span>
      )}
      {inEditor ? (
        <>
          <Button$1
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reviewBlocked}
            onClick={() => void requestUndo()}
            data-action-ui-id="chat-diff-review-undo-all"
          >
            {t2("chat.diffReview.undoAll", "全部撤销")}
          </Button$1>
          <Button$1
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reviewBlocked}
            onClick={acceptAll}
            data-action-ui-id="chat-diff-review-accept-all"
          >
            {t2("chat.diffReview.acceptAll", "全部接受")}
          </Button$1>
        </>
      ) : (
        <>
          <Button$1
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2 text-xs"
            disabled={reverting}
            onClick={() => void requestUndo()}
            data-action-ui-id="chat-diff-review-cancel"
          >
            {t2("chat.diffReview.cancel", "取消")}
          </Button$1>
          <Button$1
            size="sm"
            className="h-7 gap-1 rounded-md px-2 text-xs"
            onClick={() => requestOpenEditor(session.nodeId)}
            data-action-ui-id="chat-diff-review-view"
          >
            <Eye size={14} strokeWidth={1.5} />
            {t2("chat.diffReview.view", "查看")}
          </Button$1>
        </>
      )}
    </div>
  );
}
export function isDocumentEditSubmissionForAnnotations(submittedAnnotationIds, annotations) {
  return (
    submittedAnnotationIds.length === annotations.length &&
    submittedAnnotationIds.every((id2, index2) => id2 === annotations[index2]?.id)
  );
}
const BROWSER_VIDEO_ASSET_EVENT = "hilo:browser-video-asset";
function isBrowserVideoAsset(value) {
  if (!value || typeof value !== "object" || !("path" in value) || !("filename" in value))
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
export function dispatchBrowserVideoToChat(asset, workspaceId2, sessionId) {
  const event = new CustomEvent(BROWSER_VIDEO_ASSET_EVENT, {
    detail: {
      ...asset,
      workspaceId: workspaceId2,
      sessionId,
    },
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
export async function downloadBrowserVideo(request, fetch2) {
  const response = await fetch2(API_PATHS.webMedia, {
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
  if (!response.ok) throw new Error(`Video download request failed: HTTP ${response.status}`);
  const body2 = await response.json();
  if (
    !body2 ||
    typeof body2 !== "object" ||
    !("ok" in body2) ||
    body2.ok !== true ||
    !("assets" in body2) ||
    !Array.isArray(body2.assets)
  )
    throw new Error("Video download did not return an asset");
  const videos = body2.assets.filter(
    (asset2) => asset2 && typeof asset2 === "object" && "kind" in asset2 && asset2.kind === "video",
  );
  if (videos.length !== 1) throw new Error("Expected exactly one downloaded video");
  const path2 = videos[0].path;
  const asset = {
    path: path2,
    filename: typeof path2 === "string" ? (path2.split("/").at(-1) ?? "") : "",
  };
  if (!isBrowserVideoAsset(asset)) throw new Error("Invalid downloaded video path");
  return asset;
}
export function useBrowserChatMedia(inputRef, isActiveRef, workspaceId2, sessionId) {
  reactExports.useEffect(() => {
    const handleBrowserVideo = (event) => {
      if (!inputRef.current?.addFromAssetPath) return;
      const asset = event.detail;
      if (!isBrowserVideoAsset(asset)) return;
      const targetWorkspace = "workspaceId" in asset ? asset.workspaceId : void 0;
      if (
        typeof targetWorkspace === "string"
          ? targetWorkspace !== workspaceId2
          : !isActiveRef.current
      )
        return;
      if ("sessionId" in asset && asset.sessionId !== void 0 && asset.sessionId !== sessionId)
        return;
      if (inputRef.current.addFromAssetPath(asset.path, asset.filename) === false) return;
      event.preventDefault();
    };
    const handleBrowserScreenshot = (event) => {
      if (!isActiveRef.current) return;
      const detail = event.detail;
      const dataUrl = detail?.dataUrl;
      if (!dataUrl) return;
      try {
        const comma2 = dataUrl.indexOf(",");
        if (comma2 < 0) return;
        const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
        const binary2 = atob(dataUrl.slice(comma2 + 1));
        const bytes2 = new Uint8Array(binary2.length);
        for (let index2 = 0; index2 < binary2.length; index2 += 1)
          bytes2[index2] = binary2.charCodeAt(index2);
        const transfer = new DataTransfer();
        const stamp = Date.now().toString(36);
        const filename = detail.annotated
          ? `browser-annotation-${stamp}.png`
          : `browser-screenshot-${stamp}.png`;
        transfer.items.add(
          new File([bytes2], filename, {
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
      window.removeEventListener(BROWSER_SCREENSHOT_EVENT, handleBrowserScreenshot);
      window.removeEventListener(BROWSER_FILE_EVENT, handleBrowserFile);
      window.removeEventListener(BROWSER_VIDEO_ASSET_EVENT, handleBrowserVideo);
    };
  }, [inputRef, isActiveRef, workspaceId2, sessionId]);
}
