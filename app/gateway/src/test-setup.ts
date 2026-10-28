import { afterAll, beforeAll } from "vitest";

/**
 * 这些 e2e 直接改 process.env（WORKSPACE_DIR / HILO_GATEWAY_ROLE / GATEWAY_NONCE …）。
 *
 * vitest 在同一个 worker 里连续跑多个文件时，env 是进程级的 —— 一个文件漏删，
 * 后面的文件就会拿到别人的工作区或角色，表现为「单独跑过、全量随机失败」。
 * 每个文件开始时快照、结束时恢复，把污染挡在文件边界内。
 */
let saved: NodeJS.ProcessEnv;

/**
 * 决定「起哪个 gateway / 注册哪些模块」的几个变量，**每个文件开头强制清干净**。
 *
 * 只在 afterAll 恢复是不够的：文件里如果抛了未捕获异常、或 worker 被信号打断，
 * afterAll 就不会跑，下一个文件会拿着别人的 `HILO_GATEWAY_ROLE=workspace` 起 app
 * —— 模块集不一样，表现成某个路由突然 404（真机上就见过
 * `/api/media/heic-preview` 随机变 404，且每次失败的用例都不一样）。
 */
const RESET_ON_FILE_START = [
  "HILO_GATEWAY_ROLE",
  "WORKSPACE_DIR",
  "OV_CONFIG_PATH",
  "HILO_DATA_DIR",
  "HILO_PROJECT_ARCHITECTURE",
  "HILO_OPENCODE_DB",
  "GATEWAY_NONCE",
  // 工作区身份：带上它们时网关会要求每个请求带 `x-hilo-workspace*`，
  // 忘了带就是 401/428 —— 症状是「期望 404/200，实际 401」，每次失败的用例都不同。
  "HILO_WORKSPACE_CLAIM",
  "HILO_WORKSPACE_INSTANCE_ID",
  "HILO_WORKSPACE_GENERATION",
];

beforeAll(() => {
  saved = { ...process.env };
  for (const key of RESET_ON_FILE_START) delete process.env[key];
});

afterAll(async () => {
  // 全局 fetch（undici）与 node 全局 agent 都会 keep-alive 复用连接；
  // 上一个文件关掉 server 后，下一个文件可能复用到死连接 —— 表现成
  // `socket hang up` / `Parse Error: Expected HTTP/`。
  try {
    const { destroyGlobalAgent } = await import("./testing/destroy-agent.js");
    await destroyGlobalAgent();
  } catch {
    // 没有这个模块也不该让清理失败
  }
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
