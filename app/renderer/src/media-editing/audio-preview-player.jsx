// audio-preview-player.jsx
import {
  Loader2,
  PlaybackCircleToggleIcon,
  reactExports,
  useTranslation,
  Volume2,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatTime, useMediaPlayback, VolumeX } from "./package.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
export function AudioPreviewPlayer({
  url,
  fileName: _fileName = url,
  active: isActive = true,
  durationSec,
  onDurationChange,
  onTimeChange,
}) {
  const { t } = useTranslation();
  const playbackId = `attachment-audio-${reactExports.useId()}`;
  const audioRef = reactExports.useRef(null);
  const requestRef = reactExports.useRef(0);
  const [playing, setPlaying] = reactExports.useState(false);
  const [pending, setPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  const [time, setTime] = reactExports.useState(0);
  const [duration, setDuration] = reactExports.useState(durationSec ?? 0);
  const validDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 0;
  reactExports.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const stop = () => {
      requestRef.current += 1;
      audio.pause();
      setPlaying(false);
      setPending(false);
      if (useMediaPlayback.getState().playingId === playbackId)
        useMediaPlayback.getState().stop();
    };
    const unsubscribe = useMediaPlayback.subscribe((state) => {
      if (state.playingId !== playbackId) {
        requestRef.current += 1;
        audio.pause();
        setPlaying(false);
        setPending(false);
      }
    });
    const handleVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    setTime(0);
    setError(false);
    setDuration(durationSec ?? 0);
    if (isActive && url) audio.src = url;
    else stop();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [isActive, durationSec, playbackId, url]);
  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !isActive) return;
    if (playing || pending) {
      requestRef.current += 1;
      audio.pause();
      setPlaying(false);
      setPending(false);
      if (useMediaPlayback.getState().playingId === playbackId)
        useMediaPlayback.getState().stop();
      return;
    }
    if (error) audio.load();
    setError(false);
    setPending(true);
    const request = ++requestRef.current;
    useMediaPlayback.getState().play(playbackId);
    try {
      await audio.play();
      if (
        request !== requestRef.current ||
        useMediaPlayback.getState().playingId !== playbackId
      ) {
        audio.pause();
        return;
      }
      setPlaying(true);
      setPending(false);
    } catch {
      if (request !== requestRef.current) return;
      setError(true);
      setPending(false);
      if (useMediaPlayback.getState().playingId === playbackId)
        useMediaPlayback.getState().stop();
    }
  };
  const handleMetadata = () => {
    const next = audioRef.current?.duration;
    if (next && Number.isFinite(next)) {
      setDuration(next);
      onDurationChange?.(next);
    }
  };
  const handleSeek = (event) => {
    const nextProgress = Number(event.currentTarget.value);
    const nextTime = nextProgress * validDuration;
    if (audioRef.current && validDuration > 0)
      audioRef.current.currentTime = nextTime;
    setTime(nextTime);
    onTimeChange?.(nextTime);
  };
  return (
    <div className="w-full min-w-0" data-testid="audio-preview-player">
      <audio
        ref={audioRef}
        preload="metadata"
        muted={muted}
        onLoadedMetadata={handleMetadata}
        onDurationChange={handleMetadata}
        onTimeUpdate={() => {
          const next = audioRef.current?.currentTime ?? 0;
          setTime(next);
          onTimeChange?.(next);
        }}
        onPlaying={() => {
          if (!isActive || useMediaPlayback.getState().playingId !== playbackId) {
            audioRef.current?.pause();
            return;
          }
          setPlaying(true);
          setPending(false);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => {
          if (useMediaPlayback.getState().playingId === playbackId) setPending(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === playbackId)
            useMediaPlayback.getState().stop();
        }}
        onError={() => {
          if (!isActive) return;
          setError(true);
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === playbackId)
            useMediaPlayback.getState().stop();
        }}
      />
      <div
        className="audio-preview-controls"
        data-testid="audio-preview-controls"
      >
        <div className="flex h-7 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={!isActive || !url}
            aria-label={
              playing || pending ? t("canvas.pause") : t("canvas.play")
            }
            data-action-ui-id="attachment-audio.toggle"
            className="size-6 shrink-0 rounded-full p-0 text-[var(--fg-default)] bg-transparent hover:bg-transparent hover:opacity-90"
            onClick={(event) => {
              event.stopPropagation();
              void handleToggle();
            }}
          >
            {pending ? (
              <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <PlaybackCircleToggleIcon
                playing={playing}
                size={24}
                className="size-full"
              />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={validDuration ? time / validDuration : 0}
            disabled={!isActive || !validDuration}
            aria-label={t("attachment.audio.seek", "Playback position")}
            data-action-ui-id="attachment-audio.seek"
            className="audio-preview-seek min-w-0 flex-1"
            onChange={handleSeek}
            onClick={(event) => event.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              muted ? t("assetPreview.unmute") : t("assetPreview.mute")
            }
            aria-pressed={muted}
            data-action-ui-id="attachment-audio.mute"
            className="size-6 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--fg-default)]"
            onClick={(event) => {
              event.stopPropagation();
              setMuted((value) => !value);
            }}
          >
            {muted ? (
              <VolumeX size={16} strokeWidth={1.5} />
            ) : (
              <Volume2 size={16} strokeWidth={1.5} />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] leading-4 tabular-nums text-[var(--canvas-controls-text-muted)]">
          <span>{formatTime(time, true)}</span>
          <span>{formatTime(validDuration, true)}</span>
        </div>
      </div>
      {pending && (
        <p
          role="status"
          className="mt-1 text-[11px] text-[var(--canvas-controls-text-muted)]"
        >
          {t("common.loading", "Loading...")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {t(
            "attachment.audio.loadFailed",
            "Audio could not be played. Try again.",
          )}
        </p>
      )}
    </div>
  );
}
