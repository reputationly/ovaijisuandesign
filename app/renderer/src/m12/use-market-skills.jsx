// use-market-skills.jsx
import { reactExports, useTranslation, API_PATHS, ChevronDown, Info$1 } from "../vendor.js";
import { gatewayFetch } from "../m15/agent-ws-client.jsx";
import { FilterMenu, FilterMenuTrigger } from "../m15/global-sidebar-provider.jsx";
import { Tooltip, TooltipTrigger, Icon, TooltipProvider } from "../m15/graph.jsx";
import { StableTabLabel, FEATURED_TAG, DEFAULT_PAGE_SIZE, skillEvents } from "../m15/use-mention-models.jsx";
import { cn$2, TooltipContent } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  trackSkillLoadMore,
  trackSkillInstallEvent,
  trackSkillInstallFailed,
  trackSkillUninstall,
  trackSkillUninstallFailed,
} from "../m10/use-new-workspace-dialog.jsx";
import { FilterMenuContent, FilterMenuGroup, FilterMenuItem } from "../m11/file-explorer.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const SKILL_RESTART_QUEUE_TIMEOUT_MS = 3e4;
export async function waitForSkillRestart(restart, timeoutMs = SKILL_RESTART_QUEUE_TIMEOUT_MS) {
  const attempt = restart().then(() => "applied");
  attempt.catch(() => {});
  let timer2;
  const queued = new Promise((resolve) => {
    timer2 = setTimeout(() => resolve("queued"), timeoutMs);
  });
  try {
    return await Promise.race([attempt, queued]);
  } finally {
    if (timer2) clearTimeout(timer2);
  }
}
const SKILL_SECONDARY_TAB_CLASS_NAME =
  "skills-category-secondary-tab inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border px-2.5 py-0 text-[15px] font-normal leading-5 tracking-[0.02em] shadow-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";
