// key-entries.js

const KEY_PREFIX = "assetCenter.errors.";
const ASSET_CENTER_ERROR_UNKNOWN_KEY = `${KEY_PREFIX}unknown`;
const KEY_ENTRIES = {
  // resource not found (404)
  entity_not_found: `${KEY_PREFIX}entityNotFound`,
  attachment_not_found: `${KEY_PREFIX}attachmentNotFound`,
  suggestion_not_found: `${KEY_PREFIX}suggestionNotFound`,
  // attachment / upload validation (400)
  attachment_format_unsupported: `${KEY_PREFIX}attachmentFormatUnsupported`,
  attachment_count_exceeded: `${KEY_PREFIX}attachmentCountExceeded`,
  attachment_kind_uninferred: `${KEY_PREFIX}attachmentKindUninferred`,
  attachment_file_missing: `${KEY_PREFIX}attachmentFileMissing`,
  attachment_filename_invalid: `${KEY_PREFIX}attachmentFilenameInvalid`,
  blob_path_invalid: `${KEY_PREFIX}blobPathInvalid`,
  file_too_large: `${KEY_PREFIX}fileTooLarge`,
  // import / export (400 / 409)
  import_invalid_zip: `${KEY_PREFIX}importInvalidZip`,
  import_manifest_invalid: `${KEY_PREFIX}importManifestInvalid`,
  import_version_unsupported: `${KEY_PREFIX}importVersionUnsupported`,
  import_entity_conflict: `${KEY_PREFIX}importEntityConflict`,
  export_no_attachments: `${KEY_PREFIX}exportNoAttachments`,
  // suggestions (400)
  suggestion_not_pending: `${KEY_PREFIX}suggestionNotPending`,
  // generic request validation (400)
  invalid_request: `${KEY_PREFIX}invalidRequest`,
  // infra (500 / 503)
  asset_center_unavailable: `${KEY_PREFIX}assetCenterUnavailable`,
  internal_error: `${KEY_PREFIX}internalError`,
};
const ASSET_CENTER_ERROR_KEYS = KEY_ENTRIES;
export function resolveAssetCenterErrorKey(code2) {
  if (!code2) return ASSET_CENTER_ERROR_UNKNOWN_KEY;
  return ASSET_CENTER_ERROR_KEYS[code2] ?? ASSET_CENTER_ERROR_UNKNOWN_KEY;
}
function translateAssetCenterError(code2, t2) {
  return t2(resolveAssetCenterErrorKey(code2));
}
function classifyInfraError(err) {
  if (err.name === "GatewayNotReadyError")
    return "assetCenter.errors.gatewayNotReady";
  if (err.name === "AbortError" || /timeout|aborted/i.test(err.message)) {
    return "assetCenter.errors.timeout";
  }
  if (
    err.name === "TypeError" &&
    /failed to fetch|network/i.test(err.message)
  ) {
    return "assetCenter.errors.network";
  }
  return void 0;
}
export function formatAssetCenterError(err, t2) {
  if (
    err instanceof Error &&
    err.name === "AssetCenterApiError" &&
    "code" in err
  ) {
    return translateAssetCenterError(err.code, t2);
  }
  if (err instanceof Error) {
    const infraKey = classifyInfraError(err);
    if (infraKey) return t2(infraKey);
  }
  return t2(ASSET_CENTER_ERROR_UNKNOWN_KEY);
}
