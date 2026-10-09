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
import { cn$2 } from "../infra/dialog-content.jsx";
import { useAssets } from "../settings/use-assets.js";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "../generation/use-astra-send-gate.js";
import { splitFilename } from "../canvas/uploading-assets.jsx";
import {
  findAssetForPath,
  toWorkspaceRelativePath$1,
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
  src,
  originalSrc,
  label,
  dataSlot = "audio-artifact-chip",
  className,
}) {
  const workspaceId2 = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath$1(originalSrc, src),
    [originalSrc, src],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  const fileName = displayName(originalSrc ?? src, label, asset?.name);
  const { head: stem, tail: ext } = splitFilename(fileName);
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId2,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId2],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const handleLocate = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId2) return;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId2);
    if (nodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds);
  }, [asset?.id, workspaceId2]);
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
      data-artifact-path={src}
      className={cn$2(
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
        {ext && <span className="shrink-0">{ext}</span>}
      </span>
    </button>
  );
}

function SubImage({ sub }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  const thumbSrc = withThumbnail(src, 300);
  if (error || !src)
    return (
      <div className="text-xs text-muted-foreground">
        {t2("chat.imageUnavailable")}
      </div>
    );
  const mime = inferArtifactMime(src, "image");
  return (
    <img
      data-action-ui-id="chat-generated-image"
      data-artifact-type="image"
      data-artifact-path={src}
      data-artifact-mime={mime}
      src={thumbSrc}
      alt={t2("chat.generatedContent")}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}

function SubVideo({ sub }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  if (error || !src)
    return (
      <div className="text-xs text-muted-foreground">
        {t2("chat.videoUnavailable")}
      </div>
    );
  const mime = inferArtifactMime(src, "video");
  return (
    // biome-ignore lint/a11y/useMediaCaption: generated video sub-message
    <video
      data-action-ui-id="chat-artifact-video"
      data-artifact-type="video"
      data-artifact-path={src}
      data-artifact-mime={mime}
      src={src}
      controls={true}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}

function SubAudio({ sub }) {
  const { t: t2 } = useTranslation();
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  if (!src)
    return (
      <div className="text-xs text-muted-foreground">
        {t2("chat.audioUnavailable")}
      </div>
    );
  return <AudioArtifactChip src={src} originalSrc={sub.url ?? sub.content} />;
}

function collectArtifactsFromSubMessages(subs) {
  if (!subs?.length) return [];
  const seen2 = new Set();
  const out = [];
  collectFromSubMessages(subs, seen2, out);
  return out;
}

function isOutputProducingTool(toolName2) {
  const labelId = getToolLabelId(toolName2);
  return labelId === "mediaGen" || labelId === "contentProcess";
}

function isFailedGenerationResult(result) {
  if (!result) return false;
  try {
    const parsed = JSON.parse(result);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return false;
    const record2 = parsed;
    const requestGroupUnavailable =
      typeof record2.error === "string" &&
      record2.error.includes("REQUEST_GROUP_UNAVAILABLE");
    return (
      record2.ok === false ||
      record2.success === false ||
      record2.is_error === true ||
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
  const walk = (list2) => {
    for (const s2 of list2) {
      if (s2.type === "tool") {
        const parsed = parseToolResult(s2.content);
        if (isOutputProducingTool(parsed.name)) {
          const failedResult = isFailedGenerationResult(parsed.result);
          if (
            (s2.toolStatus === "error" || failedResult) &&
            !isGenerationFailureNonTerminal(parsed.result) &&
            !isToolRecoveredInterrupted(parsed.result) &&
            !hasSuccessfulMediaOutput(parsed.result)
          ) {
            generationError = true;
          } else if (s2.toolStatus === "ok" && !failedResult) {
            hasOkGeneration = true;
          }
        }
      }
      if (s2.subMessages?.length) walk(s2.subMessages);
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
  return subs.filter((s2) => !isResumeChildPrompt(s2.content ?? ""));
}

function replayBlocksMatch(keys2, firstStart, secondStart, length2) {
  for (let offset2 = 0; offset2 < length2; offset2++) {
    if (keys2[firstStart + offset2] !== keys2[secondStart + offset2])
      return false;
  }
  return true;
}

function collapseReplayedSubMessageSequences(messages2) {
  const keys2 = messages2.map(subMessageSemanticKey);
  const result = [];
  let index2 = 0;
  while (index2 < messages2.length) {
    let bestLength = 0;
    let bestRepeatCount = 1;
    let bestRemovedCount = 0;
    const maxLength = Math.floor((messages2.length - index2) / 2);
    for (
      let length2 = MIN_REPLAY_SEQUENCE_LENGTH;
      length2 <= maxLength;
      length2++
    ) {
      let repeatCount = 1;
      while (
        index2 + (repeatCount + 1) * length2 <= messages2.length &&
        replayBlocksMatch(
          keys2,
          index2,
          index2 + repeatCount * length2,
          length2,
        )
      ) {
        repeatCount++;
      }
      const removedCount = (repeatCount - 1) * length2;
      if (removedCount <= bestRemovedCount) continue;
      bestLength = length2;
      bestRepeatCount = repeatCount;
      bestRemovedCount = removedCount;
    }
    if (bestRepeatCount > 1) {
      result.push(...messages2.slice(index2, index2 + bestLength));
      index2 += bestLength * bestRepeatCount;
      continue;
    }
    result.push(messages2[index2]);
    index2++;
  }
  return result;
}

function ToolCallCard({ msg, repeatCount, questionDefaultExpanded = true }) {
  const toolName2 = msg.content;
  const capabilityResult =
    msg.toolStatus === "ok"
      ? parseCapabilitySearchCardResult(toolName2, msg.toolResult)
      : null;
  if (capabilityResult)
    return (
      <CapabilitySearchCard
        result={capabilityResult}
        searchCallId={msg.callID ?? msg.id}
      />
    );
  if (toolName2 === "todowrite") {
    return <TodoCard msg={msg} />;
  }
  if (toolName2 === "question") {
    return (
      <QuestionToolCard msg={msg} defaultExpanded={questionDefaultExpanded} />
    );
  }
  return <GenericToolCard msg={msg} repeatCount={repeatCount} />;
}

function subMessageToChatMessage(sub) {
  const maybeConfirm = sub;
  if (maybeConfirm.type === "tool_confirm_ask") {
    return maybeConfirm;
  }
  if (sub.type === "thinking") {
    return {
      id: sub.id,
      type: "thinking",
      content: sub.content,
      role: "agent",
    };
  }
  if (sub.type === "tool") {
    const { name: name2, result } = parseToolResult(sub.content);
    const trimmedResult = result?.replace(/^:\s*/, "");
    return {
      id: sub.id,
      type: "tool",
      content: name2,
      toolStatus: sub.toolStatus,
      toolArgs: sub.args,
      toolResult: trimmedResult || void 0,
      interruption: sub.interruption,
      generationHandoffTargets: sub.generationHandoffTargets,
      callID: sub.callID,
      comfyUiProgress: sub.comfyUiProgress,
      role: "agent",
    };
  }
  if (sub.type === "question") {
    return {
      id: sub.id,
      type: "question",
      content: sub.content,
      role: "agent",
      requestId: sub.requestId,
      resolved: sub.resolved,
      questionData: sub.questionData,
      questionAnswers: sub.questionAnswers,
    };
  }
  return {
    id: sub.id,
    type: sub.type,
    content: sub.content,
    role: "agent",
  };
}

function AudioMessage({ msg }) {
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

const CANCELLED_MESSAGE_ICON_STROKE_WIDTH = 1.24;

function CancelledMessage() {
  const { t: t2 } = useTranslation();
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
        {t2("chat.cancelled")}
      </span>
    </div>
  );
}

function CompactionStatusMessage({ message: message2 }) {
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
        <LoaderCircle
          size={16}
          strokeWidth={1}
          className="shrink-0 animate-spin"
        />
      )}
      <span className="min-w-0 truncate">
        {t2(
          completed ? "chat.compaction.completed" : "chat.compaction.running",
        )}
      </span>
    </div>
  );
}

function ConfirmRequest({ msg, onSend }) {
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

function FileAddedMessage({ msg }) {
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
          <span className="text-muted-foreground font-normal truncate">
            {fileName}
          </span>
        )}
      </div>
    </div>
  );
}

const LOCATE_CLICK_DELAY_MS = 180;

function ImageMessage({ msg }) {
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
      if (locateTimerRef.current != null)
        window.clearTimeout(locateTimerRef.current);
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
    if (locateTimerRef.current != null)
      window.clearTimeout(locateTimerRef.current);
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

function InteractRequest({ msg, onSend }) {
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
              if (e2.key === "Enter" && !e2.nativeEvent.isComposing)
                handleSubmit();
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

function MessageWithdrawn({ reason }) {
  const { t: t2 } = useTranslation();
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
        {t2(
          "chat.messageWithdrawn.contentPolicyViolation",
          "This response was withdrawn because it did not pass the safety review.",
        )}
      </span>
    </div>
  );
}

function QuestionMessage({ msg }) {
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
          <QuestionPromptIcon
            animated={true}
            actionId="chat-question-waiting-icon"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-13 font-medium leading-5 text-foreground">
            {questions
              .map((q2) => redactForCurrentRegion(q2.header))
              .join(", ")}
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
    (message2, index2) =>
      message2.type !== "thinking" || index2 === latestThinkingIndex,
  );
}

function getInitialExpandedState(collapsed, resolved) {
  return !collapsed && !resolved;
}

function pendingToolConfirmIds(messages2) {
  return messages2.flatMap((message2) => {
    if (message2.type === "tool_confirm_ask") {
      return !message2.resolved && !message2.expired
        ? [message2.requestId ?? message2.id]
        : [];
    }
    return message2.type === "sub_agent"
      ? pendingToolConfirmIds(message2.subMessages ?? [])
      : [];
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
      : identity2.includes("dialogue") ||
          identity2.includes("script") ||
          identity2.includes("台词")
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
  return (
    <Icon
      icon={Icon$12}
      size="md"
      strokeWidth={SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH}
    />
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
    if (
      node2.aggregatedStatus === "running" ||
      node2.aggregatedStatus === "pending"
    )
      return true;
  }
  return !pinnedStreamingActionId && index2 === total - 1;
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
  const label = isRecovered
    ? t2("chat.subAgentRecovered")
    : t2("chat.subAgentDetail");
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-0 text-left cursor-pointer"
        onClick={() => setExpanded((v2) => !v2)}
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
  node: node2,
  subLookup,
  isStreaming,
  onSend,
  showStreamingLabel,
}) {
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
    return question2.type === "question" ? (
      <QuestionMessage msg={question2} />
    ) : null;
  }
  if (sub.type === "sub_agent")
    return <NestedSubAgent sub={sub} onSend={onSend} />;
  return <SubTextBlock sub={sub} />;
}

function NestedSubAgent({ sub, onSend }) {
  const { t: t2 } = useTranslation();
  const pendingConfirmKey = JSON.stringify(
    pendingToolConfirmIds(sub.subMessages ?? []),
  );
  const [expanded, setExpanded] = reactExports.useState(
    () =>
      pendingConfirmKey !== "[]" ||
      getInitialExpandedState(sub.collapsed, sub.resolved),
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
          (s2) =>
            s2.type === "tool" ? parseToolResult(s2.content).name : void 0,
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
                    id: `${sub.id}__task`,
                    type: "text",
                    content: fallbackTask,
                  }}
                />
              </IndentL>
            )}
            {grouped.map((node2, nIdx) => (
              <IndentL
                key={nodeKey(node2, nIdx)}
                showCorner={!pinnedStreamingAction && nIdx === 0}
              >
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

function SubAgentGroup({ msg, onSend }) {
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
          (s2) =>
            s2.type === "tool" ? parseToolResult(s2.content).name : void 0,
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
    () =>
      hasPendingConfirm || getInitialExpandedState(msg.collapsed, msg.resolved),
  );
  reactExports.useEffect(() => {
    if (pendingConfirmKey !== "[]") setExpanded(true);
    else if (msg.collapsed || msg.resolved) setExpanded(false);
  }, [msg.collapsed, msg.resolved, pendingConfirmKey]);
  const fallbackTask = msg.task?.trim();
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
        onClick={() => setExpanded((v2) => !v2)}
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
              <IndentL
                key={nodeKey(node2, nIdx)}
                showCorner={!pinnedStreamingAction && nIdx === 0}
              >
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

function RecoveredMessage({ content: content2 }) {
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

const BILLING_ERROR_CODE_PATTERN =
  /`{1,3}billing_insufficient_balance`{1,3}|\[billing_insufficient_balance\]|billing_insufficient_balance/gi;

function RemoteToolGuiLink() {
  const remoteTool = useWorkspaceRemoteToolOptional();
  const { t: t2 } = useTranslation();
  if (!remoteTool?.pendingRemoteToolRequest || remoteTool.remoteToolRequest)
    return null;
  return (
    <button
      type="button"
      className="mt-1 text-body-13 text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
      onClick={remoteTool.openPendingRemoteTool}
      data-action-ui-id="chat.open-remote-tool"
    >
      {t2("chat.openRemoteToolUi", {
        defaultValue: "Open {{toolName}} GUI",
        toolName: redactForCurrentRegion(
          remoteTool.pendingRemoteToolRequest.toolName,
        ),
      })}
    </button>
  );
}

const TextMessage = reactExports.memo(function TextMessage2({
  msg,
  isLast,
  isStreaming = false,
}) {
  const { t: t2 } = useTranslation();
  const { data: mentionModels = [] } = useMentionModels();
  const displayContent = reactExports.useMemo(() => {
    if (msg.role === "user") return msg.content ?? "";
    const billingRedacted = (msg.content ?? "").replace(
      BILLING_ERROR_CODE_PATTERN,
      t2("chat.billingInsufficient.title"),
    );
    return replaceConfiguredModelNamesForCurrentRegion(
      billingRedacted,
      mentionModels,
    );
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
            <span className="text-muted-foreground italic">
              {t2("chat.noContent")}
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
          {t2("chat.noContent")}
        </span>
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
  const content2 = stripMdMarkers(
    redactForCurrentRegion(msg.thinkingContent ?? msg.content),
  );
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
                <p className="whitespace-pre-wrap break-words">
                  {t2("chat.noReasoningContent")}
                </p>
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
      return (
        <TextMessage msg={msg} isLast={isLast} isStreaming={isStreaming} />
      );
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
