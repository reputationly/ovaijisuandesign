// leave-team-dialog.jsx
import { reactExports, useMutation, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Alert, AlertDescription } from "./alert-variants.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { useAuth, useTeamAccount } from "../assets/credit-query-keys.jsx";
import { AlertDialog } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { Label } from "./use-wallet-query.jsx";
import { TeamMemberCombobox } from "./team-member-combobox.jsx";
import { accountScopeEquals } from "./account-scope-equals.js";
import { useInGroupMembersQuery } from "./use-team-transactions-feed-query.jsx";
let TeamScopeChangedError = class TeamScopeChangedError2 extends Error {};
class TeamExitResultError2 extends Error {
  constructor(result) {
    super(result.status);
    this.result = result;
  }
}
function toSuccessorOption(member) {
  return {
    userId: member.userId,
    displayName: member.userName,
    description: `UID ${member.userId}`,
  };
}
export function LeaveTeamDialog({
  open,
  scope,
  teamName,
  currentRole = "MEMBER",
  memberCount = 1,
  onOpenChange,
  onLeft,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope, exitCurrentTeam } = useTeamAccount();
  const { user } = useAuth();
  const selfUserId = user?.userID ?? null;
  const confirmInputId = reactExports.useId();
  const [confirmText, setConfirmText] = reactExports.useState("");
  const [successorUserId, setSuccessorUserId] = reactExports.useState(null);
  const [searchInput, setSearchInput] = reactExports.useState("");
  const [actionError, setActionError] = reactExports.useState(null);
  const nameConfirmed = confirmText === teamName;
  const isOwner = currentRole === "OWNER";
  const needsSuccessor = isOwner && memberCount > 1;
  const dissolveOnly = isOwner && memberCount <= 1;
  const membersQuery = useInGroupMembersQuery({
    scope,
    enabled: open && needsSuccessor,
  });
  const eligibleSuccessors = reactExports.useMemo(
    () =>
      (membersQuery.data ?? [])
        .filter((member) => selfUserId === null || member.userId !== selfUserId)
        .map(toSuccessorOption),
    [membersQuery.data, selfUserId],
  );
  const normalizedSearch = searchInput.trim().toLocaleLowerCase();
  const visibleSuccessors = normalizedSearch
    ? eligibleSuccessors.filter(
        (option2) =>
          option2.displayName.toLocaleLowerCase().includes(normalizedSearch) ||
          option2.userId.includes(normalizedSearch),
      )
    : eligibleSuccessors;
  const remoteProvedEmpty =
    needsSuccessor && membersQuery.isSuccess && eligibleSuccessors.length === 0;
  const effectiveDissolveOnly = dissolveOnly || remoteProvedEmpty;
  const effectiveNeedsSuccessor = needsSuccessor && !remoteProvedEmpty;
  const canSubmit =
    nameConfirmed &&
    !effectiveDissolveOnly &&
    (!effectiveNeedsSuccessor || successorUserId !== null);
  reactExports.useEffect(() => {
    if (open) {
      setConfirmText("");
      setSuccessorUserId(null);
      setSearchInput("");
      setActionError(null);
    }
  }, [open, teamName]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (
        !activeScope ||
        !scope.membershipRevision ||
        !accountScopeEquals(activeScope, scope)
      ) {
        throw new TeamScopeChangedError();
      }
      if (effectiveDissolveOnly) {
        throw new Error("sole_owner_must_dissolve");
      }
      if (effectiveNeedsSuccessor && !successorUserId) {
        throw new Error("successor_required");
      }
      const result = await exitCurrentTeam({
        sourceGroupId: scope.groupId,
        expectedMembershipRevision: scope.membershipRevision,
        mode: "LEAVE",
        ...(isOwner && successorUserId
          ? {
              newOwnerUserId: successorUserId,
            }
          : {}),
        creditDisposition: {
          mode: "NONE",
        },
      });
      if (
        result.status === "busy" ||
        result.status === "partial" ||
        result.status === "rejected"
      ) {
        throw new TeamExitResultError2(result);
      }
      return result;
    },
    retry: false,
    onSuccess: () => {
      setActionError(null);
      queryClient2.removeQueries({
        queryKey: teamQueryKeys.membership(scope),
      });
      void queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.contexts(scope.identityKey),
      });
      dedupedToast.success(
        t2("team.management.leaveSucceeded", {
          defaultValue: "已退出团队。",
        }),
      );
      onOpenChange(false);
      onLeft();
    },
    onError: (error) => {
      if (error instanceof TeamScopeChangedError) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onOpenChange(false);
        return;
      }
      if (
        error instanceof TeamExitResultError2 &&
        error.result.status === "partial" &&
        error.result.phase === "OWNERSHIP_TRANSFERRED"
      ) {
        setActionError(
          t2("team.management.transferLeavePartialFailed", {
            defaultValue:
              "所有权已移交，但退出失败。请刷新后重试退出，勿重复移交以免产生双 Owner。",
          }),
        );
        return;
      }
      if (
        error instanceof TeamExitResultError2 &&
        error.result.status === "partial" &&
        error.result.phase === "EXIT_RESULT_UNKNOWN"
      ) {
        setActionError(
          t2("team.management.leaveResultUnknown", {
            defaultValue:
              "退出结果尚未确认，已切换到个人空间并暂停原团队的新请求。成员关系刷新后再确认最终状态。",
          }),
        );
        return;
      }
      setActionError(
        error instanceof TeamExitResultError2 && error.result.status === "busy"
          ? t2("team.management.exitBusy", {
              defaultValue:
                "当前仍有运行中的任务或待发送内容，请完成后再退出团队。",
            })
          : t2("team.management.leaveFailed", {
              defaultValue: "退出团队失败，请稍后重试。",
            }),
      );
    },
  });
  const leaveDescription = effectiveDissolveOnly
    ? t2("team.management.leaveOwnerSoleDescription", {
        defaultValue:
          "你是“{{name}}”的唯一成员。请使用「解散团队」完成退出，不能直接退出。若解散因上游服务异常失败，团队与积分保持不变，请稍后重试。",
        name: teamName,
      })
    : effectiveNeedsSuccessor
      ? t2("team.management.leaveOwnerDescription", {
          defaultValue:
            "退出“{{name}}”前须指定继任 Owner。移交并退出后将切换回个人空间。",
          name: teamName,
        })
      : t2("team.management.leaveDescription", {
          defaultValue: "退出“{{name}}”后，将立即切换回个人空间。是否继续？",
          name: teamName,
        });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !mutation.isPending && onOpenChange(nextOpen)}
    >
      <AlertDialogContent
        layer="nested"
        data-action-ui-id="team.management-leave-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.leaveTitle", {
              defaultValue: "退出团队",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>{leaveDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {effectiveNeedsSuccessor ? (
          <div className="grid gap-2">
            <Label className="text-muted-foreground font-normal">
              {t2("team.management.successorLabel", {
                defaultValue: "继任 Owner",
              })}
            </Label>
            <TeamMemberCombobox
              value={successorUserId}
              onValueChange={setSuccessorUserId}
              options={visibleSuccessors}
              searchQuery={searchInput}
              onSearchChange={setSearchInput}
              disabled={mutation.isPending}
              loading={membersQuery.isPending}
              error={membersQuery.isError}
              onRetry={() => void membersQuery.refetch()}
              placeholder={t2("team.management.successorPlaceholder", {
                defaultValue: "搜索并选择继任 Owner",
              })}
              data-action-ui-id="team.management-leave-successor"
            />
          </div>
        ) : null}
        {!effectiveDissolveOnly ? (
          <div className="grid gap-2">
            <Label
              htmlFor={confirmInputId}
              className="text-muted-foreground font-normal"
            >
              {t2("team.management.leaveConfirmPrompt", {
                defaultValue: "请输入团队名称 “{{name}}” 以确认：",
                name: teamName,
              })}
            </Label>
            <Input3
              id={confirmInputId}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={teamName}
              autoComplete="off"
              autoFocus={!effectiveNeedsSuccessor}
              disabled={mutation.isPending}
              data-action-ui-id="team.management-leave-confirm-input"
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit && !mutation.isPending) {
                  event.preventDefault();
                  mutation.mutate();
                }
              }}
            />
          </div>
        ) : null}
        {actionError ? (
          <Alert data-action-ui-id="team.management-leave-error">
            <AlertDescription className="text-foreground">
              {actionError}
            </AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </AlertDialogCancel>
          {effectiveDissolveOnly ? null : (
            <AlertDialogAction
              variant="destructive"
              loading={mutation.isPending}
              disabled={!canSubmit || mutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!canSubmit || mutation.isPending) return;
                mutation.mutate();
              }}
              data-action-ui-id="team.management-leave-confirm"
            >
              {t2("team.management.leaveConfirm", {
                defaultValue: "确认退出",
              })}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
