// history-anchor-rail-impl.jsx
import { jsxRuntimeExports, reactExports, useTranslation, dedupedToast, Check, X$7, getRuntimeConfig, Copy, MonochromeIcon, ThumbsUp, ThumbsDown, RotateCcw, ArrowDown, useAssetMetadataStore } from "../vendor.js";
import { Popover, PopoverTrigger } from "../assets/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger, Icon, DropdownMenu, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { useGeneratingStateStore } from "../media-editing/parse-item.jsx";
import {
  TooltipContent,
  cn$2,
  Button$1,
  Textarea,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { PopoverContent, PopoverTitle } from "../team/use-credit-details.jsx";
import { isMacPlatform } from "../workspace/shortcut-categories.jsx";
import { CHAT_RATING_COMMENT_MAX_LENGTH } from "../text-editor/myers-line-hunks.js";
import { useFeedback } from "../settings/feedback-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useChatRating } from "./use-chat-rating.js";
const CHAT_RATING_REASON_OPTIONS = [
  "misunderstood_request",
  "misused_materials",
  "poor_quality",
  "incomplete_result",
  "slow_or_repeated_failures",
  "other",
];
const CHAT_RATING_CATEGORY_OPTIONS = [
  "shortDrama",
  "ecommerce",
  "mvMusic",
  "animation",
  "knowledge",
  "other",
];
const LEGACY_REASON_MAP = {
  forgot_requirements: "misunderstood_request",
  vague_or_unprofessional: "poor_quality",
};
const LEGACY_CATEGORY_MAP = {
  filmEdit: "shortDrama",
  adsMarketing: "ecommerce",
};
function normalizeReasons(reasonCodes) {
  const visibleReasons = new Set(CHAT_RATING_REASON_OPTIONS);
  return Array.from(
    new Set(
      reasonCodes
        .map((reason) => LEGACY_REASON_MAP[reason] ?? reason)
        .filter((reason) => visibleReasons.has(reason)),
    ),
  );
}
function normalizeCategory(category) {
  const normalized = LEGACY_CATEGORY_MAP[category] ?? category;
  return CHAT_RATING_CATEGORY_OPTIONS.some((option2) => option2 === normalized) ? normalized : "";
}
function ChatRatingControls({ target, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const {
    current: current2,
    submitting,
    submit,
    loading,
    loadFailed,
    retry,
    signedIn,
  } = useChatRating(target);
  const [open, setOpen] = reactExports.useState(false);
  const [reasons, setReasons] = reactExports.useState([]);
  const [category, setCategory] = reactExports.useState("");
  const [comment2, setComment] = reactExports.useState("");
  const commentRef = reactExports.useRef(null);
  const hasOtherReason = reasons.includes("other");
  reactExports.useEffect(() => {
    if (open && hasOtherReason) commentRef.current?.focus();
  }, [open, hasOtherReason]);
  const disabled2 = loading || submitting || !signedIn;
  const handleOpenChange = (next2) => {
    if (submitting) return;
    if (next2) {
      setReasons(normalizeReasons(current2?.reason_codes ?? []));
      setCategory(normalizeCategory(current2?.task_category ?? ""));
      setComment(current2?.comment ?? "");
    }
    setOpen(next2);
    onOpenChange(next2);
  };
  const handleSubmit = async () => {
    if (reasons.length === 0 || !category) return;
    if (await submit("down", reasons, category, hasOtherReason ? comment2 : "")) {
      setOpen(false);
      onOpenChange(false);
    }
  };
  const likeLabel = t2(current2?.rating === "up" ? "chat.rating.removeLike" : "chat.rating.like");
  const dislikeLabel = t2("chat.rating.dislike");
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button$1
              variant="ghost"
              size="icon-xs"
              disabled={disabled2}
              aria-label={likeLabel}
              aria-pressed={current2?.rating === "up"}
              data-action-ui-id="chat-assistant-like"
              className={cn$2(
                "icon-muted-control",
                current2?.rating === "up" && "bg-muted text-brand-accent hover:text-brand-accent",
              )}
              onClick={() => void submit(current2?.rating === "up" ? "none" : "up")}
            >
              <MonochromeIcon tone="control">
                <ThumbsUp className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              </MonochromeIcon>
            </Button$1>
          }
        />
        <TooltipContent>{likeLabel}</TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button$1
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled2}
                    aria-label={dislikeLabel}
                    aria-pressed={current2?.rating === "down"}
                    data-action-ui-id="chat-assistant-dislike"
                    className={cn$2(
                      "icon-muted-control",
                      current2?.rating === "down" &&
                        "bg-muted text-brand-accent hover:text-brand-accent",
                    )}
                  >
                    <MonochromeIcon tone="control">
                      <ThumbsDown className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </MonochromeIcon>
                  </Button$1>
                }
              />
            }
          />
          <TooltipContent>{dislikeLabel}</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-88 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto p-4 gap-4"
          data-action-ui-id="chat-rating-popover"
        >
          <div className="flex items-center justify-between gap-3">
            <PopoverTitle>{t2("chat.rating.title")}</PopoverTitle>
            <Button$1
              variant="ghost"
              size="icon-xs"
              disabled={submitting}
              aria-label={t2("chat.rating.close")}
              onClick={() => handleOpenChange(false)}
              data-action-ui-id="chat-rating-close"
            >
              <X$7 strokeWidth={1.5} aria-hidden="true" />
            </Button$1>
          </div>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">{t2("chat.rating.reasons")}</legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_REASON_OPTIONS.map((reason) => {
                const selected2 = reasons.includes(reason);
                return (
                  <Button$1
                    key={reason}
                    variant={selected2 ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selected2}
                    className={cn$2(
                      "font-normal",
                      selected2 &&
                        "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                    )}
                    data-action-ui-id={`chat-rating-reason-${reason}`}
                    onClick={() =>
                      setReasons((previous2) =>
                        selected2
                          ? previous2.filter((item) => item !== reason)
                          : [...previous2, reason],
                      )
                    }
                  >
                    {t2(`chat.rating.reason.${reason}`)}
                  </Button$1>
                );
              })}
            </div>
            {hasOtherReason && (
              <Textarea
                ref={commentRef}
                value={comment2}
                onChange={(event) => setComment(event.target.value)}
                maxLength={CHAT_RATING_COMMENT_MAX_LENGTH}
                disabled={submitting}
                aria-label={t2("chat.rating.comment")}
                placeholder={t2("chat.rating.comment")}
                data-action-ui-id="chat-rating-comment"
              />
            )}
          </fieldset>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">{t2("chat.rating.category")}</legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_CATEGORY_OPTIONS.map((key2) => (
                <Button$1
                  key={key2}
                  variant={category === key2 ? "default" : "outline"}
                  size="sm"
                  aria-pressed={category === key2}
                  className={cn$2(
                    "font-normal",
                    category === key2 &&
                      "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                  )}
                  data-action-ui-id={`chat-rating-category-${key2}`}
                  onClick={() => setCategory(key2)}
                >
                  {t2(`chat.rating.category.${key2}`)}
                </Button$1>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">{t2("chat.rating.contextHint")}</p>
          <div className="flex gap-2">
            {current2?.rating === "down" && (
              <Button$1
                variant="outline"
                disabled={submitting}
                data-action-ui-id="chat-rating-withdraw"
                onClick={async () => {
                  if (await submit("none")) {
                    setOpen(false);
                    onOpenChange(false);
                  }
                }}
              >
                {t2("chat.rating.withdraw")}
              </Button$1>
            )}
            <Button$1
              className="flex-1"
              loading={submitting}
              disabled={reasons.length === 0 || !category}
              onClick={() => void handleSubmit()}
              data-action-ui-id="chat-rating-submit"
            >
              {t2("chat.rating.submit")}
            </Button$1>
          </div>
        </PopoverContent>
      </Popover>
      {loadFailed && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button$1
                variant="ghost"
                size="icon-xs"
                onClick={() => void retry()}
                aria-label={t2("chat.rating.retryLoad")}
                data-action-ui-id="chat-rating-reload"
              >
                <RotateCcw strokeWidth={1.5} aria-hidden="true" />
              </Button$1>
            }
          />
          <TooltipContent>{t2("chat.rating.retryLoad")}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
export function useCopy(onCopied) {
  const [copied, setCopied] = reactExports.useState(false);
  const mountedRef = reactExports.useRef(false);
  const resetTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    };
  }, []);
  const copy2 = reactExports.useCallback(
    async (text2) => {
      if (!navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(text2);
        if (!mountedRef.current) return;
        if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
        setCopied(true);
        resetTimerRef.current = setTimeout(() => {
          resetTimerRef.current = null;
          setCopied(false);
        }, 1500);
        onCopied?.();
      } catch {}
    },
    [onCopied],
  );
  return {
    copied,
    copy: copy2,
  };
}
const HOVER_MENU_CLOSE_DELAY_MS = 150;
export function AssistantMessageActions({
  content: content2,
  requestId,
  alwaysVisible = false,
  ratingTarget,
}) {
  const { t: t2 } = useTranslation();
  const { openFeedback } = useFeedback();
  const { copied: messageCopied, copy: copyMessage } = useCopy();
  const handleRequestIdCopied = reactExports.useCallback(() => {
    dedupedToast.success(t2("chat.requestIdCopied"));
  }, [t2]);
  const { copied: requestIdCopied, copy: copyRequestId } = useCopy(handleRequestIdCopied);
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [ratingOpen, setRatingOpen] = reactExports.useState(false);
  const openFrameRef = reactExports.useRef(null);
  const closeTimerRef = reactExports.useRef(null);
  const cancelScheduledOpen = reactExports.useCallback(() => {
    if (openFrameRef.current === null) return;
    cancelAnimationFrame(openFrameRef.current);
    openFrameRef.current = null;
  }, []);
  const cancelScheduledClose = reactExports.useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);
  const handlePointerEnter = reactExports.useCallback(() => {
    cancelScheduledClose();
    if (menuOpen || openFrameRef.current !== null) return;
    openFrameRef.current = requestAnimationFrame(() => {
      openFrameRef.current = requestAnimationFrame(() => {
        openFrameRef.current = null;
        setMenuOpen(true);
      });
    });
  }, [cancelScheduledClose, menuOpen]);
  const handlePointerLeave = reactExports.useCallback(() => {
    cancelScheduledOpen();
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, HOVER_MENU_CLOSE_DELAY_MS);
  }, [cancelScheduledClose, cancelScheduledOpen]);
  const handleMenuOpenChange = reactExports.useCallback(
    (open) => {
      cancelScheduledOpen();
      if (open) cancelScheduledClose();
      setMenuOpen(open);
    },
    [cancelScheduledClose, cancelScheduledOpen],
  );
  reactExports.useEffect(
    () => () => {
      cancelScheduledOpen();
      cancelScheduledClose();
    },
    [cancelScheduledClose, cancelScheduledOpen],
  );
  const handleFeedback = reactExports.useCallback(() => {
    handleMenuOpenChange(false);
    openFeedback({
      source: "chat_message",
      context: requestId
        ? {
            message_id: requestId,
          }
        : void 0,
      logUploadReason: "chat_message_feedback",
    });
  }, [handleMenuOpenChange, openFeedback, requestId]);
  const copyLabel = t2(messageCopied ? "chat.copied" : "chat.copyMessage");
  return (
    <div
      data-action-ui-id="chat-assistant-actions"
      data-always-visible={alwaysVisible ? "true" : void 0}
      className={`flex items-center gap-1 pt-1 text-muted-foreground transition-opacity duration-150 ${alwaysVisible || menuOpen || ratingOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 group-hover/assistant:pointer-events-auto group-hover/assistant:opacity-100 group-focus-within/assistant:pointer-events-auto group-focus-within/assistant:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"}`}
    >
      {content2 && (
        <Tooltip>
          <TooltipTrigger
            closeOnClick={false}
            render={
              <button
                type="button"
                data-action-ui-id="chat-assistant-copy"
                onClick={() => void copyMessage(content2)}
                aria-label={copyLabel}
                className="icon-muted-control inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <Icon
                  tone="control"
                  icon={messageCopied ? Check : Copy}
                  size="sm"
                  aria-hidden={true}
                />
              </button>
            }
          />
          <TooltipContent side="top">{copyLabel}</TooltipContent>
        </Tooltip>
      )}
      {ratingTarget && (
        <ChatRatingControls
          key={`${ratingTarget.sessionId}:${ratingTarget.requestId}`}
          target={ratingTarget}
          onOpenChange={setRatingOpen}
        />
      )}
      <div onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger
            type="button"
            data-action-ui-id="chat-assistant-more"
            aria-label={t2("chat.moreActions")}
            className="icon-muted-control inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 data-[popup-open]:bg-foreground/5 data-[popup-open]:text-foreground"
          >
            <MonochromeIcon tone="control">
              <MoreVerticalIcon size={14} />
            </MonochromeIcon>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="min-w-40 duration-[80ms] data-open:zoom-in-100 data-closed:zoom-out-100"
            data-action-ui-id="chat-assistant-actions-menu"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-copy"
              className="px-3 py-2 text-body-14 font-normal"
              onClick={() => void copyMessage(content2)}
            >
              {t2("chat.copyMessage")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-feedback"
              className="px-3 py-2 text-body-14 font-normal"
              onClick={handleFeedback}
            >
              {t2("chat.submitFeedback")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-action-ui-id="chat-assistant-menu-copy-request-id"
              className="px-3 py-2 text-body-14 font-normal"
              disabled={!requestId}
              onClick={() => requestId && void copyRequestId(requestId)}
            >
              {t2(requestIdCopied ? "chat.requestIdCopied" : "chat.copyRequestId")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
export function collectAssistantCopyText(messages2) {
  return messages2
    .filter(
      (message2) =>
        message2.role === "agent" && message2.type === "text" && message2.content.trim().length > 0,
    )
    .map((message2) => message2.content.trim())
    .join("\n\n");
}
export function BottomAnchorButton({ state: state2, onClick }) {
  const { t: t2 } = useTranslation();
  const isScrolling = state2 === "scrolling-to-bottom";
  const ariaLabel = t2("chat.bottomAnchor.label", "回到最新消息");
  const handleClick2 = () => {
    if (isScrolling) return;
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handleClick2}
      aria-label={ariaLabel}
      aria-busy={isScrolling}
      data-action-ui-id="chat-bottom-anchor-button"
      className="flex size-8 items-center justify-center rounded-full bg-card border border-border shadow-xs transition-colors hover:bg-muted animate-[bottom-anchor-in_150ms_ease-out]"
    >
      <ArrowDown size={16} strokeWidth={1.75} className="text-foreground" />
    </button>
  );
}
const ChatPresentationContext = reactExports.createContext(true);
export function ChatPresentationProvider({ children: children2, isPresented }) {
  return (
    <ChatPresentationContext.Provider value={isPresented}>
      {children2}
    </ChatPresentationContext.Provider>
  );
}
export function useChatPresentation() {
  return reactExports.useContext(ChatPresentationContext);
}
export function GenerationHandoffSummary({ targets }) {
  const { t: t2 } = useTranslation();
  const completedCount = useAssetMetadataStore((state22) => {
    let count2 = 0;
    for (const target of targets) {
      if (state22.assets.get(target.node_id)?.url) count2 += 1;
    }
    return count2;
  });
  const activeCount = useGeneratingStateStore((state22) => {
    let count2 = 0;
    for (const target of targets) {
      if (state22.byNode.has(target.node_id)) count2 += 1;
    }
    return count2;
  });
  const allCompleted = targets.length > 0 && activeCount === 0 && completedCount === targets.length;
  const state2 = allCompleted ? "completed" : activeCount > 0 ? "generating" : "settled";
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      data-action-ui-id="chat-generation-handoff-summary"
      data-generation-state={state2}
    >
      <p className="text-body-14 text-muted-foreground">
        {state2 === "completed"
          ? t2("chat.activity.mediaGenHandoffCompletedDescription", {
              count: targets.length,
            })
          : t2("chat.activity.mediaGenInterruptedDescription")}
      </p>
    </div>
  );
}
const MAX_VISIBLE_RAIL_TURNS = 50;
const RAIL_TICK_HEIGHT_PX = 10;
const RAIL_WINDOW_OVERSCAN_TURNS = 2;
const RAIL_VIEWPORT_HEIGHT_PX = MAX_VISIBLE_RAIL_TURNS * RAIL_TICK_HEIGHT_PX;
const PREVIEW_CARD_ESTIMATED_HEIGHT_PX = 140;
const PIANO_RADIUS = 2;
const HistoryAnchorRailImpl = ({
  turns,
  activeIndex,
  activeIndexes = [activeIndex],
  onJumpToTurn,
  compact = false,
}) => {
  const { t: t2 } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = reactExports.useState(null);
  const [hoverYInNav, setHoverYInNav] = reactExports.useState(-1);
  const [railScrollTop, setRailScrollTop] = reactExports.useState(0);
  const navRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const rafIdRef = reactExports.useRef(null);
  const turnsRef = reactExports.useRef(turns);
  turnsRef.current = turns;
  const ariaLabel = t2("chat.historyRail.label", "对话锚点");
  const activeIndexSet = reactExports.useMemo(() => new Set(activeIndexes), [activeIndexes]);
  const turnByIndex = reactExports.useMemo(
    () => new Map(turns.map((turn) => [turn.index, turn])),
    [turns],
  );
  const turnPositionByIndex = reactExports.useMemo(
    () => new Map(turns.map((turn, position2) => [turn.index, position2])),
    [turns],
  );
  const totalRailHeight = turns.length * RAIL_TICK_HEIGHT_PX;
  const railViewportHeight = Math.min(totalRailHeight, RAIL_VIEWPORT_HEIGHT_PX);
  const visibleTurns = reactExports.useMemo(() => {
    const firstVisiblePosition = Math.floor(railScrollTop / RAIL_TICK_HEIGHT_PX);
    const start2 = Math.max(0, firstVisiblePosition - RAIL_WINDOW_OVERSCAN_TURNS);
    const end2 = Math.min(
      turns.length,
      Math.ceil((railScrollTop + railViewportHeight) / RAIL_TICK_HEIGHT_PX) +
        RAIL_WINDOW_OVERSCAN_TURNS,
    );
    return turns.slice(start2, end2).map((turn, offset2) => ({
      position: start2 + offset2,
      turn,
    }));
  }, [railScrollTop, railViewportHeight, turns]);
  const hoveredTurn = reactExports.useMemo(
    () => (hoveredIndex != null ? (turnByIndex.get(hoveredIndex) ?? null) : null),
    [hoveredIndex, turnByIndex],
  );
  const previewUserSignal = hoveredTurn?.userSignal ?? null;
  const previewAgentSignal = compact ? null : (hoveredTurn?.agentSignal ?? null);
  const handleMouseMove2 = reactExports.useCallback((e2) => {
    if (rafIdRef.current != null) return;
    const clientY = e2.clientY;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const nav2 = navRef.current;
      const list2 = listRef.current;
      if (!nav2 || !list2) return;
      const navRect = nav2.getBoundingClientRect();
      const yInNav = clientY - navRect.top;
      setHoverYInNav((prev) => (Math.abs(prev - yInNav) < 1 ? prev : yInNav));
      const currentTurns = turnsRef.current;
      if (currentTurns.length === 0) return;
      const listRect = list2.getBoundingClientRect();
      const position2 = Math.max(
        0,
        Math.min(
          currentTurns.length - 1,
          Math.floor((list2.scrollTop + clientY - listRect.top) / RAIL_TICK_HEIGHT_PX),
        ),
      );
      const nextIndex = currentTurns[position2]?.index;
      if (nextIndex == null) return;
      setHoveredIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    });
  }, []);
  const handleMouseLeave2 = reactExports.useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setHoveredIndex(null);
    setHoverYInNav(-1);
  }, []);
  reactExports.useEffect(
    () => () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    },
    [],
  );
  const handleListScroll = reactExports.useCallback((event) => {
    const nextScrollTop = event.currentTarget.scrollTop;
    setRailScrollTop((prev) => (prev === nextScrollTop ? prev : nextScrollTop));
  }, []);
  reactExports.useEffect(() => {
    const list2 = listRef.current;
    const activePosition = turnPositionByIndex.get(activeIndex);
    if (!list2 || activePosition == null) return;
    const targetTop = activePosition * RAIL_TICK_HEIGHT_PX;
    const targetBottom = targetTop + RAIL_TICK_HEIGHT_PX;
    const viewportHeight = list2.clientHeight || railViewportHeight;
    let nextScrollTop = list2.scrollTop;
    if (targetTop < nextScrollTop) {
      nextScrollTop = targetTop;
    } else if (targetBottom > nextScrollTop + viewportHeight) {
      nextScrollTop = targetBottom - viewportHeight;
    }
    if (list2.scrollTop !== nextScrollTop) list2.scrollTop = nextScrollTop;
    setRailScrollTop((prev) => (prev === nextScrollTop ? prev : nextScrollTop));
  }, [activeIndex, railViewportHeight, turnPositionByIndex]);
  const previewTopStyle = reactExports.useMemo(() => {
    if (hoverYInNav < 0) return void 0;
    if (compact)
      return {
        top: `${hoverYInNav}px`,
      };
    const nav2 = navRef.current;
    const navH = nav2?.clientHeight ?? 0;
    if (navH <= 0)
      return {
        top: 0,
      };
    const ideal = hoverYInNav - PREVIEW_CARD_ESTIMATED_HEIGHT_PX / 2;
    const clamped = Math.max(0, Math.min(navH - PREVIEW_CARD_ESTIMATED_HEIGHT_PX, ideal));
    return {
      top: `${clamped}px`,
    };
  }, [compact, hoverYInNav]);
  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      data-action-ui-id="chat-history-rail"
      data-overflowing={turns.length > MAX_VISIBLE_RAIL_TURNS ? "true" : void 0}
      data-compact={compact ? "true" : void 0}
      onMouseMove={handleMouseMove2}
      onMouseLeave={handleMouseLeave2}
      className={`absolute right-2 top-12 z-10 py-2 ${compact ? "w-[18px]" : "w-8"}`}
    >
      <div
        ref={listRef}
        data-action-ui-id="chat-history-rail-list"
        onScroll={handleListScroll}
        className="relative max-h-[500px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          data-history-rail-spacer={true}
          className="relative w-full"
          style={{
            height: `${totalRailHeight}px`,
          }}
        >
          {visibleTurns.map(({ position: position2, turn }) => {
            const rawDistance =
              hoveredIndex != null ? Math.abs(turn.index - hoveredIndex) : Number.POSITIVE_INFINITY;
            const pianoDistance =
              rawDistance > PIANO_RADIUS ? Number.POSITIVE_INFINITY : rawDistance;
            return (
              <RailTick
                key={turn.index}
                index={turn.index}
                top={position2 * RAIL_TICK_HEIGHT_PX}
                isPrimaryActive={turn.index === activeIndex}
                isVisibleActive={activeIndexSet.has(turn.index)}
                hasHoveredMarker={hoveredIndex != null}
                pianoDistance={pianoDistance}
                compact={compact}
                onJumpToTurn={onJumpToTurn}
              />
            );
          })}
        </div>
      </div>
      {(previewUserSignal || previewAgentSignal) && (
        <PreviewCard
          userSignal={previewUserSignal}
          agentSignal={previewAgentSignal}
          topStyle={previewTopStyle}
          compact={compact}
        />
      )}
    </nav>
  );
};
const RailTick = reactExports.memo(function RailTick2({
  index: index2,
  top: top2,
  isPrimaryActive,
  isVisibleActive,
  hasHoveredMarker,
  pianoDistance,
  compact,
  onJumpToTurn,
}) {
  const { t: t2 } = useTranslation();
  const handleClick2 = reactExports.useCallback(() => onJumpToTurn(index2), [index2, onJumpToTurn]);
  const ariaLabel = t2("chat.historyRail.turn", "对话 {{n}}", {
    n: index2 + 1,
  });
  let widthClass;
  if (compact) {
    if (pianoDistance === 0) {
      widthClass = "w-[18px]";
    } else if (pianoDistance === 1) {
      widthClass = "w-4";
    } else if (pianoDistance === 2) {
      widthClass = "w-3";
    } else {
      widthClass = "w-2";
    }
  } else if (pianoDistance === 0) {
    widthClass = "w-8";
  } else if (pianoDistance === 1) {
    widthClass = "w-6";
  } else if (pianoDistance === 2) {
    widthClass = "w-5";
  } else {
    widthClass = "w-3.5";
  }
  let colorClass;
  if (pianoDistance === 0) {
    colorClass = "bg-foreground";
  } else if (isVisibleActive && !hasHoveredMarker) {
    colorClass = "bg-foreground/50";
  } else {
    colorClass = "bg-foreground/10";
  }
  return (
    <button
      type="button"
      onClick={handleClick2}
      aria-label={ariaLabel}
      aria-current={isPrimaryActive ? "true" : void 0}
      data-turn-index={index2}
      data-visible-active={isVisibleActive ? "true" : void 0}
      className="group absolute right-0 flex h-2.5 w-full shrink-0 items-center justify-end cursor-pointer"
      style={{
        top: `${top2}px`,
      }}
    >
      <span
        className={`block h-[2.5px] transition-all duration-150 ease-out ${widthClass} ${colorClass}`}
      />
    </button>
  );
});
RailTick.displayName = "RailTick";
const PreviewCard = reactExports.memo(function PreviewCard2({
  userSignal,
  agentSignal,
  topStyle,
  compact,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      style={topStyle}
      data-action-ui-id="chat-history-rail-preview"
      className={`elevated-surface-border pointer-events-none absolute right-full mr-2 rounded-lg bg-popover shadow-lg text-popover-foreground p-3 space-y-1.5 ${compact ? "w-56 -translate-y-1/2" : "w-64 max-w-[320px]"}`}
      role="tooltip"
    >
      {userSignal && <UserSignalRow signal={userSignal} t={t2} />}
      {agentSignal && <AgentSignalRow signal={agentSignal} t={t2} />}
    </div>
  );
});
PreviewCard.displayName = "PreviewCard";
function formatAttachmentSummary(s2, t2) {
  if (s2.kind === "single") return s2.filename;
  if (s2.kind === "sameType") {
    return t2(`chat.historyRail.attachmentCount.${s2.type}`, {
      defaultValue: `${s2.count} 个附件`,
      count: s2.count,
    });
  }
  return t2("chat.historyRail.attachmentCount.mixed", {
    defaultValue: `${s2.count} 个附件`,
    count: s2.count,
  });
}
function UserSignalRow({ signal, t: t2 }) {
  if (signal.kind === "text") {
    return (
      <div>
        <div className="text-sm font-semibold text-foreground leading-snug line-clamp-3 break-words">
          {signal.text}
        </div>
        {signal.attachments && (
          <div className="mt-0.5 text-caption-10 text-muted-foreground truncate">
            {formatAttachmentSummary(signal.attachments, t2)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
      {formatAttachmentSummary(signal.attachments, t2)}
    </div>
  );
}
function AgentSignalRow({ signal, t: t2 }) {
  if (signal.kind === "text") {
    return (
      <div className="text-xs text-muted-foreground leading-snug line-clamp-3 break-words">
        {signal.text}
      </div>
    );
  }
  if (signal.kind === "subAgent") {
    const roleLabel = t2(`chat.historyRail.agentRole.${signal.role}`, {
      defaultValue: signal.role,
    });
    const primary = t2("chat.historyRail.subAgentProcessing", {
      defaultValue: "{{role}} 处理中",
      role: roleLabel,
    });
    return (
      <div className="text-xs text-muted-foreground leading-snug line-clamp-3 break-words">
        {primary}
        {signal.text && (
          <span className="text-foreground/60">
            {" — "}
            {signal.text}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground leading-snug line-clamp-2 break-words">
      {t2("chat.historyRail.toolCall", {
        defaultValue: "调用了 {{tool}}",
        tool: signal.toolName,
      })}
    </div>
  );
}
export const HistoryAnchorRail = reactExports.memo(HistoryAnchorRailImpl);
HistoryAnchorRail.displayName = "HistoryAnchorRail";
const NEAR_BOTTOM_THRESHOLD_PX = 80;
const BOTTOM_REENGAGE_THRESHOLD_PX = 1;
export function useAutoScroll(trigger, resetKey, options = {}) {
  const fallbackContainerRef = reactExports.useRef(null);
  const containerRef = options.scrollRef ?? fallbackContainerRef;
  const enabled = options.enabled ?? true;
  const scrollToBottomRef = reactExports.useRef(void 0);
  const isNearBottom = reactExports.useRef(true);
  const lastScrollTop = reactExports.useRef(0);
  const pendingResetRef = reactExports.useRef(true);
  const previousResetKeyRef = reactExports.useRef(resetKey);
  const pendingTriggerRef = reactExports.useRef(false);
  const previousTriggerRef = reactExports.useRef(trigger);
  scrollToBottomRef.current = options.scrollToBottom;
  const scrollToBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    const customScrollToBottom = scrollToBottomRef.current;
    if (customScrollToBottom) {
      customScrollToBottom();
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [containerRef, enabled]);
  const checkNearBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const previousScrollTop = lastScrollTop.current;
    lastScrollTop.current = el.scrollTop;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= BOTTOM_REENGAGE_THRESHOLD_PX) {
      isNearBottom.current = true;
      return;
    }
    if (el.scrollTop < previousScrollTop) {
      isNearBottom.current = false;
      return;
    }
    if (!isNearBottom.current) {
      return;
    }
    isNearBottom.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }, [containerRef, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    lastScrollTop.current = el.scrollTop;
    el.addEventListener("scroll", checkNearBottom, {
      passive: true,
    });
    return () => el.removeEventListener("scroll", checkNearBottom);
  }, [checkNearBottom, containerRef, enabled]);
  reactExports.useEffect(() => {
    if (!Object.is(previousResetKeyRef.current, resetKey)) {
      previousResetKeyRef.current = resetKey;
      pendingResetRef.current = true;
    }
    if (!enabled) return;
    if (!pendingResetRef.current) return;
    pendingResetRef.current = false;
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current = true;
    lastScrollTop.current = el.scrollTop;
    scrollToBottom();
  }, [resetKey, enabled, containerRef, scrollToBottom]);
  reactExports.useEffect(() => {
    if (!Object.is(previousTriggerRef.current, trigger)) {
      previousTriggerRef.current = trigger;
      pendingTriggerRef.current = true;
    }
    if (!enabled) return;
    if (!pendingTriggerRef.current) return;
    pendingTriggerRef.current = false;
    const el = containerRef.current;
    if (!el || !isNearBottom.current) return;
    scrollToBottom();
  }, [trigger, enabled, containerRef, scrollToBottom]);
  return containerRef;
}
const SHOW_THRESHOLD_PX = 200;
const HIDE_THRESHOLD_PX = 80;
const NEAR_BOTTOM_PX = 80;
function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function useBottomAnchorState(options) {
  const {
    scrollRef,
    lastMessageToken,
    isStreaming,
    resetKey,
    scrollToBottom,
    enabled = true,
  } = options;
  const [state2, setState] = reactExports.useState("hidden");
  const [unreadCount, setUnreadCount] = reactExports.useState(0);
  const isNearBottomRef = reactExports.useRef(true);
  const isShortContentRef = reactExports.useRef(true);
  const prevTokenRef = reactExports.useRef(lastMessageToken);
  const scrollingTimeoutRef = reactExports.useRef(null);
  const clearScrollingTimeout = reactExports.useCallback(() => {
    if (scrollingTimeoutRef.current != null) {
      clearTimeout(scrollingTimeoutRef.current);
      scrollingTimeoutRef.current = null;
    }
  }, []);
  const recomputeState = reactExports.useCallback(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    const distance2 = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distance2 < NEAR_BOTTOM_PX;
    const isShortContent = el.scrollHeight <= el.clientHeight + NEAR_BOTTOM_PX;
    isNearBottomRef.current = isNearBottom;
    isShortContentRef.current = isShortContent;
    setState((prev) => {
      if (prev === "scrolling-to-bottom") return prev;
      if (isShortContent || distance2 <= HIDE_THRESHOLD_PX) {
        if (prev !== "hidden") {
          setUnreadCount(0);
        }
        return "hidden";
      }
      if (distance2 > SHOW_THRESHOLD_PX) {
        if (isStreaming) return "streaming-away";
        if (unreadCount > 0) return "new-content";
        return "visible";
      }
      if (prev === "hidden") return "hidden";
      if (isStreaming) return "streaming-away";
      if (unreadCount > 0) return "new-content";
      return "visible";
    });
  }, [scrollRef, isStreaming, unreadCount, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    recomputeState();
    const handler = () => recomputeState();
    el.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(() => recomputeState());
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    if (prevTokenRef.current === lastMessageToken) return;
    const prev = prevTokenRef.current;
    prevTokenRef.current = lastMessageToken;
    if (prev == null) return;
    if (isNearBottomRef.current) return;
    setUnreadCount((c3) => c3 + 1);
    queueMicrotask(recomputeState);
  }, [lastMessageToken, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    recomputeState();
  }, [isStreaming, recomputeState, enabled]);
  reactExports.useEffect(() => {
    clearScrollingTimeout();
    setState("hidden");
    setUnreadCount(0);
    isNearBottomRef.current = true;
    prevTokenRef.current = lastMessageToken;
  }, [resetKey]);
  reactExports.useEffect(() => () => clearScrollingTimeout(), [clearScrollingTimeout]);
  const goToBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    clearScrollingTimeout();
    setState("scrolling-to-bottom");
    setUnreadCount(0);
    const useSmooth = !prefersReducedMotion();
    scrollToBottom(useSmooth ? "smooth" : "instant");
    scrollingTimeoutRef.current = setTimeout(() => {
      scrollingTimeoutRef.current = null;
      setState((prev) => (prev === "scrolling-to-bottom" ? "hidden" : prev));
      recomputeState();
    }, 600);
  }, [scrollToBottom, recomputeState, clearScrollingTimeout, enabled]);
  return {
    state: enabled ? state2 : "hidden",
    unreadCount: enabled ? unreadCount : 0,
    goToBottom,
  };
}
const ROTATION_INTERVAL_MS = 8e3;
const IS_MAC = isMacPlatform();
const TIP_KEYS = [
  "chat.tips.agent.1",
  "chat.tips.agent.2",
  "chat.tips.agent.3",
  "chat.tips.agent.4",
  "chat.tips.input.2",
  "chat.tips.input.3",
  "chat.tips.asset.5",
  "chat.tips.system.1",
  "chat.tips.system.3",
  "chat.tips.system.5",
  "chat.tips.system.6",
  "chat.tips.discovery.1",
  "chat.tips.discovery.4",
  "chat.tips.discovery.5",
  "chat.tips.discovery.8",
  "chat.tips.discovery.9",
  "chat.tips.discovery.10",
  "chat.tips.discovery.11",
  "chat.tips.skill.1",
  "chat.tips.skill.3",
  "chat.tips.skill.4",
  "chat.tips.plugin.1",
  "chat.tips.assetCenter.1",
  "chat.tips.assetCenter.3",
];
const IM_BRIDGE_TIP_KEY = "chat.tips.system.5";
function availableTipKeys() {
  if (getRuntimeConfig().region === "overseas") {
    return TIP_KEYS.filter((key2) => key2 !== IM_BRIDGE_TIP_KEY);
  }
  return TIP_KEYS;
}
function shuffleArray(arr) {
  const copy2 = [...arr];
  for (let i2 = copy2.length - 1; i2 > 0; i2--) {
    const j2 = Math.floor(Math.random() * (i2 + 1));
    [copy2[i2], copy2[j2]] = [copy2[j2], copy2[i2]];
  }
  return copy2;
}
function localizeShortcuts(text2) {
  if (IS_MAC) return text2;
  return text2
    .replace(/⌘⇧/g, "Ctrl+Shift+")
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+")
    .replace(/Cmd\+Shift\+/g, "Ctrl+Shift+")
    .replace(/Cmd\+/g, "Ctrl+")
    .replace(/Option\+/g, "Alt+");
}
export function useChatTips(active2) {
  const { t: t2 } = useTranslation();
  const poolRef = reactExports.useRef(shuffleArray(availableTipKeys()));
  const indexRef = reactExports.useRef(0);
  const [currentKey, setCurrentKey] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const advance = () => {
      setCurrentKey(poolRef.current[indexRef.current]);
      indexRef.current += 1;
      if (indexRef.current >= poolRef.current.length) {
        poolRef.current = shuffleArray(availableTipKeys());
        indexRef.current = 0;
      }
    };
    advance();
    const timer2 = setInterval(advance, ROTATION_INTERVAL_MS);
    return () => clearInterval(timer2);
  }, [active2]);
  if (!currentKey) return null;
  return localizeShortcuts(t2(currentKey));
}
let _seq = 0;
function id() {
  return `mock_media_gen_${++_seq}`;
}
const PREFIX = "hub_";
function tool(name2, args, result, status = "ok") {
  const fullName = `${PREFIX}${name2}`;
  return {
    id: id(),
    role: "agent",
    type: "tool",
    content: fullName,
    toolName: fullName,
    toolStatus: status,
    toolArgs: JSON.stringify(args),
    toolResult: JSON.stringify(result),
  };
}
function running(name2, args) {
  const fullName = `${PREFIX}${name2}`;
  return {
    id: id(),
    role: "agent",
    type: "tool",
    content: fullName,
    toolName: fullName,
    toolStatus: "running",
    toolArgs: JSON.stringify(args),
  };
}
export const MOCK_MEDIA_GEN_MESSAGES = [
  // User prompt
  {
    id: id(),
    role: "user",
    type: "text",
    content: "[Mock] Media generation test — all categories (domestic region)",
  },
  // ═══════════════════════════════════════════════════════════════
  // IMAGE — capability dispatcher (hub_generate_image)
  // ═══════════════════════════════════════════════════════════════
  // 1. banana — single image, no refs
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      prompt: "A cute orange cat sitting on a sunlit windowsill, soft bokeh background",
      filename: "kitten-orange-tabby-windowsill",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      paths: ["kitten-orange-tabby-windowsill.jpg"],
      width: 1024,
      height: 1024,
    },
  ),
  // 2. banana — with reference images (image editing). Demonstrates
  //    aspect_ratio_source + aspect_ratio_evidence (internal contract,
  //    hidden from the user but shipped to the gateway).
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2",
      prompt: "Restyle this photo into watercolor painting",
      image_paths: ["cute-piglet-meadow.jpg"],
      filename: "cute-pink-piglet-spring-meadow",
      vendor_params: {
        aspect_ratio: "3:2",
        resolution: "2K",
      },
      aspect_ratio_source: "source_ref",
      aspect_ratio_evidence: {
        tool: "hub_analyse_media",
        file_path: "cute-piglet-meadow.jpg",
        width: 2048,
        height: 1365,
        aspect_ratio: "3:2",
        ok: true,
        media_type: "image",
      },
    },
    {
      paths: ["cute-pink-piglet-spring-meadow.png"],
      width: 2048,
      height: 1365,
    },
  ),
  // 3. banana batch — count=3, dispatcher fan-out (prompts + filenames).
  //    NOTE: vendor_params is shared across all outputs; aspect_ratios is
  //    no longer a per-item array in dispatcher.
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      count: 3,
      prompts: [
        "Cyberpunk cityscape at night, neon reflections on wet streets Cyberpunk cityscape at night, neon reflections on wet streets",
        "Cute croc splashing in a pond with lily pads",
        "Cute pig baking in a cozy kitchen",
      ],
      filenames: ["cyberpunk-01-megacity-skyline", "cute-croc-splashing", "kitchen-baking-pig"],
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      total: 3,
      succeeded: 3,
      results: [
        {
          index: 1,
          paths: ["cyberpunk-01-megacity-skyline.jpg"],
          width: 1024,
          height: 1024,
        },
        {
          index: 2,
          paths: ["cute-croc-splashing.png"],
          width: 1024,
          height: 1024,
        },
        {
          index: 3,
          paths: ["kitchen-baking-pig.png"],
          width: 1024,
          height: 1024,
        },
      ],
    },
  ),
  // 4. gpt-image (unified) — image editing with reference. Unified vendor
  //    resolves to the cloud-catalog image model id "g-image-2".
  tool(
    "generate_image",
    {
      vendor: "gpt-image",
      model_id: "gpt-image-2",
      prompt: "Futuristic humanoid robot in various poses, clean white background",
      image_paths: ["futuristic-humanoid-robot.jpg"],
      filename: "futuristic-robot-running-pose",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["futuristic-robot-running-pose.png"],
    },
  ),
  // 5. seedream — with reference images (i2i)
  tool(
    "generate_image",
    {
      vendor: "seedream",
      model_id: "doubao-seedream-5-0-pro-260628",
      prompt: "Cute piglet running through green grass in warm sunshine",
      image_paths: ["cute-piglet-meadow.png"],
      filename: "cute-pink-piglet-running-grass",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "2k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["cute-pink-piglet-running-grass.png"],
      width: 2048,
      height: 2048,
    },
  ),
  // 6. midjourney — t2i with style flags expressed inside prompt
  tool(
    "generate_image",
    {
      vendor: "midjourney",
      model_id: "midjourney",
      prompt: "A croc standing at a mystical gateway with stone stairs --ar 16:9 --v 8.1",
      filename: "crocs-gateway-stairway",
    },
    {
      paths: ["crocs-gateway-stairway.jpg"],
    },
  ),
  // 7. kling (image) — multi-ref / character consistency. Maps to
  //    cloud-catalog model id "kling-image".
  tool(
    "generate_image",
    {
      vendor: "kling",
      model_id: "kling-v3-omni",
      prompt: "Croc character evolution poster with <<<image_1>>> as the protagonist",
      image_paths: ["cute-croc-basking.png"],
      filename: "crocs-gateway-evolution",
      vendor_params: {
        aspect_ratio: "3:4",
        resolution: "2k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["crocs-gateway-evolution.png"],
    },
  ),
  // 8. Image generation — failed (content policy)
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      prompt: "This generation will fail due to content policy",
      filename: "will-fail",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      paths: [],
      error: "Generation failed: content policy violation",
    },
    "error",
  ),
  // ═══════════════════════════════════════════════════════════════
  // VIDEO — capability dispatcher (hub_generate_video)
  // ═══════════════════════════════════════════════════════════════
  // 9. seedance t2v — text-only
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "t2v",
      model_id: "seedance2.0",
      prompt: "A cute pink piglet running happily through a spring meadow with wildflowers",
      filename: "pink_piglet_meadow",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "pink_piglet_meadow.mp4",
    },
  ),
  // 10. seedance i2v — explicit opening frame
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "i2v",
      model_id: "seedance2.0",
      prompt: "The piglet slowly turns to face the camera and smiles",
      filename: "clip_01",
      duration: 5,
      first_frame_image: "cute-piglet-meadow.png",
      vendor_params: {
        aspect_ratio: "9:16",
        resolution: "720p",
        generate_audio: true,
      },
    },
    {
      path: "clip_01.mp4",
    },
  ),
  // 11. seedance multimodal — reference images + audio
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "multimodal",
      model_id: "seedance2.0",
      prompt: "Use image 1 as the character, make it dance to audio 1 in a meadow",
      filename: "clip_004",
      duration: 8,
      reference_image_paths: ["cute-pig-grass-sunshine.png"],
      reference_audio_urls: ["cyberpunk-synthwave-bgm.mp3"],
      vendor_params: {
        aspect_ratio: "9:16",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_004.mp4",
    },
  ),
  // 12. seedance video-edit — driving video + style refs
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "video-edit",
      model_id: "seedance2.0",
      prompt: "Replace the background with a cyberpunk city from image 1",
      filename: "clip_005",
      duration: 5,
      reference_video_urls: ["clip_01.mp4"],
      reference_image_paths: ["cyberpunk-01-megacity-skyline.jpg"],
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_005.mp4",
    },
  ),
  // 13. seedance video-extend — continue an existing clip
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "video-extend",
      model_id: "seedance2.0",
      prompt: "Continue the scene with the character walking away into the sunset",
      filename: "clip_006",
      duration: 5,
      reference_video_urls: ["clip_005.mp4"],
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_006.mp4",
    },
  ),
  // 14. seedance first-last-frame — head + tail keyframes
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "first-last-frame",
      model_id: "seedance2.0-fast",
      prompt: "Smooth transition from the meadow shot to the city skyline",
      filename: "transition_keyframes",
      duration: 5,
      first_frame_image: "cute-piglet-meadow.png",
      last_frame_image: "cyberpunk-01-megacity-skyline.jpg",
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "720p",
      },
    },
    {
      path: "transition_keyframes.mp4",
    },
  ),
  // 15. MiniMax-H3 — t2v. Dispatcher does not batch
  //     videos; emit one task per output deliverable.
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "t2v",
      model_id: "MiniMax-H3",
      prompt: "Cute kitten playing with yarn ball",
      filename: "clip_007",
      duration: 6,
      vendor_params: {
        resolution: "2K",
        generate_audio: false,
      },
    },
    {
      path: "clip_007.mp4",
    },
  ),
  // 16. MiniMax-H3 — i2v with first_frame_image
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "i2v",
      model_id: "MiniMax-H3",
      prompt: "Corgi running through grass in slow motion",
      filename: "clip_008",
      duration: 10,
      first_frame_image: "corgi-running-sunlit-grass.png",
      vendor_params: {
        resolution: "2K",
      },
    },
    {
      path: "clip_008.mp4",
    },
  ),
  // 17. veo3 (unified Veo3) — t2v with canonical model_id
  tool(
    "generate_video",
    {
      vendor: "veo3",
      mode: "t2v",
      model_id: "veo-3.1-fast-generate-001",
      prompt: "A cat astronaut floating in a spaceship, looking out the window at Earth",
      filename: "temp_123",
      duration: 8,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "720p",
      },
    },
    {
      path: "temp_123.mp4",
    },
  ),
  // 19. kling — multimodal mode (multi-shot capable)
  tool(
    "generate_video",
    {
      vendor: "kling",
      mode: "multimodal",
      model_id: "kling-v3-omni",
      prompt: "A cute scottish fold kitten exploring a teacup in spring garden",
      filename: "temp_12345",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "1080P",
        generate_audio: true,
      },
    },
    {
      path: "temp_12345.mp4",
    },
  ),
  // 21. kling — avatar mode (digital human lip-sync)
  tool(
    "generate_video",
    {
      vendor: "kling",
      mode: "avatar",
      model_id: "kling-video-o1",
      prompt: "Speak with gentle expression and slight head movement",
      filename: "temp_12",
      first_frame_image: "asian-woman-character-ref.png",
      audio_path: "audios/rainy-night-whisper.mp3",
      vendor_params: {
        mode: "pro",
      },
    },
    {
      path: "temp_12.mp4",
    },
  ),
  // 23. MiniMax-H3 — i2v with audio driver (lip-sync flavor)
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "i2v",
      model_id: "MiniMax-H3",
      prompt: "The cat narrator speaks naturally with subtle expressions",
      filename: "videos/final",
      duration: 8,
      first_frame_image: "tabby-cat-podcast-host.jpg",
      audio_path: "audios/rainy-night-whisper.mp3",
      vendor_params: {
        resolution: "2K",
      },
    },
    {
      path: "videos/final.mp4",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // SPEECH / TTS — unified dispatcher
  // ═══════════════════════════════════════════════════════════════
  // 24. generate_audio_speech — single TTS
  tool(
    "generate_audio_speech",
    {
      texts: "Hello world, this is a test of the text to speech system.",
      voice_ids: "Friendly_Person",
      model_name: "speech-2.8-hd",
      speeds: 1,
      filenames: "laughter-sfx",
    },
    {
      ok: true,
      path: "laughter-sfx.mp3",
      duration: 3.2,
    },
  ),
  // 25. generate_audio_speech — with emotion + pronunciation_dict
  tool(
    "generate_audio_speech",
    {
      texts: "今晚的雨声真好听，适合安静地入睡。",
      voice_ids: "zh_female_shuangkuai",
      model_name: "speech-2.8-hd",
      speeds: 0.9,
      emotions: "calm",
      pronunciation_dict: {
        tone: ["处理/(chu3)(li3)"],
      },
      filenames: "rain",
    },
    {
      ok: true,
      path: "rain.mp3",
      duration: 4.5,
    },
  ),
  // 26. generate_audio_speech — multi-speaker dialogue
  tool(
    "generate_audio_speech",
    {
      texts: ["欢迎来到动物播客！", "今天我们聊聊可爱的小猪。", "太棒了，我最喜欢小猪！"],
      voice_ids: ["zh_female_shuangkuai", "zh_male_wennuanmomo", "zh_female_shuangkuai"],
      filenames: ["applause-sfx", "surprise-sfx", "audio_trimmed"],
      emotions: ["happy", "calm", "happy"],
      speeds: [1, 1, 1.1],
      model_name: "speech-2.8-hd",
    },
    {
      total: 3,
      results: [
        {
          index: 0,
          ok: true,
          path: "applause-sfx.mp3",
          duration: 2.1,
        },
        {
          index: 1,
          ok: true,
          path: "surprise-sfx.mp3",
          duration: 2.5,
        },
        {
          index: 2,
          ok: true,
          path: "audio_trimmed.mp3",
          duration: 2.3,
        },
      ],
    },
  ),
  // 27. voice_prepare clone
  tool(
    "voice_prepare",
    {
      items: [
        {
          action: "clone",
          audio_path: "audios/rainy-night-whisper.mp3",
        },
      ],
    },
    {
      ok: true,
      results: [
        {
          action: "clone",
          ok: true,
          voice_id: "hub_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
      ],
    },
  ),
  // 28. audio_separate
  tool(
    "audio_separate",
    {
      audio_path: "cyberpunk-synthwave-bgm.mp3",
      filename: "audio_trimmed",
    },
    {
      ok: true,
      voice_audio_path: "audio_trimmed_voice.aac",
      background_audio_path: "audio_trimmed_background.aac",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // MUSIC — unified dispatcher and cover surface
  // ═══════════════════════════════════════════════════════════════
  // 29. lyrics_generation — write_full_song. Outputs TEXT (song_title /
  //      style_tags / lyrics), NOT a media file. Must render as a normal
  //      tool action; treating it as media generation made the file-count
  //      success check report 0 → false "Generation failed".
  tool(
    "lyrics_generation",
    {
      mode: "write_full_song",
      prompt:
        "中文原创流行舞曲歌词，主题围绕跳舞、律动、灯光、释放快乐与跟随节拍起舞；欢快、动感、积极、轻松、派对感，不要悲伤氛围；节奏明确，副歌有记忆点，适合带人声的流行舞曲",
      title: "今晚一起跳舞吧",
    },
    {
      song_title: "今晚一起跳舞吧",
      style_tags: "Pop, Dance, Upbeat, Female Vocals, Party",
      lyrics:
        "[Verse 1]\n灯光亮起的瞬间\n心跳跟着节拍点\n\n[Chorus]\n今晚一起跳舞吧\n在星光下释放吧",
    },
  ),
  // 30. generate_audio_music — with lyrics
  tool(
    "generate_audio_music",
    {
      vendor: "official",
      model_id: "music-3.0",
      mode: "song",
      prompt: "Upbeat pop song about cute animals, female vocals, energetic",
      lyrics: "[Verse 1]\n小猪小猪真可爱\n草地上跑来跑去\n\n[Chorus]\n今晚一起跳舞吧\n在星光下",
      filename: "cyberpunk-synthwave-bgm",
    },
    {
      path: "cyberpunk-synthwave-bgm.mp3",
      duration: 45,
    },
  ),
  // 31. generate_audio_music — BGM
  tool(
    "generate_audio_music",
    {
      vendor: "official",
      model_id: "music-3.0",
      mode: "instrumental",
      prompt: "Soft piano, rainy night atmosphere, gentle and calming, lo-fi ambient",
      filename: "rain",
    },
    {
      path: "rain.mp3",
      duration: 60,
    },
  ),
  // 32. music_cover — one-shot cover
  tool(
    "music_cover",
    {
      action: "generate",
      prompt: "Jazz piano cover, mellow and intimate nighttime atmosphere",
      audio: "cyberpunk-synthwave-bgm.mp3",
      filename: "laughter-sfx",
    },
    {
      path: "laughter-sfx.mp3",
      duration: 55,
    },
  ),
  // 33. music_cover prepare_lyrics — intermediate. Returns
  //     cover_feature_id + formatted_lyrics (NO media file). Echoed into
  //     data for the later music_cover generate action. Must not show as failed.
  tool(
    "music_cover",
    {
      action: "prepare_lyrics",
      audio: "cyberpunk-synthwave-bgm.mp3",
    },
    {
      cover_feature_id: "cf_a1b2c3d4e5f6",
      formatted_lyrics:
        "[Intro]\n\n[Verse]\n灯光亮起的瞬间\n心跳跟着节拍点\n\n[Chorus]\n今晚一起跳舞吧\n\n[Outro]",
      audio_duration: 48,
      structure_result: "Intro/Verse/Chorus/Outro",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // EDITING — active dedicated tools
  // ═══════════════════════════════════════════════════════════════
  // 34. merge_videos
  tool(
    "merge_videos",
    {
      video_paths: ["clip_005.mp4", "clip_006.mp4", "clip_007.mp4"],
      filename: "merged_video",
      scale_mode: "first",
    },
    {
      path: "merged_video.mp4",
    },
  ),
  // 36. batch_lip_sync
  tool(
    "batch_lip_sync",
    {
      video_paths: ["clip_005.mp4", "clip_006.mp4"],
      audio_paths: ["applause-sfx.mp3", "surprise-sfx.mp3"],
      filenames: ["clip_007", "clip_008"],
    },
    {
      results: [
        {
          ok: true,
          path: "clip_007.mp4",
        },
        {
          ok: true,
          path: "clip_008.mp4",
        },
      ],
    },
  ),
  // 38. image_remove_background
  tool(
    "image_remove_background",
    {
      image_path: "cute-pig-chef.jpg",
      filename: "cute-little-pig-realistic-cinematic",
    },
    {
      path: "cute-little-pig-realistic-cinematic.png",
    },
  ),
  // 39. ffmpeg — general purpose (trim video)
  tool(
    "ffmpeg",
    {
      args: ["-i", "merged_video.mp4", "-ss", "00:00:05", "-t", "00:00:10", "-c", "copy"],
      output_type: "video",
      filename: "temp_12",
    },
    {
      path: "temp_12.mp4",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // SPECIAL STATES
  // ═══════════════════════════════════════════════════════════════
  // 40. Running state — video generation in progress (seedance t2v)
  running("generate_video", {
    vendor: "seedance",
    mode: "t2v",
    model_id: "seedance2.0-fast",
    prompt: "Cinematic drone shot of a forest at dawn, mist rising between trees",
    filename: "forest-dawn",
    duration: 5,
    vendor_params: {
      aspect_ratio: "16:9",
      resolution: "480p",
      generate_audio: true,
    },
  }),
  // 41. Running state — image generation in progress (banana)
  running("generate_image", {
    vendor: "banana",
    model_id: "nano_banana_2",
    prompt: "Oil painting of a Venice canal at golden hour",
    filename: "venice-canal",
    vendor_params: {
      aspect_ratio: "3:2",
      resolution: "2K",
    },
  }),
  // 42. Error state — video failed (seedance deepfake guard)
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "i2v",
      model_id: "seedance2.0",
      prompt: "Animate this character walking",
      filename: "person-walking",
      first_frame_image: "asian-woman-character-ref.png",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      error:
        "Error: Seedance 2.0 rejected a real-person image after gateway handling. Do not perform MCP-side avatar registration; private-asset retry is owned by the gateway Seedance backend. Revise the source media or prompt, or report the upstream rejection with the original error. Original error: may contain real person",
    },
    "error",
  ),
  // 43. Error state — TTS failed
  tool(
    "generate_audio_speech",
    {
      texts: "Some text that triggers safety filter",
      voice_ids: "Friendly_Person",
      model_name: "speech-2.8-hd",
      speeds: 1,
      filenames: "will-fail-tts",
    },
    {
      ok: false,
      error: "Content moderation: input text contains prohibited content",
    },
    "error",
  ),
  // 44. Batch with partial failure — image batch (banana, count=3)
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      count: 3,
      prompts: [
        "Cute pig sleeping in hay",
        "Prohibited content here",
        "Cute pig with water barrel",
      ],
      filenames: ["cute-pink-pig-soft-hay", "prohibited", "cute-pig-water-barrel"],
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      total: 3,
      succeeded: 2,
      results: [
        {
          index: 1,
          paths: ["cute-pink-pig-soft-hay.png"],
          width: 1024,
          height: 1024,
        },
        {
          index: 2,
          error: "Content policy violation",
        },
        {
          index: 3,
          paths: ["cute-pig-water-barrel.png"],
          width: 1024,
          height: 1024,
        },
      ],
    },
  ),
  // 45. Aborted — plain-text tool result (OpenCode failToolCall path). On
  //     history replay the tool comes back with a non-JSON result and a
  //     toolStatus that maps to 'ok' (older rows carry no explicit error
  //     status). The card must still surface the abort reason instead of
  //     rendering nothing. See message-reducer ERROR_RESULT_PATTERN /
  //     TimelineItem unparsedFailure fallback.
  {
    id: id(),
    role: "agent",
    type: "tool",
    content: `${PREFIX}generate_image`,
    toolName: `${PREFIX}generate_image`,
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      vendor: "gpt-image",
      model_id: "gpt-image-2",
      count: 2,
      prompts: [
        "A cute puppy playing beside a small garden watering can in warm afternoon light",
        "A cute puppy curled on a picnic blanket in a quiet park",
      ],
      filenames: ["puppy-watering-can", "puppy-picnic-blanket"],
      vendor_params: {
        aspect_ratio: "1:1",
      },
    }),
    toolResult: "hub_generate_image: Tool execution aborted",
  },
];
