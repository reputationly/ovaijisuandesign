import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import type { ComponentProps } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib"
import { Button } from "./button"

/** 弹窗右上角关闭按钮、设置页关闭按钮共用的外观 */
export const dialogChromeButtonClassName =
  "rounded-lg text-foreground/55 hover:bg-muted hover:text-foreground focus-visible:border-brand-accent/30 focus-visible:bg-brand-accent/5 focus-visible:ring-0 focus-visible:shadow-none"

const SIZE = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[760px]",
  xl: "sm:max-w-[960px]",
} as const

// 嵌套弹窗要压在父弹窗之上
const LAYER = { default: "z-50", nested: "z-[60]" } as const

export const Dialog = (props: ComponentProps<typeof BaseDialog.Root>) => <BaseDialog.Root data-slot="dialog" {...props} />
export const DialogTrigger = (props: ComponentProps<typeof BaseDialog.Trigger>) => (
  <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />
)
export const DialogPortal = (props: ComponentProps<typeof BaseDialog.Portal>) => (
  <BaseDialog.Portal data-slot="dialog-portal" {...props} />
)
export const DialogClose = (props: ComponentProps<typeof BaseDialog.Close>) => (
  <BaseDialog.Close data-slot="dialog-close" {...props} />
)

export function DialogOverlay({ className, ...rest }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "modal-mask no-drag fixed inset-0 isolate z-50 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...rest}
    />
  )
}

type ContentProps = ComponentProps<typeof BaseDialog.Popup> & {
  showCloseButton?: boolean
  size?: keyof typeof SIZE
  layer?: keyof typeof LAYER
  overlayClassName?: string
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "sm",
  layer = "default",
  overlayClassName,
  ...rest
}: ContentProps) {
  const { t } = useTranslation()
  return (
    <DialogPortal>
      <DialogOverlay className={cn(LAYER[layer], overlayClassName)} />
      <BaseDialog.Popup
        data-slot="dialog-content"
        className={cn(
          "elevated-surface-border no-drag fixed top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          LAYER[layer],
          SIZE[size],
          className,
        )}
        {...rest}
      >
        {children}
        {showCloseButton ? (
          <BaseDialog.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className={cn("no-drag absolute top-2 right-2 size-11", dialogChromeButtonClassName)} />}
          >
            <X className="size-6" strokeWidth={1.75} />
            <span className="sr-only">{t("common.close")}</span>
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </DialogPortal>
  )
}

export const DialogHeader = ({ className, ...rest }: ComponentProps<"div">) => (
  <div data-slot="dialog-header" className={cn("flex flex-col gap-1 text-left", className)} {...rest} />
)

export const DialogFooter = ({ className, ...rest }: ComponentProps<"div">) => (
  <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...rest} />
)

export const DialogTitle = ({ className, ...rest }: ComponentProps<typeof BaseDialog.Title>) => (
  <BaseDialog.Title data-slot="dialog-title" className={cn("font-heading text-sm font-medium", className)} {...rest} />
)

export const DialogDescription = ({ className, ...rest }: ComponentProps<typeof BaseDialog.Description>) => (
  <BaseDialog.Description
    data-slot="dialog-description"
    className={cn(
      "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
      className,
    )}
    {...rest}
  />
)
