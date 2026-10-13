// use-viewer-active.js
import { getWorkspaceContentBudgetSnapshot } from "./aggregate-snapshots.js";
import { reactExports } from "../vendor.js";
import { useWorkspaceContentBudgetScope } from "./use-plugin-metadata-store.js";

const CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS = 5e3;

function resolveWorkspaceFileViewerUnloadMs(requestedMs, workspaceId) {
  if (!Number.isFinite(requestedMs) || requestedMs <= 0)
    return CONTENT_BUDGET_PRESSURE_FILE_VIEWER_UNLOAD_MS;
  const snapshot = getWorkspaceContentBudgetSnapshot(workspaceId);
  if (!snapshot.overBudget) return requestedMs;
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
  const workspaceId = useWorkspaceContentBudgetScope();
  const unloadAfterMs = resolveWorkspaceFileViewerUnloadMs(
    opts.unloadAfterMs ?? DEFAULT_UNLOAD_MS,
    workspaceId,
  );
  const [hostEl, setHostEl] = reactExports.useState(null);
  const [active, setActive] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!hostEl) return;
    if (typeof IntersectionObserver === "undefined") return;
    let timer = null;
    let rafId = null;
    let firstCallback = true;
    const clearTimer = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const clearRaf = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting ?? false;
      if (visible) {
        clearTimer();
        clearRaf();
        setActive(true);
      } else if (firstCallback) {
        clearTimer();
        clearRaf();
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (isHostOffscreen(hostEl)) setActive(false);
        });
      } else {
        clearTimer();
        timer = setTimeout(() => {
          setActive(false);
          timer = null;
        }, unloadAfterMs);
      }
      firstCallback = false;
    });
    observer.observe(hostEl);
    return () => {
      observer.disconnect();
      clearTimer();
      clearRaf();
    };
  }, [hostEl, unloadAfterMs]);
  return [setHostEl, active];
}
