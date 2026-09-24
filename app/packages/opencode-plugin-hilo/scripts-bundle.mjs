// 打成单文件：opencode 按 file:// 路径直接加载它，发布包里没有 node_modules 可以解析依赖。
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  outfile: "dist/index.js",
  // 插件 API 只用了类型，运行时不需要它。
  external: ["@opencode-ai/plugin"],
  logLevel: "warning",
});
