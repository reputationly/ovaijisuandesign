import { default as reactExports } from "react";
export function useMediaElementPlayback(ref, playing, active2, src, stop) {
  const wantsPlayback = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const media2 = ref.current;
    if (!media2) return;
    let cancelled = false;
    wantsPlayback.current = playing && active2 && !!src;
    const hide2 = () => {
      if (document.visibilityState !== "hidden") return;
      media2.pause();
      if (playing) stop();
    };
    if (playing && active2 && src && document.visibilityState !== "hidden") {
      try {
        void media2.play().then(() => {
          if (cancelled && !wantsPlayback.current) media2.pause();
        }).catch(() => {
          if (!cancelled) stop();
        });
      } catch {
        stop();
      }
    } else {
      media2.pause();
      if (playing) stop();
    }
    document.addEventListener("visibilitychange", hide2);
    return () => {
      cancelled = true;
      wantsPlayback.current = false;
      document.removeEventListener("visibilitychange", hide2);
      media2.pause();
    };
  }, [ref, playing, active2, src, stop]);
}