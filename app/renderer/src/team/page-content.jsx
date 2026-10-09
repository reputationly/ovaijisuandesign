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
export function Page({ open, onOpenChange, children: children2 }) {
  const navigation2 = reactExports.useContext(TeamDialogNavigationContext);
  const closeRef = reactExports.useRef(onOpenChange);
  closeRef.current = onOpenChange;
  reactExports.useEffect(() => {
    if (!open || !navigation2) return;
    const close2 = () => closeRef.current(false);
    navigation2.current = close2;
    return () => {
      if (navigation2.current === close2) navigation2.current = null;
    };
  }, [open, navigation2]);
  if (!open) return null;
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      {children2}
    </Dialog>
  );
}
export function PageContent({ children: children2, className, ...props }) {
  const focusRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const previous2 = document.activeElement;
    focusRef.current?.focus();
    return () => {
      if (previous2 instanceof HTMLElement && previous2.isConnected)
        previous2.focus();
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
      {children2}
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
