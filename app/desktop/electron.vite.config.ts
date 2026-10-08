import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

/**
 * 把更新源在**构建期**固化进主进程。
 *
 * ## 为什么不能只读 `process.env`
 *
 * `index.ts` 里读的是 `process.env.OV_UPDATE_FEED_BASE`，而那个变量是
 * **出包时**通过环境变量传给 `electron-builder` 的 —— 那是**构建进程**的环境，
 * 不是运行应用的环境。产物里既没有那个变量、也没有它的值：
 *
 *     $ strings app.asar | grep aijisuan
 *     https://maas.ovaijisuan.com/v1        ← 只有 API 域名，没有 CDN
 *     $ strings app.asar | grep OV_UPDATE_FEED_BASE
 *     const feed = process.env.OV_UPDATE_FEED_BASE?.trim();   ← 原样留着
 *
 * 于是装好的应用点「检查更新」会走到「未配置 OV_UPDATE_FEED_BASE，无法检查更新」
 * 然后放弃 —— **一个能装、能跑、就是永远收不到更新的包**。
 *
 * 钉住它的检查在 `scripts/verify-desktop-package.mjs`：它断言编进去的产物里
 * **含有那个 URL，且不再有 `process.env.OV_UPDATE_FEED_BASE` 这个字面量**
 * （后者才真的说明 define 生效了）。
 *
 * 没设这个环境变量时不报错、固化成空串 —— 本地 `pnpm dev` 和 CI 的出包验证
 * 都没有它，那种情况下更新器如实说「没配」是对的。
 */
const UPDATE_FEED_BASE = process.env.OV_UPDATE_FEED_BASE ?? "";

// 主进程和 preload 都是 ESM（package.json 的 "type": "module"），preload 产物是
// index.mjs；renderer 生产环境经 app:// 协议加载，开发时走 electron-vite 的 dev server。
export default defineConfig({
  main: {
    define: {
      "process.env.OV_UPDATE_FEED_BASE": JSON.stringify(UPDATE_FEED_BASE),
    },
    build: { outDir: "out/main", rollupOptions: { input: resolve(__dirname, "src/main/index.ts") } },
  },
  preload: {
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts"),
        output: { format: "es", entryFileNames: "[name].mjs" },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react(), tailwindcss()],
    build: { outDir: resolve(__dirname, "out/renderer"), rollupOptions: { input: resolve(__dirname, "src/renderer/index.html") } },
  },
});
