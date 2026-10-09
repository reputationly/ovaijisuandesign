// deferred-thumbnail-image-generation.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const THUMBNAIL_LOAD_TIMEOUT_MS = 3e4;

const INTERACTIVE_BURST_LIMIT = 3;

function createEmptyQueues() {
  return {
    interactive: [],
    normal: [],
    prefetch: [],
  };
}

class ThumbnailLoadScheduler {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("maxConcurrency must be a positive integer");
    }
  }
  activeCount = 0;
  interactiveBurstCount = 0;
  queues = createEmptyQueues();
  schedule(start2, priority = "normal") {
    const task = {
      start: start2,
      priority,
      state: "queued",
    };
    this.queues[priority].push(task);
    this.dispatch();
    return () => this.cancel(task);
  }
  cancel(task) {
    if (task.state === "done") return;
    if (task.state === "active") {
      task.release?.();
      return;
    }
    const queue = this.queues[task.priority];
    const index2 = queue.indexOf(task);
    if (index2 >= 0) queue.splice(index2, 1);
    task.state = "done";
  }
  dispatch() {
    while (this.activeCount < this.maxConcurrency) {
      const task = this.takeNextTask();
      if (!task) return;
      if (task.state !== "queued") continue;
      task.state = "active";
      this.activeCount += 1;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        task.state = "done";
        task.release = void 0;
        this.activeCount -= 1;
        this.dispatch();
      };
      task.release = release;
      try {
        task.start(release);
      } catch (error) {
        release();
        throw error;
      }
    }
  }
  /**
   * Interactive work jumps queued prefetch work, but a bounded burst makes
   * progress for normal work even while interactive requests keep arriving.
   * Prefetch remains best-effort and only runs while foreground queues are
   * empty.
   */
  takeNextTask() {
    const interactiveQueue = this.queues.interactive;
    const normalQueue = this.queues.normal;
    if (
      interactiveQueue.length > 0 &&
      (this.interactiveBurstCount < INTERACTIVE_BURST_LIMIT ||
        normalQueue.length === 0)
    ) {
      this.interactiveBurstCount = Math.min(
        this.interactiveBurstCount + 1,
        INTERACTIVE_BURST_LIMIT,
      );
      return interactiveQueue.shift();
    }
    if (normalQueue.length > 0) {
      this.interactiveBurstCount = 0;
      return normalQueue.shift();
    }
    this.interactiveBurstCount = 0;
    return this.queues.prefetch.shift();
  }
}

const thumbnailLoadScheduler = new ThumbnailLoadScheduler(4);

const STABLE_INTERSECTION_DELAY_MS = 150;

const THUMBNAIL_ROOT_MARGIN = "200px 0px";

function DeferredThumbnailImageGeneration({
  src,
  alt,
  onLoad,
  onFailure,
  priority = "normal",
  maxRetries = 0,
  retryDelayMs = 2e3,
  ...props
}) {
  const imageRef = reactExports.useRef(null);
  const releaseRef = reactExports.useRef(null);
  const timeoutRef = reactExports.useRef(null);
  const retryTimerRef = reactExports.useRef(null);
  const onFailureRef = reactExports.useRef(onFailure);
  onFailureRef.current = onFailure;
  const [activeSrc, setActiveSrc] = reactExports.useState();
  const [loaded, setLoaded] = reactExports.useState(false);
  const [retryCount, setRetryCount] = reactExports.useState(0);
  const failOrRetry = reactExports.useCallback(() => {
    imageRef.current?.removeAttribute("src");
    setActiveSrc(void 0);
    if (retryCount < maxRetries) {
      if (retryTimerRef.current !== null)
        window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setRetryCount((count2) => count2 + 1);
      }, retryDelayMs);
      return;
    }
    onFailureRef.current?.();
  }, [maxRetries, retryCount, retryDelayMs]);
  const releaseSlot = reactExports.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);
  reactExports.useEffect(() => {
    if (!src) return;
    let observer2 = null;
    let visibilityTimer = null;
    let cancelScheduled = null;
    let loadStarted = false;
    const clearPending = () => {
      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
        visibilityTimer = null;
      }
      if (!loadStarted) {
        cancelScheduled?.();
        cancelScheduled = null;
      }
    };
    const scheduleLoad = () => {
      if (loadStarted || cancelScheduled) return;
      cancelScheduled = thumbnailLoadScheduler.schedule((release) => {
        loadStarted = true;
        releaseRef.current = release;
        setActiveSrc(src);
        timeoutRef.current = window.setTimeout(() => {
          releaseSlot();
          failOrRetry();
        }, THUMBNAIL_LOAD_TIMEOUT_MS);
        observer2?.disconnect();
      }, priority);
    };
    const element2 = imageRef.current;
    if (element2 && typeof IntersectionObserver !== "undefined") {
      observer2 = new IntersectionObserver(
        (entries2) => {
          const isIntersecting = entries2.some((entry) => entry.isIntersecting);
          if (!isIntersecting) {
            clearPending();
            return;
          }
          if (visibilityTimer !== null || loadStarted || cancelScheduled)
            return;
          visibilityTimer = window.setTimeout(() => {
            visibilityTimer = null;
            scheduleLoad();
          }, STABLE_INTERSECTION_DELAY_MS);
        },
        {
          rootMargin: THUMBNAIL_ROOT_MARGIN,
        },
      );
      observer2.observe(element2);
    } else {
      scheduleLoad();
    }
    return () => {
      observer2?.disconnect();
      clearPending();
      cancelScheduled?.();
      releaseSlot();
    };
  }, [failOrRetry, priority, releaseSlot, src]);
  reactExports.useEffect(
    () => () => {
      if (retryTimerRef.current !== null)
        window.clearTimeout(retryTimerRef.current);
    },
    [],
  );
  const handleLoad = reactExports.useCallback(
    (event) => {
      setLoaded(true);
      releaseSlot();
      onLoad?.(event);
    },
    [onLoad, releaseSlot],
  );
  const handleError = reactExports.useCallback(() => {
    releaseSlot();
    failOrRetry();
  }, [failOrRetry, releaseSlot]);
  return (
    <img
      {...props}
      ref={imageRef}
      src={activeSrc}
      alt={alt}
      style={{
        ...props.style,
        opacity: loaded ? props.style?.opacity : 0,
      }}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}

export function DeferredThumbnailImage(props) {
  return (
    <DeferredThumbnailImageGeneration key={props.src ?? "empty"} {...props} />
  );
}
