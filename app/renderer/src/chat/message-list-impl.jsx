// message-list-impl.jsx
import { jsxRuntimeExports, useTranslation, useCurrentWorkspace, reactExports, Split, Check, Copy, useVirtualizer, AccordionRoot, AccordionItem$1, AccordionHeader, AccordionTrigger$1, ChevronDownIcon$1, ChevronUpIcon, AccordionPanel, Repeat2, ArrowRight, CheckCheck, RadioGroup$1, RadioRoot, RadioIndicator, CompositedSvg, ChevronDown } from "../vendor.js";
import { Popover, PopoverTrigger, useIsScrolling } from "../assets/apply-asset-change.jsx";
import { useDebugFlag, DEBUG_FLAGS } from "../workspace/create-visible-preview-tabs-store.js";
import { Tooltip, TooltipTrigger, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Puzzle, PencilLine } from "../media-editing/parse-item.jsx";
import { groupIntoActivityGroups, messageListPropsEqual } from "../media-editing/parse-timeline-operations.js";
import { useMentionModels } from "../generation/use-mention-models.jsx";
import { useGatewayScopeKey } from "../generation/use-resizable-width.js";
import { ChatToolbar } from "../generation/media-model-selector.jsx";
import {
  collectAssistantCopyText,
  useCopy,
  GenerationHandoffSummary,
  AssistantMessageActions,
  MOCK_MEDIA_GEN_MESSAGES,
  useAutoScroll,
  useBottomAnchorState,
  ChatPresentationProvider,
  HistoryAnchorRail,
  BottomAnchorButton,
  useChatTips,
} from "./history-anchor-rail-impl.jsx";
import { BrailleSpinner } from "./empty-chat-recommendations.jsx";
import {
  RichUserPromptContent,
  SentAnnotationCards,
  MessageBubble,
} from "./message-bubble.jsx";
import {
  TooltipContent,
  Button$1,
  cn$2,
  Checkbox,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { collectFallbackTurnArtifacts } from "./collapse-replayed-sub-message-sequences.jsx";
import { ActivityGroup } from "../team/credit-threshold-reminder-card.jsx";
import { TurnArtifactStrip } from "../media-editing/parse-batch-items.jsx";
import { useHistoryRailState, CHAT_CONTENT_MAX_WIDTH_PX } from "./yt.jsx";
import { useWorkspaceChatSelector } from "../assets/use-asset-picker-host.jsx";
import { Kbd, resolveShortcutDisplay, isMacPlatform } from "../workspace/shortcut-categories.jsx";
import { RetryIcon, QuestionPromptIcon } from "../workspace/browser-inspiration-urls.jsx";
import {
  replaceConfiguredModelNamesForCurrentRegion,
  redactForCurrentRegion,
} from "../generation/resolve-chat-file-reference.js";
import { localizeRecommendedQuestionOptionLabel } from "../text-editor/expandable-text.jsx";
import { Label } from "../team/infinite-scroll-container.jsx";
import { MessageInput } from "./mode-selector.jsx";
import { MEDIA_FILE_ACCEPT } from "../text-editor/myers-line-hunks.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MESSAGE_LIST_INITIAL_RECT,
  MESSAGE_TURN_ESTIMATED_HEIGHT,
  MESSAGE_TURN_HEIGHT_CACHE,
  MESSAGE_TURN_OVERSCAN,
  TaskDispatchIndicator,
  UserAttachmentStrip,
  attachQuestionsToSubAgents,
  attachToolConfirmsToSubAgents,
  collectCanvasContinuationTargets,
  extractAgentSignalRaw,
  extractUserSignalRaw,
  filterResolvedRetryErrors,
  findLatestAssistantActionTurnIndex,
  findMessageTurnIndex,
  findPendingTaskDispatch,
  getMessageListScrollbarClass,
  getTurnKey,
  groupIntoTurns,
  isMainAgentProgressMessage,
  isPendingSubAgentDispatch,
  measureMessageTurnElement,
  messageHasCanvasContinuation,
  prepareMainAgentActivityMessages,
} from "./group-into-turns.jsx";
function UserPluginNodeAttachmentStrip({ pluginNodes }) {
  const { t: t2 } = useTranslation();
  if (pluginNodes.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2 flex-wrap">
      {pluginNodes.map((p3) => {
        const name2 = p3.name?.trim() || p3.pluginId;
        return (
          <div
            key={p3.nodeId}
            data-testid="plugin-node-chip-sent"
            className="flex items-center gap-2.5 w-[200px] h-16 px-2.5 rounded-sm bg-muted-foreground/10"
            title={name2}
          >
            <div className="shrink-0 flex items-center justify-center w-9 h-9 bg-background/60">
              <Puzzle size={20} className="text-foreground opacity-50" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-foreground truncate">{name2}</span>
              <span className="text-caption-10 text-muted-foreground truncate">
                {t2("chat.pluginNodeChipMeta", {
                  defaultValue: "画布插件",
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const UserPromptBubble = reactExports.memo(function UserPromptBubble2({
  user,
  busy,
  turnIndex,
  onFork,
}) {
  const { t: t2 } = useTranslation();
  const { copied, copy: copy2 } = useCopy();
  const [forkOpen, setForkOpen] = reactExports.useState(false);
  const runtimeMessageId = user.runtimeMessageId;
  const showFork = !!onFork && !busy && turnIndex > 0 && !!runtimeMessageId;
  const showCopy = !!user.content;
  return (
    <div data-action-ui-id="chat-message-user" className="group/user px-4 flex flex-col items-end">
      <div className="relative inline-flex max-w-3/4">
        <div className="max-h-[40vh] overflow-y-auto bg-foreground/5 px-3.5 py-2.5 rounded-xl text-body-15 font-normal text-foreground">
          {user.content && <RichUserPromptContent content={user.content} collapsible={true} />}
          {!user.content &&
            !user.attachments?.length &&
            !user.documentAnnotations?.length &&
            !user.pluginNodeAttachments?.length && (
              <span className="text-muted-foreground italic">{t2("chat.noContent")}</span>
            )}
          {user.attachments && user.attachments.length > 0 && (
            <UserAttachmentStrip attachments={user.attachments} />
          )}
          {user.pluginNodeAttachments && user.pluginNodeAttachments.length > 0 && (
            <UserPluginNodeAttachmentStrip pluginNodes={user.pluginNodeAttachments} />
          )}
          {user.documentAnnotations && user.documentAnnotations.length > 0 && (
            <SentAnnotationCards annotations={user.documentAnnotations} />
          )}
        </div>
        {(showFork || showCopy) && (
          <div
            data-action-ui-id="chat-user-actions"
            className="absolute right-full bottom-0 mr-1.5 flex items-center gap-1 opacity-0 group-hover/user:opacity-100 focus-within:opacity-100 transition-opacity"
          >
            {showFork && runtimeMessageId && onFork && (
              <Popover open={forkOpen} onOpenChange={setForkOpen}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <PopoverTrigger
                        data-action-ui-id="chat-fork-button"
                        className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 transition-colors cursor-pointer"
                      >
                        <Split className="size-3.5 rotate-90" strokeWidth={1.5} />
                      </PopoverTrigger>
                    }
                  />
                  <TooltipContent side="top">{t2("chat.forkFromHere")}</TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="end" sideOffset={6} className="w-44 gap-2 p-2.5">
                  <p className="text-caption-11 text-muted-foreground whitespace-normal leading-snug">
                    {t2("chat.forkConversation")}
                  </p>
                  <Button$1
                    size="sm"
                    data-action-ui-id="chat-fork-confirm"
                    className="self-end px-3"
                    onClick={() => {
                      onFork(runtimeMessageId, user.content);
                      setForkOpen(false);
                    }}
                  >
                    {t2("chat.forkAction")}
                  </Button$1>
                </PopoverContent>
              </Popover>
            )}
            {showCopy && (
              <Tooltip>
                <TooltipTrigger
                  closeOnClick={false}
                  render={
                    <button
                      type="button"
                      data-action-ui-id="chat-user-copy"
                      onClick={() => copy2(user.content)}
                      aria-label={t2(copied ? "chat.copied" : "chat.copy")}
                      className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="size-3.5" strokeWidth={1.5} />
                      ) : (
                        <Copy className="size-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  }
                />
                <TooltipContent side="top">
                  {t2(copied ? "chat.copied" : "chat.copy")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
UserPromptBubble.displayName = "UserPromptBubble";
const MessageTurn = reactExports.memo(function MessageTurn2({
  turn,
  turnIndex,
  turnCount,
  latestAssistantActionTurnIndex,
  feedbackSessionId,
  feedbackWorkspaceDir,
  feedbackWorkspaceId,
  lastMessageId,
  busy,
  showBusyTip,
  busyLabel,
  showHiddenTools,
  showTurnArtifacts = true,
  turnTail,
  onSend,
  focusedSessionId,
  onRetry,
  onFork,
}) {
  const allResponses = turn.responses.flat();
  const isLastTurn = turnIndex === turnCount - 1;
  const isTurnComplete = !isLastTurn || (!busy && !showBusyTip);
  const presentedResponses = filterResolvedRetryErrors(allResponses);
  const unfilteredResponses = prepareMainAgentActivityMessages(presentedResponses, showHiddenTools);
  const hasCanvasContinuation = unfilteredResponses.some(messageHasCanvasContinuation);
  const handoffTargets = hasCanvasContinuation
    ? collectCanvasContinuationTargets(unfilteredResponses)
    : [];
  const showHandoffSummary = handoffTargets.length > 0;
  const preparedResponses = unfilteredResponses.filter(
    (message2) => !(message2.type === "cancelled" && showHandoffSummary),
  );
  const visible = attachQuestionsToSubAgents(attachToolConfirmsToSubAgents(preparedResponses));
  const grouped = groupIntoActivityGroups(visible, showHiddenTools);
  const handoffSummaryIndex = showHandoffSummary
    ? grouped.findIndex((node2) =>
        node2.kind === "activity-group"
          ? node2.items.some(messageHasCanvasContinuation)
          : messageHasCanvasContinuation(node2.msg),
      )
    : -1;
  const handoffSummaryAtEnd = showHandoffSummary && handoffSummaryIndex === -1;
  const artifactMessages = turn.user ? [turn.user, ...allResponses] : allResponses;
  const assistantCopyText = isTurnComplete ? collectAssistantCopyText(allResponses) : "";
  const assistantRequestId = turn.user?.runtimeMessageId;
  const fallbackArtifacts =
    showTurnArtifacts && isTurnComplete ? collectFallbackTurnArtifacts(artifactMessages) : [];
  const canShowTaskDispatch =
    busy && isLastTurn && !allResponses.some((message2) => message2.type === "cancelled");
  const pendingTaskDispatch = canShowTaskDispatch
    ? findPendingTaskDispatch(allResponses, showHiddenTools)
    : void 0;
  const hasInlineTaskDispatch = visible.some(
    (message2) =>
      isPendingSubAgentDispatch(message2, showHiddenTools) &&
      (!pendingTaskDispatch?.childSessionId ||
        message2.childSessionId === pendingTaskDispatch.childSessionId),
  );
  const hasAssistantContent =
    grouped.length > 0 ||
    !!pendingTaskDispatch ||
    fallbackArtifacts.length > 0 ||
    showBusyTip ||
    handoffSummaryAtEnd;
  const handleTurnRetry = reactExports.useCallback(
    () => (turn.user ? (onRetry?.(turn.user) ?? false) : false),
    [onRetry, turn.user],
  );
  return (
    <div data-action-ui-id="chat-message-turn" className="flex flex-col gap-8 pb-8">
      {turn.user && (
        <UserPromptBubble user={turn.user} busy={busy} turnIndex={turnIndex} onFork={onFork} />
      )}
      {hasAssistantContent && (
        <div
          data-action-ui-id="chat-message-assistant"
          className="group/assistant relative min-w-0 px-4"
        >
          <div
            data-testid="chat-message-assistant-content"
            className="flex min-w-0 flex-col gap-3 overflow-hidden"
          >
            {grouped.map((node2, nodeIndex) => {
              const isLast = isLastTurn && nodeIndex === grouped.length - 1;
              if (node2.kind === "activity-group") {
                const groupKey = node2.items[0]?.id ?? `activity-${nodeIndex}`;
                const lastItem = node2.items[node2.items.length - 1];
                const isGroupStreaming =
                  busy &&
                  isLastTurn &&
                  ((isLast && lastItem != null && lastItem.id === lastMessageId) ||
                    node2.items.some(
                      (item) =>
                        item.type === "tool" &&
                        (item.toolStatus === "running" || item.toolStatus === "pending"),
                    ));
                const showProgress = busy && isLast && isMainAgentProgressMessage(lastItem);
                const showThinking = showProgress && lastItem?.type === "thinking";
                return jsxRuntimeExports.jsxs(
                  reactExports.Fragment,
                  {
                    children: [
                      nodeIndex === handoffSummaryIndex && (
                        <GenerationHandoffSummary targets={handoffTargets} />
                      ),
                      <div data-message-id={groupKey} className="empty:hidden">
                        <ActivityGroup
                          data={node2}
                          isStreaming={isGroupStreaming || showProgress}
                          onSend={onSend}
                          focusedSessionId={focusedSessionId}
                          showThinking={showThinking}
                          showThinkingSummary={false}
                          keepLatestToolActive={showProgress}
                          treatHubReadAsThinking={true}
                          collapseTools={true}
                          keepToolsExpanded={busy && isLast}
                        />
                      </div>,
                    ],
                  },
                  groupKey,
                );
              }
              const { msg } = node2;
              if (isPendingSubAgentDispatch(msg, showHiddenTools)) {
                if (!canShowTaskDispatch) return null;
                return (
                  <div key={msg.id} data-message-id={msg.id} className="empty:hidden">
                    <TaskDispatchIndicator />
                  </div>
                );
              }
              return jsxRuntimeExports.jsxs(
                reactExports.Fragment,
                {
                  children: [
                    nodeIndex === handoffSummaryIndex && (
                      <GenerationHandoffSummary targets={handoffTargets} />
                    ),
                    <div data-message-id={msg.id} className="empty:hidden">
                      <MessageBubble
                        msg={msg}
                        isLast={isLast}
                        isStreaming={
                          (msg.type === "thinking" ||
                            (msg.type === "text" && msg.role === "agent")) &&
                          busy &&
                          msg.id === lastMessageId
                        }
                        onSend={onSend}
                        onRetry={turn.user ? handleTurnRetry : void 0}
                        retrying={busy && isLastTurn}
                      />
                    </div>,
                  ],
                },
                msg.id,
              );
            })}
            {handoffSummaryAtEnd && <GenerationHandoffSummary targets={handoffTargets} />}
            {pendingTaskDispatch && !hasInlineTaskDispatch && (
              <div data-message-id={pendingTaskDispatch.id}>
                <TaskDispatchIndicator />
              </div>
            )}
            <TurnArtifactStrip artifacts={fallbackArtifacts} />
            {showBusyTip && <BusyTipIndicator label={busyLabel} />}
          </div>
          {(assistantCopyText ||
            (isTurnComplete && assistantRequestId && feedbackSessionId && hasAssistantContent)) && (
            <div
              data-testid="chat-assistant-actions-overlay"
              className="absolute top-full left-4 z-10"
            >
              <AssistantMessageActions
                content={assistantCopyText}
                requestId={assistantRequestId}
                alwaysVisible={turnIndex === latestAssistantActionTurnIndex}
                ratingTarget={
                  assistantRequestId &&
                  feedbackSessionId &&
                  feedbackWorkspaceDir &&
                  feedbackWorkspaceId
                    ? {
                        sessionId: feedbackSessionId,
                        requestId: assistantRequestId,
                        workspaceDir: feedbackWorkspaceDir,
                        workspaceId: feedbackWorkspaceId,
                        userText: turn.user?.content ?? "",
                        assistantText: assistantCopyText,
                      }
                    : void 0
                }
              />
            </div>
          )}
        </div>
      )}
      {turnTail && (
        <div className="flex flex-col gap-2 px-4" data-testid="message-turn-tail">
          {turnTail}
        </div>
      )}
    </div>
  );
}, messageTurnPropsEqual);
function turnMessagesRefEqual(a2, b3) {
  if (a2.user !== b3.user) return false;
  if (a2.responses.length !== b3.responses.length) return false;
  for (let i2 = 0; i2 < a2.responses.length; i2++) {
    const ga = a2.responses[i2];
    const gb = b3.responses[i2];
    if (ga.length !== gb.length) return false;
    for (let j2 = 0; j2 < ga.length; j2++) {
      if (ga[j2] !== gb[j2]) return false;
    }
  }
  return true;
}
function messageTurnPropsEqual(prev, next2) {
  return (
    prev.turnIndex === next2.turnIndex &&
    prev.turnCount === next2.turnCount &&
    prev.latestAssistantActionTurnIndex === next2.latestAssistantActionTurnIndex &&
    prev.feedbackSessionId === next2.feedbackSessionId &&
    prev.feedbackWorkspaceDir === next2.feedbackWorkspaceDir &&
    prev.feedbackWorkspaceId === next2.feedbackWorkspaceId &&
    prev.busy === next2.busy &&
    prev.showBusyTip === next2.showBusyTip &&
    prev.busyLabel === next2.busyLabel &&
    prev.showHiddenTools === next2.showHiddenTools &&
    prev.showTurnArtifacts === next2.showTurnArtifacts &&
    prev.turnTail === next2.turnTail &&
    prev.lastMessageId === next2.lastMessageId &&
    prev.onSend === next2.onSend &&
    prev.onRetry === next2.onRetry &&
    prev.onFork === next2.onFork &&
    turnMessagesRefEqual(prev.turn, next2.turn)
  );
}
function MessageListImpl({
  messages: messages2,
  busy,
  busyLabel,
  focusMessageId,
  isPresented = true,
  recovering,
  focusedSessionId,
  feedbackSessionId,
  feedbackWorkspaceDir,
  feedbackWorkspaceId,
  onSend,
  onRetry,
  onFork,
  conversationTail,
  turnTails,
  showTurnArtifacts = true,
}) {
  const mockMediaGen = useDebugFlag(DEBUG_FLAGS.mockMediaGen);
  const showHiddenTools = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const effectiveMessages = reactExports.useMemo(() => {
    if (!mockMediaGen) return messages2;
    return [...MOCK_MEDIA_GEN_MESSAGES, ...messages2];
  }, [messages2, mockMediaGen]);
  const turns = reactExports.useMemo(() => groupIntoTurns(effectiveMessages), [effectiveMessages]);
  const shouldShowBusyTip = busy || recovering === true;
  const latestAssistantActionTurnIndex = reactExports.useMemo(
    () => findLatestAssistantActionTurnIndex(turns, shouldShowBusyTip),
    [shouldShowBusyTip, turns],
  );
  const turnTailsByIndex = reactExports.useMemo(() => {
    const byIndex = new Map();
    for (const tail of turnTails ?? []) {
      const turnIndex = turns.findIndex((turn) => {
        if (turn.user?.id === tail.anchorMessageId) return true;
        return turn.responses.some((group) =>
          group.some((message2) => message2.id === tail.anchorMessageId),
        );
      });
      if (turnIndex < 0) continue;
      const current2 = byIndex.get(turnIndex);
      if (current2) current2.push(tail);
      else byIndex.set(turnIndex, [tail]);
    }
    return byIndex;
  }, [turnTails, turns]);
  const lastMessageId = messages2[messages2.length - 1]?.id;
  const scrollRef = reactExports.useRef(null);
  const virtualizerRootRef = reactExports.useRef(null);
  const isPresentedRef = reactExports.useRef(isPresented);
  isPresentedRef.current = isPresented;
  const measuredScrollRectRef = reactExports.useRef(MESSAGE_LIST_INITIAL_RECT);
  const [scrollElement, setScrollElement] = reactExports.useState(null);
  const setScrollRef = reactExports.useCallback((node2) => {
    scrollRef.current = node2;
    setScrollElement(node2);
  }, []);
  const measurePresentedMessageTurnElement = reactExports.useCallback(
    (element2) => measureMessageTurnElement(element2, isPresentedRef.current),
    [],
  );
  const turnVirtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => MESSAGE_TURN_ESTIMATED_HEIGHT,
    measureElement: measurePresentedMessageTurnElement,
    getItemKey: (index2) => getTurnKey(turns[index2], index2),
    overscan: MESSAGE_TURN_OVERSCAN,
    initialRect: MESSAGE_LIST_INITIAL_RECT,
    // Coalesce the per-item ResizeObserver callbacks into one notify per animation
    // frame. The streaming last turn fires its RO on every reflow; without this,
    // each callback runs resizeItem → notify → a full MessageListImpl re-render
    // synchronously. rAF batching means at most one re-render per frame from
    // measurement, on top of the integer-px rounding in measureMessageTurnElement.
    useAnimationFrameWithResizeObserver: true,
    observeElementRect: (instance2, callback) => {
      const element2 = instance2.scrollElement;
      if (!element2) return;
      const readRect = () => {
        if (!isPresentedRef.current) return measuredScrollRectRef.current;
        const rect = element2.getBoundingClientRect();
        const nextRect = {
          width: rect.width,
          height: element2.clientHeight || rect.height || MESSAGE_LIST_INITIAL_RECT.height,
        };
        if (nextRect.width <= 0 || nextRect.height <= 0) return measuredScrollRectRef.current;
        measuredScrollRectRef.current = nextRect;
        return nextRect;
      };
      callback(readRect());
      if (typeof ResizeObserver === "undefined") return;
      const observer2 = new ResizeObserver(() => callback(readRect()));
      observer2.observe(element2);
      return () => observer2.disconnect();
    },
  });
  reactExports.useLayoutEffect(() => {
    if (!isPresented) return;
    const virtualizerRoot = virtualizerRootRef.current;
    if (!virtualizerRoot) return;
    for (const child of virtualizerRoot.children) {
      if (!(child instanceof HTMLElement)) continue;
      const index2 = Number(child.dataset.index);
      if (!Number.isInteger(index2)) continue;
      const measured = Math.round(child.getBoundingClientRect().height);
      if (measured <= 0) continue;
      MESSAGE_TURN_HEIGHT_CACHE.set(child, measured);
      turnVirtualizer.resizeItem(index2, measured);
    }
  }, [isPresented, turnVirtualizer]);
  const totalVirtualSize = turnVirtualizer.getTotalSize();
  const conversationTailRef = reactExports.useRef(null);
  const [conversationTailHeight, setConversationTailHeight] = reactExports.useState(0);
  reactExports.useLayoutEffect(() => {
    const element2 = conversationTailRef.current;
    if (!element2 || !conversationTail) {
      setConversationTailHeight(0);
      return;
    }
    if (!isPresented) return;
    const updateHeight = () => {
      const measured = element2.getBoundingClientRect().height;
      if (measured > 0) setConversationTailHeight(measured);
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(updateHeight);
    observer2.observe(element2);
    return () => observer2.disconnect();
  }, [conversationTail, isPresented]);
  const scrollToVirtualBottom = reactExports.useCallback(
    (behavior = "instant") => {
      const element2 = scrollRef.current;
      if (conversationTail && element2) {
        if (behavior === "smooth") {
          element2.scrollTo({
            top: element2.scrollHeight,
            behavior: "smooth",
          });
        } else {
          element2.scrollTop = element2.scrollHeight;
        }
        return;
      }
      const lastTurnIndex = turns.length - 1;
      if (lastTurnIndex < 0) {
        const el = scrollRef.current;
        if (el) el.scrollTop = 0;
        return;
      }
      turnVirtualizer.scrollToIndex(lastTurnIndex, {
        align: "end",
        behavior,
      });
    },
    [conversationTail, turnVirtualizer, turns.length],
  );
  const autoScrollTrigger = `${effectiveMessages.length}:${totalVirtualSize}:${scrollElement ? "ready" : "pending"}:${conversationTailHeight}`;
  useAutoScroll(autoScrollTrigger, focusedSessionId, {
    scrollRef,
    scrollToBottom: () => scrollToVirtualBottom("instant"),
    enabled: isPresented,
  });
  const focusedMessageIdRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (!focusMessageId || !isPresented || focusedMessageIdRef.current === focusMessageId) return;
    const turnIndex = findMessageTurnIndex(turns, focusMessageId);
    if (turnIndex < 0) return;
    turnVirtualizer.scrollToIndex(turnIndex, {
      align: "center",
      behavior: "instant",
    });
    let animationFrame;
    let framesLeft = 60;
    const revealFocusedMessage = () => {
      const root2 = scrollRef.current;
      const target = root2
        ? Array.from(root2.querySelectorAll("[data-message-id]")).find(
            (element2) => element2.dataset.messageId === focusMessageId,
          )
        : void 0;
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        focusedMessageIdRef.current = focusMessageId;
        return;
      }
      framesLeft -= 1;
      if (framesLeft <= 0) return;
      animationFrame = requestAnimationFrame(revealFocusedMessage);
    };
    animationFrame = requestAnimationFrame(revealFocusedMessage);
    return () => {
      if (animationFrame !== void 0) cancelAnimationFrame(animationFrame);
    };
  }, [focusMessageId, isPresented, turnVirtualizer, turns]);
  const bottomAnchor = useBottomAnchorState({
    scrollRef,
    lastMessageToken: lastMessageId ?? null,
    isStreaming: busy,
    resetKey: focusedSessionId,
    scrollToBottom: scrollToVirtualBottom,
    enabled: isPresented,
  });
  const virtualItems = turnVirtualizer.getVirtualItems();
  const isLastTurnVisible =
    turns.length > 0 && virtualItems.some((virtualTurn) => virtualTurn.index === turns.length - 1);
  const showDetachedBusyTip = shouldShowBusyTip && (!turns.length || !isLastTurnVisible);
  const historyRail = useHistoryRailState({
    scrollRef,
    turnCount: turns.length,
    virtualItems,
    resetKey: focusedSessionId,
    enabled: isPresented,
  });
  const isScrolling = useIsScrolling({
    scrollRef,
    enabled: isPresented,
  });
  const mockHistoryRail = useDebugFlag(DEBUG_FLAGS.mockHistoryRail);
  const showHistoryRail = historyRail.showRail || mockHistoryRail;
  const railTurns = reactExports.useMemo(() => {
    const real = turns.map((turn, index2) => ({
      index: index2,
      userSignal: extractUserSignalRaw(turn),
      agentSignal: extractAgentSignalRaw(turn),
    }));
    if (!mockHistoryRail) return real;
    const TARGET = 80;
    if (real.length >= TARGET) return real;
    const filler = [];
    for (let i2 = real.length; i2 < TARGET; i2++) {
      filler.push({
        index: i2,
        userSignal: {
          kind: "text",
          text: `[mock] turn ${i2 + 1} user 提示 — 这是为了 QA 压缩模式生成的占位文本.`,
        },
        agentSignal: {
          kind: "text",
          text: `[mock] turn ${i2 + 1} assistant 回复 — 压缩模式下 tick 间距收缩, 命中靠 y-ratio.`,
        },
      });
    }
    return [...real, ...filler];
  }, [turns, mockHistoryRail]);
  const highlightTimerRef = reactExports.useRef(null);
  const highlightRafRef = reactExports.useRef(null);
  const clearHighlightSchedules = reactExports.useCallback(() => {
    if (highlightRafRef.current != null) {
      cancelAnimationFrame(highlightRafRef.current);
      highlightRafRef.current = null;
    }
    if (highlightTimerRef.current != null) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearHighlightSchedules, [clearHighlightSchedules]);
  const handleJumpToTurn = reactExports.useCallback(
    (turnIndex) => {
      if (turnIndex < 0 || turnIndex >= turns.length) return;
      clearHighlightSchedules();
      turnVirtualizer.scrollToIndex(turnIndex, {
        align: "start",
        behavior: "instant",
      });
      const MAX_RETRY_FRAMES = 60;
      const tryHighlight = (framesLeft) => {
        highlightRafRef.current = null;
        const root2 = scrollRef.current;
        if (!root2) return;
        const target = root2.querySelector(`[data-index="${turnIndex}"]`);
        if (target) {
          target.classList.add("chat-turn-highlight");
          highlightTimerRef.current = setTimeout(() => {
            target.classList.remove("chat-turn-highlight");
            highlightTimerRef.current = null;
          }, 800);
          return;
        }
        if (framesLeft <= 0) return;
        highlightRafRef.current = requestAnimationFrame(() => tryHighlight(framesLeft - 1));
      };
      highlightRafRef.current = requestAnimationFrame(() => tryHighlight(MAX_RETRY_FRAMES));
    },
    [turnVirtualizer, turns.length, clearHighlightSchedules],
  );
  return (
    <ChatPresentationProvider isPresented={isPresented}>
      <div className="relative flex-1 min-h-0 flex flex-col">
        <main
          ref={setScrollRef}
          data-action-ui-id="chat-message-list"
          data-scrolling={isScrolling ? "true" : void 0}
          className={getMessageListScrollbarClass(showHistoryRail)}
        >
          <div
            className={`mx-auto w-full ${historyRail.mode === "compact" ? "pr-2" : ""}`}
            style={{
              maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
            }}
          >
            <div
              ref={virtualizerRootRef}
              data-testid="message-turn-virtualizer"
              style={{
                height: totalVirtualSize,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualItems.map((virtualTurn) => {
                const turn = turns[virtualTurn.index];
                if (!turn) return null;
                return (
                  <div
                    key={virtualTurn.key}
                    ref={turnVirtualizer.measureElement}
                    data-index={virtualTurn.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualTurn.start}px)`,
                    }}
                  >
                    <MessageTurn
                      turn={turn}
                      turnIndex={virtualTurn.index}
                      turnCount={turns.length}
                      latestAssistantActionTurnIndex={latestAssistantActionTurnIndex}
                      feedbackSessionId={feedbackSessionId}
                      feedbackWorkspaceDir={feedbackWorkspaceDir}
                      feedbackWorkspaceId={feedbackWorkspaceId}
                      lastMessageId={lastMessageId}
                      focusedSessionId={focusedSessionId}
                      busy={busy}
                      showBusyTip={shouldShowBusyTip && virtualTurn.index === turns.length - 1}
                      busyLabel={virtualTurn.index === turns.length - 1 ? busyLabel : void 0}
                      showHiddenTools={showHiddenTools}
                      showTurnArtifacts={showTurnArtifacts}
                      turnTail={turnTailsByIndex.get(virtualTurn.index)?.map((tail) => (
                        <div key={tail.id}>{tail.content}</div>
                      ))}
                      onSend={onSend}
                      onRetry={onRetry}
                      onFork={onFork}
                    />
                  </div>
                );
              })}
            </div>
            {conversationTail && (
              <div
                ref={conversationTailRef}
                className="px-4 pb-8"
                data-action-ui-id="chat-conversation-tail"
              >
                {conversationTail}
              </div>
            )}
            {showDetachedBusyTip && (
              <div className="px-4 pb-8">
                <BusyTipIndicator label={busyLabel} />
              </div>
            )}
          </div>
        </main>
        {showHistoryRail && (
          <HistoryAnchorRail
            turns={railTurns}
            activeIndex={historyRail.activeIndex}
            activeIndexes={historyRail.activeIndexes}
            onJumpToTurn={handleJumpToTurn}
            compact={historyRail.mode === "compact"}
          />
        )}
        {bottomAnchor.state !== "hidden" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <BottomAnchorButton
              state={bottomAnchor.state}
              unreadCount={bottomAnchor.unreadCount}
              onClick={bottomAnchor.goToBottom}
            />
          </div>
        )}
      </div>
    </ChatPresentationProvider>
  );
}
export const MessageList = reactExports.memo(MessageListImpl, messageListPropsEqual);
MessageList.displayName = "MessageList";
const BusyTipIndicator = reactExports.memo(function BusyTipIndicator2({ label }) {
  const { t: t2 } = useTranslation();
  const tip = useChatTips(true);
  return (
    <div
      data-action-ui-id="chat-busy-tip"
      className="flex h-10 shrink-0 items-start gap-2 overflow-hidden text-body-13 text-muted-foreground"
    >
      <BrailleSpinner type="dna" className="mt-px shrink-0 text-sm text-muted-foreground" />
      <span
        key={label ?? tip ?? "thinking"}
        data-action-ui-id="chat-busy-tip-text"
        className="line-clamp-2 min-w-0 flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
      >
        <span className="text-shimmer text-muted-foreground">
          {label ??
            (tip
              ? t2("chat.tipLabel", {
                  tip,
                })
              : t2("chat.thinking"))}
        </span>
      </span>
    </div>
  );
});
BusyTipIndicator.displayName = "BusyTipIndicator";
export function MessageListContainer(props) {
  const workspaceDir = useCurrentWorkspace();
  const workspaceId2 = useGatewayScopeKey();
  const feedbackSessionId = useWorkspaceChatSelector((chat) =>
    props.focusedSessionId
      ? chat.sessionStore.getState().sessions.get(props.focusedSessionId)?.runtimeSessionId
      : void 0,
  );
  return (
    <MessageList
      {...props}
      feedbackSessionId={feedbackSessionId}
      feedbackWorkspaceDir={workspaceDir}
      feedbackWorkspaceId={workspaceId2}
    />
  );
}
export function Accordion({ className, ...props }) {
  return (
    <AccordionRoot
      data-slot="accordion"
      className={cn$2("flex w-full flex-col", className)}
      {...props}
    />
  );
}
export function AccordionItem({ className, ...props }) {
  return (
    <AccordionItem$1
      data-slot="accordion-item"
      className={cn$2("not-last:[border-bottom-width:var(--divider-width)]", className)}
      {...props}
    />
  );
}
export function AccordionTrigger({ className, children: children2, ...props }) {
  return (
    <AccordionHeader className="flex">
      <AccordionTrigger$1
        data-slot="accordion-trigger"
        className={cn$2(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-xs font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children2}
        <ChevronDownIcon$1
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionTrigger$1>
    </AccordionHeader>
  );
}
export function AccordionContent({ className, children: children2, ...props }) {
  return (
    <AccordionPanel
      data-slot="accordion-content"
      className="overflow-hidden text-xs data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn$2(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children2}
      </div>
    </AccordionPanel>
  );
}
function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}
function isIndependentInteractiveTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'button, a[href], [role="button"], [role="dialog"], [role="menu"], [role="menuitem"], [role="option"], [role="tab"], [role="switch"], [role="slider"], [role="combobox"], [role="listbox"]',
    ),
  );
}
export function shouldIgnoreChatGlobalShortcut(event) {
  return (
    event.defaultPrevented ||
    isEditableTarget(event.target) ||
    isIndependentInteractiveTarget(event.target)
  );
}
export function LoopGuardAskDock({
  message: message2,
  onSend,
  isPresented = true,
  shortcutsEnabled = true,
  submitting = false,
}) {
  const { t: t2 } = useTranslation();
  const data2 = message2.loopGuardData;
  const requestId = message2.requestId;
  const sessionId = message2.loopGuardSessionId;
  const dispatch2 = reactExports.useCallback(
    (decision) => {
      if (!requestId || !sessionId || submitting) return;
      onSend({
        type: "loop_guard_reply",
        id: requestId,
        decision,
        session_id: sessionId,
      });
    },
    [requestId, sessionId, submitting, onSend],
  );
  const handleAllowOnce = reactExports.useCallback(() => dispatch2("allow_once"), [dispatch2]);
  const handleAllowSession = reactExports.useCallback(
    () => dispatch2("allow_session"),
    [dispatch2],
  );
  const handleReject = reactExports.useCallback(() => dispatch2("reject"), [dispatch2]);
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (!isPresented || !shortcutsEnabled || submitting) return;
    const loopGuardTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-action-ui-id="chat-loop-guard-dock"]')
        : null;
    if (e2.key === "Escape" && loopGuardTarget && !e2.defaultPrevented) {
      e2.preventDefault();
      handleReject();
      return;
    }
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if (e2.key === "1" || e2.key === "Enter") {
      e2.preventDefault();
      handleAllowOnce();
      return;
    }
    if (e2.key === "2") {
      e2.preventDefault();
      handleAllowSession();
      return;
    }
    if (e2.key === "3" || e2.key === "Escape") {
      e2.preventDefault();
      handleReject();
    }
  };
  reactExports.useEffect(() => {
    if (!isPresented || !shortcutsEnabled) return;
    const handler = (e2) => keydownRef.current(e2);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPresented, shortcutsEnabled]);
  if (!requestId || !sessionId || !data2) return null;
  const recentToolsLabel = [...new Set(data2.recent_tools)].join(", ") || "—";
  return (
    <div
      data-action-ui-id="chat-loop-guard-dock"
      aria-busy={submitting}
      className="bg-transparent pt-2"
    >
      <div
        data-action-ui-id="chat-loop-guard-dock-content"
        className="mx-auto w-full min-w-0 overflow-hidden rounded-xl border-solid border-border bg-card [border-width:var(--divider-width)]"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        <div className="flex items-start gap-2 px-3 pt-3 pb-2.5">
          <Icon
            icon={Repeat2}
            size="md"
            className="mt-0.5 shrink-0 text-foreground opacity-70"
            aria-hidden={true}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium leading-5 text-foreground">
              {t2("chat.loopGuard.title")}
            </h3>
            <p className="mt-1 text-body-12 leading-[18px] text-muted-foreground">
              {t2("chat.loopGuard.askPrimary", {
                tool: data2.tool,
                hits: data2.hits,
                window: data2.window,
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <Button$1
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-allow-once"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleAllowOnce}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-foreground opacity-70">
              <Icon icon={ArrowRight} size="md" aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {t2("chat.loopGuard.allowOnce")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.allowOnceDesc")}
              </span>
            </span>
            <Kbd className="ml-auto shrink-0 self-center">Enter</Kbd>
          </Button$1>
          <Button$1
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-allow-session"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleAllowSession}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-foreground opacity-70">
              <Icon icon={CheckCheck} size="md" aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {t2("chat.loopGuard.allowSession")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.allowSessionDesc")}
              </span>
            </span>
          </Button$1>
          <Button$1
            type="button"
            variant="outline"
            data-action-ui-id="chat-loop-guard-reject"
            className="h-auto w-full justify-start gap-3 rounded-lg border-border bg-transparent px-3 py-2 text-left whitespace-normal hover:border-foreground hover:bg-muted/30"
            onClick={handleReject}
            disabled={submitting}
          >
            <span className="flex size-4 shrink-0 items-center justify-center text-destructive">
              <RetryIcon size={16} aria-hidden={true} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-13 font-medium leading-5 text-foreground">
                {t2("chat.loopGuard.reject")}
              </span>
              <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                {t2("chat.loopGuard.rejectDesc")}
              </span>
            </span>
            <Kbd className="ml-auto shrink-0 self-center">Esc</Kbd>
          </Button$1>
        </div>
        <Accordion className="border-t border-border">
          <AccordionItem value="technical-details" className="border-0">
            <AccordionTrigger
              data-action-ui-id="chat-loop-guard-technical-details"
              className="rounded-none px-3 py-2 text-caption-11 font-normal text-muted-foreground hover:bg-muted/30 hover:no-underline"
            >
              {t2("chat.loopGuard.technicalDetails")}
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-caption-11 leading-4">
                <dt className="text-muted-foreground">{t2("chat.loopGuard.currentTool")}</dt>
                <dd className="break-all font-mono text-foreground/70">{data2.tool}</dd>
                <dt className="text-muted-foreground">{t2("chat.loopGuard.recentTools")}</dt>
                <dd className="break-all font-mono text-foreground/70">{recentToolsLabel}</dd>
              </dl>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
export function RadioGroup({ className, ...props }) {
  return (
    <RadioGroup$1
      data-slot="radio-group"
      className={cn$2("grid w-full gap-2", className)}
      {...props}
    />
  );
}
export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioRoot
      data-slot="radio-group-item"
      className={cn$2(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioIndicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioIndicator>
    </RadioRoot>
  );
}
function QuestionSelectionCheck({ selected: selected2 }) {
  return (
    <CompositedSvg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-3 shrink-0 overflow-visible [&_path]:[stroke-dasharray:24] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-200 [&_path]:ease-out motion-reduce:[&_path]:transition-none ${selected2 ? "[&_path]:[stroke-dashoffset:0]" : "[&_path]:[stroke-dashoffset:-24]"}`}
    >
      <path
        d="M12.75 5.05 6.35 11.55 3.2 9.4"
        pathLength="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const QUESTION_ATTACHMENT_MAX_COUNT = 4;
const OPTION_SHORTCUT_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function getOptionShortcutKey(optionIndex) {
  return OPTION_SHORTCUT_KEYS[optionIndex] ?? null;
}
function getQuestionSubmitBlockReason(questionIndex, answers, customTexts, customAttachments) {
  const attachments = customAttachments[questionIndex] ?? [];
  if (attachments.some((attachment) => attachment.status === "error")) {
    return "attachment-failed";
  }
  if (
    attachments.some(
      (attachment) =>
        attachment.status === "uploading" ||
        (attachment.status === "done" && !attachment.relativePath),
    )
  ) {
    return "attachment-uploading";
  }
  if ((answers[questionIndex]?.length ?? 0) > 0) return null;
  if (customTexts[questionIndex]?.trim()) return null;
  if (
    attachments.some(
      (attachment) => attachment.status === "done" && Boolean(attachment.relativePath),
    )
  ) {
    return null;
  }
  return "unanswered";
}
function findFirstQuestionSubmitBlocker(questionCount, answers, customTexts, customAttachments) {
  for (let questionIndex = 0; questionIndex < questionCount; questionIndex++) {
    const reason = getQuestionSubmitBlockReason(
      questionIndex,
      answers,
      customTexts,
      customAttachments,
    );
    if (reason)
      return {
        questionIndex,
        reason,
      };
  }
  return null;
}
function buildQuestionReplyMessage(requestId, selectedAnswers, customAnswers) {
  const attachmentContexts = [];
  const answers = selectedAnswers.map((selected2, questionIndex) => {
    const custom = customAnswers[questionIndex];
    if (custom?.attachments.length) {
      attachmentContexts.push({
        question_index: questionIndex,
        attachments: [...custom.attachments],
        ...(custom.attachmentRefs?.length
          ? {
              attachment_refs: [...custom.attachmentRefs],
            }
          : {}),
      });
    }
    return custom?.text.trim() ? [...selected2, custom.text.trim()] : [...selected2];
  });
  return {
    type: "question_reply",
    id: requestId,
    answers,
    ...(attachmentContexts.length > 0
      ? {
          attachment_contexts: attachmentContexts,
        }
      : {}),
  };
}
export function QuestionDock({
  question: question2,
  submissionFailureId,
  onSend,
  isPresented = true,
  onFileDropHandlerChange,
}) {
  const { t: t2 } = useTranslation();
  const { data: mentionModels = [] } = useMentionModels();
  const displayAgentText = reactExports.useCallback(
    (text2) =>
      replaceConfiguredModelNamesForCurrentRegion(redactForCurrentRegion(text2), mentionModels),
    [mentionModels],
  );
  const displayQuestionOptionLabel = reactExports.useCallback(
    (label) => localizeRecommendedQuestionOptionLabel(displayAgentText(label), t2),
    [displayAgentText, t2],
  );
  const raw2 = question2.questionData?.questions;
  const questions = Array.isArray(raw2) ? raw2 : [];
  const requestId = question2.requestId;
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [answers, setAnswers] = reactExports.useState(() => questions.map(() => []));
  const [customTexts, setCustomTexts] = reactExports.useState(() => questions.map(() => ""));
  const [customAttachments, setCustomAttachments] = reactExports.useState(() =>
    questions.map(() => []),
  );
  const [editingCustom, setEditingCustom] = reactExports.useState(() => questions.map(() => false));
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [submitBlocker, setSubmitBlocker] = reactExports.useState(null);
  const questionDockRef = reactExports.useRef(null);
  const composerRefs = reactExports.useRef(questions.map(() => null));
  const committedCustomAnswersRef = reactExports.useRef(
    questions.map(() => ({
      text: "",
      attachments: [],
    })),
  );
  const customPreviousAnswersRef = reactExports.useRef(questions.map(() => []));
  const customRestoreTimerRef = reactExports.useRef(null);
  const customTextsRef = reactExports.useRef(customTexts);
  const suppressAutoAdvanceRef = reactExports.useRef(null);
  const autoAdvanceTimerRef = reactExports.useRef(null);
  const submitLockRef = reactExports.useRef(false);
  const submissionDispatchedRef = reactExports.useRef(false);
  const handledSubmissionFailureIdRef = reactExports.useRef(void 0);
  const previousQuestionMessageIdRef = reactExports.useRef(question2.id);
  const focusDockAfterNavigationRef = reactExports.useRef(null);
  customTextsRef.current = customTexts;
  const releaseSubmissionForRetry = reactExports.useCallback(() => {
    if (!submissionDispatchedRef.current) return;
    submissionDispatchedRef.current = false;
    submitLockRef.current = false;
    setSubmitting(false);
  }, []);
  reactExports.useEffect(() => {
    if (!submissionFailureId || handledSubmissionFailureIdRef.current === submissionFailureId) {
      return;
    }
    handledSubmissionFailureIdRef.current = submissionFailureId;
    releaseSubmissionForRetry();
  }, [releaseSubmissionForRetry, submissionFailureId]);
  reactExports.useEffect(() => {
    if (previousQuestionMessageIdRef.current === question2.id) return;
    previousQuestionMessageIdRef.current = question2.id;
    releaseSubmissionForRetry();
  }, [question2.id, releaseSubmissionForRetry]);
  const toggleCollapsed = reactExports.useCallback(() => setCollapsed((c3) => !c3), []);
  const shortcutLabel = resolveShortcutDisplay(
    "CommandOrControl+Shift+D",
    isMacPlatform() ? "darwin" : "win32",
  ).text;
  const currentQuestion = questions[currentIndex];
  const isMultiple = currentQuestion?.multiple ?? false;
  const isLastQuestion = currentIndex === questions.length - 1;
  const handleCurrentQuestionFileDrop = reactExports.useCallback(
    (event) => composerRefs.current[currentIndex]?.handleFileDrop?.(event),
    [currentIndex],
  );
  reactExports.useEffect(() => {
    onFileDropHandlerChange?.(handleCurrentQuestionFileDrop);
    return () => onFileDropHandlerChange?.(void 0);
  }, [handleCurrentQuestionFileDrop, onFileDropHandlerChange]);
  const firstSubmitBlocker = reactExports.useMemo(
    () => findFirstQuestionSubmitBlocker(questions.length, answers, customTexts, customAttachments),
    [answers, customAttachments, customTexts, questions.length],
  );
  const clearPendingAutoAdvance = reactExports.useCallback(() => {
    if (!autoAdvanceTimerRef.current) return;
    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);
  const handleGoToQuestion = reactExports.useCallback(
    (questionIndex) => {
      if (submitLockRef.current) return;
      clearPendingAutoAdvance();
      setCurrentIndex(questionIndex);
    },
    [clearPendingAutoAdvance],
  );
  const handleSelectOption = reactExports.useCallback(
    (label) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      customPreviousAnswersRef.current[currentIndex] = [];
      setAnswers((prev) => {
        const updated = [...prev];
        const current2 = [...(updated[currentIndex] ?? [])];
        if (isMultiple) {
          const idx = current2.indexOf(label);
          if (idx >= 0) {
            current2.splice(idx, 1);
          } else {
            current2.push(label);
          }
        } else {
          if (current2[0] === label) {
            updated[currentIndex] = [];
            return updated;
          }
          updated[currentIndex] = [label];
          composerRefs.current[currentIndex]?.reset();
          setEditingCustom((prev2) => {
            const ec = [...prev2];
            ec[currentIndex] = false;
            return ec;
          });
          return updated;
        }
        updated[currentIndex] = current2;
        return updated;
      });
    },
    [currentIndex, isMultiple],
  );
  const handleSelectOptionByKeyboard = reactExports.useCallback(
    (optionIndex) => {
      const option2 = currentQuestion?.options[optionIndex];
      if (!option2) return;
      if (!isMultiple && answers[currentIndex]?.[0] === option2.label) return;
      if (!isMultiple) suppressAutoAdvanceRef.current = currentIndex;
      handleSelectOption(option2.label);
    },
    [answers, currentIndex, currentQuestion, handleSelectOption, isMultiple],
  );
  const prevAnswersRef = reactExports.useRef(answers);
  reactExports.useEffect(() => {
    const prev = prevAnswersRef.current;
    prevAnswersRef.current = answers;
    if (isMultiple) return;
    const currentAnswer = answers[currentIndex] ?? [];
    const prevAnswer = prev[currentIndex] ?? [];
    if (suppressAutoAdvanceRef.current === currentIndex) {
      suppressAutoAdvanceRef.current = null;
      return;
    }
    if (currentAnswer.length > 0 && prevAnswer.length === 0 && !isLastQuestion) {
      clearPendingAutoAdvance();
      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        focusDockAfterNavigationRef.current = questionDockRef.current?.contains(
          document.activeElement,
        )
          ? currentIndex + 1
          : null;
        setCurrentIndex((index2) => (index2 === currentIndex ? index2 + 1 : index2));
      }, 150);
      return clearPendingAutoAdvance;
    }
  }, [answers, clearPendingAutoAdvance, currentIndex, isMultiple, isLastQuestion]);
  reactExports.useEffect(() => {
    if (focusDockAfterNavigationRef.current !== currentIndex) return;
    focusDockAfterNavigationRef.current = null;
    questionDockRef.current?.focus({
      preventScroll: true,
    });
  }, [currentIndex]);
  const handleCustomTextChange = reactExports.useCallback(
    (questionIndex, text2) => {
      setCustomTexts((prev) => {
        const updated = [...prev];
        updated[questionIndex] = text2;
        return updated;
      });
      if (!questions[questionIndex]?.multiple && text2.trim()) {
        setAnswers((prev) => {
          const updated = [...prev];
          updated[questionIndex] = [];
          return updated;
        });
      }
    },
    [questions],
  );
  const handleStartCustom = reactExports.useCallback(
    (questionIndex) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      if (!questions[questionIndex]?.multiple) {
        const currentSelection = answers[questionIndex] ?? [];
        if (customPreviousAnswersRef.current[questionIndex]?.length === 0) {
          customPreviousAnswersRef.current[questionIndex] = [...currentSelection];
        }
        if (currentSelection.length > 0) {
          setAnswers((prev) => {
            const updated = [...prev];
            updated[questionIndex] = [];
            return updated;
          });
        }
      }
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = true;
        return updated;
      });
    },
    [answers, questions],
  );
  const handleStopCustom = reactExports.useCallback(
    (questionIndex) => {
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = false;
        return updated;
      });
      if (questions[questionIndex]?.multiple) return;
      const hasAttachment = customAttachments[questionIndex]?.some(
        (attachment) => attachment.status === "done" && Boolean(attachment.relativePath),
      );
      if (customTexts[questionIndex]?.trim() || hasAttachment) {
        customPreviousAnswersRef.current[questionIndex] = [];
        return;
      }
      customRestoreTimerRef.current = setTimeout(() => {
        customRestoreTimerRef.current = null;
        const previousSelection = customPreviousAnswersRef.current[questionIndex] ?? [];
        customPreviousAnswersRef.current[questionIndex] = [];
        if (previousSelection.length === 0 || customTextsRef.current[questionIndex]?.trim()) return;
        setAnswers((prev) => {
          if ((prev[questionIndex]?.length ?? 0) > 0) return prev;
          suppressAutoAdvanceRef.current = questionIndex;
          const updated = [...prev];
          updated[questionIndex] = previousSelection;
          return updated;
        });
      }, 0);
    },
    [customAttachments, customTexts, questions],
  );
  const handleCancelCustom = reactExports.useCallback(
    (questionIndex = currentIndex) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      if (!questions[questionIndex]?.multiple) {
        const previousSelection = customPreviousAnswersRef.current[questionIndex] ?? [];
        customPreviousAnswersRef.current[questionIndex] = [];
        if (previousSelection.length > 0) {
          setAnswers((prev) => {
            suppressAutoAdvanceRef.current = questionIndex;
            const updated = [...prev];
            updated[questionIndex] = previousSelection;
            return updated;
          });
        }
      }
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = false;
        return updated;
      });
      composerRefs.current[questionIndex]?.reset();
    },
    [currentIndex, questions],
  );
  reactExports.useEffect(() => {
    return () => {
      if (customRestoreTimerRef.current) clearTimeout(customRestoreTimerRef.current);
      clearPendingAutoAdvance();
    };
  }, [clearPendingAutoAdvance]);
  const handleCustomAttachmentsChange = reactExports.useCallback(
    (questionIndex, attachments) => {
      setCustomAttachments((prev) => {
        const updated = [...prev];
        updated[questionIndex] = attachments;
        return updated;
      });
      if (attachments.length > 0 && !questions[questionIndex]?.multiple) {
        handleStartCustom(questionIndex);
      }
    },
    [handleStartCustom, questions],
  );
  const handleCustomCommit = reactExports.useCallback(
    (
      questionIndex,
      text2,
      filePaths,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      _allowDataDirectoryFallback,
      _languageDetectionText,
      attachmentRefs,
    ) => {
      if (canvasNodeAttachments?.length || entityRefs?.length || pluginNodeAttachments?.length) {
        return false;
      }
      committedCustomAnswersRef.current[questionIndex] = {
        text: text2,
        attachments: [...filePaths],
        ...(attachmentRefs?.length
          ? {
              attachmentRefs: [...attachmentRefs],
            }
          : {}),
      };
      return true;
    },
    [],
  );
  reactExports.useEffect(() => {
    setSubmitBlocker((current2) => {
      if (!current2) return current2;
      const reason = getQuestionSubmitBlockReason(
        current2.questionIndex,
        answers,
        customTexts,
        customAttachments,
      );
      if (reason === current2.reason) return current2;
      return reason
        ? {
            ...current2,
            reason,
          }
        : null;
    });
  }, [answers, customAttachments, customTexts]);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!requestId || submitLockRef.current || submissionDispatchedRef.current) return;
    if (firstSubmitBlocker) {
      clearPendingAutoAdvance();
      setSubmitBlocker(firstSubmitBlocker);
      if (firstSubmitBlocker.questionIndex !== currentIndex) {
        focusDockAfterNavigationRef.current = firstSubmitBlocker.questionIndex;
        setCurrentIndex(firstSubmitBlocker.questionIndex);
      }
      return;
    }
    submitLockRef.current = true;
    setSubmitBlocker(null);
    setSubmitting(true);
    let dispatched = false;
    try {
      const customAnswerSubmissions = [];
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        const hasCustomText = Boolean(customTexts[questionIndex]?.trim());
        const hasCustomAttachment = customAttachments[questionIndex]?.some(
          (attachment) => attachment.status === "done" && Boolean(attachment.relativePath),
        );
        if (!hasCustomText && !hasCustomAttachment) {
          committedCustomAnswersRef.current[questionIndex] = {
            text: "",
            attachments: [],
          };
          continue;
        }
        const composer = composerRefs.current[questionIndex];
        if (!composer) return;
        customAnswerSubmissions.push(composer.submit());
      }
      if (customAnswerSubmissions.length > 0) {
        const accepted = await Promise.all(customAnswerSubmissions);
        if (accepted.some((result) => !result)) return;
      }
      const scopedAnswers = Array.from(
        {
          length: questions.length,
        },
        (_2, questionIndex) => answers[questionIndex] ?? [],
      );
      const scopedCustomAnswers = Array.from(
        {
          length: questions.length,
        },
        (_2, questionIndex) =>
          committedCustomAnswersRef.current[questionIndex] ?? {
            text: "",
            attachments: [],
          },
      );
      const sent = onSend(buildQuestionReplyMessage(requestId, scopedAnswers, scopedCustomAnswers));
      if (sent === false) return;
      submissionDispatchedRef.current = true;
      dispatched = true;
    } finally {
      if (!dispatched) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  }, [
    answers,
    clearPendingAutoAdvance,
    currentIndex,
    customAttachments,
    customTexts,
    firstSubmitBlocker,
    onSend,
    questions.length,
    requestId,
  ]);
  const handleKeyboardAdvance = reactExports.useCallback(() => {
    if (submitLockRef.current || submissionDispatchedRef.current) return;
    clearPendingAutoAdvance();
    if (isLastQuestion) {
      void handleSubmit();
      return;
    }
    const nextIndex = Math.min(currentIndex + 1, questions.length - 1);
    focusDockAfterNavigationRef.current = nextIndex;
    setCurrentIndex(nextIndex);
  }, [clearPendingAutoAdvance, currentIndex, handleSubmit, isLastQuestion, questions.length]);
  const handleDismiss = reactExports.useCallback(() => {
    if (!requestId || submitLockRef.current || submissionDispatchedRef.current) return;
    onSend({
      type: "question_reject",
      id: requestId,
    });
  }, [requestId, onSend]);
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (!isPresented) return;
    const questionDockTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-action-ui-id="chat-question-dock"]')
        : null;
    if (questionDockTarget !== questionDockRef.current) return;
    const selectedOptionTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-question-option="true"][data-selected="true"]')
        : null;
    const optionTarget =
      e2.target instanceof HTMLElement ? e2.target.closest('[data-question-option="true"]') : null;
    if (e2.key === "Escape" && questionDockTarget && !e2.defaultPrevented) {
      e2.preventDefault();
      if (editingCustom[currentIndex]) {
        handleCancelCustom();
      } else {
        handleDismiss();
      }
      return;
    }
    const isPlainEnter =
      e2.key === "Enter" &&
      !e2.shiftKey &&
      !e2.metaKey &&
      !e2.ctrlKey &&
      !e2.altKey &&
      !e2.repeat &&
      !e2.isComposing &&
      e2.keyCode !== 229;
    if (isPlainEnter && selectedOptionTarget && !collapsed) {
      e2.preventDefault();
      handleKeyboardAdvance();
      return;
    }
    const optionShortcutIndex =
      e2.key.length === 1 ? OPTION_SHORTCUT_KEYS.indexOf(e2.key.toUpperCase()) : -1;
    const isOptionShortcut =
      optionShortcutIndex >= 0 &&
      !e2.shiftKey &&
      !e2.metaKey &&
      !e2.ctrlKey &&
      !e2.altKey &&
      !e2.repeat &&
      !e2.isComposing &&
      e2.keyCode !== 229;
    if (
      isOptionShortcut &&
      !collapsed &&
      !editingCustom[currentIndex] &&
      (e2.target === questionDockRef.current || optionTarget)
    ) {
      if (currentQuestion?.options[optionShortcutIndex]) {
        e2.preventDefault();
        handleSelectOptionByKeyboard(optionShortcutIndex);
      }
      return;
    }
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if ((e2.metaKey || e2.ctrlKey) && e2.shiftKey && (e2.key === "d" || e2.key === "D")) {
      e2.preventDefault();
      toggleCollapsed();
      return;
    }
    if (e2.key === "Escape") {
      if (editingCustom[currentIndex]) {
        handleCancelCustom();
      } else {
        handleDismiss();
      }
      return;
    }
    if (collapsed) return;
    if (isPlainEnter && !editingCustom[currentIndex]) {
      e2.preventDefault();
      handleKeyboardAdvance();
    }
  };
  reactExports.useEffect(() => {
    if (!isPresented) return;
    const dock = questionDockRef.current;
    if (!dock) return;
    const handler = (event) => keydownRef.current(event);
    dock.addEventListener("keydown", handler);
    return () => dock.removeEventListener("keydown", handler);
  }, [isPresented]);
  if (!currentQuestion || !requestId) return null;
  const currentAnswers = answers[currentIndex] ?? [];
  const questionLabelId = `chat-question-label-${requestId}-${currentIndex}`;
  const activeSubmitBlockReason =
    submitBlocker?.questionIndex === currentIndex ? submitBlocker.reason : null;
  const submitBlockMessage = activeSubmitBlockReason
    ? {
        unanswered: t2("chat.question.answerRequired", "Answer this question before submitting."),
        "attachment-uploading": t2(
          "chat.question.attachmentUploading",
          "This attachment is still uploading. Submit after it finishes.",
        ),
        "attachment-failed": t2(
          "chat.question.attachmentFailed",
          "Attachment upload failed. Retry or remove it before submitting.",
        ),
      }[activeSubmitBlockReason]
    : null;
  const answeredCount = questions.reduce(
    (n2, _2, i2) =>
      n2 +
      ((answers[i2]?.length ?? 0) > 0 ||
      customTexts[i2]?.trim() ||
      customAttachments[i2]?.some(
        (attachment) => attachment.status === "done" && Boolean(attachment.relativePath),
      )
        ? 1
        : 0),
    0,
  );
  const progressLabel = questions.length > 1 ? `${currentIndex + 1}/${questions.length}` : null;
  const headerBar = (
    <div
      data-action-ui-id="chat-question-header"
      className={`flex min-h-8 min-w-0 gap-2 pr-3 ${questions.length === 1 ? "pl-3" : "pl-4"} ${collapsed ? "items-center" : "items-start"} ${questions.length === 1 ? "pt-3 pb-2.5" : "py-2.5"}`}
    >
      {questions.length === 1 && (
        <QuestionPromptIcon actionId="chat-question-active-icon" className="mt-0.5" />
      )}
      <div data-action-ui-id="chat-question-heading-group" className="min-w-0 flex-1">
        <div className={`flex min-w-0 gap-1.5 ${collapsed ? "items-center" : "items-start"}`}>
          {questions.length > 1 && (
            <span className="shrink-0 text-sm font-medium leading-5 text-foreground">
              {currentIndex + 1}.
            </span>
          )}
          <span
            className={`min-w-0 flex-1 text-sm font-medium leading-5 text-foreground ${collapsed ? "truncate" : "whitespace-pre-wrap"}`}
          >
            <span id={questionLabelId}>{displayAgentText(currentQuestion.question)}</span>
            {!collapsed && isMultiple && (
              <span className="ml-2 text-body-12 font-normal text-muted-foreground">
                ({t2("chat.question.multiSelect")})
              </span>
            )}
          </span>
          {collapsed && progressLabel && (
            <span className="shrink-0 text-caption-11 text-muted-foreground">{progressLabel}</span>
          )}
          {collapsed && questions.length > 1 && (
            <span className="shrink-0 text-caption-11 text-muted-foreground">
              ({answeredCount}/{questions.length})
            </span>
          )}
        </div>
      </div>
      <Button$1
        type="button"
        variant="ghost"
        size="icon-xs"
        data-action-ui-id="chat-question-toggle"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? t2("chat.question.expand", "Expand")
            : t2("chat.question.collapse", "Collapse")
        }
        title={
          collapsed
            ? `${t2("chat.question.expand", "Expand")} (${shortcutLabel})`
            : `${t2("chat.question.collapse", "Collapse")} (${shortcutLabel})`
        }
        tabIndex={collapsed ? -1 : void 0}
        aria-hidden={collapsed ? true : void 0}
        className={`shrink-0 text-muted-foreground aria-expanded:bg-transparent ${collapsed ? "pointer-events-none" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleCollapsed();
        }}
      >
        <Icon
          icon={ChevronDown}
          size="md"
          strokeWidth={1.5}
          className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
      </Button$1>
    </div>
  );
  return (
    <div
      ref={questionDockRef}
      data-action-ui-id="chat-question-dock"
      data-collapsed={collapsed ? "true" : "false"}
      tabIndex={-1}
      className="flex max-h-full min-h-0 flex-col bg-transparent pt-2 outline-none"
    >
      <div
        data-action-ui-id="chat-question-dock-content"
        className="relative mx-auto flex max-h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-solid border-border bg-card [border-width:var(--divider-width)]"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        {collapsed && (
          <button
            type="button"
            data-action-ui-id="chat-question-card-expand-target"
            aria-expanded="false"
            aria-label={t2("chat.question.expand", "Expand")}
            className="absolute inset-0 z-10 size-full cursor-pointer rounded-xl bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={toggleCollapsed}
          />
        )}
        {!collapsed && questions.length > 1 && (
          <div
            data-action-ui-id="chat-question-stepper"
            className="scrollbar-none min-w-0 overflow-x-auto px-3 pt-3"
          >
            <div
              data-action-ui-id="chat-question-stepper-track"
              className="flex min-w-full flex-nowrap items-center"
            >
              {questions.map((q2, i2) => {
                const answered = Boolean(
                  answers[i2]?.length > 0 ||
                  customTexts[i2]?.trim() ||
                  customAttachments[i2]?.some(
                    (attachment) =>
                      attachment.status === "done" && Boolean(attachment.relativePath),
                  ),
                );
                const previousAnswered =
                  i2 > 0 &&
                  Boolean(
                    answers[i2 - 1]?.length > 0 ||
                    customTexts[i2 - 1]?.trim() ||
                    customAttachments[i2 - 1]?.some(
                      (attachment) =>
                        attachment.status === "done" && Boolean(attachment.relativePath),
                    ),
                  );
                const active2 = i2 === currentIndex;
                return jsxRuntimeExports.jsxs(
                  reactExports.Fragment,
                  {
                    children: [
                      i2 > 0 && (
                        <span
                          data-action-ui-id={`chat-question-step-connector-${i2}`}
                          aria-hidden="true"
                          className={`mx-1 h-px min-w-3 max-w-7 flex-1 transition-colors duration-200 ${previousAnswered ? "bg-foreground/25" : "bg-border"}`}
                        />
                      ),
                      <button
                        type="button"
                        data-action-ui-id={`chat-question-step-${i2}`}
                        data-answered={answered ? "true" : "false"}
                        aria-current={active2 ? "step" : void 0}
                        aria-label={`${i2 + 1}. ${displayAgentText(q2.header)}`}
                        title={displayAgentText(q2.header)}
                        className="group flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        onClick={() => handleGoToQuestion(i2)}
                      >
                        <span
                          className={`flex size-6 items-center justify-center rounded-full border transition-[color,background-color,border-color,box-shadow] duration-200 ${active2 ? "border-foreground bg-foreground text-background" : answered ? "border-foreground/20 bg-muted/60 text-foreground" : "border-foreground/20 bg-transparent text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground"}`}
                        >
                          {answered ? (
                            <QuestionSelectionCheck selected={true} />
                          ) : (
                            <span className="text-caption-10 leading-none">{i2 + 1}</span>
                          )}
                        </span>
                      </button>,
                    ],
                  },
                  q2.header,
                );
              })}
            </div>
          </div>
        )}
        <div
          data-action-ui-id="chat-question-scroll-region"
          className={collapsed ? "contents" : "min-h-0 flex-1 overflow-y-auto"}
        >
          {headerBar}
          {!collapsed && (
            <div
              data-action-ui-id="chat-question-body"
              className="flex min-w-0 flex-col gap-2 px-3 pt-0 pb-3"
            >
              <div
                data-action-ui-id="chat-question-choice-list"
                className="flex min-h-0 flex-col gap-1.5"
              >
                {currentQuestion.options.length > 0 &&
                  (isMultiple ? (
                    <fieldset
                      aria-labelledby={questionLabelId}
                      data-action-ui-id="chat-question-options"
                      className="flex max-h-[min(36vh,18rem)] flex-col gap-1.5 overflow-y-auto"
                    >
                      {currentQuestion.options.map((opt, i2) => {
                        const isSelected = currentAnswers.includes(opt.label);
                        const optionId = `chat-question-${requestId}-${currentIndex}-${i2}`;
                        const optionShortcutKey = getOptionShortcutKey(i2);
                        return (
                          <Label
                            key={opt.label}
                            htmlFor={optionId}
                            data-action-ui-id={`chat-question-option-${i2}`}
                            data-question-option="true"
                            data-selected={isSelected ? "true" : "false"}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/[0.02] text-foreground" : "border-border bg-transparent text-foreground hover:bg-muted/30"}`}
                          >
                            <span
                              aria-hidden="true"
                              data-action-ui-id={`chat-question-option-shortcut-${i2}`}
                              className="w-4 shrink-0 text-center text-body-14 font-normal leading-5 text-foreground/70"
                            >
                              {optionShortcutKey}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-13 font-medium leading-5">
                                {displayQuestionOptionLabel(opt.label)}
                              </span>
                              {opt.description && (
                                <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                                  {displayAgentText(opt.description)}
                                </span>
                              )}
                            </span>
                            <Checkbox
                              id={optionId}
                              checked={isSelected}
                              aria-keyshortcuts={optionShortcutKey?.toLowerCase()}
                              onCheckedChange={() => handleSelectOption(opt.label)}
                              shape="circle"
                              size="sm"
                              data-action-ui-id={`chat-question-option-index-${i2}`}
                            />
                          </Label>
                        );
                      })}
                    </fieldset>
                  ) : (
                    <RadioGroup
                      aria-labelledby={questionLabelId}
                      value={currentAnswers[0] ?? ""}
                      onValueChange={handleSelectOption}
                      data-action-ui-id="chat-question-options"
                      className="max-h-[min(36vh,18rem)] gap-1.5 overflow-y-auto"
                    >
                      {currentQuestion.options.map((opt, i2) => {
                        const isSelected = currentAnswers.includes(opt.label);
                        const optionId = `chat-question-${requestId}-${currentIndex}-${i2}`;
                        const optionShortcutKey = getOptionShortcutKey(i2);
                        return (
                          <Label
                            key={opt.label}
                            htmlFor={optionId}
                            data-action-ui-id={`chat-question-option-${i2}`}
                            data-question-option="true"
                            data-selected={isSelected ? "true" : "false"}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/[0.02] text-foreground" : "border-border bg-transparent text-foreground hover:bg-muted/30"}`}
                          >
                            <RadioGroupItem
                              id={optionId}
                              value={opt.label}
                              aria-keyshortcuts={optionShortcutKey?.toLowerCase()}
                              className="pointer-events-none absolute size-px overflow-hidden border-0 p-0 opacity-0"
                            />
                            <span
                              aria-hidden="true"
                              data-action-ui-id={`chat-question-option-shortcut-${i2}`}
                              className="w-4 shrink-0 text-center text-body-14 font-normal leading-5 text-foreground/70"
                            >
                              {optionShortcutKey}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-13 font-medium leading-5">
                                {displayQuestionOptionLabel(opt.label)}
                              </span>
                              {opt.description && (
                                <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                                  {displayAgentText(opt.description)}
                                </span>
                              )}
                            </span>
                            <span className="flex w-7 shrink-0 items-center justify-center">
                              <span
                                data-action-ui-id={`chat-question-option-index-${i2}`}
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-foreground bg-foreground text-background" : "border-foreground/30 bg-transparent text-transparent"}`}
                              >
                                <QuestionSelectionCheck selected={isSelected} />
                              </span>
                            </span>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  ))}
                {questions.map((info2, questionIndex) => {
                  if (info2.custom === false) return null;
                  const active2 = questionIndex === currentIndex;
                  const multiple = info2.multiple ?? false;
                  const selected2 =
                    Boolean(customTexts[questionIndex]?.trim()) ||
                    customAttachments[questionIndex]?.some(
                      (attachment) =>
                        attachment.status === "done" && Boolean(attachment.relativePath),
                    ) ||
                    (!multiple && editingCustom[questionIndex]);
                  return (
                    <div
                      key={`${requestId}-${questionIndex}`}
                      hidden={!active2}
                      className={active2 ? "block" : "hidden"}
                    >
                      <div
                        data-action-ui-id={active2 ? "chat-question-custom-option" : void 0}
                        className={`flex w-full items-start gap-2 rounded-lg border p-2 transition-colors ${selected2 ? "border-foreground bg-foreground/[0.02]" : "border-border bg-transparent hover:bg-muted/30"}`}
                        onFocusCapture={() => handleStartCustom(questionIndex)}
                        onBlurCapture={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            handleStopCustom(questionIndex);
                          }
                        }}
                        onKeyDownCapture={(event) => {
                          if (event.key !== "Escape") return;
                          event.preventDefault();
                          event.stopPropagation();
                          handleCancelCustom(questionIndex);
                          event.target.blur();
                        }}
                      >
                        <span
                          aria-hidden="true"
                          data-action-ui-id="chat-question-custom-icon"
                          className={`flex h-8 w-4 translate-x-1 shrink-0 items-center justify-center transition-colors ${selected2 ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          <Icon icon={PencilLine} size="md" strokeWidth={1.25} aria-hidden={true} />
                        </span>
                        <MessageInput
                          ref={(node2) => {
                            composerRefs.current[questionIndex] = node2;
                          }}
                          fileDropScope="parent"
                          onSend={(
                            text2,
                            filePaths,
                            canvasNodeAttachments,
                            entityRefs,
                            pluginNodeAttachments,
                            allowDataDirectoryFallback,
                            languageDetectionText,
                            attachmentRefs,
                          ) =>
                            handleCustomCommit(
                              questionIndex,
                              text2,
                              filePaths,
                              canvasNodeAttachments,
                              entityRefs,
                              pluginNodeAttachments,
                              allowDataDirectoryFallback,
                              languageDetectionText,
                              attachmentRefs,
                            )
                          }
                          clearOnSend={false}
                          busy={submitting}
                          attachmentAccept={MEDIA_FILE_ACCEPT.image}
                          replacementAccept={MEDIA_FILE_ACCEPT.image}
                          attachmentMaxCount={QUESTION_ATTACHMENT_MAX_COUNT}
                          hideSubmitAction={true}
                          submitOnEnter={false}
                          onPlainEnter={(event) => {
                            if (!event.repeat) handleKeyboardAdvance();
                          }}
                          enableSlashCommands={false}
                          hideAssetMention={true}
                          placeholder={t2("chat.question.customPlaceholder")}
                          editorAriaLabel={
                            questions.length === 1
                              ? t2("chat.question.other")
                              : `${t2("chat.question.other")}: ${redactForCurrentRegion(info2.header)}`
                          }
                          editorActionId={`chat-question-custom-input-${questionIndex}`}
                          toolbar={(context) => (
                            <ChatToolbar
                              {...context}
                              busy={submitting}
                              running={false}
                              selectedMediaModels={void 0}
                              onModelSelectionChange={() => {}}
                              showModelSelector={false}
                              showSkillSelector={false}
                            />
                          )}
                          onInputChange={(text2) => handleCustomTextChange(questionIndex, text2)}
                          onAttachmentsChange={(attachments) =>
                            handleCustomAttachmentsChange(questionIndex, attachments)
                          }
                          className="question-dock-composer @container/composer min-w-0 flex-1 bg-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div data-action-ui-id="chat-question-actions" className="shrink-0 px-3 pt-1 pb-3">
            {submitBlockMessage && (
              <p
                role="status"
                aria-live="polite"
                data-action-ui-id="chat-question-submit-blocker"
                data-reason={activeSubmitBlockReason ?? void 0}
                className={`mb-2 text-body-12 leading-[18px] ${activeSubmitBlockReason === "attachment-failed" ? "text-destructive" : "text-muted-foreground"}`}
              >
                {submitBlockMessage}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button$1
                type="button"
                variant="secondary"
                className="h-[34px] rounded-md text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
                disabled={submitting}
              >
                {t2("chat.question.dismiss")}
              </Button$1>
              {currentIndex > 0 && (
                <Button$1
                  type="button"
                  variant="secondary"
                  className="h-[34px] rounded-md"
                  onClick={() => handleGoToQuestion(currentIndex - 1)}
                  disabled={submitting}
                >
                  {t2("chat.question.back")}
                </Button$1>
              )}
              {isLastQuestion ? (
                <Button$1
                  type="button"
                  data-action-ui-id="chat-question-submit"
                  className="h-[34px] rounded-md"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Icon icon={Check} size="sm" aria-hidden={true} />
                  {t2("chat.question.submit")}
                </Button$1>
              ) : (
                <Button$1
                  type="button"
                  data-action-ui-id="chat-question-next"
                  className="h-[34px] rounded-md"
                  onClick={() => handleGoToQuestion(currentIndex + 1)}
                  disabled={submitting}
                >
                  {t2("chat.question.next")}
                </Button$1>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
