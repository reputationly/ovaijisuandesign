/**
 * 产物里的 `PageStateView$1` —— 与我们树里的 `PageStateView` 不是同一个组件（第 108 轮）。
 */
import jsxRuntimeExports from "react/jsx-runtime";
import { Button } from "../canvas/node-shell-inner.jsx";
import { cn as cn$1 } from "../infra/dialog-content.jsx";

function PageStateView$1({
  state,
  labels,
  renderIllustration: renderIllustration2,
  children,
  className,
  density = "page"
}) {
  if (state.type === "normal") return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  const isError = state.type === "error";
  const errorReason = isError ? state.reason ?? "generic" : void 0;
  const emptyReason = state.type === "empty" ? state.reason ?? "generic" : void 0;
  const defaultText = isError ? errorReason === "network" ? labels.networkErrorText : labels.errorText : labels.emptyText;
  const hasStructuredContent = state.title != null || state.description != null;
  const inlineActions = state.actions.filter((action) => action.placement !== "separate");
  const separateActions = state.actions.filter((action) => action.placement === "separate");
  const useEqualWidthActions = inlineActions.length === 2;
  const isCompact = density === "compact";
  const isPanel = density === "panel";
  const isSmall = isPanel || isCompact;
  const illustrationClassName = isCompact ? "size-16" : state.type === "empty" ? isPanel ? "size-[88px]" : "size-[148px]" : void 0;
  const renderAction = (action) => {
    const isSeparate = action.placement === "separate";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        variant: isSeparate ? "link" : action.variant,
        disabled: action.disabled,
        loading: action.loading,
        onClick: action.onClick,
        className: cn$1(
          isSeparate ? "min-w-0 max-w-full h-auto min-h-0 rounded-none px-0 py-0 whitespace-normal text-muted-foreground" : "min-w-24 max-w-60 rounded-md px-3 h-auto min-h-8 whitespace-normal break-words text-center leading-4",
          !isSeparate && action.icon != null ? "gap-1.5" : void 0,
          useEqualWidthActions && !isSeparate ? "flex-[1_1_0%] py-1" : void 0,
          isSeparate ? "underline underline-offset-4 hover:text-foreground" : void 0
        ),
        "data-action-ui-id": `page-state-${state.type}-${action.key}`,
        children: [
          !isSeparate && action.icon != null && !action.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "flex shrink-0 items-center justify-center [&_svg]:size-3.5",
              "data-icon": "inline-start",
              "data-slot": "page-state-action-icon",
              "aria-hidden": "true",
              children: action.icon
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-slot": "page-state-action-label", children: action.label })
        ]
      },
      action.key
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn$1(
        "flex min-h-0 w-full flex-1 flex-col items-center justify-center text-center",
        isCompact ? "px-3 py-3" : isPanel ? "px-3 py-4" : "px-4 py-8",
        className
      ),
      role: isError ? "alert" : "status",
      "aria-live": isError ? "assertive" : "polite",
      "data-state": state.type,
      "data-density": density,
      "data-empty-reason": emptyReason,
      "data-error-reason": errorReason,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "flex shrink-0 items-center justify-center",
            "aria-hidden": "true",
            "data-slot": "page-state-visual",
            children: state.icon ?? renderIllustration2?.({
              type: state.type,
              emptyReason,
              errorReason,
              className: illustrationClassName
            })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn$1(
              "mt-2 flex w-full flex-col items-center gap-1",
              isSmall ? "max-w-xs" : "max-w-md"
            ),
            "data-slot": "page-state-copy",
            children: hasStructuredContent ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              state.title != null ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: cn$1(
                    isCompact ? "text-xs font-normal text-muted-foreground" : "font-heading font-medium text-card-foreground",
                    !isCompact && (isPanel ? "text-sm" : "text-base")
                  ),
                  children: state.title
                }
              ) : null,
              state.description != null ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn$1("text-muted-foreground", isSmall ? "text-xs" : "text-sm"), children: state.description }) : null
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: cn$1("text-muted-foreground", isCompact ? "text-xs font-normal" : "text-sm"),
                children: state.text ?? defaultText
              }
            )
          }
        ),
        inlineActions.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn$1(
              "flex flex-row flex-wrap items-center justify-center gap-2",
              isSmall ? "mt-3" : "mt-4",
              useEqualWidthActions ? "w-fit max-w-full" : void 0
            ),
            "data-slot": "page-state-actions",
            children: inlineActions.map(renderAction)
          }
        ) : null,
        separateActions.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn$1(
              "flex flex-row flex-wrap items-center justify-center gap-2",
              isSmall ? "mt-3" : "mt-4"
            ),
            "data-slot": "page-state-separate-actions",
            children: separateActions.map(renderAction)
          }
        ) : null,
        state.type === "empty" && !isCompact ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "h-6 w-full shrink-0",
            "aria-hidden": "true",
            "data-slot": "page-state-bottom-offset"
          }
        ) : null
      ]
    }
  );
}

export { PageStateView$1 as PageStateViewInner };
