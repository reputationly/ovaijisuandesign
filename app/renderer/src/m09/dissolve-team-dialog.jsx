// dissolve-team-dialog.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  X$7,
  AlertTriangle,
  teamQueryKeys,
  useTeamAccount,
  useQueryClient,
  useMutation,
} from "../vendor.js";
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
  Badge,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TeamPanelStale } from "./account-switcher-view.jsx";
import { TeamPanelEmpty } from "./batch-remove-members-dialog.jsx";
import { InfiniteScrollContainer, Label, Skeleton } from "./infinite-scroll-container.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageFooter,
  PageHeader,
  PageTitle,
  PastTeamMembersPanel,
} from "./past-team-members-panel.jsx";
import { teamApi } from "./team-api.js";
import { TeamPanelError } from "./team-credit-page.jsx";
import { TeamMemberCombobox } from "./team-credit-summary-surface.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
import { SegmentedSwitch } from "./use-credit-details.jsx";
import {
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
} from "./use-team-transactions-feed-query.jsx";
export function isCreditTransferTarget(item, sourceGroupId) {
  if (item.lifecycle !== "ACTIVE" || item.groupId === sourceGroupId) return false;
  return item.accountType === "PERSONAL" || item.role === "OWNER";
}
let TeamScopeChangedError$2 = class TeamScopeChangedError extends Error {};
let TeamExitResultError$1 = class TeamExitResultError extends Error {
  constructor(result) {
    super(result.status);
    this.result = result;
  }
};
const DISCARD_CREDIT_DESTINATION = "DISCARD";
export function DissolveTeamDialog({ open, scope, teamName, onOpenChange, onDissolved }) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope, exitCurrentTeam, snapshot: snapshot2 } = useTeamAccount();
  const confirmInputId = reactExports.useId();
  const destinationSelectId = reactExports.useId();
  const [confirmText, setConfirmText] = reactExports.useState("");
  const [destinationGroupId, setDestinationGroupId] = reactExports.useState(
    DISCARD_CREDIT_DESTINATION,
  );
  const [destinationSearchQuery, setDestinationSearchQuery] = reactExports.useState("");
  const [actionError, setActionError] = reactExports.useState(null);
  const [transferResultUnknown, setTransferResultUnknown] = reactExports.useState(false);
  const transferIntentRef = reactExports.useRef(null);
  const nameConfirmed = confirmText === teamName;
  const summaryQuery = useTeamCreditSummaryQuery(scope, open);
  const contextsQuery = useTeamContextsQuery(snapshot2?.identityKey ?? null, open);
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
          item.accountType === "PERSONAL" ? "team.account.personalTag" : "team.account.teamTag",
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
      if (!activeScope || !scope.membershipRevision || !accountScopeEquals(activeScope, scope)) {
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
      if (result.status === "busy" || result.status === "partial" || result.status === "rejected") {
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
        const message22 = t2("team.management.dissolveCreditBalanceUnavailable", {
          defaultValue: "团队剩余积分暂不可用。请选择“不转移”，或稍后重试。",
        });
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
            defaultValue: "剩余积分已转移，但团队解散失败。请再次点击，只重试解散。",
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
      <AlertDialogContent layer="nested" data-action-ui-id="team.management-dissolve-dialog">
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
        <div className="grid gap-2" data-action-ui-id="team.management-dissolve-transfer-section">
          <Label htmlFor={destinationSelectId} className="text-muted-foreground font-normal">
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
            placeholder={t2("team.management.dissolveCreditDestinationPlaceholder", {
              defaultValue: "请选择剩余积分去向",
            })}
            searchPlaceholder={t2("team.management.dissolveCreditDestinationSearchPlaceholder", {
              defaultValue: "搜索团队名称或 Group ID",
            })}
            emptyText={t2("team.management.dissolveCreditDestinationSearchEmpty", {
              defaultValue: "没有匹配的账号，请调整搜索条件。",
            })}
            data-action-ui-id="team.management-dissolve-credit-destination"
          />
          <p className="text-xs text-muted-foreground">
            {selectedTarget
              ? transferBalanceReady
                ? t2("team.management.dissolveCreditTransferDescription", {
                    defaultValue: "确认解散后，团队剩余积分将全部转移至“{{target}}”。",
                    target: selectedTarget.displayName,
                  })
                : t2("team.management.dissolveCreditBalanceUnavailable", {
                    defaultValue: "团队剩余积分暂不可用。请选择“不转移”，或稍后重试。",
                  })
              : t2("team.management.dissolveCreditDiscardDescription", {
                  defaultValue: "未选择转入账号时，团队剩余积分将在解散后失效，且无法恢复。",
                })}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={confirmInputId} className="text-muted-foreground font-normal">
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
              !nameConfirmed || mutation.isPending || transferResultUnknown || !transferBalanceReady
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
export function TeamPanelLoading({ rows = 3 }) {
  const { t: t2 } = useTranslation();
  const rowIds = ["first", "second", "third", "fourth", "fifth"].slice(0, rows);
  return (
    <div
      role="status"
      className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-popover"
      aria-busy="true"
      data-action-ui-id="team.panel-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      {rowIds.map((rowId) => (
        <div key={rowId} className="flex min-h-16 items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3 rounded-sm" />
            <Skeleton className="h-2.5 w-2/3 rounded-sm" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
export function InviteLinkHistoryPage({
  open,
  teamName,
  items,
  isPending,
  isError,
  isStale: isStale2,
  isLoadingMore,
  loadMoreError,
  loadedBatchCount,
  hasMore,
  onOpenChange,
  onRetry,
  onLoadMore,
}) {
  const { t: t2 } = useTranslation();
  return (
    <Page open={open} onOpenChange={onOpenChange}>
      <PageContent data-action-ui-id="team.invite-link-history-dialog">
        <PageHeader>
          <PageTitle>
            {t2("team.management.inviteRecordsForTeam", {
              defaultValue: "邀请记录 - {{name}}",
              name: teamName,
            })}
          </PageTitle>
          <PageDescription>
            {t2("team.management.inviteLinksDescription", {
              defaultValue: "查看仍有效或已失效的团队邀请链接。",
            })}
          </PageDescription>
        </PageHeader>
        <p
          className="text-xs text-muted-foreground"
          data-action-ui-id="team.invite-link-history-no-revoke"
        >
          {t2("team.management.inviteLinksNoRevokeOrCopy", {
            defaultValue:
              "历史记录仅展示脱敏链接，不支持复制完整链接或撤销。完整链接仅在创建成功时可复制一次。",
          })}
        </p>
        <div className="min-h-32">
          {isPending ? <TeamPanelLoading rows={3} /> : null}
          {isError && items.length === 0 ? (
            <TeamPanelError
              title={t2("team.management.inviteLinksLoadFailed", {
                defaultValue: "邀请链接加载失败",
              })}
              onRetry={onRetry}
            />
          ) : null}
          {isStale2 ? <TeamPanelStale onRetry={onRetry} /> : null}
          {!isPending && !isError && items.length === 0 ? (
            <TeamPanelEmpty
              title={t2("team.management.noInviteLinks", {
                defaultValue: "暂无邀请链接记录",
              })}
            />
          ) : null}
          {items.length > 0 ? (
            <InfiniteScrollContainer
              className="max-h-80"
              loadedBatchCount={loadedBatchCount}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              loadMoreError={loadMoreError}
              onLoadMore={onLoadMore}
              actionUiId="team.management-invite-links-scroll"
            >
              <div className="divide-y divide-border border-y border-border">
                {items.map((link2) => (
                  <div key={link2.inviteLinkId} className="flex items-center gap-3 py-3 text-xs">
                    <Badge variant="secondary" className="shrink-0">
                      {t2(`team.role.${link2.role.toLowerCase()}`, {
                        defaultValue: link2.role,
                      })}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{link2.maskedUrl}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t2("team.management.inviteLinkExpiryAndUsage", {
                          defaultValue: "有效期至 {{date}} · 已使用 {{used}} / {{limit}}",
                          date: new Date(link2.expiresAtMs).toLocaleString(),
                          used: link2.usedCount,
                          limit: link2.usageLimit,
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        link2.status === "ACTIVE"
                          ? "bg-success/10 text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {t2(`team.inviteLinkStatus.${link2.status.toLowerCase()}`, {
                        defaultValue: link2.status,
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
            </InfiniteScrollContainer>
          ) : null}
        </div>
      </PageContent>
    </Page>
  );
}
const MAX_TEAM_INVITES = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseInviteEmails(value) {
  const candidates2 = value
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean);
  if (candidates2.length === 0)
    return {
      ok: false,
      reason: "EMPTY",
      count: 0,
    };
  const invalidEmails = candidates2.filter((email) => !EMAIL_PATTERN.test(email));
  if (invalidEmails.length > 0)
    return {
      ok: false,
      reason: "INVALID",
      invalidEmails,
    };
  const emails = [...new Set(candidates2.map((email) => email.toLowerCase()))];
  if (emails.length > MAX_TEAM_INVITES) {
    return {
      ok: false,
      reason: "TOO_MANY",
      count: emails.length,
    };
  }
  return {
    ok: true,
    emails,
  };
}
function mergeInviteEmails(existingEmails, value) {
  const parsed = parseInviteEmails(value);
  if (!parsed.ok) return parsed;
  const emails = [
    ...new Set([...existingEmails.map((email) => email.toLowerCase()), ...parsed.emails]),
  ];
  if (emails.length > MAX_TEAM_INVITES) {
    return {
      ok: false,
      reason: "TOO_MANY",
      count: emails.length,
    };
  }
  return {
    ok: true,
    emails,
  };
}
function inviteResultBadgeVariant(status) {
  if (status === "PENDING") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "ACCEPTED") return "secondary";
  return "warning";
}
export function InviteMembersPage({ open, scope, onOpenChange, onInvited }) {
  const { t: t2 } = useTranslation();
  const [emails, setEmails] = reactExports.useState([]);
  const [emailText, setEmailText] = reactExports.useState("");
  const [quotaLimit, setQuotaLimit] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [result, setResult] = reactExports.useState(null);
  const [tab2, setTab] = reactExports.useState("email");
  const [pastTabMounted, setPastTabMounted] = reactExports.useState(false);
  const showEmailTab = tab2 === "email" || result !== null;
  const quotaLimitValue = reactExports.useMemo(() => {
    const trimmed = quotaLimit.trim();
    if (trimmed === "")
      return {
        valid: true,
        value: void 0,
      };
    if (!/^(0|[1-9]\d*)$/.test(trimmed) || Number(trimmed) > 9007199254740991) {
      return {
        valid: false,
        value: void 0,
      };
    }
    return {
      valid: true,
      value: trimmed,
    };
  }, [quotaLimit]);
  const statusLabels = {
    PENDING: t2("team.inviteMembers.status.pending", {
      defaultValue: "Invitation sent",
    }),
    FAILED: t2("team.inviteMembers.status.failed", {
      defaultValue: "Failed",
    }),
    ACCEPTED: t2("team.inviteMembers.status.accepted", {
      defaultValue: "Already a member",
    }),
    UNKNOWN: t2("team.inviteMembers.status.unknown", {
      defaultValue: "Unknown",
    }),
  };
  const reset2 = () => {
    setEmails([]);
    setEmailText("");
    setQuotaLimit("");
    setSubmitting(false);
    setResult(null);
    setTab("email");
    setPastTabMounted(false);
  };
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) reset2();
    onOpenChange(nextOpen);
  };
  const showParseError = (parsed) => {
    if (parsed.reason === "EMPTY") {
      dedupedToast.error(
        t2("team.inviteMembers.emptyError", {
          defaultValue: "Enter at least one email address.",
        }),
      );
    } else if (parsed.reason === "TOO_MANY") {
      dedupedToast.error(
        t2("team.inviteMembers.tooManyError", {
          defaultValue: "You can invite up to {{count}} members at a time.",
          count: MAX_TEAM_INVITES,
        }),
      );
    } else {
      dedupedToast.error(
        t2("team.inviteMembers.invalidError", {
          defaultValue: "Invalid email address: {{emails}}",
          emails: parsed.invalidEmails.slice(0, 3).join(", "),
        }),
      );
    }
  };
  const commitEmailText = (value) => {
    if (!value.trim()) return false;
    const parsed = mergeInviteEmails(emails, value);
    if (!parsed.ok) {
      showParseError(parsed);
      return false;
    }
    setEmails(parsed.emails);
    setEmailText("");
    return true;
  };
  const handleEmailKeyDown = (event) => {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      commitEmailText(emailText);
      return;
    }
    if (event.key === "Backspace" && !emailText && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };
  const handleEmailPaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    if (!/[,;\n]/.test(pastedText)) return;
    event.preventDefault();
    commitEmailText([emailText, pastedText].filter(Boolean).join(","));
  };
  const handleRemoveEmail = (email) => {
    setEmails(emails.filter((item) => item !== email));
  };
  const handleInvite = async () => {
    const parsed = emailText.trim()
      ? mergeInviteEmails(emails, emailText)
      : emails.length > 0
        ? {
            ok: true,
            emails,
          }
        : parseInviteEmails("");
    if (!parsed.ok) {
      showParseError(parsed);
      return;
    }
    if (!quotaLimitValue.valid) return;
    setSubmitting(true);
    try {
      const nextResult =
        quotaLimitValue.value === void 0
          ? await teamApi.inviteMembers(scope.groupId, parsed.emails)
          : await teamApi.inviteMembers(scope.groupId, parsed.emails, {
              quotaLimit: quotaLimitValue.value,
            });
      setResult(nextResult);
      const retryEmails = nextResult.results
        .filter((item) => item.status === "FAILED" || item.status === "UNKNOWN")
        .map((item) => item.email);
      setEmails(retryEmails);
      setEmailText("");
      if (nextResult.successCount > 0) {
        dedupedToast.success(
          t2("team.inviteMembers.success", {
            defaultValue: "Invitations sent.",
          }),
        );
        onInvited();
      } else {
        dedupedToast.error(
          t2("team.inviteMembers.noneSent", {
            defaultValue: "No invitations were sent.",
          }),
        );
      }
    } catch {
      dedupedToast.error(
        t2("team.inviteMembers.sendFailed", {
          defaultValue: "Failed to send invitations.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleRetryFailed = () => {
    if (!result) return;
    const retryEmails = result.results
      .filter((item) => item.status === "FAILED" || item.status === "UNKNOWN")
      .map((item) => item.email);
    setEmails(retryEmails);
    setEmailText("");
    setResult(null);
  };
  return (
    <Page open={open} onOpenChange={handleOpenChange}>
      <PageContent
        className="flex min-w-0 max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.invite-members-dialog"
      >
        <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
          <PageTitle>
            {t2("team.inviteMembers.title", {
              defaultValue: "Invite members",
            })}
          </PageTitle>
          {!result && tab2 === "email" ? (
            <PageDescription>
              {t2("team.inviteMembers.description", {
                defaultValue:
                  "Enter up to {{count}} email addresses. Press Enter to confirm one, then continue with the next.",
                count: MAX_TEAM_INVITES,
              })}
            </PageDescription>
          ) : null}
        </PageHeader>
        {!result ? (
          <div className="shrink-0 px-4 pt-3 sm:px-6">
            <SegmentedSwitch
              variant="label"
              stretch={true}
              value={tab2}
              onValueChange={(next2) => {
                setTab(next2);
                if (next2 === "past-teams") setPastTabMounted(true);
              }}
              ariaLabel={t2("team.inviteMembers.title", {
                defaultValue: "Invite members",
              })}
              dataActionUiId="team.invite-tab-switch"
              options={[
                {
                  value: "email",
                  label: t2("team.inviteMembers.tabEmail", {
                    defaultValue: "Invite by email",
                  }),
                  dataActionUiId: "team.invite-tab-email",
                },
                {
                  value: "past-teams",
                  label: t2("team.pastTeams.tabPast", {
                    defaultValue: "Add from past teams",
                  }),
                  dataActionUiId: "team.invite-tab-past-teams",
                },
              ]}
            />
          </div>
        ) : null}
        <div
          className={cn$2(
            "min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6",
            !showEmailTab && "hidden",
          )}
        >
          {result ? (
            <div className="space-y-3" data-action-ui-id="team.invite-members-results">
              <p className="text-xs text-muted-foreground">
                {t2("team.inviteMembers.summary", {
                  defaultValue: "{{success}} sent, {{failed}} failed",
                  success: result.successCount,
                  failed: result.failedCount,
                })}
              </p>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {result.results.map((item) => (
                  <div
                    key={item.email}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{item.email}</p>
                      {item.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">{item.errorMessage}</p>
                      ) : null}
                    </div>
                    <Badge variant={inviteResultBadgeVariant(item.status)}>
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:border-foreground focus-within:ring-0">
                  {emails.map((email) => (
                    <Badge key={email} variant="success" className="h-7 max-w-full gap-1 pl-2 pr-1">
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current opacity-70 hover:bg-background/20 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label={t2("team.inviteMembers.removeEmail", {
                          defaultValue: "Remove {{email}}",
                          email,
                        })}
                        onClick={() => handleRemoveEmail(email)}
                      >
                        <X$7 className="size-3.5" aria-hidden={true} />
                      </button>
                    </Badge>
                  ))}
                  <Input3
                    value={emailText}
                    onChange={(event) => setEmailText(event.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    onPaste={handleEmailPaste}
                    placeholder={
                      emails.length > 0
                        ? t2("team.inviteMembers.continuePlaceholder", {
                            defaultValue: "Enter another email and press Enter",
                          })
                        : t2("team.inviteMembers.placeholder", {
                            defaultValue: "name@example.com",
                          })
                    }
                    aria-label={t2("team.inviteMembers.emailInput", {
                      defaultValue: "Member email addresses",
                    })}
                    className="h-7 min-w-52 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    data-action-ui-id="team.invite-members-email-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t2("team.inviteMembers.helper", {
                    defaultValue:
                      "Press Enter to confirm each email. You can also paste multiple addresses separated by commas, semicolons, or new lines.",
                  })}
                </p>
              </div>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  {t2("team.inviteLink.quotaLimit", {
                    defaultValue: "Credit quota",
                  })}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {t2("common.optional", {
                      defaultValue: "Optional",
                    })}
                  </span>
                </h3>
                <Input3
                  type="text"
                  inputMode="numeric"
                  value={quotaLimit}
                  placeholder={t2("team.inviteLink.quotaLimitPlaceholder", {
                    defaultValue: "Leave empty for no credit limit",
                  })}
                  aria-invalid={!quotaLimitValue.valid}
                  onChange={(event) => setQuotaLimit(event.target.value)}
                  aria-label={t2("team.inviteLink.quotaLimit", {
                    defaultValue: "Credit quota",
                  })}
                  data-action-ui-id="team.invite-members-quota"
                />
                <p className="text-xs text-muted-foreground">
                  {t2("team.inviteMembers.quotaNote", {
                    defaultValue: "Invited members will automatically receive this credit limit.",
                  })}
                </p>
              </section>
            </>
          )}
        </div>
        {pastTabMounted ? (
          <div className={cn$2("flex min-h-0 min-w-0 flex-1 flex-col", showEmailTab && "hidden")}>
            <PastTeamMembersPanel scope={scope} active={open && !showEmailTab} />
          </div>
        ) : null}
        <PageFooter
          className={cn$2(
            "shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6",
            !showEmailTab && "hidden",
          )}
        >
          {result ? (
            <>
              {result.failedCount > 0 ||
              result.results.some(
                (item) => item.status === "FAILED" || item.status === "UNKNOWN",
              ) ? (
                <Button$1
                  type="button"
                  variant="outline"
                  onClick={handleRetryFailed}
                  data-action-ui-id="team.invite-members-retry-failed"
                >
                  {t2("team.inviteMembers.retryFailed", {
                    defaultValue: "修正失败项并重试",
                  })}
                </Button$1>
              ) : null}
              <Button$1
                type="button"
                onClick={() => handleOpenChange(false)}
                data-action-ui-id="team.invite-members-done"
              >
                {t2("common.done", {
                  defaultValue: "Done",
                })}
              </Button$1>
            </>
          ) : (
            <>
              <Button$1 type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t2("common.cancel", {
                  defaultValue: "Cancel",
                })}
              </Button$1>
              <Button$1
                type="button"
                loading={submitting}
                disabled={
                  (emails.length === 0 && emailText.trim().length === 0) || !quotaLimitValue.valid
                }
                onClick={() => void handleInvite()}
                data-action-ui-id="team.invite-members-submit"
              >
                {t2("team.inviteMembers.send", {
                  defaultValue: "Send invitations",
                })}
              </Button$1>
            </>
          )}
        </PageFooter>
      </PageContent>
    </Page>
  );
}
