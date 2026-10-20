/**
 * EditorInterface 用到的 6 个 UI 声明（第 271 轮）。
 * 它们是参照 bundle 的顶层声明，按声明边界取回。偏移是 UTF-16 码元。
 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { AnimatePresence, motion } from "framer-motion";
import { cn as cn$2, cn as cn$5 } from "../canvas-v3/main-exports.js";
import { MENU_ITEM_LAYOUT } from "../chat/menu-item-layout.jsx";
import { Slider as Slider$1 } from "../generation/slider.jsx";
import { MenuSubmenuTrigger } from "../infra/base-ui.js";
import { ChevronRightIcon } from "../media-editing/lucide-icon-wraps.js";
import { ContextMenuContent as ContextMenuContent$1 } from "../workspace/context-menu-content.jsx";
import { CollapsibleContent as CollapsibleContent$1, CollapsibleTrigger as CollapsibleTrigger$1 } from "./editor-ui.js";

// CollapsibleContext / Label2$1 在树里没有，用最小等价实现
const CollapsibleContext = reactExports.createContext(false);
const Label2$1 = ({ children }) => jsxRuntimeExports.jsx("span", { className: "text-xs font-medium", children });

export const LabeledSlider = reactExports.forwardRef(
  ({ label, value, onChange, min: min2 = 0, max: max2 = 100, step = 1, unit: unit2 = "", defaultValue: defaultValue2, className }, ref) => {
    const displayValue = step < 1 ? value.toFixed(1) : Math.round(value);
    const [editing, setEditing] = reactExports.useState(false);
    const [draft, setDraft] = reactExports.useState("");
    const clickTimer = reactExports.useRef(null);
    const enterEdit = () => {
      setDraft(String(value));
      setEditing(true);
    };
    const clamp2 = (n2) => Math.min(max2, Math.max(min2, n2));
    const commit = () => {
      const parsed = parseFloat(draft);
      if (!Number.isNaN(parsed)) onChange(clamp2(parsed));
      setEditing(false);
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: cn$2("space-y-1", className), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-text-secondary", children: label }),
        editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            autoFocus: true,
            type: "number",
            value: draft,
            onChange: (e2) => setDraft(e2.target.value),
            onBlur: commit,
            onKeyDown: (e2) => {
              if (e2.key === "Enter") commit();
              if (e2.key === "Escape") setEditing(false);
            },
            className: "w-14 text-[10px] font-mono text-text-primary bg-background-tertiary px-1 py-0.5 rounded border border-border text-right"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            role: "button",
            tabIndex: 0,
            title: defaultValue2 !== void 0 ? "Click to edit, double-click to reset" : "Click to edit",
            onClick: () => {
              if (defaultValue2 === void 0) {
                enterEdit();
                return;
              }
              if (clickTimer.current) clearTimeout(clickTimer.current);
              clickTimer.current = setTimeout(() => {
                enterEdit();
                clickTimer.current = null;
              }, 200);
            },
            onDoubleClick: () => {
              if (defaultValue2 === void 0) return;
              if (clickTimer.current) {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
              }
              onChange(defaultValue2);
            },
            className: "text-[10px] font-mono text-text-primary bg-background-tertiary px-1.5 py-0.5 rounded border border-border cursor-text select-none",
            children: [
              displayValue,
              unit2
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Slider$1,
        {
          value: [value],
          onValueChange: (values2) => onChange(values2[0]),
          min: min2,
          max: max2,
          step,
          className: "h-1.5"
        }
      )
    ] });
  }
);

export const CollapsibleTrigger = CollapsibleTrigger$1;

export const CollapsibleContent = reactExports.forwardRef(({ className, children: children2, ...props }, ref) => {
  const { open } = reactExports.useContext(CollapsibleContext);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { initial: false, children: open && /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContent$1, { forceMount: true, asChild: true, ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      ref,
      initial: { height: 0, opacity: 0 },
      animate: { height: "auto", opacity: 1 },
      exit: { height: 0, opacity: 0 },
      transition: {
        height: { type: "spring", stiffness: 500, damping: 40 },
        opacity: { duration: 0.15 }
      },
      className: cn$2("overflow-hidden", className),
      children: children2
    }
  ) }) });
});

export const ContextMenuLabel = reactExports.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Label2$1,
  {
    ref,
    className: cn$2(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    ),
    ...props
  }
));

export function ContextMenuSubTrigger({
  className,
  inset,
  children: children2,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    MenuSubmenuTrigger,
    {
      "data-slot": "context-menu-sub-trigger",
      "data-inset": inset,
      className: cn$5(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-open:bg-popup-item-active data-open:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      ),
      ...props,
      children: [
        children2,
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRightIcon, { className: "ml-auto" })
      ]
    }
  );
}

export function ContextMenuSubContent({ ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ContextMenuContent$1,
    {
      "data-slot": "context-menu-sub-content",
      className: "shadow-lg",
      side: "right",
      ...props
    }
  );
}
