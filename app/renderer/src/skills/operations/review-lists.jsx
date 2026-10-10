// 运营后台的待审核与待发布列表。
import { useTranslation, reactExports, Loader2 } from "../../vendor.js";
import { Badge } from "../../infra/badge-variants.jsx";
import { Button } from "../../infra/dialog-content.jsx";
import { Select } from "../../assets/credit-query-keys.jsx";
import { SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../infra/select-content.jsx";
import { Checkbox } from "../../infra/checkbox.jsx";
import { FolderOpen } from "../../media-editing/package.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { formatOperationTime } from "./format.js";
import { publicationSections } from "./operator.js";
export function ReviewList({
  items,
  selected,
  busyId,
  loading,
  onSelect,
  onDetails,
  onRevealPackage,
  onTest,
  onPass,
  onReject,
  onApprove,
  categories,
  reviewers,
  role,
  onAssignReviewer,
  isZh,
}) {
  const { t, i18n } = useTranslation();
  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  if (items.length === 0)
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        {t("skills.operation.noSubmissions")}
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[1850px] text-xs">
        <div className="grid grid-cols-[28px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(190px,.8fr)_minmax(100px,.8fr)_minmax(145px,1.1fr)_minmax(128px,1fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(85px,.7fr)_minmax(460px,2fr)] items-center gap-2 border-b border-border px-3 py-2 font-medium text-muted-foreground">
          <span aria-hidden="true" />
          <span>{t("skills.operation.skillId")}</span>
          <span>{t("skills.operation.skillDisplayName")}</span>
          <span>{t("skills.operation.categories")}</span>
          <span>{t("skills.operation.submitter")}</span>
          <span>{t("skills.operation.uid")}</span>
          <span>{t("skills.operation.updatedAt")}</span>
          <span>{t("skills.operation.reviewType")}</span>
          <span>{t("skills.operation.reviewer")}</span>
          <span>{t("skills.operation.reviewStatus")}</span>
          <span>{t("skills.operation.actions")}</span>
        </div>
        {items.map((item) => {
          const submission = item.submission;
          if (!submission) return null;
          const id = submission.submission_id;
          const busy = busyId === id;
          const categoryNames = submission.categories.map((code) => {
            const category = categories.find(
              (candidate) => candidate.tag_type === "category" && candidate.category === code,
            );
            return category ? (isZh ? category.cn_name : category.en_name) : code;
          });
          const reviewerName =
            reviewers.find((reviewer) => reviewer.uid === item.reviewer_uid)?.name ||
            item.reviewer_name ||
            "";
          return (
            <article
              key={id}
              className="grid grid-cols-[28px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(190px,.8fr)_minmax(100px,.8fr)_minmax(145px,1.1fr)_minmax(128px,1fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(85px,.7fr)_minmax(460px,2fr)] items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
            >
              {submission.status === "pending" ? (
                <Checkbox
                  size="sm"
                  checked={selected.includes(id)}
                  onCheckedChange={(checked) =>
                    onSelect(checked ? [...selected, id] : selected.filter((value) => value !== id))
                  }
                />
              ) : (
                <span />
              )}
              <div className="min-w-0 truncate font-medium" title={submission.skill_name}>
                {submission.skill_name}
              </div>
              <span className="min-w-0 truncate" title={submission.display_name}>
                {submission.display_name}
              </span>
              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {categoryNames.length > 0 ? (
                  categoryNames.slice(0, 3).map((name, index) => (
                    <Badge
                      key={`${submission.submission_id}-${submission.categories[index]}`}
                      variant="outline"
                      className="h-5 shrink-0 px-1.5 text-[10px]"
                    >
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <span className="min-w-0 truncate" title={item.submitter_name || item.submitter_uid}>
                {item.submitter_name || item.submitter_uid || "—"}
              </span>
              <span className="min-w-0 truncate text-muted-foreground" title={item.submitter_uid}>
                {item.submitter_uid || "—"}
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                {formatOperationTime(submission.updated_at || submission.created_at, i18n.language)}
              </span>
              <Badge variant="default" className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]">
                {item.submission_type === "update"
                  ? t("skills.operation.reviewTypeUpdate")
                  : t("skills.operation.reviewTypeNew")}
              </Badge>
              {role === "advanced" && submission.status === "pending" ? (
                <Select
                  value={item.reviewer_uid || void 0}
                  disabled={busy}
                  onValueChange={(value) => {
                    if (value !== null) onAssignReviewer(item, value);
                  }}
                >
                  <SelectTrigger
                    className="h-7 min-w-0 w-full px-2 text-xs"
                    data-action-ui-id={`operations-reviewer-${id}`}
                  >
                    <SelectValue placeholder={t("skills.operation.reviewerUnassigned")}>
                      {reviewerName || void 0}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {reviewers.map((reviewer) => (
                      <SelectItem key={reviewer.uid} value={reviewer.uid}>
                        {reviewer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="min-w-0 truncate" title={item.reviewer_name}>
                  {item.reviewer_name || "—"}
                </span>
              )}
              <Badge
                variant={
                  submission.status === "pending"
                    ? "outline"
                    : submission.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
                className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]"
              >
                {submission.status === "pending"
                  ? t("skills.operation.reviewStatusPending")
                  : submission.status === "rejected"
                    ? t("skills.operation.reviewStatusRejected")
                    : t("skills.operation.reviewStatusApproved")}
              </Badge>
              <div className="flex min-w-max items-center gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  className="h-6 shrink-0 px-2 text-[11px]"
                  onClick={() => onDetails(item)}
                  data-action-ui-id={`operations-review-details-${id}`}
                >
                  {t("skills.operation.viewDetails")}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="link"
                  className="h-6 shrink-0 px-1 text-[11px]"
                  disabled={busy}
                  onClick={() => onRevealPackage(item)}
                  title={item.source_file}
                >
                  <FolderOpen size={12} strokeWidth={1.5} />
                  {t("skills.operation.sourceFile")}
                </Button>
                {submission.status === "pending" && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => onTest(item)}
                    data-action-ui-id={`operations-review-test-${id}`}
                  >
                    {t("skills.operation.testDesign")}
                  </Button>
                )}
                {submission.status === "pending" && item.design_status === "testing" && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => onPass(item)}
                    data-action-ui-id={`operations-review-pass-${id}`}
                  >
                    {t("skills.operation.markPassed")}
                  </Button>
                )}
                {submission.status === "pending" && (
                  <Button
                    size="xs"
                    variant="destructive"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => onReject(item)}
                    data-action-ui-id={`operations-review-reject-${id}`}
                  >
                    {t("skills.operation.reject")}
                  </Button>
                )}
                {submission.status === "pending" && (
                  <Button
                    size="xs"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    disabled={busy}
                    onClick={() => onApprove(item)}
                    data-action-ui-id={`operations-review-approve-${id}`}
                  >
                    {t("skills.operation.approveToConfig")}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
export function ReadyList({
  items,
  selected,
  drafts,
  categories,
  onSelect,
  onDraftChange,
  onDetails,
  onPublish,
}) {
  const { t, i18n } = useTranslation();
  const [publishingId, setPublishingId] = reactExports.useState("");
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">{t("skills.operation.noReady")}</p>;
  const handlePublish = async (item) => {
    const id = item.submission?.submission_id;
    if (!id || publishingId) return;
    setPublishingId(id);
    try {
      await onPublish(item);
    } finally {
      setPublishingId("");
    }
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1520px] table-fixed text-left text-xs">
        <colgroup>
          <col className="w-9" />
          <col className="w-[180px]" />
          <col className="w-[180px]" />
          <col className="w-[180px]" />
          <col className="w-[140px]" />
          <col className="w-[150px]" />
          <col className="w-[150px]" />
          <col className="w-[140px]" />
          <col className="w-[150px]" />
          <col className="w-[100px]" />
          <col className="w-[300px]" />
        </colgroup>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">{t("project.selectRow.pick")}</span>
            </th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.skillId")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.skillDisplayName")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.categories")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.submitter")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.uid")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.updatedAt")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.reviewer")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.reviewType")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.publicationStatus")}</th>
            <th className="px-3 py-2 font-medium">{t("skills.operation.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const submission = item.submission;
            if (!submission) return null;
            const id = submission.submission_id;
            const draft = drafts[id];
            if (!draft) return null;
            const categoryNames = draft.categories.map((code) => {
              const category = categories.find((candidate) => candidate.category === code);
              return category
                ? i18n.language.startsWith("zh")
                  ? category.cn_name
                  : category.en_name
                : code;
            });
            return (
              <tr key={id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 align-middle">
                  <Checkbox
                    size="sm"
                    checked={selected.includes(id)}
                    onCheckedChange={(checked) =>
                      onSelect(
                        checked ? [...selected, id] : selected.filter((value) => value !== id),
                      )
                    }
                  />
                </td>
                <td className="truncate px-3 py-2 font-medium" title={submission.skill_name}>
                  {submission.skill_name}
                </td>
                <td className="truncate px-3 py-2" title={submission.display_name}>
                  {submission.display_name}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 overflow-hidden">
                    {categoryNames.length > 0 ? (
                      categoryNames.slice(0, 3).map((name, index) => (
                        <Badge
                          key={`${id}-${draft.categories[index]}`}
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 text-[10px]"
                        >
                          {name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td
                  className="truncate px-3 py-2"
                  title={item.submitter_name || item.submitter_uid}
                >
                  {item.submitter_name || item.submitter_uid || "—"}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground" title={item.submitter_uid}>
                  {item.submitter_uid || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {formatOperationTime(
                    submission.updated_at || submission.created_at,
                    i18n.language,
                  )}
                </td>
                <td className="truncate px-3 py-2" title={item.reviewer_name || item.reviewer_uid}>
                  {item.reviewer_name || item.reviewer_uid || "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="default"
                    className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]"
                  >
                    {item.submission_type === "update"
                      ? t("skills.operation.reviewTypeUpdate")
                      : t("skills.operation.reviewTypeNew")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="secondary"
                    className="h-5 w-fit whitespace-nowrap px-1.5 text-[10px]"
                  >
                    {t("skills.operation.readyStatus")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-6 shrink-0 px-2 text-[11px]"
                      onClick={() => onDetails(item)}
                    >
                      {t("skills.operation.viewDetails")}
                    </Button>
                    <Select
                      value={draft.display_section || void 0}
                      onValueChange={(value) =>
                        value &&
                        onDraftChange(id, {
                          ...draft,
                          display_section: value,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 w-[126px] shrink-0 px-2 text-[11px]">
                        <SelectValue
                          placeholder={t("skills.operation.publishSectionPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(publicationSections).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {t(label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="xs"
                      className="h-6 shrink-0 px-2 text-[11px]"
                      disabled={publishingId !== "" || !draft.display_section}
                      onClick={() => void handlePublish(item)}
                      data-action-ui-id={`operations-publish-${id}`}
                    >
                      {t("skills.operation.publishAction")}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
