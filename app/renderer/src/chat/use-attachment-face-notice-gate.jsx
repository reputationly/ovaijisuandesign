// use-attachment-face-notice-gate.jsx
import { reactExports, useStorage, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
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

function AttachmentFaceNoticeDialog({
  open,
  confirming,
  onOpenChange,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-action-ui-id="attachment-face-notice.dialog"
        className="max-h-[60vh] !max-w-[calc(100%-2rem)] gap-4 p-4 text-xs/relaxed sm:!max-w-2xl"
      >
        <AlertDialogHeader className="min-h-0 place-items-stretch gap-4 text-left">
          <AlertDialogTitle className="font-heading text-sm font-medium">
            {t2("attachmentFaceNotice.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="scrollbar-fade max-h-[calc(60vh-8rem)] overflow-y-auto overscroll-none whitespace-pre-line pr-2 text-left text-wrap text-xs/relaxed text-muted-foreground [contain:paint] [scrollbar-gutter:stable] [will-change:scroll-position]">
            {t2("attachmentFaceNotice.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            type="button"
            disabled={confirming}
            data-action-ui-id="attachment-face-notice.cancel"
          >
            {t2("attachmentFaceNotice.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            loading={confirming}
            onClick={onConfirm}
            data-action-ui-id="attachment-face-notice.confirm"
          >
            {t2("attachmentFaceNotice.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useAttachmentFaceNoticeGate(openFilePicker) {
  const [config2, , setConfigAsync, hydrated] = useStorage("global.config");
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [confirming, setConfirming] = reactExports.useState(false);
  const pendingRequestRef = reactExports.useRef(false);
  const confirmingRef = reactExports.useRef(false);
  const requestAttachmentPicker = reactExports.useCallback(() => {
    if (config2.attachmentFaceNoticeAccepted) {
      openFilePicker();
      return;
    }
    pendingRequestRef.current = true;
    if (hydrated) setDialogOpen(true);
  }, [config2.attachmentFaceNoticeAccepted, hydrated, openFilePicker]);
  reactExports.useEffect(() => {
    if (!hydrated || !pendingRequestRef.current || dialogOpen) return;
    if (config2.attachmentFaceNoticeAccepted) {
      pendingRequestRef.current = false;
      openFilePicker();
      return;
    }
    setDialogOpen(true);
  }, [
    config2.attachmentFaceNoticeAccepted,
    dialogOpen,
    hydrated,
    openFilePicker,
  ]);
  const handleOpenChange = reactExports.useCallback((open) => {
    if (!open) pendingRequestRef.current = false;
    setDialogOpen(open);
  }, []);
  const handleConfirm = reactExports.useCallback(async () => {
    if (confirmingRef.current || !pendingRequestRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    const persisted = await setConfigAsync((current2) => ({
      ...current2,
      attachmentFaceNoticeAccepted: true,
    }));
    if (persisted && pendingRequestRef.current) {
      pendingRequestRef.current = false;
      setDialogOpen(false);
      openFilePicker();
    }
    confirmingRef.current = false;
    setConfirming(false);
  }, [openFilePicker, setConfigAsync]);
  return {
    requestAttachmentPicker,
    attachmentFaceNoticeDialog: (
      <AttachmentFaceNoticeDialog
        open={dialogOpen}
        confirming={confirming}
        onOpenChange={handleOpenChange}
        onConfirm={() => void handleConfirm()}
      />
    ),
  };
}
