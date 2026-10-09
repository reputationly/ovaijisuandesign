// forced-update-dialog.jsx
import {
  CircleArrowUp,
  jsxRuntimeExports,
  Loader2,
  reactExports,
  RotateCw,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { IPC_CHANNELS } from "../infra/gateway-http-error.jsx";
import { CircleHelp, Download, LogOut } from "../media-editing/package.jsx";
import { useUpdaterContext } from "./use-active-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { useFeedback } from "./use-direct-feedback.jsx";
import {
  computeVersionDelta,
  formatManualRecoveryMessage,
  formatUpdaterErrorMessage,
  isManualRecoveryCheckRetryable,
  isManualRecoveryRetryable,
} from "./installer-failure-code-keys.js";
import { useUpdatePoster } from "./normalize-hailuo03-video-trial-eligibility.js";
import {
  formatProgressDisplay,
  installUpdateForPlatform,
  openManualInstallerDownload,
  progressPercent,
} from "./diagnostics-group.jsx";
export const ForcedUpdateDialog = () => {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const {
    state: state2,
    download,
    install,
    check,
    retryInstall,
  } = useUpdaterContext();
  const [shaking, setShaking] = reactExports.useState(false);
  const canManualDownload =
    !!state2.manualDownloadUrl &&
    (state2.manualOnly || state2.phase === "error");
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
            <h2
              id="forced-update-title"
              className="font-heading text-sm font-medium"
            >
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
              {formatUpdaterErrorMessage(
                state2.error?.message,
                t2,
                t2("update.error"),
              )}
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
        {!isManualRecovery &&
          !canManualDownload &&
          state2.phase === "downloading" && (
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
        {!isManualRecovery &&
          !canManualDownload &&
          state2.phase === "error" && (
            <p className="mt-4 text-xs text-destructive">
              {formatUpdaterErrorMessage(
                state2.error?.message,
                t2,
                t2("update.forced.error"),
              )}
            </p>
          )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          {!canManualDownload && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleFeedback}
              aria-label={t2("feedback.dialog.title")}
              data-action-ui-id="update.forced.feedback"
            >
              <CircleHelp
                data-icon="inline-start"
                className="size-4"
                strokeWidth={1.7}
              />
            </Button>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {isManualRecovery && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut
                    data-icon="inline-start"
                    className="size-3.5"
                    strokeWidth={1.7}
                  />
                  {exitLabel}
                </Button>
                {canRetryUpdateCheck && (
                  <Button
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
                  </Button>
                )}
                {canRetryLocalInstall && (
                  <Button
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
                  </Button>
                )}
                {state2.manualDownloadUrl && (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={handleManualDownload}
                    data-action-ui-id="update.forced.btn.manualDownload"
                  >
                    <Download
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t2("update.forced.btn.manualDownload")}
                  </Button>
                )}
              </>
            )}
            {!isManualRecovery && canManualDownload && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleQuit}
                  data-action-ui-id="update.forced.btn.exit"
                >
                  <LogOut
                    data-icon="inline-start"
                    className="size-3.5"
                    strokeWidth={1.7}
                  />
                  {exitLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-md"
                  onClick={handleManualDownload}
                  data-action-ui-id="update.forced.btn.manualDownload"
                >
                  <Download
                    data-icon="inline-start"
                    className="size-3.5"
                    strokeWidth={1.7}
                  />
                  {t2("update.forced.btn.manualDownload")}
                </Button>
              </>
            )}
            {!isManualRecovery &&
              !canManualDownload &&
              state2.phase === "available" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleQuit}
                    data-action-ui-id="update.forced.btn.exit"
                  >
                    <LogOut
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {exitLabel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={() => download()}
                    data-action-ui-id="update.forced.btn.download"
                  >
                    <Download
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t2("update.forced.btn.download")}
                  </Button>
                </>
              )}
            {!isManualRecovery &&
              !canManualDownload &&
              state2.phase === "downloaded" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleQuit}
                    data-action-ui-id="update.forced.btn.exit"
                  >
                    <LogOut
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {exitLabel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-md"
                    onClick={handleInstall}
                    data-action-ui-id="update.forced.btn.restart"
                  >
                    <RotateCw
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {t2("update.forced.btn.restart")}
                  </Button>
                </>
              )}
            {!isManualRecovery &&
              !canManualDownload &&
              state2.phase === "error" && (
                <>
                  <Button
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
                  </Button>
                  {state2.manualDownloadUrl && (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-md"
                      onClick={handleManualDownload}
                      data-action-ui-id="update.forced.btn.manualDownload"
                    >
                      <Download
                        data-icon="inline-start"
                        className="size-3.5"
                        strokeWidth={1.7}
                      />
                      {t2("update.forced.btn.manualDownload")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleQuit}
                    data-action-ui-id="update.forced.btn.exit"
                  >
                    <LogOut
                      data-icon="inline-start"
                      className="size-3.5"
                      strokeWidth={1.7}
                    />
                    {exitLabel}
                  </Button>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
