// use-auto-announcement.js
import { PopupType } from "../generation/normalize-skill-detail-metadata.js";
import { reactExports } from "../vendor.js";
const SHOWN_KEY_PREFIX = "hilo:popup:trial-granted-shown:";
export const PENDING_KEY = "hilo:popup:trial-granted-pending";
export const CHANGE_EVENT = "hilo:trial-granted-changed";
export function buildShownKey(userID) {
  return `${SHOWN_KEY_PREFIX}${userID}`;
}
export function clearPendingTrialGranted() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
export function normalizePopup(raw2) {
  if (!raw2) return null;
  const isKnownType =
    raw2.popup_type === PopupType.POPUP_TYPE_NONE ||
    raw2.popup_type === PopupType.POPUP_TYPE_GENERAL ||
    raw2.popup_type === PopupType.POPUP_TYPE_MIGRATION ||
    raw2.popup_type === PopupType.POPUP_TYPE_FEATURE;
  if (!isKnownType) return null;
  if (raw2.popup_type === PopupType.POPUP_TYPE_NONE) {
    return raw2;
  }
  const actionType = raw2.action?.type ?? "url";
  const validAction =
    actionType === "random_inspiration"
      ? raw2.popup_type === PopupType.POPUP_TYPE_FEATURE
      : actionType === "prefill_prompt"
        ? raw2.popup_type === PopupType.POPUP_TYPE_FEATURE &&
          !!raw2.action?.prompt?.trim() &&
          !!raw2.action?.model_id?.trim()
        : actionType === "url" && !!raw2.action?.url;
  if (!raw2.id || !raw2.description || !raw2.action?.label || !validAction) {
    return null;
  }
  return raw2;
}
export function normalizeAnnouncements(raw2) {
  const seen2 = new Set();
  return (raw2?.announcements?.length ? raw2.announcements : raw2 ? [raw2] : [])
    .map(normalizePopup)
    .filter((popup) => {
      if (
        !popup ||
        popup.popup_type !== PopupType.POPUP_TYPE_FEATURE ||
        seen2.has(popup.id)
      ) {
        return false;
      }
      seen2.add(popup.id);
      return true;
    })
    .sort((a2, b3) => (b3.priority ?? 0) - (a2.priority ?? 0));
}
function canAutoShowAnnouncement(popup) {
  return popup.auto_show !== false && popup.trial_active !== false;
}
const KEY_PREFIX = "hilo:popup:muted-until:";
export const MUTE_FOREVER = Number.MAX_SAFE_INTEGER;
const DEAD_ID_AFTER_MS = 90 * 24 * 60 * 60 * 1e3;
const PRUNE_INTERVAL_MS = 60 * 1e3;
function buildKey(userID, popupId) {
  return `${KEY_PREFIX}${userID}:${popupId}`;
}
function parseRecord(raw2) {
  try {
    const obj = JSON.parse(raw2);
    if (
      typeof obj.u === "number" &&
      Number.isFinite(obj.u) &&
      typeof obj.s === "number" &&
      Number.isFinite(obj.s)
    ) {
      return {
        u: obj.u,
        s: obj.s,
      };
    }
    return null;
  } catch {
    return null;
  }
}
function writeRecord(key2, record2) {
  try {
    window.localStorage.setItem(key2, JSON.stringify(record2));
  } catch {}
}
export function readMutedUntil(userID, popupId) {
  if (!userID || !popupId) return null;
  try {
    const key2 = buildKey(userID, popupId);
    const raw2 = window.localStorage.getItem(key2);
    if (!raw2) return null;
    const record2 = parseRecord(raw2);
    if (!record2) return null;
    if (record2.u <= Date.now()) return null;
    return record2.u;
  } catch {
    return null;
  }
}
export function touchSeen(userID, popupId) {
  if (!userID || !popupId) return;
  try {
    const key2 = buildKey(userID, popupId);
    const raw2 = window.localStorage.getItem(key2);
    if (!raw2) return;
    const record2 = parseRecord(raw2);
    if (!record2) return;
    const now2 = Date.now();
    if (record2.s === now2) return;
    writeRecord(key2, {
      u: record2.u,
      s: now2,
    });
  } catch {}
}
function pruneExpiredAndDead(userID, now2) {
  try {
    const userPrefix = `${KEY_PREFIX}${userID}:`;
    const deadBefore = now2 - DEAD_ID_AFTER_MS;
    const toRemove = [];
    for (let i2 = 0; i2 < window.localStorage.length; i2++) {
      const key2 = window.localStorage.key(i2);
      if (!key2?.startsWith(userPrefix)) continue;
      const raw2 = window.localStorage.getItem(key2);
      if (!raw2) continue;
      const record2 = parseRecord(raw2);
      if (!record2 || record2.u <= now2 || record2.s < deadBefore) {
        toRemove.push(key2);
      }
    }
    for (const key2 of toRemove) window.localStorage.removeItem(key2);
  } catch {}
}
let lastPrunedAt = 0;
function maybePrune(userID, now2) {
  if (now2 - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now2;
  pruneExpiredAndDead(userID, now2);
}
export function setMutedUntil(userID, popupId, mutedUntilMs) {
  if (!userID || !popupId) return;
  const now2 = Date.now();
  writeRecord(buildKey(userID, popupId), {
    u: mutedUntilMs,
    s: now2,
  });
  maybePrune(userID, now2);
}
export function clearMutesForUser(userID) {
  if (!userID) return;
  try {
    const userPrefix = `${KEY_PREFIX}${userID}:`;
    const toRemove = [];
    for (let i2 = 0; i2 < window.localStorage.length; i2++) {
      const key2 = window.localStorage.key(i2);
      if (key2?.startsWith(userPrefix)) toRemove.push(key2);
    }
    for (const key2 of toRemove) window.localStorage.removeItem(key2);
  } catch {}
}
export function useAutoAnnouncement(raw2, userID) {
  const [selection2, setSelection] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!userID || !raw2?.announcements?.length) return;
    for (const popup of normalizeAnnouncements(raw2))
      touchSeen(userID, popup.id);
  }, [raw2, userID]);
  reactExports.useEffect(() => {
    if (!userID) {
      setSelection(null);
      return;
    }
    if (selection2?.userID === userID) return;
    if (!raw2?.announcements?.length) return;
    const candidate = normalizeAnnouncements(raw2).find(
      (popup) =>
        canAutoShowAnnouncement(popup) &&
        readMutedUntil(userID, popup.id) === null,
    );
    setSelection({
      userID,
      popupId: candidate?.id ?? "",
    });
  }, [raw2, userID, selection2]);
  if (!raw2?.announcements?.length)
    return {
      popup: normalizePopup(raw2),
      ready: true,
    };
  if (!userID || selection2?.userID !== userID)
    return {
      popup: null,
      ready: false,
    };
  return {
    popup:
      normalizeAnnouncements(raw2).find(
        (popup) => popup.id === selection2.popupId,
      ) ?? null,
    ready: true,
  };
}
export function trackTypeOf(popupType) {
  switch (popupType) {
    case PopupType.POPUP_TYPE_GENERAL:
      return "general";
    case PopupType.POPUP_TYPE_MIGRATION:
      return "migration";
    case PopupType.POPUP_TYPE_FEATURE:
      return "feature";
    default:
      return null;
  }
}
