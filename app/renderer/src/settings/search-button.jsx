// search-button.jsx
import {
  MonochromeIcon,
  Search,
  usePlatform,
  useTranslation,
} from "../vendor.js";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { resolveShortcutDisplay } from "../workspace/other-modifiers.js";
import { ShortcutHint } from "../workspace/shortcut-hint.jsx";
export const SIDEBAR_BADGE_TARGET_BY_ROUTE = {
  "/": "launchpad",
  "/projects": "projects",
  "/asset-center": "assetCenter",
  "/skills": "skills",
  "/workflows": "workflows",
};
export function SearchButton({ onClick, surface = "topbar", dataActionUiId }) {
  const { t: t2 } = useTranslation();
  const { app } = usePlatform();
  const shortcut = resolveShortcutDisplay("CommandOrControl+K", app.os);
  const sidebar = surface === "sidebar";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${t2("topbar.search")} ${shortcut.text}`}
            data-action-ui-id={dataActionUiId}
            onClick={onClick}
            className={cn(
              "no-drag relative z-50 flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
              sidebar
                ? "icon-muted-control text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                : "icon-topbar-control mx-0.5 my-1 text-[var(--topbar-icon-fg)] hover:bg-[var(--topbar-tab-inactive-bg-hover)] hover:text-[var(--topbar-icon-fg-hover)]",
            )}
          />
        }
      >
        <MonochromeIcon tone="control">
          <Search size={sidebar ? 16 : 15} strokeWidth={sidebar ? 1.5 : 1.75} />
        </MonochromeIcon>
      </TooltipTrigger>
      <TooltipContent side={sidebar ? "right" : "bottom"}>
        {t2("topbar.search")}
        <ShortcutHint
          accelerator="CommandOrControl+K"
          os={app.os}
          variant="plain"
          className="ml-1.5 text-inherit opacity-50"
        />
      </TooltipContent>
    </Tooltip>
  );
}
export function pickLocale(lang) {
  return lang.startsWith("zh") ? "zh" : "en";
}
export const HOME_SIDEBAR_MIN_WIDTH = 220;
export const HOME_SIDEBAR_MAX_WIDTH = 360;
export const HOME_SIDEBAR_ICON_AXIS = 32;
export const HOME_NAV_ICON_SIZE = 18;
export const PROJECT_PREVIEW_ITEM_LIMIT = 6;
export const HOME_NEW_TASK_PLUS_SIZE = 16;
export const HOME_RECENT_SCROLL_BOTTOM_SAFE_AREA_CLASS = "pb-[54px]";
export const HOME_NAV_ICON_SLOT_CLASS =
  "flex size-6 shrink-0 items-center justify-center";
export const HOME_NAV_BUTTON_CLASS =
  "group flex h-[34px] w-full items-center text-[14px] leading-[14px] transition-colors duration-100 cursor-pointer";
export const HOME_NAV_PILL_CLASS =
  "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 after:pointer-events-none after:absolute after:inset-y-0 after:-z-10 after:rounded-md";
export const HOME_RAIL_PILL_CLASS = "home-sidebar-rail-pill";
export const HOME_NAV_HOVER_CLASS =
  "group-hover:after:bg-[var(--home-sidebar-nav-hover)]";
export const HOME_NAV_ACTIVE_CLASS =
  "after:bg-[var(--home-sidebar-nav-active)]";
export const HOME_NAV_INACTIVE_TEXT_CLASS =
  "text-[var(--home-sidebar-primary-text)] hover:text-foreground";
export function resolveRecentProjectsGroupMode(value) {
  return value === "none" ? "none" : "project";
}
export function recentProjectDropPosition(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}
export function buildChangelogRows(locale) {
  return locale.items.map((item) => ({
    badge: locale.badge,
    version: item.version,
    date: item.date,
    subtitle: item.subtitle,
    changelog: item.changelog,
    featured: item.featured,
    id: item.version,
  }));
}
