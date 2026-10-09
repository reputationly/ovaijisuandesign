// audio-preview-player.jsx
import {
  Loader2,
  PlaybackCircleToggleIcon,
  reactExports,
  useTranslation,
  Volume2,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatTime$2, useMediaPlayback, VolumeX } from "./package.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";

export function AudioPreviewPlayer({
  url: url2,
  fileName: _fileName = url2,
  active: active2 = true,
  durationSec,
  onDurationChange,
  onTimeChange,
}) {
  const { t: t2 } = useTranslation();
  const id2 = `attachment-audio-${reactExports.useId()}`;
  const audioRef = reactExports.useRef(null);
  const requestRef = reactExports.useRef(0);
  const [playing, setPlaying] = reactExports.useState(false);
  const [pending2, setPending] = reactExports.useState(false);
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
      if (useMediaPlayback.getState().playingId === id2)
        useMediaPlayback.getState().stop();
    };
    const unsubscribe = useMediaPlayback.subscribe((state2) => {
      if (state2.playingId !== id2) {
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
    if (active2 && url2) audio.src = url2;
    else stop();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [active2, durationSec, id2, url2]);
  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !active2) return;
    if (playing || pending2) {
      requestRef.current += 1;
      audio.pause();
      setPlaying(false);
      setPending(false);
      if (useMediaPlayback.getState().playingId === id2)
        useMediaPlayback.getState().stop();
      return;
    }
    if (error) audio.load();
    setError(false);
    setPending(true);
    const request = ++requestRef.current;
    useMediaPlayback.getState().play(id2);
    try {
      await audio.play();
      if (
        request !== requestRef.current ||
        useMediaPlayback.getState().playingId !== id2
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
      if (useMediaPlayback.getState().playingId === id2)
        useMediaPlayback.getState().stop();
    }
  };
  const handleMetadata = () => {
    const next2 = audioRef.current?.duration;
    if (next2 && Number.isFinite(next2)) {
      setDuration(next2);
      onDurationChange?.(next2);
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
          const next2 = audioRef.current?.currentTime ?? 0;
          setTime(next2);
          onTimeChange?.(next2);
        }}
        onPlaying={() => {
          if (!active2 || useMediaPlayback.getState().playingId !== id2) {
            audioRef.current?.pause();
            return;
          }
          setPlaying(true);
          setPending(false);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => {
          if (useMediaPlayback.getState().playingId === id2) setPending(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === id2)
            useMediaPlayback.getState().stop();
        }}
        onError={() => {
          if (!active2) return;
          setError(true);
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === id2)
            useMediaPlayback.getState().stop();
        }}
      />
      <div
        className="audio-preview-controls"
        data-testid="audio-preview-controls"
      >
        <div className="flex h-7 items-center gap-2">
          <Button$2
            variant="ghost"
            size="icon"
            disabled={!active2 || !url2}
            aria-label={
              playing || pending2 ? t2("canvas.pause") : t2("canvas.play")
            }
            data-action-ui-id="attachment-audio.toggle"
            className="size-6 shrink-0 rounded-full p-0 text-[var(--fg-default)] bg-transparent hover:bg-transparent hover:opacity-90"
            onClick={(event) => {
              event.stopPropagation();
              void handleToggle();
            }}
          >
            {pending2 ? (
              <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <PlaybackCircleToggleIcon
                playing={playing}
                size={24}
                className="size-full"
              />
            )}
          </Button$2>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={validDuration ? time / validDuration : 0}
            disabled={!active2 || !validDuration}
            aria-label={t2("attachment.audio.seek", "Playback position")}
            data-action-ui-id="attachment-audio.seek"
            className="audio-preview-seek min-w-0 flex-1"
            onChange={handleSeek}
            onClick={(event) => event.stopPropagation()}
          />
          <Button$2
            variant="ghost"
            size="icon"
            aria-label={
              muted ? t2("assetPreview.unmute") : t2("assetPreview.mute")
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
          </Button$2>
        </div>
        <div className="flex items-center justify-between text-[11px] leading-4 tabular-nums text-[var(--canvas-controls-text-muted)]">
          <span>{formatTime$2(time, true)}</span>
          <span>{formatTime$2(validDuration, true)}</span>
        </div>
      </div>
      {pending2 && (
        <p
          role="status"
          className="mt-1 text-[11px] text-[var(--canvas-controls-text-muted)]"
        >
          {t2("common.loading", "Loading...")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {t2(
            "attachment.audio.loadFailed",
            "Audio could not be played. Try again.",
          )}
        </p>
      )}
    </div>
  );
}
