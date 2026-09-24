import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Nest 靠 emitDecoratorMetadata 做依赖注入。vitest 默认用 esbuild 转译，
// esbuild 不产出装饰器元数据 —— 注入会拿到 undefined 而不是报错。所以换 SWC。
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: { include: ["src/**/*.test.ts"] },
});
