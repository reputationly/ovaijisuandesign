// popover-title.jsx
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { SegmentedSwitch as SegmentedSwitch$1 } from "../generation/segmented-switch.jsx";
import {
  reactExports,
  useBaseUiId,
  useIsoLayoutEffect,
  usePopoverRootContext,
  useRenderElement,
} from "../vendor.js";
const PopoverTitle$1 = reactExports.forwardRef(
  function PopoverTitle2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id2 = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("titleElementId", id2);
      return () => {
        store.set("titleElementId", void 0);
      };
    }, [store, id2]);
    const element2 = useRenderElement("h2", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id: id2,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
const PopoverDescription$1 = reactExports.forwardRef(
  function PopoverDescription2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { store } = usePopoverRootContext();
    const id2 = useBaseUiId(elementProps.id);
    useIsoLayoutEffect(() => {
      store.set("descriptionElementId", id2);
      return () => {
        store.set("descriptionElementId", void 0);
      };
    }, [store, id2]);
    const element2 = useRenderElement("p", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id: id2,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
export function PopoverTitle({ className, ...props }) {
  return (
    <PopoverTitle$1
      data-slot="popover-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}
export function PopoverDescription({ className, ...props }) {
  return (
    <PopoverDescription$1
      data-slot="popover-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
export function SegmentedSwitch(props) {
  return (
    <SegmentedSwitch$1
      {...props}
      renderTooltip={(button, content2) => (
        <Tooltip key={button.key}>
          <TooltipTrigger render={button} />
          <TooltipContent side="bottom">{content2}</TooltipContent>
        </Tooltip>
      )}
    />
  );
}
