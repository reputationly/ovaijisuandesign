// shortcut-hint.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2, MENU_ITEM_LAYOUT } from "../infra/dialog-content.jsx";
import { resolveShortcutDisplay } from "./other-modifiers.js";
import { getPlatform } from "../infra/web-storage.js";
import {
  ChevronRight$1,
  makeLogger,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSubmenuTrigger,
  TabsIndicator,
  TabsList$1,
  TabsPanel,
  TabsRoot,
  TabsTab,
} from "../vendor.js";
import { WalletSource } from "../generation/to-workspace-browser-url.js";
import {
  HUB_WEB_INVITE_DOMAINS,
  TUTORIAL_URL$2,
} from "../vendor-inline/vscode-base/graph.jsx";

function getShortcutTokenKind(label) {
  const normalized = label.trim().toLowerCase();
  if (label === "⌘" || normalized === "cmd" || normalized === "command")
    return "command";
  if (
    label === "⌃" ||
    normalized === "ctrl" ||
    normalized === "control" ||
    normalized === "win"
  ) {
    return "control";
  }
  if (label === "⌥" || normalized === "alt" || normalized === "option")
    return "option";
  if (label === "⇧" || normalized === "shift") return "shift";
  return "key";
}

const DESIGN_DOWNLOAD_URL = {
  domestic: "https://design.minimax.cn/",
  overseas: "https://design.minimax.io/",
};

export function getDesignDownloadUrl(region) {
  return DESIGN_DOWNLOAD_URL[region];
}

const MEDIA_USAGE_GUIDELINES_DOMAINS = {
  test: {
    domestic: "https://hub-pre.xaminim.com",
    overseas: "https://hub-test.xaminim.com",
  },
  prod: {
    domestic: "https://design.minimax.cn",
    overseas: "https://design.minimax.io",
  },
};

const MEDIA_USAGE_GUIDELINES_PATHS = {
  domestic: "/doc/zh/reference-agreement.html",
  overseas: "/doc/en/reference-agreement.html",
};

export function getMediaUsageGuidelinesUrl(region, channel) {
  const environment = channel === "prod" ? "prod" : "test";
  return new URL(
    MEDIA_USAGE_GUIDELINES_PATHS[region],
    MEDIA_USAGE_GUIDELINES_DOMAINS[environment][region],
  ).href;
}

const TEAM_INVOICE_PATH = "/media-plan/console/invoice";

export function getTeamInvoiceUrl(region, channel, groupId2) {
  const environment = channel === "prod" ? "prod" : "test";
  const url2 = new URL(
    TEAM_INVOICE_PATH,
    HUB_WEB_INVITE_DOMAINS[environment][region],
  );
  url2.searchParams.set("group_id", groupId2);
  url2.searchParams.set("tab", "team");
  return url2.href;
}

const USER_PROTOCOL_PATHS = {
  userAgreement: "/media-plan/protocol/user-agreement",
  privacyPolicy: "/media-plan/protocol/privacy-policy",
  paidAgreement: "/media-plan/protocol/paid-agreement",
  autoRenewal: "/media-plan/protocol/auto-renewal",
  pointsRules: "/media-plan/protocol/points-rules",
};

export const USER_PROTOCOL_KEYS_BY_REGION = {
  domestic: [
    "userAgreement",
    "privacyPolicy",
    "paidAgreement",
    "autoRenewal",
    "pointsRules",
  ],
  overseas: ["pointsRules"],
};

export function getUserProtocolUrl(region, channel, key2) {
  const environment = channel === "prod" ? "prod" : "test";
  return new URL(
    USER_PROTOCOL_PATHS[key2],
    HUB_WEB_INVITE_DOMAINS[environment][region],
  ).href;
}

const HAILUO_CREDITS_RULES_URL = {
  domestic:
    "https://ycn2jv5fww3x.feishu.cn/wiki/JY7PwkqvtiKl9dk1P9DcW9FWnrb?sheet=1c8YYE",
  overseas:
    "https://ycn2jv5fww3x.feishu.cn/wiki/L50lwOlaoi1Sdmku6I5cbdg7nfg?sheet=uUfLWr",
};

export function getHailuoCreditsRulesUrl(region) {
  return HAILUO_CREDITS_RULES_URL[region];
}

export function getTutorialUrl(region) {
  return TUTORIAL_URL$2[region];
}

