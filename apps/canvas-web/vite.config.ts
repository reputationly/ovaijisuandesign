import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// 只为读一个环境变量装 @types/node 不值当，就地声明用到的那一点。
declare const process: { env: Record<string, string | undefined> }

/** 官方 gateway，独立跑。见 scripts/standalone-gateway.sh。 */
const OFFICIAL = process.env.GATEWAY_URL ?? "http://127.0.0.1:8099"

/** 我们自己的 gateway（`cargo run -p gateway`）。 */
const OURS = process.env.OVGW_URL ?? "http://127.0.0.1:8100"

// 全部走代理而不是直连：gateway 的 CORS 虽然放行 loopback，但 `/files/` 上的
// 图片、`/ws` 的握手各有各的跨域细节，代理掉之后前端只认识同源地址，
// 少一整类只在浏览器里才复现的问题。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    // 按前缀分流。**顺序有意义** —— Vite 按声明顺序匹配，`/api/generate`
    // 必须排在 `/api` 前面，否则生成请求会被打到官方那边（而它也有同名路由，
    // 于是会"成功"地花掉官方额度，不报错）。
    proxy: {
      "/api/generate": { target: OURS, changeOrigin: true },
      "/api": { target: OFFICIAL, changeOrigin: true },
      "/files": { target: OFFICIAL, changeOrigin: true },
      "/ws": { target: OFFICIAL, ws: true },
    },
  },
})
