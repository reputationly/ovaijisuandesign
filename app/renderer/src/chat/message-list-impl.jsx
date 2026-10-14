// message-list-impl.jsx
import {
  BottomAnchorButton,
  ChatPresentationProvider,
  collectAssistantCopyText,
} from "./use-copy.jsx";
import { useVirtualizer } from "../vendor.js";
import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";
import { MessageTurn } from "./message-turn.jsx";
import { BusyTipIndicator } from "./busy-tip-indicator.jsx";
import { useIsScrolling } from "../assets/credit-query-keys.jsx";
import {
  DEBUG_FLAGS,
  useDebugFlag,
} from "../workspace/use-deep-link-router.js";
import { MOCK_MEDIA_GEN_MESSAGES } from "./mock-media-gen-messages.js";
import { useAutoScroll } from "./use-auto-scroll.js";
import { useBottomAnchorState } from "./use-bottom-anchor-state.js";
import { HistoryAnchorRail } from "./history-anchor-rail-impl.jsx";
import { useHistoryRailState } from "./use-history-rail-state.js";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./chat-content-width.jsx";

function attachmentTypeKey(type) {
  if (type === "image") return "image";
  if (type === "video") return "video";
  if (type === "audio") return "audio";
  return "file";
}

function summarizeAttachments(attachments) {
  if (!attachments || attachments.length === 0) return void 0;
  if (attachments.length === 1) {
    const firstAttachment = attachments[0];
    if (!firstAttachment) return void 0;
    const filename = firstAttachment.path.split("/").pop() || firstAttachment.path;
    return {
      kind: "single",
      filename,
    };
  }
  const firstType = attachmentTypeKey(attachments[0]?.type ?? "file");
  const allSameType = attachments.every(
    (attachment) => attachmentTypeKey(attachment.type) === firstType,
  );
  if (allSameType) {
    return {
      kind: "sameType",
      type: firstType,
      count: attachments.length,
    };
  }
  return {
    kind: "mixed",
    count: attachments.length,
  };
}

function extractUserSignalRaw(turn) {
  const user = turn.user;
  if (!user) return null;
  const text = user.content?.trim() ?? "";
  const attachments = summarizeAttachments(user.attachments);
  if (text) {
    return {
      kind: "text",
      text,
      attachments,
    };
  }
  if (attachments) {
    return {
      kind: "attachmentsOnly",
      attachments,
    };
  }
  return null;
}

function extractAgentSignalRaw(turn) {
  const flat = turn.responses.flat();
  if (flat.length === 0) return null;
  const textMsg = flat.find(
    (message) =>
      (message.type === "text" || message.type === "thinking") &&
      typeof message.content === "string",
  );
  const textContent = textMsg?.content?.trim();
  if (textContent) {
    return {
      kind: "text",
      text: textContent,
    };
  }
  const subAgent = flat.find((message) => message.type === "sub_agent");
  if (subAgent) {
    const role = subAgent.agent?.trim() || "agent";
    const subText = subAgent.content?.trim();
    return {
      kind: "subAgent",
      role,
      text: subText || void 0,
    };
  }
  const tool = flat.find((message) => message.type === "tool");
  if (tool) {
    const toolName = tool.toolName?.trim() || tool.content?.trim() || "";
    if (toolName)
      return {
        kind: "tool",
        toolName,
      };
  }
  return null;
}

const MESSAGE_TURN_ESTIMATED_HEIGHT = 180;

const MESSAGE_TURN_OVERSCAN = 8;

const MESSAGE_LIST_INITIAL_RECT = {
  width: 0,
  height: 720,
};

const MESSAGE_TURN_HEIGHT_CACHE = new WeakMap();

const MESSAGE_LIST_BASE_CLASS =
  "flex-1 overflow-y-auto overflow-x-hidden pt-3 pb-20 pr-1.5 mr-0.5";

const MESSAGE_LIST_HIDDEN_SCROLLBAR_CLASS =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const MESSAGE_LIST_NATIVE_SCROLLBAR_CLASS =
  "[scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/0! [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-300! [&::-webkit-scrollbar-thumb]:ease-in-out! [&[data-scrolling=true]::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!";

function getMessageListScrollbarClass(showHistoryRail) {
  return `${MESSAGE_LIST_BASE_CLASS} ${showHistoryRail ? MESSAGE_LIST_HIDDEN_SCROLLBAR_CLASS : MESSAGE_LIST_NATIVE_SCROLLBAR_CLASS}`;
}

function findMessageTurnIndex(turns, messageId) {
  return turns.findIndex((turn) => {
    if (turn.user?.id === messageId) return true;
    return turn.responses.some((group) =>
      group.some((message) => message.id === messageId),
    );
  });
}

function groupTools(messages) {
  const groups = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (message.type === "tool" && last?.[0]?.type === "tool") {
      last.push(message);
    } else {
      groups.push([message]);
    }
  }
  return groups;
}

