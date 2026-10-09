// diff-pending-dialog.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog$1 } from "../canvas/separator.jsx";
import {
  DialogContent$1,
  DialogDescription$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "../media-editing/use-preview-text.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";

export function DiffPendingDialog({ open, onDismiss }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog$1
      open={open}
      onOpenChange={(next2) => {
        if (!next2) onDismiss();
      }}
    >
      <DialogContent$1 showCloseButton={false}>
        <DialogHeader$1>
          <DialogTitle$1>
            {t2("canvas.diffPendingTitle", "还有未处理的修改")}
          </DialogTitle$1>
          <DialogDescription$1>
            {t2(
              "canvas.diffPendingDescription",
              "当前还有 AI 修改未处理，请先接受或撤销所有修改后再关闭编辑。",
            )}
          </DialogDescription$1>
        </DialogHeader$1>
        <DialogFooter$1>
          <Button$2 variant="default" onClick={onDismiss}>
            {t2("canvas.diffPendingConfirm", "去处理")}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
