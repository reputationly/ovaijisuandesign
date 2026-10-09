// team-member-settings-page.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, useQueryClient, useMutation, cva } from "../vendor.js";
import { Select$1, teamQueryKeys, creditQueryKeys, useTeamAccount, useAuth } from "../m15/apply-asset-change.jsx";
import {
  Button$1,
  cn$2,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input3,
} from "../asset-center/shared/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatCreditAmount } from "./account-switcher-view.jsx";
import {
  TeamHelpTip,
  assignableRolesForTarget,
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
  isUpstreamContractFailure,
  teamMutationReasonCode,
} from "./batch-remove-members-dialog.jsx";
import { Label } from "./infinite-scroll-container.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageFooter,
  PageHeader,
  PageTitle,
} from "./past-team-members-panel.jsx";
import { teamApi } from "./team-api.js";
import { TeamMemberCombobox } from "./team-credit-summary-surface.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
import { useInGroupMembersQuery } from "./use-team-transactions-feed-query.jsx";
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-xs has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
export function Alert({ className, variant, ...props }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn$2(
        alertVariants({
          variant,
        }),
        className,
      )}
      {...props}
    />
  );
}
export function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn$2(
        "font-heading font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn$2(
        "text-xs/relaxed text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-2",
        className,
      )}
      {...props}
    />
  );
}
let TeamScopeChangedError$1 = class TeamScopeChangedError2 extends Error {};
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
      if (!activeScope || !scope.membershipRevision || !accountScopeEquals(activeScope, scope)) {
        throw new TeamScopeChangedError$1();
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
      if (result.status === "busy" || result.status === "partial" || result.status === "rejected") {
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
      if (error instanceof TeamScopeChangedError$1) {
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
              defaultValue: "当前仍有运行中的任务或待发送内容，请完成后再退出团队。",
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
          defaultValue: "退出“{{name}}”前须指定继任 Owner。移交并退出后将切换回个人空间。",
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
      <AlertDialogContent layer="nested" data-action-ui-id="team.management-leave-dialog">
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
            <Label htmlFor={confirmInputId} className="text-muted-foreground font-normal">
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
            <AlertDescription className="text-foreground">{actionError}</AlertDescription>
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
let ScopeChangedError$1 = class ScopeChangedError2 extends Error {};
function isValidLimit(value) {
  if (!/^(0|[1-9]\d*)$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0;
}
export function TeamDefaultQuotaPage({
  scope,
  quota,
  fallbackTeamRemaining,
  fallbackEligibleMemberCount,
  memberPageSize,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope } = useTeamAccount();
  const controllerRef = reactExports.useRef(null);
  const [limit, setLimit] = reactExports.useState(() =>
    quota?.defaultMode === "LIMITED" && quota.memberLimit !== null ? quota.memberLimit : "",
  );
  const [limitTouched, setLimitTouched] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [errorReasonCode, setErrorReasonCode] = reactExports.useState(null);
  const teamRemaining = quota?.teamRemaining ?? fallbackTeamRemaining;
  const eligibleMemberCount = quota?.eligibleMemberCount ?? fallbackEligibleMemberCount;
  const hasEligibleMembers = eligibleMemberCount === null || eligibleMemberCount > 0;
  const limitValid = isValidLimit(limit);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeScope || !accountScopeEquals(activeScope, scope)) {
        throw new ScopeChangedError$1();
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      const memberIds = await teamApi.listAllMemberIds(scope, memberPageSize, {
        signal: controller.signal,
      });
      if (memberIds.length === 0) {
        throw new Error("no_eligible_members");
      }
      await teamApi.setMemberQuotas(scope, memberIds, limit, {
        signal: controller.signal,
      });
      return memberIds.length;
    },
    retry: false,
    onSuccess: async (affectedMemberCount) => {
      setError(null);
      setErrorReasonCode(null);
      await Promise.all([
        queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.membership(scope),
        }),
        queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.scope(scope),
        }),
      ]);
      dedupedToast.success(
        t2("team.management.defaultQuotaSaved", {
          defaultValue: "已为全部 {{count}} 名成员更新限额。",
          count: affectedMemberCount,
        }),
      );
      onClose();
    },
    onError: (mutationError) => {
      if (mutationError instanceof ScopeChangedError$1) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onClose();
        return;
      }
      const detail = describeTeamMutationError(mutationError);
      const suffix = formatTeamMutationErrorSuffix(detail);
      setErrorReasonCode(teamMutationReasonCode(detail));
      setError(
        [
          t2("team.management.defaultQuotaSaveFailed", {
            defaultValue: "团队统一限额保存失败，请稍后重试。",
          }),
          suffix,
        ]
          .filter(Boolean)
          .join(" "),
      );
    },
    onSettled: () => {
      controllerRef.current = null;
    },
  });
  reactExports.useEffect(() => {
    if (activeScope && accountScopeEquals(activeScope, scope)) return;
    controllerRef.current?.abort();
    onClose();
  }, [activeScope, onClose, scope]);
  const handleClose = () => {
    if (!mutation.isPending) onClose();
  };
  const handleSave = () => {
    setError(null);
    setErrorReasonCode(null);
    if (!limitValid) {
      setError(
        t2("team.management.defaultQuotaInvalid", {
          defaultValue: "请输入不超过安全整数范围的非负整数。",
        }),
      );
      return;
    }
    mutation.mutate();
  };
  return (
    <Page open={true} onOpenChange={(next2) => !next2 && handleClose()}>
      <PageContent
        className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.management-default-quota-dialog"
      >
        <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
          <PageTitle>
            {t2("team.management.defaultQuotaTitle", {
              defaultValue: "一键配置限额",
            })}
          </PageTitle>
          <PageDescription>
            {t2("team.management.defaultQuotaDescription", {
              defaultValue: "为团队成员设置统一额度，批量管理积分使用。",
            })}
          </PageDescription>
        </PageHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground">
                {t2("team.credit.teamRemaining", {
                  defaultValue: "团队剩余积分",
                })}
              </p>
              <p className="mt-1 font-heading text-base font-medium tabular-nums text-foreground">
                {teamRemaining === null ? "—" : formatCreditAmount(teamRemaining)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground">
                {t2("team.management.eligibleMembers", {
                  defaultValue: "适用成员",
                })}
              </p>
              <p className="mt-1 font-heading text-base font-medium tabular-nums text-foreground">
                {eligibleMemberCount === null ? "—" : eligibleMemberCount}
              </p>
            </div>
          </div>
          {quota?.defaultMode === "MIXED" ? (
            <p className="text-xs text-muted-foreground">
              {t2("team.management.defaultQuotaMixedNotice", {
                defaultValue: "当前成员限额不一致，请输入本次要统一设置的额度。",
              })}
            </p>
          ) : null}
          <label className="space-y-2" htmlFor="team-default-quota-limit">
            <span className="font-medium text-foreground">
              {t2("team.management.defaultQuotaPerMember", {
                defaultValue: "每人默认限额",
              })}
            </span>
            <Input3
              id="team-default-quota-limit"
              inputMode="numeric"
              autoFocus={true}
              value={limit}
              disabled={mutation.isPending || !hasEligibleMembers}
              aria-invalid={limitTouched && !limitValid}
              onChange={(event) => {
                setLimit(event.target.value);
                setLimitTouched(true);
                setError(null);
              }}
              data-action-ui-id="team.management-default-quota-input"
              data-team-quota-limit={limit}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {t2("team.management.defaultQuotaResetNote", {
              defaultValue:
                "保存后，当前所有成员将使用相同的积分上限。设置限额不会提前扣除团队积分，额度也不会自动重置。",
            })}
          </p>
          {error ? (
            <p
              className="text-xs text-destructive"
              role="alert"
              data-action-ui-id="team.management-default-quota-error"
              data-team-reason-code={errorReasonCode ?? void 0}
            >
              {error}
            </p>
          ) : null}
        </div>
        <PageFooter className="shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6">
          <Button$1
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={handleClose}
            data-action-ui-id="team.management-default-quota-cancel"
          >
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </Button$1>
          <Button$1
            type="button"
            loading={mutation.isPending}
            disabled={mutation.isPending || !hasEligibleMembers || !limitValid}
            onClick={handleSave}
            data-action-ui-id="team.management-default-quota-save"
          >
            {t2("team.management.applyDefaultQuota", {
              defaultValue: "配置",
            })}
          </Button$1>
        </PageFooter>
      </PageContent>
    </Page>
  );
}
const UNSIGNED_DECIMAL = /^(0|[1-9]\d*)$/;
class ScopeChangedError3 extends Error {}
export function TeamMemberSettingsPage({
  scope,
  member,
  teamName,
  teamRemaining,
  quotaMutationEnabled,
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope } = useTeamAccount();
  const canChangeRole = member.permissions.changeRole.allowed;
  const canChangeQuota = quotaMutationEnabled && member.permissions.changeQuota.allowed;
  const canRemove = member.permissions.removeMember.allowed;
  const roles = assignableRolesForTarget(member.role, canChangeRole);
  const [role, setRole] = reactExports.useState(
    member.role === "MEMBER" || member.role === "ADMIN" ? member.role : null,
  );
  const [limit, setLimit] = reactExports.useState(
    member.quota.mode === "LIMITED" ? member.quota.limit : "",
  );
  const [quotaMode, setQuotaMode] = reactExports.useState(member.quota.mode);
  const [limitTouched, setLimitTouched] = reactExports.useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = reactExports.useState(false);
  const [actionError, setActionError] = reactExports.useState(null);
  const [actionErrorReasonCode, setActionErrorReasonCode] = reactExports.useState(null);
  const clearActionError = () => {
    setActionError(null);
    setActionErrorReasonCode(null);
  };
  reactExports.useEffect(() => {
    setRole(member.role === "MEMBER" || member.role === "ADMIN" ? member.role : null);
  }, [member.userId, member.role]);
  reactExports.useEffect(() => {
    setLimit(member.quota.mode === "LIMITED" ? (member.quota.limit ?? "") : "");
    setQuotaMode(member.quota.mode);
    setLimitTouched(false);
  }, [member.userId, member.quota.mode, member.quota.limit]);
  const roleDirty = canChangeRole && role !== null && role !== member.role;
  const normalizedLimit = limit?.trim() ?? "";
  const numericLimit = Number(normalizedLimit);
  const validLimit =
    UNSIGNED_DECIMAL.test(normalizedLimit) &&
    Number.isSafeInteger(numericLimit) &&
    numericLimit >= 0;
  const quotaDirty =
    canChangeQuota &&
    (quotaMode !== member.quota.mode ||
      (quotaMode === "LIMITED" && member.quota.limit !== normalizedLimit));
  const canSave = (roleDirty || quotaDirty) && (!quotaDirty || validLimit);
  const assertScope = () => {
    if (!activeScope || !accountScopeEquals(activeScope, scope)) {
      throw new ScopeChangedError3();
    }
  };
  const invalidateMembership = async () => {
    await Promise.all([
      queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.membership(scope),
      }),
      queryClient2.invalidateQueries({
        queryKey: creditQueryKeys.scope(scope),
      }),
    ]);
  };
  const saveMutation = useMutation({
    mutationFn: async () => {
      assertScope();
      const results = await Promise.allSettled([
        roleDirty && role
          ? teamApi.changeMemberRole(scope, member.userId, role)
          : Promise.resolve(),
        quotaDirty
          ? teamApi.setMemberQuotas(scope, [member.userId], normalizedLimit)
          : Promise.resolve(),
      ]);
      const failedResult = results.find((result) => result.status === "rejected");
      if (failedResult) {
        await invalidateMembership();
        throw failedResult.reason;
      }
    },
    retry: false,
    onSuccess: async () => {
      clearActionError();
      await invalidateMembership();
      dedupedToast.success(
        t2("team.management.settingsSaved", {
          defaultValue: "成员设置已更新。",
        }),
      );
      onClose();
    },
    onError: (error) => {
      if (error instanceof ScopeChangedError3) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onClose();
        return;
      }
      const detail = describeTeamMutationError(error);
      const suffix = formatTeamMutationErrorSuffix(detail);
      const primary = isUpstreamContractFailure(detail)
        ? t2("team.management.settingsUpstreamUnavailable", {
            defaultValue: "成员设置更新暂不可用（上游异常），请稍后重试。",
          })
        : t2("team.management.settingsSaveFailed", {
            defaultValue: "成员设置更新失败，请稍后重试。",
          });
      setActionError(suffix ? `${primary}（${suffix}）` : primary);
      setActionErrorReasonCode(teamMutationReasonCode(detail));
    },
  });
  const removeMutation = useMutation({
    mutationFn: async () => {
      assertScope();
      return teamApi.removeMember(scope, member.userId);
    },
    retry: false,
    onSuccess: async () => {
      clearActionError();
      await invalidateMembership();
      dedupedToast.success(
        t2("team.management.removeMemberSucceeded", {
          defaultValue: "已移除成员。",
        }),
      );
      setRemoveConfirmOpen(false);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ScopeChangedError3) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        setRemoveConfirmOpen(false);
        onClose();
        return;
      }
      setActionError(
        t2("team.management.removeMemberFailed", {
          defaultValue: "移除成员失败，请稍后重试。",
        }),
      );
      setRemoveConfirmOpen(false);
    },
  });
  const formattedTeamRemaining = formatCreditAmount(teamRemaining ?? "");
  const quotaUsed = member.quota.mode === "LIMITED" ? member.quota.used : null;
  const formattedQuotaUsed = quotaUsed === null ? "—" : formatCreditAmount(quotaUsed);
  const previewQuotaLimit = validLimit ? normalizedLimit : null;
  const formattedPreviewQuotaLimit =
    previewQuotaLimit === null ? "—" : formatCreditAmount(previewQuotaLimit);
  const showQuotaInformation = canChangeQuota || member.quota.mode === "LIMITED";
  const busy = saveMutation.isPending || removeMutation.isPending;
  return (
    <>
      <Page open={true} onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()}>
        <PageContent
          className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
          data-action-ui-id="team.management-member-settings-dialog"
        >
          <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
            <PageTitle>
              {t2("team.management.memberSettings", {
                defaultValue: "成员设置",
              })}
            </PageTitle>
            <PageDescription>
              {t2("team.management.memberSettingsDescription", {
                defaultValue: "管理 {{name}} 在“{{team}}”中的角色与额度。",
                name: member.displayName,
                team: teamName,
              })}
            </PageDescription>
          </PageHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
            <section className="overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="space-y-1 px-4 py-3">
                <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {"UID "}
                  {member.userId}
                </p>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-t border-border px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {t2("team.management.role", {
                    defaultValue: "角色",
                  })}
                </div>
                {canChangeRole && roles.length > 0 && role !== null ? (
                  <Select$1
                    value={role}
                    disabled={busy}
                    onValueChange={(value) => {
                      if (value !== "MEMBER" && value !== "ADMIN") return;
                      setRole(value);
                      clearActionError();
                    }}
                  >
                    <SelectTrigger
                      className="h-10! w-72 px-3 text-sm"
                      aria-label={t2("team.management.role", {
                        defaultValue: "角色",
                      })}
                      data-action-ui-id="team.management-member-role-select"
                      data-selected-role={role}
                    >
                      <SelectValue>
                        {t2(`team.role.${role.toLowerCase()}`, {
                          defaultValue: role,
                        })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start" positionerClassName="z-[70]">
                      {roles.map((candidate) => (
                        <SelectItem
                          key={candidate}
                          value={candidate}
                          className="items-start py-3"
                          data-action-ui-id={`team.management-member-role-${candidate.toLowerCase()}`}
                        >
                          <div className="flex min-w-0 flex-col items-start gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {t2(`team.role.${candidate.toLowerCase()}`, {
                                defaultValue: candidate,
                              })}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {candidate === "ADMIN"
                                ? t2("team.management.adminRoleDescription", {
                                    defaultValue: "可分配成员积分，并查看成员消耗明细。",
                                  })
                                : t2("team.management.memberRoleDescription", {
                                    defaultValue: "可使用团队积分，不能管理其他成员。",
                                  })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select$1>
                ) : (
                  <p className="text-xs font-medium text-foreground">
                    {t2(`team.role.${member.role.toLowerCase()}`, {
                      defaultValue: member.role,
                    })}
                  </p>
                )}
              </div>
              {showQuotaInformation ? (
                <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 border-t border-border px-4 py-3">
                  <div className="flex min-h-8 items-center gap-1 text-xs text-muted-foreground">
                    {member.quota.mode === "LIMITED"
                      ? t2("team.management.quotaAdjustment", {
                          defaultValue: "额度调整",
                        })
                      : t2("team.management.addQuotaLimit", {
                          defaultValue: "添加限额",
                        })}
                    {member.quota.mode !== "LIMITED" ? (
                      <TeamHelpTip
                        label={t2("team.management.addQuotaLimitHelp", {
                          defaultValue: "添加限额说明",
                        })}
                        content={t2("team.management.addQuotaLimitHelpContent", {
                          defaultValue:
                            "该限额用于限制成员在当前团队中可使用的积分。保存后生效，成员后续消耗不能超过此上限。",
                        })}
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-2">
                    {member.quota.mode === "LIMITED" ? (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <div className="inline-flex items-center gap-1 whitespace-nowrap">
                          <span className="text-muted-foreground">
                            {t2("team.management.quotaUsedInlineLabel", {
                              defaultValue: "已用额度：",
                            })}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {formattedQuotaUsed}
                          </span>
                        </div>
                        <div className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
                          <label
                            htmlFor="team-member-settings-quota"
                            className="text-muted-foreground"
                          >
                            {t2("team.management.quotaLimitInlineLabel", {
                              defaultValue: "额度上限：",
                            })}
                          </label>
                          {canChangeQuota ? (
                            <Input3
                              id="team-member-settings-quota"
                              className="w-24 text-xs"
                              value={limit ?? ""}
                              inputMode="numeric"
                              disabled={busy}
                              onChange={(event) => {
                                setLimit(event.target.value);
                                setQuotaMode("LIMITED");
                                setLimitTouched(true);
                                clearActionError();
                              }}
                              aria-invalid={limitTouched && !validLimit}
                              data-action-ui-id="team.management-member-quota-input"
                            />
                          ) : (
                            <span className="font-medium tabular-nums text-foreground">
                              {formattedPreviewQuotaLimit}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : canChangeQuota ? (
                      <>
                        <label htmlFor="team-member-settings-quota" className="sr-only">
                          {t2("team.management.addQuotaLimit", {
                            defaultValue: "添加限额",
                          })}
                        </label>
                        <Input3
                          id="team-member-settings-quota"
                          value={limit ?? ""}
                          inputMode="numeric"
                          disabled={busy}
                          placeholder={t2("team.management.addQuotaLimitPlaceholder", {
                            defaultValue: "输入额度上限",
                          })}
                          onChange={(event) => {
                            setLimit(event.target.value);
                            setQuotaMode("LIMITED");
                            setLimitTouched(true);
                            clearActionError();
                          }}
                          aria-invalid={limitTouched && !validLimit}
                          data-action-ui-id="team.management-member-quota-input"
                        />
                      </>
                    ) : null}
                    {limitTouched && !validLimit ? (
                      <p className="text-xs text-destructive">
                        {t2("team.management.quotaLimitInvalid", {
                          defaultValue: "请输入不超过安全整数范围的非负整数。",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className="col-span-2 text-xs text-muted-foreground"
                    data-action-ui-id="team.management-member-team-remaining"
                  >
                    {t2("team.management.teamCreditBalance", {
                      defaultValue: "团队积分余额：{{amount}}",
                      amount: formattedTeamRemaining,
                    })}
                  </p>
                </div>
              ) : null}
            </section>
            {actionError ? (
              <p
                className="text-xs text-destructive"
                role="alert"
                data-action-ui-id="team.management-member-settings-error"
                data-team-reason-code={actionErrorReasonCode ?? void 0}
              >
                {actionError}
              </p>
            ) : null}
          </div>
          {canChangeRole || canChangeQuota || canRemove ? (
            <PageFooter className="shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6">
              {canRemove ? (
                <Button$1
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRemoveConfirmOpen(true)}
                  data-action-ui-id="team.management-member-remove"
                >
                  {t2("team.management.removeMember", {
                    defaultValue: "移除成员",
                  })}
                </Button$1>
              ) : null}
              {canChangeRole || canChangeQuota ? (
                <Button$1
                  type="button"
                  size="sm"
                  disabled={!canSave || busy}
                  loading={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  data-action-ui-id="team.management-member-settings-save"
                >
                  {t2("team.management.saveSettings", {
                    defaultValue: "保存修改",
                  })}
                </Button$1>
              ) : null}
            </PageFooter>
          ) : null}
        </PageContent>
      </Page>
      <AlertDialog
        open={removeConfirmOpen}
        onOpenChange={(next2) => !removeMutation.isPending && setRemoveConfirmOpen(next2)}
      >
        <AlertDialogContent
          layer="nested"
          data-action-ui-id="team.management-member-remove-confirm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("team.management.removeMemberTitle", {
                defaultValue: "移除成员",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("team.management.removeMemberDescription", {
                defaultValue: "确认将 {{name}}（UID {{uid}}）从“{{team}}”移除？此操作不可撤销。",
                name: member.displayName,
                uid: member.userId,
                team: teamName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button$1
              type="button"
              variant="outline"
              disabled={removeMutation.isPending}
              data-action-ui-id="team.management-member-remove-confirm-cancel"
              onClick={() => setRemoveConfirmOpen(false)}
            >
              {t2("common.cancel", {
                defaultValue: "取消",
              })}
            </Button$1>
            <AlertDialogAction
              variant="destructive"
              loading={removeMutation.isPending}
              disabled={removeMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                removeMutation.mutate();
              }}
              data-action-ui-id="team.management-member-remove-confirm-action"
            >
              {t2("team.management.removeMemberConfirm", {
                defaultValue: "确认移除",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
