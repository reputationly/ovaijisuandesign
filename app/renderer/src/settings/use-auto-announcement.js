// use-auto-announcement.js
import { PopupType } from "../generation/normalize-skill-detail-metadata.js";
import reactExports from "react";
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
export function normalizePopup(raw) {
  if (!raw) return null;
  const isKnownType =
    raw.popup_type === PopupType.POPUP_TYPE_NONE ||
    raw.popup_type === PopupType.POPUP_TYPE_GENERAL ||
    raw.popup_type === PopupType.POPUP_TYPE_MIGRATION ||
    raw.popup_type === PopupType.POPUP_TYPE_FEATURE;
  if (!isKnownType) return null;
  if (raw.popup_type === PopupType.POPUP_TYPE_NONE) {
    return raw;
  }
  const actionType = raw.action?.type ?? "url";
  const validAction =
    actionType === "random_inspiration"
      ? raw.popup_type === PopupType.POPUP_TYPE_FEATURE
      : actionType === "prefill_prompt"
        ? raw.popup_type === PopupType.POPUP_TYPE_FEATURE &&
          !!raw.action?.prompt?.trim() &&
          !!raw.action?.model_id?.trim()
        : actionType === "url" && !!raw.action?.url;
  if (!raw.id || !raw.description || !raw.action?.label || !validAction) {
    return null;
  }
  return raw;
}
export function normalizeAnnouncements(raw) {
  const seen = new Set();
  return (raw?.announcements?.length ? raw.announcements : raw ? [raw] : [])
    .map(normalizePopup)
    .filter((popup) => {
      if (
        !popup ||
        popup.popup_type !== PopupType.POPUP_TYPE_FEATURE ||
        seen.has(popup.id)
      ) {
        return false;
      }
      seen.add(popup.id);
      return true;
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
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
function parseRecord(raw) {
  try {
    const obj = JSON.parse(raw);
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
function writeRecord(key, record) {
  try {
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {}
}
export function readMutedUntil(userID, popupId) {
  if (!userID || !popupId) return null;
  try {
    const key = buildKey(userID, popupId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const record = parseRecord(raw);
    if (!record) return null;
    if (record.u <= Date.now()) return null;
    return record.u;
  } catch {
    return null;
  }
}
export function touchSeen(userID, popupId) {
  if (!userID || !popupId) return;
  try {
    const key = buildKey(userID, popupId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const record = parseRecord(raw);
    if (!record) return;
    const now = Date.now();
    if (record.s === now) return;
    writeRecord(key, {
      u: record.u,
      s: now,
    });
  } catch {}
}
function pruneExpiredAndDead(userID, now) {
  try {
    const userPrefix = `${KEY_PREFIX}${userID}:`;
    const deadBefore = now - DEAD_ID_AFTER_MS;
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(userPrefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const record = parseRecord(raw);
      if (!record || record.u <= now || record.s < deadBefore) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {}
}
let lastPrunedAt = 0;
function maybePrune(userID, now) {
  if (now - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now;
  pruneExpiredAndDead(userID, now);
}
export function setMutedUntil(userID, popupId, mutedUntilMs) {
  if (!userID || !popupId) return;
  const now = Date.now();
  writeRecord(buildKey(userID, popupId), {
    u: mutedUntilMs,
    s: now,
  });
  maybePrune(userID, now);
}
export function clearMutesForUser(userID) {
  if (!userID) return;
  try {
    const userPrefix = `${KEY_PREFIX}${userID}:`;
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(userPrefix)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {}
}
export function useAutoAnnouncement(raw, userID) {
  const [selection, setSelection] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!userID || !raw?.announcements?.length) return;
    for (const popup of normalizeAnnouncements(raw))
      touchSeen(userID, popup.id);
  }, [raw, userID]);
  reactExports.useEffect(() => {
    if (!userID) {
      setSelection(null);
      return;
    }
    if (selection?.userID === userID) return;
    if (!raw?.announcements?.length) return;
    const candidate = normalizeAnnouncements(raw).find(
      (popup) =>
        canAutoShowAnnouncement(popup) &&
        readMutedUntil(userID, popup.id) === null,
    );
    setSelection({
      userID,
      popupId: candidate?.id ?? "",
    });
  }, [raw, userID, selection]);
  if (!raw?.announcements?.length)
    return {
      popup: normalizePopup(raw),
      ready: true,
    };
  if (!userID || selection?.userID !== userID)
    return {
      popup: null,
      ready: false,
    };
  return {
    popup:
      normalizeAnnouncements(raw).find(
        (popup) => popup.id === selection.popupId,
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
