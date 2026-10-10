// 展示区的卡片、技能卡片、以及视频预览（含预览的状态与生命周期）。
import { useTranslation, reactExports, jsxRuntimeExports, workspaceLog, LoaderCircle, Volume2, BadgeCheck, usePlatform, TabsIndicator } from "../vendor.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { Icon, getCreationGuideUrlsByLocale, openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { SkillIcon, UsePromptIcon, RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { ProjectImportIcon, FilledSkillIcon } from "../workspace/home-service.jsx";
import { VolumeX, Maximize2, formatTime } from "../media-editing/package.jsx";
import { resolveSkillCoverUrl, toDisplayName, SkillCoverMedia, StableTabLabel } from "../generation/use-mention-models.jsx";
import { buildInspirationMediaShowcaseCollections } from "../workspace/build-inspiration-media-showcase-collections.js";
import { buildMediaShowcaseCollections } from "../workspace/build-media-showcase-collections.js";
import { skillVerticals } from "../generation/normalize-skill-detail-metadata.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../workspace/shortcut-hint.jsx";
import { VideoLightbox } from "../media-editing/video-lightbox.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { homeShowcasePosterThumbnailUrl } from "./media-urls.js";
import { prefersReducedMotion } from "./motion-utils.js";
import { HomeRandomInspirationBridge } from "./prompt-picker.jsx";
import { captureHomeUsePromptTransferOrigin } from "./prompt-transfer.js";
let activePreviewVideo = null;
let mountedPreviewCardCount = 0;
const MEDIA_LOAD_ROOT_MARGIN = "240px 0px";
const previewAttemptByVideo = new WeakMap();
const previewMutedStateByVideo = new WeakMap();
const previewPlayingStateByVideo = new WeakMap();
function beginPreviewAttempt(video) {
  const nextAttempt = (previewAttemptByVideo.get(video) ?? 0) + 1;
  previewAttemptByVideo.set(video, nextAttempt);
  return nextAttempt;
}
function isCurrentPreviewAttempt(video, attempt) {
  return previewAttemptByVideo.get(video) === attempt;
}
function resetVideo(video) {
  beginPreviewAttempt(video);
  video.muted = true;
  previewMutedStateByVideo.get(video)?.(true);
  previewPlayingStateByVideo.get(video)?.(false);
  video.pause();
  try {
    video.currentTime = 0;
  } catch {}
  video.load();
  if (activePreviewVideo === video) activePreviewVideo = null;
}
function deactivatePreviewVideo(video) {
  beginPreviewAttempt(video);
  video.muted = true;
  previewMutedStateByVideo.get(video)?.(true);
  previewPlayingStateByVideo.get(video)?.(false);
  video.pause();
  if (activePreviewVideo === video) activePreviewVideo = null;
}
function normalizePlaybackTime(video, currentTime) {
  if (!Number.isFinite(currentTime) || currentTime < 0) return 0;
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return Math.min(currentTime, video.duration);
  }
  return currentTime;
}
function stopActivePreview() {
  if (activePreviewVideo) resetVideo(activePreviewVideo);
}
function handlePreviewWindowBlur() {
  stopActivePreview();
}
function handlePreviewVisibilityChange() {
  if (document.visibilityState !== "visible") stopActivePreview();
}
function subscribeToPreviewLifecycle() {
  mountedPreviewCardCount += 1;
  if (mountedPreviewCardCount === 1) {
    window.addEventListener("blur", handlePreviewWindowBlur);
    document.addEventListener("visibilitychange", handlePreviewVisibilityChange);
  }
  return () => {
    mountedPreviewCardCount = Math.max(0, mountedPreviewCardCount - 1);
    if (mountedPreviewCardCount === 0) {
      window.removeEventListener("blur", handlePreviewWindowBlur);
      document.removeEventListener("visibilitychange", handlePreviewVisibilityChange);
    }
  };
}
function resolveMediaShowcasePoster(item, videoOrientation) {
  if (videoOrientation === "portrait") {
    if (item.portraitCoverUrl) {
      return {
        fit: item.portraitCoverFit ?? "contain",
        source: "portrait",
        url: item.portraitCoverUrl
      };
    }
    return {
      fit: "cover",
      source: "fallback",
      url: item.landscapeCoverUrl ?? item.coverUrl
    };
  }
  if (item.landscapeCoverUrl) {
    return {
      fit: "contain",
      source: "landscape",
      url: item.landscapeCoverUrl
    };
  }
  if (item.portraitCoverUrl) {
    return {
      fit: "contain",
      source: "portrait",
      url: item.portraitCoverUrl
    };
  }
  return {
    fit: "contain",
    source: "fallback",
    url: item.coverUrl
  };
}
function MediaShowcaseCard({
  item,
  isZh,
  videoOrientation,
  posterLoading = "lazy",
  dataContentId,
  dataVideoId,
  useLabel,
  fullscreenLabel,
  durationLabel,
  muteLabel,
  unmuteLabel,
  actionPending = false,
  onUse,
  onFullscreen
}) {
  const cardRef = reactExports.useRef(null);
  const videoRef = reactExports.useRef(null);
  const resumePlaybackTimeRef = reactExports.useRef(null);
  const pendingPreviewIntentRef = reactExports.useRef(false);
  const playPreviewRef = reactExports.useRef(() => void 0);
  const [videoDuration, setVideoDuration] = reactExports.useState("--:--");
  const [isMuted, setIsMuted] = reactExports.useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = reactExports.useState(false);
  const [shouldLoadMedia, setShouldLoadMedia] = reactExports.useState(false);
  const [loadedMediaKey, setLoadedMediaKey] = reactExports.useState(null);
  const [failedMediaKey, setFailedMediaKey] = reactExports.useState(null);
  const [originalPosterFallbackKey, setOriginalPosterFallbackKey] = reactExports.useState(null);
  const [failedPosterKey, setFailedPosterKey] = reactExports.useState(null);
  const poster = resolveMediaShowcasePoster(item, videoOrientation);
  const {
    fit: posterFit,
    source: posterSource,
    url: posterUrl
  } = poster;
  const posterThumbnailUrl = homeShowcasePosterThumbnailUrl(posterUrl, videoOrientation);
  const posterObjectFitClass = posterFit === "cover" ? "object-cover" : "object-contain";
  const hasPreviewVideo = Boolean(item.videoUrl);
  const mediaKey = item.videoUrl ?? "";
  const previousMediaKeyRef = reactExports.useRef(mediaKey);
  const posterKey = `${posterThumbnailUrl}
${posterUrl}`;
  const activePosterUrl = originalPosterFallbackKey === posterKey ? posterUrl : posterThumbnailUrl;
  const activePosterKey = `${posterKey}
${activePosterUrl}`;
  const isMediaReady = !hasPreviewVideo || loadedMediaKey === mediaKey;
  const isMediaFailed = failedMediaKey === mediaKey;
  const title = isZh ? item.title : item.titleEn;
  const description = isZh ? item.description : item.descriptionEn;
  const attribution = isZh ? item.attribution : item.attributionEn;
  const actionLabel = isZh ? item.actionLabel ?? useLabel : item.actionLabelEn ?? useLabel;
  const attributionLabel = attribution.startsWith("@") ? attribution : `@${attribution}`;
  const stopPreview = () => {
    pendingPreviewIntentRef.current = false;
    const video = videoRef.current;
    if (video && activePreviewVideo === video) resetVideo(video);
  };
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setLoadedMediaKey(mediaKey);
    setFailedMediaKey(null);
    setVideoDuration(Number.isFinite(video.duration) && video.duration > 0 ? formatTime(video.duration, true) : "--:--");
  };
  const handleMediaError = () => {
    const video = videoRef.current;
    if (video) deactivatePreviewVideo(video);
    setFailedMediaKey(mediaKey);
    workspaceLog.warn("home: showcase-media-error", {
      videoUrl: item.videoUrl,
      coverUrl: posterUrl
    });
  };
  const retryFailedMedia = () => {
    if (!isMediaFailed) return;
    setFailedMediaKey(null);
    videoRef.current?.load();
  };
  const startPlayback = (video, attempt, muted) => {
    video.muted = muted;
    setIsMuted(muted);
    const handleRejection = () => {
      if (activePreviewVideo !== video || !isCurrentPreviewAttempt(video, attempt)) return;
      if (!muted) {
        startPlayback(video, attempt, true);
        return;
      }
      resetVideo(video);
    };
    try {
      const started = video.play();
      if (started && typeof started.catch === "function") started.catch(handleRejection);
    } catch {
      handleRejection();
    }
  };
  const playPreview = () => {
    if (prefersReducedMotion()) return;
    const video = videoRef.current;
    if (!video) return;
    if (activePreviewVideo && activePreviewVideo !== video) {
      resetVideo(activePreviewVideo);
    }
    const startTime = resumePlaybackTimeRef.current ?? 0;
    try {
      video.currentTime = normalizePlaybackTime(video, startTime);
      resumePlaybackTimeRef.current = null;
    } catch {}
    activePreviewVideo = video;
    previewPlayingStateByVideo.get(video)?.(true);
    startPlayback(video, beginPreviewAttempt(video), false);
  };
  playPreviewRef.current = playPreview;
  const handlePreviewIntent = () => {
    if (isMediaFailed) return;
    const video = videoRef.current;
    if (!video || activePreviewVideo === video) return;
    const scrollRoot = video.closest(".home-content-grid");
    if (scrollRoot?.dataset.homeWheelActive === "true") return;
    if (!shouldLoadMedia) {
      pendingPreviewIntentRef.current = true;
      setShouldLoadMedia(true);
      return;
    }
    playPreview();
  };
  const handleFullscreen = () => {
    const video = videoRef.current;
    const initialPlaybackTime = video ? normalizePlaybackTime(video, video.currentTime) : 0;
    if (video && activePreviewVideo === video) {
      deactivatePreviewVideo(video);
    } else {
      stopActivePreview();
    }
    onFullscreen(item, initialPlaybackTime, currentTime => {
      const inlineVideo = videoRef.current;
      if (!inlineVideo) return;
      const resumedTime = normalizePlaybackTime(inlineVideo, currentTime);
      resumePlaybackTimeRef.current = resumedTime;
      try {
        inlineVideo.currentTime = resumedTime;
      } catch {}
    });
  };
  const handleAudioToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };
  const handlePosterError = () => {
    if (activePosterUrl === posterThumbnailUrl && posterThumbnailUrl !== posterUrl) {
      setOriginalPosterFallbackKey(posterKey);
      return;
    }
    setFailedPosterKey(activePosterKey);
  };
  reactExports.useEffect(() => {
    if (!hasPreviewVideo || shouldLoadMedia) return;
    const card = cardRef.current;
    if (!card) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setShouldLoadMedia(true);
      observer.disconnect();
    }, {
      rootMargin: MEDIA_LOAD_ROOT_MARGIN
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [hasPreviewVideo, shouldLoadMedia]);
  reactExports.useEffect(() => {
    if (!shouldLoadMedia || !pendingPreviewIntentRef.current) return;
    pendingPreviewIntentRef.current = false;
    playPreviewRef.current();
  }, [shouldLoadMedia]);
  reactExports.useEffect(() => {
    if (previousMediaKeyRef.current === mediaKey) return;
    previousMediaKeyRef.current = mediaKey;
    pendingPreviewIntentRef.current = false;
    resumePlaybackTimeRef.current = null;
    setLoadedMediaKey(null);
    setFailedMediaKey(null);
    setVideoDuration("--:--");
    const video = videoRef.current;
    if (video) deactivatePreviewVideo(video);
  }, [mediaKey]);
  reactExports.useEffect(() => {
    const video = videoRef.current;
    const unsubscribe = subscribeToPreviewLifecycle();
    if (video) previewMutedStateByVideo.set(video, setIsMuted);
    if (video) previewPlayingStateByVideo.set(video, setIsPreviewPlaying);
    return () => {
      if (video) previewMutedStateByVideo.delete(video);
      if (video) previewPlayingStateByVideo.delete(video);
      if (video && activePreviewVideo === video) resetVideo(video);
      unsubscribe();
    };
  }, []);
  const useActionButton = <Button type="button" variant="ghost" size="sm" className={`home-media-showcase-use-button h-9 min-w-0 gap-1.5 rounded-full border-0 px-3 ${hasPreviewVideo ? "max-w-[calc(100%_-_5rem)] flex-none" : "w-full"}`} aria-label={`${actionLabel}: ${title}`} aria-busy={actionPending || void 0} disabled={!item.canUseAction || actionPending} data-action-pending={actionPending || void 0} onClick={event => {
    event.stopPropagation();
    if (!item.canUseAction || actionPending) return;
    const feedbackOrigin = captureHomeUsePromptTransferOrigin(event.currentTarget);
    stopActivePreview();
    onUse(item, feedbackOrigin);
  }} data-action-ui-id="home-media-showcase-use">{actionPending ? <Icon icon={LoaderCircle} size="sm" strokeWidth={1.5} className="animate-spin" aria-hidden={true} /> : item.action.kind === "project-archive" ? <ProjectImportIcon size={16} /> : <UsePromptIcon size={14} />}<span className="truncate whitespace-nowrap">{actionLabel}</span></Button>;
  return <article ref={cardRef} className={`home-media-showcase-card group flex min-w-0 flex-col overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)] ${hasPreviewVideo ? "cursor-pointer" : ""}`} data-action-ui-id="home-media-showcase-card" data-media-kind={hasPreviewVideo ? "video" : "image"} data-media-content-id={dataContentId} data-video-id={dataVideoId} data-click-opens-fullscreen={hasPreviewVideo || void 0} onClickCapture={event => {
    if (!hasPreviewVideo) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }
    handleFullscreen();
  }} onMouseEnter={hasPreviewVideo ? () => {
    retryFailedMedia();
    handlePreviewIntent();
  } : void 0} onMouseLeave={hasPreviewVideo ? stopPreview : void 0} onMouseMove={hasPreviewVideo ? handlePreviewIntent : void 0} onFocusCapture={hasPreviewVideo ? () => setShouldLoadMedia(true) : void 0} onBlur={event => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    stopPreview();
  }}><div className={`home-media-showcase-media-frame relative ${videoOrientation === "landscape" ? "aspect-video" : ""} overflow-hidden rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted`} data-home-media-frame="true" data-video-orientation={videoOrientation} aria-busy={hasPreviewVideo && shouldLoadMedia && !isMediaReady && !isMediaFailed || void 0}>{hasPreviewVideo ? <video ref={videoRef} src={shouldLoadMedia ? item.videoUrl : void 0} poster={shouldLoadMedia ? activePosterUrl : void 0} loop={true} muted={false} playsInline={true} preload={shouldLoadMedia ? "metadata" : "none"} onLoadedMetadata={handleLoadedMetadata} onError={handleMediaError} aria-label={title} data-home-media-loaded={isMediaReady || void 0} data-home-media-activated={shouldLoadMedia || void 0} data-home-media-poster-fit={posterFit} data-home-media-poster-source={posterSource} className="home-media-showcase-media absolute inset-0 h-full w-full object-contain" /> : null}{!isPreviewPlaying && !isMediaFailed && activePosterUrl && failedPosterKey !== activePosterKey ? <img src={activePosterUrl} alt="" draggable={false} loading={posterLoading} decoding="async" aria-hidden="true" data-home-media-poster="true" onError={handlePosterError} className={`pointer-events-none absolute inset-0 z-[1] h-full w-full ${posterObjectFitClass}`} /> : null}{isMediaFailed && activePosterUrl && failedPosterKey !== activePosterKey ?
      // The transparent failed <video> also hides its poster attribute, so
      // the degraded state renders the poster through a plain <img>.
      <img src={activePosterUrl} alt="" draggable={false} loading="eager" decoding="async" aria-hidden="true" data-home-media-error-poster="true" onError={handlePosterError} className={`pointer-events-none absolute inset-0 z-[1] h-full w-full ${posterObjectFitClass}`} /> : null}{hasPreviewVideo && shouldLoadMedia && !isMediaReady && !isMediaFailed ? <span className="home-media-showcase-loading-surface absolute inset-0 z-[2]" data-home-media-placeholder="true" aria-hidden="true" /> : null}{hasPreviewVideo ? <><span className="home-media-showcase-duration absolute bottom-2 left-2 z-[3] rounded-md px-2 py-1 text-[11px] leading-none" data-action-ui-id="home-media-showcase-duration" data-home-media-duration="true"><span className="sr-only">{durationLabel}{": "}{videoDuration}</span><span aria-hidden="true" data-home-media-duration-value="true">{videoDuration}</span></span><div className="home-media-showcase-action-row absolute right-2 bottom-3 left-2 z-[3] flex min-w-0 items-center justify-between gap-3" data-home-media-showcase-action-row="true"><Button type="button" variant="ghost" size="icon-sm" className="home-media-showcase-control-button home-media-showcase-audio-button shrink-0 rounded-full border-0" aria-label={`${isMuted ? unmuteLabel : muteLabel}: ${title}`} aria-pressed={isMuted} onClick={event => {
            event.stopPropagation();
            handleAudioToggle();
          }} data-action-ui-id="home-media-showcase-audio-toggle"><Icon icon={isMuted ? VolumeX : Volume2} size="md" aria-hidden={true} /></Button>{useActionButton}<Button type="button" variant="ghost" size="icon-sm" className="home-media-showcase-control-button home-media-showcase-fullscreen-button shrink-0 rounded-full border-0" aria-label={`${fullscreenLabel}: ${title}`} onClick={event => {
            event.stopPropagation();
            handleFullscreen();
          }} data-action-ui-id="home-media-showcase-fullscreen"><Icon icon={Maximize2} size="md" aria-hidden={true} /></Button></div></> : <div className="home-media-showcase-use-layer absolute bottom-0 z-[3] pb-3">{useActionButton}</div>}</div><footer className="home-media-showcase-footer flex min-w-0 flex-1 flex-col px-3 pt-3 pb-3" data-home-media-footer="true"><div className="flex min-w-0 flex-1 flex-col"><h3 className="line-clamp-2 font-heading text-sm font-medium leading-5 text-foreground">{title}</h3><p className="mt-1.5 line-clamp-2 text-[13px] leading-[18px] text-muted-foreground" data-home-media-description="true">{description}</p><div className="mt-auto flex min-w-0 items-center gap-1 pt-2 text-xs leading-4 text-foreground/40" data-home-media-attribution="true"><span className="truncate">{attributionLabel}</span>{item.isOfficial ? <span className="inline-flex shrink-0" data-home-media-official-badge="true" aria-hidden="true"><Icon icon={BadgeCheck} size="sm" strokeWidth={2} className="text-brand-accent" aria-hidden={true} /></span> : null}</div></div></footer></article>;
}
const OFFICIAL_ATTRIBUTIONS = new Set(["minimaxdesign", "minimaxdesign官方", "minimaxdesignofficial",
// Existing showcase data can still carry the previous brand attribution.
"minimaxhub", "minimaxhub官方", "minimaxhubofficial"]);
function clampProgress(progress) {
  if (!Number.isFinite(progress)) return 0.08;
  return Math.min(1, Math.max(0, progress ?? 0.08));
}
function resolveLocalizedDescription(skill, isZh) {
  if (isZh) {
    return skill.summaryZh || skill.descCn || skill.description || skill.summary;
  }
  return skill.summary || skill.descEn || skill.description || skill.summaryZh;
}
function resolveLocalizedAuthor(skill, isZh) {
  const author = isZh ? skill.authorCn || skill.authorEn || skill.creator : skill.authorEn || skill.authorCn || skill.creator;
  if (isOfficialSkill(skill) && isOfficialAttribution(author)) {
    return isZh ? "MiniMax Design官方" : "MiniMax Design Official";
  }
  return author || (isOfficialSkill(skill) ? "MiniMax Design" : "");
}
function isOfficialSkill(skill) {
  return skill.source === "official" || skill.source === "official-featured";
}
function isOfficialAttribution(author) {
  return OFFICIAL_ATTRIBUTIONS.has(author.trim().replace(/^@+/, "").replaceAll(" ", "").toLowerCase());
}
function MediaShowcaseSkillCard({
  skill,
  isZh,
  videoOrientation,
  dataContentId,
  useLabel,
  disabled = false,
  installing = false,
  installProgress = null,
  installingLabel,
  onUse
}) {
  const [failedCoverUrl, setFailedCoverUrl] = reactExports.useState(null);
  const [loadedCoverUrl, setLoadedCoverUrl] = reactExports.useState(null);
  const cover = resolveSkillCoverUrl(skill);
  const coverFailed = failedCoverUrl === cover;
  const coverLoaded = loadedCoverUrl === cover;
  const displayName = isZh ? skill.displayNameZh || toDisplayName(skill.name) : toDisplayName(skill.name);
  const description = resolveLocalizedDescription(skill, isZh);
  const author = resolveLocalizedAuthor(skill, isZh);
  const attributionLabel = author.startsWith("@") ? author : `@${author}`;
  const official = isOfficialSkill(skill) && isOfficialAttribution(author);
  const normalizedProgress = clampProgress(installProgress);
  return <article className="home-media-showcase-card group flex min-w-0 flex-col overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]" data-action-ui-id="home-media-showcase-skill-card" data-media-kind="skill" data-media-content-id={dataContentId} data-skill-name={skill.name} data-installing={installing ? "true" : void 0} aria-disabled={disabled || void 0} aria-busy={installing || void 0}><div className={`home-media-showcase-media-frame relative ${videoOrientation === "landscape" ? "aspect-video" : ""} overflow-hidden rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted`} data-home-media-frame="true" data-video-orientation={videoOrientation}>{!coverFailed ?
      // The `home-media-showcase-media` visibility contract lives on this
      // wrapper: it stays transparent until `data-home-media-loaded` flips
      // to true, exactly like the video showcase cards. SkillCoverMedia
      // reports load/error; keying loaded state by URL survives skill
      // list refreshes swapping the cover.
      <div className="home-media-showcase-media absolute inset-0" data-home-media-loaded={coverLoaded || void 0}><SkillCoverMedia url={cover} alt={displayName} className="h-full w-full object-contain" onLoad={() => setLoadedCoverUrl(cover)} onError={() => setFailedCoverUrl(cover)} /></div> : <div className="absolute inset-0 flex items-center justify-center bg-muted text-foreground opacity-30" data-home-skill-cover-fallback="true" aria-hidden="true"><SkillIcon size={32} strokeWidth={1.5} /></div>}{installing ? <span className="home-skill-install-indicator pointer-events-none absolute top-1/2 left-1/2 z-[4] size-11 -translate-x-1/2 -translate-y-1/2" data-home-media-skill-install-indicator="true" style={{
        "--home-skill-install-angle": `${Math.round(normalizedProgress * 360)}deg`
      }} role="progressbar" aria-label={`${installingLabel}: ${displayName}`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={normalizedProgress} /> : null}<div className="home-media-showcase-use-layer absolute bottom-0 z-[3] pb-3"><Button type="button" variant="ghost" size="sm" className="home-media-showcase-use-button h-9 w-full min-w-0 gap-1.5 rounded-full border-0 px-2" aria-label={`${installing ? installingLabel : useLabel}: ${displayName}`} disabled={disabled || installing} onClick={() => onUse(skill)} data-action-ui-id="home-media-showcase-skill-use"><FilledSkillIcon size={14} /><span className="truncate whitespace-nowrap">{installing ? installingLabel : useLabel}</span></Button></div></div><footer className="home-media-showcase-footer flex min-w-0 flex-1 flex-col px-3 pt-3 pb-3" data-home-media-footer="true"><div className="flex min-w-0 flex-1 flex-col"><h3 className="line-clamp-2 font-heading text-sm font-medium leading-5 text-foreground">{displayName}</h3>{description ? <p className="mt-1.5 line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">{description}</p> : null}{author ? <div className="mt-auto flex min-w-0 items-center gap-1 pt-2 text-xs leading-4 text-foreground/30"><span className="truncate">{attributionLabel}</span>{official ? <span className="inline-flex shrink-0" data-home-media-official-badge="true" aria-hidden="true"><Icon icon={BadgeCheck} size="sm" strokeWidth={2} className="text-brand-accent" aria-hidden={true} /></span> : null}</div> : null}</div></footer></article>;
}
const SKILL_COLLECTION_ID = "skill";
const SHOWCASE_PAGE = "home";
const SHOWCASE_EXPOSURE_THRESHOLD = 0.5;
const SHOWCASE_EXPOSURE_DELAY_MS = 500;
const SHOWCASE_SKILL_REQUEST_ROOT_MARGIN = "240px 0px";
const LANDSCAPE_EAGER_POSTER_COUNT = 4;
const PORTRAIT_EAGER_POSTER_COUNT = 5;
const SKILL_LOADING_PLACEHOLDER_IDS = ["skill-loading-1", "skill-loading-2", "skill-loading-3", "skill-loading-4", "skill-loading-5", "skill-loading-6"];
const SHOWCASE_LOADING_PLACEHOLDER_IDS = ["showcase-loading-1", "showcase-loading-2", "showcase-loading-3", "showcase-loading-4", "showcase-loading-5", "showcase-loading-6"];
function resolveSkillDefinitions(provider, skillConfig) {
  if (skillConfig) return skillConfig.enabled ? skillConfig.categories : [];
  return provider.secondaryCategories.map(category => ({
    ...category,
    query: {
      source: provider.source
    }
  }));
}
export function MediaShowcasePreview({
  categories = [],
  tabsConfig,
  skillConfig,
  skillConfigLoading = false,
  skillConfigAuthoritative = true,
  projectCategories = [],
  projectDefaultSectionId,
  projectConfigLoading = false,
  projectConfigAuthoritative = true,
  showcase,
  configLoading = false,
  configAuthoritative = true,
  randomInspirationEnabled = true,
  featuredSkills = [],
  featuredSkillsLoading = false,
  featuredSkillsError = null,
  featuredSkillInstallingName = null,
  featuredSkillInstallingProgress = null,
  onQuerySelect,
  onFeatureSelect,
  onProjectArchiveSelect,
  onFeaturedSkillsRequest,
  onFeaturedSkillSelect
}) {
  const {
    t,
    i18n
  } = useTranslation();
  const platform = usePlatform();
  const isZh = i18n.language.startsWith("zh");
  const showcaseRef = reactExports.useRef(null);
  const showcaseToolbarRef = reactExports.useRef(null);
  const trackedExposureKeysRef = reactExports.useRef(new Set());
  const exposureTimersRef = reactExports.useRef(new Map());
  const defaultSwitchTrackedRef = reactExports.useRef(false);
  const nonAuthoritativeUserSelectionRef = reactExports.useRef(false);
  const initialSkillRequestRef = reactExports.useRef(false);
  const [activeCollectionId, setActiveCollectionId] = reactExports.useState(null);
  const [activePrimaryId, setActivePrimaryId] = reactExports.useState(null);
  const [activeSecondaryByPrimary, setActiveSecondaryByPrimary] = reactExports.useState({});
  const [previewSession, setPreviewSession] = reactExports.useState(null);
  const [randomInspirationItem, setRandomInspirationItem] = reactExports.useState(null);
  const [pendingProjectArchiveItemId, setPendingProjectArchiveItemId] = reactExports.useState(null);
  const projectArchiveActionInFlightRef = reactExports.useRef(false);
  const [portraitMockInjector, setPortraitMockInjector] = reactExports.useState(null);
  const guideUrls = getCreationGuideUrlsByLocale(i18n.language);
  const configuredPrimaryCategories = tabsConfig?.enabled ? tabsConfig.primaryCategories : [];
  const twoLevelConfigured = tabsConfig?.enabled === true;
  const inspirationCollections = reactExports.useMemo(() => buildInspirationMediaShowcaseCollections({
    categories,
    featuredLabel: t("home.mediaShowcase.featured"),
    showcase
  }), [categories, showcase, t]);
  const projectCollections = reactExports.useMemo(() => buildMediaShowcaseCollections({
    categories: projectCategories,
    featuredLabel: t("home.mediaShowcase.featured"),
    showcase
  }), [projectCategories, showcase, t]);
  const primaryCategories = configuredPrimaryCategories.filter(category => {
    if (category.provider.type === "project-showcase") {
      return projectConfigLoading || projectCollections.length > 0;
    }
    if (configLoading) return true;
    if (category.provider.type === "quick-start-v2") return inspirationCollections.length > 0;
    return skillConfigLoading || resolveSkillDefinitions(category.provider, skillConfig).length > 0;
  });
  const twoLevelEnabled = primaryCategories.length > 0;
  const selectedPrimaryId = activePrimaryId && primaryCategories.some(category => category.id === activePrimaryId) ? activePrimaryId : tabsConfig?.defaultPrimaryId && primaryCategories.some(category => category.id === tabsConfig.defaultPrimaryId) ? tabsConfig.defaultPrimaryId : primaryCategories[0]?.id;
  const selectedPrimary = primaryCategories.find(category => category.id === selectedPrimaryId);
  const selectedProviderType = selectedPrimary?.provider.type;
  const effectiveConfigAuthoritative = configAuthoritative && (selectedProviderType !== "project-showcase" || projectConfigAuthoritative) && (selectedProviderType !== "skill-market" || skillConfigAuthoritative);
  const rootSkillProvider = selectedPrimary?.provider.type === "skill-market" ? selectedPrimary.provider : void 0;
  const skillDefinitions = rootSkillProvider ? resolveSkillDefinitions(rootSkillProvider, skillConfig) : [];
  const configuredSkillDefault = (skillConfig?.enabled ? skillConfig.defaultSecondaryId : void 0) ?? selectedPrimary?.defaultSecondaryId;
  const rememberedSkillId = selectedPrimaryId ? activeSecondaryByPrimary[selectedPrimaryId] : void 0;
  const skillCollectionId = twoLevelEnabled ? rememberedSkillId && skillDefinitions.some(category => category.id === rememberedSkillId) ? rememberedSkillId : configuredSkillDefault && skillDefinitions.some(category => category.id === configuredSkillDefault) ? configuredSkillDefault : skillDefinitions[0]?.id ?? "all" : SKILL_COLLECTION_ID;
  const selectedSkillDefinition = skillDefinitions.find(category => category.id === skillCollectionId);
  const selectedSkillSource = selectedSkillDefinition?.query.source ?? rootSkillProvider?.source;
  const baseCollections = reactExports.useMemo(() => {
    if (selectedProviderType === "quick-start-v2") return inspirationCollections;
    if (selectedProviderType === "project-showcase") return projectCollections;
    if (selectedProviderType === "skill-market") return [];
    if (twoLevelConfigured) return [];
    return buildMediaShowcaseCollections({
      categories,
      featuredLabel: t("home.mediaShowcase.featured"),
      showcase
    });
  }, [categories, inspirationCollections, projectCollections, selectedProviderType, showcase, t, twoLevelConfigured]);
  reactExports.useEffect(() => {
    return;
  }, []);
  const portraitMockEnabled = portraitMockInjector !== null;
  const collections = reactExports.useMemo(() => portraitMockInjector ? portraitMockInjector(baseCollections, categories) : baseCollections, [baseCollections, categories, portraitMockInjector]);
  const hasSkillCollection = twoLevelEnabled ? selectedProviderType === "skill-market" : categories.some(category => category.kind === "featured-skills");
  const showcasePending = configLoading || selectedProviderType === "project-showcase" && projectConfigLoading || selectedProviderType === "skill-market" && skillConfigLoading;
  const isShowcaseLoading = showcasePending && collections.length === 0;
  const visibleCollections = reactExports.useMemo(() => isShowcaseLoading ? [{
    id: selectedPrimary?.defaultSecondaryId ?? projectDefaultSectionId ?? "empty",
    label: selectedPrimary?.label ?? t("home.mediaShowcase.featured"),
    labelEn: selectedPrimary?.labelEn ?? t("home.mediaShowcase.featured"),
    videoOrientation: "landscape",
    items: []
  }] : collections, [collections, isShowcaseLoading, projectDefaultSectionId, selectedPrimary, t]);
  const showSkillTab = hasSkillCollection || isShowcaseLoading && selectedProviderType === "skill-market";
  const skillCollections = reactExports.useMemo(() => twoLevelEnabled ? skillDefinitions.map(category => ({
    id: category.id,
    label: category.label,
    labelEn: category.labelEn,
    videoOrientation: showcase?.tabs[category.id]?.videoOrientation ?? "landscape",
    ...(showcase?.tabs[category.id]?.badge ? {
      badge: showcase.tabs[category.id].badge
    } : {}),
    items: []
  })) : [{
    id: SKILL_COLLECTION_ID,
    label: showcase?.tabs[SKILL_COLLECTION_ID]?.label ?? t("home.mediaShowcase.h3OfficialSkill"),
    labelEn: showcase?.tabs[SKILL_COLLECTION_ID]?.labelEn ?? t("home.mediaShowcase.h3OfficialSkill"),
    ...(showcase?.tabs[SKILL_COLLECTION_ID]?.badge ? {
      badge: showcase.tabs[SKILL_COLLECTION_ID].badge
    } : {}),
    videoOrientation: showcase?.tabs[SKILL_COLLECTION_ID]?.videoOrientation ?? "landscape",
    items: []
  }], [showcase, skillDefinitions, t, twoLevelEnabled]);
  const skillCollection = skillCollections.find(collection => collection.id === skillCollectionId) ?? skillCollections[0] ?? {
    id: skillCollectionId,
    label: t("home.mediaShowcase.h3OfficialSkill"),
    labelEn: t("home.mediaShowcase.h3OfficialSkill"),
    videoOrientation: "landscape",
    items: []
  };
  const visibleFeaturedSkills = reactExports.useMemo(() => selectedSkillDefinition?.query.tag ? featuredSkills.filter(skill => skillVerticals(skill).some(vertical => vertical === selectedSkillDefinition.query.tag)) : featuredSkills, [featuredSkills, selectedSkillDefinition]);
  const orderedCollections = reactExports.useMemo(() => twoLevelEnabled ? showSkillTab ? skillCollections : visibleCollections : [...visibleCollections.filter(collection => collection.id === "featured"), ...(showSkillTab && skillCollection ? [skillCollection] : []), ...visibleCollections.filter(collection => collection.id !== "featured")], [showSkillTab, skillCollection, skillCollections, twoLevelEnabled, visibleCollections]);
  const showSecondaryTabs = orderedCollections.length > 1;
  const availableCollectionIds = orderedCollections.map(collection => collection.id);
  const configuredSecondaryDefault = twoLevelEnabled ? (selectedProviderType === "quick-start-v2" ? showcase?.defaultTabId : void 0) ?? selectedPrimary?.defaultSecondaryId ?? (selectedProviderType === "project-showcase" ? projectDefaultSectionId : void 0) ?? (selectedProviderType === "skill-market" ? skillCollectionId : void 0) : showcase?.defaultTabId;
  const hasValidConfiguredDefault = Boolean(configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault));
  const rememberedCollectionId = twoLevelEnabled && selectedPrimaryId ? activeSecondaryByPrimary[selectedPrimaryId] : activeCollectionId;
  const selectedCollectionId = rememberedCollectionId && availableCollectionIds.includes(rememberedCollectionId) ? rememberedCollectionId : configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault) ? configuredSecondaryDefault : showSkillTab ? skillCollectionId : availableCollectionIds[0];
  const defaultCollectionId = configuredSecondaryDefault && availableCollectionIds.includes(configuredSecondaryDefault) ? configuredSecondaryDefault : showSkillTab ? skillCollectionId : availableCollectionIds[0];
  const collectionForId = reactExports.useCallback(collectionId => orderedCollections.find(collection => collection.id === collectionId), [orderedCollections]);
  const collectionTabProps = reactExports.useCallback(collectionId => {
    const collection = collectionForId(collectionId);
    if (!collection) return null;
    return {
      page: SHOWCASE_PAGE,
      tab_id: collection.id,
      tab_name: isZh ? collection.label : collection.labelEn,
      tab_order: orderedCollections.findIndex(item => item.id === collection.id) + 1,
      is_default_tab: collection.id === defaultCollectionId,
      ...(selectedPrimary ? {
        tab_level: "secondary",
        primary_tab_id: selectedPrimary.id,
        primary_tab_name: isZh ? selectedPrimary.label : selectedPrimary.labelEn,
        primary_tab_order: primaryCategories.findIndex(item => item.id === selectedPrimary.id) + 1,
        secondary_tab_id: collection.id,
        secondary_tab_name: isZh ? collection.label : collection.labelEn,
        secondary_tab_order: orderedCollections.findIndex(item => item.id === collection.id) + 1,
        provider_type: selectedPrimary.provider.type
      } : {}),
      video_orientation: collection.videoOrientation
    };
  }, [collectionForId, defaultCollectionId, isZh, orderedCollections, primaryCategories, selectedPrimary]);
  const trackTabSwitch = reactExports.useCallback((collectionId, switchSource, fromTabId) => {
    const props = collectionTabProps(collectionId);
    if (!props) return;
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_SWITCH, {
      ...props,
      ...(fromTabId ? {
        from_tab_id: fromTabId
      } : {}),
      switch_source: switchSource
    });
  }, [collectionTabProps]);
  const trackContentClick = reactExports.useCallback((collectionId, contentId, contentType, contentPosition, clickTarget, videoId) => {
    const props = collectionTabProps(collectionId);
    if (!props) return;
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONTENT_CLICK, {
      ...props,
      content_id: contentId,
      ...(videoId ? {
        video_id: videoId
      } : {}),
      content_type: contentType,
      content_position: contentPosition,
      click_target: clickTarget
    });
  }, [collectionTabProps]);
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative || !selectedCollectionId || !defaultCollectionId || defaultSwitchTrackedRef.current) return;
    defaultSwitchTrackedRef.current = true;
    if (nonAuthoritativeUserSelectionRef.current) return;
    trackTabSwitch(defaultCollectionId, showcase?.defaultTabId && !hasValidConfiguredDefault ? "fallback" : "default");
  }, [effectiveConfigAuthoritative, showcasePending, defaultCollectionId, hasValidConfiguredDefault, selectedCollectionId, showcase, trackTabSwitch]);
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative || !hasSkillCollection || selectedCollectionId !== skillCollectionId || initialSkillRequestRef.current || !onFeaturedSkillsRequest) {
      return;
    }
    const showcaseElement = showcaseRef.current;
    if (!showcaseElement) return;
    const request = () => {
      if (initialSkillRequestRef.current) return;
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest(selectedSkillSource);
    };
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      request();
    }, {
      rootMargin: SHOWCASE_SKILL_REQUEST_ROOT_MARGIN
    });
    observer.observe(showcaseElement);
    return () => observer.disconnect();
  }, [effectiveConfigAuthoritative, showcasePending, hasSkillCollection, onFeaturedSkillsRequest, selectedCollectionId, selectedSkillSource, skillCollectionId]);
  reactExports.useEffect(() => {
    if (showcasePending || !effectiveConfigAuthoritative) return;
    if (typeof IntersectionObserver === "undefined") return;
    const toolbar = showcaseToolbarRef.current;
    const showcase = showcaseRef.current;
    if (!toolbar || !showcase) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = entry.target;
        const key = target.getAttribute("data-home-exposure-key");
        if (!key) continue;
        const pendingTimer = exposureTimersRef.current.get(target);
        if (entry.isIntersecting && entry.intersectionRatio >= SHOWCASE_EXPOSURE_THRESHOLD) {
          if (trackedExposureKeysRef.current.has(key) || pendingTimer !== void 0) continue;
          const timer = window.setTimeout(() => {
            exposureTimersRef.current.delete(target);
            if (trackedExposureKeysRef.current.has(key)) return;
            trackedExposureKeysRef.current.add(key);
            const kind = target.getAttribute("data-home-exposure-kind");
            if (kind === "area") {
              trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_EXPOSURE, {
                page: SHOWCASE_PAGE,
                tab_count: orderedCollections.length,
                visible_tab_ids: orderedCollections.map(collection => collection.id),
                default_tab_id: defaultCollectionId
              });
              return;
            }
            if (kind === "primary-tab") {
              const primaryId = target.getAttribute("data-home-primary-tab-id");
              const primary = primaryCategories.find(category => category.id === primaryId);
              if (!primary) return;
              const primaryOrder = primaryCategories.findIndex(category => category.id === primary.id) + 1;
              trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_EXPOSURE, {
                page: SHOWCASE_PAGE,
                tab_id: primary.id,
                tab_name: isZh ? primary.label : primary.labelEn,
                tab_order: primaryOrder,
                is_default_tab: primary.id === tabsConfig?.defaultPrimaryId,
                tab_level: "primary",
                primary_tab_id: primary.id,
                primary_tab_name: isZh ? primary.label : primary.labelEn,
                primary_tab_order: primaryOrder,
                provider_type: primary.provider.type
              });
              return;
            }
            const tabId = target.getAttribute("data-home-tab-id");
            if (!tabId) return;
            const tabProps = collectionTabProps(tabId);
            if (!tabProps) return;
            if (kind === "tab") {
              trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_EXPOSURE, tabProps);
              return;
            }
            if (kind === "content") {
              const contentId = target.getAttribute("data-media-content-id");
              const renderedContentType = target.getAttribute("data-media-kind");
              const contentType = selectedProviderType === "project-showcase" ? "project" : renderedContentType === "skill" ? "skill" : "video";
              const contentPosition = Number(target.getAttribute("data-content-position"));
              if (!contentId) return;
              trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_CONTENT_EXPOSURE, {
                ...tabProps,
                content_id: contentId,
                ...(target.getAttribute("data-video-id") ? {
                  video_id: target.getAttribute("data-video-id") ?? void 0
                } : {}),
                content_type: contentType,
                video_orientation: tabProps.video_orientation,
                content_position: contentPosition
              });
            }
          }, SHOWCASE_EXPOSURE_DELAY_MS);
          exposureTimersRef.current.set(target, timer);
        } else if (pendingTimer !== void 0) {
          window.clearTimeout(pendingTimer);
          exposureTimersRef.current.delete(target);
        }
      }
    }, {
      threshold: [0, SHOWCASE_EXPOSURE_THRESHOLD]
    });
    const exposureTargets = [];
    const area = toolbar;
    area.setAttribute("data-home-exposure-key", "showcase-area");
    area.setAttribute("data-home-exposure-kind", "area");
    exposureTargets.push(area);
    for (const tab of toolbar.querySelectorAll("[data-home-media-showcase-primary-tab]")) {
      const primaryId = tab.getAttribute("data-home-media-showcase-primary-tab");
      if (!primaryId) continue;
      tab.setAttribute("data-home-exposure-key", `primary-tab:${primaryId}`);
      tab.setAttribute("data-home-exposure-kind", "primary-tab");
      tab.setAttribute("data-home-primary-tab-id", primaryId);
      exposureTargets.push(tab);
    }
    for (const tab of toolbar.querySelectorAll("[data-home-media-showcase-tab]")) {
      const tabId = tab.getAttribute("data-home-media-showcase-tab");
      if (!tabId) continue;
      tab.setAttribute("data-home-exposure-key", `tab:${tabId}`);
      tab.setAttribute("data-home-exposure-kind", "tab");
      tab.setAttribute("data-home-tab-id", tabId);
      exposureTargets.push(tab);
    }
    const contentRoot = showcase.querySelector(`[data-home-media-showcase-content="${selectedCollectionId}"]`);
    if (contentRoot) {
      for (const [index, card] of Array.from(contentRoot.querySelectorAll("[data-media-content-id]")).entries()) {
        const contentId = card.getAttribute("data-media-content-id");
        if (!contentId) continue;
        card.setAttribute("data-home-exposure-key", `content:${selectedCollectionId}:${contentId}`);
        card.setAttribute("data-home-exposure-kind", "content");
        card.setAttribute("data-home-tab-id", selectedCollectionId);
        card.setAttribute("data-content-position", String(index + 1));
        exposureTargets.push(card);
      }
    }
    for (const target of exposureTargets) observer.observe(target);
    return () => {
      observer.disconnect();
      for (const target of exposureTargets) {
        const timer = exposureTimersRef.current.get(target);
        if (timer !== void 0) {
          window.clearTimeout(timer);
          exposureTimersRef.current.delete(target);
        }
      }
    };
  }, [collectionTabProps, effectiveConfigAuthoritative, showcasePending, defaultCollectionId, isZh, orderedCollections, primaryCategories, selectedCollectionId, selectedProviderType, tabsConfig?.defaultPrimaryId]);
  const handleOpenH3Guide = reactExports.useCallback(() => {
    void openExternalUrl(platform, guideUrls.h3, {
      source: "home.media-showcase.h3-guide"
    });
  }, [platform, guideUrls.h3]);
  const handleUse = reactExports.useCallback(async (item, feedbackOrigin) => {
    if (!item.canUseAction) return;
    const contentPosition = collectionForId(selectedCollectionId)?.items.findIndex(collectionItem => collectionItem.contentId === item.contentId) ?? -1;
    if (item.action.kind !== "project-archive") {
      trackContentClick(selectedCollectionId, item.contentId, "video", contentPosition + 1, "use_prompt", item.videoId);
    }
    if (item.action.kind === "query") {
      onQuerySelect?.(item.action.query, item.action.sceneId, feedbackOrigin);
      return;
    }
    if (item.action.kind === "project-archive") {
      if (!onProjectArchiveSelect || projectArchiveActionInFlightRef.current) return;
      trackContentClick(selectedCollectionId, item.contentId, "project", contentPosition + 1, "import_project", item.videoId);
      projectArchiveActionInFlightRef.current = true;
      setPendingProjectArchiveItemId(item.id);
      try {
        await onProjectArchiveSelect({
          archiveUrl: item.action.archiveUrl,
          projectName: isZh ? item.action.projectName : item.action.projectNameEn
        });
      } finally {
        projectArchiveActionInFlightRef.current = false;
        setPendingProjectArchiveItemId(null);
      }
      return;
    }
    if (onFeatureSelect) {
      onFeatureSelect();
      return;
    }
    handleOpenH3Guide();
  }, [collectionForId, selectedCollectionId, trackContentClick, onQuerySelect, onProjectArchiveSelect, isZh, onFeatureSelect, handleOpenH3Guide]);
  const handleCollectionChange = collectionId => {
    if (collectionId === selectedCollectionId) return;
    if (!configAuthoritative) nonAuthoritativeUserSelectionRef.current = true;
    trackTabSwitch(collectionId, "user_click", selectedCollectionId);
    const scrollViewport = showcaseRef.current?.closest(".home-below-anchor");
    if (scrollViewport) scrollViewport.scrollTop = 0;
    if (twoLevelEnabled && selectedPrimaryId) {
      setActiveSecondaryByPrimary(current => ({
        ...current,
        [selectedPrimaryId]: collectionId
      }));
    } else {
      setActiveCollectionId(collectionId);
    }
    const selectingSkillCollection = twoLevelEnabled ? selectedProviderType === "skill-market" : collectionId === SKILL_COLLECTION_ID;
    if (selectingSkillCollection && hasSkillCollection) {
      const nextSource = skillDefinitions.find(definition => definition.id === collectionId)?.query.source;
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest?.(nextSource ?? selectedSkillSource);
    }
  };
  const handlePrimaryChange = primaryId => {
    if (primaryId === selectedPrimaryId) return;
    const nextPrimary = primaryCategories.find(category => category.id === primaryId);
    if (!nextPrimary) return;
    const scrollViewport = showcaseRef.current?.closest(".home-below-anchor");
    if (scrollViewport) scrollViewport.scrollTop = 0;
    trackEvent(TRACK_EVENTS.HOME_MEDIA_SHOWCASE_TAB_SWITCH, {
      page: SHOWCASE_PAGE,
      tab_id: nextPrimary.id,
      tab_name: isZh ? nextPrimary.label : nextPrimary.labelEn,
      tab_order: primaryCategories.findIndex(category => category.id === nextPrimary.id) + 1,
      is_default_tab: nextPrimary.id === tabsConfig?.defaultPrimaryId,
      tab_level: "primary",
      primary_tab_id: nextPrimary.id,
      primary_tab_name: isZh ? nextPrimary.label : nextPrimary.labelEn,
      primary_tab_order: primaryCategories.findIndex(category => category.id === nextPrimary.id) + 1,
      provider_type: nextPrimary.provider.type,
      ...(selectedPrimaryId ? {
        from_tab_id: selectedPrimaryId
      } : {}),
      switch_source: "user_click"
    });
    initialSkillRequestRef.current = false;
    defaultSwitchTrackedRef.current = false;
    setActivePrimaryId(primaryId);
    if (nextPrimary.provider.type === "skill-market") {
      const nextDefinitions = resolveSkillDefinitions(nextPrimary.provider, skillConfig);
      const rememberedSecondaryId = activeSecondaryByPrimary[nextPrimary.id];
      const configuredSecondaryId = (skillConfig?.enabled ? skillConfig.defaultSecondaryId : void 0) ?? nextPrimary.defaultSecondaryId;
      const nextDefinition = nextDefinitions.find(definition => definition.id === rememberedSecondaryId) ?? nextDefinitions.find(definition => definition.id === configuredSecondaryId) ?? nextDefinitions[0];
      initialSkillRequestRef.current = true;
      onFeaturedSkillsRequest?.(nextDefinition?.query.source ?? nextPrimary.provider.source);
    }
  };
  const handleFullscreen = reactExports.useCallback((item, initialPlaybackTime, onPlaybackTimeCommit) => {
    const contentPosition = collectionForId(selectedCollectionId)?.items.findIndex(collectionItem => collectionItem.contentId === item.contentId) ?? -1;
    trackContentClick(selectedCollectionId, item.contentId, selectedProviderType === "project-showcase" ? "project" : "video", contentPosition + 1, "fullscreen", item.videoId);
    setPreviewSession({
      item,
      initialPlaybackTime,
      onPlaybackTimeCommit
    });
  }, [collectionForId, selectedCollectionId, selectedProviderType, trackContentClick]);
  const fullscreenVideoUrl = previewSession?.item.videoUrl;
  const fullscreenActions = fullscreenVideoUrl ? [{
    id: "home-media-showcase-lightbox-use",
    label: isZh ? previewSession.item.actionLabel ?? t("home.mediaShowcase.use") : previewSession.item.actionLabelEn ?? t("home.mediaShowcase.use"),
    icon: pendingProjectArchiveItemId === previewSession.item.id ? <LoaderCircle size={14} strokeWidth={1.5} className="animate-spin" aria-hidden={true} /> : previewSession.item.action.kind === "project-archive" ? <ProjectImportIcon size={16} /> : <UsePromptIcon size={14} />,
    className: "h-9 min-w-[10rem] px-5 text-[13px] font-medium",
    disabled: !previewSession.item.canUseAction || pendingProjectArchiveItemId === previewSession.item.id,
    busy: pendingProjectArchiveItemId === previewSession.item.id,
    closeOnClick: previewSession.item.action.kind !== "project-archive",
    onClick: event => {
      event.stopPropagation();
      const item = previewSession.item;
      if (!item.canUseAction || pendingProjectArchiveItemId === item.id) return;
      const feedbackOrigin = captureHomeUsePromptTransferOrigin(event.currentTarget);
      void handleUse(item, feedbackOrigin);
    }
  }] : [];
  reactExports.useEffect(() => {
    if (!randomInspirationItem) return;
    setRandomInspirationItem(null);
    void handleUse(randomInspirationItem);
  }, [randomInspirationItem, handleUse]);
  const inspirationPrimary = configuredPrimaryCategories.find(category => category.provider.type === "quick-start-v2");
  const randomInspirationBridge = <HomeRandomInspirationBridge collections={inspirationCollections} loading={configLoading} enabled={randomInspirationEnabled && Boolean(onQuerySelect) && (!tabsConfig || tabsConfig.enabled && Boolean(inspirationPrimary))} onSelect={(item, collectionId) => {
    if (inspirationPrimary) {
      setActivePrimaryId(inspirationPrimary.id);
      setActiveSecondaryByPrimary(current => ({
        ...current,
        [inspirationPrimary.id]: collectionId
      }));
    } else {
      setActiveCollectionId(collectionId);
    }
    setRandomInspirationItem(item);
  }} />;
  if (tabsConfig && !tabsConfig.enabled) return randomInspirationBridge;
  if (!configLoading && (twoLevelConfigured && !twoLevelEnabled || !twoLevelConfigured && orderedCollections.length === 0)) return randomInspirationBridge;
  return <section ref={showcaseRef} className="home-media-showcase-block w-full" aria-label={t("home.mediaShowcase.title")} aria-busy={configLoading || projectConfigLoading || skillConfigLoading || void 0} data-action-ui-id="home-media-showcase" data-home-showcase-two-level={twoLevelEnabled || void 0} data-home-showcase-primary-id={selectedPrimaryId} data-home-showcase-portrait-mock={portraitMockEnabled || void 0} data-video-orientation={collectionForId(selectedCollectionId)?.videoOrientation ?? "landscape"}><Tabs value={selectedCollectionId} onValueChange={handleCollectionChange} className="gap-3"><div ref={showcaseToolbarRef} className="home-media-showcase-toolbar" data-two-level={twoLevelEnabled || void 0}>{twoLevelEnabled ? <div className="home-media-showcase-primary-row"><Tabs value={selectedPrimaryId} onValueChange={handlePrimaryChange} className="min-w-0"><TabsList aria-label={t("home.mediaShowcase.contentTypes", "Content types")} className="scrollbar-none relative w-max max-w-full self-start justify-start gap-6 overflow-x-auto rounded-none bg-transparent p-0">{primaryCategories.map(category => <TabsTrigger key={category.id} value={category.id} data-action-ui-id={`home-media-showcase-primary-tab-${category.id}`} data-home-media-showcase-primary-tab={category.id} className="home-media-showcase-primary-tab h-10 rounded-none px-2 py-0 text-sm font-medium text-foreground/60 transition-colors duration-150 hover:bg-transparent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none">{isZh ? category.label : category.labelEn}</TabsTrigger>)}<TabsIndicator aria-hidden="true" className="home-media-showcase-primary-tab-indicator" /></TabsList></Tabs></div> : null}{showSecondaryTabs ? <div className="home-media-showcase-secondary-row"><TabsList aria-label={t("home.mediaShowcase.categories")} className="scrollbar-none w-full min-w-0 justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0">{orderedCollections.map(collection => <TabsTrigger key={collection.id} value={collection.id} data-action-ui-id={`home-media-showcase-tab-${collection.id}`} data-home-media-showcase-tab={collection.id} className="group home-media-showcase-secondary-tab h-8 gap-1.5 rounded-full border border-border bg-transparent px-4 py-0 text-[13px] font-normal tracking-[0.005em] text-foreground/70 shadow-none transition-colors duration-150 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 data-[active]:border-transparent data-[active]:bg-[var(--home-media-showcase-secondary-tab-active-bg)] data-[active]:font-medium data-[active]:tracking-normal data-[active]:text-foreground data-[active]:shadow-none"><StableTabLabel label={isZh ? collection.label : collection.labelEn} />{collection.badge ? <span className="inline-flex h-4 items-center rounded-full border border-brand-accent bg-transparent px-1.5 text-[10px] font-medium leading-none text-brand-accent uppercase transition-colors duration-150 group-data-[active]:bg-brand-accent group-data-[active]:text-brand-accent-foreground" data-home-media-showcase-tab-badge="true">{isZh ? collection.badge.label : collection.badge.labelEn}</span> : null}</TabsTrigger>)}</TabsList></div> : null}</div>{orderedCollections.filter(collection => !showSkillTab || collection.id !== skillCollectionId).map(collection => <TabsContent key={collection.id} value={collection.id} className="min-w-0" data-home-media-showcase-content={collection.id}><div key={selectedPrimaryId} className="home-media-showcase-content-layer" data-home-media-showcase-content-layer="true"><div className="home-media-showcase-grid" data-video-orientation={collection.videoOrientation}>{isShowcaseLoading && collection.id === selectedCollectionId ? SHOWCASE_LOADING_PLACEHOLDER_IDS.map(placeholderId => <article key={placeholderId} className="home-media-showcase-card home-media-showcase-loading-surface relative min-w-0 overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]" data-home-media-showcase-placeholder="true" aria-hidden="true"><div className="home-media-showcase-media-frame relative rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted" data-video-orientation={collection.videoOrientation} /><div className="space-y-2 px-3 py-3"><div className="h-4 w-2/3 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /><div className="h-3 w-1/3 rounded bg-muted" /></div></article>) : null}{!isShowcaseLoading ? collection.items.map((item, index) => <MediaShowcaseCard key={`${collection.id}:${item.id}`} item={item} isZh={isZh} useLabel={t("home.mediaShowcase.use")} fullscreenLabel={t("canvas.fullscreenPreview")} durationLabel={t("assetPreview.meta.duration")} muteLabel={t("assetPreview.mute")} unmuteLabel={t("assetPreview.unmute")} videoOrientation={collection.videoOrientation} posterLoading={index < (collection.videoOrientation === "portrait" ? PORTRAIT_EAGER_POSTER_COUNT : LANDSCAPE_EAGER_POSTER_COUNT) ? "eager" : "lazy"} dataContentId={item.contentId} dataVideoId={item.videoId} actionPending={item.action.kind === "project-archive" && pendingProjectArchiveItemId === item.id} onUse={(selectedItem, feedbackOrigin) => {
              void handleUse(selectedItem, feedbackOrigin);
            }} onFullscreen={handleFullscreen} />) : null}</div></div></TabsContent>)}{showSkillTab ? <TabsContent value={skillCollectionId} className="min-w-0" data-action-ui-id="home-media-showcase-skill-content" data-home-media-showcase-content={skillCollectionId}><div key={selectedPrimaryId} className="home-media-showcase-content-layer" data-home-media-showcase-content-layer="true"><div className="home-media-showcase-grid" data-video-orientation={skillCollection.videoOrientation} aria-busy={featuredSkillsLoading || void 0} aria-live="polite">{visibleFeaturedSkills.length > 0 ? visibleFeaturedSkills.map(skill => <MediaShowcaseSkillCard key={skill.name} skill={skill} isZh={isZh} useLabel={t("home.mediaShowcase.useSkill")} disabled={featuredSkillInstallingName !== null} installing={featuredSkillInstallingName === skill.name} installProgress={featuredSkillInstallingName === skill.name ? featuredSkillInstallingProgress : null} installingLabel={t("skills.market.installing")} videoOrientation={skillCollection.videoOrientation} dataContentId={`skill:${skill.name}`} onUse={() => {
              trackContentClick(skillCollectionId, `skill:${skill.name}`, "skill", visibleFeaturedSkills.findIndex(item => item.name === skill.name) + 1, "use_skill");
              onFeaturedSkillSelect?.(skill);
            }} />) : null}{featuredSkillsLoading && visibleFeaturedSkills.length === 0 ? SKILL_LOADING_PLACEHOLDER_IDS.map(placeholderId => <article key={placeholderId} className="home-media-showcase-card min-w-0 overflow-hidden rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card p-1 [border-width:var(--divider-width)]" data-home-media-skill-placeholder="true" aria-hidden="true"><div className="home-media-showcase-media-frame relative animate-pulse rounded-[calc(var(--home-media-showcase-card-radius)-4px)] bg-muted motion-reduce:animate-none" data-video-orientation={skillCollection.videoOrientation} /><div className="space-y-2 px-3 py-3"><div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" /></div></article>) : null}{featuredSkillsLoading ? <span className="sr-only">{t("skills.market.loading")}</span> : null}{!featuredSkillsLoading && visibleFeaturedSkills.length === 0 ? <div className="col-span-full flex min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--home-media-showcase-card-radius)] border-solid border-border bg-card px-6 py-10 text-center [border-width:var(--divider-width)]" data-action-ui-id="home-media-showcase-skill-state"><p className="text-sm text-muted-foreground">{featuredSkillsError ? t("home.mediaShowcase.skillLoadError") : t("home.mediaShowcase.skillEmpty")}</p>{onFeaturedSkillsRequest ? <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onFeaturedSkillsRequest(selectedSkillSource)} data-action-ui-id={featuredSkillsError ? "home-media-showcase-skill-retry" : "home-media-showcase-skill-request"}>{featuredSkillsError ? <RetryIcon size={14} /> : <RetryIcon size={14} aria-hidden={true} />}{featuredSkillsError ? t("common.retry") : t("common.refresh")}</Button> : null}</div> : null}</div></div></TabsContent> : null}</Tabs>{randomInspirationBridge}{previewSession?.item.videoUrl ? <VideoLightbox src={previewSession.item.videoUrl} ariaLabel={isZh ? previewSession.item.title : previewSession.item.titleEn} showShadow={false} initialPlaybackTime={previewSession.initialPlaybackTime} onPlaybackTimeCommit={previewSession.onPlaybackTimeCommit} actions={fullscreenActions} onClose={() => setPreviewSession(null)} /> : null}</section>;
}
