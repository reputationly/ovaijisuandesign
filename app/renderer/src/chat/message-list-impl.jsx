// message-list-impl.jsx
import {
  BottomAnchorButton,
  ChatPresentationProvider,
  collectAssistantCopyText,
} from "./use-copy.jsx";
import { reactExports, useVirtualizer } from "../vendor.js";
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
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";

function attachmentTypeKey(type2) {
  if (type2 === "image") return "image";
  if (type2 === "video") return "video";
  if (type2 === "audio") return "audio";
  return "file";
}

function summarizeAttachments(attachments) {
  if (!attachments || attachments.length === 0) return void 0;
  if (attachments.length === 1) {
    const a2 = attachments[0];
    if (!a2) return void 0;
    const filename = a2.path.split("/").pop() || a2.path;
    return {
      kind: "single",
      filename,
    };
  }
  const firstType = attachmentTypeKey(attachments[0]?.type ?? "file");
  const allSameType = attachments.every(
    (a2) => attachmentTypeKey(a2.type) === firstType,
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
  const text2 = user.content?.trim() ?? "";
  const attachments = summarizeAttachments(user.attachments);
  if (text2) {
    return {
      kind: "text",
      text: text2,
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
    (m3) =>
      (m3.type === "text" || m3.type === "thinking") &&
      typeof m3.content === "string",
  );
  const textContent = textMsg?.content?.trim();
  if (textContent) {
    return {
      kind: "text",
      text: textContent,
    };
  }
  const subAgent = flat.find((m3) => m3.type === "sub_agent");
  if (subAgent) {
    const role = subAgent.agent?.trim() || "agent";
    const subText = subAgent.content?.trim();
    return {
      kind: "subAgent",
      role,
      text: subText || void 0,
    };
  }
  const tool2 = flat.find((m3) => m3.type === "tool");
  if (tool2) {
    const toolName2 = tool2.toolName?.trim() || tool2.content?.trim() || "";
    if (toolName2)
      return {
        kind: "tool",
        toolName: toolName2,
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
      group.some((message2) => message2.id === messageId),
    );
  });
}

function groupTools(messages2) {
  const groups = [];
  for (const msg of messages2) {
    const last2 = groups[groups.length - 1];
    if (msg.type === "tool" && last2?.[0]?.type === "tool") {
      last2.push(msg);
    } else {
      groups.push([msg]);
    }
  }
  return groups;
}

function groupIntoTurns(messages2) {
  const turns = [];
  let currentResponses = [];
  for (const msg of messages2) {
    if (msg.type === "text" && msg.role === "user") {
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
        user: msg,
        responses: [],
      });
    } else {
      currentResponses.push(msg);
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
  for (let index2 = turns.length - 1; index2 >= 0; index2 -= 1) {
    const turn = turns[index2];
    if (!turn) continue;
    const isActiveTurn = index2 === turns.length - 1;
    if (isActiveTurn && activeTurnPending) continue;
    if (collectAssistantCopyText(turn.responses.flat())) return index2;
  }
  return -1;
}

function getTurnKey(turn, index2) {
  return (
    turn?.user?.id ??
    turn?.responses.find((group) => group[0])?.[0]?.id ??
    `turn-${index2}`
  );
}

function measureMessageTurnElement(element2, isPresented) {
  if (!isPresented) {
    return (
      MESSAGE_TURN_HEIGHT_CACHE.get(element2) ?? MESSAGE_TURN_ESTIMATED_HEIGHT
    );
  }
  const measured = Math.round(element2.getBoundingClientRect().height);
  if (measured > 0) {
    MESSAGE_TURN_HEIGHT_CACHE.set(element2, measured);
    return measured;
  }
  return (
    MESSAGE_TURN_HEIGHT_CACHE.get(element2) ?? MESSAGE_TURN_ESTIMATED_HEIGHT
  );
}

export function MessageListImpl({
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
          height:
            element2.clientHeight ||
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
  const [conversationTailHeight, setConversationTailHeight] =
    reactExports.useState(0);
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
