// team-member-settings-page.jsx
import {
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  creditQueryKeys,
  Select$1,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { AlertDialog, Button$1 } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { formatCreditAmount } from "./team-panel-stale.jsx";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
  isUpstreamContractFailure,
  TeamHelpTip,
  teamMutationReasonCode,
} from "./team-management-detail-loading.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageFooter,
  PageHeader,
  PageTitle,
} from "./page-content.jsx";
import { teamApi } from "./team-api.js";
import { accountScopeEquals } from "./account-scope-equals.js";

function assignableRolesForTarget(targetRole, canChangeRole) {
  if (!canChangeRole) return [];
  if (targetRole === "OWNER") return [];
  return ["MEMBER", "ADMIN"];
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
  const canChangeQuota =
    quotaMutationEnabled && member.permissions.changeQuota.allowed;
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
  const [removeConfirmOpen, setRemoveConfirmOpen] =
    reactExports.useState(false);
  const [actionError, setActionError] = reactExports.useState(null);
  const [actionErrorReasonCode, setActionErrorReasonCode] =
    reactExports.useState(null);
  const clearActionError = () => {
    setActionError(null);
    setActionErrorReasonCode(null);
  };
  reactExports.useEffect(() => {
    setRole(
      member.role === "MEMBER" || member.role === "ADMIN" ? member.role : null,
    );
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
      const failedResult = results.find(
        (result) => result.status === "rejected",
      );
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
  const formattedQuotaUsed =
    quotaUsed === null ? "—" : formatCreditAmount(quotaUsed);
  const previewQuotaLimit = validLimit ? normalizedLimit : null;
  const formattedPreviewQuotaLimit =
    previewQuotaLimit === null ? "—" : formatCreditAmount(previewQuotaLimit);
  const showQuotaInformation =
    canChangeQuota || member.quota.mode === "LIMITED";
  const busy = saveMutation.isPending || removeMutation.isPending;
  return (
    <>
      <Page
        open={true}
        onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()}
      >
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
                <p className="truncate text-sm font-medium text-foreground">
                  {member.displayName}
                </p>
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
                                    defaultValue:
                                      "可分配成员积分，并查看成员消耗明细。",
                                  })
                                : t2("team.management.memberRoleDescription", {
                                    defaultValue:
                                      "可使用团队积分，不能管理其他成员。",
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
                        content={t2(
                          "team.management.addQuotaLimitHelpContent",
                          {
                            defaultValue:
                              "该限额用于限制成员在当前团队中可使用的积分。保存后生效，成员后续消耗不能超过此上限。",
                          },
                        )}
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
                        <label
                          htmlFor="team-member-settings-quota"
                          className="sr-only"
                        >
                          {t2("team.management.addQuotaLimit", {
                            defaultValue: "添加限额",
                          })}
                        </label>
                        <Input3
                          id="team-member-settings-quota"
                          value={limit ?? ""}
                          inputMode="numeric"
                          disabled={busy}
                          placeholder={t2(
                            "team.management.addQuotaLimitPlaceholder",
                            {
                              defaultValue: "输入额度上限",
                            },
                          )}
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
        onOpenChange={(next2) =>
          !removeMutation.isPending && setRemoveConfirmOpen(next2)
        }
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
                defaultValue:
                  "确认将 {{name}}（UID {{uid}}）从“{{team}}”移除？此操作不可撤销。",
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
