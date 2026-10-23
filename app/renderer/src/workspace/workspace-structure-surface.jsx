/**
 * v3 工作区的「结构表面」层（整份取回自参照 4.0.3 index-B3Ss5vz1.js:515107–515148、
 * 517659–517825、513573–513576）。
 *
 * 这组组件是 4.0.0 时代就没还原的缺口：画布外面本来还有一层
 * WorkspaceStructureSurface，负责「画布 / 列表 / 工作台」三种结构视图切换
 * （workspace.structure-views / -canvas-tab / -list-tab 三个 DOM id 的来源），
 * 以及把画布子树整体隐藏、换成结构列表或独立工作台。
 * WorkspaceTaskAcceptance 在参照里就是恒 null 的占位。
 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import { useTranslation } from "react-i18next";
import { List } from "lucide-react";
import { LayoutGrid } from "../media-editing/lucide-icon-wraps.js";
import { Button as Button$3 } from "../canvas/node-shell-inner.jsx";
import { useOptionalWorkspaceStructure } from "../canvas-v3/main-exports.js";
import { DebugPanelWorkspaceViewsContext } from "../settings/server-driven-popup-orchestrator.jsx";
import { canUseDebugTooling } from "./use-deep-link-router.js";
import {
  NativeWorkbenchHost,
  useWorkbenchIdentity,
  usesWorkspaceResourceView,
} from "./native-workbench-host.jsx";
import { useGatewayScope } from "../infra/runtime-config.js";
import { WorkspaceStructureView } from "./canvas-sidebar-overlay.jsx";

function useWorkspaceStructureSurface(
  { workspaceId, isActive, canvasOpen, editSurfaceActive, browserOpen },
  { setBrowserOpen },
) {
  const structure = useOptionalWorkspaceStructure();
  const [mode, setMode] = reactExports.useState("canvas");
  const enabled =
    structure?.architecture === "resource_v3" &&
    !usesWorkspaceResourceView(workspaceId);
  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (nextMode !== "canvas") {
      setBrowserOpen(false);
    }
  }
  const workbenchActive =
    enabled && mode === "workbench" && !editSurfaceActive && !browserOpen;
  const listActive =
    enabled && mode === "list" && !editSurfaceActive && !browserOpen;
  return {
    workbenchActive,
    listActive,
    canvasPresented: Boolean(
      isActive && canvasOpen && !browserOpen && !listActive && !workbenchActive,
    ),
    showSwitch: Boolean(
      enabled && isActive && canvasOpen && !editSurfaceActive,
    ),
    onModeChange: handleModeChange,
  };
}
function WorkspaceIndependentWorkbench({ visible = true }) {
  const { t } = useTranslation();
  const { workspaceId } = useGatewayScope();
  const identity = useWorkbenchIdentity(workspaceId);
  return identity
    ? /* @__PURE__ */ jsxRuntimeExports.jsx(NativeWorkbenchHost, {
        identityScope: identity,
        visible,
      })
    : /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
        role: "status",
        className: "p-4 text-sm text-muted-foreground",
        children: t("projectV3.accountPending"),
      });
}
function WorkspaceDebugViews({
  enabled,
  listActive,
  workbenchActive,
  onModeChange,
}) {
  const { t } = useTranslation();
  const slot = reactExports.useContext(DebugPanelWorkspaceViewsContext);
  if (!enabled || !slot) return null;
  const current = workbenchActive ? "workbench" : listActive ? "list" : "canvas";
  const modes = [
    { mode: "canvas", label: t("workspace.browser.canvas") },
    { mode: "list", label: t("workspace.structure.list") },
    { mode: "workbench", label: t("projectV3.workbench") },
  ];
  return reactDomExports.createPortal(
    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", {
      "aria-label": t("workspace.structure.views"),
      className:
        "mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background p-3",
      "data-action-ui-id": "debug.workspace.views",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
          className: "mr-auto text-sm font-medium",
          children: t("workspace.structure.views"),
        }),
        modes.map(({ mode, label }) =>
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: current === mode ? "secondary" : "outline",
              size: "sm",
              "aria-pressed": current === mode,
              "data-action-ui-id": `debug.workspace.view.${mode}`,
              onClick: () => {
                onModeChange(mode);
                slot.close();
              },
              children: label,
            },
            mode,
          ),
        ),
      ],
    }),
    slot.target,
  );
}
function WorkspaceStructureSurface({
  children,
  bottomActions,
  listActive,
  workbenchActive = false,
  showSwitch,
  onModeChange,
}) {
  const { t } = useTranslation();
  const debugViews = reactExports.useContext(DebugPanelWorkspaceViewsContext);
  const [workbenchOpened, setWorkbenchOpened] =
    reactExports.useState(workbenchActive);
  reactExports.useEffect(() => {
    if (workbenchActive) setWorkbenchOpened(true);
  }, [workbenchActive]);
  const canvasHidden = listActive || workbenchActive;
  const [showListSwitch] = reactExports.useState(canUseDebugTooling);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
    "data-workspace-canvas-surface": "base",
    className:
      "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background",
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceDebugViews, {
        enabled: showSwitch,
        listActive,
        workbenchActive,
        onModeChange,
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
        className: "flex-1 flex flex-col min-w-0 min-h-0",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
          className: "relative flex min-h-0 min-w-0 flex-1",
          "data-workspace-structure-surface": true,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
              className: `absolute inset-0 flex min-h-0 min-w-0 ${
                canvasHidden ? "invisible pointer-events-none" : "visible"
              }`,
              "aria-hidden": canvasHidden,
              inert: canvasHidden,
              "data-slot": "workspace-retained-canvas",
              children,
            }),
            listActive &&
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className:
                  "absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-background p-5 pb-16",
                "data-action-ui-id": "workspace.structure-list",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WorkspaceStructureView,
                  { mode: "list" },
                ),
              }),
            workbenchOpened &&
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
                className: `absolute inset-0 bottom-16 flex min-h-0 min-w-0 flex-col ${
                  workbenchActive
                    ? "visible"
                    : "invisible pointer-events-none"
                }`,
                "aria-hidden": !workbenchActive,
                inert: !workbenchActive,
                "data-action-ui-id": "workspace.independent-workbench",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WorkspaceIndependentWorkbench,
                  { visible: workbenchActive && showSwitch },
                ),
              }),
            ((showSwitch && (showListSwitch || canvasHidden)) ||
              bottomActions) &&
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
                className:
                  "absolute bottom-3 left-3 z-20 flex items-center gap-2",
                children: [
                  showSwitch &&
                    showListSwitch &&
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", {
                      "aria-label": t("workspace.structure.views"),
                      className:
                        "flex gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm",
                      "data-action-ui-id": "workspace.structure-views",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button$3, {
                          variant: !canvasHidden ? "secondary" : "ghost",
                          size: "sm",
                          "aria-pressed": !canvasHidden,
                          "data-action-ui-id": "workspace.structure-canvas-tab",
                          onClick: () => onModeChange("canvas"),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, {
                              "aria-hidden": true,
                              strokeWidth: 1.5,
                            }),
                            t("workspace.browser.canvas"),
                          ],
                        }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button$3, {
                          variant: listActive ? "secondary" : "ghost",
                          size: "sm",
                          "aria-pressed": listActive,
                          "data-action-ui-id": "workspace.structure-list-tab",
                          onClick: () => onModeChange("list"),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(List, {
                              "aria-hidden": true,
                              strokeWidth: 1.5,
                            }),
                            t("workspace.structure.list"),
                          ],
                        }),
                      ],
                    }),
                  showSwitch &&
                    !showListSwitch &&
                    canvasHidden &&
                    !debugViews &&
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, {
                      variant: "outline",
                      size: "sm",
                      "data-action-ui-id": "workspace.structure-canvas-tab",
                      onClick: () => onModeChange("canvas"),
                      children: t("workspace.browser.canvas"),
                    }),
                  !workbenchActive && bottomActions,
                ],
              }),
          ],
        }),
      }),
    ],
  });
}
function WorkspaceTaskAcceptance({ isActive }) {
  return null;
}

export {
  useWorkspaceStructureSurface,
  WorkspaceStructureSurface,
  WorkspaceDebugViews,
  WorkspaceIndependentWorkbench,
  WorkspaceTaskAcceptance,
};