function skillSecondaryTabClassName(active2) {
  return cn$2(
    SKILL_SECONDARY_TAB_CLASS_NAME,
    active2
      ? "border-transparent bg-[var(--secondary-tab-active-bg)] font-medium text-foreground"
      : "border-transparent bg-transparent text-foreground/50 hover:text-foreground",
  );
}
function SkillSecondaryTab({ actionId, active: active2, label, onClick }) {
  return (
    <button
      type="button"
      data-action-ui-id={actionId}
      data-active={active2 ? "true" : void 0}
      aria-pressed={active2}
      className={skillSecondaryTabClassName(active2)}
      onClick={onClick}
    >
      <span className="text-[15px] leading-5">
        <StableTabLabel label={label} />
      </span>
    </button>
  );
}
function SkillFilterDropdown({ label, value, valueLabel, options, actionId, onValueChange }) {
  const [open, setOpen] = reactExports.useState(false);
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            data-action-ui-id={actionId}
          />
        }
      >
        <span className="text-muted-foreground">{label}</span>
        <span>{valueLabel}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.5} className="shrink-0" />
      </FilterMenuTrigger>
      <FilterMenuContent
        alignOffset={0}
        sideOffset={4}
        className="min-w-40 gap-0 p-1"
        data-action-ui-id={`${actionId}-menu`}
      >
        <FilterMenuGroup className="gap-0 [--filter-menu-row-gap:0px]">
          {options.map((option2) => (
            <FilterMenuItem
              key={option2.value}
              className="h-auto min-h-7 rounded-sm py-1.5 text-[11px] font-medium hover:bg-popup-item-hover focus-visible:bg-popup-item-hover"
              selected={option2.value === value}
              onClick={() => {
                onValueChange?.(option2.value);
                setOpen(false);
              }}
              data-action-ui-id={`${actionId}-option-${option2.value}`}
            >
              {option2.label}
            </FilterMenuItem>
          ))}
        </FilterMenuGroup>
      </FilterMenuContent>
    </FilterMenu>
  );
}
export function SkillFilterBar({
  categories,
  activeTab,
  activeTag,
  onTagChange,
  viewMode: _viewMode,
  onViewModeChange: _onViewModeChange,
  sortBy: _sortBy,
  onSortChange: _onSortChange,
  autoUpdate: autoUpdate2,
  onAutoUpdateChange,
  mineCategoryFilter,
  onMineCategoryFilterChange,
  mineSourceFilter = "all",
  onMineSourceFilterChange,
}) {
  const { t: t2, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  return (
    <div
      className="flex h-14 shrink-0 items-center gap-3 px-8 py-3 md:px-12"
      data-layout-slot="skills-secondary-filter-bar"
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeTab === "community" && (
          <div className="flex min-w-max items-center gap-1">
            <SkillSecondaryTab
              actionId="skills-filter-tag-all"
              active={!activeTag}
              label={t2("skills.tag.all", "All")}
              onClick={() => onTagChange(null)}
            />
            <SkillSecondaryTab
              actionId="skills-filter-tag-featured"
              active={activeTag === FEATURED_TAG}
              label={t2("skills.tag.featured", "精选")}
              onClick={() => onTagChange(FEATURED_TAG)}
            />
            {categories.map((category) => (
              <SkillSecondaryTab
                key={category.category}
                actionId={`skills-filter-tag-${category.category}`}
                active={activeTag === category.category}
                label={isZh ? category.cn_name : category.en_name}
                onClick={() => onTagChange(category.category)}
              />
            ))}
          </div>
        )}
        {activeTab === "mine" && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SkillFilterDropdown
                value={mineCategoryFilter ?? "__all__"}
                label={t2("skills.mine.filterCategoryLabel", "分类")}
                valueLabel={
                  mineCategoryFilter
                    ? (() => {
                        const match2 = categories.find(
                          (category) => category.category === mineCategoryFilter,
                        );
                        return match2
                          ? isZh
                            ? match2.cn_name
                            : match2.en_name
                          : mineCategoryFilter;
                      })()
                    : t2("skills.mine.filterCategoryAll", "全部")
                }
                options={[
                  {
                    value: "__all__",
                    label: t2("skills.mine.filterCategoryAll", "全部"),
                  },
                  ...categories.map((category) => ({
                    value: category.category,
                    label: isZh ? category.cn_name : category.en_name,
                  })),
                ]}
                actionId="skills-mine-category-dropdown"
                onValueChange={(value) =>
                  onMineCategoryFilterChange?.(value === "__all__" ? null : value)
                }
              />
              <SkillFilterDropdown
                value={mineSourceFilter}
                label={t2("skills.mine.filterSourceLabel", "来源")}
                valueLabel={
                  mineSourceFilter === "community"
                    ? t2("skills.mine.filterSourceCommunity", "来自社区")
                    : mineSourceFilter === "local"
                      ? t2("skills.mine.filterSourceLocal", "本地创建")
                      : t2("skills.mine.filterSourceAll", "全部")
                }
                options={[
                  {
                    value: "all",
                    label: t2("skills.mine.filterSourceAll", "全部"),
                  },
                  {
                    value: "community",
                    label: t2("skills.mine.filterSourceCommunity", "来自社区"),
                  },
                  {
                    value: "local",
                    label: t2("skills.mine.filterSourceLocal", "本地创建"),
                  },
                ]}
                actionId="skills-mine-source-dropdown"
                onValueChange={(value) => onMineSourceFilterChange?.(value)}
              />
            </div>
            {onAutoUpdateChange && (
              <label
                htmlFor="skill-auto-update-filter"
                className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground"
              >
                {t2("skills.mine.autoUpdateInstalled", "自动更新已安装 Skill")}
                <Switch
                  id="skill-auto-update-filter"
                  data-action-ui-id="skills.auto-update-toggle"
                  checked={autoUpdate2}
                  onCheckedChange={onAutoUpdateChange}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function adaptPluginToMarketSkill(p3) {
  const displayNameZh = p3.name?.["zh-CN"] || p3.id;
  const summaryEn = p3.description?.["en-US"] || "";
  const summaryZh = p3.description?.["zh-CN"] || "";
  return {
    name: p3.id,
    displayNameZh,
    summary: summaryEn,
    summaryZh,
    description: summaryEn,
    tools: [],
    tags: p3.tags?.["en-US"] ?? [],
    tagsCn: p3.tags?.["zh-CN"] ?? [],
    creator: "",
    triggerWords: [],
    guidePrompt: "",
    guidePromptEn: "",
    skillType: "plugin",
    version: p3.version,
    hash: p3.hash ?? "",
    installed: p3.installed,
    installedVersion: p3.installedVersion,
    downloads: p3.downloads,
  };
}
export function useMarketSkills(skillType, source, pageSize = DEFAULT_PAGE_SIZE, tag) {
  const requestScope = `${""}\0${source ?? ""}\0${pageSize}\0${tag ?? ""}`;
  const [skills, setSkills] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [hasMore, setHasMore] = reactExports.useState(false);
  const [installingSet, setInstallingSet] = reactExports.useState(new Set());
  const [uninstallingSet, setUninstallingSet] = reactExports.useState(new Set());
  const pageRef = reactExports.useRef(1);
  const queryRef = reactExports.useRef("");
  const fetchingRef = reactExports.useRef(false);
  const requestSeqRef = reactExports.useRef(0);
  const requestScopeRef = reactExports.useRef(requestScope);
  const [resultScope, setResultScope] = reactExports.useState(requestScope);
  const skillsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);
  reactExports.useEffect(() => {
    if (requestScopeRef.current === requestScope) return;
    requestScopeRef.current = requestScope;
    requestSeqRef.current += 1;
    fetchingRef.current = false;
    pageRef.current = 1;
    queryRef.current = "";
    skillsRef.current = [];
    setSkills([]);
    setLoading(false);
    setError(null);
    setHasMore(false);
    setResultScope(requestScope);
  }, [requestScope]);
  const fetchPage = reactExports.useCallback(
    async (query, page, reset2) => {
      if (!reset2 && fetchingRef.current) return;
      fetchingRef.current = true;
      const seq2 = ++requestSeqRef.current;
      const isStale2 = () => seq2 !== requestSeqRef.current;
      if (reset2) {
        setError(null);
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (skillType);
        if (source && !query) {
          params.set("source", source);
        }
        if (tag && !query) {
          params.set("tag", tag);
        }
        let path2;
        if (query) {
          params.set("query", query);
          path2 = `${API_PATHS.marketSearch}?${params}`;
        } else {
          path2 = `${API_PATHS.marketSkills}?${params}`;
        }
        const res = await gatewayFetch(path2);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw2 = await res.json();
        if (isStale2()) return;
        let newSkills;
        if (skillType === "plugin");
        else {
          const skillResp = raw2;
          newSkills = skillResp.skills || [];
        }
        pageRef.current = page;
        queryRef.current = query;
        setSkills((prev) => {
          const next2 = reset2 ? newSkills : [...prev, ...newSkills];
          setHasMore(next2.length < raw2.total);
          return next2;
        });
      } catch (err) {
        if (isStale2()) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!isStale2()) {
          fetchingRef.current = false;
          setLoading(false);
        }
      }
    },
    [skillType, source, pageSize, tag],
  );
  const fetchList = reactExports.useCallback(async () => {
    queryRef.current = "";
    await fetchPage("", 1, true);
  }, [fetchPage]);
  const search2 = reactExports.useCallback(
    async (query) => {
      await fetchPage(query, 1, true);
    },
    [fetchPage],
  );
  const loadMore = reactExports.useCallback(async () => {
    if (!hasMore) return;
    const nextPage = pageRef.current + 1;
    trackSkillLoadMore({
      page: nextPage,
      query_length: queryRef.current.length,
    });
    await fetchPage(queryRef.current, nextPage, false);
  }, [hasMore, fetchPage]);
  const install = reactExports.useCallback(
    async (name2, via) => {
      setInstallingSet((prev) => new Set(prev).add(name2));
      const startedAt = Date.now();
      const targetSkill = skillsRef.current.find((s2) => s2.name === name2);
      const isUpdate = targetSkill?.installed === true;
      const previousVersion = isUpdate ? targetSkill?.installedVersion : void 0;
      try {
        const res = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: name2,
                  skillType,
                }
              : {
                  name: name2,
                },
          ),
        });
        const data2 = await res.json();
        if (!data2.ok) throw new Error(data2.error || "Install failed");
        trackSkillInstallEvent({
          name: name2,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          previousVersion,
          via,
        });
        skillEvents.fireSkillsChanged(name2, "installed");
        return true;
      } catch (err) {
        trackSkillInstallFailed({
          name: name2,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          error: err,
          durationMs: Date.now() - startedAt,
          via,
        });
        setInstallingSet((prev) => {
          const next2 = new Set(prev);
          next2.delete(name2);
          return next2;
        });
        return false;
      }
    },
    [skillType],
  );
  const uninstall = reactExports.useCallback(
    async (name2) => {
      setUninstallingSet((prev) => new Set(prev).add(name2));
      try {
        const res = await gatewayFetch(API_PATHS.marketUninstall, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: name2,
                  skillType,
                }
              : {
                  name: name2,
                },
          ),
        });
        const data2 = await res.json();
        if (!data2.ok) throw new Error(data2.error || "Uninstall failed");
        setSkills((prev) =>
          prev.map((s2) =>
            s2.name === name2
              ? {
                  ...s2,
                  installed: false,
                }
              : s2,
          ),
        );
        trackSkillUninstall(name2, "market");
        skillEvents.fireSkillsChanged(name2, "uninstalled");
        return true;
      } catch (err) {
        trackSkillUninstallFailed({
          name: name2,
          source: "market",
          error: err,
        });
        return false;
      } finally {
        setUninstallingSet((prev) => {
          const next2 = new Set(prev);
          next2.delete(name2);
          return next2;
        });
      }
    },
    [skillType],
  );
  const markInstalled = reactExports.useCallback((name2) => {
    setSkills((prev) =>
      prev.map((s2) =>
        s2.name === name2
          ? {
              ...s2,
              installed: true,
              updateAvailable: false,
              installedVersion: s2.version,
            }
          : s2,
      ),
    );
    setInstallingSet((prev) => {
      if (!prev.has(name2)) return prev;
      const next2 = new Set(prev);
      next2.delete(name2);
      return next2;
    });
  }, []);
  const clearInstalling = reactExports.useCallback((name2) => {
    setInstallingSet((prev) => {
      if (!prev.has(name2)) return prev;
      const next2 = new Set(prev);
      next2.delete(name2);
      return next2;
    });
  }, []);
  const ownsCurrentScope = resultScope === requestScope;
  return {
    // Effects clear the internal state after a scope change. The synchronous
    // guard also hides the previous domain during the render before that
    // effect runs, so stale cards never remain interactive for one frame.
    skills: ownsCurrentScope ? skills : [],
    loading: ownsCurrentScope ? loading : true,
    error: ownsCurrentScope ? error : null,
    hasMore: ownsCurrentScope ? hasMore : false,
    fetchList,
    search: search2,
    loadMore,
    install,
    markInstalled,
    clearInstalling,
    uninstall,
    installingSet,
    uninstallingSet,
  };
}
export function CapabilityPopoverHeader({ title, description, trailing }) {
  return (
    <div className="flex h-8 min-w-0 items-center justify-between px-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs font-sans font-normal leading-4 text-muted-foreground select-none">
          {title}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={description}
                  data-action-ui-id="capability-popover-description"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                />
              }
            >
              <Icon icon={Info$1} size="xs" strokeWidth={2} aria-hidden={true} />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
const COVER_PREVIEW_GAP = 8;
const VIEWPORT_GAP = 8;
export function getSkillCoverPreviewSide(anchorRect, previewWidth, viewportWidth) {
  const rightSpace = viewportWidth - anchorRect.right - COVER_PREVIEW_GAP - VIEWPORT_GAP;
  const leftSpace = anchorRect.left - COVER_PREVIEW_GAP - VIEWPORT_GAP;
  if (rightSpace >= previewWidth) return "right";
  if (leftSpace >= previewWidth) return "left";
  return rightSpace >= leftSpace ? "right" : "left";
}
export const MY_SKILLS_TAG = "__my_skills__";
export const CLIP_EDITOR_SKILL_CATEGORIES = [
  {
    value: "clip-editing",
    label: "剪辑",
    labelEn: "Editing",
    skills: [
      "音乐卡点",
      "剪映导出",
      "字幕修正",
      "视频转录",
      "视频拆解分析师",
      "AlphaMOV",
      "品牌字效迁移编辑器",
    ],
  },
  {
    value: "shot-design",
    label: "分镜",
    labelEn: "Storyboard",
    skills: [
      "分镜板生成",
      "影视镜头与角色卡",
      "电影场景生成",
      "电影运动语言",
      "坐标运镜分镜设计师",
      "线控轨迹运镜设计",
    ],
  },
  {
    value: "video-workflow",
    label: "成片",
    labelEn: "Production",
    skills: [
      "故事转视频",
      "纪录片",
      "宣传视频",
      "UGC 广告",
      "MV创作",
      "格莱美说唱MV速成",
      "球鞋广告",
      "GTA视频",
      "国风短剧成片生成器",
      "MG 口播动画生成器",
      "动物播客",
      "AI推广视频",
    ],
  },
  {
    value: "audio-post",
    label: "音频",
    labelEn: "Audio",
    skills: ["影视配乐", "配音导演", "声音设计", "音色克隆", "播客工作室", "播客套件"],
  },
];
export const DIRECTOR_STAGE_SKILL_CATEGORIES = [
  {
    value: "director-scene-character",
    label: "3D 场景与人物",
    labelEn: "3D Scene & Character",
    names: ["cinematic-scenes"],
    keywords: [],
  },
  {
    value: "director-camera-movement",
    label: "运镜设计",
    labelEn: "Camera Movement",
    names: ["coordinate-camera-control-designer", "cinematic-motion-language"],
    keywords: [],
  },
];
export const TEXT_EDITOR_SKILL_CATEGORIES = [
  {
    value: "text-writing",
    label: "写作创作",
    labelEn: "Writing",
    names: [
      "writing-fragments",
      "ad-creative",
      "social-caption",
      "short-drama-screenwriter",
      "short-drama-series-writer",
      "content-strategy",
      "translator",
      "translation",
    ],
    keywords: [
      "写作",
      "文案",
      "文章",
      "剧本",
      "小说",
      "诗歌",
      "内容创作",
      "writing",
      "copywriting",
      "article",
      "script",
      "creative",
    ],
  },
  {
    value: "text-processing",
    label: "文本Agent",
    labelEn: "Text Agent",
    names: [
      "podcast-to-content-suite",
      "video-transcript",
      "subtitle-correction",
      "translator",
      "translation",
      "text-summarizer",
      "text-rewriter",
      "proofreading",
    ],
    keywords: [
      "总结",
      "改写",
      "润色",
      "翻译",
      "校对",
      "提取",
      "分析",
      "整理",
      "文档",
      "总结",
      "summar",
      "rewrite",
      "translate",
      "proofread",
      "document",
      "analysis",
    ],
  },
];
