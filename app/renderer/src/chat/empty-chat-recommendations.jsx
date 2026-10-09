// empty-chat-recommendations.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  resolveSkillCoverUrl,
  SkillCoverMedia,
  toDisplayName,
} from "../generation/use-mention-models.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import {
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { ImageOutlineIcon } from "../media-editing/package.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { MarkdownContent } from "../generation/markdown-link.jsx";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { resolveHomeFeaturedSkillPrompt } from "../workspace/build-inspiration-media-showcase-collections.js";
import { buildMediaShowcaseCollections } from "../workspace/build-media-showcase-collections.js";
import { useLoginGuard } from "../infra/schedule.js";
import { getAgentSkillBrowseSkills } from "../workspace/clip-editor-skill-categories.js";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { HubLogo } from "../infra/hub-logo.jsx";
import { useMarketSkills } from "../workspace/use-market-skills.js";
import { VideoLightbox } from "../media-editing/video-lightbox.jsx";
import { DEFAULT_HOME_QUICK_START_CONFIG } from "../workspace/scene-categories.js";
import { useEnsureSkillReady } from "../workspace/use-ensure-skill-ready.js";
import { useHomeQuickStartConfig } from "../workspace/use-home-quick-start-config.js";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";
function shuffle(items, random) {
  const next2 = [...items];
  for (let index2 = next2.length - 1; index2 > 0; index2 -= 1) {
    const swapIndex = Math.floor(random() * (index2 + 1));
    [next2[index2], next2[swapIndex]] = [next2[swapIndex], next2[index2]];
  }
  return next2;
}
const EMPTY_CHAT_RECOMMENDATION_BATCH_SIZE = 4;
function pickRecommendationBatch(
  items,
  previousIds = [],
  random = Math.random,
) {
  const seen2 = new Set();
  const unique2 = items.filter((item) => {
    if (seen2.has(item.id)) return false;
    seen2.add(item.id);
    return true;
  });
  const previous2 = new Set(previousIds);
  const preferred = unique2.filter((item) => !previous2.has(item.id));
  const fallback = unique2.filter((item) => previous2.has(item.id));
  const pool = [...shuffle(preferred, random), ...shuffle(fallback, random)];
  return pool.slice(0, EMPTY_CHAT_RECOMMENDATION_BATCH_SIZE);
}
const HOME_FEATURED_SKILL_SOURCE = "official-featured";
const NODE_AGENT_SKILL_PAGE_SIZE = 100;
const EMPTY_RECOMMENDATIONS_SUBTITLE_KEYS = {
  "clip-editor": "chat.emptyRecommendations.subtitle.clipAgent",
  "director-stage": "chat.emptyRecommendations.subtitle.directorAgent",
  "text-editor": "chat.emptyRecommendations.subtitle.textAgent",
};
const NODE_AGENT_SKILL_TAB_KEYS = {
  "clip-editor": "chat.emptyRecommendations.skillTab.clipAgent",
  "director-stage": "chat.emptyRecommendations.skillTab.directorAgent",
  "text-editor": "chat.emptyRecommendations.skillTab.textAgent",
};
const NODE_AGENT_INTRO_KEYS = {
  "clip-editor": "chat.clipEditAgent.intro",
  "director-stage": "chat.directorStageAgent.intro",
  "text-editor": "chat.textEditAgent.intro",
};
function getFeaturedCategory(categories) {
  return categories.find((category) => category.kind === "featured-skills");
}
function ShowcaseCard({
  item,
  isZh,
  useLabel,
  fullscreenLabel,
  onClick,
  onFullscreen,
}) {
  const videoRef = reactExports.useRef(null);
  const title = isZh ? item.title : item.titleEn;
  const previewStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => void 0);
  };
  const previewStop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };
  const handlePreview = (event) => {
    event.stopPropagation();
    const video = videoRef.current;
    const initialPlaybackTime = video?.currentTime ?? 0;
    video?.pause();
    onFullscreen(initialPlaybackTime, (currentTime) => {
      const inlineVideo = videoRef.current;
      if (!inlineVideo) return;
      inlineVideo.currentTime = currentTime;
    });
  };
  return (
    <article
      className="home-media-showcase-card group relative flex h-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card p-2 text-left transition-colors hover:bg-muted"
      data-action-ui-id="chat-showcase-card"
      onMouseEnter={previewStart}
      onMouseLeave={previewStop}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`${useLabel}: ${title}`}
        onClick={onClick}
        data-action-ui-id="chat-showcase-card-use"
      />
      <div className="home-media-showcase-media-frame pointer-events-none relative z-[2] h-full w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.coverUrl}
            muted={true}
            loop={true}
            playsInline={true}
            preload="metadata"
            aria-label={title}
            data-home-media-loaded="true"
            className="home-media-showcase-media h-full w-full object-cover"
          />
        ) : item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            data-home-media-loaded="true"
            className="home-media-showcase-media h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOutlineIcon size={24} strokeWidth={1.5} />
          </span>
        )}
        {item.videoUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-transparent! p-0 hover:opacity-90 pointer-events-none absolute inset-0 z-[3] m-auto size-7 rounded-full border-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            aria-label={`${fullscreenLabel}: ${title}`}
            onClick={handlePreview}
            data-action-ui-id="chat-showcase-card-preview"
          >
            <PlaybackPlayIcon
              size={16}
              className="text-[var(--media-overlay-foreground)] drop-shadow-sm"
            />
          </Button>
        ) : null}
      </div>
      <h3 className="line-clamp-2 min-w-0 flex-1 whitespace-normal px-1 text-xs font-medium leading-4 text-foreground [overflow-wrap:anywhere]">
        {title}
      </h3>
    </article>
  );
}
function SkillCard({
  skill,
  isZh,
  useLabel,
  installingLabel,
  installing,
  installProgress,
  disabled: disabled2,
  textOnly,
  onClick,
}) {
  const title = isZh
    ? skill.displayNameZh || toDisplayName(skill.name)
    : toDisplayName(skill.name);
  const normalizedProgress = Math.min(1, Math.max(0, installProgress ?? 0.08));
  return (
    <article
      className={`home-media-showcase-card group relative flex h-full min-w-0 items-center gap-2 overflow-hidden p-2 text-left transition-colors ${textOnly ? "rounded-none border-0 bg-transparent hover:bg-transparent" : "rounded-lg border border-border bg-card hover:bg-muted"}`}
      data-action-ui-id="chat-skill-card"
      data-installing={installing ? "true" : void 0}
      aria-disabled={disabled2 || void 0}
      aria-busy={installing || void 0}
    >
      <button
        type="button"
        className="absolute inset-0 z-[1] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default"
        aria-label={`${installing ? installingLabel : useLabel}: ${title}`}
        onClick={onClick}
        disabled={disabled2}
        data-action-ui-id="chat-skill-card-use"
      />
      {textOnly ? null : (
        <div className="home-media-showcase-media-frame relative h-full w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          <div
            className="home-media-showcase-media h-full w-full"
            data-home-media-loaded="true"
          >
            <SkillCoverMedia
              url={resolveSkillCoverUrl(skill)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          {installing ? (
            <span
              className="home-skill-install-indicator pointer-events-none absolute inset-0 z-[4] m-auto size-7"
              style={{
                "--home-skill-install-angle": `${Math.round(normalizedProgress * 360)}deg`,
              }}
              role="progressbar"
              aria-label={`${installingLabel}: ${title}`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={normalizedProgress}
            />
          ) : null}
        </div>
      )}
      <h3
        className={`line-clamp-2 min-w-0 flex-1 whitespace-normal px-1 text-xs font-medium leading-4 text-foreground [overflow-wrap:anywhere] ${textOnly ? "text-center" : ""}`}
      >
        {textOnly && installing ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label={`${installingLabel}: ${title}`}
              data-action-ui-id="chat-skill-card-loading"
            />
            <span>{title}</span>
          </span>
        ) : (
          title
        )}
      </h3>
    </article>
  );
}
export function EmptyChatRecommendations({
  onSelectShowcase,
  onSelectSkill,
  skillMode,
}) {
  const { t: t2, i18n } = useTranslation();
  const { user } = useAuth();
  const { guard: loginGuard } = useLoginGuard();
  const { ensureSkillReady } = useEnsureSkillReady();
  const { config: config2, source: configSource } = useHomeQuickStartConfig();
  const [tab2, setTab] = reactExports.useState(
    skillMode ? "skill" : "showcase",
  );
  const [showcaseBatch, setShowcaseBatch] = reactExports.useState([]);
  const [skillBatch, setSkillBatch] = reactExports.useState([]);
  const [installingSkillName, setInstallingSkillName] =
    reactExports.useState(null);
  const [installingSkillProgress, setInstallingSkillProgress] =
    reactExports.useState(null);
  const [previewSession, setPreviewSession] = reactExports.useState(null);
  const installingSkillRef = reactExports.useRef(null);
  const isZh = i18n.language?.startsWith("zh") ?? false;
  const recommendationCategories =
    configSource === "loading"
      ? DEFAULT_HOME_QUICK_START_CONFIG.categories
      : config2.categories;
  const featuredCategory = reactExports.useMemo(
    () => getFeaturedCategory(recommendationCategories),
    [recommendationCategories],
  );
  const market = useMarketSkills(
    void 0,
    skillMode ? void 0 : HOME_FEATURED_SKILL_SOURCE,
    skillMode ? NODE_AGENT_SKILL_PAGE_SIZE : void 0,
  );
  const showcaseItems = reactExports.useMemo(
    () =>
      buildMediaShowcaseCollections({
        categories: recommendationCategories,
        featuredLabel: t2("home.mediaShowcase.featured", {
          defaultValue: "精选",
        }),
      })
        .flatMap((collection) => collection.items)
        .filter((item) => item.action.kind === "query"),
    [recommendationCategories, t2],
  );
  const featuredSkills = reactExports.useMemo(() => {
    if (!skillMode) return market.skills;
    return getAgentSkillBrowseSkills(market.skills, [], skillMode, null).filter(
      (skill) => !("enabled" in skill),
    );
  }, [market.skills, skillMode]);
  reactExports.useEffect(() => {
    void market.fetchList();
  }, [market.fetchList]);
  reactExports.useEffect(() => {
    setShowcaseBatch((current2) =>
      current2.length ? current2 : pickRecommendationBatch(showcaseItems),
    );
  }, [showcaseItems]);
  reactExports.useEffect(() => {
    setSkillBatch((current2) =>
      current2.length
        ? current2
        : pickRecommendationBatch(
            featuredSkills.map((skill) => ({
              ...skill,
              id: skill.name,
            })),
          ),
    );
  }, [featuredSkills]);
  const handleRefresh = () => {
    if (tab2 === "showcase") {
      setShowcaseBatch((current2) =>
        pickRecommendationBatch(
          showcaseItems,
          current2.map((item) => item.id),
        ),
      );
      return;
    }
    setSkillBatch((current2) =>
      pickRecommendationBatch(
        featuredSkills.map((skill) => ({
          ...skill,
          id: skill.name,
        })),
        current2.map((skill) => skill.name),
      ),
    );
  };
  const handleSkillSelect = reactExports.useCallback(
    async (skill, prompt) => {
      if (!loginGuard() || installingSkillRef.current) return;
      installingSkillRef.current = skill.name;
      setInstallingSkillName(skill.name);
      setInstallingSkillProgress(0.08);
      try {
        const ready = await ensureSkillReady(
          skill.name,
          setInstallingSkillProgress,
        );
        if (!ready) return;
        market.markInstalled(skill.name);
        setSkillBatch((current2) =>
          current2.map((item) =>
            item.name === skill.name
              ? {
                  ...item,
                  installed: true,
                }
              : item,
          ),
        );
        onSelectSkill(skill, prompt);
      } finally {
        if (installingSkillRef.current === skill.name) {
          installingSkillRef.current = null;
          setInstallingSkillName(null);
          setInstallingSkillProgress(null);
        }
      }
    },
    [ensureSkillReady, loginGuard, market, onSelectSkill],
  );
  const hasCards =
    tab2 === "showcase" ? showcaseBatch.length > 0 : skillBatch.length > 0;
  const greetingName =
    user?.username?.trim() || t2("chat.emptyRecommendations.creator");
  const subtitleKey = skillMode
    ? EMPTY_RECOMMENDATIONS_SUBTITLE_KEYS[skillMode]
    : "chat.emptyRecommendations.subtitle";
  const recommendationTabs = skillMode ? ["skill"] : ["showcase", "skill"];
  const skillTabLabel = skillMode
    ? t2(NODE_AGENT_SKILL_TAB_KEYS[skillMode])
    : t2("chat.emptyRecommendations.skillTab");
  const nodeIntro = skillMode ? t2(NODE_AGENT_INTRO_KEYS[skillMode]) : void 0;
  return (
    <section
      className={`w-full px-4 ${nodeIntro ? "pt-[100px] pb-4" : "py-4"}`}
      data-action-ui-id="chat-empty-recommendations"
    >
      <div
        className="@container/empty-recommendations mx-auto flex w-full flex-col gap-4"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        <div className="flex items-center gap-3">
          <HubLogo
            size={36}
            winkOnHover={true}
            className="shrink-0 text-brand-accent"
          />
          <div>
            <h2 className="text-title-20 font-heading font-medium text-foreground">
              {t2("chat.emptyRecommendations.greeting", {
                name: greetingName,
              })}
            </h2>
            <p className="text-body-13 text-muted-foreground">
              {t2(subtitleKey)}
            </p>
          </div>
        </div>
        {nodeIntro && (
          <div className="mt-2 text-body-15 text-foreground/80">
            <MarkdownContent content={nodeIntro} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-sm ${skillMode ? "" : "bg-tab-list-bg p-1"}`}
            role="tablist"
          >
            {recommendationTabs.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab2 === value}
                onClick={() => setTab(value)}
                className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-sm px-3 text-xs font-medium transition-colors ${skillMode ? "bg-tab-list-bg text-foreground" : "text-muted-foreground hover:text-foreground aria-selected:bg-tab-active-bg aria-selected:text-foreground aria-selected:shadow-tab-active"}`}
              >
                {value === "showcase"
                  ? t2("chat.emptyRecommendations.showcaseTab")
                  : skillTabLabel}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={!hasCards}
            aria-label={t2("chat.emptyRecommendations.refresh")}
            data-action-ui-id="chat-empty-recommendations-refresh"
            className="h-7 shrink-0 gap-1.5 whitespace-nowrap px-2 text-xs text-muted-foreground"
          >
            <RetryIcon size={14} aria-hidden="true" />
            <span className="hidden @min-[400px]/empty-recommendations:inline">
              {t2("chat.emptyRecommendations.refresh")}
            </span>
          </Button>
        </div>
        <div
          className="@container/recommendations min-h-[128px]"
          role="tabpanel"
        >
          <div
            className={`${skillMode ? "grid grid-cols-2" : "grid grid-cols-1 @min-[480px]/recommendations:grid-cols-2"} auto-rows-[60px] gap-2`}
            data-action-ui-id="chat-empty-recommendations-grid"
          >
            {tab2 === "showcase"
              ? showcaseBatch.map((item) => (
                  <ShowcaseCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    useLabel={t2("home.mediaShowcase.use")}
                    fullscreenLabel={t2("canvas.fullscreenPreview")}
                    onClick={() => onSelectShowcase(item)}
                    onFullscreen={(initialPlaybackTime, onPlaybackTimeCommit) =>
                      setPreviewSession({
                        item,
                        initialPlaybackTime,
                        onPlaybackTimeCommit,
                      })
                    }
                  />
                ))
              : skillBatch.map((skill) => {
                  const preset2 = featuredCategory?.skills.find(
                    (item) => item.name === skill.name,
                  );
                  return (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      isZh={isZh}
                      useLabel={t2("home.mediaShowcase.useSkill")}
                      installingLabel={t2("skills.market.installing")}
                      installing={installingSkillName === skill.name}
                      installProgress={
                        installingSkillName === skill.name
                          ? installingSkillProgress
                          : null
                      }
                      disabled={installingSkillName !== null}
                      textOnly={Boolean(skillMode)}
                      onClick={() =>
                        void handleSkillSelect(
                          skill,
                          resolveHomeFeaturedSkillPrompt(skill, preset2, isZh),
                        )
                      }
                    />
                  );
                })}
          </div>
        </div>
      </div>
      {previewSession ? (
        <VideoLightbox
          src={previewSession.item.videoUrl}
          ariaLabel={
            isZh ? previewSession.item.title : previewSession.item.titleEn
          }
          showShadow={false}
          initialPlaybackTime={previewSession.initialPlaybackTime}
          onPlaybackTimeCommit={previewSession.onPlaybackTimeCommit}
          onClose={() => setPreviewSession(null)}
        />
      ) : null}
    </section>
  );
}
