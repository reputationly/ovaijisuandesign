// history-anchor-rail-impl.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports, useTranslation } from "../vendor.js";

const MAX_VISIBLE_RAIL_TURNS = 50;

const RAIL_TICK_HEIGHT_PX = 10;

const RAIL_WINDOW_OVERSCAN_TURNS = 2;

const RAIL_VIEWPORT_HEIGHT_PX = MAX_VISIBLE_RAIL_TURNS * RAIL_TICK_HEIGHT_PX;

const PREVIEW_CARD_ESTIMATED_HEIGHT_PX = 140;

const PIANO_RADIUS = 2;

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
  const handleClick2 = reactExports.useCallback(
    () => onJumpToTurn(index2),
    [index2, onJumpToTurn],
  );
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
  const activeIndexSet = reactExports.useMemo(
    () => new Set(activeIndexes),
    [activeIndexes],
  );
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
    const firstVisiblePosition = Math.floor(
      railScrollTop / RAIL_TICK_HEIGHT_PX,
    );
    const start2 = Math.max(
      0,
      firstVisiblePosition - RAIL_WINDOW_OVERSCAN_TURNS,
    );
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
    () =>
      hoveredIndex != null ? (turnByIndex.get(hoveredIndex) ?? null) : null,
    [hoveredIndex, turnByIndex],
  );
  const previewUserSignal = hoveredTurn?.userSignal ?? null;
  const previewAgentSignal = compact
    ? null
    : (hoveredTurn?.agentSignal ?? null);
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
          Math.floor(
            (list2.scrollTop + clientY - listRect.top) / RAIL_TICK_HEIGHT_PX,
          ),
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

export const HistoryAnchorRail = reactExports.memo(HistoryAnchorRailImpl);

HistoryAnchorRail.displayName = "HistoryAnchorRail";
