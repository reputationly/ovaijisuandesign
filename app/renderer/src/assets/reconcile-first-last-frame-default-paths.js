// reconcile-first-last-frame-default-paths.js
import { SEEDANCE_REFERENCE_AUDIO_MAX_SEC } from "../text-editor/build-asr-gateway-request.js";

export function extensionOf(path2) {
  const name2 = path2.split("/").pop() ?? path2;
  const dot2 = name2.lastIndexOf(".");
  return dot2 < 0 ? "" : name2.slice(dot2).toLowerCase();
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

export function reconcileDefaultPaths(prev, defaults2, removed) {
  if (defaults2.length === 0) return prev;
  const seen2 = new Set(prev);
  let next2 = null;
  for (const p3 of defaults2) {
    if (!p3 || seen2.has(p3) || removed.has(p3)) continue;
    seen2.add(p3);
    if (next2 === null) next2 = [...prev];
    next2.push(p3);
  }
  return next2 ?? prev;
}

export const FIRST_LAST_FRAME_SLOT_COUNT = 2;

export function normalizeFirstLastFramePaths(paths) {
  const next2 = Array.from(
    {
      length: FIRST_LAST_FRAME_SLOT_COUNT,
    },
    (_2, index2) => paths[index2] ?? "",
  );
  while (next2.length > 0 && !next2[next2.length - 1]) next2.pop();
  return next2;
}

export function reconcileFirstLastFrameDefaultPaths(prev, defaults2, removed) {
  const normalizedPrev = normalizeFirstLastFramePaths(prev);
  const normalizedDefaults = normalizeFirstLastFramePaths(defaults2);
  const hasPositionalGap = normalizedDefaults.some(
    (path2, index2) =>
      !path2 && normalizedDefaults.slice(index2 + 1).some(Boolean),
  );
  const filledPrev = normalizedPrev.filter(Boolean);
  const filledDefaults = normalizedDefaults.filter(Boolean);
  const sameFilledPaths =
    filledPrev.length === filledDefaults.length &&
    filledPrev.every((path2) => filledDefaults.includes(path2));
  if (
    hasPositionalGap &&
    sameFilledPaths &&
    !filledDefaults.some((path2) => removed.has(path2))
  ) {
    const alreadyPositioned = normalizedPrev.every(
      (path2, index2) => path2 === normalizedDefaults[index2],
    );
    if (!alreadyPositioned) return normalizedDefaults;
  }
  const next2 = [...normalizedPrev];
  const seen2 = new Set(next2.filter(Boolean));
  let changed =
    normalizedPrev.length !== prev.length ||
    normalizedPrev.some((path2, index2) => path2 !== prev[index2]);
  for (
    let defaultIndex = 0;
    defaultIndex < FIRST_LAST_FRAME_SLOT_COUNT;
    defaultIndex++
  ) {
    const path2 = normalizedDefaults[defaultIndex];
    if (!path2 || seen2.has(path2) || removed.has(path2)) continue;
    const preferredSlotVacant = !next2[defaultIndex];
    const vacantSlot = preferredSlotVacant
      ? defaultIndex
      : Array.from({
          length: FIRST_LAST_FRAME_SLOT_COUNT,
        }).findIndex((_2, index2) => !next2[index2]);
    if (vacantSlot < 0) break;
    while (next2.length <= vacantSlot) next2.push("");
    next2[vacantSlot] = path2;
    seen2.add(path2);
    changed = true;
  }
  return changed ? normalizeFirstLastFramePaths(next2) : prev;
}

export function haveSameNonEmptyPathCounts(left, right) {
  const leftPaths = left.filter(Boolean);
  const rightPaths = right.filter(Boolean);
  if (leftPaths.length !== rightPaths.length) return false;
  const counts = new Map();
  for (const path2 of leftPaths)
    counts.set(path2, (counts.get(path2) ?? 0) + 1);
  for (const path2 of rightPaths) {
    const remaining = counts.get(path2) ?? 0;
    if (remaining <= 1) counts.delete(path2);
    else counts.set(path2, remaining - 1);
  }
  return counts.size === 0;
}

export function selectNewAttachments(
  currentPaths,
  incoming,
  max2,
  count2 = () => 1,
) {
  const seen2 = new Set(currentPaths.filter(Boolean));
  let remaining = Math.max(
    0,
    max2 - [...seen2].reduce((total, path2) => total + count2(path2), 0),
  );
  if (remaining === 0) return [];
  const selected2 = [];
  for (const input of incoming) {
    const item = normalizeAttachmentSelection(input);
    if (!item.path || seen2.has(item.path)) continue;
    const slots = count2(item.path);
    if (slots <= 0 || slots > remaining) continue;
    seen2.add(item.path);
    selected2.push(item);
    remaining -= slots;
    if (remaining === 0) break;
  }
  return selected2;
}

export const DEFAULT_TEXT_REFERENCE_MAX = 5;

export function findMetaByPath(path2, assets, kind) {
  for (const meta2 of assets.values()) {
    if (meta2.path === path2 && (!kind || meta2.type === kind)) return meta2;
  }
  return void 0;
}
