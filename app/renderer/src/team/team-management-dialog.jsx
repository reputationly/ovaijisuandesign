// team-management-dialog.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, usePlatform, AlertTriangle, getRuntimeConfig, Plus, ArrowLeftRight, useQueryClient, useMutation, guardAccountSubmission, useStorage, Trans, Search, minCreditAmount, Copy, dispatchAccountSubmissionBlocked, CreditCard } from "../vendor.js";
import { Select$1, teamQueryKeys, creditQueryKeys, useTeamAccount, useIsScrolling, useAccountSubmissionDecision } from "../assets/apply-asset-change.jsx";
import { openExternalUrl, Tooltip, TooltipTrigger, Icon, TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { Users, ReceiptText } from "../media-editing/parse-item.jsx";
import { useMediaModels } from "../generation/use-resizable-width.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button$1,
  TooltipContent,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Checkbox,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { getUserProtocolUrl, getTeamInvoiceUrl } from "../workspace/shortcut-categories.jsx";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input3,
} from "../infra/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  TeamPanelStale,
  TeamUnavailableAction,
  formatCreditAmount,
  getTeamReasonText,
} from "./account-switcher-view.jsx";
import {
  BatchRemoveMembersDialog,
  TeamHelpTip,
  TeamManagementDetailLoading,
  TeamManagementMemberLoading,
  TeamManagementMemberTable,
  TeamManagementQuotaLoading,
  TeamManagementQuotaMetrics,
  TeamMemberQuotaUsageCell,
  TeamPanelEmpty,
  creditTransferTermsKey,
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
  hasMemberGovernanceAction,
  isBatchRemoveEligible,
  isCreditTransferTermsAccepted,
  partitionSelection,
  selectLoadedEligible,
  toggleMemberSelection,
} from "./batch-remove-members-dialog.jsx";
import { CreditLedgerTable, getBillingModelDisplayName } from "./billing-model-display-labels.jsx";
import {
  DissolveTeamDialog,
  InviteLinkHistoryPage,
  InviteMembersPage,
  isCreditTransferTarget,
} from "./dissolve-team-dialog.jsx";
import { InfiniteScrollContainer, Label } from "./infinite-scroll-container.jsx";
import {
  CreateInviteLinkPage,
  Page,
  PageContent,
  PageDescription,
  PageHeader,
  PageTitle,
  TeamDialogNavigationContext,
} from "./past-team-members-panel.jsx";
import { TeamCreditPage, TeamPanelError, TeamPanelGated } from "./team-credit-page.jsx";
import {
  Alert,
  AlertDescription,
  LeaveTeamDialog,
  TeamDefaultQuotaPage,
  TeamMemberSettingsPage,
} from "./team-member-settings-page.jsx";
import { accountScopeEquals } from "./team-provider.jsx";
import { useMpSubscribeUrl } from "./use-credit-details.jsx";
import {
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
  useTeamDetailQuery,
  useTeamInviteLinksFeedQuery,
  useTeamMemberDetailsQuery,
  useTeamMembersFeedQuery,
  useTeamQuotaQuery,
  useTeamTransactionsFeedQuery,
  useTeamTransactionsQuery,
} from "./use-team-transactions-feed-query.jsx";
const GROUP_CREDIT_TRANSFER_MODEL_KEY = "group_credit_transfer";
function sumMemberCreditUsage(transactions) {
  let total = 0n;
  for (const transaction of transactions) {
    if (transaction.modelKey === GROUP_CREDIT_TRANSFER_MODEL_KEY) continue;
    const amount = BigInt(transaction.amount);
    if (amount < 0n) total -= amount;
    else if (transaction.category === "REFUND") total -= amount;
  }
  return (total > 0n ? total : 0n).toString();
}
function amountTone(amount) {
  const value = BigInt(amount);
  if (value > 0n) return "credit";
  if (value < 0n) return "debit";
  return "neutral";
}
function TeamMemberUsagePage({ scope, member, teamName, teamRemaining, onClose }) {
  const { t: t2 } = useTranslation();
  const { data: mediaModels } = useMediaModels();
  const roleLabel = t2(`team.role.${member.role.toLowerCase()}`, {
    defaultValue: member.role,
  });
  const transactionsQuery = useTeamTransactionsFeedQuery({
    scope,
    memberId: member.userId,
    enabled: member.permissions.viewTransactions.allowed,
  });
  const transactions = transactionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const loadedPageCount = transactionsQuery.data?.pages.length ?? 0;
  const lastLoadedPage = transactionsQuery.data?.pages.at(-1);
  const pageRequestKey = `${member.userId}:${loadedPageCount}`;
  const lastRequestedPageKeyRef = reactExports.useRef(null);
  const transactionHistoryComplete =
    member.permissions.viewTransactions.allowed &&
    transactionsQuery.data !== void 0 &&
    !transactionsQuery.isPending &&
    !transactionsQuery.isError &&
    !transactionsQuery.isFetchingNextPage &&
    !transactionsQuery.isFetchNextPageError &&
    lastLoadedPage?.hasMore === false;
  const memberUsed = transactionHistoryComplete ? sumMemberCreditUsage(transactions) : null;
  const memberRemaining =
    member.quota.mode === "LIMITED"
      ? member.quota.remaining !== null && teamRemaining !== null
        ? minCreditAmount(member.quota.remaining, teamRemaining)
        : null
      : member.quota.mode === "UNLIMITED"
        ? teamRemaining
        : null;
  const handleLoadMore = reactExports.useCallback(() => {
    if (
      !transactionsQuery.hasNextPage ||
      transactionsQuery.isFetchingNextPage ||
      transactionsQuery.isFetchNextPageError ||
      transactionsQuery.isError ||
      lastRequestedPageKeyRef.current === pageRequestKey
    ) {
      return void 0;
    }
    lastRequestedPageKeyRef.current = pageRequestKey;
    return transactionsQuery.fetchNextPage();
  }, [
    pageRequestKey,
    transactionsQuery.fetchNextPage,
    transactionsQuery.hasNextPage,
    transactionsQuery.isError,
    transactionsQuery.isFetchNextPageError,
    transactionsQuery.isFetchingNextPage,
  ]);
  reactExports.useEffect(() => {
    if (transactionsQuery.isFetchNextPageError) {
      lastRequestedPageKeyRef.current = null;
    }
  }, [transactionsQuery.isFetchNextPageError]);
  reactExports.useEffect(() => {
    void handleLoadMore();
  }, [handleLoadMore]);
  return (
    <Page open={true} onOpenChange={(next2) => !next2 && onClose()}>
      <PageContent
        className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.management-member-usage-dialog"
        data-member-id={member.userId}
      >
        <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
          <PageTitle>
            {t2("team.management.memberUsageTitle", {
              defaultValue: "成员用量",
            })}
          </PageTitle>
          <PageDescription>
            {t2("team.management.memberUsageDescription", {
              defaultValue: "查看 {{name}} 在“{{team}}”中的积分用量摘要。",
              name: member.displayName,
              team: teamName,
            })}
          </PageDescription>
        </PageHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="space-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {"UID "}
              {member.userId}
              {" · "}
              {roleLabel}
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {t2("team.management.memberCreditUsage", {
                defaultValue: "成员积分概览",
              })}
            </h3>
            <div
              data-action-ui-id="team.management-member-usage-summary"
              data-quota-mode={member.quota.mode}
            >
              <TeamManagementQuotaMetrics
                metrics={[
                  {
                    id: "member-used",
                    label: t2("team.management.memberUsedCredits", {
                      defaultValue: "累计已用积分",
                    }),
                    value:
                      memberUsed === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCreditAmount(memberUsed)
                      ),
                    tabular: true,
                  },
                  {
                    id: "member-remaining",
                    label: t2("team.management.currentQuota", {
                      defaultValue: "当前可用积分",
                    }),
                    value:
                      memberRemaining === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCreditAmount(memberRemaining)
                      ),
                    tabular: true,
                  },
                ]}
              />
            </div>
            {member.permissions.viewUsage.allowed === false && memberUsed === null ? (
              <p className="text-xs text-muted-foreground">
                {t2("team.credit.usageUnavailableTooltip", {
                  defaultValue: "用量数据暂不可获取",
                })}
              </p>
            ) : null}
          </section>
          {member.permissions.viewTransactions.allowed ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {t2("team.management.memberTransactions", {
                  defaultValue: "成员积分流水",
                })}
              </h3>
              <InfiniteScrollContainer
                className="h-72"
                loadedBatchCount={loadedPageCount}
                hasMore={Boolean(transactionsQuery.hasNextPage)}
                isLoadingMore={transactionsQuery.isFetchingNextPage}
                loadMoreError={transactionsQuery.isFetchNextPageError}
                onLoadMore={handleLoadMore}
                actionUiId="team.management-member-transactions-scroll"
              >
                <CreditLedgerTable
                  rows={transactions.map((transaction) => ({
                    id: transaction.transactionId,
                    description: t2(`team.transaction.${transaction.category}`, {
                      defaultValue: transaction.category,
                      ...transaction.localizationParams,
                    }),
                    model: getBillingModelDisplayName(
                      {
                        billingType: transaction.billingType,
                        modelKey: transaction.modelKey,
                        modelDisplayName: transaction.modelDisplayName,
                        mediaType: transaction.mediaType,
                      },
                      t2,
                      mediaModels,
                    ),
                    createdAtMs: transaction.createdAtMs,
                    amount: formatCreditAmount(transaction.amount),
                    tone: amountTone(transaction.amount),
                  }))}
                  loading={transactionsQuery.isPending}
                  error={transactionsQuery.isError && !transactionsQuery.data}
                  scrollable={false}
                  descriptionLabel={t2("team.credit.transaction", {
                    defaultValue: "类型",
                  })}
                  modelLabel={t2("team.credit.model", {
                    defaultValue: "模型",
                  })}
                  timeLabel={t2("team.credit.time", {
                    defaultValue: "时间",
                  })}
                  amountLabel={t2("team.credit.amount", {
                    defaultValue: "积分",
                  })}
                  emptyLabel={t2("team.credit.empty", {
                    defaultValue: "暂无积分流水",
                  })}
                  errorLabel={t2("team.common.loadFailed", {
                    defaultValue: "加载失败",
                  })}
                  retryLabel={t2("common.retry", {
                    defaultValue: "重试",
                  })}
                  onRetry={() => void transactionsQuery.refetch()}
                />
              </InfiniteScrollContainer>
            </section>
          ) : null}
        </div>
      </PageContent>
    </Page>
  );
}
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
function TransferCreditForm({
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
  const contextsQuery = useTeamContextsQuery(snapshot2?.identityKey ?? null, active2);
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
      if (!activeScope || !scope.membershipRevision || !accountScopeEquals(activeScope, scope)) {
        throw new TeamScopeChangedError3();
      }
      const decision = guardAccountSubmission("team_credit_transfer");
      if (!decision.allowed) throw new TeamScopeChangedError3();
      if (decision.mode !== "CANONICAL" || !accountScopeEquals(decision.scope, scope)) {
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
        targets.find((item) => item.groupId === targetGroupId)?.displayName ?? targetGroupId;
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
        <Label htmlFor={targetSelectId} className="text-muted-foreground font-normal">
          {t2("team.transferCredit.targetLabel", {
            defaultValue: "转入账号",
          })}
        </Label>
        <Select$1
          value={targetGroupId}
          onValueChange={(value) => {
            setTargetGroupId(value ?? "");
            setActionError(null);
          }}
          disabled={
            disabled2 || mutation.isPending || unknownIntent !== null || targets.length === 0
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
        </Select$1>
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
        <Label htmlFor={amountInputId} className="text-muted-foreground font-normal">
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
          <Button$1
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={onCancel}
          >
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </Button$1>
        ) : null}
        <Button$1
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
        </Button$1>
      </div>
    </div>
  );
}
function TransferCreditPage({ open, scope, teamName, teamRemaining, onOpenChange, onTransferred }) {
  const { t: t2 } = useTranslation();
  const [transferPending, setTransferPending] = reactExports.useState(false);
  const [dialogContentElement, setDialogContentElement] = reactExports.useState(null);
  return (
    <Page open={open} onOpenChange={(nextOpen) => !transferPending && onOpenChange(nextOpen)}>
      <PageContent ref={setDialogContentElement} data-action-ui-id="team.transfer-credit-dialog">
        <PageHeader>
          <PageTitle>
            {t2("team.transferCredit.title", {
              defaultValue: "转移积分",
            })}
          </PageTitle>
          <PageDescription>
            {t2("team.transferCredit.description", {
              defaultValue:
                "把「{{name}}」的剩余积分转移到你名下的其他团队或个人空间。积分保留原有效期，订阅套餐额度不参与转移。",
              name: teamName,
            })}
          </PageDescription>
        </PageHeader>
        <TransferCreditForm
          active={open}
          scope={scope}
          teamRemaining={teamRemaining}
          selectPortalContainer={dialogContentElement}
          autoFocus={true}
          onCancel={() => onOpenChange(false)}
          onPendingChange={setTransferPending}
          onTransferred={() => {
            onTransferred?.();
            onOpenChange(false);
          }}
          onScopeChanged={() => onOpenChange(false)}
        />
      </PageContent>
    </Page>
  );
}
const MEMBER_SEARCH_DEBOUNCE_MS = 250;
export function TeamManagementDialog({ open, scope, onOpenChange, onDissolveTransferSucceeded }) {
  const { t: t2 } = useTranslation();
  const runtimeConfig = getRuntimeConfig();
  const isOverseas = runtimeConfig.region === "overseas";
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const subscribeUrl = useMpSubscribeUrl();
  const purchasePendingRef = reactExports.useRef(false);
  const [purchasePending, setPurchasePending] = reactExports.useState(false);
  const [showTransferTermsDialog, setShowTransferTermsDialog] = reactExports.useState(false);
  const [globalConfig, , setGlobalConfigAsync] = useStorage("global.config");
  const [globalUser] = useStorage("global.user");
  const { accountDataVisible, contract } = useTeamAccount();
  const gateOpen = Boolean(
    accountDataVisible &&
    contract?.compatibility === "SUPPORTED" &&
    contract.gates.teamRead &&
    scope.membershipRevision,
  );
  const detailQuery = useTeamDetailQuery(scope, open && gateOpen);
  const [searchInput, setSearchInput] = reactExports.useState("");
  const [keyword2, setKeyword] = reactExports.useState("");
  const [selectedMemberIds, setSelectedMemberIds] = reactExports.useState(() => new Set());
  const [batchRemoveOpen, setBatchRemoveOpen] = reactExports.useState(false);
  const [dissolveTeamOpen, setDissolveTeamOpen] = reactExports.useState(false);
  const [leaveTeamOpen, setLeaveTeamOpen] = reactExports.useState(false);
  const [activeTab, setActiveTab] = reactExports.useState("members");
  const nestedCloseRef = reactExports.useRef(null);
  const [subpage, setSubpage] = reactExports.useState(null);
  const subpageRef = reactExports.useRef(null);
  const navigationRevision = reactExports.useRef(0);
  const navigateSubpage = reactExports.useCallback((page) => {
    navigationRevision.current += 1;
    subpageRef.current = page;
    setSubpage(page);
  }, []);
  const closeSubpage = reactExports.useCallback(() => navigateSubpage(null), [navigateSubpage]);
  const settingsMember = subpage?.type === "settings" ? subpage.member : null;
  const usageMember = subpage?.type === "usage" ? subpage.member : null;
  const defaultQuotaOpen = subpage?.type === "quota";
  const defaultQuotaSnapshot = subpage?.type === "quota" ? subpage.quota : null;
  const inviteOpen = subpage?.type === "invite";
  const inviteHistoryOpen = subpage?.type === "history";
  const transferDialogOpen = subpage?.type === "transfer";
  const handleTabChange = (tab2) => {
    if (subpageRef.current) {
      nestedCloseRef.current?.();
      if (subpageRef.current) return;
    }
    navigationRevision.current += 1;
    if (tab2 !== activeTab) setSelectedMemberIds(new Set());
    setActiveTab(tab2);
  };
  const pageSize = Math.min(20, contract?.limits.maxMemberPageSize ?? 20);
  const isMemberView = detailQuery.data?.currentRole === "MEMBER";
  const isOwner = detailQuery.data?.currentRole === "OWNER";
  const creditTransferTermsScopeKey = creditTransferTermsKey({
    userId: globalUser.userID,
    groupId: scope.groupId,
  });
  const viewMembers = Boolean(!isMemberView && detailQuery.data?.permissions.viewMembers.allowed);
  const mutationOpen = contract?.gates.teamMutation === true;
  const viewInviteLinks = Boolean(
    !isMemberView &&
    mutationOpen &&
    (detailQuery.data?.permissions.createInviteLink.allowed ||
      detailQuery.data?.permissions.revokeInviteLink.allowed),
  );
  const billingOpen = Boolean(contract?.gates.teamBilling);
  const canViewTeamLedger = Boolean(
    open && gateOpen && billingOpen && detailQuery.data && !isMemberView,
  );
  const membersQuery = useTeamMembersFeedQuery({
    scope,
    keyword: keyword2,
    pageSize,
    enabled: open && gateOpen && viewMembers,
  });
  const inviteLinksQuery = useTeamInviteLinksFeedQuery({
    scope,
    enabled: open && gateOpen && viewInviteLinks,
  });
  const quotaQuery = useTeamQuotaQuery(
    scope,
    open && gateOpen && billingOpen && Boolean(detailQuery.data && !isMemberView),
  );
  const memberCreditQuery = useTeamCreditSummaryQuery(
    scope,
    open && gateOpen && billingOpen && isMemberView,
  );
  const groupTransactionsSummaryQuery = useTeamTransactionsQuery({
    scope,
    cursor: null,
    enabled: canViewTeamLedger,
  });
  const memberDetailsQuery = useTeamMemberDetailsQuery({
    scope,
    enabled: open && gateOpen && billingOpen && Boolean(detailQuery.data) && !isMemberView,
  });
  const memberUsageByUserId = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const detail of memberDetailsQuery.data ?? []) {
      map3.set(detail.userId, detail.totalUsed);
    }
    return map3;
  }, [memberDetailsQuery.data]);
  const memberNameByUserId = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const detail of memberDetailsQuery.data ?? []) {
      map3.set(detail.userId, detail.userName);
    }
    return map3;
  }, [memberDetailsQuery.data]);
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  const rows = (membersQuery.data?.pages.flatMap((page) => page.items) ?? []).map((member) => ({
    ...member,
    displayName: memberNameByUserId.get(member.userId) ?? member.displayName,
  }));
  const memberNamesReady =
    !billingOpen || memberDetailsQuery.isSuccess || memberDetailsQuery.isError;
  const settingsMemberLive =
    settingsMember == null
      ? null
      : (rows.find((member) => member.userId === settingsMember.userId) ?? settingsMember);
  const usageMemberLive =
    usageMember == null
      ? null
      : (rows.find((member) => member.userId === usageMember.userId) ?? usageMember);
  const inviteLinks = inviteLinksQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const canManageAnyMember = rows.some((member) =>
    hasMemberGovernanceAction({
      changeRole: member.permissions.changeRole.allowed,
      changeQuota: mutationOpen && billingOpen && member.permissions.changeQuota.allowed,
      removeMember: member.permissions.removeMember.allowed,
    }),
  );
  const selectionEnabled = mutationOpen && canManageAnyMember;
  const removePartition = reactExports.useMemo(
    () => partitionSelection(rows, selectedMemberIds, isBatchRemoveEligible),
    [rows, selectedMemberIds],
  );
  const loadedSelectableIds = reactExports.useMemo(
    () => selectLoadedEligible(rows, isBatchRemoveEligible),
    [rows],
  );
  const allLoadedSelected =
    loadedSelectableIds.size > 0 &&
    [...loadedSelectableIds].every((id2) => selectedMemberIds.has(id2));
  const someLoadedSelected = [...loadedSelectableIds].some((id2) => selectedMemberIds.has(id2));
  const canCreateInviteLink = Boolean(
    mutationOpen && detailQuery.data?.permissions.createInviteLink.allowed,
  );
  const canConfigureDefaultQuota = Boolean(
    !isMemberView &&
    mutationOpen &&
    billingOpen &&
    detailQuery.data?.permissions.configureQuota.allowed,
  );
  const canDissolveTeam = Boolean(
    mutationOpen && detailQuery.data?.permissions.dissolveTeam.allowed,
  );
  const canLeaveTeam = Boolean(
    mutationOpen &&
    (detailQuery.data?.permissions.leaveTeam.allowed ||
      detailQuery.data?.permissions.transferOwner.allowed),
  );
  const teamRemaining =
    detailQuery.data?.creditSummary?.teamRemaining ??
    memberCreditQuery.data?.teamRemaining ??
    quotaQuery.data?.teamRemaining ??
    null;
  const canPurchase = Boolean(
    gateOpen && billingOpen && detailQuery.data?.permissions.purchaseCredits.allowed,
  );
  const checkoutDecision = useAccountSubmissionDecision("team_checkout");
  const checkoutScopeMatches = Boolean(
    checkoutDecision.allowed &&
    checkoutDecision.mode === "CANONICAL" &&
    accountScopeEquals(checkoutDecision.scope, scope),
  );
  const checkoutUnavailableReason = !checkoutDecision.allowed
    ? getTeamReasonText(t2, checkoutDecision.reasonCode)
    : !checkoutScopeMatches
      ? getTeamReasonText(t2, "account_scope_changed")
      : !subscribeUrl
        ? t2("team.credit.checkoutFailed", {
            defaultValue: "暂时无法创建团队购买链接，请稍后重试。",
          })
        : null;
  const handlePurchase = async () => {
    if (purchasePendingRef.current || !subscribeUrl) return;
    const decision = guardAccountSubmission("team_checkout");
    if (!decision.allowed) return;
    if (decision.mode !== "CANONICAL" || !accountScopeEquals(decision.scope, scope)) {
      dispatchAccountSubmissionBlocked({
        kind: "team_checkout",
        reasonCode: "account_scope_changed",
      });
      return;
    }
    purchasePendingRef.current = true;
    setPurchasePending(true);
    try {
      await openExternalUrl(platform2, subscribeUrl, {
        source: "team.management.purchase",
      });
      const handleFocus = () => {
        window.removeEventListener("focus", handleFocus);
        void queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.scope(scope),
        });
      };
      window.addEventListener("focus", handleFocus, {
        once: true,
      });
    } catch {
      dedupedToast.error(
        t2("team.credit.checkoutFailed", {
          defaultValue: "暂时无法创建团队购买链接，请稍后重试。",
        }),
      );
    } finally {
      purchasePendingRef.current = false;
      setPurchasePending(false);
    }
  };
  const handleOpenDefaultQuota = async () => {
    const revision = ++navigationRevision.current;
    const result = await quotaQuery.refetch();
    if (revision !== navigationRevision.current) return;
    navigateSubpage({
      type: "quota",
      quota: result.isError ? null : (result.data ?? null),
    });
  };
  const handleCopyGroupId = async () => {
    try {
      await navigator.clipboard.writeText(scope.groupId);
      dedupedToast.success(
        t2("common.copied", {
          defaultValue: "已复制",
        }),
      );
    } catch {
      dedupedToast.error(
        t2("common.copyFailed", {
          defaultValue: "复制失败",
        }),
      );
    }
  };
  reactExports.useEffect(() => {
    if (searchInput === keyword2) return;
    const timer2 = window.setTimeout(() => {
      setKeyword(searchInput);
    }, MEMBER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer2);
  }, [keyword2, searchInput]);
  reactExports.useEffect(() => {
    if (!open) {
      setSelectedMemberIds(new Set());
      setBatchRemoveOpen(false);
      closeSubpage();
      setActiveTab("members");
    }
  }, [open, closeSubpage]);
  reactExports.useEffect(() => {
    return () => {
      navigationRevision.current += 1;
    };
  }, [open, scope.identityKey, scope.groupId, scope.epoch]);
  const detailStale = Boolean(
    detailQuery.data && (detailQuery.isRefetchError || detailQuery.isError),
  );
  const currentTab = isMemberView
    ? "credits"
    : activeTab === "ledger" && !canViewTeamLedger
      ? "members"
      : activeTab;
  const tabs = [
    {
      id: "members",
      label: t2("team.management.membersTab", {
        defaultValue: "成员信息",
      }),
      icon: Users,
      visible: !isMemberView,
    },
    {
      id: "credits",
      label: t2("team.management.creditsTab", {
        defaultValue: "积分管理",
      }),
      icon: CreditCard,
      visible: true,
    },
    {
      id: "ledger",
      label: t2("team.management.ledgerTab", {
        defaultValue: "积分明细",
      }),
      icon: ReceiptText,
      visible: canViewTeamLedger,
    },
  ];
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next2) => {
          if (!next2 && nestedCloseRef.current) nestedCloseRef.current();
          else {
            if (!next2) navigationRevision.current += 1;
            onOpenChange(next2);
          }
        }}
      >
        <DialogContent
          size="xl"
          className="flex h-[min(48rem,calc(100dvh-3rem))] max-h-[calc(100dvh-3rem)] flex-row gap-0 overflow-hidden p-0 sm:max-w-[1120px]"
          data-action-ui-id="team.management-dialog"
          data-group-id={scope.groupId}
          data-team-member-count={detailQuery.data?.memberCount}
        >
          <nav
            aria-label={t2("team.management.title")}
            className="flex w-40 shrink-0 flex-col gap-2 border-r border-border px-3 py-6 sm:w-48 sm:px-4"
          >
            <p className="mb-3 px-3 text-sm font-medium text-foreground">
              {t2("team.management.title")}
            </p>
            {tabs
              .filter((tab2) => tab2.visible)
              .map((tab2) => (
                <Button$1
                  key={tab2.id}
                  variant={currentTab === tab2.id ? "default" : "ghost"}
                  aria-pressed={currentTab === tab2.id}
                  className={
                    currentTab === tab2.id
                      ? "justify-start gap-2 bg-foreground text-background hover:bg-foreground hover:text-background"
                      : "justify-start gap-2 text-muted-foreground"
                  }
                  data-action-ui-id={`team.management-tab-${tab2.id}`}
                  onClick={() => handleTabChange(tab2.id)}
                >
                  <Icon icon={tab2.icon} size="sm" aria-hidden={true} />
                  {tab2.label}
                </Button$1>
              ))}
          </nav>
          <TeamDialogNavigationContext.Provider value={nestedCloseRef}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <DialogHeader className="shrink-0 border-b border-border px-4 py-6 pr-14 sm:px-6 sm:pr-16">
                <DialogTitle className="font-heading text-xl">
                  {tabs.find((tab2) => tab2.id === currentTab)?.label}
                </DialogTitle>
                <DialogDescription>
                  {isMemberView
                    ? t2("team.management.memberDescription", {
                        defaultValue: "查看你在当前团队中的个人额度。",
                      })
                    : currentTab === "ledger"
                      ? t2("team.credit.teamDetailDescription", {
                          defaultValue: "查看当前团队整体积分消耗明细。",
                        })
                      : currentTab === "credits"
                        ? t2("team.management.creditsDescription", {
                            defaultValue: "管理团队积分、订阅与成员额度。",
                          })
                        : t2("team.management.description", {
                            defaultValue: "查看团队信息，管理团队成员",
                          })}
                </DialogDescription>
              </DialogHeader>
              {detailQuery.data ? (
                <div
                  className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-4 pt-5 sm:px-6"
                  data-action-ui-id="team.management-identity"
                >
                  <div className="grid min-w-0 gap-1.5">
                    <h2 className="truncate font-heading text-lg font-medium">
                      {detailQuery.data.teamName}
                    </h2>
                    {currentTab === "members" ? (
                      <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <span className="shrink-0">
                          {t2("team.management.groupId", {
                            defaultValue: "Group ID",
                          })}
                        </span>
                        <code className="truncate font-mono text-foreground">{scope.groupId}</code>
                        <Button$1
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => void handleCopyGroupId()}
                          aria-label={t2("team.management.copyGroupId", {
                            defaultValue: "复制 Group ID",
                          })}
                          data-action-ui-id="team.management-copy-group-id"
                        >
                          <Icon icon={Copy} size="xs" aria-hidden={true} />
                        </Button$1>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div
                ref={scrollRef}
                data-scrolling={isScrolling || void 0}
                className={
                  currentTab === "ledger"
                    ? "hidden"
                    : "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 sm:px-6"
                }
              >
                {!gateOpen ? <TeamPanelGated reasonCode="team_management_disabled" /> : null}
                {gateOpen && detailQuery.isPending ? <TeamManagementDetailLoading /> : null}
                {gateOpen && detailQuery.isError && !detailQuery.data ? (
                  <TeamPanelError
                    title={t2("team.management.teamInfoLoadFailed", {
                      defaultValue: "团队信息加载失败",
                    })}
                    onRetry={() => void detailQuery.refetch()}
                  />
                ) : null}
                {gateOpen && detailStale ? (
                  <TeamPanelStale onRetry={() => void detailQuery.refetch()} />
                ) : null}
                {detailQuery.data ? (
                  <>
                    {billingOpen ? (
                      <section
                        className={currentTab === "credits" ? "shrink-0 space-y-4" : "hidden"}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading text-sm font-medium text-foreground">
                                {isMemberView
                                  ? t2("team.management.memberQuotaTitle", {
                                      defaultValue: "我的额度",
                                    })
                                  : t2("team.management.quotaOverview", {
                                      defaultValue: "积分概览",
                                    })}
                              </h3>
                            </div>
                            {isMemberView ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t2("team.management.memberQuotaDescription", {
                                  defaultValue: "仅展示你的个人额度和使用情况。",
                                })}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {canPurchase ? (
                              checkoutUnavailableReason ? (
                                <TeamUnavailableAction
                                  label={t2("team.credit.purchase", {
                                    defaultValue: "去购买",
                                  })}
                                  reason={checkoutUnavailableReason}
                                  dataActionUiId="team.management-purchase"
                                  variant="default"
                                  size="sm"
                                />
                              ) : (
                                <Button$1
                                  type="button"
                                  size="sm"
                                  className="shrink-0"
                                  loading={purchasePending}
                                  onClick={() => void handlePurchase()}
                                  data-action-ui-id="team.management-purchase"
                                >
                                  {t2("team.credit.purchase", {
                                    defaultValue: "去购买",
                                  })}
                                </Button$1>
                              )
                            ) : null}
                            {!isMemberView && billingOpen ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button$1
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        className="shrink-0"
                                        aria-label={t2("team.credit.invoice", {
                                          defaultValue: "开发票",
                                        })}
                                        onClick={() => {
                                          void openExternalUrl(
                                            platform2,
                                            getTeamInvoiceUrl(
                                              runtimeConfig.region,
                                              runtimeConfig.channel,
                                              scope.groupId,
                                            ),
                                            {
                                              source: "team.management-invoice",
                                            },
                                          );
                                        }}
                                        data-action-ui-id="team.management-invoice"
                                      >
                                        <Icon
                                          icon={ReceiptText}
                                          size="xs"
                                          strokeWidth={2}
                                          aria-hidden={true}
                                        />
                                      </Button$1>
                                    }
                                  />
                                  <TooltipContent>
                                    {t2("team.credit.invoice", {
                                      defaultValue: "开发票",
                                    })}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </div>
                        </div>
                        {isMemberView ? (
                          <>
                            {memberCreditQuery.isPending ? <TeamManagementQuotaLoading /> : null}
                            {memberCreditQuery.isError && !memberCreditQuery.data ? (
                              <TeamPanelError
                                title={t2("team.management.memberQuotaLoadFailed", {
                                  defaultValue: "个人额度加载失败",
                                })}
                                onRetry={() => void memberCreditQuery.refetch()}
                              />
                            ) : null}
                            {memberCreditQuery.data &&
                            (memberCreditQuery.isRefetchError || memberCreditQuery.isError) ? (
                              <TeamPanelStale onRetry={() => void memberCreditQuery.refetch()} />
                            ) : null}
                            {memberCreditQuery.data ? (
                              <div data-action-ui-id="team.management-member-quota">
                                <TeamManagementQuotaMetrics
                                  metrics={[
                                    {
                                      id: "member-remaining",
                                      label: t2("team.credit.remaining", {
                                        defaultValue: "剩余额度",
                                      }),
                                      value:
                                        memberCreditQuery.data.mode === "UNLIMITED"
                                          ? formatCreditAmount(memberCreditQuery.data.teamRemaining)
                                          : memberCreditQuery.data.mode === "LIMITED" &&
                                              memberCreditQuery.data.memberRemaining !== null
                                            ? formatCreditAmount(
                                                memberCreditQuery.data.memberRemaining,
                                              )
                                            : "—",
                                      tabular: true,
                                    },
                                    ...(memberCreditQuery.data.mode === "UNLIMITED"
                                      ? []
                                      : [
                                          {
                                            id: "member-usage",
                                            label: t2("team.credit.quotaUsage", {
                                              defaultValue: "额度使用",
                                            }),
                                            value:
                                              memberCreditQuery.data.mode === "LIMITED" &&
                                              memberCreditQuery.data.memberLimit !== null &&
                                              memberCreditQuery.data.memberUsed !== null
                                                ? t2("team.credit.quotaUsageValue", {
                                                    defaultValue:
                                                      "已用 {{used}} / 个人限额 {{limit}}",
                                                    used: formatCreditAmount(
                                                      memberCreditQuery.data.memberUsed,
                                                    ),
                                                    limit: formatCreditAmount(
                                                      memberCreditQuery.data.memberLimit,
                                                    ),
                                                  })
                                                : memberCreditQuery.data.mode === "LIMITED" &&
                                                    memberCreditQuery.data.memberLimit !== null
                                                  ? t2(
                                                      "team.credit.usageUnavailableWithAllowance",
                                                      {
                                                        defaultValue:
                                                          "{{allowance}}，用量数据暂不可获取",
                                                        allowance: t2("team.credit.personalLimit", {
                                                          defaultValue: "限额 {{limit}}",
                                                          limit: formatCreditAmount(
                                                            memberCreditQuery.data.memberLimit,
                                                          ),
                                                        }),
                                                      },
                                                    )
                                                  : "—",
                                            tabular: true,
                                          },
                                        ]),
                                  ]}
                                />
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {quotaQuery.isPending ? <TeamManagementQuotaLoading /> : null}
                            {quotaQuery.isError && !quotaQuery.data ? (
                              <TeamPanelError
                                title={t2("team.management.quotaLoadFailed", {
                                  defaultValue: "团队额度加载失败",
                                })}
                                onRetry={() => void quotaQuery.refetch()}
                              />
                            ) : null}
                            {quotaQuery.data &&
                            (quotaQuery.isRefetchError || quotaQuery.isError) ? (
                              <TeamPanelStale onRetry={() => void quotaQuery.refetch()} />
                            ) : null}
                            {quotaQuery.data ? (
                              <TeamManagementQuotaMetrics
                                metrics={[
                                  {
                                    id: "team-used",
                                    label: t2("team.credit.teamUsed", {
                                      defaultValue: "团队已用积分",
                                    }),
                                    value:
                                      groupTransactionsSummaryQuery.data?.groupUsed !== null &&
                                      groupTransactionsSummaryQuery.data?.groupUsed !== void 0 ? (
                                        formatCreditAmount(
                                          groupTransactionsSummaryQuery.data.groupUsed,
                                        )
                                      ) : detailQuery.data.creditSummary?.teamUsed !== null &&
                                        detailQuery.data.creditSummary?.teamUsed !== void 0 ? (
                                        formatCreditAmount(detailQuery.data.creditSummary.teamUsed)
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      ),
                                    tabular: true,
                                  },
                                  {
                                    id: "team-remaining",
                                    label: t2("team.credit.teamRemaining", {
                                      defaultValue: "团队剩余积分",
                                    }),
                                    value: formatCreditAmount(quotaQuery.data.teamRemaining),
                                    tabular: true,
                                    actionPlacement: "label",
                                    action:
                                      isOwner && billingOpen ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger
                                              render={
                                                <Button$1
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon-xs"
                                                  aria-label={t2("team.transferCredit.entry", {
                                                    defaultValue: "转移积分",
                                                  })}
                                                  onClick={() => {
                                                    if (
                                                      isCreditTransferTermsAccepted(
                                                        globalConfig.creditTransferTermsAccepted,
                                                        creditTransferTermsScopeKey,
                                                      )
                                                    ) {
                                                      navigateSubpage({
                                                        type: "transfer",
                                                      });
                                                    } else {
                                                      setShowTransferTermsDialog(true);
                                                    }
                                                  }}
                                                  data-action-ui-id="team.management-transfer-credit"
                                                >
                                                  <Icon
                                                    icon={ArrowLeftRight}
                                                    size="xs"
                                                    strokeWidth={2}
                                                    aria-hidden={true}
                                                  />
                                                </Button$1>
                                              }
                                            />
                                            <TooltipContent>
                                              {t2("team.transferCredit.entry", {
                                                defaultValue: "转移积分",
                                              })}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        void 0
                                      ),
                                  },
                                ]}
                              />
                            ) : null}
                          </>
                        )}
                      </section>
                    ) : null}
                    <section
                      className={isMemberView ? "hidden" : "flex min-h-0 flex-1 flex-col gap-2"}
                      aria-hidden={isMemberView || void 0}
                    >
                      <div
                        className="flex min-w-0 flex-wrap items-center gap-3"
                        data-action-ui-id="team.management-member-toolbar"
                      >
                        <h3 className="shrink-0 font-heading text-sm font-medium text-foreground">
                          {currentTab === "credits"
                            ? t2("team.management.memberQuotaTitlePlural", {
                                defaultValue: "成员额度",
                              })
                            : t2("team.management.members", {
                                defaultValue: "成员详情",
                              })}
                        </h3>
                        {viewMembers ? (
                          <Input3
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            startIcon={<Icon icon={Search} size="sm" aria-hidden={true} />}
                            className="ml-auto w-full sm:w-56"
                            placeholder={t2("team.management.searchPlaceholder", {
                              defaultValue: "搜索姓名或 UID",
                            })}
                            aria-label={t2("team.management.searchPlaceholder", {
                              defaultValue: "搜索姓名或 UID",
                            })}
                            data-action-ui-id="team.management-member-search"
                          />
                        ) : null}
                        <div
                          className="flex min-w-0 flex-wrap items-center justify-end gap-2"
                          data-action-ui-id="team.management-member-toolbar-actions"
                        >
                          {currentTab === "members" && viewInviteLinks ? (
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {canCreateInviteLink ? (
                                <Button$1
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    navigateSubpage({
                                      type: "invite",
                                    })
                                  }
                                  data-action-ui-id="team.management-invite"
                                >
                                  <Icon icon={Plus} size="xs" aria-hidden={true} />
                                  {t2("team.management.invite", {
                                    defaultValue: "邀请成员",
                                  })}
                                </Button$1>
                              ) : null}
                              <Button$1
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigateSubpage({
                                    type: "history",
                                  })
                                }
                                data-action-ui-id="team.management-invite-records"
                              >
                                {t2("team.management.inviteRecords", {
                                  defaultValue: "邀请记录",
                                })}
                              </Button$1>
                            </div>
                          ) : null}
                          {currentTab === "credits" && canConfigureDefaultQuota ? (
                            <Button$1
                              type="button"
                              variant="outline"
                              size="sm"
                              loading={quotaQuery.isFetching}
                              disabled={quotaQuery.isFetching}
                              onClick={() => void handleOpenDefaultQuota()}
                              data-action-ui-id="team.management-configure-default-quota"
                            >
                              {t2("team.management.configureDefaultQuota", {
                                defaultValue: "一键配置限额",
                              })}
                            </Button$1>
                          ) : null}
                        </div>
                      </div>
                      {viewMembers && selectionEnabled && selectedMemberIds.size > 0 ? (
                        <div
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                          data-action-ui-id="team.management-batch-toolbar"
                        >
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {t2("team.management.selectedCount", {
                              defaultValue: "已选择 {{count}} 人",
                              count: selectedMemberIds.size,
                            })}
                            <TeamHelpTip
                              label={t2("team.management.selectionHelp", {
                                defaultValue: "选择说明",
                              })}
                              content={t2("team.management.currentPageSelection", {
                                defaultValue: "全选仅作用于已加载成员。",
                              })}
                            />
                          </span>
                          {removePartition.selectedEligible.length > 0 ? (
                            <Button$1
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setBatchRemoveOpen(true)}
                              data-action-ui-id="team.management-batch-remove"
                            >
                              {t2("team.management.removeSelected", {
                                defaultValue: "移除成员",
                              })}
                            </Button$1>
                          ) : null}
                        </div>
                      ) : null}
                      {!viewMembers ? (
                        <TeamPanelGated
                          reasonCode={
                            detailQuery.data.permissions.viewMembers.reasonCode ??
                            "permission_denied"
                          }
                        />
                      ) : null}
                      {viewMembers &&
                      (membersQuery.isPending ||
                        (membersQuery.isSuccess && rows.length > 0 && !memberNamesReady)) ? (
                        <TeamManagementMemberLoading />
                      ) : null}
                      {viewMembers && membersQuery.isError && !membersQuery.data ? (
                        <TeamPanelError
                          title={t2("team.management.membersLoadFailed", {
                            defaultValue: "成员列表加载失败",
                          })}
                          onRetry={() => void membersQuery.refetch()}
                        />
                      ) : null}
                      {viewMembers &&
                      membersQuery.data &&
                      (membersQuery.isRefetchError || membersQuery.isError) ? (
                        <TeamPanelStale onRetry={() => void membersQuery.refetch()} />
                      ) : null}
                      {viewMembers && membersQuery.isSuccess && rows.length === 0 ? (
                        <TeamPanelEmpty
                          title={t2("team.management.noMembers", {
                            defaultValue: "没有匹配的成员",
                          })}
                        />
                      ) : null}
                      {viewMembers && memberNamesReady && rows.length > 0 ? (
                        <InfiniteScrollContainer
                          className="min-h-0 flex-1"
                          loadedBatchCount={membersQuery.data?.pages.length ?? 0}
                          hasMore={Boolean(membersQuery.hasNextPage)}
                          isLoadingMore={membersQuery.isFetchingNextPage}
                          loadMoreError={membersQuery.isFetchNextPageError}
                          onLoadMore={() => membersQuery.fetchNextPage()}
                          actionUiId="team.management-members-scroll"
                        >
                          <TeamManagementMemberTable
                            showCredits={currentTab === "credits"}
                            headerSelection={
                              selectionEnabled ? (
                                <Checkbox
                                  checked={allLoadedSelected}
                                  indeterminate={!allLoadedSelected && someLoadedSelected}
                                  aria-label={t2("team.management.selectCurrentPage", {
                                    defaultValue: "选择全部已加载成员",
                                  })}
                                  data-action-ui-id="team.management-select-loaded"
                                  onCheckedChange={(checked) => {
                                    setSelectedMemberIds(
                                      checked === true
                                        ? selectLoadedEligible(rows, isBatchRemoveEligible)
                                        : new Set(),
                                    );
                                  }}
                                />
                              ) : (
                                void 0
                              )
                            }
                            memberLabel={t2("team.management.member", {
                              defaultValue: "成员",
                            })}
                            roleLabel={t2("team.management.role", {
                              defaultValue: "角色",
                            })}
                            quotaLabel={
                              <span className="inline-flex items-center justify-center gap-1">
                                {t2("team.management.currentQuota", {
                                  defaultValue: "当前可用积分",
                                })}
                                <TeamHelpTip
                                  label={t2("team.management.currentQuotaHelp", {
                                    defaultValue: "当前可用积分说明",
                                  })}
                                  content={t2("team.management.currentQuotaHelpContent", {
                                    defaultValue:
                                      "展示成员此刻实际可使用的积分，取成员额度内剩余积分与团队剩余积分中的较小值；若未设置成员额度，则展示团队剩余积分。",
                                  })}
                                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                                />
                              </span>
                            }
                            actionLabel={t2("team.management.actions", {
                              defaultValue: "操作",
                            })}
                            usageLabel={
                              <span className="inline-flex items-center justify-center gap-1">
                                {t2("team.management.memberTotalUsed", {
                                  defaultValue: "累计使用",
                                })}
                                <TeamHelpTip
                                  label={t2("team.management.memberTotalUsedHelp", {
                                    defaultValue: "累计使用说明",
                                  })}
                                  content={t2("team.management.memberTotalUsedHelpContent", {
                                    defaultValue:
                                      "展示该成员在当前团队内的历史累计消耗积分，与团队累计已用积分、消费流水口径一致。",
                                  })}
                                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                                />
                              </span>
                            }
                            uidPrefix="UID"
                            rows={rows.map((member) => {
                              const canChangeQuota = Boolean(
                                activeTab === "credits" &&
                                mutationOpen &&
                                billingOpen &&
                                member.permissions.changeQuota.allowed,
                              );
                              const canManage = hasMemberGovernanceAction({
                                changeRole: member.permissions.changeRole.allowed,
                                changeQuota: canChangeQuota,
                                removeMember: member.permissions.removeMember.allowed,
                              });
                              const selectable = selectionEnabled && isBatchRemoveEligible(member);
                              return {
                                id: member.userId,
                                name: member.displayName,
                                uid: member.userId,
                                role: t2(`team.role.${member.role.toLowerCase()}`, {
                                  defaultValue: member.role,
                                }),
                                selection: selectionEnabled ? (
                                  <Checkbox
                                    checked={selectedMemberIds.has(member.userId)}
                                    disabled={!selectable}
                                    aria-label={t2("team.management.selectMember", {
                                      defaultValue: "选择 {{name}}",
                                      name: member.displayName,
                                    })}
                                    data-action-ui-id="team.management-select-member"
                                    data-member-id={member.userId}
                                    data-member-role={member.role}
                                    onCheckedChange={(checked) => {
                                      if (!selectable) return;
                                      setSelectedMemberIds((prev) =>
                                        toggleMemberSelection(
                                          prev,
                                          member.userId,
                                          checked === true,
                                        ),
                                      );
                                    }}
                                  />
                                ) : (
                                  void 0
                                ),
                                quota: (
                                  <button
                                    type="button"
                                    className="max-w-full rounded-md text-left transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:outline-none"
                                    data-action-ui-id="team.management-member-quota-usage"
                                    data-member-id={member.userId}
                                    data-quota-mode={member.quota.mode}
                                    data-quota-limit={member.quota.limit ?? void 0}
                                    aria-label={t2("team.management.viewMemberUsage", {
                                      defaultValue: "查看 {{name}} 的用量",
                                      name: member.displayName,
                                    })}
                                    onClick={() =>
                                      navigateSubpage({
                                        type: "usage",
                                        member,
                                      })
                                    }
                                  >
                                    <TeamMemberQuotaUsageCell
                                      quota={member.quota}
                                      presentation="current"
                                      teamRemaining={teamRemaining}
                                    />
                                  </button>
                                ),
                                usage: (() => {
                                  const totalUsed = memberUsageByUserId.get(member.userId);
                                  return (
                                    <span
                                      className="tabular-nums"
                                      data-action-ui-id="team.management-member-total-used"
                                      data-member-id={member.userId}
                                    >
                                      {totalUsed === void 0 ? (
                                        <span className="text-muted-foreground">—</span>
                                      ) : (
                                        formatCreditAmount(totalUsed)
                                      )}
                                    </span>
                                  );
                                })(),
                                action: (
                                  <div
                                    className="grid w-full grid-cols-2 items-center gap-1"
                                    data-action-ui-id="team.management-member-actions"
                                  >
                                    <Button$1
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="w-full"
                                      hidden={currentTab !== "credits"}
                                      onClick={() =>
                                        navigateSubpage({
                                          type: "usage",
                                          member,
                                        })
                                      }
                                      data-action-ui-id="team.management-member-usage"
                                      data-member-id={member.userId}
                                      data-member-role={member.role}
                                    >
                                      {t2("team.management.usageDetail", {
                                        defaultValue: "明细",
                                      })}
                                    </Button$1>
                                    {canManage ? (
                                      <Button$1
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="col-start-2 w-full"
                                        onClick={() =>
                                          navigateSubpage({
                                            type: "settings",
                                            member,
                                          })
                                        }
                                        data-action-ui-id="team.management-member-settings"
                                        data-member-id={member.userId}
                                        data-member-role={member.role}
                                        data-can-change-quota={canChangeQuota ? "true" : "false"}
                                      >
                                        {t2("team.management.settings", {
                                          defaultValue: "设置",
                                        })}
                                      </Button$1>
                                    ) : (
                                      <Button$1
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="col-start-2 w-full font-normal text-muted-foreground"
                                        aria-label={t2("team.management.settings", {
                                          defaultValue: "设置",
                                        })}
                                        onClick={() =>
                                          dedupedToast.info(
                                            t2("team.management.memberSettingsUnavailable", {
                                              defaultValue: "当前成员暂无可用设置。",
                                            }),
                                          )
                                        }
                                        data-action-ui-id="team.management-member-settings-pending"
                                        data-member-id={member.userId}
                                        data-member-role={member.role}
                                        data-can-change-quota={canChangeQuota ? "true" : "false"}
                                      >
                                        —
                                      </Button$1>
                                    )}
                                  </div>
                                ),
                              };
                            })}
                          />
                        </InfiniteScrollContainer>
                      ) : null}
                    </section>
                  </>
                ) : null}
              </div>
              {currentTab === "ledger" && canViewTeamLedger ? (
                <TeamCreditPage open={open} scope={scope} ledgerScope="GROUP" />
              ) : null}
              {settingsMemberLive && detailQuery.data ? (
                <TeamMemberSettingsPage
                  scope={scope}
                  member={settingsMemberLive}
                  teamName={detailQuery.data.teamName}
                  teamRemaining={teamRemaining}
                  quotaMutationEnabled={activeTab === "credits" && mutationOpen && billingOpen}
                  onClose={closeSubpage}
                />
              ) : null}
              {usageMemberLive && detailQuery.data ? (
                <TeamMemberUsagePage
                  scope={scope}
                  member={usageMemberLive}
                  teamName={detailQuery.data.teamName}
                  teamRemaining={teamRemaining}
                  onClose={closeSubpage}
                />
              ) : null}
              {batchRemoveOpen && detailQuery.data ? (
                <BatchRemoveMembersDialog
                  scope={scope}
                  members={removePartition.selectedEligible}
                  teamName={detailQuery.data.teamName}
                  protectedNote={
                    removePartition.selectedIneligible.length > 0
                      ? t2("team.management.batchRemoveProtected", {
                          defaultValue:
                            "已自动排除 {{count}} 名不可移除成员（Owner / 自己 / 无权限）。",
                          count: removePartition.selectedIneligible.length,
                        })
                      : null
                  }
                  onClose={() => setBatchRemoveOpen(false)}
                  onComplete={(failedUserIds) => setSelectedMemberIds(new Set(failedUserIds))}
                />
              ) : null}
              {defaultQuotaOpen && detailQuery.data ? (
                <TeamDefaultQuotaPage
                  scope={scope}
                  quota={defaultQuotaSnapshot}
                  fallbackTeamRemaining={teamRemaining}
                  fallbackEligibleMemberCount={detailQuery.data.memberCount}
                  memberPageSize={pageSize}
                  onClose={closeSubpage}
                />
              ) : null}
              {dissolveTeamOpen && detailQuery.data ? (
                <DissolveTeamDialog
                  open={true}
                  scope={scope}
                  teamName={detailQuery.data.teamName}
                  onOpenChange={setDissolveTeamOpen}
                  onDissolved={(transfer) => {
                    if (transfer) onDissolveTransferSucceeded?.(transfer);
                    onOpenChange(false);
                  }}
                />
              ) : null}
              {leaveTeamOpen && detailQuery.data ? (
                <LeaveTeamDialog
                  open={true}
                  scope={scope}
                  teamName={detailQuery.data.teamName}
                  currentRole={detailQuery.data.currentRole}
                  memberCount={detailQuery.data.memberCount}
                  onOpenChange={setLeaveTeamOpen}
                  onLeft={() => onOpenChange(false)}
                />
              ) : null}
              {inviteOpen ? (
                isOverseas ? (
                  <InviteMembersPage
                    open={true}
                    scope={scope}
                    onOpenChange={(next2) => {
                      if (!next2) closeSubpage();
                    }}
                    onInvited={() => {
                      void membersQuery.refetch();
                      void inviteLinksQuery.refetch();
                    }}
                  />
                ) : (
                  <CreateInviteLinkPage
                    open={true}
                    scope={scope}
                    onOpenChange={(next2) => {
                      if (!next2) closeSubpage();
                    }}
                    onCreated={() => void inviteLinksQuery.refetch()}
                  />
                )
              ) : null}
              {detailQuery.data ? (
                <InviteLinkHistoryPage
                  open={inviteHistoryOpen}
                  teamName={detailQuery.data.teamName}
                  items={inviteLinks}
                  isPending={inviteLinksQuery.isPending}
                  isError={inviteLinksQuery.isError}
                  isStale={Boolean(
                    inviteLinksQuery.data &&
                    (inviteLinksQuery.isRefetchError || inviteLinksQuery.isError),
                  )}
                  isLoadingMore={inviteLinksQuery.isFetchingNextPage}
                  loadMoreError={inviteLinksQuery.isFetchNextPageError}
                  loadedBatchCount={inviteLinksQuery.data?.pages.length ?? 0}
                  hasMore={Boolean(inviteLinksQuery.hasNextPage)}
                  onOpenChange={(next2) => {
                    if (!next2) closeSubpage();
                  }}
                  onRetry={() => void inviteLinksQuery.refetch()}
                  onLoadMore={() => inviteLinksQuery.fetchNextPage()}
                />
              ) : null}
              {detailQuery.data ? (
                <TransferCreditPage
                  open={transferDialogOpen}
                  scope={scope}
                  teamName={detailQuery.data.teamName}
                  teamRemaining={teamRemaining}
                  onOpenChange={(next2) => {
                    if (!next2) closeSubpage();
                  }}
                />
              ) : null}
              {(isMemberView || currentTab === "members") && (canDissolveTeam || canLeaveTeam) ? (
                <DialogFooter className="shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6 sm:py-4">
                  {canLeaveTeam ? (
                    <Button$1
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setLeaveTeamOpen(true)}
                      data-action-ui-id="team.management-leave"
                    >
                      {t2("team.management.leave", {
                        defaultValue: "退出团队",
                      })}
                    </Button$1>
                  ) : null}
                  {canDissolveTeam ? (
                    <Button$1
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDissolveTeamOpen(true)}
                      data-action-ui-id="team.management-dissolve"
                    >
                      {t2("team.management.dissolve", {
                        defaultValue: "解散团队",
                      })}
                    </Button$1>
                  ) : null}
                </DialogFooter>
              ) : null}
            </div>
          </TeamDialogNavigationContext.Provider>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showTransferTermsDialog} onOpenChange={setShowTransferTermsDialog}>
        <AlertDialogContent
          data-action-ui-id="team.transfer-credit-terms-dialog"
          className="max-h-[60vh] !max-w-[calc(100%-2rem)] gap-4 p-4 text-xs/relaxed sm:!max-w-lg"
        >
          <AlertDialogHeader className="min-h-0 place-items-stretch gap-4 text-left">
            <AlertDialogTitle className="font-heading text-sm font-medium">
              {t2("team.transferCredit.terms.title", {
                defaultValue: "转移积分至你的其他账户",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="scrollbar-fade max-h-[calc(60vh-8rem)] overflow-y-auto overscroll-none whitespace-pre-line pr-2 text-left text-xs/relaxed text-muted-foreground [contain:paint] [scrollbar-gutter:stable]">
              <Trans
                t={t2}
                i18nKey="team.transferCredit.terms.description"
                components={{
                  rules: (
                    <button
                      type="button"
                      className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                      onClick={() => {
                        void openExternalUrl(
                          platform2,
                          getUserProtocolUrl(
                            runtimeConfig.region,
                            runtimeConfig.channel,
                            "pointsRules",
                          ),
                          {
                            source: "team.transfer-credit-terms-rules",
                          },
                        );
                      }}
                      data-action-ui-id="team.transfer-credit-terms-rules"
                    />
                  ),
                }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-action-ui-id="team.transfer-credit-terms-cancel">
              {t2("common.cancel", {
                defaultValue: "取消",
              })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void setGlobalConfigAsync((current2) => {
                  const existing =
                    current2.creditTransferTermsAccepted &&
                    typeof current2.creditTransferTermsAccepted === "object"
                      ? current2.creditTransferTermsAccepted
                      : {};
                  return {
                    ...current2,
                    creditTransferTermsAccepted: {
                      ...existing,
                      [creditTransferTermsScopeKey]: {
                        acceptedAt: Date.now(),
                      },
                    },
                  };
                }).then(() => {
                  setShowTransferTermsDialog(false);
                  navigateSubpage({
                    type: "transfer",
                  });
                });
              }}
              data-action-ui-id="team.transfer-credit-terms-confirm"
            >
              {t2("team.transferCredit.terms.confirm", {
                defaultValue: "同意并继续",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
