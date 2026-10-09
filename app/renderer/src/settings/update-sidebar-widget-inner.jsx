// update-sidebar-widget-inner.jsx
import {
  AlertTriangle,
  jsxRuntimeExports,
  LoaderCircle,
  m$4,
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
import { cn$2 } from "../infra/dialog-content.jsx";
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
  const {
    state: state2,
    notification,
    download,
    check,
    retryInstall,
  } = updater;
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
    !!state2.manualDownloadUrl &&
    (state2.manualOnly || state2.phase === "error");
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
        <UpdateBanner
          embedded={true}
          imageUrl={imageUrl}
          onImageError={handleImageError}
        />
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
            state2.phase === "downloading" &&
              "update-sidebar-shortcut-icon--loading",
          )}
          strokeWidth={1.7}
        />
        <span className="update-sidebar-shortcut-label text-xs font-medium leading-none">
          {shortcutLabel}
        </span>
        {state2.phase === "downloading" && state2.progress ? (
          <span className="sr-only">
            {Math.round(state2.progress.percent)}%
          </span>
        ) : null}
      </button>
    </span>
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
