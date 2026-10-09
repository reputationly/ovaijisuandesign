// pending-annotation-list.jsx
import {
  useTranslation,
  useCurrentWorkspace,
  reactExports,
  Check,
  Icon,
  ArrowRight,
  CompositedSvg,
  ChevronDown,
  X$7,
  workspaceEvents,
  Loader2,
  Clock3,
  CircleAlert,
  Crosshair,
  ClipboardList,
  Circle,
  Flag,
} from "../vendor.js";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { RetryIcon } from "../m08/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { shouldIgnoreChatGlobalShortcut } from "./message-list-impl.jsx";
export function SkillReloadDock({ skillNames, onReload, onDismiss }) {
  const { t: t2 } = useTranslation();
  const hasNames = skillNames && skillNames.length > 0;
  const title = hasNames
    ? t2("skills.reloadDock.titleWithCount", {
        count: skillNames.length,
        defaultValue: "{{count}} 个新 Skill 已就绪",
      })
    : t2("skills.reloadDock.title", {
        defaultValue: "Skill 已更新",
      });
  return (
    <div
      data-action-ui-id="chat-skill-reload-dock"
      className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-2.5"
    >
      <div className="flex items-start gap-3">
        <RetryIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium shrink-0">{title}</span>
            {hasNames && (
              <span className="text-xs text-muted-foreground truncate">
                {skillNames.join(", ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t2("skills.reloadDock.warning", {
              defaultValue: "重新加载将重启 Agent，当前对话会中断",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button$1
            data-action-ui-id="chat-skill-reload-confirm"
            variant="secondary"
            size="sm"
            className="h-7 rounded-md text-xs"
            onClick={onReload}
          >
            {t2("skills.reloadDock.reload", {
              defaultValue: "重新加载",
            })}
          </Button$1>
          <Button$1
            variant="ghost"
            size="icon"
            data-action-ui-id="chat-skill-reload-dismiss"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X$7 size={14} strokeWidth={1.5} />
          </Button$1>
        </div>
      </div>
    </div>
  );
}
function ApprovalIcon({ className }) {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.66667 7.33333V10C4.66667 10.3536 4.80714 10.6928 5.05719 10.9428C5.30724 11.1929 5.64638 11.3333 6 11.3333H8.66667M3.33333 2H6C6.73638 2 7.33333 2.59695 7.33333 3.33333V6C7.33333 6.73638 6.73638 7.33333 6 7.33333H3.33333C2.59695 7.33333 2 6.73638 2 6V3.33333C2 2.59695 2.59695 2 3.33333 2ZM10 8.66667H12.6667C13.403 8.66667 14 9.26362 14 10V12.6667C14 13.403 13.403 14 12.6667 14H10C9.26362 14 8.66667 13.403 8.66667 12.6667V10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function ToolConfirmMiniBar({
  pendingCount,
  approvalState = "ready",
  submitting = false,
  onJump,
  onApproveAll,
}) {
  const { t: t2 } = useTranslation();
  if (pendingCount <= 0) return null;
  return (
    <div
      data-action-ui-id="chat-tool-confirm-mini-bar"
      className="relative z-0 mx-2 [border-left-width:var(--control-border-width)] [border-right-width:var(--control-border-width)] [border-top-width:var(--control-border-width)] border-border-solid rounded-t-lg px-3 flex items-start pt-2 pb-5 -mb-3"
    >
      <div className="flex items-center h-7 w-full">
        <div className="flex items-center gap-1.5">
          <ApprovalIcon className="shrink-0 text-brand-accent" />
          <span className="text-body-12 text-foreground">
            {approvalState === "checking"
              ? t2("chat.toolConfirm.miniBar.checking", "Checking workflow")
              : approvalState === "blocked"
                ? t2("chat.toolConfirm.miniBar.blocked", "Complete required inputs")
                : t2("chat.toolConfirm.miniBar.needsApproval", "Needs approval to run")}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            data-action-ui-id="chat-tool-confirm-mini-bar-jump"
            className="inline-flex items-center h-7 px-2.5 text-body-12 font-medium rounded-md bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
            onClick={onJump}
          >
            {t2("chat.toolConfirm.miniBar.jumpToTop", "Jump")}
          </button>
          {approvalState === "ready" && (
            <button
              type="button"
              data-action-ui-id="chat-tool-confirm-mini-bar-approve-all"
              disabled={submitting}
              className="inline-flex items-center gap-0.5 h-7 px-2.5 text-body-12 font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onApproveAll}
            >
              {t2("chat.toolConfirm.miniBar.generate", "Generate")}
              <span>X</span>
              <span>{pendingCount}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
const DIRECTOR_STAGE_PLACEHOLDER = {
  key: "chat.directorStageAgent.inputPlaceholder",
  fallback: "想生成或修改人物站位或运镜？告诉我你的需求",
};
const CLIP_EDITOR_PLACEHOLDER = {
  key: "chat.clipEditAgent.inputPlaceholder",
  fallback: "想用 AI 做简单剪辑或生成字幕？告诉我视频和处理需求",
};
export function nodeAgentInputPlaceholder(mode2) {
  return mode2 === "director-stage" ? DIRECTOR_STAGE_PLACEHOLDER : CLIP_EDITOR_PLACEHOLDER;
}
const MAX_VISIBLE_CARDS = 4;
export function PendingAnnotationList({
  annotations,
  activeId,
  onLocate,
  onDelete,
  onClear,
  onSend,
  submission,
  sendDisabled = false,
}) {
  const { t: t2 } = useTranslation();
  const listRef = reactExports.useRef(null);
  const submissionInFlight =
    submission?.status === "submitting" ||
    submission?.status === "accepted" ||
    submission?.status === "running";
  const submissionStatus = submissionInFlight
    ? t2("chat.pendingAnnotations.submitting", "Submitting to Agent…")
    : submission?.status === "conflict"
      ? t2("chat.pendingAnnotations.conflict", "Document changed. Review and retry.")
      : submission?.status === "failed"
        ? t2("chat.pendingAnnotations.failed", "Agent did not apply these edits. Retry available.")
        : null;
  const [maxHeight, setMaxHeight] = reactExports.useState(void 0);
  reactExports.useLayoutEffect(() => {
    const list2 = listRef.current;
    if (!list2 || annotations.length <= MAX_VISIBLE_CARDS) {
      setMaxHeight(void 0);
      return;
    }
    const cards = list2.children;
    const lastVisible = cards[MAX_VISIBLE_CARDS - 1];
    if (!lastVisible) return;
    setMaxHeight(lastVisible.offsetTop - list2.offsetTop + lastVisible.offsetHeight);
  }, [annotations]);
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (e2.key !== "Enter" || e2.isComposing || e2.keyCode === 229) return;
    if (e2.shiftKey || e2.metaKey || e2.ctrlKey || e2.altKey) return;
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if (annotations.length === 0 || sendDisabled || submissionInFlight) return;
    e2.preventDefault();
    onSend();
  };
  reactExports.useEffect(() => {
    const handler = (e2) => keydownRef.current(e2);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  if (annotations.length === 0 || submissionInFlight) return null;
  return (
    <div className="mb-2 rounded-lg border border-border bg-muted/30 p-2">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span>{t2("chat.pendingAnnotations.title", "待提交批注")}</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] text-primary">
            {annotations.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            disabled={submissionInFlight}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            data-action-ui-id="chat.pending-annotations-clear"
          >
            {t2("chat.pendingAnnotations.clear", "清空")}
          </button>
          <Button$1
            type="button"
            size="xs"
            onClick={onSend}
            disabled={sendDisabled || submissionInFlight}
            data-action-ui-id="chat.pending-annotations-send"
          >
            {submission?.status === "conflict" || submission?.status === "failed"
              ? t2("common.retry", "Retry")
              : t2("chat.send", "发送")}
          </Button$1>
        </div>
      </div>
      {submissionStatus && (
        <div
          className={`mb-1.5 px-1 text-[11px] ${submission?.status === "conflict" || submission?.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
        >
          {submissionStatus}
        </div>
      )}
      <div
        ref={listRef}
        className="flex flex-col gap-1.5 overflow-y-auto"
        style={
          maxHeight !== void 0
            ? {
                maxHeight,
              }
            : void 0
        }
      >
        {annotations.map((a2) => {
          const active2 = a2.id === activeId;
          return (
            // biome-ignore lint/a11y/useSemanticElements: the card wraps a nested delete <button>, so it can't itself be a <button>
            <div
              key={a2.id}
              role="button"
              tabIndex={0}
              onClick={() => onLocate(a2.id)}
              onKeyDown={(e2) => {
                if (e2.key === "Enter" || e2.key === " ") {
                  e2.preventDefault();
                  onLocate(a2.id);
                }
              }}
              className={`group relative cursor-pointer rounded-md border px-2 py-1.5 transition-colors ${active2 ? "border-primary bg-primary/5" : "border-transparent bg-card hover:bg-muted/60"}`}
              data-annotation-card={a2.id}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                  {a2.seq}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-muted-foreground">{a2.quote}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-foreground">{a2.comment}</div>
                </div>
                <button
                  type="button"
                  onClick={(e2) => {
                    e2.stopPropagation();
                    if (!submissionInFlight) onDelete(a2.id);
                  }}
                  disabled={submissionInFlight}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                  title={t2("common.delete", "删除")}
                  aria-label={t2("common.delete", "删除")}
                >
                  <X$7 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function findPendingQuestionState(messages2) {
  let pendingQuestion = null;
  for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
    const message2 = messages2[index2];
    if (message2.type === "question" && !message2.resolved) {
      pendingQuestion = message2;
      break;
    }
  }
  if (!pendingQuestion?.requestId)
    return {
      pendingQuestion,
    };
  for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
    const message2 = messages2[index2];
    if (message2.type === "error" && message2.requestId === pendingQuestion.requestId) {
      return {
        pendingQuestion,
        pendingQuestionFailureId: message2.id,
      };
    }
  }
  return {
    pendingQuestion,
  };
}
export function shouldRouteMessageToStageRevision(input) {
  return (
    !input.hasAttachments &&
    Boolean(input.waitingStageKey) &&
    input.stageStatus === "waiting_user" &&
    Boolean(input.planId) &&
    input.text.trim().length > 0
  );
}
export function nextFeedbackSentStageKey(input) {
  if (!input.sent || !input.sentAsStageFeedback || !input.waitingStageKey) {
    return input.currentKey;
  }
  return input.waitingStageKey;
}
export function canCompleteProductionPlanConfirmation(input) {
  const expectedRevision = input.savedRevision ?? input.captured.revision;
  return (
    input.current.editable &&
    input.captured.sessionId === input.current.sessionId &&
    input.captured.planId === input.current.planId &&
    input.captured.stageId === input.current.stageId &&
    input.captured.generation === input.current.generation &&
    expectedRevision !== void 0 &&
    input.current.revision === expectedRevision
  );
}
export function getStageDisplayName(stage) {
  return stage.name;
}
function getStageActionLabel(stage) {
  return stage.name;
}
function getPendingStageActionLabel(stage) {
  return stage.name;
}
export function getCurrentProductionStage(model) {
  return model?.next_stage;
}
export function getStageConfirmationCopy(stage, finalStage) {
  if (stage.waiting_reason === "plan_review") {
    return {
      actionKey: "productionPlan.actions.confirmPlan",
      actionFallback: "继续",
      messageKey: "productionPlan.messages.confirmPlan",
      messageFallback: "确认“{{stage}}”的执行计划，请开始执行。",
    };
  }
  if (finalStage) {
    return {
      actionKey: "productionPlan.actions.finish",
      actionFallback: "完成制作",
      messageKey: "productionPlan.messages.finish",
      messageFallback: "确认“{{stage}}”的最终产物，请完成制作。",
    };
  }
  return {
    actionKey: "productionPlan.actions.confirmResult",
    actionFallback: "继续",
    messageKey: "productionPlan.messages.confirmResult",
    messageFallback: "确认“{{stage}}”的产物，请继续下一阶段。",
  };
}
function getProductionPlanProgress(model) {
  const visibleStages = [...model.stages, ...model.pending_stages].sort(
    (left, right) => left.order - right.order,
  );
  const total = visibleStages.length;
  if (total === 0) return "0/0";
  const currentStage =
    getCurrentProductionStage(model) ?? model.pending_stages[0] ?? model.stages.at(-1);
  const currentIndex = visibleStages.findIndex((stage) => stage.id === currentStage?.id);
  return `${currentIndex >= 0 ? currentIndex + 1 : 1}/${total}`;
}
function runtimeNodeId(item) {
  return item.group_node_id || item.group_id || item.node_id;
}
function getStageRuntimeNodeIds(stage) {
  return [...new Set(stage.runtime_refs.map(runtimeNodeId).filter((id2) => !!id2))];
}
function getStageOutputPaths(stage) {
  return [
    ...new Set(
      stage.runtime_refs
        .flatMap((item) => [item.path, item.file_path, item.output_path])
        .map((path2) => path2?.trim())
        .filter((path2) => Boolean(path2)),
    ),
  ];
}
function getStageFocusNodeIds(stage) {
  const runtimeNodeIds = getStageRuntimeNodeIds(stage);
  if (runtimeNodeIds.length > 0) return runtimeNodeIds;
  return [
    ...new Set(
      stage.work_items
        .flatMap((item) => [item.group_node_id, item.group_id, item.node_id, item.document_node_id])
        .filter((id2) => !!id2),
    ),
  ];
}
function canFocusStageOutputs(stage) {
  return getStageFocusNodeIds(stage).length > 0 || getStageOutputPaths(stage).length > 0;
}
function focusStageOutputs(workspaceId2, stage) {
  const nodeIds = getStageFocusNodeIds(stage);
  const outputPaths = getStageOutputPaths(stage);
  if (nodeIds.length === 0 && outputPaths.length === 0) return false;
  workspaceEvents.fireLocateCanvasTargets(workspaceId2, {
    nodeIds,
    paths: outputPaths,
    preferParentGroup: true,
  });
  return true;
}
export function itemDisplayName(item) {
  return item.display_name || item.name || item.title || item.role || item.id || "";
}
function statusLabel(status, t2) {
  if (status === "waiting_user") return t2("productionPlan.status.review", "待确认");
  if (status === "doing") return t2("productionPlan.status.doing", "进行中");
  if (status === "blocked") return t2("productionPlan.status.blocked", "受阻");
  if (status === "pending") return t2("productionPlan.status.todo", "待规划");
  return t2("productionPlan.status.done", "已完成");
}
function PendingStageRow({ stage, current: current2, displayOrder }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className={`relative flex min-h-7 items-center gap-1.5 rounded-md px-1.5 ${current2 ? "bg-foreground/[0.06]" : ""}`}
      data-current={current2 ? "true" : void 0}
    >
      <span
        className={`z-1 flex size-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] ${current2 ? "border-foreground bg-foreground text-background" : "border-foreground/15 bg-card text-muted-foreground"}`}
      >
        {displayOrder}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className={`truncate text-[13px] ${current2 ? "font-medium" : "text-foreground/50"}`}>
            {getPendingStageActionLabel(stage)}
          </p>
          {current2 && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {statusLabel("pending", t2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
function StageRow({ stage, current: current2, onLocate }) {
  const { t: t2 } = useTranslation();
  const canLocate = canFocusStageOutputs(stage);
  const statusIcon2 =
    stage.status === "done"
      ? Check
      : stage.status === "doing"
        ? Loader2
        : stage.status === "waiting_user"
          ? Clock3
          : CircleAlert;
  return (
    <div
      className={`relative flex min-h-7 items-center gap-1.5 rounded-md px-1.5 ${current2 ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"}`}
      data-current={current2 ? "true" : void 0}
    >
      <span
        className={`z-1 flex size-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] ${current2 ? "border-foreground bg-foreground text-background" : stage.status === "done" ? "border-foreground/25 bg-card text-muted-foreground" : "border-foreground/15 bg-card text-muted-foreground"}`}
      >
        <Icon
          icon={statusIcon2}
          size="xs"
          strokeWidth={1.5}
          className={stage.status === "doing" ? "animate-spin" : void 0}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className={`truncate text-[13px] ${current2 ? "font-medium" : "text-foreground/70"}`}>
            {getStageActionLabel(stage)}
          </p>
          {current2 && (
            <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
              {statusLabel(stage.status, t2)}
            </span>
          )}
        </div>
        {stage.blocked_reason && (
          <p className="truncate text-[11px] text-destructive/70">{stage.blocked_reason}</p>
        )}
      </div>
      {canLocate && (
        <Button$1
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onLocate(stage)}
          aria-label={t2("productionPlan.actions.viewOutput", "查看产物")}
          title={t2("productionPlan.actions.viewOutput", "查看产物")}
          data-action-ui-id={`production-plan.locate-stage-${stage.id}`}
        >
          <Icon icon={Crosshair} size="sm" strokeWidth={1.5} />
        </Button$1>
      )}
    </div>
  );
}
export function ProductionPlanTimeline({
  model,
  loading,
  error,
  onRetry,
  expanded: controlledExpanded,
  onExpandedChange,
}) {
  const { t: t2 } = useTranslation();
  const workspaceId2 = useCurrentWorkspace();
  const [uncontrolledExpanded, setUncontrolledExpanded] = reactExports.useState(false);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const activeStage = getCurrentProductionStage(model);
  const currentPendingStage = activeStage ? void 0 : model?.pending_stages[0];
  const currentStage = activeStage ?? (currentPendingStage ? void 0 : model?.stages.at(-1));
  const currentActionLabel = currentStage
    ? getStageActionLabel(currentStage)
    : currentPendingStage
      ? getPendingStageActionLabel(currentPendingStage)
      : void 0;
  const currentStatus = currentStage?.status ?? (currentPendingStage ? "pending" : void 0);
  const timelineRows = reactExports.useMemo(
    () =>
      [
        ...(model?.stages ?? []).map((stage) => ({
          kind: "authored",
          stage,
        })),
        ...(model?.pending_stages ?? []).map((stage) => ({
          kind: "pending",
          stage,
        })),
      ].sort((left, right) => left.stage.order - right.stage.order),
    [model],
  );
  const displayOrderById = reactExports.useMemo(
    () => new Map(timelineRows.map((row, index2) => [row.stage.id, index2 + 1])),
    [timelineRows],
  );
  if (!model && !loading && !error) return null;
  const handleLocate = (stage) => {
    if (!workspaceId2) return;
    focusStageOutputs(workspaceId2, stage);
  };
  const handleToggle = () => {
    const nextExpanded = !expanded;
    if (controlledExpanded === void 0) setUncontrolledExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };
  return (
    <section
      className="shrink-0 border-b border-border bg-card"
      aria-label={t2("productionPlan.title", "制作计划")}
    >
      <button
        type="button"
        className="flex h-9 w-full items-center gap-1.5 px-3 text-left hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleToggle}
        aria-expanded={expanded}
        data-action-ui-id="production-plan.toggle"
      >
        <Icon icon={ClipboardList} size="sm" strokeWidth={1.5} className="shrink-0" />
        <span className="shrink-0 text-[13px] font-medium text-foreground">
          {t2("productionPlan.title", "制作计划")}
        </span>
        {loading ? (
          <Icon
            icon={Loader2}
            size="xs"
            strokeWidth={1.5}
            className="animate-spin text-muted-foreground"
          />
        ) : model ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {getProductionPlanProgress(model)}
          </span>
        ) : (
          <Icon icon={Circle} size="xs" strokeWidth={1.25} className="text-destructive" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
          {currentActionLabel ?? t2("productionPlan.loadFailed", "暂时无法读取")}
        </span>
        {currentStatus && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {statusLabel(currentStatus, t2)}
          </span>
        )}
        <Icon
          icon={ChevronDown}
          size="sm"
          strokeWidth={1.5}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-1.5 pb-1.5" data-action-ui-id="production-plan.timeline">
          <div
            className="max-h-40 overflow-y-auto"
            data-action-ui-id="production-plan.timeline-window"
          >
            {error ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {t2("productionPlan.loadFailed", "暂时无法读取")}
                </p>
                {onRetry && (
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    data-action-ui-id="production-plan.retry"
                  >
                    {t2("productionPlan.retry", "重试")}
                  </Button$1>
                )}
              </div>
            ) : (
              <div className="relative">
                <span
                  className="absolute bottom-3.5 left-[14px] top-3.5 w-px bg-foreground/10"
                  aria-hidden="true"
                />
                {timelineRows.map((row) =>
                  row.kind === "authored" ? (
                    <StageRow
                      key={row.stage.id}
                      stage={row.stage}
                      current={row.stage.id === currentStage?.id}
                      onLocate={handleLocate}
                    />
                  ) : (
                    <PendingStageRow
                      key={row.stage.id}
                      stage={row.stage}
                      current={row.stage.id === currentPendingStage?.id}
                      displayOrder={displayOrderById.get(row.stage.id) ?? row.stage.order}
                    />
                  ),
                )}
              </div>
            )}
          </div>
          <Button$1
            type="button"
            variant="ghost"
            size="sm"
            className="mt-0.5 h-7 w-full gap-1 text-[11px] font-normal text-muted-foreground"
            onClick={handleToggle}
            aria-label={t2("productionPlan.actions.collapsePlanAria", "收起制作计划")}
            data-action-ui-id="production-plan.collapse-bottom"
          >
            {t2("productionPlan.actions.collapsePlan", "收起")}
            <Icon icon={ChevronDown} size="xs" strokeWidth={1.5} className="rotate-180" />
          </Button$1>
        </div>
      )}
    </section>
  );
}
export function StageConfirmationBar({
  stage,
  finalStage,
  disabled: disabled2 = false,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  const workspaceId2 = useCurrentWorkspace();
  const canLocate = canFocusStageOutputs(stage);
  const confirmationCopy = getStageConfirmationCopy(stage, finalStage);
  const ConfirmationIcon =
    stage.waiting_reason === "plan_review" || !finalStage ? ArrowRight : Flag;
  const handleLocate = () => {
    if (!workspaceId2) return;
    focusStageOutputs(workspaceId2, stage);
  };
  return (
    <div className="flex items-center gap-2" data-action-ui-id="production-plan.confirmation">
      {canLocate && (
        <Button$1
          type="button"
          variant="secondary"
          size="sm"
          className="relative rounded-md"
          onClick={handleLocate}
          disabled={!workspaceId2}
          data-action-ui-id="production-plan.view-stage-output"
        >
          <span aria-hidden="true" className="absolute inset-0 z-10" data-slot="button-hit-area" />
          <Icon icon={Crosshair} size="sm" strokeWidth={1.5} />
          <span className="pointer-events-none">
            {t2("productionPlan.actions.viewOutput", "查看产物")}
          </span>
        </Button$1>
      )}
      <Button$1
        type="button"
        size="sm"
        className="relative rounded-md"
        disabled={disabled2}
        onClick={onConfirm}
        data-action-ui-id="production-plan.confirm-stage"
      >
        <span aria-hidden="true" className="absolute inset-0 z-10" data-slot="button-hit-area" />
        <Icon icon={ConfirmationIcon} size="sm" strokeWidth={1.5} />
        <span className="pointer-events-none">
          {t2(confirmationCopy.actionKey, confirmationCopy.actionFallback)}
        </span>
      </Button$1>
    </div>
  );
}
const PLAN_TOOL_NAMES = new Set([
  "hub_plan_write",
  "hub_plan_patch_stage",
  "hub_plan_update_stage_state",
  "hub_plan_get_stage_status",
  "hub_plan_get_stage_detail",
  "hub_plan_replan",
  "plan_write",
  "plan_patch_stage",
  "plan_update_stage_state",
  "plan_get_stage_status",
  "plan_get_stage_detail",
  "plan_replan",
]);
export const PRODUCTION_PLAN_REVIEW_TIMEOUT_MS = 15e3;
export class StaleProductionPlanSaveError extends Error {
  code = "STALE_PRODUCTION_PLAN_SAVE";
  constructor() {
    super("The production plan changed while edits were being saved.");
    this.name = "StaleProductionPlanSaveError";
  }
}
export function isPatchStageWorkItemsResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return (
    candidate.ok === true &&
    Number.isInteger(candidate.revision) &&
    Array.isArray(candidate.changed_item_ids) &&
    candidate.changed_item_ids.every((id2) => typeof id2 === "string")
  );
}
export function parseJsonObject(value) {
  if (!value) return void 0;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    const start2 = value.indexOf("{");
    const end2 = value.lastIndexOf("}");
    if (start2 < 0 || end2 <= start2) return void 0;
    try {
      const parsed = JSON.parse(value.slice(start2, end2 + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
    } catch {
      return void 0;
    }
  }
}
export function isStagePlanReviewModel(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return (
    Number.isInteger(candidate.revision) &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.stages) &&
    Array.isArray(candidate.pending_stages) &&
    typeof candidate.waiting_user === "boolean"
  );
}
export function toolName(message2) {
  return ("toolName" in message2 ? message2.toolName : void 0) || message2.content;
}
function planIdFromText(value) {
  const parsed = parseJsonObject(value);
  const parsedId = parsed?.plan_id;
  if (typeof parsedId === "string" && parsedId.trim()) return parsedId;
  const match2 = value?.match(/["']plan_id["']\s*:\s*["']([^"'\\/]+)["']/);
  return match2?.[1]?.trim() || void 0;
}
function findPlanRefInSubMessages(messages2, parentVersion) {
  if (!messages2) return void 0;
  for (let i2 = messages2.length - 1; i2 >= 0; i2 -= 1) {
    const message2 = messages2[i2];
    if (!message2) continue;
    const nested = findPlanRefInSubMessages(message2.subMessages, parentVersion);
    if (nested) return nested;
    if (message2.type !== "tool") continue;
    const name2 = message2.content.split(":", 1)[0] ?? "";
    if (!PLAN_TOOL_NAMES.has(name2)) continue;
    const id2 = planIdFromText(message2.content) ?? planIdFromText(message2.args);
    if (id2)
      return {
        id: id2,
        version: `${parentVersion}:${message2.id}:${message2.toolStatus ?? ""}`,
      };
  }
  return void 0;
}
export function findLatestPlanRef(messages2) {
  for (let i2 = messages2.length - 1; i2 >= 0; i2 -= 1) {
    const message2 = messages2[i2];
    if (!message2) continue;
    if (message2.type === "sub_agent") {
      const nested = findPlanRefInSubMessages(message2.subMessages, message2.id);
      if (nested) return nested;
      continue;
    }
    if (message2.type !== "tool") continue;
    const version2 = `${message2.id}:${message2.toolStatus ?? ""}:${message2.toolResult ?? ""}`;
    const resultId = planIdFromText(message2.toolResult);
    if (resultId)
      return {
        id: resultId,
        version: version2,
      };
    if (!PLAN_TOOL_NAMES.has(toolName(message2))) continue;
    const args = parseJsonObject(message2.toolArgs ?? message2.url);
    const argId = args?.plan_id;
    if (typeof argId === "string" && argId.trim())
      return {
        id: argId,
        version: version2,
      };
  }
  return void 0;
}
