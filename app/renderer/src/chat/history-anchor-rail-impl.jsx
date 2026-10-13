// history-anchor-rail-impl.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports, useTranslation } from "../vendor.js";

const MAX_VISIBLE_RAIL_TURNS = 50;

const RAIL_TICK_HEIGHT_PX = 10;

const RAIL_WINDOW_OVERSCAN_TURNS = 2;

const RAIL_VIEWPORT_HEIGHT_PX = MAX_VISIBLE_RAIL_TURNS * RAIL_TICK_HEIGHT_PX;

const PREVIEW_CARD_ESTIMATED_HEIGHT_PX = 140;

const PIANO_RADIUS = 2;

const RailTick = reactExports.memo(function RailTick({
  index,
  top: railTop,
  isPrimaryActive,
  isVisibleActive,
  hasHoveredMarker,
  pianoDistance,
  compact,
  onJumpToTurn,
}) {
  const { t: translate } = useTranslation();
  const handleClick = reactExports.useCallback(
    () => onJumpToTurn(index),
    [index, onJumpToTurn],
  );
  const ariaLabel = translate("chat.historyRail.turn", "对话 {{n}}", {
    n: index + 1,
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
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-current={isPrimaryActive ? "true" : void 0}
      data-turn-index={index}
      data-visible-active={isVisibleActive ? "true" : void 0}
      className="group absolute right-0 flex h-2.5 w-full shrink-0 items-center justify-end cursor-pointer"
      style={{
        top: `${railTop}px`,
      }}
    >
      <span
        className={`block h-[2.5px] transition-all duration-150 ease-out ${widthClass} ${colorClass}`}
      />
    </button>
  );
});

RailTick.displayName = "RailTick";

function formatAttachmentSummary(attachmentSummary, translate) {
  if (attachmentSummary.kind === "single") return attachmentSummary.filename;
  if (attachmentSummary.kind === "sameType") {
    return translate(`chat.historyRail.attachmentCount.${attachmentSummary.type}`, {
      defaultValue: `${attachmentSummary.count} 个附件`,
      count: attachmentSummary.count,
    });
  }
  return translate("chat.historyRail.attachmentCount.mixed", {
    defaultValue: `${attachmentSummary.count} 个附件`,
    count: attachmentSummary.count,
  });
}

function UserSignalRow({ signal, t: translate }) {
  if (signal.kind === "text") {
    return (
      <div>
        <div className="text-sm font-semibold text-foreground leading-snug line-clamp-3 break-words">
          {signal.text}
        </div>
        {signal.attachments && (
          <div className="mt-0.5 text-caption-10 text-muted-foreground truncate">
            {formatAttachmentSummary(signal.attachments, translate)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
      {formatAttachmentSummary(signal.attachments, translate)}
    </div>
  );
}

function AgentSignalRow({ signal, t: translate }) {
  if (signal.kind === "text") {
    return (
      <div className="text-xs text-muted-foreground leading-snug line-clamp-3 break-words">
        {signal.text}
      </div>
    );
  }
  if (signal.kind === "subAgent") {
    const roleLabel = translate(`chat.historyRail.agentRole.${signal.role}`, {
      defaultValue: signal.role,
    });
    const primary = translate("chat.historyRail.subAgentProcessing", {
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
      {translate("chat.historyRail.toolCall", {
        defaultValue: "调用了 {{tool}}",
        tool: signal.toolName,
      })}
    </div>
  );
}

const PreviewCard = reactExports.memo(function PreviewCard({
  userSignal,
  agentSignal,
  topStyle,
  compact,
}) {
  const { t: translate } = useTranslation();
  return (
    <div
      style={topStyle}
      data-action-ui-id="chat-history-rail-preview"
      className={`elevated-surface-border pointer-events-none absolute right-full mr-2 rounded-lg bg-popover shadow-lg text-popover-foreground p-3 space-y-1.5 ${compact ? "w-56 -translate-y-1/2" : "w-64 max-w-[320px]"}`}
      role="tooltip"
    >
      {userSignal && <UserSignalRow signal={userSignal} t={translate} />}
      {agentSignal && <AgentSignalRow signal={agentSignal} t={translate} />}
    </div>
  );
});

PreviewCard.displayName = "PreviewCard";

const HistoryAnchorRailImpl = ({
  turns,
  activeIndex,
  activeIndexes = [activeIndex],
  onJumpToTurn,
  compact = false,
}) => {
  const { t: translate } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = reactExports.useState(null);
  const [hoverYInNav, setHoverYInNav] = reactExports.useState(-1);
  const [railScrollTop, setRailScrollTop] = reactExports.useState(0);
  const navRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const rafIdRef = reactExports.useRef(null);
  const turnsRef = reactExports.useRef(turns);
  turnsRef.current = turns;
  const ariaLabel = translate("chat.historyRail.label", "对话锚点");
  const activeIndexSet = reactExports.useMemo(
    () => new Set(activeIndexes),
    [activeIndexes],
  );
  const turnByIndex = reactExports.useMemo(
    () => new Map(turns.map((turn) => [turn.index, turn])),
    [turns],
  );
  const turnPositionByIndex = reactExports.useMemo(
    () => new Map(turns.map((turn, position) => [turn.index, position])),
    [turns],
  );
  const totalRailHeight = turns.length * RAIL_TICK_HEIGHT_PX;
  const railViewportHeight = Math.min(totalRailHeight, RAIL_VIEWPORT_HEIGHT_PX);
  const visibleTurns = reactExports.useMemo(() => {
    const firstVisiblePosition = Math.floor(
      railScrollTop / RAIL_TICK_HEIGHT_PX,
    );
    const start = Math.max(
      0,
      firstVisiblePosition - RAIL_WINDOW_OVERSCAN_TURNS,
    );
    const end = Math.min(
      turns.length,
      Math.ceil((railScrollTop + railViewportHeight) / RAIL_TICK_HEIGHT_PX) +
        RAIL_WINDOW_OVERSCAN_TURNS,
    );
    return turns.slice(start, end).map((turn, offset) => ({
      position: start + offset,
      turn,
    }));
  }, [railScrollTop, railViewportHeight, turns]);
  const hoveredTurn = reactExports.useMemo(
    () =>
      hoveredIndex != null ? (turnByIndex.get(hoveredIndex) ?? null) : null,
    [hoveredIndex, turnByIndex],
  );
  const previewUserSignal = hoveredTurn?.userSignal ?? null;
  const previewAgentSignal = compact
    ? null
    : (hoveredTurn?.agentSignal ?? null);
  const handleMouseMove = reactExports.useCallback((mouseEvent) => {
    if (rafIdRef.current != null) return;
    const clientY = mouseEvent.clientY;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const nav = navRef.current;
      const list = listRef.current;
      if (!nav || !list) return;
      const navRect = nav.getBoundingClientRect();
      const yInNav = clientY - navRect.top;
      setHoverYInNav((prev) => (Math.abs(prev - yInNav) < 1 ? prev : yInNav));
      const currentTurns = turnsRef.current;
      if (currentTurns.length === 0) return;
      const listRect = list.getBoundingClientRect();
      const position = Math.max(
        0,
        Math.min(
          currentTurns.length - 1,
          Math.floor(
            (list.scrollTop + clientY - listRect.top) / RAIL_TICK_HEIGHT_PX,
          ),
        ),
      );
      const nextIndex = currentTurns[position]?.index;
      if (nextIndex == null) return;
      setHoveredIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    });
  }, []);
  const handleMouseLeave = reactExports.useCallback(() => {
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
    const list = listRef.current;
    const activePosition = turnPositionByIndex.get(activeIndex);
    if (!list || activePosition == null) return;
    const targetTop = activePosition * RAIL_TICK_HEIGHT_PX;
    const targetBottom = targetTop + RAIL_TICK_HEIGHT_PX;
    const viewportHeight = list.clientHeight || railViewportHeight;
    let nextScrollTop = list.scrollTop;
    if (targetTop < nextScrollTop) {
      nextScrollTop = targetTop;
    } else if (targetBottom > nextScrollTop + viewportHeight) {
      nextScrollTop = targetBottom - viewportHeight;
    }
    if (list.scrollTop !== nextScrollTop) list.scrollTop = nextScrollTop;
    setRailScrollTop((prev) => (prev === nextScrollTop ? prev : nextScrollTop));
  }, [activeIndex, railViewportHeight, turnPositionByIndex]);
  const previewTopStyle = reactExports.useMemo(() => {
    if (hoverYInNav < 0) return void 0;
    if (compact)
      return {
        top: `${hoverYInNav}px`,
      };
    const nav = navRef.current;
    const navH = nav?.clientHeight ?? 0;
    if (navH <= 0)
      return {
        top: 0,
      };
    const ideal = hoverYInNav - PREVIEW_CARD_ESTIMATED_HEIGHT_PX / 2;
    const clamped = Math.max(
      0,
      Math.min(navH - PREVIEW_CARD_ESTIMATED_HEIGHT_PX, ideal),
    );
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
          {visibleTurns.map(({ position, turn }) => {
            const rawDistance =
              hoveredIndex != null
                ? Math.abs(turn.index - hoveredIndex)
                : Number.POSITIVE_INFINITY;
            const pianoDistance =
              rawDistance > PIANO_RADIUS
                ? Number.POSITIVE_INFINITY
                : rawDistance;
            return (
              <RailTick
                key={turn.index}
                index={turn.index}
                top={position * RAIL_TICK_HEIGHT_PX}
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

export const HistoryAnchorRail = reactExports.memo(HistoryAnchorRailImpl);

HistoryAnchorRail.displayName = "HistoryAnchorRail";
