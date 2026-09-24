import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// 主进程和 preload 都是 ESM（package.json 的 "type": "module"），preload 产物是
// index.mjs；renderer 生产环境经 app:// 协议加载，开发时走 electron-vite 的 dev server。
export default defineConfig({
  main: {
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
