// transfer-credit-form.jsx
import { AlertTriangle, dispatchAccountSubmissionBlocked, reactExports, useMutation, useQueryClient, useTranslation } from "../vendor.js";
import { dedupedToast, guardAccountSubmission } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  creditQueryKeys,
  Select,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { Button } from "../infra/dialog-content.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { formatCreditAmount, getTeamReasonText } from "./team-panel-stale.jsx";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
} from "./team-management-detail-loading.jsx";
import { isCreditTransferTarget } from "./team-panel-loading.jsx";
import { Label } from "./use-wallet-query.jsx";
import { Alert, AlertDescription } from "./alert-variants.jsx";
import { accountScopeEquals } from "./account-scope-equals.js";
import { useTeamContextsQuery } from "./use-team-transactions-feed-query.jsx";
const INTEGER_RE = /^\d+$/;
const MAX_SAFE_TRANSFER_CREDIT = BigInt(Number.MAX_SAFE_INTEGER);
function validateTransferAmount(raw2, teamRemaining) {
  const value = raw2.trim();
  if (value.length === 0) return "empty";
  if (!INTEGER_RE.test(value)) return "not_integer";
  let amount;
  try {
    amount = BigInt(value);
  } catch {
    return "not_integer";
  }
  if (amount <= 0n) return "not_positive";
  if (teamRemaining !== null) {
    try {
      if (amount > BigInt(teamRemaining)) return "exceeds_balance";
    } catch {}
  }
  if (amount > MAX_SAFE_TRANSFER_CREDIT) return "exceeds_safe_integer";
  return null;
}
class TeamScopeChangedError3 extends Error {}
class TeamCreditTransferResultUnknownError extends Error {
  constructor(intent) {
    super("team_credit_transfer_result_unknown");
    this.intent = intent;
  }
}
class TeamCreditTransferRejectedError extends Error {
  constructor(code2) {
    super(code2);
    this.code = code2;
  }
}
export function TransferCreditForm({
  active: active2,
  scope,
  teamRemaining,
  disabled: disabled2 = false,
  autoFocus = false,
  submitLabel,
  targetPlaceholder,
  onCancel,
  onPendingChange,
  onTransferred,
  onScopeChanged,
  selectPortalContainer,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const {
    acknowledgeCreditTransfer,
    activeScope,
    snapshot: snapshot2,
    transferCredits,
  } = useTeamAccount();
  const amountInputId = reactExports.useId();
  const targetSelectId = reactExports.useId();
  const [targetGroupId, setTargetGroupId] = reactExports.useState("");
  const [amountText, setAmountText] = reactExports.useState("");
  const [actionError, setActionError] = reactExports.useState(null);
  const [unknownIntent, setUnknownIntent] = reactExports.useState(null);
  const contextsQuery = useTeamContextsQuery(
    snapshot2?.identityKey ?? null,
    active2,
  );
  const targets = reactExports.useMemo(
    () =>
      (contextsQuery.data?.items ?? []).filter((item) =>
        isCreditTransferTarget(item, scope.groupId),
      ),
    [contextsQuery.data, scope.groupId],
  );
  reactExports.useEffect(() => {
    if (active2) {
      setTargetGroupId("");
      setAmountText("");
      setActionError(null);
      setUnknownIntent(null);
    }
  }, [active2]);
  const amountIssue = validateTransferAmount(amountText, teamRemaining);
  const amountError =
    amountText.trim().length === 0
      ? null
      : amountIssue === "not_integer" ||
          amountIssue === "not_positive" ||
          amountIssue === "exceeds_safe_integer"
        ? t2("team.transferCredit.amountInvalid", {
            defaultValue: "请输入大于 0 的整数积分。",
          })
        : amountIssue === "exceeds_balance"
          ? t2("team.transferCredit.amountExceedsBalance", {
              defaultValue: "超出团队可用积分。",
            })
          : null;
  const mutation = useMutation({
    mutationFn: async () => {
      if (
        !activeScope ||
        !scope.membershipRevision ||
        !accountScopeEquals(activeScope, scope)
      ) {
        throw new TeamScopeChangedError3();
      }
      const decision = guardAccountSubmission("team_credit_transfer");
      if (!decision.allowed) throw new TeamScopeChangedError3();
      if (
        decision.mode !== "CANONICAL" ||
        !accountScopeEquals(decision.scope, scope)
      ) {
        dispatchAccountSubmissionBlocked({
          kind: "team_credit_transfer",
          reasonCode: "account_scope_changed",
        });
        throw new TeamScopeChangedError3();
      }
      const amount = amountText.trim();
      const intent = {
        sourceGroupId: scope.groupId,
        expectedMembershipRevision: scope.membershipRevision,
        targetGroupId,
        credit: amount,
      };
      const result = await transferCredits(intent);
      if (result.status === "unknown") {
        throw new TeamCreditTransferResultUnknownError(intent);
      }
      if (result.status === "busy") {
        throw new TeamCreditTransferRejectedError("team_switch_blocked");
      }
      if (result.status === "rejected") {
        throw new TeamCreditTransferRejectedError(result.code);
      }
      return {
        receipt: result.receipt,
        intent,
      };
    },
    // 资金写操作只由用户点击发起，不做客户端自动重试。
    retry: false,
    onSuccess: ({ receipt, intent }) => {
      setActionError(null);
      setUnknownIntent(null);
      const targetName =
        targets.find((item) => item.groupId === targetGroupId)?.displayName ??
        targetGroupId;
      dedupedToast.success(
        t2("team.transferCredit.succeeded", {
          defaultValue: "已转移 {{amount}} 积分到「{{target}}」。",
          amount: formatCreditAmount(receipt.transferredCredit),
          target: targetName,
        }),
      );
      void acknowledgeCreditTransfer({
        ...intent,
      }).catch(() => {});
      void queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.membership(scope),
      });
      void queryClient2.invalidateQueries({
        queryKey: creditQueryKeys.scope(scope),
      });
      void queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.contexts(scope.identityKey),
      });
      setTargetGroupId("");
      setAmountText("");
      onTransferred?.();
    },
    onError: (error) => {
      if (error instanceof TeamScopeChangedError3) {
        setActionError(null);
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onScopeChanged?.();
        return;
      }
      if (error instanceof TeamCreditTransferResultUnknownError) {
        setUnknownIntent(error.intent);
        setActionError(
          t2("team.transferCredit.resultUnknown", {
            defaultValue:
              "转移结果尚未确认。为避免重复扣款，已禁止再次提交；请核对积分流水并联系支持处理。",
          }),
        );
        return;
      }
      const detail = describeTeamMutationError(error);
      const suffix = formatTeamMutationErrorSuffix(detail);
      const primary = t2("team.transferCredit.failed", {
        defaultValue: "积分转移失败，请稍后重试。",
      });
      const message2 = suffix ? `${primary}（${suffix}）` : primary;
      setActionError(message2);
    },
  });
  reactExports.useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);
  const targetsUnavailable = contextsQuery.isSuccess && targets.length === 0;
  const canSubmit =
    !disabled2 &&
    !mutation.isPending &&
    unknownIntent === null &&
    targetGroupId.length > 0 &&
    amountIssue === null &&
    !targetsUnavailable;
  return (
    <div className="grid gap-4" data-action-ui-id="team.transfer-credit-form">
      <div className="grid gap-2">
        <Label
          htmlFor={targetSelectId}
          className="text-muted-foreground font-normal"
        >
          {t2("team.transferCredit.targetLabel", {
            defaultValue: "转入账号",
          })}
        </Label>
        <Select
          value={targetGroupId}
          onValueChange={(value) => {
            setTargetGroupId(value ?? "");
            setActionError(null);
          }}
          disabled={
            disabled2 ||
            mutation.isPending ||
            unknownIntent !== null ||
            targets.length === 0
          }
        >
          <SelectTrigger
            id={targetSelectId}
            className="w-full"
            data-action-ui-id="team.transfer-credit-target"
          >
            <SelectValue
              placeholder={
                targetPlaceholder ??
                t2("team.transferCredit.targetPlaceholder", {
                  defaultValue: "选择转入账号",
                })
              }
            />
          </SelectTrigger>
          <SelectContent
            portalContainer={selectPortalContainer}
            positionerClassName={selectPortalContainer ? "z-[70]" : void 0}
          >
            {targets.map((item) => (
              <SelectItem key={item.groupId} value={item.groupId}>
                <span className="flex min-w-0 items-baseline gap-1">
                  <span className="truncate">{item.displayName}</span>
                  <span className="shrink-0 text-muted-foreground">/</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {item.groupId}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {targetsUnavailable ? (
          <p className="text-xs text-muted-foreground">
            {t2("team.transferCredit.noTarget", {
              defaultValue: "当前没有其他可转入的团队或个人空间。",
            })}
          </p>
        ) : null}
        {contextsQuery.isError ? (
          <p className="text-xs text-muted-foreground">
            {getTeamReasonText(t2, "temporarily_unavailable")}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label
          htmlFor={amountInputId}
          className="text-muted-foreground font-normal"
        >
          {teamRemaining === null
            ? t2("team.transferCredit.amountLabel", {
                defaultValue: "转移数量",
              })
            : t2("team.transferCredit.amountLabelWithBalance", {
                defaultValue: "转移数量（团队可用 {{balance}}）",
                balance: formatCreditAmount(teamRemaining),
              })}
        </Label>
        <Input3
          id={amountInputId}
          value={amountText}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled2 || mutation.isPending || unknownIntent !== null}
          onChange={(event) => {
            setAmountText(event.target.value);
            setActionError(null);
          }}
          data-action-ui-id="team.transfer-credit-amount"
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSubmit) {
              event.preventDefault();
              mutation.mutate();
            }
          }}
        />
        {amountError ? (
          <p
            className="text-xs text-destructive"
            data-action-ui-id="team.transfer-credit-amount-error"
          >
            {amountError}
          </p>
        ) : null}
      </div>
      {actionError ? (
        <Alert data-action-ui-id="team.transfer-credit-error">
          <AlertTriangle aria-hidden={true} />
          <AlertDescription className="whitespace-pre-wrap break-words text-foreground">
            {actionError}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={onCancel}
          >
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </Button>
        ) : null}
        <Button
          type="button"
          loading={mutation.isPending}
          disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit) return;
            mutation.mutate();
          }}
          data-action-ui-id="team.transfer-credit-confirm"
        >
          {submitLabel ??
            t2("team.transferCredit.confirm", {
              defaultValue: "确认转移",
            })}
        </Button>
      </div>
    </div>
  );
}
