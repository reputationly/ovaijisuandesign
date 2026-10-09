// slash-command-popover.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { SlashCommandPopoverContent } from "./slash-command-popover-content.jsx";
import { QuickZoomPresence } from "../canvas/canvas-high-blast-delete-dialog.jsx";

export function SlashCommandPopover({ open = true, ...props }) {
  return (
    <QuickZoomPresence value={open ? props : null}>
      {(retainedProps, motionProps) => (
        <SlashCommandPopoverContent
          {...retainedProps}
          motionProps={motionProps}
        />
      )}
    </QuickZoomPresence>
  );
}
