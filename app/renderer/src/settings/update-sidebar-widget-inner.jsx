// update-sidebar-widget-inner.jsx
import {
  AlertTriangle,
  jsxRuntimeExports,
  LoaderCircle,
  m$4 as m,
  reactExports,
  RotateCw,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { UpdateBanner } from "./update-banner.jsx";
import { Download } from "../media-editing/package.jsx";
import { useOptionalUpdaterContext } from "./use-active-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  isManualRecoveryCheckRetryable,
  isManualRecoveryRetryable,
} from "./installer-failure-code-keys.js";
import { useUpdatePoster } from "./normalize-hailuo03-video-trial-eligibility.js";
import {
  installUpdateForPlatform,
  openManualInstallerDownload,
} from "./diagnostics-group.jsx";
const UpdateSidebarWidgetInner = ({ compact }) => {
  const { t } = useTranslation();
  const platform = usePlatform();
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
  const {
    state,
    notification,
    download,
    check,
    retryInstall,
  } = updater;
  if (
    state.forced ||
    notification.type === "silent" ||
    state.phase === "idle" ||
    state.phase === "checking"
  ) {
    return null;
  }
  const showPoster = !compact && notification.type === "banner";
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
    state.phase === "error" &&
    (isManualRecovery
      ? isManualRecoveryCheckRetryable(state.manualRecoveryCode)
      : state.error?.canRetry === true);
  const actionDisabled =
    actionPending ||
    state.phase === "downloading" ||
    (state.phase === "error" &&
      !canManualDownload &&
      !canRetryLocalInstall &&
      !canRetryUpdateCheck);
  const handleManualDownload = async () => {
    const url = state.manualDownloadUrl;
    if (!url) return;
    await openManualInstallerDownload(
      platform.shell,
      url,
      state.manualDownloadFallbackUrl,
      "update.sidebar.manual-download",
    );
  };
  const handleCompactAction = async () => {
    if (actionDisabled) return;
    setActionPending(true);
    if (state.phase === "available") {
      if (state.manualOnly) {
        void handleManualDownload().finally(() => setActionPending(false));
      } else download();
      return;
    }
    if (state.phase === "downloaded") {
      try {
        await installUpdateForPlatform(updater.install, platform.app.os);
      } catch (error) {
        actionTrailLog.error("update sidebar install request failed", {
          error: String(error),
        });
      } finally {
        setActionPending(false);
      }
      return;
    }
    if (state.phase === "error") {
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
        <UpdateBanner
          embedded={true}
          imageUrl={imageUrl}
          onImageError={handleImageError}
        />
      </div>
    );
  }
  const Icon =
    state.phase === "downloading"
      ? LoaderCircle
      : state.phase === "downloaded"
        ? RotateCw
        : state.phase === "error"
          ? AlertTriangle
          : Download;
  const label =
    state.phase === "downloaded"
      ? t("update.btn.restartUpgrade")
      : state.phase === "downloading"
        ? t("update.title.downloading")
        : state.phase === "error"
          ? canManualDownload
            ? t("update.btn.manualDownload")
            : t("update.btn.retry")
          : state.manualOnly
            ? t("update.btn.manualDownload")
            : t("update.btn.download");
  const shortcutLabel = t("update.btn.shortLabel");
  const canExpandShortcut = !compact && state.phase !== "downloading";
  return (
    <span
      className={cn(
        "update-sidebar-shortcut-slot",
        compact && "update-sidebar-shortcut-slot--compact",
        shortcutExpanded && "update-sidebar-shortcut-slot--expanded",
      )}
    >
      <button
        type="button"
        className={cn(
          "update-sidebar-shortcut group/update-shortcut no-drag relative inline-flex h-6 w-6 min-w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-brand-accent px-0 text-brand-accent-foreground shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50",
          state.phase === "downloading" && "cursor-default",
        )}
        disabled={actionDisabled}
        onClick={handleCompactAction}
        title={label}
        aria-label={label}
        data-action-ui-id="update.sidebar.shortcut"
        data-update-phase={state.phase}
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
        <Icon
          className={cn(
            "update-sidebar-shortcut-icon size-3.5",
            state.phase === "downloading" &&
              "update-sidebar-shortcut-icon--loading",
          )}
          strokeWidth={1.7}
        />
        <span className="update-sidebar-shortcut-label text-xs font-medium leading-none">
          {shortcutLabel}
        </span>
        {state.phase === "downloading" && state.progress ? (
          <span className="sr-only">
            {Math.round(state.progress.percent)}%
          </span>
        ) : null}
      </button>
    </span>
  );
};
export const UpdateSidebarWidget = (props) =>
  jsxRuntimeExports.jsx(m, {
    fallback: null,
    onError: (error, info) => {
      actionTrailLog.error("update sidebar render failed", {
        error,
        component_stack: info.componentStack,
      });
    },
    children: <UpdateSidebarWidgetInner {...props} />,
  });
