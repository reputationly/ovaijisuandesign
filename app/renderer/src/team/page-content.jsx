// page-content.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import {
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { reactExports } from "../vendor.js";
export const TeamDialogNavigationContext = reactExports.createContext(null);
export function Page({ open, onOpenChange, children }) {
  const dialogNavigation = reactExports.useContext(TeamDialogNavigationContext);
  const closeRef = reactExports.useRef(onOpenChange);
  closeRef.current = onOpenChange;
  reactExports.useEffect(() => {
    if (!open || !dialogNavigation) return;
    const handleClose = () => closeRef.current(false);
    dialogNavigation.current = handleClose;
    return () => {
      if (dialogNavigation.current === handleClose) dialogNavigation.current = null;
    };
  }, [open, dialogNavigation]);
  if (!open) return null;
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}
export function PageContent({ children, className, ...props }) {
  const focusRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const previous = document.activeElement;
    focusRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <DialogContent
      ref={focusRef}
      layer="nested"
      size="lg"
      {...props}
      className={cn(
        "flex max-h-[calc(100dvh-3rem)] min-h-0 flex-col gap-4 overflow-y-auto p-6",
        className,
      )}
    >
      {children}
    </DialogContent>
  );
}
export function PageTitle({ className, ...props }) {
  return (
    <DialogTitle
      {...props}
      className={cn("font-heading text-lg font-medium", className)}
    />
  );
}
export function PageDescription({ className, ...props }) {
  return <DialogDescription {...props} className={className} />;
}
export function PageHeader({ className, ...props }) {
  return <DialogHeader {...props} className={className} />;
}
export function PageFooter({ className, ...props }) {
  return <DialogFooter {...props} className={className} />;
}
