/**
 * StructureDisclosure（4.0.3 新增）：带标题与箭头的折叠区块。
 *
 * 移植自参照 index-B3Ss5vz1.js 第 405366~405413 行。
 * 它自己不管动画，只负责「标题 + 箭头 + 内容」的结构与受控/非受控切换，
 * 动画交给 CollapsiblePresence（keepMounted 默认 true，收起后仍留在 DOM 里）。
 *
 * 适配：参照里 ChevronRight$3 是 lucide-react 的图标（rollup 改名），这里直接引 lucide。
 */

import { ChevronRight } from "lucide-react";
import reactExports from "react";

import { __jsx } from "../shared/jsx-runtime.js";
import { CollapsiblePresence } from "../media-editing/collapsible-presence.js";

export function StructureDisclosure({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  title,
  children,
  className,
  contentClassName,
  triggerClassName,
  triggerProps,
  keepMounted = true,
  actions,
  "data-action-ui-id": actionId,
}) {
  const [localOpen, setLocalOpen] = reactExports.useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const id = reactExports.useId();

  return __jsx(
    "div",
    { className, "data-action-ui-id": actionId },
    __jsx(
      "button",
      {
        ...triggerProps,
        type: "button",
        "aria-expanded": open,
        "aria-controls": id,
        className: `w-full text-left ${triggerClassName ?? ""}`,
        onClick: () => {
          if (controlledOpen === undefined) setLocalOpen(!open);
          onOpenChange?.(!open);
        },
      },
      __jsx(ChevronRight, {
        "aria-hidden": true,
        size: 12,
        strokeWidth: 2,
        className: `mr-1 inline-block align-middle transition-transform ease-(--disclosure-ease) motion-reduce:transition-none ${
          open
            ? "rotate-90 duration-(--disclosure-enter-duration)"
            : "rotate-0 duration-(--disclosure-exit-duration)"
        }`,
      }),
      title,
    ),
    actions,
    __jsx(CollapsiblePresence, {
      open,
      keepMounted,
      children: __jsx("div", { id, className: contentClassName }, children),
    }),
  );
}
