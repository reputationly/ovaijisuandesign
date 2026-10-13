// version-row.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { ForcedUpdateDialog } from "./forced-update-dialog.jsx";
import { useUpdaterContext } from "./use-active-runtime.js";
import { BLOCKING_MODAL_IDS } from "../infra/schedule.js";
import { useBlockingModalPresence } from "../workspace/topbar-state-context.jsx";
import { CircleArrowUp, reactExports, useTranslation } from "../vendor.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { useSettingsDialog } from "./persist-visible-workspace-manual-order.js";
import { useUpdateActions } from "./use-update-actions.js";
export const UpdaterRouterInner = () => {
  const { notification } = useUpdaterContext();
  useBlockingModalPresence(
    BLOCKING_MODAL_IDS.forcedUpdate,
    notification.type === "forced-modal",
  );
  switch (notification.type) {
    case "forced-modal":
      return <ForcedUpdateDialog />;
    case "banner":
    case "sidebar-only":
    case "silent":
      return null;
  }
};
const STALE_CHECK_MS = 10 * 60 * 1e3;
export const VersionRow = ({ menuOpen }) => {
  const { t } = useTranslation();
  const { openSettings } = useSettingsDialog();
  const update = useUpdateActions({
    manualDownloadSource: "update.version-row.manual-download",
  });
  const { state } = update;
  reactExports.useEffect(() => {
    if (!menuOpen) return;
    if (state.phase !== "idle") return;
    const isStale =
      !state.lastCheckAt || Date.now() - state.lastCheckAt > STALE_CHECK_MS;
    if (isStale) {
      update.check({
        userTriggered: false,
      });
    }
  }, [menuOpen, state.phase, state.lastCheckAt, update.check]);
  const buttonLabel = `${t("update.version.menuLabel")} ${update.currentVersionLabel} ${update.ctaLabel}`;
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
          {t("update.version.menuLabel")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {update.currentVersionLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={update.handlePrimaryAction}
        disabled={update.primaryActionDisabled}
        data-action-ui-id="update.versionRow.action"
        aria-label={buttonLabel}
        className={cn(
          "ml-auto inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] font-medium leading-none transition-colors disabled:cursor-default",
          update.pendingUpdate || update.downloading
            ? "bg-transparent text-brand-accent hover:text-brand-accent/80 disabled:text-brand-accent/60"
            : "border border-border bg-transparent text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground disabled:text-muted-foreground",
        )}
      >
        {update.showCheckIcon && (
          <RetryIcon
            size={12}
            strokeWidth={1.5}
            className={cn(update.checking && "animate-spin")}
          />
        )}
        {update.ctaLabel}
      </button>
    </div>
  );
};
