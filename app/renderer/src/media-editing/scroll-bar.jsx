// scroll-bar.jsx
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
function ScrollBar({ className, orientation = "vertical", ...props }) {
  return (
    <ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t-[var(--divider-width)] data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l-[var(--divider-width)] data-vertical:border-l-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaScrollbar>
  );
}
export function ScrollArea({ className, children: children2, ...props }) {
  return (
    <ScrollAreaRoot
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaViewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children2}
      </ScrollAreaViewport>
      <ScrollBar />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
}
export function ComponentSection({
  name: name2,
  importPath,
  description,
  children: children2,
}) {
  return (
    <section
      className="flex flex-col gap-2 rounded-lg border border-border p-2"
      data-action-ui-id={`ui-spec-section-${name2.toLowerCase()}`}
    >
      <header className="flex flex-col gap-0.5">
        <h4 className="text-xs font-heading font-medium text-foreground">
          {name2}
        </h4>
        <code
          className="text-[9px] font-mono text-muted-foreground truncate"
          title={importPath}
        >
          {importPath}
        </code>
        {description && (
          <p className="text-[10px] text-muted-foreground leading-snug">
            {description}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-2">{children2}</div>
    </section>
  );
}
export function VariantGrid({ label, children: children2 }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 items-start">{children2}</div>
    </div>
  );
}
export function Card({ className, size: size2 = "default", ...props }) {
  return (
    <div
      data-slot="card"
      data-size={size2}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-lg bg-card py-4 text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}
export function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-sm font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}
export function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}
