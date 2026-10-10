// 运营后台主视图：待审、待发布、已发布与分类管理的容器。
import { useTranslation, reactExports, Plus, X$7 as X, Loader2, ChevronLeft, ChevronRight$1 as ChevronRight, usePlatform, Check } from "../../vendor.js";
import { dedupedToast } from "../../infra/agent-http-client.js";
import { useNavigateToWorkspace } from "../../workspace/use-deep-link-router.js";
import { homeService } from "../../workspace/home-service.jsx";
import { workspaceRuntimeFromOpenResult } from "../../vendor-inline/vscode-base/linked-list.js";
import { toastWorkspaceOpenResult } from "../../workspace/toast-workspace-open-result.js";
import { DialogHeader, Button, Dialog, DialogContent, DialogFooter } from "../../infra/dialog-content.jsx";
import { Switch } from "../../generation/select-content.jsx";
import { Trash2, Settings2 } from "../../media-editing/package.jsx";
import { Badge, DialogTitle, DialogDescription, Textarea } from "../../infra/badge-variants.jsx";
import { normalizeSkillDetailMetadata, selectSkillStructuredInfo } from "../../generation/normalize-skill-detail-metadata.js";
import { Label } from "../../team/use-wallet-query.jsx";
import { Select } from "../../assets/credit-query-keys.jsx";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Input3 as Input } from "../../infra/select-content.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../workspace/shortcut-hint.jsx";
import { Checkbox } from "../../infra/checkbox.jsx";
import { GatewayHttpError } from "../../infra/gateway-http-error.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  hasSubmissionShowcase,
  normalizeSubmissionShowcase,
  uploadCreatorPlanAsset,
} from "../creator-plan/data.js";
import { BatchPublishDialog } from "./batch-publish-dialog.jsx";
import {
  BatchPublicationValidationError,
  buildBatchPublications,
  publicationSections,
  publicationValidationMessage,
  useOperatorWorkflow,
} from "./operator.js";
import {
  OperationsPublishedPanel,
  PublishedSubmissionList,
  SubmitterFilter,
} from "./published-panel.jsx";
import { ReadyList, ReviewList } from "./review-lists.jsx";
import { Field, SubmissionDetailsDialog } from "./submission-details-dialog.jsx";
import {
  createTaxonomyOrderMap,
  hasDuplicateEnabledTaxonomyOrders,
  normalizeCategoryWeights,
  taxonomyItemKey,
  taxonomyItemsForConfiguration,
} from "./taxonomy.js";
import { validateReviewMetadata } from "../review-rules.js";
const emptyTaxonomyDraft = () => ({
  code: "",
  cnName: "",
  enName: "",
});
const emptyDraft = {
  structuredInfo: {},
  contentLocale: "zh-CN",
  skillName: "",
  displayName: "",
  summary: "",
  bestFor: "",
  howToUse: "",
  outputs: "",
  categories: [],
  stage: "",
  creator: "",
  packageVersion: "",
};
export function OperationsView({ role, onExit }) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const workflow = useOperatorWorkflow();
  const navigateToWorkspace = useNavigateToWorkspace();
  const platform = usePlatform();
  const [tab, setTab] = reactExports.useState("review");
  const [reviewFilter, setReviewFilter] = reactExports.useState("all");
  const [reviewStatus, setReviewStatus] = reactExports.useState("pending");
  const [submitterFilter, setSubmitterFilter] = reactExports.useState({
    name: "",
    uid: "",
  });
  const [reviewerUid, setReviewerUid] = reactExports.useState("all");
  const [selected, setSelected] = reactExports.useState([]);
  const [publishDialogOpen, setPublishDialogOpen] = reactExports.useState(false);
  const [activeSubmission, setActiveSubmission] = reactExports.useState(null);
  const [draft, setDraft] = reactExports.useState(emptyDraft);
  const [rejecting, setRejecting] = reactExports.useState(null);
  const [rejectNote, setRejectNote] = reactExports.useState("");
  const [busyId, setBusyId] = reactExports.useState("");
  const [categoryOrders, setCategoryOrders] = reactExports.useState(new Map());
  const [publicationDrafts, setPublicationDrafts] = reactExports.useState({});
  const [reviewPage, setReviewPage] = reactExports.useState(1);
  const [readyPage, setReadyPage] = reactExports.useState(1);
  const [publicationStatus, setPublicationStatus] = reactExports.useState("approved");
  const [detailErrors, setDetailErrors] = reactExports.useState({});
  const [newTaxonomyDrafts, setNewTaxonomyDrafts] = reactExports.useState({
    category: emptyTaxonomyDraft(),
    stage: emptyTaxonomyDraft(),
  });
  const [addingTaxonomyType, setAddingTaxonomyType] = reactExports.useState(null);
  const reviewPageSize = 20;
  const loadReview = reactExports.useCallback(async () => {
    if (tab === "configuration" || tab === "published") return;
    await workflow.fetchSubmissions({
      status: tab === "ready" ? publicationStatus : "all",
      submissionType: tab === "review" && reviewFilter !== "all" ? reviewFilter : void 0,
      submitterUid: submitterFilter.uid || void 0,
      submitterName: submitterFilter.name || void 0,
      reviewerUid: tab === "review" && reviewerUid !== "all" ? reviewerUid : void 0,
      reviewStatus: tab === "review" ? reviewStatus : void 0,
      page: tab === "ready" ? readyPage : reviewPage,
      pageSize: reviewPageSize,
    });
  }, [
    readyPage,
    publicationStatus,
    reviewFilter,
    reviewerUid,
    reviewPage,
    reviewStatus,
    tab,
    submitterFilter,
    workflow.fetchSubmissions,
  ]);
  reactExports.useEffect(() => {
    void loadReview().catch(() => dedupedToast.error(t("skills.operation.loadError")));
  }, [loadReview, t]);
  const handleSubmitterSearch = (name, uid) => {
    setSelected([]);
    setReviewPage(1);
    setReadyPage(1);
    setSubmitterFilter({
      name,
      uid,
    });
  };
  reactExports.useEffect(() => {
    void workflow
      .fetchCategories()
      .catch(() => dedupedToast.error(t("skills.operation.loadError")));
  }, [t, workflow.fetchCategories]);
  reactExports.useEffect(() => {
    if (role === "advanced") {
      void workflow
        .fetchPublishedSubmissions()
        .catch(() => dedupedToast.error(t("skills.operation.loadError")));
    }
  }, [role, t, workflow.fetchPublishedSubmissions]);
  reactExports.useEffect(() => {
    setCategoryOrders(createTaxonomyOrderMap(workflow.categories));
  }, [workflow.categories]);
  const visibleSubmissions = reactExports.useMemo(
    () =>
      workflow.submissions.filter(
        (item) =>
          item.submission && (tab !== "ready" || item.submission.status === publicationStatus),
      ),
    [workflow.submissions, tab, publicationStatus],
  );
  reactExports.useEffect(() => {
    setPublicationDrafts((current) => {
      const next = {
        ...current,
      };
      for (const item of visibleSubmissions) {
        const submission = item.submission;
        if (!submission || next[submission.submission_id]) continue;
        next[submission.submission_id] = {
          source: "user",
          display_section: "",
          display_uploader: submission.creator,
          categories: submission.categories,
          category_weights: normalizeCategoryWeights(submission.categories, 0),
          sort_weight: 0,
          visibility: "online",
          corner_tag: "",
        };
      }
      return next;
    });
  }, [visibleSubmissions]);
  const handleOpenDetails = (item) => {
    const submission = item.submission;
    if (!submission) return;
    setActiveSubmission(item);
    setDetailErrors({});
    const metadata = normalizeSkillDetailMetadata({
      ...submission,
    });
    const selected2 = selectSkillStructuredInfo(
      metadata.structuredInfo,
      submission.content_locale || i18n.language,
    );
    setDraft({
      structuredInfo: metadata.structuredInfo ?? {},
      contentLocale: selected2.locale,
      skillName: submission.skill_name,
      displayName: submission.display_name,
      summary: selected2.info.summary,
      bestFor: selected2.info.best_for.join("\n"),
      howToUse: selected2.info.how_to_use,
      outputs: selected2.info.outputs,
      categories: submission.categories,
      stage: submission.stage,
      creator: submission.creator,
      packageVersion: submission.package_version,
      coverFile: void 0,
      showcaseFile: void 0,
      packageFile: void 0,
    });
  };
  const handleAction = async (item, action) => {
    const id = item.submission?.submission_id;
    if (!id) return;
    if (action === "approve" && item.submission) {
      const submission = item.submission;
      const selected2 = selectSkillStructuredInfo(
        normalizeSkillDetailMetadata({
          ...submission,
        }).structuredInfo,
        submission.content_locale || i18n.language,
      );
      const errors = validateReviewMetadata(
        {
          skillName: submission.skill_name,
          displayName: submission.display_name,
          summary: selected2.info.summary,
          bestFor: selected2.info.best_for,
          howToUse: selected2.info.how_to_use,
          outputs: selected2.info.outputs,
          locale: selected2.locale === "zh-CN" ? "zh" : "en",
          categories: submission.categories,
          stage: submission.stage,
          creator: submission.creator,
          packageVersion: submission.package_version,
          hasCover: Boolean(submission.cover_object_key),
          hasShowcase: hasSubmissionShowcase(submission.showcase),
          hasPackage: Boolean(item.source_file),
        },
        submission.skill_name,
      );
      if (Object.keys(errors).length > 0) {
        handleOpenDetails(item);
        setDetailErrors(errors);
        dedupedToast.error(t("skills.operation.validationError"));
        return;
      }
    }
    setBusyId(id);
    try {
      await workflow.updateSubmission(id, {
        action,
      });
      dedupedToast.success(t(`skills.operation.${action}Success`));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleAssignReviewer = async (item, nextReviewerUid) => {
    const submissionId = item.submission?.submission_id;
    if (!submissionId) return;
    setBusyId(submissionId);
    try {
      await workflow.updateSubmission(submissionId, {
        action: "assign_reviewer",
        reviewer_uid: nextReviewerUid,
      });
      dedupedToast.success(t("skills.operation.saveSuccess"));
      await loadReview();
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t("skills.operation.saveError"));
    } finally {
      setBusyId("");
    }
  };
  const handleTestInDesign = async (item) => {
    const submission = item.submission;
    if (!submission) return;
    setBusyId(submission.submission_id);
    try {
      await workflow.updateSubmission(submission.submission_id, {
        action: "start_design_test",
      });
      const staged = await workflow.stagePackage(submission.submission_id);
      if (!staged.ok || !staged.stagingPath) throw new Error(staged.error || "stage failed");
      const result = await homeService.hiloApp.createWorkspaceWithResult(
        `review-${submission.skill_name}`,
      );
      const runtime = workspaceRuntimeFromOpenResult(result);
      if (!runtime) {
        toastWorkspaceOpenResult(result, t);
        return;
      }
      const prompt = t("skills.operation.designPrompt", {
        skillName: submission.skill_name,
        stagingPath: staged.stagingPath,
      });
      navigateToWorkspace(runtime, {
        initialMessage: prompt,
      });
    } catch {
      dedupedToast.error(t("skills.operation.designError"));
    } finally {
      setBusyId("");
    }
  };
  const handleRevealPackage = async (item) => {
    const id = item.submission?.submission_id;
    if (!id) return;
    setBusyId(id);
    try {
      const staged = await workflow.stagePackage(id);
      const target = staged.sourceFilePath || staged.stagingPath;
      if (!target) throw new Error(staged.error || "download failed");
      await platform.shell.showItemInFolder?.(target);
    } catch {
      dedupedToast.error(t("skills.operation.sourceFileError"));
    } finally {
      setBusyId("");
    }
  };
  const handleSaveDetails = async () => {
    const submission = activeSubmission?.submission;
    const id = submission?.submission_id;
    if (!id || !submission) return;
    const errors = validateReviewMetadata(
      {
        skillName: draft.skillName,
        displayName: draft.displayName,
        summary: draft.summary,
        bestFor: draft.bestFor
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        howToUse: draft.howToUse,
        outputs: draft.outputs,
        locale: draft.contentLocale === "zh-CN" ? "zh" : "en",
        categories: draft.categories,
        stage: draft.stage,
        creator: draft.creator,
        packageVersion: draft.packageVersion,
        hasCover: Boolean(draft.coverFile || submission.cover_object_key),
        hasShowcase: Boolean(draft.showcaseFile) || hasSubmissionShowcase(submission.showcase),
        hasPackage: Boolean(draft.packageFile || activeSubmission.source_file),
      },
      submission.skill_name,
    );
    if (Object.keys(errors).length > 0) {
      setDetailErrors(errors);
      dedupedToast.error(t("skills.operation.validationError"));
      return;
    }
    setBusyId(id);
    try {
      const coverObjectKey = draft.coverFile
        ? await uploadCreatorPlanAsset(submission.skill_name, "cover", draft.coverFile)
        : void 0;
      const showcase = draft.showcaseFile
        ? [await uploadCreatorPlanAsset(submission.skill_name, "showcase", draft.showcaseFile)]
        : normalizeSubmissionShowcase(submission.showcase);
      const zipObjectKey = draft.packageFile
        ? await workflow.uploadPackage(id, submission.skill_name, draft.packageFile)
        : void 0;
      await workflow.updateSubmission(id, {
        action: submission.status === "published" ? "save_published" : "save",
        display_name: draft.displayName,
        structured_info: {
          ...draft.structuredInfo,
          [draft.contentLocale]: {
            summary: draft.summary.trim(),
            best_for: draft.bestFor
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean),
            how_to_use: draft.howToUse.trim(),
            outputs: draft.outputs.trim(),
          },
        },
        content_locale: draft.contentLocale,
        categories: draft.categories,
        stage: draft.stage,
        creator: draft.creator,
        package_version: draft.packageVersion,
        cover_object_key: coverObjectKey,
        showcase,
        zip_object_key: zipObjectKey,
      });
      setActiveSubmission(null);
      dedupedToast.success(t("skills.operation.detailsSaved"));
      await loadReview();
      if (submission.status === "published") await workflow.fetchPublishedSubmissions();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleAddTaxonomy = (tagType) => {
    const taxonomyDraft = newTaxonomyDrafts[tagType];
    const code = taxonomyDraft.code.trim();
    const duplicate = workflow.categories.some(
      (item) => item.tag_type === tagType && item.category === code,
    );
    if (
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code) ||
      !taxonomyDraft.cnName.trim() ||
      !taxonomyDraft.enName.trim() ||
      duplicate
    ) {
      dedupedToast.error(
        t(duplicate ? "skills.operation.duplicateCode" : "skills.operation.invalidTaxonomy"),
      );
      return;
    }
    workflow.addCategory({
      category: code,
      tag_type: tagType,
      cn_name: taxonomyDraft.cnName.trim(),
      en_name: taxonomyDraft.enName.trim(),
      cn_description: "",
      en_description: "",
      sort_order: (workflow.categories.filter((item) => item.tag_type === tagType).length + 1) * 10,
      enabled: true,
    });
    setNewTaxonomyDrafts((current) => ({
      ...current,
      [tagType]: emptyTaxonomyDraft(),
    }));
    setAddingTaxonomyType(null);
  };
  const handleReject = async () => {
    const id = rejecting?.submission?.submission_id;
    if (!id || !rejectNote.trim()) return;
    setBusyId(id);
    try {
      await workflow.updateSubmission(id, {
        action: "reject",
        review_note: rejectNote.trim(),
      });
      setRejecting(null);
      setRejectNote("");
      dedupedToast.success(t("skills.operation.rejectSuccess"));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    } finally {
      setBusyId("");
    }
  };
  const handleBatchApprove = async () => {
    if (selected.length === 0) return;
    const invalidNames = visibleSubmissions.flatMap((item) => {
      const submission = item.submission;
      if (!submission || !selected.includes(submission.submission_id)) return [];
      const content = selectSkillStructuredInfo(
        normalizeSkillDetailMetadata({
          ...submission,
        }).structuredInfo,
        submission.content_locale || i18n.language,
      );
      const errors = validateReviewMetadata(
        {
          skillName: submission.skill_name,
          displayName: submission.display_name,
          summary: content.info.summary,
          bestFor: content.info.best_for,
          howToUse: content.info.how_to_use,
          outputs: content.info.outputs,
          locale: content.locale === "zh-CN" ? "zh" : "en",
          categories: submission.categories,
          stage: submission.stage,
          creator: submission.creator,
          packageVersion: submission.package_version,
          hasCover: Boolean(submission.cover_object_key),
          hasShowcase: hasSubmissionShowcase(submission.showcase),
          hasPackage: Boolean(item.source_file),
        },
        submission.skill_name,
      );
      return Object.keys(errors).length > 0 ? [submission.skill_name] : [];
    });
    if (invalidNames.length > 0) {
      dedupedToast.error(
        t("skills.operation.batchInvalid", {
          skills: invalidNames.join(", "),
        }),
      );
      return;
    }
    try {
      const result = await workflow.batchApprove(selected);
      if (!result.ok) {
        const invalidSkillNames = result.invalid_skill_names ?? [];
        const invalidItems =
          invalidSkillNames.length > 0 ? invalidSkillNames : result.invalid_submission_ids;
        dedupedToast.error(
          t("skills.operation.batchInvalid", {
            skills: invalidItems.join(", "),
          }),
        );
        return;
      }
      setSelected([]);
      dedupedToast.success(t("skills.operation.batchApproveSuccess"));
      await loadReview();
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    }
  };
  const handleSaveCategories = async () => {
    if (hasDuplicateEnabledTaxonomyOrders(workflow.categories, categoryOrders)) {
      dedupedToast.error(t("skills.operation.duplicateSortOrder"));
      return;
    }
    try {
      await workflow.saveCategories((categories) =>
        categories.map((category) => ({
          ...category,
          sort_order: categoryOrders.get(taxonomyItemKey(category)) ?? 1e3,
        })),
      );
      dedupedToast.success(t("skills.operation.categorySaved"));
    } catch {
      dedupedToast.error(t("skills.operation.actionError"));
    }
  };
  const publishSelected = async (submissionIds, section) => {
    if (
      tab !== "ready" ||
      publicationStatus !== "approved" ||
      workflow.loading ||
      submissionIds.length === 0 ||
      submissionIds.some(
        (id) =>
          !visibleSubmissions.some(
            (item) =>
              item.submission?.submission_id === id && item.submission.status === "approved",
          ),
      )
    )
      return false;
    try {
      const publications = buildBatchPublications(
        submissionIds,
        publicationDrafts,
        section,
        workflow.categories
          .filter((category) => category.enabled !== false && category.tag_type === "category")
          .map((category) => category.category),
      );
      const result = await workflow.publish(publications);
      if (!result.ok) {
        const invalid =
          result.invalid_skill_names?.length > 0
            ? result.invalid_skill_names
            : result.invalid_submission_ids;
        dedupedToast.error(
          t("skills.operation.publishInvalid", {
            skills: invalid.join(", "),
          }),
        );
        return false;
      }
      setSelected([]);
      dedupedToast.success(t("skills.operation.publishSuccess"));
      await loadReview().catch(() => dedupedToast.error(t("skills.operation.loadError")));
      return true;
    } catch (error) {
      if (error instanceof BatchPublicationValidationError) {
        const skills = error.submissionIds.map((id) => {
          const submission = visibleSubmissions.find(
            (item) => item.submission?.submission_id === id,
          )?.submission;
          return submission?.skill_name || id;
        });
        dedupedToast.error(
          t(
            error.reason === "missing-category"
              ? "skills.operation.publishMissingCategories"
              : "skills.operation.publishInvalidCategories",
            {
              skills: skills.join(", "),
            },
          ),
        );
        setPublishDialogOpen(false);
      } else {
        const key =
          error instanceof GatewayHttpError ? publicationValidationMessage(error.details) : void 0;
        dedupedToast.error(t(key ?? "skills.operation.actionError"));
      }
      return false;
    }
  };
  const handlePublish = async (section) => publishSelected(selected, section);
  const handlePublishOne = async (item) => {
    const submissionId = item.submission?.submission_id;
    if (!submissionId) return;
    const section = publicationDrafts[submissionId]?.display_section;
    if (!section || !Object.hasOwn(publicationSections, section)) {
      dedupedToast.error(t("skills.operation.publishSectionPlaceholder"));
      return;
    }
    await publishSelected([submissionId], section);
  };
  return (
    <div className="flex flex-col gap-4" data-action-ui-id="skills-operations-workspace">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("skills.operation.title")}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} data-action-ui-id="operations-exit">
          <X size={14} strokeWidth={1.5} />
          {t("skills.operation.exitButton")}
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {role === "advanced"
              ? t("skills.operation.advancedPermissionTitle")
              : t("skills.operation.reviewerPermissionTitle")}
          </p>
        </div>
        <Badge variant="secondary">
          {role === "advanced"
            ? t("skills.operation.fullOperations")
            : t("skills.operation.reviewOnly")}
        </Badge>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setSelected([]);
          setTab(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="review" data-action-ui-id="operations-review-tab">
            {t("skills.operation.reviewTab")}
            {workflow.pendingTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {workflow.pendingTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            disabled={role !== "advanced"}
            data-action-ui-id="operations-ready-tab"
          >
            {t("skills.operation.readyTab")}
            {workflow.approvedTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {workflow.approvedTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            disabled={role !== "advanced"}
            data-action-ui-id="operations-configuration-tab"
          >
            <Settings2 size={14} strokeWidth={1.5} />
            {t("skills.operation.configurationTab")}
          </TabsTrigger>
          <TabsTrigger
            value="published"
            disabled={role !== "advanced"}
            data-action-ui-id="operations-published-tab"
          >
            {t("skills.operation.publishedConfig")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="pt-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-medium">{t("skills.operation.pendingReviewList")}</h3>
            <Badge variant="secondary">{workflow.pendingTotal}</Badge>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                {t("skills.operation.reviewStatus")}
              </Label>
              <Select
                value={reviewStatus}
                onValueChange={(value) => {
                  setReviewPage(1);
                  setSelected([]);
                  setReviewStatus(value);
                }}
              >
                <SelectTrigger className="w-40" data-action-ui-id="operations-review-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    {t("skills.operation.reviewStatusPending")}
                  </SelectItem>
                  <SelectItem value="approved">
                    {t("skills.operation.reviewStatusApproved")}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t("skills.operation.reviewStatusRejected")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                {t("skills.operation.reviewer")}
              </Label>
              <Select
                value={reviewerUid}
                onValueChange={(value) => {
                  if (value === null) return;
                  setReviewPage(1);
                  setSelected([]);
                  setReviewerUid(value);
                }}
              >
                <SelectTrigger className="w-40" data-action-ui-id="operations-reviewer-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("skills.operation.reviewerAll")}</SelectItem>
                  {workflow.reviewers.map((reviewer) => (
                    <SelectItem key={reviewer.uid} value={reviewer.uid}>
                      {reviewer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs text-muted-foreground">
                {t("skills.operation.reviewType")}
              </Label>
              <Select
                value={reviewFilter}
                onValueChange={(value) => {
                  setReviewPage(1);
                  setSelected([]);
                  setReviewFilter(value);
                }}
              >
                <SelectTrigger className="w-44" data-action-ui-id="operations-review-type-filter">
                  <SelectValue>
                    {reviewFilter === "update"
                      ? t("skills.operation.reviewTypeUpdate")
                      : reviewFilter === "new"
                        ? t("skills.operation.reviewTypeNew")
                        : t("skills.operation.reviewTypeAll")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("skills.operation.reviewTypeAll")}</SelectItem>
                  <SelectItem value="update">{t("skills.operation.reviewTypeUpdate")}</SelectItem>
                  <SelectItem value="new">{t("skills.operation.reviewTypeNew")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SubmitterFilter
              key={`review-${submitterFilter.name}-${submitterFilter.uid}`}
              {...submitterFilter}
              onSearch={handleSubmitterSearch}
            />
            {reviewStatus === "pending" && (
              <div className="ml-auto flex items-center gap-2">
                <Checkbox
                  checked={selected.length > 0 && selected.length === visibleSubmissions.length}
                  onCheckedChange={(checked) =>
                    setSelected(
                      checked
                        ? visibleSubmissions.flatMap((item) =>
                            item.submission ? [item.submission.submission_id] : [],
                          )
                        : [],
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {t("skills.operation.selectCurrentPage")}
                </span>
                <Badge variant="outline">
                  {t("skills.operation.selectedCount", {
                    count: selected.length,
                  })}
                </Badge>
                <Button
                  size="sm"
                  disabled={selected.length === 0}
                  onClick={() => void handleBatchApprove()}
                  data-action-ui-id="operations-review-batch-approve"
                >
                  <Check size={14} strokeWidth={1.5} />
                  {t("skills.operation.approveSelected", {
                    count: selected.length,
                  })}
                </Button>
              </div>
            )}
          </div>
          <ReviewList
            items={visibleSubmissions}
            selected={selected}
            busyId={busyId}
            loading={workflow.loading}
            onSelect={setSelected}
            onDetails={handleOpenDetails}
            onRevealPackage={(item) => void handleRevealPackage(item)}
            onTest={handleTestInDesign}
            onPass={(item) => void handleAction(item, "pass_design")}
            onReject={setRejecting}
            onApprove={(item) => void handleAction(item, "approve")}
            categories={workflow.categories}
            reviewers={workflow.reviewers}
            role={role}
            onAssignReviewer={(item, nextReviewerUid) =>
              void handleAssignReviewer(item, nextReviewerUid)
            }
            isZh={isZh}
          />
          {workflow.total > reviewPageSize && (
            <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <Button
                variant="outline"
                size="icon-xs"
                disabled={reviewPage <= 1}
                onClick={() => {
                  setSelected([]);
                  setReviewPage((page) => page - 1);
                }}
              >
                <ChevronLeft size={14} />
              </Button>
              <span>
                {reviewPage}
                {" / "}
                {Math.ceil(workflow.total / reviewPageSize)}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                disabled={reviewPage * reviewPageSize >= workflow.total}
                onClick={() => {
                  setSelected([]);
                  setReviewPage((page) => page + 1);
                }}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="ready" className="pt-4">
          {role === "advanced" && (
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">
                    {t(
                      publicationStatus === "approved"
                        ? "skills.operation.readyToPublish"
                        : "skills.operation.publishedStatus",
                    )}
                  </h3>
                  <Badge variant="secondary">{workflow.total}</Badge>
                </div>
                {publicationStatus === "approved" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      disabled={workflow.loading}
                      checked={selected.length > 0 && selected.length === visibleSubmissions.length}
                      onCheckedChange={(checked) =>
                        setSelected(
                          checked
                            ? visibleSubmissions.flatMap((item) =>
                                item.submission ? [item.submission.submission_id] : [],
                              )
                            : [],
                        )
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("skills.operation.selectCurrentPage")}
                    </span>
                    <Badge variant="outline">
                      {t("skills.operation.selectedCount", {
                        count: selected.length,
                      })}
                    </Badge>
                    <Button
                      disabled={selected.length === 0 || workflow.loading}
                      onClick={() => setPublishDialogOpen(true)}
                      data-action-ui-id="operations-publish-selected"
                    >
                      {t("skills.operation.publishSelected", {
                        count: selected.length,
                      })}
                    </Button>
                  </div>
                )}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ready-publication-status">
                    {t("skills.operation.publicationStatus")}
                  </Label>
                  <Select
                    value={publicationStatus}
                    onValueChange={(value) => {
                      if (value !== "approved" && value !== "published") return;
                      setSelected([]);
                      setReadyPage(1);
                      setPublishDialogOpen(false);
                      setActiveSubmission(null);
                      setPublicationStatus(value);
                    }}
                  >
                    <SelectTrigger
                      id="ready-publication-status"
                      className="w-36"
                      data-action-ui-id="operations-publication-status-filter"
                    >
                      <SelectValue>
                        {t(
                          publicationStatus === "approved"
                            ? "skills.operation.readyStatus"
                            : "skills.operation.publishedStatus",
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">{t("skills.operation.readyStatus")}</SelectItem>
                      <SelectItem value="published">
                        {t("skills.operation.publishedStatus")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SubmitterFilter
                  key={`ready-${submitterFilter.name}-${submitterFilter.uid}`}
                  {...submitterFilter}
                  onSearch={handleSubmitterSearch}
                />
              </div>
              {workflow.loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              ) : publicationStatus === "published" ? (
                <PublishedSubmissionList
                  items={visibleSubmissions}
                  categories={workflow.categories}
                  onDetails={handleOpenDetails}
                />
              ) : (
                <ReadyList
                  items={visibleSubmissions}
                  selected={selected}
                  drafts={publicationDrafts}
                  categories={workflow.categories.filter(
                    (category) => category.tag_type === "category" && category.enabled !== false,
                  )}
                  onSelect={setSelected}
                  onDraftChange={(submissionId, publication) =>
                    setPublicationDrafts((current) => ({
                      ...current,
                      [submissionId]: publication,
                    }))
                  }
                  onDetails={handleOpenDetails}
                  onPublish={handlePublishOne}
                />
              )}
              {workflow.total > reviewPageSize && (
                <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={workflow.loading || readyPage <= 1}
                    onClick={() => {
                      setSelected([]);
                      setReadyPage((page) => page - 1);
                    }}
                  >
                    <ChevronLeft size={14} strokeWidth={1.5} />
                  </Button>
                  <span>
                    {readyPage}
                    {" / "}
                    {Math.ceil(workflow.total / reviewPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={workflow.loading || readyPage * reviewPageSize >= workflow.total}
                    onClick={() => {
                      setSelected([]);
                      setReadyPage((page) => page + 1);
                    }}
                  >
                    <ChevronRight size={14} strokeWidth={1.5} />
                  </Button>
                </div>
              )}
            </section>
          )}
        </TabsContent>
        <TabsContent value="configuration" className="pt-4">
          {role === "advanced" && (
            <div className="flex flex-col gap-6">
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{t("skills.operation.categoryConfig")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t("skills.operation.categoryOrderHint")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void handleSaveCategories()}
                    data-action-ui-id="operations-category-save"
                  >
                    {t("common.save")}
                  </Button>
                </div>
                <div className="flex flex-col gap-6">
                  {["category", "stage"].map((tagType) => {
                    return (
                      <div key={tagType} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-medium">
                            {t(`skills.operation.tagType.${tagType}`)}
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewTaxonomyDrafts((current) => ({
                                ...current,
                                [tagType]: emptyTaxonomyDraft(),
                              }));
                              setAddingTaxonomyType(tagType);
                            }}
                          >
                            <Plus size={14} strokeWidth={1.5} />
                            {t("skills.operation.addTaxonomy")}
                          </Button>
                        </div>
                        <div className="grid grid-cols-[minmax(140px,0.7fr)_1fr_1fr_80px_64px_48px] gap-2 px-2 text-[11px] text-muted-foreground">
                          <span>{t("skills.operation.code")}</span>
                          <span>{t("skills.operation.titleZh")}</span>
                          <span>{t("skills.operation.titleEn")}</span>
                          <span className="text-center">{t("skills.operation.sortOrder")}</span>
                          <span className="text-center">{t("skills.operation.enabled")}</span>
                          <span className="text-center">{t("skills.operation.actions")}</span>
                        </div>
                        {taxonomyItemsForConfiguration(workflow.categories, tagType).map(
                          (category) => (
                            <div
                              key={taxonomyItemKey(category)}
                              className="grid grid-cols-[minmax(140px,0.7fr)_1fr_1fr_80px_64px_48px] items-center gap-2 rounded-lg border border-border p-2"
                            >
                              <Input
                                className="h-7 min-w-0 text-xs"
                                value={category.category}
                                disabled={true}
                              />
                              <Input
                                className="h-7 min-w-0 text-xs"
                                value={category.cn_name}
                                onChange={(event) =>
                                  workflow.updateCategory(category.tag_type, category.category, {
                                    cn_name: event.target.value,
                                  })
                                }
                              />
                              <Input
                                className="h-7 min-w-0 text-xs"
                                value={category.en_name}
                                onChange={(event) =>
                                  workflow.updateCategory(category.tag_type, category.category, {
                                    en_name: event.target.value,
                                  })
                                }
                              />
                              <Input
                                type="number"
                                className="h-7 w-20"
                                value={categoryOrders.get(taxonomyItemKey(category)) ?? ""}
                                onChange={(event) =>
                                  setCategoryOrders((current) => {
                                    const next = new Map(current);
                                    next.set(taxonomyItemKey(category), Number(event.target.value));
                                    return next;
                                  })
                                }
                              />
                              <Switch
                                className="justify-self-center"
                                checked={category.enabled !== false}
                                onCheckedChange={(enabled) =>
                                  workflow.updateCategory(category.tag_type, category.category, {
                                    enabled,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="justify-self-center"
                                title={t("common.delete")}
                                onClick={() =>
                                  workflow.updateCategory(category.tag_type, category.category, {
                                    enabled: false,
                                  })
                                }
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </TabsContent>
        <TabsContent value="published" className="pt-4">
          {role === "advanced" && (
            <div className="flex flex-col gap-6">
              <OperationsPublishedPanel />
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-medium">
                  {t("skills.operation.publishedDetails")}
                </h3>
                <div className="flex flex-col gap-2">
                  {workflow.publishedSubmissions.map((item) => {
                    const submission = item.submission;
                    if (!submission) return null;
                    return (
                      <div
                        key={submission.submission_id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{submission.display_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {submission.skill_name}
                            {" · "}
                            {submission.package_version}
                          </p>
                        </div>
                        <Button size="xs" variant="outline" onClick={() => handleOpenDetails(item)}>
                          {t("skills.operation.editDetails")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </TabsContent>
      </Tabs>
      {publishDialogOpen && (
        <BatchPublishDialog
          count={selected.length}
          onClose={() => setPublishDialogOpen(false)}
          onPublish={handlePublish}
        />
      )}
      <Dialog
        open={Boolean(addingTaxonomyType)}
        onOpenChange={(open) => !open && setAddingTaxonomyType(null)}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {t("skills.operation.addTaxonomyTitle", {
                type: addingTaxonomyType ? t(`skills.operation.tagType.${addingTaxonomyType}`) : "",
              })}
            </DialogTitle>
          </DialogHeader>
          {addingTaxonomyType && (
            <div className="flex flex-col gap-4">
              <Field label={t("skills.operation.taxonomyCode")}>
                <Input
                  value={newTaxonomyDrafts[addingTaxonomyType].code}
                  onChange={(event) =>
                    setNewTaxonomyDrafts((current) => ({
                      ...current,
                      [addingTaxonomyType]: {
                        ...current[addingTaxonomyType],
                        code: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t("skills.operation.titleZh")}>
                <Input
                  value={newTaxonomyDrafts[addingTaxonomyType].cnName}
                  onChange={(event) =>
                    setNewTaxonomyDrafts((current) => ({
                      ...current,
                      [addingTaxonomyType]: {
                        ...current[addingTaxonomyType],
                        cnName: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label={t("skills.operation.titleEn")}>
                <Input
                  value={newTaxonomyDrafts[addingTaxonomyType].enName}
                  onChange={(event) =>
                    setNewTaxonomyDrafts((current) => ({
                      ...current,
                      [addingTaxonomyType]: {
                        ...current[addingTaxonomyType],
                        enName: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingTaxonomyType(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (addingTaxonomyType) handleAddTaxonomy(addingTaxonomyType);
              }}
              data-action-ui-id="operations-taxonomy-add-confirm"
            >
              {t("skills.operation.addTaxonomy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SubmissionDetailsDialog
        readOnly={tab === "ready" && publicationStatus === "published"}
        item={activeSubmission}
        draft={draft}
        busy={Boolean(
          activeSubmission?.submission && busyId === activeSubmission.submission.submission_id,
        )}
        isZh={isZh}
        categories={workflow.categories.filter((category) => category.enabled !== false)}
        onDraftChange={setDraft}
        onOpenChange={(open) => !open && setActiveSubmission(null)}
        onSave={() => void handleSaveDetails()}
        errors={detailErrors}
      />
      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>{t("skills.operation.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("skills.operation.rejectDescription")}</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim()}
              onClick={() => void handleReject()}
              data-action-ui-id="operations-reject-confirm"
            >
              {t("skills.operation.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
