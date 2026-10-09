// group-into-turns.jsx
import {
  getToolLabelId,
  categorizeToolAction,
  useTranslation,
  useResolveMediaUrl,
  useCurrentWorkspace,
  reactExports,
} from "../vendor.js";
import {
  findToolConfirmOwningSubAgent,
  parseToolResult,
  filterSupersededTransientTools,
} from "../m13/use-chat-rating.js";
import {
  isMainAgentThinkingTool,
  isTransientTool,
  filterSilentTools,
} from "../m13/media-model-selector.jsx";
import { collectAssistantCopyText } from "../m13/history-anchor-rail-impl.jsx";
import { BrailleSpinner } from "../m13/empty-chat-recommendations.jsx";
import { isHeicFilename, createHeicPreviewObjectUrlFromUrl } from "../m12/use-upload.js";
import { FileChip } from "../m12/file-chip.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
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
  const allSameType = attachments.every((a2) => attachmentTypeKey(a2.type) === firstType);
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
export function extractUserSignalRaw(turn) {
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
export function extractAgentSignalRaw(turn) {
  const flat = turn.responses.flat();
  if (flat.length === 0) return null;
  const textMsg = flat.find(
    (m3) => (m3.type === "text" || m3.type === "thinking") && typeof m3.content === "string",
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
const ATTACHMENT_COLLAPSE_THRESHOLD = 6;
export const MESSAGE_TURN_ESTIMATED_HEIGHT = 180;
export const MESSAGE_TURN_OVERSCAN = 8;
export const MESSAGE_LIST_INITIAL_RECT = {
  width: 0,
  height: 720,
};
export const MESSAGE_TURN_HEIGHT_CACHE = new WeakMap();
const MESSAGE_LIST_BASE_CLASS = "flex-1 overflow-y-auto overflow-x-hidden pt-3 pb-20 pr-1.5 mr-0.5";
const MESSAGE_LIST_HIDDEN_SCROLLBAR_CLASS = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const MESSAGE_LIST_NATIVE_SCROLLBAR_CLASS =
  "[scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/0! [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-300! [&::-webkit-scrollbar-thumb]:ease-in-out! [&[data-scrolling=true]::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!";
export function getMessageListScrollbarClass(showHistoryRail) {
  return `${MESSAGE_LIST_BASE_CLASS} ${showHistoryRail ? MESSAGE_LIST_HIDDEN_SCROLLBAR_CLASS : MESSAGE_LIST_NATIVE_SCROLLBAR_CLASS}`;
}
export function findMessageTurnIndex(turns, messageId) {
  return turns.findIndex((turn) => {
    if (turn.user?.id === messageId) return true;
    return turn.responses.some((group) => group.some((message2) => message2.id === messageId));
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
export function attachToolConfirmsToSubAgents(messages2) {
  const result = [];
  for (const msg of messages2) {
    if (
      msg.type === "tool_confirm_ask" &&
      (!msg.resolved || msg.toolConfirmDecision === "reject")
    ) {
      const owner = findToolConfirmOwningSubAgent(result, msg);
      if (owner) {
        const ownerIndex = result.findIndex((candidate) => candidate.id === owner.id);
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
export function attachQuestionsToSubAgents(messages2) {
  const result = [];
  for (const msg of messages2) {
    if (msg.type !== "question" || !msg.childSessionId) {
      result.push(msg);
      continue;
    }
    let subAgentIndex = -1;
    for (let index2 = result.length - 1; index2 >= 0; index2 -= 1) {
      const candidate = result[index2];
      if (candidate?.type === "sub_agent" && candidate.childSessionId === msg.childSessionId) {
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
export function prepareMainAgentActivityMessages(messages2, showHiddenTools) {
  if (showHiddenTools) return [...messages2];
  const getMessageToolName = (message2) => {
    if (message2.type !== "tool") return void 0;
    return message2.toolName?.trim() || parseToolResult(message2.content).name;
  };
  const retained = messages2.filter((message2) => {
    if (message2.type === "text" && !message2.content.trim() && !message2.attachments?.length) {
      return false;
    }
    if (message2.type !== "tool") return true;
    const toolName2 = getMessageToolName(message2);
    return isMainAgentThinkingTool(toolName2) || getToolLabelId(toolName2) !== "silent";
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
  const visible = filterSupersededTransientTools(normalized, getMessageToolName);
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
      (message2.subMessages ? subMessagesHaveCanvasContinuation(message2.subMessages) : false),
  );
}
export function messageHasCanvasContinuation(message2) {
  if (message2.type === "tool") return message2.interruption === "canvas_continuation";
  if (message2.type === "sub_agent") {
    return subMessagesHaveCanvasContinuation(message2.subMessages ?? []);
  }
  return message2.type === "cancelled" && message2.generationContinuesOnCanvas === true;
}
export function collectCanvasContinuationTargets(messages2) {
  const targets = new Map();
  const collect = (message2) => {
    if (message2.type === "tool" && message2.interruption === "canvas_continuation") {
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
export function isMainAgentProgressMessage(message2) {
  if (!message2) return false;
  if (message2.type === "thinking") return true;
  if (message2.type !== "tool") return false;
  if (message2.toolStatus === "error") return false;
  const toolName2 = message2.toolName?.trim() || parseToolResult(message2.content).name;
  return isTransientTool(toolName2) || categorizeToolAction(toolName2) === "search";
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
export function filterResolvedRetryErrors(messages2) {
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
export function groupIntoTurns(messages2) {
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
export function findLatestAssistantActionTurnIndex(turns, activeTurnPending) {
  for (let index2 = turns.length - 1; index2 >= 0; index2 -= 1) {
    const turn = turns[index2];
    if (!turn) continue;
    const isActiveTurn = index2 === turns.length - 1;
    if (isActiveTurn && activeTurnPending) continue;
    if (collectAssistantCopyText(turn.responses.flat())) return index2;
  }
  return -1;
}
export function getTurnKey(turn, index2) {
  return turn?.user?.id ?? turn?.responses.find((group) => group[0])?.[0]?.id ?? `turn-${index2}`;
}
export function isPendingSubAgentDispatch(msg, showHiddenTools = false) {
  if (msg.type !== "sub_agent" || msg.resolved || msg.cancelled) return false;
  if (showHiddenTools) return (msg.subMessages?.length ?? 0) === 0;
  return (
    filterSilentTools(msg.subMessages ?? [], (subMessage) =>
      subMessage.type === "tool" ? parseToolResult(subMessage.content).name : void 0,
    ).length === 0
  );
}
export function findPendingTaskDispatch(messages2, showHiddenTools = false) {
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
          (!task.childSessionId || message2.childSessionId === task.childSessionId),
      );
    return !child || isPendingSubAgentDispatch(child, showHiddenTools) ? task : void 0;
  }
  return void 0;
}
export function TaskDispatchIndicator() {
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
export function measureMessageTurnElement(element2, isPresented) {
  if (!isPresented) {
    return MESSAGE_TURN_HEIGHT_CACHE.get(element2) ?? MESSAGE_TURN_ESTIMATED_HEIGHT;
  }
  const measured = Math.round(element2.getBoundingClientRect().height);
  if (measured > 0) {
    MESSAGE_TURN_HEIGHT_CACHE.set(element2, measured);
    return measured;
  }
  return MESSAGE_TURN_HEIGHT_CACHE.get(element2) ?? MESSAGE_TURN_ESTIMATED_HEIGHT;
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
    createHeicPreviewObjectUrlFromUrl(filename, resolvedUrl).then((previewUrl) => {
      if (!previewUrl) return;
      if (disposed) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      objectUrl = previewUrl;
      setConvertedImageUrl(previewUrl);
    });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename, isHeic, resolvedUrl]);
  const imageUrl =
    att.type === "image" ? (isHeic ? (convertedImageUrl ?? void 0) : resolvedUrl) : void 0;
  const mediaUrl = att.type === "video" || att.type === "audio" ? resolvedUrl : void 0;
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
export function UserAttachmentStrip({ attachments }) {
  const { t: t2 } = useTranslation();
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
