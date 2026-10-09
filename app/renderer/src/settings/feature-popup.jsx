// feature-popup.jsx
import {
  GiftIcon,
  Markdown$1,
  reactExports,
  remarkGfm,
  useTranslation,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { H3_LAUNCH_POPUP_ID } from "./normalize-hailuo03-video-trial-eligibility.js";
import { useFeaturePopupAction } from "./use-feature-popup-action.js";
import { DialogClose } from "../infra/gateway-http-error.jsx";
import { rehypeSanitize } from "./request-prompt-prefill.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import { trackEvent } from "../infra/sanitize-track-props.js";

const POPUP_TYPE$2 = "feature";

export function FeaturePopup({ popup, onClose }) {
  const { t: t2 } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const closePendingRef = reactExports.useRef(false);
  const [isOpen, setIsOpen] = reactExports.useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = reactExports.useState(false);
  const [isVideoMuted, setIsVideoMuted] = reactExports.useState(false);
  const {
    action: activeAction,
    execute: executeAction,
    isPending: isActionPending,
  } = useFeaturePopupAction(popup, {
    source: "server-popup.feature",
  });
  const url2 = activeAction?.url ?? "";
  const label = activeAction?.label ?? "";
  const trialWindowActive = popup.trial_active !== false;
  const isH3TrialPopup = popup.id === H3_LAUNCH_POPUP_ID;
  const serverHint = activeAction?.hint?.trim() ?? "";
  const actionHint = !trialWindowActive || !isH3TrialPopup ? "" : serverHint;
  const videoUrl = popup.video_url ?? "";
  const coverUrl = popup.cover_url ?? "";
  const beginClose = () => {
    closePendingRef.current = true;
    setIsOpen(false);
  };
  const handleOpenChangeComplete = (open) => {
    if (open || !closePendingRef.current) return;
    closePendingRef.current = false;
    onClose();
  };
  const handleAction = async () => {
    if (await executeAction()) beginClose();
  };
  const handleToggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideoPlaying) {
      video.pause();
      return;
    }
    const played = video.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  };
  const handleToggleMute = () => {
    setIsVideoMuted((muted) => !muted);
  };
  const handleOpenChange = (open, eventDetails) => {
    if (open) return;
    if (!popup.can_close) {
      eventDetails.cancel();
      return;
    }
    if (
      eventDetails.reason !== "escape-key" &&
      eventDetails.reason !== "close-press"
    ) {
      eventDetails.cancel();
      return;
    }
    const method =
      eventDetails.reason === "escape-key" ? "escape" : "cancel_button";
    trackEvent(TRACK_EVENTS.SERVER_DRIVEN_POPUP_DISMISS, {
      popup_type: POPUP_TYPE$2,
      url: url2,
      method,
    });
    beginClose();
  };
  const visibleTitle = popup.title?.trim() || "";
  const subtitle =
    popup.subtitle?.trim() ||
    (isH3TrialPopup ? t2("serverPopup.feature.topTitle") : "");
  const a11yTitle =
    visibleTitle || popup.description || t2("serverPopup.a11yTitle");
  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[600px]"
        showCloseButton={false}
        overlayClassName="!bg-black opacity-50 ![backdrop-filter:none] ![-webkit-backdrop-filter:none]"
        data-action-ui-id="server-popup.feature"
      >
        {popup.can_close && (
          <DialogClose
            render={
              <Button$1
                variant="ghost"
                size="icon-lg"
                onClick={(event) => event.stopPropagation()}
                className="absolute top-3 right-3 z-20 size-10 cursor-pointer rounded-full border-[var(--Line-line_03,rgba(255,255,255,0.06))] bg-black/40 text-white hover:bg-black/55 hover:text-white active:!translate-y-0 [&_svg]:text-white"
                data-action-ui-id="server-popup.feature.close"
              />
            }
          >
            <Icon icon={XIcon} size="lg" strokeWidth={2} />
            <span className="sr-only">{t2("common.close")}</span>
          </DialogClose>
        )}
        {videoUrl ? (
          <div className="w-full p-1">
            <div
              className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-[16px] bg-muted"
              data-action-ui-id="server-popup.feature.media"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                poster={coverUrl || void 0}
                autoPlay={true}
                loop={true}
                muted={isVideoMuted}
                playsInline={true}
                preload="metadata"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                className="pointer-events-none h-full w-full object-cover"
                data-action-ui-id="server-popup.feature.video"
              />
              <button
                type="button"
                onClick={handleToggleVideo}
                aria-label={t2(isVideoPlaying ? "common.pause" : "common.play")}
                className="group absolute inset-0 flex cursor-pointer items-center justify-center"
                data-action-ui-id={`server-popup.feature.${isVideoPlaying ? "pause" : "play"}`}
              >
                {!isVideoPlaying && (
                  <span
                    className="flex size-15 items-center justify-center rounded-full bg-transparent transition-colors duration-100 group-hover:opacity-90 motion-reduce:transition-none"
                    data-action-ui-id="server-popup.feature.play-indicator"
                  >
                    <PlaybackPlayIcon
                      size={32}
                      className="text-[var(--media-overlay-foreground)] drop-shadow-lg"
                    />
                  </span>
                )}
              </button>
              <Button$1
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleMute();
                }}
                aria-label={t2(
                  isVideoMuted
                    ? "serverPopup.feature.unmute"
                    : "serverPopup.feature.mute",
                )}
                className="absolute right-3 bottom-3 z-10 size-9 cursor-pointer bg-transparent p-0 text-white opacity-70 shadow-none transition-opacity duration-100 hover:bg-transparent hover:text-white hover:opacity-100 active:!translate-y-0 [&_svg]:text-white [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                data-action-ui-id="server-popup.feature.mute"
              >
                <Icon
                  icon={isVideoMuted ? VolumeXIcon : Volume2Icon}
                  size="md"
                  strokeWidth={2}
                />
              </Button$1>
            </div>
          </div>
        ) : coverUrl ? (
          <div className="w-full p-1">
            <button
              type="button"
              onClick={handleAction}
              disabled={isActionPending}
              aria-label={label || a11yTitle}
              className="block aspect-video w-full overflow-hidden rounded-[16px] bg-muted disabled:cursor-wait"
              data-action-ui-id="server-popup.feature.cover"
            >
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          </div>
        ) : null}
        <DialogHeader className="gap-4 px-8 pt-6">
          <div className="flex flex-col gap-4 text-left">
            {subtitle && (
              <span className="text-xs font-medium leading-none text-muted-foreground">
                {subtitle}
              </span>
            )}
            {visibleTitle ? (
              <DialogTitle className="font-heading text-xl font-medium leading-tight text-foreground">
                {visibleTitle}
              </DialogTitle>
            ) : (
              <DialogTitle className="sr-only">{a11yTitle}</DialogTitle>
            )}
          </div>
          <DialogDescription
            render={<div />}
            className="chat-markdown text-left text-sm text-foreground [&_ol]:!pl-[1em] [&_ol]:list-decimal [&_ul]:!pl-[1em] [&_ul]:list-disc"
          >
            <Markdown$1
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {popup.description}
            </Markdown$1>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          className={`flex-col gap-0 px-8 pt-6 ${actionHint ? "pb-4" : "pb-8"} sm:flex-col`}
        >
          <Button$1
            className="relative h-12 w-full rounded-xl text-sm"
            onClick={handleAction}
            loading={isActionPending}
            disabled={isActionPending}
            data-action-ui-id="server-popup.feature.confirm"
          >
            {actionHint && <Icon icon={GiftIcon} size="lg" strokeWidth={2} />}
            {label}
          </Button$1>
          {actionHint && (
            <div
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--brand-accent)_8%,transparent)_18%,color-mix(in_srgb,var(--brand-accent)_8%,transparent)_82%,transparent_100%)] px-8 text-center text-sm leading-none text-foreground"
              data-action-ui-id="server-popup.feature.action-hint"
            >
              <span aria-hidden="true">🎉</span>
              <span>{actionHint}</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
