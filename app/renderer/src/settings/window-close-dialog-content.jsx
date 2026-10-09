// window-close-dialog-content.jsx
import { PanelBottomClose, reactExports, useTranslation } from "../vendor.js";
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useBlockingModalPresence } from "../workspace/topbar-state-context.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  Button$1,
  Dialog,
  DialogContent,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";

export function WindowCloseDialogContent({ onChoose }) {
  const { t: t2 } = useTranslation();
  const [remember, setRemember] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const [failed, setFailed] = reactExports.useState(false);
  const submitting = reactExports.useRef(false);
  const cancelRef = reactExports.useRef(null);
  useBlockingModalPresence("window-close", true);
  async function handleChoose(action) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await onChoose({
        action,
        remember: action !== "cancel" && remember,
      });
    } catch (error) {
      actionTrailLog.error("window-close response failed", {
        error,
      });
      submitting.current = false;
      setBusy(false);
      setFailed(true);
    }
  }
  return (
    <Dialog
      open={true}
      onOpenChange={(open) => !open && void handleChoose("cancel")}
    >
      <DialogContent
        layer="nested"
        showCloseButton={false}
        initialFocus={cancelRef}
        className="gap-6 p-6 shadow-lg sm:max-w-[440px]"
        data-action-ui-id="window-close-dialog"
      >
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <PanelBottomClose
                className="size-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <DialogTitle className="text-base">
              {t2("windowClose.message")}
            </DialogTitle>
          </div>
          <DialogDescription className="whitespace-pre-line text-sm/relaxed">
            {t2("windowClose.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="window-close-remember"
            className="hilo-checkbox-label flex w-fit cursor-pointer items-center text-sm"
          >
            <Checkbox
              id="window-close-remember"
              checked={remember}
              onCheckedChange={setRemember}
              disabled={busy}
              data-action-ui-id="window-close-remember"
            />
            {t2("windowClose.dontShowAgain")}
          </label>
          <p className="pl-8 text-xs text-muted-foreground pointer-coarse:pl-11">
            {t2("windowClose.settingsHint")}
          </p>
          {failed && (
            <p role="alert" className="text-xs text-destructive">
              {t2("windowClose.failed")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button$1
            ref={cancelRef}
            variant="ghost"
            size="lg"
            className="mr-auto px-3"
            disabled={busy}
            onClick={() => void handleChoose("cancel")}
            data-action-ui-id="window-close-cancel"
          >
            {t2("windowClose.cancel")}
          </Button$1>
          <Button$1
            variant="outline"
            size="lg"
            className="min-w-20 px-4"
            disabled={busy}
            onClick={() => void handleChoose("quit")}
            data-action-ui-id="window-close-quit"
          >
            {t2("windowClose.quit")}
          </Button$1>
          <Button$1
            size="lg"
            className="px-4"
            disabled={busy}
            onClick={() => void handleChoose("tray")}
            data-action-ui-id="window-close-tray"
          >
            {t2("windowClose.tray")}
          </Button$1>
        </div>
      </DialogContent>
    </Dialog>
  );
}
