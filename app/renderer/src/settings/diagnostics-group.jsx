// diagnostics-group.jsx
import {
  actionTrailLog,
  externalUrlTargetForLog,
} from "../vendor-inline/vscode-base/graph.jsx";
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Upload } from "../media-editing/package.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { SettingGroup, SettingRow } from "./settings-select.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024)
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}
export function progressPercent(progress) {
  if (!progress) return 0;
  return Math.min(100, Math.max(0, Math.round(progress.percent)));
}
export function formatProgressDisplay(progress) {
  if (!progress) return "";
  const percent = progressPercent(progress);
  const speed = formatSpeed(progress.bytesPerSecond);
  return `${percent}% · ${speed}`;
}
const WINDOWS_UPDATER_INSTALL_OPTIONS = {
  isSilent: false,
  isForceRunAfter: true,
};
export function installUpdateForPlatform(install, os) {
  if (os === "win32") {
    return install({
      ...WINDOWS_UPDATER_INSTALL_OPTIONS,
    });
  }
  return install();
}
export async function openManualInstallerDownload(
  shell,
  url2,
  fallbackUrl,
  source,
) {
  try {
    await shell.openExternal(url2);
  } catch (error) {
    actionTrailLog.warn("update manual download open failed", {
      source,
      target: externalUrlTargetForLog(url2),
      error,
    });
    if (!fallbackUrl || fallbackUrl === url2) return;
    try {
      await shell.openExternal(fallbackUrl);
    } catch (fallbackError) {
      actionTrailLog.warn("update official download page open failed", {
        source,
        target: externalUrlTargetForLog(fallbackUrl),
        error: fallbackError,
      });
    }
  }
}
function normalizeForCompare(filePath, caseInsensitive) {
  const unified = filePath.replace(/\\/g, "/").replace(/\/+$/, "");
  return caseInsensitive ? unified.toLowerCase() : unified;
}
export function isPathInWhitelist(target, whitelist, caseInsensitive) {
  if (!target) return false;
  const normalizedTarget = normalizeForCompare(target, caseInsensitive);
  return whitelist.some((dir) => {
    const normalizedDir = normalizeForCompare(dir, caseInsensitive);
    if (!normalizedDir) return false;
    return normalizedTarget === normalizedDir || normalizedTarget.startsWith(`${normalizedDir}/`);
  });
}
export function DiagnosticsGroup() {
  const { t } = useTranslation();
  const [uploading, setUploading] = reactExports.useState(false);
  const openLogDir = reactExports.useCallback(async () => {
    await window.hilo?.diagnostics?.openLogDir();
  }, []);
  const uploadLogs = reactExports.useCallback(async () => {
    if (!window.hilo?.diagnostics?.uploadLogs) return;
    setUploading(true);
    try {
      const result = await window.hilo.diagnostics.uploadLogs("manual");
      if (result.success) {
        dedupedToast.success(t("settings.uploadLogsSuccess"));
      } else {
        dedupedToast.error(result.error ?? t("settings.uploadLogsFailed"));
      }
    } catch {
      dedupedToast.error(t("settings.uploadLogsFailed"));
    } finally {
      setUploading(false);
    }
  }, [t]);
  return (
    <SettingGroup title={t("settings.groupDiagnostics")}>
      <SettingRow
        label={t("settings.logDirectory")}
        description={t("settings.logDirectoryDesc")}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          onClick={() => void openLogDir()}
        >
          <LocalFolderIcon />
          {t("settings.openLogDir")}
        </Button>
      </SettingRow>
      <SettingRow
        label={t("settings.uploadLogs")}
        description={t("settings.uploadLogsDesc")}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          disabled={uploading}
          onClick={() => void uploadLogs()}
        >
          <Upload
            size={14}
            strokeWidth={1.5}
            className={uploading ? "animate-pulse" : ""}
          />
          {uploading
            ? t("settings.uploadLogsUploading")
            : t("settings.uploadLogs")}
        </Button>
      </SettingRow>
    </SettingGroup>
  );
}
