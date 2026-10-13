// delete-node-dialog.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "./agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cloudErrorDisplayMessage } from "../workspace/asset-lineage-query-key.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "./dialog-content.jsx";
import { DialogDescription, DialogTitle } from "./badge-variants.jsx";
export function DeleteNodeDialog({
  node: node2,
  batchNodes,
  onOpenChange,
  onConfirm,
  onCompleted,
}) {
  const { t } = useTranslation();
  const [pending, setPending] = reactExports.useState(false);
  const targets = batchNodes?.length ? batchNodes : node2 ? [node2] : [];
  const isBatch = targets.length > 1;
  const run = reactExports.useCallback(async () => {
    if (targets.length === 0 || pending) return;
    setPending(true);
    let failed = 0;
    try {
      for (const target of targets) {
        try {
          await onConfirm(target);
        } catch (err) {
          failed += 1;
          dedupedToast.error(
            cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"),
          );
        }
      }
      if (failed === 0) {
        await onCompleted?.();
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }, [onCompleted, onConfirm, onOpenChange, pending, t, targets]);
  const isFolder = targets.length === 1 && targets[0]?.kind === "folder";
  return (
    <Dialog open={targets.length > 0} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="cloud-assets.delete-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {isBatch
              ? t("projectAssets.batchDeleteTitle", {
                  count: targets.length,
                })
              : isFolder
                ? t("cloudAssets.deleteFolderTitle", {
                    name: targets[0]?.name ?? "",
                  })
                : t("cloudAssets.deleteFileTitle", {
                    name: targets[0]?.name ?? "",
                  })}
          </DialogTitle>
          <DialogDescription className="text-[12px]/relaxed text-muted-foreground">
            {isBatch
              ? t("projectAssets.batchDeleteCloudBody", {
                  count: targets.length,
                })
              : isFolder
                ? t("cloudAssets.deleteFolderBody")
                : t("cloudAssets.deleteFileBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            data-action-ui-id="cloud-assets.delete-cancel"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => void run()}
            data-action-ui-id="cloud-assets.delete-confirm"
          >
            {t("cloudAssets.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
