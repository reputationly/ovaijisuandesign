// separator.jsx
import {
  CanvasNodeType,
  DialogRoot,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
export { Separator } from "@base-ui/react/separator";
export function useNativeViewOcclusion(active = true) {
  reactExports.useLayoutEffect(() => {
    if (!active) return;
    const platform = window.__HILO_PLATFORM__;
    const bridge = platform?.window;
    if (!bridge?.setNativeViewOcclusion) return;
    const token = crypto.randomUUID();
    const update = (occluded) => {
      void bridge.setNativeViewOcclusion?.(token, occluded).catch((error) => {
        console.error(
          "[native-view-occlusion] Failed to update preview lease",
          error,
        );
      });
    };
    update(true);
    return () => update(false);
  }, [active]);
}
export const CanvasReleaseRegionContext =
  reactExports.createContext("overseas");
export function getExtFromMime(mime, fallback = "mp4") {
  if (mime.startsWith("image/")) {
    const sub = mime.slice("image/".length);
    if (sub === "jpeg") return "jpg";
    return sub.split("+")[0] || fallback;
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("mkv") || mime.includes("matroska")) return "mkv";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mp3") || mime.includes("audio/mpeg")) return "mp3";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav") || mime.includes("wave")) return "wav";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("m4a")) return "m4a";
  return fallback;
}
export const DEFAULT_SOURCE_CACHE_GROUP = 1;
export const ENCRYPTION_KEY_CACHE_GROUP = 2;
function getZoomTier(zoom) {
  if (zoom >= 1.5) return 2;
  if (zoom <= 0.5) return 0.5;
  return 1;
}
export function Dialog({ ...props }) {
  return <DialogRoot data-slot="dialog" {...props} />;
}
function bucketZoomForBitmap(zoom) {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  const ceil = Math.ceil(Math.log2(zoom));
  const bucket = 2 ** ceil;
  return Math.min(4, Math.max(1 / 8, bucket));
}
export const subscribers = new Set();
function notify() {
  for (const cb of subscribers) cb();
}
export let currentBucket = 1;
export function commitStableZoomBucket(zoom) {
  const next = bucketZoomForBitmap(zoom);
  if (next === currentBucket) return;
  currentBucket = next;
  notify();
}
export function seedStableZoomBucket(zoom) {
  currentBucket = bucketZoomForBitmap(zoom);
}
const zoomTierSubscribers = new Set();
function notifyZoomTierSubscribers() {
  for (const cb of zoomTierSubscribers) cb();
}
let currentTier = 1;
export function commitStableZoomTier(zoom) {
  const next = getZoomTier(zoom);
  if (next === currentTier) return;
  currentTier = next;
  notifyZoomTierSubscribers();
}
export function seedStableZoomTier(zoom) {
  currentTier = getZoomTier(zoom);
}
function subscribe(cb) {
  zoomTierSubscribers.add(cb);
  return () => {
    zoomTierSubscribers.delete(cb);
  };
}
function getSnapshot() {
  return currentTier;
}
export function useStableZoomTier() {
  return reactExports.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function syncStableZoomSignals(zoom) {
  commitStableZoomTier(zoom);
  commitStableZoomBucket(zoom);
}
export function isPluginNode(node) {
  if (!node || node.type !== CanvasNodeType.File) return false;
  return typeof node.data?.pluginId === "string";
}
export function orientUserEdge(source, target, lookup) {
  const sourceIsPlugin = isPluginNode(lookup(source));
  const targetIsPlugin = isPluginNode(lookup(target));
  if (sourceIsPlugin && !targetIsPlugin)
    return {
      source: target,
      target: source,
    };
  return {
    source,
    target,
  };
}
export const DEFAULT_MAX_RECOVERIES_PER_FRAME = 8;
export const DEFAULT_RECOVERY_FRAME_BUDGET_MS = 6;
