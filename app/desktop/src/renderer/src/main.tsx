import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./i18n"
import { queryClient } from "./api/query-client"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { router } from "./router/routes"
import { applyInitialTheme, ThemeProvider } from "./theme/ThemeProvider"
import "./styles.css"

// React 渲染前先挂主题 class：深色用户启动时不闪白
applyInitialTheme()
// 滚动条只在滚动时出现（配合 base.css 里的 data-auto-hide-scrollbars 规则）
document.documentElement.setAttribute("data-auto-hide-scrollbars", "")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delay={150}>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
