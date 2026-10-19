/**
 * 画布区域的加载态。
 *
 * `CanvasLoadingPresenceContext` 是给**外层**用的：加载态自己挂上去、卸载时摘掉，
 * 外层据此知道「现在画布在加载」——侧栏要隐藏一些操作，避免用户对着空画布点。
 * 计数而不是布尔值，是因为画布里可能同时有好几个区域在加载。
 */
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { mergeTailwindClasses as cn$5 } from "../infra/dialog-content.jsx";
import { WorkspaceLoadingDotField } from "./symbols.jsx";
import { MascotLoadingAnimation } from "./mascot-loading-animation.jsx";

const CanvasLoadingPresenceContext = reactExports.createContext(null);

function CanvasLoadingState({ label, className }) {
  const reportPresence = reactExports.useContext(CanvasLoadingPresenceContext);
  reactExports.useLayoutEffect(() => {
    if (!reportPresence) return;
    reportPresence(1);
    return () => reportPresence(-1);
  }, [reportPresence]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn$5(
        "pointer-events-none flex size-full items-center justify-center overflow-hidden bg-background",
        className
      ),
      "data-action-ui-id": "canvas.restoring",
      role: "status",
      "aria-label": label,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 flex flex-col items-center gap-4 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workspace-loading-mascot-anchor", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceLoadingDotField, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MascotLoadingAnimation, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: label })
      ] })
    }
  );
}

export { CanvasLoadingPresenceContext, CanvasLoadingState };
