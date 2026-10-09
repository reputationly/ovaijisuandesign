// 插件市场详情：图标解析、首帧静态图、详情弹窗、预览视频与列表条目。
import {
  h as useTranslation,
  r as reactExports,
  j as jsxRuntimeExports,
  am as Trash2,
  g7 as Badge,
  fM as Button,
  as as Dialog,
  at as DialogContent,
  mW as formatDownloads,
  dl as Loader2,
  az as PluginIcon,
  nh as pickLocalized,
  cf as Download$1,
} from "../../main.jsx";
import Autoplay from "embla-carousel-autoplay";
import { __jsx } from "../../shared/jsx-runtime.js";
import { Carousel, CarouselContent, CarouselItem } from "./carousel.jsx";
import { normalizePluginLocale } from "./template-project.js";
function resolvePluginIcon$1(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(?:$|\?)/i;
const ANIMATABLE_ICON_RE = /\.(gif|webp|apng)(\?|#|$)/i;
function isVideoUrl(url) {
  return VIDEO_EXT_RE.test(url);
}
function StaticFirstFrameIcon({ src }) {
  const canvasRef = reactExports.useRef(null);
  const [snapshotReady, setSnapshotReady] = reactExports.useState(false);
  const [imageFailed, setImageFailed] = reactExports.useState(false);
  const animatable = ANIMATABLE_ICON_RE.test(src);
  reactExports.useEffect(() => {
    setImageFailed(false);
    if (!animatable) {
      setSnapshotReady(false);
      return;
    }
    setSnapshotReady(false);
    let cancelled = false;
    const img = new Image();
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas || img.naturalWidth === 0 || img.naturalHeight === 0) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setSnapshotReady(true);
    };
    img.onload = draw;
    img.onerror = () => {
      if (!cancelled) {
        setSnapshotReady(false);
        setImageFailed(true);
      }
    };
    img.src = src;
    if (img.complete) draw();
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [animatable, src]);
  if (imageFailed) {
    return (
      <div className="flex size-full items-center justify-center overflow-hidden rounded-md">
        <PluginIcon size={20} strokeWidth={1.5} />
      </div>
    );
  }
  if (!animatable) {
    return (
      <img
        src={src}
        alt=""
        className="size-full object-cover"
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }
  return (
    <div className="flex size-full items-center justify-center overflow-hidden rounded-md">
      <canvas
        ref={canvasRef}
        className={`size-full object-cover ${snapshotReady ? "" : "hidden"}`}
      />
      {!snapshotReady && <PluginIcon size={20} strokeWidth={1.5} />}
    </div>
  );
}
export function PluginMarketDetailDialog({
  plugin,
  installedSkill,
  installing,
  onClose,
  onInstall,
  onUninstall,
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const [api, setApi] = reactExports.useState(null);
  reactExports.useEffect(() => {
    api?.scrollTo(0, true);
  }, [plugin?.id]);
  const displayName = plugin ? pickLocalized(plugin.name, locale) || plugin.id : "";
  const summary = plugin ? pickLocalized(plugin.description, locale) : "";
  const description = plugin ? pickLocalized(plugin.details, locale) : "";
  const tags = plugin ? pickLocalized(plugin.tags, locale, []) : [];
  const iconUrl = plugin ? resolvePluginIcon$1(plugin.icon, locale) : void 0;
  const previews = plugin ? pickLocalized(plugin.previews, locale, []) : [];
  const version = plugin?.version;
  const isInstalled = !!installedSkill;
  const carouselPlugins = reactExports.useMemo(
    () =>
      previews.length > 1
        ? [
            Autoplay({
              delay: 1500,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]
        : [],
    [previews.length],
  );
  const handleInstallClick = reactExports.useCallback(() => {
    if (plugin) onInstall(plugin.id);
  }, [plugin, onInstall]);
  const handleUninstall = reactExports.useCallback(() => {
    if (plugin) onUninstall(plugin.id);
  }, [plugin, onUninstall]);
  return (
    <Dialog open={!!plugin} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {plugin && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="shrink-0 px-5 pt-5 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                  {iconUrl ? (
                    <StaticFirstFrameIcon src={iconUrl} />
                  ) : (
                    <PluginIcon size={20} strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium text-foreground leading-tight">
                    {displayName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    {plugin.id}
                  </div>
                </div>
              </div>
              {(tags.length > 0 || version) && (
                <div className="flex flex-wrap items-center gap-1 mt-3">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-muted text-muted-foreground font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {version && (
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground font-normal"
                    >
                      v{version}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {previews.length > 0 && (
                <div className="mb-4">
                  <Carousel
                    setApi={setApi}
                    opts={{
                      loop: previews.length > 1,
                      align: "start",
                    }}
                    plugins={carouselPlugins}
                    data-action-ui-id="plugin-market-detail-carousel"
                  >
                    <CarouselContent className="ml-0">
                      {previews.map((url, idx) => {
                        const isVideo = isVideoUrl(url);
                        return (
                          <CarouselItem key={url} className="pl-0">
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                              {isVideo ? (
                                <PluginPreviewVideo
                                  src={url}
                                  label={`${displayName} preview ${idx + 1}`}
                                />
                              ) : (
                                <img
                                  src={url}
                                  alt={`${displayName} preview ${idx + 1}`}
                                  className="size-full object-contain"
                                  draggable={false}
                                />
                              )}
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>
              )}
              {summary && (
                <div>
                  <div className="text-xs font-medium text-foreground">
                    {t("skills.plugin.detail.summary")}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {summary}
                  </div>
                </div>
              )}
              {(summary || previews.length > 0) && <div className="border-t border-border my-4" />}
              <div>
                <div className="text-xs font-medium text-foreground">
                  {t("skills.plugin.detail.description")}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                  {description || t("skills.plugin.detail.noDescription")}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-border bg-background flex items-center justify-end">
              {isInstalled ? (
                <Button
                  data-action-ui-id="plugin-market-detail-uninstall"
                  variant="outline"
                  size="sm"
                  className="text-xs hover:text-destructive hover:border-destructive/40"
                  onClick={handleUninstall}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  {t("skills.plugin.uninstall")}
                </Button>
              ) : (
                <Button
                  data-action-ui-id="plugin-market-detail-install"
                  variant="outline"
                  size="sm"
                  loading={installing}
                  className="text-xs"
                  onClick={handleInstallClick}
                >
                  {!installing && <Download$1 size={14} strokeWidth={1.5} />}
                  {installing ? t("skills.plugin.installing") : t("skills.plugin.install")}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function PluginPreviewVideo({ src, label }) {
  const videoRef = reactExports.useRef(null);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.currentTime = 1e-3;
    } catch {}
  }, []);
  return (
    <div className="relative size-full">
      <video
        ref={videoRef}
        src={src}
        className="size-full object-contain"
        playsInline={true}
        preload="metadata"
        aria-label={label}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
      />
    </div>
  );
}
function resolvePluginIcon(icon, locale) {
  if (!icon) return void 0;
  if (typeof icon === "string") return icon || void 0;
  return pickLocalized(icon, locale) || void 0;
}
export function PluginMarketListItem({
  plugin,
  installedSkill,
  onDetail,
  onInstall,
  installing,
  onUninstall,
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizePluginLocale(i18n.language);
  const displayName = pickLocalized(plugin.name, locale) || plugin.id;
  const summary = pickLocalized(plugin.description, locale);
  const iconUrl = resolvePluginIcon(plugin.icon, locale);
  const downloads = plugin.downloads;
  const isInstalled = !!installedSkill;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: list row click opens detail
    // biome-ignore lint/a11y/noStaticElementInteractions: list row click opens detail
    <div
      data-action-ui-id="plugin-market-list-item"
      data-plugin-id={plugin.id}
      className="group flex items-center gap-3 rounded-lg border border-transparent bg-card px-4 py-3 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm cursor-pointer"
      onClick={() => onDetail?.(plugin)}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground overflow-hidden">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="size-full object-contain" draggable={false} />
        ) : (
          <PluginIcon size={14} strokeWidth={1.5} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
          {downloads != null && downloads > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Download$1 size={12} strokeWidth={1.5} />
              {formatDownloads(downloads)}
            </span>
          )}
        </div>
        {summary && <p className="mt-1 truncate text-xs text-muted-foreground">{summary}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {isInstalled ? (
          <button
            type="button"
            data-action-ui-id="plugin-market-uninstall"
            className="inline-flex items-center gap-1.5 h-7 rounded-md px-2.5 text-xs font-medium border border-foreground/15 bg-transparent text-foreground hover:bg-muted hover:text-destructive hover:border-destructive/40 transition-colors"
            onClick={() => onUninstall?.(plugin.id)}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            {t("skills.plugin.uninstall")}
          </button>
        ) : (
          onInstall && (
            <button
              type="button"
              data-action-ui-id="plugin-market-install"
              disabled={installing}
              className="inline-flex items-center gap-1.5 h-7 rounded-md px-3 text-xs font-medium border border-foreground/15 bg-transparent text-foreground hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onInstall(plugin.id)}
            >
              {installing ? (
                <>
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  {t("skills.plugin.installing")}
                </>
              ) : (
                <>
                  <Download$1 size={14} strokeWidth={1.5} />
                  {t("skills.plugin.install")}
                </>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}
