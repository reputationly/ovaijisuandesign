// dissolve-team-dialog.jsx
import {
  AlertTriangle,
  dedupedToast,
  reactExports,
  useMutation,
  useQueryClient,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { isCreditTransferTarget } from "./team-panel-loading.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { useTeamAccount } from "../assets/credit-query-keys.jsx";
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
import {
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
} from "./use-team-transactions-feed-query.jsx";

let TeamScopeChangedError$2 = class TeamScopeChangedError extends Error {};

let TeamExitResultError$1 = class TeamExitResultError extends Error {
  constructor(result) {
    super(result.status);
    this.result = result;
  }
};

const DISCARD_CREDIT_DESTINATION = "DISCARD";

export function DissolveTeamDialog({
  open,
  scope,
  teamName,
  onOpenChange,
  onDissolved,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const {
    activeScope,
    exitCurrentTeam,
    snapshot: snapshot2,
  } = useTeamAccount();
  const confirmInputId = reactExports.useId();
  const destinationSelectId = reactExports.useId();
  const [confirmText, setConfirmText] = reactExports.useState("");
  const [destinationGroupId, setDestinationGroupId] = reactExports.useState(
    DISCARD_CREDIT_DESTINATION,
  );
  const [destinationSearchQuery, setDestinationSearchQuery] =
    reactExports.useState("");
  const [actionError, setActionError] = reactExports.useState(null);
  const [transferResultUnknown, setTransferResultUnknown] =
    reactExports.useState(false);
  const transferIntentRef = reactExports.useRef(null);
  const nameConfirmed = confirmText === teamName;
  const summaryQuery = useTeamCreditSummaryQuery(scope, open);
  const contextsQuery = useTeamContextsQuery(
    snapshot2?.identityKey ?? null,
    open,
  );
  const targets = reactExports.useMemo(
    () =>
      (contextsQuery.data?.items ?? []).filter((item) =>
        isCreditTransferTarget(item, scope.groupId),
      ),
    [contextsQuery.data, scope.groupId],
  );
  const destinationOptions = reactExports.useMemo(
    () => [
      {
        userId: DISCARD_CREDIT_DESTINATION,
        displayName: t2("team.management.dissolveCreditDiscard", {
          defaultValue: "不转移，放弃剩余积分",
        }),
      },
      ...targets.map((item) => ({
        userId: item.groupId,
        displayName: item.displayName,
        description: `${t2("team.management.groupId", {
          defaultValue: "Group ID",
        })} ${item.groupId} · ${t2(
          item.accountType === "PERSONAL"
            ? "team.account.personalTag"
            : "team.account.teamTag",
          {
            defaultValue: item.accountType === "PERSONAL" ? "个人" : "团队",
          },
        )}`,
      })),
    ],
    [t2, targets],
  );
  const filteredDestinationOptions = reactExports.useMemo(() => {
    const query = destinationSearchQuery.trim().toLocaleLowerCase();
    if (!query) return destinationOptions;
    return destinationOptions.filter(
      (option2) =>
        option2.displayName.toLocaleLowerCase().includes(query) ||
        option2.userId.toLocaleLowerCase().includes(query),
    );
  }, [destinationOptions, destinationSearchQuery]);
  const selectedTarget =
    destinationGroupId === DISCARD_CREDIT_DESTINATION
      ? null
      : (targets.find((item) => item.groupId === destinationGroupId) ?? null);
  const transferBalanceReady =
    selectedTarget === null || summaryQuery.data?.teamRemaining !== void 0;
  reactExports.useEffect(() => {
    if (open) {
      setConfirmText("");
      setDestinationGroupId(DISCARD_CREDIT_DESTINATION);
      setDestinationSearchQuery("");
      setActionError(null);
      setTransferResultUnknown(false);
      transferIntentRef.current = null;
    }
  }, [open, teamName]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (
        !activeScope ||
        !scope.membershipRevision ||
        !accountScopeEquals(activeScope, scope)
      ) {
        throw new TeamScopeChangedError$2();
      }
      const amount = selectedTarget ? summaryQuery.data?.teamRemaining : void 0;
      if (selectedTarget && (amount === void 0 || !/^\d+$/.test(amount))) {
        throw new TeamExitResultError$1({
          status: "rejected",
          code: "credit_balance_unavailable",
        });
      }
      const transferIntent =
        transferIntentRef.current ??
        (selectedTarget && BigInt(amount ?? "0") > 0n
          ? {
              sourceGroupId: scope.groupId,
              expectedMembershipRevision: scope.membershipRevision,
              targetGroupId: selectedTarget.groupId,
              credit: amount ?? "0",
            }
          : null);
      const result = await exitCurrentTeam({
        sourceGroupId: scope.groupId,
        expectedMembershipRevision: scope.membershipRevision,
        mode: "DISSOLVE",
        creditDisposition: transferIntent
          ? {
              mode: "TRANSFER",
              targetGroupId: transferIntent.targetGroupId,
              credit: transferIntent.credit,
            }
          : {
              mode: "DISCARD",
            },
      });
      if (
        result.status === "busy" ||
        result.status === "partial" ||
        result.status === "rejected"
      ) {
        throw new TeamExitResultError$1(result);
      }
      return result;
    },
    retry: false,
    onSuccess: () => {
      const transferredAmount =
        transferIntentRef.current?.credit ??
        (selectedTarget ? (summaryQuery.data?.teamRemaining ?? null) : null);
      const transferSuccess =
        selectedTarget && transferredAmount && BigInt(transferredAmount) > 0n
          ? {
              amount: transferredAmount,
              targetName: selectedTarget.displayName,
            }
          : null;
      setActionError(null);
      queryClient2.removeQueries({
        queryKey: teamQueryKeys.membership(scope),
      });
      void queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.contexts(scope.identityKey),
      });
      dedupedToast.success(
        t2("team.management.dissolveSucceeded", {
          defaultValue: "团队已解散。",
        }),
      );
      onOpenChange(false);
      onDissolved(transferSuccess);
    },
    onError: (error) => {
      if (error instanceof TeamScopeChangedError$2) {
        setActionError(null);
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onOpenChange(false);
        return;
      }
      if (
        error instanceof TeamExitResultError$1 &&
        error.result.status === "rejected" &&
        error.result.code === "credit_balance_unavailable"
      ) {
        const message22 = t2(
          "team.management.dissolveCreditBalanceUnavailable",
          {
            defaultValue: "团队剩余积分暂不可用。请选择“不转移”，或稍后重试。",
          },
        );
        setActionError(message22);
        return;
      }
      const transferred =
        error instanceof TeamExitResultError$1 &&
        error.result.status === "partial" &&
        error.result.phase === "CREDIT_TRANSFERRED";
      if (transferred && selectedTarget && scope.membershipRevision) {
        transferIntentRef.current = {
          sourceGroupId: scope.groupId,
          expectedMembershipRevision: scope.membershipRevision,
          targetGroupId: selectedTarget.groupId,
          credit: summaryQuery.data?.teamRemaining ?? "0",
        };
      }
      if (
        error instanceof TeamExitResultError$1 &&
        error.result.status === "partial" &&
        error.result.phase === "CREDIT_TRANSFER_UNKNOWN"
      ) {
        setTransferResultUnknown(true);
        if (selectedTarget && scope.membershipRevision) {
          transferIntentRef.current = {
            sourceGroupId: scope.groupId,
            expectedMembershipRevision: scope.membershipRevision,
            targetGroupId: selectedTarget.groupId,
            credit: summaryQuery.data?.teamRemaining ?? "0",
          };
        }
        setActionError(
          t2("team.management.dissolveTransferUnknown", {
            defaultValue:
              "积分转移结果尚未确认。为避免重复扣款，已禁止再次提交；请核对积分流水并联系支持处理。",
          }),
        );
        return;
      }
      if (
        error instanceof TeamExitResultError$1 &&
        error.result.status === "partial" &&
        error.result.phase === "EXIT_RESULT_UNKNOWN"
      ) {
        setActionError(
          t2("team.management.dissolveResultUnknown", {
            defaultValue:
              "解散结果尚未确认，已切换到个人空间并暂停原团队的新请求。成员关系刷新后再确认最终状态。",
          }),
        );
        return;
      }
      const message2 = transferred
        ? t2("team.management.dissolveFailedAfterTransfer", {
            defaultValue:
              "剩余积分已转移，但团队解散失败。请再次点击，只重试解散。",
          })
        : t2("team.management.dissolveFailed", {
            defaultValue: "团队解散失败，请稍后重试。",
          });
      setActionError(message2);
    },
  });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !mutation.isPending && onOpenChange(nextOpen)}
    >
      <AlertDialogContent
        layer="nested"
        data-action-ui-id="team.management-dissolve-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.dissolveTitle", {
              defaultValue: "解散团队",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("team.management.dissolveDescription", {
              defaultValue:
                "解散“{{name}}”后，团队及成员权限将无法恢复。请先确认剩余积分的处理方式。",
              name: teamName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div
          className="grid gap-2"
          data-action-ui-id="team.management-dissolve-transfer-section"
        >
          <Label
            htmlFor={destinationSelectId}
            className="text-muted-foreground font-normal"
          >
            {t2("team.management.dissolveCreditDestinationLabel", {
              defaultValue: "剩余积分去向",
            })}
          </Label>
          <TeamMemberCombobox
            id={destinationSelectId}
            value={destinationGroupId}
            onValueChange={(value) => {
              setDestinationGroupId(value);
              setActionError(null);
            }}
            options={filteredDestinationOptions}
            searchQuery={destinationSearchQuery}
            onSearchChange={setDestinationSearchQuery}
            disabled={mutation.isPending || transferIntentRef.current !== null}
            selectedLabelMode="name"
            placeholder={t2(
              "team.management.dissolveCreditDestinationPlaceholder",
              {
                defaultValue: "请选择剩余积分去向",
              },
            )}
            searchPlaceholder={t2(
              "team.management.dissolveCreditDestinationSearchPlaceholder",
              {
                defaultValue: "搜索团队名称或 Group ID",
              },
            )}
            emptyText={t2(
              "team.management.dissolveCreditDestinationSearchEmpty",
              {
                defaultValue: "没有匹配的账号，请调整搜索条件。",
              },
            )}
            data-action-ui-id="team.management-dissolve-credit-destination"
          />
          <p className="text-xs text-muted-foreground">
            {selectedTarget
              ? transferBalanceReady
                ? t2("team.management.dissolveCreditTransferDescription", {
                    defaultValue:
                      "确认解散后，团队剩余积分将全部转移至“{{target}}”。",
                    target: selectedTarget.displayName,
                  })
                : t2("team.management.dissolveCreditBalanceUnavailable", {
                    defaultValue:
                      "团队剩余积分暂不可用。请选择“不转移”，或稍后重试。",
                  })
              : t2("team.management.dissolveCreditDiscardDescription", {
                  defaultValue:
                    "未选择转入账号时，团队剩余积分将在解散后失效，且无法恢复。",
                })}
          </p>
        </div>
        <div className="grid gap-2">
          <Label
            htmlFor={confirmInputId}
            className="text-muted-foreground font-normal"
          >
            {t2("team.management.dissolveConfirmPrompt", {
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
            autoFocus={true}
            disabled={mutation.isPending || transferResultUnknown}
            data-action-ui-id="team.management-dissolve-confirm-input"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                nameConfirmed &&
                !mutation.isPending &&
                !transferResultUnknown &&
                transferBalanceReady
              ) {
                event.preventDefault();
                mutation.mutate();
              }
            }}
          />
          {actionError ? (
            <div
              role="alert"
              className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
              data-action-ui-id="team.management-dissolve-error"
            >
              <p className="flex gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {actionError}
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={mutation.isPending}
            disabled={
              !nameConfirmed ||
              mutation.isPending ||
              transferResultUnknown ||
              !transferBalanceReady
            }
            onClick={(event) => {
              event.preventDefault();
              if (
                !nameConfirmed ||
                mutation.isPending ||
                transferResultUnknown ||
                !transferBalanceReady
              ) {
                return;
              }
              mutation.mutate();
            }}
            data-action-ui-id="team.management-dissolve-confirm"
          >
            {t2("team.management.dissolveConfirm", {
              defaultValue: "确认解散",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
