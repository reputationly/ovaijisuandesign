// 精选工作流卡片：封面（图片/视频）、下载进度。
import { useTranslation, jsxRuntimeExports, PanelsTopLeft, Eye$2 as Eye } from "../vendor.js";
import { useComfyUiDownloadProgress } from "../vendor-inline/vscode-base/graph.jsx";
import { Download } from "../media-editing/package.jsx";
import { Progress } from "../team/team-management-detail-loading.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { WorkflowCardAttributionPopover } from "./attribution.jsx";
import {
  findLatestVisibleWorkflowDownloadTask,
  isActiveWorkflowDownloadTask,
  workflowCardMetadata,
} from "./workflow-card-helpers.js";
import { workflowDisplayName, workflowPresentation } from "./workflow-mapping.js";
const WORKFLOW_VIDEO_URL_PATTERN = /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i;
export function isWorkflowVideoUrl(url) {
  return WORKFLOW_VIDEO_URL_PATTERN.test(url);
}
function WorkflowCoverMedia({ url }) {
  if (isWorkflowVideoUrl(url)) {
    return (
      <video
        src={url}
        autoPlay={true}
        muted={true}
        loop={true}
        playsInline={true}
        preload="metadata"
        draggable={false}
        className="size-full object-cover"
      >
        <track kind="captions" />
      </video>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="size-full object-cover"
    />
  );
}
export function WorkflowCard({
  workflow,
  metadataLabels,
  locale,
  downloadLabel,
  onDownload,
  viewLabel,
  onView,
  viewDisabled = false,
  downloadDisabled = false,
  fixedLayout = false,
  prepareLabel,
  onPrepare,
  prepareDisabled = false,
  addLabel,
  onAdd,
  addDisabled = false,
  layout = "grid",
  selected = false,
  completedAction,
}) {
  const { t } = useTranslation();
  const { tasks: downloadTasks } = useComfyUiDownloadProgress();
  const metadata =
    workflow.source === "user" ? workflowCardMetadata(workflow, metadataLabels, locale) : [];
  const presentation = workflowPresentation(workflow);
  const displayName = workflowDisplayName(workflow);
  const shortDesc = presentation.shortDesc;
  const attributions = presentation.source === "official" ? (presentation.attributions ?? []) : [];
  const railLayout = layout === "rail";
  const downloadTask = findLatestVisibleWorkflowDownloadTask(downloadTasks, presentation.id);
  const downloadInProgress = Boolean(downloadTask && isActiveWorkflowDownloadTask(downloadTask));
  const workflowReadyToUse =
    workflow.source === "user" || (workflow.installed === true && !downloadInProgress);
  const workflowDownloaded =
    workflow.source === "official" && workflow.installed === true && !downloadInProgress;
  const showCompletedAction = Boolean(completedAction && workflowReadyToUse);
  const showCardActions = Boolean(!railLayout && (onView || onDownload || showCompletedAction));
  const showDownloadProgress = Boolean(downloadInProgress && onDownload);
  const cardChrome = railLayout
    ? `border border-transparent transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:z-10 hover:border-foreground/15 focus-within:z-10 focus-within:border-ring ${selected ? "!border-[var(--workflow-selected-border)] bg-muted/30 shadow-[var(--workflow-selected-shadow)]" : ""}`
    : "transition-shadow duration-200 ease-out hover:z-10 hover:ring-[0.5px] hover:ring-inset hover:ring-border-strong focus-within:z-10 focus-within:ring-[0.5px] focus-within:ring-inset focus-within:ring-border-strong";
  return (
    <article
      aria-current={selected ? "true" : void 0}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg bg-card ${cardChrome} ${fixedLayout ? "h-full" : ""}`}
    >
      {onView ? (
        <button
          type="button"
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none"
          aria-label={viewLabel ? `${viewLabel}: ${displayName}` : displayName}
          aria-pressed={selected}
          onClick={onView}
          disabled={viewDisabled}
          data-action-ui-id={`workflows-view-${workflow.id}`}
        />
      ) : null}
      {!railLayout ? (
        <div className="relative aspect-video w-full shrink-0 items-center justify-center bg-muted">
          {presentation.coverUrl ? (
            <WorkflowCoverMedia url={presentation.coverUrl} />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              ComfyUI
            </span>
          )}
          {showCardActions ? (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex gap-3 p-3 transition-[opacity,transform] duration-200 ease-out motion-reduce:translate-y-0 ${showDownloadProgress ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"}`}
            >
              {showDownloadProgress && downloadTask ? (
                <WorkflowCardDownloadProgress workflowId={workflow.id} task={downloadTask} />
              ) : (
                <>
                  {onView ? (
                    <Button
                      type="button"
                      size="lg"
                      variant="ghost"
                      className="h-9 min-w-0 flex-1 rounded-full border-0 bg-black/50 px-3 text-[13px] font-normal whitespace-nowrap text-white shadow-none backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white"
                      onClick={onView}
                      disabled={viewDisabled}
                      data-action-ui-id={`workflows-card-detail-${workflow.id}`}
                    >
                      <Eye size={14} strokeWidth={1.75} />
                      {viewLabel ?? t("workflows.view")}
                    </Button>
                  ) : null}
                  {showCompletedAction ? (
                    <div
                      className="min-w-0 flex-1 [&_[data-slot=dropdown-menu-trigger]]:!h-9 [&_[data-slot=dropdown-menu-trigger]]:!w-full [&_[data-slot=dropdown-menu-trigger]]:!rounded-full [&_[data-slot=dropdown-menu-trigger]]:!text-[13px] [&_[data-slot=dropdown-menu-trigger]]:!font-normal [&_[data-slot=dropdown-menu-trigger]_svg]:[stroke-width:1.75]"
                      data-action-ui-id="workflows-card-completed-action"
                    >
                      {completedAction}
                    </div>
                  ) : downloadLabel && onDownload ? (
                    <Button
                      type="button"
                      size="lg"
                      variant="ghost"
                      className="h-9 min-w-0 flex-1 rounded-full border-0 bg-brand-accent px-3 text-[13px] font-normal whitespace-nowrap text-brand-accent-foreground shadow-none transition-opacity hover:bg-brand-accent hover:text-brand-accent-foreground hover:opacity-90"
                      onClick={onDownload}
                      disabled={downloadDisabled}
                      data-action-ui-id={`workflows-download-${workflow.id}`}
                    >
                      <Download size={14} strokeWidth={1.75} />
                      {downloadLabel}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 ${railLayout ? "p-5" : "p-4"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-medium text-card-foreground">
            {displayName}
          </h2>
          {workflowDownloaded ? (
            <span
              className="inline-flex h-5 shrink-0 items-center rounded-sm bg-muted px-1.5 text-[10px] font-medium text-foreground"
              data-action-ui-id={`workflows-downloaded-${workflow.id}`}
            >
              {t("workflows.downloaded")}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{shortDesc || "—"}</p>
        {presentation.source === "official" && !railLayout ? (
          <WorkflowCardAttributionPopover
            attributions={attributions}
            workflowId={presentation.id}
          />
        ) : null}
        {workflow.source === "user" ? (
          <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2">
            {metadata.map((item) => (
              <span
                key={item.key}
                title={item.title}
                className="max-w-full truncate text-xs text-muted-foreground"
              >
                {item.text}
              </span>
            ))}
          </div>
        ) : null}
        {onPrepare || onAdd ? (
          <div
            className={`relative z-20 mt-auto grid h-8 shrink-0 gap-2 ${onPrepare && onAdd ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {onPrepare && prepareLabel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border-0 hover:bg-brand-accent hover:text-brand-accent-foreground"
                onClick={onPrepare}
                disabled={prepareDisabled}
                data-action-ui-id={`workflows-prepare-${workflow.id}`}
              >
                <Download size={14} strokeWidth={1.5} />
                {prepareLabel}
              </Button>
            ) : null}
            {onAdd && addLabel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border-0 hover:bg-brand-accent hover:text-brand-accent-foreground"
                onClick={onAdd}
                disabled={addDisabled}
                data-action-ui-id={`workflows-add-${workflow.id}`}
              >
                <PanelsTopLeft size={14} strokeWidth={1.5} />
                {addLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
function WorkflowCardDownloadProgress({ workflowId, task }) {
  const { t } = useTranslation();
  const progress = task.status === "completed" ? 100 : (task.percent ?? null);
  return (
    <div
      className="w-full rounded-sm border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
      data-action-ui-id={`workflows-download-progress-${workflowId}`}
    >
      <Progress
        value={progress}
        className="gap-1.5 [&_[data-slot=progress-indicator]]:bg-foreground"
      >
        <div className="flex w-full items-center justify-between gap-3 text-[11px] font-medium text-foreground">
          <span className="truncate">{t(`chat.workflow.downloadStatus.${task.status}`)}</span>
          <span className="shrink-0 tabular-nums">
            {progress === null ? "—" : `${Math.round(progress)}%`}
          </span>
        </div>
      </Progress>
    </div>
  );
}
