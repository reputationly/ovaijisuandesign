// user-menu-popover-content.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  Tooltip,
  TooltipTrigger,
  useIsScrolling,
  Icon,
  TRACK_EVENTS,
  usePlatform,
  Palette,
  useTheme,
  getRuntimeConfig,
  reactDomExports,
  AlertTriangle,
  services,
  TooltipProvider,
  Smartphone,
  CircleUserRound,
  Moon,
  Sun,
  Monitor,
  ChevronRight$1,
  Brain,
  BookOpen,
  FileText,
  openExternalUrl,
  useAccountSubmissionDecision,
} from "../vendor.js";
import {
  TooltipContent,
  Button$1,
  cn$2,
  useBrowserHoverPreview,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SegmentedSwitch, useMpWallet } from "../m09/use-credit-details.jsx";
import { USER_PROTOCOL_KEYS_BY_REGION, getUserProtocolUrl } from "../m08/shortcut-categories.jsx";
import { useWalletQuery, Skeleton } from "../m09/infinite-scroll-container.jsx";
import { useActiveBillingPromotion } from "../m13/mode-selector.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import {
  getDataDirectoryMainService,
  DATA_DIRECTORY_STATUS_CHANGED_EVENT,
} from "../m10/use-data-directory.js";
import { useSettingsDialog, useOptionalSettingsDialog } from "../m10/custom-provider-form.jsx";
import { IHiloApp } from "../m08/instantiation-service.js";
import { useGatewayReadiness } from "../m10/hub-logo.jsx";
import { QuickZoomPresence } from "../m06/canvas-toggle-icon.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function DataDirectoryStatusBanner() {
  const { t: t2 } = useTranslation();
  const settingsDialog = useOptionalSettingsDialog();
  const [status, setStatus] = reactExports.useState(null);
  const refresh = reactExports.useCallback(() => {
    getDataDirectoryMainService()
      .getStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  reactExports.useEffect(() => {
    refresh();
    window.addEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_DIRECTORY_STATUS_CHANGED_EVENT, refresh);
  }, [refresh]);
  if (
    !status ||
    (status.state !== "configured_location_unavailable" &&
      status.state !== "pending_restart" &&
      !status.workspacePathRewritePending)
  ) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 px-3 py-1.5 text-center text-xs text-warning-foreground"
      data-action-ui-id="data-directory-status-banner"
    >
      <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
      <span>
        {status.state === "configured_location_unavailable"
          ? t2("settings.storage.globalFallback")
          : status.state === "pending_restart"
            ? t2("settings.storage.globalPendingRestart")
            : t2("settings.storage.globalRewriteRepairPending")}
      </span>
      <button
        type="button"
        className="font-medium underline underline-offset-2 hover:opacity-80"
        onClick={() => settingsDialog?.openSettings("storage")}
      >
        {t2("settings.storage.openSettings")}
      </button>
    </div>
  );
}
export function GatewayReadinessBanner() {
  const { t: t2 } = useTranslation();
  const readiness = useGatewayReadiness();
  if (!readiness || readiness.state === "ready") return null;
  const failed = readiness.state === "failed";
  const handleRetry = () => {
    try {
      services
        .get(IHiloApp)
        .retryAppGateway()
        .catch(() => {});
    } catch {}
  };
  return (
    <div
      role="status"
      className={`flex shrink-0 items-center justify-center gap-2 px-3 py-1.5 text-center text-xs ${failed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
    >
      <span>{failed ? t2("home.gatewayFailed") : t2("home.gatewayStarting")}</span>
      {failed && (
        <button
          type="button"
          onClick={handleRetry}
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          {t2("home.gatewayRetry")}
        </button>
      )}
    </div>
  );
}
export const IM_BRIDGE_SHORTCUT_SEEN_KEY = "hilo:im-bridge-shortcut-seen";
export function hasSeenImBridgeShortcut() {
  try {
    return localStorage.getItem(IM_BRIDGE_SHORTCUT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
export function ImBridgeShortcutWithTooltip({ className, onClick, side, showUnreadDot = false }) {
  const { t: t2 } = useTranslation();
  const isOverseas = getRuntimeConfig().region === "overseas";
  const label = t2(`imBridge.title.${isOverseas ? "overseas" : "domestic"}`);
  const tooltip = isOverseas ? t2("common.comingSoon") : label;
  const [tooltipOpen, setTooltipOpen] = reactExports.useState(false);
  const handleClick2 = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      setTooltipOpen(false);
      if (isOverseas) return;
      onClick(event);
    },
    [isOverseas, onClick],
  );
  const compact = side === "right";
  return (
    <TooltipProvider delay={0}>
      <Tooltip open={tooltipOpen}>
        <TooltipTrigger
          render={
            <button
              type="button"
              data-action-ui-id="user-menu.im-bridge-shortcut"
              aria-label={label}
              aria-disabled={isOverseas}
              onClick={handleClick2}
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
              onFocus={() => setTooltipOpen(true)}
              onBlur={() => setTooltipOpen(false)}
              className={cn$2(
                "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                compact ? "size-8" : "size-7",
                isOverseas && "cursor-not-allowed bg-muted text-muted-foreground opacity-60",
                className,
              )}
            >
              {showUnreadDot && (
                <span
                  data-action-ui-id="user-menu.im-bridge-shortcut-unread"
                  className="absolute top-0 right-0 size-2 rounded-full border border-card bg-brand-accent"
                />
              )}
              <Icon
                icon={Smartphone}
                size="md"
                className="text-foreground opacity-50"
                aria-hidden={true}
              />
            </button>
          }
        />
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
export function LoggedOutSidebarActionPresentation({
  showUsername = false,
  label,
  onLogin,
  companionAction,
}) {
  if (showUsername) {
    return (
      <div
        className="flex h-8 items-center gap-1.5 px-2"
        data-action-ui-id="sidebar.logged-out-actions"
      >
        <Button$1
          type="button"
          variant="default"
          title={label}
          aria-label={label}
          onClick={onLogin}
          data-action-ui-id="sidebar.login"
          className="h-8 min-w-0 flex-1 justify-center rounded-md border-0 px-3 text-[13px] font-normal leading-[13px]"
        >
          <span className="min-w-0 truncate">{label}</span>
        </Button$1>
        {companionAction ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center"
            data-action-ui-id="sidebar.logged-out-companion"
          >
            {companionAction}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      data-action-ui-id="sidebar.logged-out-actions"
    >
      {companionAction ? (
        <span
          className="flex size-8 items-center justify-center"
          data-action-ui-id="sidebar.logged-out-companion"
        >
          {companionAction}
        </span>
      ) : null}
      <Button$1
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={onLogin}
        data-action-ui-id="sidebar.login"
        className="size-8 rounded-md text-muted-foreground hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground"
      >
        <Icon icon={CircleUserRound} size="lg" className="size-[18px]" aria-hidden={true} />
      </Button$1>
    </div>
  );
}
export function SidebarBottomActionStack({ children: children2, className }) {
  return (
    <div
      data-action-ui-id="sidebar.bottom-action-stack"
      className={cn$2("flex flex-col items-center gap-1.5", className)}
    >
      {children2}
    </div>
  );
}
export function UserMenuAccountSummary({ children: children2 }) {
  return (
    <div
      data-action-ui-id="user-menu.account-summary"
      className="mx-3 mb-2 flex flex-col gap-0.5 rounded-md bg-secondary/70 p-1"
    >
      {children2}
    </div>
  );
}
export function MenuSection({ title, children: children2 }) {
  return (
    <section className="px-1 py-1">
      {title && (
        <div className="px-3 pt-2 pb-1 text-[11px] font-normal leading-4 text-muted-foreground/70">
          {title}
        </div>
      )}
      <div className="flex flex-col gap-0.5 [--user-menu-row-gap:2px] [&>.list-row-hit-area:first-child]:before:top-0 [&>.list-row-hit-area:last-child]:before:bottom-0 [&>:first-child>.list-row-hit-area]:before:top-0 [&>:last-child>.list-row-hit-area]:before:bottom-0">
        {children2}
      </div>
    </section>
  );
}
export function NewBadge() {
  const { t: t2 } = useTranslation();
  return (
    <span className="inline-flex h-4 max-w-16 shrink-0 items-center truncate rounded-full bg-foreground px-1.5 text-[10px] font-medium leading-none text-background">
      {t2("userMenu.newBadge")}
    </span>
  );
}
export function ImBridgeConnectionStatus({ connected }) {
  const { t: t2 } = useTranslation();
  return (
    <span className="max-w-24 min-w-0 truncate text-[11px] leading-none text-muted-foreground">
      {t2(`imBridge.connectionStatus.${connected ? "connected" : "notConnected"}`)}
    </span>
  );
}
const THEME_OPTIONS = [
  {
    value: "dark",
    icon: Moon,
  },
  {
    value: "light",
    icon: Sun,
  },
  {
    value: "system",
    icon: Monitor,
  },
];
export function ThemeSwitcher() {
  const { t: t2 } = useTranslation();
  const { theme: theme2, setTheme } = useTheme();
  return (
    <div className="flex h-9 items-center justify-between gap-2 rounded-sm px-3 text-[14px] leading-5 text-foreground/70">
      <Palette size={18} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{t2("settings.theme")}</span>
      <SegmentedSwitch
        value={theme2}
        onValueChange={setTheme}
        itemClassName="cursor-pointer"
        options={THEME_OPTIONS.map(({ value, icon }) => ({
          value,
          icon,
          label: t2(`settings.theme${value[0].toUpperCase()}${value.slice(1)}`),
          ariaLabel: t2(`settings.theme${value[0].toUpperCase()}${value.slice(1)}`),
          dataActionUiId: `user-menu.theme-${value}`,
        }))}
      />
    </div>
  );
}
export function MenuButton({
  icon: Icon2,
  label,
  labelSuffix,
  onClick,
  dataActionUiId,
  ariaExpanded,
  trailing,
  disabled: disabled2,
  showChevron = true,
  destructive = false,
}) {
  const shouldShowChevron = showChevron && !disabled2;
  return (
    <button
      type="button"
      disabled={disabled2}
      aria-expanded={ariaExpanded}
      onClick={() => {
        if (disabled2) return;
        if (dataActionUiId) {
          const action = dataActionUiId.startsWith("user-menu.")
            ? dataActionUiId.slice("user-menu.".length)
            : dataActionUiId;
          trackEvent(TRACK_EVENTS.USER_MENU_ACTION, {
            action,
          });
        }
        onClick();
      }}
      data-action-ui-id={dataActionUiId}
      className={cn$2(
        "list-row-hit-area [--list-row-gap:var(--user-menu-row-gap,0px)] flex h-9 w-full items-center gap-2 rounded-sm px-3 text-[14px] leading-5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground",
      )}
    >
      <Icon2 size={18} strokeWidth={1.5} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <span className="min-w-0 truncate">{label}</span>
        {labelSuffix}
      </span>
      {(trailing || shouldShowChevron) && (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {trailing}
          {shouldShowChevron && (
            <ChevronRight$1
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-muted-foreground"
            />
          )}
        </span>
      )}
    </button>
  );
}
export function MemoryManagementMenuButton() {
  const { t: t2 } = useTranslation();
  const { openSettings } = useSettingsDialog();
  return (
    <MenuButton
      icon={Brain}
      label={t2("userMenu.memoryManagement")}
      dataActionUiId="user-menu.memory-management"
      onClick={() => openSettings("memory")}
    />
  );
}
const POSITION_CLASS = {
  "top-left": "right-0 bottom-full mb-1 [--dp-quick-zoom-origin:bottom_right]",
  "top-right": "left-2 bottom-full mb-1 [--dp-quick-zoom-origin:bottom_left]",
  bottom: "left-0 top-full mt-2 [--dp-quick-zoom-origin:top_left]",
  "right-bottom": "left-full top-0 ml-2 [--dp-quick-zoom-origin:top_left]",
  right: "left-full bottom-2 ml-2 [--dp-quick-zoom-origin:bottom_left]",
};
const VIEWPORT_INSET = 8;
const TOP_POSITION_GAP = 4;
const BOTTOM_POSITION_GAP = 8;
const RIGHT_POSITION_BOTTOM_OFFSET = 8;
function getAvailableHeight(rect, position2) {
  let availableHeight;
  switch (position2) {
    case "top-left":
    case "top-right":
      availableHeight = rect.top - TOP_POSITION_GAP - VIEWPORT_INSET;
      break;
    case "bottom":
      availableHeight = window.innerHeight - rect.bottom - BOTTOM_POSITION_GAP - VIEWPORT_INSET;
      break;
    case "right-bottom":
      availableHeight = window.innerHeight - rect.top - VIEWPORT_INSET;
      break;
    case "right":
      availableHeight = rect.bottom - RIGHT_POSITION_BOTTOM_OFFSET - VIEWPORT_INSET;
      break;
  }
  return Math.max(0, Math.floor(availableHeight));
}
export function UserMenuPopoverShell(props) {
  return (
    <QuickZoomPresence value={props.open ? props : null}>
      {(retainedProps, motionProps) => (
        <UserMenuPopoverContent {...retainedProps} motionProps={motionProps} />
      )}
    </QuickZoomPresence>
  );
}
function UserMenuPopoverContent({
  motionProps,
  open,
  position: position2,
  /** Trigger root whose viewport rect anchors the portaled popover. */
  anchorRef,
  /**
   * Exposed so the interaction controller can treat the portaled popover as
   * "inside" the menu for outside-pointer close and focus restoration.
   */
  popoverRef,
  id: id2,
  ariaLabel,
  /**
   * `auto` (default): whole popover scrolls — good for flat menu lists.
   * `hidden`: pin outer shell, let nested views manage their own list scroll
   * (account switcher header/footer stay visible).
   */
  overflow = "auto",
  /** Render floating content beside the scroll panel without clipping it. */
  overlay,
  children: children2,
}) {
  const browserPreviewReady = useBrowserHoverPreview(open);
  const fallbackPopoverRef = reactExports.useRef(null);
  const frameRef = popoverRef ?? fallbackPopoverRef;
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  const [anchor, setAnchor] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const syncAnchor = () => {
      const triggerRoot = anchorRef.current;
      if (!triggerRoot) return;
      const host =
        triggerRoot.closest('[data-action-ui-id="global-sidebar-surface"]') ?? document.body;
      const rect = triggerRoot.getBoundingClientRect();
      const availableHeight = getAvailableHeight(rect, position2);
      setAnchor((previous2) => {
        if (
          previous2?.host === host &&
          previous2.left === rect.left &&
          previous2.top === rect.top &&
          previous2.width === rect.width &&
          previous2.height === rect.height &&
          previous2.availableHeight === availableHeight
        ) {
          return previous2;
        }
        return {
          host,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          availableHeight,
        };
      });
    };
    syncAnchor();
    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    const observer2 =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => syncAnchor());
    if (anchorRef.current) observer2?.observe(anchorRef.current);
    return () => {
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
      observer2?.disconnect();
    };
  }, [anchorRef, open, position2]);
  if (!open || !anchor || !browserPreviewReady) return null;
  return reactDomExports.createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
        height: anchor.height,
        "--user-menu-available-height": `${anchor.availableHeight}px`,
      }}
      data-action-ui-id="user-menu.portal-anchor"
      data-global-sidebar-hover-region="true"
    >
      <div
        ref={(element2) => {
          frameRef.current = element2;
          motionProps.ref.current = element2;
        }}
        data-ending-style={motionProps["data-ending-style"]}
        inert={motionProps["data-ending-style"] !== void 0}
        aria-hidden={motionProps["data-ending-style"] !== void 0 || void 0}
        data-action-ui-id="user-menu.popover"
        className={cn$2(
          "pointer-events-auto absolute z-50 w-[280px]",
          "dp-motion-quick-zoom",
          POSITION_CLASS[position2],
        )}
      >
        <div
          ref={scrollRef}
          id={id2}
          role="dialog"
          aria-label={ariaLabel}
          data-scrolling={isScrolling || void 0}
          className={cn$2(
            "elevated-surface-border max-h-[min(32rem,var(--user-menu-available-height))] w-full rounded-lg bg-popover shadow-lg",
            overflow === "auto"
              ? "scrollbar-fade overflow-y-auto"
              : overflow === "hidden"
                ? "flex flex-col overflow-hidden"
                : "overflow-visible",
          )}
        >
          {children2}
        </div>
        {overlay}
      </div>
    </div>,
    anchor.host,
  );
}
const PROTOCOL_LABEL_KEYS = {
  userAgreement: "userMenu.protocol.userAgreement",
  privacyPolicy: "userMenu.protocol.privacyPolicy",
  paidAgreement: "userMenu.protocol.paidAgreement",
  autoRenewal: "userMenu.protocol.autoRenewal",
  pointsRules: "userMenu.protocol.pointsRules",
};
const HIDE_DELAY_MS = 200;
const FLYOUT_PADDING = 4;
export function useUserProtocolSubmenu(anchorRef) {
  const [open, setOpen] = reactExports.useState(false);
  const [offsetTop, setOffsetTop] = reactExports.useState(0);
  const rowRef = reactExports.useRef(null);
  const hideTimer = reactExports.useRef(null);
  const syncOffset = reactExports.useCallback(() => {
    const row = rowRef.current;
    const frame2 = anchorRef.current;
    if (!row || !frame2) return;
    setOffsetTop(row.getBoundingClientRect().top - frame2.getBoundingClientRect().top);
  }, [anchorRef]);
  const show = reactExports.useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    syncOffset();
    setOpen(true);
  }, [syncOffset]);
  const scheduleHide = reactExports.useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, []);
  const hide2 = reactExports.useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setOpen(false);
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", syncOffset);
    window.addEventListener("scroll", syncOffset, true);
    return () => {
      window.removeEventListener("resize", syncOffset);
      window.removeEventListener("scroll", syncOffset, true);
    };
  }, [open, syncOffset]);
  reactExports.useEffect(
    () => () => (hideTimer.current ? clearTimeout(hideTimer.current) : void 0),
    [],
  );
  return {
    open,
    rowRef,
    offsetTop,
    show,
    scheduleHide,
    hide: hide2,
  };
}
function protocolKeysForRegion() {
  return USER_PROTOCOL_KEYS_BY_REGION[getRuntimeConfig().region];
}
export function UserProtocolMenuRow({ submenu }) {
  const { t: t2 } = useTranslation();
  const protocolKeys = protocolKeysForRegion();
  if (protocolKeys.length === 0) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover menu trigger row
    <div ref={submenu.rowRef} onMouseEnter={submenu.show} onMouseLeave={submenu.scheduleHide}>
      <MenuButton
        icon={BookOpen}
        label={t2("userMenu.protocol")}
        ariaExpanded={submenu.open}
        onClick={submenu.show}
        dataActionUiId="user-menu.protocol"
      />
    </div>
  );
}
export function UserProtocolFlyout({ submenu, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const { region, channel } = getRuntimeConfig();
  const protocolKeys = protocolKeysForRegion();
  if (!submenu.open || protocolKeys.length === 0) return null;
  return (
    <div
      role="menu"
      className="absolute left-full z-20 ml-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        top: submenu.offsetTop - FLYOUT_PADDING,
      }}
      data-action-ui-id="user-menu.protocol-submenu"
      onMouseEnter={submenu.show}
      onMouseLeave={submenu.scheduleHide}
    >
      {protocolKeys.map((key2) => (
        <MenuButton
          key={key2}
          icon={FileText}
          label={t2(PROTOCOL_LABEL_KEYS[key2])}
          showChevron={false}
          dataActionUiId={`user-menu.protocol-${key2}`}
          onClick={() => {
            submenu.hide();
            onClose();
            void openExternalUrl(platform2, getUserProtocolUrl(region, channel, key2), {
              source: `sidebar.protocol.${key2}`,
            });
          }}
        />
      ))}
    </div>
  );
}
export function UserMenuRootView({ children: children2 }) {
  return <div data-action-ui-id="user-menu.root-view">{children2}</div>;
}
const FREE_PRIVILEGE_TYPE = 0;
export function SubscriptionSummaryRow({ onClick }) {
  const { t: t2 } = useTranslation();
  const { isLoading, isError, isRefetchError } = useWalletQuery();
  const mpWallet = useMpWallet();
  const annualPromotionActive = useActiveBillingPromotion() !== null;
  const walletFailed = isError || isRefetchError;
  const checkoutDecision = useAccountSubmissionDecision("personal_checkout");
  const blockedReasonId = reactExports.useId();
  const planName = mpWallet?.plan_name?.trim();
  const subscriptionStateKnown = mpWallet?.subscription_state_known === true;
  const isFree = mpWallet?.privilege_type === FREE_PRIVILEGE_TYPE;
  const status = (() => {
    if (isLoading) return <Skeleton className="h-5 w-14 rounded-full" />;
    if (walletFailed) return null;
    if (!subscriptionStateKnown) return null;
    if (isFree) {
      return (
        <span className="inline-flex h-5 min-w-0 max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-brand-accent px-2 font-medium leading-none text-brand-accent-foreground text-caption-11">
          {annualPromotionActive
            ? t2("userMenu.subscriptionStatus.annualPromotion")
            : t2("credits.upgradeSubscription")}
        </span>
      );
    }
    if (!planName) return null;
    return (
      <span className="inline-flex h-5 min-w-0 max-w-full items-center truncate rounded-full bg-foreground/[0.08] px-2 font-medium leading-none text-muted-foreground text-caption-11">
        {planName}
      </span>
    );
  })();
  const renderContent = (showChevron) => (
    <>
      <span className="min-w-0 truncate text-left text-body-13 text-muted-foreground">
        {t2("userMenu.manageSubscription")}
      </span>
      <span className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
        {status}
        {showChevron ? (
          <Icon
            icon={ChevronRight$1}
            size="sm"
            className="shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
        ) : null}
      </span>
    </>
  );
  if (!checkoutDecision.allowed) {
    const reason = t2(`team.submission.reason.${checkoutDecision.reasonCode}`, {
      defaultValue: t2("team.common.temporarilyUnavailable", {
        defaultValue: "团队功能暂不可用",
      }),
    });
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-disabled="true"
                  aria-describedby={blockedReasonId}
                  data-action-ui-id="user-menu.manage-subscription"
                  className="flex h-9 w-full cursor-not-allowed items-center gap-2 rounded-sm px-2 leading-5 text-foreground opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                />
              }
            >
              {renderContent(false)}
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span id={blockedReasonId} className="sr-only">
          {reason}
        </span>
      </>
    );
  }
  return (
    <button
      type="button"
      data-action-ui-id="user-menu.manage-subscription"
      onClick={onClick}
      className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 leading-5 text-foreground transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      {renderContent(true)}
    </button>
  );
}
