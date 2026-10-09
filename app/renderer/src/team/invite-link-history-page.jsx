// invite-link-history-page.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TeamPanelLoading } from "./team-panel-loading.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { TeamPanelStale } from "./team-panel-stale.jsx";
import { TeamPanelEmpty } from "./team-management-detail-loading.jsx";
import { InfiniteScrollContainer } from "./infinite-scroll-container.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageHeader,
  PageTitle,
} from "./page-content.jsx";
import { TeamPanelError } from "./team-panel-error.jsx";

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
                  <div
                    key={link2.inviteLinkId}
                    className="flex items-center gap-3 py-3 text-xs"
                  >
                    <Badge variant="secondary" className="shrink-0">
                      {t2(`team.role.${link2.role.toLowerCase()}`, {
                        defaultValue: link2.role,
                      })}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {link2.maskedUrl}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t2("team.management.inviteLinkExpiryAndUsage", {
                          defaultValue:
                            "有效期至 {{date}} · 已使用 {{used}} / {{limit}}",
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
                      {t2(
                        `team.inviteLinkStatus.${link2.status.toLowerCase()}`,
                        {
                          defaultValue: link2.status,
                        },
                      )}
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
