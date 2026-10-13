// software-update-section-content.jsx
import { AlertCircle, reactExports, useTranslation } from "../vendor.js";
import { useChangelog } from "./use-active-runtime.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ChangelogDetailDialog } from "./changelog-detail-dialog.jsx";
import { FileText } from "../media-editing/package.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Switch } from "../generation/select-content.jsx";
import {
  formatManualRecoveryMessage,
  formatUpdaterErrorMessage,
} from "./installer-failure-code-keys.js";
import { useSettings } from "./use-settings.js";
import { useUpdateActions } from "./use-update-actions.js";
function useUpdateChangelogItem(state, options) {
  const { i18n } = useTranslation();
  const { manifest } = useChangelog();
  return reactExports.useMemo(() => {
    const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
    const badge = locale === "zh" ? "更新" : "UPDATE";
    if (state.changelog) {
      return {
        ...state.changelog,
        id: state.changelog.version,
        badge,
      };
    }
    const localeData = manifest[locale] ?? manifest.en;
    const item = (() => {
      if (state.targetVersion) {
        const normalizedTarget = state.targetVersion.replace(/^v/, "");
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
  }, [
    state.targetVersion,
    state.changelog,
    manifest,
    i18n.language,
    options?.fallbackToLatest,
  ]);
}
function SoftwareUpdateStatusIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      className={className}
      data-action-ui-id="settings.software-update.status-icon"
    >
      <path
        d="M119.857 131H80.1429C77.3814 131 75.1429 128.761 75.1429 126V94.9774H53.9299C49.4955 94.9774 47.2556 89.6332 50.3649 86.4715L96.4351 39.625C98.3942 37.6329 101.606 37.6328 103.565 39.625L149.635 86.4715C152.744 89.6332 150.505 94.9774 146.07 94.9774H124.857V126C124.857 128.761 122.619 131 119.857 131Z"
        fill="currentColor"
      />
      <rect
        opacity="0.8"
        x="74"
        y="144"
        width="51"
        height="10"
        rx="3"
        fill="currentColor"
      />
      <rect
        opacity="0.5"
        x="82"
        y="165"
        width="35"
        height="10"
        rx="3"
        fill="currentColor"
      />
    </svg>
  );
}
export function SoftwareUpdateSectionContent() {
  const { t } = useTranslation();
  const { config, set } = useSettings();
  const update = useUpdateActions({
    manualDownloadSource: "settings.software-update.manual-download",
  });
  const changelogItem = useUpdateChangelogItem(update.state, {
    fallbackToLatest: true,
  });
  const [showDetail, setShowDetail] = reactExports.useState(false);
  const autoInstallId = reactExports.useId();
  const autoInstallDescriptionId = `${autoInstallId}-description`;
  const manualOnly = update.state.manualOnly;
  const autoInstallOnQuit = config.autoInstallOnQuit === true;
  const autoInstallDisabled = manualOnly && !autoInstallOnQuit;
  const handleAutoInstallChange = (checked) => {
    void set("autoInstallOnQuit", checked);
  };
  const status = reactExports.useMemo(() => {
    switch (update.state.phase) {
      case "checking":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t("settings.softwareUpdate.statusChecking"),
          description: t("settings.softwareUpdate.statusCheckingDesc"),
        };
      case "available":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update.targetVersionLabel
            ? t("settings.softwareUpdate.statusAvailableWithVersion", {
                version: update.targetVersionLabel,
              })
            : t("update.title.available"),
          description:
            update.state.subtitle ??
            changelogItem?.subtitle ??
            t("settings.softwareUpdate.statusAvailableDesc"),
        };
      case "downloading":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t("update.title.downloading"),
          description:
            update.progressText ||
            t("settings.softwareUpdate.statusDownloadingDesc"),
        };
      case "downloaded":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update.targetVersionLabel
            ? t("settings.softwareUpdate.statusReadyWithVersion", {
                version: update.targetVersionLabel,
              })
            : t("update.title.downloaded"),
          description: t("settings.softwareUpdate.statusReadyDesc"),
        };
      case "error": {
        const isManualRecovery = update.state.manualOnly;
        return {
          icon: AlertCircle,
          iconClassName: "text-destructive",
          title: t("update.title.error"),
          description: isManualRecovery
            ? formatManualRecoveryMessage(update.state.manualRecoveryCode, t)
            : formatUpdaterErrorMessage(
                update.state.error?.message,
                t,
                t("update.error"),
              ),
        };
      }
      default:
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t("settings.softwareUpdate.statusLatest"),
          description: t("settings.softwareUpdate.statusLatestDesc"),
        };
    }
  }, [update, changelogItem, t]);
  const StatusIcon = status.icon;
  const showFilledAction =
    update.available ||
    update.downloaded ||
    (update.state.phase === "error" && update.canManualDownload);
  const showPrimaryAction = update.state.phase !== "downloading";
  const showUpdatePrompt =
    (update.available || update.downloaded) && !!status.description;
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg bg-secondary/60 p-2"
        data-action-ui-id="settings.software-update.status-card"
      >
        <div
          className="flex items-center gap-2 rounded-md px-2 py-2"
          data-action-ui-id="settings.software-update.status-summary"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground"
            data-action-ui-id="settings.software-update.status-icon-bg"
          >
            <StatusIcon
              className={cn("size-7", status.iconClassName)}
              strokeWidth={1.5}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-normal text-foreground">
                {status.title}
              </p>
              {update.targetVersionLabel && (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-foreground/[0.08] px-2 text-[11px] font-medium leading-none text-muted-foreground">
                  {update.targetVersionLabel}
                </span>
              )}
            </div>
            {update.versionDelta && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {update.versionDelta.display}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 self-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {t("settings.softwareUpdate.currentVersion", {
                version: update.currentVersionLabel,
              })}
            </span>
            {showPrimaryAction && (
              <Button
                type="button"
                variant={showFilledAction ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 gap-1.5",
                  !showFilledAction && "font-normal",
                  showFilledAction &&
                    "bg-brand-accent text-brand-accent-foreground hover:opacity-90",
                )}
                disabled={update.primaryActionDisabled}
                onClick={update.handlePrimaryAction}
                data-action-ui-id="settings.software-update.primary"
              >
                {update.showCheckIcon && (
                  <RetryIcon
                    size={14}
                    strokeWidth={1.5}
                    className={cn(update.checking && "animate-spin")}
                  />
                )}
                {update.primaryActionLabel}
              </Button>
            )}
          </div>
        </div>
        {showUpdatePrompt && (
          <div
            className="border-t border-border/70 px-2 pt-3 pb-2 pl-14"
            data-action-ui-id="settings.software-update.update-prompt"
          >
            <p
              className="text-sm font-normal text-foreground"
              data-action-ui-id="settings.software-update.update-prompt-title"
            >
              {t("settings.softwareUpdate.updatePrompt")}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              {status.description}
            </p>
          </div>
        )}
        {update.state.phase === "error" && (
          <div className="border-t border-border/70 px-2 pt-3 pb-2 pl-14">
            <p className="text-xs text-muted-foreground">
              {status.description}
            </p>
            {update.canManualDownload && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("update.manualRecovery.hint.policy")}
              </p>
            )}
          </div>
        )}
        {update.downloading && (
          <div className="px-2 pb-2 pl-12">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${update.progressValue}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{update.progressText}</span>
              <button
                type="button"
                className="cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                onClick={update.cancelDownload}
                data-action-ui-id="settings.software-update.cancel"
              >
                {t("update.btn.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors hover:bg-foreground/[0.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={!changelogItem}
          onClick={() => setShowDetail(true)}
          data-action-ui-id="settings.software-update.release-notes"
        >
          <FileText
            size={18}
            strokeWidth={1.5}
            className="shrink-0 text-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-normal text-foreground">
              {t("settings.softwareUpdate.releaseNotes")}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {changelogItem?.subtitle ??
                t("settings.softwareUpdate.releaseNotesEmpty")}
            </p>
          </div>
        </button>
        <div
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2",
            autoInstallDisabled && "opacity-60",
          )}
        >
          <RetryIcon size={18} className="shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <Label
              htmlFor={autoInstallId}
              className={cn(
                "block text-sm leading-5 font-normal text-foreground",
                autoInstallDisabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {t("settings.softwareUpdate.autoInstall")}
            </Label>
            <p
              id={autoInstallDescriptionId}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {manualOnly
                ? t("settings.softwareUpdate.autoInstallUnavailable")
                : t("settings.softwareUpdate.autoInstallDesc")}
            </p>
          </div>
          <Switch
            id={autoInstallId}
            checked={autoInstallOnQuit}
            disabled={autoInstallDisabled}
            onCheckedChange={handleAutoInstallChange}
            aria-label={t("settings.softwareUpdate.autoInstall")}
            aria-describedby={autoInstallDescriptionId}
            data-action-ui-id="settings.software-update.auto-install"
          />
        </div>
      </div>
      <ChangelogDetailDialog
        item={showDetail ? changelogItem : null}
        onClose={() => setShowDetail(false)}
        onUpdate={
          update.available
            ? update.canManualDownload
              ? update.handleManualDownload
              : update.download
            : void 0
        }
      />
    </div>
  );
}
