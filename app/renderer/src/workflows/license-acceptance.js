// ComfyUI 许可证确认：收集需要确认的许可证并记录当前账号的接受状态。
import { reactExports, useStorage } from "../vendor.js";
import { comfyUiLicenseKey } from "./workflow-card-helpers.js";
const ANONYMOUS_ACCOUNT_KEY = "anonymous";
function uniqueRequiredLicenses(attributions) {
  const licenses = new Map();
  for (const attribution of attributions) {
    for (const license of attribution.licenses ?? []) {
      if (license.acceptanceRequired) licenses.set(comfyUiLicenseKey(license), license);
    }
  }
  return [...licenses.values()];
}
export function useComfyUiLicenseAcceptance(attributions) {
  const [config, , setConfigAsync, configHydrated] = useStorage("global.config");
  const [user, , , userHydrated] = useStorage("global.user");
  const isHydrated = configHydrated && userHydrated;
  const accountKey = user.userID?.trim() || ANONYMOUS_ACCOUNT_KEY;
  const requiredLicenses = reactExports.useMemo(
    () => uniqueRequiredLicenses(attributions),
    [attributions],
  );
  const acceptedLicenseKeys = reactExports.useMemo(() => {
    if (!isHydrated) return new Set();
    const accepted = config.comfyUiLicenseAcceptances?.[accountKey] ?? {};
    return new Set(
      requiredLicenses
        .filter((license) => accepted[comfyUiLicenseKey(license)] !== void 0)
        .map(comfyUiLicenseKey),
    );
  }, [accountKey, config.comfyUiLicenseAcceptances, isHydrated, requiredLicenses]);
  const pendingLicenses = reactExports.useMemo(
    () =>
      isHydrated
        ? requiredLicenses.filter((license) => !acceptedLicenseKeys.has(comfyUiLicenseKey(license)))
        : [],
    [acceptedLicenseKeys, isHydrated, requiredLicenses],
  );
  const acceptLicenses = reactExports.useCallback(
    async (licenses) => {
      if (!isHydrated) return false;
      if (licenses.length === 0) return true;
      const acceptedAt = Date.now();
      return setConfigAsync((current) => {
        const allAcceptances = current.comfyUiLicenseAcceptances ?? {};
        const accountAcceptances = {
          ...(allAcceptances[accountKey] ?? {}),
        };
        for (const license of licenses) {
          accountAcceptances[comfyUiLicenseKey(license)] = {
            acceptedAt,
          };
        }
        return {
          ...current,
          comfyUiLicenseAcceptances: {
            ...allAcceptances,
            [accountKey]: accountAcceptances,
          },
        };
      });
    },
    [accountKey, isHydrated, setConfigAsync],
  );
  return {
    acceptanceScope: isHydrated ? accountKey : null,
    isHydrated,
    requiredLicenses,
    acceptedLicenseKeys,
    pendingLicenses,
    acceptLicenses,
  };
}
