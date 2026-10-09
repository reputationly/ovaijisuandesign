// delete-local-node-dialog.jsx
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";

export function DeleteLocalNodeDialog({
  node: node2,
  batchNodes,
  onOpenChange,
  onConfirm,
  onCompleted,
}) {
  const { t: t2 } = useTranslation();
  const [pending2, setPending] = reactExports.useState(false);
  const targets = batchNodes?.length ? batchNodes : node2 ? [node2] : [];
  const isBatch = targets.length > 1;
  const run2 = reactExports.useCallback(async () => {
    if (targets.length === 0 || pending2) return;
    setPending(true);
    let failed = 0;
    try {
      for (const target of targets) {
        try {
          await onConfirm(target);
        } catch (err) {
          failed += 1;
          dedupedToast.error(err instanceof Error ? err.message : String(err));
        }
      }
      if (failed === 0) {
        await onCompleted?.();
        onOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }, [onCompleted, onConfirm, onOpenChange, pending2, targets]);
  const isFolder = targets.length === 1 && targets[0]?.kind === "folder";
  return (
    <Dialog open={targets.length > 0} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.delete-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {isBatch
              ? t2("projectAssets.batchDeleteTitle", {
                  count: targets.length,
                })
              : isFolder
                ? t2("localAssets.deleteFolderTitle", {
                    name: targets[0]?.name ?? "",
                  })
                : t2("localAssets.deleteFileTitle", {
                    name: targets[0]?.name ?? "",
                  })}
          </DialogTitle>
          <DialogDescription className="text-[12px]/relaxed text-muted-foreground">
            {isBatch
              ? t2("projectAssets.batchDeleteLocalBody", {
                  count: targets.length,
                })
              : isFolder
                ? t2("localAssets.deleteFolderBody")
                : t2("localAssets.deleteFileBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            disabled={pending2}
            onClick={() => onOpenChange(false)}
            data-action-ui-id="local-assets.delete-cancel"
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            variant="destructive"
            size="sm"
            disabled={pending2}
            onClick={() => void run2()}
            data-action-ui-id="local-assets.delete-confirm"
          >
            {t2("localAssets.delete")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
