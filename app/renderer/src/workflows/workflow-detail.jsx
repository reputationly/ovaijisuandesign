// 工作流详情：右侧栏、署名区、封面媒体与详情主视图。
import {
  h as useTranslation,
  kP as useComfyUiDownloadProgress,
  cf as Download,
  ka as Progress,
  fM as Button,
  bU as PlaybackStopIcon,
  r as reactExports,
  o as usePlatform,
  gB as openExternalUrl,
  ar as useIsScrolling,
  dd as Layers3,
  dQ as Package,
  b0 as ArrowLeft,
  ax as PlaybackPlayIcon,
  dZ as PlaybackPauseIcon,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AttributionLicenseControl } from "./attribution.jsx";
import {
  DOWNLOAD_PROGRESS_INTERVAL_MS,
  DOWNLOAD_PROGRESS_STEP,
  calculateFileProgress,
  calculateLiveFileProgress,
  formatFileSize,
  liveDownloadPhase,
} from "./file-progress.js";
import {
  findLatestVisibleWorkflowDownloadTask,
  isActiveWorkflowDownloadTask,
} from "./workflow-card-helpers.js";
import { isWorkflowVideoUrl } from "./workflow-card.jsx";
import { workflowDisplayName, workflowPresentation } from "./workflow-mapping.js";
export function WorkflowDetailRail({ ariaLabel, children }) {
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  return (
    <aside
      ref={scrollRef}
      data-scrolling={isScrolling ? "true" : void 0}
      className="scrollbar-fade scrollbar-fade-compact mr-0.5 min-h-0 overflow-y-auto pr-4 pl-2 [scrollbar-gutter:stable]"
      aria-label={ariaLabel}
      data-action-ui-id="workflows-detail-rail"
    >
      {children}
    </aside>
  );
}
const WORKFLOW_TAG_TRANSLATION_KEYS = {
  api: "workflows.tags.api",
  image: "workflows.tags.image",
  "image to video": "workflows.tags.imageToVideo",
  "first / last frame": "workflows.tags.firstLastFrame",
  local: "workflows.tags.local",
  portrait: "workflows.tags.portrait",
  product: "workflows.tags.product",
  "reference to video": "workflows.tags.referenceToVideo",
  "text to image": "workflows.tags.textToImage",
  "text to video": "workflows.tags.textToVideo",
  video: "workflows.tags.video",
};
function workflowTagLabel(tag, t) {
  const translationKey = WORKFLOW_TAG_TRANSLATION_KEYS[tag.trim().toLocaleLowerCase()];
  return translationKey ? t(translationKey) : tag;
}
function WorkflowAttributionSection({ attributions }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const handleOpenExternal = (url, source) => {
    void openExternalUrl(platform, url, {
      source,
    });
  };
  if (attributions.length === 0) return null;
  return (
    <section className="min-w-0" data-action-ui-id="workflows-detail-attributions">
      <div
        className="mb-3 flex min-h-9 items-center"
        data-action-ui-id="workflows-detail-attribution-heading"
      >
        <h2 className="text-xs font-medium text-foreground">{t("workflows.attribution.title")}</h2>
      </div>
      <div
        className="min-w-0 overflow-hidden rounded-lg bg-muted"
        data-action-ui-id="workflows-detail-attribution-list"
      >
        {attributions.map((attribution) => {
          const metadata = [
            t(`workflows.attribution.sourceKind.${attribution.sourceKind}`),
            t(`workflows.attribution.role.${attribution.role}`),
            ...(attribution.modified ? [t("workflows.attribution.modified")] : []),
          ].join(" · ");
          return (
            <article key={attribution.id} className="min-w-0 px-3 py-3">
              {attribution.url ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="-ml-1 h-auto max-w-full min-w-0 shrink justify-start rounded-sm border-0 px-1 py-0 text-xs font-medium text-foreground hover:bg-foreground/5 hover:underline"
                  aria-label={t("workflows.attribution.viewNamedSource", {
                    name: attribution.name,
                  })}
                  onClick={() => {
                    if (attribution.url) {
                      handleOpenExternal(
                        attribution.url,
                        `workflows.attribution.${attribution.id}`,
                      );
                    }
                  }}
                  data-action-ui-id={`workflows-attribution-source-${attribution.id}`}
                >
                  <span className="truncate">{attribution.name}</span>
                </Button>
              ) : (
                <p className="truncate text-xs font-medium text-foreground">{attribution.name}</p>
              )}
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">{metadata}</p>
                <AttributionLicenseControl
                  attributionId={attribution.id}
                  licenses={attribution.licenses ?? []}
                  onOpenExternal={handleOpenExternal}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function WorkflowDetailMedia({ mediaUrl }) {
  const sourceKey = mediaUrl;
  const [failedSourceKey, setFailedSourceKey] = reactExports.useState();
  if (failedSourceKey !== sourceKey) {
    if (isWorkflowVideoUrl(mediaUrl)) {
      return (
        // Configured demos do not currently carry a separate WebVTT resource.
        // biome-ignore lint/a11y/useMediaCaption: media captions are not part of the catalog contract
        <video
          src={mediaUrl}
          className="size-full object-contain"
          controls={true}
          playsInline={true}
          preload="metadata"
          onError={() => setFailedSourceKey(sourceKey)}
          data-action-ui-id="workflows-detail-media-video"
        />
      );
    }
    return (
      <img
        src={mediaUrl}
        alt=""
        className="size-full object-cover"
        loading="lazy"
        onError={() => setFailedSourceKey(sourceKey)}
        data-action-ui-id="workflows-detail-media-image"
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Layers3 className="size-8" strokeWidth={1.25} />
      <span className="text-sm">ComfyUI</span>
    </div>
  );
}
export function WorkflowDetailView({
  workflow,
  onBack,
  hideHeader = false,
  downloadAvailable = false,
  onDownload,
  embedded = false,
  completedAction,
}) {
  const { t, i18n } = useTranslation();
  const { tasks: downloadTasks, cancelTask } = useComfyUiDownloadProgress();
  const canDownload = downloadAvailable || Boolean(onDownload);
  const [downloadPhase, setDownloadPhase] = reactExports.useState(
    canDownload ? "idle" : "complete",
  );
  const [downloadProgress, setDownloadProgress] = reactExports.useState(canDownload ? 0 : 100);
  const detailScrollRef = reactExports.useRef(null);
  const detailIsScrolling = useIsScrolling({
    scrollRef: detailScrollRef,
  });
  const presentationWorkflow = workflowPresentation(workflow);
  const featuredWorkflow =
    presentationWorkflow.source === "official" ? presentationWorkflow : void 0;
  const dependencies = featuredWorkflow?.modelDependencies ?? [];
  const attributions = featuredWorkflow?.attributions ?? [];
  const detailMediaUrl = presentationWorkflow.detailMediaUrl;
  const detailHeroLayout = detailMediaUrl
    ? embedded
      ? "grid items-stretch gap-6 @min-[48rem]/workflow-detail:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]"
      : "grid items-stretch gap-8 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]"
    : "";
  const detailHeroMinHeight = detailMediaUrl
    ? embedded
      ? "min-h-0 @min-[48rem]/workflow-detail:min-h-80"
      : "min-h-80"
    : "";
  const liveDownloadTask = findLatestVisibleWorkflowDownloadTask(
    downloadTasks,
    presentationWorkflow.id,
  );
  const effectiveDownloadPhase = liveDownloadTask
    ? liveDownloadPhase(liveDownloadTask)
    : downloadPhase;
  const effectiveDownloadProgress = liveDownloadTask
    ? liveDownloadTask.status === "completed"
      ? 100
      : (liveDownloadTask.percent ?? null)
    : downloadProgress;
  const workflowReadyToUse =
    workflow.source === "user" ||
    workflow.installed === true ||
    liveDownloadTask?.status === "completed" ||
    (canDownload && effectiveDownloadPhase === "complete");
  const formattedPackageSize = formatFileSize(presentationWorkflow.fileSize, i18n.language);
  const packageSize =
    workflow.source === "official" && formattedPackageSize !== "—"
      ? t("workflows.detail.approximateSize", {
          size: formattedPackageSize,
        })
      : formattedPackageSize;
  const resourceFiles = [
    {
      key: `${workflow.name}.json`,
      name: `${workflow.name}.json`,
      directory: t("workflows.detail.workflowFile"),
      icon: Layers3,
    },
    ...dependencies.map((dependency) => ({
      key: `${dependency.directory}/${dependency.name}`,
      name: dependency.name,
      directory: dependency.directory,
      icon: Package,
    })),
  ];
  reactExports.useEffect(() => {
    setDownloadPhase(canDownload ? "idle" : "complete");
    setDownloadProgress(canDownload ? 0 : 100);
  }, [canDownload]);
  reactExports.useEffect(() => {
    if (liveDownloadTask || downloadPhase !== "downloading") return;
    const intervalId = window.setInterval(() => {
      setDownloadProgress((currentProgress) =>
        Math.min(100, currentProgress + DOWNLOAD_PROGRESS_STEP),
      );
    }, DOWNLOAD_PROGRESS_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [downloadPhase, liveDownloadTask]);
  reactExports.useEffect(() => {
    if (!liveDownloadTask && downloadProgress >= 100 && downloadPhase === "downloading") {
      setDownloadPhase("complete");
    }
  }, [downloadPhase, downloadProgress, liveDownloadTask]);
  const handleStartDownload = () => {
    if (!downloadAvailable && onDownload) {
      onDownload();
      return;
    }
    setDownloadProgress(0);
    setDownloadPhase("downloading");
  };
  const handleToggleDownload = () => {
    setDownloadPhase((currentPhase) => (currentPhase === "paused" ? "downloading" : "paused"));
  };
  const handleCancelDownload = () => {
    if (liveDownloadTask && isActiveWorkflowDownloadTask(liveDownloadTask)) {
      cancelTask(liveDownloadTask.id);
      return;
    }
    setDownloadProgress(0);
    setDownloadPhase("idle");
  };
  const RootElement = embedded ? "section" : "main";
  return (
    <RootElement
      className="@container/workflow-detail relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background"
      data-action-ui-id="workflows-detail"
    >
      {!embedded && !hideHeader ? (
        <header className="shrink-0 border-b border-border px-8 py-4 lg:px-16">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 border-0 hover:bg-brand-accent/10 hover:text-brand-accent"
            onClick={onBack}
            data-action-ui-id="workflows-detail-back"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            {t("workflows.detail.back")}
          </Button>
        </header>
      ) : null}
      <div
        ref={detailScrollRef}
        data-scrolling={detailIsScrolling ? "true" : void 0}
        data-action-ui-id="workflows-detail-scroll"
        className={`scrollbar-fade scrollbar-fade-compact min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] ${embedded ? "p-5" : "px-8 py-8 lg:px-16"}`}
      >
        <div className={embedded ? "min-w-0 space-y-6" : "mx-auto max-w-6xl space-y-8"}>
          <section className={`min-w-0 ${detailHeroLayout}`}>
            <div className={`flex min-w-0 flex-col py-2 ${detailHeroMinHeight}`}>
              <div className="min-w-0">
                <h1
                  className={`break-words font-heading font-medium tracking-[0.02em] text-foreground ${embedded ? "pr-9 text-lg leading-6 @min-[48rem]/workflow-detail:pr-0 @min-[48rem]/workflow-detail:text-xl @min-[48rem]/workflow-detail:leading-7" : "text-3xl"}`}
                >
                  {workflowDisplayName(presentationWorkflow)}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  {presentationWorkflow.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-foreground/[0.06] px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {workflowTagLabel(tag, t)}
                    </span>
                  ))}
                </div>
                <p className="mt-6 max-w-xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {presentationWorkflow.longDesc || presentationWorkflow.shortDesc || "—"}
                </p>
              </div>
              <div className="mt-auto space-y-2 pt-8">
                {canDownload && effectiveDownloadPhase === "idle" ? (
                  <Button
                    type="button"
                    size="lg"
                    className={`${embedded ? "h-auto min-h-11 min-w-0 whitespace-normal py-2" : "h-11"} w-full border-0 bg-brand-accent text-sm text-brand-accent-foreground shadow-none transition-opacity hover:text-brand-accent-foreground hover:opacity-90`}
                    aria-label={`${t("workflows.detail.startDownload")}${packageSize !== "—" ? ` ${packageSize}` : ""}`}
                    onClick={handleStartDownload}
                    data-action-ui-id="workflows-detail-download"
                  >
                    <Download size={16} strokeWidth={2} />
                    <span>{t("workflows.detail.startDownload")}</span>
                    {packageSize !== "—" ? (
                      <span className="text-brand-accent-foreground/70">
                        {"· "}
                        {packageSize}
                      </span>
                    ) : null}
                  </Button>
                ) : effectiveDownloadPhase === "downloading" ||
                  effectiveDownloadPhase === "paused" ? (
                  <div
                    className="flex h-11 w-full flex-col justify-center rounded-lg bg-foreground px-4 text-background"
                    role="status"
                    aria-live="polite"
                    data-action-ui-id="workflows-detail-download-progress"
                  >
                    <Progress
                      value={effectiveDownloadProgress}
                      className="gap-1.5 [&_[data-slot=progress-indicator]]:bg-background [&_[data-slot=progress-track]]:bg-background/20"
                    >
                      <div className="flex w-full items-center justify-between gap-3 text-xs font-medium">
                        <span>
                          {effectiveDownloadPhase === "paused"
                            ? t("workflows.detail.downloadPaused")
                            : liveDownloadTask
                              ? t(`chat.workflow.downloadStatus.${liveDownloadTask.status}`)
                              : t("workflows.detail.downloading")}
                        </span>
                        <span className="tabular-nums">
                          {effectiveDownloadProgress === null
                            ? "—"
                            : `${Math.round(effectiveDownloadProgress)}%`}
                        </span>
                      </div>
                    </Progress>
                  </div>
                ) : completedAction && workflowReadyToUse ? (
                  completedAction
                ) : null}
              </div>
            </div>
            {detailMediaUrl ? (
              <div className="min-w-0 self-start overflow-hidden rounded-lg bg-muted">
                <div className="flex aspect-video w-full items-center justify-center">
                  <WorkflowDetailMedia mediaUrl={detailMediaUrl} />
                </div>
              </div>
            ) : null}
          </section>
          <section>
            <article
              className="rounded-lg bg-card p-5"
              data-action-ui-id="workflows-detail-installation"
            >
              {effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused" ? (
                <div className="flex justify-end">
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1">
                      {!liveDownloadTask ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="border-0 hover:bg-brand-accent/10 hover:text-brand-accent"
                          onClick={handleToggleDownload}
                          data-action-ui-id="workflows-detail-download-toggle"
                        >
                          {effectiveDownloadPhase === "paused" ? (
                            <PlaybackPlayIcon size={14} strokeWidth={1.5} />
                          ) : (
                            <PlaybackPauseIcon size={14} strokeWidth={1.5} />
                          )}
                          {effectiveDownloadPhase === "paused"
                            ? t("workflows.detail.resumeDownload")
                            : t("workflows.detail.pauseDownload")}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleCancelDownload}
                        data-action-ui-id="workflows-detail-download-cancel"
                      >
                        <PlaybackStopIcon size={14} strokeWidth={1.5} />
                        {t("workflows.detail.cancelDownload")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div
                className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 ${attributions.length ? "@min-[46rem]/workflow-detail:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.9fr)]" : ""} ${effectiveDownloadPhase === "downloading" || effectiveDownloadPhase === "paused" ? "mt-5 border-t border-border pt-5" : ""}`}
              >
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-medium text-foreground">
                        {t("workflows.detail.resources")}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("workflows.detail.resourcesHint")}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("workflows.detail.resourceCount", {
                        count: resourceFiles.length,
                      })}
                    </span>
                  </div>
                  <div
                    className="min-w-0 overflow-hidden rounded-lg bg-muted"
                    data-action-ui-id="workflows-detail-resource-list"
                  >
                    {resourceFiles.map(({ key, name, directory, icon: FileIcon }, fileIndex) => {
                      const fileProgress = liveDownloadTask
                        ? calculateLiveFileProgress(liveDownloadTask, name, fileIndex)
                        : calculateFileProgress(downloadProgress, fileIndex, resourceFiles.length);
                      const fileCompleted =
                        effectiveDownloadPhase === "complete" ||
                        (fileProgress !== null && fileProgress >= 100);
                      const showFileProgress =
                        !fileCompleted &&
                        (effectiveDownloadPhase === "downloading" ||
                          effectiveDownloadPhase === "paused");
                      const fileStatus =
                        liveDownloadTask?.currentModel === name &&
                        liveDownloadTask.status !== "completed"
                          ? fileProgress === null
                            ? t(`chat.workflow.downloadStatus.${liveDownloadTask.status}`)
                            : `${Math.round(fileProgress)}%`
                          : null;
                      return (
                        <div key={key} className="min-w-0 px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <FileIcon
                              className="size-4 shrink-0 text-muted-foreground"
                              strokeWidth={1.5}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">{name}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {directory}
                              </p>
                            </div>
                            {fileCompleted ? (
                              <span
                                className="size-2 shrink-0 rounded-full bg-success"
                                role="img"
                                aria-label={t("workflows.detail.downloaded")}
                                data-resource-download-status="completed"
                              />
                            ) : fileStatus ? (
                              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                {fileStatus}
                              </span>
                            ) : null}
                          </div>
                          {showFileProgress ? (
                            <Progress
                              value={fileProgress}
                              className="mt-2 gap-0"
                              aria-label={t("workflows.detail.fileDownloadProgress", {
                                name,
                                progress: Math.round(fileProgress ?? 0),
                              })}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {attributions.length ? (
                  <WorkflowAttributionSection attributions={attributions} />
                ) : null}
              </div>
            </article>
          </section>
        </div>
      </div>
    </RootElement>
  );
}
