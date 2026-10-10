// 「我的技能」视图：单个条目与整体列表。
import { useTranslation, reactExports, getRuntimeConfig, MoreHorizontal } from "../../vendor.js";
import { Switch } from "../../generation/select-content.jsx";
import { AlertDialog, Button, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../infra/dialog-content.jsx";
import { AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../infra/badge-variants.jsx";
import { PageStateBoundary } from "../../assets/page-state-boundary.jsx";
import { SkillCoverMedia } from "../../generation/use-mention-models.jsx";
import { Card } from "../../media-editing/scroll-bar.jsx";
import { DropdownMenu } from "../../vendor-inline/vscode-base/graph.jsx";
import { DropdownMenuSeparator } from "../../workspace/shortcut-hint.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  MY_SKILL_REVIEW_ACTIONS,
  MY_SKILL_STATUSES,
  mySkillCover,
  mySkillStatus,
  mySkillText,
} from "./helpers.js";
function MySkillItem({
  skill,
  submission,
  submissionState,
  coverUrl,
  onEdit,
  onOffline,
  onToggle,
  onDetail,
  onTryItOut,
  onExport,
  onShare,
  onUninstall,
  updateInfo,
  onUpdate,
  updating,
  onCoverError,
  onRefreshSubmissions,
}) {
  const { t, i18n } = useTranslation();
  const [failedUrl, setFailedUrl] = reactExports.useState("");
  const [retrying, setRetrying] = reactExports.useState(false);
  const [attempt, setAttempt] = reactExports.useState(0);
  const text = mySkillText(skill, submission, i18n.language);
  const local = skill.source === "user";
  const status = mySkillStatus(submission, submissionState);
  const statusLabel = MY_SKILL_STATUSES[status];
  const reviewAction =
    status === "private" || status === "rejected" || status === "offline"
      ? MY_SKILL_REVIEW_ACTIONS[status]
      : null;
  const canManageSubmission = submissionState === "ready";
  const handleRetryCover = async () => {
    setRetrying(true);
    try {
      await onRefreshSubmissions();
    } finally {
      setFailedUrl("");
      setAttempt((value) => value + 1);
      setRetrying(false);
    }
  };
  return (
    <Card
      className="gap-0 py-0"
      data-action-ui-id="skills-mine-item"
      data-skill-name={skill.name}
      data-cover={coverUrl ? "true" : "false"}
    >
      {coverUrl && (
        <div
          className="relative aspect-video overflow-hidden bg-muted"
          data-layout-slot="skills-mine-cover"
        >
          {failedUrl === coverUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <p className="text-xs">{t("skills.mine.coverUnavailable", "Cover unavailable")}</p>
              <Button
                size="sm"
                variant="outline"
                loading={retrying}
                onClick={() => void handleRetryCover()}
                data-action-ui-id={`skills-mine-retry-cover-${skill.name}`}
              >
                {t("common.retry", "Retry")}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="block h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label={t("skills.mine.viewDetails", {
                name: text.name,
                defaultValue: "View {{name}} details",
              })}
              onClick={() => onDetail(skill)}
              data-action-ui-id={`skills-mine-cover-${skill.name}`}
            >
              <SkillCoverMedia
                key={`${coverUrl}:${attempt}`}
                url={coverUrl}
                alt={text.name}
                className="h-full w-full object-cover"
                onError={() => {
                  setFailedUrl(coverUrl);
                  if (submission?.coverUrl?.trim() === coverUrl) onCoverError();
                }}
              />
            </button>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-4" data-layout-slot="skills-mine-info">
        <div className="flex min-w-0 flex-col gap-1.5">
          <button
            type="button"
            className="truncate text-left font-heading text-base/5 font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={text.name}
            onClick={() => onDetail(skill)}
            data-action-ui-id={`skills-mine-detail-${skill.name}`}
          >
            {text.name}
          </button>
          {text.summary && (
            <p className="line-clamp-2 min-h-10 text-sm/5 text-muted-foreground">{text.summary}</p>
          )}
        </div>
        <div
          className="mt-auto flex flex-wrap items-center justify-between gap-3"
          data-layout-slot="skills-mine-footer"
        >
          {local && submission?.reviewNote ? (
            <Button
              variant="link"
              size="sm"
              className={`h-auto min-w-0 max-w-full whitespace-normal p-0 text-left text-xs font-normal underline underline-offset-4 ${status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}
              aria-label={`${t(statusLabel[0], statusLabel[1])} · ${t("skills.mine.reviewNote", "Review feedback")}`}
              onClick={() => onEdit(skill.name, "view")}
              data-action-ui-id={`skills-mine-review-note-${skill.name}`}
            >
              {t(statusLabel[0], statusLabel[1])}
            </Button>
          ) : (
            <span className="text-xs/5 text-muted-foreground">
              {local ? t(statusLabel[0], statusLabel[1]) : t("skills.mine.installed", "Installed")}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {updateInfo && onUpdate && (
              <Button
                variant="outline"
                size="sm"
                loading={updating}
                disabled={updating}
                onClick={() => onUpdate(skill.name)}
                data-action-ui-id={`skills-mine-update-${skill.name}`}
              >
                {t("skills.market.update", "Update")}
              </Button>
            )}
            {onTryItOut && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTryItOut(skill)}
                data-action-ui-id={`skills-mine-use-${skill.name}`}
              >
                {t("skills.mine.use", "Use")}
              </Button>
            )}
            <Switch
              checked={skill.enabled}
              onCheckedChange={(checked) => onToggle(skill.name, checked)}
              aria-label={t("skills.mine.enableSkill", {
                name: text.name,
                defaultValue: "Enable {{name}}",
              })}
              data-action-ui-id={`skills-mine-toggle-${skill.name}`}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("skills.mine.moreActions", {
                      name: text.name,
                      defaultValue: "More actions for {{name}}",
                    })}
                    data-action-ui-id={`skills-mine-more-${skill.name}`}
                  />
                }
              >
                <MoreHorizontal size={16} strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDetail(skill)}>
                  {t("skills.mine.details", "View details")}
                </DropdownMenuItem>
                {local && (
                  <DropdownMenuItem
                    disabled={!canManageSubmission || status === "pending" || status === "approved"}
                    onClick={() => onEdit(skill.name, status === "published" ? "review" : "edit")}
                    data-action-ui-id={`skills-created-edit-${skill.name}`}
                  >
                    {status === "published"
                      ? t("skills.mine.editPublished", "Edit and request update")
                      : t("skills.mine.editInformation", "Edit information")}
                  </DropdownMenuItem>
                )}
                {local && reviewAction && (
                  <DropdownMenuItem
                    disabled={!canManageSubmission}
                    onClick={() => onEdit(skill.name, "review")}
                    data-action-ui-id={`skills-created-apply-review-${skill.name}`}
                  >
                    {t(reviewAction[0], reviewAction[1])}
                  </DropdownMenuItem>
                )}
                {local && submission && (
                  <DropdownMenuItem
                    onClick={() => onEdit(skill.name, "view")}
                    data-action-ui-id={`skills-created-view-application-${skill.name}`}
                  >
                    {t("skills.mine.viewApplication", "View application")}
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <DropdownMenuItem onClick={() => onExport(skill.name)}>
                    {t("skills.download", "Download")}
                  </DropdownMenuItem>
                )}
                {!local && onShare && (
                  <DropdownMenuItem onClick={() => onShare(skill.name)}>
                    {t("skills.share", "Share")}
                  </DropdownMenuItem>
                )}
                {((local && status === "published") || (!local && onUninstall)) && (
                  <DropdownMenuSeparator />
                )}
                {local && status === "published" && (
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canManageSubmission}
                    onClick={() => onOffline(skill.name)}
                    data-action-ui-id={`skills-created-offline-${skill.name}`}
                  >
                    {t("skills.mine.offline", "Offline")}
                  </DropdownMenuItem>
                )}
                {!local && onUninstall && (
                  <DropdownMenuItem variant="destructive" onClick={() => onUninstall(skill.name)}>
                    {t("skills.market.uninstall", "Uninstall")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}
export function MySkillsView({
  skills,
  totalCount,
  hasFilters,
  onClearFilters,
  submissions,
  submissionState,
  onCreate,
  onEdit,
  onOffline,
  onToggle,
  onDetail,
  onExport,
  onShare,
  onTryItOut,
  onUninstall,
  skillUpdates,
  onUpdate,
  updatingSet,
  onGoToCommunity,
  onRefreshSubmissions,
  onCoverError,
}) {
  const { t } = useTranslation();
  const [offlineTarget, setOfflineTarget] = reactExports.useState("");
  const overseas = getRuntimeConfig().region === "overseas";
  const entries = skills.map((skill) => {
    const submission = skill.source === "user" ? submissions.get(skill.name) : void 0;
    return {
      skill,
      submission,
      coverUrl: mySkillCover(skill, submission, overseas),
    };
  });
  const groups = [
    {
      key: "covers",
      label: t("skills.mine.withCover", "With covers"),
      items: entries.filter((entry) => entry.coverUrl),
      layout: "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3",
    },
    {
      key: "compact",
      label: t("skills.mine.withoutCover", "Without covers"),
      items: entries.filter((entry) => !entry.coverUrl),
      layout: "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3",
    },
  ];
  const filteredEmpty = hasFilters && totalCount > 0;
  return (
    <div className="flex flex-col gap-4" data-layout-slot="skills-mine-content">
      {(submissionState === "error" || submissionState === "signed-out") && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          <span>
            {submissionState === "signed-out"
              ? t(
                  "skills.mine.signInForStatus",
                  "Sign in to view submission status. Local Skills remain available.",
                )
              : t(
                  "skills.mine.statusUnavailable",
                  "Submission status could not be refreshed. Your Skills remain available.",
                )}
          </span>
          {submissionState === "error" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onRefreshSubmissions()}
              data-action-ui-id="skills-mine-retry-submissions"
            >
              {t("common.retry", "Retry")}
            </Button>
          )}
        </div>
      )}
      <PageStateBoundary
        empty={skills.length === 0}
        emptyOptions={{
          title: filteredEmpty
            ? t("skills.mine.noMatches", "No matching Skills")
            : t("skills.mine.empty", "No Skills yet"),
          description: filteredEmpty
            ? t("skills.mine.noMatchesHint", "Try a different search or clear your filters.")
            : t("skills.mine.emptyHint", "Create a Skill or install one from the community."),
          actions: filteredEmpty
            ? [
                {
                  key: "clear-filters",
                  variant: "default",
                  label: t("skills.mine.clearFilters", "Clear filters"),
                  onClick: onClearFilters,
                },
              ]
            : [
                {
                  key: "create",
                  variant: "default",
                  label: t("skills.header.createSkill", "Create Skill"),
                  onClick: onCreate,
                },
                {
                  key: "community",
                  variant: "outline",
                  label: t("skills.empty.goToCommunity", "Explore community"),
                  onClick: onGoToCommunity,
                },
              ],
        }}
      >
        <div className="flex flex-col gap-6">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section
                key={group.key}
                className="flex flex-col gap-3"
                aria-label={group.label}
                data-layout-slot={`skills-mine-${group.key}`}
              >
                <div className={group.layout}>
                  {group.items.map(({ skill, submission, coverUrl }) => (
                    <MySkillItem
                      key={skill.name}
                      skill={skill}
                      submission={submission}
                      submissionState={submissionState}
                      coverUrl={coverUrl}
                      onEdit={onEdit}
                      onOffline={setOfflineTarget}
                      onToggle={onToggle}
                      onDetail={onDetail}
                      onTryItOut={onTryItOut}
                      onExport={onExport}
                      onShare={onShare}
                      onUninstall={onUninstall}
                      updateInfo={skillUpdates.get(skill.name)}
                      onUpdate={onUpdate}
                      updating={updatingSet.has(skill.name)}
                      onCoverError={onCoverError}
                      onRefreshSubmissions={onRefreshSubmissions}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      </PageStateBoundary>
      <AlertDialog open={!!offlineTarget} onOpenChange={(open) => !open && setOfflineTarget("")}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("skills.mine.offlineTitle", "Offline this Skill?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "skills.mine.offlineAndDisableDesc",
                "This removes the Skill from the community and disables it locally. You can edit it and request review again later.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              data-action-ui-id="skills-created-offline-confirm"
              onClick={() => {
                const target = offlineTarget;
                setOfflineTarget("");
                void onOffline(target);
              }}
            >
              {t("skills.mine.offline", "Offline")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
