// create-team-dialog.jsx
import {
  Info$1,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AlertDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import {
  BLOCKING_REASON_FALLBACKS,
  BLOCKING_REASON_KEYS,
  formatCreditAmount,
  getTeamReasonText,
} from "./team-panel-stale.jsx";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { CreateTeamFormSurface } from "./create-team-form-surface.jsx";
import {
  accountScopeKey,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { TeamCreditPage } from "./team-credit-page.jsx";
import { TeamManagementDialog } from "./team-management-dialog.jsx";
import { accountScopeEquals } from "./account-scope-equals.js";

const USER_STOPPABLE_REASONS = ["ACTIVE_RUN"];

function hasUserStoppableReason(reasons) {
  return reasons.some((reason) => USER_STOPPABLE_REASONS.includes(reason));
}

function CreateTeamDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const { createTeamAndSwitch, lastTransitionAttempt } = useTeamAccount();
  const [teamName, setTeamName] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [localAttempt, setLocalAttempt] = reactExports.useState(null);
  const statusAttempt = localAttempt ?? lastTransitionAttempt;
  const recovering = statusAttempt?.kind === "recovering";
  const statusText =
    statusAttempt?.kind === "busy"
      ? getTeamReasonText(t2, "switch_busy")
      : statusAttempt?.kind === "rejected"
        ? getTeamReasonText(t2, statusAttempt.code)
        : statusAttempt?.kind === "recovering"
          ? getTeamReasonText(t2, statusAttempt.reasonCode)
          : null;
  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedName = teamName.trim();
    if (!normalizedName || submitting || recovering) return;
    setSubmitting(true);
    setLocalAttempt(null);
    try {
      const result = await createTeamAndSwitch(normalizedName);
      if (result.status === "completed") {
        setTeamName("");
        setLocalAttempt(null);
        return;
      }
      if (result.status === "rejected") {
        setLocalAttempt({
          kind: "rejected",
          code: result.code,
        });
      } else if (result.status === "busy") {
        setLocalAttempt({
          kind: "busy",
          blockingReasons: result.blockingReasons,
        });
      } else if (result.status === "recovering") {
        setLocalAttempt({
          kind: "recovering",
          reasonCode: result.reasonCode,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.create-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pt-5 sm:pr-16 sm:pb-4">
          <DialogTitle>
            {t2("team.create.title", {
              defaultValue: "创建团队",
            })}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <span>
              {t2("team.create.description", {
                defaultValue:
                  "团队拥有独立积分账户，购买的积分由团队成员共享，每位成员可单独配置额度。",
              })}
            </span>
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="inline-flex shrink-0 text-muted-foreground"
                      data-action-ui-id="team.create-credit-info"
                    />
                  }
                >
                  <Info$1 size={14} strokeWidth={1.5} aria-hidden={true} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t2("team.create.creditInfo", {
                    defaultValue: "团队账号积分需单独购买，不与个人账号互通。",
                  })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <CreateTeamFormSurface
            inputId="team-create-name"
            inputActionId="team.create-name-input"
            cancelActionId="team.create-cancel"
            submitActionId="team.create-submit"
            teamName={teamName}
            placeholder={t2("team.create.namePlaceholder", {
              defaultValue: "输入团队名称",
            })}
            disabled={submitting || recovering}
            submitting={submitting}
            submitDisabled={recovering || teamName.trim().length === 0}
            statusText={statusText}
            statusTone={
              statusAttempt?.kind === "rejected" ? "destructive" : "neutral"
            }
            autoFocus={true}
            submitLabel={t2("team.create.submit", {
              defaultValue: "创建并切换",
            })}
            onTeamNameChange={setTeamName}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DissolveTransferSuccessDialog({ result, onClose }) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-action-ui-id="team.management-dissolve-transfer-success">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.dissolveTransferSuccessTitle", {
              defaultValue: "积分转移成功",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("team.management.dissolveTransferSuccessDescription", {
              defaultValue: "已成功将 {{amount}} 积分转入“{{target}}”。",
              amount: formatCreditAmount(result.amount),
              target: result.targetName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            {t2("common.confirm", {
              defaultValue: "确认",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeamSwitchBlockedDialog({ open, blockingReasons, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const stoppable = hasUserStoppableReason(blockingReasons);
  const description = stoppable
    ? t2("team.switchBlocked.stoppableDescription", {
        defaultValue:
          "当前有生成中的任务，无法切换 Group。请先停止该任务，然后再切换。",
      })
    : t2("team.switchBlocked.waitDescription", {
        defaultValue:
          "当前有正在进行的操作，无法切换 Group。请等待其完成后重试。",
      });
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-action-ui-id="team.switch-blocked-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.switchBlocked.title", {
              defaultValue: "无法切换 Group",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {blockingReasons.length > 0 ? (
          <ul
            className="list-disc space-y-1 break-words pl-5 text-xs text-muted-foreground"
            data-action-ui-id="team.switch-blocked-reasons"
          >
            {blockingReasons.map((reason) => (
              <li
                key={reason}
                data-action-ui-id="team.switch-blocked-reason"
                data-team-blocking-reason={reason}
              >
                {t2(BLOCKING_REASON_KEYS[reason], {
                  defaultValue: BLOCKING_REASON_FALLBACKS[reason],
                })}
              </li>
            ))}
          </ul>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            data-action-ui-id="team.switch-blocked-confirm"
          >
            {t2("team.switchBlocked.confirm", {
              defaultValue: "知道了",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function dialogScopeKey(scope) {
  return [scope.identityKey, scope.groupId, scope.epoch].join(":");
}

function dialogScopeIdentityEquals(left, right) {
  if (!left || !right) return false;
  return (
    left.identityKey === right.identityKey &&
    left.groupId === right.groupId &&
    left.epoch === right.epoch
  );
}

export function TeamDialogHost() {
  const { t: t2 } = useTranslation();
  const {
    integrationEnabled,
    snapshot: snapshot2,
    dialog,
    activeScope,
    accountDataVisible,
    closeDialog,
  } = useTeamAccount();
  const [dissolveTransferSuccess, setDissolveTransferSuccess] =
    reactExports.useState(null);
  const handleOpenChange = (open) => {
    if (!open) closeDialog();
  };
  const renderActiveDialog = () => {
    if (!integrationEnabled || dialog.type === "closed") return null;
    if (dialog.type === "create") {
      if (dialog.identityKey !== snapshot2?.identityKey) return null;
      return <CreateTeamDialog open={true} onOpenChange={handleOpenChange} />;
    }
    if (dialog.type === "switch-blocked") {
      if (dialog.identityKey !== snapshot2?.identityKey) return null;
      return (
        <TeamSwitchBlockedDialog
          open={true}
          blockingReasons={dialog.blockingReasons}
          onOpenChange={handleOpenChange}
        />
      );
    }
    if (!accountDataVisible) return null;
    if (dialog.type === "management") {
      if (!accountScopeEquals(dialog.scope, activeScope)) return null;
      return (
        <TeamManagementDialog
          key={accountScopeKey(dialog.scope)}
          open={true}
          scope={dialog.scope}
          onOpenChange={handleOpenChange}
          onDissolveTransferSucceeded={setDissolveTransferSuccess}
        />
      );
    }
    if (!dialogScopeIdentityEquals(dialog.scope, activeScope)) return null;
    return (
      <Dialog
        key={dialogScopeKey(dialog.scope)}
        open={true}
        onOpenChange={handleOpenChange}
      >
        <DialogContent
          size="lg"
          className="flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pt-5 sm:pr-16 sm:pb-4">
            <DialogTitle>
              {t2("team.credit.detailTitle", {
                defaultValue: "消耗明细",
              })}
            </DialogTitle>
            <DialogDescription>
              {t2("team.credit.detailDescription", {
                defaultValue: "仅展示当前账号的消耗明细，不包含团队整体消耗。",
              })}
            </DialogDescription>
          </DialogHeader>
          <TeamCreditPage open={true} scope={dialog.scope} />
        </DialogContent>
      </Dialog>
    );
  };
  return (
    <>
      {renderActiveDialog()}
      {dissolveTransferSuccess ? (
        <DissolveTransferSuccessDialog
          result={dissolveTransferSuccess}
          onClose={() => setDissolveTransferSuccess(null)}
        />
      ) : null}
    </>
  );
}
