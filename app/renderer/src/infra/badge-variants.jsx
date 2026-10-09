// badge-variants.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, cn$2 } from "./dialog-content.jsx";
import {
  cva,
  DialogBackdrop,
  DialogClose$1,
  DialogDescription$2,
  DialogPopup,
  DialogTitle$2,
  mergeProps$1,
  useRender,
} from "../vendor.js";
import { AlertDialogPortal } from "../assets/credit-query-keys.jsx";

export function DialogTitle({ className, ...props }) {
  return (
    <DialogTitle$2
      data-slot="dialog-title"
      className={cn$2("font-heading text-sm font-medium", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <DialogDescription$2
      data-slot="dialog-description"
      className={cn$2(
        "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn$2(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogOverlay({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="alert-dialog-overlay"
      className={cn$2(
        "modal-mask fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  size: size2 = "default",
  layer: layer2 = "default",
  ...props
}) {
  const layerClassName = layer2 === "nested" ? "z-[60]" : "z-50";
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay
        forceRender={layer2 === "nested"}
        className={layerClassName}
      />
      <DialogPopup
        data-slot="alert-dialog-content"
        data-size={size2}
        className={cn$2(
          "elevated-surface-border group/alert-dialog-content fixed top-1/2 left-1/2 grid w-full -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-popover p-6 text-popover-foreground shadow-xl duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          layerClassName,
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn$2(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn$2(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }) {
  return (
    <DialogTitle$2
      data-slot="alert-dialog-title"
      className={cn$2(
        "text-lg font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogDescription({ className, ...props }) {
  return (
    <DialogDescription$2
      data-slot="alert-dialog-description"
      className={cn$2(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogAction({ className, ...props }) {
  return (
    <Button$1
      data-slot="alert-dialog-action"
      className={cn$2(className)}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  variant = "outline",
  size: size2 = "default",
  ...props
}) {
  return (
    <DialogClose$1
      data-slot="alert-dialog-cancel"
      className={cn$2(className)}
      render={<Button$1 variant={variant} size={size2} />}
      {...props}
    />
  );
}

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-success/10 text-success focus-visible:ring-success/20 dark:bg-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20",
        info: "bg-info/10 text-info focus-visible:ring-info/20 dark:bg-info/20 dark:focus-visible:ring-info/40 [a]:hover:bg-info/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant = "default",
  render: render2,
  ...props
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps$1(
      {
        className: cn$2(
          badgeVariants({
            variant,
          }),
          className,
        ),
      },
      props,
    ),
    render: render2,
    state: {
      slot: "badge",
      variant,
    },
  });
}
