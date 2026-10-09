// browser-inspiration-sites.jsx
import { useTranslation, reactExports, X$7, TAB_CONTENT_ENTER_CLASS_NAME, Globe2, AlertCircle, ExternalLink } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Bookmark } from "../media-editing/parse-item.jsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  BROWSER_ERROR_ILLUSTRATION_URL,
} from "./shortcut-categories.jsx";
import { BROWSER_INSPIRATION_URLS } from "./browser-inspiration-urls.jsx";
import { PageStateView } from "../assets/page-state-boundary.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { groupBrowserBookmarks } from "../media-editing/use-browser-video-download.jsx";
export function BrowserBookmarks({ bookmarks, onNavigate, onRemoveBookmark }) {
  const { t: t2 } = useTranslation();
  const groups = reactExports.useMemo(
    () =>
      groupBrowserBookmarks(bookmarks).sort(
        (a2, b3) => Number(a2.folders.length > 0) - Number(b3.folders.length > 0),
      ),
    [bookmarks],
  );
  const [selectedGroupId, setSelectedGroupId] = reactExports.useState(null);
  const tabListRef = reactExports.useRef(null);
  const contentFrameRef = reactExports.useRef(null);
  const activeContentRef = reactExports.useRef(null);
  const [contentHeight, setContentHeight] = reactExports.useState();
  const activeGroupId =
    groups.find((group) => group.id === selectedGroupId)?.id ?? groups[0]?.id ?? null;
  const ungroupedLabel = t2("workspace.browser.ungroupedBookmarks", "默认收藏");
  const groupLabels = groups.map((group) => {
    const label = group.folders.length ? group.folders.join(" / ") : ungroupedLabel;
    const leaf = group.folders.at(-1) ?? label;
    const hasDuplicateLeaf = groups.some(
      (other) => other.id !== group.id && (other.folders.at(-1) ?? ungroupedLabel) === leaf,
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
    if (tab2.left < viewport.left) list2.scrollLeft += tab2.left - viewport.left;
    else if (tab2.right > viewport.right) list2.scrollLeft += tab2.right - viewport.right;
  }, [activeGroupId, groups]);
  reactExports.useLayoutEffect(() => {
    const content2 = activeContentRef.current;
    const frame2 = contentFrameRef.current;
    if (!content2 || !frame2) return;
    let active2 = true;
    const measure = () => {
      if (!active2 || content2.offsetHeight === 0) return;
      const minimum = Number.parseFloat(getComputedStyle(frame2).minHeight) || 0;
      setContentHeight(Math.max(minimum, content2.offsetHeight));
    };
    measure();
    const observer2 = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer2?.observe(content2);
    return () => {
      active2 = false;
      observer2?.disconnect();
    };
  }, [activeGroupId, groups]);
  if (bookmarks.length === 0) return null;
  return (
    <section className="mt-10 min-w-0" aria-label={t2("workspace.browser.bookmarks")}>
      <div className="mb-4 flex h-9 items-center justify-start gap-2 px-1 text-sm font-medium text-foreground">
        <Icon icon={Bookmark} size="md" strokeWidth={1.75} className="size-4 text-foreground" />
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
                    <div key={`${bookmark.id}:${bookmark.url}`} className="group relative min-w-0">
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
function classifyBrowserLoadError(code2) {
  if (code2 === -105 || code2 === -137 || code2 === -803) return "dns";
  if (code2 === -106) return "offline";
  if (code2 === -7 || code2 === -118) return "timeout";
  if ([-111, -130, -131, -136, -115].includes(code2)) return "proxy";
  if (code2 <= -200 && code2 > -300) return "certificate";
  if ([-107, -113, -117].includes(code2)) return "secureConnection";
  if ([-100, -101, -102, -103, -104, -109].includes(code2)) return "connection";
  if ([-20, -21, -22, -27, -138].includes(code2)) return "blocked";
  if ([-300, -301, -302].includes(code2)) return "address";
  if (code2 === -310) return "redirect";
  return "unknown";
}
function browserErrorAllowsExternalOpen(code2, url2) {
  const category = classifyBrowserLoadError(code2);
  if (["certificate", "secureConnection", "blocked", "address"].includes(category)) return false;
  try {
    return ["https:", "http:"].includes(new URL(url2).protocol);
  } catch {
    return false;
  }
}
function browserErrorSteps(code2, url2) {
  const category = classifyBrowserLoadError(code2);
  const steps = [];
  if (
    ["dns", "timeout", "connection", "redirect", "unknown"].includes(category) &&
    browserErrorAllowsExternalOpen(code2, url2)
  ) {
    steps.push({
      key: "workspace.browser.error.visitExternal",
      action: "external",
    });
  }
  steps.push({
    key: `workspace.browser.error.${category}.advice`,
  });
  return steps;
}
export function BrowserErrorCard({ error, onOpenExternal }) {
  const { t: t2 } = useTranslation();
  const category = classifyBrowserLoadError(error.code);
  const steps = browserErrorSteps(error.code, error.url);
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background px-5 py-8">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl p-6 sm:p-8" data-browser-error={category}>
          <PageStateView
            state={{
              type: "error",
              actions: [],
              reason: category === "offline" ? "network" : "generic",
              icon: <span />,
              title: (
                <div className="flex items-center gap-5 text-left">
                  <span
                    className="relative flex size-20 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    <Icon icon={AlertCircle} size="lg" className="text-muted-foreground" />
                    <img
                      src={BROWSER_ERROR_ILLUSTRATION_URL}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 size-full object-contain"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-xl font-semibold leading-snug tracking-tight">
                      {t2(`workspace.browser.error.${category}.title`)}
                    </h2>
                    <p className="text-sm font-normal leading-6 text-muted-foreground">
                      {t2(`workspace.browser.error.${category}.description`)}
                    </p>
                  </div>
                </div>
              ),
              description: (
                <div className="mt-5 text-left text-sm leading-6">
                  <div className="border-t border-border/60 pt-5">
                    <h3 className="mb-4 font-semibold text-foreground">
                      {t2("workspace.browser.error.nextStep")}
                    </h3>
                    <ol className="space-y-5">
                      {steps.map((step, index2) => (
                        <li key={step.key} className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-6 w-4 shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-foreground/80"
                          >
                            {index2 + 1}
                          </span>
                          {step.action === "external" ? (
                            <button
                              type="button"
                              onClick={onOpenExternal}
                              className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm text-left font-medium text-foreground underline decoration-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {t2(step.key)}
                              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                            </button>
                          ) : (
                            <span className="min-w-0 text-foreground/70">{t2(step.key)}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ),
            }}
            className="px-0 py-0 [&_[data-slot=page-state-copy]]:mt-0 [&_[data-slot=page-state-copy]]:max-w-none [&_[data-slot=page-state-copy]>div]:w-full"
          />
          <details className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t2("workspace.browser.error.details")}
            </summary>
            <code className="mt-3 block break-all whitespace-pre-wrap rounded-md bg-muted/50 p-3 leading-5">
              {error.description || "UNKNOWN"}
              {" ("}
              {error.code})
            </code>
          </details>
        </div>
      </div>
    </div>
  );
}
export function inspirationRegionForLanguage(language2) {
  return language2.toLowerCase().startsWith("zh") ? "domestic" : "overseas";
}
export function pickInspirationSites(sites, previous2 = []) {
  const uniqueSites = [...new Map(sites.map((site) => [site.id, site])).values()];
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
export const browserInspirationSites = {
  domestic: [
    {
      id: "xinpianchang.com",
      title: "新片场",
      url: BROWSER_INSPIRATION_URLS["xinpianchang.com"],
    },
    {
      id: "xiaohongshu.com",
      title: "小红书",
      url: BROWSER_INSPIRATION_URLS["xiaohongshu.com"],
    },
    {
      id: "bilibili.com",
      title: "哔哩哔哩",
      url: BROWSER_INSPIRATION_URLS["bilibili.com"],
    },
    {
      id: "douyin.com",
      title: "抖音",
      url: BROWSER_INSPIRATION_URLS["douyin.com"],
    },
    {
      id: "weibo.com",
      title: "微博",
      url: BROWSER_INSPIRATION_URLS["weibo.com"],
    },
    {
      id: "movie.douban.com",
      title: "豆瓣电影",
      url: BROWSER_INSPIRATION_URLS["movie.douban.com"],
    },
    {
      id: "zcool.com.cn",
      title: "站酷",
      url: BROWSER_INSPIRATION_URLS["zcool.com.cn"],
    },
    {
      id: "huaban.com",
      title: "花瓣",
      url: BROWSER_INSPIRATION_URLS["huaban.com"],
    },
    {
      id: "cnu.cc",
      title: "CNU 视觉联盟",
      url: BROWSER_INSPIRATION_URLS["cnu.cc"],
    },
    {
      id: "tvcbook.com",
      title: "TVCBOOK",
      url: BROWSER_INSPIRATION_URLS["tvcbook.com"],
    },
    {
      id: "campaign.nowness.cn",
      title: "NOWNESS 天才发现计划",
      url: BROWSER_INSPIRATION_URLS["campaign.nowness.cn"],
    },
    {
      id: "cinehello.com",
      title: "影视工业网",
      url: BROWSER_INSPIRATION_URLS["cinehello.com"],
    },
    {
      id: "manamana.net",
      title: "MANA",
      url: BROWSER_INSPIRATION_URLS["manamana.net"],
    },
    {
      id: "d-arts.cn",
      title: "数艺网",
      url: BROWSER_INSPIRATION_URLS["d-arts.cn"],
    },
    {
      id: "digitaling.com",
      title: "数英",
      url: BROWSER_INSPIRATION_URLS["digitaling.com"],
    },
    {
      id: "adquan.com",
      title: "广告门",
      url: BROWSER_INSPIRATION_URLS["adquan.com"],
    },
    {
      id: "meihua.info",
      title: "梅花网",
      url: BROWSER_INSPIRATION_URLS["meihua.info"],
    },
    {
      id: "topys.cn",
      title: "TOPYS",
      url: BROWSER_INSPIRATION_URLS["topys.cn"],
    },
    {
      id: "promonews.tv",
      title: "Promo News",
      url: BROWSER_INSPIRATION_URLS["promonews.tv"],
    },
    {
      id: "shotdeck.com",
      title: "ShotDeck",
      url: BROWSER_INSPIRATION_URLS["shotdeck.com"],
    },
    {
      id: "site.frameset.app",
      title: "Frame Set",
      url: BROWSER_INSPIRATION_URLS["site.frameset.app"],
    },
    {
      id: "itsnicethat.com",
      title: "It’s Nice That",
      url: BROWSER_INSPIRATION_URLS["itsnicethat.com"],
    },
    {
      id: "are.na",
      title: "Are.na",
      url: BROWSER_INSPIRATION_URLS["are.na"],
    },
    {
      id: "underconsideration.com",
      title: "Brand New",
      url: BROWSER_INSPIRATION_URLS["underconsideration.com"],
    },
    {
      id: "design360.cn",
      title: "Design360°",
      url: BROWSER_INSPIRATION_URLS["design360.cn"],
    },
    {
      id: "thetype.com",
      title: "The Type",
      url: BROWSER_INSPIRATION_URLS["thetype.com"],
    },
    {
      id: "hiiibrand.com",
      title: "Hiiibrand",
      url: BROWSER_INSPIRATION_URLS["hiiibrand.com"],
    },
    {
      id: "gtn9.com",
      title: "古田路9号",
      url: BROWSER_INSPIRATION_URLS["gtn9.com"],
    },
    {
      id: "ui.cn",
      title: "UI 中国",
      url: BROWSER_INSPIRATION_URLS["ui.cn"],
    },
    {
      id: "uisdc.com",
      title: "优设",
      url: BROWSER_INSPIRATION_URLS["uisdc.com"],
    },
    {
      id: "hao.uisdc.com",
      title: "优设导航",
      url: BROWSER_INSPIRATION_URLS["hao.uisdc.com"],
    },
    {
      id: "dezeen.com",
      title: "Dezeen",
      url: BROWSER_INSPIRATION_URLS["dezeen.com"],
    },
    {
      id: "designboom.com",
      title: "designboom",
      url: BROWSER_INSPIRATION_URLS["designboom.com"],
    },
    {
      id: "archdaily.cn",
      title: "ArchDaily 中文",
      url: BROWSER_INSPIRATION_URLS["archdaily.cn"],
    },
    {
      id: "gooood.cn",
      title: "谷德 gooood",
      url: BROWSER_INSPIRATION_URLS["gooood.cn"],
    },
    {
      id: "designverse.com.cn",
      title: "Designverse",
      url: BROWSER_INSPIRATION_URLS["designverse.com.cn"],
    },
    {
      id: "adstyle.com.cn",
      title: "AD 安邸",
      url: BROWSER_INSPIRATION_URLS["adstyle.com.cn"],
    },
    {
      id: "shejipi.com",
      title: "设计癖",
      url: BROWSER_INSPIRATION_URLS["shejipi.com"],
    },
    {
      id: "puxiang.com",
      title: "普象",
      url: BROWSER_INSPIRATION_URLS["puxiang.com"],
    },
  ],
  overseas: [
    {
      id: "film-grab.com",
      title: "FilmGrab",
      url: BROWSER_INSPIRATION_URLS["film-grab.com"],
    },
    {
      id: "behance.net",
      title: "Behance",
      url: BROWSER_INSPIRATION_URLS["behance.net"],
    },
    {
      id: "artstation.com",
      title: "ArtStation",
      url: BROWSER_INSPIRATION_URLS["artstation.com"],
    },
    {
      id: "pinterest.com",
      title: "Pinterest",
      url: BROWSER_INSPIRATION_URLS["pinterest.com"],
    },
    {
      id: "mubi.com",
      title: "MUBI Notebook",
      url: BROWSER_INSPIRATION_URLS["mubi.com"],
    },
    {
      id: "awwwards.com",
      title: "Awwwards",
      url: BROWSER_INSPIRATION_URLS["awwwards.com"],
    },
    {
      id: "cosmos.so",
      title: "Cosmos",
      url: BROWSER_INSPIRATION_URLS["cosmos.so"],
    },
    {
      id: "shot.cafe",
      title: "Shot.Cafe",
      url: BROWSER_INSPIRATION_URLS["shot.cafe"],
    },
    {
      id: "flim.ai",
      title: "Flim",
      url: BROWSER_INSPIRATION_URLS["flim.ai"],
    },
    {
      id: "eyecannndy.com",
      title: "Eyecannndy",
      url: BROWSER_INSPIRATION_URLS["eyecannndy.com"],
    },
    {
      id: "shotonwhat.com",
      title: "ShotOnWhat",
      url: BROWSER_INSPIRATION_URLS["shotonwhat.com"],
    },
    {
      id: "theasc.com",
      title: "American Cinematographer",
      url: BROWSER_INSPIRATION_URLS["theasc.com"],
    },
    {
      id: "directorslibrary.com",
      title: "Directors’ Library",
      url: BROWSER_INSPIRATION_URLS["directorslibrary.com"],
    },
    {
      id: "shots.net",
      title: "shots",
      url: BROWSER_INSPIRATION_URLS["shots.net"],
    },
    {
      id: "lbbonline.com",
      title: "Little Black Book",
      url: BROWSER_INSPIRATION_URLS["lbbonline.com"],
    },
    {
      id: "directorsnotes.com",
      title: "Directors Notes",
      url: BROWSER_INSPIRATION_URLS["directorsnotes.com"],
    },
    {
      id: "nowness.com",
      title: "NOWNESS",
      url: BROWSER_INSPIRATION_URLS["nowness.com"],
    },
    {
      id: "artofthetitle.com",
      title: "Art of the Title",
      url: BROWSER_INSPIRATION_URLS["artofthetitle.com"],
    },
    {
      id: "motionographer.com",
      title: "Motionographer",
      url: BROWSER_INSPIRATION_URLS["motionographer.com"],
    },
    {
      id: "stashmedia.tv",
      title: "Stash",
      url: BROWSER_INSPIRATION_URLS["stashmedia.tv"],
    },
    {
      id: "the-brandidentity.com",
      title: "The Brand Identity",
      url: BROWSER_INSPIRATION_URLS["the-brandidentity.com"],
    },
    {
      id: "bpando.org",
      title: "BP&O",
      url: BROWSER_INSPIRATION_URLS["bpando.org"],
    },
    {
      id: "thedieline.com",
      title: "The Dieline",
      url: BROWSER_INSPIRATION_URLS["thedieline.com"],
    },
    {
      id: "commarts.com",
      title: "Communication Arts",
      url: BROWSER_INSPIRATION_URLS["commarts.com"],
    },
    {
      id: "dandad.org",
      title: "D&AD",
      url: BROWSER_INSPIRATION_URLS["dandad.org"],
    },
    {
      id: "fontsinuse.com",
      title: "Fonts In Use",
      url: BROWSER_INSPIRATION_URLS["fontsinuse.com"],
    },
    {
      id: "creativeboom.com",
      title: "Creative Boom",
      url: BROWSER_INSPIRATION_URLS["creativeboom.com"],
    },
    {
      id: "abduzeedo.com",
      title: "Abduzeedo",
      url: BROWSER_INSPIRATION_URLS["abduzeedo.com"],
    },
    {
      id: "archdaily.com",
      title: "ArchDaily",
      url: BROWSER_INSPIRATION_URLS["archdaily.com"],
    },
    {
      id: "wallpaper.com",
      title: "Wallpaper*",
      url: BROWSER_INSPIRATION_URLS["wallpaper.com"],
    },
    {
      id: "design-milk.com",
      title: "Design Milk",
      url: BROWSER_INSPIRATION_URLS["design-milk.com"],
    },
    {
      id: "core77.com",
      title: "Core77",
      url: BROWSER_INSPIRATION_URLS["core77.com"],
    },
    {
      id: "siteinspire.com",
      title: "SiteInspire",
      url: BROWSER_INSPIRATION_URLS["siteinspire.com"],
    },
    {
      id: "mobbin.com",
      title: "Mobbin",
      url: BROWSER_INSPIRATION_URLS["mobbin.com"],
    },
    {
      id: "godly.website",
      title: "Godly",
      url: BROWSER_INSPIRATION_URLS["godly.website"],
    },
    {
      id: "land-book.com",
      title: "Land-book",
      url: BROWSER_INSPIRATION_URLS["land-book.com"],
    },
    {
      id: "savee.it",
      title: "Savee",
      url: BROWSER_INSPIRATION_URLS["savee.it"],
    },
    {
      id: "designspiration.com",
      title: "Designspiration",
      url: BROWSER_INSPIRATION_URLS["designspiration.com"],
    },
    {
      id: "thisiscolossal.com",
      title: "Colossal",
      url: BROWSER_INSPIRATION_URLS["thisiscolossal.com"],
    },
    {
      id: "booooooom.com",
      title: "Booooooom",
      url: BROWSER_INSPIRATION_URLS["booooooom.com"],
    },
  ],
};
