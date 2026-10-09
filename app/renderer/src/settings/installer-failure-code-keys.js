// installer-failure-code-keys.js
import { UPDATE_CHECK_TIMED_OUT } from "./use-active-runtime.js";
import { parseSemver } from "../vendor.js";

const UPDATE_CHECK_ALREADY_IN_PROGRESS = "Update check already in progress";

const VELOPACK_PACKAGE_MUTATION_UNOWNED = "VELOPACK_PACKAGE_MUTATION_UNOWNED:";

const DRIVE_TYPE_PROBE_UNAVAILABLE =
  "Install root drive type probe is unavailable.";

export function isUpdateCheckAlreadyInProgress(message2) {
  return message2 === UPDATE_CHECK_ALREADY_IN_PROGRESS;
}

function isUpdateCheckTimedOut(message2) {
  return message2 === UPDATE_CHECK_TIMED_OUT;
}

export function formatUpdaterErrorMessage(message2, t2, fallback) {
  if (isUpdateCheckAlreadyInProgress(message2)) {
    return t2("update.checkInProgress");
  }
  if (isUpdateCheckTimedOut(message2)) {
    return t2("update.timeout");
  }
  if (message2 === "ERR_TIMED_OUT: Update preparation timed out") {
    return t2("update.preparationTimeout");
  }
  if (message2?.includes(VELOPACK_PACKAGE_MUTATION_UNOWNED)) {
    return message2.includes(DRIVE_TYPE_PROBE_UNAVAILABLE)
      ? t2("update.failureCode.UPDATE_RUNTIME_UNAVAILABLE")
      : t2("update.failureCode.INSTDIR_OWNERSHIP_UNVERIFIED");
  }
  return message2 ?? fallback;
}

const INSTALLER_FAILURE_CODE_KEYS = {
  CHILD_PID_QUERY_UNAVAILABLE: "update.failureCode.CHILD_PID_QUERY_UNAVAILABLE",
  CHILD_PID_SNAPSHOT_UNAVAILABLE:
    "update.failureCode.CHILD_PID_SNAPSHOT_UNAVAILABLE",
  CHILD_PROCESS_EXIT_GUARD_FAILED:
    "update.failureCode.CHILD_PROCESS_EXIT_GUARD_FAILED",
  HANDOFF_STATE_CORRUPTED: "update.failureCode.HANDOFF_STATE_CORRUPTED",
  INSTALL_CHECKSUM_MISMATCH: "update.failureCode.INSTALL_CHECKSUM_MISMATCH",
  INSTALL_CLEANUP_FAILED: "update.failureCode.INSTALL_CLEANUP_FAILED",
  INSTALL_MARKER_CORRUPT: "update.failureCode.INSTALL_MARKER_CORRUPT",
  INSTALL_MARKER_WRITE_FAILED: "update.failureCode.INSTALL_MARKER_WRITE_FAILED",
  TEMP_SPACE: "update.failureCode.TEMP_SPACE",
  TEMP_SPACE_UNKNOWN: "update.failureCode.TEMP_SPACE_UNKNOWN",
  INSTDIR_SPACE: "update.failureCode.INSTDIR_SPACE",
  INSTDIR_SPACE_UNKNOWN: "update.failureCode.INSTDIR_SPACE_UNKNOWN",
  INSTALL_DIR_SPACE_LOW: "update.failureCode.INSTDIR_SPACE",
  INSTDIR_NOT_WRITABLE: "update.failureCode.INSTDIR_NOT_WRITABLE",
  INSTALL_DIR_NOT_WRITABLE: "update.failureCode.INSTDIR_NOT_WRITABLE",
  INSTDIR_SYSTEM_DIR: "update.failureCode.INSTDIR_SYSTEM_DIR",
  INSTALL_DIR_SYSTEM_DIR: "update.failureCode.INSTDIR_SYSTEM_DIR",
  INSTDIR_JUNCTION_INVALID: "update.failureCode.INSTDIR_JUNCTION_INVALID",
  INSTDIR_DATA_OVERLAP: "update.failureCode.INSTDIR_DATA_OVERLAP",
  INSTDIR_OWNERSHIP_UNVERIFIED:
    "update.failureCode.INSTDIR_OWNERSHIP_UNVERIFIED",
  INSTDIR_MULTI_INSTALL: "update.failureCode.INSTDIR_MULTI_INSTALL",
  MARKER_STORE_UNAVAILABLE: "update.failureCode.MARKER_STORE_UNAVAILABLE",
  PACKAGE_INVALIDATED: "update.failureCode.PACKAGE_INVALIDATED",
  PACKAGE_SIZE_INVALID: "update.failureCode.PACKAGE_SIZE_INVALID",
  UPDATE_PROXY_PROTOCOL_UNSUPPORTED:
    "update.failureCode.UPDATE_PROXY_PROTOCOL_UNSUPPORTED",
  UPDATER_EXECUTABLE_MISSING: "update.failureCode.UPDATER_EXECUTABLE_MISSING",
  UPDATE_RUNTIME_UNAVAILABLE: "update.failureCode.UPDATE_RUNTIME_UNAVAILABLE",
  INSTALL_INCOMPLETE: "update.failureCode.INSTALL_INCOMPLETE",
  INSTALL_METADATA_INVALID: "update.failureCode.INSTALL_METADATA_INVALID",
  INSTALL_METADATA_MISSING: "update.failureCode.INSTALL_METADATA_MISSING",
  INSTALL_STAGING_FAILED: "update.failureCode.INSTALL_STAGING_FAILED",
  INSTALLER_LAUNCH_FAILED: "update.failureCode.INSTALLER_LAUNCH_FAILED",
  INSTALLER_TERMINATION_FAILED:
    "update.failureCode.INSTALLER_TERMINATION_FAILED",
  USER_DATA_LOCKED: "update.failureCode.USER_DATA_LOCKED",
  USER_CANCELLED: "update.failureCode.USER_CANCELLED",
  INSTALL_FAILED: "update.failureCode.INSTALL_FAILED",
};

