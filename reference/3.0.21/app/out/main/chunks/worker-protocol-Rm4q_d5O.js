import path__default from "node:path";
const LEGACY_INSTALL_WORKER_PROTOCOL_VERSION = 1;
const LEGACY_INSTALL_WORKER_MAX_REQUEST_BYTES = 16 * 1024;
const LEGACY_INSTALL_WORKER_MAX_RESPONSE_BYTES = 4 * 1024;
const LEGACY_INSTALL_WORKER_MAX_COUNT = 1e4;
const MAX_PATH_CHARACTERS = 4096;
const RELEASE_REGIONS = ["domestic", "overseas"];
const RELEASE_CHANNELS = [
  "dev",
  "test",
  "staging",
  "prod"
];
const RISK_SIGNALS = [
  "config_data_in_install_root",
  "nested_user_data",
  "unclassified_entries"
];
const DETECTION_FAILURE_CODES = [
  "registry_query_failed",
  "incomplete_registry_entry",
  "ambiguous_registry_entries",
  "missing_install_location",
  "invalid_install_location",
  "missing_display_version",
  "display_name_mismatch",
  "invalid_uninstall_command",
  "install_overlap",
  "stale_install_root",
  "missing_uninstaller",
  "missing_main_executable",
  "root_probe_failed",
  "root_list_failed"
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasExactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => actualKeys.includes(key));
}
function byteLength(raw) {
  return Buffer.isBuffer(raw) ? raw.byteLength : Buffer.byteLength(raw, "utf8");
}
function parseJson(raw) {
  return JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw);
}
function isWindowsAbsolutePath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_PATH_CHARACTERS && !value.includes("\0") && path__default.win32.isAbsolute(value);
}
function decodeLegacyInstallWorkerRequest(raw) {
  if (byteLength(raw) > LEGACY_INSTALL_WORKER_MAX_REQUEST_BYTES) {
    return { ok: false, code: "request_too_large" };
  }
  let parsed;
  try {
    parsed = parseJson(raw);
  } catch {
    return { ok: false, code: "invalid_request" };
  }
  if (!isRecord(parsed)) return { ok: false, code: "invalid_request" };
  if (parsed.protocolVersion !== LEGACY_INSTALL_WORKER_PROTOCOL_VERSION) {
    return { ok: false, code: "unsupported_protocol" };
  }
  if (!hasExactKeys(parsed, [
    "protocolVersion",
    "region",
    "channel",
    "currentInstallDir",
    "configuredDataDirectory",
    "homeDir"
  ]) || !RELEASE_REGIONS.includes(parsed.region) || !RELEASE_CHANNELS.includes(parsed.channel) || !isWindowsAbsolutePath(parsed.currentInstallDir) || !isWindowsAbsolutePath(parsed.homeDir) || !(parsed.configuredDataDirectory === null || isWindowsAbsolutePath(parsed.configuredDataDirectory))) {
    return { ok: false, code: "invalid_request" };
  }
  return { ok: true, value: parsed };
}
function clampCount(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.trunc(value), LEGACY_INSTALL_WORKER_MAX_COUNT);
}
function emptyCounts() {
  return {
    appCount: 0,
    dataCount: 0,
    unclassifiedCount: 0,
    totalCount: 0,
    clamped: false
  };
}
function emptyRiskProfile() {
  return { assessment: "not_applicable", signals: [] };
}
function unknownVolumeRelation() {
  return {
    installToCurrent: "unknown",
    installToHome: "unknown",
    configuredDataToInstall: "unknown"
  };
}
function createLegacyInstallWorkerFailureResponse(code, registryScope = code === "ambiguous_registry_entries" ? "multiple" : "unknown") {
  return {
    protocolVersion: LEGACY_INSTALL_WORKER_PROTOCOL_VERSION,
    outcome: "failed",
    code,
    registryScope,
    riskProfile: emptyRiskProfile(),
    counts: emptyCounts(),
    volumeRelation: unknownVolumeRelation()
  };
}
function windowsVolume(windowsPath) {
  const root = path__default.win32.parse(windowsPath).root;
  if (!root) return null;
  return root.replace(/[\\/]+$/, "").toUpperCase();
}
function compareVolumes(leftPath, rightPath) {
  const left = windowsVolume(leftPath);
  const right = windowsVolume(rightPath);
  if (!left || !right) return "unknown";
  return left === right ? "same_volume" : "different_volume";
}
function summarizeCounts(analysis) {
  const rawAppEntries = analysis.appEntries.length;
  const rawDataEntries = analysis.dataEntries.length;
  const rawUnclassifiedEntries = analysis.unclassifiedEntries.length;
  const rawTotal = rawAppEntries + rawDataEntries + rawUnclassifiedEntries;
  return {
    appCount: clampCount(rawAppEntries),
    dataCount: clampCount(rawDataEntries),
    unclassifiedCount: clampCount(rawUnclassifiedEntries),
    totalCount: clampCount(rawTotal),
    clamped: rawAppEntries > LEGACY_INSTALL_WORKER_MAX_COUNT || rawDataEntries > LEGACY_INSTALL_WORKER_MAX_COUNT || rawUnclassifiedEntries > LEGACY_INSTALL_WORKER_MAX_COUNT || rawTotal > LEGACY_INSTALL_WORKER_MAX_COUNT
  };
}
function mapLegacyInstallDetectionToWorkerResponse(detection, request) {
  if (detection.state === "absent") {
    return {
      protocolVersion: LEGACY_INSTALL_WORKER_PROTOCOL_VERSION,
      outcome: "absent",
      code: "registry_absent",
      registryScope: "none",
      riskProfile: emptyRiskProfile(),
      counts: emptyCounts(),
      volumeRelation: unknownVolumeRelation()
    };
  }
  if (detection.state === "failed") {
    return createLegacyInstallWorkerFailureResponse(detection.code);
  }
  return {
    protocolVersion: LEGACY_INSTALL_WORKER_PROTOCOL_VERSION,
    outcome: "found",
    code: "legacy_install_found",
    registryScope: detection.candidate.installMode,
    riskProfile: {
      assessment: detection.riskProfile.assessment,
      signals: [...detection.riskProfile.signals]
    },
    counts: summarizeCounts(detection.analysis),
    volumeRelation: {
      installToCurrent: compareVolumes(detection.installRoot, request.currentInstallDir),
      installToHome: compareVolumes(detection.installRoot, request.homeDir),
      configuredDataToInstall: request.configuredDataDirectory === null ? "not_configured" : compareVolumes(request.configuredDataDirectory, detection.installRoot)
    }
  };
}
function isBoundedCount(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= LEGACY_INSTALL_WORKER_MAX_COUNT;
}
function isOneOf(value, allowed) {
  return typeof value === "string" && allowed.includes(value);
}
function isValidRiskProfile(value) {
  if (!isRecord(value) || !hasExactKeys(value, ["assessment", "signals"]) || !isOneOf(value.assessment, ["not_applicable", "provisional_low_risk", "review_required"]) || !Array.isArray(value.signals) || value.signals.length > RISK_SIGNALS.length || !value.signals.every((signal) => isOneOf(signal, RISK_SIGNALS)) || new Set(value.signals).size !== value.signals.length) {
    return false;
  }
  if (value.assessment === "review_required") return value.signals.length > 0;
  return value.signals.length === 0;
}
function isValidCounts(value) {
  return isRecord(value) && hasExactKeys(value, ["appCount", "dataCount", "unclassifiedCount", "totalCount", "clamped"]) && isBoundedCount(value.appCount) && isBoundedCount(value.dataCount) && isBoundedCount(value.unclassifiedCount) && isBoundedCount(value.totalCount) && typeof value.clamped === "boolean";
}
function isValidVolumeRelation(value) {
  const allowed = [
    "same_volume",
    "different_volume",
    "not_configured",
    "unknown"
  ];
  return isRecord(value) && hasExactKeys(value, ["installToCurrent", "installToHome", "configuredDataToInstall"]) && isOneOf(value.installToCurrent, allowed) && isOneOf(value.installToHome, allowed) && isOneOf(value.configuredDataToInstall, allowed);
}
function hasValidOutcomeCodePair(value) {
  if (value.outcome === "absent") {
    return value.code === "registry_absent" && value.registryScope === "none";
  }
  if (value.outcome === "found") {
    return value.code === "legacy_install_found" && (value.registryScope === "currentUser" || value.registryScope === "allUsers");
  }
  if (value.outcome !== "failed") return false;
  return isOneOf(value.code, [
    ...DETECTION_FAILURE_CODES,
    "invalid_request",
    "request_too_large",
    "unsupported_protocol",
    "worker_runtime_failed"
  ]) && isOneOf(value.registryScope, ["unknown", "multiple"]) && value.code === "ambiguous_registry_entries" === (value.registryScope === "multiple");
}
function isValidLegacyInstallWorkerResponse(value) {
  if (!isRecord(value) || !hasExactKeys(value, [
    "protocolVersion",
    "outcome",
    "code",
    "registryScope",
    "riskProfile",
    "counts",
    "volumeRelation"
  ]) || value.protocolVersion !== LEGACY_INSTALL_WORKER_PROTOCOL_VERSION || !hasValidOutcomeCodePair(value) || !isValidRiskProfile(value.riskProfile) || !isValidCounts(value.counts) || !isValidVolumeRelation(value.volumeRelation)) {
    return false;
  }
  if (value.outcome !== "found") {
    return value.riskProfile.assessment === "not_applicable" && value.counts.appCount === 0 && value.counts.dataCount === 0 && value.counts.unclassifiedCount === 0 && value.counts.totalCount === 0 && value.counts.clamped === false && value.volumeRelation.installToCurrent === "unknown" && value.volumeRelation.installToHome === "unknown" && value.volumeRelation.configuredDataToInstall === "unknown";
  }
  return value.riskProfile.assessment !== "not_applicable";
}
function decodeLegacyInstallWorkerResponse(raw) {
  if (byteLength(raw) > LEGACY_INSTALL_WORKER_MAX_RESPONSE_BYTES) {
    return { ok: false, code: "response_too_large" };
  }
  let parsed;
  try {
    parsed = parseJson(raw);
  } catch {
    return { ok: false, code: "invalid_response" };
  }
  if (isRecord(parsed) && parsed.protocolVersion !== LEGACY_INSTALL_WORKER_PROTOCOL_VERSION) {
    return { ok: false, code: "unsupported_protocol" };
  }
  return isValidLegacyInstallWorkerResponse(parsed) ? { ok: true, value: parsed } : { ok: false, code: "invalid_response" };
}
function encodeLegacyInstallWorkerResponse(response) {
  if (!isValidLegacyInstallWorkerResponse(response)) {
    throw new Error("invalid legacy install worker response");
  }
  const encoded = JSON.stringify(response);
  if (Buffer.byteLength(encoded, "utf8") > LEGACY_INSTALL_WORKER_MAX_RESPONSE_BYTES) {
    throw new Error("legacy install worker response exceeds size limit");
  }
  return encoded;
}
export {
  LEGACY_INSTALL_WORKER_MAX_REQUEST_BYTES as L,
  decodeLegacyInstallWorkerResponse as a,
  LEGACY_INSTALL_WORKER_MAX_RESPONSE_BYTES as b,
  createLegacyInstallWorkerFailureResponse as c,
  decodeLegacyInstallWorkerRequest as d,
  encodeLegacyInstallWorkerResponse as e,
  LEGACY_INSTALL_WORKER_PROTOCOL_VERSION as f,
  mapLegacyInstallDetectionToWorkerResponse as m
};
