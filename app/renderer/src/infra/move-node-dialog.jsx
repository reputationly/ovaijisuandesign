// move-node-dialog.jsx
import { jsxRuntimeExports, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "./dialog-content.jsx";
import { DialogDescription, DialogTitle } from "./badge-variants.jsx";
import { FolderDrillDownPicker } from "../assets/folder-drill-down-picker.jsx";

export function MoveNodeDialog({
  open,
  name: name2,
  itemCount = 1,
  options,
  loading = false,
  noopKey,
  onOpenChange,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  const [selectedKey, setSelectedKey] = reactExports.useState(void 0);
  const [pending2, setPending] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (open) {
      setSelectedKey(void 0);
      setPending(false);
    }
  }, [open]);
  const selected2 = options.find((option2) => option2.key === selectedKey);
  const handleConfirm = reactExports.useCallback(async () => {
    if (
      !selected2 ||
      (noopKey !== void 0 && selected2.key === noopKey) ||
      pending2
    )
      return;
    setPending(true);
    try {
      await onConfirm(selected2);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }, [noopKey, onConfirm, onOpenChange, pending2, selected2]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="grid-cols-1"
        data-action-ui-id="asset-move.dialog"
      >
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-baseline gap-1 pr-10 text-body-14 leading-5 font-medium">
            {itemCount > 1 ? (
              <span className="min-w-0 truncate">
                {t2("projectAssets.batchMoveDialogTitle", {
                  count: itemCount,
                })}
              </span>
            ) : (
              <>
                <span className="shrink-0">
                  {t2("localAssets.moveDialogTitlePrefix", {
                    defaultValue: "移动",
                  })}
                </span>
                <span
                  className="min-w-0 flex-1 truncate"
                  title={name2}
                >{`“${name2}”`}</span>
                <span className="shrink-0">
                  {t2("localAssets.moveDialogTitleSuffix", {
                    defaultValue: "到",
                  })}
                </span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {itemCount > 1
              ? t2("projectAssets.batchMoveDialogTitle", {
                  count: itemCount,
                })
              : t2("localAssets.moveDialogTitle", {
                  name: name2,
                })}
          </DialogDescription>
        </DialogHeader>
        <FolderDrillDownPicker
          options={options}
          value={selectedKey}
          onChange={setSelectedKey}
          loading={loading}
          actionUiId="asset-move.destination"
        />
        <DialogFooter>
          <Button$1
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={
              !selected2 ||
              (noopKey !== void 0 && selected2.key === noopKey) ||
              pending2 ||
              loading
            }
            onClick={() => void handleConfirm()}
            data-action-ui-id="asset-move.confirm"
          >
            {t2("localAssets.move")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
