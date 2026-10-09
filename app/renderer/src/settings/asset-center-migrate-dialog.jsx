// asset-center-migrate-dialog.jsx
import {
  ArrowRight,
  FolderInput,
  Loader2,
  reactExports,
  ShieldAlert,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
export function AssetCenterMigrateDialog({
  open,
  fromPath,
  toPath,
  targetHasContent,
  sourceUnavailable,
  busy,
  error,
  onMigrate,
  onSwitchOnly,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  const [consented, setConsented] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setConsented(false);
  }, [open, toPath]);
  const migrateDisabled =
    busy || sourceUnavailable || (targetHasContent && !consented);
  return (
    <AlertDialog open={open} onOpenChange={(v2) => !v2 && !busy && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("settings.assetCenter.migrateTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("settings.assetCenter.migrateBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate" title={fromPath}>
            {fromPath}
          </span>
          <ArrowRight size={14} strokeWidth={1.5} className="shrink-0" />
          <span
            className="min-w-0 flex-1 truncate text-foreground"
            title={toPath}
          >
            {toPath}
          </span>
        </div>
        {targetHasContent && !busy && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-destructive"
              />
              <p className="text-xs text-destructive">
                {t2("settings.assetCenter.overwriteWarning")}
              </p>
            </div>
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id="asset-center-overwrite-consent"
                checked={consented}
                onCheckedChange={(v2) => setConsented(v2 === true)}
                data-action-ui-id="settings-asset-center-overwrite-consent"
              />
              <label
                htmlFor="asset-center-overwrite-consent"
                className="flex-1 cursor-pointer pt-2 text-xs text-foreground select-none pointer-coarse:pt-3.5"
              >
                {t2("settings.assetCenter.overwriteConsent", {
                  path: toPath,
                })}
              </label>
            </div>
          </div>
        )}
        {sourceUnavailable && !busy && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-warning">
              {t2("settings.assetCenter.sourceUnavailableWarning")}
            </p>
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            {t2("settings.assetCenter.migrateInProgress")}
          </div>
        )}
        {error && !busy && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
            <ShieldAlert
              size={14}
              className="mt-0.5 shrink-0 text-destructive"
            />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onMigrate}
            disabled={migrateDisabled}
            className="h-9 w-full justify-start gap-2"
            data-action-ui-id="settings-asset-center-migrate-confirm"
          >
            {busy ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <FolderInput size={16} strokeWidth={1.5} />
            )}
            {t2("settings.assetCenter.migrateConfirm")}
          </Button>
          <Button
            variant="outline"
            onClick={onSwitchOnly}
            disabled={busy}
            className="h-9 w-full justify-start font-normal"
            data-action-ui-id="settings-asset-center-switch-only"
          >
            {targetHasContent
              ? t2("settings.assetCenter.useExisting")
              : t2("settings.assetCenter.switchOnly")}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="h-9 w-full justify-start font-normal text-muted-foreground"
            data-action-ui-id="settings-asset-center-migrate-cancel"
          >
            {t2("common.cancel")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