export function appendOpenPlatformTrackingParams(
  url2,
  walletSource,
  subscriptionContext = {
    accountType: "PERSONAL",
  },
) {
  if (!url2) return url2;
  if (walletSource !== WalletSource.WALLET_SOURCE_OP) return url2;
  try {
    const u4 = new URL(url2);
    if (u4.pathname.startsWith("/media-plan/subscribe")) {
      const groupId2 =
        subscriptionContext.groupId ?? u4.searchParams.get("group_id");
      for (const key2 of [
        "tab",
        "group_id",
        "business",
        "device_platform",
        "auth",
      ]) {
        u4.searchParams.delete(key2);
      }
      if (subscriptionContext.accountType === "TEAM") {
        u4.searchParams.set("tab", "team");
      }
      if (groupId2) {
        u4.searchParams.set("group_id", groupId2);
      }
      u4.searchParams.set("business", "HailuoVideo");
      u4.searchParams.set("device_platform", "desktop");
      u4.searchParams.set("auth", "1");
    } else {
      u4.searchParams.set("business", "HailuoVideo");
      u4.searchParams.set("device_platform", "desktop");
    }
    return u4.toString();
  } catch {
    return url2;
  }
}

export const BROWSER_ERROR_ILLUSTRATION_URL =
  "https://filecdn.minimax.chat/public/minimax-hub/browser-error/20260909/web-error-octopus-transparent-v2.png";

