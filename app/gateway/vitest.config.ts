import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Nest 靠 emitDecoratorMetadata 做依赖注入。vitest 默认用 esbuild 转译，
// esbuild 不产出装饰器元数据 —— 注入会拿到 undefined 而不是报错。所以换 SWC。
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  // 这些 e2e 共享进程级环境（WORKSPACE_DIR 等），并行跑不同文件会互相改环境，
  // 造成「单独跑过、全量偶发失败」。串行文件是这里唯一可靠的方式。
  test: { include: ["src/**/*.test.ts"], fileParallelism: false, setupFiles: ["./src/test-setup.ts"] },
});
