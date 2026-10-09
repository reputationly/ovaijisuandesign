// activity-group.jsx
import {
  ChevronRight$1 as ChevronRight,
  Globe,
  reactExports,
  useTranslation,
  Wrench,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CATEGORY_I18N,
  CATEGORY_RUNNING_I18N,
  getStreamingAction,
} from "../media-editing/turn-artifact-strip.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { Spinner } from "./use-team-transactions-feed-query.jsx";
import { isTransientTool } from "../generation/use-tool-confirm-edit-state.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { StreamingLabel } from "./streaming-label.jsx";
import {
  DEBUG_FLAGS,
  useDebugFlag,
} from "../workspace/use-deep-link-router.js";
import { mergeIntoTimelineEntries } from "../media-editing/merge-into-timeline-entries.js";
import { parseJsonRecord } from "../media-editing/unwrap-mcp-json-record.js";
import { categorizeToolAction } from "../chat/has-structured-success-payload.js";
import { TimelineItem } from "../media-editing/timeline-item.jsx";
function BrowserOpenCard({ onContinue }) {
  const { t: t2 } = useTranslation();
  const [opening2, setOpening] = reactExports.useState(false);
  const [opened, setOpened] = reactExports.useState(false);
  const openBrowser = () => {
    if (opening2 || opened) return;
    setOpening(true);
    let settled = false;
    let fallbackTimer;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("hilo:browser-surface-ready", finish);
      if (fallbackTimer !== void 0) window.clearTimeout(fallbackTimer);
      setOpening(false);
      setOpened(true);
      onContinue?.();
    };
    window.addEventListener("hilo:browser-surface-ready", finish, {
      once: true,
    });
    window.dispatchEvent(new CustomEvent("hilo:open-browser"));
    fallbackTimer = window.setTimeout(finish, 3e3);
  };
  return (
    <div className="flex max-w-md items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      <Icon icon={Globe} size="md" className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">
          {t2("chat.browser.openRequired", "需要开启内置浏览器")}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {t2(
            "chat.browser.openRequiredDescription",
            "Agent 需要使用内置浏览器完成此任务。",
          )}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={opening2 || opened}
        onClick={openBrowser}
      >
        {opening2
          ? t2("chat.browser.opening", "正在开启…")
          : opened
            ? t2("chat.browser.opened", "已开启")
            : t2("chat.browser.open", "开启浏览器")}
      </Button>
    </div>
  );
}
const GROUPABLE_CATEGORIES = new Set([
  "read",
  "analyseMedia",
  "search",
  "execute",
  "skillOp",
  "process",
  "connector",
  "other",
]);
function groupTimelineEntries(entries2) {
  const units = [];
  let pending2 = [];
  const flush2 = () => {
    if (pending2.length === 1)
      units.push({
        kind: "standalone",
        entry: pending2[0],
      });
    else if (pending2.length > 1)
      units.push({
        kind: "tool-group",
        entries: pending2,
      });
    pending2 = [];
  };
  for (const entry of entries2) {
    if (
      entry.type === "tool" &&
      GROUPABLE_CATEGORIES.has(entry.category) &&
      entry.toolName !== "hub_run_comfyui_workflow" &&
      entry.toolName !== "hub_capability_search" &&
      !isTransientTool(entry.toolName) &&
      entry.toolStatus !== "error" &&
      !entry.pendingConfirm &&
      !entry.rejectedConfirm &&
      !entry.interruption
    ) {
      pending2.push(entry);
    } else {
      flush2();
      units.push({
        kind: "standalone",
        entry,
      });
    }
  }
  flush2();
  return units;
}
function summarizeTimelineEntries(entries2) {
  const counts = new Map();
  for (const entry of entries2) {
    const count2 =
      entry.aggregatedFiles?.length ??
      entry.aggregatedSearchChips?.length ??
      entry.aggregatedCount ??
      1;
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + count2);
  }
  return Array.from(counts, ([category, count2]) => ({
    category,
    count: count2,
  }));
}
function ToolActivityDisclosure({
  entries: entries2,
  isActive: isActive2,
  keepExpanded,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const contentId = reactExports.useId();
  const [userExpanded, setUserExpanded] = reactExports.useState(null);
  const expanded = userExpanded ?? (keepExpanded || isActive2);
  const summary = summarizeTimelineEntries(entries2)
    .map(({ category, count: count2 }) => {
      const inFlight = entries2.some(
        (entry) =>
          entry.category === category &&
          (entry.toolStatus === "running" || entry.toolStatus === "pending"),
      );
      const key2 =
        (inFlight && CATEGORY_RUNNING_I18N[category]) ||
        CATEGORY_I18N[category];
      return t2(key2, {
        count: count2,
      });
    })
    .join(" · ");
  const handleToggle = () => setUserExpanded(!expanded);
  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-action-ui-id="chat-tool-activity-group"
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-fit max-w-full justify-start gap-1.5 px-0 py-0 font-normal text-muted-foreground hover:bg-transparent aria-expanded:bg-transparent aria-expanded:text-muted-foreground"
        data-action-ui-id="chat-tool-activity-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={summary}
        aria-busy={isActive2}
        onClick={handleToggle}
        title={summary}
      >
        {isActive2 ? (
          <Spinner className="size-4 text-tertiary" />
        ) : (
          <Wrench className="size-4" strokeWidth={1.5} />
        )}
        <span className="min-w-0 truncate text-body-14">{summary}</span>
        <ChevronRight
          className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          strokeWidth={1.5}
        />
      </Button>
      <div id={contentId} hidden={!expanded}>
        <div className="flex min-w-0 flex-col gap-2 pl-5">{children2}</div>
      </div>
    </div>
  );
}
const CATEGORIES_WITH_INLINE_PROGRESS = new Set([
  "analyseMedia",
  "canvas",
  "connector",
  "plan",
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);
function isTimelineEntryActive(entry, latestEntry, isStreaming) {
  if (!isStreaming) return false;
  if (
    entry.type === "tool" &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending")
  ) {
    return true;
  }
  return (
    entry === latestEntry &&
    (entry.type === "thinking" || isTransientTool(entry.toolName))
  );
}
export function ActivityGroup({
  data: data2,
  isStreaming,
  onSend,
  focusedSessionId,
  showRail = true,
  showThinking = true,
  showThinkingSummary = true,
  showStreamingLabel = true,
  keepLatestToolActive = false,
  treatHubReadAsThinking = false,
  hideSearchTimeline = false,
  defaultDetailExpanded = false,
  collapseTools = false,
  keepToolsExpanded = false,
}) {
  const { items } = data2;
  const { t: t2 } = useTranslation();
  const rawToolView = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const displayItems =
    treatHubReadAsThinking && !rawToolView
      ? items.map((item) =>
          item.type === "tool" && item.content === "hub_read"
            ? {
                ...item,
                type: "thinking",
                content: "",
              }
            : item,
        )
      : items;
  const latestItem = displayItems[displayItems.length - 1];
  const streamingAction = isStreaming
    ? (getStreamingAction(displayItems) ??
      (keepLatestToolActive && latestItem?.type === "tool"
        ? latestItem
        : void 0))
    : void 0;
  const streamingActionCategory =
    streamingAction?.type === "tool"
      ? categorizeToolAction(streamingAction.content)
      : void 0;
  const streamingActionHasInlineProgress =
    streamingActionCategory != null &&
    CATEGORIES_WITH_INLINE_PROGRESS.has(streamingActionCategory);
  const streamingActionIsTransient =
    streamingAction?.type === "tool" &&
    isTransientTool(streamingAction.content);
  const useToolGroups = collapseTools && !rawToolView;
  const timelineEntries = mergeIntoTimelineEntries(displayItems, {
    raw: rawToolView,
    legacyMediaReconciliationApplied: data2.legacyMediaReconciliationApplied,
  }).filter((entry, index2, entries2) => {
    if (entry.type === "thinking") {
      return showThinking && (!useToolGroups || index2 === entries2.length - 1);
    }
    if (
      hideSearchTimeline &&
      entry.category === "search" &&
      entry.toolStatus !== "error" &&
      !rawToolView
    ) {
      return false;
    }
    return true;
  });
  const latestTimelineEntry = timelineEntries[timelineEntries.length - 1];
  const units = useToolGroups
    ? groupTimelineEntries(timelineEntries)
    : timelineEntries.map((entry) => ({
        kind: "standalone",
        entry,
      }));
  const renderEntry = (entry) => {
    let requiresBrowser = false;
    if (
      entry.type === "tool" &&
      (entry.toolName === "browser" || entry.toolName === "hub_browser")
    ) {
      const result = parseJsonRecord(entry.toolResult);
      requiresBrowser = result?.error_code === "BROWSER_SURFACE_REQUIRED";
    }
    return requiresBrowser && entry === latestTimelineEntry ? (
      <BrowserOpenCard
        key={entry.id}
        onContinue={() => {
          if (!focusedSessionId) return;
          onSend?.({
            type: "message",
            content: t2(
              "chat.browser.continueMessage",
              "内置浏览器已打开，请继续刚才的网页任务，仍然使用内置浏览器完成，不要更换来源。",
            ),
            agent_type: "general",
            delivery: "defer_if_busy",
            session_id: focusedSessionId,
            client_message_id:
              globalThis.crypto?.randomUUID?.() ?? `browser-${Date.now()}`,
          });
        }}
      />
    ) : (
      <TimelineItem
        key={entry.id}
        entry={entry}
        onSend={onSend}
        isActive={isTimelineEntryActive(
          entry,
          latestTimelineEntry,
          isStreaming,
        )}
        showDetailRail={showRail}
        showThinkingSummary={showThinkingSummary}
        defaultDetailExpanded={defaultDetailExpanded}
      />
    );
  };
  if (timelineEntries.length === 0 && !streamingAction) {
    return null;
  }
  return (
    <div className="min-w-0 relative flex flex-col gap-2">
      {showStreamingLabel &&
        isStreaming &&
        streamingAction &&
        !streamingActionHasInlineProgress &&
        !streamingActionIsTransient && (
          <div className="flex items-center gap-2 text-body-14 text-muted-foreground">
            <StreamingLabel msg={streamingAction} />
          </div>
        )}
      {units.map((unit, index2) =>
        unit.kind === "standalone" ? (
          renderEntry(unit.entry)
        ) : (
          <ToolActivityDisclosure
            key={unit.entries[0].id}
            entries={unit.entries}
            keepExpanded={keepToolsExpanded}
            isActive={
              isStreaming &&
              ((keepLatestToolActive && index2 === units.length - 1) ||
                unit.entries.some(
                  (entry) =>
                    entry.toolStatus === "running" ||
                    entry.toolStatus === "pending",
                ))
            }
          >
            {unit.entries.map(renderEntry)}
          </ToolActivityDisclosure>
        ),
      )}
    </div>
  );
}
