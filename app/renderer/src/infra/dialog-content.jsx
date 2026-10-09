// dialog-content.jsx
import {
  AlertDialogRoot,
  Button$3,
  Check,
  clsx,
  createTailwindMerge,
  cva,
  DialogBackdrop,
  DialogClose$1,
  DialogPopup,
  DialogRoot,
  FieldControl,
  Loader2Icon,
  MenuGroupLabel,
  MenuItem$3,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuTrigger,
  reactExports,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  useTranslation,
  XIcon,
} from "../vendor.js";
import { getDefaultConfig } from "tailwind-merge";
import { __jsx } from "../shared/jsx-runtime.js";
import { DialogPortal, listeners$a } from "./gateway-http-error.jsx";

const subscribe = (listener) => {
  listeners$a.add(listener);
  return () => listeners$a.delete(listener);
};

export const twMerge = createTailwindMerge(getDefaultConfig);

export function cn$5(...inputs) {
  return twMerge(clsx(inputs));
}

export function splitMentionFilename(filename) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 <= 0 || dot2 >= filename.length - 1)
    return {
      stem: filename,
      ext: "",
    };
  return {
    stem: filename.slice(0, dot2),
    ext: filename.slice(dot2),
  };
}

export const Input$2 = reactExports.forwardRef(
  function Input2(props, forwardedRef) {
    return <FieldControl ref={forwardedRef} {...props} />;
  },
);

export function cn$2(...inputs) {
  return twMerge(clsx(inputs));
}

export const MENU_ITEM_LAYOUT =
  "gap-2 px-2.5 py-1.5 text-[11px] font-normal [&_svg:not([class*=size-])]:size-3.5";

const MENU_LABEL_LAYOUT =
  "px-2.5 py-1 text-[10px] font-normal text-muted-foreground select-none";

export function DropdownMenuTrigger({ className, ...props }) {
  return (
    <MenuTrigger
      data-slot="dropdown-menu-trigger"
      className={cn$2("select-none outline-none", className)}
      {...props}
    />
  );
}

export function DropdownMenuContent({
  className,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 2,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="dropdown-menu-content"
          className={cn$2(
            "elevated-surface-border z-50 max-h-(--available-height) min-w-28 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            motion !== "none" && "dp-motion-quick-zoom",
            className,
          )}
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}

export function DropdownMenuItem({ className, variant = "default", ...props }) {
  return (
    <MenuItem$3
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn$2(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area relative flex cursor-default items-center rounded-sm whitespace-nowrap outline-hidden select-none hover:bg-popup-item-hover hover:text-foreground focus:bg-popup-item-hover focus:text-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:hover:bg-destructive/10 data-[variant=destructive]:hover:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-colors duration-[80ms]",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }) {
  return (
    <MenuGroupLabel
      data-slot="dropdown-menu-label"
      className={cn$2(MENU_LABEL_LAYOUT, className)}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children: children2,
  closeOnClick = true,
  ...props
}) {
  return (
    <MenuRadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn$2(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area relative flex cursor-default items-center rounded-sm pr-7 outline-hidden select-none hover:bg-popup-item-hover hover:text-foreground focus:bg-popup-item-hover focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-colors duration-[80ms]",
        className,
      )}
      closeOnClick={closeOnClick}
      {...props}
    >
      {children2}
      <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
        <MenuRadioItemIndicator>
          <Check className="size-3" strokeWidth={1.75} />
        </MenuRadioItemIndicator>
      </span>
    </MenuRadioItem>
  );
}

export function TooltipContent({
  className,
  positionerClassName,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children: children2,
  ...props
}) {
  return (
    <TooltipPortal>
      <TooltipPositioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={cn$2(
          "pointer-events-none isolate z-[100]",
          positionerClassName,
        )}
      >
        <TooltipPopup
          data-slot="tooltip-content"
          className={cn$2(
            "dp-motion-quick-zoom z-[100] inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-sm bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-[100] **:data-[slot=kbd]:rounded-sm",
            className,
            "pointer-events-none select-none",
          )}
          {...props}
        >
          {children2}
        </TooltipPopup>
      </TooltipPositioner>
    </TooltipPortal>
  );
}

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    compoundVariants: [
      {
        size: ["default", "xs", "sm", "lg"],
        className: "active:not-aria-[haspopup]:translate-y-px",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button$1({
  className,
  variant = "default",
  size: size2 = "default",
  loading = false,
  disabled: disabled2,
  children: children2,
  ...props
}) {
  return (
    <Button$3
      data-slot="button"
      disabled={disabled2 || loading}
      className={cn$2(
        buttonVariants({
          variant,
          size: size2,
          className,
        }),
      )}
      {...props}
    >
      {loading && <Loader2Icon className="animate-spin" />}
      {children2}
    </Button$3>
  );
}

const notify = () => {
  for (const listener of listeners$a) listener();
};

let preparePreview = null;

export function registerBrowserHoverPreview(prepare) {
  const lifetime = new AbortController();
  const handler = (signal, options) =>
    prepare(AbortSignal.any([signal, lifetime.signal]), options);
  preparePreview = handler;
  notify();
  return () => {
    lifetime.abort();
    if (preparePreview !== handler) return;
    preparePreview = null;
    notify();
  };
}

const getPreview = () => preparePreview;

export function useBrowserHoverPreview(
  requested,
  { requireSnapshot = false, onError } = {},
) {
  const prepare = reactExports.useSyncExternalStore(
    subscribe,
    getPreview,
    () => null,
  );
  const request = reactExports.useMemo(
    () => ({
      requested,
      prepare,
      requireSnapshot,
    }),
    [requested, prepare, requireSnapshot],
  );
  const [prepared, setPrepared] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!request.requested || !request.prepare) return;
    const controller = new AbortController();
    void request
      .prepare(controller.signal, {
        requireSnapshot: request.requireSnapshot,
      })
      .then(
        () => {
          if (!controller.signal.aborted) setPrepared(request);
        },
        (error) => {
          if (!controller.signal.aborted) {
            console.error(
              "[browser-hover-snapshot] Failed to prepare native view",
              error,
            );
            onError?.();
          }
        },
      );
    return () => controller.abort();
  }, [request, onError]);
  return !requested || !prepare || prepared === request;
}

export function useBrowserOverlayDialogProps(
  props,
  browserPreviewManaged = false,
) {
  const [uncontrolledOpen, setUncontrolledOpen] = reactExports.useState(
    props.defaultOpen ?? false,
  );
  const requested = props.open ?? uncontrolledOpen;
  const [visible, setVisible] = reactExports.useState(false);
  const ready = useBrowserHoverPreview(
    !browserPreviewManaged && (requested || visible),
  );
  const open = requested && ready;
  reactExports.useLayoutEffect(() => {
    if (open) setVisible(true);
  }, [open]);
  return {
    ...props,
    defaultOpen: void 0,
    open,
    onOpenChange(next2, details) {
      props.onOpenChange?.(next2, details);
      if (!details.isCanceled) setUncontrolledOpen(next2);
    },
    onOpenChangeComplete(next2) {
      if (!next2) setVisible(false);
      props.onOpenChangeComplete?.(next2);
    },
  };
}

export const dialogChromeButtonClassName =
  "rounded-lg text-foreground/55 hover:bg-muted hover:text-foreground focus-visible:border-brand-accent/30 focus-visible:bg-brand-accent/5 focus-visible:ring-0 focus-visible:shadow-none";

const DIALOG_CONTENT_SIZE_CLASSES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[760px]",
  xl: "sm:max-w-[960px]",
};

