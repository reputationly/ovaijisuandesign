import { useRouterState } from "@tanstack/react-router"
import { useEffect, useState, type ReactNode } from "react"

import { isMac } from "../api/runtime"
import { cn } from "../lib"
import { SettingsDialog } from "../settings/SettingsDialog"
import { AppEvents } from "./AppEvents"
import { GlobalSidebar } from "./GlobalSidebar"
import { NewWorkspaceDialogProvider } from "./new-workspace-dialog"
import { TopbarProvider } from "./topbar"

/**
 * 应用外框：顶部窗口栏覆盖层 + [全局侧栏 | 主内容卡片]。
 *
 * macOS 用集成标题栏：没有独立的标题栏行，红绿灯压在侧栏左上角，
 * 侧栏顶部两行和主区四边各留一条细的拖拽热区用来拖窗口。
 */
export function WorkbenchShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inWorkspace = pathname.startsWith("/workspace")
  const fullscreen = useFullscreen()
  const mac = isMac()

  return (
    <TopbarProvider>
      <NewWorkspaceDialogProvider>
        <div
          className="transparent-window-root transparent-window-shell-material relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--window-shell-fallback-bg)]"
          data-action-ui-id="workbench-shell"
          data-window-chrome-mode={mac ? "mac-integrated" : "custom"}
          data-window-fullscreen={String(fullscreen)}
          style={{
            ["--window-titlebar-height" as string]: "0px",
            ["--window-traffic-light-inset" as string]: "0px",
            ["--window-app-controls-inset" as string]: "0px",
          }}
        >
          <header className="pointer-events-none fixed inset-x-0 top-0 z-40 h-10 select-none" data-layout-slot="window-chrome-overlay" data-titlebar-reserved="false" />
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <GlobalSidebar />
            <div className="transparent-window-surface-gap transparent-window-workbench-inset relative flex min-w-0 flex-1 flex-col overflow-hidden py-1 pr-1 pl-2">
              <DragZones thick={inWorkspace} />
              <section
                className={cn(
                  "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl",
                  !inWorkspace && "elevated-surface-border bg-[var(--home-content-surface)]",
                )}
                data-action-ui-id="workbench-sheet"
                data-surface={inWorkspace ? "workspace" : "global"}
              >
                <div className="relative flex min-h-0 flex-1 overflow-hidden">
                  <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
                </div>
              </section>
            </div>
          </div>
          <SettingsDialog />
          <AppEvents />
        </div>
      </NewWorkspaceDialogProvider>
    </TopbarProvider>
  )
}

/** 主区四周的拖窗热区；工作区里内容贴边更多，上下留宽一点 */
function DragZones({ thick }: { thick: boolean }) {
  const v = thick ? "h-3" : "h-1"
  const inset = thick ? "inset-y-3" : "inset-y-1"
  return (
    <>
      <div className={cn("drag-region absolute inset-x-2 top-0 z-20", v)} data-action-ui-id="workbench.window-drag-fallback-top" />
      <div className={cn("drag-region absolute inset-x-2 bottom-0 z-20", v)} data-action-ui-id="workbench.window-drag-fallback-bottom" />
      <div className={cn("drag-region absolute left-0 z-20 w-2", inset)} data-action-ui-id="workbench.window-drag-hot-zone-left" />
      <div className={cn("drag-region absolute right-0 z-20 w-2", inset)} data-action-ui-id="workbench.window-drag-hot-zone-right" />
    </>
  )
}

/** 全屏时红绿灯消失，拖拽区也随之失效；用视口与屏幕尺寸近似判断 */
function useFullscreen() {
  const check = () => typeof window !== "undefined" && window.innerHeight === window.screen.height && window.innerWidth === window.screen.width
  const [fs, setFs] = useState(check)
  useEffect(() => {
    const on = () => setFs(check())
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  return fs
}
