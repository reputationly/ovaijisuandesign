// use-settings.js
import reactExports from "react";
import { storageKeys } from "../infra/storage-cache.js";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useStorage } from "../infra/use-storage.js";
import { dedupedToast } from "../infra/agent-http-client.js";
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
  menuBarVisible: async (service, value) => {
    const result = await service.setTrayVisible(value);
    return result.success;
  },
  runOnStartup: async (service, value) => {
    const result = await service.setRunOnStartup(value);
    return result.success;
  },
  language: async (service, value) => {
    const result = await service.setLanguage(value);
    return result.success;
  },
  theme: async (service, value) => {
    const result = await service.setTheme(value);
    return result.success;
  },
  preventSleep: async (service, value) => {
    const result = await service.setPreventSleep(value);
    return result.success;
  },
  autoFeedbackEnabled: async (service, value) => {
    const result = await service.setAutoFeedbackEnabled(value);
    return result.success;
  },
  watermarkEnabled: async (service, value) => {
    const result = await service.setWatermarkEnabled(value);
    return result.success;
  },
  compactionEnabled: async (service, value) => {
    const result = await service.setCompactionEnabled(value);
    return result.success;
  },
  lane: async (service, value) => {
    const result = await service.setLane(value ?? "");
    return result.success;
  },
};

export function useSettings() {
  const queryClient = useQueryClient();
  const [config, , setConfigAsync] = useStorage("global.config");
  const { t } = useTranslation();
  const configRef = reactExports.useRef(config);
  const requestSeqRef = reactExports.useRef({});
  const desktopSettingsServiceRef = reactExports.useRef(null);
  const getDesktopSettingsService = reactExports.useCallback(() => {
    if (!desktopSettingsServiceRef.current) {
      desktopSettingsServiceRef.current = getDesktopSettingsMainService();
    }
    return desktopSettingsServiceRef.current;
  }, []);
  configRef.current = config;
  const notifySideEffectError = reactExports.useCallback(
    (key) => {
      const errorKey = sideEffectErrorKeys[key];
      if (!errorKey) return;
      dedupedToast.error(t(errorKey));
    },
    [t],
  );
  const set = reactExports.useCallback(
    async (key, value) => {
      const requestId = (requestSeqRef.current[key] ?? 0) + 1;
      requestSeqRef.current[key] = requestId;
      const prev = configRef.current[key];
      const persisted = await setConfigAsync((cfg) => ({
        ...cfg,
        [key]: value,
      }));
      if (!persisted) {
        if (requestSeqRef.current[key] === requestId) {
          notifySideEffectError(key);
        }
        return false;
      }
      const effect = sideEffects[key];
      if (!effect) {
        trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
          key,
          value_type: typeof value,
        });
        return true;
      }
      try {
        const ok = await effect(getDesktopSettingsService(), value);
        if (!ok && requestSeqRef.current[key] === requestId) {
          await setConfigAsync((cfg) => ({
            ...cfg,
            [key]: prev,
          }));
          notifySideEffectError(key);
        }
        if (ok) {
          trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
            key,
            value_type: typeof value,
          });
        }
        return ok;
      } catch {
        if (requestSeqRef.current[key] === requestId) {
          await setConfigAsync((cfg) => ({
            ...cfg,
            [key]: prev,
          }));
          notifySideEffectError(key);
        }
        return false;
      }
    },
    [setConfigAsync, notifySideEffectError, getDesktopSettingsService],
  );
  const setMany = reactExports.useCallback(
    async (patch) => {
      const persisted = await setConfigAsync((cfg) => ({
        ...cfg,
        ...patch,
      }));
      if (!persisted) return false;
      for (const key of Object.keys(patch)) {
        trackEvent(TRACK_EVENTS.SETTINGS_CHANGE, {
          key,
          value_type: typeof patch[key],
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
          result.error ?? t("settings.errors.notificationsFailed"),
        );
        return false;
      }
      return true;
    } catch {
      dedupedToast.error(t("settings.errors.notificationsFailed"));
      return false;
    }
  }, [t, getDesktopSettingsService]);
  return {
    config,
    set,
    setMany,
    saveCustomModel: async (value, providerId) => {
      try {
        const { success } = await getDesktopSettingsService().saveCustomModel(
          value,
          providerId,
        );
        if (success)
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: storageKeys.global("config"),
            }),
            queryClient.invalidateQueries({
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
