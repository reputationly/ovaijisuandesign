// connector-dialog-frame.jsx
import { reactExports, XIcon } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DialogClose } from "../infra/gateway-http-error.jsx";
import {
  Button$1,
  cn$2,
  Dialog,
  dialogChromeButtonClassName,
  DialogContent,
} from "../infra/dialog-content.jsx";

export function ConnectorDialogFrame({
  open,
  onOpenChange,
  actionUiId,
  closeLabel,
  children: children2,
  size: size2 = "md",
  className,
  stableHeight = false,
  showCloseButton = true,
  closeActionUiId,
}) {
  const dialogRef = reactExports.useRef(null);
  const previousStableHeightRef = reactExports.useRef(stableHeight);
  reactExports.useLayoutEffect(() => {
    const wasStableHeight = previousStableHeightRef.current;
    previousStableHeightRef.current = stableHeight;
    if (!open || !wasStableHeight || stableHeight) return;
    const dialog = dialogRef.current;
    if (
      !dialog ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const content2 = dialog.querySelector(
      '[data-layout-slot="connector-dialog-view"]',
    );
    const currentHeight = Math.min(window.innerHeight - 32, 700);
    dialog.style.transition = "none";
    dialog.style.height = `${currentHeight}px`;
    dialog.getBoundingClientRect();
    dialog.style.transition = "";
    if (content2) {
      content2.style.opacity = "0.94";
      content2.style.transform = "translateX(0.25rem)";
    }
    let settleTimer = 0;
    let cleanupTimer = 0;
    let animationFrame = 0;
    let contentAnimation;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      observer2.disconnect();
      window.clearTimeout(settleTimer);
      window.clearTimeout(cleanupTimer);
      dialog.style.height = "";
      if (content2) {
        content2.style.opacity = "";
        content2.style.transform = "";
      }
      contentAnimation?.cancel();
    };
    const handleTransitionEnd = (event) => {
      if (event.target === dialog && event.propertyName === "height") finish();
    };
    const beginAnimation = () => {
      const startHeight = dialog.getBoundingClientRect().height;
      dialog.style.transition = "none";
      dialog.style.height = "";
      const targetHeight = dialog.getBoundingClientRect().height;
      dialog.style.height = `${startHeight}px`;
      dialog.getBoundingClientRect();
      dialog.style.transition = "";
      if (targetHeight <= 0) {
        finish();
        return;
      }
      observer2.disconnect();
      animationFrame = window.requestAnimationFrame(() => {
        if (Math.abs(startHeight - targetHeight) >= 1)
          dialog.style.height = `${targetHeight}px`;
        if (content2?.animate) {
          contentAnimation = content2.animate(
            [
              {
                opacity: 0.94,
                transform: "translateX(0.25rem)",
              },
              {
                opacity: 1,
                transform: "translateX(0)",
              },
            ],
            {
              duration: 200,
              easing: "cubic-bezier(0, 0, 0.2, 1)",
              fill: "forwards",
            },
          );
        }
        cleanupTimer = window.setTimeout(finish, 240);
      });
    };
    const scheduleAnimation = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(beginAnimation, 80);
    };
    const observer2 = new MutationObserver(scheduleAnimation);
    dialog.addEventListener("transitionend", handleTransitionEnd);
    observer2.observe(dialog, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    scheduleAnimation();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(cleanupTimer);
      observer2.disconnect();
      dialog.removeEventListener("transitionend", handleTransitionEnd);
      dialog.style.transition = "";
      dialog.style.height = "";
      if (content2) {
        content2.style.opacity = "";
        content2.style.transform = "";
      }
      contentAnimation?.cancel();
    };
  }, [open, stableHeight]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        size={size2}
        showCloseButton={false}
        className={cn$2(
          "flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 motion-safe:transition-[height] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none [&_[data-slot=dialog-close]]:size-8! [&_[data-slot=dialog-close]_svg]:size-[18px]!",
          stableHeight ? "h-[calc(100vh-2rem)] max-h-[700px]" : "h-auto",
          className,
        )}
        data-action-ui-id={actionUiId}
        data-layout-slot="connector-dialog-frame"
      >
        {children2}
        {showCloseButton ? (
          <DialogClose
            render={
              <Button$1
                variant="ghost"
                className={`no-drag absolute top-2 right-2 size-8 ${dialogChromeButtonClassName}`}
                data-action-ui-id={closeActionUiId}
              />
            }
          >
            <XIcon className="size-[18px]" strokeWidth={1.75} />
            <span className="sr-only">{closeLabel}</span>
          </DialogClose>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
