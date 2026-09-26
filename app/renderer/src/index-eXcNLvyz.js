import { j as jsxRuntimeExports, U as Icon, V as Search, X as Input, Y as X } from "./main.jsx";
function PageSearchInput({
  value,
  onValueChange,
  placeholder,
  ariaLabel = placeholder,
  clearLabel,
  inputActionId,
  clearActionId = `${inputActionId}-clear`
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative flex h-9 w-60 max-w-full shrink-0 items-center",
      "data-slot": "page-search-input",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon,
          {
            icon: Search,
            size: "sm",
            "aria-hidden": true,
            className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value,
            onChange: (event) => onValueChange(event.target.value),
            placeholder,
            "aria-label": ariaLabel,
            className: "h-9 pl-9 pr-9",
            "data-action-ui-id": inputActionId
          }
        ),
        value ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onValueChange(""),
            "aria-label": clearLabel,
            className: "absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
            "data-action-ui-id": clearActionId,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { icon: X, size: "xs", "aria-hidden": true })
          }
        ) : null
      ]
    }
  );
}
const TAB_CONTENT_ENTER_CLASS_NAME = "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200";
export {
  PageSearchInput as P,
  TAB_CONTENT_ENTER_CLASS_NAME as T
};
