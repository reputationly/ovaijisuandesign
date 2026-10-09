// browser-bookmarks.jsx
import {
  CDN_BROWSER_START_ICON,
  ChevronDown,
  Globe2,
  Palette,
  reactExports,
  Shuffle,
  TAB_CONTENT_ENTER_CLASS_NAME,
  useTranslation,
  X$7,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Bookmark,
  Building2,
  Clapperboard,
  Megaphone,
} from "../media-editing/package.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./shortcut-hint.jsx";
import { BrowserSearchHistory } from "./browser-search-history.jsx";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { Button$1 } from "../infra/dialog-content.jsx";
import { EnterIcon } from "./home-service.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  CDN_BROWSER_INSPIRATION_FALLBACK,
  cdnAssetFile,
} from "./context-menu-content.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { browserInspirationSites } from "./browser-inspiration-sites.js";

function groupBrowserBookmarks(bookmarks) {
  const groups = new Map();
  for (const bookmark of bookmarks) {
    const folders = Array.isArray(bookmark.folders)
      ? bookmark.folders.filter(
          (folder) => typeof folder === "string" && folder.trim().length > 0,
        )
      : [];
    const id2 = JSON.stringify(folders);
    let group = groups.get(id2);
    if (!group) {
      group = {
        id: id2,
        folders,
        bookmarks: [],
      };
      groups.set(id2, group);
    }
    group.bookmarks.push(bookmark);
  }
  return [...groups.values()];
}

