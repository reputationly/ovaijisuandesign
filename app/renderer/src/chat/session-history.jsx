// session-history.jsx
import {
  API_PATHS,
  dedupedToast,
  DownloadIcon,
  EyeIcon$1 as EyeIcon,
  EyeOffIcon$1 as EyeOffIcon,
  HistoryIcon,
  PinIcon,
  reactExports,
  SearchIcon,
  usePlatform,
  useStorage,
  useTranslation,
} from "../vendor.js";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { sessionDisplayName } from "./chat-empty-state.jsx";
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
  return (
    left.length === right.length &&
    left.every((value, index2) => value === right[index2])
  );
}
const SESSION_EVICTION_TOAST_LIMIT = 3;
function normalizeEvictionToastCount(value) {
  if (!Number.isFinite(value) || value == null) return 0;
  return Math.max(0, Math.floor(value));
}
export function SessionHistory({
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
  const [pinnedSessionIds, setPinnedSessionIds] = useStorage(
    "workspace.pinnedSessionIds",
  );
  const [hiddenSessionIds, setHiddenSessionIds] = useStorage(
    "workspace.hiddenSessionIds",
  );
  const [
    evictionToastShownCount,
    setEvictionToastShownCount,
    ,
    isToastCountHydrated,
  ] = useStorage("global.sessionEvictionToastCount");
  reactExports.useEffect(() => {
    setPinnedSessionIds((previous2) => {
      const migrated = migrateSessionPreferenceIds(previous2, sessions);
      return sessionPreferenceIdsEqual(previous2, migrated)
        ? previous2
        : migrated;
    });
    setHiddenSessionIds((previous2) => {
      const migrated = migrateSessionPreferenceIds(previous2, sessions);
      return sessionPreferenceIdsEqual(previous2, migrated)
        ? previous2
        : migrated;
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
    if (
      normalizeEvictionToastCount(evictionToastShownCount) >=
      SESSION_EVICTION_TOAST_LIMIT
    )
      return;
    dedupedToast(
      t2(
        "session.tabs.evictedToHistory",
        "已打开该对话，较早的对话已收纳到历史记录",
      ),
    );
    setEvictionToastShownCount((current2) =>
      Math.min(
        normalizeEvictionToastCount(current2) + 1,
        SESSION_EVICTION_TOAST_LIMIT,
      ),
    );
  }, [
    evictionToastShownCount,
    hasUnseen,
    isToastCountHydrated,
    setEvictionToastShownCount,
    t2,
  ]);
  const { filteredSessions, filteredHiddenSessions } =
    reactExports.useMemo(() => {
      const pinOrder = new Map(
        pinnedSessionIds.map((id2, index2) => [id2, index2]),
      );
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
        ? sorted.filter((session) =>
            sessionDisplayName(session, t2).toLowerCase().includes(q2),
          )
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
    setPinnedSessionIds((previous2) =>
      previous2.filter((sessionId) => sessionId !== id2),
    );
    setHiddenSessionIds((previous2) =>
      previous2.includes(id2) ? previous2 : [...previous2, id2],
    );
  };
  const handleRestore = (id2) => {
    setHiddenSessionIds((previous2) =>
      previous2.filter((sessionId) => sessionId !== id2),
    );
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
                className={cn(
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
          <TooltipContent side="bottom">
            {t2("session.history", "History")}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={4}
          className="w-72 gap-0 p-0"
        >
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
                <span>
                  {t2("session.loadingSessions", "Loading sessions...")}
                </span>
              </div>
            )}
            {!loading &&
              filteredSessions.length === 0 &&
              filteredHiddenSessions.length === 0 && (
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
                        <span className="block truncate">
                          {sessionDisplayName(session, t2)}
                        </span>
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
                        aria-label={t2(
                          isPinned ? "session.unpin" : "session.pin",
                        )}
                        data-action-ui-id={`session-history-pin-${session.id}`}
                        className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTogglePin(preferenceId);
                        }}
                      >
                        <PinIcon
                          className={cn("size-3.5", isPinned && "fill-current")}
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
                        <EyeOffIcon className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleTogglePin(preferenceId)}
                    >
                      <PinIcon className={cn(isPinned && "fill-current")} />
                      {t2(isPinned ? "session.unpin" : "session.pin")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={isExporting}
                      onClick={() => handleExport(session.id)}
                      data-action-ui-id={`session-export-${session.id}`}
                    >
                      {isExporting ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <DownloadIcon />
                      )}
                      {isExporting
                        ? t2("session.export.exporting", "Exporting...")
                        : t2("session.export.menuItem", "Export Chat")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleHide(preferenceId)}>
                      <EyeOffIcon />
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
                  <EyeOffIcon className="size-3.5" strokeWidth={1.5} />
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
                          <EyeIcon className="size-3.5" strokeWidth={1.5} />
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
