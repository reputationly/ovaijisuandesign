// use-folder-permission-gate.jsx
import {
  dedupedToast,
  reactExports,
  ShieldCheck,
  Trans,
  usePlatform,
  useStorage,
  useTranslation,
  workspaceLog,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AlertDialog, Button$1 } from "../infra/dialog-content.jsx";
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { isCaseInsensitiveOs } from "../settings/use-active-runtime.js";
import { useOptionalSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import { isPathInWhitelist } from "../settings/diagnostics-group.jsx";

function FolderPermissionDialog({
  open,
  folderPath,
  onAlwaysAllow,
  onAllow,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(v2) => !v2 && onCancel()}>
      <AlertDialogContent data-action-ui-id="folder-permission-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("workspace.folderPermission.title", "文件夹访问权限")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2(
              "workspace.folderPermission.body",
              "授予后，MiniMax Design 对该文件夹及其子文件夹里的内容将拥有读取、写入、删除的能力。",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2">
          <ShieldCheck
            size={14}
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground"
          />
          <p
            className="min-w-0 flex-1 truncate text-xs text-foreground"
            title={folderPath}
          >
            {folderPath}
          </p>
        </div>
        <AlertDialogFooter>
          <Button$1
            variant="ghost"
            onClick={onCancel}
            data-action-ui-id="folder-permission-cancel"
          >
            {t2("common.cancel", "取消")}
          </Button$1>
          <Button$1
            variant="outline"
            onClick={onAllow}
            data-action-ui-id="folder-permission-allow"
          >
            {t2("workspace.folderPermission.allow", "允许")}
          </Button$1>
          <Button$1
            onClick={onAlwaysAllow}
            data-action-ui-id="folder-permission-always-allow"
          >
            {t2("workspace.folderPermission.alwaysAllow", "始终允许")}
          </Button$1>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useFolderPermissionGate() {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const settingsDialog = useOptionalSettingsDialog();
  const caseInsensitive = isCaseInsensitiveOs(platform2.app.os);
  const [config2, , persistConfig] = useStorage("global.config");
  const configRef = reactExports.useRef(config2);
  configRef.current = config2;
  const [pending2, setPending] = reactExports.useState(null);
  const ensureGranted = reactExports.useCallback(
    (folderPath) => {
      if (
        isPathInWhitelist(
          folderPath,
          configRef.current.folderWhitelist ?? [],
          caseInsensitive,
        )
      ) {
        workspaceLog.info("folder-consent: whitelisted", {
          via: "whitelist",
        });
        return Promise.resolve(true);
      }
      workspaceLog.info("folder-consent: prompt");
      return new Promise((resolve) => {
        setPending({
          folderPath,
          resolve,
        });
      });
    },
    [caseInsensitive],
  );
  const handleAllow = reactExports.useCallback(() => {
    workspaceLog.info("folder-consent: allow");
    dedupedToast.success(
      t2("workspace.folderPermission.allowToast", "权限添加成功"),
    );
    pending2?.resolve(true);
    setPending(null);
  }, [pending2, t2]);
  const handleAlwaysAllow = reactExports.useCallback(async () => {
    if (!pending2) return;
    workspaceLog.info("folder-consent: always-allow");
    const folderPath = pending2.folderPath;
    if (
      !isPathInWhitelist(
        folderPath,
        configRef.current.folderWhitelist ?? [],
        caseInsensitive,
      )
    ) {
      const saved = await persistConfig((current2) => {
        const existing = current2.folderWhitelist ?? [];
        if (isPathInWhitelist(folderPath, existing, caseInsensitive)) return {};
        const withoutChildren = existing.filter(
          (entry) => !isPathInWhitelist(entry, [folderPath], caseInsensitive),
        );
        return {
          folderWhitelist: [...withoutChildren, folderPath],
        };
      });
      if (!saved) {
        dedupedToast.error(t2("settings.folderWhitelist.saveFailed"));
        return;
      }
    }
    dedupedToast.success(
      <Trans
        i18nKey="workspace.folderPermission.alwaysAllowToast"
        components={{
          1: (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => settingsDialog?.openSettings("advanced")}
              data-action-ui-id="folder-permission-toast-settings-link"
            />
          ),
        }}
      />,
    );
    pending2.resolve(true);
    setPending(null);
  }, [caseInsensitive, pending2, persistConfig, settingsDialog, t2]);
  const handleCancel = reactExports.useCallback(() => {
    workspaceLog.info("folder-consent: cancel");
    pending2?.resolve(false);
    setPending(null);
  }, [pending2]);
  const dialog = (
    <FolderPermissionDialog
      open={pending2 !== null}
      folderPath={pending2?.folderPath ?? ""}
      onAlwaysAllow={handleAlwaysAllow}
      onAllow={handleAllow}
      onCancel={handleCancel}
    />
  );
  return {
    ensureGranted,
    dialog,
  };
}