function BrowserBookmarks({ bookmarks, onNavigate, onRemoveBookmark }) {
  const { t: t2 } = useTranslation();
  const groups = reactExports.useMemo(
    () =>
      groupBrowserBookmarks(bookmarks).sort(
        (a2, b3) =>
          Number(a2.folders.length > 0) - Number(b3.folders.length > 0),
      ),
    [bookmarks],
  );
  const [selectedGroupId, setSelectedGroupId] = reactExports.useState(null);
  const tabListRef = reactExports.useRef(null);
  const contentFrameRef = reactExports.useRef(null);
  const activeContentRef = reactExports.useRef(null);
  const [contentHeight, setContentHeight] = reactExports.useState();
  const activeGroupId =
    groups.find((group) => group.id === selectedGroupId)?.id ??
    groups[0]?.id ??
    null;
  const ungroupedLabel = t2("workspace.browser.ungroupedBookmarks", "默认收藏");
  const groupLabels = groups.map((group) => {
    const label = group.folders.length
      ? group.folders.join(" / ")
      : ungroupedLabel;
    const leaf = group.folders.at(-1) ?? label;
    const hasDuplicateLeaf = groups.some(
      (other) =>
        other.id !== group.id &&
        (other.folders.at(-1) ?? ungroupedLabel) === leaf,
    );
    return {
      id: group.id,
      label,
      tabLabel: hasDuplicateLeaf ? label : leaf,
    };
  });
  reactExports.useEffect(() => {
    setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);
  reactExports.useEffect(() => {
    const list2 = tabListRef.current;
    const activeTab =
      list2?.querySelectorAll('[role="tab"]')[
        groups.findIndex((group) => group.id === activeGroupId)
      ];
    if (!list2 || !activeTab) return;
    const viewport = list2.getBoundingClientRect();
    const tab2 = activeTab.getBoundingClientRect();
    if (tab2.left < viewport.left)
      list2.scrollLeft += tab2.left - viewport.left;
    else if (tab2.right > viewport.right)
      list2.scrollLeft += tab2.right - viewport.right;
  }, [activeGroupId, groups]);
  reactExports.useLayoutEffect(() => {
    const content2 = activeContentRef.current;
    const frame2 = contentFrameRef.current;
    if (!content2 || !frame2) return;
    let active2 = true;
    const measure = () => {
      if (!active2 || content2.offsetHeight === 0) return;
      const minimum =
        Number.parseFloat(getComputedStyle(frame2).minHeight) || 0;
      setContentHeight(Math.max(minimum, content2.offsetHeight));
    };
    measure();
    const observer2 =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer2?.observe(content2);
    return () => {
      active2 = false;
      observer2?.disconnect();
    };
  }, [activeGroupId, groups]);
  if (bookmarks.length === 0) return null;
  return (
    <section
      className="mt-10 min-w-0"
      aria-label={t2("workspace.browser.bookmarks")}
    >
      <div className="mb-4 flex h-9 items-center justify-start gap-2 px-1 text-sm font-medium text-foreground">
        <Icon
          icon={Bookmark}
          size="md"
          strokeWidth={1.75}
          className="size-4 text-foreground"
        />
        <span className="text-[14px] font-medium leading-5">
          {t2("workspace.browser.bookmarks", {
            defaultValue: "我的书签",
          })}
        </span>
      </div>
      <Tabs
        value={activeGroupId}
        onValueChange={(value) => {
          if (typeof value === "string") setSelectedGroupId(value);
        }}
        className="min-w-0"
      >
        <TabsList
          activateOnFocus={true}
          ref={tabListRef}
          aria-label={t2("workspace.browser.bookmarks")}
          data-action-ui-id="browser-start-page-bookmark-groups"
          className="mb-3 max-w-full flex-nowrap justify-start overflow-x-auto bg-transparent p-1 [scrollbar-width:thin]"
        >
          {groupLabels.map(({ id: id2, label, tabLabel }) => (
            <TabsTrigger
              key={id2}
              value={id2}
              title={label}
              data-action-ui-id="browser-start-page-bookmark-group-tab"
              className="h-9 max-w-52 shrink-0 gap-2 rounded-lg transition-colors hover:bg-foreground/5 data-[active]:bg-foreground/10 data-[active]:shadow-none"
            >
              <span className="truncate">{tabLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="border-t border-border/50 pt-3">
          <div
            ref={contentFrameRef}
            data-action-ui-id="browser-start-page-bookmark-content"
            className="min-h-40 overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
            style={{
              height: contentHeight,
            }}
          >
            {groups.map((group) => (
              <TabsContent
                key={group.id}
                value={group.id}
                data-action-ui-id="browser-start-page-bookmark-group"
                ref={group.id === activeGroupId ? activeContentRef : void 0}
                className="p-1"
              >
                <div
                  className={`grid grid-cols-2 gap-x-3 gap-y-1 lg:grid-cols-4 ${TAB_CONTENT_ENTER_CLASS_NAME}`}
                >
                  {group.bookmarks.map((bookmark) => (
                    <div
                      key={`${bookmark.id}:${bookmark.url}`}
                      className="group relative min-w-0"
                    >
                      <button
                        type="button"
                        data-action-ui-id="browser-start-page-bookmark"
                        title={[...group.folders, bookmark.title].join(" / ")}
                        className="flex h-12 w-full min-w-0 items-center gap-2 rounded-lg px-3 pr-10 text-left text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                        onClick={() => onNavigate(bookmark.url)}
                      >
                        {bookmark.faviconDataUrl ? (
                          <img
                            src={bookmark.faviconDataUrl}
                            alt=""
                            className="size-5 shrink-0 object-contain"
                          />
                        ) : (
                          <Icon
                            icon={Globe2}
                            size="md"
                            className="shrink-0 text-muted-foreground"
                          />
                        )}
                        <span className="truncate">{bookmark.title}</span>
                      </button>
                      <button
                        type="button"
                        data-action-ui-id="browser-start-page-bookmark-delete"
                        className="pointer-events-none absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[color,background-color,opacity] hover:bg-background/80 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                        aria-label={t2("workspace.browser.deleteBookmark", {
                          defaultValue: "删除书签",
                        })}
                        title={t2("workspace.browser.deleteBookmark", {
                          defaultValue: "删除书签",
                        })}
                        onClick={() => onRemoveBookmark(bookmark.id)}
                      >
                        <Icon icon={X$7} size="sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </section>
  );
}

function inspirationRegionForLanguage(language2) {
  return language2.toLowerCase().startsWith("zh") ? "domestic" : "overseas";
}

function pickInspirationSites(sites, previous2 = []) {
  const uniqueSites = [
    ...new Map(sites.map((site) => [site.id, site])).values(),
  ];
  const previousIds = new Set(previous2.map((site) => site.id));
  const fresh = uniqueSites.filter((site) => !previousIds.has(site.id));
  const repeated = uniqueSites.filter((site) => previousIds.has(site.id));
  const selected2 = [];
  for (const pool of [fresh, repeated]) {
    while (pool.length > 0 && selected2.length < 4) {
      const index2 = Math.floor(Math.random() * pool.length);
      selected2.push(pool.splice(index2, 1)[0]);
    }
  }
  return selected2;
}

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

const categoryOrder = [
  "filmMotion",
  "visualDesign",
  "brandCreative",
  "architectureProduct",
];

function getBrowserInspirationCategories(region) {
  const sitesById = new Map(
    browserInspirationSites[region].map((site) => [site.id, site]),
  );
  return categoryOrder.map((id2) => ({
    id: id2,
    sites: categorySiteIds[region][id2].flatMap((siteId) => {
      const site = sitesById.get(siteId);
      return site ? [site] : [];
    }),
  }));
}

function pickCategorizedInspirationSites(categories, previous2 = []) {
  const previousById = new Map(
    previous2.map((category) => [category.id, category.sites]),
  );
  return categories.map((category) => ({
    id: category.id,
    sites: pickInspirationSites(category.sites, previousById.get(category.id)),
  }));
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

function BrowserInspirationFavicon({ src }) {
  return <FaviconImage key={src} src={src} />;
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
  ...Object.entries(browserInspirationFaviconFiles).map(
    ([siteId, fileName]) => [
      siteId,
      cdnAssetFile(`${BROWSER_INSPIRATION_ICON_PATH}/${fileName}`),
    ],
  ),
  ...Object.entries(recoveredBrowserInspirationFaviconFiles).map(
    ([siteId, fileName]) => [
      siteId,
      cdnAssetFile(`browser-inspiration-icons/20260923/${fileName}`),
    ],
  ),
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
        <Icon
          icon={CategoryIcon}
          size="xs"
          strokeWidth={1.5}
          className="shrink-0"
        />
        <h3 className="truncate font-heading text-[11px] font-normal uppercase leading-4 tracking-wide">
          {t2(
            categoryTranslationKey(category.id),
            categoryFallback(category.id),
          )}
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
            <BrowserInspirationFavicon
              src={browserInspirationFavicons[site.id]}
            />
            <span className="truncate text-sm font-normal">{site.title}</span>
          </Button$1>
        ))}
      </div>
    </article>
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

function InspirationExperience({
  region,
  open,
  panelId,
  onOpenChange,
  onNavigate,
}) {
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
        const categoryPool = categories.find(
          (candidate) => candidate.id === category.id,
        );
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
    const categoryPool = categories.find(
      (candidate) => candidate.id === category.id,
    );
    return Boolean(
      categoryPool && categoryPool.sites.length > category.sites.length,
    );
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
              open
                ? "translate-y-0 opacity-100 blur-0"
                : "-translate-y-3 opacity-0 blur-[6px]",
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

function BrowserInspiration({ onNavigate }) {
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

function BrowserStartSearch({
  onSearch,
  searchHistory,
  onSelectHistory,
  onRemoveHistory,
}) {
  const { t: t2 } = useTranslation();
  const { resolved } = useTheme();
  const [value, setValue] = reactExports.useState("");
  const [focused, setFocused] = reactExports.useState(false);
  const label = t2("workspace.browser.urlPlaceholder", "搜索或输入网址");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
      <span data-action-ui-id="browser-start-globe" aria-hidden="true">
        <img
          src={CDN_BROWSER_START_ICON[resolved]}
          alt=""
          className="size-11"
          draggable={false}
        />
      </span>
      <form
        className="relative flex h-11 w-full items-center gap-2 rounded-full border border-input bg-card px-4 transition-colors focus-within:border-foreground"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
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

export function BrowserStartPage({
  searchHistory,
  onSelectHistory,
  onRemoveHistory,
  bookmarks,
  onSearch,
  onNavigate,
  onRemoveBookmark,
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-card px-8 py-12 scrollbar-fade">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-start gap-12 pt-[clamp(2rem,9vh,6rem)]">
        <BrowserStartSearch
          onSearch={onSearch}
          searchHistory={searchHistory}
          onSelectHistory={onSelectHistory}
          onRemoveHistory={onRemoveHistory}
        />
        <BrowserInspiration onNavigate={onNavigate} />
        <BrowserBookmarks
          bookmarks={bookmarks}
          onNavigate={onNavigate}
          onRemoveBookmark={onRemoveBookmark}
        />
      </div>
    </div>
  );
}
