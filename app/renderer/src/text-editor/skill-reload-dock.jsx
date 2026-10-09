// skill-reload-dock.jsx
import {
  ArrowRight,
  CompositedSvg,
  Crosshair,
  useCurrentWorkspace,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Flag } from "../media-editing/package.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";

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
        <RetryIcon
          size={16}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium shrink-0">
              {title}
            </span>
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
                ? t2(
                    "chat.toolConfirm.miniBar.blocked",
                    "Complete required inputs",
                  )
                : t2(
                    "chat.toolConfirm.miniBar.needsApproval",
                    "Needs approval to run",
                  )}
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
  return mode2 === "director-stage"
    ? DIRECTOR_STAGE_PLACEHOLDER
    : CLIP_EDITOR_PLACEHOLDER;
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
    if (
      message2.type === "error" &&
      message2.requestId === pendingQuestion.requestId
    ) {
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

function runtimeNodeId(item) {
  return item.group_node_id || item.group_id || item.node_id;
}

function getStageRuntimeNodeIds(stage) {
  return [
    ...new Set(stage.runtime_refs.map(runtimeNodeId).filter((id2) => !!id2)),
  ];
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
        .flatMap((item) => [
          item.group_node_id,
          item.group_id,
          item.node_id,
          item.document_node_id,
        ])
        .filter((id2) => !!id2),
    ),
  ];
}

export function canFocusStageOutputs(stage) {
  return (
    getStageFocusNodeIds(stage).length > 0 ||
    getStageOutputPaths(stage).length > 0
  );
}

export function focusStageOutputs(workspaceId2, stage) {
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
    <div
      className="flex items-center gap-2"
      data-action-ui-id="production-plan.confirmation"
    >
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
          <span
            aria-hidden="true"
            className="absolute inset-0 z-10"
            data-slot="button-hit-area"
          />
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
        <span
          aria-hidden="true"
          className="absolute inset-0 z-10"
          data-slot="button-hit-area"
        />
        <Icon icon={ConfirmationIcon} size="sm" strokeWidth={1.5} />
        <span className="pointer-events-none">
          {t2(confirmationCopy.actionKey, confirmationCopy.actionFallback)}
        </span>
      </Button$1>
    </div>
  );
}

export class StaleProductionPlanSaveError extends Error {
  code = "STALE_PRODUCTION_PLAN_SAVE";
  constructor() {
    super("The production plan changed while edits were being saved.");
    this.name = "StaleProductionPlanSaveError";
  }
}

export function parseJsonObject(value) {
  if (!value) return void 0;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : void 0;
  } catch {
    const start2 = value.indexOf("{");
    const end2 = value.lastIndexOf("}");
    if (start2 < 0 || end2 <= start2) return void 0;
    try {
      const parsed = JSON.parse(value.slice(start2, end2 + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : void 0;
    } catch {
      return void 0;
    }
  }
}

export function toolName(message2) {
  return (
    ("toolName" in message2 ? message2.toolName : void 0) || message2.content
  );
}
