import jsxRuntimeExports from "react/jsx-runtime";
import { ImageLightbox as ImageLightbox$2 } from "../assets/image-lightbox.jsx";
import { MediaLightbox as MediaLightbox$1 } from "../assets/text-preview.jsx";
import { resolveVideoPlaybackUrl } from "../generation/to-workspace-browser-url.js";
import { DropdownMenuContent as DropdownMenuContent$3, DropdownMenuTrigger as DropdownMenuTrigger$3, cn as cn$5 } from "../infra/dialog-content.jsx";
import { ActionListItem, ActionListPanel, ActionListSeparator } from "../media-editing/action-list.jsx";
import { useCanvasActive as useCanvasActive$1 } from "../media-editing/package.jsx";
import { DropdownMenu as DropdownMenu$3 } from "../media-editing/use-warn-missing-asset-meta.jsx";
import { AudioLightbox as AudioLightbox$1, LightboxActionButton, getDisplayLyrics, lightboxActionButtonClassName, lightboxItemFromAssetMeta, normalizeLegacyLightboxItems, useLightboxMediaActions } from "./instrumental-param-values.jsx";
import { MenuItem as MenuItem$4 } from "./table-ops.jsx";
import { Archive, ChevronDown as ChevronDown$3, ChevronLeft as ChevronLeft$1, ChevronRight as ChevronRight$3, Download as Download$2, FolderOpen } from "lucide-react";
import { default as reactExports } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenuItem as DropdownMenuItem$3 } from "../workspace/dropdown-menu.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export const MENU_ITEM_CLASS = "list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";
export function DropdownMenuItem({
  className,
  ...props
}) {
  return <MenuItem$4 data-slot="dropdown-menu-item" className={cn$5(MENU_ITEM_CLASS, className)} {...props} />;
}
export function LightboxDownloadAction({
  dataActionUiId,
  onDownload,
  onDownloadAll,
  disabled = false,
  downloadCount = 1,
  downloadNames = []
}) {
  const {
    t: t2
  } = useTranslation();
  const hasBatch = downloadCount > 1 && Boolean(onDownloadAll);
  const names = new Map();
  for (const name2 of downloadNames) {
    if (name2) names.set(name2, (names.get(name2) ?? 0) + 1);
  }
  return <div className="pointer-events-auto inline-flex min-w-[8.5rem] shrink-0">
      <LightboxActionButton label={t2("canvas.lightbox.downloadCurrent")} icon={Download$2} dataActionUiId={dataActionUiId} className={hasBatch ? "min-w-0 flex-1 rounded-r-none" : void 0} disabled={disabled} onClick={onDownload} />
      {hasBatch && <DropdownMenu$3>
          <DropdownMenuTrigger$3 openOnHover={true} delay={100} closeDelay={150} aria-label={t2("canvas.lightbox.downloadOptions")} title={t2("canvas.lightbox.downloadOptions")} data-action-ui-id={`${dataActionUiId}-options`} className={cn$5(lightboxActionButtonClassName, "w-8 min-w-0 rounded-l-none border-l-0 px-0")} onClick={event => event.stopPropagation()}>
            <ChevronDown$3 size={14} strokeWidth={1.25} aria-hidden={true} />
          </DropdownMenuTrigger$3>
          <ActionListPanel className="canvas-lightbox-action-menu w-max max-w-[80vw]" render={<DropdownMenuContent$3 variant="toolbar" side="top" align="end" sideOffset={8} positionerClassName="z-[10000]" onKeyDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} />}>
            <ActionListItem render={<DropdownMenuItem$3 />} data-action-ui-id={`${dataActionUiId}-all`} onClick={onDownloadAll}>
              <Archive size={16} strokeWidth={1.5} aria-hidden={true} />
              <span>
                {t2("canvas.lightbox.downloadAllCount", {
              count: downloadCount
            })}
              </span>
            </ActionListItem>
            {names.size > 0 && <>
                <ActionListSeparator />
                <div className="max-h-40 max-w-64 overflow-y-auto px-2 py-1 text-xs leading-5 text-[var(--canvas-lightbox-foreground)]/70">
                  {Array.from(names, ([name2, count2]) => <div key={name2} title={name2} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">{name2}</span>
                      {count2 > 1 && <span className="shrink-0 tabular-nums">×{count2}</span>}
                    </div>)}
                </div>
              </>}
          </ActionListPanel>
        </DropdownMenu$3>}
    </div>;
}
export const VIDEO_LIGHTBOX_MAX_WIDTH_RATIO = 0.8;
export const VIDEO_LIGHTBOX_MAX_HEIGHT_RATIO = 0.8;
export const VIDEO_LIGHTBOX_VERTICAL_RESERVED_PX = 176;
export const VIDEO_LIGHTBOX_MIN_HEIGHT_PX = 240;
export const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9;
export function clampIndex(value, length2) {
  if (length2 <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), length2 - 1);
}
export function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      height: 720
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}
export function getVideoDisplaySize(viewport, naturalSize) {
  const naturalAspect = naturalSize && naturalSize.width > 0 && naturalSize.height > 0 ? naturalSize.width / naturalSize.height : DEFAULT_VIDEO_ASPECT_RATIO;
  const maxWidth = viewport.width * VIDEO_LIGHTBOX_MAX_WIDTH_RATIO;
  const maxHeight = Math.max(VIDEO_LIGHTBOX_MIN_HEIGHT_PX, Math.min(viewport.height * VIDEO_LIGHTBOX_MAX_HEIGHT_RATIO, viewport.height - VIDEO_LIGHTBOX_VERTICAL_RESERVED_PX));
  const width = Math.min(maxWidth, maxHeight * naturalAspect);
  return {
    width,
    height: width / naturalAspect
  };
}
export function normalizePlaybackTime(currentTime, duration) {
  if (currentTime === void 0 || !Number.isFinite(currentTime) || currentTime < 0) return 0;
  if (duration !== void 0 && Number.isFinite(duration) && duration > 0) {
    return Math.min(currentTime, duration);
  }
  return currentTime;
}
export const VideoLightbox = reactExports.memo(function VideoLightbox2({
  src,
  sources,
  item,
  items,
  initialIndex = 0,
  ariaLabel,
  showShadow = true,
  initialPlaybackTime,
  onPlaybackTimeCommit,
  actions = [],
  onClose
}) {
  const {
    t: t2
  } = useTranslation();
  const active2 = useCanvasActive$1();
  const videoItems = reactExports.useMemo(() => normalizeLegacyLightboxItems("video", items, item, sources, src), [items, item, sources, src]);
  const [index2, setIndex] = reactExports.useState(() => clampIndex(initialIndex, videoItems.length));
  const [loadedVideoSize, setLoadedVideoSize] = reactExports.useState(null);
  const [viewport, setViewport] = reactExports.useState(getViewportSize);
  const total = videoItems.length;
  const isMulti = total > 1;
  const current2 = videoItems[index2] ?? videoItems[0];
  const activeSrc = current2?.url ? resolveVideoPlaybackUrl(current2.url) : "";
  const videoRef = reactExports.useRef(null);
  const initialPlaybackTargetRef = reactExports.useRef({
    src: activeSrc,
    currentTime: normalizePlaybackTime(initialPlaybackTime),
    applied: false
  });
  const naturalSize = loadedVideoSize?.src === activeSrc ? loadedVideoSize : null;
  const displaySize = reactExports.useMemo(() => getVideoDisplaySize(viewport, naturalSize), [viewport, naturalSize]);
  const showInFolderLabel = t2("canvas.lightbox.showInFolder");
  const {
    canSave,
    canSaveAll,
    batchDownloadableItems,
    canReveal,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu
  } = useLightboxMediaActions({
    item: current2,
    items: videoItems
  });
  const goPrev = reactExports.useCallback(() => {
    if (total <= 1) return;
    setIndex(current22 => (current22 - 1 + total) % total);
  }, [total]);
  const goNext = reactExports.useCallback(() => {
    if (total <= 1) return;
    setIndex(current22 => (current22 + 1) % total);
  }, [total]);
  const handlePrevClick = reactExports.useCallback(e2 => {
    e2.stopPropagation();
    goPrev();
  }, [goPrev]);
  const handleNextClick = reactExports.useCallback(e2 => {
    e2.stopPropagation();
    goNext();
  }, [goNext]);
  const applyInitialPlaybackTime = reactExports.useCallback(video => {
    const target = initialPlaybackTargetRef.current;
    if (target.applied || target.src !== activeSrc) return;
    try {
      video.currentTime = normalizePlaybackTime(target.currentTime, video.duration);
      target.applied = true;
    } catch {}
  }, [activeSrc]);
  const handleClose = reactExports.useCallback(() => {
    const video = videoRef.current;
    const target = initialPlaybackTargetRef.current;
    if (target.src !== activeSrc) {
      onClose();
      return;
    }
    const currentTime = !target.applied ? target.currentTime : normalizePlaybackTime(video?.currentTime, video?.duration);
    try {
      onPlaybackTimeCommit?.(currentTime);
    } finally {
      onClose();
    }
  }, [activeSrc, onClose, onPlaybackTimeCommit]);
  reactExports.useEffect(() => {
    setIndex(clampIndex(initialIndex, videoItems.length));
  }, [initialIndex, videoItems.length]);
  reactExports.useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportSize());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  reactExports.useEffect(() => {
    if (!isMulti || !active2) return;
    const handler = e2 => {
      if (e2.key === "ArrowLeft") {
        e2.preventDefault();
        goPrev();
      } else if (e2.key === "ArrowRight") {
        e2.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMulti, active2, goPrev, goNext]);
  if (!activeSrc) return null;
  return <MediaLightbox$1 onClose={handleClose} onContextMenu={handleContextMenu} ariaLabel={ariaLabel}>
      <div className="pointer-events-none relative isolate flex max-h-[calc(100vh-8rem)] max-w-[calc(100vw-8rem)] flex-col items-center justify-center gap-3">
        <div className="pointer-events-auto relative z-0 flex cursor-default items-center justify-center" onClick={event => event.stopPropagation()} data-action-ui-id="canvas.video-lightbox.media-frame">
          <video key={activeSrc} ref={videoRef} src={activeSrc} className={cn$5("block rounded-lg bg-black", showShadow && "shadow-[0_8px_32px_rgba(0,0,0,0.5)]")} style={{
          width: displaySize.width,
          height: displaySize.height
        }} controls={true} autoPlay={true} playsInline={true} tabIndex={0} draggable={false} onLoadedMetadata={event => {
          const video = event.currentTarget;
          applyInitialPlaybackTime(video);
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setLoadedVideoSize({
              src: activeSrc,
              width: video.videoWidth,
              height: video.videoHeight
            });
          }
        }} onCanPlay={event => applyInitialPlaybackTime(event.currentTarget)} />
        </div>
        {(isMulti || canSave || canSaveAll || canReveal || actions.length > 0) && <div className="pointer-events-none relative z-50 flex min-h-8 w-full max-w-[80vw] items-center justify-center" data-action-ui-id="canvas.video-lightbox.actions">
            {isMulti && <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 px-1 text-[11px] text-white/60 tabular-nums" data-action-ui-id="canvas.video-lightbox.counter">
                {index2 + 1}
                {" / "}
                {total}
              </div>}
            {(canSave || canSaveAll || canReveal || actions.length > 0) && <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2" data-action-ui-id="canvas.video-lightbox.action-group">
                {canReveal && <LightboxActionButton label={showInFolderLabel} icon={FolderOpen} dataActionUiId="canvas.video-lightbox.show-in-folder" onClick={handleShowInFolder} />}
                {(canSave || canSaveAll) && <LightboxDownloadAction dataActionUiId="canvas.video-lightbox.download" disabled={!canSave} onDownload={handleDownload} onDownloadAll={canSaveAll ? handleDownloadAll : void 0} downloadCount={batchDownloadableItems.length} downloadNames={batchDownloadableItems.map(item2 => item2.fileName || ariaLabel || t2("canvas.video"))} />}
                {actions.map(action2 => <LightboxActionButton key={action2.id} label={action2.label} iconElement={action2.icon} dataActionUiId={action2.id} className={action2.className} disabled={action2.disabled} busy={action2.busy} onClick={event => {
            action2.onClick(event);
            if (action2.closeOnClick) handleClose();
          }} />)}
              </div>}
          </div>}
      </div>
      {contextMenu}
      {isMulti && <>
          <button type="button" aria-label={t2("canvas.videoLightbox.previousVideo", "Previous video")} data-action-ui-id="canvas.video-lightbox.prev" className="absolute left-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto" onClick={handlePrevClick}>
            <ChevronLeft$1 size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
          <button type="button" aria-label={t2("canvas.videoLightbox.nextVideo", "Next video")} data-action-ui-id="canvas.video-lightbox.next" className="absolute right-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto" onClick={handleNextClick}>
            <ChevronRight$3 size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
        </>}
    </MediaLightbox$1>;
});
export function TableAttachmentLightbox({
  attachment,
  meta: meta2,
  onClose
}) {
  const kind2 = attachment.kind;
  if (kind2 !== "image" && kind2 !== "video" && kind2 !== "audio") return null;
  const item = lightboxItemFromAssetMeta(kind2, meta2);
  if (!item) return null;
  if (kind2 === "image") return <ImageLightbox$2 items={[item]} index={0} onIndexChange={() => {}} alt={attachment.name} onClose={onClose} />;
  if (kind2 === "video") return <VideoLightbox item={item} onClose={onClose} />;
  return <AudioLightbox$1 item={item} name={attachment.name} lyrics={getDisplayLyrics(meta2)} onClose={onClose} />;
}