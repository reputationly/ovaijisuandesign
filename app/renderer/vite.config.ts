import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// JSX 编译成 __jsx(type, props, ...children)，由 src/main.jsx 顶部的适配函数转发到界面自带的
// jsx / jsxs 运行时 —— 和原来的产物调的是同一个运行时，不另外引入一份 React。
export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
  esbuild: { jsx: "transform", jsxFactory: "__jsx", jsxFragment: "jsxRuntimeExports.Fragment" },
  build: {
    outDir: fileURLToPath(new URL("../desktop/out/recovered-ui", import.meta.url)),
    emptyOutDir: true,
    target: "esnext",
    minify: false,
    sourcemap: false,
    chunkSizeWarningLimit: 100000,
    assetsInlineLimit: 0,
  },
  worker: { format: "es" },
});
