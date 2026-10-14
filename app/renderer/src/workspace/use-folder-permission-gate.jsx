// use-folder-permission-gate.jsx
import { Trans } from "react-i18next";
import { reactExports, ShieldCheck, usePlatform, useStorage, useTranslation, workspaceLog } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
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
  const { t: translate } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent data-action-ui-id="folder-permission-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translate("workspace.folderPermission.title", "文件夹访问权限")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translate(
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
          <Button
            variant="ghost"
            onClick={onCancel}
            data-action-ui-id="folder-permission-cancel"
          >
            {translate("common.cancel", "取消")}
          </Button>
          <Button
            variant="outline"
            onClick={onAllow}
            data-action-ui-id="folder-permission-allow"
          >
            {translate("workspace.folderPermission.allow", "允许")}
          </Button>
          <Button
            onClick={onAlwaysAllow}
            data-action-ui-id="folder-permission-always-allow"
          >
            {translate("workspace.folderPermission.alwaysAllow", "始终允许")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function useFolderPermissionGate() {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const settingsDialog = useOptionalSettingsDialog();
  const caseInsensitive = isCaseInsensitiveOs(platform.app.os);
  const [config, , persistConfig] = useStorage("global.config");
  const configRef = reactExports.useRef(config);
  configRef.current = config;
  const [pending, setPending] = reactExports.useState(null);
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
      translate("workspace.folderPermission.allowToast", "权限添加成功"),
    );
    pending?.resolve(true);
    setPending(null);
  }, [pending, translate]);
  const handleAlwaysAllow = reactExports.useCallback(async () => {
    if (!pending) return;
    workspaceLog.info("folder-consent: always-allow");
    const folderPath = pending.folderPath;
    if (
      !isPathInWhitelist(
        folderPath,
        configRef.current.folderWhitelist ?? [],
        caseInsensitive,
      )
    ) {
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
      if (!saved) {
        dedupedToast.error(translate("settings.folderWhitelist.saveFailed"));
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
    pending.resolve(true);
    setPending(null);
  }, [caseInsensitive, pending, persistConfig, settingsDialog, translate]);
  const handleCancel = reactExports.useCallback(() => {
    workspaceLog.info("folder-consent: cancel");
    pending?.resolve(false);
    setPending(null);
  }, [pending]);
  const dialog = (
    <FolderPermissionDialog
      open={pending !== null}
      folderPath={pending?.folderPath ?? ""}
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
