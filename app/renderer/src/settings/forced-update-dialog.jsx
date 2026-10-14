// forced-update-dialog.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { CircleArrowUp, Loader2, RotateCw } from "../media-editing/lucide-icon-wraps.js";
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
  const { t } = useTranslation();
  const platform = usePlatform();
  const {
    state,
    download,
    install,
    check,
    retryInstall,
  } = useUpdaterContext();
  const [shaking, setShaking] = reactExports.useState(false);
  const canManualDownload =
    !!state.manualDownloadUrl &&
    (state.manualOnly || state.phase === "error");
  const isManualRecovery = state.manualOnly && state.phase === "error";
  const canRetryLocalInstall =
    !canManualDownload &&
    isManualRecovery &&
    state.manualRecoverySource === "local" &&
    isManualRecoveryRetryable(state.manualRecoveryCode);
  const canRetryUpdateCheck =
    !canManualDownload &&
    isManualRecovery &&
    isManualRecoveryCheckRetryable(state.manualRecoveryCode);
  const delta = state.targetVersion
    ? computeVersionDelta(state.currentVersion, state.targetVersion)
    : null;
  const handleKeyDown = reactExports.useCallback((keyboardEvent) => {
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, []);
  reactExports.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
  const handleQuit = () => {
    window.hilo?.ipcRenderer?.invoke?.(IPC_CHANNELS.APP_QUIT);
  };
  const handleManualDownload = () => {
    if (!state.manualDownloadUrl) return;
    void openManualInstallerDownload(
      platform.shell,
      state.manualDownloadUrl,
      state.manualDownloadFallbackUrl,
      "update.forced.manual-download",
    );
  };
  const handleInstall = () => {
    installUpdateForPlatform(install, platform.app.os);
  };
  const { openFeedback } = useFeedback();
  const handleFeedback = () => {
    openFeedback({
      source: "menu",
    });
  };
  const exitLabel = t("update.forced.btn.exit");
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
              {t("update.forced.title")}
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
              {formatManualRecoveryMessage(state.manualRecoveryCode, t)}
            </p>
            <p className="text-xs text-muted-foreground">
              {canRetryUpdateCheck
                ? t("update.manualRecovery.hint.proxy")
                : canRetryLocalInstall
                  ? t("update.manualRecovery.hint.local")
                  : t("update.manualRecovery.hint.policy")}
            </p>
          </div>
        )}
        {!isManualRecovery && canManualDownload && state.phase === "error" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-foreground">
              {formatUpdaterErrorMessage(
                state.error?.message,
                t,
                t("update.error"),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("update.manualRecovery.hint.policy")}
            </p>
          </div>
        )}
        {!isManualRecovery && canManualDownload && state.phase !== "error" && (
          <p className="mt-3 text-xs text-foreground">
            {t("update.forced.manual.body", {
              reason:
                state.manualRecoverySource === "local"
                  ? formatManualRecoveryMessage(state.manualRecoveryCode, t)
                  : (state.manualRecoveryReason ??
                    state.requiredReason ??
                    t("update.forced.manual.defaultReason")),
            })}
          </p>
        )}
        {!isManualRecovery && !canManualDownload && state.requiredReason && (
          <p className="mt-3 text-xs text-foreground">
            {t("update.forced.body", {
              reason: state.requiredReason,
            })}
          </p>
        )}
        {state.changelog && (
          <div className="mt-4 flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("update.forced.changelogHeader")}
            </h4>
            <ul className="flex flex-col gap-1 text-xs text-foreground/80">
              {state.changelog.changelog.map((item) => (
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
          (state.phase === "idle" || state.phase === "checking") && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("update.forced.checking")}
            </div>
          )}
        {!isManualRecovery &&
          !canManualDownload &&
          state.phase === "downloading" && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-accent transition-all duration-300"
                  style={{
                    width: `${progressPercent(state.progress)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {formatProgressDisplay(state.progress)}
              </p>
            </div>
          )}
        {!isManualRecovery &&
          !canManualDownload &&
          state.phase === "error" && (
            <p className="mt-4 text-xs text-destructive">
              {formatUpdaterErrorMessage(
                state.error?.message,
                t,
                t("update.forced.error"),
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
              aria-label={t("feedback.dialog.title")}
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
                    {t("update.forced.btn.retry")}
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
                    {t("update.btn.retryInstall")}
                  </Button>
                )}
                {state.manualDownloadUrl && (
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
                    {t("update.forced.btn.manualDownload")}
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
                  {t("update.forced.btn.manualDownload")}
                </Button>
              </>
            )}
            {!isManualRecovery &&
              !canManualDownload &&
              state.phase === "available" && (
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
                    {t("update.forced.btn.download")}
                  </Button>
                </>
              )}
            {!isManualRecovery &&
              !canManualDownload &&
              state.phase === "downloaded" && (
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
                    {t("update.forced.btn.restart")}
                  </Button>
                </>
              )}
            {!isManualRecovery &&
              !canManualDownload &&
              state.phase === "error" && (
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
                    {t("update.forced.btn.retry")}
                  </Button>
                  {state.manualDownloadUrl && (
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
                      {t("update.forced.btn.manualDownload")}
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
