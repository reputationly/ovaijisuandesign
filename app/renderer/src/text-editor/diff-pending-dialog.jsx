// diff-pending-dialog.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Dialog } from "../canvas/separator.jsx";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../media-editing/use-preview-text.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
export function DiffPendingDialog({ open, onDismiss }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next2) => {
        if (!next2) onDismiss();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {t2("canvas.diffPendingTitle", "还有未处理的修改")}
          </DialogTitle>
          <DialogDescription>
            {t2(
              "canvas.diffPendingDescription",
              "当前还有 AI 修改未处理，请先接受或撤销所有修改后再关闭编辑。",
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="default" onClick={onDismiss}>
            {t2("canvas.diffPendingConfirm", "去处理")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
