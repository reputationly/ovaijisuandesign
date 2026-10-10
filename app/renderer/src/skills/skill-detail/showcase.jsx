// 技能详情里的展示：视频播放器、展示区、结构化概览。
import { useTranslation, reactExports, ChevronLeft, ChevronRight$1 as ChevronRight, PlaybackPauseIcon$1 as PlaybackPauseIcon, PlaybackPlayIcon$1 as PlaybackPlayIcon, Volume2, ListChecks, ArrowUpRight } from "../../vendor.js";
import { cn$2 as cn, Button } from "../../infra/dialog-content.jsx";
import { selectSkillStructuredInfo } from "../../generation/normalize-skill-detail-metadata.js";
import { CDN_SKILL_SHOWCASE_FALLBACK } from "../../workspace/topbar-state-context.jsx";
import { ProgressBar } from "../../media-editing/progress-bar-inner.jsx";
import { VolumeX, ImageOffOutlineIcon, List, Package } from "../../media-editing/package.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { Carousel, CarouselContent, CarouselItem } from "../plugins/carousel.jsx";
import { isSkillDetailVideo, skillDetailMedia } from "./data.js";
function ShowcaseVideoPlayer({ src, label, active, onError }) {
  const { t } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const [playing, setPlaying] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const sync = () => setPlaying(!el.paused && !el.ended);
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    el.addEventListener("ended", sync);
    sync();
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
      el.removeEventListener("ended", sync);
    };
  }, []);
  reactExports.useEffect(() => {
    if (active) return;
    videoRef.current?.pause();
  }, [active]);
  const togglePlay = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => void 0);
    else el.pause();
  }, []);
  const toggleMute = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);
  return (
    <div className="showcase-video-player group relative size-full">
      <video
        ref={videoRef}
        src={src}
        playsInline={true}
        preload="metadata"
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture={true}
        disableRemotePlayback={true}
        width={1920}
        height={1080}
        onError={onError}
        aria-label={label}
        className="size-full object-contain"
      />
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={togglePlay}
        className="absolute inset-0 cursor-pointer"
      />
      <div
        className={cn(
          "showcase-video-player-scrim pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 px-3 pb-2 pt-8 transition-opacity duration-150",
          "text-modal-mask-foreground",
          playing
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            data-action-ui-id="skill-detail-showcase-video-toggle-play"
            aria-label={playing ? t("common.pause") : t("common.play")}
            className="showcase-video-player-button pointer-events-auto flex size-7 shrink-0 items-center justify-center rounded-full"
          >
            {playing ? (
              <PlaybackPauseIcon size={16} strokeWidth={1.5} />
            ) : (
              <PlaybackPlayIcon size={16} strokeWidth={1.5} />
            )}
          </button>
          <ProgressBar videoRef={videoRef} isPlaying={playing} display="time" />
          <button
            type="button"
            onClick={toggleMute}
            data-action-ui-id="skill-detail-showcase-video-toggle-mute"
            aria-label={muted ? t("assetPreview.unmute") : t("assetPreview.mute")}
            className="showcase-video-player-button pointer-events-auto ml-auto flex size-7 shrink-0 items-center justify-center rounded-md"
          >
            {muted ? (
              <VolumeX size={16} strokeWidth={1.5} />
            ) : (
              <Volume2 size={16} strokeWidth={1.5} />
            )}
          </button>
        </div>
        <ProgressBar videoRef={videoRef} isPlaying={playing} display="bar" />
      </div>
    </div>
  );
}
export function SkillShowcase({ skill }) {
  const { t } = useTranslation();
  const [failed, setFailed] = reactExports.useState(() => new Set());
  const [api, setApi] = reactExports.useState();
  const [index, setIndex] = reactExports.useState(0);
  const media = skillDetailMedia(skill, failed);
  const mediaKey = JSON.stringify(media);
  reactExports.useEffect(() => {
    if (!api) return;
    const handleSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    handleSelect();
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);
  reactExports.useEffect(() => {
    if (!mediaKey) return;
    setIndex(0);
    api?.scrollTo(0, true);
  }, [api, mediaKey]);
  const handleError = (url) => setFailed((current) => new Set([...current, url]));
  return (
    <Carousel
      setApi={setApi}
      opts={{
        loop: media.length > 1,
        watchDrag: false,
      }}
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg bg-muted"
      data-action-ui-id="skill-detail-showcase"
      onKeyDownCapture={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          api?.scrollPrev();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          api?.scrollNext();
        }
      }}
    >
      <CarouselContent className="ml-0">
        {media.map((url, itemIndex) => (
          <CarouselItem key={url} className="pl-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {failed.has(url) ? (
                <div
                  className="absolute inset-0 flex items-center justify-center text-muted-foreground"
                  role="img"
                  aria-label={t("skills.detail.mediaUnavailable")}
                >
                  <ImageOffOutlineIcon size={32} strokeWidth={1.5} />
                </div>
              ) : isSkillDetailVideo(url) ? (
                // Mounted for every slide, not just the active one, so scrolling
                // back keeps the decoded frame and playhead. `active` is what
                // pauses the slide we just left.
                <ShowcaseVideoPlayer
                  key={url}
                  src={url}
                  active={itemIndex === index}
                  label={t("skills.detail.showcaseVideo")}
                  onError={() => handleError(url)}
                />
              ) : (
                <img
                  src={url}
                  alt={
                    url === CDN_SKILL_SHOWCASE_FALLBACK
                      ? t("skills.detail.defaultShowcase")
                      : t("skills.detail.showcaseImage", {
                          index: itemIndex + 1,
                        })
                  }
                  onError={() => handleError(url)}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {media.length > 1 && (
        <div className="elevated-surface-border absolute right-4 top-4 flex items-center gap-1 rounded-full bg-popover/60 p-1 text-xs text-popover-foreground shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-popover/45">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("skills.detail.previousMedia")}
            data-action-ui-id="skill-detail-showcase-prev"
            onClick={() => api?.scrollPrev()}
            className="rounded-full text-popover-foreground/70 hover:bg-foreground/10 hover:text-popover-foreground"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </Button>
          <span
            aria-live="polite"
            className="min-w-8 text-center text-popover-foreground/90 tabular-nums"
          >
            {index + 1}/{media.length}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("skills.detail.nextMedia")}
            data-action-ui-id="skill-detail-showcase-next"
            onClick={() => api?.scrollNext()}
            className="rounded-full text-popover-foreground/70 hover:bg-foreground/10 hover:text-popover-foreground"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </Button>
        </div>
      )}
    </Carousel>
  );
}
export function SkillStructuredOverview({ info }) {
  const { t, i18n } = useTranslation();
  const { info: data } = selectSkillStructuredInfo(info, i18n.language);
  const sections = [
    {
      key: "overview",
      title: t("skills.detail.overview"),
      icon: List,
      text: data?.summary,
    },
    {
      key: "bestFor",
      title: t("skills.detail.bestFor"),
      icon: ListChecks,
      tags: data?.best_for,
    },
    {
      key: "howToUse",
      title: t("skills.detail.howToUse"),
      icon: ArrowUpRight,
      text: data?.how_to_use,
    },
    {
      key: "outputs",
      title: t("skills.detail.outputs"),
      icon: Package,
      text: data?.outputs,
    },
  ];
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-action-ui-id="skill-detail-structured-info"
    >
      {sections.map(({ key, title, icon: Icon2, text, tags }) => (
        <section
          key={key}
          className="group min-w-0 rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/40"
        >
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase">
            <Icon2
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground"
            />
            {title}
          </h3>
          {tags?.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {[...new Set(tags)].map((tag) => (
                <li
                  key={tag}
                  className="rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground break-words"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
              {text || t("skills.detail.noStructuredInfo")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
