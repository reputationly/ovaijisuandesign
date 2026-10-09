// message-turn.jsx
import {
  categorizeToolAction,
  getToolLabelId,
} from "./has-structured-success-payload.js";
import {
  filterSupersededTransientTools,
  findToolConfirmOwningSubAgent,
  parseToolResult,
} from "./use-tool-confirm-settlement.js";
import {
  filterSilentTools,
  isMainAgentThinkingTool,
  isTransientTool,
} from "../generation/use-tool-confirm-edit-state.js";
import {
  Check,
  Copy,
  jsxRuntimeExports,
  reactExports,
  Split,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { BrailleSpinner } from "./chat-empty-state.jsx";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import {
  createHeicPreviewObjectUrlFromUrl,
  isHeicFilename,
} from "../assets/classify-upload-error.js";
import { FileChip } from "../generation/file-chip.jsx";
import { Puzzle } from "../media-editing/package.jsx";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import {
  collectAssistantCopyText,
  GenerationHandoffSummary,
  useCopy,
} from "./use-copy.jsx";
import { RichUserPromptContent } from "./rich-user-prompt-content.jsx";
import { SentAnnotationCards } from "./sent-annotation-cards.jsx";
import { Button, TooltipContent } from "../infra/dialog-content.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { BusyTipIndicator } from "./busy-tip-indicator.jsx";
import { groupIntoActivityGroups } from "../media-editing/group-into-activity-groups.js";
import { AssistantMessageActions } from "./assistant-message-actions.jsx";
import { MessageBubble } from "./sub-agent-group.jsx";
import { collectFallbackTurnArtifacts } from "./collect-fallback-turn-artifacts.js";
import { ActivityGroup } from "../team/activity-group.jsx";
import { TurnArtifactStrip } from "../media-editing/turn-artifact-strip.jsx";
const ATTACHMENT_COLLAPSE_THRESHOLD = 6;
function attachToolConfirmsToSubAgents(messages2) {
  const result = [];
  for (const msg of messages2) {
    if (
      msg.type === "tool_confirm_ask" &&
      (!msg.resolved || msg.toolConfirmDecision === "reject")
    ) {
      const owner = findToolConfirmOwningSubAgent(result, msg);
      if (owner) {
        const ownerIndex = result.findIndex(
          (candidate) => candidate.id === owner.id,
        );
        result[ownerIndex] = {
          ...owner,
          subMessages: [...(owner.subMessages ?? []), msg],
        };
        continue;
      }
    }
    result.push(msg);
  }
  return result;
}
function attachQuestionsToSubAgents(messages2) {
  const result = [];
  for (const msg of messages2) {
    if (msg.type !== "question" || !msg.childSessionId) {
      result.push(msg);
      continue;
    }
    let subAgentIndex = -1;
    for (let index2 = result.length - 1; index2 >= 0; index2 -= 1) {
      const candidate = result[index2];
      if (
        candidate?.type === "sub_agent" &&
        candidate.childSessionId === msg.childSessionId
      ) {
        subAgentIndex = index2;
        break;
      }
    }
    if (subAgentIndex < 0) {
      result.push(msg);
      continue;
    }
    const subAgent = result[subAgentIndex];
    result[subAgentIndex] = {
      ...subAgent,
      subMessages: [...(subAgent.subMessages ?? []), msg],
    };
  }
  return result;
}
function prepareMainAgentActivityMessages(messages2, showHiddenTools) {
  if (showHiddenTools) return [...messages2];
  const getMessageToolName = (message2) => {
    if (message2.type !== "tool") return void 0;
    return message2.toolName?.trim() || parseToolResult(message2.content).name;
  };
  const retained = messages2.filter((message2) => {
    if (
      message2.type === "text" &&
      !message2.content.trim() &&
      !message2.attachments?.length
    ) {
      return false;
    }
    if (message2.type !== "tool") return true;
    const toolName2 = getMessageToolName(message2);
    return (
      isMainAgentThinkingTool(toolName2) ||
      getToolLabelId(toolName2) !== "silent"
    );
  });
  const normalized = retained.map((message2) => {
    const toolName2 = getMessageToolName(message2);
    return message2.type === "tool" &&
      (toolName2 === "hub_read" || isMainAgentThinkingTool(toolName2))
      ? {
          ...message2,
          type: "thinking",
          content: "",
        }
      : message2;
  });
  const visible = filterSupersededTransientTools(
    normalized,
    getMessageToolName,
  );
  const latest2 = visible[visible.length - 1];
  const latestToolName = latest2 ? getMessageToolName(latest2) : void 0;
  if (
    latest2?.type === "tool" &&
    latestToolName &&
    categorizeToolAction(latestToolName) === "search" &&
    latest2.toolStatus === "ok"
  ) {
    visible[visible.length - 1] = {
      ...latest2,
      content: latestToolName,
      toolStatus: "running",
    };
  }
  return visible;
}
function subMessagesHaveCanvasContinuation(messages2) {
  return messages2.some(
    (message2) =>
      message2.interruption === "canvas_continuation" ||
      (message2.subMessages
        ? subMessagesHaveCanvasContinuation(message2.subMessages)
        : false),
  );
}
function messageHasCanvasContinuation(message2) {
  if (message2.type === "tool")
    return message2.interruption === "canvas_continuation";
  if (message2.type === "sub_agent") {
    return subMessagesHaveCanvasContinuation(message2.subMessages ?? []);
  }
  return (
    message2.type === "cancelled" &&
    message2.generationContinuesOnCanvas === true
  );
}
function collectCanvasContinuationTargets(messages2) {
  const targets = new Map();
  const collect = (message2) => {
    if (
      message2.type === "tool" &&
      message2.interruption === "canvas_continuation"
    ) {
      for (const target of message2.generationHandoffTargets ?? []) {
        const key2 = `${target.node_id}:${target.generation_attempt_id ?? ""}`;
        targets.set(key2, target);
      }
    }
    if (message2.type === "cancelled" && message2.generationContinuesOnCanvas) {
      for (const target of message2.generationHandoffTargets ?? []) {
        const key2 = `${target.node_id}:${target.generation_attempt_id ?? ""}`;
        targets.set(key2, target);
      }
    }
    if (message2.type === "sub_agent") {
      for (const subMessage of message2.subMessages ?? []) collect(subMessage);
    }
  };
  for (const message2 of messages2) collect(message2);
  return [...targets.values()];
}
function isMainAgentProgressMessage(message2) {
  if (!message2) return false;
  if (message2.type === "thinking") return true;
  if (message2.type !== "tool") return false;
  if (message2.toolStatus === "error") return false;
  const toolName2 =
    message2.toolName?.trim() || parseToolResult(message2.content).name;
  return (
    isTransientTool(toolName2) || categorizeToolAction(toolName2) === "search"
  );
}
function isCompletedRetryOutput(message2) {
  switch (message2.type) {
    case "text":
      return message2.role === "agent" && message2.content.trim().length > 0;
    case "tool":
      return message2.toolStatus === "ok";
    case "sub_agent":
      return message2.resolved === true && message2.cancelled !== true;
    case "image":
    case "video":
    case "audio":
    case "file_added":
      return true;
    case "interact":
    case "confirm":
    case "question":
    case "loop_guard_ask":
    case "tool_confirm_ask":
    case "credit_threshold":
      return message2.resolved !== true;
    case "thinking":
    case "error":
    case "withdrawn":
    case "cancelled":
    case "compaction_status":
      return false;
  }
}
function filterResolvedRetryErrors(messages2) {
  const retained = [];
  let hasLaterError = false;
  let hasLaterCompletedOutput = false;
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    const isResolvedRetryError =
      message2.type === "error" &&
      message2.error?.retryable === true &&
      (hasLaterError || hasLaterCompletedOutput);
    if (!isResolvedRetryError) retained.push(message2);
    if (message2.type === "error") {
      hasLaterError = true;
    } else if (isCompletedRetryOutput(message2)) {
      hasLaterCompletedOutput = true;
    }
  }
  return retained.reverse();
}
function isPendingSubAgentDispatch(msg, showHiddenTools = false) {
  if (msg.type !== "sub_agent" || msg.resolved || msg.cancelled) return false;
  if (showHiddenTools) return (msg.subMessages?.length ?? 0) === 0;
  return (
    filterSilentTools(msg.subMessages ?? [], (subMessage) =>
      subMessage.type === "tool"
        ? parseToolResult(subMessage.content).name
        : void 0,
    ).length === 0
  );
}
function findPendingTaskDispatch(messages2, showHiddenTools = false) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const task = messages2[index2];
    if (
      task?.type !== "tool" ||
      task.content !== "task" ||
      (task.toolStatus !== "running" && task.toolStatus !== "pending")
    ) {
      continue;
    }
    const child = messages2
      .slice(index2 + 1)
      .find(
        (message2) =>
          message2.type === "sub_agent" &&
          (!task.childSessionId ||
            message2.childSessionId === task.childSessionId),
      );
    return !child || isPendingSubAgentDispatch(child, showHiddenTools)
      ? task
      : void 0;
  }
  return void 0;
}
function TaskDispatchIndicator() {
  const { t: t2 } = useTranslation();
  return (
    <div
      data-action-ui-id="chat-task-dispatching"
      role="status"
      className="flex items-center gap-2 text-body-14 text-muted-foreground"
    >
      <BrailleSpinner type="braille" className="text-xs text-tertiary" />
      <span className="text-shimmer text-muted-foreground">
        {t2("chat.taskDispatching", "Dispatching task")}
      </span>
    </div>
  );
}
function AttachmentChip({ att }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
  const workspacePath = useCurrentWorkspace();
  const filename = att.path.split("/").pop() ?? att.path;
  const resolvedUrl = resolveMediaUrl2(att.url) ?? void 0;
  const isHeic = att.type === "image" && isHeicFilename(filename);
  const [convertedImageUrl, setConvertedImageUrl] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!isHeic || !resolvedUrl) {
      setConvertedImageUrl(null);
      return;
    }
    let disposed = false;
    let objectUrl = null;
    createHeicPreviewObjectUrlFromUrl(filename, resolvedUrl).then(
      (previewUrl) => {
        if (!previewUrl) return;
        if (disposed) {
          URL.revokeObjectURL(previewUrl);
          return;
        }
        objectUrl = previewUrl;
        setConvertedImageUrl(previewUrl);
      },
    );
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename, isHeic, resolvedUrl]);
  const imageUrl =
    att.type === "image"
      ? isHeic
        ? (convertedImageUrl ?? void 0)
        : resolvedUrl
      : void 0;
  const mediaUrl =
    att.type === "video" || att.type === "audio" ? resolvedUrl : void 0;
  return (
    <div
      className="contents"
      data-action-ui-id="chat-user-attachment"
      data-attachment-path={att.path}
    >
      <FileChip
        filename={filename}
        imageUrl={imageUrl}
        mediaUrl={mediaUrl}
        fileType={att.type}
        dragSource={{
          relativePath: att.path,
          workspacePath,
          name: filename,
        }}
        previewOnClick={true}
        layout="tile"
        className="hover:border-foreground/25"
      />
    </div>
  );
}
function UserAttachmentStrip({ attachments }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const shouldCollapse = attachments.length > ATTACHMENT_COLLAPSE_THRESHOLD;
  const visibleAttachments =
    shouldCollapse && !expanded
      ? attachments.slice(0, ATTACHMENT_COLLAPSE_THRESHOLD)
      : attachments;
  const hiddenCount = attachments.length - visibleAttachments.length;
  return (
    <div className="mt-2 space-y-1.5">
      <div
        className={
          expanded
            ? "flex gap-2 flex-wrap"
            : "flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full"
        }
      >
        {visibleAttachments.map((att) => (
          <AttachmentChip key={att.path} att={att} />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-foreground/12 bg-muted/40 text-xs font-medium text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            aria-label={t2("chat.expand")}
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
      {shouldCollapse && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t2("chat.collapse") : t2("chat.expand")}
        </button>
      )}
    </div>
  );
}
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
              <span className="text-xs font-medium text-foreground truncate">
                {name2}
              </span>
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
    <div
      data-action-ui-id="chat-message-user"
      className="group/user px-4 flex flex-col items-end"
    >
      <div className="relative inline-flex max-w-3/4">
        <div className="max-h-[40vh] overflow-y-auto bg-foreground/5 px-3.5 py-2.5 rounded-xl text-body-15 font-normal text-foreground">
          {user.content && (
            <RichUserPromptContent content={user.content} collapsible={true} />
          )}
          {!user.content &&
            !user.attachments?.length &&
            !user.documentAnnotations?.length &&
            !user.pluginNodeAttachments?.length && (
              <span className="text-muted-foreground italic">
                {t2("chat.noContent")}
              </span>
            )}
          {user.attachments && user.attachments.length > 0 && (
            <UserAttachmentStrip attachments={user.attachments} />
          )}
          {user.pluginNodeAttachments &&
            user.pluginNodeAttachments.length > 0 && (
              <UserPluginNodeAttachmentStrip
                pluginNodes={user.pluginNodeAttachments}
              />
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
                        <Split
                          className="size-3.5 rotate-90"
                          strokeWidth={1.5}
                        />
                      </PopoverTrigger>
                    }
                  />
                  <TooltipContent side="top">
                    {t2("chat.forkFromHere")}
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  side="top"
                  align="end"
                  sideOffset={6}
                  className="w-44 gap-2 p-2.5"
                >
                  <p className="text-caption-11 text-muted-foreground whitespace-normal leading-snug">
                    {t2("chat.forkConversation")}
                  </p>
                  <Button
                    size="sm"
                    data-action-ui-id="chat-fork-confirm"
                    className="self-end px-3"
                    onClick={() => {
                      onFork(runtimeMessageId, user.content);
                      setForkOpen(false);
                    }}
                  >
                    {t2("chat.forkAction")}
                  </Button>
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
    prev.latestAssistantActionTurnIndex ===
      next2.latestAssistantActionTurnIndex &&
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
export const MessageTurn = reactExports.memo(function MessageTurn2({
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
  const unfilteredResponses = prepareMainAgentActivityMessages(
    presentedResponses,
    showHiddenTools,
  );
  const hasCanvasContinuation = unfilteredResponses.some(
    messageHasCanvasContinuation,
  );
  const handoffTargets = hasCanvasContinuation
    ? collectCanvasContinuationTargets(unfilteredResponses)
    : [];
  const showHandoffSummary = handoffTargets.length > 0;
  const preparedResponses = unfilteredResponses.filter(
    (message2) => !(message2.type === "cancelled" && showHandoffSummary),
  );
  const visible = attachQuestionsToSubAgents(
    attachToolConfirmsToSubAgents(preparedResponses),
  );
  const grouped = groupIntoActivityGroups(visible, showHiddenTools);
  const handoffSummaryIndex = showHandoffSummary
    ? grouped.findIndex((node2) =>
        node2.kind === "activity-group"
          ? node2.items.some(messageHasCanvasContinuation)
          : messageHasCanvasContinuation(node2.msg),
      )
    : -1;
  const handoffSummaryAtEnd = showHandoffSummary && handoffSummaryIndex === -1;
  const artifactMessages = turn.user
    ? [turn.user, ...allResponses]
    : allResponses;
  const assistantCopyText = isTurnComplete
    ? collectAssistantCopyText(allResponses)
    : "";
  const assistantRequestId = turn.user?.runtimeMessageId;
  const fallbackArtifacts =
    showTurnArtifacts && isTurnComplete
      ? collectFallbackTurnArtifacts(artifactMessages)
      : [];
  const canShowTaskDispatch =
    busy &&
    isLastTurn &&
    !allResponses.some((message2) => message2.type === "cancelled");
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
    <div
      data-action-ui-id="chat-message-turn"
      className="flex flex-col gap-8 pb-8"
    >
      {turn.user && (
        <UserPromptBubble
          user={turn.user}
          busy={busy}
          turnIndex={turnIndex}
          onFork={onFork}
        />
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
                  ((isLast &&
                    lastItem != null &&
                    lastItem.id === lastMessageId) ||
                    node2.items.some(
                      (item) =>
                        item.type === "tool" &&
                        (item.toolStatus === "running" ||
                          item.toolStatus === "pending"),
                    ));
                const showProgress =
                  busy && isLast && isMainAgentProgressMessage(lastItem);
                const showThinking =
                  showProgress && lastItem?.type === "thinking";
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
                  <div
                    key={msg.id}
                    data-message-id={msg.id}
                    className="empty:hidden"
                  >
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
            {handoffSummaryAtEnd && (
              <GenerationHandoffSummary targets={handoffTargets} />
            )}
            {pendingTaskDispatch && !hasInlineTaskDispatch && (
              <div data-message-id={pendingTaskDispatch.id}>
                <TaskDispatchIndicator />
              </div>
            )}
            <TurnArtifactStrip artifacts={fallbackArtifacts} />
            {showBusyTip && <BusyTipIndicator label={busyLabel} />}
          </div>
          {(assistantCopyText ||
            (isTurnComplete &&
              assistantRequestId &&
              feedbackSessionId &&
              hasAssistantContent)) && (
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
        <div
          className="flex flex-col gap-2 px-4"
          data-testid="message-turn-tail"
        >
          {turnTail}
        </div>
      )}
    </div>
  );
}, messageTurnPropsEqual);
