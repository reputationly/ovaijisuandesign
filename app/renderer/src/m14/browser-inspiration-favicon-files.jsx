// browser-inspiration-favicon-files.jsx
import {
  useTranslation,
  reactExports,
  Icon,
  ChevronDown,
  X$7,
  TRACK_EVENTS,
  Clapperboard,
  Palette,
  Megaphone,
  Building2,
  Shuffle,
  Search,
  useTheme,
  CDN_BROWSER_START_ICON,
} from "../vendor.js";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { EnterIcon } from "../m08/browser-inspiration-urls.jsx";
import { setBuiltinBrowserChatContext } from "../m11/use-workspace-canvas-persistence.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { CDN_BROWSER_INSPIRATION_FALLBACK, cdnAssetFile } from "../m10/new-workspace-dialog.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  browserInspirationSites,
  inspirationRegionForLanguage,
  pickInspirationSites,
} from "./browser-inspiration-sites.jsx";
const categorySiteIds = {
  domestic: {
    filmMotion: [
      "xinpianchang.com",
      "bilibili.com",
      "douyin.com",
      "movie.douban.com",
      "tvcbook.com",
      "campaign.nowness.cn",
      "cinehello.com",
      "manamana.net",
      "promonews.tv",
      "shotdeck.com",
      "site.frameset.app",
    ],
    visualDesign: [
      "xiaohongshu.com",
      "zcool.com.cn",
      "huaban.com",
      "cnu.cc",
      "are.na",
      "design360.cn",
      "hiiibrand.com",
      "gtn9.com",
      "ui.cn",
      "uisdc.com",
      "hao.uisdc.com",
    ],
    brandCreative: [
      "weibo.com",
      "d-arts.cn",
      "digitaling.com",
      "adquan.com",
      "meihua.info",
      "topys.cn",
      "itsnicethat.com",
      "underconsideration.com",
      "thetype.com",
    ],
    architectureProduct: [
      "dezeen.com",
      "designboom.com",
      "archdaily.cn",
      "gooood.cn",
      "designverse.com.cn",
      "adstyle.com.cn",
      "shejipi.com",
      "puxiang.com",
    ],
  },
  overseas: {
    filmMotion: [
      "film-grab.com",
      "mubi.com",
      "shot.cafe",
      "flim.ai",
      "eyecannndy.com",
      "shotonwhat.com",
      "theasc.com",
      "directorslibrary.com",
      "shots.net",
      "lbbonline.com",
      "directorsnotes.com",
      "nowness.com",
      "artofthetitle.com",
      "motionographer.com",
      "stashmedia.tv",
    ],
    visualDesign: [
      "behance.net",
      "artstation.com",
      "pinterest.com",
      "awwwards.com",
      "cosmos.so",
      "creativeboom.com",
      "abduzeedo.com",
      "siteinspire.com",
      "savee.it",
      "designspiration.com",
      "thisiscolossal.com",
      "booooooom.com",
    ],
    brandCreative: [
      "the-brandidentity.com",
      "bpando.org",
      "thedieline.com",
      "commarts.com",
      "dandad.org",
      "fontsinuse.com",
    ],
    architectureProduct: [
      "archdaily.com",
      "wallpaper.com",
      "design-milk.com",
      "core77.com",
      "mobbin.com",
      "godly.website",
      "land-book.com",
    ],
  },
};
const categoryOrder = ["filmMotion", "visualDesign", "brandCreative", "architectureProduct"];
function getBrowserInspirationCategories(region) {
  const sitesById = new Map(browserInspirationSites[region].map((site) => [site.id, site]));
  return categoryOrder.map((id2) => ({
    id: id2,
    sites: categorySiteIds[region][id2].flatMap((siteId) => {
      const site = sitesById.get(siteId);
      return site ? [site] : [];
    }),
  }));
}
function pickCategorizedInspirationSites(categories, previous2 = []) {
  const previousById = new Map(previous2.map((category) => [category.id, category.sites]));
  return categories.map((category) => ({
    id: category.id,
    sites: pickInspirationSites(category.sites, previousById.get(category.id)),
  }));
}
function BrowserInspirationFavicon({ src }) {
  return <FaviconImage key={src} src={src} />;
}
function FaviconImage({ src }) {
  const [status, setStatus] = reactExports.useState("loading");
  return (
    <span
      className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--browser-inspiration-icon-bg)]"
      aria-hidden="true"
    >
      {status !== "loaded" && (
        <img
          src={CDN_BROWSER_INSPIRATION_FALLBACK}
          alt=""
          className="size-5 object-contain"
          draggable={false}
        />
      )}
      {src && status !== "failed" && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
          className={`absolute size-5 object-contain ${status === "loaded" ? "" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
const BROWSER_INSPIRATION_ICON_PATH = "browser-inspiration-icons/20260907";
const browserInspirationFaviconFiles = {
  "abduzeedo.com": "abduzeedo.com.ico",
  "adquan.com": "adquan.com.ico",
  "adstyle.com.cn": "adstyle.com.cn.ico",
  "archdaily.cn": "archdaily.cn.png",
  "archdaily.com": "archdaily.com.png",
  "are.na": "are.na.ico",
  "artofthetitle.com": "artofthetitle.com.png",
  "artstation.com": "artstation.com.ico",
  "awwwards.com": "awwwards.com.ico",
  "bilibili.com": "bilibili.com.ico",
  "booooooom.com": "booooooom.com.ico",
  "bpando.org": "bpando.org.png",
  "campaign.nowness.cn": "campaign.nowness.cn.ico",
  "cinehello.com": "cinehello.com.ico",
  "cnu.cc": "cnu.cc.ico",
  "commarts.com": "commarts.com.ico",
  "core77.com": "core77.com.ico",
  "cosmos.so": "cosmos.so.png",
  "creativeboom.com": "creativeboom.com.ico",
  "d-arts.cn": "d-arts.cn.ico",
  "dandad.org": "dandad.org.ico",
  "design-milk.com": "design-milk.com.ico",
  "design360.cn": "design360.cn.png",
  "designboom.com": "designboom.com.ico",
  "designspiration.com": "designspiration.com.ico",
  "designverse.com.cn": "designverse.com.cn.png",
  "dezeen.com": "dezeen.com.png",
  "digitaling.com": "digitaling.com.ico",
  "directorslibrary.com": "directorslibrary.com.png",
  "directorsnotes.com": "directorsnotes.com.png",
  "douyin.com": "douyin.com.ico",
  "film-grab.com": "film-grab.com.ico",
  "flim.ai": "flim.ai.png",
  "fontsinuse.com": "fontsinuse.com.ico",
  "gooood.cn": "gooood.cn.ico",
  "gtn9.com": "gtn9.com.png",
  "hao.uisdc.com": "hao.uisdc.com.ico",
  "hiiibrand.com": "hiiibrand.com.png",
  "itsnicethat.com": "itsnicethat.com.ico",
  "land-book.com": "land-book.com.ico",
  "lbbonline.com": "lbbonline.com.ico",
  "meihua.info": "meihua.info.ico",
  "mobbin.com": "mobbin.com.ico",
  "motionographer.com": "motionographer.com.png",
  "movie.douban.com": "movie.douban.com.ico",
  "mubi.com": "mubi.com.ico",
  "nowness.com": "nowness.com.ico",
  "pinterest.com": "pinterest.com.png",
  "promonews.tv": "promonews.tv.png",
  "puxiang.com": "puxiang.com.ico",
  "savee.it": "savee.it.ico",
  "shejipi.com": "shejipi.com.ico",
  "shot.cafe": "shot.cafe.ico",
  "shotonwhat.com": "shotonwhat.com.ico",
  "site.frameset.app": "site.frameset.app.png",
  "stashmedia.tv": "stashmedia.tv.ico",
  "the-brandidentity.com": "the-brandidentity.com.ico",
  "theasc.com": "theasc.com.png",
  "thedieline.com": "thedieline.com.ico",
  "thetype.com": "thetype.com.ico",
  "thisiscolossal.com": "thisiscolossal.com.ico",
  "topys.cn": "topys.cn.ico",
  "uisdc.com": "uisdc.com.ico",
  "underconsideration.com": "underconsideration.com.png",
  "wallpaper.com": "wallpaper.com.png",
  "weibo.com": "weibo.com.ico",
  "xiaohongshu.com": "xiaohongshu.com.ico",
  "xinpianchang.com": "xinpianchang.com.ico",
};
const recoveredBrowserInspirationFaviconFiles = {
  "behance.net": "behance.net.png",
  "eyecannndy.com": "eyecannndy.com.png",
  "godly.website": "godly.website.png",
  "huaban.com": "huaban.com.png",
  "manamana.net": "manamana.net.jpg",
  "shotdeck.com": "shotdeck.com.png",
  "shots.net": "shots.net.png",
  "siteinspire.com": "siteinspire.com.png",
  "tvcbook.com": "tvcbook.com.png",
  "ui.cn": "ui.cn.png",
  "zcool.com.cn": "zcool.com.cn.png",
};
const browserInspirationFavicons = Object.fromEntries([
  ...Object.entries(browserInspirationFaviconFiles).map(([siteId, fileName]) => [
    siteId,
    cdnAssetFile(`${BROWSER_INSPIRATION_ICON_PATH}/${fileName}`),
  ]),
  ...Object.entries(recoveredBrowserInspirationFaviconFiles).map(([siteId, fileName]) => [
    siteId,
    cdnAssetFile(`browser-inspiration-icons/20260923/${fileName}`),
  ]),
]);
function BrowserInspirationTrigger({ open, panelId, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const openLabel = t2("workspace.browser.inspiration.open", "开启今日灵感");
  const closeLabel = t2("workspace.browser.inspiration.close", "点击收起");
  return (
    <Button$1
      variant="ghost"
      size="icon-xs"
      className="bg-transparent! text-muted-foreground hover:text-muted-foreground aria-expanded:text-muted-foreground active:not-aria-[haspopup]:translate-y-0"
      data-action-ui-id="browser-inspiration-toggle"
      aria-label={open ? closeLabel : openLabel}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => onOpenChange(!open)}
    >
      <span className="flex size-4 items-center justify-center rounded bg-foreground/[0.035]">
        <Icon
          icon={ChevronDown}
          size="sm"
          className={`size-3 transition-transform duration-200 motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}
        />
      </span>
    </Button$1>
  );
}
const categoryIcons = {
  filmMotion: Clapperboard,
  visualDesign: Palette,
  brandCreative: Megaphone,
  architectureProduct: Building2,
};
export function BrowserInspiration({ onNavigate }) {
  const { i18n } = useTranslation();
  const language2 = i18n.resolvedLanguage ?? i18n.language;
  const region = inspirationRegionForLanguage(language2);
  const [open, setOpen] = reactExports.useState(true);
  const panelId = reactExports.useId();
  return (
    <InspirationExperience
      key={region}
      region={region}
      open={open}
      panelId={panelId}
      onOpenChange={setOpen}
      onNavigate={onNavigate}
    />
  );
}
function InspirationExperience({ region, open, panelId, onOpenChange, onNavigate }) {
  const { t: t2 } = useTranslation();
  const categories = getBrowserInspirationCategories(region);
  const [visibleCategories, setVisibleCategories] = reactExports.useState(() =>
    pickCategorizedInspirationSites(categories),
  );
  const viewTrackedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackEvent(TRACK_EVENTS.BROWSER_INSPIRATION_ACTION, {
      action: "view",
      region,
    });
  }, [region]);
  const handleOpenChange = (nextOpen) => {
    if (nextOpen === open) return;
    onOpenChange(nextOpen);
    trackEvent(TRACK_EVENTS.BROWSER_INSPIRATION_ACTION, {
      action: nextOpen ? "open" : "close",
      region,
    });
  };
  const handleExplore = () => {
    setVisibleCategories((currentCategories) =>
      currentCategories.map((category) => {
        const categoryPool = categories.find((candidate) => candidate.id === category.id);
        if (!categoryPool) return category;
        return {
          ...category,
          sites: pickInspirationSites(categoryPool.sites, category.sites),
        };
      }),
    );
    trackEvent(TRACK_EVENTS.BROWSER_INSPIRATION_ACTION, {
      action: "shuffle",
      region,
    });
  };
  const canExplore = visibleCategories.some((category) => {
    const categoryPool = categories.find((candidate) => candidate.id === category.id);
    return Boolean(categoryPool && categoryPool.sites.length > category.sites.length);
  });
  return (
    <div className="mt-4 w-full">
      <div className="mb-3 flex h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="text-sm font-medium">
            {t2("workspace.browser.inspiration.title", "灵感盲盒")}
          </h2>
          <BrowserInspirationTrigger
            open={open}
            panelId={panelId}
            onOpenChange={handleOpenChange}
          />
        </div>
        {open && (
          <Button$1
            variant="ghost"
            size="sm"
            className="min-w-[77px] gap-1 bg-transparent text-xs font-normal text-muted-foreground hover:bg-foreground/5! hover:text-muted-foreground [border-width:var(--divider-width)] active:not-aria-[haspopup]:translate-y-0"
            data-action-ui-id="browser-inspiration-explore"
            disabled={!canExplore}
            onClick={handleExplore}
          >
            <Icon icon={Shuffle} size="sm" className="size-[13px]" />
            {t2("workspace.browser.inspiration.shuffle", "换一换")}
          </Button$1>
        )}
      </div>
      <div
        className={[
          "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "pointer-events-none grid-rows-[0fr]",
        ].join(" ")}
        data-action-ui-id="browser-inspiration-slot"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={[
              "transition-[transform,translate,filter,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              open ? "translate-y-0 opacity-100 blur-0" : "-translate-y-3 opacity-0 blur-[6px]",
            ].join(" ")}
          >
            <InspirationCategories
              region={region}
              panelId={panelId}
              categories={visibleCategories}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function InspirationCategories({ region, panelId, categories, onNavigate }) {
  const { t: t2 } = useTranslation();
  return (
    <section
      id={panelId}
      aria-label={t2("workspace.browser.inspiration.title", "灵感盲盒")}
      data-action-ui-id="browser-inspiration"
      data-inspiration-region={region}
      className="w-full"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {categories.map((category) => (
          <InspirationCategory
            key={category.id}
            category={category}
            region={region}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
function InspirationCategory({ category, region, onNavigate }) {
  const { t: t2 } = useTranslation();
  const CategoryIcon = categoryIcons[category.id];
  return (
    <article
      data-action-ui-id="browser-inspiration-category"
      data-inspiration-category={category.id}
      className="min-w-0 rounded-xl bg-foreground/[0.035] p-3"
    >
      <div className="flex min-w-0 items-center gap-1 px-2 py-1 text-muted-foreground/70">
        <Icon icon={CategoryIcon} size="xs" strokeWidth={1.5} className="shrink-0" />
        <h3 className="truncate font-heading text-[11px] font-normal uppercase leading-4 tracking-wide">
          {t2(categoryTranslationKey(category.id), categoryFallback(category.id))}
        </h3>
      </div>
      <div className="mt-1 space-y-0.5">
        {category.sites.map((site) => (
          <Button$1
            key={site.id}
            variant="ghost"
            data-action-ui-id="browser-inspiration-site"
            data-site-id={site.id}
            onClick={() => {
              trackEvent(TRACK_EVENTS.BROWSER_INSPIRATION_ACTION, {
                action: "open_site",
                region,
                category_id: category.id,
                site_id: site.id,
              });
              onNavigate(site.url);
            }}
            className="h-10 w-full min-w-0 justify-start gap-2 rounded-lg border-0 px-2 text-left font-normal text-foreground/70 shadow-none hover:bg-foreground/[0.055] hover:text-foreground"
            title={`${site.title} — ${site.url}`}
          >
            <BrowserInspirationFavicon src={browserInspirationFavicons[site.id]} />
            <span className="truncate text-sm font-normal">{site.title}</span>
          </Button$1>
        ))}
      </div>
    </article>
  );
}
function categoryTranslationKey(categoryId) {
  return `workspace.browser.inspiration.category.${categoryId}`;
}
function categoryFallback(categoryId) {
  const fallbacks = {
    filmMotion: "影视动态",
    visualDesign: "视觉设计",
    brandCreative: "品牌创意",
    architectureProduct: "建筑与产品",
  };
  return fallbacks[categoryId];
}
const errorMessages = {
  cancelled: (t2) => t2("workspace.browser.importError.cancelled"),
  chrome_profile_unavailable: (t2) =>
    t2("workspace.browser.importError.chrome_profile_unavailable"),
  bookmark_file_unavailable: (t2) => t2("workspace.browser.importError.bookmark_file_unavailable"),
  bookmark_file_invalid: (t2) => t2("workspace.browser.importError.bookmark_file_invalid"),
  bookmark_file_too_large: (t2) => t2("workspace.browser.importError.bookmark_file_too_large"),
  cookie_database_unavailable: (t2) =>
    t2("workspace.browser.importError.cookie_database_unavailable"),
  cookie_database_busy: (t2) => t2("workspace.browser.importError.cookie_database_busy"),
  cookie_database_access_denied: (t2) =>
    t2("workspace.browser.importError.cookie_database_access_denied"),
  cookie_database_not_found: (t2) => t2("workspace.browser.importError.cookie_database_not_found"),
  cookie_database_invalid: (t2) => t2("workspace.browser.importError.cookie_database_invalid"),
  decryption_failed: (t2) => t2("workspace.browser.importError.decryption_failed"),
  import_in_progress: (t2) => t2("workspace.browser.importError.import_in_progress"),
  invalid_current_site: (t2) => t2("workspace.browser.importError.invalid_current_site"),
  invalid_request: (t2) => t2("workspace.browser.importError.invalid_request"),
  keychain_access_denied: (t2) => t2("workspace.browser.importError.keychain_access_denied"),
  keychain_access_timeout: (t2) => t2("workspace.browser.importError.keychain_access_timeout"),
  keychain_item_not_found: (t2) => t2("workspace.browser.importError.keychain_item_not_found"),
  profile_not_found: (t2) => t2("workspace.browser.importError.profile_not_found"),
  unsupported_platform: (t2) => t2("workspace.browser.importError.unsupported_platform"),
  untrusted_sender: (t2) => t2("workspace.browser.importError.untrusted_sender"),
  unexpected_error: (t2) => t2("workspace.browser.importError.unexpected_error"),
};
export function browserProfileImportErrorMessage(t2, code2) {
  const knownCode = code2 && Object.hasOwn(errorMessages, code2) ? code2 : "unexpected_error";
  return errorMessages[knownCode](t2);
}
export function browserBookmarkImportNotice(t2, result, addedCount) {
  const count2 = addedCount;
  if (result.limitReached) {
    return {
      warning: true,
      message: t2("workspace.browser.syncBookmarksLimited", {
        defaultValue: "已导入 {{count}} 个新书签，已达到导入上限，其余书签未导入",
        count: count2,
      }),
    };
  }
  if (result.skippedCount > 0) {
    return {
      warning: true,
      message: t2("workspace.browser.syncBookmarksSkipped", {
        defaultValue: "已导入 {{count}} 个新书签，部分不支持的链接或过深的文件夹已跳过",
        count: count2,
      }),
    };
  }
  return {
    warning: false,
    message: t2("workspace.browser.syncBookmarksSuccess", {
      defaultValue: "已导入 {{count}} 个新书签",
      count: count2,
    }),
  };
}
export function browserProfileImportFailureTrackProps(result) {
  return {
    error_code: result.errorCode ?? "unknown",
    ...(result.keychainSubreason
      ? {
          keychain_subreason: result.keychainSubreason,
        }
      : {}),
    ...(result.windowsDecryptionSubreason
      ? {
          windows_decryption_subreason: result.windowsDecryptionSubreason,
        }
      : {}),
    ...(result.cookieDatabaseFailure
      ? {
          stage: result.cookieDatabaseFailure.stage,
          reason: result.cookieDatabaseFailure.reason,
        }
      : {}),
  };
}
export function BrowserSearchHistory({
  items,
  onSelect,
  onRemove: onRemove2,
  actionId = "browser.search-history",
  deleteActionId = "workspace.browser.search-history-delete",
}) {
  const { t: t2 } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div
      data-action-ui-id={actionId}
      className="elevated-surface-border absolute -inset-x-px top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg bg-popover p-1 shadow-lg"
    >
      {items.map((item) => (
        <div
          key={item}
          className="group flex h-8 items-center rounded-md transition-colors hover:bg-muted/80 focus-within:bg-muted/80"
        >
          <button
            type="button"
            data-action-ui-id={`${actionId}-item`}
            className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-xs text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <Icon icon={Search} size="sm" className="shrink-0 text-muted-foreground" />
            <span className="truncate">{item}</span>
          </button>
          <button
            type="button"
            data-action-ui-id={deleteActionId}
            data-search-history-item={item}
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[color,background-color,opacity] hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={t2("workspace.browser.deleteSearchHistory", {
              defaultValue: "删除这条搜索记录",
            })}
            title={t2("workspace.browser.deleteSearchHistory", {
              defaultValue: "删除这条搜索记录",
            })}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onRemove2(item);
            }}
          >
            <Icon icon={X$7} size="sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
export function BrowserStartSearch({ onSearch, searchHistory, onSelectHistory, onRemoveHistory }) {
  const { t: t2 } = useTranslation();
  const { resolved } = useTheme();
  const [value, setValue] = reactExports.useState("");
  const [focused, setFocused] = reactExports.useState(false);
  const label = t2("workspace.browser.urlPlaceholder", "搜索或输入网址");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
      <span data-action-ui-id="browser-start-globe" aria-hidden="true">
        <img src={CDN_BROWSER_START_ICON[resolved]} alt="" className="size-11" draggable={false} />
      </span>
      <form
        className="relative flex h-11 w-full items-center gap-2 rounded-full border border-input bg-card px-4 transition-colors focus-within:border-foreground"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setFocused(false);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) {
            setFocused(false);
            onSearch(value.trim());
          }
        }}
      >
        <Input3
          onClick={() => setFocused(true)}
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          data-action-ui-id="browser.start-search-input"
          className="h-full min-w-0 flex-1 border-0 bg-transparent! px-0 text-sm text-foreground md:text-sm"
          aria-label={label}
          placeholder={label}
          spellCheck={false}
        />
        <div className="size-7 shrink-0">
          {value.trim() && (
            <Button$1
              type="submit"
              variant="ghost"
              size="icon-sm"
              data-action-ui-id="browser.start-search-submit"
              aria-label={t2("common.search")}
              className="text-muted-foreground/60 hover:text-muted-foreground/60 active:not-aria-[haspopup]:translate-y-0"
            >
              <EnterIcon size={16} />
            </Button$1>
          )}
        </div>
        {focused && !value.trim() && (
          <BrowserSearchHistory
            items={searchHistory}
            actionId="browser.start-search-history"
            deleteActionId="browser.start-search-history-delete"
            onSelect={(item) => {
              setFocused(false);
              onSelectHistory(item);
            }}
            onRemove={onRemoveHistory}
          />
        )}
      </form>
    </div>
  );
}
export function useBrowserChatContext(activeTab, connectorEnabled) {
  reactExports.useEffect(() => {
    setBuiltinBrowserChatContext({
      surface_open: connectorEnabled,
      ...(connectorEnabled && activeTab
        ? {
            active_tab: {
              id: activeTab.id,
              url: activeTab.url,
              ...(activeTab.title
                ? {
                    title: activeTab.title,
                  }
                : {}),
            },
          }
        : {}),
    });
  }, [activeTab, connectorEnabled]);
  reactExports.useEffect(
    () => () =>
      setBuiltinBrowserChatContext({
        surface_open: false,
      }),
    [],
  );
}
export function useBrowserTabPresence(tabs, activeTabId = null) {
  const [previous2, setPrevious] = reactExports.useState({
    tabs,
    activeTabId,
  });
  const [entries2, setEntries] = reactExports.useState(() =>
    tabs.map((tab2) => ({
      tab: tab2,
      active: tab2.id === activeTabId,
      entering: false,
      exiting: false,
    })),
  );
  if (previous2.tabs !== tabs || previous2.activeTabId !== activeTabId) {
    const live = new Map(tabs.map((tab2) => [tab2.id, tab2]));
    const known = new Set(entries2.map(({ tab: tab2 }) => tab2.id));
    const next2 = entries2.map((entry) => ({
      ...entry,
      tab: live.get(entry.tab.id) ?? entry.tab,
      // Keep the outgoing tab's selected appearance until its shell has faded out.
      active: live.has(entry.tab.id) ? entry.tab.id === activeTabId : entry.active,
      exiting: !live.has(entry.tab.id),
    }));
    for (const tab2 of tabs) {
      if (!known.has(tab2.id))
        next2.push({
          tab: tab2,
          active: tab2.id === activeTabId,
          entering: true,
          exiting: false,
        });
    }
    setPrevious({
      tabs,
      activeTabId,
    });
    setEntries(next2);
  }
  const finishExit = reactExports.useCallback((id2) => {
    setEntries((current2) => current2.filter((entry) => entry.tab.id !== id2 || !entry.exiting));
  }, []);
  return {
    entries: entries2,
    finishExit,
  };
}
