// slash-command-popover-content.jsx
import { jsxRuntimeExports, reactExports, useTranslation, ChevronLeft, ChevronRight$1, reactDomExports, Trans, Search$2, Plus$2 } from "../vendor.js";
import { skillCategoryCodes } from "../m15/push-inline.js";
import { CDN_SKILL_SHOWCASE_FALLBACK } from "../m15/use-hub-logo-hover-animation.jsx";
import { FEATURED_TAG, useSkillCategories, resolveSkillCoverUrl, beginSkillApplyingToast, SkillCoverMedia } from "../m15/use-mention-models.jsx";
import { homeService, SkillIcon } from "../m08/browser-inspiration-urls.jsx";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { QuickZoomPresence } from "../m06/canvas-toggle-icon.jsx";
import { showSkillInstallSuccessToast } from "../m10/use-new-workspace-dialog.jsx";
import { Skeleton } from "../m09/infinite-scroll-container.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CLIP_EDITOR_SKILL_CATEGORIES,
  CapabilityPopoverHeader,
  DIRECTOR_STAGE_SKILL_CATEGORIES,
  MY_SKILLS_TAG,
  TEXT_EDITOR_SKILL_CATEGORIES,
  getSkillCoverPreviewSide,
  useMarketSkills,
  waitForSkillRestart,
} from "./use-market-skills.jsx";
import { MESSAGE_INPUT_POPOVER_WIDTH, MESSAGE_INPUT_POPOVER_Z_INDEX } from "./use-upload.js";
function normalizeSkillName(value) {
  return value.replace(/[\s\-_]/g, "").toLocaleLowerCase();
}
function matchesClipEditorSkill(skill, allowedNames) {
  const names = [skill.displayNameZh, skill.name].map(normalizeSkillName);
  return allowedNames.some((name2) => names.includes(normalizeSkillName(name2)));
}
function getSkillSearchText(skill) {
  return [
    skill.displayNameZh,
    skill.name,
    skill.summaryZh,
    skill.summary,
    skill.tagCn,
    skill.tagEn,
    ...(skill.completeTagsCn ?? []),
    ...(skill.completeTagsEn ?? []),
    ...(skill.tags ?? []),
    ...(skill.tagsCn ?? []),
    ...(skill.triggerWords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}
function matchesKeywordSkill(skill, keywords2) {
  const text2 = getSkillSearchText(skill);
  return keywords2.some((keyword2) => {
    const normalizedKeyword = keyword2.toLocaleLowerCase();
    if (/^[a-z]+$/i.test(normalizedKeyword)) {
      return new RegExp(`\\b${normalizedKeyword}\\b`, "i").test(text2);
    }
    return text2.includes(normalizedKeyword);
  });
}
function matchesCuratedAgentSkill(skill, category) {
  if (
    category.names.some((name2) => normalizeSkillName(name2) === normalizeSkillName(skill.name))
  ) {
    return true;
  }
  return matchesKeywordSkill(skill, category.keywords);
}
export function getAgentSkillBrowseSkills(marketSkills, localSkills, mode2, activeCategory) {
  const marketBrowseSkills = getSkillPopoverBrowseSkills(marketSkills, localSkills, null);
  const merged = [
    ...marketBrowseSkills,
    ...localSkills.filter(
      (localSkill) => !marketBrowseSkills.some((skill) => skill.name === localSkill.name),
    ),
  ];
  if (mode2 === "clip-editor") {
    const category2 = activeCategory
      ? CLIP_EDITOR_SKILL_CATEGORIES.find((item) => item.value === activeCategory)
      : null;
    const allowedNames = category2
      ? category2.skills
      : CLIP_EDITOR_SKILL_CATEGORIES.flatMap((item) => item.skills);
    return merged.filter((skill) => matchesClipEditorSkill(skill, allowedNames));
  }
  const categories =
    mode2 === "director-stage" ? DIRECTOR_STAGE_SKILL_CATEGORIES : TEXT_EDITOR_SKILL_CATEGORIES;
  const category = activeCategory ? categories.find((item) => item.value === activeCategory) : null;
  const selectedCategories = category ? [category] : categories;
  if (mode2 === "director-stage" || mode2 === "text-editor") {
    return merged.filter((skill) =>
      selectedCategories.some((item) =>
        item.names.some((name2) => normalizeSkillName(name2) === normalizeSkillName(skill.name)),
      ),
    );
  }
  return merged.filter((skill) =>
    selectedCategories.some((item) => matchesCuratedAgentSkill(skill, item)),
  );
}
function filterMarketSkillsByTag(skills, activeTag) {
  if (!activeTag) return skills;
  if (activeTag === FEATURED_TAG) {
    return skills.filter(
      (skill) => skill.source === "official-featured" || skill.source === "community",
    );
  }
  return skills.filter((skill) => skillCategoryCodes(skill).includes(activeTag));
}
function getSkillPopoverBrowseSkills(marketSkills, localSkills, activeTag) {
  if (activeTag === MY_SKILLS_TAG) return localSkills;
  return filterMarketSkillsByTag(marketSkills, activeTag).map((marketSkill) => {
    if (!marketSkill.installed) return marketSkill;
    const installedSkill = localSkills.find((skill) => skill.name === marketSkill.name);
    return installedSkill
      ? {
          ...installedSkill,
          installed: true,
          downloads: marketSkill.downloads,
          categoryCodes: marketSkill.categoryCodes,
        }
      : marketSkill;
  });
}
const MIN_BROAD_LATIN_QUERY_LENGTH = 3;
const CJK_QUERY_PATTERN = /[\u3400-\u9fff]/u;
const TOKEN_SEPARATOR_PATTERN = /[^\p{L}\p{N}]+/u;
const UNSCORED_RANK = Number.MAX_SAFE_INTEGER;
function normalize$1(value) {
  return value?.trim().toLocaleLowerCase() ?? "";
}
function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}
function tokens(value) {
  return normalize$1(value).split(TOKEN_SEPARATOR_PATTERN).filter(Boolean);
}
function bestPrimaryScore(values3, query, broadMatch) {
  let score = null;
  for (const value of values3) {
    const normalizedValue = normalize$1(value);
    if (!normalizedValue) continue;
    if (normalizedValue === query) score = Math.min(score ?? 0, 0);
    else if (tokens(normalizedValue).some((token2) => token2 === query)) {
      score = Math.min(score ?? 1, 1);
    } else if (tokens(normalizedValue).some((token2) => token2.startsWith(query))) {
      score = Math.min(score ?? 2, 2);
    } else if (broadMatch && normalizedValue.includes(query)) {
      score = Math.min(score ?? 3, 3);
    }
  }
  return score;
}
function includesQuery(values3, query) {
  return values3.some((value) => normalize$1(value).includes(query));
}
function getSearchScore(skill, query) {
  const broadMatch =
    CJK_QUERY_PATTERN.test(query) || Array.from(query).length >= MIN_BROAD_LATIN_QUERY_LENGTH;
  const primaryScore = bestPrimaryScore([skill.name, skill.displayNameZh], query, broadMatch);
  if (primaryScore !== null) return primaryScore;
  const summaries = [skill.summary, skill.summaryZh];
  if (
    (broadMatch && includesQuery(summaries, query)) ||
    (!broadMatch && summaries.some((summary) => tokens(summary).includes(query)))
  ) {
    return 10;
  }
  if (!broadMatch) return null;
  if (
    includesQuery(
      [
        skill.tagEn,
        skill.tagCn,
        // `creator` is one of the fields the market endpoint searches, so score
        // it here too — otherwise a server hit on the author name arrives with
        // no local score.
        skill.creator,
        ...stringList(skill.completeTagsEn),
        ...stringList(skill.completeTagsCn),
        ...stringList(skill.tags),
        ...stringList(skill.tagsCn),
        ...stringList(skill.triggerWords),
      ],
      query,
    )
  ) {
    return 20;
  }
  if (includesQuery([skill.descEn, skill.descCn, skill.description], query)) return 30;
  return null;
}
function rankSkillsBySearchRelevance(skills, rawQuery, options = {}) {
  const query = normalize$1(rawQuery);
  if (!query) return skills;
  const keepUnscored = options.keepUnscored ?? false;
  return skills
    .map((skill, index2) => ({
      index: index2,
      score: getSearchScore(skill, query),
      skill,
    }))
    .filter((entry) => keepUnscored || entry.score !== null)
    .sort(
      (left, right) =>
        (left.score ?? UNSCORED_RANK) - (right.score ?? UNSCORED_RANK) || left.index - right.index,
    )
    .map(({ skill }) => skill);
}
const UPPERCASE_WORDS = new Set(["mv", "ai", "api", "id"]);
const HOME_POPOVER_GAP$1 = 4;
const GLOBAL_SKILL_SEARCH_PAGE_SIZE = 100;
const INLINE_SKILL_POPOVER_WIDTH = 320;
const INLINE_SKILL_POPOVER_MAX_HEIGHT = 288;
const SKILL_TAG_SCROLL_STEP_PX = 120;
const SKILL_POPOVER_SKELETON_ROWS = 5;
const SKILL_SEARCH_DEBOUNCE_MS = 300;
function getAgentSkillCategories(mode2) {
  if (mode2 === "clip-editor") {
    return [
      {
        value: "clip-editing",
        label: "剪辑",
        labelEn: "Editing",
      },
      {
        value: "shot-design",
        label: "分镜",
        labelEn: "Storyboard",
      },
      {
        value: "video-workflow",
        label: "成片",
        labelEn: "Production",
      },
      {
        value: "audio-post",
        label: "音频",
        labelEn: "Audio",
      },
    ];
  }
  return mode2 === "director-stage"
    ? DIRECTOR_STAGE_SKILL_CATEGORIES
    : TEXT_EDITOR_SKILL_CATEGORIES;
}
function getAgentSkillTitle(mode2) {
  if (mode2 === "clip-editor") return "剪辑";
  return mode2 === "director-stage" ? "导演台" : "文本";
}
function isLocalSkill(skill) {
  return "enabled" in skill;
}
async function restartOpenCode() {
  const restart = window.hilo?.opencode?.restart;
  if (!restart) throw new Error("OpenCode restart IPC is unavailable");
  await restart();
}
function toDisplayName(name2) {
  return name2
    .split("-")
    .map((w3) =>
      UPPERCASE_WORDS.has(w3) ? w3.toUpperCase() : w3.charAt(0).toUpperCase() + w3.slice(1),
    )
    .join(" ");
}
function getSkillDisplay(skill, lang) {
  const isZh = lang.startsWith("zh");
  return {
    displayName: isZh
      ? skill.displayNameZh || toDisplayName(skill.name)
      : toDisplayName(skill.name),
    summary: isZh ? skill.summaryZh || skill.summary : skill.summary,
    // Full SKILL.md frontmatter description — same locale fallback chain the
    // detail dialog uses (descCn / descEn / description). Shown verbatim in
    // the hover tooltip so the user sees what the agent actually reads, not
    // the truncated one-line summary.
    description: isZh ? skill.descCn || skill.description : skill.descEn || skill.description,
  };
}
function SkillItem({
  skill,
  index: index2,
  activeIndex,
  activeRef,
  onSelect,
  onHover,
  lang,
  onCoverPreviewEnter,
  onCoverPreviewLeave,
  disabled: disabled2,
}) {
  const display = getSkillDisplay(skill, lang);
  const isActive2 = index2 === activeIndex;
  const descText = display.summary || skill.description?.split("\n")[0];
  return (
    <button
      key={skill.name}
      id={`slash-opt-${skill.name}`}
      ref={isActive2 ? activeRef : void 0}
      type="button"
      role="option"
      aria-selected={isActive2}
      aria-busy={disabled2}
      data-action-ui-id={`slash-cmd-${skill.name}`}
      className={`list-row-hit-area [--list-row-gap:2px] first:before:top-0 last:before:bottom-0 w-full flex flex-col gap-0.5 px-2.5 py-2 text-left cursor-pointer rounded-md transition-colors disabled:cursor-wait disabled:opacity-60 ${isActive2 ? "bg-popup-item-active" : "hover:bg-popup-item-active"}`}
      disabled={disabled2}
      onClick={() => onSelect(skill)}
      onMouseEnter={(event) => {
        onHover(index2);
        onCoverPreviewEnter(skill, event.currentTarget);
      }}
      onMouseLeave={onCoverPreviewLeave}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[13px] leading-[20px] font-sans font-normal text-foreground truncate">
          {display.displayName}
        </span>
        <span className="text-[12px] shrink-0 text-muted-foreground/70">/{skill.name}</span>
      </div>
      {descText && (
        <span
          className={`text-[12px] leading-tight truncate transition-colors ${isActive2 ? "text-foreground" : "text-muted-foreground"}`}
        >
          {descText}
        </span>
      )}
    </button>
  );
}
function SkillPopoverSkeleton() {
  return (
    <div
      data-action-ui-id="skill-popover-skeleton"
      aria-hidden="true"
      className="skill-popover-skeleton flex shrink-0 flex-col gap-0.5"
    >
      {Array.from(
        {
          length: SKILL_POPOVER_SKELETON_ROWS,
        },
        (_2, index2) => (
          <div
            key={index2}
            className="flex h-12 shrink-0 flex-col justify-center gap-1 rounded-md px-2.5 py-2"
          >
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-3.5 w-24 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-4/5 rounded-sm" />
          </div>
        ),
      )}
    </div>
  );
}
export function SlashCommandPopover({ open = true, ...props }) {
  return (
    <QuickZoomPresence value={open ? props : null}>
      {(retainedProps, motionProps) => (
        <SlashCommandPopoverContent {...retainedProps} motionProps={motionProps} />
      )}
    </QuickZoomPresence>
  );
}
function SlashCommandPopoverContent({
  motionProps,
  id: id2,
  skills,
  allSkills = skills,
  activeIndex,
  onSelect,
  onHover,
  position: position2 = "up",
  displayMode = "full",
  anchorRef,
  triggerRef,
  onClose,
  onCreate,
  onExplore,
  searchable = false,
  searchQuery = "",
  onSearchChange,
  skillPopoverMode = "default",
}) {
  const ending = motionProps["data-ending-style"] !== void 0;
  const { t: t2, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const { categories: configuredCategories } = useSkillCategories(skillPopoverMode === "default");
  const listRef = reactExports.useRef(null);
  const scrollRef = reactExports.useRef(null);
  const tagScrollRef = reactExports.useRef(null);
  const activeRef = reactExports.useRef(null);
  const [activeTag, setActiveTag] = reactExports.useState(null);
  const [canScrollTagsLeft, setCanScrollTagsLeft] = reactExports.useState(false);
  const [canScrollTagsRight, setCanScrollTagsRight] = reactExports.useState(false);
  const [activeAgentCategory, setActiveAgentCategory] = reactExports.useState(null);
  const [pendingSkillNames, setPendingSkillNames] = reactExports.useState(new Set());
  const pendingSkillNamesRef = reactExports.useRef(new Set());
  const mountedRef = reactExports.useRef(true);
  const [hoveredPreviewSkill, setHoveredPreviewSkill] = reactExports.useState(null);
  const previewCover = hoveredPreviewSkill ? resolveSkillCoverUrl(hoveredPreviewSkill) : "";
  const previewDisplay = hoveredPreviewSkill
    ? getSkillDisplay(hoveredPreviewSkill, i18n.language)
    : null;
  const previewUsesFallback = previewCover === CDN_SKILL_SHOWCASE_FALLBACK;
  const [hoveredSkillTop, setHoveredSkillTop] = reactExports.useState(null);
  const [previewTop, setPreviewTop] = reactExports.useState(null);
  const [previewSide, setPreviewSide] = reactExports.useState("right");
  const previewRef = reactExports.useRef(null);
  const previewHideTimerRef = reactExports.useRef(null);
  const cancelPreviewHide = () => {
    if (previewHideTimerRef.current) {
      clearTimeout(previewHideTimerRef.current);
      previewHideTimerRef.current = null;
    }
  };
  const schedulePreviewHide = () => {
    cancelPreviewHide();
    previewHideTimerRef.current = setTimeout(() => {
      setHoveredPreviewSkill(null);
      setHoveredSkillTop(null);
      setPreviewTop(null);
      setPreviewSide("right");
    }, 120);
  };
  const handleCoverPreviewEnter = (skill, element2) => {
    cancelPreviewHide();
    setHoveredPreviewSkill(skill);
    setHoveredSkillTop(element2.offsetTop + element2.offsetHeight / 2);
  };
  const market = useMarketSkills(void 0, void 0, GLOBAL_SKILL_SEARCH_PAGE_SIZE);
  const [marketRequestStarted, setMarketRequestStarted] = reactExports.useState(false);
  const taggedSkills = reactExports.useMemo(
    () =>
      skillPopoverMode !== "default"
        ? getAgentSkillBrowseSkills(market.skills, allSkills, skillPopoverMode, activeAgentCategory)
        : getSkillPopoverBrowseSkills(market.skills, allSkills, activeTag),
    [activeAgentCategory, activeTag, allSkills, market.skills, skillPopoverMode],
  );
  const searchTerm = searchQuery.trim().toLowerCase();
  reactExports.useEffect(() => {
    mountedRef.current = !ending;
    return () => {
      mountedRef.current = false;
    };
  }, [ending]);
  const beginSkillSelection = reactExports.useCallback((name2) => {
    if (pendingSkillNamesRef.current.has(name2)) return false;
    pendingSkillNamesRef.current.add(name2);
    setPendingSkillNames(new Set(pendingSkillNamesRef.current));
    return true;
  }, []);
  const finishSkillSelection = reactExports.useCallback((name2) => {
    pendingSkillNamesRef.current.delete(name2);
    if (mountedRef.current) setPendingSkillNames(new Set(pendingSkillNamesRef.current));
  }, []);
  const marketQueryRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (ending || displayMode !== "full") return;
    const run2 = () => {
      if (marketQueryRef.current === searchTerm) return;
      marketQueryRef.current = searchTerm;
      if (searchTerm) void market.search(searchTerm);
      else void market.fetchList();
    };
    if (!searchTerm) {
      run2();
      setMarketRequestStarted(true);
      return;
    }
    setMarketRequestStarted(true);
    const timer2 = setTimeout(run2, SKILL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer2);
  }, [displayMode, ending, searchTerm, market.search, market.fetchList]);
  const handleLocalSkillSelect = reactExports.useCallback(
    async (skill) => {
      if (skill.enabled) {
        onSelect(skill);
        return;
      }
      if (!beginSkillSelection(skill.name)) return;
      const applyingToast = beginSkillApplyingToast(t2("skills.applying"));
      try {
        await homeService.hiloApp.toggleSkill(skill.name, true);
      } catch {
        applyingToast.error(t2("skills.toggleError"));
        finishSkillSelection(skill.name);
        return;
      }
      applyingToast.pending(t2("skills.restartPending"));
      try {
        const outcome = await waitForSkillRestart(restartOpenCode);
        if (outcome === "queued") {
          applyingToast.info(t2("skills.restartQueued"));
          return;
        }
        applyingToast.success(t2("skills.restartSuccess"));
        if (mountedRef.current)
          onSelect({
            ...skill,
            enabled: true,
          });
      } catch {
        applyingToast.error(t2("skills.restartFailed"));
      } finally {
        finishSkillSelection(skill.name);
      }
    },
    [beginSkillSelection, finishSkillSelection, onSelect, t2],
  );
  const handleMarketSkillSelect = reactExports.useCallback(
    async (skill) => {
      if (!skill.installed) {
        if (market.installingSet.has(skill.name) || !beginSkillSelection(skill.name)) return;
        const applyingToast = beginSkillApplyingToast(t2("skills.market.installing"));
        try {
          const installed = await market.install(skill.name, "market_card");
          if (!installed) {
            applyingToast.error(
              t2("skills.market.installError", {
                name: skill.name,
              }),
            );
            return;
          }
          applyingToast.pending(t2("skills.restartPending"));
          let outcome;
          try {
            outcome = await waitForSkillRestart(restartOpenCode);
          } catch {
            market.clearInstalling(skill.name);
            applyingToast.error(t2("skills.restartFailed"));
            return;
          }
          if (mountedRef.current) market.markInstalled(skill.name);
          if (outcome === "queued") {
            applyingToast.info(t2("skills.restartQueued"));
            return;
          }
          applyingToast.successWith((id22) =>
            showSkillInstallSuccessToast(skill.name, {
              id: id22,
            }),
          );
        } finally {
          finishSkillSelection(skill.name);
        }
      }
      if (mountedRef.current) {
        onSelect({
          ...skill,
          enabled: true,
          marketSource: skill.source,
          source: "installed",
        });
      }
    },
    [
      beginSkillSelection,
      finishSkillSelection,
      market.clearInstalling,
      market.install,
      market.installingSet,
      market.markInstalled,
      onSelect,
      t2,
    ],
  );
  const handleSkillSelect = reactExports.useCallback(
    (skill) => {
      if (isLocalSkill(skill)) void handleLocalSkillSelect(skill);
      else void handleMarketSkillSelect(skill);
    },
    [handleLocalSkillSelect, handleMarketSkillSelect],
  );
  const searchResults = reactExports.useMemo(() => {
    if (!searchTerm) return taggedSkills;
    if (skillPopoverMode !== "default") {
      return rankSkillsBySearchRelevance(taggedSkills, searchTerm, {
        keepUnscored: true,
      });
    }
    if (activeTag === MY_SKILLS_TAG) {
      return rankSkillsBySearchRelevance(allSkills, searchTerm);
    }
    const localSkills = rankSkillsBySearchRelevance(
      allSkills.filter((skill) => {
        if (!activeTag) return true;
        if (activeTag === FEATURED_TAG) {
          return skill.marketSource === "official-featured" || skill.marketSource === "community";
        }
        return skillCategoryCodes(skill).includes(activeTag);
      }),
      searchTerm,
    );
    const marketSkills = rankSkillsBySearchRelevance(
      filterMarketSkillsByTag(market.skills, activeTag),
      searchTerm,
      {
        keepUnscored: true,
      },
    );
    const seen2 = new Set();
    return rankSkillsBySearchRelevance(
      [...localSkills, ...marketSkills].filter((skill) => {
        if (seen2.has(skill.name)) return false;
        seen2.add(skill.name);
        return true;
      }),
      searchTerm,
      {
        keepUnscored: true,
      },
    );
  }, [activeTag, allSkills, market.skills, searchTerm, skillPopoverMode, taggedSkills]);
  const displayedSkills = searchTerm ? searchResults : taggedSkills;
  const isVisibleSkillsLoading = market.loading;
  const showSkillsSkeleton =
    displayedSkills.length === 0 &&
    !market.error &&
    (!marketRequestStarted || isVisibleSkillsLoading);
  const activeCategory = configuredCategories.find((category) => category.category === activeTag);
  const activeTagLabel =
    skillPopoverMode !== "default"
      ? (getAgentSkillCategories(skillPopoverMode).find(
          (category) => category.value === activeAgentCategory,
        )?.[i18n.language.startsWith("zh") ? "label" : "labelEn"] ?? null)
      : activeTag === MY_SKILLS_TAG
        ? t2("skills.tag.mine", "My Skills")
        : activeTag === FEATURED_TAG
          ? t2("skills.tag.featured", "精选")
          : activeCategory
            ? isZh
              ? activeCategory.cn_name
              : activeCategory.en_name
            : null;
  const [fullActiveIndex, setFullActiveIndex] = reactExports.useState(0);
  const isFullMode = displayMode === "full";
  const resolvedActiveIndex = isFullMode ? fullActiveIndex : activeIndex;
  const handleHover = isFullMode ? setFullActiveIndex : onHover;
  const syncTagOverflow = reactExports.useCallback(() => {
    const element2 = tagScrollRef.current;
    if (!element2) return;
    setCanScrollTagsLeft(element2.scrollLeft > 0);
    setCanScrollTagsRight(element2.scrollLeft + element2.clientWidth < element2.scrollWidth - 1);
  }, []);
  const handleTagWheel = reactExports.useCallback(
    (event) => {
      const element2 = tagScrollRef.current;
      if (!element2 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const maxScrollLeft = Math.max(0, element2.scrollWidth - element2.clientWidth);
      const nextScrollLeft = Math.min(
        maxScrollLeft,
        Math.max(0, element2.scrollLeft + event.deltaY),
      );
      if (nextScrollLeft === element2.scrollLeft) return;
      event.preventDefault();
      element2.scrollLeft = nextScrollLeft;
      syncTagOverflow();
    },
    [syncTagOverflow],
  );
  reactExports.useEffect(() => {
    if (!isFullMode) return;
    const element2 = tagScrollRef.current;
    if (!element2) return;
    syncTagOverflow();
    element2.addEventListener("scroll", syncTagOverflow, {
      passive: true,
    });
    element2.addEventListener("wheel", handleTagWheel, {
      passive: false,
    });
    const observer2 = new ResizeObserver(syncTagOverflow);
    observer2.observe(element2);
    return () => {
      element2.removeEventListener("scroll", syncTagOverflow);
      element2.removeEventListener("wheel", handleTagWheel);
      observer2.disconnect();
    };
  }, [handleTagWheel, isFullMode, syncTagOverflow]);
  const handleTagScroll = reactExports.useCallback((direction) => {
    tagScrollRef.current?.scrollBy({
      left: direction === "left" ? -SKILL_TAG_SCROLL_STEP_PX : SKILL_TAG_SCROLL_STEP_PX,
      behavior: "smooth",
    });
  }, []);
  const handleTagScrollKeyDown = reactExports.useCallback(
    (event, direction) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      handleTagScroll(direction);
    },
    [handleTagScroll],
  );
  const handleTagSelectKeyDown = reactExports.useCallback((event, tag) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    setActiveTag(tag);
  }, []);
  reactExports.useEffect(() => {
    setFullActiveIndex(0);
  }, [displayedSkills.length, activeAgentCategory, activeTag, searchTerm]);
  const displayedSkillsRef = reactExports.useRef(displayedSkills);
  displayedSkillsRef.current = displayedSkills;
  const fullActiveIndexRef = reactExports.useRef(fullActiveIndex);
  fullActiveIndexRef.current = fullActiveIndex;
  reactExports.useEffect(() => {
    if (ending || !isFullMode) return;
    const handleKeyDown2 = (event) => {
      if (event.defaultPrevented) return;
      const skills2 = displayedSkillsRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
        return;
      }
      const eventTarget = event.target;
      if (
        eventTarget instanceof HTMLElement &&
        listRef.current?.contains(eventTarget) &&
        eventTarget.closest("button")
      ) {
        return;
      }
      if (skills2.length === 0) return;
      switch (event.key) {
        case "ArrowUp":
          setFullActiveIndex((prev) => (prev <= 0 ? skills2.length - 1 : prev - 1));
          break;
        case "ArrowDown":
          setFullActiveIndex((prev) => (prev >= skills2.length - 1 ? 0 : prev + 1));
          break;
        case "Enter":
        case "Tab": {
          const skill = skills2[fullActiveIndexRef.current];
          if (skill) handleSkillSelect(skill);
          break;
        }
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("keydown", handleKeyDown2, true);
    return () => document.removeEventListener("keydown", handleKeyDown2, true);
  }, [ending, isFullMode, onClose, handleSkillSelect]);
  reactExports.useLayoutEffect(() => {
    if (hoveredSkillTop === null || !previewRef.current || !listRef.current) return;
    const preview = previewRef.current;
    const rootRect = listRef.current.getBoundingClientRect();
    const previewHeight = preview.offsetHeight;
    setPreviewSide(getSkillCoverPreviewSide(rootRect, preview.offsetWidth, window.innerWidth));
    const safetyGap = 16;
    const desiredViewportTop = rootRect.top + hoveredSkillTop - previewHeight / 2;
    const viewportBottom = Math.min(window.innerHeight, rootRect.bottom);
    const clampedViewportTop = Math.min(
      Math.max(rootRect.top + safetyGap, desiredViewportTop),
      Math.max(rootRect.top + safetyGap, viewportBottom - previewHeight - safetyGap),
    );
    setPreviewTop(clampedViewportTop - rootRect.top + previewHeight / 2);
  }, [hoveredSkillTop]);
  reactExports.useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
    });
  }, [resolvedActiveIndex]);
  reactExports.useEffect(() => {
    if (ending || !onClose) return;
    const handleOutsideMouseDown = (event) => {
      const target = event.target;
      if (!target) return;
      if (listRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () => document.removeEventListener("mousedown", handleOutsideMouseDown);
  }, [ending, onClose, triggerRef]);
  reactExports.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = listRef.current;
    if (!anchor || !popover) return;
    const update2 = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const inputRoot = anchor.closest("[data-message-input-root]");
      const inputRect = inputRoot?.getBoundingClientRect() ?? anchorRect;
      const preferredWidth =
        displayMode === "inline" ? INLINE_SKILL_POPOVER_WIDTH : MESSAGE_INPUT_POPOVER_WIDTH;
      const width = Math.min(preferredWidth, inputRect.width, window.innerWidth - 16);
      const VIEWPORT_GAP2 = 8;
      let left = displayMode === "inline" ? anchorRect.left : inputRect.left;
      const maxLeft = window.innerWidth - width - VIEWPORT_GAP2;
      if (left > maxLeft) left = maxLeft;
      left = Math.max(VIEWPORT_GAP2, left);
      popover.style.position = "fixed";
      popover.style.width = `${width}px`;
      popover.style.zIndex = String(MESSAGE_INPUT_POPOVER_Z_INDEX);
      popover.style.left = `${left}px`;
      popover.style.setProperty(
        "--dp-quick-zoom-origin",
        displayMode !== "inline" && position2 === "down" ? "top left" : "bottom left",
      );
      const BOTTOM_GAP = 16;
      const MIN_HEIGHT = 120;
      if (displayMode === "inline") {
        const availableInlineHeight = Math.max(MIN_HEIGHT, anchorRect.top - 8);
        popover.style.bottom = `${window.innerHeight - anchorRect.top + 4}px`;
        popover.style.top = "";
        popover.style.maxHeight = `${Math.min(INLINE_SKILL_POPOVER_MAX_HEIGHT, availableInlineHeight)}px`;
      } else if (position2 === "down") {
        const topY = inputRect.bottom + HOME_POPOVER_GAP$1;
        popover.style.top = `${topY}px`;
        popover.style.bottom = "";
        popover.style.maxHeight = `${Math.max(MIN_HEIGHT, window.innerHeight - topY - BOTTOM_GAP)}px`;
      } else {
        popover.style.bottom = `${window.innerHeight - anchorRect.top + 4}px`;
        popover.style.top = "";
        popover.style.maxHeight = `${Math.max(MIN_HEIGHT, anchorRect.top - 8)}px`;
      }
      popover.style.visibility = "visible";
      popover.style.pointerEvents = "auto";
    };
    update2();
    window.addEventListener("scroll", update2, true);
    window.addEventListener("resize", update2);
    return () => {
      window.removeEventListener("scroll", update2, true);
      window.removeEventListener("resize", update2);
    };
  }, [anchorRef, position2, displayMode]);
  const handlePanelRef = reactExports.useCallback(
    (element2) => {
      listRef.current = element2;
      motionProps.ref.current = element2;
    },
    [motionProps.ref],
  );
  if (displayMode === "inline") {
    return reactDomExports.createPortal(
      <div
        {...motionProps}
        ref={handlePanelRef}
        inert={ending}
        aria-hidden={ending || void 0}
        id={id2}
        role="listbox"
        data-action-ui-id="slash-inline-skill-popover"
        style={{
          visibility: "hidden",
          pointerEvents: "none",
        }}
        className="dp-motion-quick-zoom elevated-surface-border flex flex-col overflow-hidden rounded-lg bg-popover p-1 shadow-lg"
        onMouseDown={(event) => event.preventDefault()}
      >
        <div className="shrink-0 px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
          {t2("skills.popover.inlineHeading", "My Skills")}
        </div>
        <div className="mr-0.5 min-h-0 overflow-y-auto overscroll-contain py-1 pr-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1! [&::-webkit-scrollbar-track]:bg-transparent! [&::-webkit-scrollbar-thumb]:rounded-full! [&::-webkit-scrollbar-thumb]:bg-foreground/20! [&::-webkit-scrollbar-thumb:hover]:bg-foreground/35!">
          {skills.length === 0 ? (
            <div
              data-action-ui-id="slash-inline-skill-empty"
              className="flex flex-col items-center gap-2 px-3 py-3 text-center text-xs text-muted-foreground select-none"
            >
              <SkillIcon size={20} strokeWidth={1.5} className="text-muted-foreground/60" />
              <p className="leading-relaxed">
                {onCreate ? (
                  <Trans
                    i18nKey="skills.popover.inlineNoMatchWithCreate"
                    components={{
                      create: (
                        <button
                          type="button"
                          data-action-ui-id="slash-inline-skill-create"
                          className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            onCreate();
                          }}
                        />
                      ),
                    }}
                  />
                ) : (
                  t2("skills.popover.inlineNoMatch", "无匹配项")
                )}
              </p>
            </div>
          ) : (
            skills.map((skill, index2) => {
              const isActive2 = index2 === activeIndex;
              return (
                <button
                  key={skill.name}
                  id={`slash-opt-${skill.name}`}
                  ref={isActive2 ? activeRef : void 0}
                  type="button"
                  role="option"
                  aria-selected={isActive2}
                  data-action-ui-id={`slash-inline-skill-${skill.name}`}
                  className={`flex w-full cursor-pointer rounded-sm px-3 py-1 text-left transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 ${isActive2 ? "bg-popup-item-active text-foreground" : "text-foreground/70 hover:bg-popup-item-hover hover:text-foreground"}`}
                  onClick={() => onSelect(skill)}
                  onMouseEnter={() => onHover(index2)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[13px] font-normal leading-5 text-foreground">
                      {getSkillDisplay(skill, i18n.language).displayName}
                    </span>
                    <span className="block truncate text-[12px] leading-4 text-muted-foreground/70">
                      /{skill.name}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.body,
    );
  }
  return reactDomExports.createPortal(
    <div
      {...motionProps}
      ref={handlePanelRef}
      inert={ending}
      aria-hidden={ending || void 0}
      id={id2}
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={
        displayedSkills[resolvedActiveIndex]
          ? `slash-opt-${displayedSkills[resolvedActiveIndex].name}`
          : void 0
      }
      data-action-ui-id="slash-cmd-popover"
      style={{
        visibility: "hidden",
        pointerEvents: "none",
      }}
      className="dp-motion-quick-zoom elevated-surface-border bg-popover rounded-xl shadow-lg p-1.5 flex flex-col overflow-visible [&>div:first-child]:shrink-0"
      onMouseDown={(e2) => e2.preventDefault()}
    >
      <CapabilityPopoverHeader
        title={
          skillPopoverMode !== "default"
            ? i18n.language.startsWith("zh")
              ? getAgentSkillTitle(skillPopoverMode)
              : `${getAgentSkillTitle(skillPopoverMode)} Skills`
            : t2("skills.popover.heading", "Skill")
        }
        description={t2("skills.popover.selectionDescription")}
        trailing={
          searchable && onSearchChange ? (
            <div className="relative w-40 shrink-0">
              <Search$2
                size={14}
                strokeWidth={1.5}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input3
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t2("skills.popover.search", "搜索 Skill")}
                data-action-ui-id="skill-popover-search"
                className="h-7 pl-7 text-xs"
                onMouseDown={(e2) => e2.stopPropagation()}
              />
            </div>
          ) : (
            void 0
          )
        }
      />
      <div className="flex min-w-0 shrink-0 items-center">
        {canScrollTagsLeft && (
          <button
            type="button"
            aria-label={t2("a11y.scrollTabsLeft", "Scroll tabs left")}
            data-action-ui-id="skill-popover-scroll-tags-left"
            onClick={() => handleTagScroll("left")}
            onKeyDown={(event) => handleTagScrollKeyDown(event, "left")}
            className="mx-0.5 flex h-7 w-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <ChevronLeft aria-hidden="true" size={14} strokeWidth={1.5} />
          </button>
        )}
        <fieldset
          ref={tagScrollRef}
          data-action-ui-id="skill-popover-tags-scroll"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 pt-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <legend className="sr-only">{t2("skills.popover.tabsLabel", "Skill categories")}</legend>
          {skillPopoverMode !== "default" ? (
            <>
              <button
                type="button"
                data-action-ui-id="skill-popover-agent-category-all"
                aria-pressed={activeAgentCategory === null}
                className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${activeAgentCategory === null ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setActiveAgentCategory(null)}
              >
                {i18n.language.startsWith("zh") ? "全部" : "All"}
              </button>
              {getAgentSkillCategories(skillPopoverMode).map((category) => (
                <button
                  key={category.value}
                  type="button"
                  data-action-ui-id={`skill-popover-agent-category-${category.value}`}
                  aria-pressed={activeAgentCategory === category.value}
                  className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${activeAgentCategory === category.value ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                  onClick={() => setActiveAgentCategory(category.value)}
                >
                  {i18n.language.startsWith("zh") ? category.label : category.labelEn}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                data-action-ui-id="skill-popover-tag-all"
                aria-pressed={!activeTag}
                className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${!activeTag ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setActiveTag(null)}
                onKeyDown={(event) => handleTagSelectKeyDown(event, null)}
              >
                {t2("skills.tag.all", "All")}
              </button>
              <button
                type="button"
                data-action-ui-id="skill-popover-tag-mine"
                aria-pressed={activeTag === MY_SKILLS_TAG}
                className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${activeTag === MY_SKILLS_TAG ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setActiveTag(MY_SKILLS_TAG)}
                onKeyDown={(event) => handleTagSelectKeyDown(event, MY_SKILLS_TAG)}
              >
                {t2("skills.tag.mine", "My Skills")}
              </button>
              <button
                type="button"
                data-action-ui-id="skill-popover-tag-featured"
                aria-pressed={activeTag === FEATURED_TAG}
                className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${activeTag === FEATURED_TAG ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                onClick={() => setActiveTag(FEATURED_TAG)}
                onKeyDown={(event) => handleTagSelectKeyDown(event, FEATURED_TAG)}
              >
                {t2("skills.tag.featured", "精选")}
              </button>
              {configuredCategories.map((category) => (
                <button
                  key={category.category}
                  type="button"
                  data-action-ui-id={`skill-popover-tag-${category.category}`}
                  aria-pressed={activeTag === category.category}
                  className={`inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-xs whitespace-nowrap transition-colors ${activeTag === category.category ? "bg-foreground/[0.06] font-medium text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                  onClick={() => setActiveTag(category.category)}
                  onKeyDown={(event) => handleTagSelectKeyDown(event, category.category)}
                >
                  {isZh ? category.cn_name : category.en_name}
                </button>
              ))}
            </>
          )}
        </fieldset>
        {canScrollTagsRight && (
          <button
            type="button"
            aria-label={t2("a11y.scrollTabsRight", "Scroll tabs right")}
            data-action-ui-id="skill-popover-scroll-tags-right"
            onClick={() => handleTagScroll("right")}
            onKeyDown={(event) => handleTagScrollKeyDown(event, "right")}
            className="mx-0.5 flex h-7 w-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <ChevronRight$1 aria-hidden="true" size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {searchTerm && (
        <div
          data-action-ui-id="skill-search-scope-summary"
          className={`flex shrink-0 justify-end px-3 pb-1.5 text-right text-[11px] text-muted-foreground ${isVisibleSkillsLoading ? "invisible" : ""}`}
        >
          <span className="truncate">
            {activeTagLabel
              ? t2("skills.popover.search.tagResults", {
                  tag: activeTagLabel,
                  count: searchResults.length,
                })
              : t2("skills.popover.search.allResults", {
                  count: searchResults.length,
                })}
          </span>
        </div>
      )}
      <div
        ref={scrollRef}
        data-action-ui-id="skill-popover-list"
        aria-busy={showSkillsSkeleton}
        className={`min-h-0 overflow-y-auto scrollbar-none px-1.5 pb-1.5 flex flex-col gap-0.5 [&>button]:shrink-0 ${searchTerm ? "max-h-72" : "h-64"}`}
      >
        {showSkillsSkeleton && (
          <>
            <span className="sr-only" role="status">
              {t2("skills.popover.loadingRecommended", "加载推荐Skill中...")}
            </span>
            <SkillPopoverSkeleton />
          </>
        )}
        {displayedSkills.length === 0 && !showSkillsSkeleton && (
          <div className="flex flex-col items-center gap-3 px-3 py-8 text-center select-none">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {searchTerm && activeTagLabel ? (
                <Trans
                  i18nKey="skills.popover.empty.notFoundInTag"
                  values={{
                    tag: activeTagLabel,
                  }}
                  components={{
                    all: (
                      <button
                        type="button"
                        data-action-ui-id="skill-empty-view-all"
                        className="cursor-pointer text-foreground underline-offset-2 hover:underline"
                        onClick={() => setActiveTag(null)}
                      />
                    ),
                  }}
                />
              ) : searchTerm ? (
                t2("skills.popover.empty.notFound")
              ) : market.error ? (
                t2("skills.market.error")
              ) : (
                t2("skills.market.empty")
              )}
            </p>
          </div>
        )}
        {displayedSkills.map((skill, index2) => {
          const isActive2 = index2 === resolvedActiveIndex;
          if (isLocalSkill(skill)) {
            return (
              <SkillItem
                key={skill.name}
                skill={skill}
                index={index2}
                activeIndex={resolvedActiveIndex}
                activeRef={activeRef}
                onSelect={handleSkillSelect}
                onHover={handleHover}
                lang={i18n.language}
                onCoverPreviewEnter={handleCoverPreviewEnter}
                onCoverPreviewLeave={schedulePreviewHide}
                disabled={pendingSkillNames.has(skill.name)}
              />
            );
          }
          const display = getSkillDisplay(skill, i18n.language);
          return (
            <button
              key={skill.name}
              id={`slash-opt-${skill.name}`}
              ref={isActive2 ? activeRef : void 0}
              type="button"
              role="option"
              aria-selected={isActive2}
              aria-busy={market.installingSet.has(skill.name) || pendingSkillNames.has(skill.name)}
              data-action-ui-id={`slash-cmd-${skill.name}`}
              className={`list-row-hit-area [--list-row-gap:2px] first:before:top-0 last:before:bottom-0 w-full flex flex-col gap-0.5 px-2.5 py-2 text-left cursor-pointer rounded-md transition-colors ${isActive2 ? "bg-popup-item-active" : "hover:bg-popup-item-active"}`}
              onClick={() => handleSkillSelect(skill)}
              disabled={market.installingSet.has(skill.name) || pendingSkillNames.has(skill.name)}
              onMouseEnter={(event) => {
                handleHover(index2);
                handleCoverPreviewEnter(skill, event.currentTarget);
              }}
              onMouseLeave={schedulePreviewHide}
            >
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="text-[13px] leading-[20px] text-foreground truncate">
                  {display.displayName}
                </span>
                <span className="text-[12px] shrink-0 text-muted-foreground/70">/{skill.name}</span>
              </span>
              <span className="text-[12px] text-muted-foreground truncate">{display.summary}</span>
              {market.installingSet.has(skill.name) && (
                <span
                  role="progressbar"
                  aria-label={t2("skills.market.installing", "安装中…")}
                  className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-foreground/10"
                >
                  <span className="skill-install-progress block h-full w-1/3 rounded-full bg-brand-accent" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {(onCreate || onExplore) && (
        <div className="mt-1 flex shrink-0 gap-2 border-t border-border/40 px-2 pt-2">
          {onExplore && (
            <Button$1
              type="button"
              variant="outline"
              data-action-ui-id="skill-explore-trigger"
              className="flex-1 rounded-md border-transparent bg-foreground/[0.06] hover:bg-foreground/[0.06]"
              onMouseDown={(e2) => e2.preventDefault()}
              onClick={(e2) => {
                e2.stopPropagation();
                onClose?.();
                onExplore();
              }}
            >
              <Search$2 size={13} strokeWidth={1.5} />
              {t2("skills.popover.exploreMore", "探索更多")}
            </Button$1>
          )}
          {onCreate && (
            <Button$1
              type="button"
              data-action-ui-id="skill-create-btn"
              className="flex-1 rounded-md border-transparent"
              onMouseDown={(e2) => {
                e2.preventDefault();
                onCreate();
              }}
            >
              <Plus$2 size={13} strokeWidth={1.8} />
              {t2("skills.popover.create")}
            </Button$1>
          )}
        </div>
      )}
      {hoveredPreviewSkill && (
        // biome-ignore lint/a11y/noStaticElementInteractions: hover bridge for the preview panel
        <div
          ref={previewRef}
          role="presentation"
          data-action-ui-id="skill-hover-preview"
          style={{
            top: previewTop ?? hoveredSkillTop ?? 0,
            transform: "translateY(-50%)",
            maxHeight: "calc(100vh - 24px)",
          }}
          className={`elevated-surface-border absolute z-50 w-72 overflow-hidden rounded-xl bg-popover shadow-xl ${previewSide === "right" ? "left-[calc(100%+8px)]" : "right-[calc(100%+8px)]"}`}
          onMouseEnter={cancelPreviewHide}
          onMouseLeave={schedulePreviewHide}
        >
          <div className="h-40 w-full bg-muted">
            <SkillCoverMedia
              url={previewCover}
              alt={hoveredPreviewSkill.displayNameZh || hoveredPreviewSkill.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-2 p-4">
            <div className="text-sm font-medium text-foreground">
              {i18n.language.startsWith("zh")
                ? hoveredPreviewSkill.displayNameZh || hoveredPreviewSkill.name
                : hoveredPreviewSkill.name}
            </div>
            <div
              className={`text-xs leading-relaxed text-muted-foreground ${previewUsesFallback ? "max-h-40 overflow-y-auto whitespace-pre-wrap" : "line-clamp-4"}`}
            >
              {previewUsesFallback
                ? previewDisplay?.description || previewDisplay?.summary
                : previewDisplay?.summary}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
