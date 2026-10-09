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
function useUpdateChangelogItem(state2, options) {
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
  }, [
    state2.targetVersion,
    state2.changelog,
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
  const { t: t2 } = useTranslation();
  const { config: config2, set: set2 } = useSettings();
  const update2 = useUpdateActions({
    manualDownloadSource: "settings.software-update.manual-download",
  });
  const changelogItem = useUpdateChangelogItem(update2.state, {
    fallbackToLatest: true,
  });
  const [showDetail, setShowDetail] = reactExports.useState(false);
  const autoInstallId = reactExports.useId();
  const autoInstallDescriptionId = `${autoInstallId}-description`;
  const manualOnly = update2.state.manualOnly;
  const autoInstallOnQuit = config2.autoInstallOnQuit === true;
  const autoInstallDisabled = manualOnly && !autoInstallOnQuit;
  const handleAutoInstallChange = (checked) => {
    void set2("autoInstallOnQuit", checked);
  };
  const status = reactExports.useMemo(() => {
    switch (update2.state.phase) {
      case "checking":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("settings.softwareUpdate.statusChecking"),
          description: t2("settings.softwareUpdate.statusCheckingDesc"),
        };
      case "available":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update2.targetVersionLabel
            ? t2("settings.softwareUpdate.statusAvailableWithVersion", {
                version: update2.targetVersionLabel,
              })
            : t2("update.title.available"),
          description:
            update2.state.subtitle ??
            changelogItem?.subtitle ??
            t2("settings.softwareUpdate.statusAvailableDesc"),
        };
      case "downloading":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("update.title.downloading"),
          description:
            update2.progressText ||
            t2("settings.softwareUpdate.statusDownloadingDesc"),
        };
      case "downloaded":
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: update2.targetVersionLabel
            ? t2("settings.softwareUpdate.statusReadyWithVersion", {
                version: update2.targetVersionLabel,
              })
            : t2("update.title.downloaded"),
          description: t2("settings.softwareUpdate.statusReadyDesc"),
        };
      case "error": {
        const isManualRecovery = update2.state.manualOnly;
        return {
          icon: AlertCircle,
          iconClassName: "text-destructive",
          title: t2("update.title.error"),
          description: isManualRecovery
            ? formatManualRecoveryMessage(update2.state.manualRecoveryCode, t2)
            : formatUpdaterErrorMessage(
                update2.state.error?.message,
                t2,
                t2("update.error"),
              ),
        };
      }
      default:
        return {
          icon: SoftwareUpdateStatusIcon,
          iconClassName: "text-brand-accent",
          title: t2("settings.softwareUpdate.statusLatest"),
          description: t2("settings.softwareUpdate.statusLatestDesc"),
        };
    }
  }, [update2, changelogItem, t2]);
  const StatusIcon = status.icon;
  const showFilledAction =
    update2.available ||
    update2.downloaded ||
    (update2.state.phase === "error" && update2.canManualDownload);
  const showPrimaryAction = update2.state.phase !== "downloading";
  const showUpdatePrompt =
    (update2.available || update2.downloaded) && !!status.description;
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
              {update2.targetVersionLabel && (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-foreground/[0.08] px-2 text-[11px] font-medium leading-none text-muted-foreground">
                  {update2.targetVersionLabel}
                </span>
              )}
            </div>
            {update2.versionDelta && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {update2.versionDelta.display}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 self-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {t2("settings.softwareUpdate.currentVersion", {
                version: update2.currentVersionLabel,
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
                disabled={update2.primaryActionDisabled}
                onClick={update2.handlePrimaryAction}
                data-action-ui-id="settings.software-update.primary"
              >
                {update2.showCheckIcon && (
                  <RetryIcon
                    size={14}
                    strokeWidth={1.5}
                    className={cn(update2.checking && "animate-spin")}
                  />
                )}
                {update2.primaryActionLabel}
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
              {t2("settings.softwareUpdate.updatePrompt")}
            </p>
            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              {status.description}
            </p>
          </div>
        )}
        {update2.state.phase === "error" && (
          <div className="border-t border-border/70 px-2 pt-3 pb-2 pl-14">
            <p className="text-xs text-muted-foreground">
              {status.description}
            </p>
            {update2.canManualDownload && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t2("update.manualRecovery.hint.policy")}
              </p>
            )}
          </div>
        )}
        {update2.downloading && (
          <div className="px-2 pb-2 pl-12">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${update2.progressValue}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{update2.progressText}</span>
              <button
                type="button"
                className="cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                onClick={update2.cancelDownload}
                data-action-ui-id="settings.software-update.cancel"
              >
                {t2("update.btn.cancel")}
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
              {t2("settings.softwareUpdate.releaseNotes")}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {changelogItem?.subtitle ??
                t2("settings.softwareUpdate.releaseNotesEmpty")}
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
              {t2("settings.softwareUpdate.autoInstall")}
            </Label>
            <p
              id={autoInstallDescriptionId}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {manualOnly
                ? t2("settings.softwareUpdate.autoInstallUnavailable")
                : t2("settings.softwareUpdate.autoInstallDesc")}
            </p>
          </div>
          <Switch
            id={autoInstallId}
            checked={autoInstallOnQuit}
            disabled={autoInstallDisabled}
            onCheckedChange={handleAutoInstallChange}
            aria-label={t2("settings.softwareUpdate.autoInstall")}
            aria-describedby={autoInstallDescriptionId}
            data-action-ui-id="settings.software-update.auto-install"
          />
        </div>
      </div>
      <ChangelogDetailDialog
        item={showDetail ? changelogItem : null}
        onClose={() => setShowDetail(false)}
        onUpdate={
          update2.available
            ? update2.canManualDownload
              ? update2.handleManualDownload
              : update2.download
            : void 0
        }
      />
    </div>
  );
}
