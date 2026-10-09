// thumb-chip.jsx
import {
  CircleAlert,
  CompositedSvg,
  reactExports,
  Scissors,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileText, formatTime$2, ImageOutlineIcon } from "./package.jsx";
import { TextHoverPreview } from "./text-hover-preview.jsx";
import { TextReadDialog, THUMB_SIZE } from "./use-preview-text.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { MediaHoverPreview } from "./media-hover-preview.jsx";
import {
  ReferenceMediaLightbox,
  ReferenceThumbnailOverlay,
  ReferenceThumbnailVideoInfo,
} from "./reference-thumbnail-overlay.jsx";

function formatReferenceVideoDuration(durationSec) {
  if (
    durationSec === void 0 ||
    !Number.isFinite(durationSec) ||
    durationSec <= 0
  ) {
    return void 0;
  }
  return `${durationSec.toFixed(2)}s`;
}

function ReferenceImagePlaceholderIcon() {
  return <ImageOutlineIcon size={16} strokeWidth={1.8} aria-hidden="true" />;
}

function ReferenceTextIcon() {
  return <FileText size={16} aria-hidden={true} />;
}

function ReferenceAudioIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}

export function ThumbChip({
  item,
  disabled: disabled2,
  readOnly: readOnly2,
  videoDurationExcessSec,
  audioDurationExcessSec,
  onClipVideo,
  onClipAudio,
  onReplace,
  onRemove: onRemove2,
  onClick,
  onLocate,
}) {
  const { t: t2 } = useTranslation();
  const [hovered, setHovered] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [lightboxItem, setLightboxItem] = reactExports.useState(null);
  const isPreviewable = item.kind === "image" || item.kind === "video";
  const supportsFullTextReading =
    item.kind === "text" || /\.(?:txt|md)$/i.test(item.path);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const isVideoDurationExceeded = videoDurationExcessSec != null;
  const isAudioDurationExceeded = audioDurationExcessSec != null;
  const isDurationOutOfRange = item.durationOutOfRange === true;
  const isDurationExceeded =
    isVideoDurationExceeded || isAudioDurationExceeded || isDurationOutOfRange;
  const durationWarningKey = isDurationOutOfRange
    ? "canvas.mediaSlot.durationOutOfRange"
    : item.kind === "audio"
      ? "canvas.audioSlot.durationTooLong"
      : "canvas.videoSlot.durationTooLong";
  const durationWarningActionId =
    item.kind === "audio"
      ? "popover.reference-audio-duration-warning"
      : "popover.reference-video-duration-warning";
  const handleRemove = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onRemove2(item.path);
    },
    [item.path, onRemove2],
  );
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current === null) return;
    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const showPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(true);
  }, [clearPreviewCloseTimer]);
  const schedulePreviewClose = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => {
      setHovered(false);
      previewCloseTimerRef.current = null;
    }, 120);
  }, [clearPreviewCloseTimer]);
  reactExports.useEffect(
    () => clearPreviewCloseTimer,
    [clearPreviewCloseTimer],
  );
  const handleReplace = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(false);
    onReplace?.(item);
  }, [clearPreviewCloseTimer, item, onReplace]);
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!e2.currentTarget.contains(e2.target)) return;
      if (e2.target instanceof Element && e2.target.closest("button")) return;
      showPreview();
      onClick(item);
    },
    [item, onClick, showPreview],
  );
  const handleClipVideo = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onClipVideo?.(item);
    },
    [item, onClipVideo],
  );
  const handleClipAudio = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onClipAudio?.(item);
    },
    [item, onClipAudio],
  );
  const durationLabel =
    item.kind === "video"
      ? formatReferenceVideoDuration(item.durationSec)
      : item.kind !== "image" && item.durationSec && item.durationSec > 0
        ? formatTime$2(item.durationSec, true)
        : void 0;
  return (
    // ThumbChip 外层用 div + role="button" 而不是 <button>,因为内部 remove
    // 还有一个 <button>,HTML 不允许 button 嵌套(React 19 hydration 会报错)。
    // biome-ignore lint/a11y/useSemanticElements: nested button is illegal HTML
    <div
      ref={setChipEl}
      role="button"
      tabIndex={disabled2 || isDurationExceeded ? -1 : 0}
      aria-disabled={disabled2 || isDurationExceeded || void 0}
      className={`group/thumb relative transition-transform duration-150 motion-reduce:transform-none ${hovered && isPreviewable ? "scale-[1.04]" : ""} shrink-0 flex items-center justify-center border-[1.5px] ${item.kind === "video" ? "border-[var(--canvas-node-border)]" : "border-transparent"} ${item.kind === "text" || item.kind === "file" ? "bg-[var(--canvas-controls-hover)]" : ""} rounded-[8px] overflow-hidden ${item.durationOutOfRange ? "opacity-50" : ""} ${disabled2 ? "cursor-default opacity-60" : isDurationExceeded ? "cursor-default" : "cursor-pointer"}`}
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
      }}
      onMouseDown={(event) => {
        if (!event.currentTarget.contains(event.target)) return;
        if (event.target instanceof Element && event.target.closest("button"))
          return;
        event.preventDefault();
      }}
      onClick={(e2) => {
        if (disabled2 || isDurationExceeded) {
          e2.stopPropagation();
          return;
        }
        handleClick2(e2);
      }}
      onKeyDown={(e2) => {
        if (e2.target !== e2.currentTarget) return;
        if (disabled2 || isDurationExceeded) {
          e2.stopPropagation();
          return;
        }
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          handleClick2(e2);
        }
      }}
      onMouseEnter={showPreview}
      onMouseLeave={schedulePreviewClose}
    >
      {item.kind === "text" ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceTextIcon />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">
            {item.name}
          </span>
        </div>
      ) : item.kind === "file" ? (
        // Source documents have no renderable thumbnail (pdf / docx / xlsx),
        // so they reuse the reference-text chip shape with a document icon.
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <FileText size={16} strokeWidth={1.5} />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">
            {item.name}
          </span>
        </div>
      ) : item.kind === "audio" ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceAudioIcon />
          <span className="text-[9px] leading-tight truncate max-w-[40px]">
            {item.name}
          </span>
        </div>
      ) : item.kind === "video" ? (
        <video
          src={item.thumbUrl}
          muted={true}
          playsInline={true}
          preload="metadata"
          onLoadedMetadata={(e2) => {
            try {
              e2.currentTarget.currentTime = 1e-3;
            } catch {}
          }}
          className="h-full w-full appearance-none border-0 object-cover outline-none ring-0 shadow-none pointer-events-none"
        >
          <track kind="captions" />
        </video>
      ) : item.thumbUrl ? (
        <img
          src={item.thumbUrl}
          alt={item.name}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5 text-[var(--canvas-controls-text-muted)]">
          <ReferenceImagePlaceholderIcon />
        </div>
      )}
      {isPreviewable && (
        <ReferenceThumbnailOverlay
          visible={hovered}
          disabled={disabled2 || isDurationExceeded}
          onReference={() => {
            showPreview();
            onClick(item);
          }}
        />
      )}
      {item.badgeLabel && !isPreviewable && (
        <span className="absolute bottom-0 left-0 px-1 text-[9px] leading-normal bg-black/60 text-white">
          {item.badgeLabel}
        </span>
      )}
      {item.kind === "video" && (
        <ReferenceThumbnailVideoInfo
          visible={!hovered}
          durationLabel={durationLabel}
        />
      )}
      {item.kind !== "video" && durationLabel && (
        <span className="absolute top-0.5 left-0.5 rounded-[3px] bg-black/60 px-1 py-0.5 text-[9px] leading-none text-white">
          {durationLabel}
        </span>
      )}
      {isDurationExceeded && (
        <span
          data-action-ui-id={durationWarningActionId}
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/55 px-1 text-center text-[10px] leading-tight text-white group-hover/thumb:hidden"
        >
          <CircleAlert
            size={16}
            strokeWidth={2}
            aria-label={t2(durationWarningKey, {
              min: item.durationMinSec,
              max: item.durationMaxSec,
              defaultValue: "参考媒体时长需在 {{min}}-{{max}} 秒之间",
            })}
          />
        </span>
      )}
      {videoDurationExcessSec != null &&
        onClipVideo &&
        !disabled2 &&
        !readOnly2 && (
          <Tooltip$1
            content={t2("canvas.videoSlot.durationTooLong")}
            side="top"
          >
            <button
              type="button"
              aria-label={t2("canvas.clip", {
                defaultValue: "裁剪",
              })}
              data-action-ui-id="popover.reference-video-duration-warning.clip"
              className="absolute inset-0 z-[2] hidden cursor-pointer items-center justify-center bg-black/70 text-white group-hover/thumb:flex"
              onClick={handleClipVideo}
            >
              <Scissors size={16} strokeWidth={1.5} />
            </button>
          </Tooltip$1>
        )}
      {audioDurationExcessSec != null &&
        onClipAudio &&
        !disabled2 &&
        !readOnly2 && (
          <Tooltip$1
            content={t2("canvas.audioSlot.durationTooLong")}
            side="top"
          >
            <button
              type="button"
              aria-label={t2("canvas.clip", {
                defaultValue: "裁剪",
              })}
              data-action-ui-id="popover.reference-audio-duration-warning.clip"
              className="absolute inset-0 z-[2] hidden cursor-pointer items-center justify-center bg-black/70 text-white group-hover/thumb:flex"
              onClick={handleClipAudio}
            >
              <Scissors size={16} strokeWidth={1.5} />
            </button>
          </Tooltip$1>
        )}
      {!disabled2 && !readOnly2 && (
        <div
          className={`absolute top-px right-px z-[3] flex transition-opacity duration-150 motion-reduce:transition-none focus-within:opacity-100 ${hovered ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <button
            type="button"
            aria-label={t2("a11y.removeAttachment", "Remove attachment")}
            data-action-ui-id="popover.attachment-remove"
            className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            onClick={handleRemove}
          >
            <X$7 size={9} strokeWidth={2.2} className="scale-[1.15]" />
          </button>
        </div>
      )}
      {reading && supportsFullTextReading && (
        <TextReadDialog
          open={reading}
          onOpenChange={setReading}
          path={item.path}
          name={item.name}
        />
      )}
      {hovered &&
        !reading &&
        chipEl &&
        (item.kind === "text" || item.kind === "file") && (
          <TextHoverPreview
            path={item.path}
            name={item.name}
            metadataOnly={!supportsFullTextReading}
            anchorRect={chipEl.getBoundingClientRect()}
            onReadFull={
              supportsFullTextReading
                ? () => {
                    setHovered(false);
                    setReading(true);
                  }
                : void 0
            }
            action={
              onReplace && !disabled2 && !readOnly2
                ? {
                    label: t2("canvas.attachment.replace", {
                      defaultValue: "Replace",
                    }),
                    onClick: handleReplace,
                    actionUiId: "popover.attachment-replace",
                  }
                : void 0
            }
            onPreviewMouseEnter={showPreview}
            onPreviewMouseLeave={schedulePreviewClose}
          />
        )}
      {hovered &&
        !lightboxItem &&
        chipEl &&
        item.kind !== "text" &&
        item.kind !== "file" && (
          <MediaHoverPreview
            kind={item.kind}
            url={item.thumbUrl}
            name={item.name}
            durationSec={item.durationSec}
            width={item.width}
            height={item.height}
            anchorRect={chipEl.getBoundingClientRect()}
            previewAction={
              isPreviewable
                ? {
                    label: t2("canvas.fullscreenPreview"),
                    onClick: () => {
                      clearPreviewCloseTimer();
                      setHovered(false);
                      if (item.kind === "image" || item.kind === "video") {
                        setLightboxItem({
                          kind: item.kind,
                          url: item.thumbUrl,
                          filePath: item.path,
                          fileName: item.name,
                        });
                      }
                    },
                  }
                : void 0
            }
            locateAction={
              onLocate
                ? {
                    label: t2("canvas.referenceNavigation.locate"),
                    onClick: () => {
                      clearPreviewCloseTimer();
                      setHovered(false);
                      onLocate();
                    },
                  }
                : void 0
            }
            action={
              onReplace && !disabled2 && !readOnly2
                ? {
                    label: t2("canvas.attachment.replace", {
                      defaultValue: "Replace",
                    }),
                    onClick: handleReplace,
                    actionUiId: "popover.attachment-replace",
                  }
                : void 0
            }
            onPreviewMouseEnter={showPreview}
            onPreviewMouseLeave={schedulePreviewClose}
          />
        )}
      <ReferenceMediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
