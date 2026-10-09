// 创作者计划投稿弹窗：安装包、封面、展示素材、分类与提交流程。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  j as jsxRuntimeExports,
  gj as DialogHeader,
  e as Icon,
  g7 as Badge,
  fM as Button,
  k4 as Alert,
  k7 as AlertDescription,
  X,
  mQ as normalizeSkillDetailMetadata,
  mR as normalizeSkillContentLocale,
  mS as selectSkillStructuredInfo,
  as as Dialog,
  at as DialogContent,
  g8 as DialogTitle,
  g9 as DialogDescription,
  kS as DialogFooter,
  mT as useSkillCategories,
  cq as FileArchive,
  k6 as AlertTitle,
  iX as Label,
  mU as RadioGroup,
  mV as RadioGroupItem,
  f0 as Upload,
  d5 as Info,
  iY as Select,
  iZ as SelectTrigger,
  i_ as SelectValue,
  i$ as SelectContent,
  j0 as SelectItem,
  bB as CheckCircle2,
  f as Input,
  kR as Textarea,
  d1 as ImagePlus,
  aP as Video,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { hasSubmissionShowcase, saveCreatorPlan, stageSkillPackage } from "./data.js";
import { AssetPicker, Field$1, FormSection, PackagePicker } from "./form-parts.jsx";
import { SkillApplicationDialog } from "../my-skills/application-dialog.jsx";
import {
  DEFAULT_SKILL_PACKAGE_VERSION,
  SKILL_REVIEW_LIMITS,
  isNewerSkillPackageVersion,
  validateReviewMetadata,
} from "../review-rules.js";
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 10 * 1024 * 1024;
const MAX_SHOWCASE_BYTES = 1e3 * 1024 * 1024;
const COVER_ASPECT_RATIO = 16 / 9;
const COVER_ASPECT_TOLERANCE = 0.02;
const COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SHOWCASE_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
function inferTaxonomy(tags, configuredCategories, configuredStages) {
  const categories = configuredCategories
    .filter((category) =>
      tags.some((tag) => tag === category.en_name || tag.startsWith(`${category.en_name} / `)),
    )
    .map((category) => category.category);
  const stage =
    configuredStages.find((candidate) =>
      tags.some((tag) => tag.endsWith(` / ${candidate.en_name}`)),
    )?.category ?? "";
  return {
    categories: categories.slice(0, 3),
    stage,
  };
}
export function CreatorPlanDialog({
  mode = "review",
  open,
  onOpenChange,
  mySkills,
  defaultDisplayName = "",
  defaultSkillName = "",
  defaultSource,
  existingSubmission,
  onCreateSkill,
  onSaved,
  onRefreshSubmissions,
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const preferredLocale = normalizeSkillContentLocale(i18n.language);
  const isEditing = !!defaultSkillName;
  const viewOnly =
    mode === "view" ||
    existingSubmission?.status === "pending" ||
    existingSubmission?.status === "approved";
  const {
    categories: configuredCategories,
    stages: configuredStages,
    loading: categoriesLoading,
  } = useSkillCategories(open);
  const packageInputRef = reactExports.useRef(null);
  const replacementPackageInputRef = reactExports.useRef(null);
  const coverInputRef = reactExports.useRef(null);
  const showcaseInputRef = reactExports.useRef(null);
  const designDraftInitializedRef = reactExports.useRef(false);
  const initialSource = defaultSource ?? (defaultSkillName ? "design" : "upload");
  const [source, setSource] = reactExports.useState(initialSource);
  const [skillName, setSkillName] = reactExports.useState(defaultSkillName);
  const [stagingPath, setStagingPath] = reactExports.useState();
  const [packageFile, setPackageFile] = reactExports.useState();
  const [displayName, setDisplayName] = reactExports.useState("");
  const [summary, setSummary] = reactExports.useState("");
  const [structuredInfo, setStructuredInfo] = reactExports.useState({});
  const [contentLocale, setContentLocale] = reactExports.useState(preferredLocale);
  const reviewLocale = contentLocale === "zh-CN" ? "zh" : "en";
  const reviewLimits = SKILL_REVIEW_LIMITS[reviewLocale];
  const [bestFor, setBestFor] = reactExports.useState([]);
  const [bestForDraft, setBestForDraft] = reactExports.useState("");
  const [howToUse, setHowToUse] = reactExports.useState("");
  const [outputs, setOutputs] = reactExports.useState("");
  const [categories, setCategories] = reactExports.useState([]);
  const [stage, setStage] = reactExports.useState("");
  const [creator, setCreator] = reactExports.useState(defaultDisplayName);
  const [packageVersion, setPackageVersion] = reactExports.useState(DEFAULT_SKILL_PACKAGE_VERSION);
  const [coverFile, setCoverFile] = reactExports.useState();
  const [showcaseFile, setShowcaseFile] = reactExports.useState();
  const [stagedShowcase, setStagedShowcase] = reactExports.useState();
  const [coverEdited, setCoverEdited] = reactExports.useState(false);
  const [showcaseEdited, setShowcaseEdited] = reactExports.useState(false);
  const [coverPreview, setCoverPreview] = reactExports.useState("");
  const [staging, setStaging] = reactExports.useState(false);
  const [savingMode, setSavingMode] = reactExports.useState(null);
  const [reviewAttempted, setReviewAttempted] = reactExports.useState(false);
  const skillOptions = reactExports.useMemo(
    () =>
      [...mySkills]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((skill) => ({
          value: skill.name,
          label: skill.displayNameZh ? `${skill.displayNameZh} · ${skill.name}` : skill.name,
        })),
    [mySkills],
  );
  const selectedSkill = reactExports.useMemo(
    () => mySkills.find((skill) => skill.name === skillName),
    [mySkills, skillName],
  );
  const selectedCategory = configuredCategories.find(
    (category) => category.category === categories[0],
  );
  const selectedRelatedCategories = categories.slice(1);
  const selectedStage = configuredStages.find((item) => item.category === stage);
  const fillFromSkill = reactExports.useCallback(
    (skill, submission) => {
      designDraftInitializedRef.current = true;
      const taxonomy = inferTaxonomy(
        skill.completeTagsEn ?? [],
        configuredCategories,
        configuredStages,
      );
      setSkillName(skill.name);
      setDisplayName(submission?.displayName || skill.displayNameZh || "");
      const metadata =
        submission ??
        normalizeSkillDetailMetadata({
          ...skill,
        });
      const nextStructuredInfo = metadata.structuredInfo ?? {};
      const selected = selectSkillStructuredInfo(
        nextStructuredInfo,
        submission?.contentLocale ?? skill.contentLocale ?? preferredLocale,
      );
      setStructuredInfo(nextStructuredInfo);
      setContentLocale(selected.locale);
      setSummary(selected.info.summary);
      setBestFor(selected.info.best_for);
      setHowToUse(selected.info.how_to_use);
      setOutputs(selected.info.outputs);
      setCategories(
        (submission?.categories.length ? submission.categories : taxonomy.categories).slice(0, 3),
      );
      setStage(submission?.stage || taxonomy.stage);
      setCreator(
        submission?.creator ||
          skill.authorCn ||
          skill.authorEn ||
          skill.creator ||
          defaultDisplayName,
      );
      setPackageVersion(
        submission?.packageVersion || skill.version || DEFAULT_SKILL_PACKAGE_VERSION,
      );
      setCoverFile(void 0);
      setShowcaseFile(void 0);
      setStagedShowcase(void 0);
      setCoverEdited(false);
      setShowcaseEdited(false);
      setCoverPreview("");
    },
    [configuredCategories, configuredStages, defaultDisplayName, preferredLocale],
  );
  reactExports.useEffect(() => {
    if (!open || source !== "design") {
      designDraftInitializedRef.current = false;
      return;
    }
    if (categoriesLoading || designDraftInitializedRef.current) return;
    const selected = mySkills.find((skill) => skill.name === skillName) ?? mySkills[0];
    if (selected) {
      fillFromSkill(
        selected,
        existingSubmission?.skillName === selected.name ? existingSubmission : void 0,
      );
    }
  }, [categoriesLoading, existingSubmission, fillFromSkill, mySkills, open, skillName, source]);
  reactExports.useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);
  const handleSourceChange = (nextSource) => {
    setSource(nextSource);
    setStagingPath(void 0);
    setPackageFile(void 0);
    setStagedShowcase(void 0);
    setBestForDraft("");
    if (nextSource === "upload") {
      setSkillName("");
      setDisplayName("");
      setSummary("");
      setStructuredInfo({});
      setContentLocale(preferredLocale);
      setBestFor([]);
      setHowToUse("");
      setOutputs("");
      setCategories([]);
      setStage("");
      setCreator(defaultDisplayName);
      setPackageVersion(DEFAULT_SKILL_PACKAGE_VERSION);
    }
  };
  const handlePackage = async (file, replacement) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".zip") && !lowerName.endsWith(".tar.gz")) {
      dedupedToast.error(
        t("skills.submission.packageTypeError", "Only ZIP / .tar.gz packages are supported"),
      );
      return;
    }
    if (file.size > MAX_PACKAGE_BYTES) {
      dedupedToast.error(
        t("skills.submission.packageSizeError", "Skill package cannot exceed 50 MB"),
      );
      return;
    }
    setStaging(true);
    try {
      const result = await stageSkillPackage(file);
      if (replacement && result.skill.name !== defaultSkillName) {
        dedupedToast.error(
          t(
            "skills.submission.packageNameMismatch",
            "The new package name must match the immutable Skill name.",
          ),
        );
        return;
      }
      if (replacement) {
        if (!result.skill.packageVersionDeclared) {
          dedupedToast.error(
            t(
              "skills.submission.packageVersionMissing",
              "The updated package must declare version in meta.yaml",
            ),
          );
          return;
        }
        const currentVersion = existingSubmission?.packageVersion || packageVersion;
        if (!isNewerSkillPackageVersion(result.skill.packageVersion, currentVersion)) {
          dedupedToast.error(
            t("skills.submission.packageVersionNotNewer", {
              current: currentVersion,
              defaultValue: "The updated package version must be greater than {{current}}",
            }),
          );
          return;
        }
        setPackageFile(file);
        setStagingPath(result.stagingPath);
        setPackageVersion(result.skill.packageVersion || packageVersion);
        setStructuredInfo((current) => ({
          ...current,
          ...result.skill.structuredInfo,
        }));
        setStagedShowcase(result.skill.showcase);
        return;
      }
      setPackageFile(file);
      setStagingPath(result.stagingPath);
      setStagedShowcase(result.skill.showcase);
      setSkillName(result.skill.name);
      setPackageVersion(result.skill.packageVersion || DEFAULT_SKILL_PACKAGE_VERSION);
      setDisplayName("");
      setSummary("");
      setStructuredInfo(result.skill.structuredInfo);
      setContentLocale(preferredLocale);
      setBestFor([]);
      setHowToUse("");
      setOutputs("");
      setCategories([]);
      setStage("");
      setCreator(defaultDisplayName);
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setStaging(false);
    }
  };
  const handleCover = async (file) => {
    if (!COVER_TYPES.has(file.type)) {
      dedupedToast.error(
        t("skills.submission.coverTypeError", "Cover supports PNG / JPG / WebP only"),
      );
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      dedupedToast.error(t("skills.submission.coverSizeError", "Cover cannot exceed 10 MB"));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const aspectRatio = bitmap.width / bitmap.height;
      bitmap.close();
      if (Math.abs(aspectRatio - COVER_ASPECT_RATIO) > COVER_ASPECT_TOLERANCE) {
        dedupedToast.error(
          t("skills.submission.coverAspectRatioError", "Cover image must use a 16:9 aspect ratio"),
        );
        return;
      }
    } catch {
      dedupedToast.error(t("skills.submission.coverReadError", "Unable to read the cover image"));
      return;
    }
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverEdited(true);
    setCoverPreview(URL.createObjectURL(file));
  };
  const handleShowcase = (file) => {
    if (!SHOWCASE_TYPES.has(file.type)) {
      dedupedToast.error(
        t("skills.submission.showcaseTypeError", "Showcase supports MP4 / MOV / WebM only"),
      );
      return;
    }
    if (file.size > MAX_SHOWCASE_BYTES) {
      dedupedToast.error(
        t("skills.submission.showcaseSizeError", "Showcase cannot exceed 1000 MB"),
      );
      return;
    }
    setShowcaseFile(file);
    setShowcaseEdited(true);
  };
  const handleAddBestFor = () => {
    const label = bestForDraft.trim();
    if (!label) return;
    const labelLength = [...label].length;
    const wordCount = label.split(/\s+/).filter(Boolean).length;
    if (
      labelLength < reviewLimits.bestForMinLength ||
      labelLength > reviewLimits.bestForMaxLength ||
      (reviewLocale === "en" && wordCount > 3)
    ) {
      dedupedToast.error(
        t("skills.submission.bestForLengthError", {
          defaultValue:
            reviewLocale === "en"
              ? "Each label must be 2–24 characters and no more than 3 words"
              : "Each label must be 2–6 characters",
        }),
      );
      return;
    }
    if (bestFor.includes(label)) {
      setBestForDraft("");
      return;
    }
    if (bestFor.length >= reviewLimits.bestForMaxCount) {
      dedupedToast.error(t("skills.submission.bestForCountError", "Add 2–3 Best For labels"));
      return;
    }
    setBestFor((current) => [...current, label]);
    setBestForDraft("");
  };
  const handleBestForKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== "," && event.key !== "，") return;
    event.preventDefault();
    handleAddBestFor();
  };
  const privateSaveReady =
    !!skillName && !!packageVersion.trim() && (isEditing || source === "design" || !!stagingPath);
  const existingCoverObjectKey =
    existingSubmission?.coverObjectKey || selectedSkill?.coverObjectKey || "";
  const existingShowcase =
    stagedShowcase ?? existingSubmission?.showcase ?? selectedSkill?.showcase;
  const hasLegacyShowcase =
    existingShowcase === void 0 && Boolean(selectedSkill?.showcaseObjectKey);
  const hasCover = coverEdited ? !!coverFile : !!existingCoverObjectKey;
  const hasShowcase = showcaseEdited
    ? !!showcaseFile
    : hasSubmissionShowcase(existingShowcase) || hasLegacyShowcase;
  const validationErrors = validateReviewMetadata(
    {
      skillName,
      displayName,
      summary,
      bestFor,
      howToUse,
      outputs,
      categories,
      stage,
      creator,
      packageVersion,
      hasCover,
      hasShowcase,
      hasPackage: isEditing || source === "design" || !!stagingPath,
      locale: reviewLocale,
    },
    defaultSkillName ||
      (existingSubmission?.skillName === skillName ? existingSubmission.skillName : void 0) ||
      (source === "design" ? selectedSkill?.name : void 0),
  );
  const requiresVersionBump = isEditing && !!stagingPath && !!existingSubmission;
  const updateVersionIsValid =
    !requiresVersionBump ||
    isNewerSkillPackageVersion(packageVersion, existingSubmission.packageVersion);
  const reviewComplete =
    !!skillName && Object.keys(validationErrors).length === 0 && updateVersionIsValid;
  const requiredError = t("skills.submission.requiredError", "This field is required");
  const errorMessage = (code) => {
    if (!reviewAttempted || !code) return void 0;
    if (code === "required") return requiredError;
    if (code === "display_name_length")
      return t("skills.submission.displayNameHint", {
        defaultValue: `Use ${reviewLimits.displayNameMin}–${reviewLimits.displayNameMax} characters`,
      });
    if (code === "summary_length")
      return t("skills.submission.summaryHint", {
        defaultValue: `Describe the core capability in ${reviewLimits.summaryMin}–${reviewLimits.summaryMax} characters`,
      });
    if (code === "best_for_count")
      return t("skills.submission.bestForCountError", "Add 2–3 Best For labels");
    if (code === "best_for_length")
      return t("skills.submission.bestForLengthError", {
        defaultValue:
          reviewLocale === "en"
            ? "Each label must be 2–24 characters and no more than 3 words"
            : "Each label must be 2–6 characters",
      });
    if (code === "how_to_use_length")
      return t("skills.submission.howToUseHint", {
        defaultValue: `Describe the required input in ${reviewLimits.howToUseMin}–${reviewLimits.howToUseMax} characters`,
      });
    if (code === "outputs_length")
      return t("skills.submission.outputsHint", {
        defaultValue: `Describe the deliverables in ${reviewLimits.outputsMin}–${reviewLimits.outputsMax} characters`,
      });
    if (code === "creator_length")
      return t("skills.submission.creatorHint", {
        defaultValue: `Use ${reviewLimits.creatorMin}–${reviewLimits.creatorMax} characters`,
      });
    if (code === "package_version_invalid")
      return t("skills.submission.packageVersionInvalid", "Version must use x.y.z format");
    return t("skills.submission.incomplete", "Complete all Skill information first");
  };
  const reviewErrors = {
    displayName: errorMessage(validationErrors.displayName),
    summary: errorMessage(validationErrors.summary),
    bestFor: errorMessage(validationErrors.bestFor),
    howToUse: errorMessage(validationErrors.howToUse),
    outputs: errorMessage(validationErrors.outputs),
    categories: errorMessage(validationErrors.categories),
    stage: errorMessage(validationErrors.stage),
    creator: errorMessage(validationErrors.creator),
    cover: errorMessage(validationErrors.hasCover),
    showcase: reviewAttempted
      ? validationErrors.hasShowcase
        ? t(
            "skills.submission.showcaseRequired",
            "A Showcase video is required when applying for review",
          )
        : void 0
      : void 0,
    packageVersion:
      reviewAttempted && !updateVersionIsValid
        ? t("skills.submission.packageVersionNotNewer", {
            current: existingSubmission?.packageVersion,
            defaultValue: "The updated package version must be greater than {{current}}",
          })
        : errorMessage(validationErrors.packageVersion),
  };
  const handleSave = async (applyForReview) => {
    if (viewOnly || (applyForReview && mode === "edit")) return;
    if (applyForReview) setReviewAttempted(true);
    if ((applyForReview && !reviewComplete) || (!applyForReview && !privateSaveReady)) {
      dedupedToast.error(t("skills.submission.incomplete", "Complete all Skill information first"));
      return;
    }
    if (applyForReview && !hasCover) {
      dedupedToast.error(
        t("skills.submission.coverRequired", "A cover is required when applying for review"),
      );
      return;
    }
    setSavingMode(applyForReview ? "review" : "private");
    const payload = {
      source,
      stagingPath,
      replaceExisting: isEditing && !!stagingPath,
      skillName,
      displayName: displayName.trim(),
      structuredInfo: {
        ...structuredInfo,
        [contentLocale]: {
          summary: summary.trim(),
          best_for: bestFor,
          how_to_use: howToUse.trim(),
          outputs: outputs.trim(),
        },
      },
      contentLocale,
      showcase: showcaseEdited ? [] : existingShowcase,
      categories,
      stage,
      creator: creator.trim(),
      packageVersion: packageVersion.trim(),
      coverFile,
      showcaseFile,
      coverEdited,
      showcaseEdited,
      coverObjectKey: existingCoverObjectKey,
    };
    try {
      await saveCreatorPlan(payload, applyForReview);
      dedupedToast.success(
        isEditing
          ? applyForReview
            ? t("skills.submission.editReviewSuccess", "Changes submitted for review")
            : t("skills.submission.editPrivateSuccess", "Skill information updated")
          : applyForReview
            ? t("skills.submission.reviewSuccess", "Submitted for review")
            : t("skills.submission.privateSuccess", "Saved as Private"),
      );
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingMode(null);
    }
  };
  if (viewOnly)
    return (
      <SkillApplicationDialog
        taxonomy={[...configuredCategories, ...configuredStages]}
        open={open}
        onOpenChange={onOpenChange}
        submission={existingSubmission}
      />
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        data-action-ui-id="creator-plan-dialog"
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-base">
            {mode === "review" && isEditing
              ? t("skills.mine.prepareReview", "Prepare submission")
              : isEditing
                ? t("skills.submission.editTitle", "Edit Skill information")
                : t("skills.header.submitSkill", "Submit Skill")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t(
                  "skills.submission.editSubtitle",
                  "Update listing information or upload a new package for this Skill.",
                )
              : t(
                  "skills.submission.subtitle",
                  "Save a private Skill, or complete its assets and apply for community listing.",
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="scrollbar-fade flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-6">
            {isEditing ? (
              <section className="flex flex-col gap-3">
                <Alert>
                  <FileArchive />
                  <AlertTitle>
                    {t("skills.submission.currentPackage", "Current Skill package")}
                  </AlertTitle>
                  <AlertDescription>
                    {skillName}
                    {" · v"}
                    {packageVersion}
                  </AlertDescription>
                </Alert>
                <div>
                  <h3 className="text-xs font-medium text-foreground">
                    {t("skills.submission.updatePackage", "Update Skill package (optional)")}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(
                      "skills.submission.updatePackageDesc",
                      "Upload a new ZIP / .tar.gz only when the Skill implementation changed. Its name must remain unchanged.",
                    )}
                  </p>
                </div>
                <PackagePicker
                  inputRef={replacementPackageInputRef}
                  fileName={packageFile?.name}
                  loading={staging}
                  title={t("skills.submission.chooseNewPackage", "Choose a new package")}
                  hint={t(
                    "skills.submission.packageHint",
                    "Max 50 MB; the package must contain SKILL.md",
                  )}
                  actionId="skill-submission-replacement-package"
                  onFile={(file) => void handlePackage(file, true)}
                  error={reviewErrors.packageVersion}
                />
              </section>
            ) : (
              <section className="flex flex-col gap-3">
                <Label>{t("skills.submission.source", "Submission source")}</Label>
                <RadioGroup
                  value={source}
                  onValueChange={(value) => handleSourceChange(value)}
                  className="grid-cols-2"
                >
                  <Label
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-foreground/[0.03]"
                    data-action-ui-id="skill-submission-source-upload"
                  >
                    <RadioGroupItem value="upload" />
                    <span className="flex min-w-0 gap-3">
                      <Icon icon={Upload} size="md" />
                      <span>
                        <span className="block text-xs font-medium text-foreground">
                          {t("skills.submission.uploadPackage", "Upload Skill package")}
                        </span>
                        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                          {t(
                            "skills.submission.uploadPackageDesc",
                            "Upload ZIP / .tar.gz, then enter listing information manually.",
                          )}
                        </span>
                      </span>
                    </span>
                  </Label>
                  <Label
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-foreground/[0.03]"
                    data-action-ui-id="skill-submission-source-design"
                  >
                    <RadioGroupItem value="design" />
                    <span className="flex min-w-0 gap-3">
                      <Icon icon={FileArchive} size="md" />
                      <span>
                        <span className="block text-xs font-medium text-foreground">
                          {t("skills.submission.chooseDesign", "Choose from Design")}
                        </span>
                        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                          {t(
                            "skills.submission.chooseDesignDesc",
                            "Read information from a Skill created in MiniMax Design.",
                          )}
                        </span>
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
                {source === "upload" ? (
                  <>
                    <PackagePicker
                      inputRef={packageInputRef}
                      fileName={packageFile?.name}
                      loading={staging}
                      title={t("skills.submission.choosePackage", "Choose ZIP / .tar.gz")}
                      hint={t(
                        "skills.submission.packageHint",
                        "Max 50 MB; the package must contain SKILL.md",
                      )}
                      actionId="skill-submission-package"
                      onFile={(file) => void handlePackage(file, false)}
                    />
                    <Alert>
                      <Info />
                      <AlertTitle>
                        {t("skills.submission.uploadManualTitle", "Enter information manually")}
                      </AlertTitle>
                      <AlertDescription>
                        {t(
                          "skills.submission.uploadManualDesc",
                          "The original package is kept unchanged. Uploaded Skills are Private by default.",
                        )}
                      </AlertDescription>
                    </Alert>
                  </>
                ) : mySkills.length > 0 ? (
                  <>
                    <Select
                      value={skillName}
                      onValueChange={(value) => {
                        const skill = mySkills.find((item) => item.name === value);
                        if (skill)
                          fillFromSkill(
                            skill,
                            existingSubmission?.skillName === value ? existingSubmission : void 0,
                          );
                      }}
                    >
                      <SelectTrigger
                        className="w-full min-w-0"
                        data-action-ui-id="skill-submission-design-select"
                      >
                        <SelectValue
                          className="min-w-0 truncate"
                          placeholder={t(
                            "skills.submission.chooseDesignPlaceholder",
                            "Select a Skill you've created",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent align="start" className="max-w-(--available-width)">
                        {skillOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="[&>:first-child]:min-w-0 [&>:first-child]:whitespace-normal"
                          >
                            <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {skillName && (
                      <Alert
                        className="border-success/30 bg-success/10 text-success"
                        data-action-ui-id="skill-submission-design-read-success"
                      >
                        <CheckCircle2 />
                        <AlertTitle>
                          {t("skills.submission.designReadSuccess", "Skill information read")}
                        </AlertTitle>
                        <AlertDescription className="text-success/80">
                          {t(
                            "skills.submission.designReadSuccessDesc",
                            "The fields below were filled from the selected Skill. Review them before saving.",
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert>
                    <Info />
                    <AlertTitle>
                      {t("skills.submission.noDesignSkills", "No Skills created in Design yet.")}
                    </AlertTitle>
                    {onCreateSkill && (
                      <AlertDescription>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={onCreateSkill}
                          data-action-ui-id="skill-submission-create-design"
                        >
                          {t("skills.submission.createNow", "Create one now")}
                        </Button>
                      </AlertDescription>
                    )}
                  </Alert>
                )}
              </section>
            )}
            <FormSection
              title={t("skills.submission.basicInfoSection", "Basic information")}
              description={t(
                "skills.submission.basicInfoSectionDesc",
                "Skill name, display name, and creator information",
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field$1 label={t("skills.submission.skillName", "Skill name")} required={true}>
                  <Input
                    value={skillName}
                    disabled={true}
                    placeholder={t(
                      "skills.submission.skillNamePlaceholder",
                      "short-drama-series-writer",
                    )}
                  />
                </Field$1>
                <Field$1
                  label={t("skills.submission.displayName", "Display name")}
                  required={true}
                  error={reviewErrors.displayName}
                >
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={reviewLimits.displayNameMax}
                    placeholder={t(
                      "skills.submission.displayNamePlaceholder",
                      "e.g. 3D Animation Short Generator",
                    )}
                    data-action-ui-id="skill-submission-display-name"
                    aria-invalid={!!reviewErrors.displayName}
                  />
                </Field$1>
                <Field$1
                  label={t("skills.submission.creator", "Creator")}
                  required={true}
                  error={reviewErrors.creator}
                >
                  <Input
                    value={creator}
                    onChange={(event) => setCreator(event.target.value)}
                    maxLength={reviewLimits.creatorMax}
                    data-action-ui-id="skill-submission-creator"
                    aria-invalid={!!reviewErrors.creator}
                  />
                </Field$1>
              </div>
              <Field$1
                label={t("skills.submission.packageVersion", "Skill package version")}
                required={true}
                error={reviewErrors.packageVersion}
                hint={t("skills.submission.packageVersionHint", "Semantic version in x.y.z format")}
              >
                <Input
                  value={packageVersion}
                  disabled={true}
                  placeholder={t("skills.submission.packageVersionPlaceholder", "1.0.0")}
                  data-action-ui-id="skill-submission-package-version"
                  aria-invalid={!!reviewErrors.packageVersion}
                />
              </Field$1>
            </FormSection>
            <FormSection
              title={t("skills.submission.listingInfoSection", "Listing information")}
              description={t(
                "skills.submission.listingInfoSectionDesc",
                "Summary, best-fit scenarios, usage, and deliverables",
              )}
            >
              <Field$1
                label={t("skills.submission.summary", "One-line summary")}
                required={true}
                hint={`${summary.length}/${reviewLimits.summaryMax} · ${t("skills.submission.summaryHint", `Describe the core capability in ${reviewLimits.summaryMin}–${reviewLimits.summaryMax} characters`)}`}
                error={reviewErrors.summary}
              >
                <Textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={2}
                  maxLength={reviewLimits.summaryMax}
                  placeholder={t(
                    "skills.submission.summaryPlaceholder",
                    "Summarize the core capability and main value of this Skill in one sentence",
                  )}
                  data-action-ui-id="skill-submission-summary"
                  aria-invalid={!!reviewErrors.summary}
                />
              </Field$1>
              <Field$1
                label={t("skills.submission.bestFor", "Best For")}
                required={true}
                hint={t(
                  "skills.submission.bestForHint",
                  `Enter 2–3 short labels; ${reviewLimits.bestForMinLength}–${reviewLimits.bestForMaxLength} characters per label${reviewLocale === "en" ? ", up to 3 words each" : ""}`,
                )}
                error={reviewErrors.bestFor}
              >
                <div
                  aria-invalid={!!reviewErrors.bestFor}
                  className={`flex min-h-10 flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50 ${reviewErrors.bestFor ? "border-destructive ring-1 ring-destructive/20" : "border-input"}`}
                >
                  {bestFor.map((label) => (
                    <Badge key={label} variant="secondary" className="gap-1">
                      {label}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-4"
                        onClick={() =>
                          setBestFor((current) => current.filter((item) => item !== label))
                        }
                        data-action-ui-id={`skill-submission-best-for-remove-${label}`}
                      >
                        <X className="size-3" strokeWidth={1.75} />
                        <span className="sr-only">
                          {t("skills.submission.removeLabel", "Remove label")}
                        </span>
                      </Button>
                    </Badge>
                  ))}
                  {bestFor.length < reviewLimits.bestForMaxCount && (
                    <Input
                      value={bestForDraft}
                      onChange={(event) => setBestForDraft(event.target.value)}
                      onKeyDown={handleBestForKeyDown}
                      onBlur={handleAddBestFor}
                      maxLength={reviewLimits.bestForMaxLength}
                      className="h-6 min-w-32 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      placeholder={t("skills.submission.bestForPlaceholder", "+ Add a label")}
                      data-action-ui-id="skill-submission-best-for-input"
                    />
                  )}
                </div>
              </Field$1>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field$1
                  label={t("skills.submission.howToUse", "How to Use")}
                  required={true}
                  hint={`${howToUse.length}/${reviewLimits.howToUseMax} · ${t("skills.submission.howToUseHint", `Describe the required input in ${reviewLimits.howToUseMin}–${reviewLimits.howToUseMax} characters`)}`}
                  error={reviewErrors.howToUse}
                >
                  <Textarea
                    value={howToUse}
                    onChange={(event) => setHowToUse(event.target.value)}
                    rows={4}
                    maxLength={reviewLimits.howToUseMax}
                    placeholder={t(
                      "skills.submission.howToUsePlaceholder",
                      "Describe what users need to provide and how to get started",
                    )}
                    data-action-ui-id="skill-submission-how-to-use"
                    aria-invalid={!!reviewErrors.howToUse}
                  />
                </Field$1>
                <Field$1
                  label={t("skills.submission.outputs", "Outputs")}
                  required={true}
                  hint={`${outputs.length}/${reviewLimits.outputsMax} · ${t("skills.submission.outputsHint", `Describe the deliverables in ${reviewLimits.outputsMin}–${reviewLimits.outputsMax} characters`)}`}
                  error={reviewErrors.outputs}
                >
                  <Textarea
                    value={outputs}
                    onChange={(event) => setOutputs(event.target.value)}
                    rows={4}
                    maxLength={reviewLimits.outputsMax}
                    placeholder={t(
                      "skills.submission.outputsPlaceholder",
                      "Describe the main deliverables users will receive",
                    )}
                    data-action-ui-id="skill-submission-outputs"
                    aria-invalid={!!reviewErrors.outputs}
                  />
                </Field$1>
              </div>
            </FormSection>
            <FormSection
              title={t("skills.submission.taxonomySection", "Category and creation stage")}
              description={t(
                "skills.submission.taxonomySectionDesc",
                "Choose one primary category, up to two related categories, and one creation stage",
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field$1
                  label={t("skills.submission.primaryCategory", "Primary category")}
                  required={true}
                  hint={t(
                    "skills.submission.categoriesHint",
                    "Choose the category that best matches this Skill. Add up to two related categories.",
                  )}
                  error={reviewErrors.categories}
                >
                  <Select
                    value={categories[0] ?? ""}
                    onValueChange={(value) =>
                      setCategories(value ? [value, ...categories.slice(1)] : categories.slice(1))
                    }
                  >
                    <SelectTrigger
                      data-action-ui-id="skill-submission-category"
                      aria-invalid={!!reviewErrors.categories}
                    >
                      <SelectValue
                        placeholder={t(
                          "skills.submission.categoryPlaceholder",
                          "Select a primary category",
                        )}
                      >
                        {selectedCategory
                          ? isZh
                            ? selectedCategory.cn_name
                            : selectedCategory.en_name
                          : void 0}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {configuredCategories.map((category) => (
                        <SelectItem key={category.category} value={category.category}>
                          {isZh ? category.cn_name : category.en_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field$1>
                {[0, 1].map((relatedIndex) => {
                  const categoryCode = selectedRelatedCategories[relatedIndex] ?? "";
                  const selectedRelated = configuredCategories.find(
                    (category) => category.category === categoryCode,
                  );
                  return (
                    <Field$1
                      key={`related-category-${relatedIndex}`}
                      label={`${t("skills.submission.relatedCategory", "Related category")} ${relatedIndex + 1}`}
                    >
                      <Select
                        value={categoryCode || "__none__"}
                        onValueChange={(value) => {
                          setCategories((current) => {
                            const next = current.slice(0, 3);
                            if (value && value !== "__none__") next[relatedIndex + 1] = value;
                            else next.splice(relatedIndex + 1, 1);
                            return next.filter(Boolean);
                          });
                        }}
                      >
                        <SelectTrigger
                          data-action-ui-id={`skill-submission-related-category-${relatedIndex + 1}`}
                        >
                          <SelectValue
                            placeholder={t(
                              "skills.submission.relatedCategoryPlaceholder",
                              "Optional related category",
                            )}
                          >
                            {selectedRelated
                              ? isZh
                                ? selectedRelated.cn_name
                                : selectedRelated.en_name
                              : void 0}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {t("skills.submission.relatedCategoryNone", "No related category")}
                          </SelectItem>
                          {configuredCategories
                            .filter(
                              (category) =>
                                category.category === categoryCode ||
                                !categories.includes(category.category),
                            )
                            .map((category) => (
                              <SelectItem key={category.category} value={category.category}>
                                {isZh ? category.cn_name : category.en_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </Field$1>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field$1
                  label={t("skills.submission.stage", "Creation stage")}
                  required={true}
                  error={reviewErrors.stage}
                >
                  <Select value={stage} onValueChange={(value) => value && setStage(value)}>
                    <SelectTrigger
                      data-action-ui-id="skill-submission-stage"
                      aria-invalid={!!reviewErrors.stage}
                    >
                      <SelectValue
                        placeholder={t(
                          "skills.submission.stagePlaceholder",
                          "Select one creation stage",
                        )}
                      >
                        {selectedStage
                          ? isZh
                            ? selectedStage.cn_name
                            : selectedStage.en_name
                          : void 0}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {configuredStages.map((item) => (
                        <SelectItem key={item.category} value={item.category}>
                          {isZh ? item.cn_name : item.en_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field$1>
              </div>
            </FormSection>
            <FormSection
              title={t("skills.submission.assetsSection", "Cover image and showcase video")}
              description={t(
                "skills.submission.assetsSectionDesc",
                "Upload the cover and video used for marketplace review",
              )}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AssetPicker
                  title={t("skills.submission.cover", "Cover")}
                  hint={t(
                    "skills.submission.coverHint",
                    "PNG / JPG / WebP, 16:9, max 10 MB; required for review",
                  )}
                  icon={ImagePlus}
                  fileName={
                    coverFile?.name ||
                    (existingSubmission?.coverObjectKey || selectedSkill?.coverObjectKey
                      ? t("skills.submission.assetUploaded", "Uploaded")
                      : "")
                  }
                  preview={coverPreview || existingSubmission?.coverUrl || selectedSkill?.coverUrl}
                  inputRef={coverInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onFile={handleCover}
                  onClear={() => {
                    setCoverFile(void 0);
                    setCoverEdited(true);
                    setCoverPreview("");
                  }}
                  actionId="skill-submission-cover"
                  clearLabel={t("skills.submission.clearAsset", "Clear asset")}
                  clearable={!!coverFile}
                  error={reviewErrors.cover}
                  onPreviewError={() => {
                    void onRefreshSubmissions?.();
                  }}
                />
                <AssetPicker
                  title={t("skills.submission.showcase", "Showcase")}
                  required={true}
                  hint={t("skills.submission.showcaseHint", "Choose 1 file, up to 1000 MB")}
                  icon={Video}
                  fileName={
                    showcaseFile?.name ||
                    (!showcaseEdited && hasShowcase
                      ? t("skills.submission.assetUploaded", "Uploaded")
                      : "")
                  }
                  inputRef={showcaseInputRef}
                  accept="video/mp4,video/quicktime,video/webm"
                  onFile={handleShowcase}
                  onClear={() => {
                    setShowcaseFile(void 0);
                    setShowcaseEdited(true);
                  }}
                  actionId="skill-submission-showcase"
                  clearLabel={t("skills.submission.clearAsset", "Clear asset")}
                  clearable={!!showcaseFile}
                  error={reviewErrors.showcase}
                />
              </div>
            </FormSection>
          </div>
        </div>
        <DialogFooter className="items-center justify-between border-t border-border px-6 py-4 sm:justify-between">
          <p className="max-w-md text-[11px] text-muted-foreground">
            {t(
              "skills.submission.reviewNote",
              "When a published Skill update is under review, the current live version remains available.",
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!!savingMode}
              onClick={() => onOpenChange(false)}
              data-action-ui-id="skill-submission-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!privateSaveReady || !!savingMode}
              loading={savingMode === "private"}
              onClick={() => void handleSave(false)}
              data-action-ui-id="skill-submission-save-private"
            >
              {isEditing
                ? t("skills.mine.saveChanges", "Save changes")
                : t("skills.submission.savePrivate", "Save as Private")}
            </Button>
            {mode === "review" && (
              <Button
                type="button"
                disabled={!privateSaveReady || !!savingMode}
                loading={savingMode === "review"}
                onClick={() => void handleSave(true)}
                data-action-ui-id="skill-submission-apply-review"
              >
                {t("skills.submission.applyReview", "Apply for Review")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
