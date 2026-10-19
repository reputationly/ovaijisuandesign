export const HILO_APP_ID = "3001";

export const HILO_BIZ_ID = "0";

export const HILO_DEFAULT_VERSION_CODE = "0.1.0";

export const VERSION_CODE_SEMVER_CORE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:[-+].*)?$/;

export function normalizeVersionCodeForCloud(version2) {
  const trimmed = version2.trim();
  const match2 = VERSION_CODE_SEMVER_CORE_PATTERN.exec(trimmed);
  return match2?.[1] ?? trimmed;
}
