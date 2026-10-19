/**
 * 画布区域的**架构路由**。
 *
 * 一个工作区可能是两种架构之一（由 `useWorkspaceProjectArchitecture` 判定）：
 * `legacy` 用老的画布，`resource_v3` 用 v3 工作台。两种画布都按需加载 ——
 * 它们各自很大，而绝大多数会话只会用到其中一种。
 *
 * 三种状态各有归宿：还在判定中显示加载态、判定失败交给错误边界、判定完成再选画布。
 */
import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { CanvasLoadingState } from "./canvas-loading-state.jsx";
import { NativeWorkbenchHost, useWorkbenchIdentity, usesWorkspaceResourceView } from "./native-workbench-host.jsx";
import { useWorkspaceProjectArchitecture } from "./use-workspace-project-architecture.jsx";

const LegacyCanvasArea = reactExports.lazy(
  () => import("../canvas/canvas-area.jsx").then((module) => ({ default: module.CanvasArea })),
);

function WorkspaceV3Workbench(props) {
  const { t } = useTranslation();
  const identityScope = useWorkbenchIdentity(props.workspaceId);
  const resourcesOpen = usesWorkspaceResourceView(props.workspaceId);
  const visible = props.isActive !== false && props.isPresented !== false;
  // 按产物补齐三处结构：
  //   1. 资源视图外面那层 `data-action-ui-id="v3-resource-view"` 容器；
  //   2. 身份还没就绪时的 `projectV3.accountPending` 占位；
  //   3. 资源视图**关闭**时应渲染 v3 画布（`CanvasAreaV3`）——
  //      那个 2.2MB 的 chunk 还没还原，见 docs 里的 v3 画布工作项。
  return jsxRuntimeExports.jsx("div", {
    className: "flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background",
    "data-v3-workbench": "true",
    children: resourcesOpen
      ? jsxRuntimeExports.jsx("div", {
          className: "min-h-0 flex-1",
          "data-action-ui-id": "v3-resource-view",
          children: identityScope
            ? NativeWorkbenchHost({ initialRoute: "/assets", identityScope, visible })
            : jsxRuntimeExports.jsx("p", {
                role: "status",
                className: "p-4 text-sm text-muted-foreground",
                children: t("projectV3.accountPending"),
              }),
        })
      : jsxRuntimeExports.jsx(CanvasLoadingState, { label: t("common.loading") }),
  });
}

function WorkspaceCanvasArea(props) {
  const architecture = useWorkspaceProjectArchitecture();
  const { t: t2 } = useTranslation();
  if (architecture.isPending) return /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasLoadingState, { label: t2("common.loading") });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateBoundary,
    {
      error: architecture.isError,
      errorOptions: { title: t2("canvasV3.projectLoadFailed"), retry: architecture.refetch },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasLoadingState, { label: t2("common.loading") }), children: architecture.data === "legacy" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LegacyCanvasArea, { ...props }) : architecture.data === "resource_v3" ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceV3Workbench, { ...props }) : null })
    }
  );
}

export { WorkspaceCanvasArea, WorkspaceV3Workbench, LegacyCanvasArea };
