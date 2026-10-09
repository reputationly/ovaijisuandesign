// chat-panel.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useCurrentWorkspace,
  reactExports,
  Tooltip,
  TooltipTrigger,
  useDebugFlag,
  DEBUG_FLAGS,
  useGatewayScopeKey,
  Icon,
  workspaceEvents,
  Loader2,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  sortableKeyboardCoordinates,
  DndContext,
  closestCenter,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  CSS$1,
  Paperclip,
  CornerDownRight,
  Trash2,
  useLoginGuard,
  useNavigate,
  useTopbarState,
  dedupedToast,
  workspaceLog,
  guardAccountSubmission,
  useBrowserImageEdit,
  RecoveringChildrenProvider,
} from "../vendor.js";
import {
  useToolConfirmSettlement,
  getPendingToolConfirms,
  getMiniBarToolConfirms,
  getLatestInlineToolConfirmId,
  aggregateToolConfirmApprovalState,
  canApproveAllToolConfirms,
} from "../m13/use-chat-rating.js";
import {
  useLoopGuardSettlement,
  useToolConfirmEditState,
  useChatConnectionPhase,
  useRuntimeMemoryReclaim,
  useChatToolbar,
} from "../m13/media-model-selector.jsx";
import { ChatEmptyState } from "../m13/empty-chat-recommendations.jsx";
import { useAstraSendGate, resolveLegacyInteractionReply } from "../m12/file-chip.jsx";
import {
  TooltipContent,
  Button$1,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "../m13/yt.jsx";
import {
  useWorkspaceChatSelector,
  shallowEqualObject,
  useWorkspaceProductionPlanDisclosureStore,
  useWorkspaceChatStoreSelector,
} from "../m12/use-asset-picker-host.jsx";
import { PencilIcon } from "../m08/browser-inspiration-urls.jsx";
import { redactForCurrentRegion } from "../m13/resolve-chat-file-reference.js";
import { ProductionPlanDisclosureContext } from "../m13/expandable-text.jsx";
import {
  MessageInput,
  useSkillReloadNotification,
  useChatReadiness,
  chatReadinessBlocksInput,
  ModeSelector,
  PromoBanner,
  ChatComplianceNotice,
} from "../m13/mode-selector.jsx";
import { TEXT_EDIT_SELECTION_MAX_LENGTH } from "../m01/myers-line-hunks.js";
import {
  applyQueuedMessageScrollRequest,
  useAgentModePreference,
} from "../m11/use-workspace-canvas-persistence.jsx";
import { useMaterializeEntity } from "../asset-center/shared/use-materialize-entity.js";
import {
  selectChatPanelState,
  isDocumentEditSubmissionForAnnotations,
  selectMessages,
  useReconnectingStuck,
  applyChatShowcaseSelection,
  useBrowserChatMedia,
  ChatHeaderContainer,
  ChatHistoryLoadingState,
  ChatStartupNotice,
  ChatReconnectNotice,
  DocumentEditReviewBar,
} from "../m13/session-tab-strip.jsx";
import {
  productionPlanDisclosureKey,
  updateProductionPlanDisclosureState,
  canOpenProductionPlan,
  ToolConfirmEditsContext,
} from "../m13/domestic-param-labels.jsx";
import { useCreditReminderConfig } from "../m09/team-credit-summary-surface.jsx";
import { getPluginAgentEditorState } from "../m03/use-plugin-host.jsx";
import { hasFileDropPayload } from "../m12/use-mention.js";
import { SKILL_DRAG_MIME } from "../m11/home-widget-host.jsx";
import { ENTITY_DRAG_MIME } from "../asset-center/shared/misc-02.jsx";
import { readEntityDragData } from "../m10/asset-center-relocation-coach-mark.jsx";
import { FileDropFeedback } from "../m12/build-doc-content-from-input.jsx";
import { WorkspaceCreationGuidePlaceholder } from "../m12/attachment-preview.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { LoopGuardAskDock, MessageListContainer, QuestionDock } from "./message-list-impl.jsx";
import {
  PendingAnnotationList,
  ProductionPlanTimeline,
  SkillReloadDock,
  StageConfirmationBar,
  ToolConfirmMiniBar,
  canCompleteProductionPlanConfirmation,
  findPendingQuestionState,
  getCurrentProductionStage,
  getStageConfirmationCopy,
  getStageDisplayName,
  nextFeedbackSentStageKey,
  nodeAgentInputPlaceholder,
  shouldRouteMessageToStageRevision,
} from "./pending-annotation-list.jsx";
import { StagePromptEditorCard } from "./stage-prompt-editor-card.jsx";
import { DevToolConfirmTrigger } from "./use-browser-video-download.jsx";
import {
  findStageReviewAnchorMessageId,
  hasConfirmedPromptReview,
  takeLatestPromptReviews,
  useProductionBoard,
} from "./use-production-board.js";
function QuestionComposerGate({ blocked, dock, children: children2 }) {
  return (
    <>
      {blocked ? dock : null}
      <div
        className={blocked ? "hidden" : "contents"}
        hidden={blocked}
        aria-hidden={blocked ? true : void 0}
        inert={blocked ? true : void 0}
      >
        {children2}
      </div>
    </>
  );
}
function queuedMessageSuccessorIds(messages2, clientMessageId) {
  const editIndex = messages2.findIndex((item) => item.clientMessageId === clientMessageId);
  if (editIndex === -1) return [];
  return messages2
    .slice(editIndex + 1)
    .map((item) => item.queueId)
    .filter((queueId) => Boolean(queueId));
}
function restoreQueuedMessageToComposer(input, message2, setPendingInput, trackInputChange) {
  input?.reset();
  setPendingInput(message2.text);
  trackInputChange(message2.text);
  input?.setInputText(message2.text);
  for (const path2 of message2.attachments ?? []) {
    const nodeId = message2.canvasNodeAttachments?.find(
      (attachment) => attachment.path === path2,
    )?.nodeId;
    input?.addFromAssetPath(path2, path2.split("/").pop() || path2, nodeId);
  }
  requestAnimationFrame(() => input?.focus());
}
function SessionListUnavailableNotice({ onRetry }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-action-ui-id="chat.session-list-unavailable"
    >
      <div className="font-medium text-foreground">
        {t2("chat.sessionListUnavailable.title", "Chat is temporarily unavailable")}
      </div>
      <div>
        {t2(
          "chat.sessionListUnavailable.description",
          "The current workspace, canvas, assets, and loaded messages remain available. Retry loading chat sessions.",
        )}
      </div>
      <Button$1 variant="outline" size="sm" className="mt-1.5 h-6 px-2 text-xs" onClick={onRetry}>
        {t2("chat.retry", "Retry")}
      </Button$1>
    </div>
  );
}
function StalledTurnBanner({ minutes, watchdog, onKeepWaiting, onStop }) {
  const { t: t2 } = useTranslation();
  const isHardCap = watchdog === "hard_cap";
  return (
    <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="font-medium text-foreground">
        {isHardCap
          ? t2("chat.stalled.hardCapTitle", "Task has been running for a long time")
          : t2("chat.stalled.title", "Task is running but hasn't responded for a while")}
      </div>
      <div>
        {isHardCap
          ? t2(
              "chat.stalled.hardCapDescription",
              "This task has been running for about {{minutes}} min. You can keep waiting or stop it.",
              {
                minutes,
              },
            )
          : t2(
              "chat.stalled.description",
              "No new progress for about {{minutes}} min. You can keep waiting or stop this task.",
              {
                minutes,
              },
            )}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Button$1
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-keep-waiting-button"
          onClick={onKeepWaiting}
        >
          {t2("chat.stalled.keepWaiting", "Keep waiting")}
        </Button$1>
        <Button$1
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-stop-task-button"
          onClick={onStop}
        >
          {t2("chat.stalled.stopTask", "Stop task")}
        </Button$1>
      </div>
    </div>
  );
}
const SELECTION_PLACEHOLDER = {
  key: "chat.textEditAgent.selectionPlaceholder",
  fallback: "How should I revise this selection? Tell me the tone, focus, or length",
};
const WHOLE_DOCUMENT_PLACEHOLDER = {
  key: "chat.textEditAgent.wholeDocumentPlaceholder",
  fallback: "Want to make the whole piece shine? Tell me the goal, tone, or length",
};
function textAgentInputPlaceholder(hasSelection2) {
  return hasSelection2 ? SELECTION_PLACEHOLDER : WHOLE_DOCUMENT_PLACEHOLDER;
}
function encodeArgs(args) {
  return JSON.stringify(args);
}
function parseArgs(args) {
  if (!args) return void 0;
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function sameArgs(a2, b3) {
  if (!a2) return false;
  return JSON.stringify(a2) === JSON.stringify(b3);
}
function toolNameMatches(name2, target) {
  return name2 === target;
}
function toolMessageMatches(message2, ask) {
  if (message2.type !== "tool") return false;
  const target = ask.toolConfirmData?.tool;
  const originalArgs = ask.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  const tool2 = message2;
  if (!toolNameMatches(tool2.toolName ?? tool2.content, target)) return false;
  return sameArgs(parseArgs(tool2.toolArgs), originalArgs);
}
function subToolMatches(sub, ask) {
  if (sub.type !== "tool") return false;
  const target = ask.toolConfirmData?.tool;
  const originalArgs = ask.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  if (!toolNameMatches(sub.content, target)) return false;
  return sameArgs(parseArgs(sub.args), originalArgs);
}
function applyToolArgsToMessage(message2, modifiedArgs) {
  if (message2.type !== "tool") return message2;
  const tool2 = message2;
  const encoded = encodeArgs(modifiedArgs);
  return {
    ...tool2,
    toolArgs: encoded,
    url: tool2.url === tool2.toolArgs ? encoded : tool2.url,
  };
}
function applyToolArgsToSubAgent(message2, ask, modifiedArgs) {
  const subs = message2.subMessages ?? [];
  for (let i2 = subs.length - 1; i2 >= 0; i2--) {
    const sub = subs[i2];
    if (!subToolMatches(sub, ask)) continue;
    const nextSubs = [...subs];
    nextSubs[i2] = {
      ...sub,
      args: encodeArgs(modifiedArgs),
    };
    return {
      ...message2,
      subMessages: nextSubs,
    };
  }
  return void 0;
}
function applyToolConfirmReplyOptimisticUpdate(messages2, reply) {
  const askIndex = messages2.findIndex(
    (message2) => message2.type === "tool_confirm_ask" && message2.requestId === reply.id,
  );
  if (askIndex < 0) return [...messages2];
  const ask = messages2[askIndex];
  const next2 = [...messages2];
  const modifiedArgs = reply.decision === "confirm" ? reply.modified_args : void 0;
  next2[askIndex] = {
    ...ask,
    resolved: true,
    toolConfirmDecision: reply.decision,
    ...(modifiedArgs && ask.toolConfirmData
      ? {
          toolConfirmData: {
            ...ask.toolConfirmData,
            args: modifiedArgs,
          },
        }
      : {}),
  };
  if (!modifiedArgs) return next2;
  for (let i2 = askIndex - 1; i2 >= 0; i2--) {
    const message2 = next2[i2];
    if (toolMessageMatches(message2, ask)) {
      next2[i2] = applyToolArgsToMessage(message2, modifiedArgs);
      break;
    }
    if (message2.type === "sub_agent") {
      const updated = applyToolArgsToSubAgent(message2, ask, modifiedArgs);
      if (updated) {
        next2[i2] = updated;
        break;
      }
    }
  }
  return next2;
}
const restrictToVerticalAxis = ({ transform: transform2 }) => ({
  ...transform2,
  x: 0,
});
const SELECTION_QUOTE_MAX_LENGTH = 40;
const DOCUMENT_EDIT_TARGETS_PER_ANNOTATION = 32;
function buildSelectionQuote(anchors2) {
  const normalized = anchors2
    .map((anchor) => anchor.exact)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= SELECTION_QUOTE_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, SELECTION_QUOTE_MAX_LENGTH)}…`;
}
const MILLISECONDS_PER_MINUTE = 6e4;
const restrictToParentElement = ({
  transform: transform2,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) return transform2;
  const next2 = {
    ...transform2,
  };
  if (draggingNodeRect.top + next2.y < containerNodeRect.top) {
    next2.y = containerNodeRect.top - draggingNodeRect.top;
  }
  if (draggingNodeRect.bottom + next2.y > containerNodeRect.bottom) {
    next2.y = containerNodeRect.bottom - draggingNodeRect.bottom;
  }
  return next2;
};
function QueuedUserMessageList({
  messages: messages2,
  scrollRequest,
  onEdit,
  onDelete,
  onSendNow,
  onReorder,
}) {
  const { t: t2 } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const itemIds = reactExports.useMemo(
    () => messages2.map((m3) => m3.queueId ?? m3.clientMessageId),
    [messages2],
  );
  const queuedMessageScrollRef = reactExports.useRef(null);
  const [canScrollUp, setCanScrollUp] = reactExports.useState(false);
  const [canScrollDown, setCanScrollDown] = reactExports.useState(false);
  const syncQueuedMessageScroll = reactExports.useCallback(() => {
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop < maxScrollTop - 1);
  }, []);
  reactExports.useLayoutEffect(() => {
    if (messages2.length === 0) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    syncQueuedMessageScroll();
    if (typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(syncQueuedMessageScroll);
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [messages2.length, syncQueuedMessageScroll]);
  reactExports.useLayoutEffect(() => {
    if (!scrollRequest) return;
    const el = queuedMessageScrollRef.current;
    if (!el) return;
    applyQueuedMessageScrollRequest(el, scrollRequest);
    syncQueuedMessageScroll();
  }, [scrollRequest, syncQueuedMessageScroll]);
  const handleDragEnd = reactExports.useCallback(
    (event) => {
      const { active: active2, over } = event;
      if (!over || active2.id === over.id) return;
      const sourceIndex = itemIds.indexOf(active2.id);
      const targetIndex = itemIds.indexOf(over.id);
      if (sourceIndex === -1 || targetIndex === -1) return;
      onReorder(sourceIndex, targetIndex);
    },
    [itemIds, onReorder],
  );
  if (messages2.length === 0) return null;
  const isDraggable = messages2.length >= 2;
  return (
    <div className="-mb-3 mx-3 overflow-hidden rounded-xl border border-border bg-card pl-3 pr-1 pt-1 pb-4 relative z-0">
      <div
        ref={queuedMessageScrollRef}
        onScroll={syncQueuedMessageScroll}
        data-action-ui-id="chat-queued-message-list"
        className="-ml-3 max-h-[min(9rem,calc(24vh-1.25rem-2px))] overflow-y-auto pl-3 scrollbar-none"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {messages2.map((message2, index2) => (
              <SortableQueuedRow
                key={message2.queueId ?? message2.clientMessageId}
                id={message2.queueId ?? message2.clientMessageId}
                message={message2}
                index={index2}
                draggable={isDraggable}
                onEdit={onEdit}
                onDelete={onDelete}
                onSendNow={onSendNow}
                t={t2}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {canScrollUp && (
        <div
          className="pointer-events-none absolute inset-x-px top-1 z-20 h-6 bg-gradient-to-b from-card via-card/80 to-transparent"
          data-action-ui-id="chat-queued-message-top-fade"
          aria-hidden="true"
        />
      )}
      {canScrollDown && (
        <div
          className="pointer-events-none absolute inset-x-px bottom-3 z-20 h-6 bg-gradient-to-b from-transparent via-card/80 to-card"
          data-action-ui-id="chat-queued-message-bottom-fade"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
function SortableQueuedRow({
  id: id2,
  message: message2,
  index: index2,
  draggable,
  onEdit,
  onDelete,
  onSendNow,
  t: t2,
}) {
  const {
    attributes,
    listeners: listeners2,
    setNodeRef,
    transform: transform2,
    transition: transition2,
    isDragging,
  } = useSortable({
    id: id2,
  });
  const style2 = {
    transform: CSS$1.Transform.toString(transform2),
    transition: transition2,
    opacity: isDragging ? 0.9 : 1,
    // 提高拖拽时的层级,避免被相邻行覆盖
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };
  const displayText = message2.text
    ? redactForCurrentRegion(message2.text)
    : t2("chat.queue.attachmentOnly");
  return (
    <div
      ref={setNodeRef}
      data-queued-client-message-id={message2.clientMessageId}
      style={style2}
      className={`group/queued-row relative flex h-8 items-center gap-1 rounded-md pr-0.5 text-xs text-muted-foreground ${isDragging ? "bg-foreground/5" : ""}`}
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners2}
          className="absolute -left-3 top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground/40 transition-colors group-hover/queued-row:text-foreground/70 hover:bg-transparent hover:text-foreground/70 focus-visible:text-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 cursor-grab active:cursor-grabbing"
          aria-label={t2("chat.queue.dragToReorder", {
            defaultValue: "Drag to reorder",
          })}
        >
          <span className="grid -translate-x-0.5 grid-cols-2 gap-0.5" aria-hidden={true}>
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
            <span className="size-0.5 rounded-full bg-current" />
          </span>
        </button>
      )}
      <span className="w-4 text-right tabular-nums shrink-0">{index2 + 1}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{displayText}</span>
      {(message2.attachments?.length ?? 0) > 0 && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap shrink-0 mr-1">
          <Paperclip className="size-3" />
          {message2.attachments?.length}
        </span>
      )}
      <div className="flex h-7 w-36 shrink-0 items-center justify-end gap-1">
        {message2.status === "sending" ? (
          // 瞬态状态原位替换动作区；固定 action rail 宽度避免发送时正文突然回流。
          <span className="inline-flex h-7 items-center gap-1 whitespace-nowrap pl-1.5 pr-2 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t2("chat.queue.sending")}
          </span>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-0.5 rounded-md pl-1.5 pr-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    aria-label={t2("chat.queue.sendNow")}
                    data-action-ui-id="chat-queued-message-send-now"
                    onClick={() => onSendNow(message2)}
                  >
                    <Icon icon={CornerDownRight} size="sm" aria-hidden={true} />
                    {message2.reviewPaused ? t2("common.retry") : t2("chat.queue.sendNow")}
                  </Button$1>
                }
              />
              <TooltipContent side="top">
                {t2("chat.queue.sendNowTooltip", "Stop the current response and send immediately")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 -ml-1 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    aria-label={t2("chat.queue.edit")}
                    data-action-ui-id="chat-queued-message-edit"
                    onClick={() => onEdit(message2)}
                  >
                    <PencilIcon className="size-3" />
                  </Button$1>
                }
              />
              <TooltipContent side="top">{t2("chat.queue.edit")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 -ml-1 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-destructive"
                    aria-label={t2("chat.queue.delete")}
                    data-action-ui-id="chat-queued-message-delete"
                    onClick={() => onDelete(message2)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </Button$1>
                }
              />
              <TooltipContent side="top">{t2("chat.queue.delete")}</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}
export function ChatPanel({
  onCollapse: _onCollapse,
  headerActions,
  textEditMode,
  textEditChatStatus,
  textEditSession,
  textEditSelectionRef,
  hasTextEditSelection = false,
  pluginEditMode,
  pluginEditChatStatus,
  pluginEditSession,
  pluginEditAgentName,
  pluginEditPluginId,
  annotations,
  activeAnnotationId,
  onAnnotationLocate,
  onAnnotationDelete,
  onAnnotationClear,
  isPresented = true,
}) {
  const { t: t2, i18n } = useTranslation();
  const { guard: loginGuard, LoginDialog } = useLoginGuard();
  const navigate = useNavigate();
  const { currentWorkspaceId } = useTopbarState();
  const workspaceId2 = useGatewayScopeKey();
  const isActiveRef = reactExports.useRef(currentWorkspaceId === workspaceId2);
  isActiveRef.current = currentWorkspaceId === workspaceId2;
  const currentWorkspacePath = useCurrentWorkspace();
  const materializeEntityMutation = useMaterializeEntity();
  const selected2 = useWorkspaceChatSelector(selectChatPanelState, shallowEqualObject);
  const mediaReviewing = useWorkspaceChatSelector((chat) =>
    chat.messageDeliveryStates.some(
      (state2) =>
        state2.sessionId === chat.focusedSessionId &&
        state2.status === "sent" &&
        state2.phase === "media_review",
    ),
  );
  const {
    connected,
    sessionsLoading,
    conversationLoading,
    sessionListUnavailable,
    retrySessionList,
    messages: messages2,
    busy,
    pendingReasons,
    historyLoadFailed,
    historyReloading,
    switching,
    creatingSession,
    focusedSessionId,
    input: pendingInput,
    setInput: setPendingInput,
    pendingEditorDoc,
    handlePendingInputConsumed,
    sendMessage,
    handleRetry,
    handleCancel,
    stalledSessions,
    stopStalledSession,
    dismissStalledNotice,
    reloadSessionHistory,
    sendWsMessage,
    sessionStore,
    forkSession,
    selectedModelId,
    handleModelSelectionChange,
    selectedMediaModels,
    handleSelectedMediaModelsChange,
    trackInputChange,
    trackAttachmentsChange,
    pendingEditorReset,
    pendingComposerReset,
    restoreDraft,
    pendingAttachments,
    handlePendingAttachmentsConsumed,
    queuedUserMessages,
    queuedUserMessageScrollRequest,
    cancelQueuedUserMessage,
    sendQueuedUserMessageNow,
    reorderQueuedUserMessage,
    documentEditSubmissions,
  } = selected2;
  const astraSendGate = useAstraSendGate(selectedModelId);
  const [activeDocumentEditRequestId, setActiveDocumentEditRequestId] = reactExports.useState(null);
  const submittedAnnotationIdsRef = reactExports.useRef([]);
  const activeDocumentEditSubmissionCandidate = activeDocumentEditRequestId
    ? documentEditSubmissions?.get(activeDocumentEditRequestId)
    : void 0;
  const activeSubmissionMatchesAnnotations = isDocumentEditSubmissionForAnnotations(
    submittedAnnotationIdsRef.current,
    annotations ?? [],
  );
  const documentEditInFlight =
    activeDocumentEditSubmissionCandidate?.status === "submitting" ||
    activeDocumentEditSubmissionCandidate?.status === "accepted" ||
    activeDocumentEditSubmissionCandidate?.status === "running";
  const activeDocumentEditSubmission =
    documentEditInFlight || activeSubmissionMatchesAnnotations
      ? activeDocumentEditSubmissionCandidate
      : void 0;
  const inputRef = reactExports.useRef(null);
  const questionFileDropHandlerRef = reactExports.useRef(void 0);
  const handleQuestionFileDropHandlerChange = reactExports.useCallback((handler) => {
    questionFileDropHandlerRef.current = handler;
  }, []);
  const queuedEditRestoreRef = reactExports.useRef(null);
  const pendingQueuedEditClientMessageIdRef = reactExports.useRef(null);
  const composerSendPreparingRef = reactExports.useRef(false);
  const [composerSendPreparing, setComposerSendPreparing] = reactExports.useState(false);
  const handleComposerSendPreparingChange = reactExports.useCallback((preparing2) => {
    composerSendPreparingRef.current = preparing2;
    setComposerSendPreparing(preparing2);
  }, []);
  const showcaseSelectionSeqRef = reactExports.useRef(0);
  const showcaseAttachmentAbortRef = reactExports.useRef(null);
  const [showcaseAttachmentsLoading, setShowcaseAttachmentsLoading] = reactExports.useState(false);
  const stagePromptEditorRef = reactExports.useRef(null);
  const productionPlanMessagePendingRef = reactExports.useRef(false);
  const productionPlanConfirmTransitionRef = reactExports.useRef(void 0);
  const processedResetRef = reactExports.useRef(pendingEditorReset);
  reactExports.useEffect(() => {
    if (pendingEditorReset > processedResetRef.current) {
      processedResetRef.current = pendingEditorReset;
      if (inputRef.current?.isSelectSkillPending?.()) return;
      inputRef.current?.resetInput();
    }
  }, [pendingEditorReset]);
  const processedComposerResetRef = reactExports.useRef(pendingComposerReset);
  reactExports.useEffect(() => {
    if (pendingComposerReset <= processedComposerResetRef.current) return;
    processedComposerResetRef.current = pendingComposerReset;
    inputRef.current?.reset();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [pendingComposerReset]);
  reactExports.useEffect(() => {
    restoreDraft();
  }, [restoreDraft]);
  const nodeEditMode = !!textEditMode || !!pluginEditMode;
  const nodeEditAgentLabels = reactExports.useMemo(
    () =>
      pluginEditMode
        ? {
            preparing: t2("chat.pluginEditAgent.preparing", "Preparing editor Agent..."),
            prepareFailed: t2(
              "chat.pluginEditAgent.prepareFailed",
              "Editor Agent could not be prepared. Close the editor and try again.",
            ),
            preparingPlaceholder: t2(
              "chat.pluginEditAgent.preparingPlaceholder",
              "Editor Agent is getting ready...",
            ),
          }
        : {
            preparing: t2("chat.textEditAgent.preparing", "Preparing Text Assistant..."),
            prepareFailed: t2(
              "chat.textEditAgent.prepareFailed",
              "Text Assistant could not be prepared. Close the editor and try again.",
            ),
            preparingPlaceholder: t2(
              "chat.textEditAgent.preparingPlaceholder",
              "Text Assistant is getting ready...",
            ),
          },
    [pluginEditMode, t2],
  );
  const nodeEditChatStatus = pluginEditMode ? pluginEditChatStatus : textEditChatStatus;
  const nodeEditSkillMode = textEditMode
    ? "text-editor"
    : pluginEditPluginId === "3d-director-stage"
      ? "director-stage"
      : pluginEditMode
        ? "clip-editor"
        : void 0;
  const isSpecialNodeSession =
    nodeEditSkillMode === "director-stage" || nodeEditSkillMode === "clip-editor";
  const nodeSkillLabel =
    nodeEditSkillMode === "director-stage"
      ? t2("chat.emptyRecommendations.skillTab.directorAgent")
      : nodeEditSkillMode === "clip-editor"
        ? t2("chat.emptyRecommendations.skillTab.clipAgent")
        : void 0;
  const textEditConversationReady = !nodeEditMode || nodeEditChatStatus === "ready";
  const textEditConversationFailed = nodeEditMode && nodeEditChatStatus === "error";
  const visibleMessages = selectMessages(messages2, textEditConversationReady, !!textEditMode);
  const hasActiveSession = visibleMessages.length > 0;
  const showConversationLoading = textEditConversationReady && (conversationLoading || switching);
  const {
    pendingSkills,
    reload: reloadSkills,
    dismiss: dismissSkillReload,
  } = useSkillReloadNotification(hasActiveSession);
  const productionPlan = useProductionBoard(messages2, focusedSessionId);
  const productionPlanKey = productionPlanDisclosureKey(focusedSessionId);
  const productionPlanDisclosureStore = useWorkspaceProductionPlanDisclosureStore();
  const productionPlanExpanded = useWorkspaceChatStoreSelector(
    productionPlanDisclosureStore,
    (snapshot2) => (productionPlanKey ? snapshot2.get(productionPlanKey) : void 0),
  );
  const updateProductionPlanDisclosure = reactExports.useCallback(
    (event) => {
      if (!productionPlanKey) return;
      const current2 = productionPlanDisclosureStore.getSnapshot();
      const next2 = updateProductionPlanDisclosureState(current2, productionPlanKey, event);
      if (next2 === current2) return;
      productionPlanDisclosureStore.setSnapshot(next2);
    },
    [productionPlanDisclosureStore, productionPlanKey],
  );
  reactExports.useEffect(() => {
    if (!productionPlan.planId || !productionPlanKey) return;
    updateProductionPlanDisclosure("plan-discovered");
  }, [productionPlan.planId, productionPlanKey, updateProductionPlanDisclosure]);
  const collapseProductionPlan = reactExports.useCallback(() => {
    if (!productionPlan.planId) return;
    updateProductionPlanDisclosure("message-sent");
  }, [productionPlan.planId, updateProductionPlanDisclosure]);
  const openProductionPlan = reactExports.useCallback(
    (requestedPlanId) => {
      if (!canOpenProductionPlan(productionPlan.planId, requestedPlanId)) return false;
      updateProductionPlanDisclosure("timeline-opened");
      return true;
    },
    [productionPlan.planId, updateProductionPlanDisclosure],
  );
  const productionPlanDisclosureValue = reactExports.useMemo(
    () => ({
      activePlanId: productionPlan.planId,
      openPlan: openProductionPlan,
    }),
    [openProductionPlan, productionPlan.planId],
  );
  const handleProductionPlanExpandedChange = reactExports.useCallback(
    (expanded) => {
      updateProductionPlanDisclosure(expanded ? "manually-expanded" : "manually-collapsed");
    },
    [updateProductionPlanDisclosure],
  );
  const currentProductionStage = getCurrentProductionStage(productionPlan.model);
  const waitingStageKey =
    currentProductionStage?.status === "waiting_user" && productionPlan.planId
      ? `${productionPlan.planId}:${currentProductionStage.id}:${productionPlan.revision ?? ""}`
      : void 0;
  const productionPlanConfirmationScopeKey = `${focusedSessionId ?? ""}\0${productionPlan.planId ?? ""}\0${currentProductionStage?.id ?? ""}`;
  const productionPlanConfirmationGenerationRef = reactExports.useRef({
    key: productionPlanConfirmationScopeKey,
    generation: 0,
  });
  if (productionPlanConfirmationGenerationRef.current.key !== productionPlanConfirmationScopeKey) {
    productionPlanConfirmationGenerationRef.current = {
      key: productionPlanConfirmationScopeKey,
      generation: productionPlanConfirmationGenerationRef.current.generation + 1,
    };
  }
  const productionPlanConfirmationIdentity = {
    sessionId: focusedSessionId,
    planId: productionPlan.planId,
    stageId: currentProductionStage?.id,
    revision: productionPlan.revision,
    editable: productionPlan.editable,
    generation: productionPlanConfirmationGenerationRef.current.generation,
  };
  const productionPlanConfirmationIdentityRef = reactExports.useRef(
    productionPlanConfirmationIdentity,
  );
  productionPlanConfirmationIdentityRef.current = productionPlanConfirmationIdentity;
  const [feedbackSentStageKey, setFeedbackSentStageKey] = reactExports.useState();
  const userMessageSignature = messages2
    .filter((m3) => m3.role === "user" && m3.type === "text")
    .map((m3) => m3.id)
    .join("\n");
  const userMessageHistory = reactExports.useMemo(
    () => messages2.filter((m3) => m3.role === "user" && m3.type === "text"),
    [userMessageSignature],
  );
  const mockToolConfirm = useDebugFlag(DEBUG_FLAGS.mockToolConfirm);
  const { pendingQuestion, pendingQuestionFailureId } = reactExports.useMemo(
    () => findPendingQuestionState(messages2),
    [messages2],
  );
  const pendingLoopGuard = reactExports.useMemo(() => {
    for (let i2 = messages2.length - 1; i2 >= 0; i2--) {
      const m3 = messages2[i2];
      if (m3.type === "loop_guard_ask" && !m3.resolved) return m3;
    }
    return null;
  }, [messages2]);
  const handleRejectedLoopGuardSettlement = reactExports.useCallback(
    (cause, _intent) => {
      if (cause === "session_cancelled" || cause === "session_deleted") return;
      if (cause === "timeout") {
        dedupedToast.warning(
          t2(
            "chat.loopGuard.timeoutNotice",
            "The confirmation expired before your choice was accepted. Please retry the operation.",
          ),
        );
        return;
      }
      if (cause === "runtime_restarted") {
        dedupedToast.warning(
          t2(
            "chat.loopGuard.runtimeRestartedNotice",
            "The local service reconnected, so this confirmation was cancelled. Please retry the operation.",
          ),
        );
        return;
      }
      if (cause === "transport_closed") {
        dedupedToast.warning(
          t2(
            "chat.loopGuard.transportClosedNotice",
            "The connection closed, so this confirmation was cancelled. Please retry the operation.",
          ),
        );
        return;
      }
      dedupedToast.warning(
        t2(
          "chat.loopGuard.unavailableNotice",
          "We could not verify whether this choice took effect. Check the current task state before retrying.",
        ),
      );
    },
    [t2],
  );
  const handleLoopGuardAckTimeout = reactExports.useCallback(() => {
    dedupedToast.warning(
      t2(
        "chat.loopGuard.ackTimeoutNotice",
        "No confirmation result was received. You can choose again without losing the conversation.",
      ),
    );
  }, [t2]);
  const handleConflictingLoopGuardSettlement = reactExports.useCallback(() => {
    dedupedToast.warning(
      t2(
        "chat.loopGuard.conflictingDecisionNotice",
        "Another choice was already accepted for this confirmation. The earlier choice remains in effect.",
      ),
    );
  }, [t2]);
  const { beginSubmission: beginLoopGuardSubmission, isSubmitting: isLoopGuardSubmitting } =
    useLoopGuardSettlement({
      messages: messages2,
      isPresented,
      focusedSessionId,
      onRejectedSettlement: handleRejectedLoopGuardSettlement,
      onConflictingSettlement: handleConflictingLoopGuardSettlement,
      onAckTimeout: handleLoopGuardAckTimeout,
    });
  const handleToolConfirmAckTimeout = reactExports.useCallback(() => {
    dedupedToast.warning(
      t2(
        "chat.toolConfirm.ackTimeoutNotice",
        "No confirmation result was received. You can choose again without losing the conversation.",
      ),
    );
  }, [t2]);
  const { submit: submitToolConfirm, submittingIds: submittingToolConfirmIds } =
    useToolConfirmSettlement({
      messages: messages2,
      isPresented,
      focusedSessionId,
      onAckTimeout: handleToolConfirmAckTimeout,
    });
  const pendingToolConfirms = reactExports.useMemo(
    () => getPendingToolConfirms(messages2),
    [messages2],
  );
  const miniBarToolConfirms = reactExports.useMemo(
    () => getMiniBarToolConfirms(pendingToolConfirms, messages2),
    [messages2, pendingToolConfirms],
  );
  const inlineEditorFocusMessageId = reactExports.useMemo(
    () => getLatestInlineToolConfirmId(pendingToolConfirms, messages2),
    [messages2, pendingToolConfirms],
  );
  const {
    approvalState: toolConfirmApprovalState,
    contextValue: toolConfirmEditsContextValue,
    edits: toolConfirmEdits,
  } = useToolConfirmEditState(pendingToolConfirms, submittingToolConfirmIds);
  const aggregateApprovalState = reactExports.useMemo(
    () => aggregateToolConfirmApprovalState(miniBarToolConfirms, toolConfirmApprovalState),
    [miniBarToolConfirms, toolConfirmApprovalState],
  );
  const [sessionMode, setAgentModePreference] = useAgentModePreference();
  const {
    config: creditReminderConfig,
    isReady: creditReminderReady,
    saveConfig: setCreditReminderConfig,
  } = useCreditReminderConfig();
  const handleCreditReminderConfigChange = reactExports.useCallback(
    async (nextConfig) => {
      await setCreditReminderConfig(nextConfig);
      if (!focusedSessionId) return;
      sendWsMessage({
        type: "set_credit_reminder_config",
        session_id: focusedSessionId,
        enabled: nextConfig.enabled,
        threshold: nextConfig.threshold,
      });
    },
    [focusedSessionId, sendWsMessage, setCreditReminderConfig],
  );
  reactExports.useEffect(() => {
    if (!connected || !creditReminderReady || !focusedSessionId) return;
    sendWsMessage({
      type: "set_credit_reminder_config",
      session_id: focusedSessionId,
      enabled: creditReminderConfig.enabled,
      threshold: creditReminderConfig.threshold,
    });
  }, [connected, creditReminderConfig, creditReminderReady, focusedSessionId, sendWsMessage]);
  const handleModeChange = reactExports.useCallback(
    (mode2) => {
      if (composerSendPreparingRef.current) return;
      setAgentModePreference(mode2);
      if (focusedSessionId) {
        sendWsMessage({
          type: "set_mode",
          mode: mode2,
          session_id: focusedSessionId,
        });
      }
    },
    [focusedSessionId, sendWsMessage, setAgentModePreference],
  );
  const handleComposerModelSelectionChange = reactExports.useCallback(
    (next2, rememberForNewChats = false) => {
      if (composerSendPreparingRef.current) return;
      handleModelSelectionChange(next2, rememberForNewChats);
    },
    [handleModelSelectionChange],
  );
  const agentRunning = busy || pendingReasons.length > 0;
  const stalledInfo = focusedSessionId ? stalledSessions[focusedSessionId] : void 0;
  const showStalledBanner = Boolean(stalledInfo) && agentRunning;
  const stalledBasisMs =
    stalledInfo?.watchdog === "hard_cap" ? stalledInfo.elapsedMs : stalledInfo?.silentMs;
  const stalledMinutes = Math.max(1, Math.round((stalledBasisMs ?? 0) / MILLISECONDS_PER_MINUTE));
  const recoveringChildSessionIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const r2 of pendingReasons) {
      if (r2.kind === "generation_recovery") {
        for (const id2 of r2.childSessionIds ?? []) ids2.add(id2);
      }
    }
    return ids2;
  }, [pendingReasons]);
  const isRecovering = pendingReasons.some((r2) => r2.kind === "generation_recovery");
  const connectionPhase = useChatConnectionPhase(workspaceId2, connected);
  const connecting = connectionPhase === "connecting";
  const reconnecting = connectionPhase === "reconnecting";
  const connectionUnavailable = connectionPhase !== "connected";
  const reclaimedByMemory = useRuntimeMemoryReclaim();
  const reconnectingStuck = useReconnectingStuck(reconnecting);
  const reconnectBanner =
    reconnectingStuck && reclaimedByMemory
      ? {
          title: t2(
            "chat.reconnecting.stuckMemoryTitle",
            "Low memory — still can't reach the runtime",
          ),
          description: t2(
            "chat.reconnecting.stuckDescription",
            "Auto-reconnect isn't recovering. Close other memory-heavy apps, then restart the app and try again.",
          ),
        }
      : reconnectingStuck
        ? {
            title: t2("chat.reconnecting.stuckTitle", "Still can't reach the runtime"),
            description: t2(
              "chat.reconnecting.stuckDescription",
              "Auto-reconnect isn't recovering. Close other memory-heavy apps, then restart the app and try again.",
            ),
          }
        : reclaimedByMemory
          ? {
              title: t2(
                "chat.reconnecting.memoryTitle",
                "Low system memory — runtime was reclaimed",
              ),
              description: t2(
                "chat.reconnecting.memoryDescription",
                "Recovering automatically. Close some memory-heavy apps or workspaces and try again.",
              ),
            }
          : {
              title: t2("chat.reconnecting.title", "Reconnecting to runtime..."),
              description: t2(
                "chat.reconnecting.description",
                "Messages are paused until the connection is restored.",
              ),
            };
  const chatReadiness = useChatReadiness();
  const starting = chatReadiness === "starting";
  const preparing = starting || connecting;
  const providersUnavailable = chatReadiness === "providers_unavailable";
  const runtimeUnavailable = chatReadiness === "runtime_unavailable";
  const sessionListStalled = sessionListUnavailable?.stalled === true;
  const readinessLocked = chatReadinessBlocksInput(chatReadiness);
  const [retryingProviders, setRetryingProviders] = reactExports.useState(false);
  const handleRetryProviders = reactExports.useCallback(async () => {
    setRetryingProviders(true);
    try {
      await window.hilo.opencode.restart();
    } catch {
    } finally {
      setRetryingProviders(false);
    }
  }, []);
  const inputLocked =
    !!pendingQuestion ||
    !!pendingLoopGuard ||
    connectionUnavailable ||
    conversationLoading ||
    switching ||
    (creatingSession && !focusedSessionId) ||
    readinessLocked ||
    sessionListStalled ||
    isRecovering ||
    !textEditConversationReady ||
    composerSendPreparing ||
    showcaseAttachmentsLoading;
  const renderToolbar = useChatToolbar({
    busy: inputLocked,
    running: textEditConversationReady && agentRunning,
    selectedModelId,
    selectedMediaModels,
    onModelSelectionChange: handleComposerModelSelectionChange,
    skillLabel: nodeSkillLabel,
    hideMediaModelSelector: isSpecialNodeSession,
  });
  const modeSelectorSlot = reactExports.useMemo(
    () =>
      isSpecialNodeSession ? null : (
        <ModeSelector
          mode={sessionMode}
          onChange={handleModeChange}
          disabled={composerSendPreparing}
          creditReminderConfig={creditReminderReady ? creditReminderConfig : void 0}
          onCreditReminderConfigChange={
            creditReminderReady ? handleCreditReminderConfigChange : void 0
          }
        />
      ),
    [
      creditReminderConfig,
      creditReminderReady,
      handleCreditReminderConfigChange,
      handleModeChange,
      isSpecialNodeSession,
      composerSendPreparing,
      sessionMode,
    ],
  );
  const inputPlaceholderBusy = reactExports.useMemo(() => {
    if (textEditConversationFailed) {
      return t2("chat.textEditAgent.failedPlaceholder", "Close the editor and try again.");
    }
    if (!textEditConversationReady) {
      return nodeEditAgentLabels.preparingPlaceholder;
    }
    if (showcaseAttachmentsLoading) {
      return t2("home.scene.loadingAssets", "Loading reference assets...");
    }
    if (preparing) {
      return t2("chat.starting.placeholder", "Agent is getting ready...");
    }
    if (providersUnavailable) {
      return t2("chat.providersUnavailable.placeholder", "AI service unavailable — chat is paused");
    }
    if (runtimeUnavailable) {
      return t2("chat.runtimeUnavailable.placeholder", "Runtime recovering — chat is paused");
    }
    if (isRecovering) {
      return t2("chat.recovering.placeholder", "正在恢复并继续生成…");
    }
    if (reconnecting) {
      return t2("chat.reconnecting.placeholder", "Reconnecting...");
    }
    return t2("chat.queue.placeholder", "Type ahead, your message will be queued...");
  }, [
    nodeEditAgentLabels,
    textEditConversationFailed,
    textEditConversationReady,
    showcaseAttachmentsLoading,
    preparing,
    providersUnavailable,
    runtimeUnavailable,
    isRecovering,
    reconnecting,
    t2,
  ]);
  const inputPlaceholder = reactExports.useMemo(() => {
    if (nodeEditMode && textEditConversationFailed) {
      return t2("chat.textEditAgent.failedPlaceholder", "Close the editor and try again.");
    }
    if (nodeEditMode && !textEditConversationReady) {
      return nodeEditAgentLabels.preparingPlaceholder;
    }
    if (nodeEditSkillMode === "director-stage" || nodeEditSkillMode === "clip-editor") {
      const placeholder = nodeAgentInputPlaceholder(nodeEditSkillMode);
      return t2(placeholder.key, placeholder.fallback);
    }
    if (textEditMode) {
      const placeholder = textAgentInputPlaceholder(hasTextEditSelection);
      return t2(placeholder.key, placeholder.fallback);
    }
    return waitingStageKey && feedbackSentStageKey !== waitingStageKey
      ? t2(
          "productionPlan.feedbackPlaceholder",
          "输入文字将作为本阶段修改意见；添加附件则作为普通消息发送",
        )
      : void 0;
  }, [
    feedbackSentStageKey,
    hasTextEditSelection,
    nodeEditAgentLabels,
    nodeEditMode,
    nodeEditSkillMode,
    t2,
    textEditConversationFailed,
    textEditConversationReady,
    textEditMode,
    waitingStageKey,
  ]);
  const handleShowcaseSelect = reactExports.useCallback(
    (item) => {
      if (composerSendPreparingRef.current) return;
      if (item.action.kind !== "query" || !inputRef.current) return;
      const seq2 = ++showcaseSelectionSeqRef.current;
      showcaseAttachmentAbortRef.current?.abort();
      const hasDownloadableAttachments = item.action.query.attachments.some(
        (attachment) => attachment.assetUrl,
      );
      const abortController = hasDownloadableAttachments ? new AbortController() : null;
      showcaseAttachmentAbortRef.current = abortController;
      setShowcaseAttachmentsLoading(hasDownloadableAttachments);
      void applyChatShowcaseSelection({
        item,
        language: i18n.language,
        input: inputRef.current,
        selectedMediaModels,
        onSelectedMediaModelsChange: handleSelectedMediaModelsChange,
        signal: abortController?.signal,
      })
        .then(({ failed }) => {
          if (seq2 !== showcaseSelectionSeqRef.current || failed.length === 0) return;
          dedupedToast.warning(
            t2("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh")
                ? "无法加载附件 {{names}}，请手动上传"
                : "Failed to load attachment {{names}}, please upload manually",
              names: failed.map((attachment) => attachment.name).join("、"),
            }),
          );
        })
        .catch((error) => {
          if (seq2 !== showcaseSelectionSeqRef.current || abortController?.signal.aborted) return;
          inputRef.current?.clearAttachments({
            source: "scene-query",
          });
          workspaceLog.warn("chat: showcase-attachments-fetch-error", {
            error,
          });
          dedupedToast.warning(
            t2("home.scene.assetFetchFailed", {
              defaultValue: i18n.language.startsWith("zh")
                ? "无法加载场景附件，请手动上传"
                : "Failed to load scene attachments, please upload manually",
              names:
                item.action.kind === "query"
                  ? item.action.query.attachments.map((attachment) => attachment.name).join("、")
                  : "",
            }),
          );
        })
        .finally(() => {
          if (seq2 !== showcaseSelectionSeqRef.current) return;
          if (showcaseAttachmentAbortRef.current === abortController) {
            showcaseAttachmentAbortRef.current = null;
          }
          setShowcaseAttachmentsLoading(false);
        });
    },
    [handleSelectedMediaModelsChange, i18n.language, selectedMediaModels, t2],
  );
  reactExports.useEffect(
    () => () => {
      showcaseSelectionSeqRef.current += 1;
      showcaseAttachmentAbortRef.current?.abort();
      showcaseAttachmentAbortRef.current = null;
    },
    [],
  );
  const handleFeaturedSkillSelect = reactExports.useCallback((skill, prompt) => {
    if (composerSendPreparingRef.current) return;
    inputRef.current?.selectSkillDirect(
      {
        ...skill,
        enabled: true,
        source: "installed",
      },
      prompt,
    );
  }, []);
  const handleQuestionSend = reactExports.useCallback(
    (msg) => {
      if (msg.type === "question_reply" || msg.type === "question_reject") {
        const sid = focusedSessionId;
        return sendWsMessage(
          sid
            ? {
                ...msg,
                session_id: sid,
              }
            : msg,
        );
      }
      return sendWsMessage(msg);
    },
    [focusedSessionId, sendWsMessage],
  );
  const handleLoopGuardSend = reactExports.useCallback(
    (msg) => {
      if (msg.type === "loop_guard_reply") {
        if (!beginLoopGuardSubmission(msg.id, msg.decision, msg.session_id)) return;
        sendWsMessage(msg);
        return;
      }
      sendWsMessage(msg);
    },
    [beginLoopGuardSubmission, sendWsMessage],
  );
  const handleToolConfirmSend = reactExports.useCallback(
    (msg) => {
      if (msg.type === "tool_confirm_reply") {
        const sid = focusedSessionId;
        const devToolId = msg.id.startsWith("dev-confirm-")
          ? msg.id.replace("dev-confirm-", "dev-tool-")
          : null;
        if (sid && devToolId) {
          sessionStore.updateMessages(
            sid,
            (prev) => {
              const updated = applyToolConfirmReplyOptimisticUpdate(prev, msg);
              return updated.map((m3) => {
                if (m3.type !== "tool" || m3.id !== devToolId) return m3;
                return {
                  ...m3,
                  toolStatus: msg.decision === "reject" ? "error" : "running",
                  toolResult:
                    msg.decision === "reject"
                      ? JSON.stringify({
                          is_error: true,
                          error: "User rejected this tool call",
                        })
                      : void 0,
                };
              });
            },
            {
              affectsUserAttention: true,
            },
          );
        }
        if (devToolId) return true;
        return submitToolConfirm(msg.id, sid, () =>
          sendWsMessage({
            ...msg,
            session_id: sid ?? void 0,
          }),
        );
      }
      return sendWsMessage(msg);
    },
    [focusedSessionId, sessionStore, sendWsMessage, submitToolConfirm],
  );
  const handleApproveAllToolConfirms = reactExports.useCallback(() => {
    if (!canApproveAllToolConfirms(miniBarToolConfirms, toolConfirmApprovalState, toolConfirmEdits))
      return;
    for (const m3 of miniBarToolConfirms) {
      const id2 = m3.requestId;
      if (!id2) continue;
      const edited = toolConfirmEdits[id2];
      const original = m3.toolConfirmData?.args ?? {};
      const hasChanges = !!edited && JSON.stringify(edited) !== JSON.stringify(original);
      handleToolConfirmSend({
        type: "tool_confirm_reply",
        id: id2,
        decision: "confirm",
        ...(hasChanges
          ? {
              modified_args: edited,
            }
          : {}),
      });
    }
  }, [miniBarToolConfirms, toolConfirmApprovalState, toolConfirmEdits, handleToolConfirmSend]);
  const handleJumpToFirstPendingToolConfirm = reactExports.useCallback(() => {
    const first2 = miniBarToolConfirms[0];
    if (!first2) return;
    const node2 = document.querySelector(`[data-message-id="${first2.id}"]`);
    if (node2 && "scrollIntoView" in node2) {
      node2.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [miniBarToolConfirms]);
  const handleAnyMessageSend = reactExports.useCallback(
    (msg) => {
      if (msg.type === "tool_confirm_reply") {
        return handleToolConfirmSend(msg);
      }
      if (msg.type === "question_reply" || msg.type === "question_reject") {
        return handleQuestionSend(msg);
      }
      if (msg.type === "user_reply") {
        const sid = focusedSessionId;
        if (sid) {
          sessionStore.updateMessages(
            sid,
            (messages22) => resolveLegacyInteractionReply(messages22, msg.id),
            {
              affectsUserAttention: true,
            },
          );
        }
        return sendWsMessage(
          sid
            ? {
                ...msg,
                session_id: sid,
              }
            : msg,
        );
      }
      return sendWsMessage(msg);
    },
    [focusedSessionId, handleToolConfirmSend, handleQuestionSend, sendWsMessage, sessionStore],
  );
  const handleProductionPlanMessage = reactExports.useCallback(
    (content2) => {
      if (
        productionPlanMessagePendingRef.current ||
        !loginGuard() ||
        inputLocked ||
        agentRunning ||
        !focusedSessionId
      ) {
        return false;
      }
      productionPlanMessagePendingRef.current = true;
      if (sessionMode !== "auto") {
        sendWsMessage({
          type: "set_mode",
          mode: sessionMode,
          session_id: focusedSessionId,
        });
      }
      const sent = sendMessage(content2);
      if (sent) {
        collapseProductionPlan();
      } else {
        productionPlanMessagePendingRef.current = false;
      }
      return sent;
    },
    [
      agentRunning,
      collapseProductionPlan,
      focusedSessionId,
      inputLocked,
      loginGuard,
      sendMessage,
      sendWsMessage,
      sessionMode,
    ],
  );
  const handleSend = reactExports.useCallback(
    (
      text2,
      filePaths,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      _allowDataDirectoryFallback,
      languageDetectionText,
    ) => {
      if (!loginGuard() || !guardAccountSubmission("chat").allowed) return false;
      const hasAttachments =
        filePaths.length > 0 ||
        Boolean(canvasNodeAttachments?.length) ||
        Boolean(entityRefs?.length) ||
        Boolean(pluginNodeAttachments?.length);
      const shouldSendStageFeedback = shouldRouteMessageToStageRevision({
        hasAttachments,
        waitingStageKey,
        stageStatus: currentProductionStage?.status,
        planId: productionPlan.planId,
        text: text2,
      });
      if (sessionMode !== "auto" || !focusedSessionId) {
        sendWsMessage({
          type: "set_mode",
          mode: sessionMode,
          session_id: focusedSessionId ?? void 0,
        });
      }
      const queueInsertBefore = queuedEditRestoreRef.current ?? void 0;
      queuedEditRestoreRef.current = null;
      const pendingAnnotations = annotations ?? [];
      let documentEditRequest;
      let textEditContext;
      let pluginEditContext;
      let messageText = text2;
      if (textEditMode && textEditSession && pendingAnnotations.length > 0) {
        const requestId = crypto.randomUUID();
        documentEditRequest = {
          requestId,
          editSessionId: textEditSession.editSessionId,
          document: {
            nodeId: textEditSession.nodeId,
          },
          annotations: pendingAnnotations,
          ...(text2.trim()
            ? {
                instruction: text2.trim(),
              }
            : {}),
        };
        messageText =
          text2.trim() ||
          t2("chat.pendingAnnotations.submitMessage", "Apply {{count}} document annotations", {
            count: pendingAnnotations.length,
          });
      } else if (textEditMode && textEditSession) {
        const oversizedLength = textEditSelectionRef?.current?.oversizedLength;
        if (oversizedLength) {
          dedupedToast.warning(
            t2("chat.textEditAgent.selectionTooLong", {
              count: oversizedLength,
              max: TEXT_EDIT_SELECTION_MAX_LENGTH,
            }),
          );
          return false;
        }
        const selectionState = textEditSelectionRef?.current;
        const selectionAnchors = (
          selectionState?.anchors ?? (selectionState?.anchor ? [selectionState.anchor] : [])
        ).filter((anchor) => anchor.exact.trim());
        if (selectionAnchors.length > 0 && text2.trim()) {
          const requestId = crypto.randomUUID();
          const selectionAnnotations = [];
          for (
            let index2 = 0;
            index2 < selectionAnchors.length;
            index2 += DOCUMENT_EDIT_TARGETS_PER_ANNOTATION
          ) {
            const targets = selectionAnchors.slice(
              index2,
              index2 + DOCUMENT_EDIT_TARGETS_PER_ANNOTATION,
            );
            selectionAnnotations.push({
              id: `selection-${requestId}-${selectionAnnotations.length + 1}`,
              seq: selectionAnnotations.length + 1,
              quote: buildSelectionQuote(targets),
              comment: text2.trim(),
              targets,
            });
          }
          documentEditRequest = {
            requestId,
            editSessionId: textEditSession.editSessionId,
            document: {
              nodeId: textEditSession.nodeId,
            },
            annotations: selectionAnnotations,
          };
        } else {
          textEditContext = {
            editSessionId: textEditSession.editSessionId,
            document: {
              nodeId: textEditSession.nodeId,
            },
          };
        }
      } else if (pluginEditMode && pluginEditSession) {
        const editorState = getPluginAgentEditorState(pluginEditSession.nodeId);
        pluginEditContext = {
          editSessionId: pluginEditSession.editSessionId,
          node: {
            nodeId: pluginEditSession.nodeId,
          },
          ...(editorState
            ? {
                editorState,
              }
            : {}),
        };
      }
      const sent = sendMessage(
        messageText,
        filePaths.length > 0 ? filePaths : void 0,
        canvasNodeAttachments && canvasNodeAttachments.length > 0 ? canvasNodeAttachments : void 0,
        entityRefs && entityRefs.length > 0 ? entityRefs : void 0,
        pluginNodeAttachments && pluginNodeAttachments.length > 0 ? pluginNodeAttachments : void 0,
        void 0,
        documentEditRequest,
        textEditContext,
        pluginEditContext,
        queueInsertBefore,
        languageDetectionText,
      );
      if (sent) {
        workspaceEvents.clearQueuedReferences(workspaceId2);
        if (textEditMode && textEditSession && textEditSelectionRef?.current?.anchor) {
          workspaceEvents.fireAnnotationCommand(workspaceId2, textEditSession, {
            type: "clearSelection",
          });
        }
        collapseProductionPlan();
        if (documentEditRequest) {
          submittedAnnotationIdsRef.current = documentEditRequest.annotations.map(
            (annotation) => annotation.id,
          );
          setActiveDocumentEditRequestId(documentEditRequest.requestId);
        }
        setFeedbackSentStageKey((currentKey) =>
          nextFeedbackSentStageKey({
            currentKey,
            waitingStageKey,
            sent,
            sentAsStageFeedback: shouldSendStageFeedback,
          }),
        );
        if (focusedSessionId) {
          inputRef.current?.reset();
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
      return sent;
    },
    [
      annotations,
      currentProductionStage,
      collapseProductionPlan,
      focusedSessionId,
      loginGuard,
      productionPlan.planId,
      sendMessage,
      sendWsMessage,
      sessionMode,
      t2,
      textEditMode,
      textEditSession,
      textEditSelectionRef,
      pluginEditMode,
      pluginEditSession,
      waitingStageKey,
      workspaceId2,
    ],
  );
  const handleAnnotationSend = reactExports.useCallback(() => {
    if (inputLocked || documentEditInFlight) return;
    handleSend("", []);
  }, [documentEditInFlight, handleSend, inputLocked]);
  const pluginDispatchInFlightRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (
      !pluginEditMode ||
      !pluginEditSession ||
      nodeEditChatStatus !== "ready" ||
      pluginDispatchInFlightRef.current
    ) {
      return;
    }
    const message2 = workspaceEvents.takePluginDispatchMessage(pluginEditSession.nodeId);
    if (!message2) return;
    pluginDispatchInFlightRef.current = true;
    handleSend(message2, []);
    pluginDispatchInFlightRef.current = false;
  }, [pluginEditMode, pluginEditSession, nodeEditChatStatus, handleSend]);
  reactExports.useEffect(() => {
    if (
      !activeDocumentEditRequestId ||
      documentEditInFlight ||
      activeSubmissionMatchesAnnotations
    ) {
      return;
    }
    submittedAnnotationIdsRef.current = [];
    setActiveDocumentEditRequestId(null);
  }, [activeDocumentEditRequestId, activeSubmissionMatchesAnnotations, documentEditInFlight]);
  reactExports.useEffect(() => {
    if (
      activeDocumentEditSubmission?.status === "applied" &&
      activeDocumentEditSubmission.editSessionId === textEditSession?.editSessionId &&
      activeDocumentEditSubmission.nodeId === textEditSession.nodeId
    ) {
      for (const annotationId of submittedAnnotationIdsRef.current) {
        onAnnotationDelete?.(annotationId);
      }
      submittedAnnotationIdsRef.current = [];
      setActiveDocumentEditRequestId(null);
    }
  }, [activeDocumentEditSubmission, onAnnotationDelete, textEditSession]);
  reactExports.useEffect(() => {
    submittedAnnotationIdsRef.current = [];
    setActiveDocumentEditRequestId(null);
  }, [textEditSession?.editSessionId]);
  reactExports.useEffect(() => {
    if (!agentRunning) productionPlanMessagePendingRef.current = false;
  }, [agentRunning]);
  reactExports.useEffect(() => {
    const transition2 = productionPlanConfirmTransitionRef.current;
    if (
      !transition2 ||
      (!agentRunning && userMessageHistory.length <= transition2.userMessageCount)
    ) {
      return;
    }
    productionPlanConfirmTransitionRef.current = void 0;
    setFeedbackSentStageKey(transition2.stageKey);
  }, [agentRunning, userMessageHistory.length]);
  const isFinalProductionStage = Boolean(
    currentProductionStage &&
    productionPlan.model?.pending_stages.length === 0 &&
    productionPlan.model.stages.at(-1)?.id === currentProductionStage.id,
  );
  const handleConfirmProductionStage = reactExports.useCallback(async () => {
    if (
      !currentProductionStage ||
      currentProductionStage.status !== "waiting_user" ||
      !productionPlan.planId ||
      productionPlan.revision === void 0 ||
      !productionPlan.editable
    ) {
      return;
    }
    const capturedIdentity = productionPlanConfirmationIdentityRef.current;
    const savedRevision = await stagePromptEditorRef.current?.flush();
    if (savedRevision === false) return;
    const confirmedIdentity = productionPlanConfirmationIdentityRef.current;
    if (
      !canCompleteProductionPlanConfirmation({
        captured: capturedIdentity,
        current: confirmedIdentity,
        savedRevision,
      }) ||
      !confirmedIdentity.planId ||
      confirmedIdentity.revision === void 0 ||
      !productionPlan.isRevisionCurrent(confirmedIdentity.planId, confirmedIdentity.revision)
    ) {
      return;
    }
    const confirmedStageKey =
      confirmedIdentity.planId && confirmedIdentity.stageId && confirmedIdentity.revision !== void 0
        ? `${confirmedIdentity.planId}:${confirmedIdentity.stageId}:${confirmedIdentity.revision}`
        : void 0;
    if (confirmedStageKey) {
      productionPlanConfirmTransitionRef.current = {
        stageKey: confirmedStageKey,
        userMessageCount: userMessageHistory.length,
      };
    }
    const stageName = getStageDisplayName(currentProductionStage);
    const confirmationCopy = getStageConfirmationCopy(
      currentProductionStage,
      isFinalProductionStage,
    );
    const content2 = t2(confirmationCopy.messageKey, confirmationCopy.messageFallback, {
      stage: stageName,
    });
    const sent = handleProductionPlanMessage(content2);
    if (!sent && confirmedStageKey) {
      productionPlanConfirmTransitionRef.current = void 0;
    }
  }, [
    currentProductionStage,
    handleProductionPlanMessage,
    isFinalProductionStage,
    productionPlan.editable,
    productionPlan.isRevisionCurrent,
    productionPlan.planId,
    productionPlan.revision,
    t2,
    userMessageHistory.length,
  ]);
  const productionPlanConfirmTransition = productionPlanConfirmTransitionRef.current;
  const productionPlanConfirmMessageArrived = Boolean(
    productionPlanConfirmTransition &&
    productionPlanConfirmTransition.stageKey === waitingStageKey &&
    userMessageHistory.length > productionPlanConfirmTransition.userMessageCount,
  );
  const showCurrentProductionGate = Boolean(
    !agentRunning &&
    currentProductionStage &&
    waitingStageKey &&
    feedbackSentStageKey !== waitingStageKey &&
    !productionPlanConfirmMessageArrived,
  );
  const latestUserMessageId = userMessageHistory.at(-1)?.id;
  const productionPlanTurnTails = reactExports.useMemo(() => {
    if (!productionPlan.model) return [];
    const promptReviews = productionPlan.model.stages.flatMap((stage) => {
      const hasPromptContent = Boolean(
        stage.work_items.some((item) => Boolean(item.prompt?.trim())) &&
        stage.review?.before_execution?.some((check) => check.trim().length > 0),
      );
      const isActivePromptReview = Boolean(
        showCurrentProductionGate &&
        stage.id === currentProductionStage?.id &&
        stage.waiting_reason === "plan_review",
      );
      const hasFinishedPromptReview = hasConfirmedPromptReview(stage);
      if (!hasPromptContent || (!isActivePromptReview && !hasFinishedPromptReview)) return [];
      const anchorMessageId =
        findStageReviewAnchorMessageId(messages2, productionPlan.planId ?? "", stage.id) ??
        (isActivePromptReview ? latestUserMessageId : void 0);
      if (!anchorMessageId) return [];
      return [
        {
          id: `production-plan-stage-${productionPlan.planId}-${stage.id}`,
          anchorMessageId,
          content: (
            <div
              className="flex flex-col gap-2"
              data-action-ui-id={`production-plan.conversation-card-${stage.id}`}
            >
              <StagePromptEditorCard
                ref={isActivePromptReview ? stagePromptEditorRef : void 0}
                stage={stage}
                readOnly={!isActivePromptReview}
                disabled={inputLocked || agentRunning || !productionPlan.editable}
                saveStageWorkItems={productionPlan.saveStageWorkItems}
              />
            </div>
          ),
        },
      ];
    });
    return takeLatestPromptReviews(promptReviews);
  }, [
    agentRunning,
    currentProductionStage,
    inputLocked,
    latestUserMessageId,
    messages2,
    productionPlan.model,
    productionPlan.editable,
    productionPlan.saveStageWorkItems,
    productionPlan.planId,
    showCurrentProductionGate,
  ]);
  const productionPlanConversationTail = reactExports.useMemo(() => {
    if (!showCurrentProductionGate || !currentProductionStage) return null;
    return (
      <StageConfirmationBar
        stage={currentProductionStage}
        finalStage={isFinalProductionStage}
        disabled={inputLocked || agentRunning || !focusedSessionId || !productionPlan.editable}
        onConfirm={handleConfirmProductionStage}
      />
    );
  }, [
    agentRunning,
    currentProductionStage,
    focusedSessionId,
    handleConfirmProductionStage,
    inputLocked,
    isFinalProductionStage,
    productionPlan.editable,
    showCurrentProductionGate,
  ]);
  const handleInputChange = reactExports.useCallback(
    (text2, editorDoc) => {
      trackInputChange(text2, editorDoc);
      workspaceEvents.syncQueuedReferencesWithInput(workspaceId2, text2);
    },
    [trackInputChange, workspaceId2],
  );
  const handleEditQueuedUserMessage = reactExports.useCallback(
    async (message2) => {
      const editSessionId = focusedSessionId;
      if (!editSessionId || pendingQueuedEditClientMessageIdRef.current) return;
      pendingQueuedEditClientMessageIdRef.current = message2.clientMessageId;
      const successors = queuedMessageSuccessorIds(queuedUserMessages, message2.clientMessageId);
      try {
        const cancelled = await cancelQueuedUserMessage(message2);
        if (!cancelled || sessionStore.getState().focusedSessionId !== editSessionId) return;
        queuedEditRestoreRef.current = successors;
        restoreQueuedMessageToComposer(
          inputRef.current,
          message2,
          setPendingInput,
          trackInputChange,
        );
      } finally {
        if (pendingQueuedEditClientMessageIdRef.current === message2.clientMessageId) {
          pendingQueuedEditClientMessageIdRef.current = null;
        }
      }
    },
    [
      cancelQueuedUserMessage,
      focusedSessionId,
      queuedUserMessages,
      sessionStore,
      setPendingInput,
      trackInputChange,
    ],
  );
  const handleExploreSkills = reactExports.useCallback(() => {
    navigate({
      to: "/skills",
    });
  }, [navigate]);
  const handleCreateSkill = reactExports.useCallback(() => {
    inputRef.current?.selectSkillByName("skill-creator");
  }, []);
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onAddToChat(({ relativePath, filename, nodeId }) => {
      if (!isActiveRef.current) return;
      inputRef.current?.addFromAssetPath(relativePath, filename, nodeId);
    });
    return () => d2.dispose();
  }, []);
  useBrowserChatMedia(inputRef, isActiveRef, workspaceId2, focusedSessionId);
  useBrowserImageEdit({
    isActiveRef,
    sessionId: focusedSessionId,
    locked: Boolean(inputLocked || composerSendPreparing || textEditMode || pluginEditMode),
    canSend: () =>
      loginGuard() && guardAccountSubmission("chat").allowed && astraSendGate.sendGuard(),
    send: (text2, attachments) =>
      sendMessage(
        text2,
        attachments,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        text2,
        {
          preserveComposer: true,
        },
      ),
  });
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onAddPluginNodeToChat(({ nodeId, pluginId, name: name2 }) => {
      if (!isActiveRef.current) return;
      inputRef.current?.addFromPluginNode(nodeId, pluginId, name2);
    });
    return () => d2.dispose();
  }, []);
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onAssetRenamed(({ oldPath, newPath, newFilename }) => {
      inputRef.current?.renameAttachment(oldPath, newPath, newFilename);
    });
    return () => d2.dispose();
  }, []);
  reactExports.useEffect(
    () =>
      workspaceEvents.subscribeChatReferences({
        workspaceId: workspaceId2,
        isActive: () => isActiveRef.current,
        selectSkill: (skill) => inputRef.current?.selectSkillDirect(skill),
        selectConnector: (connector, prompt) =>
          inputRef.current?.selectConnectorDirect(connector, prompt),
        persistDraft: (input) => {
          trackInputChange(input);
          setPendingInput(input);
        },
      }),
    [setPendingInput, trackInputChange, workspaceId2],
  );
  reactExports.useEffect(() => {
    if (!connected || sessionsLoading || switching) return;
    workspaceEvents.fireChatInputReady(workspaceId2);
  }, [connected, sessionsLoading, switching, workspaceId2]);
  reactExports.useEffect(() => {
    const d2 = workspaceEvents.onAddEntityToChat(({ entityId, name: name2, type: type2 }) => {
      if (!isActiveRef.current) return;
      inputRef.current?.addFromEntity(entityId, name2, type2);
    });
    return () => d2.dispose();
  }, []);
  const [dragOver, setDragOver] = reactExports.useState(false);
  const [fileDragOver, setFileDragOver] = reactExports.useState(false);
  const fileDragDepthRef = reactExports.useRef(0);
  const clearFileDragState = reactExports.useCallback(() => {
    fileDragDepthRef.current = 0;
    setFileDragOver(false);
  }, []);
  const handleChatPanelDragEnter = reactExports.useCallback((e2) => {
    if (!hasFileDropPayload(e2.dataTransfer)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "copy";
    fileDragDepthRef.current += 1;
    setFileDragOver(true);
  }, []);
  const handleChatPanelDragOver = reactExports.useCallback((e2) => {
    if (hasFileDropPayload(e2.dataTransfer)) {
      e2.preventDefault();
      e2.dataTransfer.dropEffect = "copy";
      if (fileDragDepthRef.current === 0) fileDragDepthRef.current = 1;
      setFileDragOver(true);
      return;
    }
    const types2 = e2.dataTransfer.types;
    if (!types2.includes(SKILL_DRAG_MIME) && !types2.includes(ENTITY_DRAG_MIME)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }, []);
  const handleChatPanelDragLeave = reactExports.useCallback((e2) => {
    if (fileDragDepthRef.current > 0) {
      e2.preventDefault();
      fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
      if (fileDragDepthRef.current === 0) setFileDragOver(false);
      return;
    }
    if (e2.currentTarget.contains(e2.relatedTarget)) return;
    setDragOver(false);
  }, []);
  const handleChatPanelDrop = reactExports.useCallback(
    (e2) => {
      setDragOver(false);
      if (hasFileDropPayload(e2.dataTransfer)) {
        e2.preventDefault();
        e2.stopPropagation();
        clearFileDragState();
        const handleFileDrop =
          questionFileDropHandlerRef.current ?? inputRef.current?.handleFileDrop;
        handleFileDrop?.(e2);
        return;
      }
      clearFileDragState();
      const entity = readEntityDragData(e2);
      if (entity) {
        e2.preventDefault();
        if (!isActiveRef.current) return;
        inputRef.current?.addFromEntity(entity.entityId, entity.name, entity.type);
        if (currentWorkspacePath) {
          void materializeEntityMutation
            .mutateAsync({
              entityId: entity.entityId,
              input: {
                workspacePath: currentWorkspacePath,
              },
            })
            .catch((err) => {
              console.error("[chat] Materialize on entity drop failed:", err);
            });
        }
        return;
      }
      const raw2 = e2.dataTransfer.getData(SKILL_DRAG_MIME);
      if (!raw2) return;
      e2.preventDefault();
      try {
        const data2 = JSON.parse(raw2);
        inputRef.current?.selectSkillDirect(data2.skill);
      } catch {}
    },
    [clearFileDragState, currentWorkspacePath, materializeEntityMutation],
  );
  const showPromoBanner = textEditConversationReady && queuedUserMessages.length === 0;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: skill / entity drag-and-drop target
    <div
      className={`relative z-2 flex flex-col h-full transition-colors ${dragOver ? "ring-2 ring-inset ring-primary/40 bg-primary/5" : ""} ${fileDragOver ? "file-drop-active" : ""}`}
      data-file-drop-scope="chat-panel"
      data-chat-loading-motion={nodeEditMode ? "sweep" : "breathe"}
      onDragEnter={handleChatPanelDragEnter}
      onDragOver={handleChatPanelDragOver}
      onDragLeave={handleChatPanelDragLeave}
      onDragEnd={clearFileDragState}
      onDrop={handleChatPanelDrop}
    >
      {fileDragOver && <FileDropFeedback label={t2("chat.dropFilesHere")} />}
      {LoginDialog}
      <ChatHeaderContainer
        rightActions={headerActions}
        isPresented={isPresented}
        variant={pluginEditMode ? "plugin-edit" : textEditMode ? "text-edit" : "default"}
        nodeEditAgentName={pluginEditAgentName}
      />
      {textEditConversationReady && (
        <ProductionPlanTimeline
          key={productionPlan.planId ?? "production-plan"}
          model={productionPlan.model}
          loading={productionPlan.loading}
          error={productionPlan.error}
          onRetry={productionPlan.retry}
          expanded={
            Boolean(productionPlan.planId && productionPlanKey) && (productionPlanExpanded ?? true)
          }
          onExpandedChange={handleProductionPlanExpandedChange}
        />
      )}
      <ToolConfirmEditsContext.Provider value={toolConfirmEditsContextValue}>
        <RecoveringChildrenProvider value={recoveringChildSessionIds}>
          <ProductionPlanDisclosureContext.Provider value={productionPlanDisclosureValue}>
            {textEditConversationReady ? (
              showConversationLoading ? (
                <ChatHistoryLoadingState
                  label={t2("chat.starting.placeholder", "Agent is getting ready...")}
                />
              ) : (
                hasActiveSession && (
                  <MessageListContainer
                    messages={visibleMessages}
                    busy={busy}
                    busyLabel={mediaReviewing ? t2("chat.mediaReviewing") : void 0}
                    focusMessageId={inlineEditorFocusMessageId}
                    isPresented={isPresented}
                    recovering={isRecovering}
                    focusedSessionId={focusedSessionId}
                    onSend={handleAnyMessageSend}
                    onRetry={handleRetry}
                    onFork={forkSession}
                    conversationTail={productionPlanConversationTail}
                    turnTails={productionPlanTurnTails}
                    showTurnArtifacts={false}
                  />
                )
              )
            ) : (
              <div
                className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
                data-action-ui-id="chat.text-edit-agent-resolving"
              >
                {!textEditConversationFailed && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                <span>
                  {textEditConversationFailed
                    ? nodeEditAgentLabels.prepareFailed
                    : nodeEditAgentLabels.preparing}
                </span>
              </div>
            )}
          </ProductionPlanDisclosureContext.Provider>
        </RecoveringChildrenProvider>
      </ToolConfirmEditsContext.Provider>
      {textEditConversationReady && !showConversationLoading && !hasActiveSession && (
        <div className="flex min-h-0 flex-1 items-start overflow-y-auto">
          <ChatEmptyState
            onSelectShowcase={handleShowcaseSelect}
            onSelectSkill={handleFeaturedSkillSelect}
            skillMode={nodeEditSkillMode}
          />
        </div>
      )}
      {textEditConversationReady && pendingSkills && (
        <SkillReloadDock
          skillNames={pendingSkills}
          onReload={reloadSkills}
          onDismiss={dismissSkillReload}
        />
      )}
      {textEditConversationReady && pendingLoopGuard && (
        <LoopGuardAskDock
          message={pendingLoopGuard}
          onSend={handleLoopGuardSend}
          isPresented={isPresented}
          shortcutsEnabled={!pendingQuestion}
          submitting={isLoopGuardSubmitting(pendingLoopGuard.requestId)}
        />
      )}
      {textEditConversationReady && mockToolConfirm && (
        <DevToolConfirmTrigger sessionStore={sessionStore} focusedSessionId={focusedSessionId} />
      )}
      <ToolConfirmMiniBar
        pendingCount={textEditConversationReady ? miniBarToolConfirms.length : 0}
        approvalState={aggregateApprovalState}
        submitting={miniBarToolConfirms.some(
          (message2) =>
            message2.requestId !== void 0 && submittingToolConfirmIds.has(message2.requestId),
        )}
        onJump={handleJumpToFirstPendingToolConfirm}
        onApproveAll={handleApproveAllToolConfirms}
      />
      <footer
        className={`relative z-10 px-4 pb-2 pt-0 bg-transparent ${textEditConversationReady && pendingQuestion ? "min-h-0 overflow-hidden" : ""}`}
      >
        <div
          className={`mx-auto w-full ${textEditConversationReady && pendingQuestion ? "flex h-full min-h-0 flex-col" : ""}`}
          style={{
            maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
          }}
        >
          <ChatStartupNotice
            starting={starting}
            connecting={connecting}
            reconnecting={reconnecting}
            showPreparing={!showConversationLoading}
          />
          {textEditConversationReady && historyLoadFailed && !switching && (
            <div
              className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              data-action-ui-id="chat.history-load-failed-notice"
            >
              <div className="font-medium text-foreground">
                {t2("chat.historyLoadFailed.title", "Chat history is temporarily unavailable")}
              </div>
              <div>
                {t2(
                  "chat.historyLoadFailed.description",
                  "The current view was preserved, but the complete history could not be verified. Retry to reload it.",
                )}
              </div>
              <Button$1
                variant="outline"
                size="sm"
                className="mt-1.5 h-6 px-2 text-xs"
                disabled={historyReloading}
                aria-busy={historyReloading}
                onClick={reloadSessionHistory}
              >
                {historyReloading ? t2("common.loading", "Loading...") : t2("chat.retry", "Retry")}
              </Button$1>
            </div>
          )}
          {providersUnavailable && (
            <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {t2("chat.providersUnavailable.title", "AI service temporarily unavailable")}
              </div>
              <div>
                {t2(
                  "chat.providersUnavailable.description",
                  "Model providers could not be loaded. Canvas and assets still work; chat resumes automatically once the connection recovers.",
                )}
              </div>
              <Button$1
                variant="outline"
                size="sm"
                className="mt-1.5 h-6 px-2 text-xs"
                disabled={retryingProviders}
                onClick={handleRetryProviders}
              >
                {retryingProviders
                  ? t2("chat.providersUnavailable.retrying", "Retrying...")
                  : t2("chat.retry", "Retry")}
              </Button$1>
            </div>
          )}
          {sessionListStalled && !runtimeUnavailable && !connectionUnavailable && (
            <SessionListUnavailableNotice onRetry={retrySessionList} />
          )}
          {textEditConversationReady && showStalledBanner && (
            <StalledTurnBanner
              minutes={stalledMinutes}
              watchdog={stalledInfo?.watchdog}
              onKeepWaiting={dismissStalledNotice}
              onStop={stopStalledSession}
            />
          )}
          {reconnecting && !preparing && (
            <ChatReconnectNotice
              title={reconnectBanner.title}
              description={reconnectBanner.description}
              animated={!nodeEditMode && !reconnectingStuck && !reclaimedByMemory}
              stuck={reconnectingStuck}
            />
          )}
          {runtimeUnavailable && !connectionUnavailable && (
            <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {t2("chat.runtimeUnavailable.title", "Local runtime is recovering")}
              </div>
              <div>
                {t2(
                  "chat.runtimeUnavailable.description",
                  "Workspace, canvas, and assets stay visible. Chat resumes after the local runtime reconnects.",
                )}
              </div>
            </div>
          )}
          {textEditMode && annotations && annotations.length > 0 && (
            <PendingAnnotationList
              annotations={annotations}
              activeId={activeAnnotationId ?? null}
              onLocate={onAnnotationLocate ?? (() => {})}
              onDelete={onAnnotationDelete ?? (() => {})}
              onClear={onAnnotationClear ?? (() => {})}
              onSend={handleAnnotationSend}
              submission={activeDocumentEditSubmission}
              sendDisabled={inputLocked || documentEditInFlight}
            />
          )}
          {textEditConversationReady && <DocumentEditReviewBar />}
          <QuestionComposerGate
            blocked={textEditConversationReady && Boolean(pendingQuestion)}
            dock={
              textEditConversationReady && pendingQuestion ? (
                <QuestionDock
                  key={`${focusedSessionId ?? "unbound"}:${pendingQuestion.requestId ?? pendingQuestion.id}`}
                  question={pendingQuestion}
                  submissionFailureId={pendingQuestionFailureId}
                  onSend={handleQuestionSend}
                  isPresented={isPresented}
                  onFileDropHandlerChange={handleQuestionFileDropHandlerChange}
                />
              ) : null
            }
          >
            <QueuedUserMessageList
              messages={textEditConversationReady ? queuedUserMessages : []}
              scrollRequest={queuedUserMessageScrollRequest}
              onEdit={handleEditQueuedUserMessage}
              onDelete={cancelQueuedUserMessage}
              onSendNow={sendQueuedUserMessageNow}
              onReorder={reorderQueuedUserMessage}
            />
            {showPromoBanner && <PromoBanner key={focusedSessionId ?? "new"} />}
            <MessageInput
              ref={inputRef}
              fileDropScope="parent"
              onSend={handleSend}
              onSendPreparingChange={handleComposerSendPreparingChange}
              clearOnSend={false}
              onCancel={handleCancel}
              busy={inputLocked}
              allowEmptySend={Boolean(
                textEditMode && annotations && annotations.length > 0 && !documentEditInFlight,
              )}
              running={textEditConversationReady && agentRunning}
              placeholderBusy={inputPlaceholderBusy}
              placeholder={inputPlaceholder}
              placeholderNode={
                textEditMode || isSpecialNodeSession ? void 0 : WorkspaceCreationGuidePlaceholder
              }
              showBusyPlaceholder={
                (textEditConversationReady && agentRunning) ||
                showcaseAttachmentsLoading ||
                connectionUnavailable ||
                preparing ||
                providersUnavailable ||
                runtimeUnavailable
              }
              guard={loginGuard}
              sendGuard={astraSendGate.sendGuard}
              sendLabel={astraSendGate.sendLabel}
              sendTooltip={astraSendGate.sendTooltip}
              messageHistory={userMessageHistory}
              messageHistoryResetKey={focusedSessionId ?? "new"}
              toolbar={renderToolbar}
              pendingInput={pendingInput}
              pendingEditorDoc={pendingEditorDoc}
              onPendingInputConsumed={handlePendingInputConsumed}
              rightSlot={modeSelectorSlot}
              onExploreSkills={handleExploreSkills}
              onCreateSkill={handleCreateSkill}
              skillPopoverMode={nodeEditSkillMode ?? "default"}
              selectedMediaModels={selectedMediaModels}
              onSelectedMediaModelsChange={handleSelectedMediaModelsChange}
              onInputChange={handleInputChange}
              pendingAttachments={pendingAttachments}
              onPendingAttachmentsConsumed={handlePendingAttachmentsConsumed}
              onAttachmentsChange={trackAttachmentsChange}
              className="message-input-surface @container/composer min-h-[var(--workspace-chat-composer-default-height)] p-[var(--message-input-card-padding)] border border-border-solid rounded-[var(--message-input-surface-radius)] bg-[var(--elevated-surface)] relative z-10"
            />
          </QuestionComposerGate>
          <ChatComplianceNotice />
        </div>
      </footer>
    </div>
  );
}