const NON_RETRYABLE_MANUAL_RECOVERY_CODES = new Set([
  "CHILD_PID_QUERY_UNAVAILABLE",
  "CHILD_PID_SNAPSHOT_UNAVAILABLE",
  "CHILD_PROCESS_EXIT_GUARD_FAILED",
  "INSTALL_INCOMPLETE",
  "INSTALL_MARKER_CORRUPT",
  "INSTALL_MARKER_WRITE_FAILED",
  "INSTALLER_TERMINATION_FAILED",
  "INSTDIR_JUNCTION_INVALID",
  "INSTDIR_OWNERSHIP_UNVERIFIED",
  "INSTDIR_MULTI_INSTALL",
  "UPDATE_PROXY_PROTOCOL_UNSUPPORTED",
  "UPDATER_EXECUTABLE_MISSING",
  "UPDATE_RUNTIME_UNAVAILABLE",
]);

export function isManualRecoveryRetryable(manualRecoveryCode) {
  return (
    !manualRecoveryCode ||
    !NON_RETRYABLE_MANUAL_RECOVERY_CODES.has(manualRecoveryCode)
  );
}

export function isManualRecoveryCheckRetryable(manualRecoveryCode) {
  return manualRecoveryCode === "UPDATE_PROXY_PROTOCOL_UNSUPPORTED";
}

export function formatManualRecoveryMessage(manualRecoveryCode, t2) {
  const key2 = manualRecoveryCode
    ? INSTALLER_FAILURE_CODE_KEYS[manualRecoveryCode]
    : void 0;
  if (key2) return t2(key2);
  return t2("update.manualRecovery.body");
}

function formatVersion(version2) {
  const v2 = version2.replace(/^v/, "");
  return `v${v2}`;
}

export function computeVersionDelta(currentVersion, targetVersion) {
  const current2 = parseSemver(currentVersion);
  const target = parseSemver(targetVersion);
  const currentFormatted = formatVersion(currentVersion);
  const targetFormatted = formatVersion(targetVersion);
  const isMinorBump = !!(current2 && target && current2.minor !== target.minor);
  const versionsBehind = (() => {
    if (!current2 || !target) return null;
    if (current2.major !== target.major || current2.minor !== target.minor)
      return null;
    const delta = target.patch - current2.patch;
    return delta > 0 ? delta : null;
  })();
  return {
    display: `${currentFormatted} → ${targetFormatted}`,
    isMinorBump,
    currentFormatted,
    targetFormatted,
    versionsBehind,
  };
}
