// ComfyUI 模型下载区：下载任务行、进度与详情文案。
import {
  h as useTranslation,
  kP as useComfyUiDownloadProgress,
  kQ as isActiveComfyUiDownloadTask,
  cf as Download,
  ka as Progress,
  fM as Button,
  bU as PlaybackStopIcon,
  X,
  bO as CircleAlert,
  ez as ShieldCheck,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function ComfyUiModelDownloadSection() {
  const { t } = useTranslation();
  const { tasks, cancelTask, dismissTask } = useComfyUiDownloadProgress();
  const visibleTasks = tasks.filter(
    (task) =>
      isActiveComfyUiDownloadTask(task) ||
      task.status === "failed" ||
      task.untrustedSourceModels.length > 0,
  );
  const activeTaskCount = visibleTasks.filter(isActiveComfyUiDownloadTask).length;
  if (visibleTasks.length === 0) return null;
  return (
    <section
      className="mb-4 overflow-hidden rounded-lg border border-border bg-card"
      aria-label={t("workflows.downloads.title")}
      data-action-ui-id="workflows-model-downloads"
    >
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Download size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">{t("workflows.downloads.title")}</h2>
          {activeTaskCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("chat.workflow.downloadActiveCount", {
                count: activeTaskCount,
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="divide-y divide-border">
        {[...visibleTasks].reverse().map((task) => (
          <DownloadTaskRow
            key={task.id}
            task={task}
            onCancel={() => cancelTask(task.id)}
            onDismiss={() => dismissTask(task.id)}
          />
        ))}
      </div>
    </section>
  );
}
function DownloadTaskRow({ task, onCancel, onDismiss }) {
  const { t } = useTranslation();
  const active = isActiveComfyUiDownloadTask(task);
  const Icon2 = getTaskIcon(task);
  return (
    <div className="px-4 py-3" data-action-ui-id="workflows-model-download-task">
      <div className="flex items-start gap-3">
        <Icon2 size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{task.workflowTitle}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {t(`chat.workflow.downloadStatus.${task.status}`)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{getTaskDetail(task, t)}</p>
          {task.status === "downloading" ? (
            <div className="mt-2 flex items-center gap-3">
              <Progress value={task.percent ?? null} className="h-1.5 flex-1" />
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatProgress(task)}
              </span>
            </div>
          ) : null}
          {task.status === "failed" && task.error ? (
            <p className="mt-2 line-clamp-2 text-xs text-destructive">{task.error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {active ? (
            <Button
              type="button"
              size="xs"
              variant="destructive"
              onClick={onCancel}
              data-action-ui-id="workflows-model-download-cancel"
            >
              <PlaybackStopIcon />
              {t("chat.workflow.downloadCancel")}
            </Button>
          ) : null}
          {!active ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("common.close")}
              onClick={onDismiss}
              data-action-ui-id="workflows-model-download-dismiss"
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function getTaskIcon(task) {
  if (task.status === "failed") return CircleAlert;
  if (task.untrustedSourceModels.length) return CircleAlert;
  if (task.status === "verifying") return ShieldCheck;
  return Download;
}
function getTaskDetail(task, t) {
  if (task.status === "verifying") {
    return task.currentModel
      ? t("chat.workflow.verifyingModel", {
          name: task.currentModel,
        })
      : t("chat.workflow.downloadStatus.verifying");
  }
  if (task.currentModel) return task.currentModel;
  if (task.untrustedSourceModels.length) {
    return t("chat.workflow.unsupportedSources", {
      count: task.untrustedSourceModels.length,
    });
  }
  if (task.missingSourceModels.length) {
    return t("chat.workflow.missingSources", {
      count: task.missingSourceModels.length,
    });
  }
  return t(`chat.workflow.downloadStatus.${task.status}`);
}
function formatProgress(task) {
  return task.percent !== void 0
    ? `${task.percent}% · ${formatBytes(task.downloadedBytes)}${task.totalBytes ? ` / ${formatBytes(task.totalBytes)}` : ""}`
    : formatBytes(task.downloadedBytes);
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
