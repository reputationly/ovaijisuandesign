// progress-bar-inner.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatTime$2 } from "./package.jsx";

function formatControlTime(seconds, roundUp = false) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = roundUp ? Math.ceil(seconds) : Math.floor(seconds);
  const m3 = Math.floor(total / 60);
  const s2 = total % 60;
  return `${m3.toString().padStart(2, "0")}:${s2.toString().padStart(2, "0")}`;
}

function ProgressBarInner({
  videoRef,
  isPlaying,
  tone = "dark",
  display = "inline",
}) {
  const barRef = reactExports.useRef(null);
  const timeRef = reactExports.useRef(null);
  const durationRef = reactExports.useRef(null);
  const filledRef = reactExports.useRef(null);
  const thumbRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const syncDOM = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const t2 = el.currentTime;
    const d2 = el.duration;
    const displayTime = el.ended ? d2 : t2;
    const pct = d2 > 0 && Number.isFinite(d2) ? (t2 / d2) * 100 : 0;
    if (timeRef.current) {
      timeRef.current.textContent =
        display === "time"
          ? `${formatControlTime(displayTime, el.ended)} / ${formatControlTime(d2, true)}`
          : formatTime$2(displayTime, el.ended);
    }
    if (durationRef.current)
      durationRef.current.textContent = formatTime$2(d2, true);
    if (filledRef.current) filledRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
  }, [display, videoRef]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function tick() {
      syncDOM();
      rafRef.current = requestAnimationFrame(tick);
    }
    if (isPlaying && !isDragging) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      syncDOM();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, isDragging, syncDOM, videoRef]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const events2 = [
      "loadedmetadata",
      "durationchange",
      "seeked",
      "ended",
      "emptied",
    ];
    for (const event of events2) el.addEventListener(event, syncDOM);
    syncDOM();
    return () => {
      for (const event of events2) el.removeEventListener(event, syncDOM);
    };
  }, [videoRef, syncDOM]);
  const seekToPosition = reactExports.useCallback(
    (clientX) => {
      const el = videoRef.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const d2 = el.duration;
      if (!Number.isFinite(d2) || d2 <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      el.currentTime = ratio * d2;
      syncDOM();
    },
    [videoRef, syncDOM],
  );
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      seekToPosition(e2.clientX);
    },
    [seekToPosition],
  );
  const handleThumbDown = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      e2.preventDefault();
      setIsDragging(true);
      const onMove = (ev) => seekToPosition(ev.clientX);
      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [seekToPosition],
  );
  const isLight = tone === "light";
  const labelCls = isLight
    ? "text-foreground/65"
    : "text-[var(--canvas-video-control-label)]";
  const trackBg = isLight
    ? "rgba(0,0,0,0.18)"
    : "var(--canvas-video-control-track)";
  const fillBg = isLight
    ? "currentColor"
    : "var(--canvas-video-control-progress)";
  const thumbShadow = isLight
    ? "0 0 3px rgba(0,0,0,0.25)"
    : "0 0 3px var(--canvas-video-control-shadow)";
  if (display === "time") {
    return (
      // Text is owned by syncDOM. React children here would be detached by
      // textContent assignments and later metadata updates would be invisible.
      <span
        ref={timeRef}
        className={`min-w-0 shrink truncate select-none text-[12px] font-medium tabular-nums leading-none drop-shadow-[0_1px_3px_var(--canvas-video-control-shadow)] ${labelCls}`}
      />
    );
  }
  return (
    <>
      {display === "inline" && (
        <span
          ref={timeRef}
          className={`shrink-0 select-none text-[11px] tabular-nums ${labelCls}`}
        />
      )}
      <div
        ref={barRef}
        className={`group/progress relative cursor-pointer ${display === "bar" ? "pointer-events-auto w-full" : "flex-1"}`}
        style={{
          height: display === "bar" ? 12 : 16,
        }}
        onClick={handleClick2}
      >
        <div
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            background: trackBg,
          }}
        />
        <div
          ref={filledRef}
          className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            background: fillBg,
            transition: isPlaying && !isDragging ? "none" : "width 0.1s",
          }}
        />
        <div
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-hover/progress:opacity-100"
          style={{
            width: 10,
            height: 10,
            background: fillBg,
            boxShadow: thumbShadow,
            opacity: isDragging ? 1 : void 0,
          }}
          onMouseDown={handleThumbDown}
        />
      </div>
      {display === "inline" && (
        <span
          ref={durationRef}
          className={`shrink-0 select-none text-[11px] tabular-nums ${labelCls}`}
        />
      )}
    </>
  );
}

export const ProgressBar = reactExports.memo(ProgressBarInner);
