// team-default-quota-page.jsx
import {
  dedupedToast,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import {
  creditQueryKeys,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { formatCreditAmount } from "./team-panel-stale.jsx";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
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
    quota?.defaultMode === "LIMITED" && quota.memberLimit !== null
      ? quota.memberLimit
      : "",
  );
  const [limitTouched, setLimitTouched] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [errorReasonCode, setErrorReasonCode] = reactExports.useState(null);
  const teamRemaining = quota?.teamRemaining ?? fallbackTeamRemaining;
  const eligibleMemberCount =
    quota?.eligibleMemberCount ?? fallbackEligibleMemberCount;
  const hasEligibleMembers =
    eligibleMemberCount === null || eligibleMemberCount > 0;
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
                {teamRemaining === null
                  ? "—"
                  : formatCreditAmount(teamRemaining)}
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
                defaultValue:
                  "当前成员限额不一致，请输入本次要统一设置的额度。",
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
