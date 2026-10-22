/**
 * RemoteVideoThumbnail（4.0.3 新增）：远程视频的封面占位。
 *
 * 移植自参照 index-B3Ss5vz1.js 的同名函数。逻辑照搬：
 *   · 先挂一个 <video preload="metadata">，等 loadeddata 就算成功、error 就报失败
 *   · **进入视口附近才真正开始加载**（IntersectionObserver + rootMargin 200px），
 *     离开且尚未开始时取消排队
 *   · 加载走 thumbnailLoadScheduler 的并发闸门（与图片缩略图共用一个队列）
 *   · 有超时兜底（THUMBNAIL_LOAD_TIMEOUT_MS）
 *   · 卸载时清定时器、取消排队、释放槽位、pause + 移除 src + load() 重置
 *
 * 为什么不直接用 <video src>：列表里几十个视频同时 preload metadata 会把网络和
 * 解码器占满，所以必须"近视口才加载 + 限并发 + 超时就当失败"。
 */

import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";
import {
  THUMBNAIL_LOAD_TIMEOUT_MS,
  thumbnailLoadScheduler,
} from "../workspace/deferred-thumbnail-image-generation.jsx";

export function RemoteVideoThumbnail({ src, name, onFailure }) {
  const containerRef = reactExports.useRef(null);
  const videoRef = reactExports.useRef(null);
  const onFailureRef = reactExports.useRef(onFailure);
  onFailureRef.current = onFailure;

  reactExports.useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    let disposed = false;
    let settled = false;
    let started = false;
    let cancel;
    let release;
    let timer;

    const finish = (failed) => {
      if (disposed || settled) return;
      settled = true;
      clearTimeout(timer);
      release?.();
      if (failed) onFailureRef.current();
    };
    const handleLoaded = () => finish(false);
    const handleError = () => finish(true);
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("error", handleError);

    const start = () => {
      if (started || cancel) return;
      cancel = thumbnailLoadScheduler.schedule((releaseSlot) => {
        started = true;
        release = releaseSlot;
        timer = setTimeout(handleError, THUMBNAIL_LOAD_TIMEOUT_MS);
        video.src = src;
        video.load();
      });
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                start();
              } else if (!started) {
                cancel?.();
                cancel = undefined;
              }
            },
            { rootMargin: "200px 0px" },
          );
    if (observer) observer.observe(container);
    else start();

    return () => {
      disposed = true;
      observer?.disconnect();
      clearTimeout(timer);
      cancel?.();
      release?.();
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("error", handleError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return __jsx(
    "div",
    {
      ref: containerRef,
      className: "absolute inset-0 text-muted-foreground",
      role: "img",
      "aria-label": name,
    },
    __jsx("video", {
      ref: videoRef,
      muted: true,
      playsInline: true,
      preload: "metadata",
      className: "size-full object-cover",
    }),
  );
}
