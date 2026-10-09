// credit-threshold-reminder-card.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  useCurrentWorkspace,
  dedupedToast,
  Tooltip,
  TooltipTrigger,
  Check,
  ChevronDown,
  usePlatform,
  openExternalUrl,
  useResolveMediaUrl,
  withThumbnail,
  workspaceEvents,
  getNodeIdsForAsset,
  ContextMenu,
  ExternalLink,
  Copy,
  Icon,
  CircleAlert,
  ChevronUp,
  Paperclip,
  KeyRound,
  AlertCircle,
  Zap,
  useDebugFlag,
  DEBUG_FLAGS,
  categorizeToolAction,
  mergeIntoTimelineEntries,
  parseJsonRecord,
  parseTimelineOperations,
  useOptionalTeamAccount,
  Ban,
  LoaderCircle,
  useAccountSubmissionDecision,
  guardAccountSubmission,
  ErrorCodes,
  CreditCard,
  ShieldAlert,
  WifiOff,
  ServerOff,
  Upload,
  classifyRawErrorText,
  useNativeViewOcclusion,
  Save,
  ShieldOff,
} from "../vendor.js";
import {
  TooltipContent,
  cn$2,
  Button$1,
  Checkbox,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { QuestionPromptIcon } from "../m08/browser-inspiration-urls.jsx";
import { useMpSubscriptionWalletQuery, useMpSubscribeUrl } from "../m09/use-credit-details.jsx";
import { INSUFFICIENT_BALANCE_TEXT_PATTERN } from "../m01/text-models.js";
import { useAssets, useMediaActions } from "../m10/use-media-actions.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../m10/new-workspace-dialog.jsx";
import { FeedbackButton } from "../m09/feedback-dialog.jsx";
import { inferArtifactMime } from "../m10/topbar-provider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioArtifactChip } from "./domestic-param-labels.jsx";
import { BrailleSpinner } from "./empty-chat-recommendations.jsx";
import { BrowserOpenCard, ErrorBlock, groupTimelineEntries } from "./expandable-text.jsx";
import { findAssetForPath, toWorkspaceRelativePath$1 } from "./markdown-audio.jsx";
import { getToolDisplayLabel, isTransientTool } from "./media-model-selector.jsx";
import { TimelineItem, ToolActivityDisclosure, getStreamingAction } from "./parse-batch-items.jsx";
import {
  redactForCurrentRegion,
  resolveModelNameForCurrentRegion,
} from "./resolve-chat-file-reference.js";
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
  if (entry.type === "tool" && (entry.toolStatus === "running" || entry.toolStatus === "pending")) {
    return true;
  }
  return entry === latestEntry && (entry.type === "thinking" || isTransientTool(entry.toolName));
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
      (keepLatestToolActive && latestItem?.type === "tool" ? latestItem : void 0))
    : void 0;
  const streamingActionCategory =
    streamingAction?.type === "tool" ? categorizeToolAction(streamingAction.content) : void 0;
  const streamingActionHasInlineProgress =
    streamingActionCategory != null && CATEGORIES_WITH_INLINE_PROGRESS.has(streamingActionCategory);
  const streamingActionIsTransient =
    streamingAction?.type === "tool" && isTransientTool(streamingAction.content);
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
            client_message_id: globalThis.crypto?.randomUUID?.() ?? `browser-${Date.now()}`,
          });
        }}
      />
    ) : (
      <TimelineItem
        key={entry.id}
        entry={entry}
        onSend={onSend}
        isActive={isTimelineEntryActive(entry, latestTimelineEntry, isStreaming)}
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
                  (entry) => entry.toolStatus === "running" || entry.toolStatus === "pending",
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
export function AudioMessage({ msg }) {
  const { t: t2 } = useTranslation();
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(msg.url) ?? msg.content;
  if (!src) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t2("chat.failedToLoadAudio")}
      </div>
    );
  }
  return <AudioArtifactChip src={src} originalSrc={msg.url ?? msg.content} />;
}
function useSettledCollapse(resolved) {
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
function CollapsedSettledRow({ icon, title, summary, onExpand, actionUiId }) {
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
      <Icon icon={icon} size="sm" strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
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
function CollapseSettledButton({ onCollapse }) {
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
function useCreditCountdown(expiresAt, active2) {
  const [nowMs, setNowMs] = reactExports.useState(() => Date.now());
  reactExports.useEffect(() => {
    if (!active2 || expiresAt === void 0) return;
    const timer2 = setInterval(() => setNowMs(Date.now()), 1e3);
    return () => clearInterval(timer2);
  }, [active2, expiresAt]);
  return expiresAt !== void 0 && active2 ? formatCreditCountdown(expiresAt - nowMs) : void 0;
}
function formatCredits$1(value) {
  return value?.toLocaleString();
}
export function BillingInsufficientCard({
  estimate,
  onRetry,
  expiresAt,
  resolved = false,
  settlementStatus,
  retryResetMs,
  refreshRevision,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const subscribeUrl = useMpSubscribeUrl();
  const isTeamContext = useOptionalTeamAccount()?.snapshot?.activeContext?.accountType === "TEAM";
  const { mpWallet, isLoading, isError, isRefetchError } = useMpSubscriptionWalletQuery();
  const walletReady =
    mpWallet?.subscription_state_known === true && !isLoading && !isError && !isRefetchError;
  const estimatedCredits = formatCredits$1(estimate?.estimatedCredits);
  const currentCredits = formatCredits$1(
    estimate?.currentCredits ?? (walletReady ? mpWallet.total_credit : void 0),
  );
  const shortfallCredits = formatCredits$1(estimate?.shortfallCredits);
  const [retryState, setRetryState] = reactExports.useState("idle");
  reactExports.useEffect(() => {
    if (retryState !== "submitted" || retryResetMs === void 0) return;
    const timer2 = setTimeout(() => setRetryState("idle"), retryResetMs);
    return () => clearTimeout(timer2);
  }, [retryState, retryResetMs]);
  const countdown = useCreditCountdown(expiresAt, !resolved);
  const topupContinued = resolved && settlementStatus === "continued";
  const settledSummary =
    settlementStatus === "continued"
      ? t2(
          "chat.creditReminder.topupContinued",
          "Credits have been added. This generation resumed automatically.",
        )
      : t2(
          "chat.creditReminder.topupExpired",
          "No top-up arrived in time. This generation has stopped.",
        );
  const title = topupContinued
    ? t2("chat.creditReminder.topupContinuedTitle", "Top-up successful. Generation is continuing.")
    : t2("chat.billingInsufficient.title");
  const { collapsed, expand, collapse } = useSettledCollapse(resolved);
  const [collapsedWaiting, setCollapsedWaiting] = reactExports.useState(false);
  const [notArrived, setNotArrived] = reactExports.useState(false);
  const lastRevisionRef = reactExports.useRef(refreshRevision);
  reactExports.useEffect(() => {
    if (refreshRevision === lastRevisionRef.current) return;
    lastRevisionRef.current = refreshRevision;
    if (resolved) return;
    setCollapsedWaiting(false);
    setNotArrived(true);
    setRetryState("idle");
  }, [refreshRevision, resolved]);
  const handleRetryAfterPurchase = () => {
    if (!onRetry || retryState === "submitted") return;
    const delivered = onRetry();
    setRetryState(delivered ? "submitted" : "failed");
    if (delivered) {
      setCollapsedWaiting(true);
      setNotArrived(false);
    }
  };
  const handleOpenPurchase = (source) => {
    if (!subscribeUrl) {
      dedupedToast.error(t2("credits.walletUrlNotReady"));
      return;
    }
    void openExternalUrl(platform2, subscribeUrl, {
      source: `chat.billing-insufficient.${source}`,
    });
  };
  if (collapsed) {
    return (
      <CollapsedSettledRow
        icon={CircleAlert}
        title={title}
        summary={topupContinued ? "" : settledSummary}
        onExpand={expand}
        actionUiId="chat.billing-insufficient-card.expand"
      />
    );
  }
  return (
    <section
      className="w-full rounded-lg border border-border bg-card p-4"
      aria-label={title}
      data-action-ui-id="chat.billing-insufficient-card"
    >
      <div className="flex items-center gap-2">
        <Icon icon={CircleAlert} size="lg" strokeWidth={1.5} className="text-foreground/70" />
        <h3 className="font-heading text-sm font-medium text-foreground">{title}</h3>
        {countdown && (
          <span
            className="ml-auto rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-xs text-foreground/70"
            aria-live="off"
          >
            {countdown}
          </span>
        )}
        {resolved && <CollapseSettledButton onCollapse={collapse} />}
      </div>
      {!resolved && !collapsedWaiting && (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2(
            isTeamContext
              ? "chat.billingInsufficient.teamDescription"
              : "chat.billingInsufficient.description",
          )}
        </p>
      )}
      {!topupContinued &&
        !collapsedWaiting &&
        (estimatedCredits || currentCredits || shortfallCredits) && (
          <dl className="mt-3 flex gap-2 rounded-md bg-secondary/60 px-3 py-2.5 text-xs [&>div]:min-w-0 [&>div]:flex-1">
            {estimatedCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.estimatedCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">{estimatedCredits}</dd>
              </div>
            )}
            {currentCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.currentCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">{currentCredits}</dd>
              </div>
            )}
            {shortfallCredits && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {t2("chat.billingInsufficient.shortfallCredits")}
                </dt>
                <dd className="mt-0.5 truncate text-foreground">{shortfallCredits}</dd>
              </div>
            )}
          </dl>
        )}
      {resolved ? (
        <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
          {settledSummary}
        </p>
      ) : collapsedWaiting ? (
        <div className="mt-4 flex items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground" aria-live="polite">
            {t2("chat.billingInsufficient.waitingCollapsed")}
          </p>
          <Button$1
            type="button"
            variant="outline"
            size="sm"
            disabled={retryState === "submitted"}
            onClick={handleRetryAfterPurchase}
            data-action-ui-id="chat.billing-insufficient.recheck-again"
          >
            {t2("chat.billingInsufficient.recheckAgain")}
          </Button$1>
        </div>
      ) : (
        <>
          {notArrived && (
            <p className="mt-3 text-xs text-muted-foreground" role="alert">
              {t2("chat.billingInsufficient.topupNotArrived")}
            </p>
          )}
          {!isTeamContext && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button$1
                type="button"
                size="lg"
                className="w-full"
                onClick={() => handleOpenPurchase("top-up")}
                data-action-ui-id="chat.billing-insufficient.top-up"
              >
                {t2("chat.billingInsufficient.topUp")}
              </Button$1>
              <Button$1
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handleOpenPurchase("upgrade")}
                data-action-ui-id="chat.billing-insufficient.upgrade"
              >
                {t2("chat.billingInsufficient.upgrade")}
              </Button$1>
            </div>
          )}
          {onRetry && (
            <>
              {retryState === "failed" && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {t2("chat.billingInsufficient.retryFailed")}
                </p>
              )}
              <Button$1
                type="button"
                variant="ghost"
                size="sm"
                className={cn$2("w-full text-foreground/70", isTeamContext ? "mt-4" : "mt-2")}
                onClick={handleRetryAfterPurchase}
                data-action-ui-id="chat.billing-insufficient.retry-after-purchase"
              >
                {t2("chat.billingInsufficient.retryAfterPurchase")}
              </Button$1>
            </>
          )}
        </>
      )}
    </section>
  );
}
const CANCELLED_MESSAGE_ICON_STROKE_WIDTH = 1.24;
export function CancelledMessage() {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 size-4 flex items-center justify-center text-muted-foreground">
        <Icon icon={Ban} size="md" strokeWidth={CANCELLED_MESSAGE_ICON_STROKE_WIDTH} />
      </span>
      <span className="min-w-0 text-body-14 text-muted-foreground font-normal truncate">
        {t2("chat.cancelled")}
      </span>
    </div>
  );
}
export function CompactionStatusMessage({ message: message2 }) {
  const { t: t2 } = useTranslation();
  const completed = message2.content === "compacted";
  return (
    <div
      data-action-ui-id="chat-compaction-status"
      className="flex min-w-0 items-center gap-2 py-1 text-body-14 text-muted-foreground"
    >
      {completed ? (
        <Check size={16} strokeWidth={1.5} className="shrink-0" />
      ) : (
        <LoaderCircle size={16} strokeWidth={1} className="shrink-0 animate-spin" />
      )}
      <span className="min-w-0 truncate">
        {t2(completed ? "chat.compaction.completed" : "chat.compaction.running")}
      </span>
    </div>
  );
}
export function ConfirmRequest({ msg, onSend }) {
  const { t: t2 } = useTranslation();
  const [choice, setChoice] = reactExports.useState(null);
  const resolved = msg.resolved || choice !== null;
  const handleRespond = (approved) => {
    if (!msg.requestId || !onSend) return;
    onSend({
      type: "user_reply",
      id: msg.requestId,
      content: approved ? "approved" : "rejected",
    });
    setChoice(approved ? "approved" : "rejected");
  };
  return (
    <div className="min-w-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-foreground mb-3 whitespace-pre-wrap">{msg.content}</p>
      {resolved ? (
        <p className="text-muted-foreground italic text-xs">
          {choice === "approved" ? t2("chat.approved") : t2("chat.rejected")}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-success text-white text-xs hover:bg-success/85 cursor-pointer"
            onClick={() => handleRespond(true)}
          >
            {t2("chat.approve")}
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90 cursor-pointer"
            onClick={() => handleRespond(false)}
          >
            {t2("chat.reject")}
          </button>
        </div>
      )}
    </div>
  );
}
function formatCredits(value) {
  return value?.toLocaleString();
}
function registryHintForMediaType(mediaType) {
  if (mediaType === "image" || mediaType === "video" || mediaType === "audio") return mediaType;
  if (
    mediaType === "music" ||
    mediaType === "speech" ||
    mediaType === "tts" ||
    mediaType === "voice"
  ) {
    return "audio";
  }
  return void 0;
}
function batchItemLabel(item) {
  return item.model
    ? resolveModelNameForCurrentRegion(item.model, registryHintForMediaType(item.mediaType))
    : item.mediaType;
}
export function CreditThresholdReminderCard({
  estimate,
  onCancel,
  onContinue,
  expiresAt,
  awaitSettlement = false,
  resolved: externallyResolved = false,
  decision,
  settlementStatus,
}) {
  const { t: t2 } = useTranslation();
  const [state2, setState] = reactExports.useState("pending");
  const [actionFailed, setActionFailed] = reactExports.useState(false);
  const [selectedItemIds, setSelectedItemIds] = reactExports.useState(() =>
    estimate.selectedItemIds
      ? [...estimate.selectedItemIds]
      : estimate.batchItems &&
          estimate.maxSelectableCredits !== void 0 &&
          estimate.estimatedCredits !== void 0 &&
          estimate.estimatedCredits <= estimate.maxSelectableCredits
        ? estimate.batchItems.map((item) => item.itemId)
        : [],
  );
  reactExports.useEffect(() => {
    if (externallyResolved && estimate.selectedItemIds) {
      setSelectedItemIds([...estimate.selectedItemIds]);
    }
  }, [estimate.selectedItemIds, externallyResolved]);
  const estimatedCredits = formatCredits(estimate.estimatedCredits);
  const thresholdCredits = formatCredits(estimate.thresholdCredits);
  const currentCredits = formatCredits(estimate.currentCredits);
  const remainingCredits = formatCredits(estimate.remainingCredits);
  const busy = state2 === "cancelling" || state2 === "continuing";
  const resolved = externallyResolved || state2 === "cancelled" || state2 === "continued";
  const countdown = useCreditCountdown(expiresAt, !resolved);
  const settlementExpired = settlementStatus === "expired";
  const settlementFailed =
    settlementStatus === "insufficient" || settlementStatus === "unavailable";
  const settledSummary = settlementExpired
    ? t2("chat.creditReminder.expired", "Confirmation timed out; this generation was cancelled.")
    : settlementFailed
      ? t2("chat.creditReminder.actionError", "Could not update this generation. Try again.")
      : decision === "continue" || state2 === "continued"
        ? t2("chat.creditReminder.continued", "Confirmed. Generation is continuing.")
        : t2("chat.creditReminder.cancelled", "Generation cancelled.");
  const { collapsed, expand, collapse } = useSettledCollapse(resolved);
  const selectedCredits = reactExports.useMemo(
    () =>
      (estimate.batchItems ?? [])
        .filter((item) => selectedItemIds.includes(item.itemId))
        .reduce((sum2, item) => sum2 + item.estimatedCredits, 0),
    [estimate.batchItems, selectedItemIds],
  );
  const isBatch = (estimate.batchItems?.length ?? 0) > 0;
  const showSelection = (estimate.batchItems?.length ?? 0) > 1;
  const selectionRequired =
    isBatch &&
    estimate.maxSelectableCredits !== void 0 &&
    (estimate.estimatedCredits ?? 0) > estimate.maxSelectableCredits;
  const selectionValid =
    !isBatch ||
    (selectedItemIds.length > 0 &&
      selectedCredits <= (estimate.maxSelectableCredits ?? Number.MAX_SAFE_INTEGER));
  const handleAction = async (nextState, resolvedState, action, selected2) => {
    if (busy || resolved) return;
    setActionFailed(false);
    setState(nextState);
    try {
      const accepted = await action(selected2);
      if (accepted === false) throw new Error("credit threshold reply was not sent");
      if (!awaitSettlement) setState(resolvedState);
    } catch {
      setActionFailed(true);
      setState("pending");
    }
  };
  if (collapsed) {
    return (
      <CollapsedSettledRow
        icon={CircleAlert}
        title={t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
        summary={settledSummary}
        onExpand={expand}
        actionUiId="chat.credit-threshold-card.expand"
      />
    );
  }
  return (
    <section
      className="w-full rounded-lg border border-border bg-card p-4"
      aria-label={t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
      data-action-ui-id="chat.credit-threshold-card"
    >
      <div className="flex items-center gap-2">
        <Icon icon={CircleAlert} size="lg" strokeWidth={1.5} className="text-foreground/70" />
        <h3 className="font-heading text-sm font-medium text-foreground">
          {t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
        </h3>
        {countdown && (
          <span
            className="ml-auto rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-xs text-foreground/80"
            aria-live="off"
          >
            {countdown}
          </span>
        )}
        {resolved && <CollapseSettledButton onCollapse={collapse} />}
      </div>
      {showSelection ? (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2("chat.creditReminder.batchDescription", {
            estimated: estimatedCredits ?? "-",
            defaultValue:
              "This generation is estimated to use {{estimated}} credits. Confirm what you want to generate (you can change the reminder threshold under “Agent Mode” in the input box).",
          })}
        </p>
      ) : estimatedCredits && thresholdCredits ? (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2("chat.creditReminder.cardDescription", {
            estimated: estimatedCredits,
            threshold: thresholdCredits,
            defaultValue:
              "This generation is estimated to use {{estimated}} credits, reaching your {{threshold}}-credit reminder.",
          })}
        </p>
      ) : (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2(
            "chat.creditReminder.cardDescriptionFallback",
            "This generation has reached your credit usage reminder.",
          )}
        </p>
      )}
      {showSelection && (
        <div className="mt-3 rounded-md border border-border/70 bg-secondary/40 p-2.5">
          <p className="text-xs font-medium text-foreground">
            {t2("chat.creditReminder.batchTitle", "Choose what to generate")}
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {estimate.batchItems?.map((item) => {
              const checked = selectedItemIds.includes(item.itemId);
              const itemFitsSelection =
                checked ||
                selectedCredits + item.estimatedCredits <=
                  (estimate.maxSelectableCredits ?? Number.MAX_SAFE_INTEGER);
              const rowText = item.prompt
                ? `${batchItemLabel(item)} · ${item.prompt}`
                : batchItemLabel(item);
              return (
                <label
                  key={item.itemId}
                  htmlFor={`credit-threshold-item-${item.itemId}`}
                  className="hilo-checkbox-label flex cursor-pointer items-center text-xs text-foreground"
                >
                  <Checkbox
                    id={`credit-threshold-item-${item.itemId}`}
                    checked={checked}
                    disabled={busy || resolved || !itemFitsSelection}
                    aria-label={batchItemLabel(item)}
                    onCheckedChange={() =>
                      setSelectedItemIds((current2) =>
                        checked
                          ? current2.filter((id2) => id2 !== item.itemId)
                          : [...current2, item.itemId],
                      )
                    }
                    data-action-ui-id={`chat.credit-threshold.item.${item.itemId}`}
                  />
                  {item.prompt ? (
                    <Tooltip>
                      <TooltipTrigger render={<span className="min-w-0 flex-1 truncate" />}>
                        {rowText}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm break-words">
                        {item.prompt}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{rowText}</span>
                  )}
                  <span className="text-muted-foreground">
                    {item.estimatedCredits.toLocaleString()}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t2("chat.creditReminder.batchSelectionSummary", {
              selected: selectedCredits.toLocaleString(),
              limit: estimate.maxSelectableCredits?.toLocaleString() ?? "-",
              defaultValue: "Selected {{selected}} credits of {{limit}} available.",
            })}
          </p>
        </div>
      )}
      {(currentCredits || remainingCredits) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-secondary/60 px-3 py-2.5 text-xs">
          {currentCredits && (
            <div>
              <dt className="text-muted-foreground">
                {t2("chat.creditReminder.currentCredits", "Current credits")}
              </dt>
              <dd className="mt-0.5 text-foreground">{currentCredits}</dd>
            </div>
          )}
          {remainingCredits && (
            <div>
              <dt className="text-muted-foreground">
                {t2("chat.creditReminder.remainingCredits", "Estimated remaining")}
              </dt>
              <dd className="mt-0.5 text-foreground">{remainingCredits}</dd>
            </div>
          )}
        </dl>
      )}
      {actionFailed && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {t2("chat.creditReminder.actionError", "Could not update this generation. Try again.")}
        </p>
      )}
      {resolved ? (
        <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
          {settledSummary}
        </p>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <Button$1
            type="button"
            variant="outline"
            size="sm"
            loading={state2 === "cancelling"}
            disabled={busy}
            onClick={() => void handleAction("cancelling", "cancelled", onCancel)}
            data-action-ui-id="chat.credit-threshold.cancel"
          >
            {t2("chat.creditReminder.cancelGeneration", "Cancel generation")}
          </Button$1>
          <Button$1
            type="button"
            size="sm"
            loading={state2 === "continuing"}
            disabled={
              busy || !selectionValid || (selectionRequired && selectedItemIds.length === 0)
            }
            onClick={() =>
              void handleAction("continuing", "continued", onContinue, selectedItemIds)
            }
            data-action-ui-id="chat.credit-threshold.continue"
          >
            {t2("chat.creditReminder.continueGeneration", "Continue generation")}
          </Button$1>
        </div>
      )}
    </section>
  );
}
function ChatErrorActionButton({ action, label }) {
  const platform2 = usePlatform();
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const handleClick2 = () => {
    if (action.kind === "external-link") {
      const decision = guardAccountSubmission("personal_checkout");
      if (!decision.allowed) return;
      void openExternalUrl(platform2, action.url, {
        source: "chat.error-action",
      });
    }
  };
  return (
    <Button$1
      variant="outline"
      size="xs"
      disabled={!checkoutDecision.allowed}
      title={checkoutDecision.allowed ? void 0 : checkoutDecision.reasonCode}
      onClick={handleClick2}
    >
      {label}
      <ExternalLink data-icon="inline-end" />
    </Button$1>
  );
}
const errorActionRules = [
  {
    match: isInsufficientBalanceError,
    derive: (_msg, options) => {
      if (!options.subscribeUrl) {
        return {
          actions: [],
          showFeedback: false,
        };
      }
      return {
        actions: [
          {
            id: "top-up",
            kind: "external-link",
            labelKey: "credits.topUp",
            url: options.subscribeUrl,
          },
        ],
        showFeedback: false,
      };
    },
  },
  {
    // AUTH_EXPIRED — token 过期需要重新登录，属于用户态问题，
    // 不属于产品 bug；反馈数据无价值。重新登录流程由 main/auth 模块独立触发。
    match: isAuthExpiredError,
    derive: () => ({
      actions: [],
      showFeedback: false,
    }),
  },
];
function getChatErrorActions(msg, options) {
  const rule = errorActionRules.find((r2) => r2.match(msg));
  if (rule) return rule.derive(msg, options);
  return {
    actions: [],
    showFeedback: !(msg.error?.retryable ?? false),
  };
}
function isInsufficientBalanceError(msg) {
  if (
    msg.error?.error_code === ErrorCodes.MODEL_PROVIDER_ERROR ||
    msg.error?.error_code === ErrorCodes.MODEL_PROVIDER_AUTH_FAILED
  )
    return false;
  if (msg.error?.error_code === ErrorCodes.BILLING_INSUFFICIENT_BALANCE) return true;
  const errorText = `${msg.error?.user_message ?? ""} ${msg.content ?? ""}`;
  return INSUFFICIENT_BALANCE_TEXT_PATTERN.test(errorText);
}
function isAuthExpiredError(msg) {
  return msg.error?.error_code === ErrorCodes.AUTH_EXPIRED;
}
const ERROR_CODE_I18N = {
  [ErrorCodes.NETWORK_TIMEOUT]: "chat.errors.networkTimeout",
  [ErrorCodes.NETWORK_UNREACHABLE]: "chat.errors.networkUnavailable",
  [ErrorCodes.NETWORK_DNS_FAILED]: "chat.errors.networkUnavailable",
  [ErrorCodes.RUNTIME_CANCELLED]: "chat.cancelled",
  [ErrorCodes.RUNTIME_SESSION_ERROR]: "chat.errors.runtimeSession",
  [ErrorCodes.CONTENT_BLOCKED]: "chat.errors.contentBlocked",
  [ErrorCodes.RUNTIME_CONNECTION_LOST]: "chat.errors.runtimeConnectionLost",
  [ErrorCodes.RUNTIME_STREAM_ERROR]: "chat.errors.runtimeStream",
  [ErrorCodes.RUNTIME_NOT_READY]: "chat.errors.runtimeNotReady",
  [ErrorCodes.RUNTIME_TOOLS_UNAVAILABLE]: "chat.errors.runtimeToolsUnavailable",
  // 02: zero-provider errors with a valid token are config-fetch failures —
  // show a friendly retryable message instead of the raw "no providers found".
  [ErrorCodes.PROVIDERS_UNAVAILABLE]: "chat.errors.providersUnavailable",
  [ErrorCodes.AUTH_EXPIRED]: "chat.errors.authExpired",
  [ErrorCodes.MODEL_PROVIDER_AUTH_FAILED]: "chat.errors.modelProviderAuthFailed",
  [ErrorCodes.STORAGE_FULL]: "chat.errors.storageFull",
  [ErrorCodes.BILLING_INSUFFICIENT_BALANCE]: "chat.errors.billingInsufficientBalance",
  [ErrorCodes.GATEWAY_INTERNAL]: "chat.errors.genericDetail",
  [ErrorCodes.GATEWAY_UPSTREAM_ERROR]: "chat.errors.genericDetail",
  [ErrorCodes.GATEWAY_UPSTREAM_TRUNCATED]: "chat.errors.runtimeStream",
};
const MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX = "message_delivery_stage:";
const RAW_AGENT_STALLED_ERROR = "Agent turn stalled with no progress; aborted by watchdog.";
const RUNTIME_ERROR_CODE_PREFIX = "RUNTIME_";
function isRuntimeErrorCode(code2) {
  return code2?.startsWith(RUNTIME_ERROR_CODE_PREFIX) ?? false;
}
const RAW_ERROR_CLASS_I18N = {
  concurrency: "canvas.errors.concurrency",
  interrupted: "chat.errors.interrupted",
  timeout: "chat.errors.networkTimeout",
  network: "chat.errors.networkUnavailable",
  storage: "chat.errors.storageFull",
  technical: "chat.errors.genericDetail",
};
function messageDeliveryStageFromDetails(details) {
  if (!details?.startsWith(MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX)) return void 0;
  const stage = details.slice(MESSAGE_DELIVERY_STAGE_DETAIL_PREFIX.length).split(/\s|\n/, 1)[0];
  switch (stage) {
    case "gateway_validation":
    case "runtime_send":
    case "runtime_timeout":
    case "bridge_error":
      return stage;
    default:
      return void 0;
  }
}
function presentationFor(code2, isGenerationStalled) {
  if (isGenerationStalled) {
    return {
      titleKey: "chat.errors.title.generationStalled",
      Icon: Zap,
    };
  }
  switch (code2) {
    case ErrorCodes.BILLING_INSUFFICIENT_BALANCE:
      return {
        titleKey: "chat.errors.title.billing",
        Icon: CreditCard,
      };
    case ErrorCodes.MODEL_PROVIDER_ERROR:
      return {
        titleKey: "chat.errors.title.modelProviderError",
        Icon: AlertCircle,
      };
    case ErrorCodes.MODEL_PROVIDER_AUTH_FAILED:
      return {
        titleKey: "chat.errors.title.modelProviderAuthFailed",
        Icon: KeyRound,
      };
    case ErrorCodes.AUTH_EXPIRED:
      return {
        titleKey: "chat.errors.title.authExpired",
        Icon: KeyRound,
      };
    case ErrorCodes.RUNTIME_CANCELLED:
      return {
        titleKey: "chat.errors.title.cancelled",
        Icon: AlertCircle,
      };
    case ErrorCodes.CONTENT_BLOCKED:
      return {
        titleKey: "chat.errors.title.contentBlocked",
        Icon: ShieldAlert,
      };
    case ErrorCodes.NETWORK_TIMEOUT:
      return {
        titleKey: "chat.errors.title.networkTimeout",
        Icon: WifiOff,
      };
    case ErrorCodes.NETWORK_UNREACHABLE:
    case ErrorCodes.NETWORK_DNS_FAILED:
      return {
        titleKey: "chat.errors.title.networkUnavailable",
        Icon: WifiOff,
      };
    case ErrorCodes.CLIENT_WS_ERROR:
    case ErrorCodes.CLIENT_WS_RECONNECT_FAILED:
      return {
        titleKey: "chat.errors.title.network",
        Icon: WifiOff,
      };
    case ErrorCodes.RUNTIME_CONNECTION_LOST:
      return {
        titleKey: "chat.errors.title.runtimeConnectionLost",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_NOT_READY:
      return {
        titleKey: "chat.errors.title.runtimeNotReady",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_TOOLS_UNAVAILABLE:
      return {
        titleKey: "chat.errors.title.runtimeToolsUnavailable",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_SESSION_ERROR:
      return {
        titleKey: "chat.errors.title.runtimeSession",
        Icon: ServerOff,
      };
    case ErrorCodes.RUNTIME_STREAM_ERROR:
      return {
        titleKey: "chat.errors.title.runtimeStream",
        Icon: ServerOff,
      };
    case ErrorCodes.PROVIDERS_UNAVAILABLE:
      return {
        titleKey: "chat.errors.title.providersUnavailable",
        Icon: WifiOff,
      };
    case ErrorCodes.CLIENT_UPLOAD_FAILED:
      return {
        titleKey: "chat.errors.title.upload",
        Icon: Upload,
      };
    case ErrorCodes.GATEWAY_INTERNAL:
    case ErrorCodes.GATEWAY_UPSTREAM_ERROR:
      return {
        titleKey: "chat.errors.title.runtime",
        Icon: AlertCircle,
      };
    default:
      if (isRuntimeErrorCode(code2)) {
        return {
          titleKey: "chat.errors.title.runtime",
          Icon: ServerOff,
        };
      }
      return {
        titleKey: "chat.errors.title.generic",
        Icon: AlertCircle,
      };
  }
}
function suffixFor(retryable, code2) {
  if (code2 === ErrorCodes.RUNTIME_CANCELLED) return "chat.errors.suffix.cancelled";
  if (code2 === ErrorCodes.BILLING_INSUFFICIENT_BALANCE || code2 === ErrorCodes.AUTH_EXPIRED) {
    return "chat.errors.suffix.actionRequired";
  }
  if (code2 === ErrorCodes.MODEL_PROVIDER_AUTH_FAILED) return "chat.errors.suffix.actionRequired";
  if (retryable) return "chat.errors.suffix.retry";
  return "chat.errors.suffix.failed";
}
function fallbackDetailFor(rawDetail, t2) {
  if (!rawDetail) return t2("chat.errors.serverError");
  const rawClass = classifyRawErrorText(rawDetail);
  if (rawClass) return t2(RAW_ERROR_CLASS_I18N[rawClass]);
  return rawDetail;
}
function localizeModelProviderDetail(rawDetail, language2, t2) {
  if (!language2.toLowerCase().startsWith("zh")) return rawDetail;
  return rawDetail
    .split(/\r?\n/)
    .map((line) => {
      const detail = line.trim();
      if (/^Method Not Allowed(?::.*)?$/i.test(detail)) {
        return t2("chat.errors.modelProviderMethodNotAllowed");
      }
      if (/^FUNCTION_INVOCATION_FAILED$/i.test(detail)) {
        return t2("chat.errors.modelProviderInvocationFailed");
      }
      return line;
    })
    .join("\n");
}
export function ErrorMessage({ msg, onRetry, retrying = false }) {
  const { t: t2, i18n } = useTranslation();
  const errorCode = msg.error?.error_code;
  const deliveryStage = messageDeliveryStageFromDetails(msg.error?.details);
  const rawDetail = (msg.error?.user_message ?? msg.content ?? "").trim();
  const isGenerationStalled =
    deliveryStage === "runtime_timeout" || rawDetail === RAW_AGENT_STALLED_ERROR;
  const i18nKey = isGenerationStalled
    ? "chat.errors.generationStalled"
    : errorCode
      ? (ERROR_CODE_I18N[errorCode] ??
        (isRuntimeErrorCode(errorCode) ? "chat.errors.genericDetail" : void 0))
      : void 0;
  const isModelProviderError = errorCode === ErrorCodes.MODEL_PROVIDER_ERROR;
  const detailText = redactForCurrentRegion(
    isModelProviderError && rawDetail
      ? localizeModelProviderDetail(rawDetail, i18n.language, t2)
      : i18nKey
        ? t2(i18nKey)
        : fallbackDetailFor(rawDetail, t2),
  );
  const retryable = msg.error?.retryable ?? false;
  const isRetrying = retryable && retrying;
  const subscribeUrl = useMpSubscribeUrl();
  const retryDecision = useAccountSubmissionDecision("retry");
  const { actions, showFeedback } = getChatErrorActions(msg, {
    subscribeUrl,
  });
  const presentation = presentationFor(errorCode, isGenerationStalled);
  const isRuntimeConnectionError = presentation.Icon === ServerOff;
  const suffix = t2(suffixFor(retryable, errorCode));
  const hasActions = actions.length > 0 || (retryable && !!onRetry) || showFeedback;
  const errorContext = reactExports.useMemo(() => {
    if (!showFeedback) return void 0;
    return {
      error_code: errorCode,
      message_id: msg.id,
      ...(msg.error?.details
        ? {
            details: msg.error.details,
          }
        : {}),
    };
  }, [showFeedback, errorCode, msg.error?.details, msg.id]);
  if (isInsufficientBalanceError(msg)) {
    const billing = msg.error?.billing;
    return (
      <BillingInsufficientCard
        estimate={
          billing
            ? {
                ...(billing.estimated_credits !== void 0
                  ? {
                      estimatedCredits: billing.estimated_credits,
                    }
                  : {}),
                ...(billing.current_credits !== void 0
                  ? {
                      currentCredits: billing.current_credits,
                    }
                  : {}),
                ...(billing.shortfall_credits !== void 0
                  ? {
                      shortfallCredits: billing.shortfall_credits,
                    }
                  : {}),
              }
            : void 0
        }
        onRetry={onRetry ? () => onRetry() !== false : void 0}
      />
    );
  }
  const actionsNode =
    actions.length > 0 || (retryable && onRetry) || showFeedback ? (
      <>
        {actions.map((action) => (
          <ChatErrorActionButton key={action.id} action={action} label={t2(action.labelKey)} />
        ))}
        {retryable && onRetry && (
          <Button$1
            variant={isRuntimeConnectionError ? "outline" : void 0}
            size={isRuntimeConnectionError ? "default" : "xs"}
            className={
              isRuntimeConnectionError
                ? "min-w-18 rounded-md hover:border-foreground hover:bg-background active:not-aria-[haspopup]:translate-y-0"
                : void 0
            }
            disabled={isRetrying || !retryDecision.allowed}
            aria-busy={isRetrying}
            title={retryDecision.allowed ? void 0 : retryDecision.reasonCode}
            data-action-ui-id="chat.error.retry"
            onClick={() => {
              const decision = guardAccountSubmission("retry");
              if (decision.allowed) onRetry();
            }}
          >
            {t2(isRetrying ? "chat.retrying" : "chat.retry")}
          </Button$1>
        )}
        {showFeedback && (
          <FeedbackButton
            errorContext={detailText}
            reason="chat_error"
            label={t2("feedback.reportIssue", {
              defaultValue: "Report Issue",
            })}
            variant="link"
            directSubmit={true}
            contextType="chat_error"
            context={errorContext}
          />
        )}
      </>
    ) : (
      void 0
    );
  const errorBlock = (
    <ErrorBlock
      title={t2(presentation.titleKey)}
      statusSuffix={suffix}
      Icon={presentation.Icon}
      iconSize={isRuntimeConnectionError ? 14 : 20}
      iconStrokeWidth={1.5}
      iconContainerClassName={
        isRuntimeConnectionError ? "mt-[3px] size-3.5 text-destructive" : void 0
      }
      defaultExpanded={hasActions || isModelProviderError}
      detail={detailText}
      actions={actionsNode}
      compact={isRuntimeConnectionError}
    />
  );
  if (!isRuntimeConnectionError) return errorBlock;
  return (
    <div
      data-runtime-error-card={true}
      className="rounded-lg border border-border bg-card px-3 py-2 [&_[data-error-title]]:text-destructive! [&_[data-error-suffix]]:text-destructive!"
    >
      {errorBlock}
    </div>
  );
}
function getFileName(path2) {
  const normalized = path2.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path2;
}
function isSafeUrl(url2) {
  try {
    const { protocol } = new URL(url2);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
export function FileAddedMessage({ msg }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
  const path2 = msg.content;
  if (!path2) return null;
  const fileName = getFileName(path2);
  const resolved = resolveMediaUrl2(msg.url);
  const safeUrl = resolved && isSafeUrl(resolved) ? resolved : void 0;
  const artifactPath = safeUrl ?? path2;
  const mime = inferArtifactMime(artifactPath, "file");
  return (
    <div
      data-action-ui-id="chat-artifact-file"
      data-artifact-type="file"
      data-artifact-path={artifactPath}
      data-artifact-mime={mime}
      className="flex items-center gap-2 min-w-0"
    >
      <span className="shrink-0 size-5 flex items-center justify-center text-muted-foreground">
        <Paperclip size={20} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 text-body-14 flex items-center gap-1">
        {safeUrl ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground font-normal truncate hover:text-foreground transition-colors"
          >
            {fileName}
          </a>
        ) : (
          <span className="text-muted-foreground font-normal truncate">{fileName}</span>
        )}
      </div>
    </div>
  );
}
const LOCATE_CLICK_DELAY_MS = 180;
export function ImageMessage({ msg }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const [fullSize, setFullSize] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(msg.url) ?? msg.content;
  const thumbSrc = withThumbnail(src, 400);
  useNativeViewOcclusion(fullSize && !error && Boolean(src));
  const { copyImage, saveAs } = useMediaActions();
  const locateTimerRef = reactExports.useRef(null);
  const workspaceId2 = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath$1(msg.url, src),
    [msg.url, src],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  reactExports.useEffect(() => {
    if (!fullSize) return;
    const handleKey = (e2) => {
      if (e2.key === "Escape") setFullSize(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullSize]);
  reactExports.useEffect(() => {
    return () => {
      if (locateTimerRef.current != null) window.clearTimeout(locateTimerRef.current);
    };
  }, []);
  const locateOnCanvas = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId2) return false;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId2);
    if (nodeIds.length === 0) return false;
    workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds);
    return true;
  }, [asset?.id, workspaceId2]);
  const handleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) window.clearTimeout(locateTimerRef.current);
    locateTimerRef.current = window.setTimeout(() => {
      locateTimerRef.current = null;
      if (!locateOnCanvas()) setFullSize(true);
    }, LOCATE_CLICK_DELAY_MS);
  }, [locateOnCanvas]);
  const handleDoubleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) {
      window.clearTimeout(locateTimerRef.current);
      locateTimerRef.current = null;
    }
    setFullSize(true);
  }, []);
  if (error || !src) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t2("chat.failedToLoadImage")}
      </div>
    );
  }
  const mime = inferArtifactMime(src, "image");
  return (
    <>
      <div>
        <ContextMenu>
          <ContextMenuTrigger render={<div />}>
            <button
              type="button"
              className="cursor-pointer border-0 p-0 bg-transparent"
              onClick={handleClick2}
              onDoubleClick={handleDoubleClick2}
            >
              <img
                data-action-ui-id="chat-generated-image"
                data-artifact-type="image"
                data-artifact-path={src}
                data-artifact-mime={mime}
                src={thumbSrc}
                alt={msg.content || t2("chat.generatedImage")}
                className="rounded-lg max-w-full h-auto hover:opacity-90 transition-opacity"
                style={{
                  maxWidth: 400,
                }}
                onError={() => setError(true)}
              />
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => copyImage(src)}>
              <Copy />
              {t2("common.copy")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => saveAs(src)}>
              <Save />
              {t2("common.saveAs")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      {fullSize && (
        <>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
            onClick={() => setFullSize(false)}
          >
            <img
              src={src}
              alt={msg.content || t2("chat.generatedImage")}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
          </div>
        </>
      )}
    </>
  );
}
export function InteractRequest({ msg, onSend }) {
  const { t: t2 } = useTranslation();
  const [reply, setReply] = reactExports.useState("");
  const [localSubmitted, setLocalSubmitted] = reactExports.useState(false);
  const resolved = msg.resolved || localSubmitted;
  const handleSubmit = () => {
    if (!reply.trim() || !msg.requestId || !onSend) return;
    onSend({
      type: "user_reply",
      id: msg.requestId,
      content: reply.trim(),
    });
    setLocalSubmitted(true);
  };
  return (
    <div className="min-w-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-foreground mb-2 whitespace-pre-wrap">{msg.content}</p>
      {resolved ? (
        <p className="text-muted-foreground italic text-xs">
          {t2("chat.replied")} {reply || t2("chat.submitted")}
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-background border border-input rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-primary/50"
            placeholder={t2("chat.replyPlaceholder")}
            value={reply}
            onChange={(e2) => setReply(e2.target.value)}
            onKeyDown={(e2) => {
              if (e2.key === "Enter" && !e2.nativeEvent.isComposing) handleSubmit();
            }}
          />
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!reply.trim()}
          >
            {t2("common.send")}
          </button>
        </div>
      )}
    </div>
  );
}
export function MessageWithdrawn({ reason }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="status"
      data-testid="message-withdrawn"
      data-withdrawal-reason={reason}
      className="flex items-start gap-2 text-body-14 text-muted-foreground"
    >
      <ShieldOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <span>
        {t2(
          "chat.messageWithdrawn.contentPolicyViolation",
          "This response was withdrawn because it did not pass the safety review.",
        )}
      </span>
    </div>
  );
}
export function QuestionMessage({ msg }) {
  const { t: t2 } = useTranslation();
  const raw2 = msg.questionData?.questions;
  const questions = Array.isArray(raw2) ? raw2 : [];
  const resolved = msg.resolved ?? false;
  if (resolved) return null;
  return (
    <div
      data-action-ui-id="chat-question-waiting-card"
      className="question-card-waiting-flow min-w-0 rounded-md border-solid border-border bg-card px-3 py-2.5 [border-width:var(--divider-width)]"
    >
      <svg
        data-action-ui-id="chat-question-waiting-flow"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible text-brand-accent"
      >
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="9.1"
          pathLength="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeDasharray="24 26 24 26"
          vectorEffect="non-scaling-stroke"
          className="question-card-flow-stroke-outer opacity-[0.04]"
        />
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="9.1"
          pathLength="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeDasharray="20 30 20 30"
          vectorEffect="non-scaling-stroke"
          className="question-card-flow-stroke-middle opacity-[0.07]"
        />
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="9.1"
          pathLength="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeDasharray="14 36 14 36"
          vectorEffect="non-scaling-stroke"
          className="question-card-flow-stroke-core opacity-[0.13]"
        />
      </svg>
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <QuestionPromptIcon animated={true} actionId="chat-question-waiting-icon" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-13 font-medium leading-5 text-foreground">
            {questions.map((q2) => redactForCurrentRegion(q2.header)).join(", ")}
          </p>
          <div
            data-action-ui-id="chat-question-waiting-status"
            className="text-shimmer mt-0.5 text-body-12 leading-[18px]"
          >
            {t2("chat.question.waiting")}
          </div>
        </div>
      </div>
    </div>
  );
}
