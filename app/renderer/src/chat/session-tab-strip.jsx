// session-tab-strip.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CircleAlert, GripVertical, NotebookPen, Pencil, PencilRuler, Plus, Scissors, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { useStorage } from "../infra/use-storage.js";
import { dedupedToast } from "../infra/agent-http-client.js";
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
import { mergeTailwindClasses as mergeClassNames, TooltipContent } from "../infra/dialog-content.jsx";
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
  const { data } = usePricingConfig();
  const statsSince = data?.sessionStatsSinceMs;
  if (statsSince === void 0) return false;
  const createdAt = Date.parse(session.created_at);
  if (!Number.isFinite(createdAt)) return false;
  return createdAt >= statsSince;
}
function ChatTabLoadingIndicator() {
  const { t: translate } = useTranslation();
  return (
    <FourCornerLoading
      variant="tab"
      size="sm"
      label={translate("session.tabs.status.generating", "Generating")}
      className="ml-1"
    />
  );
}
const IMAGE_TYPES = new Set(["image"]);
const VIDEO_TYPES = new Set(["video"]);
const AUDIO_TYPES = new Set(["audio", "music"]);
const AGENT_TYPES = new Set(["agent"]);
function bucketSessionCost(cost) {
  let image = 0;
  let video = 0;
  let audio = 0;
  let agent = 0;
  for (const item of cost.items) {
    if (IMAGE_TYPES.has(item.mediaType)) image += item.amount;
    else if (VIDEO_TYPES.has(item.mediaType)) video += item.amount;
    else if (AUDIO_TYPES.has(item.mediaType)) audio += item.amount;
    else if (AGENT_TYPES.has(item.mediaType)) agent += item.amount;
  }
  const other = cost.totalAmount - image - video - audio - agent;
  return {
    image,
    video,
    audio,
    agent,
    other: Math.max(0, other),
    total: cost.totalAmount,
  };
}
const ALWAYS_VISIBLE = ["image", "video", "audio"];
const CONDITIONAL = ["agent", "other"];
function visibleCostCategories(buckets) {
  const rows = ALWAYS_VISIBLE.map((categoryKey) => ({
    key: categoryKey,
    amount: buckets[categoryKey],
  }));
  for (const categoryKey of CONDITIONAL) {
    if (buckets[categoryKey] > 0)
      rows.push({
        key: categoryKey,
        amount: buckets[categoryKey],
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
function mapResult(responseData) {
  if (typeof responseData !== "object" || responseData === null)
    return {
      totalAmount: 0,
      items: [],
    };
  const record = responseData;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  return {
    totalAmount: toNumber(record.total_amount),
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
function chunk(items, size) {
  const chunks = [];
  for (let startIndex = 0; startIndex < items.length; startIndex += size)
    chunks.push(items.slice(startIndex, startIndex + size));
  return chunks;
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
  const response = await gatewayFetch("/api/v1/billing/session-cost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_ids: sessionIds,
    }),
    signal,
  });
  const responseBody = await response.json();
  signal?.throwIfAborted();
  return mapResult(responseBody);
}
async function fetchSessionCost(sessionIds, options) {
  if (sessionIds.length === 0)
    return {
      totalAmount: 0,
      items: [],
    };
  const batches = chunk(sessionIds, SESSION_COST_CHUNK_SIZE);
  const parts = await Promise.all(
    batches.map((batch) => fetchSessionCostChunk(batch, options?.signal)),
  );
  return mergeSessionCosts(parts);
}
const SESSION_TREE_TIMEOUT_MS = 3e3;
let requestSeq = 0;
function requestSessionTree(webSocketConnection, sessionId, signal) {
  return new Promise((resolve, reject) => {
    if (!sessionId) {
      resolve([]);
      return;
    }
    signal?.throwIfAborted();
    requestSeq += 1;
    const requestId = `session-tree-${requestSeq}`;
    let settled = false;
    const finish = (settle) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
      settle();
    };
    const onAbort = () =>
      finish(() => reject(signal?.reason ?? new Error("aborted")));
    const unsubscribe = webSocketConnection.subscribe((message) => {
      if (message.type !== "session_tree" || message.request_id !== requestId) return;
      if (message.incomplete) {
        finish(() =>
          reject(new Error(`session tree is incomplete for ${sessionId}`)),
        );
      } else {
        finish(() => resolve(message.session_ids));
      }
    });
    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error(`session tree request timed out for ${sessionId}`)),
      );
    }, SESSION_TREE_TIMEOUT_MS);
    signal?.addEventListener("abort", onAbort);
    const sent = webSocketConnection.send({
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
  const webSocketConnection = useWSConnection();
  const runtimeSessionId = session.runtime_session_id ?? session.id;
  const query = useQuery({
    queryKey: ["credit", "session-cost", runtimeSessionId],
    enabled: enabled && !!runtimeSessionId,
    staleTime: STALE_TIME_MS,
    retry: false,
    queryFn: async ({ signal }) => {
      const sessionIds = await requestSessionTree(
        webSocketConnection,
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
function CostBreakdown({ buckets }) {
  const { t: translate } = useTranslation();
  const labels = {
    image: translate("session.cost.image", "Image"),
    video: translate("session.cost.video", "Video"),
    audio: translate("session.cost.audio", "Audio"),
    agent: translate("session.cost.agent", "Agent"),
    other: translate("session.cost.other", "Other"),
  };
  const rows = visibleCostCategories(buckets);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((costRow) => (
        <div
          key={costRow.key}
          className="flex items-center justify-between text-[13px]"
        >
          <span className="text-muted-foreground">{labels[costRow.key]}</span>
          <span className="tabular-nums text-foreground/70">{costRow.amount}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-[13px]">
        <span className="text-foreground/70">
          {translate("session.cost.total", "Total")}
        </span>
        <span className="tabular-nums font-medium text-foreground">
          {buckets.total}
        </span>
      </div>
    </div>
  );
}
function SessionCostPopover({ session, children }) {
  const { t: translate } = useTranslation();
  const [hovering, setHovering] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const visible = useSessionCostVisible(session);
  const state = useSessionCost(session, hovering && visible);
  const clearTimer = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const schedule = reactExports.useCallback(
    (next, delay) => {
      clearTimer();
      timerRef.current = setTimeout(() => setHovering(next), delay);
    },
    [clearTimer],
  );
  reactExports.useEffect(() => clearTimer, [clearTimer]);
  if (!visible) return <>{children}</>;
  const hasContent =
    state.status === "error" ||
    (state.status === "ready" && state.buckets.total > 0);
  return (
    <Popover
      open={hovering && hasContent}
      onOpenChange={() => {
        clearTimer();
        setHovering(false);
      }}
    >
      <PopoverTrigger
        render={children}
        nativeButton={false}
        aria-haspopup="dialog"
        onMouseEnter={() => schedule(true, OPEN_DELAY_MS)}
        onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[200px] p-3"
        onMouseEnter={clearTimer}
        onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
      >
        <div className="mb-2 border-b border-border pb-2">
          <div className="text-sm font-medium text-foreground">
            {translate("session.cost.title", "Credits used")}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {translate(
              "session.cost.scopeNote",
              "Only includes usage generated within this chat",
            )}
          </div>
        </div>
        {state.status === "ready" ? (
          <CostBreakdown buckets={state.buckets} />
        ) : (
          <div className="text-[13px] text-muted-foreground">
            {translate("session.cost.unavailable", "Temporarily unavailable")}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
function TabStatusBadge({ status, active }) {
  const { t: translate } = useTranslation();
  if (active) return null;
  switch (status.kind) {
    case "needs-user-action": {
      const needsAnswer = status.action === "answer";
      const label = needsAnswer
        ? translate("session.tabs.status.awaitingAnswer", "Waiting for your answer")
        : translate(
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
          {translate("session.tabs.badge.failed", "Failed")}
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive shrink-0">
          {translate("session.tabs.badge.paused", "Paused")}
        </span>
      );
    case "running":
      return <ChatTabLoadingIndicator />;
    case "unread":
      return (
        <span
          role="status"
          aria-label={translate(
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
const SessionTab = reactExports.memo(function SessionTab({
  session,
  active,
  status,
  hideClose = false,
  onActivate,
  onClose,
  onRename,
}) {
  const { t: translate } = useTranslation();
  const title = sessionDisplayName(session, translate);
  const [renaming, setRenaming] = reactExports.useState(false);
  const handleClose = (clickEvent) => {
    clickEvent.stopPropagation();
    onClose(session.id);
  };
  const handleActivate = () => {
    if (!active) onActivate(session.id);
  };
  const handleRenameConfirm = reactExports.useCallback(
    (newTitle) => {
      const trimmed = newTitle.trim();
      if (trimmed && trimmed !== title) onRename(session.id, trimmed);
      setRenaming(false);
    },
    [onRename, session.id, title],
  );
  const handleMouseDown = (mouseEvent) => {
    if (mouseEvent.button === 1 && !hideClose) {
      mouseEvent.preventDefault();
      onClose(session.id);
    }
  };
  return (
    <ContextMenu>
      <SessionCostPopover session={session}>
        <ContextMenuTrigger
          data-action-ui-id={`session-tab-${session.id}`}
          data-window-drag-region="no-drag"
          className={mergeClassNames(
            "no-drag group/tab relative flex h-7 w-full cursor-pointer select-none items-center rounded-md px-2 transition-colors duration-150 ease-out",
            active
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
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={handleActivate}
              onMouseDown={handleMouseDown}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setRenaming(true);
              }}
              className={mergeClassNames(
                "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left transition-colors",
                hideClose
                  ? "pr-0"
                  : active
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
              {!active && status.kind !== "idle" && (
                <span
                  className={mergeClassNames(
                    "flex shrink-0 items-center",
                    "group-hover/tab:hidden",
                  )}
                >
                  <TabStatusBadge status={status} active={active} />
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
                    aria-label={translate("session.tabs.close.tooltip", "Close tab")}
                    data-action-ui-id={`session-tab-close-${session.id}`}
                    className={mergeClassNames(
                      "absolute right-1 top-1/2 z-20 size-5 -translate-y-1/2 items-center justify-center rounded-sm transition-opacity",
                      "text-foreground/40 hover:bg-foreground/10 hover:text-foreground",
                      hideClose && "hidden",
                      !hideClose &&
                        (active
                          ? "flex opacity-100"
                          : "hidden opacity-0 group-hover/tab:flex group-hover/tab:opacity-100 focus-visible:flex focus-visible:opacity-100"),
                    )}
                  />
                }
              >
                <Icon icon={CloseIcon} size="xs" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {translate("session.tabs.close.tooltip", "Close tab")}
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
          {translate("common.rename")}
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
  running,
  isPresented,
  anchorRef,
}) {
  const { t: translate } = useTranslation();
  const [dismissedMarks, , , dismissedMarksHydrated] = useStorage(
    "global.dismissedCoachMarks",
  );
  const visible = useSessionCostVisible(session);
  const markAlreadySeen =
    dismissedMarksHydrated &&
    Array.isArray(dismissedMarks) &&
    dismissedMarks.includes(MARK_ID);
  const canCheckCost = dismissedMarksHydrated && !markAlreadySeen;
  const wasRunningRef = reactExports.useRef(running);
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
      wasRunningRef.current = running;
      setShouldCheckCost(false);
      return;
    }
    if (running) {
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
    running,
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
      title={translate("coachMark.sessionCost.title", "View chat credit usage")}
      description={translate(
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
function nodeEditSessionTitle(session, translate, agentTitle) {
  const genericDefaults = new Set([
    translate("chat.textEditAgent.sessionName", "Text Assistant"),
    translate("chat.pluginEditAgent.sessionName", "Editor Agent"),
    "Text Agent",
    "文本 Agent",
  ]);
  if (genericDefaults.has(session.name)) return agentTitle;
  return sessionDisplayName(session, translate);
}
function nodeEditTitleIcon(agentTitle) {
  const identity = agentTitle.toLocaleLowerCase();
  if (identity.includes("director") || identity.includes("导演"))
    return Clapperboard;
  if (
    identity.includes("dialogue") ||
    identity.includes("script") ||
    identity.includes("台词")
  ) {
    return MessageSquareQuote;
  }
  if (
    identity.includes("editing") ||
    identity.includes("editor") ||
    identity.includes("剪辑")
  ) {
    return Scissors;
  }
  if (
    identity.includes("summary") ||
    identity.includes("brief") ||
    identity.includes("简介")
  ) {
    return NotebookPen;
  }
  return PencilRuler;
}
function snapshotStatuses(store, openedTabOrder) {
  const state = store.getState();
  const statusBySessionId = new Map();
  for (const sessionId of openedTabOrder) {
    const sessionState = state.sessions.get(sessionId);
    if (!sessionState) continue;
    statusBySessionId.set(
      sessionId,
      deriveTabStatus({
        busy: sessionState.busy,
        pendingReasons: sessionState.pendingReasons,
        messages: sessionState.messages,
      }),
    );
  }
  return statusBySessionId;
}
function equalTabStatusMaps(left, right) {
  if (left.size !== right.size) return false;
  for (const [sessionId, leftStatus] of left) {
    const rightStatus = right.get(sessionId);
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
  const { t: translate } = useTranslation();
  const paneReorder = useWorkspacePaneReorder();
  const activeTabRef = reactExports.useRef(null);
  const singleTitleRef = reactExports.useRef(null);
  const [rawStatusById, setRawStatusById] = reactExports.useState(() =>
    snapshotStatuses(sessionStore, openedTabOrder),
  );
  reactExports.useEffect(() => {
    const update = () => {
      const next = snapshotStatuses(sessionStore, openedTabOrder);
      setRawStatusById((current) =>
        equalTabStatusMaps(current, next) ? current : next,
      );
    };
    update();
    return sessionStore.subscribe(update);
  }, [sessionStore, openedTabOrder]);
  const prevRunningRef = reactExports.useRef(new Set());
  const [unreadIds, setUnreadIds] = reactExports.useState(() => new Set());
  reactExports.useEffect(() => {
    const currRunning = new Set();
    for (const [sessionId, status] of rawStatusById) {
      if (status.kind === "running") currRunning.add(sessionId);
    }
    const prevRunning = prevRunningRef.current;
    prevRunningRef.current = currRunning;
    setUnreadIds((prev) => {
      let next = null;
      for (const sessionId of prevRunning) {
        if (
          !currRunning.has(sessionId) &&
          sessionId !== focusedSessionId &&
          !prev.has(sessionId)
        ) {
          if (!next) next = new Set(prev);
          next.add(sessionId);
        }
      }
      return next ?? prev;
    });
  }, [rawStatusById, focusedSessionId]);
  reactExports.useEffect(() => {
    if (!focusedSessionId && openedTabOrder.length === 0) return;
    setUnreadIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      if (focusedSessionId) next.delete(focusedSessionId);
      for (const sessionId of prev) {
        if (!openedTabOrder.includes(sessionId) && sessionId !== focusedSessionId)
          next.delete(sessionId);
      }
      return next.size === prev.size &&
        [...next].every((sessionId) => prev.has(sessionId)) &&
        [...prev].every((sessionId) => next.has(sessionId))
        ? prev
        : next;
    });
  }, [focusedSessionId, openedTabOrder]);
  const statusById = new Map(rawStatusById);
  for (const sessionId of unreadIds) {
    const storedStatus = statusById.get(sessionId);
    if (!storedStatus || storedStatus.kind === "idle") {
      statusById.set(sessionId, {
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
    (sessionId) => {
      if (sessionId === focusedSessionId) return;
      onSend({
        type: "switch_session",
        session_id: sessionId,
      });
    },
    [onSend, focusedSessionId],
  );
  const handleClose = reactExports.useCallback(
    (sessionId) => {
      if (!onCloseTab(sessionId)) return;
      dedupedToast(
        translate(
          "session.tabs.close.toast",
          "Tab closed. Reopen from History if needed.",
        ),
      );
    },
    [onCloseTab, translate],
  );
  const handleRename = reactExports.useCallback(
    (sessionId, newTitle) => {
      onRename(sessionId, newTitle);
    },
    [onRename],
  );
  const handleTabListKeyDown = reactExports.useCallback(
    (keyboardEvent) => {
      if (openedTabOrder.length === 0) return;
      let targetIndex = null;
      const currentIndex = focusedSessionId
        ? openedTabOrder.indexOf(focusedSessionId)
        : -1;
      switch (keyboardEvent.key) {
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
      keyboardEvent.preventDefault();
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
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const visibleTabs = [];
  for (const sessionId of openedTabOrder) {
    const session = sessionById.get(sessionId);
    if (session) visibleTabs.push(session);
  }
  const presentationCount = visibleTabs.length + (pendingNewTab ? 1 : 0);
  const multiChat = sessions.length > 1 || presentationCount > 1;
  const hideCloseSingleton = visibleTabs.length === 1 && !pendingNewTab;
  const focusedSession = focusedSessionId
    ? sessionById.get(focusedSessionId)
    : void 0;
  const titleSession = focusedSession ?? visibleTabs[0] ?? sessions[0];
  const singleTitle = pendingNewTab
    ? translate("chat.newChat", "New Chat")
    : titleSession
      ? sessionDisplayName(titleSession, translate)
      : translate("chat.newChat", "New Chat");
  const paneReorderLabel =
    paneReorder?.paneOrder === "chat-canvas"
      ? translate(
          "workspace.paneReorder.moveRight",
          "Move Chat to the right of Canvas",
        )
      : translate("workspace.paneReorder.moveLeft", "Move Chat to the left of Canvas");
  if (variant === "text-edit" || variant === "plugin-edit") {
    const pluginEdit = variant === "plugin-edit";
    const nodeEditAgentTitle = pluginEdit
      ? (nodeEditAgentName?.trim() ?? "") ||
        translate("chat.pluginEditAgent.title", "Editor Agent")
      : translate("chat.textEditAgent.title", "Text Agent");
    const nodeEditNewSessionLabel = pluginEdit
      ? translate("chat.pluginEditAgent.newSession", "New {{name}} chat", {
          name: nodeEditAgentTitle,
        })
      : translate("chat.textEditAgent.newSession", "New Text Assistant chat");
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
                  translate,
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
      className={mergeClassNames(
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
                className={mergeClassNames(
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
            aria-label={translate("session.tabs.list.label", "Chat sessions")}
            onKeyDown={handleTabListKeyDown}
            className="flex h-full items-center gap-1 px-2"
          >
            {visibleTabs.map((session) => {
              const isActive = session.id === focusedSessionId;
              return (
                <div
                  key={session.id}
                  ref={isActive ? activeTabRef : void 0}
                  className="relative flex min-w-0 max-w-[220px] flex-1 basis-0"
                >
                  <SessionTab
                    session={session}
                    active={isActive}
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
                    {translate("chat.newChat", "New Chat")}
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
                aria-label={translate("session.tabs.new.tooltip", "New chat")}
                data-action-ui-id="session-tab-new"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              />
            }
          >
            <Icon icon={Plus} size="md" strokeWidth={1} />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {translate("session.tabs.new.tooltip", "New chat")}
          </TooltipContent>
        </Tooltip>
        {multiChat ? (
          <SessionHistory
            sessions={sessions}
            openedTabIds={openedTabIds}
            loading={sessionsLoading}
            hasUnseen={hasEvicted}
            onOpen={(sessionId) =>
              onSend({
                type: "switch_session",
                session_id: sessionId,
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
