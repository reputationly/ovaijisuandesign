// update-banner.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  AlertTriangle,
  TRACK_EVENTS,
  usePlatform,
  Loader2,
  openExternalUrl,
  X$7,
  actionTrailLog,
  useChangelog,
  useUpdaterContext,
  LoaderCircle,
  useRouterState,
  CircleArrowUp,
  useOptionalUpdaterContext,
  IPC_CHANNELS,
  Markdown$1,
  remarkGfm,
  rehypeSanitize,
  CircleHelp,
  LogOut,
  Download,
  RotateCw,
  useBlockingModalPresence,
  BLOCKING_MODAL_IDS,
  UpdaterErrorBoundary,
  m$4,
} from "../vendor.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { RetryIcon } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { useFeedback } from "../m09/feedback-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { ChangelogDetailDialog } from "./compact-rewrite-flow.jsx";
import { useSettingsDialog } from "./custom-provider-form.jsx";
import {
  computeVersionDelta,
  formatManualRecoveryMessage,
  formatUpdaterErrorMessage,
  isManualRecoveryCheckRetryable,
  isManualRecoveryRetryable,
} from "./updater-provider.jsx";
import { useUpdatePoster } from "./use-feature-popup-action.jsx";
import {
  formatProgressDisplay,
  installUpdateForPlatform,
  openManualInstallerDownload,
  progressPercent,
  useUpdateActions,
} from "./use-update-actions.jsx";
const ForcedUpdateDialog = () => {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { state: state2, download, install, check, retryInstall } = useUpdaterContext();
  const [shaking, setShaking] = reactExports.useState(false);
  const canManualDownload =
    !!state2.manualDownloadUrl && (state2.manualOnly || state2.phase === "error");
  const isManualRecovery = state2.manualOnly && state2.phase === "error";
  const canRetryLocalInstall =
    !canManualDownload &&
    isManualRecovery &&
    state2.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state2.manualRecoveryCode);
  const canRetryUpdateCheck =
    !canManualDownload &&
    isManualRecovery &&
    isManualRecoveryCheckRetryable(state2.manualRecoveryCode);
  const delta = state2.targetVersion
    ? computeVersionDelta(state2.currentVersion, state2.targetVersion)
    : null;
  const handleKeyDown2 = reactExports.useCallback((e2) => {
    if (e2.key === "Escape") {
      e2.preventDefault();
      e2.stopPropagation();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, []);
  reactExports.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown2, true);
    return () => document.removeEventListener("keydown", handleKeyDown2, true);
  }, [handleKeyDown2]);
  const handleQuit = () => {
    window.hilo?.ipcRenderer?.invoke?.(IPC_CHANNELS.APP_QUIT);
  };
  const handleManualDownload = () => {
    if (!state2.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform2.shell,
      state2.manualDownloadUrl,
      state2.manualDownloadFallbackUrl,
      "update.forced.manual-download",
    );
  };
  const handleInstall = () => {
    installUpdateForPlatform(install, platform2.app.os);
  };
  const { openFeedback } = useFeedback();
  const handleFeedback = () => {
    openFeedback({
      source: "menu",
    });
  };
  const exitLabel = t2("update.forced.btn.exit");
  const { imageUrl, handleImageError } = useUpdatePoster();
  return (
    <div
      className="modal-mask fixed inset-0 z-[9999] flex items-center justify-center p-4"
      data-action-ui-id="update.forced.overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="forced-update-title"
    >
      <div
        className={`elevated-surface-border relative max-h-[min(80vh,720px)] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground sm:max-w-md ${shaking ? "animate-shake" : ""}`}
      >
        {imageUrl ? (
          <div
            className="-mx-1 -mt-1 mb-3 w-[calc(100%+0.5rem)] overflow-hidden rounded-lg bg-muted"
            data-action-ui-id="update.forced.media"
          >
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto w-full"
              loading="lazy"
              onError={handleImageError}
            />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="forced-update-title" className="font-heading text-sm font-medium">
              {t2("update.forced.title")}
            </h2>
            {delta && (
              <span className="mt-1 inline-flex items-center rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2 py-0.5 text-[11px] font-medium text-brand-accent">
                {delta.display}
              </span>
            )}
          </div>
        </div>
        {isManualRecovery && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-foreground">
              {formatManualRecoveryMessage(state2.manualRecoveryCode, t2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {canRetryUpdateCheck
                ? t2("update.manualRecovery.hint.proxy")
                : canRetryLocalInstall
                  ? t2("update.manualRecovery.hint.local")
                  : t2("update.manualRecovery.hint.policy")}
            </p>
          </div>
        )}
        {!isManualRecovery && canManualDownload && state2.phase === "error" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-foreground">
              {formatUpdaterErrorMessage(state2.error?.message, t2, t2("update.error"))}
            </p>
            <p className="text-xs text-muted-foreground">
              {t2("update.manualRecovery.hint.policy")}
            </p>
          </div>
        )}
        {!isManualRecovery && canManualDownload && state2.phase !== "error" && (
          <p className="mt-3 text-xs text-foreground">
            {t2("update.forced.manual.body", {
              reason:
                state2.manualRecoverySource === "local"
                  ? formatManualRecoveryMessage(state2.manualRecoveryCode, t2)
                  : (state2.manualRecoveryReason ??
                    state2.requiredReason ??
                    t2("update.forced.manual.defaultReason")),
            })}
          </p>
        )}
        {!isManualRecovery && !canManualDownload && state2.requiredReason && (
          <p className="mt-3 text-xs text-foreground">
            {t2("update.forced.body", {
              reason: state2.requiredReason,
            })}
          </p>
        )}
        {state2.changelog && (
          <div className="mt-4 flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t2("update.forced.changelogHeader")}
            </h4>
            <ul className="flex flex-col gap-1 text-xs text-foreground/80">
              {state2.changelog.changelog.map((item) => (
                <li key={item}>
                  {"- "}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isManualRecovery &&
          !canManualDownload &&
          (state2.phase === "idle" || state2.phase === "checking") && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t2("update.forced.checking")}
            </div>
          )}
        {!isManualRecovery && !canManualDownload && state2.phase === "downloading" && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${progressPercent(state2.progress)}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatProgressDisplay(state2.progress)}
            </p>
          </div>
        )}
        {!isManualRecovery && !canManualDownload && state2.phase === "error" && (
          <p className="mt-4 text-xs text-destructive">
            {formatUpdaterErrorMessage(state2.error?.message, t2, t2("update.forced.error"))}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          {!canManualDownload && (
            <Button$1
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleFeedback}
              aria-label={t2("feedback.dialog.title")}
              data-action-ui-id="update.forced.feedback"
            >
              <CircleHelp data-icon="inline-start" className="size-4" strokeWidth={1.7} />
            </Button$1>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {isManualRecovery && (
              <>
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {exitLabel}
                </Button$1>
                {canRetryUpdateCheck && (
                  <Button$1
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={() =>
                      check({
                        userTriggered: true,
                      })
                    }
                    data-action-ui-id="update.forced.btn.retry"
                  >
                    <RetryIcon data-icon="inline-start" size={14} />
                    {t2("update.forced.btn.retry")}
                  </Button$1>
                )}
                {canRetryLocalInstall && (
                  <Button$1
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={() => void retryInstall()}
                    data-action-ui-id="update.forced.btn.retryInstall"
                  >
                    <CircleArrowUp
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t2("update.btn.retryInstall")}
                  </Button$1>
                )}
                {state2.manualDownloadUrl && (
                  <Button$1
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={handleManualDownload}
                    data-action-ui-id="update.forced.btn.manualDownload"
                  >
                    <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                    {t2("update.forced.btn.manualDownload")}
                  </Button$1>
                )}
              </>
            )}
            {!isManualRecovery && canManualDownload && (
              <>
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {exitLabel}
                </Button$1>
                <Button$1
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={handleManualDownload}
                  data-action-ui-id="update.forced.btn.manualDownload"
                >
                  <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {t2("update.forced.btn.manualDownload")}
                </Button$1>
              </>
            )}
            {!isManualRecovery && !canManualDownload && state2.phase === "available" && (
              <>
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {exitLabel}
                </Button$1>
                <Button$1
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={() => download()}
                  data-action-ui-id="update.forced.btn.download"
                >
                  <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {t2("update.forced.btn.download")}
                </Button$1>
              </>
            )}
            {!isManualRecovery && !canManualDownload && state2.phase === "downloaded" && (
              <>
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {exitLabel}
                </Button$1>
                <Button$1
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={handleInstall}
                  data-action-ui-id="update.forced.btn.restart"
                >
                  <RotateCw data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {t2("update.forced.btn.restart")}
                </Button$1>
              </>
            )}
            {!isManualRecovery && !canManualDownload && state2.phase === "error" && (
              <>
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={() =>
                    check({
                      userTriggered: true,
                    })
                  }
                  data-action-ui-id="update.forced.btn.retry"
                >
                  <RetryIcon data-icon="inline-start" size={14} />
                  {t2("update.forced.btn.retry")}
                </Button$1>
                {state2.manualDownloadUrl && (
                  <Button$1
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={handleManualDownload}
                    data-action-ui-id="update.forced.btn.manualDownload"
                  >
                    <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                    {t2("update.forced.btn.manualDownload")}
                  </Button$1>
                )}
                <Button$1
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                  {exitLabel}
                </Button$1>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const UpdateBanner = ({ embedded = false, imageUrl = null, onImageError }) => {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const isWorkspace = useRouterState({
    select: (s2) => s2.location.pathname.startsWith("/workspace"),
  });
  const {
    state: state2,
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
  const [imageVisible, setImageVisible] = reactExports.useState(Boolean(imageUrl));
  const canManualDownload =
    !!state2.manualDownloadUrl && (state2.manualOnly || state2.phase === "error");
  const isManualRecovery = state2.phase === "error" && state2.manualOnly;
  const canRetryLocalInstall =
    !canManualDownload &&
    isManualRecovery &&
    state2.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state2.manualRecoveryCode);
  const canRetryUpdateCheck =
    !canManualDownload &&
    isManualRecovery &&
    isManualRecoveryCheckRetryable(state2.manualRecoveryCode);
  reactExports.useEffect(() => {
    if (state2.phase !== "downloaded") {
      setShowConfirm(false);
      setIsInstalling(false);
    }
  }, [state2.phase]);
  reactExports.useEffect(() => {
    setImageVisible(Boolean(imageUrl));
  }, [imageUrl]);
  const { manifest } = useChangelog();
  const changelogItem = reactExports.useMemo(() => {
    if (!state2.targetVersion) return null;
    if (state2.changelog) {
      const locale2 = i18n.language?.startsWith("zh") ? "zh" : "en";
      const badge = locale2 === "zh" ? "更新" : "UPDATE";
      return {
        ...state2.changelog,
        id: state2.changelog.version,
        badge,
      };
    }
    const locale = i18n.language?.startsWith("zh") ? "zh" : "en";
    const localeData = manifest[locale] ?? manifest.en;
    const normalizedTarget = state2.targetVersion.replace(/^v/, "");
    const item = localeData?.items?.find((i2) => i2.version.replace(/^v/, "") === normalizedTarget);
    if (!item) return null;
    return {
      ...item,
      id: item.version,
      badge: localeData.badge,
    };
  }, [state2.targetVersion, state2.changelog, manifest, i18n.language]);
  const delta = state2.targetVersion
    ? computeVersionDelta(state2.currentVersion, state2.targetVersion)
    : null;
  const title = (() => {
    switch (state2.phase) {
      case "available":
        return t2("update.title.ready");
      case "downloading":
        return t2("update.title.downloading");
      case "downloaded":
        return t2("update.title.downloaded");
      case "error":
        return t2("update.title.error");
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
    if (!state2.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform2.shell,
      state2.manualDownloadUrl,
      state2.manualDownloadFallbackUrl,
      "update.banner.manual-download",
    );
  };
  const handleInstall = async () => {
    if (isInstalling) return;
    setIsInstalling(true);
    try {
      await installUpdateForPlatform(install, platform2.app.os);
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
      className={cn$2(
        "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        overlay
          ? "text-white hover:bg-black/60 hover:text-white"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
      onClick={() => dismiss()}
      data-action-ui-id="update.banner.close"
      aria-label={t2("update.btn.later")}
    >
      <X$7 className="size-3" strokeWidth={1.5} />
    </button>
  );
  const detailsAction = changelogItem && (
    <Button$1
      type="button"
      variant="link"
      size="sm"
      className="h-8 shrink-0 rounded-md bg-transparent px-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => setShowDetail(true)}
      disabled={!changelogItem}
      data-action-ui-id="update.btn.viewDetails"
    >
      {t2("update.btn.viewDetails")}
    </Button$1>
  );
  const actionRowClass = cn$2("flex items-center gap-3", embedded ? "justify-end" : "mt-3");
  return (
    <div
      className={cn$2(
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
        className={cn$2("rounded-md", embedded ? "px-2 pb-1" : "bg-secondary/60 p-2")}
        data-action-ui-id="update.banner.actions"
      >
        {state2.phase === "available" && (
          <>
            {state2.subtitle && !embedded ? (
              <p className="text-xs text-muted-foreground">{state2.subtitle}</p>
            ) : null}
            <div className={actionRowClass}>
              {detailsAction}
              <Button$1
                type="button"
                size="sm"
                className={cn$2(
                  "h-8 min-w-0 rounded-md",
                  embedded && (detailsAction ? "flex-1" : "w-full"),
                )}
                onClick={canManualDownload ? handleManualDownload : () => download()}
                data-action-ui-id={
                  canManualDownload ? "update.btn.manualDownload" : "update.btn.download"
                }
              >
                <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                {canManualDownload ? t2("update.btn.manualDownload") : t2("update.btn.download")}
              </Button$1>
            </div>
          </>
        )}
        {state2.phase === "downloading" && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-300"
                style={{
                  width: `${progressPercent(state2.progress)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {formatProgressDisplay(state2.progress)}
              </span>
              {capabilities.downloadCancellation && (
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                  onClick={() => cancelDownload()}
                  data-action-ui-id="update.btn.cancel"
                >
                  {t2("update.btn.cancel")}
                </button>
              )}
            </div>
          </>
        )}
        {state2.phase === "downloaded" && !showConfirm && (
          <div className={actionRowClass}>
            {embedded ? detailsAction : null}
            <Button$1
              type="button"
              size="sm"
              className={cn$2("h-8 rounded-md", embedded && (detailsAction ? "flex-1" : "w-full"))}
              onClick={() => (embedded ? handleInstall() : setShowConfirm(true))}
              disabled={isInstalling}
              data-action-ui-id="update.btn.restartNow"
            >
              <RotateCw data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
              {embedded
                ? isInstalling
                  ? t2("update.btn.restarting")
                  : t2("update.btn.restartUpgrade")
                : t2("update.btn.restartNow")}
            </Button$1>
            {!embedded ? (
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md"
                onClick={() => dismiss()}
                data-action-ui-id="update.btn.restartLater"
              >
                {t2("update.btn.restartLater")}
              </Button$1>
            ) : null}
          </div>
        )}
        {state2.phase === "downloaded" && showConfirm && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t2("update.confirm.body")}</p>
            <div className="flex items-center gap-2">
              <Button$1
                type="button"
                size="sm"
                className="h-8 rounded-md"
                onClick={handleInstall}
                disabled={isInstalling}
                data-action-ui-id="update.confirm.restart"
              >
                <RotateCw data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                {isInstalling ? t2("update.btn.restarting") : t2("update.btn.restartNow")}
              </Button$1>
              <Button$1
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
                {t2("update.btn.restartLater")}
              </Button$1>
              <button
                type="button"
                className="cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                onClick={() => setShowConfirm(false)}
              >
                {t2("update.btn.cancel")}
              </button>
            </div>
          </div>
        )}
        {state2.phase === "error" && (
          <>
            <p className="text-xs text-destructive">
              {isManualRecovery
                ? formatManualRecoveryMessage(state2.manualRecoveryCode, t2)
                : formatUpdaterErrorMessage(state2.error?.message, t2, t2("update.error"))}
            </p>
            {(isManualRecovery || canManualDownload) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {canRetryUpdateCheck
                  ? t2("update.manualRecovery.hint.proxy")
                  : canRetryLocalInstall
                    ? t2("update.manualRecovery.hint.local")
                    : t2("update.manualRecovery.hint.policy")}
              </p>
            )}
            {(isManualRecovery || canManualDownload) && (
              <div className="mt-2 flex items-center gap-2">
                {canRetryUpdateCheck && (
                  <Button$1
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
                    {t2("update.btn.retry")}
                  </Button$1>
                )}
                {canRetryLocalInstall && (
                  <Button$1
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
                    {t2("update.btn.retryInstall")}
                  </Button$1>
                )}
                {canManualDownload && (
                  <Button$1
                    type="button"
                    size="sm"
                    className="h-8 rounded-md"
                    onClick={handleManualDownload}
                    data-action-ui-id="update.btn.manualDownload"
                  >
                    <Download data-icon="inline-start" className="size-3.5" strokeWidth={1.7} />
                    {t2("update.btn.manualDownload")}
                  </Button$1>
                )}
              </div>
            )}
            {!canManualDownload &&
              !isManualRecovery &&
              state2.error?.canRetry &&
              !state2.manualOnly && (
                <div className="mt-2 flex items-center gap-2">
                  <Button$1
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
                    {t2("update.btn.retry")}
                  </Button$1>
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
          state2.phase === "available"
            ? canManualDownload
              ? handleManualDownload
              : () => download()
            : state2.phase === "downloaded"
              ? handleInstall
              : void 0
        }
      />
    </div>
  );
};
const UpdaterRouterInner = () => {
  const { notification } = useUpdaterContext();
  useBlockingModalPresence(BLOCKING_MODAL_IDS.forcedUpdate, notification.type === "forced-modal");
  switch (notification.type) {
    case "forced-modal":
      return <ForcedUpdateDialog />;
    case "banner":
    case "sidebar-only":
    case "silent":
      return null;
  }
};
export const UpdaterRoot = () => {
  const { state: state2 } = useUpdaterContext();
  return (
    <UpdaterErrorBoundary forcedMode={state2.forced}>
      <UpdaterRouterInner />
    </UpdaterErrorBoundary>
  );
};
export const UpdateSidebarWidget = (props) =>
  jsxRuntimeExports.jsx(m$4, {
    fallback: null,
    onError: (error, info2) => {
      actionTrailLog.error("update sidebar render failed", {
        error,
        component_stack: info2.componentStack,
      });
    },
    children: <UpdateSidebarWidgetInner {...props} />,
  });
const UpdateSidebarWidgetInner = ({ compact }) => {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const updater = useOptionalUpdaterContext();
  const { imageUrl, handleImageError } = useUpdatePoster();
  const [actionPending, setActionPending] = reactExports.useState(false);
  const [shortcutExpanded, setShortcutExpanded] = reactExports.useState(false);
  const phase = updater?.state.phase;
  reactExports.useEffect(() => {
    if (phase) setActionPending(false);
  }, [phase]);
  reactExports.useEffect(() => {
    if (compact || phase === "downloading") setShortcutExpanded(false);
  }, [compact, phase]);
  if (!updater) return null;
  const { state: state2, notification, download, check, retryInstall } = updater;
  if (
    state2.forced ||
    notification.type === "silent" ||
    state2.phase === "idle" ||
    state2.phase === "checking"
  ) {
    return null;
  }
  const showPoster = !compact && notification.type === "banner";
  const canManualDownload =
    !!state2.manualDownloadUrl && (state2.manualOnly || state2.phase === "error");
  const isManualRecovery = state2.phase === "error" && state2.manualOnly;
  const canRetryLocalInstall =
    !canManualDownload &&
    isManualRecovery &&
    state2.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state2.manualRecoveryCode);
  const canRetryUpdateCheck =
    !canManualDownload &&
    state2.phase === "error" &&
    (isManualRecovery
      ? isManualRecoveryCheckRetryable(state2.manualRecoveryCode)
      : state2.error?.canRetry === true);
  const actionDisabled =
    actionPending ||
    state2.phase === "downloading" ||
    (state2.phase === "error" &&
      !canManualDownload &&
      !canRetryLocalInstall &&
      !canRetryUpdateCheck);
  const handleManualDownload = async () => {
    const url2 = state2.manualDownloadUrl;
    if (!url2) return;
    await openManualInstallerDownload(
      platform2.shell,
      url2,
      state2.manualDownloadFallbackUrl,
      "update.sidebar.manual-download",
    );
  };
  const handleCompactAction = async () => {
    if (actionDisabled) return;
    setActionPending(true);
    if (state2.phase === "available") {
      if (state2.manualOnly) {
        void handleManualDownload().finally(() => setActionPending(false));
      } else download();
      return;
    }
    if (state2.phase === "downloaded") {
      try {
        await installUpdateForPlatform(updater.install, platform2.app.os);
      } catch (error) {
        actionTrailLog.error("update sidebar install request failed", {
          error: String(error),
        });
      } finally {
        setActionPending(false);
      }
      return;
    }
    if (state2.phase === "error") {
      if (canManualDownload) {
        void handleManualDownload().finally(() => setActionPending(false));
      } else if (canRetryLocalInstall) {
        void retryInstall().finally(() => setActionPending(false));
      } else if (canRetryUpdateCheck) {
        check({
          userTriggered: true,
        });
        setActionPending(false);
      }
    }
  };
  if (showPoster) {
    return (
      <div
        className="update-sidebar-poster-slot pointer-events-auto absolute right-0 bottom-full left-2 z-20 mb-4"
        data-action-ui-id="update.sidebar.poster-slot"
      >
        <UpdateBanner embedded={true} imageUrl={imageUrl} onImageError={handleImageError} />
      </div>
    );
  }
  const Icon2 =
    state2.phase === "downloading"
      ? LoaderCircle
      : state2.phase === "downloaded"
        ? RotateCw
        : state2.phase === "error"
          ? AlertTriangle
          : Download;
  const label =
    state2.phase === "downloaded"
      ? t2("update.btn.restartUpgrade")
      : state2.phase === "downloading"
        ? t2("update.title.downloading")
        : state2.phase === "error"
          ? canManualDownload
            ? t2("update.btn.manualDownload")
            : t2("update.btn.retry")
          : state2.manualOnly
            ? t2("update.btn.manualDownload")
            : t2("update.btn.download");
  const shortcutLabel = t2("update.btn.shortLabel");
  const canExpandShortcut = !compact && state2.phase !== "downloading";
  return (
    <span
      className={cn$2(
        "update-sidebar-shortcut-slot",
        compact && "update-sidebar-shortcut-slot--compact",
        shortcutExpanded && "update-sidebar-shortcut-slot--expanded",
      )}
    >
      <button
        type="button"
        className={cn$2(
          "update-sidebar-shortcut group/update-shortcut no-drag relative inline-flex h-6 w-6 min-w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-brand-accent px-0 text-brand-accent-foreground shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50",
          state2.phase === "downloading" && "cursor-default",
        )}
        disabled={actionDisabled}
        onClick={handleCompactAction}
        title={label}
        aria-label={label}
        data-action-ui-id="update.sidebar.shortcut"
        data-update-phase={state2.phase}
        data-sidebar-compact={compact ? "true" : "false"}
        onMouseEnter={() => {
          if (canExpandShortcut) setShortcutExpanded(true);
        }}
        onMouseLeave={() => setShortcutExpanded(false)}
        onFocus={() => {
          if (canExpandShortcut) setShortcutExpanded(true);
        }}
        onBlur={() => setShortcutExpanded(false)}
      >
        <Icon2
          className={cn$2(
            "update-sidebar-shortcut-icon size-3.5",
            state2.phase === "downloading" && "update-sidebar-shortcut-icon--loading",
          )}
          strokeWidth={1.7}
        />
        <span className="update-sidebar-shortcut-label text-xs font-medium leading-none">
          {shortcutLabel}
        </span>
        {state2.phase === "downloading" && state2.progress ? (
          <span className="sr-only">{Math.round(state2.progress.percent)}%</span>
        ) : null}
      </button>
    </span>
  );
};
const STALE_CHECK_MS = 10 * 60 * 1e3;
export const VersionRow = ({ menuOpen }) => {
  const { t: t2 } = useTranslation();
  const { openSettings } = useSettingsDialog();
  const update2 = useUpdateActions({
    manualDownloadSource: "update.version-row.manual-download",
  });
  const { state: state2 } = update2;
  reactExports.useEffect(() => {
    if (!menuOpen) return;
    if (state2.phase !== "idle") return;
    const isStale2 = !state2.lastCheckAt || Date.now() - state2.lastCheckAt > STALE_CHECK_MS;
    if (isStale2) {
      update2.check({
        userTriggered: false,
      });
    }
  }, [menuOpen, state2.phase, state2.lastCheckAt, update2.check]);
  const buttonLabel = `${t2("update.version.menuLabel")} ${update2.currentVersionLabel} ${update2.ctaLabel}`;
  return (
    <div
      className="group flex h-9 w-full items-center gap-1 rounded-md px-2 text-[14px] leading-5 text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      data-action-ui-id="update.versionRow"
    >
      <button
        type="button"
        onClick={() => openSettings("softwareUpdate")}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-1 text-left"
        data-action-ui-id="update.versionRow.settings"
      >
        <CircleArrowUp size={18} strokeWidth={1.5} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {t2("update.version.menuLabel")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {update2.currentVersionLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={update2.handlePrimaryAction}
        disabled={update2.primaryActionDisabled}
        data-action-ui-id="update.versionRow.action"
        aria-label={buttonLabel}
        className={cn$2(
          "ml-auto inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] font-medium leading-none transition-colors disabled:cursor-default",
          update2.pendingUpdate || update2.downloading
            ? "bg-transparent text-brand-accent hover:text-brand-accent/80 disabled:text-brand-accent/60"
            : "border border-border bg-transparent text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground disabled:text-muted-foreground",
        )}
      >
        {update2.showCheckIcon && (
          <RetryIcon
            size={12}
            strokeWidth={1.5}
            className={cn$2(update2.checking && "animate-spin")}
          />
        )}
        {update2.ctaLabel}
      </button>
    </div>
  );
};
const POPUP_TYPE$1 = "general";
export function GeneralPopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const url2 = popup.action?.url ?? "";
  const label = popup.action?.label ?? "";
  const trackedUrl = url2;
  const handleAction = async () => {
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_CLICK, {
      popup_type: POPUP_TYPE$1,
      url: trackedUrl,
    });
    if (!url2) {
      onClose();
      return;
    }
    try {
      const opened = await openExternalUrl(platform2, url2, {
        source: "server-popup.general",
      });
      if (!opened) throw new Error("open_external_failed");
    } catch (err) {
      trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_ACTION_FAILED, {
        popup_type: POPUP_TYPE$1,
        url: trackedUrl,
        error_type: "unknown",
        error_message: String(err),
      });
      dedupedToast.error(t2("serverPopup.errorToast"));
      return;
    }
    onClose();
  };
  const handleCancel = () => {
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE$1,
      url: trackedUrl,
      method: "cancel_button",
    });
    onClose();
  };
  const handleOpenChange = (open, eventDetails) => {
    if (open) return;
    if (!popup.can_close) {
      eventDetails.cancel();
      return;
    }
    if (eventDetails.reason !== "escape-key" && eventDetails.reason !== "close-press") {
      eventDetails.cancel();
      return;
    }
    const method = eventDetails.reason === "escape-key" ? "escape" : "cancel_button";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE$1,
      url: trackedUrl,
      method,
    });
    onClose();
  };
  const visibleTitle = popup.title?.trim() || "";
  const a11yTitle = visibleTitle || popup.description || t2("serverPopup.a11yTitle");
  if (popup.cover_url) {
    return (
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[760px] h-[480px] p-0 gap-0 grid grid-cols-[320px_1fr] overflow-hidden"
          showCloseButton={popup.can_close}
          data-action-ui-id="server-popup.general"
        >
          <div className="bg-muted overflow-hidden">
            <img src={popup.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex h-[480px] flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>{a11yTitle}</DialogTitle>
              <DialogDescription>{popup.description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-1 flex-col justify-center gap-3 px-8">
              {visibleTitle && (
                <h2 className="font-heading text-xl font-medium leading-tight text-foreground">
                  {visibleTitle}
                </h2>
              )}
              <div className="chat-markdown text-sm text-foreground [&_ol]:list-decimal [&_ul]:list-disc">
                <Markdown$1 remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {popup.description}
                </Markdown$1>
              </div>
            </div>
            <DialogFooter className="px-8 pb-6 sm:justify-end gap-2">
              {popup.can_close && (
                <Button$1
                  variant="outline"
                  onClick={handleCancel}
                  data-action-ui-id="server-popup.general.cancel"
                >
                  {t2("common.cancel")}
                </Button$1>
              )}
              <Button$1 onClick={handleAction} data-action-ui-id="server-popup.general.confirm">
                {label}
              </Button$1>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
        showCloseButton={popup.can_close}
        data-action-ui-id="server-popup.general"
      >
        <DialogHeader className="px-8 pt-8 gap-3">
          {visibleTitle ? (
            <DialogTitle className="text-center font-heading text-xl font-medium leading-tight text-foreground">
              {visibleTitle}
            </DialogTitle>
          ) : (
            <DialogTitle className="sr-only">{a11yTitle}</DialogTitle>
          )}
          <DialogDescription
            render={<div />}
            className="chat-markdown text-left text-sm text-foreground [&_ol]:list-decimal [&_ul]:list-disc"
          >
            <Markdown$1 remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {popup.description}
            </Markdown$1>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-8 pt-6 pb-6 sm:justify-end gap-2">
          {popup.can_close && (
            <Button$1
              variant="outline"
              onClick={handleCancel}
              data-action-ui-id="server-popup.general.cancel"
            >
              {t2("common.cancel")}
            </Button$1>
          )}
          <Button$1 onClick={handleAction} data-action-ui-id="server-popup.general.confirm">
            {label}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
