// reconcile-first-last-frame-default-paths.js
import { SEEDANCE_REFERENCE_AUDIO_MAX_SEC } from "../text-editor/build-asr-gateway-request.js";

export function extensionOf(path) {
  const fileName = path.split("/").pop() ?? path;
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

export function normalizeAttachmentSelection(input) {
  return typeof input === "string"
    ? {
        path: input,
      }
    : input;
}

export const AUDIO_TOTAL_MAX_SEC = SEEDANCE_REFERENCE_AUDIO_MAX_SEC;

export const VIDEO_TOTAL_MAX_SEC = 15.2;

export function reconcileDefaultPaths(prev, defaults, removed) {
  if (defaults.length === 0) return prev;
  const seen = new Set(prev);
  let next = null;
  for (const defaultPath of defaults) {
    if (!defaultPath || seen.has(defaultPath) || removed.has(defaultPath)) continue;
    seen.add(defaultPath);
    if (next === null) next = [...prev];
    next.push(defaultPath);
  }
  return next ?? prev;
}

export const FIRST_LAST_FRAME_SLOT_COUNT = 2;

export function normalizeFirstLastFramePaths(paths) {
  const next = Array.from(
    {
      length: FIRST_LAST_FRAME_SLOT_COUNT,
    },
    (_unusedValue, index) => paths[index] ?? "",
  );
  while (next.length > 0 && !next[next.length - 1]) next.pop();
  return next;
}

export function reconcileFirstLastFrameDefaultPaths(prev, defaults, removed) {
  const normalizedPrev = normalizeFirstLastFramePaths(prev);
  const normalizedDefaults = normalizeFirstLastFramePaths(defaults);
  const hasPositionalGap = normalizedDefaults.some(
    (path, index) =>
      !path && normalizedDefaults.slice(index + 1).some(Boolean),
  );
  const filledPrev = normalizedPrev.filter(Boolean);
  const filledDefaults = normalizedDefaults.filter(Boolean);
  const sameFilledPaths =
    filledPrev.length === filledDefaults.length &&
    filledPrev.every((path) => filledDefaults.includes(path));
  if (
    hasPositionalGap &&
    sameFilledPaths &&
    !filledDefaults.some((path) => removed.has(path))
  ) {
    const alreadyPositioned = normalizedPrev.every(
      (path, index) => path === normalizedDefaults[index],
    );
    if (!alreadyPositioned) return normalizedDefaults;
  }
  const next = [...normalizedPrev];
  const seen = new Set(next.filter(Boolean));
  let changed =
    normalizedPrev.length !== prev.length ||
    normalizedPrev.some((path, index) => path !== prev[index]);
  for (
    let defaultIndex = 0;
    defaultIndex < FIRST_LAST_FRAME_SLOT_COUNT;
    defaultIndex++
  ) {
    const path = normalizedDefaults[defaultIndex];
    if (!path || seen.has(path) || removed.has(path)) continue;
    const preferredSlotVacant = !next[defaultIndex];
    const vacantSlot = preferredSlotVacant
      ? defaultIndex
      : Array.from({
          length: FIRST_LAST_FRAME_SLOT_COUNT,
        }).findIndex((_unusedValue, index) => !next[index]);
    if (vacantSlot < 0) break;
    while (next.length <= vacantSlot) next.push("");
    next[vacantSlot] = path;
    seen.add(path);
    changed = true;
  }
  return changed ? normalizeFirstLastFramePaths(next) : prev;
}

export function haveSameNonEmptyPathCounts(left, right) {
  const leftPaths = left.filter(Boolean);
  const rightPaths = right.filter(Boolean);
  if (leftPaths.length !== rightPaths.length) return false;
  const counts = new Map();
  for (const path of leftPaths)
    counts.set(path, (counts.get(path) ?? 0) + 1);
  for (const path of rightPaths) {
    const remaining = counts.get(path) ?? 0;
    if (remaining <= 1) counts.delete(path);
    else counts.set(path, remaining - 1);
  }
  return counts.size === 0;
}

export function selectNewAttachments(
  currentPaths,
  incoming,
  max,
  count = () => 1,
) {
  const seen = new Set(currentPaths.filter(Boolean));
  let remaining = Math.max(
    0,
    max - [...seen].reduce((total, path) => total + count(path), 0),
  );
  if (remaining === 0) return [];
  const selected = [];
  for (const input of incoming) {
    const item = normalizeAttachmentSelection(input);
    if (!item.path || seen.has(item.path)) continue;
    const slots = count(item.path);
    if (slots <= 0 || slots > remaining) continue;
    seen.add(item.path);
    selected.push(item);
    remaining -= slots;
    if (remaining === 0) break;
  }
  return selected;
}

export const DEFAULT_TEXT_REFERENCE_MAX = 5;

export function findMetaByPath(path, assets, kind) {
  for (const meta of assets.values()) {
    if (meta.path === path && (!kind || meta.type === kind)) return meta;
  }
  return void 0;
}
