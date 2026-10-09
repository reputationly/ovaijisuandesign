// sidebar-nav-button.jsx
import { MonochromeIcon } from "../vendor.js";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { GLOBAL_SIDEBAR_RAIL_WIDTH } from "./set-home-widget-dev-preview-mode.js";
import { cn$2, TooltipContent } from "../infra/dialog-content.jsx";
import { SidebarReleaseBadge } from "./sidebar-release-badge.jsx";
import {
  HOME_NAV_ACTIVE_CLASS,
  HOME_NAV_BUTTON_CLASS,
  HOME_NAV_HOVER_CLASS,
  HOME_NAV_ICON_SIZE,
  HOME_NAV_ICON_SLOT_CLASS,
  HOME_NAV_INACTIVE_TEXT_CLASS,
  HOME_NAV_PILL_CLASS,
  HOME_RAIL_PILL_CLASS,
} from "../settings/search-button.jsx";

const HOME_RAIL_TOOLTIP_DELAY_MS = 150;

export function SidebarNavButton({
  item,
  active: active2,
  onClick,
  compact = false,
}) {
  const {
    icon: Icon2,
    iconClassName,
    iconSize = HOME_NAV_ICON_SIZE,
    label,
    to,
    disabled: disabled2,
    tooltip,
    badgeTarget,
    releaseBadge,
  } = item;
  const accessibleLabel = releaseBadge
    ? `${label}, ${releaseBadge.label}`
    : label;
  const button = (
    <button
      type="button"
      aria-label={compact || releaseBadge ? accessibleLabel : void 0}
      aria-current={active2 ? "page" : void 0}
      data-icon-disabled={disabled2 || void 0}
      data-action-ui-id={`home-sidebar-nav-${to.replace(/^\//, "") || "home"}`}
      onClick={disabled2 ? void 0 : () => onClick(to)}
      className={cn$2(
        HOME_NAV_BUTTON_CLASS,
        to !== "/" && "icon-sidebar-nav-control",
        disabled2
          ? "text-muted-foreground/30 cursor-not-allowed"
          : active2
            ? "text-foreground"
            : HOME_NAV_INACTIVE_TEXT_CLASS,
      )}
    >
      <span
        className={cn$2(
          HOME_NAV_PILL_CLASS,
          compact && HOME_RAIL_PILL_CLASS,
          !disabled2 &&
            (active2 ? HOME_NAV_ACTIVE_CLASS : HOME_NAV_HOVER_CLASS),
        )}
      >
        {to === "/asset-center" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0"
            data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"
            data-presentation={compact ? "rail" : "full"}
            style={{
              width: compact ? GLOBAL_SIDEBAR_RAIL_WIDTH : "100%",
            }}
          />
        ) : null}
        <span
          className={cn$2(HOME_NAV_ICON_SLOT_CLASS, "relative", iconClassName)}
          data-action-ui-id="home-sidebar.nav-icon-slot"
        >
          {to === "/" ? (
            <Icon2 aria-hidden={true} size={iconSize} strokeWidth={1.5} />
          ) : (
            <MonochromeIcon tone="control">
              <Icon2 aria-hidden={true} size={iconSize} strokeWidth={1.5} />
            </MonochromeIcon>
          )}
          {compact && (
            <SidebarReleaseBadge
              compact={true}
              target={badgeTarget}
              releaseBadge={releaseBadge}
            />
          )}
        </span>
        <span className="home-sidebar-detail truncate leading-[normal]">
          {label}
        </span>
        {!compact ? (
          <SidebarReleaseBadge
            target={badgeTarget}
            releaseBadge={releaseBadge}
          />
        ) : null}
      </span>
    </button>
  );
  return (
    <TooltipProvider delay={HOME_RAIL_TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger render={button} />
        {(disabled2 && tooltip) || compact ? (
          <TooltipContent side="right">
            {tooltip ?? accessibleLabel}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}
