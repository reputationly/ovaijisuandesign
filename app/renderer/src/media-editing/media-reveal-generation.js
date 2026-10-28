// media-reveal-generation.js
//
// 4.0.3 新增的图片渐进显示（LQIP）子系统。
// **整段取自参照** index-B3Ss5vz1.js 第 363206~363551 行，只做了三处机械转换：
//   · jsxRuntimeExports.jsx/jsxs -> __jsx（本仓库的 jsx 目标）
//   · 去掉 __name(...) 调试名语句
//   · 顶层声明加 export
// 逻辑、常量、注释一律未改 —— 这套东西的时序（占位图先出、原图淡入、LRU 缓存、
// 并发上限、失败重试）改一点就会变行为。
import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
// 参照里类名合并工具被 rollup 改名成 cn，这里换回仓库里的 cn。
import { cn } from "../infra/dialog-content.jsx";
// 纯推导部分单独成模块（可单测），这里引用回来。
import {
  LQIP_MAX_BYTES,
  LQIP_MAX_CONCURRENCY,
  LQIP_PIXEL_WIDTH,
  LOOPBACK_HOSTS,
  MEDIA_REVEAL_CACHE_LIMIT,
  NON_IMAGE_MEDIA_EXTENSION,
  deriveLqipUrl,
  safeDecode,
} from "./lqip-url.js";
export { deriveLqipUrl };

