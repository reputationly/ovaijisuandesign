// update-banner.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { CircleArrowUp, RotateCw, X$7 as X } from "../media-editing/lucide-icon-wraps.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download } from "../media-editing/package.jsx";
import { useChangelog, useUpdaterContext } from "./use-active-runtime.js";
import { Button, mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { ChangelogDetailDialog } from "./changelog-detail-dialog.jsx";
import {
  computeVersionDelta,
  formatManualRecoveryMessage,
  formatUpdaterErrorMessage,
  isManualRecoveryCheckRetryable,
  isManualRecoveryRetryable,
} from "./installer-failure-code-keys.js";
import {
  formatProgressDisplay,
  installUpdateForPlatform,
  openManualInstallerDownload,
  progressPercent,
} from "./diagnostics-group.jsx";
export const UpdateBanner = ({
  embedded = false,
  imageUrl = null,
  onImageError,
}) => {
  const { t, i18n } = useTranslation();
  const platform = usePlatform();
  const isWorkspace = useRouterState({
    select: (routerState) => routerState.location.pathname.startsWith("/workspace"),
  });
  const {
    state,
    capabilities,
    dismiss,
    download,
    cancelDownload,
    install,
    retryInstall,
    check,
  } = useUpdaterContext();
  const [showConfirm, setShowConfirm] = reactExports.useState(false);
  const [showDetail, setShowDetail] = reactExports.useState(false);
  const [isInstalling, setIsInstalling] = reactExports.useState(false);
  const [imageVisible, setImageVisible] = reactExports.useState(
    Boolean(imageUrl),
  );
  const canManualDownload =
    !!state.manualDownloadUrl &&
    (state.manualOnly || state.phase === "error");
  const isManualRecovery = state.phase === "error" && state.manualOnly;
  const canRetryLocalInstall =
    !canManualDownload &&
    isManualRecovery &&
    state.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state.manualRecoveryCode);
  const canRetryUpdateCheck =
    !canManualDownload &&
    isManualRecovery &&
    isManualRecoveryCheckRetryable(state.manualRecoveryCode);
  reactExports.useEffect(() => {
    if (state.phase !== "downloaded") {
      setShowConfirm(false);
      setIsInstalling(false);
    }
  }, [state.phase]);
  reactExports.useEffect(() => {
    setImageVisible(Boolean(imageUrl));
  }, [imageUrl]);
  const { manifest } = useChangelog();
  const changelogItem = reactExports.useMemo(() => {
    if (!state.targetVersion) return null;
    if (state.changelog) {
      const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
      const badge = locale === "zh" ? "更新" : "UPDATE";
      return {
        ...state.changelog,
        id: state.changelog.version,
        badge,
      };
    }
    const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
    const localeData = manifest[locale] ?? manifest.en;
    const normalizedTarget = state.targetVersion.replace(/^v/, "");
    const item = localeData?.items?.find(
      (i) => i.version.replace(/^v/, "") === normalizedTarget,
    );
    if (!item) return null;
    return {
      ...item,
      id: item.version,
      badge: localeData.badge,
    };
  }, [state.targetVersion, state.changelog, manifest, i18n.language]);
  const delta = state.targetVersion
    ? computeVersionDelta(state.currentVersion, state.targetVersion)
    : null;
  const title = (() => {
    switch (state.phase) {
      case "available":
        return t("update.title.ready");
      case "downloading":
        return t("update.title.downloading");
      case "downloaded":
        return t("update.title.downloaded");
      case "error":
        return t("update.title.error");
      default:
        return "";
    }
  })();
  const bannerStyle =
    !embedded && isWorkspace
      ? {
          right: "calc(var(--workspace-right-panel-width, 0px) + 16px)",
        }
      : void 0;
  const handleManualDownload = () => {
    if (!state.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform.shell,
      state.manualDownloadUrl,
      state.manualDownloadFallbackUrl,
      "update.banner.manual-download",
    );
  };
  const handleInstall = async () => {
    if (isInstalling) return;
    setIsInstalling(true);
    try {
      await installUpdateForPlatform(install, platform.app.os);
    } catch (error) {
      actionTrailLog.error("update banner install request failed", {
        error: String(error),
      });
    } finally {
      setIsInstalling(false);
    }
  };
  const hasMedia = imageVisible && Boolean(imageUrl);
  const renderCloseButton = (overlay = false) => (
    <button
      type="button"
      className={cn(
        "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        overlay
          ? "text-white hover:bg-black/60 hover:text-white"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
      onClick={() => dismiss()}
      data-action-ui-id="update.banner.close"
      aria-label={t("update.btn.later")}
    >
      <X className="size-3" strokeWidth={1.5} />
    </button>
  );
  const detailsAction = changelogItem && (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-8 shrink-0 rounded-md bg-transparent px-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => setShowDetail(true)}
      disabled={!changelogItem}
      data-action-ui-id="update.btn.viewDetails"
    >
      {t("update.btn.viewDetails")}
    </Button>
  );
  const actionRowClass = cn(
    "flex items-center gap-3",
    embedded ? "justify-end" : "mt-3",
  );
  return (
    <div
      className={cn(
        "elevated-surface-border rounded-lg bg-popover text-popover-foreground shadow-lg",
        embedded ? "p-1" : "p-2",
        embedded ? "relative w-full" : "fixed right-4 bottom-4 z-50 w-[380px]",
        !embedded && isWorkspace && "right-auto",
      )}
      style={bannerStyle}
      data-action-ui-id="update.banner"
    >
      {hasMedia ? (
        <div
          className="relative mb-2 w-full overflow-hidden rounded-md bg-muted"
          data-action-ui-id="update.banner.media"
        >
          <img
            src={imageUrl ?? void 0}
            alt=""
            aria-hidden="true"
            className="block h-auto w-full"
            loading="lazy"
            onError={onImageError ?? (() => setImageVisible(false))}
          />
          {embedded ? (
            <div className="absolute top-2 right-2 rounded-full bg-black/45">
              {renderCloseButton(true)}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3 rounded-md px-2 pt-1.5 pb-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="min-w-0 break-words text-sm font-medium leading-5 text-foreground">
            {title}
          </h4>
          {delta && (
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2 py-0.5 text-[11px] font-medium text-brand-accent"
              data-action-ui-id="update.banner.version"
            >
              {delta.display}
            </span>
          )}
        </div>
        {!embedded || !hasMedia ? renderCloseButton() : null}
      </div>
      <div
        className={cn(
          "rounded-md",
          embedded ? "px-2 pb-1" : "bg-secondary/60 p-2",
        )}
        data-action-ui-id="update.banner.actions"
      >
        {state.phase === "available" && (
          <>
            {state.subtitle && !embedded ? (
              <p className="text-xs text-muted-foreground">{state.subtitle}</p>
            ) : null}
            <div className={actionRowClass}>
              {detailsAction}
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-8 min-w-0 rounded-md",
                  embedded && (detailsAction ? "flex-1" : "w-full"),
                )}
                onClick={
                  canManualDownload ? handleManualDownload : () => download()
                }
                data-action-ui-id={
                  canManualDownload
                    ? "update.btn.manualDownload"
                    : "update.btn.download"
                }
              >
                <Download
                  data-icon="inline-start"
                  className="size-3.5"
                  strokeWidth={1.7}
                />
                {canManualDownload
                  ? t("update.btn.manualDownload")
                  : t("update.btn.download")}
              </Button>
            </div>
          </>
        )}
        {state.phase === "downloading" && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${progressPercent(state.progress)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {formatProgressDisplay(state.progress)}
              </span>
              {capabilities.downloadCancellation && (
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                  onClick={() => cancelDownload()}
                  data-action-ui-id="update.btn.cancel"
                >
                  {t("update.btn.cancel")}
                </button>
              )}
            </div>
          </>
        )}
        {state.phase === "downloaded" && !showConfirm && (
          <div className={actionRowClass}>
            {embedded ? detailsAction : null}
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-8 rounded-md",
                embedded && (detailsAction ? "flex-1" : "w-full"),
              )}
              onClick={() =>
                embedded ? handleInstall() : setShowConfirm(true)
              }
              disabled={isInstalling}
              data-action-ui-id="update.btn.restartNow"
            >
              <RotateCw
                data-icon="inline-start"
                className="size-3.5"
                strokeWidth={1.7}
              />
              {embedded
                ? isInstalling
                  ? t("update.btn.restarting")
                  : t("update.btn.restartUpgrade")
                : t("update.btn.restartNow")}
            </Button>
            {!embedded ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md"
                onClick={() => dismiss()}
                data-action-ui-id="update.btn.restartLater"
              >
                {t("update.btn.restartLater")}
              </Button>
            ) : null}
          </div>
        )}
        {state.phase === "downloaded" && showConfirm && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("update.confirm.body")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-md"
                onClick={handleInstall}
                disabled={isInstalling}
                data-action-ui-id="update.confirm.restart"
              >
                <RotateCw
                  data-icon="inline-start"
                  className="size-3.5"
                  strokeWidth={1.7}
                />
                {isInstalling
                  ? t("update.btn.restarting")
                  : t("update.btn.restartNow")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md"
                onClick={() => {
                  setShowConfirm(false);
                  dismiss();
                }}
                data-action-ui-id="update.confirm.later"
              >
                {t("update.btn.restartLater")}
              </Button>
              <button
                type="button"
                className="cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                onClick={() => setShowConfirm(false)}
              >
                {t("update.btn.cancel")}
              </button>
            </div>
          </div>
        )}
        {state.phase === "error" && (
          <>
            <p className="text-xs text-destructive">
              {isManualRecovery
                ? formatManualRecoveryMessage(state.manualRecoveryCode, t)
                : formatUpdaterErrorMessage(
                    state.error?.message,
                    t,
                    t("update.error"),
                  )}
            </p>
            {(isManualRecovery || canManualDownload) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {canRetryUpdateCheck
                  ? t("update.manualRecovery.hint.proxy")
                  : canRetryLocalInstall
                    ? t("update.manualRecovery.hint.local")
                    : t("update.manualRecovery.hint.policy")}
              </p>
            )}
            {(isManualRecovery || canManualDownload) && (
              <div className="mt-2 flex items-center gap-2">
                {canRetryUpdateCheck && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={() =>
                      check({
                        userTriggered: true,
                      })
                    }
                    data-action-ui-id="update.btn.retry"
                  >
                    <RetryIcon data-icon="inline-start" size={14} />
                    {t("update.btn.retry")}
                  </Button>
                )}
                {canRetryLocalInstall && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={() => void retryInstall()}
                    data-action-ui-id="update.btn.retryInstall"
                  >
                    <CircleArrowUp
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t("update.btn.retryInstall")}
                  </Button>
                )}
                {canManualDownload && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={handleManualDownload}
                    data-action-ui-id="update.btn.manualDownload"
                  >
                    <Download
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t("update.btn.manualDownload")}
                  </Button>
                )}
              </div>
            )}
            {!canManualDownload &&
              !isManualRecovery &&
              state.error?.canRetry &&
              !state.manualOnly && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={() =>
                      check({
                        userTriggered: true,
                      })
                    }
                    data-action-ui-id="update.btn.retry"
                  >
                    <RetryIcon data-icon="inline-start" size={14} />
                    {t("update.btn.retry")}
                  </Button>
                </div>
              )}
          </>
        )}
      </div>
      <ChangelogDetailDialog
        item={showDetail ? changelogItem : null}
        onClose={() => setShowDetail(false)}
        imageUrl={imageUrl}
        onImageError={onImageError}
        onUpdate={
          state.phase === "available"
            ? canManualDownload
              ? handleManualDownload
              : () => download()
            : state.phase === "downloaded"
              ? handleInstall
              : void 0
        }
      />
    </div>
  );
};
