// use-update-actions.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  isElectron,
  useStorage,
  usePlatform,
  ArrowRight,
  Loader2,
  ShieldAlert,
  FolderInput,
  folderNameFromPath,
  X$7,
  Trash2,
  actionTrailLog,
  externalUrlTargetForLog,
  useChangelog,
  useUpdaterContext,
  isCaseInsensitiveOs,
  FolderKey,
  FolderPlus,
  reactDomExports,
  Upload,
} from "../vendor.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  Checkbox,
  Button$1,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SettingGroup, SettingRow } from "../m09/auth-provider.jsx";
import { LocalFolderIcon } from "../m08/browser-inspiration-urls.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { computeVersionDelta, isManualRecoveryRetryable } from "./updater-provider.jsx";
import { useSettings } from "./use-data-directory.js";
import { RestartBanner } from "./use-media-actions.jsx";
function formatSpeed(bytesPerSecond) {
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}
export function progressPercent(progress) {
  if (!progress) return 0;
  return Math.min(100, Math.max(0, Math.round(progress.percent)));
}
export function formatProgressDisplay(progress) {
  if (!progress) return "";
  const percent2 = progressPercent(progress);
  const speed = formatSpeed(progress.bytesPerSecond);
  return `${percent2}% · ${speed}`;
}
const WINDOWS_UPDATER_INSTALL_OPTIONS = {
  isSilent: false,
  isForceRunAfter: true,
};
export function installUpdateForPlatform(install, os2) {
  if (os2 === "win32") {
    return install({
      ...WINDOWS_UPDATER_INSTALL_OPTIONS,
    });
  }
  return install();
}
export async function openManualInstallerDownload(shell, url2, fallbackUrl, source) {
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
const ATTENTION_PHASES = new Set(["available", "downloading", "downloaded"]);
function formatVersionLabel(version2) {
  if (!version2) return "";
  return `v${version2.replace(/^v/, "")}`;
}
function hasUpdateAttention(phase) {
  return phase ? ATTENTION_PHASES.has(phase) : false;
}
export function getUpdateSettingsBadgeLabel(phase, t2) {
  switch (phase) {
    case "available":
    case "downloaded":
      return t2("settings.softwareUpdate.badgeNew");
    case "downloading":
      return t2("settings.softwareUpdate.badgeDownloading");
    default:
      return null;
  }
}
export function useUpdateChangelogItem(state2, options) {
  const { i18n } = useTranslation();
  const { manifest } = useChangelog();
  return reactExports.useMemo(() => {
    const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
    const badge = locale === "zh" ? "更新" : "UPDATE";
    if (state2.changelog) {
      return {
        ...state2.changelog,
        id: state2.changelog.version,
        badge,
      };
    }
    const localeData = manifest[locale] ?? manifest.en;
    const item = (() => {
      if (state2.targetVersion) {
        const normalizedTarget = state2.targetVersion.replace(/^v/, "");
        const targetItem = localeData?.items?.find((entry) => {
          return entry.version.replace(/^v/, "") === normalizedTarget;
        });
        if (targetItem) return targetItem;
      }
      return localeData?.items?.[0];
    })();
    if (!item) return null;
    return {
      ...item,
      id: item.version,
      badge: localeData.badge,
    };
  }, [state2.targetVersion, state2.changelog, manifest, i18n.language, options?.fallbackToLatest]);
}
export function useUpdateActions({ manualDownloadSource }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const {
    state: state2,
    capabilities,
    check,
    download,
    cancelDownload,
    install,
    retryInstall,
    dismiss,
  } = useUpdaterContext();
  const [optimisticChecking, setOptimisticChecking] = reactExports.useState(false);
  const checkTimeoutRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (state2.phase === "checking") {
      setOptimisticChecking(true);
      checkTimeoutRef.current = setTimeout(() => setOptimisticChecking(false), 5e3);
    } else {
      setOptimisticChecking(false);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    }
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [state2.phase]);
  const currentVersionLabel = formatVersionLabel(state2.currentVersion);
  const targetVersionLabel = formatVersionLabel(state2.targetVersion);
  const checking = optimisticChecking || state2.phase === "checking";
  const downloading = state2.phase === "downloading";
  const downloaded = state2.phase === "downloaded";
  const available = state2.phase === "available";
  const pendingUpdate = available || downloaded;
  const attentionUpdate = hasUpdateAttention(state2.phase);
  const canManualDownload =
    !!state2.manualDownloadUrl && (state2.manualOnly || state2.phase === "error");
  const canRetryLocalInstall =
    !canManualDownload &&
    state2.phase === "error" &&
    state2.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state2.manualRecoveryCode);
  const progressValue = progressPercent(state2.progress);
  const progressText = formatProgressDisplay(state2.progress);
  const versionDelta = state2.targetVersion
    ? computeVersionDelta(state2.currentVersion, state2.targetVersion)
    : null;
  const ctaLabel = (() => {
    if (checking) return t2("update.version.checking");
    if (downloading) return `${progressValue}%`;
    if (pendingUpdate) return t2("update.version.updateCta");
    return t2("update.version.checkCta");
  })();
  const primaryActionLabel = (() => {
    if (checking) return t2("update.version.checking");
    if (available)
      return canManualDownload ? t2("update.btn.manualDownload") : t2("update.btn.download");
    if (downloading) return `${progressValue}%`;
    if (downloaded) return t2("update.btn.restartNow");
    if (canRetryLocalInstall) return t2("update.btn.retryInstall");
    if (state2.phase === "error" && canManualDownload) return t2("update.btn.manualDownload");
    return t2("update.version.checkCta");
  })();
  const handleManualDownload = reactExports.useCallback(() => {
    if (!state2.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform2.shell,
      state2.manualDownloadUrl,
      state2.manualDownloadFallbackUrl,
      manualDownloadSource,
    );
  }, [
    platform2.shell,
    state2.manualDownloadUrl,
    state2.manualDownloadFallbackUrl,
    manualDownloadSource,
  ]);
  const handleInstall = reactExports.useCallback(() => {
    installUpdateForPlatform(install, platform2.app.os);
  }, [install, platform2.app.os]);
  const handleCheck = reactExports.useCallback(() => {
    setOptimisticChecking(true);
    check({
      userTriggered: true,
    });
  }, [check]);
  const handlePrimaryAction = reactExports.useCallback(() => {
    if (checking || downloading) return;
    if (state2.phase === "available") {
      if (canManualDownload) {
        handleManualDownload();
        return;
      }
      download();
      return;
    }
    if (state2.phase === "downloaded") {
      handleInstall();
      return;
    }
    if (canRetryLocalInstall) {
      void retryInstall();
      return;
    }
    if (state2.phase === "error" && canManualDownload) {
      handleManualDownload();
      return;
    }
    handleCheck();
  }, [
    checking,
    downloading,
    state2.phase,
    canManualDownload,
    canRetryLocalInstall,
    handleManualDownload,
    download,
    handleInstall,
    retryInstall,
    handleCheck,
  ]);
  return {
    state: state2,
    capabilities,
    check,
    download,
    cancelDownload,
    install,
    retryInstall,
    dismiss,
    currentVersionLabel,
    targetVersionLabel,
    checking,
    downloading,
    downloaded,
    available,
    pendingUpdate,
    attentionUpdate,
    canManualDownload,
    canRetryLocalInstall,
    progressValue,
    progressText,
    versionDelta,
    ctaLabel,
    primaryActionLabel,
    showCheckIcon: !pendingUpdate && !downloading,
    primaryActionDisabled: checking || downloading,
    handleCheck,
    handlePrimaryAction,
    handleManualDownload,
    handleInstall,
  };
}
function normalizeForCompare(p3, caseInsensitive) {
  const unified2 = p3.replace(/\\/g, "/").replace(/\/+$/, "");
  return caseInsensitive ? unified2.toLowerCase() : unified2;
}
export function isPathInWhitelist(target, whitelist, caseInsensitive) {
  if (!target) return false;
  const t2 = normalizeForCompare(target, caseInsensitive);
  return whitelist.some((dir) => {
    const d2 = normalizeForCompare(dir, caseInsensitive);
    if (!d2) return false;
    return t2 === d2 || t2.startsWith(`${d2}/`);
  });
}
function useFolderWhitelist() {
  const platform2 = usePlatform();
  const { t: t2 } = useTranslation();
  const [config2, , persistConfig] = useStorage("global.config");
  const whitelist = config2.folderWhitelist ?? [];
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const caseInsensitive = isCaseInsensitiveOs(platform2.app.os);
  const addFolder = reactExports.useCallback(async () => {
    const showOpenDialog = platform2.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
    }).catch(() => void 0);
    const folderPath = picked?.[0];
    if (!folderPath) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await persistConfig((current2) => {
        const existing = current2.folderWhitelist ?? [];
        if (isPathInWhitelist(folderPath, existing, caseInsensitive)) return {};
        const withoutChildren = existing.filter(
          (entry) => !isPathInWhitelist(entry, [folderPath], caseInsensitive),
        );
        return {
          folderWhitelist: [...withoutChildren, folderPath],
        };
      });
      if (!saved) setError(t2("settings.folderWhitelist.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [caseInsensitive, persistConfig, platform2.fs, t2]);
  const removeFolder = reactExports.useCallback(
    async (folderPath) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await persistConfig((current2) => ({
          folderWhitelist: (current2.folderWhitelist ?? []).filter((p3) => p3 !== folderPath),
        }));
        if (!saved) setError(t2("settings.folderWhitelist.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [persistConfig, t2],
  );
  return {
    whitelist,
    addFolder,
    removeFolder,
    saving,
    error,
  };
}
function FolderWhitelistSection() {
  const { t: t2 } = useTranslation();
  const { whitelist, addFolder, removeFolder, saving, error } = useFolderWhitelist();
  const [manageOpen, setManageOpen] = reactExports.useState(false);
  const [container, setContainer] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!manageOpen) return;
    const el = document.querySelector('[data-action-ui-id="settings-dialog"]');
    setContainer(el);
  }, [manageOpen]);
  reactExports.useEffect(() => {
    if (!manageOpen) return;
    const onKey = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        setManageOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, {
      capture: true,
    });
    return () =>
      window.removeEventListener("keydown", onKey, {
        capture: true,
      });
  }, [manageOpen]);
  const overlay = manageOpen && container && (
    <>
      <div
        className="modal-mask absolute inset-0 z-40"
        onClick={() => setManageOpen(false)}
        aria-hidden={true}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-whitelist-title"
        data-action-ui-id="folder-whitelist-dialog"
        className="elevated-surface-border absolute top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="folder-whitelist-title" className="font-heading text-sm font-normal">
              {t2("settings.folderWhitelist.title", "已信任文件夹")}
            </h2>
            <p className="text-xs/relaxed text-muted-foreground">
              {t2(
                "settings.folderWhitelist.description",
                "在新建项目时选择这些文件夹，将不再重复询问是否允许。此设置仅记住你的选择，不会扩大系统权限。",
              )}
            </p>
          </div>
          <Button$1
            variant="ghost"
            size="icon-sm"
            onClick={() => setManageOpen(false)}
            aria-label={t2("common.close", "关闭")}
            data-action-ui-id="folder-whitelist-dialog-close"
            className="shrink-0"
          >
            <X$7 size={14} strokeWidth={1.5} />
          </Button$1>
        </div>
        {whitelist.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-8 text-center">
            <FolderKey size={20} strokeWidth={1.25} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t2("settings.folderWhitelist.empty", "暂无已记住的文件夹")}
            </p>
          </div>
        ) : (
          <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
            {whitelist.map((folderPath) => (
              <div
                key={folderPath}
                data-action-ui-id="settings-folder-whitelist-row"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <FolderKey size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs text-foreground" title={folderPath}>
                    {folderNameFromPath(folderPath)}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground" title={folderPath}>
                    {folderPath}
                  </span>
                </div>
                <Button$1
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void removeFolder(folderPath)}
                  disabled={saving}
                  data-action-ui-id="settings-folder-whitelist-remove"
                  aria-label={t2("common.delete", "删除")}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </Button$1>
              </div>
            ))}
          </div>
        )}
        <div>
          <Button$1
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-normal"
            onClick={() => void addFolder()}
            disabled={saving}
            data-action-ui-id="settings-folder-whitelist-add"
          >
            <FolderPlus size={14} strokeWidth={1.5} />
            {t2("settings.folderWhitelist.add", "添加文件夹")}
          </Button$1>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </>
  );
  return (
    <SettingGroup title={t2("settings.folderWhitelist.title", "已信任文件夹")}>
      <SettingRow
        label={t2("settings.folderWhitelist.listGroup", "免重复确认的文件夹")}
        description={t2(
          "settings.folderWhitelist.description",
          "在新建项目时选择这些文件夹，将不再重复询问是否允许。此设置仅记住你的选择，不会扩大系统权限。",
        )}
      >
        <Button$1
          variant="outline"
          size="sm"
          className="h-8 text-xs font-normal"
          onClick={() => setManageOpen(true)}
          data-action-ui-id="settings-folder-whitelist-manage"
        >
          {t2("settings.folderWhitelist.manage", "管理")}
        </Button$1>
      </SettingRow>
      {overlay && container ? reactDomExports.createPortal(overlay, container) : null}
    </SettingGroup>
  );
}
const bootSettingValues = new Map();
function useBootSettingValue(key2, currentValue) {
  const [bootValue] = reactExports.useState(() => {
    if (!bootSettingValues.has(key2)) {
      bootSettingValues.set(key2, currentValue);
    }
    return bootSettingValues.get(key2);
  });
  return bootValue;
}
export function AdvancedSection() {
  const { t: t2 } = useTranslation();
  const { config: config2, setMany } = useSettings();
  const disableGpu = config2.disableGpu ?? false;
  const bootDisableGpu = useBootSettingValue("disableGpu", disableGpu);
  if (!isElectron()) return null;
  const gpuNeedsRestart = disableGpu !== bootDisableGpu;
  const handleDisableGpuChange = async (checked) => {
    await setMany({
      disableGpu: checked,
      gpuDisableReason: checked ? "user-preference" : void 0,
    });
  };
  return (
    <div className="space-y-4">
      <SettingGroup>
        <SettingRow label={t2("settings.disableGpu")} description={t2("settings.disableGpuDesc")}>
          <Switch
            checked={disableGpu}
            onCheckedChange={(checked) => void handleDisableGpuChange(checked)}
          />
        </SettingRow>
        {gpuNeedsRestart && <RestartBanner />}
      </SettingGroup>
      <DiagnosticsGroup />
      <FolderWhitelistSection />
    </div>
  );
}
function DiagnosticsGroup() {
  const { t: t2 } = useTranslation();
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
        dedupedToast.success(t2("settings.uploadLogsSuccess"));
      } else {
        dedupedToast.error(result.error ?? t2("settings.uploadLogsFailed"));
      }
    } catch {
      dedupedToast.error(t2("settings.uploadLogsFailed"));
    } finally {
      setUploading(false);
    }
  }, [t2]);
  return (
    <SettingGroup title={t2("settings.groupDiagnostics")}>
      <SettingRow label={t2("settings.logDirectory")} description={t2("settings.logDirectoryDesc")}>
        <Button$1
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          onClick={() => void openLogDir()}
        >
          <LocalFolderIcon />
          {t2("settings.openLogDir")}
        </Button$1>
      </SettingRow>
      <SettingRow label={t2("settings.uploadLogs")} description={t2("settings.uploadLogsDesc")}>
        <Button$1
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal"
          disabled={uploading}
          onClick={() => void uploadLogs()}
        >
          <Upload size={14} strokeWidth={1.5} className={uploading ? "animate-pulse" : ""} />
          {uploading ? t2("settings.uploadLogsUploading") : t2("settings.uploadLogs")}
        </Button$1>
      </SettingRow>
    </SettingGroup>
  );
}
export function AssetCenterMigrateDialog({
  open,
  fromPath,
  toPath,
  targetHasContent,
  sourceUnavailable,
  busy,
  error,
  onMigrate,
  onSwitchOnly,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  const [consented, setConsented] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setConsented(false);
  }, [open, toPath]);
  const migrateDisabled = busy || sourceUnavailable || (targetHasContent && !consented);
  return (
    <AlertDialog open={open} onOpenChange={(v2) => !v2 && !busy && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t2("settings.assetCenter.migrateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t2("settings.assetCenter.migrateBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate" title={fromPath}>
            {fromPath}
          </span>
          <ArrowRight size={14} strokeWidth={1.5} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-foreground" title={toPath}>
            {toPath}
          </span>
        </div>
        {targetHasContent && !busy && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                {t2("settings.assetCenter.overwriteWarning")}
              </p>
            </div>
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id="asset-center-overwrite-consent"
                checked={consented}
                onCheckedChange={(v2) => setConsented(v2 === true)}
                data-action-ui-id="settings-asset-center-overwrite-consent"
              />
              <label
                htmlFor="asset-center-overwrite-consent"
                className="flex-1 cursor-pointer pt-2 text-xs text-foreground select-none pointer-coarse:pt-3.5"
              >
                {t2("settings.assetCenter.overwriteConsent", {
                  path: toPath,
                })}
              </label>
            </div>
          </div>
        )}
        {sourceUnavailable && !busy && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              {t2("settings.assetCenter.sourceUnavailableWarning")}
            </p>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            {t2("settings.assetCenter.migrateInProgress")}
          </div>
        )}
        {error && !busy && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button$1
            onClick={onMigrate}
            disabled={migrateDisabled}
            className="h-9 w-full justify-start gap-2"
            data-action-ui-id="settings-asset-center-migrate-confirm"
          >
            {busy ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <FolderInput size={16} strokeWidth={1.5} />
            )}
            {t2("settings.assetCenter.migrateConfirm")}
          </Button$1>
          <Button$1
            variant="outline"
            onClick={onSwitchOnly}
            disabled={busy}
            className="h-9 w-full justify-start font-normal"
            data-action-ui-id="settings-asset-center-switch-only"
          >
            {targetHasContent
              ? t2("settings.assetCenter.useExisting")
              : t2("settings.assetCenter.switchOnly")}
          </Button$1>
          <Button$1
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="h-9 w-full justify-start font-normal text-muted-foreground"
            data-action-ui-id="settings-asset-center-migrate-cancel"
          >
            {t2("common.cancel")}
          </Button$1>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
