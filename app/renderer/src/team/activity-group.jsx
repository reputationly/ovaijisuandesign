// activity-group.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight$1 as ChevronRight, Globe, Wrench } from "../media-editing/lucide-icon-wraps.js";
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
  const { t } = useTranslation();
  const [opening, setOpening] = reactExports.useState(false);
  const [opened, setOpened] = reactExports.useState(false);
  const openBrowser = () => {
    if (opening || opened) return;
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
          {t("chat.browser.openRequired", "需要开启内置浏览器")}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {t(
            "chat.browser.openRequiredDescription",
            "Agent 需要使用内置浏览器完成此任务。",
          )}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={opening || opened}
        onClick={openBrowser}
      >
        {opening
          ? t("chat.browser.opening", "正在开启…")
          : opened
            ? t("chat.browser.opened", "已开启")
            : t("chat.browser.open", "开启浏览器")}
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
function groupTimelineEntries(entries) {
  const units = [];
  let pending = [];
  const flush = () => {
    if (pending.length === 1)
      units.push({
        kind: "standalone",
        entry: pending[0],
      });
    else if (pending.length > 1)
      units.push({
        kind: "tool-group",
        entries: pending,
      });
    pending = [];
  };
  for (const entry of entries) {
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
      pending.push(entry);
    } else {
      flush();
      units.push({
        kind: "standalone",
        entry,
      });
    }
  }
  flush();
  return units;
}
function summarizeTimelineEntries(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const count =
      entry.aggregatedFiles?.length ??
      entry.aggregatedSearchChips?.length ??
      entry.aggregatedCount ??
      1;
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + count);
  }
  return Array.from(counts, ([category, count]) => ({
    category,
    count,
  }));
}
function ToolActivityDisclosure({
  entries,
  isActive,
  keepExpanded,
  children,
}) {
  const { t } = useTranslation();
  const contentId = reactExports.useId();
  const [userExpanded, setUserExpanded] = reactExports.useState(null);
  const expanded = userExpanded ?? (keepExpanded || isActive);
  const summary = summarizeTimelineEntries(entries)
    .map(({ category, count }) => {
      const inFlight = entries.some(
        (entry) =>
          entry.category === category &&
          (entry.toolStatus === "running" || entry.toolStatus === "pending"),
      );
      const key =
        (inFlight && CATEGORY_RUNNING_I18N[category]) ||
        CATEGORY_I18N[category];
      return t(key, {
        count,
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
        aria-busy={isActive}
        onClick={handleToggle}
        title={summary}
      >
        {isActive ? (
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
        <div className="flex min-w-0 flex-col gap-2 pl-5">{children}</div>
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
  data,
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
  const { items } = data;
  const { t } = useTranslation();
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
    legacyMediaReconciliationApplied: data.legacyMediaReconciliationApplied,
  }).filter((entry, index, entries) => {
    if (entry.type === "thinking") {
      return showThinking && (!useToolGroups || index === entries.length - 1);
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
            content: t(
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
      {units.map((unit, index) =>
        unit.kind === "standalone" ? (
          renderEntry(unit.entry)
        ) : (
          <ToolActivityDisclosure
            key={unit.entries[0].id}
            entries={unit.entries}
            keepExpanded={keepToolsExpanded}
            isActive={
              isStreaming &&
              ((keepLatestToolActive && index === units.length - 1) ||
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