export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <hr
      data-slot="dropdown-menu-separator"
      className={cn$2("-mx-1 my-1 h-px border-none bg-border/50", className)}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  children: children2,
  ...props
}) {
  return (
    <MenuSubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn$2(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area relative flex cursor-default items-center rounded-sm whitespace-nowrap outline-hidden select-none hover:bg-popup-item-hover hover:text-foreground focus:bg-popup-item-hover focus:text-foreground data-[popup-open]:bg-popup-item-active data-[popup-open]:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-colors duration-[80ms]",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {children2}
      </span>
      <ChevronRight$1 className="text-current opacity-70" />
    </MenuSubmenuTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  align = "start",
  alignOffset = -4,
  side = "right",
  sideOffset = 4,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="dropdown-menu-sub-content"
          className={cn$2(
            "elevated-surface-border z-50 min-w-32 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            motion !== "none" && "dp-motion-quick-zoom",
            className,
          )}
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}

export const creditLog = makeLogger("credit");

export const comfyuiLog = makeLogger("comfyui");

export function Kbd({ className, ...props }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn$2(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export function KbdGroup({ className, ...props }) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn$2("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export function Tabs({ className, ...props }) {
  return (
    <TabsRoot
      data-slot="tabs"
      className={cn$2("flex flex-col", className)}
      {...props}
    />
  );
}

export function TabsList({
  className,
  children: children2,
  variant = "default",
  ...props
}) {
  return (
    <TabsList$1
      data-slot="tabs-list"
      data-variant={variant}
      className={cn$2(
        variant === "underline"
          ? "scrollbar-none relative inline-flex w-max max-w-full items-center justify-start gap-6 overflow-x-auto rounded-none bg-transparent p-0 text-foreground/50"
          : "inline-flex items-center gap-1 rounded-sm bg-tab-list-bg p-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      {variant === "track" && (
        <TabsIndicator aria-hidden="true" className="tabs-track-indicator" />
      )}
      {variant === "underline" && (
        <TabsIndicator
          aria-hidden="true"
          className="tabs-underline-indicator bottom-0"
        />
      )}
      {children2}
    </TabsList$1>
  );
}

export function TabsTrigger({ className, variant = "default", ...props }) {
  return (
    <TabsTab
      data-slot="tabs-trigger"
      className={cn$2(
        variant === "underline"
          ? "relative inline-flex h-10 cursor-pointer items-center justify-center rounded-none px-2 py-0 text-[15px] leading-5 font-medium whitespace-nowrap text-foreground/50 transition-colors duration-150 outline-none select-none hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none"
          : "inline-flex cursor-pointer items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-tab-active-bg data-[active]:text-foreground data-[active]:shadow-tab-active",
        className,
      )}
      data-variant={variant}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return (
    <TabsPanel
      data-slot="tabs-content"
      className={cn$2("flex-1 outline-none", className)}
      {...props}
    />
  );
}

let _cachedIsMac;

export function isMacPlatform() {
  if (_cachedIsMac !== void 0) return _cachedIsMac;
  const uaData = navigator.userAgentData;
  if (uaData?.platform) {
    _cachedIsMac = uaData.platform === "macOS";
  } else {
    _cachedIsMac = /mac/i.test(navigator.platform);
  }
  return _cachedIsMac;
}

export function ShortcutKeycap({ token: token2, className, ...props }) {
  const kind = getShortcutTokenKind(token2);
  return (
    <Kbd
      className={cn$2(
        className,
        kind === "command" && "text-[16px] leading-none font-normal",
        kind === "shift" && "text-[15px] leading-none font-medium",
        (kind === "control" || kind === "option") &&
          "text-[14px] leading-none font-normal",
        kind === "key" && "text-[12px] leading-none font-medium",
      )}
      {...props}
    >
      {token2}
    </Kbd>
  );
}

function tokenClassName(kind) {
  if (kind === "command") return "text-[16px] leading-none font-normal";
  if (kind === "shift") return "text-[15px] leading-none font-medium";
  if (kind === "control" || kind === "option")
    return "text-[14px] leading-none font-normal";
  return "text-[12px] leading-none font-medium";
}

export function ShortcutHint({
  accelerator,
  otherAccelerator,
  variant = "keycap",
  os: os2,
  className,
  ...props
}) {
  const resolvedOs = os2 ?? getPlatform().app.os;
  const display = resolveShortcutDisplay(
    resolvedOs === "darwin" ? accelerator : (otherAccelerator ?? accelerator),
    resolvedOs,
  );
  const tokenCounts = new Map();
  const tokenItems = display.tokens.map((token2) => {
    const tokenKey = `${token2.kind}-${token2.label}`;
    const occurrence = tokenCounts.get(tokenKey) ?? 0;
    tokenCounts.set(tokenKey, occurrence + 1);
    return {
      id: `${tokenKey}-${occurrence}`,
      token: token2,
    };
  });
  return (
    <Kbd
      aria-label={display.ariaLabel}
      className={cn$2(
        "gap-0.5 font-sans tracking-normal",
        variant === "keycap"
          ? "h-6 min-w-6 rounded-md bg-muted px-2 text-muted-foreground"
          : "h-auto min-w-0 rounded-none bg-transparent px-0 text-muted-foreground",
        className,
      )}
      {...props}
    >
      {tokenItems.map(({ id: id2, token: token2 }, tokenIndex) => (
        <span
          key={id2}
          className="inline-flex items-center"
          data-shortcut-token-kind={token2.kind}
        >
          {!display.isMac && tokenIndex > 0 && (
            <span
              aria-hidden="true"
              className="mr-0.5 text-[10px] font-normal opacity-60"
            >
              +
            </span>
          )}
          <span className={tokenClassName(token2.kind)}>{token2.label}</span>
        </span>
      ))}
    </Kbd>
  );
}

export const WORKSPACE_DISPLAY_MODE_SHORTCUT = {
  mac: "CommandOrControl+\\",
  other: "Ctrl+\\",
};

export const SHORTCUT_DEFS = {
  newChat: {
    labelKey: "settings.shortcutNewChat",
    mac: "CommandOrControl+N",
    other: "Ctrl+N",
    macDisplay: "⌘N",
    otherDisplay: "Ctrl+N",
  },
  screenshot: {
    labelKey: "settings.shortcutScreenshot",
    mac: "Ctrl+Shift+S",
    other: "Ctrl+Shift+S",
    macDisplay: "⌃⇧S",
    otherDisplay: "Ctrl+Shift+S",
  },
  openSettings: {
    labelKey: "settings.shortcutSettings",
    mac: "CommandOrControl+,",
    other: "Ctrl+,",
    macDisplay: "⌘,",
    otherDisplay: "Ctrl+,",
  },
  newWorkspace: {
    labelKey: "settings.shortcutNewWorkspace",
    mac: "CommandOrControl+Shift+N",
    other: "Ctrl+Shift+N",
    macDisplay: "⌘⇧N",
    otherDisplay: "Ctrl+Shift+N",
  },
  closeTab: {
    labelKey: "settings.shortcutCloseTab",
    mac: "CommandOrControl+W",
    other: "Ctrl+W",
    macDisplay: "⌘W",
    otherDisplay: "Ctrl+W",
  },
};
