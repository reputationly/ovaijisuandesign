// streaming-label.jsx
import {
  ChevronDown,
  ChevronUp,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { parseTimelineOperations } from "../media-editing/parse-timeline-operations.js";
import { categorizeToolAction } from "../chat/has-structured-success-payload.js";
import { BrailleSpinner } from "../chat/chat-empty-state.jsx";
import { getToolDisplayLabel } from "../generation/use-tool-confirm-edit-state.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";

export function StreamingLabel({ msg }) {
  const { t: t2 } = useTranslation();
  const toolName2 = msg.type === "tool" ? msg.content : void 0;
  const timelineOperation =
    msg.type === "tool"
      ? parseTimelineOperations(msg.content, msg.toolArgs, msg.toolResult)[0]
      : void 0;
  const label = timelineOperation
    ? t2(timelineOperation.activeLabelKey ?? timelineOperation.labelKey)
    : toolName2
      ? categorizeToolAction(toolName2) === "search"
        ? t2("chat.activity.search.running", "Searching...")
        : getToolDisplayLabel(toolName2, t2)
      : t2("chat.thinking");
  return (
    <span className="inline-flex items-center gap-1.5">
      <BrailleSpinner type="braille" className="text-xs text-tertiary" />
      <span className="text-shimmer text-muted-foreground">{label}</span>
      {timelineOperation?.inputSummary && (
        <span className="max-w-[200px] truncate rounded-sm bg-foreground/[0.06] px-1.5 py-0.5 text-caption-11 text-muted-foreground">
          {timelineOperation.inputSummary}
        </span>
      )}
    </span>
  );
}

export function useSettledCollapse(resolved) {
  const [expanded, setExpanded] = reactExports.useState(() => !resolved);
  const prevResolved = reactExports.useRef(resolved);
  reactExports.useEffect(() => {
    if (!prevResolved.current && resolved) setExpanded(false);
    prevResolved.current = resolved;
  }, [resolved]);
  return {
    collapsed: resolved && !expanded,
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
  };
}

export function CollapsedSettledRow({
  icon,
  title,
  summary,
  onExpand,
  actionUiId,
}) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={t2("chat.expand", "Expand")}
      aria-expanded={false}
      data-action-ui-id={actionUiId}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-left hover:bg-muted/40"
    >
      <Icon
        icon={icon}
        size="sm"
        strokeWidth={1.5}
        className="shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        <span>{title}</span>
        {summary && <span aria-hidden={true}>{" · "}</span>}
        {summary && <span>{summary}</span>}
      </span>
      <Icon
        icon={ChevronDown}
        size="sm"
        strokeWidth={1.5}
        className="shrink-0 text-muted-foreground"
      />
    </button>
  );
}

export function CollapseSettledButton({ onCollapse }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      onClick={onCollapse}
      aria-label={t2("chat.collapse", "Collapse")}
      aria-expanded={true}
      className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    >
      <Icon icon={ChevronUp} size="sm" strokeWidth={1.5} />
    </button>
  );
}

function formatCreditCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useCreditCountdown(expiresAt, active2) {
  const [nowMs, setNowMs] = reactExports.useState(() => Date.now());
  reactExports.useEffect(() => {
    if (!active2 || expiresAt === void 0) return;
    const timer2 = setInterval(() => setNowMs(Date.now()), 1e3);
    return () => clearInterval(timer2);
  }, [active2, expiresAt]);
  return expiresAt !== void 0 && active2
    ? formatCreditCountdown(expiresAt - nowMs)
    : void 0;
}
