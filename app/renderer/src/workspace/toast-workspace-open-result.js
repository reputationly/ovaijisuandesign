// toast-workspace-open-result.js
import { isChineseLocale } from "./topbar-state-context.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { getDesktopSettingsMainService } from "../team/copy-icon-button.jsx";

const MAX_LISTED_BUSY_PROJECTS = 3;

function formatBusyProjects(names) {
  const zh2 = isChineseLocale();
  const listed = names
    .slice(0, MAX_LISTED_BUSY_PROJECTS)
    .join(zh2 ? "、" : ", ");
  if (names.length <= MAX_LISTED_BUSY_PROJECTS) return listed;
  return zh2 ? `${listed} 等` : `${listed} and others`;
}

function workspaceLimitFallback() {
  return isChineseLocale()
    ? "最多同时运行 {{max}} 个项目，运行位当前都被占用。稍后再试即可打开。"
    : "Up to {{max}} projects can run at once and every slot is currently taken. Try again shortly.";
}

function workspaceLimitNamedFallback() {
  return isChineseLocale()
    ? "最多同时运行 {{max}} 个项目，{{projects}} 正在生成中。等它完成后即可打开。"
    : "Up to {{max}} projects can run at once, and {{projects}} are still generating. Open this one once that finishes.";
}

function retryInFlightFallback() {
  return isChineseLocale()
    ? "这个 workspace 正在重启，请稍后再试。"
    : "This workspace is restarting. Please try again in a moment.";
}

function storageRestartRequiredFallback() {
  return isChineseLocale()
    ? "保存位置刚刚发生更改。请先重启应用，再新建项目，确保文件保存到正确位置。"
    : "The save location just changed. Restart the app before creating a project so files are saved in the correct location.";
}

function storageLocationUnavailableFallback() {
  return isChineseLocale()
    ? "已设置的保存位置当前不可用。请重新连接磁盘，或前往“设置 > 存储”更改位置后再试。"
    : "The configured save location is unavailable. Reconnect the drive or change it in Settings > Storage, then try again.";
}

function storageCreateUnavailableFallback(statusVerified) {
  if (!statusVerified) {
    return isChineseLocale()
      ? "暂时无法确认当前保存位置，项目未创建。请重启应用；如果问题仍存在，请前往“设置 > 存储”检查。"
      : "The current save location could not be verified, so the project was not created. Restart the app, then check Settings > Storage if the issue persists.";
  }
  return isChineseLocale()
    ? "设置的保存位置当前不可用，项目未创建。请前往“设置 > 存储”恢复，或在新建弹窗中明确选择本次临时使用默认位置。"
    : "The configured save location is unavailable, so the project was not created. Recover it in Settings > Storage, or explicitly allow built-in storage for one create.";
}

function storageMigrationInProgressFallback() {
  return isChineseLocale()
    ? "正在迁移项目和生成文件，请等待迁移完成并按提示重启后再试。"
    : "Projects and generated files are being migrated. Wait for migration to finish and restart when prompted.";
}

export function toastWorkspaceOpenResult(result, t2, options = {}) {
  switch (result.kind) {
    case "limit_reached": {
      const projects = formatBusyProjects(result.busyProjectNames);
      dedupedToast.warning(
        projects
          ? t2("workspace.open.limitReachedNamed", {
              max: result.maxOpenWorkspaces,
              projects,
              defaultValue: workspaceLimitNamedFallback(),
            })
          : t2("workspace.open.limitReached", {
              max: result.maxOpenWorkspaces,
              defaultValue: workspaceLimitFallback(),
            }),
      );
      break;
    }
    case "retry_in_flight":
      dedupedToast.info(
        t2("workspace.open.retryInFlight", {
          defaultValue: retryInFlightFallback(),
        }),
      );
      break;
    case "storage_restart_required":
      dedupedToast.warning(
        t2("workspace.open.storageRestartRequired", {
          defaultValue: storageRestartRequiredFallback(),
        }),
        {
          action: {
            label: t2("settings.restartNow"),
            onClick: () => void getDesktopSettingsMainService().relaunch(),
          },
        },
      );
      break;
    case "storage_unavailable": {
      const statusVerified = result.statusSource === "verified";
      trackEvent(TRACK_EVENTS.DATA_DIRECTORY_FALLBACK_CREATE, {
        outcome: "blocked",
        reason_code: result.reasonCode,
        status_source: result.statusSource,
        temporary_default_allowed: result.allowTemporaryDefault,
      });
      dedupedToast.warning(
        t2(
          statusVerified
            ? "workspace.open.storageUnavailable"
            : "workspace.open.storageStatusUnavailable",
          {
            defaultValue: storageCreateUnavailableFallback(statusVerified),
          },
        ),
        result.allowTemporaryDefault && options.onTemporaryDefault
          ? {
              action: {
                label: t2("workspace.newProject.useTemporaryDefault"),
                onClick: options.onTemporaryDefault,
              },
            }
          : void 0,
      );
      break;
    }
    case "storage_location_unavailable":
      dedupedToast.warning(
        t2("workspace.open.storageLocationUnavailable", {
          defaultValue: storageLocationUnavailableFallback(),
        }),
      );
      break;
    case "storage_migration_in_progress":
      dedupedToast.warning(
        t2("workspace.open.storageMigrationInProgress", {
          defaultValue: storageMigrationInProgressFallback(),
        }),
      );
      break;
  }
}
