// team-member-usage-page.jsx
import { minCreditAmount, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useMediaModels } from "../generation/normalize-model-info.js";
import { formatCreditAmount } from "./team-panel-stale.jsx";
import { TeamManagementQuotaMetrics } from "./team-management-detail-loading.jsx";
import { CreditLedgerTable } from "./credit-ledger-table.jsx";
import { getBillingModelDisplayName } from "./billing-model-display-labels.js";
import { InfiniteScrollContainer } from "./infinite-scroll-container.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageHeader,
  PageTitle,
} from "./page-content.jsx";
import { useTeamTransactionsFeedQuery } from "./use-team-transactions-feed-query.jsx";

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

export function TeamMemberUsagePage({
  scope,
  member,
  teamName,
  teamRemaining,
  onClose,
}) {
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
  const transactions =
    transactionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
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
  const memberUsed = transactionHistoryComplete
    ? sumMemberCreditUsage(transactions)
    : null;
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
            <p className="truncate text-sm font-medium text-foreground">
              {member.displayName}
            </p>
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
            {member.permissions.viewUsage.allowed === false &&
            memberUsed === null ? (
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
                    description: t2(
                      `team.transaction.${transaction.category}`,
                      {
                        defaultValue: transaction.category,
                        ...transaction.localizationParams,
                      },
                    ),
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
