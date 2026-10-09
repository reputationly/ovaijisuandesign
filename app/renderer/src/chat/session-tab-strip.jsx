// session-tab-strip.jsx
import {
  CircleAlert,
  dedupedToast,
  GripVertical,
  jsxRuntimeExports,
  NotebookPen,
  Pencil,
  PencilRuler,
  Plus,
  reactExports,
  Scissors,
  useQuery,
  useStorage,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FourCornerLoading, sessionDisplayName } from "./chat-empty-state.jsx";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { QuestionPromptIcon } from "../workspace/home-service.jsx";
import { usePricingConfig } from "../canvas/use-pricing-config.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useWSConnection } from "../workspace/asset-lineage-query-key.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { InlineRenameInput } from "../infra/inline-rename-input.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { MAX_SESSION_NAME_LENGTH } from "../canvas/fullscreen-icon.jsx";
import { deriveSessionTaskStatus } from "../media-editing/derive-session-task-snapshot.jsx";
import { Clapperboard, MessageSquareQuote } from "../media-editing/package.jsx";
import { CoachMark } from "../assets/use-materialized-entities.jsx";
import { useWorkspacePaneReorder } from "./use-browser-chat-media.jsx";
import { SessionHistory } from "./session-history.jsx";
function useSessionCostVisible(session) {
  const { data: data2 } = usePricingConfig();
  const statsSince = data2?.sessionStatsSinceMs;
  if (statsSince === void 0) return false;
  const createdAt = Date.parse(session.created_at);
  if (!Number.isFinite(createdAt)) return false;
  return createdAt >= statsSince;
}
function ChatTabLoadingIndicator() {
  const { t: t2 } = useTranslation();
  return (
    <FourCornerLoading
      variant="tab"
      size="sm"
      label={t2("session.tabs.status.generating", "Generating")}
      className="ml-1"
    />
  );
}
const IMAGE_TYPES = new Set(["image"]);
const VIDEO_TYPES = new Set(["video"]);
const AUDIO_TYPES = new Set(["audio", "music"]);
const AGENT_TYPES = new Set(["agent"]);
function bucketSessionCost(cost) {
  let image2 = 0;
  let video = 0;
  let audio = 0;
  let agent2 = 0;
  for (const item of cost.items) {
    if (IMAGE_TYPES.has(item.mediaType)) image2 += item.amount;
    else if (VIDEO_TYPES.has(item.mediaType)) video += item.amount;
    else if (AUDIO_TYPES.has(item.mediaType)) audio += item.amount;
    else if (AGENT_TYPES.has(item.mediaType)) agent2 += item.amount;
  }
  const other = cost.totalAmount - image2 - video - audio - agent2;
  return {
    image: image2,
    video,
    audio,
    agent: agent2,
    other: Math.max(0, other),
    total: cost.totalAmount,
  };
}
const ALWAYS_VISIBLE = ["image", "video", "audio"];
const CONDITIONAL = ["agent", "other"];
function visibleCostCategories(buckets2) {
  const rows = ALWAYS_VISIBLE.map((key2) => ({
    key: key2,
    amount: buckets2[key2],
  }));
  for (const key2 of CONDITIONAL) {
    if (buckets2[key2] > 0)
      rows.push({
        key: key2,
        amount: buckets2[key2],
      });
  }
  return rows;
}
function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function mapResult(raw2) {
  if (typeof raw2 !== "object" || raw2 === null)
    return {
      totalAmount: 0,
      items: [],
    };
  const record2 = raw2;
  const rawItems = Array.isArray(record2.items) ? record2.items : [];
  return {
    totalAmount: toNumber(record2.total_amount),
    items: rawItems.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const item = entry;
      const mediaType =
        typeof item.media_type === "string" ? item.media_type : "";
      if (!mediaType) return [];
      return [
        {
          mediaType,
          amount: toNumber(item.amount),
        },
      ];
    }),
  };
}
const SESSION_COST_CHUNK_SIZE = 500;
function chunk(items, size2) {
  const out = [];
  for (let i2 = 0; i2 < items.length; i2 += size2)
    out.push(items.slice(i2, i2 + size2));
  return out;
}
function mergeSessionCosts(parts) {
  const amountByMedia = new Map();
  let totalAmount = 0;
  for (const part of parts) {
    totalAmount += part.totalAmount;
    for (const item of part.items) {
      amountByMedia.set(
        item.mediaType,
        (amountByMedia.get(item.mediaType) ?? 0) + item.amount,
      );
    }
  }
  return {
    totalAmount,
    items: [...amountByMedia].map(([mediaType, amount]) => ({
      mediaType,
      amount,
    })),
  };
}
async function fetchSessionCostChunk(sessionIds, signal) {
  const res = await gatewayFetch("/api/v1/billing/session-cost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_ids: sessionIds,
    }),
    signal,
  });
  const raw2 = await res.json();
  signal?.throwIfAborted();
  return mapResult(raw2);
}
async function fetchSessionCost(sessionIds, options) {
  if (sessionIds.length === 0)
    return {
      totalAmount: 0,
      items: [],
    };
  const batches = chunk(sessionIds, SESSION_COST_CHUNK_SIZE);
  const parts = await Promise.all(
    batches.map((batch2) => fetchSessionCostChunk(batch2, options?.signal)),
  );
  return mergeSessionCosts(parts);
}
const SESSION_TREE_TIMEOUT_MS = 3e3;
let requestSeq = 0;
function requestSessionTree(ws2, sessionId, signal) {
  return new Promise((resolve, reject) => {
    if (!sessionId) {
      resolve([]);
      return;
    }
    signal?.throwIfAborted();
    requestSeq += 1;
    const requestId = `session-tree-${requestSeq}`;
    let settled = false;
    const finish = (fn2) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer2);
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
      fn2();
    };
    const onAbort = () =>
      finish(() => reject(signal?.reason ?? new Error("aborted")));
    const unsubscribe = ws2.subscribe((msg) => {
      if (msg.type !== "session_tree" || msg.request_id !== requestId) return;
      if (msg.incomplete) {
        finish(() =>
          reject(new Error(`session tree is incomplete for ${sessionId}`)),
        );
      } else {
        finish(() => resolve(msg.session_ids));
      }
    });
    const timer2 = setTimeout(() => {
      finish(() =>
        reject(new Error(`session tree request timed out for ${sessionId}`)),
      );
    }, SESSION_TREE_TIMEOUT_MS);
    signal?.addEventListener("abort", onAbort);
    const sent = ws2.send({
      type: "get_session_tree",
      request_id: requestId,
      session_id: sessionId,
    });
    if (!sent) {
      finish(() => reject(new Error("gateway not connected")));
    }
  });
}
const STALE_TIME_MS = 1e3;
function useSessionCost(session, enabled) {
  const ws2 = useWSConnection();
  const runtimeSessionId = session.runtime_session_id ?? session.id;
  const query = useQuery({
    queryKey: ["credit", "session-cost", runtimeSessionId],
    enabled: enabled && !!runtimeSessionId,
    staleTime: STALE_TIME_MS,
    retry: false,
    queryFn: async ({ signal }) => {
      const sessionIds = await requestSessionTree(
        ws2,
        runtimeSessionId,
        signal,
      );
      const cost = await fetchSessionCost(sessionIds, {
        signal,
      });
      return cost;
    },
  });
  if (query.data)
    return {
      status: "ready",
      buckets: bucketSessionCost(query.data),
    };
  if (query.isError)
    return {
      status: "error",
    };
  return {
    status: "loading",
  };
}
const OPEN_DELAY_MS = 400;
const CLOSE_DELAY_MS = 120;
function CostBreakdown({ buckets: buckets2 }) {
  const { t: t2 } = useTranslation();
  const labels = {
    image: t2("session.cost.image", "Image"),
    video: t2("session.cost.video", "Video"),
    audio: t2("session.cost.audio", "Audio"),
    agent: t2("session.cost.agent", "Agent"),
    other: t2("session.cost.other", "Other"),
  };
  const rows = visibleCostCategories(buckets2);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between text-[13px]"
        >
          <span className="text-muted-foreground">{labels[row.key]}</span>
          <span className="tabular-nums text-foreground/70">{row.amount}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-[13px]">
        <span className="text-foreground/70">
          {t2("session.cost.total", "Total")}
        </span>
        <span className="tabular-nums font-medium text-foreground">
          {buckets2.total}
        </span>
      </div>
    </div>
  );
}
function SessionCostPopover({ session, children: children2 }) {
  const { t: t2 } = useTranslation();
  const [hovering, setHovering] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const visible = useSessionCostVisible(session);
  const state2 = useSessionCost(session, hovering && visible);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const schedule2 = reactExports.useCallback(
    (next2, delay) => {
      clearTimer2();
      timerRef.current = setTimeout(() => setHovering(next2), delay);
    },
    [clearTimer2],
  );
  reactExports.useEffect(() => clearTimer2, [clearTimer2]);
  if (!visible) return <>{children2}</>;
  const hasContent2 =
    state2.status === "error" ||
    (state2.status === "ready" && state2.buckets.total > 0);
  return (
    <Popover
      open={hovering && hasContent2}
      onOpenChange={() => {
        clearTimer2();
        setHovering(false);
      }}
    >
      <PopoverTrigger
        render={children2}
        nativeButton={false}
        aria-haspopup="dialog"
        onMouseEnter={() => schedule2(true, OPEN_DELAY_MS)}
        onMouseLeave={() => schedule2(false, CLOSE_DELAY_MS)}
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[200px] p-3"
        onMouseEnter={clearTimer2}
        onMouseLeave={() => schedule2(false, CLOSE_DELAY_MS)}
      >
        <div className="mb-2 border-b border-border pb-2">
          <div className="text-sm font-medium text-foreground">
            {t2("session.cost.title", "Credits used")}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {t2(
              "session.cost.scopeNote",
              "Only includes usage generated within this chat",
            )}
          </div>
        </div>
        {state2.status === "ready" ? (
          <CostBreakdown buckets={state2.buckets} />
        ) : (
          <div className="text-[13px] text-muted-foreground">
            {t2("session.cost.unavailable", "Temporarily unavailable")}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
function TabStatusBadge({ status, active: active2 }) {
  const { t: t2 } = useTranslation();
  if (active2) return null;
  switch (status.kind) {
    case "needs-user-action": {
      const needsAnswer = status.action === "answer";
      const label = needsAnswer
        ? t2("session.tabs.status.awaitingAnswer", "Waiting for your answer")
        : t2(
            "session.tabs.status.awaitingConfirmation",
            "Waiting for your confirmation",
          );
      return (
        <span
          role="status"
          aria-label={label}
          title={label}
          className="inline-flex size-4 shrink-0 items-center justify-center text-foreground/70"
        >
          {needsAnswer ? (
            <QuestionPromptIcon className="size-3.5 text-foreground/70" />
          ) : (
            <Icon icon={CircleAlert} size="sm" />
          )}
        </span>
      );
    }
    case "failed":
      return (
        <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive shrink-0">
          {t2("session.tabs.badge.failed", "Failed")}
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive shrink-0">
          {t2("session.tabs.badge.paused", "Paused")}
        </span>
      );
    case "running":
      return <ChatTabLoadingIndicator />;
    case "unread":
      return (
        <span
          role="status"
          aria-label={t2(
            "session.tabs.status.completedUnread",
            "Completed, unread",
          )}
          className="size-[5px] shrink-0 rounded-full bg-brand-accent"
        />
      );
    default:
      return null;
  }
}
const SessionTab = reactExports.memo(function SessionTab2({
  session,
  active: active2,
  status,
  hideClose = false,
  onActivate,
  onClose,
  onRename,
}) {
  const { t: t2 } = useTranslation();
  const title = sessionDisplayName(session, t2);
  const [renaming, setRenaming] = reactExports.useState(false);
  const handleClose = (e2) => {
    e2.stopPropagation();
    onClose(session.id);
  };
  const handleActivate = () => {
    if (!active2) onActivate(session.id);
  };
  const handleRenameConfirm = reactExports.useCallback(
    (name2) => {
      const trimmed = name2.trim();
      if (trimmed && trimmed !== title) onRename(session.id, trimmed);
      setRenaming(false);
    },
    [onRename, session.id, title],
  );
  const handleMouseDown2 = (e2) => {
    if (e2.button === 1 && !hideClose) {
      e2.preventDefault();
      onClose(session.id);
    }
  };
  return (
    <ContextMenu>
      <SessionCostPopover session={session}>
        <ContextMenuTrigger
          data-action-ui-id={`session-tab-${session.id}`}
          data-window-drag-region="no-drag"
          className={cn(
            "no-drag group/tab relative flex h-7 w-full cursor-pointer select-none items-center rounded-md px-2 transition-colors duration-150 ease-out",
            active2
              ? "bg-foreground/[0.08] text-foreground"
              : "bg-transparent text-foreground/55 hover:bg-foreground/[0.05] hover:text-foreground",
          )}
        >
          {renaming ? (
            <div className="relative z-10 flex h-full min-w-0 flex-1 items-center pr-1.5">
              <InlineRenameInput
                initialName={title}
                maxLength={MAX_SESSION_NAME_LENGTH}
                className="text-[13px] font-normal leading-none"
                onConfirm={handleRenameConfirm}
                onCancel={() => setRenaming(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              role="tab"
              aria-selected={active2}
              tabIndex={active2 ? 0 : -1}
              onClick={handleActivate}
              onMouseDown={handleMouseDown2}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setRenaming(true);
              }}
              className={cn(
                "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left transition-colors",
                hideClose
                  ? "pr-0"
                  : active2
                    ? "pr-5"
                    : "pr-0 group-hover/tab:pr-5",
              )}
            >
              <span
                data-action-ui-id={`session-tab-title-${session.id}`}
                title={title}
                className="min-w-0 flex-1 truncate text-[13px] font-normal leading-normal"
              >
                {title}
              </span>
              {!active2 && status.kind !== "idle" && (
                <span
                  className={cn(
                    "flex shrink-0 items-center",
                    "group-hover/tab:hidden",
                  )}
                >
                  <TabStatusBadge status={status} active={active2} />
                </span>
              )}
            </button>
          )}
          {!renaming && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleClose}
                    onDoubleClick={(event) => event.stopPropagation()}
                    aria-label={t2("session.tabs.close.tooltip", "Close tab")}
                    data-action-ui-id={`session-tab-close-${session.id}`}
                    className={cn(
                      "absolute right-1 top-1/2 z-20 size-5 -translate-y-1/2 items-center justify-center rounded-sm transition-opacity",
                      "text-foreground/40 hover:bg-foreground/10 hover:text-foreground",
                      hideClose && "hidden",
                      !hideClose &&
                        (active2
                          ? "flex opacity-100"
                          : "hidden opacity-0 group-hover/tab:flex group-hover/tab:opacity-100 focus-visible:flex focus-visible:opacity-100"),
                    )}
                  />
                }
              >
                <Icon icon={X} size="xs" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t2("session.tabs.close.tooltip", "Close tab")}
              </TooltipContent>
            </Tooltip>
          )}
        </ContextMenuTrigger>
      </SessionCostPopover>
      <ContextMenuContent>
        <ContextMenuItem
          data-action-ui-id={`session-tab-rename-${session.id}`}
          onClick={() => setRenaming(true)}
        >
          <Pencil />
          {t2("common.rename")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
const MARK_ID = "session-cost-intro";
const COMPLETION_SETTLE_MS = 1e3;
function isDocumentForeground() {
  return document.visibilityState === "visible" && document.hasFocus();
}
function SessionCostCoachMark({
  session,
  running: running2,
  isPresented,
  anchorRef,
}) {
  const { t: t2 } = useTranslation();
  const [dismissedMarks, , , dismissedMarksHydrated] = useStorage(
    "global.dismissedCoachMarks",
  );
  const visible = useSessionCostVisible(session);
  const markAlreadySeen =
    dismissedMarksHydrated &&
    Array.isArray(dismissedMarks) &&
    dismissedMarks.includes(MARK_ID);
  const canCheckCost = dismissedMarksHydrated && !markAlreadySeen;
  const wasRunningRef = reactExports.useRef(running2);
  const completionTimerRef = reactExports.useRef(null);
  const [documentForeground, setDocumentForeground] =
    reactExports.useState(isDocumentForeground);
  const [shouldCheckCost, setShouldCheckCost] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const syncDocumentForeground = () =>
      setDocumentForeground(isDocumentForeground());
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
  }, [
    dismissedMarksHydrated,
    documentForeground,
    isPresented,
    markAlreadySeen,
    running2,
    visible,
  ]);
  const cost = useSessionCost(
    session,
    canCheckCost &&
      isPresented &&
      documentForeground &&
      visible &&
      shouldCheckCost,
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
  if (identity2.includes("director") || identity2.includes("导演"))
    return Clapperboard;
  if (
    identity2.includes("dialogue") ||
    identity2.includes("script") ||
    identity2.includes("台词")
  ) {
    return MessageSquareQuote;
  }
  if (
    identity2.includes("editing") ||
    identity2.includes("editor") ||
    identity2.includes("剪辑")
  ) {
    return Scissors;
  }
  if (
    identity2.includes("summary") ||
    identity2.includes("brief") ||
    identity2.includes("简介")
  ) {
    return NotebookPen;
  }
  return PencilRuler;
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
      (rightStatus.kind !== "needs-user-action" ||
        leftStatus.action !== rightStatus.action)
    ) {
      return false;
    }
  }
  return true;
}
export function SessionTabStrip({
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
      setRawStatusById((current2) =>
        equalTabStatusMaps(current2, next2) ? current2 : next2,
      );
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
        if (
          !currRunning.has(id2) &&
          id2 !== focusedSessionId &&
          !prev.has(id2)
        ) {
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
        if (!openedTabOrder.includes(id2) && id2 !== focusedSessionId)
          next2.delete(id2);
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
      dedupedToast(
        t2(
          "session.tabs.close.toast",
          "Tab closed. Reopen from History if needed.",
        ),
      );
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
      const currentIndex = focusedSessionId
        ? openedTabOrder.indexOf(focusedSessionId)
        : -1;
      switch (e2.key) {
        case "ArrowLeft":
          targetIndex =
            currentIndex <= 0 ? openedTabOrder.length - 1 : currentIndex - 1;
          break;
        case "ArrowRight":
          targetIndex =
            currentIndex >= openedTabOrder.length - 1 ? 0 : currentIndex + 1;
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
  const focusedSession = focusedSessionId
    ? sessionById.get(focusedSessionId)
    : void 0;
  const titleSession = focusedSession ?? visibleTabs[0] ?? sessions[0];
  const singleTitle = pendingNewTab
    ? t2("chat.newChat", "New Chat")
    : titleSession
      ? sessionDisplayName(titleSession, t2)
      : t2("chat.newChat", "New Chat");
  const paneReorderLabel =
    paneReorder?.paneOrder === "chat-canvas"
      ? t2(
          "workspace.paneReorder.moveRight",
          "Move Chat to the right of Canvas",
        )
      : t2("workspace.paneReorder.moveLeft", "Move Chat to the left of Canvas");
  if (variant === "text-edit" || variant === "plugin-edit") {
    const pluginEdit = variant === "plugin-edit";
    const nodeEditAgentTitle = pluginEdit
      ? (nodeEditAgentName?.trim() ?? "") ||
        t2("chat.pluginEditAgent.title", "Editor Agent")
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
            data-action-ui-id={
              pluginEdit ? "node-agent-title-icon" : "text-assistant-title-icon"
            }
          >
            <Icon
              icon={
                pluginEdit ? nodeEditTitleIcon(nodeEditAgentTitle) : PencilRuler
              }
              size="md"
            />
          </span>
          <span className="truncate text-[13px] font-medium leading-normal text-foreground">
            {activeTextEditSession
              ? nodeEditSessionTitle(
                  activeTextEditSession,
                  t2,
                  nodeEditAgentTitle,
                )
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
              <TooltipContent side="bottom">
                {nodeEditNewSessionLabel}
              </TooltipContent>
            </Tooltip>
            {showTextEditHistory ? (
              <SessionHistory
                sessions={textEditSessions}
                openedTabIds={
                  textEditNav.activeSessionId
                    ? new Set([textEditNav.activeSessionId])
                    : new Set()
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
      className={cn(
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
                className={cn(
                  "ml-2 flex size-7 shrink-0 touch-none items-center justify-center rounded-md border-0 bg-transparent p-0 text-foreground/35 transition-colors hover:bg-foreground/[0.06] hover:text-foreground/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  paneReorder.phase === "dragging" ||
                    paneReorder.phase === "targeted"
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
        <div
          className="flex min-w-0 flex-1 items-center px-3"
          data-layout-slot="chat-single-title"
        >
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
