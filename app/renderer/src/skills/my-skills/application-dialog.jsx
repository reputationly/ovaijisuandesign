// 技能上架申请弹窗。
import { useTranslation } from "../../vendor.js";
import { DialogHeader, Button, Dialog, DialogContent, DialogFooter } from "../../infra/dialog-content.jsx";
import { Badge, DialogTitle, DialogDescription } from "../../infra/badge-variants.jsx";
import { selectSkillStructuredInfo } from "../../generation/normalize-skill-detail-metadata.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import { MY_SKILL_STATUSES, mySkillStatus } from "./helpers.js";
export function SkillApplicationDialog({ open, onOpenChange, submission, taxonomy = [] }) {
  const { t, i18n } = useTranslation();
  const status = MY_SKILL_STATUSES[mySkillStatus(submission, "error")];
  const info =
    submission?.structuredInfo &&
    selectSkillStructuredInfo(submission.structuredInfo, i18n.language).info;
  const categoryLabel = (code) => {
    const item = taxonomy.find((entry) => entry.category === code);
    return item ? (i18n.language.startsWith("zh") ? item.cn_name : item.en_name) : code;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-action-ui-id="skill-application-dialog">
        <DialogHeader>
          <DialogTitle>{t("skills.mine.viewApplication", "View application")}</DialogTitle>
          <DialogDescription>
            {t("skills.mine.applicationReadOnly", "Submission information and review progress.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto break-words">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">
              {submission?.displayName || submission?.skillName}
            </h3>
            <Badge variant="secondary">{t(status[0], status[1])}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {submission?.skillName}
            {submission?.packageVersion ? ` · v${submission.packageVersion}` : ""}
          </p>
          {submission && (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.creator", "Creator")}
                </dt>
                <dd>{submission.creator}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.categories", "Category")}
                </dt>
                <dd>{submission.categories.map(categoryLabel).join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.stage", "Creation stage")}
                </dt>
                <dd>{categoryLabel(submission.stage)}</dd>
              </div>
              {submission.coverUrl && (
                <div>
                  <a
                    className="text-xs underline"
                    href={submission.coverUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("skills.submission.cover", "Cover")}
                  </a>
                </div>
              )}
              {submission.showcase?.map((url) => (
                <div key={url}>
                  <a className="text-xs underline" href={url} target="_blank" rel="noreferrer">
                    {t("skills.submission.showcase", "Showcase")}
                  </a>
                </div>
              ))}
            </dl>
          )}
          {submission?.reviewNote && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium">
                {t("skills.mine.reviewNote", "Review feedback")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{submission.reviewNote}</p>
            </div>
          )}
          {info && (
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.summary", "One-line summary")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">{info.summary}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.bestFor", "Best For")}
                </dt>
                <dd className="mt-1">{info.best_for.join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.howToUse", "How to Use")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">{info.how_to_use}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("skills.submission.outputs", "Outputs")}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap">{info.outputs}</dd>
              </div>
            </dl>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
