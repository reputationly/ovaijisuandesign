/**
 * 三个小预览组件（4.0.3 新增）：PinImagePreview / PreviewVideo / PinVideoPreview。
 *
 * 逐字移植自参照 index-B3Ss5vz1.js 的同名函数。它们本身没有逻辑，
 * 只是把既有的 MediaReveal / VideoReveal / useVideoFirstFrame 组合起来：
 *   PinImagePreview  图片钉选预览（加载失败就整个不渲染）
 *   PreviewVideo     按容器自适应的视频预览
 *   PinVideoPreview  正方形（h-16 w-16）的视频钉选预览
 *
 * 为什么值得单独成模块：这三处在 4.0.3 之前是各写各的 <img>/<video>，
 * 现在统一走 LQIP / 首帧揭示那套，行为才一致。
 */

import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";
import { MediaReveal } from "./media-reveal-generation.js";
import { VideoReveal, useVideoFirstFrame } from "./media-reveal-video.js";

export function PinImagePreview({ src, alt }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (failed) return null;
  return __jsx(MediaReveal, {
    src,
    alt,
    loading: "eager",
    className: "h-16 w-16 bg-muted",
    onFailure: () => setFailed(true),
  });
}

export function PreviewVideo({ url, onError }) {
  const videoRef = reactExports.useRef(null);
  const ready = useVideoFirstFrame(videoRef, url);
  return __jsx(VideoReveal, {
    ready,
    className: "flex size-full items-center justify-center",
    children: __jsx("video", {
      ref: videoRef,
      src: url,
      onError,
      muted: true,
      playsInline: true,
      preload: "metadata",
      className: "max-h-full max-w-full object-contain",
    }),
  });
}

export function PinVideoPreview({ src }) {
  const videoRef = reactExports.useRef(null);
  const ready = useVideoFirstFrame(videoRef, src);
  return __jsx(VideoReveal, {
    ready,
    className: "h-16 w-16 bg-muted",
    children: __jsx(
      "video",
      {
        ref: videoRef,
        src,
        className: "h-16 w-16 bg-muted object-cover",
        muted: true,
        playsInline: true,
        preload: "metadata",
      },
      __jsx("track", { kind: "captions" }),
    ),
  });
}
