// check-cloud-asset-upload.js
import {
  cloudAssetExtension,
  EXTENSION_TO_CATEGORY,
} from "./wrap-as-asset-center-error.js";

const CLOUD_ASSET_MAX_FILE_BYTES = 300 * 1024 * 1024;

const CLOUD_ASSET_VIDEO_MAX_DURATION_SECONDS = 5 * 60;

const CLOUD_ASSET_AUDIO_MAX_DURATION_SECONDS = 20 * 60;

function classifyCloudAsset(fileName) {
  return EXTENSION_TO_CATEGORY.get(cloudAssetExtension(fileName)) ?? null;
}

function durationCapFor(category) {
  if (category === "video") return CLOUD_ASSET_VIDEO_MAX_DURATION_SECONDS;
  if (category === "audio") return CLOUD_ASSET_AUDIO_MAX_DURATION_SECONDS;
  return void 0;
}

export function checkCloudAssetUpload(candidate) {
  const category = classifyCloudAsset(candidate.fileName);
  if (!category)
    return {
      ok: false,
      rejection: "unsupported-type",
    };
  if (candidate.sizeBytes > CLOUD_ASSET_MAX_FILE_BYTES) {
    return {
      ok: false,
      rejection: "file-too-large",
      category,
    };
  }
  const maxDurationSeconds = durationCapFor(category);
  if (
    maxDurationSeconds !== void 0 &&
    candidate.durationSeconds !== void 0 &&
    candidate.durationSeconds > maxDurationSeconds
  ) {
    return {
      ok: false,
      rejection: "duration-exceeded",
      category,
    };
  }
  return maxDurationSeconds !== void 0
    ? {
        ok: true,
        category,
        maxDurationSeconds,
      }
    : {
        ok: true,
        category,
      };
}
