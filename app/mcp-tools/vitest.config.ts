import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 这些用例会起一个假的 HTTP 网关、跑真实的 fetch —— Windows runner 上偶尔超过默认 5s
    // （CI 上见过 `code_project_open：inputs 是版本号字符串数组` 直接 5s 超时）。
    // 放宽超时 + 允许重试一次：真坏了第二次仍然失败。
    testTimeout: 20_000,
    hookTimeout: 30_000,
    retry: 1,
  },
});
