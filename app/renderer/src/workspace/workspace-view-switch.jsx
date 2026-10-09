// workspace-view-switch.jsx
import {
  getRuntimeConfig,
  Globe,
  PanelsTopLeft,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useHasBlockingModal } from "../infra/schedule.js";
import { useCoachMark } from "./use-coach-mark.js";
import { CoachMarkPopup } from "./coach-mark-popup.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";

function BrowserEntryCoachMark({ anchorRef, enabled }) {
  const { t: t2 } = useTranslation();
  const blocked = useHasBlockingModal();
  const coach = useCoachMark(
    "canvas-browser-entry-intro",
    enabled && !blocked,
    {
      autoClose: false,
      persistOnOpen: true,
    },
  );
  return (
    <CoachMarkPopup
      open={enabled && !blocked && coach.isOpen}
      anchorRef={anchorRef}
      title={t2("workspace.browser.guide.entryTitle", "浏览网页，收集灵感")}
      description={t2(
        "workspace.browser.guide.entryDescription",
        "点击「浏览器」查找素材，添加到画布或对话；也可圈选网页内容并批注，让 Agent 按你的要求操作网页。",
      )}
      onDismiss={coach.dismiss}
      side="bottom"
      align="start"
      showClose={true}
      actionUiId="canvas.browser-entry-guide"
    />
  );
}

export function WorkspaceViewSwitch({ target, onClick, label }) {
  const { t: t2 } = useTranslation();
  const browserAnchor = reactExports.useRef(null);
  return (
    <div
      data-window-drag-region="no-drag"
      className="no-drag relative inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-0.5 shadow-xs [border-width:var(--divider-width)]"
    >
      <BrowserEntryCoachMark
        anchorRef={browserAnchor}
        enabled={target === "browser"}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-7 rounded-md bg-[var(--canvas-controls-active)] transition-transform duration-200 ease-out motion-reduce:transition-none ${target === "canvas" ? "translate-x-20" : "translate-x-0"}`}
      />
      {["canvas", "browser"].map((mode2) => {
        const active2 = mode2 !== target;
        const title =
          mode2 === "canvas"
            ? (label ?? t2("workspace.browser.canvas"))
            : t2("workspace.browser");
        return (
          <button
            key={mode2}
            ref={mode2 === "browser" ? browserAnchor : void 0}
            type="button"
            onClick={active2 ? void 0 : onClick}
            aria-pressed={active2}
            aria-label={title}
            title={active2 ? title : void 0}
            data-action-ui-id={`workspace.switch-to-${mode2}`}
            className={`relative inline-flex h-full min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-md px-1 text-xs transition-[width,color] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active2 ? "w-7 font-medium text-[var(--canvas-controls-text)]" : "w-[78px] font-normal text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
          >
            <Icon icon={mode2 === "canvas" ? PanelsTopLeft : Globe} size="sm" />
            <span
              aria-hidden="true"
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out motion-reduce:transition-none ${active2 ? "ml-0 max-w-0 opacity-0" : "ml-1 max-w-16 opacity-100"}`}
            >
              {title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const DEFAULT_URL = "";

export const SEARCH_HISTORY_KEY = "hilo:browser-search-history";

export const SEARCH_HISTORY_LIMIT = 7;

export const BOOKMARKS_STORAGE_KEY = "hilo:browser-bookmarks:v1";

const MAX_STORED_FAVICON_DATA_URL_LENGTH = 9e4;

export function isSafeBookmarkFaviconUrl(value) {
  if (typeof value !== "string") return false;
  if (
    value.length <= MAX_STORED_FAVICON_DATA_URL_LENGTH &&
    /^data:image\/(?:png|jpe?g|gif|webp|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/]+={0,2}$/iu.test(
      value,
    )
  )
    return true;
  if (value.length > 2048) return false;
  try {
    const url2 = new URL(value);
    return url2.protocol === "https:" || url2.protocol === "http:";
  } catch {
    return false;
  }
}

export function readBookmarks() {
  try {
    const value = JSON.parse(
      localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.url === "string" &&
        Array.isArray(item.folders) &&
        (item.faviconDataUrl === void 0 ||
          isSafeBookmarkFaviconUrl(item.faviconDataUrl)),
    );
  } catch {
    return [];
  }
}

export function readSearchHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter((item) => typeof item === "string")
          .slice(0, SEARCH_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function isUrl(value) {
  return /^(?:https?:\/\/|file:\/\/|about:|mailto:)/i.test(value.trim());
}

export function destinationForInput(value) {
  const input = value.trim();
  if (isUrl(input))
    return {
      destination: input,
      search: false,
    };
  const engine =
    getRuntimeConfig().region === "domestic"
      ? "www.bing.com"
      : "www.google.com";
  return {
    destination: `https://${engine}/search?q=${encodeURIComponent(input)}`,
    search: true,
  };
}

export function annotationSiteName(url2, fallback = "当前网页") {
  try {
    const hostname = new URL(url2).hostname;
    return hostname || fallback;
  } catch {
    return fallback;
  }
}

export const BROWSER_MENU_WIDTH = 790;

export const BROWSER_MENU_HEIGHT = 520;

export const BROWSER_MENU_MARGIN = 8;

export const BROWSER_MENU_OFFSET = 4;

export const DEVICE_CANVASES = {
  "iphone-xr": {
    width: 414,
    height: 896,
  },
  mobile: {
    width: 375,
    height: 812,
  },
  tablet: {
    width: 768,
    height: 1024,
  },
};
