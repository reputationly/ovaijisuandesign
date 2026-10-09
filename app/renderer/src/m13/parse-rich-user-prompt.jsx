// parse-rich-user-prompt.jsx
import { reactExports, useTranslation, ChevronDown, Scissors, NotebookPen, Bot, RotateCcw } from "../vendor.js";
import { useDebugFlag, DEBUG_FLAGS } from "../m15/create-visible-preview-tabs-store.js";
import { withThumbnailWidth } from "../m15/deferred-thumbnail-image-generation.jsx";
import { Icon } from "../m15/graph.jsx";
import { Clapperboard, MessageSquareQuote, FileText } from "../m15/parse-item.jsx";
import { groupIntoActivityGroups } from "../m15/parse-timeline-operations.js";
import { categorizeToolAction } from "../m15/save-chat-rating.js";
import { connectorReferenceFromServerName } from "../m15/use-mention-models.jsx";
import { findInlineVisualTokens } from "../m12/attachment-preview.jsx";
import { findAllMentions } from "../m01/table-document-to-llm-content.js";
import {
  isRecoveredMessage,
  AGENT_LABELS,
  stripRecoveredPrefix,
  parseConnectorMentionAt,
} from "../m01/myers-line-hunks.js";
import { subMessageSemanticKey } from "../m08/part-store.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  IN_PROGRESS_AGENT_KEYS,
  SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH,
  SubAudio,
  SubImage,
  SubVideo,
  collapseReplayedSubMessageSequences,
  dropResumePrompts,
  subAgentHasError,
} from "./collapse-replayed-sub-message-sequences.jsx";
import {
  ActivityGroup,
  QuestionMessage,
  StreamingLabel,
} from "./credit-threshold-reminder-card.jsx";
import { ToolConfirmCard } from "./domestic-param-labels.jsx";
import { MarkdownContent } from "./empty-chat-recommendations.jsx";
import { ExpandableText, ToolCallCard } from "./expandable-text.jsx";
import { filterSilentTools, isTransientTool } from "./media-model-selector.jsx";
import { useIsChildRecovering } from "./mode-selector.jsx";
import { getStreamingAction, subMessageToChatMessage } from "./parse-batch-items.jsx";
import { redactForCurrentRegion } from "./resolve-chat-file-reference.js";
import { filterSupersededTransientTools, parseToolResult } from "./use-chat-rating.js";
function dedupeReplayedSubMessages(messages2) {
  const seen2 = new Set();
  return messages2.filter((message2) => {
    const key2 = subMessageSemanticKey(message2);
    if (seen2.has(key2)) return false;
    seen2.add(key2);
    return true;
  });
}
function keepLatestSubAgentThinking(messages2) {
  let latestThinkingIndex = -1;
  for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
    if (messages2[index2]?.type === "thinking") {
      latestThinkingIndex = index2;
      break;
    }
  }
  if (latestThinkingIndex < 0) return messages2;
  return messages2.filter(
    (message2, index2) => message2.type !== "thinking" || index2 === latestThinkingIndex,
  );
}
function getInitialExpandedState(collapsed, resolved) {
  return !collapsed && !resolved;
}
function pendingToolConfirmIds(messages2) {
  return messages2.flatMap((message2) => {
    if (message2.type === "tool_confirm_ask") {
      return !message2.resolved && !message2.expired ? [message2.requestId ?? message2.id] : [];
    }
    return message2.type === "sub_agent" ? pendingToolConfirmIds(message2.subMessages ?? []) : [];
  });
}
function IndentL({ children: children2 }) {
  return <div className="ml-[9px] pl-3 min-w-0">{children2}</div>;
}
function SubAgentIcon({ agentKey, agentLabel }) {
  const identity2 = `${agentKey} ${agentLabel}`.toLocaleLowerCase();
  const Icon$12 =
    identity2.includes("director") || identity2.includes("导演")
      ? Clapperboard
      : identity2.includes("dialogue") || identity2.includes("script") || identity2.includes("台词")
        ? MessageSquareQuote
        : identity2.includes("editing") ||
            identity2.includes("editor") ||
            identity2.includes("剪辑")
          ? Scissors
          : identity2.includes("summary") ||
              identity2.includes("brief") ||
              identity2.includes("简介")
            ? NotebookPen
            : Bot;
  return <Icon icon={Icon$12} size="md" strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH} />;
}
export function SubAgentGroup({ msg, onSend }) {
  const { t: t2 } = useTranslation();
  const agentKey = msg.agent ?? "";
  const agentLabel =
    t2(`chat.agentLabel.${agentKey}`, {
      defaultValue: "",
    }) ||
    AGENT_LABELS[agentKey] ||
    msg.agent ||
    t2("chat.agentFallback");
  const subs = msg.subMessages ?? [];
  const showHiddenTools = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const visibleSubs = reactExports.useMemo(() => {
    const productVisible = showHiddenTools
      ? dropResumePrompts(subs)
      : filterSupersededTransientTools(
          dropResumePrompts(
            filterSilentTools(subs, (s2) =>
              s2.type === "tool" ? parseToolResult(s2.content).name : void 0,
            ),
          ),
          (s2) => (s2.type === "tool" ? parseToolResult(s2.content).name : void 0),
        );
    const normalized = collapseReplayedSubMessageSequences(productVisible);
    const deduped =
      !showHiddenTools && IN_PROGRESS_AGENT_KEYS.has(agentKey)
        ? dedupeReplayedSubMessages(normalized)
        : normalized;
    return keepLatestSubAgentThinking(deduped);
  }, [agentKey, subs, showHiddenTools]);
  const asChatMessages = reactExports.useMemo(
    () => visibleSubs.map(subMessageToChatMessage),
    [visibleSubs],
  );
  const grouped = reactExports.useMemo(
    () => groupIntoActivityGroups(asChatMessages, showHiddenTools),
    [asChatMessages, showHiddenTools],
  );
  const subLookup = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const s2 of visibleSubs) map3.set(s2.id, s2);
    return map3;
  }, [visibleSubs]);
  const isStreaming = !msg.resolved && !msg.cancelled;
  const streamingAction = reactExports.useMemo(
    () => (isStreaming ? getStreamingAction(asChatMessages) : void 0),
    [isStreaming, asChatMessages],
  );
  const inlineStreamingTool =
    streamingAction?.type === "tool" &&
    (IN_PROGRESS_AGENT_KEYS.has(agentKey) || isTransientTool(streamingAction.content));
  const pinnedStreamingAction =
    inlineStreamingTool ||
    (streamingAction?.type === "tool" &&
      ["canvas", "connector"].includes(categorizeToolAction(streamingAction.content)))
      ? void 0
      : streamingAction;
  const hasError = reactExports.useMemo(() => subAgentHasError(subs), [subs]);
  const isRecovering = useIsChildRecovering(msg.childSessionId);
  const status = msg.cancelled
    ? "cancelled"
    : isRecovering
      ? "recovering"
      : isStreaming
        ? "running"
        : hasError
          ? "error"
          : "done";
  const statusLabel2 =
    status === "running" && IN_PROGRESS_AGENT_KEYS.has(agentKey)
      ? t2("chat.subAgentStatus.running")
      : t2(`gen.status.${status}`);
  const statusClass =
    status === "error"
      ? "text-destructive/50"
      : status === "running" || status === "recovering"
        ? "text-tertiary text-shimmer"
        : "text-tertiary";
  const pendingConfirmKey = JSON.stringify(pendingToolConfirmIds(subs));
  const hasPendingConfirm = pendingConfirmKey !== "[]";
  const [expanded, setExpanded] = reactExports.useState(
    () => hasPendingConfirm || getInitialExpandedState(msg.collapsed, msg.resolved),
  );
  reactExports.useEffect(() => {
    if (pendingConfirmKey !== "[]") setExpanded(true);
    else if (msg.collapsed || msg.resolved) setExpanded(false);
  }, [msg.collapsed, msg.resolved, pendingConfirmKey]);
  const fallbackTask = msg.task?.trim();
  const hasExpandedContent = grouped.length > 0 || !!pinnedStreamingAction || !!fallbackTask;
  return (
    <div data-action-ui-id="chat-sub-agent-group" className="min-w-0 flex flex-col">
      <button
        type="button"
        className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left text-muted-foreground transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        onClick={() => setExpanded((v2) => !v2)}
        aria-expanded={expanded}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <SubAgentIcon agentKey={agentKey} agentLabel={agentLabel} />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="truncate font-normal">{agentLabel}</span>
          <span
            data-action-ui-id={status === "done" ? "chat-sub-agent-done" : void 0}
            className={`truncate ${statusClass}`}
          >
            {statusLabel2}
          </span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
          className={`shrink-0 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded && hasExpandedContent ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div
            data-action-ui-id="chat-sub-agent-messages"
            className="relative flex flex-col gap-2 pt-3"
          >
            {expanded && hasExpandedContent && (
              <span
                aria-hidden="true"
                data-action-ui-id="chat-timeline-detail-rail"
                className="absolute left-[7px] top-3 bottom-0 w-[var(--brutalist-border-width)] bg-tertiary/25 pointer-events-none"
              />
            )}
            {pinnedStreamingAction && (
              <IndentL showCorner={true}>
                <div
                  data-sub-agent-pinned-streaming={true}
                  className="flex items-center gap-2 text-body-14 text-muted-foreground"
                >
                  <StreamingLabel msg={pinnedStreamingAction} />
                </div>
              </IndentL>
            )}
            {!pinnedStreamingAction && grouped.length === 0 && fallbackTask && (
              <IndentL showCorner={true}>
                <SubTextBlock
                  sub={{
                    id: `${msg.id}__task`,
                    type: "text",
                    content: fallbackTask,
                  }}
                />
              </IndentL>
            )}
            {grouped.map((node2, nIdx) => (
              <IndentL key={nodeKey(node2, nIdx)} showCorner={!pinnedStreamingAction && nIdx === 0}>
                <SubGroupedNode
                  node={node2}
                  subLookup={subLookup}
                  isStreaming={isGroupedNodeStreaming(
                    node2,
                    nIdx,
                    grouped.length,
                    isStreaming,
                    pinnedStreamingAction?.id,
                  )}
                  onSend={onSend}
                  showStreamingLabel={!IN_PROGRESS_AGENT_KEYS.has(agentKey)}
                />
              </IndentL>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function nodeKey(node2, idx) {
  if (node2.kind === "activity-group") return node2.items[0]?.id ?? `ag-${idx}`;
  return node2.msg.id;
}
function isGroupedNodeStreaming(
  node2,
  index2,
  total,
  isSubAgentStreaming,
  pinnedStreamingActionId,
) {
  if (!isSubAgentStreaming) return false;
  if (node2.kind === "activity-group") {
    if (
      pinnedStreamingActionId &&
      node2.items.some((item) => item.id === pinnedStreamingActionId)
    ) {
      return false;
    }
    if (node2.aggregatedStatus === "running" || node2.aggregatedStatus === "pending") return true;
  }
  return !pinnedStreamingActionId && index2 === total - 1;
}
function SubGroupedNode({ node: node2, subLookup, isStreaming, onSend, showStreamingLabel }) {
  if (node2.kind === "activity-group") {
    return (
      <ActivityGroup
        data={node2}
        isStreaming={isStreaming}
        onSend={onSend}
        showRail={false}
        showThinkingSummary={false}
        showStreamingLabel={showStreamingLabel}
      />
    );
  }
  if (node2.msg.type === "tool" && node2.msg.content === "question") {
    return <ToolCallCard msg={node2.msg} questionDefaultExpanded={true} />;
  }
  if (node2.msg.type === "tool_confirm_ask") {
    return onSend ? (
      <div data-message-id={node2.msg.id}>
        <ToolConfirmCard message={node2.msg} onSend={onSend} embedded={true} />
      </div>
    ) : null;
  }
  const sub = subLookup.get(node2.msg.id);
  if (!sub) return null;
  if (sub.type === "image") return <SubImage sub={sub} />;
  if (sub.type === "video") return <SubVideo sub={sub} />;
  if (sub.type === "audio") return <SubAudio sub={sub} />;
  if (sub.type === "question") {
    const question2 = subMessageToChatMessage(sub);
    return question2.type === "question" ? <QuestionMessage msg={question2} /> : null;
  }
  if (sub.type === "sub_agent") return <NestedSubAgent sub={sub} onSend={onSend} />;
  return <SubTextBlock sub={sub} />;
}
function NestedSubAgent({ sub, onSend }) {
  const { t: t2 } = useTranslation();
  const pendingConfirmKey = JSON.stringify(pendingToolConfirmIds(sub.subMessages ?? []));
  const [expanded, setExpanded] = reactExports.useState(
    () => pendingConfirmKey !== "[]" || getInitialExpandedState(sub.collapsed, sub.resolved),
  );
  const agentKey = sub.agent ?? "";
  const agentLabel =
    t2(`chat.agentLabel.${agentKey}`, {
      defaultValue: "",
    }) ||
    AGENT_LABELS[agentKey] ||
    sub.agent ||
    t2("chat.agentFallback");
  const children2 = sub.subMessages ?? [];
  const showHiddenTools = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const visibleChildren = reactExports.useMemo(() => {
    const productVisible = showHiddenTools
      ? dropResumePrompts(children2)
      : filterSupersededTransientTools(
          dropResumePrompts(
            filterSilentTools(children2, (s2) =>
              s2.type === "tool" ? parseToolResult(s2.content).name : void 0,
            ),
          ),
          (s2) => (s2.type === "tool" ? parseToolResult(s2.content).name : void 0),
        );
    const normalized = collapseReplayedSubMessageSequences(productVisible);
    const deduped =
      !showHiddenTools && IN_PROGRESS_AGENT_KEYS.has(agentKey)
        ? dedupeReplayedSubMessages(normalized)
        : normalized;
    return keepLatestSubAgentThinking(deduped);
  }, [agentKey, children2, showHiddenTools]);
  const asChatMessages = reactExports.useMemo(
    () => visibleChildren.map(subMessageToChatMessage),
    [visibleChildren],
  );
  const grouped = reactExports.useMemo(
    () => groupIntoActivityGroups(asChatMessages, showHiddenTools),
    [asChatMessages, showHiddenTools],
  );
  const subLookup = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const s2 of visibleChildren) map3.set(s2.id, s2);
    return map3;
  }, [visibleChildren]);
  const isStreaming = !sub.resolved;
  const fallbackTask = sub.task?.trim();
  reactExports.useEffect(() => {
    if (pendingConfirmKey !== "[]") setExpanded(true);
    else if (sub.collapsed || sub.resolved) setExpanded(false);
  }, [sub.collapsed, sub.resolved, pendingConfirmKey]);
  const streamingAction = reactExports.useMemo(
    () => (isStreaming ? getStreamingAction(asChatMessages) : void 0),
    [isStreaming, asChatMessages],
  );
  const inlineStreamingTool =
    streamingAction?.type === "tool" &&
    (IN_PROGRESS_AGENT_KEYS.has(agentKey) || isTransientTool(streamingAction.content));
  const pinnedStreamingAction =
    inlineStreamingTool ||
    (streamingAction?.type === "tool" &&
      ["canvas", "connector"].includes(categorizeToolAction(streamingAction.content)))
      ? void 0
      : streamingAction;
  const hasExpandedContent = grouped.length > 0 || !!pinnedStreamingAction || !!fallbackTask;
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left text-muted-foreground transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <SubAgentIcon agentKey={agentKey} agentLabel={agentLabel} />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="truncate font-normal">{agentLabel}</span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
          className={`shrink-0 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded && hasExpandedContent ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="flex flex-col gap-2 pt-2">
            {pinnedStreamingAction && (
              <IndentL showCorner={true}>
                <div
                  data-sub-agent-pinned-streaming={true}
                  className="flex items-center gap-2 text-body-14 text-muted-foreground"
                >
                  <StreamingLabel msg={pinnedStreamingAction} />
                </div>
              </IndentL>
            )}
            {!pinnedStreamingAction && grouped.length === 0 && fallbackTask && (
              <IndentL showCorner={true}>
                <SubTextBlock
                  sub={{
                    id: `${sub.id}__task`,
                    type: "text",
                    content: fallbackTask,
                  }}
                />
              </IndentL>
            )}
            {grouped.map((node2, nIdx) => (
              <IndentL key={nodeKey(node2, nIdx)} showCorner={!pinnedStreamingAction && nIdx === 0}>
                <SubGroupedNode
                  node={node2}
                  subLookup={subLookup}
                  isStreaming={isGroupedNodeStreaming(
                    node2,
                    nIdx,
                    grouped.length,
                    isStreaming,
                    pinnedStreamingAction?.id,
                  )}
                  onSend={onSend}
                  showStreamingLabel={!IN_PROGRESS_AGENT_KEYS.has(agentKey)}
                />
              </IndentL>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function SubTextBlock({ sub }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const rawContent = sub.content ?? "";
  const isRecovered = isRecoveredMessage(rawContent);
  const displayContent = redactForCurrentRegion(
    isRecovered ? stripRecoveredPrefix(rawContent) : rawContent,
  );
  if (!displayContent) return null;
  const DisplayIcon = isRecovered ? RotateCcw : FileText;
  const label = isRecovered ? t2("chat.subAgentRecovered") : t2("chat.subAgentDetail");
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-0 text-left cursor-pointer"
        onClick={() => setExpanded((v2) => !v2)}
        aria-expanded={expanded}
      >
        <span className="shrink-0 size-4 flex items-center justify-center text-muted-foreground">
          <Icon icon={DisplayIcon} size="md" strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH} />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="text-muted-foreground font-normal truncate">{label}</span>
          <ChevronDown
            size={16}
            strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
          />
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="ml-[9px] pl-3 pt-2 min-w-0 text-muted-foreground">
            <ExpandableText richContent={true} lineClamp={8}>
              <MarkdownContent content={displayContent} />
            </ExpandableText>
          </div>
        </div>
      </div>
    </div>
  );
}
export function RecoveredMessage({ content: content2 }) {
  const headline = stripRecoveredPrefix(content2.split("\n")[0] ?? "")
    .replace(/[:：]\s*$/, "")
    .trim();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 size-5 flex items-center justify-center text-muted-foreground">
        <RotateCcw size={20} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 text-body-14 text-muted-foreground font-normal truncate">
        {headline}
      </span>
    </div>
  );
}
const MENTION_THUMB_PX = 18;
export const TOKEN_CLASS =
  "relative inline-flex min-h-5 items-center align-baseline rounded-sm bg-muted py-px pr-1.5 pl-[26px] leading-4 text-foreground";
export const FILE_TOKEN_CLASS = `${TOKEN_CLASS} max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap [overflow-wrap:normal] [word-break:normal]`;
export const TOKEN_ICON_CLASS =
  "absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center border border-border bg-background bg-center bg-cover text-muted-foreground";
function mentionKindFromPath(path2) {
  const ext = path2.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "heic", "heif"].includes(ext))
    return "image";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (["txt", "md", "json"].includes(ext)) return "text";
  return "other";
}
function basename(path2) {
  return path2.split("/").pop() || path2;
}
export function buildMediaThumbUrl(gatewayUrl2, kind, workspaceRelativePath) {
  if (kind !== "image" && kind !== "video") return null;
  const encoded = workspaceRelativePath.split("/").map(encodeURIComponent).join("/");
  const prefix = kind === "image" ? "/files/" : "/api/thumbnail/";
  const base2 = gatewayUrl2(`${prefix}${encoded}`);
  return withThumbnailWidth(base2, MENTION_THUMB_PX) ?? null;
}
function modelCandidates(models) {
  return models
    .flatMap((model) => [
      {
        token: `model:${model.mention_name ?? model.model_name}`,
        model,
      },
      {
        token: `model:${model.model_name}`,
        model,
      },
      {
        token: `model:${model.id}`,
        model,
      },
      {
        token: model.mention_name ?? model.model_name,
        model,
      },
      {
        token: model.model_name,
        model,
      },
      {
        token: model.display_name,
        model,
      },
      {
        token: model.id,
        model,
      },
    ])
    .filter((entry) => entry.token.length > 0)
    .sort((a2, b3) => b3.token.length - a2.token.length);
}
function findModelAt(text2, atIndex, models) {
  for (const { token: token2, model } of modelCandidates(models)) {
    if (!text2.startsWith(token2, atIndex + 1)) continue;
    const next2 = text2[atIndex + 1 + token2.length];
    if (next2 !== void 0 && !/\s/.test(next2)) continue;
    return {
      end: atIndex + 1 + token2.length,
      segment: {
        type: "model",
        key: `model-${atIndex}-${token2}`,
        name: model.display_name,
        mediaType: model.type,
        thumbUrl: model.icon_url || null,
      },
    };
  }
  const fallback = findAllMentions(text2).find((mention) => mention.start === atIndex);
  if (!fallback?.path.startsWith("model:")) return null;
  const mentionName = fallback.path.slice("model:".length);
  if (!mentionName) return null;
  return {
    end: fallback.end,
    segment: {
      type: "model",
      key: `model-${atIndex}-${fallback.path}`,
      name: mentionName,
      mediaType: null,
      thumbUrl: null,
    },
  };
}
function findConnectorAt(text2, atIndex) {
  const match2 = parseConnectorMentionAt(text2, atIndex);
  if (!match2) return null;
  const connector = connectorReferenceFromServerName(match2.serverName);
  return {
    end: match2.end,
    segment: {
      type: "connector",
      key: `connector-${atIndex}-${connector.serverName}`,
      name: match2.displayName ?? connector.displayName,
      iconUrl: connector.iconUrl,
    },
  };
}
function findSkillAt(text2, slashIndex) {
  const previous2 = text2[slashIndex - 1];
  if (previous2 !== void 0 && !/\s/.test(previous2)) return null;
  const match2 = /^\/([A-Za-z0-9][A-Za-z0-9_-]*)/.exec(text2.slice(slashIndex));
  if (!match2) return null;
  const command2 = match2[0];
  const next2 = text2[slashIndex + command2.length];
  if (next2 !== void 0 && next2 !== " " && next2 !== "/") return null;
  const name2 = command2.slice(1);
  return {
    end: slashIndex + command2.length,
    segment: {
      type: "skill",
      key: `skill-${slashIndex}-${name2}`,
      name: name2,
    },
  };
}
function pushText(segments, content2, start2, end2) {
  if (end2 <= start2) return;
  const text2 = content2.slice(start2, end2);
  const tokens2 = findInlineVisualTokens(text2);
  if (tokens2.length === 0) {
    segments.push({
      type: "text",
      key: `text-${start2}-${end2}`,
      text: text2,
    });
    return;
  }
  let cursor = 0;
  for (const token2 of tokens2) {
    if (token2.start > cursor) {
      segments.push({
        type: "text",
        key: `text-${start2 + cursor}-${start2 + token2.start}`,
        text: text2.slice(cursor, token2.start),
      });
    }
    segments.push({
      type: "color",
      key: `color-${start2 + token2.start}-${token2.value}`,
      value: token2.value,
      text: token2.raw,
    });
    cursor = token2.end;
  }
  if (cursor < text2.length) {
    segments.push({
      type: "text",
      key: `text-${start2 + cursor}-${end2}`,
      text: text2.slice(cursor),
    });
  }
}
export function parseRichUserPrompt(content2, models) {
  const fileMentions = findAllMentions(content2);
  const fileMentionByStart = new Map();
  for (const mention of fileMentions) fileMentionByStart.set(mention.start, mention);
  const segments = [];
  let cursor = 0;
  while (cursor < content2.length) {
    const atIndex = content2.indexOf("@", cursor);
    const slashIndex = content2.indexOf("/", cursor);
    const tokenIndex = [atIndex, slashIndex].filter((idx) => idx >= 0).sort((a2, b3) => a2 - b3)[0];
    if (tokenIndex === void 0) break;
    pushText(segments, content2, cursor, tokenIndex);
    if (tokenIndex === slashIndex) {
      const skill = findSkillAt(content2, tokenIndex);
      if (skill) {
        segments.push(skill.segment);
        cursor = skill.end;
      } else {
        pushText(segments, content2, tokenIndex, tokenIndex + 1);
        cursor = tokenIndex + 1;
      }
      continue;
    }
    const connector = findConnectorAt(content2, tokenIndex);
    if (connector) {
      segments.push(connector.segment);
      cursor = connector.end;
      continue;
    }
    const model = findModelAt(content2, tokenIndex, models);
    if (model) {
      segments.push(model.segment);
      cursor = model.end;
      continue;
    }
    const fileMention = fileMentionByStart.get(tokenIndex);
    if (fileMention?.path) {
      segments.push({
        type: "file",
        key: `file-${tokenIndex}-${fileMention.path}`,
        path: fileMention.path,
        name: basename(fileMention.path),
        kind: mentionKindFromPath(fileMention.path),
      });
      cursor = fileMention.end;
      continue;
    }
    pushText(segments, content2, tokenIndex, tokenIndex + 1);
    cursor = tokenIndex + 1;
  }
  pushText(segments, content2, cursor, content2.length);
  return segments;
}
