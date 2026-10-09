// use-asset-center-settings.jsx
import { useTranslation, reactExports, dedupedToast, AlertTriangle, useQueryClient, usePlatform, Loader2, ShieldAlert, getRuntimeConfig, Sun, Monitor, Bell } from "../vendor.js";
import { gatewayFetch } from "../m15/agent-ws-client.jsx";
import { services, Icon } from "../m15/graph.jsx";
import { Folder, Moon } from "../m15/parse-item.jsx";
import { isElectron } from "../m15/track-events.js";
import { Button$1, Textarea } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SettingGroup, SettingRow, SettingsSelect } from "../m09/auth-provider.jsx";
import { LocalFolderIcon, IAssetCenterMainService } from "../m08/browser-inspiration-urls.jsx";
import {
  comfyuiLog,
  KbdGroup,
  ShortcutKeycap,
  isMacPlatform,
  SHORTCUT_DEFS,
} from "../m08/shortcut-categories.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useSettings } from "./use-data-directory.js";
import { RestartBanner } from "./use-media-actions.jsx";
import { AssetCenterMigrateDialog } from "./use-update-actions.jsx";
let _service$2 = null;
export function getAssetCenterMainService() {
  if (!_service$2) {
    _service$2 = services.get(IAssetCenterMainService);
  }
  return _service$2;
}
const ASSET_CENTER_ROOT_KEY = ["asset-center"];
function useMigrateErrorMessage() {
  const { t: t2 } = useTranslation();
  return reactExports.useCallback(
    (reasonCode) => {
      const key2 = {
        invalid_path: "settings.assetCenter.migrateReason.invalidPath",
        same_path: "settings.assetCenter.migrateReason.samePath",
        path_overlap: "settings.assetCenter.migrateReason.pathOverlap",
        source_mismatch: "settings.assetCenter.migrateReason.sourceMismatch",
        migration_in_progress: "settings.assetCenter.migrateReason.migrationInProgress",
        source_missing: "settings.assetCenter.migrateReason.sourceMissing",
        source_not_directory: "settings.assetCenter.migrateReason.sourceNotDirectory",
        destination_not_directory: "settings.assetCenter.migrateReason.destinationNotDirectory",
        destination_not_empty: "settings.assetCenter.migrateReason.destinationNotEmpty",
        destination_not_asset_center:
          "settings.assetCenter.migrateReason.destinationNotAssetCenter",
        insufficient_space: "settings.assetCenter.migrateReason.insufficientSpace",
        copy_failed: "settings.assetCenter.migrateReason.copyFailed",
        verification_failed: "settings.assetCenter.migrateReason.verificationFailed",
      };
      return reasonCode ? t2(key2[reasonCode]) : t2("settings.assetCenter.migrateFailed");
    },
    [t2],
  );
}
function useAssetCenterSettings() {
  const queryClient2 = useQueryClient();
  const migrateErrorMessage = useMigrateErrorMessage();
  const { t: t2 } = useTranslation();
  const [status, setStatus] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [needsRestart, setNeedsRestart] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [pendingSwitch, setPendingSwitch] = reactExports.useState(null);
  const [dialogError, setDialogError] = reactExports.useState(null);
  const toDisplayError = reactExports.useCallback(
    (err) => {
      const message2 = err instanceof Error ? err.message : String(err);
      const knownErrors = [
        "app_install_dir",
        "drive_root",
        "protected_dir",
        "not_writable",
        "invalid_path",
      ];
      if (message2.includes("data_directory_change_pending")) {
        return t2("settings.assetCenter.dataDirectoryChangePending");
      }
      const code2 = knownErrors.find((candidate) => message2.includes(candidate));
      return code2
        ? t2(`settings.storage.errors.${code2}`)
        : t2("settings.assetCenter.changeFailed");
    },
    [t2],
  );
  const refreshStatus = reactExports.useCallback(async () => {
    try {
      const next2 = await getAssetCenterMainService().getStatus();
      setStatus(next2);
      setNeedsRestart(next2.needsRestart);
    } catch (err) {
      setError(toDisplayError(err));
    }
  }, [toDisplayError]);
  reactExports.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);
  const invalidate = reactExports.useCallback(() => {
    queryClient2.invalidateQueries({
      queryKey: ASSET_CENTER_ROOT_KEY,
    });
  }, [queryClient2]);
  const handleBrowse = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const service2 = getAssetCenterMainService();
      const picked = await service2.pickDirectory(t2("settings.assetCenter.selectDirectory"));
      if (picked === null) return;
      const from2 = status?.directory;
      if (from2 && (await service2.isCurrentDirectory(picked))) return;
      const targetKind = await service2.inspectDirectory(picked);
      if (targetKind === "not_directory") {
        setError(t2("settings.assetCenter.targetNotDirectory"));
        return;
      }
      if (targetKind === "unavailable") {
        setError(t2("settings.assetCenter.targetUnavailable"));
        return;
      }
      if (targetKind === "unrelated_content") {
        setError(t2("settings.assetCenter.targetContainsOtherFiles"));
        return;
      }
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) && Boolean(from2);
      if (offerMigrate && from2) {
        setDialogError(null);
        setPendingSwitch({
          mode: "browse",
          from: from2,
          to: picked,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service2.setDirectory(picked);
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, t2, toDisplayError]);
  const handleReset = reactExports.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const from2 = status?.directory;
      const to = status?.defaultDirectory;
      const service2 = getAssetCenterMainService();
      const targetIsCurrent = to ? await service2.isCurrentDirectory(to) : false;
      const offerMigrate =
        Boolean(status?.currentRootHasData || status?.currentRootUnavailable) &&
        Boolean(from2) &&
        Boolean(to) &&
        !targetIsCurrent;
      if (offerMigrate && from2 && to) {
        const targetKind = await service2.inspectDirectory(to);
        if (
          targetKind === "not_directory" ||
          targetKind === "unrelated_content" ||
          targetKind === "unavailable"
        ) {
          setError(
            t2(
              targetKind === "not_directory"
                ? "settings.assetCenter.targetNotDirectory"
                : targetKind === "unavailable"
                  ? "settings.assetCenter.targetUnavailable"
                  : "settings.assetCenter.targetContainsOtherFiles",
            ),
          );
          return;
        }
        setDialogError(null);
        setPendingSwitch({
          mode: "reset",
          from: from2,
          to,
          targetHasContent: targetKind === "asset_center",
          sourceUnavailable: status?.currentRootUnavailable ?? false,
        });
        return;
      }
      const result = await service2.resetToDefault();
      setNeedsRestart(result.needsRestart);
      await refreshStatus();
      invalidate();
    } catch (err) {
      setError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, refreshStatus, status, t2, toDisplayError]);
  const applyPendingSwitch = reactExports.useCallback(
    async (pending2) => {
      if (pending2.mode === "reset") {
        const result = await getAssetCenterMainService().resetToDefault();
        setNeedsRestart(result.needsRestart);
      } else {
        const result = await getAssetCenterMainService().setDirectory(pending2.to);
        setNeedsRestart(result.needsRestart);
      }
      await refreshStatus();
      invalidate();
    },
    [invalidate, refreshStatus],
  );
  const confirmMigrate = reactExports.useCallback(async () => {
    if (!pendingSwitch) return;
    const pending2 = pendingSwitch;
    if (pending2.sourceUnavailable) {
      setDialogError(t2("settings.assetCenter.sourceUnavailableWarning"));
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      const result = await getAssetCenterMainService().migrateAndSwitch(
        pending2.mode === "reset"
          ? {
              mode: "default",
              overwrite: pending2.targetHasContent,
            }
          : {
              mode: "custom",
              targetDirectory: pending2.to,
              overwrite: pending2.targetHasContent,
            },
      );
      if (!result.migration.success) {
        setDialogError(migrateErrorMessage(result.migration.reasonCode));
        return;
      }
      setNeedsRestart(result.needsRestart ?? false);
      await refreshStatus();
      invalidate();
      setPendingSwitch(null);
    } catch (err) {
      setDialogError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [invalidate, migrateErrorMessage, pendingSwitch, refreshStatus, t2, toDisplayError]);
  const confirmSwitchOnly = reactExports.useCallback(async () => {
    if (!pendingSwitch) return;
    const pending2 = pendingSwitch;
    setBusy(true);
    setDialogError(null);
    try {
      await applyPendingSwitch(pending2);
      setPendingSwitch(null);
    } catch (err) {
      setDialogError(toDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [applyPendingSwitch, pendingSwitch, toDisplayError]);
  const cancelSwitch = reactExports.useCallback(() => {
    setPendingSwitch(null);
    setDialogError(null);
  }, []);
  return {
    status,
    busy,
    needsRestart,
    error,
    handleBrowse,
    handleReset,
    pendingSwitch,
    dialogError,
    confirmMigrate,
    confirmSwitchOnly,
    cancelSwitch,
  };
}
export function AssetCenterSection() {
  const { t: t2 } = useTranslation();
  const {
    status,
    busy,
    needsRestart,
    error,
    handleBrowse,
    handleReset,
    pendingSwitch,
    dialogError,
    confirmMigrate,
    confirmSwitchOnly,
    cancelSwitch,
  } = useAssetCenterSettings();
  if (!status) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        {t2("settings.assetCenter.loading")}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <SettingGroup>
        <SettingRow
          label={t2("settings.assetCenter.directory")}
          description={
            status.isCustomDirectory
              ? t2("settings.assetCenter.directoryDescCustom")
              : t2("settings.assetCenter.directoryDescDefault")
          }
        >
          <div className="flex items-center gap-2">
            <Button$1
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => void handleBrowse()}
              disabled={busy || needsRestart || status.dataDirectoryChangePending}
              data-action-ui-id="settings-asset-center-browse"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <LocalFolderIcon />}
              {t2("settings.assetCenter.browse")}
            </Button$1>
            {status.isCustomDirectory && (
              <Button$1
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-normal text-muted-foreground"
                onClick={() => void handleReset()}
                disabled={busy || needsRestart || status.dataDirectoryChangePending}
                data-action-ui-id="settings-asset-center-reset"
              >
                {t2("settings.assetCenter.reset")}
              </Button$1>
            )}
          </div>
        </SettingRow>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Icon icon={Folder} size="md" className="shrink-0 text-muted-foreground" />
          <p className="truncate text-xs text-muted-foreground" title={status.directory}>
            {status.directory}
          </p>
        </div>
      </SettingGroup>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      {status.dataDirectoryChangePending && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            {t2("settings.assetCenter.dataDirectoryChangePending")}
          </p>
        </div>
      )}
      {status.currentRootUnavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            {t2("settings.assetCenter.currentLocationUnavailable")}
          </p>
        </div>
      )}
      {needsRestart && <RestartBanner message={t2("settings.assetCenter.restartRequired")} />}
      <AssetCenterMigrateDialog
        open={pendingSwitch !== null}
        fromPath={pendingSwitch?.from ?? ""}
        toPath={pendingSwitch?.to ?? ""}
        targetHasContent={pendingSwitch?.targetHasContent ?? false}
        sourceUnavailable={pendingSwitch?.sourceUnavailable ?? false}
        busy={busy}
        error={dialogError}
        onMigrate={() => void confirmMigrate()}
        onSwitchOnly={() => void confirmSwitchOnly()}
        onCancel={cancelSwitch}
      />
    </div>
  );
}
const LAUNCH_ARGS_PATH = "/api/comfyui/launch-args";
function parseArgs$1(text2) {
  return text2
    .split(/\s+/)
    .map((token2) => token2.trim())
    .filter(Boolean);
}
export function ComfyUiSection() {
  const { t: t2 } = useTranslation();
  const [text2, setText] = reactExports.useState("");
  const [savedText, setSavedText] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await gatewayFetch(LAUNCH_ARGS_PATH);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data2 = await res.json();
        if (cancelled) return;
        const joined = (data2.args ?? []).join("\n");
        setText(joined);
        setSavedText(joined);
      } catch (error) {
        comfyuiLog.warn("launch-args load failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleSave = reactExports.useCallback(async () => {
    setSaving(true);
    try {
      const args = parseArgs$1(text2);
      const res = await gatewayFetch(LAUNCH_ARGS_PATH, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          args,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const data2 = await res.json();
      const joined = (data2.args ?? []).join("\n");
      setText(joined);
      setSavedText(joined);
      dedupedToast.success(t2("settings.comfyui.saved"));
    } catch (error) {
      comfyuiLog.error("launch-args save failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      dedupedToast.error(t2("settings.comfyui.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [text2, t2]);
  if (!isElectron()) return null;
  const dirty = text2 !== savedText;
  return (
    <div className="space-y-4">
      <SettingGroup>
        <div className="py-2.5">
          <p className="text-sm font-normal text-foreground">{t2("settings.comfyui.launchArgs")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t2("settings.comfyui.launchArgsDesc")}
          </p>
        </div>
        <Textarea
          value={text2}
          onChange={(event) => setText(event.target.value)}
          placeholder={t2("settings.comfyui.launchArgsPlaceholder")}
          disabled={loading || saving}
          spellCheck={false}
          rows={5}
          className="font-mono"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">{t2("settings.comfyui.restartHint")}</p>
          <Button$1
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal"
            disabled={loading || saving || !dirty}
            onClick={() => void handleSave()}
          >
            {t2("settings.comfyui.save")}
          </Button$1>
        </div>
      </SettingGroup>
    </div>
  );
}
const COMPACT_SHORTCUT_MODIFIERS = new Set(["⌘", "⌃", "⌥", "⇧"]);
function splitShortcutKeys(keys2) {
  if (keys2.includes("+")) {
    return keys2
      .split("+")
      .map((key2) => key2.trim())
      .filter(Boolean);
  }
  const parts = [];
  let textKey = "";
  for (const char of Array.from(keys2)) {
    if (COMPACT_SHORTCUT_MODIFIERS.has(char)) {
      if (textKey) {
        parts.push(textKey);
        textKey = "";
      }
      parts.push(char);
      continue;
    }
    textKey += char;
  }
  if (textKey) parts.push(textKey);
  return parts.length > 0 ? parts : [keys2];
}
function ShortcutList({ children: children2 }) {
  return <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">{children2}</div>;
}
function ShortcutRow({ label, keys: keys2 }) {
  const keyParts = splitShortcutKeys(keys2);
  const keyCounts = new Map();
  const keyCaps = keyParts.map((key2) => {
    const count2 = keyCounts.get(key2) ?? 0;
    keyCounts.set(key2, count2 + 1);
    return {
      id: count2 === 0 ? key2 : `${key2}-${count2}`,
      label: key2,
    };
  });
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 rounded-md px-3 py-1.5">
      <span className="min-w-0 truncate text-xs text-foreground">{label}</span>
      <KbdGroup className="shrink-0 gap-1.5" aria-label={keys2}>
        {keyCaps.map((keyCap) => (
          <ShortcutKeycap
            key={keyCap.id}
            token={keyCap.label}
            className="h-6 min-w-6 rounded-md border border-border bg-background px-1.5 font-sans text-[11px] font-medium text-foreground/70"
          />
        ))}
      </KbdGroup>
    </div>
  );
}
export function GeneralSection() {
  const { t: t2 } = useTranslation();
  const { config: config2, set: set2, openNotificationSettings } = useSettings();
  const runtimeConfig = getRuntimeConfig();
  const electron = isElectron();
  const isMac2 = isMacPlatform();
  const { app: platformApp } = usePlatform();
  const removeWatermarkChecked = !(config2.watermarkEnabled ?? true);
  return (
    <div className="space-y-2">
      <SettingGroup>
        <SettingRow label={t2("settings.language")} description={t2("settings.languageDesc")}>
          <SettingsSelect
            value={config2.language}
            onValueChange={async (v2) => {
              await set2("language", v2);
            }}
            options={[
              {
                value: "en",
                label: "English",
              },
              {
                value: "zh",
                label: "中文",
              },
            ]}
            className="w-32"
          />
        </SettingRow>
        <SettingRow label={t2("settings.theme")} description={t2("settings.themeDesc")}>
          <SettingsSelect
            value={config2.theme}
            onValueChange={(value) => void set2("theme", value)}
            className="w-32"
            options={[
              {
                value: "light",
                label: t2("settings.themeLight"),
                icon: Sun,
              },
              {
                value: "dark",
                label: t2("settings.themeDark"),
                icon: Moon,
              },
              {
                value: "system",
                label: t2("settings.themeSystem"),
                icon: Monitor,
              },
            ]}
          />
        </SettingRow>
        <SettingRow
          label={t2("settings.islandLayout")}
          description={t2("settings.islandLayoutDesc")}
        >
          <Switch
            checked={config2.islandLayout}
            onCheckedChange={(checked) => void set2("islandLayout", checked)}
          />
        </SettingRow>
        {electron && runtimeConfig.transparentWindowSupported && (
          <SettingRow
            label={t2("settings.transparentWindowExperiment")}
            description={t2("settings.transparentWindowExperimentDesc")}
          >
            <Switch
              checked={config2.transparentWindowExperiment ?? false}
              onCheckedChange={(checked) => void set2("transparentWindowExperiment", checked)}
              data-action-ui-id="settings.transparent-window-experiment-toggle"
            />
          </SettingRow>
        )}
        <SettingRow
          label={t2("settings.removeWatermark")}
          description={t2("settings.removeWatermarkDesc")}
        >
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={removeWatermarkChecked}
              onCheckedChange={(checked) => void set2("watermarkEnabled", !checked)}
              data-action-ui-id="settings.remove-watermark-toggle"
            />
            <span className="whitespace-nowrap text-xs text-muted-foreground" aria-live="polite">
              {t2("settings.watermarkStatusCurrent", {
                status: t2(
                  removeWatermarkChecked
                    ? "settings.watermarkStatusOff"
                    : "settings.watermarkStatusOn",
                ),
              })}
            </span>
          </div>
        </SettingRow>
      </SettingGroup>
      {electron && (
        <SettingGroup title={t2("settings.groupSystem")}>
          {platformApp.os === "win32" && (
            <SettingRow
              label={t2("settings.windowCloseBehavior")}
              description={t2("settings.windowCloseBehaviorDesc")}
            >
              <SettingsSelect
                value={
                  config2.windowCloseBehavior === "tray" || config2.windowCloseBehavior === "quit"
                    ? config2.windowCloseBehavior
                    : "ask"
                }
                onValueChange={(value) => {
                  if (value === "ask" || value === "tray" || value === "quit") {
                    void set2("windowCloseBehavior", value);
                  }
                }}
                options={[
                  {
                    value: "ask",
                    label: t2("settings.windowCloseAsk"),
                  },
                  {
                    value: "tray",
                    label: t2("settings.windowCloseTray"),
                  },
                  {
                    value: "quit",
                    label: t2("settings.windowCloseQuit"),
                  },
                ]}
                className="w-40"
                aria-label={t2("settings.windowCloseBehavior")}
                data-action-ui-id="settings.window-close-behavior"
              />
            </SettingRow>
          )}
          <SettingRow label={t2("settings.autoStart")} description={t2("settings.autoStartDesc")}>
            <Switch
              checked={config2.runOnStartup}
              onCheckedChange={(checked) => void set2("runOnStartup", checked)}
            />
          </SettingRow>
          <SettingRow label={t2("settings.tray")} description={t2("settings.trayDesc")}>
            <Switch
              checked={config2.menuBarVisible}
              onCheckedChange={(checked) => void set2("menuBarVisible", checked)}
            />
          </SettingRow>
          <SettingRow
            label={t2("settings.preventSleep")}
            description={t2("settings.preventSleepDesc")}
          >
            <Switch
              checked={config2.preventSleep ?? false}
              onCheckedChange={(checked) => void set2("preventSleep", checked)}
            />
          </SettingRow>
          <SettingRow
            label={t2("settings.notifications")}
            description={t2("settings.notificationsDesc")}
          >
            <Button$1
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => void openNotificationSettings()}
            >
              <Bell size={14} strokeWidth={1.5} />
              {t2("settings.openSystemPrefs")}
            </Button$1>
          </SettingRow>
        </SettingGroup>
      )}
      <SettingGroup title={t2("settings.shortcuts")}>
        <ShortcutList>
          {Object.values(SHORTCUT_DEFS).map((def) => (
            <ShortcutRow
              key={def.labelKey}
              label={t2(def.labelKey)}
              keys={isMac2 ? def.macDisplay : def.otherDisplay}
            />
          ))}
        </ShortcutList>
      </SettingGroup>
    </div>
  );
}
