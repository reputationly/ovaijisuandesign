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
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { useTranslation } from "react-i18next";
import { Check, Copy, Split } from "../media-editing/lucide-icon-wraps.js";
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
import { TOOLS as TOOLS } from "./tools.jsx";
import { record as record } from "../infra/parse-connector-selection.js";
import { TOOL_ABORTED_BY_USER_TEXT as TOOL_ABORTED_BY_USER_TEXT } from "../canvas/diagnostic-history-tools.js";
// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：index-BBp4hclA.js
function isDesignToolInterrupted(message2) {
  return Boolean(
    message2.interruption === "aborted" || message2.toolResult?.includes(TOOL_ABORTED_BY_USER_TEXT) || message2.toolResult?.includes("interrupted before completion")
  );
}

// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：index-BBp4hclA.js
function records(value) {
  return Array.isArray(value) ? value.flatMap((item) => {
    const parsed = record(item);
    return parsed ? [parsed] : [];
  }) : [];
}

// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：index-BBp4hclA.js
export function readDesignJson(value, depth2 = 0) {
  if (depth2 > 4) return void 0;
  if (typeof value === "string") {
    try {
      return readDesignJson(JSON.parse(value), depth2 + 1);
    } catch {
      return void 0;
    }
  }
  const object2 = record(value);
  if (object2?.structuredContent) return readDesignJson(object2.structuredContent, depth2 + 1);
  if (object2?.task || object2?.output || object2?.capabilityId) return object2;
  const content2 = Array.isArray(value) ? value : object2?.content;
  if (Array.isArray(content2)) {
    for (const item of content2) {
      const parsed = readDesignJson(record(item)?.text, depth2 + 1);
      if (parsed) return parsed;
    }
  }
  return object2;
}

// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：index-BBp4hclA.js
function hasDesignToolProblem(message2) {
  if (isDesignToolInterrupted(message2)) return false;
  if (message2.toolStatus === "error") return true;
  const result = readDesignJson(message2.toolResult);
  const task2 = record(result?.task);
  const delivery = record(result?.delivery);
  return Boolean(
    result?.isError || result?.error || result?.placementProblem || records(result?.queries ?? result?.results ?? result?.items).some((item) => item.error) || ["failed", "blocked", "unknown", "waiting_user"].includes(
      String(task2?.status ?? delivery?.status)
    )
  );
}

// 产物里这组声明在还原时丢了（构建不报错、运行时才炸）。来源：index-BBp4hclA.js
function filterDesignBookkeeping(messages2, getName) {
  const resources = /* @__PURE__ */ new Set();
  const compositions = /* @__PURE__ */ new Set();
  const recovered = /* @__PURE__ */ new Set();
  const succeeded = /* @__PURE__ */ new Set();
  for (const message2 of [...messages2].reverse()) {
    if (message2.type === "user" || message2.role === "user") succeeded.clear();
    const name2 = getName(message2);
    if (!name2 || !Object.hasOwn(TOOLS, name2)) continue;
    const identity2 = JSON.stringify([name2, message2.toolArgs]);
    if (hasDesignToolProblem(message2)) {
      if (succeeded.has(identity2)) recovered.add(message2);
    } else if (message2.toolStatus === "ok") succeeded.add(identity2);
  }
  return messages2.filter((message2) => {
    if (recovered.has(message2)) return false;
    if (message2.type === "user" || message2.role === "user") {
      resources.clear();
      compositions.clear();
    }
    const name2 = getName(message2);
    const args = readDesignJson(message2.toolArgs);
    const result = readDesignJson(message2.toolResult);
    if (name2 && ["design_execute", "design_document_write", "design_image_search", "design_deliver"].includes(
      name2
    )) {
      const delivery = record(result?.delivery);
      const task2 = record(result?.task);
      const outputs = [
        result,
        task2,
        ...records(task2?.outputs),
        ...records(delivery?.outputs),
        ...records(delivery?.placements),
        ...records(task2?.placements),
        ...records(result?.queries).flatMap((item) => records(item.images))
      ];
      for (const output2 of outputs) {
        if (typeof output2?.resourceId === "string") resources.add(output2.resourceId);
        if (typeof output2?.compositionId === "string") compositions.add(output2.compositionId);
      }
    }
    if (hasDesignToolProblem(message2)) return true;
    if (name2 !== "design_resource_edit" && name2 !== "design_composition_edit") return true;
    const commands = args?.action === "batch" ? records(args.commands) : args ? [args] : [];
    return !commands.length || !commands.every((command2) => {
      if (name2 === "design_resource_edit")
        return typeof command2.resourceId === "string" && resources.has(command2.resourceId);
      if (typeof command2.compositionId === "string" && compositions.has(command2.compositionId))
        return true;
      const operations = records(command2.operations);
      return operations.length > 0 && operations.every(
        (operation2) => operation2.action === "add_member" && Array.isArray(operation2.resourceIds) && operation2.resourceIds.length > 0 && operation2.resourceIds.every((id2) => typeof id2 === "string" && resources.has(id2))
      );
    });
  });
}

