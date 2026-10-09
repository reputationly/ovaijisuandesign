// normalize-hailuo03-video-trial-eligibility.js
import { API_PATHS, cdnPublicAsset, reactExports } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { buildShownKey } from "./use-auto-announcement.js";
import { useHubClientConfig } from "./parse-home-survey.js";
const CDN_UPDATE_POSTER = cdnPublicAsset({
  domestic: "home-widget/update/20260904/hilo-update-zh.jpg",
  overseas: "home-widget/update/20260904/hilo-update-en.jpg",
});
export const H3_LAUNCH_POPUP_ID = "h3_playground_launch_2026";
export const EMPTY_HAILUO03_VIDEO_TRIAL_STATUS = {
  claimed: false,
  claimable: false,
  freeCount: 0,
  remainingCount: 0,
  claimHint: "",
  activityActive: false,
};
export const HAILUO03_VIDEO_TRIAL_QUERY_KEY = ["hailuo03-video-trial"];
function numberField(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function stringField(value) {
  return typeof value === "string" ? value.trim() : "";
}
function stringListField(value, options) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!options.allowEmpty && normalized.length === 0) continue;
    if (!result.includes(normalized)) result.push(normalized);
  }
  return result;
}
function boolField(value) {
  return value === true;
}
function normalizeHailuo03VideoTrialEligibility(raw2) {
  if (!raw2 || typeof raw2 !== "object") return void 0;
  const obj = raw2;
  const models = stringListField(obj.models, {
    allowEmpty: false,
  });
  const resolutions = stringListField(obj.resolutions, {
    allowEmpty: false,
  });
  const subTypes = stringListField(obj.subTypes ?? obj.sub_types, {
    allowEmpty: true,
  });
  if (
    models.length === 0 ||
    resolutions.length === 0 ||
    subTypes.length === 0
  ) {
    return void 0;
  }
  return {
    models,
    resolutions,
    subTypes,
    allowReferenceImages: boolField(
      obj.allowReferenceImages ?? obj.allow_reference_images,
    ),
    allowReferenceAudios: boolField(
      obj.allowReferenceAudios ?? obj.allow_reference_audios,
    ),
    allowReferenceVideos: boolField(
      obj.allowReferenceVideos ?? obj.allow_reference_videos,
    ),
    allowOmniVideos: boolField(obj.allowOmniVideos ?? obj.allow_omni_videos),
  };
}
function normalizeHailuo03VideoTrialStatus(raw2) {
  if (!raw2 || typeof raw2 !== "object")
    return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
  const obj = raw2;
  return {
    claimed: obj.claimed === true,
    claimable: obj.claimable === true,
    freeCount: numberField(obj.freeCount ?? obj.free_count),
    remainingCount: numberField(obj.remainingCount ?? obj.remaining_count),
    claimHint: stringField(obj.claimHint ?? obj.claim_hint),
    activityActive: boolField(obj.activityActive ?? obj.activity_active),
    eligibility: normalizeHailuo03VideoTrialEligibility(obj.eligibility),
  };
}
export async function fetchHailuo03VideoTrialStatus() {
  const resp = await gatewayFetch(API_PATHS.hailuo03VideoTrialStatus);
  if (!resp.ok) {
    throw new Error(
      `fetchMiniMaxH3VideoTrialStatus failed: HTTP ${resp.status}`,
    );
  }
  return normalizeHailuo03VideoTrialStatus(await resp.json());
}
export async function claimHailuo03VideoTrial() {
  try {
    const resp = await gatewayFetch(API_PATHS.hailuo03VideoTrialClaim, {
      method: "POST",
    });
    if (!resp.ok) return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
    return normalizeHailuo03VideoTrialStatus(await resp.json());
  } catch {
    return EMPTY_HAILUO03_VIDEO_TRIAL_STATUS;
  }
}
export function hasShownTrialGranted(userID) {
  if (!userID) return false;
  try {
    return window.localStorage.getItem(buildShownKey(userID)) === "1";
  } catch {
    return false;
  }
}
export function useUpdatePoster() {
  const { updateWidget } = useHubClientConfig();
  const sourceUrl =
    (updateWidget.enabled === false ? null : updateWidget.imageUrl) ??
    CDN_UPDATE_POSTER;
  const [failure, setFailure] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setFailure((current2) =>
      current2?.sourceUrl === sourceUrl ? current2 : null,
    );
  }, [sourceUrl]);
  const imageUrl =
    failure?.sourceUrl === sourceUrl
      ? failure.defaultFailed
        ? null
        : CDN_UPDATE_POSTER
      : sourceUrl;
  const handleImageError = () => {
    setFailure({
      sourceUrl,
      defaultFailed: imageUrl === CDN_UPDATE_POSTER,
    });
  };
  return {
    imageUrl,
    handleImageError,
  };
}
