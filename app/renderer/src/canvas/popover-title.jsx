// popover-title.jsx
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { SegmentedSwitch as BaseSegmentedSwitch } from "../generation/segmented-switch.jsx";
import { Popover as BaseUiPopover } from "@base-ui/react/popover";
const BasePopoverTitle = BaseUiPopover.Title;
const BasePopoverDescription = BaseUiPopover.Description;
export function PopoverTitle({ className, ...props }) {
  return (
    <BasePopoverTitle
      data-slot="popover-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}
export function PopoverDescription({ className, ...props }) {
  return (
    <BasePopoverDescription
      data-slot="popover-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function SegmentedSwitch(props) {
  return (
    <BaseSegmentedSwitch
      {...props}
      renderTooltip={(button, content) => (
        <Tooltip key={button.key}>
          <TooltipTrigger render={button} />
          <TooltipContent side="bottom">{content}</TooltipContent>
        </Tooltip>
      )}
    />
  );
}