const ATTACHMENT_COLLAPSE_THRESHOLD = 6;
function attachToolConfirmsToSubAgents(messages) {
  const result = [];
  for (const message of messages) {
    if (
      message.type === "tool_confirm_ask" &&
      (!message.resolved || message.toolConfirmDecision === "reject")
    ) {
      const owner = findToolConfirmOwningSubAgent(result, message);
      if (owner) {
        const ownerIndex = result.findIndex(
          (candidate) => candidate.id === owner.id,
        );
        result[ownerIndex] = {
          ...owner,
          subMessages: [...(owner.subMessages ?? []), message],
        };
        continue;
      }
    }
    result.push(message);
  }
  return result;
}
function attachQuestionsToSubAgents(messages) {
  const result = [];
  for (const message of messages) {
    if (message.type !== "question" || !message.childSessionId) {
      result.push(message);
      continue;
    }
    let subAgentIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      const candidate = result[index];
      if (
        candidate?.type === "sub_agent" &&
        candidate.childSessionId === message.childSessionId
      ) {
        subAgentIndex = index;
        break;
      }
    }
    if (subAgentIndex < 0) {
      result.push(message);
      continue;
    }
    const subAgent = result[subAgentIndex];
    result[subAgentIndex] = {
      ...subAgent,
      subMessages: [...(subAgent.subMessages ?? []), message],
    };
  }
  return result;
}
function prepareMainAgentActivityMessages(messages, showHiddenTools, turnComplete = false) {
  if (showHiddenTools) return [...messages];
  const getMessageToolName = (message) => {
    if (message.type !== "tool") return void 0;
    return message.toolName?.trim() || parseToolResult(message.content).name;
  };
  const retained = filterDesignBookkeeping(messages, getMessageToolName).filter((message) => {
    if (message.type === "text" && !message.content.trim() && !message.attachments?.length) {
      return false;
    }
    if (message.type !== "tool") return true;
    const toolName = getMessageToolName(message);
    return isMainAgentThinkingTool(toolName) || getToolLabelId(toolName, message) !== "silent";
  });
  const normalized = retained.map((message) => {
    const toolName = getMessageToolName(message);
    return message.type === "tool" && (toolName === "hub_read" || isMainAgentThinkingTool(toolName))
      ? {
          ...message,
          type: "thinking",
          content: "",
        }
      : message;
  });
  const visible = filterSupersededTransientTools(normalized, getMessageToolName, turnComplete);
  const latest = visible[visible.length - 1];
  const latestToolName = latest ? getMessageToolName(latest) : void 0;
  if (
    latest?.type === "tool" &&
    latestToolName &&
    categorizeToolAction(latestToolName) === "search" &&
    latest.toolStatus === "ok"
  ) {
    visible[visible.length - 1] = {
      ...latest,
      content: latestToolName,
      toolStatus: "running",
    };
  }
  return visible;
}
function subMessagesHaveCanvasContinuation(messages) {
  return messages.some(
    (message) =>
      message.interruption === "canvas_continuation" ||
      (message.subMessages
        ? subMessagesHaveCanvasContinuation(message.subMessages)
        : false),
  );
}
function messageHasCanvasContinuation(message) {
  if (message.type === "tool")
    return message.interruption === "canvas_continuation";
  if (message.type === "sub_agent") {
    return subMessagesHaveCanvasContinuation(message.subMessages ?? []);
  }
  return (
    message.type === "cancelled" &&
    message.generationContinuesOnCanvas === true
  );
}
function collectCanvasContinuationTargets(messages) {
  const targets = new Map();
  const collect = (message) => {
    if (
      message.type === "tool" &&
      message.interruption === "canvas_continuation"
    ) {
      for (const target of message.generationHandoffTargets ?? []) {
        const key = `${target.node_id}:${target.generation_attempt_id ?? ""}`;
        targets.set(key, target);
      }
    }
    if (message.type === "cancelled" && message.generationContinuesOnCanvas) {
      for (const target of message.generationHandoffTargets ?? []) {
        const key = `${target.node_id}:${target.generation_attempt_id ?? ""}`;
        targets.set(key, target);
      }
    }
    if (message.type === "sub_agent") {
      for (const subMessage of message.subMessages ?? []) collect(subMessage);
    }
  };
  for (const message of messages) collect(message);
  return [...targets.values()];
}
function isMainAgentProgressMessage(message) {
  if (!message) return false;
  if (message.type === "thinking") return true;
  if (message.type !== "tool") return false;
  if (message.toolStatus === "error") return false;
  const toolName =
    message.toolName?.trim() || parseToolResult(message.content).name;
  return (
    isTransientTool(toolName) || categorizeToolAction(toolName) === "search"
  );
}
function isCompletedRetryOutput(message) {
  switch (message.type) {
    case "text":
      return message.role === "agent" && message.content.trim().length > 0;
    case "tool":
      return message.toolStatus === "ok";
    case "sub_agent":
      return message.resolved === true && message.cancelled !== true;
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
      return message.resolved !== true;
    case "thinking":
    case "error":
    case "withdrawn":
    case "cancelled":
    case "compaction_status":
      return false;
  }
}
function filterResolvedRetryErrors(messages) {
  const retained = [];
  let hasLaterError = false;
  let hasLaterCompletedOutput = false;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const isResolvedRetryError =
      message.type === "error" &&
      message.error?.retryable === true &&
      (hasLaterError || hasLaterCompletedOutput);
    if (!isResolvedRetryError) retained.push(message);
    if (message.type === "error") {
      hasLaterError = true;
    } else if (isCompletedRetryOutput(message)) {
      hasLaterCompletedOutput = true;
    }
  }
  return retained.reverse();
}
function isPendingSubAgentDispatch(message, showHiddenTools = false) {
  if (message.type !== "sub_agent" || message.resolved || message.cancelled) return false;
  if (showHiddenTools) return (message.subMessages?.length ?? 0) === 0;
  return (
    filterSilentTools(message.subMessages ?? [], (subMessage) =>
      subMessage.type === "tool"
        ? parseToolResult(subMessage.content).name
        : void 0,
    ).length === 0
  );
}
function findPendingTaskDispatch(messages, showHiddenTools = false) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const task = messages[index];
    if (
      task?.type !== "tool" ||
      task.content !== "task" ||
      (task.toolStatus !== "running" && task.toolStatus !== "pending")
    ) {
      continue;
    }
    const child = messages
      .slice(index + 1)
      .find(
        (message) =>
          message.type === "sub_agent" &&
          (!task.childSessionId ||
            message.childSessionId === task.childSessionId),
      );
    return !child || isPendingSubAgentDispatch(child, showHiddenTools)
      ? task
      : void 0;
  }
  return void 0;
}
function TaskDispatchIndicator() {
  const { t: translate } = useTranslation();
  return (
    <div
      data-action-ui-id="chat-task-dispatching"
      role="status"
      className="flex items-center gap-2 text-body-14 text-muted-foreground"
    >
      <BrailleSpinner type="braille" className="text-xs text-tertiary" />
      <span className="text-shimmer text-muted-foreground">
        {translate("chat.taskDispatching", "Dispatching task")}
      </span>
    </div>
  );
}
function AttachmentChip({ att: attachment }) {
  const resolveMediaUrl = useResolveMediaUrl();
  const workspacePath = useCurrentWorkspace();
  const filename = attachment.path.split("/").pop() ?? attachment.path;
  const resolvedUrl = resolveMediaUrl(attachment.url) ?? void 0;
  const isHeic = attachment.type === "image" && isHeicFilename(filename);
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
    attachment.type === "image"
      ? isHeic
        ? (convertedImageUrl ?? void 0)
        : resolvedUrl
      : void 0;
  const mediaUrl =
    attachment.type === "video" || attachment.type === "audio" ? resolvedUrl : void 0;
  return (
    <div
      className="contents"
      data-action-ui-id="chat-user-attachment"
      data-attachment-path={attachment.path}
    >
      <FileChip
        filename={filename}
        imageUrl={imageUrl}
        mediaUrl={mediaUrl}
        fileType={attachment.type}
        dragSource={{
          relativePath: attachment.path,
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
function UserAttachmentStrip({ attachments, fileMentionDisplayNames }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const shouldCollapse = attachments.length > ATTACHMENT_COLLAPSE_THRESHOLD;
  const visibleAttachments =
    shouldCollapse && !expanded ? attachments.slice(0, ATTACHMENT_COLLAPSE_THRESHOLD) : attachments;
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
          <AttachmentChip key={att.path} att={att} fileMentionDisplayNames={fileMentionDisplayNames} />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-foreground/12 bg-muted/40 text-xs font-medium text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            aria-label={t("chat.expand")}
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
          {expanded ? t("chat.collapse") : t("chat.expand")}
        </button>
      )}
    </div>
  );
}
function UserPluginNodeAttachmentStrip({ pluginNodes }) {
  const { t: translate } = useTranslation();
  if (pluginNodes.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2 flex-wrap">
      {pluginNodes.map((pluginNode) => {
        const pluginDisplayName = pluginNode.name?.trim() || pluginNode.pluginId;
        return (
          <div
            key={pluginNode.nodeId}
            data-testid="plugin-node-chip-sent"
            className="flex items-center gap-2.5 w-[200px] h-16 px-2.5 rounded-sm bg-muted-foreground/10"
            title={pluginDisplayName}
          >
            <div className="shrink-0 flex items-center justify-center w-9 h-9 bg-background/60">
              <Puzzle size={20} className="text-foreground opacity-50" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <span className="text-xs font-medium text-foreground truncate">
                {pluginDisplayName}
              </span>
              <span className="text-caption-10 text-muted-foreground truncate">
                {translate("chat.pluginNodeChipMeta", {
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
const UserPromptBubble = reactExports.memo(function UserPromptBubble({
  user,
  busy,
  turnIndex,
  onFork,
}) {
  const { t: translate } = useTranslation();
  const { copied, copy } = useCopy();
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
                {translate("chat.noContent")}
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
                    {translate("chat.forkFromHere")}
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  side="top"
                  align="end"
                  sideOffset={6}
                  className="w-44 gap-2 p-2.5"
                >
                  <p className="text-caption-11 text-muted-foreground whitespace-normal leading-snug">
                    {translate("chat.forkConversation")}
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
                    {translate("chat.forkAction")}
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
                      onClick={() => copy(user.content)}
                      aria-label={translate(copied ? "chat.copied" : "chat.copy")}
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
                  {translate(copied ? "chat.copied" : "chat.copy")}
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
function turnMessagesRefEqual(leftTurn, rightTurn) {
  if (leftTurn.user !== rightTurn.user) return false;
  if (leftTurn.responses.length !== rightTurn.responses.length) return false;
  for (let responseGroupIndex = 0; responseGroupIndex < leftTurn.responses.length; responseGroupIndex++) {
    const leftResponseGroup = leftTurn.responses[responseGroupIndex];
    const rightResponseGroup = rightTurn.responses[responseGroupIndex];
    if (leftResponseGroup.length !== rightResponseGroup.length) return false;
    for (let messageIndex = 0; messageIndex < leftResponseGroup.length; messageIndex++) {
      if (leftResponseGroup[messageIndex] !== rightResponseGroup[messageIndex]) return false;
    }
  }
  return true;
}
function messageTurnPropsEqual(prev, next) {
  return (
    prev.fileResourceReferences === next.fileResourceReferences &&
    prev.turnIndex === next.turnIndex &&
    prev.turnCount === next.turnCount &&
    prev.latestAssistantActionTurnIndex === next.latestAssistantActionTurnIndex &&
    prev.feedbackSessionId === next.feedbackSessionId &&
    prev.feedbackWorkspaceDir === next.feedbackWorkspaceDir &&
    prev.feedbackWorkspaceId === next.feedbackWorkspaceId &&
    prev.busy === next.busy &&
    prev.showBusyTip === next.showBusyTip &&
    prev.busyLabel === next.busyLabel &&
    prev.showHiddenTools === next.showHiddenTools &&
    prev.showTurnArtifacts === next.showTurnArtifacts &&
    prev.turnTail === next.turnTail &&
    prev.lastMessageId === next.lastMessageId &&
    prev.onSend === next.onSend &&
    prev.onRetry === next.onRetry &&
    prev.onFork === next.onFork &&
    turnMessagesRefEqual(prev.turn, next.turn)
  );
}
export const MessageTurn = reactExports.memo(function MessageTurn({
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
    (message) => !(message.type === "cancelled" && showHandoffSummary),
  );
  const visible = attachQuestionsToSubAgents(
    attachToolConfirmsToSubAgents(preparedResponses),
  );
  const grouped = groupIntoActivityGroups(visible, showHiddenTools);
  const handoffSummaryIndex = showHandoffSummary
    ? grouped.findIndex((node) =>
        node.kind === "activity-group"
          ? node.items.some(messageHasCanvasContinuation)
          : messageHasCanvasContinuation(node.msg),
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
    !allResponses.some((message) => message.type === "cancelled");
  const pendingTaskDispatch = canShowTaskDispatch
    ? findPendingTaskDispatch(allResponses, showHiddenTools)
    : void 0;
  const hasInlineTaskDispatch = visible.some(
    (message) =>
      isPendingSubAgentDispatch(message, showHiddenTools) &&
      (!pendingTaskDispatch?.childSessionId ||
        message.childSessionId === pendingTaskDispatch.childSessionId),
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
            {grouped.map((node, nodeIndex) => {
              const isLast = isLastTurn && nodeIndex === grouped.length - 1;
              if (node.kind === "activity-group") {
                const groupKey = node.items[0]?.id ?? `activity-${nodeIndex}`;
                const lastItem = node.items[node.items.length - 1];
                const isGroupStreaming =
                  busy &&
                  isLastTurn &&
                  ((isLast &&
                    lastItem != null &&
                    lastItem.id === lastMessageId) ||
                    node.items.some(
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
                          data={node}
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
              const { msg: message } = node;
              if (isPendingSubAgentDispatch(message, showHiddenTools)) {
                if (!canShowTaskDispatch) return null;
                return (
                  <div
                    key={message.id}
                    data-message-id={message.id}
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
                    <div data-message-id={message.id} className="empty:hidden">
                      <MessageBubble
                        msg={message}
                        isLast={isLast}
                        isStreaming={
                          (message.type === "thinking" ||
                            (message.type === "text" && message.role === "agent")) &&
                          busy &&
                          message.id === lastMessageId
                        }
                        onSend={onSend}
                        onRetry={turn.user ? handleTurnRetry : void 0}
                        retrying={busy && isLastTurn}
                      />
                    </div>,
                  ],
                },
                message.id,
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
