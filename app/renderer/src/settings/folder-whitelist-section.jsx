// folder-whitelist-section.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { useTranslation } from "react-i18next";
import { FolderPlus, X$7 as X } from "../media-editing/lucide-icon-wraps.js";
import { useStorage } from "../infra/use-storage.js";
import { isPathInWhitelist } from "./diagnostics-group.jsx";
import { isCaseInsensitiveOs } from "./use-active-runtime.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FolderKey, Trash2 } from "../media-editing/package.jsx";
import { folderNameFromPath } from "../generation/use-model-catalog-scope-key.js";
import { Button } from "../infra/dialog-content.jsx";
import { SettingGroup, SettingRow } from "./settings-select.jsx";
function useFolderWhitelist() {
  const platform = usePlatform();
  const { t } = useTranslation();
  const [config, , persistConfig] = useStorage("global.config");
  const whitelist = config.folderWhitelist ?? [];
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const caseInsensitive = isCaseInsensitiveOs(platform.app.os);
  const addFolder = reactExports.useCallback(async () => {
    const showOpenDialog = platform.fs.showOpenDialog;
    if (!showOpenDialog) return;
    const picked = await showOpenDialog({
      directory: true,
      multiple: false,
    }).catch(() => void 0);
    const folderPath = picked?.[0];
    if (!folderPath) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await persistConfig((current) => {
        const existing = current.folderWhitelist ?? [];
        if (isPathInWhitelist(folderPath, existing, caseInsensitive)) return {};
        const withoutChildren = existing.filter(
          (entry) => !isPathInWhitelist(entry, [folderPath], caseInsensitive),
        );
        return {
          folderWhitelist: [...withoutChildren, folderPath],
        };
      });
      if (!saved) setError(t("settings.folderWhitelist.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [caseInsensitive, persistConfig, platform.fs, t]);
  const removeFolder = reactExports.useCallback(
    async (folderPath) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await persistConfig((current) => ({
          folderWhitelist: (current.folderWhitelist ?? []).filter(
            (whitelistedPath) => whitelistedPath !== folderPath,
          ),
        }));
        if (!saved) setError(t("settings.folderWhitelist.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [persistConfig, t],
  );
  return {
    whitelist,
    addFolder,
    removeFolder,
    saving,
    error,
  };
}
export function FolderWhitelistSection() {
  const { t } = useTranslation();
  const { whitelist, addFolder, removeFolder, saving, error } =
    useFolderWhitelist();
  const [manageOpen, setManageOpen] = reactExports.useState(false);
  const [container, setContainer] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!manageOpen) return;
    const el = document.querySelector('[data-action-ui-id="settings-dialog"]');
    setContainer(el);
  }, [manageOpen]);
  reactExports.useEffect(() => {
    if (!manageOpen) return;
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.stopPropagation();
        setManageOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, {
      capture: true,
    });
    return () =>
      window.removeEventListener("keydown", onKey, {
        capture: true,
      });
  }, [manageOpen]);
  const overlay = manageOpen && container && (
    <>
      <div
        className="modal-mask absolute inset-0 z-40"
        onClick={() => setManageOpen(false)}
        aria-hidden={true}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-whitelist-title"
        data-action-ui-id="folder-whitelist-dialog"
        className="elevated-surface-border absolute top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2
              id="folder-whitelist-title"
              className="font-heading text-sm font-normal"
            >
              {t("settings.folderWhitelist.title", "已信任文件夹")}
            </h2>
            <p className="text-xs/relaxed text-muted-foreground">
              {t(
                "settings.folderWhitelist.description",
                "在新建项目时选择这些文件夹，将不再重复询问是否允许。此设置仅记住你的选择，不会扩大系统权限。",
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setManageOpen(false)}
            aria-label={t("common.close", "关闭")}
            data-action-ui-id="folder-whitelist-dialog-close"
            className="shrink-0"
          >
            <X size={14} strokeWidth={1.5} />
          </Button>
        </div>
        {whitelist.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-8 text-center">
            <FolderKey
              size={20}
              strokeWidth={1.25}
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.folderWhitelist.empty", "暂无已记住的文件夹")}
            </p>
          </div>
        ) : (
          <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
            {whitelist.map((folderPath) => (
              <div
                key={folderPath}
                data-action-ui-id="settings-folder-whitelist-row"
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <FolderKey
                  size={14}
                  strokeWidth={1.5}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate text-xs text-foreground"
                    title={folderPath}
                  >
                    {folderNameFromPath(folderPath)}
                  </span>
                  <span
                    className="truncate text-[11px] text-muted-foreground"
                    title={folderPath}
                  >
                    {folderPath}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void removeFolder(folderPath)}
                  disabled={saving}
                  data-action-ui-id="settings-folder-whitelist-remove"
                  aria-label={t("common.delete", "删除")}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-normal"
            onClick={() => void addFolder()}
            disabled={saving}
            data-action-ui-id="settings-folder-whitelist-add"
          >
            <FolderPlus size={14} strokeWidth={1.5} />
            {t("settings.folderWhitelist.add", "添加文件夹")}
          </Button>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </>
  );
  return (
    <SettingGroup title={t("settings.folderWhitelist.title", "已信任文件夹")}>
      <SettingRow
        label={t("settings.folderWhitelist.listGroup", "免重复确认的文件夹")}
        description={t(
          "settings.folderWhitelist.description",
          "在新建项目时选择这些文件夹，将不再重复询问是否允许。此设置仅记住你的选择，不会扩大系统权限。",
        )}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-normal"
          onClick={() => setManageOpen(true)}
          data-action-ui-id="settings-folder-whitelist-manage"
        >
          {t("settings.folderWhitelist.manage", "管理")}
        </Button>
      </SettingRow>
      {overlay && container
        ? reactDomExports.createPortal(overlay, container)
        : null}
    </SettingGroup>
  );
}
