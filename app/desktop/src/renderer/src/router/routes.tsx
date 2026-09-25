import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router"

import { AssetCenterPage, ChangelogPage, CreationsPage, HomePage, ProjectDetailPage, SkillsPage, WorkflowsPage, WorkspacePage } from "../pages/pages"
import { ProjectsPage } from "../pages/ProjectsPage"
import { WorkbenchShell } from "../shell/WorkbenchShell"
import { parseWorkspaceSearch, pickSkillsSearch } from "./search"

/**
 * 路由表。两组无路径布局：
 * - `_home`：目录型页面（首页、项目库、全部创作……）
 * - `_app`：功能页（工作区、技能）
 * 用浏览器 history：app:// 协议下找不到的路径会回落到 index.html，刷新不丢页面。
 */
const rootRoute = createRootRoute({
  component: () => (
    <WorkbenchShell>
      <Outlet />
    </WorkbenchShell>
  ),
})

const homeLayout = createRoute({ getParentRoute: () => rootRoute, id: "_home", component: Outlet })
const appLayout = createRoute({ getParentRoute: () => rootRoute, id: "_app", component: Outlet })

const homeIndex = createRoute({ getParentRoute: () => homeLayout, path: "/", component: HomePage })

const projectsRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "projects/",
  validateSearch: (s: Record<string, unknown>): { kind?: "local" | "team" } => ({ kind: s.kind === "team" ? "team" : undefined }),
  component: ProjectsPage,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "projects/$projectId",
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({ tab: typeof s.tab === "string" ? s.tab : undefined }),
  component: ProjectDetailPage,
})

const creationsRoute = createRoute({ getParentRoute: () => homeLayout, path: "creations/", component: CreationsPage })

const assetCenterRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "asset-center/",
  validateSearch: (s: Record<string, unknown>): { action?: "create"; returnWorkspaceId?: string } => ({
    action: s.action === "create" ? "create" : undefined,
    returnWorkspaceId: typeof s.returnWorkspaceId === "string" && s.returnWorkspaceId ? s.returnWorkspaceId : undefined,
  }),
  component: AssetCenterPage,
})

const workflowsRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "workflows/",
  validateSearch: (s: Record<string, unknown>): { tab?: "official" | "mine" } => ({
    tab: s.tab === "mine" ? "mine" : s.tab === "official" ? "official" : undefined,
  }),
  component: WorkflowsPage,
})

const changelogRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "changelog/",
  validateSearch: (s: Record<string, unknown>): { targetId?: string; source?: "home_top_whats_new" } => ({
    targetId: typeof s.targetId === "string" ? s.targetId : undefined,
    source: s.source === "home_top_whats_new" ? "home_top_whats_new" : undefined,
  }),
  component: ChangelogPage,
})

// 旧入口：带着查询参数转到 /skills
const skillCommunityRoute = createRoute({
  getParentRoute: () => homeLayout,
  path: "skill-community/",
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/skills", search: pickSkillsSearch(location.search as Record<string, unknown>) })
  },
})

const skillsRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "skills/",
  validateSearch: pickSkillsSearch,
  component: SkillsPage,
})

const workspaceRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "workspace/",
  validateSearch: parseWorkspaceSearch,
  // 没有 workspaceId 的工作区页没有意义，回首页
  beforeLoad: ({ search }) => {
    if (!search.workspaceId) throw redirect({ to: "/" })
  },
  component: WorkspacePage,
})

export const routeTree = rootRoute.addChildren([
  homeLayout.addChildren([
    homeIndex,
    projectsRoute,
    projectDetailRoute,
    creationsRoute,
    assetCenterRoute,
    workflowsRoute,
    changelogRoute,
    skillCommunityRoute,
  ]),
  appLayout.addChildren([skillsRoute, workspaceRoute]),
])

export function createAppRouter() {
  return createRouter({ routeTree })
}

export const router = createAppRouter()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