export class BoundedLru {
  constructor(limit, onEvict) {
    this.limit = limit;
    this.onEvict = onEvict;
  }
  limit;
  onEvict;
  map = /* @__PURE__ */ new Map();
  get(key2) {
    const value = this.map.get(key2);
    if (value === void 0) return void 0;
    this.map.delete(key2);
    this.map.set(key2, value);
    return value;
  }
  has(key2) {
    return this.map.has(key2);
  }
  set(key2, value) {
    if (this.map.has(key2)) this.map.delete(key2);
    this.map.set(key2, value);
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      const evicted = this.map.get(oldest);
      this.map.delete(oldest);
      if (evicted !== void 0) this.onEvict?.(evicted);
    }
  }
  get size() {
    return this.map.size;
  }
  clear() {
    for (const value of this.map.values()) this.onEvict?.(value);
    this.map.clear();
  }
}
const revealedSources = new BoundedLru(MEDIA_REVEAL_CACHE_LIMIT);
const lqipObjectUrls = new BoundedLru(
  MEDIA_REVEAL_CACHE_LIMIT,
  (objectUrl) => URL.revokeObjectURL(objectUrl)
);
const inflight = /* @__PURE__ */ new Map();
export function getCachedLqip(lqipUrl) {
  return lqipUrl ? lqipObjectUrls.get(lqipUrl) : void 0;
}
let active = 0;
const queue = [];
function pump() {
  while (active < LQIP_MAX_CONCURRENCY && queue.length > 0) {
    const task2 = queue.shift();
    if (!task2 || task2.cancelled) continue;
    active += 1;
    task2.run();
  }
}
export function loadLqip(lqipUrl) {
  const cached = lqipObjectUrls.get(lqipUrl);
  if (cached) return { promise: Promise.resolve(cached), cancel: () => {
  } };
  let entry = inflight.get(lqipUrl);
  if (!entry) {
    let resolve;
    const promise = new Promise((r2) => {
      resolve = r2;
    });
    const task2 = {
      cancelled: false,
      run: () => {
        fetchCapped(lqipUrl).then((blob) => {
          if (!blob) return void 0;
          const objectUrl = URL.createObjectURL(blob);
          lqipObjectUrls.set(lqipUrl, objectUrl);
          return objectUrl;
        }).catch(() => void 0).then((result) => {
          active -= 1;
          inflight.delete(lqipUrl);
          resolve(result);
          pump();
        });
      }
    };
    entry = { promise, task: task2, resolve, waiters: 0 };
    inflight.set(lqipUrl, entry);
    queue.push(task2);
    pump();
  }
  const current2 = entry;
  current2.waiters += 1;
  let released = false;
  return {
    promise: current2.promise,
    cancel: () => {
      if (released) return;
      released = true;
      current2.waiters -= 1;
      if (current2.waiters === 0 && !current2.task.cancelled && queue.includes(current2.task)) {
        current2.task.cancelled = true;
        inflight.delete(lqipUrl);
        current2.resolve(void 0);
      }
    }
  };
}
async function fetchCapped(url2) {
  const controller = new AbortController();
  const response = await fetch(url2, { signal: controller.signal });
  const contentType = response.headers.get("content-type") ?? "";
  const declared = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (!response.ok || !contentType.startsWith("image/") || Number.isFinite(declared) && declared > LQIP_MAX_BYTES) {
    controller.abort();
    return void 0;
  }
  if (!response.body) {
    const blob = await response.blob();
    return blob.size > LQIP_MAX_BYTES ? void 0 : blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > LQIP_MAX_BYTES) {
      controller.abort();
      return void 0;
    }
    chunks.push(value);
  }
  return new Blob(chunks, { type: contentType });
}
const SETTLE_FALLBACK_MS$1 = 320;
const SETTLE_BUFFER_MS$1 = 50;
const LQIP_ROOT_MARGIN = "200px 0px";
const INTRINSIC_PLACEHOLDER_RATIO = 4 / 3;
export function MediaReveal(props) {
  // **第三个参数是 key，不是 children。** 参照的原码是 React 自动运行时
  // （`jsx(type, props, key)`），那里的 `props.src` 只用来「换图时强制重挂载」。
  // 我们的 `__jsx` 是 classic 运行时（多余的位参数当 children），照抄就把图片 URL
  // 当文本渲染到了缩略图后面 —— 侧栏项目行里会多出一长串 `http://127.0.0.1:…`，
  // 把标题挤到换行、溢出。这里改成显式 `key`。
  return /* @__PURE__ */ __jsx(MediaRevealGeneration, { ...props, key: props.src ?? "empty" });
}
export function readCssMs(element2, name2, fallback) {
  const raw2 = window.getComputedStyle(element2).getPropertyValue(name2).trim();
  const value = Number.parseFloat(raw2);
  if (!raw2 || Number.isNaN(value)) return fallback;
  return raw2.endsWith("ms") ? value : raw2.endsWith("s") ? value * 1e3 : value;
}
export function intrinsicBoxStyle(size2, ratio) {
  if (!size2) return void 0;
  const width = size2.maxHeight ? Math.min(size2.width, size2.maxHeight * ratio) : size2.width;
  return { width, maxWidth: "100%", aspectRatio: String(ratio), height: "auto" };
}
export function MediaRevealGeneration({
  src,
  alt,
  layout: layout2 = "fill",
  intrinsicSize,
  fit = "cover",
  lqip = "auto",
  placeholder,
  loading = "deferred",
  priority,
  maxRetries,
  retryDelayMs,
  className,
  mediaClassName,
  mediaProps,
  draggable = false,
  onLoad,
  onFailure,
  children: children2
}) {
  const hostRef = reactExports.useRef(null);
  const intrinsic = layout2 === "intrinsic";
  const [cached] = reactExports.useState(() => src ? revealedSources.has(src) : false);
  const ambient = !intrinsic && fit === "contain";
  const [lqipUrl] = reactExports.useState(
    () => lqip === "auto" && (ambient || !cached) ? deriveLqipUrl(src) : void 0
  );
  const [lqipObjectUrl, setLqipObjectUrl] = reactExports.useState(
    () => getCachedLqip(lqip === "auto" ? deriveLqipUrl(src) : void 0)
  );
  const [lqipRatio, setLqipRatio] = reactExports.useState();
  const [loaded, setLoaded] = reactExports.useState(cached);
  const [settled, setSettled] = reactExports.useState(cached);
  reactExports.useEffect(() => {
    if (!lqipUrl || lqipObjectUrl || loaded && !ambient) return;
    const host = hostRef.current;
    let cancel;
    let disposed = false;
    const start2 = () => {
      const request = loadLqip(lqipUrl);
      cancel = request.cancel;
      request.promise.then((objectUrl) => {
        if (!disposed && objectUrl) setLqipObjectUrl(objectUrl);
      });
    };
    if (!host || typeof IntersectionObserver === "undefined") {
      start2();
    } else {
      const observer2 = new IntersectionObserver(
        (entries2) => {
          if (!entries2.some((entry) => entry.isIntersecting)) return;
          observer2.disconnect();
          start2();
        },
        { rootMargin: LQIP_ROOT_MARGIN }
      );
      observer2.observe(host);
      return () => {
        disposed = true;
        observer2.disconnect();
        cancel?.();
      };
    }
    return () => {
      disposed = true;
      cancel?.();
    };
  }, [lqipUrl, lqipObjectUrl, loaded, ambient]);
  reactExports.useEffect(() => {
    if (!loaded || settled) return;
    const host = hostRef.current;
    const ms = host ? readCssMs(host, "--media-reveal-duration", SETTLE_FALLBACK_MS$1) : SETTLE_FALLBACK_MS$1;
    const timer2 = window.setTimeout(() => setSettled(true), ms + SETTLE_BUFFER_MS$1);
    return () => window.clearTimeout(timer2);
  }, [loaded, settled]);
  const handleLoad = reactExports.useCallback(
    (event) => {
      if (src) revealedSources.set(src, true);
      setLoaded(true);
      onLoad?.(event);
    },
    [onLoad, src]
  );
  const handleLqipLoad = reactExports.useCallback((event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setLqipRatio(naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1);
  }, []);
  const lqipReady = Boolean(lqipObjectUrl) && lqipRatio !== void 0;
  const phase2 = loaded ? "loaded" : lqipReady ? "lqip" : "placeholder";
  const keepAmbient = ambient && Boolean(lqipObjectUrl);
  const reservesBox = !intrinsic || placeholder !== void 0 || Boolean(lqipUrl || lqipObjectUrl);
  const showPlaceholder = !settled && reservesBox && !(intrinsic && lqipReady);
  const mediaClass = cn(
    "media-reveal-media",
    !intrinsic && (fit === "contain" ? "object-contain" : "object-cover"),
    mediaClassName
  );
  const sizeBeforeLoad = intrinsic && !loaded;
  const lqipStyle = sizeBeforeLoad && lqipRatio !== void 0 ? intrinsicBoxStyle(intrinsicSize, lqipRatio) : void 0;
  return /* @__PURE__ */ __jsx(
    "span",
    {
      ref: hostRef,
      className: cn("media-reveal", className),
      "data-phase": phase2,
      "data-layout": layout2,
      "data-fit": intrinsic ? void 0 : fit,
      "data-lqip-ready": lqipReady || void 0,
      "data-cached": cached || void 0,
      children: [
        showPlaceholder && (placeholder !== void 0 ? /* @__PURE__ */ __jsx("span", { "aria-hidden": "true", className: "media-reveal-placeholder-slot", children: placeholder }) : /* @__PURE__ */ __jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "media-reveal-placeholder",
            style: sizeBeforeLoad ? intrinsicBoxStyle(intrinsicSize, INTRINSIC_PLACEHOLDER_RATIO) : void 0
          }
        )),
        lqipObjectUrl && (!settled || keepAmbient) && /* @__PURE__ */ __jsx(
          "img",
          {
            "aria-hidden": "true",
            alt: "",
            src: lqipObjectUrl,
            draggable: false,
            className: "media-reveal-lqip",
            style: lqipStyle,
            onLoad: handleLqipLoad
          }
        ),
        src && (loading === "deferred" ? /* @__PURE__ */ __jsx(
          DeferredThumbnailImage,
          {
            ...mediaProps,
            src,
            alt,
            draggable,
            eager: cached,
            priority,
            maxRetries,
            retryDelayMs,
            className: mediaClass,
            onLoad: handleLoad,
            onFailure
          }
        ) : /* @__PURE__ */ __jsx(
          "img",
          {
            ...mediaProps,
            src,
            alt,
            loading,
            decoding: "async",
            draggable,
            className: mediaClass,
            onLoad: handleLoad,
            onError: onFailure
          }
        )),
        loaded && children2
      ]
    }
  );
}
const LOADEDDATA_FALLBACK_MS = 120;
