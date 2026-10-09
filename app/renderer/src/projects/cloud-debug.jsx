// 项目列表页的云端项目调试入口：调试工具可用时才显示，列出云端项目与原始数据。
import {
  h as useTranslation,
  r as reactExports,
  gh as canUseDebugTooling,
  gi as listCloudProjects,
  j as jsxRuntimeExports,
  c2 as CloudDownload,
  as as Dialog,
  at as DialogContent,
  gj as DialogHeader,
  g8 as DialogTitle,
  g9 as DialogDescription,
  fM as Button,
  gk as RetryIcon,
  gl as MemberRole,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const INITIAL_STATE = {
  loading: false,
  projects: [],
  errorMessage: null,
  fetchedAt: null,
};
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return index === 0 ? `${bytes} B` : `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}
function formatTimestamp(timestampMs) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "-";
  return new Date(timestampMs).toLocaleString();
}
function roleKey(role) {
  if (role === MemberRole.MEMBER_ROLE_CREATOR) return "project.cloudDebug.role.creator";
  if (role === MemberRole.MEMBER_ROLE_MEMBER) return "project.cloudDebug.role.member";
  return "project.cloudDebug.role.unknown";
}
export function CloudProjectsInspector() {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const [state, setState] = reactExports.useState(INITIAL_STATE);
  const visible = canUseDebugTooling();
  const fetchProjects = reactExports.useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null,
    }));
    try {
      const projects = await listCloudProjects();
      setState({
        loading: false,
        projects,
        errorMessage: null,
        fetchedAt: Date.now(),
      });
    } catch (err) {
      setState({
        loading: false,
        projects: [],
        errorMessage: err instanceof Error ? err.message : String(err),
        fetchedAt: Date.now(),
      });
    }
  }, []);
  const handleOpenChange = reactExports.useCallback(
    (next) => {
      setOpen(next);
      if (next) void fetchProjects();
    },
    [fetchProjects],
  );
  if (!visible) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label={t("project.cloudDebug.trigger")}
        data-action-ui-id="project-list.cloud-debug-trigger"
        className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        <CloudDownload size={14} strokeWidth={1.5} aria-hidden="true" />
        {t("project.cloudDebug.trigger")}
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="lg" data-action-ui-id="project-list.cloud-debug-dialog">
          <DialogHeader>
            <DialogTitle>{t("project.cloudDebug.title")}</DialogTitle>
            <DialogDescription>{t("project.cloudDebug.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {state.loading
                ? t("project.cloudDebug.loading")
                : state.errorMessage
                  ? t("project.cloudDebug.failed", {
                      message: state.errorMessage,
                    })
                  : t("project.cloudDebug.summary", {
                      count: state.projects.length,
                      time: formatTimestamp(state.fetchedAt ?? 0),
                    })}
            </span>
            <Button
              variant="outline"
              size="sm"
              loading={state.loading}
              onClick={() => void fetchProjects()}
              data-action-ui-id="project-list.cloud-debug-refresh"
            >
              {state.loading ? null : <RetryIcon size={14} aria-hidden="true" />}
              {t("project.cloudDebug.refresh")}
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border">
            {state.projects.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {state.loading ? t("project.cloudDebug.loading") : t("project.cloudDebug.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {state.projects.map((project) => (
                  <li key={project.id} className="flex flex-col gap-1 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {project.name || t("project.cloudDebug.unnamed")}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t(roleKey(project.myRole))}
                      </span>
                    </div>
                    <code className="truncate font-mono text-xs text-muted-foreground">
                      {project.id}
                    </code>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {t("project.cloudDebug.members", {
                          count: project.memberCount,
                        })}
                      </span>
                      <span>
                        {t("project.cloudDebug.storage", {
                          used: formatBytes(project.usedBytes),
                          total: formatBytes(project.totalBytes),
                        })}
                      </span>
                      <span>
                        {t("project.cloudDebug.createdAt", {
                          time: formatTimestamp(project.createdAt),
                        })}
                      </span>
                      <span>
                        {t("project.cloudDebug.updatedAt", {
                          time: formatTimestamp(project.updatedAt),
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <details className="rounded-lg bg-foreground/[0.04] px-3 py-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {t("project.cloudDebug.raw")}
            </summary>
            <pre className="mt-2 max-h-60 overflow-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(state.projects, null, 2)}
            </pre>
          </details>
        </DialogContent>
      </Dialog>
    </>
  );
}
