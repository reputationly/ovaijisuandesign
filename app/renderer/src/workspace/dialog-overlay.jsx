// ==== 逐文件收敛 ====

import { DialogBackdrop, DialogClose$1, DialogPopup, DialogPortal$2 } from "../infra/base-ui.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { Button as Button$2 } from "@base-ui/react";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export function DialogOverlay({
  className,
  mask: mask2 = "dim",
  ...props
}) {
  return <DialogBackdrop data-slot="dialog-overlay" data-mask={mask2} className={cn$5("modal-mask fixed inset-0 isolate z-[10000] duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)} {...props} />;
}
export function DialogContent({
  className,
  children: children2,
  showCloseButton = true,
  mask: mask2 = "dim",
  portalContainer,
  ...props
}) {
  const {
    t: t2
  } = useTranslation();
  return <DialogPortal$2 container={portalContainer}>
      <DialogOverlay$3 mask={mask2} />
      <DialogPopup data-slot="dialog-content" className={cn$5("fixed top-1/2 left-1/2 z-[10001] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)} {...props}>
        {children2}
        {showCloseButton && <DialogClose$1 data-slot="dialog-close" render={<Button$2 variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}>
            <XIcon />
            <span className="sr-only">{t2("common.close", "Close")}</span>
          </DialogClose$1>}
      </DialogPopup>
    </DialogPortal$2>;
}
export function DialogHeader({
  className,
  ...props
}) {
  return <div data-slot="dialog-header" className={cn$5("flex flex-col gap-1 text-left", className)} {...props} />;
}
export function DialogFooter({
  className,
  children: children2,
  ...props
}) {
  return <div data-slot="dialog-footer" className={cn$5("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children2}
    </div>;
}