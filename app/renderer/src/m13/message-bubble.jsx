// message-bubble.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  useMentionModels,
  useGatewayUrl,
  ChevronDown,
  useResolveMediaUrl,
  FileTypeIcon,
  classifyFileType,
  ContextMenu,
  Copy,
  Icon,
  Brain,
  Save,
  InlineColorValue,
  useWorkspaceRemoteToolOptional,
} from "../vendor.js";
import { FileKindIcon, ModelTypeIcon } from "../m12/mention-ref-chip.jsx";
import { stripContextPrefix, isRecoveredMessage } from "../m01/myers-line-hunks.js";
import { useMediaActions } from "../m10/use-media-actions.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../m10/new-workspace-dialog.jsx";
import { ConnectorIcon } from "../m10/proxy-detected-toast.jsx";
import { inferArtifactMime } from "../m10/topbar-provider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AudioMessage,
  BillingInsufficientCard,
  CancelledMessage,
  CompactionStatusMessage,
  ConfirmRequest,
  CreditThresholdReminderCard,
  ErrorMessage,
  FileAddedMessage,
  ImageMessage,
  InteractRequest,
  MessageWithdrawn,
  QuestionMessage,
} from "./credit-threshold-reminder-card.jsx";
import { ToolConfirmCard } from "./domestic-param-labels.jsx";
import { MarkdownContent } from "./empty-chat-recommendations.jsx";
import { ExpandableText, ToolCallCard } from "./expandable-text.jsx";
import { useChatPresentation } from "./history-anchor-rail-impl.jsx";
import {
  FILE_TOKEN_CLASS,
  RecoveredMessage,
  SubAgentGroup,
  TOKEN_CLASS,
  TOKEN_ICON_CLASS,
  buildMediaThumbUrl,
  parseRichUserPrompt,
} from "./parse-rich-user-prompt.jsx";
import {
  redactForCurrentRegion,
  replaceConfiguredModelNamesForCurrentRegion,
} from "./resolve-chat-file-reference.js";
function redactRichSegments(segments) {
  return segments.map((segment) => {
    if (segment.type === "text") {
      return {
        ...segment,
        text: redactForCurrentRegion(segment.text),
      };
    }
    if (segment.type === "model") {
      return {
        ...segment,
        name: redactForCurrentRegion(segment.name),
      };
    }
    if (segment.type === "skill") {
      return {
        ...segment,
        name: redactForCurrentRegion(segment.name),
      };
    }
    return segment;
  });
}
function TokenIcon({ thumbUrl, children: children2 }) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  return (
    <span className={TOKEN_ICON_CLASS} aria-hidden="true">
      {thumbUrl && failedUrl !== thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(thumbUrl)}
        />
      ) : (
        children2
      )}
    </span>
  );
}
function FileSegment({ segment }) {
  const gatewayUrl2 = useGatewayUrl();
  const thumbUrl = buildMediaThumbUrl(gatewayUrl2, segment.kind, segment.path);
  return (
    <span
      className={`hl-mention-file ${FILE_TOKEN_CLASS}`}
      data-mention-kind={segment.kind}
      data-mention-name={segment.name}
    >
      <TokenIcon thumbUrl={thumbUrl}>
        {segment.kind === "image" || segment.kind === "video" || segment.kind === "audio" ? (
          <FileKindIcon kind={segment.kind} />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: segment.name,
            })}
            size={14}
            decorative={true}
          />
        )}
      </TokenIcon>
      @{segment.name}
    </span>
  );
}
function ModelSegment({ segment }) {
  return (
    <span
      className={`hl-mention-model ${TOKEN_CLASS}`}
      data-mention-kind="model"
      data-mention-name={segment.name}
    >
      <TokenIcon thumbUrl={segment.thumbUrl}>
        <ModelTypeIcon mediaType={segment.mediaType} className="h-3 w-3" />
      </TokenIcon>
      @{segment.name}
    </span>
  );
}
function ConnectorSegment({ segment }) {
  return (
    <span
      className="hl-mention-connector inline-flex min-h-5 max-w-full items-center gap-1 rounded-sm bg-muted py-0 pr-1.5 pl-1 align-middle leading-5 text-foreground"
      data-mention-kind="connector"
      data-mention-name={segment.name}
    >
      <ConnectorIcon iconUrl={segment.iconUrl} size="inline" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{segment.name}</span>
    </span>
  );
}
function renderSegments(segments) {
  return segments.map((segment) => {
    if (segment.type === "text") return <span key={segment.key}>{segment.text}</span>;
    if (segment.type === "color") {
      return (
        <InlineColorValue key={segment.key} value={segment.value}>
          {segment.text}
        </InlineColorValue>
      );
    }
    if (segment.type === "skill") {
      return (
        <span
          key={segment.key}
          className="hl-skill inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-sm bg-brand-accent/12"
          style={{
            // 深紫近黑文字: foreground 80% + brand-accent 20%。
            // light 下混出深紫近黑;dark 下混出浅紫近白,自动跟主题切换。
            color: "color-mix(in srgb, var(--foreground) 80%, var(--brand-accent) 20%)",
          }}
        >
          /{segment.name}
        </span>
      );
    }
    if (segment.type === "model") return <ModelSegment key={segment.key} segment={segment} />;
    if (segment.type === "connector") {
      return <ConnectorSegment key={segment.key} segment={segment} />;
    }
    return <FileSegment key={segment.key} segment={segment} />;
  });
}
export const RichUserPromptContent = reactExports.memo(function RichUserPromptContent2({
  content: content2,
  collapsible = false,
  className,
}) {
  const { t: t2 } = useTranslation();
  const isPresented = useChatPresentation();
  const { data: mentionModels = [] } = useMentionModels();
  const segments = reactExports.useMemo(
    () => redactRichSegments(parseRichUserPrompt(content2, mentionModels)),
    [content2, mentionModels],
  );
  const [expanded, setExpanded] = reactExports.useState(false);
  const contentRef = reactExports.useRef(null);
  const [overflows, setOverflows] = reactExports.useState(false);
  reactExports.useLayoutEffect(() => {
    if (!collapsible || expanded || !isPresented) return;
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      if (el.scrollHeight <= 0 || el.clientHeight <= 0) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [collapsible, expanded, isPresented]);
  const baseClass = `rich-user-prompt whitespace-pre-wrap break-words ${className ?? ""}`.trim();
  const clampClass = collapsible
    ? expanded
      ? `${baseClass} max-h-60 overflow-y-auto`
      : `${baseClass} line-clamp-2`
    : baseClass;
  return (
    <>
      <div
        ref={contentRef}
        data-text-selectable="true"
        className={clampClass}
        style={
          collapsible && !expanded && overflows
            ? {
                WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent)",
                maskImage: "linear-gradient(to bottom, black 50%, transparent)",
              }
            : void 0
        }
      >
        {renderSegments(segments)}
      </div>
      {collapsible && (overflows || expanded) && (
        <button
          type="button"
          className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v2) => !v2)}
        >
          {expanded ? t2("chat.collapse") : t2("chat.expand")}
        </button>
      )}
    </>
  );
});
RichUserPromptContent.displayName = "RichUserPromptContent";
const MAX_VISIBLE_CARDS$1 = 3;
export function SentAnnotationCards({ annotations }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  if (annotations.length === 0) return null;
  const visible = expanded ? annotations : annotations.slice(0, MAX_VISIBLE_CARDS$1);
  const hiddenCount = annotations.length - visible.length;
  return (
    <div
      className="mt-2 w-full min-w-0 rounded-lg border border-border/60 bg-background/50 p-2 text-left"
      data-action-ui-id="chat.sent-annotations"
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1 text-caption-11 font-medium text-muted-foreground">
        <span>{t2("chat.sentAnnotations.title", "已提交批注")}</span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-caption-10 text-primary">
          {annotations.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {visible.map((annotation) => (
          <div
            key={annotation.id}
            className="rounded-md bg-muted-foreground/5 px-2 py-1.5"
            data-annotation-card-sent={annotation.id}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-caption-10 font-medium text-primary">
                {annotation.seq}
              </span>
              <div className="min-w-0 flex-1">
                {annotation.quote && (
                  <div className="truncate text-caption-11 text-muted-foreground">
                    {annotation.quote}
                  </div>
                )}
                <div className="mt-0.5 line-clamp-2 text-body-13 text-foreground">
                  {annotation.comment}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(hiddenCount > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 px-1 text-caption-11 text-muted-foreground transition-colors hover:text-foreground"
          data-action-ui-id="chat.sent-annotations-toggle"
        >
          {expanded
            ? t2("chat.collapse", "收起")
            : t2("chat.sentAnnotations.showMore", "还有 {{count}} 条", {
                count: hiddenCount,
              })}
        </button>
      )}
    </div>
  );
}
const BILLING_ERROR_CODE_PATTERN =
  /`{1,3}billing_insufficient_balance`{1,3}|\[billing_insufficient_balance\]|billing_insufficient_balance/gi;
function RemoteToolGuiLink() {
  const remoteTool = useWorkspaceRemoteToolOptional();
  const { t: t2 } = useTranslation();
  if (!remoteTool?.pendingRemoteToolRequest || remoteTool.remoteToolRequest) return null;
  return (
    <button
      type="button"
      className="mt-1 text-body-13 text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
      onClick={remoteTool.openPendingRemoteTool}
      data-action-ui-id="chat.open-remote-tool"
    >
      {t2("chat.openRemoteToolUi", {
        defaultValue: "Open {{toolName}} GUI",
        toolName: redactForCurrentRegion(remoteTool.pendingRemoteToolRequest.toolName),
      })}
    </button>
  );
}
const TextMessage = reactExports.memo(function TextMessage2({ msg, isLast, isStreaming = false }) {
  const { t: t2 } = useTranslation();
  const { data: mentionModels = [] } = useMentionModels();
  const displayContent = reactExports.useMemo(() => {
    if (msg.role === "user") return msg.content ?? "";
    const billingRedacted = (msg.content ?? "").replace(
      BILLING_ERROR_CODE_PATTERN,
      t2("chat.billingInsufficient.title"),
    );
    return replaceConfiguredModelNamesForCurrentRegion(billingRedacted, mentionModels);
  }, [mentionModels, msg.content, msg.role, t2]);
  if (msg.role === "user") {
    const annotations = msg.type === "text" ? msg.documentAnnotations : void 0;
    const recovered = stripContextPrefix(msg.content ?? "").trimStart();
    if (isRecoveredMessage(recovered)) {
      return <RecoveredMessage content={recovered} />;
    }
    return (
      <div className="text-body-14 text-foreground min-w-0">
        {msg.content ? (
          <RichUserPromptContent content={msg.content} />
        ) : (
          !annotations?.length && (
            <span className="text-muted-foreground italic">{t2("chat.noContent")}</span>
          )
        )}
        {annotations && annotations.length > 0 && <SentAnnotationCards annotations={annotations} />}
      </div>
    );
  }
  return (
    <div className="text-body-15 text-foreground min-w-0 overflow-hidden">
      {displayContent ? (
        <MarkdownContent content={displayContent} isStreaming={isStreaming} />
      ) : (
        <span className="text-muted-foreground italic">{t2("chat.noContent")}</span>
      )}
      {isLast && <RemoteToolGuiLink />}
    </div>
  );
});
function stripMdMarkers(text2) {
  return text2.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
}
function ThinkingBlock({ msg, isStreaming }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(!!isStreaming);
  const content2 = stripMdMarkers(redactForCurrentRegion(msg.thinkingContent ?? msg.content));
  const hasContent2 = !!content2;
  reactExports.useEffect(() => {
    if (!isStreaming) setExpanded(false);
  }, [isStreaming]);
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="shrink-0 size-5 flex items-center justify-center text-muted-foreground">
          <Brain size={18} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="text-muted-foreground font-normal truncate">
            {isStreaming ? t2("chat.thinking") : t2("chat.thought")}
          </span>
          <Icon
            icon={ChevronDown}
            size="md"
            strokeWidth={1.5}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
          />
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="ml-[9px] border-l-2 border-border-soft pl-3 pt-2 min-w-0">
            <div className="text-body-14 text-muted-foreground">
              {hasContent2 ? (
                <ExpandableText lineClamp={8}>{content2}</ExpandableText>
              ) : (
                <p className="whitespace-pre-wrap break-words">{t2("chat.noReasoningContent")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function VideoMessage({ msg }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(msg.url) ?? msg.content;
  const { copyPath, saveAs } = useMediaActions();
  if (error || !src) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t2("chat.failedToLoadVideo")}
      </div>
    );
  }
  const mime = inferArtifactMime(src, "video");
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger render={<div />}>
          <video
            data-action-ui-id="chat-artifact-video"
            data-artifact-type="video"
            data-artifact-path={src}
            data-artifact-mime={mime}
            src={src}
            controls={true}
            poster={msg.metadata?.poster}
            className="h-auto max-w-full rounded-lg"
            style={{
              maxWidth: 400,
            }}
            onError={() => setError(true)}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => copyPath(src)}>
            <Copy />
            {t2("chat.copyUrl")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => saveAs(src)}>
            <Save />
            {t2("common.saveAs")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
        {msg.agent && (
          <span>
            {t2("chat.generatedBy", {
              agent: msg.agent,
            })}
          </span>
        )}
        {msg.metadata?.model && (
          <span>
            {t2("chat.modelLabel", {
              model: msg.metadata.model,
            })}
          </span>
        )}
        {msg.metadata?.duration && (
          <span>
            {t2("chat.durationLabel", {
              duration: msg.metadata.duration,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
export const MessageBubble = reactExports.memo(function MessageBubble2({
  msg,
  isStreaming,
  onSend,
  onRetry,
  retrying,
  isLast,
  repeatCount,
}) {
  switch (msg.type) {
    case "text":
      return <TextMessage msg={msg} isLast={isLast} isStreaming={isStreaming} />;
    case "thinking":
      return <ThinkingBlock msg={msg} isStreaming={isStreaming} />;
    case "tool":
      return <ToolCallCard msg={msg} repeatCount={repeatCount} />;
    case "error":
      return <ErrorMessage msg={msg} onRetry={onRetry} retrying={retrying} />;
    case "interact":
      return <InteractRequest msg={msg} onSend={onSend} />;
    case "confirm":
      return <ConfirmRequest msg={msg} onSend={onSend} />;
    case "credit_threshold":
      if (msg.kind === "insufficient") {
        return (
          <BillingInsufficientCard
            estimate={{
              estimatedCredits: msg.estimatedCredits,
              currentCredits: msg.currentCredits,
              shortfallCredits: msg.shortfallCredits,
            }}
            expiresAt={msg.expiresAt}
            resolved={msg.resolved}
            settlementStatus={msg.settlementStatus}
            refreshRevision={msg.revision}
            retryResetMs={3e3}
            onRetry={() => {
              if (!onSend || msg.resolved) return false;
              const reply = {
                type: "credit_threshold_reply",
                id: msg.requestId,
                session_id: msg.sessionId,
                decision: "continue",
                ...(msg.batchId
                  ? {
                      batch_id: msg.batchId,
                    }
                  : {}),
              };
              return onSend(reply) !== false;
            }}
          />
        );
      }
      return (
        <CreditThresholdReminderCard
          estimate={{
            estimatedCredits: msg.estimatedCredits,
            currentCredits: msg.currentCredits,
            remainingCredits: msg.remainingCredits,
            thresholdCredits: msg.thresholdCredits,
            batchId: msg.batchId,
            batchItems: msg.batchItems,
            maxSelectableCredits: msg.maxSelectableCredits,
            selectedItemIds: msg.selectedItemIds,
          }}
          expiresAt={msg.expiresAt}
          resolved={msg.resolved}
          decision={msg.decision}
          settlementStatus={msg.settlementStatus}
          awaitSettlement={true}
          onCancel={() => {
            if (!onSend || msg.resolved) return;
            const reply = {
              type: "credit_threshold_reply",
              id: msg.requestId,
              session_id: msg.sessionId,
              decision: "cancel",
              ...(msg.batchId
                ? {
                    batch_id: msg.batchId,
                  }
                : {}),
            };
            return onSend(reply) !== false;
          }}
          onContinue={(selectedItemIds) => {
            if (!onSend || msg.resolved) return;
            const reply = {
              type: "credit_threshold_reply",
              id: msg.requestId,
              session_id: msg.sessionId,
              decision: "continue",
              ...(msg.batchId
                ? {
                    batch_id: msg.batchId,
                  }
                : {}),
              ...(msg.batchId && selectedItemIds
                ? {
                    selected_item_ids: [...selectedItemIds],
                  }
                : {}),
            };
            return onSend(reply) !== false;
          }}
        />
      );
    case "question":
      return <QuestionMessage msg={msg} />;
    case "image":
      return <ImageMessage msg={msg} />;
    case "video":
      return <VideoMessage msg={msg} />;
    case "audio":
      return <AudioMessage msg={msg} />;
    case "sub_agent":
      return <SubAgentGroup msg={msg} onSend={onSend} />;
    case "file_added":
      return <FileAddedMessage msg={msg} />;
    case "withdrawn":
      return <MessageWithdrawn reason={msg.reason} />;
    case "cancelled":
      return <CancelledMessage />;
    case "compaction_status":
      return <CompactionStatusMessage message={msg} />;
    case "tool_confirm_ask":
      if (msg.resolved) return null;
      return onSend ? <ToolConfirmCard message={msg} onSend={onSend} /> : null;
    default:
      return null;
  }
});
