import { default as reactExports } from "react";
export function readDpr() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}
export function useDevicePixelRatio() {
  const [dpr, setDpr] = reactExports.useState(readDpr);
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    let cancelled = false;
    let mql = null;
    const subscribe2 = currentDpr => {
      mql = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
      mql.addEventListener("change", onChange);
    };
    const onChange = () => {
      if (cancelled) return;
      const next2 = readDpr();
      setDpr(prev => prev === next2 ? prev : next2);
      mql?.removeEventListener("change", onChange);
      subscribe2(next2);
    };
    subscribe2(readDpr());
    return () => {
      cancelled = true;
      mql?.removeEventListener("change", onChange);
    };
  }, []);
  return dpr;
}