function groupIntoTurns(messages) {
  const turns = [];
  let currentResponses = [];
  for (const message of messages) {
    if (message.type === "text" && message.role === "user") {
      if (currentResponses.length > 0) {
        const prev = turns[turns.length - 1];
        if (prev) {
          prev.responses = groupTools(currentResponses);
        } else {
          turns.push({
            user: null,
            responses: groupTools(currentResponses),
          });
        }
        currentResponses = [];
      }
      turns.push({
        user: message,
        responses: [],
      });
    } else {
      currentResponses.push(message);
    }
  }
  if (currentResponses.length > 0) {
    const prev = turns[turns.length - 1];
    if (prev) {
      prev.responses = groupTools(currentResponses);
    } else {
      turns.push({
        user: null,
        responses: groupTools(currentResponses),
      });
    }
  }
  return turns;
}

function findLatestAssistantActionTurnIndex(turns, activeTurnPending) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (!turn) continue;
    const isActiveTurn = index === turns.length - 1;
    if (isActiveTurn && activeTurnPending) continue;
    if (collectAssistantCopyText(turn.responses.flat())) return index;
  }
  return -1;
}

function getTurnKey(turn, index) {
  return (
    turn?.user?.id ??
    turn?.responses.find((group) => group[0])?.[0]?.id ??
    `turn-${index}`
  );
}

function measureMessageTurnElement(element, isPresented) {
  if (!isPresented) {
    return (
      MESSAGE_TURN_HEIGHT_CACHE.get(element) ?? MESSAGE_TURN_ESTIMATED_HEIGHT
    );
  }
  const measured = Math.round(element.getBoundingClientRect().height);
  if (measured > 0) {
    MESSAGE_TURN_HEIGHT_CACHE.set(element, measured);
    return measured;
  }
  return (
    MESSAGE_TURN_HEIGHT_CACHE.get(element) ?? MESSAGE_TURN_ESTIMATED_HEIGHT
  );
}

