// use-settings.js
import {
  dedupedToast,
  reactExports,
  storageKeys,
  useQueryClient,
  useStorage,
  useTranslation,
} from "../vendor.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { ACTIVE_CUSTOM_MODEL_QUERY_KEY } from "../generation/use-model-catalog-scope-key.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { getDesktopSettingsMainService } from "../team/copy-icon-button.jsx";

const sideEffectErrorKeys = {
  menuBarVisible: "settings.errors.trayFailed",
  runOnStartup: "settings.errors.startupFailed",
  language: "settings.errors.languageFailed",
  preventSleep: "settings.errors.preventSleepFailed",
  autoFeedbackEnabled: "settings.errors.autoFeedbackFailed",
  autoInstallOnQuit: "settings.errors.autoInstallFailed",
  watermarkEnabled: "settings.errors.watermarkFailed",
  compactionEnabled: "settings.errors.compactionFailed",
  lane: "settings.errors.laneFailed",
};

const sideEffects = {
  menuBarVisible: async (service2, value) => {
    const result = await service2.setTrayVisible(value);
    return result.success;
  },
  runOnStartup: async (service2, value) => {
    const result = await service2.setRunOnStartup(value);
    return result.success;
  },
  language: async (service2, value) => {
    const result = await service2.setLanguage(value);
    return result.success;
  },
  theme: async (service2, value) => {
    const result = await service2.setTheme(value);
    return result.success;
  },
  preventSleep: async (service2, value) => {
    const result = await service2.setPreventSleep(value);
    return result.success;
  },
  autoFeedbackEnabled: async (service2, value) => {
    const result = await service2.setAutoFeedbackEnabled(value);
    return result.success;
  },
  watermarkEnabled: async (service2, value) => {
    const result = await service2.setWatermarkEnabled(value);
    return result.success;
  },
  compactionEnabled: async (service2, value) => {
    const result = await service2.setCompactionEnabled(value);
    return result.success;
  },
  lane: async (service2, value) => {
    const result = await service2.setLane(value ?? "");
    return result.success;
  },
};

export function useSettings() {
  const queryClient2 = useQueryClient();
  const [config2, , setConfigAsync] = useStorage("global.config");
  const { t: t2 } = useTranslation();
  const configRef = reactExports.useRef(config2);
  const requestSeqRef = reactExports.useRef({});
  const desktopSettingsServiceRef = reactExports.useRef(null);
  const getDesktopSettingsService = reactExports.useCallback(() => {
    if (!desktopSettingsServiceRef.current) {
      desktopSettingsServiceRef.current = getDesktopSettingsMainService();
    }
    return desktopSettingsServiceRef.current;
  }, []);
  configRef.current = config2;
  const notifySideEffectError = reactExports.useCallback(
    (key2) => {
      const errorKey = sideEffectErrorKeys[key2];
      if (!errorKey) return;
      dedupedToast.error(t2(errorKey));
    },
    [t2],
  );
  const set2 = reactExports.useCallback(
    async (key2, value) => {
      const requestId = (requestSeqRef.current[key2] ?? 0) + 1;
      requestSeqRef.current[key2] = requestId;
      const prev = configRef.current[key2];
      const persisted = await setConfigAsync((cfg) => ({
        ...cfg,
        [key2]: value,
      }));
      if (!persisted) {
        if (requestSeqRef.current[key2] === requestId) {
          notifySideEffectError(key2);
        }
        return false;
      }
      const effect2 = sideEffects[key2];
      if (!effect2) {
        trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
          key: key2,
          value_type: typeof value,
        });
        return true;
      }
      try {
        const ok2 = await effect2(getDesktopSettingsService(), value);
        if (!ok2 && requestSeqRef.current[key2] === requestId) {
          await setConfigAsync((cfg) => ({
            ...cfg,
            [key2]: prev,
          }));
          notifySideEffectError(key2);
        }
        if (ok2) {
          trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
            key: key2,
            value_type: typeof value,
          });
        }
        return ok2;
      } catch {
        if (requestSeqRef.current[key2] === requestId) {
          await setConfigAsync((cfg) => ({
            ...cfg,
            [key2]: prev,
          }));
          notifySideEffectError(key2);
        }
        return false;
      }
    },
    [setConfigAsync, notifySideEffectError, getDesktopSettingsService],
  );
  const setMany = reactExports.useCallback(
    async (patch2) => {
      const persisted = await setConfigAsync((cfg) => ({
        ...cfg,
        ...patch2,
      }));
      if (!persisted) return false;
      for (const key2 of Object.keys(patch2)) {
        trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
          key: key2,
          value_type: typeof patch2[key2],
        });
      }
      return true;
    },
    [setConfigAsync],
  );
  const openNotificationSettings = reactExports.useCallback(async () => {
    try {
      const result =
        await getDesktopSettingsService().openNotificationSettings();
      if (!result.success) {
        dedupedToast.error(
          result.error ?? t2("settings.errors.notificationsFailed"),
        );
        return false;
      }
      return true;
    } catch {
      dedupedToast.error(t2("settings.errors.notificationsFailed"));
      return false;
    }
  }, [t2, getDesktopSettingsService]);
  return {
    config: config2,
    set: set2,
    setMany,
    saveCustomModel: async (value, providerId) => {
      try {
        const { success } = await getDesktopSettingsService().saveCustomModel(
          value,
          providerId,
        );
        if (success)
          await Promise.all([
            queryClient2.invalidateQueries({
              queryKey: storageKeys.global("config"),
            }),
            queryClient2.invalidateQueries({
              queryKey: ACTIVE_CUSTOM_MODEL_QUERY_KEY,
            }),
          ]);
        return success;
      } catch {
        return false;
      }
    },
    openNotificationSettings,
  };
}
