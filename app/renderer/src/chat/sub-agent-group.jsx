// sub-agent-group.jsx
import {
  filterSupersededTransientTools,
  parseToolResult,
} from "./use-tool-confirm-settlement.js";
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  jsxRuntimeExports,
  LoaderCircle,
  NotebookPen,
  reactExports,
  RotateCcw,
  Save,
  Scissors,
  ShieldOff,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
import {
  RecoveringChildrenContext,
  useMentionModels,
} from "../generation/use-mention-models.jsx";
import {
  categorizeToolAction,
  getToolLabelId,
  hasSuccessfulMediaOutput,
  isGenerationFailureNonTerminal,
  isToolRecoveredInterrupted,
} from "./has-structured-success-payload.js";
import { collectFromSubMessages } from "./collect-fallback-turn-artifacts.js";
import {
  AGENT_LABELS,
  isRecoveredMessage,
  isResumeChildPrompt,
  stripContextPrefix,
  stripRecoveredPrefix,
} from "../text-editor/build-asr-gateway-request.js";
import { subMessageSemanticKey } from "./attach-handoff-targets-to-sub-messages.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Ban,
  Brain,
  Clapperboard,
  FileText,
  MessageSquareQuote,
  Paperclip,
} from "../media-editing/package.jsx";
import { MarkdownContent } from "../generation/markdown-link.jsx";
import { ExpandableText } from "../text-editor/expandable-text.jsx";
import {
  redactForCurrentRegion,
  replaceConfiguredModelNamesForCurrentRegion,
} from "../generation/replace-configured-model-names-for-current-region.js";
import {
  CapabilitySearchCard,
  parseCapabilitySearchCardResult,
} from "../text-editor/capability-search-card.jsx";
import { QuestionToolCard } from "../text-editor/question-tool-card.jsx";
import { TodoCard } from "../text-editor/todo-card.jsx";
import { GenericToolCard } from "../text-editor/generic-tool-card.jsx";
import { QuestionPromptIcon } from "../workspace/home-service.jsx";
import {
  useResolveMediaUrl,
  withThumbnail,
} from "../workspace/tool-label-definitions.js";
import { inferArtifactMime } from "../workspace/use-project-delete.js";
import { AudioBarsIcon } from "../generation/domestic-param-labels.jsx";
import { displayName } from "../generation/reference-media-strip.jsx";
import { getNodeIdsForAsset } from "../infra/use-canvas-node-assets-store.js";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { cn$2 as mergeClassNames } from "../infra/dialog-content.jsx";
import { useAssets } from "../settings/use-assets.js";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "../generation/use-astra-send-gate.js";
import { splitFilename } from "../canvas/uploading-assets.jsx";
import {
  findAssetForPath,
  toWorkspaceRelativePath,
} from "../media-editing/parse-workspace-path.js";
import { ActivityGroup } from "../team/activity-group.jsx";
import { ToolConfirmCard } from "../generation/tool-confirm-card.jsx";
import {
  DEBUG_FLAGS,
  useDebugFlag,
} from "../workspace/use-deep-link-router.js";
import { groupIntoActivityGroups } from "../media-editing/group-into-activity-groups.js";
import { StreamingLabel } from "../team/streaming-label.jsx";
import {
  filterSilentTools,
  isTransientTool,
} from "../generation/use-tool-confirm-edit-state.js";
import { getStreamingAction } from "../media-editing/turn-artifact-strip.jsx";
import { useNativeViewOcclusion } from "../canvas/separator.jsx";
import { useMediaActions } from "../settings/use-media-actions.js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { useWorkspaceRemoteToolOptional } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { RichUserPromptContent } from "./rich-user-prompt-content.jsx";
import { SentAnnotationCards } from "./sent-annotation-cards.jsx";
import { BillingInsufficientCard } from "../team/billing-insufficient-card.jsx";
import { CreditThresholdReminderCard } from "../team/credit-threshold-reminder-card.jsx";
import { ErrorMessage } from "../team/error-message.jsx";
function useIsChildRecovering(childSessionId) {
  const recovering = reactExports.useContext(RecoveringChildrenContext);
  return childSessionId ? recovering.has(childSessionId) : false;
}
function AudioArtifactChip({
  src: sourcePath,
  originalSrc,
  label,
  dataSlot = "audio-artifact-chip",
  className,
}) {
  const workspaceId = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath(originalSrc, sourcePath),
    [originalSrc, sourcePath],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  const fileName = displayName(originalSrc ?? sourcePath, label, asset?.name);
  const { head: stem, tail: fileExtension } = splitFilename(fileName);
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const handleLocate = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId) return;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId);
    if (nodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(workspaceId, nodeIds);
  }, [asset?.id, workspaceId]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  return (
    <button
      type="button"
      data-action-ui-id="chat-artifact-audio"
      data-slot={dataSlot}
      data-artifact-type="audio"
      data-artifact-path={sourcePath}
      className={mergeClassNames(
        "my-2 flex h-8 w-full items-center gap-1.5 rounded-md bg-foreground/[0.05] pr-2 pl-0.5 text-left transition-colors hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        canDrag && "cursor-grab active:cursor-grabbing",
        className,
      )}
      draggable={canDrag}
      onClick={handleLocate}
      onDragStart={handleDragStart}
      title={fileName}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--chat-audio-artifact-icon-bg)] text-[var(--chat-audio-artifact-icon-fg)]">
        <AudioBarsIcon />
      </span>
      <span className="flex min-w-0 flex-1 items-baseline text-[14px] font-normal leading-none text-foreground/80">
        <span className="min-w-0 truncate">{stem}</span>
        {fileExtension && <span className="shrink-0">{fileExtension}</span>}
      </span>
    </button>
  );
}
function SubImage({ sub: subMessage }) {
  const { t } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(subMessage.url) ?? subMessage.content;
  const thumbSrc = withThumbnail(mediaUrl, 300);
  if (error || !mediaUrl)
    return (
      <div className="text-xs text-muted-foreground">
        {t("chat.imageUnavailable")}
      </div>
    );
  const mime = inferArtifactMime(mediaUrl, "image");
  return (
    <img
      data-action-ui-id="chat-generated-image"
      data-artifact-type="image"
      data-artifact-path={mediaUrl}
      data-artifact-mime={mime}
      src={thumbSrc}
      alt={t("chat.generatedContent")}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}
function SubVideo({ sub: subMessage }) {
  const { t } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(subMessage.url) ?? subMessage.content;
  if (error || !mediaUrl)
    return (
      <div className="text-xs text-muted-foreground">
        {t("chat.videoUnavailable")}
      </div>
    );
  const mime = inferArtifactMime(mediaUrl, "video");
  return (
    // biome-ignore lint/a11y/useMediaCaption: generated video sub-message
    <video
      data-action-ui-id="chat-artifact-video"
      data-artifact-type="video"
      data-artifact-path={mediaUrl}
      data-artifact-mime={mime}
      src={mediaUrl}
      controls={true}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}
function SubAudio({ sub: subMessage }) {
  const { t } = useTranslation();
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(subMessage.url) ?? subMessage.content;
  if (!mediaUrl)
    return (
      <div className="text-xs text-muted-foreground">
        {t("chat.audioUnavailable")}
      </div>
    );
  return <AudioArtifactChip src={mediaUrl} originalSrc={subMessage.url ?? subMessage.content} />;
}
function collectArtifactsFromSubMessages(subs) {
  if (!subs?.length) return [];
  const seen = new Set();
  const artifacts = [];
  collectFromSubMessages(subs, seen, artifacts);
  return artifacts;
}
function isOutputProducingTool(toolName) {
  const labelId = getToolLabelId(toolName);
  return labelId === "mediaGen" || labelId === "contentProcess";
}
function isFailedGenerationResult(result) {
  if (!result) return false;
  try {
    const parsed = JSON.parse(result);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return false;
    const record = parsed;
    const requestGroupUnavailable =
      typeof record.error === "string" &&
      record.error.includes("REQUEST_GROUP_UNAVAILABLE");
    return (
      record.ok === false ||
      record.success === false ||
      record.is_error === true ||
      requestGroupUnavailable
    );
  } catch {
    return /^\s*(?:\w*(?:Error|Exception)\s*:|REQUEST_GROUP_UNAVAILABLE\b)/i.test(
      result,
    );
  }
}
function subAgentHasError(subs) {
  if (!subs?.length) return false;
  let generationError = false;
  let hasOkGeneration = false;
  const walk = (list) => {
    for (const subMessage of list) {
      if (subMessage.type === "tool") {
        const parsed = parseToolResult(subMessage.content);
        if (isOutputProducingTool(parsed.name)) {
          const failedResult = isFailedGenerationResult(parsed.result);
          if (
            (subMessage.toolStatus === "error" || failedResult) &&
            !isGenerationFailureNonTerminal(parsed.result) &&
            !isToolRecoveredInterrupted(parsed.result) &&
            !hasSuccessfulMediaOutput(parsed.result)
          ) {
            generationError = true;
          } else if (subMessage.toolStatus === "ok" && !failedResult) {
            hasOkGeneration = true;
          }
        }
      }
      if (subMessage.subMessages?.length) walk(subMessage.subMessages);
    }
  };
  walk(subs);
  if (!generationError) return false;
  if (hasOkGeneration) return false;
  return collectArtifactsFromSubMessages(subs).length === 0;
}
const SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH = 1.24;
const MIN_REPLAY_SEQUENCE_LENGTH = 3;
const IN_PROGRESS_AGENT_KEYS = new Set(["planner", "executor", "excutor"]);
function dropResumePrompts(subs) {
  return subs.filter((subMessage) => !isResumeChildPrompt(subMessage.content ?? ""));
}
function replayBlocksMatch(keys, firstStart, secondStart, blockLength) {
  for (let offset = 0; offset < blockLength; offset++) {
    if (keys[firstStart + offset] !== keys[secondStart + offset])
      return false;
  }
  return true;
}
function collapseReplayedSubMessageSequences(messages) {
  const keys = messages.map(subMessageSemanticKey);
  const result = [];
  let index = 0;
  while (index < messages.length) {
    let bestLength = 0;
    let bestRepeatCount = 1;
    let bestRemovedCount = 0;
    const maxLength = Math.floor((messages.length - index) / 2);
    for (
      let blockLength = MIN_REPLAY_SEQUENCE_LENGTH;
      blockLength <= maxLength;
      blockLength++
    ) {
      let repeatCount = 1;
      while (
        index + (repeatCount + 1) * blockLength <= messages.length &&
        replayBlocksMatch(
          keys,
          index,
          index + repeatCount * blockLength,
          blockLength,
        )
      ) {
        repeatCount++;
      }
      const removedCount = (repeatCount - 1) * blockLength;
      if (removedCount <= bestRemovedCount) continue;
      bestLength = blockLength;
      bestRepeatCount = repeatCount;
      bestRemovedCount = removedCount;
    }
    if (bestRepeatCount > 1) {
      result.push(...messages.slice(index, index + bestLength));
      index += bestLength * bestRepeatCount;
      continue;
    }
    result.push(messages[index]);
    index++;
  }
  return result;
}
function ToolCallCard({ msg: message, repeatCount, questionDefaultExpanded = true }) {
  const toolName = message.content;
  const capabilityResult =
    message.toolStatus === "ok"
      ? parseCapabilitySearchCardResult(toolName, message.toolResult)
      : null;
  if (capabilityResult)
    return (
      <CapabilitySearchCard
        result={capabilityResult}
        searchCallId={message.callID ?? message.id}
      />
    );
  if (toolName === "todowrite") {
    return <TodoCard msg={message} />;
  }
  if (toolName === "question") {
    return (
      <QuestionToolCard msg={message} defaultExpanded={questionDefaultExpanded} />
    );
  }
  return <GenericToolCard msg={message} repeatCount={repeatCount} />;
}
function subMessageToChatMessage(subMessage) {
  const maybeConfirm = subMessage;
  if (maybeConfirm.type === "tool_confirm_ask") {
    return maybeConfirm;
  }
  if (subMessage.type === "thinking") {
    return {
      id: subMessage.id,
      type: "thinking",
      content: subMessage.content,
      role: "agent",
    };
  }
  if (subMessage.type === "tool") {
    const { name: toolName, result } = parseToolResult(subMessage.content);
    const trimmedResult = result?.replace(/^:\s*/, "");
    return {
      id: subMessage.id,
      type: "tool",
      content: toolName,
      toolStatus: subMessage.toolStatus,
      toolArgs: subMessage.args,
      toolResult: trimmedResult || void 0,
      interruption: subMessage.interruption,
      generationHandoffTargets: subMessage.generationHandoffTargets,
      callID: subMessage.callID,
      comfyUiProgress: subMessage.comfyUiProgress,
      role: "agent",
    };
  }
  if (subMessage.type === "question") {
    return {
      id: subMessage.id,
      type: "question",
      content: subMessage.content,
      role: "agent",
      requestId: subMessage.requestId,
      resolved: subMessage.resolved,
      questionData: subMessage.questionData,
      questionAnswers: subMessage.questionAnswers,
    };
  }
  return {
    id: subMessage.id,
    type: subMessage.type,
    content: subMessage.content,
    role: "agent",
  };
}
function AudioMessage({ msg: message }) {
  const { t } = useTranslation();
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(message.url) ?? message.content;
  if (!mediaUrl) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t("chat.failedToLoadAudio")}
      </div>
    );
  }
  return <AudioArtifactChip src={mediaUrl} originalSrc={message.url ?? message.content} />;
}
const CANCELLED_MESSAGE_ICON_STROKE_WIDTH = 1.24;
function CancelledMessage() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 size-4 flex items-center justify-center text-muted-foreground">
        <Icon
          icon={Ban}
          size="md"
          strokeWidth={CANCELLED_MESSAGE_ICON_STROKE_WIDTH}
        />
      </span>
      <span className="min-w-0 text-body-14 text-muted-foreground font-normal truncate">
        {t("chat.cancelled")}
      </span>
    </div>
  );
}
function CompactionStatusMessage({ message }) {
  const { t } = useTranslation();
  const completed = message.content === "compacted";
  return (
    <div
      data-action-ui-id="chat-compaction-status"
      className="flex min-w-0 items-center gap-2 py-1 text-body-14 text-muted-foreground"
    >
      {completed ? (
        <Check size={16} strokeWidth={1.5} className="shrink-0" />
      ) : (
        <LoaderCircle
          size={16}
          strokeWidth={1}
          className="shrink-0 animate-spin"
        />
      )}
      <span className="min-w-0 truncate">
        {t(
          completed ? "chat.compaction.completed" : "chat.compaction.running",
        )}
      </span>
    </div>
  );
}
function ConfirmRequest({ msg: message, onSend }) {
  const { t } = useTranslation();
  const [choice, setChoice] = reactExports.useState(null);
  const resolved = message.resolved || choice !== null;
  const handleRespond = (approved) => {
    if (!message.requestId || !onSend) return;
    onSend({
      type: "user_reply",
      id: message.requestId,
      content: approved ? "approved" : "rejected",
    });
    setChoice(approved ? "approved" : "rejected");
  };
  return (
    <div className="min-w-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-foreground mb-3 whitespace-pre-wrap">{message.content}</p>
      {resolved ? (
        <p className="text-muted-foreground italic text-xs">
          {choice === "approved" ? t("chat.approved") : t("chat.rejected")}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-success text-white text-xs hover:bg-success/85 cursor-pointer"
            onClick={() => handleRespond(true)}
          >
            {t("chat.approve")}
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground text-xs hover:bg-destructive/90 cursor-pointer"
            onClick={() => handleRespond(false)}
          >
            {t("chat.reject")}
          </button>
        </div>
      )}
    </div>
  );
}
function getFileName(path) {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}
function isSafeUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
function FileAddedMessage({ msg: message }) {
  const resolveMediaUrl = useResolveMediaUrl();
  const path = message.content;
  if (!path) return null;
  const fileName = getFileName(path);
  const resolved = resolveMediaUrl(message.url);
  const safeUrl = resolved && isSafeUrl(resolved) ? resolved : void 0;
  const artifactPath = safeUrl ?? path;
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
          <span className="text-muted-foreground font-normal truncate">
            {fileName}
          </span>
        )}
      </div>
    </div>
  );
}
const LOCATE_CLICK_DELAY_MS = 180;
function ImageMessage({ msg: message }) {
  const { t } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const [fullSize, setFullSize] = reactExports.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(message.url) ?? message.content;
  const thumbSrc = withThumbnail(mediaUrl, 400);
  useNativeViewOcclusion(fullSize && !error && Boolean(mediaUrl));
  const { copyImage, saveAs } = useMediaActions();
  const locateTimerRef = reactExports.useRef(null);
  const workspaceId = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath(message.url, mediaUrl),
    [message.url, mediaUrl],
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
    const handleKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") setFullSize(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullSize]);
  reactExports.useEffect(() => {
    return () => {
      if (locateTimerRef.current != null)
        window.clearTimeout(locateTimerRef.current);
    };
  }, []);
  const locateOnCanvas = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId) return false;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId);
    if (nodeIds.length === 0) return false;
    workspaceEvents.fireCanvasFocus(workspaceId, nodeIds);
    return true;
  }, [asset?.id, workspaceId]);
  const handleClick = reactExports.useCallback(() => {
    if (locateTimerRef.current != null)
      window.clearTimeout(locateTimerRef.current);
    locateTimerRef.current = window.setTimeout(() => {
      locateTimerRef.current = null;
      if (!locateOnCanvas()) setFullSize(true);
    }, LOCATE_CLICK_DELAY_MS);
  }, [locateOnCanvas]);
  const handleDoubleClick = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) {
      window.clearTimeout(locateTimerRef.current);
      locateTimerRef.current = null;
    }
    setFullSize(true);
  }, []);
  if (error || !mediaUrl) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t("chat.failedToLoadImage")}
      </div>
    );
  }
  const mime = inferArtifactMime(mediaUrl, "image");
  return (
    <>
      <div>
        <ContextMenu>
          <ContextMenuTrigger render={<div />}>
            <button
              type="button"
              className="cursor-pointer border-0 p-0 bg-transparent"
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
            >
              <img
                data-action-ui-id="chat-generated-image"
                data-artifact-type="image"
                data-artifact-path={mediaUrl}
                data-artifact-mime={mime}
                src={thumbSrc}
                alt={message.content || t("chat.generatedImage")}
                className="rounded-lg max-w-full h-auto hover:opacity-90 transition-opacity"
                style={{
                  maxWidth: 400,
                }}
                onError={() => setError(true)}
              />
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => copyImage(mediaUrl)}>
              <Copy />
              {t("common.copy")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => saveAs(mediaUrl)}>
              <Save />
              {t("common.saveAs")}
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
              src={mediaUrl}
              alt={message.content || t("chat.generatedImage")}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
          </div>
        </>
      )}
    </>
  );
}
function InteractRequest({ msg: message, onSend }) {
  const { t } = useTranslation();
  const [reply, setReply] = reactExports.useState("");
  const [localSubmitted, setLocalSubmitted] = reactExports.useState(false);
  const resolved = message.resolved || localSubmitted;
  const handleSubmit = () => {
    if (!reply.trim() || !message.requestId || !onSend) return;
    onSend({
      type: "user_reply",
      id: message.requestId,
      content: reply.trim(),
    });
    setLocalSubmitted(true);
  };
  return (
    <div className="min-w-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-foreground mb-2 whitespace-pre-wrap">{message.content}</p>
      {resolved ? (
        <p className="text-muted-foreground italic text-xs">
          {t("chat.replied")} {reply || t("chat.submitted")}
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-background border border-input rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-primary/50"
            placeholder={t("chat.replyPlaceholder")}
            value={reply}
            onChange={(inputEvent) => setReply(inputEvent.target.value)}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === "Enter" && !keyboardEvent.nativeEvent.isComposing)
                handleSubmit();
            }}
          />
          <button
            type="button"
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!reply.trim()}
          >
            {t("common.send")}
          </button>
        </div>
      )}
    </div>
  );
}
function MessageWithdrawn({ reason }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      data-testid="message-withdrawn"
      data-withdrawal-reason={reason}
      className="flex items-start gap-2 text-body-14 text-muted-foreground"
    >
      <ShieldOff
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.5}
      />
      <span>
        {t(
          "chat.messageWithdrawn.contentPolicyViolation",
          "This response was withdrawn because it did not pass the safety review.",
        )}
      </span>
    </div>
  );
}
function QuestionMessage({ msg: message }) {
  const { t } = useTranslation();
  const raw = message.questionData?.questions;
  const questions = Array.isArray(raw) ? raw : [];
  const resolved = message.resolved ?? false;
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
          <QuestionPromptIcon
            animated={true}
            actionId="chat-question-waiting-icon"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-13 font-medium leading-5 text-foreground">
            {questions
              .map((question) => redactForCurrentRegion(question.header))
              .join(", ")}
          </p>
          <div
            data-action-ui-id="chat-question-waiting-status"
            className="text-shimmer mt-0.5 text-body-12 leading-[18px]"
          >
            {t("chat.question.waiting")}
          </div>
        </div>
      </div>
    </div>
  );
}
function dedupeReplayedSubMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const key = subMessageSemanticKey(message);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function keepLatestSubAgentThinking(messages) {
  let latestThinkingIndex = -1;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.type === "thinking") {
      latestThinkingIndex = index;
      break;
    }
  }
  if (latestThinkingIndex < 0) return messages;
  return messages.filter(
    (message, index) =>
      message.type !== "thinking" || index === latestThinkingIndex,
  );
}
function getInitialExpandedState(collapsed, resolved) {
  return !collapsed && !resolved;
}
function pendingToolConfirmIds(messages) {
  return messages.flatMap((message) => {
    if (message.type === "tool_confirm_ask") {
      return !message.resolved && !message.expired
        ? [message.requestId ?? message.id]
        : [];
    }
    return message.type === "sub_agent"
      ? pendingToolConfirmIds(message.subMessages ?? [])
      : [];
  });
}
function IndentL({ children }) {
  return <div className="ml-[9px] pl-3 min-w-0">{children}</div>;
}
function SubAgentIcon({ agentKey, agentLabel }) {
  const identity = `${agentKey} ${agentLabel}`.toLocaleLowerCase();
  const SubAgentIconComponent =
    identity.includes("director") || identity.includes("导演")
      ? Clapperboard
      : identity.includes("dialogue") ||
          identity.includes("script") ||
          identity.includes("台词")
        ? MessageSquareQuote
        : identity.includes("editing") ||
            identity.includes("editor") ||
            identity.includes("剪辑")
          ? Scissors
          : identity.includes("summary") ||
              identity.includes("brief") ||
              identity.includes("简介")
            ? NotebookPen
            : Bot;
  return (
    <Icon
      icon={SubAgentIconComponent}
      size="md"
      strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
    />
  );
}
function nodeKey(node, index) {
  if (node.kind === "activity-group") return node.items[0]?.id ?? `ag-${index}`;
  return node.msg.id;
}
function isGroupedNodeStreaming(
  node,
  index,
  total,
  isSubAgentStreaming,
  pinnedStreamingActionId,
) {
  if (!isSubAgentStreaming) return false;
  if (node.kind === "activity-group") {
    if (
      pinnedStreamingActionId &&
      node.items.some((item) => item.id === pinnedStreamingActionId)
    ) {
      return false;
    }
    if (
      node.aggregatedStatus === "running" ||
      node.aggregatedStatus === "pending"
    )
      return true;
  }
  return !pinnedStreamingActionId && index === total - 1;
}
function SubTextBlock({ sub: subMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const rawContent = subMessage.content ?? "";
  const isRecovered = isRecoveredMessage(rawContent);
  const displayContent = redactForCurrentRegion(
    isRecovered ? stripRecoveredPrefix(rawContent) : rawContent,
  );
  if (!displayContent) return null;
  const DisplayIcon = isRecovered ? RotateCcw : FileText;
  const label = isRecovered
    ? t("chat.subAgentRecovered")
    : t("chat.subAgentDetail");
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-0 text-left cursor-pointer"
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
        aria-expanded={expanded}
      >
        <span className="shrink-0 size-4 flex items-center justify-center text-muted-foreground">
          <Icon
            icon={DisplayIcon}
            size="md"
            strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
          />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="text-muted-foreground font-normal truncate">
            {label}
          </span>
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
function SubGroupedNode({
  node,
  subLookup,
  isStreaming,
  onSend,
  showStreamingLabel,
}) {
  if (node.kind === "activity-group") {
    return (
      <ActivityGroup
        data={node}
        isStreaming={isStreaming}
        onSend={onSend}
        showRail={false}
        showThinkingSummary={false}
        showStreamingLabel={showStreamingLabel}
      />
    );
  }
  if (node.msg.type === "tool" && node.msg.content === "question") {
    return <ToolCallCard msg={node.msg} questionDefaultExpanded={true} />;
  }
  if (node.msg.type === "tool_confirm_ask") {
    return onSend ? (
      <div data-message-id={node.msg.id}>
        <ToolConfirmCard message={node.msg} onSend={onSend} embedded={true} />
      </div>
    ) : null;
  }
  const subMessage = subLookup.get(node.msg.id);
  if (!subMessage) return null;
  if (subMessage.type === "image") return <SubImage sub={subMessage} />;
  if (subMessage.type === "video") return <SubVideo sub={subMessage} />;
  if (subMessage.type === "audio") return <SubAudio sub={subMessage} />;
  if (subMessage.type === "question") {
    const question = subMessageToChatMessage(subMessage);
    return question.type === "question" ? (
      <QuestionMessage msg={question} />
    ) : null;
  }
  if (subMessage.type === "sub_agent")
    return <NestedSubAgent sub={subMessage} onSend={onSend} />;
  return <SubTextBlock sub={subMessage} />;
}
function NestedSubAgent({ sub: subMessage, onSend }) {
  const { t } = useTranslation();
  const pendingConfirmKey = JSON.stringify(
    pendingToolConfirmIds(subMessage.subMessages ?? []),
  );
  const [expanded, setExpanded] = reactExports.useState(
    () =>
      pendingConfirmKey !== "[]" ||
      getInitialExpandedState(subMessage.collapsed, subMessage.resolved),
  );
  const agentKey = subMessage.agent ?? "";
  const agentLabel =
    t(`chat.agentLabel.${agentKey}`, {
      defaultValue: "",
    }) ||
    AGENT_LABELS[agentKey] ||
    subMessage.agent ||
    t("chat.agentFallback");
  const children = subMessage.subMessages ?? [];
  const showHiddenTools = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const visibleChildren = reactExports.useMemo(() => {
    const productVisible = showHiddenTools
      ? dropResumePrompts(children)
      : filterSupersededTransientTools(
          dropResumePrompts(
            filterSilentTools(children, (childMessage) =>
              childMessage.type === "tool" ? parseToolResult(childMessage.content).name : void 0,
            ),
          ),
          (childMessage) =>
            childMessage.type === "tool" ? parseToolResult(childMessage.content).name : void 0,
        );
    const normalized = collapseReplayedSubMessageSequences(productVisible);
    const deduped =
      !showHiddenTools && IN_PROGRESS_AGENT_KEYS.has(agentKey)
        ? dedupeReplayedSubMessages(normalized)
        : normalized;
    return keepLatestSubAgentThinking(deduped);
  }, [agentKey, children, showHiddenTools]);
  const asChatMessages = reactExports.useMemo(
    () => visibleChildren.map(subMessageToChatMessage),
    [visibleChildren],
  );
  const grouped = reactExports.useMemo(
    () => groupIntoActivityGroups(asChatMessages, showHiddenTools),
    [asChatMessages, showHiddenTools],
  );
  const subLookup = reactExports.useMemo(() => {
    const childMessagesById = new Map();
    for (const childMessage of visibleChildren) childMessagesById.set(childMessage.id, childMessage);
    return childMessagesById;
  }, [visibleChildren]);
  const isStreaming = !subMessage.resolved;
  const fallbackTask = subMessage.task?.trim();
  reactExports.useEffect(() => {
    if (pendingConfirmKey !== "[]") setExpanded(true);
    else if (subMessage.collapsed || subMessage.resolved) setExpanded(false);
  }, [subMessage.collapsed, subMessage.resolved, pendingConfirmKey]);
  const streamingAction = reactExports.useMemo(
    () => (isStreaming ? getStreamingAction(asChatMessages) : void 0),
    [isStreaming, asChatMessages],
  );
  const inlineStreamingTool =
    streamingAction?.type === "tool" &&
    (IN_PROGRESS_AGENT_KEYS.has(agentKey) ||
      isTransientTool(streamingAction.content));
  const pinnedStreamingAction =
    inlineStreamingTool ||
    (streamingAction?.type === "tool" &&
      ["canvas", "connector"].includes(
        categorizeToolAction(streamingAction.content),
      ))
      ? void 0
      : streamingAction;
  const hasExpandedContent =
    grouped.length > 0 || !!pinnedStreamingAction || !!fallbackTask;
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
                    id: `${subMessage.id}__task`,
                    type: "text",
                    content: fallbackTask,
                  }}
                />
              </IndentL>
            )}
            {grouped.map((node, nIdx) => (
              <IndentL
                key={nodeKey(node, nIdx)}
                showCorner={!pinnedStreamingAction && nIdx === 0}
              >
                <SubGroupedNode
                  node={node}
                  subLookup={subLookup}
                  isStreaming={isGroupedNodeStreaming(
                    node,
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
function SubAgentGroup({ msg: message, onSend }) {
  const { t } = useTranslation();
  const agentKey = message.agent ?? "";
  const agentLabel =
    t(`chat.agentLabel.${agentKey}`, {
      defaultValue: "",
    }) ||
    AGENT_LABELS[agentKey] ||
    message.agent ||
    t("chat.agentFallback");
  const subs = message.subMessages ?? [];
  const showHiddenTools = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const visibleSubs = reactExports.useMemo(() => {
    const productVisible = showHiddenTools
      ? dropResumePrompts(subs)
      : filterSupersededTransientTools(
          dropResumePrompts(
            filterSilentTools(subs, (subMessage) =>
              subMessage.type === "tool" ? parseToolResult(subMessage.content).name : void 0,
            ),
          ),
          (subMessage) =>
            subMessage.type === "tool" ? parseToolResult(subMessage.content).name : void 0,
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
    const subMessagesById = new Map();
    for (const subMessage of visibleSubs) subMessagesById.set(subMessage.id, subMessage);
    return subMessagesById;
  }, [visibleSubs]);
  const isStreaming = !message.resolved && !message.cancelled;
  const streamingAction = reactExports.useMemo(
    () => (isStreaming ? getStreamingAction(asChatMessages) : void 0),
    [isStreaming, asChatMessages],
  );
  const inlineStreamingTool =
    streamingAction?.type === "tool" &&
    (IN_PROGRESS_AGENT_KEYS.has(agentKey) ||
      isTransientTool(streamingAction.content));
  const pinnedStreamingAction =
    inlineStreamingTool ||
    (streamingAction?.type === "tool" &&
      ["canvas", "connector"].includes(
        categorizeToolAction(streamingAction.content),
      ))
      ? void 0
      : streamingAction;
  const hasError = reactExports.useMemo(() => subAgentHasError(subs), [subs]);
  const isRecovering = useIsChildRecovering(message.childSessionId);
  const status = message.cancelled
    ? "cancelled"
    : isRecovering
      ? "recovering"
      : isStreaming
        ? "running"
        : hasError
          ? "error"
          : "done";
  const statusLabel =
    status === "running" && IN_PROGRESS_AGENT_KEYS.has(agentKey)
      ? t("chat.subAgentStatus.running")
      : t(`gen.status.${status}`);
  const statusClass =
    status === "error"
      ? "text-destructive/50"
      : status === "running" || status === "recovering"
        ? "text-tertiary text-shimmer"
        : "text-tertiary";
  const pendingConfirmKey = JSON.stringify(pendingToolConfirmIds(subs));
  const hasPendingConfirm = pendingConfirmKey !== "[]";
  const [expanded, setExpanded] = reactExports.useState(
    () =>
      hasPendingConfirm || getInitialExpandedState(message.collapsed, message.resolved),
  );
  reactExports.useEffect(() => {
    if (pendingConfirmKey !== "[]") setExpanded(true);
    else if (message.collapsed || message.resolved) setExpanded(false);
  }, [message.collapsed, message.resolved, pendingConfirmKey]);
  const fallbackTask = message.task?.trim();
  const hasExpandedContent =
    grouped.length > 0 || !!pinnedStreamingAction || !!fallbackTask;
  return (
    <div
      data-action-ui-id="chat-sub-agent-group"
      className="min-w-0 flex flex-col"
    >
      <button
        type="button"
        className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left text-muted-foreground transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
        aria-expanded={expanded}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <SubAgentIcon agentKey={agentKey} agentLabel={agentLabel} />
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span className="truncate font-normal">{agentLabel}</span>
          <span
            data-action-ui-id={
              status === "done" ? "chat-sub-agent-done" : void 0
            }
            className={`truncate ${statusClass}`}
          >
            {statusLabel}
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
                    id: `${message.id}__task`,
                    type: "text",
                    content: fallbackTask,
                  }}
                />
              </IndentL>
            )}
            {grouped.map((node, nIdx) => (
              <IndentL
                key={nodeKey(node, nIdx)}
                showCorner={!pinnedStreamingAction && nIdx === 0}
              >
                <SubGroupedNode
                  node={node}
                  subLookup={subLookup}
                  isStreaming={isGroupedNodeStreaming(
                    node,
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
function RecoveredMessage({ content }) {
  const headline = stripRecoveredPrefix(content.split("\n")[0] ?? "")
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
const BILLING_ERROR_CODE_PATTERN =
  /`{1,3}billing_insufficient_balance`{1,3}|\[billing_insufficient_balance\]|billing_insufficient_balance/gi;
function RemoteToolGuiLink() {
  const remoteTool = useWorkspaceRemoteToolOptional();
  const { t } = useTranslation();
  if (!remoteTool?.pendingRemoteToolRequest || remoteTool.remoteToolRequest)
    return null;
  return (
    <button
      type="button"
      className="mt-1 text-body-13 text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
      onClick={remoteTool.openPendingRemoteTool}
      data-action-ui-id="chat.open-remote-tool"
    >
      {t("chat.openRemoteToolUi", {
        defaultValue: "Open {{toolName}} GUI",
        toolName: redactForCurrentRegion(
          remoteTool.pendingRemoteToolRequest.toolName,
        ),
      })}
    </button>
  );
}
const TextMessage = reactExports.memo(function TextMessage({
  msg: message,
  isLast,
  isStreaming = false,
}) {
  const { t } = useTranslation();
  const { data: mentionModels = [] } = useMentionModels();
  const displayContent = reactExports.useMemo(() => {
    if (message.role === "user") return message.content ?? "";
    const billingRedacted = (message.content ?? "").replace(
      BILLING_ERROR_CODE_PATTERN,
      t("chat.billingInsufficient.title"),
    );
    return replaceConfiguredModelNamesForCurrentRegion(
      billingRedacted,
      mentionModels,
    );
  }, [mentionModels, message.content, message.role, t]);
  if (message.role === "user") {
    const annotations = message.type === "text" ? message.documentAnnotations : void 0;
    const recovered = stripContextPrefix(message.content ?? "").trimStart();
    if (isRecoveredMessage(recovered)) {
      return <RecoveredMessage content={recovered} />;
    }
    return (
      <div className="text-body-14 text-foreground min-w-0">
        {message.content ? (
          <RichUserPromptContent content={message.content} />
        ) : (
          !annotations?.length && (
            <span className="text-muted-foreground italic">
              {t("chat.noContent")}
            </span>
          )
        )}
        {annotations && annotations.length > 0 && (
          <SentAnnotationCards annotations={annotations} />
        )}
      </div>
    );
  }
  return (
    <div className="text-body-15 text-foreground min-w-0 overflow-hidden">
      {displayContent ? (
        <MarkdownContent content={displayContent} isStreaming={isStreaming} />
      ) : (
        <span className="text-muted-foreground italic">
          {t("chat.noContent")}
        </span>
      )}
      {isLast && <RemoteToolGuiLink />}
    </div>
  );
});
function stripMdMarkers(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
}
function ThinkingBlock({ msg: message, isStreaming }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(!!isStreaming);
  const content = stripMdMarkers(
    redactForCurrentRegion(message.thinkingContent ?? message.content),
  );
  const hasContent = !!content;
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
            {isStreaming ? t("chat.thinking") : t("chat.thought")}
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
              {hasContent ? (
                <ExpandableText lineClamp={8}>{content}</ExpandableText>
              ) : (
                <p className="whitespace-pre-wrap break-words">
                  {t("chat.noReasoningContent")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function VideoMessage({ msg: message }) {
  const { t } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();
  const mediaUrl = resolveMediaUrl(message.url) ?? message.content;
  const { copyPath, saveAs } = useMediaActions();
  if (error || !mediaUrl) {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t("chat.failedToLoadVideo")}
      </div>
    );
  }
  const mime = inferArtifactMime(mediaUrl, "video");
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger render={<div />}>
          <video
            data-action-ui-id="chat-artifact-video"
            data-artifact-type="video"
            data-artifact-path={mediaUrl}
            data-artifact-mime={mime}
            src={mediaUrl}
            controls={true}
            poster={message.metadata?.poster}
            className="h-auto max-w-full rounded-lg"
            style={{
              maxWidth: 400,
            }}
            onError={() => setError(true)}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => copyPath(mediaUrl)}>
            <Copy />
            {t("chat.copyUrl")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => saveAs(mediaUrl)}>
            <Save />
            {t("common.saveAs")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
        {message.agent && (
          <span>
            {t("chat.generatedBy", {
              agent: message.agent,
            })}
          </span>
        )}
        {message.metadata?.model && (
          <span>
            {t("chat.modelLabel", {
              model: message.metadata.model,
            })}
          </span>
        )}
        {message.metadata?.duration && (
          <span>
            {t("chat.durationLabel", {
              duration: message.metadata.duration,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
export const MessageBubble = reactExports.memo(function MessageBubble({
  msg: message,
  isStreaming,
  onSend,
  onRetry,
  retrying,
  isLast,
  repeatCount,
}) {
  switch (message.type) {
    case "text":
      return (
        <TextMessage msg={message} isLast={isLast} isStreaming={isStreaming} />
      );
    case "thinking":
      return <ThinkingBlock msg={message} isStreaming={isStreaming} />;
    case "tool":
      return <ToolCallCard msg={message} repeatCount={repeatCount} />;
    case "error":
      return <ErrorMessage msg={message} onRetry={onRetry} retrying={retrying} />;
    case "interact":
      return <InteractRequest msg={message} onSend={onSend} />;
    case "confirm":
      return <ConfirmRequest msg={message} onSend={onSend} />;
    case "credit_threshold":
      if (message.kind === "insufficient") {
        return (
          <BillingInsufficientCard
            estimate={{
              estimatedCredits: message.estimatedCredits,
              currentCredits: message.currentCredits,
              shortfallCredits: message.shortfallCredits,
            }}
            expiresAt={message.expiresAt}
            resolved={message.resolved}
            settlementStatus={message.settlementStatus}
            refreshRevision={message.revision}
            retryResetMs={3e3}
            onRetry={() => {
              if (!onSend || message.resolved) return false;
              const reply = {
                type: "credit_threshold_reply",
                id: message.requestId,
                session_id: message.sessionId,
                decision: "continue",
                ...(message.batchId
                  ? {
                      batch_id: message.batchId,
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
            estimatedCredits: message.estimatedCredits,
            currentCredits: message.currentCredits,
            remainingCredits: message.remainingCredits,
            thresholdCredits: message.thresholdCredits,
            batchId: message.batchId,
            batchItems: message.batchItems,
            maxSelectableCredits: message.maxSelectableCredits,
            selectedItemIds: message.selectedItemIds,
          }}
          expiresAt={message.expiresAt}
          resolved={message.resolved}
          decision={message.decision}
          settlementStatus={message.settlementStatus}
          awaitSettlement={true}
          onCancel={() => {
            if (!onSend || message.resolved) return;
            const reply = {
              type: "credit_threshold_reply",
              id: message.requestId,
              session_id: message.sessionId,
              decision: "cancel",
              ...(message.batchId
                ? {
                    batch_id: message.batchId,
                  }
                : {}),
            };
            return onSend(reply) !== false;
          }}
          onContinue={(selectedItemIds) => {
            if (!onSend || message.resolved) return;
            const reply = {
              type: "credit_threshold_reply",
              id: message.requestId,
              session_id: message.sessionId,
              decision: "continue",
              ...(message.batchId
                ? {
                    batch_id: message.batchId,
                  }
                : {}),
              ...(message.batchId && selectedItemIds
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
      return <QuestionMessage msg={message} />;
    case "image":
      return <ImageMessage msg={message} />;
    case "video":
      return <VideoMessage msg={message} />;
    case "audio":
      return <AudioMessage msg={message} />;
    case "sub_agent":
      return <SubAgentGroup msg={message} onSend={onSend} />;
    case "file_added":
      return <FileAddedMessage msg={message} />;
    case "withdrawn":
      return <MessageWithdrawn reason={message.reason} />;
    case "cancelled":
      return <CancelledMessage />;
    case "compaction_status":
      return <CompactionStatusMessage message={message} />;
    case "tool_confirm_ask":
      if (message.resolved) return null;
      return onSend ? <ToolConfirmCard message={message} onSend={onSend} /> : null;
    default:
      return null;
  }
});
