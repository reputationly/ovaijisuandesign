// use-viewer-active.js
import { getWorkspaceContentBudgetSnapshot } from "./aggregate-snapshots.js";
import { reactExports } from "../vendor.js";
import { useWorkspaceContentBudgetScope } from "./use-plugin-metadata-store.js";

const CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS = 5e3;

function resolveWorkspaceFileViewerUnloadMs(requestedMs, workspaceId2) {
  if (!Number.isFinite(requestedMs) || requestedMs <= 0)
    return CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS;
  const snapshot2 = getWorkspaceContentBudgetSnapshot(workspaceId2);
  if (!snapshot2.overBudget) return requestedMs;
  return Math.min(requestedMs, CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS);
}

const DEFAULT_UNLOAD_MS = 15e3;

function isHostOffscreen(host) {
  const rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;
  return (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  );
}

export function useViewerActive(opts = {}) {
  const workspaceId2 = useWorkspaceContentBudgetScope();
  const unloadAfterMs = resolveWorkspaceFileViewerUnloadMs(
    opts.unloadAfterMs ?? DEFAULT_UNLOAD_MS,
    workspaceId2,
  );
  const [hostEl, setHostEl] = reactExports.useState(null);
  const [active2, setActive2] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!hostEl) return;
    if (typeof IntersectionObserver === "undefined") return;
    let timer2 = null;
    let rafId2 = null;
    let firstCallback = true;
    const clearTimer2 = () => {
      if (timer2 != null) {
        clearTimeout(timer2);
        timer2 = null;
      }
    };
    const clearRaf = () => {
      if (rafId2 != null) {
        cancelAnimationFrame(rafId2);
        rafId2 = null;
      }
    };
    const observer2 = new IntersectionObserver((entries2) => {
      const visible = entries2[0]?.isIntersecting ?? false;
      if (visible) {
        clearTimer2();
        clearRaf();
        setActive2(true);
      } else if (firstCallback) {
        clearTimer2();
        clearRaf();
        rafId2 = requestAnimationFrame(() => {
          rafId2 = null;
          if (isHostOffscreen(hostEl)) setActive2(false);
        });
      } else {
        clearTimer2();
        timer2 = setTimeout(() => {
          setActive2(false);
          timer2 = null;
        }, unloadAfterMs);
      }
      firstCallback = false;
    });
    observer2.observe(hostEl);
    return () => {
      observer2.disconnect();
      clearTimer2();
      clearRaf();
    };
  }, [hostEl, unloadAfterMs]);
  return [setHostEl, active2];
}
