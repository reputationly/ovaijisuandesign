// infinite-scroll-container.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";
import { Spinner } from "./use-team-transactions-feed-query.jsx";

const INFINITE_SCROLL_PRELOAD_BATCHES = 3;

const LOAD_AHEAD_PX = 160;

export function InfiniteScrollContainer({
  children: children2,
  loadedBatchCount,
  hasMore,
  isLoadingMore,
  loadMoreError = false,
  onLoadMore,
  className,
  preloadBatchCount = INFINITE_SCROLL_PRELOAD_BATCHES,
  actionUiId,
}) {
  const viewportRef = reactExports.useRef(null);
  const sentinelRef = reactExports.useRef(null);
  const requestedAtBatchRef = reactExports.useRef(null);
  const hadLoadMoreErrorRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (requestedAtBatchRef.current !== loadedBatchCount) {
      requestedAtBatchRef.current = null;
    }
  }, [loadedBatchCount]);
  reactExports.useEffect(() => {
    if (loadMoreError) {
      hadLoadMoreErrorRef.current = true;
      return;
    }
    if (hadLoadMoreErrorRef.current) {
      hadLoadMoreErrorRef.current = false;
      requestedAtBatchRef.current = null;
    }
  }, [loadMoreError]);
  const requestLoadMore = reactExports.useCallback(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      loadMoreError ||
      requestedAtBatchRef.current === loadedBatchCount
    ) {
      return;
    }
    requestedAtBatchRef.current = loadedBatchCount;
    Promise.resolve(onLoadMore()).catch(() => {
      requestedAtBatchRef.current = null;
    });
  }, [hasMore, isLoadingMore, loadMoreError, loadedBatchCount, onLoadMore]);
  reactExports.useEffect(() => {
    if (loadedBatchCount > 0 && loadedBatchCount < preloadBatchCount) {
      requestLoadMore();
    }
  }, [loadedBatchCount, preloadBatchCount, requestLoadMore]);
  reactExports.useEffect(() => {
    const viewport = viewportRef.current;
    const sentinel = sentinelRef.current;
    if (!viewport || !sentinel || typeof IntersectionObserver === "undefined")
      return;
    const observer2 = new IntersectionObserver(
      (entries2) => {
        if (entries2.some((entry) => entry.isIntersecting)) requestLoadMore();
      },
      {
        root: viewport,
        rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px`,
      },
    );
    observer2.observe(sentinel);
    return () => observer2.disconnect();
  }, [requestLoadMore]);
  const handleScroll = (event) => {
    const viewport = event.currentTarget;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom <= LOAD_AHEAD_PX) requestLoadMore();
  };
  return (
    <div
      ref={viewportRef}
      className={cn$2("scrollbar-fade overflow-y-auto", className)}
      onScroll={handleScroll}
      aria-busy={isLoadingMore || void 0}
      data-action-ui-id={actionUiId}
    >
      {children2}
      <div
        ref={sentinelRef}
        className="flex min-h-1 items-center justify-center py-1"
      >
        {isLoadingMore ? <Spinner className="text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
