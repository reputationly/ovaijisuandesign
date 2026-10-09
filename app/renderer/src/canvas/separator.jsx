// separator.jsx
import {
  CanvasNodeType,
  DialogRoot,
  reactExports,
  useRenderElement,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
export function useNativeViewOcclusion(active2 = true) {
  reactExports.useLayoutEffect(() => {
    if (!active2) return;
    const platform2 = window.__HILO_PLATFORM__;
    const bridge = platform2?.window;
    if (!bridge?.setNativeViewOcclusion) return;
    const token2 = crypto.randomUUID();
    const update2 = (occluded) => {
      void bridge.setNativeViewOcclusion?.(token2, occluded).catch((error) => {
        console.error(
          "[native-view-occlusion] Failed to update preview lease",
          error,
        );
      });
    };
    update2(true);
    return () => update2(false);
  }, [active2]);
}
export const Separator = reactExports.forwardRef(
  function SeparatorComponent(componentProps, forwardedRef) {
    const {
      className,
      render: render2,
      orientation = "horizontal",
      ...elementProps
    } = componentProps;
    const state2 = {
      orientation,
    };
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: [
        {
          role: "separator",
          "aria-orientation": orientation,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
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
function getZoomTier(zoom2) {
  if (zoom2 >= 1.5) return 2;
  if (zoom2 <= 0.5) return 0.5;
  return 1;
}
export function Dialog({ ...props }) {
  return <DialogRoot data-slot="dialog" {...props} />;
}
function bucketZoomForBitmap(zoom2) {
  if (!Number.isFinite(zoom2) || zoom2 <= 0) return 1;
  const ceil = Math.ceil(Math.log2(zoom2));
  const bucket = 2 ** ceil;
  return Math.min(4, Math.max(1 / 8, bucket));
}
export const subscribers = new Set();
function notify() {
  for (const cb of subscribers) cb();
}
export let currentBucket = 1;
export function commitStableZoomBucket(zoom2) {
  const next2 = bucketZoomForBitmap(zoom2);
  if (next2 === currentBucket) return;
  currentBucket = next2;
  notify();
}
export function seedStableZoomBucket(zoom2) {
  currentBucket = bucketZoomForBitmap(zoom2);
}
const subscribers$1 = new Set();
function notify$2() {
  for (const cb of subscribers$1) cb();
}
let currentTier = 1;
export function commitStableZoomTier(zoom2) {
  const next2 = getZoomTier(zoom2);
  if (next2 === currentTier) return;
  currentTier = next2;
  notify$2();
}
export function seedStableZoomTier(zoom2) {
  currentTier = getZoomTier(zoom2);
}
function subscribe(cb) {
  subscribers$1.add(cb);
  return () => {
    subscribers$1.delete(cb);
  };
}
function getSnapshot() {
  return currentTier;
}
export function useStableZoomTier() {
  return reactExports.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function syncStableZoomSignals(zoom2) {
  commitStableZoomTier(zoom2);
  commitStableZoomBucket(zoom2);
}
export function isPluginNode(node2) {
  if (!node2 || node2.type !== CanvasNodeType.File) return false;
  return typeof node2.data?.pluginId === "string";
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
