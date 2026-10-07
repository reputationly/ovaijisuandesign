import { configDefaults, defineConfig } from "vitest/config";

/**
 * 排除构建产物目录。
 *
 * **不加这个，`stage-desktop-resources.mjs` 跑过之后 vitest 会去跑 staging 副本里的测试。**
 * staging 用 `pnpm deploy` 把 mcp-tools 整棵树（含 `src/` 和它的测试）搬进了
 * `build-resources/`，而 desktop 之前**没有 vitest 配置**，用的是 vitest 默认的
 * 全量 glob —— 于是那几百个「另一个副本里的测试」被一起收集，本地直接报一堆 FAIL，
 * 看起来像新栈坏了。
 *
 * `configDefaults.exclude` 必须在前面带上，否则会把 vitest 默认排除的
 * node_modules / .git 等重新包含进来。
 *
 * 为什么 CI 没炸：`package` job 的顺序是 build → 自检 → stage → 出包 → 核对，
 * stage 之后不再跑 vitest；`node` job 根本不 stage。所以只有「先本地 stage 再本地
 * 跑测试」这个顺序会撞上 —— 而那恰好是开发的常规动作。
 */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "build-resources/**", "dist-electron/**", "out/**"],
  },
});