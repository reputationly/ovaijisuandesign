import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// 只为读一个环境变量装 @types/node 不值当，就地声明用到的那一点。
declare const process: { env: Record<string, string | undefined> }

/** 独立跑的 gateway。见 scripts/standalone-gateway.sh。 */
const GATEWAY = process.env.GATEWAY_URL ?? "http://127.0.0.1:8099"

// 全部走代理而不是直连：gateway 的 CORS 虽然放行 loopback，但 `/files/` 上的
// 图片、`/ws` 的握手各有各的跨域细节，代理掉之后前端只认识同源地址，
// 少一整类只在浏览器里才复现的问题。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    proxy: {
      "/api": { target: GATEWAY, changeOrigin: true },
      "/files": { target: GATEWAY, changeOrigin: true },
      "/ws": { target: GATEWAY, ws: true },
    },
  },
})
