import { PreviewCardPopup, PreviewCardPortal, PreviewCardPositioner } from "../infra/base-ui.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function PreviewCardContent({
  className,
  side = "right",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  collisionPadding,
  anchor: anchor2,
  positionerClassName,
  portalContainer,
  children: children2,
  ...props
}) {
  return <PreviewCardPortal container={portalContainer ?? void 0}>
      <PreviewCardPositioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} collisionPadding={collisionPadding} anchor={anchor2} className={cn$5("isolate z-50", positionerClassName)}>
        <PreviewCardPopup data-slot="preview-card-content" className={cn$5(
      // Layout: fixed-width card. Height is content-driven and
      // uncapped — media previews constrain themselves and metadata
      // tables are short, so a hard max-height + scroll just gets in
      // the way. If a future preview type needs scrolling, gate it
      // locally within that preview's body.
      "z-50 w-[260px] origin-(--transform-origin) rounded-lg border border-border bg-card text-card-foreground shadow-lg outline-none",
      // Animation: fade only — no zoom or slide so the card appears
      // in place without flying in from the anchor side.
      "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className)} {...props}>
          {children2}
        </PreviewCardPopup>
      </PreviewCardPositioner>
    </PreviewCardPortal>;
}