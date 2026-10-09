// entity-delete-confirm.jsx
import {
  Loader2,
  reactExports,
  ShieldAlert,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  classifyAssetError,
  trackAssetCenterAction,
} from "../infra/use-online.jsx";
import { formatAssetCenterError } from "./key-entries.js";
import { AlertDialog } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { useDeleteEntity } from "./use-materialize-entity.js";

export function EntityDeleteConfirm({
  entity,
  onClose,
  surface = "asset_center_page",
}) {
  const { t: t2 } = useTranslation();
  const deleteMutation = useDeleteEntity();
  const [error, setError] = reactExports.useState(null);
  const handleConfirm = async () => {
    if (!entity) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync({
        entityId: entity.id,
      });
      trackAssetCenterAction({
        action: "entity_delete",
        surface,
        entity_id: entity.id,
        entity_type: entity.type,
        success: true,
      });
      onClose();
    } catch (err) {
      setError(formatAssetCenterError(err, t2));
      trackAssetCenterAction({
        action: "entity_delete",
        surface,
        entity_id: entity.id,
        entity_type: entity.type,
        success: false,
        error_type: classifyAssetError(err),
      });
    }
  };
  return (
    <AlertDialog
      open={entity !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent data-action-ui-id="asset-center-entity-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            {t2("assetCenter.deleteEntity.confirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs space-y-2">
            <span className="block">
              {t2("assetCenter.deleteEntity.confirmDescription", {
                name: entity?.name ?? "",
              })}
            </span>
            <span className="block text-muted-foreground/80">
              {t2("assetCenter.deleteEntity.note")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            className="text-xs text-destructive"
            data-action-ui-id="asset-center-entity-delete-error"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            data-action-ui-id="asset-center-entity-delete-cancel"
          >
            {t2("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-action-ui-id="asset-center-entity-delete-confirm-action"
          >
            {deleteMutation.isPending && (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            )}
            {t2("assetCenter.deleteEntity.confirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
