// popover-title.jsx
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { SegmentedSwitch as BaseSegmentedSwitch } from "../generation/segmented-switch.jsx";
import {
  reactExports,
  useBaseUiId,
  useIsoLayoutEffect,
  usePopoverRootContext,
  useRenderElement,
} from "../vendor.js";
const BasePopoverTitle = reactExports.forwardRef(
  function PopoverTitle(componentProps, forwardedRef) {
    const { render, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("titleElementId", id);
      return () => {
        store.set("titleElementId", void 0);
      };
    }, [store, id]);
    const element = useRenderElement("h2", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id,
        },
        elementProps,
      ],
    });
    return element;
  },
);
const BasePopoverDescription = reactExports.forwardRef(
  function PopoverDescription(componentProps, forwardedRef) {
    const { render, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("descriptionElementId", id);
      return () => {
        store.set("descriptionElementId", void 0);
      };
    }, [store, id]);
    const element = useRenderElement("p", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id,
        },
        elementProps,
      ],
    });
    return element;
  },
);
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
