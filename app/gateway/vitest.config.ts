import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Nest 靠 emitDecoratorMetadata 做依赖注入。vitest 默认用 esbuild 转译，
// esbuild 不产出装饰器元数据 —— 注入会拿到 undefined 而不是报错。所以换 SWC。
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["src/**/*.test.ts"],
    // 这些 e2e 共享进程级环境（WORKSPACE_DIR 等），并行跑不同文件会互相改环境，
    // 造成「单独跑过、全量偶发失败」。串行文件是这里唯一可靠的方式。
    fileParallelism: false,
    setupFiles: ["./src/test-setup.ts"],
    // **超时放宽**：这些用例会起真 gateway、建 sqlite、跑 ffmpeg，默认 5s 在机器有别的
    // 重活（比如同时开着桌面端在渲染视频）时会随机超时，表现成 `socket hang up` /
    // `Cannot read properties of undefined`。放宽到 20s 只影响失败判定，不影响正常耗时。
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // 这些 e2e 会真的起 ffmpeg、sharp、sqlite、HTTP 服务；机器上有别的重活时
    // 偶发失败（每次失败的用例都不一样）。允许重试一次：真坏了第二次仍然失败，
    // 只是把「重活造成的抖动」和「真的回归」区分开。
    retry: 1,
  },
});
