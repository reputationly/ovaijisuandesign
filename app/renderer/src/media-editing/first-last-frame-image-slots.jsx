// first-last-frame-image-slots.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { ImageSlotList } from "./image-slot-list.jsx";
import { AttachmentBar } from "../generation/attachment-bar.jsx";
import { basename$c } from "../generation/param-label-fallbacks.js";
import { ExpandToggleButton } from "../generation/expand-arrow-icon.jsx";
import { AudioClipPanel } from "./audio-preview.jsx";
import { VideoClipPanel } from "./video-preview.jsx";

const SWAP_SLOT_ANIMATION_CLASSES = {
  a: [
    "canvas-frame-slot-swap-from-right-a",
    "canvas-frame-slot-swap-from-left-a",
  ],
  b: [
    "canvas-frame-slot-swap-from-right-b",
    "canvas-frame-slot-swap-from-left-b",
  ],
};

const SWAP_ANIMATION_DURATION_MS = 260;

function FirstLastFrameImageSlots({
  imagePaths,
  contextKey,
  disabled: disabled2,
  resolveFileUrl,
  onUpdatePaths,
  onReplacePath,
  getLocateAction,
  onReference,
  onEditImage,
}) {
  const { t: t2 } = useTranslation();
  const [swapAnimationRun, setSwapAnimationRun] = reactExports.useState(0);
  const [swapAnimationActive, setSwapAnimationActive] =
    reactExports.useState(false);
  const hasFrame = imagePaths.slice(0, 2).some((path2) => path2?.trim());
  const swapDisabled = disabled2 || !hasFrame;
  const swapLabel = t2("canvas.imageSlot.swapFrames", {
    defaultValue: "交换首尾帧",
  });
  reactExports.useEffect(() => {
    if (!swapAnimationActive || swapAnimationRun === 0) return;
    const timeoutId = window.setTimeout(
      () => setSwapAnimationActive(false),
      SWAP_ANIMATION_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [swapAnimationActive, swapAnimationRun]);
  const handleSwapFrames = () => {
    if (swapDisabled) return;
    setSwapAnimationRun((currentRun) => currentRun + 1);
    setSwapAnimationActive(true);
    onUpdatePaths([imagePaths[1] ?? "", imagePaths[0] ?? ""]);
  };
  const swapAnimationVariant = swapAnimationRun % 2 === 0 ? "b" : "a";
  return (
    <ImageSlotList
      imagePaths={imagePaths}
      contextKey={contextKey}
      renderedSlotCount={2}
      maxSlots={2}
      disabled={disabled2}
      resolveFileUrl={resolveFileUrl}
      getSlotLabel={(index2) =>
        index2 === 0
          ? t2("canvas.imageSlot.firstFrame")
          : t2("canvas.imageSlot.lastFrame")
      }
      getSlotActionUiId={(index2) =>
        index2 === 0 ? "popover.frame-slot.first" : "popover.frame-slot.last"
      }
      getSlotClassName={(index2) =>
        swapAnimationActive
          ? SWAP_SLOT_ANIMATION_CLASSES[swapAnimationVariant][index2]
          : void 0
      }
      enableHoverReplace={true}
      getLocateAction={getLocateAction}
      onReference={onReference}
      onEditImage={onEditImage}
      renderSlotSeparator={() => (
        <Tooltip$1 content={swapLabel} side="top">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSwapFrames();
            }}
            disabled={swapDisabled}
            aria-label={swapLabel}
            title={swapLabel}
            data-action-ui-id="popover.frame-slot.swap"
            className="flex size-6 shrink-0 self-center cursor-pointer items-center justify-center rounded-full backdrop-blur-[20px] transition-colors duration-150 hover:enabled:bg-[var(--canvas-controls-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-border)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none ${swapAnimationRun % 2 === 1 ? "rotate-180" : "rotate-0"}`}
            >
              <path
                d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z"
                fill="var(--canvas-controls-bg)"
                fillOpacity="0.2"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.70557 13.3054C6.36055 13.3056 6.08057 13.5853 6.08057 13.9304C6.08057 14.2754 6.36055 14.5552 6.70557 14.5554H14.606V16.2888C14.606 16.5518 14.7708 16.787 15.0181 16.8766C15.2654 16.9663 15.5429 16.8912 15.7114 16.6891L17.6782 14.3308C17.7725 14.2178 17.8222 14.0779 17.8237 13.9362L17.9194 13.8278H17.8149C17.8058 13.7726 17.7896 13.718 17.7651 13.6657C17.6623 13.446 17.4413 13.3054 17.1987 13.3054H6.70557ZM15.856 14.5641V14.5554H15.8638L15.856 14.5641ZM8.88623 7.12372C8.63901 7.03419 8.36237 7.10941 8.19385 7.31122L6.22607 9.66962C6.07071 9.85585 6.03737 10.115 6.14014 10.3347C6.24292 10.5542 6.46314 10.6949 6.70557 10.695H17.1987C17.5439 10.695 17.8237 10.4152 17.8237 10.07C17.8237 9.72483 17.5439 9.44501 17.1987 9.44501H9.29834V7.71161C9.29834 7.44853 9.13357 7.21334 8.88623 7.12372ZM8.04834 9.44501H8.0415L8.04834 9.43622V9.44501Z"
                fill="var(--canvas-controls-text)"
                fillOpacity="0.7"
              />
            </svg>
          </button>
        </Tooltip$1>
      )}
      onUpdatePaths={onUpdatePaths}
      onReplacePath={onReplacePath}
    />
  );
}

export function VideoPopoverReferenceSection({
  isTextToVideo,
  isFirstLastFrame,
  imagePaths,
  resolveFileUrl,
  onUpdatePaths,
  attachments,
  expanded,
  onToggle,
  videoClipItem,
  audioClipItem,
  onCloseVideoClip,
  onCloseAudioClip,
  onExportVideoClip,
  onExportAudioClip,
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3 shrink-0">
        {isTextToVideo ? null : isFirstLastFrame ? (
          <FirstLastFrameImageSlots
            imagePaths={imagePaths}
            resolveFileUrl={resolveFileUrl}
            onUpdatePaths={onUpdatePaths}
            disabled={attachments.disabled}
            onReference={(path2) =>
              attachments.onItemClick({
                path: path2,
                kind: "image",
                name: basename$c(path2),
                thumbUrl: "",
              })
            }
            getLocateAction={(path2) =>
              attachments.getLocateAction?.({
                path: path2,
                kind: "image",
                name: path2,
                thumbUrl: "",
              })
            }
          />
        ) : (
          <AttachmentBar {...attachments} />
        )}
        <ExpandToggleButton expanded={expanded} onToggle={onToggle} />
      </div>
      {videoClipItem && (
        <VideoClipPanel
          videoUrl={videoClipItem.thumbUrl}
          videoName={videoClipItem.name}
          onClose={onCloseVideoClip}
          onExport={onExportVideoClip}
        />
      )}
      {audioClipItem && (
        <AudioClipPanel
          audioUrl={audioClipItem.thumbUrl}
          audioName={audioClipItem.name}
          onClose={onCloseAudioClip}
          onExport={onExportAudioClip}
        />
      )}
    </div>
  );
}