const DIALOG_CONTENT_LAYER_CLASSES = {
  default: "z-50",
  nested: "z-[60]",
};

export function Dialog({ browserPreviewManaged = false, ...props }) {
  const dialogProps = useBrowserOverlayDialogProps(
    props,
    browserPreviewManaged,
  );
  return <DialogRoot data-slot="dialog" {...dialogProps} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogBackdrop
      data-slot="dialog-overlay"
      className={cn$2(
        "modal-mask no-drag fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children: children2,
  showCloseButton = true,
  size: size2 = "sm",
  layer: layer2 = "default",
  portalContainer,
  overlayClassName,
  ...props
}) {
  const { t: t2 } = useTranslation();
  return (
    <DialogPortal container={portalContainer ?? void 0}>
      <DialogOverlay
        forceRender={layer2 === "nested"}
        className={cn$2(DIALOG_CONTENT_LAYER_CLASSES[layer2], overlayClassName)}
      />
      <DialogPopup
        data-slot="dialog-content"
        className={cn$2(
          "elevated-surface-border no-drag fixed top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          DIALOG_CONTENT_LAYER_CLASSES[layer2],
          DIALOG_CONTENT_SIZE_CLASSES[size2],
          className,
        )}
        {...props}
      >
        {children2}
        {showCloseButton && (
          <DialogClose$1
            data-slot="dialog-close"
            render={
              <Button$1
                variant="ghost"
                className={`no-drag absolute top-2 right-2 size-11 ${dialogChromeButtonClassName}`}
              />
            }
          >
            <XIcon className="size-6" strokeWidth={1.75} />
            <span className="sr-only">{t2("common.close")}</span>
          </DialogClose$1>
        )}
      </DialogPopup>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn$2("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  showCloseButton = false,
  children: children2,
  ...props
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      data-slot="dialog-footer"
      className={cn$2(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children2}
      {showCloseButton && (
        <DialogClose$1 render={<Button$1 variant="outline" />}>
          {t2("common.close")}
        </DialogClose$1>
      )}
    </div>
  );
}

export function AlertDialog({ ...props }) {
  return (
    <AlertDialogRoot
      data-slot="alert-dialog"
      {...useBrowserOverlayDialogProps(props)}
    />
  );
}
