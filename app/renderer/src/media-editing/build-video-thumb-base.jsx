// build-video-thumb-base.jsx
import {
  HILO_WORKSPACE_GENERATION_QUERY,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  Maximize,
  PlaybackPauseIcon$1 as PlaybackPauseIcon,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  Volume2,
} from "../vendor.js";
import { appendWidth } from "./append-width.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { VolumeX } from "./package.jsx";
const VIDEO_AUX_ICON_SIZE = 20;
const VIDEO_AUX_ICON_STROKE_WIDTH = 1.25;
export function PlayIcon({ size: size2 = 14 }) {
  return <PlaybackPlayIcon size={size2} />;
}
export function PauseIcon({ size: size2 = 14 }) {
  return <PlaybackPauseIcon size={size2} />;
}
export function VolumeIcon() {
  return (
    <Volume2
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeMuteIcon() {
  return (
    <VolumeX
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeOnTablerIcon() {
  return (
    <Volume2
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeOffTablerIcon() {
  return (
    <VolumeX
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function FullscreenIcon() {
  return (
    <Maximize
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
const MAX_SERVER_WIDTH = 2048;
function physicalWidth(displayWidth) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.round(displayWidth * dpr);
}
export function buildThumbnailUrl(url2, displayWidth) {
  return appendWidth(url2, physicalWidth(displayWidth));
}
function buildSrcSet(baseUrl, displayWidth) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const candidates2 = [
    Math.max(
      Math.min(Math.round(displayWidth * dpr * 0.5), MAX_SERVER_WIDTH),
      16,
    ),
    Math.max(Math.min(Math.round(displayWidth * dpr), MAX_SERVER_WIDTH), 16),
    Math.max(
      Math.min(Math.round(displayWidth * dpr * 2), MAX_SERVER_WIDTH),
      16,
    ),
  ];
  const unique2 = [...new Set(candidates2)];
  return unique2
    .map((width) => `${appendWidth(baseUrl, width)} ${width}w`)
    .join(", ");
}
export function buildThumbnailSrcSet(url2, displayWidth) {
  return buildSrcSet(url2, displayWidth);
}
export function buildVideoThumbBase(baseUrl, filePath) {
  try {
    const sourceUrl = new URL(baseUrl);
    if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
      return void 0;
    }
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const thumbnailUrl = new URL(
      `/api/thumbnail/${encodedPath}`,
      sourceUrl.origin,
    );
    for (const identityParam of [
      HILO_WORKSPACE_IDENTITY_QUERY,
      HILO_WORKSPACE_INSTANCE_QUERY,
      HILO_WORKSPACE_GENERATION_QUERY,
    ]) {
      const value = sourceUrl.searchParams.get(identityParam);
      if (value) thumbnailUrl.searchParams.set(identityParam, value);
    }
    return thumbnailUrl.toString();
  } catch {
    return void 0;
  }
}
export function buildVideoThumbnailUrl(baseUrl, filePath, displayWidth) {
  const base2 = buildVideoThumbBase(baseUrl, filePath);
  return base2 ? appendWidth(base2, physicalWidth(displayWidth)) : void 0;
}
