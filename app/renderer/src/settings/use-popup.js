// use-popup.js
import { PopupType } from "../generation/normalize-skill-detail-metadata.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { reactExports, useQuery, useTranslation } from "../vendor.js";
import {
  creditQueryKeys,
  useAuth,
  useCreditAccountState,
} from "../assets/credit-query-keys.jsx";
import { useOptionalUpdaterContext } from "./use-active-runtime.js";

const POPUP_PATH = "/api/v1/popup";

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
        inspiration_query_ids: readQueryIds(
          value.action_claimed.inspiration_query_ids,
        ),
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
      typeof value.priority === "number" && Number.isFinite(value.priority)
        ? value.priority
        : 0,
    popup_type: mapPopupType(value.popup_type),
    id: readString(value, "id"),
    title: readString(value, "title"),
    description: readString(value, "description"),
    action,
    action_claimed: actionClaimed,
    can_close: typeof value.can_close === "boolean" ? value.can_close : void 0,
    mute_range_time:
      typeof value.mute_range_time === "number"
        ? value.mute_range_time
        : void 0,
    cover_url: readString(value, "cover_url"),
    video_url: readString(value, "video_url"),
    banner_text: readString(value, "banner_text"),
    // H3 免费试用活动窗口（服务端按 hailuo03_video_trial_config 的
    // start_time_ms / end_time_ms 算）。缺失 = 老服务端 / 非 FEATURE，保持
    // undefined 让前端走“不限制”分支，不能强转成 false。
    trial_active:
      typeof value.trial_active === "boolean" ? value.trial_active : void 0,
  };
}

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
      raw2.announcements.every(
        (popup) => popup.popup_type === PopupType.POPUP_TYPE_FEATURE,
      ))
  );
}

export function usePopup() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const creditAccount = useCreditAccountState();
  const { i18n } = useTranslation();
  const updater = useOptionalUpdaterContext();
  const queryScope = creditAccount.queryScope;
  const userID = user?.userID;
  const enabled = false;
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
      (retainedFeature2.userID !== userID ||
        retainedFeature2.language !== language2)
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
  const canExposePersonalPopup =
    queryScope !== null && creditAccount.canReadPersonalCredit;
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
