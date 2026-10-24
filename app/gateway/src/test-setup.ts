import { afterAll, beforeAll } from "vitest";

/**
 * 这些 e2e 直接改 process.env（WORKSPACE_DIR / HILO_GATEWAY_ROLE / GATEWAY_NONCE …）。
 *
 * vitest 在同一个 worker 里连续跑多个文件时，env 是进程级的 —— 一个文件漏删，
 * 后面的文件就会拿到别人的工作区或角色，表现为「单独跑过、全量随机失败」。
 * 每个文件开始时快照、结束时恢复，把污染挡在文件边界内。
 */
let saved: NodeJS.ProcessEnv;

beforeAll(() => {
  saved = { ...process.env };
});

afterAll(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in saved)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
