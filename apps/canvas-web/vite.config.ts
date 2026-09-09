import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// 只为读一个环境变量装 @types/node 不值当，就地声明用到的那一点。
declare const process: { env: Record<string, string | undefined> }

/**
 * 我们自己的 gateway（`cargo run -p gateway`）。
 *
 * **只连这一个。** 它已实现的路由自己处理，其余按配置里的 `upstream` 反代给
 * 官方 gateway —— 于是"替换到哪一步了"完全是后端的事，前端不需要知道，
 * 也不会在分流顺序上出错。
 */
const GATEWAY = process.env.OVGW_URL ?? "http://127.0.0.1:8100"

// 走代理而不是直连：`/files/` 上的图片、`/ws` 的握手各有各的跨域细节，
// 代理掉之后前端只认识同源地址，少一整类只在浏览器里才复现的问题。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    proxy: {
      "/api": { target: GATEWAY, changeOrigin: true },
      "/files": { target: GATEWAY, changeOrigin: true },
      // `/ws` 也归我们了 —— gateway 自己实现了事件推送。之前它只能直连
      // 官方，因为 reqwest 的反代转不了 WebSocket 的 Upgrade 握手。
      "/ws": { target: GATEWAY, ws: true },
    },
  },
})
