// media-reveal-video.js
//
// 4.0.3 与 MediaReveal 配套的视频显隐逻辑（参照 index-B3Ss5vz1.js 第 363553~363636 行）。
// 与图片那套的区别：视频不能靠 <img onLoad> 判断"有画面了"，
// 要用 requestVideoFrameCallback / loadeddata，并给一个最长等待兜底。
// 转换只做了：jsx 运行时映射、cn$5 -> cn、去 __name、加 export，逻辑未改。

import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import { readCssMs } from "./media-reveal-generation.js";

/** 等不到 loadeddata 时的兜底延时（参照常量，值照搬）。 */
const LOADEDDATA_FALLBACK_MS = 120;
/** 最长等待：元数据到了但一直没画面时的上限（参照值 1500ms）。 */
const VIDEO_REVEAL_MAX_WAIT_MS = 1500;

export function useVideoFirstFrame(videoRef, sourceKey) {
  const [readyKey, setReadyKey] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceKey) return;
    let disposed = false;
    let frameHandle;
    const timers = [];
    const markReady = () => {
      if (!disposed) setReadyKey(sourceKey);
    };
    const onFrame = () => {
      if (disposed) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) markReady();
      else frameHandle = video.requestVideoFrameCallback?.(onFrame);
    };
    if (typeof video.requestVideoFrameCallback === "function") {
      frameHandle = video.requestVideoFrameCallback(onFrame);
    }
    const onLoadedData = () => {
      timers.push(window.setTimeout(markReady, LOADEDDATA_FALLBACK_MS));
    };
    const onLoadedMetadata = () => {
      timers.push(window.setTimeout(markReady, VIDEO_REVEAL_MAX_WAIT_MS));
    };
    if (video.controls) timers.push(window.setTimeout(markReady, VIDEO_REVEAL_MAX_WAIT_MS));
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("playing", markReady);
    video.addEventListener("error", markReady);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onLoadedData();
    else if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onLoadedMetadata();
    return () => {
      disposed = true;
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("playing", markReady);
      video.removeEventListener("error", markReady);
      for (const timer2 of timers) window.clearTimeout(timer2);
      if (frameHandle !== void 0) video.cancelVideoFrameCallback?.(frameHandle);
    };
  }, [videoRef, sourceKey]);
  return Boolean(sourceKey) && readyKey === sourceKey;
}
const SETTLE_FALLBACK_MS = 240;
const SETTLE_BUFFER_MS = 50;
export function VideoReveal({ ready: ready2, posterSrc, className, children: children2 }) {
  const hostRef = reactExports.useRef(null);
  const [posterFailed, setPosterFailed] = reactExports.useState();
  const [settled, setSettled] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!ready2) {
      setSettled(false);
      return;
    }
    const host = hostRef.current;
    const ms = host ? readCssMs(host, "--media-reveal-video-fade", SETTLE_FALLBACK_MS) : SETTLE_FALLBACK_MS;
    const timer2 = window.setTimeout(() => setSettled(true), ms + SETTLE_BUFFER_MS);
    return () => window.clearTimeout(timer2);
  }, [ready2]);
  const showPoster = Boolean(posterSrc) && posterFailed !== posterSrc;
  return /* @__PURE__ */ __jsx(
    "span",
    {
      ref: hostRef,
      className: cn("media-reveal-video-frame", className),
      "data-ready": ready2 || void 0,
      children: [
        !settled && (showPoster ? /* @__PURE__ */ __jsx(
          "img",
          {
            "aria-hidden": "true",
            alt: "",
            src: posterSrc,
            draggable: false,
            className: "media-reveal-video-poster",
            onError: () => setPosterFailed(posterSrc)
          }
        ) : /* @__PURE__ */ __jsx("span", { "aria-hidden": "true", className: "media-reveal-placeholder" })),
        children2
      ]
    }
  );
}