export function MessageListImpl({
  messages,
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
    if (!mockMediaGen) return messages;
    return [...MOCK_MEDIA_GEN_MESSAGES, ...messages];
  }, [messages, mockMediaGen]);
  const turns = reactExports.useMemo(
    () => groupIntoTurns(effectiveMessages),
    [effectiveMessages],
  );
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
          group.some((message) => message.id === tail.anchorMessageId),
        );
      });
      if (turnIndex < 0) continue;
      const current = byIndex.get(turnIndex);
      if (current) current.push(tail);
      else byIndex.set(turnIndex, [tail]);
    }
    return byIndex;
  }, [turnTails, turns]);
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrollRef = reactExports.useRef(null);
  const virtualizerRootRef = reactExports.useRef(null);
  const isPresentedRef = reactExports.useRef(isPresented);
  isPresentedRef.current = isPresented;
  const measuredScrollRectRef = reactExports.useRef(MESSAGE_LIST_INITIAL_RECT);
  const [scrollElement, setScrollElement] = reactExports.useState(null);
  const setScrollRef = reactExports.useCallback((node) => {
    scrollRef.current = node;
    setScrollElement(node);
  }, []);
  const measurePresentedMessageTurnElement = reactExports.useCallback(
    (element) => measureMessageTurnElement(element, isPresentedRef.current),
    [],
  );
  const turnVirtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => MESSAGE_TURN_ESTIMATED_HEIGHT,
    measureElement: measurePresentedMessageTurnElement,
    getItemKey: (index) => getTurnKey(turns[index], index),
    overscan: MESSAGE_TURN_OVERSCAN,
    initialRect: MESSAGE_LIST_INITIAL_RECT,
    // Coalesce the per-item ResizeObserver callbacks into one notify per animation
    // frame. The streaming last turn fires its RO on every reflow; without this,
    // each callback runs resizeItem → notify → a full MessageListImpl re-render
    // synchronously. rAF batching means at most one re-render per frame from
    // measurement, on top of the integer-px rounding in measureMessageTurnElement.
    useAnimationFrameWithResizeObserver: true,
    observeElementRect: (instance, callback) => {
      const element = instance.scrollElement;
      if (!element) return;
      const readRect = () => {
        if (!isPresentedRef.current) return measuredScrollRectRef.current;
        const rect = element.getBoundingClientRect();
        const nextRect = {
          width: rect.width,
          height:
            element.clientHeight ||
            rect.height ||
            MESSAGE_LIST_INITIAL_RECT.height,
        };
        if (nextRect.width <= 0 || nextRect.height <= 0)
          return measuredScrollRectRef.current;
        measuredScrollRectRef.current = nextRect;
        return nextRect;
      };
      callback(readRect());
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => callback(readRect()));
      observer.observe(element);
      return () => observer.disconnect();
    },
  });
  reactExports.useLayoutEffect(() => {
    if (!isPresented) return;
    const virtualizerRoot = virtualizerRootRef.current;
    if (!virtualizerRoot) return;
    for (const child of virtualizerRoot.children) {
      if (!(child instanceof HTMLElement)) continue;
      const index = Number(child.dataset.index);
      if (!Number.isInteger(index)) continue;
      const measured = Math.round(child.getBoundingClientRect().height);
      if (measured <= 0) continue;
      MESSAGE_TURN_HEIGHT_CACHE.set(child, measured);
      turnVirtualizer.resizeItem(index, measured);
    }
  }, [isPresented, turnVirtualizer]);
  const totalVirtualSize = turnVirtualizer.getTotalSize();
  const conversationTailRef = reactExports.useRef(null);
  const [conversationTailHeight, setConversationTailHeight] =
    reactExports.useState(0);
  reactExports.useLayoutEffect(() => {
    const element = conversationTailRef.current;
    if (!element || !conversationTail) {
      setConversationTailHeight(0);
      return;
    }
    if (!isPresented) return;
    const updateHeight = () => {
      const measured = element.getBoundingClientRect().height;
      if (measured > 0) setConversationTailHeight(measured);
    };
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [conversationTail, isPresented]);
  const scrollToVirtualBottom = reactExports.useCallback(
    (behavior = "instant") => {
      const element = scrollRef.current;
      if (conversationTail && element) {
        if (behavior === "smooth") {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: "smooth",
          });
        } else {
          element.scrollTop = element.scrollHeight;
        }
        return;
      }
      const lastTurnIndex = turns.length - 1;
      if (lastTurnIndex < 0) {
        const scrollElement = scrollRef.current;
        if (scrollElement) scrollElement.scrollTop = 0;
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
    if (
      !focusMessageId ||
      !isPresented ||
      focusedMessageIdRef.current === focusMessageId
    )
      return;
    const turnIndex = findMessageTurnIndex(turns, focusMessageId);
    if (turnIndex < 0) return;
    turnVirtualizer.scrollToIndex(turnIndex, {
      align: "center",
      behavior: "instant",
    });
    let animationFrame;
    let framesLeft = 60;
    const revealFocusedMessage = () => {
      const root = scrollRef.current;
      const target = root
        ? Array.from(root.querySelectorAll("[data-message-id]")).find(
            (element) => element.dataset.messageId === focusMessageId,
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
    turns.length > 0 &&
    virtualItems.some((virtualTurn) => virtualTurn.index === turns.length - 1);
  const showDetachedBusyTip =
    shouldShowBusyTip && (!turns.length || !isLastTurnVisible);
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
    const real = turns.map((turn, index) => ({
      index,
      userSignal: extractUserSignalRaw(turn),
      agentSignal: extractAgentSignalRaw(turn),
    }));
    if (!mockHistoryRail) return real;
    const TARGET = 80;
    if (real.length >= TARGET) return real;
    const filler = [];
    for (let index = real.length; index < TARGET; index++) {
      filler.push({
        index,
        userSignal: {
          kind: "text",
          text: `[mock] turn ${index + 1} user 提示 — 这是为了 QA 压缩模式生成的占位文本.`,
        },
        agentSignal: {
          kind: "text",
          text: `[mock] turn ${index + 1} assistant 回复 — 压缩模式下 tick 间距收缩, 命中靠 y-ratio.`,
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
  reactExports.useEffect(
    () => clearHighlightSchedules,
    [clearHighlightSchedules],
  );
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
        const root = scrollRef.current;
        if (!root) return;
        const target = root.querySelector(`[data-index="${turnIndex}"]`);
        if (target) {
          target.classList.add("chat-turn-highlight");
          highlightTimerRef.current = setTimeout(() => {
            target.classList.remove("chat-turn-highlight");
            highlightTimerRef.current = null;
          }, 800);
          return;
        }
        if (framesLeft <= 0) return;
        highlightRafRef.current = requestAnimationFrame(() =>
          tryHighlight(framesLeft - 1),
        );
      };
      highlightRafRef.current = requestAnimationFrame(() =>
        tryHighlight(MAX_RETRY_FRAMES),
      );
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
                      latestAssistantActionTurnIndex={
                        latestAssistantActionTurnIndex
                      }
                      feedbackSessionId={feedbackSessionId}
                      feedbackWorkspaceDir={feedbackWorkspaceDir}
                      feedbackWorkspaceId={feedbackWorkspaceId}
                      lastMessageId={lastMessageId}
                      focusedSessionId={focusedSessionId}
                      busy={busy}
                      showBusyTip={
                        shouldShowBusyTip &&
                        virtualTurn.index === turns.length - 1
                      }
                      busyLabel={
                        virtualTurn.index === turns.length - 1
                          ? busyLabel
                          : void 0
                      }
                      showHiddenTools={showHiddenTools}
                      showTurnArtifacts={showTurnArtifacts}
                      turnTail={turnTailsByIndex
                        .get(virtualTurn.index)
                        ?.map((tail) => (
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
