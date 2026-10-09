// use-popup.jsx
import { reactExports, useQuery, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayFetch } from "./agent-ws-client.jsx";
import { creditQueryKeys, useAuth, useCreditAccountState } from "./apply-asset-change.jsx";
import { PopupType } from "./push-inline.js";
import { useOptionalUpdaterContext } from "./run-manual-update-check.js";
const SHOWN_KEY_PREFIX = "hilo:popup:trial-granted-shown:";
export const PENDING_KEY = "hilo:popup:trial-granted-pending";
export const CHANGE_EVENT = "hilo:trial-granted-changed";
export function buildShownKey(userID) {
  return `${SHOWN_KEY_PREFIX}${userID}`;
}
export function clearTrialGrantedForUser(userID) {
  if (!userID) return;
  try {
    window.localStorage.removeItem(buildShownKey(userID));
  } catch {}
  clearPendingTrialGranted();
}
export function clearPendingTrialGranted() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
const MinimalForcedFallback = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--modal-mask-bg)",
    }}
    role="alertdialog"
    aria-modal="true"
  >
    <div
      style={{
        background: "var(--elevated-surface)",
        border: "var(--elevated-border-width) solid var(--elevated-border-color)",
        padding: 32,
        maxWidth: 400,
        textAlign: "center",
        color: "var(--foreground)",
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Update Required
      </p>
      <p
        style={{
          fontSize: 13,
          marginTop: 8,
          opacity: 0.7,
        }}
      >
        Please restart the application to continue.
      </p>
      <button
        type="button"
        style={{
          marginTop: 16,
          padding: "8px 24px",
          fontSize: 13,
          cursor: "pointer",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "inherit",
        }}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  </div>
);
export class UpdaterErrorBoundary extends reactExports.Component {
  state = {
    hasError: false,
  };
  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }
  componentDidCatch(error) {
    console.error("[UpdaterRoot] Render error, degrading gracefully:", error);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.forcedMode) {
        return <MinimalForcedFallback />;
      }
      return null;
    }
    return this.props.children;
  }
}
const POPUP_PATH = "/api/v1/popup";
async function fetchPopup(signal) {
  signal?.throwIfAborted();
  const resp = await gatewayFetch(POPUP_PATH, {
    signal,
  });
  signal?.throwIfAborted();
  if (!resp.ok) {
    throw new Error(`fetchPopup failed: HTTP ${resp.status}`);
  }
  return mapPopupResponse(await resp.json());
}
function isRecord$a(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record2, key2) {
  const value = record2[key2];
  return typeof value === "string" ? value : "";
}
function readQueryIds(value) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((id2) => typeof id2 === "string")
            .map((id2) => id2.trim())
            .filter(Boolean),
        ),
      ]
    : [];
}
function mapPopupType(value) {
  switch (value) {
    case PopupType.POPUP_TYPE_GENERAL:
    case PopupType.POPUP_TYPE_MIGRATION:
    case PopupType.POPUP_TYPE_FEATURE:
      return value;
    default:
      return PopupType.POPUP_TYPE_NONE;
  }
}
function mapPopupResponse(value, includeAnnouncements = true) {
  if (!isRecord$a(value)) {
    return {
      popup_type: PopupType.POPUP_TYPE_NONE,
      id: "",
      title: "",
      description: "",
      action: void 0,
      action_claimed: void 0,
      can_close: true,
      mute_range_time: 0,
      cover_url: "",
      video_url: "",
      banner_text: "",
      trial_active: void 0,
      announcements: [],
    };
  }
  const action = isRecord$a(value.action)
    ? {
        type: readString(value.action, "type") || void 0,
        label: readString(value.action, "label"),
        url: readString(value.action, "url"),
        hint: readString(value.action, "hint") || void 0,
        prompt: readString(value.action, "prompt") || void 0,
        model_id: readString(value.action, "model_id") || void 0,
        inspiration_query_ids: readQueryIds(value.action.inspiration_query_ids),
      }
    : void 0;
  const actionClaimed = isRecord$a(value.action_claimed)
    ? {
        type: readString(value.action_claimed, "type") || void 0,
        label: readString(value.action_claimed, "label"),
        url: readString(value.action_claimed, "url"),
        hint: readString(value.action_claimed, "hint") || void 0,
        prompt: readString(value.action_claimed, "prompt") || void 0,
        model_id: readString(value.action_claimed, "model_id") || void 0,
        inspiration_query_ids: readQueryIds(value.action_claimed.inspiration_query_ids),
      }
    : void 0;
  return {
    announcements:
      includeAnnouncements && Array.isArray(value.announcements)
        ? value.announcements.map((item) => mapPopupResponse(item, false))
        : [],
    subtitle: readString(value, "subtitle") || void 0,
    auto_show: typeof value.auto_show === "boolean" ? value.auto_show : void 0,
    priority:
      typeof value.priority === "number" && Number.isFinite(value.priority) ? value.priority : 0,
    popup_type: mapPopupType(value.popup_type),
    id: readString(value, "id"),
    title: readString(value, "title"),
    description: readString(value, "description"),
    action,
    action_claimed: actionClaimed,
    can_close: typeof value.can_close === "boolean" ? value.can_close : void 0,
    mute_range_time: typeof value.mute_range_time === "number" ? value.mute_range_time : void 0,
    cover_url: readString(value, "cover_url"),
    video_url: readString(value, "video_url"),
    banner_text: readString(value, "banner_text"),
    // H3 免费试用活动窗口（服务端按 hailuo03_video_trial_config 的
    // start_time_ms / end_time_ms 算）。缺失 = 老服务端 / 非 FEATURE，保持
    // undefined 让前端走“不限制”分支，不能强转成 false。
    trial_active: typeof value.trial_active === "boolean" ? value.trial_active : void 0,
  };
}
function hasSameQueryKey(actual, expected) {
  return (
    actual?.length === expected.length &&
    actual.every((part, index2) => Object.is(part, expected[index2]))
  );
}
function isGlobalFeatureResponse(raw2) {
  return (
    raw2?.popup_type === PopupType.POPUP_TYPE_FEATURE ||
    (raw2?.popup_type === PopupType.POPUP_TYPE_NONE &&
      Array.isArray(raw2.announcements) &&
      raw2.announcements.every((popup) => popup.popup_type === PopupType.POPUP_TYPE_FEATURE))
  );
}
export function usePopup() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const creditAccount = useCreditAccountState();
  const { i18n } = useTranslation();
  const updater = useOptionalUpdaterContext();
  const forcedUpdate = updater?.state.forced ?? false;
  const queryScope = creditAccount.queryScope;
  const userID = user?.userID;
  const enabled = !forcedUpdate && !isLoading && isLoggedIn && !!userID;
  const fallbackQueryKey = userID
    ? [...creditQueryKeys.popupByIdentity(userID), i18n.language]
    : null;
  const query = useQuery({
    queryKey:
      queryScope && userID
        ? [...creditQueryKeys.popupForViewer(queryScope, userID), i18n.language]
        : (fallbackQueryKey ?? creditQueryKeys.unavailable("popup")),
    queryFn: ({ signal }) => fetchPopup(signal),
    enabled,
    placeholderData: (previousData, previousQuery) => {
      if (
        !queryScope ||
        !fallbackQueryKey ||
        !isGlobalFeatureResponse(previousData) ||
        !hasSameQueryKey(previousQuery?.queryKey, fallbackQueryKey)
      ) {
        return void 0;
      }
      return previousData;
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1e3 * 2 ** attempt, 5e3),
    staleTime: 60 * 1e3,
    refetchInterval: 60 * 1e3,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const retainedFeatureRef = reactExports.useRef(null);
  const language2 = i18n.language;
  const hasSettledQueryResult = query.isSuccess && !query.isPlaceholderData;
  reactExports.useEffect(() => {
    if (!enabled || !userID) {
      retainedFeatureRef.current = null;
      return;
    }
    const retainedFeature2 = retainedFeatureRef.current;
    if (
      retainedFeature2 &&
      (retainedFeature2.userID !== userID || retainedFeature2.language !== language2)
    ) {
      retainedFeatureRef.current = null;
    }
    if (hasSettledQueryResult) {
      retainedFeatureRef.current =
        query.data && isGlobalFeatureResponse(query.data)
          ? {
              userID,
              language: language2,
              popup: query.data,
            }
          : null;
    }
  }, [enabled, hasSettledQueryResult, language2, query.data, userID]);
  const canExposePersonalPopup = queryScope !== null && creditAccount.canReadPersonalCredit;
  const queryData =
    enabled && (canExposePersonalPopup || isGlobalFeatureResponse(query.data))
      ? query.data
      : void 0;
  const retainedFeature = retainedFeatureRef.current;
  const retainedData =
    enabled &&
    !hasSettledQueryResult &&
    retainedFeature?.userID === userID &&
    retainedFeature.language === language2
      ? retainedFeature.popup
      : void 0;
  const visibleData = queryData ?? retainedData;
  return visibleData === query.data
    ? query
    : {
        ...query,
        data: visibleData,
      };
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
      if (!popup || popup.popup_type !== PopupType.POPUP_TYPE_FEATURE || seen2.has(popup.id)) {
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
const KEY_PREFIX$2 = "hilo:popup:muted-until:";
export const MUTE_FOREVER = Number.MAX_SAFE_INTEGER;
const DEAD_ID_AFTER_MS = 90 * 24 * 60 * 60 * 1e3;
const PRUNE_INTERVAL_MS = 60 * 1e3;
function buildKey(userID, popupId) {
  return `${KEY_PREFIX$2}${userID}:${popupId}`;
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
export function setMutedUntil(userID, popupId, mutedUntilMs) {
  if (!userID || !popupId) return;
  const now2 = Date.now();
  writeRecord(buildKey(userID, popupId), {
    u: mutedUntilMs,
    s: now2,
  });
  maybePrune(userID, now2);
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
let lastPrunedAt = 0;
function maybePrune(userID, now2) {
  if (now2 - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = now2;
  pruneExpiredAndDead(userID, now2);
}
function pruneExpiredAndDead(userID, now2) {
  try {
    const userPrefix = `${KEY_PREFIX$2}${userID}:`;
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
export function clearMutesForUser(userID) {
  if (!userID) return;
  try {
    const userPrefix = `${KEY_PREFIX$2}${userID}:`;
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
    for (const popup of normalizeAnnouncements(raw2)) touchSeen(userID, popup.id);
  }, [raw2, userID]);
  reactExports.useEffect(() => {
    if (!userID) {
      setSelection(null);
      return;
    }
    if (selection2?.userID === userID) return;
    if (!raw2?.announcements?.length) return;
    const candidate = normalizeAnnouncements(raw2).find(
      (popup) => canAutoShowAnnouncement(popup) && readMutedUntil(userID, popup.id) === null,
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
    popup: normalizeAnnouncements(raw2).find((popup) => popup.id === selection2.popupId) ?? null,
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
