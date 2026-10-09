// user-avatar-menu.jsx
import {
  Check,
  ChevronRight$1,
  Copy,
  dedupedToast,
  getRuntimeConfig,
  GraduationCap,
  guardAccountSubmission,
  jsxRuntimeExports,
  Monitor,
  Palette,
  reactDomExports,
  reactExports,
  Smartphone,
  Sun,
  SwatchBook,
  usePlatform,
  useQueryClient,
  User,
  useTranslation,
  Wrench,
} from "../vendor.js";
import {
  Icon,
  openExternalUrl,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  cn$2,
  Dialog,
  DialogContent,
  DialogHeader,
  TooltipContent,
  useBrowserHoverPreview,
} from "../infra/dialog-content.jsx";
import {
  BookOpen,
  Brain,
  FileText,
  LogOut,
  Moon,
  Settings,
  Users,
} from "../media-editing/package.jsx";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { useSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import {
  accountScopeKey,
  creditQueryKeys,
  useIsScrolling,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { QuickZoomPresence } from "../canvas/canvas-high-blast-delete-dialog.jsx";
import {
  getTutorialUrl,
  getUserProtocolUrl,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  USER_PROTOCOL_KEYS_BY_REGION,
} from "./shortcut-hint.jsx";
import {
  teamQueryKeys,
  useAccountSubmissionDecision,
} from "../assets/gateway-scope-provider.jsx";
import {
  HailuoCreditRow,
  MpCreditRow,
  SubscriptionRenewalBadge,
  useCanMigrate,
  useMpSubscribeUrl,
  useMpWallet,
} from "../team/hailuo-credit-row.jsx";
import { Skeleton, useWalletQuery } from "../team/use-wallet-query.jsx";
import { useActiveBillingPromotion } from "../chat/chat-compliance-notice.jsx";
import { SECTION_REGISTRY } from "../media-editing/action-list-section.jsx";
import {
  INITIAL_CUSTOM_STATE,
  ROUNDED_TOKENS,
  SPACING_SCALE,
} from "./rounded-tokens.js";
import { SCENARIOS } from "./scenarios.jsx";
import { DEFAULT_PAGE_STATE_PREVIEW_SCHEMA } from "../media-editing/unwrap-mcp-json-record.js";
import { DialogTitle, Textarea } from "../infra/badge-variants.jsx";
import { PageStateView } from "../assets/page-state-view.jsx";
import { parsePageStatePreviewSchema } from "../infra/parse-page-state-preview-schema.js";
import { TypographyTokens } from "./typography-tokens.jsx";
import { IconPreview } from "../infra/media-preview.jsx";
import { ColorTokens } from "../media-editing/color-tokens.jsx";
import { ScrollArea } from "../media-editing/scroll-bar.jsx";
import { canUseDebugTooling } from "./use-deep-link-router.js";
import { DEBUG_PANEL_OPEN_EVENT } from "../settings/request-prompt-prefill.jsx";
import { useImBridgeDialog } from "./offline-banner.jsx";
import { useImAccounts } from "../settings/use-im-accounts.jsx";
import { useSubscriptionRenewalNotice } from "../team/derive-subscription-status.js";
import { CreditDetailsDialog } from "../team/credit-details-dialog.jsx";
import { AccountSwitcherView } from "../team/account-switcher-view.jsx";
import { TeamAccountSummary } from "../team/team-account-summary.jsx";
import { VersionRow } from "../settings/version-row.jsx";
import { MigrationDialog } from "../settings/migration-dialog.jsx";
import {
  UserMenuAccountSummary,
  UserMenuRootView,
} from "../generation/user-menu-account-summary.jsx";

const AVATAR_DECODE_SIZE = 128;

function useResizedAvatar(src) {
  const [resized, setResized] = reactExports.useState();
  const blobUrl = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = new OffscreenCanvas(
        AVATAR_DECODE_SIZE,
        AVATAR_DECODE_SIZE,
      );
      canvas
        .getContext("2d")
        ?.drawImage(img, 0, 0, AVATAR_DECODE_SIZE, AVATAR_DECODE_SIZE);
      canvas
        .convertToBlob({
          type: "image/png",
        })
        .then((blob) => {
          if (cancelled) return;
          if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
          const url2 = URL.createObjectURL(blob);
          blobUrl.current = url2;
          setResized(url2);
        })
        .catch(() => {
          if (!cancelled) setResized(src);
        });
    };
    img.onerror = () => {
      if (!cancelled) setResized(src);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  reactExports.useEffect(() => {
    return () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);
  return resized;
}

function useUserMenuController() {
  const [open, setOpen] = reactExports.useState(false);
  const menuRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  const triggerRef = reactExports.useRef(null);
  const openMenu = reactExports.useCallback(() => {
    setOpen(true);
  }, []);
  const closeMenu = reactExports.useCallback(() => {
    setOpen(false);
  }, []);
  const closeMenuAndRestoreFocus = reactExports.useCallback(() => {
    closeMenu();
    triggerRef.current?.focus();
  }, [closeMenu]);
  const handleTriggerClick = reactExports.useCallback(() => {
    setOpen((current2) => !current2);
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleKeyDown2 = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenuAndRestoreFocus();
    };
    window.addEventListener("keydown", handleKeyDown2);
    return () => window.removeEventListener("keydown", handleKeyDown2);
  }, [closeMenuAndRestoreFocus, open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeMenu, open]);
  return {
    open,
    menuRef,
    popoverRef,
    triggerRef,
    openMenu,
    closeMenu,
    handleTriggerClick,
  };
}

const IM_BRIDGE_SHORTCUT_SEEN_KEY = "hilo:im-bridge-shortcut-seen";

function hasSeenImBridgeShortcut() {
  try {
    return localStorage.getItem(IM_BRIDGE_SHORTCUT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function ImBridgeShortcutWithTooltip({
  className,
  onClick,
  side,
  showUnreadDot = false,
}) {
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
                isOverseas &&
                  "cursor-not-allowed bg-muted text-muted-foreground opacity-60",
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

function SidebarBottomActionStack({ children: children2, className }) {
  return (
    <div
      data-action-ui-id="sidebar.bottom-action-stack"
      className={cn$2("flex flex-col items-center gap-1.5", className)}
    >
      {children2}
    </div>
  );
}

function MenuSection({ title, children: children2 }) {
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

function NewBadge() {
  const { t: t2 } = useTranslation();
  return (
    <span className="inline-flex h-4 max-w-16 shrink-0 items-center truncate rounded-full bg-foreground px-1.5 text-[10px] font-medium leading-none text-background">
      {t2("userMenu.newBadge")}
    </span>
  );
}

function ImBridgeConnectionStatus({ connected }) {
  const { t: t2 } = useTranslation();
  return (
    <span className="max-w-24 min-w-0 truncate text-[11px] leading-none text-muted-foreground">
      {t2(
        `imBridge.connectionStatus.${connected ? "connected" : "notConnected"}`,
      )}
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

function ThemeSwitcher() {
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
          ariaLabel: t2(
            `settings.theme${value[0].toUpperCase()}${value.slice(1)}`,
          ),
          dataActionUiId: `user-menu.theme-${value}`,
        }))}
      />
    </div>
  );
}

function MenuButton({
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

function MemoryManagementMenuButton() {
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
      availableHeight =
        window.innerHeight - rect.bottom - BOTTOM_POSITION_GAP - VIEWPORT_INSET;
      break;
    case "right-bottom":
      availableHeight = window.innerHeight - rect.top - VIEWPORT_INSET;
      break;
    case "right":
      availableHeight =
        rect.bottom - RIGHT_POSITION_BOTTOM_OFFSET - VIEWPORT_INSET;
      break;
  }
  return Math.max(0, Math.floor(availableHeight));
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
        triggerRoot.closest('[data-action-ui-id="global-sidebar-surface"]') ??
        document.body;
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
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => syncAnchor());
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

function UserMenuPopoverShell(props) {
  return (
    <QuickZoomPresence value={props.open ? props : null}>
      {(retainedProps, motionProps) => (
        <UserMenuPopoverContent {...retainedProps} motionProps={motionProps} />
      )}
    </QuickZoomPresence>
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

function useUserProtocolSubmenu(anchorRef) {
  const [open, setOpen] = reactExports.useState(false);
  const [offsetTop, setOffsetTop] = reactExports.useState(0);
  const rowRef = reactExports.useRef(null);
  const hideTimer = reactExports.useRef(null);
  const syncOffset = reactExports.useCallback(() => {
    const row = rowRef.current;
    const frame2 = anchorRef.current;
    if (!row || !frame2) return;
    setOffsetTop(
      row.getBoundingClientRect().top - frame2.getBoundingClientRect().top,
    );
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

function UserProtocolMenuRow({ submenu }) {
  const { t: t2 } = useTranslation();
  const protocolKeys = protocolKeysForRegion();
  if (protocolKeys.length === 0) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover menu trigger row
    <div
      ref={submenu.rowRef}
      onMouseEnter={submenu.show}
      onMouseLeave={submenu.scheduleHide}
    >
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

function UserProtocolFlyout({ submenu, onClose }) {
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
            void openExternalUrl(
              platform2,
              getUserProtocolUrl(region, channel, key2),
              {
                source: `sidebar.protocol.${key2}`,
              },
            );
          }}
        />
      ))}
    </div>
  );
}

const FREE_PRIVILEGE_TYPE = 0;

function SubscriptionSummaryRow({ onClick }) {
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

function ComponentsLibrary() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        {"全部 "}
        {SECTION_REGISTRY.length}
        {" 个基础组件 + 主要 variant。"}
      </p>
      {SECTION_REGISTRY.map(({ id: id2, Component }) => (
        <Component key={id2} />
      ))}
    </div>
  );
}

const PREVIEW_FRAMES = [
  {
    key: "page",
    label: "Page container",
    className: "w-full",
  },
  {
    key: "panel",
    label: "Panel container",
    className: "w-full max-w-md self-center",
  },
];

function PageStatePreview() {
  const { t: t2 } = useTranslation();
  const [schemaSource, setSchemaSource] = reactExports.useState(
    DEFAULT_PAGE_STATE_PREVIEW_SCHEMA,
  );
  const [customState, setCustomState] =
    reactExports.useState(INITIAL_CUSTOM_STATE);
  const [schemaError, setSchemaError] = reactExports.useState(null);
  const scenarios = [
    ...SCENARIOS,
    {
      value: "custom",
      label: "Custom Schema",
      state: customState,
    },
  ];
  const handleSchemaChange = (event) => {
    const source = event.target.value;
    const result = parsePageStatePreviewSchema(source);
    setSchemaSource(source);
    setSchemaError(result.error);
    if (result.state != null) setCustomState(result.state);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        Compare the same state in page and panel widths. Default illustrations
        follow the current app theme.
      </p>
      <section
        className="space-y-2"
        data-action-ui-id="ui-spec-page-state-compact"
      >
        <h3 className="text-sm font-medium">
          {t2("uiSpec.pageState.compact.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t2("uiSpec.pageState.compact.note")}
        </p>
        <div className="flex h-40 max-w-sm overflow-auto rounded-lg border border-border bg-popover">
          <PageStateView
            density="compact"
            state={{
              type: "empty",
              text: t2("mention.popover.noResults"),
              actions: [],
            }}
          />
        </div>
      </section>
      <Tabs defaultValue="empty" className="gap-3">
        <TabsList
          className="w-fit max-w-full flex-wrap"
          data-action-ui-id="ui-spec-page-state-scenarios"
        >
          {scenarios.map((scenario) => (
            <TabsTrigger
              key={scenario.value}
              value={scenario.value}
              className="text-xs"
              data-action-ui-id={`ui-spec-page-state-${scenario.value}`}
            >
              {scenario.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {scenarios.map((scenario) => (
          <TabsContent key={scenario.value} value={scenario.value}>
            <div className="flex flex-col gap-3">
              {scenario.value === "custom" ? (
                <section className="flex flex-col gap-1.5">
                  <label
                    htmlFor="page-state-preview-schema"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Page state schema
                  </label>
                  <Textarea
                    id="page-state-preview-schema"
                    value={schemaSource}
                    onChange={handleSchemaChange}
                    aria-invalid={schemaError != null}
                    aria-describedby="page-state-preview-schema-help"
                    spellCheck={false}
                    className="min-h-52 resize-y font-mono text-[11px] leading-relaxed"
                    data-action-ui-id="ui-spec-page-state-schema-input"
                  />
                  <p
                    id="page-state-preview-schema-help"
                    role={schemaError == null ? void 0 : "alert"}
                    className={
                      schemaError == null
                        ? "text-[11px] text-muted-foreground"
                        : "text-[11px] text-destructive"
                    }
                  >
                    {schemaError ??
                      "Reason values: empty uses generic/project; error uses generic/network. Supported action fields: key, icon, label, variant, placement, disabled, and loading. Placement is inline by default; use separate for a secondary action such as Dismiss. Icon values: feedback, refresh-cw, or x. Click callbacks are mocked by the preview."}
                  </p>
                </section>
              ) : null}
              <div
                className="flex flex-col gap-3"
                data-slot="page-state-preview-frames"
              >
                {PREVIEW_FRAMES.map((frame2) => (
                  <section
                    key={frame2.key}
                    className={`flex min-w-0 flex-col gap-1.5 ${frame2.className}`}
                  >
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {frame2.label}
                    </h3>
                    <div
                      className="flex min-h-96 overflow-hidden rounded-lg border border-border bg-background"
                      data-action-ui-id={`ui-spec-page-state-${frame2.key}-preview`}
                    >
                      <PageStateView
                        state={scenario.state}
                        density={frame2.key}
                      >
                        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-foreground/70">
                          Normal content renders without an additional state
                          container.
                        </div>
                      </PageStateView>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SpacingTokens() {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Spacing Scale
        </h3>
        <p className="text-[10px] text-muted-foreground">
          Tailwind 默认 scale，禁止内联 px。
        </p>
        <div className="flex flex-col gap-1">
          {SPACING_SCALE.map((s2) => (
            <div
              key={s2.name}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <div
                className="h-3 bg-foreground shrink-0"
                style={{
                  width: `${s2.px}px`,
                }}
              />
              <div className="text-[10px] font-mono text-foreground flex-1">
                {s2.name}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                {s2.px}px
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Rounded
        </h3>
        <p className="text-[10px] text-muted-foreground">
          以当前主题 token 的实际计算值为准；结构分隔层可保留直角。
        </p>
        <div className="flex flex-col gap-1.5">
          {ROUNDED_TOKENS.map((r2) => (
            <div
              key={r2.name}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <div
                className="h-6 w-6 bg-foreground shrink-0"
                style={{
                  borderRadius: `${r2.px}px`,
                }}
              />
              <div className="text-[10px] font-mono text-foreground flex-1">
                {r2.name}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                {r2.px}px
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const TABS = [
  {
    value: "colors",
    label: "Colors",
    Component: ColorTokens,
  },
  {
    value: "typography",
    label: "Typography",
    Component: TypographyTokens,
  },
  {
    value: "spacing",
    label: "Spacing",
    Component: SpacingTokens,
  },
  {
    value: "icons",
    label: "Icon",
    Component: IconPreview,
  },
  {
    value: "components",
    label: "Components",
    Component: ComponentsLibrary,
  },
  {
    value: "page-states",
    label: "Default States",
    Component: PageStatePreview,
  },
];

function UISpecContent() {
  return (
    <Tabs defaultValue="colors" className="flex h-full flex-col">
      <TabsList
        className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] shrink-0 overflow-x-auto"
        data-action-ui-id="ui-spec-tabs"
      >
        {TABS.map((tab2) => (
          <TabsTrigger
            key={tab2.value}
            value={tab2.value}
            className="px-3 text-xs"
            data-action-ui-id={`ui-spec-tab-${tab2.value}`}
          >
            {tab2.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab2) => (
        <TabsContent
          key={tab2.value}
          value={tab2.value}
          className="flex-1 overflow-hidden mt-3"
        >
          <ScrollArea className="h-full">
            <div className="px-4 pb-4">
              <tab2.Component />
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function UISpecDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-4xl"
        data-action-ui-id="ui-spec-dialog"
      >
        <DialogHeader className="flex h-10 shrink-0 flex-row items-center justify-center border-b border-border px-4">
          <DialogTitle>{t2("userMenu.uiSpec", "设计规范")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <UISpecContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UserAvatarMenu({
  user,
  onLogout,
  popupPosition = "right",
  showUsername = false,
  onChangelog,
  onOverlayOpenChange,
  trailingAction,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const { openSettings } = useSettingsDialog();
  const { openImBridge } = useImBridgeDialog();
  const {
    open,
    menuRef,
    popoverRef,
    triggerRef,
    openMenu,
    closeMenu,
    handleTriggerClick,
  } = useUserMenuController();
  const menuId = reactExports.useId();
  const protocolSubmenu = useUserProtocolSubmenu(popoverRef);
  const teamAccount = useOptionalTeamAccount();
  const teamIntegrationEnabled = teamAccount?.integrationEnabled ?? false;
  const accountDataVisible = teamAccount?.accountDataVisible === true;
  const teamReady =
    teamAccount?.viewModel.kind === "ready_team" && accountDataVisible;
  const [copied, setCopied] = reactExports.useState(false);
  const [accountSwitcherExpanded, setAccountSwitcherExpanded] =
    reactExports.useState(false);
  const [showCreditsDetails, setShowCreditsDetails] =
    reactExports.useState(false);
  const { showBadge: showRenewalBadge } = useSubscriptionRenewalNotice();
  const [showMigration, setShowMigration] = reactExports.useState(false);
  const creditDialogScopeRef = reactExports.useRef(null);
  const migrationDialogScopeRef = reactExports.useRef(null);
  const [showUISpec, setShowUISpec] = reactExports.useState(false);
  const [showImBridgeReminder, setShowImBridgeReminder] = reactExports.useState(
    () =>
      getRuntimeConfig().region !== "overseas" && !hasSeenImBridgeShortcut(),
  );
  const { accounts: imBridgeAccounts } = useImAccounts();
  const hasImBridgeAccount = imBridgeAccounts.length > 0;
  const showPersonalCreditSummary =
    !teamIntegrationEnabled ||
    (teamAccount?.viewModel.kind === "ready_personal" &&
      accountDataVisible &&
      teamAccount.billingAvailable);
  const activeAccountScopeKey = accountScopeKey(
    teamAccount?.activeScope ?? null,
  );
  reactExports.useEffect(() => {
    if (!teamIntegrationEnabled) return;
    const personalReady = showPersonalCreditSummary;
    if (
      showCreditsDetails &&
      (!personalReady || creditDialogScopeRef.current !== activeAccountScopeKey)
    ) {
      creditDialogScopeRef.current = null;
      setShowCreditsDetails(false);
    }
    if (
      showMigration &&
      (!personalReady ||
        migrationDialogScopeRef.current !== activeAccountScopeKey)
    ) {
      migrationDialogScopeRef.current = null;
      setShowMigration(false);
    }
  }, [
    activeAccountScopeKey,
    showCreditsDetails,
    showMigration,
    showPersonalCreditSummary,
    teamIntegrationEnabled,
  ]);
  const canMigrate = useCanMigrate();
  const subscribeUrl = useMpSubscribeUrl();
  const markImBridgeReminderSeen = reactExports.useCallback(() => {
    setShowImBridgeReminder(false);
    try {
      localStorage.setItem(IM_BRIDGE_SHORTCUT_SEEN_KEY, "1");
    } catch {}
  }, []);
  const handleOpenImBridge = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      closeMenu();
      markImBridgeReminderSeen();
      trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
        source: "avatar_shortcut",
        has_account: hasImBridgeAccount,
      });
      openImBridge();
    },
    [closeMenu, hasImBridgeAccount, markImBridgeReminderSeen, openImBridge],
  );
  const wasOpenRef = reactExports.useRef(false);
  const refreshOnOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !wasOpenRef.current) {
      trackEvent(TRACK_EVENTS.USER_MENU_OPEN, {});
    }
    if (!open) setAccountSwitcherExpanded(false);
    if (!open) protocolSubmenu.hide();
    wasOpenRef.current = open;
  }, [open, protocolSubmenu.hide]);
  reactExports.useEffect(() => {
    if (!open) {
      refreshOnOpenRef.current = false;
      return;
    }
    if (refreshOnOpenRef.current) return;
    const identityKey = teamAccount?.snapshot?.identityKey ?? null;
    const activeScope = teamAccount?.activeScope ?? null;
    if (!teamIntegrationEnabled || !identityKey || !activeScope) return;
    refreshOnOpenRef.current = true;
    void Promise.all([
      queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.contexts(identityKey),
        exact: true,
      }),
      queryClient2.invalidateQueries({
        queryKey: creditQueryKeys.summary(activeScope),
        exact: true,
      }),
    ]);
  }, [
    open,
    queryClient2,
    teamAccount?.activeScope,
    teamAccount?.snapshot?.identityKey,
    teamIntegrationEnabled,
  ]);
  const overlayOpen = open || accountSwitcherExpanded;
  const overlayOpenChangeRef = reactExports.useRef(onOverlayOpenChange);
  reactExports.useEffect(() => {
    overlayOpenChangeRef.current = onOverlayOpenChange;
  }, [onOverlayOpenChange]);
  reactExports.useEffect(() => {
    overlayOpenChangeRef.current?.(overlayOpen);
    if (!overlayOpen) return;
    return () => overlayOpenChangeRef.current?.(false);
  }, [overlayOpen]);
  const handleToggleAccountSwitcher = reactExports.useCallback(() => {
    openMenu();
    setAccountSwitcherExpanded((expanded) => !expanded);
  }, [openMenu]);
  const handleAvatarTriggerClick = reactExports.useCallback(() => {
    setAccountSwitcherExpanded(false);
    handleTriggerClick();
  }, [handleTriggerClick]);
  const handleCopyUID = reactExports.useCallback(async () => {
    if (!user.userID) return;
    try {
      await navigator.clipboard.writeText(user.userID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      dedupedToast.error(t2("common.copyFailed"));
    }
  }, [user.userID, t2]);
  const initial = user.username?.charAt(0).toUpperCase();
  const avatarSrc = useResizedAvatar(user.avatar);
  const showUISpecEntry = canUseDebugTooling();
  const showDebugPanelEntry = showUISpecEntry;
  const renderAvatar = (
    sizeClassName,
    fallbackIconSize,
    fallbackTextClassName,
    showBadge = false,
  ) => (
    <span className={cn$2("relative shrink-0 rounded-full", sizeClassName)}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className={cn$2(
            "flex h-full w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
            fallbackTextClassName ?? (showUsername ? "text-xs" : "text-sm"),
          )}
        >
          {initial || <User size={fallbackIconSize} />}
        </span>
      )}
      {showBadge && <SubscriptionRenewalBadge />}
    </span>
  );
  return (
    <>
      <div
        ref={menuRef}
        data-action-ui-id="sidebar.user-avatar"
        className={`relative ${showUsername ? "" : "px-2 pt-1 pb-1"}`}
      >
        {showUsername ? (
          <div className="sidebar-user-menu-trigger-row flex h-10 w-full items-center gap-1">
            <div className="min-w-0 flex-1">
              <button
                ref={triggerRef}
                type="button"
                data-action-ui-id="user-menu.trigger"
                title={user.username || t2("sidebar.user")}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={handleAvatarTriggerClick}
                className="group/avatar-trigger flex h-10 w-full min-w-0 cursor-pointer items-center text-left text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <span
                  className={cn$2(
                    "sidebar-user-menu-trigger-content flex h-9 w-full min-w-0 items-center gap-2 rounded-md pr-2 transition-colors",
                    open
                      ? "bg-[var(--home-sidebar-nav-active)]"
                      : "group-hover/avatar-trigger:bg-[var(--home-sidebar-nav-hover)]",
                  )}
                >
                  {renderAvatar("size-7", 14, void 0, showRenewalBadge)}
                  <span className="min-w-0 flex-1 truncate text-body-14">
                    {user.username || t2("sidebar.user")}
                  </span>
                </span>
              </button>
            </div>
            <ImBridgeShortcutWithTooltip
              onClick={handleOpenImBridge}
              side="top"
              showUnreadDot={showImBridgeReminder}
            />
            {trailingAction}
          </div>
        ) : (
          <SidebarBottomActionStack className="gap-2.5">
            {trailingAction}
            <ImBridgeShortcutWithTooltip
              onClick={handleOpenImBridge}
              side="right"
              showUnreadDot={showImBridgeReminder}
            />
            <div>
              <button
                ref={triggerRef}
                type="button"
                data-action-ui-id="user-menu.trigger"
                title={user.username || t2("sidebar.user")}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={handleAvatarTriggerClick}
                className={cn$2(
                  "group/avatar-trigger flex size-8 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                  open
                    ? "bg-[var(--home-sidebar-nav-active)]"
                    : "hover:bg-[var(--home-sidebar-nav-hover)]",
                )}
              >
                {renderAvatar("size-7", 14, "text-xs", showRenewalBadge)}
              </button>
            </div>
          </SidebarBottomActionStack>
        )}
        <UserMenuPopoverShell
          id={menuId}
          ariaLabel={t2("sidebar.user")}
          open={open}
          position={popupPosition}
          anchorRef={menuRef}
          popoverRef={popoverRef}
          overflow="auto"
          overlay={
            <>
              {teamIntegrationEnabled && accountSwitcherExpanded ? (
                <div
                  className="absolute top-0 left-full z-10 ml-2 max-h-[min(32rem,var(--user-menu-available-height))] w-[300px] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                  data-action-ui-id="team.account-switcher-flyout"
                >
                  <div className="flex h-10 items-center border-b border-border px-2">
                    <p className="min-w-0 flex-1 truncate font-normal text-body-14 text-foreground">
                      {t2("team.switcher.menuLabel", {
                        defaultValue: "切换账号",
                      })}
                    </p>
                  </div>
                  <AccountSwitcherView
                    embedded={true}
                    showSectionHeadings={true}
                    onCreate={closeMenu}
                    onSwitchComplete={() => setAccountSwitcherExpanded(false)}
                  />
                </div>
              ) : null}
              <UserProtocolFlyout
                submenu={protocolSubmenu}
                onClose={closeMenu}
              />
            </>
          }
        >
          <UserMenuRootView>
            <div className="px-4 pt-4 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                {renderAvatar("size-10", 20, "text-base")}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground text-title-15">
                    {user.username || t2("sidebar.user")}
                  </div>
                  {user.userID && (
                    <button
                      type="button"
                      className="group mt-0.5 flex max-w-full cursor-pointer items-center gap-1 rounded-sm text-body-12 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                      onClick={handleCopyUID}
                      aria-label={`${t2("common.copy")} UID ${user.userID}`}
                    >
                      <span className="truncate">
                        {"UID : "}
                        {user.userID}
                      </span>
                      {copied ? (
                        <Check size={11} className="shrink-0 text-primary" />
                      ) : (
                        <Copy
                          size={11}
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      )}
                      <span className="sr-only" aria-live="polite">
                        {copied ? t2("common.copied") : ""}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {teamIntegrationEnabled || showPersonalCreditSummary ? (
              <UserMenuAccountSummary>
                {teamIntegrationEnabled ? (
                  <TeamAccountSummary
                    onOpenSwitcher={handleToggleAccountSwitcher}
                    onOpenCredits={closeMenu}
                    onOpenSubscription={() => {
                      const decision = guardAccountSubmission("team_checkout");
                      if (
                        !decision.allowed ||
                        decision.mode !== "CANONICAL" ||
                        accountScopeKey(decision.scope) !==
                          activeAccountScopeKey
                      ) {
                        return;
                      }
                      if (!subscribeUrl) {
                        dedupedToast.error(
                          t2(
                            "credits.walletUrlNotReady",
                            "Wallet info loading, please try again",
                          ),
                        );
                        return;
                      }
                      closeMenu();
                      void openExternalUrl(platform2, subscribeUrl, {
                        source: "sidebar.team-manage-subscription",
                      });
                    }}
                    switcherExpanded={accountSwitcherExpanded}
                  />
                ) : null}
                {showPersonalCreditSummary ? (
                  <>
                    <MpCreditRow
                      showRenewalBadge={showRenewalBadge}
                      onClick={() => {
                        closeMenu();
                        creditDialogScopeRef.current = teamIntegrationEnabled
                          ? activeAccountScopeKey
                          : "LEGACY_PERSONAL";
                        setShowCreditsDetails(true);
                      }}
                    />
                    {canMigrate && (
                      <HailuoCreditRow
                        onExchange={() => {
                          closeMenu();
                          migrationDialogScopeRef.current =
                            teamIntegrationEnabled
                              ? activeAccountScopeKey
                              : "LEGACY_PERSONAL";
                          setShowMigration(true);
                        }}
                      />
                    )}
                    <SubscriptionSummaryRow
                      onClick={() => {
                        const decision =
                          guardAccountSubmission("personal_checkout");
                        if (!decision.allowed) return;
                        if (!subscribeUrl) {
                          dedupedToast.error(
                            t2(
                              "credits.walletUrlNotReady",
                              "Wallet info loading, please try again",
                            ),
                          );
                          return;
                        }
                        closeMenu();
                        void openExternalUrl(platform2, subscribeUrl, {
                          source: "sidebar.manage-subscription",
                        });
                      }}
                    />
                  </>
                ) : null}
              </UserMenuAccountSummary>
            ) : null}
            <div className="flex flex-col gap-0.5 pb-1">
              {teamReady ? (
                <MenuSection
                  title={t2("userMenu.sectionAccount", {
                    defaultValue: "Account",
                  })}
                >
                  <MenuButton
                    icon={Users}
                    label={t2("team.management.title", {
                      defaultValue: "团队管理",
                    })}
                    onClick={() => {
                      closeMenu();
                      teamAccount?.openManagement();
                    }}
                    dataActionUiId="team.management.open"
                  />
                </MenuSection>
              ) : null}
              <MenuSection title={t2("userMenu.sectionSettings")}>
                <ThemeSwitcher />
                <MemoryManagementMenuButton />
                <MenuButton
                  icon={Smartphone}
                  label={t2(
                    `imBridge.menuLabel.${getRuntimeConfig().region === "overseas" ? "overseas" : "domestic"}`,
                  )}
                  disabled={getRuntimeConfig().region === "overseas"}
                  onClick={() => {
                    closeMenu();
                    markImBridgeReminderSeen();
                    trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
                      source: "user_menu",
                      has_account: hasImBridgeAccount,
                    });
                    openImBridge();
                  }}
                  labelSuffix={!hasImBridgeAccount ? <NewBadge /> : void 0}
                  trailing={
                    getRuntimeConfig().region === "overseas" ? (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {t2("common.comingSoon")}
                      </span>
                    ) : (
                      <ImBridgeConnectionStatus
                        connected={hasImBridgeAccount}
                      />
                    )
                  }
                  dataActionUiId="user-menu.im-bridge"
                />
                <MenuButton
                  icon={Settings}
                  label={t2("common.settings")}
                  onClick={() => {
                    closeMenu();
                    openSettings();
                  }}
                  dataActionUiId="user-menu.settings"
                />
              </MenuSection>
              <MenuSection title={t2("userMenu.sectionHelp")}>
                <MenuButton
                  icon={GraduationCap}
                  label={t2("userMenu.tutorial")}
                  onClick={() => {
                    closeMenu();
                    void openExternalUrl(
                      platform2,
                      getTutorialUrl(getRuntimeConfig().region),
                      {
                        source: "sidebar.tutorial",
                      },
                    );
                  }}
                  dataActionUiId="user-menu.tutorial"
                />
                {onChangelog && (
                  <MenuButton
                    icon={FileText}
                    label={t2("homeSidebar.changelog")}
                    onClick={() => {
                      closeMenu();
                      onChangelog();
                    }}
                    dataActionUiId="user-menu.changelog"
                  />
                )}
                <UserProtocolMenuRow submenu={protocolSubmenu} />
                <VersionRow menuOpen={open} />
              </MenuSection>
              {(showUISpecEntry || showDebugPanelEntry) && (
                <MenuSection title={t2("userMenu.sectionTestOnly")}>
                  {showUISpecEntry && (
                    <MenuButton
                      icon={SwatchBook}
                      label={t2("userMenu.uiSpec")}
                      onClick={() => {
                        closeMenu();
                        setShowUISpec(true);
                      }}
                      dataActionUiId="user-menu.ui-spec"
                    />
                  )}
                  {showDebugPanelEntry && (
                    <MenuButton
                      icon={Wrench}
                      label={t2("debugPanel.title")}
                      onClick={() => {
                        closeMenu();
                        window.dispatchEvent(new Event(DEBUG_PANEL_OPEN_EVENT));
                      }}
                      dataActionUiId="user-menu.debug-panel"
                    />
                  )}
                </MenuSection>
              )}
              <div className="px-1 py-1">
                <MenuButton
                  icon={LogOut}
                  label={t2("sidebar.logout")}
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                  dataActionUiId="user-menu.logout"
                  showChevron={false}
                  destructive={true}
                />
              </div>
            </div>
          </UserMenuRootView>
        </UserMenuPopoverShell>
      </div>
      <CreditDetailsDialog
        open={showCreditsDetails}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) creditDialogScopeRef.current = null;
          setShowCreditsDetails(nextOpen);
        }}
      />
      <MigrationDialog
        open={showMigration}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) migrationDialogScopeRef.current = null;
          setShowMigration(nextOpen);
        }}
      />
      {showUISpecEntry && (
        <UISpecDialog open={showUISpec} onOpenChange={setShowUISpec} />
      )}
    </>
  );
}
