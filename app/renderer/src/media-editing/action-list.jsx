// 操作列表的面板、条目、分隔线，内部用已安装的 `@base-ui/react/use-render`。
import { useRender } from "@base-ui/react/use-render";
import clsx from "clsx";

export function ActionListPanel({
  render: render2,
  ref,
  className,
  ...props
}) {
  return useRender({
    defaultTagName: "div",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        "data-slot": "action-list-panel"
      }),
      "data-action-list-part": "panel",
      ...props,
      className: clsx("action-list-menu", className)
    }
  });
}
export function ActionListItem({
  render: render2,
  ref,
  className,
  variant = "default",
  ...props
}) {
  return useRender({
    defaultTagName: "button",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        type: "button"
      }),
      ...(!render2 && {
        "data-slot": "action-list-item"
      }),
      "data-action-list-part": "item",
      "data-variant": variant,
      ...props,
      className: clsx("action-list-item", className)
    }
  });
}
export function ActionListSeparator({
  render: render2,
  ref,
  className,
  ...props
}) {
  return useRender({
    defaultTagName: "hr",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        "data-slot": "action-list-separator"
      }),
      "data-action-list-part": "separator",
      ...props,
      className: clsx("action-list-separator", className)
    }
  });
}
