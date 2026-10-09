import { describe, expect, it } from "vitest";

import { createShutdown, SHUTDOWN_DEADLINE_MS } from "./shutdown.js";

/**
 * 只用 `createShutdown`，**不碰全局 process / console**：信号监听和日志都是
 * 进程级的全局状态，测试里改它们除了串到别的用例，也断言不了"收到信号后
 * 第几步做了什么"。这里靠注入的 `exit` / `log` / `logError` 把顺序记下来。
 *
 * 顺带一提：这个套件里的 e2e 本来就有偶发（同一批 `process.env.WORKSPACE_DIR` /
 * `HILO_DATA_DIR` 在多个文件里改来改去），不是这里引入的 —— 基线连跑 12 遍也会红 2 遍。
 */
function make(deps: { close?: () => Promise<void>; deadlineMs?: number; order?: string[] }) {
  const order = deps.order ?? [];
  const logs: string[] = [];
  const errors: string[] = [];
  const stop = createShutdown({
    app: { close: deps.close ?? (async () => {}) },
    server: { closeAllConnections: () => order.push("closeAllConnections") },
    exit: (code) => order.push(`exit:${code}`),
    deadlineMs: deps.deadlineMs ?? 50,
    log: (line) => logs.push(line),
    logError: (...args) => errors.push(args.map(String).join(" ")),
  });
  return { stop, order, logs, errors };
}

/** 收尾是 promise 链，不是同步完成。 */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("优雅关停", () => {
  it("先掐连接再 close：进行中的请求会把 close 吊住，掐了才走得掉", async () => {
    const order: string[] = [];
    let resolveClose: () => void = () => {};
    const closed = new Promise<void>((r) => (resolveClose = r));
    const { stop } = make({
      close: () => {
        order.push("close");
        return closed;
      },
      order,
    });

    stop("SIGTERM");
    await settle();
    // 顺序是这次改动的重点：反过来的话 close() 会等在飞的请求，拖到被 SIGKILL。
    expect(order).toEqual(["closeAllConnections", "close"]);

    resolveClose();
    await settle();
    expect(order).toEqual(["closeAllConnections", "close", "exit:0"]);
  });

  it("收尾干净时退出码 0，并留下一行可查的日志", async () => {
    const { stop, order, logs } = make({});
    stop("SIGTERM");
    await settle();
    expect(order).toEqual(["closeAllConnections", "exit:0"]);
    expect(logs.join(" ")).toContain("gateway 已关停（SIGTERM");
  });

  it("同一个信号来两次只收尾一次（连按 Ctrl-C 不该跑两遍）", async () => {
    let closes = 0;
    const { stop, order } = make({ close: async () => void closes++ });
    stop("SIGTERM");
    await settle();
    stop("SIGTERM");
    await settle();
    expect(closes).toBe(1);
    expect(order).toEqual(["closeAllConnections", "exit:0"]);
  });

  it("close 抛错时不装作成功：退出码 1，错误写进日志", async () => {
    const { stop, order, errors } = make({
      close: async () => {
        throw new Error("SQLite 关不掉");
      },
    });
    stop("SIGTERM");
    await settle();
    expect(order).toEqual(["closeAllConnections", "exit:1"]);
    expect(errors.join(" ")).toContain("gateway 关停失败");
    expect(errors.join(" ")).toContain("SQLite 关不掉");
  });

  it("close 一直不回来就按期限强制退出（非零码），不留到被 SIGKILL", async () => {
    const { stop, order, errors } = make({ close: () => new Promise<void>(() => {}), deadlineMs: 20 });
    stop("SIGTERM");
    await settle();
    await new Promise((r) => setTimeout(r, 60));
    expect(order).toEqual(["closeAllConnections", "exit:1"]);
    expect(errors.join(" ")).toContain("关停超时");
  });

  it("期限比桌面侧的宽限短（桌面是 SIGTERM → 5 秒 → SIGKILL）", () => {
    expect(SHUTDOWN_DEADLINE_MS).toBeLessThan(5000);
  });
});
