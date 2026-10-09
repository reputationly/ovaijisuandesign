// 运营后台的投稿详情弹窗。
import {
  h as useTranslation,
  gj as DialogHeader,
  fM as Button,
  mQ as normalizeSkillDetailMetadata,
  as as Dialog,
  at as DialogContent,
  g8 as DialogTitle,
  g9 as DialogDescription,
  kS as DialogFooter,
  iX as Label,
  iY as Select,
  iZ as SelectTrigger,
  i_ as SelectValue,
  i$ as SelectContent,
  j0 as SelectItem,
  f as Input,
  kR as Textarea,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
export function SubmissionDetailsDialog({
  readOnly = false,
  item,
  draft,
  busy,
  isZh,
  categories,
  onDraftChange,
  onOpenChange,
  onSave,
  errors,
}) {
  const { t } = useTranslation();
  const submission = item?.submission;
  const showcase = normalizeSkillDetailMetadata({
    ...submission,
  }).showcase;
  const editable =
    !readOnly && (submission?.status === "pending" || submission?.status === "published");
  const selectedStage = categories.find(
    (category) => category.tag_type === "stage" && category.category === draft.stage,
  );
  const update = (key, value) =>
    onDraftChange({
      ...draft,
      [key]: value,
    });
  return (
    <Dialog open={Boolean(submission)} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{t("skills.operation.skillDetails")}</DialogTitle>
          <DialogDescription>{t("skills.operation.detailsHint")}</DialogDescription>
        </DialogHeader>
        {(item?.reviewer_name || item?.reviewed_at || submission?.review_note) && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {item?.reviewer_name && (
              <p>
                {t("skills.operation.reviewer")}
                {": "}
                {item.reviewer_name}
              </p>
            )}
            {Boolean(item?.reviewed_at) && (
              <p>
                {t("skills.operation.reviewedAt")}:{" "}
                {new Date(Number(item?.reviewed_at)).toLocaleString()}
              </p>
            )}
            {submission?.review_note && (
              <p>
                {t("skills.operation.rejectionReason")}
                {": "}
                {submission.review_note}
              </p>
            )}
          </div>
        )}
        <fieldset disabled={!editable} className="grid grid-cols-2 gap-4">
          <Field label={t("skills.operation.skillName")}>
            <Input value={submission?.skill_name ?? ""} disabled={true} />
          </Field>
          <Field label={t("skills.operation.packageVersion")}>
            <Input
              aria-invalid={Boolean(errors.packageVersion)}
              value={draft.packageVersion}
              onChange={(event) => update("packageVersion", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.sourceFile")} className="col-span-2">
            <div className="space-y-2">
              <Input value={item?.source_file ?? ""} disabled={true} />
              <Input
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => update("packageFile", event.target.files?.[0])}
              />
              {draft.packageFile && (
                <p className="text-xs text-muted-foreground">{draft.packageFile.name}</p>
              )}
            </div>
          </Field>
          <Field label={t("skills.operation.displayName")}>
            <Input
              aria-invalid={Boolean(errors.displayName)}
              value={draft.displayName}
              onChange={(event) => update("displayName", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.creator")}>
            <Input
              aria-invalid={Boolean(errors.creator)}
              value={draft.creator}
              onChange={(event) => update("creator", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.summary")} className="col-span-2">
            <Textarea
              aria-invalid={Boolean(errors.summary)}
              value={draft.summary}
              onChange={(event) => update("summary", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.bestFor")}>
            <Textarea
              aria-invalid={Boolean(errors.bestFor)}
              value={draft.bestFor}
              onChange={(event) => update("bestFor", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.howToUse")}>
            <Textarea
              aria-invalid={Boolean(errors.howToUse)}
              value={draft.howToUse}
              onChange={(event) => update("howToUse", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.outputs")} className="col-span-2">
            <Textarea
              aria-invalid={Boolean(errors.outputs)}
              value={draft.outputs}
              onChange={(event) => update("outputs", event.target.value)}
            />
          </Field>
          <Field label={t("skills.operation.cover")} error={errors.hasCover}>
            <div className="space-y-2">
              {submission?.cover_url && !draft.coverFile && (
                <img
                  src={submission.cover_url}
                  alt=""
                  className="aspect-video w-full rounded-lg border border-border object-cover"
                />
              )}
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => update("coverFile", event.target.files?.[0])}
              />
              {draft.coverFile && (
                <p className="text-xs text-muted-foreground">{draft.coverFile.name}</p>
              )}
            </div>
          </Field>
          <Field label={t("skills.operation.showcase")}>
            <div className="space-y-2">
              {showcase?.[0] && !draft.showcaseFile && (
                // biome-ignore lint/a11y/useMediaCaption: creator-provided previews do not include a caption track.
                <video
                  src={showcase[0]}
                  className="aspect-video w-full rounded-lg border border-border object-cover"
                  controls={true}
                  preload="metadata"
                />
              )}
              <Input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) => update("showcaseFile", event.target.files?.[0])}
              />
              {draft.showcaseFile && (
                <p className="text-xs text-muted-foreground">{draft.showcaseFile.name}</p>
              )}
            </div>
          </Field>
          <Field
            label={t("skills.operation.categories")}
            className="col-span-2"
            error={errors.categories}
          >
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((item2) => item2.tag_type === "category")
                .map((category) => {
                  const active = draft.categories.includes(category.category);
                  return (
                    <Button
                      key={category.category}
                      type="button"
                      size="xs"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        update(
                          "categories",
                          active
                            ? draft.categories.filter((value) => value !== category.category)
                            : draft.categories.length < 3
                              ? [...draft.categories, category.category]
                              : draft.categories,
                        )
                      }
                    >
                      {isZh ? category.cn_name : category.en_name}
                    </Button>
                  );
                })}
            </div>
          </Field>
          <Field label={t("skills.operation.stage")} className="col-span-2" error={errors.stage}>
            <Select value={draft.stage} onValueChange={(value) => value && update("stage", value)}>
              <SelectTrigger>
                <SelectValue>
                  {selectedStage ? (isZh ? selectedStage.cn_name : selectedStage.en_name) : void 0}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((item2) => item2.tag_type === "stage")
                  .map((stage) => (
                    <SelectItem key={stage.category} value={stage.category}>
                      {isZh ? stage.cn_name : stage.en_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          {editable && (
            <Button loading={busy} onClick={onSave} data-action-ui-id="operations-details-save">
              {t("common.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function Field({ label, className, children, error }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
